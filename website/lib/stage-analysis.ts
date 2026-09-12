import type { CanonicalPosingComponent, CanonicalPosingPose, CanonicalPosingResult } from "./posing-contract.ts";
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

export type PosingAnalysisComponent = CanonicalPosingComponent;
export type PosingAnalysisPose = CanonicalPosingPose;
export type PosingAnalysisResult = CanonicalPosingResult;

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
    analysisId?: string | null;
    startedAt?: string | null;
    phase?: "reserved" | "validating" | "analyzing" | "awaiting_start";
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
