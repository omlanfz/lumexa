// FILE PATH: client/public/code-lab/js-worker.js
//
// Runs a learner's JavaScript for the Code Lab, inside a Web Worker: no page, no DOM, no cookies and no
// storage of the lesson page are reachable from here. The main thread ends the worker after a time limit
// (so an endless loop cannot freeze the lesson). Network access is switched off for the code, and
// console output is captured. Lines of the "input" box are available through input() / prompt().

'use strict';
const send = self.postMessage.bind(self);

// Take the network and storage away before any learner code runs.
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel', 'SharedWorker', 'Worker', 'navigator']) {
  try {
    Object.defineProperty(self, name, { value: undefined, configurable: true, writable: true });
  } catch (_) {
    try { self[name] = undefined; } catch (_) { /* not removable: harmless */ }
  }
}

const MAX_OUTPUT = 200000;

self.onmessage = (event) => {
  const { code, stdin } = event.data || {};
  const out = [];
  const errs = [];
  const lines = String(stdin || '').split('\n');
  let next = 0;
  let size = 0;

  const show = (v) => {
    if (typeof v === 'string') return v;
    if (v === undefined) return 'undefined';
    if (typeof v === 'function') return String(v);
    try {
      return typeof v === 'object' && v !== null ? JSON.stringify(v, (k, x) => (typeof x === 'bigint' ? String(x) : x)) : String(v);
    } catch (_) {
      return String(v);
    }
  };
  const push = (list, parts) => {
    const text = parts.map(show).join(' ');
    size += text.length + 1;
    if (size > MAX_OUTPUT) throw new Error('Too much output (more than 200,000 characters). Is something printing in an endless loop?');
    list.push(text);
  };
  const log = (...a) => push(out, a);
  const cons = { log, info: log, debug: log, table: log, warn: log, error: (...a) => push(errs, a) };
  const input = () => (next < lines.length ? lines[next++] : '');

  const started = Date.now();
  let ok = true;
  try {
    // Non-strict, like the browser console, so beginner code behaves as the lessons show.
    const fn = new Function('console', 'input', 'prompt', 'print', code);
    fn(cons, input, input, log);
  } catch (err) {
    ok = false;
    errs.push(err && err.name ? err.name + ': ' + err.message : String(err));
  }
  send({ ok, stdout: out.join('\n'), stderr: errs.join('\n'), timeMs: Date.now() - started });
};
