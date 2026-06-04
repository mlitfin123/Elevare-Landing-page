import { TrackedLink } from "@/components/TrackedLink";
import { productConfig, type ProductName } from "@/lib/site";

type ProductCTAProps = {
  product: ProductName;
  context?: string;
};

export function ProductCTA({ product, context = "product_cta" }: ProductCTAProps) {
  const config = productConfig[product];
  const buttonClassName =
    product === "Logbook" ? "button button-store" : "button button-primary";

  return (
    <section className="product-cta">
      <span className="meta-pill">{config.status}</span>
      <h2>{config.title}</h2>
      <p>{config.description}</p>
      <div className="button-row">
        <TrackedLink
          className={buttonClassName}
          href={config.ctaHref}
          eventName="cta_click"
          eventParams={{
            cta_name: config.ctaLabel,
            cta_context: context,
            product: config.title,
          }}
        >
          {config.ctaLabel}
        </TrackedLink>
      </div>
    </section>
  );
}
