"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Region = "BD" | "IN" | "UK" | "US";

const TIMEZONE_TO_REGION: Record<string, Region> = {
  "Asia/Dhaka": "BD",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Europe/London": "UK",
};

const REGION_LABELS: Record<Region, { flag: string; name: string; currency: string }> = {
  BD: { flag: "🇧🇩", name: "Bangladesh", currency: "BDT (৳)" },
  IN: { flag: "🇮🇳", name: "India", currency: "INR (₹)" },
  UK: { flag: "🇬🇧", name: "United Kingdom", currency: "GBP (£)" },
  US: { flag: "🇺🇸", name: "International", currency: "USD ($)" },
};

const PLANS: Record<Region, { starter: string; growth: string; pro: string }> = {
  BD: { starter: "৳2,800", growth: "৳5,200", pro: "৳7,200" },
  IN: { starter: "₹2,200", growth: "₹4,000", pro: "₹5,500" },
  UK: { starter: "£20", growth: "£36", pro: "£50" },
  US: { starter: "$25", growth: "$45", pro: "$62" },
};

const PAYMENT_METHODS: Record<Region, string[]> = {
  BD: ["bKash", "Nagad", "Credit / Debit Card", "Bank Transfer"],
  IN: ["UPI", "Paytm", "Credit / Debit Card", "Bank Transfer"],
  UK: ["Credit / Debit Card", "Bank Transfer"],
  US: ["Credit / Debit Card", "Bank Transfer"],
};

const plans = [
  {
    id: "starter",
    name: "Starter",
    gems: 8,
    label: "8 Gems",
    subtitle: "Perfect to explore one topic",
    popular: false,
    features: [
      "8 live 1-on-1 lessons",
      "One pathway / topic",
      "Recording of each class",
      "Teacher progress notes",
      "Parent progress dashboard",
      "7-day gem refund guarantee",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    gems: 16,
    label: "16 Gems",
    subtitle: "Build real skills, two courses",
    popular: true,
    features: [
      "16 live 1-on-1 lessons",
      "Two courses across any pathway",
      "Recording of each class",
      "Teacher progress notes",
      "Parent progress dashboard",
      "Priority teacher matching",
      "Mid-point skill review session",
      "7-day gem refund guarantee",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    gems: 24,
    label: "24 Gems",
    subtitle: "Complete a full pathway",
    popular: false,
    features: [
      "24 live 1-on-1 lessons",
      "Full pathway (3 courses)",
      "Recording of each class",
      "Teacher progress notes",
      "Parent progress dashboard",
      "Priority teacher matching",
      "Two skill review sessions",
      "Portfolio review and feedback",
      "Course completion certificate",
      "7-day gem refund guarantee",
    ],
  },
];

const faqs = [
  {
    q: "What is a Gem?",
    a: "A Gem = one live 1-on-1 lesson. You buy a bundle of gems upfront, then use them to book lessons with any teacher, any pathway, any time. Unused gems refunded within 7 days if you change your mind.",
  },
  {
    q: "Can I switch pathways mid-way?",
    a: "Yes. Gems work across all pathways. If your child starts Game Creator and wants to try AI Builder, just book a new teacher — no penalty, no re-purchase.",
  },
  {
    q: "Is the free trial actually free?",
    a: "100%. No credit card. No sneaky subscriptions. Your child does a real lesson with a real teacher. If it's not the right fit, you owe nothing.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We support local payment methods for each region. Bangladesh: bKash, Nagad, card. India: UPI, Paytm, card. UK and International: card and bank transfer.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes. Any unused gems can be refunded within 7 days of purchase. Used gems (completed lessons) are non-refundable, but we guarantee visible progress or we'll make it right.",
  },
  {
    q: "Do lessons expire?",
    a: "No expiry date. Your gems stay in your account until you use them. Book at your own pace.",
  },
  {
    q: "What if my child doesn't like their teacher?",
    a: "Request a teacher change anytime — free, no questions asked. We'll match your child with a new teacher immediately.",
  },
  {
    q: "Are classes recorded?",
    a: "Yes. Every class is recorded and available in your parent dashboard for 90 days so your child can review lessons anytime.",
  },
];

export default function PricingPage() {
  const [region, setRegion] = useState<Region>("US");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setRegion(TIMEZONE_TO_REGION[tz] ?? "US");
  }, []);

  const prices = PLANS[region];

  return (
    <div className="bg-[#050D1A] text-white">
      {/* Hero */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-700/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-700/40 bg-purple-900/20 text-purple-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Pay for Lessons,{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Not Subscriptions
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
            Buy a bundle of gems (lessons). Use them any time, any pathway, any teacher. No monthly fees, no lock-in.
          </p>

          {/* Region selector */}
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-900/60 border border-gray-700 rounded-full">
            <span className="text-xs text-gray-500">Showing prices for:</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as Region)}
              className="bg-transparent text-white text-sm font-semibold outline-none cursor-pointer"
            >
              {(Object.keys(REGION_LABELS) as Region[]).map((r) => (
                <option key={r} value={r} className="bg-gray-900">
                  {REGION_LABELS[r].flag} {REGION_LABELS[r].name} ({REGION_LABELS[r].currency})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const price = prices[plan.id as keyof typeof prices];
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col p-7 rounded-2xl border transition-all ${
                  plan.popular
                    ? "border-purple-500/50 bg-purple-900/10 shadow-2xl shadow-purple-900/30 ring-1 ring-purple-500/20"
                    : "border-gray-700 bg-gray-900/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-white font-black text-xl mb-0.5">{plan.name}</h3>
                  <p className="text-gray-500 text-xs">{plan.subtitle}</p>
                </div>

                <div className="mb-6">
                  <div className="text-4xl font-black text-white mb-1">{price}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{plan.label}</span>
                    <span className="text-gray-700">·</span>
                    <span className="text-sm text-gray-400">
                      {price}/{plan.gems} lessons
                    </span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <span className="w-4 h-4 rounded-full bg-green-900/50 border border-green-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-400 text-[9px] font-bold">✓</span>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-2">
                  <Link
                    href="/trial"
                    className={`w-full py-3.5 text-center text-sm font-bold rounded-xl transition-all ${
                      plan.popular
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/40"
                        : "bg-gray-800 hover:bg-gray-700 text-white"
                    }`}
                  >
                    Start with Free Trial
                  </Link>
                  <Link
                    href="/courses"
                    className="w-full py-2.5 text-center text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    See what you'll build →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment methods */}
        <div className="max-w-5xl mx-auto mt-8 p-5 bg-gray-900/40 border border-gray-800 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                {REGION_LABELS[region].flag} Payment methods for {REGION_LABELS[region].name}
              </p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS[region].map((m) => (
                  <span key={m} className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                    m === "bKash" ? "border-green-700/50 bg-green-900/20 text-green-400" :
                    m === "Nagad" ? "border-orange-700/50 bg-orange-900/20 text-orange-400" :
                    m === "UPI" || m === "Paytm" ? "border-blue-700/50 bg-blue-900/20 text-blue-400" :
                    "border-gray-700 bg-gray-800/50 text-gray-400"
                  }`}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div className="sm:ml-auto text-xs text-gray-600 text-right">
              All prices include applicable taxes.<br />7-day refund on unused gems.
            </div>
          </div>
        </div>
      </section>

      {/* Free trial banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto p-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/30 rounded-2xl text-center">
          <div className="text-4xl mb-4">🎁</div>
          <h2 className="text-2xl font-black text-white mb-3">Start With a Free Trial First</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Not ready to commit? Book a free 1-on-1 trial class. No card required. Your child builds something real in session 1, and you decide if you want to continue.
          </p>
          <Link
            href="/trial"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02]"
          >
            Book Free Trial Class
            <span className="block text-xs font-normal opacity-70 mt-0.5">No credit card, no commitment</span>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-gray-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-900/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-white">{faq.q}</span>
                  <span className={`text-gray-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
