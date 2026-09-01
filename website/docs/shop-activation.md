# ElevareFit Shop activation and shared inventory

The Show Day Kit uses the secondary Elevare Supabase project (`Elevare-Prod`, project
`cnfqpfynjpwlzdtblzps`) as the master representation of physical inventory shared by Elevare and
Amazon. There is no public inventory-management UI and no customer-facing stock count.

The product remains `status: "coming_soon"` in `lib/shop-products.ts`. Coming Soon products do not
query Stripe, create reservations, show a price, or expose a purchase button.

## Apply the inventory migration

Apply `supabase/migrations/20260901120000_shop_shared_inventory.sql` to `Elevare-Prod`. It creates:

- `shop_inventory_products`: private per-product identifiers and controls.
- `shop_inventory_movements`: append-only physical inventory ledger.
- `shop_inventory_reservations`: temporary Elevare Checkout holds.
- `shop_orders`: verified paid Elevare orders for private fulfillment.

All tables have RLS enabled. `public`, `anon`, and `authenticated` have no access. Only the server
service role can access the tables and RPCs.

## Configure the Show Day Kit privately

Run this in the Supabase SQL Editor after the migration. Replace the Stripe Price ID with the real
trusted Price. Leave Amazon values `null` until Amazon assigns them.

```sql
select * from public.configure_shop_inventory_product(
  p_product_id => 'show_day_kit',
  p_safety_buffer => 2,
  p_max_checkout_quantity => 1,
  p_stripe_price_id => 'price_REPLACE_WITH_REAL_ID',
  p_amazon_sku => null,
  p_amazon_asin => null
);
```

This configures the private safety buffer and server-enforced checkout maximum. It does not create
stock. The current implementation always requires sufficient inventory, even if
`backorders_enabled` were accidentally changed. Backorders are not supported.

## Private inventory operations

Use only `record_shop_inventory_adjustment` to change physical stock. Give each real-world event a
stable, unique reference so rerunning the same statement is idempotent.

Initial physical inventory, after counting the actual assembled kits:

```sql
select public.record_shop_inventory_adjustment(
  'show_day_kit', 20, 'INITIAL_STOCK', 'manual', 'initial-stock-2026-09', 'Counted physical kits'
);
```

Record one Amazon sale using the Amazon order ID as the unique reference:

```sql
select public.record_shop_inventory_adjustment(
  'show_day_kit', -1, 'AMAZON_SALE', 'amazon', 'AMAZON-ORDER-ID', 'Amazon order'
);
```

Record a new production/restock batch:

```sql
select public.record_shop_inventory_adjustment(
  'show_day_kit', 20, 'RESTOCK', 'manual', 'restock-batch-2026-10', 'Twenty completed kits'
);
```

Record one damaged or lost kit:

```sql
select public.record_shop_inventory_adjustment(
  'show_day_kit', -1, 'DAMAGE', 'manual', 'damage-2026-09-01-01', 'Damaged during packing'
);
```

Record one sellable return placed back into physical inventory:

```sql
select public.record_shop_inventory_adjustment(
  'show_day_kit', 1, 'RETURN', 'manual', 'return-ORDER-ID', 'Inspected and returned to stock'
);
```

Record a verified count correction only after physically recounting inventory:

```sql
select public.record_shop_inventory_adjustment(
  'show_day_kit', -1, 'MANUAL_ADJUSTMENT', 'manual', 'count-2026-09-30', 'Physical recount correction'
);
```

Use a positive delta instead when the recount finds additional sellable stock.

## View the private inventory snapshot

```sql
select * from public.get_shop_inventory_snapshot('show_day_kit');
```

The calculation is:

```text
on_hand = SUM(shop_inventory_movements.quantity_delta)
reserved = unexpired pending/active Elevare reservations
available_to_sell = MAX(on_hand - reserved - safety_buffer, 0)
```

Do not directly insert, update, or delete rows in `shop_inventory_movements`,
`shop_inventory_reservations`, or `shop_orders`. Do not manually complete/release reservations or
create `ELEVARE_SALE` movements. Those operations are transactional and Stripe-verified. Do not
edit a derived count; no editable on-hand counter exists.

## Activate Elevare sales

1. Create the Show Day Kit Product and one-time Price in the same Stripe account as ElevareFit.
2. Create the real Stripe Shipping Rate.
3. Decide which countries can be fulfilled and configure their ISO codes in `lib/shop-products.ts`.
4. Make a deliberate Stripe Tax decision in `stripeAutomaticTax`.
5. Put the same trusted `price_...` ID in Supabase and `lib/shop-products.ts`.
6. Record actual initial inventory and safety buffer using the operations above.
7. Add `checkout.session.expired` to the existing signed Stripe webhook endpoint's subscribed events.
8. Test a complete test-mode order, expiration, duplicate webhook delivery, and manual fulfillment.
9. Change the product code status to `active` and deploy once.

After activation, ordinary stock changes require no deploy. Available shared inventory displays Buy
Now. Zero available shared inventory displays Restocking Soon and rejects checkout. A restock makes
Buy Now return automatically on the next request.

## Elevare reservations and orders

Checkout reserves inventory in a row-locked Supabase RPC before creating a Stripe Session. The
reservation and Stripe Session expire together after 30 minutes. `checkout.session.expired`
releases the hold idempotently. A verified paid Session creates one `ELEVARE_SALE` movement and one
`shop_orders` row in the same database transaction. Unique Stripe Session and PaymentIntent keys
make duplicate webhook deliveries safe.

Use `shop_orders` in Supabase for private manual fulfillment. Set only `fulfillment_status` from
`pending` to `fulfilled` after shipping. Do not alter payment, reservation, quantity, product, or
Stripe identifier fields.

## Current Amazon limitation

Supabase immediately protects Elevare after an Amazon sale is recorded. It cannot know about an
Amazon sale that has not yet been recorded, so manual synchronization is not real-time protection.
Amazon listing quantity must also be managed separately in Amazon Seller Central; updating Supabase
does not update Amazon today.

For future automation, store the actual Amazon seller SKU and ASIN on `shop_inventory_products`.
An Amazon Selling Partner API worker can map an Amazon order line's seller SKU to `show_day_kit` and
call the same adjustment operation with a unique Amazon order-line reference. No inventory schema
redesign is needed.

## Future products

Add a trusted product entry in `lib/shop-products.ts`, a matching `shop_inventory_products` row,
and its own movement ledger entries. Each internal product ID receives an independent physical pool
while all channels for that product share that one pool.
