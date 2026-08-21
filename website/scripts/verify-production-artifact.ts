import fs from "node:fs";
import path from "node:path";
import {
  buildLegacyRedirects,
  MARKETPLACE_FILTER_QUERY_KEYS,
  RETIRED_WORKOUT_REDIRECTS,
  type LegacyRedirect,
} from "../lib/legacy-routes.ts";
import { getLegacyToolPath, tools } from "../lib/tools.ts";
import { LEGACY_SITE_ORIGINS, siteConfig } from "../lib/site.ts";

const projectRoot = process.cwd();
const outDirectory = path.join(projectRoot, "out");
const redirectArtifactPath = path.join(projectRoot, "config", "redirects.json");
const vercelConfigPath = path.join(projectRoot, "vercel.json");
const nextConfigPath = path.join(projectRoot, "next.config.ts");

type VercelConfig = {
  bulkRedirectsPath?: string;
  trailingSlash?: boolean;
  outputDirectory?: string;
  redirects?: Array<{
    source: string;
    destination: string;
    permanent?: boolean;
    has?: Array<{ type: string; key?: string; value?: string }>;
  }>;
  headers?: Array<{
    source: string;
    has?: Array<{ type: string; key: string }>;
    headers?: Array<{ key: string; value: string }>;
  }>;
};

function walkFiles(directory: string, extension?: string): string[] {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) return walkFiles(fullPath, extension);
    if (!extension || entry.name.endsWith(extension)) return [fullPath];
    return [];
  });
}

function outputPagePath(pathname: string) {
  const cleanPath = pathname.replace(/^\/+|\/+$/g, "");
  return cleanPath ? path.join(outDirectory, cleanPath, "index.html") : path.join(outDirectory, "index.html");
}

function normalizeHref(href: string) {
  try {
    const pathname = new URL(href, siteConfig.url).pathname;
    return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  } catch {
    return href;
  }
}

function extractInternalHrefs(html: string) {
  return [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)]
    .map((match) => match[1] ?? "")
    .filter((href) => href.startsWith("/") && !href.startsWith("//"));
}

function failIfIssues(label: string, issues: string[]) {
  if (issues.length === 0) return;
  throw new Error(`${label}:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
}

if (!fs.existsSync(outDirectory)) {
  throw new Error("Static export output is missing. Run `npm run build` first.");
}

const expectedRedirects = buildLegacyRedirects();
const actualRedirects = JSON.parse(fs.readFileSync(redirectArtifactPath, "utf8")) as LegacyRedirect[];
const expectedRedirectJson = JSON.stringify(expectedRedirects);
const actualRedirectJson = JSON.stringify(actualRedirects);

if (expectedRedirectJson !== actualRedirectJson) {
  throw new Error("Generated redirect artifact does not match the canonical legacy route map.");
}

const redirectBySource = new Map(actualRedirects.map((redirect) => [redirect.source, redirect]));
const redirectIssues: string[] = [];

for (const redirect of expectedRedirects) {
  const actual = redirectBySource.get(redirect.source);

  if (!actual || actual.destination !== redirect.destination || actual.permanent !== true) {
    redirectIssues.push(`${redirect.source} should redirect permanently to ${redirect.destination}`);
  }
}

failIfIssues("Redirect validation failed", redirectIssues);

const retiredWorkoutPageIssues: string[] = [];
const sitemapXml = walkFiles(path.join(outDirectory, "sitemaps"), ".xml")
  .map((filePath) => fs.readFileSync(filePath, "utf8"))
  .join("\n");

for (const redirect of RETIRED_WORKOUT_REDIRECTS) {
  if (fs.existsSync(outputPagePath(`/workouts/${redirect.sourceSlug}`))) {
    retiredWorkoutPageIssues.push(`${redirect.sourceSlug} was exported as a static page`);
  }

  if (!fs.existsSync(outputPagePath(`/workouts/${redirect.destinationSlug}`))) {
    retiredWorkoutPageIssues.push(`${redirect.destinationSlug} canonical page is missing`);
  }

  if (sitemapXml.includes(`/workouts/${redirect.sourceSlug}/`)) {
    retiredWorkoutPageIssues.push(`${redirect.sourceSlug} remains in a sitemap`);
  }
}

failIfIssues("Retired workout artifact validation failed", retiredWorkoutPageIssues);

const legacyToolPageIssues: string[] = [];

if (fs.existsSync(path.join(outDirectory, "tools", "index.html"))) {
  legacyToolPageIssues.push("/tools/ was exported as a static page");
}

for (const tool of tools) {
  const legacyPath = getLegacyToolPath(tool.slug);

  if (fs.existsSync(outputPagePath(legacyPath))) {
    legacyToolPageIssues.push(`${legacyPath}/ was exported as a static page`);
  }

  if (sitemapXml.includes(`${legacyPath}/`)) {
    legacyToolPageIssues.push(`${legacyPath}/ remains in a sitemap`);
  }
}

if (!fs.existsSync(outputPagePath("/tools/workout-generator"))) {
  legacyToolPageIssues.push("Intentional /tools/workout-generator/ page is missing");
}

failIfIssues("Legacy tool artifact validation failed", legacyToolPageIssues);

const retiredWorkoutPaths = new Set(
  RETIRED_WORKOUT_REDIRECTS.map((redirect) => `/workouts/${redirect.sourceSlug}`),
);
const legacyToolPaths = new Set(tools.map((tool) => normalizeHref(getLegacyToolPath(tool.slug))));
legacyToolPaths.add("/tools");
const retiredInternalLinks: string[] = [];
const legacyToolInternalLinks: string[] = [];

for (const htmlPath of walkFiles(outDirectory, ".html")) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const page = path.relative(outDirectory, htmlPath).replaceAll("\\", "/");

  for (const href of extractInternalHrefs(html)) {
    const normalizedHref = normalizeHref(href);

    if (retiredWorkoutPaths.has(normalizedHref)) {
      retiredInternalLinks.push(`${page} -> ${href}`);
    }

    if (legacyToolPaths.has(normalizedHref)) {
      legacyToolInternalLinks.push(`${page} -> ${href}`);
    }
  }
}

failIfIssues("Generated HTML contains retired workout links", retiredInternalLinks);
failIfIssues("Generated HTML contains legacy tool links", legacyToolInternalLinks);

const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, "utf8")) as VercelConfig;

if (vercelConfig.bulkRedirectsPath !== "config/redirects.json") {
  throw new Error("vercel.json does not reference the generated redirect artifact.");
}

if (vercelConfig.trailingSlash !== true) {
  throw new Error("vercel.json must preserve the canonical trailing-slash policy.");
}

if (vercelConfig.outputDirectory !== undefined) {
  throw new Error("vercel.json must not override Vercel's Next.js framework output directory.");
}

const nextConfigSource = fs.readFileSync(nextConfigPath, "utf8");

if (!/output:\s*["']export["']/.test(nextConfigSource)) {
  throw new Error("next.config.ts must retain output: export so Next.js generates the static out/ artifact.");
}

const requiredRedirectHosts = ["elevarefit.com", "www.elevarefit.org", "elevarefit.org"];
const domainRedirectIssues = requiredRedirectHosts.flatMap((host) => {
  const redirect = (vercelConfig.redirects ?? []).find((entry) =>
    entry.source === "/:path*"
    && entry.has?.some((condition) => condition.type === "host" && condition.value === host),
  );

  if (!redirect) return [`Missing host redirect for ${host}`];
  if (redirect.destination !== `${siteConfig.url}/:path*`) return [`${host} does not redirect path-for-path to the canonical host`];
  if (redirect.permanent !== true) return [`${host} redirect is not permanent`];
  return [];
});

failIfIssues("Domain redirect validation failed", domainRedirectIssues);

const protectedFilterKeys = new Set(
  (vercelConfig.headers ?? []).flatMap((entry) =>
    entry.has?.filter((condition) => condition.type === "query").map((condition) => {
      const robotsHeader = entry.headers?.find((header) => header.key.toLowerCase() === "x-robots-tag");
      return robotsHeader?.value.toLowerCase() === "noindex, follow" ? condition.key : "";
    }) ?? [],
  ).filter(Boolean),
);
const missingFilterHeaders = MARKETPLACE_FILTER_QUERY_KEYS.filter((key) => !protectedFilterKeys.has(key));

failIfIssues(
  "Filtered marketplace response-header validation failed",
  missingFilterHeaders.map((key) => `Missing noindex, follow header rule for ${key}`),
);

const unconditionalMarketplaceNoindex = (vercelConfig.headers ?? []).some((entry) =>
  entry.source.startsWith("/professionals")
  && (!entry.has || entry.has.length === 0)
  && entry.headers?.some(
    (header) => header.key.toLowerCase() === "x-robots-tag" && header.value.toLowerCase().includes("noindex"),
  ),
);

if (unconditionalMarketplaceNoindex) {
  throw new Error("The unfiltered marketplace root would receive an unconditional noindex header.");
}

const latestPrepDirectory = path.join(
  outDirectory,
  "blog-posts",
  "mens-physique-classic-physique-prep-7-weeks-out",
);
const prepImageIssues = ["front.webp", "side.webp", "back.webp"].flatMap((fileName) => {
  const filePath = path.join(latestPrepDirectory, fileName);

  if (!fs.existsSync(filePath)) return [`Missing optimized Prep image ${fileName}`];
  if (fs.statSync(filePath).size > 250_000) return [`Optimized Prep image ${fileName} exceeds 250 KB`];
  return [];
});
const latestPrepHtml = fs.readFileSync(
  outputPagePath("/blog/mens-physique-classic-physique-prep-7-weeks-out"),
  "utf8",
);

for (const fileName of ["front.webp", "side.webp", "back.webp"]) {
  const imageTag = latestPrepHtml.match(new RegExp(`<img[^>]+${fileName.replace(".", "\\.")}[^>]*>`, "i"))?.[0] ?? "";

  if (!/\bwidth="296"/.test(imageTag) || !/\bheight="640"/.test(imageTag)) {
    prepImageIssues.push(`${fileName} is missing explicit 296x640 dimensions`);
  }

  if (!/\bloading="lazy"/.test(imageTag)) {
    prepImageIssues.push(`${fileName} is not lazy-loaded`);
  }
}

failIfIssues("Prep image artifact validation failed", prepImageIssues);

const legacyWebsiteUrlPattern = /https:\/\/(?:www\.)?elevarefit\.org\b/i;
const activeDomainIssues: string[] = [];

for (const htmlPath of walkFiles(outDirectory, ".html")) {
  const page = path.relative(outDirectory, htmlPath).replaceAll("\\", "/");
  if (page.startsWith("legal/archive/")) continue;

  const html = fs.readFileSync(htmlPath, "utf8");
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  const openGraphUrl = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i)?.[1];

  if (canonical && new URL(canonical).origin !== siteConfig.url) {
    activeDomainIssues.push(`${page} has a non-canonical-domain canonical: ${canonical}`);
  }
  if (openGraphUrl && new URL(openGraphUrl).origin !== siteConfig.url) {
    activeDomainIssues.push(`${page} has a non-canonical-domain Open Graph URL: ${openGraphUrl}`);
  }
  if (legacyWebsiteUrlPattern.test(html)) {
    activeDomainIssues.push(`${page} contains an active legacy-domain website URL`);
  }
}

const sitemapIndexXml = fs.readFileSync(path.join(outDirectory, "sitemap.xml"), "utf8");
if (legacyWebsiteUrlPattern.test(`${sitemapIndexXml}\n${sitemapXml}`)) {
  activeDomainIssues.push("Generated sitemap output contains a legacy-domain URL");
}
if (![...sitemapIndexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].every((match) => match[1]?.startsWith(`${siteConfig.url}/`))) {
  activeDomainIssues.push("Sitemap index contains a URL outside the canonical origin");
}

const robotsTxt = fs.readFileSync(path.join(outDirectory, "robots.txt"), "utf8");
if (!robotsTxt.includes(`Sitemap: ${siteConfig.url}/sitemap.xml`) || legacyWebsiteUrlPattern.test(robotsTxt)) {
  activeDomainIssues.push("robots.txt does not advertise only the canonical .com sitemap");
}

failIfIssues("Canonical domain artifact validation failed", activeDomainIssues);

if (!LEGACY_SITE_ORIGINS.every((origin) => origin.endsWith("elevarefit.org"))) {
  throw new Error("Legacy origin allowlist must remain limited to the historical website domain.");
}

const sitemapUrlCount = [...sitemapXml.matchAll(/<url>/g)].length;
const htmlCount = walkFiles(outDirectory, ".html").length;

console.log("Production artifact validation passed.");
console.log(`Exported static HTML files: ${htmlCount}`);
console.log(`Sitemap URLs: ${sitemapUrlCount}`);
console.log(`Retired workout pages: 0`);
console.log(`Retired workout internal links: 0`);
console.log(`Legacy tool internal links: 0`);
console.log(`Permanent legacy redirects: ${actualRedirects.length}`);
console.log(`Filtered marketplace header rules: ${protectedFilterKeys.size}`);
console.log(`Permanent domain redirects: ${requiredRedirectHosts.length}`);
