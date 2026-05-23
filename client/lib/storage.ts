/**
 * Safe localStorage utilities.
 *
 * Root cause of the "undefined" is not valid JSON crash:
 *   localStorage.setItem('user', undefined) stores the literal string "undefined".
 *   "undefined" is truthy, so `rawUser ? JSON.parse(rawUser) : null` passes the
 *   guard and JSON.parse("undefined") throws SyntaxError.
 *
 * This module centralises all auth-storage reads with safe parsing and auto-recovery.
 * It also implements a storage version stamp so that a breaking auth-schema change
 * (like the student-centric refactor) wipes stale credentials on first load.
 */

/** Increment this whenever the stored user object shape changes. */
const STORAGE_VERSION = '3';
const VERSION_KEY = 'lumexa_storage_v';

const AUTH_KEYS = ['token', 'user', 'last_student_id', 'lumexa_last_rank'];

/** Stored user shape we care about at parse-time. */
export interface StoredUser {
  id?: string;
  email?: string;
  fullName?: string;
  role?: string;
}

/**
 * On every app boot this runs once.  If the stored version doesn't match the
 * current constant we wipe all auth keys so users start from a clean login.
 */
export function migrateStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored !== STORAGE_VERSION) {
      AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
    }
  } catch {
    // localStorage blocked (private mode / storage full) — ignore
  }
}

/**
 * Parse the stored user object.  Returns null on any failure and clears the
 * corrupted value so the crash cannot recur on the next render.
 */
export function parseStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    // null  → not set
    // "undefined" → old code stored undefined as a string
    // ""    → empty
    if (!raw || raw === 'undefined' || raw === 'null') {
      if (raw === 'undefined') localStorage.removeItem('user');
      return null;
    }
    return JSON.parse(raw) as StoredUser;
  } catch {
    // Corrupted JSON — remove so the crash cannot recur
    localStorage.removeItem('user');
    return null;
  }
}

/** Convenience: just the role string, or null. */
export function getStoredRole(): string | null {
  return parseStoredUser()?.role ?? null;
}

/** Convenience: just the token string, or null. */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

/** Clear all auth keys (logout). */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
