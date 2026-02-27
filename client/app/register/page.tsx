// FILE PATH: client/app/register/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";

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

type Role = "PARENT" | "TEACHER";

const ROLE_INFO: Record<
  Role,
  { icon: string; label: string; sub: string; desc: string }
> = {
  PARENT: {
    icon: "👨‍👩‍👧",
    label: "Parent",
    sub: "Commander",
    desc: "Book lessons and track your child's mission progress",
  },
  TEACHER: {
    icon: "🧑‍🏫",
    label: "Teacher",
    sub: "Pilot",
    desc: "Create availability, teach cadets, earn per class",
  },
};

function RegisterContent() {
  const router = useRouter();
  const { isDark, toggle } = useAuthTheme();

  const [role, setRole] = useState<Role>("PARENT");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          role,
        },
      );
      const { access_token, user } = res.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      if (role === "PARENT") router.push("/dashboard");
      else router.push("/teacher-dashboard");
    } catch (err: any) {
      const m = err.response?.data?.message;
      setError(Array.isArray(m) ? m.join(", ") : (m ?? "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  // Theme classes
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
      {/* Stars decoration (dark only) */}
      {isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white opacity-20"
              style={{
                width: Math.random() * 2 + 1 + "px",
                height: Math.random() * 2 + 1 + "px",
                top: Math.random() * 100 + "%",
                left: Math.random() * 100 + "%",
              }}
            />
          ))}
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className={`fixed top-4 right-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          isDark
            ? "bg-blue-900/40 hover:bg-blue-900/60 text-yellow-400 border border-blue-800/40"
            : "bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"
        }`}
      >
        {isDark ? "☀️" : "🌙"}
      </button>

      <div className={`w-full max-w-md ${card} rounded-2xl p-8 relative z-10`}>
        {/* Logo + Title */}
        <div className="text-center mb-6">
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
            Create Account
          </h1>
          <p className={`text-sm mt-1 ${subtitleCls}`}>Initiate Launch</p>
        </div>

        {/* Role selector */}
        <div className="mb-6">
          <p
            className={`text-xs uppercase tracking-wider font-semibold mb-3 ${labelCls}`}
          >
            I am a…
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(ROLE_INFO) as Role[]).map((r) => {
              const isSelected = role === r;
              const info = ROLE_INFO[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : isDark
                        ? "border-blue-900/40 bg-[#1A2540] text-blue-300 hover:border-blue-700/60"
                        : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                  }`}
                >
                  <div className="text-2xl mb-1">{info.icon}</div>
                  <p className="font-bold text-sm">{info.label}</p>
                  <p
                    className={`text-xs ${isSelected ? "text-blue-200" : cardTextMuted}`}
                  >
                    {info.sub}
                  </p>
                </button>
              );
            })}
          </div>
          <p className={`text-xs mt-2 text-center ${cardTextMuted}`}>
            {ROLE_INFO[role].desc}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              className={`block text-xs uppercase tracking-wider font-semibold mb-2 ${labelCls}`}
            >
              Full Name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              autoComplete="name"
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all ${inputCls}`}
            />
          </div>

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
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all ${inputCls}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${cardTextMuted}`}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {/* Password strength */}
            {password.length > 0 && (
              <div className="mt-2 flex gap-1">
                {[8, 12, 16].map((len, i) => (
                  <div
                    key={len}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= len
                        ? i === 0
                          ? "bg-red-500"
                          : i === 1
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        : isDark
                          ? "bg-gray-700"
                          : "bg-gray-200"
                    }`}
                  />
                ))}
                <span className={`text-xs ml-1 ${cardTextMuted}`}>
                  {password.length < 8
                    ? "Weak"
                    : password.length < 12
                      ? "Fair"
                      : "Strong"}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-60 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account…
              </span>
            ) : (
              <span>
                Create Account
                <span className="block text-xs font-normal opacity-70">
                  Initiate Launch 🚀
                </span>
              </span>
            )}
          </button>
        </form>

        {role === "TEACHER" && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs ${
              isDark
                ? "bg-purple-900/20 border border-purple-800/30 text-purple-300"
                : "bg-purple-50 border border-purple-200 text-purple-700"
            }`}
          >
            🛸 As a Pilot, you'll complete profile verification before appearing
            in the marketplace.
          </div>
        )}

        <p className={`text-center text-sm mt-5 ${cardTextMuted}`}>
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-blue-500 hover:text-blue-400 font-semibold transition-colors"
          >
            Log In
          </button>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050D1A] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
