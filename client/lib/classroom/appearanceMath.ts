// FILE PATH: client/lib/classroom/appearanceMath.ts
//
// The arithmetic behind the Appearance effects (auto-framing, lighting), kept
// apart from the video plumbing so it can be tested without a camera.

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A detected face, in pixels of the frame. */
export interface FaceBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/** How often the face is looked for (it is the expensive part). */
export const DETECT_INTERVAL_MS = 200;
/** With no face for this long, the frame eases back out to the whole picture. */
export const FACE_LOST_RESET_MS = 2500;
/** How fast the crop follows its target each frame (0–1). */
export const CROP_LERP = 0.12;
/** The crop never gets narrower than this share of the frame. */
export const MIN_CROP_WIDTH_RATIO = 0.38;
/** The crop is this many face-widths wide. */
export const FACE_PADDING = 2.6;
/** Headroom left above the face, in face-heights. */
const HEADROOM = 0.15;

/**
 * The part of a `w`×`h` frame to show so the face is centred and reasonably
 * large: the frame's own aspect ratio (so the published size never changes), a
 * little headroom above the face rather than the face dead in the middle, and
 * always inside the frame.
 */
export function cropForFace(box: FaceBox, w: number, h: number): CropRect {
  const frameAspect = w / h;
  const cx = box.originX + box.width / 2;
  const cy = box.originY + box.height / 2;

  let cropW = Math.min(w, Math.max(box.width * FACE_PADDING, w * MIN_CROP_WIDTH_RATIO));
  let cropH = cropW / frameAspect;
  if (cropH > h) {
    cropH = h;
    cropW = cropH * frameAspect;
  }
  let x = cx - cropW / 2;
  let y = cy - cropH / 2 - box.height * HEADROOM;
  x = Math.min(Math.max(0, x), Math.max(0, w - cropW));
  y = Math.min(Math.max(0, y), Math.max(0, h - cropH));
  return { x, y, w: cropW, h: cropH };
}

/** One step of easing the crop towards its target — smooth movement, not jumps. */
export function easeCrop(current: CropRect | null, target: CropRect, lerp: number = CROP_LERP): CropRect {
  if (!current) return target;
  return {
    x: current.x + (target.x - current.x) * lerp,
    y: current.y + (target.y - current.y) * lerp,
    w: current.w + (target.w - current.w) * lerp,
    h: current.h + (target.h - current.h) * lerp,
  };
}

/** The canvas filter for the lighting sliders. */
export function lightingFilter(brightness: number, contrast: number): string {
  return `brightness(${brightness}) contrast(${contrast})`;
}
