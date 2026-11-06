'use client';

// FILE PATH: client/components/lesson/SidebarToggle.tsx
//
// The button that hides and re-opens the lesson page's contents sidebar. One button, one
// place: it sits at the top of the sidebar while it is open and stays in the same spot —
// the slim rail — once the sidebar is hidden, so the same click brings it back.

export function SidebarIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="4.5" width="18" height="15" rx="3.5" />
      <path d="M9.5 4.5v15" />
      {/* the left pane is drawn filled while the sidebar is showing */}
      {open && <path d="M6.5 4.5H9.5v15H6.5A3.5 3.5 0 0 1 3 16V8a3.5 3.5 0 0 1 3.5-3.5Z" fill="currentColor" fillOpacity="0.22" stroke="none" />}
    </svg>
  );
}

export default function SidebarToggle({ open, onToggle, controls }: { open: boolean; onToggle: () => void; controls: string }) {
  const label = open ? 'Hide sidebar' : 'Show sidebar';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={open}
      aria-controls={controls}
      title={label}
      data-sidebar-toggle=""
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      <SidebarIcon open={open} />
    </button>
  );
}
