alter table public.quick_analyses
  add column if not exists analysis_mode text;

update public.quick_analyses
set analysis_mode = 'competition_prep'
where analysis_mode is null;

alter table public.quick_analyses
  alter column analysis_mode set default 'competition_prep',
  alter column analysis_mode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quick_analyses_analysis_mode_check'
      and conrelid = 'public.quick_analyses'::regclass
  ) then
    alter table public.quick_analyses
      add constraint quick_analyses_analysis_mode_check
      check (analysis_mode in ('competition_prep', 'physique_check'));
  end if;
end $$;

comment on column public.quick_analyses.analysis_mode is
  'One-time analysis mode. Existing records default to competition_prep for backward compatibility.';
