// FILE PATH: client/app/reset-password/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import Image from "next/image";
import Link from "next/link";

// ─── Inline theme logic (same pattern as /login — no ThemeProvider dependency on auth pages) ───
function useAuthTheme() {
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
    localStorage.setItem("lumexa-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };
  return { isDark, toggle };
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { isDark, toggle } = useAuthTheme();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      const m = err.response?.data?.message;
      setError(
        Array.isArray(m)
          ? m.join(", ")
          : (m ?? "This password reset link is invalid or has expired. Please request a new one."),
      );
    } finally {
      setLoading(false);
    }
  };

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
    <div className={`min-h-screen ${bg} flex items-center justify-center p-4 relative transition-colors duration-300`}>
      <Link
        href="/login"
        className={`fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
          isDark
            ? "bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/40"
            : "bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"
        }`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Log In
      </Link>

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

      <div className={`w-full max-w-md ${card} rounded-2xl p-8 relative z-10 fade-in`}>
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-blue-600/30 overflow-hidden hover:shadow-blue-500/50 transition-shadow">
              <Image src="/logo-mark.png" width={56} height={56} alt="Lumexa AI School" className="object-cover w-full h-full" />
            </div>
          </Link>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${subtitleCls}`}>Lumexa AI School</p>
          <h1 className={`text-3xl font-bold tracking-tight uppercase ${titleCls}`}>Reset Password</h1>
          <p className={`text-sm mt-1 ${subtitleCls}`}>Choose a new password</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className={`p-4 rounded-xl text-sm ${isDark ? "bg-teal-900/20 border border-teal-700/30 text-teal-300" : "bg-teal-50 border border-teal-200 text-teal-700"}`}>
              Your password has been reset. Redirecting you to log in…
            </div>
          </div>
        ) : !token ? (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
              This link is missing a reset token. Please request a new password reset link.
            </div>
            <Link href="/forgot-password" className="text-blue-500 hover:text-blue-400 font-semibold text-sm transition-colors">
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className={`block text-xs uppercase tracking-wider font-semibold mb-2 ${labelCls}`}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
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

            <div>
              <label className={`block text-xs uppercase tracking-wider font-semibold mb-2 ${labelCls}`}>
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all ${inputCls}`}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Resetting…
                </span>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        )}

        <p className={`text-center text-xs mt-6 ${isDark ? "text-blue-900/60" : "text-blue-200"}`}>
          🚀 Lumexa AI School · Mission Control
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050D1A] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
