# Curriculum PDFs

The downloadable curriculum of every program — the PDFs behind the "Download curriculum" buttons on the website
and the file the certificate email attaches — are produced here, so they all share one design but each program has
its own colours, gradients and artwork.

| Program | File | Palette |
| --- | --- | --- |
| Lumexa Odyssey | `lumexa-odyssey-curriculum.pdf` | indigo → violet |
| Little Coders | `little-coders-path-curriculum.pdf` | amber → orange |
| Game Creator | `game-creator-path-curriculum.pdf` | rose → red |
| Python Foundations | `python-foundations-curriculum.pdf` | Python blue with yellow |
| AI Builder | `ai-builder-path-curriculum.pdf` | violet → magenta |
| Web Developer | `web-developer-path-curriculum.pdf` | blue → cyan |
| Data Scientist | `data-scientist-path-curriculum.pdf` | teal |
| Advanced Data Science | `advanced-data-science-curriculum.pdf` | indigo with a five-colour course ladder |
| Digital Independence | `digital-independence-path-curriculum.pdf` | green |

Every PDF has the same pages:

1. **Cover** — the Lumexa logo, the program's ages and badges, a hero illustration, the two headline numbers, the
   learning progression and a strip of hands-on project pictures.
2. **One page per course** (Odyssey: one per stage) — overview, projects, why it matters, the eight lessons, a
   picture of a sample project, and the course test.
3. **Level-Up Checkpoints** — the highlighted assessment page: the checkpoint path, the real test formats, a sample
   question and what happens after a test.
4. **The complete journey** — every course, every test, what students can do at the end.

## One source of truth

* **Ages, badges, "who it is for" and prerequisite** come from `src/courses/program-facts.ts` — the same file that
  feeds the database seed, the admin screens and the website. Change them there, regenerate, and everything agrees.
* **Test formats** mirror `src/assessments/bank/bank.constants.ts` (course and stage tests: 30 multiple-choice + 10
  true/false; final test: 25 + 5 + a 20-mark project). Little Coders has its own 40-minute layout (10 + 5 + a 25-mark
  practical).
* **Little Coders** is built from `src/little-coders/` — its courses, lesson titles and projects are the program's own.
* **Python Foundations** reads its lesson titles from `prisma/curriculum-data/python-foundations-path.json` (the dataset
  the database is seeded from), so the PDF can never list a lesson the program does not teach.
* **Odyssey** lists the lessons of the nine courses it reuses from `prisma/curriculum-data/*.json`; the other programs'
  content is in `content/<program>.ts`.
* **Sample-project pictures** are the website's screenshots (`client/public/student-projects/`) or the small web
  pages in `snapshots/` (drawn for courses the website has no screenshot for). They are illustrative samples, and the
  PDFs say so ("Sample project"). The sample test questions are written for the document, not taken from a real test.

## Regenerate

```bash
cd server
npm run export:curriculum-pdfs                              # all nine
npm run export:curriculum-pdfs -- --program game-creator    # only these (comma-separated slugs)
npm run export:curriculum-pdfs -- --html ./tmp-html         # also keep each program's HTML, to inspect it
```

Output goes to `client/public/curriculums/` and, for the eight programs the certificate email can attach,
`server/assets/curriculum-pdfs/`. It needs a Chromium (Puppeteer downloads one on `npm install`).

The tool refuses to write a PDF whose content is invalid, and reports any page where text runs past the page edge or
is cut off by its box, or whose page count is not what the content calls for. `src/courses/curriculum-pdf.spec.ts`
checks the same content against the program facts, the file names the website links to and the assessment formats.

## Changing a program

Edit `content/<program>.ts` (text, projects, snapshot choice), `theme.ts` (colours) or `art.ts` (illustrations), then
regenerate and look at the PDF — every page is laid out for US Letter (816 × 1056 CSS px) with no spill.
