import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import { token, testEnvironment as env } from './local-environment.mjs';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON ?? 'C:/Users/markl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const { getProfessionalMetrics } = require('C:/Users/markl/Desktop/Admin_Elevare/professional-metrics.js');
const origin = 'http://127.0.0.1:3100';
const profile = '11111111-1111-4111-8111-111111111111';
const ownerAuth = '33333333-3333-4333-8333-333333333333';
const supabase = createClient(env.SECOND_SUPABASE_URL, env.SECOND_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const checks = [], errors = [];
const output = '../.tmp/aggregate-profile-views';
fs.mkdirSync(output, { recursive: true });
const total = async () => {
  const result = await supabase.from('professional_profile_view_counts').select('view_count').eq('trainer_profile_id', profile).single();
  assert.ifError(result.error); return Number(result.data.view_count);
};
const post = async (headers = {}, body = { professionalId: profile }) => fetch(`${origin}/api/professional-profile-view/`, {
  method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://www.elevarefit.com', ...headers }, body: JSON.stringify(body),
});
const check = async (name, fn) => { await fn(); checks.push(name); console.log(`PASS ${name}`); };
async function context({ region = 'US', analytics, choice, gpc = false, dnt = false, storageBlocked = false, owner = false } = {}) {
  const result = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { 'x-vercel-ip-country': region } });
  await result.addInitScript(({ analytics, choice, gpc, dnt, storageBlocked, owner, ownerAuth, ownerToken }) => {
    localStorage.setItem('elevare:professional-profile-view:obsolete:2026-09-01', 'recorded');
    localStorage.setItem('unrelated-test-preference', 'keep');
    if (analytics) localStorage.setItem('elevare_analytics_consent_v1', analytics);
    if (choice) localStorage.setItem('elevare_profile_statistics_v1', choice);
    if (owner) localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: ownerToken, token_type: 'bearer', refresh_token: 'local-only', expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400, user: { id: ownerAuth, aud: 'authenticated', role: 'authenticated', email: 'runtime-test@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() } }));
    if (gpc) Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
    if (dnt) Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '1' });
    if (storageBlocked) Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw Error('Storage disabled for test'); } });
  }, { analytics, choice, gpc, dnt, storageBlocked, owner, ownerAuth, ownerToken: token('authenticated', ownerAuth) });
  await result.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (![origin, env.SECOND_SUPABASE_URL].includes(url.origin)) return route.abort();
    if (url.pathname === '/api/professional-profile-view/') {
      assert.deepEqual(Object.keys(route.request().postDataJSON()), ['professionalId']);
      assert.equal(route.request().headers().referer, undefined);
      // The production endpoint accepts the canonical origin, while this browser
      // intentionally runs on loopback. Forward to the real local handler with it.
      const response = await route.fetch({ headers: { ...route.request().headers(), origin: 'https://www.elevarefit.com' } });
      return route.fulfill({ response });
    }
    return route.continue();
  });
  const page = await result.newPage();
  page.on('pageerror', error => { errors.push(error.message); console.error(`Browser error: ${error.message}`); });
  return { context: result, page };
}
const navigate = page => page.goto(`${origin}/professionals/runtime-professional/`);
const viewResponse = page => page.waitForResponse(response => response.url().endsWith('/api/professional-profile-view/'));
async function openStatistics(page) {
  const details = page.locator('details.profile-statistics-choice');
  await details.waitFor();
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
}

try {
  await check('route applies regional defaults and declines without collecting visitor IDs', async () => {
    const before = await total();
    for (const country of ['US', 'GB', 'FR']) {
      const r = await post({ 'x-vercel-ip-country': country });
      assert.equal(r.headers.get('x-elevare-profile-view'), 'recorded');
      assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
    }
    for (const headers of [
      {}, { 'x-vercel-ip-country': 'DE' }, { 'x-vercel-ip-country': 'BR' },
      { 'x-vercel-ip-country': 'DE', 'x-elevare-analytics-consent': 'accepted' },
      { 'x-vercel-ip-country': 'US', 'x-elevare-analytics-consent': 'declined' },
      { 'x-vercel-ip-country': 'US', 'x-elevare-profile-statistics': 'declined' },
      { 'x-elevare-profile-statistics': 'accepted', 'sec-gpc': '1' },
      { 'x-elevare-profile-statistics': 'accepted', dnt: '1' },
      { 'x-elevare-profile-statistics': 'accepted', 'user-agent': 'Googlebot' },
      { 'x-elevare-profile-statistics': 'accepted', purpose: 'prefetch' },
    ]) assert.equal((await post(headers)).headers.get('x-elevare-profile-view'), 'skipped');
    assert.equal((await post({ origin: 'https://untrusted.invalid', 'x-elevare-profile-statistics': 'accepted' })).status, 403);
    assert.equal((await post({ 'x-elevare-profile-statistics': 'accepted' }, { professionalId: profile, visitorId: 'not-allowed' })).status, 400);
    assert.equal(await total(), before + 3);
  });
  await check('explicit profile consent permits a view in a restricted region even with Google declined', async () => {
    const before = await total();
    assert.equal((await post({ 'x-vercel-ip-country': 'DE', 'x-elevare-profile-statistics': 'accepted', 'x-elevare-analytics-consent': 'declined' })).headers.get('x-elevare-profile-view'), 'recorded');
    assert.equal(await total(), before + 1);
  });
  await check('signed-in owner views are excluded through the local authenticated user fixture', async () => {
    const before = await total();
    assert.equal((await post({ 'x-elevare-profile-statistics': 'accepted', authorization: `Bearer ${token('authenticated', ownerAuth)}` })).headers.get('x-elevare-profile-view'), 'skipped');
    assert.equal(await total(), before);
  });
  await check('a page counts once per mount, a repeat visit counts again, and the old visitor cookie expires', async () => {
    const before = await total();
    const { context: c, page } = await context();
    await c.addCookies([{ name: 'elevare_profile_visitor', value: 'retired-id', url: origin, httpOnly: true }]);
    let response = viewResponse(page);
    await navigate(page); const firstResponse = await response;
    assert.equal(firstResponse.headers()['x-elevare-profile-view'], 'recorded', `HTTP ${firstResponse.status()}`);
    await page.waitForTimeout(300);
    assert.equal(await total(), before + 1);
    assert.equal((await c.cookies()).some(cookie => cookie.name === 'elevare_profile_visitor'), false);
    assert.equal(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('elevare:professional-profile-view:'))), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('unrelated-test-preference')), 'keep');
    response = viewResponse(page); await page.reload(); await response;
    assert.equal(await total(), before + 2);
    await openStatistics(page);
    await page.getByRole('button', { name: 'Turn off profile statistics', exact: true }).click();
    await page.getByRole('button', { name: 'Accept Google Analytics', exact: true }).click();
    let requests = 0; page.on('request', request => { if (request.url().endsWith('/api/professional-profile-view/')) requests++; });
    await page.reload(); await page.getByRole('button', { name: 'Privacy choices', exact: true }).waitFor();
    await page.waitForTimeout(300);
    assert.equal(requests, 0); assert.equal(await total(), before + 2);
    await page.getByRole('button', { name: 'Privacy choices', exact: true }).click();
    await openStatistics(page);
    await page.getByRole('button', { name: 'Allow profile statistics', exact: true }).focus();
    response = viewResponse(page);
    await page.keyboard.press('Enter'); await response;
    assert.equal(await total(), before + 3);
    await c.close();
  });
  await check('unknown-region visitors can explicitly opt in on the current page after an initial skipped request', async () => {
    const before = await total();
    const { context: c, page } = await context({ region: 'DE' });
    let response = viewResponse(page); await navigate(page);
    assert.equal((await response).headers()['x-elevare-profile-view'], 'skipped');
    await openStatistics(page);
    response = viewResponse(page);
    await page.getByRole('button', { name: 'Allow profile statistics', exact: true }).click();
    assert.equal((await response).headers()['x-elevare-profile-view'], 'recorded');
    assert.equal(await total(), before + 1); await c.close();
  });
  await check('existing declines, GPC and DNT prevent browser counter requests', async () => {
    const before = await total();
    for (const settings of [{ analytics: 'declined' }, { gpc: true }, { dnt: true }]) {
      const { context: c, page } = await context(settings);
      let requests = 0; page.on('request', request => { if (request.url().endsWith('/api/professional-profile-view/')) requests++; });
      await navigate(page); await page.waitForTimeout(400);
      assert.equal(requests, 0);
      if (settings.gpc || settings.dnt) {
        await openStatistics(page);
        assert.equal(await page.getByRole('button', { name: 'Allow profile statistics', exact: true }).isDisabled(), true);
      }
      await c.close();
    }
    assert.equal(await total(), before);
  });
  await check('blocked browser storage does not require a visitor identifier or prevent permitted aggregate counting', async () => {
    const before = await total();
    const { context: c, page } = await context({ storageBlocked: true });
    const response = viewResponse(page); await navigate(page); await response;
    assert.equal(await total(), before + 1);
    await openStatistics(page);
    await page.getByRole('button', { name: 'Turn off profile statistics', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Turn off profile statistics', exact: true }).getAttribute('aria-pressed'), 'true');
    await c.close();
  });
  await check('localized privacy controls fit small screens and keep all actions reachable', async () => {
    for (const [prefix, locale] of [['', 'en'], ['/es', 'es-419'], ['/pt-br', 'pt-BR']]) {
      const { context: c, page } = await context({ region: 'DE' });
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(`${origin}${prefix}/stagelab/`);
      const panel = page.locator('.analytics-consent'); await panel.waitFor();
      const bounds = await panel.boundingBox();
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 568);
      assert.equal(await panel.evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
      assert.equal(await panel.locator('.profile-statistics-choice button').count(), 2);
      const disclosure = panel.locator('.profile-statistics-choice summary');
      await disclosure.focus(); await disclosure.press('Enter');
      assert.notEqual(await panel.locator('.profile-statistics-choice').getAttribute('open'), null);
      await disclosure.press('Space');
      assert.equal(await panel.locator('.profile-statistics-choice').getAttribute('open'), null);
      await panel.locator('.analytics-consent-actions button').last().focus();
      assert.equal(await panel.locator('.analytics-consent-actions button').last().evaluate(el => el === document.activeElement), true);
      await page.setViewportSize({ width: 390, height: 844 });
      await panel.screenshot({ path: `${output}/privacy-${locale}.png` });
      await openStatistics(page);
      assert.equal(await panel.evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
      if (locale === 'en') await panel.screenshot({ path: `${output}/privacy-expanded-en.png` });
      await c.close();
    }
  });
  await check('admin and professional dashboard read matching real daily and all-time totals', async () => {
    const admin = await getProfessionalMetrics({ supabaseUrl: env.SECOND_SUPABASE_URL, serviceRoleKey: env.SECOND_SUPABASE_SERVICE_ROLE_KEY }, [profile]);
    const owner = createClient(env.SECOND_SUPABASE_URL, env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token('authenticated', ownerAuth)}` } }, auth: { persistSession: false } });
    const summary = await owner.rpc('marketplace_get_professional_retention_summary', { p_days: 30 });
    assert.ifError(summary.error);
    assert.equal(admin.metrics[0].views30Days, summary.data.views_in_range);
    assert.equal(admin.metrics[0].viewsAllTime, summary.data.views_all_time);
    assert.equal(admin.metrics[0].inquiriesAllTime, 2);
    const { context: c, page } = await context({ owner: true, analytics: 'declined' });
    await page.goto(`${origin}/account/`);
    const metric = page.locator('.retention-metrics article').filter({ hasText: 'Recorded profile page views' });
    await metric.waitFor();
    assert.equal(await metric.locator('strong').innerText(), String(summary.data.views_in_range));
    await metric.screenshot({ path: `${output}/recorded-views.png` });
    await page.route('**/rest/v1/rpc/marketplace_get_professional_retention_summary', route => route.fulfill({ json: { ...summary.data, views_in_range: 0, views_all_time: 0 } }));
    await page.reload(); await page.getByText('No recorded views yet', { exact: true }).waitFor();
    await page.locator('.retention-metrics').screenshot({ path: `${output}/no-recorded-views.png` });
    await c.close();
  });
  assert.deepEqual(errors, []);
  fs.writeFileSync('reports/aggregate-profile-views-browser.json', JSON.stringify({ result: 'PASS', mode: 'Local production build with simulated Vercel country headers; external services blocked', checks, pageErrors: errors }, null, 2) + '\n');
  console.log(JSON.stringify({ result: 'PASS', checks: checks.length }));
} finally { await browser.close(); }
