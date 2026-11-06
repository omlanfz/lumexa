'use client';

// FILE PATH: client/components/lesson/visuals/VisualBlock.tsx
//
// One visual or interactive block placed in a lesson with ```lumexa-visual <id>.
// Draws it from the lesson's own data (never from markup), gives it its alt text
// and caption, and defers anything that loads from the network (images, video)
// until it is near the screen.

import { useEffect, useRef, useState } from 'react';
import { useLessonRender } from '../LessonContext';
import { VISUAL_RENDERERS, LAZY_TYPES } from './registry';

export default function VisualBlock({ id }: { id: string }) {
  const { visuals, viewer, onActivityDone } = useLessonRender();
  const visual = visuals[id];
  const ref = useRef<HTMLElement>(null);
  const lazy = !!visual && LAZY_TYPES.has(visual.type);
  const [near, setNear] = useState(!lazy);

  useEffect(() => {
    if (!lazy) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // No observer support (decided after mount so server and client markup agree): just load it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lazy]);

  if (!visual) {
    return viewer === 'admin' ? (
      <p className="lesson-visual-missing" role="alert">
        The visual “{id}” is placed here but does not exist in this lesson.
      </p>
    ) : null;
  }

  const entry = VISUAL_RENDERERS[visual.type];
  return (
    <figure ref={ref} className="lesson-visual" data-visual-id={id} data-visual-type={visual.type}>
      {visual.title && <p className="lesson-visual-title">{visual.title}</p>}
      <div
        className="lesson-visual-frame"
        // A diagram is one picture to a screen reader; a block with its own text or controls is a group.
        role={entry?.role ?? (entry?.interactive ? 'group' : 'img')}
        aria-label={visual.alt}
      >
        {!near ? (
          <div className="lesson-visual-skeleton" aria-hidden="true" />
        ) : entry ? (
          <entry.Component config={visual.config ?? {}} alt={visual.alt} id={id} onUse={() => onActivityDone?.(id)} />
        ) : (
          <p className="lesson-visual-missing">This visual type (“{visual.type}”) is not available in this version of the app.</p>
        )}
      </div>
      <figcaption>{visual.caption}</figcaption>
    </figure>
  );
}
