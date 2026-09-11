-- Add privacy-safe professional retention metrics and constrained request actions.
-- This migration is intentionally not applied automatically.

begin;

alter table public.trainer_profiles
  add column if not exists profile_information_confirmed_at timestamptz;

comment on column public.trainer_profiles.profile_information_confirmed_at is
  'Professional self-confirmation that public services, pricing, location, and availability are current; not an Elevare verification.';

alter table public.trainer_profile_inquiries
  add column if not exists first_opened_at timestamptz,
  add column if not exists first_responded_at timestamptz,
  add column if not exists contacted_at timestamptz,
  add column if not exists closed_at timestamptz;

alter table public.trainer_profile_inquiries
  drop constraint if exists trainer_profile_inquiries_status_check;

alter table public.trainer_profile_inquiries
  add constraint trainer_profile_inquiries_status_check
  check (status in ('new', 'viewed', 'accepted', 'declined', 'contacted', 'closed'));

update public.trainer_profile_inquiries
set
  first_opened_at = case
    when status <> 'new' then coalesce(first_opened_at, updated_at, created_at)
    else first_opened_at
  end,
  first_responded_at = case
    when status in ('accepted', 'declined', 'contacted', 'closed') then coalesce(first_responded_at, updated_at, created_at)
    else first_responded_at
  end,
  contacted_at = case
    when status = 'contacted' then coalesce(contacted_at, updated_at, created_at)
    else contacted_at
  end,
  closed_at = case
    when status = 'closed' then coalesce(closed_at, updated_at, created_at)
    else closed_at
  end
where
  (status <> 'new' and first_opened_at is null)
  or (
    status in ('accepted', 'declined', 'contacted', 'closed')
    and first_responded_at is null
  )
  or (status = 'contacted' and contacted_at is null)
  or (status = 'closed' and closed_at is null);

create index if not exists trainer_profile_inquiries_response_metrics_idx
  on public.trainer_profile_inquiries (trainer_profile_id, created_at desc, first_responded_at);

create table if not exists public.professional_profile_view_events (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete cascade,
  visitor_key_hash text not null,
  viewed_on date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default timezone('utc', now()),
  constraint professional_profile_view_events_hash_check
    check (visitor_key_hash ~ '^[a-f0-9]{64}$'),
  unique (trainer_profile_id, visitor_key_hash, viewed_on)
);

create index if not exists professional_profile_view_events_profile_date_idx
  on public.professional_profile_view_events (trainer_profile_id, viewed_on desc);

alter table public.professional_profile_view_events enable row level security;
revoke all on table public.professional_profile_view_events from public, anon, authenticated;
grant select, insert, delete on table public.professional_profile_view_events to service_role;

drop function if exists public.record_public_professional_profile_view(uuid);

create or replace function public.record_public_professional_profile_view(
  p_trainer_profile_id uuid,
  p_visitor_key_hash text
)
returns bigint
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  inserted_event_id uuid;
  current_count bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.';
  end if;

  if p_visitor_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid privacy-safe visitor key.';
  end if;

  if not exists (
    select 1
    from public.marketplace_public_trainer_profiles_v2 profile
    where profile.trainer_profile_id = p_trainer_profile_id
  ) then
    raise exception 'Public professional profile not found.';
  end if;

  insert into public.professional_profile_view_events (
    trainer_profile_id,
    visitor_key_hash,
    viewed_on
  )
  values (
    p_trainer_profile_id,
    p_visitor_key_hash,
    (timezone('utc', now()))::date
  )
  on conflict (trainer_profile_id, visitor_key_hash, viewed_on) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is not null then
    insert into public.professional_profile_view_counts (
      trainer_profile_id,
      view_count,
      first_viewed_at,
      last_viewed_at
    )
    values (
      p_trainer_profile_id,
      1,
      timezone('utc', now()),
      timezone('utc', now())
    )
    on conflict (trainer_profile_id) do update
    set
      view_count = public.professional_profile_view_counts.view_count + 1,
      last_viewed_at = timezone('utc', now()),
      updated_at = timezone('utc', now());
  end if;

  select coalesce(view_count, 0)
  into current_count
  from public.professional_profile_view_counts
  where trainer_profile_id = p_trainer_profile_id;

  return coalesce(current_count, 0);
end;
$$;

revoke all on function public.record_public_professional_profile_view(uuid, text) from public, anon, authenticated;
grant execute on function public.record_public_professional_profile_view(uuid, text) to service_role;

drop policy if exists trainer_profile_inquiries_update_trainer_own
  on public.trainer_profile_inquiries;
revoke update on public.trainer_profile_inquiries from authenticated;

create or replace function public.marketplace_transition_professional_inquiry(
  p_inquiry_id uuid,
  p_action text,
  p_expected_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  inquiry_row public.trainer_profile_inquiries%rowtype;
  next_status text;
  current_time timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  current_user_id := public.marketplace_current_user_id();
  if current_user_id is null then
    raise exception 'Marketplace user record not found.';
  end if;

  select inquiry.*
  into inquiry_row
  from public.trainer_profile_inquiries inquiry
  join public.trainer_profiles profile
    on profile.id = inquiry.trainer_profile_id
  where inquiry.id = p_inquiry_id
    and profile.user_id = current_user_id
  for update of inquiry;

  if not found then
    raise exception 'Consultation request not found.';
  end if;

  if inquiry_row.status is distinct from p_expected_status then
    raise exception 'This request changed in another session. Refresh and try again.';
  end if;

  next_status := case
    when p_action = 'open' and inquiry_row.status = 'new' then 'viewed'
    when p_action = 'accept' and inquiry_row.status in ('new', 'viewed') then 'accepted'
    when p_action = 'decline' and inquiry_row.status in ('new', 'viewed') then 'declined'
    when p_action = 'mark_contacted' and inquiry_row.status = 'accepted' then 'contacted'
    when p_action = 'close' and inquiry_row.status in ('accepted', 'contacted') then 'closed'
    else null
  end;

  if next_status is null then
    raise exception 'That request action is not available from the current status.';
  end if;

  update public.trainer_profile_inquiries
  set
    status = next_status,
    first_opened_at = case
      when p_action = 'open' then coalesce(first_opened_at, current_time)
      else first_opened_at
    end,
    first_responded_at = case
      when p_action in ('accept', 'decline') then coalesce(first_responded_at, current_time)
      else first_responded_at
    end,
    contacted_at = case
      when p_action = 'mark_contacted' then coalesce(contacted_at, current_time)
      else contacted_at
    end,
    closed_at = case
      when p_action = 'close' then coalesce(closed_at, current_time)
      else closed_at
    end
  where id = inquiry_row.id
  returning * into inquiry_row;

  return jsonb_build_object(
    'status', inquiry_row.status,
    'first_opened_at', inquiry_row.first_opened_at,
    'first_responded_at', inquiry_row.first_responded_at,
    'contacted_at', inquiry_row.contacted_at,
    'closed_at', inquiry_row.closed_at,
    'updated_at', inquiry_row.updated_at
  );
end;
$$;

revoke all on function public.marketplace_transition_professional_inquiry(uuid, text, text)
  from public, anon;
grant execute on function public.marketplace_transition_professional_inquiry(uuid, text, text)
  to authenticated;

create or replace function public.marketplace_update_professional_availability(
  p_status text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  profile_row public.trainer_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;
  if p_status not in ('accepting', 'waitlist', 'not_accepting') then
    raise exception 'Invalid availability status.';
  end if;

  current_user_id := public.marketplace_current_user_id();
  select *
  into profile_row
  from public.trainer_profiles
  where user_id = current_user_id
  for update;

  if not found then
    raise exception 'Professional profile not found.';
  end if;
  if p_expected_updated_at is null or profile_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'Your profile changed in another session. Refresh and try again.';
  end if;

  update public.trainer_profiles
  set
    client_acceptance_status = p_status,
    accepting_clients = p_status <> 'not_accepting'
  where id = profile_row.id
  returning * into profile_row;

  return jsonb_build_object(
    'status', profile_row.client_acceptance_status,
    'updated_at', profile_row.updated_at,
    'confirmed_at', profile_row.availability_confirmed_at
  );
end;
$$;

revoke all on function public.marketplace_update_professional_availability(text, timestamptz)
  from public, anon;
grant execute on function public.marketplace_update_professional_availability(text, timestamptz)
  to authenticated;

create or replace function public.marketplace_confirm_professional_profile(
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  profile_row public.trainer_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  current_user_id := public.marketplace_current_user_id();
  select *
  into profile_row
  from public.trainer_profiles
  where user_id = current_user_id
  for update;

  if not found then
    raise exception 'Professional profile not found.';
  end if;
  if p_expected_updated_at is null or profile_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'Your profile changed in another session. Refresh and try again.';
  end if;

  update public.trainer_profiles
  set profile_information_confirmed_at = timezone('utc', now())
  where id = profile_row.id
  returning * into profile_row;

  return jsonb_build_object(
    'updated_at', profile_row.updated_at,
    'confirmed_at', profile_row.profile_information_confirmed_at
  );
end;
$$;

revoke all on function public.marketplace_confirm_professional_profile(timestamptz)
  from public, anon;
grant execute on function public.marketplace_confirm_professional_profile(timestamptz)
  to authenticated;

create or replace function public.marketplace_get_professional_retention_summary(
  p_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  profile_row public.trainer_profiles%rowtype;
  selected_days integer;
  period_start timestamptz;
  response_sample_size integer;
  responded_count integer;
  median_response_minutes numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  selected_days := least(greatest(coalesce(p_days, 30), 1), 3650);
  period_start := timezone('utc', now()) - make_interval(days => selected_days);
  current_user_id := public.marketplace_current_user_id();

  select *
  into profile_row
  from public.trainer_profiles
  where user_id = current_user_id;

  if not found then
    raise exception 'Professional profile not found.';
  end if;

  select
    count(*)::integer,
    count(*) filter (where inquiry.first_responded_at is not null)::integer,
    percentile_cont(0.5) within group (
      order by extract(epoch from (inquiry.first_responded_at - inquiry.created_at)) / 60
    ) filter (where inquiry.first_responded_at is not null)
  into response_sample_size, responded_count, median_response_minutes
  from public.trainer_profile_inquiries inquiry
  where inquiry.trainer_profile_id = profile_row.id
    and inquiry.created_at >= timezone('utc', now()) - interval '90 days';

  return jsonb_build_object(
    'range_days', selected_days,
    'profile_status', lower(coalesce(profile_row.verification_status::text, 'draft')),
    'is_live', coalesce(profile_row.profile_live, false),
    'acceptance_status', coalesce(profile_row.client_acceptance_status, 'accepting'),
    'profile_updated_at', profile_row.updated_at,
    'profile_confirmed_at', profile_row.profile_information_confirmed_at,
    'availability_confirmed_at', profile_row.availability_confirmed_at,
    'views_in_range', (
      select count(*) from public.professional_profile_view_events event
      where event.trainer_profile_id = profile_row.id and event.created_at >= period_start
    ),
    'views_all_time', coalesce((
      select counts.view_count from public.professional_profile_view_counts counts
      where counts.trainer_profile_id = profile_row.id
    ), 0),
    'current_saves', (
      select count(*) from public.saved_trainer_profiles saved
      where saved.trainer_profile_id = profile_row.id
    ),
    'requests_in_range', (
      select count(*) from public.trainer_profile_inquiries inquiry
      where inquiry.trainer_profile_id = profile_row.id and inquiry.created_at >= period_start
    ),
    'requests_all_time', (
      select count(*) from public.trainer_profile_inquiries inquiry
      where inquiry.trainer_profile_id = profile_row.id
    ),
    'requests_awaiting_response', (
      select count(*) from public.trainer_profile_inquiries inquiry
      where inquiry.trainer_profile_id = profile_row.id and inquiry.status in ('new', 'viewed')
    ),
    'requests_new', (
      select count(*) from public.trainer_profile_inquiries inquiry
      where inquiry.trainer_profile_id = profile_row.id and inquiry.status = 'new'
    ),
    'response_lookback_days', 90,
    'response_sample_size', response_sample_size,
    'responded_count', responded_count,
    'response_rate_percent', case
      when response_sample_size >= 3 then round((responded_count::numeric / response_sample_size::numeric) * 100)
      else null
    end,
    'median_first_response_minutes', case
      when response_sample_size >= 3 then round(median_response_minutes)
      else null
    end
  );
end;
$$;

revoke all on function public.marketplace_get_professional_retention_summary(integer)
  from public, anon;
grant execute on function public.marketplace_get_professional_retention_summary(integer)
  to authenticated;

alter table public.professional_email_outbox
  add column if not exists inquiry_id uuid references public.trainer_profile_inquiries(id) on delete cascade;

alter table public.professional_email_outbox
  drop constraint if exists professional_email_outbox_event_type_check;
alter table public.professional_email_outbox
  add constraint professional_email_outbox_event_type_check
  check (event_type in ('professional_approved', 'new_consultation_request'));

create index if not exists professional_email_outbox_inquiry_idx
  on public.professional_email_outbox (inquiry_id, event_type);

create or replace function public.marketplace_enqueue_professional_inquiry_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.professional_email_outbox (
    event_key,
    event_type,
    trainer_profile_id,
    inquiry_id
  )
  values (
    'new_consultation_request:' || new.id::text,
    'new_consultation_request',
    new.trainer_profile_id,
    new.id
  )
  on conflict (event_key) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_enqueue_professional_inquiry_email on public.trainer_profile_inquiries;
create trigger trg_enqueue_professional_inquiry_email
after insert on public.trainer_profile_inquiries
for each row execute function public.marketplace_enqueue_professional_inquiry_email();

create or replace function public.marketplace_claim_professional_inquiry_email(
  p_inquiry_id uuid
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

  select * into event_row
  from public.professional_email_outbox
  where event_key = 'new_consultation_request:' || p_inquiry_id::text
  for update;

  if not found then return jsonb_build_object('claimed', false, 'reason', 'not_queued'); end if;
  if event_row.sent_at is not null or event_row.status = 'sent' then
    return jsonb_build_object('claimed', false, 'reason', 'already_sent');
  end if;
  if event_row.attempt_count >= event_row.max_attempts then
    return jsonb_build_object('claimed', false, 'reason', 'retry_exhausted');
  end if;
  if event_row.status = 'processing' and event_row.locked_until > current_time then
    return jsonb_build_object('claimed', false, 'reason', 'already_processing');
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
    'lock_token', event_row.lock_token,
    'attempt_count', event_row.attempt_count
  );
end;
$$;

create or replace function public.marketplace_complete_professional_inquiry_email(
  p_event_id uuid,
  p_lock_token uuid,
  p_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required.'; end if;
  if nullif(btrim(p_provider_message_id), '') is null then
    raise exception 'Provider message ID required.';
  end if;
  update public.professional_email_outbox
  set
    status = 'sent',
    provider_message_id = btrim(p_provider_message_id),
    sent_at = timezone('utc', now()),
    locked_at = null,
    locked_until = null,
    lock_token = null,
    updated_at = timezone('utc', now())
  where id = p_event_id and lock_token = p_lock_token and status = 'processing';
  return found;
end;
$$;

create or replace function public.marketplace_fail_professional_inquiry_email(
  p_event_id uuid,
  p_lock_token uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required.'; end if;
  update public.professional_email_outbox
  set
    status = 'failed',
    locked_at = null,
    locked_until = null,
    lock_token = null,
    last_error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'delivery_failed'), 120),
    last_error_message = 'Transactional email delivery failed.',
    next_attempt_at = null,
    updated_at = timezone('utc', now())
  where id = p_event_id and lock_token = p_lock_token and status = 'processing';
  return found;
end;
$$;

revoke all on function public.marketplace_enqueue_professional_inquiry_email() from public, anon, authenticated;
revoke all on function public.marketplace_claim_professional_inquiry_email(uuid) from public, anon, authenticated;
revoke all on function public.marketplace_complete_professional_inquiry_email(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.marketplace_fail_professional_inquiry_email(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.marketplace_enqueue_professional_inquiry_email() to service_role;
grant execute on function public.marketplace_claim_professional_inquiry_email(uuid) to service_role;
grant execute on function public.marketplace_complete_professional_inquiry_email(uuid, uuid, text) to service_role;
grant execute on function public.marketplace_fail_professional_inquiry_email(uuid, uuid, text) to service_role;

commit;
