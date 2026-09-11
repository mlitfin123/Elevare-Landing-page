# Professional retention dashboard

## Metric definitions

- **Legitimate profile views** count an approved, active, public professional profile at most once per consenting browser, profile, and UTC day. The browser receives a random first-party cookie. Only its daily SHA-256 hash is stored. IP addresses, user agents, authenticated viewer IDs, and client identities are not stored with view events. Known bots, prefetches, admin accounts, and a signed-in professional viewing their own profile are excluded.
- **Current saves** are the number of active rows in `saved_trainer_profiles` for the professional. Unsaving reduces this count. Professionals receive only the aggregate, never saver identities.
- **Consultation requests** are real rows addressed to the professional. The date selector shows either the last 30 days or all-time totals.
- **Awaiting response** includes only requests in `new` or `viewed` status.
- **Response rate** is the percentage of consultation requests received in the last 90 days with a recorded first accept or decline action.
- **Median first response** is the median elapsed time from request creation to the first accept or decline action within that same 90-day sample.
- Response metrics remain hidden until at least three requests exist in the 90-day lookback. The current schema does not classify spam, invalid, cancelled, duplicate, or administratively removed inquiries, so those exclusions cannot be applied until an authoritative moderation state exists.
- **Profile completeness** uses the deterministic rules in `lib/professional-profile.ts`. It is guidance only and never changes approval, publication, verification, or access to existing requests.
- **Profile freshness** is current only after the professional explicitly confirms the information, the confirmation is no more than 90 days old, and the profile has not changed since confirmation. Self-confirmation is not credential or identity verification.

## Request state machine

The owner-authorized `marketplace_transition_professional_inquiry` RPC locks the request row and requires the caller's expected status. Direct authenticated updates are revoked.

| Current status | Allowed action | Next status |
| --- | --- | --- |
| `new` | Open | `viewed` |
| `new`, `viewed` | Accept | `accepted` |
| `new`, `viewed` | Decline | `declined` |
| `accepted` | Mark contacted | `contacted` |
| `accepted`, `contacted` | Close | `closed` |

No other transition is permitted. A concurrent or repeated response fails instead of overwriting newer state.

## Transactional notification

Creating a consultation request queues one `new_consultation_request` outbox event. The client invokes the authenticated `professional-inquiry-email` Edge Function after the request is saved. The function verifies that the caller created that request, claims the outbox event under a lease, resolves the professional's authoritative email and locale, and sends through Resend with both a database event key and provider idempotency key.

The email contains no client name, email, goal, message, health information, or internal identifier. It links to the localized client-request dashboard. The request remains saved if notification delivery fails.

## Monthly summary status

`buildMonthlyProfessionalSummary` provides a deterministic, localized summary layer for English, LATAM Spanish, and Brazilian Portuguese. It uses aggregate values only and does not calculate misleading period-over-period percentages.

Automated monthly delivery is intentionally disabled. This repository does not currently have an established professional notification-preference model and idempotent monthly scheduler that can safely support recurring sends. Do not schedule this summary until both are available.

## Analytics events

Events use the existing consent-aware `trackEvent` implementation. Never add names, emails, free text, health data, profile/request UUIDs, or client identifiers.

| Event | Allowed properties |
| --- | --- |
| `professional_dashboard_viewed` | `range_days` (`30` or all-time selector value) |
| `professional_availability_changed` | `availability_status` |
| `professional_profile_improvement_selected` | `item_key`, `section` |
| `professional_profile_confirmation_completed` | `freshness_state` |
| `professional_profile_share_selected` | `share_method` (`native` or `copy`) |
| `consultation_request_opened` | `source_page` |
| `consultation_request_accepted` | `source_page` |
| `consultation_request_declined` | `source_page` |

## Manual release order

1. Review and apply `supabase/migrations/20260909200000_decision_ready_professional_profiles.sql` if it is not already present in the target Elevare marketplace project.
2. Apply `supabase/migrations/20260909300000_professional_retention_dashboard.sql` to the same project.
3. Set `RESEND_API_KEY`, `RESEND_TRANSACTIONAL_FROM`, and `RESEND_TRANSACTIONAL_REPLY_TO` as Supabase Edge Function secrets if they are not already configured for the professional approval email.
4. Deploy `professional-inquiry-email` to that project with JWT verification enabled.
5. Deploy the website only after the migration and Edge Function are available, because the dashboard calls the new RPCs.
6. Verify a consenting anonymous view, an excluded owner view, availability changes, request transitions, and one test-recipient notification before enabling production traffic.

No migration, Edge Function, or website deployment is performed automatically by this implementation.
