// FILE PATH: server/src/assessments/bank/final-tests/digital-independence-path.ts
//
// Digital Independence Path — Final Test: 25 MCQ + 5 True/False drawn from the
// pathway's three modules (Build Your Professional Identity, Skills That Pay,
// Professional Presence & Opportunity Building) plus one ~15-minute portfolio
// "presence page" the teacher marks. The project reuses what the pathway builds
// (a simple HTML portfolio with honest, specific content), not new tools.

import { composeBank, project } from '../bank.helpers';
import { buildYourProfessionalIdentityExtras } from '../course-tests/build-your-professional-identity';
import { professionalPresenceExtras } from '../course-tests/professional-presence';
import { skillsThatPayExtras } from '../course-tests/skills-that-pay';

export const digitalIndependenceFinal = composeBank({
  id: 'final-test/digital-independence-path',
  title: 'Digital Independence Path — Final Test',
  type: 'FINAL_TEST',
  slices: [
    buildYourProfessionalIdentityExtras.final,
    skillsThatPayExtras.final,
    professionalPresenceExtras.final,
  ],
  codingProject: project({
    key: 'P01',
    title: 'Your Portfolio Presence Page',
    language: 'html',
    instructions: `Build a one-page portfolio "presence page" in a single HTML file, using about 15 minutes. Use a real or made-up student; everything you write must be honest and specific. The starter code gives you an empty page. Your page must have:

1. A header with the person's name (one h1) and a headline that follows the formula: what they do or are learning + a specific tool or focus + what they are working toward.
2. An About section with four short paragraphs, in this order: who they are; what they can actually do; what they are working toward; how to connect.
3. A Projects section with two project cards. Each card needs a title, a result-focused description (what happened because of the project, not only what was done) and a link.
4. A Contact section that uses a safe contact method (a school email address or a contact form). Never put a home address or phone number on the page.
5. A footer, and basic CSS: no more than three colours and two fonts, with text that is easy to read against its background.

Do not invent endorsements, awards or job titles. Use clear names and a few short comments.`,
    starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Portfolio Presence Page</title>
  <style>
    /* Your CSS here: at most 3 colours and 2 fonts */
  </style>
</head>
<body>
  <!-- header: name + headline -->

  <main>
    <!-- About: 4 short paragraphs -->

    <!-- Projects: 2 cards (title, result-focused description, link) -->

    <!-- Contact: a safe contact method -->
  </main>

  <!-- footer -->
</body>
</html>
`,
    rubric: [
      {
        criterion: 'Structure and the required sections',
        maxPoints: 5,
        lookFor:
          'Uses header, main, section and footer elements; exactly one h1; has the About, Projects and Contact sections; the About section has four short paragraphs in the right order (who, what they can do, working toward, how to connect).',
      },
      {
        criterion: 'Honest, specific content',
        maxPoints: 7,
        lookFor:
          'The headline names a real skill or focus and a direction. Each project card has a title, a result-focused description (an outcome, number or checkable fact, not "I made an app") and a link. Nothing is invented: no fake endorsements, awards, job titles or inflated claims. Award partial marks for each missing part.',
      },
      {
        criterion: 'Safe contact and good judgement',
        maxPoints: 4,
        lookFor:
          'Uses a school email address or a contact form. Award 0 for this criterion if a home address or phone number appears anywhere on the page. A short note that the contact is for professional messages is a bonus.',
      },
      {
        criterion: 'Brand and readability',
        maxPoints: 4,
        lookFor:
          'No more than three colours and two fonts used consistently, a readable contrast between text and background, sensible spacing, and tidy code with a few comments.',
      },
    ],
  }),
});
