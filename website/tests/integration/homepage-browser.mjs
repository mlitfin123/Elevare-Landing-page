import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { token } from './local-environment.mjs';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON ?? 'C:/Users/markl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const origin = 'http://127.0.0.1:3100';
const results = [], forbiddenRequests = [], errors = [];
const products = [['physique_analysis','quick-analysis','$0.99 USD'],['posing_analysis','posing-analysis','$0.99 USD'],['complete_stage_analysis','complete-stage-analysis','$1.49 USD']];
async function contextFor(width, signedIn = false) {
  const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(!['127.0.0.1','localhost'].includes(url.hostname)) return route.abort();
    if(/\/api\/.*(?:checkout|analyze|initialize|start|webhook)/.test(url.pathname)||/submit_concierge|create_inquiry|send_notification/.test(url.pathname)){
      forbiddenRequests.push(url.pathname); return route.abort();
    }
    return route.continue();
  });
  await context.addInitScript(({signedIn,accessToken})=>{
    localStorage.setItem('elevare_analytics_consent_v1','declined');
    window.__events=[];
    window.gtag=(...args)=>{if(args[0]==='event')window.__events.push({name:args[1],params:args[2]});};
    if(signedIn)localStorage.setItem('sb-127-auth-token',JSON.stringify({
      access_token:accessToken,refresh_token:'local-fixture-only',expires_at:Math.floor(Date.now()/1000)+86400,token_type:'bearer',expires_in:86400,
      user:{id:'33333333-3333-4333-8333-333333333333',aud:'authenticated',role:'authenticated',email:'runtime-test@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}
    }));
  },{signedIn,accessToken:token('authenticated','33333333-3333-4333-8333-333333333333')});
  return context;
}
async function ready(page,path){
  const response=await page.goto(origin+path);
  assert.equal(response.status(),200,path);
  await page.locator('h1').first().waitFor();
  await page.evaluate(()=>document.fonts.ready);
}
async function noOverflow(page,label){
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,outside:[...document.querySelectorAll('main *')].filter(el=>{
    const r=el.getBoundingClientRect();return r.width&&(r.right>innerWidth+1||r.left< -1);
  }).map(el=>el.tagName+'.'+el.className).slice(0,8)}));
  assert.ok(overflow.scroll<=overflow.width+1&&!overflow.outside.length,label+': '+JSON.stringify(overflow));
}
try{
  for(const[prefix,lang]of[['','en'],['/es','es-419'],['/pt-br','pt-BR']]){
    for(const width of[320,390,768,1440]){
      const context=await contextFor(width),page=await context.newPage();
      page.on('pageerror',error=>errors.push(error.message));
      await ready(page,prefix+'/');
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
      assert.equal(await page.locator('h1').count(),1);
      assert.equal(await page.locator('.professional-card,.professional-grid,.marketplace-category-list').count(),0);
      const sections=await page.locator('.home-page > section').evaluateAll(nodes=>nodes.map(n=>n.className));
      assert.equal(sections.length,7);
      assert.ok(sections[0].includes('home-hero')&&sections[1].includes('home-support')&&sections[2].includes('stage-analysis-products'));
      assert.equal(await page.locator('.home-hero .btn-primary').getAttribute('href'),prefix+'/professionals/#guided-matching');
      assert.equal(await page.locator('.home-hero .button-secondary').getAttribute('href'),prefix+'/calculators/');
      for(const[id,slug,price]of products){
        const card=page.locator('[data-analysis-product="'+id+'"]');
        assert.equal(await card.count(),1);assert.ok((await card.innerText()).includes(price));
        assert.equal(await card.locator('a').getAttribute('href'),prefix+'/stagelab/'+slug+'/?source=home-analyses');
      }
      assert.ok((await page.locator('.analysis-savings').innerText()).includes('$0.49 USD'));
      const cards=await page.locator('.stage-analysis-product-card').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));
      if(width===1440)assert.equal(new Set(cards.map(c=>c.y)).size,1);
      if(width<=390)assert.equal(new Set(cards.map(c=>c.x)).size,1);
      assert.equal(await page.locator('.home-resource-grid a').count(),4);
      await noOverflow(page,lang+' '+width+' homepage');
      if((lang==='en'&&[320,1440].includes(width))||(lang==='es-419'&&width===390)||(lang==='pt-BR'&&width===768)){
        for (const image of await page.locator('.home-app-visual img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(img => img.complete ? undefined : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }));
          assert.ok(await image.evaluate(img => img.naturalWidth > 0));
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({path:'../.tmp/homepage-'+lang+'-'+width+'.png',fullPage:true});
      }
      if (lang === 'en' && width === 1440) {
        await page.locator('.stage-analysis-product-grid').scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        await page.locator('.home-hero').scrollIntoViewIfNeeded();
        await page.locator('.stage-analysis-product-grid').scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        const views = await page.evaluate(() => window.__events.filter(e => e.name === 'stage_analysis_product_view'));
        assert.equal(views.length, 3);
        assert.ok(views.every(e => e.params.source === 'home-analyses'));
      }
      if(width<1201){
        const menu=page.locator('.header-menu-toggle');await menu.focus();await page.keyboard.press('Enter');
        assert.equal(await menu.getAttribute('aria-expanded'),'true');
      }
      const summaries=page.locator('header summary');
      await summaries.nth(0).focus();await page.keyboard.press('Enter');
      assert.equal(await summaries.nth(0).evaluate(el=>el.parentElement.open),true);
      await page.keyboard.press('Escape');
      assert.equal(await summaries.nth(0).evaluate(el=>el.parentElement.open),false);
      await summaries.nth(2).click();
      assert.equal(await page.locator('header .nav-shop-dropdown a').count(),5);
      await noOverflow(page,lang+' '+width+' menu');
      await page.locator('header .nav-shop-dropdown a').nth(2).click();
      await page.waitForURL(origin+prefix+'/stagelab/posing-analysis/?source=navigation');
      const click = await page.evaluate(() => window.__events.find(e => e.name === 'stage_analysis_product_selected' && e.params.source === 'navigation'));
      assert.equal(click?.params.analysis_product, 'posing_analysis');
      assert.equal(await page.locator('.analysis-example').count(),1);
      await page.locator('.analysis-example summary').click();
      assert.ok(await page.locator('.analysis-example dl').isVisible());
      results.push(lang+' '+width+': section order, cards/prices/savings, locale links, responsive layout, keyboard/menu navigation');
      await context.close();
    }
  }
  {
    const context=await contextFor(390),page=await context.newPage();await ready(page,'/shop/');
    assert.equal(await page.locator('[data-analysis-product]').count(),3);
    assert.ok((await page.locator('#physical-products').innerText()).includes('Show Day Kit'));
    assert.ok((await page.locator('#physical-products').innerText()).toLowerCase().includes('coming soon'));
    assert.equal(await page.locator('#physical-products button').count(),0);await noOverflow(page,'Shop');
    await page.screenshot({path:'../.tmp/homepage-shop-390.png',fullPage:true});
    for(const[id,slug]of products)assert.equal(await page.locator('[data-analysis-product="'+id+'"] a').getAttribute('href'),'/stagelab/'+slug+'/?source=shop-digital');
    results.push('Shop: three direct digital products; physical Show Day Kit remains Coming Soon with no checkout');await context.close();
  }
  for(const prefix of['','/es','/pt-br']){
    const context=await contextFor(320),page=await context.newPage();
    for(const[,slug]of products){
      await ready(page,prefix+'/stagelab/'+slug+'/?source=shop-digital');
      await page.locator('.analysis-example summary').click();
      assert.ok((await page.locator('.analysis-example').innerText()).toLowerCase().match(/fictional|fictici|fictíci/));
      assert.equal(await page.locator('.analysis-example dl').count(),slug==='complete-stage-analysis'?2:1);
      if (prefix) assert.equal(await page.locator('.container > .panel[role="status"]').count(), 1, 'Explicit English report fallback');
      await noOverflow(page,prefix+'/'+slug);
    }
    await page.screenshot({path:'../.tmp/homepage-example-'+(prefix.slice(1)||'en')+'-320.png',fullPage:true});
    results.push((prefix||'en')+': all fictional report excerpts, separate bundle assessments, no purchase on navigation');await context.close();
  }
  {
    const context = await contextFor(390), page = await context.newPage();
    for (const [slug, expected] of [
      ['bodybuilding-prep-tracking-basics', 'quick-analysis'],
      ['mens-physique-classic-physique-prep-6-weeks-out', 'quick-analysis'],
      ['mens-physique-classic-physique-prep-4-weeks-out', 'complete-stage-analysis'],
      ['losing-muscle-faster-than-fat', null],
      ['how-much-protein-do-i-need', null],
    ]) {
      await ready(page, '/blog/' + slug + '/');
      assert.equal(await page.locator('.contextual-analysis').count(), expected ? 1 : 0);
      if (expected) assert.ok((await page.locator('.contextual-analysis a').getAttribute('href')).startsWith('/stagelab/' + expected + '/?source=prep-'));
      await noOverflow(page, slug);
    }
    results.push('Editorial mappings: three selected articles have one direct analysis CTA; excluded prep/nutrition articles have none');
    await context.close();
  }
  {
    const context=await contextFor(390),page=await context.newPage();await ready(page,'/professionals/#guided-matching');
    await page.locator('#guided-matching form select').first().waitFor({state:'visible'});
    assert.ok(await page.locator('.professional-card').count()>0,'Ordinary directory should retain fixture visibility');
    await noOverflow(page,'guided form');
    results.push('Guided matching opens the existing intake before sign-in; fixture professional remains in ordinary directory');await context.close();
  }
  {
    const context=await contextFor(390,true),page=await context.newPage();await ready(page,'/es/account/');
    await page.locator('.header-menu-toggle').click();
    await page.waitForFunction(()=>document.querySelector('header a.button-link')?.getAttribute('href')==='/es/account/');
    results.push('Authenticated account shell: shared mobile menu, account destination, locale preserved');await context.close();
  }
  for(const[product,slug]of products){
    for(const paymentStatus of['unpaid','paid']){
      const context=await contextFor(390),page=await context.newPage();
      const quickState={product,analysisMode:'physique_check',generationLocale:'en',paymentStatus,analysisStatus:paymentStatus==='paid'?'paid':'checkout_created',canAnalyze:false,retryCount:0,maxRetries:3,expiresAt:null,result:null};
      const stageState={product,division:"Men's Physique",generationLocale:'en',paymentStatus,expiresAt:null,physique:{included:slug==='complete-stage-analysis',status:'paid',canAnalyze:false,retryCount:0,result:null},posing:{included:true,status:'paid',canUpload:false,canResume:false,retryCount:0,maxRetries:3,result:null,errorCode:null}};
      await page.route('**/api/quick-analysis/status/',route=>route.fulfill({json:{state:quickState}}));
      await page.route('**/api/stage-analysis/status/',route=>route.fulfill({json:{state:stageState}}));
      await ready(page,'/stagelab/'+slug+'/result/?purchase=confirmed&source=shop-digital');
      await page.locator('.quick-analysis-state h1').first().waitFor();await page.waitForTimeout(200);
      const purchases=await page.evaluate(()=>window.__events.filter(e=>/purchase/.test(e.name)));
      assert.equal(purchases.length,paymentStatus==='paid'?1:0,slug+' '+paymentStatus);
      if(paymentStatus==='paid'){
        assert.equal(purchases[0].params.source,'shop-digital');
        assert.ok(!JSON.stringify(purchases).match(/session_id|token|email|optional_context/));
        await page.reload();await page.locator('.quick-analysis-state h1').first().waitFor();await page.waitForTimeout(100);
        assert.equal(await page.evaluate(()=>window.__events.filter(e=>/purchase/.test(e.name)).length),0);
      }
      results.push(slug+' '+paymentStatus+': paid-state guard, purchase attribution and reload dedup');await context.close();
    }
  }
  assert.deepEqual(forbiddenRequests,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync('reports/homepage-browser.json',JSON.stringify({result:'PASS',browser:'Chromium',productionChanges:0,realPurchases:0,checkoutRequests:0,results},null,2)+'\n');
  console.log(JSON.stringify({result:'PASS',checks:results.length,results},null,2));
}finally{await browser.close();}
