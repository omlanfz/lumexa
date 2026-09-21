// FILE PATH: client/components/classroom/DeviceMenu.tsx
//
// Secondary device-selection popover attached to the mic/camera controls —
// select microphone/camera, see the current device, and (for mics) test the
// input level live. Gracefully handles no devices being available.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Mic } from 'lucide-react';
import { useMediaDeviceSelect, useRoomContext } from '@livekit/components-react';

interface DeviceMenuProps {
  kind: 'audioinput' | 'videoinput';
  onClose: () => void;
}

/** Live mic input level meter using the Web Audio API — the "test
 * microphone" affordance. Silently does nothing if getUserMedia/AudioContext
 * isn't available. */
function MicTestMeter() {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let ctx: AudioContext | undefined;
    let stream: MediaStream | undefined;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setLevel(Math.min(100, Math.round((avg / 128) * 100)));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // permission denied or unsupported — meter just stays at 0
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-2 mt-1">
      <Mic size={13} className="text-[var(--cr-text-muted)] flex-shrink-0" />
      <div className="flex-1 h-1.5 rounded-full bg-[var(--cr-surface-3)] overflow-hidden">
        <div
          className="h-full bg-[var(--cr-accent)] transition-all duration-75"
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}

/** Speaker (audiooutput) selection — nested inside the microphone popover
 * rather than its own bottom-bar button, matching how most conferencing
 * apps group "audio" settings together. Silently renders nothing if the
 * browser doesn't support output-device selection (Safari/Firefox). */
function SpeakerSection() {
  const room = useRoomContext();
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind: 'audiooutput', room });
  if (devices.length === 0) return null;

  return (
    <div className="border-t border-[var(--cr-border)]">
      <p className="px-3 pt-2 text-[10px] uppercase tracking-wide text-[var(--cr-text-faint)]">Speaker</p>
      <div className="py-1 max-h-32 overflow-y-auto cr-scroll">
        {devices.map((d) => (
          <button
            key={d.deviceId}
            onClick={() => void setActiveMediaDevice(d.deviceId)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors text-left"
          >
            <span className="truncate">{d.label || 'Speaker'}</span>
            {d.deviceId === activeDeviceId && <Check size={14} className="text-[var(--cr-accent)] flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DeviceMenu({ kind, onClose }: DeviceMenuProps) {
  const room = useRoomContext();
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind, room });

  return (
    <div className="w-64 rounded-xl border border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl overflow-hidden cr-fade-in">
      <div className="px-3 py-2 border-b border-[var(--cr-border)]">
        <p className="text-xs font-semibold text-[var(--cr-text-muted)] uppercase tracking-wide">
          {kind === 'audioinput' ? 'Microphone' : 'Camera'}
        </p>
      </div>
      <div className="py-1 max-h-56 overflow-y-auto cr-scroll">
        {devices.length === 0 ? (
          <p className="px-3 py-3 text-xs text-[var(--cr-text-faint)]">No devices found.</p>
        ) : (
          devices.map((d) => (
            <button
              key={d.deviceId}
              onClick={() => {
                void setActiveMediaDevice(d.deviceId);
                onClose();
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors text-left"
            >
              <span className="truncate">{d.label || `${kind === 'audioinput' ? 'Microphone' : 'Camera'}`}</span>
              {d.deviceId === activeDeviceId && <Check size={14} className="text-[var(--cr-accent)] flex-shrink-0" />}
            </button>
          ))
        )}
      </div>
      {kind === 'audioinput' && (
        <>
          <SpeakerSection />
          <div className="border-t border-[var(--cr-border)]">
            <p className="px-3 pt-2 text-[10px] uppercase tracking-wide text-[var(--cr-text-faint)]">Test microphone</p>
            <MicTestMeter />
          </div>
        </>
      )}
    </div>
  );
}
