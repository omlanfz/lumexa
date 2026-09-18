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

// Backup of the admin's own token/user while they're viewing a teacher or
// student's dashboard via impersonation (see startImpersonation below) —
// kept separate from 'token'/'user' so the admin's identity can be restored
// on exit. Included in AUTH_KEYS so a plain logout while impersonating also
// fully clears the admin's stashed session rather than leaving it dangling.
const IMPERSONATION_TOKEN_KEY = 'admin_impersonator_token';
const IMPERSONATION_USER_KEY = 'admin_impersonator_user';
const IMPERSONATION_RETURN_KEY = 'admin_impersonator_return_path';

const AUTH_KEYS = [
  'token',
  'user',
  'last_student_id',
  'lumexa_last_rank',
  IMPERSONATION_TOKEN_KEY,
  IMPERSONATION_USER_KEY,
  IMPERSONATION_RETURN_KEY,
];

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

// ─── Admin impersonation ("view dashboard as") ─────────────────────────────
//
// Swaps the active session for a teacher/student's own login token (issued
// by POST /admin/{teachers,students}/:id/impersonate) so the admin lands on
// that person's real dashboard with full read/write access, no separate
// login required. The admin's own token/user are stashed first so
// endImpersonation() can restore them.

export function startImpersonation(
  impersonatedToken: string,
  impersonatedUser: StoredUser,
  returnPath: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    const currentToken = localStorage.getItem('token');
    const currentUserRaw = localStorage.getItem('user');
    if (currentToken && currentUserRaw) {
      localStorage.setItem(IMPERSONATION_TOKEN_KEY, currentToken);
      localStorage.setItem(IMPERSONATION_USER_KEY, currentUserRaw);
      localStorage.setItem(IMPERSONATION_RETURN_KEY, returnPath);
    }
    localStorage.setItem('token', impersonatedToken);
    localStorage.setItem('user', JSON.stringify(impersonatedUser));
  } catch {
    // localStorage blocked — ignore, the caller's navigation will just hit
    // the login page since no token will be set.
  }
}

export interface ImpersonationBackup {
  token: string;
  user: StoredUser;
  returnPath: string;
}

/** Non-null while the current session is an admin impersonating a
 * teacher/student — used to render the "Exit to Admin" banner. */
export function getImpersonationBackup(): ImpersonationBackup | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem(IMPERSONATION_TOKEN_KEY);
    const rawUser = localStorage.getItem(IMPERSONATION_USER_KEY);
    if (!token || !rawUser) return null;
    return {
      token,
      user: JSON.parse(rawUser) as StoredUser,
      returnPath: localStorage.getItem(IMPERSONATION_RETURN_KEY) || '/admin',
    };
  } catch {
    return null;
  }
}

/** Full-page navigation (not router.push) — used after swapping the active
 * session so every bit of in-memory app state reflects it, rather than only
 * localStorage. Kept as a plain module-level function (not inlined at the
 * call site) so mutating `window.location` isn't attributed to whichever
 * component happens to call it. */
export function hardNavigate(path: string): void {
  if (typeof window === 'undefined') return;
  window.location.href = path;
}

/** Restores the admin's own session and returns the path they should be
 * sent back to. Safe to call even if no impersonation is in progress. */
export function endImpersonation(): string {
  if (typeof window === 'undefined') return '/admin';
  const backup = getImpersonationBackup();
  try {
    if (backup) {
      localStorage.setItem('token', backup.token);
      localStorage.setItem('user', JSON.stringify(backup.user));
    }
    localStorage.removeItem(IMPERSONATION_TOKEN_KEY);
    localStorage.removeItem(IMPERSONATION_USER_KEY);
    localStorage.removeItem(IMPERSONATION_RETURN_KEY);
  } catch {
    // ignore
  }
  return backup?.returnPath || '/admin';
}
