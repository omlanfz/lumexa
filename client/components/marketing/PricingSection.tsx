"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Region = "BD" | "IN" | "PH" | "NG" | "EU" | "UK" | "AU" | "CA" | "US";
type Format = "clubs" | "pods" | "private";

interface RegionConfig {
  symbol: string;
  label: string;
  flag: string;
  starter: number;
  growth: number;
  pro: number;
  decimals: boolean;
}

const REGIONS: Record<Region, RegionConfig> = {
  US: { symbol: "$",  label: "USD", flag: "🇺🇸", starter: 25,   growth: 43,   pro: 55,   decimals: false },
  CA: { symbol: "C$", label: "CAD", flag: "🇨🇦", starter: 34,   growth: 58,   pro: 74,   decimals: false },
  AU: { symbol: "A$", label: "AUD", flag: "🇦🇺", starter: 38,   growth: 65,   pro: 83,   decimals: false },
  UK: { symbol: "£",  label: "GBP", flag: "🇬🇧", starter: 20,   growth: 34,   pro: 44,   decimals: false },
  EU: { symbol: "€",  label: "EUR", flag: "🇪🇺", starter: 23,   growth: 39,   pro: 50,   decimals: false },
  IN: { symbol: "₹",  label: "INR", flag: "🇮🇳", starter: 2200, growth: 3800, pro: 4840, decimals: false },
  BD: { symbol: "৳",  label: "BDT", flag: "🇧🇩", starter: 2800, growth: 4940, pro: 6336, decimals: false },
  PH: { symbol: "₱",  label: "PHP", flag: "🇵🇭", starter: 1400, growth: 2450, pro: 3136, decimals: false },
  NG: { symbol: "₦",  label: "NGN", flag: "🇳🇬", starter: 20000, growth: 35200, pro: 45000, decimals: false },
};

const TZ_TO_REGION: Record<string, Region> = {
  "Asia/Dhaka":              "BD",
  "Asia/Kolkata":            "IN",
  "Asia/Calcutta":           "IN",
  "Asia/Manila":             "PH",
  "Africa/Lagos":            "NG",
  "Africa/Abuja":            "NG",
  "Europe/London":           "UK",
  "Europe/Dublin":           "UK",
  "Europe/Berlin":           "EU",
  "Europe/Paris":            "EU",
  "Europe/Amsterdam":        "EU",
  "Europe/Madrid":           "EU",
  "Europe/Rome":             "EU",
  "Europe/Warsaw":           "EU",
  "Europe/Stockholm":        "EU",
  "Australia/Sydney":        "AU",
  "Australia/Melbourne":     "AU",
  "Australia/Brisbane":      "AU",
  "Australia/Perth":         "AU",
  "America/Toronto":         "CA",
  "America/Vancouver":       "CA",
  "America/Montreal":        "CA",
  "America/New_York":        "US",
  "America/Chicago":         "US",
  "America/Denver":          "US",
  "America/Los_Angeles":     "US",
  "America/Phoenix":         "US",
};

const FORMAT_MULTIPLIERS: Record<Format, number> = {
  clubs:   1.0,
  pods:    1.5,
  private: 1.8,
};

const FORMATS: { id: Format; label: string; short: string; desc: string; emoji: string; tag: string; tagColor: string }[] = [
  {
    id:       "clubs",
    label:    "AI Creator Clubs",
    short:    "Clubs",
    desc:     "8-15 students · 60 min",
    emoji:    "🏫",
    tag:      "Entry",
    tagColor: "text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800/40 dark:bg-blue-900/20",
  },
  {
    id:       "pods",
    label:    "Pro Builder Pods",
    short:    "Pods",
    desc:     "3-5 students · 60 min",
    emoji:    "👥",
    tag:      "Best Value",
    tagColor: "text-purple-600 border-purple-200 bg-purple-50 dark:text-purple-400 dark:border-purple-800/40 dark:bg-purple-900/20",
  },
  {
    id:       "private",
    label:    "Private Mentorship",
    short:    "Private",
    desc:     "1-on-1 · 45 min",
    emoji:    "🎯",
    tag:      "Premium",
    tagColor: "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800/40 dark:bg-green-900/20",
  },
];

const PACKS = [
  {
    id:       "starter",
    key:      "starter" as const,
    name:     "Starter Pack",
    subtitle: "Explorer Bundle",
    classes:  8,
    discount: 0,
    persuasion: "Perfect first step. 8 live classes to build a real project and see exactly what your child is capable of.",
    features: [
      "8 live classes across any pathway",
      "Progress report after each class",
      "Class recordings included",
      "7-day refund on unused classes",
    ],
    cardBorder:  "border-[#E2E8F0] hover:border-blue-200",
    priceColor:  "text-blue-600",
    checkColor:  "text-blue-600",
    buyStyle:    "bg-blue-600 hover:bg-blue-500 text-white",
    featured:    false,
  },
  {
    id:       "growth",
    key:      "growth" as const,
    name:     "Growth Pack",
    subtitle: "Builder Bundle",
    classes:  16,
    discount: 12,
    persuasion: "The most popular choice. 16 classes to ship two full projects.",
    features: [
      "16 live classes across any pathway",
      "AI-powered progress reports",
      "Priority teacher matching",
      "Class recordings included",
      "7-day refund on unused classes",
    ],
    cardBorder:  "border-purple-200 hover:border-purple-300",
    priceColor:  "text-purple-600",
    checkColor:  "text-purple-600",
    buyStyle:    "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white",
    featured:    true,
  },
  {
    id:       "pro",
    key:      "pro" as const,
    name:     "Pro Pack",
    subtitle: "Creator Bundle",
    classes:  24,
    discount: 20,
    persuasion: "Complete a full pathway. 24 classes, 3 portfolio projects, certificate of completion.",
    features: [
      "24 live classes to complete a full pathway",
      "AI-powered progress reports",
      "Priority teacher matching",
      "Class recordings included",
      "Certificate of completion",
      "Portfolio review and feedback",
      "7-day refund on unused classes",
    ],
    cardBorder:  "border-[#E2E8F0] hover:border-teal-200",
    priceColor:  "text-teal-600",
    checkColor:  "text-teal-600",
    buyStyle:    "bg-teal-600 hover:bg-teal-500 text-white",
    featured:    false,
  },
];

function formatPrice(base: number, multiplier: number, cfg: RegionConfig): string {
  const raw = base * multiplier;
  const rounded = cfg.decimals ? raw : Math.round(raw);
  const formatted = rounded >= 1000
    ? rounded.toLocaleString("en-US")
    : String(rounded);
  return `${cfg.symbol}${formatted}`;
}

function formatPerClass(packPrice: number, multiplier: number, classes: number, cfg: RegionConfig): string {
  const raw = (packPrice * multiplier) / classes;
  const rounded = raw >= 100 ? Math.round(raw) : Math.round(raw * 10) / 10;
  const formatted = rounded >= 1000
    ? rounded.toLocaleString("en-US")
    : String(rounded);
  return `${cfg.symbol}${formatted}/class`;
}

export default function PricingSection() {
  const [region, setRegion] = useState<Region>("US");
  const [format, setFormat] = useState<Format>("clubs");
  const [detected, setDetected] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const r = TZ_TO_REGION[tz];
      if (r) setRegion(r);
    } catch {}
    setDetected(true);
  }, []);

  useEffect(() => {
    if (!regionOpen) return;
    const handler = (e: MouseEvent) => {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) {
        setRegionOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [regionOpen]);

  if (!detected) return null;

  const cfg = REGIONS[region];
  const multiplier = FORMAT_MULTIPLIERS[format];
  const activeFormat = FORMATS.find((f) => f.id === format)!;

  return (
    <section className="py-20 bg-[#F7F9FF] dark:bg-[#050D1A] transition-colors duration-200" id="pricing">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-purple-600 dark:text-purple-400 text-sm font-bold uppercase tracking-widest mb-2">
            Simple Pricing · No Subscriptions
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-white mb-4">
            Invest in Your Child&apos;s{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              Future Career
            </span>
          </h2>
          <p className="text-[#334155] dark:text-gray-400 max-w-xl mx-auto">
            Buy a class pack. Use them across any pathway. No monthly fees, no lock-ins.
          </p>
        </div>

        {/* Format selector */}
        <div className="mb-10">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-[#94A3B8] dark:text-gray-500 mb-4">
            Choose your learning format
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`relative flex flex-col items-center gap-1 px-4 py-4 rounded-2xl border-2 text-center transition-all duration-200 ${
                  format === f.id
                    ? "border-purple-400 bg-white dark:bg-gray-900/80 shadow-md shadow-purple-50 dark:shadow-none scale-[1.02]"
                    : "border-[#E2E8F0] dark:border-gray-700/60 bg-white dark:bg-gray-900/40 hover:border-purple-200 dark:hover:border-purple-700/50 hover:shadow-sm"
                }`}
              >
                {format === f.id && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-purple-600 rounded-full text-white text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                    Selected
                  </div>
                )}
                <span className="text-2xl">{f.emoji}</span>
                <span className="text-[#0F172A] dark:text-white font-black text-sm leading-tight">{f.label}</span>
                <span className="text-[#94A3B8] dark:text-gray-500 text-[10px]">{f.desc}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${f.tagColor}`}>
                  {f.tag}
                </span>
                {f.id !== "clubs" && (
                  <span className="text-[10px] text-[#64748B]">
                    {f.id === "pods" ? "~1.5× base" : "~1.8× base"}
                  </span>
                )}
              </button>
            ))}
          </div>
          {format !== "clubs" && (
            <p className="text-center text-xs text-[#94A3B8] mt-3">
              {format === "pods"
                ? "Smaller groups mean more teacher time per student. Prices reflect the increased attention."
                : "Fully personalised to your child's pace. One teacher, one student, maximum impact."}
            </p>
          )}
        </div>

        {/* Pack cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {PACKS.map((pack) => {
            const packPrice = formatPrice(cfg[pack.key], multiplier, cfg);
            const perClass = formatPerClass(cfg[pack.key], multiplier, pack.classes, cfg);
            return (
              <div
                key={pack.id}
                className={`relative flex flex-col p-6 rounded-2xl bg-white dark:bg-gray-900/50 border-2 ${pack.cardBorder} dark:border-gray-700/60 card-hover card-glow-purple ${
                  pack.featured ? "ring-2 ring-purple-200 dark:ring-purple-700/50 shadow-md shadow-purple-50 dark:shadow-none" : ""
                }`}
              >
                {pack.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                {pack.discount > 0 && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[10px] font-black uppercase tracking-wider">
                      {pack.discount}% OFF
                    </span>
                  </div>
                )}

                <div className="mb-3">
                  <h3 className="text-[#0F172A] dark:text-white font-black text-xl">{pack.name}</h3>
                  <p className="text-[#94A3B8] dark:text-gray-500 text-xs">{pack.subtitle}</p>
                </div>

                {/* Price */}
                <div className="mb-1">
                  <span className={`text-4xl font-black ${pack.priceColor}`}>
                    {packPrice}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[#0F172A] dark:text-white font-bold">{pack.classes}</span>
                  <span className="text-[#334155] dark:text-gray-400 text-sm">classes</span>
                  <span className="text-[#CBD5E1] dark:text-gray-600 text-xs">·</span>
                  <span className="text-[#64748B] dark:text-gray-500 text-xs">{perClass}</span>
                </div>

                <p className="text-xs text-[#64748B] mb-4 leading-relaxed">{pack.persuasion}</p>

                <ul className="space-y-2 mb-6 flex-1">
                  {pack.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-[#334155] dark:text-gray-400">
                      <span className={`text-xs mt-0.5 flex-shrink-0 ${pack.checkColor}`}>✓</span>
                      {feat}
                    </li>
                  ))}
                  {format !== "clubs" && (
                    <li className="flex items-start gap-2 text-sm text-[#334155] dark:text-gray-400">
                      <span className={`text-xs mt-0.5 flex-shrink-0 ${pack.checkColor}`}>✓</span>
                      {format === "pods" ? "Small group (3-5 students)" : "Fully 1-on-1 with dedicated teacher"}
                    </li>
                  )}
                </ul>

                <div className="flex flex-col gap-2 mt-auto">
                  <Link
                    href={`/payment?pack=${pack.id}&format=${format}&region=${region}`}
                    className={`block w-full py-3 text-center text-sm font-bold rounded-xl transition-all ${pack.buyStyle} shadow-sm hover:shadow-md`}
                  >
                    Get {activeFormat.short} Pack
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
            );
          })}
        </div>

        {/* Region selector — collapsed by default, shows detected currency */}
        <div className="flex flex-col items-center mb-8" ref={regionRef}>
          <button
            onClick={() => setRegionOpen((v) => !v)}
            className="flex items-center gap-2 text-xs text-[#64748B] dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
          >
            <span className="text-base">{REGIONS[region].flag}</span>
            <span>
              Prices in <strong className="text-[#0F172A] dark:text-white">{REGIONS[region].label}</strong>
            </span>
            <span className={`text-[10px] transition-transform duration-200 ${regionOpen ? "rotate-180" : ""}`}>▾</span>
            <span className="text-purple-600 dark:text-purple-400 underline underline-offset-2 decoration-dotted ml-0.5">Change</span>
          </button>

          {regionOpen && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 max-w-lg fade-in">
              {(Object.keys(REGIONS) as Region[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { setRegion(r); setRegionOpen(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    region === r
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white dark:bg-gray-800/60 text-[#64748B] dark:text-gray-400 border-[#E2E8F0] dark:border-gray-700/60 hover:border-purple-200 dark:hover:border-purple-700/50 hover:text-purple-600 dark:hover:text-purple-400"
                  }`}
                >
                  {REGIONS[r].flag} {REGIONS[r].label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/pricing"
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            View full pricing details, format comparison and FAQ →
          </Link>
        </div>
      </div>
    </section>
  );
}
