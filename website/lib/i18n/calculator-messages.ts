import english from "../../locales/en/calculators.ts";
import spanish from "../../locales/es-419/calculators.ts";
import portuguese from "../../locales/pt-BR/calculators.ts";
import type { Locale } from "./config.ts";
import type { CalculatorMessages } from "./calculator-types.ts";

export function getCalculatorMessages(locale: Locale): CalculatorMessages {
  if (locale === "es-419") return spanish;
  if (locale === "pt-BR") return portuguese;
  return english;
}
