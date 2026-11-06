// FILE PATH: server/src/curriculum/lesson-content/markdown.ts
//
// Fence-aware Markdown structure helpers. The lesson cleanup never parses
// Markdown into a tree and re-serialises it (that would reformat content it has
// no business touching); it only locates line ranges — headings, sections, list
// items — and cuts or rewrites specific ranges. Everything outside a cut is kept
// byte-for-byte.

export interface MdHeading {
  /** Zero-based line index. */
  line: number;
  level: number;
  /** Heading text without the leading #'s / trailing #'s. */
  text: string;
}

export interface LineRange {
  /** Inclusive start line. */
  start: number;
  /** Exclusive end line. */
  end: number;
}

export function toLines(md: string): string[] {
  return md.replace(/\r\n?/g, '\n').split('\n');
}

export function isBlank(line: string | undefined): boolean {
  return line === undefined || line.trim() === '';
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/**
 * True for every line that is inside a fenced code block, including the opening
 * and closing fence lines themselves.
 */
export function fenceMask(lines: string[]): boolean[] {
  const mask = new Array<boolean>(lines.length).fill(false);
  let open: { ch: string; len: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (open) {
      mask[i] = true;
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === open.ch && close[1].length >= open.len) open = null;
      continue;
    }
    const m = line.match(FENCE_OPEN);
    if (m) {
      const marker = m[1];
      // A backtick "fence" whose info string contains a backtick is inline code.
      if (marker[0] === '`' && m[2].includes('`')) continue;
      open = { ch: marker[0], len: marker.length };
      mask[i] = true;
    }
  }
  return mask;
}

const ATX = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/;

export function findHeadings(lines: string[], mask: boolean[] = fenceMask(lines)): MdHeading[] {
  const out: MdHeading[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (mask[i]) continue;
    const m = lines[i].match(ATX);
    if (m && m[2].trim() !== '') out.push({ line: i, level: m[1].length, text: m[2].trim() });
  }
  return out;
}

/** The section a heading owns: up to (excluding) the next heading of equal or higher rank. */
export function sectionRange(lines: string[], headings: MdHeading[], idx: number): LineRange {
  const h = headings[idx];
  for (let n = idx + 1; n < headings.length; n++) {
    if (headings[n].level <= h.level) return { start: h.line, end: headings[n].line };
  }
  return { start: h.line, end: lines.length };
}

const DIVIDER = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
export function isDivider(line: string | undefined): boolean {
  return line !== undefined && DIVIDER.test(line);
}

/** A range to cut out, optionally put back as something else (e.g. a placeholder). */
export interface Cut extends LineRange {
  replacement?: string[];
}

function mergeCuts(cuts: Cut[]): Cut[] {
  const sorted = cuts
    .filter((r) => r.end > r.start || (r.end === r.start && !!r.replacement))
    .map((r) => ({ ...r }))
    .sort((a, b) => a.start - b.start);
  const out: Cut[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end && r.end > r.start) {
      last.end = Math.max(last.end, r.end);
      last.replacement = last.replacement ?? r.replacement;
    } else out.push(r);
  }
  return out;
}

/**
 * Tidies one cut position: collapses the surrounding blank run to a single blank
 * line (none at the document edges) and drops dividers the cut has orphaned —
 * one left at the start/end of the document, or two in a row.
 */
function cleanJunction(lines: string[], cutAt: number): void {
  let at = cutAt;
  for (let guard = 0; guard < 8; guard++) {
    at = Math.min(at, lines.length);
    let s = at;
    while (s > 0 && isBlank(lines[s - 1])) s--;
    let e = at;
    while (e < lines.length && isBlank(lines[e])) e++;
    const edge = s === 0 || e >= lines.length;
    lines.splice(s, e - s, ...(edge ? [] : ['']));
    at = s; // the single blank line, or the first line after the cut

    // Nearest non-blank neighbours of the junction.
    const prevIdx = at > 0 ? (isBlank(lines[at - 1]) ? at - 2 : at - 1) : -1;
    const nextIdx = isBlank(lines[at]) ? at + 1 : at;
    const hasPrev = prevIdx >= 0;
    const hasNext = nextIdx < lines.length;
    const prevIsDivider = hasPrev && isDivider(lines[prevIdx]);
    const nextIsDivider = hasNext && isDivider(lines[nextIdx]);

    if (!hasPrev && nextIsDivider) {
      lines.splice(nextIdx, 1);
      continue;
    }
    if ((!hasNext && prevIsDivider) || (prevIsDivider && nextIsDivider)) {
      lines.splice(prevIdx, 1);
      at = prevIdx;
      continue;
    }
    break;
  }
}

/**
 * Applies cuts (removal, or removal + replacement) and tidies only the places
 * where content changed. Everything else is returned untouched.
 */
export function applyCuts(lines: string[], cuts: Cut[]): string[] {
  const merged = mergeCuts(cuts);
  if (merged.length === 0) return lines;
  const out: string[] = [];
  const positions: number[] = [];
  let cursor = 0;
  for (const c of merged) {
    out.push(...lines.slice(cursor, c.start));
    positions.push(out.length);
    if (c.replacement && c.replacement.length > 0) {
      out.push(...c.replacement);
      positions.push(out.length);
    }
    cursor = Math.max(cursor, c.end);
  }
  out.push(...lines.slice(cursor));
  // Right-to-left so earlier positions stay valid while later ones are tidied.
  for (const p of [...new Set(positions)].sort((a, b) => b - a)) cleanJunction(out, p);
  return out;
}

/** Removes the given ranges and tidies only the places where content was cut. */
export function removeRanges(lines: string[], ranges: LineRange[]): string[] {
  return applyCuts(lines, ranges);
}

/** Replaces one range with new lines (used for in-place rewrites). */
export function replaceRange(lines: string[], range: LineRange, replacement: string[]): string[] {
  return [...lines.slice(0, range.start), ...replacement, ...lines.slice(range.end)];
}

// ─── Lists ──────────────────────────────────────────────────────────────────

export interface ListItem {
  /** Item text with the marker removed; continuation lines joined with a space. */
  text: string;
  /** Source line range of this item (including continuation lines). */
  range: LineRange;
}

const LIST_MARKER = /^(\s{0,3})([-*•]|\d+[.)])\s+(.*)$/;

/**
 * Splits a block of lines into top-level list items plus any lines that are not
 * part of a list (`other`, with their indices). Blank lines between items are
 * tolerated ("loose" lists).
 */
export function parseList(
  lines: string[],
  from = 0,
  to = lines.length,
): { items: ListItem[]; otherLines: { index: number; text: string }[] } {
  const items: ListItem[] = [];
  const otherLines: { index: number; text: string }[] = [];
  let current: ListItem | null = null;
  let baseIndent = -1;
  for (let i = from; i < to; i++) {
    const line = lines[i];
    if (isBlank(line)) continue;
    const m = line.match(LIST_MARKER);
    if (m && (baseIndent === -1 || m[1].length <= baseIndent + 1)) {
      if (baseIndent === -1) baseIndent = m[1].length;
      current = { text: m[3].trim(), range: { start: i, end: i + 1 } };
      items.push(current);
      continue;
    }
    if (current && /^\s{2,}\S/.test(line)) {
      // Indented continuation / nested content of the current item.
      current.text += ' ' + line.trim();
      current.range.end = i + 1;
      continue;
    }
    current = null;
    otherLines.push({ index: i, text: line });
  }
  return { items, otherLines };
}
