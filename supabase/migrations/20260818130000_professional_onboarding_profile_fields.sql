-- Extend the existing Elevare trainer marketplace model for professional onboarding.
-- Category membership remains in trainer_services; client-facing offerings use a
-- separate table because a professional can offer multiple services per category.

begin;

alter table public.trainer_profiles
  add column if not exists marketplace_specialties text[] not null default '{}'::text[],
  add column if not exists client_acceptance_status text not null default 'accepting',
  add column if not exists typical_availability text[] not null default '{}'::text[],
  add column if not exists availability_details text,
  add column if not exists marketplace_price_min_cents integer,
  add column if not exists marketplace_price_max_cents integer,
  add column if not exists marketplace_pricing_basis text,
  add column if not exists contact_for_pricing boolean not null default false,
  add column if not exists website_url text,
  add column if not exists social_links jsonb not null default '{}'::jsonb;

alter table public.provider_matching_profiles
  add column if not exists pricing_basis text,
  add column if not exists contact_for_pricing boolean not null default false;

alter table public.certifications
  add column if not exists issue_date date;

alter table public.trainer_profiles
  drop constraint if exists trainer_profiles_bio_check;

alter table public.trainer_profiles
  add constraint trainer_profiles_bio_check
  check (bio is null or char_length(bio) <= 4000);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_profiles_client_acceptance_status_check'
      and conrelid = 'public.trainer_profiles'::regclass
  ) then
    alter table public.trainer_profiles
      add constraint trainer_profiles_client_acceptance_status_check
      check (client_acceptance_status in ('accepting', 'waitlist', 'not_accepting'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_profiles_typical_availability_check'
      and conrelid = 'public.trainer_profiles'::regclass
  ) then
    alter table public.trainer_profiles
      add constraint trainer_profiles_typical_availability_check
      check (typical_availability <@ array['mornings', 'afternoons', 'evenings', 'weekends']::text[]);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_profiles_marketplace_price_range_check'
      and conrelid = 'public.trainer_profiles'::regclass
  ) then
    alter table public.trainer_profiles
      add constraint trainer_profiles_marketplace_price_range_check
      check (
        (marketplace_price_min_cents is null or marketplace_price_min_cents >= 0)
        and (marketplace_price_max_cents is null or marketplace_price_max_cents >= 0)
        and (
          marketplace_price_min_cents is null
          or marketplace_price_max_cents is null
          or marketplace_price_max_cents >= marketplace_price_min_cents
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_profiles_marketplace_pricing_basis_check'
      and conrelid = 'public.trainer_profiles'::regclass
  ) then
    alter table public.trainer_profiles
      add constraint trainer_profiles_marketplace_pricing_basis_check
      check (
        marketplace_pricing_basis is null
        or marketplace_pricing_basis in ('session', 'hour', 'class', 'consultation', 'week', 'month', 'package')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'trainer_profiles_social_links_object_check'
      and conrelid = 'public.trainer_profiles'::regclass
  ) then
    alter table public.trainer_profiles
      add constraint trainer_profiles_social_links_object_check
      check (jsonb_typeof(social_links) = 'object');
  end if;
end;
$$;

update public.trainer_profiles
set
  client_acceptance_status = case
    when coalesce(accepting_clients, true) then 'accepting'
    else 'not_accepting'
  end,
  marketplace_specialties = case
    when cardinality(marketplace_specialties) > 0 then marketplace_specialties
    else array_remove(
      array[primary_specialty::text] || coalesce(
        array(
          select secondary_specialty::text
          from unnest(secondary_specialties) as secondary_specialty
        ),
        '{}'::text[]
      ),
      null
    )
  end
where client_acceptance_status = 'accepting'
   or cardinality(marketplace_specialties) = 0;

update public.trainer_profiles as trainer
set
  marketplace_price_min_cents = coalesce(trainer.marketplace_price_min_cents, matching.price_min_cents),
  marketplace_price_max_cents = coalesce(trainer.marketplace_price_max_cents, matching.price_max_cents),
  typical_availability = case
    when cardinality(trainer.typical_availability) > 0 then trainer.typical_availability
    when jsonb_typeof(matching.availability_summary -> 'windows') = 'array' then
      array(
        select availability_window.value
        from jsonb_array_elements_text(matching.availability_summary -> 'windows')
          as availability_window(value)
        where availability_window.value in ('mornings', 'afternoons', 'evenings', 'weekends')
      )
    else '{}'::text[]
  end,
  availability_details = coalesce(
    trainer.availability_details,
    nullif(matching.availability_summary ->> 'details', '')
  )
from public.provider_matching_profiles as matching
where matching.trainer_profile_id = trainer.id;

create table if not exists public.trainer_service_offerings (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete cascade,
  name text not null,
  description text,
  service_mode text,
  duration_minutes integer,
  price_min_cents integer,
  price_max_cents integer,
  pricing_basis text,
  contact_for_pricing boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trainer_service_offerings_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint trainer_service_offerings_description_check check (description is null or char_length(description) <= 1000),
  constraint trainer_service_offerings_mode_check check (
    service_mode is null or service_mode in ('in_person', 'online', 'hybrid')
  ),
  constraint trainer_service_offerings_duration_check check (
    duration_minutes is null or duration_minutes between 5 and 1440
  ),
  constraint trainer_service_offerings_price_check check (
    (price_min_cents is null or price_min_cents >= 0)
    and (price_max_cents is null or price_max_cents >= 0)
    and (price_min_cents is null or price_max_cents is null or price_max_cents >= price_min_cents)
  ),
  constraint trainer_service_offerings_pricing_basis_check check (
    pricing_basis is null or pricing_basis in ('session', 'hour', 'class', 'consultation', 'week', 'month', 'package')
  )
);

create index if not exists trainer_service_offerings_profile_idx
  on public.trainer_service_offerings (trainer_profile_id, is_active, sort_order, created_at);

drop trigger if exists trainer_service_offerings_set_updated_at on public.trainer_service_offerings;
create trigger trainer_service_offerings_set_updated_at
before update on public.trainer_service_offerings
for each row execute function public.marketplace_set_updated_at();

alter table public.trainer_service_offerings enable row level security;

drop policy if exists trainer_service_offerings_select_visible on public.trainer_service_offerings;
create policy trainer_service_offerings_select_visible
on public.trainer_service_offerings
for select
to authenticated
using (
  exists (
    select 1
    from public.trainer_profiles as trainer
    join public.users as owner_user on owner_user.id = trainer.user_id
    where trainer.id = trainer_service_offerings.trainer_profile_id
      and (trainer.profile_live = true or owner_user.auth_id = auth.uid())
  )
);

drop policy if exists trainer_service_offerings_insert_own on public.trainer_service_offerings;
create policy trainer_service_offerings_insert_own
on public.trainer_service_offerings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.trainer_profiles as trainer
    join public.users as owner_user on owner_user.id = trainer.user_id
    where trainer.id = trainer_service_offerings.trainer_profile_id
      and owner_user.auth_id = auth.uid()
  )
);

drop policy if exists trainer_service_offerings_update_own on public.trainer_service_offerings;
create policy trainer_service_offerings_update_own
on public.trainer_service_offerings
for update
to authenticated
using (
  exists (
    select 1
    from public.trainer_profiles as trainer
    join public.users as owner_user on owner_user.id = trainer.user_id
    where trainer.id = trainer_service_offerings.trainer_profile_id
      and owner_user.auth_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trainer_profiles as trainer
    join public.users as owner_user on owner_user.id = trainer.user_id
    where trainer.id = trainer_service_offerings.trainer_profile_id
      and owner_user.auth_id = auth.uid()
  )
);

drop policy if exists trainer_service_offerings_delete_own on public.trainer_service_offerings;
create policy trainer_service_offerings_delete_own
on public.trainer_service_offerings
for delete
to authenticated
using (
  exists (
    select 1
    from public.trainer_profiles as trainer
    join public.users as owner_user on owner_user.id = trainer.user_id
    where trainer.id = trainer_service_offerings.trainer_profile_id
      and owner_user.auth_id = auth.uid()
  )
);

grant select, insert, update, delete on public.trainer_service_offerings to authenticated;

create or replace function public.marketplace_guard_professional_admin_fields()
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

  if tg_op = 'INSERT' then
    new.verification_status := 'pending'::public.verification_status;
    new.profile_live := false;
    new.certs_verified := false;
    new.review_feedback_public := null;
    new.last_submitted_at := null;
    new.onboarding_complete := false;
    new.profile_complete := false;
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status
    or new.profile_live is distinct from old.profile_live
    or new.certs_verified is distinct from old.certs_verified
    or new.review_feedback_public is distinct from old.review_feedback_public
    or new.last_submitted_at is distinct from old.last_submitted_at
    or new.onboarding_complete is distinct from old.onboarding_complete
    or new.profile_complete is distinct from old.profile_complete
    or new.public_slug is distinct from old.public_slug
    or new.background_check_status is distinct from old.background_check_status
    or new.background_check_id is distinct from old.background_check_id
    or new.background_check_candidate_id is distinct from old.background_check_candidate_id
    or new.background_check_invitation_id is distinct from old.background_check_invitation_id
    or new.background_check_report_id is distinct from old.background_check_report_id
    or new.background_check_result is distinct from old.background_check_result
  then
    raise exception 'Administrative profile fields can only be updated by Elevare review systems.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_marketplace_professional_admin_fields on public.trainer_profiles;
create trigger trg_guard_marketplace_professional_admin_fields
before insert or update on public.trainer_profiles
for each row execute function public.marketplace_guard_professional_admin_fields();

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
      or new.contact_for_pricing is distinct from old.contact_for_pricing
      or new.website_url is distinct from old.website_url
      or new.social_links is distinct from old.social_links
    )
  then
    new.profile_live := false;
    new.verification_status := 'pending'::public.verification_status;
  end if;

  return new;
end;
$$;

drop trigger if exists zzz_marketplace_unpublish_changed_professional_profile on public.trainer_profiles;
create trigger zzz_marketplace_unpublish_changed_professional_profile
before update on public.trainer_profiles
for each row execute function public.marketplace_unpublish_changed_professional_profile();

create or replace function public.marketplace_unpublish_profile_for_related_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  source_row jsonb;
  profile_id uuid;
begin
  if auth.role() = 'service_role' or auth.uid() is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  source_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  profile_id := coalesce(
    nullif(source_row ->> 'trainer_profile_id', ''),
    nullif(source_row ->> 'trainer_id', '')
  )::uuid;

  if profile_id is not null then
    perform set_config('elevare.allow_sensitive_trainer_profile_update', 'on', true);

    update public.trainer_profiles
    set
      profile_live = false,
      verification_status = 'pending'::public.verification_status
    where id = profile_id
      and profile_live = true;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trainer_service_offerings_unpublish_profile on public.trainer_service_offerings;
create trigger trainer_service_offerings_unpublish_profile
after insert or update or delete on public.trainer_service_offerings
for each row execute function public.marketplace_unpublish_profile_for_related_change();

drop trigger if exists trainer_services_unpublish_profile on public.trainer_services;
create trigger trainer_services_unpublish_profile
after insert or update or delete on public.trainer_services
for each row execute function public.marketplace_unpublish_profile_for_related_change();

drop trigger if exists trainer_locations_unpublish_profile on public.trainer_locations;
create trigger trainer_locations_unpublish_profile
after insert or update or delete on public.trainer_locations
for each row execute function public.marketplace_unpublish_profile_for_related_change();

drop trigger if exists certifications_unpublish_profile on public.certifications;
create trigger certifications_unpublish_profile
after insert or update or delete on public.certifications
for each row execute function public.marketplace_unpublish_profile_for_related_change();

create or replace function public.marketplace_guard_credential_verification_fields()
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

  if tg_op = 'INSERT' then
    new.verification_status := 'pending'::public.verification_status;
    new.verified_at := null;
    new.verified_by := null;
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status
    or new.verified_at is distinct from old.verified_at
    or new.verified_by is distinct from old.verified_by
  then
    raise exception 'Credential verification fields can only be updated by Elevare review systems.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_marketplace_credential_verification_fields on public.certifications;
create trigger trg_guard_marketplace_credential_verification_fields
before insert or update on public.certifications
for each row execute function public.marketplace_guard_credential_verification_fields();

create or replace function public.refresh_provider_matching_profile(p_trainer_profile_id uuid)
returns void
language plpgsql
as $$
declare
  trainer_record public.trainer_profiles%rowtype;
  primary_service_category_id uuid;
  delivery_modes_payload jsonb;
  goal_tags_payload jsonb;
  experience_tags_payload jsonb;
  available_locations_payload jsonb;
  availability_summary_payload jsonb;
  price_min_value integer;
  price_max_value integer;
  served_levels public.fitness_level[];
begin
  select * into trainer_record
  from public.trainer_profiles
  where id = p_trainer_profile_id;

  if trainer_record.id is null then
    delete from public.provider_matching_profiles
    where trainer_profile_id = p_trainer_profile_id;
    return;
  end if;

  select trainer_service.service_category_id
  into primary_service_category_id
  from public.trainer_services as trainer_service
  where trainer_service.trainer_profile_id = p_trainer_profile_id
    and trainer_service.is_primary = true
  order by trainer_service.created_at, trainer_service.id
  limit 1;

  delivery_modes_payload := case coalesce(trainer_record.modality, 'in_person'::public.modality)
    when 'both'::public.modality then '["in_person","online","hybrid"]'::jsonb
    when 'online'::public.modality then '["online"]'::jsonb
    else '["in_person"]'::jsonb
  end;

  select coalesce(jsonb_agg(goal_value order by goal_value), '[]'::jsonb)
  into goal_tags_payload
  from (
    select distinct goal_value
    from unnest(
      case
        when cardinality(trainer_record.marketplace_specialties) > 0 then trainer_record.marketplace_specialties
        else array[trainer_record.primary_specialty::text]
          || coalesce(
            array(
              select secondary_specialty::text
              from unnest(trainer_record.secondary_specialties) as secondary_specialty
            ),
            '{}'::text[]
          )
      end
    ) as goal_value
    where goal_value is not null and btrim(goal_value) <> ''
  ) as goal_values;

  select coalesce(jsonb_agg(level_value order by level_value), '[]'::jsonb)
  into experience_tags_payload
  from (
    select distinct level_value
    from unnest(coalesce(trainer_record.experience_levels_served, '{}'::public.fitness_level[])) as level_value
  ) as experience_values;

  select min(package.price_cents), max(package.price_cents)
  into price_min_value, price_max_value
  from public.packages as package
  where package.trainer_profile_id = p_trainer_profile_id
    and coalesce(package.is_active, true) = true;

  price_min_value := coalesce(price_min_value, trainer_record.marketplace_price_min_cents);
  price_max_value := coalesce(price_max_value, trainer_record.marketplace_price_max_cents);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'location_name', location.location_name,
        'city', location.location_city,
        'state', location.location_state,
        'lat', location.lat,
        'lng', location.lng,
        'service_radius_miles', location.service_radius_miles,
        'is_primary', location.is_primary
      ) order by location.is_primary desc, location.created_at asc
    ),
    '[]'::jsonb
  )
  into available_locations_payload
  from public.trainer_locations as location
  where location.trainer_profile_id = p_trainer_profile_id;

  availability_summary_payload := jsonb_build_object(
    'days', '[]'::jsonb,
    'windows', to_jsonb(coalesce(trainer_record.typical_availability, '{}'::text[])),
    'details', coalesce(trainer_record.availability_details, '')
  );

  served_levels := coalesce(
    trainer_record.experience_levels_served,
    array['beginner'::public.fitness_level, 'intermediate'::public.fitness_level, 'advanced'::public.fitness_level]
  );

  insert into public.provider_matching_profiles (
    trainer_profile_id,
    primary_service_category_id,
    delivery_modes,
    goal_tags,
    experience_tags,
    price_min_cents,
    price_max_cents,
    available_locations,
    availability_summary,
    accepts_beginner_clients,
    accepts_intermediate_clients,
    accepts_advanced_clients,
    rating_avg,
    reliability_score,
    pricing_basis,
    contact_for_pricing
  )
  values (
    p_trainer_profile_id,
    primary_service_category_id,
    delivery_modes_payload,
    goal_tags_payload,
    experience_tags_payload,
    price_min_value,
    price_max_value,
    available_locations_payload,
    availability_summary_payload,
    'beginner'::public.fitness_level = any(served_levels),
    'intermediate'::public.fitness_level = any(served_levels),
    'advanced'::public.fitness_level = any(served_levels),
    trainer_record.average_rating,
    trainer_record.reliability_score,
    trainer_record.marketplace_pricing_basis,
    trainer_record.contact_for_pricing
  )
  on conflict (trainer_profile_id) do update
  set
    primary_service_category_id = excluded.primary_service_category_id,
    delivery_modes = excluded.delivery_modes,
    goal_tags = excluded.goal_tags,
    experience_tags = excluded.experience_tags,
    price_min_cents = excluded.price_min_cents,
    price_max_cents = excluded.price_max_cents,
    available_locations = excluded.available_locations,
    availability_summary = excluded.availability_summary,
    accepts_beginner_clients = excluded.accepts_beginner_clients,
    accepts_intermediate_clients = excluded.accepts_intermediate_clients,
    accepts_advanced_clients = excluded.accepts_advanced_clients,
    rating_avg = excluded.rating_avg,
    reliability_score = excluded.reliability_score,
    pricing_basis = excluded.pricing_basis,
    contact_for_pricing = excluded.contact_for_pricing,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.submit_current_trainer_profile_for_review(
  requested_email text default null,
  request_notes text default null
)
returns public.trainer_verification_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  app_user_id uuid;
  trainer_profile_row public.trainer_profiles%rowtype;
  latest_request public.trainer_verification_requests%rowtype;
  resolved_email text;
  profile_photo_url text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  app_user_id := public.marketplace_current_user_id();

  if app_user_id is null then
    raise exception 'No public user record exists for the current authenticated user.';
  end if;

  select trainer.*
  into trainer_profile_row
  from public.trainer_profiles as trainer
  where trainer.user_id = app_user_id
  order by trainer.updated_at desc, trainer.created_at desc
  limit 1;

  if trainer_profile_row.id is null then
    raise exception 'Create your professional profile before submitting it for review.';
  end if;

  select users.profile_photo_url
  into profile_photo_url
  from public.users as users
  where users.id = app_user_id;

  if nullif(btrim(trainer_profile_row.public_display_name), '') is null then
    raise exception 'Add your name before submitting.';
  end if;

  if nullif(btrim(trainer_profile_row.professional_title), '') is null then
    raise exception 'Add your professional title before submitting.';
  end if;

  if nullif(btrim(trainer_profile_row.bio), '') is null then
    raise exception 'Add your bio before submitting.';
  end if;

  if nullif(btrim(profile_photo_url), '') is null then
    raise exception 'Add a profile photo before submitting.';
  end if;

  if cardinality(trainer_profile_row.marketplace_specialties) = 0 then
    raise exception 'Choose at least one specialty before submitting.';
  end if;

  if trainer_profile_row.modality is null then
    raise exception 'Choose at least one service mode before submitting.';
  end if;

  if trainer_profile_row.modality <> 'online'::public.modality
    and (
      nullif(btrim(trainer_profile_row.location_city), '') is null
      or nullif(btrim(trainer_profile_row.location_state), '') is null
    )
  then
    raise exception 'Add a city and state for in-person services.';
  end if;

  if cardinality(trainer_profile_row.typical_availability) = 0 then
    raise exception 'Choose at least one typical availability window before submitting.';
  end if;

  if not trainer_profile_row.contact_for_pricing
    and trainer_profile_row.marketplace_price_min_cents is null
  then
    raise exception 'Add a starting price or choose Contact for pricing.';
  end if;

  if not exists (
    select 1 from public.trainer_services
    where trainer_profile_id = trainer_profile_row.id and is_primary = true
  ) then
    raise exception 'Choose a primary category before submitting.';
  end if;

  if not exists (
    select 1 from public.trainer_service_offerings
    where trainer_profile_id = trainer_profile_row.id and is_active = true
  ) then
    raise exception 'Add at least one service before submitting.';
  end if;

  perform set_config('elevare.allow_sensitive_trainer_profile_update', 'on', true);

  update public.trainer_profiles
  set
    last_submitted_at = timezone('utc', now()),
    onboarding_complete = true,
    profile_complete = true,
    verification_status = 'pending'::public.verification_status,
    profile_live = false
  where id = trainer_profile_row.id;

  resolved_email := coalesce(
    nullif(btrim(requested_email), ''),
    (select users.email from public.users as users where users.id = app_user_id limit 1)
  );

  select request.*
  into latest_request
  from public.trainer_verification_requests as request
  where request.trainer_profile_id = trainer_profile_row.id
    and lower(coalesce(request.request_status, '')) = 'pending'
  order by coalesce(request.updated_at, request.requested_at, request.created_at) desc
  limit 1;

  if latest_request.id is not null then
    return latest_request;
  end if;

  insert into public.trainer_verification_requests (
    trainer_profile_id,
    trainer_user_id,
    requested_email,
    request_status,
    requested_at,
    notes,
    metadata,
    created_at,
    updated_at
  )
  values (
    trainer_profile_row.id,
    app_user_id,
    resolved_email,
    'pending',
    timezone('utc', now()),
    request_notes,
    jsonb_build_object('source', 'website_marketplace', 'submitted_via', 'marketplace_submit_function'),
    timezone('utc', now()),
    timezone('utc', now())
  )
  returning * into latest_request;

  return latest_request;
end;
$$;

grant execute on function public.submit_current_trainer_profile_for_review(text, text) to authenticated;

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
          'credential_number', coalesce(nullif(c.credential_number, ''), nullif(c.cert_id, '')),
          'issue_date', c.issue_date,
          'expiration_date', coalesce(c.expiration_date, c.expiry_date),
          'verification_status', c.verification_status,
          'document_url', c.document_url,
          'supporting_reference_url', c.supporting_reference_url
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
