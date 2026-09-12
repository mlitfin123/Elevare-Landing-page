import type { Locale } from "./config.ts";

const en = {
  summaryFallback: "Review the visible poses and the coaching notes below.",
  confidence: { high: "High confidence", medium: "Medium confidence", low: "Limited confidence", unusable: "Insufficient evidence" },
  poseBreakdown: "Pose breakdown", topCorrections: "Top 3 corrections", details: "View coaching details",
  moreContext: "More context", moreCorrections: "Additional corrections", first: "First", final: "Final",
  unknownPose: "Uncertain pose", unknownComponent: "Presentation detail", unknownNote: "The sampled frames do not support a reliable pose classification.",
  transition: "Transition", frameCoverage: "Limited frame coverage", sampling: "Selected still frames show positions and resets. They do not measure exact speed, fluidity or hold duration.",
  videoQuality: "Video quality", quality: { usable: "Good", limited: "Limited", unusable: "Insufficient" },
  qualitySummary: "See framing, lighting and sampling limitations.", componentDetails: "Component details",
  reserved: "Your analysis is reserved", validating: "Checking your uploaded video", analyzing: "Analyzing your poses",
  pendingBody: "Your request is linked to this purchase. You can return to this page while StageLab finishes the analysis.",
  slowTitle: "Your analysis is taking longer", slowBody: "The same analysis is still being checked. You will not be charged again.",
  pausedTitle: "Check your saved analysis", pausedBody: "Automatic checks have paused. Check again to retrieve the same analysis; this does not start a new AI request.",
  checkAgain: "Check again", resumeTitle: "Continue this analysis", resumeBody: "Continue checking the same upload. If the upload is incomplete, we will show how to try again without paying.",
  reportUnavailable: "Your report is saved, but we could not display its format. Check again or contact support; do not purchase another analysis.",
  support: "Contact support", genericError: "We could not complete this step. Please try again.",
  unavailable: "This analysis is not available in this browser. Open it in the browser used for checkout.",
  expired: "This analysis link has expired. Website access lasts 72 hours.",
  payment: "Payment has not been confirmed for this analysis.", retryLimit: "The attempt limit has been reached. Contact support for this purchase.",
  rateLimit: "Too many requests. Wait a little before checking again.",
  uploadError: "The upload did not finish. Check your connection and continue the same analysis.",
  durationError: "Choose a video between 5 and 45 seconds long.", sizeError: "Choose a video no larger than 180 MiB.",
  typeError: "Use an MP4, MOV, M4V, WebM or 3GPP video.", decodeError: "This video could not be read. Try exporting it as MP4 or choose another video.",
  frameError: "We could not prepare the video frames. Choose a readable 5–45 second video.",
  localeUnavailable: "Posing analysis is temporarily unavailable in this language. Please try again later.",
  ios: "Download on the App Store", android: "Get it on Google Play", openApp: "Open StageLab",
};
type PosingMessages = typeof en;
const es: PosingMessages = {
  summaryFallback: "Revisa las poses visibles y las indicaciones de abajo.",
  confidence: { high: "Confianza alta", medium: "Confianza media", low: "Confianza limitada", unusable: "Evidencia insuficiente" },
  poseBreakdown: "Desglose de poses", topCorrections: "3 correcciones principales", details: "Ver indicaciones de la pose",
  moreContext: "Más contexto", moreCorrections: "Correcciones adicionales", first: "Primera", final: "Final",
  unknownPose: "Pose incierta", unknownComponent: "Detalle de presentación", unknownNote: "Los fotogramas seleccionados no permiten identificar la pose con confianza.",
  transition: "Transición", frameCoverage: "Cobertura limitada de fotogramas", sampling: "Los fotogramas seleccionados muestran posiciones y ajustes. No miden la velocidad exacta, la fluidez ni la duración de cada pose.",
  videoQuality: "Calidad del video", quality: { usable: "Buena", limited: "Limitada", unusable: "Insuficiente" },
  qualitySummary: "Revisa las limitaciones de encuadre, iluminación y muestreo.", componentDetails: "Detalles por componente",
  reserved: "Tu análisis está reservado", validating: "Revisando el video que subiste", analyzing: "Analizando tus poses",
  pendingBody: "Tu solicitud está vinculada a esta compra. Puedes volver a esta página mientras StageLab termina el análisis.",
  slowTitle: "Tu análisis está tardando más", slowBody: "Seguimos revisando el mismo análisis. No se te cobrará otra vez.",
  pausedTitle: "Consulta tu análisis guardado", pausedBody: "Las consultas automáticas se pausaron. Consulta de nuevo para recuperar el mismo análisis; esto no inicia otra solicitud de IA.",
  checkAgain: "Consultar de nuevo", resumeTitle: "Continuar este análisis", resumeBody: "Continúa revisando la misma carga. Si está incompleta, te mostraremos cómo reintentar sin volver a pagar.",
  reportUnavailable: "Tu informe está guardado, pero no pudimos mostrar su formato. Consulta de nuevo o contacta a soporte; no compres otro análisis.",
  support: "Contactar a soporte", genericError: "No pudimos completar este paso. Inténtalo de nuevo.",
  unavailable: "Este análisis no está disponible en este navegador. Ábrelo en el navegador que usaste para pagar.",
  expired: "Este enlace de análisis expiró. El acceso web dura 72 horas.",
  payment: "El pago de este análisis todavía no está confirmado.", retryLimit: "Alcanzaste el límite de intentos. Contacta a soporte para esta compra.",
  rateLimit: "Hay demasiadas solicitudes. Espera un poco antes de consultar de nuevo.",
  uploadError: "La carga no terminó. Revisa tu conexión y continúa el mismo análisis.",
  durationError: "Elige un video de entre 5 y 45 segundos.", sizeError: "Elige un video de hasta 180 MiB.",
  typeError: "Usa un video MP4, MOV, M4V, WebM o 3GPP.", decodeError: "No pudimos leer este video. Intenta exportarlo como MP4 o elige otro video.",
  frameError: "No pudimos preparar los fotogramas. Elige un video legible de 5–45 segundos.",
  localeUnavailable: "El análisis de poses no está disponible temporalmente en este idioma. Inténtalo más tarde.",
  ios: "Descargar en App Store", android: "Obtener en Google Play", openApp: "Abrir StageLab",
};
const pt: PosingMessages = {
  summaryFallback: "Confira as poses visíveis e as orientações abaixo.",
  confidence: { high: "Alta confiança", medium: "Confiança média", low: "Confiança limitada", unusable: "Evidência insuficiente" },
  poseBreakdown: "Detalhamento das poses", topCorrections: "3 principais correções", details: "Ver orientações da pose",
  moreContext: "Mais contexto", moreCorrections: "Correções adicionais", first: "Primeira", final: "Final",
  unknownPose: "Pose incerta", unknownComponent: "Detalhe de apresentação", unknownNote: "Os quadros selecionados não permitem identificar a pose com confiança.",
  transition: "Transição", frameCoverage: "Cobertura limitada de quadros", sampling: "Os quadros selecionados mostram posições e ajustes. Não medem a velocidade exata, a fluidez nem a duração de cada pose.",
  videoQuality: "Qualidade do vídeo", quality: { usable: "Boa", limited: "Limitada", unusable: "Insuficiente" },
  qualitySummary: "Confira as limitações de enquadramento, iluminação e amostragem.", componentDetails: "Detalhes por componente",
  reserved: "Sua análise está reservada", validating: "Verificando o vídeo enviado", analyzing: "Analisando suas poses",
  pendingBody: "Sua solicitação está vinculada a esta compra. Você pode voltar a esta página enquanto a StageLab termina a análise.",
  slowTitle: "Sua análise está demorando mais", slowBody: "Continuamos verificando a mesma análise. Você não será cobrado novamente.",
  pausedTitle: "Confira sua análise salva", pausedBody: "As consultas automáticas foram pausadas. Consulte novamente para recuperar a mesma análise; isso não inicia outra solicitação de IA.",
  checkAgain: "Consultar novamente", resumeTitle: "Continuar esta análise", resumeBody: "Continue verificando o mesmo envio. Se estiver incompleto, mostraremos como tentar novamente sem pagar.",
  reportUnavailable: "Seu relatório está salvo, mas não conseguimos exibir o formato. Consulte novamente ou fale com o suporte; não compre outra análise.",
  support: "Falar com o suporte", genericError: "Não foi possível concluir esta etapa. Tente novamente.",
  unavailable: "Esta análise não está disponível neste navegador. Abra no navegador usado para pagar.",
  expired: "Este link de análise expirou. O acesso pelo site dura 72 horas.",
  payment: "O pagamento desta análise ainda não foi confirmado.", retryLimit: "O limite de tentativas foi atingido. Fale com o suporte sobre esta compra.",
  rateLimit: "Há muitas solicitações. Aguarde um pouco antes de consultar novamente.",
  uploadError: "O envio não terminou. Verifique sua conexão e continue a mesma análise.",
  durationError: "Escolha um vídeo entre 5 e 45 segundos.", sizeError: "Escolha um vídeo de até 180 MiB.",
  typeError: "Use um vídeo MP4, MOV, M4V, WebM ou 3GPP.", decodeError: "Não foi possível ler este vídeo. Tente exportar como MP4 ou escolha outro vídeo.",
  frameError: "Não foi possível preparar os quadros. Escolha um vídeo legível de 5–45 segundos.",
  localeUnavailable: "A análise de poses está temporariamente indisponível neste idioma. Tente novamente mais tarde.",
  ios: "Baixar na App Store", android: "Disponível no Google Play", openApp: "Abrir StageLab",
};
export function getPosingMessages(locale: Locale): PosingMessages { return locale === "es-419" ? es : locale === "pt-BR" ? pt : en; }

const poses = ["Front Pose", "Back Pose", "Transition", "Front Double Biceps", "Side Chest", "Back Double Biceps", "Abdominals and Thigh", "Favorite Classic Pose", "Front Lat Spread", "Side Triceps", "Rear Double Biceps", "Rear Lat Spread", "Most Muscular", "Quarter Turn"];
const poseEs = ["Pose de frente", "Pose de espalda", "Transición", "Doble bíceps de frente", "Pecho de lado", "Doble bíceps de espalda", "Abdominales y muslo", "Pose clásica favorita", "Expansión dorsal de frente", "Tríceps de lado", "Doble bíceps de espalda", "Expansión dorsal de espalda", "Más musculoso", "Cuarto de giro"];
const posePt = ["Pose de frente", "Pose de costas", "Transição", "Duplo bíceps de frente", "Peitoral de lado", "Duplo bíceps de costas", "Abdominais e coxa", "Pose clássica favorita", "Expansão dorsal de frente", "Tríceps de lado", "Duplo bíceps de costas", "Expansão dorsal de costas", "Mais musculoso", "Quarto de volta"];
const components = ["silhouette", "lat presentation", "waist presentation", "shoulder positioning", "stance", "arm and hand position", "symmetry", "presentation", "shape", "elbow position", "shoulder alignment", "torso rotation", "hip placement", "leg presentation", "waist control", "stability", "execution", "muscular presentation", "alignment", "lat and chest presentation", "pose stability", "posture", "hip positioning", "torso angle", "balance", "flow", "lower-body presentation", "glute presentation", "quad visibility", "torso position", "shoulder and lat presentation", "leg positioning", "quarter-turn mechanics"];
const componentEs = ["Silueta", "Presentación de dorsales", "Presentación de cintura", "Posición de hombros", "Postura de pies", "Posición de brazos y manos", "Simetría", "Presentación", "Forma", "Posición de codos", "Alineación de hombros", "Rotación del torso", "Colocación de cadera", "Presentación de piernas", "Control de cintura", "Estabilidad", "Ejecución", "Presentación muscular", "Alineación", "Presentación de dorsales y pecho", "Estabilidad de la pose", "Postura", "Posición de cadera", "Ángulo del torso", "Equilibrio", "Continuidad de la presentación", "Presentación del tren inferior", "Presentación de glúteos", "Visibilidad de cuádriceps", "Posición del torso", "Presentación de hombros y dorsales", "Posición de piernas", "Mecánica de cuartos de giro"];
const componentPt = ["Silhueta", "Apresentação dos dorsais", "Apresentação da cintura", "Posição dos ombros", "Base dos pés", "Posição dos braços e mãos", "Simetria", "Apresentação", "Forma", "Posição dos cotovelos", "Alinhamento dos ombros", "Rotação do tronco", "Colocação do quadril", "Apresentação das pernas", "Controle da cintura", "Estabilidade", "Execução", "Apresentação muscular", "Alinhamento", "Apresentação dos dorsais e peitoral", "Estabilidade da pose", "Postura", "Posição do quadril", "Ângulo do tronco", "Equilíbrio", "Continuidade da apresentação", "Apresentação dos membros inferiores", "Apresentação dos glúteos", "Visibilidade dos quadríceps", "Posição do tronco", "Apresentação dos ombros e dorsais", "Posição das pernas", "Mecânica de quartos de volta"];
export function posingLabel(value: string, locale: Locale, kind: "pose" | "component") {
  const labels = kind === "pose" ? poses : components;
  const index = labels.findIndex((label) => label.toLowerCase() === value.trim().toLowerCase());
  if (index < 0) return kind === "pose" ? getPosingMessages(locale).unknownPose : getPosingMessages(locale).unknownComponent;
  return locale === "en" ? labels[index]! : (kind === "pose" ? locale === "es-419" ? poseEs : posePt : locale === "es-419" ? componentEs : componentPt)[index]!;
}

export function posingErrorMessage(code: unknown, locale: Locale) {
  const m = getPosingMessages(locale); const key = String(code ?? "").toLowerCase();
  if (/result_format/.test(key)) return m.reportUnavailable;
  if (/locale/.test(key)) return m.localeUnavailable;
  if (/retry_limit|attempt_limit/.test(key)) return m.retryLimit;
  if (/rate_limit/.test(key)) return m.rateLimit;
  if (/payment|order_not_paid|product_not/.test(key)) return m.payment;
  if (/entitlement_expired|order_expired/.test(key)) return m.expired;
  if (/invalid_token|missing.*browser|missing.*access/.test(key)) return m.unavailable;
  if (/video_too_short|video_too_long|duration/.test(key)) return m.durationError;
  if (/video_too_large|size/.test(key)) return m.sizeError;
  if (/mime|^type$/.test(key)) return m.typeError;
  if (/decode/.test(key)) return m.decodeError;
  if (/frames|invalid_video/.test(key)) return m.frameError;
  if (/upload/.test(key)) return m.uploadError;
  if (/timeout|taking_longer|status_unavailable|gateway_unavailable/.test(key)) return m.slowBody;
  return m.genericError;
}
