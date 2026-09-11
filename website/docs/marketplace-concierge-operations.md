# Marketplace Concierge Operations

## Scope and operating boundary

Elevare's concierge workflow is a human-operated discovery and introduction service. It does not use AI to choose professionals, create bookings, collect marketplace payments, provide internal chat, or verify professional qualifications. The separate `Admin_Elevare` project remains the only internal operations interface.

Direct consultation requests to a specific professional continue to use the existing `trainer_profile_inquiries` workflow. Concierge requests use the new case, recommendation, introduction, follow-up, audit, and disabled-notification records documented below.

## State ownership

Client request status (`marketplace_search_demand.status`):

- `new`
- `reviewing`
- `matched`
- `closed`

Concierge case status (`marketplace_concierge_cases.status`):

- `submitted`
- `reviewing`
- `needs_client_information`
- `sourcing_professionals`
- `awaiting_professional_response`
- `recommendations_ready`
- `introduction_ready`
- `introduced`
- `follow_up_due`
- `consultation_reported`
- `rematch_requested`
- `no_inventory`
- `closed`

Recommendation status (`marketplace_concierge_recommendations.status`):

- `selected`
- `awaiting_professional_response`
- `interested`
- `declined`
- `clarification_requested`
- `no_response`
- `expired`
- `withdrawn`
- `shortlisted`
- `client_selected`
- `client_not_interested`
- `introduced`
- `consultation_reported`
- `hired_reported`
- `unsuccessful`

Only guarded RPCs may make state changes. Browser clients do not receive direct update access to private concierge tables.

## Manual operating procedure

1. Open the Concierge tab in the separate admin project and review `submitted` cases.
2. Confirm that the request contains enough non-medical information and explicit sharing consent. Move incomplete cases to `needs_client_information`; do not place private operator notes into client-visible fields.
3. Move suitable cases into `sourcing_professionals` and search the eligible professional inventory.
4. Review category, specialty, service mode, location, language, pricing, availability, and trust data. Relevance scores are internal deterministic assistance only; an operator makes the final selection.
5. Do not invite a professional with a material mismatch merely to fill a list. Invite no more than five candidates in a cycle and record factual selection reasons plus any mismatch flags.
6. Monitor responses and expire overdue invitations. A professional may express interest, decline with a structured reason, or request clarification. Professionals cannot see competing candidates or client contact details.
7. Once generally two or three appropriate professionals confirm interest, release a shortlist of one to three. Never force a third option when only one or two are suitable.
8. After the client selects a professional, complete the introduction only when both sides have authorized it. Share only the explicitly recorded contact fields.
9. Complete due follow-up work, record self-reported outcomes accurately, and offer rematching when appropriate.
10. Close the case with a structured reason when work is complete or no further action is requested.

## No suitable inventory

Use `no_inventory` when the current approved, active, live, accepting inventory cannot satisfy the client's material requirements. Do not broaden a required language, in-person location, service mode, budget, or professional requirement silently. Leave the case available for permissioned review and reopen it through `rematch_requested` when inventory or client preferences materially change.

## Information sharing

Before introduction, a selected professional receives only the client-submitted request fields returned by `marketplace_get_my_concierge_invitations`. Direct client contact information, private profile data, internal notes, other candidate identities, moderation records, and internal rankings are excluded.

The client receives only reviewed shortlist data from public professional profile views plus the operator's client-safe fit summary. Private professional response notes and internal operator notes are excluded.

After an authorized introduction, the guarded client/professional RPCs may return only the contact fields recorded in `marketplace_concierge_introductions.shared_fields`. Contact information must never be placed in public URLs, third-party analytics, or audit payloads.

## Notifications: prepared but disabled

The migration creates idempotent records in `marketplace_concierge_notification_outbox`, but every row defaults to `disabled`. No sender or scheduled job is installed by this work, and no email is sent automatically.

Deterministic `en`, `es-419`, and `pt-BR` templates live in `supabase/functions/_shared/concierge-notification-templates.ts`. They contain no request free text, health details, names, phone numbers, professional competitor identities, or contact details. They link to authenticated account routes.

Before enabling delivery:

1. Add a server-only worker or Supabase Edge Function that atomically claims eligible outbox rows.
2. Keep `RESEND_API_KEY`, the transactional From address, and Reply-To address in server-side secrets only.
3. Verify the recipient owns the referenced case or invitation at send time.
4. Respect the recipient's transactional notification preference and applicable unsubscribe requirements.
5. Send with the outbox `idempotency_key` as the provider idempotency key.
6. Record bounded attempts, retry timing, provider-safe status, and terminal failure without storing email bodies.
7. Never enable rows created for deleted users or cases whose current state makes the message obsolete.

## Scheduler requirements

No reliable scheduler exists in the audited website or admin project, so automation remains disabled. A future service-role scheduler may:

- call `marketplace_concierge_mark_overdue_invitations()` at a controlled interval;
- query pending follow-ups by `due_at` and expose them as operator work;
- queue a single reminder only after checking the current case and recommendation status;
- atomically claim notification rows before sending;
- cancel irrelevant reminders after state changes;
- use bounded retries and a dead-letter/manual-review state.

The scheduler must authenticate independently, never expose a service-role key to either browser application, and remain separate from public page rendering.

## Privacy, retention, and account deletion

The request form intentionally avoids medical intake and precise home addresses. Free text is limited and accompanied by warnings not to provide medical records, diagnoses, medications, passwords, payment details, or other highly sensitive information.

Account deletion should call `marketplace_concierge_redact_deleted_user(...)` from the existing privileged deletion workflow. That operation removes direct account ownership and contact data while preserving the minimum case, recommendation, and audit history Elevare may legitimately need. Retention periods still require a documented business/legal decision before production rollout.

## Analytics allowlist

The client UI may send these consent-aware events with the listed properties only:

| Event | Allowed properties |
| --- | --- |
| `concierge_flow_started` | `source_page` |
| `concierge_match_request_submitted` | `source_page`, `service_mode`, `category_selected`, `language_required` |
| `concierge_match_request_confirmation_viewed` | `source_page` |
| `concierge_shortlist_viewed` | `recommendation_count` |
| `concierge_professional_profile_opened` | `source` |
| `concierge_professional_selected` | `source` |
| `concierge_recommendation_declined` | `reason_code` |
| `concierge_rematch_requested` | `reason_code` |
| `concierge_case_closed` | `reason_code` |
| `concierge_outcome_submitted` | `outcome_code`, `self_reported` |
| `concierge_preferences_updated` | `source` |

Do not send raw UUIDs, case codes, names, contact data, free text, health data, exact location, internal notes, or professional decline narratives to analytics. Internal actions belong in `marketplace_concierge_audit_log`, not third-party analytics.

## Metrics interpretation

Use only values returned by `marketplace_concierge_operator_metrics()`. Consultation and hire outcomes are self-reported. Unknown outcomes remain unknown. Median and response-rate metrics return `null` until the minimum sample is reached and must display as `Insufficient data`, never as zero or a fabricated conversion rate.

The primary operational measure is successful client-professional connections, supported by introduction completion and self-reported outcome data rather than request volume alone.

## Required environment and deployment order

No new browser-exposed environment variable is required. The website continues using its existing public Supabase URL and anonymous key; the separate admin backend continues using its private Supabase configuration and authenticated operator session.

Future notification delivery would require server-only Resend configuration and a scheduler credential. Those variables must not be added until the disabled sender is separately reviewed and implemented.

Deployment order:

1. Review and back up the current Elevare marketplace schema.
2. Validate the migration against a non-production branch or project.
3. Apply `20260909500000_marketplace_concierge.sql` to the Elevare marketplace Supabase project.
4. Regenerate Supabase types through the established workflow if typed generated definitions are introduced later. This repository currently has no generated database types file.
5. Deploy the website account routes and request form.
6. Deploy the separate admin project concierge tab.
7. Run manual role-based smoke tests for client, invited professional, unrelated professional, authorized operator, and anonymous access.
8. Keep notification delivery and scheduling disabled until their own security and deliverability review is complete.

This document does not authorize a production migration, deployment, email send, or user contact.
