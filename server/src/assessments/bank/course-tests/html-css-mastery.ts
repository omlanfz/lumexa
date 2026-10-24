// FILE PATH: server/src/assessments/bank/course-tests/html-css-mastery.ts
//
// Web Developer Path → "HTML and CSS Mastery" (8 lessons, 3 projects: Personal
// Landing Page, Responsive Portfolio Layout, Product Showcase Site).
// Topics: 1 how the web works · 2 semantic HTML · 3 CSS basics & the box model ·
// 4 Flexbox · 5 CSS Grid · 6 responsive, mobile-first design · 7 transitions &
// animations · 8 version control, static hosting & sharing.
//
// The layout questions are arithmetic or concept questions (box model widths,
// fr units, media-query conditions), so they have exact answers. Questions about
// deploying are about ideas (what Git is, why relative paths matter), not about
// typing commands.

import { ModuleExtras, bank, mcq, snippet, tf } from '../bank.helpers';

export const htmlCssMastery = bank({
  id: 'course-test/html-css-mastery',
  title: 'HTML and CSS Mastery — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · How the web works ────────────────────────────────────────
    mcq(
      1,
      'What does DNS (the Domain Name System) do?',
      'It translates a human-friendly domain name into the numeric IP address of a server',
      [
        'It sends the HTML page to the browser',
        'It draws the page on the screen',
        'It checks the page for spelling mistakes',
      ],
      "DNS is the internet's phone book: lumexa.space becomes an address like 104.21.55.12.",
    ),
    mcq(
      1,
      'In the URL `https://lumexa.space/missions/mars`, which part is the protocol?',
      '`https://`',
      ['`lumexa.space`', '`/missions/mars`', '`mars`'],
      'The protocol sets the rules for how data is transferred. The domain names the server and the path names the page.',
    ),
    mcq(
      1,
      'A server sends back the status code 404. What does it mean?',
      'The server could not find the page that was requested',
      [
        'The request worked perfectly',
        'The server has crashed',
        'The page has been moved to a new address',
      ],
      '200 OK means success and 404 Not Found means the page is missing.',
    ),
    mcq(
      1,
      'Why is HTML called a "markup language" rather than a programming language?',
      'It describes the structure of content with elements and tags; it does not calculate or make decisions',
      [
        'It can only be written in capital letters',
        'It runs only on servers, never in browsers',
        'It was invented before computers had screens',
      ],
      "HTML marks up content (a paragraph, a heading, a link). The browser's rendering engine reads it from top to bottom and turns it into the visual page.",
    ),

    // ── Lesson 2 · Semantic HTML ────────────────────────────────────────────
    mcq(
      2,
      'Which element should wrap the single most important content of a page?',
      '`<main>`',
      ['`<header>`', '`<aside>`', '`<footer>`'],
      'There should be only one <main> per page. Header, aside and footer are landmark regions around or beside it.',
    ),
    mcq(
      2,
      "Why is `<nav>` better than a plain `<div>` for a site's navigation links?",
      'Browsers, search engines and screen readers understand it as navigation',
      [
        'It makes the links a different colour automatically',
        'It makes the page load faster',
        'A <div> cannot contain links',
      ],
      'Semantic elements describe meaning, which helps accessibility, SEO and anyone reading the code.',
    ),
    mcq(
      2,
      'How many `<h1>` elements should a page have?',
      'Exactly one, as the main title',
      [
        'One for every section',
        'None, because <h1> is outdated',
        'As many as needed to make text big',
      ],
      'Headings form an outline. The single <h1> is the title and the following headings nest below it without skipping levels.',
    ),
    mcq(
      2,
      'What is the `alt` attribute on an `<img>` for?',
      'A text description for people who cannot see the image, and for when it fails to load',
      [
        'It sets the size of the image',
        'It links the image to another page',
        'It makes the image load faster',
      ],
      'Screen readers read the alt text aloud. Never leave it out of a meaningful image.',
    ),

    // ── Lesson 3 · CSS basics ───────────────────────────────────────────────
    mcq(
      3,
      'Which selector targets every element that has `class="card"`?',
      '`.card`',
      ['`#card`', '`card`', '`*card`'],
      'A dot selects by class, which can be reused. A hash selects by id, which must be unique on the page.',
    ),
    mcq(
      3,
      `A box has this CSS (the default content-box sizing):\n\n${snippet(
        'css',
        `.box {
  width: 200px;
  padding: 20px;
  border: 5px solid black;
  margin: 10px;
}`,
      )}\n\nHow wide is the box itself on the page, not counting the margin?`,
      '250px',
      ['200px', '230px', '270px'],
      'Content 200 + padding 20 on each side (40) + border 5 on each side (10) = 250px. Adding the margins (20 more) would give 270px.',
    ),
    mcq(
      3,
      `This box uses border-box sizing:\n\n${snippet(
        'css',
        `.box {
  box-sizing: border-box;
  width: 300px;
  padding: 20px;
  border: 5px solid black;
}`,
      )}\n\nHow wide is its content area?`,
      '250px',
      ['300px', '275px', '350px'],
      'With border-box, the 300px width already includes the padding and border: 300 − 40 − 10 = 250px of content.',
    ),
    mcq(
      3,
      'Which way of attaching CSS is the professional standard?',
      'An external stylesheet linked with `<link rel="stylesheet">`',
      [
        'Inline `style` attributes on every tag',
        'A <style> block copied into every page',
        'Writing CSS inside the <body>',
      ],
      'An external file keeps content and presentation separate and lets one file style many pages.',
    ),

    // ── Lesson 4 · Flexbox ──────────────────────────────────────────────────
    mcq(
      4,
      'On which element do you put `display: flex`?',
      'On the parent (the container) of the items you want to arrange',
      [
        'On every item',
        'On the <html> element only',
        'On the item you want to be largest',
      ],
      'Setting it on the item instead of the container is a common mistake.',
    ),
    mcq(
      4,
      'In a row layout, which property positions items along the main axis?',
      '`justify-content`',
      ['`align-items`', '`flex-wrap`', '`gap`'],
      'justify-content controls the main axis and align-items controls the cross axis. Swapping them is the most common Flexbox bug.',
    ),
    mcq(
      4,
      'Which setting lets a row of cards move onto new lines on a narrow screen instead of shrinking?',
      '`flex-wrap: wrap`',
      ['`justify-content: center`', '`flex-direction: row`', '`gap: 0`'],
      'Without wrapping, items squeeze into one line and get painfully small.',
    ),
    mcq(
      4,
      'What does `flex: 1 1 200px` mean?',
      'Grow 1, shrink 1, with a starting size (basis) of 200px',
      [
        'Fixed width 1px, height 1px, margin 200px',
        'Show 1 item per row, 1 row total, 200px wide',
        'Wait 200 milliseconds before showing the item',
      ],
      'It is a common pattern for equally sized, responsive cards.',
    ),

    // ── Lesson 5 · CSS Grid ─────────────────────────────────────────────────
    mcq(
      5,
      'What does `grid-template-columns: 1fr 1fr 1fr` create?',
      'Three equal-width columns that share the available space',
      [
        'One column that is three times as tall',
        'Three columns that are each exactly 1 pixel wide',
        'Three rows of equal height',
      ],
      'An fr is a fraction of the remaining space.',
    ),
    mcq(
      5,
      'What does `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` do?',
      'It fits as many columns as can hold at least 240px each, and lets them grow to share the leftover space',
      [
        'It makes exactly 240 columns',
        'It makes every column exactly 240px wide, whatever the screen size',
        'It hides columns that are wider than 240px',
      ],
      'As the window shrinks, columns drop away and the cards reflow, with no media query needed.',
    ),
    mcq(
      5,
      'A grid container is 900px wide, has no gap and uses `grid-template-columns: 1fr 2fr`. How wide are the two columns?',
      '300px and 600px',
      ['450px and 450px', '100px and 800px', '300px and 300px'],
      'There are 3 fractions in total (1 + 2), and 900 ÷ 3 = 300px per fraction: the first column gets 300px and the second gets 600px.',
    ),
    mcq(
      5,
      'Which declaration makes a "featured" card take up two column tracks?',
      '`grid-column: span 2;`',
      ['`grid-row: 2;`', '`flex: 2;`', '`columns: 2;`'],
      'span 2 means "occupy two tracks". It can also be written with line numbers, such as grid-column: 1 / 3.',
    ),

    // ── Lesson 6 · Responsive design ────────────────────────────────────────
    mcq(
      6,
      'What does "mobile-first" mean?',
      'Write the base CSS for small screens, then add `min-width` media queries for larger ones',
      [
        'Design only for phones and ignore other screens',
        'Write desktop styles first and shrink them with max-width queries',
        'Test the site on a phone before writing any CSS',
      ],
      'It is easier to add layout complexity when there is more space than to unwind a desktop layout down to a phone.',
    ),
    mcq(
      6,
      'What does `@media (min-width: 768px) { … }` do?',
      'Applies its rules only when the viewport is at least 768px wide',
      [
        'Applies its rules only when the viewport is narrower than 768px',
        'Makes every element 768px wide',
        'Hides the page on large screens',
      ],
      'The width at which the rules switch on is called a breakpoint.',
    ),
    mcq(
      6,
      'Why are `rem` units often better than `px` for font sizes?',
      "rem scales with the user's chosen browser font size, which helps accessibility",
      [
        'rem is always larger than px',
        'rem units only work on phones',
        'px values are not allowed in CSS',
      ],
      'A fixed px size ignores a user who has increased their default font size.',
    ),
    mcq(
      6,
      'What problem does `img { max-width: 100%; height: auto; }` prevent?',
      'Large images overflowing their container and causing sideways scrolling on small screens',
      [
        'Images loading too slowly',
        'Images being copied by other sites',
        'Images changing colour on hover',
      ],
      'It keeps images responsive by never letting them be wider than their container.',
    ),

    // ── Lesson 7 · Animations and hover effects ─────────────────────────────
    mcq(
      7,
      'Why is animating `transform` (for example `translateY(-6px)`) usually smoother than animating `top`?',
      "Transforms are handled by the browser's compositor and GPU without recalculating the page layout",
      [
        'Transforms use less colour',
        'Top can only be changed in JavaScript',
        'Transforms are not affected by screen size',
      ],
      'Changing top, left, width or height forces the browser to re-layout on every frame.',
    ),
    mcq(
      7,
      'Why should hover effects usually also be applied to `:focus`?',
      'Keyboard users need the same visible feedback as mouse users',
      [
        ':focus makes the animation faster',
        ':hover does not work in modern browsers',
        ':focus is only used for images',
      ],
      'Styling :hover and :focus together is an accessibility requirement, not an optional nicety.',
    ),
    mcq(
      7,
      'What does `transition: transform 0.3s ease;` do?',
      'Animates changes to transform over 0.3 seconds, starting slowly, speeding up, and ending slowly',
      [
        'Moves the element 0.3 seconds into the future',
        'Repeats the animation 3 times',
        'Rotates the element by 0.3 degrees',
      ],
      'A transition needs a state change, such as :hover, to trigger it.',
    ),
    mcq(
      7,
      'What are `@keyframes` used for?',
      'Defining the named stages of a multi-step or looping animation',
      [
        'Defining the keyboard shortcuts of a page',
        'Choosing fonts for a heading',
        'Setting the breakpoints of a layout',
      ],
      'Stages are written as percentages (0%, 50%, 100%) or from/to, and the animation property applies them.',
    ),

    // ── Lesson 8 · Deploying and sharing ────────────────────────────────────
    mcq(
      8,
      'What is the difference between Git and GitHub?',
      'Git is the version-control tool that tracks changes; GitHub is a website that hosts Git repositories online',
      [
        'Git is a website and GitHub is a tool on your computer',
        'They are two names for the same thing',
        'GitHub tracks changes; Git is only for deploying websites',
      ],
      "Git keeps a history of your project's changes locally. GitHub stores a copy online so it can be shared and deployed.",
    ),
    mcq(
      8,
      'Why should links to your CSS and images use relative paths like `styles.css` rather than `C:\\Users\\you\\project\\styles.css`?',
      'A path to your own computer only works there, and breaks once the site is deployed',
      [
        'Relative paths load faster',
        'Absolute paths are not allowed in HTML',
        'Hosting services delete files with long names',
      ],
      'Relative paths work the same locally and online.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'The first line of an HTML5 document should be `<!DOCTYPE html>`.',
      true,
      'It tells the browser to use modern HTML5 rendering rules instead of an old compatibility mode.',
    ),
    tf(
      2,
      'Skipping heading levels — for example going from `<h2>` straight to `<h4>` — is good practice.',
      false,
      'Headings should nest logically without skipping levels, like an outline.',
    ),
    tf(
      3,
      "Margin is the space inside an element's border, and padding is the space outside it.",
      false,
      'It is the other way round: padding is inside the border and margin is outside.',
    ),
    tf(
      4,
      'Flexbox is one-dimensional: it arranges items along a single row or column at a time.',
      true,
      'For rows AND columns together, use CSS Grid.',
    ),
    tf(
      5,
      'CSS Grid is designed for two-dimensional layouts, with rows and columns together.',
      true,
      'Grid and Flexbox work well together: Grid for the overall layout and Flexbox inside each item.',
    ),
    tf(
      6,
      'The viewport meta tag is optional for a page that should work well on phones.',
      false,
      'Without it, mobile browsers shrink the whole page, which breaks mobile media queries.',
    ),
    tf(
      7,
      '`prefers-reduced-motion` lets a page respect visitors who are sensitive to motion.',
      true,
      'Some users feel real discomfort from animation, so it is a good habit to tone it down for them.',
    ),
    tf(
      8,
      "A site's homepage file should be named `index.html`, because hosts serve that file by default.",
      true,
      'A differently named file may not be served as the default page.',
    ),
    tf(
      8,
      'With continuous deployment, a new push to the connected repository can update the live site automatically.',
      true,
      'This is why a fix has to be pushed before visitors can see it.',
    ),
    tf(
      8,
      'Opening `index.html` directly from your hard drive uses a real web server.',
      false,
      'It uses the file:// protocol. A real server is needed for other people to reach your site at a URL.',
    ),
  ],
});

// Position 1 of the Web Developer Final Test, position 1 of Odyssey Stage 2 and
// position 4 of the Odyssey Final Test.
export const htmlCssMasteryExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        "Which browser tool lets you inspect a page's structure and its network traffic?",
        'DevTools',
        ['The address bar', 'The rendering engine', 'The status code'],
        'The Elements panel shows the structure and the Network panel shows the requests and responses.',
      ),
      mcq(
        1,
        "Right after DNS finds a server's IP address, what does the browser do?",
        'It sends an HTTP request to that server',
        [
          'It draws the page',
          'It sends the response back to the server',
          'It deletes the cached page',
        ],
        'The server then replies with an HTTP response containing a status code and the content.',
      ),
      mcq(
        2,
        'What does `<a href="#contact">` do?',
        'Jumps to the element with `id="contact"` on the same page',
        [
          'Opens the contact page of another website',
          'Sends an email',
          'Creates an element called contact',
        ],
        'A same-page anchor needs an element elsewhere with exactly that id.',
      ),
      mcq(
        3,
        'What does `rgba(26, 43, 60, 0.8)` add compared with `rgb(26, 43, 60)`?',
        'A fourth value for transparency (alpha)',
        ['A border', 'A bigger font', 'A hover effect'],
        'An alpha of 1 is fully solid and 0 is fully transparent.',
      ),
      mcq(
        3,
        'In `font-family: "Poppins", Arial, sans-serif;`, what happens if Poppins is not available?',
        'The browser tries the next font in the list',
        [
          'The text is not shown',
          'The page shows an error',
          'The browser uses Poppins anyway',
        ],
        'The list is a "font stack" of fallbacks.',
      ),
      mcq(
        4,
        'In a row layout, what does `justify-content: space-between` do?',
        'Puts the first item at the start, the last at the end, and shares the remaining space equally between items',
        [
          'Puts all items at the start with no gaps',
          'Centres all the items in the middle',
          'Stacks the items in a column',
        ],
        'It spreads the items along the main axis with equal gaps between them.',
      ),
      mcq(
        5,
        'A grid has fewer items than would fill a row. What does `auto-fit` do compared with `auto-fill`?',
        'It collapses the empty tracks so the existing items stretch to fill the row',
        [
          'It keeps the empty tracks, leaving gaps',
          'It removes the items that do not fit',
          'It turns the grid into a flex container',
        ],
        'For card galleries, auto-fit usually gives the more polished look.',
      ),
      mcq(
        6,
        'The root font size is 16px. Which `rem` value equals 24px?',
        '1.5rem',
        ['2rem', '0.75rem', '24rem'],
        '24 ÷ 16 = 1.5, so 1.5rem is 24px.',
      ),
      mcq(
        7,
        'Why does `prefers-reduced-motion` matter?',
        'Some people feel real discomfort from animation, so a page can tone motion down for them',
        [
          'It makes animations run twice as fast',
          'It turns on all animations automatically',
          'It removes the need for :focus styles',
        ],
        "Respecting a user's motion preference is part of accessible design.",
      ),
    ],
    trueFalse: [
      tf(
        3,
        'A unitless `line-height` such as 1.5 is a common way to give text comfortable spacing.',
        true,
        'It multiplies the font size, so the spacing scales with the text.',
      ),
      tf(
        4,
        '`justify-content` aligns items along the cross axis, and `align-items` aligns them along the main axis.',
        false,
        'It is the other way round: justify-content is for the main axis and align-items is for the cross axis.',
      ),
    ],
  },
  stage: {
    mcq: [
      mcq(
        1,
        'What is an HTTP response?',
        "The server's reply, which includes a status code and the content (usually HTML)",
        [
          'The request the browser sends',
          'The address in the address bar',
          'A file on your own computer',
        ],
        'The browser sends a request; the server sends back a response.',
      ),
      mcq(
        1,
        "What is the job of the browser's rendering engine?",
        'To read the HTML from top to bottom and turn it into the visual page',
        [
          "To find the server's address",
          'To store your passwords',
          'To write the HTML for the server',
        ],
        'The engine combines the HTML (and later the CSS) to draw text, boxes and images.',
      ),
      mcq(
        2,
        'Which element is best for a blog post or product card that could stand alone?',
        '`<article>`',
        ['`<aside>`', '`<nav>`', '`<footer>`'],
        '<article> is for self-contained content, such as a post that would make sense if syndicated elsewhere.',
      ),
      mcq(
        2,
        'Which element holds metadata such as the page title and character encoding?',
        '`<head>`',
        ['`<body>`', '`<main>`', '`<footer>`'],
        'Visible content goes in the <body>, and nothing in the <head> is displayed directly in the page.',
      ),
      mcq(
        3,
        'Which of these CSS declarations is invalid?',
        '`margin: 10;`',
        ['`margin: 0;`', '`margin: 10px;`', '`margin: 1rem;`'],
        'A non-zero length needs a unit. Zero is the only length that can be written without one.',
      ),
      mcq(
        3,
        'What are ids such as `#main-nav` meant for?',
        'One unique element on the page',
        [
          'Many elements that share a style',
          'Choosing fonts',
          'Setting the page language',
        ],
        'Classes are reusable; an id must appear only once per page.',
      ),
      mcq(
        4,
        'What is the default value of `flex-direction`?',
        '`row`',
        ['`column`', '`wrap`', '`center`'],
        'Flex items are laid out left to right by default.',
      ),
      mcq(
        5,
        'For which layout would Flexbox be simpler than Grid?',
        'A single-row navigation bar',
        [
          'A gallery with featured two-column cards',
          'A page with rows and columns that must line up',
          'A full-page template',
        ],
        'Flexbox is the right tool for arranging items along one row or column.',
      ),
      mcq(
        6,
        "A phone's viewport is 400px wide. Does `@media (min-width: 768px) { .menu { display: flex; } }` apply?",
        'No, because 400px is narrower than 768px',
        [
          'Yes, because 400px is less than 768px',
          'Yes, because every media query always applies',
          'Only if the phone is turned sideways',
        ],
        'min-width means "at least this wide".',
      ),
      mcq(
        7,
        'Which pseudo-class styles an element while it is being clicked?',
        '`:active`',
        ['`:hover`', '`:focus`', '`:visited`'],
        ':hover is mouse over, :focus is keyboard focus, and :active is during the click itself.',
      ),
    ],
    trueFalse: [
      tf(
        3,
        'External CSS lets one stylesheet style many pages.',
        true,
        'That is why it is the professional standard.',
      ),
      tf(
        3,
        'The same id value can be reused on several elements of one page.',
        false,
        'An id must be unique within a page.',
      ),
      tf(
        6,
        'A mobile-first stylesheet starts with base rules for small screens and adds `min-width` queries for larger ones.',
        true,
        'That is the opposite of unwinding a desktop layout with max-width queries.',
      ),
    ],
  },
  odyssey: {
    mcq: [
      mcq(
        2,
        'Which HTML tag creates a link?',
        '`<a>`',
        ['`<link>`', '`<l>`', '`<href>`'],
        'The anchor tag <a> with an href attribute creates a link. (The <link> tag attaches a stylesheet.)',
      ),
      mcq(
        3,
        'Which CSS property sets the colour of text?',
        '`color`',
        ['`text-style`', '`font-paint`', '`background-text`'],
        'background-color sets the background; color sets the text.',
      ),
      mcq(
        4,
        'Which CSS makes the items inside a container sit side by side in a row?',
        '`display: flex;` on the container',
        [
          '`display: block;` on every item',
          '`float: none;` on the page',
          '`position: fixed;` on the container',
        ],
        'Setting display: flex on the parent turns its children into flex items arranged in a row by default.',
      ),
    ],
    trueFalse: [
      tf(
        2,
        'The `alt` attribute is optional for an image that carries meaning.',
        false,
        'Meaningful images need alt text so that people who cannot see them are not left out.',
      ),
    ],
  },
};
