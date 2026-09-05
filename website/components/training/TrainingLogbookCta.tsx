import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import type { Locale } from "@/lib/i18n/config";

type TrainingLogbookCtaProps = {
  title: string;
  description: string;
  ctaContext: string;
  locale?: Locale;
};

export function TrainingLogbookCta({ title, description, ctaContext, locale = "en" }: TrainingLogbookCtaProps) {
  return (
    <section className="section">
      <article className="product-cta">
        <span className="meta-pill">Logbook</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="button-row">
          <ProductCtaButtons
            product="Logbook"
            context={ctaContext}
            displayLabels={locale === "es-419"
              ? { ios: "Descargar en App Store", android: "Disponible en Google Play" }
              : locale === "pt-BR"
                ? { ios: "Baixar na App Store", android: "Disponivel no Google Play" }
                : undefined}
          />
        </div>
      </article>
    </section>
  );
}
