import assert from 'node:assert/strict';
import test from 'node:test';
import { requestProfessionalPublication } from '../lib/professional-publication-response.ts';
const payload = { action: 'profile' };
const record = { profile: { id: 'fixture', updated_at: '2026-10-23T12:00:00Z' }, status: { marketplace_status: 'draft' }, credentials: [] };
const response = (status: number, body: unknown): typeof fetch => async () => Response.json(body, { status });
test('only confirmed profile writes can display saved status', async () => {
  for (const propagation of ['current', 'delayed']) {
    const result = await requestProfessionalPublication(payload, 'fixture', response(200, { record, propagation }));
    assert.equal(result.error, null);
    assert.deepEqual(result.data, record);
  }
  for (const body of [{}, { record: null, propagation: 'current' }, { record: {}, propagation: 'delayed' }, { record, propagation: 'unknown' }]) {
    assert.equal((await requestProfessionalPublication(payload, 'fixture', response(200, body))).error?.code, 'network');
  }
});
test('expired sessions, conflicts and rejected writes remain distinct from unknown outcomes', async () => {
  for (const [status, code] of [[401, 'unauthorized'], [409, 'conflict'], [400, 'invalid_request'], [422, 'save_failed'], [503, 'network']] as const) {
    assert.equal((await requestProfessionalPublication(payload, 'fixture', response(status, {}))).error?.code, code);
  }
  assert.equal((await requestProfessionalPublication(payload, 'fixture', async () => { throw Error('lost connection'); })).error?.code, 'network');
  assert.equal((await requestProfessionalPublication(payload, 'fixture', async () => new Response('<html>proxy error</html>'))).error?.code, 'network');
});
test('publication-only retries send the owner token without repeating a profile write', async () => {
  const result = await requestProfessionalPublication({ action: 'retry' }, 'fixture-token', async (_url, init) => {
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture-token');
    assert.deepEqual(JSON.parse(String(init?.body)), { action: 'retry' });
    return Response.json({ record: null, propagation: 'current' });
  });
  assert.equal(result.error, null);
});
