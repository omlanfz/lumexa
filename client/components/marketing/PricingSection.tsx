"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Region = "BD" | "GLOBAL";

const packs = [
  {
    id: "starter",
    name: "Starter Pack",
    tagline: "Explorer Bundle",
    gems: 10,
    priceBD: "3,500৳",
    priceGlobal: "$30",
    perSessionBD: "350৳/class",
    perSessionGlobal: "$3/class",
    color: "border-blue-700/40 hover:border-blue-500/60",
    badge: "bg-blue-900/30 text-blue-300 border-blue-800",
    accent: "text-blue-400",
    features: ["10 live classes", "Any subject", "Beginner teachers", "Progress reports"],
  },
  {
    id: "builder",
    name: "Builder Pack",
    tagline: "Mission Bundle",
    gems: 20,
    priceBD: "6,000৳",
    priceGlobal: "$52",
    perSessionBD: "300৳/class",
    perSessionGlobal: "$2.60/class",
    color: "border-purple-600/60 hover:border-purple-400",
    badge: "bg-purple-900/40 text-purple-300 border-purple-700",
    accent: "text-purple-400",
    features: ["20 live classes", "Any subject", "All teacher tiers", "AI feedback reports", "Priority scheduling"],
    featured: true,
  },
  {
    id: "champion",
    name: "Champion Pack",
    tagline: "Ace Pilot Bundle",
    gems: 40,
    priceBD: "11,000৳",
    priceGlobal: "$95",
    perSessionBD: "275৳/class",
    perSessionGlobal: "$2.38/class",
    color: "border-teal-700/40 hover:border-teal-500/60",
    badge: "bg-teal-900/30 text-teal-300 border-teal-800",
    accent: "text-teal-400",
    features: ["40 live classes", "Any subject", "Expert teachers", "AI feedback reports", "Priority scheduling", "Certificate of completion"],
  },
];

const paymentMethods: Record<Region, { label: string; icon: string; desc: string }[]> = {
  BD: [
    { label: "bKash", icon: "📱", desc: "Instant · Most popular" },
    { label: "Card", icon: "💳", desc: "Visa / Mastercard" },
    { label: "Bank Transfer", icon: "🏦", desc: "Manual verification" },
  ],
  GLOBAL: [
    { label: "Card", icon: "💳", desc: "Visa / Mastercard / Amex" },
    { label: "Bank Transfer", icon: "🏦", desc: "SWIFT / Wire" },
  ],
};

export default function PricingSection() {
  const [region, setRegion] = useState<Region>("GLOBAL");
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === "Asia/Dhaka") setRegion("BD");
    } catch {}
    setDetected(true);
  }, []);

  if (!detected) return null;

  return (
    <section className="py-20 bg-[#050D1A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-2">
            Gem Pricing System
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Simple, Flexible Pricing
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-6">
            Buy gem packs — 1 gem = 1 class. No subscriptions, no lock-ins.
            Use gems whenever your child is ready to learn.
          </p>

          {/* Region toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-gray-900 border border-gray-700 rounded-xl">
            <button
              onClick={() => setRegion("BD")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                region === "BD"
                  ? "bg-purple-700 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🇧🇩 Bangladesh (৳)
            </button>
            <button
              onClick={() => setRegion("GLOBAL")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                region === "GLOBAL"
                  ? "bg-purple-700 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🌍 Global ($)
            </button>
          </div>
        </div>

        {/* Pack cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`relative p-6 rounded-2xl bg-gray-900/60 border ${pack.color} transition-all duration-300 ${
                pack.featured ? "ring-1 ring-purple-500/30 shadow-xl shadow-purple-900/20" : ""
              }`}
            >
              {pack.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 rounded-full text-white text-[10px] font-bold uppercase tracking-wider">
                  Best Value
                </div>
              )}

              {/* Header */}
              <div className="mb-5">
                <h3 className="text-white font-black text-xl">{pack.name}</h3>
                <p className="text-gray-600 text-xs">{pack.tagline}</p>
              </div>

              {/* Price */}
              <div className="mb-2">
                <span className={`text-4xl font-black ${pack.accent}`}>
                  {region === "BD" ? pack.priceBD : pack.priceGlobal}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl font-bold text-white">{pack.gems}</span>
                <span className="text-gray-400 text-sm">gems</span>
                <span className="text-gray-600 text-xs">·</span>
                <span className="text-gray-500 text-xs">
                  {region === "BD" ? pack.perSessionBD : pack.perSessionGlobal}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {pack.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className={`text-xs ${pack.accent}`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/trial"
                className={`block w-full py-3 text-center text-sm font-bold rounded-xl border ${pack.badge} hover:opacity-90 transition-all`}
              >
                {pack.featured ? "Get Started" : "Choose Pack"}
              </Link>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
          <p className="text-white font-semibold text-center mb-4">
            Accepted Payment Methods
            <span className="text-gray-500 font-normal text-sm ml-2">
              ({region === "BD" ? "Bangladesh" : "International"})
            </span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {paymentMethods[region].map((m) => (
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
            All payments are encrypted and secure. Refund within 7 days if unsatisfied.
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
