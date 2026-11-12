'use client';

// FILE PATH: client/components/admin/lesson-editor/LcVideoStorage.tsx
//
// The "Stored video" box of the Little Coders lesson editor: the lesson's preview video lives in
// Lumexa's own lesson-video bucket (Cloudflare R2). Here an admin sees whether that storage is set
// up, uploads (or replaces) this lesson's MP4 with an optional poster and subtitles, or detaches it.
// Detaching never deletes a file — the videos are kept in the bucket indefinitely.

import { useEffect, useRef, useState } from 'react';
import { attachPublishedVideos, detachPreviewVideo, getVideoStorageStatus, requestProblem, uploadPreviewVideo } from '@/lib/littleCoders/videoApi';
import { formatTime, parseChapterStarts } from '@/lib/littleCoders/player';
import type { LcPreviewVideo, LcVideoStorageStatus } from '@/lib/littleCoders/types';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm a-focus';
const BTN = 'px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60';
const BTN_QUIET = 'px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-surface-2)] disabled:opacity-60';

const megabytes = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

export default function LcVideoStorage({ lessonId, video, onVideo }: { lessonId: string; video: LcPreviewVideo; onVideo: (video: LcPreviewVideo) => void }) {
  const [status, setStatus] = useState<LcVideoStorageStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [captionsFile, setCaptionsFile] = useState<File | null>(null);
  const [chapterText, setChapterText] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState<'upload' | 'detach' | 'check' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const stored = video.stored ?? null;

  useEffect(() => {
    let live = true;
    getVideoStorageStatus()
      .then((s) => live && setStatus(s))
      .catch((e) => live && setStatusError(requestProblem(e, 'Could not read the storage status.')));
    return () => {
      live = false;
    };
  }, [stored?.videoKey]);

  const upload = async () => {
    if (!videoFile) return;
    const chapters = parseChapterStarts(chapterText);
    if (chapters.error) {
      setProblem(chapters.error);
      return;
    }
    setBusy('upload');
    setProblem(null);
    setNotice(null);
    setProgress(0);
    try {
      const res = await uploadPreviewVideo(lessonId, { video: videoFile, poster: posterFile, captions: captionsFile }, chapters.chapters, setProgress);
      onVideo(res.previewVideo);
      setVideoFile(null);
      setPosterFile(null);
      setCaptionsFile(null);
      setChapterText('');
      formRef.current?.reset();
      setNotice('Uploaded. Students see this video on the lesson now.');
    } catch (err) {
      setProblem(requestProblem(err, 'The upload failed. Check your connection and try again.'));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const detach = async () => {
    if (!window.confirm('Stop showing this video on the lesson? The file stays in storage — you can upload it again later.')) return;
    setBusy('detach');
    setProblem(null);
    setNotice(null);
    try {
      onVideo(await detachPreviewVideo(lessonId));
      setNotice('The video is detached from this lesson. Its file is still kept in storage.');
    } catch (err) {
      setProblem(requestProblem(err, 'Could not detach the video.'));
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    setBusy('check');
    setProblem(null);
    setNotice(null);
    try {
      const report = await attachPublishedVideos();
      if (report.storageProblem) setProblem(`Storage could not be checked: ${report.storageProblem}`);
      else {
        setNotice(
          report.attached.length
            ? `${report.attached.length} video(s) switched on (${report.attached.join(', ')}). Reload this page to see them. ${report.notInStorage.length} are not in the bucket yet.`
            : `Nothing new: ${report.alreadyHave.length} lesson(s) already have a video, ${report.notInStorage.length} are not in the bucket yet.`,
        );
        setStatus(await getVideoStorageStatus());
      }
    } catch (err) {
      setProblem(requestProblem(err, 'Could not check storage.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)]/40 p-3 mb-4" data-testid="lc-video-storage">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--a-text)]">📦 Stored video</h3>
        <button type="button" onClick={() => void check()} disabled={busy !== null || !status?.configured} className={BTN_QUIET} title="Looks in the bucket for the finished lesson videos and switches on the ones that are there">
          {busy === 'check' ? 'Checking…' : 'Check storage for the finished videos'}
        </button>
      </div>

      {statusError ? (
        <p className="mt-1 text-xs text-[var(--a-danger)]">{statusError}</p>
      ) : !status ? (
        <p className="mt-1 text-xs text-[var(--a-text-faint)]">Checking storage…</p>
      ) : status.configured ? (
        <p className="mt-1 text-xs text-[var(--a-text-muted)]" data-testid="lc-video-status">
          Storage is ready — bucket <strong>{status.storage?.bucket}</strong>, {status.storage?.delivery === 'public' ? 'public address' : 'private (signed links)'}. {status.withVideo} of {status.lessons} lessons show a stored video.
        </p>
      ) : (
        <p role="alert" className="mt-1 text-xs text-[var(--a-danger)]" data-testid="lc-video-status">
          Lesson video storage is not set up yet ({status.problem}). Until it is, paste a video address below instead — or follow docs/LESSON_VIDEOS_SETUP.md to connect the bucket.
        </p>
      )}

      <div className="mt-3 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] p-2.5 text-sm text-[var(--a-text)]">
        {stored ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              <span className="font-semibold text-[var(--a-success-text)]">✓ In storage</span> · {megabytes(stored.bytes)} · {stored.width}×{stored.height}
              {video.durationSeconds ? ` · ${formatTime(video.durationSeconds)}` : ''} · {stored.chapters.length} chapter{stored.chapters.length === 1 ? '' : 's'} ·{' '}
              {stored.posterKey ? 'poster' : 'no poster'} · {stored.captionsKey ? 'subtitles' : 'no subtitle file'} · added {new Date(stored.uploadedAt).toLocaleDateString()}
            </p>
            <button type="button" onClick={() => void detach()} disabled={busy !== null} className={BTN_QUIET}>
              {busy === 'detach' ? 'Detaching…' : 'Detach'}
            </button>
          </div>
        ) : (
          <p className="text-[var(--a-text-muted)]">No video is stored for this lesson{video.videoUrl ? ' — students see the address pasted below' : ' — students see “Video coming soon”'}.</p>
        )}
      </div>

      <form
        ref={formRef}
        className="mt-3 grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void upload();
        }}
      >
        <label className="block md:col-span-2">
          <span className="block text-xs font-semibold text-[var(--a-text)] mb-1">{stored ? 'Replace the video' : 'Upload the video'} (MP4, 16:9, up to 2 minutes)</span>
          <input type="file" accept="video/mp4" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} className={INPUT} aria-label="Video file (MP4)" />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-[var(--a-text)] mb-1">Poster image (JPEG, optional)</span>
          <input type="file" accept="image/jpeg" onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)} className={INPUT} aria-label="Poster image (JPEG)" />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-[var(--a-text)] mb-1">Subtitles (WebVTT .vtt, optional)</span>
          <input type="file" accept=".vtt,text/vtt" onChange={(e) => setCaptionsFile(e.target.files?.[0] ?? null)} className={INPUT} aria-label="Subtitles file (WebVTT)" />
        </label>
        <label className="block md:col-span-2">
          <span className="block text-xs font-semibold text-[var(--a-text)] mb-1">Chapter start times in seconds (optional)</span>
          <input value={chapterText} onChange={(e) => setChapterText(e.target.value)} placeholder="0, 8, 19, 43, 60, 69" className={INPUT} />
          <span className="block text-[11px] text-[var(--a-text-faint)] mt-1">One per scene — the question, the idea, how it works, see it in action, remember this, your turn. They become markers on the seek bar.</span>
        </label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!videoFile || busy !== null || status?.configured === false} className={BTN}>
            {busy === 'upload' ? (progress !== null && progress < 100 ? `Uploading… ${progress}%` : 'Saving…') : stored ? 'Replace the stored video' : 'Upload to storage'}
          </button>
          {busy === 'upload' && progress !== null ? (
            <progress value={progress} max={100} className="h-2 w-40" aria-label="Upload progress" />
          ) : null}
          {status?.configured === false ? <span className="text-xs text-[var(--a-text-faint)]">Uploading needs the storage set up first.</span> : null}
        </div>
      </form>

      {problem ? (
        <p role="alert" className="mt-2 text-sm text-[var(--a-danger)]">
          {problem}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-2 text-sm text-[var(--a-success-text)]">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
