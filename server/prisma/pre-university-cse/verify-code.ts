// FILE PATH: server/prisma/pre-university-cse/verify-code.ts
//
// Proof that the code in the Pre-University CSE lessons is right: every complete program is
// COMPILED (C with gcc, C++ with g++, Java with javac), syntax-checked (Python, JavaScript) or run
// (SQL scripts), and when a lesson shows its output, the real output is compared with it.
//
// Conventions inside a lesson file (all fenced blocks):
//
//   ```c                a complete C program (it contains `int main`). Compiled, and run when the next
//   ```                 block is `output`. Fragments (no main) are not compiled.
//   ```input            optional: the text typed into the program (stdin), directly after the program
//   ```output           the exact output the program prints (trailing spaces and blank edges ignored)
//
//   ```cpp  ```java  ```python  ```javascript  ```sql    the same rules. A ```sql block is checked when its first
//   line is a marker comment: `-- script` (complete on its own), `-- setup` (tables and data that the blocks
//   below it share) or `-- query` (runs on top of the latest setup; `-- query headers` also prints the column
//   names). The output block shows the rows of the last SELECT.
//   ```asm              a program for the toy CPU of the lessons (it contains HALT); the output block shows the
//                       final state: `A=12 B=7 Z=0 C=0 steps=9` and, when memory was written, `mem: [0]=19`
//
// Marking a block `nocheck` (```c nocheck) skips it: use it for code that is meant not to compile or
// that needs the network. Everything else must pass — this only ever executes code authored in this
// repository.
//
//   npm run verify:pre-university-cse-code             all lessons
//   npm run verify:pre-university-cse-code -- 3 5      only courses 3 and 5

import * as fs from 'fs';
import { PUCSE_COURSES } from '../../src/pre-university-cse/outline';
import {
  pythonAvailable,
  runAsm,
  runC,
  runCpp,
  runJava,
  runNode,
  runPython,
  runSql,
  sqlBlockKind,
  sqlWithSetup,
  toolAvailable,
  type RunOutput,
} from '../../src/assessments/bank/bank.verify';
import { allCodeBlocks, lessonPath, type CodeBlock } from './build';

export interface CodeProblem {
  where: string;
  message: string;
}

const normalize = (s: string) =>
  s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');

const isComplete = (b: CodeBlock): boolean => {
  if (b.attrs.includes('nocheck') || b.attrs.includes('fragment')) return false;
  switch (b.language) {
    case 'c':
    case 'cpp':
      return /\bint\s+main\s*\(/.test(b.code);
    case 'java':
      return /public\s+static\s+void\s+main/.test(b.code);
    case 'python':
    case 'javascript':
      return true;
    case 'sql':
      return sqlBlockKind(b.code) !== null;
    case 'asm':
      return /\bHALT\b/i.test(b.code);
    default:
      return false;
  }
};

const available = (language: string): boolean => {
  switch (language) {
    case 'c':
      return toolAvailable('gcc');
    case 'cpp':
      return toolAvailable('g++');
    case 'java':
      return toolAvailable('javac') && toolAvailable('java');
    case 'python':
    case 'sql':
    case 'asm':
      return pythonAvailable();
    default:
      return true;
  }
};

function run(language: string, code: string, stdin: string): RunOutput {
  switch (language) {
    case 'c':
      return runC(code, stdin);
    case 'cpp':
      return runCpp(code, stdin);
    case 'java':
      return runJava(code, stdin);
    case 'python':
      return runPython(code, stdin);
    case 'sql':
      return runSql(code);
    case 'asm':
      return runAsm(code);
    default:
      return runNode(code);
  }
}

/** Java classes are written as `public class Main` so every program is one file. */
export function verifyBlocks(where: string, blocks: CodeBlock[]): { problems: CodeProblem[]; checked: number; skipped: number } {
  const problems: CodeProblem[] = [];
  let checked = 0;
  let skipped = 0;
  let setup: string | null = null;
  blocks.forEach((b, i) => {
    if (b.language === 'sql' && sqlBlockKind(b.code) === 'setup' && !b.attrs.includes('nocheck')) setup = b.code;
    if (!isComplete(b)) return;
    if (!available(b.language)) {
      skipped++;
      return;
    }
    let next = blocks[i + 1];
    let stdin = '';
    if (next?.language === 'input') {
      stdin = next.code.replace(/\n$/, '') + '\n';
      next = blocks[i + 2];
    }
    const expected = next?.language === 'output' ? next.code : null;
    const at = `${where} · ${b.section} · block ${i + 1} (${b.language})`;
    const isQuery = b.language === 'sql' && sqlBlockKind(b.code) === 'query';
    if (isQuery && setup === null) {
      problems.push({ where: at, message: 'a "-- query" block needs a "-- setup" block above it' });
      return;
    }
    const result = run(b.language, isQuery ? sqlWithSetup(setup, b.code) : b.code, stdin);
    checked++;
    if (!result.ok) {
      problems.push({ where: at, message: `did not ${b.language === 'javascript' || b.language === 'python' ? 'run' : 'compile and run'}: ${result.stderr.trim().slice(-500)}` });
      return;
    }
    if (expected !== null && normalize(result.stdout) !== normalize(expected)) {
      problems.push({ where: at, message: `the lesson shows\n${normalize(expected)}\nbut the program prints\n${normalize(result.stdout)}` });
    }
  });
  return { problems, checked, skipped };
}

export function verifyAllLessons(courseNumbers?: number[]): { problems: CodeProblem[]; checked: number; skipped: number } {
  const out = { problems: [] as CodeProblem[], checked: 0, skipped: 0 };
  for (const course of PUCSE_COURSES) {
    if (courseNumbers && courseNumbers.length && !courseNumbers.includes(course.number)) continue;
    for (const lesson of course.lessons) {
      const file = lessonPath(course, lesson);
      if (!fs.existsSync(file)) continue;
      const r = verifyBlocks(`${course.slug}/${lesson.file}`, allCodeBlocks(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')));
      out.problems.push(...r.problems);
      out.checked += r.checked;
      out.skipped += r.skipped;
    }
  }
  return out;
}

function main(): void {
  const courses = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 8);
  const r = verifyAllLessons(courses);
  if (r.problems.length > 0) {
    console.error(`${r.problems.length} problem(s) in ${r.checked} checked program(s):\n\n${r.problems.map((p) => `✗ ${p.where}\n  ${p.message.replace(/\n/g, '\n  ')}`).join('\n\n')}`);
    process.exit(1);
  }
  console.log(`All ${r.checked} complete program(s) compile/run and match their shown output${r.skipped ? ` (${r.skipped} skipped: toolchain not installed)` : ''}.`);
}

if (require.main === module) main();
