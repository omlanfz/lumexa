// FILE PATH: client/lib/classroom/lightingProcessor.ts
//
// A minimal custom LiveKit track processor (built on the same
// @livekit/track-processors primitives as the background blur/virtual-bg
// processors) that brightens/adds contrast to the outgoing camera track —
// the "Lighting adjustment" appearance control. Runs entirely in-browser via
// Canvas2D's `filter` property, no ML model needed (unlike background
// segmentation), so it's always available where WebCodecs/OffscreenCanvas is.
//
// Note: this occupies the track's one processor slot, same as background
// blur/virtual-background — the two can't currently run at once (see
// useVideoEffects/useLightingEffect callers), which keeps this scoped to
// what's actually needed rather than building a full multi-pass pipeline.

import { ProcessorWrapper, VideoTransformer } from '@livekit/track-processors';

export interface LightingOptions extends Record<string, unknown> {
  /** 1 = unchanged, >1 = brighter */
  brightness: number;
  /** 1 = unchanged, >1 = more contrast */
  contrast: number;
}

class LightingTransformer extends VideoTransformer<LightingOptions> {
  private ctx?: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  private brightness = 1;
  private contrast = 1;

  async init(opts: Parameters<VideoTransformer<LightingOptions>['init']>[0]) {
    await super.init(opts);
    this.ctx = this.canvas?.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
  }

  update(options: LightingOptions) {
    if (typeof options.brightness === 'number') this.brightness = options.brightness;
    if (typeof options.contrast === 'number') this.contrast = options.contrast;
  }

  transform(frame: VideoFrame, controller: TransformStreamDefaultController<VideoFrame>) {
    if (!this.ctx || !this.canvas) {
      frame.close();
      return;
    }
    const w = frame.displayWidth;
    const h = frame.displayHeight;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CanvasRenderingContext2D#filter isn't on the OffscreenCanvas 2D context lib.dom typings yet
    (this.ctx as any).filter = `brightness(${this.brightness}) contrast(${this.contrast})`;
    this.ctx.drawImage(frame, 0, 0, w, h);
    const out = new VideoFrame(this.canvas as CanvasImageSource as HTMLCanvasElement, {
      timestamp: frame.timestamp,
    });
    frame.close();
    controller.enqueue(out);
  }
}

export function createLightingProcessor(): ProcessorWrapper<LightingOptions> {
  return new ProcessorWrapper(new LightingTransformer(), 'lumexa-lighting');
}
