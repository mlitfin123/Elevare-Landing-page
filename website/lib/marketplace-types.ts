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
};

export type ProfessionalProfileRecord = {
  id: string;
  userId: string;
  displayName: string;
  profileSlug: string;
  profilePhotoUrl: string | null;
  professionalTitle: string;
  bio: string;
  yearsExperience: number | null;
  specialties: string[];
  city: string | null;
  state: string | null;
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
  clientAcceptanceStatus: string;
  websiteUrl: string | null;
  socialLinks: Record<string, string>;
  approvalStatus: string;
  isActive: boolean;
  isPublic: boolean;
  identityVerificationStatus: string;
  reviewFeedbackPublic: string | null;
  lastSubmittedAt: string | null;
  categories: ProfessionalCategoryRecord[];
  credentials: ProfessionalCredentialRecord[];
  services: ProfessionalServiceRecord[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type ClientProfileRecord = {
  id: string;
  userId: string;
  firstName: string | null;
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
  startTimeline: string | null;
  supportFrequency: string | null;
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
