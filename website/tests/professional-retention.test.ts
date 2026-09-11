import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildMonthlyProfessionalSummary,
  buildProfessionalShareUrl,
  calculateProfessionalResponseMetrics,
  getProfessionalInquiryActions,
  getProfessionalInquiryStatusAfterAction,
  getProfessionalProfileFreshness,
  PROFESSIONAL_PROFILE_FRESHNESS_DAYS,
  PROFESSIONAL_RESPONSE_LOOKBACK_DAYS,
  PROFESSIONAL_RESPONSE_MINIMUM_SAMPLE,
} from "../lib/professional-retention.ts";
import { marketplaceText } from "../lib/i18n/marketplace-content.ts";
import {
  buildProfessionalInquiryEmail,
  getProfessionalRequestsUrl,
  professionalInquiryEventKey,
} from "../../supabase/functions/professional-inquiry-email/email.ts";

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const migration = read("../../supabase/migrations/20260909300000_professional_retention_dashboard.sql");
const availabilityMigration = read("../../supabase/migrations/20260909200000_decision_ready_professional_profiles.sql");
const dashboard = read("../components/marketplace/ProfessionalRetentionDashboard.tsx");
const inquiries = read("../components/marketplace/ProfessionalInquiriesPanel.tsx");
const inquiryForm = read("../components/marketplace/InquiryForm.tsx");
const inquiryFunction = read("../../supabase/functions/professional-inquiry-email/index.ts");
const styles = read("../app/globals.css");

test("consultation requests follow the explicit professional state machine", () => {
  assert.deepEqual(getProfessionalInquiryActions("new"), ["open", "accept", "decline"]);
  assert.equal(getProfessionalInquiryStatusAfterAction("new", "open"), "viewed");
  assert.equal(getProfessionalInquiryStatusAfterAction("viewed", "accept"), "accepted");
  assert.equal(getProfessionalInquiryStatusAfterAction("accepted", "mark_contacted"), "contacted");
  assert.equal(getProfessionalInquiryStatusAfterAction("contacted", "close"), "closed");
  assert.equal(getProfessionalInquiryStatusAfterAction("declined", "accept"), null);
  assert.equal(getProfessionalInquiryStatusAfterAction("closed", "close"), null);

  assert.match(migration, /p_expected_status text/);
  assert.match(migration, /for update of inquiry/);
  assert.match(migration, /inquiry_row\.status is distinct from p_expected_status/);
  assert.match(migration, /revoke update on public\.trainer_profile_inquiries from authenticated/);
  assert.match(migration, /profile\.user_id = current_user_id/);
  assert.doesNotMatch(inquiries, /\.from\("trainer_profile_inquiries"\)[\s\S]{0,300}\.update\(/);
});

test("response metrics use a 90-day lookback and require three requests", () => {
  assert.equal(PROFESSIONAL_RESPONSE_LOOKBACK_DAYS, 90);
  assert.equal(PROFESSIONAL_RESPONSE_MINIMUM_SAMPLE, 3);
  const now = new Date("2026-09-09T12:00:00.000Z");
  const insufficient = calculateProfessionalResponseMetrics([
    { createdAt: "2026-09-08T10:00:00.000Z", firstRespondedAt: "2026-09-08T11:00:00.000Z" },
    { createdAt: "2026-09-07T10:00:00.000Z", firstRespondedAt: null },
  ], now);
  assert.deepEqual(insufficient, {
    sampleSize: 2,
    respondedCount: 1,
    hasEnoughHistory: false,
    responseRatePercent: null,
    medianFirstResponseMinutes: null,
  });

  const enough = calculateProfessionalResponseMetrics([
    { createdAt: "2026-09-08T10:00:00.000Z", firstRespondedAt: "2026-09-08T10:30:00.000Z" },
    { createdAt: "2026-09-07T10:00:00.000Z", firstRespondedAt: "2026-09-07T11:30:00.000Z" },
    { createdAt: "2026-09-06T10:00:00.000Z", firstRespondedAt: null },
    { createdAt: "2026-01-01T10:00:00.000Z", firstRespondedAt: "2026-01-01T10:01:00.000Z" },
  ], now);
  assert.equal(enough.sampleSize, 3);
  assert.equal(enough.respondedCount, 2);
  assert.equal(enough.responseRatePercent, 67);
  assert.equal(enough.medianFirstResponseMinutes, 60);
  assert.match(migration, /interval '90 days'/);
  assert.match(migration, /response_sample_size >= 3/);
});

test("historical inquiry timestamps backfill only rows that need them", () => {
  assert.match(
    migration,
    /first_responded_at = case\s+when status in \('accepted', 'declined', 'contacted', 'closed'\)/,
  );
  assert.match(
    migration,
    /where\s+\(status <> 'new' and first_opened_at is null\)[\s\S]*first_responded_at is null[\s\S]*contacted_at is null[\s\S]*closed_at is null/,
  );
});

test("profile freshness requires a current explicit confirmation", () => {
  assert.equal(PROFESSIONAL_PROFILE_FRESHNESS_DAYS, 90);
  const now = new Date("2026-09-09T12:00:00.000Z");
  assert.equal(getProfessionalProfileFreshness(null, "2026-09-08T12:00:00.000Z", now).isCurrent, false);
  assert.equal(getProfessionalProfileFreshness("2026-09-08T12:00:00.000Z", "2026-09-08T12:00:00.000Z", now).isCurrent, true);
  assert.equal(getProfessionalProfileFreshness("2026-09-01T12:00:00.000Z", "2026-09-02T12:00:00.000Z", now).isCurrent, false);
  assert.equal(getProfessionalProfileFreshness("2026-05-01T12:00:00.000Z", "2026-05-01T12:00:00.000Z", now).isCurrent, false);
  assert.match(migration, /profile_information_confirmed_at/);
  assert.match(dashboard, /This is not credential verification/);
});

test("professional share links use stable localized public slugs", () => {
  assert.equal(buildProfessionalShareUrl("https://www.elevarefit.com/", "alex-rivera", "en"), "https://www.elevarefit.com/professionals/alex-rivera/");
  assert.equal(buildProfessionalShareUrl("https://www.elevarefit.com", "alex-rivera", "es-419"), "https://www.elevarefit.com/es/professionals/alex-rivera/");
  assert.equal(buildProfessionalShareUrl("https://www.elevarefit.com", "alex-rivera", "pt-BR"), "https://www.elevarefit.com/pt-br/professionals/alex-rivera/");
  assert.match(dashboard, /navigator\.share/);
  assert.match(dashboard, /navigator\.clipboard\.writeText/);
  assert.match(dashboard, /professional_profile_share_selected/);
  assert.doesNotMatch(dashboard, /professionalProfile\.id[^\n]*Share|share[^\n]*professionalProfile\.id/i);
});

test("retention summary exposes aggregates only through an owner-authorized RPC", () => {
  assert.match(migration, /marketplace_get_professional_retention_summary/);
  assert.match(migration, /where user_id = current_user_id/);
  assert.match(migration, /select count\(\*\) from public\.saved_trainer_profiles/);
  assert.match(migration, /'current_saves'/);
  assert.match(migration, /revoke all on function public\.marketplace_get_professional_retention_summary\(integer\)[\s\S]*from public, anon/);
  assert.match(migration, /grant execute on function public\.marketplace_get_professional_retention_summary\(integer\)[\s\S]*to authenticated/);
  assert.doesNotMatch(dashboard, /client_user_id|client_first_name|saved_trainer_profiles/);
  assert.match(dashboard, /Saver identities remain private/);
});

test("not-accepting professionals cannot receive new requests but retain existing requests", () => {
  assert.match(availabilityMigration, /client_acceptance_status[^\n]*in \('accepting', 'waitlist'\)/);
  assert.match(availabilityMigration, /create policy trainer_profile_inquiries_insert_own/);
  assert.match(migration, /p_status not in \('accepting', 'waitlist', 'not_accepting'\)/);
  assert.match(migration, /client_acceptance_status = p_status/);
  assert.doesNotMatch(migration, /delete from public\.trainer_profile_inquiries/);
  assert.match(dashboard, /new consultation requests are disabled/);
});

test("new consultation email is localized, private, and idempotent", () => {
  const inquiryId = "2dea6ab2-d6ad-4d19-8351-1e8fe2c47fa9";
  assert.equal(professionalInquiryEventKey(inquiryId), `new_consultation_request:${inquiryId}`);
  assert.equal(getProfessionalRequestsUrl("en"), "https://www.elevarefit.com/account/client-requests/");
  assert.equal(getProfessionalRequestsUrl("es-419"), "https://www.elevarefit.com/es/account/client-requests/");
  assert.equal(getProfessionalRequestsUrl("pt-BR"), "https://www.elevarefit.com/pt-br/account/client-requests/");

  const english = buildProfessionalInquiryEmail({ firstName: "Avery", locale: "en" });
  const spanish = buildProfessionalInquiryEmail({ firstName: "Avery", locale: "es-MX" });
  const portuguese = buildProfessionalInquiryEmail({ firstName: "Avery", locale: "pt-BR" });
  assert.match(english.subject, /new consultation request/i);
  assert.match(spanish.subject, /solicitud de consulta/i);
  assert.match(portuguese.subject, /solicitação de consulta/i);
  for (const email of [english, spanish, portuguese]) {
    assert.doesNotMatch(`${email.html}\n${email.text}`, /client_first_name|client email|goal:|message:|health/i);
  }

  assert.match(migration, /'new_consultation_request:' \|\| new\.id::text/);
  assert.match(migration, /on conflict \(event_key\) do nothing/);
  assert.match(inquiryFunction, /"Idempotency-Key": professionalInquiryEventKey\(inquiryId\)/);
  assert.match(inquiryFunction, /\.eq\("client_user_id"|inquiry\.client_user_id !== caller\.id/);
  assert.doesNotMatch(inquiryFunction, /select\("[^\"]*(goal|message|client_first_name|client_email)/);
  assert.match(inquiryForm, /professional-inquiry-email/);
});

test("monthly summary layer uses real aggregates without client identities or fabricated deltas", () => {
  const input = {
    views: 0,
    currentSaves: 2,
    consultationRequests: 1,
    responseRatePercent: null,
    profileCompletenessPercent: 80,
  };
  for (const locale of ["en", "es-419", "pt-BR"] as const) {
    const summary = buildMonthlyProfessionalSummary(input, locale);
    const output = `${summary.subject}\n${summary.heading}\n${summary.lines.join("\n")}\n${summary.cta}`;
    assert.doesNotMatch(output, /client|email|phone|uuid|% change|increase|decrease/i);
    assert.match(output, /0|2|1|80/);
  }
});

test("new professional dashboard analytics contain only approved non-sensitive properties", () => {
  for (const event of [
    "professional_dashboard_viewed",
    "professional_availability_changed",
    "professional_profile_improvement_selected",
    "professional_profile_confirmation_completed",
    "professional_profile_share_selected",
  ]) assert.match(dashboard, new RegExp(event));
  for (const event of [
    "consultation_request_opened",
    "consultation_request_accepted",
    "consultation_request_declined",
  ]) assert.match(inquiries, new RegExp(event));
  assert.doesNotMatch(`${dashboard}\n${inquiries}`, /trackEvent\([^\n]+(client_first_name|message|goal|email|professionalProfile\.id|inquiry\.id)/);
});

test("dashboard and request controls remain accessible and mobile-safe", () => {
  assert.match(dashboard, /aria-labelledby="professional-dashboard-heading"/);
  assert.match(dashboard, /aria-pressed=\{rangeDays === 30\}/);
  assert.match(dashboard, /aria-live="polite"/);
  assert.match(inquiries, /aria-expanded="false"/);
  assert.match(inquiries, /aria-label=\{t\("Request actions"\)\}/);
  assert.match(styles, /\.retention-range button[\s\S]*min-height: 44px/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*\.retention-priority-grid,[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /\.professional-request-context li[\s\S]*overflow-wrap: anywhere/);
});

test("Spanish and Portuguese dashboard and request copy never falls back to English", () => {
  const strings = [
    "Professional dashboard",
    "Profile performance and next steps",
    "Awaiting your response",
    "Legitimate profile views",
    "Current saves",
    "Response reliability",
    "Profile completeness",
    "Profile freshness",
    "Share my profile",
    "Client Requests",
    "Review client requests",
    "Accept request",
    "Decline request",
    "Mark as contacted",
    "Close request",
    "No consultation requests have come in yet.",
  ];
  for (const locale of ["es-419", "pt-BR"] as const) {
    for (const value of strings) assert.notEqual(marketplaceText(locale, value), value, `${locale}: ${value}`);
  }
});
