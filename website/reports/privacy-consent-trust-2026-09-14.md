# Privacy, consent and trust review — September 14, 2026

Implemented locally on `codex/privacy-consent-trust`, based on `origin/main` (`d3f9aa0`). No push, deployment, production migration, production environment change, real account signup, payment, email, or live AI call was performed. This is an implementation review, not certification of legal compliance.

## Changes

1. **Media wording:** English, Latin American Spanish and Brazilian Portuguese privacy/terms, analysis upload consent, privacy panels and FAQs now distinguish physique photos from posing media. Physique photos pass through website request memory to OpenAI; the website does not write those uploads to its database, object storage or filesystem. `quick-analysis-images.ts` clears both original and normalized buffers on completion/failure. Posing videos and extracted frames enter StageLab's private Supabase temporary bucket; selected frames reach OpenAI through signed access. The original video is used by StageLab for validation, not sent to the AI provider. No claim is made about eliminating provider copies, provider training, or guaranteed immediate deletion.
2. **Action-time acknowledgement:** The existing signup checkboxes are preserved. A small native dialog appears when an authenticated account lacks current evidence and tries to save a professional, send an inquiry, submit guided matching, or submit a professional profile for review. Both checkboxes start unchecked. Cancel keeps the draft. Sign-in, recovery, account reads, draft editing, unsaving and moderation remain available. The new RPC uses `auth.uid()`, an active marketplace account, server time, server-controlled document versions and explicit adult self-attestation. Existing acceptance/history records are not rewritten or backfilled. The privacy acknowledgement is not marketing consent.
3. **Direct-request enforcement:** Database triggers cover the underlying inquiry/save/review/concierge/legacy-demand writes, including writes inside security-definer RPCs. Restrictive policies prevent direct Terms/Privacy evidence inserts, updates or deletes. Other shared-app legal document types retain their existing permissions. New website signup metadata must identify the current registered versions; alternative shared Auth signup remains available but does not bypass the protected-action requirement.
4. **Proposed-match privacy:** A `pending_client` match previously granted the proposed professional access to the client's entire private profile. The new policy blocks that access. The requesting client retains access, the selected inquiry recipient receives the explicitly submitted inquiry, and an accepted/active/completed coaching relationship retains the existing shared-app access needed for coaching and message policies. A security-definer relationship helper returns only an authorization boolean. Unrelated accounts remain excluded.
5. **Evidence replacement:** Owners could overwrite bytes at a reviewed credential/insurance object path without changing the record or resetting its review. Authenticated updates/moves into or out of these private evidence buckets are now blocked. The existing website uploader already uses fresh paths with `upsert: false`; linking replacement evidence invokes the existing review reset. Service-side moderation remains privileged, and existing referenced-file deletion protections remain in place.
6. **Narrow StageLab cleanup fix:** The old stale-object query used only object creation time. A valid upload reserved near its two-hour admission deadline could lose media during the cleanup sweep. The new selector protects recent active website sessions and shared mobile jobs, plus unexpired initialized website uploads. Session expiry and stale analysis updates recheck activity and terminal state when mutating, so an intervening completion is not overwritten. Cleanup completion markers exclude active/recent analyses. Failed/abandoned/orphaned media remains eligible for cleanup.

## Already correct and retained

- Signup already had separate unchecked legal and adult checkboxes, with server signup recording for the website path. The new action gate addresses missing/alternative-path evidence.
- Inquiry ownership policies separate the requesting client, selected professional and unrelated users. Direct inquiry updates are restricted; the existing transition RPC controls status changes.
- Private evidence buckets, authenticated owner-path storage policies and signed URL access checks already existed. Public profile/trust projections exclude documents, private identity data and internal review notes.
- Existing credential and profile guards reject self-verification/publication changes. Tests now exercise these guards directly as well as the evidence overwrite fix.
- Identity/background review records, reports and internal concierge notes are protected by existing reviewer/service permissions. Public trust summaries distinguish profile review, claimed qualifications and specifically verified evidence, including expiration/revocation; profile review is not an endorsement or universal authorization to practice.
- Broad nutrition categories already use “Nutrition Professionals,” “profesionales de nutrición” and “profissionais de nutrição.” Accurate individual titles and the distinct dietetics category were preserved.
- Consultation and concierge copy already states that requests are not bookings or guaranteed matches.
- Existing analytics consent and event allowlists were retained. This patch adds no analytics events or advertising trackers and does not add private media or prose to telemetry.
- Marketplace payment features were not added. Paid StageLab payment checks, entitlements, provider/rubrics, saved result access and analysis contract remain unchanged.

## Retention and operations

StageLab terminal processing attempts deletion of the original video and frame paths on success, invalid footage and failure. Scheduled cleanup retries remaining stale objects and abandoned uploads. The two-hour stale threshold and half-hour scheduler are eligibility/scheduling settings, not a guaranteed deletion deadline; storage/network/job failures can delay removal. Active work has an activity-based grace window. A reserved analysis resumes using its existing identity; an explicit new attempt after failure requires new media. Website result access expires up to 72 hours after payment; expired website content is cleared on access or cleanup. StageLab's separately persisted structured posing report is not automatically deleted by that website expiry. Payment, entitlement and operational records have separate retention.

The inspected StageLab workflow runs at minutes 7 and 37 each hour and requires repository variable `POSING_ANALYSIS_CLEANUP_URL` and repository secret `POSING_ANALYSIS_CLEANUP_SECRET`, matching the deployed function secret. Before deployment, verify the URL targets `https://<StageLab-project>/functions/v1/analyze-posing-video`, the workflow is enabled on the intended default branch, and a recent execution returned `cleaned: true` with `cleanupFailures: 0`. No secret values are in this patch.

## Verification performed

| Check | Result |
| --- | --- |
| `npm test` | 448 passed, 0 failed |
| `node tests/integration/privacy-consent.mjs` | 9 groups passed in a disposable local PostgreSQL database |
| StageLab `node scripts/posing-cleanup-database.mjs` | 4 groups passed in a disposable local PostgreSQL database |
| `npm run typecheck` | Passed; production build also ran TypeScript successfully |
| `npm run lint` | 0 errors; 4 existing `next/no-img-element` warnings |
| `npm run verify:posing-contract` against isolated StageLab checkout | 41 passed; no network/AI calls |
| Ordinary production build | Blocked by DNS failure resolving Google Fonts |
| Offline `npm run build -- --webpack` | Passed using the existing cached font files and local marketplace fixtures |
| Prebuild | 142 redirects, 12 localized legal documents, 10 active legal routes and 2 current archive routes verified |
| Postbuild | Localization, legal output, content audit and production artifact verification passed: 2,808 HTML files, 490 fixture/config-dependent sitemap URLs |
| Website/backend `git diff --check` | Passed |
| Portable backend patch reverse-apply check | Passed against the changed isolated checkout |
| Browser checks | Actual acknowledgement component in isolated local harness: unchecked/reset defaults, cancellation with zero writes and preserved draft, one simulated resumed action, localized failure and stale-version states; English 390px, Spanish 320px, Portuguese 768px. Production artifact Spanish privacy and Portuguese terms checked, including desktop 1280px without horizontal overflow. |

Database cases cover anonymous calls, missing consent, incorrect versions/unchecked booleans, spoofed Auth metadata, direct evidence-table writes, security-definer action bypass, idempotent acceptance/history, server timestamp/account binding, cross-client impersonation/read denial, proposed versus accepted match access, private evidence reads/writes, self-verification, review reset after replacement, direct approval/background flag tampering, and preservation of alternative signup. Cleanup cases cover near-expiry reservation, active frames/mobile work, terminal/failed media, abandoned/stuck uploads, unrelated buckets, mutation races, service-only inventory access and bounded selection.

## Deployment handoff — not executed

**Elevare marketplace project (Elevare-Prod):** apply these two migrations in order as part of a coordinated website release:

1. `supabase/migrations/20260914110000_register_media_privacy_legal.sql`
2. `supabase/migrations/20260914120000_marketplace_action_consent.sql`

Both Terms and Privacy now use immutable version `2026-09-14`; prior archives/history are preserved. The registration checks exact archive hashes. Coordinate the action gate and new website bundle: deploying the gate alone can temporarily block old clients that do not have the acknowledgement UI/current signup versions. Stale clients should refresh. Shared marketplace clients that perform gated actions must adopt `marketplace_get_consent_status` and `marketplace_acknowledge_legal`; authentication/recovery itself remains shared and ungated.

**StageLab project:** the separate local branch `codex/posing-active-cleanup` is based on the inspected committed posing baseline `19a037a`. Its changes are also packaged in `stagelab-active-cleanup-2026-09-14.patch` beside this report so they are reviewable with this website change. Apply that patch to the intended StageLab revision, run `git apply --check` first, apply `202609141300_protect_active_posing_cleanup.sql` to the StageLab project, then redeploy `analyze-posing-video`. The gateway function and AI provider do not change in this pass. Do not apply the StageLab migration to Elevare-Prod. Do not copy unrelated mobile working-tree changes.

No new environment variables or localization flags are required. Keep the existing localized route configuration and cleanup settings. The standard online deployment build still needs working Google Fonts DNS/network access; the temporary offline fixture/cache settings used here are not production configuration. Generated sitemap/snapshot changes from local testing were restored to keep the patch focused.

## Verification limits

Live Supabase policy state, storage contents, successful recent cleanup runs, actual signed URL downloads, full shared-app integration, real signup/email and a paid analysis smoke test were not verified in production. SQL tests execute actual relevant migration functions/policies against minimal prerequisite table fixtures, not a replay of every historical marketplace migration. Shared-app message policy source was inspected; accepted coaching relationships were deliberately retained, but the entire mobile app was not run. The browser dialog used simulated auth/RPC responses, with authorization tested separately in PostgreSQL. Deno CLI checking was not available in this session; shared contract verification and the actual cleanup SQL tests passed. AI-provider account retention/training settings and jurisdiction-specific licensing determinations were not verified or changed. Those should not be inferred from this patch.

The unrelated pre-existing `posing-analysis-audit-2026-09-11.md` was left untouched.

## Files changed

- `website/app/layout.tsx`
- `website/components/marketplace/InquiryForm.tsx`
- `website/components/marketplace/MarketplaceDemandForm.tsx`
- `website/components/marketplace/ProfessionalProfileEditor.tsx`
- `website/components/marketplace/ProfessionalSaveButton.tsx`
- `website/content/legal/privacy-policy.html`
- `website/content/legal/terms-of-service.html`
- `website/content/legal/translations/es-419/privacy.json`
- `website/content/legal/translations/es-419/terms.json`
- `website/content/legal/translations/manifest.json`
- `website/content/legal/translations/pt-BR/privacy.json`
- `website/content/legal/translations/pt-BR/terms.json`
- `website/lib/i18n/stage-analysis-messages.ts`
- `website/lib/legal.ts`
- `website/locales/en/quick-analysis.ts`
- `website/locales/es-419/quick-analysis.ts`
- `website/locales/pt-BR/quick-analysis.ts`
- `website/public/legal/legal-document-versions.json`
- `website/public/privacy-policy/index.html`
- `website/public/terms-of-service/index.html`
- `website/tests/legal-readiness.test.ts`
- `website/tests/quick-analysis.test.ts`
- `supabase/migrations/20260914110000_register_media_privacy_legal.sql`
- `supabase/migrations/20260914120000_marketplace_action_consent.sql`
- `website/components/marketplace/MarketplaceAcknowledgement.tsx`
- `website/lib/marketplace-consent.ts`
- `website/public/legal/archive/privacy/2026-09-14.html`
- `website/public/legal/archive/terms/2026-09-14.html`
- `website/reports/privacy-consent-trust-2026-09-14.md`
- `website/reports/stagelab-active-cleanup-2026-09-14.patch`
- `website/tests/integration/privacy-consent.mjs`
- `website/tests/marketplace-consent.test.ts`

Separate StageLab checkout (also included in the portable patch):

- `supabase/functions/analyze-posing-video/index.ts`
- `supabase/migrations/202609141300_protect_active_posing_cleanup.sql`
- `scripts/posing-cleanup-database.mjs`
