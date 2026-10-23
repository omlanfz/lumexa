# Trial classes: booking, email & WhatsApp setup

Everything an operator has to configure for the free 30-minute **trial class**
booking flow. Code never contains secrets: every value below is an environment
variable (Render for the backend, a local `server/.env` for development; start
from `server/.env.example`).

- [1. How the flow works](#1-how-the-flow-works)
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
3. The backend re-validates the slot inside a locked transaction and saves a
   **confirmed** booking. Only then does the parent see "Your trial class is
   confirmed". No admin approval step exists.
4. After the commit (never inside it, so Meta/SMTP can't slow or fail a booking):
   - parent gets a confirmation **email** and a **WhatsApp** confirmation,
   - admin gets an alert **email** and a **WhatsApp** alert,
   - one WhatsApp **reminder** is scheduled (24 h before; if booked less than
     24 h ahead, 1 h before; none if there is under an hour left).
5. Admin can reschedule or cancel from Trial Classes; the parent is emailed
   (no WhatsApp for those, by design).

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
| Trial confirmed | parent (or admin) books a trial | the parent | `trial:<id>:confirmation:parent` |
| New trial booked (alert) | parent books a trial (not sent when an admin books it) | `ADMIN_NOTIFICATION_EMAILS` | `trial:<id>:admin-alert` |
| Trial rescheduled | admin reschedules | the parent | `trial:<id>:rescheduled:r<n>` |
| Trial cancelled | admin cancels | the parent | `trial:<id>:cancelled` |

No other email events were added.

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
   The sender should read "Lumexa AI School".
4. Reschedule and cancel it from the admin dialogs and check the parent email.

Gmail's sending limit for a free account is about 500 recipients/day, ample for
this volume.

## 4. WhatsApp Cloud API

Direct integration with Meta's WhatsApp Business **Cloud API** (no Twilio). It is
used for **three trial messages only**: parent confirmation, parent reminder,
admin alert. Nothing else (no class, payment, homework, reschedule or cancel
messages).

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

### B. Create the three message templates

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

```
Hello {{1}}, your free trial class for {{2}} is confirmed.

Date: {{3}}
Time: {{4}}
Duration: {{5}}
Program of interest: {{6}}

Please help your child join a few minutes early. There is no obligation to enrol after the trial. We will suggest a suitable next step afterwards.

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

#### 2) Parent reminder: `lumexa_trial_reminder` (`WHATSAPP_TEMPLATE_PARENT_REMINDER`)

```
Reminder: {{1}}'s free Lumexa trial class is on {{2}} at {{3}}. The session lasts {{4}}.

Please help your child join a few minutes early so we can start on time.

Need to change something? WhatsApp +880 1522 122194 or email lumexa.school@gmail.com.
Lumexa AI School
```

| # | Variable name (code) | Sample |
|---|---|---|
| {{1}} | `child_name` | Alex |
| {{2}} | `appointment_date` | Wednesday, 4 November 2026 |
| {{3}} | `appointment_time` | 4:00 PM – 4:30 PM Bangladesh Time (GMT+6) |
| {{4}} | `duration` | 30 minutes |

#### 3) Admin alert: `lumexa_trial_admin_alert` (`WHATSAPP_TEMPLATE_ADMIN_ALERT`)

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
WHATSAPP_TEMPLATE_PARENT_REMINDER=lumexa_trial_reminder
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
3. **Reminder.** Book a slot about 2 h 10 min ahead; the reminder row reads
   *Scheduled for* start − 1 h and is sent by the once-a-minute sweep (it
   survives restarts; it lives in the database, not in memory). For 24-hour
   timing, book a slot more than 25 h ahead and confirm the scheduled time.
4. Automated tests never call Meta (the HTTP client is mocked), and local dev
   never needs WhatsApp credentials.

### What only you can do

- Create the Meta app/portfolio, complete business verification, register and
  verify +880 1522 122194, get the display name approved.
- Generate the system-user token.
- Submit the 3 templates and wait for approval.
- Put the values in Render and flip `WHATSAPP_ENABLED`.

Until then the system runs fine with WhatsApp off.

## 5. Environment variables

Added or changed (see `server/.env.example`; placeholders only):

| Variable | Default | Purpose |
|---|---|---|
| `EMAIL_FROM_NAME` | `Lumexa AI School` | email display name (address is `SMTP_USER`) |
| `ADMIN_NOTIFICATION_EMAILS` | *(existing)* | now also receives "new trial booked"; set to the admin's private email on Render |
| `TRIAL_MIN_NOTICE_MINUTES` | `120` | earliest bookable start from now |
| `TRIAL_BOOKING_HORIZON_DAYS` | `60` | how far ahead parents can book |
| `WHATSAPP_ENABLED` | `false` | master switch |
| `WHATSAPP_GRAPH_API_VERSION` | `v25.0` | Graph API version |
| `WHATSAPP_PHONE_NUMBER_ID` | | sender ID |
| `WHATSAPP_ACCESS_TOKEN` | | **secret** |
| `WHATSAPP_ADMIN_RECIPIENT` | | admin's private WhatsApp (never exposed to the frontend or API) |
| `WHATSAPP_TEMPLATE_LANGUAGE` | `en` | template language code |
| `WHATSAPP_TEMPLATE_PARENT_CONFIRMATION` / `_PARENT_REMINDER` / `_ADMIN_ALERT` | `lumexa_trial_*` | approved template names |
| `WHATSAPP_TEMPLATE_PARAMETER_FORMAT` | `positional` | or `named` |

The admin's personal email and number exist only in these server variables. They
are not in the client bundle, any public API response, or the repository.

## 6. Deploy checklist

1. Merge, then deploy the backend. `npm run build` already runs
   `prisma generate && nest build && prisma migrate deploy`, so migration
   `20261023000000_trial_booking_availability_whatsapp` applies automatically. It
   is additive (new nullable/defaulted columns, new tables); existing trial
   leads are untouched. It adds a Postgres GiST **exclusion constraint** on a
   built-in range type (no extension needed).
2. Deploy the frontend (Vercel). `NEXT_PUBLIC_API_URL` must point at the backend.
3. Set the env vars above on Render.
4. **Scheduled jobs.** They run inside the backend process (`@nestjs/schedule`):
   the WhatsApp reminder/retry sweep every minute and the email retry sweep
   every 5 minutes. Render's free tier **sleeps idle services**: while asleep
   nothing runs, so a reminder could go out late. Use an always-on instance, or
   an uptime monitor pinging the backend every ≤ 5 minutes.
5. Add availability in Admin → Trial Classes → Availability.

## 7. Known limits

- WhatsApp status `SENT` means *Meta accepted the message*, not that the phone
  received it (no webhook receiver yet). Check WhatsApp Manager for delivery.
- If the process dies in the instant between Meta accepting a message and the
  database recording it, that one message can be re-sent after 10 minutes. The
  Cloud API has no idempotency key.
- A reminder is not created for bookings made while WhatsApp was disabled.
- A parent can hold one upcoming trial per child; changing it needs admin help.
- Parent-facing "joining details": the system does not generate a trial
  classroom/link. The confirmation says the team will be in touch with joining
  details, so currently someone has to send them.
- Recurring windows can't span midnight; add two windows (e.g. 22:00–24:00 and
  00:00–02:00 the next day).
- The 60-minute spacing is also hard-coded in the database constraint; changing
  the session length or gap needs a new migration as well as editing
  `server/src/trial/trial.constants.ts`.
