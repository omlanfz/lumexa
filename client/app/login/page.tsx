// FILE PATH: client/app/login/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";

// ─── Inline theme logic (no ThemeProvider dependency on auth pages) ───────────
function useAuthTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem("lumexa-theme");
    const dark = stored !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("lumexa-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };
  return { isDark, toggle };
}

function LoginContent() {
  const router = useRouter();
  const { isDark, toggle } = useAuthTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        { email, password },
      );
      const { access_token, user } = res.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      if (user.role === "TEACHER") router.push("/teacher-dashboard");
      else if (user.role === "ADMIN") router.push("/admin");
      else router.push("/dashboard");
    } catch (err: any) {
      const m = err.response?.data?.message;
      setError(Array.isArray(m) ? m.join(", ") : (m ?? "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  };

  // ── Theme-aware classes ──────────────────────────────────────────────────────
  const bg = isDark
    ? "bg-gradient-to-br from-[#050D1A] via-[#0A1628] to-[#050D1A]"
    : "bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50";
  const card = isDark
    ? "bg-[#0D1B2E]/80 border border-blue-900/40 shadow-2xl shadow-blue-900/20 backdrop-blur-xl"
    : "bg-white border border-blue-100 shadow-2xl shadow-blue-200/40";
  const inputCls = isDark
    ? "bg-[#1A2540] border-blue-900/40 text-blue-100 placeholder-blue-400/40 focus:border-blue-500"
    : "bg-blue-50 border-blue-200 text-blue-900 placeholder-blue-300 focus:border-blue-500 focus:bg-white";
  const labelCls = isDark ? "text-blue-300/80" : "text-blue-700";
  const titleCls = isDark ? "text-blue-400" : "text-blue-600";
  const subtitleCls = isDark ? "text-blue-400/50" : "text-blue-400";
  const cardTextMuted = isDark ? "text-blue-400/60" : "text-blue-400";

  return (
    <div
      className={`min-h-screen ${bg} flex items-center justify-center p-4 relative transition-colors duration-300`}
    >
      {/* ── Stars decoration (dark only) */}
      {isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white opacity-30"
              style={{
                width: Math.random() * 2 + 1 + "px",
                height: Math.random() * 2 + 1 + "px",
                top: Math.random() * 100 + "%",
                left: Math.random() * 100 + "%",
                animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: Math.random() * 3 + "s",
              }}
            />
          ))}
        </div>
      )}

      {/* ── Theme toggle ──────────────────────────────────────────────────── */}
      <button
        onClick={toggle}
        className={`fixed top-4 right-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          isDark
            ? "bg-blue-900/40 hover:bg-blue-900/60 text-yellow-400 border border-blue-800/40"
            : "bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"
        }`}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? "☀️" : "🌙"}
      </button>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div className={`w-full max-w-md ${card} rounded-2xl p-8 relative z-10`}>
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-blue-600/30">
            <Image
                src="https://res.cloudinary.com/dunx0blwp/image/upload/v1772141559/logo_yr5wyw.jpg"
                width={32}
                height={32}
                alt="Lumexa"
              />
          </div>
          <h1
            className={`text-3xl font-bold tracking-tight uppercase ${titleCls}`}
          >
            Log In
          </h1>
          <p className={`text-sm mt-1 ${subtitleCls}`}>
            Access Portal · Enter Base
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label
              className={`block text-xs uppercase tracking-wider font-semibold mb-2 ${labelCls}`}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all ${inputCls}`}
            />
          </div>

          <div>
            <label
              className={`block text-xs uppercase tracking-wider font-semibold mb-2 ${labelCls}`}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all ${inputCls}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${cardTextMuted} hover:opacity-100 transition-opacity`}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Accessing…
              </span>
            ) : (
              <span>
                Log In
                <span className="block text-xs font-normal opacity-70">
                  Access Portal
                </span>
              </span>
            )}
          </button>
        </form>

        <p className={`text-center text-sm mt-6 ${cardTextMuted}`}>
          Don't have an account?{" "}
          <button
            onClick={() => router.push("/register")}
            className="text-blue-500 hover:text-blue-400 font-semibold transition-colors"
          >
            Create Account
          </button>
        </p>

        {/* Space decoration */}
        <p
          className={`text-center text-xs mt-4 ${isDark ? "text-blue-900/60" : "text-blue-200"}`}
        >
          🚀 Lumexa · Mission Control
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050D1A] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
