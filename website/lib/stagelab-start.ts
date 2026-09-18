import type { Locale } from "./i18n/config.ts";

export type CampaignFields = Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content", string>>;

const sources = new Set(["meta", "facebook", "instagram", "google", "youtube", "tiktok", "reddit", "email"]);
const mediums = new Set(["paid-social", "paid_social", "cpc", "paid-search", "paid_search", "email"]);
const campaigns = new Set(["stagelab-first-analysis", "stagelab-free-analysis", "stagelab-trial", "prep-trial"]);
const contents = new Set(["static", "video", "story", "reel", "creative-a", "creative-b", "creative_a"]);

export type StageLabVisitorPlatform = "ios" | "android" | "other";

export function detectStageLabPlatform(userAgent: string): StageLabVisitorPlatform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  return "other";
}

export function safeStageLabCampaignFields(params: URLSearchParams): CampaignFields {
  const result: CampaignFields = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const) {
    const values = params.getAll(key);
    if (values.length !== 1) continue;
    const value = values[0];
    // Only known campaign values; reject free text, URLs, emails and identifiers.
    if (!value || value.length > 48 || !/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/.test(value)) continue;
    if (key === "utm_source" && !sources.has(value)) continue;
    if (key === "utm_medium" && !mediums.has(value)) continue;
    if (key === "utm_campaign" && !campaigns.has(value)) continue;
    if (key === "utm_content" && !contents.has(value)) continue;
    if (/\d{7,}/.test(value) || /[a-f0-9]{8}-[a-f0-9]{4}/.test(value)) continue;
    result[key] = value;
  }
  return result;
}

export function stageLabStartSwitchSearch(search: string): string {
  const safe = new URLSearchParams();
  for (const [key, value] of Object.entries(safeStageLabCampaignFields(new URLSearchParams(search)))) {
    if (value) safe.set(key, value);
  }
  return safe.size ? `?${safe}` : "";
}

export const stageLabStartMessages = {
  en: {
    eyebrow: "STAGELAB · COMPETITION PREP",
    title: "Your physique. Your posing. Your prep.",
    description: "Get AI-assisted physique and posing feedback, track your progress, and review your prep in StageLab.",
    freeTitle: "First physique analysis free",
    freeBody: "Upload your check-in photos and get AI-assisted feedback on your physique.",
    trialTitle: "Explore more with a 7-day trial",
    trialBody: "Try StageLab’s subscription features.",
    separateOffers: "Your first physique analysis does not require a trial. The subscription trial is separate and optional.",
    trialTerms: "For eligible new subscribers. After 7 days, the selected monthly or annual plan renews automatically at the app-store price unless canceled. Cancel in your app store at least 24 hours before the trial ends.",
    nextStep: "Download StageLab and create an account in the app to get started. Trial eligibility and activation are handled in the app.",
    download: "Download StageLab",
    ios: "App Store",
    android: "Google Play",
    storeGroup: "Choose your app store",
    videoHeading: "See how StageLab works",
    videoDescription: "See how StageLab reviews a check-in, recommends a prep adjustment, and explains what changed.",
    videoNote: "23-second demo · video in English",
    playVideo: "Play weekly check-in demo",
    videoTitle: "StageLab weekly check-in demo",
    watchOnYouTube: "Watch on YouTube",
    examplesTitle: "See StageLab in action",
    physiqueTitle: "Physique feedback",
    physiqueCaption: "Understand your visible strengths and areas to work on.",
    physiqueLabel: "Example feedback · screenshot in English",
    physiqueAlt: "StageLab visual review example showing visible strengths, missing markers, and presentation notes",
    posingTitle: "Posing analysis",
    posingCaption: "Review your posing with specific practice cues.",
    posingLabel: "Example posing feedback · screenshot in English",
    posingAlt: "StageLab posing analysis example with a lower-body correction and a specific practice cue",
    posingAccess: "Posing analysis requires Pro access. Eligible trial subscribers can explore it in the app.",
    weeklyTitle: "Weekly check-in",
    weeklyCaption: "Keep your prep and progress in one place.",
    weeklyLabel: "Example weekly plan adjustment · screenshot in English",
    weeklyAlt: "StageLab weekly plan example recommending increased cardio, with LISS sessions changing from three to four",
    imageUnavailable: "Example image unavailable.",
    featureAccess: "Subscription access and trial eligibility are confirmed in the app.",
    closingTitle: "Ready to get started?",
    closingTerms: "Your first physique analysis is free. A separate 7-day trial is available to eligible new subscribers and automatically renews at the selected app-store plan price unless canceled.",
    disclaimer: "AI feedback can be inaccurate. No one-to-one coaching included.",
    more: "About StageLab",
    privacy: "Privacy",
    terms: "Terms",
    support: "Support",
    footer: "StageLab by Elevare Fit LLC",
  },
  "es-419": {
    eyebrow: "STAGELAB · PREPARACIÓN PARA COMPETIR",
    title: "Tu físico. Tus poses. Tu preparación.",
    description: "Recibe comentarios sobre tu físico y tus poses con ayuda de IA, registra tu progreso y revisa tu preparación en StageLab.",
    freeTitle: "Primer análisis físico gratis",
    freeBody: "Sube tus fotos de seguimiento y recibe comentarios sobre tu físico con ayuda de IA.",
    trialTitle: "Explora más con una prueba de 7 días",
    trialBody: "Prueba las funciones de suscripción de StageLab.",
    separateOffers: "Tu primer análisis físico no requiere una prueba. La prueba de suscripción es aparte y opcional.",
    trialTerms: "Para nuevos suscriptores elegibles. Después de 7 días, el plan mensual o anual elegido se renueva automáticamente al precio de la tienda, salvo que lo canceles. Cancela en tu tienda al menos 24 horas antes de que termine la prueba.",
    nextStep: "Descarga StageLab y crea una cuenta en la app para comenzar. La elegibilidad y activación de la prueba se gestionan en la app.",
    download: "Descargar StageLab",
    ios: "App Store",
    android: "Google Play",
    storeGroup: "Elige tu tienda de aplicaciones",
    videoHeading: "Descubre cómo funciona StageLab",
    videoDescription: "Descubre cómo StageLab revisa un seguimiento, recomienda un ajuste en la preparación y explica qué cambió.",
    videoNote: "Demostración de 23 segundos · video en inglés",
    playVideo: "Reproducir la demostración del seguimiento semanal",
    videoTitle: "Demostración del seguimiento semanal de StageLab",
    watchOnYouTube: "Ver en YouTube",
    examplesTitle: "Descubre StageLab en acción",
    physiqueTitle: "Comentarios sobre tu físico",
    physiqueCaption: "Comprende tus puntos fuertes visibles y las áreas en las que puedes trabajar.",
    physiqueLabel: "Ejemplo de comentarios · captura en inglés",
    physiqueAlt: "Ejemplo de evaluación visual de StageLab con puntos fuertes, áreas por mejorar y notas de presentación; texto de la captura en inglés",
    posingTitle: "Análisis de poses",
    posingCaption: "Revisa tus poses con indicaciones concretas para practicar.",
    posingLabel: "Ejemplo de análisis de poses · captura en inglés",
    posingAlt: "Ejemplo de análisis de poses de StageLab con una corrección del tren inferior y una indicación concreta para practicar; texto de la captura en inglés",
    posingAccess: "El análisis de poses requiere acceso Pro. Los suscriptores elegibles para la prueba pueden explorarlo en la app.",
    weeklyTitle: "Seguimiento semanal",
    weeklyCaption: "Mantén tu preparación y tu progreso en un solo lugar.",
    weeklyLabel: "Ejemplo de ajuste semanal del plan · captura en inglés",
    weeklyAlt: "Ejemplo de plan semanal de StageLab que recomienda aumentar el cardio de tres a cuatro sesiones LISS; texto de la captura en inglés",
    imageUnavailable: "La imagen de ejemplo no está disponible.",
    featureAccess: "El acceso a las funciones de suscripción y la elegibilidad para la prueba se confirman en la app.",
    closingTitle: "¿Listo para comenzar?",
    closingTerms: "Tu primer análisis físico es gratis. Hay una prueba de 7 días aparte para nuevos suscriptores elegibles; se renueva automáticamente al precio del plan elegido en la tienda, salvo que la canceles.",
    disclaimer: "Los comentarios de IA pueden ser inexactos. No se incluye asesoría individual.",
    more: "Acerca de StageLab",
    privacy: "Privacidad",
    terms: "Términos",
    support: "Soporte",
    footer: "StageLab de Elevare Fit LLC",
  },
  "pt-BR": {
    eyebrow: "STAGELAB · PREPARAÇÃO PARA COMPETIÇÕES",
    title: "Seu físico. Suas poses. Sua preparação.",
    description: "Receba análises do seu físico e das suas poses com auxílio de IA, acompanhe seu progresso e revise sua preparação no StageLab.",
    freeTitle: "Primeira análise física grátis",
    freeBody: "Envie suas fotos de acompanhamento e receba uma análise do seu físico com auxílio de IA.",
    trialTitle: "Explore mais com um teste de 7 dias",
    trialBody: "Experimente os recursos de assinatura do StageLab.",
    separateOffers: "Sua primeira análise física não exige um teste. O teste da assinatura é separado e opcional.",
    trialTerms: "Para novos assinantes elegíveis. Após 7 dias, o plano mensal ou anual escolhido é renovado automaticamente pelo preço da loja, a menos que seja cancelado. Cancele na loja pelo menos 24 horas antes do fim do teste.",
    nextStep: "Baixe o StageLab e crie uma conta no app para começar. A elegibilidade e a ativação do teste são gerenciadas no app.",
    download: "Baixar StageLab",
    ios: "App Store",
    android: "Google Play",
    storeGroup: "Escolha sua loja de aplicativos",
    videoHeading: "Veja como o StageLab funciona",
    videoDescription: "Veja como o StageLab analisa um acompanhamento, recomenda um ajuste na preparação e explica o que mudou.",
    videoNote: "Demonstração de 23 segundos · vídeo em inglês",
    playVideo: "Reproduzir demonstração do acompanhamento semanal",
    videoTitle: "Demonstração do acompanhamento semanal do StageLab",
    watchOnYouTube: "Assistir no YouTube",
    examplesTitle: "Veja o StageLab em ação",
    physiqueTitle: "Análise do físico",
    physiqueCaption: "Entenda seus pontos fortes visíveis e as áreas que pode melhorar.",
    physiqueLabel: "Exemplo de análise · captura em inglês",
    physiqueAlt: "Exemplo de avaliação visual do StageLab com pontos fortes, áreas a melhorar e observações sobre apresentação; texto da captura em inglês",
    posingTitle: "Análise de poses",
    posingCaption: "Revise suas poses com orientações específicas para praticar.",
    posingLabel: "Exemplo de análise de poses · captura em inglês",
    posingAlt: "Exemplo de análise de poses do StageLab com correção para a parte inferior do corpo e orientação específica para praticar; texto da captura em inglês",
    posingAccess: "A análise de poses exige acesso Pro. Assinantes elegíveis para o teste podem explorá-la no app.",
    weeklyTitle: "Acompanhamento semanal",
    weeklyCaption: "Mantenha sua preparação e seu progresso em um só lugar.",
    weeklyLabel: "Exemplo de ajuste semanal do plano · captura em inglês",
    weeklyAlt: "Exemplo de plano semanal do StageLab que recomenda aumentar o cardio de três para quatro sessões LISS; texto da captura em inglês",
    imageUnavailable: "A imagem de exemplo está indisponível.",
    featureAccess: "O acesso aos recursos da assinatura e a elegibilidade para o teste são confirmados no app.",
    closingTitle: "Pronto para começar?",
    closingTerms: "Sua primeira análise física é grátis. Há um teste separado de 7 dias para novos assinantes elegíveis; ele é renovado automaticamente pelo preço do plano escolhido na loja, a menos que seja cancelado.",
    disclaimer: "As análises da IA podem ser imprecisas. Acompanhamento individual não incluído.",
    more: "Sobre o StageLab",
    privacy: "Privacidade",
    terms: "Termos",
    support: "Suporte",
    footer: "StageLab da Elevare Fit LLC",
  },
} as const satisfies Record<Locale, unknown>;
