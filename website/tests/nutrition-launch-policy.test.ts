import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryAvailable, nutritionLaunchPolicy, scopeCopy } from '../lib/launch-scope.ts';
test('nonclinical nutrition and regulated dietetics have independent disabled gates', () => {
  assert.equal(nutritionLaunchPolicy.coachingEnabled, false);
  assert.equal(nutritionLaunchPolicy.regulatedEnabled, false);
  assert.notEqual(nutritionLaunchPolicy.coachingCategoryId, nutritionLaunchPolicy.regulatedCategoryId);
  for (const category of ['nutrition', 'dietetics']) assert.equal(categoryAvailable(category), false);
  for (const locale of ['en', 'es-419', 'pt-BR'] as const) {
    assert.deepEqual(Object.keys(scopeCopy[locale]).sort(), Object.keys(scopeCopy.en).sort());
    assert.ok(Object.values(scopeCopy[locale]).every(Boolean));
  }
});
