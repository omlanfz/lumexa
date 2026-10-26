import test from "node:test";
import assert from "node:assert/strict";
import {
  allDecisionsAccepted,
  blockersOf,
  compatibilityLabel,
  decisionsFrom,
  decisionsOf,
  formatProgress,
  formatSeats,
  formatSlot,
  formatSlots,
  groupRosterByBatch,
  isFull,
  parseApiError,
  type EnrollmentIssue,
} from "./batches.ts";

const teacherChange: EnrollmentIssue = {
  code: "TEACHER_CHANGE",
  severity: "DECISION",
  message: "The teacher changes.",
  decision: "acceptTeacherChange",
};
const behind: EnrollmentIssue = {
  code: "PROGRESS_BEHIND",
  severity: "DECISION",
  message: "Skips lessons 1–2.",
  decision: "progress",
  choice: "SKIP_TO_BATCH",
};
const replaces: EnrollmentIssue = {
  code: "REPLACES_UPCOMING",
  severity: "DECISION",
  message: "6 classes are removed.",
  decision: "replaceUpcoming",
};
const full: EnrollmentIssue = { code: "BATCH_FULL", severity: "BLOCKER", message: "Full." };

test("slots read as Dhaka wall-clock times, in week order", () => {
  assert.equal(formatSlot({ weekday: 2, hour: 22, minute: 0 }), "Tue 22:00");
  assert.equal(formatSlot({ weekday: 0, hour: 9, minute: 5 }), "Sun 09:05");
  assert.equal(
    formatSlots([
      { weekday: 5, hour: 22, minute: 0 },
      { weekday: 2, hour: 22, minute: 0 },
      { weekday: 2, hour: 9, minute: 30 },
    ]),
    "Tue 09:30 · Tue 22:00 · Fri 22:00",
  );
  assert.equal(formatSlots([]), "No weekly slots");
  assert.equal(formatSlots(null), "No weekly slots");
});

test("seats and progress read plainly", () => {
  assert.equal(formatSeats(3, 4), "3 of 4 students");
  assert.equal(formatSeats(1, 1), "1 of 1 student");
  assert.equal(isFull({ memberCount: 4, maxStudents: 4 }), true);
  assert.equal(isFull({ memberCount: 3, maxStudents: 4 }), false);
  assert.equal(formatProgress({ nextLesson: 3, totalLessons: 24 }), "Lesson 3 of 24");
  assert.equal(formatProgress({ nextLesson: 25, totalLessons: 24 }), "All 24 lessons taught");
});

test("blockers and decisions are told apart", () => {
  const issues = [full, teacherChange, behind];
  assert.deepEqual(blockersOf(issues).map((i) => i.code), ["BATCH_FULL"]);
  assert.deepEqual(decisionsOf(issues).map((i) => i.code), ["TEACHER_CHANGE", "PROGRESS_BEHIND"]);
});

test("only what was ticked becomes a decision, and a progress decision carries its own choice", () => {
  const issues = [teacherChange, behind, replaces];
  assert.deepEqual(decisionsFrom(issues, {}), {});
  assert.deepEqual(decisionsFrom(issues, { TEACHER_CHANGE: true }), { acceptTeacherChange: true });
  assert.deepEqual(decisionsFrom(issues, { PROGRESS_BEHIND: true }), { progress: "SKIP_TO_BATCH" });
  assert.deepEqual(
    decisionsFrom(issues, { TEACHER_CHANGE: true, PROGRESS_BEHIND: true, REPLACES_UPCOMING: true }),
    { acceptTeacherChange: true, progress: "SKIP_TO_BATCH", replaceUpcoming: true },
  );
  // an unticked box is not consent, and a blocker never turns into one
  assert.deepEqual(decisionsFrom([full, teacherChange], { BATCH_FULL: true, TEACHER_CHANGE: false }), {});
});

test("every decision must be accepted before the placement can be confirmed", () => {
  const issues = [teacherChange, behind];
  assert.equal(allDecisionsAccepted(issues, {}), false);
  assert.equal(allDecisionsAccepted(issues, { TEACHER_CHANGE: true }), false);
  assert.equal(allDecisionsAccepted(issues, { TEACHER_CHANGE: true, PROGRESS_BEHIND: true }), true);
  assert.equal(allDecisionsAccepted([], {}), true);
});

test("a candidate batch is labelled compatible, needs-confirmation or not possible", () => {
  assert.deepEqual(compatibilityLabel({ allowed: true, compatible: true }), { text: "Compatible", tone: "good" });
  assert.deepEqual(compatibilityLabel({ allowed: true, compatible: false }), {
    text: "Needs your confirmation",
    tone: "warn",
  });
  assert.deepEqual(compatibilityLabel({ allowed: false, compatible: false }), { text: "Not possible", tone: "bad" });
});

test("the structured part of a refused placement is read from the error", () => {
  const err = {
    response: {
      data: {
        message: "Confirm before continuing: The teacher changes.",
        details: { code: "DECISION_REQUIRED", issues: [teacherChange, behind], unmet: [teacherChange] },
      },
    },
  };
  const parsed = parseApiError(err);
  assert.equal(parsed.code, "DECISION_REQUIRED");
  assert.equal(parsed.message, "Confirm before continuing: The teacher changes.");
  assert.deepEqual(parsed.unmet.map((i) => i.code), ["TEACHER_CHANGE"]);
  assert.equal(parsed.issues.length, 2);
});

test("a plain error, a validation list and a network failure all read as a message", () => {
  assert.equal(parseApiError({ response: { data: { message: "Nope." } } }).message, "Nope.");
  assert.equal(
    parseApiError({ response: { data: { message: ["name too short", "slots required"] } } }).message,
    "name too short, slots required",
  );
  assert.equal(parseApiError(new Error("Network Error"), "Could not save.").message, "Could not save.");
  assert.equal(parseApiError(null).message, "Something went wrong.");
  const left = parseApiError({
    response: { data: { message: "Leaves the batch.", details: { code: "LEAVES_BATCH", batch: { id: "b1", name: "Evening" } } } },
  });
  assert.equal(left.code, "LEAVES_BATCH");
  assert.deepEqual(left.batch, { id: "b1", name: "Evening" });
});

test("a teacher's roster is grouped by batch, batches alphabetically, then the 1-to-1 students", () => {
  const rows = [
    { name: "solo-1", batch: null },
    { name: "b-1", batch: { id: "B", name: "Beta" } },
    { name: "a-1", batch: { id: "A", name: "Alpha" } },
    { name: "b-2", batch: { id: "B", name: "Beta" } },
    { name: "solo-2", batch: null },
  ];
  const groups = groupRosterByBatch(rows);
  assert.deepEqual(groups.map((g) => g.key), ["batch:A", "batch:B", "solo"]);
  assert.deepEqual(groups[1].rows.map((r) => r.name), ["b-1", "b-2"]);
  assert.deepEqual(groups[2].rows.map((r) => r.name), ["solo-1", "solo-2"]);
  assert.deepEqual(groupRosterByBatch([]), []);
});
