import { z } from "zod";
import {
  POSING_DIVISIONS,
  POSING_DIVISION_KEYS,
  POSING_VIDEO_MAX_BYTES,
  POSING_VIDEO_MAX_SECONDS,
  POSING_VIDEO_MIME_TYPES,
  POSING_VIDEO_MIN_SECONDS,
  STAGE_ANALYSIS_PRODUCTS,
  type PosingAnalysisResult,
} from "./stage-analysis.ts";

const safeText = z.string().trim().min(1).max(2_000).refine(
  (value) => !/(?:data:image\b|https?:\/\/\S+|base64\s*[,;])/i.test(value),
  "Result text cannot contain media or external-resource data.",
);

export const stageAnalysisCheckoutSchema = z.object({
  product: z.enum(["posing_analysis", "complete_stage_analysis"]),
  division: z.enum(POSING_DIVISIONS),
  competitionStatus: z.enum(["preparing", "assessing"]).default("assessing"),
  weeksOut: z.number().int().min(0).max(60).nullable().default(null),
  optionalContext: z.string().trim().max(400).nullable().default(null),
  ageConfirmed: z.literal(true),
  aiConsentConfirmed: z.literal(true),
}).strict().superRefine((value, context) => {
  if (value.product === "posing_analysis" && (value.competitionStatus !== "assessing" || value.weeksOut != null)) {
    context.addIssue({ code: "custom", path: ["weeksOut"], message: "Posing Analysis does not use prep timing." });
  }
  if (value.product === "complete_stage_analysis" && value.competitionStatus === "preparing" && value.weeksOut == null) {
    context.addIssue({ code: "custom", path: ["weeksOut"], message: "Enter how many weeks out you are." });
  }
  if (value.competitionStatus === "assessing" && value.weeksOut != null) {
    context.addIssue({ code: "custom", path: ["weeksOut"], message: "Weeks out is only used during competition prep." });
  }
});

const frameManifestSchema = z.object({
  index: z.number().int().min(0).max(15),
  timestamp_ms: z.number().int().min(0).max(POSING_VIDEO_MAX_SECONDS * 1_000),
  mime_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size_bytes: z.number().int().positive().max(5_000_000),
  width: z.number().int().positive().max(4_096).nullable(),
  height: z.number().int().positive().max(4_096).nullable(),
}).strict();

export const posingUploadManifestSchema = z.object({
  division: z.enum(POSING_DIVISION_KEYS),
  locale: z.enum(["en", "es-419", "pt-BR"]),
  source_type: z.enum(["recorded_video", "uploaded_video"]),
  video: z.object({
    file_name: z.string().trim().min(1).max(180),
    mime_type: z.enum(POSING_VIDEO_MIME_TYPES),
    size_bytes: z.number().int().positive().max(POSING_VIDEO_MAX_BYTES),
    duration_seconds: z.number().min(POSING_VIDEO_MIN_SECONDS).max(POSING_VIDEO_MAX_SECONDS),
  }).strict(),
  frames: z.array(frameManifestSchema).min(4).max(16),
  retry: z.boolean().optional().default(false),
}).strict().superRefine((value, context) => {
  const indexes = value.frames.map((frame) => frame.index);
  if (new Set(indexes).size !== indexes.length) {
    context.addIssue({ code: "custom", path: ["frames"], message: "Frame indexes must be unique." });
  }
});

const score = z.number().int().min(0).max(100).nullable();
const list = z.array(safeText.max(500)).max(20);

export const posingAnalysisResultSchema = z.object({
  schema_version: z.literal("posing_analysis_v1"),
  analysis_id: z.string().trim().min(1).max(200),
  division: z.enum(POSING_DIVISIONS),
  video_usability_status: z.enum(["usable", "limited", "unusable"]),
  video_usability_reason: safeText,
  analysis_quality: z.enum(["low", "medium", "high", "unusable"]),
  overall_stage_lab_posing_score: score,
  score_explanation: safeText,
  biggest_opportunity: safeText,
  overall_strengths: list,
  highest_priority_corrections: z.array(z.object({
    title: safeText.max(300),
    visible_evidence: safeText.max(800),
    try_this: safeText.max(800),
  }).strict()).max(12),
  poses_detected: z.array(z.object({
    pose_name: safeText.max(200),
    segment_start_ms: z.number().int().nonnegative().nullable(),
    segment_end_ms: z.number().int().nonnegative().nullable(),
    representative_frame_timestamps_ms: z.array(z.number().int().nonnegative()).max(16),
    confidence: z.enum(["low", "medium", "high"]),
    pose_score: score,
    component_scores: z.array(z.object({
      label: safeText.max(200),
      score,
      note: safeText.max(800),
    }).strict()).max(40),
    strongest_aspect: safeText,
    biggest_issue: safeText,
    corrections: list,
    coaching_cue: safeText,
  }).strict()).max(20),
  transition_observations: list,
  consistency_observations: list,
  quality_flags: list,
  athlete_next_focus: list,
  disclaimer: safeText,
}).strict();

export function parsePosingAnalysisResult(value: unknown): PosingAnalysisResult {
  return posingAnalysisResultSchema.parse(value);
}

export function isStageAnalysisProduct(value: unknown): value is (typeof STAGE_ANALYSIS_PRODUCTS)[number] {
  return typeof value === "string" && STAGE_ANALYSIS_PRODUCTS.includes(value as (typeof STAGE_ANALYSIS_PRODUCTS)[number]);
}
