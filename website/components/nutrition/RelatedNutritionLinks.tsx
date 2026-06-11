import { TrackedLink } from "@/components/TrackedLink";

type RelatedNutritionLinksProps = {
  title: string;
  description: string;
  links: Array<{
    href: string;
    label: string;
  }>;
  sourcePage: string;
};

export function RelatedNutritionLinks({
  title,
  description,
  links,
  sourcePage,
}: RelatedNutritionLinksProps) {
  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">Related nutrition links</div>
        <h2 className="section-title">{title}</h2>
        <p className="section-copy">{description}</p>
      </div>

      <div className="nutrition-link-cloud">
        {links.map((link) => (
          <TrackedLink
            key={link.href}
            className="nutrition-link-pill"
            href={link.href}
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
