import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

test("public professional profiles record a view without exposing viewer data", () => {
  const route = readProjectFile("app/api/professional-profile-view/route.ts");
  const tracker = readProjectFile("components/marketplace/ProfessionalProfileViewTracker.tsx");
  const profile = readProjectFile("app/professionals/[slug]/page.tsx");

  assert.match(profile, /ProfessionalProfileViewTracker professionalId=\{professional\.id\}/);
  assert.match(tracker, /window\.sessionStorage/);
  assert.match(tracker, /\/api\/professional-profile-view\//);
  assert.doesNotMatch(tracker, /serviceRoleKey|x-forwarded-for|x-real-ip/);
  assert.match(route, /record_public_professional_profile_view/);
  assert.match(route, /getSecondarySupabaseServerConfig/);
  assert.match(route, /isAllowedOrigin/);
});

test("profile view totals are private, owner-readable aggregates", () => {
  const migration = readProjectFile("../supabase/migrations/20260909160000_professional_profile_view_counts.sql");
  const editor = readProjectFile("components/marketplace/ProfessionalProfileEditor.tsx");

  assert.match(migration, /professional_profile_view_counts_select_own/);
  assert.match(migration, /profile\.user_id = public\.marketplace_current_user_id\(\)/);
  assert.match(migration, /revoke all on table public\.professional_profile_view_counts from anon/);
  assert.match(migration, /grant select on table public\.professional_profile_view_counts to authenticated/);
  assert.match(migration, /grant execute on function public\.record_public_professional_profile_view\(uuid\) to service_role/);
  assert.match(migration, /marketplace_public_trainer_profiles_v1/);
  assert.doesNotMatch(migration, /ip_address|user_agent|viewer_id/);
  assert.match(editor, /professional_profile_view_counts/);
  assert.match(editor, /profileViewCount/);
});
