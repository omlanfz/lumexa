// FILE PATH: client/lib/classroom/recording/useClassRecorder.ts
//
// The teacher's Record button, as a hook: starts and stops a ClassRecorder in
// this browser, keeps the finished recordings in the store (store.ts) until they
// are uploaded, and tells the server about the start and the stop.
//
// It deliberately re-renders its component only when the recording STATE changes
// (idle → recording → stopping…), never as time passes or as an upload's progress
// ticks: the classroom is a big component. The elapsed time and the upload
// progress belong to the small components that show them (RecordingTray).

'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { RoomEvent } from 'livekit-client';
import type { Room } from 'livekit-client';
import { CaptureCancelled, captureErrorMessage, recordingSupport } from './capture.ts';
import type { CaptureSurface, RecordingSupport } from './capture.ts';
import { ClassRecorder } from './ClassRecorder.ts';
import type { RecorderOutcome, StopReason } from './ClassRecorder.ts';
import { formatMinutes } from './format.ts';
import { newSegmentId } from './ids.ts';
import { recordingStore } from './store.ts';
import {
  discardRecordingSegment,
  recordingErrorMessage,
  startRecordingSegment,
  stopRecordingSegment,
} from './api.ts';

export type RecorderState = 'idle' | 'starting' | 'recording' | 'stopping';

/** Used until the server answers with its own (which is within a second or two). */
const DEFAULT_MAX_DURATION_MS = 70 * 60_000;
const DEFAULT_MAX_BYTES = 1_900_000_000;

/** What changes in a room that changes who the class can hear. */
const AUDIO_EVENTS = [
  RoomEvent.TrackSubscribed,
  RoomEvent.TrackUnsubscribed,
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
];

interface EventfulRoom {
  on(event: string, callback: () => void): unknown;
  off(event: string, callback: () => void): unknown;
}

interface ActiveRecording {
  id: string;
  recorder: ClassRecorder;
  /** Resolves once the server knows about the recording (false: it refused). */
  registered: Promise<boolean>;
}

/** Why a recording stopped by itself, for the teacher. null: they stopped it. */
export function stopNotice(reason: StopReason, maxMinutes: number): string | null {
  switch (reason) {
    case 'time-limit':
      return `Recording stopped by itself after ${formatMinutes(maxMinutes)}, the longest one part can be. It is saved — press Record to start the next part.`;
    case 'size-limit':
      return 'Recording stopped by itself because the file reached its size limit. It is saved — press Record to carry on in a new part.';
    case 'share-ended':
      return 'Recording stopped because screen sharing was stopped. It is saved on this computer.';
    case 'room-ended':
      return 'The class ended while recording. It is saved on this computer — upload it so students can watch.';
    case 'error':
      return 'Recording stopped because of a problem. What was recorded so far is saved.';
    default:
      return null;
  }
}

export interface ClassRecorderControls {
  /** Whether this browser can record (and if not, why). */
  support: RecordingSupport;
  state: RecorderState;
  /** The running recorder, for the timer; null when not recording. */
  recorder: ClassRecorder | null;
  surface: CaptureSurface | null;
  /** Something went wrong; shown until dismissed or the next start. */
  error: string | null;
  /** Something to know (a recording stopped by itself; storage not set up yet). */
  notice: string | null;
  /** How many of this class's recordings are being recorded or not yet uploaded. */
  pending: number;
  start: () => void;
  stop: () => Promise<void>;
  /** Stops a running recording and waits until its file is ready (before the
   * class is ended). Does nothing when not recording. */
  stopIfRecording: () => Promise<void>;
  dismiss: () => void;
}

export function useClassRecorder(opts: {
  room: Room;
  roomName: string;
  /** False for students, observers and trial classes: nothing is offered. */
  enabled: boolean;
}): ClassRecorderControls {
  const { room, roomName, enabled } = opts;
  const [state, setStateValue] = useState<RecorderState>('idle');
  const stateRef = useRef<RecorderState>('idle');
  const [recorder, setRecorder] = useState<ClassRecorder | null>(null);
  const [surface, setSurface] = useState<CaptureSurface | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const activeRef = useRef<ActiveRecording | null>(null);
  const maxMinutesRef = useRef(DEFAULT_MAX_DURATION_MS / 60_000);

  const setState = useCallback((next: RecorderState) => {
    stateRef.current = next;
    setStateValue(next);
  }, []);

  const pending = useSyncExternalStore(
    recordingStore.subscribe,
    () => recordingStore.unfinishedCount(roomName),
    () => 0,
  );

  // The recorder has ended — for whatever reason — and its file is ready.
  const handleFinished = useCallback(
    (id: string, outcome: RecorderOutcome) => {
      const active = activeRef.current?.id === id ? activeRef.current : null;
      if (active) activeRef.current = null;
      setRecorder(null);
      setSurface(null);
      setState('idle');

      if (!outcome.ok) {
        recordingStore.remove(id);
        void discardRecordingSegment(roomName, id).catch(() => undefined);
        setError(outcome.message);
        return;
      }
      const { segment } = outcome;
      recordingStore.patch(id, {
        phase: 'saved',
        stage: 'idle',
        blob: segment.blob,
        sizeBytes: segment.blob.size,
        durationMs: segment.durationMs,
        seekable: segment.seekable,
        stopReason: segment.reason,
        surface: segment.surface,
        progress: 0,
        error: null,
      });
      setNotice(stopNotice(segment.reason, maxMinutesRef.current));
      // Tell the server it stopped. If this fails the upload step moves the
      // recording on anyway, so it is not worth bothering the teacher about.
      void (async () => {
        await active?.registered;
        await stopRecordingSegment(roomName, id, {
          durationMs: segment.durationMs,
          mimeType: segment.mimeType,
        }).catch(() => undefined);
      })();
    },
    [roomName, setState],
  );

  const start = useCallback(() => {
    if (!enabled || stateRef.current !== 'idle') return;
    const support = recordingSupport();
    if (!support.supported) {
      setError(support.reason ?? 'Recording is not available in this browser.');
      return;
    }
    const id = newSegmentId();
    setError(null);
    setNotice(null);
    setState('starting');

    // This is the teacher's click: the browser's "choose what to share" box (and
    // the audio engine) may only start from it, so it is called right here.
    const starting = ClassRecorder.start({
      room,
      maxDurationMs: DEFAULT_MAX_DURATION_MS,
      maxBytes: DEFAULT_MAX_BYTES,
      onFinished: (outcome) => handleFinished(id, outcome),
    });

    void (async () => {
      let started: ClassRecorder;
      try {
        started = await starting;
      } catch (err) {
        setState('idle');
        // Dismissing the box is a choice, not a failure: say so quietly.
        if (err instanceof CaptureCancelled) setNotice(err.message);
        else setError(captureErrorMessage(err));
        return;
      }

      recordingStore.add({
        id,
        room: roomName,
        part: recordingStore.nextPart(roomName),
        phase: 'recording',
        stage: 'idle',
        startedAt: Date.now(),
        durationMs: 0,
        sizeBytes: 0,
        blob: null,
        progress: 0,
        error: null,
        attempts: 0,
        inStorage: false,
        seekable: false,
        stopReason: null,
        surface: started.surface,
      });

      // Tell the server (it learns who is recording which class, and tells us
      // the limits). Recording is already running meanwhile.
      const registered = (async () => {
        try {
          const response = await startRecordingSegment(roomName, id);
          maxMinutesRef.current = response.maxDurationMinutes;
          started.setLimits(response.maxDurationMinutes * 60_000, response.maxSegmentBytes);
          if (!response.storage.configured) {
            setNotice(
              'Recording works, but uploads are not set up on the server yet (storage settings are missing), so this recording cannot be uploaded until an admin adds them. Keep this tab open.',
            );
          }
          return true;
        } catch (err) {
          // The server refused (not this class's teacher, a trial…): nothing to keep.
          activeRef.current = null;
          setRecorder(null);
          setSurface(null);
          recordingStore.remove(id);
          setState('idle');
          setError(recordingErrorMessage(err, 'Recording could not be started. Please try again.'));
          await started.discard();
          return false;
        }
      })();

      activeRef.current = { id, recorder: started, registered };
      setRecorder(started);
      setSurface(started.surface);
      setState('recording');
    })();
  }, [enabled, handleFinished, room, roomName, setState]);

  const stop = useCallback(async () => {
    const active = activeRef.current;
    if (!active || stateRef.current === 'stopping') return;
    setState('stopping');
    await active.recorder.stop('user');
  }, [setState]);

  const stopIfRecording = useCallback(async () => {
    const active = activeRef.current;
    if (active) await active.recorder.stop('user');
  }, []);

  // Whenever the class's audio changes, re-read it into the recording.
  useEffect(() => {
    if (!enabled) return;
    const live = room as unknown as EventfulRoom;
    const resync = () => activeRef.current?.recorder.syncAudio();
    const left = () => void activeRef.current?.recorder.stop('room-ended');
    AUDIO_EVENTS.forEach((event) => live.on(event, resync));
    live.on(RoomEvent.Disconnected, left);
    return () => {
      AUDIO_EVENTS.forEach((event) => live.off(event, resync));
      live.off(RoomEvent.Disconnected, left);
    };
  }, [room, enabled]);

  // Leaving the classroom page while recording ends the recording — its file is
  // kept (in the store) so it can still be uploaded.
  useEffect(
    () => () => {
      void activeRef.current?.recorder.stop('room-ended');
    },
    [],
  );

  const dismiss = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  return {
    support: enabled ? recordingSupport() : { supported: false },
    state,
    recorder,
    surface,
    error,
    notice,
    pending,
    start,
    stop,
    stopIfRecording,
    dismiss,
  };
}
