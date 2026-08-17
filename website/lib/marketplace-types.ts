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
  availabilitySummary: string | null;
  approvalStatus: string;
  isActive: boolean;
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
  goals: string | null;
  interestedServiceCategorySlugs: string[];
  preferredServiceMode: string | null;
  experienceLevel: string | null;
  approximateBudget: string | null;
  preferredRadius: number | null;
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
