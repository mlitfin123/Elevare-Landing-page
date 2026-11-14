import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { before, after, test } from 'node:test';
import path from 'node:path';

// Run after a production build. Requests go to next start, never next dev.
const root = process.cwd();
const source = readFileSync(path.join(root, 'public/stagelab-coach-agreement.html'), 'utf8');
const cleanPath = '/stagelab-coach-agreement/';
const canonical = 'https://www.elevarefit.com' + cleanPath;
let server;
let origin;
let output = '';

before(async () => {
  assert.ok(existsSync(path.join(root, '.next/BUILD_ID')), 'Run a production build first');
  const portReservation = createServer();
  portReservation.listen(0, '127.0.0.1');
  await once(portReservation, 'listening');
  const port = portReservation.address().port;
  await new Promise(resolve => portReservation.close(resolve));
  origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [
    path.join(root, 'node_modules/next/dist/bin/next'),
    'start', '--hostname', '127.0.0.1', '--port', String(port),
  ], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    assert.equal(server.exitCode, null, `Production server exited: ${output}`);
    try {
      // A static asset avoids unrelated runtime marketplace dependencies.
      if ((await fetch(origin + '/stagelab-coach-agreement.html', { signal: AbortSignal.timeout(2000) })).status === 200) return;
    } catch { /* Server not listening yet. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Production server did not start: ${output}`);
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
});

function assertAgreement(html) {
  assert.match(html, /<h1>Coach Agreement<\/h1>/);
  assert.match(html, /Effective Date: September 29, 2026/);
  assert.equal(html, source, 'Serve the authoritative document without rewriting it');
  const canonicals = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/gi)];
  assert.equal(canonicals.length, 1, 'Exactly one canonical per response');
  assert.equal(canonicals[0][1], canonical);
}

test('canonical clean URL serves the actual unchanged Coach Agreement', async () => {
  const response = await fetch(origin + cleanPath, { redirect: 'manual' });
  assert.equal(response.status, 200, 'Clean agreement URL must serve directly');
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  assert.equal(response.headers.get('location'), null);
  assertAgreement(await response.text());
});

test('old .html URL works without a redirect loop or competing canonical', async () => {
  let url = origin + '/stagelab-coach-agreement.html';
  const seen = new Set();
  for (let hop = 0; hop < 5; hop++) {
    assert.ok(!seen.has(url), 'No redirect loop');
    seen.add(url);
    const response = await fetch(url, { redirect: 'manual' });
    if (response.status === 200) {
      assertAgreement(await response.text());
      return;
    }
    assert.ok([301, 302, 307, 308].includes(response.status));
    const location = response.headers.get('location');
    assert.ok(location);
    url = new URL(location, url).href;
    assert.equal(url, origin + cleanPath, 'Legacy redirects must target the clean URL');
  }
  assert.fail('Too many agreement redirects');
});

for (const [label, page] of [
  ['coach footer', '/stagelab/coaches/start/'],
  ['StageLab support', '/stagelab-legal/'],
]) {
  test(`${label} links reach the canonical agreement`, async () => {
    const response = await fetch(origin + page);
    assert.equal(response.status, 200, page);
    const html = await response.text();
    const markup = label === 'coach footer' ? html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i)?.[0] : html;
    assert.ok(markup, 'Expected linking page content');
    const links = [...markup.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .filter(match => /Coach(?: Agreement)?/.test(match[2]) && match[1].includes('stagelab-coach-agreement'));
    assert.ok(links.length > 0, 'Expected Coach Agreement link');
    for (const link of links) {
      assert.equal(link[1], cleanPath);
      const destination = await fetch(new URL(link[1], origin), { redirect: 'manual' });
      assert.equal(destination.status, 200);
      assertAgreement(await destination.text());
    }
  });
}

test('an unknown URL remains a 404 rather than a 200 agreement fallback', async () => {
  const response = await fetch(origin + '/stagelab-coach-agreement-missing/', { redirect: 'manual' });
  assert.equal(response.status, 404);
});
