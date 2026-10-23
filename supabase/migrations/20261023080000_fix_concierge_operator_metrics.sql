-- Repair the missing invitation timestamp reference and return zero-state
-- metrics when no concierge cases exist. No stored profile or case data changes.
begin;

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
  with invitations as (
    -- Selection creates the in-app invitation and this event in one transaction.
    -- This records invitation availability, not email delivery. Do not invent
    -- invitation dates for recommendations without a recorded invitation event.
    select recommendation_id, min(created_at) as invited_at
    from public.marketplace_concierge_notification_outbox
    where event_type = 'professional_invited' and recommendation_id is not null
    group by recommendation_id
  ), invitation_metrics as (
    select
      count(*) filter (where invited_at is not null) as invited_count,
      count(*) filter (where professional_responded_at is not null) as responded_count,
      percentile_cont(0.5) within group (order by extract(epoch from professional_responded_at - invited_at) / 3600)
        filter (where professional_responded_at is not null and invited_at is not null) as median_response_hours
    from public.marketplace_concierge_recommendations rec
    join invitations on invitations.recommendation_id = rec.id
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
    'professional_invitation_sample_size', (select invited_count from invitation_metrics),
    'professional_invitation_response_rate', (select case when invited_count >= 3 then round((responded_count::numeric / invited_count::numeric) * 100, 1) else null end from invitation_metrics),
    'median_professional_response_hours', (select case when responded_count >= 3 then round(median_response_hours::numeric, 1) else null end from invitation_metrics),
    'successful_connections', count(*) filter (where exists (select 1 from public.marketplace_concierge_introductions introduction where introduction.case_id = cases.id and introduction.introduced_at is not null)),
    'failure_reasons', (select coalesce(jsonb_agg(jsonb_build_object('reason_code', reason_code, 'category_slug', category_slug, 'location_label', location_label, 'total', total) order by total desc), '[]'::jsonb) from failure_reasons)
  ) into result
  from public.marketplace_concierge_cases as cases
  left join first_reviews on first_reviews.case_id = cases.id;
  return result;
end;
$$;

revoke all on function public.marketplace_concierge_operator_metrics() from public;
grant execute on function public.marketplace_concierge_operator_metrics() to authenticated, service_role;

commit;
