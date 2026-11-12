// Turns one ProgramContent into the HTML of its curriculum PDF.
//
//   cover  →  one page per course (Odyssey: one per stage)  →  "Level-Up Checkpoints" (how students
//   are tested)  →  the complete journey.
//
// The pages are plain HTML + inline SVG, drawn with design.ts and printed to PDF by build.ts.

import type { ProgramFacts } from '../../src/courses/program-facts';
import { heroArt, icon, levelBadge, starfield, xpBar } from './art';
import { PAGE_H, css } from './design';
import { GOLD, THEMES, type Theme } from './theme';
import type {
  AssessmentContent,
  CourseContent,
  ProgramContent,
  SnapshotRef,
  TestKind,
} from './types';

export interface BuildContext {
  content: ProgramContent;
  facts: ProgramFacts;
  /** The Lumexa mark as a data: URI. */
  logo: string;
  /** Snapshot id → data: URI (JPEG). */
  snapshots: Record<string, string>;
}

export const LESSONS_PER_COURSE = 8;

/** "6–12" (or "9" when both ends are the same) — always taken from the program facts. */
export const ageRange = (f: Pick<ProgramFacts, 'ageMin' | 'ageMax'>): string =>
  f.ageMin === f.ageMax ? String(f.ageMin) : `${f.ageMin}–${f.ageMax}`;

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** The number of pages build() produces for a program — used to check the printed PDF. */
export function expectedPageCount(c: ProgramContent): number {
  return 1 + (c.stages ? c.stages.length : c.courses.length) + 2;
}

/** Totals every page agrees on. */
export function totals(c: ProgramContent) {
  const lessons = c.courses.length * LESSONS_PER_COURSE;
  const courseTests = c.courses.length;
  const stageTests = c.stages ? c.stages.length : 0;
  const tests = courseTests + stageTests + 1;
  return {
    courses: c.courses.length,
    lessons,
    courseTests,
    stageTests,
    finalTests: 1,
    tests,
    sessions: lessons + tests,
  };
}

const gradientOf = (t: Theme, i: number): [string, string] =>
  t.courses[i % t.courses.length];
const vars = (g: [string, string]): string => `--c1:${g[0]};--c2:${g[1]};`;

// ─── Shared pieces ──────────────────────────────────────────────────────────

function topBar(ctx: BuildContext, page: number, cover: boolean): string {
  const { content, facts } = ctx;
  if (cover) {
    const chips = [
      `<span class="chip age">${icon('users', 11)} AGES ${esc(ageRange(facts))}</span>`,
      ...facts.badges.map(
        (b) =>
          `<span class="chip ${b.tone}">${esc(b.label.toUpperCase())}</span>`,
      ),
    ].join('');
    return `<header class="top"><div class="brand"><img class="logo" src="${ctx.logo}" alt="Lumexa"/><div><b>LUMEXA</b><small>Space-themed coding education for K–12</small></div></div><div class="chips">${chips}</div></header>`;
  }
  return `<header class="top slim"><div class="brand"><img class="logo" src="${ctx.logo}" alt="Lumexa"/><div><b>LUMEXA · ${esc(content.shortName)}</b></div></div><span class="pageno">${page}</span></header>`;
}

function footer(ctx: BuildContext, page: number, left?: string): string {
  const t = totals(ctx.content);
  const text =
    left ??
    `${LESSONS_PER_COURSE} lessons per course &nbsp;•&nbsp; Live instructor-led classes &nbsp;•&nbsp; ${t.tests} tests along the way`;
  return `<footer class="foot"><span>${text}</span><span><b>Lumexa ${esc(ctx.content.shortName)}</b> · Ages ${esc(ageRange(ctx.facts))} · ${page}</span></footer>`;
}

function snapshotImg(ctx: BuildContext, ref: SnapshotRef): string {
  const uri = ctx.snapshots[ref.id];
  if (!uri) throw new Error(`Snapshot "${ref.id}" was not prepared`);
  return `<img src="${uri}" alt="${esc(ref.title)}"/>`;
}

function testTags(k: TestKind): string {
  return k.tags.map((t) => `<span>${esc(t)}</span>`).join('');
}

function testIcon(kind: 'course' | 'stage' | 'final', size: number): string {
  return icon(
    kind === 'final' ? 'trophy' : kind === 'stage' ? 'shield' : 'flag',
    size,
  );
}

// ─── Cover ──────────────────────────────────────────────────────────────────

/** Up to four sample-project pictures, one from each of several courses spread across the program. */
function showcase(ctx: BuildContext, t: Theme): string {
  const n = ctx.content.courses.length;
  const picks = [
    ...new Set(
      n <= 4
        ? ctx.content.courses.map((_, i) => i)
        : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1],
    ),
  ];
  return `<div class="showcase" style="--n:${picks.length}">${picks
    .map((ci) => {
      const ref = ctx.content.courses[ci].snapshots[0];
      const g = gradientOf(t, ci);
      return `<div class="sc" style="${vars(g)}"><div class="im">${snapshotImg(ctx, ref)}<span class="no">${String(ci + 1).padStart(2, '0')}</span></div><div class="tx"><b>${esc(ref.title)}</b><small>${esc(ref.tech)}</small></div></div>`;
    })
    .join('')}</div>`;
}

function coverPage(ctx: BuildContext, t: Theme): string {
  const { content, facts } = ctx;
  const totalsOf = totals(content);
  const stats = [
    ...content.stats,
    { value: ageRange(facts), label: 'Age range' },
  ];

  const progression = content.stages
    ? `<div class="path">${content.stages
        .map((stage, si) => {
          const g = gradientOf(t, si * 3);
          const rows = stage.courseIndexes
            .map((ci, k) => {
              const cg = gradientOf(t, ci);
              return `<li><span class="n" style="background:linear-gradient(135deg,${cg[0]},${cg[1]})">${ci + 1}</span>${esc(content.courses[ci].title)}</li>`;
            })
            .join('');
          return `${si ? '<span class="arrow">›</span>' : ''}<div class="stagecol"><h5 style="background:linear-gradient(120deg,${g[0]},${g[1]})">Stage ${stage.number} · ${esc(stage.name)}</h5><p style="font-size:8.8px;color:var(--muted);line-height:1.4;margin-bottom:6px">${esc(stage.blurb)}</p><ul>${rows}</ul></div>`;
        })
        .join('')}</div>`
    : `<div class="path" style="padding-top:22px">${content.courses
        .map((c, i) => {
          const g = gradientOf(t, i);
          return `${i ? '<span class="arrow">›</span>' : ''}<div class="node">${levelBadge(String(i + 1).padStart(2, '0'), g[0], g[1], 42, `cv${i}`)}<h5>${esc(c.title)}</h5><p>${esc(c.teaser)}</p>${xpBar(LESSONS_PER_COURSE, LESSONS_PER_COURSE, g[0])}</div>`;
        })
        .join('')}</div>`;

  const who = `<div class="who"><div class="a">${icon('heart', 15, t.main)}<span><b>Who it is for</b>${esc(facts.audience)}</span></div>${
    facts.prerequisite
      ? `<div class="b">${icon('book', 15, '#0284c7')}<span><b>Before you start</b>${esc(facts.prerequisite)}</span></div>`
      : facts.level === 'ADVANCED'
        ? `<div class="b" style="background:#fffbeb;border-color:#fde68a;color:#92400e">${icon('star', 15, '#d97706')}<span><b>Before you start</b>${esc(facts.badges[0]?.label ?? 'Best after a few projects')} — it builds on work you have already made</span></div>`
        : `<div class="b" style="background:#ecfdf5;border-color:#bbf7d0;color:#166534">${icon('check', 15, '#16a34a')}<span><b>Before you start</b>No coding experience needed</span></div>`
  }</div>`;

  return `<section class="page cover">
    ${topBar(ctx, 1, true)}
    <div class="hero">${starfield(content.themeKey.length * 977 + 11, 70, 800, 300)}${heroArt(t)}
      <div class="hero-copy"><div class="eyebrow">${esc(content.eyebrow)}</div><h1>${esc(content.heroTitle)}</h1><div class="sub">${esc(content.heroSubtitle)}</div><p>${esc(content.intro)}</p></div>
    </div>
    <div class="hud">
      <div class="hud-cell"><b>${esc(content.strip[0].big)}</b><span>${esc(content.strip[0].label)}<small>${esc(content.strip[0].sub)}</small></span></div>
      <div class="hud-sep"></div>
      <div class="hud-cell"><b>${esc(content.strip[1].big)}</b><span>${esc(content.strip[1].label)}<small>${esc(content.strip[1].sub)}</small></span></div>
    </div>
    <div class="stats">${stats.map((s) => `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>
    ${who}
    <div><div class="section">${content.stages ? 'THE ODYSSEY JOURNEY' : 'LEARNING PROGRESSION'}</div>${progression}</div>
    <div class="trio">${content.highlights.map((h) => `<div class="perk"><b>${esc(h.title)}</b><p>${esc(h.body)}</p></div>`).join('')}</div>
    <div><div class="section">HANDS-ON PROJECTS STUDENTS BUILD</div>${showcase(ctx, t)}</div>
    ${footer(ctx, 1, `${totalsOf.courses} courses &nbsp;•&nbsp; ${totalsOf.lessons} lessons &nbsp;•&nbsp; ${totalsOf.tests} tests &nbsp;•&nbsp; Live instructor-led classes`)}
  </section>`;
}

// ─── Course pages ───────────────────────────────────────────────────────────

function coursePage(
  ctx: BuildContext,
  t: Theme,
  index: number,
  page: number,
): string {
  const { content } = ctx;
  const c = content.courses[index];
  const g = gradientOf(t, index);
  const first = index * LESSONS_PER_COURSE + 1;
  const kind = content.assessments.courseTest;
  const shots = c.snapshots;
  const shotBlock =
    shots.length > 1
      ? `<div class="shot">${shots.map((s) => `<div class="half">${snapshotImg(ctx, s)}</div>`).join('')}<span class="tag">SAMPLE PROJECTS</span></div>`
      : `<div class="shot">${snapshotImg(ctx, shots[0])}<span class="tag">SAMPLE PROJECT</span></div>`;
  const captionTitle = shots.map((s) => s.title).join(' · ');
  const captionTech = [...new Set(shots.map((s) => s.tech))].join('  |  ');

  return `<section class="page course" style="${vars(g)}">
    ${topBar(ctx, page, false)}
    <div class="banner">${starfield(index * 131 + 7, 40, 800, 160)}
      ${levelBadge(String(index + 1).padStart(2, '0'), 'rgba(255,255,255,.35)', 'rgba(255,255,255,.12)', 58, `bn${index}`)}
      <div class="eyebrow">COURSE ${String(index + 1).padStart(2, '0')} · LESSONS ${first}–${first + LESSONS_PER_COURSE - 1}</div>
      <h2>${esc(c.title)}</h2><div class="sub">${esc(c.subtitle)}</div>
      <div class="tools">${c.tools.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
      <div class="bpills"><span class="pill gold">${c.projects.length} REAL PROJECTS</span><span class="pill">1 ${esc(kind.name)}</span></div>
    </div>
    <div class="cols">
      <aside class="side">
        <div class="card tint"><h4>Overview</h4><p>${esc(c.overview)}</p></div>
        <div class="card"><h4>${icon('rocket', 11, g[0])} Portfolio projects</h4><ul>${c.projects.map((p) => `<li class="proj"><i></i>${esc(p)}</li>`).join('')}</ul></div>
        <div class="card"><h4>Why it matters</h4><p>${esc(c.why)}</p></div>
      </aside>
      <main class="card lessons"><h4>${icon('book', 11, g[0])} Lesson breakdown</h4>
        ${c.lessons.map((l, i) => `<div class="lesson"><span class="n">${i + 1}</span><b>${esc(l)}</b></div>`).join('')}
        <div class="xpwrap">${LESSONS_PER_COURSE} LESSONS ${xpBar(LESSONS_PER_COURSE, LESSONS_PER_COURSE, g[0])} <span style="color:#b27a00">TEST UNLOCKS</span></div>
      </main>
    </div>
    <div class="bottom">
      <figure class="card snap">${shotBlock}
        <figcaption class="cap"><span class="k">Hands-on project</span><b>${esc(captionTitle)}</b><small>${esc(captionTech)}</small><p>${esc(c.snapshotNote)}</p></figcaption>
      </figure>
      <div class="testbox"><span class="k">${testIcon('course', 12)} ${esc(kind.name)}</span><b>${esc(c.testTitle)}</b><p>${esc(c.testBlurb)}</p><div class="tags">${testTags(kind)}</div></div>
    </div>
    ${footer(ctx, page, `${LESSONS_PER_COURSE} lessons &nbsp;•&nbsp; Live instructor-led classes &nbsp;•&nbsp; Builds ${c.projects.length} portfolio projects + 1 ${esc(kind.name.toLowerCase())}`)}
  </section>`;
}

// ─── Odyssey stage pages ────────────────────────────────────────────────────

function stagePage(
  ctx: BuildContext,
  t: Theme,
  stageIndex: number,
  page: number,
): string {
  const { content } = ctx;
  const stage = content.stages![stageIndex];
  const g = gradientOf(t, stageIndex * 3);
  const first = stage.courseIndexes[0] * LESSONS_PER_COURSE + 1;
  const last =
    (stage.courseIndexes[stage.courseIndexes.length - 1] + 1) *
    LESSONS_PER_COURSE;
  const kind = content.assessments.courseTest;
  const stageKind = content.assessments.stageTest!;

  const quests = stage.courseIndexes
    .map((ci) => {
      const c = content.courses[ci];
      const cg = gradientOf(t, ci);
      const shot = c.snapshots[0];
      return `<div class="quest" style="${vars(cg)}">
        <div class="qh">${levelBadge(String(ci + 1).padStart(2, '0'), 'rgba(255,255,255,.4)', 'rgba(255,255,255,.12)', 38, `qb${ci}`)}<div class="k">COURSE ${String(ci + 1).padStart(2, '0')} · LESSONS ${ci * LESSONS_PER_COURSE + 1}–${(ci + 1) * LESSONS_PER_COURSE}</div><h3>${esc(c.title)}</h3></div>
        <div class="qb"><p>${esc(c.overview)}</p><div class="qtools">${c.tools.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
          <ol>${c.lessons.map((l, i) => `<li><i>${i + 1}</i>${esc(l)}</li>`).join('')}</ol></div>
        <div class="qs">${snapshotImg(ctx, shot)}<span class="tag">SAMPLE PROJECT</span><div class="cap">${esc(shot.title)} · ${esc(shot.tech)}</div></div>
        <div class="qt">${testIcon('course', 11)} ${esc(c.testTitle)}</div>
      </div>`;
    })
    .join('');

  return `<section class="page stage" style="${vars(g)}">
    ${topBar(ctx, page, false)}
    <div class="stagehead">${starfield(stageIndex * 97 + 3, 50, 800, 140)}
      ${levelBadge(String(stage.number), 'rgba(255,255,255,.35)', 'rgba(255,255,255,.12)', 54, `sh${stageIndex}`).replace('class="lvl"', 'class="lvl" style="position:absolute;left:20px;top:22px"')}
      <div style="padding-left:70px;position:relative;z-index:2"><div class="eyebrow">STAGE ${stage.number} OF ${content.stages!.length} · LESSONS ${first}–${last}</div><h2>${esc(stage.name)}</h2><p>${esc(stage.blurb)}</p></div>
      <div class="bpills"><span class="pill gold">${stage.courseIndexes.length} COURSES</span><span class="pill">${stage.courseIndexes.length} ${esc(kind.name)}S + 1 ${esc(stageKind.name)}</span></div>
    </div>
    <div class="quests">${quests}</div>
    <div class="bottom" style="grid-template-columns:1fr;height:auto;margin-top:12px">
      <div class="testbox" style="flex-direction:row;align-items:center;gap:16px;padding:11px 16px">
        <div style="flex:none">${testIcon('stage', 34)}</div>
        <div style="flex:1"><span class="k">${esc(stageKind.name)} · AFTER LESSON ${last}</span><b style="margin:3px 0 2px">${esc(stage.testTitle)}</b><p>${esc(stageKind.blurb)}</p></div>
        <div class="tags" style="margin:0;max-width:210px;justify-content:flex-end">${testTags(stageKind)}</div>
      </div>
    </div>
    ${footer(ctx, page, `${stage.courseIndexes.length} courses &nbsp;•&nbsp; ${stage.courseIndexes.length * LESSONS_PER_COURSE} lessons &nbsp;•&nbsp; Live instructor-led classes &nbsp;•&nbsp; ${stage.courseIndexes.length} ${esc(kind.name.toLowerCase())}s + 1 ${esc(stageKind.name.toLowerCase())}`)}
  </section>`;
}

// ─── Level-Up Checkpoints: how students are tested ──────────────────────────

function trophyArt(): string {
  return `<svg class="trophy" viewBox="0 0 230 150" aria-hidden="true">
    <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE38A"/><stop offset="1" stop-color="#FF9D2E"/></linearGradient>
    <radialGradient id="tglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFC83D" stop-opacity=".5"/><stop offset="1" stop-color="#FFC83D" stop-opacity="0"/></radialGradient></defs>
    <circle cx="125" cy="72" r="70" fill="url(#tglow)"/>
    <path d="M92 30h66v38a33 33 0 01-66 0z" fill="url(#tg)" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
    <path d="M92 38H70v10a22 22 0 0022 22M158 38h22v10a22 22 0 01-22 22" fill="none" stroke="url(#tg)" stroke-width="7" stroke-linecap="round"/>
    <path d="M118 101h14v16h16v14h-46v-14h16z" fill="url(#tg)" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>
    <path d="M125 44l5 11 12 1.4-9 8.3 2.4 12L125 70l-10.4 6.7 2.4-12-9-8.3 12-1.4z" fill="#fff" fill-opacity=".92"/>
    <g fill="#fff"><circle cx="48" cy="34" r="2.4" opacity=".8"/><circle cx="196" cy="24" r="2" opacity=".7"/><circle cx="206" cy="92" r="2.6" opacity=".8"/><circle cx="34" cy="96" r="2" opacity=".6"/></g>
    <path d="M200 50l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFE38A"/><path d="M40 62l2.4 5.6 5.6 2.4-5.6 2.4L40 78l-2.4-5.6L32 70l5.6-2.4z" fill="#FFE38A"/>
  </svg>`;
}

function checkpointPath(ctx: BuildContext, t: Theme): string {
  const { content } = ctx;
  const flag = (kind: 'course' | 'stage' | 'final', label: string) =>
    `<div class="flag ${kind}"><div class="dot">${testIcon(kind, kind === 'final' ? 20 : 15)}</div><small>${esc(label)}</small></div>`;
  const parts: string[] = [];
  if (content.stages) {
    content.stages.forEach((stage, si) => {
      const g = gradientOf(t, si * 3);
      const segs = stage.courseIndexes
        .map(
          () =>
            Array.from(
              { length: LESSONS_PER_COURSE },
              () => `<i style="background:${g[0]}"></i>`,
            ).join('') + `<i style="background:${GOLD}"></i>`,
        )
        .join('');
      parts.push(
        `<div class="leg"><div class="bar">${segs}</div><div class="lab">Stage ${stage.number} · ${stage.courseIndexes.length * LESSONS_PER_COURSE} lessons<br/>${stage.courseIndexes.length} course tests</div></div>`,
      );
      parts.push(flag('stage', `STAGE ${stage.number} TEST`));
    });
  } else {
    content.courses.forEach((c, i) => {
      const g = gradientOf(t, i);
      const segs = Array.from(
        { length: LESSONS_PER_COURSE },
        () => `<i style="background:${g[0]}"></i>`,
      ).join('');
      parts.push(
        `<div class="leg"><div class="bar">${segs}</div><div class="lab">Course ${i + 1}<br/>${LESSONS_PER_COURSE} lessons</div></div>`,
      );
      parts.push(
        flag(
          'course',
          `${content.assessments.courseTest.name.split(' ')[0]} ${i + 1}`,
        ),
      );
    });
  }
  parts.push(flag('final', 'FINAL'));
  return `<div class="track"><h4>THE CHECKPOINT PATH — EVERY COURSE ENDS WITH A TEST, THEN ONE FINAL</h4><div class="tr">${parts.join('')}</div></div>`;
}

function testCard(
  k: TestKind,
  kind: 'course' | 'stage' | 'final',
  eyebrow: string,
): string {
  return `<div class="tk${kind === 'final' ? ' gold' : ''}">
    <div class="hd"><span class="bd">${testIcon(kind, 17)}</span><div><small>${esc(eyebrow)}</small><b>${esc(k.headline)}</b></div></div>
    <p class="b">${esc(k.blurb)}</p>
    <div class="parts">${k.parts.map((p) => `<div class="part"><span class="v">${esc(p.label)}</span><span>${esc(p.detail)}</span></div>`).join('')}</div>
  </div>`;
}

function sampleCards(a: AssessmentContent): string {
  const { mcq, trueFalse } = a.sample;
  const letters = ['A', 'B', 'C', 'D'];
  return `<div><div class="section">A TASTE OF A TEST</div><div class="qcards">
    <div class="qc"><span class="qtag">SAMPLE · MULTIPLE-CHOICE</span><h5>${esc(mcq.question)}</h5>${mcq.options
      .map(
        (o, i) =>
          `<div class="opt${i === mcq.answer ? ' ok' : ''}"><i>${letters[i]}</i>${esc(o)}${i === mcq.answer ? '<span class="tick">✓ CORRECT</span>' : ''}</div>`,
      )
      .join('')}</div>
    <div class="qc"><span class="qtag">SAMPLE · TRUE / FALSE</span><h5>${esc(trueFalse.statement)}</h5><div class="tf"><span class="${trueFalse.answer ? 'ok' : ''}">True${trueFalse.answer ? ' ✓' : ''}</span><span class="${trueFalse.answer ? '' : 'ok'}">False${trueFalse.answer ? '' : ' ✓'}</span></div>
      <p class="qnote">Examples in the style of a real test — written for this document, not taken from one.</p></div>
  </div></div>`;
}

function assessmentPage(ctx: BuildContext, t: Theme, page: number): string {
  const { content } = ctx;
  const a = content.assessments;
  const cards = [
    testCard(
      a.courseTest,
      'course',
      `${a.courseTest.name} · after every ${LESSONS_PER_COURSE} lessons`,
    ),
    ...(a.stageTest
      ? [
          testCard(
            a.stageTest,
            'stage',
            `${a.stageTest.name} · after every stage`,
          ),
        ]
      : []),
    testCard(a.finalTest, 'final', `${a.finalTest.name} · the finish line`),
  ];
  return `<section class="page assess">
    ${topBar(ctx, page, false)}
    <div class="apanel">${starfield(4242 + page, 60, 800, 200)}${trophyArt()}
      <div class="eyebrow">HOW STUDENTS ARE TESTED · ${totals(content).tests} TESTS</div>
      <h2>${esc(a.title)}</h2><p>${esc(a.intro)}</p>
    </div>
    ${checkpointPath(ctx, t)}
    <div class="tests ${cards.length === 3 ? 'n3' : 'n2'}" style="margin-top:0">${cards.join('')}</div>
    ${sampleCards(a)}
    <div class="after"><div class="section">AFTER EVERY TEST</div><div class="row">${a.afterwards
      .map(
        (x, i) =>
          `<div class="af"><span class="ic">${icon(['check', 'chart', 'medal'][i % 3], 14)}</span><div><b>${esc(x.title)}</b><p>${esc(x.body)}</p></div></div>`,
      )
      .join('')}</div></div>
    ${footer(ctx, page, `${totals(content).courseTests} course tests${content.stages ? ` &nbsp;•&nbsp; ${totals(content).stageTests} stage tests` : ''} &nbsp;•&nbsp; 1 final test &nbsp;•&nbsp; Every test is part of the program`)}
  </section>`;
}

// ─── The complete journey ───────────────────────────────────────────────────

function journeyPage(ctx: BuildContext, t: Theme, page: number): string {
  const { content } = ctx;
  const tt = totals(content);
  const kind = content.assessments.courseTest;
  const compact = content.courses.length > 6;
  const rows = content.courses
    .map((c, i) => {
      const g = gradientOf(t, i);
      return `<div class="jrow">${levelBadge(String(i + 1).padStart(2, '0'), g[0], g[1], compact ? 36 : 42, `jr${i}`)}<div class="t"><b>${esc(c.title)}</b><div class="chips2">${content.journeyProjects[i].map((p) => `<span>${esc(p)}</span>`).join('')}</div></div><div class="tail"><span class="a">${LESSONS_PER_COURSE} lessons</span><span class="b">+ ${esc(kind.name.toLowerCase())}</span></div></div>`;
    })
    .join('');
  // A program with stages shows its courses in one lane per stage, so nine courses still fit on a page.
  const lanes = content.stages
    ? `<div class="lanes">${content.stages
        .map((stage, si) => {
          const g = gradientOf(t, si * 3);
          const lastLesson =
            (stage.courseIndexes[stage.courseIndexes.length - 1] + 1) *
            LESSONS_PER_COURSE;
          return `<div class="lane"><h5 style="background:linear-gradient(120deg,${g[0]},${g[1]})">Stage ${stage.number} · ${esc(stage.name)}</h5>${stage.courseIndexes
            .map((ci) => {
              const cg = gradientOf(t, ci);
              return `<div class="li">${levelBadge(String(ci + 1).padStart(2, '0'), cg[0], cg[1], 34, `jl${ci}`)}<div><b>${esc(content.courses[ci].title)}</b><small>${esc(content.journeyProjects[ci].join(' · '))}</small></div></div>`;
            })
            .join(
              '',
            )}<div class="lt">${icon('shield', 10, '#6b4300')} ${stage.courseIndexes.length} course tests + stage test after lesson ${lastLesson}</div></div>`;
        })
        .join('')}</div>`
    : '';
  const courseTiles = content.courses
    .map(
      (c, i) =>
        `<div class="tile" style="${vars(gradientOf(t, i))}"><small>${esc(kind.name)} ${i + 1}</small><b>${esc(c.title)}</b></div>`,
    )
    .join('');
  const stageTiles = content.stages
    ? content.stages
        .map(
          (s) =>
            `<div class="tile stg"><small>${esc(content.assessments.stageTest!.name)} ${s.number}</small><b>Stage ${s.number} · ${esc(s.name)}</b></div>`,
        )
        .join('')
    : '';
  const finalKind = content.assessments.finalTest;
  return `<section class="page journey">
    ${topBar(ctx, page, false)}
    <div><h2 class="jh">The Complete Journey</h2><p class="jp">${esc(content.journeyIntro)}</p></div>
    <div><div class="section">${content.courses.length} COURSES · ${tt.lessons} LESSONS</div>${content.stages ? lanes : `<div class="jlist">${rows}</div>`}</div>
    <div><div class="section">HOW STUDENTS ARE TESTED · ${tt.tests} TESTS</div>
      <div class="tiles" style="grid-template-columns:repeat(${compact ? 5 : Math.min(content.courses.length, 5)},1fr)">${courseTiles}</div>
      ${stageTiles ? `<div class="tiles" style="grid-template-columns:repeat(${content.stages!.length},1fr)">${stageTiles}</div>` : ''}
      <div class="finalbar"><span class="ft">FINAL TEST</span><div><b>${esc(finalKind.headline)}</b><small>${esc(finalKind.blurb)}</small></div></div></div>
    <div><div class="section">BY THE END, STUDENTS CAN</div><div class="outs">${content.outcomes.map((o) => `<div class="out"><span class="ck">${icon('check', 11, '#fff')}</span><span>${esc(o)}</span></div>`).join('')}</div>
      ${content.whatsNext ? `<div class="section" style="margin-top:12px">WHAT COMES NEXT — CHOOSE A SPECIALIZED PATHWAY</div><div class="next">${content.whatsNext.map((n) => `<span>${esc(n)}</span>`).join('')}</div>` : ''}</div>
    <div class="cta"><div><b>${esc(content.ctaLine)}</b><small>All lessons and projects are taught live by an expert Lumexa instructor.</small></div><span>Lumexa ${esc(content.shortName)} · Ages ${esc(ageRange(ctx.facts))}</span></div>
    ${footer(ctx, page)}
  </section>`;
}

// ─── The document ───────────────────────────────────────────────────────────

export function buildProgramHtml(ctx: BuildContext): string {
  const { content } = ctx;
  const t = THEMES[content.themeKey];
  const pages: string[] = [coverPage(ctx, t)];
  let n = 2;
  if (content.stages) {
    content.stages.forEach((_, si) => pages.push(stagePage(ctx, t, si, n++)));
  } else {
    content.courses.forEach((_, ci) => pages.push(coursePage(ctx, t, ci, n++)));
  }
  pages.push(assessmentPage(ctx, t, n++));
  pages.push(journeyPage(ctx, t, n++));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${esc(content.heroTitle)} — Lumexa curriculum</title><style>${css(t)}</style></head><body>${pages.join('\n')}</body></html>`;
}

export const PAGE_HEIGHT = PAGE_H;
