import { getCalculatorMessages } from "@/lib/i18n/calculator-messages";
import type { Locale } from "@/lib/i18n/config";

type ContentDisclaimerProps = {
  kind: "estimate" | "training" | "article";
  locale?: Locale;
};

const disclaimerContent = {
  estimate: {
    label: "Estimate disclaimer",
    message:
      "Estimates are provided for informational and educational purposes only and may not reflect your individual needs or actual body composition. They are not medical advice.",
  },
  training: {
    label: "Training disclaimer",
    message:
      "Exercise involves risk of injury. Use appropriate technique, equipment, and judgment, and choose activities appropriate for your abilities. This content is for general informational purposes and is not medical advice.",
  },
  article: {
    label: "Content disclaimer",
    message:
      "ElevareFit content is provided for general informational and educational purposes and is not medical, dietetic, or other professional healthcare advice.",
  },
} as const;

export function ContentDisclaimer({ kind, locale = "en" }: ContentDisclaimerProps) {
  const content = disclaimerContent[kind];
  const localizedEstimate = kind === "estimate" && locale !== "en"
    ? getCalculatorMessages(locale).shell
    : null;
  const label = localizedEstimate?.disclaimerLabel ?? content.label;
  const message = localizedEstimate?.disclaimer ?? content.message;

  return (
    <aside className="callout tool-disclaimer-card" aria-label={label}>
      <span className="meta-pill">{locale === "es-419" ? "Aviso" : locale === "pt-BR" ? "Aviso" : "Disclaimer"}</span>
      <p>{message}</p>
    </aside>
  );
}

export function EstimateDisclaimer({ locale = "en" }: { locale?: Locale }) {
  return <ContentDisclaimer kind="estimate" locale={locale} />;
}

export function TrainingDisclaimer() {
  return <ContentDisclaimer kind="training" />;
}

export function ArticleDisclaimer() {
  return <ContentDisclaimer kind="article" />;
}
