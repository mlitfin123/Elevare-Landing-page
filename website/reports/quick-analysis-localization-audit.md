# StageLab Quick Analysis Localization Audit

## Scope

Quick Analysis extends the existing Elevare localization architecture for English, Latin American Spanish (`es-419`), and Brazilian Portuguese (`pt-BR`). Localized surfaces cover the landing page, mode and intake controls, consent and photo guidance, embedded Stripe context, payment/access states, upload, processing, retry, result presentation, recovery links, metadata, and non-sensitive analytics locale data.

No second localization framework was introduced. Authentication, marketplace, Shop, legal pages, database-provided food/exercise content, workout and nutrition directories, and user-generated content remain intentionally deferred.

## Document Language

The root English layout remains `lang="en"`. Because the App Router root layout is above the optional localized route and cannot receive its route params without restructuring every English route, the build runs `scripts/finalize-localized-html.ts` after prerendering. It updates and verifies the generated Spanish documents as `lang="es-419"` and Brazilian Portuguese documents as `lang="pt-BR"` before deployment. Initial HTML is therefore correct without JavaScript. The client runtime separately synchronizes the document language after locale-aware client navigation so assistive technology does not retain a stale language after a route transition.

## Canonical Data And Locale Security

Only `en`, `es-419`, and `pt-BR` are accepted. Missing or legacy locale values resolve to English; malformed request values are rejected and unsupported stored values normalize to English. The OpenAI system prompt receives one fixed server-side instruction selected from that allowlist. Raw locale input is never interpolated into the prompt.

Analysis modes, divisions, competition status values, photo-view identifiers, schema keys, canonical enums, scores, ranges, confidence values, readiness categories, condition-distance values, Stripe identifiers, price, currency, and entitlement state remain unchanged. Only approved interface strings and narrative output vary by language. Existing reports are displayed in their original generation language and are not regenerated when the interface language changes.

## Stripe, Retry, And Photo Privacy

The existing one-time `$0.99 USD` Stripe Price, Embedded Checkout, webhook verification, idempotency, entitlement issuance, anonymous HTTP-only cookie access, recovery behavior, and retry-without-recharge flow are unchanged. Locale metadata and return values are allowlisted and safely parsed. A localized generation failure keeps the paid entitlement available for retry.

The existing single multimodal OpenAI request architecture is unchanged. No Quick Analysis photo storage, photo database field, bucket, thumbnail, permanent URL, or historical comparison was added. Transient image buffers are cleared after processing.

## SEO And Rollout Controls

Localized routes require `NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES=true`. Spanish and Portuguese narrative generation use independent server-only flags. `ENABLE_LOCALIZED_INDEXING` remains false by default and is independently gated by the public route flag.

With indexing disabled, localized pages emit `noindex, nofollow`, remain absent from XML sitemaps, and do not advertise incomplete hreflang groups. Result pages always emit `noindex, nofollow, noarchive, nosnippet`. Deferred English destinations retain their canonical English URLs and are marked with `hreflang="en"` where links appear in localized UI.

## Review Gates

`reports/quick-analysis-translation-review.csv` contains 239 current translation rows with matching keys and interpolation placeholders. Product names and selected industry terms may intentionally remain unchanged. Qualified fluent-speaker review is still required for both locales. Legal, privacy, consent, health, payment, refund, and AI-disclaimer wording remains explicitly subject to human legal/product review before localized indexing is enabled.
