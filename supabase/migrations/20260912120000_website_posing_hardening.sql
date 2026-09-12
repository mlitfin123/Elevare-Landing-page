-- Target: Elevare-Prod. Posing locale is independent of Quick Physique flags.
-- Existing saved generation language is preserved; no report is regenerated.
alter table public.quick_analyses
  add column if not exists posing_generation_locale text;
alter table public.quick_analyses drop constraint if exists quick_analyses_posing_generation_locale_check;
alter table public.quick_analyses add constraint quick_analyses_posing_generation_locale_check
  check (posing_generation_locale is null or posing_generation_locale in ('en','es-419','pt-BR'));
comment on column public.quick_analyses.posing_generation_locale is
  'Posing narrative locale chosen at purchase. Null legacy rows retain generation_locale. Independent of Quick Physique feature flags.';
notify pgrst, 'reload schema';
