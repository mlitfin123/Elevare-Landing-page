import { z } from "zod";
import {
  QUICK_ANALYSIS_DIVISIONS,
  QUICK_ANALYSIS_MAX_CONTEXT_LENGTH,
  calculateStageReadinessScore,
  getStageConditionDistance,
  getStageReadinessCategory,
  type QuickAnalysisContext,
  type QuickAnalysisMode,
  type QuickAnalysisResult,
} from "./quick-analysis.ts";

const persistedOutputText = z.string().trim().min(1).refine(
  (value) => !/(?:data:image\b|https?:\/\/\S+|base64\s*[,;])/i.test(value),
  "Analysis output cannot contain image or external resource data.",
);
const conciseText = persistedOutputText.max(2_000);
const conciseList = z.array(persistedOutputText.max(320)).max(10);

export const quickAnalysisContextSchema = z
  .object({
    division: z.enum(QUICK_ANALYSIS_DIVISIONS),
    analysisMode: z.enum(["competition_prep", "physique_check"]).default("competition_prep"),
    competitionStatus: z.enum(["preparing", "assessing"]),
    weeksOut: z.number().int().min(0).max(60).nullable(),
    optionalContext: z.string().trim().max(QUICK_ANALYSIS_MAX_CONTEXT_LENGTH).nullable(),
    ageConfirmed: z.literal(true),
    aiConsentConfirmed: z.literal(true),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.analysisMode === "physique_check" && value.competitionStatus !== "assessing") {
      context.addIssue({
        code: "custom",
        path: ["competitionStatus"],
        message: "Physique Check is a current snapshot, not competition-prep timing guidance.",
      });
    }

    if (value.analysisMode === "physique_check" && value.weeksOut != null) {
      context.addIssue({
        code: "custom",
        path: ["weeksOut"],
        message: "Physique Check does not use a weeks-out estimate.",
      });
    }

    if (value.competitionStatus === "preparing" && value.weeksOut == null) {
      context.addIssue({
        code: "custom",
        path: ["weeksOut"],
        message: "Enter how many weeks out you are.",
      });
    }

    if (value.competitionStatus === "assessing" && value.weeksOut != null) {
      context.addIssue({
        code: "custom",
        path: ["weeksOut"],
        message: "Weeks out is only used when preparing for a competition.",
      });
    }
  });

export const quickAnalysisResultSchema = z
  .object({
    analysis_mode: z.enum(["competition_prep", "physique_check"]),
    stage_readiness_score: z.number().int().min(0).max(100).nullable(),
    stage_readiness_category: z.enum([
      "Far from stage condition",
      "Developing",
      "Moderately close",
      "Close",
      "Very close visually",
    ]).nullable(),
    stage_condition_distance: z.enum(["significant", "moderate", "close", "very_close"]).nullable(),
    conditioning_score: z.number().int().min(0).max(100).nullable(),
    muscularity_score: z.number().int().min(0).max(100).nullable(),
    symmetry_score: z.number().int().min(0).max(100).nullable(),
    presentation_score: z.number().int().min(0).max(100).nullable(),
    estimated_body_fat_min: z.number().int().min(2).max(60),
    estimated_body_fat_max: z.number().int().min(3).max(65),
    confidence: z.enum(["low", "moderate", "high"]),
    prep_status: conciseText,
    division_alignment_score: z.number().int().min(0).max(100),
    conditioning_assessment: conciseText,
    visible_conditioning_markers: conciseList,
    muscularity_assessment: conciseText,
    symmetry_assessment: conciseText,
    presentation_assessment: conciseText,
    visible_strengths: conciseList,
    areas_to_improve: conciseList,
    judges_perspective: conciseText,
    summary: conciseText,
    explanation: conciseText,
    limitations: conciseList,
    caution_flags: conciseList,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.estimated_body_fat_min >= value.estimated_body_fat_max) {
      context.addIssue({
        code: "custom",
        path: ["estimated_body_fat_max"],
        message: "The maximum body-fat estimate must be greater than the minimum.",
      });
    }

    const scoreFields = [
      value.conditioning_score,
      value.muscularity_score,
      value.symmetry_score,
      value.presentation_score,
    ];
    if (value.analysis_mode === "competition_prep") {
      if (
        value.stage_readiness_score != null ||
        value.stage_readiness_category != null ||
        value.stage_condition_distance != null ||
        scoreFields.some((score) => score != null)
      ) {
        context.addIssue({
          code: "custom",
          path: ["stage_readiness_score"],
          message: "Stage Readiness fields are reserved for Physique Check.",
        });
      }
      return;
    }

    if (
      value.stage_readiness_score == null ||
      value.stage_readiness_category == null ||
      value.stage_condition_distance == null ||
      scoreFields.some((score) => score == null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["stage_readiness_score"],
        message: "Physique Check requires Stage Readiness and all four sub-scores.",
      });
      return;
    }

    const expectedScore = calculateStageReadinessScore({
      conditioning: value.conditioning_score!,
      muscularity: value.muscularity_score!,
      symmetry: value.symmetry_score!,
      presentation: value.presentation_score!,
    });
    if (value.stage_readiness_score !== expectedScore) {
      context.addIssue({
        code: "custom",
        path: ["stage_readiness_score"],
        message: "Stage Readiness must use the documented 40/25/20/15 weighting.",
      });
    }
    if (value.stage_readiness_category !== getStageReadinessCategory(expectedScore)) {
      context.addIssue({
        code: "custom",
        path: ["stage_readiness_category"],
        message: "Stage Readiness category does not match the weighted score.",
      });
    }
    if (value.stage_condition_distance !== getStageConditionDistance(expectedScore)) {
      context.addIssue({
        code: "custom",
        path: ["stage_condition_distance"],
        message: "Stage-condition distance does not match the weighted score.",
      });
    }

    const persistedText = [
      value.prep_status,
      value.conditioning_assessment,
      ...value.visible_conditioning_markers,
      value.muscularity_assessment,
      value.symmetry_assessment,
      value.presentation_assessment,
      ...value.visible_strengths,
      ...value.areas_to_improve,
      value.judges_perspective,
      value.summary,
      value.explanation,
      ...value.limitations,
      ...value.caution_flags,
    ].join(" ");
    const prohibitedPatterns = [
      /\b\d{1,2}\s*(?:[-\u2013]\s*)?weeks?\s*out\b/i,
      /\b\d{1,2}\s*weeks?\s*(?:from|away from)\s+(?:the\s+)?stage\b/i,
      /\b(?:guaranteed?|will)\s+(?:win|place|qualify)\b/i,
      /\b(?:guarantees?|ensures?)\s+(?:a\s+)?(?:contest\s+)?(?:placement|placing|win|victory|qualification)\b/i,
      /\b(?:is|represents|provides)\s+(?:an?\s+)?official\s+(?:judging|judge|score|result)\b/i,
      /\b(?:you(?:'ve| have)|the athlete has|the physique has)\s+(?:improved|declined|worsened|gained|lost|tightened|softened)\b/i,
      /\b(?:you|the athlete|the physique)\s+(?:improved|declined|worsened|gained|lost|tightened|softened)\b/i,
      /\b(?:compared (?:with|to) (?:a )?(?:previous|prior)|since (?:the )?(?:last|previous))\b/i,
    ];
    if (prohibitedPatterns.some((pattern) => pattern.test(persistedText))) {
      context.addIssue({
        code: "custom",
        path: ["summary"],
        message: "Physique Check cannot include timelines, guaranteed outcomes, official scores, or historical change claims.",
      });
    }
  });

export function parseQuickAnalysisContext(value: unknown): QuickAnalysisContext {
  return quickAnalysisContextSchema.parse(value);
}

export function parseQuickAnalysisResult(value: unknown, expectedMode?: QuickAnalysisMode): QuickAnalysisResult {
  const parsed = quickAnalysisResultSchema.parse(value);
  if (expectedMode && parsed.analysis_mode !== expectedMode) {
    throw new Error("The analysis mode does not match the request.");
  }
  return parsed;
}

export const QUICK_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "analysis_mode",
    "stage_readiness_score",
    "stage_readiness_category",
    "stage_condition_distance",
    "conditioning_score",
    "muscularity_score",
    "symmetry_score",
    "presentation_score",
    "estimated_body_fat_min",
    "estimated_body_fat_max",
    "confidence",
    "prep_status",
    "division_alignment_score",
    "conditioning_assessment",
    "visible_conditioning_markers",
    "muscularity_assessment",
    "symmetry_assessment",
    "presentation_assessment",
    "visible_strengths",
    "areas_to_improve",
    "judges_perspective",
    "summary",
    "explanation",
    "limitations",
    "caution_flags",
  ],
  properties: {
    analysis_mode: { type: "string", enum: ["competition_prep", "physique_check"] },
    stage_readiness_score: { type: ["integer", "null"], minimum: 0, maximum: 100 },
    stage_readiness_category: {
      type: ["string", "null"],
      enum: ["Far from stage condition", "Developing", "Moderately close", "Close", "Very close visually", null],
    },
    stage_condition_distance: { type: ["string", "null"], enum: ["significant", "moderate", "close", "very_close", null] },
    conditioning_score: { type: ["integer", "null"], minimum: 0, maximum: 100 },
    muscularity_score: { type: ["integer", "null"], minimum: 0, maximum: 100 },
    symmetry_score: { type: ["integer", "null"], minimum: 0, maximum: 100 },
    presentation_score: { type: ["integer", "null"], minimum: 0, maximum: 100 },
    estimated_body_fat_min: { type: "integer", minimum: 2, maximum: 60 },
    estimated_body_fat_max: { type: "integer", minimum: 3, maximum: 65 },
    confidence: { type: "string", enum: ["low", "moderate", "high"] },
    prep_status: { type: "string", minLength: 1, maxLength: 2_000 },
    division_alignment_score: { type: "integer", minimum: 0, maximum: 100 },
    conditioning_assessment: { type: "string", minLength: 1, maxLength: 2_000 },
    visible_conditioning_markers: {
      type: "array",
      maxItems: 10,
      items: { type: "string", minLength: 1, maxLength: 320 },
    },
    muscularity_assessment: { type: "string", minLength: 1, maxLength: 2_000 },
    symmetry_assessment: { type: "string", minLength: 1, maxLength: 2_000 },
    presentation_assessment: { type: "string", minLength: 1, maxLength: 2_000 },
    visible_strengths: {
      type: "array",
      maxItems: 10,
      items: { type: "string", minLength: 1, maxLength: 320 },
    },
    areas_to_improve: {
      type: "array",
      maxItems: 10,
      items: { type: "string", minLength: 1, maxLength: 320 },
    },
    judges_perspective: { type: "string", minLength: 1, maxLength: 2_000 },
    summary: { type: "string", minLength: 1, maxLength: 2_000 },
    explanation: { type: "string", minLength: 1, maxLength: 2_000 },
    limitations: {
      type: "array",
      maxItems: 10,
      items: { type: "string", minLength: 1, maxLength: 320 },
    },
    caution_flags: {
      type: "array",
      maxItems: 10,
      items: { type: "string", minLength: 1, maxLength: 320 },
    },
  },
} as const;
