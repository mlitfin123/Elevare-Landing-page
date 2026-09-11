import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON ?? 'C:/Users/markl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const origin = process.env.METHODOLOGY_TEST_ORIGIN || 'http://127.0.0.1:3100';
const output = '../.tmp/stagelab-methodology';
// Hide the fixed navigation only during cropped captures so it does not cover the section.
const screenshotStyle = '.site-header { visibility: hidden !important; }';
fs.mkdirSync(output, { recursive: true });
const checks = [], errors = [], unexpectedApiRequests = [];
const locales = [
  { prefix: '', locale: 'en', heading: 'How StageLab Makes Decisions', maintenance: 'How StageLab Estimates Maintenance', weekly: 'A repeatable weekly review.' },
  { prefix: '/es', locale: 'es-419', heading: 'Cómo toma decisiones StageLab', maintenance: 'Cómo estima StageLab las calorías de mantenimiento' },
  { prefix: '/pt-br', locale: 'pt-BR', heading: 'Como a StageLab toma decisões', maintenance: 'Como a StageLab estima as calorias de manutenção' },
];

async function makeContext(javaScriptEnabled) {
  const context = await browser.newContext({ javaScriptEnabled, reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname.startsWith('/api/')) {
      unexpectedApiRequests.push(url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  if (javaScriptEnabled) await context.addInitScript(() => {
    try { localStorage.setItem('elevare_analytics_consent_v1', 'declined'); } catch { /* External sandboxed frames have no storage. */ }
  });
  return context;
}

try {
  for (const variant of locales) {
    const context = await makeContext(false);
    const page = await context.newPage();
    const response = await page.goto(`${origin}${variant.prefix}/stagelab/`);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('html').getAttribute('lang'), variant.locale);
    const section = page.locator('#methodology');
    assert.equal(await section.locator('h2').innerText(), variant.heading);
    assert.equal(await section.locator('.stagelab-methodology-card').count(), 6);
    assert.equal(await section.locator('details').count(), 6);
    assert.equal(await section.locator('details[open]').count(), 0);
    assert.equal(await section.locator('.stagelab-methodology-inputs li').count(), 6);
    assert.equal(await section.locator('.stagelab-methodology-steps li').count(), 3);
    assert.equal(await section.locator('.stagelab-methodology-separation li').count(), 5);
    assert.equal(await section.locator('.stagelab-methodology-limits li').count(), 6);
    assert.ok(await section.evaluate(el => el.previousElementSibling.querySelectorAll('.stat-label').length === 4));
    assert.ok(await section.evaluate(el => Boolean(el.nextElementSibling.querySelector('.tool-faq-grid'))));
    assert.equal(await page.locator('.final-card .button-store').count(), 2);
    assert.ok((await page.locator('.final-card .stagelab-methodology-transition').innerText()).length > 20);
    assert.equal(await page.locator('h1').count(), 1);
    const levels = await section.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes => nodes.map(node => Number(node.tagName.slice(1))));
    assert.deepEqual(levels, [2, ...Array(levels.length - 1).fill(3)]);
    const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
    const schemas = schema.flatMap(text => { const data = JSON.parse(text); return Array.isArray(data) ? data : [data]; });
    assert.ok(schemas.some(data => data['@type'] === 'MobileApplication' && data.description && data.url.endsWith(`${variant.prefix}/stagelab/`)));
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://www.elevarefit.com${variant.prefix}/stagelab/`);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    assert.ok(description.length > 80 && description.includes('StageLab'));
    const summary = section.locator('summary').filter({ hasText: variant.maintenance });
    await summary.focus();
    await summary.press('Enter');
    assert.equal(await section.locator('details[open]').count(), 1);
    const accessibility = await context.newCDPSession(page);
    const { nodes: expandedTree } = await accessibility.send('Accessibility.getFullAXTree');
    const disclosure = expandedTree.find(node => node.name?.value?.startsWith(variant.maintenance) && node.role?.value === 'DisclosureTriangle');
    assert.ok(disclosure?.properties?.some(property => property.name === 'expanded' && property.value.value === true), 'Native disclosure exposes expanded state');
    await summary.press('Space');
    assert.equal(await section.locator('details[open]').count(), 0);
    const { nodes: collapsedTree } = await accessibility.send('Accessibility.getFullAXTree');
    assert.ok(collapsedTree.find(node => node.nodeId === disclosure.nodeId)?.properties?.some(property => property.name === 'expanded' && property.value.value === false), 'Native disclosure exposes collapsed state');
    await accessibility.detach();
    await summary.press('Tab');
    assert.ok(await section.locator('summary').nth(3).evaluate(el => el === document.activeElement));
    checks.push(`${variant.locale}: server-rendered with JavaScript disabled, correct placement/semantics/SEO, six native disclosures toggle with Enter/Space and keyboard focus advances`);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const overflow = await section.evaluate(el => [...el.querySelectorAll('*')].some(node => { const box = node.getBoundingClientRect(); return box.width && (box.left < -1 || box.right > innerWidth + 1); }));
      assert.equal(overflow, false, `${variant.locale} ${width}px overflow`);
      if (width < 721) assert.equal(await section.locator('.stagelab-methodology-inputs').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1);
      if (width >= 721) {
        for (const list of ['.stagelab-methodology-inputs', '.stagelab-methodology-steps']) {
          const tops = await section.locator(`${list} li`).evaluateAll(nodes => nodes.slice(0, 3).map(el => el.getBoundingClientRect().top));
          assert.ok(Math.max(...tops) - Math.min(...tops) < 1, `${variant.locale}: flow boxes align at ${width}px`);
        }
      }
      const smallest = await section.locator('p:not(.stat-label), li, summary, figcaption').evaluateAll(nodes => Math.min(...nodes.filter(el => el.getBoundingClientRect().width).map(el => parseFloat(getComputedStyle(el).fontSize))));
      assert.ok(smallest >= 13, `${variant.locale}: readable text at ${width}`);
      if ((variant.locale === 'en' && [390, 1440].includes(width)) || (variant.locale !== 'en' && width === 390)) {
        await section.screenshot({ path: `${output}/${variant.locale}-${width}.png`, style: screenshotStyle });
      }
      if (width === 390) {
        await section.locator('.stagelab-methodology-intro').screenshot({ path: `${output}/intro-${variant.locale}-mobile.png`, style: screenshotStyle });
        await section.locator('.stagelab-methodology-flow').screenshot({ path: `${output}/flow-${variant.locale}-mobile.png`, style: screenshotStyle });
      }
      checks.push(`${variant.locale}: cards and decision flow fit at ${width}px with readable type`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await summary.click();
    if (variant.locale === 'en') {
      await section.locator('.stagelab-methodology-more').screenshot({ path: `${output}/accordion-en.png`, style: screenshotStyle });
      await section.locator('.stagelab-methodology-flow').screenshot({ path: `${output}/flow-en.png`, style: screenshotStyle });
    }
    await context.close();
  }
  const context = await makeContext(true);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  for (const variant of locales) {
    await page.goto(`${origin}${variant.prefix}/stagelab/`);
    await page.locator('#methodology summary').first().click();
    assert.equal(await page.locator('#methodology details[open]').count(), 1);
    assert.equal(await page.locator('.final-card .button-store').count(), 2);
    checks.push(`${variant.locale}: hydrated page retains functional disclosures and existing store CTAs`);
  }
  await page.goto(`${origin}/es/logbook/`);
  assert.equal(await page.locator('#methodology').count(), 0);
  assert.equal(await page.locator('.callout').count(), 1);
  checks.push('Shared localized renderer preserves the existing Logbook callout without adding StageLab methodology');
  await context.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedApiRequests, []);
  fs.writeFileSync('reports/stagelab-methodology-browser.json', JSON.stringify({ result: 'PASS', mode: 'Production build; three locales with and without JavaScript; external network blocked', checks, pageErrors: errors, apiRequests: unexpectedApiRequests }, null, 2) + '\n');
  console.log(JSON.stringify({ result: 'PASS', checks: checks.length, pageErrors: errors.length, apiRequests: unexpectedApiRequests.length }));
} finally { await browser.close(); }
