# Programs on the public site

The programs on the homepage, `/programs`, `/pricing` and the trial form are not
listed in code. They come from the same course rows Operations manages in
**/admin/courses**, through the public `GET /courses/catalog` endpoint.

## What follows /admin/courses automatically

| In /admin/courses | On the public site |
|---|---|
| Add an active, non-custom course | A card, a price row, a trial option and a curriculum on `/programs` |
| Change title, ages, emoji | The card, the pricing row and the trial option |
| Change the slug | Nothing breaks: the card keeps its look and price (it is recognised by its slug, or by its title if both change) |
| Deactivate a course | The card disappears everywhere |
| Add or remove lessons, modules, course tests | Lesson counts and the course list |

The retired `-path` suffix (`ai-builder-path`) is ignored everywhere. Old links such
as `/programs?program=ai-builder-path` still work.

A program built lesson by lesson (no modules) is shown as courses: each run of
lessons up to a Course Test is one course, named after that test.

## Presentation that a course row cannot carry

`client/lib/programs.ts` (`PRESETS`) holds the card colour, tagline, "your child can
build" line, curriculum PDF and price of a block of 8 lessons. It is looked up by
slug (without `-path`), then by title. A program with no entry still gets a card: a
stable colour picked from its slug, a generic tagline, the default price
(`DEFAULT_BLOCK_PRICE`) and no curriculum download.

To give a new program its own look, price and curriculum PDF, add an entry to
`PRESETS` and put the PDF in `client/public/curriculums/`.

Advanced Data Science is priced exactly like Data Scientist (it shares
`DATA_SCIENCE_BLOCK_PRICE`), for Private 1:1 and Small Batch alike.

## Ages, badges and prerequisites (program facts)

Who each default program is for lives in one file, `server/src/courses/program-facts.ts`:
the age range, the level, the badges ("Beginner friendly", "Most popular", "Basic Python needed"…),
the one-line audience and the prerequisite. It feeds the seed, the admin screens, the public
catalog (`GET /courses/catalog`, so the homepage, `/programs` and `/pricing` follow it), the offline
snapshot and every curriculum PDF.

| Program | Ages | Level | Badges |
|---|---|---|---|
| Lumexa Odyssey | 6–18 | Beginner | Best choice for beginners · Suitable for all ages |
| Little Coders | 6–12 | Starter | Complete beginner friendly · For first-time coders |
| Game Creator | 6–12 | Beginner | Beginner friendly |
| AI Builder | 12–18 | Intermediate | Most popular · Basic Python needed |
| Web Developer | 12–18 | Beginner | Beginner friendly |
| Data Scientist | 12–18 | Intermediate | Basic Python needed |
| Advanced Data Science | 12–18 | Beginner | Beginner friendly |
| Digital Independence | 15–18 | Advanced | Best after a few projects |

Ages and level are stored on the course row and can be edited in **/admin/courses** (the form has
both). A stored row is moved to the values above on boot only while it still holds a value the
seed used before (`replaces` in the facts file), so an administrator's own edit is never
overwritten and a second boot changes nothing. Badges are maintained in code and shown read-only
in the admin course list and form.

To change a badge or an age default, edit `program-facts.ts`, then re-run

```bash
cd server
npm run export:public-catalog      # client/lib/catalog-snapshot.json
npm run export:curriculum-pdfs     # the downloadable curriculum PDFs
```

## Offline snapshot

`client/lib/catalog-snapshot.json` is what renders instantly and whenever the API
is unreachable. Regenerate it after changing the source curriculum:

```bash
cd server && npm run export:public-catalog
```

Programs built by hand (no source JSON) are described by an outline in
`server/prisma/public-catalog-outlines/`.

Little Coders is the exception among the path programs: it is five independent courses
(46 classes) read from `server/src/little-coders`, not from the three-module
`little-coders-path.json` that Odyssey still reuses. See [LITTLE_CODERS.md](LITTLE_CODERS.md).

## Server

Default programs are matched by slug (with or without `-path`) or title, never
duplicated, and the seed never overwrites what an admin edited. A database still on
the old `-path` names is moved to the new names once, on the next boot.
