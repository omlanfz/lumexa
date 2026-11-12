// FILE PATH: server/src/little-coders/blocks/block-catalog.ts
//
// The blocks Little Coders content may show — checked against the real platforms, never
// invented:
//
//   * MIT Scratch 3 / Stretch3 — the labels of the official editor (scratch-l10n,
//     editor/blocks/en.json), e.g. "say %1 for %2 seconds", "change x by %1".
//   * TM2Scratch (the Stretch3 extension) — the blocks documented in its README:
//     image / sound classification model URL, when received image / sound label,
//     confidence of image / sound, set confidence threshold, Label once every … seconds,
//     turn video, turn classification, switch webcam to.
//   * EduBlocks — Python text. The blocks show real Python (`print( )`, `for i in range( ):`,
//     `turtle.forward( )` …); the Turtle group is the one in EduBlocks' own toolbox
//     (turtle = Turtle(), screen.setup, turtle.forward|left|right|backward, turtle.circle,
//     turtle.goto, turtle.pencolor, turtle.begin_fill|end_fill, turtle.penup|pendown …).
//
// A template is the block's label with every slot replaced by a placeholder:
//   (…) and […] → `_` (any value or dropdown)     {…} → `{}` (true/false slot)
// so "say [Hello!] for (2) seconds" is the template "say _ for _ seconds".
//
// Used by the curriculum and assessment validators (and their tests) so a lesson or a
// question can never show a block that does not exist.

import type { EduBlocksCategory, ScratchCategory } from '../lc.types';

export type BlockShape = 'hat' | 'stack' | 'c' | 'else' | 'cap' | 'reporter' | 'boolean';

interface Entry {
  t: string;
  shape: BlockShape;
}

const b = (t: string, shape: BlockShape = 'stack'): Entry => ({ t, shape });

export const SCRATCH_CATALOG: Record<ScratchCategory, Entry[]> = {
  motion: [
    b('move _ steps'),
    b('turn ↻ _ degrees'),
    b('turn ↺ _ degrees'),
    b('go to _'),
    b('go to x: _ y: _'),
    b('glide _ secs to _'),
    b('glide _ secs to x: _ y: _'),
    b('point in direction _'),
    b('point towards _'),
    b('change x by _'),
    b('set x to _'),
    b('change y by _'),
    b('set y to _'),
    b('if on edge, bounce'),
    b('set rotation style _'),
    b('x position', 'reporter'),
    b('y position', 'reporter'),
    b('direction', 'reporter'),
  ],
  looks: [
    b('say _ for _ seconds'),
    b('say _'),
    b('think _ for _ seconds'),
    b('think _'),
    b('switch costume to _'),
    b('next costume'),
    b('switch backdrop to _'),
    b('next backdrop'),
    b('change size by _'),
    b('set size to _ %'),
    b('change _ effect by _'),
    b('set _ effect to _'),
    b('clear graphic effects'),
    b('show'),
    b('hide'),
    b('go to _ layer'),
    b('go _ _ layers'),
    b('costume _', 'reporter'),
    b('backdrop _', 'reporter'),
    b('size', 'reporter'),
  ],
  sound: [
    b('play sound _ until done'),
    b('start sound _'),
    b('stop all sounds'),
    b('change _ effect by _'),
    b('set _ effect to _'),
    b('clear sound effects'),
    b('change volume by _'),
    b('set volume to _ %'),
    b('volume', 'reporter'),
  ],
  events: [
    b('when green flag clicked', 'hat'),
    b('when _ key pressed', 'hat'),
    b('when this sprite clicked', 'hat'),
    b('when stage clicked', 'hat'),
    b('when backdrop switches to _', 'hat'),
    b('when _ > _', 'hat'),
    b('when I receive _', 'hat'),
    b('broadcast _'),
    b('broadcast _ and wait'),
  ],
  control: [
    b('wait _ seconds'),
    b('repeat _', 'c'),
    b('forever', 'c'),
    b('if {} then', 'c'),
    b('else', 'else'),
    b('wait until {}'),
    b('repeat until {}', 'c'),
    b('stop _', 'cap'),
    b('when I start as a clone', 'hat'),
    b('create clone of _'),
    b('delete this clone', 'cap'),
  ],
  sensing: [
    b('touching _?', 'boolean'),
    b('touching color _?', 'boolean'),
    b('color _ is touching _?', 'boolean'),
    b('distance to _', 'reporter'),
    b('ask _ and wait'),
    b('answer', 'reporter'),
    b('key _ pressed?', 'boolean'),
    b('mouse down?', 'boolean'),
    b('mouse x', 'reporter'),
    b('mouse y', 'reporter'),
    b('set drag mode _'),
    b('loudness', 'reporter'),
    b('timer', 'reporter'),
    b('reset timer'),
    b('_ of _', 'reporter'),
    b('current _', 'reporter'),
    b('days since 2000', 'reporter'),
    b('username', 'reporter'),
  ],
  operators: [
    b('_ + _', 'reporter'),
    b('_ - _', 'reporter'),
    b('_ * _', 'reporter'),
    b('_ / _', 'reporter'),
    b('pick random _ to _', 'reporter'),
    b('_ > _', 'boolean'),
    b('_ < _', 'boolean'),
    b('_ = _', 'boolean'),
    b('{} and {}', 'boolean'),
    b('{} or {}', 'boolean'),
    b('not {}', 'boolean'),
    b('join _ _', 'reporter'),
    b('letter _ of _', 'reporter'),
    b('length of _', 'reporter'),
    b('_ contains _?', 'boolean'),
    b('_ mod _', 'reporter'),
    b('round _', 'reporter'),
    b('_ of _', 'reporter'),
  ],
  variables: [
    b('set _ to _'),
    b('change _ by _'),
    b('show variable _'),
    b('hide variable _'),
    b('add _ to _'),
    b('delete _ of _'),
    b('delete all of _'),
    b('insert _ at _ of _'),
    b('replace item _ of _ with _'),
    b('item _ of _', 'reporter'),
    b('item # of _ in _', 'reporter'),
    b('length of _', 'reporter'),
    b('_ contains _?', 'boolean'),
  ],
  myblocks: [],
  // The TM2Scratch extension of Stretch3 — exactly the blocks its README documents.
  tm2scratch: [
    b('image classification model URL _'),
    b('when received image label _', 'hat'),
    b('confidence of image _', 'reporter'),
    b('sound classification model URL _'),
    b('when received sound label _', 'hat'),
    b('confidence of sound _', 'reporter'),
    b('set confidence threshold _'),
    b('Label once every _ seconds'),
    b('turn video _'),
    b('turn classification _'),
    b('switch webcam to _'),
  ],
};

/** Scratch category display names exactly as the editor shows them. */
export const SCRATCH_CATEGORY_LABEL: Record<ScratchCategory, string> = {
  motion: 'Motion',
  looks: 'Looks',
  sound: 'Sound',
  events: 'Events',
  control: 'Control',
  sensing: 'Sensing',
  operators: 'Operators',
  variables: 'Variables',
  myblocks: 'My Blocks',
  tm2scratch: 'TM2Scratch (Extensions)',
};

/** EduBlocks group names as used in the lessons. The palette itself is keyed
 *  statements / text / math / logic / lists / loops / definitions / random / variables /
 *  imports / Turtle; "definitions" is shown to learners as Functions. */
export const EDUBLOCKS_CATEGORY_LABEL: Record<EduBlocksCategory, string> = {
  imports: 'Imports',
  statements: 'Statements',
  text: 'Text',
  math: 'Math',
  logic: 'Logic',
  lists: 'Lists',
  loops: 'Loops',
  functions: 'Functions',
  random: 'Random',
  variables: 'Variables',
  turtle: 'Turtle',
};

// ─── Python (EduBlocks) ─────────────────────────────────────────────────────

/** Python names an EduBlocks program in these lessons may call. */
export const EDUBLOCKS_ALLOWED_CALLS = new Set([
  'print',
  'input',
  'int',
  'str',
  'float',
  'len',
  'round',
  'range',
  'random.randint',
  'random.choice',
  'random.random',
  'random.shuffle',
  'random.randrange',
  'random.uniform',
  'turtle.forward',
  'turtle.backward',
  'turtle.left',
  'turtle.right',
  'turtle.circle',
  'turtle.goto',
  'turtle.setheading',
  'turtle.speed',
  'turtle.shape',
  'turtle.width',
  'turtle.color',
  'turtle.pencolor',
  'turtle.fillcolor',
  'turtle.begin_fill',
  'turtle.end_fill',
  'turtle.penup',
  'turtle.pendown',
  'screen.setup',
  'screen.bgcolor',
  'screen.colormode',
  'Turtle',
  'Screen',
]);

/** Methods on lists and text the Lists / Text groups provide. */
export const EDUBLOCKS_ALLOWED_METHODS = new Set([
  'append',
  'insert',
  'extend',
  'pop',
  'remove',
  'index',
  'reverse',
  'upper',
  'lower',
  'title',
  'replace',
  'strip',
  'count',
  'find',
]);

/** The only import blocks the lessons use: the random library and the Turtle. */
export const EDUBLOCKS_ALLOWED_IMPORT = /^(?:import (?:random|turtle)|from turtle import \*)$/;

/** Python the EduBlocks toolbox cannot build — kept out of the lessons. */
export const EDUBLOCKS_FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: 'f-string', re: /\bf["']/ },
  { name: 'lambda', re: /\blambda\b/ },
  { name: 'list comprehension', re: /\[[^\]]*\bfor\b[^\]]*\]/ },
  { name: 'class', re: /^\s*class\b/ },
  { name: 'with', re: /^\s*with\b/ },
  { name: 'try', re: /^\s*(try|except)\b/ },
  { name: 'tuple unpacking', re: /^\s*\w+\s*,\s*\w+\s*=/ },
];
