import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { posingErrorResponse } from "../lib/posing-server-errors.ts";
import { StageLabGatewayError } from "../lib/stagelab-posing-gateway.ts";
import { QuickAnalysisServerError } from "../lib/quick-analysis-server.ts";
import { POSING_RUNTIME } from "../lib/posing-runtime.ts";
import { getPosingMessages } from "../lib/i18n/posing-messages.ts";
for (const locale of ["en", "es-419", "pt-BR"] as const) test(`server posing errors preserve status and localize ${locale}`, async () => {
  const request = new Request("https://example.invalid/api/stage-analysis/status", { headers: { "X-StageLab-Locale": locale } });
  const result = posingErrorResponse(new StageLabGatewayError("stagelab_gateway_timeout", "Raw provider English", 504, true), request);
  assert.equal(result.status, 504); assert.equal((await result.json()).error, getPosingMessages(locale).slowBody);
  const payment = posingErrorResponse(new QuickAnalysisServerError("PAYMENT_REQUIRED", "Raw payment English", 402), request);
  assert.equal(payment.status, 402); assert.equal((await payment.json()).error, getPosingMessages(locale).payment);
});
test("posing route execution limits match documented shared configuration", () => {
  for (const route of ["status", "posing/start", "posing/initialize"]) {
    const source = fs.readFileSync(new URL(`../app/api/stage-analysis/${route}/route.ts`, import.meta.url), "utf8");
    assert.equal(Number(source.match(/export const maxDuration = (\d+)/)![1]), POSING_RUNTIME.routeMaxSeconds);
    assert.ok(POSING_RUNTIME.gatewayTimeoutMs * 2 + 5000 < POSING_RUNTIME.routeMaxSeconds * 1000);
  }
});

for (const locale of ["en", "es-419", "pt-BR"] as const) test(`client posing request exceptions contain only localized copy in ${locale}`, async () => {
  const { PosingRequestError } = await import("../lib/posing-request-error.ts");
  assert.equal(new PosingRequestError("unexpected_raw_backend_English", locale).message, getPosingMessages(locale).genericError);
  assert.equal(new PosingRequestError("decode", locale).message, getPosingMessages(locale).decodeError);
});
