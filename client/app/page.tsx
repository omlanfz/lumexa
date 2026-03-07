// FILE PATH: client/app/page.tsx
//
// ─── Issue 13 Fix: Remove Parent Root Layer — Direct Student Login ──────────
//
// ROOT CAUSE:
//   Every time a returning parent logs in they land on /dashboard, must find
//   their child in the student list, and then click "Open Dashboard". This is
//   friction for a user who always manages one student and just wants to get
//   to their dashboard immediately.
//
// DECISION:
//   COPPA compliance is preserved — parental authentication is still required.
//   We do NOT remove parental auth. Instead we add a "Remember Last Student"
//   feature: when a parent opens a student's dashboard we persist the
//   student's id to localStorage under the key "last_student_id". On the next
//   visit the root redirect checks for that key and jumps straight to the
//   student's dashboard, skipping the selector screen entirely.
//
// ROUTING TABLE:
//   Not logged in          → /login
//   TEACHER                → /teacher-dashboard
//   ADMIN                  → /admin
//   PARENT + remembered    → /student-dashboard/:last_student_id
//   PARENT + no memory     → /dashboard   (normal selector screen)
//   Unknown role           → /login

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") ?? "null");

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (user.role === "TEACHER") {
      router.replace("/teacher-dashboard");
      return;
    }

    if (user.role === "ADMIN") {
      router.replace("/admin");
      return;
    }

    if (user.role === "PARENT") {
      // Issue 13: skip the student selector for returning users
      const lastStudentId = localStorage.getItem("last_student_id");
      if (lastStudentId) {
        router.replace(`/student-dashboard/${lastStudentId}`);
      } else {
        router.replace("/dashboard");
      }
      return;
    }

    // Unknown role – force re-login
    router.replace("/login");
  }, [router]);

  // Blank splash while redirect is in flight
  return <div className="min-h-screen bg-[#050D1A]" />;
}
