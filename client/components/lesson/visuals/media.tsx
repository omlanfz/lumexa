'use client';

// FILE PATH: client/components/lesson/visuals/media.tsx
//
// Media and workflow visuals: a single image, a short video (never autoplays; has
// controls, optional captions and a transcript), an illustrated step-by-step
// walkthrough, and a checklist remembered on this device.
//
// Every address is checked again here with safeMediaSrc (https, or this app's own
// /lesson-assets/) even though the server validates it too.

import { useEffect, useId, useState } from 'react';
import InlineMarkdown from '../InlineMarkdown';
import { useLessonRender } from '../LessonContext';
import { safeMediaSrc } from '@/lib/lesson/markdown';
import { C } from './svg';
import { registerVisuals, type VisualProps } from './registry';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ─── Image ──────────────────────────────────────────────────────────────────

export function ImageVisual({ config, alt }: VisualProps) {
  const src = safeMediaSrc(typeof config.src === 'string' ? config.src : '');
  if (!src) return <p className="lesson-visual-missing">This image address is not allowed.</p>;
  const w = Number(config.width);
  const h = Number(config.height);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={Number.isFinite(w) && w > 0 ? w : undefined}
      height={Number.isFinite(h) && h > 0 ? h : undefined}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto', borderRadius: 8 }}
    />
  );
}

// ─── Video ──────────────────────────────────────────────────────────────────

export function VideoVisual({ config, alt }: VisualProps) {
  const src = safeMediaSrc(typeof config.src === 'string' ? config.src : '');
  const poster = safeMediaSrc(typeof config.poster === 'string' ? config.poster : '');
  const captions = safeMediaSrc(typeof config.captionsSrc === 'string' ? config.captionsSrc : '');
  const transcript = typeof config.transcript === 'string' ? config.transcript : '';
  if (!src) return <p className="lesson-visual-missing">This video address is not allowed.</p>;
  return (
    <div>
      {/* No autoPlay, no loop, nothing muted-to-start: the learner presses play. */}
      <video
        controls
        preload="none"
        playsInline
        poster={poster || undefined}
        aria-label={alt}
        style={{ display: 'block', width: '100%', maxHeight: '70vh', borderRadius: 8, background: '#000' }}
      >
        <source src={src} />
        {captions && <track kind="captions" src={captions} srcLang={typeof config.captionsLang === 'string' ? config.captionsLang : 'en'} label="Captions" />}
        Your browser can’t play this video. The transcript below has everything it says.
      </video>
      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Transcript</summary>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, marginTop: 6 }}>{transcript}</div>
      </details>
    </div>
  );
}

// ─── Step-by-step walkthrough ───────────────────────────────────────────────

interface WalkStep {
  title?: string;
  text?: string;
  code?: string;
  image?: { src?: string; alt?: string };
}

export function Walkthrough({ config, onUse }: VisualProps) {
  const steps: WalkStep[] = (Array.isArray(config.steps) ? config.steps : []).slice(0, 20);
  const [i, setI] = useState(0);
  if (steps.length === 0) return null;
  const s = steps[clamp(i, 0, steps.length - 1)];
  const imgSrc = safeMediaSrc(s.image?.src ?? '');
  const go = (n: number) => { setI(clamp(n, 0, steps.length - 1)); onUse?.(); };
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }} role="group" aria-label="Steps">
        {steps.map((st, n) => (
          <button
            key={n}
            type="button"
            onClick={() => go(n)}
            aria-label={`Step ${n + 1}${st.title ? `: ${st.title}` : ''}`}
            aria-current={n === i ? 'step' : undefined}
            style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${n <= i ? C.accent : C.border}`, background: n === i ? C.accent : n < i ? C.surface2 : C.surface, color: n === i ? '#fff' : C.text, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            {n + 1}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          Step {i + 1} of {steps.length}{s.title ? ` — ${s.title}` : ''}
        </div>
        {s.text && <div style={{ fontSize: 14.5, lineHeight: 1.65 }}><InlineMarkdown text={s.text} /></div>}
        {s.code && <pre style={{ margin: '8px 0 0', background: '#0f172a', color: '#e2e8f0', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, overflowX: 'auto' }} tabIndex={0}>{s.code}</pre>}
        {imgSrc && s.image?.alt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={s.image.alt} loading="lazy" decoding="async" style={{ display: 'block', maxWidth: '100%', height: 'auto', marginTop: 10, borderRadius: 8, border: `1px solid ${C.border}` }} />
        )}
      </div>
      <div className="lv-controls">
        <button type="button" className="lv-btn" onClick={() => go(i - 1)} disabled={i === 0}>◀ Previous</button>
        <button type="button" className="lv-btn lv-btn-primary" onClick={() => go(i + 1)} disabled={i >= steps.length - 1}>Next ▶</button>
      </div>
    </div>
  );
}

// ─── Checklist (remembered on this device) ──────────────────────────────────

interface Item { id?: string; text: string }

export function Checklist({ config, onUse, id }: VisualProps) {
  const { lessonId } = useLessonRender();
  const items: Item[] = (Array.isArray(config.items) ? config.items : [])
    .slice(0, 30)
    .map((it: string | Item) => (typeof it === 'string' ? { text: it } : { id: it.id, text: String(it.text ?? '') }))
    .filter((it: Item) => it.text);
  const storageKey = `lumexa:checklist:${lessonId ?? 'lesson'}:${id}`;
  const [done, setDone] = useState<Set<number>>(new Set());
  const heading = useId();

  // Read after mount so the server-rendered markup and the first client render match.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setDone(new Set(arr.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < items.length)));
      }
    } catch {
      /* private mode / blocked storage: the checklist simply isn't remembered */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const toggle = (n: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
    onUse?.();
  };

  if (items.length === 0) return null;
  const title = typeof config.title === 'string' ? config.title : '';
  return (
    <div role="group" aria-labelledby={title ? heading : undefined}>
      {title && <div id={heading} style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {items.map((it, n) => (
          <li key={n}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '6px 10px', border: `1px solid ${done.has(n) ? C.good : C.border}`, borderRadius: 8, background: done.has(n) ? 'color-mix(in srgb, var(--lv-good) 12%, transparent)' : C.surface }}>
              <input type="checkbox" checked={done.has(n)} onChange={() => toggle(n)} style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--lv-good)' }} />
              <span style={{ fontSize: 14.5, lineHeight: 1.5, textDecoration: done.has(n) ? 'line-through' : 'none', color: done.has(n) ? C.muted : C.text }}><InlineMarkdown text={it.text} /></span>
            </label>
          </li>
        ))}
      </ul>
      <p className="lv-label" aria-live="polite" style={{ margin: '8px 0 0' }}>
        {done.size} of {items.length} done{done.size === items.length ? ' — nicely done! ✅' : ''} · saved on this device only
      </p>
    </div>
  );
}

registerVisuals({
  image: { Component: ImageVisual, interactive: false },
  video: { Component: VideoVisual, interactive: false, role: 'group' },
  walkthrough: { Component: Walkthrough, interactive: true },
  checklist: { Component: Checklist, interactive: true },
});
