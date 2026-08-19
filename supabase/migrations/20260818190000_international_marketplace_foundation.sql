-- Additive international-ready marketplace fields. Legacy state and mile columns
-- remain in place for compatibility with the existing app and admin project.

begin;

alter table public.trainer_profiles
  add column if not exists country_code text,
  add column if not exists postal_code text,
  add column if not exists marketplace_currency_code text;

alter table public.trainer_locations
  add column if not exists country_code text,
  add column if not exists postal_code text,
  add column if not exists service_radius_meters integer;

-- Online-only professionals should not inherit a geographic radius. Keep the
-- legacy field for compatibility, but allow it to represent no radius.
alter table public.trainer_locations
  alter column service_radius_miles drop default,
  alter column service_radius_miles drop not null;

alter table public.client_profiles
  add column if not exists country_code text,
  add column if not exists postal_code text,
  add column if not exists preferred_radius_meters integer,
  add column if not exists budget_currency_code text;

alter table public.provider_matching_profiles
  add column if not exists currency_code text;

alter table public.trainer_service_offerings
  add column if not exists currency_code text;

alter table public.certifications
  add column if not exists credential_country_code text,
  add column if not exists credential_jurisdiction text;

-- Existing location_state remains the compatibility field for state, province,
-- territory, county, or region. Country gives that value its proper context.
update public.trainer_profiles
set country_code = 'US'
where country_code is null
  and upper(coalesce(location_state, '')) = any(array[
    'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY',
    'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH',
    'OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','AS','GU','MP','PR','VI'
  ]);

update public.trainer_locations
set country_code = 'US'
where country_code is null
  and upper(coalesce(location_state, '')) = any(array[
    'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY',
    'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH',
    'OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','AS','GU','MP','PR','VI'
  ]);

update public.client_profiles
set country_code = 'US'
where country_code is null
  and upper(coalesce(location_state, '')) = any(array[
    'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY',
    'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH',
    'OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','AS','GU','MP','PR','VI'
  ]);

-- Preserve exact legacy mile meaning. The old columns remain available until all
-- consuming applications have verified the meter-based values.
update public.trainer_locations
set service_radius_meters = round(service_radius_miles * 1609.344)::integer
where service_radius_meters is null
  and service_radius_miles is not null;

update public.client_profiles
set preferred_radius_meters = round(preferred_radius_miles * 1609.344)::integer
where preferred_radius_meters is null
  and preferred_radius_miles is not null;

-- Current marketplace prices were entered as U.S. dollars. No amount conversion
-- is performed; future profiles explicitly save their selected ISO currency code.
update public.trainer_profiles
set marketplace_currency_code = 'USD'
where marketplace_currency_code is null
  and (marketplace_price_min_cents is not null or marketplace_price_max_cents is not null);

update public.provider_matching_profiles
set currency_code = 'USD'
where currency_code is null
  and (price_min_cents is not null or price_max_cents is not null);

update public.trainer_service_offerings
set currency_code = 'USD'
where currency_code is null
  and (price_min_cents is not null or price_max_cents is not null);

update public.client_profiles
set budget_currency_code = 'USD'
where budget_currency_code is null
  and (budget_min is not null or budget_max is not null);

alter table public.trainer_profiles
  drop constraint if exists trainer_profiles_country_code_check,
  add constraint trainer_profiles_country_code_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  drop constraint if exists trainer_profiles_marketplace_currency_code_check,
  add constraint trainer_profiles_marketplace_currency_code_check
    check (marketplace_currency_code is null or marketplace_currency_code ~ '^[A-Z]{3}$');

alter table public.trainer_locations
  drop constraint if exists trainer_locations_country_code_check,
  add constraint trainer_locations_country_code_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  drop constraint if exists trainer_locations_service_radius_meters_check,
  add constraint trainer_locations_service_radius_meters_check
    check (service_radius_meters is null or service_radius_meters between 1 and 500000);

alter table public.client_profiles
  drop constraint if exists client_profiles_country_code_check,
  add constraint client_profiles_country_code_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  drop constraint if exists client_profiles_preferred_radius_meters_check,
  add constraint client_profiles_preferred_radius_meters_check
    check (preferred_radius_meters is null or preferred_radius_meters between 1 and 500000),
  drop constraint if exists client_profiles_budget_currency_code_check,
  add constraint client_profiles_budget_currency_code_check
    check (budget_currency_code is null or budget_currency_code ~ '^[A-Z]{3}$');

alter table public.provider_matching_profiles
  drop constraint if exists provider_matching_profiles_currency_code_check,
  add constraint provider_matching_profiles_currency_code_check
    check (currency_code is null or currency_code ~ '^[A-Z]{3}$');

alter table public.trainer_service_offerings
  drop constraint if exists trainer_service_offerings_currency_code_check,
  add constraint trainer_service_offerings_currency_code_check
    check (currency_code is null or currency_code ~ '^[A-Z]{3}$');

alter table public.certifications
  drop constraint if exists certifications_credential_country_code_check,
  add constraint certifications_credential_country_code_check
    check (credential_country_code is null or credential_country_code ~ '^[A-Z]{2}$');

create index if not exists trainer_profiles_country_region_city_idx
  on public.trainer_profiles (country_code, location_state, location_city);

create index if not exists trainer_locations_country_region_city_idx
  on public.trainer_locations (country_code, location_state, location_city);

create index if not exists client_profiles_country_region_city_idx
  on public.client_profiles (country_code, location_state, location_city);

comment on column public.trainer_profiles.location_state is
  'Legacy-compatible state/province/territory/region value; interpret with country_code.';
comment on column public.trainer_locations.service_radius_meters is
  'Canonical service radius in meters. service_radius_miles is retained temporarily for compatibility.';
comment on column public.client_profiles.preferred_radius_meters is
  'Canonical preferred travel radius in meters. preferred_radius_miles is retained temporarily for compatibility.';
comment on column public.certifications.credential_jurisdiction is
  'Professional-submitted jurisdiction context only; it does not establish verification or cross-border validity.';

-- This supplemental approved-only view lets the static website consume the new
-- fields without replacing the admin-compatible public profile view.
create or replace view public.marketplace_public_trainer_international_v1 as
select
  tp.id as trainer_profile_id,
  coalesce(primary_location.country_code, tp.country_code) as country_code,
  coalesce(primary_location.location_city, tp.location_city) as location_city,
  coalesce(primary_location.location_state, tp.location_state) as location_region,
  coalesce(primary_location.postal_code, tp.postal_code) as postal_code,
  primary_location.lat as latitude,
  primary_location.lng as longitude,
  primary_location.service_radius_meters,
  coalesce(tp.marketplace_currency_code, pm.currency_code, 'USD') as currency_code
from public.trainer_profiles as tp
join public.users as owner_user on owner_user.id = tp.user_id
left join lateral (
  select location.*
  from public.trainer_locations as location
  where location.trainer_profile_id = tp.id
  order by location.is_primary desc, location.created_at asc
  limit 1
) as primary_location on true
left join public.provider_matching_profiles as pm on pm.trainer_profile_id = tp.id
where tp.profile_live = true
  and lower(coalesce(tp.verification_status::text, '')) = 'verified'
  and coalesce(owner_user.is_active, true) = true;

grant select on public.marketplace_public_trainer_international_v1 to anon, authenticated;

-- Changing new public profile fields follows the same re-review behavior as
-- existing public fields. Administrative status remains protected elsewhere.
create or replace function public.marketplace_unpublish_changed_professional_profile()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin')
    or auth.role() = 'service_role'
  then
    return new;
  end if;

  if old.profile_live = true
    and (
      new.public_display_name is distinct from old.public_display_name
      or new.professional_title is distinct from old.professional_title
      or new.bio is distinct from old.bio
      or new.years_experience is distinct from old.years_experience
      or new.location_city is distinct from old.location_city
      or new.location_state is distinct from old.location_state
      or new.country_code is distinct from old.country_code
      or new.postal_code is distinct from old.postal_code
      or new.primary_specialty is distinct from old.primary_specialty
      or new.secondary_specialties is distinct from old.secondary_specialties
      or new.marketplace_specialties is distinct from old.marketplace_specialties
      or new.modality is distinct from old.modality
      or new.accepting_clients is distinct from old.accepting_clients
      or new.client_acceptance_status is distinct from old.client_acceptance_status
      or new.typical_availability is distinct from old.typical_availability
      or new.availability_details is distinct from old.availability_details
      or new.marketplace_price_min_cents is distinct from old.marketplace_price_min_cents
      or new.marketplace_price_max_cents is distinct from old.marketplace_price_max_cents
      or new.marketplace_pricing_basis is distinct from old.marketplace_pricing_basis
      or new.marketplace_currency_code is distinct from old.marketplace_currency_code
      or new.contact_for_pricing is distinct from old.contact_for_pricing
      or new.website_url is distinct from old.website_url
      or new.social_links is distinct from old.social_links
      or new.languages is distinct from old.languages
    )
  then
    new.profile_live := false;
    new.verification_status := 'pending'::public.verification_status;
  end if;

  return new;
end;
$$;

commit;
