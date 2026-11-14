// FILE PATH: client/lib/lesson/technical/asm.ts
//
// The toy CPU of the assembly simulator. Two 8-bit registers (A, B), a program counter, an instruction
// register, a zero flag (Z) and a carry/borrow flag (C), a small program memory (one instruction per
// address) and a data memory of 16 or 32 bytes. It is deliberately tiny so a learner can follow every
// fetch, decode and execute by eye — and it is a model of the real thing, not a real instruction set.
//
//   LOADI R, n      R = n                        immediate
//   LOAD  R, addr   R = memory[addr]             direct       LOAD R, [B]   register indirect
//   STORE R, addr   memory[addr] = R             direct       STORE R, [B]  register indirect
//   MOV R, S        R = S
//   ADD R, S        R = R + S      (sets Z, C)   SUB R, S  AND R, S  OR R, S  likewise
//   INC R / DEC R   R = R ± 1      (sets Z)
//   CMP R, S        compares R with S: Z = (R == S), C = (R < S); changes nothing else
//   JMP label       PC = label
//   JZ label        jump if Z = 1                JNZ label   jump if Z = 0
//   HALT            stop
//
// A label is a name followed by a colon (loop:), a comment starts with ; and numbers can be decimal,
// 0x hexadecimal or 0b binary. Arithmetic wraps around at 256 like an 8-bit register.

export interface Instr {
  op: string;
  /** First operand as written ("A", "5", "[B]", "loop"). */
  a?: string;
  /** Second operand as written. */
  b?: string;
  /** 1-based source line. */
  line: number;
  text: string;
}

export interface AsmError {
  line: number;
  message: string;
}

export interface AsmProgram {
  instrs: Instr[];
  labels: Record<string, number>;
  errors: AsmError[];
}

const OPS: Record<string, number> = { LOADI: 2, LOAD: 2, STORE: 2, MOV: 2, ADD: 2, SUB: 2, AND: 2, OR: 2, CMP: 2, INC: 1, DEC: 1, JMP: 1, JZ: 1, JNZ: 1, HALT: 0 };
const isReg = (s: string | undefined): s is 'A' | 'B' => s === 'A' || s === 'B';

export function parseNumber(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^0x[0-9a-f]+$/.test(t)) return parseInt(t.slice(2), 16);
  if (/^0b[01]+$/.test(t)) return parseInt(t.slice(2), 2);
  return null;
}

export function assemble(source: string): AsmProgram {
  const instrs: Instr[] = [];
  const labels: Record<string, number> = {};
  const errors: AsmError[] = [];
  source.split('\n').forEach((raw, idx) => {
    const line = idx + 1;
    let text = raw.split(';')[0].trim();
    if (!text) return;
    const label = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(text);
    if (label) {
      if (label[1] in labels) errors.push({ line, message: `The label "${label[1]}" is defined twice.` });
      labels[label[1]] = instrs.length;
      text = label[2].trim();
      if (!text) return;
    }
    const m = /^([A-Za-z]+)\s*(.*)$/.exec(text);
    if (!m) return void errors.push({ line, message: `I cannot read "${text}".` });
    const op = m[1].toUpperCase();
    if (!(op in OPS)) return void errors.push({ line, message: `Unknown instruction "${m[1]}".` });
    const operands = m[2] ? m[2].split(',').map((s) => s.trim()) : [];
    if (operands.length !== OPS[op]) return void errors.push({ line, message: `${op} needs ${OPS[op]} operand(s), found ${operands.length}.` });
    instrs.push({ op, a: operands[0], b: operands[1], line, text: `${op}${operands.length ? ' ' + operands.join(', ') : ''}` });
  });
  // Operand checks that need the label table.
  for (const ins of instrs) {
    const a = ins.a?.toUpperCase();
    const b = ins.b?.toUpperCase();
    const err = (message: string) => errors.push({ line: ins.line, message });
    switch (ins.op) {
      case 'LOADI':
        if (!isReg(a)) err('LOADI needs a register (A or B) first.');
        else if (parseNumber(ins.b!) === null) err('LOADI needs a number, such as LOADI A, 5.');
        break;
      case 'LOAD':
      case 'STORE':
        if (!isReg(a)) err(`${ins.op} needs a register (A or B) first.`);
        else if (/^\[\s*[AaBb]\s*\]$/.test(ins.b!)) break;
        else if (parseNumber(ins.b!) === null) err(`${ins.op} needs an address (a number) or a register in brackets, such as [B].`);
        break;
      case 'MOV':
      case 'ADD':
      case 'SUB':
      case 'AND':
      case 'OR':
      case 'CMP':
        if (!isReg(a) || !isReg(b)) err(`${ins.op} needs two registers, such as ${ins.op} A, B.`);
        break;
      case 'INC':
      case 'DEC':
        if (!isReg(a)) err(`${ins.op} needs a register (A or B).`);
        break;
      case 'JMP':
      case 'JZ':
      case 'JNZ':
        if (!(ins.a! in labels)) err(`There is no label called "${ins.a}".`);
        break;
    }
  }
  return { instrs, labels, errors };
}

export interface CpuState {
  pc: number;
  a: number;
  b: number;
  z: 0 | 1;
  c: 0 | 1;
  ir: string;
  memory: number[];
  halted: boolean;
  steps: number;
  /** A problem that stopped the program (bad address, running off the end…). */
  fault: string | null;
  /** Addresses touched by the last instruction, for highlighting. */
  read: number | null;
  wrote: number | null;
}

export function initCpu(memory: number[] = [], size: 16 | 32 = 16): CpuState {
  const mem = Array.from({ length: size }, (_, i) => (memory[i] ?? 0) & 255);
  return { pc: 0, a: 0, b: 0, z: 0, c: 0, ir: '—', memory: mem, halted: false, steps: 0, fault: null, read: null, wrote: null };
}

export interface StepResult {
  state: CpuState;
  fetch: string;
  decode: string;
  execute: string;
}

const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');

export function step(program: AsmProgram, before: CpuState): StepResult {
  const s: CpuState = { ...before, memory: [...before.memory], read: null, wrote: null };
  if (s.halted || s.fault) return { state: s, fetch: '—', decode: '—', execute: s.fault ?? 'The CPU has halted.' };
  const ins = program.instrs[s.pc];
  if (!ins) {
    s.fault = `The program counter reached ${s.pc}, past the last instruction. Add HALT at the end.`;
    s.halted = true;
    return { state: s, fetch: `PC = ${s.pc}: there is no instruction here`, decode: '—', execute: s.fault };
  }
  const at = s.pc;
  s.ir = ins.text;
  s.pc = at + 1;
  s.steps++;
  const fetch = `IR ← program[${at}] = "${ins.text}"; PC ← ${s.pc}`;
  const reg = (name: string | undefined) => (name!.toUpperCase() === 'A' ? s.a : s.b);
  const setReg = (name: string | undefined, v: number) => {
    if (name!.toUpperCase() === 'A') s.a = v & 255;
    else s.b = v & 255;
  };
  const addr = (operand: string): number | string => {
    const ind = /^\[\s*([AaBb])\s*\]$/.exec(operand);
    const n = ind ? reg(ind[1]) : parseNumber(operand)!;
    return n >= 0 && n < s.memory.length ? n : `Memory address ${n} does not exist (the data memory has ${s.memory.length} cells, 0–${s.memory.length - 1}).`;
  };
  const alu = (name: string, f: (x: number, y: number) => number): string => {
    const x = reg(ins.a);
    const y = reg(ins.b);
    const raw = f(x, y);
    const out = raw & 255;
    setReg(ins.a, out);
    s.z = out === 0 ? 1 : 0;
    s.c = raw > 255 || raw < 0 ? 1 : 0;
    return `${ins.a!.toUpperCase()} ← ${x} ${name} ${y} = ${out}; Z=${s.z}, C=${s.c}`;
  };
  let decode = '';
  let execute = '';
  switch (ins.op) {
    case 'LOADI': {
      const n = parseNumber(ins.b!)! & 255;
      decode = 'LOADI: immediate addressing — the value is inside the instruction.';
      setReg(ins.a, n);
      execute = `${ins.a!.toUpperCase()} ← ${n}`;
      break;
    }
    case 'LOAD': {
      const ad = addr(ins.b!);
      decode = /\[/.test(ins.b!) ? 'LOAD: register-indirect addressing — the register holds the address.' : 'LOAD: direct addressing — the instruction holds the address.';
      if (typeof ad === 'string') {
        s.fault = ad;
        s.halted = true;
        execute = ad;
      } else {
        setReg(ins.a, s.memory[ad]);
        s.read = ad;
        execute = `${ins.a!.toUpperCase()} ← memory[${ad}] = ${s.memory[ad]}`;
      }
      break;
    }
    case 'STORE': {
      const ad = addr(ins.b!);
      decode = /\[/.test(ins.b!) ? 'STORE: register-indirect addressing — the register holds the address.' : 'STORE: direct addressing — the instruction holds the address.';
      if (typeof ad === 'string') {
        s.fault = ad;
        s.halted = true;
        execute = ad;
      } else {
        s.memory[ad] = reg(ins.a);
        s.wrote = ad;
        execute = `memory[${ad}] ← ${reg(ins.a)} (0x${hex2(reg(ins.a))})`;
      }
      break;
    }
    case 'MOV':
      decode = 'MOV: register addressing — both operands are registers.';
      setReg(ins.a, reg(ins.b));
      execute = `${ins.a!.toUpperCase()} ← ${reg(ins.b)}`;
      break;
    case 'ADD': decode = 'ADD: the ALU adds the two registers.'; execute = alu('+', (x, y) => x + y); break;
    case 'SUB': decode = 'SUB: the ALU subtracts the second register from the first.'; execute = alu('−', (x, y) => x - y); break;
    case 'AND': decode = 'AND: the ALU ANDs every bit pair.'; execute = alu('AND', (x, y) => x & y); break;
    case 'OR': decode = 'OR: the ALU ORs every bit pair.'; execute = alu('OR', (x, y) => x | y); break;
    case 'INC': {
      decode = 'INC: the ALU adds 1.';
      const v = (reg(ins.a) + 1) & 255;
      setReg(ins.a, v);
      s.z = v === 0 ? 1 : 0;
      execute = `${ins.a!.toUpperCase()} ← ${v}; Z=${s.z}`;
      break;
    }
    case 'DEC': {
      decode = 'DEC: the ALU subtracts 1.';
      const v = (reg(ins.a) - 1) & 255;
      setReg(ins.a, v);
      s.z = v === 0 ? 1 : 0;
      execute = `${ins.a!.toUpperCase()} ← ${v}; Z=${s.z}`;
      break;
    }
    case 'CMP': {
      decode = 'CMP: the ALU subtracts but keeps only the flags.';
      const x = reg(ins.a);
      const y = reg(ins.b);
      s.z = x === y ? 1 : 0;
      s.c = x < y ? 1 : 0;
      execute = `compare ${x} with ${y}: Z=${s.z}, C=${s.c}`;
      break;
    }
    case 'JMP':
    case 'JZ':
    case 'JNZ': {
      const target = program.labels[ins.a!];
      const take = ins.op === 'JMP' || (ins.op === 'JZ' && s.z === 1) || (ins.op === 'JNZ' && s.z === 0);
      decode = ins.op === 'JMP' ? 'JMP: always jump.' : `${ins.op}: jump when Z = ${ins.op === 'JZ' ? 1 : 0}.`;
      if (take) s.pc = target;
      execute = take ? `jump taken: PC ← ${target} (${ins.a})` : `jump not taken (Z = ${s.z}): PC stays ${s.pc}`;
      break;
    }
    case 'HALT':
      decode = 'HALT: stop the clock.';
      s.halted = true;
      execute = 'The CPU halts.';
      break;
  }
  return { state: s, fetch, decode, execute };
}

/** Runs until HALT, a fault or the step limit. */
export function run(program: AsmProgram, start: CpuState, maxSteps = 500): { state: CpuState; trace: StepResult[]; hitLimit: boolean } {
  let state = start;
  const trace: StepResult[] = [];
  while (!state.halted && !state.fault && trace.length < maxSteps) {
    const r = step(program, state);
    trace.push(r);
    state = r.state;
  }
  return { state, trace, hitLimit: !state.halted && !state.fault };
}
