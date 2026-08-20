import Image from "next/image";
import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { Callout } from "@/components/Callout";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { absoluteUrl, buildMetadata, productConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "StageLab: Bodybuilding & Physique Prep App",
  description:
    "Track bodybuilding contest prep with weekly check-ins, physique photos, conditioning trends, and structured recommendations for athletes and coaches.",
  pathname: "/stagelab",
});

const faqs = [
  {
    question: "Who is StageLab built for?",
    answer: "StageLab is built for physique athletes preparing for competition and coaches who want a more structured way to review athlete check-ins and prep trends.",
  },
  {
    question: "Does StageLab replace a contest prep coach?",
    answer: "No. StageLab organizes data and provides AI-assisted informational outputs, but athletes remain responsible for their decisions and should seek qualified professional guidance when appropriate.",
  },
  {
    question: "What can I track during prep?",
    answer: "StageLab supports weekly check-ins, bodyweight and progress trends, physique photos, calories and macros, cardio, steps, recovery markers, and prep-plan changes.",
  },
  {
    question: "Are StageLab recommendations guaranteed to be accurate?",
    answer: "No. Recommendations and visual analysis may be incomplete or inaccurate. They are designed to support review and planning, not guarantee stage readiness, health outcomes, or competition results.",
  },
  {
    question: "Where can I download StageLab?",
    answer: "StageLab is available on the Apple App Store and Google Play for supported iOS and Android devices.",
  },
];

function buildStageLabStructuredData() {
  const storeLinks = productConfig.StageLab.storeLinks?.map((link) => link.href) ?? [];

  return [
    {
      "@context": "https://schema.org",
      "@type": "MobileApplication",
      "@id": `${absoluteUrl("/stagelab")}#app`,
      name: "StageLab",
      description: "A bodybuilding and physique competition-prep tracking app for athletes and coaches.",
      applicationCategory: "HealthApplication",
      operatingSystem: "iOS, Android",
      url: absoluteUrl("/stagelab"),
      image: absoluteUrl("/stagelab-logo.webp"),
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

export default function StageLabPage() {
  return (
    <div className="container">
      <StructuredData data={buildStageLabStructuredData()} />

      <section className="hero product-hero">
        <div className="product-hero-copy">
          <div className="eyebrow">StageLab competition prep</div>
          <h1>Bodybuilding contest prep, organized around the full picture.</h1>
          <p>
            StageLab brings check-ins, physique photos, nutrition targets, cardio, recovery, and prep trends into
            one structured workflow for physique athletes and their coaches.
          </p>
          <div className="button-row">
            <ProductCtaButtons product="StageLab" context="stagelab_hero" />
            <TrackedLink
              className="button button-secondary"
              href="/blog/category/prep-files"
              eventName="cta_click"
              eventParams={{ cta_name: "Read prep files", cta_context: "stagelab_hero", product: "StageLab" }}
            >
              Follow a real prep
            </TrackedLink>
          </div>
        </div>

        <div className="product-hero-visual">
          <div className="product-hero-logo-frame">
            <Image
              src="/stagelab-logo.webp"
              alt="StageLab Competition Prep app logo"
              width={720}
              height={720}
              sizes="(max-width: 720px) 240px, 360px"
              className="product-hero-logo"
              priority
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">Weekly workflow</span>
            <h3>Check-ins with context</h3>
            <p>Review weight trends, plan execution, recovery, photos, and the active prep plan together.</p>
          </article>
          <article className="panel">
            <span className="stat-label">Built for</span>
            <h3>Athletes and coaches</h3>
            <p>Use an individual athlete workflow or organize multiple physique athletes through coach tools.</p>
          </article>
          <article className="panel">
            <span className="stat-label">Availability</span>
            <h3>Live on iOS and Android</h3>
            <p>Download StageLab from the App Store or Google Play and start building a more complete prep record.</p>
          </article>
        </div>
      </section>

      <section className="section trust-layout">
        <div className="trust-list">
          <article className="panel">
            <div className="eyebrow">Built for bodybuilding contest prep</div>
            <h2>Prep decisions need more than a single weigh-in.</h2>
            <p>
              Bodyweight matters, but it does not explain everything happening during a prep. StageLab is designed
              to help you review the trend alongside calories, macros, cardio, steps, training, recovery, and visual
              changes. That makes it easier to understand why a plan is being held or adjusted without reducing the
              entire week to one number.
            </p>
            <p>
              The workflow supports physique-focused preparation, including Men&apos;s Physique and Classic Physique,
              while keeping the underlying review useful for bodybuilding competitors who need consistent weekly
              records. It is not a judging service and does not guarantee conditioning or placement.
            </p>
          </article>
          <article className="panel">
            <h2>Visual check-ins and progress analysis</h2>
            <p>
              Store progress photos with weekly check-ins so visual changes can be reviewed next to the rest of your
              prep data. StageLab can provide AI-assisted visual observations about conditioning trends and visible
              markers, but photos never override logged execution, recovery, or the judgment of a qualified coach.
            </p>
          </article>
        </div>

        <figure className="product-visual-card panel">
          <div className="product-visual-frame product-visual-frame-tall">
            <Image
              src="/blog-posts/mens-physique-classic-physique-prep-12-weeks-out/recommendation.png"
              alt="StageLab weekly prep recommendation showing an increase in cardio"
              width={296}
              height={640}
              sizes="(max-width: 720px) 72vw, 230px"
              loading="lazy"
            />
          </div>
          <figcaption className="product-caption">
            <strong>A recommendation with the active plan attached</strong>
            <span>See what changed, why it changed, and what to review at the next check-in.</span>
          </figcaption>
        </figure>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Track your prep in one place</div>
            <h2>Keep the inputs behind each decision visible.</h2>
          </div>
        </div>
        <div className="grid-3">
          <article className="panel"><h3>Nutrition and cardio</h3><p>Keep calories, macros, steps, and scheduled cardio tied to the plan being reviewed.</p></article>
          <article className="panel"><h3>Weight and conditioning trends</h3><p>Follow changes across multiple check-ins instead of reacting to an isolated day.</p></article>
          <article className="panel"><h3>Training and recovery</h3><p>Record execution, strength, sleep, energy, and recovery markers that can change how a week is interpreted.</p></article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><div className="eyebrow">How StageLab works</div><h2>A repeatable weekly review.</h2></div>
        </div>
        <div className="grid-3">
          <article className="panel"><span className="stat-label">01</span><h3>Set the active plan</h3><p>Start with current calories, macros, steps, cardio, division, and competition timeline.</p></article>
          <article className="panel"><span className="stat-label">02</span><h3>Log the week</h3><p>Record bodyweight, execution, training, recovery, and other check-in signals as the week develops.</p></article>
          <article className="panel"><span className="stat-label">03</span><h3>Submit a check-in</h3><p>Add consistent progress photos and review the full week instead of relying on memory.</p></article>
          <article className="panel"><span className="stat-label">04</span><h3>Review and apply</h3><p>Consider the recommendation, its confidence, and the stated reasons before deciding whether to update the plan.</p></article>
        </div>
      </section>

      <Callout title="Prep trends, not guarantees">
        <p>
          StageLab uses AI-assisted analysis to organize check-in signals and produce informational recommendations.
          Outputs may be inaccurate or incomplete and are not medical advice, licensed dietetic care, or a guarantee
          of stage readiness, health outcomes, physique results, or competition placement.
        </p>
      </Callout>

      <section className="section" aria-labelledby="stagelab-faqs">
        <div className="section-heading"><div><div className="eyebrow">Frequently asked questions</div><h2 id="stagelab-faqs">StageLab questions</h2></div></div>
        <div className="tool-faq-grid">
          {faqs.map((faq) => <article className="tool-faq-card panel" key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}
        </div>
      </section>

      <section className="section final-card panel">
        <div><div className="eyebrow">Start your prep record</div><h2>Bring the plan, check-in, and trend into one workflow.</h2></div>
        <ProductCtaButtons product="StageLab" context="stagelab_final" />
      </section>
    </div>
  );
}
