import type { Locale } from "./i18n/config.ts";
import { localizeProfessionalPath } from "./i18n/marketplace-content.ts";

export type ProfessionalTrustNoticeEvent =
  | "credential_submission_received"
  | "credential_more_information_requested"
  | "credential_verified"
  | "credential_not_verified"
  | "credential_nearing_expiration"
  | "credential_expired"
  | "insurance_nearing_expiration"
  | "background_check_action_required"
  | "profile_temporarily_restricted"
  | "report_receipt_confirmation";

export type ProfessionalTrustNotice = {
  locale: Locale;
  subject: string;
  previewText: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
  footer: string;
};

type NoticeCopy = Omit<ProfessionalTrustNotice, "locale" | "ctaPath" | "footer">;

const EN_COPY: Record<ProfessionalTrustNoticeEvent, NoticeCopy> = {
  credential_submission_received: {
    subject: "We received your credential submission",
    previewText: "Your credential is queued for review.",
    heading: "Credential submitted",
    body: "We received your credential information. It will remain a claimed credential unless an authorized Elevare reviewer verifies that specific record.",
    ctaLabel: "View trust status",
  },
  credential_more_information_requested: {
    subject: "More information is needed for your credential",
    previewText: "Review the feedback in your Elevare account.",
    heading: "Credential update needed",
    body: "An Elevare reviewer needs additional information before this credential review can continue. Sign in to review the public-safe feedback.",
    ctaLabel: "Review credential",
  },
  credential_verified: {
    subject: "Your credential was verified",
    previewText: "A specific credential on your profile passed review.",
    heading: "Credential verified",
    body: "An authorized Elevare reviewer verified the specific credential shown in your account. Other credentials and trust checks remain separate.",
    ctaLabel: "View trust status",
  },
  credential_not_verified: {
    subject: "Your credential review is complete",
    previewText: "Review the status in your Elevare account.",
    heading: "Credential not verified",
    body: "Elevare could not verify this credential from the information available. Sign in to review any public-safe feedback and your next options.",
    ctaLabel: "Review credential",
  },
  credential_nearing_expiration: {
    subject: "A credential is nearing expiration",
    previewText: "Review the expiration details in your account.",
    heading: "Credential expiration reminder",
    body: "A verified credential is approaching its recorded expiration date. Submit current evidence for a new review before it expires.",
    ctaLabel: "Review credential",
  },
  credential_expired: {
    subject: "A credential has expired",
    previewText: "The credential is no longer displayed as currently verified.",
    heading: "Credential expired",
    body: "A credential reached its recorded expiration date and is no longer displayed as currently verified. Submit current evidence for review if it has been renewed.",
    ctaLabel: "Review credential",
  },
  insurance_nearing_expiration: {
    subject: "Your insurance evidence is nearing expiration",
    previewText: "Submit current evidence before the recorded date.",
    heading: "Insurance expiration reminder",
    body: "Your confirmed insurance evidence is approaching its recorded expiration date. Submit current evidence for a new review to maintain the public confirmation.",
    ctaLabel: "Review insurance status",
  },
  background_check_action_required: {
    subject: "Action is needed for your background check",
    previewText: "Review the next step in your Elevare account.",
    heading: "Background check action needed",
    body: "A background screening workflow requires your attention. Sign in for the next step. This message does not include report details.",
    ctaLabel: "Review trust status",
  },
  profile_temporarily_restricted: {
    subject: "Your Elevare profile is temporarily restricted",
    previewText: "Review your current profile status.",
    heading: "Profile temporarily restricted",
    body: "Your profile is not currently available in public marketplace discovery. Sign in to review the status and any professional-visible guidance.",
    ctaLabel: "Review profile status",
  },
  report_receipt_confirmation: {
    subject: "Elevare received your report",
    previewText: "Your marketplace concern was submitted for review.",
    heading: "Report received",
    body: "We received your marketplace report. Elevare will review it under the safety process. This confirmation does not promise a particular outcome or response time.",
    ctaLabel: "Review Trust and Safety",
  },
};

const ES_COPY: Record<ProfessionalTrustNoticeEvent, NoticeCopy> = {
  credential_submission_received: { subject: "Recibimos tu credencial", previewText: "Tu credencial está en espera de revisión.", heading: "Credencial enviada", body: "Recibimos la información de tu credencial. Seguirá mostrándose como declarada hasta que un revisor autorizado de Elevare verifique ese registro específico.", ctaLabel: "Ver estado de confianza" },
  credential_more_information_requested: { subject: "Necesitamos más información sobre tu credencial", previewText: "Revisa los comentarios en tu cuenta de Elevare.", heading: "Debes actualizar la credencial", body: "Un revisor de Elevare necesita información adicional para continuar. Inicia sesión para consultar los comentarios que pueden mostrarse al profesional.", ctaLabel: "Revisar credencial" },
  credential_verified: { subject: "Tu credencial fue verificada", previewText: "Una credencial específica de tu perfil pasó la revisión.", heading: "Credencial verificada", body: "Un revisor autorizado de Elevare verificó la credencial específica que aparece en tu cuenta. Las demás credenciales y revisiones de confianza son independientes.", ctaLabel: "Ver estado de confianza" },
  credential_not_verified: { subject: "La revisión de tu credencial terminó", previewText: "Consulta el estado en tu cuenta de Elevare.", heading: "Credencial no verificada", body: "Elevare no pudo verificar esta credencial con la información disponible. Inicia sesión para consultar comentarios y próximos pasos.", ctaLabel: "Revisar credencial" },
  credential_nearing_expiration: { subject: "Una credencial está por vencer", previewText: "Consulta la fecha de vencimiento en tu cuenta.", heading: "Recordatorio de vencimiento", body: "Una credencial verificada se acerca a su fecha de vencimiento registrada. Envía evidencia vigente para una nueva revisión antes de esa fecha.", ctaLabel: "Revisar credencial" },
  credential_expired: { subject: "Una credencial venció", previewText: "Ya no se muestra como verificada y vigente.", heading: "Credencial vencida", body: "Una credencial alcanzó su fecha de vencimiento registrada y ya no se muestra como verificada y vigente. Si fue renovada, envía evidencia actual para revisión.", ctaLabel: "Revisar credencial" },
  insurance_nearing_expiration: { subject: "Tu evidencia de seguro está por vencer", previewText: "Envía evidencia vigente antes de la fecha registrada.", heading: "Recordatorio de vencimiento del seguro", body: "La evidencia de seguro confirmada se acerca a su fecha de vencimiento registrada. Envía evidencia vigente para una nueva revisión.", ctaLabel: "Revisar estado del seguro" },
  background_check_action_required: { subject: "Debes completar una acción de antecedentes", previewText: "Consulta el siguiente paso en tu cuenta de Elevare.", heading: "Acción requerida", body: "Un proceso de verificación de antecedentes requiere tu atención. Inicia sesión para ver el siguiente paso. Este mensaje no incluye detalles del informe.", ctaLabel: "Revisar estado de confianza" },
  profile_temporarily_restricted: { subject: "Tu perfil de Elevare está restringido temporalmente", previewText: "Consulta el estado actual de tu perfil.", heading: "Perfil restringido temporalmente", body: "Tu perfil no está disponible actualmente en la búsqueda pública. Inicia sesión para consultar el estado y las indicaciones visibles para profesionales.", ctaLabel: "Revisar estado del perfil" },
  report_receipt_confirmation: { subject: "Elevare recibió tu reporte", previewText: "Tu inquietud fue enviada para revisión.", heading: "Reporte recibido", body: "Recibimos tu reporte sobre el marketplace. Elevare lo revisará mediante el proceso de seguridad. Esta confirmación no promete un resultado ni un plazo de respuesta específicos.", ctaLabel: "Revisar Confianza y seguridad" },
};

const PT_COPY: Record<ProfessionalTrustNoticeEvent, NoticeCopy> = {
  credential_submission_received: { subject: "Recebemos sua credencial", previewText: "Sua credencial está aguardando análise.", heading: "Credencial enviada", body: "Recebemos as informações da sua credencial. Ela continuará aparecendo como declarada até que um revisor autorizado da Elevare verifique esse registro específico.", ctaLabel: "Ver status de confiança" },
  credential_more_information_requested: { subject: "Precisamos de mais informações sobre sua credencial", previewText: "Consulte o retorno na sua conta Elevare.", heading: "Atualização da credencial necessária", body: "Um revisor da Elevare precisa de informações adicionais para continuar. Entre na conta para consultar o retorno que pode ser exibido ao profissional.", ctaLabel: "Revisar credencial" },
  credential_verified: { subject: "Sua credencial foi verificada", previewText: "Uma credencial específica do seu perfil passou pela análise.", heading: "Credencial verificada", body: "Um revisor autorizado da Elevare verificou a credencial específica exibida na sua conta. As demais credenciais e verificações de confiança continuam separadas.", ctaLabel: "Ver status de confiança" },
  credential_not_verified: { subject: "A análise da sua credencial foi concluída", previewText: "Consulte o status na sua conta Elevare.", heading: "Credencial não verificada", body: "A Elevare não conseguiu verificar esta credencial com as informações disponíveis. Entre na conta para consultar o retorno e os próximos passos.", ctaLabel: "Revisar credencial" },
  credential_nearing_expiration: { subject: "Uma credencial está perto do vencimento", previewText: "Consulte os dados de vencimento na sua conta.", heading: "Lembrete de vencimento", body: "Uma credencial verificada está se aproximando da data de vencimento registrada. Envie evidências atuais para uma nova análise antes do vencimento.", ctaLabel: "Revisar credencial" },
  credential_expired: { subject: "Uma credencial venceu", previewText: "Ela não aparece mais como verificada e vigente.", heading: "Credencial vencida", body: "Uma credencial atingiu a data de vencimento registrada e não aparece mais como verificada e vigente. Se ela foi renovada, envie evidências atuais para análise.", ctaLabel: "Revisar credencial" },
  insurance_nearing_expiration: { subject: "Sua evidência de seguro está perto do vencimento", previewText: "Envie evidências atuais antes da data registrada.", heading: "Lembrete de vencimento do seguro", body: "A evidência de seguro confirmada está se aproximando da data de vencimento registrada. Envie evidências atuais para uma nova análise.", ctaLabel: "Revisar status do seguro" },
  background_check_action_required: { subject: "Uma ação é necessária para a verificação de antecedentes", previewText: "Consulte a próxima etapa na sua conta Elevare.", heading: "Ação necessária", body: "Um fluxo de verificação de antecedentes requer sua atenção. Entre na conta para ver a próxima etapa. Esta mensagem não inclui detalhes do relatório.", ctaLabel: "Revisar status de confiança" },
  profile_temporarily_restricted: { subject: "Seu perfil Elevare está temporariamente restrito", previewText: "Consulte o status atual do seu perfil.", heading: "Perfil temporariamente restrito", body: "Seu perfil não está disponível atualmente na busca pública do marketplace. Entre na conta para consultar o status e as orientações visíveis ao profissional.", ctaLabel: "Revisar status do perfil" },
  report_receipt_confirmation: { subject: "A Elevare recebeu seu relato", previewText: "Sua preocupação foi enviada para análise.", heading: "Relato recebido", body: "Recebemos seu relato sobre o marketplace. A Elevare fará a análise pelo processo de segurança. Esta confirmação não promete resultado nem prazo de resposta específicos.", ctaLabel: "Consultar Confiança e segurança" },
};

const FOOTERS: Record<Locale, string> = {
  en: "This is a transactional trust and safety notice from Elevare Professionals. Do not send sensitive documents by email.",
  "es-419": "Este es un aviso transaccional de Confianza y seguridad de Elevare Professionals. No envíes documentos sensibles por correo electrónico.",
  "pt-BR": "Este é um aviso transacional de Confiança e segurança da Elevare Professionals. Não envie documentos sensíveis por e-mail.",
};

export function normalizeTrustNoticeLocale(locale: string | null | undefined): Locale {
  if (locale === "pt-BR") return "pt-BR";
  if (locale === "es-419" || locale?.toLowerCase().startsWith("es-")) return "es-419";
  return "en";
}

export function buildProfessionalTrustNotice(
  event: ProfessionalTrustNoticeEvent,
  requestedLocale: string | null | undefined,
): ProfessionalTrustNotice {
  const locale = normalizeTrustNoticeLocale(requestedLocale);
  const copy = locale === "es-419" ? ES_COPY[event] : locale === "pt-BR" ? PT_COPY[event] : EN_COPY[event];
  const destination = event === "report_receipt_confirmation" ? "/trust-safety/" : "/account/professional-profile/";

  return {
    ...copy,
    locale,
    ctaPath: localizeProfessionalPath(destination, locale),
    footer: FOOTERS[locale],
  };
}
