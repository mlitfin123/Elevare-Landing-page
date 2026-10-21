import assert from "node:assert/strict";
import test from "node:test";
import { focusProfileField, profileFieldTarget } from "../lib/profile-field-navigation.ts";
import { professionalPublicationMessages } from "../lib/i18n/professional-publication-messages.ts";

test("validation targets open the appropriate section, including category aliases and terms", () => {
  assert.deepEqual(profileFieldTarget("name"), { section: "about", id: "profile-field-name" });
  assert.deepEqual(profileFieldTarget("primaryCategory"), profileFieldTarget("specialties"));
  assert.equal(profileFieldTarget("pricing")?.section, "pricing");
  assert.equal(profileFieldTarget("credentials")?.section, "credentials");
  assert.deepEqual(profileFieldTarget("terms"), { section: undefined, id: "profile-field-terms" });
  assert.equal(profileFieldTarget("save_failed"), null);
  assert.equal(profileFieldTarget("constructor"), null);
});

test("a missing or unmounted field does not move focus", () => {
  const root = { getElementById: () => null } as unknown as Document;
  assert.equal(focusProfileField("missing", root, true), false);
});

test("focus skips hidden and disabled controls and respects reduced motion", () => {
  const calls: unknown[] = [];
  const control = (disabled: boolean, visible: boolean) => ({ matches: () => disabled,
    getClientRects: () => visible ? [{}] : [], focus: (options: unknown) => calls.push(options) });
  const input = control(false, true);
  const target = { querySelectorAll: () => [control(true, true), control(false, false), input],
    scrollIntoView: (options: unknown) => calls.push(options) };
  const root = { getElementById: () => target } as unknown as Document;
  assert.equal(focusProfileField("profile-field-name", root, true), true);
  assert.deepEqual(calls, [{ preventScroll: true }, { behavior: "instant", block: "center" }]);
});

test("button-only fields and empty groups remain keyboard reachable", () => {
  const calls: string[] = [];
  const button = { matches: () => false, getClientRects: () => [{}], focus: () => calls.push("button") };
  const target = { querySelectorAll: (selector: string) => selector === "button" ? [button] : [],
    scrollIntoView: () => {}, setAttribute: () => calls.push("tabindex"), focus: () => calls.push("group") };
  const root = { getElementById: () => target } as unknown as Document;
  focusProfileField("photo", root, false);
  target.querySelectorAll = () => [];
  focusProfileField("group", root, false);
  assert.deepEqual(calls, ["button", "tabindex", "group"]);
});

test("validation navigation copy is available in every supported language", () => {
  const labels = Object.values(professionalPublicationMessages).map(copy => copy.goToField);
  assert.equal(new Set(labels).size, 3);
  assert.ok(Object.values(professionalPublicationMessages).every(copy => copy.reviewFields.length > 0));
});
