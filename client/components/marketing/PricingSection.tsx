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
      "AI Creator Clubs, Pro Builder Pods, or Private Mentorship",
      "Progress report after each class",
      "Class recordings included",
      "7-day refund on unused classes",
    ],
    cardBg: "bg-white",
    cardBorder: "border-[#E2E8F0] hover:border-blue-200",
    priceColor: "text-blue-600",
    badgeBg: "bg-blue-50 text-blue-700",
    accent: "from-blue-600 to-cyan-600",
    buyStyle: "bg-blue-600 hover:bg-blue-500 text-white",
    checkColor: "text-blue-600",
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
      "AI Creator Clubs, Pro Builder Pods, or Private Mentorship",
      "AI-powered progress reports",
      "Priority teacher matching",
      "Class recordings included",
      "7-day refund on unused classes",
    ],
    cardBg: "bg-white",
    cardBorder: "border-purple-200 hover:border-purple-300",
    priceColor: "text-purple-600",
    badgeBg: "bg-purple-50 text-purple-700",
    accent: "from-purple-600 to-blue-600",
    buyStyle: "bg-gradient-to-r from-purple-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 text-white",
    checkColor: "text-purple-600",
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
      "AI Creator Clubs, Pro Builder Pods, or Private Mentorship",
      "AI-powered progress reports",
      "Priority teacher matching",
      "Class recordings included",
      "Certificate of completion",
      "Portfolio review and feedback",
      "7-day refund on unused classes",
    ],
    cardBg: "bg-white",
    cardBorder: "border-[#E2E8F0] hover:border-teal-200",
    priceColor: "text-teal-600",
    badgeBg: "bg-teal-50 text-teal-700",
    accent: "from-teal-600 to-green-600",
    buyStyle: "bg-teal-600 hover:bg-teal-500 text-white",
    checkColor: "text-teal-600",
  },
];

const formats = [
  { name: "AI Creator Clubs",    desc: "8–15 students · 60 min", label: "Entry",      color: "text-blue-600",   bg: "bg-blue-50   border-blue-200" },
  { name: "Pro Builder Pods",    desc: "3–5 students · 60 min",  label: "Best Value", color: "text-purple-600", bg: "bg-purple-50 border-purple-200", highlight: true },
  { name: "Private Mentorship",  desc: "1 student · 45 min",     label: "Premium",    color: "text-green-600",  bg: "bg-green-50  border-green-200" },
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
    <section className="py-20 bg-[#F7F9FF]" id="pricing">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-purple-600 text-sm font-bold uppercase tracking-widest mb-2">
            Simple Pricing · No Subscriptions
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] mb-4">
            Invest in Your Child&apos;s{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Future Career
            </span>
          </h2>
          <p className="text-[#334155] max-w-xl mx-auto mb-3">
            Buy a class pack. Use them across any pathway and any learning format. No monthly fees, no lock-ins.
          </p>
          <p className="text-[#94A3B8] text-xs">
            Prices shown in your local currency based on your location.
          </p>
        </div>

        {/* Format chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {formats.map((f) => (
            <div
              key={f.name}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs ${f.bg} ${
                f.highlight ? "ring-1 ring-purple-300" : ""
              }`}
            >
              <span className={`font-bold ${f.color}`}>{f.name}</span>
              <span className="text-[#CBD5E1]">·</span>
              <span className="text-[#64748B]">{f.desc}</span>
              {f.highlight && (
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider ml-1">
                  ★ {f.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Pack cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`relative flex flex-col p-6 rounded-2xl ${pack.cardBg} border ${pack.cardBorder} transition-all duration-300 hover:shadow-md hover:shadow-slate-100 ${
                pack.featured ? "ring-2 ring-purple-200 shadow-md shadow-purple-50" : ""
              }`}
            >
              {pack.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 rounded-full text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                  Most Popular
                </div>
              )}

              {pack.discount && (
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[10px] font-black uppercase tracking-wider">
                    {pack.discount}% OFF
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-[#0F172A] font-black text-xl">{pack.name}</h3>
                <p className="text-[#94A3B8] text-xs">{pack.subtitle}</p>
              </div>

              {/* Price */}
              <div className="mb-1">
                <span className={`text-4xl font-black ${pack.priceColor}`}>
                  {cfg.packs[pack.key]}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl font-bold text-[#0F172A]">{pack.gems}</span>
                <span className="text-[#334155] text-sm">classes</span>
                <span className="text-[#CBD5E1] text-xs">·</span>
                <span className="text-[#64748B] text-xs">{cfg.perLesson[pack.key]}</span>
              </div>

              {pack.discount ? (
                <p className="text-xs text-green-600 mb-4 leading-relaxed">
                  You save {pack.discount}% vs buying individual classes. More classes, more momentum, more transformation.
                </p>
              ) : (
                <p className="text-xs text-blue-600/80 mb-4 leading-relaxed">
                  {pack.persuasion}
                </p>
              )}

              <ul className="space-y-2 mb-6 flex-1">
                {pack.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#334155]">
                    <span className={`text-xs mt-0.5 flex-shrink-0 ${pack.checkColor}`}>✓</span>
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
                  <span className="block text-[10px] font-normal opacity-75">Secure checkout</span>
                </Link>
                <Link
                  href="/trial"
                  className="block w-full py-2 text-center text-xs text-[#94A3B8] hover:text-[#64748B] transition-colors"
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
            className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
          >
            View full pricing details, format comparison and FAQ →
          </Link>
        </div>
      </div>
    </section>
  );
}
