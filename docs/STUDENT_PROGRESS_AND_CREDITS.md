# Student progress, badges and class credits

## Class credits (navbar `💎 N Credits`)

* **1 credit = 1 scheduled class session** (not a curriculum lesson).
* Source of truth is the append-only student ledger (`StudentLedgerEntry`, the
  admin **Payments** tab). Admins already enter *"lessons purchased"* on every
  payment, so there is no BDT-to-credit conversion anywhere:
  * **purchased** = sum of `lessonsPurchased` over confirmed `PAYMENT_RECEIVED` rows
  * **used** = number of `LESSON_COMPLETED` rows (one per attended class)
  * **remaining** = ledger balance ÷ current per-class rate (the "lessons remaining"
    figure the Payments tab has always shown), never below 0
  * **refunds & adjustments** = the reconciling difference, shown on the Payments tab
    so `purchased − used + adjustments = remaining`
* Only recorded (confirmed) payments exist in the ledger, so pending/unconfirmed
  payments never add credits. Deleting a payment, a refund, an admin adjustment or
  a curriculum change is reflected on the next read.
* A credit is charged when a class is finalized (`ClassFinalizationService`):
  1:1 — only COMPLETED / PARTIALLY_COMPLETED **and** the student attended;
  never for INCOMPLETE, cancelled or rescheduled classes.
  **Batch classes keep their existing rule** — every enrolled student is charged one
  credit for every finalized class, attended or not (documented in
  `class-finalization.service.ts`). This was deliberately left unchanged.
* `GET /students/me/nav-summary` serves the navbar (credits + rank). The client
  re-reads it on every navigation, tab focus and once a minute.

## Rank, streak, badges, milestones

Derived — never counted incrementally — from class records by
`server/src/students/progress/` (`progress.rules.ts` = pure rules,
`student-progress.service.ts` = persistence). An **attended class** is a
`ScheduledLesson` finalized COMPLETED/PARTIALLY_COMPLETED (a batch student who did
not show up is finalized INCOMPLETE, so absence never counts) plus legacy
marketplace bookings that were captured and have ended.

| Thing | Rule |
|---|---|
| Rank | Starchild 0 · Explorer 5 · Cosmonaut 15 · Navigator 30 · Captain 60 · Galaxy Commander 100 attended classes. A stored rank is never lowered. |
| Weekly streak | One streak week per Sunday–Saturday (Asia/Dhaka) week with ≥1 attended class; consecutive weeks accumulate; a whole week without one resets it. The open current week never breaks it. |
| First Launch | 1st attended class |
| 4 / 8 / Galaxy Streak | best streak of 4 / 8 / 12 weeks (kept once earned) |
| Explorer … Galaxy Commander | reaching that rank |
| Comeback Cadet | completing a class after a break of ≥ 14 days since the previous attended class |
| Milestones | classes attended (1/5/10/25/50/100), curriculum % (25/50/75/100), streak (2/4/8/12 w), homework submitted (1/5/10/25) |

Badge rows are created at most once (`@@unique([userId, type])`) with the date of the
class that earned them. The student's stored `totalSessions` / `spaceRank` /
`streakWeeks` are refreshed after every finalized class and on every dashboard read.
Live awards email the student and pay the old streak gem bonuses (4 w = 10, 8 w = 20);
reads and the backfill are silent.

## Backfilling existing students

The backfill runs **automatically about 20 seconds after the server starts**
(`SKIP_STUDENT_PROGRESS_BACKFILL=true` disables it) and it can also be run by hand.
Students needing review are logged as warnings at start-up.

```bash
npm run backfill:student-progress -- --dry-run --out report.json   # preview
npm run backfill:student-progress                                  # apply
# or: POST /admin/students/progress/backfill?dryRun=true  (admin)
```

Idempotent (a second run reports 0 changed students) and never fabricates activity:
only settled class records count. `needsReview` in the report lists students whose
stored numbers the records do not explain (e.g. `totalSessions` higher than the
classes found, a stored rank the classes do not support, classes still UPCOMING two
days after they ended) — those are reported, not "fixed". No schema migration is
required.
