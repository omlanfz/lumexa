// FILE PATH: server/src/code-runner/code-runner.service.ts
//
// Sends a learner's C, C++ or Java program to the configured code-runner service and returns what it printed.
// Nothing is compiled or executed in this process. See code-runner.config.ts.

import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  RUNNER_LANGUAGES,
  RUNNER_LIMITS,
  readCodeRunnerConfig,
  type CodeRunnerConfig,
  type RunnerLanguage,
} from './code-runner.config';

export interface LanguageAvailability {
  available: boolean;
  label: string;
}

export interface LanguagesResponse {
  /** True when a code-runner service is configured and answering. */
  enabled: boolean;
  languages: Partial<Record<RunnerLanguage, LanguageAvailability>>;
}

export interface RunResponse {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timeMs: number;
  /** Which limit ended the run, if one did. */
  limit?: 'time' | 'output' | 'memory';
}

interface PistonRuntime {
  language: string;
  aliases?: string[];
}

interface PistonStage {
  stdout?: string;
  stderr?: string;
  output?: string;
  code?: number | null;
  signal?: string | null;
}

interface PistonResult {
  run?: PistonStage;
  compile?: PistonStage;
  message?: string;
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const LANGUAGES_TTL_OK_MS = 5 * 60_000;
const LANGUAGES_TTL_FAIL_MS = 30_000;

const clip = (text: string | undefined, max: number): { text: string; clipped: boolean } => {
  const t = text ?? '';
  return t.length > max ? { text: t.slice(0, max) + '\n… (output cut off)', clipped: true } : { text: t, clipped: false };
};

@Injectable()
export class CodeRunnerService {
  private readonly logger = new Logger(CodeRunnerService.name);
  private cache: { at: number; ttl: number; value: LanguagesResponse } | null = null;

  /** Replaced in tests; the real thing is the platform's fetch. */
  fetchFn: FetchFn = (input, init) => fetch(input, init);
  /** Re-read on every call so a changed environment variable (tests, a restart) is always seen. */
  config: () => CodeRunnerConfig = () => readCodeRunnerConfig();

  private headers(cfg: CodeRunnerConfig): Record<string, string> {
    return { 'Content-Type': 'application/json', Accept: 'application/json', ...(cfg.token ? { Authorization: cfg.token } : {}) };
  }

  private async call(cfg: CodeRunnerConfig, path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await this.fetchFn(`${cfg.url}${path}`, { ...init, headers: { ...this.headers(cfg), ...(init.headers as Record<string, string> | undefined) }, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Which languages the service can run right now. Never throws: an unreachable service means "none". */
  async languages(): Promise<LanguagesResponse> {
    const cfg = this.config();
    if (!cfg.url) return { enabled: false, languages: {} };
    if (this.cache && Date.now() - this.cache.at < this.cache.ttl) return this.cache.value;
    let value: LanguagesResponse = { enabled: false, languages: {} };
    let ttl = LANGUAGES_TTL_FAIL_MS;
    try {
      const res = await this.call(cfg, '/api/v2/runtimes', { method: 'GET' }, 5_000);
      if (res.ok) {
        const runtimes = (await res.json()) as PistonRuntime[];
        const has = (key: string) => runtimes.some((r) => r.language === key || (r.aliases ?? []).includes(key));
        const languages: LanguagesResponse['languages'] = {};
        for (const [lab, info] of Object.entries(RUNNER_LANGUAGES) as [RunnerLanguage, (typeof RUNNER_LANGUAGES)[RunnerLanguage]][]) {
          languages[lab] = { available: has(info.piston), label: info.label };
        }
        value = { enabled: Object.values(languages).some((l) => l?.available), languages };
        ttl = LANGUAGES_TTL_OK_MS;
      } else {
        this.logger.warn(`The code runner answered ${res.status} to the language list.`);
      }
    } catch (err) {
      this.logger.warn(`The code runner is not reachable: ${(err as Error).message}`);
    }
    this.cache = { at: Date.now(), ttl, value };
    return value;
  }

  async run(input: { language: RunnerLanguage; code: string; stdin?: string }): Promise<RunResponse> {
    const info = RUNNER_LANGUAGES[input.language];
    if (!info) throw new BadRequestException('That language cannot be run here.');
    const code = input.code ?? '';
    const stdin = input.stdin ?? '';
    if (!code.trim()) throw new BadRequestException('There is no code to run.');
    if (code.length > RUNNER_LIMITS.maxCodeChars) throw new BadRequestException('That program is too long to run here.');
    if (stdin.length > RUNNER_LIMITS.maxStdinChars) throw new BadRequestException('The input is too long.');

    const cfg = this.config();
    if (!cfg.url) throw new ServiceUnavailableException('Running C, C++ and Java is not set up on this server.');
    const available = (await this.languages()).languages[input.language]?.available;
    if (!available) throw new ServiceUnavailableException(`The code runner has no ${info.label} compiler right now.`);

    const started = Date.now();
    let res: Response;
    try {
      res = await this.call(
        cfg,
        '/api/v2/execute',
        {
          method: 'POST',
          body: JSON.stringify({
            language: info.piston,
            version: '*',
            files: [{ name: info.file, content: code }],
            stdin,
            compile_timeout: RUNNER_LIMITS.compileTimeoutMs,
            run_timeout: RUNNER_LIMITS.runTimeoutMs,
            run_memory_limit: RUNNER_LIMITS.runMemoryLimit,
          }),
        },
        RUNNER_LIMITS.requestTimeoutMs,
      );
    } catch (err) {
      this.logger.warn(`The code runner call failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('The code runner did not answer. Try again in a moment.');
    }
    if (!res.ok) {
      this.logger.warn(`The code runner answered ${res.status}.`);
      throw new ServiceUnavailableException('The code runner could not run that program. Try again in a moment.');
    }
    const body = (await res.json()) as PistonResult;
    return this.toResponse(body, Date.now() - started);
  }

  /** Maps the service's answer to what the Code Lab shows. Exported through run(); kept separate to test it on its own. */
  toResponse(body: PistonResult, timeMs: number): RunResponse {
    const compile = body.compile;
    if (compile && typeof compile.code === 'number' && compile.code !== 0) {
      const err = clip(compile.stderr || compile.output, RUNNER_LIMITS.maxOutputChars);
      return { ok: false, stdout: '', stderr: err.text || 'The program did not compile.', exitCode: compile.code, timeMs };
    }
    const run = body.run;
    if (!run) return { ok: false, stdout: '', stderr: body.message ?? 'The code runner returned no result.', exitCode: null, timeMs };
    const out = clip(run.stdout, RUNNER_LIMITS.maxOutputChars);
    const err = clip(run.stderr, RUNNER_LIMITS.maxOutputChars);
    const killed = run.signal === 'SIGKILL' || run.signal === 'SIGTERM';
    let limit: RunResponse['limit'];
    if (killed) limit = /memory|alloc/i.test(err.text) ? 'memory' : 'time';
    else if (out.clipped || err.clipped) limit = 'output';
    const exitCode = typeof run.code === 'number' ? run.code : null;
    return {
      ok: exitCode === 0 && !killed,
      stdout: out.text,
      stderr: killed ? `${err.text}${err.text ? '\n' : ''}The program was stopped: it ran for too long or used too much memory.` : err.text,
      exitCode,
      timeMs,
      ...(limit ? { limit } : {}),
    };
  }
}
