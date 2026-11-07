// FILE PATH: server/src/certificates/template/assets.ts
//
// Everything the certificate needs besides code — the two Lumexa fonts, the
// mascot, the seal artwork and the founder's signature — read once from
// server/assets/certificate and inlined into the page as data: URIs.
//
// The page is rendered with NO network access (the renderer blocks every
// request that is not data:), so a certificate can never depend on a font CDN
// or an image host being reachable, and never changes because one moved. The
// files are versioned with the template (see TEMPLATE_VERSION): changing one
// is a new template version, never an edit of what was already issued.

import * as fs from 'fs';
import * as path from 'path';

/** server/assets/certificate, from both src/ (tests) and dist/ (production). */
export const CERTIFICATE_ASSET_DIR = path.join(
  __dirname,
  '../../../assets/certificate',
);

export type CertificateImageName =
  | 'logo-mascot.png'
  | 'seal-mascot.png'
  | 'founder-signature.png';

interface FontFace {
  family: 'Cormorant Garamond' | 'Inter';
  weight: number;
  style: 'normal' | 'italic';
  file: string;
  /** The same unicode-range the font's publisher declares for the subset, so
   * the browser only loads the subset a page actually needs. */
  range: string;
}

const CG_LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const CG_LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const INTER_LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

/** Exactly the faces the design uses (Cormorant Garamond for the names and the
 * italic lines, Inter for the labels). Latin + Latin-Extended cover every name
 * the certificate accepts (see certificate-name.ts). */
const FONT_FACES: FontFace[] = [
  ...(['latin', 'latin-ext'] as const).flatMap((subset) =>
    (
      [
        { weight: 500, style: 'italic' },
        { weight: 600, style: 'normal' },
        { weight: 700, style: 'normal' },
      ] as const
    ).map(
      (f): FontFace => ({
        family: 'Cormorant Garamond',
        weight: f.weight,
        style: f.style,
        file: `fonts/cormorant-garamond-${subset}-${f.weight}-${f.style}.woff2`,
        range: subset === 'latin' ? CG_LATIN : CG_LATIN_EXT,
      }),
    ),
  ),
  ...([400, 500, 600, 700] as const).map(
    (weight): FontFace => ({
      family: 'Inter',
      weight,
      style: 'normal',
      file: `fonts/inter-latin-${weight}-normal.woff2`,
      range: INTER_LATIN,
    }),
  ),
];

let cachedFontCss: string | null = null;
const cachedImages = new Map<string, string>();

function dataUri(file: string, mime: string): string {
  const buffer = fs.readFileSync(path.join(CERTIFICATE_ASSET_DIR, file));
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/** The @font-face rules, with every file inlined. */
export function certificateFontCss(): string {
  if (!cachedFontCss) {
    cachedFontCss = FONT_FACES.map(
      (f) =>
        `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:block;` +
        `src:url(${dataUri(f.file, 'font/woff2')}) format('woff2');unicode-range:${f.range};}`,
    ).join('\n');
  }
  return cachedFontCss;
}

/** A PNG from the asset folder as a data: URI. */
export function certificateImage(name: CertificateImageName): string {
  let uri = cachedImages.get(name);
  if (!uri) {
    uri = dataUri(name, 'image/png');
    cachedImages.set(name, uri);
  }
  return uri;
}

/** Drops the in-memory copies (tests). */
export function resetCertificateAssetCache(): void {
  cachedFontCss = null;
  cachedImages.clear();
}
