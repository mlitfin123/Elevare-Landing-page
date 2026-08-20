-- Forward-only legal evidence, public marketplace privacy, and publication safeguards.
-- This migration is prepared for the Elevare marketplace project only. Use the
-- project verification script before applying it to any remote database.

begin;

create table if not exists public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_key text not null,
  version text not null,
  effective_date date not null,
  content_sha256 text not null,
  archive_path text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint legal_document_versions_key_version_unique unique (document_key, version),
  constraint legal_document_versions_hash_check check (content_sha256 ~ '^[a-f0-9]{64}$'),
  constraint legal_document_versions_archive_path_check check (archive_path like '/legal/archive/%')
);

comment on table public.legal_document_versions is
  'Immutable metadata for the exact archived legal document associated with a consent version.';

alter table public.legal_document_versions enable row level security;
revoke all on table public.legal_document_versions from public, anon, authenticated;
grant select, insert on table public.legal_document_versions to service_role;

alter table public.user_legal_acceptances
  add column if not exists legal_document_version_id uuid references public.legal_document_versions(id);

alter table public.user_legal_acceptance_history
  add column if not exists terms_document_version_id uuid references public.legal_document_versions(id),
  add column if not exists privacy_document_version_id uuid references public.legal_document_versions(id);

create or replace function public.attach_legal_document_version_to_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select version.id
  into new.legal_document_version_id
  from public.legal_document_versions as version
  where version.document_key = new.document_key
    and version.version = new.document_version
  limit 1;
  return new;
end;
$$;

revoke all on function public.attach_legal_document_version_to_acceptance() from public, anon, authenticated;
grant execute on function public.attach_legal_document_version_to_acceptance() to service_role;

drop trigger if exists user_legal_acceptances_attach_document_version on public.user_legal_acceptances;
create trigger user_legal_acceptances_attach_document_version
before insert or update of document_key, document_version on public.user_legal_acceptances
for each row execute function public.attach_legal_document_version_to_acceptance();

create or replace function public.attach_legal_document_versions_to_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.terms_version is not null then
    select version.id into new.terms_document_version_id
    from public.legal_document_versions as version
    where version.document_key = 'terms_of_service'
      and version.version = new.terms_version
    limit 1;
  end if;

  if new.privacy_version is not null then
    select version.id into new.privacy_document_version_id
    from public.legal_document_versions as version
    where version.document_key = 'privacy_policy'
      and version.version = new.privacy_version
    limit 1;
  end if;

  return new;
end;
$$;

revoke all on function public.attach_legal_document_versions_to_history() from public, anon, authenticated;
grant execute on function public.attach_legal_document_versions_to_history() to service_role;

drop trigger if exists user_legal_history_attach_document_versions on public.user_legal_acceptance_history;
create trigger user_legal_history_attach_document_versions
before insert on public.user_legal_acceptance_history
for each row execute function public.attach_legal_document_versions_to_history();

create table if not exists public.user_assertion_history (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  marketplace_user_id uuid not null,
  assertion_key text not null,
  assertion_value boolean not null,
  assertion_version text not null,
  asserted_at timestamptz not null default timezone('utc', now()),
  assertion_method text not null default 'checkbox',
  assertion_source text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_assertion_history_unique unique (
    auth_user_id,
    assertion_key,
    assertion_version,
    assertion_source
  )
);

comment on table public.user_assertion_history is
  'Append-only evidence of user assertions such as the 18+ registration attestation.';

alter table public.user_assertion_history enable row level security;
revoke all on table public.user_assertion_history from public, anon, authenticated;
grant select on table public.user_assertion_history to authenticated;
grant select, insert on table public.user_assertion_history to service_role;

drop policy if exists user_assertion_history_select_own on public.user_assertion_history;
create policy user_assertion_history_select_own
on public.user_assertion_history
for select
to authenticated
using (auth_user_id = auth.uid());

create or replace function public.record_website_signup_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  signup_metadata jsonb;
  supplied_country text;
  accepted_role_value text;
  accepted_at_value timestamptz;
begin
  select auth_user.raw_user_meta_data, auth_user.created_at
  into signup_metadata, accepted_at_value
  from auth.users as auth_user
  where auth_user.id = new.auth_id
  limit 1;

  if coalesce(signup_metadata->>'legal_acceptance_source', '') = 'website_signup'
    and lower(coalesce(signup_metadata->>'age_18_plus', 'false')) <> 'true'
  then
    raise exception 'You must confirm that you are at least 18 years old.';
  end if;

  if lower(coalesce(signup_metadata->>'legal_acceptance', 'false')) <> 'true'
    or signup_metadata->>'terms_version' <> '2026-08-20'
    or signup_metadata->>'privacy_version' <> '2026-08-20'
    or lower(coalesce(signup_metadata->>'age_18_plus', 'false')) <> 'true'
    or signup_metadata->>'age_attestation_version' <> '2026-08-20'
  then
    return new;
  end if;

  supplied_country := upper(nullif(btrim(signup_metadata->>'country_code'), ''));
  if supplied_country is not null and supplied_country !~ '^[A-Z]{2}$' then
    supplied_country := null;
  end if;

  accepted_role_value := case
    when lower(coalesce(signup_metadata->>'accepted_role', signup_metadata->>'role', ''))
      in ('trainer', 'coach', 'professional') then 'trainer'
    else 'client'
  end;
  accepted_at_value := coalesce(accepted_at_value, timezone('utc', now()));

  insert into public.user_legal_acceptances (
    user_id, document_key, document_version, accepted_role, accepted_at,
    acceptance_source, acceptance_method, acceptance_country_code
  )
  select new.id, document.document_key, document.document_version, accepted_role_value,
    accepted_at_value, 'website_signup', 'checkbox', supplied_country
  from (values
    ('terms_of_service'::text, '2026-08-20'::text),
    ('privacy_policy'::text, '2026-08-20'::text)
  ) as document(document_key, document_version)
  where not exists (
    select 1 from public.user_legal_acceptances as existing
    where existing.user_id = new.id
      and existing.document_key = document.document_key
      and existing.document_version = document.document_version
  );

  insert into public.user_assertion_history (
    auth_user_id, marketplace_user_id, assertion_key, assertion_value,
    assertion_version, asserted_at, assertion_method, assertion_source
  )
  values (
    new.auth_id, new.id, 'age_18_plus', true, '2026-08-20', accepted_at_value,
    'checkbox', 'website_signup'
  )
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.record_website_signup_legal_acceptance() from public, anon, authenticated;
grant execute on function public.record_website_signup_legal_acceptance() to service_role;

alter table public.trainer_profiles
  add column if not exists regulated_title_review_required boolean not null default false;

create or replace function public.regulated_professional_title_group(title_value text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  normalized text := regexp_replace(lower(coalesce(title_value, '')), '[^a-z0-9]+', ' ', 'g');
  original text := coalesce(title_value, '');
  compact_abbreviations text := replace(coalesce(title_value, ''), '.', '');
begin
  if normalized ~ '(^| )(registered dietitian( nutritionist)?|licensed dietitian|licensed nutritionist|dietitian|nutritionist|nutrition counselor)( |$)'
    or compact_abbreviations ~ '(^|[^A-Za-z])(RDN|RD)([^A-Za-z]|$)'
  then return 'dietetics_nutrition';
  elsif normalized ~ '(^| )(physical therapist|physical therapy|doctor of physical therapy)( |$)'
    or compact_abbreviations ~ '(^|[^A-Za-z])DPT([^A-Za-z]|$)'
  then return 'physical_therapy';
  elsif normalized ~ '(^| )(physician|doctor|medical doctor|doctor of osteopathic medicine)( |$)'
    or compact_abbreviations ~ '(^|[^A-Za-z])(MD|DO)([^A-Za-z]|$)'
  then return 'medical';
  elsif normalized ~ '(^| )(psychologist|therapist|licensed mental health counselor)( |$)'
    or compact_abbreviations ~ '(^|[^A-Za-z])LMHC([^A-Za-z]|$)'
  then return 'mental_health';
  elsif normalized ~ '(^| )(registered nurse|nurse practitioner)( |$)'
    or compact_abbreviations ~ '(^|[^A-Za-z])(RN|NP)([^A-Za-z]|$)'
  then return 'nursing';
  end if;
  return null;
end;
$$;

create or replace function public.trainer_profile_has_verified_title_credential(
  profile_id uuid,
  required_group text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.certifications as credential
    where coalesce(credential.trainer_profile_id, credential.trainer_id) = profile_id
      and coalesce(credential.is_active, true) = true
      and lower(coalesce(credential.verification_status::text, '')) = 'verified'
      and case required_group
        when 'dietetics_nutrition' then
          lower(concat_ws(' ', credential.cert_name, credential.credential_type, credential.issuing_body, credential.cert_org))
            ~ '(dietitian|dietetics|nutritionist|nutrition)'
          or concat_ws(' ', credential.cert_name, credential.credential_type) ~ '(^|[^A-Za-z])(RDN|RD)([^A-Za-z]|$)'
        when 'physical_therapy' then
          lower(concat_ws(' ', credential.cert_name, credential.credential_type, credential.issuing_body, credential.cert_org))
            ~ '(physical therapist|physical therapy)'
          or concat_ws(' ', credential.cert_name, credential.credential_type) ~ '(^|[^A-Za-z])DPT([^A-Za-z]|$)'
        when 'medical' then
          lower(concat_ws(' ', credential.cert_name, credential.credential_type, credential.issuing_body, credential.cert_org))
            ~ '(physician|medical|osteopathic)'
          or concat_ws(' ', credential.cert_name, credential.credential_type) ~ '(^|[^A-Za-z])(MD|DO)([^A-Za-z]|$)'
        when 'mental_health' then
          lower(concat_ws(' ', credential.cert_name, credential.credential_type, credential.issuing_body, credential.cert_org))
            ~ '(psychologist|psychology|therapist|therapy|mental health)'
          or concat_ws(' ', credential.cert_name, credential.credential_type) ~ '(^|[^A-Za-z])LMHC([^A-Za-z]|$)'
        when 'nursing' then
          lower(concat_ws(' ', credential.cert_name, credential.credential_type, credential.issuing_body, credential.cert_org))
            ~ '(nurse|nursing)'
          or concat_ws(' ', credential.cert_name, credential.credential_type) ~ '(^|[^A-Za-z])(RN|NP)([^A-Za-z]|$)'
        else false
      end
  );
$$;

revoke all on function public.trainer_profile_has_verified_title_credential(uuid, text) from public, anon, authenticated;
grant execute on function public.trainer_profile_has_verified_title_credential(uuid, text) to service_role;

update public.trainer_profiles as profile
set regulated_title_review_required = true
where profile.profile_live = true
  and public.regulated_professional_title_group(profile.professional_title) is not null
  and not public.trainer_profile_has_verified_title_credential(
    profile.id,
    public.regulated_professional_title_group(profile.professional_title)
  );

create or replace function public.enforce_verified_credential_for_regulated_title()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  required_group text;
begin
  if new.profile_live is not true then return new; end if;
  if tg_op = 'UPDATE'
    and old.profile_live is true
    and new.professional_title is not distinct from old.professional_title
  then return new; end if;

  required_group := public.regulated_professional_title_group(new.professional_title);
  if required_group is not null
    and not public.trainer_profile_has_verified_title_credential(new.id, required_group)
  then
    raise exception 'This title may require professional credentials. Add the applicable license or credential and have it verified before publishing this title.';
  end if;

  new.regulated_title_review_required := false;
  return new;
end;
$$;

revoke all on function public.enforce_verified_credential_for_regulated_title() from public, anon, authenticated;
grant execute on function public.enforce_verified_credential_for_regulated_title() to service_role;

drop trigger if exists zzzz_enforce_regulated_professional_title on public.trainer_profiles;
create trigger zzzz_enforce_regulated_professional_title
before insert or update of profile_live, professional_title on public.trainer_profiles
for each row execute function public.enforce_verified_credential_for_regulated_title();

create or replace function public.submit_current_trainer_profile_for_review_attested(
  requested_email text default null,
  request_notes text default null,
  attestation_version text default null,
  country_at_acceptance text default null
)
returns public.trainer_verification_requests
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  app_user_id uuid;
  profile_row public.trainer_profiles%rowtype;
  request_row public.trainer_verification_requests%rowtype;
  normalized_country text;
  required_group text;
  canonical_attestation constant text := 'I confirm that I am responsible for maintaining all licenses, certifications, insurance, registrations, permits, and other authorizations required for the services I offer, for keeping my profile and credential information accurate, and for providing services only within my lawful scope of practice in each applicable jurisdiction.';
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if attestation_version is distinct from '2026-08-20' then
    raise exception 'Review and accept the current professional attestation before submitting.';
  end if;

  normalized_country := upper(nullif(btrim(country_at_acceptance), ''));
  if normalized_country is not null and normalized_country !~ '^[A-Z]{2}$' then
    raise exception 'Country at acceptance must use a two-letter country code.';
  end if;

  app_user_id := public.marketplace_current_user_id();
  if app_user_id is null then raise exception 'No public user record exists for the current authenticated user.'; end if;

  select * into profile_row from public.trainer_profiles where user_id = app_user_id limit 1;
  if profile_row.id is null then raise exception 'Complete and save your professional profile before submitting.'; end if;

  required_group := public.regulated_professional_title_group(profile_row.professional_title);
  if required_group is not null
    and not public.trainer_profile_has_verified_title_credential(profile_row.id, required_group)
  then
    raise exception 'This title may require professional credentials. Add the applicable license or credential and have it verified before publishing this title.';
  end if;

  request_row := public.submit_current_trainer_profile_for_review(requested_email, request_notes);

  insert into public.user_legal_acceptance_history (
    acceptance_type, auth_user_id, marketplace_user_id, trainer_profile_id,
    verification_request_id, professional_attestation_version, acceptance_text,
    accepted_at, country_code, acceptance_method, acceptance_source
  ) values (
    'professional_attestation', auth.uid(), app_user_id, request_row.trainer_profile_id,
    request_row.id, attestation_version, canonical_attestation, timezone('utc', now()),
    normalized_country, 'checkbox', 'website_professional_submission'
  ) on conflict do nothing;

  return request_row;
end;
$$;

revoke all on function public.submit_current_trainer_profile_for_review_attested(text, text, text, text) from public, anon;
grant execute on function public.submit_current_trainer_profile_for_review_attested(text, text, text, text) to authenticated, service_role;

create or replace view public.marketplace_public_trainer_profiles_v2 as
select
  current_profile.trainer_profile_id,
  current_profile.public_slug,
  coalesce(
    nullif(profile.public_display_name, ''),
    nullif(btrim(concat_ws(' ', account.first_name, account.last_name)), ''),
    'Elevare Professional'
  ) as display_name,
  current_profile.professional_title,
  current_profile.bio,
  current_profile.years_experience,
  current_profile.location_city,
  current_profile.location_state,
  current_profile.primary_specialty,
  current_profile.secondary_specialties,
  current_profile.coaching_style,
  current_profile.modality,
  current_profile.online_coaching_best_for,
  current_profile.online_check_in_style,
  current_profile.online_communication_cadence,
  current_profile.online_expected_response_time,
  current_profile.average_rating,
  current_profile.total_reviews,
  current_profile.total_completed_packages,
  current_profile.accepting_clients,
  current_profile.is_featured,
  current_profile.profile_photo_url,
  current_profile.delivery_modes,
  current_profile.goal_tags,
  current_profile.experience_tags,
  current_profile.price_min_cents,
  current_profile.price_max_cents,
  current_profile.available_locations,
  current_profile.availability_summary,
  current_profile.service_categories,
  current_profile.certifications,
  current_profile.locations,
  current_profile.is_insured_trainer,
  current_profile.insured_verified_at,
  current_profile.created_at,
  current_profile.updated_at,
  current_profile.client_acceptance_status,
  current_profile.typical_availability,
  current_profile.availability_details,
  current_profile.website_url,
  current_profile.social_links,
  current_profile.pricing_basis,
  current_profile.contact_for_pricing,
  current_profile.service_offerings
from public.marketplace_public_trainer_profiles_v1 as current_profile
join public.trainer_profiles as profile on profile.id = current_profile.trainer_profile_id
join public.users as account on account.id = profile.user_id;

revoke select on public.marketplace_public_trainer_profiles_v1 from anon, authenticated;
grant select on public.marketplace_public_trainer_profiles_v2 to anon, authenticated, service_role;

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
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  reporter_user_id := public.marketplace_current_user_id();
  if reporter_user_id is null then raise exception 'Marketplace user record not found.'; end if;
  if nullif(btrim(report_reason), '') is null then raise exception 'A report reason is required.'; end if;

  select profile.user_id,
    coalesce(nullif(profile.public_display_name, ''), nullif(btrim(concat_ws(' ', account.first_name, account.last_name)), ''), 'Elevare Professional')
  into target_user_id, target_name
  from public.trainer_profiles as profile
  join public.users as account on account.id = profile.user_id
  where profile.id = target_profile_id
  limit 1;

  if target_user_id is null then raise exception 'Professional profile not found.'; end if;
  if target_user_id = reporter_user_id then raise exception 'You cannot report your own profile.'; end if;

  insert into public.reports (
    reporter_id, reporter_user_id, reported_id, reported_user_id, reason, details,
    report_type, subject, description, reported_user_name, complaint_category, context
  ) values (
    reporter_user_id, reporter_user_id, target_user_id, target_user_id, btrim(report_reason),
    nullif(btrim(report_details), ''), 'professional_profile', target_name,
    coalesce(nullif(btrim(report_details), ''), btrim(report_reason)), target_name,
    btrim(report_reason), jsonb_build_object(
      'source', 'website_marketplace',
      'pathname', nullif(btrim(source_path), ''),
      'professional_profile_id', target_profile_id
    )
  ) returning id into report_id;
  return report_id;
end;
$$;

create or replace function public.submit_account_deletion_request(request_details text default null)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  app_user_id uuid;
  account_name text;
  report_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select account.id,
    coalesce(nullif(btrim(concat_ws(' ', account.first_name, account.last_name)), ''), 'Elevare user')
  into app_user_id, account_name
  from public.users as account where account.auth_id = auth.uid() limit 1;
  if app_user_id is null then raise exception 'Marketplace user record not found.'; end if;

  insert into public.reports (
    reporter_id, reporter_user_id, reported_id, reported_user_id, reason, details,
    report_type, subject, description, reported_user_name, complaint_category, context
  ) values (
    app_user_id, app_user_id, app_user_id, app_user_id, 'Account deletion request',
    nullif(btrim(request_details), ''), 'account_deletion', 'Account deletion request',
    coalesce(nullif(btrim(request_details), ''), 'User requested permanent deletion of their Elevare account.'),
    account_name, 'Account deletion', jsonb_build_object('source', 'website_account_dashboard')
  ) returning id into report_id;
  return report_id;
end;
$$;

revoke all on function public.submit_professional_profile_report(uuid, text, text, text) from public, anon;
revoke all on function public.submit_account_deletion_request(text) from public, anon;
grant execute on function public.submit_professional_profile_report(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.submit_account_deletion_request(text) to authenticated, service_role;

alter table public.reports enable row level security;
revoke all on table public.reports from anon, authenticated;
grant select, update on table public.reports to authenticated;
grant select, insert, update, delete on table public.reports to service_role;

drop policy if exists reports_allow_admin_select on public.reports;
create policy reports_allow_admin_select
on public.reports for select to authenticated
using (
  exists (
    select 1 from public.users as account
    where account.auth_id = auth.uid()
      and lower(coalesce(account.role::text, '')) in ('admin', 'super_admin')
  )
);

drop policy if exists reports_restrict_select_to_admin on public.reports;
create policy reports_restrict_select_to_admin
on public.reports as restrictive for select to authenticated
using (
  exists (
    select 1 from public.users as account
    where account.auth_id = auth.uid()
      and lower(coalesce(account.role::text, '')) in ('admin', 'super_admin')
  )
);

drop policy if exists reports_restrict_write_identity on public.reports;

drop policy if exists reports_allow_admin_update on public.reports;
create policy reports_allow_admin_update
on public.reports for update to authenticated
using (
  exists (
    select 1 from public.users as account
    where account.auth_id = auth.uid()
      and lower(coalesce(account.role::text, '')) in ('admin', 'super_admin')
  )
) with check (
  exists (
    select 1 from public.users as account
    where account.auth_id = auth.uid()
      and lower(coalesce(account.role::text, '')) in ('admin', 'super_admin')
  )
);

drop policy if exists reports_restrict_update_to_admin on public.reports;
create policy reports_restrict_update_to_admin
on public.reports as restrictive for update to authenticated
using (
  exists (
    select 1 from public.users as account
    where account.auth_id = auth.uid()
      and lower(coalesce(account.role::text, '')) in ('admin', 'super_admin')
  )
) with check (
  exists (
    select 1 from public.users as account
    where account.auth_id = auth.uid()
      and lower(coalesce(account.role::text, '')) in ('admin', 'super_admin')
  )
);

insert into storage.buckets (id, name, public)
values ('credential-documents', 'credential-documents', false)
on conflict (id) do update set public = false;

drop policy if exists credential_documents_select_own on storage.objects;
create policy credential_documents_select_own
on storage.objects for select to authenticated
using (bucket_id = 'credential-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists credential_documents_insert_own on storage.objects;
create policy credential_documents_insert_own
on storage.objects for insert to authenticated
with check (bucket_id = 'credential-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists credential_documents_update_own on storage.objects;
create policy credential_documents_update_own
on storage.objects for update to authenticated
using (bucket_id = 'credential-documents' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'credential-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists credential_documents_delete_own on storage.objects;
create policy credential_documents_delete_own
on storage.objects for delete to authenticated
using (bucket_id = 'credential-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists profile_photos_delete_own on storage.objects;
create policy profile_photos_delete_own
on storage.objects as restrictive for delete to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
