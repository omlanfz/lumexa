'use client';

// FILE PATH: client/components/curriculum/HomeworkSubmission.tsx
//
// The student's homework hand-in form + the status of what they submitted. Moved
// verbatim out of LessonDetailsView (so the lesson views can share it); its
// behaviour — private upload first, then submit; resubmit until approved; teacher
// feedback — is unchanged.

import { useRef, useState } from 'react';
import api from '@/lib/axios';
import { errorMessage, openHomeworkFile } from '@/lib/homeworkFiles';
import type { SubmissionFile, SubmissionInfo } from '@/lib/lesson/types';

export default function HomeworkSubmission({
  scheduledLessonId,
  submission,
  onSubmitted,
}: {
  scheduledLessonId: string;
  submission: SubmissionInfo | null;
  onSubmitted: (submission: SubmissionInfo) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<string[]>(['']);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  // Files that are already safely uploaded. If the submit fails afterwards the
  // student tries again without sending them all a second time.
  const uploadedRef = useRef<Map<File, string>>(new Map());

  const openFile = async (f: SubmissionFile) => {
    setFileError(null);
    try {
      await openHomeworkFile(f);
    } catch (err) {
      setFileError(errorMessage(err, 'Could not open this file.'));
    }
  };

  const addFiles = (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const setLink = (index: number, value: string) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? value : l)));
  };

  const addLinkField = () => setLinks((prev) => [...prev, '']);
  const removeLink = (index: number) =>
    setLinks((prev) => prev.filter((_, i) => i !== index));

  const submit = async () => {
    const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
    if (files.length === 0 && cleanLinks.length === 0) {
      setError('Attach at least one file or link.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      // Each file goes to private storage first; the work is only submitted once
      // every file has arrived. A file that fails stops here with the reason, and
      // nothing is submitted.
      const pending = files.filter((f) => !uploadedRef.current.has(f));
      if (pending.length > 0) {
        const form = new FormData();
        form.append('scheduledLessonId', scheduledLessonId);
        pending.forEach((f) => form.append('homework', f));
        const uploadRes = await api.post<{ id: string }[]>('/uploads/homework', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        pending.forEach((f, i) => uploadedRef.current.set(f, uploadRes.data[i].id));
      }
      const res = await api.post('/submissions', {
        scheduledLessonId,
        files: files.map((f) => ({ id: uploadedRef.current.get(f)! })),
        links: cleanLinks,
        note: note.trim() || undefined,
      });
      onSubmitted(res.data);
      uploadedRef.current = new Map();
      setFiles([]);
      setLinks(['']);
      setNote('');
      setResubmitting(false);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        errorMessage(
          err,
          status === 413
            ? 'One of your files is too large (15 MB is the most for a single file).'
            : 'Could not submit your work. Please check your connection and try again.',
        ),
      );
    } finally {
      setUploading(false);
    }
  };

  if (submission && !resubmitting) {
    const isPending = submission.status === 'PENDING';
    const isApproved = submission.status === 'APPROVED';
    const isNeedsChanges = submission.status === 'NEEDS_CHANGES';

    return (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
        <div
          className={`flex items-center gap-2 font-semibold text-sm ${
            isNeedsChanges
              ? 'text-red-600 dark:text-red-400'
              : isApproved
                ? 'text-teal-700 dark:text-teal-400'
                : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          <span>
            {isNeedsChanges ? '🔄 Needs Changes' : isApproved ? '✅ Approved' : '✓ Work Submitted'}
          </span>
          {isPending && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              Needs Review
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {submission.resubmissionCount > 0 ? 'Resubmitted' : 'Submitted'}{' '}
          {new Date(submission.submittedAt).toLocaleDateString('en-US', { dateStyle: 'medium' } as Intl.DateTimeFormatOptions)}
          {submission.files.length > 0
            ? ` · ${submission.files.length} file${submission.files.length > 1 ? 's' : ''}`
            : ''}
          {submission.links.length > 0
            ? ` · ${submission.links.length} link${submission.links.length > 1 ? 's' : ''}`
            : ''}
        </p>
        {(submission.files.length > 0 || submission.links.length > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {submission.files.map((f, i) =>
              f.removed ? (
                <span
                  key={`f-${i}`}
                  title="You finished this program, so the file was deleted from storage. Your grade and feedback are kept."
                  className="text-xs px-2 py-1 rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 truncate max-w-[220px]"
                >
                  📎 {f.name || `File ${i + 1}`} · removed (program completed)
                </span>
              ) : (
                <button
                  key={`f-${i}`}
                  type="button"
                  onClick={() => void openFile(f)}
                  className="text-xs px-2 py-1 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-500/20 truncate max-w-[180px]"
                >
                  📎 {f.name || `File ${i + 1}`}
                </button>
              ),
            )}
            {submission.links.map((l, i) => (
              <a
                key={`l-${i}`}
                href={l}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-1 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-500/20 truncate max-w-[180px]"
              >
                🔗 {l}
              </a>
            ))}
          </div>
        )}

        {fileError && (
          <p className="mt-1.5 text-xs text-red-500" role="alert">
            {fileError}
          </p>
        )}

        {isApproved && submission.rating && (
          <p className="mt-2 text-amber-400 text-sm">
            {'★'.repeat(submission.rating)}
            <span className="text-gray-300 dark:text-gray-600">{'★'.repeat(5 - submission.rating)}</span>
          </p>
        )}

        {(submission.feedback || submission.feedbackTags.length > 0) && (
          <div
            className={`mt-2 text-sm rounded-lg p-3 border ${
              isNeedsChanges
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
                : 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/40'
            }`}
          >
            <p
              className={`text-xs font-semibold mb-1 ${
                isNeedsChanges ? 'text-red-700 dark:text-red-400' : 'text-teal-700 dark:text-teal-400'
              }`}
            >
              Teacher feedback
            </p>
            {submission.feedbackTags.length > 0 && (
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-1">
                {submission.feedbackTags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
            {submission.feedback && <p className="text-gray-700 dark:text-gray-300">{submission.feedback}</p>}
          </div>
        )}

        {/* Editable any time before the teacher approves it — a student who
            submitted the wrong file shouldn't have to wait for a review to
            fix it. Once APPROVED, the submission is final. */}
        {!isApproved && (
          <button
            onClick={() => setResubmitting(true)}
            className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              isNeedsChanges ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-500 hover:bg-gray-400'
            }`}
          >
            {isNeedsChanges ? 'Resubmit Work' : 'Edit Submission'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50 space-y-2">
      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Complete the task and upload your work.</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Documents, images, ZIP archives, or coding project files (.py, .ipynb, .html, .css, .js, .java, .sb3, .rbxl, and more) — you can attach multiple files.
      </p>
      <input
        type="file"
        multiple
        onChange={(e) => {
          // Materialize the FileList into a plain array *before* clearing
          // the input's value below. `input.files` is a live FileList in
          // Chromium/Firefox — resetting `value` mutates that same object
          // to length 0 immediately, and since setFiles' functional updater
          // doesn't run until after this handler returns, passing the live
          // FileList straight through silently drops every selected file.
          const selected = e.target.files ? Array.from(e.target.files) : [];
          addFiles(selected);
          e.target.value = '';
        }}
        className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-500/10 file:text-teal-700 dark:file:text-teal-400 hover:file:bg-teal-500/20"
      />
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg px-2.5 py-1.5"
            >
              <span className="truncate">📎 {f.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="text-gray-400 hover:text-red-500 flex-shrink-0"
                aria-label={`Remove ${f.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5 pt-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">Or share a link (Scratch, GitHub, Replit, etc.)</p>
        {links.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={link}
              onChange={(e) => setLink(i, e.target.value)}
              placeholder="https://scratch.mit.edu/projects/..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
            />
            {links.length > 1 && (
              <button
                onClick={() => removeLink(i)}
                className="text-gray-400 hover:text-red-500 flex-shrink-0"
                aria-label="Remove link"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button onClick={addLinkField} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
          + Add another link
        </button>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note for your teacher (optional)"
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={uploading}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-black bg-teal-500 hover:bg-teal-400 disabled:opacity-60 transition-colors"
        >
          {uploading ? 'Submitting…' : 'Submit Work'}
        </button>
        {resubmitting && (
          <button onClick={() => setResubmitting(false)} className="text-sm text-gray-500 hover:underline">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
