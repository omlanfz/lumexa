// FILE PATH: client/lib/codeLab/runtimes.ts
//
// Runs code for the Code Lab. Every browser language runs in a Web Worker that the main thread can end,
// so a learner's endless loop never freezes the lesson. Nothing here touches the lesson page's own
// JavaScript, cookies or storage.

import api from '@/lib/axios';
import { LAB_LIMITS, LANGUAGES, type LabLanguage, type RunResult } from './types';

// ── What this server can run ────────────────────────────────────────────────

export interface ServerLanguages {
  /** Languages the code-runner service can run right now, by lab language. */
  languages: Partial<Record<LabLanguage, { available: boolean; label: string }>>;
  enabled: boolean;
}

let serverLanguagesPromise: Promise<ServerLanguages> | null = null;

/** Asks the server once which compiled languages it can run (cached for the page's life). */
export function loadServerLanguages(): Promise<ServerLanguages> {
  serverLanguagesPromise ??= api
    .get<ServerLanguages>('/code-runner/languages')
    .then((r) => r.data)
    .catch(() => ({ languages: {}, enabled: false }));
  return serverLanguagesPromise;
}

export function forgetServerLanguages(): void {
  serverLanguagesPromise = null;
}

// ── Web Workers ─────────────────────────────────────────────────────────────

const timeoutResult = (started: number): RunResult => ({
  ok: false,
  stdout: '',
  stderr: `The program ran for more than ${LAB_LIMITS.timeoutMs / 1000} seconds and was stopped. Is there a loop that never ends?`,
  timeMs: Date.now() - started,
  limit: 'time',
});

function runOnce(url: string, payload: Record<string, unknown>, opts: { module?: boolean; onStatus?: (m: string) => void }): Promise<RunResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    let worker: Worker;
    try {
      worker = new Worker(url, opts.module ? { type: 'module' } : undefined);
    } catch {
      resolve({ ok: false, stdout: '', stderr: 'This browser cannot run the code here (Web Workers are not available).', timeMs: 0 });
      return;
    }
    const timer = setTimeout(() => {
      worker.terminate();
      resolve(timeoutResult(started));
    }, LAB_LIMITS.timeoutMs);
    worker.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'status') return void opts.onStatus?.(e.data.message);
      clearTimeout(timer);
      worker.terminate();
      resolve(e.data as RunResult);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, stdout: '', stderr: e.message || 'The code could not be started.', timeMs: Date.now() - started });
    };
    worker.postMessage(payload);
  });
}

export function runJavaScript(code: string, stdin = ''): Promise<RunResult> {
  return runOnce('/code-lab/js-worker.js', { code, stdin }, {});
}

export function runSql(setup: string, code: string): Promise<RunResult> {
  return runOnce('/code-lab/sql-worker.js', { setup, code }, {});
}

// Python keeps its runtime (a few megabytes to load) between runs: one long-lived worker, replaced after a timeout.
let pythonWorker: Worker | null = null;
let pythonJob = 0;

export function runPython(code: string, stdin = '', onStatus?: (m: string) => void): Promise<RunResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    const id = ++pythonJob;
    try {
      pythonWorker ??= new Worker('/code-lab/python-worker.mjs', { type: 'module' });
    } catch {
      resolve({ ok: false, stdout: '', stderr: 'This browser cannot run Python here (module Web Workers are not available).', timeMs: 0 });
      return;
    }
    const worker = pythonWorker;
    // The first run also downloads and starts Python, so it gets a longer limit.
    const limit = LAB_LIMITS.timeoutMs + (pythonWarm ? 0 : 40_000);
    const done = (r: RunResult) => {
      clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      resolve(r);
    };
    const timer = setTimeout(() => {
      worker.terminate();
      if (pythonWorker === worker) pythonWorker = null;
      pythonWarm = false;
      done(timeoutResult(started));
    }, limit);
    const onMessage = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      if (e.data.type === 'status') return void onStatus?.(e.data.message);
      pythonWarm = true;
      done(e.data as RunResult);
    };
    const onError = (e: ErrorEvent) => {
      worker.terminate();
      if (pythonWorker === worker) pythonWorker = null;
      done({ ok: false, stdout: '', stderr: e.message || 'Python could not be started.', timeMs: Date.now() - started });
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ id, code, stdin });
  });
}
let pythonWarm = false;

// ── Compiled languages: the Lumexa code-runner service ──────────────────────

export async function runRemote(language: LabLanguage, code: string, stdin = ''): Promise<RunResult> {
  const started = Date.now();
  try {
    const res = await api.post<RunResult>('/code-runner/run', { language, code, stdin }, { timeout: LAB_LIMITS.timeoutMs + 12_000 });
    return { ...res.data, timeMs: res.data.timeMs ?? Date.now() - started };
  } catch (err) {
    const e = err as { response?: { status?: number; data?: { message?: string | string[] } } };
    const msg = e.response?.data?.message;
    const text = Array.isArray(msg) ? msg.join(' ') : msg;
    if (e.response?.status === 401) return { ok: false, stdout: '', stderr: 'Please sign in to run C, C++ and Java code.', timeMs: Date.now() - started };
    if (e.response?.status === 429) return { ok: false, stdout: '', stderr: 'You are running code very quickly. Wait a few seconds and try again.', timeMs: Date.now() - started };
    return { ok: false, stdout: '', stderr: text ?? 'The code runner did not answer. Try again in a moment.', timeMs: Date.now() - started };
  }
}

/** Runs `code` the right way for its language. */
export async function runCode(opts: {
  language: LabLanguage;
  code: string;
  stdin?: string;
  setup?: string;
  onStatus?: (m: string) => void;
}): Promise<RunResult> {
  const { language, code, stdin = '', setup = '' } = opts;
  if (code.length > LAB_LIMITS.maxCodeChars) return { ok: false, stdout: '', stderr: 'That program is too long to run here.', timeMs: 0 };
  switch (language) {
    case 'javascript':
      return runJavaScript(code, stdin);
    case 'python':
      return runPython(code, stdin, opts.onStatus);
    case 'sql':
      return runSql(setup, code);
    case 'c':
    case 'cpp':
    case 'java':
      return runRemote(language, code, stdin);
    default:
      return { ok: false, stdout: '', stderr: `${LANGUAGES[language].label} is not run here.`, timeMs: 0 };
  }
}

/** Compares a program's output with the expected output: trailing spaces and blank edges do not count. */
export function sameOutput(actual: string, expected: string): boolean {
  const norm = (s: string) => s.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\s+$/g, '')).join('\n').replace(/^\n+|\n+$/g, '');
  return norm(actual) === norm(expected);
}
