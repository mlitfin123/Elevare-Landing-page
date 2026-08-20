export const TERMS_VERSION = "2026-08-20";
export const PRIVACY_VERSION = "2026-08-20";
export const AGE_ATTESTATION_VERSION = "2026-08-20";
export const PROFESSIONAL_ATTESTATION_VERSION = "2026-08-20";

export const LEGAL_DOCUMENTS = {
  terms: {
    key: "terms_of_service",
    version: TERMS_VERSION,
    effectiveDate: "2026-08-20",
    activePath: "/terms-of-service/",
    archivePath: `/legal/archive/terms/${TERMS_VERSION}.html`,
  },
  privacy: {
    key: "privacy_policy",
    version: PRIVACY_VERSION,
    effectiveDate: "2026-08-20",
    activePath: "/privacy-policy/",
    archivePath: `/legal/archive/privacy/${PRIVACY_VERSION}.html`,
  },
} as const;

export const PROFESSIONAL_ATTESTATION_TEXT =
  "I confirm that I am responsible for maintaining all licenses, certifications, insurance, registrations, permits, and other authorizations required for the services I offer, for keeping my profile and credential information accurate, and for providing services only within my lawful scope of practice in each applicable jurisdiction.";
