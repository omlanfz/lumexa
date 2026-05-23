'use client';

interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
}

interface BadgeGridProps {
  badges: Badge[];
}

export default function BadgeGrid({ badges }: BadgeGridProps) {
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">
            Badges
          </p>
          <h3 className="text-white font-semibold">
            {earned.length}
            <span className="text-gray-500 font-normal">/{badges.length}</span>{' '}
            Earned
          </h3>
        </div>
        <span className="text-2xl">🏅</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
        {earned.map((badge) => (
          <div
            key={badge.id}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-teal-900/30 border border-teal-700/40"
            title={badge.label}
          >
            <span className="text-2xl">{badge.icon}</span>
            <p className="text-teal-300 text-xs font-medium text-center leading-tight">
              {badge.label}
            </p>
          </div>
        ))}
        {locked.map((badge) => (
          <div
            key={badge.id}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-700/20 border border-gray-700/30"
            title={`Locked: ${badge.label}`}
          >
            <span className="text-2xl grayscale opacity-30">{badge.icon}</span>
            <p className="text-gray-600 text-xs font-medium text-center leading-tight">
              {badge.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
