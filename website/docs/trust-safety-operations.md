# Elevare trust and safety operations

Status: local implementation prepared; migration not applied and delivery integrations not activated by this work.

This document describes the operational boundary for the additive marketplace trust system in `supabase/migrations/20260909400000_professional_trust_safety.sql`. The separate Elevare admin project remains the sole interface for profile review, credential decisions, identity decisions, insurance decisions, background-screening review, suspension, and report moderation.

## Independent trust dimensions

The system keeps marketplace profile review, Auth email confirmation, identity verification, each individual credential, background screening, insurance evidence, profile-information freshness, account standing, and accepting-clients status separate. Passing one check never sets another check to a passing state.

Public labels are deliberately narrow:

- `Profile reviewed` means the profile passed marketplace eligibility review and is currently eligible for publication. It is not an endorsement and does not verify every claim.
- `Identity verified` requires a completed, non-revoked, non-expired identity record from a named provider or documented secure process.
- `[Credential name] verified` applies only to that individual, current, non-revoked credential record.
- `Background check completed` requires a completed provider record and named screening product. It is a point-in-time status, not a guarantee or continuous monitoring claim.
- `Insurance confirmed through [date]` means Elevare reviewed evidence recorded as current through that date. It does not guarantee coverage for a service or claim.
- `Last confirmed [date]` is the professional's last profile-information confirmation, not continuous monitoring.
- Availability is professional-supplied and remains independent from account standing.

Pending, declined, failed, revoked, and internal review notes are not projected publicly. Unverified public credential records are described only as claimed credentials.

## Migration and deployment order

1. Back up and review the target Elevare Supabase project schema.
2. Confirm the separate admin project can preserve and update the existing `certifications` fields plus the additive trust fields.
3. Apply `20260909400000_professional_trust_safety.sql` to a staging project first.
4. Run authenticated RLS tests using three accounts: professional A, professional B, and admin/reviewer.
5. Verify the private `credential-documents` and `professional-trust-evidence` bucket policies with real uploads and cross-account denial checks.
6. Update the separate admin project to read and write the additive identity, background, insurance, credential-review, audit, and report data. Do not add admin controls to the public website.
7. Build the website with the staging Supabase configuration and verify the generated public marketplace snapshot contains only public-safe trust fields.
8. Complete legal and operations review before exposing or activating any new verification process.
9. Deploy the website only after the staging checks pass.
10. Configure an authenticated notification worker and expiration schedule only after templates, support ownership, retry handling, and opt-out/legal treatment are approved.

Do not apply the migration and deploy the website in the opposite order. The website treats the trust view as optional and fails closed, but the professional insurance submission UI requires the migration and bucket to exist.

## Reviewer workflow

Only the service role or an authenticated `admin`/`super_admin` account may set review fields. Professionals can submit or update their own evidence but cannot set verification outcomes, reviewer IDs, review timestamps, revocation fields, or internal states.

Reviewers should:

1. Confirm that the record belongs to the correct professional.
2. Review the evidence through an authorized private channel.
3. Validate the issuer or authoritative source rather than trusting a professional-supplied link by itself.
4. Confirm the applicable jurisdiction and expiration date.
5. Record the narrow result for the individual check only.
6. Use professional-visible feedback only for content safe to disclose to the professional.
7. Keep sensitive notes in the admin system; do not put document contents, credential numbers, or background-report details in feedback or notification payloads.
8. Use `is_active = false`, `public_display = false`, revocation, or a new revision rather than erasing verification history.

Material professional edits to credential or insurance evidence reset that individual record to pending and increment its material revision. A new upload never automatically restores verification.

## Evidence storage

`credential-documents` and `professional-trust-evidence` are private buckets. Uploads are owner-folder scoped, use server-generated UUID filenames, allow PDF/JPEG/PNG/WebP only, and are limited to 8 MB. The website also checks file signatures before upload.

The repository has no malware-scanning or quarantine service. Before production operations accept documents at scale, connect a private scanning workflow that prevents reviewer download until scanning completes. Do not make either bucket public. Reviewer document access should use the service role in the separate admin project or short-lived signed URLs created after an authorization check.

Referenced evidence cannot be deleted by an ordinary authenticated user. Account deletion and retention operations therefore require an authorized backend cleanup process that considers legal hold, fraud, dispute, safety, and regulatory obligations.

## Expiration lifecycle

Public projections derive current credential and insurance status from expiration and revocation fields. Once expired, a record no longer renders as currently verified or confirmed. There is no implicit grace period.

`marketplace_prepare_trust_expiration_notices` is service-role-only and defaults to `p_enqueue = false`. In its current state it can report eligible notices without sending anything. If operations later enables enqueueing, schedule it once daily and retain the unique idempotency keys. A separate authenticated worker must claim queued rows atomically, build the deterministic localized template, send through the existing transactional sender, and mark the row sent. Retry limits, dead-letter handling, delivery logs, and operator alerts are not implemented in this migration.

## Trust notifications

`website/lib/professional-trust.ts` defines deterministic `en`, `es-419`, and `pt-BR` templates for the required trust events. Templates contain no evidence, credential number, allegation narrative, background details, or policy number. No runtime AI translation is used.

The outbox is a delivery design, not a connected email system. This work does not send messages. Before connecting Resend, map each supported outbox event to its template, resolve the recipient through a server-only user lookup, use the stored normalized locale with English fallback, and preserve the idempotency key in the provider request.

## Checkr status

Checkr is disabled with `is_enabled = false` and `configuration_state = not_configured`. No invitation, candidate creation, consent, webhook, adjudication, or adverse-action workflow is implemented. No professional can obtain a public background-check signal from the website.

Future activation requires, at minimum:

- a contracted Checkr account and an approved screening package;
- legal review of consent, notices, dispute rights, permissible purpose, eligibility criteria, and adverse-action procedures;
- server-only `CHECKR_API_KEY`, `CHECKR_WEBHOOK_SECRET`, and an approved package identifier;
- signed, replay-safe, idempotent webhook processing;
- minimal provider references and mapped statuses only, never full report contents in the general marketplace database;
- staging tests proving that no public signal appears until the configured screening product reaches the exact completed state;
- an operator runbook for errors, disputes, adverse action, and account restrictions.

Do not set the integration row to enabled until all of those items are complete.

## Reports and emergency guidance

Authenticated users can submit a structured profile report only for an approved, active, publicly visible professional. The RPC rejects self-reports, validates the reason and narrative length, and limits an account to five reports in 24 hours. A report does not automatically suspend, hide, or punish a professional. Raw reports remain available only to the separate authorized moderation system, and reported professionals cannot read allegations about themselves.

The public flow does not currently accept report evidence. This is intentional until a private evidence bucket, scanning/quarantine, retention policy, and admin review path are established for report attachments.

Elevare is not an emergency, medical, or crisis service. The public page and report flow direct immediate danger to local emergency services.

## Suspension, removal, and deletion

Public discovery is still governed by the existing approved, active, live public-profile view. Suspension removes a professional from that view and therefore from generated search, metadata, sitemaps, and new consultation requests. `not_accepting` is an availability choice and is not treated as suspension.

Suspension must preserve evidence, reports, and audit history. Account deletion remains a requested moderation process; a complete, verified cascade across database rows and storage objects is not implemented by this trust migration. Operations must define retention and legal-hold requirements before automating destructive cleanup.

## Analytics allowlist

The consent-aware website may emit these event names with only the listed properties:

- `trust_explanation_opened`: `source_page`
- `credential_submission_started`: `evidence_type`
- `credential_submission_completed`: `submission_type`
- `verification_status_viewed`: `status_scope`
- `report_flow_opened`: `source_page`
- `report_submitted`: `reason_category`, `source_page`
- `public_trust_detail_expanded`: `trust_type`
- `insurance_submission_started`: `evidence_type`
- `insurance_submission_completed`: `submission_type`

Never send names, contact details, UUIDs, credential numbers, document paths/URLs, report narratives, provider references, background information, insurance identifiers, or health information.

## Known risks and required follow-up

- Existing interactive save, inquiry, view, and report contracts expose a public profile UUID. No user/account UUID, contact data, or evidence reference is projected, but replacing the profile UUID requires a coordinated slug-to-ID server/RPC migration across existing clients.
- Browser file-signature checks and bucket restrictions do not replace malware scanning.
- Stale profile-photo object cleanup and complete account-deletion cleanup are not proven by this repository.
- The notification sender, scheduler, retry worker, and operator alerting are not connected.
- Identity verification has no configured provider or documented secure manual completion process and must remain unverified.
- Checkr is disabled and must remain disabled.
- Manual reviewer criteria are still required for regulated titles, licenses, international jurisdictions, credential sources, and insurance evidence.
- The Trust and Safety page, public status explanations, protected-title rules, background-screening policy, report retention, evidence retention, and identity/insurance criteria require attorney review before production activation.
