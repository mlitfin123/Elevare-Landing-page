import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { token, testEnvironment as env } from './local-environment.mjs';
import { deliverProfessionalPublication } from '../../../supabase/functions/_shared/deliver-professional-publication.ts';

const origin='http://127.0.0.1:3100';
const id='11111111-1111-4111-8111-111111111111';
const ownerToken=token('authenticated','33333333-3333-4333-8333-333333333333');
const owner=createClient(env.SECOND_SUPABASE_URL,env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY,{global:{headers:{Authorization:`Bearer ${ownerToken}`}},auth:{persistSession:false}});
const admin=createClient(env.SECOND_SUPABASE_URL,env.SECOND_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const buildId=fs.readFileSync('.next/BUILD_ID','utf8');
const buildStat=fs.statSync('.next/BUILD_ID').mtimeMs;
const results: string[]=[];
async function check(name:string, fn:()=>Promise<void>){await fn();results.push(name);console.log(`PASS ${name}`);}
const post=(path:string,body:unknown,bearer=ownerToken)=>fetch(origin+path,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${bearer}`},body:JSON.stringify(body)});
async function version(){const r=await owner.from('trainer_profiles').select('updated_at').eq('id',id).single();assert.ifError(r.error);return r.data!.updated_at;}
async function directory(){const r=await fetch(origin+'/marketplace-data.json');assert.equal(r.status,200);return r.json();}
const event=()=>post('/api/internal/professional-revalidation/',{professionalId:id,eventType:'profile_changed'},env.PROFESSIONAL_REVALIDATION_SECRET);
assert.equal((await event()).status,200); // A clean fixture may replace a previous test tombstone.

await check('restricted view denies anon and authenticated direct access',async()=>{
  const anon=createClient(env.SECOND_SUPABASE_URL,env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  assert.ok((await anon.from('marketplace_public_professionals_v3').select('*')).error);
  assert.ok((await owner.from('marketplace_public_professionals_v3').select('*')).error);
  const outsider=createClient(env.SECOND_SUPABASE_URL,env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY,{global:{headers:{Authorization:`Bearer ${token('authenticated','77777777-7777-4777-8777-777777777777')}`}},auth:{persistSession:false}});
  assert.deepEqual((await outsider.from('trainer_profiles').select('id')).data,[]);
});
await check('production public profile is server rendered from approved Supabase data',async()=>{
  const response=await fetch(origin+'/professionals/runtime-professional/');assert.equal(response.status,200);
  const html=await response.text();assert.ok(html.includes('Published biography for runtime integration testing.'));
  assert.ok(html.includes('application/ld+json'));assert.ok(html.includes('og:title'));
  const payload=JSON.stringify(await directory());
  for(const privateValue of ['runtime-test@example.invalid','credential_number','document_url','profile_photo_storage_path','auth_id','reviewFeedbackPublic','lastSubmittedAt','identityVerificationStatus','22222222-2222-4222-8222-222222222222'])assert.ok(!payload.includes(privateValue));
});
await check('endpoint rejects missing secret, unknown event, and arbitrary purge arguments',async()=>{
  assert.equal((await post('/api/internal/professional-revalidation/',{professionalId:id,eventType:'profile_changed'},'wrong')).status,401);
  for(const body of [{professionalId:id,eventType:'approve'}, {professionalId:id,eventType:'profile_changed',paths:['/']}])assert.equal((await post('/api/internal/professional-revalidation/',body,env.PROFESSIONAL_REVALIDATION_SECRET)).status,400);
});
await check('real availability mutation updates profile and collections without rebuilding',async()=>{
  const staleVersion=await version();
  const response=await post('/api/professional-publication/',{action:'availability',status:'waitlist',version:staleVersion});
  assert.equal(response.status,200,await response.clone().text());
  const saved=await response.json();assert.equal(saved.record.status,'waitlist');assert.equal(saved.propagation,'current');
  assert.equal((await directory()).professionals[0].clientAcceptanceStatus,'waitlist');
  const html=await (await fetch(origin+'/professionals/runtime-professional/')).text();
  assert.ok(html.includes('waitlist') || html.includes('Waitlist') || html.includes('Limited availability'));
  for(const path of ['/','/professionals/personal-training/','/es/professionals/runtime-professional/','/pt-br/professionals/runtime-professional/'])assert.equal((await fetch(origin+path)).status,200,path);
  assert.equal((await post('/api/professional-publication/',{action:'availability',status:'accepting',version:staleVersion})).status,409);
});
await check('duplicate and out-of-order delivery never restores old data or loses a new event',async()=>{
  const response=await event();assert.equal(response.status,200);const first=await response.json();
  assert.equal((await event()).status,200);
  const newer=await post('/api/professional-publication/',{action:'availability',status:'not_accepting',version:await version()});assert.equal(newer.status,200);
  assert.ifError((await admin.rpc('marketplace_ack_publication_event',{p_professional_id:id,p_revision:first.revision})).error);
  const pending=await admin.from('professional_publication_outbox').select('revision,delivered_revision').eq('professional_id',id).single();
  assert.ok(pending.data!.revision>pending.data!.delivered_revision);
  assert.equal((await directory()).professionals[0].clientAcceptanceStatus,'not_accepting');
});
await check('private notes do not invalidate public data, but an admin edit makes the owner version stale',async()=>{
  const before=await version();
  const queue=await admin.from('professional_publication_outbox').select('revision').eq('professional_id',id).single();
  assert.ifError((await admin.from('trainer_profiles').update({internal_notes:'PRIVATE_INTERNAL_NOTE'}).eq('id',id)).error);
  const after=await admin.from('professional_publication_outbox').select('revision').eq('professional_id',id).single();assert.equal(after.data!.revision,queue.data!.revision);
  assert.equal((await post('/api/professional-publication/',{action:'availability',status:'accepting',version:before})).status,409);
  assert.ok(!JSON.stringify(await directory()).includes('PRIVATE_INTERNAL_NOTE'));
});
await check('category and location changes invalidate old and new collections',async()=>{
  assert.ifError((await admin.from('service_categories').insert({id:'88888888-8888-4888-8888-888888888888',slug:'strength_conditioning',public_slug:'strength-conditioning',name:'Strength and Conditioning'})).error);
  assert.ifError((await admin.from('trainer_services').update({service_category_id:'88888888-8888-4888-8888-888888888888'}).eq('trainer_profile_id',id)).error);
  assert.ifError((await admin.from('trainer_locations').update({location_city:'New York',location_state:'NY'}).eq('trainer_profile_id',id)).error);
  assert.equal((await event()).status,200);
  const profile=(await directory()).professionals[0];assert.equal(profile.city,'New York');assert.equal(profile.categories[0].slug,'strength-conditioning');
  const queue=await admin.from('professional_publication_outbox').select('categories,locations').eq('professional_id',id).single();
  assert.ok(queue.data!.categories.includes('personal-training'));assert.ok(queue.data!.categories.includes('strength-conditioning'));
  assert.ok(queue.data!.locations.includes('us-fl-miami'));assert.ok(queue.data!.locations.includes('us-ny-new-york'));
});
await check('clock-driven trust expiration is visible even without a worker or row update',async()=>{
  const expires=new Date(Date.now()+1500).toISOString();
  assert.ifError((await admin.from('professional_identity_checks').insert({trainer_profile_id:id,status:'verified',provider:'local-test',completed_at:new Date().toISOString(),expires_at:expires})).error);
  assert.equal((await directory()).professionals[0].trustSummary.identityVerified,true);
  await new Promise(resolve=>setTimeout(resolve,1600));
  assert.equal((await directory()).professionals[0].trustSummary.identityVerified,false);
});
await check('soft deletion and account deactivation disappear without a delivery worker',async()=>{
  assert.ifError((await admin.from('trainer_profiles').update({deleted_at:new Date().toISOString()}).eq('id',id)).error);
  assert.deepEqual((await directory()).professionals,[]);
  assert.equal((await fetch(origin+'/professionals/runtime-professional/')).status,404);
  assert.ifError((await admin.from('trainer_profiles').update({deleted_at:null}).eq('id',id)).error);
  assert.equal((await directory()).professionals.length,1);
  assert.ifError((await admin.from('users').update({is_active:false}).eq('id','22222222-2222-4222-8222-222222222222')).error);
  assert.deepEqual((await directory()).professionals,[]);
  assert.ifError((await admin.from('users').update({is_active:true}).eq('id','22222222-2222-4222-8222-222222222222')).error);
  assert.equal((await directory()).professionals.length,1);
});
await check('invalid service changes roll back the whole transaction and its event',async()=>{
  const before=await version();
  const response=await post('/api/professional-publication/',{action:'profile',version:before,profile:{profile:{bio:'MUST_ROLL_BACK'},categories:[],services:[{id:'55555555-5555-4555-8555-555555555555',name:'Invalid service',service_mode:'not-a-mode'}],credentials:[],submit:false}});
  assert.equal(response.status,422);assert.equal(await version(),before);
  assert.ok(!JSON.stringify(await directory()).includes('MUST_ROLL_BACK'));
});
await check('stale full-editor saves return a prompt conflict without retrying a transaction',async()=>{
  const response=await post('/api/professional-publication/',{action:'profile',version:'2000-01-01T00:00:00Z',profile:{profile:{bio:'STALE_DRAFT'},categories:[],services:[],credentials:[],submit:false}});
  assert.equal(response.status,409);assert.ok(!JSON.stringify(await directory()).includes('STALE_DRAFT'));
});
await check('database success survives revalidation failure; retry does not write the profile again',async()=>{
  assert.ifError((await admin.rpc('test_publication_read_failure',{enabled:true})).error);
  const before=await version();
  let result;
  try {
    const response=await post('/api/professional-publication/',{action:'availability',status:'accepting',version:before});
    assert.equal(response.status,200);result=await response.json();assert.equal(result.record.status,'accepting');assert.equal(result.propagation,'delayed');
  } finally { assert.ifError((await admin.rpc('test_publication_read_failure',{enabled:false})).error); }
  const committed=await version();assert.notEqual(committed,before);
  const retry=await post('/api/professional-publication/',{action:'retry'});assert.equal(retry.status,200);
  assert.equal((await retry.json()).propagation,'current');assert.equal(await version(),committed);
  assert.equal((await directory()).professionals[0].clientAcceptanceStatus,'accepting');
});
await check('external delivery outage retains the event and the actual worker later acknowledges it',async()=>{
  const failure=await deliverProfessionalPublication(admin,origin,env.PROFESSIONAL_REVALIDATION_SECRET,async()=>new Response(null,{status:503}));
  assert.ok(failure.failed>0);
  const delivered=await deliverProfessionalPublication(admin,origin,env.PROFESSIONAL_REVALIDATION_SECRET);
  assert.equal(delivered.failed,0);
  const row=await admin.from('professional_publication_outbox').select('revision,delivered_revision').eq('professional_id',id).single();
  assert.equal(row.data!.revision,row.data!.delivered_revision);
  assert.equal((await deliverProfessionalPublication(admin,origin,env.PROFESSIONAL_REVALIDATION_SECRET)).processed,0);
});
await check('unapproved biography through atomic editor RPC is absent from HTML, metadata and sitemap',async()=>{
  const response=await post('/api/professional-publication/',{action:'profile',version:await version(),profile:{profile:{bio:'PRIVATE_PENDING_BIOGRAPHY'},categories:[],services:[],credentials:[],submit:false}});
  assert.equal(response.status,200,await response.clone().text());
  const saved=await response.json();assert.equal(saved.record.profile.bio,'PRIVATE_PENDING_BIOGRAPHY');assert.equal(saved.record.profile.profile_live,false);
  assert.deepEqual((await directory()).professionals,[]);
  const profile=await fetch(origin+'/professionals/runtime-professional/');assert.equal(profile.status,404);assert.ok(!(await profile.text()).includes('PRIVATE_PENDING_BIOGRAPHY'));
  assert.ok(!(await (await fetch(origin+'/sitemaps/professionals.xml')).text()).includes('runtime-professional'));
});
await check('external admin publish, slug change, suspension and removal propagate',async()=>{
  const credential=await owner.from('certifications').update({cert_name:'Changed credential claim',is_active:true}).eq('id','66666666-6666-4666-8666-666666666666').select('verification_status,verified_at').single();
  assert.ifError(credential.error);assert.equal(credential.data!.verification_status,'pending');assert.equal(credential.data!.verified_at,null);
  assert.ifError((await admin.from('trainer_profiles').update({bio:'Admin approved biography',profile_live:true,verification_status:'verified',public_slug:'runtime-renamed'}).eq('id',id)).error);
  assert.equal((await event()).status,200);
  assert.equal((await fetch(origin+'/professionals/runtime-renamed/')).status,200);
  assert.equal((await directory()).professionals[0].credentials[0].verificationStatus,'claimed');
  const old=await fetch(origin+'/professionals/runtime-professional/',{redirect:'manual'});assert.equal(old.status,308);assert.ok(old.headers.get('location')?.includes('runtime-renamed'));
  assert.ifError((await admin.from('trainer_profiles').update({reliability_suspended_until:'2099-01-01T00:00:00Z'}).eq('id',id)).error);
  assert.equal((await event()).status,200);assert.deepEqual((await directory()).professionals,[]);
  assert.equal((await fetch(origin+'/professionals/runtime-renamed/')).status,404);
  assert.ifError((await admin.from('trainer_profiles').delete().eq('id',id)).error);
  assert.equal((await event()).status,200);assert.equal((await fetch(origin+'/professionals/runtime-renamed/')).status,404);
});
assert.equal(fs.readFileSync('.next/BUILD_ID','utf8'),buildId);assert.equal(fs.statSync('.next/BUILD_ID').mtimeMs,buildStat);
results.push('BUILD_ID and its timestamp unchanged across every mutation; no build/deploy command exists in this test');
fs.writeFileSync('reports/professional-runtime-integration.json',JSON.stringify({mode:'next start',database:'isolated Supabase Postgres + PostgREST, contract fixture',buildId,results},null,2));
console.log('PASS production-mode runtime integration; no rebuild');
