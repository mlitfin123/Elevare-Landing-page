import { NextResponse } from "next/server";
import {
  getRequiredServerEnv,
  quickAnalysisErrorResponse,
} from "@/lib/quick-analysis-server";
import {
  fulfillVerifiedQuickAnalysisSession,
  getQuickAnalysisStripe,
} from "@/lib/quick-analysis-stripe";

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
      await fulfillVerifiedQuickAnalysisSession(event.data.object.id);
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
