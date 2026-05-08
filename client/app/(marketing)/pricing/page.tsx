"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Region system (9 regions, Tier 1/2/3) ─────────────────────────────────
type Region = "US" | "CA" | "AU" | "UK" | "EU" | "IN" | "BD" | "PH" | "NG";

const REGIONS: Record<Region, {
  flag: string; name: string; symbol: string; label: string; tier: 1 | 2 | 3;
  starter: number; growth: number; pro: number;
}> = {
  // Tier 1 — Premium markets
  US: { flag: "🇺🇸", name: "United States",  symbol: "$",  label: "USD", tier: 1, starter: 25,    growth: 43,    pro: 55    },
  CA: { flag: "🇨🇦", name: "Canada",          symbol: "C$", label: "CAD", tier: 1, starter: 34,    growth: 58,    pro: 74    },
  AU: { flag: "🇦🇺", name: "Australia",       symbol: "A$", label: "AUD", tier: 1, starter: 38,    growth: 65,    pro: 83    },
  UK: { flag: "🇬🇧", name: "United Kingdom",  symbol: "£",  label: "GBP", tier: 1, starter: 20,    growth: 34,    pro: 44    },
  EU: { flag: "🇪🇺", name: "Europe",          symbol: "€",  label: "EUR", tier: 1, starter: 23,    growth: 39,    pro: 50    },
  // Tier 2 — Mid-tier markets
  PH: { flag: "🇵🇭", name: "Philippines",    symbol: "₱",  label: "PHP", tier: 2, starter: 1400,  growth: 2450,  pro: 3136  },
  NG: { flag: "🇳🇬", name: "Nigeria",         symbol: "₦",  label: "NGN", tier: 2, starter: 20000, growth: 35200, pro: 45000 },
  // Tier 3 — Emerging markets
  IN: { flag: "🇮🇳", name: "India",           symbol: "₹",  label: "INR", tier: 3, starter: 2200,  growth: 3800,  pro: 4840  },
  BD: { flag: "🇧🇩", name: "Bangladesh",      symbol: "৳",  label: "BDT", tier: 3, starter: 2800,  growth: 4940,  pro: 6336  },
};

const TZ_TO_REGION: Record<string, Region> = {
  "Asia/Dhaka":          "BD", "Asia/Kolkata":        "IN", "Asia/Calcutta":  "IN",
  "Asia/Manila":         "PH", "Africa/Lagos":        "NG", "Africa/Abuja":   "NG",
  "Europe/London":       "UK", "Europe/Dublin":       "UK", "Europe/Berlin":  "EU",
  "Europe/Paris":        "EU", "Europe/Amsterdam":    "EU", "Europe/Madrid":  "EU",
  "Europe/Rome":         "EU", "Europe/Warsaw":       "EU", "Europe/Stockholm":"EU",
  "Australia/Sydney":    "AU", "Australia/Melbourne": "AU", "Australia/Brisbane":"AU",
  "Australia/Perth":     "AU", "America/Toronto":     "CA", "America/Vancouver":"CA",
  "America/Montreal":    "CA", "America/New_York":    "US", "America/Chicago": "US",
  "America/Denver":      "US", "America/Los_Angeles": "US", "America/Phoenix": "US",
};

function fmtPrice(amount: number, symbol: string): string {
  const rounded = Math.round(amount);
  return `${symbol}${rounded >= 1000 ? rounded.toLocaleString("en-US") : rounded}`;
}
function fmtPerClass(total: number, classes: number, symbol: string): string {
  const pc = total / classes;
  const rounded = pc >= 100 ? Math.round(pc) : Math.round(pc * 10) / 10;
  return `${symbol}${rounded >= 1000 ? rounded.toLocaleString("en-US") : rounded}/class`;
}

// Format comparison data
const formatComparison = [
  {
    id: "clubs",
    name: "AI Creator Clubs",
    emoji: "🏫",
    subtitle: "Group Learning",
    groupSize: "8-15 students",
    duration: "60 min",
    priceNote: "Base price (shown above)",
    tag: "Entry Level · Explore & Discover",
    accent: "blue",
    featured: false,
    bestFor: "Parents who want their child to try coding in a fun, social environment before committing to intensive learning.",
  },
  {
    id: "pods",
    name: "Pro Builder Pods",
    emoji: "🎯",
    subtitle: "Small Group Learning",
    groupSize: "3-5 students",
    duration: "60 min",
    priceNote: "~50% above base",
    tag: "Best Value · Build Real Skills",
    accent: "purple",
    featured: true,
    bestFor: "Parents who want focused teacher attention, peer collaboration, and faster skill development at a sensible price.",
  },
  {
    id: "mentorship",
    name: "Private AI Mentorship",
    emoji: "🚀",
    subtitle: "1-on-1 Learning",
    groupSize: "1 student",
    duration: "45 min",
    priceNote: "~2.5× base",
    tag: "Premium · Fastest Progress",
    accent: "green",
    featured: false,
    bestFor: "Parents who want 100% personalised attention, the fastest progress, and a fully custom curriculum.",
  },
];

const faqs = [
  {
    q: "What is a class pack?",
    a: "You buy a bundle of live classes upfront, then use them to book sessions with any teacher, any pathway, any time. Unused classes are refunded within 7 days if you change your mind.",
  },
  {
    q: "What are AI Creator Clubs, Pro Builder Pods, and Private Mentorship?",
    a: "These are our three learning formats. AI Creator Clubs are group classes (8-15 students, 60 min): the most affordable entry point. Pro Builder Pods are small-group classes (3-5 students, 60 min): the best balance of attention and price. Private AI Mentorship is 1-on-1 (45 min): the fastest, most personalised progress.",
  },
  {
    q: "Can I switch between formats?",
    a: "Yes. Your class credits are format-flexible. Start in Creator Clubs to explore, upgrade to Builder Pods when you're ready to build real skills, or try Private Mentorship anytime. No extra charge to switch.",
  },
  {
    q: "Can I switch pathways mid-way?",
    a: "Yes. Classes work across all pathways. If your child starts Game Creator and wants to try AI Builder, just book a new teacher. No penalty, no re-purchase.",
  },
  {
    q: "Is the free trial actually free?",
    a: "100%. No credit card. No sneaky subscriptions. Your child does a real lesson with a real teacher. If it's not the right fit, you owe nothing.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept Stripe payments (including cards, Apple Pay, and Google Pay) and direct bank transfers.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes. Any unused classes can be refunded within 7 days of purchase. Used classes (completed lessons) are non-refundable, but we guarantee visible progress or we'll make it right.",
  },
  {
    q: "Do classes expire?",
    a: "No expiry date. Your classes stay in your account until you use them. Book at your own pace.",
  },
  {
    q: "What if my child doesn't like their teacher?",
    a: "Request a teacher change anytime, free, no questions asked. We'll match your child with a new teacher immediately.",
  },
  {
    q: "Are classes recorded?",
    a: "Yes. Every class is recorded and available in your parent dashboard for 90 days so your child can review lessons anytime.",
  },
];

const TIER_LABELS: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: { label: "Tier 1 · Premium Market",    color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/40" },
  2: { label: "Tier 2 · Mid-Tier Market",   color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40" },
  3: { label: "Tier 3 · Emerging Market",   color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700/40" },
};

export default function PricingPage() {
  const [region, setRegion]     = useState<Region>("US");
  const [openFaq, setOpenFaq]   = useState<number | null>(null);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setRegion(TZ_TO_REGION[tz] ?? "US");
    } catch {}
    setDetected(true);
  }, []);

  if (!detected) return null;

  const r    = REGIONS[region];
  const tier = TIER_LABELS[r.tier];

  const plans = [
    {
      id:       "starter",
      name:     "Starter Pack",
      classes:  8,
      price:    r.starter,
      discount: null as number | null,
      subtitle: "Perfect to explore one topic",
      persuasion: "The smartest entry point into Lumexa. 8 real classes is enough for your child to build a project, gain momentum, and show you what they're capable of. Zero risk, full experience.",
      features: [
        "8 live classes across any pathway",
        "AI Creator Clubs, Pro Builder Pods, or Private Mentorship",
        "Recording of each class",
        "Teacher progress notes after every session",
        "Parent progress dashboard",
        "7-day class refund guarantee",
      ],
      featured: false,
      accentClass: "text-blue-600 dark:text-blue-400",
      btnClass: "bg-[#E2E8F0] dark:bg-gray-800 hover:bg-[#D1D5DB] dark:hover:bg-gray-700 text-[#0F172A] dark:text-white",
      borderClass: "border-[#E2E8F0] dark:border-gray-700",
    },
    {
      id:       "growth",
      name:     "Growth Pack",
      classes:  16,
      price:    r.growth,
      discount: 5 as number | null,
      subtitle: "Build real skills across two courses",
      persuasion: "More sessions = more real skills built, faster transformation.",
      features: [
        "16 live classes across any pathway",
        "AI Creator Clubs, Pro Builder Pods, or Private Mentorship",
        "Two full courses in your chosen pathway",
        "Recording of each class",
        "Teacher progress notes after every session",
        "Parent progress dashboard",
        "Priority teacher matching",
        "Mid-point skill review session",
        "7-day class refund guarantee",
      ],
      featured: true,
      accentClass: "text-purple-600 dark:text-purple-400",
      btnClass: "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-200 dark:shadow-purple-900/40",
      borderClass: "border-purple-300 dark:border-purple-500/50",
    },
    {
      id:       "pro",
      name:     "Pro Pack",
      classes:  24,
      price:    r.pro,
      discount: 12 as number | null,
      subtitle: "Complete a full pathway",
      persuasion: "Complete a full pathway. 24 classes, 3 portfolio projects, certificate of completion.",
      features: [
        "24 live classes to complete one full pathway",
        "AI Creator Clubs, Pro Builder Pods, or Private Mentorship",
        "Three full courses end-to-end",
        "Recording of each class",
        "Teacher progress notes after every session",
        "Parent progress dashboard",
        "Priority teacher matching",
        "Two skill review sessions",
        "Portfolio review and feedback",
        "Course completion certificate",
        "7-day class refund guarantee",
      ],
      featured: false,
      accentClass: "text-teal-600 dark:text-teal-400",
      btnClass: "bg-[#E2E8F0] dark:bg-gray-800 hover:bg-[#D1D5DB] dark:hover:bg-gray-700 text-[#0F172A] dark:text-white",
      borderClass: "border-[#E2E8F0] dark:border-gray-700",
    },
  ];

  return (
    <div className="bg-[#F7F9FF] dark:bg-[#050D1A] text-[#0F172A] dark:text-white transition-colors duration-200">

      {/* Hero */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-300/20 dark:bg-purple-700/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-300 dark:border-purple-700/40 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
            Invest in Real Skills,{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              Not Just Courses
            </span>
          </h1>
          <p className="text-lg text-[#64748B] dark:text-gray-400 max-w-xl mx-auto mb-4">
            Buy a class bundle. Use them any time, any pathway, any format: AI Creator Clubs,
            Pro Builder Pods, or Private Mentorship. No monthly fees, no lock-in.
          </p>
          <p className="text-[#94A3B8] dark:text-gray-600 text-sm">
            {r.flag} Prices shown in {r.label} based on your location
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Region + tier info bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 bg-white dark:bg-gray-900/40 border border-[#E2E8F0] dark:border-gray-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{r.flag}</span>
              <div>
                <p className="text-sm font-bold text-[#0F172A] dark:text-white">{r.name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.color}`}>
                  {tier.label}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#94A3B8] dark:text-gray-500">
              Prices are purchasing-power adjusted for your region.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col p-7 rounded-2xl border-2 transition-all card-hover ${plan.borderClass} bg-white dark:bg-gray-900/50 ${
                  plan.featured
                    ? "ring-2 ring-purple-300 dark:ring-purple-500/20 shadow-xl shadow-purple-100 dark:shadow-purple-900/30"
                    : "shadow-sm dark:shadow-none"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                {plan.discount && (
                  <div className="absolute top-5 right-5">
                    <span className="px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/60 border border-green-200 dark:border-green-700/50 text-green-700 dark:text-green-400 text-[11px] font-black uppercase tracking-wider">
                      {plan.discount}% OFF
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="font-black text-xl mb-0.5">{plan.name}</h3>
                  <p className="text-[#94A3B8] dark:text-gray-500 text-xs">{plan.subtitle}</p>
                </div>

                <div className="mb-2">
                  <div className={`text-4xl font-black mb-1 ${plan.accentClass}`}>
                    {fmtPrice(plan.price, r.symbol)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#64748B] dark:text-gray-400">{plan.classes} classes</span>
                    <span className="text-[#CBD5E1] dark:text-gray-700">·</span>
                    <span className="text-sm text-[#64748B] dark:text-gray-400">
                      {fmtPerClass(plan.price, plan.classes, r.symbol)}
                    </span>
                  </div>
                </div>

                <p className={`text-xs mb-5 leading-relaxed ${plan.discount ? "text-green-600 dark:text-green-400" : "text-blue-600/80 dark:text-blue-400/80"}`}>
                  {plan.persuasion}
                </p>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#334155] dark:text-gray-300">
                      <span className="w-4 h-4 rounded-full bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-600 dark:text-green-400 text-[9px] font-bold">✓</span>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-2">
                  <Link
                    href={`/payment?pack=${plan.id}&region=${region}`}
                    className={`w-full py-3.5 text-center text-sm font-bold rounded-xl transition-all ${plan.btnClass}`}
                  >
                    Buy Now
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                      Secure checkout
                    </span>
                  </Link>
                  <Link
                    href="/trial"
                    className="w-full py-2.5 text-center text-xs font-semibold text-[#94A3B8] dark:text-gray-500 hover:text-[#64748B] dark:hover:text-gray-300 transition-colors"
                  >
                    Try one class free first →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Value promise */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              { icon: "🔒", title: "Secure Checkout", desc: "All payments encrypted. Stripe-powered." },
              { icon: "↩️", title: "7-Day Refund",    desc: "Unused classes refunded, no questions." },
              { icon: "🌍", title: "Local Currency",  desc: "Prices auto-adjusted for your region." },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900/40 border border-[#E2E8F0] dark:border-gray-800 rounded-xl"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-[#94A3B8] dark:text-gray-500 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Region selector */}
          <div className="p-5 bg-white dark:bg-gray-900/40 border border-[#E2E8F0] dark:border-gray-800 rounded-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] dark:text-gray-500 mb-4 text-center">
              Switch Currency / Region
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {(Object.keys(REGIONS) as Region[]).map((rk) => {
                const reg = REGIONS[rk];
                return (
                  <button
                    key={rk}
                    onClick={() => setRegion(rk)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      region === rk
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-[#F7F9FF] dark:bg-gray-800 text-[#64748B] dark:text-gray-400 border-[#E2E8F0] dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600/50 hover:text-purple-600 dark:hover:text-purple-400"
                    }`}
                  >
                    {reg.flag} {reg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Format comparison */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#07101F] transition-colors duration-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-widest mb-2">
              3 Learning Formats
            </p>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">
              Your Class Pack Works Across All Formats
            </h2>
            <p className="text-[#64748B] dark:text-gray-400 max-w-xl mx-auto text-sm">
              The prices above are base rates for AI Creator Clubs. Choose your format below.
              Your teacher will recommend the best fit, or switch anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {formatComparison.map((f) => {
              const borderMap = { blue: "border-blue-200 dark:border-blue-700/30 bg-blue-50/50 dark:bg-blue-900/10", purple: "border-purple-200 dark:border-purple-600/40 bg-purple-50/50 dark:bg-purple-900/10", green: "border-green-200 dark:border-green-700/30 bg-green-50/50 dark:bg-green-900/10" };
              const tagMap    = { blue: "text-blue-600 dark:text-blue-400", purple: "text-purple-600 dark:text-purple-400", green: "text-green-600 dark:text-green-400" };
              const pillMap   = { blue: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300", purple: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300", green: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" };

              return (
                <div
                  key={f.id}
                  className={`relative p-5 rounded-2xl border transition-all card-hover ${borderMap[f.accent as keyof typeof borderMap]} ${
                    f.featured ? "ring-1 ring-purple-200 dark:ring-purple-500/20 shadow-lg shadow-purple-50 dark:shadow-purple-900/10" : ""
                  }`}
                >
                  {f.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-purple-600 rounded-full text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                      Most Recommended
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{f.emoji}</span>
                    <div>
                      <h3 className="font-black text-base">{f.name}</h3>
                      <p className="text-[#94A3B8] dark:text-gray-500 text-xs">{f.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${pillMap[f.accent as keyof typeof pillMap]}`}>
                      {f.groupSize}
                    </span>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${pillMap[f.accent as keyof typeof pillMap]}`}>
                      {f.duration} / class
                    </span>
                  </div>

                  <p className={`text-xs font-bold mb-2 ${tagMap[f.accent as keyof typeof tagMap]}`}>{f.tag}</p>
                  <p className="text-[#64748B] dark:text-gray-400 text-xs leading-relaxed mb-3">{f.bestFor}</p>

                  <div className="pt-3 border-t border-[#E2E8F0] dark:border-gray-800/60 flex items-center justify-between">
                    <span className="text-[#94A3B8] dark:text-gray-600 text-xs">Pricing</span>
                    <span className={`text-xs font-bold ${tagMap[f.accent as keyof typeof tagMap]}`}>{f.priceNote}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[#94A3B8] dark:text-gray-600 text-xs mt-6">
            Not sure which format is right?{" "}
            <Link href="/trial" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
              Book a free trial
            </Link>{" "}
            and your teacher will recommend the best fit for your child.
          </p>
        </div>
      </section>

      {/* Free trial banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto p-8 bg-gradient-to-r from-purple-50 dark:from-purple-900/20 to-blue-50 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700/30 rounded-2xl text-center">
          <div className="text-4xl mb-4">🎁</div>
          <h2 className="text-2xl font-black mb-3">Start With a Free Trial First</h2>
          <p className="text-[#64748B] dark:text-gray-400 mb-6 max-w-lg mx-auto">
            Not ready to commit? Book a free trial class. No card required. Your child builds
            something real in session 1, and you decide if you want to continue.
          </p>
          <Link
            href="/trial"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl shadow-xl shadow-purple-200 dark:shadow-purple-900/40 transition-all hover:scale-[1.02]"
          >
            Book Free Trial Class
            <span className="block text-xs font-normal opacity-70 mt-0.5">
              No credit card, no commitment
            </span>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#07101F] transition-colors duration-200">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-[#E2E8F0] dark:border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F7F9FF] dark:hover:bg-gray-900/50 transition-colors"
                >
                  <span className="text-sm font-semibold">{faq.q}</span>
                  <span
                    className={`text-[#94A3B8] dark:text-gray-500 transition-transform flex-shrink-0 ml-4 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-[#64748B] dark:text-gray-400 leading-relaxed">{faq.a}</p>
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
