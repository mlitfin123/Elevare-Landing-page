import { NextResponse } from "next/server";
import {
  getRequiredServerEnv,
  quickAnalysisErrorResponse,
} from "@/lib/quick-analysis-server";
import {
  fulfillVerifiedQuickAnalysisSession,
  getQuickAnalysisStripe,
} from "@/lib/quick-analysis-stripe";
import {
  getQuickAnalysisByCheckoutSession,
  getQuickAnalysisByPaymentIntent,
  markStageAnalysisPaymentRevoked,
} from "@/lib/quick-analysis-repository";
import { getQuickAnalysisSupabase } from "@/lib/quick-analysis-server";
import { authorizeVerifiedStageAnalysisSession } from "@/lib/stage-analysis-stripe";
import { revokeStageAnalysisOrder } from "@/lib/stagelab-posing-gateway";
import { releaseShopInventoryReservation } from "@/lib/shop-inventory";
import { fulfillVerifiedShopSession } from "@/lib/shop-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
    const rawBody = await request.text();
    const event = getQuickAnalysisStripe().webhooks.constructEvent(
      rawBody,
      signature,
      getRequiredServerEnv("STRIPE_WEBHOOK_SECRET"),
    );

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      if (event.data.object.metadata?.product === "stagelab_quick_analysis") {
        await fulfillVerifiedQuickAnalysisSession(event.data.object.id);
      } else if (event.data.object.metadata?.product === "stagelab_stage_analysis") {
        await authorizeVerifiedStageAnalysisSession(event.data.object.id, event.id);
      } else if (event.data.object.metadata?.product === "elevare_shop") {
        await fulfillVerifiedShopSession(event.data.object.id);
      }
    }

    if (
      event.type === "checkout.session.async_payment_failed"
      && event.data.object.metadata?.product === "stagelab_stage_analysis"
    ) {
      const supabase = getQuickAnalysisSupabase();
      const row = await getQuickAnalysisByCheckoutSession(supabase, event.data.object.id);
      if (row) await markStageAnalysisPaymentRevoked(supabase, row, "failed");
    }

    if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
      const paymentIntent = event.data.object.payment_intent;
      const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
      if (paymentIntentId) {
        const supabase = getQuickAnalysisSupabase();
        const row = await getQuickAnalysisByPaymentIntent(supabase, paymentIntentId);
        if (
          row &&
          (row.analysis_product === "posing_analysis" || row.analysis_product === "complete_stage_analysis")
        ) {
          await revokeStageAnalysisOrder({
            externalOrderId: row.id,
            stripePaymentIntentId: paymentIntentId,
            paymentStatus: event.type === "charge.refunded" ? "refunded" : "disputed",
          });
          await markStageAnalysisPaymentRevoked(supabase, row, "refunded");
        }
      }
    }

    if (
      event.type === "checkout.session.expired"
      && event.data.object.metadata?.product === "elevare_shop"
    ) {
      await releaseShopInventoryReservation({
        reservationId: event.data.object.metadata.inventory_reservation_id ?? null,
        checkoutSessionId: event.data.object.id,
        reason: "checkout_session_expired",
      });
    }

    return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.name === "StripeSignatureVerificationError") {
      return NextResponse.json(
        { error: "Invalid webhook signature.", code: "INVALID_WEBHOOK_SIGNATURE" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return quickAnalysisErrorResponse(error);
  }
}
