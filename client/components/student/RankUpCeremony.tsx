'use client';

import { useEffect, useState } from 'react';

interface RankUpCeremonyProps {
  newRank: string;
  rankIcon: string;
  onDismiss: () => void;
}

const RANK_COLORS: Record<string, string> = {
  EXPLORER: 'from-blue-900/80 to-blue-700/40',
  COSMONAUT: 'from-violet-900/80 to-violet-700/40',
  NAVIGATOR: 'from-teal-900/80 to-teal-700/40',
  CAPTAIN: 'from-amber-900/80 to-amber-700/40',
  GALAXY_COMMANDER: 'from-purple-900/80 to-pink-700/40',
};

const RANK_ACCENT: Record<string, string> = {
  EXPLORER: 'text-blue-300',
  COSMONAUT: 'text-violet-300',
  NAVIGATOR: 'text-teal-300',
  CAPTAIN: 'text-amber-300',
  GALAXY_COMMANDER: 'text-pink-300',
};

const RANK_BORDER: Record<string, string> = {
  EXPLORER: 'border-blue-500/40',
  COSMONAUT: 'border-violet-500/40',
  NAVIGATOR: 'border-teal-500/40',
  CAPTAIN: 'border-amber-500/40',
  GALAXY_COMMANDER: 'border-pink-500/40',
};

export default function RankUpCeremony({ newRank, rankIcon, onDismiss }: RankUpCeremonyProps) {
  const [visible, setVisible] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const displayName = newRank.replace(/_/g, ' ');
  const gradient = RANK_COLORS[newRank] ?? 'from-gray-900/80 to-gray-700/40';
  const accent = RANK_ACCENT[newRank] ?? 'text-teal-300';
  const border = RANK_BORDER[newRank] ?? 'border-gray-500/40';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Rank up ceremony"
    >
      <div
        className={`relative max-w-sm w-full mx-4 rounded-2xl bg-gradient-to-br ${gradient} border ${border} p-8 text-center shadow-2xl transition-transform duration-300 ${
          visible ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Stars background decoration */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className="absolute text-white/20 animate-pulse text-xs"
              style={{
                top: `${Math.random() * 90}%`,
                left: `${Math.random() * 90}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            >
              ✦
            </span>
          ))}
        </div>

        <div className="relative">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-4">
            Rank Up!
          </p>
          <div className="text-7xl mb-4 select-none">{rankIcon}</div>
          <h2 className={`text-3xl font-bold mb-1 ${accent}`}>{displayName}</h2>
          <p className="text-gray-300 text-sm mb-6">
            You've reached a new space rank!
          </p>
          <div className="space-y-2 mb-6">
            <p className="text-xs text-gray-400">
              Keep completing sessions to climb even higher.
            </p>
            <p className="text-xs text-gray-400">
              +15 gems awarded to your wallet 🎁
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors border border-white/10"
          >
            Continue Mission →
          </button>
        </div>
      </div>
    </div>
  );
}
