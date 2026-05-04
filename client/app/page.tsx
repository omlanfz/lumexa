"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Layout
import MarketingNav    from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";

// Gamification overlays (fixed, z-indexed)
import LumiNudge       from "../components/marketing/LumiNudge";
import ScrollMilestones from "../components/marketing/ScrollMilestones";

// Sections — in optimal conversion order
import HeroSection          from "../components/marketing/HeroSection";
import InterestSelector, { type Interest } from "../components/marketing/InterestSelector";
import ShowcaseSection      from "../components/marketing/ShowcaseSection";
import TrustSection         from "../components/marketing/TrustSection";
import HowItWorksSection    from "../components/marketing/HowItWorksSection";
import InteractiveCodeDemo  from "../components/marketing/InteractiveCodeDemo";
import TestimonialsSection  from "../components/marketing/TestimonialsSection";
import OutcomesSection      from "../components/marketing/OutcomesSection";
import PathwaysSection      from "../components/marketing/PathwaysSection";
import BatchSection         from "../components/marketing/BatchSection";
import JourneySection       from "../components/marketing/JourneySection";
import PricingSection       from "../components/marketing/PricingSection";
import FinalCTASection      from "../components/marketing/FinalCTASection";

export default function RootPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [interest, setInterest] = useState<Interest>("ai");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") ?? "null");

    if (!token || !user) {
      setReady(true);
      return;
    }

    if (user.role === "TEACHER") { router.replace("/teacher-dashboard"); return; }
    if (user.role === "ADMIN")   { router.replace("/admin"); return; }
    if (user.role === "PARENT") {
      const lastStudentId = localStorage.getItem("last_student_id");
      router.replace(lastStudentId ? `/student-dashboard/${lastStudentId}` : "/dashboard");
      return;
    }
    router.replace("/login");
  }, [router]);

  if (!ready) {
    // Blank splash while checking auth — matches landing bg so there's no flash
    return <div className="min-h-screen bg-[#F7F9FF]" />;
  }

  return (
    <div className="bg-[#F7F9FF] min-h-screen">
      {/* Fixed gamification overlays */}
      <ScrollMilestones />
      <LumiNudge />

      <MarketingNav />

      <main>
        {/*
          CONVERSION FLOW (from strategy analysis):
          1. Hero           — outcome-specific hook + glass code preview
          2. InterestSelect — personalise the journey ("What does your child love?")
          3. Showcase       — filtered real student projects (proof of outcomes)
          4. Trust          — parent safety + credibility signals
          5. HowItWorks     — 3-step simplicity (reduces cognitive load)
          6. CodeDemo       — interactive "build it yourself" moment (IKEA Effect)
          7. Testimonials   — age-matched social proof
          8. Outcomes       — transformation framing (before → after)
          9. Pathways       — course discovery (comes after value is established)
         10. Batch          — format choice (batch / pod / 1-on-1)
         11. Journey        — milestone progression (commitment escalation)
         12. Pricing        — LAST before CTA (price shown after all value established)
         13. FinalCTA       — dark high-contrast punch
        */}
        <div id="hero">
          <HeroSection />
        </div>

        <InterestSelector selected={interest} onSelect={setInterest} />

        <ShowcaseSection interest={interest} />

        <TrustSection />

        <HowItWorksSection />

        <InteractiveCodeDemo />

        <TestimonialsSection />

        <OutcomesSection />

        <PathwaysSection />

        <BatchSection />

        <JourneySection />

        <PricingSection />

        <FinalCTASection />
      </main>

      <MarketingFooter />
    </div>
  );
}
