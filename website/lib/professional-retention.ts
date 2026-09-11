import type { Locale } from "./i18n/config.ts";

export const PROFESSIONAL_RESPONSE_LOOKBACK_DAYS = 90;
export const PROFESSIONAL_RESPONSE_MINIMUM_SAMPLE = 3;
export const PROFESSIONAL_PROFILE_FRESHNESS_DAYS = 90;

export type ProfessionalInquiryStatus =
  | "new"
  | "viewed"
  | "accepted"
  | "declined"
  | "contacted"
  | "closed";

export type ProfessionalInquiryAction = "open" | "accept" | "decline" | "mark_contacted" | "close";

export type ResponseMetricInquiry = {
  createdAt: string | Date;
  firstRespondedAt: string | Date | null;
};

export type MonthlyProfessionalSummaryInput = {
  views: number;
  currentSaves: number;
  consultationRequests: number;
  responseRatePercent: number | null;
  profileCompletenessPercent: number;
};

const INQUIRY_ACTIONS: Record<ProfessionalInquiryStatus, readonly ProfessionalInquiryAction[]> = {
  new: ["open", "accept", "decline"],
  viewed: ["accept", "decline"],
  accepted: ["mark_contacted", "close"],
  declined: [],
  contacted: ["close"],
  closed: [],
};

export function getProfessionalInquiryActions(status: ProfessionalInquiryStatus) {
  return INQUIRY_ACTIONS[status];
}

export function getProfessionalInquiryStatusAfterAction(
  status: ProfessionalInquiryStatus,
  action: ProfessionalInquiryAction,
): ProfessionalInquiryStatus | null {
  if (!INQUIRY_ACTIONS[status].includes(action)) return null;
  if (action === "open") return "viewed";
  if (action === "accept") return "accepted";
  if (action === "decline") return "declined";
  if (action === "mark_contacted") return "contacted";
  return "closed";
}

export function calculateProfessionalResponseMetrics(
  inquiries: readonly ResponseMetricInquiry[],
  now = new Date(),
  lookbackDays = PROFESSIONAL_RESPONSE_LOOKBACK_DAYS,
  minimumSample = PROFESSIONAL_RESPONSE_MINIMUM_SAMPLE,
) {
  const periodStart = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;
  const qualifying = inquiries.filter((inquiry) => new Date(inquiry.createdAt).getTime() >= periodStart);
  const responseMinutes = qualifying
    .filter((inquiry) => inquiry.firstRespondedAt)
    .map((inquiry) => Math.max(0, (new Date(inquiry.firstRespondedAt!).getTime() - new Date(inquiry.createdAt).getTime()) / 60_000))
    .sort((left, right) => left - right);
  const sampleSize = qualifying.length;
  const hasEnoughHistory = sampleSize >= minimumSample;
  const midpoint = Math.floor(responseMinutes.length / 2);
  const medianMinutes = responseMinutes.length === 0
    ? null
    : responseMinutes.length % 2 === 0
      ? (responseMinutes[midpoint - 1] + responseMinutes[midpoint]) / 2
      : responseMinutes[midpoint];

  return {
    sampleSize,
    respondedCount: responseMinutes.length,
    hasEnoughHistory,
    responseRatePercent: hasEnoughHistory ? Math.round((responseMinutes.length / sampleSize) * 100) : null,
    medianFirstResponseMinutes: hasEnoughHistory && medianMinutes != null ? Math.round(medianMinutes) : null,
  };
}

export function getProfessionalProfileFreshness(
  confirmedAt: string | Date | null,
  updatedAt: string | Date | null,
  now = new Date(),
) {
  const updatedTime = updatedAt ? new Date(updatedAt).getTime() : null;
  const confirmedTime = confirmedAt ? new Date(confirmedAt).getTime() : null;
  if (confirmedTime == null || !Number.isFinite(confirmedTime)) {
    return { isCurrent: false, ageDays: null };
  }

  const ageDays = Math.max(0, Math.floor((now.getTime() - confirmedTime) / (24 * 60 * 60 * 1000)));
  const changedAfterConfirmation = updatedTime != null
    && Number.isFinite(updatedTime)
    && updatedTime > confirmedTime;
  return {
    isCurrent: !changedAfterConfirmation && ageDays <= PROFESSIONAL_PROFILE_FRESHNESS_DAYS,
    ageDays,
  };
}

export function buildProfessionalShareUrl(origin: string, slug: string, locale: Locale) {
  const localePrefix = locale === "es-419" ? "/es" : locale === "pt-BR" ? "/pt-br" : "";
  return `${origin.replace(/\/$/, "")}${localePrefix}/professionals/${encodeURIComponent(slug)}/`;
}

export function buildMonthlyProfessionalSummary(
  input: MonthlyProfessionalSummaryInput,
  locale: Locale,
) {
  const number = new Intl.NumberFormat(locale);
  const responseRate = input.responseRatePercent == null
    ? locale === "es-419" ? "Aún no hay suficiente historial" : locale === "pt-BR" ? "Ainda não há histórico suficiente" : "Not enough history yet"
    : `${number.format(input.responseRatePercent)}%`;

  if (locale === "es-419") {
    return {
      subject: "Tu resumen mensual de Elevare",
      heading: "Así funcionó tu perfil este mes",
      lines: [
        input.views === 0 ? "Aún no hay visitas registradas" : `${number.format(input.views)} visitas registradas a la página del perfil`,
        `${number.format(input.currentSaves)} guardados actuales`,
        `${number.format(input.consultationRequests)} solicitudes de consulta`,
        `Tasa de respuesta: ${responseRate}`,
        `Perfil completo: ${number.format(input.profileCompletenessPercent)}%`,
      ],
      cta: "Revisar mi panel profesional",
    };
  }

  if (locale === "pt-BR") {
    return {
      subject: "Seu resumo mensal da Elevare",
      heading: "Veja como seu perfil se saiu neste mês",
      lines: [
        input.views === 0 ? "Ainda não há visitas registradas" : `${number.format(input.views)} visitas registradas à página do perfil`,
        `${number.format(input.currentSaves)} salvamentos atuais`,
        `${number.format(input.consultationRequests)} solicitações de consulta`,
        `Taxa de resposta: ${responseRate}`,
        `Perfil completo: ${number.format(input.profileCompletenessPercent)}%`,
      ],
      cta: "Revisar meu painel profissional",
    };
  }

  return {
    subject: "Your monthly Elevare summary",
    heading: "How your profile performed this month",
    lines: [
      input.views === 0 ? "No recorded views yet" : `${number.format(input.views)} recorded profile page views`,
      `${number.format(input.currentSaves)} current saves`,
      `${number.format(input.consultationRequests)} consultation requests`,
      `Response rate: ${responseRate}`,
      `Profile complete: ${number.format(input.profileCompletenessPercent)}%`,
    ],
    cta: "Review my professional dashboard",
  };
}
