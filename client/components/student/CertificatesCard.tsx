// FILE PATH: client/components/student/CertificatesCard.tsx
//
// Self-contained: fetches its own data from GET /certificates/me rather
// than plugging into the parent dashboard's DashboardData shape, so it can
// be dropped into student-dashboard without touching its existing
// fetch/state logic. Renders nothing when the student has no certificates
// yet — this isn't meant to be a permanent fixture on every dashboard.

'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';

interface Certificate {
  id: string;
  courseName: string;
  certificateNumber: string;
  pdfUrl: string;
  issuedAt: string;
  recommendedCourseName: string | null;
}

export default function CertificatesCard() {
  const [certificates, setCertificates] = useState<Certificate[] | null>(null);

  useEffect(() => {
    api
      .get('/certificates/me')
      .then((res) => setCertificates(res.data))
      .catch(() => setCertificates([]));
  }, []);

  if (!certificates || certificates.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-3">
        Your Certificates
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 card-hover"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">🎓</span>
              <div className="min-w-0 flex-1">
                <p className="text-gray-900 dark:text-white font-semibold truncate">{cert.courseName}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                  Issued {new Date(cert.issuedAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </p>
                {cert.recommendedCourseName && (
                  <p className="text-teal-600 dark:text-teal-400 text-xs mt-1">
                    Next up: {cert.recommendedCourseName}
                  </p>
                )}
              </div>
            </div>
            <a
              href={cert.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block text-center w-full py-2 rounded-lg font-semibold text-sm bg-teal-500 hover:bg-teal-400 text-black active:scale-[0.98] transition-all duration-200"
            >
              Download Certificate →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
