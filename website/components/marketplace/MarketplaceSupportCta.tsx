import { TrackedLink } from "@/components/TrackedLink";

type MarketplaceSupportCtaProps = {
  href: string;
  label: string;
  context: string;
  title?: string;
  description?: string;
};

export function MarketplaceSupportCta({
  href,
  label,
  context,
  title = "Want support that fits your goals?",
  description = "Browse published professional profiles on Elevare and compare specialties, service modes, and location before reaching out.",
}: MarketplaceSupportCtaProps) {
  return (
    <aside className="callout marketplace-support-cta">
      <span className="meta-pill">Elevare marketplace</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <TrackedLink
        className="button button-secondary"
        href={href}
        eventName="marketplace_content_cta_click"
        eventParams={{
          cta_name: label,
          cta_context: context,
          destination: href,
        }}
      >
        {label}
      </TrackedLink>
    </aside>
  );
}
