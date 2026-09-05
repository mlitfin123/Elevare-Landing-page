import { NextResponse } from "next/server";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { separateQuickAnalysisAttribution } from "@/lib/quick-analysis-attribution";
import { parseQuickAnalysisContext } from "@/lib/quick-analysis-schema";
import {
  getStripeCheckoutLocale,
  parseQuickAnalysisLocale,
  resolveQuickAnalysisGenerationLocale,
} from "@/lib/quick-analysis-locale";
import {
  attachCheckoutSession,
  createQuickAnalysisCheckoutRecord,
  removeUnusedCheckoutRecord,
} from "@/lib/quick-analysis-repository";
import {
  QuickAnalysisServerError,
  assertQuickAnalysisSameOrigin,
  enforceQuickAnalysisRateLimit,
  generateQuickAnalysisToken,
  getQuickAnalysisReturnOrigin,
  getQuickAnalysisSupabase,
  hashQuickAnalysisToken,
  QUICK_ANALYSIS_CHECKOUT_COOKIE,
  quickAnalysisErrorResponse,
} from "@/lib/quick-analysis-server";
import {
  getQuickAnalysisStripe,
  verifyConfiguredQuickAnalysisPrice,
} from "@/lib/quick-analysis-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHECKOUT_SESSION_TTL_MS = 35 * 60 * 1_000;

const STRIPE_SUBMIT_MESSAGES = {
  en: "One-time StageLab Quick Analysis. No subscription or automatic renewal.",
  "es-419": "StageLab Quick Analysis de pago único. Sin suscripción ni renovación automática.",
  "pt-BR": "StageLab Quick Analysis com pagamento único. Sem assinatura ou renovação automática.",
} as const;

function logCheckoutFailure(error: unknown) {
  const stripeError = error as {
    code?: unknown;
    param?: unknown;
    requestId?: unknown;
    statusCode?: unknown;
    type?: unknown;
  };
  console.error("Quick Analysis checkout failed.", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown checkout error",
    type: typeof stripeError.type === "string" ? stripeError.type : undefined,
    code: typeof stripeError.code === "string" ? stripeError.code : undefined,
    param: typeof stripeError.param === "string" ? stripeError.param : undefined,
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
    const requestedLocale = parseQuickAnalysisLocale(payload.locale);
    if (!requestedLocale) {
      throw new QuickAnalysisServerError("INVALID_LOCALE", "The selected language is not supported.");
    }
    const payloadWithoutLocale = { ...payload };
    delete payloadWithoutLocale.locale;
    const { contextPayload, source } = separateQuickAnalysisAttribution(payloadWithoutLocale);
    const context = parseQuickAnalysisContext(contextPayload);
    const generationLocale = resolveQuickAnalysisGenerationLocale(requestedLocale);
    const stripe = getQuickAnalysisStripe();
    const priceId = await verifyConfiguredQuickAnalysisPrice(stripe);
    const checkoutNonce = generateQuickAnalysisToken();
    const checkoutNonceExpiresAt = new Date(Date.now() + CHECKOUT_SESSION_TTL_MS);
    analysisId = await createQuickAnalysisCheckoutRecord(supabase, context, {
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    }, {
      hash: hashQuickAnalysisToken(checkoutNonce),
      expiresAt: checkoutNonceExpiresAt.toISOString(),
    }, generationLocale);

    const origin = getQuickAnalysisReturnOrigin(request);
    const sourceSuffix = source ? `&source=${encodeURIComponent(source)}` : "";
    const localeSuffix = `&locale=${encodeURIComponent(requestedLocale)}`;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded_page",
        locale: getStripeCheckoutLocale(requestedLocale),
        redirect_on_completion: "if_required",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        return_url: `${origin}/stagelab/quick-analysis/return/?session_id={CHECKOUT_SESSION_ID}${sourceSuffix}${localeSuffix}`,
        metadata: {
          product: "stagelab_quick_analysis",
          quick_analysis_id: analysisId,
          analysis_mode: context.analysisMode,
          generation_locale: generationLocale,
        },
        payment_intent_data: {
          metadata: {
            product: "stagelab_quick_analysis",
            quick_analysis_id: analysisId,
            analysis_mode: context.analysisMode,
            generation_locale: generationLocale,
          },
        },
        expires_at: Math.floor(checkoutNonceExpiresAt.getTime() / 1_000),
        submit_type: "pay",
        custom_text: {
          submit: { message: STRIPE_SUBMIT_MESSAGES[requestedLocale] },
        },
      },
      { idempotencyKey: `quick-analysis-checkout-${analysisId}` },
    );

    if (!session.client_secret) throw new Error("Stripe Embedded Checkout did not return a client secret.");
    await attachCheckoutSession(supabase, analysisId, session.id);
    const response = NextResponse.json(
      { clientSecret: session.client_secret, checkoutSessionId: session.id, generationLocale },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set({
      name: QUICK_ANALYSIS_CHECKOUT_COOKIE,
      value: checkoutNonce,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/stagelab/quick-analysis/",
      expires: checkoutNonceExpiresAt,
    });
    return response;
  } catch (error) {
    logCheckoutFailure(error);
    if (analysisId) {
      try {
        await removeUnusedCheckoutRecord(getQuickAnalysisSupabase(), analysisId);
      } catch {
        // The incomplete record contains no photos and can expire operationally.
      }
    }
    return quickAnalysisErrorResponse(error);
  }
}
