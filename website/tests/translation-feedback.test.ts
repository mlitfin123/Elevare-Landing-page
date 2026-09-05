import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getShellMessages } from "../lib/i18n/shell-messages.ts";
import {
  isTranslationFeedbackAvailable,
  sanitizeTranslationFeedbackPath,
  TRANSLATION_FEEDBACK_LIMITS,
  validateTranslationFeedbackSubmission,
} from "../lib/translation-feedback.ts";

const projectRoot = process.cwd();
const validSubmission = {
  locale: "es-419",
  sanitizedPublicPath: "/es/logbook/?session_id=private#details",
  category: "incorrect",
  description: "La frase <script>alert('x')</script> necesita revisión.",
  suggestedCorrection: "Texto sugerido",
  optionalContactEmail: " PERSON@EXAMPLE.COM ",
  clientSubmissionId: "019535d8-706f-4a74-9de8-7d0e7f0c47d4",
  website: "",
} as const;

test("Spanish and Brazilian Portuguese feedback copy uses the approved labels", () => {
  const spanish = getShellMessages("es-419").translationFeedback;
  const portuguese = getShellMessages("pt-BR").translationFeedback;
  const english = getShellMessages("en").translationFeedback;

  assert.equal(spanish.link, "Informar un problema de traducción");
  assert.equal(portuguese.link, "Relatar um problema de tradução");
  assert.equal(english.link, "Report a translation issue");
  assert.deepEqual(Object.values(spanish.categories), [
    "Traducción incorrecta",
    "Traducción poco natural",
    "Texto sin traducir",
    "Texto cortado o difícil de leer",
    "Otro",
  ]);
  assert.deepEqual(Object.values(portuguese.categories), [
    "Tradução incorreta",
    "Tradução pouco natural",
    "Texto não traduzido",
    "Texto cortado ou difícil de ler",
    "Outro",
  ]);
  assert.equal(spanish.success, "Gracias. Revisaremos esta traducción.");
  assert.equal(portuguese.success, "Obrigado. Analisaremos esta tradução.");
});

test("feedback captures only allowlisted public paths and removes queries and fragments", () => {
  assert.equal(
    sanitizeTranslationFeedbackPath("https://www.elevarefit.com/es/logbook/?session_id=secret#private", "es-419"),
    "/es/logbook/",
  );
  assert.equal(
    sanitizeTranslationFeedbackPath("/pt-br/stagelab/quick-analysis/?checkout_id=secret", "pt-BR"),
    "/pt-br/stagelab/quick-analysis/",
  );
  assert.equal(
    sanitizeTranslationFeedbackPath("/es/stagelab/quick-analysis/result/?token=secret", "es-419"),
    null,
  );
  assert.equal(sanitizeTranslationFeedbackPath("/es/account/recovery/private-token/", "es-419"), null);
  assert.equal(sanitizeTranslationFeedbackPath("/es/logbook/user-id", "es-419"), null);
});

test("feedback availability requires enabled localized public routes and excludes English and private results", () => {
  assert.equal(isTranslationFeedbackAvailable({ locale: "es-419", pathname: "/es/", localizedRoutesEnabled: true }), true);
  assert.equal(isTranslationFeedbackAvailable({ locale: "pt-BR", pathname: "/pt-br/logbook/", localizedRoutesEnabled: true }), true);
  assert.equal(isTranslationFeedbackAvailable({ locale: "es-419", pathname: "/es/", localizedRoutesEnabled: false }), false);
  assert.equal(isTranslationFeedbackAvailable({ locale: "en", pathname: "/", localizedRoutesEnabled: true }), false);
  assert.equal(isTranslationFeedbackAvailable({
    locale: "pt-BR",
    pathname: "/pt-br/stagelab/quick-analysis/result/",
    localizedRoutesEnabled: true,
  }), false);
});

test("server validation normalizes email and treats markup as untrusted plain text", () => {
  const result = validateTranslationFeedbackSubmission(validSubmission);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.data.sanitizedPublicPath, "/es/logbook/");
  assert.equal(result.data.optionalContactEmail, "person@example.com");
  assert.equal(result.data.description, "La frase <script>alert('x')</script> necesita revisión.");
});

test("server validation rejects invalid locale, category, email, path, UUID, and excessive text", () => {
  const invalidCases = [
    { ...validSubmission, locale: "fr" },
    { ...validSubmission, category: "medical" },
    { ...validSubmission, optionalContactEmail: "not-an-email" },
    { ...validSubmission, sanitizedPublicPath: "/es/account/" },
    { ...validSubmission, clientSubmissionId: "not-a-uuid" },
    { ...validSubmission, description: "x".repeat(TRANSLATION_FEEDBACK_LIMITS.description + 1) },
    { ...validSubmission, suggestedCorrection: "x".repeat(TRANSLATION_FEEDBACK_LIMITS.suggestedCorrection + 1) },
  ];

  for (const input of invalidCases) assert.equal(validateTranslationFeedbackSubmission(input).ok, false);
});

test("the dialog prevents duplicate clicks, preserves retry text, and manages focus accessibly", () => {
  const source = fs.readFileSync(
    path.join(projectRoot, "components", "localization", "TranslationFeedback.tsx"),
    "utf8",
  );
  const styles = fs.readFileSync(path.join(projectRoot, "app", "globals.css"), "utf8");

  assert.match(source, /submissionInFlight\.current/);
  assert.match(source, /disabled=\{isSubmitting\}/);
  assert.match(source, /dialogRef\.current\?\.showModal\(\)/);
  assert.match(source, /onClose=\{\(\) => triggerRef\.current\?\.focus\(\)\}/);
  assert.match(source, /requestAnimationFrame\(\(\) => categoryRef\.current\?\.focus\(\)\)/);
  assert.match(source, /statusRef\.current\?\.focus\(\)/);
  assert.match(source, /role="alert"/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /catch \{[\s\S]{0,240}setDescription\(""\)/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*translation-feedback-actions/);
  assert.match(styles, /overflow-wrap: break-word/);
});

test("the endpoint uses same-origin validation, honeypot filtering, rate limiting, and idempotent inserts", () => {
  const route = fs.readFileSync(path.join(projectRoot, "app", "api", "translation-feedback", "route.ts"), "utf8");
  const server = fs.readFileSync(path.join(projectRoot, "lib", "quick-analysis-server.ts"), "utf8");
  const migration = fs.readFileSync(
    path.join(projectRoot, "..", "supabase", "migrations", "20260904100000_translation_feedback.sql"),
    "utf8",
  );

  assert.match(route, /assertQuickAnalysisSameOrigin\(request\)/);
  assert.match(route, /validation\.data\.website/);
  assert.match(route, /enforceQuickAnalysisRateLimit\(request, "translation_feedback"/);
  assert.match(route, /error\.code !== "23505"/);
  assert.match(server, /translation_feedback: \{ limit: 5/);
  assert.match(migration, /client_submission_id uuid not null unique/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /revoke all on table public\.translation_feedback from public, anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on table public\.translation_feedback to service_role/);
  assert.doesNotMatch(migration, /grant [^;]+ to anon|grant [^;]+ to authenticated/i);
});

test("feedback analytics contains only locale, safe route, and category metadata", () => {
  const source = fs.readFileSync(
    path.join(projectRoot, "components", "localization", "TranslationFeedback.tsx"),
    "utf8",
  );
  const events = [...source.matchAll(/trackEvent\("translation_feedback_[\s\S]*?\n\s*\}\);/g)]
    .map((match) => match[0])
    .join("\n");

  assert.match(events, /translation_feedback_opened/);
  assert.match(events, /translation_feedback_submitted/);
  assert.match(events, /translation_feedback_failed/);
  assert.match(events, /feedback_locale/);
  assert.match(events, /public_route/);
  assert.match(events, /feedback_category/);
  assert.doesNotMatch(events, /description|suggestedCorrection|optionalContactEmail|website|user|token|analysis/);
});
