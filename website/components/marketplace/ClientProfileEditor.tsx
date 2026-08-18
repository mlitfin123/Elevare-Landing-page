"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import {
  CLIENT_BUDGET_BASIS_OPTIONS,
  CLIENT_BUDGET_RANGE_OPTIONS,
  CLIENT_CATEGORY_DESCRIPTIONS,
  CLIENT_EXPERIENCE_OPTIONS,
  CLIENT_GOAL_OPTIONS,
  CLIENT_RADIUS_OPTIONS,
  CLIENT_SERVICE_MODE_OPTIONS,
  CLIENT_SUPPORT_FREQUENCY_OPTIONS,
  CLIENT_TIMELINE_OPTIONS,
  getBudgetCents,
  normalizeClientBudgetRange,
  normalizeClientGoalTags,
  normalizeClientTimeline,
  toClientServiceMode,
  toDatabaseServiceMode,
} from "@/lib/client-preferences";
import { getMarketplaceAppUserByAuthId } from "@/lib/marketplace-account";
import { MARKETPLACE_TAXONOMY_CATEGORIES } from "@/lib/marketplace-taxonomy";
import { US_STATE_OPTIONS, normalizeStateValue } from "@/lib/professional-profile";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ClientProfileFormState = {
  firstName: string;
  city: string;
  state: string;
  goals: string[];
  interestedCategories: string[];
  preferredServiceMode: string;
  preferredRadius: string;
  startTimeline: string;
  experienceLevel: string;
  budgetRange: string;
  budgetBasis: string;
  supportFrequency: string;
  notes: string;
  savedBudgetRange: string;
  savedBudgetMinCents: number | null;
  savedBudgetMaxCents: number | null;
  savedBudgetLabel: string;
};

const initialFormState: ClientProfileFormState = {
  firstName: "",
  city: "",
  state: "",
  goals: [],
  interestedCategories: [],
  preferredServiceMode: "",
  preferredRadius: "",
  startTimeline: "",
  experienceLevel: "",
  budgetRange: "",
  budgetBasis: "",
  supportFrequency: "",
  notes: "",
  savedBudgetRange: "",
  savedBudgetMinCents: null,
  savedBudgetMaxCents: null,
  savedBudgetLabel: "",
};

function toggleSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function buildSavedBudgetLabel(
  range: unknown,
  minCents: unknown,
  maxCents: unknown,
) {
  const legacyLabels: Record<string, string> = {
    "50_70": "$50-$70",
    "70_90": "$70-$90",
    "90_120": "$90-$120",
    "120_plus": "$120+",
  };

  if (typeof range === "string" && legacyLabels[range]) return legacyLabels[range];

  const min = typeof minCents === "number" ? minCents / 100 : null;
  const max = typeof maxCents === "number" ? maxCents / 100 : null;
  if (min != null && max != null) return `$${min}-$${max}`;
  if (min != null) return `$${min}+`;
  if (max != null) return `Up to $${max}`;
  return "Saved budget";
}

export function ClientProfileEditor() {
  const { user, isLoading, isConfigured } = useSupabaseSession();
  const [form, setForm] = useState<ClientProfileFormState>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) return;

    let isMounted = true;

    getMarketplaceAppUserByAuthId(supabase, user.id)
      .then(async (appUser) => {
        if (!appUser) return;

        const { data, error } = await supabase
          .from("client_profiles")
          .select("*")
          .eq("user_id", appUser.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error || !data) {
          setForm((current) => ({ ...current, firstName: appUser.first_name ?? current.firstName }));
          return;
        }

        const hasCurrentBudgetRange = CLIENT_BUDGET_RANGE_OPTIONS.some(
          (option) => option.value === data.budget_range,
        );
        const hasSavedLegacyBudget = Boolean(
          !hasCurrentBudgetRange
            && (
              data.budget_range
              || typeof data.budget_min === "number"
              || typeof data.budget_max === "number"
            ),
        );

        setForm({
          firstName: appUser.first_name ?? "",
          city: data.location_city ?? "",
          state: normalizeStateValue(data.location_state),
          goals: normalizeClientGoalTags(data.goal_tags, data.goals),
          interestedCategories: Array.isArray(data.interested_service_category_slugs)
            ? data.interested_service_category_slugs.filter(
                (entry: unknown): entry is string => typeof entry === "string",
              )
            : [],
          preferredServiceMode: toClientServiceMode(data.preferred_modality),
          preferredRadius: typeof data.preferred_radius_miles === "number"
            ? String(data.preferred_radius_miles)
            : "",
          startTimeline: normalizeClientTimeline(data.start_timeline),
          experienceLevel: data.experience_context ?? data.fitness_level ?? "",
          budgetRange: hasSavedLegacyBudget ? "__saved__" : normalizeClientBudgetRange(data.budget_range),
          budgetBasis: data.budget_basis ?? "",
          supportFrequency: data.support_frequency ?? "",
          notes: data.preference_notes ?? "",
          savedBudgetRange: typeof data.budget_range === "string" ? data.budget_range : "",
          savedBudgetMinCents: typeof data.budget_min === "number" ? data.budget_min : null,
          savedBudgetMaxCents: typeof data.budget_max === "number" ? data.budget_max : null,
          savedBudgetLabel: hasSavedLegacyBudget
            ? buildSavedBudgetLabel(data.budget_range, data.budget_min, data.budget_max)
            : "",
        });
      })
      .catch(() => {
        if (isMounted) {
          setFeedback("We could not load your preferences right now.");
          setFeedbackType("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  async function handleSave() {
    if (!user) return;

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

      if (!appUser) throw new Error("We couldn't find your marketplace user record yet.");

      const { error: userError } = await supabase
        .from("users")
        .update({ first_name: form.firstName.trim() || null })
        .eq("id", appUser.id);

      if (userError) throw userError;

      const selectedBudget = getBudgetCents(form.budgetRange);
      const isKeepingSavedBudget = form.budgetRange === "__saved__";
      const budgetMinCents = isKeepingSavedBudget ? form.savedBudgetMinCents : selectedBudget.budgetMinCents;
      const budgetMaxCents = isKeepingSavedBudget ? form.savedBudgetMaxCents : selectedBudget.budgetMaxCents;
      const legacyFitnessLevel = ["beginner", "intermediate", "advanced"].includes(form.experienceLevel)
        ? form.experienceLevel
        : null;
      const preferredRadius = form.preferredServiceMode === "online" || !form.preferredRadius
        ? null
        : Number(form.preferredRadius);

      const { error } = await supabase.from("client_profiles").upsert(
        {
          user_id: appUser.id,
          location_city: form.city.trim() || null,
          location_state: form.state || null,
          goal_tags: form.goals,
          interested_service_category_slugs: form.interestedCategories,
          preferred_modality: toDatabaseServiceMode(form.preferredServiceMode),
          preferred_radius_miles: preferredRadius,
          start_timeline: form.startTimeline || null,
          experience_context: form.experienceLevel || null,
          fitness_level: legacyFitnessLevel,
          budget_range: isKeepingSavedBudget ? form.savedBudgetRange || null : form.budgetRange || null,
          budget_basis: form.budgetBasis || null,
          budget_min: budgetMinCents,
          budget_max: budgetMaxCents,
          support_frequency: form.supportFrequency || null,
          preference_notes: form.notes.trim() || null,
        },
        { onConflict: "user_id" },
      );

      if (error) throw error;

      setFeedback("Preferences saved. We'll use these to improve your marketplace results and consultation requests.");
      setFeedbackType("success");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "We could not save your preferences.");
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
        <h2>Loading your marketplace preferences.</h2>
        <p>One moment while we check your account.</p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="callout">
        <span className="meta-pill">Sign in required</span>
        <h2>Sign in to save your marketplace preferences.</h2>
        <p>Browsing stays public. Your private preferences are optional and live inside your account.</p>
        <div className="button-row">
          <Link className="button button-primary" href="/sign-in/?redirect=/account/profile/">
            Sign in
          </Link>
        </div>
      </article>
    );
  }

  const hasLegacyRadius = Boolean(
    form.preferredRadius
      && !CLIENT_RADIUS_OPTIONS.some((option) => option.value === form.preferredRadius),
  );

  return (
    <section className="section">
      <div className="professional-profile-builder client-preference-builder">
        <article className="panel professional-builder-intro">
          <div className="eyebrow">Private marketplace preferences</div>
          <h2 className="section-title">Keep your marketplace preferences private.</h2>
          <p className="section-copy">
            These preferences help Elevare surface better-fit profiles and give providers more context when you reach out.
          </p>
          <p className="client-privacy-note"><strong>Your preferences are never publicly listed.</strong></p>
        </article>

        <article className="panel profile-form-section">
          <div className="section-head section-head-compact">
            <div className="eyebrow">About you</div>
            <h3 className="section-title section-title-compact">Just the basics</h3>
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
              <select
                value={form.state}
                onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
              >
                <option value="">Select state</option>
                {US_STATE_OPTIONS.map(([abbreviation, name]) => (
                  <option key={abbreviation} value={abbreviation}>{name}</option>
                ))}
              </select>
            </label>
          </div>
        </article>

        <article className="panel profile-form-section">
          <div className="section-head section-head-compact">
            <div className="eyebrow">Your goals</div>
            <h3 className="section-title section-title-compact">What would you like help with?</h3>
            <p className="section-copy section-copy-compact">Choose as many as you need. This is not a medical intake form.</p>
          </div>
          <div className="toggle-row client-goal-grid">
            {CLIENT_GOAL_OPTIONS.map((goal) => {
              const isActive = form.goals.includes(goal);
              return (
                <button
                  key={goal}
                  type="button"
                  className={`toggle-chip${isActive ? " is-active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => setForm((current) => ({ ...current, goals: toggleSelection(current.goals, goal) }))}
                >
                  {goal}
                </button>
              );
            })}
          </div>
        </article>

        <article className="panel profile-form-section">
          <div className="section-head section-head-compact">
            <div className="eyebrow">Support types</div>
            <h3 className="section-title section-title-compact">What kind of support are you interested in?</h3>
            <p className="section-copy section-copy-compact">Choose any that seem relevant. You can always change this later.</p>
          </div>
          <div className="selectable-grid client-category-grid">
            {MARKETPLACE_TAXONOMY_CATEGORIES.map((category) => {
              const isActive = form.interestedCategories.includes(category.stableId);
              return (
                <button
                  key={category.stableId}
                  type="button"
                  className={`selectable-card${isActive ? " is-active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => setForm((current) => ({
                    ...current,
                    interestedCategories: toggleSelection(current.interestedCategories, category.stableId),
                  }))}
                >
                  <strong>{category.label}</strong>
                  <span>{CLIENT_CATEGORY_DESCRIPTIONS[category.stableId] ?? category.shortDescription}</span>
                </button>
              );
            })}
          </div>
        </article>

        <article className="panel profile-form-section">
          <div className="section-head section-head-compact">
            <div className="eyebrow">Service preference</div>
            <h3 className="section-title section-title-compact">How would you like to work together?</h3>
          </div>
          <div className="tool-form-grid marketplace-editor-grid">
            <label className="field">
              <span className="field-label">Service preference</span>
              <select
                value={form.preferredServiceMode}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  preferredServiceMode: event.target.value,
                  preferredRadius: event.target.value === "online" ? "" : current.preferredRadius,
                }))}
              >
                <option value="">No preference</option>
                {CLIENT_SERVICE_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {form.preferredServiceMode !== "online" ? (
              <label className="field">
                <span className="field-label">How far are you willing to travel?</span>
                <select
                  value={form.preferredRadius}
                  onChange={(event) => setForm((current) => ({ ...current, preferredRadius: event.target.value }))}
                >
                  {hasLegacyRadius ? (
                    <option value={form.preferredRadius}>{form.preferredRadius} miles (saved preference)</option>
                  ) : null}
                  {CLIENT_RADIUS_OPTIONS.map((option) => (
                    <option key={option.value || "none"} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </article>

        <article className="panel profile-form-section">
          <div className="section-head section-head-compact">
            <div className="eyebrow">Timing</div>
            <h3 className="section-title section-title-compact">When are you looking to get started?</h3>
          </div>
          <label className="field client-compact-field">
            <span className="field-label">Start timeline</span>
            <select
              value={form.startTimeline}
              onChange={(event) => setForm((current) => ({ ...current, startTimeline: event.target.value }))}
            >
              <option value="">No preference</option>
              {CLIENT_TIMELINE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </article>

        <article className="panel profile-form-section">
          <div className="section-head section-head-compact">
            <div className="eyebrow">Optional preferences</div>
            <h3 className="section-title section-title-compact">Add context if it helps</h3>
          </div>
          <div className="tool-form-grid marketplace-editor-grid">
            <label className="field">
              <span className="field-label">Experience level</span>
              <select
                value={form.experienceLevel}
                onChange={(event) => setForm((current) => ({ ...current, experienceLevel: event.target.value }))}
              >
                <option value="">No preference</option>
                {CLIENT_EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Approximate budget</span>
              <select
                value={form.budgetRange}
                onChange={(event) => setForm((current) => ({ ...current, budgetRange: event.target.value }))}
              >
                <option value="">No preference / Not sure</option>
                {form.savedBudgetLabel ? (
                  <option value="__saved__">{form.savedBudgetLabel} (saved preference)</option>
                ) : null}
                {CLIENT_BUDGET_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Pricing period</span>
              <select
                value={form.budgetBasis}
                onChange={(event) => setForm((current) => ({ ...current, budgetBasis: event.target.value }))}
              >
                <option value="">No preference / Not sure</option>
                {CLIENT_BUDGET_BASIS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">How often would you like support?</span>
              <select
                value={form.supportFrequency}
                onChange={(event) => setForm((current) => ({ ...current, supportFrequency: event.target.value }))}
              >
                <option value="">No preference</option>
                {CLIENT_SUPPORT_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </article>

        <article className="panel profile-form-section">
          <div className="section-head section-head-compact">
            <div className="eyebrow">Optional context</div>
            <h3 className="section-title section-title-compact">Anything else you&apos;d like us to know?</h3>
          </div>
          <label className="field">
            <span className="field-label">Additional details</span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Tell us anything that would help someone understand what you're looking for."
            />
          </label>
          <div className="form-actions">
            <button type="button" className="button button-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Preferences"}
            </button>
            {feedback ? (
              <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`} role="status">
                {feedback}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
