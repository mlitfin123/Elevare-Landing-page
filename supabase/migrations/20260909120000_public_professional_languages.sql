begin;

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
  profile.languages
from public.marketplace_public_trainer_profiles_v1 as current_profile
join public.trainer_profiles as profile on profile.id = current_profile.trainer_profile_id
join public.users as account on account.id = profile.user_id;

comment on column public.marketplace_public_trainer_profiles_v2.languages is
  'Optional languages the professional has chosen to display as languages used with clients.';

grant select on public.marketplace_public_trainer_profiles_v2 to anon, authenticated, service_role;

commit;
