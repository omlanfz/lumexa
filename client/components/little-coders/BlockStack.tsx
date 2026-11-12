'use client';

// FILE PATH: client/components/little-coders/BlockStack.tsx
//
// Draws a script the way the real tool shows it. A Scratch / Stretch3 script is drawn as Scratch
// blocks (colour per palette, rounded slots, C-shaped loops); an EduBlocks script is drawn as the
// coloured blocks EduBlocks uses, and can be switched to the Python those blocks write. The lines
// were checked against the real block names when the lesson was saved, so nothing here is invented.
//
// A line with a note is clickable: tapping a block explains it in one sentence.

import { useMemo, useState } from 'react';
import {
  blockColor,
  buildBlockTree,
  categoryLabel,
  isHat,
  plainBlockText,
  segmentsOf,
  toPythonSource,
  type BlockNode,
  type Segment,
} from '@/lib/littleCoders/blockLines';
import type { LcBlockLanguage } from '@/lib/littleCoders/types';

export interface BlockStackProps {
  lines: string[];
  language: LcBlockLanguage;
  title?: string;
  intro?: string;
  /** The sprite (or Stage) this script belongs to. */
  sprite?: string;
  /** 1-based line number (as text) → one-sentence explanation. */
  notes?: Record<string, string>;
  /** The line to highlight (the step a demo is on). */
  highlightLine?: number;
  /** Blocks only: no "Python" switch (an assessment question must not show more than it asks). */
  plain?: boolean;
  className?: string;
}

const BOOL_CLIP = 'polygon(9px 0, calc(100% - 9px) 0, 100% 50%, calc(100% - 9px) 100%, 9px 100%, 0 50%)';

function Slots({ segs, depth = 0 }: { segs: Segment[]; depth?: number }) {
  return (
    <>
      {segs.map((s, i) => {
        if (s.kind === 'text') return <span key={i}>{s.text}</span>;
        if (s.kind === 'string') {
          return (
            <span key={i} className="mx-0.5 inline-block rounded-md bg-white px-1.5 py-px font-semibold text-gray-800">
              {s.inner}
            </span>
          );
        }
        if (s.kind === 'round') {
          return (
            <span key={i} className="mx-0.5 inline-flex items-center rounded-full bg-white px-2 py-px font-semibold text-gray-800">
              {s.parts ? <Slots segs={s.parts} depth={depth + 1} /> : s.inner}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="mx-0.5 inline-flex items-center bg-white px-3 py-px font-semibold text-gray-800"
            style={{ clipPath: BOOL_CLIP }}
          >
            <Slots segs={s.parts} depth={depth + 1} />
          </span>
        );
      })}
    </>
  );
}

interface NodeProps {
  node: BlockNode;
  language: LcBlockLanguage;
  onPick: (line: number) => void;
  picked: number | null;
  noted: Set<number>;
  highlight?: number;
}

function ScratchNode({ node, language, onPick, picked, noted, highlight }: NodeProps) {
  const c = blockColor(language, node.category);
  const hat = isHat(node.category, node.text);
  const hasBody = node.children.length > 0 || node.elseChildren !== undefined || /^(forever|repeat\b|if\b|repeat until)/.test(node.text);
  const isOn = highlight === node.line;
  const clickable = noted.has(node.line);
  const bar = (line: number, content: React.ReactNode, extra = '') => (
    <div
      role={clickable && line === node.line ? 'button' : undefined}
      tabIndex={clickable && line === node.line ? 0 : undefined}
      onClick={clickable && line === node.line ? () => onPick(line) : undefined}
      onKeyDown={
        clickable && line === node.line
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick(line);
              }
            }
          : undefined
      }
      className={`flex min-h-8 flex-wrap items-center gap-x-1 gap-y-0.5 px-3 py-1 text-[13px] font-semibold leading-snug text-white ${extra} ${clickable && line === node.line ? 'cursor-pointer' : ''} ${
        (picked === line || highlight === line) ? 'ring-2 ring-white/90 ring-offset-1 ring-offset-transparent' : ''
      }`}
      style={{ background: c.fill, boxShadow: `inset 0 -2px 0 ${c.edge}` }}
      aria-label={plainBlockText(node.text)}
    >
      {content}
      {clickable && line === node.line && <span aria-hidden="true" className="ml-auto rounded-full bg-white/85 px-1.5 text-[10px] font-bold text-gray-700">i</span>}
    </div>
  );
  const segs = segmentsOf(node.text);

  if (!hasBody) {
    return <div className={`${hat ? 'mt-1 rounded-t-[22px] rounded-br-md rounded-bl-md pt-1.5' : 'rounded-md'} overflow-hidden ${isOn ? 'drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]' : ''}`}>{bar(node.line, <Slots segs={segs} />)}</div>;
  }
  return (
    <div className={`overflow-hidden rounded-md ${isOn ? 'drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]' : ''}`} style={{ background: c.fill }}>
      {bar(node.line, <Slots segs={segs} />, 'rounded-t-md')}
      <div className="ml-3 space-y-px border-l-0 bg-black/[0.07] py-px pl-px dark:bg-black/20">
        {node.children.map((ch) => (
          <ScratchNode key={ch.line} node={ch} language={language} onPick={onPick} picked={picked} noted={noted} highlight={highlight} />
        ))}
      </div>
      {node.elseChildren !== undefined && (
        <>
          {bar(node.elseLine ?? node.line, <span>else</span>)}
          <div className="ml-3 space-y-px bg-black/[0.07] py-px pl-px dark:bg-black/20">
            {node.elseChildren.map((ch) => (
              <ScratchNode key={ch.line} node={ch} language={language} onPick={onPick} picked={picked} noted={noted} highlight={highlight} />
            ))}
          </div>
        </>
      )}
      <div className="h-2.5" style={{ background: c.fill, boxShadow: `inset 0 -2px 0 ${c.edge}` }} />
    </div>
  );
}

function PythonNode({ node, language, onPick, picked, noted, highlight }: NodeProps) {
  const c = blockColor(language, node.category);
  const isHeader = node.children.length > 0 || node.elseChildren !== undefined || /:$/.test(node.text);
  const clickable = noted.has(node.line);
  const isOn = highlight === node.line;
  const row = (line: number, text: string, label: string | null) => (
    <div
      role={clickable && line === node.line ? 'button' : undefined}
      tabIndex={clickable && line === node.line ? 0 : undefined}
      onClick={clickable && line === node.line ? () => onPick(line) : undefined}
      onKeyDown={
        clickable && line === node.line
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick(line);
              }
            }
          : undefined
      }
      className={`flex items-center gap-2 rounded-md px-2.5 py-1 font-mono text-[13px] font-semibold leading-snug text-white ${clickable && line === node.line ? 'cursor-pointer' : ''} ${
        (picked === line || highlight === line) ? 'ring-2 ring-white/90' : ''
      } ${isOn ? 'drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]' : ''}`}
      style={{ background: c.fill, boxShadow: `inset 0 -2px 0 ${c.edge}` }}
    >
      {label && <span className="rounded bg-black/20 px-1 text-[10px] font-bold uppercase tracking-wide">{label}</span>}
      <span className="min-w-0 break-words">{text}</span>
      {clickable && line === node.line && <span aria-hidden="true" className="ml-auto rounded-full bg-white/85 px-1.5 font-sans text-[10px] font-bold text-gray-700">i</span>}
    </div>
  );
  return (
    <div className="space-y-px">
      {row(node.line, node.text, language === 'edublocks' && node.top ? categoryLabel(node.category) : null)}
      {isHeader && (
        <div className="ml-3 space-y-px border-l-4 pl-1.5" style={{ borderColor: c.fill }}>
          {node.children.map((ch) => (
            <PythonNode key={ch.line} node={ch} language={language} onPick={onPick} picked={picked} noted={noted} highlight={highlight} />
          ))}
        </div>
      )}
      {node.elseChildren !== undefined && (
        <>
          {row(node.elseLine ?? node.line, 'else:', null)}
          <div className="ml-3 space-y-px border-l-4 pl-1.5" style={{ borderColor: c.fill }}>
            {node.elseChildren.map((ch) => (
              <PythonNode key={ch.line} node={ch} language={language} onPick={onPick} picked={picked} noted={noted} highlight={highlight} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function BlockStack({ lines, language, title, intro, sprite, notes, highlightLine, plain = false, className = '' }: BlockStackProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [asPython, setAsPython] = useState(false);
  const tree = useMemo(() => buildBlockTree(lines), [lines]);
  const noted = useMemo(() => new Set(Object.keys(notes ?? {}).map(Number)), [notes]);
  const note = picked !== null ? notes?.[String(picked)] : null;
  const python = language === 'edublocks';
  const showSwitch = python && !plain;

  return (
    <figure className={`rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/60 ${className}`}>
      {(title || sprite || showSwitch) && (
        <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {title}
            {sprite && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">🎭 {sprite}</span>}
          </span>
          {showSwitch && (
            <span className="inline-flex overflow-hidden rounded-lg border border-gray-300 text-xs font-semibold dark:border-gray-600" role="group" aria-label="Show blocks or Python">
              <button type="button" aria-pressed={!asPython} onClick={() => setAsPython(false)} className={`px-2.5 py-1 ${!asPython ? 'bg-violet-600 text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                Blocks
              </button>
              <button type="button" aria-pressed={asPython} onClick={() => setAsPython(true)} className={`px-2.5 py-1 ${asPython ? 'bg-violet-600 text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                Python
              </button>
            </span>
          )}
        </figcaption>
      )}
      {intro && <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">{intro}</p>}
      {python && asPython ? (
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 font-mono text-[13px] leading-relaxed text-gray-100" aria-label="The Python these blocks write">
          {toPythonSource(lines)}
        </pre>
      ) : (
        <div className="space-y-1 overflow-x-auto pb-1" role="group" aria-label={title ? `Blocks: ${title}` : 'Blocks'}>
          {tree.map((n) =>
            python ? (
              <PythonNode key={n.line} node={n} language={language} onPick={setPicked} picked={picked} noted={noted} highlight={highlightLine} />
            ) : (
              <ScratchNode key={n.line} node={n} language={language} onPick={setPicked} picked={picked} noted={noted} highlight={highlightLine} />
            ),
          )}
        </div>
      )}
      {noted.size > 0 && !asPython && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
          {note ? <span className="rounded-lg bg-amber-50 px-2 py-1 text-sm font-medium text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">💡 {note}</span> : 'Tap a block with an “i” to see what it does.'}
        </p>
      )}
    </figure>
  );
}
