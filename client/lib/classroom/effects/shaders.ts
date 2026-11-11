// FILE PATH: client/lib/classroom/effects/shaders.ts
//
// The GLSL of the video effects (WebGL 2). See renderer.ts for how the passes fit
// together. Every picture here is "y up": the camera frame is uploaded flipped, so
// uv (0, 0) is the bottom-left of the PICTURE, and nothing needs flipping on the way
// out.
//
// What the passes do, in the order a frame meets them:
//
//   DOWN     the camera frame (cropped by auto-framing) at half size: the picture the
//            later passes look at, and cheaper than looking at the full frame.
//   REFINE   the segmentation model's mask is coarse (256 × 256) and soft at the
//            edges. This takes it to this picture's size and sharpens it against the
//            REAL edges in the picture (a joint bilateral filter: a pixel is the
//            average of its neighbours' mask, but only of neighbours that look like
//            it — so the mask edge snaps to the hair, the shoulder, the ear), then
//            smooths it over time (no shimmer), quickly where it really changes.
//   PREP     keeps only the background, premultiplied (colour × how much of it
//   BLUR     there is), and blurs that (separably, at quarter size). The blur is of the
//            BACKGROUND ONLY — normalised by how much background each pixel saw — so
//            the person's colours never bleed into it (no halo, no ghost).
//   COMPOSE  at full size: skin touch-up, the lighting curve, then person over
//            background. At the edge, the person's colour is pulled to the colour of
//            the person next to it (the old background's colour in a hair strand is
//            "spill"), and a trace of the new background's light wraps round them.
//   STATS    a tiny copy of the camera frame, for measuring the light on the person.

export const VERTEX = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const HEADER = `#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
`;

/** Shared: sample point i of n on a disc of radius 1 — a golden-angle spiral, which
 * covers a disc evenly — turned by a fixed amount per pixel, so what is left of the
 * pattern is noise that does not move from frame to frame, not stripes. */
const VOGEL = `
float spin_ = 0.0;
vec2 vogel(int i, int n) {
  float r = sqrt((float(i) + 0.5) / float(n));
  float t = float(i) * 2.39996323 + spin_;
  return r * vec2(cos(t), sin(t));
}
float spinOf(vec2 fragCoord) {
  vec3 p3 = fract(vec3(fragCoord.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z) * 6.2831853;
}
`;

/** Shared: the shape given to the mask (a steeper edge, slightly tightened: a pixel
 * that is "probably person" is not shown half-transparent). */
const SHAPE = `
float shapeAlpha(float a) {
  return smoothstep(0.38, 0.74, a);
}
`;

// ─── DOWN / STATS ───────────────────────────────────────────────────────────

export const DOWN = `${HEADER}
uniform sampler2D u_frame;
uniform vec4 u_crop;      // bottom-left and size of the part of the frame shown (uv); size may be negative (flip)
uniform vec2 u_step;      // half a texel of the picture being made, in frame uv
out vec4 o_color;
void main() {
  vec2 uv = u_crop.xy + v_uv * u_crop.zw;
  vec2 d = u_step * abs(u_crop.zw);
  vec3 c = texture(u_frame, uv + vec2(-d.x, -d.y)).rgb
         + texture(u_frame, uv + vec2( d.x, -d.y)).rgb
         + texture(u_frame, uv + vec2(-d.x,  d.y)).rgb
         + texture(u_frame, uv + vec2( d.x,  d.y)).rgb;
  o_color = vec4(c * 0.25, 1.0);
}`;

// ─── REFINE ─────────────────────────────────────────────────────────────────

export const REFINE = `${HEADER}
uniform sampler2D u_small;   // the picture, half size
uniform sampler2D u_mask;    // the model's mask, in FRAME uv, 1 = person
uniform sampler2D u_prev;    // last frame's refined mask
uniform vec4 u_crop;         // frame uv of this picture's corner / size
uniform vec2 u_px;           // one texel of the picture
uniform float u_radius;      // how far to look, in texels
uniform float u_invSigmaR2;  // how alike a neighbour must look
uniform float u_blend;       // how much of a new mask is taken when nothing moves
uniform float u_hasPrev;
out vec4 o_color;

const int TAPS = 16;
${VOGEL}
float maskAt(vec2 uv) {
  return texture(u_mask, u_crop.xy + uv * u_crop.zw).r;
}

void main() {
  spin_ = spinOf(gl_FragCoord.xy);
  vec3 c = texture(u_small, v_uv).rgb;
  float acc = maskAt(v_uv);
  float sum = 1.0;
  for (int i = 0; i < TAPS; i++) {
    vec2 o = vogel(i, TAPS);
    vec2 uv = v_uv + o * u_radius * u_px;
    vec3 d = texture(u_small, uv).rgb - c;
    float w = exp(-dot(d, d) * u_invSigmaR2) * exp(-dot(o, o) * 0.9);
    acc += maskAt(uv) * w;
    sum += w;
  }
  float a = acc / sum;
  float prev = texture(u_prev, v_uv).r;
  // Smooth over time — but where the mask really moves, follow it at once.
  float k = u_hasPrev > 0.5 ? clamp(u_blend + 1.8 * abs(a - prev), 0.0, 1.0) : 1.0;
  o_color = vec4(mix(prev, a, k), 0.0, 0.0, 1.0);
}`;

// ─── PREP / BLUR ────────────────────────────────────────────────────────────

export const PREP = `${HEADER}
uniform sampler2D u_small;
uniform sampler2D u_alpha;
out vec4 o_color;   // the background: colour × (1 - a), and (1 - a)
${SHAPE}
void main() {
  vec3 c = texture(u_small, v_uv).rgb;
  float a = shapeAlpha(texture(u_alpha, v_uv).r);
  o_color = vec4(c * (1.0 - a), 1.0 - a);
}`;

export const BLUR = `${HEADER}
uniform sampler2D u_in;
uniform vec2 u_dir;       // one texel along the blur's direction
uniform float u_sigma;    // in texels
out vec4 o_color;
void main() {
  vec4 acc = vec4(0.0);
  float sum = 0.0;
  float reach = ceil(u_sigma * 2.8);
  for (int i = -12; i <= 12; i++) {
    float f = float(i);
    if (abs(f) > reach) continue;
    float w = exp(-0.5 * f * f / (u_sigma * u_sigma));
    acc += texture(u_in, v_uv + u_dir * f) * w;
    sum += w;
  }
  o_color = acc / sum;
}`;

// ─── COMPOSE ────────────────────────────────────────────────────────────────

export const COMPOSE = `${HEADER}
uniform sampler2D u_frame;    // the camera frame, full size
uniform sampler2D u_small;    // the picture, half size (cropped, not lit)
uniform sampler2D u_alpha;    // the person
uniform sampler2D u_bgBlur;   // blurred background, premultiplied
uniform sampler2D u_bgImage;  // the replacement picture
uniform sampler2D u_bgSoft;   // a very soft copy of it, for the wrap of light

uniform vec4 u_crop;          // frame uv of the part shown
uniform vec2 u_px;            // one texel of the frame
uniform vec2 u_workPx;        // one texel of the half-size picture
uniform int u_bgMode;         // 0 none, 1 blur, 2 picture
uniform float u_hasMask;
uniform float u_gain;         // lighting: linear gain
uniform float u_lift;         // lighting: shadow lift
uniform float u_touch;        // touch-up amount, 0–1
uniform float u_touchRadius;  // in frame texels
uniform vec4 u_face;          // the face, in this picture's uv: centre x, y, half width, half height
uniform float u_faceOn;
uniform float u_sharpen;      // when zoomed in
uniform float u_wrap;         // light wrap
uniform float u_grain;        // grain on a blurred background
uniform float u_seed;
out vec4 o_color;
${SHAPE}

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float luma(vec3 c) { return dot(c, LUMA); }

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float softClip(float y) {
  const float knee = 0.78;
  return y < knee ? y : knee + (1.0 - knee) * (1.0 - exp(-(y - knee) / (1.0 - knee)));
}

// Lighting: exposure in linear light, the same for red, green and blue (so skin keeps
// its colour), the shadows given a little extra, the highlights rolled off softly. The
// extra for the shadows is a GAIN (a share more), not an offset: pure black stays
// black, so the picture is brighter without a grey veil over it.
vec3 lighting(vec3 c) {
  if (u_gain < 1.002 && u_lift < 0.0005) return c;
  vec3 lin = pow(c, vec3(2.2));
  float y = luma(lin);
  float shadow = smoothstep(0.004, 0.03, y) * (1.0 - smoothstep(0.03, 0.30, y));
  lin *= u_gain * (1.0 + u_lift * shadow);
  float y2 = luma(lin);
  lin *= softClip(y2) / max(y2, 1e-4);
  return pow(clamp(lin, 0.0, 1.0), vec3(1.0 / 2.2));
}

// How much like skin is this colour: the chroma of skin sits in a small region of
// YCbCr whatever its lightness. Lips, red cloth, hair and eyes fall outside it.
float skinProb(vec3 c) {
  float cb = -0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b + 0.5;
  float cr =  0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b + 0.5;
  float pcb = smoothstep(0.27, 0.32, cb) * (1.0 - smoothstep(0.48, 0.53, cb));
  float pcr = smoothstep(0.50, 0.545, cr) * (1.0 - smoothstep(0.655, 0.70, cr));
  float y = luma(c);
  return pcb * pcr * smoothstep(0.10, 0.22, y) * (1.0 - smoothstep(0.93, 1.0, y));
}

const int SPIRAL = 12;
${VOGEL}

// A light touch-up of the skin: an edge-preserving smoothing (a bilateral filter on
// lightness: pores and small blemishes are within its tolerance and are averaged
// away, but an eyelid, a lip, a nostril or a hair is not) of only the skin of only the
// face, with a good part of the fine detail put back, so it stays skin.
vec3 touchUp(vec3 c, vec2 fuv, vec2 ouv) {
  float skin = skinProb(c);
  if (skin < 0.02) return c;
  float region = 1.0;
  if (u_faceOn > 0.5) {
    vec2 q = (ouv - u_face.xy) / u_face.zw;
    region = 1.0 - smoothstep(0.85, 1.35, length(q));
  }
  float amount = u_touch * skin * region;
  if (amount < 0.01) return c;
  float yc = luma(c);
  vec3 acc = c;
  float sum = 1.0;
  for (int i = 0; i < SPIRAL; i++) {
    vec2 o = vogel(i, SPIRAL);
    vec3 s = texture(u_frame, fuv + o * u_touchRadius * u_px).rgb;
    float d = luma(s) - yc;
    float w = exp(-d * d * 260.0) * exp(-dot(o, o) * 0.5);
    acc += s * w;
    sum += w;
  }
  vec3 smooth_ = acc / sum;
  vec3 detail = c - smooth_;
  return mix(c, smooth_ + detail * 0.32, clamp(amount * 0.9, 0.0, 1.0));
}

// The colour of the person nearby: what an edge pixel (which is part person, part old
// background) should be, were it all person.
vec3 personColourNear(vec2 uv, vec3 fallback) {
  vec3 acc = vec3(0.0);
  float sum = 0.0;
  for (int i = 0; i < 8; i++) {
    vec2 o = vogel(i, 8) * u_workPx * 3.2;
    float a = shapeAlpha(texture(u_alpha, uv + o).r);
    float w = a * a * a;
    acc += texture(u_small, uv + o).rgb * w;
    sum += w;
  }
  return sum > 0.08 ? acc / sum : fallback;
}

void main() {
  spin_ = spinOf(gl_FragCoord.xy);
  vec2 fuv = u_crop.xy + v_uv * u_crop.zw;
  vec3 c = texture(u_frame, fuv).rgb;

  if (u_touch > 0.001) c = touchUp(c, fuv, v_uv);
  if (u_sharpen > 0.001) {
    vec2 d = u_px * 1.2;
    vec3 b = (texture(u_frame, fuv + vec2(d.x, 0.0)).rgb + texture(u_frame, fuv - vec2(d.x, 0.0)).rgb
            + texture(u_frame, fuv + vec2(0.0, d.y)).rgb + texture(u_frame, fuv - vec2(0.0, d.y)).rgb) * 0.25;
    c = clamp(c + (c - b) * u_sharpen, 0.0, 1.0);
  }

  vec3 person = lighting(c);
  vec3 col = person;
  float a = 1.0;

  if (u_bgMode != 0 && u_hasMask > 0.5) {
    a = shapeAlpha(texture(u_alpha, v_uv).r);
    if (a < 0.998) {
      vec3 bg;
      if (u_bgMode == 1) {
        vec4 b = texture(u_bgBlur, v_uv);
        vec3 sharp = texture(u_small, v_uv).rgb;
        // the blurred background only where there is background to blur
        bg = lighting(mix(sharp, b.rgb / max(b.a, 0.001), smoothstep(0.03, 0.22, b.a)));
      } else {
        bg = texture(u_bgImage, v_uv).rgb;
      }
      // At the edge: the person's own colour, not the old background's.
      if (a > 0.004) {
        vec3 near = lighting(personColourNear(v_uv, c));
        person = mix(person, near, (1.0 - a) * 0.8);
        // and a trace of the new background's light round them
        float edge = 1.0 - abs(2.0 * a - 1.0);
        vec3 wrap = u_bgMode == 2 ? texture(u_bgSoft, v_uv).rgb : bg;
        person += wrap * edge * u_wrap;
      }
      col = mix(bg, person, a);
      // A blurred background loses the camera's own grain; put a little back, so the
      // sharp person and the soft background still look like one picture.
      col += (hash(gl_FragCoord.xy + u_seed * 1.7) - 0.5) * u_grain * (1.0 - a);
    }
  }
  // Dither: no banding in a smooth background or a dark gradient.
  col += (hash(gl_FragCoord.xy + u_seed) - 0.5) * (1.6 / 255.0);
  o_color = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
