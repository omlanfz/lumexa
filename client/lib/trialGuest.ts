// FILE PATH: client/lib/trialGuest.ts
//
// The public, no-account side of a free trial class: what a parent's private
// link (/trial/join/<token>) shows right now. These calls deliberately use
// plain axios, not the shared `api` instance, so they never carry a stored
// login and never trigger its "401 → go to /login" behaviour. The token goes in
// a POST body (never a URL) so it is not written to access logs.

import axios from "axios";

export type GuestState = "OPEN" | "NOT_YET" | "ENDED" | "CANCELLED" | "AWAITING_TEACHER";

export interface GuestStatus {
  state: GuestState;
  canJoin: boolean;
  message: string | null;
  childName: string;
  startAt: string | null;
  endAt: string | null;
  opensAt: string | null;
  closesAt: string | null;
  /** The server's clock when this was computed — countdowns use it, not the device's. */
  serverNow: string;
}

export type GuestStatusResult =
  | { ok: true; status: GuestStatus }
  | { ok: false; reason: "invalid" | "network" };

export async function fetchGuestStatus(token: string): Promise<GuestStatusResult> {
  try {
    const res = await axios.post<GuestStatus>(`${process.env.NEXT_PUBLIC_API_URL}/trial/guest/status`, { token });
    return { ok: true, status: res.data };
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    // Unknown, malformed or tampered links all look the same: not a valid link.
    return { ok: false, reason: status === 404 || status === 400 ? "invalid" : "network" };
  }
}

/** "HH:MM:SS" (or "MM:SS" under an hour) for a countdown of `ms` milliseconds. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** The class time in the viewer's own time zone, and in Bangladesh time. */
export function describeClassTime(startAt: string, endAt: string) {
  const date = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (tz: string | undefined, withDate: boolean) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      ...(withDate ? { weekday: "long", day: "numeric", month: "long" } : {}),
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(withDate ? date : end);
  const local = fmt(undefined, true);
  const localEnd = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(end);
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dhaka = `${new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)} (Bangladesh time, GMT+6)`;
  return { local: `${local} – ${localEnd}`, dhaka, showDhaka: localTz !== "Asia/Dhaka" };
}
