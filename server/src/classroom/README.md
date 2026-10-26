# Classroom

The live classroom (LiveKit): who may be in it, how a batch shares one room, the
teacher's lock, joining from several devices, ending a class, recording, and the
badge system.

## Rooms

A classroom is a LiveKit room. Its name says what it is (`room-ref.util.ts`);
`RoomDirectoryService.resolve(room)` turns a name back into its teacher and the
lessons held in it.

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
  teacher nor the hidden admin observer is ever removed after joining. (The
  3-device limit applies to the teacher as to anyone, when the token is issued.)

It is checked twice, because a join token is issued before the person connects:

1. **`checkEntry`**, when the token is issued — a friendly refusal. `POST
/classroom/join` answers `{ blocked: true, reason, message }` (a normal 200,
   like `waitingForAdmission`), with `reason` one of `ROOM_LOCKED`, `ROOM_FULL`,
   `TOO_MANY_DEVICES`. The browser asks again when the person presses **Join**, so
   the check is made at the last moment, not minutes earlier when the page opened.
2. **`enforceAfterJoin`**, from LiveKit's `participant_joined` webhook — anyone who
   still got past it (a token issued just before the lock, two people racing for
   the last seat) is told why (a `room-denied` message) and removed. Seats go in
   arrival order; a connection that joined before the lock went on stays.

If LiveKit cannot be asked, a join is let through rather than shutting a real
class out of its room (the lock, which is in the database, still holds).

> **The webhook** (`POST /classroom/webhook/livekit`) must be receiving
> `participant_joined`. LiveKit sends every event to the configured webhook URL,
> so nothing more is needed if recording already works there.

## The lock

`ClassroomRoomState` (one row per room ever locked; no row = unlocked). It is a
table, not only room metadata, because the LiveKit room disappears when it empties
and a lock must survive the teacher's connection dropping for a moment.

`POST /classroom/:room/lock { locked: boolean }` — the room's teacher only. While
locked **no student can join**: not a latecomer, not someone who dropped out, not an
extra device of someone already in. People inside stay. The database decides; the
room's metadata (`roomLocked`) only mirrors it so every screen updates at once.

## Joining from several devices

A LiveKit identity is `<userId>~<deviceId>`. The browser makes a new random device
id on every page load (nothing is stored, so a duplicated tab can never collide
with the original). The server checks it (`sanitizeDeviceId`) and the token
carries it. Everywhere a _person_ matters, `personKey(identity)` (the userId) is
used:

- **Server** — mute, stop-sharing, mic lock and remove act on **all** of a
  person's connections; removal makes the person (not a device) knock to come back.
- **Browser** — one tile, one raised hand, one entry in the participant list and
  count, per person; the device with the camera on supplies the video. A person's
  own audio from another of their devices is never played back to them
  (`ClassAudioRenderer`).

## Batch classes

- **Scheduling.** A batch's classes come from its weekly slots
  (`BatchSessionsService`): one `BatchSession` per class and one participant row
  per student. The teacher's calendar is checked once per class
  (`findTeacherConflict`); anything else overlapping (a 1:1, another batch, a
  marketplace shift) is a conflict.
- **Joining.** A student joins the shared room through their own lesson row
  (recorded as theirs). The teacher joins through the session: `teacherJoinedAt` is
  set once on the class (and mirrored on the rows) — that single value drives the
  late-join penalty and the 75-minute failsafe. The hidden admin observer joins
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
- **Recording.** One recording per class, mirrored onto every participant row (they
  all get the same file); merged once; storage is counted per file.

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
- **Saved first, then announced.** The celebration is a LiveKit data message sent
  _after_ the award is stored, addressed to exactly the recipient's own connections
  (`destinationIdentities`, topic `lumexa-server`) — never a broadcast the browser
  filters. If it cannot be delivered the award stands and the teacher's
  confirmation says the student will find it in **My Badges**. A student who
  reconnects sees saved badges there; browsers only trust `lumexa-server` messages
  that have no sending participant.
- **Undo** revokes (sets `revokedAt`); nothing is deleted.

## Tests

```bash
cd server
npx jest src/classroom src/scheduling          # unit
# + the real-Postgres specs (rooms, batch end, lock, badges):
ASSESSMENT_INTEGRATION_DATABASE_URL=postgresql://…/lumexa_it npx jest src/classroom
```

See `../assessments/testing/integration-db.ts` for the throwaway-database rules.
LiveKit is replaced by an in-memory fake in those specs.
