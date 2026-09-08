import { TrackedLink } from "@/components/TrackedLink";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import { getQuickAnalysisEntryHref } from "@/lib/quick-analysis-attribution";
import { formatStageAnalysisPrice, type StageAnalysisProduct } from "@/lib/stage-analysis";

const copy = {
  en: {
    eyebrow: "One-time StageLab analyses",
    title: "Choose what you want to assess.",
    body: "Review your physique, your posing, or both. Each purchase is a private one-time snapshot and does not require a StageLab account.",
    products: {
      physique_analysis: ["AI Physique Analysis", "Use current photos to assess visible conditioning, muscularity, symmetry, and division alignment."],
      posing_analysis: ["AI Posing Analysis", "Use a short video to assess detected poses, presentation, consistency, and priority corrections."],
      complete_stage_analysis: ["Complete Stage Analysis", "Receive both reports from one purchase, with physique and posing scored separately."],
    },
    action: "View analysis",
  },
  "es-419": {
    eyebrow: "Análisis únicos de StageLab",
    title: "Elige qué quieres evaluar.",
    body: "Revisa tu físico, tus poses o ambos. Cada compra es una evaluación privada y única, sin necesidad de una cuenta de StageLab.",
    products: {
      physique_analysis: ["Análisis de físico con IA", "Usa fotos actuales para evaluar condición visible, musculatura, simetría y alineación con la división."],
      posing_analysis: ["Análisis de poses con IA", "Usa un video corto para evaluar poses detectadas, presentación, consistencia y correcciones prioritarias."],
      complete_stage_analysis: ["Análisis completo de escenario", "Recibe ambos informes con una sola compra y puntuaciones separadas para físico y poses."],
    },
    action: "Ver análisis",
  },
  "pt-BR": {
    eyebrow: "Análises únicas da StageLab",
    title: "Escolha o que deseja avaliar.",
    body: "Avalie seu físico, suas poses ou ambos. Cada compra é uma análise privada e única, sem exigir uma conta da StageLab.",
    products: {
      physique_analysis: ["Análise de físico com IA", "Use fotos atuais para avaliar condicionamento visível, muscularidade, simetria e alinhamento com a categoria."],
      posing_analysis: ["Análise de poses com IA", "Use um vídeo curto para avaliar poses detectadas, apresentação, consistência e correções prioritárias."],
      complete_stage_analysis: ["Análise completa de palco", "Receba os dois relatórios em uma compra, com físico e poses avaliados separadamente."],
    },
    action: "Ver análise",
  },
} as const;

const products: StageAnalysisProduct[] = ["physique_analysis", "posing_analysis", "complete_stage_analysis"];

function productHref(product: StageAnalysisProduct, locale: Locale) {
  if (product === "physique_analysis") return localizePathname(getQuickAnalysisEntryHref("stagelab"), locale);
  const slug = product === "posing_analysis" ? "posing-analysis" : "complete-stage-analysis";
  return localizePathname(`/stagelab/${slug}/`, locale);
}

export function StageAnalysisProducts({ locale = "en" }: { locale?: Locale }) {
  const messages = copy[locale];
  return (
    <section className="section stage-analysis-products" aria-labelledby={`stage-analysis-products-${locale}`}>
      <div className="section-heading">
        <div><div className="eyebrow">{messages.eyebrow}</div><h2 id={`stage-analysis-products-${locale}`}>{messages.title}</h2><p>{messages.body}</p></div>
      </div>
      <div className="stage-analysis-product-grid">
        {products.map((product) => {
          const [title, description] = messages.products[product];
          return (
            <TrackedLink
              className="panel stage-analysis-product-card"
              href={productHref(product, locale)}
              eventName="stage_analysis_product_selected"
              eventParams={{ analysis_product: product, cta_context: "stagelab_product_page" }}
              key={product}
            >
              <span className="stat-label">{formatStageAnalysisPrice(product)}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="proof-action">{messages.action}</span>
            </TrackedLink>
          );
        })}
      </div>
    </section>
  );
}
