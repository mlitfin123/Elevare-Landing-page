# Elevare marketplace trust and safety audit

Date: 2026-09-10

Scope: repository-level audit of the Elevare marketplace website and its tracked Supabase migrations. The separate admin application remains the only review and moderation interface. This audit does not assert that an untracked third-party service or production-only process exists.

## Existing capabilities

| Capability | Classification | Evidence and finding |
| --- | --- | --- |
| Marketplace profile review and publication | Complete and connected | `trainer_profiles.verification_status` and `profile_live` are guarded from professional updates. Public views require a reviewed/live profile and active account. Professional edits unpublish a live profile for re-review. |
| Professional onboarding and status | Complete and connected | The editor saves profile, service, category, location, and credential records. Attested submission sets review state without allowing self-approval. The dashboard exposes public-safe review status and feedback. |
| Individual credential records | Partially implemented | `certifications` stores one row per claim with type, name, issuer, dates, jurisdiction, private evidence reference, review status, reviewer, and review time. Owner-only raw-row access and public-safe projection exist. Missing are public-display preference, durable review history, information-request/revocation/recheck fields, and a material-edit invalidation lifecycle at the credential level. |
| Credential document storage | Partially implemented | `credential-documents` is private and owner-folder RLS exists. The client validates size, MIME type, and extension. There is no server-side file-signature or malware-scanning/quarantine integration. |
| Protected-title safeguards | Complete and connected for submission review | Central title detection and database submission checks exist. Potentially regulated titles are flagged for manual review rather than treated as proof of legal authorization. Jurisdiction-wide legal authorization still requires human review. |
| Identity verification | Unsafe | Legacy fields exist, but no provider or documented secure manual completion workflow is tracked. The marketplace snapshot generator currently assigns `identityVerificationStatus: "verified"` to every public profile. This is a false public trust claim and must be removed. |
| Email verification | Present but disconnected | Supabase Auth can establish email confirmation, but the public trust model does not expose a narrowly derived signal. It must not be inferred from profile approval. |
| Phone verification | Missing | No genuine OTP/verification completion source was found. No public phone-verification claim should be shown. |
| Background checks / Checkr | Database-only and disabled | Legacy background-check columns are protected from professional edits. No Checkr client, consent flow, invitation flow, signed webhook, state mapper, or production configuration was found. No public badge is currently justified. |
| Insurance | Present but disconnected | A legacy `trainer_insurance_public_status` view is consumed by public profile views, but the tracked repository has no evidence-submission schema, reviewer lifecycle, expiration derivation, or document policy dedicated to insurance. Existing booleans are not sufficient for a precise public claim. |
| Profile freshness | Partially implemented | Availability confirmation and profile retention timestamps exist. A general public-safe profile-information confirmation signal is not consistently projected. |
| Account standing and suspension | Complete and connected for discovery | Account activity, profile review/live state, and suspension are separate. Public views fail closed for inactive, unapproved, or suspended profiles. Accepting clients remains separate from suspension. |
| Accepting clients | Complete and connected | `client_acceptance_status` supports accepting, waitlist, and not accepting states and is rendered separately from approval. |
| Profile reports | Partially implemented | Authenticated reports use a security-definer RPC. The raw report table is admin/service-role only and reported professionals cannot read allegations. Reasons are too broad, there is no evidence upload or database rate limit, and analytics uses legacy event names and sends the display reason rather than a stable reason key. |
| Account deletion | Partially implemented | A private deletion request is written for moderation. Full cascading deletion and stale media cleanup remain operational processes outside this repository. |
| Audit history | Missing | There is no append-only trust-action audit ledger for credential, identity, insurance, background, suspension, and expiration actions. |
| Trust notifications | Partially implemented | Localized Resend approval and inquiry workflows exist. Trust-specific, idempotent notification queue/templates are missing. |
| Public Trust and Safety page | Missing | Legal terms describe marketplace limitations, but there is no focused, accessible, localized explanation linked through the marketplace journey. |
| Analytics | Partially implemented | Consent-aware event tracking exists. Trust-specific events are incomplete and report events use legacy names. No sensitive narrative should be sent. |
| Localization and accessibility | Partially implemented | Marketplace routes and many strings support `en`, `es-419`, and `pt-BR`. New trust labels, explanations, forms, and status dates require parity and accessible disclosure behavior. |
| Checkr operational/legal workflow | Missing | No adverse-action, consent, dispute, or provider workflow exists. It must remain disabled pending provider configuration and legal review. |

## Misleading or overly broad claims

1. `website/scripts/generate-marketplace-data.ts` hardcodes every published profile as identity verified. Publication review is not identity verification. This must be changed to a data-derived, fail-closed value.
2. Existing cards can show a generic `Credential verified` badge even though only an individual credential was reviewed. Public copy should name the specific verified credential where space permits and avoid suggesting all claims were reviewed.
3. The legacy profile approval state is named `verification_status`. Public UI must describe this only as `Profile reviewed`; it must never become a generic `verified` or endorsement claim.
4. Legacy insurance booleans do not establish current coverage without a reviewed expiration lifecycle. They should not produce a public confirmation by themselves.

## Security and privacy risks

1. Generated public marketplace JSON currently carries database UUIDs because interactive save, inquiry, view-count, and report flows accept profile IDs. The public views no longer expose account IDs, email, phone, credential numbers, document references, or admin notes, but the profile UUID remains visible. Replacing it safely requires slug-to-ID resolution in authenticated server/RPC boundaries across those features; this should be a separate compatibility migration rather than an unreviewed identifier change in this trust pass.
2. Credential upload validation is browser-side. Bucket privacy and owner scoping are sound, but content-signature validation and scanning are not implemented.
3. The report RPC lacks a database-side submission throttle. UI controls alone do not prevent automated abuse.
4. Full deletion/media cleanup cannot be proven from the tracked migrations. The current request records a deletion request but does not itself erase all linked records and objects.
5. The public profile image lifecycle should be verified operationally for replaced/deleted objects; no storage cleanup worker is tracked.

## Proposed implementation

1. Add one additive, admin-compatible migration that formalizes independent trust dimensions without renaming legacy admin fields.
2. Extend credentials with public-display, information-request, revocation, recheck, and revision metadata; invalidate reviewed credentials after material professional edits; derive expiration at query time.
3. Add private identity, insurance, and background-check records with least-privilege RLS and professional-safe summary views. Background checks remain disabled and cannot produce a public signal without a completed provider-backed record.
4. Add an append-only audit ledger and idempotent transactional notification outbox. No email sender or scheduler is activated by the migration.
5. Add a private trust-evidence bucket with owner-folder upload/read policies and no public access. Reviewer access remains through the separate admin service role.
6. Add a public-safe trust summary view and merge it into the generated marketplace snapshot. Remove fabricated identity verification.
7. Add localized public trust-summary UI, restrained card signals, an account-facing status panel, a Trust and Safety page, and links from marketplace, profile, onboarding, footer, and report flow.
8. Replace report reasons with stable categories, add a rate-limited RPC, provide emergency guidance, and emit only privacy-safe analytics properties.
9. Add unit/source-policy tests and operational documentation for Checkr, expiration scheduling, notification delivery, legal review, retention, and deployment order.

## Expected files and migrations

- `supabase/migrations/20260909400000_professional_trust_safety.sql`
- `website/lib/professional-trust.ts`
- `website/components/marketplace/PublicProfessionalTrustSummary.tsx`
- `website/components/marketplace/ProfessionalTrustStatus.tsx`
- `website/app/trust-safety/page.tsx`
- `website/lib/i18n/marketplace-content.ts`
- `website/lib/marketplace-types.ts`
- `website/lib/marketplace-helpers.ts`
- `website/scripts/generate-marketplace-data.ts`
- Existing marketplace profile/card/editor/report/footer/directory files as narrowly required
- Trust-system tests and `website/docs/trust-safety-operations.md`

## Legal and operational review boundaries

The public Trust and Safety explanations, protected-title policy, background-screening consent/adverse-action process, report retention, identity-provider process, insurance review criteria, and jurisdiction-specific licensing expectations require attorney and operations review before activation. The implementation may support these workflows but must not claim that a check occurred until an authorized reviewer or configured provider records a qualifying result.
