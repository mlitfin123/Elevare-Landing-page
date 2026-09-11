export type ConciergeCaseStatus =
  | "submitted"
  | "reviewing"
  | "needs_client_information"
  | "sourcing_professionals"
  | "awaiting_professional_response"
  | "recommendations_ready"
  | "introduction_ready"
  | "introduced"
  | "follow_up_due"
  | "consultation_reported"
  | "rematch_requested"
  | "no_inventory"
  | "closed";

export type ConciergeRecommendationStatus =
  | "selected"
  | "awaiting_professional_response"
  | "clarification_requested"
  | "interested"
  | "declined"
  | "no_response"
  | "expired"
  | "withdrawn"
  | "shortlisted"
  | "client_selected"
  | "client_not_interested"
  | "introduced"
  | "consultation_reported"
  | "hired_reported"
  | "unsuccessful";

export type ConciergeRequestSummary = {
  primary_goal: string | null;
  support_type: string | null;
  category_slug: string | null;
  specialty: string | null;
  service_mode: string | null;
  location_label: string | null;
  travel_radius_miles?: number | null;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  start_timeframe: string | null;
  general_availability?: string | null;
  experience_level?: string | null;
  preferred_languages: string[];
  language_required: boolean;
  service_preferences?: string[];
  note?: string | null;
};

export type ConciergeProfileSummary = {
  slug: string;
  display_name: string;
  professional_title: string | null;
  profile_photo_url: string | null;
  location_city: string | null;
  location_state: string | null;
  delivery_modes: string[];
  languages: string[];
  price_min_cents: number | null;
  price_max_cents: number | null;
  service_categories: Array<{ slug?: string; label?: string }>;
  marketplace_specialties: string[];
};

export type ConciergeRecommendation = {
  recommendation_code: string;
  status: ConciergeRecommendationStatus;
  fit_summary: string | null;
  profile: ConciergeProfileSummary;
  professional_contact_email: string | null;
  introduced_at: string | null;
};

export type ConciergeCase = {
  case_code: string;
  status: ConciergeCaseStatus;
  created_at: string;
  last_activity_at: string;
  follow_up_due_at: string | null;
  outcome_code: string | null;
  closure_reason_code: string | null;
  request: ConciergeRequestSummary;
  recommendations: ConciergeRecommendation[];
};

export type ConciergeInvitation = {
  invitation_code: string;
  case_code: string;
  status: ConciergeRecommendationStatus;
  response_deadline_at: string | null;
  responded_at: string | null;
  request: ConciergeRequestSummary;
  client_contact_email: string | null;
  introduced_at: string | null;
};

export const CONCIERGE_CASE_STATUS_LABELS: Record<ConciergeCaseStatus, string> = {
  submitted: "Submitted",
  reviewing: "Under review",
  needs_client_information: "More information needed",
  sourcing_professionals: "Finding potential fits",
  awaiting_professional_response: "Checking availability",
  recommendations_ready: "Recommendations ready",
  introduction_ready: "Introduction requested",
  introduced: "Introduction completed",
  follow_up_due: "Follow-up available",
  consultation_reported: "Outcome received",
  rematch_requested: "Rematch requested",
  no_inventory: "No suitable match available yet",
  closed: "Closed",
};

export const CONCIERGE_INVITATION_STATUS_LABELS: Record<ConciergeRecommendationStatus, string> = {
  selected: "Selected for review",
  awaiting_professional_response: "Response requested",
  clarification_requested: "Clarification requested",
  interested: "Interested",
  declined: "Declined",
  no_response: "No response",
  expired: "Expired",
  withdrawn: "Withdrawn",
  shortlisted: "Shared with client",
  client_selected: "Client requested an introduction",
  client_not_interested: "Client declined",
  introduced: "Introduction completed",
  consultation_reported: "Consultation reported",
  hired_reported: "Hire reported by client",
  unsuccessful: "Closed without a connection",
};

export function humanizeConciergeValue(value: string | null | undefined) {
  if (!value) return null;
  return value.replaceAll(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isInvitationActionable(status: ConciergeRecommendationStatus) {
  return status === "awaiting_professional_response" || status === "clarification_requested";
}
