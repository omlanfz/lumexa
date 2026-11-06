#!/usr/bin/env node
// Self-test for the certificate renderer. Run with:  npm test
//
// It checks the guarantees the design relies on, so they keep holding when the renderer is
// moved into the server or the template is edited:
//   1. Hostile student names are shown as plain text: no script runs, no network request is made.
//   2. The QR code on the PDF and on the shared PNG decodes to the verification URL.
//   3. The PDF is one A4-landscape page with document properties and a sensible size.
//   4. Very long names stay inside the frame and clear of the signature row.
//   5. Every program icon draws every one of its shapes (a past bug deleted the size of <rect>s).
//   6. Certificate IDs are well-formed, unique and carry the program code; bad icon names are refused.

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const { buildHtml, renderCertificate, describeProgram, generateCertificateId, CERTIFICATE_ID_PATTERN, PROGRAM_CODES } = await import('./render.mjs');

const here = dirname(fileURLToPath(import.meta.url));
const signaturePath = [join(here, '..', 'template', 'images', 'signature.png'), join(here, '..', 'template', 'images', 'signature.sample.png')].find(existsSync);
const base = {
  studentName: 'Ayaan Rahman',
  programName: 'Web Developer Path',
  programIcon: 'globe',
  programDescriptor: describeProgram({ lessons: 24, courses: 3, projects: 9 }),
  founderName: 'Fairooz Omlan',
  founderTitle: 'Founder & CEO',
  founderOrg: 'Lumexa AI School',
  completedAt: new Date('2026-11-06T09:30:00+06:00'),
  certificateId: 'LMX-WD-2026-7K3F-9QWM',
  verifyUrl: 'https://lumexa.school/verify/LMX-WD-2026-7K3F-9QWM',
  contactLine: 'lumexa.school@gmail.com',
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });

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
  assert.match(doc.getSubject(), /LMX-WD-2026-7K3F-9QWM/);
  assert.ok(out.pdf.length < 600 * 1024, `PDF is ${Math.round(out.pdf.length / 1024)} KB`);
});

// ── 4. layout stress ──────────────────────────────────────────────────────────
const stress = [
  'Al', // shortest allowed name
  'Muhammad Abdullah Al Mahmud Chowdhury',
  'Mohammad Abdur Rahman Siddique Al Mamun Khandaker Bin Abdul Karim Chowdhury Junior', // 80 characters, wraps to two lines
  'তাসনিম আহমেদ',
];
for (const [studentName, honors] of [...stress.map((n) => [n, undefined]), [stress[2], 'with Distinction']]) {
  await check(`layout holds for "${studentName.slice(0, 40)}${studentName.length > 40 ? '...' : ''}"${honors ? ' + Distinction line' : ''}`, async () => {
    const html = await buildHtml({ ...base, studentName, honors });
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

// ── 5. icons ──────────────────────────────────────────────────────────────────
const programs = JSON.parse(readFileSync(join(here, 'programs.json'), 'utf8'));
for (const [, p] of Object.entries(programs).filter(([k]) => !k.startsWith('_'))) {
  await check(`program badge renders for ${p.name} (icon ${p.icon})`, async () => {
    const html = await buildHtml({ ...base, programName: p.name, programIcon: p.icon });
    const context = await browser.newContext({ viewport: { width: 1123, height: 794 } });
    const page = await context.newPage();
    await page.route('**/*', (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForSelector('html[data-ready="1"]');
    const m = await page.evaluate(() => {
      const mm = 96 / 25.4;
      const svg = document.querySelector('.pill svg');
      const shapes = [...svg.querySelectorAll('path, line, rect, circle, polyline, polygon, ellipse')];
      const pill = document.querySelector('.pill').getBoundingClientRect();
      return {
        iconWidth: svg.getBoundingClientRect().width / mm,
        shapes: shapes.length,
        collapsed: shapes.filter((s) => { const b = s.getBoundingClientRect(); return b.width === 0 && b.height === 0; }).length,
        pillLeft: pill.left / mm,
        pillRight: pill.right / mm,
      };
    });
    await context.close();
    assert.ok(m.iconWidth > 5, `icon is ${m.iconWidth.toFixed(1)} mm wide`);
    assert.ok(m.shapes > 0, 'icon has shapes');
    assert.equal(m.collapsed, 0, `${m.collapsed} of ${m.shapes} icon shapes have no size`);
    assert.ok(m.pillLeft >= 24 && m.pillRight <= 273, `badge spans ${m.pillLeft.toFixed(0)}-${m.pillRight.toFixed(0)} mm`);
  });
}

// ── 6. IDs and refused input ──────────────────────────────────────────────────
await check('certificate IDs: well-formed, unique, program code present', async () => {
  const seen = new Set();
  for (const slug of Object.keys(PROGRAM_CODES)) {
    for (let i = 0; i < 200; i++) {
      const id = generateCertificateId(slug, 2026);
      assert.match(id, CERTIFICATE_ID_PATTERN);
      assert.ok(id.startsWith(`LMX-${PROGRAM_CODES[slug]}-2026-`), id);
      seen.add(id);
    }
  }
  assert.equal(seen.size, Object.keys(PROGRAM_CODES).length * 200, 'no duplicates in 1,400 IDs');
  assert.throws(() => generateCertificateId('some-custom-course'), /No certificate code/);
});

await check('icon names that are not plain file names are refused', async () => {
  for (const programIcon of ['../../../etc/passwd', 'globe/../../x', 'GLOBE', 'nope', '']) {
    await assert.rejects(buildHtml({ ...base, programIcon }), /Unknown program icon/, `icon "${programIcon}"`);
  }
});

await browser.close();
console.log(`\n${passed} checks passed${process.exitCode ? ', some FAILED' : ''}.`);
