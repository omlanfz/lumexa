// Renders every <id>.html in this folder to ../../public/student-projects/<id>.webp
// (1920x1200). Re-run after editing a page:
//
//   cd client/scripts/project-screenshots
//   NODE_PATH=$(npm root -g) node build.mjs            # all projects
//   NODE_PATH=$(npm root -g) node build.mjs mood-detector   # just one
//
// Needs `playwright` (with Chromium) available to Node; it is not a dependency of
// the Next.js app (`sharp` comes with Next). Emoji need the Noto Color Emoji font.
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "..", "public", "student-projects");
// playwright comes from the global install (NODE_PATH); sharp from the client's node_modules.
const { chromium } = createRequire(import.meta.url)("playwright");
const sharp = createRequire(join(here, "..", "..", "package.json"))("sharp");

const only = process.argv.slice(2);
const ids = readdirSync(here)
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.replace(/\.html$/, ""))
  .filter((id) => !only.length || only.includes(id));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
for (const id of ids) {
  await page.goto(pathToFileURL(join(here, `${id}.html`)).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const png = await page.screenshot({ type: "png" });
  const file = join(out, `${id}.webp`);
  await sharp(png).webp({ quality: 90, effort: 5 }).toFile(file);
  console.log("wrote", file);
}
await browser.close();
