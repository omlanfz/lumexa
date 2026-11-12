// Browser entry of the video renderer. The orchestrator loads this bundle into a blank page, calls
// __init(plan) once and then __frame(t) for every frame of the video.

import { H, W, ease, clamp01, prog, type Ctx } from './kit';
import type { SfxEvent, VideoPlan } from './plan';
import { drawScene, scheduleSfx, sceneIndexAt, setLogo } from './scenes';
import { activeCue, drawBackground, drawHeader, drawSubtitle } from './world';

declare global {
  interface Window {
    __init(plan: VideoPlan): Promise<void>;
    __frame(t: number, quality?: number): string;
    __sfx(): SfxEvent[];
  }
}

let plan: VideoPlan;
let canvas: HTMLCanvasElement;
let ctx: Ctx;
let logo: HTMLImageElement | null = null;

const END_CARD = 3.3;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

window.__init = async (p: VideoPlan) => {
  plan = p;
  canvas = document.getElementById('c') as HTMLCanvasElement;
  canvas.width = W;
  canvas.height = H;
  ctx = canvas.getContext('2d', { alpha: false }) as Ctx;
  await Promise.all(
    [
      '600 40px Inter',
      '700 40px Inter',
      '800 40px Inter',
      '900 40px Inter',
      '600 28px "DejaVu Sans Mono"',
    ].map((f) => document.fonts.load(f)),
  );
  await document.fonts.ready;
  logo = await loadImage(p.logo);
  setLogo(logo);
};

function draw(t: number): void {
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.filter = 'none';
  drawBackground(c, t, plan);
  const last = plan.scenes[plan.scenes.length - 1];
  // the header steps aside for the Lumexa end card
  const header = 1 - ease.out3(prog(t, last.end - END_CARD, 0.4));
  if (header > 0.01) drawHeader(c, plan, logo, header);
  drawScene(c, plan, sceneIndexAt(plan, t), t);
  const cue = activeCue(plan.cues, t);
  if (cue) drawSubtitle(c, cue, t, plan.highlights);
}

window.__frame = (t: number, quality = 0.92) => {
  draw(clamp01(0) + t);
  return canvas.toDataURL('image/jpeg', quality);
};

window.__sfx = () => scheduleSfx(plan);
