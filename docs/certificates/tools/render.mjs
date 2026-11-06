#!/usr/bin/env node
// Reference renderer for the Lumexa certificate.
//
// This is the "HTML -> PDF" step, written as a small standalone module so the same
// code can be moved into the NestJS server (server/src/certificates/) later.
//
//   fill template.html  ->  headless Chromium  ->  PDF (print) + PNG (sharing)
//
// Usage (see the README for setup):
//   node tools/render.mjs                    render every sample in tools/samples.json
//   node tools/render.mjs --only main,long   render only some of them
//   node tools/render.mjs --out ./my-folder  write somewhere else
//
// As a library:
//   import { renderCertificate } from './tools/render.mjs';
//   const { pdf, png, preview, shareCard } = await renderCertificate({ ...data });

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(here, '..', 'template');
// createRequire (instead of `import`) so the packages resolve normally *or* through NODE_PATH.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const QRCode = require('qrcode');
const { PDFDocument } = require('pdf-lib');

// ── Content helpers ───────────────────────────────────────────────────────────

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => (Number.isInteger(n) && n >= 0 && n <= 12 ? WORDS[n] : String(n));

/** The one factual sentence under the program name. Counts come from the database
 *  at issue time (modules, lessons, projects), never hard-coded per program. */
export function describeProgram({ lessons, courses, projects }) {
  let s = `A live, teacher-led program of ${lessons} lessons across ${word(courses)} courses`;
  if (projects > 0) s += ` and ${word(projects)} hands-on projects`;
  return `${s}.`;
}

/** The rule the certificate is awarded under. It is printed on the certificate and shown on the
 *  public verification page, so it must describe what the system really enforces. */
export const AWARD_CRITERION = 'Awarded on passing the Final Test.';

/** "6 November 2026" in Dhaka time, so a certificate issued at 1 a.m. never shows yesterday. */
export function formatIssueDate(date, timeZone = 'Asia/Dhaka') {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(date);
}

export const escapeHtml = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ── Template assembly ─────────────────────────────────────────────────────────

const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const dataUri = (file) => {
  const ext = file.slice(file.lastIndexOf('.'));
  return `data:${mime[ext]};base64,${readFileSync(file).toString('base64')}`;
};

function inlineAssets(html, { signaturePath }) {
  // fonts
  html = html.replace(/url\("fonts\/([^"]+)"\)/g, (_, f) => `url("${dataUri(join(TEMPLATE_DIR, 'fonts', f))}")`);
  // raster images (the founder's signature is supplied by the caller; the template only points at a stand-in)
  html = html.replace(/src="images\/signature\.sample\.png"/g, `src="${dataUri(signaturePath)}"`);
  html = html.replace(/src="images\/([^"]+)"/g, (_, f) => `src="${dataUri(join(TEMPLATE_DIR, 'images', f))}"`);
  // SVG ornaments are inlined (not <img>) so their text uses the page's embedded fonts and stays vector
  html = html.replace(/<img class="([^"]*)" src="ornaments\/([^"]+)" alt="" data-inline-svg>/g, (_, cls, f) => {
    const svg = readFileSync(join(TEMPLATE_DIR, 'ornaments', f), 'utf8').replace(/<\?xml[^>]*\?>\s*/, '');
    return svg.replace('<svg ', `<svg class="${cls}" `);
  });
  return html;
}

async function qrSvg(url) {
  // dark = the brand navy; margin 0 because the template draws a white card (quiet zone) around it
  return QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0B1026', light: '#FFFFFF' } });
}

/** Builds the final, self-contained HTML for one certificate. */
export async function buildHtml(data) {
  const {
    studentName,
    programName,
    programDescriptor,
    awardCriterion = AWARD_CRITERION,
    honors, // optional, e.g. "with Distinction"
    founderName,
    founderTitle,
    founderOrg,
    issuedAt,
    certificateId,
    verifyUrl, // full https URL that the QR code opens
    contactLine,
    signaturePath,
  } = data;

  const verifyUrlDisplay = verifyUrl.replace(/^https?:\/\//, '');
  const honorsBlock = honors ? `<div class="honors"><i></i>${escapeHtml(honors.toUpperCase())}<i></i></div>` : '';

  let html = readFileSync(join(TEMPLATE_DIR, 'certificate.html'), 'utf8');
  html = html.replace(/<!--[\s\S]*?-->/, ''); // the documentation comment at the top is for humans only
  html = inlineAssets(html, { signaturePath });

  // The inline <script> is the only script allowed to run: pin it by hash.
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const scriptHash = createHash('sha256').update(script).digest('base64');
  const csp = `default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'sha256-${scriptHash}'`;

  const text = {
    documentTitle: `Lumexa Certificate of Completion - ${studentName}`,
    studentName,
    programName,
    programDescriptor,
    awardCriterion,
    founderName,
    founderTitle,
    founderOrg,
    issueDate: formatIssueDate(issuedAt),
    certificateId,
    verifyUrlDisplay,
    contactLine,
  };
  const raw = { qrSvg: await qrSvg(verifyUrl), honorsBlock, csp };

  // {{raw}} keys are inserted as-is, {{text}} keys are always HTML-escaped (student names are user input)
  html = html.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (key in raw) return raw[key];
    if (key in text) return escapeHtml(text[key]);
    throw new Error(`Template placeholder {{${key}}} has no value`);
  });
  return html;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

const lockDown = async (page) =>
  // Belt and braces next to the CSP: nothing but data: URIs may ever be loaded while printing.
  page.route('**/*', (route) => (route.request().url().startsWith('data:') ? route.continue() : route.abort()));

async function withBrowser(fn) {
  const browser = await chromium.launch({ args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

async function openPage(browser, html, scale) {
  const context = await browser.newContext({ viewport: { width: 1123, height: 794 }, deviceScaleFactor: scale });
  const page = await context.newPage();
  await lockDown(page);
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForSelector('html[data-ready="1"]', { timeout: 15000 });
  return { page, context };
}

/** Link-preview image (1200x630) for og:image: the certificate on a branded backdrop. */
async function renderShareCard(browser, png) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await lockDown(page);
  const src = `data:image/png;base64,${png.toString('base64')}`;
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;width:1200px;height:630px;overflow:hidden}
    body{display:flex;align-items:center;justify-content:center;
      background:radial-gradient(1000px 520px at 50% 40%,#2a2f7a 0%,#12163f 55%,#0B1026 100%)}
    img{height:548px;width:auto;border-radius:6px;box-shadow:0 24px 60px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08)}
  </style><img src="${src}">`);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 80 });
  await context.close();
  return jpg;
}

/**
 * Renders one certificate.
 * @returns {{ pdf: Buffer, png: Buffer, preview: Buffer, shareCard: Buffer, html: string, ms: object }}
 */
export async function renderCertificate(data) {
  const ms = {};
  const t0 = Date.now();
  const html = await buildHtml(data);
  ms.fill = Date.now() - t0;

  return withBrowser(async (browser) => {
    let t = Date.now();
    // 1) PDF: print layout, vector text, fonts embedded, tagged for accessibility
    const a = await openPage(browser, html, 1);
    let pdf = await a.page.pdf({
      width: '297mm',
      height: '210mm',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      tagged: true,
    });
    await a.context.close();
    ms.pdf = Date.now() - t;

    // PDF document properties (what Acrobat's "Document Properties" and search tools show)
    t = Date.now();
    const doc = await PDFDocument.load(pdf, { updateMetadata: false });
    doc.setTitle(`Certificate of Completion - ${data.studentName}`);
    doc.setAuthor('Lumexa AI School');
    doc.setSubject(`${data.programName} - ${data.certificateId}`);
    doc.setKeywords(['Lumexa', 'certificate', 'completion', data.certificateId]);
    doc.setCreator('Lumexa certificate service');
    doc.setProducer('Lumexa (Chromium + pdf-lib)');
    doc.setCreationDate(data.issuedAt);
    doc.setModificationDate(data.issuedAt);
    pdf = Buffer.from(await doc.save());
    ms.meta = Date.now() - t;

    // 2) PNG: crisp image of the same page for WhatsApp / Facebook / Instagram / e-mail
    t = Date.now();
    const b = await openPage(browser, html, 2);
    const png = await (await b.page.$('#certificate')).screenshot({ type: 'png' });
    await b.context.close();
    ms.png = Date.now() - t;

    // 3) smaller JPEG preview (e-mail body, dashboard card) and the 1200x630 link-preview card
    t = Date.now();
    const c = await openPage(browser, html, 1.25);
    const preview = await (await c.page.$('#certificate')).screenshot({ type: 'jpeg', quality: 86 });
    await c.context.close();
    const shareCard = await renderShareCard(browser, png);
    ms.extras = Date.now() - t;

    return { pdf, png, preview, shareCard, html, ms };
  });
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const arg = (name) => {
    const i = args.indexOf(name);
    return i > -1 ? args[i + 1] : undefined;
  };
  const outDir = resolve(arg('--out') || join(here, '..', 'samples'));
  const only = arg('--only')?.split(',');
  mkdirSync(outDir, { recursive: true });

  const programs = JSON.parse(readFileSync(join(here, 'programs.json'), 'utf8'));
  const samples = JSON.parse(readFileSync(join(here, 'samples.json'), 'utf8'));
  const founder = { founderName: 'Fairooz Omlan', founderTitle: 'Founder & CEO', founderOrg: 'Lumexa AI School' };
  const signaturePath = [join(TEMPLATE_DIR, 'images', 'signature.png'), join(TEMPLATE_DIR, 'images', 'signature.sample.png')].find(existsSync);

  for (const s of samples) {
    if (only && !only.includes(s.key)) continue;
    const p = programs[s.program];
    const out = await renderCertificate({
      studentName: s.studentName,
      programName: p.name,
      programDescriptor: describeProgram(p),
      honors: s.honors,
      ...founder,
      issuedAt: new Date(s.issuedAt),
      certificateId: s.certificateId,
      verifyUrl: `https://lumexa.school/verify/${s.certificateId}`,
      contactLine: 'Lumexa AI School  ·  lumexa.school  ·  lumexa.school@gmail.com',
      signaturePath,
    });
    const base = join(outDir, `certificate-${s.key}`);
    writeFileSync(`${base}.pdf`, out.pdf);
    writeFileSync(`${base}.png`, out.png);
    writeFileSync(`${base}.preview.jpg`, out.preview);
    writeFileSync(`${base}.share-card.jpg`, out.shareCard);
    const kb = (b) => `${Math.round(b.length / 1024)} KB`;
    console.log(
      `${s.key.padEnd(10)} pdf ${kb(out.pdf).padStart(7)}  png ${kb(out.png).padStart(8)}  preview ${kb(out.preview).padStart(7)}  share ${kb(out.shareCard).padStart(7)}   ` +
        `(fill ${out.ms.fill} ms, pdf ${out.ms.pdf} ms, png ${out.ms.png} ms, extras ${out.ms.extras} ms)`,
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
