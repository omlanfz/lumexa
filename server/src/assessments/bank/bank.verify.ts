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
//   * A snippet that needs third-party Python modules (CodeCheck.requires, or
//     `lupa` for Lua) is SKIPPED, not failed, when they are not installed — set
//     BANK_VERIFY_PYTHON to an interpreter that has them to run everything:
//       BANK_VERIFY_PYTHON=/path/to/venv/bin/python npm run verify:banks

import { spawnSync } from 'child_process';
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

export function runPython(code: string): RunOutput {
  const r = spawnSync(pythonBin(), ['-I', '-c', code], {
    encoding: 'utf8',
    timeout: 15_000,
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

export function runCheck(check: CodeCheck): RunOutput {
  if (check.language === 'python') return runPython(check.code);
  if (check.language === 'lua') return runLua(check.code);
  return runJavaScript(check.code);
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
