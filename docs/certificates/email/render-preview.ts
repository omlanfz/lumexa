// Renders the OLD and the PROPOSED certificate e-mail side by side so they can be compared.
//
//   npm run email-preview
//
// Writes email/certificate-email.preview.html (open it in a browser) and two screenshots.
// Both e-mails go through the real emailLayout from server/src/email/templates/layout.ts.

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { certificateIssuedEmail as proposed, nextMissionWhatsAppUrl } from './certificate-email';
import { certificateIssuedEmail as current } from '../../../server/src/email/templates/student.templates';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const samples = join(here, '..', 'samples');

const verifyUrl = 'https://lumexa.school/verify/LMX-WD-2026-7K3F-9QWM';
const jpg = readFileSync(join(samples, 'lumexa-certificate-sample.preview.jpg'));

// what the CURRENT rule would send for this student (see the README: it ignores age)
const before = current({
  studentName: 'Ayaan Rahman',
  courseName: 'Web Developer Path',
  progressSummaryHtml: `
      <p style="margin: 0 0 6px;"><strong>📚 Lessons completed:</strong> 24 / 28</p>
      <p style="margin: 0 0 6px;"><strong>🏆 Final Test score:</strong> 86%</p>
      <p style="margin: 0;"><strong>📅 Completed on:</strong> November 6, 2026</p>`,
  recommendedCourseName: 'Digital Independence Path',
  recommendedCourseBlurb: 'Build the portfolio, professional skills, and business knowledge to turn ability into real opportunity.',
  dashboardUrl: 'https://lumexa.school/student-dashboard',
});

const after = (imageSrc: string) =>
  proposed({
    studentName: 'Ayaan Rahman',
    studentFirstName: 'Ayaan',
    programName: 'Web Developer Path',
    certificateId: 'LMX-WD-2026-7K3F-9QWM',
    completedOn: '6 November 2026',
    lessonsCompleted: 24,
    totalLessons: 24,
    finalTestPct: 86,
    distinction: false,
    previewImageUrl: imageSrc,
    certificateUrl: verifyUrl,
    verifyUrl,
    whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(`🎓 Ayaan just completed the Web Developer Path at Lumexa AI School! See the verified certificate: ${verifyUrl}`)}`,
    facebookShareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verifyUrl)}`,
    dashboardUrl: 'https://lumexa.school/student-dashboard/certificates',
    next: {
      name: 'AI Builder Path',
      blurb: 'Go from a first line of Python to real machine learning, computer vision, and LLM applications.',
      reason: 'Ayaan already writes JavaScript and React, so AI Builder adds Python and machine learning to everything Ayaan can build.',
      ctaUrl: nextMissionWhatsAppUrl('https://wa.me/8801522122194', 'Ayaan Rahman', 'Web Developer Path', 'AI Builder Path'),
      curriculumUrl: 'https://lumexa.school/curriculums/ai-builder-path-curriculum.pdf',
      programsUrl: 'https://lumexa.school/programs',
    },
  });

const page = (html: string) => html.replace(/<body[^>]*>/, (m) => m); // the layout is already a full document

writeFileSync(join(here, 'certificate-email.preview.html'), page(after('../samples/lumexa-certificate-sample.preview.jpg').html));

const browser = await chromium.launch();
const shot = async (name: string, html: string) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 900 }, deviceScaleFactor: 1.5 });
  const p = await context.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.screenshot({ path: join(here, name), fullPage: true });
  await context.close();
};
await shot('preview-before.png', page(before.html));
await shot('preview-after.png', page(after(`data:image/jpeg;base64,${jpg.toString('base64')}`).html));
await browser.close();

console.log('before subject:', before.subject);
console.log('after  subject:', after('x').subject);
console.log('wrote email/certificate-email.preview.html, preview-before.png, preview-after.png');
