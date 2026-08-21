import { TrackedLink } from "@/components/TrackedLink";
import type { AnalyticsEventParams } from "@/lib/analytics";
import { productConfig, type ProductName } from "@/lib/site";

type ProductCtaButtonsProps = {
  product: ProductName;
  context: string;
  eventName?: string;
  eventParams?: AnalyticsEventParams;
};

export function ProductCtaButtons({ product, context, eventName = "cta_click", eventParams }: ProductCtaButtonsProps) {
  const config = productConfig[product];
  const storeLinks = config.storeLinks;

  if (storeLinks?.length) {
    return (
      <div className="product-store-buttons">
        {storeLinks.map((storeLink) => (
          <TrackedLink
            key={storeLink.href}
            className="button button-store"
            href={storeLink.href}
            eventName={eventName}
            eventParams={{
              cta_name: storeLink.label,
              cta_context: context,
              product: config.title,
              store: storeLink.store,
              ...eventParams,
            }}
          >
            {storeLink.label}
          </TrackedLink>
        ))}
      </div>
    );
  }

  return (
    <TrackedLink
      className="button button-primary"
      href={config.ctaHref}
      eventName={eventName}
      eventParams={{
        cta_name: config.ctaLabel,
        cta_context: context,
        product: config.title,
        ...eventParams,
      }}
    >
      {config.ctaLabel}
    </TrackedLink>
  );
}
