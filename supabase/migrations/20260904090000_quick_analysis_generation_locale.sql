alter table public.quick_analyses
  add column if not exists generation_locale text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quick_analyses_generation_locale_check'
      and conrelid = 'public.quick_analyses'::regclass
  ) then
    alter table public.quick_analyses
      add constraint quick_analyses_generation_locale_check
      check (generation_locale is null or generation_locale in ('en', 'es-419', 'pt-BR'));
  end if;
end $$;

comment on column public.quick_analyses.generation_locale is
  'Allowlisted locale used for generated narrative. Null legacy records are treated as English.';
