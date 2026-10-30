import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { BADGE_VISUALS, RANK_VISUAL_ID, ALL_EFFECTS, badgeVisual, rankVisual } from './badgeConfig.ts';

const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');

// The badge ids the BACKEND awards (server/src/students/progress/progress.rules.ts).
// Read straight from the source so a badge added there without a visual here
// fails this test.
const rulesPath = new URL('../../../server/src/students/progress/progress.rules.ts', import.meta.url);
const serverBadgeIds = existsSync(rulesPath)
  ? [...readFileSync(rulesPath, 'utf8').matchAll(/^\s{4}id: '([A-Z_0-9]+)',$/gm)].map((m) => m[1])
  : [];

test('every badge the backend awards has its own visual in the central config', { skip: serverBadgeIds.length === 0 }, () => {
  assert.equal(serverBadgeIds.length, 10);
  for (const id of serverBadgeIds) {
    assert.ok(BADGE_VISUALS[id], `no visual for ${id}`);
    assert.equal(BADGE_VISUALS[id].id, id);
  }
});

test('every badge (and the Starchild rank) has a DISTINCT animation effect', () => {
  const effects = Object.values(BADGE_VISUALS).map((v) => v.effect);
  assert.equal(new Set(effects).size, effects.length, 'two badges share an effect');
  assert.equal(effects.length, 11); // ten badges + the Starchild rank
});

test('every effect has its animation defined in the stylesheet, and reduced motion switches them off', () => {
  for (const effect of ALL_EFFECTS) {
    assert.match(css, new RegExp(`\\.bx-${effect}\\b`), `no .bx-${effect} rules in globals.css`);
  }
  const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)', css.indexOf('Student navbar pills')));
  assert.match(reduced, /\.bx \.bx-emoji[\s\S]*animation: none !important/);
});

test('each badge has an emoji, an identity colour and a tagline', () => {
  for (const v of Object.values(BADGE_VISUALS)) {
    assert.ok(v.icon.length > 0);
    assert.match(v.rgb, /^\d{1,3}, \d{1,3}, \d{1,3}$/);
    assert.ok(v.tagline.length > 5);
  }
});

test('every space rank maps to a visual; unknown ids fall back safely', () => {
  for (const rank of ['STARCHILD', 'EXPLORER', 'COSMONAUT', 'NAVIGATOR', 'CAPTAIN', 'GALAXY_COMMANDER']) {
    assert.ok(RANK_VISUAL_ID[rank]);
    assert.equal(rankVisual(rank).id, RANK_VISUAL_ID[rank]);
  }
  assert.equal(rankVisual('NOPE').id, 'RANK_STARCHILD');
  assert.equal(badgeVisual('NOPE').id, 'RANK_STARCHILD');
});
