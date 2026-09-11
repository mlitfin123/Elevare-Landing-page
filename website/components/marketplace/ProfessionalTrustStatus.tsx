"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { trackEvent } from "@/lib/analytics";
import { formatDate, localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { validateTrustEvidenceFile } from "@/lib/trust-evidence";

type CredentialTrustStatus = {
  id: string;
  name: string;
  status: string;
  expiration_date: string | null;
  feedback: string | null;
};

type ProfessionalTrustStatusRecord = {
  trainer_profile_id: string;
  email_verified: boolean;
  phone_verification_supported: boolean;
  profile_review_status: string;
  profile_reviewed_at: string | null;
  profile_live: boolean;
  profile_information_confirmed_at: string | null;
  account_standing: string;
  accepting_clients: string;
  identity_status: string;
  background_check_status: string;
  background_check_product: string | null;
  insurance_status: string;
  insurance_expiration_date: string | null;
  credential_statuses: CredentialTrustStatus[];
};

function asTrustStatus(value: unknown): ProfessionalTrustStatusRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<ProfessionalTrustStatusRecord>;
  if (typeof record.trainer_profile_id !== "string") return null;
  return {
    trainer_profile_id: record.trainer_profile_id,
    email_verified: record.email_verified === true,
    phone_verification_supported: record.phone_verification_supported === true,
    profile_review_status: String(record.profile_review_status ?? "draft"),
    profile_reviewed_at: typeof record.profile_reviewed_at === "string" ? record.profile_reviewed_at : null,
    profile_live: record.profile_live === true,
    profile_information_confirmed_at: typeof record.profile_information_confirmed_at === "string" ? record.profile_information_confirmed_at : null,
    account_standing: String(record.account_standing ?? "not_public"),
    accepting_clients: String(record.accepting_clients ?? "accepting"),
    identity_status: String(record.identity_status ?? "not_submitted"),
    background_check_status: String(record.background_check_status ?? "not_submitted"),
    background_check_product: typeof record.background_check_product === "string" ? record.background_check_product : null,
    insurance_status: String(record.insurance_status ?? "not_submitted"),
    insurance_expiration_date: typeof record.insurance_expiration_date === "string" ? record.insurance_expiration_date : null,
    credential_statuses: Array.isArray(record.credential_statuses)
      ? record.credential_statuses.filter((credential): credential is CredentialTrustStatus => (
        Boolean(credential && typeof credential === "object" && typeof credential.id === "string")
      ))
      : [],
  };
}

function normalizeStatusLabel(status: string) {
  const labels: Record<string, string> = {
    approved: "Approved",
    active: "Active",
    declined: "Not verified",
    draft: "Draft",
    expired: "Expired",
    needs_information: "More information requested",
    not_public: "Not publicly listed",
    not_submitted: "Not submitted",
    passed: "Completed",
    pending: "Under review",
    pending_review: "Under review",
    rejected: "Not verified",
    revoked: "Revoked",
    suspended: "Restricted",
    verified: "Verified",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

async function fetchTrustSummary() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { summary: null, failed: true };
  const result = await supabase.rpc("marketplace_get_current_professional_trust_summary");
  if (result.error) return { summary: null, failed: true };
  const summary = asTrustStatus(result.data);
  return { summary, failed: !summary };
}

export function ProfessionalTrustStatus() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const trustLoadError = marketplaceText(locale, "Trust status could not be loaded right now.");
  const { user } = useSupabaseSession();
  const [summary, setSummary] = useState<ProfessionalTrustStatusRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insurerName, setInsurerName] = useState("");
  const [policyType, setPolicyType] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [publicDisplay, setPublicDisplay] = useState(true);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  async function loadSummary() {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const result = await fetchTrustSummary();
    const next = result.summary;
    setSummary(next);
    setError(result.failed ? t("Trust status could not be loaded right now.") : null);
    setIsLoading(false);
    if (next) trackEvent("verification_status_viewed", { status_scope: "professional_trust" });
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!user) {
        await Promise.resolve();
        if (!cancelled) setIsLoading(false);
        return;
      }

      const result = await fetchTrustSummary();
      if (cancelled) return;
      setSummary(result.summary);
      setError(result.failed ? trustLoadError : null);
      setIsLoading(false);
      if (result.summary) trackEvent("verification_status_viewed", { status_scope: "professional_trust" });
    })();

    return () => {
      cancelled = true;
    };
  }, [trustLoadError, user]);

  async function handleEvidenceChange(file: File | null) {
    setEvidenceFile(null);
    if (!file) return;
    const validation = await validateTrustEvidenceFile(file);
    if (!validation.valid) {
      setFeedback(t(validation.error));
      setFeedbackType("error");
      return;
    }
    setEvidenceFile(file);
    setFeedback(t("Selected file is ready for private upload."));
    setFeedbackType("success");
    trackEvent("insurance_submission_started", { evidence_type: "document" });
  }

  async function handleInsuranceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user || !summary || !evidenceFile) {
      setFeedback(t("Complete every insurance field and select supporting evidence."));
      setFeedbackType("error");
      return;
    }
    if (expirationDate <= new Date().toISOString().slice(0, 10)) {
      setFeedback(t("Enter a future coverage expiration date."));
      setFeedbackType("error");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    let storagePath: string | null = null;
    try {
      const validation = await validateTrustEvidenceFile(evidenceFile);
      if (!validation.valid) throw new Error(validation.error);
      storagePath = `${user.id}/insurance/${crypto.randomUUID()}.${validation.extension}`;
      const upload = await supabase.storage.from("professional-trust-evidence").upload(storagePath, evidenceFile, {
        cacheControl: "3600",
        contentType: evidenceFile.type,
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const insert = await supabase.from("professional_insurance_submissions").insert({
        trainer_profile_id: summary.trainer_profile_id,
        insurer_name: insurerName.trim(),
        policy_type: policyType.trim(),
        coverage_expiration_date: expirationDate,
        evidence_storage_path: storagePath,
        public_display: publicDisplay,
        submission_status: "submitted",
      });
      if (insert.error) throw insert.error;

      setInsurerName("");
      setPolicyType("");
      setExpirationDate("");
      setEvidenceFile(null);
      setFeedback(t("Insurance evidence submitted for review. It is not publicly confirmed unless Elevare approves it."));
      setFeedbackType("success");
      trackEvent("insurance_submission_completed", { submission_type: "insurance" });
      await loadSummary();
    } catch {
      if (storagePath) await supabase.storage.from("professional-trust-evidence").remove([storagePath]);
      setFeedback(t("Insurance evidence could not be submitted right now."));
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const date = (value: string) => formatDate(value, locale, { dateStyle: "medium" });

  return (
    <article className="panel profile-form-section professional-trust-owner" aria-labelledby="professional-trust-status-heading">
      <div className="section-head">
        <div className="eyebrow">{t("Trust status")}</div>
        <h2 id="professional-trust-status-heading" className="section-title section-title-compact">{t("Your independent review statuses")}</h2>
        <p className="section-copy section-copy-compact">{t("Profile review, identity, credentials, background screening, and insurance are separate checks. Completing one does not complete the others.")}</p>
        <Link href={localizePathname("/trust-safety/", locale)}>{t("Learn how Elevare trust checks work")}</Link>
      </div>

      {isLoading ? <p role="status">{t("Loading trust status...")}</p> : null}
      {error ? <p className="form-feedback is-error" role="alert">{error}</p> : null}
      {summary ? (
        <>
          <div className="professional-trust-owner-grid">
            <div><span>{t("Email verification")}</span><strong>{t(summary.email_verified ? "Verified" : "Not verified")}</strong></div>
            <div><span>{t("Profile review")}</span><strong>{t(normalizeStatusLabel(summary.profile_review_status))}</strong></div>
            <div><span>{t("Public listing")}</span><strong>{t(summary.profile_live ? "Live" : "Not publicly listed")}</strong></div>
            <div><span>{t("Account standing")}</span><strong>{t(normalizeStatusLabel(summary.account_standing))}</strong></div>
            <div><span>{t("Identity verification")}</span><strong>{t(normalizeStatusLabel(summary.identity_status))}</strong></div>
            <div><span>{t("Background check")}</span><strong>{t(normalizeStatusLabel(summary.background_check_status))}</strong></div>
            <div><span>{t("Insurance review")}</span><strong>{t(normalizeStatusLabel(summary.insurance_status))}</strong></div>
          </div>

          {summary.insurance_expiration_date ? (
            <p className="form-note">{t("Coverage expiration date")}: {date(summary.insurance_expiration_date)}</p>
          ) : null}

          {summary.credential_statuses.length > 0 ? (
            <div className="professional-trust-owner-credentials">
              <h3>{t("Credential reviews")}</h3>
              {summary.credential_statuses.map((credential) => (
                <div key={credential.id} className="professional-trust-owner-credential">
                  <span>{credential.name}</span>
                  <strong>{t(normalizeStatusLabel(credential.status))}</strong>
                  {credential.expiration_date ? <small>{t("Expires")} {date(credential.expiration_date)}</small> : null}
                  {credential.feedback ? <p><strong>{t("Review feedback")}:</strong> {credential.feedback}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          <details className="professional-trust-owner-submit">
            <summary>{t("Submit insurance evidence for review")}</summary>
            <p className="form-note">{t("Evidence is stored privately. Only your account and authorized Elevare reviewers can access it. Submission does not mean insurance is confirmed.")}</p>
            <form onSubmit={handleInsuranceSubmit} className="tool-form-grid marketplace-editor-grid">
              <label className="field"><span className="field-label">{t("Insurer name")}</span><input required minLength={2} maxLength={160} value={insurerName} onChange={(event) => setInsurerName(event.target.value)} /></label>
              <label className="field"><span className="field-label">{t("Policy type")}</span><input required minLength={2} maxLength={120} value={policyType} onChange={(event) => setPolicyType(event.target.value)} /></label>
              <label className="field"><span className="field-label">{t("Coverage expiration date")}</span><input required type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} /></label>
              <label className="field"><span className="field-label">{t("Private supporting evidence")}</span><input required type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => void handleEvidenceChange(event.target.files?.[0] ?? null)} /><span className="field-help">{t("PDF, JPG, PNG, or WebP up to 8 MB.")}</span></label>
              <label className="check-row field-full"><input type="checkbox" checked={publicDisplay} onChange={(event) => setPublicDisplay(event.target.checked)} /><span>{t("Show confirmed insurance status on my public profile after approval")}</span></label>
              <div className="form-actions field-full"><button className="button button-secondary" type="submit" disabled={isSubmitting}>{isSubmitting ? t("Submitting...") : t("Submit for review")}</button></div>
            </form>
          </details>
        </>
      ) : null}

      {feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`} role={feedbackType === "error" ? "alert" : "status"} aria-live="polite">{feedback}</div> : null}
    </article>
  );
}
