import { TrackedLink } from "@/components/TrackedLink";
import { productConfig, type ProductName } from "@/lib/site";

type ProductCtaButtonsProps = {
  product: ProductName;
  context: string;
};

export function ProductCtaButtons({ product, context }: ProductCtaButtonsProps) {
  const config = productConfig[product];
  const storeLinks = config.storeLinks;

  if (storeLinks?.length) {
    return (
      <>
        {storeLinks.map((storeLink) => (
          <TrackedLink
            key={storeLink.href}
            className="button button-store"
            href={storeLink.href}
            eventName="cta_click"
            eventParams={{
              cta_name: storeLink.label,
              cta_context: context,
              product: config.title,
              store: storeLink.store,
            }}
          >
            {storeLink.label}
          </TrackedLink>
        ))}
      </>
    );
  }

  return (
    <TrackedLink
      className="button button-primary"
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
  );
}
