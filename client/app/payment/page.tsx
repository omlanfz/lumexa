"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Region = "BD" | "IN" | "UK" | "US";

const TIMEZONE_TO_REGION: Record<string, Region> = {
  "Asia/Dhaka": "BD",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Europe/London": "UK",
};

const PACK_INFO: Record<string, {
  name: string;
  classes: number;
  subtitle: string;
  discount: number | null;
  courses: { code: string; name: string }[] | null;
  prices: Record<Region, string>;
  perLesson: Record<Region, string>;
}> = {
  starter: {
    name: "Starter Pack",
    classes: 8,
    subtitle: "Explorer Bundle",
    discount: null,
    courses: null,
    prices: { BD: "৳2,800", IN: "₹2,200", UK: "£20", US: "$25" },
    perLesson: { BD: "৳350/class", IN: "₹275/class", UK: "£2.50/class", US: "$3.13/class" },
  },
  growth: {
    name: "Growth Pack",
    classes: 16,
    subtitle: "Builder Bundle",
    discount: 5,
    courses: [
      { code: "Course 1", name: "Your chosen pathway, Course 1" },
      { code: "Course 2", name: "Your chosen pathway, Course 2" },
    ],
    prices: { BD: "৳4,940", IN: "₹3,800", UK: "£34", US: "$43" },
    perLesson: { BD: "৳309/class", IN: "₹238/class", UK: "£2.13/class", US: "$2.66/class" },
  },
  pro: {
    name: "Pro Pack",
    classes: 24,
    subtitle: "Creator Bundle",
    discount: 12,
    courses: [
      { code: "Course 1", name: "Your chosen pathway, Course 1" },
      { code: "Course 2", name: "Your chosen pathway, Course 2" },
      { code: "Course 3", name: "Your chosen pathway, Course 3" },
    ],
    prices: { BD: "৳6,336", IN: "₹4,840", UK: "£44", US: "$55" },
    perLesson: { BD: "৳264/class", IN: "₹202/class", UK: "£1.83/class", US: "$2.29/class" },
  },
};

const PATHWAY_COURSES: Record<string, { code: string; name: string }[]> = {
  "game-creator": [
    { code: "C1", name: "Roblox & Lua Foundations" },
    { code: "C2", name: "Python Game Development" },
    { code: "C3", name: "Unity Basics" },
  ],
  "ai-builder": [
    { code: "C1", name: "Python for AI" },
    { code: "C2", name: "Machine Learning Fundamentals" },
    { code: "C3", name: "Building with OpenAI API" },
  ],
  "web-developer": [
    { code: "C1", name: "HTML & CSS Mastery" },
    { code: "C2", name: "JavaScript & Interactivity" },
    { code: "C3", name: "React & Next.js" },
  ],
  "little-coders": [
    { code: "C1", name: "Scratch Storytelling" },
    { code: "C2", name: "Python Basics" },
  ],
  "data-scientist": [
    { code: "C1", name: "Python & Pandas" },
    { code: "C2", name: "Data Visualization" },
    { code: "C3", name: "Machine Learning Projects" },
  ],
  "digital-independence": [
    { code: "C1", name: "Build Your Digital Identity" },
    { code: "C2", name: "Freelancing Fundamentals" },
    { code: "C3", name: "LinkedIn & Professional Presence" },
    { code: "C4", name: "Communication & Confidence" },
    { code: "C5", name: "Mini Entrepreneurship Lab" },
  ],
};

const PATHWAY_LABELS: Record<string, string> = {
  "game-creator": "Game Creator Path",
  "ai-builder": "AI Builder Path",
  "web-developer": "Web Developer Path",
  "little-coders": "Little Coders Path",
  "data-scientist": "Data Scientist Path",
  "digital-independence": "Digital Independence Path",
};

function PaymentContent() {
  const searchParams = useSearchParams();
  const packId = searchParams.get("pack") || "growth";
  const pathwayId = searchParams.get("pathway") || "";
  const regionParam = searchParams.get("region") as Region | null;

  const [region, setRegion] = useState<Region>(regionParam || "US");
  const [detected, setDetected] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "bank" | "bkash">("stripe");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!regionParam) {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const r = TIMEZONE_TO_REGION[tz];
        if (r) setRegion(r);
      } catch {}
    }
    setDetected(true);
  }, []);

  const pack = PACK_INFO[packId] || PACK_INFO["growth"];
  const pathway = pathwayId ? PATHWAY_LABELS[pathwayId] : null;
  const pathwayCourses = pathwayId ? PATHWAY_COURSES[pathwayId] : null;
  const isBD = region === "BD";

  const displayCourses = pathwayCourses
    ? pathwayCourses.slice(0, pack.classes >= 24 ? 5 : pack.classes >= 16 ? 2 : 1)
    : pack.courses;

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
      <div className="min-h-screen bg-[#050D1A] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center p-10 bg-gray-900/60 border border-green-800/50 rounded-2xl shadow-2xl">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-white mb-3">Order Received!</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">
            Thank you, <span className="text-white font-semibold">{form.name}</span>. We've received your{" "}
            <span className="text-purple-400 font-semibold">{pack.name}</span> order.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            We'll send your class access details to{" "}
            <span className="text-white font-semibold">{form.email}</span> within a few hours.
          </p>
          <div className="p-4 bg-green-900/20 border border-green-800/40 rounded-xl mb-6 text-left">
            <p className="text-green-400 text-xs font-semibold mb-2">What happens next:</p>
            <ol className="space-y-1.5 text-gray-400 text-xs">
              <li>1. Our team confirms your payment</li>
              <li>2. We match you with the perfect teacher</li>
              <li>3. You receive class booking links via email</li>
              <li>4. Your child's transformation begins</li>
            </ol>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/register" className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-all text-center">
              Create an Account to Track Progress
            </Link>
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
              Back to Home →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050D1A] text-white py-16 px-4 sm:px-6 lg:px-8">
      {/* Logo nav */}
      <div className="max-w-5xl mx-auto mb-10">
        <Link href="/" className="flex items-center gap-2.5 group w-fit">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
            <Image
              src="https://res.cloudinary.com/dunx0blwp/image/upload/v1772141559/logo_yr5wyw.jpg"
              alt="Lumexa AI School"
              width={36}
              height={36}
              className="object-cover w-full h-full"
            />
          </div>
          <span className="text-white font-black text-lg tracking-tight">
            Lumexa <span className="text-purple-400 font-bold">AI School</span>
          </span>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Left: Order summary */}
        <div className="lg:sticky lg:top-24">
          <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">Order Summary</p>

          <div className="bg-gray-900/60 border border-gray-700 rounded-2xl p-6 mb-5">
            {/* Pack */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-white font-black text-2xl">{pack.name}</h2>
                <p className="text-gray-500 text-xs">{pack.subtitle}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-purple-400">{pack.prices[region]}</div>
                <div className="text-gray-600 text-xs">{pack.perLesson[region]}</div>
              </div>
            </div>

            {pack.discount && (
              <div className="mb-4 px-3 py-2 bg-green-900/30 border border-green-800/40 rounded-lg">
                <p className="text-green-400 text-xs font-semibold">
                  {pack.discount}% discount applied. You're saving on every class vs buying individually.
                </p>
              </div>
            )}

            {/* Pathway */}
            {pathway && (
              <div className="border-t border-gray-800 pt-4 mb-4">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-1">Learning Pathway</p>
                <p className="text-white font-semibold text-sm">{pathway}</p>
              </div>
            )}

            {/* Courses */}
            {displayCourses && displayCourses.length > 0 && (
              <div className="border-t border-gray-800 pt-4">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-3">Included Courses</p>
                <ul className="space-y-2">
                  {displayCourses.map((c) => (
                    <li key={c.code} className="flex items-center gap-2.5 text-sm">
                      <span className="w-5 h-5 rounded-full bg-purple-900/60 border border-purple-700/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-400 text-[9px] font-bold">✓</span>
                      </span>
                      <div>
                        <span className="text-gray-500 text-[10px] font-bold uppercase">{c.code} </span>
                        <span className="text-gray-300">{c.name}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Classes count */}
            <div className="border-t border-gray-800 mt-4 pt-4 flex items-center justify-between">
              <span className="text-gray-500 text-sm">Total live classes</span>
              <span className="text-white font-black text-lg">{pack.classes} classes</span>
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
              <div key={t.text} className="flex items-center gap-2 text-gray-500 text-xs">
                <span>{t.icon}</span>
                <span>{t.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Payment form */}
        <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-black text-white mb-1">Complete Your Order</h2>
          <p className="text-gray-600 text-xs mb-6">Fill in your details below to secure your child's classes</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Contact info */}
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                placeholder="e.g. Sarah Johnson"
                className="w-full bg-black/60 border border-gray-700 focus:border-purple-500 outline-none rounded-lg p-3 text-white text-sm placeholder-gray-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
                placeholder="e.g. sarah@email.com"
                className="w-full bg-black/60 border border-gray-700 focus:border-purple-500 outline-none rounded-lg p-3 text-white text-sm placeholder-gray-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Phone (optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="e.g. +1 555 123 4567"
                className="w-full bg-black/60 border border-gray-700 focus:border-purple-500 outline-none rounded-lg p-3 text-white text-sm placeholder-gray-600 transition-colors"
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-3">Payment Method</label>
              <div className="space-y-2">
                {/* Stripe — always shown */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("stripe")}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    paymentMethod === "stripe"
                      ? "border-purple-500 bg-purple-900/20"
                      : "border-gray-700 bg-black/40 hover:border-gray-600"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${paymentMethod === "stripe" ? "border-purple-400" : "border-gray-600"}`}>
                    {paymentMethod === "stripe" && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-white text-sm font-semibold">Card / Apple Pay / Google Pay</p>
                    <p className="text-gray-500 text-xs">Powered by Stripe. Instant. Most popular.</p>
                  </div>
                  <span className="text-gray-500 text-xs">💳</span>
                </button>

                {/* Bank transfer — always shown */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank")}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    paymentMethod === "bank"
                      ? "border-blue-500 bg-blue-900/20"
                      : "border-gray-700 bg-black/40 hover:border-gray-600"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${paymentMethod === "bank" ? "border-blue-400" : "border-gray-600"}`}>
                    {paymentMethod === "bank" && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-white text-sm font-semibold">Bank Transfer</p>
                    <p className="text-gray-500 text-xs">We'll send account details after you submit. 1-2 business days.</p>
                  </div>
                  <span className="text-gray-500 text-xs">🏦</span>
                </button>

                {/* bKash — BD only */}
                {isBD && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bkash")}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                      paymentMethod === "bkash"
                        ? "border-green-500 bg-green-900/20"
                        : "border-gray-700 bg-black/40 hover:border-gray-600"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${paymentMethod === "bkash" ? "border-green-400" : "border-gray-600"}`}>
                      {paymentMethod === "bkash" && <div className="w-2 h-2 rounded-full bg-green-400" />}
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white text-sm font-semibold">bKash</p>
                      <p className="text-gray-500 text-xs">Instant mobile payment. Bangladesh only.</p>
                    </div>
                    <span className="text-gray-500 text-xs">📱</span>
                  </button>
                )}
              </div>
            </div>

            {/* Payment method specific info */}
            {paymentMethod === "stripe" && (
              <div className="p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg">
                <p className="text-purple-300 text-xs leading-relaxed">
                  You'll be redirected to a secure Stripe checkout page. Supports Visa, Mastercard, Amex, Apple Pay, and Google Pay.
                </p>
              </div>
            )}
            {paymentMethod === "bank" && (
              <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                <p className="text-blue-300 text-xs leading-relaxed">
                  After submitting, we'll email you our bank account details. Your classes are reserved for 48 hours while payment is confirmed.
                </p>
              </div>
            )}
            {paymentMethod === "bkash" && (
              <div className="p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
                <p className="text-green-300 text-xs leading-relaxed">
                  After submitting, we'll send you a bKash payment number and reference. Complete the transfer and we'll activate your classes within 2 hours.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-900/40 rounded-lg">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 text-white font-black rounded-xl shadow-lg shadow-purple-900/40 transition-all text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                <>
                  {paymentMethod === "stripe" ? `Pay ${pack.prices[region]} with Card` : `Reserve My Classes`}
                  <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                    {pack.classes} classes · {pack.name}
                  </span>
                </>
              )}
            </button>

            <p className="text-gray-700 text-[10px] text-center leading-relaxed">
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
        <div className="min-h-screen bg-[#050D1A] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
