// Real PostgreSQL trigger/transaction checks in a disposable database inside the
// explicitly named local test container. No remote writes or email sends.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const repo = path.resolve(import.meta.dirname, '../../..');
const container = 'elevare-runtime-test-db';
const database = 'elevare_signup_legal_test';
const docker = args => execFileSync('docker', args, { encoding:'utf8', windowsHide:true, stdio:'pipe', maxBuffer:2_000_000 });
assert.equal(docker(['inspect','--format','{{.Config.Image}}',container]).trim(),'public.ecr.aws/supabase/postgres:17.6.1.127');
const sql = text => docker(['exec',container,'psql','-U','supabase_admin','-d',database,'-v','ON_ERROR_STOP=1','-At','-c',text]).trim();
const migration = name => fs.readFileSync(path.join(repo,'supabase/migrations',name),'utf8').replaceAll('\r\n','\n');
const privacy = migration('20260818210000_marketplace_legal_privacy_readiness.sql');
const security = migration('20260820210000_legal_security_entity_separation.sql');
const table = (source,name) => {
  const found = source.match(new RegExp(`create table if not exists public\\.${name} \\([\\s\\S]*?\\n\\);`));
  assert.ok(found,name); return found[0];
};
const fn = (source,name) => {
  const found = source.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`));
  assert.ok(found,name); return found[0];
};
const newMigration = migration('20260911190000_website_signup_legal_acceptance.sql');
const metadata = (version='2026-09-07') => ({ legal_acceptance:true, legal_acceptance_source:'website_signup',
  terms_version:version, privacy_version:version, age_18_plus:true, age_attestation_version:'2026-08-20', role:'trainer' });
const literal = value => `'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
const signup = (data,created='2026-09-11T12:00:00Z',id=crypto.randomUUID()) => {
  sql(`insert into auth.users(id,raw_user_meta_data,created_at) values('${id}',${literal(data)},'${created}');`); return id;
};
const recordCount = id => Number(sql(`select count(*) from public.user_legal_acceptances l join public.users u on u.id=l.user_id where u.auth_id='${id}';`));
const results=[];
const check = (name,test) => { test(); results.push(name); console.log(`PASS ${name}`); };
// Never reset the runtime fixture or any pre-existing database. A failed setup
// stops here; this script drops only the database it successfully creates.
docker(['exec',container,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c',`create database ${database};`]);
try {
  let setup = `create schema auth;
    create table auth.users(id uuid primary key default gen_random_uuid(),raw_user_meta_data jsonb,created_at timestamptz default now());
    create table public.users(id uuid primary key default gen_random_uuid(),auth_id uuid unique references auth.users(id),role text default 'client',is_active boolean default true);
    create table public.user_legal_acceptances(id uuid primary key default gen_random_uuid(),user_id uuid references public.users(id),document_key text not null,document_version text not null,accepted_role text check(accepted_role in ('client','trainer')),accepted_at timestamptz default now(),created_at timestamptz default now(),acceptance_source text,acceptance_method text,acceptance_country_code text,legal_document_version_id uuid);
    ${table(privacy,'user_legal_acceptance_history')}
    ${table(security,'legal_document_versions')}
    ${table(security,'user_assertion_history')}
    alter table public.user_legal_acceptance_history add column terms_document_version_id uuid,add column privacy_document_version_id uuid;
    ${fn(privacy,'record_user_legal_acceptance_history')}
    ${fn(security,'attach_legal_document_version_to_acceptance')}
    ${fn(security,'attach_legal_document_versions_to_history')}
    ${fn(security,'record_website_signup_legal_acceptance')}
    create trigger acceptance_version before insert on public.user_legal_acceptances for each row execute function public.attach_legal_document_version_to_acceptance();
    create trigger acceptance_history after insert on public.user_legal_acceptances for each row execute function public.record_user_legal_acceptance_history();
    create trigger history_versions before insert on public.user_legal_acceptance_history for each row execute function public.attach_legal_document_versions_to_history();
    create trigger users_record_website_legal_acceptance after insert on public.users for each row execute function public.record_website_signup_legal_acceptance();
    create function public.test_signup_bootstrap() returns trigger language plpgsql as $$ begin
      insert into public.users(auth_id,role) values(new.id,coalesce(new.raw_user_meta_data->>'role','client')); return new;
    end; $$;
    create trigger signup after insert on auth.users for each row execute function public.test_signup_bootstrap();
    insert into public.legal_document_versions(document_key,version,effective_date,content_sha256,archive_path) values
      ('terms_of_service','2026-08-20','2026-08-20',repeat('a',64),'/legal/archive/terms/2026-08-20/'),
      ('privacy_policy','2026-08-20','2026-08-20',repeat('b',64),'/legal/archive/privacy/2026-08-20/');`;
  const setupFile=path.join(repo,'.tmp/signup-legal-fixture.sql'); fs.writeFileSync(setupFile,setup);
  docker(['cp',setupFile,`${container}:/tmp/signup-legal-fixture.sql`]);
  docker(['exec',container,'psql','-U','supabase_admin','-d',database,'-v','ON_ERROR_STOP=1','-f','/tmp/signup-legal-fixture.sql']);
  const legacy=signup(metadata('2026-08-20'),'2026-08-20T12:00:00Z');
  const missed=signup(metadata('2026-08-21'),'2026-08-25T12:00:00Z');
  const unchecked=signup({...metadata('2026-08-21'),legal_acceptance:false},'2026-08-25T12:00:00Z');
  assert.equal(recordCount(missed),0); assert.equal(recordCount(legacy),2);
  sql(newMigration);
  check('recovers only explicit versioned signup assertions and preserves historical acceptance',()=>{
    assert.equal(recordCount(missed),2); assert.equal(recordCount(unchecked),0); assert.equal(recordCount(legacy),2);
    assert.equal(sql(`select count(*) from public.user_legal_acceptances l join public.users u on u.id=l.user_id where u.auth_id='${missed}' and l.accepted_at='2026-08-25T12:00:00Z' and l.acceptance_method='signup_metadata_recovery' and l.document_version='2026-08-21';`),'2');
    assert.equal(sql(`select count(*) from public.user_legal_acceptances l join public.users u on u.id=l.user_id where u.auth_id='${legacy}' and l.acceptance_method='checkbox' and l.document_version='2026-08-20';`),'2');
  });
  let coach;
  check('coach signup atomically records both current documents with archive links, timestamps and audit history',()=>{
    coach=signup(metadata()); assert.equal(recordCount(coach),2);
    assert.equal(sql(`select count(*) from public.user_legal_acceptances l join public.users u on u.id=l.user_id where u.auth_id='${coach}' and l.accepted_role='trainer' and l.legal_document_version_id is not null and l.accepted_at='2026-09-11T12:00:00Z' and l.acceptance_method='checkbox';`),'2');
    assert.equal(sql(`select count(*) from public.user_legal_acceptance_history where auth_user_id='${coach}' and terms_version='2026-09-07' and privacy_version='2026-09-07' and terms_document_version_id is not null and privacy_document_version_id is not null;`),'1');
  });
  check('missing, unchecked, unknown and future consent evidence cannot produce a successful website signup',()=>{
    for(const change of [{legal_acceptance:false},{terms_version:null},{privacy_version:null},{terms_version:'unregistered'},{age_18_plus:false},{age_attestation_version:null}]) {
      const id=crypto.randomUUID(); assert.throws(()=>signup({...metadata(),...change},undefined,id),/Confirm the Terms/); assert.equal(sql(`select count(*) from auth.users where id='${id}';`),'0');
    }
    assert.throws(()=>signup(metadata(),'2026-09-01T12:00:00Z'),/Confirm the Terms/);
  });
  check('retries do not duplicate or rewrite acceptance and later metadata edits do not manufacture consent',()=>{
    assert.equal(sql(`select public.marketplace_record_signup_legal_acceptance(id) from public.users where auth_id='${coach}';`),'0');
    assert.equal(recordCount(coach),2);
    sql(`update auth.users set raw_user_meta_data=${literal(metadata())} where id='${unchecked}';`);
    assert.equal(recordCount(unchecked),0);
  });
  check('unrelated signup flows are unchanged and public users cannot invoke the recovery helper',()=>{
    const other=signup({role:'client'}); assert.equal(recordCount(other),0);
    for(const role of ['anon','authenticated']) assert.equal(sql(`select has_function_privilege('${role}','public.marketplace_record_signup_legal_acceptance(uuid,boolean)','EXECUTE');`),'f');
    assert.equal(sql("select has_function_privilege('service_role','public.marketplace_record_signup_legal_acceptance(uuid,boolean)','EXECUTE');"),'t');
  });
  fs.writeFileSync(path.join(repo,'website/reports/signup-legal-acceptance.json'),JSON.stringify({result:'PASS',database:'disposable PostgreSQL trigger fixture',realAccountsCreated:0,realEmailsSent:0,results},null,2)+'\n');
} finally {
  docker(['exec',container,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c',`drop database ${database};`]);
}
