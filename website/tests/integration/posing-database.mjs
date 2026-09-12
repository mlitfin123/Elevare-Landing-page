/** Disposable Docker database only. Exercises real SQL, with stubbed auth/storage prerequisites. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const container='elevare-runtime-test-db', database='elevare_posing_test_20260912';
const mobile=path.resolve(process.env.STAGELAB_REPO || '../../Bodybuilding Competition App');
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:4_000_000});
assert.equal(docker(['inspect','--format','{{.Config.Image}}',container]).trim(),'public.ecr.aws/supabase/postgres:17.6.1.127');
const sql=(input,db=database)=>docker(['exec','-i',container,'psql','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-At'],input);
if(!sql(`select 1 from pg_database where datname='${database}';`,'postgres').trim()){
 sql(`create database ${database};`,'postgres');
 sql(`create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function public.handle_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
 create function public.can_coach_access_client(uuid,uuid) returns boolean language sql stable as $$ select false $$;
 create table public.entitlement_status(user_id uuid,active boolean,current_tier text);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb,created_at timestamptz default now());
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;`);
 for(const file of ['202609061200_posing_coach.sql','202609071200_harden_posing_analysis_pipeline.sql','202609071500_fix_posing_storage_metadata_access.sql','202609071800_elevare_posing_gateway.sql'])sql(fs.readFileSync(path.join(mobile,'supabase/migrations',file),'utf8'));
 for(const file of ['20260821120000_stage_lab_quick_analysis.sql','20260821130000_stage_lab_quick_analysis_modes.sql','20260904090000_quick_analysis_generation_locale.sql','20260907190000_stage_analysis_products.sql'])sql(fs.readFileSync(path.resolve('../supabase/migrations',file),'utf8'));
}
for(let pass=0;pass<2;pass++){
 sql(fs.readFileSync(path.resolve('../supabase/migrations/20260912120000_website_posing_hardening.sql'),'utf8'));
 sql(fs.readFileSync(path.join(mobile,'supabase/migrations/202609121200_posing_provider_telemetry.sql'),'utf8'));
}
const output=sql(`begin;
do $$
declare r jsonb; session_id uuid:=gen_random_uuid(); analysis_id uuid; order_key text:='hardening-'||gen_random_uuid()::text; qid uuid;
begin
 r:=public.authorize_elevare_analysis_order(order_key,'evt_'||order_key,'pi_'||order_key,'posing_analysis',now());
 if r->>'outcome' not in ('authorized','created') then raise exception 'authorization %',r;end if;
 r:=public.create_elevare_posing_upload_session(session_id,order_key,'request-12345678','Men''s Physique','es-419','uploaded_video','{"duration_seconds":5}','[]','{}');
 if r->>'outcome'<>'created' then raise exception 'session %',r;end if;
 r:=public.reserve_elevare_posing_analysis(order_key,session_id,'request-12345678',null,1000,'video/mp4','[]');
 if r->>'outcome'<>'reserved' then raise exception 'early null-hash reservation %',r;end if;
 analysis_id:=(r->'analysis'->>'id')::uuid;
 if (select sessions.analysis_id from public.elevare_posing_upload_sessions sessions where id=session_id)<>analysis_id then raise exception 'reservation not durable';end if;
 r:=public.reserve_elevare_posing_analysis(order_key,session_id,'request-12345678',null,1000,'video/mp4','[]');
 if r->>'outcome'<>'processing' then raise exception 'duplicate reservation %',r;end if;
 if (select count(*) from public.posing_analyses where id=analysis_id)<>1 then raise exception 'duplicate AI row';end if;
 update public.posing_analyses set status='analyzing',video_content_sha256=repeat('b',64),provider_outcome='timeout',provider_usage_known=false,input_tokens=null,output_tokens=null,estimated_cost_usd=null where id=analysis_id;
 r:=public.finalize_elevare_posing_analysis(order_key,analysis_id);
 if r->>'outcome'<>'analysis_not_complete' then raise exception 'early consumption %',r;end if;
 update public.posing_analyses set status='complete',completed_at=now(),provider_outcome='success',provider_usage_known=true,input_tokens=200,output_tokens=300 where id=analysis_id;
 r:=public.finalize_elevare_posing_analysis(order_key,analysis_id);
 if r->>'outcome'<>'finalized' then raise exception 'finalize %',r;end if;
 r:=public.create_elevare_posing_upload_session(gen_random_uuid(),order_key,'request-99999999','Men''s Physique','en','uploaded_video','{"duration_seconds":5}','[]','{}');
 if r->>'outcome'<>'analysis_already_consumed' then raise exception 'consumed order restarted %',r;end if;
 if not public.reserve_elevare_integration_nonce('hardening-key',order_key,now(),600) then raise exception 'first nonce denied';end if;
 if public.reserve_elevare_integration_nonce('hardening-key',order_key,now(),600) then raise exception 'replay accepted';end if;
 if exists(select 1 from storage.buckets where id='posing-analysis-temp' and public) then raise exception 'public bucket';end if;
 if has_table_privilege('anon','public.quick_analyses','select') or has_table_privilege('authenticated','public.quick_analyses','select') then raise exception 'public website results';end if;
 if has_function_privilege('authenticated','public.reserve_elevare_posing_analysis(text,uuid,text,text,bigint,text,jsonb,integer,integer)','execute') then raise exception 'client reservation permission';end if;
 if exists(select 1 from pg_class where relname in ('posing_analyses','elevare_analysis_orders','elevare_posing_upload_sessions','elevare_integration_nonces') and not relrowsecurity) then raise exception 'missing RLS';end if;
 raise notice 'PASS: early reservation, durable association, duplicate reuse, finalization, replay, private storage, RLS, restricted permissions, nullable failure usage';
end $$;
-- Simulate platform SELECT grants within this rolled-back fixture to exercise RLS itself.
grant select on public.posing_analyses to authenticated;
set role authenticated;
do $$ begin if exists(select 1 from public.posing_analyses) then raise exception 'cross-user result leak';end if;end $$;
reset role;
select 'private_bucket',id,public,file_size_limit from storage.buckets;
select 'new_columns',table_name,column_name from information_schema.columns where column_name in ('posing_generation_locale','provider_outcome','provider_usage_known');
rollback;`);
console.log(output);console.log('PASS: both additive migrations apply twice; isolated local SQL protection checks passed.');
