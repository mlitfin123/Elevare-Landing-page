import { z } from "zod";
import { parseCanonicalPosingResult } from "./posing-contract.ts";
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
  if (value.frames.some((frame, index) => frame.index !== index || frame.timestamp_ms >= value.video.duration_seconds * 1000 || (index > 0 && frame.timestamp_ms <= value.frames[index - 1]!.timestamp_ms))) {
    context.addIssue({ code: "custom", path: ["frames"], message: "Frames must be ordered within the actual video duration." });
  }
  if (new Set(indexes).size !== indexes.length) {
    context.addIssue({ code: "custom", path: ["frames"], message: "Frame indexes must be unique." });
  }
});

export const posingAnalysisResultSchema = z.unknown().transform((value, context) => {
  try { return parseCanonicalPosingResult(value); } catch {
    context.addIssue({ code: "custom", message: "Unsupported posing result contract." });
    return z.NEVER;
  }
});

export function parsePosingAnalysisResult(value: unknown): PosingAnalysisResult {
  return posingAnalysisResultSchema.parse(value);
}

export function isStageAnalysisProduct(value: unknown): value is (typeof STAGE_ANALYSIS_PRODUCTS)[number] {
  return typeof value === "string" && STAGE_ANALYSIS_PRODUCTS.includes(value as (typeof STAGE_ANALYSIS_PRODUCTS)[number]);
}
