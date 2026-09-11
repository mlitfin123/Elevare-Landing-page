-- Transactional matching emails and simple operator alerts. Existing disabled
-- notifications stay disabled; only subsequent events enter the delivery queue.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.marketplace_concierge_notification_outbox
  alter column case_id drop not null,
  alter column status set default 'queued',
  add column if not exists trainer_profile_id uuid references public.trainer_profiles(id) on delete cascade,
  add column if not exists verification_request_id uuid references public.trainer_verification_requests(id) on delete cascade,
  add column if not exists inquiry_id uuid references public.trainer_profile_inquiries(id) on delete cascade,
  add column if not exists follow_up_id uuid references public.marketplace_concierge_follow_ups(id) on delete cascade,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists first_attempt_at timestamptz,
  add column if not exists locked_until timestamptz,
  add column if not exists lock_token uuid,
  add column if not exists provider_message_id text,
  add column if not exists last_error_code text,
  add column if not exists delivery_email text,
  add column if not exists delivery_locale text;

create index if not exists marketplace_notification_delivery_due_idx
  on public.marketplace_concierge_notification_outbox (next_attempt_at, created_at)
  where status in ('queued', 'failed', 'processing') and attempt_count < 5;

create table if not exists public.marketplace_email_delivery_config (
  singleton boolean primary key default true check (singleton),
  started_at timestamptz not null default now()
);
insert into public.marketplace_email_delivery_config(singleton) values(true) on conflict do nothing;
alter table public.marketplace_email_delivery_config enable row level security;
revoke all on public.marketplace_email_delivery_config from public, anon, authenticated;
grant select on public.marketplace_email_delivery_config to service_role;

create table if not exists public.marketplace_notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  match_updates boolean not null default true,
  match_reminders boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.marketplace_notification_preferences enable row level security;
revoke all on public.marketplace_notification_preferences from public, anon, authenticated;
grant all on public.marketplace_notification_preferences to service_role;

create or replace function public.marketplace_my_notification_preferences(
  p_match_updates boolean default null, p_match_reminders boolean default null
) returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare owner_id uuid; result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select id into owner_id from public.users where auth_id = auth.uid()
    and is_active = true and deleted_at is null;
  if owner_id is null then raise exception 'Active account required.'; end if;
  if (p_match_updates is null) <> (p_match_reminders is null) then
    raise exception 'Provide both notification preferences.';
  end if;
  if p_match_updates is not null then
    insert into public.marketplace_notification_preferences(user_id, match_updates, match_reminders)
      values(owner_id, p_match_updates, p_match_reminders)
      on conflict (user_id) do update set match_updates = excluded.match_updates,
        match_reminders = excluded.match_reminders, updated_at = now();
  end if;
  select jsonb_build_object('match_updates', coalesce(p.match_updates, true),
    'match_reminders', coalesce(p.match_reminders, false)) into result
    from public.users u left join public.marketplace_notification_preferences p on p.user_id = u.id
    where u.id = owner_id;
  return result;
end;
$$;
revoke all on function public.marketplace_my_notification_preferences(boolean, boolean) from public, anon;
grant execute on function public.marketplace_my_notification_preferences(boolean, boolean) to authenticated;

create or replace function public.marketplace_enqueue_admin_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_table_name = 'marketplace_concierge_cases' then
    insert into public.marketplace_concierge_notification_outbox(case_id, event_type, recipient_role, idempotency_key)
      values(new.id, 'admin_match_requested', 'operator', 'admin:match:' || new.id)
      on conflict(idempotency_key) do nothing;
  elsif tg_table_name = 'trainer_profile_inquiries' then
    insert into public.marketplace_concierge_notification_outbox(inquiry_id, trainer_profile_id, event_type, recipient_role, idempotency_key)
      values(new.id, new.trainer_profile_id, 'admin_consultation_requested', 'operator', 'admin:inquiry:' || new.id)
      on conflict(idempotency_key) do nothing;
  elsif lower(coalesce(new.request_status::text, '')) = 'pending' then
    insert into public.marketplace_concierge_notification_outbox(verification_request_id, trainer_profile_id, event_type, recipient_role, idempotency_key)
      values(new.id, new.trainer_profile_id, 'admin_professional_submitted', 'operator', 'admin:professional-request:' || new.id)
      on conflict(idempotency_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger marketplace_email_admin_match after insert on public.marketplace_concierge_cases
  for each row execute function public.marketplace_enqueue_admin_notification();
create trigger marketplace_email_admin_inquiry after insert on public.trainer_profile_inquiries
  for each row execute function public.marketplace_enqueue_admin_notification();
create trigger marketplace_email_admin_professional after insert or update of request_status on public.trainer_verification_requests
  for each row execute function public.marketplace_enqueue_admin_notification();

-- Existing RPCs already enqueue receipts, invitations, shortlists, professional
-- responses and completed introductions. Add the remaining case transitions.
create or replace function public.marketplace_enqueue_case_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare event_name text;
begin
  if new.status is not distinct from old.status then return new; end if;
  event_name := case new.status when 'introduction_ready' then 'client_selection_received'
    when 'rematch_requested' then 'rematch_confirmation' when 'closed' then 'case_closed' else null end;
  if event_name is not null and new.client_user_id is not null then
    insert into public.marketplace_concierge_notification_outbox(case_id, event_type, recipient_user_id, recipient_role, locale, idempotency_key)
      values(new.id, event_name, new.client_user_id, 'client', new.preferred_locale,
        concat('case:', new.id, ':', event_name, ':', txid_current())) on conflict(idempotency_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger marketplace_email_case_transition after update of status on public.marketplace_concierge_cases
  for each row execute function public.marketplace_enqueue_case_notification();

-- Resolve authority and relevance from current records, never from safe_payload.
-- Only a trusted sender can obtain an address, and it must recheck before sending.
create or replace function public.marketplace_notification_recipient(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare e public.marketplace_concierge_notification_outbox%rowtype;
  c public.marketplace_concierge_cases%rowtype;
  r public.marketplace_concierge_recommendations%rowtype;
  u public.users%rowtype;
  prefs public.marketplace_notification_preferences%rowtype;
  ref text; relevant boolean := false;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required.'; end if;
  select * into e from public.marketplace_concierge_notification_outbox where id = p_id;
  if not found then return null; end if;
  if e.case_id is not null then
    select * into c from public.marketplace_concierge_cases where id = e.case_id;
    if not found or c.client_user_id is null or c.sharing_consent_at is null then return null; end if;
    if not exists(select 1 from public.users where id = c.client_user_id and is_active = true and deleted_at is null) then return null; end if;
    ref := c.public_case_code;
    if e.recommendation_id is not null then
      select * into r from public.marketplace_concierge_recommendations where id = e.recommendation_id and case_id = c.id;
      if not found then return null; end if;
    end if;
  end if;

  if e.recipient_role = 'operator' then
    if e.event_type = 'admin_match_requested' then relevant := c.status in ('submitted', 'reviewing');
    elsif e.event_type = 'admin_professional_submitted' then
      select exists(select 1 from public.trainer_verification_requests q
        join public.trainer_profiles p on p.id = q.trainer_profile_id
        join public.users owner_user on owner_user.id = p.user_id
        where q.id = e.verification_request_id and lower(q.request_status::text) = 'pending'
          and p.deleted_at is null and owner_user.deleted_at is null and owner_user.is_active = true) into relevant;
      ref := e.verification_request_id::text;
    elsif e.event_type = 'admin_consultation_requested' then
      select exists(select 1 from public.trainer_profile_inquiries i
        join public.trainer_profiles p on p.id = i.trainer_profile_id
        join public.users client_user on client_user.id = i.client_user_id
        join public.users owner_user on owner_user.id = p.user_id
        where i.id = e.inquiry_id and i.status::text not in ('closed', 'declined')
          and p.deleted_at is null and owner_user.deleted_at is null and owner_user.is_active = true
          and client_user.deleted_at is null and client_user.is_active = true) into relevant;
      ref := e.inquiry_id::text;
    elsif e.event_type = 'professional_response_received' then
      relevant := c.status <> 'closed' and r.status in ('interested', 'declined', 'clarification_requested');
    end if;
    if not coalesce(relevant, false) then return null; end if;
    return jsonb_build_object('role', 'operator', 'event_type', e.event_type, 'reference', ref, 'locale', 'en');
  end if;

  select * into u from public.users where id = e.recipient_user_id and is_active = true and deleted_at is null;
  if not found or nullif(btrim(u.email), '') is null then return null; end if;
  if not exists(select 1 from auth.users a where a.id = u.auth_id and a.email_confirmed_at is not null
      and lower(a.email) = lower(u.email)) then return null; end if;
  select * into prefs from public.marketplace_notification_preferences where user_id = u.id;
  if not coalesce(prefs.match_updates, true) then return null; end if;
  if e.event_type in ('professional_response_reminder', 'follow_up_request') and not coalesce(prefs.match_reminders, false) then return null; end if;

  if e.recipient_role = 'client' then
    if c.client_user_id is distinct from u.id then return null; end if;
    relevant := case e.event_type
      when 'client_request_received' then c.status <> 'closed'
      when 'client_shortlist_ready' then c.status = 'recommendations_ready' and exists(
        select 1 from public.marketplace_concierge_recommendations rec
        join public.marketplace_public_professionals_v3 p on p.professional_id = rec.trainer_profile_id
        where rec.case_id = c.id and rec.status = 'shortlisted')
      when 'client_selection_received' then c.status = 'introduction_ready'
      when 'rematch_confirmation' then c.status = 'rematch_requested'
      when 'case_closed' then c.status = 'closed'
      when 'introduction_completed' then exists(select 1 from public.marketplace_concierge_introductions i
        where i.recommendation_id = r.id and i.case_id = c.id and i.introduced_at is not null
          and i.client_authorized_at is not null and i.professional_authorized_at is not null)
        and c.status in ('introduced', 'follow_up_due', 'consultation_reported')
      when 'follow_up_request' then c.status in ('recommendations_ready', 'introduced', 'follow_up_due')
        and exists(select 1 from public.marketplace_concierge_follow_ups f
          where f.id = e.follow_up_id and f.case_id = c.id and f.status = 'pending' and f.due_at <= now())
      else false end;
  elsif e.recipient_role = 'professional' then
    if not exists(select 1 from public.trainer_profiles p where p.id = r.trainer_profile_id
      and p.user_id = u.id and p.deleted_at is null) then return null; end if;
    relevant := case e.event_type
      when 'professional_invited' then c.status <> 'closed' and r.status = 'awaiting_professional_response'
        and r.response_deadline_at > now()
      when 'professional_response_reminder' then c.status <> 'closed' and r.status = 'awaiting_professional_response'
        and r.response_deadline_at > now()
      when 'introduction_completed' then exists(select 1 from public.marketplace_concierge_introductions i
        where i.recommendation_id = r.id and i.case_id = c.id and i.introduced_at is not null
          and i.client_authorized_at is not null and i.professional_authorized_at is not null)
        and c.status in ('introduced', 'follow_up_due', 'consultation_reported')
      else false end;
    if e.event_type in ('professional_invited', 'professional_response_reminder') and not exists(
      select 1 from public.marketplace_public_professionals_v3 p
      join public.trainer_profiles t on t.id = p.professional_id
      where p.professional_id = r.trainer_profile_id and t.client_acceptance_status in ('accepting', 'waitlist')) then return null; end if;
  end if;
  if not coalesce(relevant, false) then return null; end if;
  return jsonb_build_object('role', e.recipient_role, 'event_type', e.event_type, 'reference', ref,
    'email', lower(btrim(u.email)), 'locale', public.marketplace_concierge_normalize_locale(coalesce(u.preferred_locale, e.locale)));
end;
$$;

create or replace function public.marketplace_claim_notification()
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare e public.marketplace_concierge_notification_outbox%rowtype; recipient jsonb; lease uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required.'; end if;
  for e in select * from public.marketplace_concierge_notification_outbox
    where status in ('queued', 'failed', 'processing') and attempt_count < 5 and next_attempt_at <= now()
      and (locked_until is null or locked_until <= now())
    order by next_attempt_at, created_at limit 20 for update skip locked
  loop
    recipient := public.marketplace_notification_recipient(e.id);
    if recipient is null or (e.first_attempt_at is not null and e.first_attempt_at < now() - interval '23 hours')
      or (e.delivery_email is not null and e.delivery_email is distinct from recipient->>'email') then
      update public.marketplace_concierge_notification_outbox set status = 'cancelled', lock_token = null,
        locked_until = null, delivery_email = null, last_error_code = 'obsolete_or_retry_window_expired' where id = e.id;
      continue;
    end if;
    lease := gen_random_uuid();
    update public.marketplace_concierge_notification_outbox set status = 'processing',
      attempt_count = attempt_count + 1, first_attempt_at = coalesce(first_attempt_at, now()),
      locked_until = now() + interval '5 minutes', lock_token = lease,
      delivery_email = recipient->>'email', delivery_locale = coalesce(delivery_locale, recipient->>'locale'),
      queued_at = coalesce(queued_at, created_at)
      where id = e.id;
    return jsonb_build_object('id', e.id, 'lock_token', lease, 'idempotency_key', 'marketplace-email:' || e.id);
  end loop;
  return null;
end;
$$;

create or replace function public.marketplace_notification_delivery_context(p_id uuid, p_lock_token uuid)
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare e public.marketplace_concierge_notification_outbox%rowtype; recipient jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required.'; end if;
  select * into e from public.marketplace_concierge_notification_outbox where id = p_id
    and lock_token = p_lock_token and status = 'processing' and locked_until > now();
  if not found then return null; end if;
  recipient := public.marketplace_notification_recipient(e.id);
  if recipient is null or e.delivery_email is distinct from recipient->>'email' then return null; end if;
  return recipient || jsonb_build_object('locale', e.delivery_locale);
end;
$$;

create or replace function public.marketplace_finish_notification(p_id uuid, p_lock_token uuid,
  p_result text, p_provider_message_id text default null, p_error_code text default null, p_retryable boolean default true)
returns boolean language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required.'; end if;
  if p_result not in ('sent', 'failed', 'cancelled') then raise exception 'Invalid delivery result.'; end if;
  if p_result = 'sent' and nullif(btrim(p_provider_message_id), '') is null then raise exception 'Provider message ID required.'; end if;
  if p_error_code is not null and p_error_code not in ('network', 'rate_limited', 'provider_rejected',
    'idempotency_conflict', 'recipient_unavailable', 'invalid_context') then raise exception 'Invalid delivery error.'; end if;
  update public.marketplace_concierge_notification_outbox set status = p_result,
    sent_at = case when p_result = 'sent' then now() else sent_at end,
    provider_message_id = case when p_result = 'sent' then left(p_provider_message_id, 200) else provider_message_id end,
    last_error_code = p_error_code, lock_token = null, locked_until = null,
    delivery_email = case when p_result in ('sent', 'cancelled') or not p_retryable or attempt_count >= 5
      then null else delivery_email end,
    attempt_count = case when p_result = 'failed' and not p_retryable then 5 else attempt_count end,
    next_attempt_at = now() + make_interval(secs => (60 * power(2, attempt_count))::integer)
    where id = p_id and lock_token = p_lock_token and status = 'processing';
  return found;
end;
$$;

create or replace function public.marketplace_prepare_notification_reminders()
returns integer language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare start_at timestamptz; inserted_count integer; second_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required.'; end if;
  select started_at into start_at from public.marketplace_email_delivery_config where singleton;
  update public.marketplace_concierge_notification_outbox set status = 'failed', lock_token = null,
    locked_until = null, delivery_email = null, last_error_code = 'network'
    where status = 'processing' and attempt_count >= 5 and locked_until <= now();
  -- One reminder before an unanswered invitation expires, only after 24 hours
  -- and only for professionals who explicitly enabled optional reminders.
  insert into public.marketplace_concierge_notification_outbox(case_id, recommendation_id, event_type,
    recipient_user_id, recipient_role, locale, idempotency_key)
  select r.case_id, r.id, 'professional_response_reminder', p.user_id, 'professional', c.preferred_locale,
    'recommendation:' || r.id || ':email-reminder'
  from public.marketplace_concierge_recommendations r join public.marketplace_concierge_cases c on c.id = r.case_id
    join public.trainer_profiles p on p.id = r.trainer_profile_id
    join public.marketplace_notification_preferences pref on pref.user_id = p.user_id and pref.match_updates and pref.match_reminders
  where r.created_at >= start_at and r.created_at < now() - interval '24 hours'
    and r.status = 'awaiting_professional_response' and r.response_deadline_at > now()
    and r.response_deadline_at <= now() + interval '24 hours' and c.status <> 'closed'
    and not exists(select 1 from public.marketplace_concierge_notification_outbox e
      where e.idempotency_key = 'recommendation:' || r.id || ':email-reminder')
  order by r.response_deadline_at limit 100 on conflict(idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  insert into public.marketplace_concierge_notification_outbox(case_id, recommendation_id, follow_up_id, event_type,
    recipient_user_id, recipient_role, locale, idempotency_key)
  select f.case_id, f.recommendation_id, f.id, 'follow_up_request', c.client_user_id, 'client', c.preferred_locale,
    'follow-up:' || f.id || ':email'
  from public.marketplace_concierge_follow_ups f join public.marketplace_concierge_cases c on c.id = f.case_id
    join public.marketplace_notification_preferences pref on pref.user_id = c.client_user_id and pref.match_updates and pref.match_reminders
  where f.created_at >= start_at and f.status = 'pending' and f.due_at <= now()
    and f.follow_up_kind in ('client_shortlist', 'post_introduction', 'consultation_outcome')
    and c.status in ('recommendations_ready', 'introduced', 'follow_up_due')
    and not exists(select 1 from public.marketplace_concierge_notification_outbox e
      where e.idempotency_key = 'follow-up:' || f.id || ':email')
  order by f.due_at limit 100 on conflict(idempotency_key) do nothing;
  get diagnostics second_count = row_count;
  return inserted_count + second_count;
end;
$$;

revoke all on function public.marketplace_enqueue_admin_notification() from public, anon, authenticated;
revoke all on function public.marketplace_enqueue_case_notification() from public, anon, authenticated;
revoke all on function public.marketplace_notification_recipient(uuid) from public, anon, authenticated;
revoke all on function public.marketplace_claim_notification() from public, anon, authenticated;
revoke all on function public.marketplace_notification_delivery_context(uuid, uuid) from public, anon, authenticated;
revoke all on function public.marketplace_finish_notification(uuid, uuid, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.marketplace_prepare_notification_reminders() from public, anon, authenticated;
grant execute on function public.marketplace_notification_recipient(uuid) to service_role;
grant execute on function public.marketplace_claim_notification() to service_role;
grant execute on function public.marketplace_notification_delivery_context(uuid, uuid) to service_role;
grant execute on function public.marketplace_finish_notification(uuid, uuid, text, text, text, boolean) to service_role;
grant execute on function public.marketplace_prepare_notification_reminders() to service_role;

commit;
