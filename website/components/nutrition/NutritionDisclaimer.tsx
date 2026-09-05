import { TrackedLink } from "@/components/TrackedLink";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";

export function NutritionDisclaimer({ locale = "en" }: { locale?: Locale }) {
  const messages = getCatalogMessages(locale).nutrition.disclaimer;
  const englishParagraphs = [
    "Nutrition information is provided for informational purposes and may vary by location, preparation, serving size, recipe, menu updates, and customization. Verify information directly with the restaurant when accuracy is important.",
    "Elevare does not guarantee that nutrition information is complete, current, or error-free.",
    "Do not rely on this information to determine whether a food is safe for a food allergy or medical condition. Contact the restaurant directly about ingredients and allergens.",
    "Third-party names and trademarks are the property of their respective owners. ElevareFit is not affiliated with or endorsed by these companies unless expressly stated.",
  ];
  const paragraphs = locale === "en" ? englishParagraphs : messages.paragraphs;

  return (
    <section className="section">
      <article className="callout nutrition-disclaimer">
        <span className="meta-pill">{messages.label}</span>
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <p>
          <TrackedLink
            href={localizePathname("/nutrition/methodology", locale)}
            eventName="nutrition_nav_click"
            eventParams={{ source_page: "nutrition_disclaimer", destination_page: "nutrition_methodology" }}
          >
            {messages.methodologyLink}
          </TrackedLink>
        </p>
      </article>
    </section>
  );
}
