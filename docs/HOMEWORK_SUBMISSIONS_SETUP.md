# Homework files: Cloudflare R2 setup

How homework files are stored, reviewed and kept until the student finishes their
program, the one-time setup (a **separate**
private R2 bucket, its own API token, four Render variables), and how to test it.
Nothing here touches the class-recordings bucket (`lumexa-recordings`) or its
settings — see [CLASS_RECORDING_SETUP.md](CLASS_RECORDING_SETUP.md) for that.

## 1. How it works

```
Student                       Lumexa server (Render)                 R2 (homework bucket, private)
───────                       ──────────────────────                 ─────────────────────────────
Submit Work ── files ───────► checks: their own completed lesson,
                              allowed type, ≤ 15 MB, PDFs/images are
                              really PDFs/images ───── PUT ─────────► homework/<course>/<student>/<id>/<name>
                              records a HomeworkFile row (UPLOADED)
            ◄── file ids ────  (any failure: everything already stored is taken back, nothing is kept)
            ── submit (ids) ─► asks R2 "is each file there, whole?" ── HEAD ─►
                              only then: submission = PENDING, files = ATTACHED

Teacher: Submissions → click a file
   code / HTML / .ipynb  → Lumexa's viewer page, shown as TEXT (never run)
   PDF / image           → browser viewer, from a signed link that lasts 5 minutes
   .sb3 / .rbxl / .docx… → normal download (same kind of signed link)

Teacher: Submit Review
   grade + feedback + status are saved. The files are NOT touched: they stay in R2 and stay
   openable by the student, the teacher and admins, before and after the review.

Student finishes the program (curriculum)            ← the only thing that removes reviewed files
   Every 10 minutes the sweep looks for students who have finished a program. For each one it
   1. marks that student's reviewed files for that program DELETE_PENDING
   2. removes them from R2 → DELETED           (if R2 fails: they stay DELETE_PENDING and are retried)
   The submission, grade and feedback are kept; the student sees "removed (program completed)".

Every 10 minutes a sweep also: retries failed removals (1, 2, 4 … 60 min apart, never gives up),
removes uploads never submitted (24 h) and files whose submission was deleted. It NEVER touches
the file of a submission that is still waiting for review.
```

**When is a program finished?** For a student and a course, when either

- a **certificate** was issued for it (the Final Test was passed), or
- the student has had the course's **last lesson** (a completed or partially-completed class
  at the highest lesson number — the larger of the course's session count and its highest
  lesson order) **and** has no class of that course still coming up (a partially completed
  last lesson has an extra class, so the program is not over until it is taught).

A batch student who joined part-way never had the early lessons, so they are not required.
Removal is irreversible, so any doubt (an unfinished lesson list, an extra class still
booked) means "not finished". Only that student's files **for that course** are removed:
another student's, and the same student's files for a different program, stay.

Work handed in after the program is finished is held until the teacher has reviewed it, then
removed by the next sweep — a file is never removed before a teacher has had the chance to
see it.

- The browser never receives R2 credentials or a permanent address. Files are sent to
  *this server*, which stores them, so **no CORS policy is needed** on the bucket.
- Homework files are **only** in R2. Cloudinary is still used for avatars and teacher
  verification documents, not for homework. Submissions made before this change keep
  their Cloudinary links and keep working.
- HTML is never opened from storage: it is shown as source text in Lumexa's viewer. PDFs
  and images are served by R2 on its own domain with a content type Lumexa chooses (never
  taken from the file).

## 2. One-time setup — what you must do

### 2.1 Create the homework bucket (do **not** reuse `lumexa-recordings`)

1. Cloudflare dashboard → **R2 Object Storage** → **Create bucket**.
2. Name it e.g. `lumexa-homework`. Location: Automatic (or the same as the recordings one).
3. **Leave public access off.** Do not enable the `r2.dev` URL and do not connect a custom domain.
4. Do **not** add an object-expiry lifecycle rule: files must stay for as long as the student is
   on the program (months), and only Lumexa knows when that ends. (Optional and safe: a rule that
   *aborts incomplete multipart uploads*.)

### 2.2 Create a separate API token for it

1. R2 Object Storage → **Manage API tokens** → **Create API token**.
2. Permission **Object Read & Write**; **Specify bucket →** only the homework bucket.
3. Copy the **Access Key ID** and **Secret Access Key** (shown once). This must be a *different*
   token from the recordings one.

### 2.3 Add the variables to Render (backend service → Environment)

| Variable | Value |
|---|---|
| `HOMEWORK_R2_BUCKET` | the homework bucket name, e.g. `lumexa-homework` |
| `HOMEWORK_R2_ACCESS_KEY_ID` | Access Key ID from 2.2 |
| `HOMEWORK_R2_SECRET_ACCESS_KEY` | Secret Access Key from 2.2 |
| `HOMEWORK_R2_ACCOUNT_ID` | your Cloudflare Account ID (optional if `R2_ACCOUNT_ID` is already set — same account) |

Optional: `HOMEWORK_R2_ENDPOINT` (EU-jurisdiction bucket or a local S3-compatible server).

The existing `R2_*` variables stay exactly as they are. The server **refuses** to use a homework
bucket that is the recordings bucket (by name `lumexa-recordings` or equal to `R2_BUCKET`) and says
so in the log.

### 2.4 Database

`npx prisma migrate deploy` (the Render build already runs it) applies
`20261030000000_homework_files_r2` — one new table and two enums, and
`20261102000000_homework_files_kept_until_program_end` — one new enum value. Both are purely additive.

### 2.5 Check it

After deploy the Render log shows one of:

- `Homework storage is ready: bucket "lumexa-homework" …` — good.
- `Homework file storage (Cloudflare R2) is not available — missing …` — set the variables.
- `Homework storage check failed … 403` — wrong token/bucket permissions.

## 3. Test the whole workflow

1. As a student with a completed lesson that has homework: Learning → Lessons → open the lesson
   → attach a `main.py` and a `.sb3` → **Submit Work**. It shows *Work Submitted · Needs Review*.
   In the R2 dashboard both objects are under `homework/…` in the homework bucket.
2. As the teacher: **Submissions → Needs Review**.
   - Click `main.py` → a new tab shows the code with line numbers (and "shown as text — it is not run").
   - Submit an `index.html` containing `<script>alert(1)</script>` → it appears as text, no alert.
   - A `.ipynb` → cells and outputs; a PDF → the browser's PDF viewer; `.sb3` → downloads.
3. Review → pick Approved, a rating, feedback → **Submit Review**. The submission shows the grade;
   **the R2 objects are still there** and the file still opens for the student, the teacher and an
   admin.
4. Finish the program: have the student's last lesson ended as *Completed* (and none of that course
   still upcoming). Within ~10 minutes the R2 objects of the student's reviewed files for that
   course are gone; the student's page shows "removed (program completed)"; the grade and feedback
   are still there; clicking a removed file says so. Another student's files, and the same
   student's files for a different course, are untouched.
5. Failure checks: temporarily set a wrong `HOMEWORK_R2_SECRET_ACCESS_KEY` → uploads fail with
   "Your file could not be uploaded. Nothing was submitted"; restore it. To test a stuck removal,
   break the key after the program is finished: the files stay `DELETE_PENDING`, and after restoring
   the key the sweep removes them within ~10–70 minutes.

Automated: `cd server && npx jest src/submissions` (the integration spec needs a throwaway
Postgres: `ASSESSMENT_INTEGRATION_DATABASE_URL=postgresql://…/lumexa_it`, see
`src/assessments/testing/integration-db.ts`).

## 4. Limits and rules

- 15 MB per file, 10 files per upload, 60 MB per upload, 20 un-submitted files per lesson.
- Allowed: documents (PDF, Word, TXT, RTF, ODT), archives (ZIP, RAR, 7Z), images (JPG, PNG, GIF, WEBP,
  HEIC), and code/project files (`.py .ipynb .html .css .js .java .sb3 .rbxl` and the other
  languages listed in `server/src/submissions/homework-file-types.ts`). Others are refused.
- Who may open a file: its student, the teacher it was sent to, and admins — nobody else.

## 5. Troubleshooting

| Symptom | Cause |
|---|---|
| "Uploading files is not available right now" | `HOMEWORK_R2_*` missing/wrong, or bucket = recordings bucket. Read the Render log. |
| Files stay `DELETE_PENDING` after the program finished | R2 unreachable/denied; the sweep retries. Persistent → check the token has Object Read & Write on the homework bucket. |
| A student finished but their files are still in R2 | Not finished by the rule above (an upcoming class of that course, or the last lesson not marked Completed), or the work is still waiting for a review. |
| A file shows "removed" for work still pending | It cannot: removal only starts from a finished program (after the review) or a replacement. Check `HomeworkFile.deleteReason` (`PROGRAM_COMPLETED`, `REPLACED`, `ABANDONED`, `ORPHANED`; `REVIEWED` only on files removed before this change). |
| Files of a student who moved to a different curriculum before finishing | They stay until that program is finished; they are not removed on a change of curriculum. |
