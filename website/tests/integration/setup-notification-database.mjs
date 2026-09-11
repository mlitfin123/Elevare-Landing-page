// Extends the disposable runtime contract fixture; never targets a remote DB.
// Run setup-local-database.mjs first. Concierge table definitions are imported
// from the real migration, rather than replacing their constraints with mocks.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const repo = path.resolve(import.meta.dirname, '../../..');
const container = 'elevare-runtime-test-db';
const run = (args) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true });
if (run(['inspect', '--format', '{{.Config.Image}}', container]).trim() !== 'public.ecr.aws/supabase/postgres:17.6.1.127') throw Error('Unexpected test container');
const concierge = fs.readFileSync(path.join(repo, 'supabase/migrations/20260909500000_marketplace_concierge.sql'), 'utf8').replaceAll('\r\n', '\n');
let sql = `begin;
create table public.marketplace_search_demand (id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id));
create table public.trainer_profile_inquiries (id uuid primary key default gen_random_uuid(), trainer_profile_id uuid references public.trainer_profiles(id), client_user_id uuid references public.users(id), status text default 'new', created_at timestamptz default now());
`;
const tables = ['marketplace_concierge_cases', 'marketplace_concierge_recommendations', 'marketplace_concierge_introductions', 'marketplace_concierge_follow_ups', 'marketplace_concierge_notification_outbox'];
for (const table of tables) {
  const match = concierge.match(new RegExp(`create table if not exists public\\.${table} \\([\\s\\S]*?\\n\\);`));
  if (!match) throw Error(`Missing real table: ${table}`);
  sql += match[0] + `\nalter table public.${table} enable row level security; revoke all on public.${table} from public, anon, authenticated; grant all on public.${table} to service_role;\n`;
}
const normalize = concierge.match(/create or replace function public\.marketplace_concierge_normalize_locale[\s\S]*?\$\$;/);
if (!normalize) throw Error('Missing normalization function');
sql += normalize[0] + `
grant all on public.marketplace_search_demand, public.trainer_profile_inquiries, public.trainer_verification_requests to service_role;
insert into auth.users(id,email,email_confirmed_at) values('88888888-8888-4888-8888-888888888888','notification-client@example.invalid',now()) on conflict(id) do nothing;
insert into public.users(id,auth_id,email,is_active,preferred_locale) values('77777777-7777-4777-8777-777777777777','88888888-8888-4888-8888-888888888888','notification-client@example.invalid',true,'es-419');
insert into public.marketplace_search_demand(id,user_id) values('99999999-9999-4999-8999-999999999999','77777777-7777-4777-8777-777777777777');
insert into public.marketplace_concierge_cases(id,public_case_code,client_user_id,source_request_id,sharing_consent_at) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','EVR-111111111111','77777777-7777-4777-8777-777777777777','99999999-9999-4999-8999-999999999999',now());
insert into public.marketplace_concierge_notification_outbox(case_id,event_type,recipient_role,recipient_user_id,idempotency_key) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','client_request_received','client','77777777-7777-4777-8777-777777777777','historical-disabled');
commit;`;
const file = path.join(repo, '.tmp/notification-fixture.sql'); fs.writeFileSync(file, sql);
for (const source of [file, path.join(repo, 'supabase/migrations/20260911120000_marketplace_notification_delivery.sql')]) {
  run(['cp', source, `${container}:/tmp/notification-step.sql`]);
  run(['exec', container, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/notification-step.sql']);
}
// Advance only the synthetic activation window so reminder time boundaries can
// be exercised without a multi-day wait. Disabled legacy rows remain unchanged.
run(['exec', container, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-c', "update public.marketplace_email_delivery_config set started_at = now() - interval '3 days'; notify pgrst, 'reload schema';"]);
console.log('Applied notification migration to disposable contract fixture. No remote writes or email sends.');
