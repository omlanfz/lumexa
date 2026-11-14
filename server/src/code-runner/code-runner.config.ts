// FILE PATH: server/src/code-runner/code-runner.config.ts
//
// The Code Lab (a lesson block that runs what a learner writes) runs JavaScript, Python, SQL and HTML inside
// the learner's own browser. C, C++ and Java need a compiler, so they run on a separate CODE-RUNNER SERVICE —
// an isolated sandbox (containers, no network, strict time/memory limits) — that this server only talks to.
// The Lumexa server never compiles or runs learner code itself.
//
// The service must speak the Piston HTTP API (https://github.com/engineer-man/piston, self-hosted):
//   GET  {CODE_RUNNER_URL}/api/v2/runtimes       the languages it has installed
//   POST {CODE_RUNNER_URL}/api/v2/execute        run a program
//
//   CODE_RUNNER_URL     base address of the service, e.g. http://piston.internal:2000 (empty = not configured)
//   CODE_RUNNER_TOKEN   optional bearer token the service expects
//
// With no CODE_RUNNER_URL the Code Lab shows no Run button for C, C++ and Java and says why.

export type RunnerLanguage = 'c' | 'cpp' | 'java';

export const RUNNER_LANGUAGES: Record<RunnerLanguage, { label: string; /** the language key Piston uses */ piston: string; file: string }> = {
  c: { label: 'C (GCC)', piston: 'c', file: 'main.c' },
  cpp: { label: 'C++ (G++)', piston: 'c++', file: 'main.cpp' },
  java: { label: 'Java (JDK)', piston: 'java', file: 'Main.java' },
};

export const RUNNER_LIMITS = {
  maxCodeChars: 20_000,
  maxStdinChars: 4_000,
  maxOutputChars: 100_000,
  compileTimeoutMs: 10_000,
  runTimeoutMs: 3_000,
  /** bytes */
  runMemoryLimit: 128 * 1024 * 1024,
  /** What the HTTP call to the service may take in total. */
  requestTimeoutMs: 20_000,
} as const;

export interface CodeRunnerConfig {
  url: string | null;
  token: string | null;
}

export function readCodeRunnerConfig(env: NodeJS.ProcessEnv = process.env): CodeRunnerConfig {
  const raw = (env.CODE_RUNNER_URL ?? '').trim().replace(/\/+$/, '');
  let url: string | null = null;
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') url = raw;
    } catch {
      url = null;
    }
  }
  return { url, token: (env.CODE_RUNNER_TOKEN ?? '').trim() || null };
}
