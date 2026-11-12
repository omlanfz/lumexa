// Renders a VideoPlan to frames in a headless browser (the canvas engine in ./engine) and pipes
// them, together with the mixed audio track, into ffmpeg to make the final 1920×1080 MP4.

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { Browser } from 'puppeteer';
import type { SfxEvent, VideoPlan } from './engine/plan';

/** The one esbuild call this tool makes (the server does not depend on esbuild's types). */
interface EsbuildApi {
  build(
    options: Record<string, unknown>,
  ): Promise<{ outputFiles: { text: string }[] }>;
}

function loadEsbuild(): EsbuildApi {
  const candidates = [
    'esbuild',
    path.resolve(__dirname, '../../../client/node_modules/esbuild'),
  ];
  for (const c of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(c) as EsbuildApi;
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    'esbuild is needed to bundle the video engine: run `npm install` in client/ (it comes with tsx) or `npm i -D esbuild` in server/.',
  );
}

let bundleCache: string | null = null;

/** The browser-side renderer (engine/index.ts and everything it imports) as one script. */
export async function bundleEngine(): Promise<string> {
  if (bundleCache) return bundleCache;
  const esbuild = loadEsbuild();
  const out = await esbuild.build({
    entryPoints: [path.join(__dirname, 'engine/index.ts')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'chrome120',
    write: false,
    logLevel: 'silent',
  });
  const bundle = out.outputFiles[0].text;
  bundleCache = bundle;
  return bundle;
}

export const ffmpegPath = (): string =>
  process.env.FFMPEG_PATH?.trim() || 'ffmpeg';

export function chromiumPath(): string | undefined {
  const candidates = [
    process.env.LESSON_VIDEO_CHROMIUM_PATH,
    process.env.CERTIFICATE_CHROMIUM_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/opt/pw-browsers/chromium',
  ].filter((p): p is string => !!p && fs.existsSync(p));
  return candidates[0];
}

export async function launchBrowser(): Promise<Browser> {
  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({
    headless: true,
    executablePath: chromiumPath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });
}

export interface RenderOptions {
  plan: VideoPlan;
  browser: Browser;
  /** Mixed 48 kHz stereo WAV. */
  audioPath: string;
  outPath: string;
  posterPath: string;
  /** JPEG quality (0–1) of the frames handed to ffmpeg. */
  quality?: number;
  onProgress?: (done: number, total: number) => void;
}

async function openPage(browser: Browser, plan: VideoPlan) {
  const page = await browser.newPage();
  await page.setViewport({
    width: plan.width,
    height: plan.height,
    deviceScaleFactor: 1,
  });
  await page.setContent(
    '<!doctype html><html><body style="margin:0;background:#000"><canvas id="c"></canvas></body></html>',
  );
  await page.addScriptTag({ content: await bundleEngine() });
  await page.evaluate((p) => window.__init(p), plan as never);
  return page;
}

/** The sound-effect schedule of a plan (computed by the same code that draws the animation). */
export async function sfxFor(
  browser: Browser,
  plan: VideoPlan,
): Promise<SfxEvent[]> {
  const page = await openPage(browser, plan);
  try {
    return await page.evaluate(() => window.__sfx());
  } finally {
    await page.close();
  }
}

/** One frame as a JPEG (for the poster and for visual checks). */
export async function frameAt(
  browser: Browser,
  plan: VideoPlan,
  times: number[],
  quality = 0.92,
): Promise<Buffer[]> {
  const page = await openPage(browser, plan);
  try {
    const out: Buffer[] = [];
    for (const t of times) {
      const uri = await page.evaluate(
        (tt, q) => window.__frame(tt, q),
        t,
        quality,
      );
      out.push(Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64'));
    }
    return out;
  } finally {
    await page.close();
  }
}

export async function renderVideo(o: RenderOptions): Promise<void> {
  const { plan, browser } = o;
  const page = await openPage(browser, plan);
  const total = Math.ceil(plan.duration * plan.fps);
  const args = [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'image2pipe',
    '-framerate',
    String(plan.fps),
    '-c:v',
    'mjpeg',
    '-i',
    '-',
    '-i',
    o.audioPath,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-r',
    String(plan.fps),
    '-g',
    String(plan.fps * 2),
    '-af',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-ar',
    '48000',
    '-movflags',
    '+faststart',
    '-t',
    String(plan.duration),
    o.outPath,
  ];
  const ff = spawn(ffmpegPath(), args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  ff.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
  const exited = new Promise<void>((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited with ${code}: ${stderr.trim()}`)),
    );
  });
  try {
    for (let i = 0; i < total; i++) {
      const uri = await page.evaluate(
        (t, q) => window.__frame(t, q),
        i / plan.fps,
        o.quality ?? 0.92,
      );
      const buf = Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
      if (!ff.stdin.write(buf))
        await new Promise<void>((r) => ff.stdin.once('drain', () => r()));
      if (o.onProgress && i % 48 === 0) o.onProgress(i, total);
    }
    ff.stdin.end();
    await exited;
  } catch (err) {
    ff.kill('SIGKILL');
    throw err;
  } finally {
    await page.close();
  }
  // a poster that shows the lesson title card with Pixel
  const intro = plan.scenes[1];
  const [poster] = await frameAt(
    browser,
    plan,
    [Math.min(plan.duration - 1, intro.start + 6.2)],
    0.9,
  );
  fs.writeFileSync(o.posterPath, poster);
}
