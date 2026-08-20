import { TrackedLink } from "@/components/TrackedLink";

export function NutritionDisclaimer() {
  return (
    <section className="section">
      <article className="callout nutrition-disclaimer">
        <span className="meta-pill">Disclaimer</span>
        <p>
          Nutrition information is provided for informational purposes and may vary by location, preparation
          method, serving size, recipe changes, menu updates, and customization. ElevareFit does not guarantee
          that nutrition information is complete, current, or error-free. Verify information directly with the
          restaurant when accuracy is important.
        </p>
        <p>
          Do not rely on this information to determine whether a food is safe for a food allergy or medical
          condition. Contact the restaurant directly regarding ingredients and allergens.
        </p>
        <p>
          Third-party names and trademarks are the property of their respective owners. ElevareFit is not
          affiliated with or endorsed by these companies unless expressly stated.
        </p>
        <p>
          <TrackedLink
            href="/nutrition/methodology"
            eventName="nutrition_nav_click"
            eventParams={{ source_page: "nutrition_disclaimer", destination_page: "nutrition_methodology" }}
          >
            Read how ElevareFit handles restaurant nutrition data.
          </TrackedLink>
        </p>
      </article>
    </section>
  );
}
