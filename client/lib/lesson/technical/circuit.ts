// FILE PATH: client/lib/lesson/technical/circuit.ts
//
// A small logic-circuit simulator for the circuit visual. Combinational gates (AND, OR, NOT, XOR,
// NAND, NOR, XNOR, BUF) are evaluated until the signals settle, so cross-coupled gates (an SR latch
// built from two NOR gates) work too. Flip-flops (DFF, TFF, JKFF) keep a stored bit that changes only
// when `clock` is called, exactly like a rising clock edge: every flip-flop reads its inputs as they
// were just before the edge and all of them update together.

export type GateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR' | 'XNOR' | 'BUF' | 'DFF' | 'TFF' | 'JKFF';
export type Bit = 0 | 1;

export interface CircuitInput { id: string; label?: string; value?: Bit }
export interface CircuitGate { id: string; type: GateType; in: string[]; label?: string }
export interface CircuitOutput { id: string; from: string; label?: string }
export interface CircuitConfig { inputs: CircuitInput[]; gates: CircuitGate[]; outputs: CircuitOutput[] }

export const isSequential = (t: GateType): boolean => t === 'DFF' || t === 'TFF' || t === 'JKFF';

function gateOut(type: GateType, v: Bit[]): Bit {
  const [a = 0, b = 0] = v;
  switch (type) {
    case 'AND': return (a & b) as Bit;
    case 'OR': return (a | b) as Bit;
    case 'NOT': return (a ^ 1) as Bit;
    case 'XOR': return (a ^ b) as Bit;
    case 'NAND': return ((a & b) ^ 1) as Bit;
    case 'NOR': return ((a | b) ^ 1) as Bit;
    case 'XNOR': return ((a ^ b) ^ 1) as Bit;
    default: return a; // BUF
  }
}

export interface Evaluation {
  values: Record<string, Bit>;
  /** False when the signals never settle (an oscillating loop such as a NOT feeding itself). */
  stable: boolean;
}

export function evaluate(cfg: CircuitConfig, inputs: Record<string, Bit>, state: Record<string, Bit> = {}): Evaluation {
  const values: Record<string, Bit> = {};
  for (const i of cfg.inputs) values[i.id] = inputs[i.id] ?? i.value ?? 0;
  for (const g of cfg.gates) values[g.id] = isSequential(g.type) ? (state[g.id] ?? 0) : (state[`~${g.id}`] ?? 0);
  let stable = false;
  for (let pass = 0; pass < 40 && !stable; pass++) {
    stable = true;
    for (const g of cfg.gates) {
      if (isSequential(g.type)) continue;
      const next = gateOut(g.type, g.in.map((id) => values[id] ?? 0));
      if (next !== values[g.id]) {
        values[g.id] = next;
        stable = false;
      }
    }
  }
  return { values, stable };
}

/** One rising clock edge: returns the new stored bits (the old state plus the settled latch values). */
export function clock(cfg: CircuitConfig, inputs: Record<string, Bit>, state: Record<string, Bit> = {}): Record<string, Bit> {
  const { values } = evaluate(cfg, inputs, state);
  const next: Record<string, Bit> = { ...state };
  for (const g of cfg.gates) {
    if (!isSequential(g.type)) {
      next[`~${g.id}`] = values[g.id]; // remember settled combinational values so a latch keeps its memory
      continue;
    }
    const q = state[g.id] ?? 0;
    const x = values[g.in[0]] ?? 0;
    if (g.type === 'DFF') next[g.id] = x;
    else if (g.type === 'TFF') next[g.id] = (q ^ x) as Bit;
    else {
      const k = values[g.in[1]] ?? 0;
      next[g.id] = (x === 0 && k === 0 ? q : x === 0 && k === 1 ? 0 : x === 1 && k === 0 ? 1 : q ^ 1) as Bit;
    }
  }
  return next;
}

export interface CircuitRow {
  inputs: Bit[];
  outputs: Bit[];
}

/** The truth table of a purely combinational circuit (first input is the most significant bit). */
export function truthTable(cfg: CircuitConfig): CircuitRow[] {
  const n = cfg.inputs.length;
  const rows: CircuitRow[] = [];
  for (let k = 0; k < 1 << n; k++) {
    const ins = cfg.inputs.map((_, i) => ((k >> (n - 1 - i)) & 1) as Bit);
    const { values } = evaluate(cfg, Object.fromEntries(cfg.inputs.map((inp, i) => [inp.id, ins[i]])) as Record<string, Bit>);
    rows.push({ inputs: ins, outputs: cfg.outputs.map((o) => values[o.from] ?? 0) });
  }
  return rows;
}

export interface Placed {
  id: string;
  kind: 'input' | 'gate' | 'output';
  col: number;
  row: number;
}

/** Layers the circuit left to right: inputs, then gates by the longest path from an input, then outputs. */
export function layoutCircuit(cfg: CircuitConfig): { nodes: Placed[]; cols: number; rows: number } {
  const depth = new Map<string, number>();
  for (const i of cfg.inputs) depth.set(i.id, 0);
  // Sequential elements are sources too (their output is a stored bit), which breaks every feedback loop.
  for (const g of cfg.gates) if (isSequential(g.type)) depth.set(g.id, 1);
  for (let pass = 0; pass < cfg.gates.length + 2; pass++) {
    let changed = false;
    for (const g of cfg.gates) {
      if (isSequential(g.type)) continue;
      const known = g.in.map((id) => depth.get(id)).filter((d): d is number => d !== undefined);
      if (known.length === 0) continue;
      const d = Math.max(...known) + 1;
      if (!depth.has(g.id) || (depth.get(g.id)! < d && d <= cfg.gates.length + 1)) {
        depth.set(g.id, d);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const g of cfg.gates) if (!depth.has(g.id)) depth.set(g.id, 1);
  const maxGate = Math.max(1, ...cfg.gates.map((g) => depth.get(g.id) ?? 1));
  const byCol = new Map<number, string[]>();
  const place = (col: number, id: string) => byCol.set(col, [...(byCol.get(col) ?? []), id]);
  cfg.inputs.forEach((i) => place(0, i.id));
  cfg.gates.forEach((g) => place(depth.get(g.id) ?? 1, g.id));
  cfg.outputs.forEach((o) => place(maxGate + 1, `out:${o.id}`));
  const nodes: Placed[] = [];
  let rows = 1;
  for (const [col, ids] of byCol) {
    rows = Math.max(rows, ids.length);
    ids.forEach((id, row) => {
      const kind: Placed['kind'] = col === 0 ? 'input' : id.startsWith('out:') ? 'output' : 'gate';
      nodes.push({ id, kind, col, row });
    });
  }
  return { nodes, cols: maxGate + 2, rows };
}
