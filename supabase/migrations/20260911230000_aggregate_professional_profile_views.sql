-- Daily aggregate page counts. Apply before deploying the website/admin update.
-- Historical totals are preserved; individual visitor hashes are removed.
begin;

create table if not exists public.professional_profile_view_daily (
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete cascade,
  viewed_on date not null,
  view_count bigint not null check (view_count >= 0),
  primary key (trainer_profile_id, viewed_on)
);
alter table public.professional_profile_view_daily enable row level security;
revoke all on table public.professional_profile_view_daily from public, anon, authenticated;
grant select, insert, update, delete on table public.professional_profile_view_daily to service_role;

-- This is a private reporting table; owners read it only through their summary RPC.
alter table public.professional_profile_view_counts
  add column if not exists first_viewed_at timestamptz;
grant select on table public.professional_profile_view_counts to service_role;

-- Guarded so rerunning this migration cannot double-count the historical import.
do $$
begin
  if to_regclass('public.professional_profile_view_events') is not null then
    lock table public.professional_profile_view_events in access exclusive mode;
    insert into public.professional_profile_view_daily (trainer_profile_id, viewed_on, view_count)
    select trainer_profile_id, viewed_on, count(*)
    from public.professional_profile_view_events group by trainer_profile_id, viewed_on
    on conflict (trainer_profile_id, viewed_on) do update
      set view_count = public.professional_profile_view_daily.view_count + excluded.view_count;
  end if;
end;
$$;

lock table public.professional_profile_view_counts in share row exclusive mode;

-- Keep older all-time totals even when they predate the historical event table.
insert into public.professional_profile_view_counts (trainer_profile_id, view_count)
select trainer_profile_id, sum(view_count) from public.professional_profile_view_daily group by trainer_profile_id
on conflict (trainer_profile_id) do update
set view_count = greatest(public.professional_profile_view_counts.view_count, excluded.view_count);

create or replace function public.record_public_professional_profile_page_view(p_trainer_profile_id uuid)
returns bigint language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare
  view_day date := (timezone('utc', now()))::date;
  total bigint;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required.'; end if;
  if not exists (
    select 1 from public.marketplace_public_trainer_profiles_v2
    where trainer_profile_id = p_trainer_profile_id
  ) then raise exception 'Public professional profile not found.'; end if;

  insert into public.professional_profile_view_daily (trainer_profile_id, viewed_on, view_count)
  values (p_trainer_profile_id, view_day, 1)
  on conflict (trainer_profile_id, viewed_on) do update
    set view_count = public.professional_profile_view_daily.view_count + 1;

  insert into public.professional_profile_view_counts (
    trainer_profile_id, view_count, first_viewed_at, last_viewed_at, updated_at
  ) values (p_trainer_profile_id, 1, view_day, view_day, view_day)
  on conflict (trainer_profile_id) do update
    set view_count = public.professional_profile_view_counts.view_count + 1,
        last_viewed_at = excluded.last_viewed_at, updated_at = excluded.updated_at
  returning view_count into total;
  return total;
end;
$$;
revoke all on function public.record_public_professional_profile_page_view(uuid) from public, anon, authenticated;
grant execute on function public.record_public_professional_profile_page_view(uuid) to service_role;

-- Deployment compatibility: the previous server may still call this signature.
-- Its visitor hash is ignored, never retained. Deploy the new server to stop issuing cookies.
create or replace function public.record_public_professional_profile_view(p_trainer_profile_id uuid, p_visitor_key_hash text)
returns bigint language sql security definer set search_path = public, auth, pg_temp
as $$ select public.record_public_professional_profile_page_view(p_trainer_profile_id); $$;
revoke all on function public.record_public_professional_profile_view(uuid, text) from public, anon, authenticated;
grant execute on function public.record_public_professional_profile_view(uuid, text) to service_role;

create or replace function public.marketplace_get_professional_retention_summary(
  p_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  profile_row public.trainer_profiles%rowtype;
  selected_days integer;
  period_start timestamptz;
  response_sample_size integer;
  responded_count integer;
  median_response_minutes numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  selected_days := least(greatest(coalesce(p_days, 30), 1), 3650);
  period_start := timezone('utc', now()) - make_interval(days => selected_days);
  current_user_id := public.marketplace_current_user_id();

  select *
  into profile_row
  from public.trainer_profiles
  where user_id = current_user_id;

  if not found then
    raise exception 'Professional profile not found.';
  end if;

  select
    count(*)::integer,
    count(*) filter (where inquiry.first_responded_at is not null)::integer,
    percentile_cont(0.5) within group (
      order by extract(epoch from (inquiry.first_responded_at - inquiry.created_at)) / 60
    ) filter (where inquiry.first_responded_at is not null)
  into response_sample_size, responded_count, median_response_minutes
  from public.trainer_profile_inquiries inquiry
  where inquiry.trainer_profile_id = profile_row.id
    and inquiry.created_at >= timezone('utc', now()) - interval '90 days';

  return jsonb_build_object(
    'range_days', selected_days,
    'profile_status', lower(coalesce(profile_row.verification_status::text, 'draft')),
    'is_live', coalesce(profile_row.profile_live, false),
    'acceptance_status', coalesce(profile_row.client_acceptance_status, 'accepting'),
    'profile_updated_at', profile_row.updated_at,
    'profile_confirmed_at', profile_row.profile_information_confirmed_at,
    'availability_confirmed_at', profile_row.availability_confirmed_at,
    'views_in_range', (
      select coalesce(sum(daily.view_count), 0) from public.professional_profile_view_daily daily
      where daily.trainer_profile_id = profile_row.id
        and daily.viewed_on between (timezone('utc', now()))::date - (selected_days - 1)
          and (timezone('utc', now()))::date
    ),
    'views_all_time', coalesce((
      select counts.view_count from public.professional_profile_view_counts counts
      where counts.trainer_profile_id = profile_row.id
    ), 0),
    'current_saves', (
      select count(*) from public.saved_trainer_profiles saved
      where saved.trainer_profile_id = profile_row.id
    ),
    'requests_in_range', (
      select count(*) from public.trainer_profile_inquiries inquiry
      where inquiry.trainer_profile_id = profile_row.id and inquiry.created_at >= period_start
    ),
    'requests_all_time', (
      select count(*) from public.trainer_profile_inquiries inquiry
      where inquiry.trainer_profile_id = profile_row.id
    ),
    'requests_awaiting_response', (
      select count(*) from public.trainer_profile_inquiries inquiry
      where inquiry.trainer_profile_id = profile_row.id and inquiry.status in ('new', 'viewed')
    ),
    'requests_new', (
      select count(*) from public.trainer_profile_inquiries inquiry
      where inquiry.trainer_profile_id = profile_row.id and inquiry.status = 'new'
    ),
    'response_lookback_days', 90,
    'response_sample_size', response_sample_size,
    'responded_count', responded_count,
    'response_rate_percent', case
      when response_sample_size >= 3 then round((responded_count::numeric / response_sample_size::numeric) * 100)
      else null
    end,
    'median_first_response_minutes', case
      when response_sample_size >= 3 then round(median_response_minutes)
      else null
    end
  );
end;
$$;

revoke all on function public.marketplace_get_professional_retention_summary(integer)
  from public, anon;
grant execute on function public.marketplace_get_professional_retention_summary(integer)
  to authenticated;


drop table if exists public.professional_profile_view_events;
notify pgrst, 'reload schema';
commit;
