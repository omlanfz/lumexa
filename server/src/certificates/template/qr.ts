// FILE PATH: server/src/certificates/template/qr.ts
//
// The verification QR code, as a single vector <path> (never a raster), so it
// stays razor sharp in the printed PDF and in the large PNG.
//
// It encodes exactly the public verification URL. Error correction is level M
// (15%): enough to survive print wear without making the code denser than a
// phone camera reads comfortably at 2 cm.

import * as QRCode from 'qrcode';

export interface QrLayout {
  /** SVG path data in design units: one fill-rule path for every dark module. */
  path: string;
  /** Modules per side of the encoded symbol (quiet zone excluded). */
  modules: number;
  /** Side of the drawn symbol, in design units. */
  size: number;
}

/** The symbol always sits in a white tile with a quiet zone of exactly four
 * modules (the QR specification's minimum), whatever its density. */
const QUIET_ZONE_MODULES = 4;

/** Encodes `text` and lays it out centred in a square tile of `tile` units
 * whose top-left corner is (x, y). */
export function qrPath(
  text: string,
  tile: { x: number; y: number; size: number },
): QrLayout {
  const symbol = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const modules = symbol.modules.size;
  const unit = tile.size / (modules + 2 * QUIET_ZONE_MODULES);
  const size = unit * modules;
  const originX = tile.x + QUIET_ZONE_MODULES * unit;
  const originY = tile.y + QUIET_ZONE_MODULES * unit;
  const r = (v: number) => Math.round(v * 1000) / 1000;

  const parts: string[] = [];
  for (let row = 0; row < modules; row++) {
    let col = 0;
    while (col < modules) {
      if (!symbol.modules.get(row, col)) {
        col++;
        continue;
      }
      let end = col;
      while (end < modules && symbol.modules.get(row, end)) end++;
      // one rectangle per horizontal run of dark modules
      parts.push(
        `M${r(originX + col * unit)} ${r(originY + row * unit)}h${r((end - col) * unit)}v${r(unit)}h${r(-(end - col) * unit)}z`,
      );
      col = end;
    }
  }
  return { path: parts.join(''), modules, size };
}
