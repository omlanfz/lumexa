'use client';

// The detail dialog for one achievement: its name, what earns it, how far the
// student is, and its own animation — playing in colour for an earned badge, as
// a "preview" for a locked one. Also used for the student's rank (opened from
// the navbar), where it shows the rank, the next rank and the journey.
//
// Opens on tap or click, closes on the button, the backdrop or Escape — it does
// not depend on hover, so it works on touch screens exactly as on a desktop.
// It is only ever rendered in response to a tap/click, i.e. in the browser,
// so the portal into document.body is always available.

import { createPortal } from 'react-dom';
import { X, Lock } from 'lucide-react';
import BadgeArt from '@/components/student/BadgeArt';
import { useModalBehavior } from '@/components/student/useModalBehavior';
import { badgeVisual, rankVisual } from '@/lib/student/badgeConfig';
import {
  formatShortDate,
  progressUnitLabel,
  type BadgeInfo,
  type RankInfo,
} from '@/lib/student/progress';

type Props =
  | { kind: 'badge'; badge: BadgeInfo; onClose: () => void }
  | { kind: 'rank'; rank: RankInfo; tooltip: string; onClose: () => void };

export default function BadgeDetailModal(props: Props) {
  const panelRef = useModalBehavior(props.onClose);

  const isBadge = props.kind === 'badge';
  const visual = isBadge ? badgeVisual(props.badge.id) : rankVisual(props.rank.id);
  const titleId = 'badge-detail-title';
  const rgb = visual.rgb;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={props.onClose}
      data-testid="badge-detail"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ ['--bx-rgb' as string]: rgb }}
        className="modal-pop relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0B1026] text-gray-900 dark:text-white shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-gray-500 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
        >
          <X size={20} />
        </button>

        {/* Stage */}
        <div
          className="px-6 pt-10 pb-6 text-center"
          style={{
            background: `radial-gradient(120% 90% at 50% 0%, rgba(${rgb}, 0.22), transparent 70%)`,
          }}
        >
          <div className="mx-auto mb-3 grid place-items-center">
            {isBadge ? (
              <BadgeArt
                badgeId={props.badge.id}
                icon={props.badge.icon}
                state={props.badge.earned ? 'earned' : 'preview'}
                size={112}
                intro
              />
            ) : (
              <BadgeArt badgeId={visual.id} icon={props.rank.icon} size={112} intro />
            )}
          </div>

          <h2 id={titleId} className="text-xl font-bold leading-tight">
            {isBadge ? props.badge.label : props.rank.label}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{visual.tagline}</p>

          <div className="mt-3 flex justify-center">
            {isBadge ? (
              props.badge.earned ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                  ✓ Earned{props.badge.earnedAt ? ` · ${formatShortDate(props.badge.earnedAt)}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <Lock size={12} /> Locked · animation preview
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                Your current rank
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 px-6 pb-7">
          {isBadge ? <BadgeBody badge={props.badge} rgb={rgb} /> : <RankBody rank={props.rank} tooltip={props.tooltip} rgb={rgb} />}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ProgressBar({ pct, rgb, label }: { pct: number; rgb: string; label: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
    >
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${pct}%`, background: `rgb(${rgb})` }}
      />
    </div>
  );
}

function BadgeBody({ badge, rgb }: { badge: BadgeInfo; rgb: string }) {
  const { progress } = badge;
  const unit = progressUnitLabel(progress.unit, progress.target);
  return (
    <>
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{badge.description}</p>

      <div className="rounded-2xl border border-black/10 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {badge.earned ? 'How you earned it' : 'How to unlock it'}
        </p>
        <p className="mt-1 text-sm text-gray-900 dark:text-white">{badge.requirement}</p>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
          <span className="tabular-nums text-gray-600 dark:text-gray-400">
            {progress.current} / {progress.target} {unit}
          </span>
        </div>
        <ProgressBar pct={progress.pct} rgb={rgb} label={`${badge.label} progress`} />
        {badge.hint && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{badge.hint}</p>}
        {!badge.earned && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {Math.max(0, progress.target - progress.current)} more {progressUnitLabel(progress.unit, Math.max(0, progress.target - progress.current))} to go.
          </p>
        )}
      </div>
    </>
  );
}

function RankBody({ rank, tooltip, rgb }: { rank: RankInfo; tooltip: string; rgb: string }) {
  return (
    <>
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{tooltip}</p>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {rank.next ? `Towards ${rank.next.icon} ${rank.next.label}` : 'Highest rank'}
          </span>
          <span className="tabular-nums text-gray-600 dark:text-gray-400">
            {rank.sessions}
            {rank.next ? ` / ${rank.next.min}` : ''} classes
          </span>
        </div>
        <ProgressBar pct={rank.progressPct} rgb={rgb} label="Progress to the next rank" />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{rank.requirement}</p>
      </div>

      <ol className="grid grid-cols-3 gap-2 text-center" aria-label="Rank journey">
        {rank.ladder.map((t) => (
          <li
            key={t.id}
            className={`rounded-xl border px-1 py-2 text-xs ${
              t.current
                ? 'border-teal-500/50 bg-teal-500/10 font-semibold text-teal-700 dark:text-teal-300'
                : t.unlocked
                  ? 'border-black/10 text-gray-700 dark:border-white/10 dark:text-gray-300'
                  : 'border-black/5 text-gray-400 dark:border-white/5 dark:text-gray-600'
            }`}
          >
            <span className={`block text-lg ${t.unlocked ? '' : 'opacity-40 grayscale'}`}>{t.icon}</span>
            <span className="block leading-tight">{t.label}</span>
            <span className="block text-[11px] opacity-70">{t.min}+</span>
          </li>
        ))}
      </ol>
    </>
  );
}
