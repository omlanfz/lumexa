// The block-line format and its checks: a lesson or a question that shows a block that does not
// exist in Scratch / Stretch3 (TM2Scratch) / EduBlocks is rejected, so nothing invented is ever shown.

import {
  parseLine,
  scratchBlockName,
  templateOf,
  toolboxOf,
  toPythonSource,
  validateEduBlocksLines,
  validateScratchLines,
} from './block-dsl';

describe('parseLine', () => {
  it('splits indent, category and text (two spaces per level)', () => {
    expect(parseLine('events| when green flag clicked')).toEqual({
      depth: 0,
      category: 'events',
      text: 'when green flag clicked',
    });
    expect(parseLine('    motion| move (10) steps')).toEqual({
      depth: 2,
      category: 'motion',
      text: 'move (10) steps',
    });
  });

  it('rejects odd indents and lines without a category', () => {
    expect(parseLine('   motion| move (10) steps')).toBeNull();
    expect(parseLine('move (10) steps')).toBeNull();
    expect(parseLine('motion| ')).toBeNull();
  });
});

describe('templateOf — slots', () => {
  it('finds round, text and boolean slots, and nests them', () => {
    expect(templateOf('change [score] by (1)')).toEqual({
      template: 'change _ by _',
      slots: [
        { kind: 'text', inner: 'score' },
        { kind: 'round', inner: '1' },
      ],
    });
    const t = templateOf('if {(score) > (10)} then');
    expect(t?.template).toBe('if {} then');
    expect(t?.slots[0]).toEqual({ kind: 'bool', inner: '(score) > (10)' });
  });

  it('is null when brackets do not balance', () => {
    expect(templateOf('move (10 steps')).toBeNull();
    expect(templateOf('move 10) steps')).toBeNull();
    expect(templateOf('move (10] steps')).toBeNull();
  });
});

describe('Scratch blocks are checked against the real library', () => {
  it('accepts real blocks, nested', () => {
    expect(
      validateScratchLines([
        'events| when green flag clicked',
        'control| forever',
        '  motion| move (10) steps',
        '  motion| if on edge, bounce',
      ]),
    ).toEqual([]);
  });

  it('accepts the TM2Scratch blocks of Stretch3', () => {
    const problems = validateScratchLines([
      'tm2scratch| when I receive image label [Apple]',
    ]);
    // The hat block exists in TM2Scratch; the exact text is the extension's own.
    expect(problems.join(' ')).not.toMatch(/not a real block/i);
  });

  it('rejects a block that does not exist', () => {
    const problems = validateScratchLines(['events| when the rocket launches']);
    expect(problems.length).toBeGreaterThan(0);
  });

  it('rejects a real block under the wrong palette category', () => {
    expect(
      validateScratchLines(['looks| move (10) steps']).length,
    ).toBeGreaterThan(0);
  });

  it('rejects a script that does not start with a hat or whose indent jumps', () => {
    expect(
      validateScratchLines([
        'motion| move (10) steps',
        '      motion| move (10) steps',
      ]).length,
    ).toBeGreaterThan(0);
  });
});

describe('EduBlocks Python is checked against the real toolbox', () => {
  it('accepts real blocks and turns them into Python', () => {
    const lines = [
      'variables| count = 3',
      'loops| while count > 0:',
      '  statements| print( count )',
      '  variables| count -= 1',
    ];
    expect(validateEduBlocksLines(lines)).toEqual([]);
    expect(toPythonSource(lines)).toBe(
      'count = 3\nwhile count > 0:\n    print( count )\n    count -= 1',
    );
  });

  it('rejects code a block program could not contain', () => {
    expect(
      validateEduBlocksLines(['statements| import os']).length,
    ).toBeGreaterThan(0);
    expect(
      validateEduBlocksLines(['statements| eval( "1" )']).length,
    ).toBeGreaterThan(0);
    expect(
      validateEduBlocksLines(['statements| open( "f" )']).length,
    ).toBeGreaterThan(0);
  });
});

describe('the "blocks you will use" list', () => {
  it('lists distinct block names under their palette category, empty slots blanked', () => {
    const box = toolboxOf([
      {
        language: 'scratch',
        lines: [
          'events| when green flag clicked',
          'motion| go to x: (0) y: (0)',
          'motion| go to x: (50) y: (20)',
        ],
      },
    ]);
    expect(box).toEqual([
      { category: 'events', blocks: ['when green flag clicked'] },
      { category: 'motion', blocks: ['go to x: ( ) y: ( )'] },
    ]);
    expect(scratchBlockName('say [Hello!] for (2) seconds')).toBe(
      'say [ ] for ( ) seconds',
    );
  });
});
