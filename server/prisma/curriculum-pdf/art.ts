// Vector artwork for the curriculum PDFs: starfields, icons and one signature hero illustration
// per program. Everything is inline SVG (crisp at any zoom, a few KB each) — no emoji and no
// raster artwork, so the documents look the same on every machine.

import { GOLD, NAVY, type Theme } from './theme';
import type { ThemeKey } from './types';

// ─── Starfield ──────────────────────────────────────────────────────────────

/** A deterministic scatter of tiny stars and sparkles, as an SVG that fills its parent. */
export function starfield(
  seed: number,
  count: number,
  w = 800,
  h = 220,
): string {
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const dots: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (rnd() * w).toFixed(1);
    const y = (rnd() * h).toFixed(1);
    const r = (0.6 + rnd() * 1.4).toFixed(2);
    const o = (0.3 + rnd() * 0.65).toFixed(2);
    dots.push(
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"/>`,
    );
  }
  for (let i = 0; i < Math.max(3, Math.round(count / 12)); i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 3 + rnd() * 3.2;
    dots.push(
      `<path d="M${x.toFixed(1)} ${(y - r).toFixed(1)} Q${x.toFixed(1)} ${y.toFixed(1)} ${(x + r).toFixed(1)} ${y.toFixed(1)} Q${x.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${(y + r).toFixed(1)} Q${x.toFixed(1)} ${y.toFixed(1)} ${(x - r).toFixed(1)} ${y.toFixed(1)} Q${x.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${(y - r).toFixed(1)}Z" fill="#fff" opacity="${(0.55 + rnd() * 0.4).toFixed(2)}"/>`,
    );
  }
  return `<svg class="stars" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${dots.join('')}</svg>`;
}

// ─── Icons (24×24) ──────────────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  star: '<path d="M12 2.5l2.8 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.8 3.3 1.3-6.5L2.6 9.3l6.6-.8z"/>',
  trophy:
    '<path d="M7 3h10v6a5 5 0 01-10 0V3z"/><path d="M7 5H4v2a3 3 0 003 3M17 5h3v2a3 3 0 01-3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10.5 14h3v3h2.5v3h-8v-3h2.5z"/>',
  flag: '<path d="M5 2.5h1.8V21H5z"/><path d="M6.8 3.5c3-1.6 5.4 1.4 8.4 0 1.2-.6 2.4-.8 3.3-.5v8c-.9-.3-2.1-.1-3.3.5-3 1.4-5.4-1.6-8.4 0z"/>',
  bolt: '<path d="M13.5 2L5 13.5h5.5L9.5 22 19 9.8h-5.7z"/>',
  check:
    '<path d="M4.5 12.5l4.6 4.6L19.5 6.6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 016.5 2H20v16H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 006.5 23H20v-2.5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  shield:
    '<path d="M12 2l8 3v6.5c0 5-3.4 8.7-8 10.5-4.6-1.8-8-5.5-8-10.5V5z"/>',
  medal:
    '<circle cx="12" cy="15" r="6"/><path d="M8 2h3l1 5-2.5 1.5zM16 2h-3l-1 5 2.5 1.5z" opacity=".8"/>',
  heart:
    '<path d="M12 21s-8.5-5.4-8.5-11.2A4.6 4.6 0 0112 7.2a4.6 4.6 0 018.5 2.6C20.5 15.6 12 21 12 21z"/>',
  target:
    '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2"/>',
  code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  rocket:
    '<path d="M12 1.5c3.6 2.6 5.2 7 4.4 12.2h-8.8C6.8 8.5 8.4 4.1 12 1.5z"/><circle cx="12" cy="9" r="2" fill="#fff"/><path d="M7.6 12.5L4 17l4 .5zM16.4 12.5L20 17l-4 .5z" opacity=".85"/><path d="M10 15.5h4L12 22z" opacity=".9"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  gamepad:
    '<path d="M6.5 7h11a4.5 4.5 0 014.4 3.6l.9 4.6a2.6 2.6 0 01-4.5 2.2L16 15H8l-2.3 2.4a2.6 2.6 0 01-4.5-2.2l.9-4.6A4.5 4.5 0 016.5 7z"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  globe:
    '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 12h19M12 2.5c3 3 3 16.5 0 19M12 2.5c-3 3-3 16.5 0 19" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  chart:
    '<rect x="3" y="12" width="4.5" height="9" rx="1"/><rect x="9.8" y="6" width="4.5" height="15" rx="1"/><rect x="16.5" y="9" width="4.5" height="12" rx="1"/>',
  briefcase:
    '<rect x="2.5" y="7.5" width="19" height="13" rx="2.5"/><path d="M8.5 7.5V5.5a2 2 0 012-2h3a2 2 0 012 2v2" fill="none" stroke="currentColor" stroke-width="2"/>',
  cat: '<path d="M4 3.5l5 3.2a8 8 0 016 0l5-3.2V12a8 8 0 01-16 0z"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z"/>',
  users:
    '<circle cx="9" cy="8" r="3.6"/><circle cx="17.2" cy="9.2" r="2.8" opacity=".8"/><path d="M2.5 20c0-3.7 2.9-6 6.5-6s6.5 2.3 6.5 6zM15.5 14.4c3.2-.3 6 1.5 6 5.6h-4.6c0-2-.6-3.9-1.4-5.6z" opacity=".95"/>',
  clock:
    '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6.5V12l3.6 2.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
};

export function icon(
  name: keyof typeof ICONS | string,
  size = 16,
  color = 'currentColor',
): string {
  const body = ICONS[name];
  if (!body) throw new Error(`Unknown icon "${name}"`);
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="color:${color}" aria-hidden="true">${body}</svg>`;
}

// ─── Small building blocks ──────────────────────────────────────────────────

const rocketShape = (
  x: number,
  y: number,
  scale: number,
  rotate: number,
  body = '#fff',
  fin = '#FF7A59',
): string => `
  <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">
    <path d="M0 -34 C14 -20 15 4 10 22 L-10 22 C-15 4 -14 -20 0 -34Z" fill="${body}"/>
    <circle cx="0" cy="-10" r="6" fill="#38BDF8"/><circle cx="-1.6" cy="-11.6" r="2" fill="#fff" opacity=".8"/>
    <path d="M-10 10 L-22 28 L-10 23Z M10 10 L22 28 L10 23Z" fill="${fin}"/>
    <path d="M-6 23 L0 44 L6 23Z" fill="${GOLD}"/><path d="M-3 23 L0 35 L3 23Z" fill="#FFF3B0"/>
  </g>`;

const pixel = (
  rows: string[],
  cell: number,
  x: number,
  y: number,
  fill: string,
): string => {
  const rects: string[] = [];
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === '#')
        rects.push(
          `<rect x="${x + c * cell}" y="${y + r * cell}" width="${cell}" height="${cell}" fill="${fill}"/>`,
        );
    }),
  );
  return rects.join('');
};

// ─── Hero illustrations (330 × 230) ─────────────────────────────────────────

function odysseyArt(t: Theme): string {
  const stage = (cx: number, cy: number, n: number, c1: string, c2: string) => `
    <circle cx="${cx}" cy="${cy}" r="15" fill="url(#og${n})"/>
    <circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>
    <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">${n}</text>
    <defs><linearGradient id="og${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`;
  return `
  <svg viewBox="0 0 330 230" class="art" aria-hidden="true">
    <defs>
      <radialGradient id="opl" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#FFF0A8"/><stop offset=".55" stop-color="#FBBF24"/><stop offset="1" stop-color="#EA7A0C"/></radialGradient>
      <radialGradient id="oglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="200" cy="120" r="108" fill="url(#oglow)"/>
    <ellipse cx="200" cy="122" rx="146" ry="58" transform="rotate(-16 200 122)" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-dasharray="3 6"/>
    <ellipse cx="200" cy="122" rx="104" ry="40" transform="rotate(-16 200 122)" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="1.4"/>
    <circle cx="205" cy="118" r="46" fill="url(#opl)"/>
    <path d="M168 104c14 6 38 4 68-4M164 126c22 10 52 6 82-8" stroke="#fff" stroke-opacity=".28" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M118 140 C150 160 232 160 292 112" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round" transform="translate(0 -6)"/>
    ${stage(78, 160, 1, '#A78BFA', '#6D28D9')}
    ${stage(150, 190, 2, '#FDBA74', '#EA580C')}
    ${stage(286, 66, 3, '#6EE7F5', '#2563EB')}
    ${rocketShape(262, 150, 0.85, 38)}
    <text x="78" y="190" text-anchor="middle" font-size="9" font-weight="700" fill="#fff" opacity=".85" letter-spacing=".08em">FOUNDATION</text>
    <text x="150" y="220" text-anchor="middle" font-size="9" font-weight="700" fill="#fff" opacity=".85" letter-spacing=".08em">CREATE</text>
    <text x="286" y="96" text-anchor="middle" font-size="9" font-weight="700" fill="#fff" opacity=".85" letter-spacing=".08em">EXPLORE</text>
  </svg>`;
}

function littleArt(t: Theme): string {
  const block = (
    x: number,
    y: number,
    w: number,
    fill: string,
    edge: string,
    label: string,
  ) => `
    <g transform="translate(${x} ${y})">
      <path d="M0 6a6 6 0 016-6h10l4 5h14l4-5h${w - 38}a6 6 0 016 6v26a6 6 0 01-6 6H${w - 4}"/>
      <rect x="0" y="0" width="${w}" height="38" rx="7" fill="${fill}"/>
      <rect x="0" y="30" width="${w}" height="8" rx="4" fill="${edge}"/>
      <rect x="14" y="-5" width="26" height="9" rx="4" fill="${fill}"/>
      <text x="14" y="25" font-size="13" font-weight="800" fill="#fff" font-family="monospace">${label}</text>
    </g>`;
  return `
  <svg viewBox="0 0 330 230" class="art" aria-hidden="true">
    <defs><radialGradient id="lglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="205" cy="118" r="104" fill="url(#lglow)"/>
    ${block(30, 38, 150, '#4C97FF', '#3373CC', 'when ⚑ clicked')}
    ${block(30, 78, 150, '#9966FF', '#774DCB', 'say "Hello!"')}
    ${block(30, 118, 150, '#FFAB19', '#CF8B17', 'repeat 10')}
    ${block(44, 158, 128, '#59C059', '#389438', 'move 10 steps')}
    <g transform="translate(228 112)">
      <circle cx="0" cy="0" r="46" fill="#fff"/>
      <circle cx="0" cy="0" r="46" fill="none" stroke="#FFD27A" stroke-width="5"/>
      <path d="M0 -46 L0 -62" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="0" cy="-66" r="7" fill="#FF6B6B"/>
      <circle cx="-16" cy="-6" r="9" fill="#14123A"/><circle cx="16" cy="-6" r="9" fill="#14123A"/>
      <circle cx="-13" cy="-9" r="3" fill="#fff"/><circle cx="19" cy="-9" r="3" fill="#fff"/>
      <path d="M-14 14 Q0 28 14 14" fill="none" stroke="#14123A" stroke-width="4" stroke-linecap="round"/>
      <circle cx="-30" cy="10" r="6" fill="#FFB3A7" opacity=".8"/><circle cx="30" cy="10" r="6" fill="#FFB3A7" opacity=".8"/>
    </g>
    ${rocketShape(300, 52, 0.62, 30)}
    <path d="M286 188l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#fff" opacity=".9"/>
    <path d="M214 36l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" opacity=".8"/>
  </svg>`;
}

function gameArt(t: Theme): string {
  const heart = (x: number, y: number) =>
    pixel(['.#.#.', '#####', '#####', '.###.', '..#..'], 5, x, y, '#FF4D6D');
  const invader = pixel(
    [
      '..#.....#..',
      '...#...#...',
      '..#######..',
      '.##.###.##.',
      '###########',
      '#.#######.#',
      '#.#.....#.#',
      '...##.##...',
    ],
    5,
    236,
    36,
    '#7CFFB2',
  );
  return `
  <svg viewBox="0 0 330 230" class="art" aria-hidden="true">
    <defs>
      <linearGradient id="gbody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D9DEF7"/></linearGradient>
      <radialGradient id="gglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="170" cy="120" r="108" fill="url(#gglow)"/>
    ${heart(206, 8)}${heart(236, 8)}${heart(266, 8)}
    ${invader}
    <g transform="translate(34 70)">
      <path d="M40 22h120a34 34 0 0133 28l12 52a24 24 0 01-42 18l-14-24H51l-14 24a24 24 0 01-42-18l12-52A34 34 0 0140 22z" fill="url(#gbody)"/>
      <path d="M40 22h120a34 34 0 0133 28l12 52a24 24 0 01-42 18l-14-24H51l-14 24a24 24 0 01-42-18l12-52A34 34 0 0140 22z" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>
      <rect x="44" y="40" width="14" height="38" rx="3" fill="#2A2A52"/><rect x="32" y="52" width="38" height="14" rx="3" fill="#2A2A52"/>
      <circle cx="132" cy="68" r="9" fill="#38BDF8"/><circle cx="154" cy="52" r="9" fill="#FACC15"/>
      <circle cx="154" cy="84" r="9" fill="#FF4D6D"/><circle cx="176" cy="68" r="9" fill="#4ADE80"/>
      <circle cx="90" cy="86" r="11" fill="#E4E6F7"/><circle cx="90" cy="86" r="6" fill="#B8BCE0"/>
      <circle cx="116" cy="86" r="11" fill="#E4E6F7"/><circle cx="116" cy="86" r="6" fill="#B8BCE0"/>
    </g>
    <g transform="translate(40 196)">
      <rect width="170" height="14" rx="7" fill="#14123A" opacity=".55"/><rect x="2" y="2" width="112" height="10" rx="5" fill="${GOLD}"/>
      <text x="180" y="12" font-size="11" font-weight="900" fill="#fff" letter-spacing=".1em">LEVEL UP!</text>
    </g>
    <circle cx="296" cy="110" r="15" fill="${GOLD}"/><circle cx="296" cy="110" r="10" fill="none" stroke="#C68A00" stroke-width="2.4"/>
    <circle cx="296" cy="150" r="11" fill="${GOLD}"/><circle cx="296" cy="150" r="7" fill="none" stroke="#C68A00" stroke-width="2"/>
    <path d="M300 196l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#fff" opacity=".85" transform="scale(.7) translate(130 -20)"/>
  </svg>`;
}

function aiArt(t: Theme): string {
  const layers: [number, number[]][] = [
    [56, [70, 112, 154, 196]],
    [118, [58, 94, 130, 166, 202]],
    [180, [82, 124, 166]],
  ];
  const edges: string[] = [];
  for (let l = 0; l < layers.length - 1; l++)
    for (const y1 of layers[l][1])
      for (const y2 of layers[l + 1][1])
        edges.push(
          `<line x1="${layers[l][0]}" y1="${y1}" x2="${layers[l + 1][0]}" y2="${y2}" stroke="#fff" stroke-opacity=".28" stroke-width="1.1"/>`,
        );
  const outs = layers[2][1]
    .map(
      (y) =>
        `<line x1="180" y1="${y}" x2="232" y2="124" stroke="#fff" stroke-opacity=".34" stroke-width="1.2"/>`,
    )
    .join('');
  const nodes = layers
    .flatMap(([x, ys], li) =>
      ys.map(
        (y, i) =>
          `<circle cx="${x}" cy="${y}" r="9" fill="url(#aglow)"/><circle cx="${x}" cy="${y}" r="5.5" fill="${(li + i) % 3 === 0 ? '#F0ABFC' : (li + i) % 3 === 1 ? '#7DD3FC' : '#fff'}"/>`,
      ),
    )
    .join('');
  return `
  <svg viewBox="0 0 330 230" class="art" aria-hidden="true">
    <defs>
      <radialGradient id="aglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="ahead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D8CCFF"/></linearGradient>
    </defs>
    ${edges.join('')}${outs}${nodes}
    <g transform="translate(236 70)">
      <line x1="40" y1="0" x2="40" y2="-16" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="40" cy="-21" r="6" fill="#F0ABFC"/>
      <rect x="2" y="0" width="76" height="66" rx="18" fill="url(#ahead)"/>
      <rect x="-8" y="22" width="9" height="22" rx="4" fill="#C4B5FD"/><rect x="79" y="22" width="9" height="22" rx="4" fill="#C4B5FD"/>
      <rect x="12" y="16" width="56" height="30" rx="12" fill="#1E1B4B"/>
      <circle cx="28" cy="31" r="7" fill="#7DD3FC"/><circle cx="52" cy="31" r="7" fill="#7DD3FC"/>
      <circle cx="30" cy="29" r="2.4" fill="#fff"/><circle cx="54" cy="29" r="2.4" fill="#fff"/>
      <rect x="22" y="53" width="36" height="5" rx="2.5" fill="#8B5CF6"/>
    </g>
    <text x="276" y="176" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff" letter-spacing=".1em" opacity=".9">98% CAT</text>
    <rect x="236" y="182" width="80" height="7" rx="3.5" fill="#14123A" opacity=".45"/><rect x="236" y="182" width="64" height="7" rx="3.5" fill="#7DD3FC"/>
    <rect x="236" y="196" width="80" height="7" rx="3.5" fill="#14123A" opacity=".45"/><rect x="236" y="196" width="20" height="7" rx="3.5" fill="#F0ABFC"/>
  </svg>`;
}

function webArt(t: Theme): string {
  return `
  <svg viewBox="0 0 330 230" class="art" aria-hidden="true">
    <defs><radialGradient id="wglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="180" cy="118" r="110" fill="url(#wglow)"/>
    <g transform="translate(28 30)">
      <rect width="270" height="168" rx="14" fill="#fff"/>
      <path d="M0 14a14 14 0 0114-14h242a14 14 0 0114 14v18H0z" fill="#E7EDFB"/>
      <circle cx="16" cy="16" r="4.5" fill="#FF6B6B"/><circle cx="31" cy="16" r="4.5" fill="#FFC83D"/><circle cx="46" cy="16" r="4.5" fill="#4ADE80"/>
      <rect x="66" y="9" width="150" height="14" rx="7" fill="#fff"/>
      <rect x="14" y="44" width="242" height="22" rx="6" fill="${t.main}"/>
      <rect x="22" y="51" width="52" height="8" rx="4" fill="#fff" opacity=".85"/><rect x="190" y="51" width="22" height="8" rx="4" fill="#fff" opacity=".5"/><rect x="220" y="51" width="26" height="8" rx="4" fill="#fff" opacity=".5"/>
      <rect x="14" y="76" width="130" height="46" rx="8" fill="#DBEAFE"/>
      <rect x="24" y="86" width="84" height="9" rx="4" fill="#2563EB"/><rect x="24" y="101" width="60" height="6" rx="3" fill="#93C5FD"/>
      <rect x="154" y="76" width="102" height="46" rx="8" fill="#CFFAFE"/>
      <circle cx="205" cy="99" r="14" fill="#22D3EE"/><path d="M200 93l12 6-12 6z" fill="#fff"/>
      <rect x="14" y="132" width="76" height="26" rx="6" fill="#EEF2FF"/><rect x="97" y="132" width="76" height="26" rx="6" fill="#EEF2FF"/><rect x="180" y="132" width="76" height="26" rx="6" fill="#EEF2FF"/>
    </g>
    <g transform="translate(236 130)">
      <rect width="86" height="56" rx="14" fill="#14123A" opacity=".92"/>
      <text x="43" y="38" text-anchor="middle" font-size="26" font-weight="900" fill="#7DD3FC" font-family="monospace">&lt;/&gt;</text>
    </g>
    <path d="M118 112l0 34 9-7 6 14 8-4-6-13 12-1z" fill="#fff" stroke="#14123A" stroke-width="2" stroke-linejoin="round" transform="translate(110 -6)"/>
  </svg>`;
}

function dataArt(t: Theme): string {
  const pts: [number, number][] = [
    [64, 156],
    [84, 146],
    [98, 150],
    [114, 128],
    [132, 132],
    [148, 112],
    [166, 116],
    [182, 94],
    [200, 98],
    [218, 76],
    [236, 70],
  ];
  const dots = pts
    .map(
      ([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="5" fill="${i % 3 === 0 ? '#FDE047' : i % 3 === 1 ? '#5EEAD4' : '#fff'}"/>`,
    )
    .join('');
  const bars = [34, 52, 40, 70, 58]
    .map(
      (h, i) =>
        `<rect x="${250 + i * 12}" y="${190 - h}" width="8" height="${h}" rx="2" fill="${i === 3 ? '#FDE047' : '#fff'}" opacity="${i === 3 ? 1 : 0.7}"/>`,
    )
    .join('');
  return `
  <svg viewBox="0 0 330 230" class="art" aria-hidden="true">
    <defs><radialGradient id="dglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="170" cy="118" r="110" fill="url(#dglow)"/>
    <g>
      <rect x="40" y="44" width="228" height="156" rx="16" fill="#0A3F3D" opacity=".62"/>
      <rect x="40" y="44" width="228" height="156" rx="16" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6"/>
      <path d="M58 60V182H252" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>
      <path d="M58 150H252M58 118H252M58 86H252" stroke="#fff" stroke-opacity=".16" stroke-width="1"/>
      <path d="M64 162L236 66" stroke="#FDE047" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7"/>
      ${dots}${bars}
    </g>
    <g transform="translate(250 24)">
      <circle cx="26" cy="26" r="22" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="5"/>
      <path d="M42 42l20 20" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      <path d="M14 30l8-9 7 6 8-10" fill="none" stroke="#FDE047" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`;
}

function adsArt(t: Theme): string {
  const orbitDots = [
    [112, 150, '#FDE047'],
    [150, 186, '#5EEAD4'],
    [250, 190, '#F0ABFC'],
    [292, 130, '#fff'],
    [262, 52, '#7DD3FC'],
  ]
    .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6" fill="${c}"/>`)
    .join('');
  return `
  <svg viewBox="0 0 330 230" class="art" aria-hidden="true">
    <defs>
      <radialGradient id="apl" cx="35%" cy="30%" r="85%"><stop offset="0" stop-color="#FFE9A6"/><stop offset=".5" stop-color="#FBBF24"/><stop offset="1" stop-color="#F59E0B"/></radialGradient>
      <radialGradient id="aoglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="200" cy="118" r="112" fill="url(#aoglow)"/>
    <circle cx="200" cy="118" r="88" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.4"/>
    <circle cx="200" cy="118" r="62" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.4"/>
    <ellipse cx="200" cy="118" rx="118" ry="34" transform="rotate(-14 200 118)" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6"/>
    <circle cx="200" cy="118" r="38" fill="url(#apl)"/>
    ${orbitDots}
    <path d="M46 196l30-24 26 12 32-34 28 14 34-44" fill="none" stroke="#7DD3FC" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
    <circle cx="46" cy="196" r="4" fill="#fff"/><circle cx="76" cy="172" r="4" fill="#fff"/><circle cx="102" cy="184" r="4" fill="#fff"/><circle cx="134" cy="150" r="4" fill="#fff"/><circle cx="162" cy="164" r="4" fill="#fff"/><circle cx="196" cy="120" r="0" fill="#fff"/>
    ${rocketShape(284, 34, 0.5, 36)}
  </svg>`;
}

function digitalArt(t: Theme): string {
  const steps = [34, 58, 84, 114]
    .map(
      (h, i) =>
        `<rect x="${196 + i * 28}" y="${190 - h}" width="22" height="${h}" rx="5" fill="${i === 3 ? GOLD : '#fff'}" opacity="${i === 3 ? 1 : 0.55 + i * 0.1}"/>`,
    )
    .join('');
  return `
  <svg viewBox="0 0 330 230" class="art" aria-hidden="true">
    <defs><radialGradient id="igl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="170" cy="118" r="110" fill="url(#igl)"/>
    <g transform="translate(26 60)">
      <rect x="0" y="32" width="136" height="92" rx="14" fill="#fff"/>
      <path d="M44 32V22a10 10 0 0110-10h28a10 10 0 0110 10v10" fill="none" stroke="#fff" stroke-width="8"/>
      <rect x="0" y="66" width="136" height="8" fill="${t.main}" opacity=".25"/>
      <rect x="56" y="58" width="24" height="26" rx="6" fill="${t.main}"/><circle cx="68" cy="71" r="4" fill="#fff"/>
      <rect x="14" y="94" width="58" height="8" rx="4" fill="#CDEED3"/><rect x="14" y="108" width="40" height="6" rx="3" fill="#E4F6E8"/>
    </g>
    <g transform="translate(128 24)">
      <rect width="104" height="70" rx="10" fill="#14123A" opacity=".9"/>
      <rect x="8" y="8" width="88" height="8" rx="4" fill="${GOLD}"/>
      <rect x="8" y="22" width="40" height="40" rx="6" fill="#fff" opacity=".9"/>
      <circle cx="28" cy="38" r="8" fill="${t.main}"/><path d="M14 62c2-9 8-12 14-12s12 3 14 12z" fill="${t.main}"/>
      <rect x="54" y="26" width="42" height="6" rx="3" fill="#fff" opacity=".8"/><rect x="54" y="38" width="32" height="6" rx="3" fill="#fff" opacity=".5"/><rect x="54" y="50" width="38" height="6" rx="3" fill="#fff" opacity=".5"/>
    </g>
    ${steps}
    <path d="M296 44l7 14 15 2-11 10 3 15-14-8-14 8 3-15-11-10 15-2z" fill="${GOLD}"/>
    <path d="M214 120l30-34 14 14 38-50" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 6"/>
  </svg>`;
}

const ART: Record<ThemeKey, (t: Theme) => string> = {
  odyssey: odysseyArt,
  little: littleArt,
  game: gameArt,
  ai: aiArt,
  web: webArt,
  data: dataArt,
  ads: adsArt,
  digital: digitalArt,
};

/** The program's signature illustration for the cover banner. */
export function heroArt(t: Theme): string {
  return ART[t.key](t);
}

// ─── Gamified markers used on several pages ─────────────────────────────────

/** A hexagon "level" badge with a number. */
export function levelBadge(
  n: string | number,
  from: string,
  to: string,
  size = 44,
  id = 'lb',
): string {
  return `<svg class="lvl" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <path d="M24 2.5l18.5 10.7v21.6L24 45.5 5.5 34.8V13.2z" fill="url(#${id})" stroke="#fff" stroke-opacity=".75" stroke-width="2"/>
    <text x="24" y="30" text-anchor="middle" font-size="19" font-weight="900" fill="#fff">${n}</text></svg>`;
}

/** An XP bar: `done` of `total` segments lit. */
export function xpBar(done: number, total: number, color: string): string {
  const segs = Array.from(
    { length: total },
    (_, i) =>
      `<i style="background:${i < done ? color : 'rgba(255,255,255,.18)'}"></i>`,
  ).join('');
  return `<span class="xp">${segs}</span>`;
}

export const NAVY_TEXT = NAVY;
