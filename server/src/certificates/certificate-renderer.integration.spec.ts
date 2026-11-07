// The REAL renderer: headless Chromium turns the master template into the PDF and
// PNG, and we look at what came out — page count and size, the PNG's size, the QR
// code decoded from the rendered image itself, the accent colour in actual pixels,
// and that long names are shrunk to fit.
//
// Skipped (with a note) when no Chromium can be found. Point CERTIFICATE_CHROMIUM_PATH
// (or PUPPETEER_EXECUTABLE_PATH) at one to run it. No database is needed.

import * as fs from 'fs';
import * as os from 'os';
import { execFileSync } from 'child_process';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import puppeteer from 'puppeteer';
import {
  CertificateRenderError,
  CertificateRendererService,
  PNG_SCALE,
  countPdfPages,
  readPngSize,
} from './certificate-renderer.service';
import { CERTIFICATE_CATEGORIES } from './certificate-themes';
import {
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
  renderCertificateHtml,
  type CertificateTemplateInput,
} from './template/certificate-template';

function findChromium(): string | null {
  const candidates = [
    process.env.CERTIFICATE_CHROMIUM_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/opt/pw-browsers/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter((p): p is string => !!p);
  try {
    candidates.push(puppeteer.executablePath());
  } catch {
    /* no bundled browser */
  }
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

const chromium = findChromium();
if (chromium) process.env.CERTIFICATE_CHROMIUM_PATH = chromium;
const describeRender = chromium ? describe : describe.skip;
if (!chromium) {
  console.warn(
    'certificate-renderer.integration.spec: no Chromium found — skipped.',
  );
}

const VERIFY_URL = 'https://frontend.example.test/verify/LXA-2026-A7K9Q2';
const INPUT: CertificateTemplateInput = {
  certificateId: 'LXA-2026-A7K9Q2',
  recipientName: 'Nusrat Jahan Tamanna',
  programName: 'AI Builder',
  completionDate: '2026-11-02',
  issueDate: '2026-11-06',
  verificationUrl: VERIFY_URL,
  withDistinction: false,
  palette: CERTIFICATE_CATEGORIES.AI_DATA_SCIENCE.palette,
};

const hasPdftotext = (() => {
  try {
    execFileSync('pdftotext', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

/** The PDF's text. `-layout` reads it as a person would (columns, lines); `-raw`
 * reads it in the order it was drawn, which keeps rotated text (a watermark) in one
 * piece, where `-layout` scatters its letters. */
function pdfText(pdf: Buffer, mode: 'layout' | 'raw' = 'layout'): string {
  const file = `${os.tmpdir()}/lx-cert-${process.pid}-${Date.now()}.pdf`;
  fs.writeFileSync(file, pdf);
  try {
    return execFileSync('pdftotext', [`-${mode}`, file, '-'], {
      encoding: 'utf8',
    });
  } finally {
    fs.rmSync(file, { force: true });
  }
}

type Decoded = ReturnType<typeof PNG.sync.read>;
const decode = (png: Buffer): Decoded => PNG.sync.read(png);

/** Decodes the QR code from a rendered page — the whole page, as a camera sees it. */
function decodeQr(image: Decoded): string | null {
  const found = jsQR(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );
  return found?.data ?? null;
}

/** The same, from just the corner of the page the QR tile sits in (much faster;
 * used where the QR is not what is being tested). */
function decodeQrNearTile(image: Decoded): string | null {
  const scale = (PAGE_WIDTH_PX * PNG_SCALE) / 1404;
  const x0 = Math.floor(1100 * scale);
  const y0 = Math.floor(690 * scale);
  const w = Math.min(image.width - x0, Math.ceil(240 * scale));
  const h = Math.min(image.height - y0, Math.ceil(190 * scale));
  const data = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const from = ((y0 + row) * image.width + x0) * 4;
    data.set(image.data.subarray(from, from + w * 4), row * w * 4);
  }
  return jsQR(data, w, h)?.data ?? null;
}

/** RGB at a point given in the template's design units (1404 x 993). */
function pixelAt(
  image: Decoded,
  ux: number,
  uy: number,
): [number, number, number] {
  const scale = (PAGE_WIDTH_PX * PNG_SCALE) / 1404;
  const x = Math.round(ux * scale);
  const y = Math.round(uy * scale);
  const i = (image.width * y + x) << 2;
  return [image.data[i], image.data[i + 1], image.data[i + 2]];
}
const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const near = (a: number[], b: number[], tol = 8) =>
  a.every((v, i) => Math.abs(v - b[i]) <= tol);

describeRender('CertificateRendererService (real Chromium)', () => {
  jest.setTimeout(180_000);
  const renderer = new CertificateRendererService();
  let rendered: Awaited<ReturnType<CertificateRendererService['render']>>;

  beforeAll(async () => {
    rendered = await renderer.render(INPUT);
  });

  describe('the PDF', () => {
    it('is a single landscape A4 page', () => {
      expect(rendered.pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(countPdfPages(rendered.pdf)).toBe(1);
      const box = rendered.pdf
        .toString('latin1')
        .match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
      expect(box).not.toBeNull();
      const [w, h] = [Number(box![1]), Number(box![2])];
      expect(w).toBeGreaterThan(h); // landscape
      expect(w).toBeCloseTo(841.9, 0); // A4: 297 mm
      expect(h).toBeCloseTo(595.3, 0); // A4: 210 mm
    });

    it('is a print-ready vector document of a sensible size', () => {
      expect(rendered.pdf.length).toBeGreaterThan(200_000);
      expect(rendered.pdf.length).toBeLessThan(6_000_000);
    });

    (hasPdftotext ? it : it.skip)(
      'keeps the certificate text as real, selectable text',
      () => {
        const text = pdfText(rendered.pdf).replace(/\s+/g, ' ');
        expect(text).toContain('Nusrat Jahan Tamanna');
        expect(text).toContain('AI Builder');
        expect(text).toContain('Awarded on passing the Final Test.');
        expect(text).toContain('2 November 2026'); // completion date
        expect(text).toContain('6 November 2026'); // issue date
        expect(text).toContain('LXA-2026-A7K9Q2');
        expect(text).toContain('Fairooz Omlan');
        expect(text).toContain('frontend.example.test/verify/LXA-2026-A7K9Q2');
      },
    );
  });

  describe('the PNG', () => {
    it('is high resolution: the A4 page at 3x', () => {
      expect(readPngSize(rendered.png)).toEqual({
        width: PAGE_WIDTH_PX * PNG_SCALE,
        height: PAGE_HEIGHT_PX * PNG_SCALE,
      });
      expect(rendered.pngWidth).toBe(3369);
      expect(rendered.pngHeight).toBe(2382);
      expect(rendered.png.length).toBeLessThan(8_000_000); // shareable
    });

    it('carries a QR code that decodes to exactly the public verification URL', () => {
      expect(decodeQr(decode(rendered.png))).toBe(VERIFY_URL);
    });
  });

  describe('category accents', () => {
    it.each(
      Object.values(CERTIFICATE_CATEGORIES).map((c) => [c.key, c] as const),
    )(
      'the %s certificate is drawn in that theme (corner medallion colour)',
      async (_key, theme) => {
        const { png } = await renderer.render({
          ...INPUT,
          palette: theme.palette,
        });
        const image = decode(png);
        // The corner star's upper arm, in design units: (50, 35).
        expect(near(pixelAt(image, 50, 34), hex(theme.palette.ornament))).toBe(
          true,
        );
        // …and the page is still decodable and the same size whatever the theme.
        expect(decodeQrNearTile(image)).toBe(VERIFY_URL);
        expect(readPngSize(png)).toEqual({ width: 3369, height: 2382 });
      },
    );
  });

  describe('long text is fitted, never cut off', () => {
    async function widths(over: Partial<CertificateTemplateInput>) {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: chromium!,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      try {
        const page = await browser.newPage();
        await page.setContent(renderCertificateHtml({ ...INPUT, ...over }), {
          waitUntil: 'load',
        });
        await page.waitForFunction(
          () => document.documentElement.getAttribute('data-ready') === '1',
        );
        return await page.evaluate(() =>
          Array.from(document.querySelectorAll('text[data-fit]')).map((el) => ({
            max: Number(el.getAttribute('data-fit')),
            len: (el as SVGTextContentElement).getComputedTextLength(),
          })),
        );
      } finally {
        await browser.close();
      }
    }

    it('keeps every dynamic line inside its box, for short, typical and very long values', async () => {
      for (const over of [
        { recipientName: 'Al', programName: 'AI' },
        {},
        {
          recipientName:
            'Maximilian Alexander Konstantinopoulos-Hendrickson Jr.',
          programName:
            'Advanced Data Science, Machine Learning and Artificial Intelligence Studio',
        },
      ]) {
        for (const w of await widths(over))
          expect(w.len).toBeLessThanOrEqual(w.max + 0.5);
      }
    });
  });

  describe('when Chromium is not available', () => {
    it('fails with a clear, actionable error instead of hanging', async () => {
      const saved = process.env.CERTIFICATE_CHROMIUM_PATH;
      process.env.CERTIFICATE_CHROMIUM_PATH = '/nonexistent/chromium';
      try {
        await expect(
          new CertificateRendererService().render(INPUT),
        ).rejects.toMatchObject({
          name: 'CertificateRenderError',
          kind: 'chromium-unavailable',
          message: expect.stringMatching(/CERTIFICATE_CHROMIUM_PATH/) as string,
        });
      } finally {
        process.env.CERTIFICATE_CHROMIUM_PATH = saved;
      }
    });
  });

  describe('preview', () => {
    it('is a watermarked low-resolution picture of the same page', async () => {
      const preview = await renderer.renderPreview(INPUT);
      expect(readPngSize(preview)).toEqual({
        width: PAGE_WIDTH_PX,
        height: PAGE_HEIGHT_PX,
      });
      expect(preview.length).toBeGreaterThan(50_000);
    });

    it('as a PDF: one watermarked A4 page, so the admin can check it as it prints', async () => {
      const pdf = await renderer.renderPreviewPdf(INPUT);
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(countPdfPages(pdf)).toBe(1);
      expect(pdf.length).toBeGreaterThan(200_000);
    });

    (hasPdftotext ? it : it.skip)(
      'the sample PDF carries the watermark; a real certificate never does',
      async () => {
        const sampleRaw = pdfText(
          await renderer.renderPreviewPdf(INPUT),
          'raw',
        );
        expect(sampleRaw).toMatch(/^PREVIEW$/m);
        expect(sampleRaw).toMatch(/^NOT ISSUED$/m);
        // the sample is the same finished design, not a stand-in
        const sample = pdfText(await renderer.renderPreviewPdf(INPUT)).replace(
          /\s+/g,
          ' ',
        );
        expect(sample).toContain('Nusrat Jahan Tamanna');
        expect(sample).toContain('Awarded on passing the Final Test.');

        const realPdf = (await renderer.render(INPUT)).pdf;
        const realRaw = pdfText(realPdf, 'raw');
        expect(realRaw).not.toMatch(/^PREVIEW$/m);
        expect(realRaw).not.toContain('NOT ISSUED');
        expect(pdfText(realPdf)).toContain(
          'Awarded on passing the Final Test.',
        );
      },
    );
  });

  it('renders one at a time and survives many in a row', async () => {
    const results = await Promise.all([
      renderer.render(INPUT),
      renderer.render({ ...INPUT, recipientName: 'Ada Lovelace' }),
    ]);
    for (const r of results) expect(countPdfPages(r.pdf)).toBe(1);
    expect(results[0].png.equals(results[1].png)).toBe(false);
  });
});

describe('CertificateRenderError', () => {
  it('names its kind', () => {
    expect(new CertificateRenderError('x', 'render-failed').kind).toBe(
      'render-failed',
    );
  });
});
