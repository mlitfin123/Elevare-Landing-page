import { NextResponse } from "next/server";
import { normalizeQuickAnalysisImages, parseQuickAnalysisPhotoFormData } from "@/lib/quick-analysis-images";
import { requestQuickAnalysisFromOpenAI, QuickAnalysisProviderError } from "@/lib/quick-analysis-openai";
import {
  claimQuickAnalysisAttempt,
  completeQuickAnalysis,
  failQuickAnalysisAttempt,
  getQuickAnalysisByToken,
  toQuickAnalysisPublicState,
  type QuickAnalysisRow,
} from "@/lib/quick-analysis-repository";
import { parseQuickAnalysisContext } from "@/lib/quick-analysis-schema";
import { QUICK_ANALYSIS_REQUIRED_PHOTO_VIEWS } from "@/lib/quick-analysis";
import { normalizeStoredQuickAnalysisLocale } from "@/lib/quick-analysis-locale";
import {
  QuickAnalysisServerError,
  assertQuickAnalysisSameOrigin,
  enforceQuickAnalysisRateLimit,
  getQuickAnalysisAccessToken,
  getQuickAnalysisSupabase,
  quickAnalysisErrorResponse,
} from "@/lib/quick-analysis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const startedAt = Date.now();
  const supabase = getQuickAnalysisSupabase();
  let claimedRow: QuickAnalysisRow | null = null;
  let upload: Awaited<ReturnType<typeof normalizeQuickAnalysisImages>> | null = null;

  try {
    assertQuickAnalysisSameOrigin(request);
    await enforceQuickAnalysisRateLimit(request, "analyze", supabase);
    const form = await request.formData();
    const aiConsent = form.get("aiConsent");
    if (aiConsent !== "true") {
      throw new QuickAnalysisServerError(
        "CONSENT_REQUIRED",
        "Confirm AI photo processing before starting your analysis.",
      );
    }

    const token = getQuickAnalysisAccessToken(request);

    const entitlement = await getQuickAnalysisByToken(supabase, token);
    const publicState = toQuickAnalysisPublicState(entitlement);
    if (!publicState.canAnalyze) {
      throw new QuickAnalysisServerError(
        entitlement.analysis_status === "completed" ? "ALREADY_COMPLETED" : "ENTITLEMENT_UNAVAILABLE",
        entitlement.analysis_status === "completed"
          ? "This analysis has already been completed."
          : "This analysis is not currently available.",
        409,
      );
    }

    const photoInputs = parseQuickAnalysisPhotoFormData(form);
    upload = await normalizeQuickAnalysisImages(photoInputs);
    claimedRow = await claimQuickAnalysisAttempt(supabase, token);
    const context = parseQuickAnalysisContext({
      analysisMode: claimedRow.analysis_mode ?? "competition_prep",
      division: claimedRow.division,
      competitionStatus: claimedRow.competition_status,
      weeksOut: claimedRow.weeks_out,
      optionalContext: claimedRow.optional_context,
      ageConfirmed: true,
      aiConsentConfirmed: true,
    });
    const generationLocale = normalizeStoredQuickAnalysisLocale(claimedRow.generation_locale);
    const providerResult = await requestQuickAnalysisFromOpenAI({
      context,
      images: upload.images,
      generationLocale,
    });
    if (
      providerResult.result.photo_coverage === "limited" &&
      QUICK_ANALYSIS_REQUIRED_PHOTO_VIEWS.every((view) => providerResult.result.missing_or_limited_views.includes(view))
    ) {
      throw new QuickAnalysisProviderError(
        "PHOTO_SET_UNUSABLE",
        "We couldn't clearly assess the required front, side, and back views. Please replace those photos and try again. Your payment is still valid.",
      );
    }
    await completeQuickAnalysis(supabase, claimedRow, {
      result: providerResult.result,
      model: providerResult.model,
      openaiRequestId: providerResult.requestId,
      inputTokens: providerResult.inputTokens,
      outputTokens: providerResult.outputTokens,
    });

    console.info("Quick Analysis completed", {
      analysisId: claimedRow.id,
      photoCount: upload.images.length,
      views: upload.images.map((image) => image.view),
      formats: upload.images.map((image) => image.sourceFormat),
      dimensions: upload.images.map((image) => `${image.width}x${image.height}`),
      model: providerResult.model,
      openaiRequestId: providerResult.requestId,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        state: {
          ...toQuickAnalysisPublicState(claimedRow),
          analysisMode: context.analysisMode,
          analysisStatus: "completed",
          canAnalyze: false,
          result: providerResult.result,
        },
      },
      { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
    );
  } catch (error) {
    if (claimedRow) {
      const errorCode =
        error instanceof QuickAnalysisProviderError
          ? error.code
          : error instanceof QuickAnalysisServerError
            ? error.code
            : "ANALYSIS_UNEXPECTED_ERROR";
      await failQuickAnalysisAttempt(supabase, claimedRow, errorCode);
      console.warn("Quick Analysis attempt failed", {
        analysisId: claimedRow.id,
        errorCode,
        durationMs: Date.now() - startedAt,
      });
      if (error instanceof QuickAnalysisProviderError) {
        const message = error.code === "PHOTO_SET_UNUSABLE"
          ? error.message
          : "We couldn't complete your analysis. Your payment is still valid. Please re-upload your photos and try again. You will not be charged again.";
        return NextResponse.json(
          {
            error: message,
            code: error.code,
          },
          { status: 502, headers: { "Cache-Control": "no-store" } },
        );
      }
    }
    return quickAnalysisErrorResponse(error);
  } finally {
    upload?.clear();
    upload = null;
  }
}
