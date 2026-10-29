import type { Metadata } from "next";
import HomePage from "@/components/marketing/HomePage";

export const metadata: Metadata = {
  title: "Online Coding Classes for Kids | Lumexa AI School",
  description:
    "Live online coding classes for ages 6–18. Kids build games, websites, and AI projects with teacher guidance. Explore programs or try a free lesson.",
};

export default function RootPage() {
  return <HomePage />;
}
