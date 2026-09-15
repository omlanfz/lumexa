// FILE PATH: client/components/AdminTopNav.tsx
//
// Top navigation for /admin, mirroring TeacherTopNav/StudentTopNav's
// structure. Primary nav is deliberately short: Dashboard | Classes |
// Teachers | Students | Payouts. "Manage Courses" is a secondary link in
// the profile dropdown, not a main nav item (courses are a supporting
// config screen, not a daily Operations workspace).

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { ThemeToggle } from "./ThemeProvider";

interface AdminTopNavProps {
  adminName: string;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/teachers", label: "Teachers" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/payouts", label: "Payouts" },
];

const DROPDOWN_ITEMS = [{ href: "/admin/courses", label: "Manage Courses" }];

export default function AdminTopNav({ adminName }: AdminTopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const initial = adminName ? adminName.charAt(0).toUpperCase() : "?";

  return (
    <header className="sticky top-0 z-40 bg-[var(--a-nav-bg)]/90 backdrop-blur border-b border-[var(--a-nav-border)] transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => router.push("/admin")}
          className="flex items-center gap-2.5 flex-shrink-0 transition-opacity hover:opacity-80"
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src="https://res.cloudinary.com/dunx0blwp/image/upload/v1772141559/logo_yr5wyw.jpg"
              width={32}
              height={32}
              alt="Lumexa"
            />
          </div>
          <span className="font-bold text-[var(--a-accent)] text-sm hidden sm:inline">
            Lumexa Ops
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive(item.href)
                  ? "bg-[var(--a-nav-active)] text-[var(--a-nav-active-text)]"
                  : "text-[var(--a-text-muted)] hover:text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
              }`}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right cluster: theme toggle, profile dropdown */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <ThemeToggle variant="teacher" />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center transition-transform duration-200 hover:scale-105"
              aria-label="Profile menu"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4338CA] to-[#312E81] flex items-center justify-center text-white font-semibold text-sm">
                {initial}
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl overflow-hidden z-50 fade-in">
                <div className="px-4 py-3 border-b border-[var(--a-nav-border)]">
                  <p className="text-sm font-semibold text-[var(--a-text)] truncate">
                    {adminName}
                  </p>
                  <p className="text-xs text-[var(--a-text-faint)]">Operations / Admin</p>
                </div>
                {DROPDOWN_ITEMS.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-sm text-left text-[var(--a-text)] hover:bg-[var(--a-nav-hover)] transition-colors duration-150"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-[var(--a-nav-border)]" />
                <button
                  onClick={logout}
                  className="w-full px-4 py-2.5 text-sm text-left text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                >
                  Log out
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[var(--a-text-muted)] border border-[var(--a-border)] transition-colors hover:text-[var(--a-text)]"
            aria-label="Menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-[var(--a-nav-border)] px-4 py-2 flex flex-col bg-[var(--a-nav-bg)] fade-in">
          {[...NAV_ITEMS, ...DROPDOWN_ITEMS].map((item) => (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setMobileOpen(false);
              }}
              className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "text-[var(--a-nav-active-text)]"
                  : "text-[var(--a-text-muted)] hover:text-[var(--a-text)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
