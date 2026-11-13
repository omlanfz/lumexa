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

*Python Foundations* (added after this report) is a seventh pathway of 24 learning lessons. It was
authored directly in this structure: its visuals and five-question multiple-choice quiz come from the
same two catalogs (`catalog/python-foundations.ts`, `catalog/python-foundations-quiz.ts`) and the
lessons go through the same upgrade on a fresh seed. See [PYTHON_FOUNDATIONS.md](PYTHON_FOUNDATIONS.md).

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
  "open response" entry in a key), and many "write your answer" questions whose model answers belong
  to a neighbouring question. The multiple-choice rewrites do not use those model answers; the old
  answer key text stays in the teacher notes for review.
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

**Every quiz question is a multiple-choice question with exactly four answer options and one right
answer — there is no other kind** (see "Multiple choice only" below). One question at a time; every
question is checked on the server, which returns the right answer and the explanation **only in
response to an answer**. Option ids are opaque hashes and the order is a deterministic per-lesson
shuffle. The quiz is separate from the assessment system.

## Multiple choice only (content version 2)

**The rule:** every question in a learning lesson's Mini Quiz is a multiple-choice question with
exactly four distinct answer options and one correct option. Typed answers ("self-check"),
reflection prompts, true/false, ordering and matching no longer exist as quiz questions anywhere —
not in the database, the API, the student quiz, the teacher answer key or the admin editor.
Assessment / test lessons and their question banks are **not** part of this and are untouched.

**Enforced in the backend, not just the UI.** `normalizeQuiz` accepts only four-option multiple
choice; the admin save endpoint rejects anything else with a message that names the rule; the read
path (`readQuiz`) never serves — or grades, or puts in an answer key — a stored question that breaks
it, so even a row written by an older release or edited by hand cannot show a typed-answer box.

**What happened to the existing content** (counts are for the six pathway datasets; Lumexa Odyssey
and custom courses inherit by lineage or title):

| | Questions |
| --- | --- |
| Already four-option multiple choice — kept exactly as written | 299 |
| Typed-answer, reflection and true/false questions rewritten **by hand** as four-option multiple choice (one right answer, three plausible wrong ones, an explanation) | 301 |
| Little Coders' knowledge checks (24 lessons × 3), now multiple choice | 72 |
| Advanced Data Science (custom course), 8 lessons rewritten by title | 40 |
| The same statement asked twice (`True or False: …` repeating a question) — removed | 12 |
| Open-ended questions with no single right answer — **kept for the teacher** as "Discussion questions (not in the student quiz)" in the teacher notes, and flagged for review | 325 (71 lessons) |

Every lesson that had five or more questions still has at least five, all multiple choice. The
rewrites are matched to a question by the start of its text (punctuation, code ticks and Markdown
ignored); a test proves each rewrite matches exactly one question of its lesson, none is unused or
dangling, and every shipped lesson ends with nothing but four-option multiple choice.

**Answers were authored from what the lesson teaches** (the lesson text, the code in it and its
answer key where it was reliable) — the worksheet "model answers" in the source data are misaligned
in many lessons, so they were not trusted. The right answer sits in a spread of positions (about a
quarter each, and the runtime shuffles them again per lesson), and the wrong answers are written to be
about as long as the right one, so neither position nor length gives the answer away (a test checks
both).

**Migration.** A lesson already at version 1 gets a quiz-only migration: its quiz is brought up to
the rule, its teacher notes gain the discussion questions, and its version becomes 2 — nothing else
about it (text, visuals, title, links, an admin's edits) is touched, and a question an admin already
wrote as four-option multiple choice is kept as it is. A lesson at version 0 goes through the full
pipeline and ends up in the same place. Running the backfill again changes nothing. Verified on a
database of 216 learning lessons at version 1: all 216 reach version 2 with 1,007 questions, every
one four-option multiple choice, no lesson without a quiz, tests and assessment tables byte-identical
before and after, a second run inspecting zero rows.

**Things to know.**

* A converted question gets a new id (`q5` → `q5m`). A student who had finished a lesson's old quiz
  sees it as not finished until they answer the new questions; their lesson reading progress is kept.
* A custom lesson written by an admin with typed-answer questions and no hand-written rewrite loses
  those questions from the student quiz (they move to its teacher notes and are flagged
  `quiz-needs-rewrite` in the editor) — the server never invents answers.
* The admin editor shows an older stored question as an unfinished four-option draft, so it can be
  completed or removed.
* Students' score and "completed" now count every question (all are graded).

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
private). The live classroom keeps its compact layout (`mode="classroom"`). The contents sidebar
("On this page") can be hidden with a toggle button at its top-left — the same button brings it
back, from the student, teacher and admin lesson views alike. Hidden, it collapses to a slim rail
that keeps the button where it was, and the lesson content takes the freed space: cards, visuals,
code and tables use the wider column (diagrams stay centred at a sensible size), the reading
measure grows from 72 to 86 characters and the progress chips sit in one row. The choice is
remembered on the device (`lumexa:lesson-sidebar`) and applies to every lesson; below the `lg`
breakpoint the contents stay a collapsible drawer. Progress separates
*read*, *activities*, *quiz* and *homework*; opening a page never completes it. No XP, levels,
streaks or badges were added.

## Teacher-only material

Notes, review notes and the answer key are **not** fields of the shared lesson payload (an
allowlist serializer builds it). They come from `GET /curriculum/lessons/:id/teacher-prep`, which
only the assigned teacher or an admin may call, and the UI never renders them in Presentation Mode
or the classroom.

## Admin lesson editor (`/admin/lessons/:id/edit`)

Structured quiz editor (multiple choice only: four option boxes, one marked correct, an explanation;
reorder; per-question errors), visuals editor (kind,
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
  `server/src/curriculum/lesson-content/catalog/*` (hand-written multiple-choice rewrites live in
  `catalog/mcq/*`) and bump `CONTENT_VERSION` only with the additions (existing rows already at the
  version are never rewritten).
* Rollback: the new columns are optional; the previous renderer ignores them.

## Verification

Server: `tsc` clean, `nest build`, unit tests for cleanup over all shipped lessons, quiz secrecy and
grading, the multiple-choice rule and the conversion (including every rewrite against every shipped
lesson), the version 1 → 2 migration, serialization / numbering / references, visual validation and
placement, upgrade gating, authorization and import independence; the full unit suite passes — the
two `auth.*.spec.ts` template specs fail identically on the untouched baseline. The integration
suites (assessments, class tests, classroom details, batches) pass.
Client: `tsc` and `next build` clean, lint clean for the new code, 462 tests including an SSR
render of every catalog visual, the quiz component and the quiz editor. Checked in a real browser (desktop, mobile, light, dark, student,
teacher, admin, Presentation Mode, classroom route) with no console errors and no horizontal
overflow.
