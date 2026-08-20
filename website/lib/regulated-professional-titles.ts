export type RegulatedTitleGroup =
  | "dietetics_nutrition"
  | "physical_therapy"
  | "medical"
  | "mental_health"
  | "nursing";

type CredentialLike = {
  credentialName?: string | null;
  credentialType?: string | null;
  verificationStatus?: string | null;
};

type RegulatedTitleRule = {
  group: RegulatedTitleGroup;
  label: string;
  titlePatterns: RegExp[];
  credentialPatterns: RegExp[];
};

// These rules are a marketplace review safeguard, not a legal determination
// that a title is regulated identically in every jurisdiction.
export const REGULATED_TITLE_RULES: RegulatedTitleRule[] = [
  {
    group: "dietetics_nutrition",
    label: "nutrition or dietetics credential",
    titlePatterns: [
      /\bregistered\s+dietitian(?:\s+nutritionist)?\b/i,
      /\blicensed\s+(?:dietitian|nutritionist)(?:\s*\/\s*nutritionist)?\b/i,
      /\b(?:dietitian|nutritionist|nutrition\s+counselor)\b/i,
      /\b(?:RDN|RD)\b/,
    ],
    credentialPatterns: [/\bdiet(?:itian|etics)\b/i, /\bnutrition(?:ist|al)?\b/i, /\b(?:RDN|RD)\b/],
  },
  {
    group: "physical_therapy",
    label: "physical therapy credential",
    titlePatterns: [/\bphysical\s+therap(?:ist|y)\b/i, /\bdoctor\s+of\s+physical\s+therapy\b/i, /\bDPT\b/],
    credentialPatterns: [/\bphysical\s+therap(?:ist|y)\b/i, /\bDPT\b/],
  },
  {
    group: "medical",
    label: "medical credential",
    titlePatterns: [/\bphysician\b/i, /\bdoctor\b/i, /\b(?:MD|DO)\b/],
    credentialPatterns: [/\bphysician\b/i, /\bmedical\b/i, /\bosteopathic\b/i, /\b(?:MD|DO)\b/],
  },
  {
    group: "mental_health",
    label: "mental health credential",
    titlePatterns: [/\bpsychologist\b/i, /\blicensed\s+mental\s+health\s+counselor\b/i, /\btherapist\b/i, /\bLMHC\b/],
    credentialPatterns: [/\bpsycholog(?:ist|y)\b/i, /\bmental\s+health\b/i, /\btherap(?:ist|y)\b/i, /\bLMHC\b/],
  },
  {
    group: "nursing",
    label: "nursing credential",
    titlePatterns: [/\bregistered\s+nurse\b/i, /\bnurse\s+practitioner\b/i, /\b(?:RN|NP)\b/],
    credentialPatterns: [/\bnurs(?:e|ing)\b/i, /\bnurse\s+practitioner\b/i, /\b(?:RN|NP)\b/],
  },
];

export function getRegulatedTitleRule(title: string) {
  const normalizedTitle = title.trim().replace(/[._/()-]+/g, " ").replace(/\s+/g, " ");
  const compactAbbreviations = title.replace(/\./g, "");
  return REGULATED_TITLE_RULES.find((rule) =>
    rule.titlePatterns.some((pattern) => pattern.test(normalizedTitle) || pattern.test(compactAbbreviations)),
  ) ?? null;
}

export function hasCompatibleVerifiedCredential(title: string, credentials: CredentialLike[]) {
  const rule = getRegulatedTitleRule(title);
  if (!rule) return true;

  return credentials.some((credential) => {
    if (credential.verificationStatus?.trim().toLowerCase() !== "verified") return false;
    const credentialText = `${credential.credentialName ?? ""} ${credential.credentialType ?? ""}`.trim();
    const compactAbbreviations = credentialText.replace(/\./g, "");
    return rule.credentialPatterns.some((pattern) =>
      pattern.test(credentialText) || pattern.test(compactAbbreviations),
    );
  });
}

export const REGULATED_TITLE_REVIEW_MESSAGE =
  "This title may require professional credentials. Add the applicable license or credential and have it verified before publishing this title.";
