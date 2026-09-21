// FILE PATH: client/lib/classroom/useClickOutside.ts
//
// Shared "close this popover" behavior for every dropdown/menu in the
// classroom (device menus, video effects, class controls, participant
// menus, settings). Closes on an outside pointer-down and on Esc — the two
// behaviors every one of these popovers is supposed to share consistently.

import { useEffect, type RefObject } from 'react';

export function useClickOutside(ref: RefObject<HTMLElement | null>, active: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!active) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, ref, onClose]);
}
