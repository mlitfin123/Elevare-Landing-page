import { NutritionDisclaimer } from "@/components/nutrition/NutritionDisclaimer";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { absoluteUrl, buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Restaurant Nutrition Data Methodology",
  description:
    "Learn how ElevareFit organizes restaurant nutrition data, handles serving and recipe changes, and presents calorie and macro estimates responsibly.",
  pathname: "/nutrition/methodology",
  localizedAlternates: true,
});

export default function NutritionMethodologyPage() {
  return (
    <div className="container">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Restaurant Nutrition Data Methodology",
          url: absoluteUrl("/nutrition/methodology"),
          description: "How ElevareFit organizes and presents restaurant calorie and macro information.",
          isPartOf: { "@id": `${absoluteUrl("/")}#website` },
        }}
      />

      <section className="hero">
        <div className="eyebrow">Nutrition transparency</div>
        <h1>How restaurant nutrition data is handled.</h1>
        <p className="page-intro">
          ElevareFit organizes restaurant calorie and macro information to make menu comparisons easier. This page
          explains what the data represents, where uncertainty can enter, and what you should verify directly.
        </p>
        <div className="hero-actions">
          <TrackedLink className="button button-primary" href="/nutrition" eventName="nutrition_nav_click" eventParams={{ source_page: "nutrition_methodology", destination_page: "nutrition_index" }}>
            Browse nutrition facts
          </TrackedLink>
        </div>
      </section>

      <section className="section trust-layout">
        <div className="trust-list">
          <article className="panel">
            <h2>Data sources</h2>
            <p>
              Nutrition records are compiled into the ElevareFit dataset from publicly available restaurant and
              product nutrition information. Individual records may include a source URL when one is available in
              the underlying dataset. ElevareFit does not independently laboratory-test restaurant products.
            </p>
          </article>
          <article className="panel">
            <h2>Serving sizes and custom orders</h2>
            <p>
              Values apply to the listed item and serving information in the dataset. Restaurant portions, recipes,
              preparation methods, substitutions, toppings, sauces, and customizations can materially change the
              actual calories, protein, carbohydrates, fat, sodium, and allergens in an order.
            </p>
          </article>
          <article className="panel">
            <h2>Updates and menu changes</h2>
            <p>
              Restaurant menus and recipes change. When source records include an update date, the site uses that
              date for content-derived sitemap signals. A recent database date does not guarantee that a restaurant
              has not changed an item since the source information was published.
            </p>
          </article>
        </div>

        <article className="panel">
          <h2>How comparisons are calculated</h2>
          <p>
            Curated views such as high protein, low calorie, low carb, and under 500 calories filter and sort the
            available records. They are comparison tools, not endorsements or personalized recommendations. Missing
            values are left unavailable rather than inferred as zero.
          </p>
          <p>
            Search and filters can help narrow a menu, but the restaurant remains the authoritative source for its
            current ingredients, preparation, serving details, and allergen procedures.
          </p>
        </article>
      </section>

      <section className="section">
        <article className="panel">
          <h2>Allergies, medical conditions, and verification</h2>
          <p>
            Do not use this database to determine whether an item is safe for an allergy or medical condition.
            Cross-contact, ingredient, and preparation information must be confirmed directly with the restaurant.
            If nutrition choices affect a medical condition, consult an appropriately qualified healthcare
            professional.
          </p>
        </article>
      </section>

      <NutritionDisclaimer />
    </div>
  );
}
