-- Additive trust-and-safety model for the Elevare professional marketplace.
-- The separate admin project remains the sole review/moderation interface.
-- This migration does not enable providers, schedulers, or email delivery.

begin;

create or replace function public.marketplace_is_trust_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.users as account
      where account.auth_id = auth.uid()
        and lower(coalesce(account.role::text, '')) in ('admin', 'super_admin')
    );
$$;

revoke all on function public.marketplace_is_trust_reviewer() from public, anon;
grant execute on function public.marketplace_is_trust_reviewer() to authenticated, service_role;

alter table public.certifications
  add column if not exists public_display boolean not null default true,
  add column if not exists review_feedback_public text,
  add column if not exists revoked_at timestamptz,
  add column if not exists last_rechecked_at timestamptz,
  add column if not exists material_revision integer not null default 1,
  add column if not exists evidence_version integer not null default 1;

comment on column public.certifications.public_display is
  'Professional-controlled preference. It never changes the administrative verification state.';
comment on column public.certifications.review_feedback_public is
  'Reviewer-authored feedback safe for the owning professional; never projected publicly.';
comment on column public.certifications.revoked_at is
  'Administrative revocation timestamp. Historical review remains in the trust audit log.';

create table if not exists public.professional_identity_checks (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete cascade,
  status text not null default 'not_submitted',
  provider text,
  provider_reference text,
  requested_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  reviewed_by uuid,
  review_feedback_public text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint professional_identity_checks_status_check check (
    status in ('not_submitted', 'pending', 'needs_information', 'verified', 'declined', 'expired', 'revoked', 'not_applicable')
  ),
  constraint professional_identity_checks_provider_check check (
    status <> 'verified' or (nullif(btrim(provider), '') is not null and completed_at is not null)
  )
);

create unique index if not exists professional_identity_checks_current_uidx
  on public.professional_identity_checks (trainer_profile_id);

create table if not exists public.professional_background_checks (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete cascade,
  status text not null default 'not_submitted',
  provider text,
  screening_product text,
  provider_candidate_reference text,
  provider_invitation_reference text,
  provider_report_reference text,
  consent_recorded_at timestamptz,
  requested_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint professional_background_checks_status_check check (
    status in ('not_submitted', 'invitation_required', 'pending', 'needs_information', 'passed', 'review_required', 'declined', 'failed', 'expired', 'revoked', 'not_applicable')
  ),
  constraint professional_background_checks_completed_check check (
    status <> 'passed'
    or (
      nullif(btrim(provider), '') is not null
      and nullif(btrim(screening_product), '') is not null
      and nullif(btrim(provider_report_reference), '') is not null
      and completed_at is not null
    )
  )
);

create unique index if not exists professional_background_checks_current_uidx
  on public.professional_background_checks (trainer_profile_id);

create table if not exists public.professional_insurance_submissions (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete cascade,
  insurer_name text not null,
  policy_type text not null,
  coverage_expiration_date date not null,
  evidence_storage_path text not null,
  public_display boolean not null default true,
  submission_status text not null default 'submitted',
  review_status text not null default 'pending',
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_feedback_public text,
  revoked_at timestamptz,
  material_revision integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint professional_insurance_submission_status_check check (
    submission_status in ('draft', 'submitted', 'withdrawn')
  ),
  constraint professional_insurance_review_status_check check (
    review_status in ('not_submitted', 'pending', 'needs_information', 'verified', 'declined', 'expired', 'revoked')
  ),
  constraint professional_insurance_strings_check check (
    char_length(btrim(insurer_name)) between 2 and 160
    and char_length(btrim(policy_type)) between 2 and 120
    and evidence_storage_path ~ '^[0-9a-f-]{36}/insurance/'
  )
);

create index if not exists professional_insurance_submissions_profile_idx
  on public.professional_insurance_submissions (trainer_profile_id, submitted_at desc);

create table if not exists public.professional_trust_audit_log (
  id bigint generated always as identity primary key,
  action_type text not null,
  target_entity_type text not null,
  target_entity_id uuid not null,
  trainer_profile_id uuid,
  previous_state jsonb,
  new_state jsonb,
  actor_auth_id uuid,
  reason_category text,
  private_note_reference text,
  source text not null default 'manual_review',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists professional_trust_audit_log_target_idx
  on public.professional_trust_audit_log (target_entity_type, target_entity_id, created_at desc);
create index if not exists professional_trust_audit_log_profile_idx
  on public.professional_trust_audit_log (trainer_profile_id, created_at desc);

create table if not exists public.professional_trust_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  professional_user_id uuid not null,
  event_type text not null,
  locale text not null default 'en',
  safe_payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  delivery_status text not null default 'queued',
  attempt_count integer not null default 0,
  available_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint professional_trust_notification_locale_check check (locale in ('en', 'es-419', 'pt-BR')),
  constraint professional_trust_notification_status_check check (
    delivery_status in ('queued', 'processing', 'sent', 'failed', 'cancelled')
  )
);

comment on table public.professional_trust_notification_outbox is
  'Transactional trust notices. No sender or scheduler is enabled by this migration.';

create table if not exists public.marketplace_trust_integrations (
  integration_key text primary key,
  is_enabled boolean not null default false,
  configuration_state text not null default 'not_configured',
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_trust_integrations_state_check check (
    configuration_state in ('not_configured', 'configured_disabled', 'configured_enabled')
  )
);

insert into public.marketplace_trust_integrations (integration_key, is_enabled, configuration_state)
values ('checkr', false, 'not_configured')
on conflict (integration_key) do nothing;

drop trigger if exists professional_identity_checks_set_updated_at on public.professional_identity_checks;
create trigger professional_identity_checks_set_updated_at
before update on public.professional_identity_checks
for each row execute function public.marketplace_set_updated_at();

drop trigger if exists professional_background_checks_set_updated_at on public.professional_background_checks;
create trigger professional_background_checks_set_updated_at
before update on public.professional_background_checks
for each row execute function public.marketplace_set_updated_at();

alter table public.professional_identity_checks enable row level security;
alter table public.professional_background_checks enable row level security;
alter table public.professional_insurance_submissions enable row level security;
alter table public.professional_trust_audit_log enable row level security;
alter table public.professional_trust_notification_outbox enable row level security;
alter table public.marketplace_trust_integrations enable row level security;

revoke all on table public.professional_identity_checks from public, anon, authenticated;
revoke all on table public.professional_background_checks from public, anon, authenticated;
revoke all on table public.professional_insurance_submissions from public, anon, authenticated;
revoke all on table public.professional_trust_audit_log from public, anon, authenticated;
revoke all on table public.professional_trust_notification_outbox from public, anon, authenticated;
revoke all on table public.marketplace_trust_integrations from public, anon, authenticated;

grant select, insert, update on public.professional_identity_checks to authenticated, service_role;
grant select, insert, update on public.professional_background_checks to authenticated, service_role;
grant select, insert, update on public.professional_insurance_submissions to authenticated, service_role;
grant insert, select on public.professional_trust_audit_log to service_role;
grant select on public.professional_trust_audit_log to authenticated;
grant select, insert, update on public.professional_trust_notification_outbox to service_role;
grant select, insert, update on public.marketplace_trust_integrations to service_role;

create policy professional_identity_checks_reviewer_all
on public.professional_identity_checks for all to authenticated
using (public.marketplace_is_trust_reviewer())
with check (public.marketplace_is_trust_reviewer());

create policy professional_background_checks_reviewer_all
on public.professional_background_checks for all to authenticated
using (public.marketplace_is_trust_reviewer())
with check (public.marketplace_is_trust_reviewer());

create policy professional_insurance_submissions_reviewer_all
on public.professional_insurance_submissions for all to authenticated
using (public.marketplace_is_trust_reviewer())
with check (public.marketplace_is_trust_reviewer());

create policy professional_insurance_submissions_select_own
on public.professional_insurance_submissions for select to authenticated
using (
  exists (
    select 1 from public.trainer_profiles as profile
    where profile.id = professional_insurance_submissions.trainer_profile_id
      and profile.user_id = public.marketplace_current_user_id()
  )
);

create policy professional_insurance_submissions_insert_own
on public.professional_insurance_submissions for insert to authenticated
with check (
  exists (
    select 1 from public.trainer_profiles as profile
    where profile.id = professional_insurance_submissions.trainer_profile_id
      and profile.user_id = public.marketplace_current_user_id()
  )
);

create policy professional_insurance_submissions_update_own
on public.professional_insurance_submissions for update to authenticated
using (
  exists (
    select 1 from public.trainer_profiles as profile
    where profile.id = professional_insurance_submissions.trainer_profile_id
      and profile.user_id = public.marketplace_current_user_id()
  )
)
with check (
  exists (
    select 1 from public.trainer_profiles as profile
    where profile.id = professional_insurance_submissions.trainer_profile_id
      and profile.user_id = public.marketplace_current_user_id()
  )
);

create policy professional_trust_audit_log_reviewer_select
on public.professional_trust_audit_log for select to authenticated
using (public.marketplace_is_trust_reviewer());

create or replace function public.marketplace_guard_insurance_review_fields()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  material_changed boolean := false;
begin
  if public.marketplace_is_trust_reviewer() then
    new.updated_at := timezone('utc', now());
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.review_status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.review_feedback_public := null;
    new.revoked_at := null;
    new.material_revision := 1;
    new.updated_at := timezone('utc', now());
    return new;
  end if;

  if new.review_status is distinct from old.review_status
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewed_by is distinct from old.reviewed_by
    or new.review_feedback_public is distinct from old.review_feedback_public
    or new.revoked_at is distinct from old.revoked_at
    or new.material_revision is distinct from old.material_revision
  then
    raise exception 'Insurance review fields can only be updated by Elevare review systems.';
  end if;

  material_changed :=
    new.insurer_name is distinct from old.insurer_name
    or new.policy_type is distinct from old.policy_type
    or new.coverage_expiration_date is distinct from old.coverage_expiration_date
    or new.evidence_storage_path is distinct from old.evidence_storage_path;

  if material_changed then
    new.review_status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.review_feedback_public := null;
    new.revoked_at := null;
    new.material_revision := old.material_revision + 1;
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_guard_professional_insurance_review_fields on public.professional_insurance_submissions;
create trigger trg_guard_professional_insurance_review_fields
before insert or update on public.professional_insurance_submissions
for each row execute function public.marketplace_guard_insurance_review_fields();

create or replace function public.marketplace_guard_credential_verification_fields()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  material_changed boolean := false;
begin
  if public.marketplace_is_trust_reviewer() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Credential records are retained for verification history. Hide the credential instead.';
  end if;

  if tg_op = 'INSERT' then
    new.verification_status := 'pending'::public.verification_status;
    new.verified_at := null;
    new.verified_by := null;
    new.review_feedback_public := null;
    new.revoked_at := null;
    new.last_rechecked_at := null;
    new.material_revision := 1;
    new.evidence_version := 1;
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status
    or new.verified_at is distinct from old.verified_at
    or new.verified_by is distinct from old.verified_by
    or new.review_feedback_public is distinct from old.review_feedback_public
    or new.revoked_at is distinct from old.revoked_at
    or new.last_rechecked_at is distinct from old.last_rechecked_at
    or new.material_revision is distinct from old.material_revision
    or new.evidence_version is distinct from old.evidence_version
  then
    raise exception 'Credential verification fields can only be updated by Elevare review systems.';
  end if;

  material_changed :=
    new.cert_name is distinct from old.cert_name
    or new.issuing_body is distinct from old.issuing_body
    or new.cert_org is distinct from old.cert_org
    or new.cert_id is distinct from old.cert_id
    or new.credential_number is distinct from old.credential_number
    or new.credential_type is distinct from old.credential_type
    or new.issue_date is distinct from old.issue_date
    or new.expiration_date is distinct from old.expiration_date
    or new.expiry_date is distinct from old.expiry_date
    or new.document_url is distinct from old.document_url
    or new.supporting_reference_url is distinct from old.supporting_reference_url
    or new.credential_country_code is distinct from old.credential_country_code
    or new.credential_jurisdiction is distinct from old.credential_jurisdiction;

  if material_changed then
    new.verification_status := 'pending'::public.verification_status;
    new.verified_at := null;
    new.verified_by := null;
    new.review_feedback_public := null;
    new.revoked_at := null;
    new.last_rechecked_at := null;
    new.material_revision := old.material_revision + 1;
    if new.document_url is distinct from old.document_url then
      new.evidence_version := old.evidence_version + 1;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_credential_verification_fields on public.certifications;
create trigger trg_guard_credential_verification_fields
before insert or update or delete on public.certifications
for each row execute function public.marketplace_guard_credential_verification_fields();

create or replace function public.marketplace_write_trust_audit()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  old_payload jsonb;
  new_payload jsonb;
  target_id uuid;
  profile_id uuid;
  source_label text;
begin
  old_payload := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_payload := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  target_id := coalesce(new_payload ->> 'id', old_payload ->> 'id')::uuid;
  profile_id := coalesce(
    nullif(new_payload ->> 'trainer_profile_id', ''),
    nullif(old_payload ->> 'trainer_profile_id', ''),
    nullif(new_payload ->> 'trainer_id', ''),
    nullif(old_payload ->> 'trainer_id', ''),
    case when tg_table_name = 'trainer_profiles' then target_id::text else null end
  )::uuid;
  source_label := coalesce(nullif(current_setting('elevare.trust_source', true), ''),
    case when auth.uid() is null then 'system' else 'manual_review' end);

  if tg_table_name = 'certifications' then
    old_payload := case when old_payload is null then null else jsonb_build_object(
      'verification_status', old_payload ->> 'verification_status',
      'verified_at', old_payload ->> 'verified_at',
      'expiration_date', coalesce(old_payload ->> 'expiration_date', old_payload ->> 'expiry_date'),
      'revoked_at', old_payload ->> 'revoked_at',
      'material_revision', old_payload ->> 'material_revision'
    ) end;
    new_payload := case when new_payload is null then null else jsonb_build_object(
      'verification_status', new_payload ->> 'verification_status',
      'verified_at', new_payload ->> 'verified_at',
      'expiration_date', coalesce(new_payload ->> 'expiration_date', new_payload ->> 'expiry_date'),
      'revoked_at', new_payload ->> 'revoked_at',
      'material_revision', new_payload ->> 'material_revision'
    ) end;
  elsif tg_table_name = 'professional_identity_checks' then
    old_payload := case when old_payload is null then null else jsonb_build_object('status', old_payload ->> 'status', 'completed_at', old_payload ->> 'completed_at', 'expires_at', old_payload ->> 'expires_at', 'revoked_at', old_payload ->> 'revoked_at') end;
    new_payload := case when new_payload is null then null else jsonb_build_object('status', new_payload ->> 'status', 'completed_at', new_payload ->> 'completed_at', 'expires_at', new_payload ->> 'expires_at', 'revoked_at', new_payload ->> 'revoked_at') end;
  elsif tg_table_name = 'professional_background_checks' then
    old_payload := case when old_payload is null then null else jsonb_build_object('status', old_payload ->> 'status', 'screening_product', old_payload ->> 'screening_product', 'completed_at', old_payload ->> 'completed_at', 'expires_at', old_payload ->> 'expires_at', 'revoked_at', old_payload ->> 'revoked_at') end;
    new_payload := case when new_payload is null then null else jsonb_build_object('status', new_payload ->> 'status', 'screening_product', new_payload ->> 'screening_product', 'completed_at', new_payload ->> 'completed_at', 'expires_at', new_payload ->> 'expires_at', 'revoked_at', new_payload ->> 'revoked_at') end;
  elsif tg_table_name = 'professional_insurance_submissions' then
    old_payload := case when old_payload is null then null else jsonb_build_object('review_status', old_payload ->> 'review_status', 'coverage_expiration_date', old_payload ->> 'coverage_expiration_date', 'reviewed_at', old_payload ->> 'reviewed_at', 'revoked_at', old_payload ->> 'revoked_at', 'material_revision', old_payload ->> 'material_revision') end;
    new_payload := case when new_payload is null then null else jsonb_build_object('review_status', new_payload ->> 'review_status', 'coverage_expiration_date', new_payload ->> 'coverage_expiration_date', 'reviewed_at', new_payload ->> 'reviewed_at', 'revoked_at', new_payload ->> 'revoked_at', 'material_revision', new_payload ->> 'material_revision') end;
  else
    old_payload := case when old_payload is null then null else jsonb_build_object('verification_status', old_payload ->> 'verification_status', 'profile_live', old_payload ->> 'profile_live', 'suspended_until', old_payload ->> 'reliability_suspended_until', 'client_acceptance_status', old_payload ->> 'client_acceptance_status') end;
    new_payload := case when new_payload is null then null else jsonb_build_object('verification_status', new_payload ->> 'verification_status', 'profile_live', new_payload ->> 'profile_live', 'suspended_until', new_payload ->> 'reliability_suspended_until', 'client_acceptance_status', new_payload ->> 'client_acceptance_status') end;
  end if;

  if old_payload is distinct from new_payload then
    insert into public.professional_trust_audit_log (
      action_type, target_entity_type, target_entity_id, trainer_profile_id,
      previous_state, new_state, actor_auth_id, reason_category, source
    ) values (
      lower(tg_op), tg_table_name, target_id, profile_id,
      old_payload, new_payload, auth.uid(),
      nullif(current_setting('elevare.trust_reason_category', true), ''), source_label
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists certifications_trust_audit on public.certifications;
create trigger certifications_trust_audit
after insert or update or delete on public.certifications
for each row execute function public.marketplace_write_trust_audit();

drop trigger if exists professional_identity_checks_trust_audit on public.professional_identity_checks;
create trigger professional_identity_checks_trust_audit
after insert or update or delete on public.professional_identity_checks
for each row execute function public.marketplace_write_trust_audit();

drop trigger if exists professional_background_checks_trust_audit on public.professional_background_checks;
create trigger professional_background_checks_trust_audit
after insert or update or delete on public.professional_background_checks
for each row execute function public.marketplace_write_trust_audit();

drop trigger if exists professional_insurance_submissions_trust_audit on public.professional_insurance_submissions;
create trigger professional_insurance_submissions_trust_audit
after insert or update or delete on public.professional_insurance_submissions
for each row execute function public.marketplace_write_trust_audit();

drop trigger if exists trainer_profiles_trust_audit on public.trainer_profiles;
create trigger trainer_profiles_trust_audit
after insert or update or delete on public.trainer_profiles
for each row execute function public.marketplace_write_trust_audit();

create or replace function public.marketplace_queue_trust_notification()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  profile_user_id uuid;
  target_profile_id uuid;
  normalized_locale text := 'en';
  event_name text;
  event_revision text;
begin
  if tg_table_name = 'certifications' then
    if tg_op <> 'INSERT' and new.verification_status is not distinct from old.verification_status then return new; end if;
    event_name := case lower(coalesce(new.verification_status::text, ''))
      when 'pending' then 'credential_submission_received'
      when 'verified' then 'credential_verified'
      when 'rejected' then 'credential_not_verified'
      else null
    end;
    event_revision := new.material_revision::text;
    target_profile_id := coalesce(new.trainer_profile_id, new.trainer_id);
  elsif tg_table_name = 'professional_insurance_submissions' then
    if tg_op <> 'INSERT' and new.review_status is not distinct from old.review_status then return new; end if;
    event_name := case new.review_status
      when 'pending' then 'insurance_submission_received'
      when 'needs_information' then 'insurance_more_information_requested'
      when 'verified' then 'insurance_verified'
      when 'declined' then 'insurance_not_verified'
      else null
    end;
    event_revision := new.material_revision::text;
    target_profile_id := new.trainer_profile_id;
  else
    return new;
  end if;

  if event_name is null then return new; end if;
  select profile.user_id into profile_user_id
  from public.trainer_profiles as profile where profile.id = target_profile_id;
  if profile_user_id is null then return new; end if;

  select case
    when account.preferred_locale = 'pt-BR' then 'pt-BR'
    when account.preferred_locale = 'es-419' or account.preferred_locale like 'es-%' then 'es-419'
    else 'en'
  end into normalized_locale
  from public.users as account where account.id = profile_user_id;

  insert into public.professional_trust_notification_outbox (
    professional_user_id, event_type, locale, safe_payload, idempotency_key
  ) values (
    profile_user_id,
    event_name,
    coalesce(normalized_locale, 'en'),
    jsonb_build_object('entity_type', tg_table_name, 'entity_id', new.id),
    concat(tg_table_name, ':', new.id, ':', event_revision, ':', event_name)
  ) on conflict (idempotency_key) do nothing;

  return new;
end;
$$;

drop trigger if exists certifications_trust_notification on public.certifications;
create trigger certifications_trust_notification
after insert or update on public.certifications
for each row execute function public.marketplace_queue_trust_notification();

drop trigger if exists professional_insurance_trust_notification on public.professional_insurance_submissions;
create trigger professional_insurance_trust_notification
after insert or update on public.professional_insurance_submissions
for each row execute function public.marketplace_queue_trust_notification();

-- Service-role-only view used by the static marketplace generator. It contains
-- no document paths, credential numbers, provider references, or review notes.
create or replace view public.marketplace_public_professional_trust_v1
with (security_invoker = true)
as
select
  profile.trainer_profile_id,
  true as profile_reviewed,
  trainer.approved_at as profile_reviewed_at,
  (auth_account.email_confirmed_at is not null) as email_verified,
  false as phone_verified,
  (
    identity_check.status = 'verified'
    and identity_check.completed_at is not null
    and identity_check.revoked_at is null
    and (identity_check.expires_at is null or identity_check.expires_at >= timezone('utc', now()))
  ) as identity_verified,
  identity_check.completed_at as identity_verified_at,
  coalesce(verified_credentials.items, '[]'::jsonb) as verified_credentials,
  coalesce(claimed_credentials.items, '[]'::jsonb) as claimed_credentials,
  (
    background_check.status = 'passed'
    and background_check.completed_at is not null
    and background_check.revoked_at is null
    and (background_check.expires_at is null or background_check.expires_at >= timezone('utc', now()))
  ) as background_check_completed,
  background_check.completed_at as background_check_completed_at,
  case when background_check.status = 'passed' then background_check.screening_product else null end as background_check_product,
  (
    insurance.review_status = 'verified'
    and insurance.reviewed_at is not null
    and insurance.revoked_at is null
    and insurance.coverage_expiration_date >= current_date
  ) as insurance_confirmed,
  insurance.coverage_expiration_date as insurance_confirmed_through,
  trainer.profile_information_confirmed_at as profile_information_confirmed_at,
  true as account_in_good_standing,
  coalesce(trainer.client_acceptance_status, 'accepting') as client_acceptance_status
from public.marketplace_public_trainer_profiles_v2 as profile
join public.trainer_profiles as trainer on trainer.id = profile.trainer_profile_id
join public.users as account on account.id = trainer.user_id
left join auth.users as auth_account on auth_account.id = account.auth_id
left join lateral (
  select checks.* from public.professional_identity_checks as checks
  where checks.trainer_profile_id = trainer.id order by checks.updated_at desc limit 1
) as identity_check on true
left join lateral (
  select checks.* from public.professional_background_checks as checks
  where checks.trainer_profile_id = trainer.id order by checks.updated_at desc limit 1
) as background_check on true
left join lateral (
  select submissions.* from public.professional_insurance_submissions as submissions
  where submissions.trainer_profile_id = trainer.id
    and submissions.public_display = true
    and submissions.submission_status = 'submitted'
  order by submissions.submitted_at desc limit 1
) as insurance on true
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'id', credential.id,
    'name', credential.cert_name,
    'type', credential.credential_type,
    'issuer', coalesce(nullif(credential.issuing_body, ''), nullif(credential.cert_org, '')),
    'country_code', credential.credential_country_code,
    'jurisdiction', credential.credential_jurisdiction,
    'verified_at', credential.verified_at,
    'expiration_date', coalesce(credential.expiration_date, credential.expiry_date)
  ) order by credential.verified_at desc) as items
  from public.certifications as credential
  where coalesce(credential.trainer_profile_id, credential.trainer_id) = trainer.id
    and coalesce(credential.is_active, true) = true
    and credential.public_display = true
    and lower(coalesce(credential.verification_status::text, '')) = 'verified'
    and credential.verified_at is not null
    and credential.revoked_at is null
    and (coalesce(credential.expiration_date, credential.expiry_date) is null
      or coalesce(credential.expiration_date, credential.expiry_date) >= current_date)
) as verified_credentials on true
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'id', credential.id,
    'name', credential.cert_name,
    'type', credential.credential_type,
    'issuer', coalesce(nullif(credential.issuing_body, ''), nullif(credential.cert_org, '')),
    'country_code', credential.credential_country_code,
    'jurisdiction', credential.credential_jurisdiction,
    'expiration_date', coalesce(credential.expiration_date, credential.expiry_date),
    'public_status', case
      when coalesce(credential.expiration_date, credential.expiry_date) < current_date then 'expired'
      else 'claimed'
    end
  ) order by credential.created_at desc) as items
  from public.certifications as credential
  where coalesce(credential.trainer_profile_id, credential.trainer_id) = trainer.id
    and coalesce(credential.is_active, true) = true
    and credential.public_display = true
    and not (
      lower(coalesce(credential.verification_status::text, '')) = 'verified'
      and credential.verified_at is not null
      and credential.revoked_at is null
      and (coalesce(credential.expiration_date, credential.expiry_date) is null
        or coalesce(credential.expiration_date, credential.expiry_date) >= current_date)
    )
) as claimed_credentials on true;

revoke all on public.marketplace_public_professional_trust_v1 from public, anon, authenticated;
grant select on public.marketplace_public_professional_trust_v1 to service_role;

create or replace function public.marketplace_get_current_professional_trust_summary()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  profile_row public.trainer_profiles%rowtype;
  identity_row public.professional_identity_checks%rowtype;
  background_row public.professional_background_checks%rowtype;
  insurance_row public.professional_insurance_submissions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  current_user_id := public.marketplace_current_user_id();
  select * into profile_row from public.trainer_profiles where user_id = current_user_id limit 1;
  if not found then raise exception 'Professional profile not found.'; end if;

  select * into identity_row from public.professional_identity_checks
  where trainer_profile_id = profile_row.id order by updated_at desc limit 1;
  select * into background_row from public.professional_background_checks
  where trainer_profile_id = profile_row.id order by updated_at desc limit 1;
  select * into insurance_row from public.professional_insurance_submissions
  where trainer_profile_id = profile_row.id order by submitted_at desc limit 1;

  return jsonb_build_object(
    'trainer_profile_id', profile_row.id,
    'email_verified', exists (
      select 1 from auth.users as auth_account
      where auth_account.id = auth.uid()
        and auth_account.email_confirmed_at is not null
    ),
    'phone_verification_supported', false,
    'profile_review_status', lower(coalesce(profile_row.verification_status::text, 'draft')),
    'profile_reviewed_at', profile_row.approved_at,
    'profile_live', coalesce(profile_row.profile_live, false),
    'profile_information_confirmed_at', profile_row.profile_information_confirmed_at,
    'account_standing', case
      when profile_row.reliability_suspended_until is not null and profile_row.reliability_suspended_until > timezone('utc', now()) then 'suspended'
      when coalesce(profile_row.profile_live, false) then 'active'
      else 'not_public'
    end,
    'accepting_clients', coalesce(profile_row.client_acceptance_status, 'accepting'),
    'identity_status', coalesce(identity_row.status, 'not_submitted'),
    'background_check_status', coalesce(background_row.status, 'not_submitted'),
    'background_check_product', background_row.screening_product,
    'insurance_status', case
      when insurance_row.review_status = 'verified' and insurance_row.coverage_expiration_date < current_date then 'expired'
      else coalesce(insurance_row.review_status, 'not_submitted')
    end,
    'insurance_expiration_date', insurance_row.coverage_expiration_date,
    'credential_statuses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', credential.id,
        'name', credential.cert_name,
        'status', case
          when credential.revoked_at is not null then 'revoked'
          when coalesce(credential.expiration_date, credential.expiry_date) < current_date then 'expired'
          else lower(coalesce(credential.verification_status::text, 'not_submitted'))
        end,
        'expiration_date', coalesce(credential.expiration_date, credential.expiry_date),
        'feedback', credential.review_feedback_public
      ) order by credential.created_at desc)
      from public.certifications as credential
      where coalesce(credential.trainer_profile_id, credential.trainer_id) = profile_row.id
        and coalesce(credential.is_active, true) = true
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.marketplace_get_current_professional_trust_summary() from public, anon;
grant execute on function public.marketplace_get_current_professional_trust_summary() to authenticated;

create or replace function public.submit_professional_profile_report(
  target_profile_id uuid,
  report_reason text,
  report_details text default null,
  source_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  reporter_user_id uuid;
  target_user_id uuid;
  target_name text;
  report_id uuid;
  allowed_reason text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  reporter_user_id := public.marketplace_current_user_id();
  if reporter_user_id is null then raise exception 'Marketplace user record not found.'; end if;

  allowed_reason := lower(nullif(btrim(report_reason), ''));
  if allowed_reason is null or allowed_reason not in (
    'misleading_profile', 'false_or_expired_credential', 'impersonation',
    'unsafe_conduct', 'harassment_or_discrimination', 'outside_scope',
    'fraud_or_payment_solicitation', 'other_policy_violation'
  ) then raise exception 'Choose a valid report reason.'; end if;
  if char_length(btrim(coalesce(report_details, ''))) < 20 then raise exception 'Add at least 20 characters of report details.'; end if;
  if char_length(coalesce(report_details, '')) > 2000 then raise exception 'Report details are too long.'; end if;

  if (
    select count(*) from public.reports as recent_report
    where recent_report.reporter_user_id = reporter_user_id
      and recent_report.report_type = 'professional_profile'
      and recent_report.created_at >= timezone('utc', now()) - interval '24 hours'
  ) >= 5 then raise exception 'Report limit reached. Try again later.'; end if;

  select profile.user_id,
    coalesce(nullif(profile.public_display_name, ''), nullif(btrim(concat_ws(' ', account.first_name, account.last_name)), ''), 'Elevare Professional')
  into target_user_id, target_name
  from public.marketplace_public_trainer_profiles_v2 as public_profile
  join public.trainer_profiles as profile on profile.id = public_profile.trainer_profile_id
  join public.users as account on account.id = profile.user_id
  where profile.id = target_profile_id limit 1;

  if target_user_id is null then raise exception 'Professional profile not found.'; end if;
  if target_user_id = reporter_user_id then raise exception 'You cannot report your own profile.'; end if;

  insert into public.reports (
    reporter_id, reporter_user_id, reported_id, reported_user_id, reason, details,
    report_type, subject, description, reported_user_name, complaint_category, context
  ) values (
    reporter_user_id, reporter_user_id, target_user_id, target_user_id, allowed_reason,
    nullif(btrim(report_details), ''), 'professional_profile', target_name,
    coalesce(nullif(btrim(report_details), ''), allowed_reason), target_name,
    allowed_reason, jsonb_build_object(
      'source', 'website_marketplace',
      'pathname', left(nullif(btrim(source_path), ''), 500),
      'professional_profile_id', target_profile_id,
      'schema_version', 2
    )
  ) returning id into report_id;
  return report_id;
end;
$$;

revoke all on function public.submit_professional_profile_report(uuid, text, text, text) from public, anon;
grant execute on function public.submit_professional_profile_report(uuid, text, text, text) to authenticated, service_role;

create or replace function public.marketplace_prepare_trust_expiration_notices(
  p_as_of date default current_date,
  p_enqueue boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  credential_count integer := 0;
  insurance_count integer := 0;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required.'; end if;

  select count(*)::integer into credential_count
  from public.certifications as credential
  where lower(coalesce(credential.verification_status::text, '')) = 'verified'
    and credential.revoked_at is null
    and coalesce(credential.expiration_date, credential.expiry_date)
      between p_as_of and p_as_of + 30;

  select count(*)::integer into insurance_count
  from public.professional_insurance_submissions as insurance
  where insurance.review_status = 'verified'
    and insurance.revoked_at is null
    and insurance.coverage_expiration_date between p_as_of and p_as_of + 30;

  if p_enqueue then
    insert into public.professional_trust_notification_outbox (
      professional_user_id, event_type, locale, safe_payload, idempotency_key
    )
    select profile.user_id, 'credential_nearing_expiration',
      case when account.preferred_locale = 'pt-BR' then 'pt-BR' when account.preferred_locale = 'es-419' or account.preferred_locale like 'es-%' then 'es-419' else 'en' end,
      jsonb_build_object('entity_type', 'credential', 'entity_id', credential.id, 'expiration_date', coalesce(credential.expiration_date, credential.expiry_date)),
      concat('credential:', credential.id, ':expires:', coalesce(credential.expiration_date, credential.expiry_date))
    from public.certifications as credential
    join public.trainer_profiles as profile on profile.id = coalesce(credential.trainer_profile_id, credential.trainer_id)
    join public.users as account on account.id = profile.user_id
    where lower(coalesce(credential.verification_status::text, '')) = 'verified'
      and credential.revoked_at is null
      and coalesce(credential.expiration_date, credential.expiry_date) between p_as_of and p_as_of + 30
    on conflict (idempotency_key) do nothing;

    insert into public.professional_trust_notification_outbox (
      professional_user_id, event_type, locale, safe_payload, idempotency_key
    )
    select profile.user_id, 'insurance_nearing_expiration',
      case when account.preferred_locale = 'pt-BR' then 'pt-BR' when account.preferred_locale = 'es-419' or account.preferred_locale like 'es-%' then 'es-419' else 'en' end,
      jsonb_build_object('entity_type', 'insurance', 'entity_id', insurance.id, 'expiration_date', insurance.coverage_expiration_date),
      concat('insurance:', insurance.id, ':expires:', insurance.coverage_expiration_date)
    from public.professional_insurance_submissions as insurance
    join public.trainer_profiles as profile on profile.id = insurance.trainer_profile_id
    join public.users as account on account.id = profile.user_id
    where insurance.review_status = 'verified'
      and insurance.revoked_at is null
      and insurance.coverage_expiration_date between p_as_of and p_as_of + 30
    on conflict (idempotency_key) do nothing;
  end if;

  return jsonb_build_object(
    'as_of', p_as_of,
    'enqueue_enabled_for_call', p_enqueue,
    'credential_notices_eligible', credential_count,
    'insurance_notices_eligible', insurance_count
  );
end;
$$;

revoke all on function public.marketplace_prepare_trust_expiration_notices(date, boolean) from public, anon, authenticated;
grant execute on function public.marketplace_prepare_trust_expiration_notices(date, boolean) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'professional-trust-evidence',
  'professional-trust-evidence',
  false,
  8388608,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set file_size_limit = 8388608,
  allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
where id = 'credential-documents';

drop policy if exists professional_trust_evidence_select_own on storage.objects;
create policy professional_trust_evidence_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'professional-trust-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists professional_trust_evidence_insert_own on storage.objects;
create policy professional_trust_evidence_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'professional-trust-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'insurance'
  and lower(storage.extension(name)) in ('pdf', 'png', 'jpg', 'jpeg', 'webp')
);

drop policy if exists professional_trust_evidence_update_own on storage.objects;
create policy professional_trust_evidence_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'professional-trust-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'professional-trust-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'insurance'
  and lower(storage.extension(name)) in ('pdf', 'png', 'jpg', 'jpeg', 'webp')
);

drop policy if exists professional_trust_evidence_delete_own on storage.objects;
create policy professional_trust_evidence_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'professional-trust-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists professional_trust_evidence_preserve_referenced on storage.objects;
create policy professional_trust_evidence_preserve_referenced
on storage.objects as restrictive for delete to authenticated
using (
  bucket_id <> 'professional-trust-evidence'
  or not exists (
    select 1
    from public.professional_insurance_submissions as submission
    where submission.evidence_storage_path = name
  )
);

drop policy if exists credential_documents_preserve_referenced on storage.objects;
create policy credential_documents_preserve_referenced
on storage.objects as restrictive for delete to authenticated
using (
  bucket_id <> 'credential-documents'
  or not exists (
    select 1
    from public.certifications as credential
    where credential.document_url = name
  )
);

commit;
