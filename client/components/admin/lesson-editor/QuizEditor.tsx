'use client';

// FILE PATH: client/components/admin/lesson-editor/QuizEditor.tsx
//
// Structured editing of a lesson's Mini Quiz: add, reorder and remove questions of
// every type, each with the fields that type needs. Nothing here is Markdown — the
// editor produces the same validated structure the server stores.

import { useState } from 'react';

export type DraftQuestion = {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'code_output' | 'code_error' | 'ordering' | 'matching' | 'self_check' | 'reflection';
  prompt: string;
  explanation?: string;
  fixedOrder?: boolean;
  code?: { language: string; code: string };
  options?: string[];
  correctIndex?: number;
  items?: string[];
  pairs?: { left: string; right: string }[];
  sampleAnswer?: string;
  source?: string;
};

const TYPES: { type: DraftQuestion['type']; label: string }[] = [
  { type: 'multiple_choice', label: 'Multiple choice' },
  { type: 'true_false', label: 'True / False' },
  { type: 'code_output', label: 'What does this code print?' },
  { type: 'code_error', label: 'Find the error in this code' },
  { type: 'ordering', label: 'Put in order' },
  { type: 'matching', label: 'Matching pairs' },
  { type: 'self_check', label: 'Self-check (write, then compare)' },
  { type: 'reflection', label: 'Reflection prompt' },
];

const INPUT = 'w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm a-focus';
const SMALL_BTN = 'text-xs px-2 py-1 rounded-md border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-surface-2)] disabled:opacity-40';

function blank(type: DraftQuestion['type'], id: string): DraftQuestion {
  switch (type) {
    case 'true_false':
      return { id, type, prompt: '', options: ['True', 'False'], correctIndex: 0, explanation: '' };
    case 'code_output':
    case 'code_error':
      return { id, type, prompt: type === 'code_output' ? 'What does this code print?' : 'What is wrong with this code?', code: { language: 'python', code: '' }, options: ['', '', ''], correctIndex: 0, explanation: '' };
    case 'ordering':
      return { id, type, prompt: '', items: ['', ''], explanation: '' };
    case 'matching':
      return { id, type, prompt: '', pairs: [{ left: '', right: '' }, { left: '', right: '' }], explanation: '' };
    case 'self_check':
      return { id, type, prompt: '', sampleAnswer: '' };
    case 'reflection':
      return { id, type, prompt: '' };
    default:
      return { id, type: 'multiple_choice', prompt: '', options: ['', '', ''], correctIndex: 0, explanation: '' };
  }
}

function List({ items, onChange, label, min = 2, max = 8, radio }: { items: string[]; onChange: (v: string[]) => void; label: string; min?: number; max?: number; radio?: { value: number; set: (n: number) => void; name: string } }) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          {radio && <input type="radio" name={radio.name} checked={radio.value === i} onChange={() => radio.set(i)} aria-label={`Option ${i + 1} is the correct answer`} />}
          <input className={INPUT} value={it} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} placeholder={`${label} ${i + 1}`} aria-label={`${label} ${i + 1}`} />
          {!radio && (
            <>
              <button type="button" className={SMALL_BTN} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" className={SMALL_BTN} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</button>
            </>
          )}
          <button type="button" className={SMALL_BTN} onClick={() => onChange(items.filter((_, k) => k !== i))} disabled={items.length <= min} aria-label={`Remove ${label} ${i + 1}`}>✕</button>
        </div>
      ))}
      <button type="button" className="text-sm text-[var(--a-accent)] hover:underline disabled:opacity-40" disabled={items.length >= max} onClick={() => onChange([...items, ''])}>+ Add {label.toLowerCase()}</button>
    </div>
  );
}

function QuestionCard({ q, n, total, errors, onChange, onMove, onRemove }: { q: DraftQuestion; n: number; total: number; errors: string[]; onChange: (q: DraftQuestion) => void; onMove: (d: number) => void; onRemove: () => void }) {
  const set = (patch: Partial<DraftQuestion>) => onChange({ ...q, ...patch });
  const choice = q.type === 'multiple_choice' || q.type === 'code_output' || q.type === 'code_error';
  const graded = q.type !== 'self_check' && q.type !== 'reflection';
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${errors.length ? 'border-[var(--a-danger)]' : 'border-[var(--a-border)]'} bg-[var(--a-surface)]`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-[var(--a-text)]">Question {n}</span>
        <select
          className="px-2 py-1 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm"
          value={q.type}
          onChange={(e) => {
            const t = e.target.value as DraftQuestion['type'];
            onChange({ ...blank(t, q.id), prompt: q.prompt, explanation: q.explanation });
          }}
          aria-label={`Question ${n} type`}
        >
          {TYPES.map((t) => (
            <option key={t.type} value={t.type}>{t.label}</option>
          ))}
        </select>
        <span className="ml-auto flex gap-1">
          <button type="button" className={SMALL_BTN} onClick={() => onMove(-1)} disabled={n === 1} aria-label="Move question up">↑</button>
          <button type="button" className={SMALL_BTN} onClick={() => onMove(1)} disabled={n === total} aria-label="Move question down">↓</button>
          <button type="button" className={`${SMALL_BTN} text-[var(--a-danger)]`} onClick={onRemove}>Remove</button>
        </span>
      </div>
      {errors.map((e, i) => (
        <p key={i} className="text-xs text-[var(--a-danger)]" role="alert">{e.replace(/^Question \d+:\s*/, '')}</p>
      ))}

      <label className="block text-xs text-[var(--a-text-muted)]">
        Question (Markdown: `code` and **bold** work)
        <textarea className={`${INPUT} mt-1`} rows={2} value={q.prompt} onChange={(e) => set({ prompt: e.target.value })} />
      </label>

      {(q.type === 'code_output' || q.type === 'code_error') && (
        <div className="grid sm:grid-cols-[8rem_1fr] gap-2">
          <input className={INPUT} value={q.code?.language ?? ''} onChange={(e) => set({ code: { language: e.target.value, code: q.code?.code ?? '' } })} placeholder="language" aria-label="Code language" />
          <textarea className={`${INPUT} font-mono`} rows={4} value={q.code?.code ?? ''} onChange={(e) => set({ code: { language: q.code?.language ?? 'python', code: e.target.value } })} placeholder="The code to show" aria-label="Code" />
        </div>
      )}

      {choice && (
        <div>
          <p className="text-xs text-[var(--a-text-muted)] mb-1">Answer options — select the correct one</p>
          <List items={q.options ?? []} onChange={(options) => set({ options, correctIndex: Math.min(q.correctIndex ?? 0, options.length - 1) })} label="Option" min={2} max={6} radio={{ value: q.correctIndex ?? 0, set: (correctIndex) => set({ correctIndex }), name: `correct-${q.id}` }} />
          <label className="mt-2 flex items-center gap-2 text-xs text-[var(--a-text-muted)]">
            <input type="checkbox" checked={!!q.fixedOrder} onChange={(e) => set({ fixedOrder: e.target.checked })} /> Keep the options in this order (for “All of the above” and similar)
          </label>
        </div>
      )}
      {q.type === 'true_false' && (
        <div className="flex gap-4 text-sm text-[var(--a-text)]">
          {['True', 'False'].map((label, i) => (
            <label key={label} className="flex items-center gap-2">
              <input type="radio" name={`correct-${q.id}`} checked={(q.correctIndex ?? 0) === i} onChange={() => set({ correctIndex: i, options: ['True', 'False'] })} /> The answer is {label}
            </label>
          ))}
        </div>
      )}
      {q.type === 'ordering' && (
        <div>
          <p className="text-xs text-[var(--a-text-muted)] mb-1">Steps in the CORRECT order (learners see them shuffled)</p>
          <List items={q.items ?? []} onChange={(items) => set({ items })} label="Step" max={8} />
        </div>
      )}
      {q.type === 'matching' && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--a-text-muted)]">Pairs that belong together (learners see the right-hand side shuffled)</p>
          {(q.pairs ?? []).map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={INPUT} value={p.left} onChange={(e) => set({ pairs: q.pairs!.map((x, k) => (k === i ? { ...x, left: e.target.value } : x)) })} placeholder={`Term ${i + 1}`} aria-label={`Term ${i + 1}`} />
              <span aria-hidden="true">↔</span>
              <input className={INPUT} value={p.right} onChange={(e) => set({ pairs: q.pairs!.map((x, k) => (k === i ? { ...x, right: e.target.value } : x)) })} placeholder={`Match ${i + 1}`} aria-label={`Match ${i + 1}`} />
              <button type="button" className={SMALL_BTN} disabled={(q.pairs?.length ?? 0) <= 2} onClick={() => set({ pairs: q.pairs!.filter((_, k) => k !== i) })} aria-label={`Remove pair ${i + 1}`}>✕</button>
            </div>
          ))}
          <button type="button" className="text-sm text-[var(--a-accent)] hover:underline disabled:opacity-40" disabled={(q.pairs?.length ?? 0) >= 8} onClick={() => set({ pairs: [...(q.pairs ?? []), { left: '', right: '' }] })}>+ Add pair</button>
        </div>
      )}
      {q.type === 'self_check' && (
        <label className="block text-xs text-[var(--a-text-muted)]">
          Model answer (shown after the learner has written theirs)
          <textarea className={`${INPUT} mt-1`} rows={3} value={q.sampleAnswer ?? ''} onChange={(e) => set({ sampleAnswer: e.target.value })} />
        </label>
      )}
      {graded && (
        <label className="block text-xs text-[var(--a-text-muted)]">
          Explanation (shown after the learner answers)
          <textarea className={`${INPUT} mt-1`} rows={2} value={q.explanation ?? ''} onChange={(e) => set({ explanation: e.target.value })} />
        </label>
      )}
    </div>
  );
}

export default function QuizEditor({ value, onChange, errors }: { value: DraftQuestion[]; onChange: (v: DraftQuestion[]) => void; errors: string[] }) {
  const [adding, setAdding] = useState<DraftQuestion['type']>('multiple_choice');
  const errorsFor = (n: number) => errors.filter((e) => e.startsWith(`Question ${n}:`));
  const general = errors.filter((e) => !/^Question \d+:/.test(e));
  const nextId = () => {
    let i = value.length + 1;
    while (value.some((q) => q.id === `q${i}`)) i++;
    return `q${i}`;
  };
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
      {value.length === 0 && <p className="text-sm text-[var(--a-text-faint)] italic">No quiz yet. Learners see a Knowledge Check only when there are questions.</p>}
      {value.map((q, i) => (
        <QuestionCard key={q.id + i} q={q} n={i + 1} total={value.length} errors={errorsFor(i + 1)} onChange={(nq) => onChange(value.map((x, k) => (k === i ? nq : x)))} onMove={(d) => move(i, d)} onRemove={() => onChange(value.filter((_, k) => k !== i))} />
      ))}
      <div className="flex items-center gap-2 flex-wrap">
        <select className="px-2 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm" value={adding} onChange={(e) => setAdding(e.target.value as DraftQuestion['type'])} aria-label="Type of question to add">
          {TYPES.map((t) => (
            <option key={t.type} value={t.type}>{t.label}</option>
          ))}
        </select>
        <button type="button" className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]" onClick={() => onChange([...value, blank(adding, nextId())])}>+ Add question</button>
      </div>
    </div>
  );
}
