// The practice runner is checked against REAL Python: every Python demo of courses 4 and 5 is run by
// both, and what they print must match exactly (the programs that use random are checked by shape).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { toPythonSource } from './blockLines';
import { PyFloat, runPython, str } from './pythonRuntime';

const hasPython = spawnSync('python3', ['-I', '-c', 'print(1)']).status === 0;
const itPython = hasPython ? it : it.skip;

/** Real Python, with input() answered from a list and the Turtle stubbed (headless). */
function realPython(lines: string[], inputs: string[] = []): { ok: boolean; stdout: string; stderr: string } {
  const code = [
    'import sys, types',
    `_inputs = iter(${JSON.stringify(inputs)})`,
    'def input(prompt=""):',
    '    return next(_inputs)',
    'class _Any:',
    '    def __getattr__(self, name):',
    '        return lambda *a, **k: None',
    '_t = types.ModuleType("turtle")',
    '_t.Turtle = lambda: _Any()',
    '_t.Screen = lambda: _Any()',
    '_t.__all__ = ["Turtle", "Screen"]',
    'sys.modules["turtle"] = _t',
    toPythonSource(lines),
  ].join('\n');
  const r = spawnSync('python3', ['-I', '-c', code], { encoding: 'utf8', timeout: 15000 });
  return { ok: r.status === 0, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

// The demos of the lessons, exactly as authored.
const DEMOS: Record<string, { lines: string[]; inputs?: string[] }> = {
  '4.1': { lines: ['statements| print( "Mission Control online" )', 'statements| print( "Systems check..." )', 'statements| print( "3" )', 'statements| print( "2" )', 'statements| print( "1" )', 'statements| print( "Liftoff!" )'] },
  '4.4': { lines: ['variables| astronauts = 4', 'variables| days = 7', 'variables| oxygen_per_day = 3', 'variables| oxygen_needed = astronauts * days * oxygen_per_day', 'statements| print( "Oxygen tanks needed:", oxygen_needed )'] },
  '4.5': {
    inputs: ['Alex', 'Mars', '9'],
    lines: ['variables| name = input( "What is your name?" )', 'variables| planet = input( "Which planet are you from?" )', 'variables| age = int( input( "How old are you?" ) )', 'statements| print( "=== SPACE PASSPORT ===" )', 'statements| print( "Name:", name.upper() )', 'statements| print( "Home planet:", planet )', 'statements| print( "Next year you will be", age + 1 )'],
  },
  '4.6': {
    inputs: ['55'],
    lines: ['variables| oxygen = int( input( "Oxygen level (0-100)?" ) )', 'logic| if oxygen > 70:', '  statements| print( "Safe: plenty of oxygen." )', 'logic| elif oxygen > 30:', '  statements| print( "Warning: oxygen is getting low." )', 'logic| else:', '  statements| print( "DANGER: return to base now!" )'],
  },
  '4.8': {
    inputs: ['mars', '8'],
    lines: [
      'variables| score = 0',
      'variables| answer = input( "Which planet is the Red Planet?" )',
      'logic| if answer.lower() == "mars":',
      '  statements| print( "Correct!" )',
      '  variables| score += 1',
      'logic| else:',
      '  statements| print( "Not quite. It is Mars." )',
      'variables| answer = input( "How many legs does a spider have?" )',
      'logic| if answer == "8":',
      '  statements| print( "Correct!" )',
      '  variables| score += 1',
      'logic| else:',
      '  statements| print( "Not quite. It is 8." )',
      'statements| print( "Your score:", score, "out of 2" )',
    ],
  },
  '5.5': {
    inputs: ['moon', 'star', 'orbit'],
    lines: ['variables| secret = "orbit"', 'variables| guess = ""', 'loops| while guess != secret:', '  variables| guess = input( "Enter the password:" )', '  logic| if guess != secret:', '    statements| print( "Access denied. Try again." )', 'statements| print( "Access granted! Welcome aboard." )'],
  },
  '5.6': { lines: ['loops| for a in range( 1, 4 ):', '  loops| for b in range( 1, 4 ):', '    statements| print( a, "x", b, "=", a * b )'] },
};

describe('the practice runner prints exactly what real Python prints', () => {
  for (const [name, demo] of Object.entries(DEMOS)) {
    itPython(`lesson ${name}`, () => {
      const real = realPython(demo.lines, demo.inputs);
      assert.equal(real.ok, true, real.stderr);
      const mine = runPython(demo.lines, demo.inputs, { seed: 1 });
      assert.equal(mine.error, null);
      assert.equal(mine.output, real.stdout);
    });
  }

  itPython('lists, strings and functions (5.1 without the random pick, 5.3-style functions, 5.8-style visit)', () => {
    const lines = [
      'lists| planets = ["Mercury", "Venus", "Earth", "Mars"]',
      'statements| print( planets[0] )',
      'statements| print( "Planets:", len( planets ) )',
      'lists| planets.append( "Jupiter" )',
      'statements| print( "Planets now:", len( planets ) )',
      'statements| print( planets )',
      'functions| def visit( planet, times ):',
      '  loops| for i in range( times ):',
      '    statements| print( "Landing on", planet, i + 1 )',
      '  functions| return times * 2',
      'variables| total = visit( "Mars", 2 )',
      'statements| print( total )',
    ];
    const real = realPython(lines);
    assert.equal(real.ok, true, real.stderr);
    assert.equal(runPython(lines).output, real.stdout);
  });

  itPython('arithmetic: int and float, floor division, modulo, power, negatives', () => {
    const lines = [
      'statements| print( 7 / 2, 6 / 2, 7 // 2, -7 // 2, 7 % 3, -7 % 3, 2 ** 10, 2 ** -1 )',
      'statements| print( 0.1 + 0.2, 1.5 * 2, 10 - 2.5, 3 * 1.0 )',
      'statements| print( round( 2.5 ), round( 3.5 ), round( 3.14159, 2 ), int( 7.9 ), float( 3 ) )',
      'statements| print( "ab" * 3, "x" + "y", len( "hello" ), "Hello".upper(), "Hello".lower() )',
      'statements| print( 3 > 2, 3 == 3.0, "a" < "b", not True, 1 < 2 < 3 )',
      'statements| print( "a" in "cat", 5 in [1, 5], 9 not in [1, 5] )',
      'statements| print( ["a", "b"], [1, 2.5], "it\'s" )',
      'statements| print( 1e20, 1.5e-7, 100000000.0 )',
    ];
    const real = realPython(lines);
    assert.equal(real.ok, true, real.stderr);
    assert.equal(runPython(lines).output, real.stdout);
  });

  itPython('while, break, continue, and elif chains', () => {
    const lines = [
      'variables| n = 0',
      'loops| while True:',
      '  variables| n += 1',
      '  logic| if n == 2:',
      '    statements| continue',
      '  logic| elif n > 4:',
      '    statements| break',
      '  statements| print( "n is", n )',
      'statements| print( "done" )',
    ];
    const real = realPython(lines);
    assert.equal(real.ok, true, real.stderr);
    assert.equal(runPython(lines).output, real.stdout);
  });
});

describe('the demos that use random', () => {
  it('4.7 prints a roll and exactly one matching message', () => {
    const lines = [
      'imports| import random',
      'variables| roll = random.randint( 1, 6 )',
      'statements| print( "You rolled", roll )',
      'logic| if roll == 6:',
      '  statements| print( "Jackpot! A golden star!" )',
      'logic| elif roll > 3:',
      '  statements| print( "Nice! A shiny crystal." )',
      'logic| else:',
      '  statements| print( "A small space pebble." )',
    ];
    for (let seed = 1; seed <= 25; seed++) {
      const r = runPython(lines, [], { seed });
      assert.equal(r.error, null);
      const [first, second] = r.output.trim().split('\n');
      const roll = Number(first.replace('You rolled ', ''));
      assert.ok(roll >= 1 && roll <= 6);
      assert.equal(second, roll === 6 ? 'Jackpot! A golden star!' : roll > 3 ? 'Nice! A shiny crystal.' : 'A small space pebble.');
    }
  });

  it('random.choice picks from the list, and the same seed repeats', () => {
    const lines = ['imports| import random', 'lists| planets = ["Mercury", "Venus", "Earth", "Mars"]', 'variables| pick = random.choice( planets )', 'statements| print( pick )'];
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const out = runPython(lines, [], { seed }).output.trim();
      assert.ok(['Mercury', 'Venus', 'Earth', 'Mars'].includes(out));
      seen.add(out);
    }
    assert.ok(seen.size > 1);
    assert.equal(runPython(lines, [], { seed: 7 }).output, runPython(lines, [], { seed: 7 }).output);
  });
});

describe('errors read like Python — and a lesson that is MEANT to fail does', () => {
  it('NameError for a misspelt variable (lesson 5.7), with the line', () => {
    const r = runPython(['variables| fuel = 40', 'variables| needed = 50', 'logic| if fule < needed:', '  statements| print( "Add more fuel!" )']);
    assert.deepEqual(r.error, { type: 'NameError', message: "name 'fule' is not defined", line: 3 });
    assert.equal(r.output, '');
    assert.equal(r.console.at(-1)?.kind, 'error');
  });

  itPython('the same program fails the same way in real Python', () => {
    const lines = ['variables| fuel = 40', 'variables| needed = 50', 'logic| if fule < needed:', '  statements| print( "Add more fuel!" )'];
    const real = realPython(lines);
    assert.equal(real.ok, false);
    assert.match(real.stderr, /NameError: name 'fule' is not defined/);
  });

  it('TypeError, IndexError, ValueError, ZeroDivisionError', () => {
    assert.equal(runPython(['statements| print( "a" + 1 )']).error?.type, 'TypeError');
    assert.equal(runPython(['statements| print( "a" + 1 )']).error?.message, 'can only concatenate str (not "int") to str');
    assert.equal(runPython(['statements| print( 1 + "a" )']).error?.message, "unsupported operand type(s) for +: 'int' and 'str'");
    assert.equal(runPython(['lists| a = [1, 2]', 'statements| print( a[5] )']).error?.message, 'list index out of range');
    assert.equal(runPython(['statements| print( int( "abc" ) )']).error?.message, "invalid literal for int() with base 10: 'abc'");
    assert.equal(runPython(['statements| print( 1 / 0 )']).error?.type, 'ZeroDivisionError');
  });

  it('reading input with no answers left is an EOFError, not a hang', () => {
    assert.equal(runPython(['variables| a = input( "x" )']).error?.type, 'EOFError');
  });

  it('a loop that never ends is stopped', () => {
    const r = runPython(['variables| n = 1', 'loops| while n > 0:', '  statements| print( n )'], [], { maxSteps: 500 });
    assert.equal(r.error?.type, 'RuntimeError');
    assert.match(r.error!.message, /ran too long/);
  });

  it('a block it does not know stops with a clear message instead of guessing', () => {
    const r = runPython(['statements| print( open( "f" ) )']);
    assert.ok(r.error);
    assert.equal(r.error?.type, 'NameError');
  });
});

describe('the step-by-step trace', () => {
  it('records each statement with the variables after it, and how much had been printed', () => {
    const r = runPython(['variables| score = 0', 'variables| score += 1', 'statements| print( "Score:", score )']);
    assert.deepEqual(r.trace.map((t) => t.line), [1, 2, 3]);
    assert.deepEqual(r.trace[1].vars, [['score', '1']]);
    assert.deepEqual(r.trace.map((t) => t.consoleLength), [0, 0, 1]);
  });

  it('shows each loop pass and the loop variable', () => {
    const r = runPython(['loops| for i in range( 3 ):', '  statements| print( i )']);
    assert.deepEqual(r.trace.map((t) => t.line), [1, 2, 1, 2, 1, 2]);
    assert.deepEqual(r.trace[4].vars, [['i', '2']]);
  });

  it('records console entries for input prompts and answers', () => {
    const r = runPython(['variables| name = input( "Name?" )', 'statements| print( "Hi", name )'], ['Alex']);
    assert.deepEqual(r.console, [
      { kind: 'prompt', text: 'Name?' },
      { kind: 'answer', text: 'Alex' },
      { kind: 'out', text: 'Hi Alex' },
    ]);
  });
});

describe('the Turtle', () => {
  it('draws a square: four equal segments that close up', () => {
    const r = runPython(['imports| from turtle import *', 'turtle| turtle = Turtle()', 'loops| for i in range( 4 ):', '  turtle| turtle.forward( 100 )', '  turtle| turtle.right( 90 )']);
    assert.equal(r.error, null);
    const segs = r.turtle!.segments;
    assert.equal(segs.length, 4);
    const last = segs[3];
    assert.ok(Math.abs(last.x2) < 1e-9 && Math.abs(last.y2) < 1e-9);
    for (const s of segs) assert.ok(Math.abs(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) - 100) < 1e-9);
  });

  it('penup moves without drawing; colour and width are kept per segment', () => {
    const r = runPython(['imports| from turtle import *', 'turtle| turtle = Turtle()', 'turtle| turtle.pencolor( "red" )', 'turtle| turtle.width( 4 )', 'turtle| turtle.forward( 10 )', 'turtle| turtle.penup()', 'turtle| turtle.forward( 10 )', 'turtle| turtle.pendown()', 'turtle| turtle.forward( 10 )']);
    assert.equal(r.turtle!.segments.length, 2);
    assert.deepEqual([r.turtle!.segments[0].color, r.turtle!.segments[0].width], ['red', 4]);
    assert.ok(Math.abs(r.turtle!.segments[1].x1 - 20) < 1e-9);
  });

  it('a circle ends where it began, and a filled shape is recorded', () => {
    const r = runPython(['imports| from turtle import *', 'turtle| turtle = Turtle()', 'turtle| turtle.fillcolor( "orange" )', 'turtle| turtle.begin_fill()', 'turtle| turtle.circle( 30 )', 'turtle| turtle.end_fill()']);
    const segs = r.turtle!.segments;
    const end = segs[segs.length - 1];
    assert.ok(Math.hypot(end.x2, end.y2) < 1e-6);
    assert.equal(r.turtle!.fills.length, 1);
    assert.equal(r.turtle!.fills[0].color, 'orange');
  });

  it('a program with no drawing has no turtle output', () => {
    assert.equal(runPython(['statements| print( 1 )']).turtle, null);
  });
});

describe('str()', () => {
  it('formats like Python', () => {
    assert.equal(str(3), '3');
    assert.equal(str(new PyFloat(3)), '3.0');
    assert.equal(str(true), 'True');
    assert.equal(str(null), 'None');
    assert.equal(str(['a', 1, new PyFloat(2.5)]), "['a', 1, 2.5]");
  });
});
