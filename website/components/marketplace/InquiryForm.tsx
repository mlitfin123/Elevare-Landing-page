"use client";

import { type FormEvent, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import {
  CLIENT_TIMELINE_OPTIONS,
  normalizeClientGoalTags,
  normalizeClientTimeline,
} from "@/lib/client-preferences";
import { getMarketplaceAppUserByAuthId } from "@/lib/marketplace-account";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import type { ProfessionalProfileRecord } from "@/lib/marketplace-types";
import { localeFromPathname } from "@/lib/i18n/config";
import {
  localizeMarketplaceCategory,
  localizeServiceMode,
  marketplaceText,
} from "@/lib/i18n/marketplace-content";

type InquiryFormProps = {
  professional: ProfessionalProfileRecord;
};

function isDatabaseUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function InquiryForm({ professional }: InquiryFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const { user, isConfigured } = useSupabaseSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientFirstName, setClientFirstName] = useState("");
  const [serviceInterest, setServiceInterest] = useState("");
  const [goal, setGoal] = useState("");
  const [preferredServiceMode, setPreferredServiceMode] = useState("");
  const [startTimeline, setStartTimeline] = useState("");
  const [message, setMessage] = useState("");
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const requestKeyRef = useRef<string | null>(null);
  const canRequest = professional.clientAcceptanceStatus === "accepting"
    || professional.clientAcceptanceStatus === "waitlist";
  const selectedServiceId = serviceInterest.startsWith("service:")
    ? serviceInterest.slice("service:".length)
    : null;
  const selectedCategoryId = serviceInterest.startsWith("category:")
    ? serviceInterest.slice("category:".length)
    : null;
  const selectedService = professional.services.find((service) => service.id === selectedServiceId) ?? null;
  const selectedCategory = professional.categories.find((category) => category.id === selectedCategoryId) ?? null;

  const interestOptions = [
    ...professional.services.map((service) => ({ value: `service:${service.id}`, label: service.name })),
    ...professional.categories.map((category) => ({
      value: `category:${category.id}`,
      label: localizeMarketplaceCategory(category, locale).label,
    })),
  ];

  async function handleStart() {
    if (!canRequest) {
      setFeedback(t("This professional is not accepting consultation requests right now."));
      setFeedbackType("error");
      return;
    }
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
    trackEvent("consultation_started", {
      source_page: "professional_profile",
      accepting_status: professional.clientAcceptanceStatus,
    });

    if (hasLoadedPreferences) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setIsLoadingPreferences(true);

    try {
      const appUser = await getMarketplaceAppUserByAuthId(supabase, user.id);
      if (!appUser) return;

      const { data } = await supabase
        .from("client_profiles")
        .select("goal_tags,goals,preferred_modality,start_timeline,preference_notes")
        .eq("user_id", appUser.id)
        .maybeSingle();

      setClientFirstName((current) => current || appUser.first_name || "");

      if (data) {
        const savedGoals = normalizeClientGoalTags(data.goal_tags, data.goals);
        setGoal((current) => current || savedGoals.join(", "));
        setPreferredServiceMode((current) => {
          if (current) return current;
          if (data.preferred_modality === "both") return "hybrid";
          return data.preferred_modality === "in_person" || data.preferred_modality === "online"
            ? data.preferred_modality
            : "";
        });
        setStartTimeline((current) => current || normalizeClientTimeline(data.start_timeline));
        setMessage((current) => current || data.preference_notes || "");
      }
    } catch {
      // Prefill is a convenience; the request form remains usable if it cannot load.
    } finally {
      setHasLoadedPreferences(true);
      setIsLoadingPreferences(false);
    }
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

    if (!clientFirstName.trim() || !goal.trim()) {
      setFeedback(t("Please add your first name and a short goal before sending the request."));
      setFeedbackType("error");
      return;
    }
    if (selectedService?.consultationType === "not_offered") {
      setFeedback(t("This service does not currently offer a consultation request."));
      setFeedbackType("error");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const appUser = await getMarketplaceAppUserByAuthId(supabase, user.id);

      if (!appUser) {
        throw new Error(t("We couldn't find your marketplace user record yet."));
      }

      await supabase.from("users").update({ first_name: clientFirstName.trim() }).eq("id", appUser.id);

      let clientProfileId: string | null = null;
      const existingClientProfileResult = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", appUser.id)
        .maybeSingle();

      clientProfileId = existingClientProfileResult.data?.id ?? null;

      try {
        const { data: nextClientProfile, error: clientProfileError } = await supabase
          .from("client_profiles")
          .upsert(
            {
              user_id: appUser.id,
            },
            {
              onConflict: "user_id",
            },
          )
          .select("id")
          .maybeSingle();

        if (!clientProfileError) {
          clientProfileId = nextClientProfile?.id ?? clientProfileId;
        }
      } catch {
        clientProfileId = existingClientProfileResult.data?.id ?? null;
      }

      requestKeyRef.current ??= crypto.randomUUID();

      const { data: insertedInquiry, error } = await supabase.from("trainer_profile_inquiries").insert({
        trainer_profile_id: professional.id,
        client_user_id: appUser.id,
        client_profile_id: clientProfileId,
        service_category_id: isDatabaseUuid(selectedCategory?.id) ? selectedCategory?.id : null,
        service_offering_id: isDatabaseUuid(selectedService?.id) ? selectedService?.id : null,
        request_key: requestKeyRef.current,
        client_first_name: clientFirstName.trim(),
        service_interest: selectedService?.name ?? selectedCategory?.label ?? null,
        goal: goal.trim(),
        preferred_service_mode: preferredServiceMode || null,
        start_timeline: startTimeline || null,
        message: message.trim() || null,
        metadata: {
          source: "website_marketplace",
          pathname,
          start_timeline: startTimeline || null,
        },
      }).select("id").maybeSingle();

      if (error && error.code !== "23505") {
        throw error;
      }

      if (!error && insertedInquiry?.id) {
        // Notification delivery is best-effort; the saved request remains successful if email is unavailable.
        await supabase.functions.invoke("professional-inquiry-email", {
          body: { inquiry_id: insertedInquiry.id },
        }).catch(() => null);
      }

      setFeedback(t("Request sent. They can review it in their Elevare account."));
      setFeedbackType("success");
      setGoal("");
      setMessage("");
      setServiceInterest("");
      setPreferredServiceMode("");
      setStartTimeline("");
      requestKeyRef.current = null;
      trackEvent("professional_inquiry_submitted", {
        source_page: "professional_profile",
        accepting_status: professional.clientAcceptanceStatus,
        service_selected: Boolean(selectedService),
      });
    } catch {
      setFeedback(t("We could not send your request right now."));
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="marketplace-action-stack">
      <button type="button" className="button button-primary" onClick={handleStart} disabled={!canRequest}>
        {t(professional.clientAcceptanceStatus === "waitlist" ? "Join consultation waitlist" : canRequest ? "Request consultation" : "Consultations unavailable")}
      </button>

      {isOpen ? (
        <form className="marketplace-inline-form" onSubmit={handleSubmit}>
          {isLoadingPreferences ? <div className="form-note">{t("Loading your saved preferences...")}</div> : null}
          <div className="field-grid">
            <label className="field">
              <span className="field-label">{t("First name")}</span>
              <input
                type="text"
                value={clientFirstName}
                onChange={(event) => setClientFirstName(event.target.value)}
                placeholder={t("Your first name")}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">{t("Service or category of interest")}</span>
              <select value={serviceInterest} onChange={(event) => setServiceInterest(event.target.value)}>
                <option value="">{t("Select one")}</option>
                {interestOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {selectedService ? <span className="field-help">{t(selectedService.consultationType === "free"
                ? "This professional lists an initial consultation as free. Confirm details directly before proceeding."
                : selectedService.consultationType === "paid"
                  ? "This professional lists the consultation as paid. Elevare does not collect this payment; confirm price and terms directly."
                  : selectedService.consultationType === "not_offered"
                    ? "This service does not currently offer a consultation request."
                    : "Consultation pricing is not specified. Ask the professional for details.")}</span> : null}
            </label>

            <label className="field field-full">
              <span className="field-label">{t("What are you looking for help with?")}</span>
              <input
                type="text"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder={t("Fat loss, prep support, mobility work, running structure...")}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">{t("Preferred service mode")}</span>
              <select
                value={preferredServiceMode}
                onChange={(event) => setPreferredServiceMode(event.target.value)}
              >
                <option value="">{t("Select one")}</option>
                <option value="in_person">{localizeServiceMode("in_person", locale)}</option>
                <option value="online">{localizeServiceMode("online", locale)}</option>
                <option value="hybrid">{t("Either")}</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">{t("When would you like to start?")}</span>
              <select value={startTimeline} onChange={(event) => setStartTimeline(event.target.value)}>
                <option value="">{t("No preference")}</option>
                {CLIENT_TIMELINE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.label)}</option>
                ))}
              </select>
            </label>

            <label className="field field-full">
              <span className="field-label">{t("Optional message")}</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("Share any scheduling constraints, experience level, or context that would help.")}
                rows={4}
              />
            </label>
            <div className="form-note field-full">
              {t("This sends your name, selected service, goal, service mode, timeline, and message to the independent professional. They can review it in their Elevare account. Sending a request does not create a booking, paid contract, or guaranteed appointment. Share only what is needed and do not include medical records, passwords, payment card details, or other highly sensitive information.")}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              {isSubmitting ? t("Sending...") : t("Send request")}
            </button>
            {feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`} role="status" aria-live="polite">{feedback}</div> : null}
          </div>
        </form>
      ) : null}

      {!isOpen && feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`} role="status" aria-live="polite">{feedback}</div> : null}
    </div>
  );
}
