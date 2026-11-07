// FILE PATH: client/app/verify/[certificateId]/page.tsx
//
// The public certificate verification page — what the QR code on a certificate
// opens. No login. It states whether the certificate is Active, Revoked or
// Replaced and shows the certificate's own facts: the name printed on it, the
// programme, the completion and issue dates, the certificate ID and the issuer.
//
// It never shows (and the API never sends) an email address, phone number, date
// of birth or any academic record. It is also kept out of search engines: a
// certificate carries a child's name, and only people holding the ID or QR code
// should be able to reach it.
//
// Rendered on the server for every visit, never cached: a certificate can be
// revoked at any moment and this page must say so immediately.

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CircleAlert, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { formatCertificateDate, verificationHeadline } from '@/lib/certificates/format';
import { loadVerification } from '@/lib/certificates/verification';
import VerifyAnotherForm from './VerifyAnotherForm';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ certificateId: string }> };

export const metadata: Metadata = {
  title: 'Certificate verification · Lumexa AI School',
  description: 'Check that a Lumexa AI School Certificate of Completion is genuine.',
  // A certificate carries a child's name: only people holding its ID or QR code
  // should reach it, never a search engine.
  robots: { index: false, follow: false, nocache: true },
};

/** The URL segment as typed (it may arrive percent-encoded). */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50/60 via-white to-white px-4 py-8 dark:from-black dark:via-black dark:to-black sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl bg-[#0B1026]">
            <Image src="/logo-mark.png" width={40} height={40} alt="" />
          </div>
          <div>
            <p className="text-sm font-bold text-teal-600 dark:text-teal-400">Lumexa AI School</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Certificate verification</p>
          </div>
        </div>
        {children}
        <p className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          <Link href="/" className="underline underline-offset-2 hover:text-teal-600 dark:hover:text-teal-300">
            Lumexa AI School
          </Link>{' '}
          · Code. Create. Impact.
        </p>
      </div>
    </main>
  );
}

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-200 py-3 last:border-0 dark:border-gray-800 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-44 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`min-w-0 break-words font-semibold text-gray-900 dark:text-white ${mono ? 'font-mono text-sm' : ''}`}>
        {children}
      </dd>
    </div>
  );
}

const BANNER = {
  ACTIVE: {
    icon: ShieldCheck,
    style: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
    pill: 'bg-emerald-600 text-white',
    pillText: 'Active',
  },
  REVOKED: {
    icon: ShieldX,
    style: 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200',
    pill: 'bg-red-600 text-white',
    pillText: 'Revoked',
  },
  REPLACED: {
    icon: ShieldAlert,
    style: 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200',
    pill: 'bg-amber-600 text-white',
    pillText: 'Replaced',
  },
} as const;

export default async function VerifyCertificatePage({ params }: PageProps) {
  const certificateId = safeDecode((await params).certificateId).trim();
  const outcome = await loadVerification(certificateId);

  if (outcome.kind === 'not-found') {
    return (
      <Shell>
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60" data-testid="verify-not-found">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" aria-hidden />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">We couldn&apos;t find that certificate</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                No Lumexa certificate has the ID <span className="break-all font-mono font-semibold">{certificateId.slice(0, 40)}</span>.
                Please check the ID printed on the certificate, or scan its QR code again.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <VerifyAnotherForm />
          </div>
        </section>
      </Shell>
    );
  }

  if (outcome.kind === 'unavailable') {
    return (
      <Shell>
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60" data-testid="verify-unavailable">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Verification is unavailable right now</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            We couldn&apos;t check this certificate just now. That does not mean it is invalid — please try again in a
            few minutes.
          </p>
        </section>
      </Shell>
    );
  }

  const c = outcome.certificate;
  const banner = BANNER[c.status];
  const Icon = banner.icon;

  return (
    <Shell>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60" data-testid="verify-result">
        <div className={`flex items-start gap-3 border-b px-5 py-4 ${banner.style}`}>
          <Icon className="mt-0.5 h-7 w-7 shrink-0" aria-hidden />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold sm:text-xl">{verificationHeadline(c.status)}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${banner.pill}`} data-testid="verify-status">
                {banner.pillText}
              </span>
            </div>
            {c.status === 'REVOKED' && (
              <p className="mt-1 text-sm">
                It was withdrawn{c.revokedOn ? ` on ${formatCertificateDate(c.revokedOn)}` : ''} and should not be relied on.
              </p>
            )}
            {c.status === 'REPLACED' && (
              <p className="mt-1 text-sm">
                It was replaced{c.replacedOn ? ` on ${formatCertificateDate(c.replacedOn)}` : ''} by a corrected certificate
                {c.replacedBy ? (
                  <>
                    {' '}
                    —{' '}
                    <Link
                      href={`/verify/${encodeURIComponent(c.replacedBy.certificateId)}`}
                      className="font-semibold underline underline-offset-2"
                    >
                      see {c.replacedBy.certificateId}
                    </Link>
                  </>
                ) : null}
                .
              </p>
            )}
            {c.status === 'ACTIVE' && (
              <p className="mt-1 text-sm">This is a genuine Certificate of Completion issued by {c.issuedBy}.</p>
            )}
          </div>
        </div>

        <dl className="px-5 py-2">
          <Row label="Awarded to">{c.recipientName}</Row>
          <Row label="Program">{c.programName}</Row>
          <Row label="Completion date">{formatCertificateDate(c.completionDate)}</Row>
          <Row label="Issue date">{formatCertificateDate(c.issueDate)}</Row>
          <Row label="Certificate ID" mono>
            {c.certificateId}
          </Row>
          <Row label="Issued by">{c.issuedBy}</Row>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Check another certificate</h2>
        <VerifyAnotherForm />
      </section>
    </Shell>
  );
}
