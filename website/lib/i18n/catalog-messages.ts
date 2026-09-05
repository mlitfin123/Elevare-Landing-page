import type { Locale } from "./config.ts";
import english from "../../locales/en/catalog.ts";
import spanish from "../../locales/es-419/catalog.ts";
import portuguese from "../../locales/pt-BR/catalog.ts";

export function getCatalogMessages(locale: Locale) {
  if (locale === "es-419") return spanish;
  if (locale === "pt-BR") return portuguese;
  return english;
}
