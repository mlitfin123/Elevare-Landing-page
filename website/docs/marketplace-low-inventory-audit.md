# Marketplace low-inventory audit

Audit date: 2026-09-10

This audit was completed before the low-inventory implementation. It covers the public directory, category/profile routes, homepage marketplace entry points, matching and concierge flows, generated Supabase data, SEO, localization, analytics, and the existing test suite.

## Current public supply

A live public-page check on `2026-09-10` confirmed one approved, active, public professional. That professional is accepting clients, serves clients online from Maceio, Alagoas, Brazil, and appears in Personal Training, Bodybuilding & Physique, Running & Endurance, and Sports Performance. There is no verified public Miami inventory in the live output, so the UI must not imply that Miami professionals are currently available.

The checked-in fallback at `website/.generated/marketplace-data.json` is older and contains zero profiles. It must not be treated as a current inventory report. Production builds refresh this generated artifact from Supabase using server-only configuration and preserve the last valid artifact when a fetch is unavailable.

## What users see before this change

1. The directory server passes eligible professionals to `MarketplaceDirectory`, but the client hides the profile grid until a category route or meaningful search is active. This makes a marketplace with real supply look empty on first load.
2. The first eight category cards are selected from the full taxonomy. The two strongest categories are retained, but the remaining cards are randomized in the browser and may give zero-supply categories the same prominence as categories with live professionals.
3. Category routes show profiles immediately and public profile routes render only records that pass the approved, active, public eligibility predicate.
4. Search filters are URL-backed and removable, but active constraints are not summarized as a clear set of filter chips.
5. Empty filtered searches display broader groups and the existing guided matching form. The online fallback can appear even when the visitor explicitly selected in-person service, which is an unsafe silent relaxation.
6. The completely empty state has access to the existing guided matching/concierge form and Pro application route, but the initial hidden-results state reads like an instruction to search rather than an honest network-building state.
7. Cards already show real public photos or a generic initials fallback, name, title, service area/mode, pricing context, specialties, availability, and limited trust signals. Direct consultation is disabled when a professional is not accepting requests.
8. Progressive display is present in batches of six, but all public profile records, including biographies, services, and credentials, are sent to the browser for the directory.
9. Marketplace-wide counts remain hidden below the existing 500-profile threshold. Search-result counts are functional. No fake profiles, ratings, reviews, views, saves, bookings, testimonials, or activity claims were found.
10. Public data is generated at build time from `marketplace_service_categories_v1`, `marketplace_public_trainer_profiles_v2`, `marketplace_public_trainer_international_v1`, and the optional public trust view. The generator uses server-only credentials and preserves the last valid snapshot on fetch failure.
11. The approved/active/public predicate is enforced again in application code. Existing migrations expose narrowed public views and guarded concierge RPCs. Client and concierge records remain private. No new database policy is required for this UI correction.
12. Filtered query URLs receive `noindex, follow`; private account, matching, request, and authentication routes are noindex. Empty categories are excluded from the sitemap while useful category editorial pages remain reachable.
13. English, Latin American Spanish, and Brazilian Portuguese share the same marketplace component and translation map. New low-inventory strings need parity in that existing map.
14. Analytics are consent-aware, but directory/search events currently send exact result counts and filter values. These should be replaced by coarse result bands and boolean/non-sensitive dimensions.

## Capability classification

| Capability | Classification | Audit result |
| --- | --- | --- |
| Public eligibility | Complete and connected | Only approved, active, public records reach public routes. |
| Initial results | Present but disconnected | Eligible records are loaded but hidden until search. |
| Search and URL filters | Partially implemented | Filtering works; active filters and safe relaxation actions need improvement. |
| Category supply awareness | Misleading | Zero-supply categories can receive equal prominence and client-side random order. |
| Location handling | Partially implemented | Public city/service-area filtering exists; there are intentionally no generated location landing pages. |
| Online fallback | Unsafe | It may silently relax an explicit in-person requirement. |
| Card content | Complete and connected | Real public fields and a generic non-person fallback avatar are used. |
| Consultation requests | Complete and connected | Existing guarded flow is preserved and unavailable professionals cannot receive direct requests. |
| Guided matching | Complete and connected | Existing authenticated progressive flow is reusable. |
| Concierge | Complete and connected | Existing idempotent, consent-based case system is reusable; no duplicate form/table is needed. |
| Pagination | Partially implemented | Stable batches exist, but the full profile payload is shipped initially. |
| Empty states | Partially implemented | Filtered fallback exists; initial and zero-inventory states need clearer actions. |
| Homepage supply | Partially implemented | It uses real categories but can promote empty categories. |
| SEO | Complete with a defect | Core canonical/noindex/sitemap rules are sound; directory structured data and category links should remain supply-aware. |
| Localization | Complete foundation | All changed copy must be added to the existing three-locale map. |
| Analytics | Unsafe | Exact counts and overly detailed filter dimensions should be replaced with coarse bands. |
| Fabricated signals | Complete and safe | None found. |

## Minimal implementation plan

1. Show a stable first batch of eligible professionals on initial load, prioritizing acceptance, completeness, availability confirmation, trust, freshness, and deterministic fair exposure.
2. Make category cards supply-aware: live accepting supply first, other real supply next, and empty taxonomy categories in a lower-prominence `More types of support` disclosure.
3. Keep filtered results exact. Never silently substitute online service for an explicit in-person requirement; provide a user-controlled `Include online support` action instead.
4. Add clear active-filter controls, reset/browse-all actions, robust zero-result and completely empty states, and prominent reuse of the existing guided matching/concierge form.
5. Keep initial and category result grids visually bounded for one, two, and three cards and retain batch expansion for larger sets.
6. Replace exact analytics result counts with coarse bands and non-sensitive dimensions.
7. Remove biography, service, and credential detail from the browser-facing directory snapshot while retaining the complete build-only snapshot used by profile pages.
8. Remove empty category promotion from the English and localized homepage marketplace sections.
9. Add helper and source-level regression tests for zero, one, two, three, and larger fixtures, public eligibility, deterministic ordering, fallback safety, privacy, localization parity, and SEO behavior.

## Expected file and migration scope

Expected changes:

- `website/app/[locale]/[[...slug]]/page.tsx`
- `website/app/professionals/page.tsx`
- `website/app/professionals/[slug]/page.tsx`
- `website/app/globals.css`
- `website/components/marketplace/MarketplaceDirectory.tsx`
- `website/components/marketplace/ProfessionalCard.tsx` only if a small availability/accessibility adjustment is needed
- `website/components/localization/LocalizedHomePage.tsx`
- `website/lib/marketplace-helpers.ts`
- `website/lib/marketplace-types.ts`
- `website/lib/i18n/marketplace-content.ts`
- `website/tests/marketplace-low-inventory.test.ts`
- this audit document

No Supabase migration is expected. The existing public views, RLS, approval model, direct inquiry flow, and concierge tables/RPCs remain authoritative.
