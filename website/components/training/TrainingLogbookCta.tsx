import { TrackedLink } from "@/components/TrackedLink";
import { productConfig } from "@/lib/site";

type TrainingLogbookCtaProps = {
  title: string;
  description: string;
  ctaContext: string;
};

export function TrainingLogbookCta({ title, description, ctaContext }: TrainingLogbookCtaProps) {
  return (
    <section className="section">
      <article className="product-cta">
        <span className="meta-pill">Logbook</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <TrackedLink
          className="button button-store"
          href={productConfig.Logbook.ctaHref}
          eventName="cta_click"
          eventParams={{
            cta_name: "Download Logbook",
            cta_context: ctaContext,
            product: "Logbook",
          }}
        >
          Download on the App Store
        </TrackedLink>
      </article>
    </section>
  );
}
