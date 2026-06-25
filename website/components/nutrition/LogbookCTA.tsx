import { ProductCtaButtons } from "@/components/ProductCtaButtons";

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
        <ProductCtaButtons product="Logbook" context={context} />
      </div>
    </section>
  );
}
