create extension if not exists pgcrypto;

create or replace function public.slugify_text(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_slug text;
begin
  v_slug := lower(coalesce(p_value, ''));
  v_slug := replace(v_slug, '&', ' and ');
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-{2,}', '-', 'g');
  v_slug := trim(both '-' from v_slug);

  if v_slug = '' then
    return 'item';
  end if;

  return v_slug;
end;
$$;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  primary_muscle_group text,
  secondary_muscle_groups text[] not null default '{}'::text[],
  equipment text[] not null default '{}'::text[],
  movement_pattern text,
  difficulty text,
  exercise_type text,
  is_compound boolean not null default false,
  instructions text[] not null default '{}'::text[],
  common_mistakes text[] not null default '{}'::text[],
  benefits text[] not null default '{}'::text[],
  alternatives text[] not null default '{}'::text[],
  variations text[] not null default '{}'::text[],
  seo_title text,
  seo_description text,
  source text,
  source_license text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint exercises_name_check check (char_length(trim(name)) > 0)
);

alter table public.exercises enable row level security;

create unique index if not exists exercises_slug_key on public.exercises (slug);
create index if not exists exercises_slug_idx on public.exercises (slug);
create index if not exists exercises_primary_muscle_group_idx on public.exercises (primary_muscle_group);
create index if not exists exercises_difficulty_idx on public.exercises (difficulty);
create index if not exists exercises_secondary_muscle_groups_gin_idx on public.exercises using gin (secondary_muscle_groups);
create index if not exists exercises_equipment_gin_idx on public.exercises using gin (equipment);

drop policy if exists exercises_select_public on public.exercises;
create policy exercises_select_public
on public.exercises
for select
using (true);

grant select on public.exercises to anon, authenticated;
grant all on public.exercises to service_role;

create or replace function public.ensure_exercise_slug()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_base_slug text;
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.slug is null or btrim(new.slug) = '' then
    v_base_slug := public.slugify_text(new.name);
  else
    v_base_slug := public.slugify_text(new.slug);
  end if;

  if exists (
    select 1
    from public.exercises
    where slug = v_base_slug
      and id <> new.id
  ) then
    v_base_slug := left(v_base_slug, 110) || '-' || left(new.id::text, 8);
  end if;

  new.slug := v_base_slug;
  return new;
end;
$$;

drop trigger if exists exercises_ensure_slug on public.exercises;
create trigger exercises_ensure_slug
before insert or update on public.exercises
for each row
execute function public.ensure_exercise_slug();

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
before update on public.exercises
for each row
execute function public.set_updated_at();

alter table public.workout_templates
  add column if not exists slug text,
  add column if not exists goal text,
  add column if not exists difficulty text,
  add column if not exists estimated_duration_minutes integer,
  add column if not exists equipment text[] not null default '{}'::text[],
  add column if not exists overview text,
  add column if not exists who_it_is_for text,
  add column if not exists warmup_guidance text,
  add column if not exists progression_guidance text,
  add column if not exists experience_level text,
  add column if not exists training_days_per_week integer,
  add column if not exists target_muscle_groups text[] not null default '{}'::text[],
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists is_public boolean not null default false;

alter table public.workout_templates
  alter column user_id drop not null;

update public.workout_templates
set slug = public.slugify_text(name) || '-' || left(id::text, 8)
where slug is null or btrim(slug) = '';

alter table public.workout_templates
  alter column slug set not null;

create unique index if not exists workout_templates_slug_key on public.workout_templates (slug);
create index if not exists workout_templates_slug_idx on public.workout_templates (slug);
create index if not exists workout_templates_goal_idx on public.workout_templates (goal);
create index if not exists workout_templates_public_goal_idx on public.workout_templates (is_public, goal);
create index if not exists workout_templates_equipment_gin_idx on public.workout_templates using gin (equipment);
create index if not exists workout_templates_target_muscle_groups_gin_idx on public.workout_templates using gin (target_muscle_groups);

create or replace function public.ensure_workout_template_slug()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_base_slug text;
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.slug is null or btrim(new.slug) = '' then
    v_base_slug := public.slugify_text(new.name);

    if coalesce(new.is_public, false) then
      new.slug := v_base_slug;
    else
      new.slug := left(v_base_slug, 110) || '-' || left(new.id::text, 8);
    end if;
  else
    new.slug := public.slugify_text(new.slug);
  end if;

  if exists (
    select 1
    from public.workout_templates
    where slug = new.slug
      and id <> new.id
  ) then
    v_base_slug := public.slugify_text(new.name);
    new.slug := left(v_base_slug, 110) || '-' || left(new.id::text, 8);
  end if;

  return new;
end;
$$;

drop trigger if exists workout_templates_ensure_slug on public.workout_templates;
create trigger workout_templates_ensure_slug
before insert or update on public.workout_templates
for each row
execute function public.ensure_workout_template_slug();

alter table public.workout_template_exercises
  add column if not exists workout_template_id uuid,
  add column if not exists exercise_id uuid,
  add column if not exists day_label text,
  add column if not exists section text,
  add column if not exists sets text,
  add column if not exists reps text,
  add column if not exists rest_seconds integer,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

update public.workout_template_exercises
set workout_template_id = template_id
where workout_template_id is null;

create or replace function public.sync_workout_template_exercise_refs()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.template_id is null and new.workout_template_id is not null then
    new.template_id := new.workout_template_id;
  elsif new.workout_template_id is null and new.template_id is not null then
    new.workout_template_id := new.template_id;
  elsif new.template_id is not null and new.workout_template_id is not null and new.template_id <> new.workout_template_id then
    raise exception 'template_id and workout_template_id must match.';
  end if;

  if new.exercise_name is null or btrim(new.exercise_name) = '' then
    select name
    into new.exercise_name
    from public.exercises
    where id = new.exercise_id;
  end if;

  return new;
end;
$$;

drop trigger if exists workout_template_exercises_sync_refs on public.workout_template_exercises;
create trigger workout_template_exercises_sync_refs
before insert or update on public.workout_template_exercises
for each row
execute function public.sync_workout_template_exercise_refs();

alter table public.workout_template_exercises
  alter column workout_template_id set not null;

alter table public.workout_template_exercises
  add constraint workout_template_exercises_template_sync_check
  check (template_id = workout_template_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_template_exercises_workout_template_id_fkey'
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_workout_template_id_fkey
      foreign key (workout_template_id) references public.workout_templates(id) on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_template_exercises_exercise_id_fkey'
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_exercise_id_fkey
      foreign key (exercise_id) references public.exercises(id) on delete set null;
  end if;
end
$$;

create index if not exists workout_template_exercises_workout_template_id_idx
  on public.workout_template_exercises (workout_template_id);
create index if not exists workout_template_exercises_exercise_id_idx
  on public.workout_template_exercises (exercise_id);

alter table public.workout_exercises
  add column if not exists exercise_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_exercises_exercise_id_fkey'
  ) then
    alter table public.workout_exercises
      add constraint workout_exercises_exercise_id_fkey
      foreign key (exercise_id) references public.exercises(id) on delete set null;
  end if;
end
$$;

create index if not exists workout_exercises_exercise_id_idx
  on public.workout_exercises (exercise_id);

create or replace function public.ensure_workout_template_ownership()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_template_owner uuid;
  v_is_public boolean;
begin
  if new.template_id is null then
    return new;
  end if;

  select user_id, is_public
  into v_template_owner, v_is_public
  from public.workout_templates
  where id = new.template_id;

  if not found then
    raise exception 'Workout template not found.';
  end if;

  if coalesce(v_is_public, false) then
    return new;
  end if;

  if v_template_owner is distinct from new.user_id then
    raise exception 'Workout template does not belong to the workout user.';
  end if;

  return new;
end;
$$;

drop policy if exists workout_templates_select_own on public.workout_templates;
drop policy if exists workout_templates_select_public_or_own on public.workout_templates;
create policy workout_templates_select_public_or_own
on public.workout_templates
for select
using (is_public or auth.uid() = user_id);

drop policy if exists workout_template_exercises_select_own on public.workout_template_exercises;
drop policy if exists workout_template_exercises_select_public_or_own on public.workout_template_exercises;
create policy workout_template_exercises_select_public_or_own
on public.workout_template_exercises
for select
using (
  exists (
    select 1
    from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
      and (workout_templates.is_public or workout_templates.user_id = auth.uid())
  )
);
