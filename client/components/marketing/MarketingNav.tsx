"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
    const user = JSON.parse(localStorage.getItem("user") ?? "null");
    if (!user) { router.push("/login"); return; }
    if (user.role === "TEACHER") router.push("/teacher-dashboard");
    else if (user.role === "ADMIN") router.push("/admin");
    else {
      const last = localStorage.getItem("last_student_id");
      router.push(last ? `/student-dashboard/${last}` : "/dashboard");
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#050D1A]/95 backdrop-blur-md border-b border-purple-900/30 shadow-lg shadow-black/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" onClick={handleLogoClick} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-lg shadow-purple-900/40 group-hover:shadow-purple-700/60 transition-shadow">
              <Image
                src="https://res.cloudinary.com/dunx0blwp/image/upload/v1772141559/logo_yr5wyw.jpg"
                alt="Lumexa AI School"
                width={36}
                height={36}
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-white font-black text-lg tracking-tight leading-tight">
              Lumexa{" "}
              <span className="text-purple-400 font-bold">AI School</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink href="/courses">Pathways</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/about">About</NavLink>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {authed ? (
              <button
                onClick={handleDashboard}
                className="px-4 py-2 text-sm text-purple-300 hover:text-white border border-purple-700/50 hover:border-purple-500 rounded-lg transition-all"
              >
                My Dashboard →
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/trial"
                  className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 transition-all"
                >
                  Book Free Trial
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-400 hover:text-white p-2"
            aria-label="Toggle menu"
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

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-[#050D1A]/98 border-t border-gray-800 py-4 space-y-1">
            <MobileNavLink href="/courses" onClick={() => setMobileOpen(false)}>Pathways</MobileNavLink>
            <MobileNavLink href="/pricing" onClick={() => setMobileOpen(false)}>Pricing</MobileNavLink>
            <MobileNavLink href="/about" onClick={() => setMobileOpen(false)}>About</MobileNavLink>
            <div className="pt-3 border-t border-gray-800 mt-3 flex flex-col gap-2 px-4">
              {authed ? (
                <button
                  onClick={() => { setMobileOpen(false); handleDashboard(); }}
                  className="w-full py-2.5 text-sm text-center text-purple-300 border border-purple-700/50 rounded-lg"
                >
                  My Dashboard →
                </button>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="w-full py-2.5 text-sm text-center text-gray-300 border border-gray-700 rounded-lg">
                    Sign In
                  </Link>
                  <Link href="/trial" onClick={() => setMobileOpen(false)} className="w-full py-2.5 text-sm font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg">
                    Book Free Trial
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
      className="text-sm text-gray-300 hover:text-white transition-colors relative group"
    >
      {children}
      <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-purple-400 group-hover:w-full transition-all duration-200" />
    </Link>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg mx-2"
    >
      {children}
    </Link>
  );
}
