# Little Coders lesson videos — storage setup

Every one of the 40 Little Coders lessons opens with a **"Your Learning Preview"** video (about 80 seconds,
1920×1080, spoken narration, soft music, synchronized subtitles). The videos are kept **indefinitely** in
their **own Cloudflare R2 bucket**, separate from class recordings, homework files, chat history and
certificates. Nothing in that bucket is ever deleted by Lumexa — the server has no code path that deletes
a lesson video.

This page is everything you need to do. It takes about 15 minutes, plus the time to upload 480 MB.

> **Until you finish, nothing breaks.** Lessons keep showing "Video coming soon", and the admin lesson
> editor tells you exactly which setting is missing.

## How it fits together

```
  the 40 finished MP4s ──(upload)──▶  R2 bucket  lumexa-lesson-videos   (private)
                                         │
   lesson opens ─▶ server makes a signed link (valid 6 hours) ─▶ browser plays the video
```

* Videos, posters and subtitle files are stored under **content-addressed names** —
  `lesson-videos/little-coders/<lesson>/<first 12 characters of the file's SHA-256>.mp4`. A re-recorded video
  gets a new name, so nobody ever sees a stale cached copy and an old version is never overwritten.
* The bucket stays **private**. The server signs a short-lived link whenever a lesson is opened. (Optional:
  put a public domain in front of the bucket and set `LESSON_VIDEO_PUBLIC_BASE_URL`; then plain addresses are
  used and Cloudflare caches the videos at the edge.)
* The release contains a small list of the finished videos (`server/src/little-coders/videos/published-videos.ts`:
  each video's SHA-256, size and chapter markers). **As soon as a listed file is in the bucket, the lesson
  shows it** — on the next server start, or when an admin presses **Check storage for the finished videos**
  in the lesson editor. So how the files get into the bucket is up to you (steps 4–5).

## 1. Create the bucket

Cloudflare dashboard → **R2 Object Storage** → **Create bucket**

* Name: **`lumexa-lesson-videos`** (any name works, but it must not be the recordings, homework, chat or
  certificate bucket — the server refuses those).
* Location: automatic is fine. Keep it **private** (do not enable public access unless you also want the optional
  public address — see step 6).

## 2. Create an API token for that bucket only

R2 → **Manage API tokens** → **Create API token**

* Permission: **Object Read & Write**
* Specify bucket: **`lumexa-lesson-videos`** only
* Create, then copy the **Access Key ID** and **Secret Access Key** (the secret is shown once).

Your **Account ID** is on the same R2 page (it is not a secret).

## 3. Give the server the settings

On Render (server service → **Environment**) add:

| Variable | Value |
| --- | --- |
| `LESSON_VIDEO_R2_BUCKET` | `lumexa-lesson-videos` |
| `LESSON_VIDEO_R2_ACCESS_KEY_ID` | the Access Key ID from step 2 |
| `LESSON_VIDEO_R2_SECRET_ACCESS_KEY` | the Secret Access Key from step 2 |
| `LESSON_VIDEO_R2_ACCOUNT_ID` | your Cloudflare Account ID (optional if `R2_ACCOUNT_ID` is already set) |

Redeploy. In the server log you should see
`Lesson video storage is ready: bucket "lumexa-lesson-videos" …`. If something is wrong, the log says which
setting, and the lesson editor of a Little Coders lesson (**Learning Preview → Stored video**) shows the same message.

## 4. Get the 40 videos into the bucket

Pick whichever suits you. All of them put the same files in the same places.

### A. Upload tool (recommended)

Uploads every video, poster and subtitle file with the same checks the admin button uses, and switches each
video on for its lesson. Run it on a computer that has the repository and the built videos (`server/.lesson-videos/`,
or any folder with `--dir`):

```bash
cd server
cp .env.example .env            # then fill in DATABASE_URL and the LESSON_VIDEO_R2_* values
npm install
npm run lesson-videos:upload -- --dry-run     # checks the files, touches nothing
npm run lesson-videos:upload                  # uploads everything and attaches it to the lessons
```

Useful options: `--lesson c1l1,c2l3` (only these), `--dir <folder>`, `--no-db` (only copy the files; the server
switches them on by itself), `--replace` (also replace a video a lesson already has).
Running it again is harmless: videos that are already uploaded are skipped.

### B. Any S3 tool (rclone, `aws s3 sync`, Cloudflare's own uploader)

Let the tool write the files in the bucket's own layout, then copy the folder:

```bash
cd server
npm run lesson-videos:upload -- --stage ./bucket        # no network, no database
rclone copy ./bucket/lesson-videos r2:lumexa-lesson-videos/lesson-videos --progress
```

(Or drag the `lesson-videos` folder into the bucket in the Cloudflare dashboard.) Then restart the server, or
press **Check storage for the finished videos** in the admin lesson editor.

### C. One lesson at a time, in the admin

**Admin → open a Little Coders lesson in the lesson editor (`/admin/lessons/<id>/edit`) → Learning Preview → Stored video.** Choose the MP4
(and optionally a JPEG poster and a `.vtt` subtitle file), optionally type the chapter start times
(`0, 8, 19, 43, 60, 69`) and press **Upload to storage**. The file is checked (a real MP4, 16:9, 10–120 s)
before anything is stored. **Detach** stops the lesson showing the video; the file stays in the bucket.

## 5. Where do the 40 MP4 files come from?

They are **not in git** (480 MB), by design. They were produced by `server/prisma/lesson-videos/` — see its
`README.md` — and can be rebuilt at any time with `npm run lesson-videos:build`, which needs ffmpeg, a
Chromium (Puppeteer downloads one) and the free Kokoro text-to-speech model. If you rebuild, run
`npm run lesson-videos:manifest` afterwards and commit the updated `published-videos.ts`: a rebuilt video has a
new hash, so a new name in the bucket.

## 6. Optional: make delivery faster with a public address

Signed links work everywhere and need nothing else. If you would rather have Cloudflare cache the videos at the edge:

1. Bucket → **Settings** → **Custom Domains** → connect e.g. `videos.lumexa.example`.
2. Set `LESSON_VIDEO_PUBLIC_BASE_URL=https://videos.lumexa.example` on Render and redeploy.

The files have unguessable-by-design content-addressed names but are then **publicly readable by anyone who has
the link** — fine for lesson previews, which hold no student data.

### Subtitles and CORS

The videos have their subtitles **burned in**, so they work without anything below. The player also offers a
separate subtitle track (the **CC** button) when it can read the `.vtt` file; a browser only reads it from another
site if the bucket allows that. To enable it: bucket → **Settings** → **CORS policy**:

```json
[
  {
    "AllowedOrigins": ["https://your-lumexa-site.example"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

If you skip this, the CC button is simply hidden.

## Checking that it works

* In the lesson editor of any Little Coders lesson, *Learning Preview → Stored video* says **"Storage is ready … N of 40 lessons show a
  stored video"**.
* Open the lesson as a student: the player shows the video with play/pause, a seek bar with a marker for every
  scene, "Jump to" buttons, volume, speed, fullscreen and keyboard shortcuts (Space, ←/→, M, F, C).
* A signed link expires after 6 hours; reloading the lesson makes a fresh one.

## Costs and safety

* R2 has **no egress fees**; 480 MB of storage costs a few cents a month.
* The token is scoped to this one bucket. The application never deletes a lesson video; if you also want R2 itself
  to refuse deletions, add an indefinite **Bucket Lock** rule to the bucket (R2 → bucket → Settings → Object lock).
* The bucket holds no personal data — only the lesson videos.

## Troubleshooting

| You see | Cause |
| --- | --- |
| "Video coming soon" on every lesson | The settings in step 3 are missing, or the videos are not in the bucket yet. Look at the *Stored video* box in the lesson editor. |
| "Lesson video storage is not set up yet (missing …)" | Add the named variable on Render and redeploy. |
| "… is another Lumexa bucket (recordings or homework)" | Create a bucket just for lesson videos (step 1). |
| Upload says "The video is N seconds long …" | A preview video is 10–120 seconds (60–100 is the target), 16:9, at least 1280×720. |
| "The video could not be loaded" after a long time on the page | The 6-hour link expired. Reload the lesson. |
| The upload tool says `AccessDenied` | The token is not scoped to this bucket, or only has read permission (step 2). |
