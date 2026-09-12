import { resolvePosingGenerationLocale } from "@/lib/posing-locale";
import { posingErrorResponse } from "@/lib/posing-server-errors";
import { NextResponse } from "next/server";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { parseQuickAnalysisLocale, resolveQuickAnalysisGenerationLocale, getStripeCheckoutLocale } from "@/lib/quick-analysis-locale";
import { normalizeQuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import {
  attachCheckoutSession,
  createQuickAnalysisCheckoutRecord,
  removeUnusedCheckoutRecord,
} from "@/lib/quick-analysis-repository";
import {
  QUICK_ANALYSIS_CHECKOUT_COOKIE,
  QuickAnalysisServerError,
  assertQuickAnalysisSameOrigin,
  enforceQuickAnalysisRateLimit,
  generateQuickAnalysisToken,
  getQuickAnalysisReturnOrigin,
  getQuickAnalysisSupabase,
  hashQuickAnalysisToken,
} from "@/lib/quick-analysis-server";
import { stageAnalysisCheckoutSchema } from "@/lib/stage-analysis-schema";
import { STAGE_ANALYSIS_PRODUCT_CONFIG } from "@/lib/stage-analysis";
import { getQuickAnalysisStripe } from "@/lib/quick-analysis-stripe";
import { verifyConfiguredStageAnalysisPrice } from "@/lib/stage-analysis-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHECKOUT_SESSION_TTL_MS = 35 * 60 * 1_000;

const SUBMIT_MESSAGES = {
  en: "One-time StageLab analysis. No subscription or automatic renewal.",
  "es-419": "Análisis único de StageLab. Sin suscripción ni renovación automática.",
  "pt-BR": "Análise única do StageLab. Sem assinatura ou renovação automática.",
} as const;

function logCheckoutFailure(error: unknown) {
  const stripeError = error as { code?: unknown; requestId?: unknown; statusCode?: unknown; type?: unknown };
  console.error("StageLab analysis checkout failed.", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown checkout error",
    type: typeof stripeError.type === "string" ? stripeError.type : undefined,
    code: typeof stripeError.code === "string" ? stripeError.code : undefined,
    requestId: typeof stripeError.requestId === "string" ? stripeError.requestId : undefined,
    statusCode: typeof stripeError.statusCode === "number" ? stripeError.statusCode : undefined,
  });
}

export async function POST(request: Request) {
  let analysisId: string | null = null;
  try {
    assertQuickAnalysisSameOrigin(request);
    const supabase = getQuickAnalysisSupabase();
    await enforceQuickAnalysisRateLimit(request, "checkout", supabase);
    const payload = await request.json() as Record<string, unknown>;
    const requestedLocale = parseQuickAnalysisLocale(payload.locale) ?? "en";
    const source = normalizeQuickAnalysisSource(typeof payload.source === "string" ? payload.source : null);
    const parsed = stageAnalysisCheckoutSchema.parse({
      product: payload.product,
      division: payload.division,
      competitionStatus: payload.competitionStatus,
      weeksOut: payload.weeksOut,
      optionalContext: payload.optionalContext,
      ageConfirmed: payload.ageConfirmed,
      aiConsentConfirmed: payload.aiConsentConfirmed,
    });
    let posingGenerationLocale;
    try { posingGenerationLocale = resolvePosingGenerationLocale(requestedLocale); }
    catch { throw new QuickAnalysisServerError("POSING_LOCALE_UNAVAILABLE", "Posing generation is unavailable for this locale.", 503); }
    const generationLocale = parsed.product === "posing_analysis" ? posingGenerationLocale : resolveQuickAnalysisGenerationLocale(requestedLocale);
    const stripe = getQuickAnalysisStripe();
    const priceId = await verifyConfiguredStageAnalysisPrice(parsed.product, stripe);
    const checkoutNonce = generateQuickAnalysisToken();
    const checkoutNonceExpiresAt = new Date(Date.now() + CHECKOUT_SESSION_TTL_MS);
    analysisId = await createQuickAnalysisCheckoutRecord(
      supabase,
      {
        analysisMode: "competition_prep",
        division: parsed.division,
        competitionStatus: parsed.competitionStatus,
        weeksOut: parsed.weeksOut,
        optionalContext: parsed.optionalContext,
        ageConfirmed: true,
        aiConsentConfirmed: true,
      },
      { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION },
      { hash: hashQuickAnalysisToken(checkoutNonce), expiresAt: checkoutNonceExpiresAt.toISOString() },
      generationLocale,
      parsed.product,
      posingGenerationLocale,
    );

    const origin = getQuickAnalysisReturnOrigin(request);
    const route = parsed.product === "posing_analysis" ? "posing-analysis" : "complete-stage-analysis";
    const sourceSuffix = source ? `&source=${encodeURIComponent(source)}` : "";
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded_page",
        locale: getStripeCheckoutLocale(requestedLocale),
        redirect_on_completion: "if_required",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        return_url: `${origin}/stagelab/${route}/return/?session_id={CHECKOUT_SESSION_ID}${sourceSuffix}&locale=${encodeURIComponent(requestedLocale)}`,
        metadata: {
          product: "stagelab_stage_analysis",
          analysis_product: parsed.product,
          quick_analysis_id: analysisId,
          generation_locale: generationLocale,
          posing_generation_locale: posingGenerationLocale,
        },
        payment_intent_data: {
          metadata: {
            product: "stagelab_stage_analysis",
            analysis_product: parsed.product,
            quick_analysis_id: analysisId,
          },
        },
        expires_at: Math.floor(checkoutNonceExpiresAt.getTime() / 1_000),
        submit_type: "pay",
        custom_text: { submit: { message: SUBMIT_MESSAGES[requestedLocale] } },
      },
      { idempotencyKey: `stage-analysis-checkout-${analysisId}` },
    );

    if (!session.client_secret) throw new Error("Stripe Embedded Checkout did not return a client secret.");
    await attachCheckoutSession(supabase, analysisId, session.id);
    const response = NextResponse.json({
      clientSecret: session.client_secret,
      checkoutSessionId: session.id,
      generationLocale,
      priceCents: STAGE_ANALYSIS_PRODUCT_CONFIG[parsed.product].priceCents,
    }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set({
      name: QUICK_ANALYSIS_CHECKOUT_COOKIE,
      value: checkoutNonce,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/stagelab/",
      expires: checkoutNonceExpiresAt,
    });
    return response;
  } catch (error) {
    logCheckoutFailure(error);
    if (analysisId) {
      try {
        await removeUnusedCheckoutRecord(getQuickAnalysisSupabase(), analysisId);
      } catch {
        // The unpaid record contains no media and can expire operationally.
      }
    }
    return posingErrorResponse(error, request);
  }
}
