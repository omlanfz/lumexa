'use client';

// FILE PATH: client/components/admin/LcPracticalEditor.tsx
//
// Edits the practical project of a Little Coders assessment: the three things a student sees (project
// brief · blocks to find · build requirements), the prepared model / starter project (its address is
// added here — it is never invented), the optional bonus, what to hand in, and the marking rubric
// (always 25 marks). The server validates everything again; what an admin saves is kept exactly as
// written by every later release of the question bank.

import { useState } from 'react';
import api from '@/lib/axios';
import { Modal } from '@/components/admin/AdminUI';
import type { LcPracticalSpec } from '@/lib/littleCoders/types';

export interface PracticalForEdit {
  id: string;
  title: string;
  spec: LcPracticalSpec;
  rubric: { criterion: string; maxPoints: number; lookFor?: string }[] | null;
  variantKey?: string | null;
}

const INPUT = 'w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm a-focus';
const LABEL = 'block text-xs font-semibold text-[var(--a-text)] mb-1';
const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);

export default function LcPracticalEditor({ practical, onClose, onSaved }: { practical: PracticalForEdit; onClose: () => void; onSaved: () => void }) {
  const s = practical.spec;
  const [title, setTitle] = useState(practical.title);
  const [minutes, setMinutes] = useState(String(s.minutes));
  const [brief, setBrief] = useState(s.brief.join('\n'));
  const [requirements, setRequirements] = useState(s.requirements.join('\n'));
  const [bonus, setBonus] = useState(s.bonus.join('\n'));
  const [handIn, setHandIn] = useState(s.handIn);
  const [groups, setGroups] = useState(s.blocks.map((g) => ({ category: g.category, blocks: g.blocks.join('\n') })));
  const [starter, setStarter] = useState({ ...s.starter, modelLabels: s.starter.modelLabels.join(', ') });
  const [rubric, setRubric] = useState((practical.rubric ?? []).map((r) => ({ criterion: r.criterion, maxPoints: String(r.maxPoints), lookFor: r.lookFor ?? '' })));
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const total = rubric.reduce((sum, r) => sum + (Number(r.maxPoints) || 0), 0);

  async function save() {
    setBusy(true);
    setErrors([]);
    try {
      const spec: LcPracticalSpec = {
        ...s,
        minutes: Number(minutes) || s.minutes,
        brief: lines(brief),
        requirements: lines(requirements),
        bonus: lines(bonus),
        handIn: handIn.trim(),
        blocks: groups.map((g) => ({ category: g.category.trim(), blocks: lines(g.blocks) })).filter((g) => g.category || g.blocks.length),
        starter: {
          ...starter,
          kind: starter.kind,
          required: starter.kind !== 'NONE' && starter.required,
          modelLabels: starter.modelLabels.split(',').map((x) => x.trim()).filter(Boolean),
        },
      };
      await api.patch(`/assessments/practical-questions/${practical.id}`, {
        title: title.trim(),
        spec,
        rubric: rubric.map((r) => ({ criterion: r.criterion, maxPoints: Number(r.maxPoints), ...(r.lookFor.trim() ? { lookFor: r.lookFor.trim() } : {}) })),
      });
      onSaved();
    } catch (err) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setErrors(Array.isArray(m) ? m : [m ?? 'Could not save.']);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit practical project" onClose={onClose}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <p className="text-xs text-[var(--a-text-muted)]">
          Built in <strong>{s.platform === 'EDUBLOCKS' ? 'EduBlocks' : 'Stretch3'}</strong>
          {practical.variantKey ? ` · ${practical.variantKey === 'PYTHON' ? 'Python version' : 'Scratch / AI version'}` : ''}. Describe what the project must do — never how to build it.
        </p>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <label className="block">
            <span className={LABEL}>Project title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>Minutes</span>
            <input type="number" min={5} max={60} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={INPUT} />
          </label>
        </div>
        <label className="block">
          <span className={LABEL}>1 · Project brief (one paragraph per line, 2–5)</span>
          <textarea value={brief} rows={4} onChange={(e) => setBrief(e.target.value)} className={INPUT} />
        </label>

        <div>
          <span className={LABEL}>2 · Blocks you need to find (2–8 groups; one exact block name per line)</span>
          <div className="space-y-2">
            {groups.map((g, i) => (
              <div key={i} className="grid grid-cols-[9rem_1fr_auto] gap-2 items-start">
                <input value={g.category} placeholder="Category" onChange={(e) => setGroups(groups.map((x, k) => (k === i ? { ...x, category: e.target.value } : x)))} className={INPUT} aria-label={`Group ${i + 1} category`} />
                <textarea value={g.blocks} rows={2} placeholder="when green flag clicked" onChange={(e) => setGroups(groups.map((x, k) => (k === i ? { ...x, blocks: e.target.value } : x)))} className={`${INPUT} font-mono text-xs`} aria-label={`Group ${i + 1} blocks`} />
                <button type="button" onClick={() => setGroups(groups.filter((_, k) => k !== i))} className="text-xs text-[var(--a-danger)] hover:underline pt-2">
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setGroups([...groups, { category: '', blocks: '' }])} className="text-sm text-[var(--a-accent)] hover:underline">
              + Add a group
            </button>
          </div>
        </div>

        <label className="block">
          <span className={LABEL}>3 · Build requirements (one testable point per line, 4–10)</span>
          <textarea value={requirements} rows={6} onChange={(e) => setRequirements(e.target.value)} className={INPUT} />
        </label>

        <div className="rounded-lg border border-[var(--a-border)] p-3 space-y-2">
          <p className={LABEL}>Prepared model / starter project</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[11px] text-[var(--a-text-muted)] mb-0.5">Kind</span>
              <select value={starter.kind} onChange={(e) => setStarter({ ...starter, kind: e.target.value as LcPracticalSpec['starter']['kind'], required: e.target.value !== 'NONE' })} className={INPUT}>
                <option value="NONE">None — the student starts from an empty project</option>
                <option value="MODEL_URL">A prepared model (Teachable Machine link)</option>
                <option value="PROJECT_URL">A starter project</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] text-[var(--a-text-muted)] mb-0.5">Heading shown to the student</span>
              <input value={starter.label} onChange={(e) => setStarter({ ...starter, label: e.target.value })} className={INPUT} />
            </label>
          </div>
          {starter.kind !== 'NONE' && (
            <>
              <label className="block">
                <span className="block text-[11px] text-[var(--a-text-muted)] mb-0.5">Address (https://…) — leave empty until you have the real one</span>
                <input type="url" value={starter.url} onChange={(e) => setStarter({ ...starter, url: e.target.value })} className={INPUT} placeholder="https://…" />
              </label>
              <label className="block">
                <span className="block text-[11px] text-[var(--a-text-muted)] mb-0.5">Staff note (the student sees a standard message instead)</span>
                <input value={starter.note} onChange={(e) => setStarter({ ...starter, note: e.target.value })} className={INPUT} />
              </label>
              {starter.kind === 'MODEL_URL' && (
                <label className="block">
                  <span className="block text-[11px] text-[var(--a-text-muted)] mb-0.5">The labels the model must have (comma separated)</span>
                  <input value={starter.modelLabels} onChange={(e) => setStarter({ ...starter, modelLabels: e.target.value })} className={INPUT} />
                </label>
              )}
            </>
          )}
        </div>

        <label className="block">
          <span className={LABEL}>Bonus ideas (optional, never part of the marks — one per line)</span>
          <textarea value={bonus} rows={2} onChange={(e) => setBonus(e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>What to hand in</span>
          <input value={handIn} onChange={(e) => setHandIn(e.target.value)} className={INPUT} />
        </label>

        <div>
          <p className={LABEL}>
            Marking rubric <span className={`font-normal ${total === 25 ? 'text-[var(--a-success-text)]' : 'text-[var(--a-danger)]'}`}>— adds up to {total} (must be 25)</span>
          </p>
          <div className="space-y-2">
            {rubric.map((r, i) => (
              <div key={r.criterion} className="rounded-lg border border-[var(--a-border)] p-2">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm font-medium text-[var(--a-text)]">{r.criterion}</span>
                  <input type="number" min={0} max={25} value={r.maxPoints} aria-label={`Marks for ${r.criterion}`} onChange={(e) => setRubric(rubric.map((x, k) => (k === i ? { ...x, maxPoints: e.target.value } : x)))} className={`${INPUT} !w-20`} />
                </div>
                <textarea value={r.lookFor} rows={2} placeholder="What the teacher should look for…" onChange={(e) => setRubric(rubric.map((x, k) => (k === i ? { ...x, lookFor: e.target.value } : x)))} className={`${INPUT} mt-1.5 text-xs`} aria-label={`Marking guide for ${r.criterion}`} />
              </div>
            ))}
          </div>
        </div>

        {errors.length > 0 && (
          <ul role="alert" className="list-disc list-inside text-sm text-[var(--a-danger)]">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-3">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)]">
          Cancel
        </button>
        <button onClick={() => void save()} disabled={busy || total !== 25} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
