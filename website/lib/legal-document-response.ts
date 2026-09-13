import { localeFromSegment, type Locale } from "./i18n/config.ts";
import { renderLocalizedLegalDocument } from "./legal-localization.ts";
import type { LocalizedLegalDocument } from "./legal-localization-routes.ts";

export function legalDocumentResponse(document: LocalizedLegalDocument, locale: Locale = "en") {
  return new Response(renderLocalizedLegalDocument(document, locale), { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Language": locale } });
}
export async function localizedLegalResponse(document: LocalizedLegalDocument, context: { params: Promise<{ locale: string }> }) {
  const locale = localeFromSegment((await context.params).locale);
  return locale ? legalDocumentResponse(document, locale) : new Response("Not found", { status: 404 });
}
export function legalLocaleParams() { return [{ locale: "es" }, { locale: "pt-br" }]; }
