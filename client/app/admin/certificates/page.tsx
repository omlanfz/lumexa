"use client";

// Admin → Certificates. ADMIN ONLY (the layout and every /admin/certificates API
// route enforce it; teachers have no access).
//
//   Pending Approvals — programmes whose final class has been completed. Opening
//                       one shows the student's records and asks the admin to
//                       confirm the exact name, programme and completion date;
//                       only "Approve & issue" creates the certificate.
//   Issued / Revoked / Replaced — every certificate ever issued, kept
//                       permanently, each with its files, email status, audit
//                       trail and the controlled actions.

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Avatar,
  Card,
  Pagination,
  ReasonActionModal,
  StatusBadge,
  formatDhakaDate,
} from "@/components/admin/AdminUI";
import ApprovalModal from "@/components/admin/certificates/ApprovalModal";
import CertificateDetailModal from "@/components/admin/certificates/CertificateDetailModal";
import { BTN_GHOST, BTN_PRIMARY, INPUT, ThemePill } from "@/components/admin/certificates/shared";
import { adminCertificates } from "@/lib/certificates/api";
import { notifyCertificatesChanged } from "@/lib/certificates/events";
import { apiErrorMessage, formatCertificateDate } from "@/lib/certificates/format";
import type {
  AdminCertificate,
  CertificateReview,
  CertificateSummary,
  IssuingReadiness,
  Paged,
} from "@/lib/certificates/types";

type Tab = "pending" | "issued" | "revoked" | "replaced";

const TABS: { id: Tab; label: string; count: (s: CertificateSummary) => number }[] = [
  { id: "pending", label: "Pending Approvals", count: (s) => s.pending },
  { id: "issued", label: "Issued", count: (s) => s.issued },
  { id: "revoked", label: "Revoked", count: (s) => s.revoked },
  { id: "replaced", label: "Replaced", count: (s) => s.replaced },
];

const STATUS_FOR_TAB = { issued: "ACTIVE", revoked: "REVOKED", replaced: "REPLACED" } as const;

const isTab = (v: string | null): v is Tab => !!v && TABS.some((t) => t.id === v);

function CertificatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : "pending");
  const [reviewFilter, setReviewFilter] = useState<"PENDING" | "DISMISSED">("PENDING");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [summary, setSummary] = useState<CertificateSummary | null>(null);
  const [readiness, setReadiness] = useState<IssuingReadiness | null>(null);
  const [reviews, setReviews] = useState<Paged<CertificateReview> | null>(null);
  const [issued, setIssued] = useState<Paged<AdminCertificate> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const [approving, setApproving] = useState<CertificateReview | null>(null);
  const [dismissing, setDismissing] = useState<CertificateReview | null>(null);
  const [openId, setOpenId] = useState<string | null>(searchParams.get("certificate"));

  const loadSummary = useCallback(() => {
    adminCertificates.summary().then(setSummary).catch(() => undefined);
    adminCertificates.status().then(setReadiness).catch(() => undefined);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = { page, limit: 20, search: search.trim() || undefined };
    const request =
      tab === "pending"
        ? adminCertificates.listReviews({ ...params, status: reviewFilter }).then((r) => {
            setReviews(r);
            setIssued(null);
          })
        : adminCertificates.listIssued({ ...params, status: STATUS_FOR_TAB[tab] }).then((r) => {
            setIssued(r);
            setReviews(null);
          });
    request
      .catch((err) => setError(apiErrorMessage(err, "Couldn't load certificates.")))
      .finally(() => setLoading(false));
  }, [tab, page, search, reviewFilter]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const refresh = () => {
    load();
    loadSummary();
  };

  const changeTab = (next: Tab) => {
    setTab(next);
    setPage(1);
    setSearch("");
    setNotice(null);
    router.replace(`/admin/certificates?tab=${next}`);
  };

  const scan = async () => {
    setScanning(true);
    setNotice(null);
    try {
      const result = await adminCertificates.scan();
      setNotice(
        result.created > 0
          ? `Opened ${result.created} review${result.created === 1 ? "" : "s"} that the live check had missed.`
          : "Nothing was missed — every completed program already has its review.",
      );
      if (result.created > 0) {
        notifyCertificatesChanged();
        refresh();
      }
    } catch (err) {
      setNotice(apiErrorMessage(err, "The check could not be run."));
    } finally {
      setScanning(false);
    }
  };

  const openCertificate = (certificateId: string) => setOpenId(certificateId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--a-text)]">Certificates</h1>
        <p className="mt-1 text-sm text-[var(--a-text-muted)]">
          Review finished programs, approve official certificates, and manage the ones already issued. Certificates and their
          files are kept permanently.
        </p>
      </div>

      {readiness && !readiness.canIssue && (
        <Card className="border-[var(--a-warning-text)] bg-[var(--a-warning-bg)]">
          <div data-testid="readiness-warning">
            <p className="text-sm font-semibold text-[var(--a-warning-text)]">Certificates cannot be issued until this is fixed:</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-[var(--a-warning-text)]">
              {readiness.problems.map((p) => (
                <li key={p.key}>{p.message}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--a-warning-text)]">
              See docs/CERTIFICATES_SETUP.md. Reviews stay safely in the queue meanwhile.
            </p>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Certificate lists">
        {TABS.map((t) => {
          const active = tab === t.id;
          const count = summary ? t.count(summary) : null;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => changeTab(t.id)}
              data-testid={`tab-${t.id}`}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-[var(--a-nav-active)] text-[var(--a-nav-active-text)]"
                  : "text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] hover:text-[var(--a-text)]"
              }`}
            >
              {t.label}
              {count !== null && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    t.id === "pending" && count > 0
                      ? "bg-[var(--a-danger)] text-white"
                      : "bg-[var(--a-surface-3)] text-[var(--a-text-muted)]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Card className="flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={
            tab === "pending" ? "Search student or program…" : "Search certificate ID, student or program…"
          }
          className={`${INPUT} flex-1`}
          aria-label="Search"
        />
        {tab === "pending" && (
          <>
            <select
              value={reviewFilter}
              onChange={(e) => {
                setReviewFilter(e.target.value as "PENDING" | "DISMISSED");
                setPage(1);
              }}
              className={`${INPUT} sm:w-52`}
              aria-label="Show"
            >
              <option value="PENDING">Awaiting review</option>
              <option value="DISMISSED">Dismissed{summary ? ` (${summary.dismissed})` : ""}</option>
            </select>
            <button
              className={BTN_GHOST}
              onClick={() => void scan()}
              disabled={scanning}
              title="Looks for a finished program whose review was not opened automatically. Safe to repeat."
            >
              {scanning ? "Checking…" : "Check for missed completions"}
            </button>
          </>
        )}
      </Card>

      {notice && (
        <p role="status" className="text-sm text-[var(--a-text-muted)]">
          {notice}
        </p>
      )}
      {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}

      {tab === "pending" ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="pending-table">
              <thead>
                <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Final class</th>
                  <th className="px-4 py-3">Waiting since</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && !reviews && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--a-text-faint)]">
                      Loading…
                    </td>
                  </tr>
                )}
                {reviews && reviews.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--a-text-faint)]" data-testid="pending-empty">
                      {reviewFilter === "PENDING"
                        ? "Nothing is waiting for review. 🎉 A review appears here when a student completes the final class of a program."
                        : "No dismissed reviews."}
                    </td>
                  </tr>
                )}
                {reviews?.items.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--a-border)] last:border-0" data-testid="pending-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.student?.fullName ?? "?"} src={r.student?.avatarUrl ?? null} />
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--a-text)]">{r.student?.fullName ?? "Unknown student"}</p>
                          <p className="truncate text-xs text-[var(--a-text-faint)]">{r.student?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">
                      <p className="text-[var(--a-text)]">{r.course?.title ?? "Unknown program"}</p>
                      {r.theme && <ThemePill label={r.theme.label} color={r.theme.color} accent={r.theme.accent} />}
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{formatCertificateDate(r.suggestedCompletionDate)}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{formatDhakaDate(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                      {r.status === "DISMISSED" && r.dismissReason && (
                        <p className="mt-1 max-w-[16rem] text-xs text-[var(--a-text-faint)]">“{r.dismissReason}”</p>
                      )}
                      {r.lastError && r.status !== "DISMISSED" && (
                        <p className="mt-1 max-w-[16rem] text-xs text-[var(--a-danger)]">Last attempt failed — open to see why.</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.status === "DISMISSED" ? (
                          <button
                            className={BTN_GHOST}
                            onClick={() => {
                              adminCertificates
                                .reopenReview(r.id)
                                .then(() => {
                                  notifyCertificatesChanged();
                                  refresh();
                                })
                                .catch((err) => setNotice(apiErrorMessage(err, "Couldn't reopen the review.")));
                            }}
                          >
                            Reopen
                          </button>
                        ) : (
                          <>
                            <button
                              className={BTN_PRIMARY}
                              onClick={() => setApproving(r)}
                              disabled={r.status === "PROCESSING"}
                              data-testid="review-open"
                            >
                              {r.status === "PROCESSING" ? "Generating…" : "Review & approve"}
                            </button>
                            <Link
                              href={`/admin/students/${r.studentUserId}`}
                              target="_blank"
                              className="text-xs font-medium text-[var(--a-accent)] hover:underline"
                            >
                              Student progress ↗
                            </Link>
                            <button
                              className="text-xs font-medium text-[var(--a-text-muted)] hover:text-[var(--a-danger)]"
                              onClick={() => setDismissing(r)}
                              disabled={r.status === "PROCESSING"}
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="issued-table">
              <thead>
                <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                  <th className="px-4 py-3">Certificate ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && !issued && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--a-text-faint)]">
                      Loading…
                    </td>
                  </tr>
                )}
                {issued && issued.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[var(--a-text-faint)]">
                      No {tab} certificates{search.trim() ? " match your search" : " yet"}.
                    </td>
                  </tr>
                )}
                {issued?.items.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openCertificate(c.certificateId)}
                    className="cursor-pointer border-b border-[var(--a-border)] transition-colors last:border-0 hover:bg-[var(--a-nav-hover)]"
                    data-testid="issued-row"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--a-text)]">{c.certificateId}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--a-text)]">{c.recipientName}</p>
                      <p className="text-xs text-[var(--a-text-faint)]">{c.student?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{c.programName}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{formatCertificateDate(c.completionDate)}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{formatCertificateDate(c.issueDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.email.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={(tab === "pending" ? reviews?.totalPages : issued?.totalPages) ?? 1}
        onChange={setPage}
      />

      {approving && (
        <ApprovalModal
          review={approving}
          readiness={readiness}
          onClose={() => {
            setApproving(null);
            refresh();
          }}
          onIssued={() => refresh()}
          onOpenCertificate={openCertificate}
        />
      )}

      {dismissing && (
        <ReasonActionModal
          title="Dismiss this review?"
          actionLabel="Dismiss"
          extraFields={
            <p className="rounded-lg bg-[var(--a-info-bg)] px-3 py-2.5 text-sm text-[var(--a-info)]">
              No certificate will be issued for {dismissing.student?.fullName ?? "this student"} for{" "}
              {dismissing.course?.title ?? "this program"}. You can find the review under “Dismissed” and reopen it at any time.
            </p>
          }
          onSubmit={async (reason) => {
            await adminCertificates.dismissReview(dismissing.id, reason);
            notifyCertificatesChanged();
            refresh();
          }}
          onClose={() => setDismissing(null)}
        />
      )}

      {openId && (
        <CertificateDetailModal
          key={openId}
          certificateId={openId}
          onClose={() => {
            setOpenId(null);
            refresh();
          }}
          onChanged={refresh}
          onOpenCertificate={openCertificate}
        />
      )}
    </div>
  );
}

export default function AdminCertificatesPage() {
  return (
    <Suspense fallback={<div className="a-shimmer h-64 rounded-2xl" />}>
      <CertificatesContent />
    </Suspense>
  );
}
