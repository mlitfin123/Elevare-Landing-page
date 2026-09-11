import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildProfessionalTrustNotice,
  normalizeTrustNoticeLocale,
  type ProfessionalTrustNoticeEvent,
} from "../lib/professional-trust.ts";
import {
  TRUST_EVIDENCE_MAX_BYTES,
  validateTrustEvidenceFile,
} from "../lib/trust-evidence.ts";

const projectRoot = process.cwd();
const repositoryRoot = path.resolve(projectRoot, "..");
const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
const readRepositoryFile = (relativePath: string) => fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
const migration = readRepositoryFile("supabase/migrations/20260909400000_professional_trust_safety.sql");

const noticeEvents: ProfessionalTrustNoticeEvent[] = [
  "credential_submission_received",
  "credential_more_information_requested",
  "credential_verified",
  "credential_not_verified",
  "credential_nearing_expiration",
  "credential_expired",
  "insurance_nearing_expiration",
  "background_check_action_required",
  "profile_temporarily_restricted",
  "report_receipt_confirmation",
];

function makeEvidenceFile(bytes: number[], type: string, name = "evidence.bin") {
  return new File([new Uint8Array(bytes)], name, { type });
}

test("trust evidence validation accepts supported file signatures", async () => {
  const fixtures = [
    makeEvidenceFile([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31], "application/pdf", "evidence.pdf"),
    makeEvidenceFile([0xff, 0xd8, 0xff, 0xe0], "image/jpeg", "evidence.jpg"),
    makeEvidenceFile([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png", "evidence.png"),
    makeEvidenceFile([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], "image/webp", "evidence.webp"),
  ];

  for (const fixture of fixtures) {
    assert.equal((await validateTrustEvidenceFile(fixture)).valid, true);
  }
});

test("trust evidence validation rejects spoofed, unsupported, empty, and oversized files", async () => {
  assert.equal((await validateTrustEvidenceFile(makeEvidenceFile([1, 2, 3], "application/pdf", "fake.pdf"))).valid, false);
  assert.equal((await validateTrustEvidenceFile(makeEvidenceFile([1, 2, 3], "text/plain", "evidence.txt"))).valid, false);
  assert.equal((await validateTrustEvidenceFile(new File([], "empty.pdf", { type: "application/pdf" }))).valid, false);
  assert.equal((await validateTrustEvidenceFile(
    new File([new Uint8Array(TRUST_EVIDENCE_MAX_BYTES + 1)], "large.pdf", { type: "application/pdf" }),
  )).valid, false);
});

test("trust notices are deterministic, localized, and link to authenticated or safety routes", () => {
  assert.equal(normalizeTrustNoticeLocale("es-MX"), "es-419");
  assert.equal(normalizeTrustNoticeLocale("pt-BR"), "pt-BR");
  assert.equal(normalizeTrustNoticeLocale("fr-FR"), "en");

  for (const event of noticeEvents) {
    const english = buildProfessionalTrustNotice(event, "en");
    const spanish = buildProfessionalTrustNotice(event, "es-AR");
    const portuguese = buildProfessionalTrustNotice(event, "pt-BR");

    assert.equal(english.locale, "en");
    assert.equal(spanish.locale, "es-419");
    assert.equal(portuguese.locale, "pt-BR");
    assert.ok(english.subject && english.previewText && english.heading && english.body && english.ctaLabel);
    assert.ok(spanish.subject && spanish.previewText && spanish.heading && spanish.body && spanish.ctaLabel);
    assert.ok(portuguese.subject && portuguese.previewText && portuguese.heading && portuguese.body && portuguese.ctaLabel);
    assert.notEqual(spanish.body, english.body);
    assert.notEqual(portuguese.body, english.body);
    assert.match(spanish.ctaPath, /^\/es\//);
    assert.match(portuguese.ctaPath, /^\/pt-br\//);
    assert.doesNotMatch(`${english.body} ${spanish.body} ${portuguese.body}`, /credential number|document url|report allegation/i);
  }

  assert.deepEqual(
    buildProfessionalTrustNotice("credential_verified", undefined),
    buildProfessionalTrustNotice("credential_verified", "unsupported"),
  );
  assert.match(buildProfessionalTrustNotice("credential_verified", "es-419").body, /verificó/);
  assert.match(buildProfessionalTrustNotice("credential_verified", "pt-BR").body, /verificações/);
});

test("trust records are independently modeled and reviewer-only fields cannot be self-approved", () => {
  assert.match(migration, /create table if not exists public\.professional_identity_checks/);
  assert.match(migration, /create table if not exists public\.professional_background_checks/);
  assert.match(migration, /create table if not exists public\.professional_insurance_submissions/);
  assert.match(migration, /create table if not exists public\.professional_trust_audit_log/);
  assert.match(migration, /new\.verification_status := 'pending'::public\.verification_status/);
  assert.match(migration, /Credential verification fields can only be updated by Elevare review systems/);
  assert.match(migration, /Insurance review fields can only be updated by Elevare review systems/);
  assert.match(migration, /material_revision := old\.material_revision \+ 1/);
});

test("trust RLS and storage policies are least privilege by construction", () => {
  assert.match(migration, /alter table public\.professional_identity_checks enable row level security/);
  assert.match(migration, /alter table public\.professional_background_checks enable row level security/);
  assert.match(migration, /alter table public\.professional_insurance_submissions enable row level security/);
  assert.match(migration, /alter table public\.professional_trust_audit_log enable row level security/);
  assert.match(migration, /revoke all on table public\.professional_trust_audit_log from public, anon, authenticated/);
  assert.match(migration, /grant insert, select on public\.professional_trust_audit_log to service_role/);
  assert.doesNotMatch(migration, /grant (?:delete|update)[^;]*professional_trust_audit_log/i);
  assert.match(migration, /'professional-trust-evidence',[\s\S]*false,[\s\S]*8388608/);
  assert.match(migration, /\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  assert.match(migration, /allowed_mime_types = array\['application\/pdf', 'image\/png', 'image\/jpeg', 'image\/webp'\]/);
  assert.match(migration, /professional_trust_evidence_preserve_referenced/);
  assert.match(migration, /credential_documents_preserve_referenced/);
});

test("public trust projection is fail-closed and excludes private review evidence", () => {
  const publicView = migration.slice(
    migration.indexOf("create or replace view public.marketplace_public_professional_trust_v1"),
    migration.indexOf("create or replace function public.marketplace_get_current_professional_trust_summary"),
  );
  const generator = readProjectFile("lib/marketplace-public-mapper.ts");

  assert.match(publicView, /from public\.marketplace_public_trainer_profiles_v2/);
  assert.match(publicView, /identity_check\.status = 'verified'/);
  assert.match(publicView, /background_check\.status = 'passed'/);
  assert.match(publicView, /insurance\.review_status = 'verified'/);
  assert.match(publicView, /coverage_expiration_date >= current_date/);
  assert.match(publicView, /credential\.revoked_at is null/);
  assert.match(publicView, /grant select on public\.marketplace_public_professional_trust_v1 to service_role/);
  assert.doesNotMatch(publicView, /evidence_storage_path|credential_number|provider_report_reference|review_feedback_public/);
  assert.match(readProjectFile("lib/marketplace.ts"), /marketplace_public_professionals_v3/);
  assert.match(generator, /identityVerified: trust\?\.identity_verified \?\? false/);
  assert.doesNotMatch(generator, /identityVerificationStatus:/);
  assert.doesNotMatch(generator, /identityVerificationStatus:\s*"verified"/);
});

test("expired and unreviewed credentials cannot render as currently verified", () => {
  const helpers = readProjectFile("lib/marketplace-helpers.ts");
  assert.match(helpers, /case "verified":[\s\S]*Credential verified/);
  assert.match(helpers, /case "expired":[\s\S]*Credential expired/);
  assert.match(helpers, /case "pending":[\s\S]*case "rejected":[\s\S]*Claimed credential/);
  assert.match(migration, /coalesce\(credential\.expiration_date, credential\.expiry_date\) >= current_date/);
});

test("reports are structured, throttled, non-public, and do not trigger automatic punishment", () => {
  assert.match(migration, /misleading_profile[\s\S]*false_or_expired_credential[\s\S]*impersonation/);
  assert.match(migration, /unsafe_conduct[\s\S]*harassment_or_discrimination[\s\S]*outside_scope/);
  assert.match(migration, /fraud_or_payment_solicitation[\s\S]*other_policy_violation/);
  assert.match(migration, />= 5 then raise exception 'Report limit reached/);
  assert.match(migration, /from public\.marketplace_public_trainer_profiles_v2 as public_profile/);
  assert.match(migration, /You cannot report your own profile/);
  assert.doesNotMatch(migration, /update public\.trainer_profiles[\s\S]{0,400}submit_professional_profile_report/i);

  const reportForm = readProjectFile("components/marketplace/ReportProfileForm.tsx");
  assert.match(reportForm, /report_flow_opened/);
  assert.match(reportForm, /report_submitted/);
  assert.match(reportForm, /reason_category/);
  assert.doesNotMatch(reportForm, /trackEvent\([^)]*(?:details|professionalId)[\s\S]*?\)/);
});

test("background checks stay disabled until a real provider workflow is configured", () => {
  assert.match(migration, /values \('checkr', false, 'not_configured'\)/);
  assert.match(migration, /background_check\.status = 'passed'/);
  assert.match(migration, /provider_report_reference/);
  assert.match(migration, /screening_product/);
});

test("notification queue is idempotent and delivery remains disabled", () => {
  assert.match(migration, /idempotency_key text not null unique/);
  assert.match(migration, /on conflict \(idempotency_key\) do nothing/);
  assert.match(migration, /No sender or scheduler is enabled by this migration/);
  assert.match(migration, /p_enqueue boolean default false/);
  assert.match(migration, /if auth\.role\(\) is distinct from 'service_role'/);
});

test("Trust and Safety is localized, accessible, linked, and included in sitemaps", () => {
  const localizedRouter = readProjectFile("app/[locale]/[[...slug]]/page.tsx");
  const trustPage = readProjectFile("components/marketplace/TrustSafetyPageContent.tsx");
  const publicSummary = readProjectFile("components/marketplace/PublicProfessionalTrustSummary.tsx");
  const directory = readProjectFile("components/marketplace/MarketplaceDirectory.tsx");
  const footer = readProjectFile("components/Footer.tsx");
  const sitemap = readProjectFile("scripts/generate-sitemaps.ts");
  const translations = readProjectFile("lib/i18n/marketplace-content.ts");
  const css = readProjectFile("app/globals.css");

  assert.match(localizedRouter, /slug\[0\] === "trust-safety"/);
  assert.match(trustPage, /Understand what Elevare reviews/);
  assert.match(trustPage, /not an emergency, medical, or crisis service/i);
  assert.match(publicSummary, /<details/);
  assert.match(publicSummary, /<summary/);
  assert.match(publicSummary, /trust_explanation_opened/);
  assert.match(directory, /localizePathname\("\/trust-safety\/"/);
  assert.match(footer, /localizePathname\("\/trust-safety\/"/);
  assert.match(sitemap, /"\/trust-safety\/"/);
  assert.match(translations, /const TRUST_SAFETY_COPY/);
  assert.match(translations, /"es-419"/);
  assert.match(translations, /"pt-BR"/);
  assert.match(css, /\.professional-trust-item summary:focus-visible/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*professional-trust-owner-grid/);
});
