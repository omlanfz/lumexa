import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coding Programs for Kids: Games, Web & AI | Lumexa",
  description:
    "Explore live coding programs for ages 6–18, from beginner coding and game development to web development, data science, and AI. Find your child's path.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
