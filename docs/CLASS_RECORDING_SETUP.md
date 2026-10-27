# Class recordings: Cloudflare R2 setup

How class recordings work, what to set up once (a private R2 bucket, an API
token, CORS, four Render variables), how to test the whole thing, and what to do
when it does not work. Code never contains secrets: every value below is an
environment variable (Render for the backend, a local `server/.env` for
development; start from `server/.env.example`).

- [1. How it works](#1-how-it-works)
- [2. One-time setup](#2-one-time-setup)
- [3. Test the whole workflow](#3-test-the-whole-workflow)
- [4. What teachers and students see](#4-what-teachers-and-students-see)
- [5. Browser limits you should know about](#5-browser-limits-you-should-know-about)
- [6. When something does not work](#6-when-something-does-not-work)
- [7. Storage, retention and security](#7-storage-retention-and-security)
- [8. What changed from the old recorder](#8-what-changed-from-the-old-recorder)

---

## 1. How it works

```
Teacher's browser                       Lumexa server (Render)            Cloudflare R2 (private)
─────────────────                       ──────────────────────            ───────────────────────
Record  ─────────────── tells ────────► "teacher X is recording class Y"
  records the browser window
  + the class's audio (WebM)
Stop    ── finishes the file,
           keeps it in the tab
Upload Class Recording
        ── asks for an upload URL ────► checks it is the class's teacher,
                                        signs a 15-minute PUT URL for one file
        ── PUT the file ──────────────────────────────────────────────────► recordings/<class>/<id>.webm
        ── "done" ──────────────────────► asks R2: is the file there, a WebM,
                                          exactly that size?  → now watchable
Student: Learning → Recordings → Watch
        ── asks to watch ───────────────► checks the student is in the class,
                                        signs a 2-hour GET URL
        ◄── plays the video straight from R2 ──────────────────────────────
```

- **Nothing is recorded on the server.** There is no LiveKit Egress and no FFmpeg.
  The live classroom (LiveKit) is unchanged.
- **The R2 keys never leave the server.** The browser only ever receives a URL that
  is good for one file and expires on its own.
- A class can be recorded **several times** (Record → Stop → Record…). Each is its own
  *part*, with its own file, so nothing is overwritten. Students see them as "Part 1,
  Part 2…" and the player continues from one into the next.
- A recording exists **only in the teacher's browser tab until it is uploaded**. Students
  cannot watch it before then. If the tab is closed or reloaded first, it is lost; the
  browser warns before that happens, and the teacher's dashboard shows a banner while
  anything is waiting.

## 2. One-time setup

### 2.1 Create a private bucket

1. Cloudflare dashboard → **R2 Object Storage** → **Create bucket**.
2. Name it, for example, `lumexa-recordings`. Location: Automatic.
3. **Leave public access off.** Do not enable the `r2.dev` URL and do not connect a
   custom domain. Students never use a public link; the server signs a private one.

On the R2 overview page note your **Account ID** (right-hand side).

### 2.2 Create an API token for the bucket

1. R2 Object Storage → **Manage API tokens** → **Create API token**.
2. Permission: **Object Read & Write**.
3. **Specify bucket**: choose only the recordings bucket.
4. Create it and copy the **Access Key ID** and **Secret Access Key** (the secret is
   shown once). You do not need the "token value" or the "jurisdiction" endpoints.

### 2.3 Add the bucket's CORS policy

The teacher's browser uploads straight to R2, so R2 must allow the Lumexa website to
do that. Bucket → **Settings** → **CORS Policy** → **Add CORS policy**, and paste:

```json
[
  {
    "AllowedOrigins": ["https://YOUR-LUMEXA-WEBSITE"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

- `AllowedOrigins` must be the website address **exactly** — `https://`, no path, no
  trailing slash. It is the same address as `FRONTEND_URL` on Render (the production
  Vercel URL). Add each other address people use as another item in the list. For
  local development add `"http://localhost:3000"`.
- `PUT` + `content-type` is what the upload needs (the browser sends a "preflight"
  check first and R2 must say yes). Watching works with `GET`.
- A CORS change usually applies within a minute.

### 2.4 Add the variables to Render

Render → the backend service → **Environment**:

| Variable | Value |
|---|---|
| `R2_ACCOUNT_ID` | your Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | the Access Key ID from step 2.2 |
| `R2_SECRET_ACCESS_KEY` | the Secret Access Key from step 2.2 |
| `R2_BUCKET` | the bucket name, e.g. `lumexa-recordings` |

Optional (the defaults are fine):

| Variable | Default | Meaning |
|---|---|---|
| `R2_ENDPOINT` | `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` | Only for an EU-jurisdiction bucket (`https://<id>.eu.r2.cloudflarestorage.com`) or a local S3-compatible server. |
| `RECORDING_MAX_DURATION_MINUTES` | `70` | Longest one recording may run. The browser stops it by itself at this length; the teacher records again for the next part. |
| `RECORDING_STORAGE_LIMIT_BYTES` | `53687091200` (50 GB) | When uploaded recordings pass this, the oldest are removed. Admins are warned at 80 %. |

The old `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` (and
their `AWS_*` fallbacks) are **no longer read by anything**. Delete them from Render.

### 2.5 Deploy

Redeploy the backend. The build runs `npm run build`
(`prisma generate && nest build && prisma migrate deploy`), which applies the one
database migration for this feature, `20261029000000_browser_recording_r2`. It only
adds columns to `RecordingSegment` and settles any recording the old recorder had left
"processing"; existing recordings and their links are untouched. (If Render's build
command is not `npm run build`, run `npx prisma migrate deploy` once yourself.)

The frontend needs no new variables.

Then check the backend log after it starts. One of these lines appears:

| Log line | Meaning |
|---|---|
| `Recording storage is ready: bucket "lumexa-recordings" on https://….r2.cloudflarestorage.com.` | Keys, account and bucket are right. |
| `Recording storage (Cloudflare R2) is not configured — missing …` | One of the four variables is not set. Recording still works; uploading does not. |
| `Recording storage check failed for bucket … : <reason>` | The variables are set but wrong (account ID, bucket name or keys). |

## 3. Test the whole workflow

You need two browsers (or one normal window and one private window) so the teacher and
the student can be logged in at once. Chrome or Edge on a computer for the teacher.

Using the QA demo classroom (no real lesson needed): log in as **Teacher Demo** in one
and **Demo Student** in the other; both have a **Join Demo Classroom** button on their
dashboard.

1. **Teacher:** join the classroom and press **Record** in the bottom bar.
2. The browser asks what to share. Choose **Window**, pick the browser window that shows
   Lumexa, and press **Share**. A card at the bottom-left shows a red dot and a running
   clock.
3. **Student:** join, switch the microphone on and say something. Teacher: say something
   too, and share a screen or play a lesson video if you like.
4. **Teacher:** press **Stop recording** (the same button). The card now shows
   *Recording 1 — saved on this computer* with **Upload Class Recording**.
5. Press **Upload Class Recording**. A progress bar runs; it ends with
   *Uploaded — students can watch it from their dashboard.* In Cloudflare the bucket now
   holds `recordings/lumexa-demo-classroom/<id>.webm`.
6. *(Optional)* Press **Record** again, stop, upload: that is **Part 2**. Nothing from
   Part 1 changes.
7. **Student:** dashboard → **Learning** → **Recordings**
   (`/student-dashboard/learning?tab=recordings`) → **Watch**. The video plays with the
   voices of everyone in the class and can be dragged to any point.

Checks worth doing once:

- **Leaving with something unuploaded.** Record, stop, then end the class (or press
  Leave) *without* uploading. The teacher lands on an *Upload your class recording*
  page instead of the dashboard, and after going to the dashboard a banner stays at the
  top until it is uploaded.
- **A bad connection.** In Chrome DevTools → Network, switch to *Offline* in the middle
  of an upload: it retries by itself, then shows *Could not reach storage…* with
  **Retry upload**. Go online and press it.
- **Who may watch.** Another student who is not in the class sees nothing in their
  Recordings tab, and cannot play the recording even with its id.
- **Real classes.** For a 1-to-1 lesson or a batch, every student of the class sees the
  recording under Learning → Recordings, with the lesson's title.

## 4. What teachers and students see

**Teacher** (classroom, bottom bar and the card at the bottom-left)

| State | What it says / does |
|---|---|
| Choosing | "Your browser is asking what to share…" — pick **Window** (this Lumexa window) or **Chrome Tab**. |
| Recording | Red dot, clock, size, and what is being recorded ("a window", "one browser tab", "your whole screen"). |
| Saved | "Saved on this computer. Students cannot watch it until you upload it." + **Upload Class Recording**, **Discard**. |
| Uploading | A progress bar and "Keep this tab open". |
| Failed | The reason in plain words and **Retry upload**. The file is still on the computer. |
| Uploaded | ✓ "students can watch it from their dashboard". |

A recording stops by itself, and says why, at the length limit, at the size limit (a part
can be at most about 2 GB), if the teacher uses the browser's own "Stop sharing", or
when the class ends. In every case what was recorded is kept and can be uploaded.

**Student:** Learning → **Recordings**: one card per class (lesson title, teacher, date,
length, "2 parts"), **Watch** opens the player. A note says when more recordings of their
classes are "still being uploaded by your teacher". Parents see their child's recordings
on the child's *Recordings* page; admins open **Classes → View recording** to see every
part and its state.

## 5. Browser limits you should know about

These are limits of what browsers allow, not choices made in Lumexa.

- **Only desktop browsers can record a screen.** Chrome and Edge on a laptop or desktop
  are the ones this was built and tested for; Firefox has the same abilities and should
  work, but it has not been tested. Phones and tablets cannot record a screen at all,
  and a browser that cannot make WebM videos (older Safari) cannot record. In those the
  Record button explains why instead of failing.
- **The teacher chooses what is captured.** A website can only *ask* for a window; the
  browser always shows its own picker, and the teacher may pick a tab, a window or the
  whole screen. The card says what is being recorded. "Window" records the whole browser
  window; "Chrome Tab" records only that tab (without the address bar); "Entire screen"
  also records other applications and notifications, so avoid it.
- **Window capture has no sound, so the sound is not taken from it.** Browsers either
  give no audio for a window or give whatever the computer plays — never the teacher's
  microphone. Lumexa therefore mixes the **class audio itself** from the same LiveKit
  audio tracks the classroom plays: the teacher's microphone, every student's
  microphone, and the sound of any screen share. Students who join, leave or mute
  mid-class come and go in the mix. Other programs' sound (music, notifications) is not
  recorded.
- **"Stop sharing"** in the browser's own bar ends the recording (it is saved).
- **The recording lives in the browser tab until it is uploaded** (memory, not disk).
  Closing or reloading the tab loses it, and a very long recording needs a computer
  with free memory. Parts are limited to 70 minutes / about 2 GB so they stay uploadable.
- **Watching needs a browser that plays WebM (VP8 + Opus):** Chrome, Edge, Firefox, and
  recent Safari. Anywhere else the player says so instead of showing a black box.
- **Jumping around in a recording** works because the browser finishes the file with a
  length and a jump index when recording stops. A recording made by a browser whose
  file layout is not recognised still plays, but jumping ahead may be slower.

## 6. When something does not work

| What you see | Likely cause | What to do |
|---|---|---|
| Teacher: "Recording storage is not set up on the server yet: missing R2_…" | One of the four variables is missing on Render. | Add it (section 2.4) and redeploy. Recording itself still worked; the file is still in the tab, so press Upload again. |
| Teacher: "Could not reach storage…" (and a red CORS error in the browser console) | The bucket's CORS policy is missing, or the origin in it does not exactly match the website address. | Section 2.3. Check `https://`, no trailing slash, `PUT` and `content-type`. |
| Teacher: "Storage refused the upload (403)" | The API token is read-only, is for another bucket, or was deleted. | Create a new token (2.2) and update the Render variables. |
| Teacher: "…not the size that was recorded" / "not a WebM" | The upload did not complete or was altered. | Press **Retry upload**. |
| Backend log: `Recording storage check failed …` | Wrong account ID, bucket name or keys. | Compare the three with Cloudflare; redeploy. |
| Student: "N more recordings … still being uploaded by your teacher" | The teacher has recorded but not pressed **Upload Class Recording** yet. | Ask the teacher to open their dashboard: a banner there has the button. |
| Student: "This browser cannot play Lumexa class recordings" | The browser cannot play WebM. | Use Chrome, Edge or Firefox (or a current Safari). |
| Student: the video stops after a long pause | The 2-hour link ran out. | It asks for a fresh one by itself and carries on; if not, close and press **Watch** again. |
| Admin: a part says "Not available — The recording was not uploaded in time." | Nobody uploaded it for 12 hours (the teacher is alerted too). | If the teacher's tab is still open the recording is still in it and **Upload Class Recording** still works. If the tab was closed it is gone: record again. |

## 7. Storage, retention and security

**Where things are stored**

- The video: R2, one object per part, `recordings/<classroom>/<part id>.webm`.
- The record of it: the `RecordingSegment` table — class, who recorded it, status
  (`RECORDING` → `UPLOADING` = recorded and waiting for its upload → `AVAILABLE` / `FAILED` /
  `EXPIRED`), length, size, time. A lesson's or booking's `recordingStatus` is a summary of
  its parts. `recordingUrl` is only used by recordings made by the old recorder, which
  keep working as plain links.

**Retention.** Every hour, if uploaded recordings together pass
`RECORDING_STORAGE_LIMIT_BYTES`, the oldest are deleted (the file and its access), only
as many as needed. Admins get an alert at 80 %. Recordings are otherwise kept.

**Security**

- The bucket is private. Every upload and playback link is signed on demand, after the
  server has checked who is asking: only the class's teacher can upload, and only
  someone who belongs to the class — its students, a booked child's parent, its
  teacher, an admin — can get a playback link. Anyone else is told "not found".
- An upload link works for one file, for 15 minutes. A playback link works for 2 hours
  and then dies. Neither can be used for any other file.
- When the browser says it has uploaded, the server does not take its word for it: it asks
  R2 whether the file exists, is a WebM and is exactly the size recorded, and only then
  makes it watchable.
- A part's id is chosen by the browser and is unique to the part, so repeating a
  request (a retry, a double click) can only ever refer to the same part. Uploading the
  same part twice replaces its own file; it can never touch another part.
- The R2 keys exist only in Render's environment. They are never sent to the browser
  and never written to the repository.

## 8. What changed from the old recorder

- LiveKit Egress, the webhook that finished it, the FFmpeg merge job
  (`@ffmpeg-installer/ffmpeg`) and the admin "Retry recording" action are removed.
- `S3_*` settings are no longer used. One set of `R2_*` settings is used everywhere.
- Recordings made before this change are unchanged and still play from their old links
  (students' Recordings tab and the admin Classes list show them as before).
- Trial classes are never recorded (they are not lessons).
