import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTruthTable, equivalent, evaluate as evalLogic, parseExpr, LogicError } from './logic';
import { clock, evaluate as evalCircuit, layoutCircuit, truthTable, type CircuitConfig } from './circuit';
import { assemble, initCpu, parseNumber, run, step } from './asm';
import { schedule } from './scheduling';
import { describeSubnet, parseIp, prefixForHosts, SubnetError } from './subnet';
import { isComplete, isDeterministic, runAutomaton } from './automaton';
import { buildChaining, buildProbing, hashKey } from './hash';
import { fromBits, grouped, negate, signedValue, toBase, toBits } from './bits';

describe('logic expressions', () => {
  it('evaluates with the usual precedence', () => {
    const rows = buildTruthTable(['p', 'q'], ['p and q', 'p or q', 'p xor q', 'p implies q', 'p iff q', 'not p']);
    // First row is p=T, q=T; textbook order puts true first.
    assert.deepEqual(rows[0].outputs, [true, true, false, true, true, false]);
    assert.deepEqual(rows[1].inputs, [true, false]);
    assert.deepEqual(rows[1].outputs, [false, true, true, false, false, false]);
    assert.deepEqual(rows[3].outputs, [false, false, false, true, true, true]);
  });
  it('and binds tighter than or, implies is right-associative', () => {
    const t = (e: string, p: boolean, q: boolean, r: boolean) => evalLogic(parseExpr(e, ['p', 'q', 'r']), { p, q, r });
    assert.equal(t('p or q and r', true, false, false), true); // p or (q and r)
    assert.equal(t('(p or q) and r', true, false, false), false);
    assert.equal(t('p -> q -> r', false, false, false), true); // p -> (q -> r)
    assert.equal(t('not p or q', true, false, false), false); // (not p) or q
  });
  it('accepts symbols and words alike', () => {
    assert.ok(equivalent(['p', 'q'], '¬(p ∧ q)', '¬p ∨ ¬q')); // De Morgan
    assert.ok(equivalent(['p', 'q'], 'p → q', 'not p or q'));
    assert.ok(!equivalent(['p', 'q'], 'p and q', 'p or q'));
    assert.ok(equivalent(['p', 'q', 'r'], 'p and (q or r)', '(p and q) or (p and r)'));
  });
  it('rejects bad input instead of running anything', () => {
    assert.throws(() => parseExpr('p and', ['p']), LogicError);
    assert.throws(() => parseExpr('p and z', ['p']), LogicError);
    assert.throws(() => parseExpr('process.exit()', ['p']), LogicError);
    assert.throws(() => parseExpr('(p', ['p']), LogicError);
  });
});

const halfAdder: CircuitConfig = {
  inputs: [{ id: 'A' }, { id: 'B' }],
  gates: [
    { id: 'x', type: 'XOR', in: ['A', 'B'] },
    { id: 'c', type: 'AND', in: ['A', 'B'] },
  ],
  outputs: [{ id: 'S', from: 'x' }, { id: 'Cout', from: 'c' }],
};

describe('circuit simulator', () => {
  it('a half adder adds two bits', () => {
    const rows = truthTable(halfAdder);
    assert.deepEqual(rows.map((r) => [...r.inputs, ...r.outputs]), [[0, 0, 0, 0], [0, 1, 1, 0], [1, 0, 1, 0], [1, 1, 0, 1]]);
  });
  it('an SR latch built from NOR gates remembers', () => {
    const latch: CircuitConfig = {
      inputs: [{ id: 'S' }, { id: 'R' }],
      gates: [
        { id: 'q', type: 'NOR', in: ['R', 'qb'] },
        { id: 'qb', type: 'NOR', in: ['S', 'q'] },
      ],
      outputs: [{ id: 'Q', from: 'q' }],
    };
    let state: Record<string, 0 | 1> = {};
    const set = (S: 0 | 1, R: 0 | 1) => {
      // Evaluate with the stored values, then remember the settled values (clock stores combinational memory).
      const e = evalCircuit(latch, { S, R }, state);
      state = { ...state, '~q': e.values.q, '~qb': e.values.qb };
      return e.values.q;
    };
    assert.equal(set(1, 0), 1);
    assert.equal(set(0, 0), 1, 'holds 1');
    assert.equal(set(0, 1), 0);
    assert.equal(set(0, 0), 0, 'holds 0');
  });
  it('flip-flops change only on the clock, all together', () => {
    const regs: CircuitConfig = {
      inputs: [{ id: 'D' }, { id: 'T' }, { id: 'J' }, { id: 'K' }],
      gates: [
        { id: 'd', type: 'DFF', in: ['D'] },
        { id: 't', type: 'TFF', in: ['T'] },
        { id: 'jk', type: 'JKFF', in: ['J', 'K'] },
      ],
      outputs: [{ id: 'Qd', from: 'd' }, { id: 'Qt', from: 't' }, { id: 'Qjk', from: 'jk' }],
    };
    const inputs = { D: 1, T: 1, J: 1, K: 0 } as Record<string, 0 | 1>;
    let state: Record<string, 0 | 1> = {};
    assert.deepEqual([evalCircuit(regs, inputs, state).values.d, evalCircuit(regs, inputs, state).values.t], [0, 0], 'nothing changes without a clock');
    state = clock(regs, inputs, state);
    assert.deepEqual([state.d, state.t, state.jk], [1, 1, 1]);
    state = clock(regs, { ...inputs, J: 0, K: 1 }, state);
    assert.deepEqual([state.d, state.t, state.jk], [1, 0, 0], 'T toggles, JK resets');
    state = clock(regs, { ...inputs, J: 1, K: 1 }, state);
    assert.equal(state.jk, 1, 'J=K=1 toggles');
  });
  it('lays out inputs, gates and outputs in columns', () => {
    const l = layoutCircuit(halfAdder);
    assert.equal(l.cols, 3);
    assert.deepEqual(l.nodes.filter((n) => n.kind === 'input').map((n) => n.col), [0, 0]);
    assert.ok(l.nodes.filter((n) => n.kind === 'gate').every((n) => n.col === 1));
    assert.ok(l.nodes.filter((n) => n.kind === 'output').every((n) => n.col === 2));
  });
});

describe('bits', () => {
  it('converts between bases and two’s complement', () => {
    assert.deepEqual(toBits(5, 4), [0, 1, 0, 1]);
    assert.equal(fromBits([1, 0, 1, 1]), 11);
    assert.equal(toBase(255, 16), 'FF');
    assert.equal(toBase(8, 2, 8), '00001000');
    assert.equal(signedValue(0b11111111, 8), -1);
    assert.equal(signedValue(0b10000000, 8), -128);
    assert.equal(signedValue(0b01111111, 8), 127);
    assert.equal(negate(5, 8), 251); // -5 is 11111011
    assert.equal(grouped([1, 0, 1, 1, 0, 1, 0, 1]), '1011 0101');
  });
});

describe('assembly simulator', () => {
  const add = `
    LOADI A, 5      ; first number
    LOADI B, 3
    ADD A, B
    STORE A, 7
    HALT`;
  it('assembles and runs a program, step by step', () => {
    const p = assemble(add);
    assert.deepEqual(p.errors, []);
    let s = initCpu();
    const r1 = step(p, s);
    assert.match(r1.fetch, /LOADI A, 5/);
    assert.equal(r1.state.a, 5);
    s = r1.state;
    const done = run(p, s);
    assert.equal(done.state.memory[7], 8);
    assert.equal(done.state.a, 8);
    assert.ok(done.state.halted);
  });
  it('loops with a flag and a label', () => {
    const p = assemble(`
      LOADI A, 0
      LOADI B, 3
      loop: INC A
      DEC B
      JNZ loop
      HALT`);
    assert.deepEqual(p.errors, []);
    const done = run(p, initCpu());
    assert.equal(done.state.a, 3);
    assert.equal(done.state.b, 0);
  });
  it('supports direct and register-indirect addressing', () => {
    const p = assemble(`
      LOAD A, 2        ; direct
      LOADI B, 3
      LOAD A, [B]      ; indirect: address 3
      HALT`);
    const mem = [0, 0, 11, 22];
    const done = run(p, initCpu(mem));
    assert.equal(done.state.a, 22);
  });
  it('wraps at 8 bits and sets the carry flag', () => {
    const p = assemble('LOADI A, 250\nLOADI B, 10\nADD A, B\nHALT');
    const done = run(p, initCpu());
    assert.equal(done.state.a, 4);
    assert.equal(done.state.c, 1);
  });
  it('reports mistakes in plain words', () => {
    assert.match(assemble('FOO A, B').errors[0].message, /Unknown instruction/);
    assert.match(assemble('ADD A').errors[0].message, /needs 2 operand/);
    assert.match(assemble('JMP nowhere').errors[0].message, /no label/);
    assert.match(assemble('LOADI C, 1').errors[0].message, /register/);
    const bad = run(assemble('LOAD A, 99\nHALT'), initCpu());
    assert.match(bad.state.fault ?? '', /does not exist/);
    const off = run(assemble('LOADI A, 1'), initCpu());
    assert.match(off.state.fault ?? '', /Add HALT/);
  });
  it('stops a runaway loop at the step limit', () => {
    const r = run(assemble('loop: JMP loop'), initCpu(), 50);
    assert.equal(r.hitLimit, true);
    assert.equal(r.trace.length, 50);
  });
  it('parses numbers in three bases', () => {
    assert.equal(parseNumber('0x1F'), 31);
    assert.equal(parseNumber('0b101'), 5);
    assert.equal(parseNumber('42'), 42);
    assert.equal(parseNumber('x'), null);
  });
});

describe('CPU scheduling', () => {
  const procs = [
    { id: 'P1', arrival: 0, burst: 8 },
    { id: 'P2', arrival: 1, burst: 4 },
    { id: 'P3', arrival: 2, burst: 9 },
    { id: 'P4', arrival: 3, burst: 5 },
  ];
  it('FCFS runs in arrival order', () => {
    const r = schedule(procs, 'FCFS');
    assert.deepEqual(r.segments.map((s) => [s.pid, s.start, s.end]), [['P1', 0, 8], ['P2', 8, 12], ['P3', 12, 21], ['P4', 21, 26]]);
    assert.equal(r.avgWaiting, 8.75); // (0 + 7 + 10 + 18) / 4
    assert.equal(r.avgTurnaround, 15.25);
  });
  it('SJF picks the shortest ready job when the CPU is free', () => {
    const r = schedule(procs, 'SJF');
    assert.deepEqual(r.segments.map((s) => s.pid), ['P1', 'P2', 'P4', 'P3']);
    assert.equal(r.avgWaiting, 7.75);
  });
  it('SRTF preempts (the classic textbook answer: 6.5 average waiting)', () => {
    const r = schedule(procs, 'SRTF');
    assert.equal(r.avgWaiting, 6.5);
    assert.equal(r.results.find((x) => x.id === 'P1')!.completion, 17);
  });
  it('round robin with quantum 3', () => {
    const r = schedule([{ id: 'A', arrival: 0, burst: 5 }, { id: 'B', arrival: 0, burst: 3 }, { id: 'C', arrival: 0, burst: 2 }], 'RR', 3);
    assert.deepEqual(r.segments.map((s) => [s.pid, s.start, s.end]), [['A', 0, 3], ['B', 3, 6], ['C', 6, 8], ['A', 8, 10]]);
    assert.equal(r.results.find((x) => x.id === 'B')!.completion, 6);
    assert.equal(r.avgResponse, 3); // 0, 3, 6
  });
  it('shows idle time when nothing has arrived', () => {
    const r = schedule([{ id: 'A', arrival: 3, burst: 2 }], 'FCFS');
    assert.deepEqual(r.segments, [{ pid: null, start: 0, end: 3 }, { pid: 'A', start: 3, end: 5 }]);
  });
});

describe('subnets', () => {
  it('describes a /26', () => {
    const s = describeSubnet('192.168.10.77', 26);
    assert.equal(s.mask, '255.255.255.192');
    assert.equal(s.network, '192.168.10.64');
    assert.equal(s.broadcast, '192.168.10.127');
    assert.equal(s.firstHost, '192.168.10.65');
    assert.equal(s.lastHost, '192.168.10.126');
    assert.equal(s.hosts, 62);
    assert.equal(s.wildcard, '0.0.0.63');
    assert.equal(s.ipClass, 'C');
    assert.ok(s.isPrivate);
  });
  it('handles /24, /30, /31, /32 and /0', () => {
    assert.equal(describeSubnet('10.0.0.5', 24).hosts, 254);
    assert.equal(describeSubnet('10.0.0.5', 30).hosts, 2);
    assert.equal(describeSubnet('10.0.0.4', 31).hosts, 2);
    assert.equal(describeSubnet('10.0.0.4', 32).hosts, 1);
    assert.equal(describeSubnet('1.2.3.4', 0).network, '0.0.0.0');
    assert.equal(describeSubnet('1.2.3.4', 0).total, 4294967296);
  });
  it('rejects bad addresses and finds the prefix for a number of hosts', () => {
    assert.throws(() => parseIp('300.1.1.1'), SubnetError);
    assert.throws(() => parseIp('1.2.3'), SubnetError);
    assert.throws(() => describeSubnet('1.2.3.4', 33), SubnetError);
    assert.equal(prefixForHosts(50), 26);
    assert.equal(prefixForHosts(60), 26);
    assert.equal(prefixForHosts(62), 26);
    assert.equal(prefixForHosts(63), 25);
    assert.equal(prefixForHosts(2), 30);
  });
});

describe('automata', () => {
  // Strings over {0,1} that contain an even number of 1s.
  const even = { states: ['E', 'O'], start: 'E', accepting: ['E'], transitions: [{ from: 'E', to: 'E', on: '0' }, { from: 'E', to: 'O', on: '1' }, { from: 'O', to: 'O', on: '0' }, { from: 'O', to: 'E', on: '1' }] };
  it('runs a DFA and says accepted or rejected', () => {
    assert.equal(runAutomaton(even, '').accepted, true);
    assert.equal(runAutomaton(even, '1').accepted, false);
    assert.equal(runAutomaton(even, '1101').accepted, false);
    assert.equal(runAutomaton(even, '1010').accepted, true);
    assert.equal(isDeterministic(even), true);
    assert.equal(isComplete(even), true);
  });
  it('runs an NFA with several active states', () => {
    // Strings over {a,b} ending in "ab".
    const nfa = { states: ['s', 'x', 'f'], start: 's', accepting: ['f'], transitions: [{ from: 's', to: 's', on: 'a,b' }, { from: 's', to: 'x', on: 'a' }, { from: 'x', to: 'f', on: 'b' }] };
    assert.equal(isDeterministic(nfa), false);
    assert.equal(runAutomaton(nfa, 'abab').accepted, true);
    assert.equal(runAutomaton(nfa, 'aba').accepted, false);
    assert.deepEqual(runAutomaton(nfa, 'a').steps[1].active, ['s', 'x']);
  });
  it('rejects when stuck', () => {
    const partial = { states: ['a', 'b'], start: 'a', accepting: ['b'], transitions: [{ from: 'a', to: 'b', on: '1' }] };
    const r = runAutomaton(partial, '10');
    assert.equal(r.accepted, false);
    assert.match(r.steps[r.steps.length - 1].note, /stuck/);
  });
});

describe('hashing', () => {
  it('computes the simple hash functions', () => {
    assert.equal(hashKey('abc', 'sum-mod', 7), (97 + 98 + 99) % 7);
    assert.equal(hashKey('bangla', 'length-mod', 5), 1);
    assert.equal(hashKey('Dhaka', 'first-letter-mod', 10), 3);
  });
  it('shows collisions in chaining and linear probing', () => {
    const keys = ['ab', 'ba', 'cd'];
    const chain = buildChaining(keys, 'sum-mod', 5); // ab=195 -> 0, ba=195 -> 0, cd=199 -> 4
    assert.deepEqual(chain.buckets[0], ['ab', 'ba']);
    assert.equal(chain.collisions, 1);
    const probe = buildProbing(keys, 'sum-mod', 5);
    assert.deepEqual(probe.slots, ['ab', 'ba', null, null, 'cd']);
    assert.equal(probe.collisions, 1);
  });
  it('reports a full table instead of looping forever', () => {
    const p = buildProbing(['a', 'b', 'c', 'd'], 'length-mod', 3);
    assert.equal(p.failed.length, 1);
  });
});

void fromBits;
