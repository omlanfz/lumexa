// FILE PATH: client/components/classroom/PreJoinScreen.tsx
//
// The pre-class join screen: camera preview, mic/cam toggles, device
// selection, video effects, session info and a "Join Class" button. Runs
// entirely off local livekit-client tracks — no LiveKit room connection yet.

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createLocalAudioTrack,
  createLocalVideoTrack,
  LocalAudioTrack,
  LocalVideoTrack,
} from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, Wand2, ChevronDown, AlertCircle } from 'lucide-react';
import IconButton from './IconButton';
import VideoEffectsPanel from './VideoEffectsPanel';
import { useVideoEffects } from '@/lib/classroom/useVideoEffects';
import type { BackgroundEffect } from '@/lib/classroom/backgrounds';
import type { AppearanceOptions } from '@/lib/classroom/appearanceProcessor';

export interface JoinChoices {
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
  backgroundEffect: BackgroundEffect;
  lighting: AppearanceOptions;
}

interface PreJoinScreenProps {
  sessionTitle: string;
  sessionSubtitle?: string;
  isLive: boolean;
  roleLabel: string;
  onJoin: (choices: JoinChoices) => void;
}

export default function PreJoinScreen({
  sessionTitle,
  sessionSubtitle,
  isLive,
  roleLabel,
  onJoin,
}: PreJoinScreenProps) {
  const videoElRef = useRef<HTMLVideoElement>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDeviceId, setAudioDeviceId] = useState<string>('');
  const [videoDeviceId, setVideoDeviceId] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const effects = useVideoEffects();

  // Acquire preview tracks once on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const vTrack = await createLocalVideoTrack();
        if (cancelled) {
          vTrack.stop();
          return;
        }
        videoTrackRef.current = vTrack;
        if (videoElRef.current) vTrack.attach(videoElRef.current);
      } catch {
        if (!cancelled) setPermissionError('Camera unavailable — check your browser permissions.');
      }

      try {
        const aTrack = await createLocalAudioTrack();
        if (cancelled) {
          aTrack.stop();
          return;
        }
        audioTrackRef.current = aTrack;
      } catch {
        if (!cancelled) setPermissionError((prev) => prev ?? 'Microphone unavailable — check your browser permissions.');
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        setAudioDeviceId(audioTrackRef.current?.mediaStreamTrack.getSettings().deviceId ?? '');
        setVideoDeviceId(videoTrackRef.current?.mediaStreamTrack.getSettings().deviceId ?? '');
      } catch {
        // enumerateDevices without permission just returns unlabeled entries — non-fatal
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      videoTrackRef.current?.stop();
      audioTrackRef.current?.stop();
    };
  }, []);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    if (audioTrackRef.current) audioTrackRef.current.mediaStreamTrack.enabled = next;
  };

  const toggleVideo = () => {
    const next = !videoEnabled;
    setVideoEnabled(next);
    if (videoTrackRef.current) {
      if (next && videoElRef.current) videoTrackRef.current.attach(videoElRef.current);
      else if (!next) videoTrackRef.current.detach();
      videoTrackRef.current.mediaStreamTrack.enabled = next;
    }
  };

  const switchAudioDevice = async (deviceId: string) => {
    setAudioDeviceId(deviceId);
    try {
      if (audioTrackRef.current) {
        await audioTrackRef.current.setDeviceId(deviceId);
      } else {
        audioTrackRef.current = await createLocalAudioTrack({ deviceId });
      }
    } catch {
      setPermissionError('Could not switch microphone.');
    }
  };

  const switchVideoDevice = async (deviceId: string) => {
    setVideoDeviceId(deviceId);
    try {
      if (videoTrackRef.current) {
        await videoTrackRef.current.setDeviceId(deviceId);
      } else {
        videoTrackRef.current = await createLocalVideoTrack({ deviceId });
        if (videoElRef.current) videoTrackRef.current.attach(videoElRef.current);
      }
      effects.reapply(videoTrackRef.current);
    } catch {
      setPermissionError('Could not switch camera.');
    }
  };

  const handleUploadImage = (file: File) => {
    const url = URL.createObjectURL(file);
    void effects.setBackground(videoTrackRef.current, { mode: 'image', imagePath: url, label: 'Custom' });
  };

  const handleJoin = () => {
    videoTrackRef.current?.detach();
    videoTrackRef.current?.stop();
    audioTrackRef.current?.stop();
    onJoin({
      audioEnabled,
      videoEnabled,
      audioDeviceId: audioDeviceId || undefined,
      videoDeviceId: videoDeviceId || undefined,
      backgroundEffect: effects.backgroundEffect,
      lighting: effects.lighting,
    });
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
          <video
            ref={videoElRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover rounded-2xl -scale-x-100 ${videoEnabled ? '' : 'hidden'}`}
          />
          {!videoEnabled && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-2 text-[var(--cr-text-muted)] bg-[var(--cr-surface)]">
              <div className="w-16 h-16 rounded-full bg-[var(--cr-surface-2)] flex items-center justify-center">
                <VideoOff size={26} />
              </div>
              <p className="text-sm">Camera is off</p>
            </div>
          )}

          {permissionError && (
            <div className="absolute top-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
              <AlertCircle size={14} className="flex-shrink-0" />
              {permissionError}
            </div>
          )}

          {/* Controls overlay */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2.5">
            <IconButton icon={audioEnabled ? Mic : MicOff} label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'} onClick={toggleAudio} off={!audioEnabled} />
            <IconButton icon={videoEnabled ? Video : VideoOff} label={videoEnabled ? 'Turn off camera' : 'Turn on camera'} onClick={toggleVideo} off={!videoEnabled} />
            <div className="relative">
              <IconButton icon={Wand2} label="Video effects" onClick={() => setEffectsOpen((v) => !v)} active={effectsOpen} />
              {effectsOpen && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[var(--cr-surface)] border border-[var(--cr-border)] rounded-xl shadow-2xl p-4 cr-fade-in z-20">
                  <VideoEffectsPanel
                    backgroundEffect={effects.backgroundEffect}
                    onBackgroundChange={(e) => void effects.setBackground(videoTrackRef.current, e)}
                    lighting={effects.lighting}
                    onLightingChange={(l) => void effects.setLighting(videoTrackRef.current, l)}
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
              devices={videoDevices}
              value={videoDeviceId}
              onChange={switchVideoDevice}
              placeholder="Camera"
            />
            <DeviceSelect
              devices={audioDevices}
              value={audioDeviceId}
              onChange={switchAudioDevice}
              placeholder="Microphone"
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
            onClick={handleJoin}
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
  devices,
  value,
  onChange,
  placeholder,
}: {
  devices: MediaDeviceInfo[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  if (devices.length === 0) return null;
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-white text-[11px] max-w-[150px] truncate cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--cr-accent)]"
      >
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId} className="bg-[var(--cr-surface)]">
            {d.label || placeholder}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
    </div>
  );
}
