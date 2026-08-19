import assert from "node:assert/strict";
import test from "node:test";
import {
  distanceToMeters,
  formatDistanceForCountry,
  formatMarketplaceLocation,
  formatPublicLocation,
  formatSeoLocation,
  getCountryDisplayName,
  getDefaultCurrencyCode,
  getDistanceUnit,
  getRegionLabel,
  getRegionOptions,
  isRegionRequired,
  metersToDistance,
  normalizeRegionValue,
} from "../lib/marketplace-location.ts";

test("distance helpers preserve legacy U.S. miles and support metric countries", () => {
  const metersFromMiles = distanceToMeters(25, "mi");
  const metersFromKilometers = distanceToMeters(25, "km");

  assert.equal(metersFromMiles, 40234);
  assert.equal(metersFromKilometers, 25000);
  assert.ok(Math.abs(metersToDistance(metersFromMiles, "mi") - 25) < 0.01);
  assert.equal(metersToDistance(metersFromKilometers, "km"), 25);
  assert.equal(formatDistanceForCountry(metersFromMiles, "US"), "25 miles");
  assert.equal(formatDistanceForCountry(metersFromKilometers, "CA"), "25 km");
});

test("country helpers keep U.S. defaults while supporting structured regions", () => {
  assert.equal(getDistanceUnit("US"), "mi");
  assert.equal(getDistanceUnit("CA"), "km");
  assert.equal(getRegionLabel("CA"), "Province / Territory");
  assert.ok(getRegionOptions("CA").some(([code]) => code === "ON"));
  assert.equal(normalizeRegionValue("CA", "Ontario"), "ON");
  assert.equal(isRegionRequired("US"), true);
  assert.equal(isRegionRequired("GB"), false);
});

test("marketplace locations add country context only when useful", () => {
  assert.equal(
    formatMarketplaceLocation({ city: "Miami", region: "FL", countryCode: "US" }),
    "Miami, FL",
  );
  assert.equal(
    formatMarketplaceLocation({ city: "Toronto", region: "ON", countryCode: "CA" }),
    "Toronto, Ontario, Canada",
  );
});

test("public and SEO locations use natural country-aware formats", () => {
  assert.equal(
    formatPublicLocation({ city: "Miami", region: "FL", countryCode: "US" }),
    "Miami, Florida, United States",
  );
  assert.equal(
    formatPublicLocation({ city: "Toronto", region: "ON", countryCode: "CA" }),
    "Toronto, Ontario, Canada",
  );
  assert.equal(
    formatPublicLocation({ city: "London", countryCode: "GB" }),
    "London, United Kingdom",
  );
  assert.equal(
    formatPublicLocation({ city: "Sydney", region: "NSW", countryCode: "AU" }),
    "Sydney, New South Wales, Australia",
  );
  assert.equal(
    formatSeoLocation({ city: "Miami", region: "Florida", countryCode: "US" }),
    "Miami, FL",
  );
  assert.equal(
    formatSeoLocation({ city: "Toronto", region: "ON", countryCode: "CA" }),
    "Toronto, Ontario",
  );
  assert.equal(
    formatSeoLocation({ city: "London", countryCode: "GB" }),
    "London",
  );
});

test("unknown country data is not rewritten as United States", () => {
  assert.equal(getCountryDisplayName(null), "");
  assert.equal(formatPublicLocation({ city: "Madrid", countryCode: null }), "Madrid");
});

test("currency defaults are country-aware without converting amounts", () => {
  assert.equal(getDefaultCurrencyCode("US"), "USD");
  assert.equal(getDefaultCurrencyCode("CA"), "CAD");
  assert.equal(getDefaultCurrencyCode("GB"), "GBP");
  assert.equal(getDefaultCurrencyCode("AU"), "AUD");
  assert.equal(getDefaultCurrencyCode("FR"), "USD");
});
