import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { getPosingMessages } from '../../lib/i18n/posing-messages.ts';
const require=createRequire(import.meta.url);
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const base=process.env.POSING_TEST_ORIGIN || 'http://127.0.0.1:3100';
const output=path.resolve('../.tmp/posing-hardening/browser');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const fixture=name=>JSON.parse(fs.readFileSync(new URL(`../fixtures/posing/${name}.json`,import.meta.url),'utf8'));
const results=[];
// Fetch/React use real browser tasks while timers use the virtual clock. Advance in
// bounded steps so mocked responses can settle before scheduling the next poll.
async function advancePolling(page,milliseconds){for(let elapsed=0;elapsed<milliseconds;elapsed+=5000){await page.clock.runFor(Math.min(5000,milliseconds-elapsed));await page.waitForTimeout(20);}}
const prefix=locale=>locale==='en'?'':locale==='es-419'?'/es':'/pt-br';
function stateFor(locale,status='completed',result=fixture('current'),product='posing_analysis') {return{product,division:"Men's Physique",generationLocale:locale,paymentStatus:'paid',expiresAt:'2099-01-01T00:00:00Z',physique:{included:product==='complete_stage_analysis',status:'paid',canAnalyze:true,retryCount:0,result:null},posing:{included:true,status,canUpload:['paid','failed_retryable'].includes(status),canResume:status==='uploading',retryCount:1,maxRetries:4,result:status==='completed'?result:null,errorCode:null,analysisId:status==='paid'?null:'saved-prompt-0.4',phase:status==='processing'?'analyzing':undefined}};}
function translate(result,locale){
 if(locale==='en')return result;
 const text=locale==='es-419'?'Mantén los hombros relajados. La postura de pies es estable. Reduce la tensión de brazos para presentar mejor los dorsales.':'Mantenha os ombros relaxados. A base dos pés é estável. Reduza a tensão nos braços para apresentar melhor os dorsais.';
 for(const key of ['score_explanation','biggest_opportunity','video_usability_reason','disclaimer'])result[key]=text;
 for(const key of ['overall_strengths','transition_observations','consistency_observations','athlete_next_focus','quality_flags'])result[key]=[text];
 result.highest_priority_corrections=result.highest_priority_corrections.map((c,i)=>({title:(locale==='es-419'?'Corrección ':'Correção ')+(i+1),visible_evidence:text,try_this:(locale==='es-419'?['Relaja los brazos y las manos.','Baja los hombros antes de abrir los dorsales.','Baja ligeramente los codos en la pose de espalda.']:['Relaxe os braços e as mãos.','Abaixe os ombros antes de abrir os dorsais.','Abaixe um pouco os cotovelos na pose de costas.'])[i]}));
 for(const pose of result.poses_detected){pose.strongest_aspect=text;pose.biggest_issue=text;pose.corrections=[text];pose.coaching_cue=text;for(const c of pose.component_scores)c.note=text;}
 return result;
}
async function setup(locale,{status='completed',result=fixture('current'),storage,product='posing_analysis',errorCode,posingError,clock=false}={}){
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(() => localStorage.setItem("elevare_analytics_consent_v1", "declined"));const page=await context.newPage();const errors=[];const calls={status:0,start:0,initialize:0};let state=stateFor(locale,status,result,product);if(posingError)state.posing.errorCode=posingError;let startResult;
 if(storage)await context.addInitScript(kind=>{if(kind==='getter')Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Denied','SecurityError');}});else if(kind==='unavailable')Object.defineProperty(window,'sessionStorage',{value:undefined});else Object.defineProperty(window,'sessionStorage',{value:{getItem(){if(kind==='read')throw new DOMException('Denied','SecurityError');return null;},setItem(){throw new DOMException('Quota','QuotaExceededError');}}});},storage);
 if(clock)await page.clock.install();
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{const url=new URL(route.request().url());
  if(url.pathname==='/api/stage-analysis/status/'){calls.status++;return errorCode?route.fulfill({status:502,json:{code:errorCode,error:'Internal English must not appear'}}):route.fulfill({json:{state}});}
  if(url.pathname==='/api/stage-analysis/posing/start/'){calls.start++;if(startResult)state=startResult;return route.fulfill({json:{state}});}
  if(url.pathname==='/api/stage-analysis/posing/initialize/'){calls.initialize++;return route.fulfill({status:400,json:{code:'upload_incomplete'}});}
  if(url.pathname==='/api/quick-analysis/status/')return route.fulfill({json:{state:{status:'paid',canAnalyze:true,retryCount:0,maxRetries:4,analysisMode:'competition_prep',division:"Men's Physique",generationLocale:locale,paymentStatus:'paid'}}});
  if(url.origin!==base)return route.abort();return route.continue();
 });
 const url=`${base}${prefix(locale)}/stagelab/${product==='complete_stage_analysis'?'complete-stage-analysis':'posing-analysis'}/result/?purchase=confirmed`;
 await page.goto(url,{waitUntil:'domcontentloaded'});if(clock)await page.clock.runFor(100);
 await page.locator('.posing-analysis-report,.posing-video-field,.quick-analysis-state h1').first().waitFor();
 const decline=page.locator('.analytics-consent button').last();if(await decline.isVisible())await decline.click();
 return{page,context,errors,calls,setState:s=>{state=s;},setStartResult:s=>{startResult=s;},getState:()=>state};
}
try{
 for(const locale of ['en','es-419','pt-BR']){
  const x=await setup(locale,{result:translate(fixture('current'),locale)});await x.page.locator('.posing-analysis-report').waitFor();
  for(const width of [320,390,768,1440]){
   await x.page.setViewportSize({width,height:844});
   const metrics=await x.page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,correctionsY:Math.round(document.querySelector('.posing-priority').getBoundingClientRect().top+scrollY),poseY:Math.round(document.querySelector('.posing-breakdown').getBoundingClientRect().top+scrollY),visibleWords:document.querySelector('.posing-analysis-report').innerText.split(/\s+/).length}));
   assert.ok(metrics.scrollWidth<=width,JSON.stringify(metrics));assert.ok(metrics.correctionsY<metrics.poseY);if(width===390)assert.ok(metrics.correctionsY<1100,JSON.stringify(metrics));
   assert.equal(await x.page.locator('.posing-priority article').count(),3);
   assert.equal(await x.page.locator('.posing-video-quality').getAttribute('open'),null);
   assert.doesNotMatch(await x.page.locator('.posing-analysis-report').innerText(),/\d[\d– -]*ms\b|83\/100/);
   results.push({kind:'layout',locale,...metrics});
   if(width===390||width===1440)await x.page.screenshot({path:path.join(output,`result-${locale}-${width}.png`),fullPage:true});
  }
  const m=getPosingMessages(locale);assert.ok((await x.page.locator('.posing-analysis-report').innerText()).includes(m.confidence.high));
  const pose=x.page.locator('.posing-analysis-pose').first();await pose.locator('summary').first().click();assert.equal(await pose.getAttribute('open'),'');await pose.locator('details summary').click();assert.ok(await pose.locator('.posing-analysis-components').isVisible());
  await x.page.locator('.posing-transitions > summary').click();assert.doesNotMatch(await x.page.locator('.posing-transitions').innerText(),/83\/100/);assert.ok((await x.page.locator('.posing-transitions').innerText()).includes(m.frameCoverage));
  await x.page.reload({waitUntil:'domcontentloaded'});await x.page.locator('.posing-analysis-report').waitFor();assert.equal(x.calls.start,0);assert.deepEqual(x.errors,[]);results.push({kind:'completed-reopen',locale,...x.calls});await x.context.close();
 }
 for(const storage of ['getter','read','write','unavailable']){
  const x=await setup('en',{storage});await x.page.locator('.posing-analysis-report').waitFor();assert.deepEqual(x.errors,[]);assert.equal(await x.page.locator('.posing-priority article').count(),3);results.push({kind:'paid-storage-resilience',storage,passed:true});await x.context.close();
 }
 for(const name of ['prior','long','sparse','unusable']){
  const raw=fixture(name==='prior'?'prior':'current');
  if(name==='long'){raw.overall_strengths=['A'.repeat(4000)];raw.highest_priority_corrections[0].title='A'.repeat(4000);raw.highest_priority_corrections[0].try_this='Visible coaching evidence. '.repeat(120);raw.poses_detected[0].coaching_cue='';}
  if(name==='sparse'){raw.poses_detected=[];raw.highest_priority_corrections=[];raw.overall_strengths=[];}
  if(name==='unusable'){raw.video_usability_status='unusable';raw.overall_stage_lab_posing_score=null;raw.analysis_quality='unusable';}
  const x=await setup('en',{result:raw});await x.page.locator('.posing-analysis-report').waitFor();assert.deepEqual(x.errors,[]);assert.doesNotMatch(await x.page.locator('.posing-analysis-report').innerText(),/83\/100|6710|12421/);assert.ok(await x.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));results.push({kind:'canonical-render',name,passed:true});await x.context.close();
 }
 for(const locale of ['en','es-419','pt-BR']){
  const m=getPosingMessages(locale);const x=await setup(locale,{status:'paid'});await x.page.locator('.posing-video-field').waitFor();
  await x.page.locator('input[type=file]').last().setInputFiles({name:'corrupt.mp4',mimeType:'video/mp4',buffer:Buffer.from('not a video')});await x.page.locator('.quick-analysis-check input').check();await x.page.locator('form button[type=submit]').click();
  const error=x.page.locator('.form-feedback.is-error');await error.waitFor();assert.ok((await error.innerText()).includes(m.decodeError));assert.equal(x.calls.initialize,0);results.push({kind:'corrupt-video',locale,passed:true});await x.context.close();
  const failed=await setup(locale,{status:'failed_retryable',posingError:'provider_or_processing_failure'});await failed.page.locator('.form-feedback.is-error').waitFor();assert.ok((await failed.page.locator('.form-feedback.is-error').innerText()).includes(m.genericError));assert.equal(failed.calls.start,0);results.push({kind:'terminal-failure-retry-available',locale,passed:true});await failed.context.close();
  const y=await setup(locale,{errorCode:'stagelab_timeout'});await y.page.getByText(m.slowBody,{exact:false}).waitFor();assert.ok((await y.page.locator('main').innerText()).includes(m.slowBody));assert.doesNotMatch(await y.page.locator('main').innerText(),/Internal English/);results.push({kind:'gateway-error',locale,passed:true});await y.context.close();
 }
 const recovery=await setup('pt-BR',{status:'processing',clock:true});await recovery.page.getByRole('heading',{name:getPosingMessages('pt-BR').analyzing,exact:true}).waitFor();await advancePolling(recovery.page,65000);await recovery.page.getByRole('heading',{name:getPosingMessages('pt-BR').slowTitle,exact:true}).waitFor();
 await recovery.page.reload({waitUntil:'domcontentloaded'});await recovery.page.clock.runFor(100);await recovery.page.getByRole('heading',{name:getPosingMessages('pt-BR').analyzing,exact:true}).waitFor();assert.equal(recovery.calls.start,0);
 recovery.setState(stateFor('pt-BR','completed',translate(fixture('current'),'pt-BR')));await advancePolling(recovery.page,5000);await recovery.page.locator('.posing-analysis-report').waitFor();assert.equal(recovery.calls.start,0);assert.deepEqual(recovery.errors,[]);results.push({kind:'slow-refresh-late-completion',...recovery.calls});await recovery.context.close();
 const focus=await setup('en',{status:'uploading'});focus.setStartResult(stateFor('en','completed'));await focus.page.locator('.quick-analysis-state button').click();await focus.page.locator('.posing-analysis-report').waitFor();assert.equal(await focus.page.evaluate(()=>document.activeElement?.id),'posing-report-heading');assert.equal(focus.calls.start,1);results.push({kind:'explicit-resume-completion-focus',passed:true});await focus.context.close();
 const paused=await setup('en',{status:'processing',clock:true});await paused.page.getByRole('heading',{name:getPosingMessages('en').analyzing,exact:true}).waitFor();await advancePolling(paused.page,660000);await paused.page.getByRole('button',{name:getPosingMessages('en').checkAgain}).waitFor();const count=paused.calls.status;await advancePolling(paused.page,120000);assert.equal(paused.calls.status,count);assert.ok(count>=15&&count<=25,`Unexpected poll count: ${count}`);await paused.page.getByRole('button',{name:getPosingMessages('en').checkAgain}).click();assert.equal(paused.calls.start,0);results.push({kind:'bounded-polling-horizon',statusCalls:count});await paused.context.close();
 const complete=await setup('es-419',{product:'complete_stage_analysis',storage:'getter',result:translate(fixture('current'),'es-419')});await complete.page.locator('.posing-analysis-report').waitFor();assert.equal(complete.calls.start,0);assert.deepEqual(complete.errors,[]);results.push({kind:'complete-stage-posing-component',passed:true});await complete.context.close();
} finally {await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));console.log('Posing browser checks passed: '+results.length);
