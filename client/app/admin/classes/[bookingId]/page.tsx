"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Card, StatusBadge, formatBDT, formatDateTime } from "@/components/admin/AdminUI";

export default function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/bookings/${bookingId}`)
      .then((res) => setBooking(res.data))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;
  if (!booking) return <p className="text-sm text-[var(--a-danger)]">Class not found.</p>;

  const studentName = booking.studentUser?.fullName ?? booking.student?.name ?? "—";
  const teacherName = booking.shift?.teacher?.user?.fullName ?? "—";

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        onClick={() => router.push("/admin/classes")}
        className="text-sm text-[var(--a-text-muted)] hover:text-[var(--a-text)]"
      >
        ← Back to Classes
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--a-text)]">Class Details</h1>
        <StatusBadge status={booking.displayStatus} />
      </div>

      <Card className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Student" value={studentName} />
        <Field label="Teacher" value={teacherName} />
        <Field label="Course" value={booking.studentUser?.assignedCourse?.title ?? "—"} />
        <Field label="Scheduled" value={`${formatDateTime(booking.shift?.start)} → ${formatDateTime(booking.shift?.end)}`} />
        <Field label="Payment status" value={<StatusBadge status={booking.paymentStatus} />} />
        <Field label="Amount" value={booking.amountCents != null ? formatBDT(booking.amountCents) : "—"} />
        <Field label="Recording" value={booking.recordingUrl ? (
          <a href={booking.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--a-accent)] hover:underline">
            View recording
          </a>
        ) : "Not available"} />
        <Field label="Review" value={booking.review ? `${booking.review.rating}★` : "No review yet"} />
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-[var(--a-text)] mb-3">Reschedule / Cancellation History</h2>
        {(!booking.rescheduleRequests || booking.rescheduleRequests.length === 0) && (
          <p className="text-sm text-[var(--a-text-muted)]">No reschedule events for this class.</p>
        )}
        <div className="space-y-3">
          {booking.rescheduleRequests?.map((r: any) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between text-xs text-[var(--a-text-faint)] mb-1">
                <span>{formatDateTime(r.createdAt)}</span>
                <span className="font-semibold">{r.action} · {r.category}</span>
              </div>
              <p className="text-sm text-[var(--a-text)]">
                {formatDateTime(r.oldStart)} → {formatDateTime(r.newStart)}
              </p>
              <p className="text-xs text-[var(--a-text-muted)] mt-1">
                Initiated by {r.initiatedByRole}
                {r.reason ? ` — ${r.reason}` : ""}
              </p>
              {r.penaltyStatus !== "NONE" && (
                <p className="text-xs mt-1 font-medium text-[var(--a-warning-text)]">
                  Penalty: {r.penaltyStatus} ({(r.penaltyAmountCents / 100).toFixed(2)} BDT)
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {booking.payoutEntries && booking.payoutEntries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--a-text)] mb-3">Related Ledger Entries</h2>
          <div className="space-y-2">
            {booking.payoutEntries.map((e: any) => (
              <Card key={e.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--a-text)]">{e.description}</p>
                  <p className="text-xs text-[var(--a-text-faint)]">{e.type} · {formatDateTime(e.createdAt)}</p>
                </div>
                <p className={`text-sm font-semibold ${e.amountCents < 0 ? "text-[var(--a-danger)]" : "text-[var(--a-success)]"}`}>
                  {formatBDT(e.amountCents)}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">{label}</p>
      <div className="text-sm text-[var(--a-text)]">{value}</div>
    </div>
  );
}
