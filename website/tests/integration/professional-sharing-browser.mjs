// Local production dashboard only. Social destinations are intercepted, never posted to.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { token, testEnvironment as env } from './local-environment.mjs';
import { professionalShareMessages } from '../../lib/i18n/professional-share-messages.ts';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON ?? 'C:/Users/markl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const origin = 'http://127.0.0.1:3100';
const ownerAuth = '33333333-3333-4333-8333-333333333333';
const output = '../.tmp/professional-sharing';
fs.mkdirSync(output, { recursive: true });
const photo = await sharp(Buffer.from('<svg width="700" height="700" xmlns="http://www.w3.org/2000/svg"><rect width="700" height="700" fill="#7fa8ad"/><circle cx="350" cy="258" r="135" fill="#deede9"/><path d="M95 700V605c0-166 510-166 510 0v95" fill="#183744"/></svg>')).png().toBuffer();
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const checks = [], errors = [], mutations = [];
// Hide unrelated fixed overlays only while capturing a component screenshot.
const screenshotStyle = '.site-header, .analytics-consent-manage { visibility: hidden !important; }';
const check = async (name, run) => { await run(); checks.push(name); console.log(`PASS ${name}`); };

async function open(settings = {}) {
  const { locale = 'en', native = 'unsupported', clipboard = 'success', photoMode = 'success', live = true, long = false, canvasFailure = false, fileShare = false } = settings;
  const m = professionalShareMessages[locale];
  const prefix = locale === 'es-419' ? '/es' : locale === 'pt-BR' ? '/pt-br' : '';
  const profileUrl = `https://www.elevarefit.com${prefix}/professionals/runtime-professional/`;
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const requested = [];
  await context.addInitScript(({ ownerAuth, accessToken, native, clipboard, canvasFailure, fileShare }) => {
    localStorage.setItem('elevare_analytics_consent_v1', 'declined');
    localStorage.setItem('elevare_profile_statistics_v1', 'declined');
    localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: accessToken, token_type: 'bearer', refresh_token: 'local-only', expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400, user: { id: ownerAuth, aud: 'authenticated', role: 'authenticated', email: 'runtime-test@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() } }));
    window.shareCalls = []; window.copyCalls = []; window.cardText = []; window.revokedCards = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (clipboard === 'failure') throw Error('Clipboard blocked'); window.copyCalls.push(text); } } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: native === 'unsupported' && !fileShare ? undefined : async value => { window.shareCalls.push({ ...value, files: value.files?.map(file => ({ name: file.name, type: file.type, size: file.size })) }); if (native === 'cancel') throw new DOMException('Cancelled', 'AbortError'); if (native === 'error') throw Error('Sharing blocked'); } });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => fileShare });
    const originalText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, ...rest) {
      window.cardText.push({ text, x, y, width: this.measureText(text).width });
      return originalText.call(this, text, x, y, ...rest);
    };
    const revoke = URL.revokeObjectURL;
    URL.revokeObjectURL = function(url) { window.revokedCards.push(url); revoke.call(URL, url); };
    const getContext = HTMLCanvasElement.prototype.getContext;
    window.cardCanvasFailure = canvasFailure;
    HTMLCanvasElement.prototype.getContext = function(...args) { return window.cardCanvasFailure ? null : getContext.apply(this, args); };
  }, { ownerAuth, accessToken: token('authenticated', ownerAuth), native, clipboard, canvasFailure, fileShare });
  await context.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url()); requested.push(url.toString());
    if (url.origin === 'https://www.facebook.com') return route.fulfill({ body: 'Facebook share destination intercepted for local validation.' });
    if (![origin, env.SECOND_SUPABASE_URL].includes(url.origin)) return route.abort();
    if (url.pathname === '/__sharing-test-photo.png') return photoMode === 'failure' ? route.abort() : route.fulfill({ body: photo, contentType: 'image/png' });
    if (url.origin === env.SECOND_SUPABASE_URL) {
      if (request.method() !== 'GET') {
        const permitted = url.pathname === '/rest/v1/rpc/marketplace_get_professional_retention_summary'
          || (url.pathname === '/rest/v1/rpc/marketplace_my_notification_preferences' && Object.keys(request.postDataJSON() ?? {}).length === 0);
        if (!permitted) { mutations.push(`${request.method()} ${url.pathname}`); return route.abort(); }
      }
      if (['/rest/v1/users', '/rest/v1/trainer_profiles', '/rest/v1/marketplace_trainer_profile_status_v1', '/rest/v1/rpc/marketplace_get_professional_retention_summary'].includes(url.pathname)) {
        const response = await route.fetch();
        if (!response.ok()) return route.fulfill({ response });
        const original = await response.json();
        const update = row => {
          if (url.pathname === '/rest/v1/users') return { ...row, profile_photo_url: photoMode === 'none' ? null : `${origin}/__sharing-test-photo.png` };
          if (url.pathname === '/rest/v1/trainer_profiles') return { ...row, public_display_name: long ? 'María-José ExtraordinarilyLongUnbrokenProfessionalName'.repeat(4) : 'Avery Rivera', professional_title: 'Strength & Conditioning Coach', marketplace_specialties: ['Strength training', 'Sustainable habits', 'Sports performance'] };
          if (url.pathname === '/rest/v1/marketplace_trainer_profile_status_v1') return { ...row, is_publicly_listed: live, public_slug: 'runtime-professional' };
          return { ...row, is_live: live };
        };
        return route.fulfill({ response, json: Array.isArray(original) ? original.map(update) : update(original) });
      }
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}${prefix}/account/`);
  await page.locator('.retention-priority-grid').waitFor();
  const panel = page.locator('.professional-sharing');
  if (live) await panel.waitFor();
  return { context, page, panel, m, profileUrl, requested };
}

try {
  await check('Facebook opens only on selection; all shares use the public production URL', async () => {
    const { context, page, panel, m, profileUrl, requested } = await open();
    assert.equal(requested.some(url => url.startsWith('https://www.facebook.com')), false);
    const facebook = panel.getByRole('link', { name: m.facebook, exact: true });
    assert.equal(new URL(await facebook.getAttribute('href')).searchParams.get('u'), profileUrl);
    assert.match(await facebook.getAttribute('rel'), /noopener noreferrer/);
    const popupReady = context.waitForEvent('page'); await facebook.click();
    const popup = await popupReady; await popup.waitForLoadState(); await popup.close();
    await panel.getByRole('button', { name: m.copy, exact: true }).click();
    await panel.getByRole('button', { name: m.more, exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.copyCalls), [profileUrl, profileUrl]);
    assert.equal(await page.locator('.retention-metrics article').count(), 4);
    assert.equal(await page.locator('#professional-availability').isEnabled(), true);
    await context.close();
  });
  await check('native sharing succeeds, cancellation stays quiet, and other failures fall back to copying', async () => {
    for (const native of ['success', 'cancel', 'error']) {
      const { context, page, panel, m, profileUrl } = await open({ native });
      await panel.getByRole('button', { name: m.more, exact: true }).click();
      const state = await page.evaluate(() => ({ shared: window.shareCalls, copied: window.copyCalls }));
      assert.equal(state.shared[0].url, profileUrl);
      assert.equal(state.copied.length, native === 'error' ? 1 : 0);
      if (native === 'cancel') assert.equal(await panel.getByRole('status').count(), 0);
      await context.close();
    }
  });
  await check('blocked clipboard selects a visible read-only link for manual copying', async () => {
    const { context, page, panel, m, profileUrl } = await open({ clipboard: 'failure' });
    await panel.getByRole('button', { name: m.copy, exact: true }).click();
    await panel.getByText(m.manualCopy).waitFor();
    assert.deepEqual(await page.evaluate(() => { const el = document.activeElement; return [el.value, el.selectionStart, el.selectionEnd]; }), [profileUrl, 0, profileUrl.length]);
    await context.close();
  });
  await check('card resources load on demand and the downloaded PNG has the right dimensions and public content', async () => {
    const { context, page, panel, m, requested } = await open({ fileShare: true });
    assert.equal(requested.some(url => url.endsWith('/elevare-wordmark.png')), false);
    await panel.getByRole('button', { name: m.create, exact: true }).click();
    const downloadLink = panel.getByRole('link', { name: m.download, exact: true }); await downloadLink.waitFor();
    const downloadReady = page.waitForEvent('download'); await downloadLink.click();
    const download = await downloadReady;
    assert.equal(download.suggestedFilename(), 'elevare-runtime-professional-instagram.png');
    await download.saveAs(`${output}/profile-card.png`);
    const metadata = await sharp(`${output}/profile-card.png`).metadata();
    assert.equal(metadata.width, 1080); assert.equal(metadata.height, 1920); assert.equal(metadata.format, 'png');
    const text = await page.evaluate(() => window.cardText.map(row => row.text).join('\n'));
    assert.match(text, /Avery Rivera/); assert.match(text, /Strength & Conditioning Coach/); assert.match(text, /Strength training/); assert.match(text, /elevarefit.com/); assert.match(text, /FIND YOUR SUPPORT/);
    assert.doesNotMatch(text, /runtime-test|@|33333333|verified|accepting/i);
    await panel.getByRole('button', { name: m.shareImage }).click();
    assert.equal((await page.evaluate(() => window.shareCalls.at(-1).files[0])).type, 'image/png');
    await panel.screenshot({ path: `${output}/sharing-desktop.png`, style: screenshotStyle });
    const first = await downloadLink.getAttribute('href');
    await panel.getByRole('button', { name: m.create, exact: true }).click();
    await page.waitForFunction(first => window.revokedCards.includes(first), first);
    await context.close();
  });
  await check('failed photos fall back to initials and long names stay inside the card', async () => {
    const { context, page, panel, m } = await open({ photoMode: 'failure', long: true });
    await panel.getByRole('button', { name: m.create }).click();
    await panel.getByText(m.photoFallback).waitFor();
    const rows = await page.evaluate(() => window.cardText);
    assert.ok(rows.every(row => row.width <= 920 && row.y >= 0 && row.y < 1850));
    const downloadReady = page.waitForEvent('download'); await panel.getByRole('link', { name: m.download }).click();
    await (await downloadReady).saveAs(`${output}/profile-card-long-name.png`);
    await context.close();
  });
  await check('unavailable canvas fails visibly and retries without disrupting other sharing', async () => {
    const { context, page, panel, m } = await open({ canvasFailure: true, photoMode: 'none' });
    await panel.getByRole('button', { name: m.create }).click(); await panel.getByText(m.failed).waitFor();
    assert.equal(await panel.getByRole('button', { name: m.copy, exact: true }).isEnabled(), true);
    await page.evaluate(() => { window.cardCanvasFailure = false; });
    await panel.getByRole('button', { name: m.create }).click(); await panel.getByRole('link', { name: m.download }).waitFor();
    await context.close();
  });
  await check('localized controls and preview fit narrow screens and work with a keyboard', async () => {
    for (const locale of ['en', 'es-419', 'pt-BR']) {
      const { context, page, panel, m, profileUrl } = await open({ locale });
      await page.setViewportSize({ width: 320, height: 700 });
      await panel.getByRole('button', { name: m.create }).focus(); await page.keyboard.press('Enter');
      await panel.getByRole('link', { name: m.download }).waitFor();
      assert.equal(await panel.getByLabel(m.linkLabel).inputValue(), profileUrl);
      assert.equal(await panel.evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.setViewportSize({ width: 390, height: 844 });
      await panel.screenshot({ path: `${output}/sharing-${locale}.png`, style: screenshotStyle });
      if (locale !== 'en') {
        const downloadReady = page.waitForEvent('download'); await panel.getByRole('link', { name: m.download }).click();
        await (await downloadReady).saveAs(`${output}/profile-card-${locale}.png`);
      }
      await context.close();
    }
  });
  await check('unpublished profiles have no share controls and sharing makes no database mutations', async () => {
    const { context, panel } = await open({ live: false });
    assert.equal(await panel.count(), 0); await context.close();
    assert.deepEqual(mutations, []); assert.deepEqual(errors, []);
  });
  fs.writeFileSync('reports/professional-sharing-browser.json', JSON.stringify({ result: 'PASS', mode: 'Local production build; synthetic profile fields; real local account queries; social destinations intercepted', checks, pageErrors: errors, databaseMutations: mutations }, null, 2) + '\n');
  console.log(JSON.stringify({ result: 'PASS', checks: checks.length }));
} finally { await browser.close(); }
