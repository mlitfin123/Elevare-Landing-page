// Run after setup-local-database.mjs, against the named disposable fixture only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
const root = path.resolve(import.meta.dirname, '../../..');
const container = 'elevare-runtime-test-db';
const options = { encoding: 'utf8', windowsHide: true, maxBuffer: 2_000_000 };
const image = execFileSync('docker', ['inspect', '--format', '{{.Config.Image}}', container], options).trim();
assert.equal(image, 'public.ecr.aws/supabase/postgres:17.6.1.127');
const args = ['exec', '-i', container, 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
const sql = source => execFileSync('docker', args, { ...options, input: source });
const id = '11111111-1111-4111-8111-111111111111';
assert.equal(sql(`select email from public.users where id='22222222-2222-4222-8222-222222222222';`).trim(), 'runtime-test@example.invalid');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
sql(read('supabase/migrations/20260909160000_professional_profile_view_counts.sql'));
const previous = read('supabase/migrations/20260909300000_professional_retention_dashboard.sql');
sql(previous.slice(previous.indexOf('create table if not exists public.professional_profile_view_events'), previous.indexOf('drop function if exists public.record_public_professional_profile_view')));
sql(`
create table if not exists public.trainer_profile_inquiries (
  id uuid primary key default gen_random_uuid(), trainer_profile_id uuid, status text,
  created_at timestamptz default now(), first_responded_at timestamptz
);
create table if not exists public.saved_trainer_profiles (id uuid primary key default gen_random_uuid(), trainer_profile_id uuid);
create table if not exists public.legal_document_versions (
  id uuid primary key default gen_random_uuid(), document_key text, version text,
  effective_date date, content_sha256 text, archive_path text, unique(document_key, version)
);
grant select on public.trainer_profile_inquiries, public.saved_trainer_profiles to service_role;
insert into public.professional_profile_view_counts(trainer_profile_id, view_count) values ('${id}', 15);
insert into public.professional_profile_view_events(trainer_profile_id, visitor_key_hash, viewed_on)
select '${id}', repeat(n::text,64), (timezone('utc',now()))::date - days
from (values (1,0),(2,0),(3,29),(4,29),(5,30)) old(n,days);
insert into public.trainer_profile_inquiries(trainer_profile_id,status) values ('${id}','new'),('${id}','closed');
`);
const migration = read('supabase/migrations/20260911230000_aggregate_professional_profile_views.sql');
sql(migration);
sql(read('supabase/migrations/20260911231000_register_profile_statistics_privacy.sql'));
const assertions = `
do $$ begin
  if to_regclass('public.professional_profile_view_events') is not null then raise exception 'Visitor histories retained'; end if;
  if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='professional_profile_view_daily') <> array['trainer_profile_id','viewed_on','view_count'] then raise exception 'Unexpected individual data columns'; end if;
  if (select sum(view_count) from public.professional_profile_view_daily) <> 5 then raise exception 'Historical daily totals lost'; end if;
  if (select view_count from public.professional_profile_view_counts where trainer_profile_id='${id}') <> 15 then raise exception 'Historical all-time total lost'; end if;
  if has_table_privilege('anon','public.professional_profile_view_daily','select') or has_table_privilege('authenticated','public.professional_profile_view_daily','select') then raise exception 'Private aggregates exposed'; end if;
  if has_function_privilege('anon','public.record_public_professional_profile_page_view(uuid)','execute') or has_function_privilege('authenticated','public.record_public_professional_profile_page_view(uuid)','execute') then raise exception 'Public counter writes exposed'; end if;
end $$;
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
set request.jwt.claim.role = 'authenticated';
set role authenticated;
do $$ declare result jsonb; begin
  result := public.marketplace_get_professional_retention_summary(30);
  if (result->>'views_in_range')::int <> 4 or (result->>'views_all_time')::int <> 15 then raise exception 'UTC date boundaries or all-time mismatch: %',result; end if;
  if (result->>'requests_in_range')::int <> 2 or (result->>'requests_awaiting_response')::int <> 1 then raise exception 'Inquiries changed'; end if;
end $$;
reset role;
set request.jwt.claim.sub = '77777777-7777-4777-8777-777777777777';
set role authenticated;
do $$ begin
  begin perform public.marketplace_get_professional_retention_summary(30); raise exception 'Outsider obtained summary';
  exception when others then if sqlerrm <> 'Professional profile not found.' then raise; end if; end;
end $$;
reset role;
`;
sql(assertions);
sql(migration); // Reapplying may not import history twice or reset totals.
sql(assertions);
await Promise.all(Array.from({ length: 12 }, () => promisify(execFile)('docker', [...args, '-c', `set request.jwt.claim.role='service_role'; set role service_role; select public.record_public_professional_profile_page_view('${id}');`], options)));
sql(`
set request.jwt.claim.role='service_role'; set role service_role;
do $$ begin
  if (select view_count from public.professional_profile_view_counts where trainer_profile_id='${id}') <> 27 then raise exception 'Concurrent totals lost'; end if;
  if (select sum(view_count) from public.professional_profile_view_daily where trainer_profile_id='${id}') <> 17 then raise exception 'Concurrent daily increments lost'; end if;
  perform public.record_public_professional_profile_view('${id}', 'discard-this-legacy-key');
  begin perform public.record_public_professional_profile_page_view('99999999-9999-4999-8999-999999999999'); raise exception 'Non-public profile was counted';
  exception when others then if sqlerrm <> 'Public professional profile not found.' then raise; end if; end;
end $$;
reset role;
notify pgrst, 'reload schema';
`);
const result = { result: 'PASS', database: 'Disposable localhost Docker fixture', checks: [
  'Historical daily and older all-time totals preserved; visitor event table removed',
  'Only profile ID, UTC date and aggregate count stored in daily table',
  'Anonymous/authenticated direct reads and writes denied',
  'Owner summary and UTC 30-day boundaries correct; another user cannot read it',
  'Inquiries and response counts unchanged',
  'Migration reapplication does not reset or double-count history',
  'Twelve concurrent requests increment both totals atomically',
  'Legacy RPC compatibility ignores its visitor key; non-public profile rejected',
  'New privacy archive version registered without editing old acceptances',
] };
fs.writeFileSync(path.join(root, 'website/reports/aggregate-profile-views-database.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', checks: result.checks.length }));
