export const PROFESSIONAL_APPROVAL_EVENT = "professional_approved";
export const PROFESSIONAL_APPROVAL_SUBJECT = "You’re approved — welcome to Elevare";
export const PROFESSIONAL_APPROVAL_FROM_NAME = "Elevare Professionals";
export const PROFESSIONAL_PROFILE_URL = "https://www.elevarefit.com/account/professional-profile/";
export const DEFAULT_SUPPORT_EMAIL = "mlitfin@elevarefit.org";
export const DEFAULT_TRANSACTIONAL_SENDER = "Elevare Professionals <noreply@elevarefit.org>";
export type ApprovalEmailLocale = "en" | "es-419" | "pt-BR";

export const PROFESSIONAL_APPROVAL_TEMPLATE_IDS: Record<ApprovalEmailLocale, string> = {
  en: "2b5f2a1c-ed8d-4e95-bcc3-0e430848760d",
  "es-419": "bdaada5c-0583-4cbd-9ecb-77d0fdb815a6",
  "pt-BR": "d5165eb9-3537-40b6-9ecc-8e75d970c455",
};

type ApprovalState = {
  verificationStatus: string | null | undefined;
  profileLive: boolean | null | undefined;
};

export type ApprovalEmailInput = {
  firstName?: string | null;
  profileUrl?: string;
  supportEmail?: string;
  locale?: string | null;
};

export type ApprovalEmail = {
  subject: string;
  previewText: string;
  html: string;
  text: string;
};

export type ApprovalEmailLocaleSources = {
  preferredLocale?: string | null;
  professionalSignupLocale?: string | null;
  signupLocale?: string | null;
  browserLocaleAtSignup?: string | null;
};

export type ApprovalEmailEventState = {
  status: "pending" | "processing" | "sent" | "failed";
  sentAt?: string | null;
  attemptCount: number;
  maxAttempts: number;
  lockedUntil?: string | null;
};

export function isApprovedState(state: ApprovalState) {
  return state.verificationStatus?.trim().toLowerCase() === "verified" && state.profileLive === true;
}

export function isNewApprovalTransition(previous: ApprovalState, next: ApprovalState) {
  return !isApprovedState(previous) && isApprovedState(next);
}

export function professionalApprovalEventKey(professionalId: string) {
  return `${PROFESSIONAL_APPROVAL_EVENT}:${professionalId}`;
}

export function canClaimApprovalEmail(
  event: ApprovalEmailEventState,
  options: { allowFailedRetry: boolean; now?: Date } = { allowFailedRetry: false },
) {
  if (event.sentAt || event.status === "sent" || event.attemptCount >= event.maxAttempts) return false;
  if (event.status === "failed" && !options.allowFailedRetry) return false;

  if (event.status === "processing" && event.lockedUntil) {
    const now = options.now ?? new Date();
    if (new Date(event.lockedUntil).getTime() > now.getTime()) return false;
  }

  return true;
}

export function jwtRole(authorization: string | null) {
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return null;

  const parts = match[1].split(".");
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function isServiceRoleRequest(authorization: string | null) {
  return jwtRole(authorization) === "service_role";
}

export function buildProfessionalApprovalEmail({
  firstName,
  profileUrl,
  supportEmail = DEFAULT_SUPPORT_EMAIL,
  locale: requestedLocale,
}: ApprovalEmailInput = {}): ApprovalEmail {
  const locale = normalizeApprovalEmailLocale(requestedLocale);
  const resolvedProfileUrl = profileUrl ?? getProfessionalProfileUrl(locale);
  const copy = approvalEmailCopy(locale);
  const safeName = normalizeFirstName(firstName);
  const safeProfileUrl = escapeHtml(resolvedProfileUrl);
  const safeSupportEmail = escapeHtml(supportEmail);
  const greeting = safeName ? copy.namedGreeting(escapeHtml(safeName)) : copy.greeting;
  const textGreeting = safeName ? copy.namedGreeting(safeName) : copy.greeting;

  return {
    subject: copy.subject,
    previewText: copy.previewText,
    html: `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;background:#080d13;color:#eaf2f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.previewText}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080d13;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#111a23;border:1px solid #263746;border-radius:16px;overflow:hidden;">
          <tr><td role="img" aria-label="${copy.brandAlt}" style="padding:24px 32px;border-bottom:1px solid #263746;color:#18d8c2;font-size:18px;font-weight:700;letter-spacing:2px;">ELEVARE</td></tr>
          <tr><td style="padding:32px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">${greeting}</p>
            <h1 style="margin:0 0 18px;color:#ffffff;font-size:28px;line-height:1.2;">${copy.heading}</h1>
            <p style="margin:0 0 18px;color:#bdc9d2;font-size:16px;line-height:1.65;">${copy.approvalMessage}</p>
            <p style="margin:0 0 18px;color:#bdc9d2;font-size:16px;line-height:1.65;">${copy.completionGuidance}</p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0;">
              <tr><td style="border-radius:8px;background:#18d8c2;"><a href="${safeProfileUrl}" style="display:inline-block;padding:14px 22px;color:#07110f;text-decoration:none;font-size:15px;font-weight:700;">${copy.cta}</a></td></tr>
            </table>
            <p style="margin:0;color:#93a4b1;font-size:14px;line-height:1.6;">${copy.help} <a href="mailto:${safeSupportEmail}" style="color:#18d8c2;">${safeSupportEmail}</a>.</p>
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #263746;color:#748692;font-size:12px;line-height:1.6;">${copy.footer}<br><a href="https://www.elevarefit.com/privacy-policy/" style="color:#93a4b1;">${copy.privacy}</a> &nbsp;|&nbsp; <a href="https://www.elevarefit.com/terms-of-service/" style="color:#93a4b1;">${copy.terms}</a></td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
    text: `${textGreeting}

${copy.heading}

${copy.approvalMessage}

${copy.completionGuidance}

${copy.cta}: ${resolvedProfileUrl}

${copy.help} ${supportEmail}.

${copy.footer}
${copy.privacy}: https://www.elevarefit.com/privacy-policy/
${copy.terms}: https://www.elevarefit.com/terms-of-service/`,
  };
}

export function normalizeApprovalEmailLocale(value: string | null | undefined): ApprovalEmailLocale {
  return normalizeSupportedApprovalEmailLocale(value) ?? "en";
}

export function resolveProfessionalApprovalEmailLocale({
  preferredLocale,
  professionalSignupLocale,
  signupLocale,
  browserLocaleAtSignup,
}: ApprovalEmailLocaleSources): ApprovalEmailLocale {
  const candidates = [preferredLocale, professionalSignupLocale, signupLocale, browserLocaleAtSignup];
  for (const candidate of candidates) {
    const normalized = normalizeSupportedApprovalEmailLocale(candidate);
    if (normalized) return normalized;
  }
  return "en";
}

export function formatProfessionalApprovalSender(configuredSender: string | null | undefined) {
  const configured = configuredSender?.trim() || DEFAULT_TRANSACTIONAL_SENDER;
  const bracketedAddress = configured.match(/<([^<>]+)>/)?.[1]?.trim();
  const address = bracketedAddress || configured;
  const safeAddress = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
    ? address
    : "noreply@elevarefit.org";
  return `${PROFESSIONAL_APPROVAL_FROM_NAME} <${safeAddress}>`;
}

export function getProfessionalProfileUrl(locale: ApprovalEmailLocale) {
  if (locale === "es-419") return "https://www.elevarefit.com/es/account/professional-profile/";
  if (locale === "pt-BR") return "https://www.elevarefit.com/pt-br/account/professional-profile/";
  return PROFESSIONAL_PROFILE_URL;
}

export function getProfessionalApprovalTemplateId(locale: string | null | undefined) {
  return PROFESSIONAL_APPROVAL_TEMPLATE_IDS[normalizeApprovalEmailLocale(locale)];
}

function approvalEmailCopy(locale: ApprovalEmailLocale) {
  if (locale === "es-419") return {
    subject: "Tu perfil fue aprobado — te damos la bienvenida a Elevare",
    previewText: "Tu perfil profesional fue aprobado y ya puede aparecer en las búsquedas de Elevare.",
    brandAlt: "Elevare Profesionales",
    greeting: "Hola,",
    namedGreeting: (name: string) => `Hola ${name},`,
    heading: "Te damos la bienvenida a Elevare.",
    approvalMessage: "Tu perfil profesional fue aprobado y ya puede aparecer en las búsquedas de Elevare.",
    completionGuidance: "Inicia sesión para confirmar que tus datos públicos, servicios y disponibilidad estén completos y actualizados.",
    cta: "Revisar mi perfil profesional",
    help: "¿Necesitas ayuda? Responde a este correo o escribe a",
    footer: "Recibiste este correo de servicio porque enviaste un perfil profesional para revisión en Elevare.",
    privacy: "Política de privacidad",
    terms: "Términos de servicio",
  };

  if (locale === "pt-BR") return {
    subject: "Você foi aprovado — boas-vindas à Elevare",
    previewText: "Seu perfil profissional foi aprovado e já pode aparecer nas buscas da Elevare.",
    brandAlt: "Elevare Profissionais",
    greeting: "Olá,",
    namedGreeting: (name: string) => `Olá ${name},`,
    heading: "Boas-vindas à Elevare.",
    approvalMessage: "Seu perfil profissional foi aprovado e já pode aparecer nas buscas da Elevare.",
    completionGuidance: "Entre na sua conta para confirmar se seus dados públicos, serviços e disponibilidade estão completos e atualizados.",
    cta: "Revisar meu perfil profissional",
    help: "Precisa de ajuda? Responda a este e-mail ou entre em contato com",
    footer: "Este e-mail de serviço foi enviado porque você enviou um perfil profissional para análise na Elevare.",
    privacy: "Política de privacidade",
    terms: "Termos de serviço",
  };

  return {
    subject: PROFESSIONAL_APPROVAL_SUBJECT,
    previewText: "Your professional profile is approved and can now appear in Elevare search.",
    brandAlt: "Elevare Professionals",
    greeting: "Hello,",
    namedGreeting: (name: string) => `Hi ${name},`,
    heading: "Welcome to Elevare.",
    approvalMessage: "Your professional profile is approved and can now appear in Elevare search.",
    completionGuidance: "Sign in to confirm that your public details, services, and availability are complete and current.",
    cta: "Review my professional profile",
    help: "Need help? Reply to this email or contact",
    footer: "This service email was sent because you submitted a professional profile for Elevare review.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  };
}

const LATIN_AMERICAN_SPANISH_REGIONS = new Set([
  "419", "AR", "BO", "BR", "BZ", "CL", "CO", "CR", "CU", "DO", "EC", "GT", "HN", "MX",
  "NI", "PA", "PE", "PR", "PY", "SV", "US", "UY", "VE",
]);

function normalizeSupportedApprovalEmailLocale(value: string | null | undefined): ApprovalEmailLocale | null {
  const normalized = value?.trim().replaceAll("_", "-");
  if (!normalized) return null;

  const [language = "", region = ""] = normalized.split("-");
  const normalizedLanguage = language.toLowerCase();
  const normalizedRegion = region.toUpperCase();

  if (normalizedLanguage === "en") return "en";
  if (
    normalizedLanguage === "es"
    && (!normalizedRegion || LATIN_AMERICAN_SPANISH_REGIONS.has(normalizedRegion))
  ) return "es-419";
  if (normalizedLanguage === "pt" && normalizedRegion === "BR") return "pt-BR";
  return null;
}

export function safeDeliveryError(status?: number) {
  return {
    code: status ? `resend_http_${status}` : "resend_unavailable",
    message: status
      ? `Resend request failed with status ${status}.`
      : "Transactional email delivery failed.",
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
