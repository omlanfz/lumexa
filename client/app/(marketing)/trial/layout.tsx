import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Free Coding Trial for Your Child | Lumexa",
  description:
    "Book a free live coding trial for your child. Explore games, web development, Python, and AI, and discover a learning path that suits their interests.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
