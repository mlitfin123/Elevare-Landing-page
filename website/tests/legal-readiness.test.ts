import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  AGE_ATTESTATION_VERSION,
  LEGAL_DOCUMENTS,
  PRIVACY_VERSION,
  PROFESSIONAL_ATTESTATION_TEXT,
  PROFESSIONAL_ATTESTATION_VERSION,
  TERMS_VERSION,
} from "../lib/legal.ts";
import {
  getRegulatedTitleRule,
  hasCompatibleVerifiedCredential,
} from "../lib/regulated-professional-titles.ts";
import {
  ACTIVE_LEGAL_ROUTES,
  archiveFileToProductionRoute,
  publicHtmlFileToProductionRoute,
  STAGELAB_LEGAL_ROUTES,
} from "../lib/legal-routes.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

test("legal versions are explicit ISO dates", () => {
  assert.match(TERMS_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(PRIVACY_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(AGE_ATTESTATION_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(PROFESSIONAL_ATTESTATION_VERSION, /^\d{4}-\d{2}-\d{2}$/);
});

test("professional attestation covers authorizations, accuracy, and lawful scope", () => {
  assert.match(PROFESSIONAL_ATTESTATION_TEXT, /licenses, certifications, insurance/i);
  assert.match(PROFESSIONAL_ATTESTATION_TEXT, /profile and credential information accurate/i);
  assert.match(PROFESSIONAL_ATTESTATION_TEXT, /lawful scope of practice/i);
  assert.match(PROFESSIONAL_ATTESTATION_TEXT, /applicable jurisdiction/i);
});

test("signup links current legal documents and records version metadata", () => {
  const authPanel = readFileSync(`${projectRoot}components/marketplace/AuthPanel.tsx`, "utf8");

  assert.match(authPanel, /href="\/terms-of-service\/"/);
  assert.match(authPanel, /href="\/privacy-policy\/"/);
  assert.match(authPanel, /terms_version: TERMS_VERSION/);
  assert.match(authPanel, /privacy_version: PRIVACY_VERSION/);
  assert.match(authPanel, /age_18_plus: true/);
  assert.match(authPanel, /age_attestation_version: AGE_ATTESTATION_VERSION/);
  assert.match(authPanel, /checked=\{hasAcceptedLegalTerms\}/);
  assert.match(authPanel, /checked=\{hasConfirmedAge\}/);
  assert.match(authPanel, /mode === "sign-up" && !hasAcceptedLegalTerms/);
  assert.match(authPanel, /mode === "sign-up" && !hasConfirmedAge/);
});

test("private account and authentication routes remain noindex", () => {
  const accountLayout = readFileSync(`${projectRoot}app/account/layout.tsx`, "utf8");
  const signInPage = readFileSync(`${projectRoot}app/sign-in/page.tsx`, "utf8");

  assert.match(accountLayout, /index: false/);
  assert.match(accountLayout, /follow: false/);
  assert.match(signInPage, /index: false/);
});

test("active application links never reference legacy html legal URLs", () => {
  const files = [
    "components/Footer.tsx",
    "components/AnalyticsConsent.tsx",
    "components/marketplace/AuthPanel.tsx",
    "components/marketplace/ProfessionalProfileEditor.tsx",
    "scripts/generate-sitemaps.ts",
  ];
  const activeCode = files.map((file) => readFileSync(`${projectRoot}${file}`, "utf8")).join("\n");

  assert.doesNotMatch(activeCode, /(?:terms-of-service|privacy-policy)\.html/);
  assert.equal(LEGAL_DOCUMENTS.terms.activePath, "/terms-of-service/");
  assert.equal(LEGAL_DOCUMENTS.privacy.activePath, "/privacy-policy/");
});

test("current legal versions and professional attestation are recorded through the protected migration", () => {
  const migration = readFileSync(
    `${repositoryRoot}supabase/migrations/20260820120000_legal_versions_and_professional_attestation.sql`,
    "utf8",
  );

  assert.match(migration, /terms_version' <> '2026-08-20'/);
  assert.match(migration, /privacy_version' <> '2026-08-20'/);
  assert.match(migration, /submit_current_trainer_profile_for_review_attested/);
  assert.match(migration, /lawful scope of practice in each applicable jurisdiction/i);
  assert.match(migration, /insert into public\.user_legal_acceptance_history/);
  assert.doesNotMatch(
    migration,
    /grant (?:insert|update|delete|all).*user_legal_acceptance_history to authenticated/i,
  );
});

test("shared disclaimers cover estimates, training, articles, and restaurant nutrition", () => {
  const sharedDisclaimer = readFileSync(`${projectRoot}components/ContentDisclaimer.tsx`, "utf8");
  const nutritionDisclaimer = readFileSync(
    `${projectRoot}components/nutrition/NutritionDisclaimer.tsx`,
    "utf8",
  );

  assert.match(sharedDisclaimer, /may not reflect your individual needs or actual body composition/i);
  assert.match(sharedDisclaimer, /Exercise involves risk of injury/i);
  assert.match(sharedDisclaimer, /not medical, dietetic, or other professional healthcare advice/i);
  assert.match(nutritionDisclaimer, /does not guarantee\s+that nutrition information is complete, current, or error-free/i);
  assert.match(nutritionDisclaimer, /food allergy or medical\s+condition/i);
  assert.match(nutritionDisclaimer, /not\s+affiliated with or endorsed/i);
});

test("legal documents identify current versions and avoid unsupported compliance claims", () => {
  const terms = readFileSync(`${projectRoot}content/legal/terms-of-service.html`, "utf8");
  const privacy = readFileSync(`${projectRoot}content/legal/privacy-policy.html`, "utf8");

  assert.match(terms, /Last updated August 20, 2026/);
  assert.match(terms, /Elevare is operated by Elevare Fit LLC/i);
  assert.match(terms, /Disputes resolved via binding arbitration \(except where prohibited\)/i);
  assert.doesNotMatch(terms, /class action or class arbitration/i);
  assert.match(privacy, /Last updated August 20, 2026/);
  assert.match(privacy, /Supabase for marketplace authentication/i);
  assert.match(privacy, /Google Analytics/i);
  assert.match(privacy, /Resend for waitlist/i);
  assert.match(privacy, /AI-Assisted Processing/i);
  assert.doesNotMatch(`${terms}\n${privacy}`, /HIPAA compliant|GDPR compliant/i);
});

test("regulated titles require a compatible verified credential while ordinary titles remain available", () => {
  assert.equal(getRegulatedTitleRule("Registered Dietitian")?.group, "dietetics_nutrition");
  assert.equal(getRegulatedTitleRule("R.D.")?.group, "dietetics_nutrition");
  assert.equal(getRegulatedTitleRule("Doctor")?.group, "medical");
  assert.equal(getRegulatedTitleRule("Personal Trainer"), null);
  assert.equal(hasCompatibleVerifiedCredential("Registered Dietitian", []), false);
  assert.equal(hasCompatibleVerifiedCredential("Registered Dietitian", [{
    credentialName: "Registered Dietitian Nutritionist",
    credentialType: "License",
    verificationStatus: "verified",
  }]), true);
  assert.equal(hasCompatibleVerifiedCredential("Registered Dietitian", [{
    credentialName: "Registered Dietitian Nutritionist",
    verificationStatus: "submitted",
  }]), false);
  assert.equal(hasCompatibleVerifiedCredential("Strength Coach", []), true);
});

test("database boundary protects regulated titles and records immutable age evidence", () => {
  const migration = readFileSync(
    `${repositoryRoot}supabase/migrations/20260820210000_legal_security_entity_separation.sql`,
    "utf8",
  );

  assert.match(migration, /enforce_verified_credential_for_regulated_title/);
  assert.match(migration, /verification_status::text, ''\)\) = 'verified'/);
  assert.match(migration, /new\.profile_live is not true/);
  assert.match(migration, /regulated_title_review_required = true/);
  assert.match(migration, /create table if not exists public\.user_assertion_history/);
  assert.match(migration, /'age_18_plus'/);
  assert.doesNotMatch(migration, /delete from public\.user_legal_acceptance/);
});

test("public marketplace output excludes auth identifiers and reporting resolves a public profile id", () => {
  const types = readFileSync(`${projectRoot}lib/marketplace-types.ts`, "utf8");
  const generator = readFileSync(`${projectRoot}scripts/generate-marketplace-data.ts`, "utf8");
  const reportForm = readFileSync(`${projectRoot}components/marketplace/ReportProfileForm.tsx`, "utf8");
  const migration = readFileSync(
    `${repositoryRoot}supabase/migrations/20260820210000_legal_security_entity_separation.sql`,
    "utf8",
  );
  const publicProfileType = types.split("export type ProfessionalProfileRecord = {")[1]?.split("};")[0] ?? "";
  const publicView = migration.split("create or replace view public.marketplace_public_trainer_profiles_v2 as")[1]
    ?.split("revoke select")[0] ?? "";

  assert.doesNotMatch(publicProfileType, /userId/);
  assert.doesNotMatch(publicView, /auth_id|user_id,/);
  assert.doesNotMatch(publicView, /split_part\s*\(.*email/i);
  assert.match(generator, /marketplace_public_trainer_profiles_v2/);
  assert.match(reportForm, /target_profile_id: professional\.id/);
  assert.match(migration, /submit_professional_profile_report/);
});

test("analytics is opt-in and remains unloaded after a decline", () => {
  const consent = readFileSync(`${projectRoot}components/AnalyticsConsent.tsx`, "utf8");
  const layout = readFileSync(`${projectRoot}app/layout.tsx`, "utf8");
  const packageJson = readFileSync(`${projectRoot}package.json`, "utf8");

  assert.match(consent, /analytics_storage: "denied"/);
  assert.match(consent, /nextChoice === "accepted"/);
  assert.match(consent, /Decline analytics/);
  assert.match(consent, /clearAnalyticsCookies\(\)/);
  assert.doesNotMatch(layout, /googletagmanager\.com\/gtag\/js/);
  assert.doesNotMatch(`${layout}\n${packageJson}`, /@vercel\/analytics|<Analytics(?:\s|\/|>)/);
  assert.match(layout, /<AnalyticsConsent measurementId=\{googleAnalyticsId\}/);
});

test("legal source files map to clean production routes and StageLab links never use html filenames", () => {
  assert.equal(ACTIVE_LEGAL_ROUTES.length, 10);
  for (const route of ACTIVE_LEGAL_ROUTES) {
    assert.equal(publicHtmlFileToProductionRoute(route.sourceFile), route.route);
    const html = readFileSync(`${projectRoot}public/${route.sourceFile}`, "utf8");
    assert.match(html, new RegExp(`rel=["']canonical["'][^>]+${route.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.doesNotMatch(html, /href=["'][^"']+\.html(?:[?#]|["'])/i);
  }

  assert.equal(STAGELAB_LEGAL_ROUTES.terms.route, "/stagelab-terms-of-service/");
  assert.equal(STAGELAB_LEGAL_ROUTES.privacy.route, "/stagelab-privacy-policy/");
});

test("legal archive manifest separates immutable files from clean production routes", () => {
  const manifest = JSON.parse(readFileSync(`${projectRoot}public/legal/legal-document-versions.json`, "utf8")) as {
    documents: Array<{ archiveFilePath: string; archivePath: string; sha256: string }>;
  };
  assert.equal(manifest.documents.length, 2);
  for (const record of manifest.documents) {
    assert.match(record.archiveFilePath, /\.html$/);
    assert.doesNotMatch(record.archivePath, /\.html$/);
    assert.equal(archiveFileToProductionRoute(record.archiveFilePath), record.archivePath);
    assert.match(record.sha256, /^[a-f0-9]{64}$/);
  }
});

test("archive route migration accepts both known hashes without rewriting legal content", () => {
  const migration = readFileSync(
    `${repositoryRoot}supabase/migrations/20260820213000_normalize_legal_archive_routes.sql`,
    "utf8",
  );

  assert.match(migration, /3fb0e59316aac7a28f74cbf2ab574dec570d83e51ea0f08b6a56159134ee5308/);
  assert.match(migration, /b63f3e8cc96b162dc444f2a1db8a5e5f15e827ce996ef3e999919bda23ca74c4/);
  assert.match(migration, /ccd40ed1462393629ace1ff25ed02218c61c55f5dc678c1553bc26263193c2e9/);
  assert.match(migration, /3dfcc050a2ed40ab49bf0d635eba80a5d54ec9a8848dff76ddff633ff925fc96/);
  assert.doesNotMatch(migration, /set\s+content_sha256/i);
  assert.match(migration, /set archive_path = '\/legal\/archive\/terms\/2026-08-20\/'/);
  assert.match(migration, /set archive_path = '\/legal\/archive\/privacy\/2026-08-20\/'/);
});

test("StageLab legal documents consistently name Elevare Fit LLC as operator", () => {
  const files = [
    "stagelab-terms-of-service.html",
    "stagelab-privacy-policy.html",
    "stagelab-coach-agreement.html",
    "stagelab-liability-waiver.html",
    "stagelab-ai-disclaimer.html",
    "stagelab-refund-policy.html",
    "stagelab-photo-content-policy.html",
    "stagelab-legal.html",
  ];
  const documents = files.map((file) => readFileSync(`${projectRoot}public/${file}`, "utf8")).join("\n");

  assert.doesNotMatch(documents, /Elevare LLC/);
  assert.match(documents, /operated by Elevare Fit LLC/i);
  assert.doesNotMatch(documents, /&copy;[^\n]*StageLab/);
});

test("legal history is append-only to marketplace users and public credentials exclude review links", () => {
  const migration = readFileSync(
    `${repositoryRoot}supabase/migrations/20260818210000_marketplace_legal_privacy_readiness.sql`,
    "utf8",
  );
  const publicView = migration.split("create or replace view public.marketplace_public_trainer_profiles_v1 as")[1] ?? "";

  assert.match(migration, /create table if not exists public\.user_legal_acceptance_history/);
  assert.match(migration, /submit_current_trainer_profile_for_review_attested/);
  assert.match(migration, /document_key = 'terms_of_service'/);
  assert.match(migration, /document_key = 'privacy_policy'/);
  assert.match(migration, /after insert on public\.users/);
  assert.doesNotMatch(migration, /terms_of_service_effective_date/);
  assert.doesNotMatch(migration, /privacy_policy_effective_date/);
  assert.doesNotMatch(migration, /signature_name/);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete|all).*user_legal_acceptance_history to authenticated/i);
  assert.doesNotMatch(publicView, /document_url/);
  assert.doesNotMatch(publicView, /supporting_reference_url/);
  assert.doesNotMatch(publicView, /credential_number/);
  assert.match(migration, /certifications_restrict_raw_select_to_owner/);
});

test("new credential evidence uses private owner-scoped uploads without changing verification state", () => {
  const editor = readFileSync(`${projectRoot}components/marketplace/ProfessionalProfileEditor.tsx`, "utf8");
  const migration = readFileSync(
    `${repositoryRoot}supabase/migrations/20260820210000_legal_security_entity_separation.sql`,
    "utf8",
  );
  const credentialSave = editor.split("const activeCredentials =")[1]?.split("if (nextStatus === \"pending_review\")")[0] ?? "";
  const publicView = migration.split("create or replace view public.marketplace_public_trainer_profiles_v2 as")[1]
    ?.split("revoke select")[0] ?? "";

  assert.match(editor, /CREDENTIAL_DOCUMENT_BUCKET = "credential-documents"/);
  assert.match(editor, /application\/pdf,image\/jpeg,image\/png,image\/webp/);
  assert.match(editor, /CREDENTIAL_DOCUMENT_MAX_BYTES = 8 \* 1024 \* 1024/);
  assert.match(editor, /createSignedUrl\(documentReference, 300\)/);
  assert.match(editor, /`\$\{user\.id\}\/\$\{credential\.id\}\/\$\{crypto\.randomUUID\(\)\}/);
  assert.doesNotMatch(editor, />Supporting document URL</);
  assert.doesNotMatch(credentialSave, /verification_status\s*:/);
  assert.doesNotMatch(publicView, /document_url|supporting_reference_url/);
  assert.match(migration, /credential_documents_insert_own/);
  assert.match(migration, /bucket_id = 'credential-documents'[\s\S]*auth\.uid\(\)::text/);
});

test("consultation form states that a request is not a booking or contract", () => {
  const inquiryForm = readFileSync(`${projectRoot}components/marketplace/InquiryForm.tsx`, "utf8");

  assert.match(inquiryForm, /does not create a booking, paid contract, or/);
  assert.match(inquiryForm, /guaranteed appointment/);
});
