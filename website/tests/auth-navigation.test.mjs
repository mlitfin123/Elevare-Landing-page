import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import * as config from '../lib/i18n/config.ts';
import { getShellMessages } from '../lib/i18n/shell-messages.ts';
import { getAuthReturnPath, getAuthConfirmationPath, getOAuthCallbackPath, getPostAuthDestination } from '../lib/auth-redirect.ts';

const nodes = node => !React.isValidElement(node) ? [] : [node, ...React.Children.toArray(node.props.children).flatMap(nodes)];

async function render(name, pathname) {
  const mocks = {
    'react/jsx-runtime': jsx,
    react: { useState: initial => [initial, () => {}], useRef: initial => ({ current: initial }), useEffect: () => {} },
    'next/link': { default: 'Link' },
    'next/image': { default: 'Image' },
    'next/navigation': { usePathname: () => pathname },
    '@/components/AuthNavigationLink': { AuthNavigationLink: 'AuthNavigationLink' },
    '@/components/TrackedLink': { TrackedLink: 'TrackedLink' },
    '@/components/localization/LanguageSelector': { LanguageSelector: 'LanguageSelector' },
    '@/components/localization/TranslationFeedback': { TranslationFeedback: 'TranslationFeedback' },
    '@/lib/i18n/config': config,
    '@/lib/i18n/shell-messages': { getShellMessages },
    '@/lib/i18n/marketplace-content': { marketplaceText: (_, value) => value },
    '@/lib/stage-analysis-discovery': { analysisDiscoveryCopy: {}, getStageAnalysisEntryHref: () => '' },
    '@/lib/stage-analysis': { STAGE_ANALYSIS_PRODUCTS: [] },
    '@/lib/site': { siteConfig: { contacts: { support: 'support@example.test' } } },
  };
  const exports = {};
  const source = await readFile(new URL(`../components/${name}.tsx`, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require(id) { assert.ok(id in mocks, id); return mocks[id]; } });
  return exports[name]();
}

for (const [locale, prefix] of [['en', ''], ['es-419', '/es'], ['pt-BR', '/pt-br']]) {
  for (const component of ['Header', 'Footer']) test(`${component} sign-in goes directly to the account dashboard: ${locale}`, async () => {
    const tree = await render(component, `${prefix}/`);
    const link = nodes(tree).find(node => node.type === 'AuthNavigationLink');
    assert.ok(link);
    const destination = `${prefix}/account/`;
    assert.equal(link.props.signedInHref, destination);
    const signIn = new URL(link.props.signInHref, 'https://example.test');
    assert.equal(signIn.pathname, '/sign-in/');
    const redirect = signIn.searchParams.get('redirect');
    assert.equal(redirect, destination);
    assert.equal(getAuthReturnPath(redirect, null, locale), destination);
    const callback = new URL(getOAuthCallbackPath({ redirect, intent: null, locale, isSignup: false }), 'https://example.test');
    assert.equal(getAuthReturnPath(callback.searchParams.get('redirect'), null, locale), destination);
    const confirmation = new URL(getAuthConfirmationPath(redirect, null, locale), 'https://example.test');
    assert.equal(getPostAuthDestination({ redirect: confirmation.searchParams.get('redirect'), intent: null, locale,
      professionalStatus: null, professionalStateLoaded: true }), destination);
    if (component === 'Header') {
      assert.equal(nodes(tree).find(node => node.props.className === 'brand-lockup').props.href, prefix || '/');
    }
  });
}

test('specific authenticated actions retain their destination and query state', () => {
  for (const destination of ['/account/saved/', '/account/client-requests/?tab=new', '/professionals/synthetic-profile/#inquiry']) {
    assert.equal(getAuthReturnPath(destination, null, 'en'), destination);
  }
  assert.equal(getAuthReturnPath('https://example.test/', null, 'en'), '/account/');
  assert.equal(getAuthReturnPath('//example.test/', null, 'en'), '/account/');
});
