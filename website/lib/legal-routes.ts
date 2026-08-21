export type StaticLegalRoute = {
  label: string;
  sourceFile: string;
  route: string;
  canonical: string;
};

const SITE_URL = "https://www.elevarefit.org";

function legalRoute(label: string, sourceFile: string, route: string): StaticLegalRoute {
  return {
    label,
    sourceFile,
    route,
    canonical: `${SITE_URL}${route}`,
  };
}

export const OVERARCHING_LEGAL_ROUTES = {
  terms: legalRoute("Terms of Service", "terms-of-service/index.html", "/terms-of-service/"),
  privacy: legalRoute("Privacy Policy", "privacy-policy/index.html", "/privacy-policy/"),
} as const;

export const STAGELAB_LEGAL_ROUTES = {
  index: legalRoute("Legal Index", "stagelab-legal.html", "/stagelab-legal/"),
  terms: legalRoute("Terms of Service", "stagelab-terms-of-service.html", "/stagelab-terms-of-service/"),
  privacy: legalRoute("Privacy Policy", "stagelab-privacy-policy.html", "/stagelab-privacy-policy/"),
  coach: legalRoute("Coach Agreement", "stagelab-coach-agreement.html", "/stagelab-coach-agreement/"),
  waiver: legalRoute("Liability Waiver", "stagelab-liability-waiver.html", "/stagelab-liability-waiver/"),
  ai: legalRoute("AI Disclaimer", "stagelab-ai-disclaimer.html", "/stagelab-ai-disclaimer/"),
  refund: legalRoute("Refund Policy", "stagelab-refund-policy.html", "/stagelab-refund-policy/"),
  content: legalRoute("Photo & Content Policy", "stagelab-photo-content-policy.html", "/stagelab-photo-content-policy/"),
} as const;

export const ACTIVE_LEGAL_ROUTES = [
  ...Object.values(OVERARCHING_LEGAL_ROUTES),
  ...Object.values(STAGELAB_LEGAL_ROUTES),
] as const;

export function publicHtmlFileToProductionRoute(sourceFile: string) {
  const normalized = sourceFile.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.endsWith("/index.html")) {
    return `/${normalized.slice(0, -"index.html".length)}`;
  }
  if (!normalized.endsWith(".html")) {
    throw new Error(`Static legal source must be an HTML file: ${sourceFile}`);
  }
  return `/${normalized.slice(0, -".html".length)}/`;
}

export function archiveFileToProductionRoute(archiveFilePath: string) {
  return publicHtmlFileToProductionRoute(archiveFilePath);
}
