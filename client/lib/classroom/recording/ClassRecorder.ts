// FILE PATH: client/lib/classroom/recording/ClassRecorder.ts
//
// Records a class in the teacher's browser: the video of the window they chose
// to share, plus the class's audio (classAudio.ts) mixed from the same LiveKit
// tracks the classroom plays, written as a WebM file that is finished (a length
// and a jump index, webm.ts) so students can scrub through it.
//
// It never touches the server and holds no credentials: it hands back a Blob.
// Uploading is somebody else's job (upload.ts).
//
// ─── Stopping ────────────────────────────────────────────────────────────────
// A recording ends for exactly one of these reasons, and the outcome says which
// so the teacher is told why a recording stopped by itself:
//   user          the teacher pressed Stop
//   time-limit    it reached the longest a part may be (the server's setting)
//   size-limit    it reached the largest a part may be (the file must stay
//                 uploadable)
//   share-ended   the teacher used the browser's own "Stop sharing" button
//   room-ended    the class closed, or the teacher left, while it was recording
//   error         the recorder itself failed — whatever was recorded is kept

import { ClassAudioMixer, collectClassAudioTracks } from './classAudio.ts';
import type { ClassAudioSource } from './classAudio.ts';
import {
  AUDIO_BITS_PER_SECOND,
  VIDEO_BITS_PER_SECOND,
  pickRecorderMimeType,
  requestScreenCapture,
} from './capture.ts';
import type { CaptureSurface } from './capture.ts';
import { finalizeWebm } from './webm.ts';

export type StopReason =
  | 'user'
  | 'time-limit'
  | 'size-limit'
  | 'share-ended'
  | 'room-ended'
  | 'error';

export interface RecordedSegment {
  blob: Blob;
  durationMs: number;
  /** What the recorder produced, e.g. video/webm;codecs=vp8,opus. */
  mimeType: string;
  surface: CaptureSurface;
  reason: StopReason;
  /** The file has a length and a jump index. */
  seekable: boolean;
}

export type RecorderOutcome =
  | { ok: true; segment: RecordedSegment }
  | { ok: false; reason: StopReason; message: string };

export interface ClassRecorderOptions {
  /** The LiveKit room whose audio is recorded. */
  room: ClassAudioSource;
  maxDurationMs: number;
  maxBytes: number;
  /** Called once, when the recording has ended and its file is ready. */
  onFinished: (outcome: RecorderOutcome) => void;
}

/** MediaRecorder hands over what it has this often, so the browser never holds
 * the recording as one giant buffer. */
const TIMESLICE_MS = 2_000;
/** The mix is re-read from the room this often (as well as when it changes). */
const TICK_MS = 1_000;
/** Room left for the finished file's few extra bytes under the size limit. */
const SIZE_HEADROOM_BYTES = 8 * 1024 * 1024;

export class ClassRecorder {
  readonly surface: CaptureSurface;
  readonly mimeType: string;

  private readonly options: ClassRecorderOptions;
  private readonly recorder: MediaRecorder;
  private readonly mixer: ClassAudioMixer;
  private readonly capture: MediaStream;
  private readonly videoTrack: MediaStreamTrack;
  private readonly chunks: Blob[] = [];
  private readonly startedAt = performance.now();
  private readonly timer: ReturnType<typeof setInterval>;
  private maxDurationMs: number;
  private maxBytes: number;
  private recordedBytes = 0;
  private endedAtMs: number | null = null;
  private finishing: Promise<RecorderOutcome> | null = null;
  private reason: StopReason = 'user';
  private failure: string | null = null;
  private discarded = false;

  private constructor(
    options: ClassRecorderOptions,
    parts: {
      recorder: MediaRecorder;
      mixer: ClassAudioMixer;
      capture: MediaStream;
      videoTrack: MediaStreamTrack;
      surface: CaptureSurface;
      mimeType: string;
    },
  ) {
    this.options = options;
    this.recorder = parts.recorder;
    this.mixer = parts.mixer;
    this.capture = parts.capture;
    this.videoTrack = parts.videoTrack;
    this.surface = parts.surface;
    this.mimeType = parts.mimeType;
    this.maxDurationMs = options.maxDurationMs;
    this.maxBytes = options.maxBytes;

    this.recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return;
      this.chunks.push(e.data);
      this.recordedBytes += e.data.size;
      if (this.recordedBytes >= this.maxBytes - SIZE_HEADROOM_BYTES) {
        void this.stop('size-limit');
      }
    };
    this.recorder.onerror = (e) => {
      const err = (e as unknown as { error?: { message?: string } }).error;
      this.failure = err?.message ?? 'The recorder failed.';
      void this.stop('error');
    };
    // The browser's own "Stop sharing" button ends the video track.
    this.videoTrack.addEventListener('ended', () => void this.stop('share-ended'));

    // Start recording first: if the browser refuses, nothing has been left running.
    this.recorder.start(TIMESLICE_MS);
    this.timer = setInterval(() => {
      this.syncAudio();
      if (this.elapsedMs() >= this.maxDurationMs) void this.stop('time-limit');
    }, TICK_MS);
  }

  /**
   * Asks the teacher what to share, and starts recording it. Call it straight
   * from their click: the browser only shows its "choose what to share" box, and
   * only lets audio start, for a user action — everything that needs one is done
   * before the first `await`.
   *
   * Rejects with CaptureCancelled if they dismiss the box.
   */
  static async start(options: ClassRecorderOptions): Promise<ClassRecorder> {
    const mimeType = pickRecorderMimeType();
    if (!mimeType) throw new Error('This browser cannot record WebM.');
    const context = new AudioContext();
    let capture;
    try {
      capture = await requestScreenCapture();
    } catch (err) {
      void context.close();
      throw err;
    }
    const mixer = new ClassAudioMixer(context);
    try {
      await mixer.resume();
      mixer.sync(collectClassAudioTracks(options.room));
      const stream = new MediaStream([capture.track, mixer.track]);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      });
      return new ClassRecorder(options, {
        recorder,
        mixer,
        capture: capture.stream,
        videoTrack: capture.track,
        surface: capture.surface,
        mimeType,
      });
    } catch (err) {
      capture.stream.getTracks().forEach((t) => t.stop());
      void mixer.close();
      throw err;
    }
  }

  /** Re-reads the class's audio. Call it whenever the room changes (a student
   * joins or leaves, a microphone is switched); it also runs every second. */
  syncAudio(): void {
    if (this.finishing) return;
    this.mixer.sync(collectClassAudioTracks(this.options.room));
  }

  /** The limits the server set for this recording (they arrive just after it
   * starts, and apply from then on). */
  setLimits(maxDurationMs: number, maxBytes: number): void {
    this.maxDurationMs = maxDurationMs;
    this.maxBytes = maxBytes;
  }

  /** How long it has been recording (frozen once it has ended). */
  elapsedMs(): number {
    return (this.endedAtMs ?? performance.now()) - this.startedAt;
  }

  /** How much has been recorded so far. */
  bytes(): number {
    return this.recordedBytes;
  }

  get isRecording(): boolean {
    return this.finishing === null;
  }

  /** Ends the recording and resolves with its outcome. Safe to call again (and
   * from the auto-stop paths): the first reason wins and everyone gets the same
   * outcome. */
  stop(reason: StopReason = 'user'): Promise<RecorderOutcome> {
    if (!this.finishing) {
      this.reason = reason;
      this.finishing = this.finish();
    }
    return this.finishing;
  }

  /** Ends the recording and throws it away (the server refused it). Nothing is
   * reported through onFinished. */
  async discard(): Promise<void> {
    this.discarded = true;
    await this.stop(this.reason);
  }

  private async finish(): Promise<RecorderOutcome> {
    clearInterval(this.timer);
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    const stopped = new Promise<void>((resolve) => {
      if (this.recorder.state === 'inactive') return resolve();
      this.recorder.onstop = () => resolve();
      try {
        this.recorder.stop();
      } catch {
        resolve();
      }
      // A recorder that never says it stopped must not hang the class.
      giveUp = setTimeout(resolve, 10_000);
    });
    await stopped;
    clearTimeout(giveUp);
    this.endedAtMs = performance.now();
    const durationMs = Math.round(this.endedAtMs - this.startedAt);
    this.release();

    const raw = new Blob(this.chunks, { type: 'video/webm' });
    this.chunks.length = 0;

    let outcome: RecorderOutcome;
    if (this.discarded) {
      outcome = { ok: false, reason: this.reason, message: 'Discarded.' };
    } else if (raw.size === 0) {
      outcome = {
        ok: false,
        reason: this.reason,
        message: this.failure ?? 'Nothing was recorded.',
      };
    } else {
      const finished = await finalizeWebm(raw, durationMs);
      outcome = {
        ok: true,
        segment: {
          blob: finished.blob,
          durationMs,
          mimeType: this.mimeType,
          surface: this.surface,
          reason: this.reason,
          seekable: finished.durationAdded || finished.cuePoints > 0,
        },
      };
    }
    if (!this.discarded) this.options.onFinished(outcome);
    return outcome;
  }

  /** Lets go of the screen share (the browser's "sharing" indicator goes away)
   * and of the audio mix. */
  private release(): void {
    this.capture.getTracks().forEach((t) => t.stop());
    void this.mixer.close();
  }
}
