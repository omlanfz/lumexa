#!/usr/bin/env node
// Screenshots each screen in mockups/dashboard-mockups.html into mockups/*.png
//   npm run mockups

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'mockups');

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1320, height: 1000 }, deviceScaleFactor: 1.5 });
const page = await context.newPage();
await page.goto(pathToFileURL(join(dir, 'dashboard-mockups.html')).href);
await page.evaluate(() => document.fonts.ready);
for (const [id, file] of [
  ['home', 'mockup-home-banner.png'],
  ['certificates', 'mockup-certificates-page.png'],
  ['verify', 'mockup-verify-page-phone.png'],
]) {
  await (await page.$(`#${id}`)).screenshot({ path: join(dir, file) });
  console.log('wrote mockups/' + file);
}
await browser.close();
