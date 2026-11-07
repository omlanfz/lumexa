'use client';

// The home-page achievement card: shown when the student has a certificate they
// have not looked at yet, with one prominent button — "View Your Certificate".
// It replaces the old "Your Certificates" card, which read an earlier payload
// (courseName / certificateNumber / pdfUrl) that no longer exists.
//
// Self-contained: it fetches GET /certificates/me/achievement itself, renders
// nothing when there is nothing new, and disappears once the student has opened
// their certificates (the My Certificates page marks them seen).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { studentCertificates } from '@/lib/certificates/api';
import type { StudentCertificate } from '@/lib/certificates/types';

export default function CertificateAchievementCard({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [cert, setCert] = useState<StudentCertificate | null>(null);

  useEffect(() => {
    let alive = true;
    studentCertificates
      .achievement()
      .then((found) => {
        if (alive) setCert(found);
      })
      .catch(() => {
        if (alive) setCert(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!cert) return null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-500 p-5 text-white shadow-lg sm:p-6"
      data-testid="certificate-achievement"
      aria-label="Your certificate is ready"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20" aria-hidden>
            <GraduationCap className="h-8 w-8" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">New achievement 🎉</p>
            <h2 className="mt-0.5 break-words text-xl font-bold leading-snug sm:text-2xl">
              Congratulations{firstName ? `, ${firstName}` : ''}! Your certificate is ready.
            </h2>
            <p className="mt-1 break-words text-sm text-white/90">
              You completed <strong>{cert.programName}</strong>. Download it, share it with friends and family, and
              let anyone verify it.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/student-dashboard/certificates?highlight=${encodeURIComponent(cert.certificateId)}`,
            )
          }
          className="w-full shrink-0 rounded-xl bg-white px-6 py-3.5 text-base font-bold text-teal-700 shadow-md transition-all hover:bg-teal-50 active:scale-[0.98] sm:w-auto"
        >
          View Your Certificate →
        </button>
      </div>
    </section>
  );
}
