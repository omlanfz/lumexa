// The admin's calls for the Little Coders lesson videos (kept in their own R2 bucket).

import api from '@/lib/axios';
import type { LcPreviewVideo, LcStoredVideo, LcVideoAttachReport, LcVideoChapter, LcVideoStorageStatus } from './types';

export const getVideoStorageStatus = () => api.get<LcVideoStorageStatus>('/curriculum/lesson-videos/status').then((r) => r.data);

/** Looks in the bucket for the finished videos and switches on the ones that are there. */
export const attachPublishedVideos = () => api.post<LcVideoAttachReport>('/curriculum/lesson-videos/attach').then((r) => r.data);

/** Stores a video (and optional poster / subtitles) for one lesson. Progress is reported 0–100. */
export const uploadPreviewVideo = (
  lessonId: string,
  files: { video: File; poster?: File | null; captions?: File | null },
  chapters: LcVideoChapter[],
  onProgress?: (percent: number) => void,
) => {
  const form = new FormData();
  form.append('video', files.video);
  if (files.poster) form.append('poster', files.poster);
  if (files.captions) form.append('captions', files.captions);
  if (chapters.length) form.append('chapters', JSON.stringify(chapters));
  return api
    .post<{ previewVideo: LcPreviewVideo; stored: LcStoredVideo }>(`/curriculum/lessons/${lessonId}/preview-video`, form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    })
    .then((r) => r.data);
};

/** The lesson stops showing its stored video (the files stay in the bucket). */
export const detachPreviewVideo = (lessonId: string) => api.delete<LcPreviewVideo>(`/curriculum/lessons/${lessonId}/preview-video`).then((r) => r.data);

/** A readable reason from a failed request (Nest sends `message` as text or a list). */
export function requestProblem(err: unknown, fallback: string): string {
  const res = (err as { response?: { status?: number; data?: { message?: string | string[] } } })?.response;
  if (res?.status === 413) return 'That file is too large.';
  const m = res?.data?.message;
  return Array.isArray(m) ? m.join(' ') : typeof m === 'string' && m ? m : fallback;
}
