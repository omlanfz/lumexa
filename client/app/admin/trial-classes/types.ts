// Shapes returned by the admin trial endpoints (server/src/trial/trial-admin.*).

export interface EmailNotification {
  kind: string;
  status: string; // SENT | FAILED | PENDING | NOT_SENT
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
}

export interface WhatsAppNotification {
  id: string;
  kind: string;
  status: string; // PENDING | SENDING | SENT | FAILED | SKIPPED
  scheduledFor: string;
  sentAt: string | null;
  attempts: number;
  errorCode: string | null;
  lastError: string | null;
  willRetry: boolean;
}

export interface HistoryEntry {
  id: string;
  action: string;
  actorRole: string | null;
  reason: string | null;
  createdAt: string;
  beforeData: unknown;
  afterData: unknown;
}

export type TrialStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED" | "MISSED";

/** What the parent's private classroom link does right now (server-decided). */
export type ClassroomState = "OPEN" | "NOT_YET" | "ENDED" | "CANCELLED" | "AWAITING_TEACHER";

export interface TrialAppointment {
  id: string;
  reference: string;
  status: TrialStatus;
  teacher: { id: string; name: string } | null;
  teacherAssignedAt: string | null;
  teacherJoinedAt: string | null;
  guestJoinedAt: string | null;
  classroom: {
    state: ClassroomState;
    opensAt: string;
    closesAt: string;
    reminderDueAt: string | null;
    reminderEmailSentAt: string | null;
  };
  bookedBy: "PARENT" | "ADMIN";
  startAt: string;
  endAt: string;
  timezone: string;
  timezoneLabel: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  whatsappConsent: boolean;
  childName: string;
  childAge: number;
  program: string;
  message: string | null;
  parentTimezone: string | null;
  adminNotes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  rescheduleCount: number;
  createdAt: string;
  outsideAvailability: boolean;
  notifications: {
    emails: EmailNotification[];
    whatsapp: WhatsAppNotification[];
    needsAttention: boolean;
  };
  history?: HistoryEntry[];
}

export interface AvailabilityChanges {
  nowBookable: string[];
  noLongerBookable: string[];
}

export interface AssignableTeacher {
  id: string;
  name: string;
  avatarUrl: string | null;
  subjects: string[];
  available: boolean;
  busyReason: string | null;
}

export interface Summary {
  upcoming: number;
  needsTeacher: number;
  outsideAvailability: number;
  failedWhatsApp: number;
}

export interface AvailabilityDay {
  date: string;
  status: "available" | "full" | "unavailable";
  slots: string[];
}

export interface Rule {
  id: string;
  weekday: number;
  weekdayLabel: string;
  startTime: string;
  endTime: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  note: string | null;
}
export interface OneOffWindow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string | null;
}
export interface Block {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string;
}
export interface AvailabilityConfig {
  timezone: string;
  rules: Rule[];
  windows: OneOffWindow[];
  blocks: Block[];
}

export interface AffectedAppointment {
  id: string;
  reference: string;
  parentName: string;
  childName: string;
  startAt: string;
  endAt: string;
}

export const KIND_LABELS: Record<string, string> = {
  PARENT_CONFIRMATION: "Parent confirmation",
  PARENT_CLASS_DETAILS: "Class details + link",
  PARENT_REMINDER: "1-hour reminder + link",
  ADMIN_ALERT: "Admin alert",
  PARENT_RESCHEDULED: "Reschedule notice",
  PARENT_CANCELLED: "Cancellation notice",
};

export function errMessage(err: unknown, fallback = "Something went wrong."): string {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(" ");
  return m ?? fallback;
}

/** Half-hour options for time selects: value "15:30", label "3:30 PM". */
export function timeOptions(kind: "start" | "end"): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let m = kind === "start" ? 0 : 30; m <= (kind === "start" ? 23 * 60 + 30 : 24 * 60); m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const value = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const suffix = h === 24 ? "AM (midnight)" : h >= 12 ? "PM" : "AM";
    out.push({ value, label: `${h12}:${String(min).padStart(2, "0")} ${suffix}` });
  }
  return out;
}

export function timeLabel(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h === 24 ? "AM" : h >= 12 ? "PM" : "AM"}`;
}
