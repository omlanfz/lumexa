-- Batch management: a batch is a real record (members, weekly schedule, shared
-- class sessions) instead of students whose individual schedules coincide.
--
-- Order matters and the whole script runs as one transaction:
--   1. structure (Prisma-generated)
--   2. backfill: turn the implicit batches that exist today into real ones
--   3. constraints that can only hold once the data has been converted

-- ─── 1. Structure ────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "ScheduledLesson" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "batchSessionId" TEXT;

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "maxStudents" INTEGER NOT NULL DEFAULT 4,
    "startLessonNumber" INTEGER NOT NULL DEFAULT 1,
    "startDate" TEXT NOT NULL,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchSlot" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,

    CONSTRAINT "BatchSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchMember" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "alignment" TEXT,
    "joinedAtLesson" INTEGER,
    "addedByAdminId" TEXT,

    CONSTRAINT "BatchMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchSession" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "lessonId" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'UPCOMING',
    "teacherJoinedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endedByRole" TEXT,
    "endReason" "ClassEndReason",
    "endNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Batch_teacherId_idx" ON "Batch"("teacherId");

-- CreateIndex
CREATE INDEX "Batch_courseId_idx" ON "Batch"("courseId");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE INDEX "BatchSlot_batchId_idx" ON "BatchSlot"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchSlot_batchId_weekday_hour_minute_key" ON "BatchSlot"("batchId", "weekday", "hour", "minute");

-- CreateIndex
CREATE INDEX "BatchMember_batchId_idx" ON "BatchMember"("batchId");

-- CreateIndex
CREATE INDEX "BatchMember_studentUserId_idx" ON "BatchMember"("studentUserId");

-- CreateIndex
CREATE INDEX "BatchSession_batchId_start_idx" ON "BatchSession"("batchId", "start");

-- CreateIndex
CREATE INDEX "BatchSession_teacherId_start_idx" ON "BatchSession"("teacherId", "start");

-- CreateIndex
CREATE INDEX "BatchSession_start_idx" ON "BatchSession"("start");

-- CreateIndex
CREATE INDEX "BatchSession_lessonId_idx" ON "BatchSession"("lessonId");

-- CreateIndex
CREATE INDEX "ScheduledLesson_batchId_studentUserId_idx" ON "ScheduledLesson"("batchId", "studentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledLesson_batchSessionId_studentUserId_key" ON "ScheduledLesson"("batchSessionId", "studentUserId");

-- AddForeignKey
ALTER TABLE "ScheduledLesson" ADD CONSTRAINT "ScheduledLesson_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledLesson" ADD CONSTRAINT "ScheduledLesson_batchSessionId_fkey" FOREIGN KEY ("batchSessionId") REFERENCES "BatchSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSlot" ADD CONSTRAINT "BatchSlot_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMember" ADD CONSTRAINT "BatchMember_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMember" ADD CONSTRAINT "BatchMember_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSession" ADD CONSTRAINT "BatchSession_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSession" ADD CONSTRAINT "BatchSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSession" ADD CONSTRAINT "BatchSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSession" ADD CONSTRAINT "BatchSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 2. Backfill: the batches that exist today become real ───────────────────
--
-- Until now a "batch" was only students whose BATCH lessons shared a teacher
-- and a start time. Students are batch-mates when they are connected through
-- shared classes (same teacher, same curriculum, same start) — the connected
-- components of that relation become Batches, each distinct (teacher, start)
-- becomes one BatchSession, and every existing BATCH lesson becomes that
-- session's participant row for its student. Nothing is deleted or rewritten:
-- lesson numbers, statuses, attendance, recordings, ledger and payout rows all
-- stay exactly as they are. Where students of one class were on different
-- lessons (they could drift apart), each keeps their own lesson number and the
-- session carries the lowest one; the admin screens flag those students.
--
-- Rooms: recordings and room state were keyed by the old
-- "batch-<teacher>-<start>" name and are re-keyed to the session's room.

DO $$
DECLARE
  iter   int := 0;
  moved  int;
  stray  int;
  n_batch int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "ScheduledLesson" WHERE "classType" = 'BATCH')
     AND NOT EXISTS (SELECT 1 FROM "RecurringSlot" WHERE "classType" = 'BATCH') THEN
    RETURN;
  END IF;

  -- Every BATCH lesson with the keys that identified a batch class so far.
  CREATE TEMP TABLE _bl ON COMMIT DROP AS
  SELECT "id" AS lid, "studentUserId" AS s, "teacherId" AS t, "courseId" AS c,
         "start", "end", "status", "lessonNumber", "lessonId", "teacherJoinedAt",
         "endedAt", "endedByRole", "endReason", "endNote", "createdAt",
         NULL::text AS bid
  FROM "ScheduledLesson"
  WHERE "classType" = 'BATCH';
  CREATE INDEX ON _bl (t, c, "start");
  CREATE INDEX ON _bl (s, t, c);

  -- Connected components: students linked by a shared (teacher, course, start).
  -- A label (the smallest student id reachable) is propagated until it settles.
  CREATE TEMP TABLE _lab ON COMMIT DROP AS
  SELECT DISTINCT s, t, c, s AS lab FROM _bl;
  CREATE INDEX ON _lab (s, t, c);

  LOOP
    iter := iter + 1;
    UPDATE _lab l SET lab = m.minlab
    FROM (
      SELECT b1.s, b1.t, b1.c, MIN(l2.lab) AS minlab
      FROM _bl b1
      JOIN _bl b2 ON b2.t = b1.t AND b2.c = b1.c AND b2."start" = b1."start"
      JOIN _lab l2 ON l2.s = b2.s AND l2.t = b2.t AND l2.c = b2.c
      GROUP BY b1.s, b1.t, b1.c
    ) m
    WHERE l.s = m.s AND l.t = m.t AND l.c = m.c AND l.lab > m.minlab;
    GET DIAGNOSTICS moved = ROW_COUNT;
    EXIT WHEN moved = 0 OR iter > 1000;
  END LOOP;

  -- One group (= one future Batch) per (teacher, course, component).
  CREATE TEMP TABLE _grp ON COMMIT DROP AS
  SELECT t, c, lab,
         (md5(random()::text || clock_timestamp()::text || t || c || lab))::uuid::text AS bid
  FROM (SELECT DISTINCT t, c, lab FROM _lab) g;

  UPDATE _bl x SET bid = g.bid
  FROM _lab l JOIN _grp g ON g.t = l.t AND g.c = l.c AND g.lab = l.lab
  WHERE l.s = x.s AND l.t = x.t AND l.c = x.c;

  -- Weekly slots: the members' own recurring slots, or (when none were kept)
  -- the Dhaka wall-clock times of the group's lessons — upcoming ones if any.
  CREATE TEMP TABLE _gslot ON COMMIT DROP AS
  SELECT DISTINCT g.bid, rs."weekday", rs."hour", rs."minute"
  FROM _grp g
  JOIN _lab l ON l.t = g.t AND l.c = g.c AND l.lab = g.lab
  JOIN "RecurringSlot" rs
    ON rs."studentUserId" = l.s AND rs."teacherId" = g.t
   AND rs."courseId" = g.c AND rs."classType" = 'BATCH';

  CREATE TEMP TABLE _glesson ON COMMIT DROP AS
  SELECT x.bid, x."status",
         EXTRACT(DOW    FROM (x."start" + interval '6 hours'))::int AS dow,
         EXTRACT(HOUR   FROM (x."start" + interval '6 hours'))::int AS hh,
         EXTRACT(MINUTE FROM (x."start" + interval '6 hours'))::int AS mm
  FROM _bl x;

  INSERT INTO _gslot
  SELECT DISTINCT a.bid, a.dow, a.hh, a.mm
  FROM _glesson a
  WHERE NOT EXISTS (SELECT 1 FROM _gslot gs WHERE gs.bid = a.bid)
    AND (a."status" = 'UPCOMING'
         OR NOT EXISTS (SELECT 1 FROM _glesson b WHERE b.bid = a.bid AND b."status" = 'UPCOMING'));

  -- A readable, unique name: "<curriculum> · <teacher> · Tue 22:00, Fri 22:00".
  CREATE TEMP TABLE _gname ON COMMIT DROP AS
  SELECT bid, base,
         base || CASE WHEN ROW_NUMBER() OVER (PARTITION BY lower(base) ORDER BY bid) > 1
                      THEN ' #' || ROW_NUMBER() OVER (PARTITION BY lower(base) ORDER BY bid)
                      ELSE '' END AS name
  FROM (
    SELECT g.bid,
           left(co."title" || ' · ' || tu."fullName" || COALESCE(' · ' || sl.summary, ''), 110) AS base
    FROM _grp g
    JOIN "Course" co ON co."id" = g.c
    JOIN "TeacherProfile" tp ON tp."id" = g.t
    JOIN "User" tu ON tu."id" = tp."userId"
    LEFT JOIN (
      SELECT bid,
             string_agg(label, ', ' ORDER BY weekday, hour, minute) AS summary
      FROM (
        SELECT bid, weekday, hour, minute,
               (ARRAY['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[weekday + 1]
                 || ' ' || lpad(hour::text, 2, '0') || ':' || lpad(minute::text, 2, '0') AS label
        FROM _gslot
      ) q
      GROUP BY bid
    ) sl ON sl.bid = g.bid
  ) n;

  -- Who is a member today: still assigned Batch + this teacher + this curriculum.
  CREATE TEMP TABLE _gmember ON COMMIT DROP AS
  SELECT g.bid, l.s,
         (u."assignedClassType" = 'BATCH'
          AND u."assignedTeacherId" = g.t
          AND u."assignedCourseId" = g.c) AS active
  FROM _grp g
  JOIN _lab l ON l.t = g.t AND l.c = g.c AND l.lab = g.lab
  JOIN "User" u ON u."id" = l.s;

  INSERT INTO "Batch" ("id", "name", "notes", "status", "teacherId", "courseId",
                       "maxStudents", "startLessonNumber", "startDate",
                       "createdAt", "updatedAt")
  SELECT g.bid,
         gn.name,
         'Created automatically from the existing Batch classes when batches were introduced. Rename it as you like.',
         (CASE
            WHEN st.has_upcoming THEN 'ACTIVE'
            WHEN st.max_completed IS NOT NULL AND st.max_completed >= co."sessions" THEN 'COMPLETED'
            WHEN st.active_n > 0 THEN 'ACTIVE'
            ELSE 'ARCHIVED'
          END)::"BatchStatus",
         g.t, g.c,
         LEAST(9, GREATEST(4, st.active_n)),
         COALESCE(st.min_upcoming_lesson, 1),
         to_char(st.first_start + interval '6 hours', 'YYYY-MM-DD'),
         now(), now()
  FROM _grp g
  JOIN _gname gn ON gn.bid = g.bid
  JOIN "Course" co ON co."id" = g.c
  JOIN LATERAL (
    SELECT bool_or(x."status" = 'UPCOMING')                                    AS has_upcoming,
           MAX(x."lessonNumber") FILTER (WHERE x."status" = 'COMPLETED')       AS max_completed,
           MIN(x."lessonNumber") FILTER (WHERE x."status" = 'UPCOMING')        AS min_upcoming_lesson,
           MIN(x."start")                                                      AS first_start,
           (SELECT COUNT(*) FROM _gmember m WHERE m.bid = g.bid AND m.active)::int AS active_n
    FROM _bl x WHERE x.bid = g.bid
  ) st ON true;

  GET DIAGNOSTICS n_batch = ROW_COUNT;

  INSERT INTO "BatchSlot" ("id", "batchId", "weekday", "hour", "minute")
  SELECT (md5(random()::text || clock_timestamp()::text || bid || weekday || hour || minute))::uuid::text,
         bid, weekday, hour, minute
  FROM _gslot;

  INSERT INTO "BatchMember" ("id", "batchId", "studentUserId", "joinedAt", "leftAt",
                             "alignment", "joinedAtLesson")
  SELECT (md5(random()::text || clock_timestamp()::text || m.bid || m.s))::uuid::text,
         m.bid, m.s,
         a.first_created,
         CASE WHEN m.active THEN NULL ELSE COALESCE(a.last_end, now()) END,
         'MIGRATED',
         a.first_lesson
  FROM _gmember m
  JOIN LATERAL (
    SELECT MIN(x."createdAt") AS first_created, MAX(x."end") AS last_end,
           MIN(x."lessonNumber") AS first_lesson
    FROM _bl x WHERE x.bid = m.bid AND x.s = m.s
  ) a ON true;

  -- One session per distinct (batch, start).
  CREATE TEMP TABLE _sess ON COMMIT DROP AS
  SELECT bid, t, c, "start",
         (md5(random()::text || clock_timestamp()::text || bid || "start"::text))::uuid::text AS sid
  FROM (SELECT DISTINCT bid, t, c, "start" FROM _bl) d;

  INSERT INTO "BatchSession" ("id", "batchId", "teacherId", "courseId", "lessonNumber",
                              "lessonId", "start", "end", "status", "teacherJoinedAt",
                              "endedAt", "endedByRole", "endReason", "endNote",
                              "createdAt", "updatedAt")
  SELECT se.sid, se.bid, se.t, se.c,
         a.min_lesson, a.lesson_id, se."start", a.max_end,
         a.status::"LessonStatus",
         a.teacher_joined, a.ended_at, a.ended_by, a.end_reason, a.end_note,
         a.created, now()
  FROM _sess se
  JOIN LATERAL (
    SELECT MIN(x."lessonNumber") AS min_lesson,
           (array_agg(x."lessonId" ORDER BY x."lessonNumber", x.lid))[1] AS lesson_id,
           MAX(x."end") AS max_end,
           CASE WHEN bool_or(x."status" = 'UPCOMING')            THEN 'UPCOMING'
                WHEN bool_or(x."status" = 'COMPLETED')           THEN 'COMPLETED'
                WHEN bool_or(x."status" = 'PARTIALLY_COMPLETED') THEN 'PARTIALLY_COMPLETED'
                WHEN bool_or(x."status" = 'INCOMPLETE')          THEN 'INCOMPLETE'
                ELSE 'CANCELLED' END AS status,
           MIN(x."teacherJoinedAt") AS teacher_joined,
           MAX(x."endedAt") AS ended_at,
           (array_agg(x."endedByRole" ORDER BY x."endedAt" DESC NULLS LAST))[1] AS ended_by,
           (array_agg(x."endReason"   ORDER BY x."endedAt" DESC NULLS LAST))[1] AS end_reason,
           (array_agg(x."endNote"     ORDER BY x."endedAt" DESC NULLS LAST))[1] AS end_note,
           MIN(x."createdAt") AS created
    FROM _bl x WHERE x.bid = se.bid AND x."start" = se."start"
  ) a ON true;

  -- Link every lesson to its session (one participant row per student: if a
  -- student somehow has two lessons at one start, the most final one is linked).
  CREATE TEMP TABLE _link ON COMMIT DROP AS
  SELECT DISTINCT ON (se.sid, x.s) x.lid, se.sid, se.bid
  FROM _bl x
  JOIN _sess se ON se.bid = x.bid AND se."start" = x."start"
  ORDER BY se.sid, x.s,
           CASE x."status" WHEN 'COMPLETED' THEN 0 WHEN 'PARTIALLY_COMPLETED' THEN 1
                           WHEN 'UPCOMING' THEN 2 WHEN 'INCOMPLETE' THEN 3 ELSE 4 END,
           x.lid;

  UPDATE "ScheduledLesson" sl
  SET "batchId" = k.bid, "batchSessionId" = k.sid
  FROM _link k
  WHERE sl."id" = k.lid;

  -- A duplicate row cannot be a second participant of the same class; it keeps
  -- existing as an ordinary lesson rather than failing the migration.
  UPDATE "ScheduledLesson" SET "classType" = 'ONE_TO_ONE'
  WHERE "classType" = 'BATCH' AND "batchSessionId" IS NULL;
  GET DIAGNOSTICS stray = ROW_COUNT;
  IF stray > 0 THEN
    RAISE WARNING 'batches migration: % duplicate BATCH lesson row(s) kept as ordinary lessons', stray;
  END IF;

  -- The batch's own slots replace its students' personal recurring slots.
  DELETE FROM "RecurringSlot" WHERE "classType" = 'BATCH';

  -- Re-key room names: recordings, locks, pending admissions and badge awards
  -- pointed at "batch-<teacher>-<startMs>"; the room is now the session's.
  CREATE TEMP TABLE _roommap ON COMMIT DROP AS
  SELECT DISTINCT ON (legacy) legacy, 'batch-session-' || sid AS fresh
  FROM (
    SELECT 'batch-' || se.t || '-' || round(EXTRACT(EPOCH FROM se."start") * 1000)::bigint::text AS legacy,
           se.sid,
           (SELECT COUNT(*) FROM _link k WHERE k.sid = se.sid) AS n
    FROM _sess se
  ) q
  ORDER BY legacy, n DESC, sid;

  UPDATE "RecordingSegment"   r SET "room" = m.fresh FROM _roommap m WHERE r."room" = m.legacy;
  UPDATE "ClassroomRoomState" r SET "room" = m.fresh FROM _roommap m WHERE r."room" = m.legacy;
  UPDATE "ClassroomAdmission" r SET "room" = m.fresh FROM _roommap m WHERE r."room" = m.legacy;
  UPDATE "ClassroomBadgeAward" r SET "room" = m.fresh FROM _roommap m WHERE r."room" = m.legacy;

  RAISE NOTICE 'batches migration: % batch(es), % session(s) created from existing Batch classes',
    n_batch, (SELECT COUNT(*) FROM _sess);
END
$$;

-- ─── 3. Constraints that hold once the data is converted ────────────────────

-- A student has at most one active placement.
CREATE UNIQUE INDEX "BatchMember_one_active_per_student"
  ON "BatchMember"("studentUserId") WHERE "leftAt" IS NULL;

-- Batch names are unique (ignoring case) among batches that are not archived.
CREATE UNIQUE INDEX "Batch_name_active_key"
  ON "Batch"(lower("name")) WHERE "status" <> 'ARCHIVED';

ALTER TABLE "Batch" ADD CONSTRAINT "Batch_maxStudents_check"
  CHECK ("maxStudents" BETWEEN 1 AND 9);

ALTER TABLE "BatchSlot" ADD CONSTRAINT "BatchSlot_time_check"
  CHECK ("weekday" BETWEEN 0 AND 6 AND "hour" BETWEEN 0 AND 23 AND "minute" BETWEEN 0 AND 59);

ALTER TABLE "BatchSession" ADD CONSTRAINT "BatchSession_time_check"
  CHECK ("end" > "start");

-- A BATCH lesson is always a participant of a session of a batch, and a 1:1
-- lesson never is — so the class a lesson belongs to can never be ambiguous.
ALTER TABLE "ScheduledLesson" ADD CONSTRAINT "ScheduledLesson_batch_link_check"
  CHECK (
    ("classType" = 'BATCH') = ("batchSessionId" IS NOT NULL)
    AND ("batchId" IS NULL) = ("batchSessionId" IS NULL)
  );
