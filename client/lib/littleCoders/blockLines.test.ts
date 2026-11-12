import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBlockTree, blockColor, categoryLabel, isHat, parseLine, plainBlockText, segmentsOf, toPythonSource } from './blockLines';

describe('parseLine', () => {
  it('reads indent, category and text', () => {
    assert.deepEqual(parseLine('events| when green flag clicked'), { depth: 0, category: 'events', text: 'when green flag clicked' });
    assert.deepEqual(parseLine('    motion| move (10) steps'), { depth: 2, category: 'motion', text: 'move (10) steps' });
  });
  it('rejects odd indents and text without a category', () => {
    assert.equal(parseLine('   motion| move (10) steps'), null);
    assert.equal(parseLine('move (10) steps'), null);
    assert.equal(parseLine('motion| '), null);
  });
});

describe('segmentsOf — slots', () => {
  it('splits text from slots and nests them', () => {
    const s = segmentsOf('if {(score) > (10)} then');
    assert.equal(s.length, 3);
    assert.deepEqual(s[0], { kind: 'text', text: 'if ' });
    assert.equal(s[1].kind, 'bool');
    assert.equal(s[2].kind, 'text');
    const inner = (s[1] as { parts: ReturnType<typeof segmentsOf> }).parts;
    assert.equal(inner.filter((p) => p.kind === 'round').length, 2);
  });
  it('plain values stay leaves; expressions get their own parts', () => {
    const [, round] = segmentsOf('move (10) steps');
    assert.equal(round.kind, 'round');
    assert.equal((round as { parts: unknown }).parts, null);
    const [, expr] = segmentsOf('change y by ((speed) * (-1))');
    assert.ok((expr as { parts: unknown[] | null }).parts);
  });
  it('text slots are dropdowns / strings', () => {
    const s = segmentsOf('say [Hello!] for (2) seconds');
    assert.equal(s[1].kind, 'string');
    assert.equal((s[1] as { inner: string }).inner, 'Hello!');
  });
  it('unbalanced brackets stay plain text (never throw)', () => {
    assert.doesNotThrow(() => segmentsOf('move (10 steps'));
    assert.deepEqual(segmentsOf('move (10 steps'), [{ kind: 'text', text: 'move (10 steps' }]);
  });
});

describe('buildBlockTree', () => {
  it('nests by indent and numbers lines from 1', () => {
    const tree = buildBlockTree(['events| when green flag clicked', 'control| repeat (10)', '  motion| change y by (20)', 'looks| say [Hi!] for (2) seconds']);
    assert.equal(tree.length, 4 - 1);
    assert.equal(tree[1].children.length, 1);
    assert.equal(tree[1].children[0].line, 3);
    assert.equal(tree[2].line, 4);
  });
  it('attaches "else" to the "if" above it', () => {
    const tree = buildBlockTree(['control| if {(prize) = (1)} then', '  looks| say [A] for (2) seconds', 'control| else', '  looks| say [B] for (2) seconds']);
    assert.equal(tree.length, 1);
    assert.equal(tree[0].children.length, 1);
    assert.equal(tree[0].elseLine, 3);
    assert.equal(tree[0].elseChildren?.length, 1);
  });
  it('Python else: closes the if body and takes its own body', () => {
    const tree = buildBlockTree(['logic| if oxygen > 70:', '  statements| print( "Safe" )', 'logic| else:', '  statements| print( "Danger" )']);
    assert.equal(tree.length, 1);
    assert.equal(tree[0].children[0].text, 'print( "Safe" )');
    assert.equal(tree[0].elseChildren?.[0].text, 'print( "Danger" )');
  });
  it('skips lines that do not parse', () => {
    assert.equal(buildBlockTree(['nonsense', 'motion| move (10) steps']).length, 1);
  });
});

describe('helpers', () => {
  it('knows hats', () => {
    assert.equal(isHat('events', 'when green flag clicked'), true);
    assert.equal(isHat('control', 'when I start as a clone'), true);
    assert.equal(isHat('motion', 'move (10) steps'), false);
    assert.equal(isHat('events', 'broadcast [dance]'), false);
  });
  it('colours and labels every palette', () => {
    assert.equal(blockColor('scratch', 'motion').fill, '#4C97FF');
    assert.ok(blockColor('edublocks', 'loops').fill);
    assert.equal(blockColor('scratch', 'unknown').fill, '#7C8DA6');
    assert.equal(categoryLabel('tm2scratch'), 'TM2Scratch');
  });
  it('makes plain text and Python source', () => {
    assert.equal(plainBlockText('go to x: (0) y: (-120)'), 'go to x: 0 y: -120');
    assert.equal(toPythonSource(['logic| if a > 1:', '  statements| print( "x" )']), 'if a > 1:\n    print( "x" )');
  });
});
