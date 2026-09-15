// FILE PATH: client/app/teacher-resources/page.tsx
//
// Where admins will publish curricula, lesson plans, demo recordings,
// lesson materials, project links, etc. Empty state only for now — no
// backend model exists yet for admin-published resources.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import TeacherLayout from "../../components/TeacherLayout";

interface Profile {
  user: { fullName: string; avatarUrl?: string | null };
}

function TeacherResourcesContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .get("/teachers/me/profile")
      .then((res) => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
        <div className="w-10 h-10 border-2 border-[var(--t-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <TeacherLayout
      teacherName={profile?.user?.fullName ?? "Teacher"}
      avatarUrl={profile?.user?.avatarUrl ?? null}
    >
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--t-text)] mb-6">Lumexa Resources</h1>

        <div className="t-card p-10 sm:p-16 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-semibold text-[var(--t-text)]">No resources yet</p>
          <p className="text-sm text-[var(--t-text-muted)] mt-1 max-w-sm mx-auto">
            Curricula, lesson plans, demo recordings, and project links from
            Lumexa will appear here once published.
          </p>
        </div>
      </div>
    </TeacherLayout>
  );
}

export default function TeacherResourcesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
          <div className="w-10 h-10 border-2 border-[var(--t-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherResourcesContent />
    </Suspense>
  );
}
