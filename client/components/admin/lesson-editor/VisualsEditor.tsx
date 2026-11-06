'use client';

// FILE PATH: client/components/admin/lesson-editor/VisualsEditor.tsx
//
// Structured editing of a lesson's visuals and interactive blocks. Each is plain data:
// a kind, required alt text and caption, and a configuration. The editor shows the
// real rendering as the configuration changes and tells the author what the server
// would reject; it never accepts markup or scripts (the config is JSON data only).

import { useEffect, useMemo, useState } from 'react';
import type { LessonVisualData } from '@/lib/lesson/types';
import { LessonRenderContext } from '@/components/lesson/LessonContext';
import VisualBlock from '@/components/lesson/visuals/VisualBlock';
import '@/components/lesson/visuals';
import { VISUAL_TEMPLATES, nextFreeId } from './templates';

export interface VisualTypeInfo {
  label: string;
  description: string;
  requires: string[];
  interactive: boolean;
}

const INPUT = 'w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm a-focus';
const SMALL_BTN = 'text-xs px-2 py-1 rounded-md border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-surface-2)] disabled:opacity-40';

function VisualPreview({ visual }: { visual: LessonVisualData }) {
  return (
    <LessonRenderContext.Provider value={{ mode: 'page', presentation: false, viewer: 'admin', refs: {}, visuals: { [visual.id]: visual }, renderQuiz: null }}>
      <div className="lesson-prose">
        <VisualBlock id={visual.id} />
      </div>
    </LessonRenderContext.Provider>
  );
}

function ConfigField({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const pretty = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const [text, setText] = useState(pretty);
  const [problem, setProblem] = useState<string | null>(null);
  // Follow outside changes (changing the type, loading a template) but not our own keystrokes.
  useEffect(() => {
    try {
      if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(value)) setText(pretty);
    } catch {
      /* the author is mid-edit; leave their text alone */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pretty]);
  return (
    <div>
      <textarea
        className={`${INPUT} font-mono text-xs leading-relaxed`}
        rows={Math.min(18, Math.max(6, text.split('\n').length + 1))}
        spellCheck={false}
        value={text}
        aria-label="Configuration (JSON)"
        onChange={(e) => {
          setText(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The configuration must be an object, like { "nodes": [...] }.');
            setProblem(null);
            onChange(parsed);
          } catch (err) {
            setProblem((err as Error).message.replace(/^JSON\.parse: /, ''));
          }
        }}
      />
      {problem && <p className="mt-1 text-xs text-[var(--a-danger)]" role="alert">This is not valid JSON yet: {problem}</p>}
    </div>
  );
}

function VisualCard({ v, types, errors, onChange, onRemove, onMove, onInsert, first, last, duplicate }: { v: LessonVisualData; types: Record<string, VisualTypeInfo>; errors: string[]; onChange: (v: LessonVisualData) => void; onRemove: () => void; onMove: (d: number) => void; onInsert: () => void; first: boolean; last: boolean; duplicate: () => void }) {
  const info = types[v.type];
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${errors.length ? 'border-[var(--a-danger)]' : 'border-[var(--a-border)]'} bg-[var(--a-surface)]`}>
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-xs px-1.5 py-0.5 rounded bg-[var(--a-surface-2)] text-[var(--a-text)]">{v.id}</code>
        <span className="text-sm font-semibold text-[var(--a-text)]">{info?.label ?? v.type}</span>
        {info?.interactive && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--a-surface-2)] text-[var(--a-text-muted)]">interactive</span>}
        <span className="ml-auto flex gap-1 flex-wrap">
          <button type="button" className={SMALL_BTN} onClick={onInsert}>Insert in lesson text</button>
          <button type="button" className={SMALL_BTN} onClick={duplicate}>Duplicate</button>
          <button type="button" className={SMALL_BTN} onClick={() => onMove(-1)} disabled={first} aria-label="Move up">↑</button>
          <button type="button" className={SMALL_BTN} onClick={() => onMove(1)} disabled={last} aria-label="Move down">↓</button>
          <button type="button" className={`${SMALL_BTN} text-[var(--a-danger)]`} onClick={onRemove}>Remove</button>
        </span>
      </div>
      {info && <p className="text-xs text-[var(--a-text-faint)]">{info.description}</p>}
      {errors.map((e, i) => (
        <p key={i} className="text-xs text-[var(--a-danger)]" role="alert">{e.replace(/^Visual \d+ \("[^"]*"\):\s*/, '')}</p>
      ))}
      <div className="grid sm:grid-cols-3 gap-2">
        <label className="text-xs text-[var(--a-text-muted)]">
          Id (letters, numbers, dashes)
          <input className={`${INPUT} mt-1`} value={v.id} onChange={(e) => onChange({ ...v, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60) })} />
        </label>
        <label className="text-xs text-[var(--a-text-muted)]">
          Kind
          <select className={`${INPUT} mt-1`} value={v.type} onChange={(e) => onChange({ ...v, type: e.target.value, config: VISUAL_TEMPLATES[e.target.value] ?? {} })}>
            {Object.entries(types).map(([k, t]) => (
              <option key={k} value={k}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--a-text-muted)]">
          Title (optional, shown above)
          <input className={`${INPUT} mt-1`} value={v.title ?? ''} onChange={(e) => onChange({ ...v, title: e.target.value || undefined })} />
        </label>
      </div>
      <label className="block text-xs text-[var(--a-text-muted)]">
        Alt text — describe it for someone who cannot see it (required)
        <textarea className={`${INPUT} mt-1`} rows={2} value={v.alt} onChange={(e) => onChange({ ...v, alt: e.target.value })} />
      </label>
      <label className="block text-xs text-[var(--a-text-muted)]">
        Caption — one short line shown under it (required)
        <input className={`${INPUT} mt-1`} value={v.caption} onChange={(e) => onChange({ ...v, caption: e.target.value })} />
      </label>
      <div className="grid lg:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-[var(--a-text-muted)] mb-1">Configuration {info?.requires.length ? `(needs: ${info.requires.join(', ')})` : ''}</p>
          <ConfigField value={v.config} onChange={(config) => onChange({ ...v, config })} />
        </div>
        <div className="rounded-lg border border-[var(--a-border)] p-3 bg-[var(--a-bg)] overflow-x-auto">
          <p className="text-xs text-[var(--a-text-faint)] mb-1">Preview</p>
          <VisualPreview visual={v} />
        </div>
      </div>
    </div>
  );
}

export default function VisualsEditor({ value, onChange, types, errors, onInsert }: { value: LessonVisualData[]; onChange: (v: LessonVisualData[]) => void; types: Record<string, VisualTypeInfo>; errors: string[]; onInsert: (id: string) => void }) {
  const [adding, setAdding] = useState('flow');
  const ids = value.map((v) => v.id);
  const errorsFor = (i: number) => errors.filter((e) => e.startsWith(`Visual ${i + 1} `));
  const general = errors.filter((e) => !/^Visual \d+ /.test(e));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {general.map((e, i) => (
        <p key={i} className="text-xs text-[var(--a-danger)]" role="alert">{e}</p>
      ))}
      {value.length === 0 && <p className="text-sm text-[var(--a-text-faint)] italic">No visuals yet. Add one, then place it in the lesson text.</p>}
      {value.map((v, i) => (
        <VisualCard
          key={i}
          v={v}
          types={types}
          errors={errorsFor(i)}
          first={i === 0}
          last={i === value.length - 1}
          onChange={(nv) => onChange(value.map((x, k) => (k === i ? nv : x)))}
          onRemove={() => onChange(value.filter((_, k) => k !== i))}
          onMove={(d) => move(i, d)}
          onInsert={() => onInsert(v.id)}
          duplicate={() => onChange([...value.slice(0, i + 1), { ...JSON.parse(JSON.stringify(v)), id: nextFreeId(v.id, ids) }, ...value.slice(i + 1)])}
        />
      ))}
      <div className="flex items-center gap-2 flex-wrap">
        <select className="px-2 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm max-w-full" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Kind of visual to add">
          {Object.entries(types).map(([k, t]) => (
            <option key={k} value={k}>{t.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]"
          onClick={() => onChange([...value, { id: nextFreeId(adding, ids), type: adding, alt: '', caption: '', config: JSON.parse(JSON.stringify(VISUAL_TEMPLATES[adding] ?? {})) }])}
        >
          + Add visual
        </button>
      </div>
    </div>
  );
}
