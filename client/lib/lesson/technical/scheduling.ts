// FILE PATH: client/lib/lesson/technical/scheduling.ts
//
// CPU scheduling for the scheduler simulator. Time moves in whole units. Algorithms:
//   FCFS  first come, first served (non-preemptive)
//   SJF   shortest job first (non-preemptive, ties by arrival then input order)
//   SRTF  shortest remaining time first (preemptive SJF)
//   RR    round robin with a time quantum
// The result is a list of run segments (idle gaps included as pid null) and, for each process, its
// completion, turnaround (completion - arrival), waiting (turnaround - burst) and response
// (first run - arrival) times.

export type Algorithm = 'FCFS' | 'SJF' | 'SRTF' | 'RR';

export interface Proc {
  id: string;
  arrival: number;
  burst: number;
}

export interface Segment {
  pid: string | null;
  start: number;
  end: number;
}

export interface ProcResult extends Proc {
  firstRun: number;
  completion: number;
  turnaround: number;
  waiting: number;
  response: number;
}

export interface ScheduleResult {
  segments: Segment[];
  results: ProcResult[];
  avgWaiting: number;
  avgTurnaround: number;
  avgResponse: number;
  makespan: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function push(segments: Segment[], pid: string | null, start: number, end: number) {
  if (end <= start) return;
  const last = segments[segments.length - 1];
  if (last && last.pid === pid && last.end === start) last.end = end;
  else segments.push({ pid, start, end });
}

export function schedule(procs: Proc[], algorithm: Algorithm, quantum = 2): ScheduleResult {
  const list = procs.map((p, order) => ({ ...p, order, remaining: p.burst, firstRun: -1, completion: -1 }));
  const segments: Segment[] = [];
  let t = 0;
  let done = 0;
  const n = list.length;
  const arrived = () => list.filter((p) => p.arrival <= t && p.remaining > 0);
  const nextArrival = () => Math.min(...list.filter((p) => p.remaining > 0 && p.arrival > t).map((p) => p.arrival));
  const byArrival = (a: { arrival: number; order: number }, b: { arrival: number; order: number }) => a.arrival - b.arrival || a.order - b.order;

  if (algorithm === 'RR') {
    const queue: typeof list = [];
    const seen = new Set<number>();
    const admit = () => {
      for (const p of [...list].sort(byArrival)) if (p.arrival <= t && p.remaining > 0 && !seen.has(p.order)) (queue.push(p), seen.add(p.order));
    };
    admit();
    while (done < n) {
      if (queue.length === 0) {
        const jump = nextArrival();
        push(segments, null, t, jump);
        t = jump;
        admit();
        continue;
      }
      const p = queue.shift()!;
      if (p.firstRun < 0) p.firstRun = t;
      const run = Math.min(quantum, p.remaining);
      push(segments, p.id, t, t + run);
      t += run;
      p.remaining -= run;
      admit(); // arrivals during the slice go ahead of the preempted process
      if (p.remaining > 0) queue.push(p);
      else (p.completion = t, done++);
    }
  } else if (algorithm === 'SRTF') {
    while (done < n) {
      const ready = arrived();
      if (ready.length === 0) {
        const jump = nextArrival();
        push(segments, null, t, jump);
        t = jump;
        continue;
      }
      ready.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival || a.order - b.order);
      const p = ready[0];
      if (p.firstRun < 0) p.firstRun = t;
      // Run until it finishes or the next arrival that could preempt it.
      const arrivals = list.filter((x) => x.remaining > 0 && x.arrival > t).map((x) => x.arrival);
      const horizon = arrivals.length ? Math.min(...arrivals) : Infinity;
      const run = Math.min(p.remaining, horizon - t);
      push(segments, p.id, t, t + run);
      t += run;
      p.remaining -= run;
      if (p.remaining === 0) (p.completion = t, done++);
    }
  } else {
    while (done < n) {
      const ready = arrived();
      if (ready.length === 0) {
        const jump = nextArrival();
        push(segments, null, t, jump);
        t = jump;
        continue;
      }
      ready.sort(algorithm === 'SJF' ? (a, b) => a.burst - b.burst || byArrival(a, b) : byArrival);
      const p = ready[0];
      p.firstRun = t;
      push(segments, p.id, t, t + p.burst);
      t += p.burst;
      p.remaining = 0;
      p.completion = t;
      done++;
    }
  }

  const results: ProcResult[] = list.map((p) => {
    const turnaround = p.completion - p.arrival;
    return { id: p.id, arrival: p.arrival, burst: p.burst, firstRun: p.firstRun, completion: p.completion, turnaround, waiting: turnaround - p.burst, response: p.firstRun - p.arrival };
  });
  const avg = (f: (r: ProcResult) => number) => (results.length ? round2(results.reduce((s, r) => s + f(r), 0) / results.length) : 0);
  return { segments, results, avgWaiting: avg((r) => r.waiting), avgTurnaround: avg((r) => r.turnaround), avgResponse: avg((r) => r.response), makespan: t };
}
