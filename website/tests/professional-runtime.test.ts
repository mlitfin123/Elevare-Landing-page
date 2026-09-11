import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { invalidationTargets, professionalCache, type InvalidationRecord } from "../lib/professional-cache.ts";
import { validRevalidationSecret, readBoundedJson, parseProfessionalEvent } from "../lib/professional-request.ts";
import { professionalPublicationMessages } from "../lib/i18n/professional-publication-messages.ts";

const id = "11111111-1111-4111-8111-111111111111";
const base: InvalidationRecord = { professional_id: id, revision: 2, delivered_revision: 1, slugs: ["old-name", "new-name"], categories: ["personal-training", "nutrition"], locations: ["us-fl-miami", "us-ny-new-york"], collection_changed: true };
test("public cache targets cover profiles, old/new slugs, localized pages, collections, metadata, home and sitemap", () => {
  const result = invalidationTargets(base);
  for (const tag of [professionalCache.id(id), professionalCache.slug("old-name"), professionalCache.slug("new-name"), professionalCache.collection, professionalCache.homepage, professionalCache.sitemap, professionalCache.category("nutrition"), professionalCache.location("us-fl-miami")]) assert.ok(result.tags.includes(tag));
  for (const path of ["/professionals/old-name/", "/pt-br/professionals/new-name/", "/es/professionals/", "/sitemaps/professionals.xml", "/"]) assert.ok(result.paths.includes(path));
  assert.ok(!result.paths.includes("/account/"));
  assert.deepEqual(result, invalidationTargets(base));
});
test("individual-only events do not purge collection, homepage or unrelated routes", () => {
  const result = invalidationTargets({ ...base, collection_changed: false });
  assert.ok(!result.tags.includes(professionalCache.collection));
  assert.ok(!result.paths.includes("/"));
});
test("untrusted paths and tags cannot enter the purge contract", () => {
  for (const extra of [{ paths: ["/"] }, { tags: ["anything"] }, { eventType: "publish_me" }]) {
    assert.throws(() => parseProfessionalEvent({ professionalId: id, eventType: "profile_changed", ...extra }));
  }
  assert.throws(() => parseProfessionalEvent({ professionalId: "../../", eventType: "profile_changed" }));
  const result = invalidationTargets({ ...base, slugs: ["../../account", "good-slug"], categories: ["/"], locations: ["arbitrary:tag"] });
  assert.ok(result.paths.every((path) => !path.includes("..")));
  assert.ok(!result.tags.includes("professionals-location:arbitrary:tag"));
});
test("secret authentication fails closed and compares fixed-size digests", () => {
  const secret = "a".repeat(40);
  assert.ok(validRevalidationSecret(`Bearer ${secret}`, secret));
  assert.ok(!validRevalidationSecret(`Bearer ${secret}x`, secret));
  assert.ok(!validRevalidationSecret("Bearer short", "short"));
  assert.ok(!validRevalidationSecret(null, undefined));
});
test("request body limits apply even without Content-Length", async () => {
  const request = (body: string, type = "application/json") => new Request("http://localhost", { method: "POST", headers: { "content-type": type }, body });
  await assert.rejects(readBoundedJson(request("x".repeat(1025))));
  await assert.rejects(readBoundedJson(request("{}", "text/plain")));
  assert.deepEqual(await readBoundedJson(request('{"ok":true}')), { ok: true });
});
test("new save states have exact English, Spanish and Portuguese key parity", () => {
  const keys = Object.keys(professionalPublicationMessages.en).sort();
  for (const locale of ["es-419", "pt-BR"] as const) {
    assert.deepEqual(Object.keys(professionalPublicationMessages[locale]).sort(), keys);
    assert.ok(Object.values(professionalPublicationMessages[locale]).every(Boolean));
  }
});
test("mutable public records no longer come from a build snapshot", () => {
  const source = readFileSync(new URL("../lib/marketplace.ts", import.meta.url), "utf8");
  assert.match(source, /marketplace_public_professionals_v3/);
  assert.match(source, /unstable_cache/);
  assert.doesNotMatch(source, /readFile|\.generated|marketplace-data\.json/);
  const scripts = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts;
  assert.doesNotMatch(scripts.prebuild, /generate-marketplace-data/);
  const browser = readFileSync(new URL("../lib/professional-publication-client.ts", import.meta.url), "utf8");
  assert.doesNotMatch(browser, /REVALIDATION_SECRET|SERVICE_ROLE/);
});
