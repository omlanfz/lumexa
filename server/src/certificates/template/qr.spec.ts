import { qrPath } from './qr';

describe('qrPath', () => {
  const tile = { x: 1167.5, y: 733.5, size: 102 };
  const URL_A = 'https://frontend.example.test/verify/LXA-2026-A7K9Q2';

  it('draws one vector path for the whole symbol', () => {
    const qr = qrPath(URL_A, tile);
    expect(qr.path.startsWith('M')).toBe(true);
    expect(qr.path.endsWith('z')).toBe(true);
    expect(qr.modules).toBeGreaterThanOrEqual(21);
    expect((qr.modules - 17) % 4).toBe(0); // QR sizes are 21, 25, 29, 33 …
  });

  it('leaves a quiet zone of exactly four modules, whatever the density', () => {
    for (const url of [URL_A, `${URL_A}/${'x'.repeat(40)}`]) {
      const qr = qrPath(url, tile);
      const unit = tile.size / (qr.modules + 8);
      expect(qr.size).toBeCloseTo(unit * qr.modules, 6);
      // the symbol is centred in the tile
      const quiet = (tile.size - qr.size) / 2;
      expect(quiet).toBeCloseTo(4 * unit, 6);
    }
  });

  it('keeps every module inside the tile', () => {
    const qr = qrPath(URL_A, tile);
    const nums = [...qr.path.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
    for (const [x, y] of nums) {
      expect(x).toBeGreaterThanOrEqual(tile.x);
      expect(y).toBeGreaterThanOrEqual(tile.y);
      expect(x).toBeLessThanOrEqual(tile.x + tile.size);
      expect(y).toBeLessThanOrEqual(tile.y + tile.size);
    }
  });

  it('encodes different addresses differently, and the same address identically', () => {
    expect(qrPath(URL_A, tile).path).toBe(qrPath(URL_A, tile).path);
    expect(qrPath(URL_A, tile).path).not.toBe(
      qrPath(URL_A.replace('A7K9Q2', 'B8L2R3'), tile).path,
    );
  });
});
