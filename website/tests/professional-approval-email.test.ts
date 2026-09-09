import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildProfessionalApprovalEmail,
  canClaimApprovalEmail,
  formatProfessionalApprovalSender,
  getProfessionalApprovalTemplateId,
  getProfessionalProfileUrl,
  isNewApprovalTransition,
  isServiceRoleRequest,
  normalizeApprovalEmailLocale,
  PROFESSIONAL_APPROVAL_SUBJECT,
  PROFESSIONAL_PROFILE_URL,
  professionalApprovalEventKey,
  resolveProfessionalApprovalEmailLocale,
  safeDeliveryError,
} from "../../supabase/functions/professional-approval-email/email.ts";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260908120000_professional_approval_email.sql", import.meta.url),
  "utf8",
);
const functionSource = readFileSync(
  new URL("../../supabase/functions/professional-approval-email/index.ts", import.meta.url),
  "utf8",
);
const localeMigration = readFileSync(
  new URL("../../supabase/migrations/20260908150000_users_preferred_locale.sql", import.meta.url),
  "utf8",
);
const localeFallbackMigration = readFileSync(
  new URL("../../supabase/migrations/20260908170000_professional_email_locale_fallback.sql", import.meta.url),
  "utf8",
);
const authPanelSource = readFileSync(
  new URL("../components/marketplace/AuthPanel.tsx", import.meta.url),
  "utf8",
);
const professionalEditorSource = readFileSync(
  new URL("../components/marketplace/ProfessionalProfileEditor.tsx", import.meta.url),
  "utf8",
);

function jwtWithRole(role: string) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role })}.signature`;
}

test("pending to approved creates the real approval transition", () => {
  assert.equal(
    isNewApprovalTransition(
      { verificationStatus: "pending", profileLive: false },
      { verificationStatus: "verified", profileLive: true },
    ),
    true,
  );
});

test("approved to approved is not a new transition", () => {
  assert.equal(
    isNewApprovalTransition(
      { verificationStatus: "verified", profileLive: true },
      { verificationStatus: "verified", profileLive: true },
    ),
    false,
  );
});

test("repeated requests use one stable unique email event", () => {
  const id = "2dea6ab2-d6ad-4d19-8351-1e8fe2c47fa9";
  assert.equal(professionalApprovalEventKey(id), professionalApprovalEventKey(id));
  assert.match(migration, /event_key text not null unique/i);
  assert.match(migration, /on conflict \(event_key\) do nothing/i);
});

test("concurrent attempts cannot claim an actively leased event", () => {
  assert.equal(
    canClaimApprovalEmail(
      {
        status: "processing",
        attemptCount: 1,
        maxAttempts: 3,
        lockedUntil: "2026-09-08T12:05:00.000Z",
      },
      { allowFailedRetry: true, now: new Date("2026-09-08T12:00:00.000Z") },
    ),
    false,
  );
  assert.match(migration, /for update/i);
  assert.match(migration, /locked_until = current_time \+ interval '5 minutes'/i);
});

test("approval commits before email delivery and is not rolled back on a provider failure", () => {
  const approvalCall = functionSource.indexOf("marketplace_approve_professional_and_enqueue");
  const deliveryCall = functionSource.indexOf("deliverApprovalEmail");
  assert.ok(approvalCall >= 0 && deliveryCall > approvalCall);
  assert.match(functionSource, /email_status: "failed"/);
  assert.match(functionSource, /return json\(\{ ok: true, approved: true/);
});

test("a failed delivery is retryable within the bounded attempt limit", () => {
  assert.equal(
    canClaimApprovalEmail(
      { status: "failed", attemptCount: 1, maxAttempts: 3 },
      { allowFailedRetry: true },
    ),
    true,
  );
  assert.equal(
    canClaimApprovalEmail(
      { status: "failed", attemptCount: 3, maxAttempts: 3 },
      { allowFailedRetry: true },
    ),
    false,
  );
  assert.match(migration, /max_attempts integer not null default 3/i);
});

test("a successful retry records the provider ID and approval_email_sent_at", () => {
  assert.match(migration, /provider_message_id = btrim\(p_provider_message_id\)/i);
  assert.match(migration, /approval_email_sent_at = coalesce\(approval_email_sent_at, current_time\)/i);
});

test("a sent event cannot be claimed or duplicated", () => {
  assert.equal(
    canClaimApprovalEmail(
      { status: "sent", sentAt: "2026-09-08T12:00:00.000Z", attemptCount: 1, maxAttempts: 3 },
      { allowFailedRetry: true },
    ),
    false,
  );
  assert.match(functionSource, /"Idempotency-Key": professionalApprovalEventKey\(professionalId\)/);
});

test("only a gateway-verified service role may invoke approval delivery", () => {
  assert.equal(isServiceRoleRequest(`Bearer ${jwtWithRole("service_role")}`), true);
  assert.equal(isServiceRoleRequest(`Bearer ${jwtWithRole("authenticated")}`), false);
  assert.equal(isServiceRoleRequest(null), false);
  assert.match(functionSource, /if \(!isServiceRoleRequest\(authorization\)\)/);
});

test("the authoritative database user supplies the recipient instead of request input", () => {
  assert.match(functionSource, /\.from\("users"\)/);
  assert.match(functionSource, /\.select\("email, first_name, preferred_locale, auth_id"\)/);
  assert.doesNotMatch(functionSource, /payload\.email|payload\.first_name|payload\.name/);
});

test("the approval CTA uses the existing production professional profile route", () => {
  assert.equal(PROFESSIONAL_PROFILE_URL, "https://www.elevarefit.com/account/professional-profile/");
  const email = buildProfessionalApprovalEmail({ firstName: "Avery" });
  assert.match(email.html, /Review my professional profile/);
  assert.match(email.text, new RegExp(PROFESSIONAL_PROFILE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("approval email CTAs follow every recipient locale with an English fallback", () => {
  assert.equal(getProfessionalProfileUrl("en"), "https://www.elevarefit.com/account/professional-profile/");
  assert.equal(getProfessionalProfileUrl("es-419"), "https://www.elevarefit.com/es/account/professional-profile/");
  assert.equal(getProfessionalProfileUrl("pt-BR"), "https://www.elevarefit.com/pt-br/account/professional-profile/");
  assert.equal(normalizeApprovalEmailLocale("es"), "es-419");
  assert.equal(normalizeApprovalEmailLocale("es-MX"), "es-419");
  assert.equal(normalizeApprovalEmailLocale("PT_br"), "pt-BR");
  assert.equal(normalizeApprovalEmailLocale("fr-FR"), "en");

  const english = buildProfessionalApprovalEmail({ firstName: "Avery", locale: "en-US" });
  const spanish = buildProfessionalApprovalEmail({ firstName: "Avery", locale: "es-419" });
  const portuguese = buildProfessionalApprovalEmail({ firstName: "Avery", locale: "pt-BR" });
  const fallback = buildProfessionalApprovalEmail({ firstName: "Avery", locale: "fr-FR" });
  assert.equal(english.subject, "You’re approved — welcome to Elevare");
  assert.match(english.html, /Welcome to Elevare\./);
  assert.match(english.text, /https:\/\/www\.elevarefit\.com\/account\/professional-profile\//);
  assert.equal(spanish.subject, "Tu perfil fue aprobado — te damos la bienvenida a Elevare");
  assert.match(spanish.html, /lang="es-419"/);
  assert.match(spanish.html, /Revisar mi perfil profesional/);
  assert.match(spanish.text, /\/es\/account\/professional-profile\//);
  assert.equal(portuguese.subject, "Você foi aprovado — boas-vindas à Elevare");
  assert.match(portuguese.html, /lang="pt-BR"/);
  assert.match(portuguese.html, /Revisar meu perfil profissional/);
  assert.match(portuguese.text, /\/pt-br\/account\/professional-profile\//);
  assert.match(fallback.html, /lang="en"/);
  assert.match(fallback.html, /Review my professional profile/);
});

test("approval delivery selects the published Resend template for each locale", () => {
  assert.equal(getProfessionalApprovalTemplateId("en"), "2b5f2a1c-ed8d-4e95-bcc3-0e430848760d");
  assert.equal(getProfessionalApprovalTemplateId("es-MX"), "bdaada5c-0583-4cbd-9ecb-77d0fdb815a6");
  assert.equal(getProfessionalApprovalTemplateId("pt-BR"), "d5165eb9-3537-40b6-9ecc-8e75d970c455");
  assert.equal(getProfessionalApprovalTemplateId("fr-FR"), "2b5f2a1c-ed8d-4e95-bcc3-0e430848760d");
  assert.match(functionSource, /template:\s*\{[\s\S]*?id: getProfessionalApprovalTemplateId\(locale\)/);
  assert.doesNotMatch(functionSource, /html:\s*email\.html|text:\s*email\.text/);
});

test("locale resolution follows preference, professional signup, account signup, browser, then English", () => {
  assert.equal(resolveProfessionalApprovalEmailLocale({
    preferredLocale: "pt-BR",
    professionalSignupLocale: "es-MX",
    signupLocale: "en",
  }), "pt-BR");
  assert.equal(resolveProfessionalApprovalEmailLocale({
    professionalSignupLocale: "es-CO",
    signupLocale: "pt-BR",
  }), "es-419");
  assert.equal(resolveProfessionalApprovalEmailLocale({ signupLocale: "pt-BR" }), "pt-BR");
  assert.equal(resolveProfessionalApprovalEmailLocale({ browserLocaleAtSignup: "es-US" }), "es-419");
  assert.equal(resolveProfessionalApprovalEmailLocale({ preferredLocale: "fr-FR" }), "en");
  assert.equal(resolveProfessionalApprovalEmailLocale({}), "en");
});

test("localized emails do not leak English template fragments", () => {
  const prohibitedEnglish = /Welcome to Elevare|Your professional profile|Review my professional profile|Need help|This service email|Privacy Policy|Terms of Service/;
  for (const locale of ["es-419", "pt-BR"] as const) {
    const email = buildProfessionalApprovalEmail({ firstName: "Avery", locale });
    assert.doesNotMatch(`${email.subject}\n${email.previewText}\n${email.html}\n${email.text}`, prohibitedEnglish);
  }
});

test("signup and professional submission persist normalized locale fallbacks", () => {
  assert.match(authPanelSource, /signup_locale: signupLocale/);
  assert.match(authPanelSource, /browser_locale_at_signup: signupBrowserLocale/);
  assert.match(authPanelSource, /resolvePreferredLocale/);
  assert.match(professionalEditorSource, /professional_signup_locale: locale/);
  assert.match(functionSource, /resolveProfessionalApprovalEmailLocale/);
  assert.match(functionSource, /professional_signup_locale/);
  assert.match(functionSource, /browser_locale_at_signup/);
});

test("preferred locale uses one constrained user field rather than duplicate professional records", () => {
  assert.match(localeMigration, /add column if not exists preferred_locale text not null default 'en'/i);
  assert.match(localeMigration, /preferred_locale in \('en', 'es-419', 'pt-BR'\)/i);
  assert.match(localeMigration, /set_my_preferred_locale/i);
  assert.match(localeFallbackMigration, /alter column preferred_locale drop default/i);
  assert.match(localeFallbackMigration, /alter column preferred_locale drop not null/i);
  assert.doesNotMatch(localeMigration, /insert into public\.trainer_profiles/i);
  assert.doesNotMatch(localeFallbackMigration, /insert into public\.trainer_profiles/i);
});

test("the email is a concise branded transactional approval notice", () => {
  const email = buildProfessionalApprovalEmail({ firstName: "Avery" });
  assert.equal(email.subject, PROFESSIONAL_APPROVAL_SUBJECT);
  assert.match(email.html, /ELEVARE/);
  assert.match(email.html, /can now appear in Elevare search/i);
  assert.match(email.html, /public details, services, and availability are complete/i);
  assert.match(email.html, /aria-label="Elevare Professionals"/);
  assert.match(email.html, /This service email was sent because you submitted a professional profile/i);
  assert.doesNotMatch(email.html, /unsubscribe|newsletter/i);
});

test("sender name and reply-to remain deterministic and configured", () => {
  assert.equal(
    formatProfessionalApprovalSender("Elevare <noreply@elevarefit.org>"),
    "Elevare Professionals <noreply@elevarefit.org>",
  );
  assert.match(functionSource, /from: RESEND_TRANSACTIONAL_FROM/);
  assert.match(functionSource, /reply_to: RESEND_TRANSACTIONAL_REPLY_TO/);
  assert.match(functionSource, /supportEmail: RESEND_TRANSACTIONAL_REPLY_TO/);
});

test("template escaping and delivery errors do not expose unsafe provider or user content", () => {
  const email = buildProfessionalApprovalEmail({ firstName: "<script>alert(1)</script>" });
  assert.doesNotMatch(email.html, /<script>/);
  assert.deepEqual(safeDeliveryError(422), {
    code: "resend_http_422",
    message: "Resend request failed with status 422.",
  });
});

test("existing visibility behavior remains verified plus profile_live", () => {
  assert.match(migration, /verification_status = 'verified'::public\.verification_status/i);
  assert.match(migration, /profile_live = true/i);
  assert.doesNotMatch(migration, /update public\.trainer_profiles[\s\S]*where[\s\S]*verification_status.*verified[\s\S]*insert into public\.professional_email_outbox/i);
});
