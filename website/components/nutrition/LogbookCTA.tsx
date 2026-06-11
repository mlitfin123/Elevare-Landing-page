import { TrackedLink } from "@/components/TrackedLink";
import { productConfig } from "@/lib/site";

type LogbookCTAProps = {
  context: string;
};

export function LogbookCTA({ context }: LogbookCTAProps) {
  return (
    <section className="product-cta">
      <span className="meta-pill">Track with Logbook</span>
      <h2>Track Your Nutrition with Logbook</h2>
      <p>Track calories, macros, weight, workouts, and progress for free.</p>
      <div className="button-row">
        <TrackedLink
          className="button button-store"
          href={productConfig.Logbook.ctaHref}
          eventName="cta_click"
          eventParams={{
            cta_name: "Download Logbook",
            cta_context: context,
            product: "Logbook",
          }}
        >
          Download Logbook
        </TrackedLink>
      </div>
    </section>
  );
}
