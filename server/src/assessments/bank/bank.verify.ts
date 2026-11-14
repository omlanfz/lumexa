// FILE PATH: server/src/assessments/bank/bank.verify.ts
//
// Executable proof for the code-reading questions in the banks: every
// "what does this code print?" question carries the snippet it is about
// (CodeCheck), and this module RUNS it and compares the real output with the
// answer key. It only ever executes code authored in this repository (never
// student code).
//
//   * Python   → a subprocess (`python3 -I -c …`, 15 s timeout)
//   * JavaScript → Node's `vm` with a captured console
//   * Lua      → the `lupa` Python module (Lua 5.4) with `print` captured
//   * C / C++  → compiled with the system gcc / g++ and run (5 s timeout)
//   * Java     → compiled with javac and run (`public class Main`)
//   * SQL      → SQLite through Python's sqlite3 module (last result set printed)
//   * A snippet that needs third-party Python modules (CodeCheck.requires, or
//     `lupa` for Lua) is SKIPPED, not failed, when they are not installed — set
//     BANK_VERIFY_PYTHON to an interpreter that has them to run everything:
//       BANK_VERIFY_PYTHON=/path/to/venv/bin/python npm run verify:banks

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as vm from 'vm';
import { BankMcq, BankTrueFalse, CodeCheck, TestBank } from './bank.types';

export interface CheckResult {
  bankId: string;
  key: string;
  status: 'ok' | 'skipped' | 'failed';
  detail?: string;
}

export const pythonBin = () => process.env.BANK_VERIFY_PYTHON || 'python3';

const moduleCache = new Map<string, boolean>();

export function pythonModuleAvailable(mod: string): boolean {
  const cacheKey = `${pythonBin()}::${mod}`;
  const hit = moduleCache.get(cacheKey);
  if (hit !== undefined) return hit;
  const r = spawnSync(pythonBin(), ['-I', '-c', `import ${mod}`], {
    encoding: 'utf8',
    timeout: 20_000,
  });
  const ok = r.status === 0;
  moduleCache.set(cacheKey, ok);
  return ok;
}

export function pythonAvailable(): boolean {
  const r = spawnSync(pythonBin(), ['-I', '-c', 'print(1)'], {
    encoding: 'utf8',
    timeout: 10_000,
  });
  return r.status === 0;
}

export interface RunOutput {
  ok: boolean;
  stdout: string;
  stderr: string;
}

export function runPython(code: string, stdin = ''): RunOutput {
  const r = spawnSync(pythonBin(), ['-I', '-c', code], {
    encoding: 'utf8',
    timeout: 15_000,
    input: stdin,
    env: {
      PATH: process.env.PATH ?? '',
      MPLBACKEND: 'Agg',
      PYTHONHASHSEED: '0',
      PYTHONIOENCODING: 'utf-8',
      // pygame prints a banner on import and opens a window/audio device unless told not to.
      PYGAME_HIDE_SUPPORT_PROMPT: '1',
      SDL_VIDEODRIVER: 'dummy',
      SDL_AUDIODRIVER: 'dummy',
    },
  });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? '',
    stderr: (r.stderr ?? '') + (r.error ? String(r.error) : ''),
  };
}

export function runJavaScript(code: string): RunOutput {
  const lines: string[] = [];
  const sandbox = {
    console: { log: (...args: unknown[]) => lines.push(util.format(...args)) },
  };
  try {
    vm.runInNewContext(code, sandbox, { timeout: 5_000 });
    return { ok: true, stdout: lines.join('\n'), stderr: '' };
  } catch (err) {
    return {
      ok: false,
      stdout: lines.join('\n'),
      stderr: String((err as Error).message ?? err),
    };
  }
}

/**
 * Runs lesson JavaScript in a separate Node process, so that timers, promises and async code behave as they do in a
 * browser or in Node (the VM sandbox of runJavaScript has no timers and returns before any promise settles).
 * It only ever runs code authored in this repository.
 */
export function runNode(code: string): RunOutput {
  const r = spawnSync(process.execPath, ['-'], {
    encoding: 'utf8',
    timeout: 10_000,
    input: code,
    env: { PATH: process.env.PATH ?? '' },
  });
  return { ok: r.status === 0, stdout: r.stdout ?? '', stderr: (r.stderr ?? '') + (r.error ? String(r.error) : '') };
}

const normalize = (s: string) =>
  s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .join('\n')
    .trim();

// Runs a Lua snippet on the `lupa` binding with `print` captured. The snippet
// arrives as JSON on stdin so no quoting of the Lua source is ever needed.
// print() joins its arguments with a space, like Roblox's Output window (plain
// Lua uses a tab) — the Lua questions are about Roblox Luau.
const LUA_RUNNER = String.raw`
import json, sys
from lupa import LuaRuntime
code = json.loads(sys.stdin.read())
lua = LuaRuntime(unpack_returned_tuples=True)
run = lua.eval(r'''function(code)
  local out = {}
  local env = setmetatable({}, { __index = _G })
  env.print = function(...)
    local parts = {}
    for i = 1, select('#', ...) do parts[i] = tostring((select(i, ...))) end
    out[#out + 1] = table.concat(parts, ' ')
  end
  local fn, err = load(code, 'snippet', 't', env)
  if not fn then error(err) end
  fn()
  return table.concat(out, '\n')
end''')
sys.stdout.write(run(code))
`;

export function runLua(code: string): RunOutput {
  const r = spawnSync(pythonBin(), ['-I', '-c', LUA_RUNNER], {
    encoding: 'utf8',
    timeout: 15_000,
    input: JSON.stringify(code),
    env: { PATH: process.env.PATH ?? '', PYTHONIOENCODING: 'utf-8' },
  });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? '',
    stderr: (r.stderr ?? '') + (r.error ? String(r.error) : ''),
  };
}

// ─── Compiled languages and SQL ─────────────────────────────────────────────

const toolCache = new Map<string, boolean>();

/** Is a command-line tool installed? (`gcc`, `g++`, `javac`, `java`) */
export function toolAvailable(tool: string): boolean {
  const hit = toolCache.get(tool);
  if (hit !== undefined) return hit;
  const r = spawnSync(tool, [tool === 'java' || tool === 'javac' ? '-version' : '--version'], {
    encoding: 'utf8',
    timeout: 10_000,
  });
  const ok = !r.error && r.status === 0;
  toolCache.set(tool, ok);
  return ok;
}

const RUN_ENV = { PATH: process.env.PATH ?? '', LANG: 'C.UTF-8' };

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumexa-verify-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function compileAndRun(
  compiler: string,
  args: string[],
  file: string,
  code: string,
  runner: (dir: string) => { cmd: string; args: string[] },
  stdin = '',
): RunOutput {
  return withTempDir((dir) => {
    fs.writeFileSync(path.join(dir, file), code);
    const build = spawnSync(compiler, [...args], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 60_000,
      env: RUN_ENV,
    });
    if (build.status !== 0) {
      return {
        ok: false,
        stdout: '',
        stderr: `compile error:\n${(build.stderr ?? '') + (build.error ? String(build.error) : '')}`,
      };
    }
    const { cmd, args: runArgs } = runner(dir);
    const run = spawnSync(cmd, runArgs, {
      cwd: dir,
      encoding: 'utf8',
      timeout: 10_000,
      env: RUN_ENV,
      input: stdin,
    });
    return {
      ok: run.status === 0,
      stdout: run.stdout ?? '',
      stderr: (run.stderr ?? '') + (run.error ? String(run.error) : ''),
    };
  });
}

export function runC(code: string, stdin = ''): RunOutput {
  return compileAndRun(
    'gcc',
    ['-std=c11', '-O0', '-o', 'prog', 'main.c', '-lm'],
    'main.c',
    code,
    (dir) => ({ cmd: path.join(dir, 'prog'), args: [] }),
    stdin,
  );
}

export function runCpp(code: string, stdin = ''): RunOutput {
  return compileAndRun(
    'g++',
    ['-std=c++17', '-O0', '-o', 'prog', 'main.cpp'],
    'main.cpp',
    code,
    (dir) => ({ cmd: path.join(dir, 'prog'), args: [] }),
    stdin,
  );
}

export function runJava(code: string, stdin = ''): RunOutput {
  return compileAndRun(
    'javac',
    ['Main.java'],
    'Main.java',
    code,
    () => ({ cmd: 'java', args: ['-cp', '.', 'Main'] }),
    stdin,
  );
}

// Runs a SQL script on an in-memory SQLite database and prints the rows of the last statement that
// returns rows (columns joined by "|", NULL as NULL). The script arrives on stdin. When the first line is
// a comment that contains the word "headers" (for example "-- query headers"), the column names are
// printed first. Statements are split at ";", so keep ";" out of strings and comments.
const SQL_RUNNER = String.raw`
import sqlite3, sys
script = sys.stdin.read()
first = script.lstrip().split(chr(10), 1)[0]
headers = first.startswith('--') and 'headers' in first
con = sqlite3.connect(':memory:', isolation_level=None)
cur = con.cursor()
rows, names = [], []
for stmt in [s.strip() for s in script.split(';')]:
    if not stmt:
        continue
    cur.execute(stmt)
    if cur.description is not None:
        rows = cur.fetchall()
        names = [d[0] for d in cur.description]
con.commit()
lines = ['|'.join('NULL' if v is None else str(v) for v in r) for r in rows]
if headers:
    lines.insert(0, '|'.join(names))
print(chr(10).join(lines))
`;

/** The kind of a lesson SQL block: "-- setup" (tables and data shared by the next blocks), "-- query" (runs on top of the latest setup) or "-- script" (complete on its own). */
export function sqlBlockKind(code: string): 'setup' | 'query' | 'script' | null {
  const m = /^\s*--\s*(setup|query|script)\b/.exec(code);
  return m ? (m[1] as 'setup' | 'query' | 'script') : null;
}

const withoutFirstComment = (code: string) => code.replace(/^\s*--[^\n]*\n?/, '');

/** The script that really runs for a lesson "-- query" block: its marker line first, then the shared setup, then the query. */
export function sqlWithSetup(setup: string | null, code: string): string {
  const first = /^\s*(--[^\n]*)/.exec(code)?.[1] ?? '';
  const prefix = setup ? withoutFirstComment(setup).replace(/;?\s*$/, ';') + '\n' : '';
  return `${first}\n${prefix}${withoutFirstComment(code)}`;
}

/** The text of a lesson SQL block without its marker line, as a learner would type it. */
export function sqlWithoutMarker(code: string): string {
  return sqlBlockKind(code) ? withoutFirstComment(code) : code;
}

export function runSql(code: string): RunOutput {
  const r = spawnSync(pythonBin(), ['-I', '-c', SQL_RUNNER], {
    encoding: 'utf8',
    timeout: 15_000,
    input: code,
    env: { PATH: process.env.PATH ?? '', PYTHONIOENCODING: 'utf-8' },
  });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? '',
    stderr: (r.stderr ?? '') + (r.error ? String(r.error) : ''),
  };
}

// Runs a program for the toy CPU of the lessons (two 8-bit registers A and B, flags Z and C, 16 bytes of data
// memory; the same machine as client/lib/lesson/technical/asm.ts) and prints the final state:
//   A=12 B=7 Z=0 C=0 steps=9
//   mem: [0]=19 [3]=4          (only the non-zero cells)
// A first-line comment "; memory: 5, 3, 9" sets the starting contents of the data memory.
const ASM_RUNNER = String.raw`
import re, sys
src = sys.stdin.read()
OPS = {"LOADI": 2, "LOAD": 2, "STORE": 2, "MOV": 2, "ADD": 2, "SUB": 2, "AND": 2, "OR": 2, "CMP": 2, "INC": 1, "DEC": 1, "JMP": 1, "JZ": 1, "JNZ": 1, "HALT": 0}
def number(t):
    t = t.strip().lower()
    if re.fullmatch(r"-?\d+", t): return int(t)
    if re.fullmatch(r"0x[0-9a-f]+", t): return int(t[2:], 16)
    if re.fullmatch(r"0b[01]+", t): return int(t[2:], 2)
    raise ValueError("bad number " + t)
mem = [0] * 16
m = re.search(r"^\s*;\s*memory\s*:\s*(.*)$", src, re.M)
if m:
    for i, t in enumerate(x for x in m.group(1).split(",") if x.strip()):
        mem[i] = number(t) & 255
instrs, labels = [], {}
for raw in src.split(chr(10)):
    text = raw.split(";")[0].strip()
    if not text: continue
    lab = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$", text)
    if lab:
        labels[lab.group(1)] = len(instrs)
        text = lab.group(2).strip()
        if not text: continue
    mm = re.match(r"^([A-Za-z]+)\s*(.*)$", text)
    op = mm.group(1).upper()
    operands = [x.strip() for x in mm.group(2).split(",")] if mm.group(2) else []
    assert op in OPS and len(operands) == OPS[op], "bad instruction: " + text
    instrs.append((op, operands))
reg = {"A": 0, "B": 0}
z = c = pc = steps = 0
def addr(o):
    ind = re.fullmatch(r"\[\s*([AaBb])\s*\]", o)
    n = reg[ind.group(1).upper()] if ind else number(o)
    if not (0 <= n < len(mem)): raise RuntimeError("memory address %d does not exist" % n)
    return n
halted = False
while not halted and steps < 500:
    if pc >= len(instrs): raise RuntimeError("the program counter ran past the last instruction")
    op, o = instrs[pc]
    pc += 1
    steps += 1
    if op == "LOADI": reg[o[0].upper()] = number(o[1]) & 255
    elif op == "LOAD": reg[o[0].upper()] = mem[addr(o[1])]
    elif op == "STORE": mem[addr(o[1])] = reg[o[0].upper()]
    elif op == "MOV": reg[o[0].upper()] = reg[o[1].upper()]
    elif op in ("ADD", "SUB", "AND", "OR"):
        x, y = reg[o[0].upper()], reg[o[1].upper()]
        raw = x + y if op == "ADD" else x - y if op == "SUB" else x & y if op == "AND" else x | y
        out = raw & 255
        reg[o[0].upper()] = out
        z = 1 if out == 0 else 0
        c = 1 if raw > 255 or raw < 0 else 0
    elif op in ("INC", "DEC"):
        v = (reg[o[0].upper()] + (1 if op == "INC" else -1)) & 255
        reg[o[0].upper()] = v
        z = 1 if v == 0 else 0
    elif op == "CMP":
        x, y = reg[o[0].upper()], reg[o[1].upper()]
        z = 1 if x == y else 0
        c = 1 if x < y else 0
    elif op in ("JMP", "JZ", "JNZ"):
        if op == "JMP" or (op == "JZ" and z == 1) or (op == "JNZ" and z == 0): pc = labels[o[0]]
    elif op == "HALT": halted = True
if not halted: raise RuntimeError("the program did not halt within 500 steps")
print("A=%d B=%d Z=%d C=%d steps=%d" % (reg["A"], reg["B"], z, c, steps))
cells = " ".join("[%d]=%d" % (i, v) for i, v in enumerate(mem) if v)
if cells: print("mem: " + cells)
`;

export function runAsm(code: string): RunOutput {
  const r = spawnSync(pythonBin(), ['-I', '-c', ASM_RUNNER], {
    encoding: 'utf8',
    timeout: 15_000,
    input: code,
    env: { PATH: process.env.PATH ?? '', PYTHONIOENCODING: 'utf-8' },
  });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? '',
    stderr: (r.stderr ?? '') + (r.error ? String(r.error) : ''),
  };
}

export function runCheck(check: CodeCheck): RunOutput {
  switch (check.language) {
    case 'python':
      return runPython(check.code);
    case 'lua':
      return runLua(check.code);
    case 'c':
      return runC(check.code);
    case 'cpp':
      return runCpp(check.code);
    case 'java':
      return runJava(check.code);
    case 'sql':
      return runSql(check.code);
    default:
      return runJavaScript(check.code);
  }
}

function checkQuestion(
  bankId: string,
  q: BankMcq | BankTrueFalse,
): CheckResult | null {
  const check = q.codeCheck;
  if (!check) return null;

  if (check.language === 'python' || check.language === 'lua') {
    if (!pythonAvailable())
      return {
        bankId,
        key: q.key,
        status: 'skipped',
        detail: 'python3 is not available',
      };
    // A Lua snippet is executed by the `lupa` module inside that interpreter.
    const needed = [
      ...(check.requires ?? []),
      ...(check.language === 'lua' ? ['lupa'] : []),
    ];
    const missing = needed.filter((m) => !pythonModuleAvailable(m));
    if (missing.length)
      return {
        bankId,
        key: q.key,
        status: 'skipped',
        detail: `needs Python module(s): ${missing.join(', ')}`,
      };
  } else if (check.language === 'sql') {
    if (!pythonAvailable())
      return { bankId, key: q.key, status: 'skipped', detail: 'python3 is not available' };
  } else if (check.language === 'c' || check.language === 'cpp' || check.language === 'java') {
    const tools = check.language === 'c' ? ['gcc'] : check.language === 'cpp' ? ['g++'] : ['javac', 'java'];
    const missing = tools.filter((t) => !toolAvailable(t));
    if (missing.length)
      return { bankId, key: q.key, status: 'skipped', detail: `needs ${missing.join(', ')} to be installed` };
  } else if (check.requires?.length) {
    return {
      bankId,
      key: q.key,
      status: 'failed',
      detail: '`requires` only applies to Python and Lua snippets',
    };
  }

  const run = runCheck(check);
  if (!run.ok)
    return {
      bankId,
      key: q.key,
      status: 'failed',
      detail: `the snippet raised an error:\n${run.stderr.trim().slice(-400)}`,
    };
  const actual = normalize(run.stdout);

  if (q.kind === 'MCQ') {
    const expected = normalize(q.correct);
    if (actual !== expected) {
      return {
        bankId,
        key: q.key,
        status: 'failed',
        detail: `answer key says ${JSON.stringify(expected)} but the code prints ${JSON.stringify(actual)}`,
      };
    }
    // None of the wrong options may equal the real output either.
    const dup = q.wrong.find((w) => normalize(w) === actual);
    if (dup !== undefined)
      return {
        bankId,
        key: q.key,
        status: 'failed',
        detail: `a wrong option also equals the real output: ${JSON.stringify(dup)}`,
      };
    return { bankId, key: q.key, status: 'ok' };
  }

  if (check.claim === undefined)
    return {
      bankId,
      key: q.key,
      status: 'failed',
      detail: 'a True/False codeCheck needs a `claim`',
    };
  const claimTrue = actual === normalize(check.claim);
  if (claimTrue !== q.answer) {
    return {
      bankId,
      key: q.key,
      status: 'failed',
      detail: `the statement is ${q.answer ? 'marked true' : 'marked false'}, but the code prints ${JSON.stringify(actual)} vs claim ${JSON.stringify(normalize(check.claim))}`,
    };
  }
  return { bankId, key: q.key, status: 'ok' };
}

export function verifyBankCode(bank: TestBank): CheckResult[] {
  const out: CheckResult[] = [];
  for (const q of [...bank.mcq, ...bank.trueFalse]) {
    const r = checkQuestion(bank.id, q);
    if (r) out.push(r);
  }
  return out;
}
