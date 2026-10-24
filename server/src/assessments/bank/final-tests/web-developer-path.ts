// FILE PATH: server/src/assessments/bank/final-tests/web-developer-path.ts
//
// Web Developer Path — Final Test: 25 MCQ + 5 True/False drawn from the
// pathway's three modules (HTML and CSS Mastery, JavaScript and Interactivity,
// React and Full-Stack Web) plus one ~15-minute single-file web page the
// teacher marks.

import { composeBank, project } from '../bank.helpers';
import { htmlCssMasteryExtras } from '../course-tests/html-css-mastery';
import { javascriptInteractivityExtras } from '../course-tests/javascript-interactivity';
import { reactFullstackWebExtras } from '../course-tests/react-fullstack-web';

export const webDeveloperFinal = composeBank({
  id: 'final-test/web-developer-path',
  title: 'Web Developer Path — Final Test',
  type: 'FINAL_TEST',
  slices: [
    htmlCssMasteryExtras.final,
    javascriptInteractivityExtras.final,
    reactFullstackWebExtras.final,
  ],
  codingProject: project({
    key: 'P01',
    title: 'Crew Check-In Board',
    language: 'html',
    instructions: `Build a small "crew check-in" page in a single HTML file, using about 15 minutes. The starter code gives you an empty page to fill in. Your page must:

1. Use semantic HTML: a header with one h1, a main area containing a form with a labelled text input and a button, an empty list (ul) for names, and a footer.
2. Use CSS (in a style block) to lay the form out with Flexbox, give the list items some padding and rounded corners, and add a hover effect to the button with a transition.
3. Use JavaScript so that submitting the form adds the typed name to the list as a new list item. Ignore empty names, trim extra spaces, clear the input afterwards, and keep a line of text such as "Crew checked in: 3" up to date.

Do not let the form reload the page. Use clear names and add a few short comments.`,
    starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Crew Check-In Board</title>
  <style>
    /* 2. Your CSS here */
  </style>
</head>
<body>
  <!-- 1. Your semantic HTML here -->

  <script>
    // 3. Your JavaScript here
  </script>
</body>
</html>
`,
    rubric: [
      {
        criterion: 'Semantic HTML structure',
        maxPoints: 5,
        lookFor:
          'Uses header, main and footer; exactly one h1; a form containing a text input with a connected label (or aria-label) and a button; and an empty ul for the names. Award partial marks if the page works but is built mostly from div elements.',
      },
      {
        criterion: 'CSS layout and hover effect',
        maxPoints: 4,
        lookFor:
          'The form is laid out with display: flex (with a gap or sensible alignment), list items have padding and a border-radius, and the button has a :hover style with a transition. A visible :focus style is a bonus.',
      },
      {
        criterion: 'JavaScript behaviour',
        maxPoints: 7,
        lookFor:
          'Selects the elements (querySelector or getElementById), calls preventDefault in the submit handler, trims the value and ignores an empty one, creates a li with createElement and textContent and attaches it with appendChild or append, clears the input, and updates the "Crew checked in: N" text (for example from the number of list items). Award partial marks for each missing part.',
      },
      {
        criterion: 'Clarity and accessibility',
        maxPoints: 4,
        lookFor:
          'Meaningful names, neat indentation, a few short comments, a language attribute on html, and a label for the input. The page would work if it were opened in a browser.',
      },
    ],
  }),
});
