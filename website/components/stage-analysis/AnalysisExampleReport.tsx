import type { Locale } from "@/lib/i18n/config";
import type { QuickAnalysisResult } from "@/lib/quick-analysis";
import { includesPhysiqueAnalysis, includesPosingAnalysis, type StageAnalysisProduct, type PosingAnalysisResult } from "@/lib/stage-analysis";

type ExampleCopy = {
  title: string; note: string; physique: string; posing: string; separate: string; labels: string[];
  physiqueData: Pick<QuickAnalysisResult, "conditioning_assessment" | "visible_strengths" | "areas_to_improve" | "limitations">;
  posingData: Pick<PosingAnalysisResult, "biggest_opportunity" | "highest_priority_corrections">;
};
const copy: Record<Locale, ExampleCopy> = {
  "en": {
    "title": "Example report",
    "note": "Fictional example excerpts to illustrate the report format. These are not customer results or a prediction of your results.",
    "physique": "Physique report",
    "posing": "Posing report",
    "separate": "Two separate assessments. There is no combined official score.",
    "labels": [
      "Conditioning assessment",
      "Visible strengths",
      "Areas to improve",
      "Limitations",
      "Biggest opportunity",
      "Priority correction"
    ],
    "physiqueData": {
      "conditioning_assessment": "Upper-body definition is more visible than lower-body separation in this example.",
      "visible_strengths": [
        "Balanced shoulder development in the front view."
      ],
      "areas_to_improve": [
        "Use consistent lighting and stance for the next photo set."
      ],
      "limitations": [
        "A photo assessment cannot establish health status or predict competition placement."
      ]
    },
    "posingData": {
      "biggest_opportunity": "Hold the finished pose steadily before transitioning.",
      "highest_priority_corrections": [
        {
          "title": "Set the stance before opening the lats",
          "visible_evidence": "In this fictional clip, the feet shift during the front pose.",
          "try_this": "Plant both feet, settle the torso, then hold the pose."
        }
      ]
    }
  },
  "es-419": {
    "title": "Ejemplo de informe",
    "note": "Fragmentos ficticios para ilustrar el formato. No son resultados de clientes ni una predicción de tus resultados.",
    "physique": "Informe de físico",
    "posing": "Informe de poses",
    "separate": "Dos evaluaciones separadas. No hay una puntuación oficial combinada.",
    "labels": [
      "Evaluación de condición",
      "Fortalezas visibles",
      "Áreas por mejorar",
      "Limitaciones",
      "Principal oportunidad",
      "Corrección prioritaria"
    ],
    "physiqueData": {
      "conditioning_assessment": "En este ejemplo, la definición del torso es más visible que la separación muscular de las piernas.",
      "visible_strengths": [
        "Desarrollo equilibrado de hombros en la vista frontal."
      ],
      "areas_to_improve": [
        "Usa iluminación y postura consistentes en la próxima serie de fotos."
      ],
      "limitations": [
        "Las fotos no permiten determinar el estado de salud ni predecir el puesto en una competencia."
      ]
    },
    "posingData": {
      "biggest_opportunity": "Mantén estable la pose final antes de la transición.",
      "highest_priority_corrections": [
        {
          "title": "Fija la postura antes de abrir los dorsales",
          "visible_evidence": "En este video ficticio, los pies se mueven durante la pose frontal.",
          "try_this": "Apoya ambos pies, estabiliza el torso y mantén la pose."
        }
      ]
    }
  },
  "pt-BR": {
    "title": "Exemplo de relatório",
    "note": "Trechos fictícios para ilustrar o formato. Não são resultados de clientes nem uma previsão dos seus resultados.",
    "physique": "Relatório de físico",
    "posing": "Relatório de poses",
    "separate": "Duas avaliações separadas. Não há uma pontuação oficial combinada.",
    "labels": [
      "Avaliação do condicionamento",
      "Pontos fortes visíveis",
      "Pontos a melhorar",
      "Limitações",
      "Principal oportunidade",
      "Correção prioritária"
    ],
    "physiqueData": {
      "conditioning_assessment": "Neste exemplo, a definição do tronco está mais visível do que a separação muscular das pernas.",
      "visible_strengths": [
        "Desenvolvimento equilibrado dos ombros na vista frontal."
      ],
      "areas_to_improve": [
        "Use iluminação e postura consistentes no próximo conjunto de fotos."
      ],
      "limitations": [
        "Fotos não permitem determinar o estado de saúde nem prever a colocação em uma competição."
      ]
    },
    "posingData": {
      "biggest_opportunity": "Mantenha a pose final estável antes da transição.",
      "highest_priority_corrections": [
        {
          "title": "Firme a base antes de abrir os dorsais",
          "visible_evidence": "Neste vídeo fictício, os pés se movem durante a pose frontal.",
          "try_this": "Apoie os dois pés, estabilize o tronco e sustente a pose."
        }
      ]
    }
  }
};

export function AnalysisExampleReport({ product, locale }: { product: StageAnalysisProduct; locale: Locale }) {
  const m = copy[locale] ?? copy.en;
  const p = m.physiqueData;
  const correction = m.posingData.highest_priority_corrections[0];
  return (
    <section className="section analysis-example" aria-labelledby="example-report-title">
      <details className="panel">
        <summary><h2 id="example-report-title">{m.title}</h2></summary>
        <p>{m.note}</p>
        {product === "complete_stage_analysis" ? <p>{m.separate}</p> : null}
        <div className="analysis-example-grid">
          {includesPhysiqueAnalysis(product) ? <article><h3>{m.physique}</h3><dl>
            <dt>{m.labels[0]}</dt><dd>{p.conditioning_assessment}</dd>
            <dt>{m.labels[1]}</dt><dd>{p.visible_strengths.join(" ")}</dd>
            <dt>{m.labels[2]}</dt><dd>{p.areas_to_improve.join(" ")}</dd>
            <dt>{m.labels[3]}</dt><dd>{p.limitations.join(" ")}</dd>
          </dl></article> : null}
          {includesPosingAnalysis(product) ? <article><h3>{m.posing}</h3><dl>
            <dt>{m.labels[4]}</dt><dd>{m.posingData.biggest_opportunity}</dd>
            <dt>{m.labels[5]}: {correction.title}</dt><dd>{correction.visible_evidence} {correction.try_this}</dd>
          </dl></article> : null}
        </div>
      </details>
    </section>
  );
}
