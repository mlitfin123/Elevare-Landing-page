import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildConciergeNotification,
  conciergeNotificationEventKey,
  getConciergeAccountUrl,
} from "../../supabase/functions/_shared/concierge-notification-templates.ts";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260909500000_marketplace_concierge.sql", import.meta.url),
  "utf8",
);
const demandForm = readFileSync(
  new URL("../components/marketplace/MarketplaceDemandForm.tsx", import.meta.url),
  "utf8",
);
const directory = readFileSync(
  new URL("../components/marketplace/MarketplaceDirectory.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const clientPanel = readFileSync(
  new URL("../components/marketplace/ConciergeCasesPanel.tsx", import.meta.url),
  "utf8",
);
const professionalPanel = readFileSync(
  new URL("../components/marketplace/ProfessionalOpportunitiesPanel.tsx", import.meta.url),
  "utf8",
);
const localizedRoute = readFileSync(
  new URL("../app/[locale]/[[...slug]]/page.tsx", import.meta.url),
  "utf8",
);
const i18nCopy = readFileSync(
  new URL("../lib/i18n/marketplace-content.ts", import.meta.url),
  "utf8",
);
const operations = readFileSync(
  new URL("../docs/marketplace-concierge-operations.md", import.meta.url),
  "utf8",
);

test("concierge uses separate constrained case, recommendation, introduction, and follow-up states", () => {
  for (const table of [
    "marketplace_concierge_cases",
    "marketplace_concierge_recommendations",
    "marketplace_concierge_introductions",
    "marketplace_concierge_follow_ups",
    "marketplace_concierge_internal_notes",
    "marketplace_concierge_audit_log",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`, "i"));
  }
  assert.match(migration, /marketplace_concierge_case_transition_allowed/i);
  assert.match(migration, /marketplace_concierge_recommendation_transition_allowed/i);
  assert.match(migration, /Invalid concierge case transition/i);
  assert.match(migration, /Invalid recommendation transition/i);
});

test("match requests require an authenticated owner, explicit sharing consent, and an idempotency key", () => {
  assert.match(migration, /if auth\.uid\(\) is null then raise exception 'Authentication required\.'/i);
  assert.match(migration, /if not p_share_consent then raise exception 'Consent is required/i);
  assert.match(migration, /marketplace_search_demand_user_request_key_idx/i);
  assert.match(migration, /where user_id = current_user_id and request_key = btrim\(p_request_key\)/i);
  assert.match(demandForm, /crypto\.randomUUID\(\)/);
  assert.match(demandForm, /I agree that Elevare may share this request with selected professionals/i);
  assert.match(demandForm, /Do not include medical records, diagnoses, medication lists/i);
});

test("the concierge entry path is directly reachable and mobile checkboxes cannot force overflow", () => {
  assert.match(directory, /!hasMeaningfulSearch[\s\S]*?<MarketplaceDemandForm/);
  assert.match(demandForm, /id="concierge-request"/);
  assert.match(styles, /\.concierge-check input\s*\{[\s\S]*?width:\s*auto;/);
});

test("RLS and guarded RPCs isolate clients, professionals, and operators", () => {
  for (const table of [
    "marketplace_concierge_cases",
    "marketplace_concierge_recommendations",
    "marketplace_concierge_introductions",
    "marketplace_concierge_follow_ups",
    "marketplace_concierge_internal_notes",
    "marketplace_concierge_audit_log",
    "marketplace_concierge_notification_outbox",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from public, anon, authenticated`, "i"));
  }
  assert.match(migration, /owned\.client_user_id = public\.marketplace_current_user_id\(\)/i);
  assert.match(migration, /trainer\.user_id = public\.marketplace_current_user_id\(\)/i);
  assert.match(migration, /public\.marketplace_is_trust_reviewer\(\)/i);
  assert.doesNotMatch(clientPanel, /internal_notes/i);
  assert.doesNotMatch(professionalPanel, /internal_notes|other shortlisted/i);
});

test("only live reviewed professionals accepting clients can be selected", () => {
  assert.match(migration, /marketplace_public_trainer_profiles_v2 as profile/i);
  assert.match(migration, /profile\.accepting_clients = true/i);
  assert.match(migration, /client_acceptance_status[\s\S]*?in \('accepting', 'waitlist'\)/i);
  assert.match(migration, /trust\.profile_reviewed = true and trust\.account_in_good_standing = true/i);
  assert.match(migration, /Professional is not eligible for concierge selection\./i);
  assert.match(migration, /language_required[\s\S]*?preferred_languages/i);
  assert.match(migration, /order by relevance_score desc, tie_break/i);
});

test("professional invitations are owner-scoped, expiring, and idempotent", () => {
  assert.match(migration, /marketplace_get_my_concierge_invitations/i);
  assert.match(migration, /recommendation\.response_deadline_at < timezone\('utc', now\(\)\)/i);
  assert.match(migration, /This invitation has already changed\. Refresh and try again\./i);
  assert.match(migration, /Select a decline reason\./i);
  assert.match(migration, /Confirm that you are still accepting clients\./i);
  assert.match(migration, /unique \(case_id, trainer_profile_id, cycle_number\)/i);
  assert.match(professionalPanel, /I am interested and accepting clients/i);
  assert.match(professionalPanel, /Ask Elevare for clarification/i);
  assert.match(professionalPanel, /Expressing interest is not a booking or employment agreement/i);
});

test("shortlists stay small and contact details remain hidden until introduction", () => {
  assert.match(migration, /selected_count < 1 or selected_count > 3/i);
  assert.match(migration, /Only interested professionals may be released to the client\./i);
  assert.match(migration, /professional_contact_email', case when introduction\.introduced_at is not null/i);
  assert.match(migration, /client_contact_email', case when introduction\.introduced_at is not null/i);
  assert.match(migration, /Both parties must authorize this introduction\./i);
  assert.match(migration, /Unsupported contact field\./i);
  assert.match(clientPanel, /not an endorsement, guarantee, medical referral, or promise of results/i);
});

test("rematching preserves history and blocks accidental reinvitation of failed options", () => {
  assert.match(migration, /cycle_number integer not null default 1/i);
  assert.match(migration, /status in \('declined', 'no_response', 'expired', 'client_not_interested', 'unsuccessful'\)/i);
  assert.match(migration, /This professional was previously declined or unsuitable for this case\./i);
  assert.match(migration, /'rematch_requested'/i);
  assert.match(migration, /marketplace_update_my_concierge_request/i);
});

test("follow-ups are idempotent due work and irrelevant reminders are cancelled", () => {
  assert.match(migration, /dedupe_key text not null unique/i);
  assert.match(migration, /marketplace_concierge_cancel_irrelevant_follow_ups/i);
  assert.match(migration, /set status = 'cancelled'/i);
  assert.match(migration, /on conflict \(dedupe_key\) do nothing/i);
  assert.match(operations, /No sender or scheduled job is installed/i);
});

test("no-inventory and outcomes remain honest and self-reported", () => {
  assert.match(migration, /'no_inventory'/i);
  assert.match(migration, /consultation_scheduled_self_reported/i);
  assert.match(migration, /consultation_completed_self_reported/i);
  assert.match(migration, /hired_self_reported/i);
  assert.match(clientPanel, /We have not found an available professional who fits the request closely enough/i);
  assert.match(clientPanel, /consultation_scheduled_self_reported|hired_self_reported/i);
});

test("private concierge routes are localized and noindex", () => {
  assert.match(localizedRoute, /concierge-matches/);
  assert.match(localizedRoute, /concierge-opportunities/);
  assert.match(localizedRoute, /robots:\s*\{ index: false, follow: false \}/);
  for (const value of [
    "Your match requests and recommendations.",
    "Match Opportunities",
    "No suitable match available yet",
    "Request a rematch",
  ]) {
    assert.match(i18nCopy, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("analytics events are consent-aware and carry only privacy-safe structured properties", () => {
  for (const event of [
    "concierge_flow_started",
    "concierge_match_request_submitted",
    "concierge_match_request_confirmation_viewed",
    "concierge_shortlist_viewed",
    "concierge_professional_profile_opened",
    "concierge_professional_selected",
    "concierge_rematch_requested",
    "concierge_case_closed",
    "concierge_outcome_submitted",
  ]) {
    assert.match(`${demandForm}\n${clientPanel}`, new RegExp(`trackEvent\\(\\"${event}\\"`));
  }
  assert.doesNotMatch(`${demandForm}\n${clientPanel}`, /trackEvent\([^)]*(email|phone|case_code|recommendation_code|note)/i);
  assert.match(operations, /Do not send raw UUIDs, case codes, names, contact data, free text/i);
});

test("concierge notification templates are deterministic, localized, safe, and disabled by default", () => {
  assert.equal(
    conciergeNotificationEventKey("client_shortlist_ready", "case-1"),
    "concierge:client_shortlist_ready:case-1:initial",
  );
  assert.equal(getConciergeAccountUrl("en", "client"), "https://www.elevarefit.com/account/matches/");
  assert.equal(getConciergeAccountUrl("es-419", "professional"), "https://www.elevarefit.com/es/account/opportunities/");
  assert.equal(getConciergeAccountUrl("pt-BR", "client"), "https://www.elevarefit.com/pt-br/account/matches/");

  const spanish = buildConciergeNotification({
    eventType: "professional_invited",
    recipientRole: "professional",
    locale: "es-MX",
    caseCode: "EVR-A1B2C3D4E5F6",
  });
  const portuguese = buildConciergeNotification({
    eventType: "client_shortlist_ready",
    recipientRole: "client",
    locale: "pt-BR",
  });
  const fallback = buildConciergeNotification({
    eventType: "case_closed",
    recipientRole: "client",
    locale: "fr-FR",
  });

  assert.match(spanish.html, /lang="es-419"/);
  assert.match(spanish.subject, /Elevare/);
  assert.match(spanish.actionUrl, /\/es\/account\/opportunities\/$/);
  assert.match(portuguese.html, /lang="pt-BR"/);
  assert.match(portuguese.actionUrl, /\/pt-br\/account\/matches\/$/);
  assert.match(fallback.html, /lang="en"/);
  assert.doesNotMatch(spanish.html, /client_email|professional_email|internal note/i);
  assert.match(migration, /status text not null default 'disabled'/i);
  assert.match(migration, /idempotency_key text not null unique/i);
});
