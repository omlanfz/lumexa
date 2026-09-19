// FILE PATH: client/components/classroom/IconButton.tsx
//
// The one icon-only control button used across the classroom's bottom bar
// and panels — consistent sizing, hover/active/disabled states, and a CSS
// tooltip (see [data-tooltip] in globals.css) instead of a visible label.

'use client';

import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
  off?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tooltipPos?: 'top' | 'bottom';
  badge?: number | boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { box: 'w-9 h-9', icon: 16 },
  md: { box: 'w-11 h-11', icon: 20 },
  lg: { box: 'w-12 h-12', icon: 22 },
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { icon: Icon, label, onClick, active, off, disabled, size = 'md', tooltipPos = 'top', badge, className = '' },
    ref,
  ) => {
    const dims = SIZE_MAP[size];
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        data-tooltip={label}
        data-tooltip-pos={tooltipPos}
        className={`cr-icon-btn relative ${dims.box} ${active ? 'is-active' : ''} ${off ? 'is-off' : ''} ${className}`}
      >
        <Icon size={dims.icon} strokeWidth={2} />
        {badge ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--cr-danger)] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {typeof badge === 'number' ? badge : ''}
          </span>
        ) : null}
      </button>
    );
  },
);
IconButton.displayName = 'IconButton';

export default IconButton;
