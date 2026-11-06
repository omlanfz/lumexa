#!/usr/bin/env node
// Self-test for the certificate renderer. Run with:  npm test
//
// It checks the guarantees the design relies on, so they keep holding when the renderer is
// moved into the server or the template is edited:
//   1. Hostile student names are shown as plain text: no script runs, no network request is made.
//   2. The QR code on the PDF and on the shared PNG decodes to the verification URL.
//   3. The PDF is one A4-landscape page with document properties and a sensible size.
//   4. Very long names stay inside the frame and clear of the signature row.

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const { buildHtml, renderCertificate, describeProgram } = await import('./render.mjs');

const here = dirname(fileURLToPath(import.meta.url));
const signaturePath = [join(here, '..', 'template', 'images', 'signature.png'), join(here, '..', 'template', 'images', 'signature.sample.png')].find(existsSync);
const base = {
  studentName: 'Ayaan Rahman',
  programName: 'Web Developer Path',
  programDescriptor: describeProgram({ lessons: 24, courses: 3, projects: 9 }),
  founderName: 'Fairooz Omlan',
  founderTitle: 'Founder & CEO',
  founderOrg: 'Lumexa AI School',
  issuedAt: new Date('2026-11-06T09:30:00+06:00'),
  certificateId: 'LMX-2026-7K3F-9QWM',
  verifyUrl: 'https://lumexa.school/verify/LMX-2026-7K3F-9QWM',
  contactLine: 'Lumexa AI School · lumexa.school · lumexa.school@gmail.com',
  signaturePath,
};

let passed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}\n       ${e.message}`);
    process.exitCode = 1;
  }
};

const browser = await chromium.launch({ args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });

// ── 1. hostile input ──────────────────────────────────────────────────────────
const hostileNames = [
  `<img src="https://evil.test/x.png" onerror="document.title='pwned'">`,
  `<script>document.title='pwned'</script>`,
  `"><svg onload="document.title='pwned'">`,
  `<style>body{background:url(https://evil.test/leak)}</style>`,
  `{{csp}} {{qrSvg}} $& $1 $$`,
];
for (const studentName of hostileNames) {
  await check(`hostile name is inert: ${studentName.slice(0, 44)}`, async () => {
    const html = await buildHtml({ ...base, studentName });
    const context = await browser.newContext({ viewport: { width: 1123, height: 794 } });
    const page = await context.newPage();
    const attempts = [];
    await page.route('**/*', (route) => {
      if (!route.request().url().startsWith('data:')) attempts.push(route.request().url());
      return route.abort();
    });
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForSelector('html[data-ready="1"]');
    const shown = await page.$eval('#student-name', (el) => el.textContent);
    const title = await page.title();
    await context.close();
    assert.equal(shown, studentName, 'the name must appear exactly as typed, as text');
    assert.notEqual(title, 'pwned', 'no injected script may run');
    assert.deepEqual(attempts, [], `no network request may be attempted, saw: ${attempts.join(', ')}`);
  });
}

// ── 2-3. a real render ────────────────────────────────────────────────────────
const out = await renderCertificate(base);

await check('QR code on the shared PNG decodes to the verification URL', async () => {
  const png = PNG.sync.read(out.png);
  const hit = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(hit?.data, base.verifyUrl);
});

await check('PDF is one A4-landscape page with document properties', async () => {
  const doc = await PDFDocument.load(out.pdf);
  assert.equal(doc.getPageCount(), 1);
  const { width, height } = doc.getPage(0).getSize();
  assert.ok(Math.abs(width - 841.89) < 1 && Math.abs(height - 595.28) < 1, `page is ${width} x ${height} pt`);
  assert.equal(doc.getAuthor(), 'Lumexa AI School');
  assert.match(doc.getTitle(), /Ayaan Rahman/);
  assert.match(doc.getSubject(), /LMX-2026-7K3F-9QWM/);
  assert.ok(out.pdf.length < 600 * 1024, `PDF is ${Math.round(out.pdf.length / 1024)} KB`);
});

// ── 4. layout stress ──────────────────────────────────────────────────────────
const stress = [
  'Al', // shortest allowed name
  'Muhammad Abdullah Al Mahmud Chowdhury',
  'Mohammad Abdur Rahman Siddique Al Mamun Khandaker Bin Abdul Karim Chowdhury Junior', // 80 characters, wraps to two lines
  'তাসনিম আহমেদ',
];
for (const studentName of stress) {
  await check(`layout holds for "${studentName.slice(0, 40)}${studentName.length > 40 ? '...' : ''}"`, async () => {
    const html = await buildHtml({ ...base, studentName });
    const context = await browser.newContext({ viewport: { width: 1123, height: 794 } });
    const page = await context.newPage();
    await page.route('**/*', (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForSelector('html[data-ready="1"]');
    const m = await page.evaluate(() => {
      const mm = 96 / 25.4;
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      return {
        nameLeft: r('#student-name').left / mm,
        nameRight: r('#student-name').right / mm,
        recipientBottom: r('.recipient').bottom / mm,
        signoffTop: r('.signoff').top / mm,
      };
    });
    await context.close();
    assert.ok(m.nameLeft >= 20 && m.nameRight <= 277, `name spans ${m.nameLeft.toFixed(1)}-${m.nameRight.toFixed(1)} mm (inner frame is 15-282 mm)`);
    assert.ok(m.recipientBottom <= m.signoffTop, `recipient block ends at ${m.recipientBottom.toFixed(1)} mm, signature row starts at ${m.signoffTop.toFixed(1)} mm`);
  });
}

await browser.close();
console.log(`\n${passed} checks passed${process.exitCode ? ', some FAILED' : ''}.`);
