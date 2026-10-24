'use client';

// Renders a question's text: plain prose, `inline code`, and fenced code blocks.
// Deliberately NOT a general markdown renderer — test questions only ever use
// those three things, and everything is rendered as React text (no HTML
// injection), so question content can never execute anything.

import { parseQuestionText } from '@/lib/assessment/progress';

export default function QuestionText({ text, className = '' }: { text: string; className?: string }) {
  const segments = parseQuestionText(text);
  return (
    <div className={`whitespace-pre-wrap break-words leading-relaxed ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'block') {
          return (
            <pre
              key={i}
              className="my-2 overflow-x-auto rounded-lg border border-[var(--ar-border)] bg-black/80 p-3 text-[13px] leading-snug text-gray-100"
            >
              <code>{seg.value}</code>
            </pre>
          );
        }
        if (seg.type === 'inline') {
          return (
            <code key={i} className="rounded bg-[var(--ar-surface-2)] px-1 py-0.5 font-mono text-[0.9em]">
              {seg.value}
            </code>
          );
        }
        return <span key={i}>{seg.value}</span>;
      })}
    </div>
  );
}

/** An answer option: inline `code` is styled, line breaks are kept (multi-line
 *  program output is a common answer), and it stays inline so it can sit
 *  inside a sentence. */
export function OptionText({ text, className = '' }: { text: string; className?: string }) {
  const segments = parseQuestionText(text);
  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <code key={i} className="rounded bg-[var(--ar-surface-2)] px-1 py-0.5 font-mono text-[0.9em]">
            {seg.value}
          </code>
        ),
      )}
    </span>
  );
}
