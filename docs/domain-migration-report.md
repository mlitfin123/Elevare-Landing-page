# ElevareFit domain migration readiness report

**Status: NOT READY - MIGRATION BLOCKERS REMAIN**

The repository is ready to deploy, but the controlled migration is not complete until the external actions below are verified. A direct pre-cutover check on August 20, 2026 confirmed that `www.elevarefit.com` serves the site with valid TLS and the apex `.com` redirects to it, but the deployed HTML still declares `.org` canonicals and `www.elevarefit.org` currently returns a temporary `307`.

## Root configuration

- Old origin: `https://www.elevarefit.org`
- New origin: `https://www.elevarefit.com`
- Primary hostname: `www.elevarefit.com`
- Apex `.com`: configured in code for a path-preserving `308` to the primary hostname; live pre-cutover check also returned `308`
- `.org`: retained indefinitely; both hostnames are configured in code for path-preserving `308` redirects
- Trailing-slash behavior: preserved

## SEO implementation

- Central site origin and `metadataBase` now resolve to `.com`.
- Current canonicals, Open Graph URLs, website-hosted social images, Organization/WebSite JSON-LD, robots sitemap, sitemap index, and all seven segmented sitemaps generate from the central `.com` origin.
- Current active legal routes advertise `.com`; immutable historical legal contents retain their original bytes.
- Internal absolute links in the production export were scanned and contain no active `.org` website URLs outside historical archives.
- Existing workout deduplication, retired workout redirects, legacy calculator redirects, indexing filters, marketplace query noindex headers, and sitemap eligibility rules remain unchanged.

## Representative redirect map

These are the expected project-level responses after this release is deployed and all alternate hosts reach the project routing configuration.

| Old URL | Status | New URL |
| --- | --- | --- |
| `https://www.elevarefit.org/` | 308 | `https://www.elevarefit.com/` |
| `https://www.elevarefit.org/stagelab/` | 308 | `https://www.elevarefit.com/stagelab/` |
| `https://www.elevarefit.org/calculators/tdee-calculator/` | 308 | `https://www.elevarefit.com/calculators/tdee-calculator/` |
| `https://www.elevarefit.org/exercises/dumbbell-bench-press/` | 308 | `https://www.elevarefit.com/exercises/dumbbell-bench-press/` |
| `https://www.elevarefit.org/workouts/4-day-upper-lower-split/` | 308 | `https://www.elevarefit.com/workouts/4-day-upper-lower-split/` |
| `https://www.elevarefit.org/nutrition/the-cheesecake-factory/` | 308 | `https://www.elevarefit.com/nutrition/the-cheesecake-factory/` |
| `https://www.elevarefit.org/blog/alcohol-fat-loss-muscle-growth/` | 308 | `https://www.elevarefit.com/blog/alcohol-fat-loss-muscle-growth/` |
| `https://www.elevarefit.org/professionals/` | 308 | `https://www.elevarefit.com/professionals/` |
| `https://www.elevarefit.org/terms-of-service/` | 308 | `https://www.elevarefit.com/terms-of-service/` |
| `https://www.elevarefit.org/privacy-policy/` | 308 | `https://www.elevarefit.com/privacy-policy/` |

The route token preserves paths, and Vercel preserves unconsumed query strings. A live pre-cutover request confirmed path and query preservation. Retired route aliases may still require their existing second canonicalization hop; ordinary canonical URLs redirect in one hop.

## Email and legal integrity

**Existing `@elevarefit.org` email addresses were preserved.**

The operational address `mlitfin@elevarefit.org` remains in business, support, privacy, and legal configuration, active legal documents, StageLab legal documents, and `mailto:` links. No `@elevarefit.com` address was introduced.

No new legal acceptance version was created because no substantive legal text, displayed effective date, or acceptance language changed. The active clean-route generator now overlays only current canonical and Open Graph delivery metadata. Both August 20, 2026 archive files and SHA-256 manifest values remain byte-for-byte unchanged. StageLab legal routes and existing arbitration language were preserved.

## Auth and integrations

Implemented in the repository:

- New signup confirmation links explicitly target `https://www.elevarefit.com/account/`.
- Existing session persistence, sign-in, and sign-out behavior is unchanged.
- Waitlist CORS accepts both `.com` hosts and retains `.org` transition compatibility.
- Analytics remains opt-in; cookie revocation now clears both `.com` and legacy `.org` domain cookies.

Manual external configuration required:

- Set the Elevare Supabase Auth Site URL to `https://www.elevarefit.com` and allow the `.com` callback paths before removing `.org` compatibility.
- Deploy the updated `resend-waitlist` Edge Function to the existing waitlist Supabase project.
- Test signup confirmation and session restoration end-to-end on `.com`. This repository has no password-reset, magic-link, Google OAuth, or Apple-auth UI to migrate; configure provider consoles only if those flows exist elsewhere.
- No Stripe or StageLab Quick Analysis implementation exists in this repository. Any future commerce return URLs, webhooks, or public result routes should default to `.com`; merchant identity remains Elevare Fit LLC.

## External cutover checklist

1. Deploy this repository release after confirming Supabase Auth accepts `.com`.
2. Ensure all four domains remain attached to the Vercel project and that `www.elevarefit.org` reaches the project-level `308` instead of its current temporary `307`.
3. Verify the waitlist after deploying its Edge Function CORS change.
4. Confirm live `.com` canonicals, robots, sitemaps, structured data, auth, analytics consent, and representative redirects.
5. Add/retain both Google Search Console properties, submit the `.com` sitemap, then use Change of Address only after permanent redirects pass.
6. Add the `.com` site and sitemap in Bing Webmaster Tools if used.
7. Update controlled App Store, Google Play, social profile, shop, packaging, and future QR-code website links. Existing `.org` backlinks and QR codes remain valid through redirects.

## Validation results

- Tests: 131 passed, 0 failed
- TypeScript: passed
- Lint: 0 errors; 4 pre-existing `no-img-element` warnings
- Production build: passed; 982 static HTML files exported
- Sitemap validation: passed; 479 canonical/indexable URLs across 7 segmented sitemaps
- Canonical/Open Graph/robots/JSON-LD artifact audit: passed
- Redirect validation: 142 existing permanent route redirects plus 3 permanent alternate-host redirects passed
- Internal-link audit: 0 retired workout links and 0 legacy tool links
- Legal verification: 10 active routes and 2 immutable archives passed; archive files unchanged
- Auth validation: source and unit checks passed; live confirmation flow remains a required manual check
- SEO audit: no missing metadata, duplicate sitemap entries, non-200 export URLs, unexpected noindex pages, or orphaned hub pages
- Secret scan: 0 JWT-like or Resend-key-like values
- `git diff --check`: passed

## Traffic safety

- Old backlinks and bookmarks remain usable because `.org` is retained.
- Paths and query strings are preserved by the migration rules.
- The `.com` sitemap and canonical build are ready to deploy.
- The live old domains do not currently serve independent `200` copies, but one old hostname still uses a temporary redirect.
- Do not submit Search Console Change of Address until this release is live and every old hostname returns a permanent redirect.
