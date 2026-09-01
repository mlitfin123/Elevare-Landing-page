import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSecondarySupabaseServerConfig } from "./supabase-projects.ts";

export type ShopInventorySnapshot = {
  productId: string;
  stripePriceId: string | null;
  amazonSku: string | null;
  amazonAsin: string | null;
  onHand: number;
  reserved: number;
  safetyBuffer: number;
  availableToSell: number;
  maxCheckoutQuantity: number;
  backordersEnabled: boolean;
};

type InventorySnapshotRow = {
  product_id: string;
  stripe_price_id: string | null;
  amazon_sku: string | null;
  amazon_asin: string | null;
  on_hand: number | string;
  reserved: number | string;
  safety_buffer: number;
  available_to_sell: number | string;
  max_checkout_quantity: number;
  backorders_enabled: boolean;
};

type ReservationRow = {
  reservation_id: string;
  reservation_expires_at: string;
};

export class ShopInventoryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ShopInventoryError";
    this.code = code;
  }
}

function getShopSupabase(): SupabaseClient {
  const config = getSecondarySupabaseServerConfig();
  if (!config.url || !config.serviceRoleKey) {
    throw new ShopInventoryError("DATABASE_NOT_CONFIGURED", "Shop inventory is not configured.");
  }
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function inventoryError(error: { message?: string } | null, fallback: string): never {
  const databaseMessage = error?.message ?? "";
  const knownCode = [
    "SHOP_INVENTORY_UNAVAILABLE",
    "SHOP_INVENTORY_INVALID_QUANTITY",
    "SHOP_INVENTORY_PRODUCT_NOT_FOUND",
    "SHOP_INVENTORY_RESERVATION_INACTIVE",
    "SHOP_INVENTORY_RESERVATION_NOT_FOUND",
    "SHOP_INVENTORY_SESSION_CONFLICT",
  ].find((code) => databaseMessage.includes(code));
  throw new ShopInventoryError(knownCode ?? "DATABASE_OPERATION_FAILED", fallback);
}

function firstRow<T>(data: T | T[] | null): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

export async function getShopInventorySnapshot(
  productId: string,
  supabase = getShopSupabase(),
): Promise<ShopInventorySnapshot | null> {
  const { data, error } = await supabase.rpc("get_shop_inventory_snapshot", {
    p_product_id: productId,
  });
  if (error) inventoryError(error, "Shop availability could not be checked.");
  const row = firstRow(data as InventorySnapshotRow | InventorySnapshotRow[] | null);
  if (!row) return null;
  return {
    productId: row.product_id,
    stripePriceId: row.stripe_price_id,
    amazonSku: row.amazon_sku,
    amazonAsin: row.amazon_asin,
    onHand: Number(row.on_hand),
    reserved: Number(row.reserved),
    safetyBuffer: row.safety_buffer,
    availableToSell: Number(row.available_to_sell),
    maxCheckoutQuantity: row.max_checkout_quantity,
    backordersEnabled: row.backorders_enabled,
  };
}

export async function reserveShopInventory(
  input: {
    productId: string;
    quantity: number;
    checkoutAttemptId: string;
    expiresAt: Date;
  },
  supabase = getShopSupabase(),
) {
  const { data, error } = await supabase.rpc("reserve_shop_inventory", {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_checkout_attempt_id: input.checkoutAttemptId,
    p_expires_at: input.expiresAt.toISOString(),
  });
  if (error) inventoryError(error, "This product is unavailable right now.");
  const row = firstRow(data as ReservationRow | ReservationRow[] | null);
  if (!row?.reservation_id) {
    throw new ShopInventoryError("RESERVATION_FAILED", "This product is unavailable right now.");
  }
  return { id: row.reservation_id, expiresAt: new Date(row.reservation_expires_at) };
}

export async function attachShopCheckoutSession(
  input: { reservationId: string; checkoutSessionId: string; expiresAt: Date },
  supabase = getShopSupabase(),
) {
  const { data, error } = await supabase.rpc("attach_shop_checkout_session", {
    p_reservation_id: input.reservationId,
    p_stripe_checkout_session_id: input.checkoutSessionId,
    p_expires_at: input.expiresAt.toISOString(),
  });
  if (error || data !== true) inventoryError(error, "Checkout inventory could not be finalized.");
}

export async function releaseShopInventoryReservation(
  input: {
    reservationId?: string | null;
    checkoutSessionId?: string | null;
    reason: string;
  },
  supabase = getShopSupabase(),
) {
  const { data, error } = await supabase.rpc("release_shop_inventory_reservation", {
    p_reservation_id: input.reservationId ?? null,
    p_stripe_checkout_session_id: input.checkoutSessionId ?? null,
    p_release_reason: input.reason,
  });
  if (error) inventoryError(error, "Checkout inventory could not be released.");
  return data === true;
}

export async function completeShopElevareSale(
  input: {
    reservationId: string;
    checkoutSessionId: string;
    paymentIntentId: string;
    amountTotal: number;
    currency: string;
    customerEmail: string | null;
    customerName: string | null;
    shippingDetails: Record<string, unknown> | null;
  },
  supabase = getShopSupabase(),
) {
  const { data, error } = await supabase.rpc("complete_shop_elevare_sale", {
    p_reservation_id: input.reservationId,
    p_stripe_checkout_session_id: input.checkoutSessionId,
    p_stripe_payment_intent_id: input.paymentIntentId,
    p_amount_total: input.amountTotal,
    p_currency: input.currency.toLowerCase(),
    p_customer_email: input.customerEmail,
    p_customer_name: input.customerName,
    p_shipping_details: input.shippingDetails,
  });
  if (error || typeof data !== "string") {
    inventoryError(error, "This paid order could not be recorded automatically.");
  }
  return data;
}
