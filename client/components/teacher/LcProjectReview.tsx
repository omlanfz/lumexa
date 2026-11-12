'use client';

// FILE PATH: client/components/teacher/LcProjectReview.tsx
//
// What the teacher reviews for a Little Coders practical: the project the student was given (brief,
// blocks, requirements), then what they handed in — links, a note and project files. Files open or
// download through short-lived links; opening or previewing never changes or removes anything. They stay
// available while the review is pending and are removed from storage once the teacher approves the report
// (the marks, feedback, links and file names are kept).

import { useState } from 'react';
import { Download, ExternalLink, Eye, Loader2 } from 'lucide-react';
import { blockColor } from '@/lib/littleCoders/blockLines';
import { errorMessage, formatFileSize, openHomeworkFile } from '@/lib/homeworkFiles';
import type { ReportLc } from '@/lib/assessment/types';

export default function LcProjectReview({ lc, finalised }: { lc: ReportLc; finalised: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const spec = lc.spec;
  const language = spec?.platform === 'EDUBLOCKS' ? 'edublocks' : 'scratch';
  const nothing = lc.links.length === 0 && lc.files.length === 0;

  const open = async (id: string, kind: ReportLc['files'][number]['kind'], name: string, mode: 'open' | 'download') => {
    setBusy(`${id}:${mode}`);
    setError(null);
    try {
      // "Download" always saves the file; "Open" shows code in the viewer and PDFs / images in the browser.
      await openHomeworkFile({ id, name, kind: mode === 'download' ? 'DOWNLOAD' : kind }, { scope: 'assessment' });
    } catch (err) {
      setError(errorMessage(err, 'This file could not be opened right now.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="lc-project-review">
      {spec && (
        <details className="rounded-xl border border-[var(--t-border)] p-3 text-sm">
          <summary className="cursor-pointer font-medium text-[var(--t-text)]">The project the student was given</summary>
          <div className="mt-3 space-y-3 text-xs text-[var(--t-text-muted)]">
            <div>
              <p className="mb-1 font-semibold text-[var(--t-text)]">Project brief</p>
              {spec.brief.map((b, i) => (
                <p key={i}>{b}</p>
              ))}
            </div>
            <div>
              <p className="mb-1 font-semibold text-[var(--t-text)]">Blocks to find</p>
              <div className="space-y-1.5">
                {spec.blocks.map((g) => {
                  const c = blockColor(language, g.category.toLowerCase().replace(/[^a-z0-9]/g, ''));
                  return (
                    <div key={g.category} className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.fill }} aria-hidden="true" />
                      <span className="font-semibold text-[var(--t-text)]">{g.category}:</span>
                      {g.blocks.map((b) => (
                        <code key={b} className="rounded bg-[var(--t-surface-2)] px-1.5 py-0.5 font-mono text-[11px]">
                          {b}
                        </code>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1 font-semibold text-[var(--t-text)]">Build requirements</p>
              <ol className="list-inside list-decimal space-y-0.5">
                {spec.requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>
            {spec.starter.required && (
              <p>
                <span className="font-semibold text-[var(--t-text)]">Prepared {spec.starter.kind === 'MODEL_URL' ? 'model' : 'starter'}:</span> {spec.starter.url ? <a href={spec.starter.url} target="_blank" rel="noopener noreferrer" className="text-[var(--t-accent)] underline">{spec.starter.url}</a> : 'no link was added by an admin'}
              </p>
            )}
          </div>
        </details>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--t-text)]">What the student handed in</p>
        {nothing && <p className="rounded-lg border border-dashed border-[var(--t-border)] px-3 py-2 text-sm text-[var(--t-warning)]">Nothing was handed in — no link and no file.</p>}

        {lc.links.length > 0 && (
          <ul className="mb-3 space-y-1.5" aria-label="Project links">
            {lc.links.map((l) => (
              <li key={l} className="flex items-center gap-2 rounded-lg border border-[var(--t-border)] bg-[var(--t-surface-2)] px-3 py-2 text-sm">
                <ExternalLink size={14} className="flex-shrink-0 text-[var(--t-text-muted)]" aria-hidden="true" />
                <a href={l} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[var(--t-accent)] underline" title={l}>
                  {l}
                </a>
                <span className="sr-only"> (opens in a new tab)</span>
              </li>
            ))}
          </ul>
        )}

        {lc.note && (
          <p className="mb-3 whitespace-pre-wrap rounded-lg border border-[var(--t-border)] bg-[var(--t-surface-2)] px-3 py-2 text-sm text-[var(--t-text)]">
            <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--t-text-muted)]">Note from the student</span>
            {lc.note}
          </p>
        )}

        {lc.files.length > 0 && (
          <ul className="space-y-1.5" aria-label="Project files">
            {lc.files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--t-border)] bg-[var(--t-surface-2)] px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--t-text)]" title={f.name}>
                  {f.name}
                </span>
                <span className="text-xs text-[var(--t-text-muted)]">{formatFileSize(f.size)}</span>
                {f.removed ? (
                  <span className="rounded-full border border-[var(--t-border)] px-2 py-0.5 text-xs text-[var(--t-text-muted)]">removed after marking</span>
                ) : (
                  <span className="inline-flex gap-1.5">
                    {(f.kind === 'SOURCE' || f.kind === 'NOTEBOOK' || f.kind === 'PDF' || f.kind === 'IMAGE') && (
                      <button type="button" onClick={() => void open(f.id, f.kind, f.name, 'open')} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-lg border border-[var(--t-border-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--t-text)] hover:bg-[var(--t-nav-hover)] disabled:opacity-60">
                        {busy === `${f.id}:open` ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Open
                      </button>
                    )}
                    <button type="button" onClick={() => void open(f.id, f.kind, f.name, 'download')} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-lg border border-[var(--t-border-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--t-text)] hover:bg-[var(--t-nav-hover)] disabled:opacity-60">
                      {busy === `${f.id}:download` ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-[var(--t-danger)]">
            {error}
          </p>
        )}

        {lc.files.length > 0 && (
          <p className="mt-2 text-[11px] text-[var(--t-text-muted)]">
            {lc.filesRemoved || finalised
              ? 'The project files were removed from storage when this review was finalised. The marks, feedback, links and file names are kept.'
              : 'The files stay available here while you mark. When you approve the report they are removed from storage — your marks, feedback, the links and the file names are kept. Opening or downloading a file never removes it.'}
          </p>
        )}
      </div>
    </div>
  );
}
