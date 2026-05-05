import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import LumiChat from "../../components/LumiChat";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F7F9FF] min-h-screen">
      <MarketingNav />
      <main className="pt-16">{children}</main>
      <MarketingFooter />
      <LumiChat variant="parent" />
    </div>
  );
}
