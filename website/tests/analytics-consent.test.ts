import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  buildGoogleAnalyticsBootstrap,
} from "../lib/analytics-consent.ts";
import { sanitizeAnalyticsParams } from "../lib/analytics.ts";

const projectRoot = path.resolve(import.meta.dirname, "..");

test("Consent Mode v2 initializes before GA configuration with privacy-safe defaults", () => {
  const bootstrap = buildGoogleAnalyticsBootstrap("G-NL9H9SEZJ8");

  assert.match(bootstrap, new RegExp(ANALYTICS_CONSENT_STORAGE_KEY));
  assert.match(bootstrap, /analytics_storage: storedChoice === "accepted" \? "granted" : "denied"/);
  assert.match(bootstrap, /ad_storage: "denied"/);
  assert.match(bootstrap, /ad_user_data: "denied"/);
  assert.match(bootstrap, /ad_personalization: "denied"/);
  assert.match(bootstrap, /allow_ad_personalization_signals", false/);
  assert.ok(bootstrap.indexOf('"consent", "default"') < bootstrap.indexOf('"config"'));
  assert.match(bootstrap, /send_page_view: false/);
});

test("consent updates grant analytics only and keep advertising signals denied", () => {
  const consent = readFileSync(path.join(projectRoot, "components", "AnalyticsConsent.tsx"), "utf8");

  assert.match(consent, /analytics_storage: choice === "accepted" \? "granted" : "denied"/);
  assert.match(consent, /ad_storage: "denied"/);
  assert.match(consent, /ad_user_data: "denied"/);
  assert.match(consent, /ad_personalization: "denied"/);
  assert.match(consent, /storeAnalyticsConsentChoice\(nextChoice\)/);
  assert.match(consent, /nextChoice === "declined"\) clearAnalyticsCookies\(\)/);
});

test("advanced consent measurement is not blocked by the stored analytics choice", () => {
  const analytics = readFileSync(path.join(projectRoot, "lib", "analytics.ts"), "utf8");

  assert.doesNotMatch(analytics, /hasAnalyticsConsent/);
  assert.match(analytics, /window\.gtag\("event", eventName, sanitizeAnalyticsParams\(params\)\)/);
});

test("analytics parameters remove direct identifiers and preserve useful dimensions", () => {
  const params = sanitizeAnalyticsParams({
    professional_name: "Example Person",
    professional_slug: "example-person-miami",
    email: "person@example.com",
    user_id: "user-123",
    cta_name: "Download Logbook",
    product: "Logbook",
    value: 0.99,
  });

  assert.deepEqual(params, {
    cta_name: "Download Logbook",
    product: "Logbook",
    value: 0.99,
  });
});

test("page views are manually deduplicated and strip query strings from analytics", () => {
  const tracker = readFileSync(path.join(projectRoot, "components", "GoogleAnalyticsPageTracker.tsx"), "utf8");
  const analytics = readFileSync(path.join(projectRoot, "lib", "analytics.ts"), "utf8");

  assert.match(tracker, /lastTrackedPath\.current === pathname/);
  assert.match(analytics, /pathname\.split\(\/\[\?#\]\//);
  assert.match(analytics, /window\.location\.origin}\$\{sanitizedPath}/);
  assert.doesNotMatch(analytics, /window\.location\.href/);
});

test("marketplace search analytics do not send raw location text", () => {
  const directory = readFileSync(path.join(projectRoot, "components", "marketplace", "MarketplaceDirectory.tsx"), "utf8");

  assert.doesNotMatch(directory, /location: nextFilters\.location/);
  assert.match(directory, /has_location: Boolean\(nextFilters\.location\.trim\(\)\)/);
});

test("effect-based Quick Analysis views are guarded against development replay", () => {
  const checkout = readFileSync(path.join(projectRoot, "components", "quick-analysis", "QuickAnalysisCheckout.tsx"), "utf8");

  assert.match(checkout, /hasTrackedView\.current\) return/);
  assert.match(checkout, /hasTrackedView\.current = true/);
});
