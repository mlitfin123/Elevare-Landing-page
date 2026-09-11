"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import Link from "next/link";
import { saveProfessionalSection } from "@/lib/professional-publication-client";
import { getProfessionalPublicationMessages } from "@/lib/i18n/professional-publication-messages";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { trackEvent } from "@/lib/analytics";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import {
  getMarketplaceCategoryCopy,
  localizeApprovalStatus,
  localizeMarketplaceSpecialty,
  localizeServiceMode,
  marketplaceText,
} from "@/lib/i18n/marketplace-content";
import { deriveTrainerModality, getMarketplaceAppUserByAuthId } from "@/lib/marketplace-account";
import { buildProfessionalPath, getProfessionalStatusMessage } from "@/lib/marketplace-helpers";
import { PROFESSIONAL_ATTESTATION_TEXT, PROFESSIONAL_ATTESTATION_VERSION } from "@/lib/legal";
import {
  COMMON_CURRENCY_CODES,
  distanceToMeters,
  getCountryDisplayName,
  getCountryOptions,
  getDefaultCurrencyCode,
  getDistanceUnit,
  getRegionLabel,
  getRegionOptions,
  isRegionRequired,
  metersToDistance,
  metersToMiles,
  normalizeCountryCode,
  normalizeCurrencyCode,
  normalizeRegionValue,
} from "@/lib/marketplace-location";
import {
  getMarketplaceLegacyCategoryMapping,
  getMarketplaceTaxonomySelections,
  MARKETPLACE_TAXONOMY_CATEGORIES,
  resolveMarketplaceCategoryTaxonomy,
} from "@/lib/marketplace-taxonomy";
import {
  ACCEPTANCE_OPTIONS,
  AVAILABILITY_OPTIONS,
  calculateProfileCompleteness,
  collectCategorySpecialties,
  countWords,
  deriveLegacySpecialties,
  formatCredentialVerificationStatus,
  formatServicePricingSummary,
  isValidOptionalUrl,
  PRICING_BASIS_OPTIONS,
  PROFESSIONAL_EXPERIENCE_LEVEL_OPTIONS,
  PROFESSIONAL_GOAL_OPTIONS,
  PROFESSIONAL_LANGUAGE_SUGGESTIONS,
  CONSULTATION_TYPE_OPTIONS,
  type ProfessionalSectionId,
  retainAvailableSpecialties,
  SERVICE_MODE_OPTIONS,
  validatePublicProfessionalContent,
} from "@/lib/professional-profile";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  hasCompatibleVerifiedCredential,
  REGULATED_TITLE_REVIEW_MESSAGE,
} from "@/lib/regulated-professional-titles";
import { TRUST_EVIDENCE_EXTENSIONS, validateTrustEvidenceFile } from "@/lib/trust-evidence";
import { ProfessionalTrustStatus } from "@/components/marketplace/ProfessionalTrustStatus";

type CredentialDraft = {
  id: string;
  organizationName: string;
  credentialName: string;
  credentialType: string;
  credentialNumber: string;
  issueDate: string;
  expirationDate: string;
  supportingDocumentUrl: string;
  supportingReferenceUrl: string;
  verificationStatus: string;
  countryCode: string;
  jurisdiction: string;
  publicDisplay: boolean;
  reviewFeedbackPublic: string;
};

type CredentialUploadFeedback = {
  kind: "info" | "success" | "error";
  message: string;
};

type ServiceDraft = {
  id: string;
  name: string;
  description: string;
  serviceMode: string;
  durationMinutes: string;
  priceFrom: string;
  priceTo: string;
  pricingBasis: string;
  contactForPricing: boolean;
  isActive: boolean;
  currencyCode: string;
  intendedFor: string;
  includedItems: string;
  deliveryCadence: string;
  minimumCommitment: string;
  consultationType: string;
  additionalCostsNote: string;
};

type ProfessionalFormState = {
  displayName: string;
  profilePhotoUrl: string;
  professionalTitle: string;
  publicHeadline: string;
  bestFitSummary: string;
  bio: string;
  yearsExperience: string;
  selectedSpecialties: string[];
  goalTags: string[];
  experienceLevelsServed: string[];
  coachingStyle: string;
  serviceBoundaries: string;
  consultationExpectations: string;
  countryCode: string;
  city: string;
  state: string;
  postalCode: string;
  serviceArea: string;
  serviceRadius: string;
  serviceModes: string[];
  acceptanceStatus: string;
  availabilityWindows: string[];
  availabilityDetails: string;
  priceFrom: string;
  priceTo: string;
  pricingBasis: string;
  contactForPricing: boolean;
  currencyCode: string;
  websiteUrl: string;
  websiteLinkText: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  languages: string[];
  primaryCategoryStableId: string;
  additionalCategoryStableIds: string[];
};

type TrainerProfileStatusRow = {
  marketplace_status: string;
  status_message: string;
  is_publicly_listed: boolean;
  review_feedback_public: string | null;
  public_slug: string | null;
};

type TrainerProfileRow = {
  updated_at: string;
  id: string;
  bio: string | null;
  years_experience: number | null;
  location_city: string | null;
  location_state: string | null;
  country_code: string | null;
  postal_code: string | null;
  primary_specialty: string | null;
  secondary_specialties: string[] | null;
  marketplace_specialties: string[] | null;
  marketplace_goal_tags: string[] | null;
  experience_levels_served: string[] | null;
  public_headline: string | null;
  best_fit_summary: string | null;
  coaching_style: string | null;
  service_boundaries: string | null;
  consultation_expectations: string | null;
  modality: string | null;
  verification_status: string | null;
  profile_live: boolean | null;
  accepting_clients: boolean | null;
  client_acceptance_status: string | null;
  typical_availability: string[] | null;
  availability_details: string | null;
  marketplace_price_min_cents: number | null;
  marketplace_price_max_cents: number | null;
  marketplace_pricing_basis: string | null;
  marketplace_currency_code: string | null;
  contact_for_pricing: boolean | null;
  website_url: string | null;
  social_links: Record<string, unknown> | null;
  public_slug: string | null;
  public_display_name: string | null;
  professional_title: string | null;
  review_feedback_public: string | null;
  languages: string[] | null;
};

type MatchingProfileRow = {
  delivery_modes: unknown;
  goal_tags: unknown;
  experience_tags: unknown;
  price_min_cents: number | null;
  price_max_cents: number | null;
  availability_summary: unknown;
  currency_code: string | null;
};

type TrainerServiceLinkRow = {
  service_category_id: string;
  is_primary: boolean | null;
  service_categories: { public_slug: string | null; slug: string } | Array<{ public_slug: string | null; slug: string }> | null;
};

type ServiceCategoryLookupRow = { id: string; slug: string; public_slug: string | null };
type TrainerLocationRow = {
  id: string;
  location_name: string | null;
  location_city: string | null;
  location_state: string | null;
  service_radius_miles: number | null;
  country_code: string | null;
  postal_code: string | null;
  service_radius_meters: number | null;
  is_primary: boolean | null;
};
type CertificationRow = {
  id: string;
  cert_name: string | null;
  issuing_body: string | null;
  cert_org: string | null;
  cert_id: string | null;
  credential_number: string | null;
  credential_type: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  supporting_reference_url: string | null;
  verification_status: string | null;
  credential_country_code: string | null;
  credential_jurisdiction: string | null;
  public_display: boolean | null;
  review_feedback_public: string | null;
};
type ServiceOfferingRow = {
  id: string;
  name: string;
  description: string | null;
  service_mode: string | null;
  duration_minutes: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  pricing_basis: string | null;
  contact_for_pricing: boolean | null;
  is_active: boolean | null;
  currency_code: string | null;
  intended_for: string | null;
  included_items: string[] | null;
  delivery_cadence: string | null;
  minimum_commitment: string | null;
  consultation_type: string | null;
  additional_costs_note: string | null;
};
type UploadedProfilePhoto = { publicUrl: string; storagePath: string };
type FieldErrors = Record<string, string>;

const CREDENTIAL_DOCUMENT_BUCKET = "credential-documents";
const CREDENTIAL_DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;
const CREDENTIAL_DOCUMENT_EXTENSIONS = TRUST_EVIDENCE_EXTENSIONS;

const initialFormState: ProfessionalFormState = {
  displayName: "",
  profilePhotoUrl: "",
  professionalTitle: "",
  publicHeadline: "",
  bestFitSummary: "",
  bio: "",
  yearsExperience: "",
  selectedSpecialties: [],
  goalTags: [],
  experienceLevelsServed: [],
  coachingStyle: "",
  serviceBoundaries: "",
  consultationExpectations: "",
  countryCode: "US",
  city: "",
  state: "",
  postalCode: "",
  serviceArea: "",
  serviceRadius: "25",
  serviceModes: [],
  acceptanceStatus: "accepting",
  availabilityWindows: [],
  availabilityDetails: "",
  priceFrom: "",
  priceTo: "",
  pricingBasis: "",
  contactForPricing: false,
  currencyCode: "USD",
  websiteUrl: "",
  websiteLinkText: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  linkedinUrl: "",
  languages: [],
  primaryCategoryStableId: "",
  additionalCategoryStableIds: [],
};

function formatLocalizedServicePricingSummary(service: ServiceDraft | ProfessionalFormState, locale: ReturnType<typeof localeFromPathname>) {
  if (service.contactForPricing) return marketplaceText(locale, "Contact for pricing");
  if (!service.priceFrom.trim()) return marketplaceText(locale, "Pricing not listed");

  const amount = formatServicePricingSummary({ ...service, pricingBasis: "" });
  const basis = PRICING_BASIS_OPTIONS.find((option) => option.value === service.pricingBasis)?.label;
  return basis ? `${amount} · ${marketplaceText(locale, basis)}` : amount;
}

function createEmptyCredentialDraft(): CredentialDraft {
  return {
    id: crypto.randomUUID(), organizationName: "", credentialName: "", credentialType: "",
    credentialNumber: "", issueDate: "", expirationDate: "", supportingDocumentUrl: "",
    supportingReferenceUrl: "", verificationStatus: "unverified", countryCode: "US", jurisdiction: "",
    publicDisplay: true, reviewFeedbackPublic: "",
  };
}

const defaultExpandedSections: Record<ProfessionalSectionId, boolean> = {
  about: true,
  fit: true,
  offer: true,
  work: true,
  pricing: true,
  credentials: true,
  links: true,
};

function createEmptyServiceDraft(): ServiceDraft {
  return {
    id: crypto.randomUUID(), name: "", description: "", serviceMode: "", durationMinutes: "",
    priceFrom: "", priceTo: "", pricingBasis: "session", contactForPricing: false, isActive: true,
    currencyCode: "USD",
    intendedFor: "",
    includedItems: "",
    deliveryCadence: "",
    minimumCommitment: "",
    consultationType: "unspecified",
    additionalCostsNote: "",
  };
}

function buildDistinctValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function parseStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())) : [];
}

function mapLinkedCategorySlug(linkedCategory: TrainerServiceLinkRow["service_categories"]) {
  if (Array.isArray(linkedCategory)) return linkedCategory[0]?.slug ?? linkedCategory[0]?.public_slug ?? null;
  return linkedCategory?.slug ?? linkedCategory?.public_slug ?? null;
}

function normalizeLoadedCategorySelections(categoryIdentifiers: string[]) {
  return buildDistinctValues(categoryIdentifiers.map((identifier) => {
    const taxonomyCategory = resolveMarketplaceCategoryTaxonomy(identifier, identifier);
    const legacyMapping = getMarketplaceLegacyCategoryMapping(identifier);
    return taxonomyCategory?.stableId ?? legacyMapping?.nextStableId ?? null;
  }));
}

function getJsonString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function isPrivateCredentialPath(value: string, ownerId?: string) {
  const normalized = value.trim();
  if (!normalized || /^https?:\/\//i.test(normalized) || normalized.includes("..")) return false;
  return ownerId ? normalized.startsWith(`${ownerId}/`) : normalized.split("/").length >= 3;
}

function isLegacyCredentialUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function FieldError({ name, errors, translate }: { name: string; errors: FieldErrors; translate?: (value: string) => string }) {
  return errors[name] ? <span className="field-error" role="alert">{translate?.(errors[name]) ?? errors[name]}</span> : null;
}

function dollarsToCents(value: string) {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function ProfessionalSectionHeader({
  id,
  eyebrow,
  title,
  summary,
  complete,
  statusLabel,
  expanded,
  onToggle,
  translate = (value) => value,
}: {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  complete: boolean;
  statusLabel?: string;
  expanded: boolean;
  onToggle: () => void;
  translate?: (value: string) => string;
}) {
  return (
    <div className="professional-section-header">
      <div className="professional-section-heading">
        <div className="eyebrow">{eyebrow}</div>
        <h3 id={id} className="section-title section-title-compact">{title}</h3>
        {!expanded ? <p className="professional-section-summary">{summary}</p> : null}
      </div>
      <div className="professional-section-controls">
        <span className={`professional-section-status${complete ? " is-complete" : ""}`}>
          {statusLabel ?? translate(complete ? "Complete" : "Needs attention")}
        </span>
        <button
          type="button"
          className="button button-secondary professional-section-toggle"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {translate(expanded ? "Collapse" : "Edit")}
        </button>
      </div>
    </div>
  );
}

export function ProfessionalProfileEditor() {
  const { user, isLoading, isConfigured } = useSupabaseSession();
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const publicationCopy = getProfessionalPublicationMessages(locale);
  const t = (value: string) => marketplaceText(locale, value);
  const marketplaceCountryOptions = getCountryOptions(locale);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const credentialInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [profileVersion, setProfileVersion] = useState<string | null>(null);
  const [propagationDelayed, setPropagationDelayed] = useState(false);
  const [saveConflict, setSaveConflict] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<ProfessionalFormState>(initialFormState);
  const [credentials, setCredentials] = useState<CredentialDraft[]>([createEmptyCredentialDraft()]);
  const [services, setServices] = useState<ServiceDraft[]>([createEmptyServiceDraft()]);
  const [primaryLocationId, setPrimaryLocationId] = useState<string | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [removeCurrentPhoto, setRemoveCurrentPhoto] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [approvalStatus, setApprovalStatus] = useState("draft");
  const [reviewFeedbackPublic, setReviewFeedbackPublic] = useState<string | null>(null);
  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
  const [profileViewCount, setProfileViewCount] = useState<number | null | undefined>(undefined);
  const [profileSlug, setProfileSlug] = useState("");
  const [isPubliclyListed, setIsPubliclyListed] = useState(false);
  const [statusMessageOverride, setStatusMessageOverride] = useState<string | null>(null);
  const [hasAcceptedProfessionalTerms, setHasAcceptedProfessionalTerms] = useState(false);
  const [expandedSections, setExpandedSections] = useState(defaultExpandedSections);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [additionalCategoryDraft, setAdditionalCategoryDraft] = useState("");
  const [languageDraft, setLanguageDraft] = useState("");
  const [selectedCredentialFiles, setSelectedCredentialFiles] = useState<Record<string, File>>({});
  const [credentialUploadFeedback, setCredentialUploadFeedback] = useState<Record<string, CredentialUploadFeedback>>({});
  const savedFormSnapshot = useRef("");
  const resetSavedFormSnapshot = useRef(true);

  useEffect(() => {
    const snapshot = JSON.stringify({ form, credentials, services, removeCurrentPhoto,
      photo: selectedPhotoFile ? [selectedPhotoFile.name, selectedPhotoFile.size, selectedPhotoFile.lastModified] : null,
      documents: Object.entries(selectedCredentialFiles).map(([id, file]) => [id, file.name, file.size, file.lastModified]),
    });
    if (resetSavedFormSnapshot.current) {
      savedFormSnapshot.current = snapshot;
      resetSavedFormSnapshot.current = false;
      setIsDirty(false);
    } else setIsDirty(snapshot !== savedFormSnapshot.current);
  }, [form, credentials, services, removeCurrentPhoto, selectedPhotoFile, selectedCredentialFiles]);

  const selectedCategoryStableIds = useMemo(
    () => buildDistinctValues([form.primaryCategoryStableId, ...form.additionalCategoryStableIds]),
    [form.additionalCategoryStableIds, form.primaryCategoryStableId],
  );
  const selectedTaxonomyCategories = useMemo(
    () => getMarketplaceTaxonomySelections(selectedCategoryStableIds),
    [selectedCategoryStableIds],
  );
  const selectedCategoryNotes = useMemo(
    () => buildDistinctValues(selectedTaxonomyCategories.map((category) => category.editorNote ?? null)),
    [selectedTaxonomyCategories],
  );
  const availableSpecialties = useMemo(
    () => collectCategorySpecialties(selectedTaxonomyCategories),
    [selectedTaxonomyCategories],
  );
  const availableAdditionalCategories = useMemo(
    () => MARKETPLACE_TAXONOMY_CATEGORIES.filter(
      (category) => category.stableId !== form.primaryCategoryStableId
        && !form.additionalCategoryStableIds.includes(category.stableId),
    ),
    [form.additionalCategoryStableIds, form.primaryCategoryStableId],
  );
  const regionOptions = getRegionOptions(form.countryCode);
  const regionLabel = getRegionLabel(form.countryCode);
  const distanceUnit = getDistanceUnit(form.countryCode);
  const distanceLabel = distanceUnit === "mi" ? "miles" : "km";
  const offersInPerson = form.serviceModes.includes("in_person") || form.serviceModes.includes("hybrid");
  const completeness = useMemo(() => calculateProfileCompleteness({
    name: form.displayName,
    professionalTitle: form.professionalTitle,
    publicHeadline: form.publicHeadline,
    bestFitSummary: form.bestFitSummary,
    profilePhotoUrl: removeCurrentPhoto ? "" : photoPreviewUrl || form.profilePhotoUrl,
    bio: form.bio,
    goalTags: form.goalTags,
    experienceLevelsServed: form.experienceLevelsServed,
    yearsExperience: form.yearsExperience,
    consultationExpectations: form.consultationExpectations,
    primaryCategory: form.primaryCategoryStableId,
    specialties: form.selectedSpecialties,
    serviceModes: form.serviceModes,
    countryCode: form.countryCode,
    city: form.city,
    state: form.state,
    services,
    profilePriceFrom: form.priceFrom,
    profileContactForPricing: form.contactForPricing,
    availability: form.availabilityWindows,
    acceptanceStatus: form.acceptanceStatus,
  }), [form, photoPreviewUrl, removeCurrentPhoto, services]);
  const bioWordCount = countWords(form.bio);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) return;
    const marketplaceClient = supabase;
    const currentUser = user;
    let isMounted = true;

    async function loadProfile() {
      resetSavedFormSnapshot.current = true;
      const appUser = await getMarketplaceAppUserByAuthId(marketplaceClient, currentUser.id);
      if (!appUser || !isMounted) return;

      const [statusResult, profileResult] = await Promise.all([
        marketplaceClient.from("marketplace_trainer_profile_status_v1")
          .select("marketplace_status,status_message,is_publicly_listed,review_feedback_public,public_slug")
          .eq("user_id", appUser.id).maybeSingle(),
        marketplaceClient.from("trainer_profiles")
          .select("id,updated_at,bio,years_experience,location_city,location_state,country_code,postal_code,primary_specialty,secondary_specialties,marketplace_specialties,marketplace_goal_tags,experience_levels_served,public_headline,best_fit_summary,coaching_style,service_boundaries,consultation_expectations,modality,verification_status,profile_live,accepting_clients,client_acceptance_status,typical_availability,availability_details,marketplace_price_min_cents,marketplace_price_max_cents,marketplace_pricing_basis,marketplace_currency_code,contact_for_pricing,website_url,social_links,public_slug,public_display_name,professional_title,review_feedback_public,languages")
          .eq("user_id", appUser.id).maybeSingle(),
      ]);
      if (statusResult.error) throw statusResult.error;
      if (profileResult.error) throw profileResult.error;

      const statusData = statusResult.data as TrainerProfileStatusRow | null;
      const profile = profileResult.data as TrainerProfileRow | null;
      setApprovalStatus(statusData?.marketplace_status ?? "draft");
      setReviewFeedbackPublic(statusData?.review_feedback_public ?? profile?.review_feedback_public ?? null);
      setStatusMessageOverride(statusData?.status_message ?? null);
      setIsPubliclyListed(Boolean(statusData?.is_publicly_listed));

      if (!profile) {
        setProfileViewCount(0);
        setForm((current) => ({
          ...current,
          displayName: [appUser.first_name, appUser.last_name].filter(Boolean).join(" "),
          profilePhotoUrl: appUser.profile_photo_url ?? "",
        }));
        return;
      }

      setProfileVersion(profile.updated_at);
      setIsDirty(false);
      setPublicProfileId(profile.id);
      setProfileSlug(statusData?.public_slug ?? profile.public_slug ?? "");

      const viewCountResult = await marketplaceClient
        .from("professional_profile_view_counts")
        .select("view_count")
        .eq("trainer_profile_id", profile.id)
        .maybeSingle();
      if (isMounted) {
        const count = Number(viewCountResult.data?.view_count ?? 0);
        setProfileViewCount(!viewCountResult.error && Number.isSafeInteger(count) && count >= 0 ? count : null);
      }

      const [matchingResult, categoryResult, credentialResult, locationResult, offeringResult] = await Promise.all([
        marketplaceClient.from("provider_matching_profiles")
          .select("delivery_modes,goal_tags,experience_tags,price_min_cents,price_max_cents,availability_summary,currency_code")
          .eq("trainer_profile_id", profile.id).maybeSingle(),
        marketplaceClient.from("trainer_services")
          .select("service_category_id,is_primary,service_categories(public_slug,slug)")
          .eq("trainer_profile_id", profile.id).order("is_primary", { ascending: false }),
        marketplaceClient.from("certifications")
          .select("id,cert_name,issuing_body,cert_org,cert_id,credential_number,credential_type,issue_date,expiration_date,expiry_date,document_url,supporting_reference_url,verification_status,credential_country_code,credential_jurisdiction,public_display,review_feedback_public")
          .eq("trainer_profile_id", profile.id).eq("is_active", true).order("created_at", { ascending: true }),
        marketplaceClient.from("trainer_locations")
          .select("id,location_name,location_city,location_state,country_code,postal_code,service_radius_miles,service_radius_meters,is_primary")
          .eq("trainer_profile_id", profile.id).order("is_primary", { ascending: false }),
        marketplaceClient.from("trainer_service_offerings")
          .select("id,name,description,service_mode,duration_minutes,price_min_cents,price_max_cents,pricing_basis,currency_code,contact_for_pricing,is_active,intended_for,included_items,delivery_cadence,minimum_commitment,consultation_type,additional_costs_note")
          .eq("trainer_profile_id", profile.id).order("sort_order", { ascending: true }),
      ]);
      for (const result of [matchingResult, categoryResult, credentialResult, locationResult, offeringResult]) {
        if (result.error) throw result.error;
      }

      const matching = matchingResult.data as MatchingProfileRow | null;
      const categoryLinks = (categoryResult.data ?? []) as TrainerServiceLinkRow[];
      const rawCategories = categoryLinks.map((entry) => mapLinkedCategorySlug(entry.service_categories)).filter(Boolean) as string[];
      const categoryStableIds = normalizeLoadedCategorySelections(rawCategories);
      const impliedModes = buildDistinctValues(rawCategories.flatMap((identifier) => getMarketplaceLegacyCategoryMapping(identifier)?.impliedServiceModes ?? []));
      const impliedSpecialties = buildDistinctValues(rawCategories.flatMap((identifier) => getMarketplaceLegacyCategoryMapping(identifier)?.impliedSpecialties ?? []));
      const loadedModes = buildDistinctValues([...parseStringArray(matching?.delivery_modes), ...impliedModes]);
      const location = ((locationResult.data ?? []) as TrainerLocationRow[])[0] ?? null;
      const availabilityRecord = matching?.availability_summary && typeof matching.availability_summary === "object"
        ? matching.availability_summary as Record<string, unknown>
        : null;
      const socialLinks = profile.social_links;
      const modernSpecialties = parseStringArray(profile.marketplace_specialties);
      const loadedSpecialties = modernSpecialties.length > 0
        ? modernSpecialties
        : impliedSpecialties;
      const loadedGoals = parseStringArray(profile.marketplace_goal_tags).length > 0
        ? parseStringArray(profile.marketplace_goal_tags)
        : parseStringArray(matching?.goal_tags);
      const loadedExperienceLevels = parseStringArray(profile.experience_levels_served).length > 0
        ? parseStringArray(profile.experience_levels_served)
        : parseStringArray(matching?.experience_tags);
      const countryCode = normalizeCountryCode(location?.country_code ?? profile.country_code);
      const distanceUnit = getDistanceUnit(countryCode);
      const radius = location?.service_radius_meters != null
        ? metersToDistance(location.service_radius_meters, distanceUnit)
        : location?.service_radius_miles != null
          ? metersToDistance(distanceToMeters(location.service_radius_miles, "mi"), distanceUnit)
          : 25;
      const currencyCode = normalizeCurrencyCode(
        profile.marketplace_currency_code ?? matching?.currency_code,
        getDefaultCurrencyCode(countryCode),
      );

      setPrimaryLocationId(location?.id ?? null);
      setForm({
        displayName: profile.public_display_name ?? "",
        profilePhotoUrl: appUser.profile_photo_url ?? "",
        professionalTitle: profile.professional_title ?? "",
        publicHeadline: profile.public_headline ?? "",
        bestFitSummary: profile.best_fit_summary ?? "",
        bio: profile.bio ?? "",
        yearsExperience: profile.years_experience == null ? "" : String(profile.years_experience),
        selectedSpecialties: loadedSpecialties,
        goalTags: loadedGoals,
        experienceLevelsServed: loadedExperienceLevels,
        coachingStyle: profile.coaching_style ?? "",
        serviceBoundaries: profile.service_boundaries ?? "",
        consultationExpectations: profile.consultation_expectations ?? "",
        countryCode,
        city: location?.location_city ?? profile.location_city ?? "",
        state: normalizeRegionValue(countryCode, location?.location_state ?? profile.location_state),
        postalCode: location?.postal_code ?? profile.postal_code ?? "",
        serviceArea: location?.location_name ?? "",
        serviceRadius: String(Math.round(radius * 10) / 10),
        serviceModes: loadedModes,
        acceptanceStatus: profile.client_acceptance_status ?? (profile.accepting_clients === false ? "not_accepting" : "accepting"),
        availabilityWindows: parseStringArray(profile.typical_availability).length > 0
          ? parseStringArray(profile.typical_availability)
          : parseStringArray(availabilityRecord?.windows),
        availabilityDetails: profile.availability_details ?? (typeof availabilityRecord?.details === "string" ? availabilityRecord.details : ""),
        priceFrom: profile.marketplace_price_min_cents != null
          ? String(profile.marketplace_price_min_cents / 100)
          : matching?.price_min_cents != null ? String(matching.price_min_cents / 100) : "",
        priceTo: profile.marketplace_price_max_cents != null
          ? String(profile.marketplace_price_max_cents / 100)
          : matching?.price_max_cents != null ? String(matching.price_max_cents / 100) : "",
        pricingBasis: profile.marketplace_pricing_basis ?? "",
        contactForPricing: Boolean(profile.contact_for_pricing),
        currencyCode,
        websiteUrl: profile.website_url ?? "",
        websiteLinkText: getJsonString(socialLinks, "website_label"),
        instagramUrl: getJsonString(socialLinks, "instagram"),
        facebookUrl: getJsonString(socialLinks, "facebook"),
        tiktokUrl: getJsonString(socialLinks, "tiktok"),
        youtubeUrl: getJsonString(socialLinks, "youtube"),
        linkedinUrl: getJsonString(socialLinks, "linkedin"),
        languages: parseStringArray(profile.languages),
        primaryCategoryStableId: categoryStableIds[0] ?? "",
        additionalCategoryStableIds: categoryStableIds.slice(1),
      });

      const loadedCredentials = (credentialResult.data ?? []) as CertificationRow[];
      if (loadedCredentials.length > 0) {
        setCredentials(loadedCredentials.map((credential) => ({
          id: credential.id,
          organizationName: credential.issuing_body ?? credential.cert_org ?? "",
          credentialName: credential.cert_name ?? "",
          credentialType: credential.credential_type ?? "",
          credentialNumber: credential.credential_number ?? credential.cert_id ?? "",
          issueDate: credential.issue_date ?? "",
          expirationDate: credential.expiration_date ?? credential.expiry_date ?? "",
          supportingDocumentUrl: credential.document_url ?? "",
          supportingReferenceUrl: credential.supporting_reference_url ?? "",
          verificationStatus: credential.verification_status ?? "unverified",
          countryCode: normalizeCountryCode(credential.credential_country_code ?? countryCode),
          jurisdiction: credential.credential_jurisdiction ?? "",
          publicDisplay: credential.public_display !== false,
          reviewFeedbackPublic: credential.review_feedback_public ?? "",
        })));
      } else {
        setCredentials([]);
      }

      const loadedOfferings = (offeringResult.data ?? []) as ServiceOfferingRow[];
      if (loadedOfferings.length > 0) {
        setServices(loadedOfferings.map((offering) => ({
          id: offering.id,
          name: offering.name,
          description: offering.description ?? "",
          serviceMode: offering.service_mode ?? "",
          durationMinutes: offering.duration_minutes == null ? "" : String(offering.duration_minutes),
          priceFrom: offering.price_min_cents == null ? "" : String(offering.price_min_cents / 100),
          priceTo: offering.price_max_cents == null ? "" : String(offering.price_max_cents / 100),
          pricingBasis: offering.pricing_basis ?? "session",
          contactForPricing: Boolean(offering.contact_for_pricing),
          isActive: offering.is_active !== false,
          currencyCode: normalizeCurrencyCode(offering.currency_code, currencyCode),
          intendedFor: offering.intended_for ?? "",
          includedItems: parseStringArray(offering.included_items).join("\n"),
          deliveryCadence: offering.delivery_cadence ?? "",
          minimumCommitment: offering.minimum_commitment ?? "",
          consultationType: offering.consultation_type ?? "unspecified",
          additionalCostsNote: offering.additional_costs_note ?? "",
        })));
      } else {
        setServices([]);
      }

      const hasAbout = Boolean(
        profile.public_display_name?.trim()
          && profile.professional_title?.trim()
          && profile.bio?.trim()
          && appUser.profile_photo_url,
      );
      const hasOffer = Boolean(categoryStableIds[0] && loadedSpecialties.length > 0 && loadedOfferings.length > 0);
      const hasFit = Boolean(
        profile.public_headline?.trim()
          && profile.best_fit_summary?.trim()
          && loadedGoals.length > 0
          && loadedExperienceLevels.length > 0,
      );
      const hasWork = Boolean(
        loadedModes.length > 0
          && profile.client_acceptance_status
          && (parseStringArray(profile.typical_availability).length > 0 || parseStringArray(availabilityRecord?.windows).length > 0),
      );
      setExpandedSections({
        about: !hasAbout,
        fit: !hasFit,
        offer: !hasOffer,
        work: !hasWork,
        pricing: false,
        credentials: false,
        links: false,
      });
    }

    loadProfile().catch((error) => {
      if (isMounted) {
        console.warn("Professional profile load failed.", error);
        setFeedback("We could not load your profile.");
        setFeedbackType("error");
      }
    });
    return () => { isMounted = false; };
  }, [user, reloadVersion]);

  function toggleArrayField(
    field: "serviceModes" | "availabilityWindows" | "goalTags" | "experienceLevelsServed",
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((entry) => entry !== value)
        : [...current[field], value],
    }));
  }

  function toggleSpecialty(specialty: string) {
    setForm((current) => ({
      ...current,
      selectedSpecialties: current.selectedSpecialties.includes(specialty)
        ? current.selectedSpecialties.filter((entry) => entry !== specialty)
        : [...current.selectedSpecialties, specialty],
    }));
  }

  function updateCategories(primaryCategoryStableId: string, additionalCategoryStableIds: string[]) {
    const selectedCategories = getMarketplaceTaxonomySelections(
      buildDistinctValues([primaryCategoryStableId, ...additionalCategoryStableIds]),
    );
    setForm((current) => ({
      ...current,
      primaryCategoryStableId,
      additionalCategoryStableIds,
      selectedSpecialties: retainAvailableSpecialties(current.selectedSpecialties, selectedCategories),
    }));
  }

  function addAdditionalCategory() {
    if (!additionalCategoryDraft || form.additionalCategoryStableIds.length >= 3) return;
    updateCategories(form.primaryCategoryStableId, [...form.additionalCategoryStableIds, additionalCategoryDraft]);
    setAdditionalCategoryDraft("");
  }

  function removeAdditionalCategory(stableId: string) {
    updateCategories(
      form.primaryCategoryStableId,
      form.additionalCategoryStableIds.filter((entry) => entry !== stableId),
    );
  }

  function updateService(id: string, updates: Partial<ServiceDraft>) {
    setServices((current) => current.map((service) => service.id === id ? { ...service, ...updates } : service));
  }

  function moveService(id: string, direction: -1 | 1) {
    setServices((current) => {
      const currentIndex = current.findIndex((service) => service.id === id);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

      const reordered = [...current];
      [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];
      return reordered;
    });
  }

  function updateCredential(id: string, updates: Partial<CredentialDraft>) {
    setCredentials((current) => current.map((credential) => credential.id === id ? { ...credential, ...updates } : credential));
  }

  function addService() {
    const service = {
      ...createEmptyServiceDraft(),
      currencyCode: normalizeCurrencyCode(form.currencyCode, getDefaultCurrencyCode(form.countryCode)),
    };
    setServices((current) => [...current, service]);
    setEditingServiceId(service.id);
  }

  function addCredential() {
    const credential = { ...createEmptyCredentialDraft(), countryCode: form.countryCode };
    setCredentials((current) => [...current, credential]);
    setEditingCredentialId(credential.id);
  }

  function addLanguage() {
    const language = languageDraft.trim();
    if (!language || form.languages.some((entry) => entry.toLowerCase() === language.toLowerCase())) return;
    setForm((current) => ({ ...current, languages: [...current.languages, language] }));
    setLanguageDraft("");
  }

  function toggleSection(section: ProfessionalSectionId) {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  }

  function updateCountry(nextCountryCode: string) {
    setForm((current) => {
      const countryCode = normalizeCountryCode(nextCountryCode);
      const previousDefaultCurrency = getDefaultCurrencyCode(current.countryCode);
      return {
        ...current,
        countryCode,
        state: "",
        serviceRadius: "25",
        currencyCode: current.currencyCode === previousDefaultCurrency
          ? getDefaultCurrencyCode(countryCode)
          : current.currencyCode,
      };
    });
  }

  function focusCompletenessItem(section: ProfessionalSectionId, fieldId: string) {
    setExpandedSections((current) => ({ ...current, [section]: true }));
    window.setTimeout(() => {
      document.getElementById(`profile-field-${fieldId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function choosePhoto(file: File | null) {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setFieldErrors((current) => ({ ...current, photo: "Choose a JPG, PNG, or WebP image." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((current) => ({ ...current, photo: "Choose an image smaller than 10 MB." }));
      return;
    }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setRemoveCurrentPhoto(false);
    setFieldErrors((current) => ({ ...current, photo: "" }));
  }

  async function chooseCredentialDocument(credentialId: string, file: File | null) {
    if (!file) return;
    const validation = await validateTrustEvidenceFile(file);
    if (!validation.valid) {
      setCredentialUploadFeedback((current) => ({
        ...current,
        [credentialId]: { kind: "error", message: validation.error },
      }));
      return;
    }
    setSelectedCredentialFiles((current) => ({ ...current, [credentialId]: file }));
    setCredentialUploadFeedback((current) => ({
      ...current,
        [credentialId]: { kind: "info", message: "Selected file is ready for private upload when you save." },
    }));
    trackEvent("credential_submission_started", { evidence_type: "document" });
  }

  async function uploadCredentialDocument(credential: CredentialDraft, file: File) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) throw new Error("Sign in again before uploading credential evidence.");
    const extension = CREDENTIAL_DOCUMENT_EXTENSIONS[file.type];
    if (!extension || file.size > CREDENTIAL_DOCUMENT_MAX_BYTES) {
      throw new Error("Credential evidence must be a PDF, JPG, PNG, or WebP file smaller than 8 MB.");
    }

    const storagePath = `${user.id}/${credential.id}/${crypto.randomUUID()}.${extension}`;
    setCredentialUploadFeedback((current) => ({
      ...current,
      [credential.id]: { kind: "info", message: "Uploading supporting document privately..." },
    }));
    const uploadResult = await supabase.storage.from(CREDENTIAL_DOCUMENT_BUCKET).upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (uploadResult.error) throw uploadResult.error;
    return storagePath;
  }

  async function viewCredentialDocument(credential: CredentialDraft) {
    const documentReference = credential.supportingDocumentUrl.trim();
    if (!user || !isPrivateCredentialPath(documentReference, user.id)) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setCredentialUploadFeedback((current) => ({
      ...current,
      [credential.id]: { kind: "info", message: "Creating a temporary private link..." },
    }));
    const signedUrlResult = await supabase.storage
      .from(CREDENTIAL_DOCUMENT_BUCKET)
      .createSignedUrl(documentReference, 300);
    if (signedUrlResult.error) {
      setCredentialUploadFeedback((current) => ({
        ...current,
        [credential.id]: { kind: "error", message: "The private document could not be opened. Try again." },
      }));
      return;
    }

    setCredentialUploadFeedback((current) => ({
      ...current,
      [credential.id]: { kind: "success", message: "Temporary access expires in 5 minutes." },
    }));
    window.open(signedUrlResult.data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function validateForm(isSubmission: boolean) {
    const errors: FieldErrors = {};
    const activeServices = services.filter((service) => service.isActive && service.name.trim());
    const urlFields = [
      ["website", form.websiteUrl], ["instagram", form.instagramUrl], ["facebook", form.facebookUrl], ["tiktok", form.tiktokUrl],
      ["youtube", form.youtubeUrl], ["linkedin", form.linkedinUrl],
    ];
    urlFields.forEach(([key, value]) => { if (!isValidOptionalUrl(value)) errors[key] = "Enter a complete http:// or https:// URL."; });
    if (form.websiteLinkText.trim().length > 80) {
      errors.websiteLinkText = "Keep website link text to 80 characters or fewer.";
    }
    if (form.publicHeadline.trim() && form.publicHeadline.trim().length < 10) errors.publicHeadline = "Use at least 10 characters for your headline.";
    if (form.publicHeadline.trim().length > 180) errors.publicHeadline = "Keep your headline to 180 characters or fewer.";
    if (form.bestFitSummary.trim().length > 700) errors.bestFitSummary = "Keep your best-fit summary to 700 characters or fewer.";
    if (form.serviceBoundaries.trim().length > 700) errors.serviceBoundaries = "Keep service boundaries to 700 characters or fewer.";
    if (form.consultationExpectations.trim().length > 1000) errors.consultationExpectations = "Keep consultation expectations to 1,000 characters or fewer.";
    const publicTextFields: Array<[string, string]> = [
      ["professionalTitle", form.professionalTitle],
      ["publicHeadline", form.publicHeadline],
      ["bestFitSummary", form.bestFitSummary],
      ["bio", form.bio],
      ["coachingStyle", form.coachingStyle],
      ["serviceBoundaries", form.serviceBoundaries],
      ["consultationExpectations", form.consultationExpectations],
    ];
    for (const [field, value] of publicTextFields) {
      const contentError = validatePublicProfessionalContent(value);
      if (contentError && !errors[field]) errors[field] = contentError;
    }
    if (credentials.some((credential) => !isValidOptionalUrl(credential.supportingReferenceUrl))) {
      errors.credentials = "Enter a complete http:// or https:// credential reference URL.";
    }

    if (form.yearsExperience && (!Number.isFinite(Number(form.yearsExperience)) || Number(form.yearsExperience) < 0)) {
      errors.yearsExperience = "Enter a valid number of years.";
    }
    if (offersInPerson && form.serviceRadius && (!Number.isFinite(Number(form.serviceRadius)) || Number(form.serviceRadius) < 1 || Number(form.serviceRadius) > 500)) {
      errors.location = `Enter a service radius between 1 and 500 ${distanceLabel}.`;
    }
    if (form.priceFrom && dollarsToCents(form.priceFrom) == null) errors.pricing = "Enter a valid starting price.";
    if (form.priceTo && dollarsToCents(form.priceTo) == null) errors.pricing = "Enter a valid maximum price.";
    if (form.priceFrom && form.priceTo && Number(form.priceTo) < Number(form.priceFrom)) errors.pricing = "Maximum price must be at least the starting price.";
    if (!/^[A-Z]{3}$/.test(form.currencyCode.trim().toUpperCase())) errors.pricing = "Enter a three-letter currency code such as USD or CAD.";
    for (const service of activeServices) {
      if (service.priceFrom && dollarsToCents(service.priceFrom) == null) errors.services = "Enter valid service pricing.";
      if (service.priceTo && service.priceFrom && Number(service.priceTo) < Number(service.priceFrom)) errors.services = "A service maximum price cannot be lower than its starting price.";
      if (service.durationMinutes && (!Number.isFinite(Number(service.durationMinutes)) || Number(service.durationMinutes) < 5)) errors.services = "Service duration must be at least 5 minutes.";
      if (service.intendedFor.trim().length > 500) errors.services = "Keep each intended-client description to 500 characters or fewer.";
      if (service.deliveryCadence.trim().length > 240 || service.minimumCommitment.trim().length > 240) errors.services = "Keep service cadence and commitment details to 240 characters or fewer.";
      if (service.additionalCostsNote.trim().length > 400) errors.services = "Keep additional cost notes to 400 characters or fewer.";
      const serviceTextError = [
        service.name,
        service.description,
        service.intendedFor,
        service.deliveryCadence,
        service.minimumCommitment,
        service.additionalCostsNote,
      ].map(validatePublicProfessionalContent).find(Boolean);
      if (serviceTextError) errors.services = serviceTextError;
    }

    if (isSubmission) {
      if (!form.displayName.trim()) errors.name = "Add your name.";
      if (!form.professionalTitle.trim()) errors.professionalTitle = "Add your professional title.";
      if (!(photoPreviewUrl || (form.profilePhotoUrl && !removeCurrentPhoto))) errors.photo = "Add a profile photo.";
      if (!form.bio.trim()) errors.bio = "Add a bio that helps clients understand your work.";
      if (!form.publicHeadline.trim()) errors.publicHeadline = "Add a short profile headline.";
      if (!form.bestFitSummary.trim()) errors.bestFitSummary = "Describe who you work best with.";
      if (form.goalTags.length === 0) errors.goals = "Choose at least one client goal.";
      if (form.experienceLevelsServed.length === 0) errors.experienceLevels = "Choose at least one experience level you serve.";
      if (!form.primaryCategoryStableId) errors.primaryCategory = "Choose a primary category.";
      if (form.selectedSpecialties.length === 0) errors.specialties = "Choose at least one specialty.";
      if (form.serviceModes.length === 0) errors.serviceModes = "Choose at least one service mode.";
      const needsLocation = form.serviceModes.includes("in_person") || form.serviceModes.includes("hybrid");
      if (needsLocation && !form.city.trim()) errors.location = "Add a city for in-person services.";
      if (needsLocation && isRegionRequired(form.countryCode) && !form.state.trim()) {
        errors.location = `Add a ${regionLabel.toLowerCase()} for in-person services.`;
      }
      if (activeServices.length === 0) errors.services = "Add at least one service.";
      const hasPricingContext = Boolean(form.contactForPricing || form.priceFrom.trim())
        || activeServices.some((service) => Boolean(service.contactForPricing || service.priceFrom.trim()));
      if (!hasPricingContext) errors.services = "Add a starting price or choose Contact for pricing.";
      if (form.availabilityWindows.length === 0) errors.availability = "Choose at least one typical availability window.";
      if (!form.acceptanceStatus) errors.acceptance = "Choose your new-client status.";
      if (!form.consultationExpectations.trim()) errors.consultationExpectations = "Explain what a client can expect after requesting a consultation.";
      if (!hasAcceptedProfessionalTerms) errors.terms = "Confirm the professional marketplace terms before submitting.";
    }
    return errors;
  }

  function showValidationErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    const firstKey = Object.keys(errors)[0];
    if (!firstKey) return;

    const sectionByField: Partial<Record<string, ProfessionalSectionId>> = {
      name: "about",
      professionalTitle: "about",
      photo: "about",
      bio: "about",
      yearsExperience: "about",
      publicHeadline: "fit",
      bestFitSummary: "fit",
      goals: "fit",
      experienceLevels: "fit",
      coachingStyle: "fit",
      serviceBoundaries: "fit",
      primaryCategory: "offer",
      specialties: "offer",
      services: "offer",
      serviceModes: "work",
      location: "work",
      acceptance: "work",
      availability: "work",
      consultationExpectations: "work",
      pricing: "pricing",
      website: "links",
      websiteLinkText: "links",
      instagram: "links",
      facebook: "links",
      tiktok: "links",
      youtube: "links",
      linkedin: "links",
      credentials: "credentials",
    };
    const targetSection = sectionByField[firstKey];
    if (targetSection) setExpandedSections((current) => ({ ...current, [targetSection]: true }));
    window.setTimeout(() => {
      document.getElementById(`profile-field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  async function uploadProfilePhoto(): Promise<UploadedProfilePhoto | null> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user || !selectedPhotoFile) return null;
    const extension = selectedPhotoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const filePath = `${user.id}/profile_${selectedPhotoFile.lastModified}_${selectedPhotoFile.size}.${extension}`;
    const uploadResult = await supabase.storage.from("profile-photos").upload(filePath, selectedPhotoFile, { cacheControl: "3600", upsert: true });
    if (uploadResult.error) throw uploadResult.error;
    const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
    return { publicUrl: data.publicUrl, storagePath: filePath };
  }

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  async function retryPropagation() {
    const result = await saveProfessionalSection({ action: "retry" });
    setPropagationDelayed(result.propagation !== "current");
    setFeedback(result.propagation === "current" ? publicationCopy.propagated : publicationCopy.delayed);
  }

  async function handleSave(nextStatus: "draft" | "pending_review") {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback("Marketplace auth is not configured yet.");
      setFeedbackType("error");
      return;
    }
    if (approvalStatus === "suspended") {
      setFeedback("This profile is suspended and cannot be edited until Elevare completes a review.");
      setFeedbackType("error");
      return;
    }

    if (
      nextStatus === "pending_review"
      && !hasCompatibleVerifiedCredential(form.professionalTitle, credentials)
    ) {
      setFieldErrors({ professionalTitle: REGULATED_TITLE_REVIEW_MESSAGE });
      setExpandedSections((current) => ({ ...current, about: true, credentials: true }));
      setFeedback(REGULATED_TITLE_REVIEW_MESSAGE);
      setFeedbackType("error");
      return;
    }

    const errors = validateForm(nextStatus === "pending_review");
    if (Object.keys(errors).length > 0) {
      showValidationErrors(errors);
      setFeedback("Review the highlighted fields, then try again.");
      setFeedbackType("error");
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    setFieldErrors({});
    let uploadedPhoto: UploadedProfilePhoto | null = null;
    let previousPhotoStoragePath: string | null = null;
    const newlyUploadedCredentialPaths: string[] = [];
    let credentialRecordsSaved = false;
    let committed = false;
    let mutationMayHaveCommitted = false;
    try {
      const appUser = await getMarketplaceAppUserByAuthId(supabase, user.id);
      if (!appUser) throw new Error("We could not find your marketplace account.");
      previousPhotoStoragePath = appUser.profile_photo_storage_path;
      const photoUpload = await uploadProfilePhoto();
      uploadedPhoto = photoUpload;
      const profilePhotoUrl = photoUpload?.publicUrl ?? (removeCurrentPhoto ? null : form.profilePhotoUrl || null);
      const profilePhotoStoragePath = photoUpload?.storagePath ?? (removeCurrentPhoto ? null : appUser.profile_photo_storage_path);

      const photoPayload = photoUpload || removeCurrentPhoto ? {
        profile_photo_url: profilePhotoUrl, profile_photo_storage_path: profilePhotoStoragePath,
      } : null;

      const orderedCategoryStableIds = buildDistinctValues([
        form.primaryCategoryStableId,
        ...form.additionalCategoryStableIds.filter((entry) => entry !== form.primaryCategoryStableId),
      ]);
      let selectedCategories: ServiceCategoryLookupRow[] = [];
      if (orderedCategoryStableIds.length > 0) {
        const categoryResult = await supabase.from("service_categories")
          .select("id,slug,public_slug").in("slug", orderedCategoryStableIds);
        if (categoryResult.error) throw categoryResult.error;
        selectedCategories = orderedCategoryStableIds
          .map((stableId) => ((categoryResult.data ?? []) as ServiceCategoryLookupRow[]).find((entry) => entry.slug === stableId) ?? null)
          .filter((entry): entry is ServiceCategoryLookupRow => Boolean(entry));
        if (selectedCategories.length !== orderedCategoryStableIds.length) throw new Error("One or more selected categories are not available. Refresh and try again.");
      }

      const legacySpecialties = deriveLegacySpecialties(form.primaryCategoryStableId, form.selectedSpecialties);
      const countryCode = normalizeCountryCode(form.countryCode);
      const currencyCode = normalizeCurrencyCode(form.currencyCode, getDefaultCurrencyCode(countryCode));
      const profilePayload = {
        public_display_name: form.displayName.trim() || null,
        professional_title: form.professionalTitle.trim() || null,
        public_headline: form.publicHeadline.trim() || null,
        best_fit_summary: form.bestFitSummary.trim() || null,
        bio: form.bio.trim() || null,
        years_experience: form.yearsExperience ? Number(form.yearsExperience) : null,
        marketplace_goal_tags: form.goalTags,
        experience_levels_served: form.experienceLevelsServed,
        coaching_style: form.coachingStyle.trim() || null,
        service_boundaries: form.serviceBoundaries.trim() || null,
        consultation_expectations: form.consultationExpectations.trim() || null,
        location_city: form.city.trim() || null,
        location_state: form.state || null,
        country_code: countryCode,
        postal_code: form.postalCode.trim() || null,
        primary_specialty: legacySpecialties.primary,
        secondary_specialties: legacySpecialties.secondary,
        marketplace_specialties: form.selectedSpecialties,
        modality: deriveTrainerModality(form.serviceModes, form.serviceModes.includes("online") || form.serviceModes.includes("hybrid")),
        accepting_clients: form.acceptanceStatus !== "not_accepting",
        client_acceptance_status: form.acceptanceStatus,
        typical_availability: form.availabilityWindows,
        availability_details: form.availabilityDetails.trim() || null,
        marketplace_price_min_cents: form.contactForPricing ? null : dollarsToCents(form.priceFrom),
        marketplace_price_max_cents: form.contactForPricing ? null : dollarsToCents(form.priceTo),
        marketplace_pricing_basis: form.contactForPricing ? null : form.pricingBasis || null,
        marketplace_currency_code: currencyCode,
        contact_for_pricing: form.contactForPricing,
        website_url: form.websiteUrl.trim() || null,
        social_links: {
          website_label: form.websiteLinkText.trim() || null,
          instagram: form.instagramUrl.trim() || null,
          facebook: form.facebookUrl.trim() || null,
          tiktok: form.tiktokUrl.trim() || null,
          youtube: form.youtubeUrl.trim() || null,
          linkedin: form.linkedinUrl.trim() || null,
        },
        languages: form.languages,
      };
      const categoryPayload = selectedCategories.map((category, index) => ({ service_category_id: category.id, is_primary: index === 0 }));
      let locationPayload: Record<string, unknown> | null = null;
      const hasLocation = offersInPerson || Boolean(form.city.trim() || form.state || form.serviceArea.trim() || form.postalCode.trim());
      if (hasLocation) {
        const serviceRadiusMeters = offersInPerson && form.serviceRadius
          ? distanceToMeters(Number(form.serviceRadius), getDistanceUnit(countryCode))
          : null;
        locationPayload = {
          ...(primaryLocationId ? { id: primaryLocationId } : {}),
          location_name: form.serviceArea.trim() || null,
          location_city: form.city.trim() || null,
          location_state: form.state || null,
          country_code: countryCode,
          postal_code: form.postalCode.trim() || null,
          service_radius_meters: serviceRadiusMeters,
          service_radius_miles: serviceRadiusMeters == null ? null : Math.round(metersToMiles(serviceRadiusMeters)),
          is_primary: true,
        };
      }

      const activeServices = services.filter((service) => service.name.trim());
      const servicePayload = activeServices.map((service, index) => ({
          id: service.id,
          name: service.name.trim(),
          description: service.description.trim() || null,
          service_mode: service.serviceMode || null,
          duration_minutes: service.durationMinutes ? Number(service.durationMinutes) : null,
          price_min_cents: service.contactForPricing ? null : dollarsToCents(service.priceFrom),
          price_max_cents: service.contactForPricing ? null : dollarsToCents(service.priceTo),
          pricing_basis: service.contactForPricing ? null : service.pricingBasis || null,
          currency_code: currencyCode,
          contact_for_pricing: service.contactForPricing,
          is_active: service.isActive,
          sort_order: index,
          intended_for: service.intendedFor.trim() || null,
          included_items: buildDistinctValues(service.includedItems.split(/\r?\n/)),
          delivery_cadence: service.deliveryCadence.trim() || null,
          minimum_commitment: service.minimumCommitment.trim() || null,
          consultation_type: service.consultationType,
          additional_costs_note: service.additionalCostsNote.trim() || null,
        }));
      const activeCredentials = credentials.filter((credential) => credential.organizationName.trim() && credential.credentialName.trim());
      const savedCredentialDocumentPaths = new Map<string, string>();
      const replacedCredentialDocumentPaths: string[] = [];
      const credentialRows: Array<Record<string, unknown>> = [];
      if (activeCredentials.length > 0) {
        for (const credential of activeCredentials) {
          let documentReference = credential.supportingDocumentUrl.trim();
          const selectedFile = selectedCredentialFiles[credential.id];
          if (selectedFile) {
            try {
              const uploadedPath = await uploadCredentialDocument(credential, selectedFile);
              newlyUploadedCredentialPaths.push(uploadedPath);
              savedCredentialDocumentPaths.set(credential.id, uploadedPath);
              if (isPrivateCredentialPath(documentReference, user.id) && documentReference !== uploadedPath) {
                replacedCredentialDocumentPaths.push(documentReference);
              }
              documentReference = uploadedPath;
            } catch (error) {
              setCredentialUploadFeedback((current) => ({
                ...current,
                [credential.id]: {
                  kind: "error",
                  message: "The private document upload failed.",
                },
              }));
              throw error;
            }
          }

          credentialRows.push({
            id: credential.id,
            cert_name: credential.credentialName.trim(),
            issuing_body: credential.organizationName.trim(),
            cert_org: credential.organizationName.trim(),
            credential_type: credential.credentialType.trim() || null,
            credential_number: credential.credentialNumber.trim() || null,
            cert_id: credential.credentialNumber.trim() || null,
            issue_date: credential.issueDate || null,
            expiration_date: credential.expirationDate || null,
            expiry_date: credential.expirationDate || null,
            document_url: documentReference || null,
            supporting_reference_url: credential.supportingReferenceUrl.trim() || null,
            credential_country_code: normalizeCountryCode(credential.countryCode, countryCode),
            credential_jurisdiction: credential.jurisdiction.trim() || null,
            public_display: credential.publicDisplay,
            is_active: true,
          });
        }

      }
      if (nextStatus === "pending_review") {
        const localeUpdate = await supabase.auth.updateUser({ data: { professional_signup_locale: locale } });
        if (localeUpdate.error) throw localeUpdate.error;
      }
      mutationMayHaveCommitted = true;
      const result = await saveProfessionalSection({
        action: "profile", version: profileVersion,
        profile: { profile: profilePayload, photo: photoPayload, categories: categoryPayload,
          location: locationPayload, services: servicePayload, credentials: credentialRows,
          submit: nextStatus === "pending_review", attestationVersion: PROFESSIONAL_ATTESTATION_VERSION, country: countryCode },
      });
      if (result.error) {
        mutationMayHaveCommitted = !["conflict", "save_failed", "unauthorized", "invalid_request"].includes(result.error.code);
        if (result.error.code === "conflict" || result.error.code === "network") setSaveConflict(true);
        throw new Error(result.error.code);
      }
      committed = true;
      resetSavedFormSnapshot.current = true;
      credentialRecordsSaved = true;
      const saved = result.data as { profile: TrainerProfileRow; status: TrainerProfileStatusRow; locationId: string | null; credentials: CertificationRow[] };
      const profileId = saved.profile.id;
      const savedSlug = saved.profile.public_slug ?? profileSlug;
      setProfileVersion(saved.profile.updated_at);
      setPublicProfileId(profileId);
      setProfileSlug(savedSlug);
      setPrimaryLocationId(saved.locationId);
      setForm((current) => ({ ...current, profilePhotoUrl: profilePhotoUrl ?? "",
        bio: saved.profile.bio ?? "", publicHeadline: saved.profile.public_headline ?? "",
        bestFitSummary: saved.profile.best_fit_summary ?? "",
        acceptanceStatus: saved.profile.client_acceptance_status ?? "accepting",
        displayName: saved.profile.public_display_name ?? "", professionalTitle: saved.profile.professional_title ?? "",
        yearsExperience: saved.profile.years_experience == null ? "" : String(saved.profile.years_experience),
        selectedSpecialties: parseStringArray(saved.profile.marketplace_specialties),
        goalTags: parseStringArray(saved.profile.marketplace_goal_tags),
        experienceLevelsServed: parseStringArray(saved.profile.experience_levels_served),
        coachingStyle: saved.profile.coaching_style ?? "",
        serviceBoundaries: saved.profile.service_boundaries ?? "",
        consultationExpectations: saved.profile.consultation_expectations ?? "",
        countryCode: saved.profile.country_code ?? countryCode,
        city: saved.profile.location_city ?? "", state: saved.profile.location_state ?? "",
        postalCode: saved.profile.postal_code ?? "",
        availabilityWindows: parseStringArray(saved.profile.typical_availability),
        availabilityDetails: saved.profile.availability_details ?? "",
        priceFrom: saved.profile.marketplace_price_min_cents == null ? "" : String(saved.profile.marketplace_price_min_cents / 100),
        priceTo: saved.profile.marketplace_price_max_cents == null ? "" : String(saved.profile.marketplace_price_max_cents / 100),
        pricingBasis: saved.profile.marketplace_pricing_basis ?? "",
        contactForPricing: Boolean(saved.profile.contact_for_pricing),
        currencyCode: saved.profile.marketplace_currency_code ?? currencyCode,
        websiteUrl: saved.profile.website_url ?? "",
        websiteLinkText: getJsonString(saved.profile.social_links, "website_label"),
        instagramUrl: getJsonString(saved.profile.social_links, "instagram"),
        facebookUrl: getJsonString(saved.profile.social_links, "facebook"),
        tiktokUrl: getJsonString(saved.profile.social_links, "tiktok"),
        youtubeUrl: getJsonString(saved.profile.social_links, "youtube"),
        linkedinUrl: getJsonString(saved.profile.social_links, "linkedin"),
        languages: parseStringArray(saved.profile.languages),
      }));
      setCredentials((current) => current.map((credential) => {
        const confirmed = saved.credentials.find((row) => row.id === credential.id);
        return confirmed ? { ...credential, verificationStatus: confirmed.verification_status ?? "pending",
          supportingDocumentUrl: savedCredentialDocumentPaths.get(credential.id) ?? credential.supportingDocumentUrl } : credential;
      }));
      setSelectedCredentialFiles({});
      setSaveConflict(false);
      setIsDirty(false);
      setPropagationDelayed(result.propagation === "delayed");
      const statusResult = { data: saved.status };
      if (statusResult.data) {
        const status = statusResult.data as TrainerProfileStatusRow;
        setApprovalStatus(status.marketplace_status);
        setStatusMessageOverride(status.status_message);
        setIsPubliclyListed(Boolean(status.is_publicly_listed));
        setReviewFeedbackPublic(status.review_feedback_public);
        setProfileSlug(status.public_slug ?? savedSlug);
      } else if (nextStatus === "pending_review") {
        setApprovalStatus("pending_review");
      }

      setSelectedPhotoFile(null);
      setRemoveCurrentPhoto(false);
      setHasAcceptedProfessionalTerms(false);
      setEditingServiceId(null);
      setEditingCredentialId(null);
      setFeedback(nextStatus === "pending_review"
        ? "Profile submitted. Your profile is under review and will not appear in Elevare search until it is approved."
        : publicationCopy.pending);
      if (result.propagation === "delayed") setFeedback(publicationCopy.delayed);
      setFeedbackType("success");
      trackEvent(nextStatus === "pending_review" ? "professional_profile_submitted" : "professional_profile_draft_saved", {
        has_services: activeServices.length > 0,
        accepting_status: form.acceptanceStatus,
      });
      if (!publicProfileId) trackEvent("professional_profile_created", { source_page: "professional_profile_editor" });

      if (
        previousPhotoStoragePath
        && previousPhotoStoragePath.startsWith(`${user.id}/`)
        && previousPhotoStoragePath !== uploadedPhoto?.storagePath
        && (uploadedPhoto || removeCurrentPhoto)
      ) {
        const cleanupResult = await supabase.storage.from("profile-photos").remove([previousPhotoStoragePath]);
        if (cleanupResult.error) {
          console.warn("The profile was saved, but the replaced photo could not be removed.");
        }
      }
    } catch (error) {
      if (!committed && !mutationMayHaveCommitted && uploadedPhoto?.storagePath) {
        await supabase.storage.from("profile-photos").remove([uploadedPhoto.storagePath]);
      }
      if (!committed && !mutationMayHaveCommitted && !credentialRecordsSaved && newlyUploadedCredentialPaths.length > 0) {
        const cleanupResult = await supabase.storage.from(CREDENTIAL_DOCUMENT_BUCKET).remove(newlyUploadedCredentialPaths);
        if (cleanupResult.error) console.warn("An incomplete credential upload could not be cleaned up.");
      }
      console.warn("Professional profile save failed.", { category: "save_or_conflict" });
      setFeedback(committed ? publicationCopy.delayed : error instanceof Error && error.message === "conflict" ? publicationCopy.conflict
        : error instanceof Error && error.message === "network" ? publicationCopy.uncertain : publicationCopy.failed);
      setFeedbackType("error");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isConfigured) return <article className="callout"><span className="meta-pill">{t("Configuration needed")}</span><h2>{t("Marketplace access is not configured yet.")}</h2><p>{t("Profile access is temporarily unavailable. Please try again later.")}</p></article>;
  if (isLoading) return <article className="callout"><span className="meta-pill">{t("Loading")}</span><h2>{t("Loading your profile.")}</h2><p>{t("One moment while we check your marketplace account.")}</p></article>;
  if (!user) return <article className="callout"><span className="meta-pill">{t("Pro Profile")}</span><h2>{t("Sign in to create your Pro Profile.")}</h2><div className="button-row"><Link className="button button-primary" href={`/sign-in/?redirect=${encodeURIComponent(localizePathname("/account/professional-profile/", locale))}`}>{t("Sign in")}</Link></div></article>;

  const approvalLabel = localizeApprovalStatus(approvalStatus, locale);
  const statusMessage = statusMessageOverride ?? getProfessionalStatusMessage(approvalStatus, reviewFeedbackPublic);
  const previewPhoto = removeCurrentPhoto ? "" : photoPreviewUrl || form.profilePhotoUrl;
  const activePreviewServices = services.filter((service) => service.isActive && service.name.trim());
  const selectedPrimaryCategoryRecord = selectedTaxonomyCategories[0];
  const selectedPrimaryCategory = selectedPrimaryCategoryRecord
    ? getMarketplaceCategoryCopy(selectedPrimaryCategoryRecord.publicSlug, locale)?.label ?? selectedPrimaryCategoryRecord.label
    : t("No primary category selected");
  const selectedModeLabels = SERVICE_MODE_OPTIONS
    .filter((option) => form.serviceModes.includes(option.value))
    .map((option) => localizeServiceMode(option.value, locale));
  const selectedAcceptanceLabel = ACCEPTANCE_OPTIONS.find((option) => option.value === form.acceptanceStatus)?.label;
  const completeSectionIds = new Set(
    completeness.items.filter((item) => item.complete).map((item) => item.section),
  );
  const incompleteSectionIds = new Set(
    completeness.items.filter((item) => !item.complete).map((item) => item.section),
  );
  const sectionIsComplete = (section: ProfessionalSectionId) => (
    completeSectionIds.has(section) && !incompleteSectionIds.has(section)
  );
  const listedLinkCount = [form.websiteUrl, form.instagramUrl, form.facebookUrl, form.tiktokUrl, form.youtubeUrl, form.linkedinUrl]
    .filter((value) => value.trim()).length;

  return (
    <section className="section professional-profile-builder" onChangeCapture={() => setIsDirty(true)}>
      <fieldset disabled={isSaving} style={{ display: "contents" }} aria-label={t("Professional profile")}>
      <article className="panel professional-builder-intro">
        <div className="section-head tool-form-head">
          <div className="eyebrow">{t("Pro Profile")}</div>
          <h2 className="section-title">{t("Build a profile clients can trust and understand.")}</h2>
          <p className="section-copy">{t("Show clients what you offer, how you work, and why you're a good fit.")}</p>
        </div>
        <div className="marketplace-status-row">
          <span className="status-chip">{t("Status")}: {approvalLabel}</span>
          {isPubliclyListed && profileSlug ? <Link className="hero-text-link" href={localizePathname(buildProfessionalPath(profileSlug), locale)}>{t("View live profile")}</Link> : null}
        </div>
        <div className="form-note">{t(statusMessage)}</div>
        {publicProfileId ? (
          <div className="professional-profile-view-stat" aria-label={t("Recorded profile page views")}>
            <div>
              <span className="stat-label">{t("Recorded profile page views")}</span>
              <strong className={!profileViewCount ? "profile-view-empty" : undefined}>{profileViewCount === undefined ? t("Loading views...") : profileViewCount === null ? t("Views unavailable") : profileViewCount === 0 ? t("No recorded views yet") : new Intl.NumberFormat(locale).format(profileViewCount)}</strong>
            </div>
            <p>{t(isPubliclyListed
              ? "Page visits, not unique people. Repeat visits may count. Some visits aren't included because of visitors' privacy choices."
              : "Views will begin counting once your profile is live.")}</p>
          </div>
        ) : null}
      </article>

      <article className="panel profile-form-section" aria-labelledby="about-you-heading">
        <ProfessionalSectionHeader
          id="about-you-heading"
          eyebrow={t("About you")}
          title={t("Introduce yourself clearly.")}
          summary={`${form.displayName || t("Add your name")} · ${form.professionalTitle || t("Add your professional title")}`}
          complete={sectionIsComplete("about")}
          expanded={expandedSections.about}
          onToggle={() => toggleSection("about")}
          translate={t}
        />
        {expandedSections.about ? (
          <div className="tool-form-grid marketplace-editor-grid professional-section-body">
            <label id="profile-field-name" className="field"><span className="field-label">{t("Name")} <span aria-hidden="true">*</span></span><input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Jane Smith" /><FieldError name="name" errors={fieldErrors} translate={t} /></label>
            <label id="profile-field-professionalTitle" className="field"><span className="field-label">{t("Professional title")} <span aria-hidden="true">*</span></span><span className="field-help">{t("Personal Trainer, Competition Prep Coach, Registered Dietitian, Life Coach...")}</span><input value={form.professionalTitle} onChange={(event) => setForm((current) => ({ ...current, professionalTitle: event.target.value }))} placeholder={t("Competition Prep Coach")} /><FieldError name="professionalTitle" errors={fieldErrors} translate={t} /></label>
            <label id="profile-field-yearsExperience" className="field"><span className="field-label">{t("Years of experience")}</span><input type="number" min="0" value={form.yearsExperience} onChange={(event) => setForm((current) => ({ ...current, yearsExperience: event.target.value }))} placeholder="8" /><FieldError name="yearsExperience" errors={fieldErrors} translate={t} /></label>
            <div id="profile-field-photo" className="field field-full"><span className="field-label">{t("Profile photo")} <span aria-hidden="true">*</span></span><div className="profile-photo-uploader">{previewPhoto ? <img src={previewPhoto} alt={t("Profile preview")} /> : <div className="profile-photo-placeholder">{t("Add a clear photo")}</div>}<div className="profile-photo-actions"><input ref={photoInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)} /><button type="button" className="button button-secondary" onClick={() => photoInputRef.current?.click()}>{previewPhoto ? t("Change photo") : t("Upload photo")}</button>{previewPhoto ? <button type="button" className="hero-text-link" onClick={() => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl); setPhotoPreviewUrl(""); setSelectedPhotoFile(null); setRemoveCurrentPhoto(true); }}>{t("Remove")}</button> : null}<span className="field-help">{t("JPG, PNG or WebP. A clear square photo works best.")}</span></div></div><FieldError name="photo" errors={fieldErrors} translate={t} /></div>
            <label id="profile-field-bio" className="field field-full"><span className="field-label">{t("Bio")} <span aria-hidden="true">*</span></span><span className="field-help">{t("Tell clients who you help, what you specialize in, and what it is like to work with you. Recommended: 100-500 words.")}</span><textarea rows={7} value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder={t("Describe your clients, approach, and the experience you create.")} /><span className="field-help">{bioWordCount} {t("words")}</span><FieldError name="bio" errors={fieldErrors} translate={t} /></label>
          </div>
        ) : null}
      </article>

      <article className="panel profile-form-section" aria-labelledby="fit-heading">
        <ProfessionalSectionHeader
          id="fit-heading"
          eyebrow={t("Client fit")}
          title={t("Help clients decide whether you fit their goals.")}
          summary={form.publicHeadline || t("Add a clear headline and client fit details")}
          complete={sectionIsComplete("fit")}
          expanded={expandedSections.fit}
          onToggle={() => toggleSection("fit")}
          translate={t}
        />
        {expandedSections.fit ? <div className="professional-section-body">
          <div className="tool-form-grid marketplace-editor-grid">
            <label id="profile-field-publicHeadline" className="field field-full"><span className="field-label">{t("Profile headline")} <span aria-hidden="true">*</span></span><span className="field-help">{t("Summarize the outcome or support you provide without making guarantees.")}</span><input maxLength={180} value={form.publicHeadline} onChange={(event) => setForm((current) => ({ ...current, publicHeadline: event.target.value }))} placeholder={t("Strength coaching for busy adults who want a clear, sustainable plan")} /><FieldError name="publicHeadline" errors={fieldErrors} translate={t} /></label>
            <label id="profile-field-bestFitSummary" className="field field-full"><span className="field-label">{t("Who I work best with")} <span aria-hidden="true">*</span></span><textarea maxLength={700} rows={4} value={form.bestFitSummary} onChange={(event) => setForm((current) => ({ ...current, bestFitSummary: event.target.value }))} placeholder={t("Describe the clients, goals, and working relationship that are the best fit for your services.")} /><FieldError name="bestFitSummary" errors={fieldErrors} translate={t} /></label>
          </div>
          <div id="profile-field-goals" className="profile-subsection"><span className="field-label">{t("Client goals")} <span aria-hidden="true">*</span></span><span className="field-help">{t("Choose the goals your services are designed to support.")}</span><div className="toggle-row">{PROFESSIONAL_GOAL_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={form.goalTags.includes(option.value)} className={`toggle-chip${form.goalTags.includes(option.value) ? " is-active" : ""}`} onClick={() => toggleArrayField("goalTags", option.value)}>{t(option.label)}</button>)}</div><FieldError name="goals" errors={fieldErrors} translate={t} /></div>
          <div id="profile-field-experienceLevels" className="profile-subsection"><span className="field-label">{t("Experience levels served")} <span aria-hidden="true">*</span></span><div className="toggle-row">{PROFESSIONAL_EXPERIENCE_LEVEL_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={form.experienceLevelsServed.includes(option.value)} className={`toggle-chip${form.experienceLevelsServed.includes(option.value) ? " is-active" : ""}`} onClick={() => toggleArrayField("experienceLevelsServed", option.value)}>{t(option.label)}</button>)}</div><FieldError name="experienceLevels" errors={fieldErrors} translate={t} /></div>
          <div className="tool-form-grid marketplace-editor-grid">
            <label id="profile-field-coachingStyle" className="field field-full"><span className="field-label">{t("Approach and coaching style")} <span className="field-optional">{t("Optional")}</span></span><textarea rows={4} value={form.coachingStyle} onChange={(event) => setForm((current) => ({ ...current, coachingStyle: event.target.value }))} placeholder={t("Explain how you communicate, structure accountability, and adapt your work to the client.")} /><FieldError name="coachingStyle" errors={fieldErrors} translate={t} /></label>
            <label id="profile-field-serviceBoundaries" className="field field-full"><span className="field-label">{t("Service boundaries")} <span className="field-optional">{t("Optional")}</span></span><span className="field-help">{t("Clarify what you do not provide, such as medical care or services outside your qualifications.")}</span><textarea maxLength={700} rows={3} value={form.serviceBoundaries} onChange={(event) => setForm((current) => ({ ...current, serviceBoundaries: event.target.value }))} /><FieldError name="serviceBoundaries" errors={fieldErrors} translate={t} /></label>
          </div>
        </div> : null}
      </article>

      <article className="panel profile-form-section" aria-labelledby="offer-heading">
        <ProfessionalSectionHeader
          id="offer-heading"
          eyebrow={t("What you offer")}
          title={t("Help the right clients find you.")}
          summary={`${selectedPrimaryCategory} · ${form.selectedSpecialties.length} ${t(form.selectedSpecialties.length === 1 ? "specialty" : "specialties")} · ${activePreviewServices.length} ${t(activePreviewServices.length === 1 ? "service" : "services")}`}
          complete={sectionIsComplete("offer")}
          expanded={expandedSections.offer}
          onToggle={() => toggleSection("offer")}
          translate={t}
        />
        {expandedSections.offer ? <div className="professional-section-body">
          <label id="profile-field-primaryCategory" className="field field-full"><span className="field-label">{t("Primary category")} <span aria-hidden="true">*</span></span><select value={form.primaryCategoryStableId} onChange={(event) => updateCategories(event.target.value, form.additionalCategoryStableIds.filter((entry) => entry !== event.target.value))}><option value="">{t("Select a primary category")}</option>{MARKETPLACE_TAXONOMY_CATEGORIES.map((category) => <option key={category.stableId} value={category.stableId}>{getMarketplaceCategoryCopy(category.publicSlug, locale)?.label ?? category.label}</option>)}</select><FieldError name="primaryCategory" errors={fieldErrors} translate={t} /></label>
          <div className="profile-subsection"><span className="field-label">{t("Additional categories")}</span><span className="field-help">{t("Optional. Add up to three categories that genuinely describe your services.")}</span>{form.additionalCategoryStableIds.length > 0 ? <div className="professional-selection-tags">{form.additionalCategoryStableIds.map((stableId) => { const category = MARKETPLACE_TAXONOMY_CATEGORIES.find((entry) => entry.stableId === stableId); const categoryLabel = category ? getMarketplaceCategoryCopy(category.publicSlug, locale)?.label ?? category.label : stableId; return <button key={stableId} type="button" className="selection-tag" onClick={() => removeAdditionalCategory(stableId)} aria-label={`${t("Remove")} ${categoryLabel}`}>{categoryLabel}<span aria-hidden="true">×</span></button>; })}</div> : null}<div className="professional-inline-add"><select aria-label={t("Additional category")} value={additionalCategoryDraft} disabled={!form.primaryCategoryStableId || form.additionalCategoryStableIds.length >= 3} onChange={(event) => setAdditionalCategoryDraft(event.target.value)}><option value="">{t("Choose a category")}</option>{availableAdditionalCategories.map((category) => <option key={category.stableId} value={category.stableId}>{getMarketplaceCategoryCopy(category.publicSlug, locale)?.label ?? category.label}</option>)}</select><button type="button" className="button button-secondary" disabled={!additionalCategoryDraft || form.additionalCategoryStableIds.length >= 3} onClick={addAdditionalCategory}>{t("+ Add category")}</button></div></div>
          <div id="profile-field-specialties" className="profile-subsection"><span className="field-label">{t("Specialties")} <span aria-hidden="true">*</span></span><span className="field-help">{t("Choose specialties from your selected categories. These do not imply a verified credential.")}</span>{form.selectedSpecialties.length > 0 ? <div className="professional-selection-tags">{form.selectedSpecialties.map((specialty) => <button key={specialty} type="button" className="selection-tag" onClick={() => toggleSpecialty(specialty)} aria-label={`${t("Remove")} ${localizeMarketplaceSpecialty(specialty, locale)}`}>{localizeMarketplaceSpecialty(specialty, locale)}<span aria-hidden="true">×</span></button>)}</div> : null}{selectedTaxonomyCategories.length > 0 ? <details className="professional-compact-selector" open={form.selectedSpecialties.length === 0}><summary>{t("Choose specialties")}</summary><div className="toggle-row">{availableSpecialties.map((specialty) => <button key={specialty} type="button" aria-pressed={form.selectedSpecialties.includes(specialty)} className={`toggle-chip${form.selectedSpecialties.includes(specialty) ? " is-active" : ""}`} onClick={() => toggleSpecialty(specialty)}>{localizeMarketplaceSpecialty(specialty, locale)}</button>)}</div></details> : <div className="form-note">{t("Choose a category to see its specialties.")}</div>}<FieldError name="specialties" errors={fieldErrors} translate={t} /></div>
          {selectedCategoryNotes.map((note) => <div key={note} className="form-note">{t(note)}</div>)}
          <div id="profile-field-services" className="profile-subsection">
            <span className="field-label">{t("Services")} <span aria-hidden="true">*</span></span>
            <span className="field-help">{t("Service-level pricing is what clients will see first. Duration is optional.")}</span>
            <div className="editor-stack">{services.map((service, index) => {
              const isEditing = editingServiceId === service.id || !service.name.trim();
              const modeLabel = service.serviceMode ? localizeServiceMode(service.serviceMode, locale) : t("Flexible");
              return isEditing ? <div key={service.id} className="nested-editor-card">
                <div className="nested-editor-head"><strong>{service.name.trim() || `${t("Service")} ${index + 1}`}</strong><button type="button" className="hero-text-link" onClick={() => { setServices((current) => current.filter((entry) => entry.id !== service.id)); setEditingServiceId(null); }}>{t("Remove")}</button></div>
                <div className="tool-form-grid marketplace-editor-grid">
                  <label className="field"><span className="field-label">{t("Service name")}</span><input value={service.name} onChange={(event) => updateService(service.id, { name: event.target.value })} placeholder={t("60-Minute Personal Training")} /></label>
                  <label className="field"><span className="field-label">{t("Service mode")}</span><select value={service.serviceMode} onChange={(event) => updateService(service.id, { serviceMode: event.target.value })}><option value="">{t("Flexible")}</option>{SERVICE_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{localizeServiceMode(option.value, locale)}</option>)}</select></label>
                  <label className="field field-full"><span className="field-label">{t("Description")}</span><textarea rows={3} value={service.description} onChange={(event) => updateService(service.id, { description: event.target.value })} placeholder={t("What is included and who is this service best for?")} /></label>
                  <label className="field field-full"><span className="field-label">{t("Intended for")} <span className="field-optional">{t("Optional")}</span></span><textarea maxLength={500} rows={3} value={service.intendedFor} onChange={(event) => updateService(service.id, { intendedFor: event.target.value })} placeholder={t("Who is most likely to benefit from this specific service?")} /></label>
                  <label className="field field-full"><span className="field-label">{t("What is included")} <span className="field-optional">{t("Optional")}</span></span><span className="field-help">{t("Add one item per line, up to 12 items.")}</span><textarea rows={4} value={service.includedItems} onChange={(event) => updateService(service.id, { includedItems: event.target.value })} placeholder={t("Initial assessment\nPersonalized plan\nWeekly check-in")} /></label>
                  <label className="field"><span className="field-label">{t("Duration in minutes")} <span className="field-optional">{t("Optional")}</span></span><input type="number" min="5" value={service.durationMinutes} onChange={(event) => updateService(service.id, { durationMinutes: event.target.value })} placeholder="60" /></label>
                  <label className="field"><span className="field-label">{t("Delivery cadence")} <span className="field-optional">{t("Optional")}</span></span><input maxLength={240} value={service.deliveryCadence} onChange={(event) => updateService(service.id, { deliveryCadence: event.target.value })} placeholder={t("Weekly check-in with messaging support")} /></label>
                  <label className="field"><span className="field-label">{t("Minimum commitment")} <span className="field-optional">{t("Optional")}</span></span><input maxLength={240} value={service.minimumCommitment} onChange={(event) => updateService(service.id, { minimumCommitment: event.target.value })} placeholder={t("Month to month or 12-week minimum")} /></label>
                  <label className="field"><span className="field-label">{t("Consultation")}</span><select value={service.consultationType} onChange={(event) => updateService(service.id, { consultationType: event.target.value })}>{CONSULTATION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}</select></label>
                  <label className="field"><span className="field-label">{t("Pricing basis")}</span><select value={service.pricingBasis} disabled={service.contactForPricing} onChange={(event) => updateService(service.id, { pricingBasis: event.target.value })}>{PRICING_BASIS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}</select></label>
                  <label className="field"><span className="field-label">{t("Starting price")}</span><input type="number" min="0" step="1" disabled={service.contactForPricing} value={service.priceFrom} onChange={(event) => updateService(service.id, { priceFrom: event.target.value })} placeholder="75" /></label>
                  <label className="field"><span className="field-label">{t("Optional maximum")}</span><input type="number" min="0" step="1" disabled={service.contactForPricing} value={service.priceTo} onChange={(event) => updateService(service.id, { priceTo: event.target.value })} placeholder="120" /></label>
                  <label className="field field-full"><span className="field-label">{t("Additional costs or requirements")} <span className="field-optional">{t("Optional")}</span></span><textarea maxLength={400} rows={2} value={service.additionalCostsNote} onChange={(event) => updateService(service.id, { additionalCostsNote: event.target.value })} placeholder={t("Note any separate facility fees, equipment needs, or other requirements.")} /></label>
                </div>
                <label className="checkbox-row"><input type="checkbox" checked={service.contactForPricing} onChange={(event) => updateService(service.id, { contactForPricing: event.target.checked })} /><span>{t("Contact for pricing")}</span></label>
                <label className="checkbox-row"><input type="checkbox" checked={service.isActive} onChange={(event) => updateService(service.id, { isActive: event.target.checked })} /><span>{t("Show this service on my profile")}</span></label>
                <div className="compact-card-actions"><button type="button" className="button button-secondary" disabled={!service.name.trim()} onClick={() => setEditingServiceId(null)}>{t("Done")}</button></div>
              </div> : <div key={service.id} className="professional-compact-card"><div><div className="professional-compact-card-title"><strong>{service.name}</strong><span className={`professional-section-status${service.isActive ? " is-complete" : ""}`}>{t(service.isActive ? "Visible" : "Hidden")}</span></div><p>{modeLabel}{service.durationMinutes ? ` · ${service.durationMinutes} min` : ""} · {formatLocalizedServicePricingSummary(service, locale)}</p></div><div className="compact-card-actions"><button type="button" className="button button-secondary" onClick={() => moveService(service.id, -1)} disabled={index === 0} aria-label={`${t("Move up")}: ${service.name}`}>{t("Move up")}</button><button type="button" className="button button-secondary" onClick={() => moveService(service.id, 1)} disabled={index === services.length - 1} aria-label={`${t("Move down")}: ${service.name}`}>{t("Move down")}</button><button type="button" className="button button-secondary" onClick={() => setEditingServiceId(service.id)}>{t("Edit")}</button><button type="button" className="hero-text-link" onClick={() => setServices((current) => current.filter((entry) => entry.id !== service.id))}>{t("Remove")}</button></div></div>;
            })}<button type="button" className="button button-secondary" onClick={addService}>{t("+ Add service")}</button></div>
            <FieldError name="services" errors={fieldErrors} translate={t} />
          </div>
        </div> : null}
      </article>

      <article className="panel profile-form-section" aria-labelledby="work-heading">
        <ProfessionalSectionHeader
          id="work-heading"
          eyebrow={t("How you work")}
          title={t("Set expectations before clients contact you.")}
          summary={`${selectedModeLabels.join(", ") || t("Add a service mode")} · ${t("Accepting clients")}: ${selectedAcceptanceLabel ? t(selectedAcceptanceLabel) : t("Not set")}`}
          complete={sectionIsComplete("work")}
          expanded={expandedSections.work}
          onToggle={() => toggleSection("work")}
          translate={t}
        />
        {expandedSections.work ? <div className="professional-section-body">
          <div id="profile-field-serviceModes" className="profile-subsection"><span className="field-label">{t("Service mode")} <span aria-hidden="true">*</span></span><div className="toggle-row">{SERVICE_MODE_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={form.serviceModes.includes(option.value)} className={`toggle-chip${form.serviceModes.includes(option.value) ? " is-active" : ""}`} onClick={() => toggleArrayField("serviceModes", option.value)}>{localizeServiceMode(option.value, locale)}</button>)}</div><FieldError name="serviceModes" errors={fieldErrors} translate={t} /></div>
          <div id="profile-field-location" className="tool-form-grid marketplace-editor-grid">
            <label className="field"><span className="field-label">{t("Country")}</span><select autoComplete="country" value={form.countryCode} onChange={(event) => updateCountry(event.target.value)}>{marketplaceCountryOptions.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select></label>
            <label className="field"><span className="field-label">{t("City")}</span><input autoComplete="address-level2" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder={form.countryCode === "US" ? "Miami" : t("City")} /></label>
            <label className="field"><span className="field-label">{t(regionLabel)}{!isRegionRequired(form.countryCode) ? <span className="field-optional"> {t("Optional")}</span> : null}</span>{regionOptions.length > 0 ? <select autoComplete="address-level1" value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}><option value="">{t("Select")} {t(regionLabel).toLocaleLowerCase(locale)}</option>{form.state && !regionOptions.some(([code]) => code === form.state) ? <option value={form.state}>{form.state}</option> : null}{regionOptions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select> : <input autoComplete="address-level1" value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} placeholder={form.countryCode === "GB" ? "Greater London" : t(regionLabel)} />}</label>
            {offersInPerson ? <label className="field"><span className="field-label">{t("Service radius")}</span><span className="field-help">{t("Enter the distance you normally travel in")} {distanceLabel}.</span><input type="number" min="1" max="500" list="service-radius-options" value={form.serviceRadius} onChange={(event) => setForm((current) => ({ ...current, serviceRadius: event.target.value }))} /><datalist id="service-radius-options">{[5, 10, 25, 50].map((distance) => <option key={distance} value={distance} />)}</datalist></label> : null}
            {offersInPerson ? <label className="field field-full"><span className="field-label">{t("Service area description")} <span className="field-optional">{t("Optional")}</span></span><input value={form.serviceArea} onChange={(event) => setForm((current) => ({ ...current, serviceArea: event.target.value }))} placeholder={form.countryCode === "GB" ? "Central London" : "Brickell, Downtown Miami, and Edgewater"} /></label> : null}
            <FieldError name="location" errors={fieldErrors} translate={t} />
          </div>
          <div id="profile-field-acceptance" className="profile-subsection"><span className="field-label">{t("Are you accepting new clients?")} <span aria-hidden="true">*</span></span><div className="toggle-row">{ACCEPTANCE_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={form.acceptanceStatus === option.value} className={`toggle-chip${form.acceptanceStatus === option.value ? " is-active" : ""}`} onClick={() => setForm((current) => ({ ...current, acceptanceStatus: option.value }))}>{t(option.label)}</button>)}</div><FieldError name="acceptance" errors={fieldErrors} translate={t} /></div>
          <div id="profile-field-availability" className="profile-subsection"><span className="field-label">{t("Typical availability")} <span aria-hidden="true">*</span></span><div className="toggle-row">{AVAILABILITY_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={form.availabilityWindows.includes(option.value)} className={`toggle-chip${form.availabilityWindows.includes(option.value) ? " is-active" : ""}`} onClick={() => toggleArrayField("availabilityWindows", option.value)}>{t(option.label)}</button>)}</div><FieldError name="availability" errors={fieldErrors} translate={t} /></div>
          <label className="field field-full"><span className="field-label">{t("Additional availability details")} <span className="field-optional">{t("Optional")}</span></span><textarea rows={3} value={form.availabilityDetails} onChange={(event) => setForm((current) => ({ ...current, availabilityDetails: event.target.value }))} placeholder={t("Evenings after 5 PM, online check-ins on Sundays...")} /></label>
          <label id="profile-field-consultationExpectations" className="field field-full"><span className="field-label">{t("What happens after a consultation request?")} <span aria-hidden="true">*</span></span><span className="field-help">{t("Set a realistic response and next-step expectation. Elevare does not book or process payment for this service.")}</span><textarea maxLength={1000} rows={4} value={form.consultationExpectations} onChange={(event) => setForm((current) => ({ ...current, consultationExpectations: event.target.value }))} placeholder={t("For example: I review each request within two business days, then reply to confirm fit and discuss next steps.")} /><FieldError name="consultationExpectations" errors={fieldErrors} translate={t} /></label>
          <div className="profile-subsection"><span className="field-label">{t("Languages")} <span className="field-optional">{t("Optional")}</span></span><span className="field-help">{t("Add the languages you use when working with clients.")}</span>{form.languages.length > 0 ? <div className="professional-selection-tags">{form.languages.map((language) => <button key={language} type="button" className="selection-tag" onClick={() => setForm((current) => ({ ...current, languages: current.languages.filter((entry) => entry !== language) }))} aria-label={`${t("Remove")} ${t(language)}`}>{t(language)}<span aria-hidden="true">×</span></button>)}</div> : null}<div className="professional-inline-add"><input list="professional-language-options" value={languageDraft} onChange={(event) => setLanguageDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLanguage(); } }} placeholder={t("English")} aria-label={t("Language")} /><datalist id="professional-language-options">{PROFESSIONAL_LANGUAGE_SUGGESTIONS.map((language) => <option key={language} value={language} label={t(language)} />)}</datalist><button type="button" className="button button-secondary" disabled={!languageDraft.trim()} onClick={addLanguage}>{t("+ Add language")}</button></div></div>
        </div> : null}
      </article>

      <article id="profile-field-pricing" className="panel profile-form-section" aria-labelledby="pricing-heading">
        <ProfessionalSectionHeader
          id="pricing-heading"
          eyebrow={t("General pricing")}
          title={t("Add optional profile-wide pricing context.")}
          summary={form.contactForPricing ? t("Contact for pricing") : form.priceFrom ? formatLocalizedServicePricingSummary(form, locale) : t("Service prices are used by default")}
          complete
          statusLabel={t("Optional")}
          expanded={expandedSections.pricing}
          onToggle={() => toggleSection("pricing")}
          translate={t}
        />
        {expandedSections.pricing ? <div className="professional-section-body">
          <p className="field-help">{t("Optional. Use this only when a general range adds helpful context beyond the prices listed on individual services.")}</p>
          <label className="checkbox-row"><input type="checkbox" checked={form.contactForPricing} onChange={(event) => setForm((current) => ({ ...current, contactForPricing: event.target.checked }))} /><span>{t("Use contact for pricing as general context")}</span></label>
          <div className="tool-form-grid marketplace-editor-grid">
            <label className="field"><span className="field-label">{t("Currency")}</span><input list="marketplace-currency-options" maxLength={3} value={form.currencyCode} onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} /><datalist id="marketplace-currency-options">{COMMON_CURRENCY_CODES.map((code) => <option key={code} value={code} />)}</datalist></label>
            <label className="field"><span className="field-label">{t("Starting price")}</span><input type="number" min="0" step="1" disabled={form.contactForPricing} value={form.priceFrom} onChange={(event) => setForm((current) => ({ ...current, priceFrom: event.target.value }))} placeholder="75" /></label>
            <label className="field"><span className="field-label">{t("Pricing basis")}</span><select disabled={form.contactForPricing} value={form.pricingBasis} onChange={(event) => setForm((current) => ({ ...current, pricingBasis: event.target.value }))}><option value="">{t("Select a basis")}</option>{PRICING_BASIS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}</select></label>
            <label className="field"><span className="field-label">{t("Optional maximum price")}</span><input type="number" min="0" step="1" disabled={form.contactForPricing} value={form.priceTo} onChange={(event) => setForm((current) => ({ ...current, priceTo: event.target.value }))} placeholder="120" /></label>
          </div>
          <FieldError name="pricing" errors={fieldErrors} translate={t} />
        </div> : null}
      </article>

      <article id="profile-field-credentials" className="panel profile-form-section" aria-labelledby="credentials-heading">
        <ProfessionalSectionHeader
          id="credentials-heading"
          eyebrow={t("Credentials")}
          title={t("Add qualifications clients should know about.")}
          summary={credentials.length > 0 ? `${credentials.length} ${t(credentials.length === 1 ? "credential added" : "credentials added")}` : t("No credentials added")}
          complete
          statusLabel={t("Optional")}
          expanded={expandedSections.credentials}
          onToggle={() => toggleSection("credentials")}
          translate={t}
        />
        {expandedSections.credentials ? <div className="professional-section-body">
          <p className="section-copy section-copy-compact">{t("Optional. Elevare reviews credentials separately. Only Elevare can change verification status. Country and jurisdiction provide review context and do not imply that a credential is valid everywhere.")}</p>
          <p className="form-note"><Link href={localizePathname("/trust-safety/", locale)}>{t("Learn how Elevare trust checks work")}</Link></p>
          <div className="editor-stack">{credentials.map((credential, index) => {
            const isEditing = editingCredentialId === credential.id || !credential.credentialName.trim() || !credential.organizationName.trim();
            const rawVerificationLabel = formatCredentialVerificationStatus(credential.verificationStatus, credential.expirationDate);
            const verificationLabel = t(rawVerificationLabel);
            const documentReference = credential.supportingDocumentUrl.trim();
            const hasPrivateDocument = Boolean(user && isPrivateCredentialPath(documentReference, user.id));
            const hasLegacyDocument = isLegacyCredentialUrl(documentReference);
            const uploadFeedback = credentialUploadFeedback[credential.id];
            return isEditing ? <div key={credential.id} className="nested-editor-card">
              <div className="nested-editor-head"><strong>{credential.credentialName.trim() || `${t("Credential")} ${index + 1}`}</strong><button type="button" className="hero-text-link" onClick={() => { setCredentials((current) => current.filter((entry) => entry.id !== credential.id)); setEditingCredentialId(null); }}>{t("Remove")}</button></div>
              <div className="tool-form-grid marketplace-editor-grid">
                <label className="field"><span className="field-label">{t("Credential name")}</span><input value={credential.credentialName} onChange={(event) => updateCredential(credential.id, { credentialName: event.target.value })} placeholder={t("Certified Personal Trainer")} /></label>
                <label className="field"><span className="field-label">{t("Issuing organization")}</span><input value={credential.organizationName} onChange={(event) => updateCredential(credential.id, { organizationName: event.target.value })} placeholder={t("Issuing organization")} /></label>
                <label className="field"><span className="field-label">{t("Credential type")}</span><input value={credential.credentialType} onChange={(event) => updateCredential(credential.id, { credentialType: event.target.value })} placeholder={t("Certification, license, degree")} /></label>
                <label className="field"><span className="field-label">{t("Credential number")}</span><input value={credential.credentialNumber} onChange={(event) => updateCredential(credential.id, { credentialNumber: event.target.value })} placeholder={t("Optional")} /></label>
                <label className="field"><span className="field-label">{t("Credential country")}</span><select value={credential.countryCode} onChange={(event) => updateCredential(credential.id, { countryCode: event.target.value })}>{marketplaceCountryOptions.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select></label>
                <label className="field"><span className="field-label">{t("Credential jurisdiction")} <span className="field-optional">{t("Optional")}</span></span><input value={credential.jurisdiction} onChange={(event) => updateCredential(credential.id, { jurisdiction: event.target.value })} placeholder={t("Florida, Ontario, England...")} /></label>
                <label className="field"><span className="field-label">{t("Issue date")}</span><input type="date" value={credential.issueDate} onChange={(event) => updateCredential(credential.id, { issueDate: event.target.value })} /></label>
                <label className="field"><span className="field-label">{t("Expiration date")}</span><input type="date" value={credential.expirationDate} onChange={(event) => updateCredential(credential.id, { expirationDate: event.target.value })} /></label>
                <div className="field field-full">
                  <span className="field-label">{t("Supporting document")} <span className="field-optional">{t("Optional")}</span></span>
                  <input
                    ref={(element) => { credentialInputRefs.current[credential.id] = element; }}
                    className="sr-only"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(event) => void chooseCredentialDocument(credential.id, event.target.files?.[0] ?? null)}
                  />
                  <div className="button-row">
                    <button type="button" className="button button-secondary" onClick={() => credentialInputRefs.current[credential.id]?.click()}>
                      {t(hasPrivateDocument || hasLegacyDocument ? "Replace document" : "Select document")}
                    </button>
                    {hasPrivateDocument ? <button type="button" className="hero-text-link" onClick={() => void viewCredentialDocument(credential)}>{t("View private document")}</button> : null}
                    {selectedCredentialFiles[credential.id] ? <button type="button" className="hero-text-link" onClick={() => {
                      setSelectedCredentialFiles((current) => { const next = { ...current }; delete next[credential.id]; return next; });
                      setCredentialUploadFeedback((current) => { const next = { ...current }; delete next[credential.id]; return next; });
                      if (credentialInputRefs.current[credential.id]) credentialInputRefs.current[credential.id]!.value = "";
                    }}>{t("Clear selection")}</button> : null}
                  </div>
                  {hasPrivateDocument ? <span className="field-help">{t("A private document is on file. Temporary owner access expires after 5 minutes.")}</span> : null}
                  {hasLegacyDocument ? <span className="field-help">{t("An existing external evidence link is retained for review. Replacing it stores the new file in Elevare's private credential bucket.")}</span> : null}
                  {!hasPrivateDocument && !hasLegacyDocument ? <span className="field-help">{t("PDF, JPG, PNG, or WebP up to 8 MB. The file is private and is uploaded when you save your profile.")}</span> : null}
                  {uploadFeedback ? <span className={uploadFeedback.kind === "error" ? "field-error" : "field-help"} role={uploadFeedback.kind === "error" ? "alert" : "status"}>{t(uploadFeedback.message)}</span> : null}
                </div>
                <label className="field field-full"><span className="field-label">{t("Supporting reference URL")}</span><input type="url" value={credential.supportingReferenceUrl} onChange={(event) => updateCredential(credential.id, { supportingReferenceUrl: event.target.value })} placeholder={t("Optional public verification link")} /><span className="field-help">{t("This may help reviewers confirm the credential, but it does not make the credential verified.")}</span><FieldError name="credentials" errors={fieldErrors} translate={t} /></label>
                <label className="check-row field-full">
                  <input type="checkbox" checked={credential.publicDisplay} onChange={(event) => updateCredential(credential.id, { publicDisplay: event.target.checked })} />
                  <span>{t("Show this credential on my public profile")}</span>
                </label>
                {credential.reviewFeedbackPublic ? (
                  <div className="form-note field-full" role="status">
                    <strong>{t("Review feedback")}:</strong> {credential.reviewFeedbackPublic}
                  </div>
                ) : null}
              </div>
              <div className="compact-card-actions"><button type="button" className="button button-secondary" disabled={!credential.credentialName.trim() || !credential.organizationName.trim()} onClick={() => setEditingCredentialId(null)}>{t("Done")}</button></div>
            </div> : <div key={credential.id} className="professional-compact-card"><div><div className="professional-compact-card-title"><strong>{credential.credentialName}</strong><span className={`professional-section-status${rawVerificationLabel === "Verified" ? " is-complete" : ""}`}>{verificationLabel}</span></div><p>{credential.organizationName} · {getCountryDisplayName(credential.countryCode, locale)}{credential.expirationDate ? ` · ${t("Expires")} ${credential.expirationDate}` : ""}{hasPrivateDocument ? ` · ${t("Private evidence on file")}` : hasLegacyDocument ? ` · ${t("External evidence retained")}` : ""}{!credential.publicDisplay ? ` · ${t("Hidden from public profile")}` : ""}</p>{credential.reviewFeedbackPublic ? <p className="form-note"><strong>{t("Review feedback")}:</strong> {credential.reviewFeedbackPublic}</p> : null}</div><div className="compact-card-actions"><button type="button" className="button button-secondary" onClick={() => setEditingCredentialId(credential.id)}>{t("Edit")}</button><button type="button" className="hero-text-link" onClick={() => setCredentials((current) => current.filter((entry) => entry.id !== credential.id))}>{t("Remove")}</button></div></div>;
          })}<button type="button" className="button button-secondary" onClick={addCredential}>{t("+ Add credential")}</button></div>
        </div> : null}
      </article>

      {publicProfileId ? <ProfessionalTrustStatus /> : null}

      <article className="panel profile-form-section" aria-labelledby="links-heading">
        <ProfessionalSectionHeader
          id="links-heading"
          eyebrow={t("Links")}
          title={t("Make it easy to learn more about your work.")}
          summary={listedLinkCount > 0 ? `${listedLinkCount} ${t(listedLinkCount === 1 ? "link added" : "links added")}` : t("No links added")}
          complete
          statusLabel={t("Optional")}
          expanded={expandedSections.links}
          onToggle={() => toggleSection("links")}
          translate={t}
        />
        {expandedSections.links ? (
          <div className="professional-section-body">
            <p className="section-copy section-copy-compact">{t("Optional. Use complete URLs beginning with https://.")}</p>
            <div className="tool-form-grid marketplace-editor-grid">
              <label id="profile-field-website" className="field">
                <span className="field-label">{t("Website URL")}</span>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))}
                  placeholder="https://example.com"
                />
                <FieldError name="website" errors={fieldErrors} translate={t} />
              </label>
              <label id="profile-field-websiteLinkText" className="field">
                <span className="field-label">{t("Website link text (optional)")}</span>
                <span className="field-help">{t("Leave blank to show the website URL.")}</span>
                <input
                  type="text"
                  maxLength={80}
                  value={form.websiteLinkText}
                  onChange={(event) => setForm((current) => ({ ...current, websiteLinkText: event.target.value }))}
                  placeholder={t("Visit my website")}
                />
                <FieldError name="websiteLinkText" errors={fieldErrors} translate={t} />
              </label>
              {[
                ["instagram", "Instagram", "instagramUrl"],
                ["facebook", "Facebook", "facebookUrl"],
                ["tiktok", "TikTok", "tiktokUrl"],
                ["youtube", "YouTube", "youtubeUrl"],
                ["linkedin", "LinkedIn", "linkedinUrl"],
              ].map(([key, label, field]) => (
                <label id={`profile-field-${key}`} key={key} className="field">
                  <span className="field-label">{label}</span>
                  <input
                    type="url"
                    value={form[field as keyof ProfessionalFormState] as string}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                    placeholder={`https://${key}.com/...`}
                  />
                  <FieldError name={key} errors={fieldErrors} translate={t} />
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      <article className="panel profile-form-section" aria-labelledby="submit-heading">
        <div className="section-head section-head-compact"><div className="eyebrow">{t("Preview and submit")}</div><h3 id="submit-heading" className="section-title section-title-compact">{t("Review your profile before it goes to Elevare.")}</h3></div>
        <div className="profile-completeness"><div className="profile-completeness-head"><strong>{t("Profile")} {completeness.percent}% {t("complete")}</strong><span>{completeness.missing.length === 0 ? t("Ready to submit") : `${completeness.missing.length} ${t(completeness.missing.length === 1 ? "item left" : "items left")}`}</span></div><div className="profile-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completeness.percent}><span style={{ width: `${completeness.percent}%` }} /></div>{completeness.missing.length > 0 ? <div className="profile-completeness-actions"><span className="field-help">{t("Complete these profile basics:")}</span>{completeness.items.filter((item) => !item.complete).map((item) => <button key={item.id} type="button" className="profile-completeness-item" onClick={() => focusCompletenessItem(item.section, item.id)}>{t(item.label)}<span aria-hidden="true">→</span></button>)}</div> : <p className="field-help">{t("Your profile has the information needed for review. Optional sections can still help clients understand your work.")}</p>}</div>
        <button type="button" className="button button-secondary" onClick={() => setIsPreviewing((current) => !current)}>{t(isPreviewing ? "Hide profile preview" : "Preview public profile")}</button>
        {isPreviewing ? <div className="professional-private-preview"><span className="meta-pill">{t("Private preview")}</span><div className="professional-preview-grid">{previewPhoto ? <img src={previewPhoto} alt={t("Private profile preview")} /> : <div className="profile-photo-placeholder">{t("Photo preview")}</div>}<div><h3>{form.displayName || t("Your name")}</h3><p className="professional-title-copy">{form.professionalTitle || t("Your professional title")}</p><p>{form.bio || t("Your bio will appear here.")}</p><div className="tag-row">{form.selectedSpecialties.slice(0, 6).map((specialty) => <span key={specialty} className="tag-chip">{localizeMarketplaceSpecialty(specialty, locale)}</span>)}</div></div></div>{activePreviewServices.length > 0 ? <div className="grid-3">{activePreviewServices.map((service) => <div key={service.id} className="nested-editor-card"><strong>{service.name}</strong><p>{service.description || t("Service details")}</p></div>)}</div> : null}</div> : null}
        <label id="profile-field-terms" className="checkbox-row professional-attestation"><input type="checkbox" checked={hasAcceptedProfessionalTerms} onChange={(event) => setHasAcceptedProfessionalTerms(event.target.checked)} /><span>{t(PROFESSIONAL_ATTESTATION_TEXT)} {t("I understand that marketplace approval does not establish legal authorization in every jurisdiction. I agree to the")} <a href="/terms-of-service/">{t("Terms of Service")}</a> {t("and acknowledge the")} <a href="/privacy-policy/">{t("Privacy Policy")}</a>.</span></label><FieldError name="terms" errors={fieldErrors} translate={t} />
        <div className="form-actions"><div className="button-row">{approvalStatus !== "approved" ? <button type="button" className="button button-secondary" onClick={() => handleSave("draft")} disabled={isSaving}>{t(isSaving ? "Saving..." : "Save draft")}</button> : null}<button type="button" className="button button-primary" onClick={() => handleSave("pending_review")} disabled={isSaving}>{t(isSaving ? "Submitting..." : approvalStatus === "approved" ? "Submit updates for review" : "Submit for review")}</button></div>      <p role="status" aria-live="polite">{isSaving ? publicationCopy.saving : null}</p>
      {propagationDelayed ? <button type="button" className="button button-secondary" onClick={() => void retryPropagation()}>{publicationCopy.retry}</button> : null}
      {saveConflict ? <button type="button" className="button button-secondary" onClick={() => { setSaveConflict(false); setReloadVersion((value) => value + 1); }}>{publicationCopy.reload}</button> : null}
{feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`} role="status">{t(feedback)}</div> : null}</div>
      </article>
      </fieldset>
    </section>
  );
}
