import type { ReactNode } from 'react';

// A minimal, dependency-free Markdown renderer covering exactly what
// Lumexa's lesson material uses: #/##/### headings, **bold**, `inline code`,
// ```fenced code blocks```, and "- " bullet lists. Not a general-purpose
// Markdown engine — keeps the client bundle free of a new dependency for a
// small, well-known content shape.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) parts.push(<strong key={`${keyPrefix}-b${i}`}>{m[2]}</strong>);
    else if (m[3] !== undefined)
      parts.push(
        <code key={`${keyPrefix}-c${i}`} className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 text-[0.9em]">
          {m[3]}
        </code>,
      );
    last = regex.lastIndex;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let listBuffer: string[] = [];

  function flushList(key: string) {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc list-inside space-y-1 my-2 text-gray-700 dark:text-gray-300">
        {listBuffer.map((item, idx) => (
          <li key={idx}>{renderInline(item, `${key}-${idx}`)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      flushList(`list-${i}`);
      blocks.push(
        <pre key={`code-${i}`} className="my-3 rounded-lg bg-gray-900 text-gray-100 p-3 overflow-x-auto text-sm">
          {lang && <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{lang}</div>}
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    if (/^###\s+/.test(line)) {
      flushList(`list-${i}`);
      blocks.push(
        <h4 key={i} className="font-semibold text-gray-900 dark:text-white mt-3 mb-1">
          {renderInline(line.replace(/^###\s+/, ''), `h4-${i}`)}
        </h4>,
      );
    } else if (/^##\s+/.test(line)) {
      flushList(`list-${i}`);
      blocks.push(
        <h3 key={i} className="font-bold text-lg text-gray-900 dark:text-white mt-4 mb-2">
          {renderInline(line.replace(/^##\s+/, ''), `h3-${i}`)}
        </h3>,
      );
    } else if (/^#\s+/.test(line)) {
      flushList(`list-${i}`);
      blocks.push(
        <h2 key={i} className="font-extrabold text-xl text-gray-900 dark:text-white mt-4 mb-2">
          {renderInline(line.replace(/^#\s+/, ''), `h2-${i}`)}
        </h2>,
      );
    } else if (/^[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^[-*]\s+/, ''));
    } else if (line.trim() === '') {
      flushList(`list-${i}`);
    } else if (/^\|.*\|$/.test(line.trim())) {
      // skip markdown table separator/rows: render as plain text row for simplicity
      flushList(`list-${i}`);
      blocks.push(
        <p key={i} className="text-sm font-mono text-gray-600 dark:text-gray-400">
          {line}
        </p>,
      );
    } else {
      flushList(`list-${i}`);
      blocks.push(
        <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed my-2">
          {renderInline(line, `p-${i}`)}
        </p>,
      );
    }
    i++;
  }
  flushList('list-end');

  return <div>{blocks}</div>;
}
