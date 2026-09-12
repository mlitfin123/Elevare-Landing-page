# StageLab website posing hardening — September 12, 2026

## Verdict

**PASS WITH MINOR ISSUES. Deployment recommendation: Safe for staging.**

The four confirmed defects are fixed. The shared provider, frame-based analysis and division rubrics remain in place. The implementation pass performed no deployment, production migration, production environment change, GitHub push, live payment or paid AI request. The subsequent user-authorized GitHub release preparation is documented below.

Remaining verification limits: live Edge Runtime completion and cleanup scheduling require a staging/live smoke test; Safari/iOS were not run directly (Chrome tests simulate denied browser storage); four pre-existing marketplace image lint warnings remain. These are not known failures in the remediated posing flow.

## Four confirmed defects

| Defect | Status and exact implementation files | Regression proof |
| --- | --- | --- |
| Backend-valid report rejected by website | Fixed. Website `lib/posing-contract.ts`, `lib/stage-analysis-schema.ts`, `lib/stage-analysis.ts`, `lib/stagelab-posing-gateway.ts`, `lib/stage-analysis-service.ts`, `lib/quick-analysis-repository.ts`; StageLab `supabase/functions/_shared/posing-contract.ts`, `supabase/functions/analyze-posing-video/posing-result.ts`, `contracts/posing-analysis-v1.ts`, `contracts/posing-analysis-v1.schema.json`. | `tests/posing-hardening.test.ts`: empty/missing cue, 4,000-character strength/correction, old/current fixtures. `tests/posing-recovery.test.ts`: identity saved before parsing; display recovery uses the same analysis. `scripts/verify-posing-contract.mjs`: actual producer to website reader. |
| Five-second frame timestamp beyond duration | Fixed. Website `lib/posing-runtime.ts`, `lib/posing-video-client.ts`, `lib/stage-analysis-schema.ts`; StageLab `supabase/functions/_shared/posing-runtime.ts`, `supabase/functions/elevare-posing-analysis/index.ts`, `src/features/posing-coach/model.ts`. | `tests/posing-hardening.test.ts`: 5.0, 5.1, 5.5, 5.51, 5.52, 5.9, 6, 10, 45 seconds plus floating-point boundaries. Shared verification executes the actual gateway manifest validator. |
| Denied sessionStorage hides paid result | Fixed. Website `lib/posing-analytics-storage.ts`, `components/stage-analysis/PosingAnalysisResultExperience.tsx`. | Getter, reader, writer, SecurityError, quota, unavailable storage and SSR cases in `tests/posing-hardening.test.ts`; actual browser rendering with blocked storage in `tests/integration/posing-browser.mjs`, including Complete Stage Analysis. |
| Transition displayed as 83/100 pose | Fixed. Website `lib/posing-result-presentation.ts`, `components/stage-analysis/PosingAnalysisReport.tsx`; StageLab `supabase/functions/analyze-posing-video/posing-result.ts`. | Historical fixture retains its canonical 83 but presentation returns null and no component scores. Browser tests confirm no 83/100. Current producer normalizes transition scores to null. |

Paths above are relative to the named repository (`website/` for website application paths).

## Architecture and contract alignment

The authoritative portable result reader and version constants live in StageLab `supabase/functions/_shared/posing-contract.ts`. The website vendors a byte-identical copy. Producer normalization returns through that contract; website result types alias it; the portable StageLab contract derives its payload fields from it. The verification command fails on copy, fixture or version drift.

Canonical v1 producer behavior remains: nullable integer scores 0–100; at most 8 pose segments, 9 components per segment, 4 strengths, 3 priority corrections, 4 transition/consistency/focus notes and 8 quality flags. Narrative fields permit empty strings and up to 4,000 characters. A missing/empty coaching cue deliberately becomes null. Missing optional historical arrays become empty arrays. Scores become unavailable for unusable footage. Unsupported classification becomes Unknown Pose with limited confidence, no pose score and no detailed components.

The reader accepts the prior v1 website envelope as well as current output, including longer historical arrays and old confidence capitalization. The current/prior shared fixtures are identical across both repositories. Prior prompt 0.2/0.3 reports need no regeneration, entitlement or AI call. Historical transition scores remain in saved data but are ignored in presentation. Extra transport properties are not copied into the display contract. Narrative strings are rendered as text, never HTML or fetched URLs; URL and technical timing text is removed from the display model.

No new analysis engine, alternative website prompt, storage bucket or job system was introduced. Shared score semantics, payment verification, atomic reservation, private media, HMAC/nonces, quotas and cleanup are retained.

## Short-video fix

Sampling uses the real duration, with no artificial six-second minimum. It spreads 4–16 ordered integer timestamps between safe inset endpoints. The final bound is `ceil(actualDurationMs) - 2`, capped again at the actual sampling interval. A five-second clip yields `[400, 1800, 3200, 4600]` milliseconds. All generated timestamps are strictly less than the actual duration. Website and gateway both reject out-of-range/unordered manifests.

The advertised and accepted range remains **5–45 seconds**. JPEG preparation still uses a 1,280-pixel maximum edge; shared AI image detail remains low.

## Paid-result resilience and recovery

The upload session/idempotency key are persisted before starting work. Website start intent is saved before its gateway request. The gateway atomically reserves an analysis before hashing/preprocessing, immediately returns its ID with HTTP 202 for background requests, and runs the existing pipeline through Edge Runtime `waitUntil`.

Status lookup can recover by analysis ID, scoped upload session or paid order. Status polling never invokes the provider or creates another reservation. The website saves remote identity before presentation parsing; a format problem keeps that identity, disables a new AI retry and offers a status check/support path. A valid saved website report opens without a gateway or AI call. Database updates guard against stale attempts overwriting newer progress.

A further recovery defect found during implementation was corrected: replayed payment activation and authorization callbacks now preserve posing progress and the original access deadline. This is scoped to Posing Analysis and Complete Stage Analysis. Revoked posing purchases cannot be reactivated by a replay, and payment identity must match. Standalone Quick Analysis behavior was not changed.

The UI distinguishes upload preparation, upload, reserved/validating/analyzing, slow completion, terminal failure/retry, format recovery and completion. Polls back off through 4, 8, 16 and 30 seconds, stop on terminal results, and pause after ten minutes. Check again reads the same job. Refresh and browser navigation recover the same association. Native status announcements are localized; explicit resume completion focuses the result heading.

| Deadline | Configuration |
| --- | --- |
| Browser media upload | 5 minutes per signed upload |
| Browser video metadata/seek | 20 seconds per decoder event |
| Website gateway request | 20 seconds; analysis itself is asynchronous |
| Website route | 60 seconds; static Next exports are checked against shared runtime configuration |
| Shared provider | 75 seconds default; existing override bounded to 1–120 seconds |
| Polling | 4–30 seconds; ten-minute horizon; slow message after approximately 45 seconds |
| Abandoned media | Existing two-hour stale threshold, plus cleanup scheduling delay |

The default source is `posing-runtime.ts`, mirrored across repositories. The browser allows gateway/network grace time. Deployment must give the Edge worker enough lifetime for preprocessing plus the configured provider deadline; this has not been verified against a live deployment in this pass.

## Result UX, verbosity and confidence

Default hierarchy: score and concise summary; biggest opportunity; up to three priority corrections; compact pose breakdown; strengths; next practice focus; collapsed consistency, transitions and video-quality/component details. Desktop uses bounded columns; mobile uses stacked cards.

Primary summaries are capped at 90 words. Priority cards show a short title, evidence and action, with longer evidence retained behind More context. Per-pose expansion includes strengths, issues, up to two corrections, optional cue, confidence and component details. Full canonical reports are not rewritten for these display limits. Exact duplicate advice is removed conservatively; distinct corrections are retained even when their opening sentences match. Practice focus is at most four items.

Known raw millisecond/frame patterns are removed from historical presentation text. Numeric pose scores represent execution; separate labels say High confidence, Medium confidence or Limited confidence. Transition sections explicitly say limited frame coverage and never show pose or component scores. The shared prompt disallows inferred exact speed, fluidity or hold duration from still frames. Footage quality reduces confidence or makes scores unavailable; it is not automatically poor execution.

Repeated poses receive localized first/final labels without changing their canonical identifiers. Uncertain classifications do not display detailed rubric claims. Native details/summary controls provide keyboard operation and expanded-state semantics.

## Localization

Verified: **en, es-419, pt-BR**. Pose/component labels, confidence, transitions, repeated poses, corrupt-video errors, known/unknown gateway errors, recovery states, expansion controls and website-controlled store CTAs are localized.

New posing purchases store a separate `posing_generation_locale`. The Quick Analysis generation flags continue controlling the physique component only. Posing defaults to the requested supported locale, independent of those flags; unsupported input locale falls back to English. An explicit posing-language flag set to false rejects checkout in that language rather than silently selling English output. Existing purchases with a null posing locale retain their saved original generation locale.

Intentional exceptions: canonical JSON keys/pose identifiers remain English, product/store brands remain their proper names, and historical coaching retains its originally generated language. This pass does not translate old private reports with AI. The global localization audit produced 1,060 heuristic candidates across the entire website; it is not a zero-untranslated-string certificate for unrelated features. Posing-specific label and browser checks passed.

## Privacy and retention

The StageLab media bucket remains private. Upload capabilities use non-upsert paths scoped to the order/session; result responses exclude media URLs. Frame read URLs remain short-lived (15 minutes). Video and frames are removed after terminal processing; failed cleanup remains recoverable by the existing scheduled cleanup. Stale uploads use the existing two-hour threshold. Browser object URLs are revoked after extraction.

Website result access expires 72 hours after the original paid activation. Expired reads deny access and clear the website result copy; the existing scheduled expiry function also clears expired result/context data. **This is not a promise that every backend copy is deleted after 72 hours.** StageLab structured results and accounting records have no new TTL in this pass and remain subject to the backend's separate retention/deletion process.

Local SQL checks confirm a private bucket, RLS, ordinary-user result isolation, service-only reservation, replay rejection and consumed-order enforcement. No storage policy or payment gate was relaxed. The bucket's shared per-object ceiling remains 180 MiB; website signed-capability metadata, client validation and gateway validation restrict each frame to 5,000,000 bytes and total frame count to 16 before provider use. This is an application/gateway boundary, not a new per-frame bucket policy.

Analytics only receives existing safe product/source/status/value parameters. It receives no frames, video, signed URLs, result text or scores. Storage and analytics exceptions are non-critical.

## Cost controls and version alignment

| Item | Intended release target |
| --- | --- |
| Default provider/model | OpenAI Responses / `gpt-5.6-terra`; existing `POSING_ANALYSIS_MODEL` override retained |
| Shared provider revision | `posing-provider-0.4.0` |
| Website/shared prompt | `posing-prompt-0.4.0` |
| Rubric revision | `division-rubrics-0.2.0` |
| Result schema | `posing_analysis_v1` |
| Gateway protocol | `elevare_posing_api_v1` with additive background/session-status support |
| Frames | 4–16, low image detail |
| Output tokens | 12,000 default; override 8,000–20,000; lower/invalid configuration falls back to 12,000 |
| Retries | No automatic provider retries; existing explicit attempts and atomic reservation remain |
| Website attempts | Existing maximum of four; backend rate/attempt enforcement retained |

Usage accounting is best-effort for success, HTTP failure with returned usage, malformed/incomplete JSON, timeout, abort and network failure. Missing usage stays null/unknown, never assumed free. Accounting callback failure cannot invalidate successful analysis. Each attempt remains a separate accounting row; resuming/status checks do not create provider usage. Malformed result objects are rejected while preserving returned usage telemetry.

The local mobile checkout began with substantial uncommitted work, including prompt 0.3 and rubric refinements, while its committed provider baseline was 0.2. Those revisions were not treated as deployed truth. This pass defines the explicit 0.4/0.2/v1 target, keeps the inspected shared rubric data, and applies scoped provider/contract/runtime/recovery changes. Mobile posing and integration contract checks pass. No mobile UI redesign or unrelated WIP was copied to the website. Production deployed revisions were not queried; release both gateway and mobile analysis function from the same reviewed shared-source revision.

## Verification results

- Website typecheck: PASS.
- Full website tests: **430 passed, 0 failed**.
- Posing tests: **82 passed, 0 failed**.
- Shared producer/consumer, fixture, version, gateway and provider checks: **41 passed**, no network/AI calls.
- Mobile `test:posing-coach`: PASS.
- Mobile `test:elevare-posing-contract`: PASS, including current/prior fixtures.
- Deno 2.9.6 check of both Edge Function entry points: PASS.
- Prebuild route/legal/data/sitemap checks: PASS using existing data snapshots and local localization flags; no remote data refresh.
- Production Next build: PASS, 2,862 generated pages.
- Postbuild localization/legal/content/SEO verification: PASS, 2,808 static HTML files and 1,386 sitemap URLs.
- Lint: PASS, zero errors; four existing unrelated marketplace image warnings.
- Local SQL: both additive migrations apply twice; reservation, durable association, reuse, finalization, replay, private storage, RLS and restricted permissions PASS. Auth/storage prerequisites are explicitly stubbed in the disposable database; this is not a full deployed Supabase smoke test.
- Responsive browser checks: **36 passed**. Chrome at 320, 390, 768 and 1,440px in all three locales; no horizontal overflow. Corrections begin around 679px at 390px for the representative English fixture, materially earlier than the audited approximately 1,880px. Also tested historical/long/sparse/unusable reports, blocked storage, corrupt video, localized gateway and terminal-failure recovery, slow/reload completion, polling horizon, explicit completion focus and Complete Stage Analysis.
- `git diff --check`: PASS in both repositories for this pass.

## Environment and deployment requirements

GitHub release preparation: use the matching `codex/posing-production-hardening` branches in `mlitfin123/Elevare-Landing-page` and `mlitfin123/stagelab-app`. The StageLab release was isolated from committed `302acb9` in a separate checkout. It includes the shared provider, canonical result contract, website gateway, telemetry and frame sampler. It excludes the unrelated mobile UI, subscription and frames-only/background mobile transport WIP. The committed mobile request protocol is retained. Only the reviewed bodybuilding display-name variants are adopted from the existing rubric changes; scoring weights and division rules remain unchanged. The isolated release separately passed all 41 website/shared contract checks, both mobile posing checks and Deno checks of both Edge entry points. Deploy from these reviewed release branches, not the original dirty mobile checkout. Publication does not apply either database migration or deploy either Edge Function.

1. Review/commit the scoped changes in both repositories. Website base: `913f4fb9a9399e65ed153de5e3c251c8b5b1a67b`; StageLab base: `302acb98cb0d6b5a6f2eb09266ec4c807a066845`. The StageLab working tree contains unrelated WIP; do not ship that entire app checkout blindly.
2. Apply website `20260912120000_website_posing_hardening.sql` to the website database and StageLab `202609121200_posing_provider_telemetry.sql` to the StageLab database. Both are additive. Do not backfill historical generation locale.
3. Deploy StageLab `elevare-posing-analysis` and `analyze-posing-video` with the same shared provider/result/runtime files before deploying the website. Keep the existing HMAC configuration and gateway JWT deployment settings. Confirm the deployed worker supports `EdgeRuntime.waitUntil`.
4. Website settings: keep the verified Stripe secret/webhook/prices, token pepper and secondary Supabase settings; set/verify `STAGELAB_POSING_BASE_URL`, `STAGELAB_ELEVARE_KEY_ID`, `STAGELAB_ELEVARE_INTEGRATION_SECRET`. Do not expose server secrets with `NEXT_PUBLIC_`.
5. Localization: `NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES=true` is required to expose localized routes. Existing indexing policy is unchanged. `ENABLE_POSING_ANALYSIS_ES_419_GENERATION` and `ENABLE_POSING_ANALYSIS_PT_BR_GENERATION` default true when omitted; explicit false disables new checkout in that language. Existing `ENABLE_QUICK_ANALYSIS_*` flags do not disable posing generation.
6. StageLab secrets/settings: retain `OPENAI_API_KEY`, Supabase service configuration, `ELEVARE_POSING_INTEGRATION_KEY_ID` and `ELEVARE_POSING_INTEGRATION_SECRET`; optional `POSING_ANALYSIS_MODEL`, `POSING_ANALYSIS_OPENAI_TIMEOUT_MS`, `POSING_ANALYSIS_MAX_OUTPUT_TOKENS=12000`. Keep current entitlement/rate/frame limits.
7. Cleanup readiness: set the StageLab repository variable `POSING_ANALYSIS_CLEANUP_URL` to the actual HTTPS `.../functions/v1/analyze-posing-video` endpoint. The workflow no longer assumes its prior hardcoded URL. Set matching `POSING_ANALYSIS_CLEANUP_SECRET` in StageLab Edge secrets and GitHub Actions secrets. Preserve the existing half-hour schedule and any deliberately configured database scheduler. Confirm a recent successful run returning `cleaned: true`, inspect cleanup counts and `cleanup_completed_at`, and confirm expired temporary objects are gone. No live configuration or recent-run check was performed here.
8. Verify the website expiry scheduler/`CRON_SECRET` separately from media cleanup. Keep access expiry and backend retention descriptions distinct.

## Manual production verification — one real paid analysis

- Use a valid, full-body Men's Physique video between 5 and 45 seconds; a five-second boundary clip is useful.
- Complete the intended Stripe purchase and confirm server-verified amount/product/order and successful authorization.
- Confirm one atomic reservation, an early analysis ID and durable order/upload association.
- Refresh while processing; verify the same ID resumes and only one provider invocation occurs.
- Confirm completion with the intended model/prompt/rubric/schema versions, token usage and cost telemetry.
- Confirm concise summary/opportunity/top corrections near the top, explicit confidence, no raw timestamps and no transition pose score.
- If testing Spanish or Portuguese, confirm stored posing generation locale and actual generated prose match the selected language.
- Confirm original video and frames are removed; check the scheduled cleanup's latest successful execution as well.
- Reopen the saved result in the checkout browser within the access window; confirm no new reservation, AI request or charge.
- Confirm access expiry and website-copy cleanup independently of backend structured-result retention.

## Files changed

The generated inventory below lists the release files. The prior audit report was already present and is excluded. Unrelated StageLab mobile WIP is excluded; the isolated release additionally includes the reviewed bodybuilding display-name mapping described above.

### Elevare website repository (37 files)

- [supabase/migrations/20260912120000_website_posing_hardening.sql](<C:/Users/markl/Desktop/Elevare_Landing_Page/supabase/migrations/20260912120000_website_posing_hardening.sql>)
- [website/.env.example](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/.env.example>)
- [website/app/api/stage-analysis/checkout/route.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/api/stage-analysis/checkout/route.ts>)
- [website/app/api/stage-analysis/posing/initialize/route.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/api/stage-analysis/posing/initialize/route.ts>)
- [website/app/api/stage-analysis/posing/start/route.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/api/stage-analysis/posing/start/route.ts>)
- [website/app/api/stage-analysis/status/route.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/api/stage-analysis/status/route.ts>)
- [website/app/globals.css](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/globals.css>)
- [website/components/stage-analysis/CompleteStagePriorities.tsx](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/CompleteStagePriorities.tsx>)
- [website/components/stage-analysis/PosingAnalysisReport.tsx](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/PosingAnalysisReport.tsx>)
- [website/components/stage-analysis/PosingAnalysisResultExperience.tsx](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/PosingAnalysisResultExperience.tsx>)
- [website/components/stage-analysis/StageAnalysisCheckout.tsx](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/StageAnalysisCheckout.tsx>)
- [website/components/stage-analysis/StageAnalysisViewTracker.tsx](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/StageAnalysisViewTracker.tsx>)
- [website/lib/i18n/posing-messages.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/i18n/posing-messages.ts>)
- [website/lib/posing-analytics-storage.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/posing-analytics-storage.ts>)
- [website/lib/posing-contract.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/posing-contract.ts>)
- [website/lib/posing-locale.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/posing-locale.ts>)
- [website/lib/posing-request-error.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/posing-request-error.ts>)
- [website/lib/posing-result-presentation.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/posing-result-presentation.ts>)
- [website/lib/posing-runtime.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/posing-runtime.ts>)
- [website/lib/posing-server-errors.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/posing-server-errors.ts>)
- [website/lib/posing-video-client.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/posing-video-client.ts>)
- [website/lib/quick-analysis-repository.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/quick-analysis-repository.ts>)
- [website/lib/stage-analysis-schema.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/stage-analysis-schema.ts>)
- [website/lib/stage-analysis-service.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/stage-analysis-service.ts>)
- [website/lib/stage-analysis.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/stage-analysis.ts>)
- [website/lib/stagelab-posing-gateway.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/stagelab-posing-gateway.ts>)
- [website/package.json](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/package.json>)
- [website/reports/posing-hardening-2026-09-12.md](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/reports/posing-hardening-2026-09-12.md>)
- [website/scripts/verify-posing-contract.mjs](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/scripts/verify-posing-contract.mjs>)
- [website/tests/fixtures/posing/current.json](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/fixtures/posing/current.json>)
- [website/tests/fixtures/posing/prior.json](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/fixtures/posing/prior.json>)
- [website/tests/integration/posing-browser.mjs](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/integration/posing-browser.mjs>)
- [website/tests/integration/posing-database.mjs](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/integration/posing-database.mjs>)
- [website/tests/posing-hardening.test.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/posing-hardening.test.ts>)
- [website/tests/posing-payment-replay.test.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/posing-payment-replay.test.ts>)
- [website/tests/posing-recovery.test.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/posing-recovery.test.ts>)
- [website/tests/posing-server-errors.test.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/posing-server-errors.test.ts>)

### StageLab shared repository (17 files)

- [.github/workflows/posing-analysis-cleanup.yml](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/.github/workflows/posing-analysis-cleanup.yml>)
- [contracts/fixtures/posing-analysis-v1-current.json](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/contracts/fixtures/posing-analysis-v1-current.json>)
- [contracts/fixtures/posing-analysis-v1-prior.json](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/contracts/fixtures/posing-analysis-v1-prior.json>)
- [contracts/posing-analysis-v1.schema.json](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/contracts/posing-analysis-v1.schema.json>)
- [contracts/posing-analysis-v1.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/contracts/posing-analysis-v1.ts>)
- [scripts/verify-elevare-posing-contract.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/scripts/verify-elevare-posing-contract.ts>)
- [scripts/verify-posing-coach.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/scripts/verify-posing-coach.ts>)
- [src/features/posing-coach/model.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/src/features/posing-coach/model.ts>)
- [supabase/functions/_shared/posing-contract.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/supabase/functions/_shared/posing-contract.ts>)
- [supabase/functions/_shared/posing-runtime.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/supabase/functions/_shared/posing-runtime.ts>)
- [supabase/functions/_shared/posing-telemetry.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/supabase/functions/_shared/posing-telemetry.ts>)
- [supabase/functions/analyze-posing-video/index.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/supabase/functions/analyze-posing-video/index.ts>)
- [supabase/functions/analyze-posing-video/posing-provider.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/supabase/functions/analyze-posing-video/posing-provider.ts>)
- [supabase/functions/analyze-posing-video/posing-result.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/supabase/functions/analyze-posing-video/posing-result.ts>)
- [supabase/functions/analyze-posing-video/posing-rubrics.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/supabase/functions/analyze-posing-video/posing-rubrics.ts>)
- [supabase/functions/elevare-posing-analysis/index.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/supabase/functions/elevare-posing-analysis/index.ts>)
- [supabase/migrations/202609121200_posing_provider_telemetry.sql](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/release-stagelab/supabase/migrations/202609121200_posing_provider_telemetry.sql>)

### Local verification evidence

- [Browser results](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/browser/results.json>)
- [Mobile layout preview](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/browser/result-en-390.png>)
- [Desktop layout preview](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/browser/result-en-1440.png>)
- [Website tests](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/website-tests.log>)
- [Posing tests](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/posing-tests.log>)
- [Shared contract/provider checks](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/contract.log>)
- [Local database checks](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/database.log>)
- [Deno checks](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/posing-hardening/deno-check.log>)
