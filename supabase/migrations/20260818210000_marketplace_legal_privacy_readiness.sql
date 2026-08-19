-- Baseline legal/privacy readiness for incidental international marketplace use.
-- This extends the existing legal acceptance and review systems rather than
-- creating a competing approval or consent source of truth.

begin;

alter table public.user_legal_acceptances
  add column if not exists acceptance_source text,
  add column if not exists acceptance_method text,
  add column if not exists acceptance_country_code text;

alter table public.user_legal_acceptances
  drop constraint if exists user_legal_acceptances_country_code_check,
  add constraint user_legal_acceptances_country_code_check
    check (acceptance_country_code is null or acceptance_country_code ~ '^[A-Z]{2}$');

comment on table public.user_legal_acceptances is
  'Current legal document acceptance per user. Immutable version history is stored in user_legal_acceptance_history.';

create table if not exists public.user_legal_acceptance_history (
  id uuid primary key default gen_random_uuid(),
  acceptance_type text not null,
  auth_user_id uuid,
  marketplace_user_id uuid,
  trainer_profile_id uuid,
  verification_request_id uuid,
  terms_version date,
  privacy_version date,
  professional_attestation_version text,
  acceptance_text text,
  accepted_at timestamptz not null default timezone('utc', now()),
  country_code text,
  acceptance_method text not null default 'checkbox',
  acceptance_source text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_legal_acceptance_history_type_check
    check (acceptance_type in ('terms_privacy', 'professional_attestation')),
  constraint user_legal_acceptance_history_country_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint user_legal_acceptance_history_payload_check
    check (
      (acceptance_type = 'terms_privacy' and terms_version is not null and privacy_version is not null)
      or
      (
        acceptance_type = 'professional_attestation'
        and trainer_profile_id is not null
        and verification_request_id is not null
        and professional_attestation_version is not null
        and acceptance_text is not null
      )
    )
);

comment on table public.user_legal_acceptance_history is
  'Append-only audit history for legal document acceptance and professional review attestations.';

create index if not exists user_legal_acceptance_history_auth_user_idx
  on public.user_legal_acceptance_history (auth_user_id, accepted_at desc);

create index if not exists user_legal_acceptance_history_marketplace_user_idx
  on public.user_legal_acceptance_history (marketplace_user_id, accepted_at desc);

create unique index if not exists user_legal_acceptance_history_professional_submission_idx
  on public.user_legal_acceptance_history (
    verification_request_id,
    acceptance_type,
    professional_attestation_version
  )
  where acceptance_type = 'professional_attestation';

alter table public.user_legal_acceptance_history enable row level security;

revoke all on table public.user_legal_acceptance_history from public, anon, authenticated;
grant select on table public.user_legal_acceptance_history to authenticated;
grant select, insert on table public.user_legal_acceptance_history to service_role;

drop policy if exists user_legal_acceptance_history_select_own
  on public.user_legal_acceptance_history;
create policy user_legal_acceptance_history_select_own
on public.user_legal_acceptance_history
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or marketplace_user_id = public.marketplace_current_user_id()
);

create or replace function public.record_user_legal_acceptance_history()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  linked_marketplace_user_id uuid;
begin
  select users.id
  into linked_marketplace_user_id
  from public.users as users
  where users.auth_id = new.user_id
  limit 1;

  insert into public.user_legal_acceptance_history (
    acceptance_type,
    auth_user_id,
    marketplace_user_id,
    terms_version,
    privacy_version,
    accepted_at,
    country_code,
    acceptance_method,
    acceptance_source
  )
  values (
    'terms_privacy',
    new.user_id,
    linked_marketplace_user_id,
    new.terms_of_service_effective_date,
    new.privacy_policy_effective_date,
    greatest(new.terms_of_service_accepted_at, new.privacy_policy_accepted_at),
    new.acceptance_country_code,
    coalesce(nullif(new.acceptance_method, ''), 'existing_acceptance'),
    coalesce(nullif(new.acceptance_source, ''), 'existing_application')
  );

  return new;
end;
$$;

revoke all on function public.record_user_legal_acceptance_history() from public, anon, authenticated;
grant execute on function public.record_user_legal_acceptance_history() to service_role;

drop trigger if exists user_legal_acceptances_write_history
  on public.user_legal_acceptances;
create trigger user_legal_acceptances_write_history
after insert or update on public.user_legal_acceptances
for each row execute function public.record_user_legal_acceptance_history();

-- Preserve existing acceptance without forcing re-acceptance.
insert into public.user_legal_acceptance_history (
  acceptance_type,
  auth_user_id,
  marketplace_user_id,
  terms_version,
  privacy_version,
  accepted_at,
  country_code,
  acceptance_method,
  acceptance_source
)
select
  'terms_privacy',
  acceptance.user_id,
  users.id,
  acceptance.terms_of_service_effective_date,
  acceptance.privacy_policy_effective_date,
  greatest(acceptance.terms_of_service_accepted_at, acceptance.privacy_policy_accepted_at),
  acceptance.acceptance_country_code,
  coalesce(nullif(acceptance.acceptance_method, ''), 'existing_acceptance'),
  coalesce(nullif(acceptance.acceptance_source, ''), 'existing_application')
from public.user_legal_acceptances as acceptance
left join public.users as users on users.auth_id = acceptance.user_id
where not exists (
  select 1
  from public.user_legal_acceptance_history as history
  where history.acceptance_type = 'terms_privacy'
    and history.auth_user_id = acceptance.user_id
    and history.terms_version = acceptance.terms_of_service_effective_date
    and history.privacy_version = acceptance.privacy_policy_effective_date
    and history.accepted_at = greatest(
      acceptance.terms_of_service_accepted_at,
      acceptance.privacy_policy_accepted_at
    )
);

create or replace function public.record_website_signup_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  supplied_country text;
  signature_value text;
begin
  if lower(coalesce(new.raw_user_meta_data->>'legal_acceptance', 'false')) <> 'true'
    or new.raw_user_meta_data->>'terms_version' <> '2026-08-18'
    or new.raw_user_meta_data->>'privacy_version' <> '2026-08-18'
  then
    return new;
  end if;

  supplied_country := upper(nullif(btrim(new.raw_user_meta_data->>'country_code'), ''));
  if supplied_country is not null and supplied_country !~ '^[A-Z]{2}$' then
    supplied_country := null;
  end if;

  signature_value := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(concat_ws(
      ' ',
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name'
    )), ''),
    nullif(lower(new.email), ''),
    new.id::text
  );

  insert into public.user_legal_acceptances (
    user_id,
    signature_name,
    privacy_policy_effective_date,
    privacy_policy_accepted_at,
    terms_of_service_effective_date,
    terms_of_service_accepted_at,
    acceptance_source,
    acceptance_method,
    acceptance_country_code
  )
  values (
    new.id,
    signature_value,
    '2026-08-18'::date,
    timezone('utc', now()),
    '2026-08-18'::date,
    timezone('utc', now()),
    'website_signup',
    'checkbox',
    supplied_country
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.record_website_signup_legal_acceptance() from public, anon, authenticated;
grant execute on function public.record_website_signup_legal_acceptance() to supabase_auth_admin;
grant execute on function public.record_website_signup_legal_acceptance() to service_role;

drop trigger if exists on_auth_user_created_record_legal_acceptance on auth.users;
create trigger on_auth_user_created_record_legal_acceptance
after insert on auth.users
for each row execute function public.record_website_signup_legal_acceptance();

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
  canonical_attestation constant text := 'I confirm that my profile and credential information is accurate and that I am responsible for complying with laws and professional requirements applicable to the services I offer and the jurisdictions in which I provide them.';
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if attestation_version is distinct from '2026-08-18' then
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

-- Authenticated marketplace submissions must use the attested wrapper. Service
-- workflows retain direct access for operational compatibility.
revoke all on function public.submit_current_trainer_profile_for_review(text, text)
  from public, anon, authenticated;
grant execute on function public.submit_current_trainer_profile_for_review(text, text)
  to service_role;

revoke all on function public.submit_current_trainer_profile_for_review_attested(text, text, text, text)
  from public, anon;
grant execute on function public.submit_current_trainer_profile_for_review_attested(text, text, text, text)
  to authenticated, service_role;

-- Raw credential rows may contain document links and optional credential
-- numbers. Authenticated Professionals may read their own rows; public-safe
-- details for other users remain available through the approved-profile view.
alter table public.certifications enable row level security;

drop policy if exists certifications_restrict_raw_select_to_owner
  on public.certifications;
create policy certifications_restrict_raw_select_to_owner
on public.certifications
as restrictive
for select
to anon, authenticated
using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.trainer_profiles as owner_profile
    where owner_profile.id = coalesce(
      certifications.trainer_profile_id,
      certifications.trainer_id
    )
      and owner_profile.user_id = public.marketplace_current_user_id()
  )
);

-- Credential review material must not be returned by the anonymous profile view.
create or replace view public.marketplace_public_trainer_profiles_v1 as
select
  tp.id as trainer_profile_id,
  tp.user_id,
  tp.public_slug,
  coalesce(
    nullif(tp.public_display_name, ''),
    nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''),
    split_part(coalesce(u.email, ''), '@', 1)
  ) as display_name,
  coalesce(nullif(tp.professional_title, ''), nullif(tp.primary_specialty::text, ''), 'Professional') as professional_title,
  tp.bio,
  tp.years_experience,
  tp.location_city,
  tp.location_state,
  tp.primary_specialty::text as primary_specialty,
  tp.secondary_specialties,
  tp.coaching_style,
  tp.modality,
  tp.online_coaching_best_for,
  tp.online_check_in_style,
  tp.online_communication_cadence,
  tp.online_expected_response_time,
  tp.average_rating,
  tp.total_reviews,
  tp.total_completed_packages,
  tp.accepting_clients,
  tp.is_featured,
  u.profile_photo_url,
  pm.delivery_modes,
  pm.goal_tags,
  pm.experience_tags,
  pm.price_min_cents,
  pm.price_max_cents,
  pm.available_locations,
  pm.availability_summary,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', sc.id,
          'slug', sc.slug,
          'stable_slug', sc.slug,
          'public_slug', sc.public_slug,
          'label', coalesce(nullif(sc.public_label, ''), sc.name),
          'headline', coalesce(nullif(sc.public_headline, ''), sc.name),
          'short_description', coalesce(nullif(sc.public_short_description, ''), sc.description),
          'is_primary', ts.is_primary
        ) order by ts.is_primary desc, sc.sort_order
      )
      from public.trainer_services as ts
      join public.service_categories as sc on sc.id = ts.service_category_id
      where ts.trainer_profile_id = tp.id
        and sc.is_active = true
        and coalesce(sc.is_visible_in_directory, true) = true
    ),
    '[]'::jsonb
  ) as service_categories,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'credential_name', c.cert_name,
          'credential_type', c.credential_type,
          'issuing_body', coalesce(nullif(c.issuing_body, ''), nullif(c.cert_org, '')),
          'issue_date', c.issue_date,
          'expiration_date', coalesce(c.expiration_date, c.expiry_date),
          'verification_status', c.verification_status,
          'credential_country_code', c.credential_country_code,
          'credential_jurisdiction', c.credential_jurisdiction
        ) order by c.created_at desc
      )
      from public.certifications as c
      where coalesce(c.trainer_profile_id, c.trainer_id) = tp.id
        and coalesce(c.is_active, true) = true
    ),
    '[]'::jsonb
  ) as certifications,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', tl.id,
          'location_name', tl.location_name,
          'city', tl.location_city,
          'state', tl.location_state,
          'service_radius_miles', tl.service_radius_miles,
          'is_primary', tl.is_primary
        ) order by tl.is_primary desc, tl.created_at
      )
      from public.trainer_locations as tl
      where tl.trainer_profile_id = tp.id
    ),
    '[]'::jsonb
  ) as locations,
  coalesce(tips.is_insured_trainer, false) as is_insured_trainer,
  tips.insured_verified_at,
  tp.created_at,
  tp.updated_at,
  tp.client_acceptance_status,
  tp.typical_availability,
  tp.availability_details,
  tp.website_url,
  tp.social_links,
  pm.pricing_basis,
  pm.contact_for_pricing,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', offering.id,
          'name', offering.name,
          'description', offering.description,
          'service_mode', offering.service_mode,
          'duration_minutes', offering.duration_minutes,
          'price_min_cents', offering.price_min_cents,
          'price_max_cents', offering.price_max_cents,
          'pricing_basis', offering.pricing_basis,
          'contact_for_pricing', offering.contact_for_pricing,
          'sort_order', offering.sort_order,
          'is_active', offering.is_active
        ) order by offering.sort_order, offering.created_at
      )
      from public.trainer_service_offerings as offering
      where offering.trainer_profile_id = tp.id
        and offering.is_active = true
    ),
    '[]'::jsonb
  ) as service_offerings
from public.trainer_profiles as tp
join public.users as u on u.id = tp.user_id
left join public.provider_matching_profiles as pm on pm.trainer_profile_id = tp.id
left join public.trainer_insurance_public_status as tips on tips.trainer_id = tp.id
where tp.profile_live = true
  and lower(coalesce(tp.verification_status::text, '')) = 'verified'
  and coalesce(u.is_active, true) = true;

grant select on public.marketplace_public_trainer_profiles_v1 to anon, authenticated;

commit;
