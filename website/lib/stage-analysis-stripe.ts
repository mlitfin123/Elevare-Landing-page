import "server-only";

import type Stripe from "stripe";
import {
  activatePaidQuickAnalysis,
  getQuickAnalysisByCheckoutSession,
  markStageLabOrderAuthorized,
  type QuickAnalysisRow,
} from "./quick-analysis-repository.ts";
import { getQuickAnalysisStripe } from "./quick-analysis-stripe.ts";
import { getQuickAnalysisSupabase, getRequiredServerEnv, QuickAnalysisServerError } from "./quick-analysis-server.ts";
import {
  STAGE_ANALYSIS_PRODUCT_CONFIG,
  type PaidStageAnalysisProduct,
} from "./stage-analysis.ts";
import { authorizeStageAnalysisOrder } from "./stagelab-posing-gateway.ts";

const PRICE_ENV: Record<PaidStageAnalysisProduct, string> = {
  posing_analysis: "STRIPE_PRICE_POSING_ANALYSIS",
  complete_stage_analysis: "STRIPE_PRICE_COMPLETE_STAGE_ANALYSIS",
};

export function getStageAnalysisPriceId(product: PaidStageAnalysisProduct) {
  return getRequiredServerEnv(PRICE_ENV[product]);
}

export async function verifyConfiguredStageAnalysisPrice(
  product: PaidStageAnalysisProduct,
  stripe = getQuickAnalysisStripe(),
) {
  const priceId = getStageAnalysisPriceId(product);
  const price = await stripe.prices.retrieve(priceId);
  const config = STAGE_ANALYSIS_PRODUCT_CONFIG[product];
  if (
    !price.active ||
    price.type !== "one_time" ||
    price.unit_amount !== config.priceCents ||
    price.currency.toLowerCase() !== "usd"
  ) {
    throw new QuickAnalysisServerError(
      "INVALID_STRIPE_PRICE",
      `${config.label} checkout is temporarily unavailable.`,
      503,
    );
  }
  return priceId;
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id ?? null;
}

export function validatePaidStageAnalysisSession(
  session: Stripe.Checkout.Session,
  product: PaidStageAnalysisProduct,
  configuredPriceId: string,
) {
  const analysisId = session.metadata?.quick_analysis_id;
  const metadataProduct = session.metadata?.analysis_product;
  const paymentIntentId = getPaymentIntentId(session);
  const lineItems = session.line_items?.data ?? [];
  const matchingLineItem = lineItems.find(
    (lineItem) => lineItem.price?.id === configuredPriceId && lineItem.quantity === 1,
  );
  const expectedAmount = STAGE_ANALYSIS_PRODUCT_CONFIG[product].priceCents;

  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.amount_total !== expectedAmount ||
    session.currency?.toLowerCase() !== "usd" ||
    session.metadata?.product !== "stagelab_stage_analysis" ||
    metadataProduct !== product ||
    !analysisId ||
    !paymentIntentId ||
    !matchingLineItem ||
    lineItems.length !== 1
  ) {
    throw new QuickAnalysisServerError(
      "PAYMENT_NOT_VERIFIED",
      "Payment could not be verified for this StageLab analysis.",
      402,
    );
  }

  return {
    product,
    analysisId,
    checkoutSessionId: session.id,
    paymentIntentId,
    amountPaid: session.amount_total,
    currency: session.currency.toLowerCase(),
  };
}

export async function retrieveVerifiedStageAnalysisSession(
  checkoutSessionId: string,
  expectedProduct?: PaidStageAnalysisProduct,
) {
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9_]+$/.test(checkoutSessionId) || checkoutSessionId.length > 255) {
    throw new QuickAnalysisServerError("INVALID_CHECKOUT_SESSION", "This checkout session is invalid.", 400);
  }
  const stripe = getQuickAnalysisStripe();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["line_items.data.price", "payment_intent"],
  });
  const metadataProduct = session.metadata?.analysis_product;
  const product = expectedProduct ?? (
    metadataProduct === "posing_analysis" || metadataProduct === "complete_stage_analysis"
      ? metadataProduct
      : null
  );
  if (!product) {
    throw new QuickAnalysisServerError("INVALID_ANALYSIS_PRODUCT", "This analysis product is invalid.", 400);
  }
  const configuredPriceId = getStageAnalysisPriceId(product);
  return { session, verified: validatePaidStageAnalysisSession(session, product, configuredPriceId) };
}

export async function fulfillVerifiedStageAnalysisSession(
  checkoutSessionId: string,
  expectedProduct?: PaidStageAnalysisProduct,
): Promise<QuickAnalysisRow> {
  const { verified } = await retrieveVerifiedStageAnalysisSession(checkoutSessionId, expectedProduct);
  const supabase = getQuickAnalysisSupabase();
  const stored = await getQuickAnalysisByCheckoutSession(supabase, checkoutSessionId);
  if (stored && stored.analysis_product && stored.analysis_product !== verified.product) {
    throw new QuickAnalysisServerError("PAYMENT_PRODUCT_MISMATCH", "This purchase does not match the selected analysis.", 409);
  }
  return activatePaidQuickAnalysis(supabase, verified);
}

export async function authorizeVerifiedStageAnalysisSession(
  checkoutSessionId: string,
  stripeEventId: string,
) {
  const row = await fulfillVerifiedStageAnalysisSession(checkoutSessionId);
  const product = row.analysis_product;
  if (product !== "posing_analysis" && product !== "complete_stage_analysis") {
    throw new QuickAnalysisServerError("INVALID_ANALYSIS_PRODUCT", "This purchase does not include posing analysis.", 409);
  }
  if (!row.stripe_payment_intent_id || !row.paid_at) {
    throw new QuickAnalysisServerError("PAYMENT_NOT_VERIFIED", "Payment could not be verified.", 402);
  }
  const authorization = await authorizeStageAnalysisOrder({
    externalOrderId: row.id,
    stripeEventId,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    product,
    paidAt: row.paid_at,
  });
  return markStageLabOrderAuthorized(getQuickAnalysisSupabase(), {
    analysisId: row.id,
    stripeEventId,
    authorizationExpiresAt: authorization.authorization_expires_at,
    posingAccess: authorization.posing_access,
  });
}
