-- Class-ending statuses were redefined:
--   * PARTIALLY_COMPLETED used to mean "class did not happen properly: no
--     payment, no deduction, redo occurrence inserted". That meaning is now
--     the INCOMPLETE status. Every pre-existing PARTIALLY_COMPLETED row has
--     exactly those (unpaid, no-deduction) semantics, so they are relabelled
--     INCOMPLETE. No ledger/payout row is created or removed, no lesson is
--     moved, no schedule changes — only the label.
--   * PARTIALLY_COMPLETED now means "paid class, one extra class needed" and
--     only applies to classes finalized from now on.
UPDATE "ScheduledLesson" SET "status" = 'INCOMPLETE' WHERE "status" = 'PARTIALLY_COMPLETED';

-- Heartbeat/presence tracking was removed from the class lifecycle entirely.
DROP TABLE IF EXISTS "ClassroomPresence";
