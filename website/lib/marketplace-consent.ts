import { AGE_ATTESTATION_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "./legal.ts";

export function isCurrentMarketplaceConsent(value: unknown): value is { accepted: boolean } {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;
  return typeof status.accepted === "boolean" && status.termsVersion === TERMS_VERSION
    && status.privacyVersion === PRIVACY_VERSION && status.ageVersion === AGE_ATTESTATION_VERSION;
}

export const marketplaceAcknowledgement = {
  p_terms_version: TERMS_VERSION, p_privacy_version: PRIVACY_VERSION,
  p_age_version: AGE_ATTESTATION_VERSION,
  p_terms_accepted: true, p_privacy_acknowledged: true, p_age_18_plus: true,
} as const;

export const marketplaceConsentCopy = {
  en: {
    title: "Before you continue", body: "Confirm the current marketplace terms and age requirement for this action. This is not marketing consent.",
    agree: "I agree to the", terms: "Terms of Service", acknowledge: "and acknowledge the", privacy: "Privacy Policy",
    age: "I confirm that I am 18 or older.", continue: "Confirm and continue", cancel: "Cancel", saving: "Saving…",
    error: "We could not confirm your acknowledgements. Please try again.", reload: "The legal documents have changed. Refresh this page to review the current versions.",
  },
  "es-419": {
    title: "Antes de continuar", body: "Confirma los términos actuales del directorio y el requisito de edad para esta acción. Esto no es un consentimiento de marketing.",
    agree: "Acepto los", terms: "Términos de servicio", acknowledge: "y reconozco la", privacy: "Política de privacidad",
    age: "Confirmo que tengo 18 años o más.", continue: "Confirmar y continuar", cancel: "Cancelar", saving: "Guardando…",
    error: "No pudimos confirmar tus declaraciones. Inténtalo de nuevo.", reload: "Los documentos legales cambiaron. Actualiza esta página para revisar las versiones vigentes.",
  },
  "pt-BR": {
    title: "Antes de continuar", body: "Confirme os termos atuais do diretório e o requisito de idade para esta ação. Isto não é consentimento para marketing.",
    agree: "Concordo com os", terms: "Termos de Serviço", acknowledge: "e declaro ciência da", privacy: "Política de Privacidade",
    age: "Confirmo que tenho 18 anos ou mais.", continue: "Confirmar e continuar", cancel: "Cancelar", saving: "Salvando…",
    error: "Não foi possível confirmar suas declarações. Tente novamente.", reload: "Os documentos legais mudaram. Atualize esta página para revisar as versões atuais.",
  },
} as const;
