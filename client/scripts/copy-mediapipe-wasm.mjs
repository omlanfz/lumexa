// Copies the MediaPipe vision runtime (WebAssembly) out of node_modules into
// public/mediapipe/<version>/wasm, so the classroom's video effects load it from the
// app's own origin instead of a CDN. Run before `next dev` and `next build` (see the
// predev / prebuild scripts in package.json). The copy is not committed (.gitignore).
//
// The runtime's version must match the JavaScript that drives it, so the version is
// read from the installed package and compared with EXPECTED_VERSION, which is the
// same number lib/classroom/effects/models.ts asks for. If someone upgrades the
// package without updating that constant, the build stops here with a clear message
// instead of shipping a JavaScript / WebAssembly mismatch.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_VERSION = '0.10.14';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'node_modules', '@mediapipe', 'tasks-vision');

if (!existsSync(join(pkgDir, 'package.json'))) {
  console.error('copy-mediapipe-wasm: @mediapipe/tasks-vision is not installed. Run `npm install` first.');
  process.exit(1);
}
const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
if (version !== EXPECTED_VERSION) {
  console.error(
    `copy-mediapipe-wasm: @mediapipe/tasks-vision is ${version} but lib/classroom/effects/models.ts and this script expect ` +
      `${EXPECTED_VERSION}. Update TASKS_VISION_VERSION in models.ts and EXPECTED_VERSION here together.`,
  );
  process.exit(1);
}

const target = join(root, 'public', 'mediapipe');
rmSync(target, { recursive: true, force: true });
mkdirSync(join(target, version), { recursive: true });
cpSync(join(pkgDir, 'wasm'), join(target, version, 'wasm'), { recursive: true });
console.log(`copy-mediapipe-wasm: MediaPipe ${version} runtime copied to public/mediapipe/${version}/wasm`);
