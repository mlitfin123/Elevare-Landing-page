create table if not exists public.translation_feedback (
  id uuid primary key default gen_random_uuid(),
  client_submission_id uuid not null unique,
  locale text not null,
  sanitized_public_path text not null,
  category text not null,
  description text,
  suggested_correction text,
  optional_contact_email text,
  submission_status text not null default 'new',
  created_at timestamptz not null default timezone('utc', now()),
  constraint translation_feedback_locale_check
    check (locale in ('en', 'es-419', 'pt-BR')),
  constraint translation_feedback_path_check
    check (char_length(sanitized_public_path) between 1 and 256 and sanitized_public_path like '/%'),
  constraint translation_feedback_category_check
    check (category in ('incorrect', 'unnatural', 'untranslated', 'display_issue', 'other')),
  constraint translation_feedback_description_check
    check (description is null or char_length(description) <= 1200),
  constraint translation_feedback_correction_check
    check (suggested_correction is null or char_length(suggested_correction) <= 1200),
  constraint translation_feedback_email_check
    check (
      optional_contact_email is null
      or (
        char_length(optional_contact_email) <= 254
        and optional_contact_email = lower(btrim(optional_contact_email))
        and optional_contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    ),
  constraint translation_feedback_status_check
    check (submission_status in ('new', 'reviewed', 'resolved', 'dismissed'))
);

comment on table public.translation_feedback is
  'Server-submitted localization feedback. Review records for deletion after 180 days unless they remain necessary for an active translation review.';
comment on column public.translation_feedback.description is
  'Untrusted plain text. Never render as HTML.';
comment on column public.translation_feedback.suggested_correction is
  'Untrusted plain text. Never render as HTML.';

create index if not exists translation_feedback_review_queue_idx
  on public.translation_feedback (submission_status, created_at desc);

alter table public.translation_feedback enable row level security;
alter table public.translation_feedback force row level security;

revoke all on table public.translation_feedback from public, anon, authenticated;
grant select, insert, update, delete on table public.translation_feedback to service_role;
