// FILE PATH: client/lib/classroom/recording/store.ts
//
// The recordings a teacher has made on THIS computer and not yet got to a
// student: the finished file (a Blob) waits here until it is uploaded.
//
// It is a plain module-level store, not React state, on purpose. Ending a class
// takes the teacher back to their dashboard, which unmounts the classroom page —
// and anything held in that page's state would be gone with it, along with up to
// an hour of recording. A module outlives the page for as long as the browser
// tab does, so the recording survives the navigation and can still be uploaded
// from the "class ended" screen or the dashboard.
//
// What it cannot survive is the tab being closed or reloaded: the file lives
// only in memory. So while anything is unfinished, the browser is asked to warn
// before the tab is closed (see the guard at the bottom).
//
// Components read it through useSyncExternalStore (subscribe / getSnapshot /
// selectors below); the snapshot is replaced, never mutated, on every change.

import type { CaptureSurface } from './capture.ts';
import type { StopReason } from './ClassRecorder.ts';

export type RecordingPhase =
  | 'recording' // the browser is recording it
  | 'saved' // recorded, on this computer, not uploaded yet
  | 'uploading'
  | 'failed' // the upload did not work — it can be retried
  | 'uploaded'; // the server has it and checked it

export type UploadStage = 'idle' | 'preparing' | 'uploading' | 'confirming';

export interface LocalRecording {
  /** The id the server knows this recording by (a UUID chosen here). */
  id: string;
  /** The classroom it was recorded in. */
  room: string;
  /** 1, 2, 3… among this class's recordings on this computer. */
  part: number;
  phase: RecordingPhase;
  stage: UploadStage;
  /** Epoch ms. */
  startedAt: number;
  durationMs: number;
  sizeBytes: number;
  /** The file; null while still recording and once it has been uploaded. */
  blob: Blob | null;
  /** 0..1 of the current upload. */
  progress: number;
  error: string | null;
  /** Upload attempts so far (retries included). */
  attempts: number;
  /** The file reached storage and only its confirmation is outstanding, so a
   * retry must not send it again. */
  inStorage: boolean;
  /** The file has a length and a jump index. */
  seekable: boolean;
  stopReason: StopReason | null;
  surface: CaptureSurface;
}

type Listener = () => void;

const NONE: readonly LocalRecording[] = Object.freeze([]);

/** Something that still needs the teacher: being recorded, or not yet uploaded. */
export function isUnfinished(r: LocalRecording): boolean {
  return r.phase !== 'uploaded';
}

export class RecordingStore {
  private items: readonly LocalRecording[] = NONE;
  private readonly listeners = new Set<Listener>();

  /** Called with whether anything is unfinished, each time that changes. */
  onUnfinishedChange: ((unfinished: boolean) => void) | null = null;
  private wasUnfinished = false;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Every recording, oldest first. The same array until something changes. */
  getSnapshot = (): readonly LocalRecording[] => this.items;

  /** For a server-side render, where there is nothing. */
  getServerSnapshot = (): readonly LocalRecording[] => NONE;

  private commit(next: readonly LocalRecording[]): void {
    this.items = next;
    const unfinished = next.some(isUnfinished);
    if (unfinished !== this.wasUnfinished) {
      this.wasUnfinished = unfinished;
      this.onUnfinishedChange?.(unfinished);
    }
    this.listeners.forEach((l) => l());
  }

  get(id: string): LocalRecording | undefined {
    return this.items.find((r) => r.id === id);
  }

  forRoom(room: string): LocalRecording[] {
    return this.items.filter((r) => r.room === room);
  }

  /** The number to give this class's next recording on this computer. */
  nextPart(room: string): number {
    return this.forRoom(room).reduce((n, r) => Math.max(n, r.part), 0) + 1;
  }

  /** Adds a recording (or replaces one with the same id). */
  add(recording: LocalRecording): void {
    this.commit([...this.items.filter((r) => r.id !== recording.id), recording]);
  }

  patch(id: string, changes: Partial<LocalRecording>): void {
    const current = this.get(id);
    if (!current) return;
    this.commit(this.items.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  }

  remove(id: string): void {
    if (!this.get(id)) return;
    this.commit(this.items.filter((r) => r.id !== id));
  }

  /** How many of this class's recordings are still to be uploaded (a number, so
   * a component that only needs the count does not re-render as progress ticks). */
  unfinishedCount(room?: string): number {
    return this.items.filter(
      (r) => isUnfinished(r) && (room === undefined || r.room === room),
    ).length;
  }

  /** Forgets everything (tests). */
  reset(): void {
    this.commit(NONE);
  }
}

/** The one store of this browser tab. */
export const recordingStore = new RecordingStore();

// ─── "Are you sure?" before the tab is closed ───────────────────────────────

function warnBeforeLeaving(event: BeforeUnloadEvent): void {
  // Browsers show their own words; setting returnValue is what asks them to.
  event.preventDefault();
  event.returnValue = '';
}

recordingStore.onUnfinishedChange = (unfinished) => {
  if (typeof window === 'undefined') return;
  if (unfinished) window.addEventListener('beforeunload', warnBeforeLeaving);
  else window.removeEventListener('beforeunload', warnBeforeLeaving);
};
