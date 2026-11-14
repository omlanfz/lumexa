// FILE PATH: client/lib/codeLab/types.ts
//
// The Code Lab: an editor that really runs code. JavaScript, Python, SQL and HTML run in the learner's own
// browser (Web Workers; Pyodide and SQLite compiled to WebAssembly, served from this site). C, C++ and Java
// need a compiler, which a browser does not have: they run on the Lumexa code-runner service when the server
// has one configured, and the Run button is simply not offered when it has none — the Lab never pretends.

export type LabLanguage = 'c' | 'cpp' | 'java' | 'python' | 'javascript' | 'sql' | 'html' | 'text';

export interface ResultTable {
  columns: string[];
  rows: (string | number | null | Uint8Array)[][];
  truncated?: boolean;
}

export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  timeMs: number;
  /** SQL: every result set. */
  tables?: ResultTable[];
  /** SQL: rows changed by the last statement. */
  changed?: number;
  /** The run was cut short (time or output limit). */
  limit?: 'time' | 'output';
}

/** Where a language runs. */
export type Engine = 'browser' | 'server' | 'none';

export interface LanguageInfo {
  label: string;
  /** Monaco-style file name shown above the editor. */
  file: string;
  engine: Engine;
  /** Highlight.js language name. */
  hljs: string;
}

export const LANGUAGES: Record<LabLanguage, LanguageInfo> = {
  c: { label: 'C', file: 'main.c', engine: 'server', hljs: 'c' },
  cpp: { label: 'C++', file: 'main.cpp', engine: 'server', hljs: 'cpp' },
  java: { label: 'Java', file: 'Main.java', engine: 'server', hljs: 'java' },
  python: { label: 'Python', file: 'main.py', engine: 'browser', hljs: 'python' },
  javascript: { label: 'JavaScript', file: 'main.js', engine: 'browser', hljs: 'javascript' },
  sql: { label: 'SQL (SQLite)', file: 'query.sql', engine: 'browser', hljs: 'sql' },
  html: { label: 'HTML, CSS and JavaScript', file: 'index.html', engine: 'browser', hljs: 'xml' },
  text: { label: 'Text', file: 'notes.txt', engine: 'none', hljs: 'plaintext' },
};

/** Free online compilers to suggest when this server cannot run a compiled language. */
export const ONLINE_COMPILERS: Partial<Record<LabLanguage, { name: string; url: string }>> = {
  c: { name: 'an online C compiler', url: 'https://www.onlinegdb.com/online_c_compiler' },
  cpp: { name: 'an online C++ compiler', url: 'https://www.onlinegdb.com/online_c++_compiler' },
  java: { name: 'an online Java compiler', url: 'https://www.onlinegdb.com/online_java_compiler' },
};

/** Same limits on both sides: what the browser sends and what the server accepts. */
export const LAB_LIMITS = { maxCodeChars: 20_000, maxStdinChars: 4_000, timeoutMs: 8_000 } as const;
