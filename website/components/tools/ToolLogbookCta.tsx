import { TrackedLink } from "@/components/TrackedLink";
import { productConfig } from "@/lib/site";
import type { ToolSlug } from "@/lib/tools";

type ToolLogbookCtaProps = {
  toolSlug: ToolSlug;
};

export function ToolLogbookCta({ toolSlug }: ToolLogbookCtaProps) {
  return (
    <section className="product-cta">
      <span className="meta-pill">Track it</span>
      <h2>Want to track your calories, weight, and progress? Use Logbook.</h2>
      <p>
        If you want a cleaner place to track the daily side of your plan, Logbook is built to keep that
        process simple.
      </p>
      <div className="button-row">
        <TrackedLink
          className="button button-store"
          href={productConfig.Logbook.ctaHref}
          eventName="cta_click"
          eventParams={{
            cta_name: "Download Logbook",
            cta_context: `tool_cta_${toolSlug}`,
            product: "Logbook",
          }}
        >
          Download Logbook
        </TrackedLink>
      </div>
    </section>
  );
}
