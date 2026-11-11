"use client";

import { usePathname } from "next/navigation";
import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import LumiChat from "../../components/LumiChat";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="bg-[#F7F9FF] dark:bg-[#050D1A] min-h-screen transition-colors duration-200">
      <MarketingNav />
      <main className="pt-16">
        {/* Keyed by route so each page eases in on navigation, as the dashboards do */}
        <div key={pathname} className="fade-in">
          {children}
        </div>
      </main>
      <MarketingFooter />
      <LumiChat variant="parent" />
    </div>
  );
}
