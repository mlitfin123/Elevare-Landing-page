import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderLocalizedLegalDocument, transformLegalSegments } from "../lib/legal-localization.ts";
import { LOCALIZED_LEGAL_DOCUMENTS, type LocalizedLegalDocument } from "../lib/legal-localization-routes.ts";
import { localizePathname, type Locale } from "../lib/i18n/config.ts";
import { legalDocumentResponse, localizedLegalResponse } from "../lib/legal-document-response.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
for (const document of Object.keys(LOCALIZED_LEGAL_DOCUMENTS) as LocalizedLegalDocument[]) {
  for (const locale of ["en", "es-419", "pt-BR"] as Locale[]) test(`${document} ${locale}: complete text, source parity and language navigation`, () => {
    const source = fs.readFileSync(path.join(root, LOCALIZED_LEGAL_DOCUMENTS[document].source), "utf8");
    const html = renderLocalizedLegalDocument(document, locale, root);
    assert.ok(html.includes(`<html lang="${locale}">`));
    assert.ok(html.includes(`rel="canonical" href="https://www.elevarefit.com${localizePathname(LOCALIZED_LEGAL_DOCUMENTS[document].route, locale)}"`));
    assert.equal([...html.matchAll(/<h[123]\b/g)].length, [...source.matchAll(/<h[123]\b/g)].length, "Every section remains present");
    assert.equal([...html.matchAll(/<li\b/g)].length, [...source.matchAll(/<li\b/g)].length, "Every list item remains present");
    assert.ok(html.includes('mailto:mlitfin@elevarefit.org'));
    for (const language of ["en", "es-419", "pt-BR"] as Locale[]) assert.ok(html.includes(`href="${localizePathname(LOCALIZED_LEGAL_DOCUMENTS[document].route, language)}" lang="${language}"`));
    if (locale !== "en") {
      const values = JSON.parse(fs.readFileSync(path.join(root, "content/legal/translations", locale, `${document}.json`), "utf8")) as string[];
      transformLegalSegments(source, (english, index) => {
        assert.deepEqual(values[index].match(/\d+(?:\.\d+)?/g), english.match(/\d+(?:\.\d+)?/g), `Numbers changed in ${document}[${index}]`);
        assert.ok(!/[<>]/.test(values[index]), "Translations contain plain text only");
        return english;
      });
      assert.doesNotMatch(html, /<h[123][^>]*>(?:Privacy Policy|Terms of Service|Support|Introduction)<\//);
    }
  });
}
test("translated policy cross-links keep the selected language and identify English-only documents", () => {
  const support = renderLocalizedLegalDocument("support", "es-419", root);
  assert.ok(support.includes('href="/es/stagelab-privacy-policy/"'));
  assert.match(support, /href="\/stagelab-terms-of-service\/" hreflang="en"[^>]*>[^<]+<span class="legal-language-note">\(en inglés\)/);
  assert.ok(renderLocalizedLegalDocument("terms", "pt-BR", root).includes('href="/pt-br/privacy-policy/"'));
});
test("legal metadata and scripts are handled separately from translated text", () => {
  const sample = '<style>p { color:red }</style><script>const text="English";</script><meta name="description" content="Description"><p>Text <a href="/">Link</a>.</p>';
  const seen: string[] = [];
  const result = transformLegalSegments(sample, (value) => { seen.push(value); return value; });
  assert.deepEqual(seen, ["Description", "Text", "Link"]);
  assert.equal(result.html, sample);
});
test("legal responses have localized headers and reject unsupported locale segments", async () => {
  const response = legalDocumentResponse("privacy", "pt-BR");
  assert.equal(response.headers.get("content-language"), "pt-BR");
  assert.match(response.headers.get("content-type")!, /charset=utf-8/);
  assert.equal((await localizedLegalResponse("privacy", { params: Promise.resolve({ locale: "fr" }) })).status, 404);
});
