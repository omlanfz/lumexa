# Assessments

Tests (Course, Stage and Final), the student test engine, and the teacher's
Test Evaluation report cards.

## The standard

| Test        | Objective part                                  | Practical            | Marks |
| ----------- | ----------------------------------------------- | -------------------- | ----- |
| Course Test | 30 multiple-choice (4 options) + 10 True/False  | —                    | 40    |
| Stage Test  | 30 multiple-choice + 10 True/False              | —                    | 40    |
| Final Test  | 25 multiple-choice + 5 True/False               | one ~15-minute project, marked by the teacher against a rubric | 50 |

One mark per objective question. No installation, environment-setup or
terminal-command questions — tests check understanding (concepts, reading code,
debugging, small projects). `bank/bank.validate.ts` enforces all of this.

## Where the questions live

The questions are **code**, in `bank/`:

- `course-tests/<module-slug>.ts` — one Course Test per module (18), plus the
  module's slice of its pathway Final Test, Odyssey Stage Test and Odyssey
  Final Test
- `final-tests/<pathway-slug>.ts` — the Final Tests (composed from the module
  slices) and their coding projects
- `stage-tests/` — the three Odyssey Stage Tests

A multiple-choice question is written as the **correct answer plus three wrong
ones**, never as an options array and an index, so an answer key cannot drift.
`bank.materialize.ts` places the correct answer (evenly across A–D). "What does
this code print?" questions carry the snippet; `bank.verify.ts` **runs it** and
checks the answer key against the real output.

`syncAssessmentBanks` (`bank/bank.sync.ts`) writes the banks to the database on
every boot and from `npm run seed:courses`. It is idempotent, never deletes a
question a student has answered (it unpublishes it), never overwrites a
question an admin edited, refuses to write a bank that fails the standard, and
takes a Postgres advisory lock. A custom curriculum's imported test lessons are
**linked** to the original bank (`Assessment.sourceAssessmentId`) instead of
copying it — see `linked-assessment.ts`.

### Changing a bank

1. Edit the file. Question keys (`M01…`, `T01…`) come from position: **append**,
   don't reorder.
2. Bump `BANK_CONTENT_VERSION` in `bank/bank.constants.ts` so databases pick the
   change up.
3. `npm run verify:banks` — validates every bank and runs the code answers.
   Snippets that import `numpy`, `pandas`, `scikit-learn`, `matplotlib`,
   `opencv` or `pygame`, and the Lua (Roblox) ones, need a Python that has them
   (plus `lupa` for Lua):
   `BANK_VERIFY_PYTHON=/path/to/venv/bin/python npm run verify:banks`.
   Without them those checks are skipped, not failed.
4. `npx jest src/assessments` runs the same gate.

## Student → teacher → parent

1. `POST /assessments/:id/attempts/start` — only for the student's own class that
   carries this test, inside the test window. One attempt per class.
2. Answers and project code autosave; the server is the source of truth (the
   browser also keeps a local backup and re-sends).
3. `POST …/submit` locks the attempt, auto-grades the objective part and creates
   the `TestReport`. A repeated submit returns the first result.
4. The teacher reviews it under **Test Evaluations**: may override single
   questions, marks the coding project against the rubric, writes feedback, and
   approves. Only then is the result released to the student. The automatic
   score is always kept next to the teacher's.
5. Sharing emails the parent/guardian (the student's billing contact, else the
   account email). The report becomes *Shared with Parents* only after the mail
   server accepted the message; a failure is shown with its reason and the
   report stays *Ready to share*.

Report states: `PENDING_REVIEW` · `PENDING_CODE_EVALUATION` (Final Tests, until
every rubric criterion is marked) · `READY_TO_SHARE` · `SHARED_WITH_PARENTS`.

## Tests

- Unit: `npx jest src/assessments` (grading math, report builder, bank
  validation/materialisation/verification, the content gate over every bank,
  the service rules with a mocked Prisma).
- Real Postgres (skipped unless the variable is set): the bank sync and the whole
  HTTP workflow. The database is **wiped** — use a throwaway one whose name
  contains `it`, `test` or `integration`:

  ```bash
  createdb lumexa_it
  DATABASE_URL=postgresql://…/lumexa_it DIRECT_DATABASE_URL=postgresql://…/lumexa_it npx prisma migrate deploy
  ASSESSMENT_INTEGRATION_DATABASE_URL=postgresql://…/lumexa_it npx jest src/assessments
  ```
