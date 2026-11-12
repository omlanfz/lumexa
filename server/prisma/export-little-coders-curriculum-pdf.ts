/**
 * Regenerates the public Little Coders curriculum PDF from the program's single
 * source of truth (src/little-coders), so the document parents download, the
 * copy attached to certificate emails and the lessons themselves can never
 * disagree about course names, lesson titles, projects or assessments.
 *
 * It writes the same file to the two places that serve it:
 *   client/public/curriculums/little-coders-path-curriculum.pdf   (/programs download)
 *   server/assets/curriculum-pdfs/little-coders-path-curriculum.pdf (certificate email)
 *
 * Rendering uses the Chromium the certificate renderer already depends on
 * (puppeteer). Point CERTIFICATE_CHROMIUM_PATH / PUPPETEER_EXECUTABLE_PATH at a
 * browser if puppeteer has none of its own.
 *
 *   npm run export:little-coders-curriculum-pdf        (from server/)
 *
 * Re-run it whenever the Little Coders curriculum changes (LC_SPEC_VERSION).
 */

import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { LC_LESSON_SPECS } from '../src/little-coders/curriculum';
import {
  DEFAULT_PLATFORMS,
  LC_ASSESSMENT,
  LC_COURSES,
  LC_LEARNING_TOTAL,
  LC_LESSONS_PER_COURSE,
  LC_SESSIONS_TOTAL,
  lcLessonOrder,
  type LcCourseMeta,
} from '../src/little-coders/lc.constants';

const FILE_NAME = 'little-coders-path-curriculum.pdf';
const TARGETS = [
  path.resolve(__dirname, '../../client/public/curriculums', FILE_NAME),
  path.resolve(__dirname, '../assets/curriculum-pdfs', FILE_NAME),
];

const PAGE_W = 850;
const PAGE_H = 1100;

const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const STAR = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#fff" d="M12 2l2.4 7.1L22 12l-7.6 2.9L12 22l-2.4-7.1L2 12l7.6-2.9z"/></svg>`;
const TICK = `<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path fill="none" stroke="#E07B00" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M4 10.5l4 4 8-9"/></svg>`;

function platformNames(course: LcCourseMeta): string[] {
  const names = course.platforms.map(
    (key) => DEFAULT_PLATFORMS.find((p) => p.key === key)?.name ?? key,
  );
  // The AI course connects its model through the TM2Scratch extension in Stretch3.
  return course.track === 'ai' ? [...names, 'TM2Scratch extension'] : names;
}

function logo(label: string, right: string): string {
  return `
    <div class="top">
      <div class="brand"><span class="mark">${STAR}</span><span class="brand-text"><b>${esc(label)}</b></span></div>
      <div class="top-right">${right}</div>
    </div>`;
}

function footer(left: string, page: number): string {
  return `<div class="foot"><span>${left}</span><span class="foot-r">Lumexa Little Coders Path · ${page}</span></div>`;
}

function overviewPage(): string {
  const steps = LC_COURSES.map(
    (c) => `
      <div class="step">
        <span class="num">${c.number}</span>
        <h4>${esc(c.title)}</h4>
        <p>${esc(c.focus)}</p>
        <span class="tool">${esc(c.platformLabel.replace('Generation AI ', ''))}</span>
      </div>`,
  ).join('<span class="chev">›</span>');
  return `
  <section class="page cover">
    <div class="top">
      <div class="brand"><span class="mark">${STAR}</span><span class="brand-text"><b>LUMEXA</b><small>Space-themed coding education for K–12</small></span></div>
      <div class="pill">Ages 6–11</div>
    </div>
    <p class="eyebrow">CURRICULUM OVERVIEW</p>
    <h1>Little Coders Path<br /><em>Five Courses. Real Projects.</em></h1>
    <p class="lead">A gentle, hands-on journey for young learners: from colourful Scratch blocks to games, AI-powered projects and block-based Python — building genuine, shareable projects the whole way, at a pace made for ages 6–11.</p>
    <div class="stats">
      <div><b>${LC_COURSES.length}</b><span>Independent courses</span></div>
      <div><b>${LC_LEARNING_TOTAL}</b><span>Lessons total</span></div>
      <div><b>${LC_SESSIONS_TOTAL}</b><span>Classes with assessments</span></div>
      <div><b>6–11</b><span>Age range</span></div>
    </div>
    <div class="card progression">
      <p class="card-title">LEARNING PROGRESSION</p>
      <div class="steps">${steps}</div>
    </div>
    <div class="twin">
      <div class="note"><b>Learn by playing, not by lecture.</b> Every lesson turns a new idea into a game, story or project your child actually wants to finish.</div>
      <div class="note"><b>Enrol one course at a time.</b> Follow the recommended order or pick the course that fits your child — it is a progression, not a compulsory package.</div>
    </div>
    <div class="note wide"><b>About six months, two classes a week.</b> ${LC_LEARNING_TOTAL} lessons, ${LC_COURSES.length} course assessments and a final assessment make ${LC_SESSIONS_TOTAL} live classes in total.</div>
    ${footer(`<b>${LC_LESSONS_PER_COURSE} lessons</b> per course &nbsp; <b>Live, instructor-led</b> classes &nbsp; <b>Playful</b>, project-based learning`, 1)}
  </section>`;
}

function coursePage(course: LcCourseMeta, page: number): string {
  const lessons = LC_LESSON_SPECS.filter(
    (l) => l.course === course.number,
  ).sort((a, b) => a.lesson - b.lesson);
  if (lessons.length !== LC_LESSONS_PER_COURSE) {
    throw new Error(
      `Course ${course.number} has ${lessons.length} lessons, expected ${LC_LESSONS_PER_COURSE}`,
    );
  }
  const rows = lessons
    .map(
      (l) => `
      <li>
        <span class="num">${l.lesson}</span>
        <div><b>${esc(l.title)}</b><small>Project: ${esc(l.project.name)}</small></div>
      </li>`,
    )
    .join('');
  const first = lcLessonOrder(course.number, 1);
  const last = lcLessonOrder(course.number, LC_LESSONS_PER_COURSE);
  return `
  <section class="page">
    ${logo(`LUMEXA · Little Coders Path`, String(page))}
    <div class="banner">
      <p class="eyebrow light">COURSE ${course.number} · LESSONS 1–${LC_LESSONS_PER_COURSE} · CLASSES ${first}–${last + 1}</p>
      <h2>${esc(course.title)}</h2>
      <p class="sub">${esc(course.focus)}</p>
      <div class="chips">${platformNames(course)
        .map((n) => `<span>${esc(n)}</span>`)
        .join('')}</div>
    </div>
    <div class="cols">
      <div class="left">
        <div class="card"><p class="card-title">OVERVIEW</p><p>${esc(course.description)}</p></div>
        <div class="card"><p class="card-title">YOU WILL LEARN</p><ul class="dots">${course.concepts
          .map((c) => `<li>${esc(c)}</li>`)
          .join('')}</ul></div>
        <div class="card"><p class="card-title">BY THE END, STUDENTS CAN</p><ul class="ticks">${course.outcomes
          .map((o) => `<li>${TICK}<span>${esc(o)}</span></li>`)
          .join('')}</ul></div>
      </div>
      <div class="right card">
        <p class="card-title">LESSON BREAKDOWN</p>
        <ol class="lessons">${rows}
          <li class="assess">
            <span class="num">★</span>
            <div><b>Course Assessment</b><small>${LC_ASSESSMENT.minutes} minutes · ${LC_ASSESSMENT.marks} marks · quick quiz plus a build-it practical project</small></div>
          </li>
        </ol>
      </div>
    </div>
    ${footer(`${LC_LESSONS_PER_COURSE} lessons &nbsp;·&nbsp; 1 course assessment &nbsp;·&nbsp; Live instructor-led classes`, page)}
  </section>`;
}

function journeyPage(page: number): string {
  const cols = LC_COURSES.map(
    (c) => `
      <div class="jcol">
        <span class="num">${c.number}</span>
        <h4>${esc(c.title)}</h4>
        <ul class="dots">${c.concepts
          .slice(0, 4)
          .map((x) => `<li>${esc(x)}</li>`)
          .join('')}</ul>
      </div>`,
  ).join('');
  const finals = LC_COURSES.map((c) => {
    const last = LC_LESSON_SPECS.find(
      (l) => l.course === c.number && l.lesson === LC_LESSONS_PER_COURSE,
    );
    return `<li><b>${esc(c.title)}</b><span>${esc(last?.project.name ?? '')}</span></li>`;
  }).join('');
  const tools = DEFAULT_PLATFORMS.map(
    (p) => `<li><b>${esc(p.name)}</b><span>${esc(p.description)}</span></li>`,
  ).join('');
  return `
  <section class="page journey-page">
    ${logo('LUMEXA · Little Coders Path', String(page))}
    <h2 class="dark">The Complete Journey</h2>
    <p class="lead small">Across ${LC_COURSES.length} courses and ${LC_LEARNING_TOTAL} lessons, students progress from their first visual coding blocks to games, AI-powered projects and real Python programs — finishing every course with a project they can share.</p>
    <div class="card journey"><div class="jcols">${cols}</div></div>

    <p class="eyebrow">HOW PROGRESS IS CHECKED</p>
    <div class="card assess-card">
      <div class="parts">
        <div><b>01 · Think in Blocks</b><span>${LC_ASSESSMENT.mcq.count} multiple-choice questions · ${LC_ASSESSMENT.mcq.marks} marks</span></div>
        <div><b>02 · Quick Check</b><span>${LC_ASSESSMENT.trueFalse.count} true / false questions · ${LC_ASSESSMENT.trueFalse.marks} marks</span></div>
        <div><b>03 · Build It!</b><span>One practical project · ${LC_ASSESSMENT.practical.marks} marks, marked by the teacher</span></div>
      </div>
      <p class="fine">Every course ends with a ${LC_ASSESSMENT.minutes}-minute, ${LC_ASSESSMENT.marks}-mark assessment — no negative marking. A cumulative Final Assessment closes the path, with a Scratch / AI or a Python practical project.</p>
    </div>

    <p class="eyebrow">WHAT STUDENTS FINISH EACH COURSE WITH</p>
    <ul class="finals">${finals}</ul>

    <p class="eyebrow">TOOLS STUDENTS USE</p>
    <ul class="tools">${tools}</ul>

    <div class="cta"><b>Ready to start building?</b><span>All lessons and projects are taught live by an expert Lumexa instructor.</span></div>
    ${footer('Lumexa Little Coders Path · Ages 6–11', page)}
  </section>`;
}

const CSS = `
  @page { size: ${PAGE_W}px ${PAGE_H}px; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif; color: #1c1c2e; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { position: relative; width: ${PAGE_W}px; height: ${PAGE_H}px; padding: 52px 56px 40px; overflow: hidden; page-break-after: always; break-after: page; background: #ffffff; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .cover { background: radial-gradient(900px 480px at 100% 0%, #FFF1DC 0%, rgba(255,255,255,0) 60%), radial-gradient(700px 420px at 0% 100%, #FFF3E2 0%, rgba(255,255,255,0) 62%), #fff; }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .mark { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, #F59E0B, #F7801E); display: inline-flex; align-items: center; justify-content: center; }
  .brand-text { display: flex; flex-direction: column; line-height: 1.15; }
  .brand-text b { font-size: 13px; letter-spacing: .02em; }
  .brand-text small { font-size: 8.5px; color: #6b6f85; }
  .top-right { font-size: 10px; color: #6b6f85; }
  .pill { font-size: 11px; font-weight: 700; color: #C26A00; background: #FFE9C9; border-radius: 999px; padding: 6px 14px; }
  .eyebrow { margin: 34px 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .09em; color: #4b4f66; }
  .eyebrow.light { color: rgba(255,255,255,.88); margin: 0 0 14px; }
  h1 { margin: 0; font-size: 52px; line-height: 1.06; letter-spacing: -.02em; }
  h1 em { font-style: normal; color: #F2931B; }
  .lead { margin: 20px 0 0; max-width: 640px; font-size: 15.5px; line-height: 1.65; color: #4b4f66; }
  .lead.small { font-size: 13.5px; line-height: 1.55; margin: 8px 0 14px; max-width: 700px; }
  .stats { display: flex; gap: 14px; margin-top: 28px; }
  .stats div { flex: 0 0 auto; min-width: 128px; padding: 16px 18px; border: 1px solid #F3E6D0; border-radius: 16px; background: rgba(255,255,255,.92); }
  .stats b { display: block; font-size: 26px; color: #E8870A; }
  .stats span { font-size: 10.5px; font-weight: 700; color: #3c3f55; }
  .card { border: 1px solid #F1E6D3; border-radius: 18px; background: #FFFCF6; padding: 20px 22px; }
  .card-title { margin: 0 0 12px; font-size: 10.5px; font-weight: 700; letter-spacing: .09em; color: #4b4f66; }
  .progression { margin-top: 30px; background: #fff; padding: 24px 24px 26px; }
  .steps { display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; }
  .step { flex: 1 1 0; min-width: 0; padding: 0 6px; }
  .step h4 { margin: 10px 0 6px; font-size: 13px; line-height: 1.25; }
  .step p { margin: 0 0 8px; font-size: 10.5px; line-height: 1.5; color: #5b5f75; }
  .tool { display: inline-block; font-size: 9px; font-weight: 700; color: #C26A00; background: #FFE9C9; border-radius: 999px; padding: 3px 9px; }
  .chev { color: #E3B776; font-size: 22px; margin-top: 4px; }
  .num { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(135deg, #F59E0B, #F7801E); color: #fff; font-size: 12px; font-weight: 700; }
  .twin { display: flex; gap: 16px; margin-top: 22px; }
  .note { flex: 1 1 0; border: 1px solid #F1E6D3; border-radius: 16px; background: #FFFAF1; padding: 16px 18px; font-size: 11.5px; line-height: 1.6; color: #3c3f55; }
  .note.wide { margin-top: 16px; flex: none; }
  .foot { position: absolute; left: 56px; right: 56px; bottom: 34px; padding-top: 14px; border-top: 1px solid #ECE6DA; display: flex; justify-content: space-between; font-size: 10px; color: #5b5f75; }
  .foot-r { font-weight: 700; color: #8b8fa3; }
  .banner { margin-top: 18px; padding: 26px 30px 24px; border-radius: 22px; color: #fff; background: linear-gradient(120deg, #F59E0B 0%, #F7931E 55%, #FDB95A 100%); }
  h2 { margin: 0; font-size: 31px; letter-spacing: -.01em; }
  h2.dark { margin-top: 16px; font-size: 34px; }
  .sub { margin: 8px 0 14px; font-size: 14px; color: rgba(255,255,255,.96); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chips span { font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 999px; background: rgba(255,255,255,.22); border: 1px solid rgba(255,255,255,.5); }
  .cols { display: flex; gap: 18px; margin-top: 18px; align-items: stretch; }
  .left { flex: 0 0 292px; display: flex; flex-direction: column; gap: 14px; }
  .left .card { padding: 16px 18px; }
  .left p { margin: 0; font-size: 11.5px; line-height: 1.65; color: #3c3f55; }
  .dots, .ticks { margin: 0; padding: 0; list-style: none; }
  .dots li { position: relative; padding-left: 16px; margin: 0 0 7px; font-size: 11.5px; font-weight: 700; color: #2a2c40; }
  .dots li::before { content: ''; position: absolute; left: 1px; top: 4px; width: 7px; height: 7px; border-radius: 50%; background: #F59E0B; }
  .ticks li { display: flex; gap: 8px; margin: 0 0 8px; font-size: 11px; line-height: 1.45; color: #3c3f55; }
  .ticks svg { flex: 0 0 auto; margin-top: 1px; }
  .right { flex: 1 1 auto; background: #fff; padding: 18px 22px; }
  .lessons { margin: 0; padding: 0; list-style: none; }
  .lessons li { display: flex; align-items: center; gap: 14px; padding: 11px 0; border-bottom: 1px solid #F1ECE2; }
  .lessons li:last-child { border-bottom: 0; }
  .lessons b { display: block; font-size: 12.5px; line-height: 1.3; color: #1c1c2e; }
  .lessons small { display: block; margin-top: 3px; font-size: 10px; color: #7a7e93; }
  .lessons .assess { margin-top: 6px; padding: 12px 14px; border: 0; border-radius: 12px; background: #FFF1DC; }
  .lessons .assess .num { background: #1c1c2e; }
  .journey { background: #fff; padding: 16px 18px; }
  .journey-page .eyebrow { margin-top: 20px; margin-bottom: 8px; }
  .jcols { display: flex; gap: 12px; }
  .jcol { flex: 1 1 0; min-width: 0; padding: 0 4px; }
  .jcol h4 { margin: 10px 0 10px; font-size: 12px; line-height: 1.3; }
  .jcol .dots li { font-size: 10px; margin-bottom: 5px; padding-left: 13px; }
  .jcol .dots li::before { width: 6px; height: 6px; top: 3px; }
  .assess-card { background: #FFFAF1; padding: 14px 18px; }
  .parts { display: flex; gap: 14px; }
  .parts div { flex: 1 1 0; background: #fff; border: 1px solid #F1E6D3; border-radius: 12px; padding: 10px 12px; }
  .parts b { display: block; font-size: 12px; margin-bottom: 4px; }
  .parts span { font-size: 10.5px; line-height: 1.45; color: #5b5f75; }
  .fine { margin: 10px 0 0; font-size: 10.5px; line-height: 1.5; color: #5b5f75; }
  .finals, .tools { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px 14px; }
  .finals { grid-template-columns: repeat(5, 1fr); }
  .finals li, .tools li { border: 1px solid #F1E6D3; border-radius: 12px; background: #fff; padding: 9px 12px; }
  .finals b, .tools b { display: block; font-size: 10.5px; line-height: 1.3; margin-bottom: 4px; }
  .finals span, .tools span { font-size: 10px; line-height: 1.4; color: #5b5f75; }
  .tools { grid-template-columns: repeat(2, 1fr); }
  .tools li { display: flex; flex-direction: column; }
  .cta { margin-top: 18px; padding: 13px 20px; border-radius: 16px; background: linear-gradient(120deg, #F59E0B, #F7931E); color: #fff; display: flex; flex-direction: column; gap: 3px; }
  .cta b { font-size: 15px; }
  .cta span { font-size: 11px; opacity: .95; }
`;

export function buildLittleCodersCurriculumHtml(): string {
  const pages = [
    overviewPage(),
    ...LC_COURSES.map((course, i) => coursePage(course, i + 2)),
    journeyPage(LC_COURSES.length + 2),
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Little Coders Path</title><style>${CSS}</style></head><body>${pages.join('')}</body></html>`;
}

function chromiumPath(): string | undefined {
  const candidates = [
    process.env.CERTIFICATE_CHROMIUM_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/opt/pw-browsers/chromium',
  ].filter((p): p is string => !!p && fs.existsSync(p));
  return candidates[0];
}

async function main() {
  const html = buildLittleCodersCurriculumHtml();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromiumPath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = Buffer.from(
      await page.pdf({
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        printBackground: true,
        preferCSSPageSize: true,
      }),
    );
    if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-')))
      throw new Error('Chromium did not return a PDF');
    for (const target of TARGETS) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, pdf);
      console.log(
        `[export:little-coders-curriculum-pdf] wrote ${path.relative(process.cwd(), target)} (${pdf.length} bytes)`,
      );
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
