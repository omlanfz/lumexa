// FILE PATH: client/lib/assessment/api.ts
//
// Typed wrappers over the assessment + report-card endpoints
// (server/src/assessments). One place that knows the URLs, so components stay
// free of string-built paths.

import api from '@/lib/axios';
import type { LcAssessmentFile } from '../littleCoders/types.ts';
import { clockOffsetMs } from './clock.ts';
import type {
  AttemptState,
  AttemptView,
  ClassTestOverview,
  LessonTestStatus,
  LockClassResponse,
  LockResult,
  ReportDetail,
  ReportListItem,
  ReportSummary,
  SubmitResponse,
} from './types';

/** The server's human message for a failed request, or `fallback`. */
export function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const m = data?.message;
  if (Array.isArray(m)) return m.join(' ');
  if (typeof m === 'string' && m) return m;
  return fallback;
}

export function httpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

/** True when the request never got an answer (offline, timeout, DNS…). */
export function isNetworkError(err: unknown): boolean {
  const e = err as { response?: unknown; code?: string };
  return !e?.response;
}

// Responses that carry the server's clock (`serverTime`) also get
// `clockOffsetMs`, so every stopwatch counts from the server's start time and not
// from a computer clock that may be minutes off (see clock.ts).
async function withClock<T extends { serverTime?: string }>(request: () => Promise<{ data: T }>): Promise<T & { clockOffsetMs: number }> {
  const sentAt = Date.now();
  const { data } = await request();
  return { ...data, clockOffsetMs: clockOffsetMs(data.serverTime, sentAt, Date.now()) };
}

// ── Student / classroom ─────────────────────────────────────────────────────

export const getTestStatus = (scheduledLessonId: string) =>
  withClock(() => api.get<Omit<LessonTestStatus, 'clockOffsetMs'>>(`/assessments/scheduled-lessons/${scheduledLessonId}/status`));

export const getAttempt = (attemptId: string) =>
  withClock(() => api.get<Omit<AttemptView, 'clockOffsetMs'>>(`/assessments/attempts/${attemptId}`));

/** The light poll a test tab makes to learn its test was locked or submitted. */
export const getAttemptState = (attemptId: string) =>
  withClock(() => api.get<Omit<AttemptState, 'clockOffsetMs'>>(`/assessments/attempts/${attemptId}/state`));

export const startAttempt = (assessmentId: string, scheduledLessonId: string) =>
  withClock(() => api.post<Omit<AttemptView, 'clockOffsetMs'>>(`/assessments/${assessmentId}/attempts/start`, { scheduledLessonId }));

export const saveAnswer = (attemptId: string, questionId: string, selectedIndex: number | null) =>
  api.post(`/assessments/attempts/${attemptId}/answers`, { questionId, selectedIndex }).then((r) => r.data);

export const saveCode = (attemptId: string, questionId: string, code: string) =>
  api.post(`/assessments/attempts/${attemptId}/code`, { questionId, code }).then((r) => r.data);

/** Structured assessments, Part B: autosave of one written answer. */
export const saveShortAnswer = (attemptId: string, questionId: string, answer: string) =>
  api.post<{ saved: boolean; savedAt: string }>(`/assessments/attempts/${attemptId}/short-answers`, { questionId, answer }).then((r) => r.data);

export const submitAttempt = (
  attemptId: string,
  payload: {
    answers: { questionId: string; selectedIndex: number | null }[];
    practical?: { questionId: string; code: string }[];
    /** Structured assessments: the latest written answers travel with the hand-in. */
    shortAnswers?: { questionId: string; answer: string }[];
    /** Little Coders: the latest links and note travel with the submission (the files are already uploaded). */
    project?: { questionId: string; links: string[]; note?: string };
  },
) => api.post<SubmitResponse>(`/assessments/attempts/${attemptId}/submit`, payload).then((r) => r.data);

// ── Little Coders practical: links, note and files ──────────────────────────

export const savePractical = (attemptId: string, body: { questionId: string; links: string[]; note?: string }) =>
  api.post<{ saved: boolean; savedAt: string; links: string[]; note: string | null }>(`/assessments/attempts/${attemptId}/practical`, body).then((r) => r.data);

/** Uploads project files (all of them or none). Progress is reported 0–100. */
export const uploadPracticalFiles = (attemptId: string, files: File[], onProgress?: (percent: number) => void) => {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  return api
    .post<LcAssessmentFile[]>(`/assessments/attempts/${attemptId}/files`, form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    })
    .then((r) => r.data);
};

/** Takes a file back before submitting; returns the files that remain. */
export const removePracticalFile = (attemptId: string, fileId: string) =>
  api.delete<LcAssessmentFile[]>(`/assessments/attempts/${attemptId}/files/${fileId}`).then((r) => r.data);

/** Little Coders Final Assessment (admin): which version of the practical is given by default. */
export const setAssessmentVariant = (assessmentId: string, variant: 'SCRATCH_AI' | 'PYTHON' | null) =>
  api.patch<{ assessmentId: string; activeVariant: string | null }>(`/assessments/${assessmentId}/variant`, { variant }).then((r) => r.data);

/** …or for one class (admin). */
export const setClassVariant = (scheduledLessonId: string, variant: 'SCRATCH_AI' | 'PYTHON' | null) =>
  api.patch<{ updated: number; variant: string | null }>(`/assessments/scheduled-lessons/${scheduledLessonId}/variant`, { variant }).then((r) => r.data);

// ── Teacher ──────────────────────────────────────────────────────────────────

/** Every learner's progress in this class (a batch is one group of up to four). */
export const getClassStatus = (scheduledLessonId: string) =>
  withClock(() => api.get<Omit<ClassTestOverview, 'clockOffsetMs'>>(`/assessments/scheduled-lessons/${scheduledLessonId}/class-status`));

/** "Lock & submit" one learner: their test is submitted with what was saved. */
export const lockStudentTest = (scheduledLessonId: string) =>
  api.post<LockResult>(`/assessments/scheduled-lessons/${scheduledLessonId}/lock`).then((r) => r.data);

/** "Time's up" — lock & submit every learner in the class. */
export const lockClassTests = (scheduledLessonId: string) =>
  api.post<LockClassResponse>(`/assessments/scheduled-lessons/${scheduledLessonId}/lock-class`).then((r) => r.data);

/** Let a learner who never started (and was locked out) start after all. */
export const reopenStudentTest = (scheduledLessonId: string) =>
  api.post<{ reopened: boolean }>(`/assessments/scheduled-lessons/${scheduledLessonId}/reopen`).then((r) => r.data);

export interface TestPreview {
  id: string;
  type: string;
  title: string;
  instructions: string | null;
  counts: { mcq: number; trueFalse: number; practical: number };
  totalMarks: number;
  meetsStandard: boolean;
  format?: import('./types.ts').AssessmentFormat;
  questions: { id: string; order: number; kind: 'MCQ' | 'TRUE_FALSE'; text: string; options: string[]; correctIndex?: number; explanation?: string | null }[];
  codingProjects: {
    id: string;
    title: string;
    instructions: string;
    language: string;
    maxScore: number;
    rubric: { criterion: string; maxPoints: number; lookFor?: string }[];
    /** Little Coders: the structured project and which version it is (staff only). */
    spec?: import('../littleCoders/types.ts').LcPracticalSpec | null;
    variantKey?: string | null;
  }[];
}

export const getTestPreview = (assessmentId: string, withAnswers: boolean) =>
  api.get<TestPreview>(`/assessments/${assessmentId}/preview`, { params: withAnswers ? { answers: '1' } : {} }).then((r) => r.data);

export const listReports = (params?: { status?: string; type?: string; studentUserId?: string }) =>
  api.get<ReportListItem[]>('/test-reports', { params }).then((r) => r.data);

export const getReportSummary = () => api.get<ReportSummary>('/test-reports/summary').then((r) => r.data);

export const getReport = (id: string) => api.get<ReportDetail>(`/test-reports/${id}`).then((r) => r.data);

export interface ReportEdit {
  questionOverrides?: { questionId: string; correct: boolean | null; note?: string | null }[];
  codingRubricScores?: { criterion: string; score: number | null }[];
  /** Structured assessments: the marks of Part B, criterion by criterion, and a note for the student. */
  shortAnswerMarks?: { questionId: string; scores?: { criterion: string; score: number | null }[]; comment?: string | null }[];
  feedback?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  codingFeedback?: string | null;
  expectedUpdatedAt?: string;
}

export const updateReport = (id: string, edit: ReportEdit) =>
  api.patch<ReportDetail>(`/test-reports/${id}`, edit).then((r) => r.data);

export const approveReport = (id: string) => api.post<ReportDetail>(`/test-reports/${id}/approve`).then((r) => r.data);
export const reopenReport = (id: string) => api.post<ReportDetail>(`/test-reports/${id}/reopen`).then((r) => r.data);
export const shareReport = (id: string) => api.post<ReportDetail>(`/test-reports/${id}/share`).then((r) => r.data);
