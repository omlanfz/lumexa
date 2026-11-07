'use client';

// My Certificates — every certificate the student has earned, each with its
// stored picture, completion and issue dates, certificate ID, verification
// status, and: Download PDF, Download Image, Share, Copy Verification Link.
//
// Certificates are issued by an admin (never by the student or a teacher) and
// only READ here. Opening this page marks the "your certificate is ready" card
// on the home page as seen.

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import CertificatePreviewModal from '@/components/student/certificates/CertificatePreviewModal';
import ShareCertificateModal from '@/components/student/certificates/ShareCertificateModal';
import StudentCertificateCard from '@/components/student/certificates/StudentCertificateCard';
import { studentCertificates } from '@/lib/certificates/api';
import { certificatesToMarkSeen } from '@/lib/certificates/seen';
import { useMyCertificates } from '@/lib/certificates/useCertificates';
import { getImpersonationBackup } from '@/lib/storage';
import type { StudentCertificate } from '@/lib/certificates/types';

function CertificatesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="h-96 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      ))}
    </div>
  );
}

function CertificatesContent() {
  const router = useRouter();
  const highlight = useSearchParams().get('highlight');
  const { certificates, error, reload } = useMyCertificates();
  const [sharing, setSharing] = useState<StudentCertificate | null>(null);
  const [previewing, setPreviewing] = useState<StudentCertificate | null>(null);

  // Active certificates first (newest first), then replaced and revoked ones.
  const ordered = useMemo(() => {
    const rank = (c: StudentCertificate) => (c.status === 'ACTIVE' ? 0 : 1);
    return [...(certificates ?? [])].sort(
      (a, b) =>
        rank(a) - rank(b) ||
        b.issueDate.localeCompare(a.issueDate) ||
        b.certificateId.localeCompare(a.certificateId),
    );
  }, [certificates]);

  // Seeing the certificates clears the home page's achievement card — but only
  // when the STUDENT is looking. An admin viewing the student's dashboard
  // (impersonation) must not clear a card the student has not seen yet.
  useEffect(() => {
    for (const id of certificatesToMarkSeen(
      certificates ?? [],
      getImpersonationBackup() !== null,
    )) {
      void studentCertificates.markSeen(id).catch(() => undefined);
    }
  }, [certificates]);

  useEffect(() => {
    if (!highlight || !certificates) return;
    document
      .getElementById(`certificate-${highlight}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight, certificates]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Certificates</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your official Certificates of Completion. Download them, share them, and let anyone verify they are real.
        </p>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-10 text-center">
          <p className="max-w-sm text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="text-sm font-medium text-teal-600 underline dark:text-teal-400"
          >
            Try again
          </button>
        </div>
      ) : certificates === null ? (
        <CertificatesSkeleton />
      ) : ordered.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 px-4 py-14 text-center dark:border-gray-700"
          data-testid="certificates-empty"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-300">
            <GraduationCap className="h-8 w-8" aria-hidden />
          </span>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your first certificate is on its way</h2>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            When you finish all the classes of a program, our team reviews your progress and issues your official
            certificate — it will appear right here. Keep learning, you&apos;re doing great! 🚀
          </p>
          <button
            type="button"
            onClick={() => router.push('/student-dashboard/learning')}
            className="mt-1 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-teal-400 active:scale-[0.98]"
          >
            Go to Learning
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {ordered.map((cert) => (
            <StudentCertificateCard
              key={cert.certificateId}
              cert={cert}
              highlighted={highlight === cert.certificateId}
              onShare={setSharing}
              onPreview={setPreviewing}
            />
          ))}
        </div>
      )}

      {sharing && <ShareCertificateModal cert={sharing} onClose={() => setSharing(null)} />}
      {previewing && <CertificatePreviewModal cert={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}

export default function CertificatesPage() {
  return (
    <Suspense fallback={<CertificatesSkeleton />}>
      <CertificatesContent />
    </Suspense>
  );
}
