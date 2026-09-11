import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

test("decision-ready public data stays behind the approved live profile view", () => {
  const migration = readProjectFile("../supabase/migrations/20260909200000_decision_ready_professional_profiles.sql");
  const publicView = migration.slice(migration.indexOf("create or replace view public.marketplace_public_trainer_profiles_v2"));

  assert.match(publicView, /from public\.marketplace_public_trainer_profiles_v1 as current_profile/i);
  assert.match(publicView, /where offering\.trainer_profile_id = profile\.id[\s\S]*offering\.is_active = true/i);
  assert.match(publicView, /grant select on public\.marketplace_public_trainer_profiles_v2 to anon, authenticated, service_role/i);
  assert.doesNotMatch(publicView, /credential_number|document_url|requested_email|admin_notes/i);
});

test("service access remains owner-only for edits and public-safe for reads", () => {
  const baseMigration = readProjectFile("../supabase/migrations/20260818130000_professional_onboarding_profile_fields.sql");
  const decisionMigration = readProjectFile("../supabase/migrations/20260909200000_decision_ready_professional_profiles.sql");

  assert.match(baseMigration, /create policy trainer_service_offerings_insert_own[\s\S]*owner_user\.auth_id = auth\.uid\(\)/i);
  assert.match(baseMigration, /create policy trainer_service_offerings_update_own[\s\S]*owner_user\.auth_id = auth\.uid\(\)/i);
  assert.match(baseMigration, /create policy trainer_service_offerings_delete_own[\s\S]*owner_user\.auth_id = auth\.uid\(\)/i);
  assert.match(decisionMigration, /trainer_service_offerings_select_visible[\s\S]*trainer\.profile_live = true[\s\S]*verification_status[\s\S]*owner_user\.is_active[\s\S]*trainer_service_offerings\.is_active = true/i);
});

test("consultation requests require an eligible professional and matching active service", () => {
  const migration = readProjectFile("../supabase/migrations/20260909200000_decision_ready_professional_profiles.sql");

  assert.match(migration, /trainer_profile_inquiries_client_request_key_uidx[\s\S]*client_user_id, request_key/i);
  assert.match(migration, /client_user_id = public\.marketplace_current_user_id\(\)/i);
  assert.match(migration, /trainer\.profile_live = true/i);
  assert.match(migration, /lower\(coalesce\(trainer\.verification_status::text, ''\)\) = 'verified'/i);
  assert.match(migration, /coalesce\(owner_user\.is_active, true\) = true/i);
  assert.match(migration, /client_acceptance_status, 'accepting'\) in \('accepting', 'waitlist'\)/i);
  assert.match(migration, /offering\.trainer_profile_id = trainer_profile_inquiries\.trainer_profile_id/i);
  assert.match(migration, /offering\.is_active = true/i);
  assert.match(migration, /offering\.consultation_type <> 'not_offered'/i);
});

test("review submission accepts active service pricing without weakening admin approval", () => {
  const migration = readProjectFile("../supabase/migrations/20260909200000_decision_ready_professional_profiles.sql");

  assert.match(migration, /offering\.is_active = true[\s\S]*offering\.contact_for_pricing = true or offering\.price_min_cents is not null/i);
  assert.match(migration, /verification_status = 'pending'::public\.verification_status/i);
  assert.match(migration, /profile_live = false/i);
  assert.doesNotMatch(migration, /verification_status = 'verified'/i);
});

test("profile editor supports ordered active services and privacy-safe inquiry analytics", () => {
  const editor = readProjectFile("components/marketplace/ProfessionalProfileEditor.tsx");
  const inquiry = readProjectFile("components/marketplace/InquiryForm.tsx");

  assert.match(editor, /moveService\(service\.id, -1\)/);
  assert.match(editor, /moveService\(service\.id, 1\)/);
  assert.match(editor, /isActive/);
  assert.match(inquiry, /requestKeyRef\.current \?\?= crypto\.randomUUID\(\)/);
  assert.match(inquiry, /error\.code !== "23505"/);
  assert.match(inquiry, /service_offering_id: isDatabaseUuid/);
  const analyticsCallPattern = /trackEvent\("[^"]+",\s*\{([\s\S]*?)\}\);/g;
  let analyticsCall = analyticsCallPattern.exec(inquiry);
  while (analyticsCall) {
    assert.doesNotMatch(analyticsCall[1] ?? "", /professional\.(id|displayName|profileSlug)/);
    analyticsCall = analyticsCallPattern.exec(inquiry);
  }
});
