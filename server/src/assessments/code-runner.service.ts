// FILE PATH: server/src/assessments/code-runner.service.ts
//
// Deterministic test-case execution for practical coding submissions —
// requirement #7B: "never let AI grading alone bypass deterministic
// code/test-case validation where executable tests are possible." Runs
// JavaScript in-process (Node's vm module) and Python via a subprocess,
// against the PracticalQuestion's stored testCases (input/expectedOutput
// pairs). Returns null (no deterministic result) for any other language —
// those questions are graded by AiGradingService + teacher/rubric review
// only, which is the correct fallback when execution genuinely isn't
// meaningful (HTML/CSS layout, Lua/Roblox, freeform career-readiness work).
//
// SECURITY NOTE (documented honestly rather than overclaiming): this runs
// student-submitted code with a wall-clock timeout and a best-effort
// dangerous-pattern denylist, but neither Node's `vm` module nor a bare
// `python3` subprocess is a real security sandbox — a sufficiently
// determined submission could still escape both. For a production
// deployment, run this behind a real isolation boundary (a locked-down
// container, gVisor/Firecracker, or a dedicated code-execution service like
// Judge0/Piston) instead of executing in the API process directly. That
// hardening is out of scope for this change; the timeout + denylist here
// are defense-in-depth, not a substitute for it.

import { Injectable, Logger } from '@nestjs/common';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';

export interface TestCase {
  name: string;
  input: unknown[];
  expectedOutput: unknown;
}
export interface CaseResult {
  name: string;
  passed: boolean;
  message: string;
}
export interface RunResult {
  passed: boolean;
  total: number;
  passedCount: number;
  cases: CaseResult[];
  error?: string;
}

const JS_DENYLIST = /\b(require|process|global|globalThis|import\s*\(|child_process|fs\.|eval\s*\()\b/;
const PY_DENYLIST = /\b(import\s+os|import\s+sys|import\s+subprocess|import\s+socket|__import__|eval\s*\(|exec\s*\(|open\s*\()/;

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function inferFunctionName(starterCode: string | null | undefined, language: string): string | null {
  if (!starterCode) return null;
  if (language === 'python') {
    const m = starterCode.match(/^def\s+(\w+)\s*\(/m);
    return m ? m[1] : null;
  }
  const m = starterCode.match(/function\s+(\w+)\s*\(/);
  return m ? m[1] : null;
}

@Injectable()
export class CodeRunnerService {
  private readonly logger = new Logger(CodeRunnerService.name);

  supportsExecution(language: string): boolean {
    return language === 'javascript' || language === 'python';
  }

  run(language: string, code: string, testCases: TestCase[], starterCode?: string | null): RunResult | null {
    if (!testCases || testCases.length === 0) return null;
    const functionName = inferFunctionName(starterCode, language);
    if (!functionName) return null;

    try {
      if (language === 'javascript') return this.runJavaScript(code, functionName, testCases);
      if (language === 'python') return this.runPython(code, functionName, testCases);
    } catch (err) {
      this.logger.warn(`Code execution failed: ${(err as Error).message}`);
      return { passed: false, total: testCases.length, passedCount: 0, cases: [], error: (err as Error).message };
    }
    return null;
  }

  private allFail(testCases: TestCase[], message: string): RunResult {
    return {
      passed: false,
      total: testCases.length,
      passedCount: 0,
      cases: testCases.map((tc) => ({ name: tc.name, passed: false, message })),
    };
  }

  private runJavaScript(code: string, functionName: string, testCases: TestCase[]): RunResult {
    if (JS_DENYLIST.test(code)) {
      return this.allFail(testCases, 'Submission uses a disallowed API (require/process/eval/fs). Only pure functions are graded.');
    }
    const sandbox: Record<string, unknown> = {};
    const context = vm.createContext(sandbox);
    try {
      vm.runInContext(code, context, { timeout: 2000 });
    } catch (err) {
      return this.allFail(testCases, `Code failed to run: ${(err as Error).message}`);
    }
    const fn = sandbox[functionName];
    if (typeof fn !== 'function') {
      return this.allFail(testCases, `Function \`${functionName}\` was not found. Check the required function name.`);
    }
    const cases: CaseResult[] = testCases.map((tc) => {
      try {
        const result = (fn as (...args: unknown[]) => unknown)(...tc.input);
        const passed = deepEqual(result, tc.expectedOutput);
        return {
          name: tc.name,
          passed,
          message: passed ? 'Passed' : `Expected ${JSON.stringify(tc.expectedOutput)}, got ${JSON.stringify(result)}`,
        };
      } catch (err) {
        return { name: tc.name, passed: false, message: `Threw an error: ${(err as Error).message}` };
      }
    });
    const passedCount = cases.filter((c) => c.passed).length;
    return { passed: passedCount === cases.length, total: cases.length, passedCount, cases };
  }

  private runPython(code: string, functionName: string, testCases: TestCase[]): RunResult {
    if (PY_DENYLIST.test(code)) {
      return this.allFail(testCases, 'Submission uses a disallowed module (os/sys/subprocess/socket/eval/open). Only pure functions are graded.');
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumexa-py-'));
    try {
      const codeFile = path.join(dir, 'submission.py');
      const dataFile = path.join(dir, 'cases.json');
      const harnessFile = path.join(dir, 'harness.py');
      fs.writeFileSync(codeFile, code);
      fs.writeFileSync(dataFile, JSON.stringify(testCases));
      fs.writeFileSync(
        harnessFile,
        [
          'import json, importlib.util',
          `spec = importlib.util.spec_from_file_location("submission", ${JSON.stringify(codeFile)})`,
          'mod = importlib.util.module_from_spec(spec)',
          'try:',
          '    spec.loader.exec_module(mod)',
          'except Exception as e:',
          '    print(json.dumps({"__load_error__": str(e)}))',
          '    raise SystemExit(0)',
          `fn = getattr(mod, "${functionName}", None)`,
          `cases = json.load(open(${JSON.stringify(dataFile)}))`,
          'results = []',
          'if fn is None:',
          '    for tc in cases:',
          '        results.append({"name": tc["name"], "passed": False, "error": "function not found"})',
          'else:',
          '    for tc in cases:',
          '        try:',
          '            actual = fn(*tc["input"])',
          '            results.append({"name": tc["name"], "passed": actual == tc["expectedOutput"], "actual": actual})',
          '        except Exception as e:',
          '            results.append({"name": tc["name"], "passed": False, "error": str(e)})',
          'print(json.dumps(results))',
        ].join('\n'),
      );

      const proc = spawnSync('python3', [harnessFile], { timeout: 3000, encoding: 'utf8' });
      if (proc.error || proc.status !== 0) {
        return this.allFail(testCases, `Execution error: ${proc.stderr || proc.error?.message || 'unknown error'}`);
      }
      const parsed = JSON.parse(proc.stdout.trim().split('\n').pop() || '[]');
      if (parsed.__load_error__) {
        return this.allFail(testCases, `Code failed to load: ${parsed.__load_error__}`);
      }
      const cases: CaseResult[] = parsed.map((r: { name: string; passed: boolean; actual?: unknown; error?: string }) => ({
        name: r.name,
        passed: !!r.passed,
        message: r.passed ? 'Passed' : r.error ? `Threw an error: ${r.error}` : `Got unexpected result: ${JSON.stringify(r.actual)}`,
      }));
      const passedCount = cases.filter((c) => c.passed).length;
      return { passed: passedCount === cases.length, total: cases.length, passedCount, cases };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}
