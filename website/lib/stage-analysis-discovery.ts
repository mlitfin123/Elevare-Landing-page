import { localizePathname, type Locale } from "./i18n/config.ts";
import { type QuickAnalysisSource } from "./quick-analysis-attribution.ts";
import { STAGE_ANALYSIS_PRODUCT_CONFIG, type StageAnalysisProduct } from "./stage-analysis.ts";

// Public presentation only. Checkout continues validating prices on the server.
export const analysisPaths: Record<StageAnalysisProduct, string> = {
  physique_analysis: "/stagelab/quick-analysis/",
  posing_analysis: "/stagelab/posing-analysis/",
  complete_stage_analysis: "/stagelab/complete-stage-analysis/",
};
export function getStageAnalysisEntryHref(product: StageAnalysisProduct, source: QuickAnalysisSource, locale: Locale = "en") {
  return localizePathname(`${analysisPaths[product]}?source=${encodeURIComponent(source)}`, locale);
}
export function getCompleteStageSavingsCents() {
  return Math.max(0, STAGE_ANALYSIS_PRODUCT_CONFIG.physique_analysis.priceCents
    + STAGE_ANALYSIS_PRODUCT_CONFIG.posing_analysis.priceCents
    - STAGE_ANALYSIS_PRODUCT_CONFIG.complete_stage_analysis.priceCents);
}
type DiscoveryCopy = {
  audience: string; title: string; body: string; terms: string; action: string;
  oneTime: string; bundle: string; savings: string; languageFallback: string;
  products: Record<StageAnalysisProduct, { title: string; description: string; input: string }>;
};
export const analysisDiscoveryCopy: Record<Locale, DiscoveryCopy> = {
  en: {
    audience: "For bodybuilding and physique athletes", title: "StageLab AI Analyses",
    body: "Get AI-assisted feedback on your physique, posing, or both.",
    terms: "One-time website reports. No account or subscription required. App access and ongoing coaching are separate.",
    action: "View analysis", oneTime: "one time", bundle: "Physique + posing",
    savings: "Save {price} compared with buying both separately.",
    languageFallback: "Your report will be generated in English. The website and checkout remain in your selected language.",
    products: {
      physique_analysis: { title: "AI Physique Analysis", description: "Feedback on visible conditioning, muscularity, and symmetry.", input: "3–5 photos" },
      posing_analysis: { title: "Bodybuilding Posing Analysis", description: "Review detected poses, presentation, and priority corrections.", input: "Short video · 5–45 seconds" },
      complete_stage_analysis: { title: "Complete Stage Analysis", description: "Both reports in one purchase, with physique and posing assessed separately.", input: "Photos + short video" },
    },
  },
  "es-419": {
    audience: "Para atletas de fisicoculturismo y físico", title: "Análisis con IA de StageLab",
    body: "Recibe comentarios asistidos por IA sobre tu físico, tus poses o ambos.",
    terms: "Informes únicos en el sitio web. No necesitas cuenta ni suscripción. El acceso a la app y el coaching continuo son servicios aparte.",
    action: "Ver análisis", oneTime: "pago único", bundle: "Físico + poses",
    savings: "Ahorra {price} frente a comprar ambos por separado.",
    languageFallback: "Tu informe se generará en inglés. El sitio y el pago permanecen en el idioma seleccionado.",
    products: {
      physique_analysis: { title: "Análisis de físico con IA", description: "Comentarios sobre condición visible, musculatura y simetría.", input: "3–5 fotos" },
      posing_analysis: { title: "Análisis de poses de fisicoculturismo", description: "Revisa poses detectadas, presentación y correcciones prioritarias.", input: "Video corto · 5–45 segundos" },
      complete_stage_analysis: { title: "Análisis completo de escenario", description: "Ambos informes en una compra, con evaluaciones separadas de físico y poses.", input: "Fotos + video corto" },
    },
  },
  "pt-BR": {
    audience: "Para atletas de fisiculturismo e físico", title: "Análises com IA da StageLab",
    body: "Receba feedback com auxílio de IA sobre seu físico, suas poses ou ambos.",
    terms: "Relatórios avulsos no site. Não é necessário conta nem assinatura. O acesso ao app e o acompanhamento contínuo são serviços separados.",
    action: "Ver análise", oneTime: "pagamento único", bundle: "Físico + poses",
    savings: "Economize {price} em relação à compra dos dois separadamente.",
    languageFallback: "Seu relatório será gerado em inglês. O site e o pagamento permanecem no idioma selecionado.",
    products: {
      physique_analysis: { title: "Análise de físico com IA", description: "Feedback sobre condicionamento visível, muscularidade e simetria.", input: "3–5 fotos" },
      posing_analysis: { title: "Análise de poses de fisiculturismo", description: "Confira poses detectadas, apresentação e correções prioritárias.", input: "Vídeo curto · 5–45 segundos" },
      complete_stage_analysis: { title: "Análise completa de palco", description: "Os dois relatórios em uma compra, com avaliações separadas de físico e poses.", input: "Fotos + vídeo curto" },
    },
  },
};
// Editorial selections, not keyword/category injection across the article library.
export const articleAnalysisProducts: Readonly<Record<string, StageAnalysisProduct>> = {
  "bodybuilding-prep-tracking-basics": "physique_analysis",
  "mens-physique-classic-physique-prep-6-weeks-out": "physique_analysis",
  "mens-physique-classic-physique-prep-4-weeks-out": "complete_stage_analysis",
};
