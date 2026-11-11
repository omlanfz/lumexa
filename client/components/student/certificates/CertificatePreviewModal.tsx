'use client';

// A large look at the stored certificate image. Read-only: it fetches the same
// stored PNG the card shows; nothing is generated here.

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalBehavior } from '@/components/student/useModalBehavior';
import { studentCertificates } from '@/lib/certificates/api';
import type { StudentCertificate } from '@/lib/certificates/types';
import CertificateImage from './CertificateImage';

export default function CertificatePreviewModal({
  cert,
  onClose,
}: {
  cert: StudentCertificate;
  onClose: () => void;
}) {
  const panelRef = useModalBehavior(onClose);
  return createPortal(
    <div
      className="motion-fade fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      data-testid="certificate-preview"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${cert.programName} certificate`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="motion-pop relative w-full max-w-5xl rounded-2xl bg-white p-3 shadow-2xl outline-none dark:bg-[#0B1026] sm:p-4"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute -top-3 -right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white text-gray-700 shadow-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100"
        >
          <X size={20} />
        </button>
        <CertificateImage
          path={studentCertificates.filePath(cert.certificateId, 'png')}
          alt={`Certificate of Completion — ${cert.programName}, awarded to ${cert.recipientName}`}
        />
      </div>
    </div>,
    document.body,
  );
}
