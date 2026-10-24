// FILE PATH: client/lib/assessment/api.ts
//
// Typed wrappers over the assessment + report-card endpoints
// (server/src/assessments). One place that knows the URLs, so components stay
// free of string-built paths.

import api from '@/lib/axios';
import type {
  AttemptView,
  LessonTestStatus,
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

// ── Student / classroom ─────────────────────────────────────────────────────

export const getTestStatus = (scheduledLessonId: string) =>
  api.get<LessonTestStatus>(`/assessments/scheduled-lessons/${scheduledLessonId}/status`).then((r) => r.data);

export const getAttempt = (attemptId: string) =>
  api.get<AttemptView>(`/assessments/attempts/${attemptId}`).then((r) => r.data);

export const startAttempt = (assessmentId: string, scheduledLessonId: string) =>
  api.post<AttemptView>(`/assessments/${assessmentId}/attempts/start`, { scheduledLessonId }).then((r) => r.data);

export const saveAnswer = (attemptId: string, questionId: string, selectedIndex: number | null) =>
  api.post(`/assessments/attempts/${attemptId}/answers`, { questionId, selectedIndex }).then((r) => r.data);

export const saveCode = (attemptId: string, questionId: string, code: string) =>
  api.post(`/assessments/attempts/${attemptId}/code`, { questionId, code }).then((r) => r.data);

export const submitAttempt = (
  attemptId: string,
  payload: { answers: { questionId: string; selectedIndex: number | null }[]; practical?: { questionId: string; code: string }[] },
) => api.post<SubmitResponse>(`/assessments/attempts/${attemptId}/submit`, payload).then((r) => r.data);

// ── Teacher ──────────────────────────────────────────────────────────────────

export interface TestPreview {
  id: string;
  type: string;
  title: string;
  instructions: string | null;
  counts: { mcq: number; trueFalse: number; practical: number };
  totalMarks: number;
  meetsStandard: boolean;
  questions: { id: string; order: number; kind: 'MCQ' | 'TRUE_FALSE'; text: string; options: string[]; correctIndex?: number; explanation?: string | null }[];
  codingProjects: { id: string; title: string; instructions: string; language: string; maxScore: number; rubric: { criterion: string; maxPoints: number; lookFor?: string }[] }[];
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
