// FILE PATH: client/public/code-lab/sql-worker.js
//
// Runs a learner's SQL for the Code Lab on SQLite compiled to WebAssembly (sql.js, served from this site at
// /runtimes/sqljs). Every run starts from a fresh in-memory database built by the lab's "setup" statements,
// so nothing a learner does can break the practice data; the database never leaves the browser.

'use strict';
importScripts('/runtimes/sqljs/sql-wasm.js');

let sqlPromise = null;
const getSql = () => (sqlPromise ??= initSqlJs({ locateFile: (file) => '/runtimes/sqljs/' + file }));

self.onmessage = async (event) => {
  const { setup, code } = event.data || {};
  const started = Date.now();
  try {
    const SQL = await getSql();
    const db = new SQL.Database();
    try {
      if (setup) db.exec(setup);
      const sets = db.exec(code);
      const changed = db.getRowsModified();
      const tables = sets.map((s) => ({ columns: s.columns, rows: s.values.slice(0, 200), truncated: s.values.length > 200 }));
      self.postMessage({ ok: true, stdout: '', stderr: '', tables, changed, timeMs: Date.now() - started });
    } finally {
      db.close();
    }
  } catch (err) {
    self.postMessage({ ok: false, stdout: '', stderr: String((err && err.message) || err), tables: [], timeMs: Date.now() - started });
  }
};
