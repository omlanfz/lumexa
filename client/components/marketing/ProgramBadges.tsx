import type { ProgramBadge, ProgramBadgeTone } from "@/lib/catalog";

// The badges next to a program's age range ("Beginner friendly", "Most popular", "Basic Python
// needed"…). What they say is maintained once on the server (program-facts.ts) and arrives with
// the catalog; this only draws them, the same way on the homepage, /programs and /pricing.

const TONE: Record<ProgramBadgeTone, { icon: string; className: string }> = {
  starter: {
    icon: "🌱",
    className:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
  },
  beginner: {
    icon: "🌱",
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40",
  },
  popular: {
    icon: "⭐",
    className:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
  },
  prerequisite: {
    icon: "📘",
    className:
      "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700/40",
  },
  info: {
    icon: "ℹ️",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700/60",
  },
};

export function badgeClass(tone: ProgramBadgeTone): string {
  return TONE[tone].className;
}

export default function ProgramBadges({
  badges,
  size = "sm",
}: {
  badges: ProgramBadge[];
  /** "sm" for cards, "xs" for tight rows. */
  size?: "sm" | "xs";
}) {
  if (badges.length === 0) return null;
  const sizing = size === "xs" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-0.5";
  return (
    <>
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`inline-flex items-center gap-1 rounded-full border font-semibold ${sizing} ${TONE[badge.tone].className}`}
        >
          <span aria-hidden>{TONE[badge.tone].icon}</span>
          {badge.label}
        </span>
      ))}
    </>
  );
}
