import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { productConfig, type ProductName } from "@/lib/site";

type ProductCTAProps = {
  product: ProductName;
  context?: string;
};

export function ProductCTA({ product, context = "product_cta" }: ProductCTAProps) {
  const config = productConfig[product];

  return (
    <section className="product-cta">
      <span className="meta-pill">{config.status}</span>
      <h2>{config.title}</h2>
      <p>{config.description}</p>
      <div className="button-row">
        <ProductCtaButtons product={product} context={context} />
      </div>
    </section>
  );
}
