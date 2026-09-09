-- Send one transactional approval email for future professional approvals.
-- Existing approved profiles are intentionally not backfilled.

begin;

alter table public.trainer_profiles
  add column if not exists approved_at timestamptz,
  add column if not exists approval_email_sent_at timestamptz;

comment on column public.trainer_profiles.approved_at is
  'First time this professional entered the verified and live marketplace state.';
comment on column public.trainer_profiles.approval_email_sent_at is
  'Time the one-time professional approval email was confirmed by the email provider.';

create table if not exists public.professional_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz,
  locked_at timestamptz,
  locked_until timestamptz,
  lock_token uuid,
  provider_message_id text,
  sent_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint professional_email_outbox_event_type_check
    check (event_type in ('professional_approved')),
  constraint professional_email_outbox_status_check
    check (status in ('pending', 'processing', 'sent', 'failed')),
  constraint professional_email_outbox_attempts_check
    check (attempt_count >= 0 and max_attempts between 1 and 10 and attempt_count <= max_attempts),
  constraint professional_email_outbox_delivery_check
    check (
      (status = 'sent' and sent_at is not null and provider_message_id is not null)
      or status <> 'sent'
    )
);

create index if not exists professional_email_outbox_delivery_idx
  on public.professional_email_outbox (status, next_attempt_at, created_at);
create index if not exists professional_email_outbox_profile_idx
  on public.professional_email_outbox (trainer_profile_id, event_type);

alter table public.professional_email_outbox enable row level security;
revoke all on table public.professional_email_outbox from public, anon, authenticated;
grant select, insert, update, delete on table public.professional_email_outbox to service_role;

create or replace function public.marketplace_prepare_professional_approval()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  was_approved boolean;
  will_be_approved boolean;
  trusted_admin boolean;
begin
  trusted_admin := current_user in ('postgres', 'service_role', 'supabase_admin')
    or auth.role() = 'service_role';

  if tg_op = 'INSERT' then
    if not trusted_admin then
      new.approved_at := null;
      new.approval_email_sent_at := null;
    end if;
    return new;
  end if;

  if not trusted_admin and (
    new.approved_at is distinct from old.approved_at
    or new.approval_email_sent_at is distinct from old.approval_email_sent_at
  ) then
    raise exception 'Professional approval email fields can only be updated by Elevare review systems.';
  end if;

  was_approved := lower(coalesce(old.verification_status::text, '')) = 'verified'
    and coalesce(old.profile_live, false) = true;
  will_be_approved := lower(coalesce(new.verification_status::text, '')) = 'verified'
    and coalesce(new.profile_live, false) = true;

  if not was_approved and will_be_approved then
    new.approved_at := coalesce(new.approved_at, timezone('utc', now()));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prepare_professional_approval on public.trainer_profiles;
create trigger trg_prepare_professional_approval
before insert or update on public.trainer_profiles
for each row execute function public.marketplace_prepare_professional_approval();

create or replace function public.marketplace_enqueue_professional_approval_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  was_approved boolean;
  is_approved boolean;
begin
  was_approved := lower(coalesce(old.verification_status::text, '')) = 'verified'
    and coalesce(old.profile_live, false) = true;
  is_approved := lower(coalesce(new.verification_status::text, '')) = 'verified'
    and coalesce(new.profile_live, false) = true;

  if not was_approved and is_approved then
    insert into public.professional_email_outbox (
      event_key,
      event_type,
      trainer_profile_id
    )
    values (
      'professional_approved:' || new.id::text,
      'professional_approved',
      new.id
    )
    on conflict (event_key) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_professional_approval_email on public.trainer_profiles;
create trigger trg_enqueue_professional_approval_email
after update on public.trainer_profiles
for each row execute function public.marketplace_enqueue_professional_approval_email();

revoke all on function public.marketplace_prepare_professional_approval() from public, anon, authenticated;
revoke all on function public.marketplace_enqueue_professional_approval_email() from public, anon, authenticated;
grant execute on function public.marketplace_prepare_professional_approval() to service_role;
grant execute on function public.marketplace_enqueue_professional_approval_email() to service_role;

create or replace function public.marketplace_approve_professional_and_enqueue(
  p_professional_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  professional_row public.trainer_profiles%rowtype;
  was_approved boolean;
  outbox_row public.professional_email_outbox%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.';
  end if;

  select *
  into professional_row
  from public.trainer_profiles
  where id = p_professional_id
  for update;

  if not found then
    raise exception 'Professional profile not found.';
  end if;

  was_approved := lower(coalesce(professional_row.verification_status::text, '')) = 'verified'
    and coalesce(professional_row.profile_live, false) = true;

  if not was_approved then
    update public.trainer_profiles
    set
      verification_status = 'verified'::public.verification_status,
      profile_live = true
    where id = p_professional_id
    returning * into professional_row;
  end if;

  select *
  into outbox_row
  from public.professional_email_outbox
  where event_key = 'professional_approved:' || p_professional_id::text;

  return jsonb_build_object(
    'professional_id', professional_row.id,
    'approved', true,
    'transitioned', not was_approved,
    'approved_at', professional_row.approved_at,
    'approval_email_sent_at', professional_row.approval_email_sent_at,
    'email_event_id', outbox_row.id,
    'email_status', outbox_row.status,
    'email_attempt_count', coalesce(outbox_row.attempt_count, 0),
    'email_max_attempts', coalesce(outbox_row.max_attempts, 3)
  );
end;
$$;

create or replace function public.marketplace_claim_professional_approval_email(
  p_professional_id uuid,
  p_allow_failed_retry boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  event_row public.professional_email_outbox%rowtype;
  new_lock_token uuid;
  current_time timestamptz := timezone('utc', now());
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.';
  end if;

  select *
  into event_row
  from public.professional_email_outbox
  where event_key = 'professional_approved:' || p_professional_id::text
  for update;

  if not found then
    return jsonb_build_object('claimed', false, 'reason', 'not_queued');
  end if;

  if event_row.sent_at is not null or event_row.status = 'sent' then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'already_sent',
      'event_id', event_row.id,
      'provider_message_id', event_row.provider_message_id
    );
  end if;

  if event_row.attempt_count >= event_row.max_attempts then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'retry_exhausted',
      'event_id', event_row.id,
      'attempt_count', event_row.attempt_count,
      'max_attempts', event_row.max_attempts
    );
  end if;

  if event_row.status = 'processing'
    and event_row.locked_until is not null
    and event_row.locked_until > current_time
  then
    return jsonb_build_object('claimed', false, 'reason', 'already_processing', 'event_id', event_row.id);
  end if;

  if event_row.status = 'failed' and not p_allow_failed_retry then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'retry_required',
      'event_id', event_row.id,
      'attempt_count', event_row.attempt_count,
      'max_attempts', event_row.max_attempts
    );
  end if;

  new_lock_token := gen_random_uuid();

  update public.professional_email_outbox
  set
    status = 'processing',
    attempt_count = attempt_count + 1,
    locked_at = current_time,
    locked_until = current_time + interval '5 minutes',
    lock_token = new_lock_token,
    next_attempt_at = null,
    last_error_code = null,
    last_error_message = null,
    updated_at = current_time
  where id = event_row.id
  returning * into event_row;

  return jsonb_build_object(
    'claimed', true,
    'event_id', event_row.id,
    'event_key', event_row.event_key,
    'lock_token', event_row.lock_token,
    'attempt_count', event_row.attempt_count,
    'max_attempts', event_row.max_attempts
  );
end;
$$;

create or replace function public.marketplace_complete_professional_approval_email(
  p_event_id uuid,
  p_lock_token uuid,
  p_provider_message_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  event_row public.professional_email_outbox%rowtype;
  current_time timestamptz := timezone('utc', now());
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.';
  end if;

  if nullif(btrim(p_provider_message_id), '') is null then
    raise exception 'Provider message ID required.';
  end if;

  update public.professional_email_outbox
  set
    status = 'sent',
    provider_message_id = btrim(p_provider_message_id),
    sent_at = current_time,
    locked_at = null,
    locked_until = null,
    lock_token = null,
    next_attempt_at = null,
    last_error_code = null,
    last_error_message = null,
    updated_at = current_time
  where id = p_event_id
    and lock_token = p_lock_token
    and status = 'processing'
    and sent_at is null
  returning * into event_row;

  if not found then
    return jsonb_build_object('completed', false, 'reason', 'stale_or_completed');
  end if;

  update public.trainer_profiles
  set approval_email_sent_at = coalesce(approval_email_sent_at, current_time)
  where id = event_row.trainer_profile_id;

  return jsonb_build_object(
    'completed', true,
    'event_id', event_row.id,
    'professional_id', event_row.trainer_profile_id,
    'sent_at', event_row.sent_at,
    'provider_message_id', event_row.provider_message_id
  );
end;
$$;

create or replace function public.marketplace_fail_professional_approval_email(
  p_event_id uuid,
  p_lock_token uuid,
  p_error_code text,
  p_error_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  event_row public.professional_email_outbox%rowtype;
  current_time timestamptz := timezone('utc', now());
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.';
  end if;

  update public.professional_email_outbox
  set
    status = 'failed',
    next_attempt_at = case
      when attempt_count >= max_attempts then null
      when attempt_count = 1 then current_time + interval '5 minutes'
      else current_time + interval '30 minutes'
    end,
    locked_at = null,
    locked_until = null,
    lock_token = null,
    last_error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'delivery_failed'), 80),
    last_error_message = left(coalesce(nullif(btrim(p_error_message), ''), 'Transactional email delivery failed.'), 240),
    updated_at = current_time
  where id = p_event_id
    and lock_token = p_lock_token
    and status = 'processing'
    and sent_at is null
  returning * into event_row;

  if not found then
    return jsonb_build_object('failed', false, 'reason', 'stale_or_completed');
  end if;

  return jsonb_build_object(
    'failed', true,
    'event_id', event_row.id,
    'attempt_count', event_row.attempt_count,
    'max_attempts', event_row.max_attempts,
    'retry_available', event_row.attempt_count < event_row.max_attempts,
    'next_attempt_at', event_row.next_attempt_at
  );
end;
$$;

revoke all on function public.marketplace_approve_professional_and_enqueue(uuid) from public, anon, authenticated;
revoke all on function public.marketplace_claim_professional_approval_email(uuid, boolean) from public, anon, authenticated;
revoke all on function public.marketplace_complete_professional_approval_email(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.marketplace_fail_professional_approval_email(uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function public.marketplace_approve_professional_and_enqueue(uuid) to service_role;
grant execute on function public.marketplace_claim_professional_approval_email(uuid, boolean) to service_role;
grant execute on function public.marketplace_complete_professional_approval_email(uuid, uuid, text) to service_role;
grant execute on function public.marketplace_fail_professional_approval_email(uuid, uuid, text, text) to service_role;

commit;
