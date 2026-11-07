// FILE PATH: client/lib/certificates/events.ts
//
// A tiny browser event so the admin navigation's "pending certificates" badge
// refreshes the moment a review is approved or dismissed, instead of waiting for
// its next poll.

export const CERTIFICATES_CHANGED_EVENT = 'lumexa:certificates-changed';

export function notifyCertificatesChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CERTIFICATES_CHANGED_EVENT));
  }
}
