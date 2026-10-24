// FILE PATH: server/src/assessments/bank/course-tests/react-fullstack-web.ts
//
// Web Developer Path → "React and Full-Stack Web" (8 lessons, 3 projects:
// E-commerce Product Page, Social Media Feed Clone, Full Portfolio React App).
// Topics: 1 why React & components · 2 JSX, props & keys · 3 useState ·
// 4 useEffect & data fetching · 5 forms, validation & Context (the lesson file
// is titled "React Router and multi-page apps" but teaches these) · 6 Next.js ·
// 7 Tailwind CSS · 8 production builds & deploying.
//
// Questions test the ideas (declarative UI, state immutability, effect
// dependencies, file-based routing), not package-manager or build commands.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

export const reactFullstackWeb = bank({
  id: 'course-test/react-fullstack-web',
  title: 'React and Full-Stack Web — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Why React and components ─────────────────────────────────
    mcq(
      1,
      'What is the difference between imperative and declarative UI code?',
      'Imperative code says step by step how to change the DOM; declarative code describes what the screen should look like for the current data',
      [
        'Imperative code is written in JSX and declarative code is not',
        'Declarative code always runs on the server',
        'There is no difference; they are two names for the same style',
      ],
      'In React you describe the result for any given data and React works out how to make the real DOM match it.',
    ),
    mcq(
      1,
      'What is a React component?',
      'A JavaScript function that returns a description of some UI, and can be built from smaller components',
      [
        'A CSS file that styles a page',
        "A database table for the page's data",
        'A browser extension that edits the DOM',
      ],
      'Components can be as small as a button or as large as a page, and they compose like nested HTML elements.',
    ),
    mcq(
      1,
      "What does React's Virtual DOM allow it to do when data changes?",
      'Compare the new description with the old one and apply only the minimal real DOM changes needed',
      [
        'Rebuild the whole page from scratch every time',
        'Skip rendering and keep the old page',
        'Send the data to the server before drawing',
      ],
      'This comparison is called diffing, and it is why React can be both declarative and fast.',
    ),
    mcq(
      1,
      'What does a build tool such as Vite do for a React project?',
      'It compiles the JSX and bundles the component files into code the browser can run',
      [
        "It stores the project's data",
        'It writes the components for you',
        'It replaces the need for JavaScript',
      ],
      'JSX is not understood by browsers directly; the build tool turns it into plain JavaScript.',
    ),

    // ── Lesson 2 · JSX, props and keys ──────────────────────────────────────
    mcq(
      2,
      'Why does JSX use `className` instead of `class`?',
      '`class` is a reserved word in JavaScript',
      [
        'className loads the CSS faster',
        'class is deprecated in HTML',
        'JSX cannot use any HTML attribute',
      ],
      'JSX is JavaScript in disguise, so attribute names that clash with JavaScript keywords change.',
    ),
    mcq(
      2,
      'What can be written inside the curly braces `{ }` in JSX?',
      'A JavaScript expression that produces a value, such as a variable or a function call',
      ['An if statement or a for loop', 'Only plain text', 'Only CSS rules'],
      'Statements such as if and for are not expressions. Use a ternary or .map() instead.',
    ),
    mcq(
      2,
      'In `function CrewCard({ name, status }) { … }`, what are the curly braces in the parameter list doing?',
      'Destructuring the props object, so name and status can be used directly',
      [
        'Creating an empty object',
        'Marking the function as async',
        'Declaring two new components',
      ],
      'React passes one props object, and destructuring avoids writing props.name everywhere.',
    ),
    mcq(
      2,
      'Why does React require a unique, stable `key` on each item rendered with `.map()`?',
      'So it can tell which item is which when the list changes',
      [
        'So the items appear in alphabetical order',
        'So the items can be styled by key',
        'So each item loads its own stylesheet',
      ],
      'Keys let React match old and new items correctly instead of rebuilding or mixing them up.',
    ),

    // ── Lesson 3 · useState ─────────────────────────────────────────────────
    mcq(
      3,
      'What does `const [count, setCount] = useState(0)` give you?',
      'The current value of the state, and a function that changes it, starting at 0',
      [
        'A constant that is always 0',
        'Two copies of the number 0',
        'A function that counts to 0',
      ],
      'Calling the setter tells React that something changed and asks it to re-render.',
    ),
    codeOut(
      3,
      'javascript',
      `const prev = ["a"];
const next = [...prev, "b"];
const sameRef = prev;
sameRef.push("c");
console.log(prev === next, prev === sameRef, prev.length);`,
      'false true 2',
      ['true true 2', 'false false 1', 'false true 1'],
      '[...prev, "b"] creates a brand-new array, so prev === next is false. sameRef points to the very same array as prev, so pushing through it changes prev (length 2) and the two are still identical. This is why calling a setter with the same mutated array does not trigger a re-render.',
      'This code shows the difference between copying and mutating an array. What does it print?',
    ),
    mcq(
      3,
      'What goes wrong with `onClick={setCount(count + 1)}`?',
      'It runs while the component renders, not on a click, causing "Too many re-renders"',
      [
        'It never runs',
        'It only runs on a double-click',
        'It works exactly like the arrow-function version',
      ],
      'Wrap it in an arrow function, `onClick={() => setCount(count + 1)}`, so it runs only when the click happens.',
    ),
    mcq(
      3,
      'How should you add an item to an array that is held in state?',
      '`setItems([...items, newItem])`, which gives React a new array',
      [
        '`items.push(newItem)`',
        '`items[items.length] = newItem`',
        '`setItems(items)`',
      ],
      'Never mutate state. React needs a new array or object reference to notice a change.',
    ),

    // ── Lesson 4 · useEffect and fetching ───────────────────────────────────
    mcq(
      4,
      'What does an empty dependency array, `useEffect(fn, [])`, mean?',
      'Run the effect once, right after the first render, and never again',
      [
        'Run the effect on every render',
        'Never run the effect',
        'Run the effect only when the page is closed',
      ],
      'It is perfect for a one-time fetch when a component first appears.',
    ),
    mcq(
      4,
      'A component fetches data inside `useEffect` but the dependency array is left out completely. What happens?',
      'The effect re-runs after every render; because the fetch sets state, it can loop endlessly',
      [
        'The fetch only runs once',
        'The fetch never runs',
        'React shows a cached copy forever',
      ],
      'Setting state triggers a render, which re-runs the effect, which fetches again…',
    ),
    mcq(
      4,
      'Why is `loading` initialised to `true` in the loading / error / success pattern?',
      'A fetch is already in flight from the very first render',
      [
        'True is the default for every state variable',
        'React requires booleans to start as true',
        'So the data is never shown',
      ],
      'The component renders before the data arrives, so it must start in the loading state.',
    ),
    mcq(
      4,
      "Why can't the function passed to `useEffect` itself be `async`?",
      'It must return nothing or a cleanup function, not a Promise; define an inner async function and call it',
      [
        'async functions cannot call fetch',
        'Effects only run on the server',
        'React cannot read the dependency array',
      ],
      'An async function always returns a Promise, which clashes with what useEffect expects.',
    ),

    // ── Lesson 5 · Forms and Context ────────────────────────────────────────
    mcq(
      5,
      "What does `e.preventDefault()` do inside a form's `onSubmit` handler in React?",
      "Stops the browser's default full-page reload so JavaScript can handle the submission",
      [
        'Blocks the user from typing',
        'Deletes the form data',
        'Makes the submit button faster',
      ],
      'Without it, the page reloads and all component state is lost.',
    ),
    mcq(
      5,
      'What is a "controlled" form field?',
      'An input whose value comes from state and is updated by an `onChange` handler',
      [
        'An input that cannot be edited',
        'An input that is validated by the server',
        'An input without a label',
      ],
      'Each field has one piece of state, so React is always in control of what the field shows.',
    ),
    mcq(
      5,
      'What is "prop drilling"?',
      'Passing data through many layers of components that do not need it, just to reach a deep child',
      [
        'Passing the same prop to every child at once',
        'Deleting props that are unused',
        'Reading props from the server',
      ],
      'It becomes painful as the tree grows, which is what Context is for.',
    ),
    mcq(
      5,
      'A component calls `useContext(CartContext)` but is not rendered inside `<CartProvider>`. What does it get?',
      'The default value given to `createContext` (null in the lesson), so destructuring it crashes',
      [
        'The latest cart items anyway',
        'An empty array',
        "A copy of the nearest parent's props",
      ],
      'Always check that the provider wraps every consumer.',
    ),

    // ── Lesson 6 · Next.js ──────────────────────────────────────────────────
    mcq(
      6,
      'In the Next.js App Router, which file provides the content of the route `/about`?',
      '`app/about/page.js`',
      ['`app/about.js`', '`routes/about.js`', '`app/about/index.css`'],
      "The folder structure of the app/ directory is the URL structure, and each page.js default-exports the route's component.",
    ),
    mcq(
      6,
      "Why use Next.js's `<Link>` component instead of a plain `<a>` tag for internal navigation?",
      'It swaps content on the client without a full page reload',
      [
        'It makes the link blue',
        'It hides the URL',
        'It works on external sites only',
      ],
      'A plain <a> works, but it reloads the whole page from the server on every click.',
    ),
    mcq(
      6,
      'Which file makes `/projects/mars` available with `params.slug` equal to `"mars"`?',
      '`app/projects/[slug]/page.js`',
      [
        '`app/projects/slug/page.js`',
        '`app/projects/{slug}/page.js`',
        '`app/projects/page.js`',
      ],
      'The square brackets make the folder a dynamic segment, and the folder name is the key on params.',
    ),
    mcq(
      6,
      'A page file uses `useState` and Next.js reports an error about client components. What fixes it?',
      'Add `"use client"` as the very first line of the file',
      [
        'Rename the file to page.html',
        'Move the file into a folder named client',
        'Delete the useState call',
      ],
      'Hooks only work in Client Components. Server Components are the default in the App Router.',
    ),

    // ── Lesson 7 · Tailwind CSS ─────────────────────────────────────────────
    mcq(
      7,
      'What does the Tailwind class `p-4` do?',
      'Adds padding of 1rem',
      [
        'Positions the element',
        'Sets a paragraph font',
        'Makes the element 4 pixels wide',
      ],
      'p-* is padding and m-* is margin, with a consistent scale of numbers.',
    ),
    mcq(
      7,
      'What does `md:flex-row` mean?',
      'Use a row layout from the medium breakpoint (768px) upwards',
      [
        'Use a row layout only on phones',
        'Use a row layout only on exactly 768px screens',
        'Hide the element on medium screens',
      ],
      'Prefixes like sm:, md: and lg: apply at that width and above, so base styles are written for mobile first.',
    ),
    mcq(
      7,
      'What is the "utility-first" approach to CSS?',
      'Composing small, single-purpose classes directly in the markup',
      [
        'Writing one large stylesheet for the whole app',
        'Writing CSS inside the database',
        'Using only inline style attributes',
      ],
      'Each class does one thing, so reading the class list shows you exactly what is happening visually.',
    ),
    mcq(
      7,
      'The same long string of Tailwind classes appears on many buttons. What does the lesson recommend?',
      'Extract it into a reusable component, such as a Button',
      [
        'Shorten the class names',
        'Copy it everywhere',
        'Move it into an inline style',
      ],
      'Extract once a class string repeats three or more times.',
    ),

    // ── Lesson 8 · Production builds and deploying ──────────────────────────
    mcq(
      8,
      'Why run a production build before you call a project "done"?',
      'It bundles and minifies the code, and reveals errors that dev mode silently tolerated',
      [
        'It makes the code easier to read',
        'It adds new features',
        'It deletes the development files',
      ],
      'A project that works in development can still fail to build, and a failed build cannot be deployed.',
    ),
    mcq(
      8,
      'The build succeeds but the deployed site is a blank page. What is a very common cause?',
      "A private setting that exists only on your own computer (such as an API key) is missing from the hosting platform's settings",
      [
        'The site has too many components',
        'The browser is out of date',
        'The CSS file is too short',
      ],
      "Local-only configuration does not travel with the code. Add it to the hosting platform's settings.",
    ),
  ],
  trueFalse: [
    tf(
      1,
      'In a declarative model, you tell React exactly how to find and mutate each element in the DOM.',
      false,
      'You describe what the screen should look like, and React works out how to update the DOM.',
    ),
    tf(
      2,
      'A component is allowed to reassign its own props.',
      false,
      'Props are read-only. If something needs to change over time, that is the job of state.',
    ),
    tf(
      3,
      'Writing `count = count + 1` inside a component updates the screen, as long as the page is refreshed afterwards.',
      false,
      'React cannot see a direct change to a variable. You must call the setter, such as setCount, to trigger a re-render.',
    ),
    tf(
      4,
      'Passing `[]` as the dependency array makes an effect run once, after the first render.',
      true,
      'A list of values instead makes it re-run whenever one of them changes.',
    ),
    tf(
      5,
      'Context lets components share data without passing props through every level of the tree.',
      true,
      'A Provider supplies the value and any component below it can read it with useContext.',
    ),
    tf(
      6,
      "Every `page.js` file must default-export a component, or Next.js cannot find the route's content.",
      true,
      'Forgetting `export default` is a common mistake.',
    ),
    tf(
      7,
      'The class `hover:bg-indigo-500` changes the background colour only while the element is hovered.',
      true,
      'Prefixes such as hover: and focus: apply a utility only in that state.',
    ),
    tf(
      8,
      'If a project works with the development server, its production build will always work too.',
      false,
      'Dev mode tolerates some mistakes, such as a missing "use client", that a production build rejects.',
    ),
    tf(
      8,
      '"Module not found" can appear on a hosting server when the case of an import path does not match the real file name.',
      true,
      'Some servers are case-sensitive even if your own computer is not.',
    ),
    tf(
      8,
      'A production build keeps all of the development-only warnings and error overlays.',
      false,
      'Production builds strip them out to produce the smallest, fastest version of the app.',
    ),
  ],
});

// Position 3 of the Web Developer Final Test (React is not part of the Odyssey,
// so it has no stage or Odyssey share).
export const reactFullstackWebExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'Why can imperative DOM code drift out of sync with the data in a large app?',
        'Many separate update statements each have to remember to change the DOM',
        [
          'The DOM cannot be changed by JavaScript',
          'Imperative code runs only once',
          'The browser caches every change',
        ],
        'Declarative code avoids this by describing the whole screen from the current data.',
      ),
      mcq(
        2,
        'A component needs to return two sibling elements. What can wrap them without adding an extra element to the page?',
        'A Fragment, written `<>…</>`',
        [
          'A second return statement',
          'A <fragment> tag in HTML',
          'An array of strings',
        ],
        'A component must return exactly one root, and a Fragment is an empty wrapper.',
      ),
      mcq(
        2,
        'Which JSX line is valid?',
        '`<img src="a.png" alt="" />`',
        [
          '`<img src="a.png" alt="">`',
          '`<img class="x">`',
          '`<img src=a.png />`',
        ],
        'Every tag must be closed in JSX, including void elements like <img>, and attributes need quotes or braces.',
      ),
      mcq(
        3,
        'State seems to be "one step behind" after rapid clicks. What is the fix?',
        'Use the updater form: `setCount(prev => prev + 1)`',
        [
          'Call setCount twice',
          'Use a global variable instead',
          'Refresh the page after every click',
        ],
        'The updater form always receives the latest value.',
      ),
      mcq(
        4,
        'Which part of a fetch chain makes sure the loading flag is turned off whether the request succeeds or fails?',
        '`.finally(() => setLoading(false))`',
        [
          '`.then(() => setLoading(true))`',
          '`.catch(() => setLoading(true))`',
          '`.json()`',
        ],
        'Without it, a failed request can leave the page stuck on "Loading…".',
      ),
      mcq(
        5,
        "When does the lesson's form run its validation?",
        'On submit, inside `handleSubmit`',
        [
          'On every key press',
          'Only when the page loads',
          'Only on the server',
        ],
        'Validating only on submit is friendlier for beginners. More advanced apps also validate on blur.',
      ),
      mcq(
        6,
        'In the Next.js App Router, what kind of component is a page by default?',
        'A Server Component',
        ['A Client Component', 'A Redux component', 'A Web Worker'],
        'Add "use client" only when a file needs hooks or browser-only features.',
      ),
      mcq(
        7,
        'What does `className="flex flex-col md:flex-row"` do?',
        'Stacks the children in a column on small screens, and puts them in a row from the md breakpoint up',
        [
          'Puts the children in a row on small screens, and a column on larger screens',
          'Hides the element on small screens',
          'Applies two different layouts at the same time',
        ],
        'Unprefixed utilities are the mobile-first base; md: adds an override for wider screens.',
      ),
    ],
    trueFalse: [
      tf(
        2,
        'When items can be removed or reordered, a key should be a stable unique id rather than the array index.',
        true,
        'Using the index breaks as soon as items move, because the same key then points to a different item.',
      ),
    ],
  },
};
