-- Runtime public reads and durable invalidation. No production webhook is activated.
begin;

-- The existing security-invoker trust projection needs only these auth columns.
-- No auth row is serialized by the public contract.
grant select (id, email_confirmed_at) on auth.users to service_role;

-- Public browsing uses the server projection. Owner/admin authenticated RLS and
-- consultation policies retain their established behavior.
revoke select on public.users, public.trainer_profiles, public.certifications,
  public.trainer_locations, public.trainer_service_offerings, public.provider_matching_profiles from anon;

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
join public.users as account on account.id = profile.user_id
where account.is_active = true
  and coalesce((to_jsonb(profile)->>'is_active')::boolean,true) = true
  and coalesce((to_jsonb(profile)->>'is_deleted')::boolean,false) = false
  and coalesce((to_jsonb(account)->>'is_deleted')::boolean,false) = false
  and exists(select 1 from auth.users auth_account where auth_account.id = account.auth_id)
  and (profile.reliability_suspended_until is null or profile.reliability_suspended_until <= now())
  and coalesce(to_jsonb(profile)->>'deleted_at','') = ''
  and coalesce(to_jsonb(account)->>'deleted_at','') = '';



create or replace view public.marketplace_public_professionals_v3
with (security_invoker = true) as
select p.trainer_profile_id as professional_id, p.public_slug as slug,
  (select to_jsonb(safe) from (select
    p.price_min_cents,
    p.price_max_cents,
    p.pricing_basis,
    p.contact_for_pricing,
    p.trainer_profile_id,
    p.service_categories,
    p.marketplace_specialties,
    p.primary_specialty,
    p.secondary_specialties,
    p.delivery_modes,
    p.decision_ready_service_offerings,
    p.display_name,
    p.profile_photo_url,
    p.professional_title,
    p.bio,
    p.years_experience,
    p.public_headline,
    p.best_fit_summary,
    p.marketplace_goal_tags,
    p.goal_tags,
    p.experience_levels_served,
    p.experience_tags,
    p.coaching_style,
    p.service_boundaries,
    p.consultation_expectations,
    p.languages,
    p.location_city,
    p.location_state,
    p.availability_summary,
    p.typical_availability,
    p.availability_details,
    p.availability_confirmed_at,
    p.client_acceptance_status,
    p.website_url,
    jsonb_strip_nulls(jsonb_build_object(
      'website_label',p.social_links->'website_label','instagram',p.social_links->'instagram',
      'facebook',p.social_links->'facebook','tiktok',p.social_links->'tiktok',
      'youtube',p.social_links->'youtube','linkedin',p.social_links->'linkedin'
    )) as social_links,
    p.created_at,
    p.updated_at,
    p.public_slug,
    '[]'::jsonb as certifications, '[]'::jsonb as locations, '[]'::jsonb as available_locations,
    '[]'::jsonb as service_offerings
  ) safe) as profile,
  (select to_jsonb(safe) from (select i.trainer_profile_id, i.country_code, i.location_city,
    i.location_region, i.service_radius_meters, i.currency_code) safe) as international,
  (select to_jsonb(safe) from (select t.trainer_profile_id, t.profile_reviewed, t.profile_reviewed_at,
    t.email_verified, t.phone_verified, t.identity_verified, t.identity_verified_at,
    t.verified_credentials, t.claimed_credentials, t.background_check_completed,
    t.background_check_completed_at, t.insurance_confirmed, t.insurance_confirmed_through,
    t.profile_information_confirmed_at, t.account_in_good_standing) safe) as trust
from public.marketplace_public_trainer_profiles_v2 p
join public.trainer_profiles owner on owner.id = p.trainer_profile_id
join public.users account on account.id = owner.user_id
join public.marketplace_public_trainer_international_v1 i on i.trainer_profile_id = p.trainer_profile_id
join public.marketplace_public_professional_trust_v1 t on t.trainer_profile_id = p.trainer_profile_id
where owner.profile_live = true
  and lower(owner.verification_status::text) = 'verified'
  and account.is_active = true
  and coalesce((to_jsonb(owner)->>'is_active')::boolean,true) = true
  and coalesce((to_jsonb(owner)->>'is_deleted')::boolean,false) = false
  and coalesce((to_jsonb(account)->>'is_deleted')::boolean,false) = false
  and exists(select 1 from auth.users auth_account where auth_account.id = account.auth_id)
  and (owner.reliability_suspended_until is null or owner.reliability_suspended_until <= now())
  and nullif(p.public_slug, '') is not null
  and coalesce(to_jsonb(owner)->>'deleted_at', '') = ''
  and coalesce(to_jsonb(account)->>'deleted_at', '') = '';
revoke all on public.marketplace_public_professionals_v3 from public, anon, authenticated;
grant select on public.marketplace_public_professionals_v3 to service_role;
-- Old projections remain for server/admin RPC compatibility, not direct public reads.
revoke select on public.marketplace_public_trainer_profiles_v1, public.marketplace_public_trainer_profiles_v2,
  public.marketplace_public_trainer_international_v1 from anon, authenticated;
grant select on public.marketplace_public_trainer_profiles_v1, public.marketplace_public_trainer_profiles_v2,
  public.marketplace_public_trainer_international_v1 to service_role;

create table public.professional_publication_outbox (
  professional_id uuid primary key, -- deliberately no cascading FK: deletion needs a tombstone
  revision bigint not null default 1, delivered_revision bigint not null default 0,
  slugs text[] not null default '{}', categories text[] not null default '{}', locations text[] not null default '{}',
  collection_changed boolean not null default true,
  updated_at timestamptz not null default now(),
  next_expiration_at timestamptz
);
alter table public.professional_publication_outbox enable row level security;
revoke all on public.professional_publication_outbox from public, anon, authenticated;
grant select, update on public.professional_publication_outbox to service_role;
create index professional_publication_pending on public.professional_publication_outbox(updated_at) where revision > delivered_revision;

create table public.professional_public_slug_history (
  slug text primary key, professional_id uuid not null
);
alter table public.professional_public_slug_history enable row level security;
revoke all on public.professional_public_slug_history from public, anon, authenticated;
grant select on public.professional_public_slug_history to service_role;

-- One cheap version row prevents an in-flight old cache fill or deferred
-- Next.js purge from serving stale data after a committed mutation.
create table public.professional_publication_generation (
  id boolean primary key default true check(id), generation bigint not null default 1
);
insert into public.professional_publication_generation(id) values(true);
alter table public.professional_publication_generation enable row level security;
revoke all on public.professional_publication_generation from public,anon,authenticated;
create index professional_publication_expiration on public.professional_publication_outbox(next_expiration_at) where next_expiration_at is not null;

create or replace function public.marketplace_queue_publication(p_professional_id uuid, p_old_slug text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_slug text; category_slugs text[]; location_keys text[]; next_expiration timestamptz;
begin
  select public_slug into current_slug from public.trainer_profiles where id = p_professional_id;
  select array_agg(distinct coalesce(category.public_slug, category.slug)) into category_slugs
  from public.trainer_services link join public.service_categories category on category.id = link.service_category_id
  where link.trainer_profile_id = p_professional_id;
  select array_agg(distinct public.marketplace_slugify(concat_ws('-', country_code, location_state, location_city)))
    into location_keys from public.trainer_locations where trainer_profile_id = p_professional_id;
  -- Refresh public trust at clock-driven expiration even without a row mutation.
  select min(expires_at) into next_expiration from (
    select (coalesce(expiration_date, expiry_date) + 1)::timestamptz as expires_at from public.certifications
      where coalesce(trainer_profile_id, trainer_id) = p_professional_id and is_active = true
    union all select expires_at from public.professional_identity_checks where trainer_profile_id = p_professional_id
    union all select expires_at from public.professional_background_checks where trainer_profile_id = p_professional_id
    union all select (coverage_expiration_date + 1)::timestamptz from public.professional_insurance_submissions where trainer_profile_id = p_professional_id
    union all select reliability_suspended_until from public.trainer_profiles where id = p_professional_id
  ) expirations where expires_at > now();
  insert into public.professional_public_slug_history(slug, professional_id)
    select slug, p_professional_id from unnest(array[current_slug,p_old_slug]) slug where nullif(slug, '') is not null
    on conflict (slug) do nothing;
  insert into public.professional_publication_outbox as queue(professional_id, slugs, categories, locations, next_expiration_at)
  values (p_professional_id, array_remove(array[current_slug,p_old_slug],null), coalesce(category_slugs,'{}'), coalesce(location_keys,'{}'), next_expiration)
  on conflict (professional_id) do update set
    revision = queue.revision + 1, updated_at = now(), collection_changed = true,
    slugs = array(select distinct unnest(queue.slugs || excluded.slugs)),
    categories = array(select distinct unnest(queue.categories || excluded.categories)),
    locations = array(select distinct unnest(queue.locations || excluded.locations)),
    next_expiration_at = excluded.next_expiration_at;
  update public.professional_publication_generation set generation=generation+1 where id=true;
end; $$;
revoke all on function public.marketplace_queue_publication(uuid,text) from public, anon, authenticated;
grant execute on function public.marketplace_queue_publication(uuid,text) to service_role;

create or replace function public.marketplace_capture_publication()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  before_row jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  after_row jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  source_row jsonb; target_id uuid; previous_id uuid; changed boolean;
begin
  source_row := case when tg_op = 'DELETE' then before_row else after_row end;
  select exists(select 1 from unnest(tg_argv) field where before_row->field is distinct from after_row->field) into changed;
  changed := changed or before_row->'trainer_profile_id' is distinct from after_row->'trainer_profile_id'
    or before_row->'trainer_id' is distinct from after_row->'trainer_id';
  if tg_op = 'UPDATE' and not changed then return new; end if;
  if tg_table_schema = 'auth' and tg_table_name = 'users' then
    for target_id in select profile.id from public.trainer_profiles profile
      join public.users account on account.id = profile.user_id
      where account.auth_id = (source_row->>'id')::uuid loop
      update public.trainer_profiles set updated_at = clock_timestamp() where id = target_id;
      perform public.marketplace_queue_publication(target_id);
    end loop;
  elsif tg_table_name = 'users' then
    for target_id in select id from public.trainer_profiles where user_id = (source_row->>'id')::uuid loop
      update public.trainer_profiles set updated_at = clock_timestamp() where id = target_id;
      perform public.marketplace_queue_publication(target_id);
    end loop;
  elsif tg_table_name = 'service_categories' then
    for target_id in select trainer_profile_id from public.trainer_services where service_category_id = (source_row->>'id')::uuid loop
      update public.trainer_profiles set updated_at = clock_timestamp() where id = target_id;
      perform public.marketplace_queue_publication(target_id);
    end loop;
  else
    target_id := case when tg_table_name = 'trainer_profiles' then (source_row->>'id')::uuid
      else coalesce(source_row->>'trainer_profile_id',source_row->>'trainer_id')::uuid end;
    if target_id is not null then
      -- Related commits advance the same concurrency token. Admin and professional
      -- edits therefore serialize on the parent row, including credential reviews.
      if tg_table_name <> 'trainer_profiles' then
        update public.trainer_profiles set updated_at = clock_timestamp() where id = target_id;
      end if;
      perform public.marketplace_queue_publication(target_id, case when tg_table_name = 'trainer_profiles' then before_row->>'public_slug' end);
    end if;
    if tg_table_name <> 'trainer_profiles' and tg_op = 'UPDATE' then
      previous_id := coalesce(before_row->>'trainer_profile_id',before_row->>'trainer_id')::uuid;
      if previous_id is not null and previous_id is distinct from target_id then
        update public.trainer_profiles set updated_at = clock_timestamp() where id = previous_id;
        perform public.marketplace_queue_publication(previous_id);
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if; return new;
end; $$;
revoke all on function public.marketplace_capture_publication() from public, anon, authenticated;

create trigger zz_publication_trainer_profiles
after insert or update or delete on public.trainer_profiles
for each row execute function public.marketplace_capture_publication('public_slug','public_display_name','professional_title','bio','years_experience','location_city','location_state','country_code','postal_code','primary_specialty','secondary_specialties','marketplace_specialties','modality','accepting_clients','client_acceptance_status','typical_availability','availability_details','marketplace_price_min_cents','marketplace_price_max_cents','marketplace_pricing_basis','marketplace_currency_code','contact_for_pricing','website_url','social_links','languages','public_headline','best_fit_summary','marketplace_goal_tags','experience_levels_served','coaching_style','service_boundaries','consultation_expectations','profile_live','verification_status','reliability_suspended_until','profile_information_confirmed_at','deleted_at','is_deleted','is_active');

create trigger zz_publication_users
after insert or update or delete on public.users
for each row execute function public.marketplace_capture_publication('is_active','profile_photo_url','first_name','last_name','deleted_at','is_deleted','auth_id');

create trigger zz_publication_auth_confirmation
after update of email_confirmed_at or delete on auth.users
for each row execute function public.marketplace_capture_publication('email_confirmed_at');

create trigger zz_publication_trainer_services
after insert or update or delete on public.trainer_services
for each row execute function public.marketplace_capture_publication('service_category_id','is_primary');

create trigger zz_publication_trainer_locations
after insert or update or delete on public.trainer_locations
for each row execute function public.marketplace_capture_publication('location_name','location_city','location_state','country_code','service_radius_meters','is_primary');

create trigger zz_publication_trainer_service_offerings
after insert or update or delete on public.trainer_service_offerings
for each row execute function public.marketplace_capture_publication('name','description','service_mode','duration_minutes','price_min_cents','price_max_cents','pricing_basis','currency_code','contact_for_pricing','is_active','sort_order','intended_for','included_items','delivery_cadence','minimum_commitment','consultation_type','additional_costs_note');

create trigger zz_publication_certifications
after insert or update or delete on public.certifications
for each row execute function public.marketplace_capture_publication('cert_name','issuing_body','cert_org','credential_type','issue_date','expiration_date','expiry_date','verification_status','verified_at','revoked_at','is_active','public_display','credential_country_code','credential_jurisdiction');

create trigger zz_publication_professional_identity_checks
after insert or update or delete on public.professional_identity_checks
for each row execute function public.marketplace_capture_publication('status','completed_at','revoked_at','expires_at');

create trigger zz_publication_professional_background_checks
after insert or update or delete on public.professional_background_checks
for each row execute function public.marketplace_capture_publication('status','completed_at','revoked_at','expires_at');

create trigger zz_publication_professional_insurance_submissions
after insert or update or delete on public.professional_insurance_submissions
for each row execute function public.marketplace_capture_publication('review_status','reviewed_at','revoked_at','coverage_expiration_date','public_display','submission_status');

create trigger zz_publication_provider_matching_profiles
after insert or update or delete on public.provider_matching_profiles
for each row execute function public.marketplace_capture_publication('delivery_modes','goal_tags','experience_tags','price_min_cents','price_max_cents','availability_summary');

create trigger zz_publication_service_categories
after insert or update or delete on public.service_categories
for each row execute function public.marketplace_capture_publication('public_slug','slug','is_active','is_visible_in_directory');

create or replace function public.marketplace_ack_publication_event(p_professional_id uuid, p_revision bigint)
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.professional_publication_outbox set delivered_revision = p_revision
    where professional_id = p_professional_id and revision = p_revision and delivered_revision < p_revision;
$$;
revoke all on function public.marketplace_ack_publication_event(uuid,bigint) from public, anon, authenticated;
grant execute on function public.marketplace_ack_publication_event(uuid,bigint) to service_role;

create or replace function public.marketplace_enqueue_expired_public_trust()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare target_id uuid;
begin
  for target_id in select professional_id from public.professional_publication_outbox where next_expiration_at <= now() limit 100 loop
    perform public.marketplace_queue_publication(target_id);
  end loop;
end; $$;
revoke all on function public.marketplace_enqueue_expired_public_trust() from public, anon, authenticated;
grant execute on function public.marketplace_enqueue_expired_public_trust() to service_role;

create or replace function public.marketplace_resolve_public_slug(p_slug text)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select live.slug from public.professional_public_slug_history history
    join public.marketplace_public_professionals_v3 live on live.professional_id = history.professional_id
    where history.slug = p_slug;
$$;
revoke all on function public.marketplace_resolve_public_slug(text) from public, anon, authenticated;
grant execute on function public.marketplace_resolve_public_slug(text) to service_role;

-- Seed durable routing history, not a second copy of public profile content.
select public.marketplace_queue_publication(id) from public.trainer_profiles;

-- Invoker rights preserve existing RLS, moderation and credential audit triggers.
-- Fixed sections and allowlists; callers cannot name tables or administrative fields.
-- Use an application error for stale edit tokens. SQLSTATE 40001 is reserved for
-- retryable database serialization failures and can cause PostgREST to retry forever.
create or replace function public.marketplace_save_professional_profile(p_expected_updated_at timestamptz, p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = public, auth, pg_temp as $$
declare
  owner_id uuid := public.marketplace_current_user_id();
  profile public.trainer_profiles%rowtype; item jsonb; location_id uuid;
  profile_status jsonb; section_name text; sections jsonb;
  kept_services uuid[] := '{}'; kept_credentials uuid[] := '{}';
begin
  if auth.uid() is null or owner_id is null then raise exception 'Authentication required.'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 131072 or exists(
    select 1 from jsonb_object_keys(p_payload) key
      where key not in ('profile','photo','categories','location','services','credentials','submit','attestationVersion','country')) then
    raise exception 'Invalid profile payload.';
  end if;
  select * into profile from public.trainer_profiles where user_id = owner_id for update;
  if found then
    if p_expected_updated_at is null or profile.updated_at is distinct from p_expected_updated_at then
      raise exception using errcode = 'P0001', message = 'Profile changed in another session.';
    end if;
    if profile.reliability_suspended_until > now() or lower(profile.verification_status::text) = 'suspended' then
      raise exception 'Profile is suspended.';
    end if;
  else
    if p_expected_updated_at is not null then raise exception using errcode='P0001', message='Profile changed in another session.'; end if;
    profile.id := gen_random_uuid();
  end if;
  if coalesce(jsonb_typeof(p_payload->'profile'),'') <> 'object' or coalesce(jsonb_typeof(p_payload->'categories'),'') <> 'array'
    or coalesce(jsonb_typeof(p_payload->'services'),'') <> 'array' or coalesce(jsonb_typeof(p_payload->'credentials'),'') <> 'array' then
    raise exception 'Required profile sections are missing.';
  end if;
  sections := jsonb_build_array(jsonb_build_object('section','profile','patch',p_payload->'profile'));
  if jsonb_typeof(p_payload->'photo') = 'object' then sections := sections || jsonb_build_array(jsonb_build_object('section','photo','patch',p_payload->'photo')); end if;
  if jsonb_typeof(p_payload->'location') = 'object' then sections := sections || jsonb_build_array(jsonb_build_object('section','location','patch',p_payload->'location')); end if;
  select sections || coalesce(jsonb_agg(jsonb_build_object('section','service','patch',value)),'[]') into sections from jsonb_array_elements(p_payload->'services');
  select sections || coalesce(jsonb_agg(jsonb_build_object('section','credential','patch',value)),'[]') into sections from jsonb_array_elements(p_payload->'credentials');
  for item in select value from jsonb_array_elements(sections) loop
    section_name := item->>'section';
    declare
  table_name text; allowed text[]; column_names text; expressions text; assignments text;
  target_id uuid; owner_id uuid := public.marketplace_current_user_id();
  value jsonb := item->'patch'; existing_id uuid;
begin
  if auth.uid() is null or owner_id is null then raise exception 'Authentication required.'; end if;
  case section_name
    when 'profile' then table_name := 'trainer_profiles'; allowed := string_to_array('public_display_name professional_title public_headline best_fit_summary bio years_experience marketplace_goal_tags experience_levels_served coaching_style service_boundaries consultation_expectations location_city location_state country_code postal_code primary_specialty secondary_specialties marketplace_specialties modality accepting_clients client_acceptance_status typical_availability availability_details marketplace_price_min_cents marketplace_price_max_cents marketplace_pricing_basis marketplace_currency_code contact_for_pricing website_url social_links languages', ' ');
    when 'photo' then table_name := 'users'; allowed := string_to_array('profile_photo_url profile_photo_storage_path', ' ');
    when 'location' then table_name := 'trainer_locations'; allowed := string_to_array('id location_name location_city location_state country_code postal_code service_radius_meters service_radius_miles is_primary', ' ');
    when 'service' then table_name := 'trainer_service_offerings'; allowed := string_to_array('id name description service_mode duration_minutes price_min_cents price_max_cents pricing_basis currency_code contact_for_pricing is_active sort_order intended_for included_items delivery_cadence minimum_commitment consultation_type additional_costs_note', ' ');
    when 'credential' then table_name := 'certifications'; allowed := string_to_array('id cert_name issuing_body cert_org credential_type credential_number cert_id issue_date expiration_date expiry_date document_url supporting_reference_url credential_country_code credential_jurisdiction public_display is_active', ' ');
    else raise exception 'Unknown section.';
  end case;
  if value is null or jsonb_typeof(value) <> 'object' or exists(select 1 from jsonb_object_keys(value) key where not key = any(allowed)) then
    raise exception 'Invalid fields.';
  end if;
  if section_name <> 'profile' and not exists(select 1 from public.trainer_profiles where id = profile.id and user_id = owner_id) then
    raise exception 'Profile not found.';
  end if;
  target_id := case when section_name = 'profile' then profile.id when section_name = 'photo' then owner_id
    else coalesce((value->>'id')::uuid, gen_random_uuid()) end;
  value := value || jsonb_build_object('id',target_id);
  if section_name = 'profile' then value := value || jsonb_build_object('user_id',owner_id);
  elsif section_name not in ('photo') then value := value || jsonb_build_object('trainer_profile_id',profile.id); end if;
  select string_agg(format('%I',key),','),
    string_agg(format('(jsonb_populate_record(null::public.%I,$1)).%I',table_name,key),','),
    string_agg(format('%I = (jsonb_populate_record(null::public.%I,$1)).%I',key,table_name,key),',')
    into column_names, expressions, assignments from jsonb_object_keys(value) key;
  execute format('select id from public.%I where id = $1',table_name) into existing_id using target_id;
  if existing_id is not null then
    execute format('update public.%I set %s where id = $2',table_name,assignments) using value,target_id;
  else
    execute format('insert into public.%I (%s) select %s',table_name,column_names,expressions) using value;
  end if;
  if section_name = 'service' then kept_services := array_append(kept_services,target_id); end if;
  if section_name = 'credential' then kept_credentials := array_append(kept_credentials,target_id); end if;
  if section_name = 'location' then location_id := target_id; end if;
    end;
  end loop;
  delete from public.trainer_services where trainer_profile_id = profile.id;
  for item in select value from jsonb_array_elements(p_payload->'categories') loop
    insert into public.trainer_services(trainer_profile_id,service_category_id,is_primary)
      values(profile.id,(item->>'service_category_id')::uuid,(item->>'is_primary')::boolean);
  end loop;
  update public.trainer_service_offerings set is_active = false where trainer_profile_id=profile.id and not(id=any(kept_services)) and is_active=true;
  update public.certifications set is_active = false where coalesce(trainer_profile_id,trainer_id)=profile.id and not(id=any(kept_credentials)) and is_active=true;
  if coalesce((p_payload->>'submit')::boolean,false) then
    perform public.submit_current_trainer_profile_for_review_attested(
      requested_email => null, request_notes => null, attestation_version => p_payload->>'attestationVersion',
      country_at_acceptance => p_payload->>'country');
  end if;
  select trainer.* into profile from public.trainer_profiles trainer where trainer.id=profile.id;
  select to_jsonb(status) into profile_status from public.marketplace_trainer_profile_status_v1 status where trainer_profile_id=profile.id;
  return jsonb_build_object('profile',to_jsonb(profile),'status',profile_status,'locationId',location_id,
    'credentials',(select coalesce(jsonb_agg(to_jsonb(credential)),'[]') from public.certifications credential where coalesce(trainer_profile_id,trainer_id)=profile.id and is_active=true));
end; $$;
revoke all on function public.marketplace_save_professional_profile(timestamptz,jsonb) from public, anon;
grant execute on function public.marketplace_save_professional_profile(timestamptz,jsonb) to authenticated;


create or replace function public.marketplace_pending_publication_events()
returns table(professional_id uuid) language sql security definer set search_path = public, pg_temp as $$
  select professional_id from public.professional_publication_outbox
    where revision > delivered_revision order by updated_at limit 25;
$$;
revoke all on function public.marketplace_pending_publication_events() from public, anon, authenticated;
grant execute on function public.marketplace_pending_publication_events() to service_role;

create table public.professional_publication_rate_limit (id boolean primary key default true check(id), window_start timestamptz not null, attempts integer not null);
alter table public.professional_publication_rate_limit enable row level security;
revoke all on public.professional_publication_rate_limit from public, anon, authenticated;
create or replace function public.marketplace_publication_delivery_allowed()
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare count_now integer;
begin
  insert into public.professional_publication_rate_limit as limiter(id,window_start,attempts) values(true,now(),1)
  on conflict(id) do update set
    window_start=case when limiter.window_start < now()-interval '1 minute' then now() else limiter.window_start end,
    attempts=case when limiter.window_start < now()-interval '1 minute' then 1 else limiter.attempts+1 end
  returning attempts into count_now;
  return count_now <= 120;
end; $$;
revoke all on function public.marketplace_publication_delivery_allowed() from public, anon, authenticated;
grant execute on function public.marketplace_publication_delivery_allowed() to service_role;

create or replace function public.marketplace_guard_slug_history()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists(select 1 from public.professional_public_slug_history where slug=new.public_slug and professional_id<>new.id) then
    raise exception 'This public URL is reserved by a previous profile.';
  end if;
  return new;
end; $$;
revoke all on function public.marketplace_guard_slug_history() from public, anon, authenticated;
create trigger zzzz_guard_slug_history before insert or update of public_slug on public.trainer_profiles
for each row execute function public.marketplace_guard_slug_history();

drop trigger if exists trg_guard_marketplace_credential_verification_fields on public.certifications;
create or replace function public.marketplace_publication_version(p_slug text default null)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare version_key text; expiring_id uuid;
begin
  -- Clock-driven credential expiration also advances the key, even if the
  -- scheduled delivery worker is temporarily unavailable. Indexed, bounded work.
  perform public.marketplace_enqueue_expired_public_trust();
  if p_slug is not null then
    -- A large simultaneous expiration batch must not leave this requested
    -- professional behind the bounded collection sweep.
    select event.professional_id into expiring_id
    from public.professional_public_slug_history history
      join public.professional_publication_outbox event on event.professional_id=history.professional_id
    where history.slug=p_slug and event.next_expiration_at <= now();
    if expiring_id is not null then perform public.marketplace_queue_publication(expiring_id); end if;
    select concat(event.professional_id,':',event.revision) into version_key
    from public.professional_public_slug_history history
      join public.professional_publication_outbox event on event.professional_id=history.professional_id
    where history.slug=p_slug;
  end if;
  if version_key is null then
    select concat('collection:',generation) into version_key from public.professional_publication_generation where id=true;
  end if;
  return version_key;
end; $$;
revoke all on function public.marketplace_publication_version(text) from public,anon,authenticated;
grant execute on function public.marketplace_publication_version(text) to service_role;

notify pgrst, 'reload schema';
commit;
