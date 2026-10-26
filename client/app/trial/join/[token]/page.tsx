// FILE PATH: client/app/trial/join/[token]/page.tsx
//
// The private page a parent opens from the trial-class email / WhatsApp link.
// No account, no login, no dashboard: the secret token in the URL is the only
// credential, and the server decides (on every request) whether it may enter —
// confirmed trial, teacher assigned, inside the joining window. This page only
// shows that decision and, when allowed, hands over to the same classroom the
// teacher is in (ClassroomExperience in guest mode).

"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import ClassroomExperience from "@/components/classroom/ClassroomExperience";
import { describeClassTime, fetchGuestStatus, formatCountdown, type GuestStatus } from "@/lib/trialGuest";

interface PageProps {
  params: Promise<{ token: string }>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="cr-root min-h-screen flex items-center justify-center p-5" data-theme="dark">
      <div className="w-full max-w-md rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-surface)] p-6 sm:p-8 shadow-2xl text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="Lumexa" className="mx-auto h-12 w-12 mb-4" />
        {children}
      </div>
    </div>
  );
}

const TIPS = [
  "Use a laptop, tablet or phone with a working camera and microphone.",
  "Find a quiet spot and join a couple of minutes early.",
  "No account or app is needed — just press Join.",
];

export default function TrialJoinPage({ params }: PageProps) {
  const { token } = use(params);
  const [status, setStatus] = useState<GuestStatus | null>(null);
  const [problem, setProblem] = useState<"invalid" | "network" | null>(null);
  const [inClass, setInClass] = useState(false);
  // server clock − device clock, so a wrong device clock cannot open the room early
  const offsetRef = useRef(0);
  const [nowMs, setNowMs] = useState(0);

  const refresh = useCallback(async () => {
    const res = await fetchGuestStatus(token);
    if (res.ok) {
      offsetRef.current = new Date(res.status.serverNow).getTime() - Date.now();
      setNowMs(Date.now() + offsetRef.current);
      setStatus(res.status);
      setProblem(null);
    } else {
      setProblem(res.reason);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Tick every second while waiting, and re-ask the server when the room should
  // have opened — and every minute while no teacher is assigned yet.
  useEffect(() => {
    if (!status || inClass) return;
    if (status.state !== "NOT_YET" && status.state !== "AWAITING_TEACHER") return;
    const timer = setInterval(() => {
      const now = Date.now() + offsetRef.current;
      setNowMs(now);
      if (status.state === "NOT_YET" && status.opensAt && now >= new Date(status.opensAt).getTime()) {
        void refresh();
      }
    }, 1000);
    const poll =
      status.state === "AWAITING_TEACHER" ? setInterval(() => void refresh(), 60_000) : null;
    return () => {
      clearInterval(timer);
      if (poll) clearInterval(poll);
    };
  }, [status, inClass, refresh]);

  if (inClass) {
    return (
      <ClassroomExperience
        id="trial-guest"
        isLesson={false}
        guestToken={token}
        onExit={() => {
          setInClass(false);
          void refresh();
        }}
      />
    );
  }

  if (problem === "invalid") {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-[var(--cr-text)] mb-2">This link isn&apos;t valid</h1>
        <p className="text-sm text-[var(--cr-text-muted)]">
          Please use the exact link from your Lumexa email or WhatsApp message. If you need help, reply to that email or
          WhatsApp us on +880 1522 122194.
        </p>
      </Shell>
    );
  }

  if (!status) {
    return (
      <Shell>
        {problem === "network" ? (
          <>
            <p className="text-sm text-[var(--cr-text-muted)] mb-4">We couldn&apos;t reach Lumexa. Check your connection and try again.</p>
            <button
              onClick={() => void refresh()}
              className="px-4 py-2 rounded-lg bg-[var(--cr-accent)] text-black text-sm font-semibold hover:opacity-90"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto w-8 h-8 border-2 border-[var(--cr-accent)] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-[var(--cr-text-muted)]">Checking your class…</p>
          </>
        )}
      </Shell>
    );
  }

  const time = status.startAt && status.endAt ? describeClassTime(status.startAt, status.endAt) : null;
  const opensIn = status.opensAt ? new Date(status.opensAt).getTime() - nowMs : 0;

  return (
    <Shell>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cr-accent)] mb-1">Free trial class</p>
      <h1 className="text-xl font-bold text-[var(--cr-text)] mb-1">{status.childName}&apos;s Lumexa class</h1>
      {time && (
        <div className="text-sm text-[var(--cr-text-muted)] mb-5">
          <p className="text-[var(--cr-text)] font-medium">{time.local}</p>
          {time.showDhaka && <p className="text-xs mt-0.5">{time.dhaka}</p>}
        </div>
      )}

      {status.state === "OPEN" && (
        <>
          <p className="text-sm text-[var(--cr-text-muted)] mb-4">The classroom is open. Your teacher will meet you inside.</p>
          <button
            onClick={() => setInClass(true)}
            className="w-full py-3 rounded-xl bg-[var(--cr-accent)] text-black font-semibold hover:opacity-90 transition-opacity"
          >
            Join class
          </button>
        </>
      )}

      {status.state === "NOT_YET" && (
        <>
          <p className="text-xs text-[var(--cr-text-faint)] mb-1">The classroom opens 10 minutes before the start, in</p>
          <p className="text-3xl font-bold tabular-nums text-[var(--cr-text)] mb-4" aria-live="off">
            {formatCountdown(opensIn)}
          </p>
          <button
            disabled
            className="w-full py-3 rounded-xl bg-[var(--cr-surface-3)] text-[var(--cr-text-faint)] font-semibold cursor-not-allowed"
          >
            Join class
          </button>
          <p className="text-xs text-[var(--cr-text-faint)] mt-2">You can keep this page open — it unlocks automatically.</p>
        </>
      )}

      {(status.state === "AWAITING_TEACHER" || status.state === "ENDED" || status.state === "CANCELLED") && (
        <p className="text-sm text-[var(--cr-text-muted)]" role="status">
          {status.message}
        </p>
      )}

      {(status.state === "OPEN" || status.state === "NOT_YET") && (
        <ul className="mt-6 text-left text-xs text-[var(--cr-text-muted)] space-y-1.5">
          {TIPS.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden className="text-[var(--cr-accent)]">•</span>
              {t}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-[11px] text-[var(--cr-text-faint)]">
        Need help? WhatsApp +880 1522 122194 or email lumexa.school@gmail.com
      </p>
    </Shell>
  );
}
