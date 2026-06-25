import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import type { ToolSlug } from "@/lib/tools";

type ToolLogbookCtaProps = {
  toolSlug: ToolSlug;
};

export function ToolLogbookCta({ toolSlug }: ToolLogbookCtaProps) {
  return (
    <section className="product-cta">
      <span className="meta-pill">Track it</span>
      <h2>Track your nutrition and workouts for free in Logbook.</h2>
      <p>
        If you want a cleaner place to track the daily side of your plan, Logbook is built to keep that
        process simple.
      </p>
      <div className="button-row">
        <ProductCtaButtons product="Logbook" context={`tool_cta_${toolSlug}`} />
      </div>
    </section>
  );
}
