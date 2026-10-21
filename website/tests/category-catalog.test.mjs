import assert from 'node:assert/strict';
import test from 'node:test';
import { availableCategories, categorySelectionValid } from '../lib/category-specialties.ts';
import { mapCategoryCatalog } from '../lib/marketplace-categories.ts';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import * as categoryState from '../lib/category-specialties.ts';
import { MARKETPLACE_TAXONOMY_CATEGORIES } from '../lib/marketplace-taxonomy.ts';
import { getMarketplaceCategoryCopy } from '../lib/i18n/marketplace-content.ts';

const catalog = [
  { id: 'db-yoga', slug: 'yoga', name: 'Yoga', options: [
    { id: 'start_yoga', labels: { en: 'Start yoga', es: 'Empezar yoga', pt: 'Começar yoga' } },
    { id: 'balance', labels: { en: 'Balance', es: 'Equilibrio', pt: 'Equilíbrio' } },
  ] },
  { id: 'legacy-empty', slug: 'mindfulness_breathwork', name: 'Meditation', options: [] },
  { id: 'db-meditation', slug: 'meditation_mindfulness_breathwork', name: 'Meditation', options: [
    { id: 'mindfulness', labels: { en: 'Mindfulness', es: 'Atención plena', pt: 'Atenção plena' } },
  ] },
];

test('catalog preserves database IDs and hides empty entries without changing history', () => {
  const before = JSON.stringify(catalog);
  const mapped = mapCategoryCatalog([...catalog, catalog[0]]);
  assert.deepEqual(mapped.map(row => row.id), ['db-yoga', 'db-meditation']);
  assert.deepEqual(mapped.map(row => row.stableId), ['yoga', 'meditation_mindfulness_breathwork']);
  assert.equal(mapped[0].publicSlug, 'yoga');
  assert.deepEqual(mapped[0].specialtyLabels.start_yoga, catalog[0].options[0].labels);
  assert.equal(JSON.stringify(catalog), before);
  assert.deepEqual(availableCategories([]), []);
});

test('draft validation requires real specialties, not an approved status', () => {
  const row = { service_category_id: 'db-yoga', is_primary: true, primary_specialty: 'start_yoga',
    secondary_specialties: [], specialty_status: 'pending', options: ['start_yoga', 'balance'] };
  assert.equal(categorySelectionValid([]), false);
  assert.equal(categorySelectionValid([row]), true);
  assert.equal(categorySelectionValid([{ ...row, primary_specialty: 'goals_accountability' }]), false);
  assert.equal(categorySelectionValid([{ ...row, secondary_specialties: ['start_yoga'] }]), false);
  assert.equal(categorySelectionValid([{ ...row, secondary_specialties: ['balance', 'balance'] }]), false);
  assert.equal(categorySelectionValid(Array(4).fill(row)), false);
});

const nodes = node => !React.isValidElement(node) ? [] : [node, ...React.Children.toArray(node.props.children).flatMap(nodes)];
const text = node => typeof node === 'string' ? node : React.isValidElement(node) ? React.Children.toArray(node.props.children).map(text).join(' ') : '';

for (const locale of ['en', 'es-419', 'pt-BR']) test(`first profile selects database categories before saving: ${locale}`, async () => {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let value = [];
  const calls = [];
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((entry, i) => entry !== slots[index][i])) {
        slots[index] = deps; effects.push(effect);
      }
    },
  };
  const mocks = {
    react: hooks, 'react/jsx-runtime': jsx,
    '@/lib/supabase-browser': { getSupabaseBrowserClient: () => ({ rpc: async name => {
      calls.push(name);
      assert.equal(name, 'marketplace_category_catalog');
      return { data: catalog, error: null };
    } }) },
    '@/lib/category-specialties': categoryState,
    '@/lib/i18n/marketplace-content': { getMarketplaceCategoryCopy },
    '@/lib/marketplace-taxonomy': { MARKETPLACE_TAXONOMY_CATEGORIES },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(await readFile(new URL('../components/marketplace/CategorySpecialties.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require(name) { assert.ok(name in mocks, name); return mocks[name]; }, window: { confirm: () => true } });
  const render = () => {
    cursor = 0;
    return exports.default({ profileId: null, locale, initialServices: value, onChange: next => { value = next; } });
  };
  render();
  for (const effect of effects) effect();
  effects = [];
  await new Promise(resolve => setImmediate(resolve));
  const copy = categoryState.categoryCopy[locale];
  let tree = render();
  const chooser = nodes(tree).find(node => node.type === 'select' && node.props['aria-label'] === copy.choose);
  assert.deepEqual(nodes(chooser).filter(node => node.type === 'option' && node.props.value).map(node => node.props.value), ['db-yoga', 'db-meditation']);
  chooser.props.onChange({ target: { value: 'db-yoga' } });
  tree = render();
  nodes(tree).find(node => node.type === 'button' && text(node) === copy.add).props.onClick();
  tree = render();
  const primary = nodes(tree).find(node => node.type === 'select' && !node.props['aria-label']);
  assert.ok(text(primary).includes(catalog[0].options[0].labels[locale.split('-')[0]]));
  primary.props.onChange({ target: { value: 'start_yoga' } });
  tree = render();
  assert.equal(value[0].service_category_id, 'db-yoga');
  assert.equal(value[0].primary_specialty, 'start_yoga');
  assert.equal(categorySelectionValid(value), true);
  assert.deepEqual(calls, ['marketplace_category_catalog'], 'Draft selection does not create or publish a profile.');
  assert.ok(!nodes(tree).some(node => node.type === 'button' && text(node) === copy.save));
});
