begin;

alter table public.trainer_profiles
  add column if not exists public_headline text,
  add column if not exists best_fit_summary text,
  add column if not exists marketplace_goal_tags text[] not null default '{}'::text[],
  add column if not exists service_boundaries text,
  add column if not exists consultation_expectations text,
  add column if not exists availability_confirmed_at timestamptz;

alter table public.trainer_profiles
  drop constraint if exists trainer_profiles_public_headline_length_check,
  add constraint trainer_profiles_public_headline_length_check
    check (public_headline is null or char_length(btrim(public_headline)) between 10 and 180),
  drop constraint if exists trainer_profiles_best_fit_summary_length_check,
  add constraint trainer_profiles_best_fit_summary_length_check
    check (best_fit_summary is null or char_length(best_fit_summary) <= 700),
  drop constraint if exists trainer_profiles_marketplace_goal_tags_count_check,
  add constraint trainer_profiles_marketplace_goal_tags_count_check
    check (cardinality(marketplace_goal_tags) <= 12),
  drop constraint if exists trainer_profiles_service_boundaries_length_check,
  add constraint trainer_profiles_service_boundaries_length_check
    check (service_boundaries is null or char_length(service_boundaries) <= 700),
  drop constraint if exists trainer_profiles_consultation_expectations_length_check,
  add constraint trainer_profiles_consultation_expectations_length_check
    check (consultation_expectations is null or char_length(consultation_expectations) <= 1000);

update public.trainer_profiles
set availability_confirmed_at = coalesce(availability_confirmed_at, updated_at, created_at)
where availability_confirmed_at is null;

alter table public.trainer_service_offerings
  add column if not exists intended_for text,
  add column if not exists included_items text[] not null default '{}'::text[],
  add column if not exists delivery_cadence text,
  add column if not exists minimum_commitment text,
  add column if not exists consultation_type text not null default 'unspecified',
  add column if not exists additional_costs_note text;

alter table public.trainer_service_offerings
  drop constraint if exists trainer_service_offerings_intended_for_length_check,
  add constraint trainer_service_offerings_intended_for_length_check
    check (intended_for is null or char_length(intended_for) <= 500),
  drop constraint if exists trainer_service_offerings_included_items_count_check,
  add constraint trainer_service_offerings_included_items_count_check
    check (cardinality(included_items) <= 12),
  drop constraint if exists trainer_service_offerings_delivery_cadence_length_check,
  add constraint trainer_service_offerings_delivery_cadence_length_check
    check (delivery_cadence is null or char_length(delivery_cadence) <= 240),
  drop constraint if exists trainer_service_offerings_minimum_commitment_length_check,
  add constraint trainer_service_offerings_minimum_commitment_length_check
    check (minimum_commitment is null or char_length(minimum_commitment) <= 240),
  drop constraint if exists trainer_service_offerings_consultation_type_check,
  add constraint trainer_service_offerings_consultation_type_check
    check (consultation_type in ('unspecified', 'free', 'paid', 'not_offered')),
  drop constraint if exists trainer_service_offerings_additional_costs_note_length_check,
  add constraint trainer_service_offerings_additional_costs_note_length_check
    check (additional_costs_note is null or char_length(additional_costs_note) <= 400);

alter table public.trainer_profile_inquiries
  add column if not exists service_offering_id uuid references public.trainer_service_offerings(id) on delete set null,
  add column if not exists request_key uuid not null default gen_random_uuid();

create unique index if not exists trainer_profile_inquiries_client_request_key_uidx
  on public.trainer_profile_inquiries (client_user_id, request_key);

create index if not exists trainer_profile_inquiries_service_offering_idx
  on public.trainer_profile_inquiries (service_offering_id)
  where service_offering_id is not null;

create or replace function public.marketplace_confirm_professional_availability()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.availability_confirmed_at := timezone('utc', now());
  elsif new.client_acceptance_status is distinct from old.client_acceptance_status
    or new.typical_availability is distinct from old.typical_availability
    or new.availability_details is distinct from old.availability_details
  then
    new.availability_confirmed_at := timezone('utc', now());
  elsif auth.uid() is not null and auth.role() <> 'service_role' then
    new.availability_confirmed_at := old.availability_confirmed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists marketplace_confirm_professional_availability on public.trainer_profiles;
create trigger marketplace_confirm_professional_availability
before insert or update on public.trainer_profiles
for each row execute function public.marketplace_confirm_professional_availability();

create or replace function public.marketplace_unpublish_decision_ready_profile_changes()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is not null
    and auth.role() <> 'service_role'
    and old.profile_live = true
    and (
      new.public_headline is distinct from old.public_headline
      or new.best_fit_summary is distinct from old.best_fit_summary
      or new.marketplace_goal_tags is distinct from old.marketplace_goal_tags
      or new.experience_levels_served is distinct from old.experience_levels_served
      or new.coaching_style is distinct from old.coaching_style
      or new.service_boundaries is distinct from old.service_boundaries
      or new.consultation_expectations is distinct from old.consultation_expectations
    )
  then
    new.profile_live := false;
    new.verification_status := 'pending'::public.verification_status;
  end if;
  return new;
end;
$$;

drop trigger if exists zzy_marketplace_unpublish_decision_ready_profile_changes on public.trainer_profiles;
create trigger zzy_marketplace_unpublish_decision_ready_profile_changes
before update on public.trainer_profiles
for each row execute function public.marketplace_unpublish_decision_ready_profile_changes();

create or replace function public.marketplace_sync_decision_ready_matching_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  update public.provider_matching_profiles
  set
    goal_tags = to_jsonb(coalesce(new.marketplace_goal_tags, '{}'::text[])),
    experience_tags = to_jsonb(coalesce(
      array(
        select level::text
        from unnest(coalesce(new.experience_levels_served, '{}'::public.fitness_level[])) as level
      ),
      '{}'::text[]
    )),
    updated_at = timezone('utc', now())
  where trainer_profile_id = new.id;
  return new;
end;
$$;

drop trigger if exists marketplace_sync_decision_ready_matching_fields on public.trainer_profiles;
create trigger marketplace_sync_decision_ready_matching_fields
after insert or update of marketplace_goal_tags, experience_levels_served on public.trainer_profiles
for each row execute function public.marketplace_sync_decision_ready_matching_fields();

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

  if nullif(btrim(trainer_profile_row.public_headline), '') is null then
    raise exception 'Add a profile headline before submitting.';
  end if;

  if nullif(btrim(trainer_profile_row.best_fit_summary), '') is null then
    raise exception 'Describe who you work best with before submitting.';
  end if;

  if trainer_profile_row.years_experience is null then
    raise exception 'Add years of relevant experience before submitting.';
  end if;

  if cardinality(trainer_profile_row.marketplace_goal_tags) = 0 then
    raise exception 'Choose at least one client goal before submitting.';
  end if;

  if cardinality(trainer_profile_row.experience_levels_served) = 0 then
    raise exception 'Choose at least one experience level before submitting.';
  end if;

  if nullif(btrim(trainer_profile_row.consultation_expectations), '') is null then
    raise exception 'Explain what happens after a consultation request before submitting.';
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
      or (
        upper(coalesce(trainer_profile_row.country_code, 'US')) in ('US', 'CA', 'AU')
        and nullif(btrim(trainer_profile_row.location_state), '') is null
      )
    )
  then
    raise exception 'Add the required service location for in-person services.';
  end if;

  if cardinality(trainer_profile_row.typical_availability) = 0 then
    raise exception 'Choose at least one typical availability window before submitting.';
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
    raise exception 'Add at least one active service before submitting.';
  end if;

  if not trainer_profile_row.contact_for_pricing
    and trainer_profile_row.marketplace_price_min_cents is null
    and not exists (
      select 1
      from public.trainer_service_offerings as offering
      where offering.trainer_profile_id = trainer_profile_row.id
        and offering.is_active = true
        and (offering.contact_for_pricing = true or offering.price_min_cents is not null)
    )
  then
    raise exception 'Add a starting price or choose Contact for pricing.';
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
      and (
        owner_user.auth_id = auth.uid()
        or (
          trainer.profile_live = true
          and lower(coalesce(trainer.verification_status::text, '')) = 'verified'
          and coalesce(owner_user.is_active, true) = true
          and trainer_service_offerings.is_active = true
        )
      )
  )
);

drop policy if exists trainer_profile_inquiries_insert_own on public.trainer_profile_inquiries;
create policy trainer_profile_inquiries_insert_own
on public.trainer_profile_inquiries
for insert
to authenticated
with check (
  client_user_id = public.marketplace_current_user_id()
  and (
    client_profile_id is null
    or exists (
      select 1
      from public.client_profiles as client
      where client.id = trainer_profile_inquiries.client_profile_id
        and client.user_id = public.marketplace_current_user_id()
    )
  )
  and exists (
    select 1
    from public.trainer_profiles as trainer
    join public.users as owner_user on owner_user.id = trainer.user_id
    where trainer.id = trainer_profile_inquiries.trainer_profile_id
      and trainer.profile_live = true
      and lower(coalesce(trainer.verification_status::text, '')) = 'verified'
      and coalesce(owner_user.is_active, true) = true
      and coalesce(trainer.client_acceptance_status, 'accepting') in ('accepting', 'waitlist')
  )
  and (
    service_offering_id is null
    or exists (
      select 1
      from public.trainer_service_offerings as offering
      where offering.id = trainer_profile_inquiries.service_offering_id
        and offering.trainer_profile_id = trainer_profile_inquiries.trainer_profile_id
        and offering.is_active = true
        and offering.consultation_type <> 'not_offered'
    )
  )
  and (
    service_category_id is null
    or exists (
      select 1
      from public.trainer_services as linked_category
      where linked_category.trainer_profile_id = trainer_profile_inquiries.trainer_profile_id
        and linked_category.service_category_id = trainer_profile_inquiries.service_category_id
    )
  )
);

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
  current_profile.service_offerings,
  profile.languages,
  profile.marketplace_specialties,
  profile.public_headline,
  profile.best_fit_summary,
  profile.marketplace_goal_tags,
  coalesce(
    array(
      select level::text
      from unnest(coalesce(profile.experience_levels_served, '{}'::public.fitness_level[])) as level
    ),
    '{}'::text[]
  ) as experience_levels_served,
  profile.service_boundaries,
  profile.consultation_expectations,
  profile.availability_confirmed_at,
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
          'is_active', offering.is_active,
          'currency_code', offering.currency_code,
          'intended_for', offering.intended_for,
          'included_items', offering.included_items,
          'delivery_cadence', offering.delivery_cadence,
          'minimum_commitment', offering.minimum_commitment,
          'consultation_type', offering.consultation_type,
          'additional_costs_note', offering.additional_costs_note
        )
        order by offering.sort_order, offering.created_at
      )
      from public.trainer_service_offerings as offering
      where offering.trainer_profile_id = profile.id
        and offering.is_active = true
    ),
    '[]'::jsonb
  ) as decision_ready_service_offerings
from public.marketplace_public_trainer_profiles_v1 as current_profile
join public.trainer_profiles as profile on profile.id = current_profile.trainer_profile_id
join public.users as account on account.id = profile.user_id;

comment on column public.marketplace_public_trainer_profiles_v2.languages is
  'Optional languages the professional has chosen to display as languages used with clients.';
comment on column public.marketplace_public_trainer_profiles_v2.marketplace_specialties is
  'Professional-selected specialty labels kept separate from client goal tags.';
comment on column public.marketplace_public_trainer_profiles_v2.decision_ready_service_offerings is
  'Only active, public-safe service details. Does not create a purchasable package or checkout entitlement.';

grant select on public.marketplace_public_trainer_profiles_v2 to anon, authenticated, service_role;

commit;
