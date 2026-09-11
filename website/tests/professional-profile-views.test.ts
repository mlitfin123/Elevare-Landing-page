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
  assert.match(tracker, /hasAnalyticsConsent\(\)/);
  assert.match(tracker, /window\.localStorage/);
  assert.match(tracker, /utcDateKey\(\)/);
  assert.match(tracker, /x-elevare-analytics-consent/);
  assert.match(tracker, /\/api\/professional-profile-view\//);
  assert.doesNotMatch(tracker, /serviceRoleKey|x-forwarded-for|x-real-ip/);
  assert.match(route, /BOT_PATTERN/);
  assert.match(route, /purpose.*prefetch|sec-purpose/);
  assert.match(route, /accountRole === "admin" \|\| accountRole === "super_admin"/);
  assert.match(route, /\.eq\("user_id", account\.id\)/);
  assert.match(route, /sha256\(`\$\{visitorId\}:\$\{professionalId\}:\$\{day\}:\$\{config\.serviceRoleKey\}`\)/);
  assert.match(route, /record_public_professional_profile_view/);
  assert.match(route, /getSecondarySupabaseServerConfig/);
  assert.match(route, /isAllowedOrigin/);
  assert.doesNotMatch(route, /x-forwarded-for|x-real-ip|viewer_id/);
});

test("profile view totals are private, owner-readable aggregates", () => {
  const migration = readProjectFile("../supabase/migrations/20260909300000_professional_retention_dashboard.sql");
  const dashboard = readProjectFile("components/marketplace/ProfessionalRetentionDashboard.tsx");

  assert.match(migration, /professional_profile_view_events/);
  assert.match(migration, /unique \(trainer_profile_id, visitor_key_hash, viewed_on\)/);
  assert.match(migration, /revoke all on table public\.professional_profile_view_events from public, anon, authenticated/);
  assert.match(migration, /grant select, insert, delete on table public\.professional_profile_view_events to service_role/);
  assert.match(migration, /grant execute on function public\.record_public_professional_profile_view\(uuid, text\) to service_role/);
  assert.match(migration, /marketplace_public_trainer_profiles_v2/);
  assert.match(migration, /marketplace_get_professional_retention_summary/);
  assert.doesNotMatch(migration, /ip_address|user_agent|viewer_id/);
  assert.match(dashboard, /Legitimate profile views/);
  assert.match(dashboard, /Counted once per consenting browser per day/);
  assert.match(dashboard, /Bots and your own signed-in views are excluded/);
});
