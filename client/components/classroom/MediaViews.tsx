// FILE PATH: client/components/classroom/MediaViews.tsx
//
// Showing and playing Daily's media tracks. A browser plays a MediaStream, so a
// track is wrapped in one — once per track, attached when the track appears and
// let go of when it changes or the tile goes away.

'use client';

import { useEffect, useImperativeHandle, useRef } from 'react';
import type { Ref } from 'react';
import { applySpeaker, useSpeakerId } from '@/lib/classroom/audioOutput';

/** A video track, muted (the sound of a person is played by the audio renderer,
 * once per person, never by each tile). `videoRef`, when given, is handed the
 * `<video>` element — for whatever needs the picture's own size. */
export function VideoView({
  track,
  className,
  videoRef,
}: {
  track: MediaStreamTrack | null;
  className?: string;
  videoRef?: Ref<HTMLVideoElement>;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useImperativeHandle(videoRef, () => ref.current as HTMLVideoElement, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!track) {
      el.srcObject = null;
      return;
    }
    const stream = new MediaStream([track]);
    el.srcObject = stream;
    // Muted video may always autoplay; this only nudges a browser that paused it.
    void el.play().catch(() => undefined);
    return () => {
      if (el.srcObject === stream) el.srcObject = null;
    };
  }, [track]);

  return <video ref={ref} autoPlay playsInline muted className={className} />;
}

/** One remote audio track, playing through the chosen speaker. Not visible. */
export function AudioView({ track }: { track: MediaStreamTrack }) {
  const ref = useRef<HTMLAudioElement>(null);
  const speakerId = useSpeakerId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stream = new MediaStream([track]);
    el.srcObject = stream;
    void el.play().catch(() => undefined);
    return () => {
      if (el.srcObject === stream) el.srcObject = null;
    };
  }, [track]);

  useEffect(() => {
    if (ref.current) void applySpeaker(ref.current, speakerId);
  }, [speakerId, track]);

  return <audio ref={ref} autoPlay />;
}
