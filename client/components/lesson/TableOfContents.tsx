'use client';

// FILE PATH: client/components/lesson/TableOfContents.tsx
//
// A compact table of contents built from the lesson's real headings, with the
// current section highlighted as you scroll and a check beside each section a
// student has actually read.

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export default function TableOfContents({
  items,
  activeId,
  readIds,
  onNavigate,
  showHeading = true,
}: {
  items: TocItem[];
  activeId: string | null;
  /** Only passed for a student; teachers see no read marks. */
  readIds: Set<string> | null;
  onNavigate: (id: string) => void;
  /** The "On this page" label above the list (the sidebar and the mobile drawer draw their own). */
  showHeading?: boolean;
}) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page" className="text-sm">
      {showHeading && <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">On this page</div>}
      <ol className="space-y-0.5 border-l border-gray-200 dark:border-gray-700">
        {items.map((it) => {
          const active = it.id === activeId;
          const read = readIds?.has(it.id) ?? false;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-current={active ? 'location' : undefined}
                onClick={() => onNavigate(it.id)}
                className={`-ml-px flex items-start gap-1.5 border-l-2 py-1 pr-2 leading-snug transition-colors ${it.level === 3 ? 'pl-6 text-[0.8rem]' : 'pl-3'} ${active ? 'border-violet-500 font-semibold text-violet-700 dark:text-violet-300' : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-100'}`}
              >
                {read && (
                  <span className="mt-px text-emerald-600 dark:text-emerald-400" aria-hidden="true">
                    ✓
                  </span>
                )}
                <span className="min-w-0 break-words">{it.text}</span>
                {read && <span className="sr-only"> (read)</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
