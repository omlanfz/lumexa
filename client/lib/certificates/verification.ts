// FILE PATH: client/lib/certificates/verification.ts
//
// Loads the public verification record of a certificate for the /verify/<id>
// page. Public: no login. The API answers with certificate facts only (name,
// programme, dates, ID, status, issuer) — never an email, phone, birth date or
// academic record — and this loader passes through nothing else.
//
// Three outcomes, so the page can be honest about each:
//   found        — here is the record (Active, Revoked or Replaced);
//   not-found    — no certificate has this ID (or it is not an ID at all);
//   unavailable  — we could not ask right now (network, rate limit, server error),
//                  which is NOT the same as "this certificate is not real".

import type { VerificationResult } from './types';

export type VerificationOutcome =
  | { kind: 'found'; certificate: VerificationResult }
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

const STATUSES = new Set(['ACTIVE', 'REVOKED', 'REPLACED']);

const isString = (v: unknown): v is string => typeof v === 'string';
const isStringOrNull = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

/** Accepts only a well-formed record; anything else is treated as unavailable
 * rather than rendered. */
export function isVerificationResult(value: unknown): value is VerificationResult {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v !== 'object') return false;
  const replacedBy = v.replacedBy as Record<string, unknown> | null | undefined;
  return (
    isString(v.certificateId) &&
    isString(v.status) &&
    STATUSES.has(v.status) &&
    isString(v.recipientName) &&
    isString(v.programName) &&
    isString(v.completionDate) &&
    isString(v.issueDate) &&
    isString(v.issuedBy) &&
    isStringOrNull(v.revokedOn) &&
    isStringOrNull(v.replacedOn) &&
    (replacedBy === null ||
      (typeof replacedBy === 'object' &&
        replacedBy !== undefined &&
        isString(replacedBy.certificateId) &&
        isString(replacedBy.issueDate)))
  );
}

/** Copies exactly the public certificate fields — nothing else the API might
 * ever send can reach the page. */
function pickPublicFields(v: VerificationResult): VerificationResult {
  return {
    certificateId: v.certificateId,
    status: v.status,
    recipientName: v.recipientName,
    programName: v.programName,
    completionDate: v.completionDate,
    issueDate: v.issueDate,
    issuedBy: v.issuedBy,
    revokedOn: v.revokedOn,
    replacedOn: v.replacedOn,
    replacedBy: v.replacedBy
      ? {
          certificateId: v.replacedBy.certificateId,
          issueDate: v.replacedBy.issueDate,
        }
      : null,
  };
}

export async function loadVerification(
  certificateId: string,
  options: { baseUrl?: string; fetchImpl?: typeof fetch } = {},
): Promise<VerificationOutcome> {
  const base = (options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(
    /\/+$/,
    '',
  );
  if (!base) return { kind: 'unavailable' };
  const doFetch = options.fetchImpl ?? fetch;
  try {
    const res = await doFetch(
      `${base}/certificates/verify/${encodeURIComponent(certificateId)}`,
      // A certificate can be revoked at any moment: never show a cached answer.
      { cache: 'no-store', headers: { Accept: 'application/json' } },
    );
    if (res.status === 404) return { kind: 'not-found' };
    if (!res.ok) return { kind: 'unavailable' };
    const data: unknown = await res.json();
    return isVerificationResult(data)
      ? { kind: 'found', certificate: pickPublicFields(data) }
      : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}
