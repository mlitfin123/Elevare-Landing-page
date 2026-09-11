import type { Locale } from "@/lib/i18n/config";
import {
  getStageLabMethodologyMessages,
  METHODOLOGY_CONCEPTS,
  METHODOLOGY_DETAILS,
} from "@/lib/i18n/stagelab-methodology-messages";

// Public product explanation only. No analysis configuration or app logic is imported.
export function StageLabMethodology({ locale = "en" }: { locale?: Locale }) {
  const copy = getStageLabMethodologyMessages(locale);

  return (
    <section className="section stagelab-methodology" id="methodology" aria-labelledby="stagelab-methodology-title">
      <div className="section-heading stagelab-methodology-intro">
        <div>
          <div className="eyebrow">{copy.eyebrow}</div>
          <h2 id="stagelab-methodology-title">{copy.title}</h2>
          <p className="stagelab-methodology-lead">{copy.lead}</p>
          <p>{copy.body}</p>
          <p className="stagelab-methodology-scope">{copy.scope}</p>
        </div>
      </div>

      <div className="stagelab-methodology-grid">
        {METHODOLOGY_CONCEPTS.map((key, index) => (
          <article className="panel stagelab-methodology-card" key={key}>
            <span className="stat-label" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <h3>{copy.cards[key].title}</h3>
            <p>{copy.cards[key].body}</p>
            <p className="stagelab-methodology-note">{copy.cards[key].note}</p>
          </article>
        ))}
      </div>

      <aside className="panel stagelab-methodology-posing" aria-labelledby="stagelab-methodology-posing-title">
        <div>
          <div className="eyebrow">{copy.posing.eyebrow}</div>
          <h3 id="stagelab-methodology-posing-title">{copy.posing.title}</h3>
          <p>{copy.posing.body}</p>
        </div>
        <div className="stagelab-methodology-separation">
          <p><strong>{copy.posing.separation}</strong></p>
          <ul>{copy.posing.unaffected.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="stagelab-methodology-note">{copy.posing.note}</p>
        </div>
      </aside>

      <figure className="panel stagelab-methodology-flow" aria-labelledby="stagelab-methodology-flow-title" aria-describedby="stagelab-methodology-flow-caption">
        <h3 id="stagelab-methodology-flow-title">{copy.flow.title}</h3>
        <p className="stat-label" id="stagelab-methodology-inputs">{copy.flow.inputsLabel}</p>
        <ul className="stagelab-methodology-inputs" role="list" aria-labelledby="stagelab-methodology-inputs">
          {copy.flow.inputs.map(item => <li key={item}>{item}</li>)}
        </ul>
        <span className="stagelab-methodology-arrow" aria-hidden="true">↓</span>
        <ol className="stagelab-methodology-steps" role="list">
          {copy.flow.steps.map((item, index) => <li key={item}><span aria-hidden="true">{index + 1}</span>{item}</li>)}
        </ol>
        <figcaption id="stagelab-methodology-flow-caption">{copy.flow.caption}</figcaption>
      </figure>

      <div className="stagelab-methodology-more" aria-labelledby="stagelab-methodology-more-title">
        <h3 id="stagelab-methodology-more-title">{copy.detailsTitle}</h3>
        <div className="quick-analysis-faq-list">
          {METHODOLOGY_DETAILS.map(key => (
            <details className="quick-analysis-faq panel" key={key}>
              <summary>{copy.details[key].title}</summary>
              <div className="stagelab-methodology-detail-body">
                {copy.details[key].paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </details>
          ))}
        </div>
      </div>

      <aside className="panel stagelab-methodology-limits" aria-labelledby="stagelab-methodology-limits-title">
        <h3 id="stagelab-methodology-limits-title">{copy.limits.title}</h3>
        <p>{copy.limits.intro}</p>
        <ul>{copy.limits.items.map(item => <li key={item}>{item}</li>)}</ul>
        <p><strong>{copy.limits.posing}</strong></p>
        <p className="stagelab-methodology-note">{copy.limits.guidance}</p>
      </aside>
    </section>
  );
}

export function StageLabMethodologyTransition({ locale = "en" }: { locale?: Locale }) {
  return <p className="stagelab-methodology-transition">{getStageLabMethodologyMessages(locale).transition}</p>;
}
