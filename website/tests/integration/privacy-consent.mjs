// Actual migration functions, triggers and RLS in an isolated local PostgreSQL
// database. Prerequisite tables are fixtures, not a production schema replay.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../../..');
const container='elevare-runtime-test-db';
const database=`elevare_privacy_${Date.now()}`;
const docker=args=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:'pipe',maxBuffer:3_000_000});
assert.equal(docker(['inspect','--format','{{.Config.Image}}',container]).trim(),'public.ecr.aws/supabase/postgres:17.6.1.127');
const sql=s=>docker(['exec','-i',container,'psql','-U','supabase_admin','-d',database,'-v','ON_ERROR_STOP=1','-At','-c',s]).trim();
const read=name=>fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8').replaceAll('\r\n','\n');
const privacy=read('20260818210000_marketplace_legal_privacy_readiness.sql');
const security=read('20260820210000_legal_security_entity_separation.sql');
const trust=read('20260909400000_professional_trust_safety.sql');
const mvp=read('20260816_elevare_marketplace_mvp.sql');
const extract=(source,regex)=>{const match=source.match(regex);assert.ok(match,regex.toString());return match[0];};
const table=(source,name)=>extract(source,new RegExp(`create table if not exists public\\.${name} \\([\\s\\S]*?\\n\\);`));
const fn=(source,name)=>extract(source,new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`));
const policy=(source,name)=>extract(source,new RegExp(`create policy ${name}\\s[\\s\\S]*?;`));
const a=crypto.randomUUID(), b=crypto.randomUUID(), owner=crypto.randomUUID(), reviewer=crypto.randomUUID();
const profile=crypto.randomUUID(), clientProfile=crypto.randomUUID();
const as=(id,s,role='authenticated')=>sql(`set role ${role}; set request.jwt.claim.sub='${id??''}'; set request.jwt.claim.role='${role}'; ${s}`);
const result=(id,s)=>as(id,s).split('\n').at(-1);
const ack="select public.marketplace_acknowledge_legal('2026-09-14','2026-09-14','2026-08-20',true,true,true);";
let passed=0;
const check=(name,test)=>{test();passed++;console.log(`PASS ${name}`);};
docker(['exec',container,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c',`create database ${database};`]);
try {
 const setup=`create schema auth; create schema storage;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
 create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
 create function storage.extension(name text) returns text language sql immutable as $$ select split_part(name,'.',-1) $$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());
 create table public.users(id uuid primary key,auth_id uuid unique references auth.users(id),role text default 'client',is_active boolean default true);
 create table public.user_legal_acceptances(id uuid primary key default gen_random_uuid(),user_id uuid references public.users(id),document_key text not null,document_version text not null,accepted_role text,accepted_at timestamptz default now(),created_at timestamptz default now(),acceptance_source text,acceptance_method text,acceptance_country_code text,legal_document_version_id uuid,unique(user_id,document_key,document_version));
 ${table(privacy,'user_legal_acceptance_history')}
 ${table(security,'legal_document_versions')}
 ${table(security,'user_assertion_history')}
 alter table public.user_legal_acceptance_history add column terms_document_version_id uuid,add column privacy_document_version_id uuid;
 ${fn(privacy,'record_user_legal_acceptance_history')}
 ${fn(security,'attach_legal_document_version_to_acceptance')}
 ${fn(security,'attach_legal_document_versions_to_history')}
 create trigger acceptance_version before insert on public.user_legal_acceptances for each row execute function public.attach_legal_document_version_to_acceptance();
 create trigger acceptance_history after insert on public.user_legal_acceptances for each row execute function public.record_user_legal_acceptance_history();
 create trigger history_versions before insert on public.user_legal_acceptance_history for each row execute function public.attach_legal_document_versions_to_history();
 ${fn(mvp,'marketplace_current_user_id')}
 ${fn(trust,'marketplace_is_trust_reviewer')}
 create table public.trainer_profiles(id uuid primary key,user_id uuid);
 create table public.client_profiles(id uuid primary key,user_id uuid,preference_notes text);
 create table public.matches(id uuid primary key default gen_random_uuid(),client_profile_id uuid,trainer_profile_id uuid,status text);
 create table public.trainer_profile_inquiries(id uuid primary key default gen_random_uuid(),client_user_id uuid,client_profile_id uuid,trainer_profile_id uuid,message text);
 create table public.saved_trainer_profiles(id uuid default gen_random_uuid(),client_user_id uuid,trainer_profile_id uuid);
 create table public.trainer_verification_requests(id uuid default gen_random_uuid());
 create table public.marketplace_concierge_cases(id uuid default gen_random_uuid());
 create table public.marketplace_search_demand(id uuid default gen_random_uuid());
 create table public.professional_insurance_submissions(evidence_storage_path text);
 create type public.verification_status as enum ('pending','verified','rejected');
 create table public.certifications(id uuid primary key default gen_random_uuid(),trainer_profile_id uuid,trainer_id uuid,document_url text,verification_status public.verification_status default 'pending',verified_at timestamptz,verified_by uuid,review_feedback_public text,revoked_at timestamptz,last_rechecked_at timestamptz,material_revision integer default 1,evidence_version integer default 1,cert_name text,issuing_body text,cert_org text,cert_id text,credential_number text,credential_type text,issue_date date,expiration_date date,expiry_date date,supporting_reference_url text,credential_country_code text,credential_jurisdiction text);
 ${fn(trust,'marketplace_guard_credential_verification_fields')}
 create trigger credential_guard before insert or update or delete on public.certifications for each row execute function public.marketplace_guard_credential_verification_fields();
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb,created_at timestamptz default now());
 alter table storage.objects enable row level security;
 ${['select','insert','update','delete'].map(op=>policy(security,`credential_documents_${op}_own`)).join('\n')}
 ${['select','insert','update','delete'].map(op=>policy(trust,`professional_trust_evidence_${op}_own`)).join('\n')}
 grant select,insert,update,delete on storage.objects to authenticated,anon;
 grant select on public.users,public.trainer_profiles,public.legal_document_versions to authenticated;
 grant select,insert,update,delete on public.user_legal_acceptances,public.certifications to authenticated;
 alter table public.user_legal_acceptances enable row level security;
 create policy fixture_legacy_acceptances on public.user_legal_acceptances for all to authenticated using(user_id=public.marketplace_current_user_id()) with check(user_id=public.marketplace_current_user_id());
 alter table public.client_profiles enable row level security;
 create policy fixture_broad_legacy_read on public.client_profiles for select to authenticated using(true);
 grant select on public.client_profiles to authenticated;
 alter table public.trainer_profile_inquiries enable row level security;
 ${['insert_own','select_client_own','select_trainer_own'].map(op=>policy(mvp,`trainer_profile_inquiries_${op}`)).join('\n')}
 alter table public.saved_trainer_profiles enable row level security;
 ${['insert_own','select_own','delete_own'].map(op=>policy(mvp,`saved_trainer_profiles_${op}`)).join('\n')}
 grant select,insert on public.trainer_profile_inquiries,public.saved_trainer_profiles,public.trainer_verification_requests,public.marketplace_concierge_cases,public.marketplace_search_demand to authenticated;
 create function public.fixture_definer_request() returns void language sql security definer as $$ insert into public.marketplace_concierge_cases default values $$;
 insert into auth.users(id) values('${a}'),('${b}'),('${owner}'),('${reviewer}');
 insert into public.users(id,auth_id,role) values('${a}','${a}','client'),('${b}','${b}','client'),('${owner}','${owner}','trainer'),('${reviewer}','${reviewer}','admin');
 insert into public.trainer_profiles values('${profile}','${owner}');
 insert into public.client_profiles values('${clientProfile}','${a}','Private preferences, not inquiry text');
 `;
 // Avoid Windows command-length limits with a local fixture file, not shell interpolation.
 const fixture=path.join(root,'.tmp/privacy-consent-fixture.sql');fs.writeFileSync(fixture,setup);
 docker(['cp',fixture,`${container}:/tmp/privacy-consent-fixture.sql`]);
 docker(['exec',container,'psql','-U','supabase_admin','-d',database,'-v','ON_ERROR_STOP=1','-f','/tmp/privacy-consent-fixture.sql']);
 sql(read('20260911190000_website_signup_legal_acceptance.sql'));
 sql(read('20260914110000_register_media_privacy_legal.sql'));
 sql(read('20260914120000_marketplace_action_consent.sql'));
 sql(read('20260914120000_marketplace_action_consent.sql'));
 sql(`alter table public.trainer_profiles add column verification_status public.verification_status default 'pending',
   add column profile_live boolean default false,add column certs_verified boolean default false,
   add column review_feedback_public text,add column last_submitted_at timestamptz,
   add column onboarding_complete boolean default false,add column profile_complete boolean default false,
   add column public_slug text,add column background_check_status text,add column background_check_id text,
   add column background_check_candidate_id text,add column background_check_invitation_id text,
   add column background_check_report_id text,add column background_check_result text;
   ${fn(read('20260818130000_professional_onboarding_profile_fields.sql'),'marketplace_guard_professional_admin_fields')}
   create trigger profile_guard before insert or update on public.trainer_profiles for each row execute function public.marketplace_guard_professional_admin_fields();
   grant insert,update on public.trainer_profiles to authenticated;`);
 check('missing historical consent is not fabricated; direct actions and definer RPCs are blocked',()=>{
  assert.equal(sql('select count(*) from public.user_legal_acceptances'),'0');
  assert.equal(result(a,"select public.marketplace_get_consent_status()->>'accepted'"),'false');
  for(const s of ["select public.fixture_definer_request()",...['trainer_profile_inquiries','saved_trainer_profiles','trainer_verification_requests','marketplace_search_demand'].map(t=>`insert into public.${t} default values`)])assert.throws(()=>as(a,s),/MARKETPLACE_ACKNOWLEDGEMENT_REQUIRED/);
  assert.throws(()=>as(null,ack,'anon'),/permission denied/);
 });
 check('version and checkbox bypasses fail; metadata edits do not count as acknowledgement',()=>{
  for(const s of [ack.replace("'2026-09-14'","'2026-09-07'"),ack.replace('true,true,true','false,true,true'),ack.replace('true,true,true','true,true,false')])assert.throws(()=>as(a,s),/MARKETPLACE_ACKNOWLEDGEMENT_REQUIRED/);
  sql(`update auth.users set raw_user_meta_data='{"legal_acceptance":true,"age_18_plus":true,"role":"admin"}' where id='${a}'`);
  assert.equal(result(a,"select public.marketplace_get_consent_status()->>'accepted'"),'false');
  assert.equal(result(a,'select public.marketplace_is_trust_reviewer()'),'f');
  assert.throws(()=>as(a,`insert into public.user_legal_acceptances(user_id,document_key,document_version) values('${a}','terms_of_service','2026-09-14')`),/row-level security/);
 });
 check('acknowledgement records authenticated identity, versions, server time, age and history once',()=>{
  as(a,ack);as(a,ack);assert.equal(result(a,"select public.marketplace_get_consent_status()->>'accepted'"),'true');
  assert.equal(sql(`select count(*) from public.user_legal_acceptances where user_id='${a}' and accepted_at>now()-interval '1 minute' and legal_document_version_id is not null`),'2');
  assert.equal(sql(`select count(*) from public.user_assertion_history where auth_user_id='${a}' and assertion_value and assertion_source='marketplace_action'`),'1');
  assert.equal(sql(`select count(*) from public.user_legal_acceptance_history where marketplace_user_id='${a}' and terms_version='2026-09-14' and privacy_version='2026-09-14'`),'1');
  assert.equal(result(b,"select public.marketplace_get_consent_status()->>'accepted'"),'false');
  as(a,'select public.fixture_definer_request()');
 });
 check('accepted client can send; other clients cannot impersonate or read the inquiry',()=>{
  as(a,`insert into public.trainer_profile_inquiries(client_user_id,client_profile_id,trainer_profile_id,message) values('${a}','${clientProfile}','${profile}','Explicitly shared inquiry')`);
  as(b,ack);
  assert.throws(()=>as(b,`insert into public.trainer_profile_inquiries(client_user_id,trainer_profile_id) values('${a}','${profile}')`),/row-level security/);
  assert.equal(result(b,'select count(*) from public.trainer_profile_inquiries'),'0');
  assert.equal(result(owner,'select message from public.trainer_profile_inquiries'),'Explicitly shared inquiry');
  assert.equal(result(a,'select count(*) from public.trainer_profile_inquiries'),'1');
  assert.throws(()=>as(null,'select * from public.trainer_profile_inquiries','anon'),/permission denied/);
 });
 check('inquiry/proposed match cannot expose a private profile; accepted relationships remain compatible',()=>{
  sql(`insert into public.matches(client_profile_id,trainer_profile_id,status) values('${clientProfile}','${profile}','pending_client')`);
  assert.equal(result(owner,'select count(*) from public.client_profiles'),'0');
  assert.equal(result(b,'select count(*) from public.client_profiles'),'0');
  assert.equal(result(a,'select count(*) from public.client_profiles'),'1');
  sql("update public.matches set status='accepted'");
  assert.equal(result(owner,'select count(*) from public.client_profiles'),'1');
  assert.equal(result(b,'select count(*) from public.client_profiles'),'0');
 });
 check('private evidence access is owner-only; uploads cannot overwrite or move reviewed bytes',()=>{
  for(const bucket of ['credential-documents','professional-trust-evidence']){
   const name=`${owner}/insurance/evidence.pdf`;
   as(owner,`insert into storage.objects(bucket_id,name,metadata) values('${bucket}','${name}','{"version":1}')`);
   assert.equal(result(b,`select count(*) from storage.objects where bucket_id='${bucket}'`),'0');
   assert.equal(as(null,`select count(*) from storage.objects`,'anon').split('\n').at(-1),'0');
   assert.equal(result(owner,`with changed as(update storage.objects set metadata='{"version":2}' where bucket_id='${bucket}' returning *) select count(*) from changed`),'0');
   assert.throws(()=>as(b,`insert into storage.objects(bucket_id,name) values('${bucket}','${name}')`),/row-level security/);
  }
 });
 check('self-verification is normalized or rejected; new evidence resets legitimate review',()=>{
  const id=crypto.randomUUID();
  as(owner,`insert into public.certifications(id,trainer_profile_id,document_url,verification_status,verified_at) values('${id}','${profile}','${owner}/insurance/old.pdf','verified',now())`);
  assert.equal(sql(`select verification_status from public.certifications where id='${id}'`),'pending');
  assert.throws(()=>as(owner,`update public.certifications set verification_status='verified' where id='${id}'`),/only be updated by Elevare/);
  as(reviewer,`update public.certifications set verification_status='verified',verified_at=now() where id='${id}'`);
  as(owner,`update public.certifications set document_url='${owner}/insurance/new.pdf' where id='${id}'`);
  assert.equal(sql(`select verification_status||':'||evidence_version from public.certifications where id='${id}'`),'pending:2');
 });
 check('direct profile approval, insurance/credential flags and background-check claims stay server-controlled',()=>{
  for(const change of ["profile_live=true","verification_status='verified'","certs_verified=true","background_check_status='clear'"])
   assert.throws(()=>as(owner,`update public.trainer_profiles set ${change} where id='${profile}'`),/Administrative profile fields/);
  const id=crypto.randomUUID();as(owner,`insert into public.trainer_profiles(id,user_id,profile_live,verification_status,certs_verified) values('${id}','${owner}',true,'verified',true)`);
  assert.equal(sql(`select profile_live::text||':'||verification_status||':'||certs_verified::text from public.trainer_profiles where id='${id}'`),'false:pending:false');
 });
 check('new website signup requires current versions; shared signup and recovery stay available',()=>{
  const id=crypto.randomUUID();sql(`insert into auth.users(id,raw_user_meta_data) values('${id}','{"legal_acceptance_source":"website_signup","legal_acceptance":true,"age_18_plus":true,"age_attestation_version":"2026-08-20","terms_version":"2026-09-07","privacy_version":"2026-09-07"}')`);
  assert.throws(()=>sql(`insert into public.users(id,auth_id) values('${id}','${id}')`),/current Terms/);
  sql(`update auth.users set raw_user_meta_data='{}' where id='${id}'; insert into public.users(id,auth_id) values('${id}','${id}')`);
  assert.equal(result(id,"select public.marketplace_get_consent_status()->>'accepted'"),'false');
 });
 console.log(`${passed} database regression groups passed; no remote writes.`);
} finally {
 docker(['exec',container,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c',`drop database ${database};`]);
}
