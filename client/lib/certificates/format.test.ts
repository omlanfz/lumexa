import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMAIL_STATUS_LABEL,
  apiErrorMessage,
  auditActionLabel,
  certificateFileName,
  firstName,
  formatBytes,
  formatCertificateDate,
  readBlobError,
  studentStatusLabel,
  verificationHeadline,
} from './format.ts';

test('dates read like the certificate: day, month name, year', () => {
  assert.equal(formatCertificateDate('2026-10-29'), '29 October 2026');
  assert.equal(formatCertificateDate('2026-01-05'), '5 January 2026');
  assert.equal(formatCertificateDate('2027-12-31'), '31 December 2027');
});

test('a date is formatted from its text, never through a timezone', () => {
  const original = process.env.TZ;
  try {
    for (const tz of ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Asia/Dhaka', 'UTC']) {
      process.env.TZ = tz;
      assert.equal(formatCertificateDate('2026-11-06'), '6 November 2026', tz);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('something that is not a calendar day is returned unchanged', () => {
  assert.equal(formatCertificateDate('soon'), 'soon');
  assert.equal(formatCertificateDate('2026-13-01'), '2026-13-01');
  assert.equal(formatCertificateDate(''), '');
});

test('downloads are saved under the same name the server uses', () => {
  assert.equal(certificateFileName('LXA-2026-A7K9Q2', 'pdf'), 'Lumexa-Certificate-LXA-2026-A7K9Q2.pdf');
  assert.equal(certificateFileName('LXA-2026-A7K9Q2', 'png'), 'Lumexa-Certificate-LXA-2026-A7K9Q2.png');
});

test('statuses are worded for students and for verifiers', () => {
  assert.equal(studentStatusLabel('ACTIVE'), 'Verified · Active');
  assert.equal(studentStatusLabel('REVOKED'), 'Revoked');
  assert.equal(studentStatusLabel('REPLACED'), 'Replaced');
  assert.equal(verificationHeadline('ACTIVE'), 'This certificate is valid');
  assert.match(verificationHeadline('REVOKED'), /revoked/i);
  assert.match(verificationHeadline('REPLACED'), /replaced/i);
});

test('audit actions read as sentences, and unknown ones still read sensibly', () => {
  assert.equal(auditActionLabel('CERTIFICATE_ISSUED'), 'Certificate issued');
  assert.equal(auditActionLabel('CERTIFICATE_REVOKED'), 'Revoked');
  assert.equal(auditActionLabel('CERTIFICATE_SOMETHING_NEW'), 'Something new');
});

test('every email status has a label', () => {
  for (const status of ['PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED'] as const) {
    assert.ok(EMAIL_STATUS_LABEL[status].length > 0);
  }
});

test('file sizes and first names', () => {
  assert.equal(formatBytes(null), '—');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(1_572_864), '1.5 MB');
  assert.equal(firstName('Nusrat Jahan Tamanna'), 'Nusrat');
  assert.equal(firstName('  Ada  '), 'Ada');
  assert.equal(firstName(null), '');
});

test('an API error becomes a readable sentence', () => {
  assert.equal(apiErrorMessage({ response: { data: { message: 'Nothing was issued.' } } }, 'x'), 'Nothing was issued.');
  assert.equal(apiErrorMessage({ response: { data: { message: ['a', 'b'] } } }, 'x'), 'a b');
  assert.equal(apiErrorMessage({}, 'fallback'), 'fallback');
  assert.equal(apiErrorMessage(null, 'fallback'), 'fallback');
  assert.equal(apiErrorMessage({ response: { data: { message: '   ' } } }, 'fallback'), 'fallback');
});

test('a failed FILE request still gives the server\'s own message', async () => {
  const body = JSON.stringify({ message: 'FRONTEND_URL is not set.' });
  const err = { response: { data: new Blob([body], { type: 'application/json' }) } };
  // as axios hands it over, the message is locked inside a Blob…
  assert.equal(apiErrorMessage(err, 'fallback'), 'fallback');
  // …until it is read back out
  assert.equal(await readBlobError(err), err);
  assert.equal(apiErrorMessage(err, 'fallback'), 'FRONTEND_URL is not set.');
});

test('reading a failure body never throws and never changes what it cannot read', async () => {
  const html = { response: { data: new Blob(['<html>Bad gateway</html>'], { type: 'text/html' }) } };
  await readBlobError(html);
  assert.ok(html.response.data instanceof Blob); // left alone
  assert.equal(apiErrorMessage(html, 'fallback'), 'fallback');

  const parsed = { response: { data: { message: 'Already parsed.' } } };
  await readBlobError(parsed);
  assert.equal(apiErrorMessage(parsed, 'fallback'), 'Already parsed.');

  const offline = new Error('Network Error');
  assert.equal(await readBlobError(offline), offline);
  assert.equal(await readBlobError(null), null);
});
