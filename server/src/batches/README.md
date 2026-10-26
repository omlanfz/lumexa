# Batches

A **batch** is a group of students who learn one curriculum together with one
teacher on a shared weekly schedule. It is a real record — membership, schedule
and every class it holds live in the database — not students whose individual
schedules happen to coincide (which is all a "batch" used to be).

A batch class is **one class**: one time, one teacher, one lesson, one classroom,
one status, one teacher earning — however many students are in it. What belongs
to a student (attendance, outcome, homework, test result, grade, badges, lesson
balance, progress) stays that student's own.

## The model (`prisma/schema.prisma`, migration `20261027000000_batches`)

| Record            | What                                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Batch`           | name, teacher, curriculum, capacity (1–9, ideal 4), `startLessonNumber`, `startDate`, status `ACTIVE` / `COMPLETED` / `ARCHIVED`                                              |
| `BatchSlot`       | one weekly meeting time (Asia/Dhaka wall clock). A batch has one or more                                                                                                     |
| `BatchMember`     | a student's placement over time (`joinedAt`, `leftAt`, the alignment decision taken when they joined). **One active placement per student** (partial unique index)           |
| `BatchSession`    | **the** class: start/end, lesson number, status, `teacherJoinedAt`, how it ended. Kept with its own teacher so history is right after a teacher change                         |
| `ScheduledLesson` | unchanged, and now also a student's **participant row** of a session (`batchSessionId`, `batchId`). The row mirrors the session's time, teacher, lesson and status            |

Database rules (not only application rules): at most one active batch per student;
batch names are unique ignoring case among non-archived batches; capacity 1–9;
slot and session times are valid; and a `ScheduledLesson` is a BATCH lesson **if
and only if** it belongs to a session of a batch (`ScheduledLesson_batch_link_check`).

A batch has **one lesson sequence**. Its pointer is the highest lesson a
`COMPLETED` class has taught + 1 (`startLessonNumber` before the first class). A
`PARTIALLY_COMPLETED` or `INCOMPLETE` class unlocks nothing: the extra class that
follows teaches the same lesson again, once, for everyone.

### Sessions are a projection

`BatchSessionsService` keeps the classes in step with (weekly slots, lesson
pointer, who participates). Sessions exist only while at least one active,
non-paused student is in the batch, so an **empty batch holds no teacher time**.

| Operation                      | Effect                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `regenerateFutureSessions`     | rebuild the classes that have not opened yet (new slots, teacher, curriculum edit, new pointer) |
| `attachMember`                 | put a student into the classes already scheduled                                             |
| `detachFutureParticipation`    | take a student out of the classes still ahead (removal, pause)                               |
| `insertMakeupSession`          | one extra class for the whole batch after a partial / incomplete class                        |

A class that is **under way** (started, or opening within 10 minutes) is never
touched. A past class nobody joined for 2 hours is "dead": it is not progress and
is cleared when the batch is rebuilt. Every change to a session is written to its
participant rows in the same transaction.

## Placing a student (`batch-enrollment.ts`, pure functions)

The same rules run for the screens (preview) and for the server (enforcement).

**Blockers** — nothing the admin ticks makes these allowed:

| Code                   | Meaning                                                                         |
| ---------------------- | ------------------------------------------------------------------------------- |
| `BATCH_NOT_ACCEPTING`  | the batch is completed or archived                                              |
| `STUDENT_PAUSED`       | resume the student first                                                        |
| `ALREADY_IN_BATCH`     | they are in this batch already                                                  |
| `BATCH_FULL`           | the batch is at capacity                                                        |
| `COURSE_MISMATCH`      | the student is on another curriculum                                            |
| `PROGRESS_AHEAD`       | the student has completed lessons the batch has not reached — they would repeat |

**Decisions** — possible, but they change something, so the admin must accept each
one explicitly (the request is refused with `409 DECISION_REQUIRED` until then):

| Code                          | Decision key            | Meaning                                                                       |
| ----------------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| `PROGRESS_BEHIND`             | `progress: SKIP_TO_BATCH` | the batch is further on: the lessons in between are not taught to them (records untouched) |
| `BATCH_REBASE`                | `progress: REBASE_BATCH`  | an untaught, empty batch may start at the student's lesson                     |
| `TEACHER_CHANGE`              | `acceptTeacherChange`   | the student's assigned teacher becomes the batch's; past classes keep theirs   |
| `REPLACES_UPCOMING`           | `replaceUpcoming`       | the student's upcoming 1-to-1 classes are removed (completed ones are kept)    |

A student's **progress is never rewritten**: completed classes, homework, test
results, grades and badges are never touched by a move. The choice made is stored
on the membership (`alignment`, `joinedAtLesson`).

Switching a batch student to 1-to-1 answers `409 LEAVES_BATCH` until the request
carries `leaveBatch: true`. A batch student's teacher and curriculum are their
batch's: changing either on its own is refused (move or remove them instead).

## API (all admin-only; `batches.controller.ts`)

| Route                                         | What                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `GET /admin/batches`                          | list, filter by status / teacher / curriculum / search                |
| `POST /admin/batches`                         | create (an empty batch holds no classes)                              |
| `GET /admin/batches/:id`                      | members with their own progress, upcoming and recent classes          |
| `PATCH /admin/batches/:id`                    | name, notes, capacity, archive / reopen (archiving needs no students) |
| `PUT /admin/batches/:id/schedule`             | new first class date / slots; rebuilds the classes ahead              |
| `PUT /admin/batches/:id/teacher`              | new teacher; moves future classes, checks the calendar                |
| `GET /admin/batches/:id/candidates`           | students that could be added, each with what stands in the way        |
| `POST /admin/batches/:id/students`            | add (or move here) a student with `decisions`                         |
| `DELETE /admin/batches/:id/students/:student` | remove a student                                                      |
| `GET /admin/students/:id/batch-options`       | every batch this student could join, most compatible first            |
| `POST /admin/students/:id/batch`              | enrol in an existing batch or `newBatch`, switching from 1-to-1 / moving |
| `DELETE /admin/students/:id/batch`            | leave their batch                                                     |
| `POST /admin/batch-sessions/:id/reschedule`   | move one class for everyone in it (teacher's calendar is checked)     |
| `POST /admin/batch-sessions/:id/cancel`       | cancel one class for everyone in it                                   |
| `DELETE /admin/batch-sessions/:id`            | delete a class that has no records attached                           |
| `POST /admin/batch-sessions/:id/finalize`     | settle a class (Completed / Partially / Incomplete) for everyone in it |

`POST /admin/students/:id/schedule` (the existing Schedule tab) is the 1-to-1 form;
it also takes `leaveBatch`. The `lessons/:id/reschedule|cancel` routes resolve a
batch student's lesson to its session, so the class is what moves.

## Finalizing a batch class (`ClassFinalizationService.finalizeBatchSession`)

The class — not each student — leaves `UPCOMING`, once (compare-and-set), in one
transaction that:

- **pays the teacher once** (`PayoutEntry` keyed `(BATCH_SESSION, sessionId,
  CLASS_COMPLETED)`), and applies the late-join penalty **once**
  (`BATCH_SESSION_LATE_JOIN`) — never per student;
- gives each student their **own outcome** and consumes **one lesson from that
  student's own ledger** if they attended;
- for Partially Completed / Incomplete adds **one** extra class for the whole batch
  (later lesson numbers shift by one);
- records a student who never joined as `INCOMPLETE` (no-show): no payment, no
  lesson consumed, and no private make-up — a batch class cannot be redone for one
  student; they catch up from the recording.

An admin settling any participant's row settles the whole class. The 75-minute
failsafe sweeps batch sessions too. Everything else (recording wrap-up, room
teardown, notifications) runs after commit, only for the winner.

## Classroom and access

- Room: **`batch-session-<sessionId>`** (`room-ref.util.ts`). The old
  `batch-<teacherId>-<startMs>` name still resolves. Students join through their
  own lesson row (so attendance and the recording copy are theirs); the teacher
  and the silent admin observer join through the session.
- Teachers only ever see their **own** batches and the students in them; the
  roster endpoints, the calendar and the lesson page are scoped by the batch's
  teacher. The shared lesson page never exposes another student's homework
  submission. Students never see classmates' progress.
- Class tests (`class-tests.service.ts`) take the class group from the session.

## What happens around a batch

| Event                                 | Effect on the batch                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Student account paused / resumed      | stays a member, stops attending; rejoins the classes ahead on resume                        |
| Curriculum edited                     | every active batch on it rebuilds its classes ahead (a teacher clash leaves it as it was)    |
| Batch changes teacher                 | future classes move; classes already taught keep their teacher                              |
| Last student leaves                   | the classes ahead are removed (nothing is held for an empty batch)                          |

## Migration and deployment

`20261027000000_batches` is additive (new tables and columns, nothing dropped) and
**converts the existing implicit batches as part of the migration**:

- Students connected through BATCH lessons that share a teacher, curriculum and
  start become one `Batch`; each distinct (teacher, start) becomes one
  `BatchSession`; every existing BATCH lesson becomes that session's participant
  row. Lesson numbers, statuses, attendance, recordings, ledger and payout rows
  are not changed.
- Names are generated (`<Curriculum> · <Teacher> · <slots>`, `#2` … when equal);
  slots come from the members' recurring slots, else from the lessons' times.
- Capacity is `LEAST(9, GREATEST(4, members))`: a legacy batch of 4 is exactly
  full until an admin raises its size on the batch page.
- Recordings, room state, admissions and badge awards keyed by the old room name
  are re-keyed to `batch-session-<id>`.
- Students of one class whose lessons had drifted apart keep their own lesson
  numbers; the batch page flags them as "out of step". Past `UPCOMING` classes
  that never ran stay as they are until the batch is rebuilt.

Steps: back up the database → deploy server and client together → the build runs
`prisma migrate deploy` → check **Admin → Batches**. **Deploy outside class
hours:** a class in progress keeps its old room name, and anyone who reconnects
after the deploy is given the new one.

## Tests

```bash
cd server
npx jest src/batches/batch-enrollment.spec.ts src/scheduling src/classroom/class-finalization.service.spec.ts src/reminders   # unit
# real Postgres (the database is WIPED — use a throwaway one whose name contains it/test/integration):
ASSESSMENT_INTEGRATION_DATABASE_URL=postgresql://…/lumexa_it npx jest src/batches src/classroom src/assessments
```

The integration specs cover the lifecycle (create, enrol, move, remove, pause,
teacher/schedule changes, 1-to-1 compatibility), HTTP access control per role,
the admin views, one-class finalization (payout once, penalty once, per-student
ledgers, no-show, make-ups, failsafe), rooms and the migration backfill against a
legacy-shaped database. See `../assessments/testing/integration-db.ts`.
