import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RAIL_CHROME_PX,
  RAIL_GAP_PX,
  RAIL_PAD_PX,
  RAIL_SINGLE_COLUMN_MAX,
  railLayout,
  railTileWidthCss,
  railTileWidthPx,
  railWidthCss,
} from './railLayout.ts';

test('up to five people go in one column, six to ten go two to a row', () => {
  for (let n = 1; n <= RAIL_SINGLE_COLUMN_MAX; n++) assert.deepEqual(railLayout(n), { columns: 1, rows: n });
  assert.deepEqual(railLayout(6), { columns: 2, rows: 3 });
  assert.deepEqual(railLayout(7), { columns: 2, rows: 4 });
  assert.deepEqual(railLayout(10), { columns: 2, rows: 5 });
});

test('an empty or odd count never gives zero rows', () => {
  assert.equal(railLayout(0).rows, 1);
});

// The point of it all: whatever the window, every row fits between the header and
// the control bar, so nobody scrolls out of sight.
const heightUsed = (count: number, viewportH: number) => {
  const { rows } = railLayout(count);
  const tileW = railTileWidthPx(count, viewportH);
  const tileH = (tileW * 9) / 16;
  return rows * tileH + (rows - 1) * RAIL_GAP_PX + 2 * RAIL_PAD_PX;
};

test('every tile fits in the window height, for 1–10 people at common screen heights', () => {
  for (const viewportH of [600, 664, 720, 768, 800, 864, 900, 1080, 1440]) {
    for (let n = 1; n <= 10; n++) {
      const room = viewportH - RAIL_CHROME_PX;
      assert.ok(heightUsed(n, viewportH) <= room + 0.01, `${n} people at ${viewportH}px tall use ${heightUsed(n, viewportH)} of ${room}`);
    }
  }
});

test('tiles are never wider than their column allows, even on a tall screen', () => {
  assert.equal(railTileWidthPx(1, 2000), 240);
  assert.equal(railTileWidthPx(4, 2000), 240);
  assert.equal(railTileWidthPx(10, 2000), 200);
});

test('a short window shrinks the tiles rather than hiding some', () => {
  assert.ok(railTileWidthPx(5, 600) < railTileWidthPx(5, 900));
  assert.ok(railTileWidthPx(10, 720) < railTileWidthPx(10, 1080));
  assert.ok(railTileWidthPx(10, 720) > 100, 'still big enough to recognise a face');
});

test('within one layout, more people never make a tile bigger', () => {
  // (Going from five to six switches to two columns, which can make tiles a little bigger — on purpose.)
  for (const viewportH of [720, 900, 1080]) {
    for (const [from, to] of [[1, 5], [6, 10]]) {
      for (let n = from; n < to; n++) {
        assert.ok(railTileWidthPx(n + 1, viewportH) <= railTileWidthPx(n, viewportH) + 0.01, `${n}→${n + 1} at ${viewportH}`);
      }
    }
  }
});

test('the same sum is handed to CSS so the browser keeps it right as the window resizes', () => {
  const css = railTileWidthCss(10);
  assert.match(css, /^min\(200px, calc\(\(100vh - \d+px\) \/ 5 \* 16 \/ 9\)\)$/);
  assert.equal(railTileWidthCss(3).includes('/ 3 *'), true);
  const rail = railWidthCss(10, '150px');
  assert.equal(rail, `calc(150px * 2 + ${RAIL_GAP_PX + 2 * RAIL_PAD_PX}px)`);
  assert.equal(railWidthCss(2, '150px'), `calc(150px * 1 + ${2 * RAIL_PAD_PX}px)`);
});
