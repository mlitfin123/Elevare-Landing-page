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
  CLIENT_SERVICE_MODE_OPTIONS,
  CLIENT_SUPPORT_FREQUENCY_OPTIONS,
  CLIENT_TIMELINE_OPTIONS,
  getBudgetCents,
  normalizeClientBudgetRange,
  normalizeClientGoalTags,
  normalizeClientTimeline,
  shouldShowClientRadius,
  toClientServiceMode,
  toDatabaseServiceMode,
} from "@/lib/client-preferences";
import { getMarketplaceAppUserByAuthId } from "@/lib/marketplace-account";
import {
  COMMON_CURRENCY_CODES,
  distanceToMeters,
  getCountryOptions,
  getDefaultCurrencyCode,
  getDistanceOptions,
  getDistanceUnit,
  getRegionLabel,
  getRegionOptions,
  metersToDistance,
  metersToMiles,
  normalizeCountryCode,
  normalizeCurrencyCode,
  normalizeRegionValue,
} from "@/lib/marketplace-location";
import { MARKETPLACE_TAXONOMY_CATEGORIES } from "@/lib/marketplace-taxonomy";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ClientProfileFormState = {
  firstName: string;
  countryCode: string;
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
  budgetCurrencyCode: string;
  supportFrequency: string;
  notes: string;
  savedBudgetRange: string;
  savedBudgetMinCents: number | null;
  savedBudgetMaxCents: number | null;
  savedBudgetLabel: string;
};

const initialFormState: ClientProfileFormState = {
  firstName: "",
  countryCode: "US",
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
  budgetCurrencyCode: "USD",
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
  currencyCode = "USD",
) {
  const legacyLabels: Record<string, string> = {
    "50_70": "$50-$70",
    "70_90": "$70-$90",
    "90_120": "$90-$120",
    "120_plus": "$120+",
  };

  if (currencyCode === "USD" && typeof range === "string" && legacyLabels[range]) return legacyLabels[range];

  const min = typeof minCents === "number" ? minCents / 100 : null;
  const max = typeof maxCents === "number" ? maxCents / 100 : null;
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: normalizeCurrencyCode(currencyCode),
    maximumFractionDigits: 0,
  });
  if (min != null && max != null) return `${formatter.format(min)}-${formatter.format(max)}`;
  if (min != null) return `${formatter.format(min)}+`;
  if (max != null) return `Up to ${formatter.format(max)}`;
  return "Saved budget";
}

const MARKETPLACE_COUNTRY_OPTIONS = getCountryOptions();

function getBudgetOptionLabel(
  option: (typeof CLIENT_BUDGET_RANGE_OPTIONS)[number],
  currencyCode: string,
) {
  if (option.minCents == null && option.maxCents == null) return option.label;
  return buildSavedBudgetLabel(option.value, option.minCents, option.maxCents, currencyCode);
}

export function ClientProfileEditor() {
  const { user, isLoading, isConfigured } = useSupabaseSession();
  const [form, setForm] = useState<ClientProfileFormState>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(true);
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

        const interestedCategories = Array.isArray(data.interested_service_category_slugs)
          ? data.interested_service_category_slugs.filter(
              (entry: unknown): entry is string => typeof entry === "string",
            )
          : [];
        const countryCode = normalizeCountryCode(data.country_code);
        const distanceUnit = getDistanceUnit(countryCode);
        const preferredRadius = typeof data.preferred_radius_meters === "number"
          ? metersToDistance(data.preferred_radius_meters, distanceUnit)
          : typeof data.preferred_radius_miles === "number"
            ? metersToDistance(distanceToMeters(data.preferred_radius_miles, "mi"), distanceUnit)
            : null;
        const budgetCurrencyCode = normalizeCurrencyCode(
          data.budget_currency_code,
          getDefaultCurrencyCode(countryCode),
        );

        setForm({
          firstName: appUser.first_name ?? "",
          countryCode,
          city: data.location_city ?? "",
          state: normalizeRegionValue(countryCode, data.location_state),
          goals: normalizeClientGoalTags(data.goal_tags, data.goals),
          interestedCategories,
          preferredServiceMode: toClientServiceMode(data.preferred_modality),
          preferredRadius: preferredRadius == null ? "" : String(Math.round(preferredRadius * 10) / 10),
          startTimeline: normalizeClientTimeline(data.start_timeline),
          experienceLevel: data.experience_context ?? data.fitness_level ?? "",
          budgetRange: hasSavedLegacyBudget ? "__saved__" : normalizeClientBudgetRange(data.budget_range),
          budgetBasis: data.budget_basis ?? "",
          budgetCurrencyCode,
          supportFrequency: data.support_frequency ?? "",
          notes: data.preference_notes ?? "",
          savedBudgetRange: typeof data.budget_range === "string" ? data.budget_range : "",
          savedBudgetMinCents: typeof data.budget_min === "number" ? data.budget_min : null,
          savedBudgetMaxCents: typeof data.budget_max === "number" ? data.budget_max : null,
          savedBudgetLabel: hasSavedLegacyBudget
            ? buildSavedBudgetLabel(data.budget_range, data.budget_min, data.budget_max, budgetCurrencyCode)
            : "",
        });
        setIsCategoryEditorOpen(interestedCategories.length === 0);
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
      const preferredRadiusMeters = !shouldShowClientRadius(form.preferredServiceMode) || !form.preferredRadius
        ? null
        : distanceToMeters(Number(form.preferredRadius), getDistanceUnit(form.countryCode));
      const countryCode = normalizeCountryCode(form.countryCode);

      const { error } = await supabase.from("client_profiles").upsert(
        {
          user_id: appUser.id,
          country_code: countryCode,
          location_city: form.city.trim() || null,
          location_state: form.state || null,
          goal_tags: form.goals,
          interested_service_category_slugs: form.interestedCategories,
          preferred_modality: toDatabaseServiceMode(form.preferredServiceMode),
          preferred_radius_meters: preferredRadiusMeters,
          preferred_radius_miles: preferredRadiusMeters == null ? null : Math.round(metersToMiles(preferredRadiusMeters)),
          start_timeline: form.startTimeline || null,
          experience_context: form.experienceLevel || null,
          fitness_level: legacyFitnessLevel,
          budget_range: isKeepingSavedBudget ? form.savedBudgetRange || null : form.budgetRange || null,
          budget_basis: form.budgetBasis || null,
          budget_min: budgetMinCents,
          budget_max: budgetMaxCents,
          budget_currency_code: normalizeCurrencyCode(form.budgetCurrencyCode, getDefaultCurrencyCode(countryCode)),
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

  const distanceOptions = getDistanceOptions(form.countryCode);
  const hasLegacyRadius = Boolean(form.preferredRadius && !distanceOptions.some((option) => option.value === form.preferredRadius));
  const regionOptions = getRegionOptions(form.countryCode);
  const regionLabel = getRegionLabel(form.countryCode);
  const selectedCategories = MARKETPLACE_TAXONOMY_CATEGORIES.filter((category) =>
    form.interestedCategories.includes(category.stableId),
  );

  return (
    <section className="section">
      <div className="professional-profile-builder client-preference-builder">
        <article className="panel professional-builder-intro">
          <div className="eyebrow">Private marketplace preferences</div>
          <h2 className="section-title">Your marketplace preferences</h2>
          <p className="section-copy">
            These preferences help Elevare surface better-fit profiles and give providers more context when you reach out.
          </p>
          <p className="client-privacy-note"><strong>Your preferences are not shown on your public marketplace profile.</strong></p>
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
              <span className="field-label">Country</span>
              <select
                autoComplete="country"
                value={form.countryCode}
                onChange={(event) => setForm((current) => {
                  const countryCode = normalizeCountryCode(event.target.value);
                  const previousDefaultCurrency = getDefaultCurrencyCode(current.countryCode);
                  return {
                    ...current,
                    countryCode,
                    state: "",
                    preferredRadius: "",
                    budgetCurrencyCode: current.budgetCurrencyCode === previousDefaultCurrency
                      ? getDefaultCurrencyCode(countryCode)
                      : current.budgetCurrencyCode,
                  };
                })}
              >
                {MARKETPLACE_COUNTRY_OPTIONS.map((country) => (
                  <option key={country.code} value={country.code}>{country.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">City</span>
              <input
                type="text"
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                placeholder={form.countryCode === "US" ? "Miami" : "City"}
              />
            </label>
            <label className="field">
              <span className="field-label">{regionLabel}</span>
              {regionOptions.length > 0 ? (
                <select
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                >
                  <option value="">Select {regionLabel.toLowerCase()}</option>
                  {regionOptions.map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              ) : (
                <input
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                  placeholder={form.countryCode === "GB" ? "Greater London (optional)" : `${regionLabel} (optional)`}
                />
              )}
            </label>
          </div>
        </article>

        <article className="panel profile-form-section">
          <div className="section-head section-head-compact">
            <div className="eyebrow">Your goals</div>
            <h3 className="section-title section-title-compact">What would you like help with?</h3>
            <p className="section-copy section-copy-compact">Choose as many as you need, or skip this for now.</p>
            <span className="client-selection-count" aria-live="polite">
              {form.goals.length > 0 ? `${form.goals.length} selected` : "Optional"}
            </span>
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
                  <span>{goal}</span>
                  {isActive ? <span className="toggle-chip-state" aria-hidden="true">Selected</span> : null}
                </button>
              );
            })}
          </div>
        </article>

        <article className="panel profile-form-section">
          <div className="section-head section-head-compact">
            <div className="eyebrow">Support types</div>
            <h3 className="section-title section-title-compact">What kind of support are you interested in?</h3>
            <p className="section-copy section-copy-compact">Choose any that seem relevant, or skip this if you&apos;re not sure.</p>
            <span className="client-selection-count" aria-live="polite">
              {form.interestedCategories.length > 0 ? `${form.interestedCategories.length} selected` : "Optional"}
            </span>
          </div>
          {!isCategoryEditorOpen && selectedCategories.length > 0 ? (
            <div className="client-selection-summary">
              <div>
                <span className="stat-label">Interested in</span>
                <div className="client-selection-tags">
                  {selectedCategories.map((category) => (
                    <span key={category.stableId} className="meta-pill">{category.label}</span>
                  ))}
                </div>
              </div>
              <button type="button" className="button button-secondary" onClick={() => setIsCategoryEditorOpen(true)}>
                Edit Categories
              </button>
            </div>
          ) : (
            <>
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
                      <span className="client-category-card-head">
                        <strong>{category.label}</strong>
                        {isActive ? <span className="client-card-state" aria-hidden="true">Selected</span> : null}
                      </span>
                      <span>{CLIENT_CATEGORY_DESCRIPTIONS[category.stableId] ?? category.shortDescription}</span>
                    </button>
                  );
                })}
              </div>
              {selectedCategories.length > 0 ? (
                <div className="client-category-actions">
                  <button type="button" className="button button-secondary" onClick={() => setIsCategoryEditorOpen(false)}>
                    Done Choosing Categories
                  </button>
                </div>
              ) : null}
            </>
          )}
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
                  preferredRadius: shouldShowClientRadius(event.target.value) ? current.preferredRadius : "",
                }))}
              >
                <option value="">No preference</option>
                {CLIENT_SERVICE_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {shouldShowClientRadius(form.preferredServiceMode) ? (
              <label className="field">
                <span className="field-label">How far are you willing to travel?</span>
                <select
                  value={form.preferredRadius}
                  onChange={(event) => setForm((current) => ({ ...current, preferredRadius: event.target.value }))}
                >
                  {hasLegacyRadius ? (
                    <option value={form.preferredRadius}>{form.preferredRadius} {getDistanceUnit(form.countryCode) === "mi" ? "miles" : "km"} (saved preference)</option>
                  ) : null}
                  {distanceOptions.map((option) => (
                    <option key={option.value || "none"} value={option.value}>{option.label}</option>
                  ))}
                  <option value="">No preference</option>
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
                <option value="">Not sure / Not applicable</option>
                {CLIENT_EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Budget currency</span>
              <input
                list="client-budget-currency-options"
                maxLength={3}
                value={form.budgetCurrencyCode}
                onChange={(event) => setForm((current) => ({ ...current, budgetCurrencyCode: event.target.value.toUpperCase() }))}
              />
              <datalist id="client-budget-currency-options">
                {COMMON_CURRENCY_CODES.map((code) => <option key={code} value={code} />)}
              </datalist>
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
                  <option key={option.value} value={option.value}>{getBudgetOptionLabel(option, form.budgetCurrencyCode)}</option>
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
            <p className="section-copy section-copy-compact">
              Tell us anything that would help someone understand what you&apos;re looking for.
            </p>
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
          <p className="form-note">
            Do not include medical records, account passwords, payment card details, or other highly sensitive
            information.
          </p>
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
