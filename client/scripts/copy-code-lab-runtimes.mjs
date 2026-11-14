// Copies the Code Lab's in-browser runtimes out of node_modules into public/runtimes, so lessons load
// them from the app's own origin (no CDN, works behind school networks, cached for a year):
//
//   public/runtimes/pyodide/   Python (CPython compiled to WebAssembly): the loader, the runtime and the
//                              standard library. The packages that need downloading (NumPy, pandas…) are
//                              deliberately NOT included: the lessons use the standard library only.
//   public/runtimes/sqljs/     SQLite compiled to WebAssembly (sql.js).
//
// Run before `next dev` and `next build` (see the predev / prebuild scripts in package.json). The copy is
// not committed (.gitignore). The workers that use these files are committed in public/code-lab.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'public', 'runtimes');

const need = (pkg, files) => {
  const dir = join(root, 'node_modules', pkg);
  if (!existsSync(join(dir, 'package.json'))) {
    console.error(`copy-code-lab-runtimes: ${pkg} is not installed. Run \`npm install\` first.`);
    process.exit(1);
  }
  for (const f of files) {
    if (!existsSync(join(dir, f))) {
      console.error(`copy-code-lab-runtimes: ${pkg} does not contain ${f}. Its layout changed: update this script.`);
      process.exit(1);
    }
  }
  return { dir, version: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version };
};

rmSync(target, { recursive: true, force: true });

const PYODIDE_FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
const py = need('pyodide', PYODIDE_FILES);
mkdirSync(join(target, 'pyodide'), { recursive: true });
for (const f of PYODIDE_FILES) cpSync(join(py.dir, f), join(target, 'pyodide', f));

const SQL_FILES = ['dist/sql-wasm.js', 'dist/sql-wasm.wasm'];
const sql = need('sql.js', SQL_FILES);
mkdirSync(join(target, 'sqljs'), { recursive: true });
for (const f of SQL_FILES) cpSync(join(sql.dir, f), join(target, 'sqljs', f.replace('dist/', '')));

console.log(`copy-code-lab-runtimes: Pyodide ${py.version} and sql.js ${sql.version} copied to public/runtimes`);
