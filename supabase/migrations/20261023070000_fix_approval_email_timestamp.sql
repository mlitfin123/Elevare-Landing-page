-- CURRENT_TIME is a PostgreSQL keyword (time with time zone), not a safe
-- PL/pgSQL timestamp variable name. Replace only the three delivery RPCs.
-- Existing outbox rows and approval/credential states are preserved.
begin;

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
  v_event_time timestamptz := now();
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
    and event_row.locked_until > v_event_time
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
    locked_at = v_event_time,
    locked_until = v_event_time + interval '5 minutes',
    lock_token = new_lock_token,
    next_attempt_at = null,
    last_error_code = null,
    last_error_message = null,
    updated_at = v_event_time
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
  v_event_time timestamptz := now();
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
    sent_at = v_event_time,
    locked_at = null,
    locked_until = null,
    lock_token = null,
    next_attempt_at = null,
    last_error_code = null,
    last_error_message = null,
    updated_at = v_event_time
  where id = p_event_id
    and lock_token = p_lock_token
    and status = 'processing'
    and sent_at is null
  returning * into event_row;

  if not found then
    return jsonb_build_object('completed', false, 'reason', 'stale_or_completed');
  end if;

  update public.trainer_profiles
  set approval_email_sent_at = coalesce(approval_email_sent_at, v_event_time)
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
  v_event_time timestamptz := now();
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.';
  end if;

  update public.professional_email_outbox
  set
    status = 'failed',
    next_attempt_at = case
      when attempt_count >= max_attempts then null
      when attempt_count = 1 then v_event_time + interval '5 minutes'
      else v_event_time + interval '30 minutes'
    end,
    locked_at = null,
    locked_until = null,
    lock_token = null,
    last_error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'delivery_failed'), 80),
    last_error_message = left(coalesce(nullif(btrim(p_error_message), ''), 'Transactional email delivery failed.'), 240),
    updated_at = v_event_time
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

revoke all on function public.marketplace_claim_professional_approval_email(uuid, boolean) from public, anon, authenticated;
grant execute on function public.marketplace_claim_professional_approval_email(uuid, boolean) to service_role;
revoke all on function public.marketplace_complete_professional_approval_email(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.marketplace_complete_professional_approval_email(uuid, uuid, text) to service_role;
revoke all on function public.marketplace_fail_professional_approval_email(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.marketplace_fail_professional_approval_email(uuid, uuid, text, text) to service_role;

commit;
