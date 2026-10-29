import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coding Class Pricing | Lumexa AI School",
  description:
    "Compare Private 1:1 Mentorship and Small Learning Batches of 2–4 students. Explore 8-lesson pricing and savings on complete learning programs.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
