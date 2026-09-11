# Professional runtime publication

The authoritative website is `website/` in the Elevare repository. Elevare is operated by Elevare Fit LLC. The marketplace's secondary Supabase project remains authoritative; the separate admin application remains the review authority. This change is local and requires a reviewed migration and one code deployment before it can operate in production. Ordinary profile updates then require neither a build nor a deployment.

## Data and moderation

`marketplace_public_professionals_v3` is the only website public-profile read contract. It joins the existing profile, international and trust projections, explicitly selects safe fields, and requires verified approval, live publication, an active account, an existing auth account, no suspension and no deletion. Optional profile activity/deletion flags are honored when present. Trust is mandatory; failure does not fall back to a static snapshot or legacy credential claims. The v2 eligibility predicate is also narrowed for existing concierge RPCs.

Only the server's secondary-project service client can select this view. Authenticated website writes use the caller's bearer token, existing RLS, moderation guards and credential audit triggers. The atomic save RPC has invoker rights and fixed table/field allowlists; it cannot accept approval, verification, publication or administrative fields. It locks the owner's parent profile and checks `updated_at` before writing all sections in one transaction.

The existing moderation model unpublishes material edits; it does not keep a second approved copy visible. Bio, name/title, services, prices, languages, categories, location/jurisdiction, scope and credential edits continue through review. Editing a credential clears its prior verification through the existing guard. The existing availability/accepting-clients and profile-information-confirmation RPCs are the permitted immediate changes. Full-editor updates still require review even when they contain otherwise low-risk fields. Attested submission calls the existing attestation RPC inside the same transaction, after preserving the existing account locale update.

Emails, private phones, client data, auth metadata, moderation notes, evidence/storage paths, background-check details, insurance documents, exact coordinates and postcodes are absent from the public contract. Professional and service IDs remain because existing save, inquiry and reporting actions need them. Account/auth/location/credential UUIDs are omitted or replaced with display-local identifiers. Authenticated raw-table policies are preserved for existing owner/inquiry workflows; anonymous raw-profile access and direct legacy public-view access are revoked. This does not replace the separate full-schema RLS audit required before release.

## Cache and propagation

`lib/marketplace.ts` uses server-side Supabase reads inside `unstable_cache`, with one-hour retention and React render deduplication. It caches the collection and individual slugs separately. All professional-dependent rendering is runtime SSR, including the homepage module. Unrelated catalog/legal/tools pages retain their static rendering. The root layout has no global dynamic/no-store setting.

A lightweight, uncached `marketplace_publication_version` RPC chooses an immutable versioned cache key before each public read. Each committed public change increments its profile revision and the collection generation in the same database transaction. This closes a race observed under local **production Next.js 16.3.1**: a deferred purge or older in-flight cache fill could otherwise make the immediately following request stale. A fresh request cannot select an old generation after a committed change. The underlying Supabase fetch is uncached; the outer tagged cache holds the public-safe result. No stale fallback is returned if the version lookup or public query fails.

The version lookup also processes indexed, bounded trust expirations. It specifically checks a requested profile even if a larger expiration batch is pending. Expiration does not need a browser poll or an external job to become visible. The worker additionally drains expirations proactively.

Central tags in `professional-cache.ts`:

| Tag | Purpose |
| --- | --- |
| `professional:{id}` | One stable professional |
| `professional-slug:{slug}` | Current and prior profile URLs |
| `professionals` | Shared collection used by directory, filtering, search, matching, cards and related profiles |
| `homepage-professionals` | Homepage professional data |
| `professionals-sitemap` | Current professional sitemap data |
| `professionals-category:{slug}` | Affected old/new category membership |
| `professionals-location:{key}` | Affected old/new coarse location membership |

Category/location tags are centralized invalidation targets; the current readers share the collection cache rather than maintaining separate copies per filter. Location filtering has no separate location-page route. Profile metadata and structured data use the same versioned record as the page.

| Fields / operation | Impact |
| --- | --- |
| Bio, public summary, specialties, languages, scope, service description | Profile + collection: existing client search/matching and related cards consume these fields; material edits also change eligibility |
| Pricing, service mode, active services, photo, display name/title | Profile, card/search/matching collection, homepage; review rules preserved |
| Accepting clients, availability, profile confirmation | Profile, ranking/filter/matching collection, homepage; immediate existing RPCs |
| Categories | Above plus old/new category tags and all three locale category paths |
| Locations/service areas | Above plus old/new coarse location tags; shared filter results |
| Approval, rejection, live status, suspension, deactivation, deletion | Every professional-containing surface, aliases and sitemap eligibility |
| Credential/identity/background/insurance verification or expiration | Public trust and any eligibility/ranking/card effects; no private evidence payload |
| Slug | Stable profile tag, all previous/current slug paths and sitemap |
| Internal notes / unrelated private fields | No public cache event; parent concurrency token still changes for profile edits |

Because the existing directory/matching API returns full public records, public searchable changes correctly expire the shared collection. Private-only edits do not. The target builder also supports individual-only events for future genuinely profile-only fields. No layout-wide purge is used.

## Durable external events and endpoint

Database triggers cover profiles, accounts/auth confirmation/deletion, services, categories, locations, matching fields, credentials, identity/background checks and insurance. They run after successful database changes, preserve old/new routing membership, and coalesce into one outbox row per professional. Related changes advance the same parent edit token. Reparented related rows invalidate both professionals. Outbox rows deliberately survive deletion as tombstones; slug history reserves old URLs and only redirects to a currently eligible public profile.

Website mutations attempt revalidation after their transaction succeeds. Admin/mobile/background writers need no browser callback: normal authorized writes fire these same triggers. The server derives targets from the current authoritative outbox, never from caller-provided public-state claims.

`POST /api/internal/professional-revalidation/` accepts exactly:

```json
{"professionalId":"<stable professional UUID>","eventType":"profile_changed"}
```

`trust_expired` is also a recognized notification type; current database state determines the result. The request must use `Content-Type: application/json` and `Authorization: Bearer <PROFESSIONAL_REVALIDATION_SECRET>`. No arbitrary tags or paths are accepted. Secrets must be at least 32 characters; authentication compares fixed-size SHA-256 digests with constant-time equality. Bodies are streamed with a 1 KiB limit, including requests without Content-Length. A database-backed budget permits 120 authenticated deliveries/minute across server instances. Missing configuration fails closed (503), bad credentials return 401, invalid payloads 400, exhausted budget 429, retryable failure 503. No full payloads or private values are logged.

`professional-publication-delivery` is a dormant trusted Edge Function that processes up to 25 pending professionals per run, with a 15-second request timeout and redirect rejection. It acknowledges the exact delivered revision **after the entire website HTTP response succeeds**, including Next's deferred cache flush. Newer revisions cannot be acknowledged by an older delivery. Duplicates repeat a safe purge, never restore data. Failed requests leave the event pending. The website's own mutation/retry path leaves events available for this worker to acknowledge.

## Environment and manual rollout

Website server variables:

* `SECOND_SUPABASE_URL` and `NEXT_PUBLIC_SECOND_SUPABASE_URL`: the same marketplace project origin; a mismatch is rejected.
* `NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY`: that project's browser/user-scoped key.
* `SECOND_SUPABASE_SERVICE_ROLE_KEY`: server-only key for the restricted view/outbox RPCs; never use a NEXT_PUBLIC prefix.
* `PROFESSIONAL_REVALIDATION_SECRET`: a new cryptographically random secret of at least 32 characters, server-only.

The established secondary Supabase config helper remains in use. No primary nutrition/training project is substituted for a missing marketplace configuration. Configure the same marketplace project in preview/staging builds when exercising mutations; never pair a preview website with production data for tests.

Release sequence (not performed by this task):

1. Reconcile the migration ledger and prerequisite schema in an isolated staging project using `docs/deployment-and-migration-safety.md`. The base schema is externally maintained; do not blindly replay the repository into production. Verify the decision-ready, retention, trust, international and concierge prerequisites and schema-owner privileges needed for the auth trigger.
2. Rehearse `20260910120000_professional_runtime_publication.sql` against that complete staging baseline. Test the real admin workflow, owner/outsider RLS and attested review submission. This task's local contract fixture is not a substitute for that baseline.
3. Configure website server variables, apply the reviewed migration, then deploy the website code together with removal of the two old public snapshot files. Existing static deployment behavior only changes once this code is deployed. Avoid a mixed rollout where old browser versions still write without the new editor token.
4. Deploy `professional-publication-delivery` in the same marketplace project. Its config has `verify_jwt = true`. Set Edge Function secrets `PROFESSIONAL_REVALIDATION_ORIGIN` to the canonical HTTPS website origin and `PROFESSIONAL_REVALIDATION_SECRET` to the website's value. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. Configure a trusted scheduler, initially once per minute, to POST `{}` to `https://<marketplace-ref>.supabase.co/functions/v1/professional-publication-delivery` with a server-held `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`. Store scheduler credentials in the platform secret store/Vault; do not put them in client code, logs or a committed migration. Failures retry on the next tick. For a backlog above 25, use bounded extra invocations while respecting the website's 120/minute budget.
6. A trusted database webhook can wake this same drainer for lower latency, but is optional: it must use the same protected function endpoint and server credential. The worker ignores webhook row contents. No production webhook or schedule was created here. Direct trusted server delivery to the website endpoint is also supported.
7. Verify a real staging approved professional changes availability, keeps its review rules, and appears updated on a fresh public request with unchanged build ID. Inspect outbox lag and safe failure counts. Only then follow the normal release approval process.

The versioned read gate provides fresh requests even while the delivery worker is down; the worker performs proactive purge and durable acknowledgement. The existing daily Vercel refresh workflow may still serve nutrition/training generated datasets. Professional updates no longer depend on that deploy hook.

## Failure and dashboard behavior

* Failed transaction: rollback all profile sections and events; return an error; retain unsaved input.
* Stale version: HTTP 409, localized conflict state and a reload-current-profile action; never overwrite a newer admin/tab edit.
* Successful transaction but failed invalidation: return the confirmed saved record plus `propagation: delayed`; update only the affected dashboard section and offer an invalidation-only retry. Do not repeat the content write or roll it back.
* Network/5xx with uncertain commit: ask the user to reload/review before resaving. Do not delete uploaded evidence/photo files that may have committed. Preserve trust evidence history.
* Outage, duplicate or out-of-order delivery: retain/coalesce the outbox; deliver the current revision; acknowledge only that revision. Old notifications do not carry content to restore.
* Public read/version failure: fail closed, without serving a static private/unapproved fallback.

The editor applies server-confirmed fields and updated status/version, disables controls during save, maintains unsaved warnings, and announces saving, pending review, conflict and propagation failure through live regions. English, Latin American Spanish and Brazilian Portuguese keys have parity and an English fallback. Already-open public pages update on refresh/navigation; no new polling or Realtime connection was added.

## SEO and cost

Profiles, category results, homepage modules, metadata/Open Graph, JSON-LD and the compatibility JSON route use current public data. Unknown/ineligible/deleted profiles return 404. Old slugs permanently redirect (308) only while their owner has a current eligible profile. The professional sitemap is a runtime route using the existing canonical/localized eligibility rules; unrelated sitemap children remain generated. SEO audits now fetch professional content from a production server rather than requiring an obsolete snapshot file.

A warm collection request costs one small indexed version RPC and serves the cached public result. A profile page also uses the collection for related professionals, so normally uses two deduplicated version checks. Cache misses read the safe projection in pages of 500; no exact marketplace count is queried. Each public mutation advances one shared generation row, so very high write volumes should be load-tested for contention. Old cache generations expire after one hour and targeted purges reduce retention. Outbox history arrays retain earlier slugs/categories/locations for reliable replay; monitor growth for frequently edited profiles. No live Vercel billing estimate or distributed-region benchmark was performed.

## Reproduce local verification

All fixture credentials are deliberately synthetic and must never be used in production. Ports are loopback-only: database 55432, PostgREST 55433, prefix adapter 55434, production Next 3100. The disposable resources are named `elevare-runtime-test-db`, `elevare-runtime-test-rest`, network `elevare-runtime-test`.

Create those resources using `node tests/integration/start-local-database.mjs` from `website/`, then run:

```text
node tests/integration/setup-local-database.mjs
node tests/integration/fixture-api.mjs             # separate terminal
npm run prebuild
node tests/integration/run-next.mjs build
npm run postbuild
node tests/integration/run-next.mjs start           # separate terminal
npm test
npm run typecheck
npm run lint
npm run localization:audit
node tests/integration/professional-dashboard.mjs
node tests/integration/setup-local-database.mjs     # browser test leaves a draft
npm run test:runtime
```

`setup-local-database.mjs` refuses any container except the explicitly named test image, resets only its disposable public schema, and applies the actual new migration. The test fixture imports existing repository guards/views/RPCs, but synthesizes the missing historical baseline. It deliberately rejects attested submission until the complete legal baseline is provided. The Chrome test needs installed Chrome and Playwright (`PLAYWRIGHT_PACKAGE_JSON` can point to a local package). Only auxiliary analytics/empty account summaries are stubbed; owner profile reads and writes use the real local Next API, JWT, PostgREST and Postgres.

`test:runtime` never invokes a build/deploy command and asserts both BUILD_ID and its timestamp are unchanged. It intentionally deletes the synthetic profile at the end. Reseed the disposable fixture before running it again or running `SEO_RUNTIME_ORIGIN=http://127.0.0.1:3100 npm run seo:audit` (use the equivalent environment assignment in PowerShell). Detailed results are in `reports/professional-runtime-integration.json` and `reports/professional-dashboard-browser.json`.

Local production-cache and contract-RLS proof does not certify the externally maintained complete staging schema, deployed Vercel distributed caches, production environment values, separate admin/mobile code, or live scheduled delivery. Those remain rollout checks, not hidden passing assertions.
