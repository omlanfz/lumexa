// FILE PATH: client/lib/classroom/railLayout.ts
//
// How the participant rail lays its tiles out so that EVERYONE stays on screen
// — a classroom holds up to 10 people — instead of the last few scrolling out of
// sight. Up to five tiles go in one column; more go two to a row. The tile size
// is then worked out from the window's height: as many rows as there are, shrunk
// just enough to fit between the header and the control bar. Pure, so the
// numbers can be tested; the rail turns them into CSS (see ParticipantRail).

/** Up to this many tiles fit one column; more go two to a row. */
export const RAIL_SINGLE_COLUMN_MAX = 5;

/** Space between tiles and around them (Tailwind gap-2 / p-2). */
export const RAIL_GAP_PX = 8;
export const RAIL_PAD_PX = 8;

/** The header and the control bar, which the rail sits between. */
export const RAIL_CHROME_PX = 56 + 76;

/** The widest a tile gets, whatever the window size. */
export const RAIL_MAX_TILE_W_PX = { 1: 240, 2: 200 } as const;

export interface RailLayout {
  columns: 1 | 2;
  rows: number;
}

export function railLayout(count: number): RailLayout {
  const columns = count > RAIL_SINGLE_COLUMN_MAX ? 2 : 1;
  return { columns, rows: Math.max(1, Math.ceil(count / columns)) };
}

/** The widest 16:9 tile (px) at which `rows` of them fit in a window `viewportH`
 * tall, capped at the column's maximum. */
export function railTileWidthPx(count: number, viewportH: number): number {
  const { columns, rows } = railLayout(count);
  const free = viewportH - RAIL_CHROME_PX - 2 * RAIL_PAD_PX - RAIL_GAP_PX * (rows - 1);
  const fit = (Math.max(0, free) / rows) * (16 / 9);
  return Math.min(RAIL_MAX_TILE_W_PX[columns], fit);
}

/** The same sum as CSS, so the browser redoes it as the window is resized. */
export function railTileWidthCss(count: number): string {
  const { columns, rows } = railLayout(count);
  const fixed = RAIL_CHROME_PX + 2 * RAIL_PAD_PX + RAIL_GAP_PX * (rows - 1);
  return `min(${RAIL_MAX_TILE_W_PX[columns]}px, calc((100vh - ${fixed}px) / ${rows} * 16 / 9))`;
}

/** Width of the whole rail (CSS) for tiles of width `tileW` (a CSS length). */
export function railWidthCss(count: number, tileW: string): string {
  const { columns } = railLayout(count);
  return `calc(${tileW} * ${columns} + ${RAIL_GAP_PX * (columns - 1) + 2 * RAIL_PAD_PX}px)`;
}
