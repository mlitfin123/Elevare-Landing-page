"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import type { ShellMessages } from "@/lib/i18n/shell-messages";
import {
  isTranslationFeedbackAvailable,
  sanitizeTranslationFeedbackPath,
  TRANSLATION_FEEDBACK_CATEGORIES,
  TRANSLATION_FEEDBACK_LIMITS,
  type TranslationFeedbackCategory,
} from "@/lib/translation-feedback";

type TranslationFeedbackProps = {
  locale: Locale;
  pathname: string;
  messages: ShellMessages["translationFeedback"];
};

function createSubmissionId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function TranslationFeedback({ locale, pathname, messages }: TranslationFeedbackProps) {
  const localizedRoutesEnabled = process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES === "true";
  const sanitizedPublicPath = sanitizeTranslationFeedbackPath(pathname, locale);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const submissionInFlight = useRef(false);
  const submissionId = useRef<string | null>(null);
  const [category, setCategory] = useState<TranslationFeedbackCategory | "">("");
  const [description, setDescription] = useState("");
  const [suggestedCorrection, setSuggestedCorrection] = useState("");
  const [optionalContactEmail, setOptionalContactEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const isAvailable = isTranslationFeedbackAvailable({
    locale,
    pathname,
    localizedRoutesEnabled,
  });

  useEffect(() => {
    if (status !== "idle") statusRef.current?.focus();
  }, [status]);

  if (!isAvailable || !sanitizedPublicPath) return null;
  const safePublicPath = sanitizedPublicPath;

  function openDialog() {
    setStatus("idle");
    dialogRef.current?.showModal();
    requestAnimationFrame(() => categoryRef.current?.focus());
    trackEvent("translation_feedback_opened", {
      feedback_locale: locale,
      public_route: safePublicPath,
    });
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category || submissionInFlight.current) return;

    submissionInFlight.current = true;
    setIsSubmitting(true);
    setStatus("idle");
    submissionId.current ??= createSubmissionId();

    try {
      const response = await fetch("/api/translation-feedback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          sanitizedPublicPath: safePublicPath,
          category,
          description,
          suggestedCorrection,
          optionalContactEmail,
          clientSubmissionId: submissionId.current,
          website,
        }),
      });
      if (!response.ok) throw new Error("translation_feedback_failed");

      setStatus("success");
      setDescription("");
      setSuggestedCorrection("");
      setOptionalContactEmail("");
      setCategory("");
      submissionId.current = null;
      trackEvent("translation_feedback_submitted", {
        feedback_locale: locale,
        public_route: safePublicPath,
        feedback_category: category,
      });
    } catch {
      setStatus("error");
      trackEvent("translation_feedback_failed", {
        feedback_locale: locale,
        public_route: safePublicPath,
        feedback_category: category,
      });
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button ref={triggerRef} type="button" className="translation-feedback-link" onClick={openDialog}>
        {messages.link}
      </button>
      <dialog
        ref={dialogRef}
        className="translation-feedback-dialog"
        aria-labelledby="translation-feedback-title"
        onClose={() => triggerRef.current?.focus()}
      >
        <div className="translation-feedback-dialog-header">
          <div>
            <h2 id="translation-feedback-title">{messages.dialogTitle}</h2>
            <p>{messages.intro}</p>
          </div>
          <button type="button" className="translation-feedback-close" onClick={closeDialog} aria-label={messages.close}>
            &times;
          </button>
        </div>

        {status === "success" ? (
          <div className="translation-feedback-success">
            <p ref={statusRef} tabIndex={-1} role="status">{messages.success}</p>
            <button type="button" className="button button-primary" onClick={closeDialog}>{messages.close}</button>
          </div>
        ) : (
          <form className="translation-feedback-form" onSubmit={submitFeedback}>
            <p className="translation-feedback-page"><strong>{messages.pageLabel}:</strong> {safePublicPath}</p>

            <label className="field">
              <span>{messages.categoryLabel}</span>
              <select
                ref={categoryRef}
                required
                value={category}
                onChange={(event) => setCategory(event.target.value as TranslationFeedbackCategory | "")}
              >
                <option value="">{messages.categoryPlaceholder}</option>
                {TRANSLATION_FEEDBACK_CATEGORIES.map((value) => (
                  <option key={value} value={value}>{messages.categories[value]}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{messages.descriptionLabel} <small>({messages.optional})</small></span>
              <textarea
                value={description}
                maxLength={TRANSLATION_FEEDBACK_LIMITS.description}
                rows={3}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <label className="field">
              <span>{messages.correctionLabel} <small>({messages.optional})</small></span>
              <textarea
                value={suggestedCorrection}
                maxLength={TRANSLATION_FEEDBACK_LIMITS.suggestedCorrection}
                rows={3}
                onChange={(event) => setSuggestedCorrection(event.target.value)}
              />
            </label>

            <label className="field">
              <span>{messages.contactEmailLabel} <small>({messages.optional})</small></span>
              <input
                type="email"
                autoComplete="email"
                value={optionalContactEmail}
                maxLength={TRANSLATION_FEEDBACK_LIMITS.contactEmail}
                onChange={(event) => setOptionalContactEmail(event.target.value)}
              />
            </label>

            <label className="translation-feedback-honeypot" aria-hidden="true">
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                maxLength={TRANSLATION_FEEDBACK_LIMITS.honeypot}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </label>

            <p className="translation-feedback-warning">{messages.sensitiveWarning}</p>
            <p className="fine-print">
              {messages.privacyUse}{" "}
              {/* Static legal documents intentionally use full browser navigation. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/privacy-policy/" hrefLang="en">Privacy Policy (English)</a>.
            </p>

            {status === "error" ? (
              <p ref={statusRef} tabIndex={-1} className="form-feedback is-error" role="alert">{messages.error}</p>
            ) : (
              <p className="form-feedback" aria-live="polite">{isSubmitting ? messages.submitting : ""}</p>
            )}

            <div className="translation-feedback-actions">
              <button type="submit" className="button button-primary" disabled={isSubmitting}>
                {isSubmitting ? messages.submitting : messages.submit}
              </button>
              <button type="button" className="button button-secondary" onClick={closeDialog} disabled={isSubmitting}>
                {messages.cancel}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
