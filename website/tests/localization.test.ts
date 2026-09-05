import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getSafeAuthRedirect } from "../lib/auth-redirect.ts";
import {
  areLocalizedRoutesEnabled,
  getLocalizedRouteParams,
  getLocaleSwitchHref,
  isLocalizedIndexingEnabled,
  LOCALIZED_MARKETING_PATHS,
  localizePathname,
  normalizeLocale,
  resolvePreferredLocale,
} from "../lib/i18n/config.ts";
import { getTranslation, interpolate, pluralize } from "../lib/i18n/translate.ts";
import english from "../locales/en/marketing.ts";
import spanish from "../locales/es-419/marketing.ts";
import portuguese from "../locales/pt-BR/marketing.ts";
import englishQuickAnalysis from "../locales/en/quick-analysis.ts";
import spanishQuickAnalysis from "../locales/es-419/quick-analysis.ts";
import portugueseQuickAnalysis from "../locales/pt-BR/quick-analysis.ts";
import {
  inferLocalizedDocumentLocale,
  setDocumentLanguage,
} from "../scripts/finalize-localized-html.ts";

const projectRoot = process.cwd();

function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (Array.isArray(value)) return value.flatMap((item, index) => leafPaths(item, `${prefix}[${index}]`));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
}

function stringLeaves(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  if (Array.isArray(value)) return value.flatMap((item, index) => stringLeaves(item, `${prefix}[${index}]`));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => stringLeaves(child, prefix ? `${prefix}.${key}` : key));
}

function placeholders(value: string) {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

test("locale normalization is conservative and supports the rollout locales", () => {
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(normalizeLocale("es-MX"), "es-419");
  assert.equal(normalizeLocale("es-419"), "es-419");
  assert.equal(normalizeLocale("pt-BR"), "pt-BR");
  assert.equal(normalizeLocale("pt-PT"), "en");
  assert.equal(normalizeLocale("fr-FR"), "en");
});

test("locale preference precedence is explicit, authenticated, saved, browser, then English", () => {
  assert.equal(resolvePreferredLocale({ explicitLocale: "pt-BR", authenticatedLocale: "es-MX", savedLocale: "en", browserLocales: ["en-US"] }), "pt-BR");
  assert.equal(resolvePreferredLocale({ authenticatedLocale: "es-MX", savedLocale: "pt-BR", browserLocales: ["en-US"] }), "es-419");
  assert.equal(resolvePreferredLocale({ savedLocale: "pt-BR", browserLocales: ["es-MX"] }), "pt-BR");
  assert.equal(resolvePreferredLocale({ browserLocales: ["fr-FR", "es-MX"] }), "es-419");
  assert.equal(resolvePreferredLocale({ browserLocales: ["fr-FR"] }), "en");
});

test("localized marketing routes preserve English URLs and equivalent product paths", () => {
  assert.deepEqual(LOCALIZED_MARKETING_PATHS, [
    "/",
    "/logbook/",
    "/stagelab/",
    "/stagelab/quick-analysis/",
    "/stagelab/quick-analysis/result/",
  ]);
  assert.equal(localizePathname("/logbook/", "en"), "/logbook/");
  assert.equal(localizePathname("/logbook/", "es-419"), "/es/logbook/");
  assert.equal(localizePathname("/pt-br/stagelab/", "es-419"), "/es/stagelab/");
  assert.equal(getLocaleSwitchHref("/es/logbook/", "pt-BR"), "/pt-br/logbook/");
  assert.equal(getLocaleSwitchHref("/es/stagelab/quick-analysis/", "pt-BR"), "/pt-br/stagelab/quick-analysis/");
  assert.equal(localizePathname("/account/", "es-419"), "/es/");
});

test("localized routes and indexing require separate opt-in flags", () => {
  assert.equal(areLocalizedRoutesEnabled({ NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES: "false" }), false);
  assert.equal(isLocalizedIndexingEnabled({ NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES: "true", ENABLE_LOCALIZED_INDEXING: "false" }), false);
  assert.equal(isLocalizedIndexingEnabled({ NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES: "true", ENABLE_LOCALIZED_INDEXING: "true" }), true);
});

test("localized route generation obeys the public route flag", () => {
  const previous = process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES;
  process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES = "false";
  assert.deepEqual(getLocalizedRouteParams(), []);
  process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES = "true";
  assert.equal(getLocalizedRouteParams().length, 10);
  if (previous === undefined) delete process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES;
  else process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES = previous;
});

test("Spanish and Portuguese dictionaries cover every English marketing leaf", () => {
  assert.deepEqual(leafPaths(spanish), leafPaths(english));
  assert.deepEqual(leafPaths(portuguese), leafPaths(english));
});

test("Quick Analysis dictionaries preserve key and interpolation-placeholder parity", () => {
  assert.deepEqual(leafPaths(spanishQuickAnalysis), leafPaths(englishQuickAnalysis));
  assert.deepEqual(leafPaths(portugueseQuickAnalysis), leafPaths(englishQuickAnalysis));

  const englishLeaves = new Map(stringLeaves(englishQuickAnalysis));
  for (const dictionary of [spanishQuickAnalysis, portugueseQuickAnalysis]) {
    for (const [key, value] of stringLeaves(dictionary)) {
      assert.deepEqual(placeholders(value), placeholders(englishLeaves.get(key) ?? ""), key);
    }
  }
});

test("generated localized HTML receives the correct language before hydration", () => {
  const source = '<!doctype html><html lang="en" suppressHydrationWarning><body>Content</body></html>';
  assert.match(setDocumentLanguage(source, "en"), /<html lang="en"/);
  assert.match(setDocumentLanguage(source, "es-419"), /<html lang="es-419"/);
  assert.match(setDocumentLanguage(source, "pt-BR"), /<html lang="pt-BR"/);
  assert.equal(inferLocalizedDocumentLocale("es/logbook.html"), "es-419");
  assert.equal(inferLocalizedDocumentLocale("pt-br/stagelab/quick-analysis.html"), "pt-BR");
  assert.equal(inferLocalizedDocumentLocale("logbook.html"), null);

  const runtimeSource = fs.readFileSync(path.join(projectRoot, "components/localization/LocaleRuntime.tsx"), "utf8");
  const packageSource = fs.readFileSync(path.join(projectRoot, "package.json"), "utf8");
  assert.match(runtimeSource, /document\.documentElement\.lang = activeLocale/);
  assert.match(packageSource, /npm run localization:html/);
});

test("translation helpers interpolate, pluralize, and fall back without exposing raw keys", () => {
  assert.equal(interpolate("{count} profiles", { count: 12 }), "12 profiles");
  assert.equal(getTranslation({ greeting: "Hola" }, { greeting: "Hello" }, "greeting"), "Hola");
  assert.equal(getTranslation({}, { greeting: "Hello" }, "greeting"), "Hello");
  assert.equal(getTranslation({}, {}, "missing.key"), "");
  assert.equal(pluralize("es-419", 1, { one: "{count} perfil", other: "{count} perfiles" }), "1 perfil");
  assert.equal(pluralize("pt-BR", 2, { one: "{count} perfil", other: "{count} perfis" }), "2 perfis");
});

test("authentication redirects accept only same-origin root-relative destinations", () => {
  assert.equal(getSafeAuthRedirect("/es/logbook/"), "/es/logbook/");
  assert.equal(getSafeAuthRedirect("//evil.example/path"), "/account/");
  assert.equal(getSafeAuthRedirect("https://evil.example/path"), "/account/");
  assert.equal(getSafeAuthRedirect("/\\evil.example"), "/account/");
});

test("SEO rollout excludes localized routes until indexing review is enabled", () => {
  const envExample = fs.readFileSync(path.join(projectRoot, ".env.example"), "utf8");
  const sitemapSource = fs.readFileSync(path.join(projectRoot, "scripts/generate-sitemaps.ts"), "utf8");
  const routeSource = fs.readFileSync(path.join(projectRoot, "app/[locale]/[[...slug]]/page.tsx"), "utf8");

  assert.match(envExample, /NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES=false/);
  assert.match(envExample, /ENABLE_LOCALIZED_INDEXING=false/);
  assert.match(sitemapSource, /isLocalizedIndexingEnabled\(\)/);
  assert.match(routeSource, /index: false, follow: false/);
  assert.match(routeSource, /localizedAlternates: true/);
});

test("private flows stay outside the localized route allowlist while Quick Analysis is localized", () => {
  for (const pathName of ["/sign-in/", "/account/", "/professionals/", "/shop/", "/privacy-policy/", "/terms-of-service/"]) {
    assert.equal(LOCALIZED_MARKETING_PATHS.includes(pathName as never), false);
  }
  assert.equal(LOCALIZED_MARKETING_PATHS.includes("/stagelab/quick-analysis/"), true);
  assert.equal(LOCALIZED_MARKETING_PATHS.includes("/stagelab/quick-analysis/result/"), true);
});

test("localized pages preserve supported routes and identify deferred destinations as English", () => {
  const home = fs.readFileSync(path.join(projectRoot, "components/localization/LocalizedHomePage.tsx"), "utf8");
  const product = fs.readFileSync(path.join(projectRoot, "components/localization/LocalizedProductPage.tsx"), "utf8");
  const header = fs.readFileSync(path.join(projectRoot, "components/Header.tsx"), "utf8");
  const footer = fs.readFileSync(path.join(projectRoot, "components/Footer.tsx"), "utf8");

  assert.match(home, /localizePathname\(getQuickAnalysisEntryHref\("homepage"\), locale\)/);
  assert.match(product, /localizePathname\(getQuickAnalysisEntryHref\("stagelab"\), locale\)/);
  assert.match(home, /hrefLang=\{hrefLanguage/);
  assert.match(header, /hrefLang=\{englishOnlyHrefLang\}/);
  assert.match(footer, /hrefLang="en"/);
  for (const pathName of ["/calculators/", "/exercises/", "/workouts/", "/nutrition/", "/professionals/", "/shop/", "/blog/"]) {
    assert.equal(localizePathname(pathName, "es-419"), "/es/");
    assert.equal(localizePathname(pathName, "pt-BR"), "/pt-br/");
  }
});

test("analytics preserves event names while adding only a non-sensitive locale dimension", () => {
  const source = fs.readFileSync(path.join(projectRoot, "lib/analytics.ts"), "utf8");
  assert.match(source, /locale: localeFromPathname/);
  assert.doesNotMatch(source, /context_text|photo|body_fat|stage_readiness/);
});

test("shared analytics consent follows the active localized route", () => {
  const consentSource = fs.readFileSync(path.join(projectRoot, "components/AnalyticsConsent.tsx"), "utf8");
  const shellSource = fs.readFileSync(path.join(projectRoot, "lib/i18n/shell-messages.ts"), "utf8");
  assert.match(consentSource, /localeFromPathname\(pathname\)/);
  assert.match(consentSource, /consentMessages\.accept/);
  assert.match(consentSource, /hrefLang="en"/);
  assert.match(shellSource, /Aceptar Google Analytics/);
  assert.match(shellSource, /Aceitar Google Analytics/);
});
