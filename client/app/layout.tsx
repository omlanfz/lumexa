// FILE PATH: client/app/layout.tsx
//
// ─── Issue 14 Fix: Student Dark Mode ───────────────────────────────────────
//
// ROOT CAUSE:
//   If ThemeProvider is not present in the root layout, any page that calls
//   useTheme() / ThemeToggle will silently use the default context value
//   (theme: "dark", toggleTheme: noop) and dark mode toggling will never
//   actually add/remove the "dark" class on <html>.
//
// FIX:
//   Ensure ThemeProvider wraps ALL children at the root layout level.
//   `suppressHydrationWarning` is required on <html> because ThemeProvider
//   reads localStorage on the client and applies the saved theme class
//   immediately after hydration — this produces a controlled mismatch that
//   is intentional and harmless.

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lumexa — Live Tutoring",
  description:
    "Connect with expert teachers for live one-on-one tutoring sessions.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: ThemeProvider applies "dark"/"light" class to
    // this element after hydration. The brief server/client mismatch is
    // expected and does not affect functionality.
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        {/*
          Issue 14: ThemeProvider must live HERE so every page — including
          student-dashboard — has access to useTheme() and the <html> element
          receives the correct dark/light class on every route.
        */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
