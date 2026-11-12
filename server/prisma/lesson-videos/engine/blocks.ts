// Draws Little Coders block scripts (Scratch / Stretch3 blocks, or EduBlocks Python) on the video
// canvas. It reads exactly the same block-line format as the lesson pages, through the same parser,
// so a block in a video looks like the block in the lesson.

import {
  blockColor,
  buildBlockTree,
  isHat,
  parseLine,
  plainBlockText,
  segmentsOf,
  type BlockNode,
  type Segment,
} from '../../../../client/lib/littleCoders/blockLines';
import { ease, fillRR, fontOf, hexA, rrPath, shade, text, type Ctx } from './kit';

export type Language = 'scratch' | 'edublocks';

export interface StackOpts {
  /** 0…1 pop-in progress of a block by its 1-based line number (default: fully shown). */
  reveal?: (line: number) => number;
  /** 0…1 glow of the block being "run" right now. */
  highlight?: (line: number) => number;
}

const FS = 30;
const ROW = 64;
const SLOT_H = 44;
const PAD = 20;
const INDENT = 38;
const FOOT = 26;
const HAT_CAP = 24;

// ─── Slots and block text ───────────────────────────────────────────────────

function segWidth(c: Ctx, segs: Segment[], fs: number): number {
  let w = 0;
  for (const s of segs) w += oneWidth(c, s, fs);
  return w;
}

function oneWidth(c: Ctx, s: Segment, fs: number): number {
  c.font = fontOf(fs, 700);
  if (s.kind === 'text') return c.measureText(s.text).width;
  if (s.kind === 'string') return Math.max(58, c.measureText(plainBlockText(s.inner)).width + 30) + 6;
  if (s.kind === 'round') {
    const inner = s.parts ? segWidth(c, s.parts, fs - 4) + 8 : c.measureText(plainBlockText(s.inner)).width;
    return Math.max(50, inner + 30) + 6;
  }
  return Math.max(76, segWidth(c, s.parts, fs - 4) + 52) + 6;
}

function drawSegs(c: Ctx, segs: Segment[], x: number, cy: number, fs: number, fill: string): number {
  let at = x;
  for (const s of segs) {
    const w = oneWidth(c, s, fs);
    if (s.kind === 'text') {
      c.fillStyle = '#fff';
      c.font = fontOf(fs, 700);
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(s.text, at, cy + 1);
    } else if (s.kind === 'string') {
      const ww = w - 6;
      fillRR(c, at + 3, cy - 19, ww, 38, 9, '#fff');
      c.fillStyle = '#4a5070';
      c.font = fontOf(fs - 4, 700);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(plainBlockText(s.inner), at + 3 + ww / 2, cy + 1);
    } else if (s.kind === 'round') {
      const ww = w - 6;
      fillRR(c, at + 3, cy - 19, ww, 38, 19, '#fff');
      if (s.parts) {
        drawSegs(c, s.parts.map((p) => (p.kind === 'text' ? { ...p } : p)), at + 17, cy, fs - 4, fill);
      } else {
        c.fillStyle = '#4a5070';
        c.font = fontOf(fs - 4, 700);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(plainBlockText(s.inner), at + 3 + ww / 2, cy + 1);
      }
    } else {
      const ww = w - 6;
      const x0 = at + 3;
      const h = 40;
      c.beginPath();
      c.moveTo(x0 + 18, cy - h / 2);
      c.lineTo(x0 + ww - 18, cy - h / 2);
      c.lineTo(x0 + ww, cy);
      c.lineTo(x0 + ww - 18, cy + h / 2);
      c.lineTo(x0 + 18, cy + h / 2);
      c.lineTo(x0, cy);
      c.closePath();
      c.fillStyle = shade(fill, -0.28);
      c.fill();
      drawSegs(c, s.parts, x0 + 26, cy, fs - 4, shade(fill, -0.28));
    }
    at += w;
  }
  return at - x;
}

// ─── Scratch blocks ─────────────────────────────────────────────────────────

interface Size {
  w: number;
  h: number;
}

const isCBlock = (n: BlockNode): boolean =>
  n.children.length > 0 || n.elseChildren !== undefined || /^(repeat|forever|if|wait until|repeat until)\b/.test(n.text);

function headerWidth(c: Ctx, n: BlockNode): number {
  return PAD * 2 + segWidth(c, segmentsOf(n.text), FS);
}

function measureNode(c: Ctx, n: BlockNode): Size {
  const hat = n.top && isHat(n.category, n.text);
  const headH = ROW + (hat ? HAT_CAP : 0);
  let w = headerWidth(c, n);
  if (!isCBlock(n)) return { w, h: headH };
  let h = headH;
  const kids = measureStackNodes(c, n.children);
  h += Math.max(kids.h, 30) + 0;
  w = Math.max(w, INDENT + kids.w + 26);
  if (n.elseChildren) {
    const els = measureStackNodes(c, n.elseChildren);
    h += 48 + Math.max(els.h, 30);
    w = Math.max(w, INDENT + els.w + 26);
  }
  h += FOOT;
  return { w, h };
}

function measureStackNodes(c: Ctx, nodes: BlockNode[]): Size {
  let w = 0;
  let h = 0;
  for (const n of nodes) {
    const s = measureNode(c, n);
    w = Math.max(w, s.w);
    h += s.h - 4;
  }
  return { w, h: h + (nodes.length ? 4 : 0) };
}

function blockShape(c: Ctx, x: number, y: number, w: number, h: number, hat: boolean): void {
  if (hat) {
    c.beginPath();
    c.moveTo(x, y + HAT_CAP + 10);
    c.bezierCurveTo(x, y + HAT_CAP - 4, x + 28, y + 2, x + 96, y);
    c.bezierCurveTo(x + 148, y - 2, x + 174, y + 16, x + 214, y + HAT_CAP);
    c.lineTo(x + w - 10, y + HAT_CAP);
    c.arcTo(x + w, y + HAT_CAP, x + w, y + HAT_CAP + 10, 10);
    c.lineTo(x + w, y + h - 10);
    c.arcTo(x + w, y + h, x + w - 10, y + h, 10);
    c.lineTo(x + 10, y + h);
    c.arcTo(x, y + h, x, y + h - 10, 10);
    c.closePath();
  } else rrPath(c, x, y, w, h, 10);
}

function drawNode(c: Ctx, n: BlockNode, x: number, y: number, boxW: number, fill: string, edge: string, o: StackOpts): number {
  const reveal = o.reveal ? o.reveal(n.line) : 1;
  if (reveal <= 0) return measureNode(c, n).h - 4;
  const hat = n.top && isHat(n.category, n.text);
  const size = measureNode(c, n);
  const e = ease.out3(reveal);
  const glowing = o.highlight ? o.highlight(n.line) : 0;

  c.save();
  c.globalAlpha *= Math.min(1, reveal * 2.4);
  c.translate(0, -(1 - e) * 36);

  const headH = ROW + (hat ? HAT_CAP : 0);
  const cblock = isCBlock(n);
  const full = cblock ? size.h : headH;
  // edge (the darker underside), then the face
  const faces: [number, string][] = [
    [4, edge],
    [0, fill],
  ];
  for (const [dy, col] of faces) {
    c.fillStyle = col;
    if (!cblock) {
      blockShape(c, x, y + dy, boxW, full, hat);
      c.fill();
    } else {
      // top bar
      blockShape(c, x, y + dy, boxW, headH, hat);
      c.fill();
      // left arm
      c.fillRect(x, y + headH - 8 + dy, 24, size.h - headH - FOOT + 16);
      // bottom cap
      rrPath(c, x, y + size.h - FOOT + dy, Math.min(boxW, 220), FOOT, 8);
      c.fill();
      if (n.elseChildren) {
        const kids = measureStackNodes(c, n.children);
        const elseY = y + headH + Math.max(kids.h, 30);
        rrPath(c, x, elseY + dy, Math.min(boxW, 200), 48, 8);
        c.fill();
      }
    }
  }

  if (glowing > 0) {
    c.save();
    c.shadowColor = hexA('#FFE066', 0.95);
    c.shadowBlur = 34 * glowing;
    c.strokeStyle = hexA('#FFF1A8', 0.95 * glowing);
    c.lineWidth = 5;
    blockShape(c, x, y, boxW, cblock ? headH : full, hat);
    c.stroke();
    c.restore();
  }

  drawSegs(c, segmentsOf(n.text), x + PAD, y + (hat ? HAT_CAP : 0) + ROW / 2 - 2, FS, fill);

  if (cblock) {
    const kids = drawStackNodes(c, n.children, x + INDENT, y + headH - 2, o, boxW - INDENT);
    if (n.elseChildren) {
      const elseY = y + headH + Math.max(kids, 30);
      c.fillStyle = '#fff';
      c.font = fontOf(FS, 700);
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText('else', x + PAD, elseY + 24);
      drawStackNodes(c, n.elseChildren, x + INDENT, elseY + 46, o, boxW - INDENT);
    }
  }
  c.restore();
  return size.h - 4;
}

function drawStackNodes(c: Ctx, nodes: BlockNode[], x: number, y: number, o: StackOpts, minW: number): number {
  let at = y;
  for (const n of nodes) {
    const { fill, edge } = blockColor('scratch', n.category);
    const size = measureNode(c, n);
    const w = Math.max(size.w, Math.min(minW, size.w));
    at += drawNode(c, n, x, at, w, fill, edge, o);
  }
  return at - y + (nodes.length ? 4 : 0);
}

// ─── EduBlocks (Python) ─────────────────────────────────────────────────────

const PY_FS = 28;

function pyRows(lines: string[]): { line: number; depth: number; category: string; text: string }[] {
  const out: { line: number; depth: number; category: string; text: string }[] = [];
  lines.forEach((raw, i) => {
    const p = parseLine(raw);
    if (p) out.push({ line: i + 1, depth: p.depth, category: p.category, text: p.text });
  });
  return out;
}

function pyWidth(c: Ctx, rows: ReturnType<typeof pyRows>): number {
  c.font = fontOf(PY_FS, 600, true);
  return rows.reduce((m, r) => Math.max(m, r.depth * 44 + c.measureText(r.text).width + 44), 0);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function measureStack(c: Ctx, lines: string[], language: Language): Size {
  if (language === 'edublocks') {
    const rows = pyRows(lines);
    return { w: pyWidth(c, rows), h: rows.length * 54 + 4 };
  }
  return measureStackNodes(c, buildBlockTree(lines));
}

/** Draws the stack with its top-left corner at (x, y); returns its size. */
export function drawStack(c: Ctx, lines: string[], language: Language, x: number, y: number, o: StackOpts = {}): Size {
  if (language === 'edublocks') {
    const rows = pyRows(lines);
    let at = y;
    for (const r of rows) {
      const reveal = o.reveal ? o.reveal(r.line) : 1;
      if (reveal > 0) {
        const { fill, edge } = blockColor('edublocks', r.category);
        const glowing = o.highlight ? o.highlight(r.line) : 0;
        c.save();
        c.globalAlpha *= Math.min(1, reveal * 2.4);
        c.translate(0, -(1 - ease.out3(reveal)) * 30);
        const bx = x + r.depth * 44;
        const bw = Math.max(120, (() => { c.font = fontOf(PY_FS, 600, true); return c.measureText(r.text).width + 44; })());
        fillRR(c, bx, at + 4, bw, 50, 9, edge);
        fillRR(c, bx, at, bw, 50, 9, fill);
        if (glowing > 0) {
          c.save();
          c.shadowColor = hexA('#FFE066', 0.95);
          c.shadowBlur = 30 * glowing;
          rrPath(c, bx, at, bw, 50, 9);
          c.strokeStyle = hexA('#FFF1A8', 0.95 * glowing);
          c.lineWidth = 5;
          c.stroke();
          c.restore();
        }
        text(c, r.text, bx + 22, at + 26, { size: PY_FS, weight: 600, mono: true, base: 'middle', color: '#fff' });
        c.restore();
      }
      at += 54;
    }
    return { w: pyWidth(c, rows), h: rows.length * 54 + 4 };
  }
  const nodes = buildBlockTree(lines);
  drawStackNodes(c, nodes, x, y, o, 0);
  return measureStackNodes(c, nodes);
}

/** Number of block lines in a script (for pacing a reveal). */
export function lineCount(lines: string[]): number {
  return lines.reduce((n, l) => n + (parseLine(l) ? 1 : 0), 0);
}

/** The 1-based line numbers of every block, in reading order. */
export function lineNumbers(lines: string[]): number[] {
  const out: number[] = [];
  lines.forEach((l, i) => {
    if (parseLine(l)) out.push(i + 1);
  });
  return out;
}
