// FILE PATH: client/lib/classroom/effects/framing.ts
//
// Auto-framing: where the (virtual) camera should look so the person sits
// comfortably in the picture — and how it gets there smoothly. Pure arithmetic with
// no camera or browser in it, so it is tested by feeding it faces and a clock.
//
// What it aims for (the way a meeting app's "framing" feels):
//   - a gentle zoom, never a close-up: the face takes about a quarter of the width
//     (so the shoulders stay in), and never more than MAX_ZOOM;
//   - the face on the upper part of the picture (a little above the middle, with room
//     for the hair above and the shoulders below), never the head cut off;
//   - a calm camera: a lean or a turn of the head does not move it. It moves only
//     once the person has really settled somewhere else (a deadzone, and the new
//     place must be seen a few times in a row), and then glides there (critically
//     damped, with a speed limit) instead of jumping;
//   - a face that is lost (a hand over it, a turned head) is waited for; only after a
//     good while does the picture ease back out to the whole frame.
//
// Everything is in fractions of the camera frame: x and y from 0 (left / top) to 1.

/** A face, as a share of the frame: its top-left corner and size. */
export interface FaceBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the camera looks: the centre of the picture shown, and how far it is
 * zoomed in (1 = the whole frame). */
export interface Framing {
  cx: number;
  cy: number;
  zoom: number;
}

/** The picture shown, in the same terms: top-left and size (width = height, as the
 * crop keeps the frame's own shape). */
export interface CropRect {
  x: number;
  y: number;
  size: number;
}

export const FULL_FRAME: Framing = { cx: 0.5, cy: 0.5, zoom: 1 };

/** Never zoom in further than this: more is a close-up, and soft. */
export const MAX_ZOOM = 1.8;
/** The face takes about this share of the picture's width. */
export const FACE_WIDTH_SHARE = 0.25;
/** The middle of the face sits this far down the picture (0 = top). */
export const EYE_LINE = 0.4;
/** Room kept above the face box, in face heights (the hair is above the box). */
export const HEADROOM_FACES = 0.55;

/** The camera stays put while the person is within this share of the picture of
 * where it already looks… */
const DEADZONE_POSITION = 0.06;
/** …and within this much (in zoom, as a ratio) of how far it is zoomed. */
const DEADZONE_ZOOM = 0.07;
/** A new place must be seen this many times in a row to be moved to (a face is
 * looked for ~10 times a second, so a third of a second). */
const CONFIRMATIONS = 3;
/** How much of each new face reading is taken (smooths out detector jitter). */
const FACE_SMOOTHING = 0.35;
/** Once the camera has been sent somewhere new, its destination keeps being
 * corrected for this many readings (about two seconds) while the person settles —
 * the smoothed face is still catching up with where they actually stopped. */
const REFINE_READINGS = 20;
/** …by any difference over this share of the picture. */
const REFINE_TOLERANCE = 0.012;

/** With no face for this long the camera has stayed where it was (a hand over the
 * face, a turned head, a moment out of the picture); only after it does the picture
 * ease back out to the whole frame. */
export const RELAX_AFTER_MS = 9_000;

/** How long the glide takes to settle (seconds), for where the camera looks, its
 * zoom, and the ease back out. */
const POSITION_SMOOTH_S = 0.5;
const ZOOM_SMOOTH_S = 0.7;
const RELAX_SMOOTH_S = 1.2;
/** The fastest the camera moves: frame widths per second, and zoom per second. */
const MAX_POSITION_SPEED = 0.45;
const MAX_ZOOM_SPEED = 0.7;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** The picture shown for a framing. It always lies inside the frame. */
export function cropOf(framing: Framing): CropRect {
  const zoom = clamp(framing.zoom, 1, MAX_ZOOM);
  const size = 1 / zoom;
  return {
    size,
    x: clamp(framing.cx - size / 2, 0, 1 - size),
    y: clamp(framing.cy - size / 2, 0, 1 - size),
  };
}

/** Where the camera should look for this face. Always a framing whose picture lies
 * inside the frame, with the head (and its hair) in it. */
export function framingForFace(face: FaceBox): Framing {
  const width = Math.max(face.w, 0.02);
  const zoom = clamp(FACE_WIDTH_SHARE / width, 1, MAX_ZOOM);
  const size = 1 / zoom;
  const faceX = face.x + face.w / 2;
  const faceY = face.y + face.h / 2;

  let top = faceY - EYE_LINE * size;
  // the top of the head: never above the picture
  const headTop = face.y - HEADROOM_FACES * face.h;
  if (top > headTop) top = headTop;
  top = clamp(top, 0, 1 - size);
  const left = clamp(faceX - size / 2, 0, 1 - size);
  return { cx: left + size / 2, cy: top + size / 2, zoom };
}

/** One step of a critically damped glide towards `target` (the standard
 * "smooth damp"): no overshoot, no jump. Returns the new value and velocity. */
export function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  maxSpeed: number,
  dt: number,
): { value: number; velocity: number } {
  if (dt <= 0) return { value: current, velocity };
  const time = Math.max(0.0001, smoothTime);
  const omega = 2 / time;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const maxChange = maxSpeed * time;
  const change = clamp(current - target, -maxChange, maxChange);
  const reached = current - change;
  const temp = (velocity + omega * change) * dt;
  let nextVelocity = (velocity - omega * temp) * decay;
  let value = reached + (change + temp) * decay;
  // never past the target
  if (target - current > 0 === (value > target)) {
    value = target;
    nextVelocity = (value - target) / dt;
  }
  return { value, velocity: nextVelocity };
}

function sameFraming(a: Framing, b: Framing, tolerance = 0.002): boolean {
  return Math.abs(a.cx - b.cx) < tolerance && Math.abs(a.cy - b.cy) < tolerance && Math.abs(a.zoom - b.zoom) < tolerance * 4;
}

export class FramingController {
  private face: FaceBox | null = null;
  private lastSeenAt = Number.NEGATIVE_INFINITY;
  private lastStepAt: number | null = null;
  private target: Framing = FULL_FRAME;
  private current: Framing = FULL_FRAME;
  private velocity = { cx: 0, cy: 0, zoom: 0 };
  private pendingMoves = 0;
  private refining = 0;
  private releasing = false;

  /** A face was found. (Not finding one needs no call: see `step`.) */
  observe(face: FaceBox, now: number): void {
    this.releasing = false;
    this.lastSeenAt = now;
    this.face = this.face
      ? {
          x: this.face.x + (face.x - this.face.x) * FACE_SMOOTHING,
          y: this.face.y + (face.y - this.face.y) * FACE_SMOOTHING,
          w: this.face.w + (face.w - this.face.w) * FACE_SMOOTHING,
          h: this.face.h + (face.h - this.face.h) * FACE_SMOOTHING,
        }
      : face;
    const wanted = framingForFace(this.face);

    // The very first sighting, or coming back from the whole frame: go there.
    if (sameFraming(this.target, FULL_FRAME) && !sameFraming(wanted, FULL_FRAME)) {
      this.target = wanted;
      this.pendingMoves = 0;
      this.refining = REFINE_READINGS;
      return;
    }
    const size = 1 / this.target.zoom;

    // Just sent somewhere new: follow the person's last few movements there.
    if (this.refining > 0) {
      this.refining -= 1;
      if (
        Math.abs(wanted.cx - this.target.cx) > REFINE_TOLERANCE * size ||
        Math.abs(wanted.cy - this.target.cy) > REFINE_TOLERANCE * size ||
        Math.abs(Math.log(wanted.zoom / this.target.zoom)) > REFINE_TOLERANCE
      ) {
        this.target = wanted;
      }
      this.pendingMoves = 0;
      return;
    }
    const moved =
      Math.abs(wanted.cx - this.target.cx) > DEADZONE_POSITION * size ||
      Math.abs(wanted.cy - this.target.cy) > DEADZONE_POSITION * size ||
      Math.abs(Math.log(wanted.zoom / this.target.zoom)) > DEADZONE_ZOOM;
    if (!moved) {
      this.pendingMoves = 0;
      return;
    }
    // somewhere new — but only once it has been seen to stay there
    this.pendingMoves += 1;
    if (this.pendingMoves >= CONFIRMATIONS) {
      this.target = wanted;
      this.pendingMoves = 0;
      this.refining = REFINE_READINGS;
    }
  }

  /** Moves the camera on to `now` and returns where it looks. */
  step(now: number): Framing {
    const dt = this.lastStepAt === null ? 0 : clamp((now - this.lastStepAt) / 1000, 0, 0.1);
    this.lastStepAt = now;

    // Nobody seen for a good while: ease back out to the whole frame.
    const lostFor = now - this.lastSeenAt;
    const relaxing = this.releasing || (lostFor > RELAX_AFTER_MS && this.lastSeenAt !== Number.NEGATIVE_INFINITY);
    if (relaxing && !sameFraming(this.target, FULL_FRAME)) {
      this.target = FULL_FRAME;
      this.pendingMoves = 0;
      this.refining = 0;
    }
    const positionTime = relaxing ? RELAX_SMOOTH_S : POSITION_SMOOTH_S;
    const zoomTime = relaxing ? RELAX_SMOOTH_S : ZOOM_SMOOTH_S;

    const cx = smoothDamp(this.current.cx, this.target.cx, this.velocity.cx, positionTime, MAX_POSITION_SPEED, dt);
    const cy = smoothDamp(this.current.cy, this.target.cy, this.velocity.cy, positionTime, MAX_POSITION_SPEED, dt);
    const zoom = smoothDamp(this.current.zoom, this.target.zoom, this.velocity.zoom, zoomTime, MAX_ZOOM_SPEED, dt);
    this.velocity = { cx: cx.velocity, cy: cy.velocity, zoom: zoom.velocity };
    this.current = { cx: cx.value, cy: cy.value, zoom: clamp(zoom.value, 1, MAX_ZOOM) };
    return this.current;
  }

  /** Auto-framing was switched off: ease back out to the whole frame (rather than
   * snapping), then `settled` says it is done. */
  release(): void {
    this.releasing = true;
    this.face = null;
    this.pendingMoves = 0;
    this.refining = 0;
  }

  /** The camera looks at the whole frame and is not on its way anywhere. */
  get settled(): boolean {
    return sameFraming(this.current, FULL_FRAME, 0.004) && sameFraming(this.target, FULL_FRAME);
  }

  /** The framing right now. */
  get framing(): Framing {
    return this.current;
  }
}
