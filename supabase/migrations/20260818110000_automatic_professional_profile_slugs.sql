-- Professional profile URLs are generated from display names. Existing slugs
-- remain stable, and matching names receive sequential numeric suffixes.

begin;

create or replace function public.marketplace_next_trainer_slug(
  display_name text,
  profile_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
begin
  base_slug := left(public.marketplace_slugify(display_name), 80);

  if coalesce(base_slug, '') = '' then
    base_slug := 'professional';
  end if;

  -- Serialize profiles competing for the same base slug so concurrent inserts
  -- cannot both claim the same public URL.
  perform pg_advisory_xact_lock(hashtextextended('trainer-profile:' || base_slug, 0));

  candidate_slug := base_slug;

  loop
    exit when not exists (
      select 1
      from public.trainer_profiles as existing_profile
      where lower(existing_profile.public_slug) = lower(candidate_slug)
        and existing_profile.id <> profile_id
    )
    and not exists (
      select 1
      from public.service_categories as category
      where lower(category.public_slug) = lower(candidate_slug)
    );

    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::text;
  end loop;

  return candidate_slug;
end;
$$;

revoke all on function public.marketplace_next_trainer_slug(text, uuid) from public;
grant execute on function public.marketplace_next_trainer_slug(text, uuid) to authenticated;
grant execute on function public.marketplace_next_trainer_slug(text, uuid) to service_role;

create or replace function public.marketplace_fill_trainer_public_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
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
    'Professional'
  );

  if new.public_display_name is null or btrim(new.public_display_name) = '' then
    new.public_display_name := resolved_name;
  end if;

  if new.professional_title is null or btrim(new.professional_title) = '' then
    new.professional_title := coalesce(nullif(btrim(new.primary_specialty::text), ''), 'Professional');
  end if;

  if tg_op = 'INSERT' then
    new.public_slug := public.marketplace_next_trainer_slug(resolved_name, new.id);
  elsif old.public_slug is null or btrim(old.public_slug) = '' then
    new.public_slug := public.marketplace_next_trainer_slug(resolved_name, new.id);
  else
    -- Public URLs stay stable after creation, including when a display name is edited.
    new.public_slug := old.public_slug;
  end if;

  return new;
end;
$$;

create unique index if not exists trainer_profiles_public_slug_unique_idx
  on public.trainer_profiles (lower(public_slug))
  where public_slug is not null and btrim(public_slug) <> '';

commit;
