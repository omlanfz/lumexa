'use client';

// FILE PATH: client/components/admin/lesson-editor/QuizEditor.tsx
//
// Structured editing of a lesson's Mini Quiz. EVERY question is multiple choice with
// exactly four answer options — that is the only kind of question a lesson quiz can have,
// so there is no question type to pick and no way to add a typed-answer, true/false,
// ordering or matching question. Add, reorder and remove questions, write four options,
// mark the one right answer, and explain it. Nothing here is Markdown — the editor produces
// the same validated structure the server stores (and the server checks it again on save).

import { MCQ_OPTION_COUNT } from '@/lib/lesson/types';

export type DraftQuestion = {
  id: string;
  type: 'multiple_choice';
  prompt: string;
  explanation?: string;
  fixedOrder?: boolean;
  code?: { language: string; code: string };
  /** Always exactly four entries (blank until written). */
  options: string[];
  correctIndex: number;
  source?: string;
};

const LETTERS = 'ABCD';
const INPUT = 'w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm a-focus';
const SMALL_BTN = 'text-xs px-2 py-1 rounded-md border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-surface-2)] disabled:opacity-40';

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/** A new, empty question: four blank options, the first marked correct until the author chooses. */
export function blankQuestion(id: string): DraftQuestion {
  return { id, type: 'multiple_choice', prompt: '', options: Array.from({ length: MCQ_OPTION_COUNT }, () => ''), correctIndex: 0, explanation: '' };
}

/**
 * Brings anything stored with a lesson into the editor's shape: always multiple choice, always
 * four option boxes. A question left over in an older format shows up with its text so it can be
 * finished (or removed) — the server will not accept it until it is a complete four-option question.
 */
export function toDraftQuestion(raw: unknown, index: number): DraftQuestion {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const given = Array.isArray(r.options) ? r.options.map(text) : [];
  const options = Array.from({ length: MCQ_OPTION_COUNT }, (_, i) => given[i] ?? '');
  const ci = Number(r.correctIndex);
  const code = r.code && typeof r.code === 'object' ? (r.code as Record<string, unknown>) : null;
  return {
    id: text(r.id) || `q${index + 1}`,
    type: 'multiple_choice',
    prompt: text(r.prompt),
    explanation: text(r.explanation),
    ...(typeof r.fixedOrder === 'boolean' ? { fixedOrder: r.fixedOrder } : {}),
    ...(code ? { code: { language: text(code.language) || 'text', code: text(code.code) } } : {}),
    options,
    correctIndex: Number.isInteger(ci) && ci >= 0 && ci < MCQ_OPTION_COUNT ? ci : 0,
    ...(typeof r.source === 'string' ? { source: r.source } : {}),
  };
}

function QuestionCard({ q, n, total, errors, onChange, onMove, onRemove }: { q: DraftQuestion; n: number; total: number; errors: string[]; onChange: (q: DraftQuestion) => void; onMove: (d: number) => void; onRemove: () => void }) {
  const set = (patch: Partial<DraftQuestion>) => onChange({ ...q, ...patch });
  const setOption = (i: number, value: string) => set({ options: q.options.map((o, k) => (k === i ? value : o)) });
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${errors.length ? 'border-[var(--a-danger)]' : 'border-[var(--a-border)]'} bg-[var(--a-surface)]`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-[var(--a-text)]">Question {n}</span>
        <span className="text-xs text-[var(--a-text-muted)]">Multiple choice · {MCQ_OPTION_COUNT} options</span>
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

      <div>
        <label className="flex items-center gap-2 text-xs text-[var(--a-text-muted)]">
          <input
            type="checkbox"
            checked={!!q.code}
            onChange={(e) => set({ code: e.target.checked ? { language: 'python', code: q.code?.code ?? '' } : undefined })}
          />{' '}
          Show a code snippet with this question (for “what does this print?” and similar)
        </label>
        {q.code && (
          <div className="mt-2 grid sm:grid-cols-[8rem_1fr] gap-2">
            <input className={INPUT} value={q.code.language} onChange={(e) => set({ code: { language: e.target.value, code: q.code?.code ?? '' } })} placeholder="language" aria-label="Code language" />
            <textarea className={`${INPUT} font-mono`} rows={4} value={q.code.code} onChange={(e) => set({ code: { language: q.code?.language ?? 'python', code: e.target.value } })} placeholder="The code to show" aria-label="Code" />
          </div>
        )}
      </div>

      <fieldset>
        <legend className="text-xs text-[var(--a-text-muted)] mb-1">Four answer options — select the one right answer</legend>
        <div className="space-y-2">
          {q.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name={`correct-${q.id}-${n}`} checked={q.correctIndex === i} onChange={() => set({ correctIndex: i })} aria-label={`Option ${LETTERS[i]} is the correct answer`} />
              <span className="w-4 shrink-0 text-xs font-semibold text-[var(--a-text-muted)]" aria-hidden="true">{LETTERS[i]}</span>
              <input className={INPUT} value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={q.correctIndex === i ? `Option ${LETTERS[i]} — the right answer` : `Option ${LETTERS[i]} — a plausible wrong answer`} aria-label={`Option ${LETTERS[i]}`} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--a-text-faint)]">
          Write one right answer and three wrong ones that sound plausible, all about the same length — learners see them in a fixed shuffled order, so it does not matter which box holds the right one.
        </p>
        <label className="mt-2 flex items-center gap-2 text-xs text-[var(--a-text-muted)]">
          <input type="checkbox" checked={!!q.fixedOrder} onChange={(e) => set({ fixedOrder: e.target.checked })} /> Keep the options in this order (for “All of the above” and similar)
        </label>
      </fieldset>

      <label className="block text-xs text-[var(--a-text-muted)]">
        Explanation (shown after the learner answers)
        <textarea className={`${INPUT} mt-1`} rows={2} value={q.explanation ?? ''} onChange={(e) => set({ explanation: e.target.value })} />
      </label>
    </div>
  );
}

export default function QuizEditor({ value, onChange, errors }: { value: DraftQuestion[]; onChange: (v: DraftQuestion[]) => void; errors: string[] }) {
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
      <p className="text-xs text-[var(--a-text-muted)]">Every question in a lesson quiz is multiple choice with four answer options — that is the only kind of question.</p>
      {general.map((e, i) => (
        <p key={i} className="text-xs text-[var(--a-danger)]" role="alert">{e}</p>
      ))}
      {value.length === 0 && <p className="text-sm text-[var(--a-text-faint)] italic">No quiz yet. Learners see a Knowledge Check only when there are questions.</p>}
      {value.map((q, i) => (
        <QuestionCard key={q.id + i} q={q} n={i + 1} total={value.length} errors={errorsFor(i + 1)} onChange={(nq) => onChange(value.map((x, k) => (k === i ? nq : x)))} onMove={(d) => move(i, d)} onRemove={() => onChange(value.filter((_, k) => k !== i))} />
      ))}
      <div>
        <button type="button" className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]" onClick={() => onChange([...value, blankQuestion(nextId())])}>+ Add multiple-choice question</button>
      </div>
    </div>
  );
}
