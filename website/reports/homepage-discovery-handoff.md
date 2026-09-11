# Homepage and StageLab discovery — implementation report

Updated September 11, 2026. Repository: `C:/Users/markl/Desktop/Elevare_Landing_Page`. Branch: `main`. Implementation baseline: `f8f6654`. This report records the local implementation and validation completed before the user authorized publication to GitHub.

## 1. Audit and reused functionality

The checkout was clean before this work; no applicable AGENTS.md or Sites hosting configuration was found. The existing Next.js/Vercel website remains authoritative. Reused the guided concierge intake and progressive authentication, ordinary professional directory, free calculators/resource hub, app product pages and store links, shared header/footer, blog components, StageLab product section, public product prices, locale routing, analytics consent and source attribution, and all existing payment/report infrastructure.

The old homepage repeated free-resource, app, and marketplace choices in multiple large sections and fetched professional inventory for categories/counts. Shop only presented the coming-soon Show Day Kit. StageLab already offered all three analyses; its existing section now uses the same updated cards as Home and Shop. No new checkout or resource hub was introduced.

## 2. Homepage and navigation

The exact English H1 is **Find the right support for your goals.** The primary action opens `/professionals/#guided-matching`, the secondary opens `/calculators/`, and the quiet browse link opens `/professionals/`. Locale prefixes are preserved. The intake now opens its existing first step directly and remains reachable when directory inventory grows.

Navigation groups are Find a Professional, Free Resources, Apps, Shop, and For Professionals. Free Resources contains the existing resource destinations and blog; Apps contains Logbook and StageLab; Shop contains its main page, three direct analysis links, and physical-products anchor. The menu supports keyboard activation, Escape, mobile expansion, and current-section styling. Sign-in/account and language selection remain available on public and authenticated pages.

The footer retains legal, contact, Trust and Safety, navigation, authentication, translation-feedback, and existing consent controls. Its repeated mobile-launch announcement was removed.

## 3. Final homepage order

1. Hero
2. Three-step professional-support explanation, availability/consultation expectations, and Trust and Safety link
3. StageLab AI Analyses
4. Four compact free-resource links
5. Logbook and StageLab app introductions
6. Professional profile invitation
7. Selected existing articles
8. Shared footer

Desktop shows three analysis columns; phones stack them. No carousel, autoplay hero, new inventory query, invented activity, or popularity label was added.

## 4. Digital products and pricing

| Product | Input | One-time price | Canonical landing page |
| --- | --- | --- | --- |
| AI Physique Analysis | 3–5 photos | $0.99 USD | /stagelab/quick-analysis/ |
| Bodybuilding Posing Analysis | Short video, 5–45 seconds | $0.99 USD | /stagelab/posing-analysis/ |
| Complete Stage Analysis | Photos and short video | $1.49 USD | /stagelab/complete-stage-analysis/ |

Prices match the existing server-validated catalog. The physique catalog value now references the existing Quick Analysis cents constant. The shared USD bundle saving is calculated from those canonical amounts: 99 + 99 − 149 = **49 cents**. The bundle badge says “Physique + posing”; neither a combined official score nor popularity is implied.

Cards link to individual product pages and never create checkout sessions. They identify one-time website reports, with no account/subscription requirement and separate app/coaching access. Purchase controls become unavailable when the browser payment configuration is missing. Existing server configuration and Stripe price validation remain authoritative; there was no separate product-enable flag in the existing public catalog.

## 5. Shop and physical products

Digital analyses appear first, followed by physical products. Show Day Kit retains its exact product identity, description, and **coming_soon** state; its price/shipping IDs remain unset. The empty image placeholder was removed in favor of a compact text card.

All existing active/restocking/inventory/backorder/configuration checks and physical checkout logic are preserved. No physical inventory or Stripe product/price was changed. There is no unified cart or digital shipping.

## 6. Exact contextual changes

One shared analysis card is placed after the article on each selected page:

| Page | Product |
| --- | --- |
| /blog/bodybuilding-prep-tracking-basics/ | AI Physique Analysis |
| /blog/mens-physique-classic-physique-prep-6-weeks-out/ | AI Physique Analysis |
| /blog/mens-physique-classic-physique-prep-4-weeks-out/ | Complete Stage Analysis |

The existing after-result CTA now points to Complete Stage Analysis on these free tools, including their Spanish and Portuguese equivalents:

- /calculators/contest-prep-countdown/
- /calculators/competition-timeline-generator/
- /calculators/show-day-checklist-generator/

Original article content and calculator behavior are unchanged. The prior automatic promotion on every “prep” or “prep-files” article was replaced by the explicit mapping. As a result, the old paid CTA was removed from `/blog/losing-muscle-faster-than-fat/` and from `/blog/mens-physique-classic-physique-prep-{N}-weeks-out/` for N = **18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, and 5**.

No dedicated posing article exists in the current library, so no unsuitable article was assigned a video promotion. Posing discovery is available directly through Home, Shop, StageLab, and navigation. Existing photo-analysis CTAs on body-fat tools and the relevant calculator-hub group remain intact. No paid CTA was injected into general workout, exercise, or nutrition templates.

## 7. Report previews

All three analysis landing pages have a lightweight collapsed “Example report” in EN, es-419, and pt-BR. The excerpts are explicitly fictional, typed against actual report fields, and contain no customer images, private reports, fabricated scores, or live AI calls.

Physique excerpts show conditioning, visible strengths, improvements, and limitations. Posing excerpts show the biggest opportunity and a correction with visible evidence and a practical cue. The bundle shows both separately and explicitly states there is no combined official score. Existing detailed limitations and product-specific privacy/access terms remain in place.

## 8. Professional visibility

Home has no professional cards, names, profile photos, bios, pricing, featured profiles, counts, category inventory snapshot, or automatic showcase threshold. Its professional/category fetches were removed from both former homepage implementations.

Ordinary directory and category visibility are preserved. The browser check confirms the local published fixture remains visible in the directory while absent from Home. Shared marketplace utilities remain available elsewhere.

## 9. Localization and attribution

English, Latin American Spanish, and Brazilian Portuguese use one homepage renderer and matching typed dictionaries. New product cards and examples have full locale copy with English fallback. Resource/product/account links retain locale prefixes. Shop and blog remain English-only destinations with explicit English fallback labels; English article titles/content are not machine-translated. Currency remains USD.

The existing generation flags are unchanged. Product pages explain in the selected language when the actual report will be generated in English. Locale selection, checkout payloads, and return handling are retained.

The allowlist now includes `home-analyses`, `shop-digital`, and `navigation`, alongside existing StageLab/tool/article sources. Card exposures are observed and deduplicated; clicks carry product and source. Sources flow through existing landing, checkout, return, purchase, and completion events. StageLab landing view events now include the source and guard against effect replay.

Purchase analytics now also require the backend status response to say `paymentStatus: paid`. A result URL with `purchase=confirmed` alone cannot count a purchase. A bundle retains one purchase event, with separate component/delivery events rather than two purchases. No checkout IDs, private URLs, uploads, credentials, or personal details were added to analytics.

**Existing limitation:** purchase and delivery deduplication still uses browser-tab/session keys, not receipt-level server records. Repeat purchases of the same product in one tab can be undercounted, and attribution is not guaranteed across tabs/devices. A durable receipt-level funnel would need a separate backend change. Existing delivery events were preserved; no new analytics platform was introduced.

## 10. Verification

Commands ran from `website/` unless noted:

| Check | Result |
| --- | --- |
| `npm.cmd test` | **348 passed**, 0 failed |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run lint` | Passed with 4 existing no-img-element warnings in marketplace components |
| `npm.cmd run routes:verify` | 142 redirect rules verified |
| `npm.cmd run legal:verify` | 2 immutable legal records verified |
| `npm.cmd run legal:routes` | 10 active and 2 archive routes verified |
| `npm.cmd run localization:audit` | Completed; updated 1,061 heuristic untranslated-string candidates |
| `node tests/integration/run-next.mjs build` | Production Next.js build passed with local fixture environment |
| `npm.cmd run postbuild` | Localized HTML, legal output, content audit, SEO artifact passed |
| `node tests/integration/homepage-browser.mjs` | **25 browser checks passed**, zero checkout requests |
| `git diff --check` | Passed |

Localized routes and indexing were enabled only in the test/build process. Postbuild checked 1,844 localized documents; the artifact contains 2,808 static HTML files and 1,386 sitemap URLs. No retired workout pages/links or legacy tool links were introduced. Unit checks retain all existing payment, upload, retry, legal, inventory, and locale tests.

Browser verification used Chromium at **320, 390, 768, and 1440 px** in all three locales. It covered order, prices/savings, layout, no horizontal overflow, images, keyboard/menu interactions, direct landing links, examples, fallback notices, selected/excluded article placements, ordinary discovery, and the authenticated shared header. Mocked paid/unpaid states checked purchase gating, attribution, bundle counting, and reload deduplication. Visual screenshots were inspected for desktop, mobile, tablet, product cards, report excerpts, and the compact physical placeholder.

The production build used existing generated public resource snapshots plus the disposable loopback Supabase fixture. Remote training/nutrition data-refresh steps were intentionally not run. No live Stripe or AI end-to-end purchase/generation was performed. The localization scanner is a broad heuristic report, not a claim that the whole pre-existing site has no untranslated strings; new dictionary parity and visible locale flows passed.

Browser results: [homepage-browser.json](C:/Users/markl/Desktop/Elevare_Landing_Page/website/reports/homepage-browser.json).
Desktop screenshot: [homepage-en-1440.png](C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/homepage-en-1440.png).
Mobile screenshot: [homepage-en-320.png](C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/homepage-en-320.png).

Screenshot follow-up: the user-supplied Log Food image was subsequently verified in a local development preview at all four widths in all three locales (12 checks). Type checking and all 20 existing localization tests passed again. A SHA-256 comparison confirms the public asset is byte-for-byte identical to the newer attachment. The full-page previews above were refreshed; [logbook-screenshot-check.json](C:/Users/markl/Desktop/Elevare_Landing_Page/website/reports/logbook-screenshot-check.json) records these focused checks. The broader production-build results above refer to the preceding redesign verification.

## 11. Files changed

- [website/app/[locale]/[[...slug]]/page.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/[locale]/[[...slug]]/page.tsx)
- [website/app/blog/[slug]/page.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/blog/[slug]/page.tsx)
- [website/app/globals.css](C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/globals.css)
- [website/app/page.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/page.tsx)
- [website/app/shop/page.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/shop/page.tsx)
- [website/components/BlogCard.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/BlogCard.tsx)
- [website/components/Footer.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/Footer.tsx)
- [website/components/Header.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/Header.tsx)
- [website/components/localization/LocalizedHomePage.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/localization/LocalizedHomePage.tsx)
- [website/components/localization/LocalizedQuickAnalysisPage.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/localization/LocalizedQuickAnalysisPage.tsx)
- [website/components/localization/LocalizedStageAnalysisPage.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/localization/LocalizedStageAnalysisPage.tsx)
- [website/components/marketplace/MarketplaceDemandForm.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/marketplace/MarketplaceDemandForm.tsx)
- [website/components/marketplace/MarketplaceDirectory.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/marketplace/MarketplaceDirectory.tsx)
- [website/components/quick-analysis/QuickAnalysisCheckout.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/quick-analysis/QuickAnalysisCheckout.tsx)
- [website/components/quick-analysis/QuickAnalysisResultExperience.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/quick-analysis/QuickAnalysisResultExperience.tsx)
- [website/components/stage-analysis/AnalysisExampleReport.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/AnalysisExampleReport.tsx)
- [website/components/stage-analysis/ContextualAnalysisCTA.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/ContextualAnalysisCTA.tsx)
- [website/components/stage-analysis/PosingAnalysisResultExperience.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/PosingAnalysisResultExperience.tsx)
- [website/components/stage-analysis/StageAnalysisCard.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/StageAnalysisCard.tsx)
- [website/components/stage-analysis/StageAnalysisCheckout.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/StageAnalysisCheckout.tsx)
- [website/components/stage-analysis/StageAnalysisProducts.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/StageAnalysisProducts.tsx)
- [website/components/stage-analysis/StageAnalysisViewTracker.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/StageAnalysisViewTracker.tsx)
- [website/components/tools/ToolCalculatorRenderer.tsx](C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/tools/ToolCalculatorRenderer.tsx)
- [website/lib/i18n/marketing-types.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/i18n/marketing-types.ts)
- [website/lib/quick-analysis-attribution.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/quick-analysis-attribution.ts)
- [website/lib/stage-analysis-discovery.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/stage-analysis-discovery.ts)
- [website/lib/stage-analysis.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/stage-analysis.ts)
- [website/locales/en/marketing.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/locales/en/marketing.ts)
- [website/locales/es-419/marketing.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/locales/es-419/marketing.ts)
- [website/locales/pt-BR/marketing.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/locales/pt-BR/marketing.ts)
- [website/public/images/logbook/log-food-screen.jpg](C:/Users/markl/Desktop/Elevare_Landing_Page/website/public/images/logbook/log-food-screen.jpg)
- [website/reports/homepage-browser.json](C:/Users/markl/Desktop/Elevare_Landing_Page/website/reports/homepage-browser.json)
- [website/reports/homepage-discovery-handoff.md](C:/Users/markl/Desktop/Elevare_Landing_Page/website/reports/homepage-discovery-handoff.md)
- [website/reports/localization-untranslated.txt](C:/Users/markl/Desktop/Elevare_Landing_Page/website/reports/localization-untranslated.txt)
- [website/reports/logbook-screenshot-check.json](C:/Users/markl/Desktop/Elevare_Landing_Page/website/reports/logbook-screenshot-check.json)
- [website/tests/integration/homepage-browser.mjs](C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/integration/homepage-browser.mjs)
- [website/tests/localization.test.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/localization.test.ts)
- [website/tests/marketplace-low-inventory.test.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/marketplace-low-inventory.test.ts)
- [website/tests/quick-analysis-entry-points.test.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/quick-analysis-entry-points.test.ts)
- [website/tests/shop.test.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/shop.test.ts)
- [website/tests/stage-analysis-discovery.test.ts](C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/stage-analysis-discovery.test.ts)

## 12. Dependencies and remaining limitations

No dependency, schema migration, environment setting, live price, inventory record, or hosting configuration was added or changed.

**Logbook screenshot supplied:** the homepage now uses the user's newer “Log Food” screenshot at `website/public/images/logbook/log-food-screen.jpg`, replacing the temporary logo. The original JPEG is preserved without cropping or alteration, with its actual 591 × 1280 aspect ratio and localized alt text/caption. The earlier Nutrition screenshot was not added. This resolves the outstanding asset gap. StageLab still reuses its existing public app screen. App store links and detailed demonstrations remain on the product pages.

Shop/blog localization and durable receipt-level attribution remain existing limitations described above. All requested report previews were completed. Tests use local fixtures and mocks; they do not establish current live Stripe/Supabase configuration or deliverability.

## 13. Publication and data safety

Implementation and verification were completed locally, followed by the user's explicit instruction to push the changes to GitHub. No purchases, charges, emails, production-data mutations, or changes to live Stripe products/prices, secrets, migrations, or settings were performed. GitHub publication can trigger the repository's existing hosting integration; no separate deployment command is part of this change.
