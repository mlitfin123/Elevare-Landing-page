import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  ShopInventoryError,
  attachShopCheckoutSession,
  getShopInventorySnapshot,
  releaseShopInventoryReservation,
  reserveShopInventory,
} from "@/lib/shop-inventory";
import { getShopCheckoutAvailability } from "@/lib/shop-products";
import { getShopStripe, verifyShopProductPrice } from "@/lib/shop-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let reservationId: string | null = null;
  let checkoutSessionId: string | null = null;
  let stripeClient: ReturnType<typeof getShopStripe> | null = null;
  try {
    if (!hasValidOrigin(request)) return errorResponse("This checkout request is not allowed.", 403);
    const payload = await request.json() as Record<string, unknown>;
    const productId = typeof payload.productId === "string" ? payload.productId : "";
    const checkoutAttemptId = typeof payload.checkoutAttemptId === "string" ? payload.checkoutAttemptId : "";
    const availability = getShopCheckoutAvailability(productId, payload.quantity);

    if (availability.available === false) {
      if (availability.reason === "not_found") return errorResponse("Product not found.", 404);
      if (availability.reason === "not_active") return errorResponse("This product is not available for purchase.", 409);
      if (availability.reason === "invalid_quantity") return errorResponse("This quantity is not available.", 400);
      return errorResponse("Shop checkout is not configured.", 503);
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutAttemptId)) {
      return errorResponse("This checkout request is invalid.", 400);
    }

    const inventory = await getShopInventorySnapshot(availability.product.id);
    if (!inventory || inventory.stripePriceId !== availability.product.stripePriceId) {
      return errorResponse("Shop checkout is not configured.", 503);
    }
    if (availability.quantity > inventory.maxCheckoutQuantity) {
      return errorResponse("This quantity is not available.", 400);
    }
    if (inventory.backordersEnabled) return errorResponse("Shop checkout is not configured.", 503);

    stripeClient = getShopStripe();
    const priceId = await verifyShopProductPrice(availability.product, stripeClient);
    const origin = new URL(request.url).origin;
    const allowedCountries = availability.product.allowedShippingCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
    const expiresAt = new Date(Date.now() + 30 * 60 * 1_000);
    const reservation = await reserveShopInventory({
      productId: availability.product.id,
      quantity: availability.quantity,
      checkoutAttemptId,
      expiresAt,
    });
    reservationId = reservation.id;
    const session = await stripeClient.checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded_page",
        redirect_on_completion: "if_required",
        payment_method_types: ["card"],
        customer_creation: "always",
        line_items: [{ price: priceId, quantity: availability.quantity }],
        shipping_address_collection: { allowed_countries: allowedCountries },
        shipping_options: [{ shipping_rate: availability.product.stripeShippingRateId! }],
        automatic_tax: availability.product.stripeAutomaticTax ? { enabled: true } : undefined,
        return_url: `${origin}/shop/order-confirmation/?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          product: "elevare_shop",
          shop_product_id: availability.product.id,
          order_reference: checkoutAttemptId,
          inventory_reservation_id: reservation.id,
          order_quantity: String(availability.quantity),
        },
        payment_intent_data: {
          metadata: {
            product: "elevare_shop",
            shop_product_id: availability.product.id,
            order_reference: checkoutAttemptId,
            inventory_reservation_id: reservation.id,
            order_quantity: String(availability.quantity),
          },
        },
        expires_at: Math.floor(expiresAt.getTime() / 1_000),
        submit_type: "pay",
      },
      { idempotencyKey: `shop-checkout-${availability.product.id}-${checkoutAttemptId}` },
    );
    checkoutSessionId = session.id;

    await attachShopCheckoutSession({
      reservationId: reservation.id,
      checkoutSessionId: session.id,
      expiresAt: new Date(session.expires_at * 1_000),
    });

    if (!session.client_secret) throw new Error("Shop checkout did not return a client secret.");
    return NextResponse.json(
      { clientSecret: session.client_secret, checkoutSessionId: session.id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (checkoutSessionId && stripeClient) {
      try {
        await stripeClient.checkout.sessions.expire(checkoutSessionId);
      } catch {
        // The database reservation still has a short expiration if Stripe cannot be reached.
      }
    }
    if (reservationId) {
      try {
        await releaseShopInventoryReservation({ reservationId, reason: "checkout_creation_failed" });
      } catch {
        // The reservation expires automatically even if this best-effort release fails.
      }
    }
    if (error instanceof ShopInventoryError && error.code === "SHOP_INVENTORY_UNAVAILABLE") {
      return errorResponse("This product is restocking soon.", 409);
    }
    if (error instanceof ShopInventoryError && error.code === "SHOP_INVENTORY_INVALID_QUANTITY") {
      return errorResponse("This quantity is not available.", 400);
    }
    return errorResponse("Shop checkout is temporarily unavailable.", 503);
  }
}
