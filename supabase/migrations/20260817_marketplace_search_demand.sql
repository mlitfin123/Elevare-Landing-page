create table if not exists public.marketplace_search_demand (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  request_email text not null,
  category_slug text,
  specialty text,
  location_label text,
  city text,
  state text,
  service_mode text check (service_mode in ('in_person', 'online', 'hybrid')),
  budget_min_cents integer check (budget_min_cents is null or budget_min_cents >= 0),
  budget_max_cents integer check (
    budget_max_cents is null
    or budget_min_cents is null
    or budget_max_cents >= budget_min_cents
  ),
  query_text text,
  source text not null default 'website',
  filters_json jsonb not null default '{}'::jsonb,
  exact_result_count integer not null default 0 check (exact_result_count >= 0),
  fallback_result_count integer not null default 0 check (fallback_result_count >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketplace_search_demand_created_idx
  on public.marketplace_search_demand (created_at desc);

create index if not exists marketplace_search_demand_category_idx
  on public.marketplace_search_demand (category_slug, created_at desc);

create index if not exists marketplace_search_demand_location_idx
  on public.marketplace_search_demand (state, city, created_at desc);

alter table public.marketplace_search_demand enable row level security;

drop policy if exists marketplace_search_demand_insert_public on public.marketplace_search_demand;
create policy marketplace_search_demand_insert_public
on public.marketplace_search_demand
for insert
to anon, authenticated
with check (
  nullif(btrim(request_email), '') is not null
  and (
    auth.uid() is null
    or user_id is null
    or user_id = public.marketplace_current_user_id()
  )
);

drop policy if exists marketplace_search_demand_select_own on public.marketplace_search_demand;
create policy marketplace_search_demand_select_own
on public.marketplace_search_demand
for select
to authenticated
using (user_id = public.marketplace_current_user_id());

grant execute on function public.marketplace_current_user_id() to anon, authenticated;

grant insert on public.marketplace_search_demand to anon, authenticated;
grant select on public.marketplace_search_demand to authenticated;
