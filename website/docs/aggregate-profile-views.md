# Aggregate professional profile views

The website and separate admin app now report recorded page visits using private daily totals. The implementation has been validated locally. Production migrations have not been performed; apply the prerequisites below before publishing the applications.

## Visitor behavior

- For requests with Vercel country metadata identifying the United States, United Kingdom or France, basic profile statistics can count by default unless the visitor declines. This is a deliberately narrow launch policy, not a worldwide consent exemption.
- Other countries, missing country metadata and non-Vercel hosting require an explicit profile-statistics opt-in. Browser language and a user-supplied location are never used to infer eligibility.
- Saved declines and Global Privacy Control / Do Not Track stop the counter. An earlier Google Analytics decline is preserved unless the visitor explicitly enables profile statistics separately. Accepting Google Analytics alone does not grant profile-statistics consent in a region that requires it.
- The existing Privacy choices panel contains an expandable profile-statistics section with separate Allow and Turn off controls. Its notice and controls are translated into en, es-419 and pt-BR. Google Analytics settings remain separate.
- A visible profile-page instance can count once. Reloading or revisiting may count again. These are not unique-person or unique-browser counts. Bots matching the existing filter, prefetch traffic and identifiable owner/admin visits are excluded; this is not perfect bot detection.
- Counting is best effort. JavaScript blockers, unavailable services and privacy choices can leave visits unrecorded. Ambiguous network failures are not retried because a retry could double-count a successful request.

## What is retained

The new `professional_profile_view_daily` table has only `trainer_profile_id`, `viewed_on` (UTC date) and `view_count`. The counter creates no visitor cookie or persistent visitor ID and stores no visitor hash, IP, user agent, location, referrer or event-level browsing history in the statistics tables. Existing authentication may identify an owner/admin for exclusion; its identity is not attached to a count.

The old visitor cookie is expired when a browser next reaches the counter endpoint. It is never read or reused. Obsolete browser deduplication keys are removed without deleting unrelated preferences. Essential privacy choices can still be remembered in browser storage. If storage is blocked, choices work in memory for the current page; persisting them across a reload is not possible without browser storage.

Existing per-visit records are aggregated by profile and UTC date, then the old event table is removed. Historical all-time counters are preserved even when they predate the event records. No missing visits are estimated or reconstructed. Earlier totals therefore include the previous consent-based counting method. Existing hosting/security logs and other analytics services are separate from this counter and were not redesigned.

## Dashboard definitions

- **Recorded profile page views:** the recorded count; zero is displayed as **No recorded views yet**. The profile editor distinguishes loading/unavailable data from an actual empty result.
- **View date range:** today plus the previous 29 UTC calendar days. Both the admin and professional dashboard sum the same daily table.
- **All-time views:** preserved earlier totals plus new recorded page visits.
- **Inquiries:** unchanged direct consultation-request records. Their existing rolling 30-day window and all-time/awaiting-response counts remain separate from page views and Concierge matching.

The dashboard explains repeat visits, privacy-related omissions, bot/owner filtering and the historical change in counting method. The existing monthly-summary formatter also uses recorded-view wording and the same zero-state language.

## Privacy scope

The regional policy follows the narrow statistical-purpose conditions described by the [ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/) and the audience-measurement conditions described by [CNIL](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience). California's [CCPA guidance](https://www.oag.ca.gov/privacy/ccpa) distinguishes sale/advertising sharing opt-outs from ordinary collection. This implementation makes no worldwide compliance claim or determination that every US state law is inapplicable. Broader regional rollout should be reviewed against the applicable rules, actual provider arrangements and the uses made of these statistics.

The first-party counter is limited to aggregate directory improvement and profile activity reporting; it does not create audiences, link browsing across services, or feed advertising. The existing privacy policy is versioned to **2026-09-11**, with an immutable archive and matching database registration. Previous archived versions and user acceptance records are preserved. New signup checkboxes reference the new privacy version through the existing legal-version mechanism.

## Apply before publication

Run these in order against the **marketplace / secondary Supabase project** used by the public website and admin:

1. `supabase/migrations/20260911230000_aggregate_professional_profile_views.sql`
2. `supabase/migrations/20260911231000_register_profile_statistics_privacy.sql`

These assume the preceding repository migrations, including the retention dashboard and website signup legal-acceptance migration, are installed. The first migration preserves aggregates and deliberately removes the obsolete visitor-event table. If unknown database objects depend on that table, PostgreSQL will refuse the drop rather than cascade-delete them; review those dependencies before retrying. The migration can be reapplied without reimporting already-aggregated history. Its legacy two-argument RPC wrapper temporarily supports the old server while discarding the supplied visitor hash.

After both migrations, publish the website and **Admin_Elevare** together. The new admin query requires the daily table and shows unavailable activity if that schema is missing. An older admin deployment still expects the old event table, so coordinate the switch. Applying the privacy registration before the new website prevents signup from referencing an unregistered legal version. No new Edge Function, Resend template or environment variable is required on the existing Vercel deployment.

Do not restore the old event-based server/database implementation as a rollback: the visitor records have been deliberately removed. To pause new counting, disable the tracker or require explicit profile consent while keeping the aggregate schema and totals.

## Validation

- Website: 354 unit tests passed; TypeScript and production build passed.
- Admin: 20 tests passed, including summing daily totals, pagination, invalid aggregates, authorization and unavailable/zero display behavior.
- PostgreSQL: 9 checks passed for historical preservation, removal of visitor records, private access, UTC boundaries, inquiry counts, migration reapplication, 12 concurrent increments and legacy-RPC compatibility.
- Signup: 6 checks passed in a separate disposable database, including recording the new privacy version without changing previous acceptances.
- Production browser/API: 9 scenario groups passed, covering regional defaults, explicit consent, declines, GPC/DNT, owner exclusion, repeat visits, obsolete cookie/storage removal, blocked storage, translated mobile controls and matching real admin/owner totals.
- ESLint: no errors; four existing image-element warnings in professional components.
- Postbuild localization, legal routes and production-artifact checks passed. The build used the repository's local integration runner and existing generated catalogs; no external content refresh or production data writes were needed.

The browser test uses a local production Next.js build, real PostgreSQL/PostgREST, a local signed-token auth fixture and simulated Vercel country headers. External services are blocked. A blocked-storage test exposed a pre-existing unguarded language-preference read; the language runtime and selector now handle unavailable storage gracefully. No test sent a real inquiry or email.

## Changed areas

Website changes cover the counter route/tracker, privacy policy/helper/controls, professional dashboard/editor/monthly formatter, localization dictionaries and storage guards, legal-version archive/registration, two database migrations and related tests/reports. The separate admin changes are limited to `professional-metrics.js`, `trainer-featured.js`, `tests/professional-metrics.test.js` and `PROFESSIONAL_ACTIVITY.md`. Existing unrelated admin edits and the preceding StageLab methodology work remain intact.

Browser evidence is in `website/reports/aggregate-profile-views-browser.json`; database evidence is in `website/reports/aggregate-profile-views-database.json`. Screenshots are local review files in `.tmp/aggregate-profile-views/`.
