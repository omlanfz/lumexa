// FILE PATH: client/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumexa — Space-Powered Learning",
  description:
    "Book live tutoring sessions in an immersive space learning experience.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flash: runs sync before React hydrates. Reads localStorage → adds class to <html>. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('lumexa-theme')||'dark';var h=document.documentElement;h.classList.remove('dark','light');h.classList.add(t);h.style.colorScheme=t;h.setAttribute('data-theme',t);}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
