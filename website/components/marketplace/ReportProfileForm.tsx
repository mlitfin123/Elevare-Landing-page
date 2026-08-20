"use client";

import { type FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ProfessionalProfileRecord } from "@/lib/marketplace-types";

type ReportProfileFormProps = {
  professional: ProfessionalProfileRecord;
};

const reportReasons = [
  "False or misleading credentials",
  "Impersonation",
  "Incorrect profile information",
  "Inappropriate content",
  "Suspicious or fraudulent behavior",
  "Other",
];

export function ReportProfileForm({ professional }: ReportProfileFormProps) {
  const pathname = usePathname();
  const { user, isConfigured } = useSupabaseSession();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(reportReasons[0]);
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  function handleStart() {
    if (!isConfigured) {
      setFeedback("Marketplace auth is not configured yet.");
      setFeedbackType("error");
      return;
    }

    if (!user) {
      window.location.href = `/sign-in/?redirect=${encodeURIComponent(pathname)}`;
      return;
    }

    setIsOpen(true);
    setFeedback(null);
    trackEvent("professional_report_started", {
      professional_slug: professional.profileSlug,
      professional_name: professional.displayName,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      window.location.href = `/sign-in/?redirect=${encodeURIComponent(pathname)}`;
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setFeedback("Marketplace auth is not configured yet.");
      setFeedbackType("error");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

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

      setFeedback("Report submitted. The Elevare review team can review it separately.");
      setFeedbackType("success");
      setDetails("");
      trackEvent("professional_report_submitted", {
        professional_slug: professional.profileSlug,
        professional_name: professional.displayName,
        report_reason: reason,
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "We could not submit your report right now.");
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="marketplace-report-stack">
      <button type="button" className="hero-text-link" onClick={handleStart}>
        Report this profile
      </button>

      {isOpen ? (
        <form className="marketplace-inline-form marketplace-report-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Reason</span>
              <select value={reason} onChange={(event) => setReason(event.target.value)}>
                {reportReasons.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-full">
              <span className="field-label">Details</span>
              <textarea
                rows={4}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Share the specific issue you want the review team to check."
              />
            </label>
            <div className="form-note field-full">
              Include only information relevant to the report. Do not submit medical records, passwords, payment
              card details, or other highly sensitive information.
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="button button-secondary" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit report"}
            </button>
            {feedback ? (
              <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>
                {feedback}
              </div>
            ) : null}
          </div>
        </form>
      ) : null}

      {!isOpen && feedback ? (
        <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
