"use client";

import { type FormEvent, useState } from "react";
import { useMarketplaceAccountState } from "@/components/marketplace/MarketplaceAccountShell";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AccountDeletionRequest({ locale = "en" }: { locale?: Locale }) {
  const { user, appUser } = useMarketplaceAccountState();
  const t = (value: string) => marketplaceText(locale, value);
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  function handleOpen() {
    setIsOpen(true);
    setFeedback(null);
    trackEvent("account_deletion_request_started", { source_page: "account_dashboard" });
  }

  function handleCancel() {
    setIsOpen(false);
    setIsConfirmed(false);
    setDetails("");
    setFeedback(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !appUser) {
      setFeedback(t("We could not confirm your account. Please refresh the page and try again."));
      setFeedbackType("error");
      return;
    }

    if (!isConfirmed) {
      setFeedback(t("Please confirm that you want to request permanent account deletion."));
      setFeedbackType("error");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setFeedback(t("Account requests are not configured yet."));
      setFeedbackType("error");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const { error } = await supabase.rpc("submit_account_deletion_request", {
        request_details: details.trim() || null,
      });

      if (error) {
        throw error;
      }

      setFeedback(t("Your account deletion request has been submitted. Your account will remain active until the request is processed."));
      setFeedbackType("success");
      setIsOpen(false);
      setIsSubmitted(true);
      setIsConfirmed(false);
      setDetails("");
      trackEvent("account_deletion_request_submitted", { source_page: "account_dashboard" });
    } catch {
      setFeedback(t("We could not submit your request right now."));
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="account-delete-action">
        {!isSubmitted ? (
          <button type="button" className="button button-secondary account-delete-button" onClick={handleOpen}>
            {t("Request account deletion")}
          </button>
        ) : null}
        {feedback ? (
          <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`} role="status">
            {feedback}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form className="marketplace-inline-form account-delete-form" onSubmit={handleSubmit}>
      <p>
        {t("This sends a request to permanently delete your Elevare account and associated profile information. It does not delete your account immediately.")}
      </p>

      <label className="field">
        <span className="field-label">{t("Additional details (optional)")}</span>
        <textarea
          rows={3}
          maxLength={1000}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={t("Share any information that may help us process your request.")}
        />
      </label>

      <label className="checkbox-row professional-attestation">
        <input
          type="checkbox"
          checked={isConfirmed}
          onChange={(event) => setIsConfirmed(event.target.checked)}
        />
        <span>{t("I understand that I am requesting permanent deletion of my Elevare account.")}</span>
      </label>

      <div className="form-actions">
        <div className="button-row">
          <button
            type="submit"
            className="button button-secondary account-delete-button"
            disabled={isSubmitting || !isConfirmed}
          >
            {isSubmitting ? t("Submitting request...") : t("Submit deletion request")}
          </button>
          <button type="button" className="button button-secondary" onClick={handleCancel} disabled={isSubmitting}>
            {t("Cancel")}
          </button>
        </div>

        {feedback ? (
          <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`} role="status">
            {feedback}
          </div>
        ) : null}
      </div>
    </form>
  );
}
