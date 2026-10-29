"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseStoredUser, getStoredToken } from "@/lib/storage";

// Signed-in visitors belong in their dashboard, not on the marketing page. The
// homepage renders for everyone straight away; this only runs after hydration
// and renders nothing, so a new visitor never waits on it.
export default function HomeAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    const user = parseStoredUser();
    if (!token || !user) return;

    if (user.role === "TEACHER") { router.replace("/teacher-dashboard"); return; }
    if (user.role === "ADMIN")   { router.replace("/admin"); return; }
    if (user.role === "STUDENT") { router.replace("/student-dashboard"); return; }
    if (user.role === "PARENT") {
      const lastStudentId = localStorage.getItem("last_student_id");
      router.replace(lastStudentId ? `/student-dashboard/${lastStudentId}` : "/dashboard");
      return;
    }
    router.replace("/login");
  }, [router]);

  return null;
}
