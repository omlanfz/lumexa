// FILE PATH: client/lib/batches.ts
//
// Types and small pure helpers for batches: the admin management screens, the
// student's Schedule tab, and the batch displays on the teacher and student
// dashboards. The shapes mirror what server/src/batches returns.
//
// A batch is a real group (teacher + curriculum + weekly slots + students) that
// holds shared classes. Placing a student never rewrites their progress: what a
// placement changes is listed as DECISIONS the admin must explicitly accept, and
// what is not allowed at all is a BLOCKER (see server/src/batches/batch-enrollment.ts).

export type ClassTypeValue = "ONE_TO_ONE" | "BATCH";
export type BatchStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface BatchSlot {
  weekday: number; // 0 = Sunday … 6 = Saturday (Asia/Dhaka)
  hour: number;
  minute: number;
}

export interface BatchSummary {
  id: string;
  name: string;
  notes: string | null;
  status: BatchStatus;
  teacher: { id: string; name: string; avatarUrl: string | null };
  course: { id: string; title: string; totalLessons: number };
  maxStudents: number;
  memberCount: number;
  startDate: string;
  slots: BatchSlot[];
  progress: {
    completedThrough: number | null;
    nextLesson: number;
    totalLessons: number;
  };
  nextSession: { id: string; start: string; end: string; lessonNumber: number } | null;
  createdAt: string;
}

export interface BatchMemberRow {
  studentUserId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  grade: string | null;
  age: number | null;
  accountStatus: string;
  joinedAt: string;
  joinedAtLesson: number | null;
  alignment: string | null;
  completedLessons: number;
  nextLesson: number;
  /** Where the student is relative to the batch's own position. */
  sync: "ALIGNED" | "BEHIND" | "AHEAD";
  attended: number;
  missed: number;
}

export interface BatchSessionRow {
  id: string;
  lessonNumber: number;
  start: string;
  end: string;
  status: string;
  students: number;
  /** Who is in an upcoming class (not sent for past classes). */
  participants?: { id: string; fullName: string; email: string }[];
  attended?: number;
}

export interface BatchDetail {
  batch: BatchSummary;
  members: BatchMemberRow[];
  formerMembers: { studentUserId: string; fullName: string; joinedAt: string; leftAt: string }[];
  upcomingSessions: BatchSessionRow[];
  recentSessions: BatchSessionRow[];
  warnings: string[];
}

// ── Placement rules ─────────────────────────────────────────────────────────

export type IssueSeverity = "BLOCKER" | "DECISION";
export type DecisionKey = "acceptTeacherChange" | "progress" | "replaceUpcoming";
export type ProgressChoice = "SKIP_TO_BATCH" | "REBASE_BATCH";

export interface EnrollmentIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  /** For a DECISION: the decision that resolves it. */
  decision?: DecisionKey;
  /** For the `progress` decision: the one value that resolves this issue. */
  choice?: ProgressChoice;
  detail?: Record<string, unknown>;
}

export interface EnrollmentDecisions {
  acceptTeacherChange?: boolean;
  progress?: ProgressChoice;
  replaceUpcoming?: boolean;
}

export interface Evaluation {
  issues: EnrollmentIssue[];
  /** No blocker: the placement is allowed (decisions may still be needed). */
  allowed: boolean;
  /** Can go ahead as-is — no blocker and nothing to decide. */
  compatible: boolean;
  alignment: "ALIGNED" | "SKIPPED_TO_BATCH" | "BATCH_REBASED";
  studentNextLesson: number;
  batchNextLesson: number;
}

export interface BatchOption extends Evaluation {
  batch: BatchSummary;
}

export interface BatchCandidate extends Evaluation {
  student: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    accountStatus: string;
    grade: string | null;
  };
  currentBatch: { id: string; name: string } | null;
}

export const blockersOf = (issues: EnrollmentIssue[]) =>
  issues.filter((i) => i.severity === "BLOCKER");

export const decisionsOf = (issues: EnrollmentIssue[]) =>
  issues.filter((i) => i.severity === "DECISION");

/** The decisions an admin has accepted, in the shape the server expects. Only
 * issues that were ticked contribute, and a `progress` decision carries the one
 * choice its own issue asks for — never a choice the screen did not show. */
export function decisionsFrom(
  issues: EnrollmentIssue[],
  accepted: Record<string, boolean>,
): EnrollmentDecisions {
  const out: EnrollmentDecisions = {};
  for (const issue of decisionsOf(issues)) {
    if (!accepted[issue.code] || !issue.decision) continue;
    if (issue.decision === "progress") {
      if (issue.choice) out.progress = issue.choice;
    } else {
      out[issue.decision] = true;
    }
  }
  return out;
}

/** Every decision the placement needs has been accepted. */
export function allDecisionsAccepted(
  issues: EnrollmentIssue[],
  accepted: Record<string, boolean>,
): boolean {
  return decisionsOf(issues).every((i) => accepted[i.code]);
}

/** What an admin sees at a glance about a candidate batch. */
export function compatibilityLabel(e: Pick<Evaluation, "allowed" | "compatible">): {
  text: string;
  tone: "good" | "warn" | "bad";
} {
  if (e.compatible) return { text: "Compatible", tone: "good" };
  if (e.allowed) return { text: "Needs your confirmation", tone: "warn" };
  return { text: "Not possible", tone: "bad" };
}

// ── Reading API errors ──────────────────────────────────────────────────────

export interface ParsedApiError {
  message: string;
  /** e.g. DECISION_REQUIRED, BATCH_ENROLLMENT_BLOCKED, LEAVES_BATCH */
  code?: string;
  issues: EnrollmentIssue[];
  unmet: EnrollmentIssue[];
  batch?: { id: string; name: string };
}

export function parseApiError(err: unknown, fallback = "Something went wrong."): ParsedApiError {
  const data = (err as { response?: { data?: Record<string, unknown> } } | null)?.response?.data;
  const raw = data?.message;
  const message = Array.isArray(raw) ? raw.join(", ") : typeof raw === "string" ? raw : fallback;
  const details = (data?.details ?? {}) as {
    code?: string;
    issues?: EnrollmentIssue[];
    unmet?: EnrollmentIssue[];
    batch?: { id: string; name: string };
  };
  return {
    message,
    code: details.code,
    issues: details.issues ?? [],
    unmet: details.unmet ?? [],
    batch: details.batch,
  };
}

// ── Display helpers ─────────────────────────────────────────────────────────

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "Tue 22:00" — Asia/Dhaka wall-clock time, the way slots are stored. */
export function formatSlot(slot: BatchSlot): string {
  return `${WEEKDAYS_SHORT[slot.weekday] ?? "?"} ${pad(slot.hour)}:${pad(slot.minute)}`;
}

/** "Tue 22:00 · Fri 22:00", in week order. */
export function formatSlots(slots: BatchSlot[] | undefined | null): string {
  if (!slots || slots.length === 0) return "No weekly slots";
  return [...slots]
    .sort((a, b) => a.weekday - b.weekday || a.hour - b.hour || a.minute - b.minute)
    .map(formatSlot)
    .join(" · ");
}

/** "3 of 4 students". */
export function formatSeats(memberCount: number, maxStudents: number): string {
  return `${memberCount} of ${maxStudents} student${maxStudents === 1 ? "" : "s"}`;
}

export function isFull(b: { memberCount: number; maxStudents: number }): boolean {
  return b.memberCount >= b.maxStudents;
}

/** Where the batch is in its curriculum: "Lesson 3 of 24". */
export function formatProgress(p: { nextLesson: number; totalLessons: number }): string {
  return p.nextLesson > p.totalLessons
    ? `All ${p.totalLessons} lessons taught`
    : `Lesson ${p.nextLesson} of ${p.totalLessons}`;
}

export const SYNC_LABELS: Record<BatchMemberRow["sync"], string> = {
  ALIGNED: "In step",
  BEHIND: "Behind the batch",
  AHEAD: "Ahead of the batch",
};

// ── Teacher / student dashboards ────────────────────────────────────────────

/** What the teacher's roster says about a student's batch (null when 1-to-1). */
export interface RosterBatch {
  id: string;
  name: string;
  status: BatchStatus;
  memberCount: number;
  maxStudents: number;
  slots: { weekday: number; hour: number; minute: number }[];
}

/** One student of a batch class, as the teacher's calendar shows them. */
export interface BatchClassStudent {
  id: string;
  lessonId: string;
  fullName: string;
  avatarUrl: string | null;
  grade: string | null;
  age: number | null;
  spaceRank: string | null;
  lessonsCompleted: number;
  totalLessons: number;
  attendance: "PENDING" | "JOINED" | "ATTENDED" | "ABSENT";
}

export const ATTENDANCE_LABELS: Record<BatchClassStudent["attendance"], string> = {
  PENDING: "Not yet in",
  JOINED: "In class",
  ATTENDED: "Attended",
  ABSENT: "Absent",
};

/** The roster rows of a teacher, grouped so the members of one batch sit
 * together: each batch (alphabetical) with its students, then the 1-to-1
 * students. Order within a group is kept as given. */
export function groupRosterByBatch<T extends { batch: { id: string; name: string } | null }>(
  rows: T[],
): { key: string; batch: { id: string; name: string } | null; rows: T[] }[] {
  const groups = new Map<string, { key: string; batch: { id: string; name: string } | null; rows: T[] }>();
  for (const row of rows) {
    const key = row.batch ? `batch:${row.batch.id}` : "solo";
    if (!groups.has(key)) groups.set(key, { key, batch: row.batch, rows: [] });
    groups.get(key)!.rows.push(row);
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.batch && b.batch) return 1;
    if (a.batch && !b.batch) return -1;
    return (a.batch?.name ?? "").localeCompare(b.batch?.name ?? "");
  });
}
