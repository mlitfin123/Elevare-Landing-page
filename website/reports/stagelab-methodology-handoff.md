# StageLab methodology implementation

Added a public methodology section to the existing StageLab product page in English, Latin American Spanish and Brazilian Portuguese. The methodology work was validated locally and changes no StageLab app logic, analysis endpoints, payments, tracking, database migrations or environment settings. Profile-statistics changes shipped alongside this work have separate rollout requirements in `website/docs/aggregate-profile-views.md`.

## Placement and components

The existing page audit identified a dedicated English product page and a shared localized product renderer, with static marketing dictionaries. The new section follows the four-step weekly review explanation, after the primary product/features and existing standalone analysis offers. It replaces the small “Prep trends, not guarantees” callout with the broader transparency section. Existing FAQs remain directly afterward, followed by the original final download CTA.

The new StageLabMethodology server component supplies the six core cards, a distinct Posing Coach callout, a conceptual decision flow, six expandable explanations and the limitations box. StageLabMethodologyTransition adds a single supporting sentence to the existing final CTA. Existing panel, eyebrow and FAQ/disclosure styles are reused, as are ProductCtaButtons, its destinations and event contexts. There is no new top-level route or client-side methodology bundle.

## Files changed

| File | Change | Purpose |
| --- | --- | --- |
| [website/app/stagelab/page.tsx](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/stagelab/page.tsx>) | Edited | English page placement, supporting CTA sentence, metadata and MobileApplication description. |
| [website/components/localization/LocalizedProductPage.tsx](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/localization/LocalizedProductPage.tsx>) | Edited | Same placement and CTA sentence in localized StageLab pages; preserves Logbook behavior. |
| [website/app/globals.css](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/app/globals.css>) | Edited | Scoped responsive cards, posing callout, decision flow and limits; reuses existing panels and FAQ styles. |
| [website/components/stage-analysis/StageLabMethodology.tsx](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/components/stage-analysis/StageLabMethodology.tsx>) | Added | Server-rendered methodology and supporting CTA components. |
| [website/lib/i18n/stagelab-methodology-messages.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/lib/i18n/stagelab-methodology-messages.ts>) | Added | Typed static locale dictionaries, ordered concepts/details and English fallback. |
| [website/locales/en/stagelab-methodology.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/locales/en/stagelab-methodology.ts>) | Added | Complete en methodology copy. |
| [website/locales/es-419/stagelab-methodology.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/locales/es-419/stagelab-methodology.ts>) | Added | Complete es-419 methodology copy. |
| [website/locales/pt-BR/stagelab-methodology.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/locales/pt-BR/stagelab-methodology.ts>) | Added | Complete pt-BR methodology copy. |
| [website/locales/en/marketing.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/locales/en/marketing.ts>) | Edited | en StageLab SEO and structured-data descriptions only. |
| [website/locales/es-419/marketing.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/locales/es-419/marketing.ts>) | Edited | es-419 StageLab SEO and structured-data descriptions only. |
| [website/locales/pt-BR/marketing.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/locales/pt-BR/marketing.ts>) | Edited | pt-BR StageLab SEO and structured-data descriptions only. |
| [website/tests/stagelab-methodology.test.ts](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/stagelab-methodology.test.ts>) | Added | Locale parity, fallback and material public-copy caveats. |
| [website/tests/integration/stagelab-methodology-browser.mjs](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/tests/integration/stagelab-methodology-browser.mjs>) | Added | Production browser checks with external network and API access blocked. |
| [website/reports/stagelab-methodology-browser.json](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/reports/stagelab-methodology-browser.json>) | Added | Passing browser verification record. |
| [website/reports/stagelab-methodology-handoff.md](<C:/Users/markl/Desktop/Elevare_Landing_Page/website/reports/stagelab-methodology-handoff.md>) | Added | Implementation report and complete final English copy. |

## Localization

The dedicated dictionaries follow the existing typed, static locale architecture, with en, es-419 and pt-BR selected by the existing Locale value. Unknown locale values fall back to English. No runtime translation service is used.

All 75 text leaves have matching keys and nonempty values in each language. Cards, disclosures, limits, diagram labels, scope and CTA support are translated. The only identical English leaves in the translated dictionaries are the Posing Coach product name and “Cardio,” which are intentionally shared. Accessibility names refer to the visible localized headings. The existing marketing dictionaries retain their key structure.

## Accordion and decision flow

Six native HTML details/summary controls are closed initially and can expand independently. Their topics are visual readiness, progress history, maintenance, holding instead of cutting, Peak Week and posing separation. Native controls work without JavaScript and expose expanded/collapsed state to the browser accessibility tree; Enter, Space and keyboard focus order were verified.

The diagram uses a semantic unordered list of six inputs followed by an ordered list of three review stages. This visible HTML is also its screen-reader text representation. Decorative arrows and visual ordinals are hidden from assistive technology. The caption explicitly says the inputs do not carry equal weight and may be missing. On mobile, both input and decision lists stack vertically. The flow is explanatory content, not executable prep logic.

## SEO and accessibility

All new content, including collapsed disclosure bodies, is present in server-rendered HTML. Canonical URLs, localized route structure, existing structured-data types, FAQ content and SEO architecture are preserved. The existing locale indexing configuration was not changed; production validation enabled localized indexing for the test build.

English meta description:

> Explore AI-assisted bodybuilding competition prep, physique readiness, posing analysis, and the methodology behind StageLab's check-ins and plan decisions.

English MobileApplication description:

> Bodybuilding contest prep tracking with AI-assisted physique assessment, separate posing analysis, and explained plan decisions for athletes and coaches.

Both descriptions are also translated in es-419 and pt-BR. The page retains one H1, with an H2 for the new section and H3s within it. Native disclosures reuse the existing visible keyboard focus treatment. No information depends solely on color. The flow uses text, lists and direction arrows. Body text and disclosure labels were checked for readability and overflow at 320, 390, 768 and 1440 pixels.

## Validation

| Check | Result |
| --- | --- |
| npm run typecheck | Passed. Final production build also passed TypeScript. |
| npm test | 351 tests passed, including three new methodology tests. |
| Translation parity | All 75 leaves match across en, es-419 and pt-BR; English fallback passes. |
| npm run lint | No errors; four existing no-img-element warnings in professional profile/card/editor files. |
| Production build | Passed; 2,862 pages generated. |
| npm run postbuild | Passed localization HTML, legal routes, content audit and production artifact validation. |
| Localized HTML | 1,844 localized documents verified/finalized. |
| Production artifact | 2,808 static HTML files and 1,386 sitemap URLs checked; no retired-workout or legacy-tool regressions. |
| npm run routes:verify | Passed. |
| npm run legal:verify | Passed. |
| Production browser suite | 19 checks passed; no page errors or API calls. |
| git diff --check | Passed. |

The production build used the repository's local integration runner with test service URLs and localized indexing enabled. It reused the checked-in generated content catalogs instead of running the external-data refresh in npm prebuild. Postbuild, route and legal checks were run separately. Browser checks covered all three StageLab locales with JavaScript disabled and enabled, native disclosure semantics/state, keyboard navigation, canonical/schema metadata, preserved store buttons, responsive alignment and overflow. The shared Spanish Logbook renderer was also checked to confirm its original callout remains. Tests blocked external services and did not write production data.

Visual review covered the desktop section, expanded maintenance item and mobile layouts in all three languages. It caught and resolved inherited list spacing in the decision flow. Cropped screenshots hide the fixed site header only while capturing so that it does not cover the section; the actual page header remains unchanged.

Review captures: [English desktop](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/stagelab-methodology/en-1440.png>), [English mobile](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/stagelab-methodology/en-390.png>), [Spanish mobile](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/stagelab-methodology/es-419-390.png>), [Portuguese mobile](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/stagelab-methodology/pt-BR-390.png>), [Expanded maintenance](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/stagelab-methodology/accordion-en.png>), [Decision flow](<C:/Users/markl/Desktop/Elevare_Landing_Page/.tmp/stagelab-methodology/flow-en.png>). Screenshots are local review artifacts in the ignored .tmp directory.

## Claim caveats and manual review

The page already promotes both the ongoing StageLab app and standalone website analyses. A scope sentence clarifies that this methodology describes ongoing app prep; a one-time website report does not manage a prep plan or establish longitudinal history. This prevents the new explanation from overstating what a standalone purchase provides.

The supplied verified claims remain qualified: comparable history is conditional; the first check-in is a baseline; readiness ranges and occasional single-week estimates are approximate; division criteria are coaching heuristics; confidence is not a calibrated probability; maintenance is an estimate; combined calorie/activity changes remain possible; recovery safeguards do not imply medical monitoring. Posing scores are explicitly separate from physique and plan decisions. No proprietary formulas, thresholds, rubrics, model settings, prompts or infrastructure details are published.

No implementation blocker remains. The supplied verified claim list was the product authority for the copy; this task did not independently audit StageLab app internals. A product-owner read-through and native-speaker editorial review remain useful before a later publication, but there is no missing translation or technical check awaiting that review. No legal or scientific validation is claimed. Publication requires a later explicit instruction, as requested.

## Full final English section copy

### How StageLab Makes Decisions

Inside the method

AI shouldn't have to be a black box.

StageLab pairs model-assisted assessment with consistent prep rules, progress over time, division context, and safety checks. AI contributes to the assessment; it doesn't independently control your prep plan.

This describes ongoing competition prep in the StageLab app. One-time website analyses are standalone snapshots: they do not manage a prep plan or establish a progress history.

#### Visual readiness

Conditioning, fullness, muscularity, symmetry, and presentation are considered alongside image quality and available comparison history. Model-assisted observations pass through deterministic checks to produce an estimated readiness range for additional conditioning time.

A readiness estimate is approximate, including when it is expressed as a single number of weeks.

#### Progress over time

When comparable history exists, StageLab can compare the current check-in with previous check-ins, the cycle baseline, a saved reference or best look, and weight and waist trends. It considers whether the conditioning gap is closing as show day approaches.

A first check-in establishes a baseline. It cannot show a real longitudinal trend.

#### Body-fat context

An estimated body-fat range provides supporting context. It cannot determine stage readiness on its own. A material conflict with stronger visual evidence can lower confidence instead of forcing a seemingly certain answer.

Photo-based body-fat estimates are approximations, not laboratory measurements.

#### Nutrition & cardio decisions

Before suggesting a change, StageLab considers progress, readiness, adherence, recovery, phase, recent interventions, current activity, the maintenance estimate, and safety constraints. It generally favors measured changes, with broader calorie and activity adjustments possible when persistent or urgent evidence supports them.

Being behind does not automatically trigger a calorie cut.

#### Division-specific context

Different divisions call for different looks. Conditioning, fullness, muscularity, symmetry, and presentation are interpreted in the selected division's context, including the possibility of over-conditioning.

StageLab's division standards are coaching heuristics informed by division characteristics. They are not official federation judging criteria.

#### Confidence & uncertainty

Photo quality, missing history, inconsistent measurements, pose differences, and disagreement between signals can reduce confidence, widen an estimate, or lead to a more conservative result. Limited evidence may trigger a safer fallback or prevent an unsupported conclusion.

StageLab confidence reflects the quality and consistency of the available evidence. It is not a scientifically calibrated probability.

### Posing Is Evaluated Separately

Posing Coach

Posing Coach reviews pose execution and presentation using ordered frames sampled from your posing video. Posing analysis considers division-specific execution, strengths, corrections, and presentation quality.

Posing scores do not alter:

- Body-fat estimates
- Physique readiness
- Calories
- Cardio
- Peak Week decisions

The Posing Score describes presentation. It is not an official judging score, a conditioning or readiness score, or a prediction of placing.

### From evidence to a plan decision

Available check-in context

- Visual assessment
- Division context
- Progress over time
- Weight & waist trends
- Adherence & recovery
- Plan history

1. Reconciled readiness
2. Safety & phase checks
3. Hold or measured adjustment

A conceptual view of the review process. Inputs do not carry equal weight, and not every check-in has every input.

### See More About the Methodology

#### How visual readiness is reconciled

StageLab combines model-assisted visual observations with deterministic prep checks and the athlete's division context. Body-fat context supports that review; it does not overrule stronger evidence or become the sole answer.

The result generally describes an estimated readiness range. A single-week estimate, when shown, is also approximate. Conflicting signals can widen uncertainty rather than produce a precise contest-ready date.

#### How progress history is used

Useful comparisons need sufficiently consistent photos and measurements. When those records exist, StageLab can review the previous check-in, cycle baseline, saved reference or best look, and weight and waist trends.

It considers the direction of change and whether the remaining conditioning gap is closing relative to the time left. Missing or poorly comparable history limits that conclusion; a first check-in supplies a baseline, not a demonstrated trend.

#### How StageLab Estimates Maintenance

StageLab starts with an activity-adjusted formula estimate. When enough reliable data exists, it can incorporate calorie intake from completed logging days and weekly-average weight trends.

The influence of observed data depends on its quality. The system limits abrupt changes driven by noisy short-term fluctuations. This is an adaptive maintenance estimate, not measured TDEE or a precise measurement of energy expenditure.

#### Why StageLab May Hold Instead of Cut

Recovery, adherence, reported injury indicators, declining performance, recent interventions, and accumulated stress can lead StageLab to hold, soften, or reconsider an otherwise aggressive adjustment.

A measured intervention may need time to show its effect. Persistent or urgent evidence can still support combined calorie and activity changes. These are informational prep safeguards, not medical monitoring or a substitute for qualified care.

#### Peak Week Uses Separate Logic

As competition approaches, StageLab transitions from normal prep logic into dedicated Peak Week planning. Daily visual and prep context inform that review, rather than simply extending normal weekly adjustments.

StageLab does not automate dehydration, water cuts, sodium manipulation, or diuretic use.

#### Why posing stays separate

Your physique and how you present it are related, but they answer different questions. Ordered video frames help assess pose execution, strengths, corrections, and presentation in the selected division.

Posing scores do not feed into body-fat estimates, physique readiness, calorie or cardio recommendations, or Peak Week decisions. They do not predict judging outcomes.

### What StageLab Doesn't Claim

StageLab provides information to support your review. It does not provide:

- Laboratory body-fat measurement
- Medical diagnosis or licensed dietetic care
- Guaranteed show readiness or an exact ready date
- Guaranteed placing or exact contest outcomes
- Official judging scores
- Perfect TDEE measurement

StageLab Posing Scores do not represent conditioning or physique readiness.

These coaching heuristics are not scientifically validated physiological laws or readiness predictions. Outputs can be inaccurate or incomplete; review them with appropriate professional guidance.

### Supporting sentence in the existing final CTA

Understand the reasoning behind your next prep decision.
