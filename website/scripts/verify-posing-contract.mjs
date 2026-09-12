/** Requires STAGELAB_REPO or the sibling StageLab checkout. Never calls live AI. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { parseCanonicalPosingResult, POSING_CONTRACT } from '../lib/posing-contract.ts';
import { POSING_RUNTIME, getPosingFrameTimestamps } from '../lib/posing-runtime.ts';
import { buildPosingPresentation } from '../lib/posing-result-presentation.ts';
import { posingLabel, getPosingMessages } from '../lib/i18n/posing-messages.ts';
const root = path.resolve(process.env.STAGELAB_REPO || '../../Bodybuilding Competition App');
const shared = path.join(root, 'supabase/functions');
const load = file => import(pathToFileURL(path.join(root, file)).href);
const read = file => fs.readFileSync(file, 'utf8');
let checks = 0;
async function check(label, run) { await run(); checks++; console.log('PASS '+label); }
for (const name of ['posing-contract.ts','posing-runtime.ts']) await check('shared byte parity: '+name, () => assert.equal(read(path.join(shared,'_shared',name)),read(path.resolve('lib',name))));
const producer = await load('supabase/functions/analyze-posing-video/posing-result.ts');
const rubrics = await load('supabase/functions/analyze-posing-video/posing-rubrics.ts');
const provider = await load('supabase/functions/analyze-posing-video/posing-provider.ts');
const contract = await load('contracts/posing-analysis-v1.ts');
await check('website / provider / portable contract versions', () => {
 for (const source of [provider,contract]) {
  assert.equal(source.POSING_ANALYSIS_SCHEMA_VERSION,POSING_CONTRACT.schemaVersion);
  assert.equal(source.POSING_ANALYSIS_PROMPT_VERSION,POSING_CONTRACT.promptVersion);
  assert.equal(source.POSING_ANALYSIS_RUBRIC_VERSION,POSING_CONTRACT.rubricVersion);
 }
 assert.equal(provider.POSING_ANALYSIS_PROVIDER_VERSION,POSING_CONTRACT.providerVersion);
});
for (const locale of ['en','es-419','pt-BR']) await check('all canonical labels localized: '+locale, () => {
 for(const pose of contract.POSING_POSE_NAMES) if(pose!=='Unknown Pose') assert.notEqual(posingLabel(pose,locale,'pose'),getPosingMessages(locale).unknownPose,pose);
 for(const component of contract.POSING_COMPONENT_NAMES) assert.notEqual(posingLabel(component,locale,'component'),getPosingMessages(locale).unknownComponent,component);
});
for (const name of ['current','prior']) await check('shared fixture parity: '+name,()=>assert.equal(read(path.join(root,'contracts/fixtures/posing-analysis-v1-'+name+'.json')),read(path.resolve('tests/fixtures/posing',name+'.json'))));
const fixture = (name='current') => JSON.parse(read(path.resolve('tests/fixtures/posing',name+'.json')));
const rubric = rubrics.resolvePosingRubric('mens_physique');
for (const name of ['prior','current']) for (const scenario of ['unchanged','empty','missing','long','unusable','unknown','localized']) await check(name+' producer-to-website '+scenario, () => {
 const raw = fixture(name);
 if(scenario==='empty')raw.poses_detected[0].coaching_cue='';
 if(scenario==='missing')delete raw.poses_detected[0].coaching_cue;
 if(scenario==='long'){raw.overall_strengths=['A'.repeat(4000)];raw.highest_priority_corrections=[{title:'A'.repeat(4000),visible_evidence:'B'.repeat(4000),try_this:'C'.repeat(4000)}];}
 if(scenario==='unusable')raw.video_usability_status='unusable';
 if(scenario==='unknown')raw.poses_detected[0].pose_name='Ambiguous angle';
 if(scenario==='localized')raw.score_explanation='Relaja los hombros. Mantenha os braços relaxados.';
 const canonical=producer.normalizePosingAnalysisResult({rawResult:raw,analysisId:raw.analysis_id,schemaVersion:POSING_CONTRACT.schemaVersion,division:rubric.displayName,locale:'en',rubric,frames:getPosingFrameTimestamps(22).map(timestampMs=>({timestampMs})),videoDurationSeconds:22});
 const result=parseCanonicalPosingResult(canonical); assert.ok(buildPosingPresentation(result,'en').summary);
 for(const pose of canonical.poses_detected)if(pose.pose_name==='Transition'||pose.pose_name==='Unknown Pose')assert.equal(pose.pose_score,null);
 if(scenario==='long')assert.equal(result.overall_strengths[0].length,4000);
});
function gateway(admin={}, overrides={}) {
 const file=path.join(shared,'elevare-posing-analysis/index.ts');
 const modules={
  'npm:@supabase/supabase-js@2':{createClient:()=>admin},'node:crypto':crypto,
  '../_shared/elevare-hmac.ts':{},'../_shared/posing-runtime.ts':{POSING_RUNTIME},'../_shared/posing-telemetry.ts':{},
  '../analyze-posing-video/posing-provider.ts':provider,'../analyze-posing-video/content-hash.ts':{},
  '../analyze-posing-video/posing-result.ts':producer,'../analyze-posing-video/posing-rubrics.ts':rubrics,
 };
 const appendix='\nexports.normalize = normalizeManifests; exports.start = startAnalysis; exports.status = getAnalysisResponse;\nexports.override = (v) => { if(v.loadOrder)loadOrder=v.loadOrder; if(v.loadAnalysis)loadAnalysis=v.loadAnalysis; if(v.process)processReservedWebsitePosingAnalysis=v.process; };';
 const output=ts.transpileModule(read(file)+appendix,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(output,{exports,require:name=>{assert.ok(name in modules,name);return modules[name];},console,Date,URL,Response,Headers,TextEncoder,Buffer,setTimeout,clearTimeout,Deno:{env:{get:()=> 'offline-fixture'},serve:()=>{}},EdgeRuntime:{waitUntil:promise=>overrides.wait?.(promise)}},{filename:file});
 exports.override(overrides); return exports;
}
const gatewayManifest=gateway();
for(const duration of [5,5.1,5.5,5.51,5.52,5.9,6,10,45,5.0000000001,5.51999999999])await check('actual gateway accepts '+duration+'s generated frames',()=>{
 const manifest={video:{file_name:'fixture.mp4',mime_type:'video/mp4',size_bytes:1000,duration_seconds:duration},frames:getPosingFrameTimestamps(duration).map((timestamp_ms,index)=>({index,timestamp_ms,mime_type:'image/jpeg',size_bytes:100,width:720,height:1280}))};
 assert.equal(gatewayManifest.normalize(manifest).error,undefined);
 const beyond=structuredClone(manifest);beyond.frames.at(-1).timestamp_ms=Math.ceil(duration*1000);assert.equal(gatewayManifest.normalize(beyond).error,'invalid_frames');
});
await check('actual gateway background reservation, concurrent start and lost response recovery',async()=>{
 let analysis=null, workerCalls=0, reservations=0, finish; const background=[];
 const order={id:'order',payment_status:'paid',product:'posing_analysis',authorization_expires_at:new Date(Date.now()+86400000).toISOString()};
 const session={id:'session',order_id:'order',client_request_id:'request-12345678',status:'initialized',analysis_id:null,expires_at:order.authorization_expires_at,video_manifest:{size_bytes:1000,mime_type:'video/mp4'},object_paths:{video_path:'website/order/session/video.mp4',frames:[]}};
 const admin={from:()=>{const filters=[];const q={select:()=>q,eq:(key,value)=>{filters.push([key,value]);return q;},maybeSingle:async()=>({data:filters.every(([k,v])=>session[k]===v)?structuredClone(session):null,error:null})};return q;},rpc:async(name)=>{
  assert.equal(name,'reserve_elevare_posing_analysis');reservations++;
  if(analysis)return{data:{outcome:'processing',analysis:structuredClone(analysis)},error:null};
  analysis={id:'analysis',status:'uploaded',elevare_order_id:'order'};session.analysis_id='analysis';return{data:{outcome:'reserved',analysis:structuredClone(analysis)},error:null};
 }};
 const g=gateway(admin,{loadOrder:async id=>id==='external'?order:null,loadAnalysis:async(id,analysisId)=>id==='order'&&analysisId==='analysis'?analysis:null,
  process:()=>{workerCalls++;return new Promise(resolve=>{finish=()=>{analysis={...analysis,status:'complete',structured_result:fixture(),completed_at:new Date().toISOString()};order.posing_consumed_at=new Date().toISOString();resolve(Response.json({}));};});},wait:promise=>background.push(promise)});
 const body={external_order_id:'external',upload_session_id:'session',idempotency_key:session.client_request_id,background:true};
 const responses=await Promise.all([g.start(body,'en'),g.start(body,'en')]); assert.equal(responses[0].status,202);
 assert.equal((await responses[0].json()).analysis_id,'analysis'); assert.equal(workerCalls,1);assert.ok(reservations>=1);
 assert.equal((await (await g.status(body,'en',false)).json()).analysis_id,'analysis'); assert.equal(workerCalls,1);
 finish();await Promise.all(background);assert.equal((await (await g.status(body,'en',false)).json()).status,'complete');
 await g.start(body,'en');assert.equal(workerCalls,1);
 assert.equal((await g.status({...body,external_order_id:'other'},'en',false)).status,404);
});
const originalFetch=globalThis.fetch, originalDeno=globalThis.Deno; globalThis.Deno={env:{get:()=>undefined}};
try {
 const input={analysisId:'fixture',division:rubric.displayName,locale:'es-419',sourceType:'uploaded_video',videoDurationSeconds:5,rubric,frames:getPosingFrameTimestamps(5).map(timestampMs=>({timestampMs,path:'private-frame',signedUrl:'https://invalid.example/frame'}))};
 for(const scenario of ['success','http_error','malformed_result','incomplete','timeout','aborted','accounting_failure'])await check('provider budget / usage: '+scenario,async()=>{
  let sent, event;const abort=new AbortController();
  globalThis.fetch=async(_url,options)=>{
   sent=JSON.parse(options.body);
   if(scenario==='timeout'||scenario==='aborted')return await new Promise((_resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));if(scenario==='aborted')setTimeout(()=>abort.abort(),10);});
   const payload={status:scenario==='incomplete'?'incomplete':'completed',usage:{input_tokens:200,output_tokens:300,input_tokens_details:{cached_tokens:0}},output_text:scenario==='malformed_result'?'not JSON':JSON.stringify(fixture())};
   return Response.json(payload,{status:scenario==='http_error'?429:200});
  };
  const p=provider.createOpenAiPosingAnalysisProvider({apiKey:'offline-only',model:'gpt-5.6-terra',timeoutMs:1000,signal:abort.signal,onTelemetry:e=>{event=e;if(scenario==='accounting_failure')throw new Error('Telemetry unavailable');}});
  if(['success','accounting_failure'].includes(scenario))assert.ok((await p.analyze(input)).result);else await assert.rejects(p.analyze(input));
  assert.equal(sent.max_output_tokens,12000);assert.equal(sent.store,false);
  assert.equal(sent.input[0].content.filter(c=>c.type==='input_image').length,4); assert.ok(sent.input[0].content.filter(c=>c.type==='input_image').every(c=>c.detail==='low'));
  assert.equal(event.outcome,scenario==='accounting_failure'?'success':scenario); assert.equal(event.usageKnown,!['timeout','aborted'].includes(scenario));
  if(event.usageKnown)assert.equal(event.usage.outputTokens,300);else assert.equal(event.usage,null);
 });
} finally {globalThis.fetch=originalFetch;globalThis.Deno=originalDeno;}
console.log('Shared posing verification: '+checks+' checks passed; no network or AI calls.');
