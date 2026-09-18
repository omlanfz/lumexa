// FILE PATH: client/components/ImpersonationBanner.tsx
//
// Persistent strip shown on every page while an admin is viewing a
// teacher/student's dashboard via impersonation (see lib/storage.ts). Lets
// them get back to their own admin session from anywhere in the app instead
// of hunting for a way back.

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getImpersonationBackup, endImpersonation, hardNavigate, parseStoredUser } from "@/lib/storage";

export default function ImpersonationBanner() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    // Deferred a tick: localStorage is only available client-side, so this
    // has to run post-mount rather than during render (avoids a hydration
    // mismatch) — the microtask hop also keeps this an async continuation
    // rather than a synchronous effect-body update.
    Promise.resolve().then(() => {
      const backup = getImpersonationBackup();
      setActive(!!backup);
      const current = parseStoredUser();
      setName(current?.fullName ?? "this account");
      setRole(current?.role ?? "");
    });
  }, [pathname]);

  if (!active) return null;

  const exit = () => {
    const returnPath = endImpersonation();
    hardNavigate(returnPath);
  };

  return (
    <div className="sticky top-0 z-[200] bg-amber-500 text-amber-950 text-sm font-semibold px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 shadow-md">
      <span>
        🛠️ Admin view — you&rsquo;re viewing {name}&rsquo;s {role === "STUDENT" ? "student" : "teacher"} dashboard
      </span>
      <button
        onClick={exit}
        className="px-3 py-1 rounded-md bg-amber-950 text-amber-50 hover:bg-amber-900 transition-colors text-xs font-bold"
      >
        Exit to Admin
      </button>
    </div>
  );
}
