// FILE PATH: client/lib/lesson/technical/logic.ts
//
// A tiny, safe boolean-expression language for the truth-table visual. It is parsed and evaluated here
// by hand — nothing is ever passed to eval or Function — so lesson data can never run code.
//
//   variables       p, q, r, A, B …            (letters, as listed in the visual's "vars")
//   constants       0 1 true false
//   NOT             not  !  ~  ¬
//   AND / NAND      and  &  &&  ∧   /  nand
//   XOR / XNOR      xor  ^  ⊕       /  xnor
//   OR / NOR        or   |  ||  ∨   /  nor
//   IMPLIES         implies  ->  →        (right-associative, lower than OR)
//   IFF             iff  <->  ↔  ==       (lowest)
//   brackets        ( )
//
// Precedence, strongest first: NOT, AND/NAND, XOR/XNOR, OR/NOR, IMPLIES, IFF.

export class LogicError extends Error {}

type Tok = { kind: 'var' | 'const' | 'op' | 'lp' | 'rp'; text: string };
export type Ast =
  | { t: 'const'; v: boolean }
  | { t: 'var'; name: string }
  | { t: 'not'; a: Ast }
  | { t: 'bin'; op: BinOp; a: Ast; b: Ast };
type BinOp = 'and' | 'nand' | 'xor' | 'xnor' | 'or' | 'nor' | 'implies' | 'iff';

const WORD_OPS: Record<string, string> = { and: 'and', or: 'or', not: 'not', xor: 'xor', nand: 'nand', nor: 'nor', xnor: 'xnor', implies: 'implies', iff: 'iff' };
const SYMBOL_OPS: [string, string][] = [
  ['<->', 'iff'],
  ['->', 'implies'],
  ['&&', 'and'],
  ['||', 'or'],
  ['==', 'iff'],
  ['↔', 'iff'],
  ['→', 'implies'],
  ['∧', 'and'],
  ['∨', 'or'],
  ['⊕', 'xor'],
  ['¬', 'not'],
  ['&', 'and'],
  ['|', 'or'],
  ['^', 'xor'],
  ['!', 'not'],
  ['~', 'not'],
];

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(') (out.push({ kind: 'lp', text: ch }), i++);
    else if (ch === ')') (out.push({ kind: 'rp', text: ch }), i++);
    else {
      const sym = SYMBOL_OPS.find(([s]) => src.startsWith(s, i));
      if (sym) {
        out.push({ kind: 'op', text: sym[1] });
        i += sym[0].length;
      } else if (/[A-Za-z]/.test(ch)) {
        let j = i;
        while (j < src.length && /[A-Za-z0-9]/.test(src[j])) j++;
        const word = src.slice(i, j);
        const lower = word.toLowerCase();
        if (WORD_OPS[lower]) out.push({ kind: 'op', text: WORD_OPS[lower] });
        else if (lower === 'true') out.push({ kind: 'const', text: '1' });
        else if (lower === 'false') out.push({ kind: 'const', text: '0' });
        else out.push({ kind: 'var', text: word });
        i = j;
      } else if (ch === '0' || ch === '1') {
        out.push({ kind: 'const', text: ch });
        i++;
      } else throw new LogicError(`Unexpected "${ch}" in the expression.`);
    }
  }
  return out;
}

// Binding powers (higher binds tighter). implies is right-associative.
const BP: Record<BinOp, number> = { iff: 1, implies: 2, or: 3, nor: 3, xor: 4, xnor: 4, and: 5, nand: 5 };

export function parseExpr(src: string, vars: string[]): Ast {
  const toks = tokenize(src);
  let pos = 0;
  const known = new Set(vars);

  const primary = (): Ast => {
    const t = toks[pos++];
    if (!t) throw new LogicError('The expression ends too early.');
    if (t.kind === 'const') return { t: 'const', v: t.text === '1' };
    if (t.kind === 'var') {
      if (!known.has(t.text)) throw new LogicError(`"${t.text}" is not one of the variables.`);
      return { t: 'var', name: t.text };
    }
    if (t.kind === 'lp') {
      const inner = expr(0);
      if (toks[pos++]?.kind !== 'rp') throw new LogicError('A bracket is not closed.');
      return inner;
    }
    if (t.kind === 'op' && t.text === 'not') return { t: 'not', a: expr(6) };
    throw new LogicError(`Unexpected "${t.text}".`);
  };

  const expr = (minBp: number): Ast => {
    let left = primary();
    for (;;) {
      const t = toks[pos];
      if (!t || t.kind !== 'op' || t.text === 'not') break;
      const op = t.text as BinOp;
      const bp = BP[op];
      if (bp === undefined || bp < minBp) break;
      pos++;
      const right = expr(op === 'implies' ? bp : bp + 1);
      left = { t: 'bin', op, a: left, b: right };
    }
    return left;
  };

  const ast = expr(0);
  if (pos < toks.length) throw new LogicError(`Unexpected "${toks[pos].text}".`);
  return ast;
}

export function evaluate(ast: Ast, env: Record<string, boolean>): boolean {
  switch (ast.t) {
    case 'const':
      return ast.v;
    case 'var':
      return !!env[ast.name];
    case 'not':
      return !evaluate(ast.a, env);
    case 'bin': {
      const a = evaluate(ast.a, env);
      const b = evaluate(ast.b, env);
      switch (ast.op) {
        case 'and': return a && b;
        case 'nand': return !(a && b);
        case 'or': return a || b;
        case 'nor': return !(a || b);
        case 'xor': return a !== b;
        case 'xnor': return a === b;
        case 'implies': return !a || b;
        case 'iff': return a === b;
      }
    }
  }
}

export interface TruthRow {
  inputs: boolean[];
  outputs: boolean[];
}

/** Every combination of the variables (first variable varies slowest, true first — the usual textbook order). */
export function buildTruthTable(vars: string[], exprs: string[]): TruthRow[] {
  const asts = exprs.map((e) => parseExpr(e, vars));
  const rows: TruthRow[] = [];
  const n = vars.length;
  for (let k = 0; k < 1 << n; k++) {
    const inputs = vars.map((_, i) => !(k & (1 << (n - 1 - i))));
    const env = Object.fromEntries(vars.map((v, i) => [v, inputs[i]]));
    rows.push({ inputs, outputs: asts.map((a) => evaluate(a, env)) });
  }
  return rows;
}

/** Are two expressions true for exactly the same combinations (logically equivalent)? */
export function equivalent(vars: string[], a: string, b: string): boolean {
  return buildTruthTable(vars, [a, b]).every((r) => r.outputs[0] === r.outputs[1]);
}
