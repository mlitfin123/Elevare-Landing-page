// Disposable contract fixture for Supabase Postgres/PostgREST. This does not
// replace the separately maintained production baseline or its migration ledger.
import fs from 'node:fs';
import path from 'node:path';
const repo=path.resolve(import.meta.dirname,'../../..');
const migration=(name)=>fs.readFileSync(path.join(repo,'supabase/migrations',name),'utf8').replaceAll('\r\n','\n');
const first=migration('20260816_elevare_marketplace_mvp.sql');
const onboarding=migration('20260818130000_professional_onboarding_profile_fields.sql');
const international=migration('20260818190000_international_marketplace_foundation.sql');
const privacy=migration('20260818210000_marketplace_legal_privacy_readiness.sql');
const decision=migration('20260909200000_decision_ready_professional_profiles.sql');
const trust=migration('20260909400000_professional_trust_safety.sql');
const retention=migration('20260909300000_professional_retention_dashboard.sql');
const statement=(source,start)=>{const at=source.indexOf(start);if(at<0)throw Error(start); const tail=source.slice(at);const end=start.includes('function')?tail.indexOf('$$;',tail.indexOf('as $$')+5)+3:tail.indexOf(';')+1;return tail.slice(0,end)+'\n';};
let sql=`-- Local test only. Never apply this fixture to an existing project.\ncreate type public.verification_status as enum ('pending','verified','rejected','suspended');\ncreate type public.modality as enum ('online','in_person','hybrid');\ncreate type public.fitness_level as enum ('beginner','intermediate','advanced');\n`;
function table(name,columns){sql+=`create table public.${name} (\n${columns.join(',\n')}\n);\n`;}
table('users',['id uuid primary key','auth_id uuid unique not null','first_name text','last_name text','email text','role text default \'professional\'','is_active boolean default true','profile_photo_url text','profile_photo_storage_path text','deleted_at timestamptz','created_at timestamptz default now()','updated_at timestamptz default now()']);
sql+="alter table auth.users add column if not exists email_confirmed_at timestamptz;\n";
sql+="alter table public.users add column preferred_locale text default 'en';\n";
table('trainer_verification_requests',['id uuid primary key default gen_random_uuid()','trainer_profile_id uuid','request_status text','requested_at timestamptz','updated_at timestamptz','created_at timestamptz']);
const textCols='public_slug public_display_name professional_title bio location_city location_state country_code postal_code primary_specialty coaching_style online_coaching_best_for online_check_in_style online_communication_cadence online_expected_response_time client_acceptance_status availability_details website_url marketplace_pricing_basis marketplace_currency_code public_headline best_fit_summary service_boundaries consultation_expectations review_feedback_public background_check_status background_check_id background_check_candidate_id background_check_invitation_id background_check_report_id background_check_result internal_notes';
table('trainer_profiles',['id uuid primary key default gen_random_uuid()','user_id uuid unique references public.users(id) on delete cascade',...textCols.split(' ').map(n=>`${n} text`),...('secondary_specialties marketplace_specialties marketplace_goal_tags languages typical_availability'.split(' ').map(n=>`${n} text[] default '{}'`)),"experience_levels_served public.fitness_level[] default '{}'",...('years_experience marketplace_price_min_cents marketplace_price_max_cents total_reviews total_completed_packages'.split(' ').map(n=>`${n} integer`)), 'average_rating numeric',...('profile_live accepting_clients is_featured contact_for_pricing certs_verified onboarding_complete profile_complete'.split(' ').map(n=>`${n} boolean default false`)),"verification_status public.verification_status default 'pending'", "modality public.modality default 'online'", "social_links jsonb default '{}'",...('availability_confirmed_at profile_information_confirmed_at approved_at reliability_suspended_until last_submitted_at deleted_at'.split(' ').map(n=>`${n} timestamptz`)), 'created_at timestamptz default now()','updated_at timestamptz default now()']);
table('service_categories',['id uuid primary key default gen_random_uuid()',...('slug public_slug name public_label public_headline public_short_description description'.split(' ').map(n=>`${n} text`)),'is_active boolean default true','is_visible_in_directory boolean default true','sort_order integer default 0']);
table('trainer_services',['trainer_profile_id uuid references public.trainer_profiles(id) on delete cascade','service_category_id uuid references public.service_categories(id)','is_primary boolean default false','primary key(trainer_profile_id,service_category_id)']);
table('trainer_locations',['id uuid primary key default gen_random_uuid()','trainer_profile_id uuid references public.trainer_profiles(id) on delete cascade',...('location_name location_city location_state country_code postal_code'.split(' ').map(n=>`${n} text`)),...('service_radius_miles service_radius_meters lat lng'.split(' ').map(n=>`${n} numeric`)),'is_primary boolean default true','created_at timestamptz default now()']);
table('provider_matching_profiles',['trainer_profile_id uuid primary key references public.trainer_profiles(id) on delete cascade',...('delivery_modes goal_tags experience_tags'.split(' ').map(n=>`${n} text[] default '{}'`)),...('price_min_cents price_max_cents'.split(' ').map(n=>`${n} integer`)),"available_locations jsonb default '[]'","availability_summary jsonb default '{}'",'currency_code text','pricing_basis text','contact_for_pricing boolean default false','updated_at timestamptz default now()']);
table('certifications',['id uuid primary key default gen_random_uuid()','trainer_profile_id uuid references public.trainer_profiles(id) on delete cascade','trainer_id uuid',...('cert_name issuing_body cert_org cert_id credential_number credential_type document_url supporting_reference_url credential_country_code credential_jurisdiction review_feedback_public'.split(' ').map(n=>`${n} text`)),...('issue_date expiration_date expiry_date'.split(' ').map(n=>`${n} date`)),"verification_status public.verification_status default 'pending'",'is_active boolean default true','public_display boolean default true','verified_by uuid',...('verified_at revoked_at last_rechecked_at'.split(' ').map(n=>`${n} timestamptz`)),'material_revision integer default 1','evidence_version integer default 1','created_at timestamptz default now()','updated_at timestamptz default now()']);
sql+=statement(onboarding,'create table if not exists public.trainer_service_offerings');
sql+="alter table public.trainer_service_offerings add column currency_code text default 'USD';\n";
sql+=decision.slice(decision.indexOf('alter table public.trainer_service_offerings'),decision.indexOf('alter table public.trainer_profile_inquiries'));
for(const name of ['professional_identity_checks','professional_background_checks','professional_insurance_submissions'])sql+=statement(trust,`create table if not exists public.${name}`);
sql+=`create view public.trainer_insurance_public_status as select id as trainer_id, false as is_insured_trainer, null::timestamptz as insured_verified_at from public.trainer_profiles;\n`;
sql+=statement(first,'create or replace function public.marketplace_current_user_id');
sql+=statement(first,'create or replace function public.marketplace_set_updated_at');
sql+=statement(first,'create or replace function public.marketplace_slugify');
sql+=statement(onboarding,'create or replace function public.marketplace_guard_professional_admin_fields');
sql+=statement(international,'create or replace function public.marketplace_unpublish_changed_professional_profile');
sql+=statement(onboarding,'create or replace function public.marketplace_unpublish_profile_for_related_change');
sql+=statement(decision,'create or replace function public.marketplace_unpublish_decision_ready_profile_changes');
sql+=statement(trust,'create or replace function public.marketplace_is_trust_reviewer');
sql+=statement(trust,'create or replace function public.marketplace_guard_credential_verification_fields');
sql+=statement(retention,'create or replace function public.marketplace_update_professional_availability');
sql+=statement(retention,'create or replace function public.marketplace_confirm_professional_profile');
sql+=`create trigger updated_at before update on public.trainer_profiles for each row execute function public.marketplace_set_updated_at();\ncreate trigger admin_fields before insert or update on public.trainer_profiles for each row execute function public.marketplace_guard_professional_admin_fields();\ncreate trigger zzz_unpublish before update on public.trainer_profiles for each row execute function public.marketplace_unpublish_changed_professional_profile();\ncreate trigger zzy_decision before update on public.trainer_profiles for each row execute function public.marketplace_unpublish_decision_ready_profile_changes();\ncreate trigger credential_guard before insert or update on public.certifications for each row execute function public.marketplace_guard_credential_verification_fields();\n`;
for(const table of ['trainer_services','trainer_locations','trainer_service_offerings','certifications'])sql+=`create trigger unpublish after insert or update or delete on public.${table} for each row execute function public.marketplace_unpublish_profile_for_related_change();\n`;
sql+=statement(privacy,'create or replace view public.marketplace_public_trainer_profiles_v1 as');
sql+=statement(decision,'create or replace view public.marketplace_public_trainer_profiles_v2 as');
sql+=statement(international,'create or replace view public.marketplace_public_trainer_international_v1 as');
sql+=statement(trust,'create or replace view public.marketplace_public_professional_trust_v1');
sql+="alter table public.trainer_profiles add column inactivity_state text, add column inactivity_marked_at timestamptz;\n";
sql+=statement(first,'create or replace view public.marketplace_trainer_profile_status_v1 as');
// The attested submission implementation is tested by the established legal
// suite; this fixture deliberately rejects it rather than bypassing attestations.
sql+=`create function public.submit_current_trainer_profile_for_review_attested(requested_email text,request_notes text,attestation_version text,country_at_acceptance text) returns void language plpgsql as $$ begin raise exception 'Full legal baseline required for attested submission test'; end; $$;\n`;
for(const name of ['users','trainer_profiles','trainer_services','trainer_locations','trainer_service_offerings','certifications','provider_matching_profiles']){
 sql+=`alter table public.${name} enable row level security;\n`;
 const own=name==='users'?'auth_id = auth.uid()':name==='trainer_profiles'?'user_id = public.marketplace_current_user_id()':`exists(select 1 from public.trainer_profiles p where p.id=${name}.trainer_profile_id and p.user_id=public.marketplace_current_user_id())`;
 sql+=`create policy owner on public.${name} to authenticated using (${own}) with check (${own});\ngrant select,insert,update,delete on public.${name} to authenticated;\n`;
}
sql+=`grant all on all tables in schema public to service_role; grant select on public.service_categories,public.marketplace_trainer_profile_status_v1 to authenticated;\ngrant usage on schema public to anon,authenticated,service_role;\nalter role authenticator password 'local-test-only';\n`;
fs.mkdirSync(path.join(repo,'.tmp'),{recursive:true});
fs.writeFileSync(path.join(repo,'.tmp/runtime-fixture.sql'),'begin;\n'+fs.readFileSync(path.join(import.meta.dirname,'auth-helpers.sql'),'utf8')+'\n'+sql+'\ncommit;\n');
