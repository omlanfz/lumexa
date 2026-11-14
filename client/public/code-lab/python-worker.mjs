// FILE PATH: client/public/code-lab/python-worker.mjs
//
// Runs a learner's Python for the Code Lab, inside a module Web Worker, with Pyodide (CPython compiled to
// WebAssembly) served from this site (/runtimes/pyodide, copied from the npm package at build time). It is
// the standard library only: no network, and nothing from the lesson page. The runtime is loaded on the
// first run and kept for the next ones; the main thread ends the worker after a time limit.

import { loadPyodide } from '/runtimes/pyodide/pyodide.mjs';

let pyodide = null;
let loading = null;

async function ready() {
  if (pyodide) return pyodide;
  loading ??= loadPyodide({ indexURL: '/runtimes/pyodide/' });
  pyodide = await loading;
  return pyodide;
}

self.onmessage = async (event) => {
  const { id, code, stdin } = event.data || {};
  const out = [];
  const errs = [];
  const started = Date.now();
  try {
    if (!pyodide) self.postMessage({ id, type: 'status', message: 'Loading Python (the first run takes a few seconds)…' });
    const py = await ready();
    const lines = String(stdin || '').split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    py.setStdout({ batched: (s) => out.push(s) });
    py.setStderr({ batched: (s) => errs.push(s) });
    py.setStdin({ stdin: () => (lines.length ? lines.shift() : undefined) });
    // A fresh namespace each run, so one run cannot leak names into the next.
    const globals = py.globals.get('dict')();
    try {
      await py.runPythonAsync(code, { globals });
      self.postMessage({ id, type: 'result', ok: true, stdout: out.join('\n'), stderr: errs.join('\n'), timeMs: Date.now() - started });
    } finally {
      globals.destroy();
    }
  } catch (err) {
    // A Python error: keep only the part a learner needs (the traceback's last lines).
    const text = String((err && err.message) || err);
    const tail = text.split('\n').filter((l) => l.trim() !== '');
    const shown = tail.slice(Math.max(0, tail.length - 8)).join('\n');
    self.postMessage({ id, type: 'result', ok: false, stdout: out.join('\n'), stderr: [errs.join('\n'), shown].filter(Boolean).join('\n'), timeMs: Date.now() - started });
  }
};
