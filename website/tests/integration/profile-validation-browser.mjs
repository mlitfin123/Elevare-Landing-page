import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { marketplaceText } from '../../lib/i18n/marketplace-content.ts';
import { getProfessionalPublicationMessages } from '../../lib/i18n/professional-publication-messages.ts';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const base = process.env.PROFILE_TEST_ORIGIN || 'http://127.0.0.1:3107';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Run only against a local server.');
const engine = process.env.PROFILE_TEST_BROWSER || 'chromium';
const browser = await playwright[engine].launch(engine === 'chromium' ? { channel: 'chrome', headless: true } : { headless: true });
const user = { id: '10000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800, role: 'authenticated' })).toString('base64url')}.fixture`;
try {
  for (const locale of ['en', 'es-419', 'pt-BR']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    const writes = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(({ user, token }) => {
      localStorage.setItem('elevare_analytics_consent_v1', 'declined');
      localStorage.setItem('sb-fixture-auth-token', JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user }));
    }, { user, token });
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.startsWith('/rest/v1/')) {
        if (url.pathname.endsWith('/rpc/marketplace_my_notification_preferences') && !Object.keys(request.postDataJSON() ?? {}).length) {
          return route.fulfill({ json: { match_updates: true, match_reminders: false } });
        }
        if (!['GET', 'HEAD'].includes(request.method()) && !url.pathname.endsWith('/rpc/marketplace_category_catalog')) writes.push(url.pathname);
        const data = url.pathname.endsWith('/users') ? [{ id: '20000000-0000-4000-8000-000000000001', auth_id: user.id, role: 'client', first_name: '', last_name: '', is_active: true }] : [];
        return route.fulfill({ json: data });
      }
      if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user });
      if (url.origin !== base) return route.abort();
      if (url.pathname.startsWith('/api/')) { if (request.method() === 'POST') writes.push(url.pathname); return route.fulfill({ status: 503, json: { error: 'fixture_no_writes' } }); }
      return route.continue();
    });
    const prefix = locale === 'en' ? '' : locale === 'es-419' ? '/es' : '/pt-br';
    const response = await page.goto(`${base}${prefix}/account/professional-profile/`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200, 'Enable localized routes on the local fixture server.');
    const editor = page.locator('.professional-profile-builder');
    await editor.waitFor({ timeout: 60000 });
    const submit = editor.locator('.form-actions .button-primary');
    const t = value => marketplaceText(locale, value);
    const copy = getProfessionalPublicationMessages(locale);
    const toggle = heading => editor.locator(`article[aria-labelledby="${heading}"] .professional-section-toggle`);
    const expand = async heading => { if (await toggle(heading).getAttribute('aria-expanded') === 'false') await toggle(heading).click(); };
    const collapse = async heading => { if (await toggle(heading).getAttribute('aria-expanded') === 'true') await toggle(heading).click(); };
    const jump = async message => {
      const button = editor.locator('#profile-validation button').filter({ hasText: t(message) });
      assert.equal(await button.count(), 1, message);
      assert.ok((await button.innerText()).includes(copy.goToField));
      await button.click();
    };
    const focused = async selector => assert.equal(await page.locator(selector).evaluate(element => element === document.activeElement), true, selector);
    await collapse('about-you-heading');
    await submit.click();
    await editor.locator('#profile-validation').waitFor();
    assert.equal(await editor.locator('#profile-validation-heading').innerText(), copy.reviewFields);
    await jump('Add your name.');
    await focused('#profile-field-name input');
    await page.locator('#profile-field-name input').fill('Synthetic unsaved name');
    await submit.click();
    assert.equal(await editor.locator('#profile-validation button').filter({ hasText: t('Add your name.') }).count(), 0);
    await jump('Choose a primary category.');
    assert.equal(await toggle('offer-heading').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('#profile-field-specialties').evaluate(element => element.contains(document.activeElement)), true);
    await jump('Confirm the professional marketplace terms before submitting.');
    await focused('#profile-field-terms input');
    await expand('links-heading');
    await page.locator('#profile-field-website input').fill('invalid-url');
    await collapse('links-heading');
    await submit.click();
    await jump('Enter a complete http:// or https:// URL.');
    await focused('#profile-field-website input');
    await expand('offer-heading');
    const service = editor.locator('#profile-field-services .nested-editor-card').first();
    await service.locator('[id$="-name"] input').fill('Synthetic service');
    await editor.locator('#profile-field-services .professional-compact-card').getByRole('button', { name: t('Edit'), exact: true }).click();
    await service.locator('[id$="-priceFrom"] input').fill('75');
    await service.locator('[id$="-durationMinutes"] input').fill('3');
    await service.getByRole('button', { name: t('Done'), exact: true }).click();
    await collapse('offer-heading');
    await submit.click();
    await jump('Service duration must be at least 5 minutes.');
    await focused('#profile-field-services [id$="-durationMinutes"] input');
    assert.equal(await editor.locator('#profile-field-services [id$="-name"] input').inputValue(), 'Synthetic service');
    await expand('credentials-heading');
    const credential = editor.locator('#profile-field-credentials .nested-editor-card').first();
    await credential.locator('input').nth(0).fill('Synthetic credential');
    await credential.locator('input').nth(1).fill('Synthetic issuer');
    await editor.locator('#profile-field-credentials .professional-compact-card').getByRole('button', { name: t('Edit'), exact: true }).click();
    await credential.locator('[id^="profile-reference-"] input').fill('invalid-reference');
    await credential.getByRole('button', { name: t('Done'), exact: true }).click();
    await collapse('credentials-heading');
    await submit.click();
    await jump('Enter a complete http:// or https:// credential reference URL.');
    await focused('#profile-field-credentials [id^="profile-reference-"] input');
    assert.equal(await page.locator('#profile-field-name input').inputValue(), 'Synthetic unsaved name');
    assert.deepEqual(writes, [], 'Validation navigation must not save or submit anything.');
    assert.deepEqual(errors, []);
    console.log(`${engine} ${locale}: missing-field summary, collapsed sections, input focus, categories, terms, URLs, nested service/credential editors and unsaved data passed.`);
    await context.close();
  }
} finally { await browser.close(); }
