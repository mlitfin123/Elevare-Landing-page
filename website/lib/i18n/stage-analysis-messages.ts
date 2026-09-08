import type { Locale } from "./config.ts";
import type { PaidStageAnalysisProduct } from "../stage-analysis.ts";

export type StageAnalysisMessages = {
  seo: Record<PaidStageAnalysisProduct, { title: string; description: string }>;
  landing: Record<PaidStageAnalysisProduct, {
    eyebrow: string;
    title: string;
    body: string;
    features: string[];
    checkoutTitle: string;
    checkoutBody: string;
    faq: Array<{ question: string; answer: string }>;
  }>;
  checkout: {
    details: string;
    securePayment: string;
    completePurchase: string;
    oneTime: string;
    division: string;
    selectDivision: string;
    preparing: string;
    yes: string;
    snapshotOnly: string;
    weeksOut: string;
    context: string;
    optional: string;
    contextPlaceholder: string;
    age: string;
    ai: string;
    purchase: string;
    loading: string;
    back: string;
    termsBefore: string;
    terms: string;
    validation: string;
    cancelled: string;
    unavailable: string;
    failed: string;
  };
  result: {
    opening: string;
    confirming: string;
    unavailable: string;
    back: string;
    paymentConfirmed: string;
    uploadTitle: string;
    uploadBody: string;
    recordingTitle: string;
    recordingItems: string[];
    videoLabel: string;
    videoHelp: string;
    recordVideo: string;
    uploadVideo: string;
    chooseVideo: string;
    replaceVideo: string;
    selected: string;
    consent: string;
    privacyTitle: string;
    privacyBody: string;
    analyze: string;
    resume: string;
    resumeBody: string;
    preparingFrames: string;
    uploading: string;
    analyzing: string;
    keepOpen: string;
    retry: string;
    attempts: string;
    processingTitle: string;
    processingBody: string;
    expiredTitle: string;
    expiredBody: string;
    reportTitle: string;
    poweredBy: string;
    score: string;
    notScored: string;
    quality: string;
    usability: string;
    biggestOpportunity: string;
    strengths: string;
    corrections: string;
    visibleEvidence: string;
    tryThis: string;
    detectedPoses: string;
    strongestAspect: string;
    biggestIssue: string;
    coachingCue: string;
    components: string;
    transitions: string;
    consistency: string;
    nextFocus: string;
    limitations: string;
    completeTitle: string;
    physiqueComponent: string;
    posingComponent: string;
    componentPending: string;
    componentComplete: string;
    topPriorities: string;
    separateScores: string;
    ctaTitle: Record<PaidStageAnalysisProduct, string>;
    ctaBody: Record<PaidStageAnalysisProduct, string>;
    learnMore: string;
    error: string;
    paymentValid: string;
  };
};

const en: StageAnalysisMessages = {
  seo: {
    posing_analysis: { title: "Bodybuilding Posing Analysis | StageLab", description: "Upload a short posing video and receive structured StageLab feedback on presentation, detected poses, strengths, and priority corrections." },
    complete_stage_analysis: { title: "Complete Bodybuilding Stage Analysis | StageLab", description: "Combine a physique and conditioning review with StageLab posing feedback in one complete, one-time stage analysis." },
  },
  landing: {
    posing_analysis: {
      eyebrow: "StageLab Bodybuilding Posing Analysis",
      title: "See what your posing is showing on stage.",
      body: "Upload one short posing video for structured, division-aware feedback powered by StageLab. You receive the result without creating an account.",
      features: ["Detected poses and pose-level scores", "Presentation strengths and priority corrections", "Transition and consistency observations"],
      checkoutTitle: "Get your posing analysis",
      checkoutBody: "Choose your division and complete a secure one-time payment. You will upload the video after payment is confirmed.",
      faq: [
        { question: "What video should I use?", answer: "Use a 15–30 second video with your full body visible, one athlete in frame, steady lighting, and a stable camera. Videos from 5–45 seconds are accepted." },
        { question: "Are videos saved?", answer: "ElevareFit does not store your video or frames. They upload directly to StageLab private temporary storage, are used for this analysis, and are deleted by StageLab's cleanup process." },
        { question: "Is this an official judging score?", answer: "No. The StageLab Posing Score is informational feedback and does not predict placement or contest outcome." },
      ],
    },
    complete_stage_analysis: {
      eyebrow: "StageLab Complete Stage Analysis",
      title: "Review your physique and posing together.",
      body: "Receive the existing AI Physique Analysis and StageLab-powered Posing Analysis with one purchase and two clearly separated reports.",
      features: ["Physique and conditioning snapshot", "Division-aware posing assessment", "Separate results with no artificial combined score"],
      checkoutTitle: "Get your complete stage analysis",
      checkoutBody: "Choose your division and prep context, then complete one secure payment. Photos and video are submitted after payment.",
      faq: [
        { question: "What is included?", answer: "One physique analysis using standardized photos and one posing analysis using a short posing video." },
        { question: "Will I be charged twice?", answer: "No. Complete Stage Analysis is one $1.49 USD purchase that grants both components." },
        { question: "What if one analysis fails?", answer: "A successful component is preserved. You can retry an eligible failed component without paying again." },
      ],
    },
  },
  checkout: {
    details: "Your analysis", securePayment: "Secure payment", completePurchase: "Complete purchase", oneTime: "One time", division: "Competition division", selectDivision: "Select a division", preparing: "Are you preparing for a show?", yes: "Yes", snapshotOnly: "No, assess my current physique", weeksOut: "Weeks out", context: "Optional context", optional: "Optional", contextPlaceholder: "Anything useful about your current prep or presentation", age: "I confirm I am at least 18 years old.", ai: "I consent to AI processing for this one-time analysis and have reviewed the Privacy Policy.", purchase: "Get My Analysis", loading: "Preparing secure payment...", back: "Back to details", termsBefore: "By purchasing, you agree to the", terms: "Terms of Service", validation: "Complete the required fields before continuing.", cancelled: "Payment was not completed. You can try again when ready.", unavailable: "Secure payment is temporarily unavailable.", failed: "We could not prepare checkout. Please try again.",
  },
  result: {
    resume: "Resume Analysis",
    resumeBody: "Your secure upload was prepared. Resume the same analysis without uploading again or being charged again.",
    opening: "Opening your analysis", confirming: "Confirming your purchase securely.", unavailable: "This analysis is not available in this browser.", back: "Back to analysis", paymentConfirmed: "Payment confirmed", uploadTitle: "Add your posing video", uploadBody: "Your video and extracted frames go directly to StageLab's private temporary storage. ElevareFit does not receive or store the media.", recordingTitle: "For the clearest assessment", recordingItems: ["Record 15–30 seconds; 5–45 seconds is accepted", "Keep your full body visible with one athlete in frame", "Use steady lighting and a stable camera", "MP4, MOV, M4V, WebM, and 3GPP are supported"], videoLabel: "Posing video", videoHelp: "Maximum 180 MiB. Horizontal or vertical video is accepted.", recordVideo: "Record video", uploadVideo: "Upload existing video", chooseVideo: "Choose video", replaceVideo: "Replace video", selected: "Selected", consent: "I consent to transient AI processing of this video and the browser-extracted frames for this analysis.", privacyTitle: "Your media is not saved by ElevareFit", privacyBody: "The video and frames are used only for this analysis, uploaded directly to StageLab private temporary storage, and removed through StageLab's cleanup process.", analyze: "Analyze My Posing", preparingFrames: "Preparing private video frames...", uploading: "Uploading securely to StageLab...", analyzing: "StageLab is analyzing your posing...", keepOpen: "Keep this page open while the analysis finishes.", retry: "Try Again Without Paying", attempts: "Attempts used", processingTitle: "Your posing is being analyzed", processingBody: "StageLab is completing the structured report. This page will update automatically.", expiredTitle: "This analysis link has expired", expiredBody: "For privacy, browser access to paid results is available for 72 hours.", reportTitle: "StageLab Posing Analysis", poweredBy: "Powered by StageLab", score: "StageLab Posing Score", notScored: "Not scored", quality: "Analysis quality", usability: "Video usability", biggestOpportunity: "Biggest opportunity", strengths: "Overall strengths", corrections: "Highest-priority corrections", visibleEvidence: "Visible evidence", tryThis: "Try this", detectedPoses: "Detected poses", strongestAspect: "Strongest aspect", biggestIssue: "Biggest issue", coachingCue: "Coaching cue", components: "Component scores", transitions: "Transition observations", consistency: "Consistency observations", nextFocus: "Your next focus", limitations: "Important limitations", completeTitle: "Complete Stage Analysis", physiqueComponent: "Physique & Conditioning", posingComponent: "Posing & Presentation", componentPending: "Complete each part below to build your two-part report.", componentComplete: "Complete", topPriorities: "Top Stage Priorities", separateScores: "Physique and posing remain separate assessments. StageLab does not calculate an artificial combined score.", ctaTitle: { posing_analysis: "Keep improving your posing with StageLab.", complete_stage_analysis: "Track your physique, posing, and prep throughout contest prep with StageLab." }, ctaBody: { posing_analysis: "Use StageLab to track check-ins and keep refining how you present your physique.", complete_stage_analysis: "Bring weekly check-ins, conditioning, posing, and prep decisions into one ongoing workflow." }, learnMore: "Learn More About StageLab", error: "We could not complete the posing analysis.", paymentValid: "Your payment is still valid. Retrying will not charge you again.",
  },
};

const es: StageAnalysisMessages = {
  ...en,
  seo: {
    posing_analysis: { title: "Análisis de poses de fisicoculturismo | StageLab", description: "Sube un video corto de poses y recibe comentarios estructurados de StageLab sobre presentación, poses detectadas y correcciones prioritarias." },
    complete_stage_analysis: { title: "Análisis completo de escenario | StageLab", description: "Combina una revisión de físico y condición con comentarios de poses de StageLab en un solo análisis." },
  },
  landing: {
    posing_analysis: { eyebrow: "Análisis de poses de fisicoculturismo de StageLab", title: "Descubre lo que tus poses muestran en el escenario.", body: "Sube un video corto para recibir comentarios estructurados y adaptados a tu división, sin crear una cuenta.", features: ["Poses detectadas y puntuaciones por pose", "Fortalezas y correcciones prioritarias", "Observaciones de transiciones y consistencia"], checkoutTitle: "Obtén tu análisis de poses", checkoutBody: "Elige tu división y completa un pago único seguro. Subirás el video después de confirmar el pago.", faq: [{ question: "¿Qué video debo usar?", answer: "Usa un video de 15–30 segundos con el cuerpo completo visible, una persona, buena iluminación y cámara estable. Se aceptan 5–45 segundos." }, { question: "¿Se guardan los videos?", answer: "ElevareFit no guarda tu video ni los fotogramas. Se suben directamente al almacenamiento privado temporal de StageLab y se eliminan mediante su proceso de limpieza." }, { question: "¿Es una puntuación oficial?", answer: "No. La puntuación de poses de StageLab es informativa y no predice resultados ni posiciones." }] },
    complete_stage_analysis: { eyebrow: "Análisis completo de escenario de StageLab", title: "Revisa tu físico y tus poses en conjunto.", body: "Recibe el Análisis de Físico existente y el Análisis de Poses de StageLab con una sola compra y dos informes separados.", features: ["Resumen de físico y condición", "Evaluación de poses según la división", "Resultados separados sin una puntuación combinada artificial"], checkoutTitle: "Obtén tu análisis completo", checkoutBody: "Elige tu división y contexto, y completa un solo pago seguro. Las fotos y el video se envían después del pago.", faq: [{ question: "¿Qué incluye?", answer: "Un análisis de físico con fotos estandarizadas y un análisis de poses con un video corto." }, { question: "¿Me cobrarán dos veces?", answer: "No. Es una sola compra de $1.49 USD que incluye ambos componentes." }, { question: "¿Qué pasa si falla un análisis?", answer: "El componente exitoso se conserva y puedes reintentar el componente elegible sin volver a pagar." }] },
  },
  checkout: { ...en.checkout, details: "Tu análisis", securePayment: "Pago seguro", completePurchase: "Completar compra", oneTime: "Pago único", division: "División de competencia", selectDivision: "Selecciona una división", preparing: "¿Te estás preparando para competir?", yes: "Sí", snapshotOnly: "No, evaluar mi físico actual", weeksOut: "Semanas para competir", context: "Contexto opcional", optional: "Opcional", contextPlaceholder: "Información útil sobre tu preparación o presentación", age: "Confirmo que tengo al menos 18 años.", ai: "Acepto el procesamiento con IA para este análisis único y revisé la Política de Privacidad.", purchase: "Obtener mi análisis", loading: "Preparando pago seguro...", back: "Volver a los detalles", termsBefore: "Al comprar, aceptas los", terms: "Términos de Servicio", validation: "Completa los campos obligatorios para continuar.", cancelled: "El pago no se completó. Puedes intentarlo de nuevo.", unavailable: "El pago seguro no está disponible temporalmente.", failed: "No pudimos preparar el pago. Inténtalo de nuevo." },
  result: { ...en.result, opening: "Abriendo tu análisis", confirming: "Confirmando tu compra de forma segura.", unavailable: "Este análisis no está disponible en este navegador.", back: "Volver al análisis", paymentConfirmed: "Pago confirmado", uploadTitle: "Agrega tu video de poses", uploadBody: "Tu video y los fotogramas van directamente al almacenamiento privado temporal de StageLab. ElevareFit no recibe ni guarda los archivos.", recordingTitle: "Para una evaluación más clara", recordingItems: ["Graba 15–30 segundos; se aceptan 5–45", "Mantén todo el cuerpo visible y una sola persona", "Usa buena iluminación y una cámara estable", "Se admiten MP4, MOV, M4V, WebM y 3GPP"], videoLabel: "Video de poses", videoHelp: "Máximo 180 MiB. Se acepta video horizontal o vertical.", chooseVideo: "Elegir video", replaceVideo: "Reemplazar video", selected: "Seleccionado", consent: "Acepto el procesamiento transitorio con IA de este video y sus fotogramas para este análisis.", privacyTitle: "ElevareFit no guarda tus archivos", privacyBody: "El video y los fotogramas se usan solo para este análisis, se suben directamente al almacenamiento privado temporal de StageLab y se eliminan mediante su proceso de limpieza.", analyze: "Analizar mis poses", preparingFrames: "Preparando fotogramas privados...", uploading: "Subiendo de forma segura a StageLab...", analyzing: "StageLab está analizando tus poses...", keepOpen: "Mantén esta página abierta hasta que finalice.", retry: "Reintentar sin pagar", attempts: "Intentos usados", processingTitle: "Tus poses se están analizando", processingBody: "StageLab está completando el informe estructurado. Esta página se actualizará automáticamente.", expiredTitle: "Este enlace de análisis venció", expiredBody: "Por privacidad, el acceso del navegador está disponible durante 72 horas.", reportTitle: "Análisis de poses de StageLab", poweredBy: "Desarrollado por StageLab", score: "Puntuación de poses de StageLab", notScored: "Sin puntuación", quality: "Calidad del análisis", usability: "Utilidad del video", biggestOpportunity: "Mayor oportunidad", strengths: "Fortalezas generales", corrections: "Correcciones prioritarias", visibleEvidence: "Evidencia visible", tryThis: "Prueba esto", detectedPoses: "Poses detectadas", strongestAspect: "Aspecto más fuerte", biggestIssue: "Problema principal", coachingCue: "Indicación técnica", components: "Puntuaciones por componente", transitions: "Observaciones de transiciones", consistency: "Observaciones de consistencia", nextFocus: "Próximo enfoque", limitations: "Limitaciones importantes", completeTitle: "Análisis completo de escenario", physiqueComponent: "Físico y condición", posingComponent: "Poses y presentación", componentPending: "Listo para subir", componentComplete: "Completo", ctaTitle: { posing_analysis: "Sigue mejorando tus poses con StageLab.", complete_stage_analysis: "Sigue tu físico, tus poses y tu preparación con StageLab." }, ctaBody: { posing_analysis: "Usa StageLab para registrar controles y mejorar cómo presentas tu físico.", complete_stage_analysis: "Reúne controles semanales, condición, poses y decisiones de preparación en un solo flujo." }, learnMore: "Conocer StageLab", error: "No pudimos completar el análisis de poses.", paymentValid: "Tu pago sigue siendo válido. Reintentar no generará otro cobro." },
};

const pt: StageAnalysisMessages = {
  ...en,
  seo: {
    posing_analysis: { title: "Análise de poses de fisiculturismo | StageLab", description: "Envie um vídeo curto de poses e receba feedback estruturado da StageLab sobre apresentação, poses detectadas e correções prioritárias." },
    complete_stage_analysis: { title: "Análise completa de palco | StageLab", description: "Combine uma avaliação do físico e condicionamento com feedback de poses da StageLab em uma única análise." },
  },
  landing: {
    posing_analysis: { eyebrow: "Análise de poses de fisiculturismo da StageLab", title: "Veja o que suas poses mostram no palco.", body: "Envie um vídeo curto para receber feedback estruturado e específico para sua categoria, sem criar uma conta.", features: ["Poses detectadas e notas por pose", "Pontos fortes e correções prioritárias", "Observações de transições e consistência"], checkoutTitle: "Receba sua análise de poses", checkoutBody: "Escolha sua categoria e conclua um pagamento único seguro. Você enviará o vídeo após a confirmação.", faq: [{ question: "Qual vídeo devo usar?", answer: "Use um vídeo de 15–30 segundos com o corpo inteiro visível, uma pessoa, boa iluminação e câmera estável. São aceitos 5–45 segundos." }, { question: "Os vídeos são salvos?", answer: "A ElevareFit não salva seu vídeo nem os quadros. Eles são enviados diretamente ao armazenamento privado temporário da StageLab e excluídos pelo processo de limpeza." }, { question: "É uma nota oficial?", answer: "Não. A nota de poses da StageLab é informativa e não prevê colocação ou resultado de competição." }] },
    complete_stage_analysis: { eyebrow: "Análise completa de palco da StageLab", title: "Avalie seu físico e suas poses em conjunto.", body: "Receba a Análise de Físico existente e a Análise de Poses da StageLab com uma compra e dois relatórios separados.", features: ["Visão do físico e condicionamento", "Avaliação de poses por categoria", "Resultados separados sem nota combinada artificial"], checkoutTitle: "Receba sua análise completa", checkoutBody: "Escolha sua categoria e contexto, depois conclua um único pagamento seguro. Fotos e vídeo são enviados após o pagamento.", faq: [{ question: "O que está incluído?", answer: "Uma análise de físico com fotos padronizadas e uma análise de poses com um vídeo curto." }, { question: "Serei cobrado duas vezes?", answer: "Não. É uma única compra de $1.49 USD que inclui os dois componentes." }, { question: "E se uma análise falhar?", answer: "O componente concluído é preservado e você pode tentar novamente o componente elegível sem pagar outra vez." }] },
  },
  checkout: { ...en.checkout, details: "Sua análise", securePayment: "Pagamento seguro", completePurchase: "Concluir compra", oneTime: "Pagamento único", division: "Categoria de competição", selectDivision: "Selecione uma categoria", preparing: "Você está se preparando para competir?", yes: "Sim", snapshotOnly: "Não, avaliar meu físico atual", weeksOut: "Semanas até a competição", context: "Contexto opcional", optional: "Opcional", contextPlaceholder: "Informações úteis sobre sua preparação ou apresentação", age: "Confirmo que tenho pelo menos 18 anos.", ai: "Concordo com o processamento por IA para esta análise única e revisei a Política de Privacidade.", purchase: "Receber minha análise", loading: "Preparando pagamento seguro...", back: "Voltar aos detalhes", termsBefore: "Ao comprar, você concorda com os", terms: "Termos de Serviço", validation: "Preencha os campos obrigatórios para continuar.", cancelled: "O pagamento não foi concluído. Você pode tentar novamente.", unavailable: "O pagamento seguro está temporariamente indisponível.", failed: "Não foi possível preparar o pagamento. Tente novamente." },
  result: { ...en.result, opening: "Abrindo sua análise", confirming: "Confirmando sua compra com segurança.", unavailable: "Esta análise não está disponível neste navegador.", back: "Voltar à análise", paymentConfirmed: "Pagamento confirmado", uploadTitle: "Adicione seu vídeo de poses", uploadBody: "Seu vídeo e os quadros vão diretamente para o armazenamento privado temporário da StageLab. A ElevareFit não recebe nem salva a mídia.", recordingTitle: "Para uma avaliação mais clara", recordingItems: ["Grave 15–30 segundos; são aceitos 5–45", "Mantenha o corpo inteiro visível e apenas uma pessoa", "Use boa iluminação e câmera estável", "MP4, MOV, M4V, WebM e 3GPP são aceitos"], videoLabel: "Vídeo de poses", videoHelp: "Máximo de 180 MiB. Vídeo horizontal ou vertical é aceito.", chooseVideo: "Escolher vídeo", replaceVideo: "Substituir vídeo", selected: "Selecionado", consent: "Concordo com o processamento transitório por IA deste vídeo e dos quadros para esta análise.", privacyTitle: "Sua mídia não é salva pela ElevareFit", privacyBody: "O vídeo e os quadros são usados apenas nesta análise, enviados diretamente ao armazenamento privado temporário da StageLab e removidos pelo processo de limpeza.", analyze: "Analisar minhas poses", preparingFrames: "Preparando quadros privados...", uploading: "Enviando com segurança para a StageLab...", analyzing: "A StageLab está analisando suas poses...", keepOpen: "Mantenha esta página aberta até a conclusão.", retry: "Tentar novamente sem pagar", attempts: "Tentativas usadas", processingTitle: "Suas poses estão sendo analisadas", processingBody: "A StageLab está concluindo o relatório estruturado. Esta página será atualizada automaticamente.", expiredTitle: "Este link de análise expirou", expiredBody: "Por privacidade, o acesso pelo navegador fica disponível por 72 horas.", reportTitle: "Análise de poses da StageLab", poweredBy: "Desenvolvido pela StageLab", score: "Nota de poses da StageLab", notScored: "Sem nota", quality: "Qualidade da análise", usability: "Utilidade do vídeo", biggestOpportunity: "Maior oportunidade", strengths: "Pontos fortes gerais", corrections: "Correções prioritárias", visibleEvidence: "Evidência visível", tryThis: "Tente isto", detectedPoses: "Poses detectadas", strongestAspect: "Ponto mais forte", biggestIssue: "Principal problema", coachingCue: "Orientação técnica", components: "Notas por componente", transitions: "Observações de transições", consistency: "Observações de consistência", nextFocus: "Próximo foco", limitations: "Limitações importantes", completeTitle: "Análise completa de palco", physiqueComponent: "Físico e condicionamento", posingComponent: "Poses e apresentação", componentPending: "Pronto para envio", componentComplete: "Concluído", ctaTitle: { posing_analysis: "Continue melhorando suas poses com a StageLab.", complete_stage_analysis: "Acompanhe seu físico, poses e preparação com a StageLab." }, ctaBody: { posing_analysis: "Use a StageLab para registrar check-ins e aprimorar a apresentação do seu físico.", complete_stage_analysis: "Reúna check-ins, condicionamento, poses e decisões de preparação em um só fluxo." }, learnMore: "Conhecer a StageLab", error: "Não foi possível concluir a análise de poses.", paymentValid: "Seu pagamento continua válido. Tentar novamente não causará nova cobrança." },
};

es.result.recordVideo = "Grabar video";
es.result.uploadVideo = "Subir video existente";
es.result.resume = "Reanudar análisis";
es.result.resumeBody = "Tu carga segura está preparada. Reanuda el mismo análisis sin volver a subir el video ni pagar otra vez.";
es.result.topPriorities = "Prioridades principales para el escenario";
es.result.separateScores = "El físico y las poses se mantienen como evaluaciones separadas. StageLab no calcula una puntuación combinada artificial.";

pt.result.recordVideo = "Gravar vídeo";
pt.result.uploadVideo = "Enviar vídeo existente";
pt.result.resume = "Retomar análise";
pt.result.resumeBody = "Seu envio seguro está preparado. Retome a mesma análise sem enviar o vídeo novamente ou pagar outra vez.";
pt.result.topPriorities = "Principais prioridades para o palco";
pt.result.separateScores = "O físico e as poses permanecem como avaliações separadas. A StageLab não calcula uma nota combinada artificial.";

const dictionaries: Record<Locale, StageAnalysisMessages> = { en, "es-419": es, "pt-BR": pt };

export function getStageAnalysisMessages(locale: Locale) {
  return dictionaries[locale] ?? en;
}
