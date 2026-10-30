import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDITS_TOOLTIP,
  creditsLabel,
  formatCredits,
  progressUnitLabel,
  rankTooltip,
  type RankInfo,
} from './progress.ts';

const rank = (over: Partial<RankInfo> = {}): RankInfo => ({
  id: 'STARCHILD',
  label: 'Starchild',
  icon: '🌟',
  min: 0,
  sessions: 2,
  progressPct: 40,
  sessionsToNext: 3,
  next: { id: 'EXPLORER', label: 'Explorer', icon: '🔭', min: 5, sessionsNeeded: 3 },
  requirement: '',
  ladder: [],
  ...over,
});

test('credits are always rounded DOWN to whole classes — never a fraction, never rounded up', () => {
  assert.equal(formatCredits(8), '8');
  assert.equal(formatCredits(4.5), '4');
  assert.equal(formatCredits(4.9), '4');
  assert.equal(formatCredits(4.99), '4');
  assert.equal(formatCredits(0.9), '0');
  assert.equal(formatCredits(0), '0');
  assert.equal(formatCredits(-1.5), '0');
});

test('"1 Credit" is singular, everything else plural', () => {
  assert.equal(creditsLabel(1), 'Credit');
  assert.equal(creditsLabel(0), 'Credits');
  assert.equal(creditsLabel(8), 'Credits');
  assert.equal(creditsLabel(1.9), 'Credit'); // shown as 1
  assert.equal(creditsLabel(0.9), 'Credits'); // shown as 0
});

test('the credits tooltip is the agreed wording', () => {
  assert.equal(
    CREDITS_TOOLTIP,
    'Each credit covers one scheduled class session. Your balance decreases by 1 after each attended class. At 0 credits, classes will pause until your next payment is confirmed. Please pay on time to avoid interruptions.',
  );
});

test('the rank tooltip names the real current and next rank', () => {
  const t = rankTooltip(rank());
  assert.match(t, /^Your current rank is Starchild! Keep learning, earning badges, and making progress to reach your next rank/);
  assert.match(t, /Explorer \(3 more classes\)/);
  assert.match(rankTooltip(rank({ sessionsToNext: 1, next: { id: 'EXPLORER', label: 'Explorer', icon: '🔭', min: 5, sessionsNeeded: 1 } })), /1 more class\)/);
});

test('the top rank has no "next rank" in its tooltip', () => {
  const t = rankTooltip(rank({ id: 'GALAXY_COMMANDER', label: 'Galaxy Commander', next: null, sessionsToNext: null }));
  assert.match(t, /Galaxy Commander/);
  assert.match(t, /highest rank/);
});

test('progress units pluralise', () => {
  assert.equal(progressUnitLabel('weeks', 1), 'week');
  assert.equal(progressUnitLabel('weeks', 4), 'weeks');
  assert.equal(progressUnitLabel('classes', 1), 'class');
  assert.equal(progressUnitLabel('classes', 5), 'classes');
});
