// FILE PATH: server/src/certificates/certificate-config.ts
//
// The ONE place the certificate system learns where the frontend lives.
//
// Lumexa's public domain is not final (a Vercel deployment today, a custom
// domain later), so NO host name is written anywhere in the certificate system
// — not in the QR code, the verification link, the email, the share links or
// the tests' expectations of them. Everything is built from the FRONTEND_URL
// environment variable through the functions below; moving to a new domain is a
// configuration change, nothing else.
//
// Unlike the lenient helper some notifications use (which quietly falls back to
// http://localhost:3000), this one has NO fallback: if FRONTEND_URL is missing or
// is not a usable address, resolveFrontendBaseUrl() throws and certificate
// issuance refuses to run, rather than print a QR code that points nowhere.
//
// FRONTEND_URL may be a comma-separated list (main.ts also uses it for CORS); the
// FIRST entry is the canonical public site, as everywhere else on the platform.

export class FrontendUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FrontendUrlError';
  }
}

/** The routes of the Next.js app the certificate system links to. Paths, never hosts. */
export const FRONTEND_ROUTES = {
  verify: '/verify',
  studentCertificates: '/student-dashboard/certificates',
  programCatalogue: '/programs',
} as const;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The validated frontend base URL, without a trailing slash.
 * @throws FrontendUrlError when FRONTEND_URL is missing or unusable. */
export function resolveFrontendBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw = (env.FRONTEND_URL ?? '')
    .split(',')
    .map((part) => part.trim())
    .find(Boolean);
  if (!raw) {
    throw new FrontendUrlError(
      'FRONTEND_URL is not set. Certificates link to the public website, so they cannot be issued until it is configured.',
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FrontendUrlError(
      'FRONTEND_URL is not a valid absolute URL (expected something like https://your-site.example).',
    );
  }

  const isLocal = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) {
    throw new FrontendUrlError(
      'FRONTEND_URL must be an https:// address (http:// is accepted only for localhost).',
    );
  }
  if (env.NODE_ENV === 'production' && isLocal) {
    throw new FrontendUrlError(
      'FRONTEND_URL points at localhost, which a printed certificate cannot use in production.',
    );
  }
  if (url.username || url.password) {
    throw new FrontendUrlError('FRONTEND_URL must not contain credentials.');
  }
  if (url.search || url.hash) {
    throw new FrontendUrlError(
      'FRONTEND_URL must not contain a query string or fragment.',
    );
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

/** True when certificates can be issued (FRONTEND_URL is usable). */
export function frontendUrlProblem(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  try {
    resolveFrontendBaseUrl(env);
    return null;
  } catch (err) {
    return err instanceof FrontendUrlError ? err.message : String(err);
  }
}

/** The public verification page of a certificate — what the QR code encodes. */
export function certificateVerificationUrl(
  certificateId: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `${resolveFrontendBaseUrl(env)}${FRONTEND_ROUTES.verify}/${encodeURIComponent(certificateId)}`;
}

/** The student's own My Certificates page, optionally highlighting one. */
export function studentCertificatesUrl(
  certificateId?: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const base = `${resolveFrontendBaseUrl(env)}${FRONTEND_ROUTES.studentCertificates}`;
  return certificateId
    ? `${base}?highlight=${encodeURIComponent(certificateId)}`
    : base;
}

/** Lumexa's general programme catalogue (never a specific programme). */
export function programCatalogueUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `${resolveFrontendBaseUrl(env)}${FRONTEND_ROUTES.programCatalogue}`;
}
