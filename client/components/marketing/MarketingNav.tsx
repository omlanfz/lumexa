"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { parseStoredUser } from "@/lib/storage";

// How It Works lives on the homepage, so the link works from every marketing page.
const NAV_LINKS = [
  { label: "Programs", href: "/programs" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

function useNavTheme() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("lumexa-theme");
    const dark = stored === "dark";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem("lumexa-theme", next ? "dark" : "light");
    } catch {
      // storage can be blocked (private mode); the theme still switches for this visit
    }
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    root.classList.toggle("light", !next);
    root.style.colorScheme = next ? "dark" : "light";
  };
  return { isDark, toggle };
}

function ThemeToggleButton({ isDark, toggle, className }: { isDark: boolean; toggle: () => void; className: string }) {
  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggle } = useNavTheme();

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      setMobileOpen(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    setAuthed(!!token);

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleDashboard = () => {
    const user = parseStoredUser();
    if (!user) { router.push("/login"); return; }
    if (user.role === "TEACHER") router.push("/teacher-dashboard");
    else if (user.role === "ADMIN") router.push("/admin");
    else if (user.role === "STUDENT") router.push("/student-dashboard");
    else {
      const last = localStorage.getItem("last_student_id");
      router.push(last ? `/student-dashboard/${last}` : "/dashboard");
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen
          ? "bg-white/95 dark:bg-[#050D1A]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-gray-800/60 shadow-sm shadow-slate-100/80 dark:shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" onClick={handleLogoClick} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-[#0B1026]">
              <Image
                src="/logo-mark.png"
                alt="Lumexa AI School"
                width={36}
                height={36}
                className="object-cover w-full h-full"
              />
            </div>
            <span className="font-black text-base min-[380px]:text-lg tracking-tight leading-tight text-[#111827] dark:text-white">
              Lumexa{" "}
              <span className="text-[#7928CA] dark:text-purple-400 font-bold">AI School</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.href} href={l.href}>{l.label}</NavLink>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Theme toggle */}
            <ThemeToggleButton
              isDark={isDark}
              toggle={toggle}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#E2E8F0] dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700/50 bg-white dark:bg-gray-800/60 hover:bg-purple-50 dark:hover:bg-gray-700/60 transition-all text-sm active:scale-90"
            />
            {authed ? (
              <button
                onClick={handleDashboard}
                className="px-4 py-2 text-sm text-purple-700 hover:text-purple-900 border border-purple-200 hover:border-purple-300 rounded-lg transition-all hover:bg-purple-50"
              >
                My Dashboard →
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-[#334155] hover:text-[#0F172A] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/trial"
                  className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg shadow-md shadow-purple-100 hover:shadow-purple-200 transition-all"
                >
                  Book a Free Trial
                </Link>
              </>
            )}
          </div>

          {/* Mobile: theme toggle + hamburger, always visible in the top bar */}
          <div className="lg:hidden flex items-center gap-1.5">
            <ThemeToggleButton
              isDark={isDark}
              toggle={toggle}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#E2E8F0] dark:border-gray-700 bg-white/90 dark:bg-gray-800/70 text-base active:scale-90 transition-all"
            />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-10 h-10 flex items-center justify-center text-[#64748B] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white dark:bg-[#050D1A] border-t border-[#E2E8F0] dark:border-gray-800 py-4 space-y-1 shadow-lg dark:shadow-black/30 fade-in">
            {NAV_LINKS.map((l) => (
              <MobileNavLink key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>{l.label}</MobileNavLink>
            ))}
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-gray-800 mt-3 flex flex-col gap-2 px-4">
              {authed ? (
                <button
                  onClick={() => { setMobileOpen(false); handleDashboard(); }}
                  className="w-full py-2.5 text-sm text-center text-purple-700 border border-purple-200 rounded-lg transition-all duration-200 hover:bg-purple-50 active:scale-[0.98]"
                >
                  My Dashboard →
                </button>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="w-full py-2.5 text-sm text-center text-[#334155] dark:text-gray-400 border border-[#E2E8F0] dark:border-gray-700 rounded-lg dark:hover:border-gray-600 transition-colors active:scale-[0.98]">
                    Sign In
                  </Link>
                  <Link href="/trial" onClick={() => setMobileOpen(false)} className="w-full py-2.5 text-sm font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg transition-transform active:scale-[0.98]">
                    Book a Free Trial
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-[#334155] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white transition-colors relative group font-medium"
    >
      {children}
      <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-purple-600 group-hover:w-full transition-all duration-200" />
    </Link>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2.5 text-sm text-[#334155] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F7F9FF] dark:hover:bg-gray-800/60 rounded-lg mx-2 transition-colors"
    >
      {children}
    </Link>
  );
}
