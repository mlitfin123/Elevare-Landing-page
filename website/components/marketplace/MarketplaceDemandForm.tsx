"use client";

import { type FormEvent, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { getMarketplaceAppUserByAuthId, parseBudgetInput } from "@/lib/marketplace-account";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import type { ProfessionalCategoryRecord } from "@/lib/marketplace-types";
import type { ProfessionalDirectoryFilters } from "@/lib/marketplace-helpers";

type MarketplaceDemandFormProps = {
  categories: ProfessionalCategoryRecord[];
  filters: ProfessionalDirectoryFilters;
  fixedCategorySlug?: string;
  sourcePage: string;
  exactResultCount: number;
  fallbackResultCount: number;
};

function normalizeSearchField(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function MarketplaceDemandForm({
  categories,
  filters,
  fixedCategorySlug,
  sourcePage,
  exactResultCount,
  fallbackResultCount,
}: MarketplaceDemandFormProps) {
  const pathname = usePathname();
  const { user, isConfigured } = useSupabaseSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState(fixedCategorySlug ?? (filters.category !== "all" ? filters.category : ""));
  const [specialty, setSpecialty] = useState(filters.specialty !== "all" ? filters.specialty : "");
  const [locationLabel, setLocationLabel] = useState(filters.location !== "all" ? filters.location : "");
  const [serviceMode, setServiceMode] = useState(filters.serviceMode !== "all" ? filters.serviceMode : "");
  const [budget, setBudget] = useState("");
  const [requestEmail, setRequestEmail] = useState(user?.email ?? "");
  const [searchNotes, setSearchNotes] = useState(filters.query.trim());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  const categoryOptions = useMemo(
    () => [...categories].sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)),
    [categories],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = getSupabaseBrowserClient();

    if (!isConfigured || !supabase) {
      setFeedback("Marketplace demand capture is not configured yet.");
      setFeedbackType("error");
      return;
    }

    const normalizedEmail = normalizeSearchField(user?.email ?? requestEmail);
    const normalizedCategory = normalizeSearchField(fixedCategorySlug ?? category);
    const normalizedSpecialty = normalizeSearchField(specialty);
    const normalizedLocation = normalizeSearchField(locationLabel);
    const normalizedServiceMode = normalizeSearchField(serviceMode);
    const normalizedSearchNotes = normalizeSearchField(searchNotes);

    if (!normalizedEmail) {
      setFeedback("Please add an email so we can follow up when a better match is available.");
      setFeedbackType("error");
      return;
    }

    if (!normalizedCategory && !normalizedSpecialty && !normalizedSearchNotes) {
      setFeedback("Add at least a category, specialty, or short note so we know what to look for.");
      setFeedbackType("error");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      let appUserId: string | null = null;

      if (user) {
        const appUser = await getMarketplaceAppUserByAuthId(supabase, user.id).catch(() => null);
        appUserId = appUser?.id ?? null;
      }

      const [cityPart, ...stateParts] = (normalizedLocation ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      const { budgetMinCents, budgetMaxCents } = parseBudgetInput(budget);

      const { error } = await supabase.from("marketplace_search_demand").insert({
        user_id: appUserId,
        request_email: normalizedEmail,
        category_slug: normalizedCategory,
        specialty: normalizedSpecialty,
        location_label: normalizedLocation,
        city: cityPart || null,
        state: stateParts.length > 0 ? stateParts.join(", ") : null,
        service_mode: normalizedServiceMode,
        budget_min_cents: budgetMinCents,
        budget_max_cents: budgetMaxCents,
        query_text: normalizedSearchNotes,
        filters_json: {
          source_page: sourcePage,
          pathname,
          category: fixedCategorySlug ?? filters.category,
          specialty: filters.specialty,
          location: filters.location,
          serviceMode: filters.serviceMode,
          query: filters.query,
        },
        exact_result_count: exactResultCount,
        fallback_result_count: fallbackResultCount,
        source: "website_marketplace",
      });

      if (error) {
        throw error;
      }

      setFeedback("Thanks. We'll use this search to improve marketplace coverage and follow up when it makes sense.");
      setFeedbackType("success");
      setBudget("");
      trackEvent("demand_request_submitted", {
        source_page: sourcePage,
        category: normalizedCategory ?? "unspecified",
        service_mode: normalizedServiceMode ?? "unspecified",
        exact_result_count: exactResultCount,
        fallback_result_count: fallbackResultCount,
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "We could not save your request right now.");
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="marketplace-action-stack">
      <button type="button" className="button button-primary" onClick={() => setIsOpen((current) => !current)}>
        {isOpen ? "Hide Request Form" : "Tell Us What You Need"}
      </button>
      <p className="form-note">
        We reuse your current filters so you do not have to start over just to tell us what is missing.
      </p>

      {isOpen ? (
        <form className="marketplace-inline-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            {!fixedCategorySlug ? (
              <label className="field">
                <span className="field-label">Category</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">Not sure yet</option>
                  {categoryOptions.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="field">
              <span className="field-label">Preferred service mode</span>
              <select value={serviceMode} onChange={(event) => setServiceMode(event.target.value)}>
                <option value="">Flexible</option>
                <option value="in_person">In person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">Specialty</span>
              <input
                type="text"
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                placeholder="Prep support, fat loss, mobility..."
              />
            </label>

            <label className="field">
              <span className="field-label">Location</span>
              <input
                type="text"
                value={locationLabel}
                onChange={(event) => setLocationLabel(event.target.value)}
                placeholder="Miami, FL or online"
              />
            </label>

            <label className="field">
              <span className="field-label">Approximate budget</span>
              <input
                type="text"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="$75/session or $250/month"
              />
            </label>

            {!user?.email ? (
              <label className="field">
                <span className="field-label">Email</span>
                <input
                  type="email"
                  value={requestEmail}
                  onChange={(event) => setRequestEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
            ) : null}

            <label className="field field-full">
              <span className="field-label">Anything else we should know?</span>
              <textarea
                value={searchNotes}
                onChange={(event) => setSearchNotes(event.target.value)}
                placeholder="Share the kind of support, schedule, or coaching style you hoped to find."
                rows={4}
              />
            </label>
            <div className="form-note field-full">
              Share only what is needed for this search. Do not include medical records, account passwords, payment
              card details, or other highly sensitive information.
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Submit Search Request"}
            </button>
            {feedback ? (
              <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>
                {feedback}
              </div>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
