import { ProductCtaButtons } from "@/components/ProductCtaButtons";

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
        <div className="button-row">
          <ProductCtaButtons product="Logbook" context={ctaContext} />
        </div>
      </article>
    </section>
  );
}
