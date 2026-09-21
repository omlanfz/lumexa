// FILE PATH: client/components/classroom/ThemeToggle.tsx
//
// Lumexa-branded sun/moon toggle for the classroom's own light/dark theme
// (see useClassroomTheme — localStorage only, per participant, never
// synced). Matches the landing page's toggle affordance: a single icon
// button that swaps glyph with the current theme.

'use client';

import { Sun, Moon } from 'lucide-react';
import type { ClassroomTheme } from '@/lib/classroom/useClassroomTheme';

interface ThemeToggleProps {
  theme: ClassroomTheme;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      data-tooltip={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      data-tooltip-pos="bottom"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="cr-icon-btn w-9 h-9"
    >
      {isDark ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
