// FILE PATH: server/src/curriculum/lesson-content/catalog/mcq/web-developer.ts
//
// Four-option multiple-choice versions of the Web Developer pathway's descriptive,
// true/false and "write your answer" quiz questions (keyed by lineage key). See
// ai-builder.ts for how a rewrite is found and what happens to the questions that are
// not rewritten.

import { registerMcqRewrites } from '../../quiz-mcq';
import { rw } from '../helpers';

// ─── HTML & CSS Mastery ──────────────────────────────────────────────────────
registerMcqRewrites({
  'html-css-mastery/1': [
    rw("The `<title>` tag's content is displayed inside the page body", ['In the browser tab and in bookmarks and search results', 'As the large heading at the top of the page body', 'At the very bottom of the page, inside the footer', 'Nowhere — it is a hidden note that only developers read'], 'The `<title>` lives in the `<head>`. Browsers show it on the tab; it is not part of the visible page body.', { prompt: 'Where is the content of the `<title>` tag shown?' }),
    rw('What does the `s` in `https` stand for', ['Secure — the connection is encrypted (SSL/TLS)', 'Server — the page comes from a faster server', 'Speed — pages load faster than over plain http', 'Static — the page can never change after it loads'], 'HTTPS is HTTP over an encrypted (SSL/TLS) connection, so nobody on the way can read or change what is sent.'),
    rw('Which tag must be the very first line of every HTML5 document', ['`<!DOCTYPE html>`', '`<html>`', '`<head>`', '`<body>`'], 'The doctype comes first and tells the browser to use modern HTML5 rules; `<html>` follows it.'),
    rw('What panel in DevTools shows live network requests', ['The Network panel', 'The Elements panel', 'The Console panel', 'The Sources panel'], 'The Network panel lists every request the page makes, with its status, size and timing. Elements shows the HTML, Console shows messages and Sources shows the files.'),
  ],
  'html-css-mastery/2': [
    rw('`alt=""` is always wrong', ['When the image is purely decorative, so it can be skipped', 'Never — every image on a page must have a written description', 'Only when the image is a photo of a person\'s face', 'Only for images that are loaded from another website'], 'An empty `alt` tells assistive technology to ignore a decorative image. A meaningful image still needs a real description.', { prompt: 'When is an empty `alt=""` on an image the right choice?' }),
    rw('What list tag would you use for numbered, ordered steps', ['`<ol>`', '`<ul>`', '`<li>`', '`<dl>`'], '`<ol>` is an ordered (numbered) list. `<ul>` is bulleted, `<li>` is a single item and `<dl>` is a description list.'),
    rw('Which tag is best for content unrelated to the main flow', ['`<aside>`', '`<main>`', '`<header>`', '`<footer>`'], '`<aside>` marks content that is related to, but separate from, the main content — such as a sidebar tip.'),
    rw('What attribute makes an `<a>` tag actually link somewhere', ['`href`', '`src`', '`alt`', '`link`'], 'The `href` attribute holds the address the link points to. `src` is for images and scripts.'),
  ],
  'html-css-mastery/3': [
    rw('An id can be reused on multiple elements in the same page', ['An id must be unique on a page, while a class can be used on many elements', 'An id can be reused on any number of elements, but a class must be unique', 'Both ids and classes must be unique on a page', 'Neither an id nor a class can be used as a CSS selector'], 'Use a class for styling that is shared by many elements. An id names one element only.', { prompt: 'Which statement about `id` and `class` is correct?' }),
    rw('What property controls the space between a line of text and the next line', ['`line-height`', '`letter-spacing`', '`word-spacing`', '`text-indent`'], '`line-height` sets the height of each line, which is what creates the space between lines. `letter-spacing` and `word-spacing` work sideways.'),
    rw('Which CSS box-model layer sits directly outside the border', ['Margin', 'Padding', 'Content', 'Outline offset'], 'From the inside out the box is: content, padding, border, margin.'),
    rw('What selector targets `class="card"`', ['`.card`', '`#card`', '`card`', '`*card`'], 'A dot selects by class. A hash selects by id, and a bare name selects an element type such as `<card>`.'),
  ],
  'html-css-mastery/4': [
    rw('`gap` works only in CSS Grid, not Flexbox', ['In both Flexbox and Grid layouts', 'Only in CSS Grid', 'Only in Flexbox', 'Only on images and videos'], '`gap` sets the space between items and works in Flexbox as well as Grid.', { prompt: 'Where can the `gap` property be used?' }),
    rw('Which property vertically centers flex items in a row layout', ['`align-items: center`', '`justify-content: center`', '`text-align: center`', '`flex-direction: center`'], 'In a row, the cross axis is vertical, and `align-items` controls it. `justify-content` works along the main (horizontal) axis.'),
    rw("What happens to flex items by default if they don't fit on one line", ['They shrink to try to fit on one line', 'They wrap onto a new line automatically', 'They disappear from the page', 'They stack on top of each other'], 'By default `flex-wrap` is `nowrap` and `flex-shrink` is 1, so items shrink instead of wrapping.'),
    rw('What are the three values in the `flex` shorthand', ['`flex-grow`, `flex-shrink`, `flex-basis`', '`flex-basis`, `flex-grow`, `flex-shrink`', '`flex-direction`, `flex-wrap`, `flex-flow`', '`justify-content`, `align-items`, `align-content`'], '`flex: 1 1 200px` means grow 1, shrink 1, basis 200px — in that order.'),
  ],
  'html-css-mastery/5': [
    rw('Grid is one-dimensional like Flexbox', ['Grid handles rows and columns together; Flexbox handles one direction at a time', 'Grid is one-dimensional like Flexbox; the only difference is the syntax', 'Flexbox lays out rows and columns together, while Grid works in one direction', 'Grid is only for laying out text, while Flexbox is only for laying out images'], 'Use Grid when you need to control rows and columns at once, and Flexbox for a single row or column.', { prompt: 'Which statement about Grid and Flexbox is correct?' }),
    rw('What unit represents a fraction of remaining space in Grid', ['`fr`', '`%`', '`vw`', '`em`'], 'One `fr` is one share of the free space left in the grid container.'),
    rw('Which function lets you set a minimum and maximum size for a track', ['`minmax()`', '`clamp()`', '`calc()`', '`repeat()`'], '`minmax(min, max)` sets the smallest and largest size a grid track may take.'),
    rw('What property makes an item occupy two grid columns', ['`grid-column: span 2;`', '`grid-row: 2;`', '`column-count: 2;`', '`flex: 2;`'], '`grid-column: span 2` makes the item stretch across two column tracks.'),
  ],
  'html-css-mastery/6': [
    rw('`vw` is relative to the parent element', ['1% of the width of the viewport, the browser window', '1% of the width of the parent element it sits in', '1% of the font size set on the element\'s parent', 'One pixel of width, scaled to the screen\'s resolution'], '`vw` means "viewport width". `1vw` is one hundredth of the window width, whatever the parent is.', { prompt: 'What is `1vw` relative to?' }),
    rw('What media feature is most commonly used to define breakpoints', ['`min-width` (or `max-width`)', '`color-gamut`', '`hover`', '`aspect-ratio`'], 'Breakpoints are written as `@media (min-width: 768px) { … }`, which applies the rules once the screen is at least that wide.'),
    rw('What two CSS properties make an image scale down safely on small screens', ['`max-width: 100%` and `height: auto`', '`width: 500px` and `height: 500px`', '`overflow: hidden` and `float: left`', '`position: fixed` and `top: 0`'], 'The image can never be wider than its container, and its height follows so the picture is not squashed.'),
    rw('What tag is required in `<head>` for mobile browsers to respect your responsive CSS', ['The viewport meta tag', 'The `<base>` tag', 'The `<link rel="mobile">` tag', 'The `<noscript>` tag'], '`<meta name="viewport" content="width=device-width, initial-scale=1">` tells a phone to use its real screen width instead of pretending to be a desktop.'),
  ],
  'html-css-mastery/7': [
    rw('`@keyframes` can only have a start and end state', ['As many as you like, using percentages such as 0%, 50% and 100%', 'Only two: a start step (`from`) and an end step (`to`)', 'Exactly three: a start, a middle and an end, no more and no less', 'Only one, which the browser then repeats for the whole animation'], '`@keyframes` can have as many steps as you want — `from`/`to` is just a shortcut for 0% and 100%.', { prompt: 'How many steps can a `@keyframes` animation have?' }),
    rw('Which transform function moves an element without affecting layout flow', ['`translate()`', '`scale()`', '`rotate()`', '`skew()`'], '`translate()` moves the element visually; the space it originally took in the layout stays where it was. `scale`, `rotate` and `skew` change its size or shape instead.', { prompt: 'Which `transform` function moves an element without affecting the layout flow?' }),
    rw('What pseudo-class shows feedback for keyboard-focused elements', ['`:focus`', '`:hover`', '`:visited`', '`:first-child`'], '`:focus` applies when an element has keyboard focus — usually it should look as clear as the `:hover` style.'),
    rw('What media feature respects users who want less motion', ['`prefers-reduced-motion`', '`prefers-color-scheme`', '`orientation`', '`min-resolution`'], '`@media (prefers-reduced-motion: reduce)` lets you turn off or shorten animations for people who are sensitive to movement.'),
  ],
  'html-css-mastery/8': [
    rw('Vercel requires a build step for plain HTML/CSS sites', ['No — Vercel can serve the files as they are', 'Yes — you must first run `npm run build`', 'Yes — you must convert the site to React first', 'Yes — you must compile the CSS into JavaScript'], 'A static site made of plain HTML, CSS and images needs no build step. Vercel serves the files directly.', { prompt: 'Does a plain HTML and CSS site need a build step before Vercel can host it?' }),
    rw('What CLI command deploys the current folder directly to Vercel', ['`vercel`', '`git deploy`', '`npm launch`', '`deploy --now`'], 'Running `vercel` inside the project folder uploads it and gives you a live URL.'),
    rw("What filename does Vercel serve by default as a site's homepage", ['`index.html`', '`home.html`', '`main.html`', '`default.htm`'], 'Static hosts serve `index.html` when someone visits the folder\'s address.'),
    rw('What triggers an automatic redeploy once GitHub is connected to Vercel', ['A new `git push` to the connected repository', 'Opening the site in a browser', 'Editing a file on your computer without saving it to Git', 'Waiting one hour'], 'Once the repository is connected, every push to the production branch builds and publishes a new version automatically.'),
  ],
});

// ─── JavaScript Interactivity ────────────────────────────────────────────────
registerMcqRewrites({
  'javascript-interactivity/1': [
    rw('What is the difference between `let` and `const`', ['`let` can be reassigned later; `const` cannot', '`const` can be reassigned later; `let` cannot', 'Both can be reassigned, but `const` is faster to run', '`let` is only for numbers, while `const` is only for text'], 'Use `const` for values that should not be reassigned and `let` for values that will change.'),
  ],
  'javascript-interactivity/2': [
    rw("What's the difference between `querySelector` and `querySelectorAll`", ['`querySelector` returns the first match; `querySelectorAll` returns every match', '`querySelector` returns every match; `querySelectorAll` returns only the first', '`querySelector` works on whole pages; `querySelectorAll` works inside forms only', '`querySelector` finds elements by id only; `querySelectorAll` finds them by class only'], '`querySelector` gives you one element (or `null`); `querySelectorAll` gives you a list of all elements that match.'),
  ],
  'javascript-interactivity/3': [
    rw('Why do we call `event.preventDefault()` in a submit handler', ['It stops the browser\'s default action, such as reloading the page', 'It makes the form submit faster by skipping the browser\'s validation step', 'It deletes whatever the user typed so the form can be reused', 'It stops the user from typing in the form after it has been sent'], 'Without it the browser submits the form and reloads the page before your code can do its work.'),
  ],
  'javascript-interactivity/4': [
    rw("Why doesn't a 404 response trigger `.catch()` on its own", ['`fetch()` only rejects on a network failure; a 404 is a normal response', '`.catch()` is reserved for syntax errors in your code, so 404s never reach it', 'The browser silently retries a 404 request until it finally succeeds', 'The server converts every 404 into valid JSON, so nothing counts as an error'], 'A 404 means the server answered. `fetch()` resolves normally, so check `response.ok` (or `response.status`) and throw your own error if you want `.catch()` to run.'),
  ],
  'javascript-interactivity/5': [
    rw('What relationship does `async`/`await` have with Promises', ['It is a cleaner way to work with Promises: `await` waits for one to finish', 'It replaces Promises completely, so Promises no longer exist in modern JavaScript', 'It runs your code on a second processor core at the same time as the page', 'It is only used to repeat a block of code, like a loop does'], '`async`/`await` is built on Promises. It lets you write asynchronous code that reads from top to bottom.'),
  ],
  'javascript-interactivity/6': [
    rw("Why can't you store a JavaScript array directly in Local Storage", ['Local Storage only stores strings, so the array must be converted first', 'Local Storage can only store numbers, so arrays have to be turned into digits', 'Arrays are too big for a browser to keep, so only the first item is saved', 'Arrays are wiped the moment the page loads, so nothing can be saved'], 'Local Storage keeps text. Convert an array or object to a JSON string to save it.', { prompt: "Why can't you store a JavaScript array directly in Local Storage without converting it?" }),
    rw('What does `localStorage.getItem()` return for a key that was never set', ['`null`', '`undefined`', 'An empty string `""`', 'It throws an error'], '`getItem` returns `null` when the key does not exist, so check for `null` before parsing.'),
    rw('What is the "stringify before saving, parse after loading" pattern for', ['Turning data into a string to save it, then back into real data when loading', 'Encrypting data when saving it, then decrypting it again when loading it back', 'Compressing the data to make it smaller, then expanding it when loading', 'Copying the data to a second browser tab, then pasting it back later'], '`JSON.stringify` converts data to text for `setItem`; `JSON.parse` turns the text from `getItem` back into an array or object.'),
    rw('Why should you load saved data near the top of your script', ['So saved data shows up as soon as the page loads, not only after a click', 'Because Local Storage can only be read once per page, at the very start', 'Because click handlers are not allowed to read Local Storage at all', 'To make the page load more slowly so the data has time to arrive'], 'Load and render saved data at start-up; otherwise the page looks empty until some event happens.', { prompt: "Why should you load saved data near the top of your script rather than only inside a button's click handler?" }),
    rw('Why is it good practice to wrap `JSON.parse()` in a `try`/`catch`', ['The saved text may be broken, and `JSON.parse` throws an error when it is', '`JSON.parse` is very slow, and wrapping it in `try`/`catch` makes it faster', '`JSON.parse` only works inside a click handler, and `try`/`catch` fixes that', '`try`/`catch` converts the saved text into a string so it can be parsed'], 'Anything read back from storage may be broken or edited by hand. A `try`/`catch` lets the app fall back to an empty list instead of crashing.'),
  ],
  'javascript-interactivity/7': [
    rw('What does `.filter()` return, and does it modify the original array', ['A new array with only the items that pass the test; the original is unchanged', 'The original array itself, changed in place so that only matching items remain', 'Only the first item that passes the test, as a single value', 'A single true or false value saying whether any item passes'], '`.filter()` builds a new array, which makes it a safe way to remove an item from a list without mutating it.', { prompt: 'What does `.filter()` return, and does it change the original array?' }),
  ],
  'javascript-interactivity/8': [
    rw('What does `.every()` return, and how does `checkForWin()` use it', ['A boolean: `true` only if every item passes the test', 'A new array containing the items that pass the test', 'The first item that passes the test, or nothing at all', 'The count of items that pass the test, as a number'], '`.every()` answers "do all of them pass?". A game can use it to check that every card is matched.', { prompt: 'What does the array method `.every()` return?' }),
  ],
});

// ─── React & Full-Stack Web ──────────────────────────────────────────────────
registerMcqRewrites({
  'react-fullstack-web/1': [
    rw('What is the difference between imperative and declarative UI code', ['Imperative code lists the steps to change the screen; declarative code describes the result', 'Imperative code is written with React and declarative code is written without it', 'Declarative code lists every DOM step by hand and imperative code only describes the result', 'They are two names for the same thing: code that updates the screen'], 'React is declarative: you describe the UI for the current state and React works out the DOM updates.'),
  ],
  'react-fullstack-web/2': [
    rw("What is the difference between HTML's `class` attribute and JSX's equivalent", ['In JSX you write `className`, because `class` is reserved in JavaScript', 'In JSX you write `cssClass`, because `class` is reserved in HTML5', 'In JSX you write `htmlClass`, because `class` clashes with a React keyword', 'There is no difference — `class` works exactly the same way inside JSX'], 'JSX is JavaScript, where `class` is reserved, so the attribute is `className`.', { prompt: 'Which attribute does JSX use in place of the HTML `class` attribute?' }),
  ],
  'react-fullstack-web/3': [
    rw('What are the two values returned by `useState`, in order', ['The current state value, then a function that updates it', 'A function that updates the state, then the current value', 'The previous value, then the next value', 'A boolean flag, then a string describing it'], '`const [count, setCount] = useState(0)` — the value first, the setter second.'),
  ],
  'react-fullstack-web/4': [
    rw('What does passing `[]` as the dependency array mean', ['The effect runs once, after the first render', 'The effect runs after every render', 'The effect never runs', 'The effect runs only when the component is removed'], 'An empty dependency array means "no values to watch", so the effect runs a single time when the component first appears.', { prompt: 'What does passing an empty array `[]` as the dependency array of `useEffect` mean?' }),
  ],
  'react-fullstack-web/5': [
    rw("What problem does React Context solve that plain props don't", ['It lets deeply nested components read shared data without prop drilling', 'It makes every component render faster by caching the whole page', 'It removes the need for any state in your components, since values are shared', 'It lets components talk directly to a database without an API'], 'Context avoids "prop drilling": any component under the provider can read the value directly.'),
  ],
  'react-fullstack-web/6': [
    rw("What determines a Next.js App Router route's URL", ['The folders inside `app/` — a folder with a `page` file becomes a route', 'A routes array that you list in a configuration file at the project root', 'The names of the CSS files that sit next to each page component', 'The order of the import statements at the top of the layout file'], 'The App Router is file-system based: folders are URL segments, and `page.tsx` makes a segment visitable.', { prompt: "What determines a Next.js App Router route's URL?" }),
  ],
  'react-fullstack-web/7': [
    rw('What does the `md:` prefix mean on a Tailwind class', ['The class applies from the medium breakpoint upward (a minimum width)', 'The class applies only below the medium breakpoint (a maximum width)', 'The class applies only on devices that have a mouse or a trackpad', 'The class applies only to content that was written in Markdown'], 'Tailwind is mobile-first: unprefixed classes apply everywhere and `md:` classes switch on at medium screens and above.', { prompt: 'What does the `md:` prefix mean on a Tailwind class?' }),
  ],
  'react-fullstack-web/8': [
    rw('What is the practical difference between `npm run dev` and `npm run build`', ['`dev` runs a local server with live reload; `build` makes the production files', '`dev` deploys the app to the internet; `build` starts the local server', '`dev` deletes the old builds; `build` installs the packages the app needs', 'They do the same thing; `build` is just the longer name for `dev`'], 'Use `dev` while you work. Use `build` to produce the files that actually get deployed.'),
  ],
});
