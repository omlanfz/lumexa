'use client';

interface RankProgressBarProps {
  currentRank: string;
  totalSessions: number;
  variant: 'sidebar' | 'dashboard' | 'full';
}

const TIERS = [
  { rank: 'STARCHILD', label: 'Starchild', icon: '🌟', min: 0, next: 5 },
  { rank: 'EXPLORER', label: 'Explorer', icon: '🔭', min: 5, next: 15 },
  { rank: 'COSMONAUT', label: 'Cosmonaut', icon: '🛸', min: 15, next: 30 },
  { rank: 'NAVIGATOR', label: 'Navigator', icon: '🧭', min: 30, next: 60 },
  { rank: 'CAPTAIN', label: 'Captain', icon: '🎖️', min: 60, next: 100 },
  { rank: 'GALAXY_COMMANDER', label: 'Galaxy Commander', icon: '🌌', min: 100, next: null },
];

function getTierData(rank: string) {
  return TIERS.find((t) => t.rank === rank) ?? TIERS[0];
}

function nextTier(rank: string) {
  const idx = TIERS.findIndex((t) => t.rank === rank);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

function progress(sessions: number, tier: typeof TIERS[0]): number {
  if (tier.next === null) return 100;
  const range = tier.next - tier.min;
  return Math.min(100, Math.round(((sessions - tier.min) / range) * 100));
}

export default function RankProgressBar({ currentRank, totalSessions, variant }: RankProgressBarProps) {
  const tier = getTierData(currentRank);
  const next = nextTier(currentRank);
  const pct = progress(totalSessions, tier);

  if (variant === 'sidebar') {
    return (
      <div className="text-xs text-gray-400 font-medium">
        {tier.icon} {tier.label} · {totalSessions} sessions
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white font-medium">{tier.icon} {tier.label}</span>
          {next ? (
            <span className="text-gray-400 text-xs">{tier.next! - totalSessions} sessions to {next.label}</span>
          ) : (
            <span className="text-teal-400 text-xs font-semibold">Max rank reached 🎉</span>
          )}
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-teal-400 h-2 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {next && (
          <p className="text-gray-500 text-xs">{pct}% of the way to {next.icon} {next.label}</p>
        )}
      </div>
    );
  }

  // full variant
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {TIERS.map((t, i) => {
          const reached = totalSessions >= t.min;
          const isCurrent = t.rank === currentRank;
          return (
            <div key={t.rank} className="flex flex-col items-center gap-1 min-w-[60px]">
              <span className={`text-2xl ${reached ? '' : 'opacity-30'}`}>{t.icon}</span>
              <span className={`text-xs text-center ${isCurrent ? 'text-teal-400 font-semibold' : reached ? 'text-gray-300' : 'text-gray-600'}`}>
                {t.label}
              </span>
              <span className="text-xs text-gray-600">{t.min}+</span>
            </div>
          );
        })}
      </div>

      <div className="relative w-full bg-gray-700 rounded-full h-3">
        <div
          className="bg-teal-400 h-3 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, (totalSessions / 100) * 100)}%` }}
        />
        {TIERS.slice(1).map((t) => (
          <div
            key={t.rank}
            className="absolute top-0 bottom-0 w-px bg-gray-600"
            style={{ left: `${(t.min / 100) * 100}%` }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-white font-medium">
          {tier.icon} {tier.label} — {totalSessions} sessions
        </span>
        {next ? (
          <span className="text-gray-400 text-xs">
            {tier.next! - totalSessions} to {next.label}
          </span>
        ) : (
          <span className="text-teal-400 text-xs font-semibold">Galaxy Commander 🌌</span>
        )}
      </div>
    </div>
  );
}
