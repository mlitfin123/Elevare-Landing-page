import {
  DEFAULT_SUPPORT_EMAIL,
  formatProfessionalApprovalSender,
  normalizeApprovalEmailLocale,
  type ApprovalEmailLocale,
} from "../professional-approval-email/email.ts";

export const PROFESSIONAL_INQUIRY_EVENT = "new_consultation_request";
export const DEFAULT_INQUIRY_SENDER = formatProfessionalApprovalSender(null);

type InquiryEmailInput = {
  firstName?: string | null;
  locale?: string | null;
  supportEmail?: string;
};

export type ProfessionalInquiryEmail = {
  subject: string;
  previewText: string;
  html: string;
  text: string;
  dashboardUrl: string;
};

export function professionalInquiryEventKey(inquiryId: string) {
  return `${PROFESSIONAL_INQUIRY_EVENT}:${inquiryId}`;
}

export function getProfessionalRequestsUrl(locale: ApprovalEmailLocale) {
  if (locale === "es-419") return "https://www.elevarefit.com/es/account/client-requests/";
  if (locale === "pt-BR") return "https://www.elevarefit.com/pt-br/account/client-requests/";
  return "https://www.elevarefit.com/account/client-requests/";
}

export function buildProfessionalInquiryEmail({
  firstName,
  locale: requestedLocale,
  supportEmail = DEFAULT_SUPPORT_EMAIL,
}: InquiryEmailInput = {}): ProfessionalInquiryEmail {
  const locale = normalizeApprovalEmailLocale(requestedLocale);
  const copy = inquiryEmailCopy(locale);
  const dashboardUrl = getProfessionalRequestsUrl(locale);
  const safeName = normalizeFirstName(firstName);
  const greeting = safeName ? copy.namedGreeting(escapeHtml(safeName)) : copy.greeting;
  const textGreeting = safeName ? copy.namedGreeting(safeName) : copy.greeting;
  const safeSupportEmail = escapeHtml(supportEmail);

  return {
    subject: copy.subject,
    previewText: copy.previewText,
    dashboardUrl,
    html: `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;background:#080d13;color:#eaf2f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.previewText}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080d13;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#111a23;border:1px solid #263746;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:24px 32px;border-bottom:1px solid #263746;color:#18d8c2;font-size:18px;font-weight:700;letter-spacing:2px;">ELEVARE</td></tr>
          <tr><td style="padding:32px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">${greeting}</p>
            <h1 style="margin:0 0 18px;color:#ffffff;font-size:28px;line-height:1.2;">${copy.heading}</h1>
            <p style="margin:0 0 18px;color:#bdc9d2;font-size:16px;line-height:1.65;">${copy.message}</p>
            <p style="margin:0 0 18px;color:#bdc9d2;font-size:16px;line-height:1.65;">${copy.guidance}</p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0;">
              <tr><td style="border-radius:8px;background:#18d8c2;"><a href="${dashboardUrl}" style="display:inline-block;padding:14px 22px;color:#07110f;text-decoration:none;font-size:15px;font-weight:700;">${copy.cta}</a></td></tr>
            </table>
            <p style="margin:0;color:#93a4b1;font-size:14px;line-height:1.6;">${copy.help} <a href="mailto:${safeSupportEmail}" style="color:#18d8c2;">${safeSupportEmail}</a>.</p>
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #263746;color:#748692;font-size:12px;line-height:1.6;">${copy.footer}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
    text: `${textGreeting}\n\n${copy.heading}\n\n${copy.message}\n\n${copy.guidance}\n\n${copy.cta}: ${dashboardUrl}\n\n${copy.help} ${supportEmail}.\n\n${copy.footer}`,
  };
}

function inquiryEmailCopy(locale: ApprovalEmailLocale) {
  if (locale === "es-419") return {
    subject: "Tienes una nueva solicitud de consulta en Elevare",
    previewText: "Revisa una nueva solicitud de consulta en tu cuenta profesional de Elevare.",
    greeting: "Hola,",
    namedGreeting: (name: string) => `Hola ${name},`,
    heading: "Recibiste una nueva solicitud de consulta.",
    message: "Una persona encontró tu perfil profesional y envió una solicitud para saber si tus servicios se ajustan a lo que necesita.",
    guidance: "Inicia sesión en Elevare para revisar la información que decidió compartir y responder con el siguiente paso adecuado.",
    cta: "Revisar solicitud",
    help: "¿Necesitas ayuda? Responde a este correo o escribe a",
    footer: "Este correo de servicio se envió porque tu perfil profesional de Elevare recibió una solicitud de consulta.",
  };
  if (locale === "pt-BR") return {
    subject: "Você recebeu uma nova solicitação de consulta na Elevare",
    previewText: "Confira uma nova solicitação de consulta na sua conta profissional da Elevare.",
    greeting: "Olá,",
    namedGreeting: (name: string) => `Olá ${name},`,
    heading: "Você recebeu uma nova solicitação de consulta.",
    message: "Uma pessoa encontrou seu perfil profissional e enviou uma solicitação para saber se seus serviços atendem ao que ela procura.",
    guidance: "Entre na Elevare para analisar as informações que ela decidiu compartilhar e responder com o próximo passo adequado.",
    cta: "Analisar solicitação",
    help: "Precisa de ajuda? Responda a este e-mail ou entre em contato com",
    footer: "Este e-mail de serviço foi enviado porque seu perfil profissional da Elevare recebeu uma solicitação de consulta.",
  };
  return {
    subject: "You have a new consultation request on Elevare",
    previewText: "Review a new consultation request in your Elevare professional account.",
    greeting: "Hello,",
    namedGreeting: (name: string) => `Hi ${name},`,
    heading: "You received a new consultation request.",
    message: "Someone found your professional profile and sent a request to learn whether your services fit what they need.",
    guidance: "Sign in to Elevare to review the information they chose to share and respond with the appropriate next step.",
    cta: "Review request",
    help: "Need help? Reply to this email or contact",
    footer: "This service email was sent because your Elevare professional profile received a consultation request.",
  };
}

function normalizeFirstName(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized ? normalized.slice(0, 80) : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
