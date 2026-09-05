import { NextResponse } from "next/server";
import {
  QuickAnalysisServerError,
  assertQuickAnalysisSameOrigin,
  enforceQuickAnalysisRateLimit,
  getQuickAnalysisSupabase,
  quickAnalysisErrorResponse,
} from "@/lib/quick-analysis-server";
import { validateTranslationFeedbackSubmission } from "@/lib/translation-feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertQuickAnalysisSameOrigin(request);

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > 8_192) {
      throw new QuickAnalysisServerError("INVALID_FEEDBACK", "The feedback was too long.", 413);
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new QuickAnalysisServerError("INVALID_FEEDBACK", "The feedback could not be validated.", 400);
    }

    const validation = validateTranslationFeedbackSubmission(payload);
    if (!validation.ok) {
      throw new QuickAnalysisServerError("INVALID_FEEDBACK", "The feedback could not be validated.", 400);
    }

    // Bots that populate the hidden field receive a neutral success without creating a record.
    if (validation.data.website) {
      return NextResponse.json({ accepted: true }, { status: 202 });
    }

    const supabase = getQuickAnalysisSupabase();
    await enforceQuickAnalysisRateLimit(request, "translation_feedback", supabase);
    const { error } = await supabase.from("translation_feedback").insert({
      locale: validation.data.locale,
      sanitized_public_path: validation.data.sanitizedPublicPath,
      category: validation.data.category,
      description: validation.data.description,
      suggested_correction: validation.data.suggestedCorrection,
      optional_contact_email: validation.data.optionalContactEmail,
      client_submission_id: validation.data.clientSubmissionId,
    });

    if (error && error.code !== "23505") {
      throw new QuickAnalysisServerError(
        "FEEDBACK_STORAGE_UNAVAILABLE",
        "The feedback could not be stored safely.",
        503,
      );
    }

    return NextResponse.json({ accepted: true }, { status: error?.code === "23505" ? 200 : 201 });
  } catch (error) {
    return quickAnalysisErrorResponse(error);
  }
}
