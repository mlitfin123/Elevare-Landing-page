import assert from "node:assert/strict";
import test from "node:test";
import { AGE_ATTESTATION_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "../lib/legal.ts";
import { isCurrentMarketplaceConsent, marketplaceAcknowledgement, marketplaceConsentCopy } from "../lib/marketplace-consent.ts";
const current = { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, ageVersion: AGE_ATTESTATION_VERSION, accepted: false };
test("marketplace client accepts current server versions and distinguishes missing acknowledgement", () => {
  assert.equal(isCurrentMarketplaceConsent(current), true);
  assert.equal(isCurrentMarketplaceConsent({ ...current, accepted: true }), true);
});
test("stale or malformed consent status cannot silently acknowledge unseen documents", () => {
  for (const value of [null, {}, true, { ...current, accepted: "true" }, { ...current, termsVersion: "old" }, { ...current, privacyVersion: "old" }, { ...current, ageVersion: "old" }]) assert.equal(isCurrentMarketplaceConsent(value), false);
  assert.equal("user_id" in marketplaceAcknowledgement, false);
  assert.equal("accepted_at" in marketplaceAcknowledgement, false);
});
test("action acknowledgement has explicit legal, adult, error and recovery labels in all supported locales", () => {
  for (const locale of ["en", "es-419", "pt-BR"] as const) {
    for (const value of Object.values(marketplaceConsentCopy[locale])) assert.ok(value.trim());
    if (locale !== "en") for (const key of ["title", "terms", "privacy", "age", "error", "reload"] as const) assert.notEqual(marketplaceConsentCopy[locale][key], marketplaceConsentCopy.en[key]);
  }
});
