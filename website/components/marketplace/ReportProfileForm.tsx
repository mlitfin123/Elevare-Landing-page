"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ProfessionalProfileRecord } from "@/lib/marketplace-types";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";

type ReportProfileFormProps = {
  professional: ProfessionalProfileRecord;
};

const reportReasons = [
  { value: "misleading_profile", label: "Misleading profile information" },
  { value: "false_or_expired_credential", label: "False or expired credential" },
  { value: "impersonation", label: "Impersonation" },
  { value: "unsafe_conduct", label: "Unsafe conduct" },
  { value: "harassment_or_discrimination", label: "Harassment or discrimination" },
  { value: "outside_scope", label: "Services outside professional scope" },
  { value: "fraud_or_payment_solicitation", label: "Fraud or payment solicitation concern" },
  { value: "other_policy_violation", label: "Other marketplace-policy violation" },
] as const;

type ReportReason = (typeof reportReasons)[number]["value"];

export function ReportProfileForm({ professional }: ReportProfileFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const { user, isConfigured } = useSupabaseSession();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>(reportReasons[0].value);
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  function handleStart() {
    if (!isConfigured) {
      setFeedback(t("Marketplace auth is not configured yet."));
      setFeedbackType("error");
      return;
    }

    if (!user) {
      router.push(`/sign-in/?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    setIsOpen(true);
    setFeedback(null);
    trackEvent("report_flow_opened", { source_page: "professional_profile" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      router.push(`/sign-in/?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setFeedback(t("Marketplace auth is not configured yet."));
      setFeedbackType("error");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    if (details.trim().length < 20) {
      setFeedback(t("Add at least 20 characters so the review team can understand the concern."));
      setFeedbackType("error");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.rpc("submit_professional_profile_report", {
        target_profile_id: professional.id,
        report_reason: reason,
        report_details: details.trim() || null,
        source_path: pathname,
      });

      if (error) {
        throw error;
      }

      setFeedback(t("Report received. Elevare will review it under the marketplace safety process."));
      setFeedbackType("success");
      setDetails("");
      trackEvent("report_submitted", {
        source_page: "professional_profile",
        reason_category: reason,
      });
    } catch {
      setFeedback(t("We could not submit your report right now."));
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="marketplace-report-stack">
      <button type="button" className="hero-text-link" onClick={handleStart}>
        {t("Report this profile")}
      </button>

      {isOpen ? (
        <form className="marketplace-inline-form marketplace-report-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">{t("Reason")}</span>
              <select
                value={reason}
                onChange={(event) => setReason(
                  reportReasons.find((option) => option.value === event.target.value)?.value ?? reportReasons[0].value,
                )}
              >
                {reportReasons.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-full">
              <span className="field-label">{t("Details")}</span>
              <textarea
                rows={4}
                required
                minLength={20}
                maxLength={2000}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder={t("Share the specific issue you want the review team to check.")}
              />
            </label>
            <div className="form-note field-full">
              {t("Include only information relevant to the report. Do not submit medical records, passwords, payment card details, or other highly sensitive information.")}
            </div>
            <div className="form-note field-full">
              {t("Elevare is not an emergency or crisis service. If someone is in immediate danger, contact local emergency services.")} {" "}
              <Link href={localizePathname("/trust-safety/", locale)}>{t("Review Trust and Safety guidance")}</Link>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="button button-secondary" disabled={isSubmitting}>
              {isSubmitting ? t("Submitting...") : t("Submit report")}
            </button>
            {feedback ? (
              <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`} role={feedbackType === "error" ? "alert" : "status"} aria-live="polite">
                {feedback}
              </div>
            ) : null}
          </div>
        </form>
      ) : null}

      {!isOpen && feedback ? (
        <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`} role={feedbackType === "error" ? "alert" : "status"} aria-live="polite">
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
