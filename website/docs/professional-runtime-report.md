# Professional runtime publication — final report

Scope: authoritative checkout `C:\Users\markl\Desktop\Elevare_Landing_Page`, active `website/` application. This checkout already contained substantial uncommitted marketplace work; it was preserved. This report describes the runtime-publication changes, not ownership of the entire Git diff.

Release follow-up, September 11, 2026: the user confirmed that all Supabase migrations were applied and subsequently authorized a GitHub push. Before that push, dependency checks identified advisories in Next.js, sharp and js-yaml; compatible patches updated them to 16.3.3, 0.35.4 and 3.15.2 respectively. The full npm audit now reports zero vulnerabilities. All 332 unit tests, typecheck, lint (four existing image warnings), production build, postbuild artifact checks and all 15 disposable-database runtime scenarios passed again. The new tested build ID is `dMAqcDJOx1M1Kf7Sg1XEU`, unchanged throughout runtime mutation tests. Generated sitemaps preserve the previously committed localized indexing coverage; postbuild checked 1,386 static sitemap URLs. Browser evidence below remains from the earlier 16.3.1 verification. Remote settings, email delivery and deployed production behavior were not independently certified by these local checks. The numbered implementation report below records the original work and its boundaries.

1. **Verdict — PASS WITH MINOR ISSUES, for local implementation and production-mode verification.** The allowed-update/no-rebuild acceptance test passes against an actual disposable database and production Next server. Four pre-existing image lint warnings and broader heuristic content/localization findings remain. Complete staging schema, external admin/mobile integration and deployed Vercel verification remain release prerequisites; production readiness is not asserted from the local fixture alone.

2. **Exact root cause.** `prebuild` generated professional JSON from secondary Supabase. Server pages read that immutable file; client components fetched its static public copy. Profile slugs were enumerated at build time with `dynamicParams = false`, and the professional sitemap was generated from the same snapshot. A failed generator could silently preserve an older snapshot. There was no working mutation-to-cache invalidation path.

3. **Previous flow.** Supabase edit → database record changes → next deployment's prebuild reads records → generated JSON → static page/slugs/metadata/sitemap and browser JSON. Approval rules could also intentionally hide changes; those were not the cache defect.

4. **New flow.** Authorized transaction → owner-confirmed record and version returned → database publication trigger updates durable revision/generation/routing history → website attempts targeted purge → fresh SSR/API request selects the current database version and cached restricted projection. External delivery drains/acknowledges pending purges. No mutable professional file is a runtime fallback.

5. **Authority.** Secondary marketplace Supabase; service-only `marketplace_public_professionals_v3` backed by existing authoritative tables and trust views. Both server and browser project URLs must agree. Production environment values were not inspected.

6. **Draft/publication model.** Existing unpublish-on-material-change workflow retained, without a second revision system. Full-editor writes are now one transaction with existing RLS/guards and the existing attested-submission RPC. Pending/unapproved content disappears from public discovery rather than replacing an approved record in public HTML.

7. **Immediate changes.** Existing accepting-client/availability and profile-information-confirmation RPCs. Dashboard applies their confirmed value/version without page reload or refetching all metrics. Temporary unavailability does not itself remove an otherwise eligible profile.

8. **Review-required changes.** Existing material triggers continue to cover name/title, biography, services/prices, languages, categories, location/jurisdiction, scope and credential claims. Full-editor submission remains reviewed. Credential edits reset verification and preserve audit/evidence history. Professionals receive no new approval/publication powers.

9. **Cache tags.** Central stable professional, current/prior slug, collection, homepage, sitemap, category and coarse location tags. Profile and collection records are cached separately; category/location consumers currently share the collection cache. Routes are purged by concrete path for English, Spanish and Portuguese; no root-layout purge is used.

10. **Field-to-cache map.** Public bio/search/matching fields affect individual plus shared collection; price/service/photo/name affects cards and collections; availability affects filters/ranking/matching; category/location changes add old/new membership targets; eligibility/trust changes affect all relevant professional surfaces and sitemap; slug changes affect old/new canonical routes; private notes cause no public event. The complete table and reasons are in `professional-runtime-operations.md`.

11. **Revalidation.** Post-commit `revalidateTag(tag, { expire: 0 })` and targeted `revalidatePath`, supported by installed Next 16.3.1. A transactional database generation chooses immutable cache keys to close an observed production-mode deferred-purge race. React cache deduplicates reads during a render. Clock-based trust expiration also advances versions without relying on a worker.

12. **Admin/mobile/external origins.** Database triggers cover authoritative tables regardless of writer. A coalescing outbox retains routing history and deletion tombstones. The trusted Edge Function drains current events; its HTTP response acknowledgement is revision-conditional, so duplicates/out-of-order notifications never restore stale content. No separate admin source was available to edit or execute.

13. **Endpoint security.** Server-only secret, fixed-size digest comparison, strict two-field event shape, known event types, UUID validation, JSON content-type and streamed 1 KiB limit, database-backed 120/minute budget, derived paths/tags only. Missing configuration fails closed. The worker uses a fixed HTTPS origin, rejects redirects and authenticates with a server-held credential.

14. **Failure/retry.** Failed transaction rolls back all sections/events. Stale `updated_at` returns 409 and a narrow reload action. Stale tokens use an application SQL error, not a retryable serialization error. Successful writes with failed propagation return confirmed data plus a localized delayed state; retry only purges. Unknown network/5xx outcomes retain possibly committed uploads and ask for reload/review. Worker outages leave pending events; exact-revision acknowledgement cannot lose a newer event. Public read errors have no stale snapshot fallback.

15. **Migration.** `supabase/migrations/20260910120000_professional_runtime_publication.sql`: restricted v3/updated v2 eligibility and grants; publication outbox, generation, slug history and rate budget; table/auth triggers; expiration/version/delivery/slug RPCs; atomic owner save RPC; duplicate historical credential-trigger alias removal. It was applied only to the disposable local container. Test-only schema/seed/failure fixtures are explicitly separate from product migrations.

16. **RLS/privacy.** Mutations retain caller JWT and invoker RLS. Public views/outbox/version helpers are service-only; raw anonymous professional reads are revoked. Public projections exclude private evidence, exact location, client/account/auth data and internal notes. Mandatory public trust replaces legacy credential fallbacks. Unused submission/review/identity placeholders were removed from serialized public records; constant approved eligibility and explicit public trust badges remain. Existing authenticated owner/inquiry policies are preserved and require full-baseline staging audit.

17. **SEO.** Current eligible records drive SSR content, metadata, Open Graph and JSON-LD. Ineligible profiles return 404 and leave public JSON/sitemap. Historical slugs return 308 only to a currently public canonical profile. Runtime professional sitemap retains existing category/localized indexing rules; unrelated sitemap children remain generated. Artifact audits recognize real compiled runtime routes, and SEO audit requires a running production origin.

18. **Cost.** Warm collection: one small indexed version RPC plus cached projection. Profile pages also load related collection data, normally two deduplicated version lookups. Projection misses are paginated in batches of 500, retained for one hour and purged on demand. No site-wide no-store, polling, realtime-per-card, exact counts or root dynamic layout. Only professional-dependent pages, including homepage, become runtime SSR. Shared generation-row write contention and long-lived routing-history arrays should be monitored at scale; no live billing estimate was made.

19. **Tests.** Added seven runtime unit/security/locale contracts; real production cache/RLS/mutation tests; Chrome desktop/mobile dashboard and full-editor checks; explicit disposable database and failure fixtures. Existing generator/static-parameter assertions were updated to the runtime contract. Existing moderation, localization, legal, concierge, matching, trust and other unit tests remain active. The privacy check still rejects real private fields; the constant public `approved` eligibility flag is permitted, while other moderation states are rejected.

20. **Verification commands/results.** Commands run from `website/` unless indicated:

    | Command | Result |
    | --- | --- |
    | `npm test` | 332 passed, 0 failed, 0 skipped |
    | `npm run lint` | 0 errors; 4 existing `no-img-element` warnings |
    | `npm run typecheck` | Passed |
    | `npm run localization:audit` | Completed; 1,163 repository-wide heuristic candidates, not a clean translation certification |
    | `npm run prebuild` | Passed route/legal/catalog/sitemap prerequisites; professional generator removed |
    | `node tests/integration/run-next.mjs build` | Optimized production build with explicit disposable local environment |
    | `npm run postbuild` | Legal routes, localization HTML, content audit and production artifact checks pass; 2,805 unrelated/static HTML artifacts; 488 generated sitemap URLs; 142 permanent legacy redirects |
    | `node tests/integration/setup-local-database.mjs` | Actual final migration applies to disposable contract schema; production never targeted |
    | `node tests/integration/run-next.mjs start` | Next 16.3.1 production server on loopback port 3100 |
    | `node tests/integration/professional-dashboard.mjs` | Chrome: real save, confirmed draft, warning lifecycle, conflict/reload, delayed propagation/retry, live-region presence, focus and mobile overflow checks |
    | `npm run test:runtime` | Actual Supabase/PostgREST RLS and mutation path, restricted projection, cache propagation, expiry, deletion, conflicts, failure/retry and unchanged BUILD_ID |
    | `$env:SEO_RUNTIME_ORIGIN = 'http://127.0.0.1:3100'; npm run seo:audit` | Passed: 491 sitemap URLs, 0 unresolved routes, 1 eligible synthetic public profile, no private-field or professional rendering findings |
    | `git diff --check` (repository root) | Passed; Git emits existing LF/CRLF conversion notices |

    The build helper invokes the repository's Next production build command with synthetic local variables; lifecycle `prebuild`/`postbuild` checks were invoked separately. No existing standalone browser E2E runner was present; the new Chrome suite complements the established Node test suite. Local test logs are in ignored `.tmp/`; durable proof is in `reports/professional-runtime-integration.json` and `reports/professional-dashboard-browser.json`.

21. **Environment.** Matching secondary Supabase server/browser URLs; secondary anon key; server-only secondary service-role key; server-only `PROFESSIONAL_REVALIDATION_SECRET` of at least 32 random characters. Edge-only `PROFESSIONAL_REVALIDATION_ORIGIN` points to the canonical HTTPS website and uses the same secret. Existing localization rollout flags remain unchanged.

22. **Worker/webhook setup.** Local Edge Function/config added, dormant. After approved release, configure its server secrets and a trusted scheduler POST once/minute using a stored service-role bearer. It drains 25 events/run, with retries on later runs. A database webhook may optionally wake the same protected drainer; no webhook is necessary for next-request correctness because versioned reads observe committed changes. Exact steps are in the operations guide.

23. **Release order.** Reconcile existing migration history; rehearse on the complete staging schema; verify environment/project consistency; apply reviewed migration; deploy website with the old public JSON/XML removed; configure/deploy/schedule trusted delivery; run staging admin/owner/attestation/public-freshness checks. One initial code deployment is required. No release action was taken here.

24. **Exact task-touched files.** Paths below are repository-relative. Several existed as pre-existing uncommitted work; only runtime-publication edits are attributable to this task.

    ```text
    .gitignore
    README.md
    docs/deployment-and-migration-safety.md
    supabase/config.toml
    supabase/migrations/20260910120000_professional_runtime_publication.sql
    supabase/functions/_shared/deliver-professional-publication.ts
    supabase/functions/professional-publication-delivery/index.ts
    website/.env.example
    website/package.json
    website/app/[locale]/[[...slug]]/page.tsx
    website/app/professionals/[slug]/page.tsx
    website/app/api/internal/professional-revalidation/route.ts
    website/app/api/professional-publication/route.ts
    website/app/marketplace-data.json/route.ts
    website/app/sitemaps/professionals.xml/route.ts
    website/components/marketplace/ProfessionalProfileEditor.tsx
    website/components/marketplace/ProfessionalRetentionDashboard.tsx
    website/lib/marketplace.ts
    website/lib/marketplace-types.ts
    website/lib/marketplace-helpers.ts
    website/lib/marketplace-public-mapper.ts
    website/lib/marketplace-server.ts
    website/lib/professional-cache.ts
    website/lib/professional-request.ts
    website/lib/professional-revalidation.ts
    website/lib/professional-publication-client.ts
    website/lib/i18n/professional-publication-messages.ts
    website/scripts/generate-marketplace-data.ts
    website/scripts/generate-sitemaps.ts
    website/scripts/seo-audit.ts
    website/scripts/verify-legal-routes.ts
    website/tests/legal-readiness.test.ts
    website/tests/professional-localization.test.ts
    website/tests/trust-safety.test.ts
    website/tests/professional-runtime.test.ts
    website/tests/integration/auth-helpers.sql
    website/tests/integration/failure-fixture.sql
    website/tests/integration/seed.sql
    website/tests/integration/prepare-database.mjs
    website/tests/integration/setup-local-database.mjs
    website/tests/integration/start-local-database.mjs
    website/tests/integration/fixture-api.mjs
    website/tests/integration/local-environment.mjs
    website/tests/integration/run-next.mjs
    website/tests/integration/professional-runtime.mts
    website/tests/integration/professional-dashboard.mjs
    website/docs/professional-runtime-audit.md
    website/docs/professional-runtime-operations.md
    website/docs/professional-runtime-report.md
    website/reports/professional-runtime-integration.json
    website/reports/professional-dashboard-browser.json
    website/reports/professional-dashboard-desktop.png
    website/reports/professional-dashboard-mobile.png
    website/reports/content-quality-report.json [regenerated by required audit]
    website/reports/localization-untranslated.txt [regenerated by required audit]
    website/public/sitemaps/calculators.xml [regenerated]
    website/public/sitemaps/exercises.xml [regenerated]
    website/public/sitemaps/nutrition.xml [regenerated]
    website/public/sitemaps/site.xml [regenerated]
    website/public/sitemaps/workouts.xml [regenerated]
    website/public/marketplace-data.json [removed; runtime route replaces it]
    website/public/sitemaps/professionals.xml [removed; runtime route replaces it]
    ```

25. **Remaining risks/limits.** The historical database baseline is externally maintained. Local fixtures reuse actual guards/views but synthesize missing tables; the full legal attestation function is deliberately not faked as successful. Complete staging attestation, photo/evidence storage integration, concierge/consultation RLS dependencies, admin/mobile code and deployed multi-region Vercel delivery need release rehearsal. Browser tests stub only auxiliary analytics/empty account summaries; trust owner-summary UI is outside the fixture. Human translation review, four existing image warnings and site-wide content/localization audit candidates remain. No production credentials/data or external deployment configuration was validated.

26. **No-rebuild proof.** The production integration test requests an approved public profile, saves allowed availability through the actual authenticated website RPC path, executes actual cache invalidation, and requests the profile/collection/localized surfaces again. Updated data appears. It separately confirms draft biography remains absent from public HTML/metadata/JSON/sitemap, and checks revocation, expiration and deletion. Both `.next/BUILD_ID` content and mtime are asserted unchanged across all 15 integration scenarios; the test contains no build or deployment command. The final tested build ID is `lcSSdho4Xz8F2QBzc0rt3`.

27. **Original implementation boundary.** During the original runtime implementation, nothing was pushed, deployed, migrated or modified in production. No production webhook/schedule was activated. Only the local working tree and explicitly named disposable Docker services/test data were changed; all original user work was preserved. The subsequent user-authorized GitHub release is covered by the follow-up above.

See [operations and reproducible setup](professional-runtime-operations.md), [preimplementation audit](professional-runtime-audit.md), and [machine-readable production proof](../reports/professional-runtime-integration.json).
