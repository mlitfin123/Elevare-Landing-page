import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import type { ToolSlug } from "@/lib/tools";
import { getCalculatorMessages } from "@/lib/i18n/calculator-messages";
import type { Locale } from "@/lib/i18n/config";

type ToolLogbookCtaProps = {
  toolSlug: ToolSlug;
  locale?: Locale;
};

export function ToolLogbookCta({ toolSlug, locale = "en" }: ToolLogbookCtaProps) {
  const messages = getCalculatorMessages(locale).shell;

  return (
    <section className="product-cta">
      <span className="meta-pill">{messages.ctaEyebrow}</span>
      <h2>{messages.ctaTitle}</h2>
      <p>{messages.ctaCopy}</p>
      <div className="button-row">
        <ProductCtaButtons
          product="Logbook"
          context={`tool_cta_${toolSlug}`}
          displayLabels={locale === "es-419"
            ? { ios: "Descargar en App Store", android: "Disponible en Google Play" }
            : locale === "pt-BR"
              ? { ios: "Baixar na App Store", android: "Disponível no Google Play" }
              : undefined}
        />
      </div>
    </section>
  );
}
