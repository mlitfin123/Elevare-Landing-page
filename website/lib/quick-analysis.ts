export const QUICK_ANALYSIS_PRODUCT_NAME = "StageLab Quick Analysis";
export const QUICK_ANALYSIS_PRICE_CENTS = 99;
export const QUICK_ANALYSIS_CURRENCY = "usd";
export const QUICK_ANALYSIS_RESULT_HOURS = 72;
export const QUICK_ANALYSIS_MAX_RETRIES = 3;
export const QUICK_ANALYSIS_MIN_PHOTOS = 3;
export const QUICK_ANALYSIS_MAX_PHOTOS = 5;
export const QUICK_ANALYSIS_MAX_CONTEXT_LENGTH = 400;
export const QUICK_ANALYSIS_MAX_IMAGE_BYTES = 1_500_000;
export const QUICK_ANALYSIS_MAX_TOTAL_BYTES = 4_000_000;
export const QUICK_ANALYSIS_MAX_IMAGE_DIMENSION = 1_600;

export const QUICK_ANALYSIS_DIVISIONS = [
  "Bodybuilding",
  "Classic Physique",
  "Men's Physique",
  "Bikini",
  "Wellness",
  "Figure",
  "Fitness",
  "Women's Physique",
  "Women's Bodybuilding",
] as const;

export type QuickAnalysisDivision = (typeof QUICK_ANALYSIS_DIVISIONS)[number];
export type QuickAnalysisMode = "competition_prep" | "physique_check";
export type QuickAnalysisCompetitionStatus = "preparing" | "assessing";
export type QuickAnalysisConfidence = "low" | "moderate" | "high";
export type QuickAnalysisStageReadinessCategory =
  | "Far from stage condition"
  | "Developing"
  | "Moderately close"
  | "Close"
  | "Very close visually";
export type QuickAnalysisStageConditionDistance = "significant" | "moderate" | "close" | "very_close";
export type QuickAnalysisStatus =
  | "checkout_created"
  | "paid"
  | "processing"
  | "failed_retryable"
  | "completed"
  | "expired";

export type QuickAnalysisContext = {
  analysisMode: QuickAnalysisMode;
  division: QuickAnalysisDivision;
  competitionStatus: QuickAnalysisCompetitionStatus;
  weeksOut: number | null;
  optionalContext: string | null;
  ageConfirmed: true;
  aiConsentConfirmed: true;
};

export type QuickAnalysisResult = {
  analysis_mode?: QuickAnalysisMode;
  stage_readiness_score: number | null;
  stage_readiness_category: QuickAnalysisStageReadinessCategory | null;
  stage_condition_distance: QuickAnalysisStageConditionDistance | null;
  conditioning_score: number | null;
  muscularity_score: number | null;
  symmetry_score: number | null;
  presentation_score: number | null;
  estimated_body_fat_min: number;
  estimated_body_fat_max: number;
  confidence: QuickAnalysisConfidence;
  prep_status: string;
  division_alignment_score: number;
  conditioning_assessment: string;
  visible_conditioning_markers: string[];
  muscularity_assessment: string;
  symmetry_assessment: string;
  presentation_assessment: string;
  visible_strengths: string[];
  areas_to_improve: string[];
  judges_perspective: string;
  summary: string;
  explanation: string;
  limitations: string[];
  caution_flags: string[];
};

export type QuickAnalysisPublicState = {
  analysisMode: QuickAnalysisMode;
  paymentStatus: "unpaid" | "paid" | "refunded" | "failed";
  analysisStatus: QuickAnalysisStatus;
  canAnalyze: boolean;
  retryCount: number;
  maxRetries: number;
  expiresAt: string | null;
  result: QuickAnalysisResult | null;
};

export const QUICK_ANALYSIS_STAGE_READINESS_WEIGHTS = {
  conditioning: 0.4,
  muscularity: 0.25,
  symmetry: 0.2,
  presentation: 0.15,
} as const;

export function calculateStageReadinessScore(scores: {
  conditioning: number;
  muscularity: number;
  symmetry: number;
  presentation: number;
}) {
  return Math.round(
    scores.conditioning * QUICK_ANALYSIS_STAGE_READINESS_WEIGHTS.conditioning +
      scores.muscularity * QUICK_ANALYSIS_STAGE_READINESS_WEIGHTS.muscularity +
      scores.symmetry * QUICK_ANALYSIS_STAGE_READINESS_WEIGHTS.symmetry +
      scores.presentation * QUICK_ANALYSIS_STAGE_READINESS_WEIGHTS.presentation,
  );
}

export function getStageReadinessCategory(score: number): QuickAnalysisStageReadinessCategory {
  if (score <= 39) return "Far from stage condition";
  if (score <= 59) return "Developing";
  if (score <= 74) return "Moderately close";
  if (score <= 89) return "Close";
  return "Very close visually";
}

export function getStageConditionDistance(score: number): QuickAnalysisStageConditionDistance {
  if (score <= 39) return "significant";
  if (score <= 59) return "moderate";
  if (score <= 79) return "close";
  return "very_close";
}

export function formatQuickAnalysisPrice() {
  return `$${(QUICK_ANALYSIS_PRICE_CENTS / 100).toFixed(2)}`;
}
