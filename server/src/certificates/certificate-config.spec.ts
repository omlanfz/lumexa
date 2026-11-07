import * as fs from 'fs';
import * as path from 'path';
import {
  FRONTEND_ROUTES,
  FrontendUrlError,
  certificateVerificationUrl,
  frontendUrlProblem,
  programCatalogueUrl,
  resolveFrontendBaseUrl,
  studentCertificatesUrl,
} from './certificate-config';

const env = (FRONTEND_URL?: string, NODE_ENV = 'test') =>
  ({ FRONTEND_URL, NODE_ENV }) as NodeJS.ProcessEnv;

describe('FRONTEND_URL — the single source of truth for every certificate link', () => {
  it('uses the configured address, without a trailing slash', () => {
    expect(resolveFrontendBaseUrl(env('https://one.example/'))).toBe(
      'https://one.example',
    );
    expect(resolveFrontendBaseUrl(env('https://one.example'))).toBe(
      'https://one.example',
    );
    expect(resolveFrontendBaseUrl(env('  https://one.example///  '))).toBe(
      'https://one.example',
    );
  });

  it('uses the FIRST entry of a comma-separated list (as main.ts and the notifications do)', () => {
    expect(
      resolveFrontendBaseUrl(
        env('https://primary.example, https://other.example'),
      ),
    ).toBe('https://primary.example');
  });

  it('keeps a path prefix if the site is served under one', () => {
    expect(resolveFrontendBaseUrl(env('https://one.example/app/'))).toBe(
      'https://one.example/app',
    );
    expect(
      certificateVerificationUrl(
        'LXA-2026-A7K9Q2',
        env('https://one.example/app'),
      ),
    ).toBe('https://one.example/app/verify/LXA-2026-A7K9Q2');
  });

  describe('has NO fallback: a missing or unusable value is an error, never a guess', () => {
    it.each([undefined, '', '   ', ','])('missing (%p)', (value) => {
      expect(() => resolveFrontendBaseUrl(env(value))).toThrow(
        FrontendUrlError,
      );
      expect(frontendUrlProblem(env(value))).toMatch(/FRONTEND_URL is not set/);
    });

    it.each([
      'not a url',
      'lumexa',
      '/just/a/path',
      'ftp://files.example',
      'javascript:alert(1)',
    ])('unusable (%p)', (value) => {
      expect(() => resolveFrontendBaseUrl(env(value))).toThrow(
        FrontendUrlError,
      );
    });

    it('plain http is refused except for localhost', () => {
      expect(() => resolveFrontendBaseUrl(env('http://one.example'))).toThrow(
        /https/,
      );
      expect(resolveFrontendBaseUrl(env('http://localhost:3000'))).toBe(
        'http://localhost:3000',
      );
      expect(resolveFrontendBaseUrl(env('http://127.0.0.1:3000'))).toBe(
        'http://127.0.0.1:3000',
      );
    });

    it('localhost is refused in production (a printed QR code must not point at it)', () => {
      expect(() =>
        resolveFrontendBaseUrl(env('http://localhost:3000', 'production')),
      ).toThrow(/localhost/);
      expect(() =>
        resolveFrontendBaseUrl(env('https://localhost', 'production')),
      ).toThrow(/localhost/);
    });

    it('credentials, queries and fragments are refused', () => {
      expect(() =>
        resolveFrontendBaseUrl(env('https://user:pw@one.example')),
      ).toThrow(/credentials/);
      expect(() =>
        resolveFrontendBaseUrl(env('https://one.example?x=1')),
      ).toThrow(/query/);
      expect(() =>
        resolveFrontendBaseUrl(env('https://one.example#top')),
      ).toThrow(/query/);
    });

    it('reports no problem when the address is fine', () => {
      expect(frontendUrlProblem(env('https://one.example'))).toBeNull();
    });
  });

  describe('every link follows the configuration (no domain is written in code)', () => {
    const CERT = 'LXA-2026-A7K9Q2';

    it.each(['https://first-domain.example', 'https://second-domain.example'])(
      'builds the verification, dashboard and catalogue links from %s',
      (base) => {
        const e = env(base);
        expect(certificateVerificationUrl(CERT, e)).toBe(
          `${base}/verify/${CERT}`,
        );
        expect(studentCertificatesUrl(CERT, e)).toBe(
          `${base}/student-dashboard/certificates?highlight=${CERT}`,
        );
        expect(studentCertificatesUrl(undefined, e)).toBe(
          `${base}/student-dashboard/certificates`,
        );
        expect(programCatalogueUrl(e)).toBe(`${base}/programs`);
      },
    );

    it('changing the domain changes every link, and nothing else is needed', () => {
      const before = certificateVerificationUrl(
        CERT,
        env('https://old-domain.example'),
      );
      const after = certificateVerificationUrl(
        CERT,
        env('https://new-domain.example'),
      );
      expect(before).not.toBe(after);
      expect(after).toBe(
        `https://new-domain.example${FRONTEND_ROUTES.verify}/${CERT}`,
      );
    });

    it('refuses to build any link without a usable FRONTEND_URL', () => {
      expect(() => certificateVerificationUrl(CERT, env(undefined))).toThrow(
        FrontendUrlError,
      );
      expect(() => programCatalogueUrl(env(''))).toThrow(FrontendUrlError);
      expect(() => studentCertificatesUrl(CERT, env('nonsense'))).toThrow(
        FrontendUrlError,
      );
    });

    it('encodes the certificate id into the path', () => {
      expect(
        certificateVerificationUrl('A/B C', env('https://x.example')),
      ).toBe('https://x.example/verify/A%2FB%20C');
    });
  });
});

describe('no hard-coded domain anywhere in the certificate system', () => {
  // The forbidden hosts are assembled from fragments so this file does not contain them itself.
  const FORBIDDEN = [
    ['ver', 'cel.app'].join(''),
    ['lumexa', 'aischool'].join(''),
    ['lumexa', '.school/'].join(''),
    ['lumexa', '.app'].join(''),
    ['lumexa', '-one'].join(''),
  ];
  const TEXT_EXT = /\.(ts|tsx|js|json|css|svg|html|md)$/;

  function* walk(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        yield* walk(full);
      } else if (TEXT_EXT.test(entry.name)) {
        yield full;
      }
    }
  }

  it('the certificate source files (specs excluded) name no host', () => {
    const offenders: string[] = [];
    for (const file of walk(__dirname)) {
      if (/\.spec\.ts$/.test(file)) continue;
      const source = fs.readFileSync(file, 'utf8');
      for (const bad of FORBIDDEN) {
        if (source.toLowerCase().includes(bad))
          offenders.push(`${path.relative(__dirname, file)} → ${bad}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the certificate assets name no host', () => {
    const assets = path.join(__dirname, '../../assets/certificate');
    const offenders: string[] = [];
    for (const file of walk(assets)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const bad of FORBIDDEN)
        if (source.toLowerCase().includes(bad))
          offenders.push(`${file} → ${bad}`);
    }
    expect(offenders).toEqual([]);
  });
});
