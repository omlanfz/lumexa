import test from 'node:test';
import assert from 'node:assert/strict';
import { isVerificationResult, loadVerification } from './verification.ts';

const RECORD = {
  certificateId: 'LXA-2026-A7K9Q2',
  status: 'ACTIVE',
  recipientName: 'Nusrat Jahan Tamanna',
  programName: 'AI Builder',
  completionDate: '2026-10-29',
  issueDate: '2026-11-06',
  issuedBy: 'Lumexa AI School',
  revokedOn: null,
  replacedOn: null,
  replacedBy: null,
};

const BASE = 'https://api.example.test';

const respond = (status: number, body?: unknown): typeof fetch =>
  (() =>
    Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )) as typeof fetch;

test('a valid record is found', async () => {
  const outcome = await loadVerification('LXA-2026-A7K9Q2', { baseUrl: BASE, fetchImpl: respond(200, RECORD) });
  assert.equal(outcome.kind, 'found');
  assert.deepEqual(outcome.kind === 'found' && outcome.certificate, RECORD);
});

test('only the public certificate fields are kept — anything else the API sends is dropped', async () => {
  const leaky = { ...RECORD, email: 'child@example.com', whatsappNumber: '+8801700000000', studentUserId: 'u1', pdfKey: 'certificates/x.pdf' };
  const outcome = await loadVerification('LXA-2026-A7K9Q2', { baseUrl: BASE, fetchImpl: respond(200, leaky) });
  assert.equal(outcome.kind, 'found');
  const text = JSON.stringify(outcome);
  for (const secret of ['child@example.com', '+8801700000000', 'u1', 'certificates/x.pdf']) {
    assert.ok(!text.includes(secret), secret);
  }
});

test('revoked and replaced records keep their extra facts', async () => {
  const replaced = {
    ...RECORD,
    status: 'REPLACED',
    replacedOn: '2026-11-07',
    replacedBy: { certificateId: 'LXA-2026-B8L0R3', issueDate: '2026-11-07' },
  };
  const outcome = await loadVerification('x', { baseUrl: BASE, fetchImpl: respond(200, replaced) });
  assert.equal(outcome.kind === 'found' && outcome.certificate.replacedBy?.certificateId, 'LXA-2026-B8L0R3');
  const revoked = { ...RECORD, status: 'REVOKED', revokedOn: '2026-11-08' };
  const out2 = await loadVerification('x', { baseUrl: BASE, fetchImpl: respond(200, revoked) });
  assert.equal(out2.kind === 'found' && out2.certificate.revokedOn, '2026-11-08');
});

test('an unknown certificate is "not found"', async () => {
  const outcome = await loadVerification('LXA-2026-ZZZZZZ', {
    baseUrl: BASE,
    fetchImpl: respond(404, { message: 'No certificate with this ID was found.' }),
  });
  assert.deepEqual(outcome, { kind: 'not-found' });
});

test('failures to ask are "unavailable", never "not found" or "invalid"', async () => {
  for (const status of [429, 500, 502, 503]) {
    assert.deepEqual(await loadVerification('x', { baseUrl: BASE, fetchImpl: respond(status, {}) }), { kind: 'unavailable' }, String(status));
  }
  const network = (() => Promise.reject(new Error('offline'))) as typeof fetch;
  assert.deepEqual(await loadVerification('x', { baseUrl: BASE, fetchImpl: network }), { kind: 'unavailable' });
  assert.deepEqual(await loadVerification('x', { baseUrl: '', fetchImpl: respond(200, RECORD) }), { kind: 'unavailable' });
});

test('a malformed answer is never rendered as a certificate', async () => {
  assert.deepEqual(await loadVerification('x', { baseUrl: BASE, fetchImpl: respond(200, { hello: 'world' }) }), { kind: 'unavailable' });
  assert.deepEqual(await loadVerification('x', { baseUrl: BASE, fetchImpl: respond(200, { ...RECORD, status: 'VALID' }) }), { kind: 'unavailable' });
  const notJson = (() => Promise.resolve(new Response('<html>oops</html>', { status: 200 }))) as typeof fetch;
  assert.deepEqual(await loadVerification('x', { baseUrl: BASE, fetchImpl: notJson }), { kind: 'unavailable' });
});

test('the request asks for a fresh answer every time and encodes the ID', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const spy = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(JSON.stringify(RECORD), { status: 200 }));
  }) as unknown as typeof fetch;
  await loadVerification('LXA/2026 A7', { baseUrl: `${BASE}/`, fetchImpl: spy });
  assert.equal(calls[0].url, `${BASE}/certificates/verify/LXA%2F2026%20A7`);
  assert.equal(calls[0].init?.cache, 'no-store');
});

test('isVerificationResult is strict about shape', () => {
  assert.equal(isVerificationResult(RECORD), true);
  assert.equal(isVerificationResult(null), false);
  assert.equal(isVerificationResult({ ...RECORD, replacedBy: undefined }), false);
  assert.equal(isVerificationResult({ ...RECORD, completionDate: 20261029 }), false);
});
