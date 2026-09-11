import type { Locale } from "./config.ts";
import en from "../../locales/en/stagelab-methodology.ts";
import es from "../../locales/es-419/stagelab-methodology.ts";
import pt from "../../locales/pt-BR/stagelab-methodology.ts";

export const METHODOLOGY_CONCEPTS = ["readiness", "progress", "bodyFat", "adjustments", "division", "confidence"] as const;
export const METHODOLOGY_DETAILS = ["readiness", "history", "maintenance", "recovery", "peakWeek", "posing"] as const;

export type StageLabMethodologyMessages = {
  eyebrow: string;
  title: string;
  lead: string;
  body: string;
  scope: string;
  cards: Record<(typeof METHODOLOGY_CONCEPTS)[number], { title: string; body: string; note: string }>;
  posing: { eyebrow: string; title: string; body: string; separation: string; unaffected: string[]; note: string };
  flow: { title: string; inputsLabel: string; inputs: string[]; steps: string[]; caption: string };
  detailsTitle: string;
  details: Record<(typeof METHODOLOGY_DETAILS)[number], { title: string; paragraphs: string[] }>;
  limits: { title: string; intro: string; items: string[]; posing: string; guidance: string };
  transition: string;
};

const dictionaries: Record<Locale, StageLabMethodologyMessages> = { en, "es-419": es, "pt-BR": pt };

export function getStageLabMethodologyMessages(locale: Locale): StageLabMethodologyMessages {
  return dictionaries[locale] ?? en;
}
