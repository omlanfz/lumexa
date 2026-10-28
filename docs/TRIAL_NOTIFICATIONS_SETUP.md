# Trial classes: booking, teacher assignment, guest classroom, email & WhatsApp setup

Everything an operator has to configure for the free 30-minute **trial class**
workflow: booking → admin assigns a teacher → the parent gets a private
classroom link → one-hour reminder → the class. Code never contains secrets: every value below is an environment
variable (Render for the backend, a local `server/.env` for development; start
from `server/.env.example`).

- [1. How the flow works](#1-how-the-flow-works)
- [1b. Teacher assignment, the guest classroom link and the reminder](#1b-teacher-assignment-the-guest-classroom-link-and-the-reminder)
- [2. Admin: set availability](#2-admin-set-availability)
- [3. Email](#3-email)
- [4. WhatsApp Cloud API](#4-whatsapp-cloud-api)
- [5. Environment variables](#5-environment-variables)
- [6. Deploy checklist](#6-deploy-checklist)
- [7. Known limits](#7-known-limits)

---

## 1. How the flow works

1. Admin sets availability (Admin → **Trial Classes → Availability**).
2. A parent opens `/trial`, picks a real open slot, fills the form and confirms.
3. The backend re-validates the slot inside a locked transaction and saves the
   booking. Only then does the parent see "We received your request". No admin
   approval step exists: the time is **reserved** at once. A secret guest-join
   token is generated and stored with the booking, but **not sent to anyone**.
4. After the commit (never inside it, so Meta/SMTP can't slow or fail a booking):
   - parent gets an **email** and a **WhatsApp** message saying the request was
     received and the time is reserved (no classroom link yet),
   - admin gets an alert **email** and a **WhatsApp** alert.
5. The admin opens Admin → **Trial Classes** and **assigns a teacher**. That is
   what puts the trial on the teacher's `/schedule` and **sends the parent the
   details and the private classroom link** (email + WhatsApp). See section 1b.
6. One hour before the class the parent gets a **reminder with the same link**
   (email + WhatsApp).
7. Admin can reschedule, change the teacher or cancel from Trial Classes; the
   parent is emailed (and, once a teacher is assigned, WhatsApped the updated
   details). After the class the admin (or the teacher ending the class) records
   it as Completed or Missed.

Rules enforced **on the server** (the UI is just a view of them):

| Rule | Detail |
|---|---|
| Session length | 30 minutes |
| Gap | mandatory 30 minutes between sessions → two starts must be ≥ 60 min apart (exactly 60 is allowed) |
| Start times | every 30 minutes, and the whole session must fit in a window (a 2:00–8:00 PM window's last start is 7:30 PM) |
| Overlapping windows | never produce duplicate slots |
| Ages | 6–18 inclusive (client **and** server) |
| Notice | a slot must start ≥ `TRIAL_MIN_NOTICE_MINUTES` from now (default 120); never in the past |
| Horizon | at most `TRIAL_BOOKING_HORIZON_DAYS` ahead (default 60) |
| Timezone | availability is defined in **Asia/Dhaka (UTC+6, no DST)**; times are stored as UTC instants; the parent sees Bangladesh time, always labelled, plus their own time when it differs |
| Races | one Postgres advisory lock serialises booking changes **and** a database exclusion constraint (`TrialLead_no_overlapping_slots`) makes conflicting confirmed bookings impossible even if the app code were bypassed |

The Asia/Dhaka timezone is a constant, not an env var: Bangladesh has no DST and
the existing scheduling code assumes a fixed +6 offset.

## 1b. Teacher assignment, the guest classroom link and the reminder

**Assigning a teacher** (Admin → Trial Classes → open a trial → *Assign teacher*)

- Only active (non-suspended) teacher accounts are listed, each marked free or
  busy for the trial's time. The server re-checks on save with the same conflict
  function every other class uses: a teacher with a 1-to-1 lesson, batch class,
  booked marketplace shift or another trial that overlaps cannot be assigned
  (HTTP 409). The check also runs the other way — a lesson, batch class or shift
  placed over an assigned trial is refused.
- The first assignment: the trial appears on that teacher's **/schedule** (rose
  "Trial Class" colour and label, never mixed with program lessons) and their
  dashboard's **Next class** card with a **Join Class** button; the parent is sent
  the trial details + link; the reminder is planned.
- Changing the teacher moves the class between the two teachers' calendars. The
  time and the parent's link are unchanged, so the parent is not messaged again.
- A trial is **not a lesson**: no student account or enrolment, no lesson
  consumed, no payout, no curriculum progress, no recording.

**The guest link** is `FRONTEND_URL/trial/join/<token>`

- The token is 32 random bytes (43 URL-safe characters), generated when the
  booking is created, unique, and returned by no API (not to the admin, the
  teacher or the parent's booking response). It only ever appears in the
  parent's email / WhatsApp. It travels in a POST body, never a URL the API logs.
- It grants entry only while **all** of these hold, checked by the backend on
  every request: the trial is `CONFIRMED`; a teacher is assigned; now is between
  **10 minutes before the start and 30 minutes after the end**. Cancelled,
  completed, missed, unstaffed, too-early and too-late links are refused.
- A valid link is exchanged for a **short-lived Daily meeting token bound to that
  one room** (`trial-<id>`) and one guest identity, with ordinary participant rights
  (publish audio/video, subscribe, chat) and never the room-owner flag. The Daily API
  key and any reusable credential never reach the browser. The teacher's lock, the
  10-person limit and the per-person device limit apply to the guest like any student.
- The guest page (`/trial/join/<token>`) needs no login, shows a countdown until
  the classroom opens (against the server's clock), and is `noindex` /
  `no-referrer`. Endpoints are rate limited per IP.
- The teacher enters the **same room** with `POST /classroom/join { trialLeadId }`
  (only the assigned teacher; same window).

**The one-hour reminder**

- Planned when the teacher is assigned (and re-planned on every reschedule) as a
  database column (`reminderDueAt`) plus, for WhatsApp, a durable outbox row — no
  in-memory timers, so it survives restarts and deploys. A once-a-minute sweep
  sends what is due; a backend that was down simply sends it late (never after
  the class starts).
- Exactly once: the email uses a unique key per trial **and time**
  (`trial:<id>:reminder:r<n>`), and is marked done only after it was recorded; the
  WhatsApp row is claimed with a conditional update.
- **Assigned less than an hour before the start:** the link goes out immediately
  and **no reminder** is scheduled (it would just repeat the same message).
- **Reschedule:** the old reminder is retired, a new one is planned one hour
  before the new time, and the parent gets the updated details with the **same
  link** (email + WhatsApp). If the assigned teacher is busy at the new time the
  reschedule is refused until you pick another time or teacher.
- **Cancel:** reminders stop, unsent WhatsApp messages are skipped, the link stops
  working immediately and the trial leaves the teacher's calendar.

**Ending the class.** When the teacher ends a trial class the room closes; if both
the teacher and the guest joined, it is recorded **Completed**. Otherwise it stays
confirmed until the admin marks it **Completed** or **Missed** (allowed once the
start time has passed; correctable between the two). Either closes the link.

## 2. Admin: set availability

Admin → **Trial Classes** → **Availability**:

- **Weekly availability**: add one or more windows per weekday (e.g. Wed
  3:00–7:00 PM *and* Wed 9:00–11:00 PM), optionally with effective-from/until
  dates.
- **One-off windows**: extra availability on one date.
- **Blocked dates & exceptions**: holidays/unavailability (whole days or part of
  a day). Blocks always win.
- **What parents can book**: a live preview from the same engine as the public page.

Editing/deleting availability (or adding a block) never silently touches
bookings: you are first shown which upcoming trials would fall outside
availability. They stay **confirmed**, are flagged "Outside availability", and
you reschedule or cancel each one explicitly. Cancel/reschedule dialogs show
which slots they freed or took.

Nothing is bookable until you add at least one window.

## 3. Email

### What already exists

The backend already sends email through **Gmail SMTP + Nodemailer**
(`server/src/email/email.service.ts`), with an `EmailLog` journal, inline
retries, a 5-minute retry sweep, and a unique `dedupeKey` per event so a retried
job never sends twice. The trial emails reuse all of that, the shared template
layout (`email/templates/layout.ts`) and `NotificationsService`.

### Inventory of email notifications

**Existing (unchanged in behaviour).** All are sent via `NotificationsService`;
"Wired" means a real call site exists.

| Email | Trigger | Recipient | Wired? |
|---|---|---|---|
| Welcome | registration (`auth.service`, `students.service`) | new user | yes |
| Password reset | forgot-password request (`auth.service`) | the user | yes |
| Teacher account created | teacher registration (`auth.service`) | teacher | yes |
| Teacher approved | admin approves teacher (`admin.service`) | teacher | yes |
| Teacher: student assigned | admin assigns a student (`admin.service`) | teacher | yes |
| Teacher: message from admin / penalty | admin actions (`admin.service`) | teacher | yes |
| Class booked | lesson scheduled (`scheduling.service`) and legacy booking (`bookings.service`) | student / parent | yes |
| Class rescheduled / cancelled | scheduling + reschedule services, legacy cancel | student / parent | yes |
| Teacher: class changed by student | legacy booking change (`bookings.service`) | teacher | yes |
| Class reminder (1 h before) | `RemindersService` cron, every 5 min | student/parent **and** teacher | yes |
| Missed class | class finalisation cron (`class-finalization.service`) | student | yes |
| Achievement | student milestone (`students.service`) | student | yes |
| Streak lost | weekly cron, Mon 00:05 (`engagement.service`) | student | yes |
| Monthly digest | monthly cron, 1st 08:00 UTC (`engagement.service`) | billing contact | yes |
| Gem top-up request | child requests gems (`gems.service`) | billing contact | yes |
| Package expiring soon / expired | daily cron 03:00 UTC (`package-alerts.service`) | billing contact or student | yes |
| Certificate issued | certificate generation (`certificates.service`) | billing contact or student | yes |
| Admin: new registration / new teacher application | `auth.service`, `students.service` | `ADMIN_NOTIFICATION_EMAILS` | yes |
| Admin: dispute filed | `disputes.service` | `ADMIN_NOTIFICATION_EMAILS` | yes |
| Admin: high cancellation rate / low activity | daily cron 04:00 UTC (`admin-alerts.service`) | `ADMIN_NOTIFICATION_EMAILS` | yes |
| Admin: system error (5xx) | global exception filter, ≤ 1/hour per distinct error | `ADMIN_NOTIFICATION_EMAILS` | yes |
| COPPA consent request (`sendConsentRequest`) | **no call site** | n/a | **unused / incomplete**, left as is |

**New (this change): trial emails only.**

| Email | Trigger | Recipient | Idempotency key |
|---|---|---|---|
| Trial request received | parent (or admin) books a trial — "received, time reserved", **no link** | the parent | `trial:<id>:confirmation:parent` |
| New trial booked (alert) | parent books a trial (not sent when an admin books it) | `ADMIN_NOTIFICATION_EMAILS` | `trial:<id>:admin-alert` |
| Trial class details + link | a teacher is assigned | the parent | `trial:<id>:class-details:r<n>` |
| Trial 1-hour reminder + link | one hour before the start | the parent | `trial:<id>:reminder:r<n>` |
| Trial rescheduled | admin reschedules (carries the same link once staffed) | the parent | `trial:<id>:rescheduled:r<n>` |
| Trial cancelled | admin cancels | the parent | `trial:<id>:cancelled` |

(`r<n>` is the number of times the trial was rescheduled, so each time gets its
own copy and a retry can never duplicate one.) No other email events were added.

### What was missing / changed

- Sender name was "Lumexa"; it is now **Lumexa AI School** (`EMAIL_FROM_NAME`).
  The From *address* is always `SMTP_USER`. Gmail rewrites any other From, so
  `SMTP_USER` must be the official `lumexa.school@gmail.com` account.
- The shared email footer pointed at `support@lumexa.app` (not a real mailbox);
  it now shows `lumexa.school@gmail.com` and the official WhatsApp number.
- `.env.example` had no `EMAIL_FROM_NAME` and a placeholder
  `ADMIN_NOTIFICATION_EMAILS`.

### Steps you must do

1. In the Google account **lumexa.school@gmail.com**: turn on 2-Step
   Verification, then Google Account → Security → **App passwords** → create
   one for "Lumexa backend" (16 characters).
2. On Render → backend service → Environment, set:
   `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`,
   `SMTP_USER=lumexa.school@gmail.com`, `SMTP_PASS=<the app password>`,
   `EMAIL_FROM_NAME=Lumexa AI School`,
   `ADMIN_NOTIFICATION_EMAILS=<the admin's private email>`,
   `FRONTEND_URL=https://lumexa-one.vercel.app`.
3. Redeploy.

(Without `SMTP_USER`/`SMTP_PASS` the app still runs and bookings still work;
emails are journaled as FAILED and retried once SMTP is configured.)

### Verify delivery

1. Book a trial on `/trial` using an email address you can read.
2. Admin → Trial Classes → open the booking → **Notifications**: the two email
   rows should read **SENT** (FAILED shows the SMTP error).
3. Check the inbox (and spam) of the parent address and of the admin address.
   The sender should read "Lumexa AI School". The parent email must say
   "request received / time reserved" and contain **no** classroom link.
4. **Assign a teacher.** The parent should now get "Your trial class link" with
   the join URL, and the Notifications table gains a "Class details + link" row.
5. Reschedule and cancel it from the admin dialogs and check the parent email.

Gmail's sending limit for a free account is about 500 recipients/day, ample for
this volume.

## 4. WhatsApp Cloud API

Direct integration with Meta's WhatsApp Business **Cloud API** (no Twilio). It is
used for **four trial messages only**: parent "request received" confirmation,
parent class details + link (when a teacher is assigned, and again with the new
time if it is rescheduled), parent 1-hour reminder + link, and the admin alert.
Nothing else (no class, payment, homework or cancel messages).

> Booking and email work with WhatsApp **off**. Leave `WHATSAPP_ENABLED=false`
> until the steps below are done. While it is off, every WhatsApp message is
> recorded as SKIPPED (visible in the booking's Notifications table). Messages
> are **not** back-filled for bookings made while it was off, so switch it on
> before you start taking real bookings.

Reference docs: <https://developers.facebook.com/docs/whatsapp/cloud-api/get-started>,
<https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages>,
<https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates>.
The Graph API version is configurable (`WHATSAPP_GRAPH_API_VERSION`, default
`v25.0`); check <https://developers.facebook.com/docs/graph-api/changelog> for
the versions currently supported and bump it before yours expires.

### A. Meta setup (manual, needs your Meta/Facebook login)

1. <https://developers.facebook.com> → **My Apps → Create App** → type
   **Business** → add the **WhatsApp** product. Link or create a **Meta
   Business portfolio** (business.facebook.com) and complete **business
   verification** (needed to lift the low messaging limits).
2. **WhatsApp Manager → Phone numbers → Add phone number** and register
   **+880 1522 122194** as the Lumexa sender. Entering the number in an env var
   does *not* register it. Meta verifies it by SMS/voice code, and the number
   must not be actively in use on a regular WhatsApp account (remove it there
   first). Submit the display name **Lumexa AI School** for approval. Check
   Meta's current number requirements in the Get Started doc above.
3. Find the IDs: Developer dashboard → WhatsApp → **API Setup** (or WhatsApp
   Manager → Phone numbers → your number). Copy the **Phone number ID** (an ID,
   *not* the phone number) into `WHATSAPP_PHONE_NUMBER_ID`. The WhatsApp Business
   Account ID is shown there too but this app does not need it.
4. Create a **permanent token** (the 24-hour token on the API Setup page is for
   testing only): business.facebook.com → **Business settings → Users → System
   users → Add** (role Admin) → **Add assets** (your app + the WhatsApp account,
   full control) → **Generate token**, choose your app, expiry **Never**,
   permissions **`whatsapp_business_messaging`** and
   **`whatsapp_business_management`**. Store it in `WHATSAPP_ACCESS_TOKEN`
   (Render environment only; never commit or paste it anywhere).
5. Webhooks are **not** required for sending, so no app secret/verify token is
   used. (Delivery receipts are therefore not tracked; see limits.)

### B. Create the four message templates

WhatsApp Manager → **Message templates → Create template**. Category
**Utility**, language **English** (use the code you put in
`WHATSAPP_TEMPLATE_LANGUAGE`, default `en`), variable type **Number**
(`{{1}}`, `{{2}}`, …; the default `WHATSAPP_TEMPLATE_PARAMETER_FORMAT=positional`).
Supply the sample values shown. The names must match the env vars, and the
variable **order** must match the tables exactly: it is the contract with
`server/src/trial/trial-whatsapp.templates.ts`. Approval usually takes minutes
to a day. Keep the wording transactional: if Meta reclassifies a template as
Marketing, send-rules and pricing change.

#### 1) Parent confirmation: `lumexa_trial_confirmation` (`WHATSAPP_TEMPLATE_PARENT_CONFIRMATION`)

Sent at booking. It says the request was **received** and the time **reserved**
(a teacher is not assigned yet) and carries **no** classroom link. If you already
have an approved template of this name with the old "…is confirmed" wording and
the same seven variables, it keeps working, but its wording will no longer match
the email; submit the text below as a new template (e.g.
`lumexa_trial_received`) and point the env var at it.

```
Hello {{1}}, we received your request for {{2}}'s free trial class and the time is reserved for you.

Date: {{3}}
Time: {{4}}
Duration: {{5}}
Program of interest: {{6}}

We are assigning a Lumexa teacher now. As soon as that is done we will send you the trial details and a private link to join the online class. No account is needed. There is no obligation to enrol after the trial.

Explore our programs: {{7}}

Questions or need to change the time? WhatsApp +880 1522 122194 or email lumexa.school@gmail.com.
Lumexa AI School
```

| # | Variable name (code) | Sample |
|---|---|---|
| {{1}} | `parent_name` | Sarah Rahman |
| {{2}} | `child_name` | Alex |
| {{3}} | `appointment_date` | Wednesday, 4 November 2026 |
| {{4}} | `appointment_time` | 4:00 PM – 4:30 PM Bangladesh Time (GMT+6) |
| {{5}} | `duration` | 30 minutes |
| {{6}} | `program_interest` | AI Builder (Ages 12–18) |
| {{7}} | `programs_url` | https://lumexa-one.vercel.app/programs |

#### 2) Parent class details + link: `lumexa_trial_class_details` (`WHATSAPP_TEMPLATE_PARENT_CLASS_DETAILS`)

Sent right after a teacher is assigned (immediately, even if the class is less
than an hour away) and again with the new time if the trial is rescheduled.

```
Hello {{1}}, here are the latest details for {{2}}'s free Lumexa trial class.

Date: {{3}}
Time: {{4}}
Duration: {{5}}

Join with this private link (it opens 10 minutes before the start, no account needed): {{6}}

Please do not share the link. Need to change something? WhatsApp +880 1522 122194 or email lumexa.school@gmail.com.
Lumexa AI School
```

| # | Variable name (code) | Sample |
|---|---|---|
| {{1}} | `parent_name` | Sarah Rahman |
| {{2}} | `child_name` | Alex |
| {{3}} | `appointment_date` | Wednesday, 4 November 2026 |
| {{4}} | `appointment_time` | 4:00 PM – 4:30 PM Bangladesh Time (GMT+6) |
| {{5}} | `duration` | 30 minutes |
| {{6}} | `join_link` | https://lumexa-one.vercel.app/trial/join/k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiOsXn1MqWjC4E |

#### 3) Parent 1-hour reminder: `lumexa_trial_class_reminder` (`WHATSAPP_TEMPLATE_PARENT_REMINDER`)

Sent one hour before the start with the same link. (This is a **new template
name and a new variable list** — the old 24-hour reminder had no link — so it must
be created and approved even if you had `lumexa_trial_reminder` before.)

```
Reminder: {{1}}'s free Lumexa trial class starts in about an hour, on {{2}} at {{3}}. The session lasts {{4}}.

Join here (opens 10 minutes before the start): {{5}}

Please help your child join a few minutes early so we can start on time. Need help? WhatsApp +880 1522 122194.
Lumexa AI School
```

| # | Variable name (code) | Sample |
|---|---|---|
| {{1}} | `child_name` | Alex |
| {{2}} | `appointment_date` | Wednesday, 4 November 2026 |
| {{3}} | `appointment_time` | 4:00 PM – 4:30 PM Bangladesh Time (GMT+6) |
| {{4}} | `duration` | 30 minutes |
| {{5}} | `join_link` | https://lumexa-one.vercel.app/trial/join/k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiOsXn1MqWjC4E |

> Meta rejects templates whose body starts or ends with a variable, which is why
> each body above ends with fixed text. Keep that when you edit the wording.

#### 4) Admin alert: `lumexa_trial_admin_alert` (`WHATSAPP_TEMPLATE_ADMIN_ALERT`)

```
New trial class booked.

Parent: {{1}}
Email: {{2}}
WhatsApp: {{3}}
Child: {{4}}, age {{5}}
Program: {{6}}
Date: {{7}}
Time: {{8}} (Bangladesh time)
Message: {{9}}

Open Admin > Trial Classes to view or change this booking.
```

| # | Variable name (code) | Sample |
|---|---|---|
| {{1}} | `parent_name` | Sarah Rahman |
| {{2}} | `parent_email` | sarah@example.com |
| {{3}} | `parent_whatsapp` | +8801712345678 |
| {{4}} | `child_name` | Alex |
| {{5}} | `child_age` | 10 |
| {{6}} | `program_interest` | AI Builder (Ages 12–18) |
| {{7}} | `appointment_date` | Wednesday, 4 November 2026 |
| {{8}} | `appointment_time` | 4:00 PM – 4:30 PM Bangladesh Time (GMT+6) |
| {{9}} | `parent_message` | He loves Minecraft (or "None provided") |

Notes: variable values never contain line breaks (the backend strips them),
are never empty (empty becomes `-`/"None provided"), and are capped at 900
characters. If you prefer **named** variables (`{{parent_name}}`), create the
templates that way and set `WHATSAPP_TEMPLATE_PARAMETER_FORMAT=named`.

### C. Configure and switch on

Set on **Render** (backend) and in your local `server/.env` for testing:

```
WHATSAPP_ENABLED=true
WHATSAPP_GRAPH_API_VERSION=v25.0
WHATSAPP_PHONE_NUMBER_ID=<Phone number ID>
WHATSAPP_ACCESS_TOKEN=<permanent system-user token>
WHATSAPP_ADMIN_RECIPIENT=<admin's private WhatsApp in +880… format>
WHATSAPP_TEMPLATE_LANGUAGE=en
WHATSAPP_TEMPLATE_PARENT_CONFIRMATION=lumexa_trial_confirmation
WHATSAPP_TEMPLATE_PARENT_CLASS_DETAILS=lumexa_trial_class_details
WHATSAPP_TEMPLATE_PARENT_REMINDER=lumexa_trial_class_reminder
WHATSAPP_TEMPLATE_ADMIN_ALERT=lumexa_trial_admin_alert
```

Set `WHATSAPP_ENABLED=true` **last**, after the templates show **Approved**.

### D. Test safely

1. **Off first.** With `WHATSAPP_ENABLED=false`, book a trial. The booking and
   emails must work, and the WhatsApp rows read SKIPPED.
2. **Your own number.** Enable it, then book a trial with *your own* WhatsApp as
   the parent number (tick the consent box). Within about a minute the booking's
   Notifications table should show confirmation and admin alert **SENT**, and
   both phones receive them. A failure shows Meta's error code and message
   (e.g. `132001` template not found/not approved, `190` bad token, `131030`
   recipient not allowed while the app is in test mode) and **Retry failed
   WhatsApp** re-queues it.
3. **Class link + reminder.** Assign a teacher to a booking more than an hour
   away. "Class details + link" is sent within a minute, and the reminder row
   reads *Scheduled for* start − 1 h; the once-a-minute sweep sends it (it lives
   in the database, not in memory, so it survives restarts). Assign a teacher to
   a booking that is less than an hour away: the link goes out at once and the
   reminder row reads SKIPPED ("sent less than an hour before the start").
4. Automated tests never call Meta (the HTTP client is mocked), and local dev
   never needs WhatsApp credentials.

### What only you can do

- Create the Meta app/portfolio, complete business verification, register and
  verify +880 1522 122194, get the display name approved.
- Generate the system-user token.
- Submit the 4 templates and wait for approval.
- Put the values in Render and flip `WHATSAPP_ENABLED`.

Until then the system runs fine with WhatsApp off.

## 5. Environment variables

Added or changed (see `server/.env.example`; placeholders only):

| Variable | Default | Purpose |
|---|---|---|
| `EMAIL_FROM_NAME` | `Lumexa AI School` | email display name (address is `SMTP_USER`) |
| `ADMIN_NOTIFICATION_EMAILS` | *(existing)* | now also receives "new trial booked"; set to the admin's private email on Render |
| `FRONTEND_URL` | *(existing)* | **must be the public https site address**: the parent's link is `FRONTEND_URL/trial/join/<token>` |
| `DAILY_API_KEY` | *(existing)* | the same Daily account every class uses; trial classes need nothing extra (see `docs/CLASSROOM_DAILY_SETUP.md`) |
| `TRIAL_MIN_NOTICE_MINUTES` | `120` | earliest bookable start from now |
| `TRIAL_BOOKING_HORIZON_DAYS` | `60` | how far ahead parents can book |
| `WHATSAPP_ENABLED` | `false` | master switch |
| `WHATSAPP_GRAPH_API_VERSION` | `v25.0` | Graph API version |
| `WHATSAPP_PHONE_NUMBER_ID` | | sender ID |
| `WHATSAPP_ACCESS_TOKEN` | | **secret** |
| `WHATSAPP_ADMIN_RECIPIENT` | | admin's private WhatsApp (never exposed to the frontend or API) |
| `WHATSAPP_TEMPLATE_LANGUAGE` | `en` | template language code |
| `WHATSAPP_TEMPLATE_PARENT_CONFIRMATION` / `_PARENT_CLASS_DETAILS` / `_PARENT_REMINDER` / `_ADMIN_ALERT` | `lumexa_trial_confirmation` / `lumexa_trial_class_details` / `lumexa_trial_class_reminder` / `lumexa_trial_admin_alert` | approved template names |
| `WHATSAPP_TEMPLATE_PARAMETER_FORMAT` | `positional` | or `named` |

The admin's personal email and number exist only in these server variables. They
are not in the client bundle, any public API response, or the repository.

## 6. Deploy checklist

1. Merge, then deploy the backend. `npm run build` already runs
   `prisma generate && nest build && prisma migrate deploy`, so the trial
   migrations apply automatically: `20261023000000_trial_booking_availability_whatsapp`
   (booking, availability, WhatsApp outbox; a GiST **exclusion constraint** on a
   built-in range type, no extension needed) and
   `20261028000000_trial_teacher_assignment_guest_access` (teacher, guest token,
   reminder columns; two new `Completed`/`Missed` statuses and the class-details
   message kind). Both are additive; existing leads keep working, and every
   already-booked appointment is given its own guest token by the second one.
2. Deploy the frontend (Vercel). `NEXT_PUBLIC_API_URL` must point at the backend.
3. Set the env vars above on Render.
4. **Scheduled jobs.** They run inside the backend process (`@nestjs/schedule`):
   the WhatsApp outbox sweep and the one-hour **reminder email** sweep every
   minute, and the email retry sweep every 5 minutes. Render's free tier **sleeps idle services**: while asleep
   nothing runs, so a reminder could go out late. Use an always-on instance, or
   an uptime monitor pinging the backend every ≤ 5 minutes.
5. Add availability in Admin → Trial Classes → Availability.

## 7. Known limits

- WhatsApp status `SENT` means *Meta accepted the message*, not that the phone
  received it (no webhook receiver yet). Check WhatsApp Manager for delivery.
- If the process dies in the instant between Meta accepting a message and the
  database recording it, that one message can be re-sent after 10 minutes. The
  Cloud API has no idempotency key.
- A WhatsApp message is not created for events that happen while WhatsApp is
  disabled (they are recorded as SKIPPED); after enabling it, re-assigning is
  not needed for new bookings, but earlier ones will not be back-filled.
- A parent can hold one upcoming trial per child; changing it needs admin help.
- Trial classes are **not recorded** and have no lesson material; the teacher
  and guest use the normal classroom (video, chat, screen share, hand raise).
- A guest the teacher removes can rejoin by reloading the link while the window is
  open (the "knock to rejoin" admission applies to accounts only). Lock the room
  to keep someone out.
- Teachers are not emailed when a trial is assigned to them; it appears on their
  /schedule and dashboard. A teacher who is unassigned by deleting their profile
  leaves the trial staffless (it shows as "Needs a teacher" again).
- Teacher availability means "no overlapping class": the check covers lessons,
  batch classes, booked marketplace shifts and other trials, not open (unbooked)
  availability shifts, matching how lessons and batches are scheduled today.
- Parent contact preferences: a parent who did not tick the WhatsApp box only
  receives email.
- Recurring windows can't span midnight; add two windows (e.g. 22:00–24:00 and
  00:00–02:00 the next day).
- The 60-minute spacing is also hard-coded in the database constraint; changing
  the session length or gap needs a new migration as well as editing
  `server/src/trial/trial.constants.ts`.
