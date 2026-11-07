'use client';

// One certificate on the My Certificates page: the stored picture, what it
// certifies, its verification status, and the four things a student does with it —
// download the PDF, download the image, share it, copy its verification link.
//
// Only an ACTIVE certificate offers files and sharing. A revoked or replaced one
// is still listed (with its true status) but nothing can be taken from it.

import { useState } from 'react';
import { Check, FileText, Image as ImageIcon, Link2, Share2 } from 'lucide-react';
import { fetchBlob, studentCertificates, type FileKind } from '@/lib/certificates/api';
import { saveBlob } from '@/lib/certificates/files';
import {
  apiErrorMessage,
  certificateFileName,
  formatCertificateDate,
  studentStatusLabel,
} from '@/lib/certificates/format';
import { copyText, legacyCopyViaTextarea } from '@/lib/certificates/share';
import type { StudentCertificate } from '@/lib/certificates/types';
import CertificateImage from './CertificateImage';

const STATUS_STYLE: Record<StudentCertificate['status'], string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  REVOKED: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  REPLACED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
};

const BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed';
const PRIMARY = `${BUTTON} bg-teal-500 text-black hover:bg-teal-400`;
const SECONDARY = `${BUTTON} border border-gray-300 text-gray-800 hover:bg-black/5 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-white/10`;

export default function StudentCertificateCard({
  cert,
  highlighted,
  onShare,
  onPreview,
}: {
  cert: StudentCertificate;
  highlighted: boolean;
  onShare: (cert: StudentCertificate) => void;
  onPreview: (cert: StudentCertificate) => void;
}) {
  const [busy, setBusy] = useState<FileKind | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  const active = cert.status === 'ACTIVE';
  const canOpenFiles = active && cert.canDownload;
  const link = cert.verificationUrl;

  const download = async (kind: FileKind) => {
    setBusy(kind);
    setMessage(null);
    try {
      const blob = await fetchBlob(studentCertificates.filePath(cert.certificateId, kind));
      saveBlob(blob, certificateFileName(cert.certificateId, kind));
    } catch (err) {
      setMessage({
        text: apiErrorMessage(err, 'The download did not work. Please try again in a moment.'),
        tone: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    const ok = await copyText(link, navigator, legacyCopyViaTextarea);
    if (ok) {
      setCopied(true);
      setMessage(null);
      setTimeout(() => setCopied(false), 2500);
    } else {
      setMessage({ text: 'Copying did not work. Long-press the link to copy it instead.', tone: 'error' });
    }
  };

  return (
    <article
      id={`certificate-${cert.certificateId}`}
      data-testid="student-certificate"
      className={`min-w-0 rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900/60 sm:p-5 ${
        highlighted
          ? 'border-teal-500 ring-2 ring-teal-500/40'
          : 'border-gray-200 dark:border-gray-700/60'
      }`}
    >
      <button
        type="button"
        onClick={() => onPreview(cert)}
        disabled={!canOpenFiles || !cert.hasImage}
        className="block w-full text-left disabled:cursor-default"
        aria-label={`Open a larger preview of the ${cert.programName} certificate`}
      >
        <CertificateImage
          path={active && cert.hasImage ? studentCertificates.filePath(cert.certificateId, 'png') : null}
          alt={`Certificate of Completion — ${cert.programName}, awarded to ${cert.recipientName}`}
        />
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-bold text-gray-900 dark:text-white">{cert.programName}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Awarded to {cert.recipientName}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[cert.status]}`}
          data-testid="certificate-status"
        >
          {active && <Check className="h-3.5 w-3.5" aria-hidden />}
          {studentStatusLabel(cert.status)}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Completion date</dt>
          <dd className="font-medium text-gray-900 dark:text-white">{formatCertificateDate(cert.completionDate)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Issue date</dt>
          <dd className="font-medium text-gray-900 dark:text-white">{formatCertificateDate(cert.issueDate)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Certificate ID</dt>
          <dd className="break-all font-mono text-sm font-semibold text-gray-900 dark:text-white">{cert.certificateId}</dd>
        </div>
      </dl>

      {active ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={PRIMARY}
            disabled={!canOpenFiles || busy !== null}
            onClick={() => void download('pdf')}
          >
            <FileText className="h-4 w-4" aria-hidden />
            {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
          <button
            type="button"
            className={SECONDARY}
            disabled={!cert.hasImage || busy !== null}
            title={cert.hasImage ? undefined : 'This older certificate is available as a PDF only.'}
            onClick={() => void download('png')}
          >
            <ImageIcon className="h-4 w-4" aria-hidden />
            {busy === 'png' ? 'Preparing…' : 'Download Image'}
          </button>
          <button
            type="button"
            className={SECONDARY}
            disabled={!link}
            title={link ? undefined : 'Sharing is unavailable right now.'}
            onClick={() => onShare(cert)}
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Share
          </button>
          <button
            type="button"
            className={SECONDARY}
            disabled={!link}
            title={link ? undefined : 'The verification link is unavailable right now.'}
            onClick={() => void copyLink()}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            {copied ? 'Link copied' : 'Copy Verification Link'}
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {cert.status === 'REPLACED'
            ? cert.replacedBy
              ? `This certificate was replaced by ${cert.replacedBy}, which is the one to use.`
              : 'This certificate was replaced by a corrected one.'
            : 'This certificate has been revoked. Please contact Lumexa if you have questions.'}
        </p>
      )}

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.tone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-teal-700 dark:text-teal-300'}`}
        >
          {message.text}
        </p>
      )}
    </article>
  );
}
