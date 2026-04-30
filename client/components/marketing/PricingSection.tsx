"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Region = "BD" | "IN" | "UK" | "US";

interface RegionConfig {
  flag: string;
  label: string;
  currency: string;
  packs: { starter: string; growth: string; pro: string };
  perLesson: { starter: string; growth: string; pro: string };
  payments: { label: string; icon: string; desc: string }[];
}

const regions: Record<Region, RegionConfig> = {
  BD: {
    flag: "🇧🇩",
    label: "Bangladesh",
    currency: "৳",
    packs: { starter: "2,800৳", growth: "5,200৳", pro: "7,200৳" },
    perLesson: { starter: "350৳/class", growth: "325৳/class", pro: "300৳/class" },
    payments: [
      { label: "bKash", icon: "📱", desc: "Instant · Most popular" },
      { label: "Card", icon: "💳", desc: "Visa / Mastercard" },
      { label: "Bank Transfer", icon: "🏦", desc: "Manual verification" },
    ],
  },
  IN: {
    flag: "🇮🇳",
    label: "India",
    currency: "₹",
    packs: { starter: "₹2,200", growth: "₹4,000", pro: "₹5,500" },
    perLesson: { starter: "₹275/class", growth: "₹250/class", pro: "₹229/class" },
    payments: [
      { label: "Card", icon: "💳", desc: "Visa / Mastercard / RuPay" },
      { label: "UPI", icon: "📱", desc: "Instant UPI transfer" },
      { label: "Bank Transfer", icon: "🏦", desc: "NEFT / IMPS" },
    ],
  },
  UK: {
    flag: "🇬🇧",
    label: "United Kingdom",
    currency: "£",
    packs: { starter: "£20", growth: "£36", pro: "£50" },
    perLesson: { starter: "£2.50/class", growth: "£2.25/class", pro: "£2.08/class" },
    payments: [
      { label: "Card", icon: "💳", desc: "Visa / Mastercard / Amex" },
      { label: "Bank Transfer", icon: "🏦", desc: "Faster Payments" },
    ],
  },
  US: {
    flag: "🌍",
    label: "Global (USD)",
    currency: "$",
    packs: { starter: "$25", growth: "$45", pro: "$62" },
    perLesson: { starter: "$3.13/class", growth: "$2.81/class", pro: "$2.58/class" },
    payments: [
      { label: "Card", icon: "💳", desc: "Visa / Mastercard / Amex" },
      { label: "Bank Transfer", icon: "🏦", desc: "SWIFT / Wire" },
    ],
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
    name: "Starter",
    gems: 8,
    subtitle: "Explorer Bundle",
    features: ["8 live 1-on-1 classes", "Any learning pathway", "Progress report after each class", "Class recordings included"],
    color: "border-blue-700/40 hover:border-blue-500/60",
    badge: "text-blue-400",
    accent: "from-blue-600 to-cyan-600",
    ctaStyle: "border border-blue-700/50 text-blue-300 hover:bg-blue-900/20",
  },
  {
    id: "growth",
    key: "growth" as const,
    name: "Growth",
    gems: 16,
    subtitle: "Builder Bundle",
    features: ["16 live 1-on-1 classes", "Any learning pathway", "AI-powered progress reports", "Priority teacher matching", "Class recordings included"],
    color: "border-purple-600/60 hover:border-purple-400",
    badge: "text-purple-400",
    accent: "from-purple-600 to-blue-600",
    ctaStyle: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500",
    featured: true,
  },
  {
    id: "pro",
    key: "pro" as const,
    name: "Pro",
    gems: 24,
    subtitle: "Creator Bundle",
    features: ["24 live 1-on-1 classes", "Any learning pathway", "AI-powered progress reports", "Priority teacher matching", "Class recordings included", "Certificate of completion"],
    color: "border-teal-700/40 hover:border-teal-500/60",
    badge: "text-teal-400",
    accent: "from-teal-600 to-green-600",
    ctaStyle: "border border-teal-700/50 text-teal-300 hover:bg-teal-900/20",
  },
];

export default function PricingSection() {
  const [region, setRegion] = useState<Region>("US");
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const detected = TIMEZONE_TO_REGION[tz];
      if (detected) setRegion(detected);
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
            Simple Gem Pricing — 1 Gem = 1 Class
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Pay for Classes,{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Not Subscriptions
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-8">
            Buy a gem pack — each gem = one live 1-on-1 class. Use them whenever your child is ready. No monthly fees, no lock-ins.
          </p>

          {/* Region selector */}
          <div className="inline-flex flex-wrap justify-center gap-1 p-1 bg-gray-900 border border-gray-700 rounded-xl">
            {(Object.entries(regions) as [Region, RegionConfig][]).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setRegion(key)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  region === key
                    ? "bg-purple-700 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {val.flag} {val.label}
              </button>
            ))}
          </div>
        </div>

        {/* Packs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xl font-bold text-white">{pack.gems}</span>
                <span className="text-gray-400 text-sm">gems / classes</span>
                <span className="text-gray-700 text-xs">·</span>
                <span className="text-gray-500 text-xs">{cfg.perLesson[pack.key]}</span>
              </div>

              {/* Features */}
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
                  href="/trial"
                  className={`block w-full py-3 text-center text-sm font-bold rounded-xl transition-all ${pack.ctaStyle}`}
                >
                  {pack.featured ? "Get Started" : "Choose Pack"}
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

        {/* Payment methods */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
          <p className="text-white font-semibold text-center mb-4">
            Accepted Payment Methods
            <span className="text-gray-500 font-normal text-sm ml-2">({cfg.flag} {cfg.label})</span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {cfg.payments.map((m) => (
              <div
                key={m.label}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl"
              >
                <span>{m.icon}</span>
                <div>
                  <div className="text-white text-sm font-semibold">{m.label}</div>
                  <div className="text-gray-600 text-[10px]">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-xs text-center mt-4">
            All payments are encrypted and secure. 7-day refund guarantee on unused gems.
          </p>
        </div>

        <div className="text-center mt-8">
          <Link href="/pricing" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            View full pricing details & FAQ →
          </Link>
        </div>
      </div>
    </section>
  );
}
