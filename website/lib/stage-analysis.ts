import type { Locale } from "./i18n/config.ts";
import type { QuickAnalysisResult, QuickAnalysisStatus } from "./quick-analysis.ts";
import { QUICK_ANALYSIS_PRICE_CENTS, QUICK_ANALYSIS_CURRENCY } from "./quick-analysis.ts";

export const STAGE_ANALYSIS_CURRENCY = QUICK_ANALYSIS_CURRENCY;

export const STAGE_ANALYSIS_PRODUCTS = [
  "physique_analysis",
  "posing_analysis",
  "complete_stage_analysis",
] as const;

export type StageAnalysisProduct = (typeof STAGE_ANALYSIS_PRODUCTS)[number];
export type PaidStageAnalysisProduct = Exclude<StageAnalysisProduct, "physique_analysis">;

export const STAGE_ANALYSIS_PRODUCT_CONFIG = {
  physique_analysis: { priceCents: QUICK_ANALYSIS_PRICE_CENTS, label: "AI Physique Analysis" },
  posing_analysis: { priceCents: 99, label: "Bodybuilding Posing Analysis" },
  complete_stage_analysis: { priceCents: 149, label: "Complete Stage Analysis" },
} as const satisfies Record<StageAnalysisProduct, { priceCents: number; label: string }>;

export const POSING_DIVISIONS = [
  "Men's Physique",
  "Classic Physique",
  "Bodybuilding",
  "Bikini",
  "Wellness",
  "Figure",
] as const;

export const POSING_DIVISION_KEYS = [
  "mens_physique",
  "classic_physique",
  "bodybuilding",
  "bikini",
  "wellness",
  "figure",
] as const;

export type PosingDivision = (typeof POSING_DIVISIONS)[number];
export type PosingDivisionKey = (typeof POSING_DIVISION_KEYS)[number];

export const POSING_DIVISION_TO_KEY: Record<PosingDivision, PosingDivisionKey> = {
  "Men's Physique": "mens_physique",
  "Classic Physique": "classic_physique",
  Bodybuilding: "bodybuilding",
  Bikini: "bikini",
  Wellness: "wellness",
  Figure: "figure",
};

export const POSING_VIDEO_MIN_SECONDS = 5;
export const POSING_VIDEO_MAX_SECONDS = 45;
export const POSING_VIDEO_MAX_BYTES = 180 * 1024 * 1024;
export const POSING_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/webm",
  "video/3gpp",
] as const;

export type PosingStatus =
  | "not_included"
  | "checkout_created"
  | "awaiting_authorization"
  | "paid"
  | "uploading"
  | "processing"
  | "failed_retryable"
  | "completed"
  | "expired";

export type PosingAnalysisComponent = {
  label: string;
  score: number | null;
  note: string;
};

export type PosingAnalysisPose = {
  pose_name: string;
  segment_start_ms: number | null;
  segment_end_ms: number | null;
  representative_frame_timestamps_ms: number[];
  confidence: "low" | "medium" | "high";
  pose_score: number | null;
  component_scores: PosingAnalysisComponent[];
  strongest_aspect: string;
  biggest_issue: string;
  corrections: string[];
  coaching_cue: string;
};

export type PosingAnalysisResult = {
  schema_version: "posing_analysis_v1";
  analysis_id: string;
  division: PosingDivision;
  video_usability_status: "usable" | "limited" | "unusable";
  video_usability_reason: string;
  analysis_quality: "low" | "medium" | "high" | "unusable";
  overall_stage_lab_posing_score: number | null;
  score_explanation: string;
  biggest_opportunity: string;
  overall_strengths: string[];
  highest_priority_corrections: Array<{
    title: string;
    visible_evidence: string;
    try_this: string;
  }>;
  poses_detected: PosingAnalysisPose[];
  transition_observations: string[];
  consistency_observations: string[];
  quality_flags: string[];
  athlete_next_focus: string[];
  disclaimer: string;
};

export type StageAnalysisPublicState = {
  product: StageAnalysisProduct;
  division: PosingDivision;
  generationLocale: Locale;
  paymentStatus: "unpaid" | "paid" | "refunded" | "failed";
  expiresAt: string | null;
  physique: {
    included: boolean;
    status: QuickAnalysisStatus;
    canAnalyze: boolean;
    retryCount: number;
    result: QuickAnalysisResult | null;
  };
  posing: {
    included: boolean;
    status: PosingStatus;
    canUpload: boolean;
    canResume: boolean;
    retryCount: number;
    maxRetries: number;
    result: PosingAnalysisResult | null;
    errorCode: string | null;
  };
};

export function formatStageAnalysisPrice(product: StageAnalysisProduct) {
  return `$${(STAGE_ANALYSIS_PRODUCT_CONFIG[product].priceCents / 100).toFixed(2)} USD`;
}

export function includesPhysiqueAnalysis(product: StageAnalysisProduct) {
  return product === "physique_analysis" || product === "complete_stage_analysis";
}

export function includesPosingAnalysis(product: StageAnalysisProduct) {
  return product === "posing_analysis" || product === "complete_stage_analysis";
}
