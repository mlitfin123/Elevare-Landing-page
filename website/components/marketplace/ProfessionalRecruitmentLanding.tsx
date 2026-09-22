import {
  ProfessionalRecruitmentActionsProvider,
  ProfessionalRecruitmentCta,
  ProfessionalRecruitmentTracker,
} from "@/components/marketplace/ProfessionalRecruitmentActions";
import { getMarketplaceCategoryCopy } from "@/lib/i18n/marketplace-content";
import type { Locale } from "@/lib/i18n/config";
import { MARKETPLACE_TAXONOMY_CATEGORIES } from "@/lib/marketplace-taxonomy";
import { getProfessionalAcquisitionCopy } from "@/lib/professional-acquisition";

export function ProfessionalRecruitmentLanding({ locale }: { locale: Locale }) {
  const copy = getProfessionalAcquisitionCopy(locale);

  return (
    <div className="container professional-acquisition-page">
      <ProfessionalRecruitmentActionsProvider>
        <ProfessionalRecruitmentTracker />

      <section className="hero professional-acquisition-hero" aria-labelledby="professional-acquisition-title">
        <div className="professional-acquisition-hero-copy">
          <div className="eyebrow">{copy.hero.eyebrow}</div>
          <h1 id="professional-acquisition-title">{copy.hero.title}</h1>
          <p>{copy.hero.body}</p>
          <p className="professional-acquisition-detail">{copy.hero.detail}</p>
          <div className="hero-actions">
            <ProfessionalRecruitmentCta locale={locale} placement="hero" className="button button-primary">{copy.hero.cta}</ProfessionalRecruitmentCta>
          </div>
          <p className="professional-acquisition-trust">{copy.hero.trustLine}</p>
        </div>

        <aside className="panel professional-acquisition-profile-preview" aria-labelledby="professional-profile-preview-title">
          <div className="professional-acquisition-preview-head">
            <span className="professional-acquisition-avatar" aria-hidden="true">E</span>
            <div><span className="stat-label">{copy.profile.photo}</span><h2 id="professional-profile-preview-title">{copy.profile.titleField}</h2></div>
          </div>
          <dl>
            <div><dt>{copy.profile.specialties}</dt><dd><span /><span /><span /></dd></div>
            <div><dt>{copy.profile.credentials}</dt><dd><span /><span /></dd></div>
            <div><dt>{copy.profile.services}</dt><dd><span /><span /></dd></div>
            <div><dt>{copy.profile.pricing}</dt><dd><span /></dd></div>
            <div><dt>{copy.profile.location}</dt><dd><span /></dd></div>
            <div><dt>{copy.profile.availability}</dt><dd><span /></dd></div>
          </dl>
        </aside>
      </section>

      <section className="section professional-acquisition-proof" aria-labelledby="professional-proof-title">
        <div className="section-heading"><div><div className="eyebrow">{copy.profile.eyebrow}</div><h2 id="professional-proof-title">{copy.profile.title}</h2></div></div>
        <p>{copy.profile.body}</p>
      </section>

      <section className="section professional-acquisition-vision" aria-labelledby="professional-vision-title">
        <div className="section-heading"><div><div className="eyebrow">{copy.vision.eyebrow}</div><h2 id="professional-vision-title">{copy.vision.title}</h2></div></div>
        <p className="professional-acquisition-vision-intro">{copy.vision.body}</p>
        <div className="professional-acquisition-vision-grid">
          {copy.vision.cards.map((card) => <article className="panel" key={card.title}><span className="professional-acquisition-status">{card.label}</span><h3>{card.title}</h3><p>{card.body}</p></article>)}
        </div>
      </section>

      <section className="section panel professional-acquisition-founding" aria-labelledby="professional-founding-title">
        <div><div className="eyebrow">{copy.founding.eyebrow}</div><h2 id="professional-founding-title">{copy.founding.title}</h2><p>{copy.founding.body}</p><p className="fine-print">{copy.founding.note}</p></div>
        <ProfessionalRecruitmentCta locale={locale} placement="founding_section" className="button button-secondary">{copy.hero.cta}</ProfessionalRecruitmentCta>
      </section>

      <section className="section professional-acquisition-roadmap" aria-labelledby="professional-roadmap-title">
        <div className="section-heading"><div><div className="eyebrow">{copy.roadmap.eyebrow}</div><h2 id="professional-roadmap-title">{copy.roadmap.title}</h2></div></div>
        <div className="professional-acquisition-roadmap-grid">
          {copy.roadmap.stages.map((stage) => <article className="panel" key={stage.label}><span className="professional-acquisition-status">{stage.label}</span><h3>{stage.title}</h3><p>{stage.body}</p></article>)}
        </div>
      </section>

      <section className="section professional-acquisition-app" aria-labelledby="professional-app-title">
        <div className="professional-acquisition-app-copy"><div className="eyebrow">{copy.app.eyebrow}</div><h2 id="professional-app-title">{copy.app.title}</h2><p>{copy.app.body}</p><p className="fine-print">{copy.app.status}</p></div>
        <div className="panel"><ul>{copy.app.points.map((point) => <li key={point}>{point}</li>)}</ul></div>
      </section>

      <section className="section" aria-labelledby="professional-steps-title">
        <div className="section-heading"><div><div className="eyebrow">{copy.steps.eyebrow}</div><h2 id="professional-steps-title">{copy.steps.title}</h2></div></div>
        <ol className="professional-acquisition-steps">
          {copy.steps.items.map((step, index) => <li key={step.title}><span aria-hidden="true">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}
        </ol>
      </section>

      <section className="section" aria-labelledby="professional-categories-title">
        <div className="section-heading"><div><div className="eyebrow">{copy.categories.eyebrow}</div><h2 id="professional-categories-title">{copy.categories.title}</h2></div></div>
        <p>{copy.categories.body}</p>
        <ul className="professional-acquisition-category-list">
          {MARKETPLACE_TAXONOMY_CATEGORIES.map((category) => <li key={category.stableId}>{getMarketplaceCategoryCopy(category.publicSlug, locale)?.label ?? category.label}</li>)}
        </ul>
      </section>

      <section className="section panel professional-acquisition-transparency" aria-labelledby="professional-transparency-title">
        <div className="eyebrow">{copy.transparency.eyebrow}</div><h2 id="professional-transparency-title">{copy.transparency.title}</h2><p>{copy.transparency.body}</p>
      </section>

      <section className="section" aria-labelledby="professional-faq-title">
        <div className="section-heading"><div><div className="eyebrow">{copy.faq.eyebrow}</div><h2 id="professional-faq-title">{copy.faq.title}</h2></div></div>
        <div className="professional-acquisition-faqs">
          {copy.faq.items.map((item) => <details className="panel" key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
        </div>
      </section>

        <section className="section professional-acquisition-closing" aria-labelledby="professional-closing-title">
        <div className="eyebrow">{copy.closing.eyebrow}</div><h2 id="professional-closing-title">{copy.closing.title}</h2><p>{copy.closing.body}</p>
        <ProfessionalRecruitmentCta locale={locale} placement="final_cta" className="button button-primary">{copy.closing.cta}</ProfessionalRecruitmentCta>
        <p className="professional-acquisition-trust">{copy.closing.trustLine}</p>
        </section>
      </ProfessionalRecruitmentActionsProvider>
    </div>
  );
}
