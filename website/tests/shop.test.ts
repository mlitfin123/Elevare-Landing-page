import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  evaluateShopCheckoutAvailability,
  getPublicShopProducts,
  resolveShopPublicAvailability,
  shopProducts,
  type ShopProduct,
} from "../lib/shop-products.ts";

const projectRoot = path.resolve(import.meta.dirname, "..");
const showDayKit = shopProducts[0] as ShopProduct;
const inventoryMigration = fs.readFileSync(
  path.resolve(projectRoot, "..", "supabase", "migrations", "20260901120000_shop_shared_inventory.sql"),
  "utf8",
);

test("the public shop launches with one Coming Soon Show Day Kit", () => {
  assert.equal(shopProducts.length, 1);
  assert.equal(showDayKit.name, "Show Day Kit");
  assert.equal(showDayKit.status, "coming_soon");
  assert.equal(showDayKit.stripePriceId, null);
  assert.equal(showDayKit.stripeShippingRateId, null);
  assert.equal(getPublicShopProducts().length, 1);

  const page = fs.readFileSync(path.join(projectRoot, "app", "shop", "page.tsx"), "utf8");
  assert.match(page, /Coming Soon/);
  assert.match(page, /Sales are not open yet/);
  assert.doesNotMatch(page, /Add to Cart|Preorder|Reserve/);
});

test("checkout policy rejects Coming Soon, hidden, invalid, and incompletely configured products", () => {
  assert.deepEqual(evaluateShopCheckoutAvailability(showDayKit, 1), {
    available: false,
    reason: "not_active",
  });
  assert.deepEqual(
    evaluateShopCheckoutAvailability({ ...showDayKit, status: "hidden" }, 1),
    { available: false, reason: "not_found" },
  );
  assert.deepEqual(
    evaluateShopCheckoutAvailability({ ...showDayKit, status: "active" }, 1),
    { available: false, reason: "incomplete_configuration" },
  );

  const activeProduct: ShopProduct = {
    ...showDayKit,
    status: "active",
    stripePriceId: "price_test_show_day_kit",
    stripeShippingRateId: "shr_test_show_day_kit",
    allowedShippingCountries: ["US"],
    stripeAutomaticTax: false,
  };
  assert.deepEqual(evaluateShopCheckoutAvailability(activeProduct, 0), {
    available: false,
    reason: "invalid_quantity",
  });
  assert.equal(evaluateShopCheckoutAvailability(activeProduct, 1).available, true);
  assert.equal(evaluateShopCheckoutAvailability(activeProduct, 2).available, true);
  assert.match(inventoryMigration, /p_quantity > product_record\.max_checkout_quantity/);
});

test("public availability follows product status and shared inventory without exposing counts", () => {
  assert.equal(resolveShopPublicAvailability(showDayKit, false), "coming_soon");
  const activeProduct = { ...showDayKit, status: "active" as const };
  assert.equal(resolveShopPublicAvailability(activeProduct, true), "available");
  assert.equal(resolveShopPublicAvailability(activeProduct, false), "restocking");

  const page = fs.readFileSync(path.join(projectRoot, "app", "shop", "page.tsx"), "utf8");
  assert.match(page, /Restocking Soon/);
  assert.match(page, /availableToSell > 0/);
  assert.doesNotMatch(page, /onHand|safetyBuffer|\.reserved/);
  assert.match(page, /dynamic = "force-dynamic"/);
});

test("Supabase derives one shared pool from movements, reservations, and the safety buffer", () => {
  assert.match(inventoryMigration, /sum\(quantity_delta\)/i);
  assert.match(inventoryMigration, /status in \('pending_session', 'active'\)/);
  assert.match(inventoryMigration, /coalesce\(movement\.on_hand, 0\) - coalesce\(reservation\.reserved, 0\) - product\.safety_buffer/);
  assert.match(inventoryMigration, /greatest\(/);
  assert.match(inventoryMigration, /safety_buffer integer not null default 0/);
  assert.doesNotMatch(inventoryMigration, /INITIAL_STOCK[\s\S]{0,80}\+?20/);
});

test("inventory movement reasons cover launch, Amazon, restock, damage, returns, and corrections", () => {
  for (const reason of [
    "INITIAL_STOCK",
    "ELEVARE_SALE",
    "AMAZON_SALE",
    "RESTOCK",
    "DAMAGE",
    "RETURN",
    "MANUAL_ADJUSTMENT",
  ]) {
    assert.match(inventoryMigration, new RegExp(`'${reason}'`));
  }
  assert.match(inventoryMigration, /p_reason = 'AMAZON_SALE' and p_channel <> 'amazon'/);
  assert.match(inventoryMigration, /SHOP_INVENTORY_AMAZON_REFERENCE_REQUIRED/);
  assert.match(inventoryMigration, /current_on_hand \+ p_quantity_delta < active_reserved/);
});

test("reservations are atomic, bounded, non-negative, and reusable after expiration", () => {
  assert.match(inventoryMigration, /from public\.shop_inventory_products[\s\S]{0,100}for update/);
  assert.match(inventoryMigration, /current_on_hand - active_reserved - product_record\.safety_buffer < p_quantity/);
  assert.match(inventoryMigration, /SHOP_INVENTORY_UNAVAILABLE/);
  assert.match(inventoryMigration, /reservation_ttl_elapsed/);
  assert.match(inventoryMigration, /max_checkout_quantity integer not null default 1/);
  assert.match(inventoryMigration, /backorders_enabled boolean not null default false/);
});

test("paid orders and Stripe expiration are idempotent", () => {
  assert.match(inventoryMigration, /stripe_checkout_session_id text not null unique/);
  assert.match(inventoryMigration, /stripe_payment_intent_id text not null unique/);
  assert.match(inventoryMigration, /shop_inventory_movements_external_reference_idx/);
  assert.match(inventoryMigration, /if existing_order\.id is not null then/);
  assert.match(inventoryMigration, /'ELEVARE_SALE'/);

  const webhook = fs.readFileSync(
    path.join(projectRoot, "app", "api", "quick-analysis", "webhook", "route.ts"),
    "utf8",
  );
  assert.match(webhook, /checkout\.session\.expired/);
  assert.match(webhook, /releaseShopInventoryReservation/);
  assert.match(webhook, /fulfillVerifiedShopSession/);
});

test("inventory tables and operations are private service-role-only resources", () => {
  for (const table of [
    "shop_inventory_products",
    "shop_inventory_movements",
    "shop_inventory_reservations",
    "shop_orders",
  ]) {
    assert.match(inventoryMigration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(inventoryMigration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
  }
  assert.match(inventoryMigration, /grant execute on function public\.reserve_shop_inventory[\s\S]*to service_role/);
  assert.doesNotMatch(inventoryMigration, /to anon|to authenticated/);

  const shopTree = [
    fs.readFileSync(path.join(projectRoot, "app", "shop", "page.tsx"), "utf8"),
    fs.readFileSync(path.join(projectRoot, "components", "shop", "ShopCheckout.tsx"), "utf8"),
  ].join("\n");
  assert.doesNotMatch(shopTree, /Adjust inventory|Record restock|Safety buffer|Amazon SKU/);
});

test("Shop is linked and indexed while confirmation remains private", () => {
  const header = fs.readFileSync(path.join(projectRoot, "components", "Header.tsx"), "utf8");
  const footer = fs.readFileSync(path.join(projectRoot, "components", "Footer.tsx"), "utf8");
  const sitemap = fs.readFileSync(path.join(projectRoot, "scripts", "generate-sitemaps.ts"), "utf8");
  const confirmation = fs.readFileSync(path.join(projectRoot, "app", "shop", "order-confirmation", "page.tsx"), "utf8");

  assert.match(header, /href: "\/shop\/"/);
  assert.match(footer, /href="\/shop\/"/);
  assert.match(sitemap, /"\/shop"/);
  assert.doesNotMatch(sitemap, /shop\/order-confirmation/);
  assert.match(confirmation, /index: false/);
  assert.match(confirmation, /follow: false/);
});

test("Shop checkout is server-authoritative and isolated from Quick Analysis", () => {
  const checkoutRoute = fs.readFileSync(path.join(projectRoot, "app", "api", "shop", "checkout", "route.ts"), "utf8");
  const webhookRoute = fs.readFileSync(path.join(projectRoot, "app", "api", "quick-analysis", "webhook", "route.ts"), "utf8");
  const quickCheckout = fs.readFileSync(path.join(projectRoot, "app", "api", "quick-analysis", "checkout", "route.ts"), "utf8");

  assert.match(checkoutRoute, /getShopCheckoutAvailability/);
  assert.match(checkoutRoute, /verifyShopProductPrice/);
  assert.doesNotMatch(checkoutRoute, /payload\.stripePriceId|payload\.price/);
  assert.ok(
    checkoutRoute.indexOf("getShopCheckoutAvailability") < checkoutRoute.indexOf("getShopStripe()"),
    "the trusted status/configuration guard must run before Stripe is called",
  );
  assert.match(checkoutRoute, /availability\.reason === "not_active"/);
  assert.match(checkoutRoute, /This product is not available for purchase/);
  assert.match(checkoutRoute, /idempotencyKey/);
  assert.match(checkoutRoute, /reserveShopInventory/);
  assert.match(checkoutRoute, /attachShopCheckoutSession/);
  assert.ok(
    checkoutRoute.indexOf("reserveShopInventory") < checkoutRoute.indexOf("checkout.sessions.create"),
    "inventory must be reserved before Stripe Checkout is created",
  );
  assert.match(checkoutRoute, /inventory\.maxCheckoutQuantity/);
  assert.match(checkoutRoute, /reserveShopInventory/);
  assert.doesNotMatch(checkoutRoute, /inventory\.availableToSell < availability\.quantity/);
  assert.match(checkoutRoute, /inventory\.stripePriceId !== availability\.product\.stripePriceId/);
  assert.match(checkoutRoute, /shipping_address_collection/);
  assert.match(checkoutRoute, /ui_mode: "embedded"/);
  assert.match(webhookRoute, /metadata\?\.product === "stagelab_quick_analysis"/);
  assert.match(webhookRoute, /metadata\?\.product === "elevare_shop"/);
  assert.match(quickCheckout, /stagelab_quick_analysis/);
  assert.match(quickCheckout, /line_items: \[\{ price: priceId, quantity: 1 \}\]/);
});
