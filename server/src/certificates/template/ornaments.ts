// FILE PATH: server/src/certificates/template/ornaments.ts
//
// The vector ornaments of the certificate: the double frame, the four ribbon
// borders, the corner medallions, the rosette, the micro-text strips and the
// official seal. Pure functions that return SVG markup in the template's
// DESIGN UNITS — a 1404 x 993 canvas that is scaled to A4 landscape. Every
// number below was measured from the supplied official design (the geometry,
// not an approximation), so the template reproduces it rather than imitating it.
//
// Colours come from two places only:
//   • fixed design colours (the navy ink, the gold, the grey micro-text), which
//     are identical on every certificate, and
//   • CSS custom properties `--lx-*`, which the template sets from the
//     category theme (see certificate-themes.ts). These are the accent slots.

import { ROSETTE_CENTER, ROSETTE_CURVES, ROSETTE_RINGS } from './rosette-data';

export const CANVAS_WIDTH = 1404;
export const CANVAS_HEIGHT = 993;

// ─── Fixed design colours (never themed) ─────────────────────────────────────

export const INK = '#0e1230';
export const FRAME = '#0f1235';
export const MICRO_TEXT = '#8a8fa6';
export const GOLD_TEXT = '#8a6c25';
export const GOLD_SEAL = '#d9b865';
export const GOLD_SEAL_TEXT = '#f1dca0';
const MEDALLION_FILL = '#fbfbff';
const MEDALLION_STROKE = '#0f1038';
const MEDALLION_CORE = '#eef0ff';

/** Rounds to 2 decimals and drops trailing zeros ("12.50" -> "12.5"). */
function n(value: number): string {
  return String(Math.round(value * 100) / 100);
}

// ─── Gradients ───────────────────────────────────────────────────────────────

/** All <linearGradient>/<radialGradient> definitions. Accent stops read their
 * colour from the theme's CSS variables. */
export function gradientDefs(): string {
  const stop = (offset: number, cssVar: string) =>
    `<stop offset="${offset}" style="stop-color:var(${cssVar})"/>`;
  const fixed = (offset: number, color: string) =>
    `<stop offset="${offset}" stop-color="${color}"/>`;
  return [
    // top and bottom ribbons: one gradient across the whole border
    `<linearGradient id="lx-ribbon" gradientUnits="userSpaceOnUse" x1="84.25" y1="0" x2="1318.75" y2="0">${stop(0, '--lx-ribbon-1')}${stop(0.5, '--lx-ribbon-2')}${stop(1, '--lx-ribbon-3')}</linearGradient>`,
    // the line under the recipient's name
    `<linearGradient id="lx-underline" gradientUnits="userSpaceOnUse" x1="402" y1="0" x2="1002" y2="0">${stop(0, '--lx-underline-1')}${stop(0.55, '--lx-underline-2')}${stop(1, '--lx-underline-3')}</linearGradient>`,
    // the rules either side of the title fade out away from the title
    `<linearGradient id="lx-rule-left" gradientUnits="userSpaceOnUse" x1="232" y1="0" x2="406" y2="0"><stop offset="0" style="stop-color:var(--lx-title-rule);stop-opacity:0"/><stop offset="1" style="stop-color:var(--lx-title-rule);stop-opacity:1"/></linearGradient>`,
    `<linearGradient id="lx-rule-right" gradientUnits="userSpaceOnUse" x1="998" y1="0" x2="1180" y2="0"><stop offset="0" style="stop-color:var(--lx-title-rule);stop-opacity:1"/><stop offset="1" style="stop-color:var(--lx-title-rule);stop-opacity:0"/></linearGradient>`,
    // seal: scalloped edge, thin ring round the mascot, the two dark discs, gold
    `<linearGradient id="lx-seal-ring" gradientUnits="userSpaceOnUse" x1="-86.7" y1="-86.7" x2="86.7" y2="86.7">${stop(0, '--lx-seal-ring-1')}${stop(1, '--lx-seal-ring-2')}</linearGradient>`,
    `<linearGradient id="lx-seal-inner-ring" gradientUnits="userSpaceOnUse" x1="-49.3" y1="-49.3" x2="49.3" y2="49.3">${stop(0, '--lx-seal-inner-1')}${stop(1, '--lx-seal-inner-2')}</linearGradient>`,
    `<radialGradient id="lx-seal-disc" gradientUnits="userSpaceOnUse" cx="0" cy="-19.06" fx="0" fy="-19.06" r="119.2">${stop(0, '--lx-seal-disc-1')}${stop(1, '--lx-seal-disc-2')}</radialGradient>`,
    `<radialGradient id="lx-seal-core" gradientUnits="userSpaceOnUse" cx="0" cy="-7.66" fx="0" fy="-7.66" r="62.2">${stop(0, '--lx-seal-core-1')}${stop(1, '--lx-seal-core-2')}</radialGradient>`,
    `<linearGradient id="lx-gold" gradientUnits="userSpaceOnUse" x1="-80" y1="-80" x2="80" y2="80">${fixed(0, '#f0d98f')}${fixed(0.47, '#cba54f')}${fixed(1, '#ecd28a')}</linearGradient>`,
  ].join('');
}

// ─── Rosette ─────────────────────────────────────────────────────────────────

/** The faint rosette behind the text: two rings and three rose curves. */
export function rosette(): string {
  const { x, y } = ROSETTE_CENTER;
  const rings = ROSETTE_RINGS.map(
    (r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`,
  ).join('');
  const curves = ROSETTE_CURVES.map((d) => `<path d="${d}"/>`).join('');
  return `<g fill="none" stroke-width="0.8" style="stroke:var(--lx-rosette)">${rings}${curves}</g>`;
}

// ─── Ribbons: ten sine curves per border, each a phase-shifted copy ──────────

/** One full wave every 158 units; the ten curves of a border are the same wave
 * offset in phase, which is what twists the ribbon. */
const WAVE_LENGTH = 158;
const RIBBON_CURVES = 10;
const PHASE_START_DEG = -161.834;
const PHASE_STEP_DEG = 13.1769;

/** A sine curve along one axis as cubic Beziers (8 per wavelength; the error
 * against a true sine is below 0.01 unit). */
function wavePath(
  vertical: boolean,
  center: number,
  amplitude: number,
  from: number,
  to: number,
  phase: number,
): string {
  const w = (2 * Math.PI) / WAVE_LENGTH;
  const step = WAVE_LENGTH / 8;
  const value = (t: number) => center + amplitude * Math.sin(w * t + phase);
  const slope = (t: number) => amplitude * w * Math.cos(w * t + phase);
  const point = (t: number, v: number) =>
    vertical ? `${n(v)} ${n(t)}` : `${n(t)} ${n(v)}`;
  const control = (t: number, v: number, dt: number, dv: number) =>
    vertical ? `${n(v + dv)} ${n(t + dt)}` : `${n(t + dt)} ${n(v + dv)}`;

  let d = `M${point(from, value(from))}`;
  for (let t0 = from; t0 < to - 1e-9; t0 += step) {
    const t1 = Math.min(t0 + step, to);
    const third = (t1 - t0) / 3;
    const c1 = control(t0, value(t0), third, slope(t0) * third);
    const c2 = control(t1, value(t1), -third, -slope(t1) * third);
    d += `C${c1} ${c2} ${point(t1, value(t1))}`;
  }
  return d;
}

/** The four ribbon borders. */
export function ribbons(): string {
  const bands = [
    // [vertical, center, amplitude, from, to, stroke]
    {
      vertical: false,
      center: 50,
      amplitude: 10.2,
      from: 84.5,
      to: 1318.5,
      stroke: 'url(#lx-ribbon)',
    },
    {
      vertical: false,
      center: 943,
      amplitude: 10.2,
      from: 84.5,
      to: 1318.5,
      stroke: 'url(#lx-ribbon)',
    },
    {
      vertical: true,
      center: 50,
      amplitude: 9.5,
      from: 84.5,
      to: 908.5,
      stroke: 'var(--lx-ribbon-1)',
    },
    {
      vertical: true,
      center: 1354,
      amplitude: 9.5,
      from: 84.5,
      to: 908.5,
      stroke: 'var(--lx-ribbon-3)',
    },
  ];
  return bands
    .map((b) => {
      const paths = Array.from({ length: RIBBON_CURVES }, (_, k) => {
        const phase = ((PHASE_START_DEG + PHASE_STEP_DEG * k) * Math.PI) / 180;
        return `<path d="${wavePath(b.vertical, b.center, b.amplitude, b.from, b.to, phase)}"/>`;
      }).join('');
      // CSS custom properties are not valid inside an SVG paint *attribute*, so
      // the flat side borders set `stroke` through the style attribute.
      const paint = b.stroke.startsWith('url(')
        ? `stroke="${b.stroke}"`
        : `style="stroke:${b.stroke}"`;
      return `<g fill="none" stroke-width="0.5" ${paint}>${paths}</g>`;
    })
    .join('');
}

// ─── Frame and corner medallions ─────────────────────────────────────────────

const MEDALLION_STAR =
  'M0 -23.65C2.4 -10.28 10.27 -2.39 23.65 0C10.27 2.39 2.4 10.28 0 23.65C-2.39 10.28 -10.28 2.39 -23.65 0C-10.28 -2.39 -2.39 -10.28 0 -23.65Z';

/** The double navy frame (outer 2.6, inner 2.0) and the four corner medallions
 * the ribbons run between. */
export function frameAndMedallions(): string {
  const outer = `<g stroke="${FRAME}" stroke-width="2.6" fill="none"><path d="M50 28.5H1354M50 964.5H1354M28.5 50V943M1375.5 50V943"/></g>`;
  const inner = `<g stroke="${FRAME}" stroke-width="2" fill="none"><path d="M50 71.5H1354M50 921.5H1354M71.5 50V943M1332.5 50V943"/></g>`;
  const medallion = (cx: number, cy: number) =>
    `<g transform="translate(${cx} ${cy})">` +
    `<circle r="30.5" fill="${MEDALLION_FILL}" stroke="${MEDALLION_STROKE}" stroke-width="2.3"/>` +
    `<path d="${MEDALLION_STAR}" style="fill:var(--lx-ornament)"/>` +
    `<rect x="-3.7" y="-3.7" width="7.4" height="7.4" rx="1.9" fill="${MEDALLION_CORE}"/>` +
    `</g>`;
  return (
    outer +
    inner +
    medallion(50, 50) +
    medallion(1354, 50) +
    medallion(50, 943) +
    medallion(1354, 943)
  );
}

// ─── Micro-text strips ───────────────────────────────────────────────────────

const MICRO_PERIOD = 'LUMEXA AI SCHOOL · VERIFIED CERTIFICATE · ';

/** The tiny repeated line just inside the frame, at the top and the bottom. */
export function microText(): string {
  const text = MICRO_PERIOD.repeat(9);
  const strip = (id: string, y: number, baseline: number) =>
    `<clipPath id="${id}"><rect x="98.5" y="${y}" width="1208.8" height="10"/></clipPath>` +
    `<text x="99.03" y="${baseline}" clip-path="url(#${id})" fill="${MICRO_TEXT}" font-family="Inter" font-weight="700" font-size="6.3" letter-spacing="0.163" xml:space="preserve">${text}</text>`;
  return strip('lx-micro-top', 75.1, 82) + strip('lx-micro-bottom', 908.2, 915);
}

// ─── Official seal ───────────────────────────────────────────────────────────

export const SEAL_CENTER = { x: 702, y: 779 } as const;

const SEAL_STAR =
  'M0 -4.05C0.48 -1.84 1.83 -0.49 4.05 0C1.83 0.49 0.48 1.84 0 4.05C-0.49 1.84 -1.83 0.49 -4.05 0C-1.83 -0.49 -0.49 -1.84 0 -4.05Z';

/** Angle (degrees, SVG convention: 0 = right, clockwise) of each character of
 * the two seal captions, copied from the official design. Spaces are kept so
 * the rhythm matches. */
const SEAL_TOP = {
  text: 'LUMEXA AI SCHOOL',
  radius: 59.1,
  angles: [
    -151.6, -144.4, -135.79, -125.71, -118.15, -109.66, -101.18, -96.48, -88.13,
    -83.19, -78.52, -70.59, -61.97, -53.3, -44.42, -35.58,
  ],
} as const;
const SEAL_BOTTOM = {
  text: 'OFFICIAL CERTIFICATE',
  radius: 65.55,
  angles: [
    154.58, 146.58, 139.91, 133.24, 128.83, 121.06, 116.67, 108.95, 102.52,
    98.21, 90.65, 83.82, 76.73, 69.51, 65.13, 58.42, 54.01, 46.44, 39.39, 32.18,
  ],
} as const;

function sealCaption(
  caption: { text: string; radius: number; angles: readonly number[] },
  flip: boolean,
): string {
  return [...caption.text]
    .map((char, i) =>
      char === ' '
        ? ''
        : `<text transform="rotate(${caption.angles[i]}) translate(${caption.radius} 0) rotate(${flip ? -90 : 90})">${char}</text>`,
    )
    .join('');
}

/** The scalloped edge: 52 teeth between radius 82.27 and 86.69. */
function scallopPath(): string {
  const teeth = 52;
  const outer = 86.69;
  const inner = 82.27;
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const angle = ((-90 + (i * 360) / (teeth * 2)) * Math.PI) / 180;
    const r = i % 2 === 0 ? outer : inner;
    points.push(`${n(r * Math.cos(angle))} ${n(r * Math.sin(angle))}`);
  }
  return `M${points.join('L')}Z`;
}

/** The official seal. `mascot` is the data: URI of the seal's mascot artwork. */
export function seal(mascot: string): string {
  const { x, y } = SEAL_CENTER;
  return (
    `<g transform="translate(${x} ${y})">` +
    `<path d="${scallopPath()}" fill="url(#lx-seal-ring)"/>` +
    `<circle r="80" fill="none" stroke="url(#lx-gold)" stroke-width="1.08"/>` +
    `<circle r="79.45" fill="url(#lx-seal-disc)"/>` +
    `<circle r="75.7" fill="none" stroke="${GOLD_SEAL}" stroke-width="0.62"/>` +
    `<g fill="${GOLD_SEAL_TEXT}" font-family="Inter" font-weight="700" font-size="8.4" letter-spacing="0">` +
    sealCaption(SEAL_TOP, false) +
    sealCaption(SEAL_BOTTOM, true) +
    `</g>` +
    `<path d="${SEAL_STAR}" transform="translate(-63 0)" fill="${GOLD_SEAL}"/>` +
    `<path d="${SEAL_STAR}" transform="translate(63 0)" fill="${GOLD_SEAL}"/>` +
    `<circle r="51.3" fill="none" stroke="${GOLD_SEAL}" stroke-width="0.62"/>` +
    `<circle r="49.3" fill="none" stroke="url(#lx-seal-inner-ring)" stroke-width="2.11"/>` +
    `<circle r="47.87" fill="url(#lx-seal-core)"/>` +
    `<circle r="47.87" fill="none" stroke="${GOLD_SEAL}" stroke-width="0.53"/>` +
    `<image href="${mascot}" x="-54.94" y="-51.42" width="101.52" height="101.52"/>` +
    `</g>`
  );
}
