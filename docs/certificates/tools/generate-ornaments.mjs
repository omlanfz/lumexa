// Generates the three decorative SVG assets the certificate template uses:
//
//   template/ornaments/frame.svg    page frame: double rule with a slim woven guilloche band between
//                                   the rules, four sparkle corners and two lines of microtext
//   template/ornaments/rosette.svg  large, very faint guilloche rosette (the watermark)
//   template/ornaments/seal.svg     the round "official certificate" seal with ribbon tails (the
//                                   template overlays the logo mark in its centre)
//
// They are plain static files committed next to the template, so nothing here runs
// at render time. Re-run this script only if you want to change the ornaments:
//
//   node tools/generate-ornaments.mjs
//
// Guilloche patterns (the woven/rosette line work printed on banknotes, diplomas and
// cheques) are made from hypotrochoid and sine curves, so the whole look comes from
// a few lines of maths rather than a designer's artwork file.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'template', 'ornaments');
mkdirSync(out, { recursive: true });

// ── Palette (matches the logo + the site's teal/blue/violet accents) ────────────
const NAVY = '#14124A';
const PAPER = '#FCFCFF';
const GOLD = '#E3CE95';
const GRAD = [
  ['0', '#14B8A6'], // teal
  ['0.5', '#3B82F6'], // blue
  ['1', '#7C3AED'], // violet
];
const stops = GRAD.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');

const n = (v, d = 2) => Number(v.toFixed(d));
const poly = (arr) => 'M' + arr.map(([x, y]) => `${n(x)} ${n(y)}`).join('L');
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** Four-point sparkle (the star motif of the Lumexa logo) centred on cx,cy. */
function sparkle(cx, cy, R, fill) {
  const k = 0.2 * R;
  return `<path d="M${n(cx)} ${n(cy - R)}Q${n(cx + k)} ${n(cy - k)} ${n(cx + R)} ${n(cy)}Q${n(cx + k)} ${n(cy + k)} ${n(cx)} ${n(cy + R)}Q${n(cx - k)} ${n(cy + k)} ${n(cx - R)} ${n(cy)}Q${n(cx - k)} ${n(cy - k)} ${n(cx)} ${n(cy - R)}Z" fill="${fill}"/>`;
}

/** Hypotrochoid scaled so its farthest point sits exactly at `radius`. */
function hypotrochoid({ R, r, d, radius, rotate = 0, steps = 720 }) {
  const turns = r / gcd(R, r);
  const raw = [];
  let max = 0;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    raw.push([x, y]);
    max = Math.max(max, Math.hypot(x, y));
  }
  const k = radius / max;
  const c = Math.cos(rotate);
  const s = Math.sin(rotate);
  return raw.map(([x, y]) => [(x * c - y * s) * k, (x * s + y * c) * k]);
}

// ── 1. frame.svg ───────────────────────────────────────────────────────────────
function frame() {
  const W = 297;
  const H = 210;
  const OUTER = 6.5; // outer rule inset (mm)
  const INNER = 12.5; // inner rule inset (mm)
  const CENTRE = 9.5; // centre line of the woven band
  const AMP = 1.0;
  const WAVE = 11; // wavelength (mm)
  const STRANDS = 6;
  const STEP = 1;
  const strands = [];

  const horizontal = (cy) => {
    for (let k = 0; k < STRANDS; k++) {
      const phase = (k / STRANDS) * Math.PI;
      const p = [];
      for (let x = OUTER; x <= W - OUTER + 0.001; x += STEP) p.push([x, cy + AMP * Math.sin(((x - INNER) / WAVE) * Math.PI * 2 + phase)]);
      strands.push(poly(p));
    }
  };
  const vertical = (cx) => {
    for (let k = 0; k < STRANDS; k++) {
      const phase = (k / STRANDS) * Math.PI;
      const p = [];
      for (let y = OUTER; y <= H - OUTER + 0.001; y += STEP) p.push([cx + AMP * Math.sin(((y - INNER) / WAVE) * Math.PI * 2 + phase), y]);
      strands.push(poly(p));
    }
  };
  horizontal(CENTRE);
  horizontal(H - CENTRE);
  vertical(CENTRE);
  vertical(W - CENTRE);

  // sparkle corners: a small ring with the logo's four-point star, drawn over the band
  const corners = [
    [CENTRE, CENTRE],
    [W - CENTRE, CENTRE],
    [CENTRE, H - CENTRE],
    [W - CENTRE, H - CENTRE],
  ]
    .map(
      ([cx, cy]) => `
  <g>
    <circle cx="${cx}" cy="${cy}" r="4.7" fill="${PAPER}"/>
    <circle cx="${cx}" cy="${cy}" r="4.2" fill="none" stroke="${NAVY}" stroke-width="0.28"/>
    ${sparkle(cx, cy, 3.3, '#3B3FC8')}
    <circle cx="${cx}" cy="${cy}" r="0.5" fill="${PAPER}"/>
  </g>`,
    )
    .join('');

  // microtext: tiny repeating text that blurs into a fine line when photocopied (top and bottom only)
  const phrase = 'LUMEXA AI SCHOOL · VERIFIED CERTIFICATE · ';
  const line = phrase.repeat(9);
  const micro = (y) =>
    `<text x="24" y="${y}" textLength="249" lengthAdjust="spacing" font-family="Inter, Arial, sans-serif" font-size="1.05" font-weight="600" fill="${NAVY}" fill-opacity="0.55">${line}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" aria-hidden="true">
  <defs>
    <linearGradient id="frame-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">${stops}</linearGradient>
    <clipPath id="frame-band">
      <path clip-rule="evenodd" d="M${OUTER + 1.3} ${OUTER + 1.3}H${W - OUTER - 1.3}V${H - OUTER - 1.3}H${OUTER + 1.3}Z M${INNER - 1.3} ${INNER - 1.3}V${H - INNER + 1.3}H${W - INNER + 1.3}V${INNER - 1.3}Z"/>
    </clipPath>
  </defs>
  <rect x="${OUTER}" y="${OUTER}" width="${W - 2 * OUTER}" height="${H - 2 * OUTER}" fill="none" stroke="${NAVY}" stroke-width="0.5"/>
  <g clip-path="url(#frame-band)" fill="none" stroke="url(#frame-g)" stroke-width="0.14" stroke-opacity="0.6">
    ${strands.map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
  <rect x="${INNER}" y="${INNER}" width="${W - 2 * INNER}" height="${H - 2 * INNER}" fill="none" stroke="url(#frame-g)" stroke-width="0.5"/>
  ${corners}
  <g>
    ${micro(14.75)}
    ${micro(195.3)}
  </g>
</svg>
`;
}

// ── 2. rosette.svg ─────────────────────────────────────────────────────────────
function rosette() {
  const layers = [
    { R: 96, r: 8, d: 21, radius: 94, steps: 900 },
    { R: 91, r: 13, d: 30, radius: 82, rotate: Math.PI / 13, steps: 900 },
    { R: 90, r: 5, d: 10, radius: 70, steps: 1080 },
    { R: 77, r: 11, d: 24, radius: 56, rotate: Math.PI / 7, steps: 900 },
    { R: 60, r: 5, d: 14, radius: 40, steps: 720 },
  ];
  const paths = layers.map((l) => `<path d="${poly(hypotrochoid(l))}"/>`).join('\n    ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200" aria-hidden="true">
  <defs>
    <linearGradient id="rosette-g" gradientUnits="userSpaceOnUse" x1="-100" y1="0" x2="100" y2="0">${stops}</linearGradient>
  </defs>
  <g fill="none" stroke="url(#rosette-g)" stroke-width="0.2">
    ${paths}
    <circle r="98.6" stroke-width="0.35"/>
    <circle r="96.4" stroke-width="0.15"/>
    <circle r="22" stroke-width="0.25"/>
    <circle r="20" stroke-width="0.12"/>
  </g>
</svg>
`;
}

// ── 3. seal.svg ────────────────────────────────────────────────────────────────
// The seal's circle is centred on (0,0); the two ribbon tails hang below it. The viewBox is
// 120 x 142 units, so the circle's centre sits 60/142 = 42.25% of the way down the image.
function seal() {
  const BUMPS = 44;
  const edge = [];
  for (let i = 0; i <= 720; i++) {
    const a = (i / 720) * Math.PI * 2;
    const r = 55.4 + 1.9 * Math.cos(BUMPS * a);
    edge.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const star = (cx, cy, R, r) => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 ? r : R;
      p.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
    }
    return `<polygon points="${p.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="${GOLD}"/>`;
  };
  // ribbon tails: notched ends, drawn behind the scalloped medal
  const tail = (s) =>
    `<path d="M${s * 14} 34 L${s * 38} 34 L${s * 31} 58 L${s * 41} 80 L${s * 25} 72 L${s * 11} 82 L${s * 17} 52 Z" fill="url(#seal-tail)"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 142" aria-hidden="true">
  <defs>
    <linearGradient id="seal-g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
    <linearGradient id="seal-tail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2FB5"/><stop offset="1" stop-color="#7C3AED"/></linearGradient>
    <path id="seal-top" d="M-37.4 0A37.4 37.4 0 0 1 37.4 0"/>
    <path id="seal-bottom" d="M-43.4 0A43.4 43.4 0 0 0 43.4 0"/>
  </defs>
  ${tail(-1)}
  ${tail(1)}
  <path d="${poly(edge)}Z" fill="url(#seal-g)"/>
  <circle r="50.4" fill="${NAVY}"/>
  <circle r="48.6" fill="none" stroke="${GOLD}" stroke-width="0.55"/>
  <circle r="33.6" fill="none" stroke="${GOLD}" stroke-width="0.45"/>
  <text font-family="Inter, Arial, sans-serif" font-size="6.5" font-weight="700" letter-spacing="1.45" fill="${GOLD}" text-anchor="middle">
    <textPath href="#seal-top" startOffset="50%">LUMEXA AI SCHOOL</textPath>
  </text>
  <text font-family="Inter, Arial, sans-serif" font-size="6.5" font-weight="700" letter-spacing="1.45" fill="${GOLD}" text-anchor="middle">
    <textPath href="#seal-bottom" startOffset="50%">OFFICIAL CERTIFICATE</textPath>
  </text>
  ${star(-40.4, 0.4, 2.5, 1.05)}
  ${star(40.4, 0.4, 2.5, 1.05)}
  <circle r="31.2" fill="${PAPER}"/>
</svg>
`;
}

for (const [name, svg] of Object.entries({ frame: frame(), rosette: rosette(), seal: seal() })) {
  writeFileSync(join(out, `${name}.svg`), svg);
  console.log(`wrote ornaments/${name}.svg  (${(svg.length / 1024).toFixed(1)} KB)`);
}
