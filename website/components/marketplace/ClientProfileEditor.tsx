"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getMarketplaceAppUserByAuthId, parseBudgetInput, parseGoalTags } from "@/lib/marketplace-account";
import { MARKETPLACE_TAXONOMY_CATEGORIES } from "@/lib/marketplace-taxonomy";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ClientProfileFormState = {
  firstName: string;
  city: string;
  state: string;
  goals: string;
  preferredServiceMode: string;
  experienceLevel: string;
  approximateBudget: string;
  preferredRadius: string;
  interestedCategories: string[];
};

const initialFormState: ClientProfileFormState = {
  firstName: "",
  city: "",
  state: "",
  goals: "",
  preferredServiceMode: "",
  experienceLevel: "",
  approximateBudget: "",
  preferredRadius: "",
  interestedCategories: [],
};

export function ClientProfileEditor() {
  const { user, isLoading, isConfigured } = useSupabaseSession();
  const [form, setForm] = useState<ClientProfileFormState>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      return;
    }

    getMarketplaceAppUserByAuthId(supabase, user.id)
      .then(async (appUser) => {
        if (!appUser) {
          return;
        }

        const { data, error } = await supabase
          .from("client_profiles")
          .select("*")
          .eq("user_id", appUser.id)
          .maybeSingle();

        if (error || !data) {
          setForm((current) => ({
            ...current,
            firstName: appUser.first_name ?? current.firstName,
          }));
          return;
        }

        const budgetMin = typeof data.budget_min === "number" ? data.budget_min / 100 : null;
        const budgetMax = typeof data.budget_max === "number" ? data.budget_max / 100 : null;
        const goals = Array.isArray(data.goals) ? data.goals.join(", ") : "";

        setForm({
          firstName: appUser.first_name ?? "",
          city: data.location_city ?? "",
          state: data.location_state ?? "",
          goals,
          preferredServiceMode: data.preferred_modality ?? "",
          experienceLevel: data.fitness_level ?? "",
          approximateBudget:
            budgetMin != null && budgetMax != null
              ? `$${budgetMin}-$${budgetMax}`
              : budgetMin != null
                ? `$${budgetMin}`
                : "",
          preferredRadius: data.preferred_radius_miles ? String(data.preferred_radius_miles) : "",
          interestedCategories: Array.isArray(data.interested_service_category_slugs)
            ? data.interested_service_category_slugs.filter((entry: unknown): entry is string => typeof entry === "string")
            : [],
        });
      })
      .catch(() => {
        setFeedback("We could not load your client profile right now.");
        setFeedbackType("error");
      });
  }, [user]);

  function toggleCategory(slug: string) {
    setForm((current) => ({
      ...current,
      interestedCategories: current.interestedCategories.includes(slug)
        ? current.interestedCategories.filter((entry) => entry !== slug)
        : [...current.interestedCategories, slug],
    }));
  }

  async function handleSave() {
    if (!user) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setFeedback("Marketplace auth is not configured yet.");
      setFeedbackType("error");
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const appUser = await getMarketplaceAppUserByAuthId(supabase, user.id);

      if (!appUser) {
        throw new Error("We couldn't find your marketplace user record yet.");
      }

      await supabase
        .from("users")
        .update({ first_name: form.firstName.trim() || null })
        .eq("id", appUser.id);

      const { budgetMinCents, budgetMaxCents } = parseBudgetInput(form.approximateBudget);
      const normalizedFitnessLevel = form.experienceLevel.trim().toLowerCase();
      const fitnessLevel =
        ["beginner", "intermediate", "advanced"].includes(normalizedFitnessLevel)
          ? normalizedFitnessLevel
          : null;

      const { error } = await supabase.from("client_profiles").upsert(
        {
          user_id: appUser.id,
          location_city: form.city.trim() || null,
          location_state: form.state.trim() || null,
          goals: parseGoalTags(form.goals),
          interested_service_category_slugs: form.interestedCategories,
          preferred_modality: form.preferredServiceMode || null,
          fitness_level: fitnessLevel,
          budget_min: budgetMinCents,
          budget_max: budgetMaxCents,
          preferred_radius_miles: form.preferredRadius ? Number(form.preferredRadius) : null,
        },
        { onConflict: "user_id" },
      );

      if (error) {
        throw error;
      }

      setFeedback("Private client profile saved.");
      setFeedbackType("success");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "We could not save your client profile.");
      setFeedbackType("error");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isConfigured) {
    return (
      <article className="callout">
        <span className="meta-pill">Configuration needed</span>
        <h2>Marketplace auth is not configured yet.</h2>
        <p>Add the second Supabase public URL and anon key to enable client accounts.</p>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className="callout">
        <span className="meta-pill">Loading</span>
        <h2>Loading your client profile.</h2>
        <p>One moment while we check your marketplace account.</p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="callout">
        <span className="meta-pill">Sign in required</span>
        <h2>Sign in to manage your client profile.</h2>
        <p>Browsing stays public, but private client preferences live inside your account.</p>
        <div className="button-row">
          <Link className="button button-primary" href="/sign-in/?redirect=/account/profile/">
            Sign in
          </Link>
        </div>
      </article>
    );
  }

  return (
    <section className="section">
      <article className="panel">
        <div className="section-head tool-form-head">
          <div className="eyebrow">Private client profile</div>
          <h2 className="section-title">Keep your marketplace preferences private.</h2>
          <p className="section-copy">
            These details help you save better-fit profiles and send consultation requests with more context.
          </p>
        </div>

        <div className="tool-form-grid marketplace-editor-grid">
          <label className="field">
            <span className="field-label">First name</span>
            <input
              type="text"
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              placeholder="Your first name"
            />
          </label>

          <label className="field">
            <span className="field-label">City</span>
            <input
              type="text"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              placeholder="Miami"
            />
          </label>

          <label className="field">
            <span className="field-label">State</span>
            <input
              type="text"
              value={form.state}
              onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
              placeholder="FL"
            />
          </label>

          <label className="field">
            <span className="field-label">Preferred service mode</span>
            <select
              value={form.preferredServiceMode}
              onChange={(event) =>
                setForm((current) => ({ ...current, preferredServiceMode: event.target.value }))
              }
            >
              <option value="">Select one</option>
              <option value="in_person">In person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Experience level</span>
            <input
              type="text"
              value={form.experienceLevel}
              onChange={(event) => setForm((current) => ({ ...current, experienceLevel: event.target.value }))}
              placeholder="Beginner, intermediate, or advanced"
            />
          </label>

          <label className="field">
            <span className="field-label">Approximate budget</span>
            <input
              type="text"
              value={form.approximateBudget}
              onChange={(event) => setForm((current) => ({ ...current, approximateBudget: event.target.value }))}
              placeholder="$100-$250"
            />
          </label>

          <label className="field">
            <span className="field-label">Preferred radius in miles</span>
            <input
              type="number"
              min="0"
              value={form.preferredRadius}
              onChange={(event) => setForm((current) => ({ ...current, preferredRadius: event.target.value }))}
              placeholder="25"
            />
          </label>

          <label className="field field-full">
            <span className="field-label">What are you looking for help with?</span>
            <textarea
              rows={4}
              value={form.goals}
              onChange={(event) => setForm((current) => ({ ...current, goals: event.target.value }))}
              placeholder="Fat loss, accountability, competition prep, mobility, nutrition structure..."
            />
          </label>
        </div>

        <div className="section-head section-head-compact">
          <div className="eyebrow">Interested categories</div>
          <h3 className="section-title section-title-compact">Choose any that fit what you want.</h3>
          <p className="section-copy section-copy-compact">
            Category interests stay separate from your client goals so your requests are easier to interpret later.
          </p>
        </div>

        <div className="selectable-grid">
          {MARKETPLACE_TAXONOMY_CATEGORIES.map((category) => {
            const isActive = form.interestedCategories.includes(category.stableId);

            return (
              <button
                key={category.stableId}
                type="button"
                className={`selectable-card${isActive ? " is-active" : ""}`}
                onClick={() => toggleCategory(category.stableId)}
              >
                <strong>{category.label}</strong>
                <span>{category.shortDescription}</span>
              </button>
            );
          })}
        </div>

        <div className="form-actions">
          <button type="button" className="button button-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save client profile"}
          </button>
          {feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div> : null}
        </div>
      </article>
    </section>
  );
}
