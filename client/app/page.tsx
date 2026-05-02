// FILE PATH: client/app/page.tsx
//
// Landing page for unauthenticated visitors.
// Authenticated users are redirected to their dashboard by role.
//
// ROUTING TABLE (same as before — no behaviour change for logged-in users):
//   Not logged in          → show landing page
//   TEACHER                → /teacher-dashboard
//   ADMIN                  → /admin
//   PARENT + remembered    → /student-dashboard/:last_student_id
//   PARENT + no memory     → /dashboard
//   Unknown role           → /login

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import HeroSection from "../components/marketing/HeroSection";
import PathwaysSection from "../components/marketing/PathwaysSection";
import JourneySection from "../components/marketing/JourneySection";
import OutcomesSection from "../components/marketing/OutcomesSection";
import ShowcaseSection from "../components/marketing/ShowcaseSection";
import TrustSection from "../components/marketing/TrustSection";
import BatchSection from "../components/marketing/BatchSection";
import PricingSection from "../components/marketing/PricingSection";
import TestimonialsSection from "../components/marketing/TestimonialsSection";
import FinalCTASection from "../components/marketing/FinalCTASection";

export default function RootPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") ?? "null");

    if (!token || !user) {
      // Not logged in — show the landing page
      setReady(true);
      return;
    }

    // Logged in — redirect by role (same logic as before)
    if (user.role === "TEACHER") {
      router.replace("/teacher-dashboard");
      return;
    }
    if (user.role === "ADMIN") {
      router.replace("/admin");
      return;
    }
    if (user.role === "PARENT") {
      const lastStudentId = localStorage.getItem("last_student_id");
      router.replace(lastStudentId ? `/student-dashboard/${lastStudentId}` : "/dashboard");
      return;
    }
    router.replace("/login");
  }, [router]);

  // Blank splash while checking auth (prevents flash of landing page for logged-in users)
  if (!ready) {
    return <div className="min-h-screen bg-[#050D1A]" />;
  }

  return (
    <div className="bg-[#050D1A] min-h-screen">
      <MarketingNav />
      <main>
        <HeroSection />
        <PathwaysSection />
        <BatchSection />
        <JourneySection />
        <OutcomesSection />
        <ShowcaseSection />
        <TrustSection />
        <PricingSection />
        <TestimonialsSection />
        <FinalCTASection />
      </main>
      <MarketingFooter />
    </div>
  );
}
