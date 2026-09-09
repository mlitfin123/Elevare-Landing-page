import { TrackedLink } from "@/components/TrackedLink";
import { getMarketplaceCategoryResources } from "@/lib/marketplace-seo";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";

type MarketplaceCategoryResourcesProps = {
  categorySlug: string;
  locale?: Locale;
};

export function MarketplaceCategoryResources({ categorySlug, locale = "en" }: MarketplaceCategoryResourcesProps) {
  const resources = getMarketplaceCategoryResources(categorySlug);
  const t = (value: string) => marketplaceText(locale, value);

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">{t("Related resources")}</div>
        <h2 className="section-title">{t("Learn more before you choose support.")}</h2>
        <p className="section-copy">
          {t("Use these ElevareFit resources to clarify your goals and prepare better questions before reaching out.")}
        </p>
      </div>
      <div className="grid-3">
        {resources.map((resource) => (
          <article key={resource.href} className="panel">
            <h3>{t(resource.label)}</h3>
            <p>{t(resource.description)}</p>
            <TrackedLink
              className="button button-secondary"
              href={localizePathname(resource.href, locale)}
              eventName="marketplace_resource_click"
              eventParams={{
                category: categorySlug,
                destination: resource.href,
              }}
            >
              {t("Explore resource")}
            </TrackedLink>
          </article>
        ))}
      </div>
    </section>
  );
}
