# Lumexa certificates: design, dashboard, e-mail and workflow

*Proposal for the founder's approval. Nothing here is wired into the running app yet. The template, renderer, e-mail and mockups live in [`certificates/`](certificates/) (see its [README](certificates/README.md) for how to run them).*

![The Lumexa certificate](certificates/samples/lumexa-certificate-sample.preview.jpg)

## 1. Decisions at a glance

| Question | Decision |
|---|---|
| What should it look like? | The template above: ivory A4-landscape paper, navy ink, serif name, a woven "security print" border with microtext, a round seal, the founder's signature, date, ID and a QR code. One design for all seven programs ([contact sheet](certificates/samples/all-programs-contact-sheet.jpg)). |
| What makes it "official"? | Not the decoration. It is a **unique ID + QR + a public verification page**, a stated award rule, a signature and the issuer's name. A PDF alone can always be faked; the page cannot. |
| New "Certificates" item in the navbar? | **Yes.** Add **Certificates** after *My Badges*, show a one-time banner on Home when a certificate arrives, and add a certificate milestone to the Learning page. §5. |
| E-mail | Congratulates the parent ("Dear Parent" is the house style), shows the certificate in the body, attaches the PDF, offers WhatsApp/Facebook sharing and recommends the next program with a mission-themed button: **"Start {Name}'s next mission"**. Copy in §6. |
| HTML first, then PDF? | **Yes, and keep the HTML forever.** The HTML is the template; the PDF and PNG are printed from it for each student. CS50's own certificate is made this way. §7. |
| Biggest improvements | Public verification page; an age-aware next-program rule (the current one has a bug); issuance that cannot fail silently; a name check before issuing. §8. |

## 2. What already exists, and what I found

Lumexa already issues certificates, so this is an upgrade, not a new feature.

- **Trigger:** passing a Final Test (`assessments.service.ts` after the viva, `test-reports.service.ts` on report approval) calls `CertificatesService.checkAndIssueCertificate`.
- **Rules:** one certificate per student per program (`@@unique([studentUserId, courseId])`), ID `LMX-YYYY-XXXXXXXX`.
- **File:** a PDF drawn with pdfkit, uploaded to Cloudinary, link stored in `Certificate.pdfUrl`.
- **E-mail:** to the billing contact (or the student), with the PDF and the next program's curriculum PDF attached.
- **Dashboard:** `CertificatesCard` at the bottom of Home, hidden until a certificate exists.

| # | Finding | Evidence | Why it matters |
|---|---|---|---|
| 1 | The current certificate does not look official. Dark screen-style page, empty lower half, no signature, no QR, no verification. The 🚀 in the heading prints as `Ø=Þ€` because the built-in PDF font has no emoji. | Reproduced from the service's drawing code: [`before-current-certificate.png`](certificates/samples/before-current-certificate.png) | First impression of the credential. |
| 2 | There is no way to verify a certificate. No `/verify` route exists. | Searched `client/app` and `server/src` | "Verified" is currently just a claim. |
| 3 | **The "next program" rule ignores age.** | I ran the real `getNextRecommendedCurriculum` (table below) | The e-mail would tell a 14-year-old Odyssey graduate to enrol in Little Coders (ages 6–11). |
| 4 | Issuance can fail silently. If the Cloudinary upload throws, no certificate is created and nothing retries. | `certificates.service.ts` returns after logging; the only two callers are fire-and-forget; no cron | A student can pass and never receive a certificate. |
| 5 | Dates use the server's time zone, not Dhaka. | `toLocaleDateString('en-US')` with no `timeZone` | A certificate issued after midnight Dhaka time can show yesterday's date. |
| 6 | The e-mail's "Lessons completed X / 28" divides by `course.sessions`, which includes the 4 assessment sessions of the 24-lesson programs. | `course-catalog.seed.ts` | Likely to read as "24 / 28" on a completion e-mail. Check with a real student's data. |
| 7 | The printed name is whatever is in `User.fullName`, with no check and no way to reissue. | Code read | A typo or nickname is printed on a formal document. |
| 8 | The marketing site and the database disagree on ages: Little Coders is "6–9" on the site and 6–11 in the database; Data Scientist is "12–18" vs 13–18. | `client/lib/programs.ts` vs `course-catalog.seed.ts` | The next-program rule needs one source of truth. |

Output of the current recommendation rule (verified by running it):

| Student finished | Rule recommends | That program's ages |
|---|---|---|
| Lumexa Odyssey (12–18) | **Little Coders Path** | 6–11 |
| AI Builder Path (12–18) | **Little Coders Path** | 6–11 |
| Web Developer Path (12–18) | Digital Independence Path | 15–18 (a 12-year-old is not eligible) |
| Little Coders Path | Game Creator Path | 10–18 |

## 3. The certificate template

**What I took from your two samples, and what I left out**

| From CS50 | From Codingal | Deliberately left out |
|---|---|---|
| White paper, generous space, the name as the hero; one specific line about what was done ("including twelve projects"); signer name and title; a QR code and a short verification URL | A visible unique ID and date; a seal for the "official" feel; a signature; a confident program title | Third-party badges and claims ("STEM.org accredited", "built by alumni of Google/Amazon"): only print what is true for Lumexa. Dark backgrounds (ink-heavy, less formal). Emoji and gradient text (do not print reliably). |

**Anatomy**

| Element | Purpose |
|---|---|
| Logo + "LUMEXA AI SCHOOL" | Issuer identity |
| "Certificate of Completion" | Accurate document type. Avoid "Diploma"/"Degree"/"Accredited" unless Lumexa actually is. |
| Student name (serif, auto-fits, wraps at the extreme) | The hero |
| Program name | Indigo, second most important |
| One factual line + "Awarded on passing the Final Test." | Counts come from the database; the criterion must match what the system enforces |
| Optional "with Distinction" | Only when the Final Test score reaches the threshold |
| Founder signature, name, title | Authority. The sample uses a font-made **stand-in** signature. |
| Seal | The "official" mark (decorative, not a security feature) |
| Date of issue (Dhaka time) and Certificate ID | Reference data |
| QR code + printed URL | The actual verification |
| Woven border and microtext | Security-print style. Decorative: it deters casual copying but is not what makes a certificate trustworthy. |

**Fields that change per student** (everything else is fixed): `studentName`, `programName`, `programDescriptor`, `honors` (optional), `issueDate`, `certificateId`, `verifyUrl` (also becomes the QR), plus the founder's name, title and signature image.

**Wording rules.** Say only what the system enforces. Today that is "passed the Final Test". Do not print attendance, hours or skills claims that nothing checks. Do not print age or grade (children's data).

**Checks I ran** (all passing; `npm test` reruns 11 of them):

- **PDF:** one A4-landscape page, 289 KB, fonts embedded, name/ID/date extract as real text, tagged for screen readers, document properties set (title, author, subject). The border, rosette and seal stay vector; only the logo and signature are raster.
- **QR code:** decodes to the verification URL from the PDF rasterized at 72, 100 and 150 dpi, from a deliberately degraded copy (grayscale, blur, JPEG quality 45), from the shared PNG and from the JPG preview. The 1200×630 link-preview card is a thumbnail, not meant to be scanned.
- **Names:** a 2-letter name, a 37-character name (one line), an 82-character name (two lines) and a Bangla name (bundled fallback font, correct conjuncts) all stay inside the frame and clear of the signature row. A certificate issued at 1:10 a.m. Dhaka time correctly shows that day.
- **Contrast:** all text passes WCAG AA (the gold labels failed at 4.3:1 on my first pass; I darkened them to 5.7:1).
- **Black-and-white printing:** reads like an engraved certificate, QR still decodes.
- **Hostile names** (`<script>`, `<img onerror>`, template tokens): shown as plain text, nothing runs, no network request. See §7 for the negative control.

## 4. Verification and sharing (what makes it "official")

**Certificate ID.** Keep the `LMX-` prefix and year. Lengthen the random part and drop look-alike characters, e.g. `LMX-2026-7K3F-9QWM` (8 characters from a 32-letter alphabet, about a trillion combinations; the current 8 hex characters is about 4 billion). The verification endpoint must be rate-limited, and must still accept old-format IDs.

**Public verification page**, `https://<your domain>/verify/<ID>` ([phone mockup](certificates/mockups/mockup-verify-page-phone.png)). It reads the database, never the PDF: Valid / Revoked, name as printed, program, the award rule, date, ID, the certificate image, Download PDF. It is what the QR code, the e-mail link and every share link open, so it also serves as the share landing page (Open Graph tags give the preview card in WhatsApp and Facebook). Set `robots: noindex` so search engines do not list children's names.

**The URL on the certificate must outlive the school's website changes.** The only production-looking address in the repo is `lumexa-one.vercel.app`. Pick a permanent domain before the first certificate is issued; the sample uses `lumexa.school` as a stand-in (it matches your e-mail address, but I have not checked that you own it).

**How each platform works** (community-documented patterns; test each once on a real phone before launch):

| Where | What to build | Notes |
|---|---|---|
| WhatsApp | `https://wa.me/?text=<message + verify link>` | Reported to drop link-preview images over ~300 KB; the share card is 72 KB. |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=<verify link>` | Reads the preview from the verify page's Open Graph tags. |
| Instagram | No web share link exists. On phones, the Web Share API with the PNG opens the native share sheet (Instagram appears there); on desktop, "Save as image". | Feature-detect with `navigator.canShare({ files })`, otherwise fall back to the buttons above. |
| LinkedIn | Posting works via `https://www.linkedin.com/sharing/share-offsite/?url=…`. **Skip the popular pre-filled "Add to Profile" link:** LinkedIn's help page says those links no longer autofill. Show a short guide with copy buttons (name, issuer, date, ID, URL). | LinkedIn's user agreement sets the minimum age at 16 (check the live terms), so show this only for older students. |

**Privacy decision (yours):** the verify page shows the full name, as CS50 and Codingal do, because the person checking has the certificate in hand and must compare. The ID is unguessable and the page is not indexed. Add one sentence to the privacy policy and registration consent. The stricter alternative is "Ayaan R." on the page.

## 5. Where it goes in the student dashboard

![Certificates page](certificates/mockups/mockup-certificates-page.png)

1. **Add a "Certificates" item to the top navbar** (`StudentTopNav.tsx`), right after *My Badges*. Badges set the precedent of a dedicated page for recognition, certificates are the most valuable thing a student earns, and parents come back to them months later (school applications, sharing). Show the item to everyone, even with zero certificates: the empty state ("Finish AI Builder Path to earn your first certificate", with a progress bar) is a goal, and the item gets a small dot when a new certificate is unseen.
2. **Home banner** ([mockup](certificates/mockups/mockup-home-banner.png)): when a certificate is issued, show a celebration banner for 14 days or until dismissed (View & share, Download). This replaces `CertificatesCard`, which sits below the fold and is invisible until earned.
3. **Learning page:** end each program's progress bar with a locked certificate icon that unlocks after the Final Test.
4. **Certificates page:** one card per certificate (large preview, Verified chip, ID with copy button, Download PDF, Save as image, Share), the recommended next mission, and the in-progress program.
5. **Parents' and teachers' views** (`/student-dashboard/[studentId]`): show the same list read-only.
6. **Admin:** a Certificates section on the student page: resend e-mail, reissue (name fix), revoke.

**Check before building:** the desktop navbar already holds the logo, the credits pill, rank, theme toggle, avatar and Logout. A fifth item may crowd tablet widths (768–1000 px). If it does, move the desktop nav breakpoint from `md` to `lg` so tablets get the menu button. I have not measured this in the running app.

## 6. The congratulation e-mail

Built from the same pieces as every Lumexa e-mail ([`certificates/email/certificate-email.ts`](certificates/email/certificate-email.ts)); [before](certificates/email/preview-before.png) and [after](certificates/email/preview-after.png) screenshots, plus an [HTML preview](certificates/email/certificate-email.preview.html).

**Why "Dear Parent":** the e-mail goes to the billing contact (`billingContactEmail || email`) and every family e-mail in the codebase opens "Dear Parent," (see `docs/STUDENT_PROGRESS_AND_CREDITS.md`). It still celebrates the student by name. There is no gender field, so the copy must never use "he/she".

> **Subject:** 🎓 {Student Name} completed the {Program}!
> **Preview text:** {Student Name}'s official Lumexa certificate is attached. Download it, share it, and see what's next.
>
> **🎓 Mission accomplished, {Student Name}!**
>
> Dear Parent,
>
> Congratulations! {Student Name} has completed the **{Program}** at Lumexa and passed the Final Test{ with Distinction}. That is {N} lessons of real, hands-on learning, and we could not be prouder.
>
> *[certificate image]*
>
> **[ Download the certificate (PDF) ]**
> The PDF is also attached to this email. Every Lumexa certificate has a unique ID and QR code, so schools, teachers or anyone you share it with can confirm it is genuine.
>
> **Share the good news:** [Share on WhatsApp] [Share on Facebook] [View online]
>
> *Program · Lessons completed · Final Test · Awarded on · Certificate ID*
>
> **RECOMMENDED NEXT MISSION**
> **{Next Program}**
> {One-line description}
> **Why we picked it for {Name}:** {one sentence reason}
> **[ Start {First Name}'s next mission → ]**
> See the full {Next Program} curriculum · Compare all programs
>
> Questions, or not sure which program fits best? Just reply to this email or message us on WhatsApp. A quick chat makes choosing easy, with no obligation.
>
> With pride,
> **Fairooz Omlan**
> Founder & CEO, Lumexa AI School

**The button name.** You asked for a better name than "explore best programs suitable specifically for you". Lumexa already speaks in missions ("Book Your Next Mission", "Mission Accomplished!"), so:

1. **Start {Name}'s next mission →** (recommended: short, specific, on-brand)
2. See {Name}'s next mission →
3. Plan the next mission →

Use the neutral "Start the next mission" when a safe first name cannot be worked out (names starting "Md." or "Mohammad" make first-word extraction unreliable). The template does this automatically when `studentFirstName` is empty. The quieter link "Compare all programs" covers parents who want options.

**Where the button goes.** Lumexa enrols and takes payment by hand over WhatsApp, so the button opens a WhatsApp chat with the message already typed ("Hi Lumexa! {Student} just completed the {Program} 🎓 We would like to start the {Next Program}…"). It is honest about how enrolment works today, and each tap is a warm lead.

**Changes from today's e-mail:** the certificate is visible in the body; share buttons; a verify line; a reason for the recommendation; a founder sign-off; the curriculum PDF is a link, not an attachment (the e-mail carries only the certificate, and the PDFs are already public under `/curriculums/`). `EmailAttachment` has no inline-image (`cid`) support and stores URLs for retries, so the preview image should be a hosted URL (the verify page can serve it).

**Not verified:** how it renders in Outlook and the Gmail app. I only have a Chromium screenshot; send yourself a test through the real SMTP before launch.

### The "next mission" rule (proposed, replaces the buggy one)

First option that is **not completed** and **age-eligible** (ages from the database), with a reason shown in the e-mail:

| After | Prefer, in order | Reason shown |
|---|---|---|
| Lumexa Odyssey | the pathway of the student's **strongest Odyssey course test** (module → pathway mapping already in `ODYSSEY_STAGES`); fallback AI Builder | "Your strongest Odyssey course was {course}, the first course of the {Pathway}." |
| Little Coders | Game Creator (10+) | "Turn the Scratch and Python you know into real games." |
| Game Creator | AI Builder, Web Developer | "The Python from your arcade games carries straight into AI." |
| Web Developer | AI Builder, Digital Independence (15+) | "Add Python and machine learning to everything you can build." |
| AI Builder | Data Scientist (13+), Web Developer | "Go deeper into the data behind AI." |
| Data Scientist | AI Builder, Web Developer | "Use your data skills to train models and ship apps." |
| Digital Independence | Data Scientist, AI Builder | "Add a technical specialty to your portfolio." |

If nothing is eligible (a 7-year-old finishing Little Coders cannot start Game Creator until 10), say "We'll let you know when the next program opens for {Name}" instead of suggesting an ineligible one. For Odyssey this is the "specifically for you" recommendation you asked for, and it uses data you already collect.

## 7. HTML → PDF: yes, and how

**Yes: use HTML as the template, not just as a draft.** Think of mail merge: one HTML page with blanks, filled in for each student, then printed to PDF. Two things in your own samples confirm it works: the CS50 PDF's metadata names `HeadlessChrome` as the creator and `Skia/PDF` as the producer (it is a web page printed by Chrome, with the Crimson Text font), while Codingal's PDF is made with `pdf-lib`, a library that writes text onto an existing PDF page, which suggests a designed template with the name stamped on top.

| Option | How | Verdict |
|---|---|---|
| **A. HTML → headless Chromium** (Playwright `page.pdf()` + `screenshot()`) | The template in this folder | **Recommended.** Full design freedom (CSS, any font, SVG), names auto-fit, Bangla shapes correctly, and the same page gives the PDF *and* the PNG, so they always match. Cost: Chromium on the server. |
| B. pdfkit (today) | Draw with code | Replace. Every design change is code, no emoji or Bangla, no PNG, hard to make look designed. |
| C. Designed PDF + text stamped on (pdf-lib, Codingal's way) | Design in Canva/Figma, overlay the fields | Reasonable fallback if the host cannot run Chromium. Fixed text boxes break on long names; PNG needs a second pipeline. |
| D. HTML → PDF web API | Send the HTML to a vendor | Avoid. It sends every child's name to a third party and adds a paid dependency. |

**The pipeline** (`tools/render.mjs`, about 290 lines, ready to move into `server/src/certificates/`):

1. Read `template/certificate.html`; embed the fonts and images as data URIs (so rendering needs no network and no Google Fonts).
2. Fill the placeholders. **Every student-supplied value is HTML-escaped**, because a real browser will render it.
3. Add a Content-Security-Policy that allows nothing but the page's own embedded data, and abort every non-`data:` request in Playwright.
4. Open it in headless Chromium, wait for the fit script, then `page.pdf({ width: '297mm', height: '210mm', printBackground: true, tagged: true })` and a screenshot of `#certificate` for the PNG, JPG and the 1200×630 link card.
5. Stamp the PDF document properties with `pdf-lib`.
6. Upload, save URLs, e-mail.

**Measured here:** about 0.5 s for a PDF alone and about 3 s for all four outputs; about 390 MB of real memory (630 MB if you naively add up every Chromium process) while it runs. Outputs: PDF 289 KB, PNG ~1 MB, e-mail JPG ~206 KB, link card 72 KB.

**Hosting:** I do not know where your API runs. Plan on at least 1 GB of RAM, render one certificate at a time through a queue, and use a Chromium-ready image (Microsoft's Playwright image) or a slim serverless Chromium build. On a 512 MB host this will not fit; use option C there.

**Security proof.** I disabled each protection in turn with a hostile name `<img src=https://evil.test/x.png onerror=…><script>…</script>`:

| Protection | Result |
|---|---|
| All on | Name shown as text; nothing runs; no request |
| Escaping off, CSP on | Still blocked by the CSP |
| Escaping and CSP off, request blocking on | **The script ran** and tried to reach `evil.test`; only request blocking stopped the request |

**Immutable by design:** generate once at issue time, store the PDF/PNG, and never regenerate on the fly, so an old certificate can never change when the design does. Store `templateVersion`. A "reissue" (name fix) renders again with the *same* ID and date, logs an audit entry and keeps the old file.

## 8. Workflow improvements, in priority order

**Before the first official certificate**
1. Public verification page, QR, revoked state, rate limiting, `noindex`.
2. A permanent domain for the printed URL.
3. The age-aware next-mission rule (fixes finding 3).
4. Issuance that cannot fail silently: create the row as `PENDING`, render and upload, mark `READY`, e-mail; a cron sweeper retries `PENDING`; an admin "regenerate" button. (`@nestjs/schedule` and `EmailLog` retries are already in the codebase.)
5. A name check: ask once, at about 80% of the program, "Is this how the name should appear on the certificate?", plus an admin reissue with an audit log.
6. Fix the date to Dhaka time and show learning lessons (24), not sessions (28).

**With launch**
7. Certificates page, Home banner, nav dot, Web Share with the PNG.
8. New e-mail; UTM-tag its links so you can count how many certificate e-mails become enrolments.
9. The real signature scan (transparent PNG).
10. Admin certificate tools: list, resend, reissue, revoke.

**Later**
11. A follow-up nudge 7 days later if the "next mission" link was not opened.
12. Instagram-Stories share card (1080×1920) with the name and program.
13. "With Distinction" tier; optional per-program accent colours ("collect all seven").
14. A "skills earned" list on the verify page (from the curriculum).
15. Digitally signed PDFs (a padlock in Acrobat) only if a school ever requires it; it needs a paid certificate from a trusted authority.

## 9. Decisions I need from you

| # | Decision | My default |
|---|---|---|
| 1 | Which **domain** goes on the certificates and QR codes? (permanent) | Buy one; sample shows `lumexa.school` |
| 2 | Send a **scan of the founder's signature** (black pen, white paper, photo is fine) | Sample uses a font stand-in |
| 3 | Is "Lumexa AI School" the legal name? Is there a **registration or trade-licence number** to print? What city if any? | Nothing printed; I did not want to assume a city |
| 4 | What counts as **completed**? Today: passing the Final Test | Keep; if you add an attendance rule, change the printed sentence and the verify page |
| 5 | **"With Distinction"**: on or off, and the threshold | On at 90%; only the top tier is labelled |
| 6 | Verify page: **full name** or "Ayaan R."? | Full name, unguessable ID, `noindex`, policy sentence |
| 7 | Name check: **before** issuing or fix **after** on request? | Ask once at about 80% |
| 8 | Signatories: founder only, or add a second signature? | Founder only |

## 10. If you say go: implementation plan

**Server**
- Prisma migration on `Certificate`: `status` (`PENDING`/`READY`/`REVOKED`), `nameOnCertificate`, `templateVersion`, `pngUrl`, `previewUrl`, `revokedAt`/`revokedReason`, `seenAt`.
- `CertificateRendererService`: `tools/render.mjs` moved in, with `playwright-core` and `qrcode`; template, fonts and images under `server/assets/certificate/`.
- `CertificatesService`: pending-first issuance, retry sweeper, reissue and revoke (audited), age-aware recommender, e-mail with the new fields.
- Public, throttled `GET /certificates/verify/:id`; image endpoints for the e-mail and link previews.

**Client**
- `StudentTopNav` item; `student-dashboard/certificates` page; share helper (Web Share API with fallbacks); public `/verify/[id]` page with Open Graph tags and `noindex`; Home banner; Learning milestone.

**Test checklist:** the 11 self-checks, plus on real devices: WhatsApp and Facebook previews, the phone share sheet, e-mail in Gmail app and Outlook, a printed A4 copy scanned with a phone, and the production host's Chromium memory and timing.

## 11. What is and is not verified

**Verified by running:** the before-render; the recommendation table; all seven programs and the edge-case names; PDF properties; QR decoding at several qualities; hostile-name safety with a negative control; contrast; grayscale; timing and memory; font licences (all SIL OFL); LinkedIn's help page.

**Not verified:** e-mail rendering in Outlook/Gmail; share-sheet and link-preview behaviour on real phones; Chromium on your production host; whether you own the sample domain; the "24 / 28" counting issue against real data; the tablet-width navbar.

**Placeholders in the samples:** the founder's signature is a font-made stand-in; the domain is `lumexa.school`; student names, IDs and dates are invented.
