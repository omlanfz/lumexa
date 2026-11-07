// FILE PATH: server/src/certificates/template/certificate-template.ts
//
// THE master Lumexa Certificate of Completion: one HTML/CSS template, rendered
// to a landscape A4 PDF and a high-resolution PNG by CertificateRendererService.
//
// It reproduces the supplied official design. The page is one inline SVG on a
// 1404 x 993 design grid (scaled to 297 x 210 mm) because that lets every text
// line sit on an exact baseline; fonts, mascot, seal artwork and the founder's
// signature are inlined (see assets.ts), so rendering needs no network at all.
//
// What varies between certificates:
//   • the words: recipient, programme, dates, ID, verification link, QR;
//   • the ACCENT COLOUR — only through the `--lx-*` CSS custom properties set
//     from the category theme (certificate-themes.ts).
// Nothing else varies: two certificates of different categories differ only in
// the :root block (certificate-template.spec.ts proves it).
//
// TEMPLATE_VERSION and old certificates: a certificate is rendered ONCE, when an
// admin approves it, and its PDF and PNG are stored and never regenerated. The
// version is recorded on the certificate. Any change to this file, the assets or
// the ornaments therefore must bump TEMPLATE_VERSION (a snapshot test fails
// until it does), so a future design never silently becomes "what was issued".

import { escapeHtml } from '../../email/templates/layout';
import type { CertificatePalette } from '../certificate-themes';
import { certificateFontCss, certificateImage } from './assets';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GOLD_TEXT,
  INK,
  frameAndMedallions,
  gradientDefs,
  microText,
  ribbons,
  rosette,
  seal,
} from './ornaments';
import { qrPath } from './qr';

/** Recorded on every issued certificate. Bump it with ANY change to the
 * template, its assets or its ornaments.
 *
 *   v1  first release. Its third italic line carried the completion date
 *       ("Completed on 2 November 2026.") in place of the design's own wording.
 *   v2  the design's third italic line is restored exactly as supplied
 *       ("Awarded on passing the Final Test."), and the completion date — which the
 *       supplied design has no place for — is added as a "DATE OF COMPLETION" pair
 *       above "DATE OF ISSUE", in the same style. Nothing else moved.
 *   v3  the printed verification link and the QR code are clickable in the PDF
 *       (link annotations to the verification page). Nothing visible changed.
 */
export const TEMPLATE_VERSION = 'v3';

/** A4 landscape in CSS px at 96 dpi, for the PNG viewport. */
export const PAGE_WIDTH_PX = 1123;
export const PAGE_HEIGHT_PX = 794;

// The design's text colours (fixed; only the accent slots are themed).
const TEXT = {
  body: '#5a607a',
  name: '#0a0e26',
  description: '#2a3050',
  muted: '#6b7088',
  wordmarkSub: '#4f5470',
  url: '#12163a',
  goldLabel: '#9a7a2c',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** '2026-11-06' -> '6 November 2026'. Pure string work: no time zone, no ICU. */
export function formatCertificateDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Not a YYYY-MM-DD date: "${isoDate}"`);
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) throw new Error(`Not a calendar date: "${isoDate}"`);
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export interface CertificateTemplateInput {
  certificateId: string;
  /** Exactly what is printed under "presented to". */
  recipientName: string;
  programName: string;
  /** 'YYYY-MM-DD' — the day the final class of the programme took place. */
  completionDate: string;
  /** 'YYYY-MM-DD' — the day the certificate was issued. */
  issueDate: string;
  /** The public verification URL (the QR code and the printed link). */
  verificationUrl: string;
  /** The optional "With Distinction" line of the design; only when an admin
   * awarded it. */
  withDistinction: boolean;
  palette: CertificatePalette;
}

/** The accent slots, as CSS custom properties. The ONLY themed part of the page. */
export function paletteCss(p: CertificatePalette): string {
  const vars: Record<string, string> = {
    '--lx-ribbon-1': p.ribbon[0],
    '--lx-ribbon-2': p.ribbon[1],
    '--lx-ribbon-3': p.ribbon[2],
    '--lx-underline-1': p.underline[0],
    '--lx-underline-2': p.underline[1],
    '--lx-underline-3': p.underline[2],
    '--lx-title-rule': p.titleRule,
    '--lx-ornament': p.ornament,
    '--lx-program': p.programName,
    '--lx-rosette': p.rosette,
    '--lx-seal-ring-1': p.sealRing[0],
    '--lx-seal-ring-2': p.sealRing[1],
    '--lx-seal-inner-1': p.sealInnerRing[0],
    '--lx-seal-inner-2': p.sealInnerRing[1],
    '--lx-seal-disc-1': p.sealDisc[0],
    '--lx-seal-disc-2': p.sealDisc[1],
    '--lx-seal-core-1': p.sealCore[0],
    '--lx-seal-core-2': p.sealCore[1],
  };
  return `:root{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`;
}

/** Marks the themed block so tests (and tools) can find it. */
export const PALETTE_START = '/*lx-palette*/';
export const PALETTE_END = '/*lx-palette-end*/';

// The page's own small script: shrinks the (few) long dynamic lines to fit and
// tells the renderer when the fonts are loaded and the page is final. It only
// ever reads the document; all certificate text is HTML-escaped before it gets
// here, so no certificate data is ever executed.
const FIT_SCRIPT = `(function(){
function fit(){
  var nodes=document.querySelectorAll('text[data-fit]');
  for(var i=0;i<nodes.length;i++){
    var el=nodes[i],max=parseFloat(el.getAttribute('data-fit')),base=parseFloat(el.getAttribute('data-size')),
        min=parseFloat(el.getAttribute('data-min')||'0.45');
    el.removeAttribute('textLength');el.removeAttribute('lengthAdjust');
    el.setAttribute('font-size',base);
    var len=el.getComputedTextLength();
    if(len>max){
      el.setAttribute('font-size',Math.max(base*max/len,base*min));
      len=el.getComputedTextLength();
      if(len>max){el.setAttribute('textLength',max);el.setAttribute('lengthAdjust','spacingAndGlyphs');}
    }
  }
}
function done(){try{fit();}finally{document.documentElement.setAttribute('data-ready','1');}}
try{fit();}catch(e){}
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(done,done);}else{done();}
})();`;

/** Chrome's SVG text path draws every glyph this much higher than the original
 * design's HTML flow did for the same baseline (measured against the supplied
 * PDF at 2 px per design unit), so every line is lowered by it to land exactly
 * where the design has it. Not applied to the vector ornaments, which already
 * coincide with the design. */
const TEXT_NUDGE_Y = 0.35;

/** A <text> line on an exact baseline. */
function text(opts: {
  x: number;
  y: number;
  content: string;
  size: number;
  weight: number;
  family: 'Inter' | 'Cormorant Garamond';
  fill: string;
  /** SVG text-anchor */
  anchor?: 'start' | 'middle' | 'end';
  italic?: boolean;
  /** letter-spacing, in design units */
  spacing?: number;
  /** [max width, optional minimum scale]: shrink to fit when longer. */
  fit?: [number, number?];
  /** a CSS-variable colour instead of a fixed one */
  fillVar?: string;
}): string {
  const attrs = [
    `x="${opts.x}"`,
    `y="${Math.round((opts.y + TEXT_NUDGE_Y) * 100) / 100}"`,
    `font-family="${opts.family}"`,
    `font-weight="${opts.weight}"`,
    `font-size="${opts.size}"`,
    opts.italic ? 'font-style="italic"' : '',
    opts.spacing ? `letter-spacing="${opts.spacing}"` : '',
    opts.anchor && opts.anchor !== 'start'
      ? `text-anchor="${opts.anchor}"`
      : '',
    opts.fillVar ? `style="fill:var(${opts.fillVar})"` : `fill="${opts.fill}"`,
    opts.fit
      ? `data-fit="${opts.fit[0]}" data-size="${opts.size}"${opts.fit[1] ? ` data-min="${opts.fit[1]}"` : ''}`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<text ${attrs}>${opts.content}</text>`;
}

const diamond = (cx: number, cy: number, half: number) =>
  `<path d="M${cx} ${cy - half}L${cx + half} ${cy}L${cx} ${cy + half}L${cx - half} ${cy}Z" fill="${GOLD_TEXT}"/>`;

/** Makes `inner` (SVG markup) a link: in the PDF it becomes a clickable area that
 * opens `url` (Chromium turns SVG anchors into PDF link annotations). Nothing about
 * how it looks changes. `url` is the server-built verification URL and is escaped. */
function linkTo(url: string, label: string, inner: string): string {
  return `<a href="${escapeHtml(url)}" target="_blank" aria-label="${escapeHtml(label)}">${inner}</a>`;
}

/** The verification link as printed: no scheme, as in the design. */
export function printedVerificationLink(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
}

/** The complete HTML document of one certificate. Deterministic: the same input
 * always yields byte-identical HTML. */
export function renderCertificateHtml(input: CertificateTemplateInput): string {
  const name = escapeHtml(input.recipientName);
  const program = escapeHtml(input.programName);
  const id = escapeHtml(input.certificateId);
  const completion = escapeHtml(formatCertificateDate(input.completionDate));
  const issued = escapeHtml(formatCertificateDate(input.issueDate));
  const link = escapeHtml(printedVerificationLink(input.verificationUrl));

  const qr = qrPath(input.verificationUrl, { x: 1167.5, y: 733.5, size: 102 });

  const body: string[] = [];
  // ── background ornaments ──
  body.push(
    `<rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="#faf9f6"/>`,
    rosette(),
    ribbons(),
    frameAndMedallions(),
    microText(),
  );

  // ── logo lock-up ──
  body.push(
    `<image href="${certificateImage('logo-mascot.png')}" x="577.5" y="88.5" width="76" height="76"/>`,
    text({
      x: 668.9,
      y: 127,
      content: 'LUMEXA',
      size: 31,
      weight: 700,
      family: 'Inter',
      fill: INK,
      spacing: 5,
    }),
    text({
      x: 670.4,
      y: 147,
      content: 'AI SCHOOL',
      size: 15,
      weight: 500,
      family: 'Inter',
      fill: TEXT.wordmarkSub,
      spacing: 9.5,
    }),
  );

  // ── title row ──
  body.push(
    `<rect x="232" y="231.5" width="174" height="1.4" fill="url(#lx-rule-left)"/>`,
    `<rect x="998" y="231.5" width="182" height="1.4" fill="url(#lx-rule-right)"/>`,
    diamond(430, 230.5, 6),
    diamond(973, 230.5, 6),
    text({
      x: 470.6,
      y: 238,
      content: 'CERTIFICATE OF COMPLETION',
      size: 20,
      weight: 600,
      family: 'Inter',
      fill: INK,
      spacing: 6.783,
    }),
  );

  // ── recipient and programme ──
  body.push(
    text({
      x: 702,
      y: 302,
      content: 'This certificate is proudly presented to',
      size: 23,
      weight: 500,
      italic: true,
      family: 'Cormorant Garamond',
      fill: TEXT.body,
      anchor: 'middle',
    }),
    text({
      x: 702,
      y: 399,
      content: name,
      size: 90.7,
      weight: 600,
      family: 'Cormorant Garamond',
      fill: TEXT.name,
      anchor: 'middle',
      fit: [1000, 0.4],
    }),
    `<rect x="402" y="426" width="600" height="2.4" rx="1.2" fill="url(#lx-underline)"/>`,
    text({
      x: 702,
      y: 470,
      content: 'for successfully completing the',
      size: 22,
      weight: 500,
      italic: true,
      family: 'Cormorant Garamond',
      fill: TEXT.body,
      anchor: 'middle',
    }),
    text({
      x: 702,
      y: 525,
      content: program,
      size: 46,
      weight: 700,
      family: 'Cormorant Garamond',
      fill: '',
      fillVar: '--lx-program',
      spacing: 0.5,
      anchor: 'middle',
      fit: [900, 0.5],
    }),
  );

  if (input.withDistinction) {
    body.push(
      diamond(599.8, 554.7, 5.66),
      diamond(803.8, 554.7, 5.66),
      text({
        x: 618.8,
        y: 559,
        content: 'WITH DISTINCTION',
        size: 11.6,
        weight: 700,
        family: 'Inter',
        fill: GOLD_TEXT,
        spacing: 3.7,
      }),
    );
  }

  body.push(
    text({
      x: 702,
      y: 594,
      content: 'A structured, teacher-led program designed to build knowledge',
      size: 14.6,
      weight: 400,
      family: 'Inter',
      fill: TEXT.description,
      anchor: 'middle',
    }),
    text({
      x: 702,
      y: 616,
      content:
        'and practical skills through guided learning and hands-on activities.',
      size: 14.6,
      weight: 400,
      family: 'Inter',
      fill: TEXT.description,
      anchor: 'middle',
    }),
    text({
      x: 702,
      y: 648,
      content: 'Awarded on passing the Final Test.',
      size: 20.5,
      weight: 500,
      italic: true,
      family: 'Cormorant Garamond',
      fill: TEXT.body,
      anchor: 'middle',
    }),
  );

  // ── founder ──
  body.push(
    `<image href="${certificateImage('founder-signature.png')}" x="149.35" y="689.05" width="221.4" height="89.4"/>`,
    `<rect x="133" y="779" width="349" height="1.4" fill="${INK}"/>`,
    text({
      x: 133,
      y: 809,
      content: 'Fairooz Omlan',
      size: 24.5,
      weight: 700,
      family: 'Cormorant Garamond',
      fill: INK,
    }),
    text({
      x: 133,
      y: 832,
      content: 'FOUNDER &amp; CEO',
      size: 10.2,
      weight: 700,
      family: 'Inter',
      fill: INK,
      spacing: 2.04,
    }),
    text({
      x: 133,
      y: 848,
      content: 'LUMEXA AI SCHOOL',
      size: 10.6,
      weight: 500,
      family: 'Inter',
      fill: TEXT.muted,
      spacing: 2.33,
    }),
  );

  // ── seal ──
  body.push(seal(certificateImage('seal-mascot.png')));

  // ── completion date, issue date, certificate id, QR ──
  // The supplied design has only "DATE OF ISSUE". The completion date is added above
  // it in the same label/value style and rhythm (label 21 above its value, 32 between
  // pairs), growing the block upwards so nothing already placed moves.
  body.push(
    text({
      x: 1137.7,
      y: 719,
      content: 'DATE OF COMPLETION',
      size: 9.6,
      weight: 700,
      family: 'Inter',
      fill: TEXT.goldLabel,
      spacing: 1.92,
      anchor: 'end',
    }),
    text({
      x: 1137.7,
      y: 740,
      content: completion,
      size: 17.6,
      weight: 600,
      family: 'Inter',
      fill: INK,
      anchor: 'end',
      fit: [330, 0.7],
    }),
    text({
      x: 1137.7,
      y: 772,
      content: 'DATE OF ISSUE',
      size: 9.6,
      weight: 700,
      family: 'Inter',
      fill: TEXT.goldLabel,
      spacing: 1.903,
      anchor: 'end',
    }),
    text({
      x: 1137.7,
      y: 793,
      content: issued,
      size: 17.6,
      weight: 600,
      family: 'Inter',
      fill: INK,
      anchor: 'end',
      fit: [330, 0.7],
    }),
    text({
      x: 1137.7,
      y: 825,
      content: 'CERTIFICATE ID',
      size: 9.6,
      weight: 700,
      family: 'Inter',
      fill: TEXT.goldLabel,
      spacing: 1.945,
      anchor: 'end',
    }),
    text({
      x: 1137.7,
      y: 847,
      content: id,
      size: 17.6,
      weight: 600,
      family: 'Inter',
      fill: INK,
      spacing: 0.77,
      anchor: 'end',
      fit: [330, 0.7],
    }),
    linkTo(
      input.verificationUrl,
      'Open the verification page',
      `<rect x="1167.5" y="733.5" width="102" height="102" rx="12.5" fill="#ffffff" stroke="#dcdfe8" stroke-width="1"/><path d="${qr.path}" fill="${INK}"/>`,
    ),
    text({
      x: 1172.8,
      y: 848,
      content: 'SCAN TO VERIFY',
      size: 8.8,
      weight: 600,
      family: 'Inter',
      fill: TEXT.muted,
      spacing: 1.46,
    }),
  );

  // ── verification link ──
  body.push(
    linkTo(
      input.verificationUrl,
      'Open the verification page',
      `<text x="702" y="${883 + TEXT_NUDGE_Y}" text-anchor="middle" font-family="Inter" font-size="12.4" letter-spacing="0.04" data-fit="880" data-size="12.4" data-min="0.6"><tspan font-weight="400" fill="${TEXT.body}">Verify this certificate: </tspan><tspan font-weight="600" fill="${TEXT.url}">${link}</tspan></text>`,
    ),
  );

  const title = `Lumexa AI School — Certificate of Completion — ${id}`;

  return `<!DOCTYPE html>
<html lang="en" data-template="${TEMPLATE_VERSION}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
${certificateFontCss()}
@page{size:297mm 210mm;margin:0}
html,body{margin:0;padding:0;width:297mm;height:210mm;overflow:hidden;background:#faf9f6}
svg{display:block;width:297mm;height:210mm}
text{font-kerning:normal;text-rendering:geometricPrecision}
${PALETTE_START}${paletteCss(input.palette)}${PALETTE_END}
</style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" preserveAspectRatio="xMinYMin slice" role="img" aria-label="Lumexa AI School Certificate of Completion">
<defs>${gradientDefs()}</defs>
${body.join('\n')}
</svg>
<script>${FIT_SCRIPT}</script>
</body>
</html>`;
}
