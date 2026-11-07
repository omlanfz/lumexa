// Rules of the certificate system that are easy to break by accident later, checked
// against the client source itself:
//
//   1. No Lumexa web address is written into any certificate file. The public
//      domain is not final; every link comes from the server (FRONTEND_URL) or
//      the browser's own address — and certificate sharing never invents one.
//   2. Nothing can DELETE a certificate: no delete call and no delete button.
//      Certificates and their files are kept permanently.
//   3. Teachers have no certificate screens or calls.
//
// Run from the client folder (npm test).

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();

/** The files that make up the certificate feature in the client (tests excluded). */
const CERTIFICATE_PATHS = [
  'lib/certificates',
  'components/student/certificates',
  'components/admin/certificates',
  'components/student/CertificateAchievementCard.tsx',
  'components/student/CompletedProgramsCard.tsx',
  'app/verify',
  'app/student-dashboard/certificates',
  'app/admin/certificates',
];

function* walk(target: string): Generator<string> {
  const full = path.join(ROOT, target);
  if (!fs.existsSync(full)) return;
  const stat = fs.statSync(full);
  if (stat.isFile()) {
    yield full;
    return;
  }
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    yield* walk(path.join(target, entry.name));
  }
}

const certificateFiles = (): string[] =>
  CERTIFICATE_PATHS.flatMap((p) => [...walk(p)]).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f),
  );

/** Source with comments removed, so a sentence in a comment never trips a rule. */
const codeOnly = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('the certificate files are found (the checks below are not vacuous)', () => {
  const files = certificateFiles();
  assert.ok(files.length >= 15, `found only ${files.length} files`);
  assert.ok(files.some((f) => f.endsWith(path.join('app', 'verify', '[certificateId]', 'page.tsx'))));
  assert.ok(files.some((f) => f.endsWith('share.ts')));
});

test('no Lumexa web address is hard-coded in any certificate file', () => {
  // Assembled from pieces so this file does not contain what it forbids.
  const forbidden = [
    ['vercel', '.app'].join(''),
    ['lumexa', 'aischool'].join(''),
    ['lumexa', '.app'].join(''),
    ['lumexa', '.school'].join(''),
    ['lumexa', '.com'].join(''),
    ['lumexa', '-one'].join(''),
    'localhost',
    '127.0.0.1',
  ];
  const offenders: string[] = [];
  for (const file of certificateFiles()) {
    const source = codeOnly(fs.readFileSync(file, 'utf8')).toLowerCase();
    for (const bad of forbidden) {
      if (source.includes(bad)) offenders.push(`${path.relative(ROOT, file)} → ${bad}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('the only web addresses in certificate code are the platforms we share to', () => {
  const allowedHosts = new Set([
    'wa.me',
    'www.facebook.com',
    'www.linkedin.com',
    'discord.com',
    'www.w3.org', // SVG namespace, if any
  ]);
  const offenders: string[] = [];
  for (const file of certificateFiles()) {
    const source = codeOnly(fs.readFileSync(file, 'utf8'));
    for (const match of source.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
      if (!allowedHosts.has(match[1].toLowerCase())) {
        offenders.push(`${path.relative(ROOT, file)} → ${match[0]}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('nothing in the client can delete a certificate', () => {
  const offenders: string[] = [];
  for (const file of certificateFiles()) {
    const source = codeOnly(fs.readFileSync(file, 'utf8'));
    if (/api\.delete\(|axios\.delete\(|method:\s*['"]DELETE['"]/i.test(source)) {
      offenders.push(`${path.relative(ROOT, file)} calls a DELETE endpoint`);
    }
    // a visible "Delete…" / "Remove certificate" control
    if (/>\s*(Delete|Remove)\b[^<]*</.test(source) || /label:\s*['"](Delete|Remove)/i.test(source)) {
      offenders.push(`${path.relative(ROOT, file)} shows a delete control`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('teachers have no certificate screens or calls', () => {
  const teacherFolders = ['app/(teacher)', 'components/teacher', 'components/TeacherTopNav.tsx'];
  const offenders: string[] = [];
  for (const folder of teacherFolders) {
    for (const file of walk(folder)) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const source = codeOnly(fs.readFileSync(file, 'utf8'));
      if (/certificates\/|\/admin\/certificates|lib\/certificates/.test(source)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('the verification page reads only the API address from the environment', () => {
  const files = certificateFiles().filter((f) => f.includes(`${path.sep}app${path.sep}verify${path.sep}`) || f.endsWith('verification.ts'));
  for (const file of files) {
    const source = codeOnly(fs.readFileSync(file, 'utf8'));
    const vars = [...source.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]);
    for (const name of vars) assert.equal(name, 'NEXT_PUBLIC_API_URL', `${path.relative(ROOT, file)} reads ${name}`);
  }
});
