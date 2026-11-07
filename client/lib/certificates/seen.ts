// FILE PATH: client/lib/certificates/seen.ts
//
// Which certificates the My Certificates page should mark as "seen" (clearing the
// "your certificate is ready" card on the student's home page).
//
// Only the STUDENT looking counts. An admin who opens a student's dashboard
// (impersonation) must not clear a card the student has not seen yet — so nothing
// is marked while impersonating. Only ACTIVE certificates have such a card, and
// only ones not already seen.

import type { StudentCertificate } from './types';

export function certificatesToMarkSeen(
  certificates: StudentCertificate[],
  impersonating: boolean,
): string[] {
  if (impersonating) return [];
  return certificates
    .filter((c) => c.status === 'ACTIVE' && !c.seen)
    .map((c) => c.certificateId);
}
