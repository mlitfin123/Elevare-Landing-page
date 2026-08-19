begin;

alter table public.trainer_profiles
  add column if not exists languages text[] not null default '{}'::text[];

alter table public.trainer_profiles
  drop constraint if exists trainer_profiles_languages_count_check,
  add constraint trainer_profiles_languages_count_check
    check (cardinality(languages) <= 20);

comment on column public.trainer_profiles.languages is
  'Optional languages the professional works in. Managed by the profile owner; reserved for future public display and filtering.';

commit;
