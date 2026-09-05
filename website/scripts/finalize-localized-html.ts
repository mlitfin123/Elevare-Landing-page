import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Locale } from "../lib/i18n/config.ts";

const LOCALIZED_SEGMENTS: Record<string, Exclude<Locale, "en">> = {
  es: "es-419",
  "pt-br": "pt-BR",
};

export function inferLocalizedDocumentLocale(relativePath: string): Exclude<Locale, "en"> | null {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
  const firstSegment = normalized.split("/")[0]?.replace(/\.html$/i, "").toLowerCase();
  return firstSegment ? LOCALIZED_SEGMENTS[firstSegment] ?? null : null;
}

export function setDocumentLanguage(html: string, locale: Locale): string {
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0];
  if (!htmlTag) throw new Error("Generated document is missing an <html> element.");

  const nextTag = /\blang\s*=\s*(["'])[^"']*\1/i.test(htmlTag)
    ? htmlTag.replace(/\blang\s*=\s*(["'])[^"']*\1/i, `lang="${locale}"`)
    : htmlTag.replace(/<html\b/i, `<html lang="${locale}"`);

  return html.replace(htmlTag, nextTag);
}

function walkHtmlFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkHtmlFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [entryPath] : [];
  });
}

export function finalizeLocalizedHtml(root = process.cwd()): { inspected: number; updated: number } {
  const outputRoots = [path.join(root, ".next", "server", "app"), path.join(root, "out")]
    .filter((directory, index, directories) => fs.existsSync(directory) && directories.indexOf(directory) === index);
  let inspected = 0;
  let updated = 0;

  for (const outputRoot of outputRoots) {
    for (const filePath of walkHtmlFiles(outputRoot)) {
      const relativePath = path.relative(outputRoot, filePath);
      const locale = inferLocalizedDocumentLocale(relativePath);
      if (!locale) continue;

      inspected += 1;
      const original = fs.readFileSync(filePath, "utf8");
      const localized = setDocumentLanguage(original, locale);
      if (localized !== original) {
        fs.writeFileSync(filePath, localized);
        updated += 1;
      }

      const persisted = fs.readFileSync(filePath, "utf8");
      if (!new RegExp(`<html\\b[^>]*\\blang=["']${locale}["']`, "i").test(persisted)) {
        throw new Error(`Localized document language verification failed for ${relativePath}.`);
      }
    }
  }

  console.log(`Localized document language verification passed. Inspected ${inspected}; updated ${updated}.`);
  return { inspected, updated };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) finalizeLocalizedHtml();
