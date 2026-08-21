import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ACTIVE_LEGAL_ROUTES,
  archiveFileToProductionRoute,
  publicHtmlFileToProductionRoute,
} from "../lib/legal-routes.ts";

const projectRoot = process.cwd();
const publicRoot = path.join(projectRoot, "public");
const outputRoot = path.join(projectRoot, "out");
const siteOrigin = "https://www.elevarefit.org";
const verifyOutput = process.argv.includes("--output");

type ArchiveRecord = {
  documentKey: string;
  version: string;
  effectiveDate: string;
  archiveFilePath: string;
  archivePath: string;
  sha256: string;
};

function normalizedHash(content: Buffer) {
  return createHash("sha256")
    .update(content.toString("utf8").replace(/\r\n?/g, "\n"), "utf8")
    .digest("hex");
}

function extractAttribute(html: string, pattern: RegExp, label: string, sourceFile: string) {
  const value = html.match(pattern)?.[1];
  if (!value) throw new Error(`${sourceFile} is missing ${label}.`);
  return value;
}

function internalPathFromHref(href: string) {
  if (/^(?:mailto:|tel:|#)/i.test(href)) return null;
  if (/^https?:\/\//i.test(href)) {
    const url = new URL(href);
    return url.origin === siteOrigin ? url.pathname : null;
  }
  return href.startsWith("/") ? href.split(/[?#]/, 1)[0] : null;
}

async function pathExists(candidate: string) {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function productionRouteExists(route: string) {
  if (route === "/") {
    return verifyOutput
      ? pathExists(path.join(outputRoot, "index.html"))
      : pathExists(path.join(projectRoot, "app", "page.tsx"));
  }

  const cleanPath = decodeURIComponent(route).replace(/^\/+|\/+$/g, "");
  if (!cleanPath) return false;
  if (/\.[a-z0-9]+$/i.test(cleanPath)) {
    return pathExists(path.join(verifyOutput ? outputRoot : publicRoot, cleanPath));
  }

  const candidates = verifyOutput
    ? [
      path.join(outputRoot, cleanPath, "index.html"),
      path.join(outputRoot, `${cleanPath}.html`),
    ]
    : [
      path.join(publicRoot, cleanPath, "index.html"),
      path.join(publicRoot, `${cleanPath}.html`),
      path.join(projectRoot, "app", cleanPath, "page.tsx"),
    ];
  return (await Promise.all(candidates.map(pathExists))).some(Boolean);
}

async function verifyActiveDocument(route: (typeof ACTIVE_LEGAL_ROUTES)[number]) {
  const sourcePath = path.join(publicRoot, route.sourceFile);
  const html = await fs.readFile(sourcePath, "utf8");
  const derivedRoute = publicHtmlFileToProductionRoute(route.sourceFile);
  if (derivedRoute !== route.route || !(await productionRouteExists(route.route))) {
    throw new Error(`${route.sourceFile} does not map to production route ${route.route}.`);
  }

  const canonical = extractAttribute(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
    "a canonical URL",
    route.sourceFile,
  );
  if (canonical !== route.canonical) {
    throw new Error(`${route.sourceFile} canonical must be ${route.canonical}.`);
  }

  const openGraphUrl = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i)?.[1];
  if (openGraphUrl && openGraphUrl !== route.canonical) {
    throw new Error(`${route.sourceFile} Open Graph URL must match its canonical URL.`);
  }

  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const href of hrefs) {
    if (/\.html(?:[?#]|$)/i.test(href)) {
      throw new Error(`${route.sourceFile} contains a source-file link instead of a production route: ${href}`);
    }
    const internalPath = internalPathFromHref(href);
    if (!internalPath && !/^(?:https?:\/\/|mailto:|tel:|#)/i.test(href)) {
      throw new Error(`${route.sourceFile} contains a relative internal link instead of a root-relative production route: ${href}`);
    }
    if (internalPath && !(await productionRouteExists(internalPath))) {
      throw new Error(`${route.sourceFile} links to missing production route ${internalPath}.`);
    }
  }
}

async function verifyArchives() {
  const manifestPath = path.join(publicRoot, "legal", "legal-document-versions.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as { documents: ArchiveRecord[] };
  for (const record of manifest.documents) {
    const archiveFile = path.join(publicRoot, record.archiveFilePath.replace(/^\//, ""));
    const content = await fs.readFile(archiveFile);
    if (normalizedHash(content) !== record.sha256) {
      throw new Error(`${record.documentKey} ${record.version} archive hash does not match its manifest.`);
    }
    if (record.archivePath.endsWith(".html")) {
      throw new Error(`${record.documentKey} ${record.version} manifest uses a source filename as its production URL.`);
    }
    if (archiveFileToProductionRoute(record.archiveFilePath) !== record.archivePath) {
      throw new Error(`${record.documentKey} ${record.version} archive file and production route do not align.`);
    }
    if (!(await productionRouteExists(record.archivePath))) {
      throw new Error(`${record.documentKey} ${record.version} archive production route is missing.`);
    }
    const archiveHtml = content.toString("utf8");
    const archiveCanonical = archiveHtml.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
    if (archiveCanonical) {
      const canonicalPath = internalPathFromHref(archiveCanonical);
      if (!canonicalPath || !(await productionRouteExists(canonicalPath))) {
        throw new Error(`${record.documentKey} ${record.version} archive canonical does not resolve.`);
      }
    }
    const archiveOpenGraphUrl = archiveHtml.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i)?.[1];
    if (archiveOpenGraphUrl) {
      const openGraphPath = internalPathFromHref(archiveOpenGraphUrl);
      if (!openGraphPath || !(await productionRouteExists(openGraphPath))) {
        throw new Error(`${record.documentKey} ${record.version} archive Open Graph URL does not resolve.`);
      }
    }
    if (verifyOutput && !(await pathExists(path.join(outputRoot, record.archiveFilePath.replace(/^\//, ""))))) {
      throw new Error(`${record.documentKey} ${record.version} archive file is missing from the static output.`);
    }
  }
  return manifest.documents.length;
}

await Promise.all(ACTIVE_LEGAL_ROUTES.map(verifyActiveDocument));
const archiveCount = await verifyArchives();
console.log(`Verified ${ACTIVE_LEGAL_ROUTES.length} active legal routes and ${archiveCount} archive routes${verifyOutput ? " in static output" : ""}.`);
