"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Region = "BD" | "IN" | "UK" | "US";

interface RegionConfig {
  currency: string;
  packs: { starter: string; growth: string; pro: string };
  perLesson: { starter: string; growth: string; pro: string };
}

const regions: Record<Region, RegionConfig> = {
  BD: {
    currency: "৳",
    packs: { starter: "2,800৳", growth: "4,940৳", pro: "6,336৳" },
    perLesson: { starter: "350৳/class", growth: "309৳/class", pro: "264৳/class" },
  },
  IN: {
    currency: "₹",
    packs: { starter: "₹2,200", growth: "₹3,800", pro: "₹4,840" },
    perLesson: { starter: "₹275/class", growth: "₹238/class", pro: "₹202/class" },
  },
  UK: {
    currency: "£",
    packs: { starter: "£20", growth: "£34", pro: "£44" },
    perLesson: { starter: "£2.50/class", growth: "£2.13/class", pro: "£1.83/class" },
  },
  US: {
    currency: "$",
    packs: { starter: "$25", growth: "$43", pro: "$55" },
    perLesson: { starter: "$3.13/class", growth: "$2.66/class", pro: "$2.29/class" },
  },
};

const TIMEZONE_TO_REGION: Record<string, Region> = {
  "Asia/Dhaka": "BD",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Europe/London": "UK",
};

const packs = [
  {
    id: "starter",
    key: "starter" as const,
    name: "Starter Pack",
    gems: 8,
    subtitle: "Explorer Bundle",
    discount: null,
    persuasion:
      "The perfect first step. 8 live classes are enough to build a real project and see exactly what your child is capable of. No risk, full value.",
    features: [
      "8 live classes across any pathway",
      "Choice of AI Creator Clubs, Pro Builder Pods, or Private Mentorship",
      "Progress report after each class",
      "Class recordings included",
      "7-day refund on unused classes",
    ],
    color: "border-blue-700/40 hover:border-blue-500/60",
    badge: "text-blue-400",
    accent: "from-blue-600 to-cyan-600",
    buyStyle: "bg-blue-600 hover:bg-blue-500 text-white",
  },
  {
    id: "growth",
    key: "growth" as const,
    name: "Growth Pack",
    gems: 16,
    subtitle: "Builder Bundle",
    discount: 5,
    features: [
      "16 live classes across any pathway",
      "Choice of AI Creator Clubs, Pro Builder Pods, or Private Mentorship",
      "AI-powered progress reports",
      "Priority teacher matching",
      "Class recordings included",
      "7-day refund on unused classes",
    ],
    color: "border-purple-600/60 hover:border-purple-400",
    badge: "text-purple-400",
    accent: "from-purple-600 to-blue-600",
    buyStyle:
      "bg-gradient-to-r from-purple-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 text-white",
    featured: true,
  },
  {
    id: "pro",
    key: "pro" as const,
    name: "Pro Pack",
    gems: 24,
    subtitle: "Creator Bundle",
    discount: 12,
    features: [
      "24 live classes — complete a full pathway",
      "Choice of AI Creator Clubs, Pro Builder Pods, or Private Mentorship",
      "AI-powered progress reports",
      "Priority teacher matching",
      "Class recordings included",
      "Certificate of completion",
      "Portfolio review and feedback",
      "7-day refund on unused classes",
    ],
    color: "border-teal-700/40 hover:border-teal-500/60",
    badge: "text-teal-400",
    accent: "from-teal-600 to-green-600",
    buyStyle: "bg-teal-600 hover:bg-teal-500 text-white",
  },
];

// Format comparison row shown above packs
const formats = [
  {
    name: "AI Creator Clubs",
    desc: "8–15 students · 60 min",
    label: "Entry",
    color: "text-blue-400",
    bg: "bg-blue-900/20 border-blue-800/30",
  },
  {
    name: "Pro Builder Pods",
    desc: "3–5 students · 60 min",
    label: "Best Value",
    color: "text-purple-400",
    bg: "bg-purple-900/20 border-purple-800/30",
    highlight: true,
  },
  {
    name: "Private Mentorship",
    desc: "1 student · 45 min",
    label: "Premium",
    color: "text-green-400",
    bg: "bg-green-900/20 border-green-800/30",
  },
];

export default function PricingSection() {
  const [region, setRegion] = useState<Region>("US");
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const r = TIMEZONE_TO_REGION[tz];
      if (r) setRegion(r);
    } catch {}
    setDetected(true);
  }, []);

  if (!detected) return null;

  const cfg = regions[region];

  return (
    <section className="py-20 bg-[#07101F]" id="pricing">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-purple-400 text-sm font-bold uppercase tracking-widest mb-2">
            Simple Pricing · No Subscriptions
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Invest in Your Child&apos;s{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Future Career
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-3">
            Buy a class pack. Use them across any pathway and any learning format — AI Creator Clubs,
            Pro Builder Pods, or Private Mentorship. No monthly fees, no lock-ins.
          </p>
          <p className="text-gray-600 text-xs">
            Prices shown in your local currency based on your location.
          </p>
        </div>

        {/* Learning format chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {formats.map((f) => (
            <div
              key={f.name}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs ${f.bg} ${
                f.highlight ? "ring-1 ring-purple-500/30" : ""
              }`}
            >
              <span className={`font-bold ${f.color}`}>{f.name}</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-500">{f.desc}</span>
              {f.highlight && (
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider ml-1">
                  ★ {f.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Packs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`relative flex flex-col p-6 rounded-2xl bg-gray-900/60 border ${pack.color} transition-all duration-300 ${
                pack.featured ? "ring-1 ring-purple-500/30 shadow-2xl shadow-purple-900/20" : ""
              }`}
            >
              {pack.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 rounded-full text-white text-[10px] font-black uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              {pack.discount ? (
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 rounded-lg bg-green-900/60 border border-green-700/50 text-green-400 text-[10px] font-black uppercase tracking-wider">
                    {pack.discount}% OFF
                  </span>
                </div>
              ) : null}

              <div className="mb-4">
                <h3 className="text-white font-black text-xl">{pack.name}</h3>
                <p className="text-gray-600 text-xs">{pack.subtitle}</p>
              </div>

              {/* Price */}
              <div className="mb-1">
                <span className={`text-4xl font-black ${pack.badge}`}>
                  {cfg.packs[pack.key]}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl font-bold text-white">{pack.gems}</span>
                <span className="text-gray-400 text-sm">classes</span>
                <span className="text-gray-700 text-xs">·</span>
                <span className="text-gray-500 text-xs">{cfg.perLesson[pack.key]}</span>
              </div>

              {pack.discount ? (
                <p className="text-xs text-green-400 mb-4 leading-relaxed">
                  You save {pack.discount}% vs buying individual classes. More classes, more
                  momentum, more transformation.
                </p>
              ) : (
                <p className="text-xs text-blue-400/80 mb-4 leading-relaxed">
                  {pack.persuasion}
                </p>
              )}

              <ul className="space-y-2 mb-6 flex-1">
                {pack.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className={`text-xs mt-0.5 flex-shrink-0 ${pack.badge}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2 mt-auto">
                <Link
                  href={`/payment?pack=${pack.id}`}
                  className={`block w-full py-3 text-center text-sm font-bold rounded-xl transition-all ${pack.buyStyle}`}
                >
                  Buy Now
                  <span className="block text-[10px] font-normal opacity-70">Secure checkout</span>
                </Link>
                <Link
                  href="/trial"
                  className="block w-full py-2 text-center text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  or try one class free first →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/pricing"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            View full pricing details, format comparison and FAQ →
          </Link>
        </div>
      </div>
    </section>
  );
}
