import "server-only";

import Stripe from "stripe";
import { completeShopElevareSale } from "./shop-inventory.ts";
import { getShopProductById, type ShopProduct } from "./shop-products.ts";

let stripeClient: Stripe | null = null;

export function getShopStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Shop checkout is not configured.");
  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export async function verifyShopProductPrice(product: ShopProduct, stripe = getShopStripe()) {
  if (!product.stripePriceId) throw new Error("Shop checkout is not configured.");
  const price = await stripe.prices.retrieve(product.stripePriceId);
  if (!price.active || price.type !== "one_time" || price.unit_amount == null) {
    throw new Error("Shop checkout is not configured.");
  }
  return price.id;
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id ?? null;
}

export function validatePaidShopSession(session: Stripe.Checkout.Session) {
  const productId = session.metadata?.shop_product_id;
  const reservationId = session.metadata?.inventory_reservation_id;
  const quantity = Number(session.metadata?.order_quantity);
  const product = productId ? getShopProductById(productId) : undefined;
  const lineItems = session.line_items?.data ?? [];
  const paymentIntentId = getPaymentIntentId(session);
  const matchingLineItem = product?.stripePriceId
    ? lineItems.find(
        (lineItem) => lineItem.price?.id === product.stripePriceId && lineItem.quantity === quantity,
      )
    : undefined;

  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.metadata?.product !== "elevare_shop" ||
    !product ||
    !reservationId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reservationId) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    !paymentIntentId ||
    !matchingLineItem ||
    lineItems.length !== 1
  ) {
    throw new Error("This order could not be verified.");
  }

  return { product, reservationId, quantity, paymentIntentId, checkoutSessionId: session.id };
}

export async function retrieveVerifiedShopSession(
  checkoutSessionId: string,
  stripe = getShopStripe(),
) {
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9_]+$/.test(checkoutSessionId) || checkoutSessionId.length > 255) {
    throw new Error("This checkout session is invalid.");
  }
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["line_items.data.price", "payment_intent"],
  });
  return validatePaidShopSession(session);
}

export async function fulfillVerifiedShopSession(
  checkoutSessionId: string,
  stripe = getShopStripe(),
) {
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["line_items.data.price", "payment_intent"],
  });
  const verified = validatePaidShopSession(session);
  const collected = session as Stripe.Checkout.Session & {
    collected_information?: { shipping_details?: Record<string, unknown> | null } | null;
    shipping_details?: Record<string, unknown> | null;
  };
  const shippingDetails = collected.collected_information?.shipping_details
    ?? collected.shipping_details
    ?? (session.customer_details?.address
      ? {
          name: session.customer_details.name,
          address: session.customer_details.address,
        }
      : null);
  const orderId = await completeShopElevareSale({
    reservationId: verified.reservationId,
    checkoutSessionId: verified.checkoutSessionId,
    paymentIntentId: verified.paymentIntentId,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    customerEmail: session.customer_details?.email ?? null,
    customerName: session.customer_details?.name ?? null,
    shippingDetails,
  });
  return { ...verified, orderId };
}
