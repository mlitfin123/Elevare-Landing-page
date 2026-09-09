begin;

create table if not exists public.professional_profile_view_counts (
  trainer_profile_id uuid primary key references public.trainer_profiles(id) on delete cascade,
  view_count bigint not null default 0 check (view_count >= 0),
  last_viewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.professional_profile_view_counts enable row level security;

drop policy if exists professional_profile_view_counts_select_own
  on public.professional_profile_view_counts;
create policy professional_profile_view_counts_select_own
on public.professional_profile_view_counts
for select
to authenticated
using (
  exists (
    select 1
    from public.trainer_profiles as profile
    where profile.id = trainer_profile_id
      and profile.user_id = public.marketplace_current_user_id()
  )
);

revoke all on table public.professional_profile_view_counts from anon;
revoke insert, update, delete on table public.professional_profile_view_counts from authenticated;
grant select on table public.professional_profile_view_counts to authenticated;

create or replace function public.record_public_professional_profile_view(
  p_trainer_profile_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_view_count bigint;
begin
  if not exists (
    select 1
    from public.marketplace_public_trainer_profiles_v1 as profile
    where profile.trainer_profile_id = p_trainer_profile_id
  ) then
    return null;
  end if;

  insert into public.professional_profile_view_counts (
    trainer_profile_id,
    view_count,
    last_viewed_at,
    updated_at
  )
  values (
    p_trainer_profile_id,
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (trainer_profile_id) do update
  set
    view_count = public.professional_profile_view_counts.view_count + 1,
    last_viewed_at = excluded.last_viewed_at,
    updated_at = excluded.updated_at
  returning view_count into next_view_count;

  return next_view_count;
end;
$$;

revoke all on function public.record_public_professional_profile_view(uuid) from public;
revoke all on function public.record_public_professional_profile_view(uuid) from anon, authenticated;
grant execute on function public.record_public_professional_profile_view(uuid) to service_role;

commit;
