"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "../../components/ThemeProvider";

type Region = "BD" | "IN" | "PH" | "NG" | "EU" | "UK" | "AU" | "CA" | "US";
type Format = "clubs" | "pods" | "private";

interface RegionConfig {
  symbol: string;
  label: string;
  flag: string;
  starter: number;
  growth: number;
  pro: number;
}

const REGIONS: Record<Region, RegionConfig> = {
  US: { symbol: "$",  label: "USD", flag: "🇺🇸", starter: 25,    growth: 43,    pro: 55    },
  CA: { symbol: "C$", label: "CAD", flag: "🇨🇦", starter: 34,    growth: 58,    pro: 74    },
  AU: { symbol: "A$", label: "AUD", flag: "🇦🇺", starter: 38,    growth: 65,    pro: 83    },
  UK: { symbol: "£",  label: "GBP", flag: "🇬🇧", starter: 20,    growth: 34,    pro: 44    },
  EU: { symbol: "€",  label: "EUR", flag: "🇪🇺", starter: 23,    growth: 39,    pro: 50    },
  IN: { symbol: "₹",  label: "INR", flag: "🇮🇳", starter: 2200,  growth: 3800,  pro: 4840  },
  BD: { symbol: "৳",  label: "BDT", flag: "🇧🇩", starter: 2800,  growth: 4940,  pro: 6336  },
  PH: { symbol: "₱",  label: "PHP", flag: "🇵🇭", starter: 1400,  growth: 2450,  pro: 3136  },
  NG: { symbol: "₦",  label: "NGN", flag: "🇳🇬", starter: 20000, growth: 35200, pro: 45000 },
};

const TZ_TO_REGION: Record<string, Region> = {
  "Asia/Dhaka":          "BD",
  "Asia/Kolkata":        "IN",
  "Asia/Calcutta":       "IN",
  "Asia/Manila":         "PH",
  "Africa/Lagos":        "NG",
  "Africa/Abuja":        "NG",
  "Europe/London":       "UK",
  "Europe/Dublin":       "UK",
  "Europe/Berlin":       "EU",
  "Europe/Paris":        "EU",
  "Europe/Amsterdam":    "EU",
  "Europe/Madrid":       "EU",
  "Europe/Rome":         "EU",
  "Europe/Warsaw":       "EU",
  "Europe/Stockholm":    "EU",
  "Australia/Sydney":    "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane":  "AU",
  "Australia/Perth":     "AU",
  "America/Toronto":     "CA",
  "America/Vancouver":   "CA",
  "America/Montreal":    "CA",
  "America/New_York":    "US",
  "America/Chicago":     "US",
  "America/Denver":      "US",
  "America/Los_Angeles": "US",
  "America/Phoenix":     "US",
};

const FORMAT_MULTIPLIERS: Record<Format, number> = { clubs: 1.0, pods: 1.5, private: 1.8 };

const FORMAT_LABELS: Record<Format, { label: string; emoji: string; desc: string }> = {
  clubs:   { label: "AI Creator Clubs",   emoji: "🏫", desc: "8-15 students · 60 min" },
  pods:    { label: "Pro Builder Pods",   emoji: "👥", desc: "3-5 students · 60 min" },
  private: { label: "Private Mentorship", emoji: "🎯", desc: "1-on-1 · 45 min" },
};

const PACKS: Record<string, { name: string; classes: number; subtitle: string; discount: number; key: keyof RegionConfig }> = {
  starter: { name: "Starter Pack", classes: 8,  subtitle: "Explorer Bundle", discount: 0,  key: "starter" },
  growth:  { name: "Growth Pack",  classes: 16, subtitle: "Builder Bundle",  discount: 12, key: "growth"  },
  pro:     { name: "Pro Pack",     classes: 24, subtitle: "Creator Bundle",  discount: 20, key: "pro"     },
};

const PATHWAY_COURSES: Record<string, { code: string; name: string }[]> = {
  game: [
    { code: "Course 1", name: "Roblox World Builder" },
    { code: "Course 2", name: "Python Arcade Games" },
    { code: "Course 3", name: "Advanced Game Design" },
  ],
  ai: [
    { code: "Course 1", name: "Python and AI Foundations" },
    { code: "Course 2", name: "Computer Vision Projects" },
    { code: "Course 3", name: "Language Models and Chatbots" },
  ],
  web: [
    { code: "Course 1", name: "HTML and CSS Mastery" },
    { code: "Course 2", name: "JavaScript and Interactivity" },
    { code: "Course 3", name: "React and Full-Stack Web" },
  ],
  little: [
    { code: "Course 1", name: "Scratch Adventures" },
    { code: "Course 2", name: "Python for Young Builders" },
    { code: "Course 3", name: "AI for Kids: Smart Projects" },
  ],
  data: [
    { code: "Course 1", name: "Python for Data" },
    { code: "Course 2", name: "Data Visualisation" },
    { code: "Course 3", name: "Machine Learning Projects" },
  ],
  digital: [
    { code: "Course 1", name: "Build Your Digital Identity" },
    { code: "Course 2", name: "Freelancing Fundamentals" },
    { code: "Course 3", name: "LinkedIn and Professional Presence" },
  ],
  "game-creator":        [{ code: "Course 1", name: "Roblox World Builder" }, { code: "Course 2", name: "Python Arcade Games" }, { code: "Course 3", name: "Advanced Game Design" }],
  "ai-builder":          [{ code: "Course 1", name: "Python and AI Foundations" }, { code: "Course 2", name: "Computer Vision Projects" }, { code: "Course 3", name: "Language Models and Chatbots" }],
  "web-developer":       [{ code: "Course 1", name: "HTML and CSS Mastery" }, { code: "Course 2", name: "JavaScript and Interactivity" }, { code: "Course 3", name: "React and Full-Stack Web" }],
  "little-coders":       [{ code: "Course 1", name: "Scratch Adventures" }, { code: "Course 2", name: "Python for Young Builders" }, { code: "Course 3", name: "AI for Kids: Smart Projects" }],
  "data-scientist":      [{ code: "Course 1", name: "Python for Data" }, { code: "Course 2", name: "Data Visualisation" }, { code: "Course 3", name: "Machine Learning Projects" }],
  "digital-independence":[{ code: "Course 1", name: "Build Your Digital Identity" }, { code: "Course 2", name: "Freelancing Fundamentals" }, { code: "Course 3", name: "LinkedIn and Professional Presence" }],
};

const PATHWAY_LABELS: Record<string, string> = {
  game: "Game Creator Path", ai: "AI Builder Path", web: "Web Developer Path",
  little: "Little Coders Path", data: "Data Scientist Path", digital: "Digital Independence Path",
  "game-creator": "Game Creator Path", "ai-builder": "AI Builder Path",
  "web-developer": "Web Developer Path", "little-coders": "Little Coders Path",
  "data-scientist": "Data Scientist Path", "digital-independence": "Digital Independence Path",
};

function computePrice(base: number, multiplier: number, symbol: string): string {
  const raw = Math.round(base * multiplier);
  const formatted = raw >= 1000 ? raw.toLocaleString("en-US") : String(raw);
  return `${symbol}${formatted}`;
}

function computePerClass(base: number, multiplier: number, classes: number, symbol: string): string {
  const raw = (base * multiplier) / classes;
  const rounded = raw >= 100 ? Math.round(raw) : Math.round(raw * 10) / 10;
  const formatted = rounded >= 1000 ? rounded.toLocaleString("en-US") : String(rounded);
  return `${symbol}${formatted}/class`;
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const packId      = searchParams.get("pack")    || "growth";
  const pathwayId   = searchParams.get("pathway") || "";
  const formatParam = (searchParams.get("format") || "clubs") as Format;
  const regionParam = searchParams.get("region") as Region | null;

  const [region, setRegion]               = useState<Region>(regionParam && REGIONS[regionParam] ? regionParam : "US");
  const [format, setFormat]               = useState<Format>(FORMAT_MULTIPLIERS[formatParam] !== undefined ? formatParam : "clubs");
  const [detected, setDetected]           = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "bank" | "bkash">("stripe");
  const [form, setForm]                   = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [submitted, setSubmitted]         = useState(false);

  useEffect(() => {
    if (!regionParam) {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const r = TZ_TO_REGION[tz];
        if (r) setRegion(r);
      } catch {}
    }
    setDetected(true);
  }, [regionParam]);

  const pack         = PACKS[packId] || PACKS["growth"];
  const cfg          = REGIONS[region];
  const multiplier   = FORMAT_MULTIPLIERS[format];
  const fmtInfo      = FORMAT_LABELS[format];
  const pathway      = pathwayId ? PATHWAY_LABELS[pathwayId] : null;
  const pathwayCourses = pathwayId ? PATHWAY_COURSES[pathwayId] : null;
  const isBD         = region === "BD";

  const priceStr    = computePrice(cfg[pack.key] as number, multiplier, cfg.symbol);
  const perClassStr = computePerClass(cfg[pack.key] as number, multiplier, pack.classes, cfg.symbol);
  const coursesToShow   = pack.classes >= 24 ? 3 : pack.classes >= 16 ? 2 : 1;
  const displayCourses  = pathwayCourses ? pathwayCourses.slice(0, coursesToShow) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!detected) return null;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F7F9FF] dark:bg-[#050D1A] flex items-center justify-center px-4 transition-colors duration-200">
        <div className="max-w-md w-full text-center p-10 bg-white dark:bg-gray-900/60 border border-green-200 dark:border-green-800/50 rounded-2xl shadow-xl shadow-slate-100/80 dark:shadow-black/40">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-[#0F172A] dark:text-white mb-3">Order Received!</h2>
          <p className="text-[#64748B] dark:text-gray-400 text-sm leading-relaxed mb-2">
            Thank you, <span className="text-[#0F172A] dark:text-white font-semibold">{form.name}</span>. We&apos;ve
            received your <span className="text-purple-600 dark:text-purple-400 font-semibold">{pack.name}</span> order
            {pathway && (
              <> for the <span className="text-purple-600 dark:text-purple-400 font-semibold">{pathway}</span></>
            )}.
          </p>
          <p className="text-[#64748B] dark:text-gray-400 text-sm leading-relaxed mb-6">
            We&apos;ll send your class access details to{" "}
            <span className="text-[#0F172A] dark:text-white font-semibold">{form.email}</span> within a few hours.
          </p>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl mb-6 text-left">
            <p className="text-green-700 dark:text-green-400 text-xs font-semibold mb-2">What happens next:</p>
            <ol className="space-y-1.5 text-[#64748B] dark:text-gray-400 text-xs">
              <li>1. Our team confirms your payment</li>
              <li>2. We match you with the perfect teacher</li>
              <li>3. You receive class booking links via email</li>
              <li>4. Your child&apos;s transformation begins</li>
            </ol>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/register" className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-all text-center">
              Create an Account to Track Progress
            </Link>
            <Link href="/" className="text-[#94A3B8] dark:text-gray-500 hover:text-[#64748B] dark:hover:text-gray-300 text-sm transition-colors">
              Back to Home →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FF] dark:bg-[#050D1A] text-[#0F172A] dark:text-white py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Logo nav */}
      <div className="max-w-5xl mx-auto mb-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group w-fit">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-sm shadow-purple-100 dark:shadow-none">
              <Image
                src="https://res.cloudinary.com/dunx0blwp/image/upload/v1772141559/logo_yr5wyw.jpg"
                alt="Lumexa AI School"
                width={36}
                height={36}
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-[#0F172A] dark:text-white font-black text-lg tracking-tight">
              Lumexa <span className="text-purple-600 dark:text-purple-400 font-bold">AI School</span>
            </span>
          </Link>
          <ThemeToggle variant="teacher" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Left: Order summary */}
        <div className="lg:sticky lg:top-24">
          <p className="text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">
            Order Summary
          </p>

          <div className="bg-white dark:bg-gray-900/60 border border-[#E2E8F0] dark:border-gray-700 rounded-2xl p-6 mb-5 shadow-sm shadow-slate-100/60 dark:shadow-none">
            {/* Pack + price */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[#0F172A] dark:text-white font-black text-2xl">{pack.name}</h2>
                <p className="text-[#94A3B8] dark:text-gray-500 text-xs">{pack.subtitle}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{priceStr}</div>
                <div className="text-[#94A3B8] dark:text-gray-600 text-xs">{perClassStr}</div>
              </div>
            </div>

            {pack.discount > 0 && (
              <div className="mb-4 px-3 py-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/40 rounded-lg">
                <p className="text-green-700 dark:text-green-400 text-xs font-semibold">
                  {pack.discount}% discount applied vs buying individually.
                </p>
              </div>
            )}

            {/* Format */}
            <div className="border-t border-[#E2E8F0] dark:border-gray-800 pt-4 mb-4">
              <p className="text-xs text-[#94A3B8] dark:text-gray-600 font-semibold uppercase tracking-wider mb-2">
                Learning Format
              </p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{fmtInfo.emoji}</span>
                <div>
                  <p className="text-[#0F172A] dark:text-white text-sm font-semibold">{fmtInfo.label}</p>
                  <p className="text-[#64748B] dark:text-gray-500 text-xs">{fmtInfo.desc}</p>
                </div>
              </div>
              {/* Format switcher */}
              <div className="flex gap-2 mt-3">
                {(["clubs", "pods", "private"] as Format[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                      format === f
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "border-[#E2E8F0] dark:border-gray-700 text-[#94A3B8] dark:text-gray-500 hover:border-purple-300 dark:hover:border-gray-500 bg-white dark:bg-transparent"
                    }`}
                  >
                    {f === "clubs" ? "Clubs" : f === "pods" ? "Pods" : "Private"}
                  </button>
                ))}
              </div>
            </div>

            {/* Pathway */}
            {pathway && (
              <div className="border-t border-[#E2E8F0] dark:border-gray-800 pt-4 mb-4">
                <p className="text-xs text-[#94A3B8] dark:text-gray-600 font-semibold uppercase tracking-wider mb-1">
                  Learning Pathway
                </p>
                <p className="text-[#0F172A] dark:text-white font-semibold text-sm">{pathway}</p>
              </div>
            )}

            {/* Courses */}
            {displayCourses && displayCourses.length > 0 && (
              <div className="border-t border-[#E2E8F0] dark:border-gray-800 pt-4">
                <p className="text-xs text-[#94A3B8] dark:text-gray-600 font-semibold uppercase tracking-wider mb-3">
                  Included Courses
                </p>
                <ul className="space-y-2">
                  {displayCourses.map((c) => (
                    <li key={c.code} className="flex items-center gap-2.5 text-sm">
                      <span className="w-5 h-5 rounded-full bg-purple-50 dark:bg-purple-900/60 border border-purple-300 dark:border-purple-700/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-600 dark:text-purple-400 text-[9px] font-bold">✓</span>
                      </span>
                      <div>
                        <span className="text-[#94A3B8] dark:text-gray-500 text-[10px] font-bold uppercase">{c.code} </span>
                        <span className="text-[#475569] dark:text-gray-300">{c.name}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Total */}
            <div className="border-t border-[#E2E8F0] dark:border-gray-800 mt-4 pt-4 flex items-center justify-between">
              <span className="text-[#64748B] dark:text-gray-500 text-sm">Total live classes</span>
              <span className="text-[#0F172A] dark:text-white font-black text-lg">{pack.classes} classes</span>
            </div>
          </div>

          {/* Trust signals */}
          <div className="space-y-2">
            {[
              { icon: "🔒", text: "Secure, encrypted checkout" },
              { icon: "↩️", text: "7-day refund on unused classes" },
              { icon: "🎓", text: "Verified expert teachers" },
              { icon: "🏆", text: "Real projects in every session" },
            ].map((t) => (
              <div key={t.text} className="flex items-center gap-2 text-[#94A3B8] dark:text-gray-500 text-xs">
                <span>{t.icon}</span>
                <span>{t.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Payment form */}
        <div className="bg-white dark:bg-gray-900/70 border border-[#E2E8F0] dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-sm shadow-slate-100/60 dark:shadow-none">
          <h2 className="text-xl font-black text-[#0F172A] dark:text-white mb-1">Complete Your Order</h2>
          <p className="text-[#94A3B8] dark:text-gray-600 text-xs mb-6">
            Fill in your details below to secure your child&apos;s classes
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-[#64748B] dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                placeholder="e.g. Sarah Johnson"
                className="w-full bg-white dark:bg-black/60 border border-[#E2E8F0] dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-500 outline-none rounded-lg p-3 text-[#0F172A] dark:text-white text-sm placeholder-[#CBD5E1] dark:placeholder-gray-600 transition-colors shadow-sm shadow-slate-50 dark:shadow-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#64748B] dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
                placeholder="e.g. sarah@email.com"
                className="w-full bg-white dark:bg-black/60 border border-[#E2E8F0] dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-500 outline-none rounded-lg p-3 text-[#0F172A] dark:text-white text-sm placeholder-[#CBD5E1] dark:placeholder-gray-600 transition-colors shadow-sm shadow-slate-50 dark:shadow-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#64748B] dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="e.g. +1 555 123 4567"
                className="w-full bg-white dark:bg-black/60 border border-[#E2E8F0] dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-500 outline-none rounded-lg p-3 text-[#0F172A] dark:text-white text-sm placeholder-[#CBD5E1] dark:placeholder-gray-600 transition-colors shadow-sm shadow-slate-50 dark:shadow-none"
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-xs text-[#64748B] dark:text-gray-400 uppercase tracking-wider mb-3">
                Payment Method
              </label>
              <div className="space-y-2">
                {[
                  { id: "stripe", label: "Card / Apple Pay / Google Pay", sub: "Powered by Stripe. Instant.", icon: "💳", activeBorder: "border-purple-500", activeBg: "bg-purple-50 dark:bg-purple-900/20", radioActive: "border-purple-500", radioDot: "bg-purple-600 dark:bg-purple-400" },
                  { id: "bank",   label: "Bank Transfer",                  sub: "We'll send account details. 1-2 business days.", icon: "🏦", activeBorder: "border-blue-500", activeBg: "bg-blue-50 dark:bg-blue-900/20", radioActive: "border-blue-500", radioDot: "bg-blue-600 dark:bg-blue-400" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as "stripe" | "bank")}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                      paymentMethod === m.id
                        ? `${m.activeBorder} ${m.activeBg}`
                        : "border-[#E2E8F0] dark:border-gray-700 bg-[#F7F9FF] dark:bg-black/40 hover:border-[#CBD5E1] dark:hover:border-gray-600"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${paymentMethod === m.id ? m.radioActive : "border-[#CBD5E1] dark:border-gray-600"}`}>
                      {paymentMethod === m.id && <div className={`w-2 h-2 rounded-full ${m.radioDot}`} />}
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[#0F172A] dark:text-white text-sm font-semibold">{m.label}</p>
                      <p className="text-[#64748B] dark:text-gray-500 text-xs">{m.sub}</p>
                    </div>
                    <span className="text-[#94A3B8] dark:text-gray-500 text-xs">{m.icon}</span>
                  </button>
                ))}

                {isBD && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bkash")}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                      paymentMethod === "bkash"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-[#E2E8F0] dark:border-gray-700 bg-[#F7F9FF] dark:bg-black/40 hover:border-[#CBD5E1] dark:hover:border-gray-600"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${paymentMethod === "bkash" ? "border-green-500" : "border-[#CBD5E1] dark:border-gray-600"}`}>
                      {paymentMethod === "bkash" && <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" />}
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[#0F172A] dark:text-white text-sm font-semibold">bKash</p>
                      <p className="text-[#64748B] dark:text-gray-500 text-xs">Instant mobile payment. Bangladesh only.</p>
                    </div>
                    <span className="text-[#94A3B8] dark:text-gray-500 text-xs">📱</span>
                  </button>
                )}
              </div>
            </div>

            {paymentMethod === "stripe" && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30 rounded-lg">
                <p className="text-purple-700 dark:text-purple-300 text-xs leading-relaxed">
                  You&apos;ll be redirected to a secure Stripe checkout page. Supports Visa, Mastercard, Amex, Apple Pay, and Google Pay.
                </p>
              </div>
            )}
            {paymentMethod === "bank" && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                  After submitting, we&apos;ll email you our bank account details. Classes reserved for 48 hours.
                </p>
              </div>
            )}
            {paymentMethod === "bkash" && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg">
                <p className="text-green-700 dark:text-green-300 text-xs leading-relaxed">
                  After submitting, we&apos;ll send you a bKash number and reference. Classes activated within 2 hours of payment.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 text-white font-black rounded-xl shadow-lg shadow-purple-200/60 dark:shadow-purple-900/40 transition-all hover:shadow-xl hover:shadow-purple-200/80 dark:hover:shadow-purple-900/50 hover:-translate-y-0.5 active:translate-y-0 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <>
                  {paymentMethod === "stripe" ? `Pay ${priceStr} with Card` : "Reserve My Classes"}
                  <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                    {pack.classes} classes · {pack.name} · {fmtInfo.label}
                  </span>
                </>
              )}
            </button>

            <p className="text-[#CBD5E1] dark:text-gray-700 text-[10px] text-center leading-relaxed">
              By completing your order you agree to our Terms of Service and Privacy Policy.
              7-day refund guarantee on unused classes.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F9FF] dark:bg-[#050D1A] flex items-center justify-center transition-colors">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
