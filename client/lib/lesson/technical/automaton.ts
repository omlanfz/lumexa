// FILE PATH: client/lib/lesson/technical/automaton.ts
//
// Finite automata for the automaton visual. A transition reads one symbol (a transition can list several
// symbols, "a,b"). The simulator keeps the SET of states the machine could be in, so a deterministic
// automaton (one state at a time) and a nondeterministic one (several) run with the same code. A machine
// with no transition for a symbol "dies": it rejects the string.

export interface Transition { from: string; to: string; on: string }
export interface AutomatonConfig {
  states: string[];
  transitions: Transition[];
  start: string;
  accepting: string[];
}

export const symbolsOf = (t: Transition): string[] => t.on.split(',').map((s) => s.trim()).filter(Boolean);

export function alphabetOf(cfg: AutomatonConfig): string[] {
  return [...new Set(cfg.transitions.flatMap(symbolsOf))].sort();
}

/** True when no state has two transitions on the same symbol (the machine is a DFA, though maybe not complete). */
export function isDeterministic(cfg: AutomatonConfig): boolean {
  const seen = new Set<string>();
  for (const t of cfg.transitions)
    for (const sym of symbolsOf(t)) {
      const k = `${t.from}|${sym}`;
      if (seen.has(k)) return false;
      seen.add(k);
    }
  return true;
}

/** True when every state has a transition for every symbol. */
export function isComplete(cfg: AutomatonConfig): boolean {
  const have = new Set(cfg.transitions.flatMap((t) => symbolsOf(t).map((s) => `${t.from}|${s}`)));
  return cfg.states.every((st) => alphabetOf(cfg).every((sym) => have.has(`${st}|${sym}`)));
}

export interface RunStep {
  /** The symbol just read (null before the first). */
  symbol: string | null;
  /** The states the machine is in after reading it. */
  active: string[];
  note: string;
}

export interface RunResult {
  steps: RunStep[];
  accepted: boolean;
}

export function runAutomaton(cfg: AutomatonConfig, input: string): RunResult {
  let active = [cfg.start];
  const steps: RunStep[] = [{ symbol: null, active, note: `Start in ${cfg.start}.` }];
  let i = 0;
  for (const ch of input) {
    i++;
    const next = new Set<string>();
    for (const st of active) for (const t of cfg.transitions) if (t.from === st && symbolsOf(t).includes(ch)) next.add(t.to);
    active = [...next].sort();
    steps.push({
      symbol: ch,
      active,
      note: active.length === 0 ? `Read "${ch}" (symbol ${i}): no transition — the machine is stuck and rejects.` : `Read "${ch}" (symbol ${i}): now in ${active.join(' or ')}.`,
    });
    if (active.length === 0) break;
  }
  // Accepted only if every symbol was read (the machine did not get stuck) and it ends in an accepting state.
  const accepted = steps.length - 1 === input.length && active.some((s) => cfg.accepting.includes(s));
  return { steps, accepted };
}
