# Live classes: Daily setup

Live classes (1-to-1 lessons, batches, free trials, the QA demo classroom and the
admin's "watch a live class") run on [Daily](https://www.daily.co). This explains
how Lumexa uses it, the one-time setup (an API key and one Render variable), how to
test a real teacher–student class with a recording, what to check once against your
own Daily account, and what to do when something does not work. Code never contains
secrets: the key below is an environment variable (Render for the backend, a local
`server/.env` for development; start from `server/.env.example`).

- [1. How it works](#1-how-it-works)
- [2. One-time setup](#2-one-time-setup)
- [3. Test a real class: teacher, student, recording, playback](#3-test-a-real-class-teacher-student-recording-playback)
- [4. Check it once against your own Daily account](#4-check-it-once-against-your-own-daily-account)
- [5. Who can do what](#5-who-can-do-what)
- [6. When something does not work](#6-when-something-does-not-work)
- [7. Security notes](#7-security-notes)
- [8. What changed from LiveKit](#8-what-changed-from-livekit)

---

## 1. How it works

```
Browser (teacher / student)            Lumexa server (Render)              Daily
───────────────────────────            ──────────────────────              ─────
Join class ───────────────────────────► Lumexa checks the login, the booking
                                        and the room's lock / 10-person limit
                                        creates the class's private room ────► POST /rooms
                                        signs this person's meeting token ───► POST /meeting-tokens
        ◄─────────── room address + token (+ a key for the server's messages)
Join with the token ───────────────────────────────────────────────────────────► video, audio,
        ◄══════════════ everyone's camera, microphone and screen share ═════════   screen share
```

- **One private Daily room per class.** Its name is the class's room name
  (`lesson-<id>`, `batch-session-<id>`, `trial-<id>`, `lumexa-demo-classroom`). It is
  created when the first person joins and deleted when the class is ended. Nobody can
  join a private room without a meeting token, and only the Lumexa server can make one.
- **A meeting token is made for one person, for one room, for a few hours.** It carries
  the person's Lumexa user id and name. Only the class's **teacher** gets the Daily
  *owner* flag (`is_owner`); students, free-trial guests and the admin observer never do.
- **Moderation is done by the teacher's own browser, through Daily.** Because the teacher
  is the room's owner, Daily itself lets their browser mute a student, turn a camera
  off, stop a student's screen share and take away a student's right to unmute. Daily
  refuses the same calls from anyone else.
- **Removing a student, locking the classroom, the 10-person and 3-devices limits and the
  "knock to come back in" flow are done by the Lumexa server** over Daily's REST API
  (it needs the database).
- **Chat, raised hands, reactions and the teacher's spotlight** travel between browsers as
  Daily app messages. Nothing is stored (someone who joins late sees only what is said
  after they arrive), exactly as before.
- **The class's shared state** (chat lock, "students muted", the REC badge, the
  classroom lock) is written by the server into the room's Daily *session data*; every
  browser follows it.
- **Messages from the server** (a badge celebration, why someone is being removed) go to
  one person only and carry a key that only that person's browser was given, so another
  participant cannot fake one.
- **Recording is unchanged:** the teacher's browser records its own window and mixes the
  class's audio from the audio tracks Daily delivers to it; the file is uploaded
  straight to the private R2 bucket. Daily's own cloud recording is **not** used. See
  [CLASS_RECORDING_SETUP.md](CLASS_RECORDING_SETUP.md).

## 2. One-time setup

### 2.1 Create a Daily account

1. Sign up at [daily.co](https://www.daily.co). Signing up creates your **Daily domain**
   (for example `lumexa.daily.co`); every class room lives under it
   (`https://lumexa.daily.co/<room>`). You do not need to copy the domain anywhere —
   Daily returns each room's address and the server passes it on.
2. Check Daily's current pricing and free allowance against the minutes you expect
   (Daily bills by participant-minutes). Nothing in Lumexa needs a paid-only feature:
   webhooks, cloud recording and transcription are **not** used, so no credit card is
   required for Lumexa to work.

### 2.2 Get the API key

Daily dashboard → **Developers** → **API keys** → copy the key. Only a Daily *Admin*
can see, create or rotate keys; if the page shows no key you are probably a *Member* —
ask an Admin to give you the key or change your role.

Treat it like a password: it can create and delete rooms and sign tokens. It belongs
only in Render's environment — never in the repository, the frontend or a chat.

### 2.3 Set the variable on Render

Render → the backend service → **Environment**:

| Variable | Value |
|---|---|
| `DAILY_API_KEY` | the API key from step 2.2 |

That is the only new variable. (`DAILY_API_URL` exists for tests and for Daily's regional
endpoints; leave it unset.)

**Delete** these three, which nothing reads any more: `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET`. Your old LiveKit credentials do not work with Daily and Daily's
key does not work with LiveKit: they are different services.

The **frontend (Vercel) needs no new variable.** Browsers load Daily's call library from
`c.daily.co` and connect to Daily's servers, so the website's visitors must be able to
reach `*.daily.co` (see section 6 for networks that block it).

### 2.4 Database

**This change has no database migration.** (If you have not yet deployed the recording
change that came before it, the same redeploy applies its one migration,
`20261029000000_browser_recording_r2`, through the build command `npm run build` —
see [CLASS_RECORDING_SETUP.md](CLASS_RECORDING_SETUP.md) section 2.5.) The R2 variables
(`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) and the
bucket's CORS policy are **unchanged**.

### 2.5 Redeploy and check

Redeploy the backend (and the frontend, which no longer ships the LiveKit packages).
There is no startup log line for Daily. The check is a join: open a class (section 3).
Two answers mean the key is the problem:

| What the person sees | Meaning |
|---|---|
| "Video service is not configured." | `DAILY_API_KEY` is not set on the backend. |
| "The video service is not responding. Please try again in a moment." | Daily refused or did not answer: a wrong or rotated key, or Daily is down. The backend log has a line `Could not open <room> for <user>: Daily answered 401 …` that says which. |

## 3. Test a real class: teacher, student, recording, playback

You need two browsers (or one normal and one private window) so the teacher and the
student can be logged in at once, and two sets of ears: use headphones on one of them or
two computers, otherwise the speakers feed back. Chrome or Edge on a laptop or desktop
for the teacher (recording needs one); any current browser for the student.

Using the QA demo classroom (no real lesson needed): log in as **Teacher Demo** in one
and **Demo Student** in the other; both have a **Join Demo Classroom** button on their
dashboard. A real lesson works the same way (teacher: Schedule → the class → Join;
student: Learning → Join).

**A. Getting in**

1. **Teacher** joins. The pre-join screen shows the camera preview; pick the microphone
   and camera if there are several, then **Join Class**. Allow the camera and microphone
   when the browser asks.
2. **Student** joins the same way. Both see each other's video within a few seconds; the
   teacher's tile says *Teacher*; speaking lights up the speaker's tile border.
3. Speak on each side: the other hears you. Mute and unmute, switch the camera off and
   on. *(If someone cannot hear you, see section 6.)*

**B. The classroom**

4. **Teacher:** **Share screen**. In Chrome or Edge choose **Chrome Tab** and tick
   **Share tab audio** to share a tab *with* its sound (play a short video in it).
   The student sees the shared screen and hears the tab's sound. Stop sharing.
5. **Student:** **Raise hand** — the teacher sees a hand on the student's tile and a
   notice; **Chat** both ways.
6. **Teacher:** Participants → the student's **⋮** menu:
   **Mute microphone**, **Disallow unmute** (the student's microphone button then says
   *Muted by teacher* and cannot be used; **Allow unmute** gives it back), **Turn off
   camera**. In the **More** menu: **Mute all students** (mutes everyone now; they may
   unmute again) and the **Allow students to unmute** switch (off: every student's
   microphone button says *Muted by teacher*). In the chat header, the lock stops
   students typing. The student's screen reflects each change within a second.
7. **Teacher:** the *Open / Locked* chip in the header locks the classroom. A second
   student tab (a different login) is then refused with "This classroom is locked".
8. **Student on a second device:** open the class in a second tab as the same student —
   still one tile, and the teacher's list says "2 devices". A fourth tab is refused.

**C. Recording, upload, playback**

9. **Teacher:** press **Record class**. The browser asks what to share: choose
   **Window** (or **Chrome Tab**) and pick the Lumexa window, then **Share**. A card at
   the bottom-left shows a red dot and a running clock.
10. Talk on both sides for a minute. Mute the student for a few seconds, then unmute;
    mute the teacher too: **a muted microphone is not recorded.** Share a tab with sound
    if you like.
11. **Teacher:** **Stop recording**, then **Upload Class Recording**. The progress bar
    ends with *Uploaded — students can watch it from their dashboard.*
12. **Student:** dashboard → **Learning** → **Recordings**
    (`/student-dashboard/learning?tab=recordings`) → **Watch**. The video plays with the
    voices of the teacher and the student (and the sound of the shared tab), and can be
    dragged to any point.
13. *(Optional)* **Record class** again, stop, upload: Part 2; the student's player
    continues from Part 1 into Part 2.

**D. Leaving**

14. **Teacher:** Participants → the student's **⋮** → **Remove from class**: the student
    lands on their dashboard; opening the class again shows *Waiting to be let back in*
    and the teacher gets an *Admit / Deny* request.
15. **Teacher:** **End Class** (in a scheduled class it unlocks ten minutes after the
    start) and finish the outcome form. Everyone is disconnected and the class's Daily
    room is deleted. If a recording was not uploaded yet, the teacher lands on the upload
    page first.

## 4. Check it once against your own Daily account

The server's automated tests run against a fake of Daily's REST API (it checks every
request the way Daily does, including that unknown properties are refused). The browser
side was exercised in a real browser against the real `daily-js` library for everything
that works without other people in the room (camera, microphone, devices, audio levels,
background effects, a failed join) and against a simulated room for everything that
needs them (chat, hands, muting, sharing, recording). But **nothing has been run against
a live Daily room**, because that needs a Daily account. These are the things only you
can confirm. They are all covered by the walkthrough in section 3; here is what each one proves:

| Check | Where you see it | What it proves |
|---|---|---|
| Opening a class creates a room | Daily dashboard → **Rooms**: a private room named like the class, screen sharing on | `POST /rooms` is accepted with Lumexa's settings |
| The teacher is the owner, the student is not | Section 3 step 6 works for the teacher; a student has none of those menus | `is_owner` in the meeting token |
| Muting, camera-off, stop-share and "Disallow unmute" reach the student | Step 6: the student's tile and buttons change | the owner's `updateParticipants` is allowed by Daily and enforced on the student |
| Removing a student disconnects them | Step 14 | `POST /rooms/<room>/eject` |
| The locked classroom refuses a second student, and a fourth tab of one student | Steps 7–8 | `GET /rooms/<room>/presence` and the 4 s / 15 s room checks |
| Chat lock and "students muted" follow the teacher on every screen | Steps 5–6 | `POST /rooms/<room>/set-session-data` |
| A badge award shows a celebration to that one student only | Teacher presses **Award badge** in the bottom bar and awards one: only that student sees it | `POST /rooms/<room>/send-app-message` to a single recipient |
| Ending the class closes the room | Step 15; the room is gone from the Daily dashboard | `DELETE /rooms/<room>` |

If any one fails, Daily's dashboard → **Developers** → **API logs** lists every REST call
the server made with its status (kept for 3 days), which usually names the problem.

## 5. Who can do what

| | Teacher (room owner) | Student / free-trial guest | Admin observer |
|---|---|---|---|
| Camera, microphone, screen share | yes | yes (microphone: unless the teacher muted the class or took away their right to unmute) | no — joins silent, cannot send |
| Mute a student, turn a camera off, stop a share, allow/disallow unmute | yes (in their own browser, through Daily) | no | no |
| Remove a student, lock the classroom, end the class | yes (through the server) | no | no |
| Chat, raise a hand, react | yes | yes (chat: unless locked) | no |
| Spotlight a person, lower a hand | yes | no | no |
| Record the class | yes (not in free trials) | no | no |
| Counted in the "10 people" limit | yes | yes | no |

One person may be in a class from up to **3 devices or tabs**; they are one person
everywhere (one tile, one place in the count, one raised hand).

## 6. When something does not work

| What you see | Likely cause | What to do |
|---|---|---|
| "Video service is not configured." | `DAILY_API_KEY` is missing on Render | Section 2.3, redeploy |
| "The video service is not responding…" on every join | The key is wrong, was rotated, or the Daily account is suspended or out of allowance | Backend log `Could not open …: Daily answered 401/403 …`; Daily dashboard → Developers → API logs |
| "Could not load the video service" | The browser could not load Daily's library from `c.daily.co` | Check the internet connection; an ad blocker, school or office network or firewall may block `*.daily.co` |
| Joins, but nobody can see or hear each other | A network that blocks WebRTC | Try another network or a phone hotspot; ask the network's admin to allow Daily (<https://docs.daily.co/>: firewall guidance) |
| "This classroom is no longer open." | The class's room was closed (End Class) or has run out | Open the class again from the dashboard; the server makes a fresh room |
| Camera or microphone "blocked" on the pre-join screen | The browser or the operating system denied it, or another app has it | Allow it in the browser's address-bar icon and the system's privacy settings, close the other app |
| A student's voice is missing from the **recording** | They were muted (by themselves or the teacher) at that moment — a muted microphone is deliberately not recorded — or the class had no audio from them | Check they were unmuted; record again |
| The shared tab's sound is missing from the **recording** | The sharer did not tick *Share tab audio* (browsers only offer it for a tab or the whole screen in Chrome/Edge, not for a window) | Share a **Chrome Tab** with sound |
| The teacher's mute / camera-off / stop-share buttons do nothing | Daily only lets the room's *owner* do these, and the owner is the class's own teacher (the token the server signs for them says so) | Join with the class's teacher account, through the class's own Join button |
| "You can't stay in this classroom" | The teacher locked the classroom a moment before the student connected, or the class was full | Ask the teacher to unlock; try again |
| Recording or upload problems | Not about Daily | [CLASS_RECORDING_SETUP.md](CLASS_RECORDING_SETUP.md) section 6 |

## 7. Security notes

- The Daily API key exists only in Render's environment. It is never sent to a browser.
  What a browser gets is a meeting token for **one room**, for **one person**, that
  expires (3 hours for a class; at most that for a trial guest; 2 hours for an observer).
  Daily rooms are private: a room address on its own lets nobody in.
- **Who is the teacher** is decided by Daily's owner flag in the token the server signs,
  never by a name (anyone can change their display name).
- **Daily lets any participant write the room's shared data and send app messages.**
  So the classroom treats them as *hints*: a message can only raise its own sender's
  hand, only the owner's lower-hand and spotlight messages count, students' chat is
  dropped while the chat is locked, and a "students muted" or "chat locked" flag
  written by a non-server participant would only affect that participant's own screen
  and the screens that follow it — it grants nothing. The things that matter (who may
  mute, remove, lock) are enforced by Daily's owner permissions and by the server.
- The one weak point to know about: the **Allow students to unmute** switch (off: no
  student can unmute) is followed by each student's own browser. A student who tampers
  with their own browser can still unmute themselves. **Mute all students** and the
  **per-person "Disallow unmute"** are enforced by Daily itself; "Disallow unmute"
  cannot be undone by the student.
- The 10-person and 3-device limits and the classroom lock are checked when a token is
  issued and again 4 and 15 seconds later by looking at who is really in the room (the
  server asks Daily for the room's presence); anyone who got past the first check is
  told why and removed. (Daily's webhooks would be instant, but they need a Daily plan
  with a credit card and a public endpoint; the timed check needs neither.)

## 8. What changed from LiveKit

- **Gone:** `livekit-server-sdk`, `livekit-client`, `@livekit/components-react` and
  `@livekit/components-styles`; the `LIVEKIT_URL`, `LIVEKIT_API_KEY` and
  `LIVEKIT_API_SECRET` variables; the `POST /classroom/webhook/livekit` endpoint (it now
  answers 404); the server-side moderation endpoints for muting and stopping shares
  (the teacher's browser does those through Daily).
- **New:** `@daily-co/daily-js` in the frontend; `DAILY_API_KEY` on the backend;
  `server/src/classroom/daily-rooms.service.ts` (the one place the server talks to
  Daily).
- **Unchanged:** logins, scheduling, curriculum, dashboards, the room lock, the 10-person
  and 3-device limits, knock-to-rejoin, badges, the end-class outcome flow, the browser
  recording, the R2 upload, signed playback, and every URL a person visits.
- **Behaviour you may notice:** background blur and virtual backgrounds are now Daily's
  own (desktop browsers only; where a browser cannot do them the effects panel says so); a tile
  shows a connection warning for another person only when Daily reports a network
  quality for them (your own connection is always watched); and a muted microphone is
  deliberately left out of a recording (section 6).
