import Link from "next/link";
import { productConfig, type ProductName } from "@/lib/site";

type ProductCTAProps = {
  product: ProductName;
};

export function ProductCTA({ product }: ProductCTAProps) {
  const config = productConfig[product];

  return (
    <section className="product-cta">
      <span className="meta-pill">{config.status}</span>
      <h2>{config.title}</h2>
      <p>{config.description}</p>
      <div className="button-row">
        <Link className="button button-primary" href={config.ctaHref}>
          {config.ctaLabel}
        </Link>
      </div>
    </section>
  );
}
