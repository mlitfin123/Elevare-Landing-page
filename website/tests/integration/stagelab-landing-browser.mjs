import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON ?? 'C:/Users/markl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const origin = process.env.STAGELAB_TEST_ORIGIN || 'http://127.0.0.1:3100';
const output = '../.tmp/stagelab-landing';
fs.mkdirSync(output, { recursive: true });

const variants = [
  { prefix: '', locale: 'en', title: 'Your competition prep, physique progress, and posing—in one place.' },
  { prefix: '/es', locale: 'es-419', title: 'Tu preparación para competir, tu progreso físico y tus poses, todo en un solo lugar.' },
  { prefix: '/pt-br', locale: 'pt-BR', title: 'Sua preparação para competições, sua evolução física e suas poses em um só lugar.' },
];
const widths = [375, 390, 430, 1440];
const checks = [];
const errors = [];

try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    try { localStorage.setItem('elevare_analytics_consent_v1', 'declined'); } catch { /* Storage is unavailable in some sandboxed frames. */ }
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.youtube-nocookie.com') return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));

  for (const variant of variants) {
    await page.setViewportSize({ width: 390, height: 900 });
    const response = await page.goto(`${origin}${variant.prefix}/stagelab/`);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('html').getAttribute('lang'), variant.locale);
    assert.equal(await page.locator('h1').innerText(), variant.title);
    assert.equal(await page.locator('.stagelab-product-hero .button-store').count(), 2);
    assert.equal(await page.locator('.stagelab-product-final .button-store').count(), 2);
    assert.equal(await page.locator('.stage-analysis-product-card').count(), 3);
    assert.equal(await page.locator('.stagelab-methodology-disclosure').getAttribute('open'), null);
    assert.equal(await page.locator('.stagelab-demo-screens .stagelab-screenshot').count(), 3);
    assert.equal(await page.locator('.stagelab-dashboard-benefit .stagelab-screenshot').count(), 1);
    assert.equal(await page.locator('.stagelab-coach-benefit:not(.stagelab-roadmap-benefit):not(.stagelab-progress-benefit):not(.stagelab-dashboard-benefit) .stagelab-screenshot').count(), 1);
    assert.equal(await page.locator('.stagelab-roadmap-benefit .stagelab-screenshot').count(), 1);
    assert.equal(await page.locator('.stagelab-progress-benefit .stagelab-screenshot').count(), 1);
    assert.match(await page.locator('.stagelab-product-hero .button-store').nth(0).getAttribute('href'), /^https:\/\/apps\.apple\.com\//);
    assert.match(await page.locator('.stagelab-product-hero .button-store').nth(1).getAttribute('href'), /^https:\/\/play\.google\.com\//);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://www.elevarefit.com${variant.prefix}/stagelab/`);
    assert.equal(await page.locator('link[rel="alternate"][hreflang="es-419"]').count(), 1);
    assert.equal(await page.locator('link[rel="alternate"][hreflang="pt-BR"]').count(), 1);
    for (const image of await page.locator('.stagelab-product-page img').all()) await image.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const failedImages = await page.locator('.stagelab-product-page img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.getAttribute('src')));
    assert.deepEqual(failedImages, []);

    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      assert.equal(overflow, false, `${variant.locale} ${width}px overflow`);
      const minStoreHeight = await page.locator('.stagelab-product-hero .button-store').evaluateAll(nodes => Math.min(...nodes.map(node => node.getBoundingClientRect().height)));
      assert.ok(minStoreHeight >= 44, `${variant.locale} ${width}px store targets`);
      if (width < 431) {
        const heroCtaTop = await page.locator('.stagelab-product-hero .product-store-buttons').evaluate(node => node.getBoundingClientRect().top);
        assert.ok(heroCtaTop < 800, `${variant.locale} ${width}px hero action remains early`);
      }
      checks.push(`${variant.locale}: ${width}px has no horizontal overflow and accessible store targets`);
    }

    if (variant.locale === 'en') {
      await page.setViewportSize({ width: 390, height: 1000 });
      await page.goto(`${origin}/stagelab/`);
      await page.screenshot({ path: `${output}/hero-mobile.png` });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${origin}/stagelab/`);
      await page.screenshot({ path: `${output}/hero-desktop.png` });
      await page.locator('.stagelab-product-demo').screenshot({ path: `${output}/demo-desktop.png` });
      await page.locator('.stagelab-dashboard-benefit').screenshot({ path: `${output}/dashboard-desktop.png` });
      await page.locator('.stagelab-progress-benefit').screenshot({ path: `${output}/progress-desktop.png` });
      await page.locator('.stagelab-roadmap-benefit').screenshot({ path: `${output}/show-day-desktop.png` });
      await page.setViewportSize({ width: 390, height: 1000 });
      await page.locator('.stagelab-dashboard-benefit').screenshot({ path: `${output}/dashboard-mobile.png` });
      await page.locator('.stagelab-progress-benefit').screenshot({ path: `${output}/progress-mobile.png` });
      await page.locator('.stagelab-roadmap-benefit').screenshot({ path: `${output}/show-day-mobile.png` });
    }
  }

  assert.deepEqual(errors, []);
  fs.writeFileSync('reports/stagelab-landing-browser.json', JSON.stringify({ result: 'PASS', mode: 'Localized production build', checks, pageErrors: errors }, null, 2) + '\n');
  console.log(JSON.stringify({ result: 'PASS', checks: checks.length, pageErrors: errors.length }));
  await context.close();
} finally {
  await browser.close();
}
