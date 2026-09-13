export const LOCALIZED_LEGAL_DOCUMENTS = {
  support: { route: "/stagelab-legal/", source: "public/stagelab-legal.html" },
  stagePrivacy: { route: "/stagelab-privacy-policy/", source: "public/stagelab-privacy-policy.html" },
  terms: { route: "/terms-of-service/", source: "content/legal/terms-of-service.html" },
  privacy: { route: "/privacy-policy/", source: "content/legal/privacy-policy.html" },
} as const;
export type LocalizedLegalDocument = keyof typeof LOCALIZED_LEGAL_DOCUMENTS;
export const LOCALIZED_LEGAL_PATHS = Object.values(LOCALIZED_LEGAL_DOCUMENTS).map(({ route }) => route);
