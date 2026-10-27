// FILE PATH: client/components/teacher/PendingRecordingsBanner.tsx
//
// Sits at the top of every teacher page. A class recording exists only in this
// browser tab until it is uploaded, and the teacher may well have gone back to
// their dashboard without pressing Upload — so, for as long as one is waiting,
// this says so, with the same Upload Class Recording / progress / retry controls
// as the classroom. Once everything is uploaded it says that, until dismissed.
// With no recordings at all it renders nothing.

'use client';

import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import RecordingList, { useLocalRecordings } from '@/components/classroom/RecordingList';
import { isUnfinished, recordingStore } from '@/lib/classroom/recording/store';

export default function PendingRecordingsBanner() {
  const items = useLocalRecordings();
  const { theme } = useTheme();
  if (items.length === 0) return null;

  const waiting = items.filter(isUnfinished).length;
  // Several classes can be waiting; "Upload all" belongs to one class's list, so
  // group them and give each class its own.
  const rooms = Array.from(new Set(items.map((r) => r.room)));

  const dismiss = () => {
    items.filter((r) => !isUnfinished(r)).forEach((r) => recordingStore.remove(r.id));
  };

  return (
    // The recording controls share the classroom's colour tokens (.cr-root).
    <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6" data-testid="pending-recordings-banner">
      <div
        className="cr-root rounded-xl border border-[var(--cr-border-strong)] p-4"
        data-theme={theme}
        role="region"
        aria-label="Class recordings"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
              waiting > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-500'
            }`}
          >
            {waiting > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--cr-text)]">
              {waiting > 0
                ? waiting === 1
                  ? 'A class recording is waiting to be uploaded'
                  : `${waiting} class recordings are waiting to be uploaded`
                : 'Your class recording is uploaded'}
            </p>
            <p className="mt-0.5 text-xs text-[var(--cr-text-muted)]">
              {waiting > 0
                ? 'It is saved on this computer only, and students cannot watch it until you upload it. Keep this browser tab open until it finishes.'
                : 'Students can now watch it from the Recordings tab of their dashboard.'}
            </p>
          </div>
          {waiting === 0 && (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              data-testid="pending-recordings-dismiss"
              className="flex-shrink-0 rounded-md p-1 text-[var(--cr-text-faint)] hover:bg-[var(--cr-surface-3)] hover:text-[var(--cr-text)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="mt-3 space-y-3">
          {rooms.map((r) => (
            <RecordingList
              key={r}
              items={items.filter((i) => i.room === r)}
              room={r}
              showDate
            />
          ))}
        </div>
      </div>
    </div>
  );
}
