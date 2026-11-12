'use client';

// FILE PATH: client/components/assessment/LcPracticalCard.tsx
//
// "03 · Build It!" — the practical project of a Little Coders assessment, as the student sees it:
//
//   left   Project brief · Blocks you need to find · Build requirements (· the prepared model, when
//          the project needs one) · how it is marked. Describes what to build — never how.
//   right  Start Coding (Stretch3 or EduBlocks, opened in a new tab) and "Hand in your project":
//          project links, an optional note, and project files (.sb3, .py, screenshots …).
//
// Links and the note autosave; files upload as soon as they are chosen and can be taken back until
// the test is submitted. The files live in private storage until the teacher has finished marking.

import { useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, FileUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { blockColor } from '@/lib/littleCoders/blockLines';
import { PROJECT_EXTENSIONS, isHttps } from '@/lib/assessment/lcPractical';
import { formatFileSize } from '@/lib/homeworkFiles';
import type { LcAssessmentFile } from '@/lib/littleCoders/types';
import type { CodingProject, PracticalLc } from '@/lib/assessment/types';

export interface PracticalCardProps {
  project: CodingProject;
  lc: PracticalLc;
  links: string[];
  note: string;
  files: LcAssessmentFile[];
  /** A batch of files is on its way (name list + percent), or null. */
  uploading: { names: string[]; percent: number } | null;
  uploadError: string | null;
  save: 'idle' | 'saving' | 'saved' | 'error';
  onLinks: (links: string[]) => void;
  onNote: (note: string) => void;
  onUpload: (files: File[]) => void;
  onRemove: (fileId: string) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

const PANEL = 'rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:p-5';
const H = 'mb-2 flex items-center gap-2 text-sm font-bold text-[var(--ar-text)]';

export default function LcPracticalCard(props: PracticalCardProps) {
  const { project, lc, links, note, files: handedIn, uploading, uploadError, save, onLinks, onNote, onUpload, onRemove, headingRef } = props;
  const spec = lc.spec;
  const [ticks, setTicks] = useState<boolean[]>([]);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const language = spec?.platform === 'EDUBLOCKS' ? 'edublocks' : 'scratch';
  const room = Math.max(0, lc.limits.maxFiles - handedIn.filter((f) => !f.removed).length);

  const choose = (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []);
    if (files.length) onUpload(files);
    if (input.current) input.current.value = '';
  };

  return (
    <section className="grid flex-1 gap-4 @4xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @4xl:items-start" aria-labelledby="code-heading" data-testid="coding-card">
      {/* ── What to build ─────────────────────────────────────────────────── */}
      <div className="space-y-3 @4xl:sticky @4xl:top-[5.25rem] @4xl:max-h-[calc(100dvh-6.5rem)] @4xl:overflow-y-auto">
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-teal-500 p-4 text-white @4xl:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">03 · Build It! · {spec?.minutes ?? 20} minutes · {project.maxScore} marks</p>
          <h2 id="code-heading" ref={headingRef} tabIndex={-1} className="mt-0.5 text-lg font-extrabold leading-tight outline-none">
            💻 {project.title}
          </h2>
        </div>

        {spec ? (
          <>
            <div className={PANEL}>
              <h3 className={H}>
                <span aria-hidden="true">📋</span> Project brief
              </h3>
              <div className="space-y-2 text-sm text-[var(--ar-text)]">
                {spec.brief.map((b, i) => (
                  <p key={i}>{b}</p>
                ))}
              </div>
            </div>

            <div className={PANEL}>
              <h3 className={H}>
                <span aria-hidden="true">🧱</span> Blocks you need to find
              </h3>
              <div className="space-y-2.5">
                {spec.blocks.map((g) => {
                  const c = blockColor(language, g.category.toLowerCase().replace(/[^a-z0-9]/g, ''));
                  return (
                    <div key={g.category}>
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--ar-muted)]">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ background: c.fill }} aria-hidden="true" /> {g.category}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.blocks.map((b) => (
                          <span key={b} className="rounded-md px-2 py-1 font-mono text-xs font-semibold text-white" style={{ background: c.fill, boxShadow: `inset 0 -2px 0 ${c.edge}` }}>
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={PANEL}>
              <h3 className={H}>
                <span aria-hidden="true">✅</span> Build requirements
              </h3>
              <ul className="space-y-1.5">
                {spec.requirements.map((r, i) => (
                  <li key={i}>
                    <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--ar-text)]">
                      <input
                        type="checkbox"
                        checked={ticks[i] ?? false}
                        onChange={() => setTicks((t) => Array.from({ length: spec.requirements.length }, (_, j) => (j === i ? !t[j] : (t[j] ?? false))))}
                        className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--ar-accent)]"
                      />
                      <span className={ticks[i] ? 'opacity-60' : ''}>{r}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-[var(--ar-faint)]">Tick them off as you test your project. These ticks are only for you.</p>
            </div>

            {spec.starter.required && (
              <div className={PANEL}>
                <h3 className={H}>
                  <span aria-hidden="true">🧠</span> {spec.starter.label || 'Prepared starter'}
                </h3>
                <p className="text-sm text-[var(--ar-text)]">{spec.starter.note}</p>
                {spec.starter.modelLabels.length > 0 && (
                  <p className="mt-1.5 text-xs text-[var(--ar-muted)]">
                    The model has these labels: <strong className="text-[var(--ar-text)]">{spec.starter.modelLabels.join(' · ')}</strong>
                  </p>
                )}
                {spec.starter.url ? (
                  <a href={spec.starter.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-600 px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
                    <ExternalLink size={14} aria-hidden="true" /> Open the prepared {spec.starter.kind === 'MODEL_URL' ? 'model' : 'project'}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <p className="mt-2 inline-block rounded-lg border border-dashed border-[var(--ar-border-strong)] px-3 py-1.5 text-xs text-[var(--ar-muted)]">The link has not been shared yet.</p>
                )}
              </div>
            )}

            {spec.bonus.length > 0 && (
              <details className={PANEL}>
                <summary className="cursor-pointer select-none text-sm font-bold text-[var(--ar-text)]">🚀 Bonus ideas (optional — not marked)</summary>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--ar-text)]">
                  {spec.bonus.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <div className={PANEL}>
            <p className="text-sm text-[var(--ar-text)]">{project.instructions}</p>
          </div>
        )}

        {project.rubric.length > 0 && (
          <div className="rounded-xl border border-[var(--ar-border)] bg-[var(--ar-bg)] p-3">
            <p className="mb-1 text-xs font-semibold text-[var(--ar-text)]">How it will be marked · {project.maxScore} marks</p>
            <ul className="space-y-0.5 text-xs text-[var(--ar-muted)]">
              {project.rubric.map((r) => (
                <li key={r.criterion} className="flex justify-between gap-3">
                  <span>{r.criterion}</span>
                  <span className="tabular-nums">{r.maxPoints}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Build it and hand it in ───────────────────────────────────────── */}
      <div className="space-y-3">
        <div className={PANEL}>
          <h3 className={H}>
            <span aria-hidden="true">🛠️</span> Build it
          </h3>
          {lc.platform && lc.platform.isActive && lc.platform.startUrl ? (
            <a href={lc.platform.startUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-teal-400">
              <ExternalLink size={15} aria-hidden="true" /> Start Coding in {lc.platform.name}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <p className="rounded-lg border border-dashed border-[var(--ar-border-strong)] px-3 py-2 text-sm text-[var(--ar-muted)]">The coding tool is not available right now — ask your teacher.</p>
          )}
          <p className="mt-2 text-xs text-[var(--ar-faint)]">It opens in a new tab. Come back to this tab to hand in your project. Your teacher marks it — it is not run automatically.</p>
        </div>

        <div className={PANEL}>
          <h3 className={H}>
            <span aria-hidden="true">📤</span> Hand in your project
          </h3>
          {spec?.handIn && <p className="mb-3 text-sm text-[var(--ar-text)]">{spec.handIn}</p>}

          {/* Links */}
          <fieldset className="mb-4">
            <legend className="mb-1 text-xs font-semibold text-[var(--ar-muted)]">Project links (https://…)</legend>
            <div className="space-y-1.5">
              {(links.length ? links : ['']).map((link, i) => {
                const bad = link.trim() !== '' && !isHttps(link.trim());
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      type="url"
                      inputMode="url"
                      value={link}
                      maxLength={500}
                      placeholder="https://scratch.mit.edu/projects/…"
                      aria-label={`Project link ${i + 1}`}
                      aria-invalid={bad}
                      onChange={(e) => onLinks((links.length ? links : ['']).map((l, j) => (j === i ? e.target.value : l)))}
                      className={`min-w-0 flex-1 rounded-lg border bg-[var(--ar-bg)] px-3 py-2 text-sm text-[var(--ar-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ar-accent)] ${bad ? 'border-[var(--ar-danger)]' : 'border-[var(--ar-border-strong)]'}`}
                    />
                    {links.length > 1 && (
                      <button type="button" aria-label={`Remove link ${i + 1}`} onClick={() => onLinks(links.filter((_, j) => j !== i))} className="rounded-lg p-2 text-[var(--ar-muted)] hover:bg-[var(--ar-surface-2)]">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {links.some((l) => l.trim() !== '' && !isHttps(l.trim())) && (
              <p className="mt-1 flex items-center gap-1 text-xs text-[var(--ar-danger)]" role="alert">
                <AlertTriangle size={12} /> Only full links that start with https:// can be handed in.
              </p>
            )}
            {links.length < lc.limits.maxLinks && (
              <button type="button" onClick={() => onLinks([...(links.length ? links : ['']), ''])} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ar-accent)] hover:underline">
                <Plus size={13} /> Add another link
              </button>
            )}
          </fieldset>

          {/* Files */}
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-[var(--ar-muted)]">
              Project files <span className="font-normal">— up to {lc.limits.maxFiles} files, {lc.limits.maxFileMb} MB each (.sb3, .py, screenshots …)</span>
            </p>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                choose(e.dataTransfer.files);
              }}
              className={`rounded-xl border-2 border-dashed px-3 py-4 text-center ${dragging ? 'border-[var(--ar-accent)] bg-[var(--ar-accent-soft)]' : 'border-[var(--ar-border-strong)] bg-[var(--ar-bg)]'}`}
            >
              <FileUp size={20} className="mx-auto text-[var(--ar-faint)]" aria-hidden="true" />
              <p className="mt-1 text-xs text-[var(--ar-muted)]">Drag files here, or</p>
              <button
                type="button"
                disabled={room === 0 || !!uploading}
                onClick={() => input.current?.click()}
                className="mt-1.5 rounded-lg border border-[var(--ar-border-strong)] bg-[var(--ar-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--ar-text)] hover:bg-[var(--ar-surface-2)] disabled:opacity-50"
              >
                Choose files
              </button>
              <input
                ref={input}
                type="file"
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose project files"
                accept={PROJECT_EXTENSIONS.map((e) => `.${e}`).join(',')}
                onChange={(e) => choose(e.target.files)}
              />
              {room === 0 && <p className="mt-1.5 text-[11px] text-[var(--ar-faint)]">You have added the most files you can. Remove one to add another.</p>}
            </div>

            {uploading && (
              <div className="mt-2" role="status">
                <p className="mb-1 flex items-center gap-1.5 text-xs text-[var(--ar-muted)]">
                  <Loader2 size={13} className="animate-spin" /> Uploading {uploading.names.join(', ')}…
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ar-surface-2)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploading.percent}>
                  <div className="h-full rounded-full bg-[var(--ar-accent)]" style={{ width: `${uploading.percent}%`, transitionProperty: 'width' }} />
                </div>
              </div>
            )}
            {uploadError && (
              <p role="alert" className="mt-2 flex items-start gap-1.5 rounded-lg border border-[var(--ar-danger)]/40 bg-[var(--ar-danger)]/10 px-3 py-2 text-xs text-[var(--ar-text)]">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-[var(--ar-danger)]" /> {uploadError}
              </p>
            )}

            {handedIn.filter((f) => !f.removed).length > 0 && (
              <ul className="mt-2 space-y-1.5" aria-label="Files you have uploaded">
                {handedIn
                  .filter((f) => !f.removed)
                  .map((f) => (
                    <li key={f.id} className="flex items-center gap-2 rounded-lg border border-[var(--ar-border)] bg-[var(--ar-bg)] px-3 py-2 text-sm">
                      <span aria-hidden="true">{f.kind === 'IMAGE' ? '🖼️' : f.kind === 'PDF' ? '📄' : f.kind === 'SOURCE' ? '🐍' : '🧩'}</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-[var(--ar-text)]" title={f.name}>
                        {f.name}
                      </span>
                      <span className="flex-shrink-0 text-xs text-[var(--ar-faint)]">{formatFileSize(f.size)}</span>
                      <span className="flex-shrink-0 text-xs font-semibold text-[var(--ar-success)]">✓ uploaded</span>
                      <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemove(f.id)} className="flex-shrink-0 rounded-md p-1 text-[var(--ar-muted)] hover:bg-[var(--ar-surface-2)]">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Note */}
          <div>
            <label htmlFor="project-note" className="mb-1 block text-xs font-semibold text-[var(--ar-muted)]">
              A note for your teacher <span className="font-normal">(optional)</span>
            </label>
            <textarea
              id="project-note"
              value={note}
              maxLength={lc.limits.maxNote}
              rows={3}
              onChange={(e) => onNote(e.target.value)}
              placeholder="Tell your teacher anything about your project…"
              className="w-full rounded-lg border border-[var(--ar-border-strong)] bg-[var(--ar-bg)] px-3 py-2 text-sm text-[var(--ar-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ar-accent)]"
            />
          </div>

          <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ar-faint)]">
            <span>Your links and note save by themselves. Files are kept safely until your teacher finishes marking.</span>
            <span>
              {save === 'saving' && 'Saving…'}
              {save === 'saved' && '✓ Saved'}
              {save === 'error' && <span className="text-[var(--ar-danger)]">Not saved yet — retrying…</span>}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
