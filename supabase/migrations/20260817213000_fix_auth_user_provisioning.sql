-- Keep public account records consistent with Supabase Auth without deleting
-- marketplace history that may still reference a closed account.

begin;

create or replace function public.guard_sensitive_user_fields()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  allows_auto_profile_photo_review_reset boolean;
begin
  -- Trusted database functions run as postgres. Ordinary authenticated users
  -- must still be prevented from changing administrative account fields.
  if current_user in ('postgres', 'service_role', 'supabase_admin')
    or auth.role() = 'service_role'
  then
    return new;
  end if;

  if new.auth_id is distinct from old.auth_id
    or new.role is distinct from old.role
    or new.is_active is distinct from old.is_active
    or new.referral_code is distinct from old.referral_code
  then
    raise exception 'Sensitive account fields can only be updated server-side.';
  end if;

  allows_auto_profile_photo_review_reset :=
    new.profile_photo_url is distinct from old.profile_photo_url
    and new.profile_photo_review_status is not distinct from
      case
        when new.profile_photo_url is null then null
        else 'pending'
      end
    and new.profile_photo_reviewed_at is null
    and new.profile_photo_reviewed_by is null
    and new.profile_photo_review_notes is null;

  if new.profile_photo_review_status is distinct from old.profile_photo_review_status
    or new.profile_photo_reviewed_at is distinct from old.profile_photo_reviewed_at
    or new.profile_photo_reviewed_by is distinct from old.profile_photo_reviewed_by
    or new.profile_photo_review_notes is distinct from old.profile_photo_review_notes
  then
    if not allows_auto_profile_photo_review_reset then
      raise exception 'Sensitive account fields can only be updated server-side.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.archive_deleted_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  update public.users
  set
    email = 'deleted+' || id::text || '@users.invalid',
    is_active = false,
    updated_at = timezone('utc', now())
  where auth_id = old.id;

  return old;
end;
$$;

revoke all on function public.archive_deleted_auth_user() from public;
revoke all on function public.archive_deleted_auth_user() from anon;
revoke all on function public.archive_deleted_auth_user() from authenticated;
grant execute on function public.archive_deleted_auth_user() to supabase_auth_admin;
grant execute on function public.archive_deleted_auth_user() to service_role;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
after delete on auth.users
for each row execute function public.archive_deleted_auth_user();

-- Repair accounts whose Auth records were removed before the delete trigger
-- existed. IDs and related history remain intact, while emails become reusable.
update public.users as user_row
set
  email = 'deleted+' || user_row.id::text || '@users.invalid',
  is_active = false,
  updated_at = timezone('utc', now())
where not exists (
  select 1
  from auth.users as auth_user
  where auth_user.id = user_row.auth_id
)
and user_row.email <> 'deleted+' || user_row.id::text || '@users.invalid';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  metadata_role text;
  account_email text;
begin
  metadata_role := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'client');
  account_email := coalesce(
    nullif(lower(new.email), ''),
    'auth+' || new.id::text || '@users.invalid'
  );

  -- A previously deleted Auth account may have left marketplace history behind.
  -- Archive that stale identity instead of attaching its data to the new account.
  update public.users as orphaned_user
  set
    email = 'deleted+' || orphaned_user.id::text || '@users.invalid',
    is_active = false,
    updated_at = timezone('utc', now())
  where lower(orphaned_user.email) = account_email
    and orphaned_user.auth_id <> new.id
    and not exists (
      select 1
      from auth.users as existing_auth_user
      where existing_auth_user.id = orphaned_user.auth_id
    );

  insert into public.users (
    auth_id,
    email,
    role,
    first_name,
    last_name
  )
  values (
    new.id,
    account_email,
    case
      when metadata_role in ('client', 'trainer') then metadata_role::public.user_role
      else 'client'::public.user_role
    end,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  )
  on conflict (auth_id) do update
  set
    email = excluded.email,
    role = excluded.role,
    first_name = case
      when coalesce(public.users.first_name, '') = '' then excluded.first_name
      else public.users.first_name
    end,
    last_name = case
      when coalesce(public.users.last_name, '') = '' then excluded.last_name
      else public.users.last_name
    end;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;
grant execute on function public.handle_new_auth_user() to supabase_auth_admin;
grant execute on function public.handle_new_auth_user() to service_role;

commit;
