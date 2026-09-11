# Elevare continuation handoff

Saved September 11, 2026 after compaction failed in the older Codex task. This document preserves useful context for continuing in a new task; it does not modify or delete the older conversation.

## Sources and limits

- Older task: **Add matching premium landing page**, ID `019d08c1-4940-7e91-b5e0-fb19560795c1`, host `local`.
- Continuation task: `01a08e59-af8d-7672-8322-8acfde73ebf6`.
- Recovery read the 32 most recent turns of the older task, including recent user requests, final reports and migration troubleshooting. This is selected recent context, not its complete months-long transcript. Older turns remain retrievable using the task-reading tools.
- Historical completion reports describe local implementation unless deployment or application was explicitly confirmed. They are not proof of the current production state.
- The current runtime report and repository code take precedence over older descriptions of build-generated professional data.
- Subsequent user update on September 11: all Supabase migrations have been applied. Treat migration application as user-confirmed complete; the older ordering errors below are historical. This update did not independently verify the remote schema, Edge Function deployments, secrets or website deployment.
- Later on September 11, the user explicitly authorized pushing this work to GitHub. That supersedes the earlier no-push boundary for this release. Release preparation patched Next.js, sharp and js-yaml; the full npm audit returned zero vulnerabilities, and the unit/build/runtime checks passed again. See the release follow-up at the top of `professional-runtime-report.md`. Older advisory findings below are historical; production configuration and delivery checks remain separate.

## Repository and working boundaries

- Authoritative checkout: `C:\Users\markl\Desktop\Elevare_Landing_Page`; active Next.js application: `website/`.
- Website: Vercel, canonical `https://www.elevarefit.com`. The `.org` domain uses permanent redirects preserving paths. Root legacy static content is not the active production application.
- Separate admin source referenced in the older task: `C:\Users\markl\Desktop\Admin_Elevare`. Recent admin concierge work was reported there; this continuation did not validate that application's integration.
- Original visual direction: dark premium surfaces, teal accent, DM Sans / DM Mono, matching the separate admin interface. Website locales: English, Latin American Spanish and Brazilian Portuguese.
- Marketplace authority is the secondary Supabase project. Do not substitute the primary nutrition/training project. Keep browser and server marketplace project URLs consistent.
- Preserve professional approval, evidence privacy, legal attestation and existing admin authority. Material edits can intentionally require renewed review; that behavior is separate from cache freshness.
- Checkout is on `main` tracking `origin/main`, with substantial modified and untracked work from several tasks. Preserve it; do not reset or attribute the entire diff to the runtime fix.
- The runtime request prohibited pushing, deploying, production migrations and production data changes. None were performed by that work. Earlier historical pushes in the old task do not authorize a new release.
- Start migration/release work with `docs/deployment-and-migration-safety.md` and the migration ledger documentation. The repository does not contain a complete replayable production baseline.

## Recent work recovered from the older task

| Area | Recovered implementation and limits |
| --- | --- |
| Profile localization and languages | Public professional languages, localized standard names, custom names preserved, `knowsLanguage` metadata, multiple editable languages. Separate private client language preferences; language becomes an exclusion only when the client requires it. Historical pushes were reported for localization and professional languages. |
| Social links | Compact Instagram, Facebook, YouTube, TikTok and LinkedIn icons; optional custom website link label with URL fallback. Existing JSON fields used for the website label and social URLs. |
| Decision-ready profiles | Headline, best fit, goals, experience, coaching style, service boundaries, consultation expectations and richer service offers. Service-specific pricing and inquiry context; an inquiry is not a booking. Claims and verified credentials remain distinct. |
| Professional retention | Dashboard availability, inquiries, private aggregate views/saves, response metrics after sufficient samples, completeness and information confirmation. Owner RPCs guard inquiry state changes. Inquiry email Edge Function uses Resend with authorization and idempotency. Monthly summaries remain disabled scaffolding. See `professional-retention.md`. |
| Trust and safety | Separate approval, email, identity, credential, background, insurance, freshness, standing and availability dimensions; private evidence and audit/reporting workflows. Historical verdict was NEEDS FIXES. Checkr integration is disabled scaffolding, no server malware scanner/quarantine was implemented, and trust notification delivery remains disabled. Full staging RLS/storage and operational/provider workflows still require validation. See `trust-safety-audit.md` and `trust-safety-operations.md`. |
| Concierge | Human-operated cases, shortlists of 1–3 actual candidates, professional interest/decline/clarification, client selection and consented introductions. Direct profile inquiries remain separate. Rematches preserve history; no padded candidate lists or invented outcomes. Notification templates/outbox remain disabled without a sender/scheduler. Separate admin changes were reported. See `marketplace-concierge-audit.md` and `marketplace-concierge-operations.md`. |
| Low-inventory marketplace | Eligible profiles shown immediately; six results then six more; deterministic daily tie rotation; supply-aware category cards and honest empty/limited states; removable filter chips; explicit in-person searches do not silently switch online. Directory payload trimmed and consented analytics avoid free text and identifying data. See `marketplace-low-inventory-audit.md`. |

### Guided matching requires verification

The user requested a short, deterministic guided matching flow with up to three suitable professionals, transparent eligibility/relevance, manual browsing retained, and limited-supply cases entering the existing human concierge workflow. However, the final response for that request described the preceding low-inventory work. Do not assume the guided flow was completed from that report alone; inspect the implementation against the original request before declaring it done.

Request attachment: `C:\Users\markl\.codex\attachments\c5418db7-e14f-4690-af2a-f4f95d1d77c2\pasted-text.txt`.

### Other unresolved historical findings

- Trust review reported dependency advisories, including Next.js. The runtime task did not rerun the dependency audit or establish that those findings were resolved. Recheck before reporting current counts or release readiness.
- Production retention enforcement, evidence scanning, provider setup, notification workers, deletion/storage cleanup and full external-admin integration were not established as complete by the recovered reports.
- Old trust/marketplace documentation may refer to generated snapshots or optional trust data. The runtime implementation below supersedes those descriptions.

## Migration ordering and encountered errors

Recent migration sequence below is not a complete production installation recipe:

1. `20260909120000_public_professional_languages.sql` and `20260909130000_client_language_preferences.sql` were earlier language work.
2. `20260909200000_decision_ready_professional_profiles.sql`.
3. `20260909300000_professional_retention_dashboard.sql`.
4. `20260909400000_professional_trust_safety.sql`.
5. `20260909500000_marketplace_concierge.sql`.
6. `20260910120000_professional_runtime_publication.sql`.

The retention migration creates `trainer.profile_information_confirmed_at`, which the trust migration requires. The user encountered that missing-column error and acknowledged the ordering issue. Concierge requires `public.marketplace_is_trust_reviewer()` from the committed trust migration; the user then encountered that missing-function error. Successful application of the complete chain was not confirmed in the recovered turns.

The older task corrected trust storage policy syntax to place `ON storage.objects` before `AS RESTRICTIVE`. It also narrowed the retention backfill to rows missing relevant timestamps and backfilled response timestamps for applicable historical inquiry states, avoiding an unscoped update of every inquiry.

An existing migration ledger mismatch needs operation-by-operation reconciliation. Do not blindly replay historical migrations or mark all missing ledger entries as applied. Runtime migration testing here used only a disposable local contract schema.

## Runtime publication fix completed in this continuation

The interrupted request at the end of the old task is the runtime publication request completed here. Do not restart it from the old interrupted state.

Root cause: professional data, profile paths and professional sitemap content were generated at build time. Database edits could not become public until another deployment, and generator failures could retain an old snapshot.

The implementation now uses a service-only restricted public view, `marketplace_public_professionals_v3`, with runtime SSR and versioned cached public projections. A small uncached database version check selects the current generation for fresh requests. Transactional triggers cover website, admin and other authorized database writers, with a durable coalescing delivery outbox, revision-conditional acknowledgement, slug history and deletion tombstones. Current eligibility and trust are mandatory; old snapshot files are removed. Professional JSON and sitemap URLs are runtime routes, including localized rendering and SEO.

The editor saves sections atomically under existing RLS and review rules, using the current edit version. Stale edits return HTTP 409. Dashboard/editor states distinguish confirmed saves, pending review, propagation delay, conflict and uncertain network outcomes. Propagation retries do not repeat the content write. Localized feedback, unsaved warnings and upload/evidence preservation are included.

Read `professional-runtime-report.md` for the 27-point result, `professional-runtime-operations.md` for architecture and rollout, and `professional-runtime-audit.md` for the original findings.

### Completed verification

- 332 unit tests passed; typecheck passed; lint had zero errors and four existing image warnings.
- Production build and artifact checks passed. Final tested build ID: `lcSSdho4Xz8F2QBzc0rt3`.
- Fifteen production-mode scenarios against disposable Supabase PostgreSQL and PostgREST covered allowed updates without rebuilding, RLS, privacy, publication eligibility, expiry, slug changes, deletion, conflict and delivery retry/failure behavior.
- Chrome desktop/mobile checks exercised real dashboard and full-editor saves, confirmed values, conflict/reload, delayed propagation, warning lifecycle, focus and overflow.
- Runtime SEO passed with one synthetic eligible profile. The broader localization audit produced heuristic review candidates; it was not a clean translation certification.
- Durable evidence: `website/reports/professional-runtime-integration.json`, `website/reports/professional-dashboard-browser.json` and dashboard screenshots.
- Full staging baseline, actual legal attestation submission, external admin/mobile/storage integration and distributed Vercel behavior remain release prerequisites. Local fixture success does not establish production readiness.

The disposable containers `elevare-runtime-test-db` and `elevare-runtime-test-rest`, plus local helper processes, were stopped after verification. Docker itself and unrelated resources were left alone. Local reproduction steps are in the operations guide.

## Environment questions already answered

| Platform | Setting |
| --- | --- |
| Vercel project environment variables | `PROFESSIONAL_REVALIDATION_SECRET`, server-only |
| Marketplace Supabase Edge Function secrets | The same `PROFESSIONAL_REVALIDATION_SECRET` |
| Marketplace Supabase Edge Function secrets | `PROFESSIONAL_REVALIDATION_ORIGIN=https://www.elevarefit.com` |

The user requested a secret and a cryptographically random 64-character hexadecimal value was generated and shown in chat. Its value is intentionally absent from this file. The agent did not save platform settings; whether the user has since configured them is unknown.

The new `professional-publication-delivery` Edge Function is present locally but deployment and scheduling were not performed. The operations guide describes a trusted once-per-minute scheduler after rollout. It proactively purges and acknowledges events; the database version gate provides fresh requests even while that worker is unavailable. Setting secrets alone does not deploy or schedule a function, and professional edits do not require manually running one each time.

## Continuing from here

Use this handoff and the runtime report as the starting context. Preserve the original task for deeper retrieval when a specific older decision matters. Confirm current repository/platform state before acting on historical reports. No release, new feature implementation or production configuration change is authorized solely by this recovery document.
