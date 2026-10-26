import type { Metadata } from "next";

// A private link: never indexed, and never leaked to other sites through the
// Referer header.
export const metadata: Metadata = {
  title: "Join your Lumexa trial class",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TrialJoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
