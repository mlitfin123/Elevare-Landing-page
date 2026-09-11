import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { token, testEnvironment as env } from './local-environment.mjs';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON ?? 'C:/Users/markl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const authId = '88888888-8888-4888-8888-888888888888';
const accessToken = token('authenticated', authId);
const owner = createClient(env.SECOND_SUPABASE_URL, env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } },
});
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];
try {
  for (const [prefix, summary, save, saved] of [
    ['', 'Email notifications', 'Save email preferences', 'Email preferences saved.'],
    ['/es', 'Notificaciones por correo', 'Guardar preferencias de correo', 'Preferencias de correo guardadas.'],
    ['/pt-br', 'Notificações por e-mail', 'Salvar preferências de e-mail', 'Preferências de e-mail salvas.'],
  ]) {
    assert.ifError((await owner.rpc('marketplace_my_notification_preferences', { p_match_updates: true, p_match_reminders: false })).error);
    const context = await browser.newContext({ viewport: { width: prefix ? 390 : 1440, height: 1000 } });
    await context.addInitScript(({ accessToken, authId }) => {
      localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: accessToken, token_type: 'bearer', refresh_token: 'local-fixture-only', expires_at: Math.floor(Date.now()/1000)+86400, expires_in: 86400, user: { id: authId, aud: 'authenticated', role: 'authenticated', email: 'notification-client@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() } }));
      localStorage.setItem('elevare_analytics_consent_v1', 'declined');
    }, { accessToken, authId });
    const page = await context.newPage();
    // Only unrelated dashboard summaries are stubbed. Auth, account ownership,
    // notification preference reads and writes use the actual local database.
    for (const table of ['saved_trainer_profiles', 'client_profiles']) await page.route(`**/rest/v1/${table}?**`, route => route.fulfill({ json: [] }));
    await page.goto(`http://127.0.0.1:3100${prefix}/account/`);
    const panel = page.locator('#email-notifications');
    await panel.locator('summary').getByText(summary, { exact: true }).click();
    const checks = panel.getByRole('checkbox');
    await checks.first().waitFor();
    assert.equal(await checks.first().isChecked(), true);
    assert.equal(await checks.nth(1).isChecked(), false);
    await checks.nth(1).check();
    await panel.getByRole('button', { name: save, exact: true }).click();
    await panel.getByText(saved, { exact: true }).waitFor();
    assert.deepEqual((await owner.rpc('marketplace_my_notification_preferences')).data, { match_updates: true, match_reminders: true });
    await checks.first().uncheck();
    assert.equal(await checks.nth(1).isDisabled(), true);
    await panel.getByRole('button', { name: save, exact: true }).click();
    await panel.getByText(saved, { exact: true }).waitFor();
    await page.reload();
    await panel.locator('summary').click();
    await checks.first().waitFor();
    assert.equal(await checks.first().isChecked(), false);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await panel.screenshot({ path: `../.tmp/notification-preferences-${prefix.slice(1) || 'en'}.png` });
    results.push(`${prefix || 'en'}: saved, persisted after reload, reminder dependency, no horizontal overflow`);
    console.log(`PASS ${results.at(-1)}`);
    await context.close();
  }
  fs.writeFileSync('reports/notification-preferences-browser.json', JSON.stringify({ result: 'PASS', browser: 'Chromium', realEmailsSent: 0, results }, null, 2) + '\n');
} finally { await browser.close(); }
