import { NextResponse } from "next/server";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { normalizeQuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import { parseQuickAnalysisContext } from "@/lib/quick-analysis-schema";
import {
  attachCheckoutSession,
  createQuickAnalysisCheckoutRecord,
  removeUnusedCheckoutRecord,
} from "@/lib/quick-analysis-repository";
import {
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

export async function POST(request: Request) {
  let analysisId: string | null = null;
  try {
    assertQuickAnalysisSameOrigin(request);
    const supabase = getQuickAnalysisSupabase();
    await enforceQuickAnalysisRateLimit(request, "checkout", supabase);
    const payload = await request.json();
    const context = parseQuickAnalysisContext(payload);
    const source = normalizeQuickAnalysisSource(
      typeof payload === "object" && payload !== null && "source" in payload
        ? payload.source
        : undefined,
    );
    const stripe = getQuickAnalysisStripe();
    const priceId = await verifyConfiguredQuickAnalysisPrice(stripe);
    const checkoutNonce = generateQuickAnalysisToken();
    const checkoutNonceExpiresAt = new Date(Date.now() + 30 * 60 * 1_000);
    analysisId = await createQuickAnalysisCheckoutRecord(supabase, context, {
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    }, {
      hash: hashQuickAnalysisToken(checkoutNonce),
      expiresAt: checkoutNonceExpiresAt.toISOString(),
    });

    const origin = getQuickAnalysisReturnOrigin(request);
    const sourceSuffix = source ? `&source=${encodeURIComponent(source)}` : "";
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/stagelab/quick-analysis/return/?session_id={CHECKOUT_SESSION_ID}${sourceSuffix}`,
        cancel_url: `${origin}/stagelab/quick-analysis/?cancelled=1${sourceSuffix}`,
        metadata: {
          product: "stagelab_quick_analysis",
          quick_analysis_id: analysisId,
          analysis_mode: context.analysisMode,
        },
        payment_intent_data: {
          metadata: {
            product: "stagelab_quick_analysis",
            quick_analysis_id: analysisId,
            analysis_mode: context.analysisMode,
          },
        },
        expires_at: Math.floor(Date.now() / 1_000) + 30 * 60,
        submit_type: "pay",
        custom_text: {
          submit: { message: "One-time StageLab Quick Analysis. No subscription or automatic renewal." },
        },
      },
      { idempotencyKey: `quick-analysis-checkout-${analysisId}` },
    );

    if (!session.url) throw new Error("Stripe Checkout did not return a URL.");
    await attachCheckoutSession(supabase, analysisId, session.id);
    const response = NextResponse.json(
      { checkoutUrl: session.url },
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
