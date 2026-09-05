# Localization Readiness Audit

## Current Architecture

- Framework: Next.js App Router with TypeScript and statically generated public marketing routes.
- Canonical origin: `https://www.elevarefit.com`, centralized in `lib/site.ts`.
- URL policy: English remains unprefixed; Spanish uses `/es/`; Brazilian Portuguese uses `/pt-br/`; trailing slashes remain enabled.
- Shared system: `app/[locale]/[[...slug]]/page.tsx`, `lib/i18n/*`, and typed dictionaries under `locales/*`.
- Rollout controls: localized routes, localized indexing, Spanish generation, and Portuguese generation use separate feature flags.

## Implemented Route Scope

The localized allowlist contains `/`, `/logbook/`, `/stagelab/`, `/stagelab/quick-analysis/`, and `/stagelab/quick-analysis/result/`. This produces 10 prefixed static pages when localized routes are enabled. Quick Analysis localization also covers intake, Embedded Checkout context, payment return, upload, processing, retry, results, and recovery behavior through the existing API and component flow.

Authentication, marketplace, Shop, legal pages, database-sourced food/exercise content, workout/nutrition directories, and automatic translation of user-generated content remain deferred.

## Initial HTML And Accessibility

English documents retain `lang="en"`. A postbuild finalizer updates and verifies generated Spanish and Portuguese HTML as `lang="es-419"` and `lang="pt-BR"` before deployment. This is required because the shared App Router root layout cannot receive params from the child optional locale route without a material route-group migration. The client runtime also synchronizes `document.documentElement.lang` after locale-aware client navigation; it is a navigation fallback, not the mechanism that fixes initial server HTML.

Quick Analysis keeps associated labels and errors, focuses the missing-consent control, announces processing through a polite live region, and allows translated text to wrap without horizontal overflow. Manual assistive-technology and fluent-speaker review remains required before public rollout.

## SEO And Routing Safety

`ENABLE_LOCALIZED_INDEXING=false` keeps every localized page `noindex, nofollow`, excludes localized URLs from generated XML sitemaps, and suppresses hreflang groups. Private result pages remain more restrictive regardless of flags. When indexing is intentionally enabled later, completed route groups use self-referencing canonicals and reciprocal `en`, `es-419`, `pt-BR`, and `x-default` alternates.

Unsupported locale-prefixed routes are never generated. Links from localized pages to deferred English-only content preserve English canonical destinations and use `hreflang="en"` where applicable.

## Reports And Review

`reports/translation-review.csv` covers the original marketing dictionaries. `reports/quick-analysis-translation-review.csv` covers all 239 current Quick Analysis strings. `reports/localization-untranslated.txt` is a broad static-code candidate inventory for future phases, not a requirement to translate deferred areas in this release.

No generated localization report contains a local absolute repository path. Qualified review is still required for language quality and for legal, privacy, consent, health, AI, payment, and refund wording.
