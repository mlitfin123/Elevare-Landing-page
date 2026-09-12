import assert from "node:assert/strict";
import test from "node:test";
import { cleanProfileCardText, getProfileCardFilename, getProfessionalSharingLinks } from "../lib/professional-sharing.ts";
import { professionalShareMessages, getProfessionalShareMessages } from "../lib/i18n/professional-share-messages.ts";

test("sharing stays on canonical public profiles and preserves each supported locale", () => {
  for (const prefix of ["", "/es", "/pt-br"]) {
    const links = getProfessionalSharingLinks(`${prefix}/professionals/alex-rivera`)!;
    assert.equal(links.profileUrl, `https://www.elevarefit.com${prefix}/professionals/alex-rivera/`);
    const facebook = new URL(links.facebookUrl);
    assert.equal(facebook.origin, "https://www.facebook.com");
    assert.equal(facebook.searchParams.get("u"), links.profileUrl);
    assert.deepEqual([...facebook.searchParams.keys()], ["u"]);
  }
  for (const path of ["//evil.example/professionals/alex", "/account/", "/professionals/../account/", "/professionals/alex/?token=private", "/professionals/alex/#private", "https://evil.example/", "/professionals/"]) {
    assert.equal(getProfessionalSharingLinks(path), null);
  }
});

test("download names and card text handle long Unicode names and control characters", () => {
  assert.equal(getProfileCardFilename("/pt-br/professionals/alex-rivera/"), "elevare-alex-rivera-instagram.png");
  assert.doesNotMatch(getProfileCardFilename("/professionals/a<>:\"\\|?*b/"), /[<>:"\\|?*]/);
  assert.equal(cleanProfileCardText("  André\n  López\u202e "), "André López");
  assert.equal(cleanProfileCardText("😀".repeat(200), 5), "😀".repeat(5));
});

test("sharing controls and Instagram instructions are complete in all three languages", () => {
  const keys = Object.keys(professionalShareMessages.en).sort();
  for (const locale of ["en", "es-419", "pt-BR"] as const) {
    const messages = getProfessionalShareMessages(locale);
    assert.deepEqual(Object.keys(messages).sort(), keys);
    assert.ok(Object.values(messages).every(value => value.trim()));
    assert.match(messages.instructions, /Instagram/);
  }
});
