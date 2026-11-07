// FILE PATH: server/src/certificates/certificate-id.ts
//
// Certificate IDs look like  LXA-2026-A7K9Q2
//
//   LXA     fixed prefix
//   2026    the year the certificate is issued (Asia/Dhaka, the same calendar the
//           printed issue date uses)
//   A7K9Q2  six characters drawn with a cryptographically secure generator
//
// The random part uses a 32-character alphabet with the look-alikes removed (no
// I, O, 0 or 1), so an ID read aloud or copied by hand is not misread. There are
// 32^6 ≈ 1.07 billion of them per year; they are never sequential or derived
// from anything, so one cannot be guessed from another.
//
// Uniqueness is enforced twice: generateUniqueCertificateId() checks before it
// returns, and Certificate.certificateId is a UNIQUE column in the database (the
// last word if two issuances ever raced to the same value).

import { randomInt } from 'crypto';
import { utcToDhakaParts } from '../scheduling/dhaka-time.util';

export const CERTIFICATE_ID_PREFIX = 'LXA';

/** 32 characters: A-Z and 2-9 without I, O (and 0, 1). */
export const CERTIFICATE_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CERTIFICATE_ID_RANDOM_LENGTH = 6;

/** A certificate ID in the current format. */
export const CERTIFICATE_ID_PATTERN = /^LXA-\d{4}-[A-HJ-NP-Z2-9]{6}$/;

/** What the public verification route accepts: the current format, or the
 * LMX-… number of a certificate issued by the previous system. */
const VERIFIABLE_ID_PATTERN =
  /^(?:LXA-\d{4}-[A-HJ-NP-Z2-9]{6}|LMX-[A-Z0-9-]{4,24})$/;

export type RandomIndex = (maxExclusive: number) => number;

/** Builds one ID. `random` is injectable for tests; the default is
 * crypto.randomInt, which is cryptographically secure and unbiased. */
export function generateCertificateId(
  issuedAt: Date,
  random: RandomIndex = (max) => randomInt(0, max),
): string {
  const year = utcToDhakaParts(issuedAt).dateStr.slice(0, 4);
  let suffix = '';
  for (let i = 0; i < CERTIFICATE_ID_RANDOM_LENGTH; i++) {
    suffix += CERTIFICATE_ID_ALPHABET[random(CERTIFICATE_ID_ALPHABET.length)];
  }
  return `${CERTIFICATE_ID_PREFIX}-${year}-${suffix}`;
}

export class CertificateIdExhaustedError extends Error {
  constructor(attempts: number) {
    super(`Could not find an unused certificate ID in ${attempts} attempts.`);
    this.name = 'CertificateIdExhaustedError';
  }
}

/** An ID that no certificate has yet. Regenerates on a collision. */
export async function generateUniqueCertificateId(
  issuedAt: Date,
  isTaken: (id: string) => Promise<boolean>,
  options: { maxAttempts?: number; random?: RandomIndex } = {},
): Promise<string> {
  const maxAttempts = options.maxAttempts ?? 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = generateCertificateId(issuedAt, options.random);
    if (!(await isTaken(id))) return id;
  }
  throw new CertificateIdExhaustedError(maxAttempts);
}

/** Normalises what a person typed or a URL carried (case, stray spaces) and
 * returns it only if it could be a certificate ID; otherwise null. */
export function parseVerifiableCertificateId(value: string): string | null {
  const id = (value ?? '').trim().toUpperCase();
  return VERIFIABLE_ID_PATTERN.test(id) ? id : null;
}
