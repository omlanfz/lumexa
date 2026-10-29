"use client";

import { useState } from "react";

// Layout
import MarketingNav    from "./MarketingNav";
import MarketingFooter from "./MarketingFooter";

import LumiChat        from "../LumiChat";
import HomeAuthRedirect from "./HomeAuthRedirect";

// Sections, in the order a parent reads them
import HeroSection          from "./HeroSection";
import InterestSelector, { type Interest } from "./InterestSelector";
import ShowcaseSection      from "./ShowcaseSection";
import TrustSection         from "./TrustSection";
import HowItWorksSection    from "./HowItWorksSection";
import ProgramsSection      from "./ProgramsSection";
import FormatsSection       from "./FormatsSection";
import FinalCTASection      from "./FinalCTASection";

export default function HomePage() {
  // Nothing is pre-selected: the page should not decide what the child is interested in.
  const [interest, setInterest] = useState<Interest | null>(null);

  return (
    <div className="bg-[#F7F9FF] dark:bg-[#050D1A] min-h-screen transition-colors duration-200">
      <HomeAuthRedirect />

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
