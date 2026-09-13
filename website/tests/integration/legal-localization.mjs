import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const origin=process.env.LEGAL_TEST_ORIGIN||'http://127.0.0.1:3100';
const output=path.resolve('../.tmp/legal-localization/browser');fs.mkdirSync(output,{recursive:true});
const documents=['stagelab-legal','stagelab-privacy-policy','terms-of-service','privacy-policy'];
const locales={en:'','es-419':'/es','pt-BR':'/pt-br'};
const results=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [locale,prefix] of Object.entries(locales)){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  for(const document of documents){
   const response=await page.goto(`${origin}${prefix}/${document}/`,{waitUntil:'load'});assert.equal(response.status(),200);
   assert.equal(response.headers()['content-language'],locale);
   assert.equal(await page.locator('html').getAttribute('lang'),locale);
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('.legal-languages a').count(),3);
   assert.equal(await page.locator('.legal-languages a[aria-current=page]').getAttribute('hreflang'),locale);
   assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),`https://www.elevarefit.com${prefix}/${document}/`);
   assert.equal(await page.locator('link[rel=alternate][hreflang]').count(),4);
   assert.ok(await page.locator('main').innerText());
   for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${locale}/${document} overflow at ${width}`);
    results.push({kind:'document-layout',locale,document,width,passed:true});
    if(width===390&&locale!=='en')await page.screenshot({path:path.join(output,`${document}-${locale}.png`)});
   }
   assert.ok(await page.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)),`${document} missing image`);
   if(document==='terms-of-service')assert.ok((await page.locator('main').innerText()).includes('$0.99 USD'));
   if(document==='privacy-policy')assert.ok((await page.locator('main').innerText()).includes('72 horas')||locale==='en');
   const alias=await context.request.get(`${origin}${prefix}/${document}.html`,{maxRedirects:0});assert.equal(alias.status(),308);assert.equal(alias.headers().location,`${prefix}/${document}/`);
   results.push({kind:'legacy-alias',locale,document,passed:true});
  }
  await page.goto(`${origin}${prefix}/privacy-policy/`);
  const target=locale==='pt-BR'?'en':'pt-BR';await page.locator(`.legal-languages a[hreflang="${target}"]`).click();await page.waitForURL(`${origin}${locales[target]}/privacy-policy/`);
  assert.equal(await page.evaluate(()=>localStorage.getItem('elevare.locale')),target);
  assert.equal((await context.cookies()).find(cookie=>cookie.name==='elevare_locale')?.value,target);
  assert.deepEqual(errors,[]);results.push({kind:'language-switch',locale,passed:true});await context.close();
 }
 const denied=await browser.newContext();await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}});});
 const page=await denied.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`${origin}/terms-of-service/`);await page.locator('.legal-languages a[hreflang="es-419"]').click();await page.waitForURL(`${origin}/es/terms-of-service/`);assert.deepEqual(errors,[]);results.push({kind:'storage-denial-navigation',passed:true});await denied.close();
 const site=await browser.newContext();await site.addInitScript(()=>localStorage.setItem('elevare_analytics_consent_v1','declined'));const shell=await site.newPage();
 await site.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 for(const [locale,prefix] of Object.entries(locales)){
  await shell.goto(`${origin}${prefix}/`);const privacy=shell.locator(`.site-footer .footer-links > a[href="${prefix}/privacy-policy/"]`);await privacy.waitFor();assert.doesNotMatch(await privacy.innerText(),/\(en inglés\)|\(em inglês\)/);await privacy.click();await shell.waitForURL(`${origin}${prefix}/privacy-policy/`);assert.equal(await shell.locator('html').getAttribute('lang'),locale);results.push({kind:'site-footer-navigation',locale,passed:true});
 }await site.close();
}finally{await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));}
console.log(`Legal browser checks passed: ${results.length}`);
