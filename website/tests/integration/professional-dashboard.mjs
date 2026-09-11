import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { token, testEnvironment as env } from './local-environment.mjs';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON ?? 'C:/Users/markl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const id='11111111-1111-4111-8111-111111111111';
const authId='33333333-3333-4333-8333-333333333333';
const admin=createClient(env.SECOND_SUPABASE_URL,env.SECOND_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(({accessToken,authId})=>{
  localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:accessToken,token_type:'bearer',refresh_token:'local-fixture-only',expires_at:Math.floor(Date.now()/1000)+86400,expires_in:86400,user:{id:authId,aud:'authenticated',role:'authenticated',email:'runtime-test@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()}}));
  localStorage.setItem('elevare_analytics_consent_v1','declined');
},{accessToken:token('authenticated',authId),authId});
const page=await context.newPage();
const requests=[];
page.on('request',r=>{if(r.url().includes('/rest/v1/')||r.url().includes('/api/professional-publication/'))requests.push(['request',new URL(r.url()).pathname]);});
page.on('response',r=>{if(r.url().includes('/rest/v1/')||r.url().includes('/api/professional-publication/'))requests.push(['response',new URL(r.url()).pathname,r.status()]);});
let summaryRequests=0;
// Auxiliary analytics tables are outside this contract fixture. Only their
// empty summaries are stubbed; profile reads, auth JWT/RLS and mutations are real.
await page.route('**/rest/v1/rpc/marketplace_get_professional_retention_summary',async route=>{
  summaryRequests++;
  const {data:p,error}=await admin.from('trainer_profiles').select('client_acceptance_status,updated_at,profile_live').eq('id',id).single();assert.ifError(error);
  await route.fulfill({json:{range_days:30,profile_status:'approved',is_live:p.profile_live,acceptance_status:p.client_acceptance_status,profile_updated_at:p.updated_at,profile_confirmed_at:null,views_in_range:0,views_all_time:0,current_saves:0,requests_in_range:0,requests_all_time:0,requests_awaiting_response:0,requests_new:0,response_lookback_days:30,response_sample_size:0,response_rate_percent:null,median_first_response_minutes:null}});
});
for(const table of ['saved_trainer_profiles','trainer_profile_inquiries','client_profiles','professional_profile_view_counts'])await page.route(`**/rest/v1/${table}?**`,route=>route.fulfill({json:[]}));
try {
  await page.goto('http://127.0.0.1:3100/account/');
  const select=page.locator('#professional-availability');await select.waitFor({state:'visible',timeout:20000});
  let documentNavigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())documentNavigations++;});
  const initialSummaryRequests=summaryRequests;
  const save=page.waitForResponse(r=>r.url().includes('/api/professional-publication/')&&r.request().method()==='POST');
  await select.selectOption('waitlist');assert.equal((await save).status(),200);
  await page.waitForFunction(()=>document.querySelector('#professional-availability')?.value==='waitlist');
  assert.equal(summaryRequests,initialSummaryRequests);assert.equal(documentNavigations,0);
  assert.equal((await admin.from('trainer_profiles').select('client_acceptance_status').eq('id',id).single()).data.client_acceptance_status,'waitlist');
  assert.ifError((await admin.from('trainer_profiles').update({client_acceptance_status:'accepting'}).eq('id',id)).error);
  const conflict=page.waitForResponse(r=>r.url().includes('/api/professional-publication/'));
  await select.selectOption('not_accepting');assert.equal((await conflict).status(),409);
  await page.getByRole('button',{name:'Reload current profile',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#professional-availability')?.value==='accepting');
  assert.ifError((await admin.rpc('test_publication_read_failure',{enabled:true})).error);
  const delayed=page.waitForResponse(r=>r.url().includes('/api/professional-publication/'));
  await select.selectOption('waitlist');assert.equal((await delayed).status(),200);
  await page.getByRole('button',{name:'Retry public update',exact:true}).waitFor();
  const committed=(await admin.from('trainer_profiles').select('updated_at').eq('id',id).single()).data.updated_at;
  assert.ifError((await admin.rpc('test_publication_read_failure',{enabled:false})).error);
  await page.getByRole('button',{name:'Retry public update',exact:true}).click();
  await page.getByText('Public information is up to date.',{exact:true}).waitFor();
  assert.equal((await admin.from('trainer_profiles').select('updated_at').eq('id',id).single()).data.updated_at,committed);
  assert.ok(await page.locator('[role="status"][aria-live="polite"]').count()>0);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'reports/professional-dashboard-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await select.focus();assert.equal(await select.evaluate(el=>el===document.activeElement),true);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'reports/professional-dashboard-mobile.png',fullPage:true});
  // Exercise the complete draft editor as well as the immediate section above.
  await admin.from('trainer_profiles').update({verification_status:'pending',profile_live:false}).eq('id',id);
  await page.goto('http://127.0.0.1:3100/account/professional-profile/');
  const bio=page.locator('#profile-field-bio textarea');
  await bio.waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#profile-field-bio textarea')?.value==='Published biography for runtime integration testing.');
  await bio.fill('  Server-confirmed draft from the browser editor.  ');
  await page.waitForFunction(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;});
  const draftResponse=page.waitForResponse(r=>r.url().includes('/api/professional-publication/'));
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  const draft=await draftResponse;assert.equal(draft.status(),200,await draft.text());
  const savedDraft=await draft.json();assert.equal(savedDraft.record.profile.bio,'Server-confirmed draft from the browser editor.');
  await page.waitForFunction(()=>document.querySelector('#profile-field-bio textarea')?.value==='Server-confirmed draft from the browser editor.');
  assert.equal(savedDraft.record.profile.profile_live,false);
  await page.waitForFunction(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return !event.defaultPrevented;});
  assert.ok(!(await (await fetch('http://127.0.0.1:3100/marketplace-data.json')).text()).includes('Server-confirmed draft'));
  await bio.fill('Unsaved edit in a stale browser tab');
  assert.ifError((await admin.from('trainer_profiles').update({internal_notes:'Concurrent admin edit'}).eq('id',id)).error);
  const editorConflict=page.waitForResponse(r=>r.url().includes('/api/professional-publication/'));
  await page.getByRole('button',{name:'Save draft',exact:true}).click();assert.equal((await editorConflict).status(),409);
  await page.getByRole('button',{name:'Reload current profile',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#profile-field-bio textarea')?.value==='Server-confirmed draft from the browser editor.');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  fs.writeFileSync('reports/professional-dashboard-browser.json',JSON.stringify({result:'PASS',browser:'Chromium',viewports:['1440x1000','390x844'],checks:['server-confirmed availability without document reload','no full dashboard refetch','conflict reload','save success with propagation failure','retry without duplicate write','aria-live status','keyboard focus','no mobile horizontal overflow','full editor server-confirmed trimmed draft','unsaved warning set and cleared after commit','draft absent from public JSON','full editor HTTP 409 and reload'],auxiliaryFixture:'analytics summaries only; all profile mutations use the real local API and PostgREST'},null,2));
  console.log('PASS browser dashboard and full editor: confirmed save, pending draft, unsaved warning, conflict, retry, desktop/mobile accessibility');
} catch(error) {
  console.error(requests.slice(-30));
  console.error((await page.locator('main').innerText()).slice(-6000));
  throw error;
} finally {
  await admin.rpc('test_publication_read_failure',{enabled:false});
  await browser.close();
}
