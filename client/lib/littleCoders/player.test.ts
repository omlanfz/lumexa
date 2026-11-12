import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PLAYBACK_SPEEDS,
  actionForKey,
  chapterIndexAt,
  chapterMarkers,
  chapterTarget,
  clampTime,
  formatTime,
  nextSpeed,
  parseChapterStarts,
  speedLabel,
} from './player';

const CHAPTERS = [
  { label: 'The question', start: 0 },
  { label: 'Meet the idea', start: 7.8 },
  { label: 'How it works', start: 18.8 },
  { label: 'Your turn', start: 69.3 },
];

describe('formatTime', () => {
  it('writes minutes and seconds', () => {
    assert.equal(formatTime(0), '0:00');
    assert.equal(formatTime(5.9), '0:05');
    assert.equal(formatTime(65), '1:05');
    assert.equal(formatTime(80.3), '1:20');
    assert.equal(formatTime(600), '10:00');
  });
  it('never shows NaN or a negative time (a video that has not loaded reports NaN)', () => {
    assert.equal(formatTime(Number.NaN), '0:00');
    assert.equal(formatTime(-4), '0:00');
    assert.equal(formatTime(Number.POSITIVE_INFINITY), '0:00');
  });
});

describe('clampTime', () => {
  it('keeps a moment inside the video', () => {
    assert.equal(clampTime(-3, 80), 0);
    assert.equal(clampTime(40, 80), 40);
    assert.equal(clampTime(200, 80), 80);
    assert.equal(clampTime(Number.NaN, 80), 0);
    assert.equal(clampTime(12, Number.NaN), 12);
  });
});

describe('chapters', () => {
  it('finds the chapter a moment is in', () => {
    assert.equal(chapterIndexAt(CHAPTERS, 0), 0);
    assert.equal(chapterIndexAt(CHAPTERS, 7.76), 1); // a hair (0.04 s) before the start still counts as the new chapter
    assert.equal(chapterIndexAt(CHAPTERS, 7.7), 0);
    assert.equal(chapterIndexAt(CHAPTERS, 7.0), 0);
    assert.equal(chapterIndexAt(CHAPTERS, 18.8), 2);
    assert.equal(chapterIndexAt(CHAPTERS, 79), 3);
    assert.equal(chapterIndexAt([], 10), -1);
    assert.equal(chapterIndexAt([{ label: 'Later', start: 5 }], 1), -1);
  });

  it('puts markers along the bar — not at the very start or end, and not outside the video', () => {
    const markers = chapterMarkers(CHAPTERS, 80);
    assert.deepEqual(
      markers.map((m) => m.label),
      ['Meet the idea', 'How it works', 'Your turn'],
    );
    assert.ok(Math.abs(markers[0].percent - 9.75) < 0.001);
    assert.deepEqual(chapterMarkers(CHAPTERS, Number.NaN), []);
    assert.deepEqual(chapterMarkers([{ label: 'Past the end', start: 90 }], 80), []);
  });

  it('goes to the next and the previous chapter', () => {
    assert.equal(chapterTarget(CHAPTERS, 3, 1), 7.8);
    assert.equal(chapterTarget(CHAPTERS, 75, 1), null); // already in the last chapter
    assert.equal(chapterTarget(CHAPTERS, 30, -1), 18.8); // far into a chapter: back to its start
    assert.equal(chapterTarget(CHAPTERS, 19.5, -1), 7.8); // just started it: the one before
    assert.equal(chapterTarget(CHAPTERS, 1, -1), 0);
    assert.equal(chapterTarget([], 10, 1), null);
  });
});

describe('speed', () => {
  it('cycles through the speeds and starts over', () => {
    assert.deepEqual([...PLAYBACK_SPEEDS], [0.75, 1, 1.25, 1.5]);
    assert.equal(nextSpeed(1), 1.25);
    assert.equal(nextSpeed(1.5), 0.75);
    assert.equal(nextSpeed(0.75), 1);
    assert.equal(nextSpeed(3), 1);
    assert.equal(speedLabel(1.25), '1.25×');
  });
});

describe('keyboard', () => {
  it('maps the usual video keys', () => {
    assert.deepEqual(actionForKey(' '), { type: 'toggle' });
    assert.deepEqual(actionForKey('k'), { type: 'toggle' });
    assert.deepEqual(actionForKey('ArrowLeft'), { type: 'seekBy', seconds: -5 });
    assert.deepEqual(actionForKey('ArrowRight'), { type: 'seekBy', seconds: 5 });
    assert.deepEqual(actionForKey('j'), { type: 'seekBy', seconds: -10 });
    assert.deepEqual(actionForKey('L'), { type: 'seekBy', seconds: 10 });
    assert.deepEqual(actionForKey('ArrowUp'), { type: 'volumeBy', delta: 0.1 });
    assert.deepEqual(actionForKey('ArrowDown'), { type: 'volumeBy', delta: -0.1 });
    assert.deepEqual(actionForKey('m'), { type: 'mute' });
    assert.deepEqual(actionForKey('f'), { type: 'fullscreen' });
    assert.deepEqual(actionForKey('c'), { type: 'captions' });
    assert.deepEqual(actionForKey('Home'), { type: 'seekToStart' });
    assert.deepEqual(actionForKey('End'), { type: 'seekToEnd' });
    assert.deepEqual(actionForKey('n'), { type: 'chapter', delta: 1 });
    assert.deepEqual(actionForKey('PageUp'), { type: 'chapter', delta: -1 });
    assert.deepEqual(actionForKey('0'), { type: 'seekToPercent', percent: 0 });
    assert.deepEqual(actionForKey('5'), { type: 'seekToPercent', percent: 50 });
  });
  it('leaves everything else — and browser shortcuts such as Ctrl+F or Ctrl+C — alone', () => {
    assert.equal(actionForKey('Tab'), null);
    assert.equal(actionForKey('Enter'), null);
    assert.equal(actionForKey('x'), null);
    assert.equal(actionForKey('f', { ctrl: true }), null);
    assert.equal(actionForKey('c', { meta: true }), null);
    assert.equal(actionForKey('ArrowLeft', { alt: true }), null);
  });
});

describe('chapter start times typed by an admin', () => {
  it('names them after the standard scenes', () => {
    assert.deepEqual(parseChapterStarts('0, 8, 19.25').chapters, [
      { label: 'The question', start: 0 },
      { label: 'Meet the idea', start: 8 },
      { label: 'How it works', start: 19.3 },
    ]);
    assert.deepEqual(parseChapterStarts('0 7.8 18.8 42.8 59.8 69.3').chapters.length, 6);
    assert.deepEqual(parseChapterStarts('  '), { chapters: [], error: null });
  });
  it('refuses times that cannot be right', () => {
    assert.match(parseChapterStarts('5, 10').error ?? '', /start at 0/);
    assert.match(parseChapterStarts('0, 10, 10').error ?? '', /go up/);
    assert.match(parseChapterStarts('0, 10, 5').error ?? '', /go up/);
    assert.match(parseChapterStarts('0, abc').error ?? '', /seconds/);
    assert.match(parseChapterStarts('0, -4').error ?? '', /seconds/);
    assert.match(parseChapterStarts('0,1,2,3,4,5,6').error ?? '', /at most 6/);
    assert.match(parseChapterStarts('0, 90', 80).error ?? '', /after the video ends/);
    assert.equal(parseChapterStarts('0, 79', 80).error, null);
  });
});
