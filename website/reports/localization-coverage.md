# Localization Coverage

## Implemented Foundation

- Supported locales: `en`, `es-419`, and `pt-BR`.
- Stable URLs: English is unprefixed; Latin American Spanish uses `/es/`; Brazilian Portuguese uses `/pt-br/`.
- Explicit selector with cookie/local-storage persistence and conservative browser-language detection.
- Typed dictionaries, interpolation, pluralization, locale-aware formatting, and English fallback behavior.
- Existing analytics event names with a non-sensitive locale dimension.
- Independent public-route, indexing, Spanish-generation, and Portuguese-generation flags.
- Build-time verification of server-rendered `html[lang]` values.

## Current Route Coverage

| Route | English | es-419 | pt-BR | Indexing state |
| --- | --- | --- | --- | --- |
| `/` | Existing production page | Implemented behind flag | Implemented behind flag | Localized variants noindex by default |
| `/logbook/` | Existing production page | Implemented behind flag | Implemented behind flag | Localized variants noindex by default |
| `/stagelab/` | Existing production page | Implemented behind flag | Implemented behind flag | Localized variants noindex by default |
| `/stagelab/quick-analysis/` | Existing production page | Implemented behind flag | Implemented behind flag | Localized variants noindex by default |
| `/stagelab/quick-analysis/result/` | Private English result | Private localized result | Private localized result | Always noindex/noarchive |

Quick Analysis coverage includes its landing, mode/intake UI, Embedded Checkout context, return, upload, processing, retry, result, and recovery experience. Canonical data contracts, model criteria, price, currency, entitlement, photo handling, and payment verification remain language-independent.

## Intentionally Deferred

- Authentication and private account pages.
- Public marketplace, professional profiles, and onboarding.
- Shop and legal/support pages.
- Detailed calculators/tools, exercise/workout/nutrition programmatic pages, and editorial blog translation.
- Database-sourced food and exercise names/descriptions.
- User-generated profile, service, credential, and free-text content.

## Human Review Gates

`reports/translation-review.csv` covers shared marketing text, and `reports/quick-analysis-translation-review.csv` contains 239 current Quick Analysis rows. Fluent-speaker review is required for both translated locales. Legal, payment, health, consent, AI, privacy, and refund wording requires qualified human review before localized indexing.

## Controlled Enablement

1. Apply the reviewed additive Quick Analysis locale migration to the intended Supabase project.
2. Enable `NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES=true` in a Preview environment while keeping indexing false.
3. Enable only the reviewed narrative-generation locale flag and test the complete mocked/test-mode payment path.
4. Complete mobile, desktop, accessibility, fluent-speaker, and legal/product review.
5. Enable each additional generation locale only after its review gate passes.
6. Set `ENABLE_LOCALIZED_INDEXING=true` only after the completed route groups pass production SEO verification.
