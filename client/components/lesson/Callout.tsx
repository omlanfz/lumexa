// FILE PATH: client/components/lesson/Callout.tsx
//
// Educational callouts — tips, notes, warnings, worked examples, key takeaways,
// common mistakes. Written in lessons as `> [!TIP]` (see lib/lesson/remarkCallouts).

import type { ReactNode } from 'react';

const VARIANTS: Record<string, { icon: string; title: string }> = {
  tip: { icon: '💡', title: 'Tip' },
  note: { icon: '📝', title: 'Note' },
  warning: { icon: '⚠️', title: 'Watch out' },
  example: { icon: '🧪', title: 'Example' },
  takeaway: { icon: '⭐', title: 'Key takeaway' },
  mistake: { icon: '🚧', title: 'Common mistake' },
  important: { icon: '❗', title: 'Important' },
};

export default function Callout({ kind, children }: { kind: string; children: ReactNode }) {
  const v = VARIANTS[kind] ?? VARIANTS.note;
  return (
    <aside className={`lesson-callout lesson-callout-${VARIANTS[kind] ? kind : 'note'}`} role="note" aria-label={v.title}>
      <p className="lesson-callout-title">
        <span aria-hidden="true">{v.icon}</span> {v.title}
      </p>
      <div className="lesson-callout-body">{children}</div>
    </aside>
  );
}
