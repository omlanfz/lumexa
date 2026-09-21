// FILE PATH: client/components/classroom/ScreenShareFullscreenChrome.tsx
//
// Rendered as CHILDREN of a screen-share tile's own fullscreen target (see
// the per-tile ⛶ button in Stage.tsx) — never as a separate page-level
// overlay. The browser's Fullscreen API only paints the fullscreened
// element and its descendants, so mounting these here is what makes them
// show up while everything else (header, rail, bottom bar) is naturally
// hidden by the browser, with zero extra layout-hiding logic needed.
//
//   - FloatingParticipants: a small draggable window with participant
//     camera tiles ("PIP"), resizable between three preset sizes,
//     collapsible down to a single "Show participants" pill. Deliberately
//     NOT a full per-tile PiP system — just enough to see faces without
//     losing the shared screen.
//   - FloatingControlBar: Mic / Camera / Share / Record / Exit fullscreen —
//     appears on mouse movement, auto-hides after a few seconds of
//     stillness so it never competes with the shared content.

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Circle,
  Square,
  Loader2,
  Users,
  Minimize2,
  GripHorizontal,
  ChevronDown,
} from 'lucide-react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import ParticipantTile from './ParticipantTile';
import IconButton from './IconButton';
import type { RecordingUiState } from './ControlBar';

type PresetSize = 'sm' | 'md' | 'lg';

const PRESET_DIMENSIONS: Record<PresetSize, { width: number; tile: number }> = {
  sm: { width: 176, tile: 72 },
  md: { width: 240, tile: 96 },
  lg: { width: 320, tile: 128 },
};

const AUTO_HIDE_MS = 3000;

function FloatingParticipants({
  tracks,
  raisedHands,
}: {
  tracks: TrackReferenceOrPlaceholder[];
  raisedHands: Record<string, boolean>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [size, setSize] = useState<PresetSize>('md');
  // null = never dragged — render corner-anchored via CSS (right/bottom),
  // which is always correct regardless of the box's actual rendered width
  // (collapsed pill vs. expanded box are different widths). Only switch to
  // an explicit pixel `left/top` once the user actually drags it, using
  // the box's real measured size at that moment so it's still fully
  // clamped inside the viewport — this is what fixes the collapsed pill
  // previously overflowing off the right edge on mount.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const boxRef = useRef<HTMLElement>(null);

  const clamp = (x: number, y: number) => {
    const el = boxRef.current;
    const w = el?.offsetWidth ?? PRESET_DIMENSIONS[size].width;
    const h = el?.offsetHeight ?? 120;
    return {
      x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - w)),
      y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - h)),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = boxRef.current?.getBoundingClientRect();
    const origin = pos ?? { x: rect?.left ?? 0, y: rect?.top ?? 0 };
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: origin.x, originY: origin.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clamp(dragRef.current.originX + dx, dragRef.current.originY + dy));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const positionStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: 24, bottom: 92 }; // clear of the floating control bar below

  if (collapsed) {
    return (
      <button
        ref={boxRef as React.RefObject<HTMLButtonElement>}
        onClick={() => setCollapsed(false)}
        type="button"
        style={positionStyle}
        className="fixed z-[70] flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/70 hover:bg-black/85 backdrop-blur text-white text-xs font-medium shadow-xl transition-colors cr-fade-in whitespace-nowrap"
      >
        <Users size={14} /> Show participants
      </button>
    );
  }

  const dims = PRESET_DIMENSIONS[size];

  return (
    <div
      ref={boxRef as React.RefObject<HTMLDivElement>}
      style={{ ...positionStyle, width: dims.width }}
      className="fixed z-[70] rounded-xl overflow-hidden bg-black/70 backdrop-blur border border-white/10 shadow-2xl cr-fade-in"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex items-center justify-between gap-1 px-2 h-8 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <span className="flex items-center gap-1 text-white/60">
          <GripHorizontal size={13} />
          <span className="text-[11px] font-medium text-white/80">Participants</span>
        </span>
        <div className="flex items-center gap-0.5">
          {(['sm', 'md', 'lg'] as PresetSize[]).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              data-tooltip={`${s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : 'Large'}`}
              className={`w-4 h-4 rounded-full border ${
                size === s ? 'bg-white border-white' : 'border-white/40'
              }`}
            />
          ))}
          <button
            onClick={() => setCollapsed(true)}
            data-tooltip="Collapse"
            className="w-6 h-6 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 ml-1"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      <div className="p-1.5 flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto cr-scroll">
        {tracks.map((t) => (
          <div key={t.participant.identity} style={{ height: dims.tile }} className="flex-shrink-0">
            <ParticipantTile trackRef={t} size="strip" raised={!!raisedHands[t.participant.identity]} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface FloatingControlBarProps {
  visible: boolean;
  isTeacher: boolean;
  micEnabled: boolean;
  camEnabled: boolean;
  screenShareEnabled: boolean;
  micDisabledByTeacher?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  recordingState: RecordingUiState;
  onToggleRecording: () => void;
  onExit: () => void;
}

function FloatingControlBar({
  visible,
  isTeacher,
  micEnabled,
  camEnabled,
  screenShareEnabled,
  micDisabledByTeacher,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  recordingState,
  onToggleRecording,
  onExit,
}: FloatingControlBarProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-black/70 backdrop-blur border border-white/10 shadow-2xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <IconButton
        icon={micEnabled ? Mic : MicOff}
        label={micDisabledByTeacher ? 'Muted by teacher' : micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        onClick={onToggleMic}
        off={!micEnabled}
        disabled={micDisabledByTeacher}
        size="sm"
        tooltipPos="top"
      />
      <IconButton
        icon={camEnabled ? Video : VideoOff}
        label={camEnabled ? 'Turn off camera' : 'Turn on camera'}
        onClick={onToggleCam}
        off={!camEnabled}
        size="sm"
      />
      <IconButton
        icon={screenShareEnabled ? ScreenShareOff : ScreenShare}
        label={screenShareEnabled ? 'Stop sharing' : 'Share screen'}
        onClick={onToggleScreenShare}
        active={screenShareEnabled}
        size="sm"
      />
      {isTeacher && (
        <IconButton
          icon={recordingState === 'active' ? Square : recordingState === 'starting' || recordingState === 'stopping' ? Loader2 : Circle}
          label={
            recordingState === 'active'
              ? 'Stop recording'
              : recordingState === 'starting'
                ? 'Starting recording…'
                : recordingState === 'stopping'
                  ? 'Stopping recording…'
                  : 'Record class'
          }
          onClick={onToggleRecording}
          disabled={recordingState === 'starting' || recordingState === 'stopping'}
          size="sm"
          className={
            recordingState === 'active'
              ? 'text-red-500 animate-pulse'
              : recordingState === 'starting' || recordingState === 'stopping'
                ? '[&_svg]:animate-spin'
                : ''
          }
        />
      )}
      <div className="w-px h-6 bg-white/15 mx-0.5" />
      <IconButton icon={Minimize2} label="Exit fullscreen" onClick={onExit} size="sm" tooltipPos="top" />
    </div>
  );
}

interface ScreenShareFullscreenChromeProps {
  cameraTracks: TrackReferenceOrPlaceholder[];
  raisedHands: Record<string, boolean>;
  isTeacher: boolean;

  micEnabled: boolean;
  camEnabled: boolean;
  screenShareEnabled: boolean;
  micDisabledByTeacher?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;

  recordingState: RecordingUiState;
  onToggleRecording: () => void;

  onExit: () => void;
}

export default function ScreenShareFullscreenChrome({
  cameraTracks,
  raisedHands,
  isTeacher,
  micEnabled,
  camEnabled,
  screenShareEnabled,
  micDisabledByTeacher,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  recordingState,
  onToggleRecording,
  onExit,
}: ScreenShareFullscreenChromeProps) {
  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpChrome = () => {
    setChromeVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setChromeVisible(false), AUTO_HIDE_MS);
  };

  // chromeVisible starts true — this just arms the auto-hide timer so it
  // fades a few seconds after mount if nothing moves.
  useEffect(() => {
    hideTimerRef.current = setTimeout(() => setChromeVisible(false), AUTO_HIDE_MS);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    // Covers the fullscreened tile so mouse movement anywhere over the
    // shared screen counts as activity, without intercepting clicks (the
    // video itself is a sibling underneath, not inside this layer).
    <div
      className="absolute inset-0 z-[65]"
      onMouseMove={bumpChrome}
      onPointerDown={bumpChrome}
      onTouchStart={bumpChrome}
    >
      <FloatingParticipants tracks={cameraTracks} raisedHands={raisedHands} />

      <FloatingControlBar
        visible={chromeVisible}
        isTeacher={isTeacher}
        micEnabled={micEnabled}
        camEnabled={camEnabled}
        screenShareEnabled={screenShareEnabled}
        micDisabledByTeacher={micDisabledByTeacher}
        onToggleMic={onToggleMic}
        onToggleCam={onToggleCam}
        onToggleScreenShare={onToggleScreenShare}
        recordingState={recordingState}
        onToggleRecording={onToggleRecording}
        onExit={onExit}
      />
    </div>
  );
}
