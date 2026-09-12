import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { activatePaidQuickAnalysis, markStageLabOrderAuthorized, type QuickAnalysisRow } from "../lib/quick-analysis-repository.ts";
function database(status: "uploading" | "processing" | "completed", product: "posing_analysis" | "complete_stage_analysis") {
  let row = { id: "purchase", analysis_product: product, payment_status: "paid", stripe_payment_intent_id: "pi_test", stripe_checkout_session_id: "cs_test", posing_status: status, posing_analysis_id: "saved-result", expires_at: "2099-01-01T00:00:00Z", posing_result_json: status === "completed" ? { analysis_id: "saved-result" } : null } as QuickAnalysisRow;
  const updates: object[] = [];
  const db = { from: () => {
    let values: Record<string, unknown> | undefined; const filters: Array<(r: QuickAnalysisRow) => boolean> = [];
    const q = { select: () => q, update: (v: Record<string, unknown>) => { values = v; updates.push(v); return q; }, eq: (key: keyof QuickAnalysisRow, value: unknown) => { filters.push((r) => r[key] === value); return q; }, in: (key: keyof QuickAnalysisRow, values: unknown[]) => { filters.push((r) => values.includes(r[key])); return q; }, maybeSingle: async () => { if (!filters.every((f) => f(row))) return { data: null, error: null }; if (values) row = { ...row, ...values }; return { data: { ...row }, error: null }; } };
    return q;
  } } as unknown as SupabaseClient;
  return { db, updates, get row() { return row; }, set row(v) { row = v; } };
}
for (const product of ["posing_analysis", "complete_stage_analysis"] as const) for (const status of ["uploading", "processing", "completed"] as const) test(`replayed ${product} payment and authorization preserve ${status}`, async () => {
  const h = database(status, product); const before = { ...h.row };
  await activatePaidQuickAnalysis(h.db, { analysisId: "purchase", checkoutSessionId: "cs_test", paymentIntentId: "pi_test", amountPaid: product === "posing_analysis" ? 99 : 149, currency: "usd" });
  assert.equal(h.updates.length, 0);
  await markStageLabOrderAuthorized(h.db, { analysisId: "purchase", stripeEventId: "evt_test", authorizationExpiresAt: "2099-01-01T00:00:00Z", posingAccess: "available" });
  assert.equal(h.row.posing_status, status); assert.equal(h.row.posing_analysis_id, before.posing_analysis_id); assert.equal(h.row.expires_at, before.expires_at); assert.deepEqual(h.row.posing_result_json, before.posing_result_json);
});
test("replayed callback cannot reactivate a revoked posing purchase or change payment identity", async () => {
  const h = database("completed", "posing_analysis");
  await assert.rejects(activatePaidQuickAnalysis(h.db, { analysisId: "purchase", checkoutSessionId: "cs_test", paymentIntentId: "pi_different", amountPaid: 99, currency: "usd" }));
  h.row = { ...h.row, payment_status: "refunded" };
  await assert.rejects(activatePaidQuickAnalysis(h.db, { analysisId: "purchase", checkoutSessionId: "cs_test", paymentIntentId: "pi_test", amountPaid: 99, currency: "usd" })); assert.equal(h.updates.length, 0);
});
