/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LUMEXA — UX LABEL CONSTANTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Single source of truth for all user-facing text across the platform.
 * Implements the HYBRID TERMINOLOGY system:
 *   - primary:  clear real-world label (shown prominently)
 *   - theme:    space-themed subtitle (shown smaller, decorative)
 *
 * USAGE:
 *   import { LABELS } from "@/lib/labels";
 *
 *   // In JSX:
 *   <h1>{LABELS.PARENT.primary}</h1>
 *   <p className="text-sm text-gray-400">{LABELS.PARENT.theme}</p>
 *
 *   // Or use the helper component: <HybridLabel id="PARENT" />
 *
 * HOW TO ADD NEW LABELS:
 *   Add a new key following the same structure.
 *   Never hard-code display strings in components — always reference this file.
 *
 * i18n NOTE:
 *   To support multiple languages in future, replace string values with
 *   locale-keyed objects: { en: "Parent", es: "Padre" }
 *   and update the helper to read from the active locale.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const LABELS = {
  // ── Roles ───────────────────────────────────────────────────────────────────
  PARENT: {
    primary: "Parent",
    theme: "Commander",
  },
  TEACHER: {
    primary: "Teacher",
    theme: "Pilot",
  },
  STUDENT: {
    primary: "Student",
    theme: "Cadet",
  },

  // ── Pages / Sections ────────────────────────────────────────────────────────
  DASHBOARD: {
    primary: "Dashboard",
    theme: "Mission Control",
  },
  TEACHER_DASHBOARD: {
    primary: "Teacher Dashboard",
    theme: "Flight Deck",
  },
  MARKETPLACE: {
    primary: "Find a Teacher",
    theme: "Mission Selection",
  },
  CLASSROOM: {
    primary: "Classroom",
    theme: "Star Lab",
  },
  CALENDAR: {
    primary: "Schedule",
    theme: "Flight Log",
  },
  LEADERBOARD: {
    primary: "Leaderboard",
    theme: "Commander Rankings",
  },
  SETTINGS: {
    primary: "Settings",
    theme: "Pilot Configuration",
  },
  EARNINGS: {
    primary: "Earnings",
    theme: "Reward Ledger",
  },

  // ── Actions ─────────────────────────────────────────────────────────────────
  CREATE_ACCOUNT: {
    primary: "Create Account",
    theme: "Initiate Launch",
  },
  LOGIN: {
    primary: "Log In",
    theme: "Access Portal",
  },
  LOGOUT: {
    primary: "Logout",
    theme: "Abort Mission",
  },
  ADD_STUDENT: {
    primary: "Add Student",
    theme: "Recruit Cadet",
  },
  BOOK_LESSON: {
    primary: "Book Lesson",
    theme: "Assign Mission",
  },
  JOIN_CLASS: {
    primary: "Join Class",
    theme: "Enter Star Lab",
  },
  CANCEL_BOOKING: {
    primary: "Cancel Booking",
    theme: "Abort Mission",
  },
  ADD_AVAILABILITY: {
    primary: "Add Time Slot",
    theme: "Log Flight Availability",
  },

  // ── Status labels ────────────────────────────────────────────────────────────
  LOADING_DASHBOARD: {
    primary: "Loading Dashboard...",
    theme: "Mission Control",
  },
  LOADING_TEACHER: {
    primary: "Loading Teacher Dashboard...",
    theme: "Flight Deck",
  },
  LOADING_MARKETPLACE: {
    primary: "Loading Teachers...",
    theme: "Scanning Sector",
  },
  NO_STUDENTS: {
    primary: "No students yet",
    theme: "No cadets enrolled",
  },
  NO_SHIFTS: {
    primary: "No time slots added yet",
    theme: "No flight windows open",
  },
  NO_BOOKINGS: {
    primary: "No lessons scheduled",
    theme: "No missions assigned",
  },
  UPCOMING_CLASS: {
    primary: "Upcoming Class",
    theme: "Next Mission",
  },
  LIVE_NOW: {
    primary: "Live Now",
    theme: "Mission Active",
  },
} as const;

export type LabelKey = keyof typeof LABELS;

/**
 * Get the primary label for a given key.
 * Use when you only need the real-world text.
 */
export const primary = (key: LabelKey): string => LABELS[key].primary;

/**
 * Get the theme (space) label for a given key.
 * Use when you only need the space-themed subtitle.
 */
export const theme = (key: LabelKey): string => LABELS[key].theme;
