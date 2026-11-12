// FILE PATH: client/lib/littleCoders/pythonRuntime.ts
//
// A small, safe interpreter for the Python the Little Coders lessons show in their live demos
// (the programs a child builds with EduBlocks in courses 4 and 5). It exists so a lesson page can RUN
// the demo — with a console, a step-by-step trace and a Turtle drawing — without ever executing real
// code: nothing here touches the DOM, the network or `eval`.
//
// It understands exactly the Python these lessons teach: print / input, variables and arithmetic,
// strings, lists, if / elif / else, for / while, def / return, random and the Turtle. Anything else
// stops with a clear "this practice runner does not know that yet" message instead of guessing.
// Its output is checked against real Python in pythonRuntime.test.ts.

import { parseLine } from './blockLines';

// ─── Values ─────────────────────────────────────────────────────────────────

/** A Python float. (A JS number is a Python int — the two print differently: 3 vs 3.0.) */
export class PyFloat {
  constructor(public readonly v: number) {}
}
type PyList = PyValue[];
type PyValue = number | PyFloat | string | boolean | null | PyList | PyFunction | TurtleObject | ModuleObject;

interface PyFunction {
  kind: 'function';
  name: string;
  params: string[];
  body: Stmt[];
}
interface ModuleObject {
  kind: 'module';
  name: string;
}
interface TurtleObject {
  kind: 'turtle';
}

const isNum = (v: PyValue): v is number | PyFloat => typeof v === 'number' || v instanceof PyFloat;
const numVal = (v: number | PyFloat) => (v instanceof PyFloat ? v.v : v);

export class PyError extends Error {
  constructor(
    public readonly type: string,
    message: string,
    public line = 0,
  ) {
    super(message);
  }
}

function typeName(v: PyValue): string {
  if (typeof v === 'number') return 'int';
  if (v instanceof PyFloat) return 'float';
  if (typeof v === 'string') return 'str';
  if (typeof v === 'boolean') return 'bool';
  if (v === null) return 'NoneType';
  if (Array.isArray(v)) return 'list';
  if ((v as { kind?: string }).kind === 'function') return 'function';
  return 'object';
}

function fmtFloat(x: number): string {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  const a = Math.abs(x);
  if (a !== 0 && (a < 1e-4 || a >= 1e16)) {
    const [m, e] = x.toExponential().split('e');
    const sign = e.startsWith('-') ? '-' : '+';
    return `${m}e${sign}${e.replace(/^[+-]/, '').padStart(2, '0')}`;
  }
  const s = String(x);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

function repr(v: PyValue): string {
  if (typeof v === 'string') {
    const q = v.includes("'") && !v.includes('"') ? '"' : "'";
    return q + v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(new RegExp(q, 'g'), `\\${q}`) + q;
  }
  return str(v);
}

export function str(v: PyValue): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (v instanceof PyFloat) return fmtFloat(v.v);
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (v === null) return 'None';
  if (Array.isArray(v)) return `[${v.map(repr).join(', ')}]`;
  const o = v as { kind?: string; name?: string };
  if (o.kind === 'function') return `<function ${o.name}>`;
  if (o.kind === 'module') return `<module '${o.name}'>`;
  return '<object>';
}

function truthy(v: PyValue): boolean {
  if (typeof v === 'boolean') return v;
  if (v === null) return false;
  if (typeof v === 'number') return v !== 0;
  if (v instanceof PyFloat) return v.v !== 0;
  if (typeof v === 'string' || Array.isArray(v)) return v.length > 0;
  return true;
}

function equals(a: PyValue, b: PyValue): boolean {
  if (isNum(a) && isNum(b)) return numVal(a) === numVal(b);
  if (typeof a === 'boolean' && isNum(b)) return Number(a) === numVal(b);
  if (typeof b === 'boolean' && isNum(a)) return Number(b) === numVal(a);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => equals(x, b[i]));
  return a === b;
}

// ─── Tokens and expressions ─────────────────────────────────────────────────

type Token = { t: 'num'; v: number; float: boolean } | { t: 'str'; v: string } | { t: 'name'; v: string } | { t: 'op'; v: string };

const OPS = ['**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '+', '-', '*', '/', '%', '<', '>', '(', ')', '[', ']', ',', '.', ':', '='];

function tokenize(src: string, line: number): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (c === '#') break;
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i))!;
      out.push({ t: 'num', v: Number(m[0]), float: /[.eE]/.test(m[0]) });
      i += m[0].length;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\' && j + 1 < src.length) {
          const n = src[j + 1];
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n;
          j += 2;
        } else s += src[j++];
      }
      if (j >= src.length) throw new PyError('SyntaxError', 'unterminated string', line);
      out.push({ t: 'str', v: s });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_]\w*/.exec(src.slice(i))!;
      out.push({ t: 'name', v: m[0] });
      i += m[0].length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new PyError('SyntaxError', `unexpected character "${c}"`, line);
    out.push({ t: 'op', v: op });
    i += op.length;
  }
  return out;
}

type Expr =
  | { k: 'lit'; v: PyValue }
  | { k: 'name'; name: string }
  | { k: 'list'; items: Expr[] }
  | { k: 'un'; op: string; e: Expr }
  | { k: 'bin'; op: string; l: Expr; r: Expr }
  | { k: 'cmp'; first: Expr; rest: { op: string; e: Expr }[] }
  | { k: 'and' | 'or'; l: Expr; r: Expr }
  | { k: 'call'; fn: Expr; args: Expr[] }
  | { k: 'index'; obj: Expr; idx: Expr }
  | { k: 'attr'; obj: Expr; name: string };

class Parser {
  private p = 0;
  constructor(
    private readonly toks: Token[],
    private readonly line: number,
  ) {}

  private peek(): Token | undefined {
    return this.toks[this.p];
  }
  private isOp(v: string) {
    const t = this.peek();
    return !!t && t.t === 'op' && t.v === v;
  }
  private isName(v: string) {
    const t = this.peek();
    return !!t && t.t === 'name' && t.v === v;
  }
  private fail(msg: string): never {
    throw new PyError('SyntaxError', msg, this.line);
  }
  private expectOp(v: string) {
    if (!this.isOp(v)) this.fail(`expected "${v}"`);
    this.p++;
  }
  done() {
    return this.p >= this.toks.length;
  }
  position() {
    return this.p;
  }

  parse(): Expr {
    const e = this.or();
    return e;
  }
  private or(): Expr {
    let l = this.and();
    while (this.isName('or')) {
      this.p++;
      l = { k: 'or', l, r: this.and() };
    }
    return l;
  }
  private and(): Expr {
    let l = this.not();
    while (this.isName('and')) {
      this.p++;
      l = { k: 'and', l, r: this.not() };
    }
    return l;
  }
  private not(): Expr {
    if (this.isName('not')) {
      this.p++;
      return { k: 'un', op: 'not', e: this.not() };
    }
    return this.cmp();
  }
  private cmp(): Expr {
    const first = this.arith();
    const rest: { op: string; e: Expr }[] = [];
    for (;;) {
      const t = this.peek();
      if (t && t.t === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(t.v)) {
        this.p++;
        rest.push({ op: t.v, e: this.arith() });
      } else if (this.isName('in')) {
        this.p++;
        rest.push({ op: 'in', e: this.arith() });
      } else if (this.isName('not') && this.toks[this.p + 1]?.t === 'name' && (this.toks[this.p + 1] as { v: string }).v === 'in') {
        this.p += 2;
        rest.push({ op: 'not in', e: this.arith() });
      } else break;
    }
    return rest.length ? { k: 'cmp', first, rest } : first;
  }
  private arith(): Expr {
    let l = this.term();
    for (;;) {
      const t = this.peek();
      if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
        this.p++;
        l = { k: 'bin', op: t.v, l, r: this.term() };
      } else return l;
    }
  }
  private term(): Expr {
    let l = this.factor();
    for (;;) {
      const t = this.peek();
      if (t && t.t === 'op' && ['*', '/', '//', '%'].includes(t.v)) {
        this.p++;
        l = { k: 'bin', op: t.v, l, r: this.factor() };
      } else return l;
    }
  }
  private factor(): Expr {
    if (this.isOp('-') || this.isOp('+')) {
      const op = (this.toks[this.p++] as { v: string }).v;
      return { k: 'un', op, e: this.factor() };
    }
    return this.power();
  }
  private power(): Expr {
    const base = this.postfix();
    if (this.isOp('**')) {
      this.p++;
      return { k: 'bin', op: '**', l: base, r: this.factor() };
    }
    return base;
  }
  private postfix(): Expr {
    let e = this.atom();
    for (;;) {
      if (this.isOp('(')) {
        this.p++;
        const args: Expr[] = [];
        while (!this.isOp(')')) {
          args.push(this.or());
          if (this.isOp(',')) this.p++;
          else if (!this.isOp(')')) this.fail('expected "," or ")"');
        }
        this.p++;
        e = { k: 'call', fn: e, args };
      } else if (this.isOp('[')) {
        this.p++;
        const idx = this.or();
        this.expectOp(']');
        e = { k: 'index', obj: e, idx };
      } else if (this.isOp('.')) {
        this.p++;
        const n = this.peek();
        if (!n || n.t !== 'name') this.fail('expected a name after "."');
        this.p++;
        e = { k: 'attr', obj: e, name: (n as { v: string }).v };
      } else return e;
    }
  }
  private atom(): Expr {
    const t = this.peek();
    if (!t) this.fail('the line ends too soon');
    this.p++;
    const tok = t as Token;
    if (tok.t === 'num') return { k: 'lit', v: tok.float ? new PyFloat(tok.v) : tok.v };
    if (tok.t === 'str') return { k: 'lit', v: tok.v };
    if (tok.t === 'name') {
      if (tok.v === 'True') return { k: 'lit', v: true };
      if (tok.v === 'False') return { k: 'lit', v: false };
      if (tok.v === 'None') return { k: 'lit', v: null };
      return { k: 'name', name: tok.v };
    }
    if (tok.v === '(') {
      const e = this.or();
      this.expectOp(')');
      return e;
    }
    if (tok.v === '[') {
      const items: Expr[] = [];
      while (!this.isOp(']')) {
        items.push(this.or());
        if (this.isOp(',')) this.p++;
        else if (!this.isOp(']')) this.fail('expected "," or "]"');
      }
      this.p++;
      return { k: 'list', items };
    }
    return this.fail(`unexpected "${tok.v}"`);
  }
}

function parseExpression(toks: Token[], line: number): Expr {
  const p = new Parser(toks, line);
  const e = p.parse();
  if (!p.done()) throw new PyError('SyntaxError', 'could not read the end of this line', line);
  return e;
}

// ─── Statements ─────────────────────────────────────────────────────────────

type Stmt =
  | { k: 'expr'; line: number; e: Expr }
  | { k: 'assign'; line: number; name: string; e: Expr }
  | { k: 'setitem'; line: number; obj: Expr; idx: Expr; e: Expr }
  | { k: 'aug'; line: number; name: string; op: string; e: Expr }
  | { k: 'if'; line: number; branches: { line: number; test: Expr; body: Stmt[] }[]; orelse: Stmt[]; elseLine: number }
  | { k: 'while'; line: number; test: Expr; body: Stmt[] }
  | { k: 'for'; line: number; name: string; iter: Expr; body: Stmt[] }
  | { k: 'def'; line: number; name: string; params: string[]; body: Stmt[] }
  | { k: 'return'; line: number; e: Expr | null }
  | { k: 'import'; line: number; module: string }
  | { k: 'pass'; line: number }
  | { k: 'break'; line: number }
  | { k: 'continue'; line: number };

interface Line {
  no: number;
  depth: number;
  text: string;
}

function parseBlock(lines: Line[], from: number, depth: number): { body: Stmt[]; next: number } {
  const body: Stmt[] = [];
  let i = from;
  while (i < lines.length && lines[i].depth >= depth) {
    const ln = lines[i];
    if (ln.depth > depth) throw new PyError('IndentationError', 'unexpected indent', ln.no);
    const text = ln.text;
    const header = /^(if|elif|else|while|for|def)\b/.exec(text);
    if (header && text.endsWith(':')) {
      const kw = header[1];
      const inner = parseBlock(lines, i + 1, depth + 1);
      if (inner.body.length === 0) throw new PyError('IndentationError', `expected an indented block after "${kw}"`, ln.no);
      const toks = tokenize(text.slice(kw.length, -1), ln.no);
      if (kw === 'if') {
        const branches = [{ line: ln.no, test: parseExpression(toks, ln.no), body: inner.body }];
        let next = inner.next;
        let orelse: Stmt[] = [];
        let elseLine = 0;
        while (next < lines.length && lines[next].depth === depth && /^elif\b.*:$/.test(lines[next].text)) {
          const e = lines[next];
          const eb = parseBlock(lines, next + 1, depth + 1);
          branches.push({ line: e.no, test: parseExpression(tokenize(e.text.slice(4, -1), e.no), e.no), body: eb.body });
          next = eb.next;
        }
        if (next < lines.length && lines[next].depth === depth && lines[next].text === 'else:') {
          const eb = parseBlock(lines, next + 1, depth + 1);
          orelse = eb.body;
          elseLine = lines[next].no;
          next = eb.next;
        }
        body.push({ k: 'if', line: ln.no, branches, orelse, elseLine });
        i = next;
        continue;
      }
      if (kw === 'elif' || kw === 'else') throw new PyError('SyntaxError', `"${kw}" needs an "if" above it`, ln.no);
      if (kw === 'while') body.push({ k: 'while', line: ln.no, test: parseExpression(toks, ln.no), body: inner.body });
      else if (kw === 'for') {
        if (toks.length < 3 || toks[0].t !== 'name' || toks[1].t !== 'name' || toks[1].v !== 'in') throw new PyError('SyntaxError', 'a for loop looks like: for name in something:', ln.no);
        body.push({ k: 'for', line: ln.no, name: toks[0].v, iter: parseExpression(toks.slice(2), ln.no), body: inner.body });
      } else {
        // def name( a, b ):
        const m = /^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:$/.exec(text);
        if (!m) throw new PyError('SyntaxError', 'a function looks like: def name( a, b ):', ln.no);
        const params = m[2].split(',').map((s) => s.trim()).filter(Boolean);
        body.push({ k: 'def', line: ln.no, name: m[1], params, body: inner.body });
      }
      i = inner.next;
      continue;
    }
    body.push(parseSimple(ln));
    i++;
  }
  return { body, next: i };
}

function parseSimple(ln: Line): Stmt {
  const { text, no } = ln;
  let m: RegExpExecArray | null;
  if ((m = /^from\s+(\w+)\s+import\s+\*$/.exec(text))) return { k: 'import', line: no, module: m[1] };
  if ((m = /^import\s+(\w+)$/.exec(text))) return { k: 'import', line: no, module: m[1] };
  if (text === 'pass') return { k: 'pass', line: no };
  if (text === 'break') return { k: 'break', line: no };
  if (text === 'continue') return { k: 'continue', line: no };
  if (/^return\b/.test(text)) {
    const rest = text.slice(6).trim();
    return { k: 'return', line: no, e: rest ? parseExpression(tokenize(rest, no), no) : null };
  }
  const toks = tokenize(text, no);
  // name = expr · name += expr · name[idx] = expr
  if (toks.length >= 2 && toks[0].t === 'name' && toks[1].t === 'op') {
    const op = toks[1].v;
    if (op === '=') return { k: 'assign', line: no, name: toks[0].v, e: parseExpression(toks.slice(2), no) };
    if (['+=', '-=', '*=', '/='].includes(op)) return { k: 'aug', line: no, name: toks[0].v, op: op[0], e: parseExpression(toks.slice(2), no) };
  }
  if (toks.length > 3 && toks[0].t === 'name' && toks[1].t === 'op' && toks[1].v === '[') {
    let depth = 0;
    for (let j = 1; j < toks.length; j++) {
      const t = toks[j];
      if (t.t === 'op' && t.v === '[') depth++;
      else if (t.t === 'op' && t.v === ']') {
        depth--;
        if (depth === 0 && toks[j + 1]?.t === 'op' && (toks[j + 1] as { v: string }).v === '=') {
          const target = parseExpression(toks.slice(0, j + 1), no);
          if (target.k !== 'index') break;
          return { k: 'setitem', line: no, obj: target.obj, idx: target.idx, e: parseExpression(toks.slice(j + 2), no) };
        }
      }
    }
  }
  return { k: 'expr', line: no, e: parseExpression(toks, no) };
}

/** Reads the block lines (the "category| code" format) into statements. */
export function parseProgram(lines: string[]): Stmt[] {
  const parsed: Line[] = [];
  lines.forEach((raw, idx) => {
    const p = parseLine(raw);
    if (p) parsed.push({ no: idx + 1, depth: p.depth, text: p.text });
  });
  const { body, next } = parseBlock(parsed, 0, 0);
  if (next < parsed.length) throw new PyError('IndentationError', 'unexpected indent', parsed[next].no);
  return body;
}

// ─── The turtle ─────────────────────────────────────────────────────────────

export interface TurtleSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
}
export interface TurtleFill {
  points: [number, number][];
  color: string;
}
export interface TurtleDrawing {
  segments: TurtleSegment[];
  fills: TurtleFill[];
}

class TurtleState {
  x = 0;
  y = 0;
  heading = 0; // degrees, 0 = east, counter-clockwise like Python's turtle
  down = true;
  color = 'black';
  fill = 'black';
  width = 1;
  filling: [number, number][] | null = null;
  readonly drawing: TurtleDrawing = { segments: [], fills: [] };

  moveTo(x: number, y: number) {
    if (this.down) this.drawing.segments.push({ x1: this.x, y1: this.y, x2: x, y2: y, color: this.color, width: this.width });
    this.x = x;
    this.y = y;
    this.filling?.push([x, y]);
  }
  forward(d: number) {
    const r = (this.heading * Math.PI) / 180;
    this.moveTo(this.x + d * Math.cos(r), this.y + d * Math.sin(r));
  }
  circle(radius: number, extent = 360) {
    const steps = Math.max(12, Math.round(Math.abs(extent) / 6));
    const angle = extent / steps;
    const len = 2 * Math.abs(radius) * Math.sin((angle * Math.PI) / 360);
    const dir = radius >= 0 ? 1 : -1;
    for (let i = 0; i < steps; i++) {
      this.heading += (dir * angle) / 2;
      this.forward(len);
      this.heading += (dir * angle) / 2;
    }
  }
}

// ─── The interpreter ────────────────────────────────────────────────────────

export interface PyTraceStep {
  line: number;
  vars: [string, string][];
  /** How many console entries existed after this step ran. */
  consoleLength: number;
}

export type ConsoleEntry = { kind: 'out' | 'prompt' | 'answer' | 'error'; text: string };

export interface PyResult {
  /** Exactly what real Python would have printed. */
  output: string;
  console: ConsoleEntry[];
  error: { type: string; message: string; line: number } | null;
  trace: PyTraceStep[];
  turtle: TurtleDrawing | null;
}

class Break {}
class Continue {}
class Return {
  constructor(public readonly value: PyValue) {}
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_STEPS = 20000;
const MAX_TRACE = 500;
const MAX_DEPTH = 60;

export function runPython(lines: string[], inputs: string[] = [], opts: { seed?: number; maxSteps?: number } = {}): PyResult {
  const rand = mulberry32(opts.seed ?? (Date.now() & 0xffffffff));
  const maxSteps = opts.maxSteps ?? MAX_STEPS;
  const consoleOut: ConsoleEntry[] = [];
  const trace: PyTraceStep[] = [];
  let output = '';
  let steps = 0;
  let inputAt = 0;
  let turtle: TurtleState | null = null;
  let depth = 0;
  const globals = new Map<string, PyValue>();
  let current = 0;

  const fail = (type: string, message: string): never => {
    throw new PyError(type, message, current);
  };
  const modules: Record<string, ModuleObject> = { random: { kind: 'module', name: 'random' }, turtle: { kind: 'module', name: 'turtle' } };

  const snapshot = (scope: Map<string, PyValue>): [string, string][] => {
    const out: [string, string][] = [];
    for (const [k, v] of scope) {
      if (typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof PyFloat)) continue; // functions, modules, the turtle
      out.push([k, repr(v)]);
      if (out.length >= 14) break;
    }
    return out;
  };

  const record = (line: number, scope: Map<string, PyValue>) => {
    if (trace.length < MAX_TRACE) trace.push({ line, vars: snapshot(scope), consoleLength: consoleOut.length });
  };

  const print = (args: PyValue[]) => {
    const text = args.map(str).join(' ');
    output += `${text}\n`;
    consoleOut.push({ kind: 'out', text });
  };

  const toInt = (v: PyValue): number => {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return Number(v);
    if (v instanceof PyFloat) return Math.trunc(v.v);
    if (typeof v === 'string') {
      const t = v.trim();
      if (!/^[+-]?\d+$/.test(t)) return fail('ValueError', `invalid literal for int() with base 10: ${repr(v)}`);
      return Number(t);
    }
    return fail('TypeError', `int() argument must be a string or a number, not '${typeName(v)}'`);
  };
  const toFloat = (v: PyValue): PyFloat => {
    if (isNum(v)) return new PyFloat(numVal(v));
    if (typeof v === 'string') {
      const t = v.trim();
      if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return fail('ValueError', `could not convert string to float: ${repr(v)}`);
      return new PyFloat(Number(t));
    }
    return fail('TypeError', `float() argument must be a string or a number, not '${typeName(v)}'`);
  };
  const rangeOf = (args: PyValue[]): number[] => {
    const n = args.map(toInt);
    const [start, stop, step] = n.length === 1 ? [0, n[0], 1] : [n[0], n[1], n[2] ?? 1];
    if (step === 0) return fail('ValueError', 'range() arg 3 must not be zero');
    const out: number[] = [];
    for (let v = start; step > 0 ? v < stop : v > stop; v += step) {
      out.push(v);
      if (out.length > 100000) fail('MemoryError', 'range is too large for this practice runner');
    }
    return out;
  };

  const binary = (op: string, a: PyValue, b: PyValue): PyValue => {
    if (isNum(a) && isNum(b)) {
      const x = numVal(a);
      const y = numVal(b);
      const f = a instanceof PyFloat || b instanceof PyFloat;
      const wrap = (v: number) => (f ? new PyFloat(v) : v);
      switch (op) {
        case '+': return wrap(x + y);
        case '-': return wrap(x - y);
        case '*': return wrap(x * y);
        case '/':
          if (y === 0) fail('ZeroDivisionError', 'division by zero');
          return new PyFloat(x / y);
        case '//':
          if (y === 0) fail('ZeroDivisionError', f ? 'float floor division by zero' : 'integer division or modulo by zero');
          return wrap(Math.floor(x / y));
        case '%':
          if (y === 0) fail('ZeroDivisionError', f ? 'float modulo' : 'integer division or modulo by zero');
          return wrap(x - y * Math.floor(x / y));
        case '**':
          return f || y < 0 ? new PyFloat(x ** y) : x ** y;
      }
    }
    if (typeof a === 'boolean' && isNum(b)) return binary(op, Number(a), b);
    if (typeof b === 'boolean' && isNum(a)) return binary(op, a, Number(b));
    if (op === '+') {
      if (typeof a === 'string' && typeof b === 'string') return a + b;
      if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
      if (typeof a === 'string') return fail('TypeError', `can only concatenate str (not "${typeName(b)}") to str`);
    }
    if (op === '*') {
      if (typeof a === 'string' && typeof b === 'number') return b > 0 ? a.repeat(b) : '';
      if (typeof b === 'string' && typeof a === 'number') return a > 0 ? b.repeat(a) : '';
      if (Array.isArray(a) && typeof b === 'number') return Array.from({ length: Math.max(0, b) }, () => a).flat();
    }
    return fail('TypeError', `unsupported operand type(s) for ${op}: '${typeName(a)}' and '${typeName(b)}'`);
  };

  const compare = (op: string, a: PyValue, b: PyValue): boolean => {
    if (op === '==') return equals(a, b);
    if (op === '!=') return !equals(a, b);
    if (op === 'in' || op === 'not in') {
      let r: boolean;
      if (typeof b === 'string' && typeof a === 'string') r = b.includes(a);
      else if (Array.isArray(b)) r = b.some((x) => equals(x, a));
      else return fail('TypeError', `argument of type '${typeName(b)}' is not iterable`);
      return op === 'in' ? r : !r;
    }
    let x: number | string;
    let y: number | string;
    if (isNum(a) && isNum(b)) {
      x = numVal(a);
      y = numVal(b);
    } else if (typeof a === 'string' && typeof b === 'string') {
      x = a;
      y = b;
    } else return fail('TypeError', `'${op}' not supported between instances of '${typeName(a)}' and '${typeName(b)}'`);
    return op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y;
  };

  const lookup = (name: string, scope: Map<string, PyValue>): PyValue => {
    if (scope.has(name)) return scope.get(name) as PyValue;
    if (globals.has(name)) return globals.get(name) as PyValue;
    if (name in modules) return modules[name];
    if (['print', 'input', 'int', 'float', 'str', 'len', 'round', 'range', 'abs', 'min', 'max', 'sum', 'list', 'Turtle', 'Screen'].includes(name)) return { kind: 'module', name: `builtin:${name}` };
    return fail('NameError', `name '${name}' is not defined`);
  };

  const callBuiltin = (name: string, args: PyValue[]): PyValue => {
    switch (name) {
      case 'print':
        print(args);
        return null;
      case 'input': {
        const prompt = args.length ? str(args[0]) : '';
        consoleOut.push({ kind: 'prompt', text: prompt });
        if (inputAt >= inputs.length) return fail('EOFError', 'EOF when reading a line');
        const answer = inputs[inputAt++];
        consoleOut.push({ kind: 'answer', text: answer });
        return answer;
      }
      case 'int': return args.length ? toInt(args[0]) : 0;
      case 'float': return args.length ? toFloat(args[0]) : new PyFloat(0);
      case 'str': return args.length ? str(args[0]) : '';
      case 'len': {
        const v = args[0];
        if (typeof v === 'string' || Array.isArray(v)) return v.length;
        return fail('TypeError', `object of type '${typeName(v)}' has no len()`);
      }
      case 'round': {
        const v = args[0];
        if (!isNum(v)) return fail('TypeError', `type ${typeName(v)} doesn't define __round__ method`);
        const x = numVal(v);
        if (args.length > 1) {
          const nd = toInt(args[1]);
          const f = 10 ** nd;
          const r = Math.round((x + Number.EPSILON * Math.sign(x)) * f) / f;
          return new PyFloat(r);
        }
        // Python rounds halves to the nearest even number.
        const r = Math.round(x);
        return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
      }
      case 'range': return rangeOf(args);
      case 'abs': return isNum(args[0]) ? (args[0] instanceof PyFloat ? new PyFloat(Math.abs(args[0].v)) : Math.abs(args[0] as number)) : fail('TypeError', `bad operand type for abs(): '${typeName(args[0])}'`);
      case 'min':
      case 'max': {
        const items = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        if (items.length === 0) return fail('ValueError', `${name}() arg is an empty sequence`);
        return items.reduce((a, b) => (compare(name === 'min' ? '<' : '>', b, a) ? b : a));
      }
      case 'sum': return (Array.isArray(args[0]) ? args[0] : []).reduce((a: PyValue, b) => binary('+', a, b), 0);
      case 'list': return typeof args[0] === 'string' ? [...args[0]] : Array.isArray(args[0]) ? [...args[0]] : [];
      case 'Turtle':
      case 'Screen':
        turtle = turtle ?? new TurtleState();
        return { kind: 'turtle' };
    }
    return fail('NameError', `name '${name}' is not defined`);
  };

  const num = (v: PyValue): number => (isNum(v) ? numVal(v) : fail('TypeError', `a number is needed, not '${typeName(v)}'`));

  const callMethod = (obj: PyValue, name: string, args: PyValue[]): PyValue => {
    if (typeof obj === 'string') {
      switch (name) {
        case 'upper': return obj.toUpperCase();
        case 'lower': return obj.toLowerCase();
        case 'title': return obj.toLowerCase().replace(/(^|[^a-z0-9])([a-z])/g, (_m, a, b) => a + b.toUpperCase());
        case 'strip': return obj.trim();
        case 'replace': return obj.split(str(args[0])).join(str(args[1]));
        case 'count': return str(args[0]) === '' ? obj.length + 1 : obj.split(str(args[0])).length - 1;
        case 'find': return obj.indexOf(str(args[0]));
        case 'startswith': return obj.startsWith(str(args[0]));
        case 'endswith': return obj.endsWith(str(args[0]));
      }
    }
    if (Array.isArray(obj)) {
      switch (name) {
        case 'append': obj.push(args[0]); return null;
        case 'insert': obj.splice(Math.max(0, Math.min(obj.length, toInt(args[0]))), 0, args[1]); return null;
        case 'extend': if (Array.isArray(args[0])) obj.push(...args[0]); return null;
        case 'pop': {
          if (obj.length === 0) return fail('IndexError', 'pop from empty list');
          const i = args.length ? toInt(args[0]) : -1;
          const at = i < 0 ? obj.length + i : i;
          if (at < 0 || at >= obj.length) return fail('IndexError', 'pop index out of range');
          return obj.splice(at, 1)[0];
        }
        case 'remove': {
          const at = obj.findIndex((x) => equals(x, args[0]));
          if (at < 0) return fail('ValueError', 'list.remove(x): x not in list');
          obj.splice(at, 1);
          return null;
        }
        case 'index': {
          const at = obj.findIndex((x) => equals(x, args[0]));
          if (at < 0) return fail('ValueError', `${repr(args[0])} is not in list`);
          return at;
        }
        case 'reverse': obj.reverse(); return null;
        case 'count': return obj.filter((x) => equals(x, args[0])).length;
      }
    }
    if (obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof PyFloat)) {
      const o = obj as { kind: string; name?: string };
      if (o.kind === 'module' && o.name === 'random') {
        switch (name) {
          case 'randint': {
            const a = toInt(args[0]);
            const b = toInt(args[1]);
            if (b < a) return fail('ValueError', `empty range in randrange(${a}, ${b + 1})`);
            return a + Math.floor(rand() * (b - a + 1));
          }
          case 'randrange': {
            const r = rangeOf(args);
            if (!r.length) return fail('ValueError', 'empty range in randrange()');
            return r[Math.floor(rand() * r.length)];
          }
          case 'choice': {
            const seq = args[0];
            if (!(typeof seq === 'string' || Array.isArray(seq)) || seq.length === 0) return fail('IndexError', 'Cannot choose from an empty sequence');
            const i = Math.floor(rand() * seq.length);
            return typeof seq === 'string' ? seq[i] : seq[i];
          }
          case 'random': return new PyFloat(rand());
          case 'uniform': return new PyFloat(num(args[0]) + rand() * (num(args[1]) - num(args[0])));
          case 'shuffle':
            if (Array.isArray(args[0])) for (let i = args[0].length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [args[0][i], args[0][j]] = [args[0][j], args[0][i]]; }
            return null;
        }
      }
      if (o.kind === 'turtle' || (o.kind === 'module' && o.name === 'turtle')) {
        const t = (turtle = turtle ?? new TurtleState());
        switch (name) {
          case 'forward': case 'fd': t.forward(num(args[0])); return null;
          case 'backward': case 'back': case 'bk': t.forward(-num(args[0])); return null;
          case 'left': case 'lt': t.heading += num(args[0]); return null;
          case 'right': case 'rt': t.heading -= num(args[0]); return null;
          case 'circle': t.circle(num(args[0]), args.length > 1 ? num(args[1]) : 360); return null;
          case 'goto': case 'setpos': case 'setposition': t.moveTo(num(args[0]), num(args[1])); return null;
          case 'setheading': case 'seth': t.heading = num(args[0]); return null;
          case 'penup': case 'pu': case 'up': t.down = false; return null;
          case 'pendown': case 'pd': case 'down': t.down = true; return null;
          case 'width': case 'pensize': t.width = num(args[0]); return null;
          case 'pencolor': t.color = str(args[0]); return null;
          case 'fillcolor': t.fill = str(args[0]); return null;
          case 'color': t.color = str(args[0]); t.fill = str(args[args.length > 1 ? 1 : 0]); return null;
          case 'begin_fill': t.filling = [[t.x, t.y]]; return null;
          case 'end_fill':
            if (t.filling && t.filling.length > 2) t.drawing.fills.push({ points: t.filling, color: t.fill });
            t.filling = null;
            return null;
          case 'speed': case 'shape': case 'hideturtle': case 'showturtle': case 'bgcolor': case 'setup': case 'colormode': case 'done': case 'mainloop': case 'tracer': case 'update': case 'title':
            return null; // looks of the practice drawing, not needed
        }
      }
    }
    return fail('AttributeError', `'${typeName(obj)}' object has no attribute '${name}'`);
  };

  const call = (fnValue: PyValue, args: PyValue[], scope: Map<string, PyValue>): PyValue => {
    if (steps++ > maxSteps) fail('RuntimeError', 'This program ran too long, so the practice runner stopped it (is there a loop that never ends?)');
    const f = fnValue as { kind?: string; name?: string; params?: string[]; body?: Stmt[] };
    if (f && f.kind === 'module' && f.name?.startsWith('builtin:')) return callBuiltin(f.name.slice(8), args);
    if (f && f.kind === 'function') {
      const fn = fnValue as PyFunction;
      if (args.length !== fn.params.length) return fail('TypeError', `${fn.name}() takes ${fn.params.length} positional argument${fn.params.length === 1 ? '' : 's'} but ${args.length} ${args.length === 1 ? 'was' : 'were'} given`);
      if (++depth > MAX_DEPTH) fail('RecursionError', 'maximum recursion depth exceeded');
      const local = new Map<string, PyValue>();
      fn.params.forEach((p, i) => local.set(p, args[i]));
      try {
        execBlock(fn.body, local);
      } catch (e) {
        if (e instanceof Return) return e.value;
        throw e;
      } finally {
        depth--;
      }
      return null;
    }
    void scope;
    return fail('TypeError', `'${typeName(fnValue)}' object is not callable`);
  };

  const evalExpr = (e: Expr, scope: Map<string, PyValue>): PyValue => {
    switch (e.k) {
      case 'lit': return e.v;
      case 'name': return lookup(e.name, scope);
      case 'list': return e.items.map((x) => evalExpr(x, scope));
      case 'un': {
        const v = evalExpr(e.e, scope);
        if (e.op === 'not') return !truthy(v);
        if (!isNum(v)) return fail('TypeError', `bad operand type for unary ${e.op}: '${typeName(v)}'`);
        const x = numVal(v);
        const r = e.op === '-' ? -x : x;
        return v instanceof PyFloat ? new PyFloat(r) : r;
      }
      case 'bin': return binary(e.op, evalExpr(e.l, scope), evalExpr(e.r, scope));
      case 'cmp': {
        let left = evalExpr(e.first, scope);
        for (const { op, e: next } of e.rest) {
          const right = evalExpr(next, scope);
          if (!compare(op, left, right)) return false;
          left = right;
        }
        return true;
      }
      case 'and': { const l = evalExpr(e.l, scope); return truthy(l) ? evalExpr(e.r, scope) : l; }
      case 'or': { const l = evalExpr(e.l, scope); return truthy(l) ? l : evalExpr(e.r, scope); }
      case 'index': {
        const obj = evalExpr(e.obj, scope);
        const idx = evalExpr(e.idx, scope);
        if (typeof idx !== 'number') return fail('TypeError', `${typeName(obj)} indices must be integers, not ${typeName(idx)}`);
        if (typeof obj === 'string' || Array.isArray(obj)) {
          const at = idx < 0 ? obj.length + idx : idx;
          if (at < 0 || at >= obj.length) return fail('IndexError', typeof obj === 'string' ? 'string index out of range' : 'list index out of range');
          return obj[at];
        }
        return fail('TypeError', `'${typeName(obj)}' object is not subscriptable`);
      }
      case 'attr': {
        // Only ever reached as the function of a call; a bare attribute is not needed by the lessons.
        return fail('AttributeError', `'${typeName(evalExpr(e.obj, scope))}' object attribute "${e.name}" cannot be read here`);
      }
      case 'call': {
        if (e.fn.k === 'attr') {
          const obj = evalExpr(e.fn.obj, scope);
          return callMethod(obj, e.fn.name, e.args.map((a) => evalExpr(a, scope)));
        }
        const fn = evalExpr(e.fn, scope);
        return call(fn, e.args.map((a) => evalExpr(a, scope)), scope);
      }
    }
  };

  const execBlock = (block: Stmt[], scope: Map<string, PyValue>): void => {
    for (const s of block) exec(s, scope);
  };

  /** What the variables panel shows: the globals, plus this function's own variables while inside one. */
  const visible = (scope: Map<string, PyValue>) => (scope === globals ? globals : new Map([...globals, ...scope]));

  const exec = (s: Stmt, scope: Map<string, PyValue>): void => {
    current = s.line;
    if (steps++ > maxSteps) fail('RuntimeError', 'This program ran too long, so the practice runner stopped it (is there a loop that never ends?)');
    switch (s.k) {
      case 'expr':
        evalExpr(s.e, scope);
        record(s.line, visible(scope));
        return;
      case 'assign':
        scope.set(s.name, evalExpr(s.e, scope));
        record(s.line, visible(scope));
        return;
      case 'setitem': {
        const obj = evalExpr(s.obj, scope);
        const idx = evalExpr(s.idx, scope);
        const v = evalExpr(s.e, scope);
        if (!Array.isArray(obj)) fail('TypeError', `'${typeName(obj)}' object does not support item assignment`);
        const list = obj as PyList;
        const at = typeof idx === 'number' && idx < 0 ? list.length + idx : idx;
        if (typeof at !== 'number' || at < 0 || at >= list.length) fail('IndexError', 'list assignment index out of range');
        list[at as number] = v;
        record(s.line, visible(scope));
        return;
      }
      case 'aug':
        scope.set(s.name, binary(s.op, lookup(s.name, scope), evalExpr(s.e, scope)));
        record(s.line, visible(scope));
        return;
      case 'import':
      case 'pass':
        record(s.line, visible(scope));
        return;
      case 'def':
        scope.set(s.name, { kind: 'function', name: s.name, params: s.params, body: s.body });
        record(s.line, visible(scope));
        return;
      case 'return':
        throw new Return(s.e ? evalExpr(s.e, scope) : null);
      case 'break':
        throw new Break();
      case 'continue':
        throw new Continue();
      case 'if': {
        for (const b of s.branches) {
          current = b.line;
          const ok = truthy(evalExpr(b.test, scope));
          record(b.line, visible(scope));
          if (ok) {
            execBlock(b.body, scope);
            return;
          }
        }
        if (s.orelse.length) {
          record(s.elseLine, visible(scope));
          execBlock(s.orelse, scope);
        }
        return;
      }
      case 'while': {
        for (;;) {
          current = s.line;
          const ok = truthy(evalExpr(s.test, scope));
          record(s.line, visible(scope));
          if (!ok) return;
          try {
            execBlock(s.body, scope);
          } catch (e) {
            if (e instanceof Break) return;
            if (!(e instanceof Continue)) throw e;
          }
          if (steps++ > maxSteps) fail('RuntimeError', 'This program ran too long, so the practice runner stopped it (is there a loop that never ends?)');
        }
      }
      case 'for': {
        const it = evalExpr(s.iter, scope);
        const items: PyValue[] = typeof it === 'string' ? [...it] : Array.isArray(it) ? [...it] : (fail('TypeError', `'${typeName(it)}' object is not iterable`) as never);
        for (const item of items) {
          current = s.line;
          scope.set(s.name, item);
          record(s.line, visible(scope));
          try {
            execBlock(s.body, scope);
          } catch (e) {
            if (e instanceof Break) return;
            if (!(e instanceof Continue)) throw e;
          }
        }
        return;
      }
    }
  };

  let error: PyResult['error'] = null;
  try {
    const program = parseProgram(lines);
    execBlock(program, globals);
  } catch (e) {
    if (e instanceof PyError) {
      error = { type: e.type, message: e.message, line: e.line || current };
    } else if (e instanceof Return || e instanceof Break || e instanceof Continue) {
      error = { type: 'SyntaxError', message: "'return', 'break' or 'continue' is not allowed here", line: current };
    } else if (e instanceof RangeError) {
      error = { type: 'RecursionError', message: 'maximum recursion depth exceeded', line: current };
    } else {
      error = { type: 'Error', message: e instanceof Error ? e.message : String(e), line: current };
    }
    consoleOut.push({ kind: 'error', text: `${error.type}: ${error.message}` });
  }
  const drawn = turtle as TurtleState | null;
  return { output, console: consoleOut, error, trace, turtle: drawn && drawn.drawing.segments.length > 0 ? drawn.drawing : null };
}
