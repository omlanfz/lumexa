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
    /*
     * suppressHydrationWarning is required because we modify the className
     * via the inline script below BEFORE React hydrates. Without it, React
     * warns about a mismatch between server-rendered HTML and the DOM.
     */
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
         * Anti-FOUC (Flash Of Unstyled Content) script.
         * Runs synchronously before the browser paints — reads the stored
         * theme from localStorage and immediately adds the correct class to
         * <html>. This prevents a dark→light or light→dark flash on load.
         *
         * MUST be dangerouslySetInnerHTML (not a separate .js file) to
         * guarantee it executes before the first paint.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var t = localStorage.getItem('lumexa-theme') || 'dark';
                  document.documentElement.classList.add(t);
                  document.documentElement.style.colorScheme = t;
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
