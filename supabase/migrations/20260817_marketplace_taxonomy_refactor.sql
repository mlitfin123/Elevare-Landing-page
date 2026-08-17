-- Align the marketplace with the structured professional taxonomy used by the
-- website. This keeps categories, specialties, and service mode separate while
-- preserving existing profile data through deterministic remapping.

alter table public.service_categories
  add column if not exists public_slug text,
  add column if not exists public_label text,
  add column if not exists public_headline text,
  add column if not exists public_short_description text,
  add column if not exists is_visible_in_directory boolean not null default true;

alter table public.client_profiles
  add column if not exists interested_service_category_slugs text[] default '{}'::text[];

alter table public.client_profiles
  alter column interested_service_category_slugs set default '{}'::text[];

insert into public.service_categories (
  slug,
  name,
  description,
  sort_order,
  is_active,
  public_slug,
  public_label,
  public_headline,
  public_short_description,
  is_visible_in_directory
)
values
  ('personal_training', 'Personal Training', 'Exercise instruction, coaching, and accountability for everyday fitness, strength, and body-composition goals.', 10, true, 'personal-training', 'Personal Training', 'Personal training', 'Exercise instruction, coaching, and accountability for everyday fitness, strength, and body-composition goals.', true),
  ('strength_conditioning', 'Strength & Conditioning', 'Performance-minded training for strength, power, speed, and resilient athletic development.', 20, true, 'strength-conditioning', 'Strength & Conditioning', 'Strength and conditioning', 'Performance-minded training for strength, power, speed, and resilient athletic development.', true),
  ('bodybuilding_physique', 'Bodybuilding & Physique', 'Coaching for muscle building, physique development, contest prep, and stage presentation.', 30, true, 'bodybuilding-physique', 'Bodybuilding & Physique', 'Bodybuilding and physique coaching', 'Coaching for muscle building, physique development, contest prep, and stage presentation.', true),
  ('strength_sports', 'Strength Sports', 'Coaching for powerlifting, Olympic weightlifting, strongman, and strength competition prep.', 40, true, 'strength-sports', 'Strength Sports', 'Strength sports coaching', 'Coaching for powerlifting, Olympic weightlifting, strongman, and strength competition prep.', true),
  ('running_endurance', 'Running & Endurance', 'Structured support for running, endurance development, race preparation, and aerobic performance.', 50, true, 'running-endurance', 'Running & Endurance', 'Running and endurance coaching', 'Structured support for running, endurance development, race preparation, and aerobic performance.', true),
  ('sports_performance', 'Sports Performance', 'Training focused on speed, explosiveness, conditioning, and sport-specific athletic performance.', 60, true, 'sports-performance', 'Sports Performance', 'Sports performance coaching', 'Training focused on speed, explosiveness, conditioning, and sport-specific athletic performance.', true),
  ('nutrition', 'Nutrition', 'Nutrition strategy, habit change, and food-structure support for health, body composition, and performance.', 70, true, 'nutrition', 'Nutrition', 'Nutrition coaching', 'Nutrition strategy, habit change, and food-structure support for health, body composition, and performance.', true),
  ('dietetics', 'Dietetics', 'Credentialed dietetics support where regulated nutrition credentials materially matter.', 80, true, 'dietetics', 'Dietetics', 'Dietetics support', 'Credentialed dietetics support where regulated nutrition credentials materially matter.', true),
  ('health_wellness_coaching', 'Health & Wellness Coaching', 'Support for sustainable habits, accountability, lifestyle structure, and general wellbeing.', 90, true, 'health-wellness-coaching', 'Health & Wellness Coaching', 'Health and wellness coaching', 'Support for sustainable habits, accountability, lifestyle structure, and general wellbeing.', true),
  ('life_mindset_coaching', 'Life & Mindset Coaching', 'Coaching centered on motivation, confidence, accountability, and personal growth.', 100, true, 'life-mindset-coaching', 'Life & Mindset Coaching', 'Life and mindset coaching', 'Coaching centered on motivation, confidence, accountability, and personal growth.', true),
  ('yoga', 'Yoga', 'Yoga instruction for movement, flexibility, breath, and mind-body practice.', 110, true, 'yoga', 'Yoga', 'Yoga', 'Yoga instruction for movement, flexibility, breath, and mind-body practice.', true),
  ('pilates', 'Pilates', 'Pilates instruction for strength, control, posture, and movement quality.', 120, true, 'pilates', 'Pilates', 'Pilates', 'Pilates instruction for strength, control, posture, and movement quality.', true),
  ('mobility_movement', 'Mobility, Flexibility & Movement', 'Support for mobility, flexibility, movement quality, and non-medical corrective exercise.', 130, true, 'mobility-movement', 'Mobility, Flexibility & Movement', 'Mobility, flexibility, and movement coaching', 'Support for mobility, flexibility, movement quality, and non-medical corrective exercise.', true),
  ('mindfulness_breathwork', 'Meditation, Mindfulness & Breathwork', 'Breath, mindfulness, and meditation support for focus, relaxation, and everyday regulation.', 140, true, 'mindfulness-breathwork', 'Meditation, Mindfulness & Breathwork', 'Meditation, mindfulness, and breathwork', 'Breath, mindfulness, and meditation support for focus, relaxation, and everyday regulation.', true),
  ('recovery_bodywork', 'Recovery & Bodywork', 'Recovery-oriented services such as massage, assisted stretching, and non-medical bodywork support.', 150, true, 'recovery-bodywork', 'Recovery & Bodywork', 'Recovery and bodywork', 'Recovery-oriented services such as massage, assisted stretching, and non-medical bodywork support.', true),
  ('special_population_fitness', 'Special Population Fitness', 'Fitness support for clients who need a lower-impact, age-aware, or more adaptive training approach.', 160, true, 'special-population-fitness', 'Special Population Fitness', 'Special population fitness', 'Fitness support for clients who need a lower-impact, age-aware, or more adaptive training approach.', true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  public_slug = excluded.public_slug,
  public_label = excluded.public_label,
  public_headline = excluded.public_headline,
  public_short_description = excluded.public_short_description,
  is_visible_in_directory = excluded.is_visible_in_directory,
  updated_at = timezone('utc', now());

create temporary table tmp_marketplace_legacy_category_map (
  old_slug text primary key,
  new_slug text not null,
  implied_specialty text,
  implied_service_mode text
) on commit drop;

insert into tmp_marketplace_legacy_category_map (old_slug, new_slug, implied_specialty, implied_service_mode)
values
  ('competition_prep', 'bodybuilding_physique', 'Competition Prep', null),
  ('online_coaching', 'personal_training', null, 'online'),
  ('strength_coaching', 'strength_conditioning', 'Strength & Conditioning', null),
  ('bodybuilding_coaching', 'bodybuilding_physique', 'Bodybuilding', null),
  ('powerlifting_coaching', 'strength_sports', 'Powerlifting', null),
  ('running_coaching', 'running_endurance', 'Running Performance', null),
  ('nutrition_professionals', 'nutrition', 'General Nutrition', null),
  ('nutrition_coaching', 'nutrition', 'Nutrition Coaching', null),
  ('dietitians', 'dietetics', null, null),
  ('lifestyle_coaching', 'life_mindset_coaching', 'Life Coaching', null),
  ('health_coaching', 'health_wellness_coaching', 'Health Coaching', null),
  ('wellness_coaching', 'health_wellness_coaching', 'Wellness Coaching', null),
  ('mobility_coaching', 'mobility_movement', 'Mobility Training', null),
  ('stretching_flexibility', 'mobility_movement', 'Flexibility Training', null),
  ('meditation', 'mindfulness_breathwork', 'Meditation', null),
  ('breathwork', 'mindfulness_breathwork', 'Breathwork', null);

create temporary table tmp_marketplace_category_slug_aliases (
  alias_slug text primary key,
  stable_slug text not null
) on commit drop;

insert into tmp_marketplace_category_slug_aliases (alias_slug, stable_slug)
values
  ('personal_training', 'personal_training'),
  ('personal-training', 'personal_training'),
  ('personal-trainers', 'personal_training'),
  ('strength_conditioning', 'strength_conditioning'),
  ('strength-conditioning', 'strength_conditioning'),
  ('strength_coaching', 'strength_conditioning'),
  ('strength-coaches', 'strength_conditioning'),
  ('bodybuilding_physique', 'bodybuilding_physique'),
  ('bodybuilding-physique', 'bodybuilding_physique'),
  ('bodybuilding_coaching', 'bodybuilding_physique'),
  ('bodybuilding-coaches', 'bodybuilding_physique'),
  ('competition_prep', 'bodybuilding_physique'),
  ('competition-prep', 'bodybuilding_physique'),
  ('strength_sports', 'strength_sports'),
  ('strength-sports', 'strength_sports'),
  ('powerlifting_coaching', 'strength_sports'),
  ('powerlifting-coaches', 'strength_sports'),
  ('running_endurance', 'running_endurance'),
  ('running-endurance', 'running_endurance'),
  ('running_coaching', 'running_endurance'),
  ('running-coaches', 'running_endurance'),
  ('sports_performance', 'sports_performance'),
  ('sports-performance', 'sports_performance'),
  ('nutrition', 'nutrition'),
  ('nutrition_professionals', 'nutrition'),
  ('nutrition-professionals', 'nutrition'),
  ('nutrition_coaching', 'nutrition'),
  ('nutrition-coaches', 'nutrition'),
  ('dietetics', 'dietetics'),
  ('dietitians', 'dietetics'),
  ('health_wellness_coaching', 'health_wellness_coaching'),
  ('health-wellness-coaching', 'health_wellness_coaching'),
  ('health_coaching', 'health_wellness_coaching'),
  ('health-coaches', 'health_wellness_coaching'),
  ('wellness_coaching', 'health_wellness_coaching'),
  ('wellness-coaches', 'health_wellness_coaching'),
  ('life_mindset_coaching', 'life_mindset_coaching'),
  ('life-mindset-coaching', 'life_mindset_coaching'),
  ('lifestyle_coaching', 'life_mindset_coaching'),
  ('life-coaches', 'life_mindset_coaching'),
  ('yoga', 'yoga'),
  ('yoga-instructors', 'yoga'),
  ('pilates', 'pilates'),
  ('pilates-instructors', 'pilates'),
  ('mobility_movement', 'mobility_movement'),
  ('mobility-movement', 'mobility_movement'),
  ('mobility_coaching', 'mobility_movement'),
  ('mobility-coaches', 'mobility_movement'),
  ('stretching_flexibility', 'mobility_movement'),
  ('stretching-flexibility', 'mobility_movement'),
  ('mindfulness_breathwork', 'mindfulness_breathwork'),
  ('mindfulness-breathwork', 'mindfulness_breathwork'),
  ('meditation', 'mindfulness_breathwork'),
  ('meditation-coaches', 'mindfulness_breathwork'),
  ('breathwork', 'mindfulness_breathwork'),
  ('breathwork-coaches', 'mindfulness_breathwork'),
  ('recovery_bodywork', 'recovery_bodywork'),
  ('recovery-bodywork', 'recovery_bodywork'),
  ('special_population_fitness', 'special_population_fitness'),
  ('special-population-fitness', 'special_population_fitness'),
  ('online_coaching', 'personal_training'),
  ('online-coaches', 'personal_training');

create temporary table tmp_marketplace_legacy_category_ids
on commit drop
as
select
  old_sc.id as old_category_id,
  new_sc.id as new_category_id,
  legacy.old_slug,
  legacy.new_slug,
  legacy.implied_specialty,
  legacy.implied_service_mode
from tmp_marketplace_legacy_category_map legacy
join public.service_categories old_sc
  on old_sc.slug = legacy.old_slug
join public.service_categories new_sc
  on new_sc.slug = legacy.new_slug;

with implied_specialties as (
  select
    ts.trainer_profile_id,
    array_agg(distinct legacy.implied_specialty) filter (where legacy.implied_specialty is not null) as specialties
  from public.trainer_services ts
  join tmp_marketplace_legacy_category_ids legacy
    on legacy.old_category_id = ts.service_category_id
  group by ts.trainer_profile_id
)
update public.trainer_profiles tp
set
  primary_specialty = coalesce(
    tp.primary_specialty,
    (
      select specialty_name::public.specialty
      from unnest(coalesce(implied.specialties, '{}'::text[])) as specialty_name
      where specialty_name in (
        select unnest(enum_range(null::public.specialty))::text
      )
      limit 1
    )
  ),
  secondary_specialties = (
    select coalesce(
      array_agg(distinct specialty_value order by specialty_value),
      '{}'::public.specialty[]
    )
    from (
      select specialty_name::public.specialty as specialty_value
      from unnest(
        coalesce(tp.secondary_specialties::text[], '{}'::text[])
        || coalesce(implied.specialties, '{}'::text[])
      ) as specialty_name
      where nullif(btrim(specialty_name), '') is not null
        and specialty_name in (
          select unnest(enum_range(null::public.specialty))::text
        )
    ) specialty_values
  )
from implied_specialties implied
where implied.trainer_profile_id = tp.id;

with online_profiles as (
  select distinct ts.trainer_profile_id
  from public.trainer_services ts
  join tmp_marketplace_legacy_category_ids legacy
    on legacy.old_category_id = ts.service_category_id
  where legacy.implied_service_mode = 'online'
)
update public.provider_matching_profiles pmp
set delivery_modes = (
  select coalesce(
    jsonb_agg(mode order by mode),
    '["online"]'::jsonb
  )
  from (
    select distinct mode
    from jsonb_array_elements_text(
      coalesce(pmp.delivery_modes, '[]'::jsonb) || '["online"]'::jsonb
    ) as delivery_mode(mode)
    where nullif(btrim(mode), '') is not null
  ) deduped_modes
)
from online_profiles
where online_profiles.trainer_profile_id = pmp.trainer_profile_id;

update public.provider_matching_profiles pmp
set primary_service_category_id = legacy.new_category_id
from tmp_marketplace_legacy_category_ids legacy
where pmp.primary_service_category_id = legacy.old_category_id;

update public.trainer_profile_inquiries inquiry
set service_category_id = legacy.new_category_id
from tmp_marketplace_legacy_category_ids legacy
where inquiry.service_category_id = legacy.old_category_id;

update public.trainer_services ts
set service_category_id = legacy.new_category_id
from tmp_marketplace_legacy_category_ids legacy
where ts.service_category_id = legacy.old_category_id;

with ranked_duplicates as (
  select
    ts.id,
    row_number() over (
      partition by ts.trainer_profile_id, ts.service_category_id
      order by coalesce(ts.is_primary, false) desc, ts.id asc
    ) as row_rank
  from public.trainer_services ts
)
delete from public.trainer_services ts
using ranked_duplicates ranked
where ts.id = ranked.id
  and ranked.row_rank > 1;

with chosen_primary as (
  select distinct on (ts.trainer_profile_id)
    ts.id,
    ts.trainer_profile_id
  from public.trainer_services ts
  left join public.provider_matching_profiles pmp
    on pmp.trainer_profile_id = ts.trainer_profile_id
  order by
    ts.trainer_profile_id,
    (ts.service_category_id = pmp.primary_service_category_id) desc,
    coalesce(ts.is_primary, false) desc,
    ts.id asc
)
update public.trainer_services ts
set is_primary = exists (
  select 1
  from chosen_primary chosen
  where chosen.id = ts.id
)
where exists (
  select 1
  from chosen_primary chosen
  where chosen.trainer_profile_id = ts.trainer_profile_id
);

update public.client_profiles cp
set interested_service_category_slugs = (
  select coalesce(
    array_agg(distinct normalized_slug order by normalized_slug),
    '{}'::text[]
  )
  from (
    select coalesce(alias_map.stable_slug, nullif(btrim(raw_slug), '')) as normalized_slug
    from unnest(coalesce(cp.interested_service_category_slugs, '{}'::text[])) as raw_slug
    left join tmp_marketplace_category_slug_aliases alias_map
      on alias_map.alias_slug = raw_slug
  ) normalized
  where normalized.normalized_slug is not null
);

update public.service_categories sc
set
  is_active = false,
  is_visible_in_directory = false,
  updated_at = timezone('utc', now())
where sc.slug in (
  select old_slug
  from tmp_marketplace_legacy_category_map
);

create or replace view public.marketplace_service_categories_v1 as
select
  sc.id,
  sc.slug,
  sc.public_slug,
  coalesce(nullif(sc.public_label, ''), sc.name) as label,
  coalesce(nullif(sc.public_headline, ''), sc.name) as headline,
  coalesce(nullif(sc.public_short_description, ''), sc.description) as short_description,
  sc.sort_order,
  sc.description as internal_description
from public.service_categories sc
where sc.is_active = true
  and coalesce(sc.is_visible_in_directory, true) = true;

create or replace view public.marketplace_public_trainer_profiles_v1 as
select
  tp.id as trainer_profile_id,
  tp.user_id,
  tp.public_slug,
  coalesce(nullif(tp.public_display_name, ''), nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''), split_part(coalesce(u.email, ''), '@', 1)) as display_name,
  coalesce(nullif(tp.professional_title, ''), nullif(tp.primary_specialty::text, ''), 'Coach') as professional_title,
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
        )
        order by ts.is_primary desc, sc.sort_order asc
      )
      from public.trainer_services ts
      join public.service_categories sc
        on sc.id = ts.service_category_id
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
          'expiration_date', coalesce(c.expiration_date, c.expiry_date),
          'verification_status', c.verification_status,
          'document_url', c.document_url,
          'supporting_reference_url', c.supporting_reference_url
        )
        order by c.created_at desc
      )
      from public.certifications c
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
        )
        order by tl.is_primary desc, tl.created_at asc
      )
      from public.trainer_locations tl
      where tl.trainer_profile_id = tp.id
    ),
    '[]'::jsonb
  ) as locations,
  coalesce(tips.is_insured_trainer, false) as is_insured_trainer,
  tips.insured_verified_at,
  tp.created_at,
  tp.updated_at
from public.trainer_profiles tp
join public.users u
  on u.id = tp.user_id
left join public.provider_matching_profiles pm
  on pm.trainer_profile_id = tp.id
left join public.trainer_insurance_public_status tips
  on tips.trainer_id = tp.id
where tp.profile_live = true
  and lower(coalesce(tp.verification_status::text, '')) = 'verified'
  and coalesce(tp.accepting_clients, true) = true
  and coalesce(u.is_active, true) = true;
