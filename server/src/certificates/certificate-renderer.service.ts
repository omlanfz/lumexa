// FILE PATH: server/src/certificates/certificate-renderer.service.ts
//
// Turns the master template (template/certificate-template.ts) into the two
// files a certificate consists of, using headless Chromium through Puppeteer:
//
//   • a landscape A4 PDF — vector, print-ready, text stays text;
//   • a high-resolution PNG for social media (PNG_SCALE x the A4 page in CSS px).
//
// Both come from the SAME rendered page, once, at issuance. They are then stored
// and never regenerated (see CertificatesService), so nothing here runs when a
// student opens or downloads a certificate.
//
// Safety: the template is self-contained (fonts and images are inlined as data:
// URIs) so every network request is blocked — a certificate can neither depend on
// nor leak to anything outside the page — and a request that is attempted fails
// the render. All certificate text is HTML-escaped by the template; the only
// script in the page is the template's own (it shrinks long names to fit).
//
// Chromium: Puppeteer finds the browser it installed (see .puppeteerrc.cjs); set
// CERTIFICATE_CHROMIUM_PATH (or PUPPETEER_EXECUTABLE_PATH) to use another binary,
// for example a system Chromium in a Docker image. docs/CERTIFICATES_SETUP.md.

import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import {
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
  renderCertificateHtml,
  type CertificateTemplateInput,
} from './template/certificate-template';

/** PNG size = the A4 page (1123 x 794 CSS px) x this: 3369 x 2382 px, about 290 dpi
 * on A4 — sharp enough to print, and what social platforms downscale from. */
export const PNG_SCALE = 3;

const LAUNCH_TIMEOUT_MS = 45_000;
const PAGE_TIMEOUT_MS = 45_000;

export class CertificateRenderError extends Error {
  constructor(
    message: string,
    readonly kind: 'chromium-unavailable' | 'render-failed' | 'invalid-output',
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CertificateRenderError';
  }
}

export interface RenderedCertificate {
  pdf: Buffer;
  png: Buffer;
  pngWidth: number;
  pngHeight: number;
}

/** What rendering does — the part the rest of the app depends on, so tests can
 * stand in a fake (the real one needs a Chromium). */
export interface CertificateRenderer {
  render(input: CertificateTemplateInput): Promise<RenderedCertificate>;
  /** A watermarked, low-resolution PNG for the admin to check before approving.
   * Never stored. */
  renderPreview(input: CertificateTemplateInput): Promise<Buffer>;
}

/** Injection token: CertificatesService depends on the interface, not on Chromium. */
export const CERTIFICATE_RENDERER = Symbol('CERTIFICATE_RENDERER');

/** Pages in a PDF, counted from its page objects (Chromium writes them plain). */
export function countPdfPages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? [])
    .length;
}

/** Width and height from a PNG's IHDR chunk, or null when it is not a PNG. */
export function readPngSize(
  png: Buffer,
): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.length < 24 || signature.some((b, i) => png[i] !== b)) return null;
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

@Injectable()
export class CertificateRendererService implements CertificateRenderer {
  private readonly logger = new Logger(CertificateRendererService.name);
  /** Renders run one at a time: a browser is a few hundred MB, and approvals are rare. */
  private tail: Promise<unknown> = Promise.resolve();

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(task, task);
    this.tail = run.catch(() => undefined);
    return run;
  }

  async render(input: CertificateTemplateInput): Promise<RenderedCertificate> {
    const html = renderCertificateHtml(input);
    return this.exclusive(() =>
      this.withPage(PNG_SCALE, html, async (page) => {
        // PNG first (screen media), then the PDF (print media): same page, same layout.
        const png = Buffer.from(
          await page.screenshot({
            type: 'png',
            clip: { x: 0, y: 0, width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX },
          }),
        );
        const pdf = Buffer.from(
          await page.pdf({
            width: '297mm',
            height: '210mm',
            printBackground: true,
            preferCSSPageSize: true,
          }),
        );
        return this.validate(pdf, png);
      }),
    );
  }

  async renderPreview(input: CertificateTemplateInput): Promise<Buffer> {
    const html = renderCertificateHtml(input);
    return this.exclusive(() =>
      this.withPage(1, html, async (page) => {
        await page.evaluate(PREVIEW_WATERMARK);
        return Buffer.from(
          await page.screenshot({
            type: 'png',
            clip: { x: 0, y: 0, width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX },
          }),
        );
      }),
    );
  }

  // ─── Browser plumbing ────────────────────────────────────────────────────

  private async withPage<T>(
    scale: number,
    html: string,
    work: (page: Page) => Promise<T>,
  ): Promise<T> {
    let browser: Browser | undefined;
    try {
      browser = await this.launch();
      const page = await browser.newPage();
      page.setDefaultTimeout(PAGE_TIMEOUT_MS);
      await page.setViewport({
        width: PAGE_WIDTH_PX,
        height: PAGE_HEIGHT_PX,
        deviceScaleFactor: scale,
      });

      // Hermetic: only data: URIs (the inlined fonts and images) may load.
      const blocked: string[] = [];
      const failures: string[] = [];
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        if (url.startsWith('data:') || url === 'about:blank') {
          void request.continue();
        } else {
          blocked.push(url.slice(0, 120));
          void request.abort('blockedbyclient');
        }
      });
      page.on('pageerror', (err) => failures.push(String(err)));

      await page.setContent(html, {
        waitUntil: 'load',
        timeout: PAGE_TIMEOUT_MS,
      });
      await page.waitForFunction(
        () => document.documentElement.getAttribute('data-ready') === '1',
        { timeout: PAGE_TIMEOUT_MS },
      );

      const fontProblem = await page.evaluate(() => {
        const failed = Array.from(document.fonts).filter(
          (f) => f.status === 'error',
        );
        return failed.length ? failed.map((f) => f.family).join(', ') : null;
      });
      if (fontProblem)
        throw new CertificateRenderError(
          `The certificate fonts failed to load (${fontProblem}).`,
          'render-failed',
        );
      if (blocked.length)
        throw new CertificateRenderError(
          `The certificate template tried to load an external resource (${blocked[0]}).`,
          'render-failed',
        );
      if (failures.length)
        throw new CertificateRenderError(
          `The certificate page raised an error: ${failures[0]}`,
          'render-failed',
        );

      return await work(page);
    } catch (err) {
      throw this.toRenderError(err);
    } finally {
      await browser?.close().catch(() => undefined);
    }
  }

  private async launch(): Promise<Browser> {
    return puppeteer.launch({
      headless: true,
      executablePath:
        process.env.CERTIFICATE_CHROMIUM_PATH?.trim() || undefined,
      timeout: LAUNCH_TIMEOUT_MS,
      // Containers usually run as root, where Chromium's own sandbox cannot start.
      // The page it renders is entirely ours (escaped text, no network).
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }

  private validate(pdf: Buffer, png: Buffer): RenderedCertificate {
    if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-')))
      throw new CertificateRenderError(
        'The rendered certificate is not a PDF.',
        'invalid-output',
      );
    const pages = countPdfPages(pdf);
    if (pages !== 1)
      throw new CertificateRenderError(
        `The rendered certificate has ${pages} pages instead of 1.`,
        'invalid-output',
      );
    const size = readPngSize(png);
    if (
      !size ||
      size.width !== PAGE_WIDTH_PX * PNG_SCALE ||
      size.height !== PAGE_HEIGHT_PX * PNG_SCALE
    )
      throw new CertificateRenderError(
        `The rendered image is ${size ? `${size.width}x${size.height}` : 'not a PNG'}, not ${PAGE_WIDTH_PX * PNG_SCALE}x${PAGE_HEIGHT_PX * PNG_SCALE}.`,
        'invalid-output',
      );
    return { pdf, png, pngWidth: size.width, pngHeight: size.height };
  }

  private toRenderError(err: unknown): CertificateRenderError {
    if (err instanceof CertificateRenderError) return err;
    const message = err instanceof Error ? err.message : String(err);
    if (
      /could not find (chrome|chromium)|browser was not found|executablepath|failed to launch|no usable sandbox|shared libraries|ENOENT|spawn/i.test(
        message,
      )
    ) {
      this.logger.error(`Chromium is unavailable: ${message}`);
      return new CertificateRenderError(
        'Certificate rendering is unavailable on this server: Chromium could not be started (is it installed, with its system libraries?). Install it, or set CERTIFICATE_CHROMIUM_PATH (see docs/CERTIFICATES_SETUP.md).',
        'chromium-unavailable',
        err,
      );
    }
    this.logger.error(`Certificate rendering failed: ${message}`);
    return new CertificateRenderError(
      `Rendering the certificate failed: ${message}`,
      'render-failed',
      err,
    );
  }
}

/** Runs inside the page: lays a diagonal "PREVIEW — NOT ISSUED" watermark over
 * the certificate so a preview can never be mistaken for the real thing. */
const PREVIEW_WATERMARK = `(() => {
  const svg = document.querySelector('svg');
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('transform', 'rotate(-24 702 497)');
  g.setAttribute('opacity', '0.16');
  const t = document.createElementNS(ns, 'text');
  t.setAttribute('x', '702'); t.setAttribute('y', '540'); t.setAttribute('text-anchor', 'middle');
  t.setAttribute('font-family', 'Inter'); t.setAttribute('font-weight', '700');
  t.setAttribute('font-size', '120'); t.setAttribute('fill', '#b91c1c');
  t.textContent = 'PREVIEW — NOT ISSUED';
  g.appendChild(t); svg.appendChild(g);
})()`;
