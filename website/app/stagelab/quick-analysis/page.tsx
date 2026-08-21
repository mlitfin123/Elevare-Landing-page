import { Suspense } from "react";
import { QuickAnalysisCheckout } from "@/components/quick-analysis/QuickAnalysisCheckout";
import { QuickAnalysisReturnLink } from "@/components/quick-analysis/QuickAnalysisReturnLink";
import { StructuredData } from "@/components/StructuredData";
import { QUICK_ANALYSIS_PRICE_DISPLAY, QUICK_ANALYSIS_PRICE_VALUE } from "@/lib/quick-analysis";
import { absoluteUrl, buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "StageLab Quick Analysis - AI Physique Assessment",
  description: `Get a one-time StageLab competition-prep or physique assessment for ${QUICK_ANALYSIS_PRICE_DISPLAY}. No account or subscription required, and submitted photos are not retained.`,
  pathname: "/stagelab/quick-analysis/",
});

const faqs = [
  { question: "What does StageLab Quick Analysis assess?", answer: "Choose Competition Prep for a timeline-aware prep snapshot or Physique Check to compare your current look with competition-level visual standards. Both assess visible conditioning, muscularity, symmetry and proportions, presentation, division alignment, and a conservative visual body-fat range." },
  { question: "Are my photos or analysis details saved?", answer: "Your photos are used only to generate the requested analysis. ElevareFit sends them securely to the AI service for transient processing and never stores them. Your optional context and structured report remain available for up to 72 hours and are then removed; limited payment and operational records are retained." },
  { question: "What photos work best?", answer: "Use three to five current physique photos with clear front, side, and back views, consistent lighting, a stable camera angle, and minimal obstruction." },
  { question: "Do I need a StageLab account?", answer: `No. The ${QUICK_ANALYSIS_PRICE_DISPLAY} purchase provides one website analysis and does not create an account, subscription, app credit, or mobile entitlement.` },
  { question: "How do I reopen my result without an account?", answer: "Your result is available for 72 hours in the same browser and on the same device used for checkout. Return to the Quick Analysis result page during that time. Clearing browser cookies, switching devices, or using a different private browsing session will prevent access." },
  { question: "What does the Stage Readiness score mean?", answer: "In Physique Check, Stage Readiness summarizes visible conditioning, muscularity, symmetry, and presentation against typical competition-level markers. It is not an official judging score and does not predict placement or competition outcomes." },
  { question: "Is this medical or official judging advice?", answer: "No. Quick Analysis is visual fitness and physique information only. It is not medical advice, an exact body-fat measurement, official judging, or a guarantee of competition outcomes." },
];

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${absoluteUrl("/stagelab/quick-analysis/")}#product`,
    name: "StageLab Quick Analysis",
    description: "A one-time AI-assisted competition-prep or physique snapshot using three to five current photos.",
    brand: { "@type": "Brand", name: "StageLab" },
    url: absoluteUrl("/stagelab/quick-analysis/"),
    offers: { "@type": "Offer", price: QUICK_ANALYSIS_PRICE_VALUE.toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock", url: absoluteUrl("/stagelab/quick-analysis/") },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  },
];

export default function QuickAnalysisPage() {
  return (
    <div className="container">
      <StructuredData data={structuredData} />
      <section className="hero quick-analysis-hero">
        <div>
          <div className="eyebrow">StageLab Quick Analysis</div>
          <h1>See how your physique measures up.</h1>
          <p>Get a one-time StageLab AI physique analysis for {QUICK_ANALYSIS_PRICE_DISPLAY} using 3-5 current photos. Choose a competition-prep assessment or a comparison with competition-level conditioning.</p>
          <div className="quick-analysis-badges" aria-label="Product details">
            <span>{QUICK_ANALYSIS_PRICE_DISPLAY} one time</span><span>No subscription</span><span>No account required</span><span>Photos never stored by ElevareFit</span>
          </div>
          <QuickAnalysisReturnLink />
        </div>
        <div className="quick-analysis-hero-card">
          <span className="stat-label">Your report can assess</span>
          <ul><li>Visible conditioning</li><li>Muscularity</li><li>Symmetry and proportions</li><li>Presentation</li><li>Division alignment</li><li>Visual body-fat range</li></ul>
        </div>
      </section>

      <section className="section quick-analysis-intro-grid">
        <article className="panel"><span className="stat-label">Preparing for a show?</span><h2>Competition Prep</h2><p>See how your visible conditioning and physique align with your selected division and current prep timeline.</p></article>
        <article className="panel"><span className="stat-label">Just curious?</span><h2>Physique Check</h2><p>See how close your current physique looks to competition-level conditioning without needing a show date.</p></article>
        <article className="panel"><span className="stat-label">Secure checkout</span><h2>Pay once through Stripe.</h2><p>The {QUICK_ANALYSIS_PRICE_DISPLAY} USD payment is non-recurring and covers one successfully completed website analysis.</p></article>
      </section>

      <section className="section quick-analysis-checkout-layout" id="start-analysis">
        <div className="quick-analysis-checkout-copy">
          <div className="eyebrow">Before checkout</div>
          <h2>You&apos;ll upload 3-5 current physique photos after checkout.</h2>
          <p>Clear front, back, and side views in consistent lighting work best. This analysis uses only the photos submitted for this purchase. It does not retrieve previous StageLab check-ins or compare changes over time.</p>
          <div className="quick-analysis-privacy-note"><strong>Your photos are used only for this analysis.</strong><span>They are sent securely to the AI service for processing and then discarded. ElevareFit never stores them or creates a photo history. Your optional context and structured report remain available for up to 72 hours and are then removed.</span></div>
          <div className="quick-analysis-privacy-note"><strong>Keep access to your result.</strong><span>Your result is available for 72 hours on the same browser and device used for checkout. Do not clear your browser cookies until you are finished viewing it.</span></div>
        </div>
        <Suspense fallback={<div className="panel"><p>Preparing checkout...</p></div>}><QuickAnalysisCheckout /></Suspense>
      </section>

      <section className="section" aria-labelledby="quick-analysis-faqs">
        <div className="section-heading"><div><div className="eyebrow">Frequently asked questions</div><h2 id="quick-analysis-faqs">Before you start</h2></div></div>
        <div className="quick-analysis-faq-list">{faqs.map((faq) => <details className="quick-analysis-faq panel" key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
      </section>
    </div>
  );
}
