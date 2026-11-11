// FILE PATH: client/components/classroom/PointerLayer.tsx
//
// The teacher's Pointer over ONE student's shared screen: the dot that follows
// their cursor, and the rings that pulse where they click. Everyone who can see the
// shared screen sees it; the teacher, with Pointer mode on, also drives it.
//
// Place it inside the box that holds the shared screen's <video> (a tile, or the
// full-window view) — a positioned element. It covers that box and ignores the
// mouse (pointer-events: none), so the buttons and double-click behind and around
// it work exactly as before; it never takes part in a click.
//
// The picture is letterboxed inside its box (object-fit: contain), so positions are
// measured against the PICTURE, not the box: the dot is drawn where the same spot
// is in THIS browser's picture, wherever the teacher's was. While Pointer mode is
// on, the teacher's own mouse movements over the box are listened to from the box
// itself (without stopping them), turned into positions on the picture, and handed
// to `pointer`. A cursor on a letterbox bar is "off the picture": the dot hides.

'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { containedRect, fromNormalized, toNormalized } from '@/lib/classroom/pointer';
import type { Rect, Size } from '@/lib/classroom/pointer';
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

function sameGeometry(a: Geometry, b: Geometry): boolean {
  return (
    a.box.width === b.box.width &&
    a.box.height === b.box.height &&
    a.media.width === b.media.width &&
    a.media.height === b.media.height
  );
}

/** Things a click on is for something else — a button of the tile, a link. */
const INTERACTIVE = 'button, a, input, select, textarea, [data-pointer-ignore]';

export default function PointerLayer({ sessionId, pointer, videoRef, capturing }: PointerLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Geometry>(UNKNOWN);
  const picture: Rect | null = useMemo(() => containedRect(geometry.box, geometry.media), [geometry]);
  // The mouse handlers below read the latest picture when an event arrives.
  const pictureRef = useRef<Rect | null>(null);
  useEffect(() => {
    pictureRef.current = picture;
  }, [picture]);

  const { store } = pointer;
  const shown = useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().byShare[sessionId],
    () => undefined,
  );

  // The size of the box, and of the picture inside it — as they change (the window
  // is resized, the layout shifts, the sharer picks another window to share).
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const video = videoRef.current;
    const measure = () => {
      const next: Geometry = {
        box: { width: layer.clientWidth, height: layer.clientHeight },
        media: { width: videoRef.current?.videoWidth ?? 0, height: videoRef.current?.videoHeight ?? 0 },
      };
      setGeometry((previous) => (sameGeometry(previous, next) ? previous : next));
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(layer);
    video?.addEventListener('loadedmetadata', measure);
    video?.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      video?.removeEventListener('loadedmetadata', measure);
      video?.removeEventListener('resize', measure);
    };
  }, [videoRef]);

  // The teacher's mouse. Listened to on the box that holds the layer, passively and
  // without stopping anything, so the tile's own buttons keep working.
  useEffect(() => {
    if (!capturing) return;
    const layer = layerRef.current;
    const host = layer?.parentElement;
    if (!layer || !host) return;

    host.setAttribute('data-pointer', 'on');
    let inside = false;

    /** Where the cursor is on the picture, or null on a letterbox bar (or before
     * the picture's size is known). */
    const onPicture = (event: PointerEvent) => {
      const current = pictureRef.current;
      if (!current) return null;
      const box = layer.getBoundingClientRect();
      return toNormalized({ x: event.clientX - box.left, y: event.clientY - box.top }, current);
    };
    const leave = () => {
      if (!inside) return;
      inside = false;
      pointer.leave(sessionId);
    };
    const onMove = (event: PointerEvent) => {
      const point = onPicture(event);
      if (point) {
        inside = true;
        pointer.move(sessionId, point);
      } else {
        leave(); // on a letterbox bar
      }
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if ((event.target as Element | null)?.closest?.(INTERACTIVE)) return;
      const point = onPicture(event);
      if (!point) return;
      inside = true;
      pointer.click(sessionId, point);
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerdown', onDown, { passive: true });
    host.addEventListener('pointerleave', leave, { passive: true });
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointerleave', leave);
      host.removeAttribute('data-pointer');
      leave();
    };
  }, [capturing, pointer, sessionId]);

  const dot = picture && shown?.visible ? fromNormalized(shown, picture) : null;

  return (
    <div ref={layerRef} className="cr-pointer-layer" aria-hidden="true" data-testid="pointer-layer">
      {dot && (
        <div
          className="cr-pointer-dot"
          data-testid="pointer-dot"
          style={{ transform: `translate3d(${dot.x}px, ${dot.y}px, 0)` }}
        />
      )}
      {picture &&
        shown?.pulses.map((pulse) => {
          const at = fromNormalized(pulse, picture);
          return (
            <div
              key={pulse.id}
              className="cr-pointer-pulse"
              data-testid="pointer-pulse"
              style={{ left: at.x, top: at.y }}
            />
          );
        })}
    </div>
  );
}
