-- StageLab Quick Analysis payment entitlements and short-lived structured results.
-- Target: Elevare-Prod (cnfqpfynjpwlzdtblzps).
-- Submitted photos are intentionally absent from this schema and must never be persisted.

begin;

create table if not exists public.quick_analyses (
  id uuid primary key default gen_random_uuid(),
  public_token_hash text unique,
  checkout_nonce_hash text,
  checkout_nonce_expires_at timestamptz,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  amount_paid integer not null default 0,
  currency text not null default 'usd',
  payment_status text not null default 'unpaid',
  analysis_status text not null default 'checkout_created',
  division text not null,
  competition_status text not null,
  weeks_out integer,
  optional_context text,
  age_attested_at timestamptz not null,
  ai_consent_at timestamptz not null,
  terms_version text not null,
  privacy_version text not null,
  model text,
  openai_request_id text,
  openai_input_tokens integer,
  openai_output_tokens integer,
  result_json jsonb,
  error_code text,
  retry_count integer not null default 0,
  processing_started_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  paid_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quick_analyses_public_token_hash_check
    check (public_token_hash is null or public_token_hash ~ '^[a-f0-9]{64}$'),
  constraint quick_analyses_checkout_nonce_hash_check
    check (checkout_nonce_hash is null or checkout_nonce_hash ~ '^[a-f0-9]{64}$'),
  constraint quick_analyses_amount_check check (amount_paid in (0, 99)),
  constraint quick_analyses_currency_check check (currency = 'usd'),
  constraint quick_analyses_payment_status_check
    check (payment_status in ('unpaid', 'paid', 'refunded', 'failed')),
  constraint quick_analyses_analysis_status_check
    check (analysis_status in ('checkout_created', 'paid', 'processing', 'failed_retryable', 'completed', 'expired')),
  constraint quick_analyses_competition_status_check
    check (competition_status in ('preparing', 'assessing')),
  constraint quick_analyses_weeks_out_check
    check (
      (competition_status = 'preparing' and weeks_out between 0 and 60)
      or (competition_status = 'assessing' and weeks_out is null)
    ),
  constraint quick_analyses_context_length_check
    check (optional_context is null or char_length(optional_context) <= 400),
  constraint quick_analyses_retry_count_check check (retry_count between 0 and 3),
  constraint quick_analyses_result_shape_check
    check (result_json is null or jsonb_typeof(result_json) = 'object')
);

comment on table public.quick_analyses is
  'One-time StageLab Quick Analysis payment entitlements and short-lived structured results. No submitted photo data is stored.';
comment on column public.quick_analyses.public_token_hash is
  'HMAC-SHA256 hash of the short-lived customer result token; the raw token is never stored.';
comment on column public.quick_analyses.checkout_nonce_hash is
  'HMAC-SHA256 hash of the short-lived pre-checkout browser nonce used to prevent success URL replay.';
comment on column public.quick_analyses.result_json is
  'Schema-validated text and numeric analysis output only. It must never contain submitted images, image URLs, thumbnails, EXIF, or base64 data.';

create index if not exists quick_analyses_expiration_idx
  on public.quick_analyses (expires_at)
  where expires_at is not null;
create index if not exists quick_analyses_status_idx
  on public.quick_analyses (payment_status, analysis_status, created_at desc);

alter table public.quick_analyses enable row level security;
revoke all on table public.quick_analyses from public, anon, authenticated;
grant select, insert, update, delete on table public.quick_analyses to service_role;

create table if not exists public.quick_analysis_rate_limits (
  identifier_hash text not null,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (identifier_hash, action, window_started_at),
  constraint quick_analysis_rate_limit_hash_check check (identifier_hash ~ '^[a-f0-9]{64}$'),
  constraint quick_analysis_rate_limit_count_check check (request_count > 0)
);

comment on table public.quick_analysis_rate_limits is
  'Server-only rate counters keyed by a one-way HMAC of the requester identifier.';

alter table public.quick_analysis_rate_limits enable row level security;
revoke all on table public.quick_analysis_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.quick_analysis_rate_limits to service_role;

create or replace function public.consume_quick_analysis_rate_limit(
  p_identifier_hash text,
  p_action text,
  p_window_started_at timestamptz,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count integer;
begin
  if p_identifier_hash !~ '^[a-f0-9]{64}$'
    or nullif(btrim(p_action), '') is null
    or p_limit < 1
  then
    return false;
  end if;

  insert into public.quick_analysis_rate_limits (
    identifier_hash,
    action,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_identifier_hash,
    p_action,
    p_window_started_at,
    1,
    timezone('utc', now())
  )
  on conflict (identifier_hash, action, window_started_at)
  do update set
    request_count = public.quick_analysis_rate_limits.request_count + 1,
    updated_at = timezone('utc', now())
  where public.quick_analysis_rate_limits.request_count < p_limit
  returning request_count into current_count;

  return current_count is not null and current_count <= p_limit;
end;
$$;

revoke all on function public.consume_quick_analysis_rate_limit(text, text, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.consume_quick_analysis_rate_limit(text, text, timestamptz, integer)
  to service_role;

create or replace function public.expire_quick_analysis_results()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expired_count integer;
begin
  with expired as (
    update public.quick_analyses
    set
      analysis_status = 'expired',
      result_json = null,
      optional_context = null,
      processing_started_at = null,
      updated_at = timezone('utc', now())
    where expires_at <= timezone('utc', now())
      and (analysis_status <> 'expired' or result_json is not null or optional_context is not null)
    returning 1
  )
  select count(*)::integer into expired_count from expired;

  delete from public.quick_analysis_rate_limits
  where window_started_at < timezone('utc', now()) - interval '2 days';

  update public.quick_analyses
  set checkout_nonce_hash = null,
      checkout_nonce_expires_at = null,
      updated_at = timezone('utc', now())
  where checkout_nonce_expires_at <= timezone('utc', now())
    and checkout_nonce_hash is not null;

  return expired_count;
end;
$$;

revoke all on function public.expire_quick_analysis_results() from public, anon, authenticated;
grant execute on function public.expire_quick_analysis_results() to service_role;

create or replace function public.touch_quick_analysis_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.touch_quick_analysis_updated_at() from public, anon, authenticated;
grant execute on function public.touch_quick_analysis_updated_at() to service_role;

drop trigger if exists quick_analyses_touch_updated_at on public.quick_analyses;
create trigger quick_analyses_touch_updated_at
before update on public.quick_analyses
for each row execute function public.touch_quick_analysis_updated_at();

commit;
