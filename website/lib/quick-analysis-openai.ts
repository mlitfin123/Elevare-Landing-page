import "server-only";

import type { NormalizedQuickAnalysisImage } from "./quick-analysis-images.ts";
import type { QuickAnalysisContext, QuickAnalysisResult } from "./quick-analysis.ts";
import {
  QUICK_ANALYSIS_JSON_SCHEMA,
  parseQuickAnalysisResult,
} from "./quick-analysis-schema.ts";
import { getRequiredServerEnv } from "./quick-analysis-server.ts";

export const QUICK_ANALYSIS_SYSTEM_PROMPT = `You are the StageLab Quick Analysis visual assessment model for bodybuilding and physique evaluation.

Analyze only the current photos included in this request.

This is a one-time snapshot analysis. You have no prior check-in, no historical photos, and no historical physique trend data.

Never claim that the athlete has improved, declined, gained, lost, tightened up, flattened out, or otherwise changed compared with a previous check-in.

Never provide a medical claim, clinical diagnosis, guaranteed contest outcome, or exact body-fat percentage.

Use visible conditioning markers, muscularity, symmetry, proportions, and overall presentation as the primary assessment signals.

Treat any body-fat estimate as a conservative visual range and supporting context only.

If the athlete selected a competition division, assess visible alignment with the general presentation demands of that division without claiming guaranteed judging outcomes.

If the athlete provided weeks-out context, interpret visible conditioning in relation to that stated timeline conservatively.

Clearly acknowledge limitations caused by lighting, posing, image quality, camera angle, clothing, water/glycogen status, and other visual variables where relevant.

Do not prescribe drugs, PEDs, medications, dehydration protocols, dangerous food/fluid restriction, or other medically risky interventions.

Return a concise but useful judge-style snapshot assessment.`;

const PHYSIQUE_CHECK_PROMPT = `The requested analysis_mode is physique_check.

The user is not necessarily preparing for a competition. Evaluate the current physique against general competition-level visual standards for the selected division without suggesting that the user should compete.

Do not estimate weeks out, time from stage condition, a show date, contest placement, contest eligibility, or probability of winning or placing. Do not present the result as an official judging score.

Assess visible conditioning, muscularity, symmetry and proportions, presentation, and alignment with typical competition-level visual markers. Use a conservative visual body-fat range only as supporting context.

Return integer sub-scores from 0 to 100 for conditioning, muscularity, symmetry, and presentation. Stage Readiness must equal the rounded weighted score: conditioning 40%, muscularity 25%, symmetry 20%, and presentation 15%.

Use these Stage Readiness categories: 0-39 Far from stage condition; 40-59 Developing; 60-74 Moderately close; 75-89 Close; 90-100 Very close visually.

Use stage_condition_distance significant for 0-39, moderate for 40-59, close for 60-79, and very_close for 80-100.

Stage Readiness reflects only how closely the visible physique aligns with typical competition-level conditioning, muscularity, symmetry, and presentation markers. It is not an official judging score and does not predict contest placement.

Do not prescribe calorie targets, dehydration, aggressive deficits, PEDs, diuretics, or dangerous contest-prep methods. Use neutral, specific language and say when a feature cannot be observed confidently.`;

const COMPETITION_PREP_PROMPT = `The requested analysis_mode is competition_prep.

Preserve the full competition-prep snapshot assessment. Use the selected competition status and weeks-out context where supplied. Provide conditioning, visual body-fat range, muscularity, symmetry, presentation, division alignment, prep-status or timeline context, and a judge-style perspective.

Set all Stage Readiness and Stage Readiness sub-score fields to null because this mode uses the established competition-prep report rather than the Physique Check score.`;

type OpenAIResponsePayload = {
  id?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export type QuickAnalysisOpenAIResult = {
  result: QuickAnalysisResult;
  model: string;
  requestId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
};

export class QuickAnalysisProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    retryable = true,
  ) {
    super(message);
    this.name = "QuickAnalysisProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

function extractOutputText(payload: OpenAIResponsePayload) {
  if (payload.output_text?.trim()) return payload.output_text;
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && content.text)?.text;
}

function includesRefusal(payload: OpenAIResponsePayload) {
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .some((content) => content.type === "refusal" || Boolean(content.refusal));
}

function buildContextPrompt(context: QuickAnalysisContext, repair = false) {
  const details = {
    analysis_mode: context.analysisMode,
    selected_division: context.division,
    competition_status:
      context.competitionStatus === "preparing" ? "Currently preparing for a competition" : "Not currently preparing; snapshot assessment only",
    weeks_out: context.weeksOut,
    optional_context: context.optionalContext,
  };
  const modeInstructions = context.analysisMode === "physique_check" ? PHYSIQUE_CHECK_PROMPT : COMPETITION_PREP_PROMPT;
  return `${repair ? "The previous response did not match the required schema or mode rules. Return a corrected response only.\n\n" : ""}${modeInstructions}\n\nAssess the current photos as one snapshot. Do not infer change over time. Context:\n${JSON.stringify(details)}`;
}

function buildRequestBody(
  model: string,
  context: QuickAnalysisContext,
  images: NormalizedQuickAnalysisImage[],
  repair: boolean,
) {
  return {
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: QUICK_ANALYSIS_SYSTEM_PROMPT }],
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: buildContextPrompt(context, repair) },
          ...images.map((image) => ({
            type: "input_image",
            image_url: `data:${image.mimeType};base64,${image.bytes.toString("base64")}`,
            detail: "high",
          })),
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "stagelab_quick_analysis",
        strict: true,
        schema: QUICK_ANALYSIS_JSON_SCHEMA,
      },
    },
    max_output_tokens: 3_500,
  };
}

export async function requestQuickAnalysisFromOpenAI({
  context,
  images,
  fetchImpl = fetch,
  apiKey = getRequiredServerEnv("OPENAI_API_KEY"),
  model = getRequiredServerEnv("OPENAI_QUICK_ANALYSIS_MODEL"),
  timeoutMs = 50_000,
}: {
  context: QuickAnalysisContext;
  images: NormalizedQuickAnalysisImage[];
  fetchImpl?: typeof fetch;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}): Promise<QuickAnalysisOpenAIResult> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildRequestBody(model, context, images, attempt === 1)),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new QuickAnalysisProviderError("OPENAI_RATE_LIMIT", "The analysis service is busy. Please re-upload your photos and try again.");
        }
        if (response.status >= 500) {
          throw new QuickAnalysisProviderError("OPENAI_TEMPORARY_ERROR", "The analysis service is temporarily unavailable. Please try again.");
        }
        throw new QuickAnalysisProviderError("OPENAI_REQUEST_REJECTED", "The submitted photos could not be analyzed.");
      }

      const payload = (await response.json()) as OpenAIResponsePayload;
      if (includesRefusal(payload)) {
        throw new QuickAnalysisProviderError(
          "OPENAI_REFUSAL",
          "The submitted photos could not be analyzed. Try a different set of current physique photos.",
        );
      }

      const outputText = extractOutputText(payload);
      if (!outputText) {
        if (attempt === 0) continue;
        throw new QuickAnalysisProviderError("OPENAI_EMPTY_RESPONSE", "The analysis could not be completed.");
      }

      try {
        const result = parseQuickAnalysisResult(JSON.parse(outputText), context.analysisMode);
        return {
          result,
          model,
          requestId: response.headers.get("x-request-id") ?? payload.id ?? null,
          inputTokens: payload.usage?.input_tokens ?? null,
          outputTokens: payload.usage?.output_tokens ?? null,
        };
      } catch {
        if (attempt === 0) continue;
        throw new QuickAnalysisProviderError("OPENAI_SCHEMA_ERROR", "The analysis report could not be validated.");
      }
    } catch (error) {
      if (error instanceof QuickAnalysisProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new QuickAnalysisProviderError("OPENAI_TIMEOUT", "The analysis timed out. Please re-upload your photos and try again.");
      }
      throw new QuickAnalysisProviderError("OPENAI_NETWORK_ERROR", "The analysis service could not be reached. Please try again.");
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new QuickAnalysisProviderError("OPENAI_SCHEMA_ERROR", "The analysis report could not be validated.");
}
