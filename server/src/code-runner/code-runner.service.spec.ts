import * as http from 'http';
import type { AddressInfo } from 'net';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { CodeRunnerService } from './code-runner.service';
import { readCodeRunnerConfig } from './code-runner.config';

// A tiny stand-in for the Piston service, so the REAL HTTP path (fetch, headers, timeouts, JSON) is exercised.
interface Fake {
  url: string;
  requests: { path: string; method: string; body: unknown; auth: string | undefined }[];
  setRuntimes: (r: unknown[]) => void;
  setExecute: (r: unknown, status?: number) => void;
  close: () => Promise<void>;
}

async function fakePiston(): Promise<Fake> {
  let runtimes: unknown[] = [
    { language: 'c', aliases: ['gcc'], version: '10.2.0' },
    { language: 'c++', aliases: ['cpp', 'g++'], version: '10.2.0' },
    { language: 'java', aliases: [], version: '15.0.2' },
  ];
  let execute: unknown = { run: { stdout: 'hi\n', stderr: '', code: 0, signal: null } };
  let status = 200;
  const requests: Fake['requests'] = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      requests.push({ path: req.url ?? '', method: req.method ?? '', body: raw ? JSON.parse(raw) : null, auth: req.headers.authorization });
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/api/v2/runtimes') return void res.end(JSON.stringify(runtimes));
      res.statusCode = status;
      res.end(JSON.stringify(execute));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    setRuntimes: (r) => (runtimes = r),
    setExecute: (r, s = 200) => ((execute = r), (status = s)),
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

describe('code runner configuration', () => {
  it('is off unless CODE_RUNNER_URL is a real http(s) address', () => {
    expect(readCodeRunnerConfig({}).url).toBeNull();
    expect(readCodeRunnerConfig({ CODE_RUNNER_URL: '' }).url).toBeNull();
    expect(readCodeRunnerConfig({ CODE_RUNNER_URL: 'ftp://x' }).url).toBeNull();
    expect(readCodeRunnerConfig({ CODE_RUNNER_URL: 'not a url' }).url).toBeNull();
    expect(readCodeRunnerConfig({ CODE_RUNNER_URL: 'http://piston:2000/', CODE_RUNNER_TOKEN: ' t ' })).toEqual({ url: 'http://piston:2000', token: 't' });
  });
});

describe('CodeRunnerService', () => {
  let fake: Fake;
  let svc: CodeRunnerService;
  beforeEach(async () => {
    fake = await fakePiston();
    svc = new CodeRunnerService();
    svc.config = () => ({ url: fake.url, token: 'secret' });
  });
  afterEach(() => fake.close());

  it('with no service configured it offers nothing and refuses to run', async () => {
    const off = new CodeRunnerService();
    off.config = () => ({ url: null, token: null });
    expect(await off.languages()).toEqual({ enabled: false, languages: {} });
    await expect(off.run({ language: 'c', code: 'int main(){}' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('reports which languages the service really has', async () => {
    fake.setRuntimes([{ language: 'c', aliases: ['gcc'] }, { language: 'java', aliases: [] }]);
    const l = await svc.languages();
    expect(l.enabled).toBe(true);
    expect(l.languages.c?.available).toBe(true);
    expect(l.languages.cpp?.available).toBe(false);
    expect(l.languages.java?.available).toBe(true);
    // Sent the configured token.
    expect(fake.requests[0].auth).toBe('secret');
  });

  it('is disabled (not an error) when the service has none of them or is unreachable', async () => {
    fake.setRuntimes([{ language: 'python', aliases: [] }]);
    expect((await svc.languages()).enabled).toBe(false);
    const down = new CodeRunnerService();
    down.config = () => ({ url: 'http://127.0.0.1:1', token: null });
    expect(await down.languages()).toEqual({ enabled: false, languages: {} });
  });

  it('runs a program and returns its output, sending the limits and the right file', async () => {
    const r = await svc.run({ language: 'cpp', code: '#include <iostream>\nint main(){std::cout<<"hi\\n";}', stdin: '5\n' });
    expect(r).toMatchObject({ ok: true, stdout: 'hi\n', exitCode: 0 });
    const exec = fake.requests.find((q) => q.path === '/api/v2/execute')!;
    const body = exec.body as Record<string, unknown>;
    expect(body.language).toBe('c++');
    expect(body.stdin).toBe('5\n');
    expect((body.files as { name: string }[])[0].name).toBe('main.cpp');
    expect(body.run_timeout).toBe(3000);
    expect(body.run_memory_limit).toBe(128 * 1024 * 1024);
  });

  it('shows a compile error as the learner’s error', async () => {
    fake.setExecute({ compile: { code: 1, stderr: "main.c:1:5: error: expected ';'" }, run: { stdout: '', stderr: '', code: null } });
    const r = await svc.run({ language: 'c', code: 'int main(){ return 0 }' });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("expected ';'");
    expect(r.stdout).toBe('');
  });

  it('reports a non-zero exit and a killed (too slow) program', async () => {
    fake.setExecute({ run: { stdout: 'x', stderr: 'boom', code: 3, signal: null } });
    expect(await svc.run({ language: 'c', code: 'int main(){return 3;}' })).toMatchObject({ ok: false, exitCode: 3, stderr: 'boom' });
    fake.setExecute({ run: { stdout: '', stderr: '', code: null, signal: 'SIGKILL' } });
    const slow = await svc.run({ language: 'c', code: 'int main(){for(;;);}' });
    expect(slow.ok).toBe(false);
    expect(slow.limit).toBe('time');
    expect(slow.stderr).toMatch(/stopped/);
  });

  it('cuts off enormous output', async () => {
    fake.setExecute({ run: { stdout: 'a'.repeat(250_000), stderr: '', code: 0, signal: null } });
    const r = await svc.run({ language: 'c', code: 'int main(){}' });
    expect(r.stdout.length).toBeLessThan(110_000);
    expect(r.limit).toBe('output');
  });

  it('refuses empty, oversized and over-long-input programs before calling the service', async () => {
    await expect(svc.run({ language: 'c', code: '   ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.run({ language: 'c', code: 'x'.repeat(20_001) })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.run({ language: 'c', code: 'int main(){}', stdin: 'x'.repeat(4_001) })).rejects.toBeInstanceOf(BadRequestException);
    expect(fake.requests.some((q) => q.path === '/api/v2/execute')).toBe(false);
  });

  it('turns a service failure into a clear 503, not a crash', async () => {
    fake.setExecute({ message: 'internal' }, 500);
    await expect(svc.run({ language: 'c', code: 'int main(){}' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
