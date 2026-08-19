import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  PRIVACY_VERSION,
  PROFESSIONAL_ATTESTATION_TEXT,
  PROFESSIONAL_ATTESTATION_VERSION,
  TERMS_VERSION,
} from "../lib/legal.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

test("legal versions are explicit ISO dates", () => {
  assert.match(TERMS_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(PRIVACY_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(PROFESSIONAL_ATTESTATION_VERSION, /^\d{4}-\d{2}-\d{2}$/);
});

test("professional attestation covers accuracy and jurisdiction responsibility", () => {
  assert.match(PROFESSIONAL_ATTESTATION_TEXT, /profile and credential information is accurate/i);
  assert.match(PROFESSIONAL_ATTESTATION_TEXT, /jurisdictions in which I provide them/i);
});

test("signup links current legal documents and records version metadata", () => {
  const authPanel = readFileSync(`${projectRoot}components/marketplace/AuthPanel.tsx`, "utf8");

  assert.match(authPanel, /terms-of-service\.html/);
  assert.match(authPanel, /privacy-policy\.html/);
  assert.match(authPanel, /terms_version: TERMS_VERSION/);
  assert.match(authPanel, /privacy_version: PRIVACY_VERSION/);
  assert.match(authPanel, /checked=\{hasAcceptedLegalTerms\}/);
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

test("consultation form states that a request is not a booking or contract", () => {
  const inquiryForm = readFileSync(`${projectRoot}components/marketplace/InquiryForm.tsx`, "utf8");

  assert.match(inquiryForm, /does not create a booking, paid contract, or/);
  assert.match(inquiryForm, /guaranteed appointment/);
});
