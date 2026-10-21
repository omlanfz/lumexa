"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseStoredUser, getStoredToken } from "@/lib/storage";

// Layout
import MarketingNav    from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";

import LumiChat        from "../components/LumiChat";

// Sections, in the order a parent reads them
import HeroSection          from "../components/marketing/HeroSection";
import InterestSelector, { type Interest } from "../components/marketing/InterestSelector";
import ShowcaseSection      from "../components/marketing/ShowcaseSection";
import TrustSection         from "../components/marketing/TrustSection";
import HowItWorksSection    from "../components/marketing/HowItWorksSection";
import ProgramsSection      from "../components/marketing/ProgramsSection";
import FormatsSection       from "../components/marketing/FormatsSection";
import FinalCTASection      from "../components/marketing/FinalCTASection";

export default function RootPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  // Nothing is pre-selected: the page should not decide what the child is interested in.
  const [interest, setInterest] = useState<Interest | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    const user = parseStoredUser();

    if (!token || !user) {
      setReady(true);
      return;
    }

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

  // The page renders blank while the auth check runs, so a link like /#how-it-works
  // has nothing to land on at load time. Scroll to it once the content exists.
  useEffect(() => {
    if (!ready || !window.location.hash) return;
    const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (el) requestAnimationFrame(() => el.scrollIntoView());
  }, [ready]);

  if (!ready) {
    // Blank splash while checking auth — matches landing bg so there's no flash
    return <div className="min-h-screen bg-[#F7F9FF] dark:bg-[#050D1A]" />;
  }

  return (
    <div className="bg-[#F7F9FF] dark:bg-[#050D1A] min-h-screen transition-colors duration-200">
      <LumiChat variant="parent" />

      <MarketingNav />

      <main>
        <HeroSection />

        <InterestSelector selected={interest} onSelect={setInterest} />

        <ShowcaseSection interest={interest} onClear={() => setInterest(null)} />

        <HowItWorksSection />

        <ProgramsSection />

        <FormatsSection />

        <TrustSection />

        <FinalCTASection />
      </main>

      <MarketingFooter />
    </div>
  );
}
