import type { Locale } from "./i18n/config.ts";
import { posingErrorMessage } from "./i18n/posing-messages.ts";
/** Only these deliberately localized messages may be shown from an async catch. */
export class PosingRequestError extends Error {
  constructor(code: unknown, locale: Locale) {
    super(posingErrorMessage(code, locale));
    this.name = "PosingRequestError";
  }
}
