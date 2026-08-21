import "server-only";

import Stripe from "stripe";
import {
  QUICK_ANALYSIS_CURRENCY,
  QUICK_ANALYSIS_PRICE_CENTS,
  QUICK_ANALYSIS_PRODUCT_NAME,
} from "./quick-analysis.ts";
import {
  activatePaidQuickAnalysis,
  type QuickAnalysisRow,
} from "./quick-analysis-repository.ts";
import {
  QuickAnalysisServerError,
  getRequiredServerEnv,
  getQuickAnalysisSupabase,
} from "./quick-analysis-server.ts";

let stripeClient: Stripe | null = null;

export function getQuickAnalysisStripe() {
  if (!stripeClient) stripeClient = new Stripe(getRequiredServerEnv("STRIPE_SECRET_KEY"));
  return stripeClient;
}

export function getQuickAnalysisPriceId() {
  return getRequiredServerEnv("STRIPE_QUICK_ANALYSIS_PRICE_ID");
}

export async function verifyConfiguredQuickAnalysisPrice(stripe = getQuickAnalysisStripe()) {
  const priceId = getQuickAnalysisPriceId();
  const price = await stripe.prices.retrieve(priceId);
  if (
    !price.active ||
    price.type !== "one_time" ||
    price.unit_amount !== QUICK_ANALYSIS_PRICE_CENTS ||
    price.currency.toLowerCase() !== QUICK_ANALYSIS_CURRENCY
  ) {
    throw new QuickAnalysisServerError(
      "INVALID_STRIPE_PRICE",
      `${QUICK_ANALYSIS_PRODUCT_NAME} checkout is temporarily unavailable.`,
      503,
    );
  }
  return priceId;
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id ?? null;
}

export function validatePaidQuickAnalysisSession(
  session: Stripe.Checkout.Session,
  configuredPriceId: string,
) {
  const analysisId = session.metadata?.quick_analysis_id;
  const product = session.metadata?.product;
  const paymentIntentId = getPaymentIntentId(session);
  const lineItems = session.line_items?.data ?? [];
  const matchingLineItem = lineItems.find(
    (lineItem) => lineItem.price?.id === configuredPriceId && lineItem.quantity === 1,
  );

  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.amount_total !== QUICK_ANALYSIS_PRICE_CENTS ||
    session.currency?.toLowerCase() !== QUICK_ANALYSIS_CURRENCY ||
    product !== "stagelab_quick_analysis" ||
    !analysisId ||
    !paymentIntentId ||
    !matchingLineItem ||
    lineItems.length !== 1
  ) {
    throw new QuickAnalysisServerError(
      "PAYMENT_NOT_VERIFIED",
      "Payment could not be verified for this analysis.",
      402,
    );
  }

  return {
    analysisId,
    checkoutSessionId: session.id,
    paymentIntentId,
    amountPaid: session.amount_total,
    currency: session.currency.toLowerCase(),
  };
}

export async function retrieveVerifiedQuickAnalysisSession(
  checkoutSessionId: string,
  stripe = getQuickAnalysisStripe(),
) {
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9_]+$/.test(checkoutSessionId) || checkoutSessionId.length > 255) {
    throw new QuickAnalysisServerError("INVALID_CHECKOUT_SESSION", "This checkout session is invalid.", 400);
  }
  const configuredPriceId = getQuickAnalysisPriceId();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["line_items.data.price", "payment_intent"],
  });
  return { session, verified: validatePaidQuickAnalysisSession(session, configuredPriceId) };
}

export async function fulfillVerifiedQuickAnalysisSession(
  checkoutSessionId: string,
): Promise<QuickAnalysisRow> {
  const { verified } = await retrieveVerifiedQuickAnalysisSession(checkoutSessionId);
  return activatePaidQuickAnalysis(getQuickAnalysisSupabase(), verified);
}
