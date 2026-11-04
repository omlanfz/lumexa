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
* **Students always see whole credits, rounded down** (4.5 → 4, 4.9 → 4;
  `wholeCredits()` in `student-ledger.service.ts`, mirrored by `formatCredits()`
  on the client). An overdrawn student sees a **negative** number — it does not
  stop at 0 — and a part-class debt rounds to the next credit owed (−0.5 → −1).
  The admin Payments tab keeps the exact figure (e.g. 4.9, or −0.5). The
  "running low" email uses the same whole number.
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

## Low credits, zero credits and negative credits

Credits are informational plus billing alerts — **nothing is blocked or paused
automatically** (pausing a student is a manual admin action only). One rule,
`creditLevel()` in `server/src/students/credit-packages.ts`, drives everything
below from the whole credits the student sees:

| Whole credits | Level | Navbar pill | Home / Payments page | Admin badge |
|---|---|---|---|---|
| 4 or more | ok | teal | no reminder | none |
| 3 | low | **yellow** | quiet "you have 3 credits left" notice + Request Credits button | Payment due soon |
| 1–2 | low | **yellow** | yellow warning + Request Credits button | Payment due soon |
| 0 | exhausted | **red** | red: "classes will soon be paused until your payment is confirmed" | Balance exhausted |
| below 0 | exhausted | **red, shows the negative number** (`-2`) | as 0, plus the overdue-credits notice | Balance exhausted |

1. The ledger balance is allowed to go negative: the next attended class is still
   charged. The student pill shows the negative number (`💎 -2 Credits`); the admin
   tab shows "Overdrawn by N".
2. Classes, reminders, joining the classroom, recordings, homework and tests carry on
   as normal. The "paused" wording is a warning — an admin pauses an account by hand.
3. The daily 09:00 (Dhaka) check emails the billing contact (or the student), each
   **once** per transition, and re-arms silently after the next payment:
   1. **"Class credits are running low"** (amber button) when **3 or fewer** credits
      remain (it used to be 2);
   2. **"Class credits have run out"** (red button) when none remain or the student is
      overdrawn.
   Both open with "Dear Parent," and their **Make a payment** button opens the admin's
   WhatsApp chat with the default package (8 credits, plus any overdue ones) already
   requested. Every Lumexa email to a family opens "Dear Parent," — never a first name;
   emails to teachers and admins use "Dear {name},".
4. A recorded payment (or admin adjustment) restores credits immediately; the student's
   navbar and Payments page update within a minute or on the next page change/tab focus.
5. A student who never had any payment recorded has no ledger: classes are not charged at all.

## Requesting credits: the Payments & Credits page (manual payment)

The navbar credit pill is a link to `/student-dashboard/payments` — available at any
balance. The tooltip stays purely informational. The page shows the balance (negative
when overdrawn), the student's own per-class price, a selector for **8, 16 or 24
credits** (8 by default), a payment breakdown, the request button ("Request 8
Credits" …) and the confirmed payment history (date, amount, credits purchased,
status; admin notes, bKash/bank details and per-class deductions are never sent).

**Pricing.** A credit costs the student's own per-class rate: the ledger's latest
`rateCents` — what the admin last recorded as amount ÷ lessons purchased, which already
reflects a 1-to-1 or batch arrangement. There is no package discount, so a package is
credits × rate. A student with no rate yet is never quoted a made-up price; the page and
the WhatsApp message ask the admin for it.

**Overdue credits.** The package chosen is the *new, usable* credits the student wants,
so a negative balance is settled **on top of it**:

```
total = (package credits + overdue credits) × rate        e.g. −2 credits, 8 requested:
                                                           (8 + 2) × ৳1,000 = ৳10,000
```

The breakdown (page and dialog) lists "Selected new credit package", "Overdue credits"
and "Total amount payable"; the overdue row and the notice ("You currently have 2
overdue class credits. These will be adjusted as part of your next payment.") exist
only below zero. After the admin records the payment the student holds exactly the
package they asked for (8). The selected package is never reduced.

**The request.** The button opens a confirmation dialog ("24 Class Credits — Total
amount: ৳…", the overdue breakdown if any, and a note that Lumexa handles payments
manually). Its **Contact Admin on WhatsApp** button opens `https://wa.me/<admin>?text=…`
in a new tab with this message (URL-encoded):

> Hello! I'd like to purchase [credits] class credits for [student name]. My current
> balance is [balance] credits, and the total amount is ৳[total]. Could you please share
> the payment instructions?

Nothing else happens: **requesting creates no payment record, changes no balance and
adds no credits.** All the figures and the link come from the backend
(`GET /students/me/payments`, `server/src/students/credit-packages.ts`), so the
package cards, breakdown, dialog, message and emails cannot disagree.

**Admin number.** The admin's WhatsApp inbox is `WHATSAPP_ADMIN_RECIPIENT` when it is
set, otherwise `DEFAULT_ADMIN_WHATSAPP_NUMBER` in `server/src/whatsapp/whatsapp.config.ts`
— the one place the number is written down. Parents see it (it is the chat they are
sent to).

**Recording the confirmed payment.** The admin does it as always (Admin → Students →
*Payments* → **Record payment**). The form now offers *Pre-fill from a credit request*
buttons — one per package, from the same quote the student saw — that fill the amount,
the **lessons purchased** (package + overdue lessons, so the per-class rate does not
change) and a description. For an overdrawn student record package + overdue lessons:
−2 credits and an 8-credit request is ৳10,000 for 10 lessons, which leaves 8. (Recording
only the 8 lessons' worth would leave 6, because 2 of them settle the overdue classes.)
