import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";
import { siteConfig } from "@/lib/site";

export function TrustSafetyPageContent({ locale = "en" }: { locale?: Locale }) {
  const t = (value: string) => marketplaceText(locale, value);

  return (
    <div className="container">
      <section className="hero hero-compact">
        <div className="eyebrow">{t("Elevare marketplace")}</div>
        <h1>{t("Trust and Safety")}</h1>
        <p>{t("Understand what Elevare reviews, what each public trust status means, and how to evaluate an independent professional.")}</p>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">{t("Profile review")}</span>
            <h2>{t("Marketplace eligibility, not an endorsement")}</h2>
            <p>{t("A reviewed profile met Elevare's publication requirements at the time of review. Profile review does not verify every claim, guarantee service quality, or make the professional an Elevare employee or agent.")}</p>
          </article>
          <article className="panel">
            <span className="stat-label">{t("Identity and credentials")}</span>
            <h2>{t("Separate, specific checks")}</h2>
            <p>{t("Identity verification confirms identity only. Credentials are reviewed one record at a time. A claimed credential has not been verified by Elevare; a verified credential names the specific credential reviewed.")}</p>
          </article>
          <article className="panel">
            <span className="stat-label">{t("Background checks and insurance")}</span>
            <h2>{t("Point-in-time information")}</h2>
            <p>{t("A completed background check reflects the screening product completed at a point in time and is not a guarantee of safety or continuous monitoring. Insurance confirmation means Elevare reviewed evidence through the displayed date; it does not guarantee coverage for a claim.")}</p>
          </article>
        </div>
      </section>

      <section className="section marketplace-detail-grid">
        <article className="panel">
          <div className="eyebrow">{t("Before you choose")}</div>
          <h2>{t("Evaluate the professional for your needs")}</h2>
          <ul>
            <li>{t("Confirm current licenses, credentials, insurance, and standing with the relevant issuer or authority.")}</li>
            <li>{t("Ask whether the professional's experience, approach, availability, and service boundaries fit your goals.")}</li>
            <li>{t("Confirm that the service is lawful and within the professional's scope of practice in your location.")}</li>
            <li>{t("Do not treat marketplace trust statuses as medical advice, an emergency service, or a guarantee of outcomes.")}</li>
          </ul>
        </article>
        <article className="panel">
          <div className="eyebrow">{t("Report a concern")}</div>
          <h2>{t("Help us review marketplace concerns")}</h2>
          <p>{t("Use Report this profile on a professional's page for misleading information, credential concerns, impersonation, unsafe conduct, harassment, services outside professional scope, or fraud concerns.")}</p>
          <p>{t("Elevare is not an emergency, medical, or crisis service. If someone is in immediate danger, contact local emergency services. For medical concerns, contact an appropriate licensed healthcare professional.")}</p>
          <div className="button-row">
            <Link className="button button-secondary" href={localizePathname("/professionals/", locale)}>{t("Browse professionals")}</Link>
            <a className="hero-text-link" href={`mailto:${siteConfig.contacts.support}`}>{t("Contact support")}</a>
          </div>
        </article>
      </section>

      <section className="section panel">
        <div className="eyebrow">{t("Independent providers")}</div>
        <h2>{t("Elevare is a technology marketplace")}</h2>
        <p>{t("Professionals listed on Elevare are independent businesses, not employees, agents, or representatives of Elevare Fit LLC. Verification reflects information reviewed at a point in time. Clients should independently confirm current qualifications, licensing, insurance, suitability, and lawful scope before engaging services.")}</p>
      </section>
    </div>
  );
}
