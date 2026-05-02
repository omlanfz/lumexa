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

// Base prices (AI Creator Clubs tier)
const PLANS_BASE: Record<Region, { starter: string; growth: string; pro: string }> = {
  BD: { starter: "৳2,800", growth: "৳4,940", pro: "৳6,336" },
  IN: { starter: "₹2,200", growth: "₹3,800", pro: "₹4,840" },
  UK: { starter: "£20", growth: "£34", pro: "£44" },
  US: { starter: "$25", growth: "$43", pro: "$55" },
};

const PER_LESSON: Record<Region, { starter: string; growth: string; pro: string }> = {
  BD: { starter: "৳350/class", growth: "৳309/class", pro: "৳264/class" },
  IN: { starter: "₹275/class", growth: "₹238/class", pro: "₹202/class" },
  UK: { starter: "£2.50/class", growth: "£2.13/class", pro: "£1.83/class" },
  US: { starter: "$3.13/class", growth: "$2.66/class", pro: "$2.29/class" },
};

const plans = [
  {
    id: "starter",
    name: "Starter Pack",
    gems: 8,
    label: "8 Classes",
    subtitle: "Perfect to explore one topic",
    discount: null,
    persuasion:
      "The smartest entry point into Lumexa. 8 real classes is enough for your child to build a project, gain momentum, and show you what they're capable of. Zero risk, full experience.",
    popular: false,
    features: [
      "8 live classes across any pathway",
      "AI Creator Clubs, Pro Builder Pods, or Private Mentorship",
      "Recording of each class",
      "Teacher progress notes after every session",
      "Parent progress dashboard",
      "7-day class refund guarantee",
    ],
  },
  {
    id: "growth",
    name: "Growth Pack",
    gems: 16,
    label: "16 Classes",
    subtitle: "Build real skills across two courses",
    discount: 5,
    popular: true,
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
  },
  {
    id: "pro",
    name: "Pro Pack",
    gems: 24,
    label: "24 Classes",
    subtitle: "Complete a full pathway",
    discount: 12,
    popular: false,
    features: [
      "24 live classes — one complete pathway",
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
  },
];

// Format comparison data
const formatComparison = [
  {
    id: "clubs",
    name: "AI Creator Clubs",
    emoji: "🏫",
    subtitle: "Group Learning",
    groupSize: "8–15 students",
    duration: "60 min",
    priceNote: "Base price (shown above)",
    tag: "Entry Level · Explore & Discover",
    tagColor: "text-blue-400",
    border: "border-blue-700/30",
    bg: "bg-blue-900/10",
    pill: "bg-blue-900/40 text-blue-300",
    bestFor: "Parents who want their child to try coding in a fun, social environment before committing to intensive learning.",
  },
  {
    id: "pods",
    name: "Pro Builder Pods",
    emoji: "🎯",
    subtitle: "Small Group Learning",
    groupSize: "3–5 students",
    duration: "60 min",
    priceNote: "~50% above base",
    tag: "Best Value · Build Real Skills",
    tagColor: "text-purple-400",
    border: "border-purple-600/40",
    bg: "bg-purple-900/10",
    pill: "bg-purple-900/40 text-purple-300",
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
    tagColor: "text-green-400",
    border: "border-green-700/30",
    bg: "bg-green-900/10",
    pill: "bg-green-900/40 text-green-300",
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
    a: "These are our three learning formats. AI Creator Clubs are group classes (8–15 students, 60 min) — the most affordable entry point. Pro Builder Pods are small-group classes (3–5 students, 60 min) — the best balance of attention and price. Private AI Mentorship is 1-on-1 (45 min) — the fastest, most personalised progress. Your class pack credits work across all three formats.",
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

export default function PricingPage() {
  const [region, setRegion] = useState<Region>("US");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setRegion(TIMEZONE_TO_REGION[tz] ?? "US");
    } catch {}
    setDetected(true);
  }, []);

  const prices = PLANS_BASE[region];
  const perLesson = PER_LESSON[region];

  if (!detected) return null;

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
            Invest in Real Skills,{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Not Just Courses
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-4">
            Buy a class bundle. Use them any time, any pathway, any format — AI Creator Clubs,
            Pro Builder Pods, or Private Mentorship. No monthly fees, no lock-in.
          </p>
          <p className="text-gray-600 text-sm">
            {REGION_LABELS[region].flag} Prices shown in {REGION_LABELS[region].currency} based
            on your location
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const price = prices[plan.id as keyof typeof prices];
            const lesson = perLesson[plan.id as keyof typeof perLesson];
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

                {plan.discount && (
                  <div className="absolute top-5 right-5">
                    <span className="px-2.5 py-1 rounded-lg bg-green-900/60 border border-green-700/50 text-green-400 text-[11px] font-black uppercase tracking-wider">
                      {plan.discount}% OFF
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-white font-black text-xl mb-0.5">{plan.name}</h3>
                  <p className="text-gray-500 text-xs">{plan.subtitle}</p>
                </div>

                <div className="mb-2">
                  <div className="text-4xl font-black text-white mb-1">{price}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{plan.label}</span>
                    <span className="text-gray-700">·</span>
                    <span className="text-sm text-gray-400">{lesson}</span>
                  </div>
                </div>

                {plan.discount ? (
                  <p className="text-xs text-green-400 mb-5 leading-relaxed">
                    Save {plan.discount}% vs individual classes. More sessions = more real skills
                    built, faster transformation.
                  </p>
                ) : (
                  <p className="text-xs text-blue-400/80 mb-5 leading-relaxed">
                    {plan.persuasion}
                  </p>
                )}

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
                    href={`/payment?pack=${plan.id}&region=${region}`}
                    className={`w-full py-3.5 text-center text-sm font-bold rounded-xl transition-all ${
                      plan.popular
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/40"
                        : "bg-gray-800 hover:bg-gray-700 text-white"
                    }`}
                  >
                    Buy Now
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                      Secure checkout
                    </span>
                  </Link>
                  <Link
                    href="/trial"
                    className="w-full py-2.5 text-center text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Try one class free first →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Value promise */}
        <div className="max-w-5xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "🔒", title: "Secure Checkout", desc: "All payments encrypted. Stripe-powered." },
            { icon: "↩️", title: "7-Day Refund", desc: "Unused classes refunded, no questions." },
            { icon: "🌍", title: "Local Currency", desc: "Prices auto-detected from your location." },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 p-4 bg-gray-900/40 border border-gray-800 rounded-xl"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-white text-sm font-semibold">{item.title}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Format comparison */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#07101F]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-2">
              3 Learning Formats
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
              Your Class Pack Works Across All Formats
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">
              The prices above are base rates for AI Creator Clubs. Choose your format below —
              your teacher will recommend the best fit, or switch anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {formatComparison.map((f) => (
              <div
                key={f.id}
                className={`relative p-5 rounded-2xl border ${f.border} ${f.bg} transition-all ${
                  f.featured ? "ring-1 ring-purple-500/20 shadow-xl shadow-purple-900/10" : ""
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
                    <h3 className="text-white font-black text-base">{f.name}</h3>
                    <p className="text-gray-500 text-xs">{f.subtitle}</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${f.pill}`}>
                    {f.groupSize}
                  </span>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${f.pill}`}>
                    {f.duration} / class
                  </span>
                </div>

                <p className={`text-xs font-bold mb-2 ${f.tagColor}`}>{f.tag}</p>
                <p className="text-gray-400 text-xs leading-relaxed mb-3">{f.bestFor}</p>

                <div className="pt-3 border-t border-gray-800/60 flex items-center justify-between">
                  <span className="text-gray-600 text-xs">Pricing</span>
                  <span className={`text-xs font-bold ${f.tagColor}`}>{f.priceNote}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            Not sure which format is right?{" "}
            <Link href="/trial" className="text-purple-400 hover:text-purple-300 transition-colors">
              Book a free trial
            </Link>{" "}
            and your teacher will recommend the best fit for your child.
          </p>
        </div>
      </section>

      {/* Free trial banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto p-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/30 rounded-2xl text-center">
          <div className="text-4xl mb-4">🎁</div>
          <h2 className="text-2xl font-black text-white mb-3">Start With a Free Trial First</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Not ready to commit? Book a free trial class. No card required. Your child builds
            something real in session 1, and you decide if you want to continue.
          </p>
          <Link
            href="/trial"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02]"
          >
            Book Free Trial Class
            <span className="block text-xs font-normal opacity-70 mt-0.5">
              No credit card, no commitment
            </span>
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
              <div key={i} className="border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-900/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-white">{faq.q}</span>
                  <span
                    className={`text-gray-500 transition-transform flex-shrink-0 ml-4 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  >
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
