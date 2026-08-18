"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { trackEvent } from "@/lib/analytics";
import { deriveTrainerModality, getMarketplaceAppUserByAuthId } from "@/lib/marketplace-account";
import { buildProfessionalPath, formatApprovalStatusLabel, getProfessionalStatusMessage } from "@/lib/marketplace-helpers";
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
  countWords,
  deriveLegacySpecialties,
  isValidOptionalUrl,
  normalizeStateValue,
  PRICING_BASIS_OPTIONS,
  SERVICE_MODE_OPTIONS,
  US_STATE_OPTIONS,
} from "@/lib/professional-profile";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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
};

type ProfessionalFormState = {
  displayName: string;
  profilePhotoUrl: string;
  professionalTitle: string;
  bio: string;
  yearsExperience: string;
  selectedSpecialties: string[];
  city: string;
  state: string;
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
  websiteUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
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
  id: string;
  bio: string | null;
  years_experience: number | null;
  location_city: string | null;
  location_state: string | null;
  primary_specialty: string | null;
  secondary_specialties: string[] | null;
  marketplace_specialties: string[] | null;
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
  contact_for_pricing: boolean | null;
  website_url: string | null;
  social_links: Record<string, unknown> | null;
  public_slug: string | null;
  public_display_name: string | null;
  professional_title: string | null;
  review_feedback_public: string | null;
};

type MatchingProfileRow = {
  delivery_modes: unknown;
  goal_tags: unknown;
  price_min_cents: number | null;
  price_max_cents: number | null;
  availability_summary: unknown;
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
};
type UploadedProfilePhoto = { publicUrl: string; storagePath: string };
type FieldErrors = Record<string, string>;

const initialFormState: ProfessionalFormState = {
  displayName: "",
  profilePhotoUrl: "",
  professionalTitle: "",
  bio: "",
  yearsExperience: "",
  selectedSpecialties: [],
  city: "",
  state: "",
  serviceArea: "",
  serviceRadius: "25",
  serviceModes: [],
  acceptanceStatus: "accepting",
  availabilityWindows: [],
  availabilityDetails: "",
  priceFrom: "",
  priceTo: "",
  pricingBasis: "session",
  contactForPricing: false,
  websiteUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  linkedinUrl: "",
  primaryCategoryStableId: "",
  additionalCategoryStableIds: [],
};

function createEmptyCredentialDraft(): CredentialDraft {
  return {
    id: crypto.randomUUID(), organizationName: "", credentialName: "", credentialType: "",
    credentialNumber: "", issueDate: "", expirationDate: "", supportingDocumentUrl: "",
    supportingReferenceUrl: "",
  };
}

function createEmptyServiceDraft(): ServiceDraft {
  return {
    id: crypto.randomUUID(), name: "", description: "", serviceMode: "", durationMinutes: "",
    priceFrom: "", priceTo: "", pricingBasis: "session", contactForPricing: false, isActive: true,
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

function FieldError({ name, errors }: { name: string; errors: FieldErrors }) {
  return errors[name] ? <span className="field-error" role="alert">{errors[name]}</span> : null;
}

function dollarsToCents(value: string) {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

export function ProfessionalProfileEditor() {
  const { user, isLoading, isConfigured } = useSupabaseSession();
  const photoInputRef = useRef<HTMLInputElement>(null);
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
  const [profileSlug, setProfileSlug] = useState("");
  const [isPubliclyListed, setIsPubliclyListed] = useState(false);
  const [statusMessageOverride, setStatusMessageOverride] = useState<string | null>(null);
  const [hasAcceptedProfessionalTerms, setHasAcceptedProfessionalTerms] = useState(false);

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
  const completeness = useMemo(() => calculateProfileCompleteness({
    name: form.displayName,
    professionalTitle: form.professionalTitle,
    profilePhotoUrl: removeCurrentPhoto ? "" : photoPreviewUrl || form.profilePhotoUrl,
    bio: form.bio,
    primaryCategory: form.primaryCategoryStableId,
    specialties: form.selectedSpecialties,
    serviceModes: form.serviceModes,
    city: form.city,
    state: form.state,
    services,
    hasPricing: form.contactForPricing || Boolean(form.priceFrom),
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
      const appUser = await getMarketplaceAppUserByAuthId(marketplaceClient, currentUser.id);
      if (!appUser || !isMounted) return;

      const [statusResult, profileResult] = await Promise.all([
        marketplaceClient.from("marketplace_trainer_profile_status_v1")
          .select("marketplace_status,status_message,is_publicly_listed,review_feedback_public,public_slug")
          .eq("user_id", appUser.id).maybeSingle(),
        marketplaceClient.from("trainer_profiles")
          .select("id,bio,years_experience,location_city,location_state,primary_specialty,secondary_specialties,marketplace_specialties,modality,verification_status,profile_live,accepting_clients,client_acceptance_status,typical_availability,availability_details,marketplace_price_min_cents,marketplace_price_max_cents,marketplace_pricing_basis,contact_for_pricing,website_url,social_links,public_slug,public_display_name,professional_title,review_feedback_public")
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
        setForm((current) => ({
          ...current,
          displayName: [appUser.first_name, appUser.last_name].filter(Boolean).join(" "),
          profilePhotoUrl: appUser.profile_photo_url ?? "",
        }));
        return;
      }

      setPublicProfileId(profile.id);
      setProfileSlug(statusData?.public_slug ?? profile.public_slug ?? "");

      const [matchingResult, categoryResult, credentialResult, locationResult, offeringResult] = await Promise.all([
        marketplaceClient.from("provider_matching_profiles")
          .select("delivery_modes,goal_tags,price_min_cents,price_max_cents,availability_summary")
          .eq("trainer_profile_id", profile.id).maybeSingle(),
        marketplaceClient.from("trainer_services")
          .select("service_category_id,is_primary,service_categories(public_slug,slug)")
          .eq("trainer_profile_id", profile.id).order("is_primary", { ascending: false }),
        marketplaceClient.from("certifications")
          .select("id,cert_name,issuing_body,cert_org,cert_id,credential_number,credential_type,issue_date,expiration_date,expiry_date,document_url,supporting_reference_url")
          .eq("trainer_profile_id", profile.id).eq("is_active", true).order("created_at", { ascending: true }),
        marketplaceClient.from("trainer_locations")
          .select("id,location_name,location_city,location_state,service_radius_miles,is_primary")
          .eq("trainer_profile_id", profile.id).order("is_primary", { ascending: false }),
        marketplaceClient.from("trainer_service_offerings")
          .select("id,name,description,service_mode,duration_minutes,price_min_cents,price_max_cents,pricing_basis,contact_for_pricing,is_active")
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

      setPrimaryLocationId(location?.id ?? null);
      setForm({
        displayName: profile.public_display_name ?? "",
        profilePhotoUrl: appUser.profile_photo_url ?? "",
        professionalTitle: profile.professional_title ?? "",
        bio: profile.bio ?? "",
        yearsExperience: profile.years_experience == null ? "" : String(profile.years_experience),
        selectedSpecialties: modernSpecialties.length > 0
          ? modernSpecialties
          : buildDistinctValues([...parseStringArray(matching?.goal_tags), ...impliedSpecialties]),
        city: location?.location_city ?? profile.location_city ?? "",
        state: normalizeStateValue(location?.location_state ?? profile.location_state),
        serviceArea: location?.location_name ?? "",
        serviceRadius: location?.service_radius_miles == null ? "25" : String(location.service_radius_miles),
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
        pricingBasis: profile.marketplace_pricing_basis ?? "session",
        contactForPricing: Boolean(profile.contact_for_pricing),
        websiteUrl: profile.website_url ?? "",
        instagramUrl: getJsonString(socialLinks, "instagram"),
        tiktokUrl: getJsonString(socialLinks, "tiktok"),
        youtubeUrl: getJsonString(socialLinks, "youtube"),
        linkedinUrl: getJsonString(socialLinks, "linkedin"),
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
        })));
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
        })));
      }
    }

    loadProfile().catch((error) => {
      if (isMounted) {
        setFeedback(error instanceof Error ? error.message : "We could not load your profile.");
        setFeedbackType("error");
      }
    });
    return () => { isMounted = false; };
  }, [user]);

  function toggleArrayField(field: "serviceModes" | "availabilityWindows", value: string) {
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

  function toggleAdditionalCategory(stableId: string) {
    setForm((current) => ({
      ...current,
      additionalCategoryStableIds: current.additionalCategoryStableIds.includes(stableId)
        ? current.additionalCategoryStableIds.filter((entry) => entry !== stableId)
        : [...current.additionalCategoryStableIds, stableId],
    }));
  }

  function updateService(id: string, updates: Partial<ServiceDraft>) {
    setServices((current) => current.map((service) => service.id === id ? { ...service, ...updates } : service));
  }

  function updateCredential(id: string, updates: Partial<CredentialDraft>) {
    setCredentials((current) => current.map((credential) => credential.id === id ? { ...credential, ...updates } : credential));
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

  function validateForm(isSubmission: boolean) {
    const errors: FieldErrors = {};
    const activeServices = services.filter((service) => service.isActive && service.name.trim());
    const urlFields = [
      ["website", form.websiteUrl], ["instagram", form.instagramUrl], ["tiktok", form.tiktokUrl],
      ["youtube", form.youtubeUrl], ["linkedin", form.linkedinUrl],
    ];
    urlFields.forEach(([key, value]) => { if (!isValidOptionalUrl(value)) errors[key] = "Enter a complete http:// or https:// URL."; });

    if (form.yearsExperience && (!Number.isFinite(Number(form.yearsExperience)) || Number(form.yearsExperience) < 0)) {
      errors.yearsExperience = "Enter a valid number of years.";
    }
    if (form.serviceRadius && (!Number.isFinite(Number(form.serviceRadius)) || Number(form.serviceRadius) < 1 || Number(form.serviceRadius) > 100)) {
      errors.location = "Enter a service radius between 1 and 100 miles.";
    }
    if (form.priceFrom && dollarsToCents(form.priceFrom) == null) errors.pricing = "Enter a valid starting price.";
    if (form.priceTo && dollarsToCents(form.priceTo) == null) errors.pricing = "Enter a valid maximum price.";
    if (form.priceFrom && form.priceTo && Number(form.priceTo) < Number(form.priceFrom)) errors.pricing = "Maximum price must be at least the starting price.";
    for (const service of activeServices) {
      if (service.priceFrom && dollarsToCents(service.priceFrom) == null) errors.services = "Enter valid service pricing.";
      if (service.priceTo && service.priceFrom && Number(service.priceTo) < Number(service.priceFrom)) errors.services = "A service maximum price cannot be lower than its starting price.";
      if (service.durationMinutes && (!Number.isFinite(Number(service.durationMinutes)) || Number(service.durationMinutes) < 5)) errors.services = "Service duration must be at least 5 minutes.";
    }

    if (isSubmission) {
      if (!form.displayName.trim()) errors.name = "Add your name.";
      if (!form.professionalTitle.trim()) errors.professionalTitle = "Add your professional title.";
      if (!(photoPreviewUrl || (form.profilePhotoUrl && !removeCurrentPhoto))) errors.photo = "Add a profile photo.";
      if (!form.bio.trim()) errors.bio = "Add a bio that helps clients understand your work.";
      if (!form.primaryCategoryStableId) errors.primaryCategory = "Choose a primary category.";
      if (form.selectedSpecialties.length === 0) errors.specialties = "Choose at least one specialty.";
      if (form.serviceModes.length === 0) errors.serviceModes = "Choose at least one service mode.";
      const needsLocation = form.serviceModes.includes("in_person") || form.serviceModes.includes("hybrid");
      if (needsLocation && (!form.city.trim() || !form.state.trim())) errors.location = "Add a city and state for in-person services.";
      if (activeServices.length === 0) errors.services = "Add at least one service.";
      if (!form.contactForPricing && !form.priceFrom) errors.pricing = "Add a starting price or choose Contact for pricing.";
      if (form.availabilityWindows.length === 0) errors.availability = "Choose at least one typical availability window.";
      if (!form.acceptanceStatus) errors.acceptance = "Choose your new-client status.";
      if (!hasAcceptedProfessionalTerms) errors.terms = "Confirm the professional marketplace terms before submitting.";
    }
    return errors;
  }

  function showValidationErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    const firstKey = Object.keys(errors)[0];
    if (firstKey) document.getElementById(`profile-field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function uploadProfilePhoto(): Promise<UploadedProfilePhoto | null> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user || !selectedPhotoFile) return null;
    const extension = selectedPhotoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const filePath = `${user.id}/profile_${Date.now()}.${extension}`;
    const uploadResult = await supabase.storage.from("profile-photos").upload(filePath, selectedPhotoFile, { cacheControl: "3600", upsert: true });
    if (uploadResult.error) throw uploadResult.error;
    const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
    return { publicUrl: data.publicUrl, storagePath: filePath };
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
    try {
      const appUser = await getMarketplaceAppUserByAuthId(supabase, user.id);
      if (!appUser) throw new Error("We could not find your marketplace account.");
      const photoUpload = await uploadProfilePhoto();
      const profilePhotoUrl = photoUpload?.publicUrl ?? (removeCurrentPhoto ? null : form.profilePhotoUrl || null);
      const profilePhotoStoragePath = photoUpload?.storagePath ?? (removeCurrentPhoto ? null : appUser.profile_photo_storage_path);

      if (photoUpload || removeCurrentPhoto) {
        const userUpdate = await supabase.from("users").update({
          profile_photo_url: profilePhotoUrl,
          profile_photo_storage_path: profilePhotoStoragePath,
        }).eq("id", appUser.id);
        if (userUpdate.error) throw userUpdate.error;
      }

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
      const profilePayload = {
        user_id: appUser.id,
        public_display_name: form.displayName.trim() || null,
        professional_title: form.professionalTitle.trim() || null,
        bio: form.bio.trim() || null,
        years_experience: form.yearsExperience ? Number(form.yearsExperience) : null,
        location_city: form.city.trim() || null,
        location_state: form.state || null,
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
        contact_for_pricing: form.contactForPricing,
        website_url: form.websiteUrl.trim() || null,
        social_links: {
          instagram: form.instagramUrl.trim() || null,
          tiktok: form.tiktokUrl.trim() || null,
          youtube: form.youtubeUrl.trim() || null,
          linkedin: form.linkedinUrl.trim() || null,
        },
      };
      const profileResult = await supabase.from("trainer_profiles")
        .upsert(profilePayload, { onConflict: "user_id" })
        .select("id,public_slug,review_feedback_public,profile_live").single();
      if (profileResult.error) throw profileResult.error;

      const profileId = profileResult.data.id as string;
      const savedSlug = typeof profileResult.data.public_slug === "string" ? profileResult.data.public_slug : profileSlug;
      setPublicProfileId(profileId);
      setProfileSlug(savedSlug);
      setReviewFeedbackPublic(profileResult.data.review_feedback_public ?? null);
      setForm((current) => ({ ...current, profilePhotoUrl: profilePhotoUrl ?? "" }));

      const resetCategories = await supabase.from("trainer_services").delete().eq("trainer_profile_id", profileId);
      if (resetCategories.error) throw resetCategories.error;
      if (selectedCategories.length > 0) {
        const insertCategories = await supabase.from("trainer_services").insert(selectedCategories.map((category, index) => ({
          trainer_profile_id: profileId,
          service_category_id: category.id,
          is_primary: index === 0,
        })));
        if (insertCategories.error) throw insertCategories.error;
      }

      const hasLocation = Boolean(form.city.trim() || form.state || form.serviceArea.trim());
      if (hasLocation) {
        const locationPayload = {
          ...(primaryLocationId ? { id: primaryLocationId } : {}),
          trainer_profile_id: profileId,
          location_name: form.serviceArea.trim() || null,
          location_city: form.city.trim() || null,
          location_state: form.state || null,
          service_radius_miles: Number(form.serviceRadius) || 25,
          is_primary: true,
        };
        const locationResult = await supabase.from("trainer_locations").upsert(locationPayload, { onConflict: "id" }).select("id").single();
        if (locationResult.error) throw locationResult.error;
        setPrimaryLocationId(locationResult.data.id as string);
      }

      const activeServices = services.filter((service) => service.name.trim());
      if (activeServices.length > 0) {
        const offeringResult = await supabase.from("trainer_service_offerings").upsert(activeServices.map((service, index) => ({
          id: service.id,
          trainer_profile_id: profileId,
          name: service.name.trim(),
          description: service.description.trim() || null,
          service_mode: service.serviceMode || null,
          duration_minutes: service.durationMinutes ? Number(service.durationMinutes) : null,
          price_min_cents: service.contactForPricing ? null : dollarsToCents(service.priceFrom),
          price_max_cents: service.contactForPricing ? null : dollarsToCents(service.priceTo),
          pricing_basis: service.contactForPricing ? null : service.pricingBasis || null,
          contact_for_pricing: service.contactForPricing,
          is_active: service.isActive,
          sort_order: index,
        })), { onConflict: "id" });
        if (offeringResult.error) throw offeringResult.error;
      }
      const activeServiceIds = activeServices.map((service) => service.id);
      let deactivateServices = supabase.from("trainer_service_offerings").update({ is_active: false }).eq("trainer_profile_id", profileId);
      if (activeServiceIds.length > 0) deactivateServices = deactivateServices.not("id", "in", `(${activeServiceIds.join(",")})`);
      const deactivateServicesResult = await deactivateServices;
      if (deactivateServicesResult.error) throw deactivateServicesResult.error;

      const activeCredentials = credentials.filter((credential) => credential.organizationName.trim() && credential.credentialName.trim());
      if (activeCredentials.length > 0) {
        const credentialResult = await supabase.from("certifications").upsert(activeCredentials.map((credential) => ({
          id: credential.id,
          trainer_profile_id: profileId,
          cert_name: credential.credentialName.trim(),
          issuing_body: credential.organizationName.trim(),
          cert_org: credential.organizationName.trim(),
          credential_type: credential.credentialType.trim() || null,
          credential_number: credential.credentialNumber.trim() || null,
          cert_id: credential.credentialNumber.trim() || null,
          issue_date: credential.issueDate || null,
          expiration_date: credential.expirationDate || null,
          expiry_date: credential.expirationDate || null,
          document_url: credential.supportingDocumentUrl.trim() || null,
          supporting_reference_url: credential.supportingReferenceUrl.trim() || null,
          is_active: true,
        })), { onConflict: "id" });
        if (credentialResult.error) throw credentialResult.error;
      }
      const activeCredentialIds = activeCredentials.map((credential) => credential.id);
      let deactivateCredentials = supabase.from("certifications").update({ is_active: false }).eq("trainer_profile_id", profileId);
      if (activeCredentialIds.length > 0) deactivateCredentials = deactivateCredentials.not("id", "in", `(${activeCredentialIds.join(",")})`);
      const deactivateCredentialsResult = await deactivateCredentials;
      if (deactivateCredentialsResult.error) throw deactivateCredentialsResult.error;

      if (nextStatus === "pending_review") {
        const submissionResult = await supabase.rpc("submit_current_trainer_profile_for_review", {
          requested_email: appUser.email,
          request_notes: null,
        });
        if (submissionResult.error) throw submissionResult.error;
      }

      const statusResult = await supabase.from("marketplace_trainer_profile_status_v1")
        .select("marketplace_status,status_message,is_publicly_listed,review_feedback_public,public_slug")
        .eq("trainer_profile_id", profileId).maybeSingle();
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
      setFeedback(nextStatus === "pending_review"
        ? "Profile submitted. Your profile is under review and will not appear in Elevare search until it is approved."
        : "Draft saved.");
      setFeedbackType("success");
      trackEvent(nextStatus === "pending_review" ? "professional_profile_submitted" : "professional_profile_draft_saved", { profile_slug: savedSlug });
      if (!publicProfileId) trackEvent("professional_profile_created", { profile_slug: savedSlug });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "We could not save your profile.");
      setFeedbackType("error");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isConfigured) return <article className="callout"><span className="meta-pill">Configuration needed</span><h2>Marketplace access is not configured yet.</h2><p>Add the Elevare Supabase public URL and anon key to enable profiles.</p></article>;
  if (isLoading) return <article className="callout"><span className="meta-pill">Loading</span><h2>Loading your profile.</h2><p>One moment while we check your marketplace account.</p></article>;
  if (!user) return <article className="callout"><span className="meta-pill">Pro Profile</span><h2>Sign in to create your Pro Profile.</h2><div className="button-row"><Link className="button button-primary" href="/sign-in/?redirect=/account/professional-profile/">Sign in</Link></div></article>;

  const approvalLabel = formatApprovalStatusLabel(approvalStatus);
  const statusMessage = statusMessageOverride ?? getProfessionalStatusMessage(approvalStatus, reviewFeedbackPublic);
  const previewPhoto = removeCurrentPhoto ? "" : photoPreviewUrl || form.profilePhotoUrl;
  const activePreviewServices = services.filter((service) => service.isActive && service.name.trim());

  return (
    <section className="section professional-profile-builder">
      <article className="panel professional-builder-intro">
        <div className="section-head tool-form-head">
          <div className="eyebrow">Pro Profile</div>
          <h2 className="section-title">Build a profile clients can trust and understand.</h2>
          <p className="section-copy">Show clients what you offer, how you work, and what they can expect before they contact you.</p>
        </div>
        <div className="marketplace-status-row">
          <span className="status-chip">Status: {approvalLabel}</span>
          {isPubliclyListed && profileSlug ? <Link className="hero-text-link" href={buildProfessionalPath(profileSlug)}>View live profile</Link> : null}
        </div>
        <div className="form-note">{statusMessage}</div>
      </article>

      <article className="panel profile-form-section" aria-labelledby="about-you-heading">
        <div className="section-head section-head-compact"><div className="eyebrow">About you</div><h3 id="about-you-heading" className="section-title section-title-compact">Introduce yourself clearly.</h3></div>
        <div className="tool-form-grid marketplace-editor-grid">
          <label id="profile-field-name" className="field"><span className="field-label">Name <span aria-hidden="true">*</span></span><input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Jane Smith" /><FieldError name="name" errors={fieldErrors} /></label>
          <label id="profile-field-professionalTitle" className="field"><span className="field-label">Professional title <span aria-hidden="true">*</span></span><span className="field-help">Personal Trainer, Competition Prep Coach, Registered Dietitian, Life Coach...</span><input value={form.professionalTitle} onChange={(event) => setForm((current) => ({ ...current, professionalTitle: event.target.value }))} placeholder="Competition Prep Coach" /><FieldError name="professionalTitle" errors={fieldErrors} /></label>
          <label id="profile-field-yearsExperience" className="field"><span className="field-label">Years of experience</span><input type="number" min="0" value={form.yearsExperience} onChange={(event) => setForm((current) => ({ ...current, yearsExperience: event.target.value }))} placeholder="8" /><FieldError name="yearsExperience" errors={fieldErrors} /></label>
          <div id="profile-field-photo" className="field field-full"><span className="field-label">Profile photo <span aria-hidden="true">*</span></span><div className="profile-photo-uploader">{previewPhoto ? <img src={previewPhoto} alt="Profile preview" /> : <div className="profile-photo-placeholder">Add a clear photo</div>}<div className="profile-photo-actions"><input ref={photoInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)} /><button type="button" className="button button-secondary" onClick={() => photoInputRef.current?.click()}>{previewPhoto ? "Change photo" : "Upload photo"}</button>{previewPhoto ? <button type="button" className="hero-text-link" onClick={() => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl); setPhotoPreviewUrl(""); setSelectedPhotoFile(null); setRemoveCurrentPhoto(true); }}>Remove</button> : null}<span className="field-help">JPG, PNG or WebP. A clear square photo works best.</span></div></div><FieldError name="photo" errors={fieldErrors} /></div>
          <label id="profile-field-bio" className="field field-full"><span className="field-label">Bio <span aria-hidden="true">*</span></span><span className="field-help">Tell clients who you help, what you specialize in, and what it is like to work with you. Recommended: 100-500 words.</span><textarea rows={7} value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Describe your clients, approach, and the experience you create." /><span className="field-help">{bioWordCount} words</span><FieldError name="bio" errors={fieldErrors} /></label>
        </div>
      </article>

      <article className="panel profile-form-section" aria-labelledby="offer-heading">
        <div className="section-head section-head-compact"><div className="eyebrow">What you offer</div><h3 id="offer-heading" className="section-title section-title-compact">Help the right clients find you.</h3></div>
        <label id="profile-field-primaryCategory" className="field field-full"><span className="field-label">Primary category <span aria-hidden="true">*</span></span><select value={form.primaryCategoryStableId} onChange={(event) => setForm((current) => ({ ...current, primaryCategoryStableId: event.target.value, additionalCategoryStableIds: current.additionalCategoryStableIds.filter((entry) => entry !== event.target.value) }))}><option value="">Select a primary category</option>{MARKETPLACE_TAXONOMY_CATEGORIES.map((category) => <option key={category.stableId} value={category.stableId}>{category.label}</option>)}</select><FieldError name="primaryCategory" errors={fieldErrors} /></label>
        <div className="profile-subsection"><span className="field-label">Additional categories</span><span className="field-help">Choose only categories that genuinely describe your services.</span><div className="selectable-grid">{MARKETPLACE_TAXONOMY_CATEGORIES.filter((category) => category.stableId !== form.primaryCategoryStableId).map((category) => <button key={category.stableId} type="button" className={`selectable-card${form.additionalCategoryStableIds.includes(category.stableId) ? " is-active" : ""}`} onClick={() => toggleAdditionalCategory(category.stableId)}><strong>{category.label}</strong><span>{category.shortDescription}</span></button>)}</div></div>
        <div id="profile-field-specialties" className="profile-subsection"><span className="field-label">Specialties <span aria-hidden="true">*</span></span><span className="field-help">Specialties help clients understand your focus. They do not imply a verified credential.</span>{selectedTaxonomyCategories.length > 0 ? <div className="editor-stack">{selectedTaxonomyCategories.map((category) => <div key={category.stableId} className="nested-editor-card"><strong>{category.label}</strong><div className="toggle-row">{category.specialties.map((specialty) => <button key={`${category.stableId}-${specialty}`} type="button" className={`toggle-chip${form.selectedSpecialties.includes(specialty) ? " is-active" : ""}`} onClick={() => toggleSpecialty(specialty)}>{specialty}</button>)}</div></div>)}</div> : <div className="form-note">Choose a category to see its specialties.</div>}<FieldError name="specialties" errors={fieldErrors} /></div>
        {selectedCategoryNotes.map((note) => <div key={note} className="form-note">{note}</div>)}
        <div id="profile-field-services" className="profile-subsection"><span className="field-label">Services <span aria-hidden="true">*</span></span><span className="field-help">List the specific ways clients can work with you.</span><div className="editor-stack">{services.map((service, index) => <div key={service.id} className="nested-editor-card"><div className="nested-editor-head"><strong>Service {index + 1}</strong>{services.length > 1 ? <button type="button" className="hero-text-link" onClick={() => setServices((current) => current.filter((entry) => entry.id !== service.id))}>Remove</button> : null}</div><div className="tool-form-grid marketplace-editor-grid"><label className="field"><span className="field-label">Service name</span><input value={service.name} onChange={(event) => updateService(service.id, { name: event.target.value })} placeholder="60-Minute Personal Training" /></label><label className="field"><span className="field-label">Service mode</span><select value={service.serviceMode} onChange={(event) => updateService(service.id, { serviceMode: event.target.value })}><option value="">Flexible</option>{SERVICE_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="field field-full"><span className="field-label">Description</span><textarea rows={3} value={service.description} onChange={(event) => updateService(service.id, { description: event.target.value })} placeholder="What is included and who is this service best for?" /></label><label className="field"><span className="field-label">Duration in minutes</span><input type="number" min="5" value={service.durationMinutes} onChange={(event) => updateService(service.id, { durationMinutes: event.target.value })} placeholder="60" /></label><label className="field"><span className="field-label">Pricing basis</span><select value={service.pricingBasis} disabled={service.contactForPricing} onChange={(event) => updateService(service.id, { pricingBasis: event.target.value })}>{PRICING_BASIS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="field"><span className="field-label">Starting price</span><input type="number" min="0" step="1" disabled={service.contactForPricing} value={service.priceFrom} onChange={(event) => updateService(service.id, { priceFrom: event.target.value })} placeholder="75" /></label><label className="field"><span className="field-label">Optional maximum</span><input type="number" min="0" step="1" disabled={service.contactForPricing} value={service.priceTo} onChange={(event) => updateService(service.id, { priceTo: event.target.value })} placeholder="120" /></label></div><label className="checkbox-row"><input type="checkbox" checked={service.contactForPricing} onChange={(event) => updateService(service.id, { contactForPricing: event.target.checked })} /><span>Contact for pricing</span></label><label className="checkbox-row"><input type="checkbox" checked={service.isActive} onChange={(event) => updateService(service.id, { isActive: event.target.checked })} /><span>Show this service on my profile</span></label></div>)}<button type="button" className="button button-secondary" onClick={() => setServices((current) => [...current, createEmptyServiceDraft()])}>Add service</button></div><FieldError name="services" errors={fieldErrors} /></div>
      </article>

      <article className="panel profile-form-section" aria-labelledby="work-heading">
        <div className="section-head section-head-compact"><div className="eyebrow">How you work</div><h3 id="work-heading" className="section-title section-title-compact">Set expectations before clients contact you.</h3></div>
        <div id="profile-field-serviceModes" className="profile-subsection"><span className="field-label">Service mode <span aria-hidden="true">*</span></span><div className="toggle-row">{SERVICE_MODE_OPTIONS.map((option) => <button key={option.value} type="button" className={`toggle-chip${form.serviceModes.includes(option.value) ? " is-active" : ""}`} onClick={() => toggleArrayField("serviceModes", option.value)}>{option.label}</button>)}</div><FieldError name="serviceModes" errors={fieldErrors} /></div>
        <div id="profile-field-location" className="tool-form-grid marketplace-editor-grid"><label className="field"><span className="field-label">City</span><input autoComplete="address-level2" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="Miami" /></label><label className="field"><span className="field-label">State</span><select autoComplete="address-level1" value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}><option value="">Select a state</option>{form.state && !US_STATE_OPTIONS.some(([abbreviation]) => abbreviation === form.state) ? <option value={form.state}>{form.state}</option> : null}{US_STATE_OPTIONS.map(([abbreviation, name]) => <option key={abbreviation} value={abbreviation}>{name}</option>)}</select></label><label className="field"><span className="field-label">Service radius</span><span className="field-help">Common choices are 5, 10, 25, or 50 miles. You can enter a custom radius.</span><input type="number" min="1" max="100" list="service-radius-options" value={form.serviceRadius} onChange={(event) => setForm((current) => ({ ...current, serviceRadius: event.target.value }))} /><datalist id="service-radius-options">{[5, 10, 25, 50, 100].map((miles) => <option key={miles} value={miles} />)}</datalist></label><label className="field"><span className="field-label">Where do you work with clients?</span><input value={form.serviceArea} onChange={(event) => setForm((current) => ({ ...current, serviceArea: event.target.value }))} placeholder="Brickell, Downtown Miami, and Edgewater" /></label><FieldError name="location" errors={fieldErrors} /></div>
        <div id="profile-field-acceptance" className="profile-subsection"><span className="field-label">Are you accepting new clients? <span aria-hidden="true">*</span></span><div className="toggle-row">{ACCEPTANCE_OPTIONS.map((option) => <button key={option.value} type="button" className={`toggle-chip${form.acceptanceStatus === option.value ? " is-active" : ""}`} onClick={() => setForm((current) => ({ ...current, acceptanceStatus: option.value }))}>{option.label}</button>)}</div><FieldError name="acceptance" errors={fieldErrors} /></div>
        <div id="profile-field-availability" className="profile-subsection"><span className="field-label">Typical availability <span aria-hidden="true">*</span></span><div className="toggle-row">{AVAILABILITY_OPTIONS.map((option) => <button key={option.value} type="button" className={`toggle-chip${form.availabilityWindows.includes(option.value) ? " is-active" : ""}`} onClick={() => toggleArrayField("availabilityWindows", option.value)}>{option.label}</button>)}</div><FieldError name="availability" errors={fieldErrors} /></div>
        <label className="field field-full"><span className="field-label">Additional availability details</span><textarea rows={3} value={form.availabilityDetails} onChange={(event) => setForm((current) => ({ ...current, availabilityDetails: event.target.value }))} placeholder="Evenings after 5 PM, online check-ins on Sundays..." /></label>
      </article>

      <article id="profile-field-pricing" className="panel profile-form-section" aria-labelledby="pricing-heading">
        <div className="section-head section-head-compact"><div className="eyebrow">Pricing</div><h3 id="pricing-heading" className="section-title section-title-compact">Give clients useful pricing context.</h3></div>
        <label className="checkbox-row"><input type="checkbox" checked={form.contactForPricing} onChange={(event) => setForm((current) => ({ ...current, contactForPricing: event.target.checked }))} /><span>Contact for pricing</span></label>
        <div className="tool-form-grid marketplace-editor-grid"><label className="field"><span className="field-label">Starting price</span><input type="number" min="0" step="1" disabled={form.contactForPricing} value={form.priceFrom} onChange={(event) => setForm((current) => ({ ...current, priceFrom: event.target.value }))} placeholder="75" /></label><label className="field"><span className="field-label">Pricing basis</span><select disabled={form.contactForPricing} value={form.pricingBasis} onChange={(event) => setForm((current) => ({ ...current, pricingBasis: event.target.value }))}>{PRICING_BASIS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="field"><span className="field-label">Optional maximum price</span><input type="number" min="0" step="1" disabled={form.contactForPricing} value={form.priceTo} onChange={(event) => setForm((current) => ({ ...current, priceTo: event.target.value }))} placeholder="120" /></label></div><FieldError name="pricing" errors={fieldErrors} />
      </article>

      <article className="panel profile-form-section" aria-labelledby="credentials-heading">
        <div className="section-head section-head-compact"><div className="eyebrow">Credentials</div><h3 id="credentials-heading" className="section-title section-title-compact">Add qualifications clients should know about.</h3><p className="section-copy section-copy-compact">Credentials are reviewed separately. Adding a credential does not automatically mark it as verified.</p></div>
        <div className="editor-stack">{credentials.map((credential, index) => <div key={credential.id} className="nested-editor-card"><div className="nested-editor-head"><strong>Credential {index + 1}</strong>{credentials.length > 1 ? <button type="button" className="hero-text-link" onClick={() => setCredentials((current) => current.filter((entry) => entry.id !== credential.id))}>Remove</button> : null}</div><div className="tool-form-grid marketplace-editor-grid"><label className="field"><span className="field-label">Credential name</span><input value={credential.credentialName} onChange={(event) => updateCredential(credential.id, { credentialName: event.target.value })} placeholder="NASM Certified Personal Trainer" /></label><label className="field"><span className="field-label">Issuing organization</span><input value={credential.organizationName} onChange={(event) => updateCredential(credential.id, { organizationName: event.target.value })} placeholder="NASM" /></label><label className="field"><span className="field-label">Credential type</span><input value={credential.credentialType} onChange={(event) => updateCredential(credential.id, { credentialType: event.target.value })} placeholder="Certification, license, degree" /></label><label className="field"><span className="field-label">Credential number</span><input value={credential.credentialNumber} onChange={(event) => updateCredential(credential.id, { credentialNumber: event.target.value })} placeholder="Optional" /></label><label className="field"><span className="field-label">Issue date</span><input type="date" value={credential.issueDate} onChange={(event) => updateCredential(credential.id, { issueDate: event.target.value })} /></label><label className="field"><span className="field-label">Expiration date</span><input type="date" value={credential.expirationDate} onChange={(event) => updateCredential(credential.id, { expirationDate: event.target.value })} /></label><label className="field field-full"><span className="field-label">Supporting document URL</span><input type="url" value={credential.supportingDocumentUrl} onChange={(event) => updateCredential(credential.id, { supportingDocumentUrl: event.target.value })} placeholder="Optional hosted document link for review" /></label><label className="field field-full"><span className="field-label">Supporting reference URL</span><input type="url" value={credential.supportingReferenceUrl} onChange={(event) => updateCredential(credential.id, { supportingReferenceUrl: event.target.value })} placeholder="Optional public verification link" /></label></div></div>)}<button type="button" className="button button-secondary" onClick={() => setCredentials((current) => [...current, createEmptyCredentialDraft()])}>Add credential</button></div>
      </article>

      <article className="panel profile-form-section" aria-labelledby="links-heading">
        <div className="section-head section-head-compact"><div className="eyebrow">Links</div><h3 id="links-heading" className="section-title section-title-compact">Make it easy to learn more about your work.</h3><p className="section-copy section-copy-compact">All links are optional. Use complete URLs beginning with https://.</p></div>
        <div className="tool-form-grid marketplace-editor-grid">{[["website", "Website", "websiteUrl"], ["instagram", "Instagram", "instagramUrl"], ["tiktok", "TikTok", "tiktokUrl"], ["youtube", "YouTube", "youtubeUrl"], ["linkedin", "LinkedIn", "linkedinUrl"]].map(([key, label, field]) => <label id={`profile-field-${key}`} key={key} className="field"><span className="field-label">{label}</span><input type="url" value={form[field as keyof ProfessionalFormState] as string} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} placeholder={`https://${key}.com/...`} /><FieldError name={key} errors={fieldErrors} /></label>)}</div>
      </article>

      <article className="panel profile-form-section" aria-labelledby="submit-heading">
        <div className="section-head section-head-compact"><div className="eyebrow">Preview and submit</div><h3 id="submit-heading" className="section-title section-title-compact">Review your profile before it goes to Elevare.</h3></div>
        <div className="profile-completeness"><div className="profile-completeness-head"><strong>Profile {completeness.percent}% complete</strong><span>{completeness.missing.length === 0 ? "Ready to submit" : `${completeness.missing.length} item${completeness.missing.length === 1 ? "" : "s"} left`}</span></div><div className="profile-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completeness.percent}><span style={{ width: `${completeness.percent}%` }} /></div>{completeness.missing.length > 0 ? <p className="field-help">Next: {completeness.missing.slice(0, 3).join("; ")}.</p> : null}</div>
        <button type="button" className="button button-secondary" onClick={() => setIsPreviewing((current) => !current)}>{isPreviewing ? "Hide profile preview" : "Preview public profile"}</button>
        {isPreviewing ? <div className="professional-private-preview"><span className="meta-pill">Private preview</span><div className="professional-preview-grid">{previewPhoto ? <img src={previewPhoto} alt="Private profile preview" /> : <div className="profile-photo-placeholder">Photo preview</div>}<div><h3>{form.displayName || "Your name"}</h3><p className="professional-title-copy">{form.professionalTitle || "Your professional title"}</p><p>{form.bio || "Your bio will appear here."}</p><div className="tag-row">{form.selectedSpecialties.slice(0, 6).map((specialty) => <span key={specialty} className="tag-chip">{specialty}</span>)}</div></div></div>{activePreviewServices.length > 0 ? <div className="grid-3">{activePreviewServices.map((service) => <div key={service.id} className="nested-editor-card"><strong>{service.name}</strong><p>{service.description || "Service details"}</p></div>)}</div> : null}</div> : null}
        <label id="profile-field-terms" className="checkbox-row professional-attestation"><input type="checkbox" checked={hasAcceptedProfessionalTerms} onChange={(event) => setHasAcceptedProfessionalTerms(event.target.checked)} /><span>I certify that my profile and credentials are accurate, that I am an independent professional rather than an Elevare employee or agent, and that I will maintain all licenses, insurance, and authorizations required for my services. I agree to the <Link href="/terms-of-service.html">Terms of Service</Link> and <Link href="/privacy-policy.html">Privacy Policy</Link>.</span></label><FieldError name="terms" errors={fieldErrors} />
        <div className="form-actions"><div className="button-row">{approvalStatus !== "approved" ? <button type="button" className="button button-secondary" onClick={() => handleSave("draft")} disabled={isSaving}>{isSaving ? "Saving..." : "Save draft"}</button> : null}<button type="button" className="button button-primary" onClick={() => handleSave("pending_review")} disabled={isSaving}>{isSaving ? "Submitting..." : approvalStatus === "approved" ? "Submit updates for review" : "Submit for review"}</button></div>{feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`} role="status">{feedback}</div> : null}</div>
      </article>
    </section>
  );
}
