'use client';

// FILE PATH: client/components/lesson/visuals/technical-logic.tsx
//
// Interactive digital-logic, architecture, operating-system and network visuals of the Pre-University CSE
// program. They run on small, tested simulators in lib/lesson/technical (never on eval): a logic-circuit
// simulator, a truth-table generator, a bit explorer, a toy CPU with an assembler, a CPU-scheduling
// simulator and an IPv4 subnet calculator. Each is a MODEL for learning, and says so.

import { useMemo, useState, type CSSProperties } from 'react';
import { C, Svg, useMarker } from './svg';
import { registerVisuals, type VisualProps } from './registry';
import { GanttChart } from './technical-diagrams';
import { buildTruthTable, LogicError, parseExpr } from '@/lib/lesson/technical/logic';
import { clock, evaluate, isSequential, layoutCircuit, truthTable, type Bit, type CircuitConfig, type CircuitGate } from '@/lib/lesson/technical/circuit';
import { fromBits, grouped, negate, placeValues, signedValue, toBase, toBits } from '@/lib/lesson/technical/bits';
import { assemble, initCpu, run as runCpu, step as stepCpu, type CpuState, type StepResult } from '@/lib/lesson/technical/asm';
import { schedule, type Algorithm, type Proc } from '@/lib/lesson/technical/scheduling';
import { describeSubnet, SubnetError } from '@/lib/lesson/technical/subnet';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const cellStyle: CSSProperties = { padding: '3px 8px', border: `1px solid ${C.border}`, fontFamily: MONO, fontSize: 13, textAlign: 'center' };
const headStyle: CSSProperties = { ...cellStyle, background: C.surface2, fontWeight: 700, fontFamily: 'inherit' };

// ─── Logic circuit simulator ────────────────────────────────────────────────

const GATE_W = 60;
const GATE_H = 44;

function gatePath(type: string, x: number, y: number): { body: string; bubble: boolean; extra?: string } {
  const l = x - GATE_W / 2;
  const t = y - GATE_H / 2;
  switch (type) {
    case 'AND':
    case 'NAND':
      return { body: `M ${l} ${t} H ${l + 30} A 22 22 0 0 1 ${l + 30} ${t + 44} H ${l} Z`, bubble: type === 'NAND' };
    case 'OR':
    case 'NOR':
    case 'XOR':
    case 'XNOR':
      return {
        body: `M ${l} ${t} Q ${l + 34} ${t} ${l + 60} ${y} Q ${l + 34} ${t + 44} ${l} ${t + 44} Q ${l + 16} ${y} ${l} ${t} Z`,
        bubble: type === 'NOR' || type === 'XNOR',
        extra: type === 'XOR' || type === 'XNOR' ? `M ${l - 7} ${t} Q ${l + 9} ${y} ${l - 7} ${t + 44}` : undefined,
      };
    case 'NOT':
      return { body: `M ${l + 4} ${t + 2} L ${l + 52} ${y} L ${l + 4} ${t + 42} Z`, bubble: true };
    default:
      return { body: `M ${l + 4} ${t + 2} L ${l + 56} ${y} L ${l + 4} ${t + 42} Z`, bubble: false };
  }
}

export function CircuitVisual({ config, onUse }: VisualProps) {
  const cfg: CircuitConfig = {
    inputs: (Array.isArray(config.inputs) ? config.inputs : []).slice(0, 6),
    gates: (Array.isArray(config.gates) ? config.gates : []).slice(0, 24),
    outputs: (Array.isArray(config.outputs) ? config.outputs : []).slice(0, 8),
  };
  const initial = Object.fromEntries(cfg.inputs.map((i) => [i.id, (i.value ?? 0) as Bit])) as Record<string, Bit>;
  const [inputs, setInputs] = useState<Record<string, Bit>>(initial);
  const [memory, setMemory] = useState<Record<string, Bit>>({});
  const { id: markerId, defs } = useMarker();
  const sequential = cfg.gates.some((g) => isSequential(g.type));
  const showTable = !!config.truthTable && !sequential && cfg.inputs.length <= 5;

  const commit = (nextInputs: Record<string, Bit>, nextMemory: Record<string, Bit>) => {
    const e = evaluate(cfg, nextInputs, nextMemory);
    const stored = { ...nextMemory };
    for (const g of cfg.gates) if (!isSequential(g.type)) stored[`~${g.id}`] = e.values[g.id];
    setInputs(nextInputs);
    setMemory(stored);
  };
  const toggle = (id: string) => {
    commit({ ...inputs, [id]: (inputs[id] ^ 1) as Bit }, memory);
    onUse?.();
  };
  const pulse = () => {
    const next = clock(cfg, inputs, memory);
    commit(inputs, next);
    onUse?.();
  };
  const reset = () => {
    setInputs(initial);
    setMemory({});
    onUse?.();
  };

  const { values, stable } = evaluate(cfg, inputs, memory);
  const layout = useMemo(() => layoutCircuit(cfg), [JSON.stringify(cfg)]); // eslint-disable-line react-hooks/exhaustive-deps
  const colW = 150, rowH = 76;
  const W = 40 + layout.cols * colW + 20, H = 36 + layout.rows * rowH;
  const colCount = new Map<number, number>();
  for (const n of layout.nodes) colCount.set(n.col, (colCount.get(n.col) ?? 0) + 1);
  const at = new Map(layout.nodes.map((n) => [n.id, { x: 50 + n.col * colW, y: 40 + (n.row + (layout.rows - (colCount.get(n.col) ?? 1)) / 2) * rowH, ...n }]));
  const gateById = new Map(cfg.gates.map((g) => [g.id, g]));

  const outPin = (id: string) => {
    const p = at.get(id)!;
    if (cfg.inputs.some((i) => i.id === id)) return { x: p.x + 26, y: p.y };
    const g = gateById.get(id)!;
    const bubble = ['NAND', 'NOR', 'XNOR', 'NOT'].includes(g.type);
    return { x: p.x + (isSequential(g.type) ? 34 : GATE_W / 2 + (bubble ? 9 : 0)), y: p.y };
  };
  const inPin = (g: CircuitGate, k: number) => {
    const p = at.get(g.id)!;
    if (isSequential(g.type)) return { x: p.x - 34, y: p.y + (g.in.length === 1 ? 0 : k === 0 ? -14 : 8) };
    return { x: p.x - GATE_W / 2 - (g.type === 'XOR' || g.type === 'XNOR' ? 7 : 0), y: p.y + (g.in.length === 1 ? 0 : k === 0 ? -12 : 12) };
  };
  const wires: { d: string; v: Bit; key: string }[] = [];
  let wireNo = 0;
  const addWire = (from: string, to: { x: number; y: number }, key: string) => {
    if (!at.has(from)) return;
    const s = outPin(from);
    const off = ((wireNo++ % 5) - 2) * 5;
    const forward = s.x < to.x - 16;
    const mx = (s.x + to.x) / 2 + off;
    const d = forward ? `M ${s.x} ${s.y} H ${mx} V ${to.y} H ${to.x}` : `M ${s.x} ${s.y} H ${s.x + 14} V ${8 + wireNo * 3} H ${to.x - 16} V ${to.y} H ${to.x}`;
    wires.push({ d, v: values[from] ?? 0, key });
  };
  for (const g of cfg.gates) g.in.forEach((src, k) => addWire(src, inPin(g, k), `${g.id}-${k}`));
  for (const o of cfg.outputs) {
    const p = at.get(`out:${o.id}`);
    if (p) addWire(o.from, { x: p.x - 16, y: p.y }, `out-${o.id}`);
  }
  const rows = showTable ? truthTable(cfg) : [];
  const currentRow = rows.findIndex((r) => r.inputs.every((b, i) => b === inputs[cfg.inputs[i].id]));
  return (
    <div>
      <Svg w={W} h={H}>
        {defs}
        {wires.map((w) => <path key={w.key} d={w.d} fill="none" stroke={w.v ? C.good : C.muted} strokeWidth={w.v ? 3.2 : 2} />)}
        {cfg.inputs.map((i) => {
          const p = at.get(i.id)!;
          const on = inputs[i.id] === 1;
          return (
            <g key={i.id} onClick={() => toggle(i.id)} style={{ cursor: 'pointer' }}>
              <rect x={p.x - 26} y={p.y - 16} width={52} height={32} rx={8} fill={on ? C.good : C.surface} fillOpacity={on ? 0.9 : 1} stroke={on ? C.good : C.border} strokeWidth={2} />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill={on ? '#0f172a' : C.text}>{i.label ?? i.id} = {inputs[i.id]}</text>
            </g>
          );
        })}
        {cfg.gates.map((g) => {
          const p = at.get(g.id)!;
          if (isSequential(g.type)) {
            const q = memory[g.id] ?? 0;
            return (
              <g key={g.id}>
                <rect x={p.x - 34} y={p.y - 32} width={68} height={64} rx={6} fill={C.surface} stroke={C.accent} strokeWidth={2.2} />
                <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={11.5} fontWeight={800}>{g.type}</text>
                <text x={p.x - 28} y={g.in.length === 1 ? p.y + 4 : p.y - 10} fontSize={11} fill={C.muted}>{g.type === 'DFF' ? 'D' : g.type === 'TFF' ? 'T' : 'J'}</text>
                {g.in.length === 2 && <text x={p.x - 28} y={p.y + 12} fontSize={11} fill={C.muted}>K</text>}
                <path d={`M ${p.x - 34} ${p.y + 20} l 8 5 l -8 5`} fill="none" stroke={C.muted} strokeWidth={1.6} />
                <text x={p.x + 28} y={p.y + 4} textAnchor="end" fontSize={13} fontWeight={800} fill={q ? C.good : C.text}>Q={q}</text>
                {g.label && <text x={p.x} y={p.y + 46} textAnchor="middle" fontSize={10.5} fill={C.muted}>{g.label}</text>}
              </g>
            );
          }
          const shape = gatePath(g.type, p.x, p.y);
          const v = values[g.id] ?? 0;
          return (
            <g key={g.id}>
              <path d={shape.body} fill={C.surface} stroke={v ? C.good : C.accent} strokeWidth={2.4} />
              {shape.extra && <path d={shape.extra} fill="none" stroke={v ? C.good : C.accent} strokeWidth={2.4} />}
              {shape.bubble && <circle cx={p.x + GATE_W / 2 + 4} cy={p.y} r={4.5} fill={C.bg} stroke={v ? C.good : C.accent} strokeWidth={2} />}
              <text x={p.x - 2} y={p.y + 4} textAnchor="middle" fontSize={10.5} fontWeight={800} fill={C.muted}>{g.type === 'BUF' ? '' : g.type === 'NOT' ? '' : g.type}</text>
              {g.label && <text x={p.x} y={p.y + 36} textAnchor="middle" fontSize={10.5} fill={C.muted}>{g.label}</text>}
            </g>
          );
        })}
        {cfg.outputs.map((o) => {
          const p = at.get(`out:${o.id}`)!;
          const v = values[o.from] ?? 0;
          return (
            <g key={o.id}>
              <circle cx={p.x} cy={p.y} r={15} fill={v ? C.warn : C.surface} fillOpacity={v ? 0.95 : 1} stroke={v ? C.warn : C.border} strokeWidth={2.4} />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill={v ? '#0f172a' : C.text}>{v}</text>
              <text x={p.x} y={p.y + 32} textAnchor="middle" fontSize={11.5} fontWeight={700}>{o.label ?? o.id}</text>
            </g>
          );
        })}
      </Svg>
      <div className="lv-controls" role="group" aria-label="Circuit inputs">
        {cfg.inputs.map((i) => (
          <button key={i.id} type="button" className="lv-btn" aria-pressed={inputs[i.id] === 1} onClick={() => toggle(i.id)}>{i.label ?? i.id} = {inputs[i.id]}</button>
        ))}
        {sequential && <button type="button" className="lv-btn lv-btn-primary" onClick={pulse}>Clock ↑</button>}
        <button type="button" className="lv-btn" onClick={reset}>Reset</button>
      </div>
      <p className="lv-note" aria-live="polite">
        {cfg.outputs.map((o) => `${o.label ?? o.id} = ${values[o.from] ?? 0}`).join('   ')}
        {!stable && ' — the signals never settle (an oscillating loop).'}
        {sequential && ' — flip-flops change only when the clock pulses.'}
      </p>
      {showTable && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', margin: '6px 0' }}>
            <thead>
              <tr>
                {cfg.inputs.map((i) => <th key={i.id} style={headStyle}>{i.label ?? i.id}</th>)}
                {cfg.outputs.map((o) => <th key={o.id} style={{ ...headStyle, background: C.surface }}>{o.label ?? o.id}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, k) => (
                <tr key={k} style={k === currentRow ? { background: `color-mix(in srgb, ${C.warn} 30%, transparent)` } : undefined}>
                  {r.inputs.map((b, n) => <td key={n} style={cellStyle}>{b}</td>)}
                  {r.outputs.map((b, n) => <td key={n} style={{ ...cellStyle, fontWeight: 800, color: b ? C.good : C.muted }}>{b}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="lv-sim">A simulation inside this page: click an input to switch it. Wires carrying 1 turn green.</p>
      <span hidden>{markerId}</span>
    </div>
  );
}

// ─── Truth table ────────────────────────────────────────────────────────────

export function TruthTableVisual({ config, onUse }: VisualProps) {
  const vars: string[] = (Array.isArray(config.vars) ? config.vars : []).map(String).slice(0, 4);
  const columns: { label: string; expr: string }[] = (Array.isArray(config.columns) ? config.columns : []).slice(0, 8);
  const reveal = config.reveal !== false;
  const symbols = config.symbols === '01' ? { t: '1', f: '0' } : { t: 'T', f: 'F' };
  const [shown, setShown] = useState(reveal);
  const built = useMemo(() => {
    try {
      return { rows: buildTruthTable(vars, columns.map((c) => c.expr)), error: null as string | null };
    } catch (err) {
      return { rows: [], error: err instanceof LogicError ? err.message : 'The expression could not be read.' };
    }
  }, [vars.join(','), columns.map((c) => c.expr).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  void parseExpr;
  if (vars.length === 0 || columns.length === 0) return null;
  if (built.error) return <p className="lesson-visual-missing" role="alert">{built.error}</p>;
  const sym = (b: boolean) => (b ? symbols.t : symbols.f);
  const lastCol = built.rows.map((r) => r.outputs[r.outputs.length - 1]);
  const tautology = lastCol.every(Boolean);
  const contradiction = lastCol.every((b) => !b);
  const a = built.rows.map((r) => r.outputs[r.outputs.length - 2]);
  const matches = columns.length >= 2 && a.every((b, i) => b === lastCol[i]);
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', margin: '4px 0' }}>
          <thead>
            <tr>
              {vars.map((v) => <th key={v} style={headStyle}>{v}</th>)}
              {columns.map((c) => <th key={c.label} style={{ ...headStyle, background: C.surface, fontFamily: MONO }}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {built.rows.map((r, k) => (
              <tr key={k}>
                {r.inputs.map((b, n) => <td key={n} style={cellStyle}>{sym(b)}</td>)}
                {r.outputs.map((b, n) => (
                  <td key={n} style={{ ...cellStyle, fontWeight: 800, color: shown ? (b ? C.good : C.bad) : C.muted }}>{shown ? sym(b) : '?'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lv-controls">
        <button type="button" className="lv-btn lv-btn-primary" aria-pressed={shown} onClick={() => { setShown(!shown); onUse?.(); }}>{shown ? 'Hide the answers' : 'Show the answers'}</button>
        {!reveal && !shown && <span className="lv-label">Work each column out on paper first, then check.</span>}
      </div>
      {shown && (
        <p className="lv-note" aria-live="polite">
          The last column is {tautology ? <strong>a tautology (true in every row)</strong> : contradiction ? <strong>a contradiction (false in every row)</strong> : <strong>a contingency (true in some rows, false in others)</strong>}.
          {matches && <> The last two columns are <strong>identical in every row</strong>, so the two expressions are logically equivalent.</>}
        </p>
      )}
    </div>
  );
}

// ─── Bit explorer ───────────────────────────────────────────────────────────

export function BitExplorer({ config, onUse }: VisualProps) {
  const width = ([4, 8, 16].includes(config.bits) ? config.bits : 8) as 4 | 8 | 16;
  const mode: 'unsigned' | 'twos' | 'both' = ['unsigned', 'twos', 'both'].includes(config.mode) ? config.mode : 'both';
  const initial = clamp(Math.trunc(Number(config.value) || 0), 0, 2 ** width - 1);
  const [value, setValue] = useState(initial);
  const [text, setText] = useState(String(initial));
  const bits = toBits(value, width);
  const max = 2 ** width - 1;
  const set = (v: number) => {
    const next = ((Math.trunc(v) % 2 ** width) + 2 ** width) % 2 ** width;
    setValue(next);
    setText(String(next));
    onUse?.();
  };
  const flip = (i: number) => {
    const b = [...bits];
    b[i] ^= 1;
    set(fromBits(b));
  };
  const twosPlaces = placeValues(width, true);
  const places = placeValues(width, false);
  const small = width === 16;
  return (
    <div>
      <div style={{ display: 'flex', gap: small ? 3 : 6, flexWrap: 'wrap', margin: '4px 0 8px' }} role="group" aria-label={`${width} bits, most significant first`}>
        {bits.map((b, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, color: C.muted, fontFamily: MONO }}>{mode === 'twos' ? twosPlaces[i] : places[i]}</div>
            <button type="button" onClick={() => flip(i)} aria-pressed={b === 1} aria-label={`Bit ${width - 1 - i}, value ${b}`} className="lv-btn" style={{ width: small ? 34 : 44, height: 44, fontFamily: MONO, fontSize: 18, fontWeight: 800, padding: 0, background: b ? C.accent : undefined, color: b ? '#fff' : undefined, borderColor: b ? C.accent : undefined }}>{b}</button>
            <div style={{ fontSize: 10, color: C.muted }}>bit {width - 1 - i}</div>
          </div>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr><th style={headStyle}>Binary</th><td style={cellStyle}>{grouped(bits)}</td></tr>
            <tr><th style={headStyle}>Decimal (unsigned)</th><td style={cellStyle}>{value}</td></tr>
            {mode !== 'unsigned' && <tr><th style={headStyle}>Decimal (two’s complement)</th><td style={cellStyle}>{signedValue(value, width)}</td></tr>}
            <tr><th style={headStyle}>Hexadecimal</th><td style={cellStyle}>0x{toBase(value, 16, width / 4)}</td></tr>
            <tr><th style={headStyle}>Octal</th><td style={cellStyle}>0o{toBase(value, 8)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="lv-controls">
        <label className="lv-label" htmlFor="bit-value">Type a decimal</label>
        <input id="bit-value" className="lv-select" style={{ width: '6.5rem', fontFamily: MONO }} inputMode="numeric" value={text} onChange={(e) => { setText(e.target.value); const n = Number(e.target.value); if (e.target.value.trim() !== '' && Number.isFinite(n)) { setValue(clamp(Math.trunc(n), 0, max)); onUse?.(); } }} />
        <button type="button" className="lv-btn" onClick={() => set(~value & max)}>NOT (flip all)</button>
        <button type="button" className="lv-btn" onClick={() => set(value + 1)}>+ 1</button>
        <button type="button" className="lv-btn" onClick={() => set(value - 1)}>− 1</button>
        <button type="button" className="lv-btn" onClick={() => set(value << 1)}>Shift left</button>
        <button type="button" className="lv-btn" onClick={() => set(value >> 1)}>Shift right</button>
        {mode !== 'unsigned' && <button type="button" className="lv-btn" onClick={() => set(negate(value, width))}>Negate (two’s complement)</button>}
        <button type="button" className="lv-btn" onClick={() => set(initial)}>Reset</button>
      </div>
      <p className="lv-note">All {width} bits go from 0 to {max} unsigned{mode !== 'unsigned' ? `, or ${-(2 ** (width - 1))} to ${2 ** (width - 1) - 1} in two’s complement` : ''}. The numbers wrap around when they pass the end: that is overflow.</p>
    </div>
  );
}

// ─── Assembly simulator (a toy CPU) ─────────────────────────────────────────

export function AsmLab({ config, onUse }: VisualProps) {
  const initialSource = String(config.program ?? '');
  const editable = config.editable !== false;
  const size = (config.memorySize === 32 ? 32 : 16) as 16 | 32;
  const startMemory: number[] = Array.isArray(config.memory) ? config.memory.map(Number) : [];
  const maxSteps = clamp(Number(config.maxSteps) || 500, 10, 2000);
  const [source, setSource] = useState(initialSource);
  const program = useMemo(() => assemble(source), [source]);
  const [cpu, setCpu] = useState<CpuState>(() => initCpu(startMemory, size));
  const [last, setLast] = useState<StepResult | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const reset = () => {
    setCpu(initCpu(startMemory, size));
    setLast(null);
    setNote(null);
    onUse?.();
  };
  const onEdit = (text: string) => {
    setSource(text);
    setCpu(initCpu(startMemory, size));
    setLast(null);
    setNote(null);
  };
  const doStep = () => {
    if (program.errors.length) return;
    const r = stepCpu(program, cpu);
    setCpu(r.state);
    setLast(r);
    setNote(null);
    onUse?.();
  };
  const doRun = () => {
    if (program.errors.length) return;
    const r = runCpu(program, cpu, maxSteps);
    setCpu(r.state);
    setLast(r.trace[r.trace.length - 1] ?? null);
    setNote(r.hitLimit ? `Stopped after ${maxSteps} steps without reaching HALT: is there an endless loop?` : r.state.fault ?? `Finished after ${r.state.steps} instruction${r.state.steps === 1 ? '' : 's'}.`);
    onUse?.();
  };
  const reg = (name: string, v: number) => (
    <tr key={name}><th style={headStyle}>{name}</th><td style={cellStyle}>{v}</td><td style={{ ...cellStyle, color: C.muted }}>0x{v.toString(16).toUpperCase().padStart(2, '0')}</td></tr>
  );
  const lines = source.split('\n');
  const pcLine = program.instrs[cpu.pc]?.line;
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ flex: '2 1 280px', minWidth: 0 }}>
          {editable ? (
            <textarea aria-label="Assembly program" spellCheck={false} value={source} onChange={(e) => onEdit(e.target.value)} rows={Math.min(Math.max(lines.length + 1, 6), 16)} style={{ width: '100%', fontFamily: MONO, fontSize: 13, background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, resize: 'vertical' }} />
          ) : (
            <pre style={{ margin: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, fontSize: 13, overflowX: 'auto' }}>{source}</pre>
          )}
          {program.errors.length > 0 && (
            <ul role="alert" style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: C.bad }}>
              {program.errors.slice(0, 4).map((e, i) => <li key={i}>Line {e.line}: {e.message}</li>)}
            </ul>
          )}
          <div className="lv-controls">
            <button type="button" className="lv-btn lv-btn-primary" onClick={doStep} disabled={cpu.halted || program.errors.length > 0}>Step ▶</button>
            <button type="button" className="lv-btn" onClick={doRun} disabled={cpu.halted || program.errors.length > 0}>Run to HALT</button>
            <button type="button" className="lv-btn" onClick={reset}>Reset</button>
            {editable && source !== initialSource && <button type="button" className="lv-btn" onClick={() => onEdit(initialSource)}>Restore original</button>}
          </div>
        </div>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {reg('A', cpu.a)}
              {reg('B', cpu.b)}
              <tr><th style={headStyle}>PC</th><td style={cellStyle}>{cpu.pc}</td><td style={{ ...cellStyle, color: C.muted }}>{pcLine ? `line ${pcLine}` : '—'}</td></tr>
              <tr><th style={headStyle}>IR</th><td style={{ ...cellStyle, textAlign: 'left' }} colSpan={2}>{cpu.ir}</td></tr>
              <tr><th style={headStyle}>Flags</th><td style={cellStyle} colSpan={2}>Z={cpu.z} C={cpu.c}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <p className="lv-label" style={{ margin: '8px 0 2px' }}>Data memory ({size} bytes; the highlighted cell was just read or written)</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 3 }}>
        {cpu.memory.map((v, a) => (
          <div key={a} style={{ border: `1px solid ${cpu.wrote === a ? C.warn : cpu.read === a ? C.info : C.border}`, background: cpu.wrote === a ? `color-mix(in srgb, ${C.warn} 30%, transparent)` : cpu.read === a ? `color-mix(in srgb, ${C.info} 25%, transparent)` : C.surface, borderRadius: 5, textAlign: 'center', fontFamily: MONO, fontSize: 12, padding: '2px 0' }}>
            <div style={{ fontSize: 9.5, color: C.muted }}>{a}</div>
            {v}
          </div>
        ))}
      </div>
      {last && (
        <ol className="lv-note" style={{ paddingLeft: 20, margin: '10px 0 0' }} aria-live="polite">
          <li><strong>Fetch:</strong> {last.fetch}</li>
          <li><strong>Decode:</strong> {last.decode}</li>
          <li><strong>Execute:</strong> {last.execute}</li>
        </ol>
      )}
      {(note || cpu.fault) && <p className="lv-note" role="status" style={{ color: cpu.fault ? C.bad : undefined }}>{cpu.fault ?? note}</p>}
      <p className="lv-sim">A teaching model of a CPU, not a real instruction set: two 8-bit registers, a zero flag (Z) and a carry flag (C), and a small memory.</p>
    </div>
  );
}

// ─── CPU scheduler simulator ────────────────────────────────────────────────

export function SchedulerSim({ config, onUse }: VisualProps) {
  const initial: Proc[] = (Array.isArray(config.processes) ? config.processes : []).slice(0, 8).map((p: Proc) => ({ id: String(p.id), arrival: Number(p.arrival) || 0, burst: Math.max(1, Number(p.burst) || 1) }));
  const startAlgo: Algorithm = (['FCFS', 'SJF', 'SRTF', 'RR'].includes(config.algorithm) ? config.algorithm : 'FCFS') as Algorithm;
  const [algo, setAlgo] = useState<Algorithm>(startAlgo);
  const [quantum, setQuantum] = useState(clamp(Number(config.quantum) || 2, 1, 10));
  const [procs, setProcs] = useState<Proc[]>(initial);
  const result = useMemo(() => schedule(procs, algo, quantum), [procs, algo, quantum]);
  if (initial.length === 0) return null;
  const set = (i: number, key: 'arrival' | 'burst', v: string) => {
    const n = Math.trunc(Number(v));
    if (!Number.isFinite(n)) return;
    setProcs(procs.map((p, k) => (k === i ? { ...p, [key]: key === 'burst' ? clamp(n, 1, 40) : clamp(n, 0, 60) } : p)));
    onUse?.();
  };
  const lanes = [...procs.map((p) => p.id), ...(result.segments.some((s) => s.pid === null) ? ['idle'] : [])];
  const segments = result.segments.map((s) => ({ lane: s.pid ?? 'idle', start: s.start, end: s.end, label: s.pid ?? '' }));
  const input: CSSProperties = { width: '3.5rem', fontFamily: MONO, textAlign: 'center' };
  return (
    <div>
      <div className="lv-controls" role="group" aria-label="Scheduling algorithm">
        {(['FCFS', 'SJF', 'SRTF', 'RR'] as Algorithm[]).map((a) => (
          <button key={a} type="button" className="lv-btn" aria-pressed={algo === a} onClick={() => { setAlgo(a); onUse?.(); }}>{a === 'RR' ? 'Round robin' : a}</button>
        ))}
        {algo === 'RR' && (
          <>
            <label className="lv-label" htmlFor="rr-quantum">Time quantum</label>
            <input id="rr-quantum" className="lv-select" style={input} type="number" min={1} max={10} value={quantum} onChange={(e) => setQuantum(clamp(Math.trunc(Number(e.target.value)) || 1, 1, 10))} />
          </>
        )}
        <button type="button" className="lv-btn" onClick={() => { setProcs(initial); setAlgo(startAlgo); onUse?.(); }}>Reset</button>
      </div>
      <p className="lv-label" style={{ margin: '4px 0' }}>{algo === 'FCFS' ? 'First come, first served: run in arrival order, each to the end.' : algo === 'SJF' ? 'Shortest job first: when the CPU is free, pick the ready process with the smallest burst (non-preemptive).' : algo === 'SRTF' ? 'Shortest remaining time first: a newly arrived shorter job preempts the running one.' : `Round robin: each process runs for at most ${quantum} time unit${quantum === 1 ? '' : 's'}, then goes to the back of the queue.`}</p>
      <GanttChart lanes={lanes} segments={segments} max={result.makespan} unit="time" />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', margin: '8px 0' }}>
          <thead>
            <tr>{['Process', 'Arrival', 'Burst', 'Completion', 'Turnaround', 'Waiting', 'Response'].map((h) => <th key={h} style={headStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {result.results.map((r, i) => (
              <tr key={r.id}>
                <th scope="row" style={headStyle}>{r.id}</th>
                <td style={cellStyle}><input aria-label={`${r.id} arrival time`} className="lv-select" style={input} type="number" min={0} max={60} value={procs[i].arrival} onChange={(e) => set(i, 'arrival', e.target.value)} /></td>
                <td style={cellStyle}><input aria-label={`${r.id} burst time`} className="lv-select" style={input} type="number" min={1} max={40} value={procs[i].burst} onChange={(e) => set(i, 'burst', e.target.value)} /></td>
                <td style={cellStyle}>{r.completion}</td>
                <td style={cellStyle}>{r.turnaround}</td>
                <td style={cellStyle}>{r.waiting}</td>
                <td style={cellStyle}>{r.response}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" style={headStyle} colSpan={4}>Average</th>
              <td style={{ ...cellStyle, fontWeight: 800 }}>{result.avgTurnaround}</td>
              <td style={{ ...cellStyle, fontWeight: 800 }}>{result.avgWaiting}</td>
              <td style={{ ...cellStyle, fontWeight: 800 }}>{result.avgResponse}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="lv-note">Turnaround = completion − arrival. Waiting = turnaround − burst. Response = first time on the CPU − arrival. Change the numbers and watch the averages move.</p>
    </div>
  );
}

// ─── Subnet calculator ──────────────────────────────────────────────────────

export function SubnetCalc({ config, onUse }: VisualProps) {
  const [ip, setIp] = useState(String(config.ip ?? '192.168.10.0'));
  const [prefix, setPrefix] = useState(clamp(Math.trunc(Number(config.prefix)) || 24, 0, 32));
  let info: ReturnType<typeof describeSubnet> | null = null;
  let error: string | null = null;
  try {
    info = describeSubnet(ip, prefix);
  } catch (err) {
    error = err instanceof SubnetError ? err.message : 'That address could not be read.';
  }
  const split = (bin: string) => {
    const chars = bin.replace(/\./g, '');
    return (
      <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: 0.5, wordBreak: 'break-all' }}>
        {[...chars].map((c, i) => (
          <span key={i} style={{ color: i < prefix ? C.accent : C.warn, fontWeight: 700 }}>
            {c}
            {(i + 1) % 8 === 0 && i < 31 ? <span style={{ color: C.muted }}>.</span> : null}
          </span>
        ))}
      </span>
    );
  };
  return (
    <div>
      <div className="lv-controls">
        <label className="lv-label" htmlFor="subnet-ip">IPv4 address</label>
        <input id="subnet-ip" className="lv-select" style={{ width: '10rem', fontFamily: MONO }} value={ip} onChange={(e) => { setIp(e.target.value); onUse?.(); }} spellCheck={false} />
        <label className="lv-label" htmlFor="subnet-prefix">Prefix length /</label>
        <input id="subnet-prefix" className="lv-select" style={{ width: '4rem', fontFamily: MONO }} type="number" min={0} max={32} value={prefix} onChange={(e) => { setPrefix(clamp(Math.trunc(Number(e.target.value)) || 0, 0, 32)); onUse?.(); }} />
        <input aria-label="Prefix length slider" className="lv-range" type="range" min={0} max={32} value={prefix} onChange={(e) => { setPrefix(Number(e.target.value)); onUse?.(); }} />
      </div>
      {error ? (
        <p role="alert" className="lv-note" style={{ color: C.bad }}>{error}</p>
      ) : (
        info && (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', margin: '4px 0' }}>
                <tbody>
                  {([
                    ['Subnet mask', info.mask],
                    ['Wildcard mask', info.wildcard],
                    ['Network address', info.network],
                    ['Broadcast address', info.broadcast],
                    ['First usable host', info.firstHost ?? '—'],
                    ['Last usable host', info.lastHost ?? '—'],
                    ['Usable hosts', info.hosts.toLocaleString('en-US')],
                    ['Addresses in the block', info.total.toLocaleString('en-US')],
                    ['Address class (old system)', `${info.ipClass}${info.isPrivate ? ' · private range' : ''}`],
                  ] as [string, string][]).map(([k, v]) => (
                    <tr key={k}><th scope="row" style={{ ...headStyle, textAlign: 'left' }}>{k}</th><td style={{ ...cellStyle, textAlign: 'left' }}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="lv-label" style={{ margin: '6px 0 2px' }}>In binary: <span style={{ color: C.accent, fontWeight: 700 }}>network bits ({prefix})</span> and <span style={{ color: C.warn, fontWeight: 700 }}>host bits ({32 - prefix})</span></p>
            <p style={{ margin: '2px 0' }}>Address &nbsp;{split(info.binary.address)}</p>
            <p style={{ margin: '2px 0' }}>Mask &nbsp;&nbsp;&nbsp;&nbsp;{split(info.binary.mask)}</p>
            <p style={{ margin: '2px 0' }}>Network &nbsp;{split(info.binary.network)}</p>
          </>
        )
      )}
      <p className="lv-sim">The network address is the address ANDed with the mask. The host bits are what is left to number the devices.</p>
    </div>
  );
}

registerVisuals({
  circuit: { Component: CircuitVisual, interactive: true, role: 'group' },
  'truth-table': { Component: TruthTableVisual, interactive: true, role: 'group' },
  'bit-explorer': { Component: BitExplorer, interactive: true, role: 'group' },
  'asm-lab': { Component: AsmLab, interactive: true, role: 'group' },
  'scheduler-sim': { Component: SchedulerSim, interactive: true, role: 'group' },
  'subnet-calc': { Component: SubnetCalc, interactive: true, role: 'group' },
});
