import { getCatalogMessages } from "@/lib/i18n/catalog-messages";
import type { Locale } from "@/lib/i18n/config";

export function NutritionExplorerFallback({ locale = "en" }: { locale?: Locale }) {
  const messages = getCatalogMessages(locale).nutrition.search;
  return (
    <section className="section">
      <article className="panel tool-form-card">
        <div className="section-head tool-form-head">
          <span className="meta-pill">{messages.loading}</span>
          <h2>{messages.title}</h2>
          <p>{messages.copy}</p>
        </div>
      </article>
    </section>
  );
}
