// FILE PATH: client/lib/classroom/effects/renderer.ts
//
// The video effects' compositor: WebGL 2, on a canvas (a page canvas, or an
// OffscreenCanvas). Give it a camera frame, the latest mask from the segmentation
// model and what the person has asked for, and it draws the finished picture onto
// the canvas. The shaders are in shaders.ts, which also describes the passes.
//
// It knows nothing about cameras, tracks or Daily — only pixels. It owns its GL
// resources and gives them all back in dispose(); a lost GL context is reported
// (onContextLost) rather than left to draw into nothing.

import { BLUR, COMPOSE, DOWN, PREP, REFINE, VERTEX } from './shaders.ts';
import type { FaceBox } from './framing.ts';

type Canvas = HTMLCanvasElement | OffscreenCanvas;
type ProgramName = 'down' | 'refine' | 'prep' | 'blur' | 'compose';

/** How the background is treated. */
export type BackgroundKind = 'none' | 'blur' | 'image';

export interface RenderParams {
  /** The part of the frame to show (auto-framing), as fractions of the frame, y down:
   * top-left corner and side (the crop keeps the frame's own shape). */
  crop: { x: number; y: number; size: number };
  background: BackgroundKind;
  /** How strongly the background is blurred: the blur's sigma in pixels of a 720-line
   * picture (it is scaled to the real picture's size). */
  blurSigma: number;
  /** The segmentation mask is current: the person can be told from the background. */
  hasMask: boolean;
  /** Seconds since the last frame (for the smoothing over time). */
  dt: number;
  /** Lighting: a gain in linear light and a lift of the shadows. */
  gain: number;
  lift: number;
  /** Skin touch-up, 0 (off) to 1, and where the face is (frame fractions, y down). */
  touchUp: number;
  face: FaceBox | null;
}

/** The size the finished picture is made at, at most: more only costs more. */
const MAX_OUTPUT_WIDTH = 1280;
export class GlUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GlUnavailableError';
  }
}

interface Program {
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | null>;
}

interface Target {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
}

export class EffectsRenderer {
  readonly canvas: Canvas;
  private readonly gl: WebGL2RenderingContext;
  private readonly programs: Record<ProgramName, Program>;
  private readonly quad: WebGLBuffer;
  private readonly vao: WebGLVertexArrayObject;
  private readonly dummy: WebGLTexture;
  private onContextLost: (() => void) | null;
  private lost = false;
  private disposed = false;

  private frameTexture: WebGLTexture | null = null;
  private frameSize = { width: 0, height: 0 };
  private out = { width: 0, height: 0 };

  private small: Target | null = null;
  private alpha: [Target, Target] | null = null;
  private alphaWrite = 0;
  private hasPrevAlpha = false;
  private blurA: Target | null = null;
  private blurB: Target | null = null;
  private reader: Target | null = null;
  private readerBuffer: Uint8Array | null = null;

  private maskTexture: WebGLTexture | null = null;
  private maskSize = { width: 0, height: 0 };
  private maskBytes: Uint8Array | null = null;
  private maskReady = false;

  private bgSource: { source: CanvasImageSource; width: number; height: number } | null = null;
  private bgImage: WebGLTexture | null = null;
  private bgSoft: WebGLTexture | null = null;
  private frameCounter = 0;
  /** Share of the full output size the picture is made at (the governor lowers it on a
   * computer that cannot keep up). */
  private renderScale = 1;
  private appliedScale = 1;

  constructor(canvas: Canvas, hooks: { onContextLost?: () => void } = {}) {
    this.canvas = canvas;
    this.onContextLost = hooks.onContextLost ?? null;
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
    }) as WebGL2RenderingContext | null;
    if (!gl) throw new GlUnavailableError('WebGL 2 is not available.');
    this.gl = gl;

    (canvas as HTMLCanvasElement).addEventListener?.('webglcontextlost', this.handleLost as EventListener);

    this.programs = {
      down: this.link(DOWN),
      refine: this.link(REFINE),
      prep: this.link(PREP),
      blur: this.link(BLUR),
      compose: this.link(COMPOSE),
    };

    // One big triangle covers the whole picture.
    const quad = gl.createBuffer();
    const vao = gl.createVertexArray();
    if (!quad || !vao) throw new GlUnavailableError('Could not create WebGL buffers.');
    this.quad = quad;
    this.vao = vao;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const p of Object.values(this.programs)) {
      const loc = gl.getAttribLocation(p.program, 'a_pos');
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
    }

    this.dummy = this.texture(1, 1, gl.RGBA8, gl.RGBA, gl.LINEAR, new Uint8Array([0, 0, 0, 255]));
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new GlUnavailableError(`WebGL setup failed (${error}).`);
  }

  // ─── What the caller reads ──────────────────────────────────────────────

  get isLost(): boolean {
    return this.lost;
  }

  /** The GL here is software emulation (graphics acceleration is off, or there is no
   * GPU): everything on the GPU is then slow, and a neural network on it hopeless. */
  get isSoftware(): boolean {
    try {
      const info = this.gl.getExtension('WEBGL_debug_renderer_info');
      const name = info ? String(this.gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    } catch {
      return false;
    }
  }

  /** The size the picture is drawn at. */
  get outputSize(): { width: number; height: number } {
    return { ...this.out };
  }

  // ─── Setting up ─────────────────────────────────────────────────────────

  /** Makes everything the right size for a camera that sends `width`×`height`.
   * Cheap when nothing changed. */
  prepare(width: number, height: number): void {
    if (this.disposed || this.lost) return;
    if (
      width === this.frameSize.width &&
      height === this.frameSize.height &&
      this.renderScale === this.appliedScale &&
      this.frameTexture
    ) {
      return;
    }
    const gl = this.gl;
    this.frameSize = { width, height };
    this.appliedScale = this.renderScale;

    const scale = Math.min(1, (MAX_OUTPUT_WIDTH * this.renderScale) / width);
    const outW = Math.max(2, Math.round((width * scale) / 2) * 2);
    const outH = Math.max(2, Math.round((height * scale) / 2) * 2);
    this.out = { width: outW, height: outH };
    this.canvas.width = outW;
    this.canvas.height = outH;

    this.freeTargets();
    if (this.frameTexture) gl.deleteTexture(this.frameTexture);
    this.frameTexture = this.texture(width, height, gl.RGBA8, gl.RGBA, gl.LINEAR);

    const halfW = Math.max(2, Math.round(outW / 2));
    const halfH = Math.max(2, Math.round(outH / 2));
    this.small = this.target(halfW, halfH, gl.RGBA8, gl.RGBA);
    this.alpha = [this.target(halfW, halfH, gl.R8, gl.RED), this.target(halfW, halfH, gl.R8, gl.RED)];
    this.hasPrevAlpha = false;
    const quarterW = Math.max(2, Math.round(outW / 4));
    const quarterH = Math.max(2, Math.round(outH / 4));
    this.blurA = this.target(quarterW, quarterH, gl.RGBA8, gl.RGBA);
    this.blurB = this.target(quarterW, quarterH, gl.RGBA8, gl.RGBA);
    if (this.bgSource) this.uploadBackground();
  }

  /** Makes the picture at `scale` (0–1) of the full output size from the next frame on. */
  setRenderScale(scale: number): void {
    this.renderScale = Math.min(1, Math.max(0.25, scale));
  }

  get currentRenderScale(): number {
    return this.renderScale;
  }

  /** The latest mask from the segmentation model: `width`×`height` values, 1 where
   * there is a person. */
  setMask(data: Uint8Array | Float32Array, width: number, height: number): void {
    if (this.disposed || this.lost) return;
    const gl = this.gl;
    let bytes: Uint8Array;
    if (data instanceof Uint8Array) {
      bytes = data;
    } else {
      if (!this.maskBytes || this.maskBytes.length !== data.length) this.maskBytes = new Uint8Array(data.length);
      const out = this.maskBytes;
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        out[i] = v <= 0 ? 0 : v >= 1 ? 255 : (v * 255 + 0.5) | 0;
      }
      bytes = out;
    }
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE3);
    if (!this.maskTexture || this.maskSize.width !== width || this.maskSize.height !== height) {
      if (this.maskTexture) gl.deleteTexture(this.maskTexture);
      this.maskTexture = this.texture(width, height, gl.R8, gl.RED, gl.LINEAR, bytes);
      this.maskSize = { width, height };
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.UNSIGNED_BYTE, bytes);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    this.maskReady = true;
  }

  /** The mask is no longer current (the background effect is off, or the model
   * failed): the next one starts afresh. */
  clearMask(): void {
    this.maskReady = false;
    this.hasPrevAlpha = false;
  }

  /** The picture for a virtual background, or null for none. It is fitted to cover the
   * output (cropped, not stretched). */
  setBackgroundImage(source: CanvasImageSource | null, width = 0, height = 0): void {
    if (this.disposed || this.lost) return;
    const previous = this.bgSource?.source;
    this.bgSource = source && width > 0 && height > 0 ? { source, width, height } : null;
    this.uploadBackground();
    // the picture that was replaced is not needed any more
    if (previous && previous !== source) (previous as { close?: () => void }).close?.();
  }

  // ─── Drawing ────────────────────────────────────────────────────────────

  /** Takes in a camera frame (the size given to prepare()). Do this first, then read
   * it back (readSmall) if need be, then draw(). */
  uploadFrame(frame: TexImageSource): void {
    if (this.disposed || this.lost || !this.frameTexture) return;
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, frame);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  /** Uploads and draws in one go. */
  render(frame: TexImageSource, params: RenderParams): void {
    this.uploadFrame(frame);
    this.draw(params);
  }

  /** Draws the frame last given to uploadFrame() with the effects. */
  draw(params: RenderParams): void {
    if (this.disposed || this.lost || !this.frameTexture || !this.small || !this.alpha || !this.blurA || !this.blurB) return;
    const gl = this.gl;
    this.frameCounter += 1;
    gl.bindVertexArray(this.vao);

    const { crop } = params;
    // frame fractions (y down) → uv (y up)
    const cropUv: [number, number, number, number] = [crop.x, 1 - (crop.y + crop.size), crop.size, crop.size];
    const segment = params.background !== 'none' && params.hasMask && this.maskReady && !!this.maskTexture;

    if (segment) {
      const small = this.small;
      // DOWN: the picture at half size
      this.use('down');
      this.bindTexture(0, this.frameTexture, 'u_frame');
      this.setVec4('u_crop', cropUv);
      this.setVec2('u_step', [0.5 / small.width, 0.5 / small.height]);
      this.draw1(small);

      // REFINE: the mask, sharpened against the picture and smoothed over time
      const write = this.alpha[this.alphaWrite];
      const read = this.alpha[1 - this.alphaWrite];
      this.use('refine');
      this.bindTexture(1, small.texture, 'u_small');
      this.bindTexture(3, this.maskTexture, 'u_mask');
      this.bindTexture(2, read.texture, 'u_prev');
      this.setVec4('u_crop', cropUv);
      this.setVec2('u_px', [1 / small.width, 1 / small.height]);
      this.set1f('u_radius', 4.5 * (small.height / 360));
      this.set1f('u_invSigmaR2', 25);
      // 0.3 of a new mask per frame at 30 fps, however fast the frames come
      this.set1f('u_blend', 1 - Math.pow(0.7, Math.min(4, Math.max(0.25, params.dt * 30))));
      this.set1f('u_hasPrev', this.hasPrevAlpha ? 1 : 0);
      this.draw1(write);
      this.alphaWrite = 1 - this.alphaWrite;
      this.hasPrevAlpha = true;

      if (params.background === 'blur') {
        const a = this.blurA;
        const b = this.blurB;
        this.use('prep');
        this.bindTexture(1, small.texture, 'u_small');
        this.bindTexture(2, write.texture, 'u_alpha');
        this.draw1(a);
        const sigma = Math.max(0.4, (params.blurSigma * (this.out.height / 720)) / 4);
        this.use('blur');
        this.set1f('u_sigma', sigma);
        this.bindTexture(1, a.texture, 'u_in');
        this.setVec2('u_dir', [1 / a.width, 0]);
        this.draw1(b);
        this.bindTexture(1, b.texture, 'u_in');
        this.setVec2('u_dir', [0, 1 / a.height]);
        this.draw1(a);
      }
    } else {
      this.hasPrevAlpha = false;
    }

    // COMPOSE: the finished picture, to the canvas
    const finalAlpha = this.alpha[1 - this.alphaWrite]; // the one just written
    this.use('compose');
    this.bindTexture(0, this.frameTexture, 'u_frame');
    this.bindTexture(1, this.small.texture, 'u_small');
    this.bindTexture(2, segment ? finalAlpha.texture : this.dummy, 'u_alpha');
    this.bindTexture(4, params.background === 'blur' && segment ? this.blurA.texture : this.dummy, 'u_bgBlur');
    this.bindTexture(5, params.background === 'image' && this.bgImage ? this.bgImage : this.dummy, 'u_bgImage');
    this.bindTexture(6, params.background === 'image' && this.bgSoft ? this.bgSoft : this.dummy, 'u_bgSoft');
    const hasImage = params.background === 'image' && !!this.bgImage;
    const mode = segment ? (params.background === 'blur' ? 1 : hasImage ? 2 : 0) : 0;
    this.set1i('u_bgMode', mode);
    this.set1f('u_hasMask', segment && mode !== 0 ? 1 : 0);
    this.setVec4('u_crop', cropUv);
    this.setVec2('u_px', [1 / this.frameSize.width, 1 / this.frameSize.height]);
    this.setVec2('u_workPx', [1 / this.small.width, 1 / this.small.height]);
    this.set1f('u_gain', params.gain);
    this.set1f('u_lift', params.lift);
    this.set1f('u_touch', params.touchUp);
    this.set1f('u_touchRadius', this.touchRadius(params.face));
    const face = params.face && params.touchUp > 0 ? params.face : null;
    this.set1f('u_faceOn', face ? 1 : 0);
    this.setVec4('u_face', face ? this.faceEllipse(face, crop) : [0.5, 0.5, 1, 1]);
    this.set1f('u_sharpen', Math.min(0.35, Math.max(0, (1 / crop.size - 1.1) * 0.5)));
    this.set1f('u_wrap', mode === 2 ? 0.1 : mode === 1 ? 0.04 : 0);
    this.set1f('u_grain', mode === 1 ? 3 / 255 : 0);
    this.set1f('u_seed', (this.frameCounter * 0.6180339887) % 97);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.out.width, this.out.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** A small copy of the camera frame last given to uploadFrame(), top row first, 4
   * bytes a pixel — what the segmentation model and the face finder look at, and what
   * the light is measured on. The returned array is reused by the next call. It waits
   * for the GPU, so ask only when something needs it. */
  readSmall(width: number, height: number): { rgba: Uint8Array; width: number; height: number } | null {
    if (this.disposed || this.lost || !this.frameTexture) return null;
    const gl = this.gl;
    if (!this.reader || this.reader.width !== width || this.reader.height !== height) {
      if (this.reader) {
        gl.deleteTexture(this.reader.texture);
        gl.deleteFramebuffer(this.reader.framebuffer);
      }
      this.reader = this.target(width, height, gl.RGBA8, gl.RGBA);
      this.readerBuffer = new Uint8Array(width * height * 4);
    }
    gl.bindVertexArray(this.vao);
    this.use('down');
    this.bindTexture(0, this.frameTexture, 'u_frame');
    this.setVec4('u_crop', [0, 1, 1, -1]); // flipped: top row first
    this.setVec2('u_step', [0.5 / width, 0.5 / height]);
    this.draw1(this.reader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.reader.framebuffer);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, this.readerBuffer!);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { rgba: this.readerBuffer!, width, height };
  }

  /** Gives every GL resource back. Safe to call twice. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.onContextLost = null;
    (this.canvas as HTMLCanvasElement).removeEventListener?.('webglcontextlost', this.handleLost as EventListener);
    const gl = this.gl;
    try {
      this.freeTargets();
      for (const t of [this.frameTexture, this.maskTexture, this.bgImage, this.bgSoft, this.dummy]) if (t) gl.deleteTexture(t);
      for (const p of Object.values(this.programs)) gl.deleteProgram(p.program);
      gl.deleteBuffer(this.quad);
      gl.deleteVertexArray(this.vao);
      // Let the browser have the context back at once, rather than at garbage collection.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      // the context is already gone
    }
    this.frameTexture = this.maskTexture = this.bgImage = this.bgSoft = null;
    (this.bgSource?.source as { close?: () => void } | undefined)?.close?.();
    this.bgSource = null;
  }

  // ─── Plumbing ───────────────────────────────────────────────────────────

  private handleLost = (event: Event): void => {
    event.preventDefault();
    this.lost = true;
    this.onContextLost?.();
  };

  private touchRadius(face: FaceBox | null): number {
    const scale = this.frameSize.width / 1280;
    if (!face) return Math.min(6, Math.max(2, 3.5 * scale));
    return Math.min(6, Math.max(2.5, face.w * this.frameSize.width * 0.018));
  }

  /** The face as an ellipse in the finished picture's uv: centre and half-axes. */
  private faceEllipse(face: FaceBox, crop: { x: number; y: number; size: number }): [number, number, number, number] {
    const cx = (face.x + face.w / 2 - crop.x) / crop.size;
    const cyDown = (face.y + face.h / 2 - crop.y) / crop.size;
    return [cx, 1 - cyDown, (face.w * 0.75) / crop.size, (face.h * 0.85) / crop.size];
  }

  private uploadBackground(): void {
    const gl = this.gl;
    if (this.bgImage) gl.deleteTexture(this.bgImage);
    if (this.bgSoft) gl.deleteTexture(this.bgSoft);
    this.bgImage = null;
    this.bgSoft = null;
    const bg = this.bgSource;
    if (!bg || this.out.width === 0) return;
    const fitted = this.coverCanvas(bg, this.out.width, this.out.height);
    const soft = this.coverCanvas({ source: fitted, width: this.out.width, height: this.out.height }, 64, Math.max(2, Math.round((64 * this.out.height) / this.out.width)));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE5);
    this.bgImage = this.texture(this.out.width, this.out.height, gl.RGBA8, gl.RGBA, gl.LINEAR, fitted);
    gl.activeTexture(gl.TEXTURE6);
    this.bgSoft = this.texture(soft.width, soft.height, gl.RGBA8, gl.RGBA, gl.LINEAR, soft);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  /** `source` scaled to fill `width`×`height`, the overflow cropped, centred. */
  private coverCanvas(
    src: { source: CanvasImageSource; width: number; height: number },
    width: number,
    height: number,
  ): HTMLCanvasElement | OffscreenCanvas {
    const canvas: HTMLCanvasElement | OffscreenCanvas =
      typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : Object.assign(document.createElement('canvas'), { width, height });
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) throw new GlUnavailableError('Could not prepare the background picture.');
    const scale = Math.max(width / src.width, height / src.height);
    const w = src.width * scale;
    const h = src.height * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src.source, (width - w) / 2, (height - h) / 2, w, h);
    return canvas;
  }

  private link(fragment: string): Program {
    const gl = this.gl;
    const compile = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type);
      if (!shader) throw new GlUnavailableError('Could not create a shader.');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) ?? '';
        gl.deleteShader(shader);
        throw new GlUnavailableError(`Shader did not compile: ${log.slice(0, 400)}`);
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!program) throw new GlUnavailableError('Could not create a program.');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'a_pos');
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? '';
      gl.deleteProgram(program);
      throw new GlUnavailableError(`Program did not link: ${log.slice(0, 400)}`);
    }
    return { program, uniforms: new Map() };
  }

  private current: Program | null = null;

  private use(name: ProgramName): void {
    this.current = this.programs[name];
    this.gl.useProgram(this.current.program);
  }

  private loc(name: string): WebGLUniformLocation | null {
    const program = this.current;
    if (!program) return null;
    if (!program.uniforms.has(name)) program.uniforms.set(name, this.gl.getUniformLocation(program.program, name));
    return program.uniforms.get(name) ?? null;
  }

  private bindTexture(unit: number, texture: WebGLTexture | null, uniform: string): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture ?? this.dummy);
    const location = this.loc(uniform);
    if (location) gl.uniform1i(location, unit);
  }

  private set1f(name: string, v: number): void {
    const l = this.loc(name);
    if (l) this.gl.uniform1f(l, v);
  }
  private set1i(name: string, v: number): void {
    const l = this.loc(name);
    if (l) this.gl.uniform1i(l, v);
  }
  private setVec2(name: string, v: [number, number]): void {
    const l = this.loc(name);
    if (l) this.gl.uniform2f(l, v[0], v[1]);
  }
  private setVec4(name: string, v: [number, number, number, number]): void {
    const l = this.loc(name);
    if (l) this.gl.uniform4f(l, v[0], v[1], v[2], v[3]);
  }

  /** Draws the current program into `target`. */
  private draw1(target: Target): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private texture(
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    filter: number,
    data?: ArrayBufferView | TexImageSource | null,
  ): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new GlUnavailableError('Could not create a texture.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (data && ArrayBuffer.isView(data)) {
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.UNSIGNED_BYTE, data);
    } else if (data) {
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, gl.UNSIGNED_BYTE, data as TexImageSource);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.UNSIGNED_BYTE, null);
    }
    return texture;
  }

  private target(width: number, height: number, internalFormat: number, format: number): Target {
    const gl = this.gl;
    const texture = this.texture(width, height, internalFormat, format, gl.LINEAR);
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new GlUnavailableError('Could not create a framebuffer.');
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new GlUnavailableError('A WebGL render target is not supported here.');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture, framebuffer, width, height };
  }

  private freeTargets(): void {
    const gl = this.gl;
    const all: (Target | null)[] = [this.small, ...(this.alpha ?? []), this.blurA, this.blurB, this.reader];
    for (const t of all) {
      if (!t) continue;
      gl.deleteTexture(t.texture);
      gl.deleteFramebuffer(t.framebuffer);
    }
    this.small = this.blurA = this.blurB = this.reader = null;
    this.readerBuffer = null;
    this.alpha = null;
  }
}
