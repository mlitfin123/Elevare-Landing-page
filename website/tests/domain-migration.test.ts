import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ACTIVE_LEGAL_ROUTES, renderActiveLegalHtml } from "../lib/legal-routes.ts";
import {
  absoluteUrl,
  buildSiteStructuredData,
  LEGACY_SITE_ORIGINS,
  PRIMARY_SITE_ORIGIN,
  siteConfig,
} from "../lib/site.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

function walkFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

test("the canonical website origin is centralized on www.elevarefit.com", () => {
  assert.equal(PRIMARY_SITE_ORIGIN, "https://www.elevarefit.com");
  assert.equal(siteConfig.url, PRIMARY_SITE_ORIGIN);
  assert.equal(absoluteUrl("/stagelab"), "https://www.elevarefit.com/stagelab/");

  const structuredData = JSON.stringify(buildSiteStructuredData());
  assert.match(structuredData, /https:\/\/www\.elevarefit\.com/);
  assert.doesNotMatch(structuredData, /https:\/\/(?:www\.)?elevarefit\.org/);
});

test("Vercel permanently redirects every alternate host path to the canonical host", () => {
  const config = JSON.parse(fs.readFileSync(path.join(projectRoot, "vercel.json"), "utf8")) as {
    redirects?: Array<{
      source: string;
      destination: string;
      permanent?: boolean;
      has?: Array<{ type: string; value?: string }>;
    }>;
  };
  const expectedHosts = ["elevarefit.com", "www.elevarefit.org", "elevarefit.org"];

  for (const host of expectedHosts) {
    const redirect = config.redirects?.find((entry) =>
      entry.has?.some((condition) => condition.type === "host" && condition.value === host),
    );
    assert.ok(redirect, host);
    assert.equal(redirect.source, "/:path*");
    assert.equal(redirect.destination, "https://www.elevarefit.com/:path*");
    assert.equal(redirect.permanent, true);
  }

  assert.deepEqual(LEGACY_SITE_ORIGINS, [
    "https://www.elevarefit.org",
    "https://elevarefit.org",
  ]);
});

test("current legal routes use .com delivery metadata without rewriting archived source", () => {
  for (const route of ACTIVE_LEGAL_ROUTES) {
    const activeHtml = fs.readFileSync(path.join(projectRoot, "public", route.sourceFile), "utf8");
    assert.match(activeHtml, new RegExp(route.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(activeHtml, /https:\/\/(?:www\.)?elevarefit\.org/);
  }

  const source = fs.readFileSync(path.join(projectRoot, "content", "legal", "terms-of-service.html"), "utf8");
  const rendered = renderActiveLegalHtml(source, "/terms-of-service/");
  assert.match(source, /https:\/\/www\.elevarefit\.org\/terms-of-service\//);
  assert.match(rendered, /https:\/\/www\.elevarefit\.com\/terms-of-service\//);
  assert.doesNotMatch(rendered, /https:\/\/www\.elevarefit\.org\/terms-of-service\//);
});

test("existing operational email addresses remain on elevarefit.org", () => {
  for (const email of Object.values(siteConfig.contacts)) {
    assert.match(email, /@elevarefit\.org$/);
    assert.doesNotMatch(email, /@elevarefit\.com$/);
  }

  const activeLegal = ACTIVE_LEGAL_ROUTES
    .map((route) => fs.readFileSync(path.join(projectRoot, "public", route.sourceFile), "utf8"))
    .join("\n");
  assert.match(activeLegal, /mailto:[^"']+@elevarefit\.org/);
  assert.doesNotMatch(activeLegal, /mailto:[^"']+@elevarefit\.com/);
});

test("generated sitemap files contain only the canonical website origin", () => {
  const files = [
    path.join(projectRoot, "public", "sitemap.xml"),
    ...walkFiles(path.join(projectRoot, "public", "sitemaps")).filter((file) => file.endsWith(".xml")),
  ];

  for (const file of files) {
    const xml = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(xml, /https:\/\/(?:www\.)?elevarefit\.org/);
    assert.match(xml, /https:\/\/www\.elevarefit\.com/);
  }
});

test("new signup confirmations and waitlist CORS are ready for the .com origin", () => {
  const authPanel = fs.readFileSync(path.join(projectRoot, "components", "marketplace", "AuthPanel.tsx"), "utf8");
  const waitlistFunction = fs.readFileSync(
    path.join(repositoryRoot, "supabase", "functions", "resend-waitlist", "index.ts"),
    "utf8",
  );

  assert.match(authPanel, /emailRedirectTo: absoluteUrl\("\/account\/"\)/);
  assert.match(waitlistFunction, /"https:\/\/www\.elevarefit\.com"/);
  assert.match(waitlistFunction, /"https:\/\/www\.elevarefit\.org"/);
});
