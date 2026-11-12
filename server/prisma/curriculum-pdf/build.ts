/**
 * Prints the downloadable curriculum PDFs of the eight programs — Lumexa Odyssey, Little Coders,
 * Game Creator, AI Builder, Web Developer, Data Scientist, Advanced Data Science and Digital
 * Independence — each with its own colours and artwork, the Lumexa logo, hands-on project pictures,
 * a highlighted "how students are tested" page, and the ages and badges from the program facts
 * (server/src/courses/program-facts.ts).
 *
 *   npm run export:curriculum-pdfs                              all eight
 *   npm run export:curriculum-pdfs -- --program game-creator    only these (comma separated slugs)
 *   npm run export:curriculum-pdfs -- --html <dir>              also write each program's HTML to <dir>
 *   npm run export:curriculum-pdfs -- --out <dir>               write the PDFs to <dir> instead
 *
 * Output: client/public/curriculums/<file> (the website's download links) and, for the seven
 * programs the certificate email attaches, server/assets/curriculum-pdfs/<file>.
 *
 * Needs a Chromium (Puppeteer downloads one on `npm install`; CERTIFICATE_CHROMIUM_PATH or
 * PUPPETEER_EXECUTABLE_PATH point at another).
 */

import * as fs from 'fs';
import * as path from 'path';
import { factsForCourse } from '../../src/courses/program-facts';
import { PROGRAMS, problemsWith } from './content';
import { PAGE_H, PAGE_W } from './design';
import { LAYOUT_LIMITS, layoutProblems } from './layout-check';
import { buildProgramHtml, expectedPageCount } from './pages';
import { prepareLogo, prepareSnapshots } from './snapshots';

const arg = (name: string, fallback = ''): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};

const CLIENT_OUT = path.join(__dirname, '../../../client/public/curriculums');
const SERVER_OUT = path.join(__dirname, '../../assets/curriculum-pdfs');

function chromiumPath(): string | undefined {
  return [
    process.env.CERTIFICATE_CHROMIUM_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/opt/pw-browsers/chromium',
  ].find((p): p is string => !!p && fs.existsSync(p));
}

/** Pages of the printed file, counted from the PDF itself. */
function pdfPageCount(pdf: Uint8Array): number {
  return (
    Buffer.from(pdf)
      .toString('latin1')
      .match(/\/Type\s*\/Page(?![s\w])/g) ?? []
  ).length;
}

async function main() {
  const wanted = arg('program')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const w of wanted)
    if (!PROGRAMS.some((p) => p.slug === w))
      throw new Error(
        `Unknown program "${w}". Choose from: ${PROGRAMS.map((p) => p.slug).join(', ')}.`,
      );
  const programs = wanted.length
    ? PROGRAMS.filter((p) => wanted.includes(p.slug))
    : PROGRAMS;

  const problems = programs.flatMap(problemsWith);
  if (problems.length)
    throw new Error(
      `The curriculum content is not valid:\n  ${problems.join('\n  ')}`,
    );

  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromiumPath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
    ],
  });
  const htmlDir = arg('html');
  const outDir = arg('out');
  const failures: string[] = [];
  try {
    const logo = await prepareLogo(browser);
    for (const content of programs) {
      const facts = factsForCourse({ slug: content.slug });
      if (!facts) throw new Error(`No program facts for "${content.slug}".`);
      const snapshots = await prepareSnapshots(
        browser,
        content.courses.flatMap((c) => c.snapshots.map((s) => s.id)),
      );
      const html = buildProgramHtml({ content, facts, logo, snapshots });
      if (htmlDir) {
        fs.mkdirSync(htmlDir, { recursive: true });
        fs.writeFileSync(path.join(htmlDir, `${content.slug}.html`), html);
      }

      const page = await browser.newPage();
      try {
        await page.setViewport({ width: PAGE_W, height: PAGE_H });
        await page.setContent(html, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready.then(() => undefined));

        // Geometry: nothing touches the margins, spills out of its box, hugs a card edge, overlaps other
        // text or the artwork, or leaves two blocks touching (layout-check.ts).
        const overflow = await page.evaluate(layoutProblems, LAYOUT_LIMITS);
        if (overflow.length)
          failures.push(
            `${content.slug}:\n    ${[...new Set(overflow)].join('\n    ')}`,
          );

        const pdf = await page.pdf({
          width: `${PAGE_W}px`,
          height: `${PAGE_H}px`,
          printBackground: true,
          preferCSSPageSize: true,
        });
        const pages = pdfPageCount(pdf);
        if (pages !== expectedPageCount(content))
          failures.push(
            `${content.slug}: printed ${pages} page(s), expected ${expectedPageCount(content)}`,
          );

        const targets = outDir
          ? [path.join(path.resolve(outDir), content.fileName)]
          : [
              path.join(CLIENT_OUT, content.fileName),
              ...(content.attachToCertificateEmail
                ? [path.join(SERVER_OUT, content.fileName)]
                : []),
            ];
        for (const target of targets) {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, pdf);
        }
        console.log(
          `${content.fileName}: ${pages} pages, ${(pdf.length / 1024).toFixed(0)} KB → ${targets.map((t) => path.relative(process.cwd(), t)).join(' + ')}`,
        );
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  if (failures.length) {
    console.error(`\nProblems found:\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
