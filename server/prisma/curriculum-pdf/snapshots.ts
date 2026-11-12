// The "hands-on project" pictures of the curriculum PDFs.
//
// A picture is either one of the sample-project screenshots the website already shows
// (client/public/student-projects/<id>.webp) or one of this folder's own small web pages
// (snapshots/<id>.html — drawn for courses the website has no screenshot for yet). Either way it is
// turned into a compact JPEG with the same browser that prints the PDF, so the document stays small
// and nothing is fetched at print time.

import * as fs from 'fs';
import * as path from 'path';
import type { Browser } from 'puppeteer';

const WEBSITE_SHOTS = path.join(
  __dirname,
  '../../../client/public/student-projects',
);
const OWN_SHOTS = path.join(__dirname, 'snapshots');

/** Width of the JPEGs embedded in the PDF (they are shown at 230 CSS px, so this is crisp at 300 dpi). */
const WIDTH = 900;
const HEIGHT = 563;

export function snapshotSource(id: string): {
  kind: 'html' | 'webp';
  file: string;
} {
  const html = path.join(OWN_SHOTS, `${id}.html`);
  if (fs.existsSync(html)) return { kind: 'html', file: html };
  const webp = path.join(WEBSITE_SHOTS, `${id}.webp`);
  if (fs.existsSync(webp)) return { kind: 'webp', file: webp };
  throw new Error(
    `There is no sample-project picture "${id}" (looked for snapshots/${id}.html and client/public/student-projects/${id}.webp).`,
  );
}

/** id → data: URI of a JPEG. */
export async function prepareSnapshots(
  browser: Browser,
  ids: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const page = await browser.newPage();
  try {
    for (const id of [...new Set(ids)]) {
      const src = snapshotSource(id);
      if (src.kind === 'html') {
        // Drawn at 1280×800, captured at 900 px wide.
        await page.setViewport({
          width: 1280,
          height: 800,
          deviceScaleFactor: WIDTH / 1280,
        });
        await page.goto(`file://${src.file}`, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
      } else {
        await page.setViewport({
          width: WIDTH,
          height: HEIGHT,
          deviceScaleFactor: 1,
        });
        const data = fs.readFileSync(src.file).toString('base64');
        await page.setContent(
          `<style>html,body{margin:0;background:#fff}img{display:block;width:${WIDTH}px;height:${HEIGHT}px}</style><img src="data:image/webp;base64,${data}">`,
          { waitUntil: 'load' },
        );
      }
      const jpeg = (await page.screenshot({
        type: 'jpeg',
        quality: 82,
        clip: undefined,
      })) as Uint8Array;
      out[id] =
        `data:image/jpeg;base64,${Buffer.from(jpeg).toString('base64')}`;
    }
  } finally {
    await page.close();
  }
  return out;
}

/** The Lumexa mark as a small PNG data: URI (the source file is 512 px; the PDFs show it at 30–40 px). */
export async function prepareLogo(browser: Browser): Promise<string> {
  const file = path.join(__dirname, '../../../client/public/logo-mark.png');
  const data = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
  const page = await browser.newPage();
  try {
    await page.setContent('<canvas id="c"></canvas>');
    return await page.evaluate(async (src: string) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.getElementById('c') as HTMLCanvasElement;
      c.width = 192;
      c.height = 192;
      const g = c.getContext('2d')!;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, 192, 192);
      return c.toDataURL('image/png');
    }, data);
  } finally {
    await page.close();
  }
}
