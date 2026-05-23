'use client';

interface StreakCounterProps {
  streakWeeks: number;
  streakFreezes: number;
  variant?: 'compact' | 'full';
}

export default function StreakCounter({
  streakWeeks,
  streakFreezes,
  variant = 'compact',
}: StreakCounterProps) {
  const isActive = streakWeeks > 0;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <span className="text-lg">{isActive ? '🔥' : '❄️'}</span>
        <div>
          <p className="text-orange-400 text-sm font-bold leading-none">
            {streakWeeks}w streak
          </p>
          {streakFreezes > 0 && (
            <p className="text-gray-500 text-xs">
              ❄️ {streakFreezes} freeze{streakFreezes !== 1 ? 's' : ''} left
            </p>
          )}
        </div>
      </div>
    );
  }

  const displayWeeks = Math.max(8, streakWeeks + 1);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">
            Weekly Streak
          </p>
          <h3 className="text-white font-semibold">
            {isActive ? 'Keep it going!' : 'Start your streak'}
          </h3>
        </div>
        <span className={`text-4xl ${!isActive ? 'grayscale opacity-40' : ''}`}>
          {isActive ? '🔥' : '❄️'}
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-16 mb-4">
        {Array.from({ length: displayWeeks }).map((_, i) => {
          const isEarned = i < streakWeeks;
          const heightPct = isEarned
            ? Math.min(100, 30 + (i / Math.max(streakWeeks - 1, 1)) * 70)
            : 20;
          return (
            <div
              key={i}
              style={{ height: `${heightPct}%` }}
              className={`flex-1 rounded-sm transition-all duration-300 ${
                isEarned ? 'bg-orange-500' : 'bg-gray-700'
              }`}
            />
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <div>
          <span className="text-2xl font-bold text-orange-400">
            {streakWeeks}
          </span>
          <span className="text-base font-normal text-gray-400 ml-1">
            {streakWeeks === 1 ? 'week' : 'weeks'}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Streak freezes</p>
          <p className="text-sm font-semibold text-blue-400">
            ❄️ {streakFreezes}
          </p>
        </div>
      </div>
    </div>
  );
}
