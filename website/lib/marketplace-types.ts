export type ProfessionalCategoryRecord = {
  id: string;
  stableId: string;
  slug: string;
  publicSlug: string;
  label: string;
  headline: string;
  shortDescription: string | null;
  sortOrder: number;
  isActive: boolean;
  isPrimary?: boolean;
};

export type ProfessionalCredentialRecord = {
  id: string;
  professionalProfileId: string;
  organizationName: string;
  credentialName: string;
  credentialType: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  verificationStatus: string;
  countryCode: string | null;
  jurisdiction: string | null;
};

export type ProfessionalTrustSummary = {
  profileReviewed: boolean;
  profileReviewedAt: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  identityVerifiedAt: string | null;
  backgroundCheckCompleted: boolean;
  backgroundCheckCompletedAt: string | null;
  backgroundCheckProduct: string | null;
  insuranceConfirmed: boolean;
  insuranceConfirmedThrough: string | null;
  profileInformationConfirmedAt: string | null;
  accountInGoodStanding: boolean;
};

export type ProfessionalServiceRecord = {
  id: string;
  professionalProfileId: string;
  name: string;
  description: string | null;
  serviceMode: string | null;
  durationMinutes: number | null;
  price: number | null;
  priceTo: number | null;
  pricingBasis: string | null;
  contactForPricing: boolean;
  sortOrder: number;
  isActive: boolean;
  currencyCode: string;
  intendedFor: string | null;
  includedItems: string[];
  deliveryCadence: string | null;
  minimumCommitment: string | null;
  consultationType: string;
  additionalCostsNote: string | null;
};

export type ProfessionalProfileRecord = {
  id: string;
  displayName: string;
  profileSlug: string;
  profilePhotoUrl: string | null;
  professionalTitle: string;
  publicHeadline: string | null;
  bestFitSummary: string | null;
  bio: string;
  yearsExperience: number | null;
  specialties: string[];
  goalTags: string[];
  experienceLevelsServed: string[];
  coachingStyle: string | null;
  serviceBoundaries: string | null;
  consultationExpectations: string | null;
  languages: string[];
  countryCode: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  serviceRadiusMeters: number | null;
  serviceArea: string | null;
  remoteAvailable: boolean;
  serviceModes: string[];
  priceFrom: number | null;
  priceTo: number | null;
  pricingCurrency: string;
  pricingBasis: string | null;
  contactForPricing: boolean;
  availabilitySummary: string | null;
  typicalAvailability: string[];
  availabilityDetails: string | null;
  availabilityConfirmedAt: string | null;
  clientAcceptanceStatus: string;
  websiteUrl: string | null;
  socialLinks: Record<string, string>;
  approvalStatus: string;
  isActive: boolean;
  isPublic: boolean;
  identityVerificationStatus?: string;
  trustSummary?: ProfessionalTrustSummary;
  reviewFeedbackPublic?: string | null;
  lastSubmittedAt?: string | null;
  categories: ProfessionalCategoryRecord[];
  credentials: ProfessionalCredentialRecord[];
  services: ProfessionalServiceRecord[];
  createdAt: string | null;
  updatedAt: string | null;
  directoryCompletenessScore?: number;
};

export type ClientProfileRecord = {
  id: string;
  userId: string;
  firstName: string | null;
  countryCode: string;
  city: string | null;
  state: string | null;
  legacyGoals: string[];
  goalTags: string[];
  interestedServiceCategorySlugs: string[];
  preferredServiceMode: string | null;
  experienceLevel: string | null;
  budgetRange: string | null;
  budgetBasis: string | null;
  preferredRadius: number | null;
  preferredRadiusMeters: number | null;
  startTimeline: string | null;
  supportFrequency: string | null;
  preferredLanguages: string[];
  languageRequired: boolean;
  preferenceNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MarketplaceSnapshot = {
  generatedAt: string | null;
  categories: ProfessionalCategoryRecord[];
  professionals: ProfessionalProfileRecord[];
};

export const EMPTY_MARKETPLACE_SNAPSHOT: MarketplaceSnapshot = {
  generatedAt: null,
  categories: [],
  professionals: [],
};
