// FILE PATH: server/src/little-coders/testing/python-stub.ts
//
// Test support: turns an EduBlocks block program into a real Python program that can run headless
// and deterministically — input() answers from a list, and the Turtle is a stand-in that accepts
// every call. Used to PROVE answers and demos by running them (never to run student code).

import { toPythonSource } from '../blocks/block-dsl';

export function pythonProgram(lines: string[], inputs: string[] = []): string {
  return [
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
}

/** Python that only checks that every given program is syntactically valid. */
export function syntaxCheckProgram(sources: string[]): string {
  return [
    'import json, sys',
    `sources = json.loads(${JSON.stringify(JSON.stringify(sources))})`,
    'bad = []',
    'for i, src in enumerate(sources):',
    '    try:',
    '        compile(src, "block-program-%d" % i, "exec")',
    '    except SyntaxError as e:',
    '        bad.append("%d: %s (line %s)" % (i, e.msg, e.lineno))',
    'print("\\n".join(bad))',
    'sys.exit(1 if bad else 0)',
  ].join('\n');
}
