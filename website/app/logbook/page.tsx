import Image from "next/image";
import { Callout } from "@/components/Callout";
import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { absoluteUrl, buildMetadata, productConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Logbook: Free Workout & Fitness Tracker",
  description:
    "Track workouts, nutrition, macros, bodyweight, and progress with Logbook, a focused fitness tracker available free on iOS and Android.",
  pathname: "/logbook",
});

const faqs = [
  {
    question: "What can I track in Logbook?",
    answer: "Logbook records workouts, exercise history, food, macros, bodyweight, and progress in the same app.",
  },
  {
    question: "Is Logbook free to use?",
    answer: "Logbook is positioned as a free fitness tracker and can be downloaded from the Apple App Store and Google Play.",
  },
  {
    question: "Can beginners use Logbook?",
    answer: "Yes. Logbook is designed to keep daily tracking understandable for beginners while still giving experienced lifters and athletes a consistent record of their work.",
  },
  {
    question: "Does Logbook create my training or nutrition plan?",
    answer: "Logbook helps you record and review what you do. Its tracking data is informational and does not replace individualized medical, dietetic, or professional coaching advice.",
  },
  {
    question: "Where can I download Logbook?",
    answer: "Logbook is available for supported iOS devices on the App Store and Android devices on Google Play.",
  },
];

function buildLogbookStructuredData() {
  const storeLinks = productConfig.Logbook.storeLinks?.map((link) => link.href) ?? [];

  return [
    {
      "@context": "https://schema.org",
      "@type": "MobileApplication",
      "@id": `${absoluteUrl("/logbook")}#app`,
      name: "Logbook",
      description: "A free workout, nutrition, bodyweight, and fitness progress tracker.",
      applicationCategory: "HealthApplication",
      operatingSystem: "iOS, Android",
      url: absoluteUrl("/logbook"),
      image: absoluteUrl("/logbook-logo.png"),
      downloadUrl: storeLinks,
      sameAs: storeLinks,
      publisher: { "@id": `${absoluteUrl("/")}#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];
}

export default function LogbookPage() {
  const logbook = productConfig.Logbook;

  return (
    <div className="container">
      <StructuredData data={buildLogbookStructuredData()} />

      <section className="hero product-hero">
        <div className="product-hero-copy">
          <div className="eyebrow">Logbook fitness tracker</div>
          <h1>Track workouts, nutrition, and progress without the clutter.</h1>
          <p>
            Record training, food, macros, bodyweight, and progress in a daily log. Use the history to compare
            sessions, nutrition targets, and bodyweight changes over time.
          </p>
          <div className="button-row">
            <ProductCtaButtons product="Logbook" context="logbook_hero" />
            <TrackedLink
              className="button button-secondary"
              href="/calculators"
              eventName="cta_click"
              eventParams={{ cta_name: "Explore free calculators", cta_context: "logbook_hero", product: "Logbook" }}
            >
              Explore free calculators
            </TrackedLink>
          </div>
        </div>

        <div className="product-hero-visual">
          <div className="product-hero-logo-frame">
            <Image
              src="/logbook-logo.png"
              alt="Logbook fitness tracker app logo"
              width={360}
              height={360}
              sizes="(max-width: 720px) 240px, 360px"
              className="product-hero-logo product-hero-logo-square"
              priority
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="panel"><span className="stat-label">Workouts</span><h3>Keep a reliable training history</h3><p>Record exercises, sets, reps, and performance so each session has context from the one before it.</p></article>
          <article className="panel"><span className="stat-label">Nutrition</span><h3>See calories and macros clearly</h3><p>Log food and review calories, protein, carbohydrates, and fat against the targets you are trying to follow.</p></article>
          <article className="panel"><span className="stat-label">Availability</span><h3>{logbook.status}</h3><p>Download Logbook from the App Store or Google Play and keep your training record with you.</p></article>
        </div>
      </section>

      <section className="section trust-layout">
        <div className="trust-list">
          <article className="panel">
            <div className="eyebrow">A simple fitness tracker</div>
            <h2>Use your history before changing the plan.</h2>
            <p>
              Training and nutrition are difficult to evaluate from memory. Logbook stores exercises, sets, reps,
              food, macros, and bodyweight so you can compare current results with previous days and sessions.
            </p>
            <p>
              The record does not need to be perfect to be useful. Consistent entries show where workouts
              progressed, where nutrition missed target, and how bodyweight changed.
            </p>
          </article>
          <article className="panel">
            <h2>Track bodyweight and progress over time</h2>
            <p>
              Daily weight can move for reasons that have little to do with body-fat change. Keeping a longer record
              makes it easier to focus on the trend. Logbook connects that progress view with the workouts and
              nutrition habits that influence it, so the number is not isolated from the work behind it.
            </p>
          </article>
        </div>

        <figure className="product-visual-card panel">
          <div className="product-visual-frame">
            <Image
              src="/blog-posts/how-many-calories-should-i-eat-to-lose-weight/featured.webp"
              alt="Illustration of calorie goals, a balanced meal, and a fitness tracking screen"
              width={1200}
              height={800}
              sizes="(max-width: 900px) 92vw, 38vw"
              loading="lazy"
            />
          </div>
          <figcaption className="product-caption">
            <strong>Calories are a starting point, not a verdict</strong>
            <span>Use a consistent record to compare the plan with what happens over time.</span>
          </figcaption>
        </figure>
      </section>

      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">What you can track</div><h2>Record the work you are already doing.</h2></div></div>
        <div className="grid-3">
          <article className="panel"><h3>Workouts and exercises</h3><p>Keep your training sessions organized and review previous performance before you repeat a movement.</p></article>
          <article className="panel"><h3>Food, calories, and macros</h3><p>Build awareness around your intake without assuming that healthy food, one meal, or one estimate tells the full story.</p></article>
          <article className="panel"><h3>Bodyweight and trends</h3><p>Compare changes over time instead of letting one high or low weigh-in decide whether your plan is working.</p></article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">How Logbook works</div><h2>Start small and build a usable history.</h2></div></div>
        <div className="grid-3">
          <article className="panel"><span className="stat-label">01</span><h3>Set your targets</h3><p>Choose the training and nutrition targets that match the plan you are following.</p></article>
          <article className="panel"><span className="stat-label">02</span><h3>Log the day</h3><p>Record workouts, food, macros, and bodyweight while the details are still easy to remember.</p></article>
          <article className="panel"><span className="stat-label">03</span><h3>Review the trend</h3><p>Use the history to spot patterns, measure consistency, and decide what deserves to change.</p></article>
        </div>
      </section>

      <Callout title="Useful across different fitness goals">
        <p>
          Logbook can support people focused on general fitness, strength, physique improvement, bodyweight change,
          or simply building a more consistent routine. It records the plan and results you enter; it does not make
          medical diagnoses or replace individualized advice from a qualified professional.
        </p>
        <div className="hero-actions">
          <TrackedLink className="button button-secondary" href="/exercises" eventName="cta_click" eventParams={{ cta_name: "Browse exercises", cta_context: "logbook_callout", product: "Logbook" }}>Browse exercises</TrackedLink>
          <TrackedLink className="button button-secondary" href="/workouts" eventName="cta_click" eventParams={{ cta_name: "Browse workout templates", cta_context: "logbook_callout", product: "Logbook" }}>Browse workout templates</TrackedLink>
        </div>
      </Callout>

      <section className="section" aria-labelledby="logbook-faqs">
        <div className="section-heading"><div><div className="eyebrow">Frequently asked questions</div><h2 id="logbook-faqs">Logbook questions</h2></div></div>
        <div className="tool-faq-grid">
          {faqs.map((faq) => <article className="tool-faq-card panel" key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}
        </div>
      </section>

      <section className="section final-card panel">
        <div><div className="eyebrow">Start tracking</div><h2>Start a training and nutrition record.</h2></div>
        <ProductCtaButtons product="Logbook" context="logbook_final" />
      </section>
    </div>
  );
}
