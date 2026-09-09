begin;

alter table public.client_profiles
  add column if not exists preferred_languages text[] not null default '{}'::text[],
  add column if not exists language_required boolean not null default false;

alter table public.client_profiles
  drop constraint if exists client_profiles_preferred_languages_limit_check,
  add constraint client_profiles_preferred_languages_limit_check
    check (cardinality(preferred_languages) <= 20),
  drop constraint if exists client_profiles_language_required_check,
  add constraint client_profiles_language_required_check
    check (not language_required or cardinality(preferred_languages) > 0);

create index if not exists client_profiles_preferred_languages_idx
  on public.client_profiles using gin (preferred_languages);

comment on column public.client_profiles.preferred_languages is
  'Private, client-selected languages preferred when working with a professional. Not inferred from country or site locale.';
comment on column public.client_profiles.language_required is
  'When true, future matching should require at least one selected language rather than treating language as a ranking preference.';

commit;
