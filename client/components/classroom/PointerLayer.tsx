// FILE PATH: client/components/classroom/PointerLayer.tsx
//
// The teacher's Pointer over ONE student's shared screen: a small dot that follows
// their cursor, a thin line that follows it while the mouse button is held (and fades
// away behind it), and a ring where they click. Everyone who can see the shared screen
// sees it; the teacher, with Pointer mode on, also drives it.
//
// Place it inside the box that holds the shared screen's <video> (a tile, or the
// full-window view) — a positioned element. It covers that box with ONE canvas and
// ignores the mouse (pointer-events: none), so the buttons and double-click behind and
// around it work exactly as before; it never takes part in a click. Nothing is a DOM
// node per movement: a frame loop runs only while something is moving or fading, asks
// the store what to draw (see PointerStore.frame) and paints it (see pointerCanvas.ts).
//
// The picture is letterboxed inside its box (object-fit: contain), so positions are
// measured against the PICTURE, not the box: everything is drawn where the same spot is
// in THIS browser's picture, wherever the teacher's was. While Pointer mode is on, the
// teacher's own mouse over the box is listened to from the box itself (without stopping
// it), turned into positions on the picture, and handed to `pointer`:
//
//   moving                   the dot follows;
//   press and move           a line is drawn (a press that hardly moves is a click);
//   release without moving   a click: a ring;
//   off the picture          a cursor on a letterbox bar is "off the picture": the dot hides.
//
// A press is followed with the mouse captured, so its release is never missed — even
// outside the window — and an interrupted press (the system took the pointer away, the
// window lost focus, the tab was hidden) ends the line without making a click.

'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { DRAG_THRESHOLD_PX, containedRect, toNormalized } from '@/lib/classroom/pointer';
import type { Point, Size } from '@/lib/classroom/pointer';
import { POINTER_RED, drawPointer, parseHexColor } from '@/lib/classroom/pointerCanvas';
import type { PointerControls } from '@/lib/classroom/usePointer';

interface PointerLayerProps {
  /** The Daily session id of the student presenting this screen. */
  sessionId: string;
  pointer: PointerControls;
  /** The <video> showing the shared screen (for the picture's own size). */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** The teacher is pointing: their mouse over this screen drives the Pointer. */
  capturing: boolean;
}

interface Geometry {
  box: Size;
  media: Size;
}

const UNKNOWN: Geometry = { box: { width: 0, height: 0 }, media: { width: 0, height: 0 } };

/** Things a click on is for something else — a button of the tile, a link. */
const INTERACTIVE = 'button, a, input, select, textarea, [data-pointer-ignore]';

/** A mouse button that is down. */
interface Press {
  id: number;
  /** Where (on the screen) and when it went down. */
  x: number;
  y: number;
  at: number;
  /** The spot on the picture. */
  point: Point;
  /** It has moved far enough to be a line, not a click. */
  drag: boolean;
  /** A line is being drawn right now (not while the cursor is off the picture). */
  drawing: boolean;
}

export default function PointerLayer({ sessionId, pointer, videoRef, capturing }: PointerLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The size of the box and of the picture, kept current for the mouse handlers.
  const geometry = useRef<Geometry>(UNKNOWN);

  const { store } = pointer;

  // ─── Painting ──────────────────────────────────────────────────────────

  // The canvas follows the size of the box (and of the picture in it, which changes when
  // the sharer picks another window); a frame loop paints while there is something to
  // paint and rests while there is not.
  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!layer || !canvas || !ctx) return;
    const video = videoRef.current;
    const color = parseHexColor(getComputedStyle(layer).getPropertyValue('--cr-pointer'), POINTER_RED);
    const motion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let raf = 0;
    let ratio = 1;

    const measure = () => {
      const box = { width: layer.clientWidth, height: layer.clientHeight };
      geometry.current = {
        box,
        media: { width: video?.videoWidth ?? 0, height: video?.videoHeight ?? 0 },
      };
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(box.width * ratio));
      const height = Math.max(1, Math.round(box.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width; // (this also clears it)
        canvas.height = height;
      }
    };

    const paint = (now: number) => {
      raf = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const picture = containedRect(geometry.current.box, geometry.current.media);
      const frame = store.frame(sessionId, now);
      if (!picture || !frame) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawPointer(ctx, { picture, frame, now, color, reducedMotion: !!motion?.matches });
      if (frame.animating) request();
    };
    const request = () => {
      if (raf === 0) raf = requestAnimationFrame(paint);
    };
    const remeasure = () => {
      measure();
      request();
    };

    measure();
    request();
    const unsubscribe = store.subscribe(request);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(remeasure) : null;
    observer?.observe(layer);
    video?.addEventListener('loadedmetadata', remeasure);
    video?.addEventListener('resize', remeasure);
    return () => {
      unsubscribe();
      observer?.disconnect();
      video?.removeEventListener('loadedmetadata', remeasure);
      video?.removeEventListener('resize', remeasure);
      if (raf !== 0) cancelAnimationFrame(raf);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [store, sessionId, videoRef]);

  // ─── The teacher's mouse ───────────────────────────────────────────────

  // Listened to on the box that holds the layer, passively and without stopping
  // anything, so the tile's own buttons keep working.
  useEffect(() => {
    if (!capturing) return;
    const layer = layerRef.current;
    const host = layer?.parentElement;
    if (!layer || !host) return;

    host.setAttribute('data-pointer', 'on');
    let inside = false;
    let press: Press | null = null;

    /** Where the cursor is on the picture, or null on a letterbox bar (or before the
     * picture's size is known). */
    const onPicture = (clientX: number, clientY: number): Point | null => {
      const picture = containedRect(geometry.current.box, geometry.current.media);
      if (!picture) return null;
      const box = layer.getBoundingClientRect();
      return toNormalized({ x: clientX - box.left, y: clientY - box.top }, picture);
    };
    const hide = () => {
      if (!inside) return;
      inside = false;
      pointer.leave(sessionId);
    };
    const release = (id: number) => {
      try {
        if (host.hasPointerCapture(id)) host.releasePointerCapture(id);
      } catch {
        // already gone
      }
    };
    /** The press ended without a release (taken away, window lost, tab hidden): the
     * line stops where it was, and it was not a click. */
    const interrupt = () => {
      if (!press) return;
      const was = press;
      press = null;
      release(was.id);
      if (was.drawing) pointer.endStroke();
    };

    const move = (event: PointerEvent) => {
      const point = onPicture(event.clientX, event.clientY);
      if (!point) {
        // On a letterbox bar. With the button down the mouse is captured, so this can
        // happen far outside the box: the line stops, and carries on as a new one if the
        // cursor comes back with the button still down.
        if (press?.drawing) {
          pointer.endStroke();
          press.drawing = false;
        }
        hide();
        return;
      }
      inside = true;
      if (!press) {
        pointer.move(sessionId, point, { at: event.timeStamp });
        return;
      }
      if (!press.drag && Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRAG_THRESHOLD_PX) {
        // far enough to be a line, which starts where the button went down
        press.drag = true;
        press.drawing = true;
        pointer.move(sessionId, press.point, { stroke: true, at: press.at });
      } else if (press.drag && !press.drawing) {
        press.drawing = true;
      }
      pointer.move(sessionId, point, { stroke: press.drawing, at: event.timeStamp });
    };

    const onMove = (event: PointerEvent) => {
      if (press && event.pointerId !== press.id) return;
      // every sample the mouse made since the last event, not just the last (a quick
      // curve is then a curve) — where the browser offers them
      const samples = event.getCoalescedEvents?.() ?? [];
      if (samples.length === 0) move(event);
      else for (const sample of samples) move(sample);
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      if ((event.target as Element | null)?.closest?.(INTERACTIVE)) return;
      const point = onPicture(event.clientX, event.clientY);
      if (!point) return;
      interrupt(); // (a second press cannot start before the first ended, but be sure)
      inside = true;
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp, point, drag: false, drawing: false };
      pointer.move(sessionId, point, { at: event.timeStamp });
      try {
        host.setPointerCapture(event.pointerId);
      } catch {
        // the press is still followed while the cursor stays over the box
      }
    };

    const onUp = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.id) return;
      const was = press;
      press = null;
      release(was.id);
      if (was.drawing) pointer.endStroke();
      if (!was.drag) pointer.click(sessionId, was.point); // it never moved: a click
      // a finger or a pen that lifts leaves no cursor behind
      if (event.pointerType !== 'mouse') hide();
    };

    const onLeave = () => {
      if (!press) hide();
    };
    const onBlur = () => interrupt();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') interrupt();
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerdown', onDown, { passive: true });
    host.addEventListener('pointerup', onUp, { passive: true });
    host.addEventListener('pointercancel', interrupt, { passive: true });
    host.addEventListener('lostpointercapture', interrupt, { passive: true });
    host.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', interrupt);
      host.removeEventListener('lostpointercapture', interrupt);
      host.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      interrupt();
      host.removeAttribute('data-pointer');
      hide();
    };
  }, [capturing, pointer, sessionId]);

  return (
    <div ref={layerRef} className="cr-pointer-layer" aria-hidden="true" data-testid="pointer-layer">
      <canvas ref={canvasRef} className="cr-pointer-canvas" data-testid="pointer-canvas" />
    </div>
  );
}
