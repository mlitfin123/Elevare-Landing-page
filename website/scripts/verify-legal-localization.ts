import fs from "node:fs";
import path from "node:path";
import { LOCALIZED_LEGAL_DOCUMENTS, type LocalizedLegalDocument } from "../lib/legal-localization-routes.ts";
import { renderLocalizedLegalDocument, transformLegalSegments } from "../lib/legal-localization.ts";
import { localizePathname } from "../lib/i18n/config.ts";

const sourceIndex = process.argv.indexOf("--source");
if (sourceIndex >= 0) {
  const document = process.argv[sourceIndex + 1] as LocalizedLegalDocument;
  if (!Object.hasOwn(LOCALIZED_LEGAL_DOCUMENTS, document)) throw new Error("Choose support, stagePrivacy, terms or privacy.");
  const html = fs.readFileSync(LOCALIZED_LEGAL_DOCUMENTS[document].source, "utf8");
  transformLegalSegments(html, (value, index) => { console.log(JSON.stringify({ index, value })); return value; });
} else {
  for (const document of Object.keys(LOCALIZED_LEGAL_DOCUMENTS) as LocalizedLegalDocument[]) {
    for (const locale of ["en", "es-419", "pt-BR"] as const) {
      const html = renderLocalizedLegalDocument(document, locale);
      if (process.argv.includes("--output")) {
        const route = localizePathname(LOCALIZED_LEGAL_DOCUMENTS[document].route, locale);
        const output = path.join(".next/server/app", `${route.replace(/^\/+|\/+$/g, "")}.body`);
        if (fs.readFileSync(output, "utf8") !== html) throw new Error(`Built legal document differs from verified translation: ${route}`);
      }
    }
  }
  console.log(`Verified all 12 legal documents in en, es-419 and pt-BR${process.argv.includes("--output") ? " against production output" : ""}.`);
}
