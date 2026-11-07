# Certificates of Completion: setup and operations

How a Lumexa certificate comes to exist, the one-time setup (a **separate** private R2
bucket with an indefinite **Bucket Lock**, its own API token, `FRONTEND_URL`, and a
Chromium for rendering), how to run and test it, and what to do when something goes
wrong. Nothing here touches the class-recordings bucket (`lumexa-recordings`) or the
homework and chat buckets — see [CLASS_RECORDING_SETUP.md](CLASS_RECORDING_SETUP.md),
[HOMEWORK_SUBMISSIONS_SETUP.md](HOMEWORK_SUBMISSIONS_SETUP.md) and
[CLASSROOM_CHAT_SETUP.md](CLASSROOM_CHAT_SETUP.md).

## 1. How it works

```
Student's final scheduled class of a programme is finalised (Completed / Partially completed)
        │   (class-finalization.service → certificate-reviews.service)
        ▼
ONE pending review is opened for the admin  ──►  badge on Admin ▸ Certificates + dashboard banner
        │   (nothing is decided here: no eligibility check, no ID, no files, no email)
        ▼
Admin ▸ Certificates ▸ Pending Approvals ▸ Review & approve
        │   sees what the records show, confirms the EXACT name, programme and completion date,
        │   previews (watermarked, never stored), ticks the confirmation, approves
        ▼
Server, once, for that approval:  certificate ID  →  render PDF + PNG (Chromium)  →  store both in R2
        │   →  verify they are stored  →  write the certificate + close the review + audit (one transaction)
        ▼
Only now: the certificate appears in the student's dashboard, and the congratulatory email
with the stored PDF is sent (retry-safe, never twice).
```

If rendering or storing fails at any point, **nothing is issued and no email is sent**: the
review goes back to Pending, the admin is told why, and can approve again.

### Who can do what

| Who | Can |
| --- | --- |
| **Admin** (only) | see the queue, review, preview, approve, dismiss/reopen, replace (correct), revoke, resend the email, download the files, read the audit trail |
| **Student** | see their own certificates, download the PDF and image, share, copy the verification link. Nothing that creates or changes a certificate |
| **Teacher** | nothing. No review, approval, confirmation or screen; every certificate route refuses them |
| **Anyone** (no login) | open `/verify/<certificate id>` (what the QR code opens): status, name, programme, dates, ID, issuer. Never an email, phone, date of birth or academic record |

There is **no student name-confirmation step**: the admin confirms what is printed.

### The rules the system enforces

- **One certificate per programme** per student (a database rule: one ACTIVE certificate per
  student + programme). Lesson counts are never hard-coded — "the final scheduled class" is
  read from the student's own classes.
- **Exactly one review per student + programme**, however many times the completion event
  fires or two people act at once (a unique constraint decides, not application code).
- **Certificate ID** `LXA-<issue year>-<6 characters>`, e.g. `LXA-2026-A7K9Q2`: the characters
  come from a cryptographically secure generator over `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
  (no `O/0/I/1`), are never sequential, are checked for collisions and are unique in the
  database.
- **Completion date** = the Asia/Dhaka day of the final class (the admin may correct it).
  **Issue date** = the day the certificate was generated and stored.
- **Generated once.** The PDF and PNG are rendered at approval and stored. Viewing or
  downloading only reads them; nothing is regenerated.
- **Permanent.** No certificate file is ever deleted or overwritten (section 5.4).

## 2. One-time setup

### 2.1 `FRONTEND_URL`

Every link in the certificate system — the **QR code**, the public verification page, the
email's buttons, the share links — is built from the single environment variable
`FRONTEND_URL` (the public address of the Next.js site). **No address is written anywhere in
the code**, and there is **no fallback**: if `FRONTEND_URL` is missing, is not an `https://`
address (`http://` is accepted for `localhost` only, and not in production), or contains
credentials, a query string or a fragment, certificates are **not issued** and the admin's
Certificates page says so. A comma-separated list is accepted; the first entry is the public
site (as everywhere else on the platform).

Moving to a new domain (for example from the Vercel address to a custom domain) is **one
change: `FRONTEND_URL`**. Two things to know:

- Certificates issued earlier keep the QR code they were printed with. Keep the **old domain
  redirecting to the new one** (at least `/verify/*`) so old QR codes keep working.
- Links shown or emailed afterwards (verification link, share links, emails) use the new value.

### 2.2 Create the bucket

Cloudflare dashboard → **R2 Object Storage** → **Create bucket**. Name it
**`lumexa-certificates`**. Leave it **private**: no public access, no custom domain. No CORS
policy is needed (browsers never talk to R2; the server reads the files and streams them to
people who are allowed to see them). Never reuse `lumexa-recordings` or the homework or chat
bucket: if `CERTIFICATE_R2_BUCKET` names another feature's bucket the server refuses to issue
(and the admin page says why).

### 2.3 Lock it — permanent retention

Certificates must be kept forever. The server has no code path that deletes or overwrites a
certificate file, and **you should also make R2 itself refuse to**. R2 has no "can write but
never delete" API-token level, so the lock is the real guarantee. Add an **indefinite
Bucket Lock rule** covering the whole bucket:

```bash
npx wrangler r2 bucket lock add lumexa-certificates retain-certificates-forever "" --retention-indefinite
```

(`lumexa-certificates` is the bucket, `retain-certificates-forever` the rule's name, `""` the
prefix — empty means every object — and `--retention-indefinite` keeps objects forever.)
Check it:

```bash
npx wrangler r2 bucket lock list lumexa-certificates
```

With the rule in place R2 rejects any delete or overwrite of an existing object (HTTP `409
ObjectLockedByBucketPolicy`) — for every credential, including the dashboard — while still
allowing **new** objects. Notes: a locked bucket cannot be emptied or deleted while the rule
exists; lock rules take precedence over lifecycle rules; do **not** add any lifecycle/expiry
rule to this bucket (the application never does, and a spec checks that it does not).

### 2.4 Create an API token for that bucket only

R2 → **Manage API tokens** → **Create API token** → permission **Object Read & Write** →
**Specify bucket(s)** → `lumexa-certificates`. Copy the **Access Key ID** and **Secret Access
Key** (shown once). Use a token of its own — not the recordings, homework or chat token.

### 2.5 Set the variables

On the server (Render → the API service → **Environment**; locally `server/.env`):

| Variable | Value |
| --- | --- |
| `FRONTEND_URL` | the public site, e.g. `https://…` (2.1) |
| `CERTIFICATE_R2_BUCKET` | `lumexa-certificates` (this is also the default) |
| `CERTIFICATE_R2_ACCESS_KEY_ID` | the token's Access Key ID |
| `CERTIFICATE_R2_SECRET_ACCESS_KEY` | the token's Secret Access Key |
| `CERTIFICATE_R2_ACCOUNT_ID` | your Cloudflare account id — optional if it is the same account as `R2_ACCOUNT_ID` (then that one is used; it is an id, not a secret) |
| `CERTIFICATE_R2_ENDPOINT` | optional: the full S3 endpoint (EU jurisdiction, or a local S3-compatible server) |
| `CERTIFICATE_CHROMIUM_PATH` | optional: a Chromium you installed yourself (2.6). `PUPPETEER_EXECUTABLE_PATH` is also honoured |

If any of the storage values is missing, issuing answers "Certificates cannot be issued yet"
and the admin's Certificates page lists exactly what is missing; nothing else in the app is
affected, and pending reviews simply wait.

### 2.6 Chromium (rendering)

The PDF and PNG are rendered by headless **Chromium through Puppeteer** (`puppeteer` 24, Node
18+). Rendering is local and hermetic — fonts and artwork are embedded in the page and every
network request is blocked — so it needs nothing from the internet.

- **Default (Render's native Node runtime):** `npm install` downloads a matching Chrome. By
  default Puppeteer keeps it in `~/.cache`, which Render preserves for the *build* but not for
  the running service, so `server/.puppeteerrc.cjs` keeps it inside the project
  (`server/.cache/puppeteer`, git-ignored). Keep the install in the build command (the existing
  `npm install && npm run build` is enough; Puppeteer is a normal dependency).
- **Docker, or Chromium missing system libraries:** install Chromium yourself and point at
  it. For example on Debian/Ubuntu: `apt-get install -y chromium fonts-liberation` in the
  image, install with `PUPPETEER_SKIP_DOWNLOAD=true npm ci`, and set
  `CERTIFICATE_CHROMIUM_PATH=/usr/bin/chromium`. If Chromium fails to start with "error while
  loading shared libraries", the host is missing libraries such as `libnss3`, `libatk-bridge2.0-0`,
  `libcups2`, `libdrm2`, `libgbm1`, `libxkbcommon0` and `libasound2` — use this route.
- Rendering runs **one at a time** and uses a few hundred MB of memory while it does. Approvals
  are rare (a handful a day), so this is fine on a small instance.

### 2.7 Check it works

Open **Admin ▸ Certificates**. If something is not configured, a yellow banner says what. Then
open any pending review and press **Show preview**: it renders through the same Chromium as an
approval (watermarked "PREVIEW — NOT ISSUED", stored nowhere, no ID) — a safe smoke test. The
admin API also answers `GET /admin/certificates/status` → `{ "canIssue": true, "problems": [] }`.

## 3. What is stored

**Database** (`Certificate`, `CertificateReview`, plus rows in `AuditLog`):

- the printed details **as issued** — name, programme, completion date, the "With Distinction"
  flag — so editing a student or a programme later never changes a certificate;
- the **ID**, status (`ACTIVE` / `REVOKED` / `REPLACED`), issue time, who issued it;
- the **theme key and a snapshot of its colours**, and the **template version**, so a later
  design or colour change never alters an issued certificate;
- the R2 bucket and keys, sizes and SHA-256 of both files;
- the replacement chain, revocation reason, email state (status, attempts, recipient, last
  error) and whether the student has seen the "your certificate is ready" card.

**R2** (`lumexa-certificates`), two objects per certificate under unique, stable keys:

```
certificates/2026/LXA-2026-A7K9Q2/LXA-2026-A7K9Q2.pdf   landscape A4, one page, vector
certificates/2026/LXA-2026-A7K9Q2/LXA-2026-A7K9Q2.png   3369 × 2382 px, for social media
```

Every key contains the certificate's own unique ID, so no two certificates — and no
replacement — can ever share a file. The write sends `If-None-Match: *`, so R2 itself refuses
to replace an object that already exists.

## 4. Design, themes and versions

There is **one master template** (`server/src/certificates/template/`), a faithful rebuild of
the supplied design. Only its accent colours change, through CSS custom properties, by
**category**:

| Category (`Course.category`) | Accent |
| --- | --- |
| Creative Coding & Game Development | muted violet |
| Web & Digital Skills | deep blue |
| AI & Data Science | muted teal |
| Other / General Programs (and anything unrecognised) | navy and champagne gold |

All of it lives in **one file**, `server/src/certificates/certificate-themes.ts`. A programme
never stores a theme: it inherits its category's at the moment a certificate is issued, so a
programme added tomorrow in an existing category is themed correctly with no change.

**Adding a new category** is one edit in that file: add an entry to `CERTIFICATE_CATEGORIES`
(key, label, palette) and list the `Course.category` spellings that belong to it in
`CATEGORY_ALIASES`. The template, renderer and database need no change.

**Changing the design.** Certificates are rendered once and stored, so a design change can
never alter one that was issued. Any change to the template, its assets or its ornaments must
**bump `TEMPLATE_VERSION`** (`template/certificate-template.ts`); a snapshot test
(`certificate-template.spec.ts`) fails until you do, and you then update the recorded hashes
in the same commit. Changing a palette in `certificate-themes.ts` is covered the same way.

## 5. Operating it

### 5.1 The admin's screens

**Admin ▸ Certificates** has four tabs: **Pending Approvals**, **Issued**, **Revoked** and
**Replaced**. The red number beside "Certificates" in the menu (and the banner on the
dashboard) counts the programmes waiting for review.

- **Review & approve** — shows what the records show (lessons taken, any graded tests; for the
  admin's judgement only), with a link to the student's full progress. Confirm the name,
  programme and completion date, optionally add the *With Distinction* line, preview, tick the
  confirmation, **Approve & issue**.
- **Dismiss** (with a reason) — no certificate; the review moves to *Dismissed* and can be
  **Reopened** at any time.
- **Check for missed completions** — re-checks recent completions for a final class whose live
  event was missed. Safe to repeat. (The server also does this every hour.)
- Click an issued certificate to see its picture, files, public page, email status and the
  **audit trail** (who did what, when, why).

### 5.2 Corrections: replace, don't edit

A certificate is never edited or silently overwritten. **Replace…** issues a **new**
certificate (new unique ID, new files, optionally emailed) and marks the original
**Replaced** — the original, its record and its files are kept, its verification page says it
was replaced and links to the new one. A reason is required and recorded.

### 5.3 Revoking

**Revoke…** (reason required) changes what verification says to **Revoked**; the student can no
longer download or share it; the record and files stay. A revoked or replaced certificate cannot
be revoked or replaced again.

### 5.4 Nothing is ever deleted

There is no delete button, no `DELETE` route, no cleanup job and no lifecycle rule — and the
storage service has no delete method (`certificate-retention.spec.ts` and the client's
`policy.test.ts` keep it so). Active, revoked and replaced certificates all keep their files.
If an approval fails after the first file was stored, that orphan file is also kept (under an ID
that was never used); the retry gets a fresh ID.

### 5.5 When something fails

| What happened | Result |
| --- | --- |
| Chromium cannot start / the render fails / the PDF is not one page | `503` with the reason. Nothing stored or issued, no email. The review is Pending again. |
| R2 is down, refuses a write, or the stored size does not match | `502`. No certificate record, no email. Approve again. |
| `FRONTEND_URL` or the bucket settings are missing or invalid | `503` before anything starts. The admin page shows what to fix. |
| Two admins approve at once, or a double click | One certificate. The other request is told it is being generated (`409`) or gets the same certificate back. |
| The server dies mid-approval | After 10 minutes the review can be approved again. |
| The student already holds an active certificate for the programme | Refused by the database (`409`). |
| The email cannot be sent | The certificate stays issued (the student has it). See 5.6. |

### 5.6 The email

Subject **"🎉 Congratulations! Your Lumexa certificate is ready!"**, with the **stored PDF
attached**, a link to the student's certificates page, the public verification link, and a
"Find Your Next Program" button that always opens the **general programme catalogue**. It goes
to the student's billing/parent contact if there is one, otherwise the student's own address.

It is sent only **after** the certificate is issued and stored, and is duplicate-proof: the
state lives on the certificate and is claimed with a compare-and-set, `SENT` is final, and an
attempt whose result is unknown (a slow mail server, a restart) is never blindly repeated —
the sweep checks what the mail journal recorded. Failed sends retry automatically (waits grow
from 5 minutes to 2 hours, at most five automatic attempts). After that — or any time — an
admin can **Send email now** from the certificate; sending again after a successful send needs an
explicit confirmation. Emails are logged in `EmailLog` like every other email.

### 5.7 Certificates from the previous system

Certificates issued before this system (numbers like `LMX-…`, PDFs on Cloudinary) were migrated
in place: they keep their numbers and PDFs, are listed and downloadable by the student and
verifiable at `/verify/<LMX number>`, are marked "from the previous system", are never
re-emailed, and can be replaced by a certificate in the new design.

### 5.8 Backups

The database and the `lumexa-certificates` bucket are the whole record. Back up both the way you
back up the rest of production; the bucket's Bucket Lock already protects it from deletion.

## 6. Public verification and privacy

`/verify/<certificate id>` (Next.js, no login, server-rendered on every visit, never cached,
`noindex`) shows the status — **Active**, **Revoked** or **Replaced** — the name printed on the
certificate, programme, completion date, issue date, certificate ID and issuer "Lumexa AI
School". The API (`GET /certificates/verify/:id`) is rate-limited per address — 120 requests a minute,
deliberately generous because the Next.js server calls it for every visitor (all visitors share that
server's address); the limits live in `server/src/certificates/certificate-limits.ts` — and selects
exactly those fields; **no email, phone, date of birth, account id or academic record is ever
returned**, and an unknown or malformed ID gets the same "not found" answer. The ID may be typed
in any letter case.

## 7. Testing

Server (from `server/`):

```bash
npx jest                                  # unit specs (the integration specs skip themselves)
npx tsc --noEmit
```

The workflow specs run the **whole app** over HTTP against a real, throwaway Postgres, with
R2, Chromium and SMTP faked (access control for every role, the completion trigger, approval,
failures, replace, revoke, verification, student routes, email retries, legacy certificates, the
database's own guarantees):

```bash
cd server
createdb lumexa_it
DATABASE_URL=postgresql://USER:PASS@localhost:5432/lumexa_it \
DIRECT_DATABASE_URL=postgresql://USER:PASS@localhost:5432/lumexa_it \
  npx prisma migrate deploy
ASSESSMENT_INTEGRATION_DATABASE_URL=postgresql://USER:PASS@localhost:5432/lumexa_it \
  npx jest src/certificates --runInBand
```

`certificate-renderer.integration.spec.ts` uses a **real Chromium** (no database): it checks
the page count and size, decodes the QR code from the rendered image, samples the accent colour
in real pixels and checks long names are shrunk to fit. It skips itself (with a note) if no
Chromium is found; set `CERTIFICATE_CHROMIUM_PATH` to run it.

Client (from `client/`): `npm test` (share links and message, formatting, the verification
loader, and the policy checks: no hard-coded domain, nothing can delete a certificate, no teacher
access), `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Admin page: "FRONTEND_URL is not set" / "must be an https:// address" | The variable is missing or malformed | Set it (2.1) and redeploy |
| Admin page: "Certificate storage is not set up: missing …" | A `CERTIFICATE_R2_*` value is missing | Add it (2.5) and redeploy |
| Approve → "Chromium could not be started" | No browser, or it lacks system libraries | Section 2.6 |
| Approve → "Storing the certificate files failed (403)" | The token is read-only, for another bucket, or was deleted | Create a new token (2.4) |
| Approve → "…already exists in storage and was not overwritten" | A key collided (R2 refused to overwrite) — extremely unlikely | Approve again; a new ID is drawn |
| Student's page shows no "Share" / "Copy link" | `FRONTEND_URL` is invalid, so there is no link to share | Fix `FRONTEND_URL` |
| QR code of an old certificate stopped working after a domain change | The old domain no longer serves `/verify/*` | Redirect the old domain to the new one (2.1) |
| Email shows "Failed" | The mail server rejected it | Fix SMTP, then **Send email now** on the certificate |
