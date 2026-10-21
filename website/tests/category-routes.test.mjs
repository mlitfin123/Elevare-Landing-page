import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

async function loadRoute(path, mocks = {}) {
  const exports = {};
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => mocks[name] ?? {} });
  return exports;
}

test('professional routes resolve current database categories at request time', async () => {
  const marketplace = {
    getMarketplaceCategories() { throw new Error('Request-only catalog read during static generation'); },
  };
  const route = await loadRoute('../app/professionals/[slug]/page.tsx', { '@/lib/marketplace': marketplace });
  assert.equal(route.dynamicParams, true);
  assert.equal(route.generateStaticParams, undefined);

  const localized = await loadRoute('../app/[locale]/[[...slug]]/page.tsx', {
    '@/lib/marketplace': marketplace,
    '@/lib/i18n/config': { getLocalizedRouteParams: () => [{ locale: 'es', slug: [] }], localeToSegment: value => value.split('-')[0] },
    '@/lib/training': { getAllExercises: async () => [{ slug: 'squat' }], getAllWorkoutTemplates: async () => [{ slug: 'beginner' }] },
    '@/lib/nutrition': { getNutritionRestaurants: async () => [{ slug: 'example' }] },
    '@/lib/training-data': { EXERCISE_MUSCLE_CATEGORIES: [], EXERCISE_EQUIPMENT_CATEGORIES: [], WORKOUT_GOALS: [] },
    '@/lib/nutrition-pages': { fastFoodNutritionViews: [], restaurantNutritionViews: [] },
    '@/lib/tools': { tools: [] },
  });
  assert.equal(localized.dynamicParams, true);
  const params = await localized.generateStaticParams();
  for (const locale of ['es', 'pt']) {
    assert.ok(params.some(row => row.locale === locale && row.slug.join('/') === 'exercises/squat'));
    assert.ok(params.some(row => row.locale === locale && row.slug.join('/') === 'professionals'));
    assert.ok(!params.some(row => row.locale === locale && row.slug[0] === 'professionals' && row.slug.length > 1));
  }
});
