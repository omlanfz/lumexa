# Classroom

The live classroom ([Daily](https://www.daily.co)): who may be in it, how a batch
shares one room, the teacher's lock, joining from several devices, ending a class,
recording, and the badge system. Setting Daily up: `docs/CLASSROOM_DAILY_SETUP.md`.

## Daily (`daily-rooms.service.ts`)

The one place the server talks to Daily's REST API, with one setting: `DAILY_API_KEY`
(`DAILY_API_URL` only for tests). Nothing else is configured: a room's address comes
back from Daily itself.

- **A room** is a **private** Daily room named after the class (below), created on
  demand by the first join (`ensureRoom`) and deleted when the class ends. Nobody
  can join one without a meeting token.
- **A way in** is a **meeting token** (`createMeetingToken`, via `entryFor`) made per
  person, per join: bound to that room, carrying the person's **`user_id`** (their user
  id — a uuid is exactly Daily's 36-character limit; a trial guest is `tg-<trial id>`;
  the admin observer `admin-observer-<ms>`) and their name. Only the class's
  **teacher** gets `is_owner`, which is what lets the teacher's own browser mute
  people, stop a screen share or lock a microphone — Daily enforces that, so a
  student's browser cannot. The admin observer's token cannot send audio, video or
  screen. A token lasts 3 hours (a trial guest: until shortly after the joining
  window).
- **One person, several devices.** Daily gives each connection its own `session_id`;
  the person is the `user_id`. Everything that counts _people_ (the 10-person cap, a
  removal, a tile, a raised hand) goes by `user_id`.
- **Shared class state** — chat lock, "students muted", the room lock, the REC badge —
  is Daily's _meeting session data_. Only the server writes it
  (`setClassState`); browsers only read it. It lives as long as the meeting does, so
  the join response also carries the lock from the database.
- **Messages from the server** (a badge celebration, "why you are being removed") are
  app messages addressed to one connection's `session_id`, never a broadcast. Daily's
  app messages carry no "from the server" mark, so each one carries a key derived
  from the Daily API key, the room and the recipient (`eventKeyFor`) that the browser
  was given in its own join response and checks before believing it — another
  participant can neither read nor forge it.
- **What is not here.** Muting, stopping a share and the mic lock are done by the
  teacher's browser through Daily (owner privileges), so they have no route. Daily has
  no REST call to mute someone, and webhooks need a payment method on the account, so
  nothing depends on them.

## Rooms

A classroom is a Daily room. Its name says what it is (`room-ref.util.ts`; a Daily
room name is letters, digits, `-` and `_`); `RoomDirectoryService.resolve(room)`
turns a name back into its teacher and the lessons held in it.

| Room name                     | What                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `lesson-<scheduledLessonId>`  | a **1:1** class (45 minutes)                                                   |
| `batch-session-<sessionId>`   | a **batch** class (60 minutes): ONE class for the whole batch (`BatchSession`) |
| `batch-<teacherId>-<startMs>` | the old batch room name — still resolves, no new class uses it                 |
| `<bookingId>`                 | a marketplace booking (always 1:1)                                             |
| `lumexa-demo-classroom`       | the QA demo room                                                               |

A batch is a real record (`../batches/README.md`) and a batch class is **one
class**: one `BatchSession`, one room, one teacher earning. Each student's own
`ScheduledLesson` is their **participant row** of it — their own lesson balance,
attendance, test attempt, homework, badges and recording copy. Ideal sizes are 1
student (1:1) and 4 (batch); a batch may hold up to 9.

## Who may be in a room (`room-access.service.ts`)

- **10 people at once**, teacher included, for a 1:1 and a batch alike. The
  teacher's seat is always kept free, so students may take at most **9**.
- One person may be connected from up to **3 devices/tabs** at once. Devices are
  not people: a student on a laptop and a phone is one student, one seat.
- The teacher can **lock** the classroom (below). A class starts unlocked.
- Neither the lock nor a full class ever keeps the teacher out, and neither the
  teacher nor the silent admin observer is ever removed after joining. (The
  3-device limit applies to the teacher as to anyone, when the token is issued.)

It is checked twice, because a join token is issued before the person connects:

1. **`checkEntry`**, when the token is issued — a friendly refusal. `POST
/classroom/join` answers `{ blocked: true, reason, message }` (a normal 200,
   like `waitingForAdmission`), with `reason` one of `ROOM_LOCKED`, `ROOM_FULL`,
   `TOO_MANY_DEVICES`. The browser asks again when the person presses **Join**, so
   the check is made at the last moment, not minutes earlier when the page opened.
2. **`enforceRoom`**, a few seconds after every token is issued (4 s, and again at
   15 s for a slow connection; one check is queued per room, so a class filling up
   does not queue a check per student) — it lists who is really in the room
   (Daily's presence) and removes anyone who still got past the first check (a
   token issued just before the lock, two people racing for the last seat): each is
   told why (a `room-denied` message) and ejected. Seats go in arrival order; a
   connection that joined before the lock went on stays. It is a timer, not a
   webhook, so nothing needs configuring in Daily.

If Daily cannot be asked, a join is let through rather than shutting a real class
out of its room (the lock, which is in the database, still holds).

## The lock

`ClassroomRoomState` (one row per room ever locked; no row = unlocked). It is a
table, not only the room's shared state, because that state disappears when the
meeting ends (everyone leaves) and a lock must survive the teacher's connection
dropping for a moment.

`POST /classroom/:room/lock { locked: boolean }` — the room's teacher only. While
locked **no student can join**: not a latecomer, not someone who dropped out, not an
extra device of someone already in. People inside stay. The database decides; the
room's shared state (`roomLocked`) only mirrors it so every screen updates at once.

## Joining from several devices

Every person has one `user_id` and every connection of theirs a Daily `session_id`.
There is nothing for the browser to generate or the server to check: a refresh, a
second tab and a phone are all just more sessions of the same person. Everywhere a
_person_ matters, the `user_id` is used:

- **Server** — remove acts on **all** of a person's sessions, and makes the person
  (not a device) knock to come back; the 10-person and 3-device limits count
  sessions per `user_id`.
- **Browser** — one tile, one raised hand, one entry in the participant list and
  count, per person; the device with the camera on supplies the video. A person's
  own audio from another of their devices is never played back to them
  (`ClassAudioRenderer`). Muting, stopping a share and the mic lock are done by the
  teacher's browser to every session of the person.

## Batch classes

- **Scheduling.** A batch's classes come from its weekly slots
  (`BatchSessionsService`): one `BatchSession` per class and one participant row
  per student. The teacher's calendar is checked once per class
  (`findTeacherConflict`); anything else overlapping (a 1:1, another batch, a
  marketplace shift) is a conflict.
- **Joining.** A student joins the shared room through their own lesson row
  (recorded as theirs). The teacher joins through the session: `teacherJoinedAt` is
  set once on the class (and mirrored on the rows) — that single value drives the
  late-join penalty and the 75-minute failsafe. The silent admin observer joins
  through the session id as well.
- **Ending (`ClassFinalizationService.finalizeBatchSession`).** The teacher ends
  the class once and picks one outcome. The class moves out of `UPCOMING` once
  (compare-and-set), in one transaction that pays the teacher once, gives each
  student their own outcome and consumes one lesson from each attending student's
  own ledger. A student who **never joined** is ended **Incomplete (no-show)** —
  no payment, no lesson consumed, and no private make-up (a batch class cannot be
  redone for one student; they catch up from the recording). Partially Completed /
  Incomplete adds **one** extra class for the whole batch. An admin settling one
  participant's row settles the whole class. The shared room (recording wrap-up,
  closing the live room) is wrapped up once, with the class.
- **Recording.** One recording per class (a batch's students all watch the same
  one — see Recording below), summarised on every participant row.

### Economics

Everything that pays or penalises is **per class** for a batch and per lesson for a
1:1: the **teacher earning ৳200** and the **late-join / no-show penalty ৳50**
(`PayoutEntry` keyed `(BATCH_SESSION, sessionId, …)`, so a retry can never pay or
fine twice). What is **per student** is the lesson consumed from their own ledger.
If the business wants a per-student amount for batches, it is the one place
`PayoutsService.recordBatchSessionEarningInTx` / `CLASS_COMPLETED_AMOUNT_CENTS`.

Lateness is judged by the teacher's **first** arrival (the join time kept on the
class), not by each later token request. A token is also requested when the
teacher presses Join, opens a second device or refreshes, and none of those may
fine a teacher who was on time.

## Recording

A class is recorded **in the teacher's browser**, not by Daily: a WebM file of
their browser window plus the class's audio (the voices of everyone in the class,
and a shared screen's sound where the browser provides it), uploaded by that
browser straight to a **private Cloudflare R2 bucket** with a short-lived URL this
server signs. Students watch through signed URLs too. No Daily cloud recording, no
FFmpeg, no recording credentials in the browser. Setup (bucket, token, CORS) is in
`docs/CLASS_RECORDING_SETUP.md`; the variables are the `R2_*` ones in
`server/.env.example`.

**One recording = one segment ("part").** Every Record → Stop is its own
`RecordingSegment`, kept as its own file — never merged, never overwritten.
Recording again in the same class adds a part; a student sees the parts in order.

| Status      | Meaning                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| `RECORDING` | the teacher's browser is recording it                                        |
| `UPLOADING` | recorded; the file is in the teacher's browser, waiting to be/being uploaded |
| `AVAILABLE` | the file is in R2 **and the server checked it** — it can be watched          |
| `FAILED`    | given up on: discarded by the teacher, or never uploaded                     |
| `EXPIRED`   | removed by the storage-retention policy                                      |

| Route (teacher of the room only)         | What                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `POST /classroom/:room/recording/start`  | Record pressed. Body `{ segmentId? }` (the browser's UUID — a retry returns the same segment). Works before R2 is set up. |
| `POST …/recording/:segmentId/stop`       | Stop pressed: `{ durationMs?, mimeType? }`                                                                                |
| `POST …/recording/:segmentId/upload-url` | `{ sizeBytes }` → a signed `PUT` URL (15 minutes) and the headers to send                                                 |
| `POST …/recording/:segmentId/complete`   | `{ sizeBytes }` → the server asks R2 (size, type) and only then makes it `AVAILABLE`. Safe to repeat                      |
| `POST …/recording/:segmentId/discard`    | give it up (not once uploaded)                                                                                            |
| `GET  …/recording/segments`              | this class's recordings and their state                                                                                   |

| Route (watching)                      | Who                                                                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /recordings/mine`                | a student: their classes' recordings (+ how many are still being uploaded)                                                                                                                    |
| `GET /recordings/booking/:bookingId`  | a student, a parent of the booked child, the class's teacher, an admin: the watchable parts of one booked class (a parent has no list of their own — the child's page asks booking by booking); anyone outside the class gets an empty list |
| `GET /recordings/:segmentId/playback` | a student of the class, a parent of the booked child, the class's teacher, an admin → `{ url, expiresAt }`, a signed `GET` URL (2 hours). Anyone else, and anything not `AVAILABLE`, is a 404 |
| `GET /recordings/classes/:kind/:id`   | an admin: every part of a class, whatever its state                                                                                                                                           |

- **Who owns a segment.** `recordedByUserId` is the teacher whose browser made it;
  only they can stop, upload or discard it, and only in the room it was made in.
  The browser chooses the segment's id, so a retried request cannot make a second
  one; the file's key is `recordings/<room>/<segmentId>.webm`, so a retried upload
  can only ever replace itself.
- **Never believed on the browser's word.** `complete` HEADs the object in R2: it
  must exist, be `video/webm` and have exactly the size the browser sent.
  Anything else is refused (and a wrong-type file is deleted).
- **The REC badge.** Start/stop mirror `recording: true|false` into the live room's
  shared state, so everyone in the class sees REC while a recording runs.
- **When the class ends** a still-running recording only waits for its upload
  (`stopActiveSegmentIfAny`) and the class's summary is refreshed
  (`finalizeAtClassEnd`). Nothing is lost: the browser keeps the file until it is
  uploaded.
- **The summary.** `ScheduledLesson/Booking.recordingStatus` is derived from a
  class's segments (`deriveRecordingStatus`) for the admin screens. `recordingUrl`
  belongs to the retired server-side recorder: it is read (a recording made then
  still plays, as a plain link) and never written.
- **Sweeps** (every 10 minutes): a browser that began recording and vanished has
  its segment closed as waiting for upload; a segment whose file _is_ in R2 but
  whose confirmation was lost is confirmed; one nobody touched for 12 hours is
  given up on (`FAILED`, the teacher is told — and can still upload it if the
  browser tab is still open). Hourly: the retention policy removes the oldest
  recordings past `RECORDING_STORAGE_LIMIT_BYTES` and warns admins at 80%.
- **A free trial is never recorded**; the QA demo room is, and the QA demo student
  sees those recordings in their Recordings tab.

## Badges (`badges/`)

Recognition, not a game — no points, levels, streaks or rankings. Separate from
the older gems/streak achievements.

- **Catalog** — the 16 badges are defined once, in `badge-catalog.ts`
  (id, emoji, name, what it recognises). Ids are permanent (stored with awards).
- **`ClassroomBadgeAward`** — badge id, recipient, awarding teacher, the classroom
  (`room`) and the student's own lesson, timestamp, and `revokedAt` for undo.
  `(requestId, studentUserId)` is unique.
- **Who may award** — the class's teacher only (checked against the class itself),
  only to students of that class, never to themselves; 1:1 and batch alike (and the
  demo room). Marketplace bookings are not curriculum classes and have no badges
  (the Award Badge button is not shown there). Admins cannot.

| Route                                | Who                 |                                                |
| ------------------------------------ | ------------------- | ---------------------------------------------- |
| `GET /classroom-badges/catalog`      | any signed-in user  | the 16 badges                                  |
| `POST /classroom-badges/:room/award` | the class's teacher | `{ badgeId, studentUserIds[1..9], requestId }` |
| `POST /classroom-badges/:room/undo`  | the same teacher    | `{ requestId }` — within 2 minutes             |
| `GET /classroom-badges/mine`         | a student           | their collection (revoked awards excluded)     |

- **Idempotent.** The browser names each award action with a `requestId`; a double
  click or a retry carries the same one, so it is stored once and the student is
  celebrated once. Awarding the same badge again later is a new action — no lifetime
  limit. A `requestId` reused for a _different_ award is a 409.
- **Saved first, then announced.** The celebration is a Daily app message sent
  _after_ the award is stored, addressed to exactly the recipient's own connections
  (one `send-app-message` per `session_id`, tagged `lumexa-server`) — never a
  broadcast the browser filters. If it cannot be delivered the award stands and the
  teacher's confirmation says the student will find it in **My Badges**. A student
  who reconnects sees saved badges there; browsers only believe a `lumexa-server`
  message that carries the key the server gave that browser (see Daily above), which
  no other participant has.
- **Undo** revokes (sets `revokedAt`); nothing is deleted.

## Tests

```bash
cd server
npx jest src/classroom src/scheduling          # unit
# + the real-Postgres specs (rooms, batch end, lock, badges, recordings — the
# last one also boots the whole app and calls the recording routes over HTTP):
ASSESSMENT_INTEGRATION_DATABASE_URL=postgresql://…/lumexa_it npx jest src/classroom
```

See `../assessments/testing/integration-db.ts` for the throwaway-database rules.
Daily is replaced by an in-memory fake, and R2 by an in-memory bucket
(`testing/memory-recording-storage.ts`, which still signs real URLs), in those specs.
`daily-rooms.service.spec.ts` runs the real Daily client against a fake Daily REST
server that rejects any request Daily itself would.
