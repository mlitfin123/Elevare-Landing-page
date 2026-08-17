"use client";

import { type FormEvent, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { getMarketplaceAppUserByAuthId, parseGoalTags } from "@/lib/marketplace-account";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import type { ProfessionalProfileRecord } from "@/lib/marketplace-types";

type InquiryFormProps = {
  professional: ProfessionalProfileRecord;
};

export function InquiryForm({ professional }: InquiryFormProps) {
  const pathname = usePathname();
  const { user, isConfigured } = useSupabaseSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientFirstName, setClientFirstName] = useState("");
  const [serviceInterest, setServiceInterest] = useState("");
  const [goal, setGoal] = useState("");
  const [preferredServiceMode, setPreferredServiceMode] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  const interestOptions = useMemo(
    () => [
      ...professional.services.map((service) => service.name),
      ...professional.categories.map((category) => category.label),
    ],
    [professional.categories, professional.services],
  );

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
    trackEvent("consultation_started", {
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

    if (!clientFirstName.trim() || !goal.trim()) {
      setFeedback("Please add your first name and a short goal before sending the request.");
      setFeedbackType("error");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const appUser = await getMarketplaceAppUserByAuthId(supabase, user.id);

      if (!appUser) {
        throw new Error("We couldn't find your marketplace user record yet.");
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
              goals: parseGoalTags(goal),
              preferred_modality: preferredServiceMode || null,
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

      const matchedCategory =
        professional.categories.find((category) => category.label === serviceInterest)
        ?? professional.categories.find((category) => category.slug === serviceInterest)
        ?? null;

      const { error } = await supabase.from("trainer_profile_inquiries").insert({
        trainer_profile_id: professional.id,
        client_user_id: appUser.id,
        client_profile_id: clientProfileId,
        service_category_id: matchedCategory?.id ?? null,
        client_first_name: clientFirstName.trim(),
        service_interest: serviceInterest.trim() || null,
        goal: goal.trim(),
        preferred_service_mode: preferredServiceMode || null,
        message: message.trim() || null,
        metadata: {
          source: "website_marketplace",
          pathname,
          professional_slug: professional.profileSlug,
        },
      });

      if (error) {
        throw error;
      }

      setFeedback("Request sent. They can review it in their Elevare account.");
      setFeedbackType("success");
      setGoal("");
      setMessage("");
      setServiceInterest("");
      setPreferredServiceMode("");
      trackEvent("professional_inquiry_submitted", {
        professional_slug: professional.profileSlug,
        professional_name: professional.displayName,
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "We could not send your request right now.");
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="marketplace-action-stack">
      <button type="button" className="button button-primary" onClick={handleStart}>
        Request consultation
      </button>

      {isOpen ? (
        <form className="marketplace-inline-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">First name</span>
              <input
                type="text"
                value={clientFirstName}
                onChange={(event) => setClientFirstName(event.target.value)}
                placeholder="Your first name"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Service or category of interest</span>
              <select value={serviceInterest} onChange={(event) => setServiceInterest(event.target.value)}>
                <option value="">Select one</option>
                {interestOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-full">
              <span className="field-label">What are you looking for help with?</span>
              <input
                type="text"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Fat loss, prep support, mobility work, running structure..."
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Preferred service mode</span>
              <select
                value={preferredServiceMode}
                onChange={(event) => setPreferredServiceMode(event.target.value)}
              >
                <option value="">Select one</option>
                <option value="in_person">In person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>

            <label className="field field-full">
              <span className="field-label">Optional message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Share any scheduling constraints, experience level, or context that would help."
                rows={4}
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send request"}
            </button>
            {feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div> : null}
          </div>
        </form>
      ) : null}

      {!isOpen && feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div> : null}
    </div>
  );
}
