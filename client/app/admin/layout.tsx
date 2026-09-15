"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminTopNav from "@/components/AdminTopNav";
import api from "@/lib/axios";
import { parseStoredUser, getStoredToken } from "@/lib/storage";

interface AdminProfile {
  id: string;
  fullName: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    const user = parseStoredUser();

    if (!token || !user) {
      router.push("/login");
      return;
    }
    if (user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    // Re-verify against the backend rather than trusting localStorage alone —
    // every /admin/* API route already enforces Role.ADMIN server-side, this
    // just confirms the session is still valid before rendering the shell.
    api
      .get("/admin/dashboard")
      .then(() => {
        setProfile({ id: user.id ?? "", fullName: user.fullName ?? "Admin", role: user.role ?? "" });
        setChecked(true);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-[var(--a-bg)] flex items-center justify-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--a-accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--a-bg)] transition-colors duration-300">
      <AdminTopNav adminName={profile?.fullName ?? "Admin"} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div key={pathname} className="fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
