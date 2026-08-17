create extension if not exists "pgcrypto";

-- This migration intentionally extends the existing trainer/client marketplace
-- schema already present in the second Supabase project. It does not create a
-- parallel professional_* data model.

create or replace function public.marketplace_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.marketplace_slugify(value text)
returns text
language sql
immutable
as $$
  select trim(
    both '-'
    from regexp_replace(
      regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}',
      '-',
      'g'
    )
  );
$$;

create or replace function public.marketplace_current_user_id()
returns uuid
language sql
stable
as $$
  select u.id
  from public.users u
  where u.auth_id = auth.uid()
  limit 1;
$$;

create or replace function public.marketplace_fill_trainer_public_fields()
returns trigger
language plpgsql
as $$
declare
  source_user public.users%rowtype;
  resolved_name text;
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  select *
  into source_user
  from public.users
  where id = new.user_id
  limit 1;

  resolved_name := coalesce(
    nullif(btrim(new.public_display_name), ''),
    nullif(btrim(concat_ws(' ', source_user.first_name, source_user.last_name)), ''),
    nullif(split_part(coalesce(source_user.email, ''), '@', 1), ''),
    'coach'
  );

  if new.public_display_name is null or btrim(new.public_display_name) = '' then
    new.public_display_name := resolved_name;
  end if;

  if new.professional_title is null or btrim(new.professional_title) = '' then
    new.professional_title := coalesce(nullif(btrim(new.primary_specialty::text), ''), 'Coach');
  end if;

  if new.public_slug is null or btrim(new.public_slug) = '' then
    new.public_slug := public.marketplace_slugify(resolved_name);

    if coalesce(new.public_slug, '') = '' then
      new.public_slug := 'coach';
    end if;

    new.public_slug := new.public_slug || '-' || left(new.id::text, 8);
  else
    new.public_slug := public.marketplace_slugify(new.public_slug);
  end if;

  return new;
end;
$$;

create or replace function public.marketplace_sync_certification_fields()
returns trigger
language plpgsql
as $$
begin
  if new.trainer_profile_id is null then
    new.trainer_profile_id := new.trainer_id;
  end if;

  if new.issuing_body is null or btrim(new.issuing_body) = '' then
    new.issuing_body := new.cert_org;
  end if;

  if new.cert_org is null or btrim(new.cert_org) = '' then
    new.cert_org := new.issuing_body;
  end if;

  if new.expiration_date is null then
    new.expiration_date := new.expiry_date;
  end if;

  if new.expiry_date is null then
    new.expiry_date := new.expiration_date;
  end if;

  if new.credential_number is null or btrim(new.credential_number) = '' then
    new.credential_number := new.cert_id;
  end if;

  if new.cert_id is null or btrim(new.cert_id) = '' then
    new.cert_id := new.credential_number;
  end if;

  return new;
end;
$$;

create or replace function public.submit_current_trainer_profile_for_review(
  requested_email text default null,
  request_notes text default null
)
returns public.trainer_verification_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  app_user_id uuid;
  trainer_profile_row public.trainer_profiles%rowtype;
  latest_request public.trainer_verification_requests%rowtype;
  resolved_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  app_user_id := public.marketplace_current_user_id();

  if app_user_id is null then
    raise exception 'No public user record exists for the current authenticated user.';
  end if;

  select tp.*
  into trainer_profile_row
  from public.trainer_profiles tp
  where tp.user_id = app_user_id
  order by tp.updated_at desc, tp.created_at desc
  limit 1;

  if trainer_profile_row.id is null then
    raise exception 'Create your trainer profile before submitting it for review.';
  end if;

  resolved_email := coalesce(
    nullif(btrim(requested_email), ''),
    (
      select u.email
      from public.users u
      where u.id = app_user_id
      limit 1
    )
  );

  update public.trainer_profiles
  set last_submitted_at = timezone('utc', now())
  where id = trainer_profile_row.id;

  select tvr.*
  into latest_request
  from public.trainer_verification_requests tvr
  where tvr.trainer_profile_id = trainer_profile_row.id
    and lower(coalesce(tvr.request_status::text, '')) = 'pending'
  order by coalesce(tvr.updated_at, tvr.requested_at, tvr.created_at) desc
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
    jsonb_build_object(
      'source', 'website_marketplace',
      'submitted_via', 'marketplace_submit_function'
    ),
    timezone('utc', now()),
    timezone('utc', now())
  )
  returning *
  into latest_request;

  return latest_request;
end;
$$;

alter table public.service_categories
  add column if not exists public_slug text,
  add column if not exists public_label text,
  add column if not exists public_headline text,
  add column if not exists public_short_description text,
  add column if not exists is_visible_in_directory boolean not null default true;

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
  ('personal_training', 'Personal Training', 'One-on-one or small-group fitness training.', 10, true, 'personal-trainers', 'Personal Trainers', 'Personal trainers', 'In-person or hybrid professionals focused on exercise instruction, accountability, and results.', true),
  ('competition_prep', 'Competition Prep', 'Structured coaching for physique, strength, or event preparation.', 20, true, 'competition-prep', 'Competition Prep Coaches', 'Competition prep coaches', 'Professionals helping physique athletes prepare for the stage with structured prep guidance.', true),
  ('online_coaching', 'Online Coaching', 'Remote coaching with workouts, check-ins, and accountability.', 30, true, 'online-coaches', 'Online Coaches', 'Online coaches', 'Remote coaching professionals who deliver support, structure, and accountability online.', true),
  ('strength_coaching', 'Strength Coaching', 'Strength-focused coaching for barbell progress, performance, and execution.', 40, true, 'strength-coaches', 'Strength Coaches', 'Strength coaches', 'Professionals focused on strength development, performance, and progressive training structure.', true),
  ('bodybuilding_coaching', 'Bodybuilding Coaching', 'Coaching built around hypertrophy, physique development, and bodybuilding goals.', 50, true, 'bodybuilding-coaches', 'Bodybuilding Coaches', 'Bodybuilding coaches', 'Coaches who help clients with muscle building, physique goals, and bodybuilding-focused structure.', true),
  ('powerlifting_coaching', 'Powerlifting Coaching', 'Coaching for squat, bench, deadlift, technique, and meet preparation.', 60, true, 'powerlifting-coaches', 'Powerlifting Coaches', 'Powerlifting coaches', 'Coaches for squat, bench, deadlift, meet prep, and powerlifting-specific progress.', true),
  ('running_coaching', 'Running Coaching', 'Running-focused training support for pace, structure, and consistency.', 70, true, 'running-coaches', 'Running Coaches', 'Running coaches', 'Professionals helping clients improve running performance, structure, and consistency.', true),
  ('nutrition_professionals', 'Nutrition Professionals', 'Evidence-based nutrition strategy and day-to-day nutrition support.', 80, true, 'nutrition-professionals', 'Nutrition Professionals', 'Nutrition professionals', 'Professionals supporting food habits, nutrition strategy, and better day-to-day nutrition decisions.', true),
  ('nutrition_coaching', 'Nutrition Coaching', 'Nutrition support and accountability.', 90, true, 'nutrition-coaches', 'Nutrition Coaches', 'Nutrition coaches', 'Nutrition-focused coaches helping clients improve habits, body composition, and consistency.', true),
  ('dietitians', 'Dietitians', 'Registered dietitian support for clients who want licensed nutrition guidance.', 100, true, 'dietitians', 'Dietitians', 'Dietitians', 'Dietitians and qualified nutrition professionals whose credentials support that designation.', true),
  ('lifestyle_coaching', 'Lifestyle Coaching', 'Lifestyle, habit, and behavior-change coaching.', 110, true, 'life-coaches', 'Life Coaches', 'Life coaches', 'Professionals focused on clarity, habits, accountability, and broader life direction.', true),
  ('health_coaching', 'Health Coaching', 'Health-focused habit change, accountability, and day-to-day support.', 120, true, 'health-coaches', 'Health Coaches', 'Health coaches', 'Professionals helping clients improve sustainable health habits and lifestyle consistency.', true),
  ('wellness_coaching', 'Wellness Coaching', 'Lifestyle and habit-based coaching support.', 130, true, 'wellness-coaches', 'Wellness Coaches', 'Wellness coaches', 'Professionals supporting wellness, recovery, stress management, and daily routines.', true),
  ('yoga', 'Yoga', 'Yoga instruction and guided practice.', 140, true, 'yoga-instructors', 'Yoga Instructors', 'Yoga instructors', 'Yoga professionals offering mobility, breath, movement, and mind-body practice support.', true),
  ('pilates', 'Pilates', 'Pilates sessions focused on control, stability, and movement quality.', 150, true, 'pilates-instructors', 'Pilates Instructors', 'Pilates instructors', 'Pilates professionals helping clients build control, stability, and movement quality.', true),
  ('mobility_coaching', 'Mobility Coaching', 'Mobility, recovery, and movement-quality coaching.', 160, true, 'mobility-coaches', 'Mobility Coaches', 'Mobility coaches', 'Professionals focused on mobility, joint function, range of motion, and movement quality.', true),
  ('stretching_flexibility', 'Stretching & Flexibility', 'Stretching sessions focused on flexibility, tissue tolerance, and confidence.', 170, true, 'stretching-flexibility', 'Stretching & Flexibility Specialists', 'Stretching and flexibility specialists', 'Professionals helping clients improve flexibility, tissue tolerance, and movement confidence.', true),
  ('meditation', 'Meditation', 'Meditation guidance and mindfulness sessions.', 180, true, 'meditation-coaches', 'Meditation Coaches', 'Meditation coaches', 'Professionals guiding meditation, stress reduction, and consistency with mindfulness practice.', true),
  ('breathwork', 'Breathwork', 'Breathwork sessions and coaching.', 190, true, 'breathwork-coaches', 'Breathwork Coaches', 'Breathwork coaches', 'Professionals helping clients use breathing practices for regulation, focus, and recovery.', true),
  ('sports_performance', 'Sports Performance', 'Performance-focused support for speed, power, movement, and athletic output.', 200, true, 'sports-performance', 'Sports Performance Coaches', 'Sports performance coaches', 'Performance-focused professionals supporting speed, power, movement, and athletic output.', true)
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

update public.service_categories
set
  public_slug = coalesce(nullif(public_slug, ''), replace(slug, '_', '-')),
  public_label = coalesce(nullif(public_label, ''), name),
  public_headline = coalesce(nullif(public_headline, ''), name),
  public_short_description = coalesce(nullif(public_short_description, ''), description),
  is_visible_in_directory = coalesce(is_visible_in_directory, true)
where
  public_slug is null
  or public_slug = ''
  or public_label is null
  or public_label = ''
  or public_headline is null
  or public_headline = ''
  or public_short_description is null;

alter table public.trainer_profiles
  add column if not exists public_slug text,
  add column if not exists public_display_name text,
  add column if not exists professional_title text,
  add column if not exists review_feedback_public text,
  add column if not exists last_submitted_at timestamptz;

alter table public.certifications
  add column if not exists credential_number text,
  add column if not exists credential_type text,
  add column if not exists supporting_reference_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

with trainer_source as (
  select
    tp.id,
    coalesce(
      nullif(btrim(tp.public_display_name), ''),
      nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'coach'
    ) as resolved_display_name,
    coalesce(
      nullif(btrim(tp.professional_title), ''),
      nullif(btrim(tp.primary_specialty::text), ''),
      'Coach'
    ) as resolved_title
  from public.trainer_profiles tp
  left join public.users u
    on u.id = tp.user_id
)
update public.trainer_profiles tp
set
  public_display_name = case
    when tp.public_display_name is null or btrim(tp.public_display_name) = '' then trainer_source.resolved_display_name
    else tp.public_display_name
  end,
  professional_title = case
    when tp.professional_title is null or btrim(tp.professional_title) = '' then trainer_source.resolved_title
    else tp.professional_title
  end,
  public_slug = case
    when tp.public_slug is null or btrim(tp.public_slug) = '' then
      public.marketplace_slugify(trainer_source.resolved_display_name) || '-' || left(tp.id::text, 8)
    else
      public.marketplace_slugify(tp.public_slug)
  end
from trainer_source
where trainer_source.id = tp.id;

with latest_review_request as (
  select
    trainer_profile_id,
    max(requested_at) as latest_requested_at
  from public.trainer_verification_requests
  group by trainer_profile_id
)
update public.trainer_profiles tp
set last_submitted_at = latest_review_request.latest_requested_at
from latest_review_request
where latest_review_request.trainer_profile_id = tp.id
  and tp.last_submitted_at is null;

update public.certifications
set
  trainer_profile_id = coalesce(trainer_profile_id, trainer_id),
  issuing_body = coalesce(nullif(btrim(issuing_body), ''), nullif(btrim(cert_org), '')),
  cert_org = coalesce(nullif(btrim(cert_org), ''), nullif(btrim(issuing_body), '')),
  expiration_date = coalesce(expiration_date, expiry_date),
  expiry_date = coalesce(expiry_date, expiration_date),
  credential_number = coalesce(nullif(btrim(credential_number), ''), nullif(btrim(cert_id), '')),
  cert_id = coalesce(nullif(btrim(cert_id), ''), nullif(btrim(credential_number), '')),
  updated_at = timezone('utc', now());

create table if not exists public.saved_trainer_profiles (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references public.users(id) on delete cascade,
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (client_user_id, trainer_profile_id)
);

create table if not exists public.trainer_profile_inquiries (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete cascade,
  client_user_id uuid not null references public.users(id) on delete cascade,
  client_profile_id uuid references public.client_profiles(id) on delete set null,
  service_category_id uuid references public.service_categories(id) on delete set null,
  client_first_name text,
  service_interest text,
  goal text not null,
  preferred_service_mode text check (preferred_service_mode in ('in_person', 'online', 'hybrid')),
  message text,
  source text not null default 'website',
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'viewed', 'contacted', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists trainer_profiles_public_slug_idx
  on public.trainer_profiles (public_slug);

create unique index if not exists service_categories_public_slug_idx
  on public.service_categories (public_slug)
  where public_slug is not null;

create index if not exists trainer_profiles_marketplace_visibility_idx
  on public.trainer_profiles (profile_live, verification_status, accepting_clients, updated_at desc);

create index if not exists certifications_trainer_profile_idx
  on public.certifications (trainer_profile_id, verification_status);

create index if not exists saved_trainer_profiles_client_idx
  on public.saved_trainer_profiles (client_user_id, created_at desc);

create index if not exists trainer_profile_inquiries_trainer_idx
  on public.trainer_profile_inquiries (trainer_profile_id, status, created_at desc);

create index if not exists trainer_profile_inquiries_client_idx
  on public.trainer_profile_inquiries (client_user_id, created_at desc);

drop trigger if exists trainer_profiles_marketplace_fill_public_fields on public.trainer_profiles;
create trigger trainer_profiles_marketplace_fill_public_fields
before insert or update on public.trainer_profiles
for each row execute function public.marketplace_fill_trainer_public_fields();

drop trigger if exists trainer_profile_inquiries_set_updated_at on public.trainer_profile_inquiries;
create trigger trainer_profile_inquiries_set_updated_at
before update on public.trainer_profile_inquiries
for each row execute function public.marketplace_set_updated_at();

drop trigger if exists certifications_marketplace_sync_fields on public.certifications;
create trigger certifications_marketplace_sync_fields
before insert or update on public.certifications
for each row execute function public.marketplace_sync_certification_fields();

drop trigger if exists certifications_set_updated_at on public.certifications;
create trigger certifications_set_updated_at
before update on public.certifications
for each row execute function public.marketplace_set_updated_at();

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
          'slug', sc.public_slug,
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

create or replace view public.marketplace_trainer_profile_status_v1 as
with latest_requests as (
  select distinct on (tvr.trainer_profile_id)
    tvr.trainer_profile_id,
    tvr.request_status,
    tvr.requested_at,
    tvr.updated_at
  from public.trainer_verification_requests tvr
  order by
    tvr.trainer_profile_id,
    coalesce(tvr.updated_at, tvr.requested_at, tvr.created_at) desc
)
select
  tp.id as trainer_profile_id,
  tp.user_id,
  tp.public_slug,
  coalesce(nullif(tp.public_display_name, ''), nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''), split_part(coalesce(u.email, ''), '@', 1)) as display_name,
  case
    when coalesce(u.is_active, true) = false then 'inactive'
    when tp.reliability_suspended_until is not null and tp.reliability_suspended_until > timezone('utc', now()) then 'suspended'
    when tp.profile_live = true and lower(coalesce(tp.verification_status::text, '')) = 'verified' then 'approved'
    when lower(coalesce(lr.request_status::text, '')) = 'pending' or lower(coalesce(tp.verification_status::text, '')) in ('pending', 'under_review') then 'pending_review'
    when lower(coalesce(lr.request_status::text, '')) in ('rejected', 'denied', 'changes_required')
      or lower(coalesce(tp.verification_status::text, '')) in ('rejected', 'denied', 'failed') then 'rejected'
    else 'draft'
  end as marketplace_status,
  case
    when coalesce(u.is_active, true) = false then 'Your profile is inactive and not publicly searchable.'
    when tp.reliability_suspended_until is not null and tp.reliability_suspended_until > timezone('utc', now()) then 'Your profile is temporarily unavailable while the account is reviewed.'
    when tp.profile_live = true and lower(coalesce(tp.verification_status::text, '')) = 'verified' then 'Your profile is live on Elevare.'
    when lower(coalesce(lr.request_status::text, '')) = 'pending' or lower(coalesce(tp.verification_status::text, '')) in ('pending', 'under_review') then 'Your profile is under review and is not yet publicly searchable.'
    when lower(coalesce(lr.request_status::text, '')) in ('rejected', 'denied', 'changes_required')
      or lower(coalesce(tp.verification_status::text, '')) in ('rejected', 'denied', 'failed') then coalesce(nullif(tp.review_feedback_public, ''), 'Your profile needs changes before it can go live.')
    else 'Complete your profile and submit it for review.'
  end as status_message,
  (
    tp.profile_live = true
    and lower(coalesce(tp.verification_status::text, '')) = 'verified'
    and coalesce(tp.accepting_clients, true) = true
    and coalesce(u.is_active, true) = true
  ) as is_publicly_listed,
  tp.profile_live,
  tp.verification_status::text as verification_status,
  tp.review_feedback_public,
  tp.last_submitted_at,
  tp.onboarding_complete,
  tp.profile_complete,
  tp.accepting_clients,
  tp.inactivity_state,
  tp.reliability_suspended_until,
  lr.request_status::text as latest_request_status,
  lr.requested_at as latest_request_requested_at
from public.trainer_profiles tp
join public.users u
  on u.id = tp.user_id
left join latest_requests lr
  on lr.trainer_profile_id = tp.id;

alter table public.saved_trainer_profiles enable row level security;
alter table public.trainer_profile_inquiries enable row level security;

drop policy if exists saved_trainer_profiles_select_own on public.saved_trainer_profiles;
create policy saved_trainer_profiles_select_own
on public.saved_trainer_profiles
for select
to authenticated
using (client_user_id = public.marketplace_current_user_id());

drop policy if exists saved_trainer_profiles_insert_own on public.saved_trainer_profiles;
create policy saved_trainer_profiles_insert_own
on public.saved_trainer_profiles
for insert
to authenticated
with check (client_user_id = public.marketplace_current_user_id());

drop policy if exists saved_trainer_profiles_delete_own on public.saved_trainer_profiles;
create policy saved_trainer_profiles_delete_own
on public.saved_trainer_profiles
for delete
to authenticated
using (client_user_id = public.marketplace_current_user_id());

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
      from public.client_profiles cp
      where cp.id = trainer_profile_inquiries.client_profile_id
        and cp.user_id = public.marketplace_current_user_id()
    )
  )
);

drop policy if exists trainer_profile_inquiries_select_client_own on public.trainer_profile_inquiries;
create policy trainer_profile_inquiries_select_client_own
on public.trainer_profile_inquiries
for select
to authenticated
using (client_user_id = public.marketplace_current_user_id());

drop policy if exists trainer_profile_inquiries_select_trainer_own on public.trainer_profile_inquiries;
create policy trainer_profile_inquiries_select_trainer_own
on public.trainer_profile_inquiries
for select
to authenticated
using (
  exists (
    select 1
    from public.trainer_profiles tp
    where tp.id = trainer_profile_inquiries.trainer_profile_id
      and tp.user_id = public.marketplace_current_user_id()
  )
);

drop policy if exists trainer_profile_inquiries_update_trainer_own on public.trainer_profile_inquiries;
create policy trainer_profile_inquiries_update_trainer_own
on public.trainer_profile_inquiries
for update
to authenticated
using (
  exists (
    select 1
    from public.trainer_profiles tp
    where tp.id = trainer_profile_inquiries.trainer_profile_id
      and tp.user_id = public.marketplace_current_user_id()
  )
)
with check (
  exists (
    select 1
    from public.trainer_profiles tp
    where tp.id = trainer_profile_inquiries.trainer_profile_id
      and tp.user_id = public.marketplace_current_user_id()
  )
);

grant execute on function public.submit_current_trainer_profile_for_review(text, text) to authenticated;
grant execute on function public.marketplace_current_user_id() to authenticated;

grant select on public.marketplace_service_categories_v1 to anon, authenticated;
grant select on public.marketplace_public_trainer_profiles_v1 to anon, authenticated;
grant select on public.marketplace_trainer_profile_status_v1 to authenticated;

grant select, insert, delete on public.saved_trainer_profiles to authenticated;
grant select, insert, update on public.trainer_profile_inquiries to authenticated;
