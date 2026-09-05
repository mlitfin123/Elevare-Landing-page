import { TrackedLink } from "@/components/TrackedLink";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";

type RelatedNutritionLinksProps = {
  title: string;
  description: string;
  links: Array<{
    href: string;
    label: string;
  }>;
  sourcePage: string;
  locale?: Locale;
};

export function RelatedNutritionLinks({
  title,
  description,
  links,
  sourcePage,
  locale = "en",
}: RelatedNutritionLinksProps) {
  const messages = getCatalogMessages(locale).nutrition.links;

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">{messages.eyebrow}</div>
        <h2 className="section-title">{title}</h2>
        <p className="section-copy">{description}</p>
      </div>

      <div className="nutrition-link-cloud">
        {links.map((link) => (
          <TrackedLink
            key={link.href}
            className="nutrition-link-pill"
            href={localizePathname(link.href, locale)}
            eventName="nutrition_related_click"
            eventParams={{
              source_page: sourcePage,
              destination_url: link.href,
            }}
          >
            {link.label}
          </TrackedLink>
        ))}
      </div>
    </section>
  );
}
