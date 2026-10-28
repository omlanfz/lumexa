// FILE PATH: client/components/classroom/PreJoinScreen.tsx
//
// The pre-class join screen: camera preview, mic/cam toggles, device
// selection, video effects, session info and a "Join Class" button. The preview
// is the Daily call's own camera (startCamera) — the same camera, microphone and
// effects the class then uses, so nothing is switched on again when joining — and
// nothing is connected to the classroom yet.

'use client';

import { useEffect, useState } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { Mic, MicOff, Video, VideoOff, Wand2, ChevronDown, AlertCircle } from 'lucide-react';
import IconButton from './IconButton';
import VideoEffectsPanel from './VideoEffectsPanel';
import { VideoView } from './MediaViews';
import { useVideoEffects } from '@/lib/classroom/useVideoEffects';
import { useDevices } from '@/lib/classroom/useDevices';
import { deviceLabel } from '@/lib/classroom/daily/devices';
import type { DeviceKind, DeviceLike } from '@/lib/classroom/daily/devices';
import { describeCameraError } from '@/lib/classroom/daily/errors';
import { reconcilePeers, toPeers } from '@/lib/classroom/daily/peers';
import type { Peer } from '@/lib/classroom/daily/peers';

/** What the person chose here. Their camera, microphone and effects are already
 * on the call; this says only whether to join with the camera and microphone on. */
export interface JoinChoices {
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface PreJoinScreenProps {
  call: DailyCall;
  sessionTitle: string;
  sessionSubtitle?: string;
  isLive: boolean;
  roleLabel: string;
  onJoin: (choices: JoinChoices) => void;
}

/** The call's own camera and microphone, from the moment they are started. */
function usePreview(call: DailyCall) {
  const [local, setLocal] = useState<Peer | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const read = () => {
      if (cancelled) return;
      try {
        const mine = toPeers(call.participants()).find((p) => p.isLocal) ?? null;
        setLocal((previous) => (mine ? reconcilePeers(previous ? [previous] : [], [mine])[0] : null));
      } catch {
        // the call object is going away
      }
    };
    const onCameraError = (e?: { error?: { type?: string; blockedMedia?: ('video' | 'audio')[]; missingMedia?: ('video' | 'audio')[]; failedMedia?: ('video' | 'audio')[] } }) => {
      const media = e?.error?.blockedMedia ?? e?.error?.missingMedia ?? e?.error?.failedMedia;
      if (!cancelled) setProblem(describeCameraError(e?.error, media));
      read();
    };
    const events = ['started-camera', 'participant-updated', 'track-started', 'track-stopped', 'selected-devices-updated', 'input-settings-updated'] as const;
    for (const event of events) call.on(event, read);
    call.on('camera-error', onCameraError);

    const done = () => {
      if (cancelled) return;
      setReady(true);
      read();
    };
    call.startCamera().then(done, done);
    read();

    return () => {
      cancelled = true;
      for (const event of events) call.off(event, read);
      call.off('camera-error', onCameraError);
    };
  }, [call]);

  return { local, problem, ready };
}

export default function PreJoinScreen({
  call,
  sessionTitle,
  sessionSubtitle,
  isLive,
  roleLabel,
  onJoin,
}: PreJoinScreenProps) {
  const [effectsOpen, setEffectsOpen] = useState(false);
  const { local, problem, ready } = usePreview(call);
  const effects = useVideoEffects(call);
  const cameras = useDevices(call, 'videoinput');
  const microphones = useDevices(call, 'audioinput');

  const audioEnabled = !!local?.audio.on;
  const videoEnabled = !!local?.video.on;
  const previewTrack = videoEnabled ? local?.video.track ?? null : null;

  const handleUploadImage = (file: File) => {
    const url = URL.createObjectURL(file);
    void effects.setBackground({ mode: 'image', imagePath: url, label: 'Custom' });
  };

  return (
    <div className="cr-root min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid md:grid-cols-[1.3fr_1fr] gap-6 items-center">
        {/* Camera preview — deliberately NOT overflow-hidden: the video
            effects popover below needs to extend above this box without
            being clipped, so the rounded corners are applied directly to
            the video/placeholder elements instead of via a clipping
            ancestor. */}
        <div className="relative aspect-video rounded-2xl bg-[var(--cr-surface)] border border-[var(--cr-border)]">
          <VideoView
            track={previewTrack}
            className={`w-full h-full object-cover rounded-2xl -scale-x-100 ${videoEnabled && previewTrack ? '' : 'hidden'}`}
          />
          {!(videoEnabled && previewTrack) && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-2 text-[var(--cr-text-muted)] bg-[var(--cr-surface)]">
              <div className="w-16 h-16 rounded-full bg-[var(--cr-surface-2)] flex items-center justify-center">
                <VideoOff size={26} />
              </div>
              <p className="text-sm">Camera is off</p>
            </div>
          )}

          {problem && (
            <div
              className="absolute top-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs"
              data-testid="prejoin-problem"
            >
              <AlertCircle size={14} className="flex-shrink-0" />
              {problem}
            </div>
          )}

          {/* Controls overlay */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2.5">
            <IconButton
              icon={audioEnabled ? Mic : MicOff}
              label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              onClick={() => call.setLocalAudio(!audioEnabled)}
              off={!audioEnabled}
            />
            <IconButton
              icon={videoEnabled ? Video : VideoOff}
              label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              onClick={() => call.setLocalVideo(!videoEnabled)}
              off={!videoEnabled}
            />
            <div className="relative">
              <IconButton icon={Wand2} label="Video effects" onClick={() => setEffectsOpen((v) => !v)} active={effectsOpen} />
              {effectsOpen && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[var(--cr-surface)] border border-[var(--cr-border)] rounded-xl shadow-2xl p-4 cr-fade-in z-20">
                  <VideoEffectsPanel
                    backgroundEffect={effects.backgroundEffect}
                    onBackgroundChange={(e) => void effects.setBackground(e)}
                    lighting={effects.lighting}
                    onLightingChange={(l) => void effects.setLighting(l)}
                    supported={effects.supported}
                    pending={effects.pending}
                    onUploadImage={handleUploadImage}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Device selects */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
            <DeviceSelect
              kind="videoinput"
              devices={cameras.devices}
              value={cameras.activeDeviceId}
              onChange={cameras.select}
            />
            <DeviceSelect
              kind="audioinput"
              devices={microphones.devices}
              value={microphones.activeDeviceId}
              onChange={microphones.select}
            />
          </div>
        </div>

        {/* Session info + join */}
        <div className="cr-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo-mark.png" alt="" className="w-7 h-7 rounded-lg" />
            <span className="text-sm font-semibold text-[var(--cr-text)]">Lumexa AI School</span>
          </div>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 mb-2 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full cr-live-dot" /> Live
            </span>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--cr-text)] mb-1">{sessionTitle}</h1>
          {sessionSubtitle && <p className="text-sm text-[var(--cr-text-muted)] mb-4">{sessionSubtitle}</p>}

          <div className="mb-6 px-3 py-2 rounded-lg bg-[var(--cr-surface-2)] border border-[var(--cr-border)] inline-block text-xs text-[var(--cr-text-muted)]">
            Joining as <span className="text-[var(--cr-text)] font-medium">{roleLabel}</span>
          </div>

          <button
            onClick={() => onJoin({ audioEnabled, videoEnabled })}
            disabled={!ready}
            className="w-full py-3.5 rounded-xl font-semibold bg-[var(--cr-accent)] hover:brightness-110 text-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ready ? 'Join Class' : 'Preparing…'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeviceSelect({
  kind,
  devices,
  value,
  onChange,
}: {
  kind: DeviceKind;
  devices: DeviceLike[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (devices.length === 0) return null;
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={kind === 'videoinput' ? 'Camera' : 'Microphone'}
        className="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-white text-[11px] max-w-[150px] truncate cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--cr-accent)]"
      >
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId} className="bg-[var(--cr-surface)]">
            {deviceLabel(d, kind)}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
    </div>
  );
}
