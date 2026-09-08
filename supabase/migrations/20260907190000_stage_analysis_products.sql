-- Extend the existing short-lived Quick Analysis entitlement for StageLab posing products.
-- Target: Elevare-Prod (cnfqpfynjpwlzdtblzps).
-- Video, extracted frames, signed upload URLs, and upload tokens are intentionally absent.

begin;

alter table public.quick_analyses
  add column if not exists analysis_product text not null default 'physique_analysis',
  add column if not exists posing_status text not null default 'not_included',
  add column if not exists posing_analysis_id text,
  add column if not exists posing_result_json jsonb,
  add column if not exists posing_error_code text,
  add column if not exists posing_retry_count integer not null default 0,
  add column if not exists posing_upload_session_id text,
  add column if not exists posing_idempotency_key text,
  add column if not exists posing_upload_started_at timestamptz,
  add column if not exists posing_processing_started_at timestamptz,
  add column if not exists posing_completed_at timestamptz,
  add column if not exists stagelab_authorized_at timestamptz,
  add column if not exists stagelab_authorization_expires_at timestamptz,
  add column if not exists stagelab_authorization_event_id text;

alter table public.quick_analyses
  drop constraint if exists quick_analyses_amount_check;
alter table public.quick_analyses
  add constraint quick_analyses_amount_check check (amount_paid in (0, 99, 149));

alter table public.quick_analyses
  drop constraint if exists quick_analyses_analysis_product_check;
alter table public.quick_analyses
  add constraint quick_analyses_analysis_product_check
    check (analysis_product in ('physique_analysis', 'posing_analysis', 'complete_stage_analysis'));

alter table public.quick_analyses
  drop constraint if exists quick_analyses_posing_status_check;
alter table public.quick_analyses
  add constraint quick_analyses_posing_status_check
    check (posing_status in (
      'not_included',
      'checkout_created',
      'awaiting_authorization',
      'paid',
      'uploading',
      'processing',
      'failed_retryable',
      'completed',
      'expired'
    ));

alter table public.quick_analyses
  drop constraint if exists quick_analyses_posing_retry_count_check;
alter table public.quick_analyses
  add constraint quick_analyses_posing_retry_count_check
    check (posing_retry_count between 0 and 4);

alter table public.quick_analyses
  drop constraint if exists quick_analyses_posing_result_shape_check;
alter table public.quick_analyses
  add constraint quick_analyses_posing_result_shape_check
    check (posing_result_json is null or jsonb_typeof(posing_result_json) = 'object');

comment on column public.quick_analyses.analysis_product is
  'Canonical Stripe analysis product: physique_analysis, posing_analysis, or complete_stage_analysis.';
comment on column public.quick_analyses.posing_result_json is
  'Validated PosingAnalysisV1 structured output only. It must never contain video, frames, media URLs, or upload credentials.';
comment on column public.quick_analyses.posing_upload_session_id is
  'Opaque StageLab upload-session identifier. Signed upload URLs and tokens are never persisted.';

create index if not exists quick_analyses_posing_status_idx
  on public.quick_analyses (posing_status, created_at desc)
  where analysis_product in ('posing_analysis', 'complete_stage_analysis');

create or replace function public.expire_quick_analysis_results()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expired_count integer;
begin
  with expired as (
    update public.quick_analyses
    set
      analysis_status = 'expired',
      posing_status = case when posing_status = 'not_included' then 'not_included' else 'expired' end,
      result_json = null,
      posing_result_json = null,
      optional_context = null,
      processing_started_at = null,
      posing_processing_started_at = null,
      posing_upload_session_id = null,
      posing_idempotency_key = null,
      posing_upload_started_at = null,
      updated_at = timezone('utc', now())
    where expires_at <= timezone('utc', now())
      and (
        analysis_status <> 'expired'
        or posing_status not in ('not_included', 'expired')
        or result_json is not null
        or posing_result_json is not null
        or optional_context is not null
      )
    returning 1
  )
  select count(*)::integer into expired_count from expired;

  delete from public.quick_analysis_rate_limits
  where window_started_at < timezone('utc', now()) - interval '2 days';

  update public.quick_analyses
  set checkout_nonce_hash = null,
      checkout_nonce_expires_at = null,
      updated_at = timezone('utc', now())
  where checkout_nonce_expires_at <= timezone('utc', now())
    and checkout_nonce_hash is not null;

  return expired_count;
end;
$$;

revoke all on function public.expire_quick_analysis_results() from public, anon, authenticated;
grant execute on function public.expire_quick_analysis_results() to service_role;

commit;
