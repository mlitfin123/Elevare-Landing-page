-- Shared physical inventory for Elevare Shop and external channels such as Amazon.
-- Target: Elevare-Prod (cnfqpfynjpwlzdtblzps), the secondary server-side Supabase project.
-- Inventory is private. Public clients receive availability only through server routes.

begin;

create table if not exists public.shop_inventory_products (
  id text primary key,
  elevare_slug text not null unique,
  stripe_price_id text unique,
  amazon_sku text unique,
  amazon_asin text unique,
  safety_buffer integer not null default 0,
  max_checkout_quantity integer not null default 1,
  backorders_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shop_inventory_products_id_check check (id ~ '^[a-z0-9_]{2,80}$'),
  constraint shop_inventory_products_slug_check check (elevare_slug ~ '^[a-z0-9-]{2,100}$'),
  constraint shop_inventory_products_stripe_price_check
    check (stripe_price_id is null or stripe_price_id ~ '^price_[A-Za-z0-9_]+$'),
  constraint shop_inventory_products_safety_buffer_check check (safety_buffer >= 0),
  constraint shop_inventory_products_max_quantity_check check (max_checkout_quantity > 0)
);

comment on table public.shop_inventory_products is
  'Private shared-inventory configuration. Counts are derived from the movement and reservation ledgers.';
comment on column public.shop_inventory_products.safety_buffer is
  'Private units withheld from every sales channel calculation; never customer-visible.';
comment on column public.shop_inventory_products.backorders_enabled is
  'Reserved for a future controlled workflow. Current reservation logic never permits backorders.';

create table if not exists public.shop_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.shop_inventory_products(id) on update cascade on delete restrict,
  quantity_delta integer not null,
  reason text not null,
  channel text not null,
  external_reference text,
  reservation_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint shop_inventory_movements_delta_check check (quantity_delta <> 0),
  constraint shop_inventory_movements_reason_check
    check (reason in (
      'INITIAL_STOCK',
      'ELEVARE_SALE',
      'AMAZON_SALE',
      'RESTOCK',
      'DAMAGE',
      'RETURN',
      'MANUAL_ADJUSTMENT'
    )),
  constraint shop_inventory_movements_channel_check
    check (channel in ('elevare', 'amazon', 'manual')),
  constraint shop_inventory_movements_reference_check
    check (external_reference is null or char_length(btrim(external_reference)) between 1 and 255),
  constraint shop_inventory_movements_notes_check
    check (notes is null or char_length(notes) <= 1000)
);

comment on table public.shop_inventory_movements is
  'Append-only physical stock ledger shared by Elevare and Amazon. On-hand is SUM(quantity_delta).';

create unique index if not exists shop_inventory_movements_external_reference_idx
  on public.shop_inventory_movements (product_id, channel, external_reference)
  where external_reference is not null;
create index if not exists shop_inventory_movements_product_created_idx
  on public.shop_inventory_movements (product_id, created_at desc);

create table if not exists public.shop_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.shop_inventory_products(id) on update cascade on delete restrict,
  channel text not null default 'elevare',
  quantity integer not null,
  status text not null default 'pending_session',
  checkout_attempt_id uuid not null unique,
  stripe_checkout_session_id text unique,
  expires_at timestamptz not null,
  completed_at timestamptz,
  released_at timestamptz,
  release_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shop_inventory_reservations_channel_check check (channel = 'elevare'),
  constraint shop_inventory_reservations_quantity_check check (quantity > 0),
  constraint shop_inventory_reservations_status_check
    check (status in ('pending_session', 'active', 'completed', 'released', 'expired')),
  constraint shop_inventory_reservations_session_check
    check (
      stripe_checkout_session_id is null
      or stripe_checkout_session_id ~ '^cs_(test_|live_)?[A-Za-z0-9_]+$'
    ),
  constraint shop_inventory_reservations_release_reason_check
    check (release_reason is null or char_length(release_reason) <= 100)
);

comment on table public.shop_inventory_reservations is
  'Short-lived Elevare checkout holds. Active unexpired rows reduce sellable inventory without changing on-hand.';

alter table public.shop_inventory_movements
  drop constraint if exists shop_inventory_movements_reservation_id_fkey;
alter table public.shop_inventory_movements
  add constraint shop_inventory_movements_reservation_id_fkey
  foreign key (reservation_id) references public.shop_inventory_reservations(id) on delete restrict;

create index if not exists shop_inventory_reservations_active_idx
  on public.shop_inventory_reservations (product_id, expires_at)
  where status in ('pending_session', 'active');

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.shop_inventory_reservations(id) on delete restrict,
  product_id text not null references public.shop_inventory_products(id) on update cascade on delete restrict,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text not null unique,
  quantity integer not null,
  amount_total integer not null,
  currency text not null,
  payment_status text not null default 'paid',
  fulfillment_status text not null default 'pending',
  customer_email text,
  customer_name text,
  shipping_details jsonb,
  paid_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shop_orders_quantity_check check (quantity > 0),
  constraint shop_orders_amount_check check (amount_total >= 0),
  constraint shop_orders_currency_check check (currency ~ '^[a-z]{3}$'),
  constraint shop_orders_payment_status_check check (payment_status in ('paid', 'refunded')),
  constraint shop_orders_fulfillment_status_check
    check (fulfillment_status in ('pending', 'fulfilled', 'cancelled', 'refunded')),
  constraint shop_orders_email_check check (customer_email is null or char_length(customer_email) <= 320),
  constraint shop_orders_name_check check (customer_name is null or char_length(customer_name) <= 200),
  constraint shop_orders_shipping_shape_check
    check (shipping_details is null or jsonb_typeof(shipping_details) = 'object')
);

comment on table public.shop_orders is
  'Verified Stripe Shop orders for private manual fulfillment. One order maps to one completed reservation.';

alter table public.shop_inventory_products enable row level security;
alter table public.shop_inventory_movements enable row level security;
alter table public.shop_inventory_reservations enable row level security;
alter table public.shop_orders enable row level security;

revoke all on table public.shop_inventory_products from public, anon, authenticated;
revoke all on table public.shop_inventory_movements from public, anon, authenticated;
revoke all on table public.shop_inventory_reservations from public, anon, authenticated;
revoke all on table public.shop_orders from public, anon, authenticated;

grant select, insert, update, delete on table public.shop_inventory_products to service_role;
grant select, insert, update, delete on table public.shop_inventory_movements to service_role;
grant select, insert, update, delete on table public.shop_inventory_reservations to service_role;
grant select, insert, update, delete on table public.shop_orders to service_role;

create or replace function public.touch_shop_inventory_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists shop_inventory_products_touch_updated_at on public.shop_inventory_products;
create trigger shop_inventory_products_touch_updated_at
before update on public.shop_inventory_products
for each row execute function public.touch_shop_inventory_updated_at();

drop trigger if exists shop_inventory_reservations_touch_updated_at on public.shop_inventory_reservations;
create trigger shop_inventory_reservations_touch_updated_at
before update on public.shop_inventory_reservations
for each row execute function public.touch_shop_inventory_updated_at();

drop trigger if exists shop_orders_touch_updated_at on public.shop_orders;
create trigger shop_orders_touch_updated_at
before update on public.shop_orders
for each row execute function public.touch_shop_inventory_updated_at();

create or replace function public.get_shop_inventory_snapshot(p_product_id text)
returns table (
  product_id text,
  stripe_price_id text,
  amazon_sku text,
  amazon_asin text,
  on_hand bigint,
  reserved bigint,
  safety_buffer integer,
  available_to_sell bigint,
  max_checkout_quantity integer,
  backorders_enabled boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    product.id,
    product.stripe_price_id,
    product.amazon_sku,
    product.amazon_asin,
    coalesce(movement.on_hand, 0)::bigint,
    coalesce(reservation.reserved, 0)::bigint,
    product.safety_buffer,
    greatest(
      coalesce(movement.on_hand, 0) - coalesce(reservation.reserved, 0) - product.safety_buffer,
      0
    )::bigint,
    product.max_checkout_quantity,
    product.backorders_enabled
  from public.shop_inventory_products product
  left join lateral (
    select sum(quantity_delta)::bigint as on_hand
    from public.shop_inventory_movements
    where product_id = product.id
  ) movement on true
  left join lateral (
    select sum(quantity)::bigint as reserved
    from public.shop_inventory_reservations
    where product_id = product.id
      and status in ('pending_session', 'active')
      and expires_at > timezone('utc', now())
  ) reservation on true
  where product.id = p_product_id;
$$;

create or replace function public.configure_shop_inventory_product(
  p_product_id text,
  p_safety_buffer integer,
  p_max_checkout_quantity integer,
  p_stripe_price_id text default null,
  p_amazon_sku text default null,
  p_amazon_asin text default null
)
returns public.shop_inventory_products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  configured public.shop_inventory_products;
begin
  if p_safety_buffer < 0 or p_max_checkout_quantity < 1 then
    raise exception using errcode = '22023', message = 'SHOP_INVENTORY_INVALID_CONFIGURATION';
  end if;

  update public.shop_inventory_products
  set safety_buffer = p_safety_buffer,
      max_checkout_quantity = p_max_checkout_quantity,
      stripe_price_id = nullif(btrim(p_stripe_price_id), ''),
      amazon_sku = nullif(btrim(p_amazon_sku), ''),
      amazon_asin = nullif(btrim(p_amazon_asin), '')
  where id = p_product_id
  returning * into configured;

  if configured.id is null then
    raise exception using errcode = 'P0002', message = 'SHOP_INVENTORY_PRODUCT_NOT_FOUND';
  end if;
  return configured;
end;
$$;

create or replace function public.record_shop_inventory_adjustment(
  p_product_id text,
  p_quantity_delta integer,
  p_reason text,
  p_channel text default 'manual',
  p_external_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  product_record public.shop_inventory_products;
  existing_movement public.shop_inventory_movements;
  movement_id uuid;
  current_on_hand bigint;
  active_reserved bigint;
begin
  select * into product_record
  from public.shop_inventory_products
  where id = p_product_id
  for update;

  if product_record.id is null then
    raise exception using errcode = 'P0002', message = 'SHOP_INVENTORY_PRODUCT_NOT_FOUND';
  end if;
  if p_quantity_delta = 0
    or p_reason not in ('INITIAL_STOCK', 'AMAZON_SALE', 'RESTOCK', 'DAMAGE', 'RETURN', 'MANUAL_ADJUSTMENT')
    or p_channel not in ('amazon', 'manual')
  then
    raise exception using errcode = '22023', message = 'SHOP_INVENTORY_INVALID_ADJUSTMENT';
  end if;
  if p_reason in ('INITIAL_STOCK', 'RESTOCK', 'RETURN') and p_quantity_delta < 1 then
    raise exception using errcode = '22023', message = 'SHOP_INVENTORY_ADDITION_MUST_BE_POSITIVE';
  end if;
  if p_reason in ('AMAZON_SALE', 'DAMAGE') and p_quantity_delta > -1 then
    raise exception using errcode = '22023', message = 'SHOP_INVENTORY_REDUCTION_MUST_BE_NEGATIVE';
  end if;
  if p_reason = 'AMAZON_SALE' and p_channel <> 'amazon' then
    raise exception using errcode = '22023', message = 'SHOP_INVENTORY_AMAZON_CHANNEL_REQUIRED';
  end if;
  if p_reason <> 'AMAZON_SALE' and p_channel <> 'manual' then
    raise exception using errcode = '22023', message = 'SHOP_INVENTORY_MANUAL_CHANNEL_REQUIRED';
  end if;
  if p_reason = 'AMAZON_SALE' and nullif(btrim(p_external_reference), '') is null then
    raise exception using errcode = '22023', message = 'SHOP_INVENTORY_AMAZON_REFERENCE_REQUIRED';
  end if;

  if nullif(btrim(p_external_reference), '') is not null then
    select * into existing_movement
    from public.shop_inventory_movements
    where product_id = p_product_id
      and channel = p_channel
      and external_reference = btrim(p_external_reference)
    for update;

    if existing_movement.id is not null then
      if existing_movement.quantity_delta = p_quantity_delta
        and existing_movement.reason = p_reason
      then
        return existing_movement.id;
      end if;
      raise exception using errcode = '23505', message = 'SHOP_INVENTORY_REFERENCE_CONFLICT';
    end if;
  end if;

  update public.shop_inventory_reservations
  set status = 'expired',
      released_at = timezone('utc', now()),
      release_reason = 'reservation_ttl_elapsed'
  where product_id = p_product_id
    and status in ('pending_session', 'active')
    and expires_at <= timezone('utc', now());

  select coalesce(sum(quantity_delta), 0)::bigint into current_on_hand
  from public.shop_inventory_movements
  where product_id = p_product_id;

  select coalesce(sum(quantity), 0)::bigint into active_reserved
  from public.shop_inventory_reservations
  where product_id = p_product_id
    and status in ('pending_session', 'active')
    and expires_at > timezone('utc', now());

  if current_on_hand + p_quantity_delta < 0
    or current_on_hand + p_quantity_delta < active_reserved
  then
    raise exception using errcode = 'P0001', message = 'SHOP_INVENTORY_ADJUSTMENT_EXCEEDS_UNRESERVED_STOCK';
  end if;

  insert into public.shop_inventory_movements (
    product_id,
    quantity_delta,
    reason,
    channel,
    external_reference,
    notes,
    created_by
  ) values (
    p_product_id,
    p_quantity_delta,
    p_reason,
    p_channel,
    nullif(btrim(p_external_reference), ''),
    nullif(btrim(p_notes), ''),
    auth.uid()
  )
  returning id into movement_id;

  return movement_id;
end;
$$;

create or replace function public.reserve_shop_inventory(
  p_product_id text,
  p_quantity integer,
  p_checkout_attempt_id uuid,
  p_expires_at timestamptz
)
returns table (reservation_id uuid, reservation_expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  product_record public.shop_inventory_products;
  existing_reservation public.shop_inventory_reservations;
  current_on_hand bigint;
  active_reserved bigint;
  created_reservation_id uuid;
begin
  select * into product_record
  from public.shop_inventory_products
  where id = p_product_id
  for update;

  if product_record.id is null then
    raise exception using errcode = 'P0002', message = 'SHOP_INVENTORY_PRODUCT_NOT_FOUND';
  end if;
  if p_quantity < 1 or p_quantity > product_record.max_checkout_quantity then
    raise exception using errcode = '22023', message = 'SHOP_INVENTORY_INVALID_QUANTITY';
  end if;
  if p_expires_at <= timezone('utc', now())
    or p_expires_at > timezone('utc', now()) + interval '31 minutes'
  then
    raise exception using errcode = '22023', message = 'SHOP_INVENTORY_INVALID_EXPIRATION';
  end if;

  select * into existing_reservation
  from public.shop_inventory_reservations
  where checkout_attempt_id = p_checkout_attempt_id
  for update;

  if existing_reservation.id is not null
    and existing_reservation.product_id = p_product_id
    and existing_reservation.quantity = p_quantity
    and existing_reservation.status in ('pending_session', 'active')
    and existing_reservation.expires_at > timezone('utc', now())
  then
    return query select existing_reservation.id, existing_reservation.expires_at;
    return;
  end if;
  if existing_reservation.id is not null
    and existing_reservation.status = 'completed'
  then
    raise exception using errcode = 'P0001', message = 'SHOP_INVENTORY_CHECKOUT_ALREADY_COMPLETED';
  end if;

  update public.shop_inventory_reservations
  set status = 'expired',
      released_at = timezone('utc', now()),
      release_reason = 'reservation_ttl_elapsed'
  where product_id = p_product_id
    and status in ('pending_session', 'active')
    and expires_at <= timezone('utc', now());

  select coalesce(sum(quantity_delta), 0)::bigint into current_on_hand
  from public.shop_inventory_movements
  where product_id = p_product_id;

  select coalesce(sum(quantity), 0)::bigint into active_reserved
  from public.shop_inventory_reservations
  where product_id = p_product_id
    and status in ('pending_session', 'active')
    and expires_at > timezone('utc', now());

  if current_on_hand - active_reserved - product_record.safety_buffer < p_quantity then
    raise exception using errcode = 'P0001', message = 'SHOP_INVENTORY_UNAVAILABLE';
  end if;

  if existing_reservation.id is not null then
    update public.shop_inventory_reservations
    set product_id = p_product_id,
        quantity = p_quantity,
        status = 'pending_session',
        stripe_checkout_session_id = null,
        expires_at = p_expires_at,
        completed_at = null,
        released_at = null,
        release_reason = null
    where id = existing_reservation.id
    returning id into created_reservation_id;
  else
    insert into public.shop_inventory_reservations (
      product_id,
      quantity,
      checkout_attempt_id,
      expires_at
    ) values (
      p_product_id,
      p_quantity,
      p_checkout_attempt_id,
      p_expires_at
    )
    returning id into created_reservation_id;
  end if;

  return query select created_reservation_id, p_expires_at;
end;
$$;

create or replace function public.attach_shop_checkout_session(
  p_reservation_id uuid,
  p_stripe_checkout_session_id text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reservation_record public.shop_inventory_reservations;
begin
  select * into reservation_record
  from public.shop_inventory_reservations
  where id = p_reservation_id
  for update;

  if reservation_record.id is null then
    raise exception using errcode = 'P0002', message = 'SHOP_INVENTORY_RESERVATION_NOT_FOUND';
  end if;
  if reservation_record.status not in ('pending_session', 'active')
    or reservation_record.expires_at <= timezone('utc', now())
  then
    raise exception using errcode = 'P0001', message = 'SHOP_INVENTORY_RESERVATION_INACTIVE';
  end if;
  if p_stripe_checkout_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9_]+$' then
    raise exception using errcode = '22023', message = 'SHOP_INVENTORY_INVALID_SESSION';
  end if;
  if reservation_record.stripe_checkout_session_id is not null
    and reservation_record.stripe_checkout_session_id <> p_stripe_checkout_session_id
  then
    raise exception using errcode = 'P0001', message = 'SHOP_INVENTORY_SESSION_CONFLICT';
  end if;

  update public.shop_inventory_reservations
  set status = 'active',
      stripe_checkout_session_id = p_stripe_checkout_session_id,
      expires_at = least(reservation_record.expires_at, p_expires_at)
  where id = p_reservation_id;
  return true;
end;
$$;

create or replace function public.release_shop_inventory_reservation(
  p_reservation_id uuid default null,
  p_stripe_checkout_session_id text default null,
  p_release_reason text default 'released'
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reservation_record public.shop_inventory_reservations;
begin
  select * into reservation_record
  from public.shop_inventory_reservations
  where (p_reservation_id is not null and id = p_reservation_id)
     or (p_stripe_checkout_session_id is not null and stripe_checkout_session_id = p_stripe_checkout_session_id)
  order by created_at desc
  limit 1
  for update;

  if reservation_record.id is null then
    return false;
  end if;
  if reservation_record.status not in ('pending_session', 'active') then
    return false;
  end if;

  update public.shop_inventory_reservations
  set status = case when p_release_reason = 'checkout_session_expired' then 'expired' else 'released' end,
      released_at = timezone('utc', now()),
      release_reason = left(coalesce(nullif(btrim(p_release_reason), ''), 'released'), 100)
  where id = reservation_record.id;
  return true;
end;
$$;

create or replace function public.complete_shop_elevare_sale(
  p_reservation_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_amount_total integer,
  p_currency text,
  p_customer_email text default null,
  p_customer_name text default null,
  p_shipping_details jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  product_id_for_lock text;
  reservation_record public.shop_inventory_reservations;
  existing_order public.shop_orders;
  order_id uuid;
begin
  select product_id into product_id_for_lock
  from public.shop_inventory_reservations
  where id = p_reservation_id;

  if product_id_for_lock is null then
    raise exception using errcode = 'P0002', message = 'SHOP_INVENTORY_RESERVATION_NOT_FOUND';
  end if;

  perform 1 from public.shop_inventory_products where id = product_id_for_lock for update;

  select * into reservation_record
  from public.shop_inventory_reservations
  where id = p_reservation_id
  for update;

  select * into existing_order
  from public.shop_orders
  where stripe_checkout_session_id = p_stripe_checkout_session_id
  for update;

  if existing_order.id is not null then
    if existing_order.reservation_id = p_reservation_id
      and existing_order.stripe_payment_intent_id = p_stripe_payment_intent_id
    then
      return existing_order.id;
    end if;
    raise exception using errcode = '23505', message = 'SHOP_ORDER_SESSION_CONFLICT';
  end if;

  if reservation_record.product_id <> product_id_for_lock
    or reservation_record.stripe_checkout_session_id <> p_stripe_checkout_session_id
    or reservation_record.status not in ('pending_session', 'active')
  then
    raise exception using errcode = 'P0001', message = 'SHOP_INVENTORY_RESERVATION_NOT_PAYABLE';
  end if;
  if p_amount_total < 0 or lower(p_currency) !~ '^[a-z]{3}$' then
    raise exception using errcode = '22023', message = 'SHOP_ORDER_INVALID_PAYMENT';
  end if;

  insert into public.shop_inventory_movements (
    product_id,
    quantity_delta,
    reason,
    channel,
    external_reference,
    reservation_id,
    notes
  ) values (
    reservation_record.product_id,
    -reservation_record.quantity,
    'ELEVARE_SALE',
    'elevare',
    p_stripe_checkout_session_id,
    reservation_record.id,
    'Verified Stripe Checkout payment'
  );

  insert into public.shop_orders (
    reservation_id,
    product_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    quantity,
    amount_total,
    currency,
    customer_email,
    customer_name,
    shipping_details
  ) values (
    reservation_record.id,
    reservation_record.product_id,
    p_stripe_checkout_session_id,
    p_stripe_payment_intent_id,
    reservation_record.quantity,
    p_amount_total,
    lower(p_currency),
    nullif(btrim(p_customer_email), ''),
    nullif(btrim(p_customer_name), ''),
    p_shipping_details
  )
  returning id into order_id;

  update public.shop_inventory_reservations
  set status = 'completed',
      completed_at = timezone('utc', now()),
      released_at = null,
      release_reason = null
  where id = reservation_record.id;

  return order_id;
end;
$$;

revoke all on function public.touch_shop_inventory_updated_at() from public, anon, authenticated;
revoke all on function public.get_shop_inventory_snapshot(text) from public, anon, authenticated;
revoke all on function public.configure_shop_inventory_product(text, integer, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.record_shop_inventory_adjustment(text, integer, text, text, text, text) from public, anon, authenticated;
revoke all on function public.reserve_shop_inventory(text, integer, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.attach_shop_checkout_session(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.release_shop_inventory_reservation(uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_shop_elevare_sale(uuid, text, text, integer, text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.get_shop_inventory_snapshot(text) to service_role;
grant execute on function public.configure_shop_inventory_product(text, integer, integer, text, text, text) to service_role;
grant execute on function public.record_shop_inventory_adjustment(text, integer, text, text, text, text) to service_role;
grant execute on function public.reserve_shop_inventory(text, integer, uuid, timestamptz) to service_role;
grant execute on function public.attach_shop_checkout_session(uuid, text, timestamptz) to service_role;
grant execute on function public.release_shop_inventory_reservation(uuid, text, text) to service_role;
grant execute on function public.complete_shop_elevare_sale(uuid, text, text, integer, text, text, text, jsonb) to service_role;

insert into public.shop_inventory_products (
  id,
  elevare_slug,
  safety_buffer,
  max_checkout_quantity,
  backorders_enabled
) values (
  'show_day_kit',
  'show-day-kit',
  0,
  1,
  false
)
on conflict (id) do nothing;

commit;
