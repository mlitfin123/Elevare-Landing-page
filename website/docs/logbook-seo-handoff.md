# Logbook SEO handoff

## Implemented on the website

The content-site handoff uses the configured Logbook App Store and Google Play URLs. It records contextual CTA impressions, clicks, and store clicks with the page category, path, slug, position, and copy variant. It does not send calculator inputs or other user-entered values.

The optional mobile sticky treatment is disabled by default through `NEXT_PUBLIC_LOGBOOK_STICKY_CTA_ENABLED=false`. The contextual CTA itself can be paused through `NEXT_PUBLIC_LOGBOOK_CONTEXTUAL_CTA_ENABLED=false`.

## Needed before enabling deep links

No Logbook mobile source or universal-link configuration exists in this repository. Do not enable the `deepLinks` configuration until the mobile app publishes and tests a route contract for each supported action.

That contract should define a verified app or universal link for each supported context, its authenticated fallback, and idempotency rules. A workout import needs a stable shared workout identifier and an upsert or open-existing behavior. A restaurant food handoff needs a stable mapping between the website nutrition-item ID and a Logbook food record, followed by explicit serving and quantity confirmation. The website must not use fuzzy name matching or auto-log food.

## Installation attribution

Website events make page view, CTA impression, CTA click, and store destination observable in the existing analytics system. They do not prove installation or first open.

To connect those later, the mobile team needs to select a deferred deep-link provider or platform-supported equivalent, pass a non-sensitive campaign/context token through the store handoff, and record the matching token on first app open in the mobile analytics system. App Store and Google Play attribution data should then be joined only at aggregate or consent-appropriate levels. Do not treat a store click as an install.
