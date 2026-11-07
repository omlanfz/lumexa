'use client';

// Learning → Overview: the programs the student has completed, each linking to
// its certificate. Renders nothing until they have one. Only ACTIVE certificates
// count as "earned" here (a revoked or replaced one is not a completion to
// celebrate — the My Certificates page shows its true status).

import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { formatCertificateDate } from '@/lib/certificates/format';
import type { StudentCertificate } from '@/lib/certificates/types';

export function certificateHref(certificateId: string): string {
  return `/student-dashboard/certificates?highlight=${encodeURIComponent(certificateId)}`;
}

export default function CompletedProgramsCard({
  certificates,
}: {
  certificates: StudentCertificate[];
}) {
  const router = useRouter();
  const earned = certificates.filter((c) => c.status === 'ACTIVE');
  if (earned.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/50 dark:bg-gray-800/50 sm:p-6"
      data-testid="completed-programs"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Completed programs
      </p>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700/50">
        {earned.map((cert) => (
          <li
            key={cert.certificateId}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2.5 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <GraduationCap className="h-5 w-5 shrink-0 text-teal-500" aria-hidden />
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-gray-900 dark:text-white">{cert.programName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Completed {formatCertificateDate(cert.completionDate)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(certificateHref(cert.certificateId))}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-teal-600 hover:bg-teal-500/10 dark:text-teal-300"
            >
              View certificate →
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
