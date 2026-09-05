import { getCalculatorMessages } from "./calculator-messages.ts";
import type { Locale } from "./config.ts";
import { toolMap, type ToolDefinition, type ToolSlug } from "../tools.ts";

function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (value, [key, replacement]) => value.replaceAll(`{${key}}`, replacement),
    template,
  );
}

export function getLocalizedTool(toolSlug: ToolSlug, locale: Locale): ToolDefinition {
  const tool = toolMap[toolSlug];
  if (locale === "en") return tool;

  const messages = getCalculatorMessages(locale);
  const title = messages.toolTitles[toolSlug];
  const metaDescription = locale === "es-419"
    ? `Usa ${title} gratis para obtener una estimación práctica con tus datos y objetivos actuales.`
    : `Use ${title} gratuitamente para obter uma estimativa prática com seus dados e objetivos atuais.`;
  const intro = locale === "es-419"
    ? `Ingresa tus datos en ${title} para obtener un punto de partida claro que puedas comparar con tu progreso real.`
    : `Insira seus dados em ${title} para obter um ponto de partida claro que você possa comparar com seu progresso real.`;

  return {
    ...tool,
    title,
    metaDescription,
    intro,
    explanationHeading: interpolate(messages.shell.explanationHeading, { title }),
    explanation: messages.shell.explanationParagraphs.map((paragraph) => interpolate(paragraph, { title })),
    faqs: messages.shell.faqQuestions.map((question, index) => ({
      question: interpolate(question, { title }),
      answer: interpolate(messages.shell.faqAnswers[index] ?? "", { title }),
    })),
  };
}

const dynamicPatterns: Array<{
  pattern: RegExp;
  es: (...matches: string[]) => string;
  pt: (...matches: string[]) => string;
}> = [
  {
    pattern: /^(\d+(?:\.\d+)?) weeks?$/,
    es: (value) => `${value} semanas`,
    pt: (value) => `${value} semanas`,
  },
  {
    pattern: /^(\d+(?:\.\d+)?) weeks? out$/,
    es: (value) => `${value} semanas para el show`,
    pt: (value) => `${value} semanas para o show`,
  },
  {
    pattern: /^Week (\d+)$/,
    es: (value) => `Semana ${value}`,
    pt: (value) => `Semana ${value}`,
  },
  {
    pattern: /^Day (\d+)$/,
    es: (value) => `Día ${value}`,
    pt: (value) => `Dia ${value}`,
  },
  {
    pattern: /^(\d+(?:\.\d+)?) to (\d+(?:\.\d+)?) minutes$/,
    es: (minimum, maximum) => `${minimum} a ${maximum} minutos`,
    pt: (minimum, maximum) => `${minimum} a ${maximum} minutos`,
  },
  {
    pattern: /^Weight per rep \((.+)\)$/,
    es: (unit) => `Peso por repetición (${unit})`,
    pt: (unit) => `Peso por repetição (${unit})`,
  },
  {
    pattern: /^Pace (minutes|seconds) per (.+)$/,
    es: (part, unit) => `${part === "minutes" ? "Minutos" : "Segundos"} de ritmo por ${unit}`,
    pt: (part, unit) => `${part === "minutes" ? "Minutos" : "Segundos"} de ritmo por ${unit}`,
  },
  {
    pattern: /^Pace per (.+)$/,
    es: (unit) => `Ritmo por ${unit}`,
    pt: (unit) => `Ritmo por ${unit}`,
  },
  {
    pattern: /^Distance in (.+)$/,
    es: (unit) => `Distancia en ${unit}`,
    pt: (unit) => `Distância em ${unit}`,
  },
  {
    pattern: /^(.+) prep countdown$/,
    es: (division) => `Cuenta regresiva de preparación: ${division}`,
    pt: (division) => `Contagem regressiva de preparação: ${division}`,
  },
  {
    pattern: /^Lock in a target event for (.+)\.$/,
    es: (division) => `Define una competencia objetivo para ${division}.`,
    pt: (division) => `Defina uma competição-alvo para ${division}.`,
  },
  {
    pattern: /^Order division-specific stagewear for (.+)\.$/,
    es: (division) => `Pide la vestimenta de escenario correspondiente a ${division}.`,
    pt: (division) => `Peça o traje de palco adequado para ${division}.`,
  },
  {
    pattern: /^(.+) cups$/,
    es: (value) => `${value} tazas`,
    pt: (value) => `${value} copos`,
  },
  {
    pattern: /^(.+) sec$/,
    es: (value) => `${value} s`,
    pt: (value) => `${value} s`,
  },
];

const validationPrefixes = [
  "Enter ",
  "Choose ",
  "Select ",
  "For a ",
  "Target calories",
  "These calories",
  "Waist ",
  "Hip measurement",
  "Male 3-site",
  "Female 3-site",
  "The 4-site",
  "Protein, carbs",
  "The percentages",
  "Goal weight",
  "Show date",
  "Current date",
];

export function translateCalculatorText(text: string, locale: Locale) {
  if (locale === "en" || !text.trim()) return text;

  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  const value = text.trim();
  const messages = getCalculatorMessages(locale);
  const exact = messages.ui[value];
  if (exact) return `${leading}${exact}${trailing}`;

  const punctuation = value.match(/^(.+?)([:.])$/);
  if (punctuation) {
    const translated = messages.ui[punctuation[1]];
    if (translated) return `${leading}${translated}${punctuation[2]}${trailing}`;
  }

  for (const entry of dynamicPatterns) {
    const match = value.match(entry.pattern);
    if (match) {
      const translated = locale === "es-419" ? entry.es(...match.slice(1)) : entry.pt(...match.slice(1));
      return `${leading}${translated}${trailing}`;
    }
  }

  if (validationPrefixes.some((prefix) => value.startsWith(prefix))) {
    const translated = locale === "es-419"
      ? "Revisa los datos e ingresa valores válidos para calcular el resultado."
      : "Revise os dados e insira valores válidos para calcular o resultado.";
    return `${leading}${translated}${trailing}`;
  }

  return text;
}
