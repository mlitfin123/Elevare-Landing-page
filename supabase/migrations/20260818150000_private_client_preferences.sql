begin;

alter table public.client_profiles
  add column if not exists goal_tags text[] not null default '{}'::text[],
  add column if not exists experience_context text,
  add column if not exists budget_basis text,
  add column if not exists support_frequency text,
  add column if not exists preference_notes text;

-- New profiles should not inherit a travel distance they never selected.
alter table public.client_profiles
  alter column preferred_radius_miles drop default,
  alter column preferred_radius_miles drop not null;

alter table public.client_profiles
  drop constraint if exists client_profiles_experience_context_check,
  add constraint client_profiles_experience_context_check
    check (
      experience_context is null
      or experience_context in ('beginner', 'intermediate', 'advanced', 'not_sure', 'not_applicable')
    ),
  drop constraint if exists client_profiles_budget_range_check,
  add constraint client_profiles_budget_range_check
    check (
      budget_range is null
      or budget_range in (
        '50_70', '70_90', '90_120', '120_plus',
        'under_50', '50_100', '100_200', '200_300', '300_plus', 'flexible'
      )
    ),
  drop constraint if exists client_profiles_budget_basis_check,
  add constraint client_profiles_budget_basis_check
    check (budget_basis is null or budget_basis in ('per_session', 'per_month', 'depends')),
  drop constraint if exists client_profiles_start_timeline_check,
  add constraint client_profiles_start_timeline_check
    check (
      start_timeline is null
      or start_timeline in (
        'this_week', 'within_two_weeks',
        'asap', 'within_few_weeks', 'within_month', 'just_exploring'
      )
    ),
  drop constraint if exists client_profiles_support_frequency_check,
  add constraint client_profiles_support_frequency_check
    check (
      support_frequency is null
      or support_frequency in ('one_time', 'weekly', 'multiple_weekly', 'ongoing', 'not_sure')
    );

-- Preserve the original fitness-only goal enum while making those selections
-- available to the broader marketplace preference model.
update public.client_profiles as client
set goal_tags = coalesce(
  (
    select array_agg(distinct mapped.label order by mapped.label)
    from unnest(client.goals) as legacy(value)
    cross join lateral (
      select case legacy.value::text
        when 'fat_loss' then 'Lose Body Fat'
        when 'muscle_gain_body_recomposition' then 'Body Recomposition'
        when 'strength_training' then 'Get Stronger'
        when 'general_fitness' then 'Improve General Fitness'
        when 'beginner_coaching' then 'Learn to Exercise'
        when 'womens_fitness' then 'Improve General Fitness'
        when 'mobility_flexibility' then 'Improve Mobility'
        when 'athletic_performance' then 'Improve Athletic Performance'
        when 'senior_fitness' then 'Healthy Aging'
        when 'injury_aware_training' then 'Return to Exercise'
        when 'competition_prep' then 'Prepare for a Competition'
        when 'online_coaching' then 'Increase Accountability'
        else null
      end as label
    ) as mapped
    where mapped.label is not null
  ),
  '{}'::text[]
)
where cardinality(client.goal_tags) = 0
  and client.goals is not null;

update public.client_profiles
set experience_context = fitness_level::text
where experience_context is null
  and fitness_level is not null;

create index if not exists client_profiles_goal_tags_idx
  on public.client_profiles using gin (goal_tags);

create index if not exists client_profiles_interested_categories_idx
  on public.client_profiles using gin (interested_service_category_slugs);

alter table public.trainer_profile_inquiries
  add column if not exists start_timeline text;

alter table public.trainer_profile_inquiries
  drop constraint if exists trainer_profile_inquiries_start_timeline_check,
  add constraint trainer_profile_inquiries_start_timeline_check
    check (
      start_timeline is null
      or start_timeline in ('asap', 'within_few_weeks', 'within_month', 'just_exploring')
    );

-- Client discovery preferences are private. Providers receive only the fields a
-- client explicitly submits on an inquiry, never broad table access.
drop policy if exists "Authenticated users can view client profiles" on public.client_profiles;

drop policy if exists "Clients can read own profile by user_id" on public.client_profiles;
create policy "Clients can read own profile by user_id"
on public.client_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = client_profiles.user_id
      and users.auth_id = auth.uid()
  )
);

drop policy if exists "Matched professionals can read active client profiles" on public.client_profiles;
create policy "Matched professionals can read active client profiles"
on public.client_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.matches as match_record
    join public.trainer_profiles as trainer
      on trainer.id = match_record.trainer_profile_id
    join public.users as trainer_user
      on trainer_user.id = trainer.user_id
    where match_record.client_profile_id = client_profiles.id
      and trainer_user.auth_id = auth.uid()
      and match_record.status in ('pending_client', 'accepted', 'active', 'completed')
  )
);

revoke all on table public.client_profiles from anon;

comment on column public.client_profiles.goal_tags is
  'Private, client-selected marketplace goals. Not a medical or diagnostic record.';
comment on column public.client_profiles.preference_notes is
  'Optional private discovery context. Shared only when copied into a user-submitted inquiry.';
comment on column public.client_profiles.interested_service_category_slugs is
  'Private category interests used to improve marketplace matching.';

commit;
