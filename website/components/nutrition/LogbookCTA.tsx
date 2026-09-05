import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import type { Locale } from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";

type LogbookCTAProps = {
  context: string;
  locale?: Locale;
};

export function LogbookCTA({ context, locale = "en" }: LogbookCTAProps) {
  const messages = getCatalogMessages(locale).nutrition.cta;

  return (
    <section className="product-cta">
      <span className="meta-pill">{messages.label}</span>
      <h2>{messages.title}</h2>
      <p>{messages.copy}</p>
      <div className="button-row">
        <ProductCtaButtons
          product="Logbook"
          context={context}
          displayLabels={locale === "es-419"
            ? { ios: "Descargar en App Store", android: "Disponible en Google Play" }
            : locale === "pt-BR"
              ? { ios: "Baixar na App Store", android: "Disponivel no Google Play" }
              : undefined}
        />
      </div>
    </section>
  );
}
