import type { Locale } from "./i18n/config.ts";
import type { ToolSlug } from "./tools.ts";

export type LogbookCtaSourceType = "workout" | "restaurant" | "exercise" | "calculator";
export type LogbookCtaVariant = "control" | "alternate";
export type LogbookCtaPresentation = "card" | "compact";
export type LogbookCtaCopy = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  supportingText: string;
  presentation: LogbookCtaPresentation;
};

export type LogbookCtaAccessibility = {
  withLogbook: string;
  chooseDestination: string;
  onIphone: string;
  onAndroid: string;
  stickyShortcut: string;
  dismissStickyShortcut: string;
};

function featureEnabled(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === "true";
}

// Public flags keep the conversion layer easy to pause or experiment with
// without changing the SEO templates. Deep links stay disabled until the
// mobile app publishes a verified route contract.
export const logbookConversionConfig = {
  enabled: featureEnabled(process.env.NEXT_PUBLIC_LOGBOOK_CONTEXTUAL_CTA_ENABLED, true),
  mobileStickyEnabled: featureEnabled(process.env.NEXT_PUBLIC_LOGBOOK_STICKY_CTA_ENABLED, false),
  deepLinks: {
    enabled: false,
    // Populate only after Logbook publishes a supported universal-link contract.
    // Returning null avoids inventing a web route that the app cannot handle.
    resolveHref: () => null as string | null,
  },
  activeVariant: "control" as LogbookCtaVariant,
  stickyEligibleSources: new Set<LogbookCtaSourceType>(["workout", "restaurant", "exercise", "calculator"]),
};

type CopySet = Record<LogbookCtaSourceType, Record<LogbookCtaVariant, LogbookCtaCopy>>;

const copy: Record<Locale, CopySet> = {
  en: {
    workout: {
      control: {
        eyebrow: "Logbook",
        title: "Take this workout to the gym",
        description: "Track your sets, reps, and weights in Logbook and see how your performance changes over time.",
        action: "Track this workout in Logbook",
        supportingText: "Free workout, nutrition, and progress tracking.",
        presentation: "card",
      },
      alternate: {
        eyebrow: "Logbook",
        title: "Keep this workout with you",
        description: "Use Logbook to record the session and compare your performance the next time you train.",
        action: "Take this workout to Logbook",
        supportingText: "Free workout, nutrition, and progress tracking.",
        presentation: "card",
      },
    },
    restaurant: {
      control: {
        eyebrow: "Logbook",
        title: "Tracking this meal?",
        description: "Add it to today’s nutrition in Logbook and keep your calories and macros in one place.",
        action: "Track this in Logbook",
        supportingText: "Free nutrition, workout, and progress tracking.",
        presentation: "card",
      },
      alternate: {
        eyebrow: "Logbook",
        title: "Keep today’s nutrition together",
        description: "Use Logbook to record meals, calories, and macros alongside your training.",
        action: "Track this meal",
        supportingText: "Free nutrition, workout, and progress tracking.",
        presentation: "card",
      },
    },
    exercise: {
      control: {
        eyebrow: "Logbook",
        title: "Use this exercise in your training",
        description: "Track your sets, reps, and weights with Logbook.",
        action: "Track in Logbook",
        supportingText: "Free workout, nutrition, and progress tracking.",
        presentation: "compact",
      },
      alternate: {
        eyebrow: "Logbook",
        title: "Keep this movement in your rotation",
        description: "Use Logbook to record each set and compare your next session with the last one.",
        action: "Track this exercise",
        supportingText: "Free workout, nutrition, and progress tracking.",
        presentation: "compact",
      },
    },
    calculator: {
      control: {
        eyebrow: "Logbook",
        title: "Put this into practice",
        description: "Track your workouts and progression in Logbook.",
        action: "Start tracking",
        supportingText: "Free workout, nutrition, and progress tracking.",
        presentation: "compact",
      },
      alternate: {
        eyebrow: "Logbook",
        title: "Turn this result into a useful record",
        description: "Use Logbook to track the work behind your next training decision.",
        action: "Start tracking",
        supportingText: "Free workout, nutrition, and progress tracking.",
        presentation: "compact",
      },
    },
  },
  "es-419": {
    workout: {
      control: { eyebrow: "Logbook", title: "Lleva este entrenamiento al gimnasio", description: "Registra tus series, repeticiones y pesos en Logbook y mira cómo cambia tu rendimiento con el tiempo.", action: "Registrar este entrenamiento en Logbook", supportingText: "Seguimiento gratis de entrenamientos, nutrición y progreso.", presentation: "card" },
      alternate: { eyebrow: "Logbook", title: "Ten este entrenamiento contigo", description: "Usa Logbook para registrar la sesión y comparar tu rendimiento la próxima vez que entrenes.", action: "Llevar este entrenamiento a Logbook", supportingText: "Seguimiento gratis de entrenamientos, nutrición y progreso.", presentation: "card" },
    },
    restaurant: {
      control: { eyebrow: "Logbook", title: "¿Vas a registrar esta comida?", description: "Agrégala a la nutrición de hoy en Logbook y mantén tus calorías y macros en un solo lugar.", action: "Registrar esto en Logbook", supportingText: "Seguimiento gratis de nutrición, entrenamientos y progreso.", presentation: "card" },
      alternate: { eyebrow: "Logbook", title: "Mantén junta la nutrición de hoy", description: "Usa Logbook para registrar comidas, calorías y macros junto con tus entrenamientos.", action: "Registrar esta comida", supportingText: "Seguimiento gratis de nutrición, entrenamientos y progreso.", presentation: "card" },
    },
    exercise: {
      control: { eyebrow: "Logbook", title: "Usa este ejercicio en tu entrenamiento", description: "Registra tus series, repeticiones y pesos con Logbook.", action: "Registrar en Logbook", supportingText: "Seguimiento gratis de entrenamientos, nutrición y progreso.", presentation: "compact" },
      alternate: { eyebrow: "Logbook", title: "Mantén este movimiento en tu rutina", description: "Usa Logbook para registrar cada serie y comparar tu próxima sesión con la anterior.", action: "Registrar este ejercicio", supportingText: "Seguimiento gratis de entrenamientos, nutrición y progreso.", presentation: "compact" },
    },
    calculator: {
      control: { eyebrow: "Logbook", title: "Pon este resultado en práctica", description: "Registra tus entrenamientos y progresión en Logbook.", action: "Empezar a registrar", supportingText: "Seguimiento gratis de entrenamientos, nutrición y progreso.", presentation: "compact" },
      alternate: { eyebrow: "Logbook", title: "Convierte este resultado en un registro útil", description: "Usa Logbook para registrar el trabajo detrás de tu próxima decisión de entrenamiento.", action: "Empezar a registrar", supportingText: "Seguimiento gratis de entrenamientos, nutrición y progreso.", presentation: "compact" },
    },
  },
  "pt-BR": {
    workout: {
      control: { eyebrow: "Logbook", title: "Leve este treino para a academia", description: "Registre suas séries, repetições e cargas no Logbook e veja como seu desempenho muda com o tempo.", action: "Registrar este treino no Logbook", supportingText: "Acompanhamento gratuito de treinos, nutrição e progresso.", presentation: "card" },
      alternate: { eyebrow: "Logbook", title: "Tenha este treino com você", description: "Use o Logbook para registrar a sessão e comparar seu desempenho no próximo treino.", action: "Levar este treino para o Logbook", supportingText: "Acompanhamento gratuito de treinos, nutrição e progresso.", presentation: "card" },
    },
    restaurant: {
      control: { eyebrow: "Logbook", title: "Vai registrar esta refeição?", description: "Adicione-a à nutrição de hoje no Logbook e mantenha calorias e macros em um só lugar.", action: "Registrar no Logbook", supportingText: "Acompanhamento gratuito de nutrição, treinos e progresso.", presentation: "card" },
      alternate: { eyebrow: "Logbook", title: "Mantenha a nutrição de hoje reunida", description: "Use o Logbook para registrar refeições, calorias e macros junto com seus treinos.", action: "Registrar esta refeição", supportingText: "Acompanhamento gratuito de nutrição, treinos e progresso.", presentation: "card" },
    },
    exercise: {
      control: { eyebrow: "Logbook", title: "Use este exercício no seu treino", description: "Registre suas séries, repetições e cargas com o Logbook.", action: "Registrar no Logbook", supportingText: "Acompanhamento gratuito de treinos, nutrição e progresso.", presentation: "compact" },
      alternate: { eyebrow: "Logbook", title: "Mantenha este movimento na sua rotina", description: "Use o Logbook para registrar cada série e comparar seu próximo treino com o anterior.", action: "Registrar este exercício", supportingText: "Acompanhamento gratuito de treinos, nutrição e progresso.", presentation: "compact" },
    },
    calculator: {
      control: { eyebrow: "Logbook", title: "Coloque este resultado em prática", description: "Registre seus treinos e sua progressão no Logbook.", action: "Começar a registrar", supportingText: "Acompanhamento gratuito de treinos, nutrição e progresso.", presentation: "compact" },
      alternate: { eyebrow: "Logbook", title: "Transforme este resultado em um registro útil", description: "Use o Logbook para registrar o trabalho por trás da sua próxima decisão de treino.", action: "Começar a registrar", supportingText: "Acompanhamento gratuito de treinos, nutrição e progresso.", presentation: "compact" },
    },
  },
};

const accessibility: Record<Locale, LogbookCtaAccessibility> = {
  en: {
    withLogbook: "with Logbook",
    chooseDestination: "Choose a Logbook download destination",
    onIphone: "on iPhone",
    onAndroid: "on Android",
    stickyShortcut: "Logbook tracking shortcut",
    dismissStickyShortcut: "Dismiss Logbook tracking shortcut",
  },
  "es-419": {
    withLogbook: "con Logbook",
    chooseDestination: "Elige un destino de descarga de Logbook",
    onIphone: "en iPhone",
    onAndroid: "en Android",
    stickyShortcut: "Acceso rápido de seguimiento de Logbook",
    dismissStickyShortcut: "Descartar acceso rápido de seguimiento de Logbook",
  },
  "pt-BR": {
    withLogbook: "com o Logbook",
    chooseDestination: "Escolha um destino de download do Logbook",
    onIphone: "no iPhone",
    onAndroid: "no Android",
    stickyShortcut: "Atalho de acompanhamento do Logbook",
    dismissStickyShortcut: "Dispensar atalho de acompanhamento do Logbook",
  },
};

export function getLogbookCtaAccessibility(locale: Locale) {
  return accessibility[locale];
}

const nutritionCalculatorSlugs = new Set<ToolSlug>([
  "calorie-calculator", "maintenance-calorie-calculator", "tdee-calculator", "bmr-calculator",
  "weight-loss-calorie-calculator", "weight-gain-calculator", "protein-calculator",
  "protein-per-meal-calculator", "macro-calculator", "macro-split-calculator", "reverse-diet-calculator",
]);

const bodyweightCalculatorSlugs = new Set<ToolSlug>([
  "body-fat-calculator", "body-fat-caliper-calculator", "bmi-calculator", "lean-body-mass-calculator",
  "ideal-body-weight-calculator", "goal-weight-timeline-calculator", "body-recomposition-calculator",
]);

const excludedCalculatorSlugs = new Set<ToolSlug>([
  "contest-prep-countdown", "competition-timeline-generator", "show-day-checklist-generator",
]);

export function getLogbookCtaCopy({
  sourceType,
  locale,
  variant = logbookConversionConfig.activeVariant,
  toolSlug,
}: {
  sourceType: LogbookCtaSourceType;
  locale: Locale;
  variant?: LogbookCtaVariant;
  toolSlug?: ToolSlug;
}): LogbookCtaCopy | null {
  if (!logbookConversionConfig.enabled) return null;
  if (sourceType === "calculator" && toolSlug && excludedCalculatorSlugs.has(toolSlug)) return null;

  const baseCopy = copy[locale][sourceType][variant];
  if (sourceType !== "calculator" || !toolSlug) return baseCopy;

  if (nutritionCalculatorSlugs.has(toolSlug)) {
    return {
      ...baseCopy,
      title: locale === "es-419" ? "¿Quieres registrar este objetivo?" : locale === "pt-BR" ? "Quer acompanhar esta meta?" : "Want to track against this target?",
      description: locale === "es-419" ? "Registra tu comida y tus macros gratis con Logbook." : locale === "pt-BR" ? "Registre sua alimentação e seus macros gratuitamente com o Logbook." : "Log your food and macros for free with Logbook.",
    };
  }

  if (bodyweightCalculatorSlugs.has(toolSlug)) {
    return {
      ...baseCopy,
      title: locale === "es-419" ? "Haz seguimiento de tu progreso" : locale === "pt-BR" ? "Acompanhe seu progresso" : "Track your progress",
      description: locale === "es-419" ? "Registra tu peso corporal y mira su tendencia con el tiempo." : locale === "pt-BR" ? "Registre seu peso corporal e veja a tendência ao longo do tempo." : "Log your bodyweight and see your trend over time.",
      action: locale === "es-419" ? "Registrar en Logbook" : locale === "pt-BR" ? "Registrar no Logbook" : "Track in Logbook",
    };
  }

  return baseCopy;
}
