'use client';

// The certificate picture. It is the stored PNG, fetched with the student's login
// (an <img src> cannot send the token) — never re-rendered. A certificate with no
// image (one issued by the previous system has only a PDF) shows a tidy
// placeholder instead.

import { GraduationCap } from 'lucide-react';
import { useBlobUrl } from '@/lib/certificates/useCertificates';

export default function CertificateImage({
  path,
  alt,
  className = '',
}: {
  /** API path of the PNG, or null when the certificate has no image. */
  path: string | null;
  alt: string;
  className?: string;
}) {
  const { url, loading, failed } = useBlobUrl(path);
  return (
    <div
      className={`relative aspect-[1404/993] w-full overflow-hidden rounded-xl border border-black/10 bg-gray-100 dark:border-white/10 dark:bg-gray-800 ${className}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- an authenticated blob: URL, not optimisable by next/image
        <img src={url} alt={alt} className="h-full w-full object-contain" />
      ) : (
        <div className="absolute inset-0 grid place-items-center px-4 text-center">
          {loading ? (
            <div
              className="h-7 w-7 animate-spin rounded-full border-b-2 border-teal-500"
              role="status"
              aria-label="Loading certificate preview"
            />
          ) : (
            <div className="text-gray-500 dark:text-gray-400">
              <GraduationCap className="mx-auto mb-2 h-8 w-8" aria-hidden />
              <p className="text-xs font-medium">
                {failed
                  ? 'Preview unavailable right now'
                  : path
                    ? 'Preview'
                    : 'PDF certificate'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
