// FILE PATH: client/components/Collapse.tsx
//
// An expand / collapse region that opens and closes smoothly (CSS: .motion-collapse in
// app/globals.css). Use it instead of `{open && <div>…</div>}` wherever a section is revealed
// by a button: the content stays mounted, so the height can be animated in BOTH directions.
//
// While closed the region has no height, is invisible, and is `inert` — keyboard focus and
// assistive technology skip it — so it behaves exactly like content that is not rendered. Put
// aria-expanded on the button that controls it (and `id` here + aria-controls there if you like).
//
// For content that is heavy to render, or should not exist until asked for (data fetched on
// open, big lists), keep the conditional and don't use this.

import type { ReactNode } from 'react';

export default function Collapse({
  open,
  children,
  className = '',
  id,
}: {
  open: boolean;
  children: ReactNode;
  /** Classes for the animated outer box (rarely needed; style the children instead). */
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`motion-collapse ${className}`.trim()}
      data-open={open ? 'true' : 'false'}
      inert={!open}
      aria-hidden={open ? undefined : true}
    >
      <div className="motion-collapse-inner">{children}</div>
    </div>
  );
}
