-- Lightweight, human-operated marketplace concierge workflow.
-- The separate Elevare admin project remains the sole operational interface.
-- Notification records are intentionally created as disabled; this migration
-- does not install a scheduler or send email.

begin;

alter table public.marketplace_search_demand
  add column if not exists status text not null default 'new',
  add column if not exists admin_notes text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists request_key text,
  add column if not exists primary_goal text,
  add column if not exists support_type text,
  add column if not exists travel_radius_miles integer,
  add column if not exists start_timeframe text,
  add column if not exists general_availability text,
  add column if not exists experience_level text,
  add column if not exists preferred_languages text[] not null default '{}'::text[],
  add column if not exists language_required boolean not null default false,
  add column if not exists service_preferences text[] not null default '{}'::text[],
  add column if not exists share_consent_at timestamptz,
  add column if not exists preferred_locale text not null default 'en';

alter table public.marketplace_search_demand
  drop constraint if exists marketplace_search_demand_status_check,
  add constraint marketplace_search_demand_status_check
    check (status in ('new', 'reviewing', 'matched', 'closed')),
  drop constraint if exists marketplace_search_demand_travel_radius_check,
  add constraint marketplace_search_demand_travel_radius_check
    check (travel_radius_miles is null or travel_radius_miles between 1 and 250),
  drop constraint if exists marketplace_search_demand_experience_check,
  add constraint marketplace_search_demand_experience_check
    check (experience_level is null or experience_level in ('beginner', 'intermediate', 'advanced', 'not_sure', 'not_applicable')),
  drop constraint if exists marketplace_search_demand_locale_check,
  add constraint marketplace_search_demand_locale_check
    check (preferred_locale in ('en', 'es-419', 'pt-BR')),
  drop constraint if exists marketplace_search_demand_language_limit_check,
  add constraint marketplace_search_demand_language_limit_check
    check (cardinality(preferred_languages) <= 10),
  drop constraint if exists marketplace_search_demand_language_required_check,
  add constraint marketplace_search_demand_language_required_check
    check (not language_required or cardinality(preferred_languages) > 0),
  drop constraint if exists marketplace_search_demand_service_preferences_limit_check,
  add constraint marketplace_search_demand_service_preferences_limit_check
    check (cardinality(service_preferences) <= 10),
  drop constraint if exists marketplace_search_demand_concise_text_check,
  add constraint marketplace_search_demand_concise_text_check
    check (
      char_length(coalesce(primary_goal, '')) <= 120
      and char_length(coalesce(support_type, '')) <= 120
      and char_length(coalesce(general_availability, '')) <= 500
      and char_length(coalesce(query_text, '')) <= 1000
    );

create unique index if not exists marketplace_search_demand_user_request_key_idx
  on public.marketplace_search_demand (user_id, request_key)
  where user_id is not null and request_key is not null;

create or replace function public.marketplace_concierge_normalize_locale(value text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(value, '')) in ('pt-br', 'pt_br') then 'pt-BR'
    when lower(coalesce(value, '')) = 'es-419' or lower(coalesce(value, '')) like 'es-%' then 'es-419'
    else 'en'
  end;
$$;

create table if not exists public.marketplace_concierge_cases (
  id uuid primary key default gen_random_uuid(),
  public_case_code text not null unique default (
    'EVR-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12))
  ),
  client_user_id uuid references public.users(id) on delete set null,
  source_request_id uuid not null unique references public.marketplace_search_demand(id) on delete restrict,
  status text not null default 'submitted',
  assigned_operator_user_id uuid references public.users(id) on delete set null,
  preferred_locale text not null default 'en',
  sharing_consent_at timestamptz not null,
  last_activity_at timestamptz not null default timezone('utc', now()),
  follow_up_due_at timestamptz,
  outcome_code text,
  outcome_reported_by text,
  outcome_reported_at timestamptz,
  closure_reason_code text,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_concierge_case_status_check check (status in (
    'submitted', 'reviewing', 'needs_client_information', 'sourcing_professionals',
    'awaiting_professional_response', 'recommendations_ready', 'introduction_ready',
    'introduced', 'follow_up_due', 'consultation_reported', 'rematch_requested',
    'no_inventory', 'closed'
  )),
  constraint marketplace_concierge_case_locale_check check (preferred_locale in ('en', 'es-419', 'pt-BR')),
  constraint marketplace_concierge_case_outcome_reporter_check check (
    outcome_reported_by is null or outcome_reported_by in ('client', 'professional', 'operator')
  ),
  constraint marketplace_concierge_case_code_check check (public_case_code ~ '^EVR-[A-F0-9]{12}$')
);

create table if not exists public.marketplace_concierge_recommendations (
  id uuid primary key default gen_random_uuid(),
  public_recommendation_code text not null unique default (
    'REC-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12))
  ),
  case_id uuid not null references public.marketplace_concierge_cases(id) on delete cascade,
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete restrict,
  cycle_number integer not null default 1 check (cycle_number between 1 and 25),
  status text not null default 'selected',
  selection_reason_codes text[] not null default '{}'::text[],
  client_safe_fit_summary text,
  mismatch_flags text[] not null default '{}'::text[],
  response_deadline_at timestamptz,
  professional_responded_at timestamptz,
  professional_response_reason_code text,
  professional_clarification_note text,
  client_decision_reason_code text,
  client_responded_at timestamptz,
  introduced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_concierge_recommendation_status_check check (status in (
    'selected', 'awaiting_professional_response', 'interested', 'declined',
    'clarification_requested', 'no_response', 'expired', 'withdrawn', 'shortlisted',
    'client_selected', 'client_not_interested', 'introduced', 'consultation_reported',
    'hired_reported', 'unsuccessful'
  )),
  constraint marketplace_concierge_fit_summary_check check (char_length(coalesce(client_safe_fit_summary, '')) <= 750),
  constraint marketplace_concierge_clarification_check check (char_length(coalesce(professional_clarification_note, '')) <= 750),
  constraint marketplace_concierge_reason_limit_check check (cardinality(selection_reason_codes) <= 12),
  constraint marketplace_concierge_mismatch_limit_check check (cardinality(mismatch_flags) <= 8),
  constraint marketplace_concierge_recommendation_code_check check (public_recommendation_code ~ '^REC-[A-F0-9]{12}$'),
  unique (case_id, trainer_profile_id, cycle_number)
);

create table if not exists public.marketplace_concierge_introductions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.marketplace_concierge_cases(id) on delete cascade,
  recommendation_id uuid not null unique references public.marketplace_concierge_recommendations(id) on delete cascade,
  client_authorized_at timestamptz not null,
  professional_authorized_at timestamptz not null,
  shared_fields text[] not null default array['client_email', 'professional_email']::text[],
  introduced_at timestamptz,
  completed_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_concierge_shared_fields_check check (
    shared_fields <@ array['client_email', 'professional_email', 'client_first_name', 'professional_name']::text[]
  )
);

create table if not exists public.marketplace_concierge_follow_ups (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.marketplace_concierge_cases(id) on delete cascade,
  recommendation_id uuid references public.marketplace_concierge_recommendations(id) on delete cascade,
  follow_up_kind text not null,
  due_at timestamptz not null,
  status text not null default 'pending',
  dedupe_key text not null unique,
  completed_at timestamptz,
  completed_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_concierge_follow_up_status_check check (status in ('pending', 'completed', 'cancelled')),
  constraint marketplace_concierge_follow_up_kind_check check (follow_up_kind in (
    'professional_response', 'client_shortlist', 'post_introduction', 'consultation_outcome', 'rematch_review'
  ))
);

create table if not exists public.marketplace_concierge_internal_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.marketplace_concierge_cases(id) on delete cascade,
  author_user_id uuid references public.users(id) on delete set null,
  note text not null check (char_length(btrim(note)) between 1 and 4000),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.marketplace_concierge_audit_log (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.marketplace_concierge_cases(id) on delete cascade,
  recommendation_id uuid references public.marketplace_concierge_recommendations(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  previous_state jsonb not null default '{}'::jsonb,
  new_state jsonb not null default '{}'::jsonb,
  reason_code text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_concierge_audit_role_check check (actor_role in ('client', 'professional', 'operator', 'system')),
  constraint marketplace_concierge_audit_entity_check check (entity_type in ('case', 'recommendation', 'introduction', 'follow_up'))
);

create table if not exists public.marketplace_concierge_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.marketplace_concierge_cases(id) on delete cascade,
  recommendation_id uuid references public.marketplace_concierge_recommendations(id) on delete cascade,
  event_type text not null,
  recipient_user_id uuid references public.users(id) on delete set null,
  recipient_role text not null,
  locale text not null default 'en',
  safe_payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status text not null default 'disabled',
  queued_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_concierge_notification_role_check check (recipient_role in ('client', 'professional', 'operator')),
  constraint marketplace_concierge_notification_locale_check check (locale in ('en', 'es-419', 'pt-BR')),
  constraint marketplace_concierge_notification_status_check check (status in ('disabled', 'queued', 'processing', 'sent', 'failed', 'cancelled'))
);

create index if not exists marketplace_concierge_cases_client_idx
  on public.marketplace_concierge_cases (client_user_id, created_at desc);
create index if not exists marketplace_concierge_cases_queue_idx
  on public.marketplace_concierge_cases (status, follow_up_due_at, created_at);
create index if not exists marketplace_concierge_recommendations_case_idx
  on public.marketplace_concierge_recommendations (case_id, cycle_number, status);
create index if not exists marketplace_concierge_recommendations_profile_idx
  on public.marketplace_concierge_recommendations (trainer_profile_id, status, response_deadline_at);
create index if not exists marketplace_concierge_follow_ups_due_idx
  on public.marketplace_concierge_follow_ups (status, due_at);
create index if not exists marketplace_concierge_audit_case_idx
  on public.marketplace_concierge_audit_log (case_id, created_at desc);

create or replace function public.marketplace_concierge_case_transition_allowed(old_status text, new_status text)
returns boolean
language sql
immutable
as $$
  select old_status = new_status or (old_status, new_status) in (
    ('submitted', 'reviewing'), ('submitted', 'closed'),
    ('reviewing', 'needs_client_information'), ('reviewing', 'sourcing_professionals'), ('reviewing', 'no_inventory'), ('reviewing', 'closed'),
    ('needs_client_information', 'reviewing'), ('needs_client_information', 'closed'),
    ('sourcing_professionals', 'awaiting_professional_response'), ('sourcing_professionals', 'no_inventory'), ('sourcing_professionals', 'closed'),
    ('awaiting_professional_response', 'recommendations_ready'), ('awaiting_professional_response', 'sourcing_professionals'), ('awaiting_professional_response', 'no_inventory'), ('awaiting_professional_response', 'closed'),
    ('recommendations_ready', 'introduction_ready'), ('recommendations_ready', 'rematch_requested'), ('recommendations_ready', 'closed'),
    ('introduction_ready', 'introduced'), ('introduction_ready', 'rematch_requested'), ('introduction_ready', 'closed'),
    ('introduced', 'follow_up_due'), ('introduced', 'consultation_reported'), ('introduced', 'rematch_requested'), ('introduced', 'closed'),
    ('follow_up_due', 'consultation_reported'), ('follow_up_due', 'rematch_requested'), ('follow_up_due', 'closed'),
    ('consultation_reported', 'rematch_requested'), ('consultation_reported', 'closed'),
    ('rematch_requested', 'reviewing'), ('rematch_requested', 'sourcing_professionals'), ('rematch_requested', 'no_inventory'), ('rematch_requested', 'closed'),
    ('no_inventory', 'reviewing'), ('no_inventory', 'sourcing_professionals'), ('no_inventory', 'closed')
  );
$$;

create or replace function public.marketplace_concierge_recommendation_transition_allowed(old_status text, new_status text)
returns boolean
language sql
immutable
as $$
  select old_status = new_status or (old_status, new_status) in (
    ('selected', 'awaiting_professional_response'), ('selected', 'withdrawn'),
    ('awaiting_professional_response', 'interested'), ('awaiting_professional_response', 'declined'),
    ('awaiting_professional_response', 'clarification_requested'), ('awaiting_professional_response', 'no_response'),
    ('awaiting_professional_response', 'expired'), ('awaiting_professional_response', 'withdrawn'),
    ('clarification_requested', 'awaiting_professional_response'), ('clarification_requested', 'interested'),
    ('clarification_requested', 'declined'), ('clarification_requested', 'expired'), ('clarification_requested', 'withdrawn'),
    ('interested', 'shortlisted'), ('interested', 'withdrawn'),
    ('shortlisted', 'client_selected'), ('shortlisted', 'client_not_interested'), ('shortlisted', 'withdrawn'),
    ('client_selected', 'introduced'), ('client_selected', 'withdrawn'),
    ('introduced', 'consultation_reported'), ('introduced', 'hired_reported'), ('introduced', 'unsuccessful'),
    ('consultation_reported', 'hired_reported'), ('consultation_reported', 'unsuccessful')
  );
$$;

create or replace function public.marketplace_concierge_guard_case_update()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if new.id <> old.id
    or new.public_case_code <> old.public_case_code
    or (
      new.client_user_id is distinct from old.client_user_id
      and not (new.client_user_id is null and new.closure_reason_code = 'account_deleted')
    )
    or new.source_request_id <> old.source_request_id then
    raise exception 'Concierge case ownership fields are immutable.';
  end if;

  if not public.marketplace_concierge_case_transition_allowed(old.status, new.status) then
    raise exception 'Invalid concierge case transition from % to %.', old.status, new.status;
  end if;

  new.updated_at := timezone('utc', now());
  new.last_activity_at := timezone('utc', now());
  if new.status = 'closed' and new.closed_at is null then new.closed_at := timezone('utc', now()); end if;
  return new;
end;
$$;

drop trigger if exists marketplace_concierge_guard_case_update on public.marketplace_concierge_cases;
create trigger marketplace_concierge_guard_case_update
before update on public.marketplace_concierge_cases
for each row execute function public.marketplace_concierge_guard_case_update();

create or replace function public.marketplace_concierge_guard_recommendation()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  selected_count integer;
begin
  if tg_op = 'UPDATE' then
    if new.case_id <> old.case_id or new.trainer_profile_id <> old.trainer_profile_id or new.cycle_number <> old.cycle_number then
      raise exception 'Concierge recommendation identity fields are immutable.';
    end if;
    if not public.marketplace_concierge_recommendation_transition_allowed(old.status, new.status) then
      raise exception 'Invalid recommendation transition from % to %.', old.status, new.status;
    end if;
  end if;

  if tg_op = 'INSERT' then
    select count(*) into selected_count
    from public.marketplace_concierge_recommendations
    where case_id = new.case_id and cycle_number = new.cycle_number;
    if selected_count >= 5 then raise exception 'A concierge cycle may contain no more than five candidates.'; end if;
  end if;

  if (tg_op = 'INSERT' or new.status in ('interested', 'shortlisted', 'client_selected', 'introduced')) and not exists (
    select 1 from public.marketplace_public_trainer_profiles_v2 as profile
    where profile.trainer_profile_id = new.trainer_profile_id
      and profile.accepting_clients = true
      and coalesce(profile.client_acceptance_status, 'accepting') in ('accepting', 'waitlist')
  ) then
    raise exception 'Only approved, active, live professionals accepting clients may be selected.';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists marketplace_concierge_guard_recommendation on public.marketplace_concierge_recommendations;
create trigger marketplace_concierge_guard_recommendation
before insert or update on public.marketplace_concierge_recommendations
for each row execute function public.marketplace_concierge_guard_recommendation();

create or replace function public.marketplace_concierge_cancel_irrelevant_follow_ups()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    update public.marketplace_concierge_follow_ups
    set status = 'cancelled'
    where case_id = new.id
      and status = 'pending'
      and (
        new.status = 'closed'
        or (follow_up_kind = 'professional_response' and new.status not in ('awaiting_professional_response', 'sourcing_professionals'))
        or (follow_up_kind = 'client_shortlist' and new.status not in ('recommendations_ready'))
        or (follow_up_kind in ('post_introduction', 'consultation_outcome') and new.status not in ('introduced', 'follow_up_due'))
      );
  end if;
  return new;
end;
$$;

drop trigger if exists marketplace_concierge_cancel_irrelevant_follow_ups on public.marketplace_concierge_cases;
create trigger marketplace_concierge_cancel_irrelevant_follow_ups
after update on public.marketplace_concierge_cases
for each row execute function public.marketplace_concierge_cancel_irrelevant_follow_ups();

create or replace function public.marketplace_submit_concierge_request(
  p_request_key text,
  p_primary_goal text,
  p_support_type text,
  p_category_slug text default null,
  p_specialty text default null,
  p_service_mode text default null,
  p_location_label text default null,
  p_travel_radius_miles integer default null,
  p_budget_min_cents integer default null,
  p_budget_max_cents integer default null,
  p_start_timeframe text default null,
  p_general_availability text default null,
  p_experience_level text default null,
  p_preferred_languages text[] default '{}'::text[],
  p_language_required boolean default false,
  p_service_preferences text[] default '{}'::text[],
  p_note text default null,
  p_share_consent boolean default false,
  p_locale text default 'en',
  p_source_page text default 'professionals'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  current_email text;
  normalized_locale text;
  city_part text;
  state_part text;
  demand_row public.marketplace_search_demand%rowtype;
  case_row public.marketplace_concierge_cases%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  current_user_id := public.marketplace_current_user_id();
  if current_user_id is null then raise exception 'Marketplace account not found.'; end if;
  if not p_share_consent then raise exception 'Consent is required before selected professionals can review this request.'; end if;
  if nullif(btrim(p_request_key), '') is null or char_length(p_request_key) > 100 then raise exception 'A valid request key is required.'; end if;
  if nullif(btrim(p_primary_goal), '') is null or char_length(btrim(p_primary_goal)) > 120 then raise exception 'Add a concise primary goal.'; end if;
  if nullif(btrim(p_support_type), '') is null or char_length(btrim(p_support_type)) > 120 then raise exception 'Select the type of support requested.'; end if;
  if p_service_mode is not null and p_service_mode not in ('in_person', 'online', 'hybrid') then raise exception 'Invalid service mode.'; end if;
  if p_travel_radius_miles is not null and p_travel_radius_miles not between 1 and 250 then raise exception 'Invalid travel radius.'; end if;
  if p_budget_min_cents is not null and p_budget_min_cents < 0 then raise exception 'Invalid budget.'; end if;
  if p_budget_max_cents is not null and p_budget_max_cents < coalesce(p_budget_min_cents, 0) then raise exception 'Invalid budget range.'; end if;
  if p_experience_level is not null and p_experience_level not in ('beginner', 'intermediate', 'advanced', 'not_sure', 'not_applicable') then raise exception 'Invalid experience level.'; end if;
  if cardinality(coalesce(p_preferred_languages, '{}'::text[])) > 10 then raise exception 'Too many language preferences.'; end if;
  if p_language_required and cardinality(coalesce(p_preferred_languages, '{}'::text[])) = 0 then raise exception 'Select a language when language is required.'; end if;
  if cardinality(coalesce(p_service_preferences, '{}'::text[])) > 10 then raise exception 'Too many service preferences.'; end if;
  if char_length(coalesce(p_general_availability, '')) > 500 or char_length(coalesce(p_note, '')) > 1000 then raise exception 'Keep request details concise.'; end if;

  select email, public.marketplace_concierge_normalize_locale(coalesce(preferred_locale, p_locale))
  into current_email, normalized_locale
  from public.users where id = current_user_id;
  if nullif(btrim(current_email), '') is null then raise exception 'A verified account email is required.'; end if;

  select nullif(btrim(split_part(coalesce(p_location_label, ''), ',', 1)), ''),
         case
           when strpos(coalesce(p_location_label, ''), ',') > 0
             then nullif(btrim(substr(p_location_label, strpos(p_location_label, ',') + 1)), '')
           else null
         end
  into city_part, state_part;

  select * into demand_row
  from public.marketplace_search_demand
  where user_id = current_user_id and request_key = btrim(p_request_key)
  limit 1;

  if demand_row.id is not null then
    select * into case_row from public.marketplace_concierge_cases where source_request_id = demand_row.id;
    return jsonb_build_object('case_code', case_row.public_case_code, 'status', case_row.status, 'duplicate', true);
  end if;

  insert into public.marketplace_search_demand (
    user_id, request_email, category_slug, specialty, location_label, city, state,
    service_mode, budget_min_cents, budget_max_cents, query_text, source, filters_json,
    primary_goal, support_type, travel_radius_miles, start_timeframe, general_availability,
    experience_level, preferred_languages, language_required, service_preferences,
    share_consent_at, preferred_locale, request_key
  ) values (
    current_user_id, current_email, nullif(btrim(p_category_slug), ''), nullif(btrim(p_specialty), ''),
    nullif(btrim(p_location_label), ''), city_part, state_part, p_service_mode,
    p_budget_min_cents, p_budget_max_cents, nullif(btrim(p_note), ''), 'website_concierge',
    jsonb_build_object('source_page', left(coalesce(p_source_page, 'professionals'), 120)),
    btrim(p_primary_goal), btrim(p_support_type), p_travel_radius_miles,
    nullif(btrim(p_start_timeframe), ''), nullif(btrim(p_general_availability), ''),
    p_experience_level, coalesce(p_preferred_languages, '{}'::text[]), p_language_required,
    coalesce(p_service_preferences, '{}'::text[]), timezone('utc', now()), normalized_locale,
    btrim(p_request_key)
  ) returning * into demand_row;

  insert into public.marketplace_concierge_cases (
    client_user_id, source_request_id, preferred_locale, sharing_consent_at
  ) values (
    current_user_id, demand_row.id, normalized_locale, demand_row.share_consent_at
  ) returning * into case_row;

  insert into public.marketplace_concierge_audit_log (
    case_id, actor_user_id, actor_role, action, entity_type, new_state
  ) values (
    case_row.id, current_user_id, 'client', 'case_created', 'case', jsonb_build_object('status', case_row.status)
  );

  insert into public.marketplace_concierge_notification_outbox (
    case_id, event_type, recipient_user_id, recipient_role, locale, safe_payload, idempotency_key
  ) values (
    case_row.id, 'client_request_received', current_user_id, 'client', normalized_locale,
    jsonb_build_object('case_code', case_row.public_case_code), concat('case:', case_row.id, ':client_request_received')
  ) on conflict (idempotency_key) do nothing;

  return jsonb_build_object('case_code', case_row.public_case_code, 'status', case_row.status, 'duplicate', false);
end;
$$;

create or replace function public.marketplace_get_my_concierge_cases()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  current_user_id := public.marketplace_current_user_id();
  select coalesce(jsonb_agg(case_payload order by created_at desc), '[]'::jsonb)
  into result
  from (
    select
      concierge.created_at,
      jsonb_build_object(
        'case_code', concierge.public_case_code,
        'status', concierge.status,
        'created_at', concierge.created_at,
        'last_activity_at', concierge.last_activity_at,
        'follow_up_due_at', concierge.follow_up_due_at,
        'outcome_code', concierge.outcome_code,
        'closure_reason_code', concierge.closure_reason_code,
        'request', jsonb_build_object(
          'primary_goal', demand.primary_goal,
          'support_type', demand.support_type,
          'category_slug', demand.category_slug,
          'specialty', demand.specialty,
          'service_mode', demand.service_mode,
          'location_label', demand.location_label,
          'budget_min_cents', demand.budget_min_cents,
          'budget_max_cents', demand.budget_max_cents,
          'start_timeframe', demand.start_timeframe,
          'travel_radius_miles', demand.travel_radius_miles,
          'general_availability', demand.general_availability,
          'experience_level', demand.experience_level,
          'preferred_languages', demand.preferred_languages,
          'language_required', demand.language_required,
          'service_preferences', demand.service_preferences,
          'note', demand.query_text
        ),
        'recommendations', coalesce((
          select jsonb_agg(jsonb_build_object(
            'recommendation_code', recommendation.public_recommendation_code,
            'status', recommendation.status,
            'fit_summary', recommendation.client_safe_fit_summary,
            'profile', jsonb_build_object(
              'slug', profile.public_slug,
              'display_name', profile.display_name,
              'professional_title', profile.professional_title,
              'profile_photo_url', profile.profile_photo_url,
              'location_city', profile.location_city,
              'location_state', profile.location_state,
              'delivery_modes', profile.delivery_modes,
              'languages', profile.languages,
              'price_min_cents', profile.price_min_cents,
              'price_max_cents', profile.price_max_cents,
              'service_categories', profile.service_categories,
              'marketplace_specialties', profile.marketplace_specialties
            ),
            'professional_contact_email', case when introduction.introduced_at is not null then professional_account.email else null end,
            'introduced_at', introduction.introduced_at
          ) order by recommendation.created_at)
          from public.marketplace_concierge_recommendations as recommendation
          join public.marketplace_public_trainer_profiles_v2 as profile on profile.trainer_profile_id = recommendation.trainer_profile_id
          join public.trainer_profiles as trainer on trainer.id = recommendation.trainer_profile_id
          join public.users as professional_account on professional_account.id = trainer.user_id
          left join public.marketplace_concierge_introductions as introduction on introduction.recommendation_id = recommendation.id
          where recommendation.case_id = concierge.id
            and recommendation.status in ('shortlisted', 'client_selected', 'introduced', 'consultation_reported', 'hired_reported', 'unsuccessful')
        ), '[]'::jsonb)
      ) as case_payload
    from public.marketplace_concierge_cases as concierge
    join public.marketplace_search_demand as demand on demand.id = concierge.source_request_id
    where concierge.client_user_id = current_user_id
  ) as owned_cases;
  return coalesce(result, '[]'::jsonb);
end;
$$;

create or replace function public.marketplace_get_my_concierge_invitations()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  current_user_id := public.marketplace_current_user_id();
  select coalesce(jsonb_agg(jsonb_build_object(
    'invitation_code', recommendation.public_recommendation_code,
    'case_code', concierge.public_case_code,
    'status', recommendation.status,
    'response_deadline_at', recommendation.response_deadline_at,
    'responded_at', recommendation.professional_responded_at,
    'request', jsonb_build_object(
      'primary_goal', demand.primary_goal,
      'support_type', demand.support_type,
      'category_slug', demand.category_slug,
      'specialty', demand.specialty,
      'service_mode', demand.service_mode,
      'location_label', demand.location_label,
      'travel_radius_miles', demand.travel_radius_miles,
      'budget_min_cents', demand.budget_min_cents,
      'budget_max_cents', demand.budget_max_cents,
      'start_timeframe', demand.start_timeframe,
      'general_availability', demand.general_availability,
      'experience_level', demand.experience_level,
      'preferred_languages', demand.preferred_languages,
      'language_required', demand.language_required,
      'service_preferences', demand.service_preferences,
      'note', demand.query_text
    ),
    'client_contact_email', case when introduction.introduced_at is not null then client_account.email else null end,
    'introduced_at', introduction.introduced_at
  ) order by recommendation.created_at desc), '[]'::jsonb)
  into result
  from public.marketplace_concierge_recommendations as recommendation
  join public.trainer_profiles as trainer on trainer.id = recommendation.trainer_profile_id
  join public.marketplace_concierge_cases as concierge on concierge.id = recommendation.case_id
  join public.marketplace_search_demand as demand on demand.id = concierge.source_request_id
  left join public.users as client_account on client_account.id = concierge.client_user_id
  left join public.marketplace_concierge_introductions as introduction on introduction.recommendation_id = recommendation.id
  where trainer.user_id = current_user_id
    and concierge.sharing_consent_at is not null;
  return coalesce(result, '[]'::jsonb);
end;
$$;

create or replace function public.marketplace_respond_to_concierge_invitation(
  p_invitation_code text,
  p_action text,
  p_expected_status text,
  p_reason_code text default null,
  p_clarification_note text default null,
  p_confirm_accepting_clients boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  recommendation public.marketplace_concierge_recommendations%rowtype;
  concierge public.marketplace_concierge_cases%rowtype;
  next_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  current_user_id := public.marketplace_current_user_id();
  select rec.* into recommendation
  from public.marketplace_concierge_recommendations as rec
  join public.trainer_profiles as trainer on trainer.id = rec.trainer_profile_id
  where rec.public_recommendation_code = p_invitation_code and trainer.user_id = current_user_id
  for update of rec;
  if not found then raise exception 'Invitation not found.'; end if;
  if recommendation.status <> p_expected_status then raise exception 'This invitation has already changed. Refresh and try again.'; end if;
  if recommendation.status not in ('awaiting_professional_response', 'clarification_requested') then raise exception 'This invitation cannot be changed.'; end if;
  if recommendation.response_deadline_at is not null and recommendation.response_deadline_at < timezone('utc', now()) and p_action = 'interested' then
    raise exception 'This invitation has expired. Contact Elevare if you would like it reopened.';
  end if;
  if p_action = 'interested' and not p_confirm_accepting_clients then raise exception 'Confirm that you are still accepting clients.'; end if;
  if p_action not in ('interested', 'declined', 'clarification_requested') then raise exception 'Invalid invitation response.'; end if;
  if p_action = 'declined' and p_reason_code not in (
    'not_accepting_clients', 'schedule_mismatch', 'location_mismatch', 'budget_mismatch',
    'outside_scope', 'not_a_fit', 'conflict_of_interest', 'other'
  ) then raise exception 'Select a decline reason.'; end if;
  if p_action = 'interested' and not exists (
    select 1 from public.marketplace_public_trainer_profiles_v2 as profile
    where profile.trainer_profile_id = recommendation.trainer_profile_id
      and profile.accepting_clients = true
      and coalesce(profile.client_acceptance_status, 'accepting') in ('accepting', 'waitlist')
  ) then raise exception 'Your public profile must be live and accepting clients to express interest.'; end if;
  if p_action = 'clarification_requested' and nullif(btrim(p_clarification_note), '') is null then raise exception 'Add a concise clarification request.'; end if;

  next_status := p_action;
  update public.marketplace_concierge_recommendations
  set status = next_status,
      professional_responded_at = timezone('utc', now()),
      professional_response_reason_code = nullif(btrim(p_reason_code), ''),
      professional_clarification_note = case when p_action = 'clarification_requested' then nullif(btrim(p_clarification_note), '') else null end
  where id = recommendation.id;

  select * into concierge from public.marketplace_concierge_cases where id = recommendation.case_id;
  insert into public.marketplace_concierge_audit_log (
    case_id, recommendation_id, actor_user_id, actor_role, action, entity_type, previous_state, new_state, reason_code
  ) values (
    recommendation.case_id, recommendation.id, current_user_id, 'professional', 'professional_responded', 'recommendation',
    jsonb_build_object('status', recommendation.status), jsonb_build_object('status', next_status), nullif(btrim(p_reason_code), '')
  );
  insert into public.marketplace_concierge_notification_outbox (
    case_id, recommendation_id, event_type, recipient_user_id, recipient_role, locale, safe_payload, idempotency_key
  ) values (
    recommendation.case_id, recommendation.id, 'professional_response_received', concierge.assigned_operator_user_id, 'operator', concierge.preferred_locale,
    jsonb_build_object('case_code', concierge.public_case_code, 'response', next_status),
    concat('recommendation:', recommendation.id, ':professional_response:', next_status)
  ) on conflict (idempotency_key) do nothing;
  return jsonb_build_object('status', next_status, 'responded_at', timezone('utc', now()));
end;
$$;

create or replace function public.marketplace_client_concierge_action(
  p_case_code text,
  p_action text,
  p_recommendation_code text default null,
  p_reason_code text default null,
  p_outcome_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  concierge public.marketplace_concierge_cases%rowtype;
  recommendation public.marketplace_concierge_recommendations%rowtype;
  next_case_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  current_user_id := public.marketplace_current_user_id();
  select * into concierge from public.marketplace_concierge_cases
  where public_case_code = p_case_code and client_user_id = current_user_id for update;
  if not found then raise exception 'Case not found.'; end if;
  if concierge.status = 'closed' then raise exception 'This request is closed.'; end if;

  if p_action in ('select_professional', 'decline_professional') then
    select * into recommendation from public.marketplace_concierge_recommendations
    where public_recommendation_code = p_recommendation_code and case_id = concierge.id for update;
    if not found or recommendation.status <> 'shortlisted' then raise exception 'This recommendation is no longer available.'; end if;
    if p_action = 'select_professional' then
      update public.marketplace_concierge_recommendations
      set status = 'client_selected', client_responded_at = timezone('utc', now())
      where id = recommendation.id;
      update public.marketplace_concierge_recommendations
      set status = 'withdrawn', client_responded_at = timezone('utc', now())
      where case_id = concierge.id and id <> recommendation.id and status = 'shortlisted';
      next_case_status := 'introduction_ready';
      update public.marketplace_concierge_cases set status = next_case_status where id = concierge.id;
    else
      update public.marketplace_concierge_recommendations
      set status = 'client_not_interested', client_responded_at = timezone('utc', now()),
          client_decision_reason_code = nullif(btrim(p_reason_code), '')
      where id = recommendation.id;
      next_case_status := concierge.status;
    end if;
  elsif p_action = 'request_rematch' then
    next_case_status := 'rematch_requested';
    update public.marketplace_concierge_cases set status = next_case_status where id = concierge.id;
    insert into public.marketplace_concierge_follow_ups (case_id, follow_up_kind, due_at, dedupe_key)
    values (concierge.id, 'rematch_review', timezone('utc', now()), concat('case:', concierge.id, ':rematch:', extract(epoch from timezone('utc', now()))::bigint));
  elsif p_action = 'close' then
    next_case_status := 'closed';
    update public.marketplace_concierge_cases
    set status = next_case_status, closure_reason_code = coalesce(nullif(btrim(p_reason_code), ''), 'client_closed')
    where id = concierge.id;
  elsif p_action = 'report_outcome' then
    if concierge.status not in ('introduced', 'follow_up_due', 'consultation_reported') then raise exception 'An outcome can be reported only after an introduction.'; end if;
    if p_outcome_code not in ('consultation_scheduled_self_reported', 'consultation_completed_self_reported', 'hired_self_reported', 'not_proceeding', 'unknown') then
      raise exception 'Invalid outcome.';
    end if;
    next_case_status := case when p_outcome_code in ('consultation_scheduled_self_reported', 'consultation_completed_self_reported', 'hired_self_reported') then 'consultation_reported' else 'closed' end;
    update public.marketplace_concierge_cases
    set status = next_case_status, outcome_code = p_outcome_code, outcome_reported_by = 'client', outcome_reported_at = timezone('utc', now()),
        closure_reason_code = case when next_case_status = 'closed' then coalesce(nullif(btrim(p_reason_code), ''), 'client_not_proceeding') else closure_reason_code end
    where id = concierge.id;
  else
    raise exception 'Invalid client action.';
  end if;

  insert into public.marketplace_concierge_audit_log (
    case_id, recommendation_id, actor_user_id, actor_role, action, entity_type, previous_state, new_state, reason_code
  ) values (
    concierge.id, recommendation.id, current_user_id, 'client', p_action,
    case when recommendation.id is null then 'case' else 'recommendation' end,
    jsonb_build_object('case_status', concierge.status), jsonb_build_object('case_status', coalesce(next_case_status, concierge.status)), nullif(btrim(p_reason_code), '')
  );
  return jsonb_build_object('case_code', concierge.public_case_code, 'status', coalesce(next_case_status, concierge.status));
end;
$$;

create or replace function public.marketplace_update_my_concierge_request(
  p_case_code text,
  p_service_mode text default null,
  p_location_label text default null,
  p_travel_radius_miles integer default null,
  p_budget_min_cents integer default null,
  p_budget_max_cents integer default null,
  p_start_timeframe text default null,
  p_general_availability text default null,
  p_experience_level text default null,
  p_preferred_languages text[] default '{}'::text[],
  p_language_required boolean default false,
  p_service_preferences text[] default '{}'::text[],
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid;
  concierge public.marketplace_concierge_cases%rowtype;
  city_part text;
  state_part text;
  next_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  current_user_id := public.marketplace_current_user_id();
  select * into concierge from public.marketplace_concierge_cases
  where public_case_code = p_case_code and client_user_id = current_user_id for update;
  if not found then raise exception 'Case not found.'; end if;
  if concierge.status not in ('reviewing', 'needs_client_information', 'rematch_requested', 'no_inventory') then
    raise exception 'Preferences cannot be changed at this stage.';
  end if;
  if p_service_mode is not null and p_service_mode not in ('in_person', 'online', 'hybrid') then raise exception 'Invalid service mode.'; end if;
  if p_travel_radius_miles is not null and p_travel_radius_miles not between 1 and 250 then raise exception 'Invalid travel radius.'; end if;
  if p_budget_min_cents is not null and p_budget_min_cents < 0 then raise exception 'Invalid budget.'; end if;
  if p_budget_max_cents is not null and p_budget_max_cents < coalesce(p_budget_min_cents, 0) then raise exception 'Invalid budget range.'; end if;
  if p_experience_level is not null and p_experience_level not in ('beginner', 'intermediate', 'advanced', 'not_sure', 'not_applicable') then raise exception 'Invalid experience level.'; end if;
  if cardinality(coalesce(p_preferred_languages, '{}'::text[])) > 10 then raise exception 'Too many language preferences.'; end if;
  if p_language_required and cardinality(coalesce(p_preferred_languages, '{}'::text[])) = 0 then raise exception 'Select a language when language is required.'; end if;
  if cardinality(coalesce(p_service_preferences, '{}'::text[])) > 10 then raise exception 'Too many service preferences.'; end if;
  if char_length(coalesce(p_general_availability, '')) > 500 or char_length(coalesce(p_note, '')) > 1000 then raise exception 'Keep request details concise.'; end if;

  select nullif(btrim(split_part(coalesce(p_location_label, ''), ',', 1)), ''),
         case when strpos(coalesce(p_location_label, ''), ',') > 0
           then nullif(btrim(substr(p_location_label, strpos(p_location_label, ',') + 1)), '') else null end
  into city_part, state_part;

  update public.marketplace_search_demand set
    service_mode = p_service_mode,
    location_label = nullif(btrim(p_location_label), ''), city = city_part, state = state_part,
    travel_radius_miles = p_travel_radius_miles,
    budget_min_cents = p_budget_min_cents, budget_max_cents = p_budget_max_cents,
    start_timeframe = nullif(btrim(p_start_timeframe), ''),
    general_availability = nullif(btrim(p_general_availability), ''),
    experience_level = p_experience_level,
    preferred_languages = coalesce(p_preferred_languages, '{}'::text[]),
    language_required = p_language_required,
    service_preferences = coalesce(p_service_preferences, '{}'::text[]),
    query_text = nullif(btrim(p_note), ''), updated_at = timezone('utc', now())
  where id = concierge.source_request_id;

  next_status := case when concierge.status in ('needs_client_information', 'rematch_requested', 'no_inventory') then 'reviewing' else concierge.status end;
  update public.marketplace_concierge_cases set status = next_status where id = concierge.id;
  insert into public.marketplace_concierge_audit_log (
    case_id, actor_user_id, actor_role, action, entity_type, previous_state, new_state, reason_code
  ) values (
    concierge.id, current_user_id, 'client', 'request_preferences_updated', 'case',
    jsonb_build_object('status', concierge.status), jsonb_build_object('status', next_status), 'client_updated_preferences'
  );
  return jsonb_build_object('case_code', concierge.public_case_code, 'status', next_status);
end;
$$;

create or replace function public.marketplace_concierge_operator_candidates(
  p_case_id uuid,
  p_query text default null,
  p_limit integer default 25
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth, pg_temp
as $$
declare
  demand public.marketplace_search_demand%rowtype;
  result jsonb;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  select request.* into demand
  from public.marketplace_concierge_cases as concierge
  join public.marketplace_search_demand as request on request.id = concierge.source_request_id
  where concierge.id = p_case_id;
  if not found then raise exception 'Case not found.'; end if;

  select coalesce(jsonb_agg(
    candidate_payload || jsonb_build_object('relevance_score', relevance_score)
    order by relevance_score desc, tie_break
  ), '[]'::jsonb)
  into result
  from (
    select
      (
        case when demand.category_slug is not null and exists (
          select 1 from jsonb_array_elements(coalesce(profile.service_categories, '[]'::jsonb)) as category
          where category->>'slug' = demand.category_slug
        ) then 40 else 0 end
        + case when demand.specialty is not null and exists (
          select 1 from unnest(coalesce(profile.marketplace_specialties, '{}'::text[])) as specialty
          where lower(specialty) = lower(demand.specialty)
        ) then 25 else 0 end
        + case when demand.service_mode is not null and demand.service_mode = any(coalesce(profile.delivery_modes, '{}'::text[])) then 20 else 0 end
        + case when cardinality(demand.preferred_languages) > 0 and coalesce(profile.languages, '{}'::text[]) && demand.preferred_languages then 15 else 0 end
        + case
            when demand.city is not null and profile.location_city is not null
              and lower(btrim(demand.city)) = lower(btrim(profile.location_city)) then 15
            when demand.state is not null and profile.location_state is not null
              and lower(btrim(demand.state)) = lower(btrim(profile.location_state)) then 8
            else 0
          end
      ) as relevance_score,
      md5(profile.trainer_profile_id::text || p_case_id::text) as tie_break,
      jsonb_build_object(
        'trainer_profile_id', profile.trainer_profile_id,
        'public_slug', profile.public_slug,
        'display_name', profile.display_name,
        'professional_title', profile.professional_title,
        'location_city', profile.location_city,
        'location_state', profile.location_state,
        'delivery_modes', profile.delivery_modes,
        'languages', profile.languages,
        'price_min_cents', profile.price_min_cents,
        'price_max_cents', profile.price_max_cents,
        'service_categories', profile.service_categories,
        'marketplace_specialties', profile.marketplace_specialties,
        'availability_summary', profile.availability_summary,
        'trust', jsonb_build_object(
          'profile_reviewed', trust.profile_reviewed,
          'email_verified', trust.email_verified,
          'identity_verified', trust.identity_verified,
          'background_check_completed', trust.background_check_completed,
          'insurance_confirmed', trust.insurance_confirmed,
          'account_in_good_standing', trust.account_in_good_standing
        ),
        'selection_reasons', array_remove(array[
          case when demand.category_slug is not null and exists (
            select 1 from jsonb_array_elements(coalesce(profile.service_categories, '[]'::jsonb)) as category where category->>'slug' = demand.category_slug
          ) then 'category_match' end,
          case when demand.specialty is not null and exists (
            select 1 from unnest(coalesce(profile.marketplace_specialties, '{}'::text[])) as specialty where lower(specialty) = lower(demand.specialty)
          ) then 'specialty_match' end,
          case when demand.service_mode is not null and demand.service_mode = any(coalesce(profile.delivery_modes, '{}'::text[])) then 'service_mode_match' end,
          case when cardinality(demand.preferred_languages) > 0 and coalesce(profile.languages, '{}'::text[]) && demand.preferred_languages then 'language_match' end,
          case when demand.city is not null and profile.location_city is not null and lower(btrim(demand.city)) = lower(btrim(profile.location_city)) then 'city_match' end,
          case when demand.city is null and demand.state is not null and profile.location_state is not null and lower(btrim(demand.state)) = lower(btrim(profile.location_state)) then 'state_match' end
        ], null),
        'mismatch_flags', array_remove(array[
          case when demand.service_mode is not null and not (demand.service_mode = any(coalesce(profile.delivery_modes, '{}'::text[]))) then 'service_mode_mismatch' end,
          case when demand.language_required and not (coalesce(profile.languages, '{}'::text[]) && demand.preferred_languages) then 'language_mismatch' end,
          case when demand.budget_max_cents is not null and profile.price_min_cents is not null and profile.price_min_cents > demand.budget_max_cents then 'budget_mismatch' end
        ], null)
      ) as candidate_payload
    from public.marketplace_public_trainer_profiles_v2 as profile
    join public.marketplace_public_professional_trust_v1 as trust on trust.trainer_profile_id = profile.trainer_profile_id
    where profile.accepting_clients = true
      and coalesce(profile.client_acceptance_status, 'accepting') in ('accepting', 'waitlist')
      and trust.profile_reviewed = true
      and trust.account_in_good_standing = true
      and (
        not demand.language_required
        or coalesce(profile.languages, '{}'::text[]) && demand.preferred_languages
      )
      and (
        nullif(btrim(p_query), '') is null
        or profile.display_name ilike '%' || btrim(p_query) || '%'
        or profile.professional_title ilike '%' || btrim(p_query) || '%'
        or exists (select 1 from unnest(coalesce(profile.marketplace_specialties, '{}'::text[])) as specialty where specialty ilike '%' || btrim(p_query) || '%')
      )
    order by relevance_score desc, tie_break
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
  ) as ranked_candidates;
  return coalesce(result, '[]'::jsonb);
end;
$$;

create or replace function public.marketplace_concierge_operator_select_professional(
  p_case_id uuid,
  p_trainer_profile_id uuid,
  p_reason_codes text[],
  p_client_safe_fit_summary text,
  p_response_deadline_at timestamptz,
  p_mismatch_flags text[] default '{}'::text[],
  p_allow_reconsider boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid;
  concierge public.marketplace_concierge_cases%rowtype;
  recommendation public.marketplace_concierge_recommendations%rowtype;
  current_cycle integer;
  professional_user_id uuid;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  actor_id := public.marketplace_current_user_id();
  select * into concierge from public.marketplace_concierge_cases where id = p_case_id for update;
  if not found or concierge.status in ('closed', 'introduced', 'consultation_reported') then raise exception 'Case is not available for sourcing.'; end if;
  if nullif(btrim(p_client_safe_fit_summary), '') is null or char_length(p_client_safe_fit_summary) > 750 then raise exception 'Add a concise, client-safe fit summary.'; end if;
  if p_response_deadline_at <= timezone('utc', now()) then raise exception 'Response deadline must be in the future.'; end if;
  if not exists (
    select 1 from public.marketplace_public_trainer_profiles_v2 as profile
    join public.marketplace_public_professional_trust_v1 as trust on trust.trainer_profile_id = profile.trainer_profile_id
    where profile.trainer_profile_id = p_trainer_profile_id
      and profile.accepting_clients = true
      and coalesce(profile.client_acceptance_status, 'accepting') in ('accepting', 'waitlist')
      and trust.profile_reviewed = true and trust.account_in_good_standing = true
  ) then raise exception 'Professional is not eligible for concierge selection.'; end if;
  if not p_allow_reconsider and exists (
    select 1 from public.marketplace_concierge_recommendations
    where case_id = p_case_id and trainer_profile_id = p_trainer_profile_id
      and status in ('declined', 'no_response', 'expired', 'client_not_interested', 'unsuccessful')
  ) then raise exception 'This professional was previously declined or unsuitable for this case.'; end if;

  select coalesce(max(cycle_number), 1) into current_cycle
  from public.marketplace_concierge_recommendations where case_id = p_case_id;
  if concierge.status = 'rematch_requested' then current_cycle := current_cycle + 1; end if;

  insert into public.marketplace_concierge_recommendations (
    case_id, trainer_profile_id, cycle_number, status, selection_reason_codes,
    client_safe_fit_summary, mismatch_flags, response_deadline_at
  ) values (
    p_case_id, p_trainer_profile_id, current_cycle, 'awaiting_professional_response',
    coalesce(p_reason_codes, '{}'::text[]), btrim(p_client_safe_fit_summary),
    coalesce(p_mismatch_flags, '{}'::text[]), p_response_deadline_at
  ) returning * into recommendation;

  update public.marketplace_concierge_cases set status = 'reviewing'
  where id = p_case_id and status = 'submitted';
  update public.marketplace_concierge_cases set status = 'sourcing_professionals'
  where id = p_case_id and status in ('reviewing', 'rematch_requested', 'no_inventory');
  update public.marketplace_concierge_cases set status = 'awaiting_professional_response'
  where id = p_case_id and status = 'sourcing_professionals';

  select trainer.user_id into professional_user_id from public.trainer_profiles as trainer where trainer.id = p_trainer_profile_id;
  insert into public.marketplace_concierge_follow_ups (
    case_id, recommendation_id, follow_up_kind, due_at, dedupe_key
  ) values (
    p_case_id, recommendation.id, 'professional_response', p_response_deadline_at,
    concat('recommendation:', recommendation.id, ':professional_response')
  ) on conflict (dedupe_key) do nothing;
  insert into public.marketplace_concierge_notification_outbox (
    case_id, recommendation_id, event_type, recipient_user_id, recipient_role, locale, safe_payload, idempotency_key
  ) values (
    p_case_id, recommendation.id, 'professional_invited', professional_user_id, 'professional', concierge.preferred_locale,
    jsonb_build_object('case_code', concierge.public_case_code, 'invitation_code', recommendation.public_recommendation_code),
    concat('recommendation:', recommendation.id, ':professional_invited')
  ) on conflict (idempotency_key) do nothing;
  insert into public.marketplace_concierge_audit_log (
    case_id, recommendation_id, actor_user_id, actor_role, action, entity_type, new_state
  ) values (
    p_case_id, recommendation.id, actor_id, 'operator', 'professional_selected', 'recommendation',
    jsonb_build_object('status', recommendation.status, 'cycle_number', recommendation.cycle_number)
  );
  return jsonb_build_object('recommendation_id', recommendation.id, 'recommendation_code', recommendation.public_recommendation_code, 'status', recommendation.status, 'cycle_number', recommendation.cycle_number);
end;
$$;

create or replace function public.marketplace_concierge_operator_release_shortlist(
  p_case_id uuid,
  p_recommendation_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid;
  concierge public.marketplace_concierge_cases%rowtype;
  selected_count integer;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  actor_id := public.marketplace_current_user_id();
  select * into concierge from public.marketplace_concierge_cases where id = p_case_id for update;
  if not found then raise exception 'Case not found.'; end if;
  selected_count := cardinality(coalesce(p_recommendation_ids, '{}'::uuid[]));
  if selected_count < 1 or selected_count > 3 then raise exception 'Release one to three confirmed professionals.'; end if;
  if (select count(*) from public.marketplace_concierge_recommendations where case_id = p_case_id and id = any(p_recommendation_ids) and status = 'interested') <> selected_count then
    raise exception 'Only interested professionals may be released to the client.';
  end if;
  update public.marketplace_concierge_recommendations set status = 'shortlisted'
  where case_id = p_case_id and id = any(p_recommendation_ids) and status = 'interested';
  update public.marketplace_concierge_recommendations set status = 'withdrawn'
  where case_id = p_case_id
    and not (id = any(p_recommendation_ids))
    and status in ('awaiting_professional_response', 'clarification_requested', 'interested');
  update public.marketplace_concierge_cases set status = 'recommendations_ready' where id = p_case_id;
  insert into public.marketplace_concierge_follow_ups (case_id, follow_up_kind, due_at, dedupe_key)
  values (p_case_id, 'client_shortlist', timezone('utc', now()) + interval '2 days', concat('case:', p_case_id, ':client_shortlist:', concierge.last_activity_at::text))
  on conflict (dedupe_key) do nothing;
  insert into public.marketplace_concierge_notification_outbox (
    case_id, event_type, recipient_user_id, recipient_role, locale, safe_payload, idempotency_key
  ) values (
    p_case_id, 'client_shortlist_ready', concierge.client_user_id, 'client', concierge.preferred_locale,
    jsonb_build_object('case_code', concierge.public_case_code), concat('case:', p_case_id, ':shortlist:', concierge.last_activity_at::text)
  ) on conflict (idempotency_key) do nothing;
  insert into public.marketplace_concierge_audit_log (
    case_id, actor_user_id, actor_role, action, entity_type, new_state
  ) values (
    p_case_id, actor_id, 'operator', 'shortlist_released', 'case', jsonb_build_object('status', 'recommendations_ready', 'count', selected_count)
  );
  return jsonb_build_object('status', 'recommendations_ready', 'recommendation_count', selected_count);
end;
$$;

create or replace function public.marketplace_concierge_operator_assign(
  p_case_id uuid,
  p_assign_to_self boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid;
  concierge public.marketplace_concierge_cases%rowtype;
  assignee_id uuid;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  actor_id := public.marketplace_current_user_id();
  if actor_id is null then raise exception 'Operator account not found.'; end if;
  select * into concierge from public.marketplace_concierge_cases where id = p_case_id for update;
  if not found then raise exception 'Case not found.'; end if;
  assignee_id := case when p_assign_to_self then actor_id else null end;
  update public.marketplace_concierge_cases set assigned_operator_user_id = assignee_id where id = p_case_id;
  insert into public.marketplace_concierge_audit_log (
    case_id, actor_user_id, actor_role, action, entity_type, previous_state, new_state
  ) values (
    p_case_id, actor_id, 'operator', 'operator_assignment_changed', 'case',
    jsonb_build_object('assigned', concierge.assigned_operator_user_id is not null),
    jsonb_build_object('assigned', assignee_id is not null)
  );
  return jsonb_build_object('case_id', p_case_id, 'assigned_to_self', assignee_id is not null);
end;
$$;

create or replace function public.marketplace_concierge_operator_complete_follow_up(
  p_follow_up_id uuid,
  p_internal_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid;
  follow_up public.marketplace_concierge_follow_ups%rowtype;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  actor_id := public.marketplace_current_user_id();
  select * into follow_up from public.marketplace_concierge_follow_ups where id = p_follow_up_id for update;
  if not found then raise exception 'Follow-up not found.'; end if;
  if follow_up.status <> 'pending' then
    return jsonb_build_object('follow_up_id', follow_up.id, 'status', follow_up.status, 'duplicate', true);
  end if;
  update public.marketplace_concierge_follow_ups set
    status = 'completed', completed_at = timezone('utc', now()), completed_by_user_id = actor_id
  where id = follow_up.id;
  if nullif(btrim(p_internal_note), '') is not null then
    insert into public.marketplace_concierge_internal_notes (case_id, author_user_id, note)
    values (follow_up.case_id, actor_id, btrim(p_internal_note));
  end if;
  insert into public.marketplace_concierge_audit_log (
    case_id, recommendation_id, actor_user_id, actor_role, action, entity_type, previous_state, new_state
  ) values (
    follow_up.case_id, follow_up.recommendation_id, actor_id, 'operator', 'follow_up_completed', 'follow_up',
    jsonb_build_object('status', follow_up.status, 'kind', follow_up.follow_up_kind),
    jsonb_build_object('status', 'completed', 'kind', follow_up.follow_up_kind)
  );
  return jsonb_build_object('follow_up_id', follow_up.id, 'status', 'completed', 'duplicate', false);
end;
$$;

create or replace function public.marketplace_concierge_operator_complete_introduction(
  p_case_id uuid,
  p_recommendation_id uuid,
  p_shared_fields text[] default array['client_email', 'professional_email']::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid;
  concierge public.marketplace_concierge_cases%rowtype;
  recommendation public.marketplace_concierge_recommendations%rowtype;
  professional_user_id uuid;
  introduction public.marketplace_concierge_introductions%rowtype;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  actor_id := public.marketplace_current_user_id();
  select * into concierge from public.marketplace_concierge_cases where id = p_case_id for update;
  select * into recommendation from public.marketplace_concierge_recommendations
  where id = p_recommendation_id and case_id = p_case_id for update;
  if concierge.status <> 'introduction_ready' or recommendation.status <> 'client_selected' then raise exception 'Both parties must authorize this introduction.'; end if;
  if not coalesce(p_shared_fields, '{}'::text[]) <@ array['client_email', 'professional_email', 'client_first_name', 'professional_name']::text[] then
    raise exception 'Unsupported contact field.';
  end if;
  select user_id into professional_user_id from public.trainer_profiles where id = recommendation.trainer_profile_id;
  insert into public.marketplace_concierge_introductions (
    case_id, recommendation_id, client_authorized_at, professional_authorized_at,
    shared_fields, introduced_at, completed_by_user_id
  ) values (
    p_case_id, p_recommendation_id, coalesce(recommendation.client_responded_at, timezone('utc', now())),
    coalesce(recommendation.professional_responded_at, timezone('utc', now())), p_shared_fields,
    timezone('utc', now()), actor_id
  ) returning * into introduction;
  update public.marketplace_concierge_recommendations
  set status = 'introduced', introduced_at = introduction.introduced_at where id = p_recommendation_id;
  update public.marketplace_concierge_cases
  set status = 'introduced', follow_up_due_at = timezone('utc', now()) + interval '2 days' where id = p_case_id;
  insert into public.marketplace_concierge_follow_ups (case_id, recommendation_id, follow_up_kind, due_at, dedupe_key)
  values (p_case_id, p_recommendation_id, 'post_introduction', timezone('utc', now()) + interval '2 days', concat('recommendation:', p_recommendation_id, ':post_introduction'))
  on conflict (dedupe_key) do nothing;
  insert into public.marketplace_concierge_notification_outbox (
    case_id, recommendation_id, event_type, recipient_user_id, recipient_role, locale, safe_payload, idempotency_key
  ) values
    (p_case_id, p_recommendation_id, 'introduction_completed', concierge.client_user_id, 'client', concierge.preferred_locale, jsonb_build_object('case_code', concierge.public_case_code), concat('introduction:', introduction.id, ':client')),
    (p_case_id, p_recommendation_id, 'introduction_completed', professional_user_id, 'professional', concierge.preferred_locale, jsonb_build_object('case_code', concierge.public_case_code), concat('introduction:', introduction.id, ':professional'))
  on conflict (idempotency_key) do nothing;
  insert into public.marketplace_concierge_audit_log (
    case_id, recommendation_id, actor_user_id, actor_role, action, entity_type, new_state
  ) values (
    p_case_id, p_recommendation_id, actor_id, 'operator', 'introduction_completed', 'introduction',
    jsonb_build_object('introduced_at', introduction.introduced_at, 'shared_fields', introduction.shared_fields)
  );
  return jsonb_build_object('status', 'introduced', 'introduced_at', introduction.introduced_at);
end;
$$;

create or replace function public.marketplace_concierge_operator_transition(
  p_case_id uuid,
  p_expected_status text,
  p_new_status text,
  p_reason_code text default null,
  p_follow_up_due_at timestamptz default null,
  p_closure_reason_code text default null,
  p_outcome_code text default null,
  p_internal_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid;
  concierge public.marketplace_concierge_cases%rowtype;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  actor_id := public.marketplace_current_user_id();
  select * into concierge from public.marketplace_concierge_cases where id = p_case_id for update;
  if not found then raise exception 'Case not found.'; end if;
  if concierge.status <> p_expected_status then raise exception 'Case status changed. Refresh before continuing.'; end if;
  if not public.marketplace_concierge_case_transition_allowed(concierge.status, p_new_status) then raise exception 'Invalid case transition.'; end if;
  update public.marketplace_concierge_cases set
    status = p_new_status,
    follow_up_due_at = p_follow_up_due_at,
    closure_reason_code = coalesce(nullif(btrim(p_closure_reason_code), ''), closure_reason_code),
    outcome_code = coalesce(nullif(btrim(p_outcome_code), ''), outcome_code),
    outcome_reported_by = case when p_outcome_code is not null then 'operator' else outcome_reported_by end,
    outcome_reported_at = case when p_outcome_code is not null then timezone('utc', now()) else outcome_reported_at end
  where id = p_case_id;
  if nullif(btrim(p_internal_note), '') is not null then
    insert into public.marketplace_concierge_internal_notes (case_id, author_user_id, note)
    values (p_case_id, actor_id, btrim(p_internal_note));
  end if;
  insert into public.marketplace_concierge_audit_log (
    case_id, actor_user_id, actor_role, action, entity_type, previous_state, new_state, reason_code
  ) values (
    p_case_id, actor_id, 'operator', 'case_status_changed', 'case', jsonb_build_object('status', concierge.status),
    jsonb_build_object('status', p_new_status), nullif(btrim(p_reason_code), '')
  );
  return jsonb_build_object('case_id', p_case_id, 'status', p_new_status);
end;
$$;

create or replace function public.marketplace_concierge_operator_queue()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth, pg_temp
as $$
declare result jsonb;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', concierge.id,
    'case_code', concierge.public_case_code,
    'status', concierge.status,
    'created_at', concierge.created_at,
    'last_activity_at', concierge.last_activity_at,
    'follow_up_due_at', concierge.follow_up_due_at,
    'assigned_operator_user_id', concierge.assigned_operator_user_id,
    'request_age_hours', greatest(0, extract(epoch from timezone('utc', now()) - concierge.created_at) / 3600),
    'next_action', case
      when exists (select 1 from public.marketplace_concierge_follow_ups due where due.case_id = concierge.id and due.status = 'pending' and due.due_at <= timezone('utc', now())) then 'complete_due_follow_up'
      when concierge.status = 'submitted' then 'review_request'
      when concierge.status = 'needs_client_information' then 'await_client_information'
      when concierge.status in ('reviewing', 'sourcing_professionals', 'rematch_requested') then 'select_professionals'
      when concierge.status = 'awaiting_professional_response' then 'monitor_professional_responses'
      when concierge.status = 'recommendations_ready' then 'await_client_selection'
      when concierge.status = 'introduction_ready' then 'complete_introduction'
      when concierge.status in ('introduced', 'follow_up_due') then 'request_outcome'
      when concierge.status = 'no_inventory' then 'revisit_inventory'
      else 'none'
    end,
    'client', jsonb_build_object(
      'user_id', concierge.client_user_id,
      'email', client_account.email
    ),
    'request', jsonb_build_object(
      'primary_goal', demand.primary_goal, 'support_type', demand.support_type,
      'category_slug', demand.category_slug, 'specialty', demand.specialty,
      'service_mode', demand.service_mode, 'location_label', demand.location_label,
      'travel_radius_miles', demand.travel_radius_miles,
      'budget_min_cents', demand.budget_min_cents, 'budget_max_cents', demand.budget_max_cents,
      'start_timeframe', demand.start_timeframe, 'general_availability', demand.general_availability,
      'experience_level', demand.experience_level, 'preferred_languages', demand.preferred_languages,
      'language_required', demand.language_required, 'service_preferences', demand.service_preferences,
      'note', demand.query_text
    ),
    'selected_professional_count', (select count(*) from public.marketplace_concierge_recommendations rec where rec.case_id = concierge.id),
    'interested_professional_count', (select count(*) from public.marketplace_concierge_recommendations rec where rec.case_id = concierge.id and rec.status in ('interested', 'shortlisted', 'client_selected', 'introduced')),
    'recommendations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', rec.id,
        'recommendation_code', rec.public_recommendation_code,
        'trainer_profile_id', rec.trainer_profile_id,
        'professional_name', profile.display_name,
        'status', rec.status,
        'cycle_number', rec.cycle_number,
        'selection_reason_codes', rec.selection_reason_codes,
        'mismatch_flags', rec.mismatch_flags,
        'client_safe_fit_summary', rec.client_safe_fit_summary,
        'response_deadline_at', rec.response_deadline_at,
        'professional_responded_at', rec.professional_responded_at,
        'professional_decline_reason_code', rec.professional_response_reason_code,
        'client_decision_reason_code', rec.client_decision_reason_code,
        'introduced_at', introduction.introduced_at
      ) order by rec.cycle_number desc, rec.created_at)
      from public.marketplace_concierge_recommendations rec
      left join public.marketplace_public_trainer_profiles_v2 profile on profile.trainer_profile_id = rec.trainer_profile_id
      left join public.marketplace_concierge_introductions introduction on introduction.recommendation_id = rec.id
      where rec.case_id = concierge.id
    ), '[]'::jsonb),
    'follow_ups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', follow_up.id,
        'kind', follow_up.follow_up_kind,
        'status', follow_up.status,
        'due_at', follow_up.due_at,
        'completed_at', follow_up.completed_at
      ) order by follow_up.due_at)
      from public.marketplace_concierge_follow_ups follow_up
      where follow_up.case_id = concierge.id and follow_up.status = 'pending'
    ), '[]'::jsonb),
    'internal_notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', note.id,
        'note', note.note,
        'created_at', note.created_at,
        'author_user_id', note.author_user_id
      ) order by note.created_at desc)
      from public.marketplace_concierge_internal_notes note
      where note.case_id = concierge.id
    ), '[]'::jsonb),
    'outcome_code', concierge.outcome_code,
    'closure_reason_code', concierge.closure_reason_code
  ) order by case when concierge.follow_up_due_at is not null and concierge.follow_up_due_at <= timezone('utc', now()) then 0 else 1 end, concierge.created_at), '[]'::jsonb)
  into result
  from public.marketplace_concierge_cases as concierge
  join public.marketplace_search_demand as demand on demand.id = concierge.source_request_id
  left join public.users as client_account on client_account.id = concierge.client_user_id;
  return result;
end;
$$;

create or replace function public.marketplace_concierge_operator_metrics()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth, pg_temp
as $$
declare result jsonb;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  with invitation_metrics as (
    select
      count(*) filter (where invited_at is not null) as invited_count,
      count(*) filter (where professional_responded_at is not null) as responded_count,
      percentile_cont(0.5) within group (order by extract(epoch from professional_responded_at - invited_at) / 3600)
        filter (where professional_responded_at is not null and invited_at is not null) as median_response_hours
    from public.marketplace_concierge_recommendations
  ), first_reviews as (
    select audit.case_id, min(audit.created_at) as first_reviewed_at
    from public.marketplace_concierge_audit_log audit
    where audit.action in ('case_status_changed', 'operator_assignment_changed', 'professional_selected')
    group by audit.case_id
  ), failure_reasons as (
    select coalesce(cases.closure_reason_code, 'unknown') as reason_code,
           coalesce(demand.category_slug, 'unspecified') as category_slug,
           coalesce(demand.location_label, 'unspecified') as location_label,
           count(*) as total
    from public.marketplace_concierge_cases cases
    join public.marketplace_search_demand demand on demand.id = cases.source_request_id
    where cases.status in ('closed', 'no_inventory')
    group by coalesce(cases.closure_reason_code, 'unknown'), coalesce(demand.category_slug, 'unspecified'), coalesce(demand.location_label, 'unspecified')
  )
  select jsonb_build_object(
    'new_requests', count(*) filter (where cases.status = 'submitted'),
    'open_cases', count(*) filter (where cases.status <> 'closed'),
    'cases_needing_action', count(*) filter (where cases.status in ('submitted', 'needs_client_information', 'sourcing_professionals', 'rematch_requested', 'no_inventory') or cases.follow_up_due_at <= timezone('utc', now())),
    'cases_with_suitable_professional', count(*) filter (where exists (select 1 from public.marketplace_concierge_recommendations rec where rec.case_id = cases.id and rec.status in ('interested', 'shortlisted', 'client_selected', 'introduced', 'consultation_reported', 'hired_reported'))),
    'introductions_completed', count(*) filter (where cases.status in ('introduced', 'follow_up_due', 'consultation_reported') or cases.outcome_code is not null),
    'rematches', count(*) filter (where cases.status = 'rematch_requested' or exists (select 1 from public.marketplace_concierge_recommendations rec where rec.case_id = cases.id and rec.cycle_number > 1)),
    'consultations_reported', count(*) filter (where cases.outcome_code in ('consultation_scheduled_self_reported', 'consultation_completed_self_reported')),
    'hires_reported', count(*) filter (where cases.outcome_code = 'hired_self_reported'),
    'unknown_outcomes', count(*) filter (where cases.status = 'closed' and cases.outcome_code is null),
    'no_inventory_cases', count(*) filter (where cases.status = 'no_inventory' or cases.closure_reason_code = 'no_inventory'),
    'median_first_review_hours', percentile_cont(0.5) within group (order by extract(epoch from first_reviews.first_reviewed_at - cases.created_at) / 3600)
      filter (where first_reviews.first_reviewed_at is not null),
    'professional_invitation_sample_size', invitation_metrics.invited_count,
    'professional_invitation_response_rate', case when invitation_metrics.invited_count >= 3 then round((invitation_metrics.responded_count::numeric / invitation_metrics.invited_count::numeric) * 100, 1) else null end,
    'median_professional_response_hours', case when invitation_metrics.responded_count >= 3 then round(invitation_metrics.median_response_hours::numeric, 1) else null end,
    'successful_connections', count(*) filter (where exists (select 1 from public.marketplace_concierge_introductions introduction where introduction.case_id = cases.id and introduction.introduced_at is not null)),
    'failure_reasons', (select coalesce(jsonb_agg(jsonb_build_object('reason_code', reason_code, 'category_slug', category_slug, 'location_label', location_label, 'total', total) order by total desc), '[]'::jsonb) from failure_reasons)
  ) into result
  from public.marketplace_concierge_cases as cases
  left join first_reviews on first_reviews.case_id = cases.id
  cross join invitation_metrics
  group by invitation_metrics.invited_count, invitation_metrics.responded_count, invitation_metrics.median_response_hours;
  return result;
end;
$$;

create or replace function public.marketplace_concierge_mark_overdue_invitations()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare affected integer;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  update public.marketplace_concierge_recommendations
  set status = 'expired'
  where status in ('awaiting_professional_response', 'clarification_requested')
    and response_deadline_at < timezone('utc', now());
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.marketplace_redact_concierge_for_user(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare affected integer;
begin
  if not public.marketplace_is_trust_reviewer() then raise exception 'Operator authorization required.'; end if;
  update public.marketplace_search_demand as demand
  set request_email = concat('deleted+', left(demand.id::text, 12), '@redacted.invalid'),
      query_text = null, general_availability = null, admin_notes = null,
      filters_json = '{}'::jsonb, updated_at = timezone('utc', now())
  where demand.user_id = p_user_id;
  update public.marketplace_concierge_cases
  set status = case when status = 'closed' then status else 'closed' end,
      closure_reason_code = 'account_deleted', client_user_id = null
  where client_user_id = p_user_id;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

alter table public.marketplace_concierge_cases enable row level security;
alter table public.marketplace_concierge_recommendations enable row level security;
alter table public.marketplace_concierge_introductions enable row level security;
alter table public.marketplace_concierge_follow_ups enable row level security;
alter table public.marketplace_concierge_internal_notes enable row level security;
alter table public.marketplace_concierge_audit_log enable row level security;
alter table public.marketplace_concierge_notification_outbox enable row level security;

drop policy if exists marketplace_concierge_cases_client_own on public.marketplace_concierge_cases;
create policy marketplace_concierge_cases_client_own on public.marketplace_concierge_cases
for select to authenticated using (client_user_id = public.marketplace_current_user_id());
drop policy if exists marketplace_concierge_cases_operator on public.marketplace_concierge_cases;
create policy marketplace_concierge_cases_operator on public.marketplace_concierge_cases
for all to authenticated using (public.marketplace_is_trust_reviewer()) with check (public.marketplace_is_trust_reviewer());

drop policy if exists marketplace_concierge_recommendations_client_own on public.marketplace_concierge_recommendations;
create policy marketplace_concierge_recommendations_client_own on public.marketplace_concierge_recommendations
for select to authenticated using (
  status in ('shortlisted', 'client_selected', 'introduced', 'consultation_reported', 'hired_reported', 'unsuccessful')
  and exists (select 1 from public.marketplace_concierge_cases owned where owned.id = case_id and owned.client_user_id = public.marketplace_current_user_id())
);
drop policy if exists marketplace_concierge_recommendations_professional_own on public.marketplace_concierge_recommendations;
create policy marketplace_concierge_recommendations_professional_own on public.marketplace_concierge_recommendations
for select to authenticated using (
  exists (select 1 from public.trainer_profiles trainer where trainer.id = trainer_profile_id and trainer.user_id = public.marketplace_current_user_id())
);
drop policy if exists marketplace_concierge_recommendations_operator on public.marketplace_concierge_recommendations;
create policy marketplace_concierge_recommendations_operator on public.marketplace_concierge_recommendations
for all to authenticated using (public.marketplace_is_trust_reviewer()) with check (public.marketplace_is_trust_reviewer());

drop policy if exists marketplace_concierge_introductions_party on public.marketplace_concierge_introductions;
create policy marketplace_concierge_introductions_party on public.marketplace_concierge_introductions
for select to authenticated using (
  exists (select 1 from public.marketplace_concierge_cases owned where owned.id = case_id and owned.client_user_id = public.marketplace_current_user_id())
  or exists (
    select 1 from public.marketplace_concierge_recommendations rec
    join public.trainer_profiles trainer on trainer.id = rec.trainer_profile_id
    where rec.id = recommendation_id and trainer.user_id = public.marketplace_current_user_id()
  )
  or public.marketplace_is_trust_reviewer()
);

drop policy if exists marketplace_concierge_follow_ups_operator on public.marketplace_concierge_follow_ups;
create policy marketplace_concierge_follow_ups_operator on public.marketplace_concierge_follow_ups
for all to authenticated using (public.marketplace_is_trust_reviewer()) with check (public.marketplace_is_trust_reviewer());
drop policy if exists marketplace_concierge_notes_operator on public.marketplace_concierge_internal_notes;
create policy marketplace_concierge_notes_operator on public.marketplace_concierge_internal_notes
for all to authenticated using (public.marketplace_is_trust_reviewer()) with check (public.marketplace_is_trust_reviewer());
drop policy if exists marketplace_concierge_audit_operator on public.marketplace_concierge_audit_log;
create policy marketplace_concierge_audit_operator on public.marketplace_concierge_audit_log
for select to authenticated using (public.marketplace_is_trust_reviewer());
drop policy if exists marketplace_concierge_outbox_operator on public.marketplace_concierge_notification_outbox;
create policy marketplace_concierge_outbox_operator on public.marketplace_concierge_notification_outbox
for select to authenticated using (public.marketplace_is_trust_reviewer());

-- Concierge submission is authenticated and validated through its RPC. The old
-- anonymous demand-capture policy is retired rather than exposing case writes.
drop policy if exists marketplace_search_demand_insert_public on public.marketplace_search_demand;
revoke insert on public.marketplace_search_demand from anon, authenticated;

revoke all on public.marketplace_concierge_cases from public, anon, authenticated;
revoke all on public.marketplace_concierge_recommendations from public, anon, authenticated;
revoke all on public.marketplace_concierge_introductions from public, anon, authenticated;
revoke all on public.marketplace_concierge_follow_ups from public, anon, authenticated;
revoke all on public.marketplace_concierge_internal_notes from public, anon, authenticated;
revoke all on public.marketplace_concierge_audit_log from public, anon, authenticated;
revoke all on public.marketplace_concierge_notification_outbox from public, anon, authenticated;

grant all on public.marketplace_concierge_cases to service_role;
grant all on public.marketplace_concierge_recommendations to service_role;
grant all on public.marketplace_concierge_introductions to service_role;
grant all on public.marketplace_concierge_follow_ups to service_role;
grant all on public.marketplace_concierge_internal_notes to service_role;
grant all on public.marketplace_concierge_audit_log to service_role;
grant all on public.marketplace_concierge_notification_outbox to service_role;

revoke all on function public.marketplace_concierge_normalize_locale(text) from public;
revoke all on function public.marketplace_submit_concierge_request(text, text, text, text, text, text, text, integer, integer, integer, text, text, text, text[], boolean, text[], text, boolean, text, text) from public;
revoke all on function public.marketplace_get_my_concierge_cases() from public;
revoke all on function public.marketplace_get_my_concierge_invitations() from public;
revoke all on function public.marketplace_respond_to_concierge_invitation(text, text, text, text, text, boolean) from public;
revoke all on function public.marketplace_client_concierge_action(text, text, text, text, text) from public;
revoke all on function public.marketplace_update_my_concierge_request(text, text, text, integer, integer, integer, text, text, text, text[], boolean, text[], text) from public;
revoke all on function public.marketplace_concierge_operator_candidates(uuid, text, integer) from public;
revoke all on function public.marketplace_concierge_operator_select_professional(uuid, uuid, text[], text, timestamptz, text[], boolean) from public;
revoke all on function public.marketplace_concierge_operator_release_shortlist(uuid, uuid[]) from public;
revoke all on function public.marketplace_concierge_operator_assign(uuid, boolean) from public;
revoke all on function public.marketplace_concierge_operator_complete_follow_up(uuid, text) from public;
revoke all on function public.marketplace_concierge_operator_complete_introduction(uuid, uuid, text[]) from public;
revoke all on function public.marketplace_concierge_operator_transition(uuid, text, text, text, timestamptz, text, text, text) from public;
revoke all on function public.marketplace_concierge_operator_queue() from public;
revoke all on function public.marketplace_concierge_operator_metrics() from public;
revoke all on function public.marketplace_concierge_mark_overdue_invitations() from public;
revoke all on function public.marketplace_redact_concierge_for_user(uuid) from public;

grant execute on function public.marketplace_submit_concierge_request(text, text, text, text, text, text, text, integer, integer, integer, text, text, text, text[], boolean, text[], text, boolean, text, text) to authenticated;
grant execute on function public.marketplace_get_my_concierge_cases() to authenticated;
grant execute on function public.marketplace_get_my_concierge_invitations() to authenticated;
grant execute on function public.marketplace_respond_to_concierge_invitation(text, text, text, text, text, boolean) to authenticated;
grant execute on function public.marketplace_client_concierge_action(text, text, text, text, text) to authenticated;
grant execute on function public.marketplace_update_my_concierge_request(text, text, text, integer, integer, integer, text, text, text, text[], boolean, text[], text) to authenticated;
grant execute on function public.marketplace_concierge_operator_candidates(uuid, text, integer) to authenticated, service_role;
grant execute on function public.marketplace_concierge_operator_select_professional(uuid, uuid, text[], text, timestamptz, text[], boolean) to authenticated, service_role;
grant execute on function public.marketplace_concierge_operator_release_shortlist(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.marketplace_concierge_operator_assign(uuid, boolean) to authenticated, service_role;
grant execute on function public.marketplace_concierge_operator_complete_follow_up(uuid, text) to authenticated, service_role;
grant execute on function public.marketplace_concierge_operator_complete_introduction(uuid, uuid, text[]) to authenticated, service_role;
grant execute on function public.marketplace_concierge_operator_transition(uuid, text, text, text, timestamptz, text, text, text) to authenticated, service_role;
grant execute on function public.marketplace_concierge_operator_queue() to authenticated, service_role;
grant execute on function public.marketplace_concierge_operator_metrics() to authenticated, service_role;
grant execute on function public.marketplace_concierge_mark_overdue_invitations() to authenticated, service_role;
grant execute on function public.marketplace_redact_concierge_for_user(uuid) to authenticated, service_role;

comment on table public.marketplace_concierge_cases is
  'Private, human-operated concierge cases. Not a booking, employment, medical referral, or AI matching system.';
comment on table public.marketplace_concierge_notification_outbox is
  'Disabled notification scaffolding. No sender or scheduler is enabled by this migration.';

commit;
