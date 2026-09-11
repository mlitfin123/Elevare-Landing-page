import assert from "node:assert/strict";
import test from "node:test";
import { ANALYTICS_CONSENT_STORAGE_KEY } from "../lib/analytics-consent.ts";
import { mayRecordAggregateProfileView, normalizeProfileViewChoice, readProfileViewChoice, storeProfileViewChoice, PROFILE_VIEW_CHOICE_KEY } from "../lib/profile-view-privacy.ts";

test("unconsented aggregate counting is limited to supported countries; unknown and other regions wait", () => {
  for (const country of ["US", "GB", "FR", "us"]) {
    assert.equal(mayRecordAggregateProfileView({ country, profileChoice: null, analyticsChoice: null, privacySignal: false }), true);
  }
  for (const country of [null, "", "ZZ", "DE", "ES", "BR", "CA", "US,DE"]) {
    assert.equal(mayRecordAggregateProfileView({ country, profileChoice: null, analyticsChoice: null, privacySignal: false }), false);
    assert.equal(mayRecordAggregateProfileView({ country, profileChoice: "accepted", analyticsChoice: null, privacySignal: false }), true);
    assert.equal(mayRecordAggregateProfileView({ country, profileChoice: null, analyticsChoice: "accepted", privacySignal: false }), false);
  }
});

test("explicit opt-outs and browser privacy signals take precedence; separate opt-in can override a GA-only decline", () => {
  for (const country of ["US", "GB", "FR", "DE", null]) {
    assert.equal(mayRecordAggregateProfileView({ country, profileChoice: "declined", analyticsChoice: "accepted", privacySignal: false }), false);
    assert.equal(mayRecordAggregateProfileView({ country, profileChoice: null, analyticsChoice: "declined", privacySignal: false }), false);
    assert.equal(mayRecordAggregateProfileView({ country, profileChoice: "accepted", analyticsChoice: "declined", privacySignal: false }), true);
    assert.equal(mayRecordAggregateProfileView({ country, profileChoice: "accepted", analyticsChoice: "accepted", privacySignal: true }), false);
  }
  for (const invalid of [undefined, "granted", "true", true, {}, "unset"]) assert.equal(normalizeProfileViewChoice(invalid), null);
});

test("saved preferences preserve past declines, honor browser signals, and survive unavailable storage", t => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const values = new Map<string, string>();
  const browser = Object.assign(new EventTarget(), { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  } });
  const signals = { globalPrivacyControl: false, doNotTrack: "" };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: signals });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator); else Reflect.deleteProperty(globalThis, "navigator");
  });
  assert.equal(readProfileViewChoice(), null);
  values.set(ANALYTICS_CONSENT_STORAGE_KEY, "declined");
  assert.equal(readProfileViewChoice(), "declined");
  storeProfileViewChoice("accepted");
  assert.equal(values.get(PROFILE_VIEW_CHOICE_KEY), "accepted");
  assert.equal(readProfileViewChoice(), "accepted");
  signals.globalPrivacyControl = true;
  assert.equal(readProfileViewChoice(), "declined");
  signals.globalPrivacyControl = false;
  signals.doNotTrack = "1";
  assert.equal(readProfileViewChoice(), "declined");
  signals.doNotTrack = "";
  browser.localStorage.setItem = () => { throw Error("Storage blocked"); };
  storeProfileViewChoice("declined");
  assert.equal(readProfileViewChoice(), "declined");
});
