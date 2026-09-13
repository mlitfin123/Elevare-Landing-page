import { posingErrorMessage } from "./i18n/posing-messages.ts";
import { parseQuickAnalysisLocale } from "./quick-analysis-locale.ts";
import { QuickAnalysisServerError } from "./quick-analysis-server.ts";
import { StageLabGatewayError } from "./stagelab-posing-gateway.ts";
export function posingErrorResponse(error: unknown, request: Request) {
  const locale = parseQuickAnalysisLocale(request.headers.get("X-StageLab-Locale")) ?? "en";
  const known = error instanceof QuickAnalysisServerError || error instanceof StageLabGatewayError;
  const code = known ? error.code : "UNEXPECTED_ERROR";
  return Response.json({ code, error: posingErrorMessage(code, locale) }, { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}
