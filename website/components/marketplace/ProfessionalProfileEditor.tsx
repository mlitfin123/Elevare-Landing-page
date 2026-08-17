"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import {
  deriveDeliveryModes,
  deriveTrainerModality,
  getMarketplaceAppUserByAuthId,
} from "@/lib/marketplace-account";
import {
  getMarketplaceLegacyCategoryMapping,
  getMarketplaceTaxonomySelections,
  MARKETPLACE_TAXONOMY_CATEGORIES,
  resolveMarketplaceCategoryTaxonomy,
} from "@/lib/marketplace-taxonomy";
import {
  buildProfessionalPath,
  buildProfessionalSlugFromName,
  formatApprovalStatusLabel,
  formatIdentityVerificationLabel,
  getProfessionalStatusMessage,
  sanitizeProfessionalSlug,
} from "@/lib/marketplace-helpers";
import { RESERVED_MARKETPLACE_SLUGS } from "@/lib/marketplace-categories";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type CredentialDraft = {
  id: string;
  organizationName: string;
  credentialName: string;
  credentialType: string;
  credentialNumber: string;
  expirationDate: string;
  supportingDocumentUrl: string;
  supportingReferenceUrl: string;
};

type ProfessionalFormState = {
  displayName: string;
  profileSlug: string;
  profilePhotoUrl: string;
  professionalTitle: string;
  bio: string;
  yearsExperience: string;
  selectedSpecialties: string[];
  city: string;
  state: string;
  serviceArea: string;
  remoteAvailable: boolean;
  serviceModes: string[];
  priceFrom: string;
  priceTo: string;
  availabilitySummary: string;
  primaryCategoryStableId: string;
  additionalCategoryStableIds: string[];
};

type TrainerProfileStatusRow = {
  trainer_profile_id: string;
  marketplace_status: string;
  status_message: string;
  is_publicly_listed: boolean;
  review_feedback_public: string | null;
  public_slug: string | null;
};

type TrainerProfileRow = {
  id: string;
  user_id: string;
  bio: string | null;
  years_experience: number | null;
  location_city: string | null;
  location_state: string | null;
  primary_specialty: string | null;
  secondary_specialties: string[] | null;
  modality: string | null;
  verification_status: string | null;
  profile_live: boolean | null;
  accepting_clients: boolean | null;
  public_slug: string | null;
  public_display_name: string | null;
  professional_title: string | null;
  review_feedback_public: string | null;
  last_submitted_at: string | null;
};

type MatchingProfileRow = {
  trainer_profile_id: string;
  primary_service_category_id: string | null;
  delivery_modes: string[] | null;
  goal_tags: string[] | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  available_locations: Array<{
    location_name?: string | null;
    city?: string | null;
    state?: string | null;
    is_primary?: boolean | null;
  }> | null;
  availability_summary: string | null;
};

type TrainerServiceLinkRow = {
  service_category_id: string;
  is_primary: boolean | null;
  service_categories:
    | {
        public_slug: string | null;
        slug: string;
      }
    | Array<{
        public_slug: string | null;
        slug: string;
      }>
    | null;
};

type ServiceCategoryLookupRow = {
  id: string;
  slug: string;
  public_slug: string | null;
};

type UploadedProfilePhoto = {
  publicUrl: string;
  storagePath: string;
};

type CertificationRow = {
  id: string;
  cert_name: string | null;
  issuing_body: string | null;
  cert_org: string | null;
  cert_id: string | null;
  credential_number: string | null;
  credential_type: string | null;
  expiration_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  supporting_reference_url: string | null;
};

const initialFormState: ProfessionalFormState = {
  displayName: "",
  profileSlug: "",
  profilePhotoUrl: "",
  professionalTitle: "",
  bio: "",
  yearsExperience: "",
  selectedSpecialties: [],
  city: "",
  state: "",
  serviceArea: "",
  remoteAvailable: false,
  serviceModes: [],
  priceFrom: "",
  priceTo: "",
  availabilitySummary: "",
  primaryCategoryStableId: "",
  additionalCategoryStableIds: [],
};

function createEmptyCredentialDraft(): CredentialDraft {
  return {
    id: crypto.randomUUID(),
    organizationName: "",
    credentialName: "",
    credentialType: "",
    credentialNumber: "",
    expirationDate: "",
    supportingDocumentUrl: "",
    supportingReferenceUrl: "",
  };
}

function mapRemoteAvailability(serviceModes: string[]) {
  return serviceModes.includes("online") || serviceModes.includes("hybrid");
}

function buildLocationPayload(city: string, state: string, serviceArea: string) {
  if (!city.trim() && !state.trim() && !serviceArea.trim()) {
    return [];
  }

  return [
    {
      location_name: serviceArea.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      is_primary: true,
    },
  ];
}

function mapLinkedCategorySlug(linkedCategory: TrainerServiceLinkRow["service_categories"]) {
  if (Array.isArray(linkedCategory)) {
    return linkedCategory[0]?.slug ?? linkedCategory[0]?.public_slug ?? null;
  }

  return linkedCategory?.slug ?? linkedCategory?.public_slug ?? null;
}

function buildDistinctValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function normalizeLoadedCategorySelections(categoryIdentifiers: string[]) {
  const mappedStableIds = categoryIdentifiers
    .map((identifier) => {
      const taxonomyCategory = resolveMarketplaceCategoryTaxonomy(identifier, identifier);
      const legacyMapping = getMarketplaceLegacyCategoryMapping(identifier);
      return taxonomyCategory?.stableId ?? legacyMapping?.nextStableId ?? null;
    })
    .filter((stableId): stableId is string => Boolean(stableId));

  return buildDistinctValues(mappedStableIds);
}

export function ProfessionalProfileEditor() {
  const { user, isLoading, isConfigured } = useSupabaseSession();
  const [form, setForm] = useState<ProfessionalFormState>(initialFormState);
  const [credentials, setCredentials] = useState<CredentialDraft[]>([createEmptyCredentialDraft()]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const [approvalStatus, setApprovalStatus] = useState<string>("draft");
  const [identityVerificationStatus, setIdentityVerificationStatus] = useState<string>("unverified");
  const [reviewFeedbackPublic, setReviewFeedbackPublic] = useState<string | null>(null);
  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [isPubliclyListed, setIsPubliclyListed] = useState(false);
  const [statusMessageOverride, setStatusMessageOverride] = useState<string | null>(null);
  const [hasAcceptedProfessionalTerms, setHasAcceptedProfessionalTerms] = useState(false);
  const selectedCategoryStableIds = useMemo(
    () =>
      buildDistinctValues([
        form.primaryCategoryStableId,
        ...form.additionalCategoryStableIds,
      ]),
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

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      return;
    }

    const marketplaceClient = supabase;
    const currentUser = user;
    let isMounted = true;

    async function loadProfile() {
      const appUser = await getMarketplaceAppUserByAuthId(marketplaceClient, currentUser.id);

      if (!appUser || !isMounted) {
        return;
      }

      const [statusResult, profileResult] = await Promise.all([
        marketplaceClient
          .from("marketplace_trainer_profile_status_v1")
          .select(
            "trainer_profile_id,marketplace_status,status_message,is_publicly_listed,review_feedback_public,public_slug",
          )
          .eq("user_id", appUser.id)
          .maybeSingle(),
        marketplaceClient
          .from("trainer_profiles")
          .select(
            "id,user_id,bio,years_experience,location_city,location_state,primary_specialty,secondary_specialties,modality,verification_status,profile_live,accepting_clients,public_slug,public_display_name,professional_title,review_feedback_public,last_submitted_at",
          )
          .eq("user_id", appUser.id)
          .maybeSingle(),
      ]);

      const statusData = (statusResult.data as TrainerProfileStatusRow | null) ?? null;
      const profile = (profileResult.data as TrainerProfileRow | null) ?? null;

      setApprovalStatus(statusData?.marketplace_status ?? "draft");
      setReviewFeedbackPublic(statusData?.review_feedback_public ?? profile?.review_feedback_public ?? null);
      setStatusMessageOverride(statusData?.status_message ?? null);
      setIsPubliclyListed(Boolean(statusData?.is_publicly_listed));
      setIdentityVerificationStatus(profile?.verification_status ?? "unverified");

      if (!profile) {
        setForm((current) => ({
          ...current,
          profilePhotoUrl: appUser.profile_photo_url ?? current.profilePhotoUrl,
        }));
        return;
      }

      setPublicProfileId(profile.id);

      const [matchingProfileResult, trainerServicesResult, credentialsResult] = await Promise.all([
        marketplaceClient
          .from("provider_matching_profiles")
          .select(
            "trainer_profile_id,primary_service_category_id,delivery_modes,goal_tags,price_min_cents,price_max_cents,available_locations,availability_summary",
          )
          .eq("trainer_profile_id", profile.id)
          .maybeSingle(),
        marketplaceClient
          .from("trainer_services")
          .select("service_category_id,is_primary,service_categories(public_slug,slug)")
          .eq("trainer_profile_id", profile.id)
          .order("is_primary", { ascending: false }),
        marketplaceClient
          .from("certifications")
          .select(
            "id,cert_name,issuing_body,cert_org,cert_id,credential_number,credential_type,expiration_date,expiry_date,document_url,supporting_reference_url",
          )
          .eq("trainer_profile_id", profile.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true }),
      ]);

      const matchingProfile = (matchingProfileResult.data as MatchingProfileRow | null) ?? null;
      const trainerServices = (trainerServicesResult.data as TrainerServiceLinkRow[] | null) ?? [];
      const rawCategorySelections = trainerServices
        .map((entry) => mapLinkedCategorySlug(entry.service_categories))
        .filter(Boolean) as string[];
      const nextCategoryStableIds = normalizeLoadedCategorySelections(rawCategorySelections);
      const impliedServiceModes = buildDistinctValues(
        rawCategorySelections.flatMap((identifier) => getMarketplaceLegacyCategoryMapping(identifier)?.impliedServiceModes ?? []),
      );
      const impliedSpecialties = buildDistinctValues(
        rawCategorySelections.flatMap((identifier) => getMarketplaceLegacyCategoryMapping(identifier)?.impliedSpecialties ?? []),
      );
      const firstAvailableLocation = matchingProfile?.available_locations?.find((entry) => entry.is_primary)
        ?? matchingProfile?.available_locations?.[0]
        ?? null;
      const loadedSpecialties = buildDistinctValues([
        profile.primary_specialty,
        ...(Array.isArray(profile.secondary_specialties) ? profile.secondary_specialties : []),
        ...impliedSpecialties,
      ]).filter((entry) => !nextCategoryStableIds.includes(entry));
      const loadedServiceModes = buildDistinctValues([
        ...(Array.isArray(matchingProfile?.delivery_modes) ? matchingProfile.delivery_modes : []),
        ...impliedServiceModes,
      ]);

      setForm({
        displayName: profile.public_display_name ?? "",
        profileSlug: statusData?.public_slug ?? profile.public_slug ?? "",
        profilePhotoUrl: appUser.profile_photo_url ?? "",
        professionalTitle: profile.professional_title ?? "",
        bio: profile.bio ?? "",
        yearsExperience: profile.years_experience ? String(profile.years_experience) : "",
        selectedSpecialties: loadedSpecialties,
        city: profile.location_city ?? "",
        state: profile.location_state ?? "",
        serviceArea: firstAvailableLocation?.location_name ?? "",
        remoteAvailable: mapRemoteAvailability(loadedServiceModes),
        serviceModes: loadedServiceModes,
        priceFrom:
          typeof matchingProfile?.price_min_cents === "number"
            ? String(matchingProfile.price_min_cents / 100)
            : "",
        priceTo:
          typeof matchingProfile?.price_max_cents === "number"
            ? String(matchingProfile.price_max_cents / 100)
            : "",
        availabilitySummary:
          typeof matchingProfile?.availability_summary === "string"
            ? matchingProfile.availability_summary
            : "",
        primaryCategoryStableId: nextCategoryStableIds[0] ?? "",
        additionalCategoryStableIds: nextCategoryStableIds.slice(1),
      });

      if (credentialsResult.data?.length) {
        setCredentials(
          credentialsResult.data.map((credential: CertificationRow) => ({
            id: credential.id,
            organizationName: credential.issuing_body ?? credential.cert_org ?? "",
            credentialName: credential.cert_name ?? "",
            credentialType: credential.credential_type ?? "",
            credentialNumber: credential.credential_number ?? credential.cert_id ?? "",
            expirationDate: credential.expiration_date ?? credential.expiry_date ?? "",
            supportingDocumentUrl: credential.document_url ?? "",
            supportingReferenceUrl: credential.supporting_reference_url ?? "",
          })),
        );
      }
    }

    loadProfile().catch((error) => {
      if (isMounted) {
        setFeedback(error instanceof Error ? error.message : "We could not load your profile.");
        setFeedbackType("error");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  function toggleAdditionalCategory(stableId: string) {
    setForm((current) => ({
      ...current,
      additionalCategoryStableIds: current.additionalCategoryStableIds.includes(stableId)
        ? current.additionalCategoryStableIds.filter((entry) => entry !== stableId)
        : [...current.additionalCategoryStableIds, stableId],
    }));
  }

  function toggleServiceMode(serviceMode: string) {
    setForm((current) => {
      const nextServiceModes = current.serviceModes.includes(serviceMode)
        ? current.serviceModes.filter((entry) => entry !== serviceMode)
        : [...current.serviceModes, serviceMode];

      return {
        ...current,
        remoteAvailable: mapRemoteAvailability(nextServiceModes),
        serviceModes: nextServiceModes,
      };
    });
  }

  function toggleSpecialty(specialty: string) {
    setForm((current) => ({
      ...current,
      selectedSpecialties: current.selectedSpecialties.includes(specialty)
        ? current.selectedSpecialties.filter((entry) => entry !== specialty)
        : [...current.selectedSpecialties, specialty],
    }));
  }

  async function uploadProfilePhoto(): Promise<UploadedProfilePhoto | null> {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user || !selectedPhotoFile) {
      return null;
    }

    const extension = selectedPhotoFile.name.includes(".")
      ? selectedPhotoFile.name.split(".").pop()?.toLowerCase() ?? "png"
      : "png";
    const filePath = `${user.id}/profile_${Date.now()}.${extension}`;

    const uploadResult = await supabase.storage.from("profile-photos").upload(filePath, selectedPhotoFile, {
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
    return {
      publicUrl: data.publicUrl,
      storagePath: filePath,
    };
  }

  async function handleSave(nextStatus: "draft" | "pending_review") {
    if (!user) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setFeedback("Marketplace auth is not configured yet.");
      setFeedbackType("error");
      return;
    }

    const profileSlug = sanitizeProfessionalSlug(form.profileSlug || buildProfessionalSlugFromName(form.displayName));

    if (!form.displayName.trim()) {
      setFeedback("Add your public display name before saving.");
      setFeedbackType("error");
      return;
    }

    if (!profileSlug) {
      setFeedback("Add a valid profile slug.");
      setFeedbackType("error");
      return;
    }

    if (RESERVED_MARKETPLACE_SLUGS.has(profileSlug)) {
      setFeedback("That slug is reserved for a category page. Choose a more specific profile slug.");
      setFeedbackType("error");
      return;
    }

    if (approvalStatus === "suspended") {
      setFeedback("This profile is currently suspended and requires administrator review before it can be updated.");
      setFeedbackType("error");
      return;
    }

    if (!form.primaryCategoryStableId) {
      setFeedback("Choose a primary category before saving.");
      setFeedbackType("error");
      return;
    }

    if (nextStatus === "pending_review" && !hasAcceptedProfessionalTerms) {
      setFeedback("Confirm the professional marketplace terms before submitting your profile for review.");
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

      const photoUpload = await uploadProfilePhoto();
      const orderedCategoryStableIds = [
        form.primaryCategoryStableId,
        ...form.additionalCategoryStableIds.filter((entry) => entry !== form.primaryCategoryStableId),
      ];

      if (photoUpload) {
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({
            profile_photo_url: photoUpload.publicUrl,
            profile_photo_storage_path: photoUpload.storagePath,
          })
          .eq("id", appUser.id);

        if (userUpdateError) {
          throw userUpdateError;
        }
      }

      const { data: categoryRecords, error: categoriesError } = await supabase
        .from("service_categories")
        .select("id,slug,public_slug")
        .in("slug", orderedCategoryStableIds);

      if (categoriesError) {
        throw categoriesError;
      }

      const selectedCategories = orderedCategoryStableIds
        .map((stableId) =>
          ((categoryRecords as ServiceCategoryLookupRow[] | null) ?? []).find((entry) => entry.slug === stableId) ?? null
        )
        .filter((entry): entry is ServiceCategoryLookupRow => Boolean(entry));

      if (selectedCategories.length === 0) {
        throw new Error("We could not match your selected categories in the marketplace database.");
      }

      const profilePayload = {
        user_id: appUser.id,
        public_display_name: form.displayName.trim(),
        public_slug: profileSlug,
        professional_title: form.professionalTitle.trim() || null,
        bio: form.bio.trim() || null,
        years_experience: form.yearsExperience ? Number(form.yearsExperience) : null,
        location_city: form.city.trim() || null,
        location_state: form.state.trim() || null,
        primary_specialty: form.selectedSpecialties[0] ?? null,
        secondary_specialties: form.selectedSpecialties,
        modality: deriveTrainerModality(form.serviceModes, form.remoteAvailable),
        accepting_clients: true,
        onboarding_complete: true,
        profile_complete: true,
      };

      const { data: profileData, error: profileError } = await supabase
        .from("trainer_profiles")
        .upsert(profilePayload, {
          onConflict: "user_id",
        })
        .select(
          "id,public_slug,professional_title,verification_status,review_feedback_public,profile_live,last_submitted_at",
        )
        .single();

      if (profileError) {
        throw profileError;
      }

      const profileId = profileData.id as string;
      setPublicProfileId(profileId);
      setIdentityVerificationStatus(profileData.verification_status ?? identityVerificationStatus);
      setReviewFeedbackPublic(profileData.review_feedback_public ?? null);
      setForm((current) => ({
        ...current,
        profileSlug: profileData.public_slug ?? profileSlug,
        profilePhotoUrl: photoUpload?.publicUrl ?? current.profilePhotoUrl,
      }));

      const { error: matchingProfileError } = await supabase.from("provider_matching_profiles").upsert(
        {
          trainer_profile_id: profileId,
          primary_service_category_id: selectedCategories[0]?.id ?? null,
          delivery_modes: deriveDeliveryModes(form.serviceModes, form.remoteAvailable),
          price_min_cents: form.priceFrom ? Math.round(Number(form.priceFrom) * 100) : null,
          price_max_cents: form.priceTo ? Math.round(Number(form.priceTo) * 100) : null,
          available_locations: buildLocationPayload(form.city, form.state, form.serviceArea),
          availability_summary: form.availabilitySummary.trim() || null,
        },
        {
          onConflict: "trainer_profile_id",
        },
      );

      if (matchingProfileError) {
        throw matchingProfileError;
      }

      const { error: resetCategoriesError } = await supabase
        .from("trainer_services")
        .delete()
        .eq("trainer_profile_id", profileId);

      if (resetCategoriesError) {
        throw resetCategoriesError;
      }

      const { error: trainerServicesError } = await supabase.from("trainer_services").insert(
        selectedCategories.map((category, index) => ({
          trainer_profile_id: profileId,
          service_category_id: category.id,
          is_primary: index === 0,
        })),
      );

      if (trainerServicesError) {
        throw trainerServicesError;
      }

      const activeCredentials = credentials.filter(
        (credential) => credential.organizationName.trim() && credential.credentialName.trim(),
      );

      if (activeCredentials.length > 0) {
        const { error: credentialUpsertError } = await supabase.from("certifications").upsert(
          activeCredentials.map((credential) => ({
            id: credential.id,
            trainer_profile_id: profileId,
            cert_name: credential.credentialName.trim(),
            issuing_body: credential.organizationName.trim(),
            cert_org: credential.organizationName.trim(),
            credential_type: credential.credentialType.trim() || null,
            credential_number: credential.credentialNumber.trim() || null,
            cert_id: credential.credentialNumber.trim() || null,
            expiration_date: credential.expirationDate || null,
            expiry_date: credential.expirationDate || null,
            document_url: credential.supportingDocumentUrl.trim() || null,
            supporting_reference_url: credential.supportingReferenceUrl.trim() || null,
            is_active: true,
          })),
          {
            onConflict: "id",
          },
        );

        if (credentialUpsertError) {
          throw credentialUpsertError;
        }
      }

      const activeCredentialIds = activeCredentials.map((credential) => credential.id);

      if (activeCredentialIds.length > 0) {
        const { error: resetCredentialsError } = await supabase
          .from("certifications")
          .update({ is_active: false })
          .eq("trainer_profile_id", profileId)
          .not("id", "in", `(${activeCredentialIds.join(",")})`);

        if (resetCredentialsError) {
          throw resetCredentialsError;
        }
      } else {
        const { error: clearCredentialsError } = await supabase
          .from("certifications")
          .update({ is_active: false })
          .eq("trainer_profile_id", profileId);

        if (clearCredentialsError) {
          throw clearCredentialsError;
        }
      }

      if (nextStatus === "pending_review") {
        const { error: submitError } = await supabase.rpc("submit_current_trainer_profile_for_review", {
          requested_email: appUser.email,
          request_notes: null,
        });

        if (submitError) {
          throw submitError;
        }
      }

      const { data: statusData, error: statusError } = await supabase
        .from("marketplace_trainer_profile_status_v1")
        .select(
          "trainer_profile_id,marketplace_status,status_message,is_publicly_listed,review_feedback_public,public_slug",
        )
        .eq("trainer_profile_id", profileId)
        .maybeSingle();

      if (!statusError && statusData) {
        setApprovalStatus(statusData.marketplace_status ?? nextStatus);
        setStatusMessageOverride(statusData.status_message ?? null);
        setIsPubliclyListed(Boolean(statusData.is_publicly_listed));
        setReviewFeedbackPublic(statusData.review_feedback_public ?? null);
        setForm((current) => ({
          ...current,
          profileSlug: statusData.public_slug ?? current.profileSlug,
        }));
      } else {
        setApprovalStatus(nextStatus === "pending_review" ? "pending_review" : approvalStatus);
      }

      setSelectedPhotoFile(null);
      setFeedback(
        nextStatus === "pending_review"
          ? "Profile submitted for review. It is not publicly searchable until it is approved."
          : "Draft saved.",
      );
      setFeedbackType("success");

      if (!publicProfileId) {
        trackEvent("professional_profile_created", {
          profile_slug: profileSlug,
        });
      }

      if (nextStatus === "pending_review") {
        setHasAcceptedProfessionalTerms(false);
        trackEvent("professional_profile_submitted", {
          profile_slug: profileSlug,
        });
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "We could not save your profile.");
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
        <p>Add the second Supabase public URL and anon key to enable marketplace profiles.</p>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className="callout">
        <span className="meta-pill">Loading</span>
        <h2>Loading your profile.</h2>
        <p>One moment while we check your marketplace account.</p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="callout">
        <span className="meta-pill">Sign in required</span>
        <h2>Sign in to create your profile.</h2>
        <div className="button-row">
          <Link className="button button-primary" href="/sign-in/?redirect=/account/professional-profile/">
            Sign in
          </Link>
        </div>
      </article>
    );
  }

  const approvalLabel = formatApprovalStatusLabel(approvalStatus);
  const identityLabel = formatIdentityVerificationLabel(identityVerificationStatus);
  const statusMessage = statusMessageOverride ?? getProfessionalStatusMessage(approvalStatus, reviewFeedbackPublic);
  const isApproved = approvalStatus === "approved";

  return (
    <section className="section">
      <article className="panel">
        <div className="section-head tool-form-head">
          <div className="eyebrow">Profile</div>
          <h2 className="section-title">Build a public listing that is clear, credible, and easy to scan.</h2>
          <p className="section-copy">
            Add the categories, specialties, pricing context, and credentials that matter most to a client
            deciding whether to contact you.
          </p>
        </div>

        <div className="marketplace-status-row">
          <span className="status-chip">Status: {approvalLabel}</span>
          <span className="status-chip">{identityLabel}</span>
          {isPubliclyListed && form.profileSlug ? (
            <Link className="hero-text-link" href={buildProfessionalPath(form.profileSlug)}>
              View live profile
            </Link>
          ) : null}
        </div>

        <div className="form-note">
          {statusMessage}
          {isApproved ? " Any new changes should be resubmitted for review before they go live." : ""}
        </div>

        <div className="tool-form-grid marketplace-editor-grid">
          <label className="field">
            <span className="field-label">Display name</span>
            <input
              type="text"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => {
                  const nextDisplayName = event.target.value;
                  const nextSlug =
                    current.profileSlug.trim().length > 0
                      ? current.profileSlug
                      : buildProfessionalSlugFromName(nextDisplayName);

                  return {
                    ...current,
                    displayName: nextDisplayName,
                    profileSlug: nextSlug,
                  };
                })
              }
              placeholder="Jane Smith"
            />
          </label>

          <label className="field">
            <span className="field-label">Profile slug</span>
            <input
              type="text"
              value={form.profileSlug}
              onChange={(event) =>
                setForm((current) => ({ ...current, profileSlug: sanitizeProfessionalSlug(event.target.value) }))
              }
              placeholder="jane-smith"
            />
          </label>

          <label className="field">
            <span className="field-label">Public title</span>
            <input
              type="text"
              value={form.professionalTitle}
              onChange={(event) => setForm((current) => ({ ...current, professionalTitle: event.target.value }))}
              placeholder="Competition Prep Coach"
            />
          </label>

          <label className="field">
            <span className="field-label">Years of experience</span>
            <input
              type="number"
              min="0"
              value={form.yearsExperience}
              onChange={(event) => setForm((current) => ({ ...current, yearsExperience: event.target.value }))}
              placeholder="8"
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
            <span className="field-label">Service area label</span>
            <input
              type="text"
              value={form.serviceArea}
              onChange={(event) => setForm((current) => ({ ...current, serviceArea: event.target.value }))}
              placeholder="South Florida or remote"
            />
          </label>

          <label className="field">
            <span className="field-label">Starting price</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.priceFrom}
              onChange={(event) => setForm((current) => ({ ...current, priceFrom: event.target.value }))}
              placeholder="199"
            />
          </label>

          <label className="field">
            <span className="field-label">Upper price range</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.priceTo}
              onChange={(event) => setForm((current) => ({ ...current, priceTo: event.target.value }))}
              placeholder="399"
            />
          </label>

          <label className="field field-full">
            <span className="field-label">Bio</span>
            <textarea
              rows={5}
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              placeholder="Explain who you help, what your approach looks like, and what a good-fit client can expect."
            />
          </label>

          <label className="field field-full">
            <span className="field-label">Availability summary</span>
            <textarea
              rows={3}
              value={form.availabilitySummary}
              onChange={(event) =>
                setForm((current) => ({ ...current, availabilitySummary: event.target.value }))
              }
              placeholder="Open to new clients, evenings available, online check-ins weekly..."
            />
          </label>

          <label className="field field-full">
            <span className="field-label">Profile photo</span>
            <input type="file" accept="image/*" onChange={(event) => setSelectedPhotoFile(event.target.files?.[0] ?? null)} />
            {form.profilePhotoUrl ? (
              <div className="marketplace-photo-preview">
                <img src={form.profilePhotoUrl} alt="Current profile photo" />
              </div>
            ) : null}
          </label>
        </div>

        <div className="section-head section-head-compact">
          <div className="eyebrow">Primary category</div>
          <h3 className="section-title section-title-compact">Choose the main type of support you offer.</h3>
          <p className="section-copy section-copy-compact">
            Categories describe the kind of professional service you provide. They are separate from specialties and service mode.
          </p>
        </div>

        <label className="field field-full">
          <span className="field-label">Primary category</span>
          <select
            value={form.primaryCategoryStableId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                primaryCategoryStableId: event.target.value,
                additionalCategoryStableIds: current.additionalCategoryStableIds.filter(
                  (entry) => entry !== event.target.value,
                ),
              }))}
          >
            <option value="">Select a primary category</option>
            {MARKETPLACE_TAXONOMY_CATEGORIES.map((category) => (
              <option key={category.stableId} value={category.stableId}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <div className="section-head section-head-compact">
          <div className="eyebrow">Additional categories</div>
          <h3 className="section-title section-title-compact">Add any other categories that are legitimately relevant.</h3>
          <p className="section-copy section-copy-compact">
            Use additional categories only when they clearly fit your real services. Service mode should stay separate.
          </p>
        </div>

        <div className="selectable-grid">
          {MARKETPLACE_TAXONOMY_CATEGORIES.filter((category) => category.stableId !== form.primaryCategoryStableId).map((category) => {
            const isActive = form.additionalCategoryStableIds.includes(category.stableId);

            return (
              <button
                key={category.stableId}
                type="button"
                className={`selectable-card${isActive ? " is-active" : ""}`}
                onClick={() => toggleAdditionalCategory(category.stableId)}
              >
                <strong>{category.label}</strong>
                <span>{category.shortDescription}</span>
              </button>
            );
          })}
        </div>

        <div className="section-head section-head-compact">
          <div className="eyebrow">Specialties</div>
          <h3 className="section-title section-title-compact">Choose the specific areas you want to emphasize.</h3>
          <p className="section-copy section-copy-compact">
            Specialties are separate from categories. Selecting one does not claim certification or licensure by itself.
          </p>
        </div>

        {selectedTaxonomyCategories.length > 0 ? (
          <div className="editor-stack">
            {selectedTaxonomyCategories.map((category) => (
              <article key={category.stableId} className="panel nested-editor-card">
                <div className="nested-editor-head">
                  <strong>{category.label}</strong>
                </div>
                <div className="toggle-row">
                  {category.specialties.map((specialty) => (
                    <button
                      key={`${category.stableId}-${specialty}`}
                      type="button"
                      className={`toggle-chip${form.selectedSpecialties.includes(specialty) ? " is-active" : ""}`}
                      onClick={() => toggleSpecialty(specialty)}
                    >
                      {specialty}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="form-note">Choose a primary category first, then select specialties from the relevant category groups.</div>
        )}

        {selectedCategoryNotes.length > 0 ? (
          <div className="editor-stack">
            {selectedCategoryNotes.map((note) => (
              <div key={note} className="form-note">
                {note}
              </div>
            ))}
          </div>
        ) : null}

        <div className="section-head section-head-compact">
          <div className="eyebrow">Service mode</div>
          <h3 className="section-title section-title-compact">How do you work with clients?</h3>
          <p className="section-copy section-copy-compact">
            Service mode is separate from category. Online is not its own marketplace category.
          </p>
        </div>

        <div className="toggle-row">
          {[
            { value: "in_person", label: "In person" },
            { value: "online", label: "Online" },
            { value: "hybrid", label: "Hybrid" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`toggle-chip${form.serviceModes.includes(option.value) ? " is-active" : ""}`}
              onClick={() => toggleServiceMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="section-head section-head-compact">
          <div className="eyebrow">Credentials</div>
          <h3 className="section-title section-title-compact">Add the certifications or credentials you want to list publicly.</h3>
        </div>

        <div className="editor-stack">
          {credentials.map((credential, index) => (
            <article key={credential.id} className="panel nested-editor-card">
              <div className="nested-editor-head">
                <strong>Credential {index + 1}</strong>
                <button
                  type="button"
                  className="hero-text-link"
                  onClick={() => setCredentials((current) => current.filter((entry) => entry.id !== credential.id))}
                >
                  Remove
                </button>
              </div>
              <div className="tool-form-grid marketplace-editor-grid">
                <label className="field">
                  <span className="field-label">Organization</span>
                  <input
                    type="text"
                    value={credential.organizationName}
                    onChange={(event) =>
                      setCredentials((current) =>
                        current.map((entry) =>
                          entry.id === credential.id ? { ...entry, organizationName: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder="NASM"
                  />
                </label>

                <label className="field">
                  <span className="field-label">Credential name</span>
                  <input
                    type="text"
                    value={credential.credentialName}
                    onChange={(event) =>
                      setCredentials((current) =>
                        current.map((entry) =>
                          entry.id === credential.id ? { ...entry, credentialName: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder="Certified Personal Trainer"
                  />
                </label>

                <label className="field">
                  <span className="field-label">Credential type</span>
                  <input
                    type="text"
                    value={credential.credentialType}
                    onChange={(event) =>
                      setCredentials((current) =>
                        current.map((entry) =>
                          entry.id === credential.id ? { ...entry, credentialType: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder="Certification, license, degree"
                  />
                </label>

                <label className="field">
                  <span className="field-label">Credential number</span>
                  <input
                    type="text"
                    value={credential.credentialNumber}
                    onChange={(event) =>
                      setCredentials((current) =>
                        current.map((entry) =>
                          entry.id === credential.id ? { ...entry, credentialNumber: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder="Optional"
                  />
                </label>

                <label className="field">
                  <span className="field-label">Expiration date</span>
                  <input
                    type="date"
                    value={credential.expirationDate}
                    onChange={(event) =>
                      setCredentials((current) =>
                        current.map((entry) =>
                          entry.id === credential.id ? { ...entry, expirationDate: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </label>

                <label className="field field-full">
                  <span className="field-label">Supporting document URL</span>
                  <input
                    type="url"
                    value={credential.supportingDocumentUrl}
                    onChange={(event) =>
                      setCredentials((current) =>
                        current.map((entry) =>
                          entry.id === credential.id
                            ? { ...entry, supportingDocumentUrl: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    placeholder="Optional hosted document link for review"
                  />
                </label>

                <label className="field field-full">
                  <span className="field-label">Supporting reference URL</span>
                  <input
                    type="url"
                    value={credential.supportingReferenceUrl}
                    onChange={(event) =>
                      setCredentials((current) =>
                        current.map((entry) =>
                          entry.id === credential.id
                            ? { ...entry, supportingReferenceUrl: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    placeholder="Optional public reference or verification link"
                  />
                </label>
              </div>
            </article>
          ))}
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setCredentials((current) => [...current, createEmptyCredentialDraft()])}
          >
            Add credential
          </button>
        </div>

        <label className="checkbox-row professional-attestation">
          <input
            type="checkbox"
            checked={hasAcceptedProfessionalTerms}
            onChange={(event) => setHasAcceptedProfessionalTerms(event.target.checked)}
          />
          <span>
            I certify that my profile and credentials are accurate, that I am an independent professional rather
            than an Elevare employee or agent, and that I will maintain all licenses, insurance, and authorizations
            required for my services. I agree to the{" "}
            <Link href="/terms-of-service.html">Terms of Service</Link> and{" "}
            <Link href="/privacy-policy.html">Privacy Policy</Link>.
          </span>
        </label>

        <div className="form-actions">
          <div className="button-row">
            {!isApproved ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => handleSave("draft")}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save draft"}
              </button>
            ) : null}
            <button
              type="button"
              className="button button-primary"
              onClick={() => handleSave("pending_review")}
              disabled={isSaving}
            >
              {isSaving
                ? "Submitting..."
                : isApproved
                  ? "Submit updates for review"
                  : approvalStatus === "pending_review"
                    ? "Update submission"
                    : "Submit for review"}
            </button>
          </div>
          {feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div> : null}
        </div>
      </article>
    </section>
  );
}
