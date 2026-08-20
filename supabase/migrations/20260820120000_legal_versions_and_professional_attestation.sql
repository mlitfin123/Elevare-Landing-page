begin;

-- Keep legal-document versions aligned with the website without changing or
-- deleting any acceptance previously recorded for an earlier version.
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
  select
    auth_user.raw_user_meta_data,
    auth_user.created_at
  into
    signup_metadata,
    accepted_at_value
  from auth.users as auth_user
  where auth_user.id = new.auth_id
  limit 1;

  if lower(coalesce(signup_metadata->>'legal_acceptance', 'false')) <> 'true'
    or signup_metadata->>'terms_version' <> '2026-08-20'
    or signup_metadata->>'privacy_version' <> '2026-08-20'
  then
    return new;
  end if;

  supplied_country := upper(nullif(btrim(signup_metadata->>'country_code'), ''));
  if supplied_country is not null and supplied_country !~ '^[A-Z]{2}$' then
    supplied_country := null;
  end if;

  accepted_role_value := case
    when lower(coalesce(
      signup_metadata->>'accepted_role',
      signup_metadata->>'role',
      ''
    )) in ('trainer', 'coach', 'professional')
      then 'trainer'
    else 'client'
  end;

  accepted_at_value := coalesce(accepted_at_value, timezone('utc', now()));

  insert into public.user_legal_acceptances (
    user_id,
    document_key,
    document_version,
    accepted_role,
    accepted_at,
    acceptance_source,
    acceptance_method,
    acceptance_country_code
  )
  select
    new.id,
    'terms_of_service',
    '2026-08-20',
    accepted_role_value,
    accepted_at_value,
    'website_signup',
    'checkbox',
    supplied_country
  where not exists (
    select 1
    from public.user_legal_acceptances as existing
    where existing.user_id = new.id
      and existing.document_key = 'terms_of_service'
      and existing.document_version = '2026-08-20'
  );

  insert into public.user_legal_acceptances (
    user_id,
    document_key,
    document_version,
    accepted_role,
    accepted_at,
    acceptance_source,
    acceptance_method,
    acceptance_country_code
  )
  select
    new.id,
    'privacy_policy',
    '2026-08-20',
    accepted_role_value,
    accepted_at_value,
    'website_signup',
    'checkbox',
    supplied_country
  where not exists (
    select 1
    from public.user_legal_acceptances as existing
    where existing.user_id = new.id
      and existing.document_key = 'privacy_policy'
      and existing.document_version = '2026-08-20'
  );

  return new;
end;
$$;

revoke all on function public.record_website_signup_legal_acceptance() from public, anon, authenticated;
grant execute on function public.record_website_signup_legal_acceptance() to service_role;

-- Recover valid acceptances if the frontend version is deployed shortly before
-- this migration. Existing users and older legal versions remain unchanged.
insert into public.user_legal_acceptances (
  user_id,
  document_key,
  document_version,
  accepted_role,
  accepted_at,
  acceptance_source,
  acceptance_method,
  acceptance_country_code
)
select
  users.id,
  document.document_key,
  document.document_version,
  case
    when lower(coalesce(
      auth_user.raw_user_meta_data->>'accepted_role',
      auth_user.raw_user_meta_data->>'role',
      ''
    )) in ('trainer', 'coach', 'professional')
      then 'trainer'
    else 'client'
  end,
  coalesce(auth_user.created_at, timezone('utc', now())),
  'website_signup',
  'checkbox',
  case
    when upper(nullif(btrim(auth_user.raw_user_meta_data->>'country_code'), '')) ~ '^[A-Z]{2}$'
      then upper(nullif(btrim(auth_user.raw_user_meta_data->>'country_code'), ''))
    else null
  end
from public.users as users
join auth.users as auth_user on auth_user.id = users.auth_id
cross join lateral (
  values
    ('terms_of_service'::text, auth_user.raw_user_meta_data->>'terms_version'),
    ('privacy_policy'::text, auth_user.raw_user_meta_data->>'privacy_version')
) as document(document_key, document_version)
where lower(coalesce(auth_user.raw_user_meta_data->>'legal_acceptance', 'false')) = 'true'
  and auth_user.raw_user_meta_data->>'terms_version' = '2026-08-20'
  and auth_user.raw_user_meta_data->>'privacy_version' = '2026-08-20'
  and not exists (
    select 1
    from public.user_legal_acceptances as existing
    where existing.user_id = users.id
      and existing.document_key = document.document_key
      and existing.document_version = document.document_version
  );

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
  request_row public.trainer_verification_requests%rowtype;
  normalized_country text;
  canonical_attestation constant text := 'I confirm that I am responsible for maintaining all licenses, certifications, insurance, registrations, permits, and other authorizations required for the services I offer, for keeping my profile and credential information accurate, and for providing services only within my lawful scope of practice in each applicable jurisdiction.';
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if attestation_version is distinct from '2026-08-20' then
    raise exception 'Review and accept the current professional attestation before submitting.';
  end if;

  normalized_country := upper(nullif(btrim(country_at_acceptance), ''));
  if normalized_country is not null and normalized_country !~ '^[A-Z]{2}$' then
    raise exception 'Country at acceptance must use a two-letter country code.';
  end if;

  app_user_id := public.marketplace_current_user_id();
  if app_user_id is null then
    raise exception 'No public user record exists for the current authenticated user.';
  end if;

  request_row := public.submit_current_trainer_profile_for_review(
    requested_email,
    request_notes
  );

  insert into public.user_legal_acceptance_history (
    acceptance_type,
    auth_user_id,
    marketplace_user_id,
    trainer_profile_id,
    verification_request_id,
    professional_attestation_version,
    acceptance_text,
    accepted_at,
    country_code,
    acceptance_method,
    acceptance_source
  )
  values (
    'professional_attestation',
    auth.uid(),
    app_user_id,
    request_row.trainer_profile_id,
    request_row.id,
    attestation_version,
    canonical_attestation,
    timezone('utc', now()),
    normalized_country,
    'checkbox',
    'website_professional_submission'
  )
  on conflict do nothing;

  return request_row;
end;
$$;

revoke all on function public.submit_current_trainer_profile_for_review_attested(text, text, text, text)
  from public, anon;
grant execute on function public.submit_current_trainer_profile_for_review_attested(text, text, text, text)
  to authenticated, service_role;

commit;
