import type { ReactNode } from 'react';
import CopyCodeButton from './CopyCodeButton';

// A minimal, dependency-free Markdown renderer covering exactly what
// Lumexa's lesson material uses: #/##/### headings, **bold**, `inline code`,
// ```fenced code blocks```, "- " bullet lists, and GFM-style `| a | b |`
// tables. Not a general-purpose Markdown engine — keeps the client bundle
// free of a new dependency for a small, well-known content shape.

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
      const codeText = codeLines.join('\n');
      blocks.push(
        <div key={`code-${i}`} className="my-3 rounded-lg bg-gray-900 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-black/30 border-b border-gray-700/70">
            <span className="text-[10px] uppercase tracking-wide text-gray-400">{lang || 'code'}</span>
            <CopyCodeButton code={codeText} />
          </div>
          <pre className="text-gray-100 p-3 overflow-x-auto text-sm">
            <code>{codeText}</code>
          </pre>
        </div>,
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
    } else if (
      /^\|.*\|\s*$/.test(line.trim()) &&
      i + 1 < lines.length &&
      /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1].trim())
    ) {
      // GFM table: header row, then a "|---|---|" separator, then data rows.
      flushList(`list-${i}`);
      const parseRow = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim());
      const header = parseRow(line);
      const tableKey = i;
      i += 2; // header + separator
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i].trim())) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={`table-${tableKey}`} className="my-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                {header.map((h, hi) => (
                  <th
                    key={hi}
                    className="text-left font-semibold text-gray-900 dark:text-white px-3 py-2 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                  >
                    {renderInline(h, `th-${tableKey}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900/40 dark:even:bg-gray-800/40">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 align-top text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800/60"
                    >
                      {renderInline(cell, `td-${tableKey}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
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
