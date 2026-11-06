# Lesson content upgrade — implementation report

This upgrade gives every **learning** lesson one clean, structured, role-aware shape and a
better reading experience. **Assessment lessons (course / stage / final tests) are not touched:**
no change to their pages, routes, question banks, grading, results or monitoring.

## What changed, in one paragraph

Lesson text is cleaned once (duplicated objectives, homework and metadata removed; titles
tidied), the quiz and the teacher-only material are pulled out of the Markdown into their own
fields, "Lesson N" mentions become links that resolve per course, every lesson gets topic-specific
visuals and a knowledge check, and the lesson page is rebuilt on a proper Markdown renderer with a
table of contents, progress, previous / next and Presentation Mode. Teacher-only material is
enforced at the API, not hidden with CSS.

## Data model (additive migration `20261106004118_lesson_structured_content`)

| Field | Purpose |
| --- | --- |
| `Lesson.teacherNotes` | Teacher-only Markdown (instructor-guided coding, answer keys moved out of the text). |
| `Lesson.miniQuiz` | The structured Mini Quiz (answers + explanations live here, server-side). |
| `Lesson.visuals` | Visuals / interactive blocks as validated **data** (no markup). |
| `Lesson.contentVersion` | Gate: the boot backfill upgrades a row once, so admin edits are never overwritten. |
| `Lesson.sourceRefs.lineageKey` | Where a lesson's content originated (`<module-slug>/<position>`); travels with copies. |
| `Lesson.sourceRefs.contentReview` | Anything the cleanup could not decide, kept for a human (never discarded). |
| `LessonProgress` | Per student per lesson: sections read, activities done, quiz results. |

Nothing is dropped or renamed; the migration only adds columns and a table.

## Courses covered

Discovered from the database and datasets at run time — no course, lesson id, module name or count
is hard-coded. In the verification database: six pathways of 24 learning lessons (AI Builder,
Data Scientist, Digital Independence, Game Creator, Little Coders, Web Developer), Lumexa Odyssey's
72 copies (they inherit by lineage), and the custom *Advanced Data Science* redesign (matched by
title, with its original lineage as a fallback). Any custom course imported from these inherits the
same way. Test lessons in all of them: **0 modified**.

## Cleanup (idempotent; run over all 144 pathway lessons)

| Change | Lessons |
| --- | --- |
| Redundant banner (course / module / duration / difficulty / lesson number) removed | 120 |
| Repeated metadata lines removed | 72 |
| Duplicate objectives section removed / merged into `objectives` | 73 / 23 |
| Duplicate homework section removed (canonical `homework` kept) | 80 |
| Quiz sections converted to the structured quiz | 189 sections |
| Teacher-only sections moved to teacher notes | 27 (+ 48 source guides attached) |
| "Lesson N" references linked by lineage | 176 |
| Titles cleaned / derived from content (e.g. the eight Data Visualisation lessons) | 35 / 9 |
| Headings re-levelled (one H1, clean H2–H4) | 33 |

A content-preservation check confirms every substantive source line is still somewhere (text,
notes, quiz, objectives or homework); a second run changes nothing.

## Needs a human look (nothing was discarded; shown in the lesson editor)

* Source quiz defects: AI Builder *Python & AI Foundations* L2 (answer key missing entries), Game
  Creator *Python Arcade* L2 (key misaligned), Web Developer *JavaScript Interactivity* L6 (an
  "open response" entry in a key). These stay as text for review.
* 38 lessons whose source answers are heavily weighted to one option — the runtime now shuffles
  options deterministically, so position gives nothing away.
* 6 lessons whose text states a duration different from the stored one; 6 objective sections that
  only partly overlap `objectives`; 3 "Hands-On Activity" sections that start with a teacher
  instruction but are not marked as teacher material; 13 references that name another course
  (left as text); 2 homework sections that differ from the homework field.
* Some Web Developer homework text is garbled in the source.

`npm run report:lesson-content` (server) prints this per course from the live database, read-only.

## Numbering and references

Header: `AI Builder Path › Computer Vision Projects › Session 12 · Lesson 3 of 8`. *Session N* is
course-wide and counts tests; *Lesson N of M* is the position among the module's learning lessons
(course-level for a custom course without modules). References are `[Lesson 3](lumexa:lesson/<module>/3)`,
resolved at read time against the course being viewed: linked for a lesson the viewer may open,
shown locked for a student who has not had that class, plain text if the course has no such lesson,
and never linked inside the live classroom. Ambiguous mentions (ranges, other-course names) are
left as text and reported.

## Quiz

One question at a time; every graded question is checked on the server, which returns the right
answer and the explanation **only in response to an answer**. Types: multiple choice, true/false,
code output, code error, ordering, matching, self-check, reflection. Option ids are opaque hashes
and the order is a deterministic per-lesson shuffle. Self-check / reflection answers never leave the
learner's device. 120 lessons got their quiz from the text; the 24 Little Coders lessons had none
and received a short, friendly knowledge check. It is separate from the assessment system.

## Visuals

179 topic-specific visuals across all 144 lessons (≥1 each), as data: flows, sequence diagrams,
trees, tables and before/after tables, charts (bar / line / scatter with fitted line / histogram),
pixel grids, step-through code, game stages, Scratch blocks, box model, Flexbox / Grid and
responsive playgrounds, attention maps, checklists, walkthroughs, cards, brand kits, wireframes,
annotated windows. **Face Detection** (AI Builder · Computer Vision L3): Haar-like features over a
drawn face (values computed from the drawn pixels), a cascade funnel, a labelled
`(x, y, width, height)` box with sliders, colour vs grayscale, and a `scaleFactor` / `minNeighbors`
lab. Every face is a drawing and every detection result is a prepared sample, and each block says
so — nothing implies live OpenCV. Alt text and caption are required; images and video load lazily,
only from `https://` or `/lesson-assets/`; video never autoplays.

## Reading experience

Proper Markdown (GFM tables in a scroll wrapper, highlighted code that scrolls on its own,
callouts, safe links and images; raw HTML is shown as text, never run), a 68–72 character reading
column, table of contents with active highlighting, reading progress, collapsible supplementary
sections, previous / next that respect access, and Presentation Mode (teacher / admin only, nothing
private). The live classroom keeps its compact layout (`mode="classroom"`). Progress separates
*read*, *activities*, *quiz* and *homework*; opening a page never completes it. No XP, levels,
streaks or badges were added.

## Teacher-only material

Notes, review notes and the answer key are **not** fields of the shared lesson payload (an
allowlist serializer builds it). They come from `GET /curriculum/lessons/:id/teacher-prep`, which
only the assigned teacher or an admin may call, and the UI never renders them in Presentation Mode
or the classroom.

## Admin lesson editor (`/admin/lessons/:id/edit`)

Structured quiz editor (all question types, reorder, per-question errors), visuals editor (kind,
alt, caption, configuration with live preview and a starter template per kind), teacher notes,
placement helpers for the quiz and visuals, live server validation with every problem listed,
review flags from the cleanup, and Student / Presentation previews of the draft. Saving is
rejected with the full list of problems if the content is invalid.

## Import, Odyssey, custom courses

An imported lesson copies every new field **by value** (independent copy) and records
`importedFromLessonId` plus its `lineageKey`, so editing a copy never touches the original and
"Lesson N" links resolve inside the new course.

## Rollout

* `prisma migrate deploy` (additive), then the normal boot runs the seed, which now ends with the
  version-gated backfill. It logs a summary and the flagged lessons. A second boot is a no-op.
* To add or change visuals / knowledge checks for future releases, edit
  `server/src/curriculum/lesson-content/catalog/*` and bump `CONTENT_VERSION` only with the
  additions (existing rows already at the version are never rewritten).
* Rollback: the new columns are optional; the previous renderer ignores them.

## Verification

Server: `tsc` clean, `nest build`, 73 new unit tests (cleanup over all shipped lessons, quiz
secrecy and grading, serialization / numbering / references, visual validation and placement,
upgrade gating, authorization, import independence); full suite 59 suites passing — the two
failing `auth.*.spec.ts` template specs fail identically on the untouched baseline. The
integration suites (assessments, class tests, classroom details, batches) pass.
Client: `tsc` and `next build` clean, lint clean for the new code, 438 tests including an SSR
render of every catalog visual. Checked in a real browser (desktop, mobile, light, dark, student,
teacher, admin, Presentation Mode, classroom route) with no console errors and no horizontal
overflow.
