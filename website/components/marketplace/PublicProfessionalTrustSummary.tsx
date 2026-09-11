"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { formatDate, localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";
import { getCredentialPublicStatus } from "@/lib/marketplace-helpers";
import type { ProfessionalProfileRecord } from "@/lib/marketplace-types";

type PublicProfessionalTrustSummaryProps = {
  professional: ProfessionalProfileRecord;
};

type TrustSignal = {
  key: string;
  label: string;
  detail: string;
};

export function PublicProfessionalTrustSummary({ professional }: PublicProfessionalTrustSummaryProps) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const trust = professional.trustSummary;
  const date = (value: string) => formatDate(value, locale, { dateStyle: "medium" });
  const signals: TrustSignal[] = [];

  if (trust?.profileReviewed) {
    signals.push({
      key: "profile_review",
      label: t("Profile reviewed"),
      detail: t("Elevare reviewed this profile for marketplace eligibility before publication. This is not an endorsement or a check of every claim."),
    });
  }

  if (trust?.identityVerified) {
    signals.push({
      key: "identity",
      label: t("Identity verified"),
      detail: t("Elevare confirmed this professional's identity through a completed identity check. Identity verification is separate from credential and service-quality review."),
    });
  }

  for (const credential of professional.credentials) {
    if (getCredentialPublicStatus(credential).label !== "Credential verified") continue;
    const jurisdiction = credential.jurisdiction ? ` · ${credential.jurisdiction}` : "";
    const expiration = credential.expirationDate
      ? ` ${t("Current through")} ${date(credential.expirationDate)}.`
      : "";
    signals.push({
      key: `credential-${credential.id}`,
      label: `${credential.credentialName} ${t("verified")}${jurisdiction}`,
      detail: `${t("Elevare reviewed this specific credential against the submitted evidence or an authoritative source.")}${expiration}`,
    });
  }

  if (trust?.backgroundCheckCompleted) {
    signals.push({
      key: "background_check",
      label: t("Background check completed"),
      detail: `${t("A background screening was completed at a point in time.")} ${t("It does not guarantee future conduct, safety, suitability, or continuous monitoring.")}`,
    });
  }

  if (trust?.insuranceConfirmed && trust.insuranceConfirmedThrough) {
    signals.push({
      key: "insurance",
      label: `${t("Insurance confirmed through")} ${date(trust.insuranceConfirmedThrough)}`,
      detail: t("Elevare reviewed evidence of insurance through the date shown. This does not guarantee coverage for a particular service or claim."),
    });
  }

  if (trust?.profileInformationConfirmedAt) {
    signals.push({
      key: "profile_freshness",
      label: `${t("Last confirmed")} ${date(trust.profileInformationConfirmedAt)}`,
      detail: t("The professional confirmed their public profile information on this date. Elevare does not continuously monitor every profile detail."),
    });
  }

  signals.push({
    key: "availability",
    label: t(professional.clientAcceptanceStatus === "waitlist"
      ? "Accepting waitlist requests"
      : professional.clientAcceptanceStatus === "not_accepting"
        ? "Not accepting new clients"
        : "Currently accepting clients"),
    detail: t("This availability is supplied by the professional and may change. Confirm availability directly before making plans."),
  });

  if (signals.length === 0) return null;

  return (
    <section className="section professional-trust-section" aria-labelledby="professional-trust-heading">
      <div className="section-head">
        <div className="eyebrow">{t("Trust details")}</div>
        <h2 id="professional-trust-heading" className="section-title">{t("What Elevare has reviewed")}</h2>
        <p className="section-copy">
          {t("Each status below describes a specific check. No single status is an endorsement, safety guarantee, or promise of results.")}
        </p>
      </div>

      <div className="professional-trust-list">
        {signals.map((signal) => (
          <details
            key={signal.key}
            className="professional-trust-item"
            onToggle={(event) => {
              if (event.currentTarget.open) {
                trackEvent("public_trust_detail_expanded", { trust_type: signal.key.split("-")[0] });
              }
            }}
          >
            <summary>
              <span className="professional-trust-marker" aria-hidden="true">{"\u2713"}</span>
              <span>{signal.label}</span>
              <span className="professional-trust-more">{t("What this means")}</span>
            </summary>
            <p>{signal.detail}</p>
          </details>
        ))}
      </div>

      <p className="form-note professional-trust-note">
        {t("Review a professional's current qualifications, lawful scope, insurance, and suitability for your needs before working together.")} {" "}
        <Link
          href={localizePathname("/trust-safety/", locale)}
          onClick={() => trackEvent("trust_explanation_opened", { source_page: "professional_profile" })}
        >
          {t("Learn how Elevare trust checks work")}
        </Link>
      </p>
    </section>
  );
}
