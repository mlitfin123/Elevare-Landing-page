import { TrackedLink } from "@/components/TrackedLink";
import { getMarketplaceCategoryResources } from "@/lib/marketplace-seo";

type MarketplaceCategoryResourcesProps = {
  categorySlug: string;
};

export function MarketplaceCategoryResources({ categorySlug }: MarketplaceCategoryResourcesProps) {
  const resources = getMarketplaceCategoryResources(categorySlug);

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">Related resources</div>
        <h2 className="section-title">Learn more before you choose support.</h2>
        <p className="section-copy">
          Use these ElevareFit resources to clarify your goals and prepare better questions before reaching out.
        </p>
      </div>
      <div className="grid-3">
        {resources.map((resource) => (
          <article key={resource.href} className="panel">
            <h3>{resource.label}</h3>
            <p>{resource.description}</p>
            <TrackedLink
              className="button button-secondary"
              href={resource.href}
              eventName="marketplace_resource_click"
              eventParams={{
                category: categorySlug,
                destination: resource.href,
              }}
            >
              Explore resource
            </TrackedLink>
          </article>
        ))}
      </div>
    </section>
  );
}
