import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

const accountRoutes = [
  "account/page.tsx",
  "account/client-requests/page.tsx",
  "account/inquiries/page.tsx",
  "account/professional-profile/page.tsx",
  "account/profile/page.tsx",
  "account/saved/page.tsx",
] as const;

test("all account routes inherit noindex and nofollow metadata", () => {
  const accountLayout = readFileSync(path.join(projectRoot, "app/account/layout.tsx"), "utf8");

  assert.match(accountLayout, /robots:\s*\{[\s\S]*?index:\s*false,[\s\S]*?follow:\s*false/);

  for (const route of accountRoutes) {
    assert.equal(existsSync(path.join(projectRoot, "app", route)), true, `${route} must remain under the protected layout`);
  }
});

test("the combined sign-in and sign-up page is noindex and nofollow", () => {
  const signInPage = readFileSync(path.join(projectRoot, "app/sign-in/page.tsx"), "utf8");

  assert.match(signInPage, /robots:\s*\{[\s\S]*?index:\s*false,[\s\S]*?follow:\s*false/);
});

test("robots.txt permits crawling so search engines can process noindex", () => {
  const robotsSource = readFileSync(path.join(projectRoot, "app/robots.ts"), "utf8");

  assert.doesNotMatch(robotsSource, /disallow:[^\n]*(?:account|sign-in|signin|signup)/i);
});

test("private utility routes are excluded from every generated sitemap", () => {
  const sitemapDirectory = path.join(projectRoot, "public/sitemaps");
  const sitemapFiles = [
    path.join(projectRoot, "public/sitemap.xml"),
    ...readdirSync(sitemapDirectory)
      .filter((filename) => filename.endsWith(".xml"))
      .map((filename) => path.join(sitemapDirectory, filename)),
  ];
  const privateRoutePattern = /\/(?:account|sign-in|signin|signup|sign-up)(?:\/|<)/i;

  for (const sitemapFile of sitemapFiles) {
    assert.doesNotMatch(readFileSync(sitemapFile, "utf8"), privateRoutePattern, path.basename(sitemapFile));
  }
});
