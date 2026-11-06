// FILE PATH: server/src/curriculum/lesson-content/catalog/web-developer.ts
//
// Visuals for the Web Developer pathway (lineage keys "<module-slug>/<position>").
// The CSS and layout playgrounds only ever apply values from fixed lists, and the
// HTML shown in diagrams is always text — never rendered markup.

import { registerVisualCatalog, type CatalogSource } from '../visual-catalog';
import { V, cards, checklist, flow, sequence, table, trace, tree, walkthrough } from './helpers';

const CE = 'Concept Explanation';

const source: CatalogSource = {
  // ── HTML and CSS Mastery ─────────────────────────────────────────────────
  'html-css-mastery/1': [
    sequence('request-response', CE, 'A sequence diagram: the browser sends a request for a web address to the server, the server sends back HTML, and the browser reads it and draws the page.', 'Every page starts as a request and a response.', [['browser', 'Browser'], ['server', 'Web server']], [
      { from: 'browser', to: 'server', label: 'GET /index.html', note: 'you typed a web address' },
      { from: 'server', to: 'browser', label: '200 OK + HTML', note: 'the page’s text and structure', dashed: true },
      { from: 'browser', to: 'browser', label: 'Read the HTML and draw the page', note: 'it then asks for CSS, images…' },
    ]),
  ],
  'html-css-mastery/2': [
    V('mockup', 'semantic-layout', CE, 'A page wireframe labelled with semantic HTML elements: header at the top, nav for the menu, main for the content with a section and an aside, and footer at the bottom.', 'Each region of a page has a semantic element.', {
      kind: 'page',
      sections: [
        { label: '<header>', text: 'Logo and site title', callout: 'The introduction or top of the page.' },
        { label: '<nav>', text: 'Home · About · Projects', callout: 'The main links.' },
        { label: '<main>', text: 'The page’s unique content', callout: 'Only one <main> per page.' },
        { label: '<aside>', text: 'Related extras', callout: 'Side content that is related, not essential.' },
        { label: '<footer>', text: 'Copyright · Contact', callout: 'The end of the page or section.' },
      ],
    }, { at: 'end' }),
    tree('html-skeleton', CE, 'A tree of an HTML document: html contains head, with a title and meta tags, and body, with a header, main and footer.', 'HTML is a tree of nested elements.', {
      label: '<html>', children: [
        { label: '<head>', note: 'invisible settings', children: [{ label: '<title>' }, { label: '<meta>' }] },
        { label: '<body>', note: 'what people see', children: [{ label: '<header>' }, { label: '<main>' }, { label: '<footer>' }] },
      ],
    }, { at: 'end' }),
  ],
  'html-css-mastery/3': [
    V('box-model', 'box-model', CE, 'An interactive CSS box model: sliders change the margin, border and padding around a box and show the total width on screen.', 'Every element is a box: content, padding, border, margin.', {}, { at: 'end' }),
  ],
  'html-css-mastery/4': [
    V('css-layout', 'flex-playground', CE, 'A Flexbox playground: choose flex-direction, justify-content, align-items and wrap, and see five boxes rearrange with the matching CSS.', 'Change the properties and watch the boxes move.', { mode: 'flex', items: 5 }, { at: 'end' }),
  ],
  'html-css-mastery/5': [
    V('css-layout', 'grid-playground', CE, 'A CSS Grid playground: choose the grid-template-columns and the gap, and see six boxes fill the grid with the matching CSS.', 'Change the columns and the gap.', { mode: 'grid', items: 6, gap: 10 }, { at: 'end' }),
  ],
  'html-css-mastery/6': [
    V('viewport', 'responsive-preview', CE, 'A responsive preview: drag the screen width and watch a menu collapse and the number of columns change at the breakpoints, with the matching media queries.', 'Mobile-first: start small, add columns as the screen grows.', {
      breakpoints: [{ min: 0, label: 'Phone', columns: 1 }, { min: 600, label: 'Tablet', columns: 2 }, { min: 900, label: 'Desktop', columns: 3 }],
    }, { at: 'end' }),
  ],
  'html-css-mastery/7': [
    cards('transition-vs-animation', CE, 'Two cards comparing a CSS transition, which smoothly changes between two states when something like a hover happens, with a keyframe animation, which runs by itself through many steps.', 'Transition: from A to B on an event. Animation: a script of steps.', [
      { title: 'transition', badge: 'Two states', tone: 'info', bullets: ['Smoothly changes A → B', 'Needs a trigger such as :hover', 'transition: transform 0.3s;'] },
      { title: '@keyframes animation', badge: 'Many steps', tone: 'accent', bullets: ['Runs by itself, as many steps as you like', 'Can loop', 'animation: bounce 1s infinite;'] },
    ]),
  ],
  'html-css-mastery/8': [
    flow('vercel-deploy', CE, 'The Vercel deployment path: push your code to GitHub, import the repository in Vercel, Vercel builds it, you get a live address, and every new push redeploys.', 'Push to GitHub and Vercel does the rest.', ['Push to GitHub|your code, online', 'Import in Vercel|choose the repository', 'Vercel builds it|a few seconds', 'Live URL|share it', 'Push again|it redeploys itself'], { perRow: 5 }),
  ],

  // ── JavaScript and Interactivity ─────────────────────────────────────────
  'javascript-interactivity/1': [
    trace('js-function-trace', CE, 'Step through a JavaScript function that adds two numbers, watching the call, the return value and the variable it is stored in.', 'A function takes inputs, returns an output.', ['function add(a, b) {', '  return a + b;', '}', 'let total = add(2, 3);', 'console.log(total);'], [
      { line: 4, vars: {}, note: 'add(2, 3) is called: a becomes 2, b becomes 3.' },
      { line: 2, vars: { a: 2, b: 3 }, note: 'The function works out 2 + 3 and returns 5.' },
      { line: 4, vars: { total: 5 }, note: 'The returned 5 is stored in total.' },
      { line: 5, vars: { total: 5 }, output: '5', note: 'console.log shows it.' },
    ]),
  ],
  'javascript-interactivity/2': [
    tree('dom-tree', CE, 'The DOM as a tree: the document contains html, then body, which contains a heading with the id title and a list whose two items can be selected and changed.', 'JavaScript can select any node in the tree and change it.', {
      label: 'document', children: [{ label: 'html', children: [{ label: 'body', children: [{ label: '<h1 id="title">', note: 'querySelector("#title")', tone: 'accent' }, { label: '<ul id="list">', children: [{ label: '<li>' }, { label: '<li>' }] }] }] }],
    }),
  ],
  'javascript-interactivity/3': [
    sequence('click-event', CE, 'A sequence diagram: the user clicks a button, the browser fires a click event, your handler function runs, and it changes the page.', 'You register a listener; the browser calls it when the event happens.', [['user', 'User'], ['browser', 'Browser'], ['code', 'Your handler']], [
      { from: 'user', to: 'browser', label: 'click' },
      { from: 'browser', to: 'code', label: 'click event', note: 'addEventListener("click", handler)' },
      { from: 'code', to: 'browser', label: 'change the page', note: 'e.g. update textContent', dashed: true },
    ]),
  ],
  'javascript-interactivity/4': [
    sequence('fetch-flow', CE, 'A sequence diagram: your page uses fetch to request data from an API, the server sends back JSON, and your code turns it into something on the page.', 'fetch asks; the server answers with data.', [['page', 'Your page (JavaScript)'], ['api', 'API server']], [
      { from: 'page', to: 'api', label: 'fetch(url)', note: 'a GET request' },
      { from: 'api', to: 'page', label: 'Response (JSON)', note: '{ "name": "…", … }', dashed: true },
      { from: 'page', to: 'page', label: 'response.json() then update the page' },
    ]),
  ],
  'javascript-interactivity/5': [
    flow('promise-states', CE, 'The three states of a promise: it starts pending, then either becomes fulfilled with a value or rejected with an error.', 'await waits for a promise to settle.', ['Pending|still waiting', 'Fulfilled|has a value (await gives it to you)', 'Rejected|has an error (catch it with try/catch)'], { edges: [{ from: 0, to: 1, label: 'success' }, { from: 0, to: 2, label: 'error' }], perRow: 3 }),
  ],
  'javascript-interactivity/6': [
    table('localstorage-methods', CE, 'A table of the localStorage methods: setItem saves a value, getItem reads it, removeItem deletes one, and clear deletes everything; values are stored as text.', 'Values are text, so objects need JSON.stringify and JSON.parse.', ['Method', 'What it does'], [['localStorage.setItem("key", "value")', 'save a value (as text)'], ['localStorage.getItem("key")', 'read it back (null if missing)'], ['localStorage.removeItem("key")', 'delete one item'], ['localStorage.clear()', 'delete everything']]),
  ],
  'javascript-interactivity/7': [
    flow('state-render', CE, 'The state and render loop of an interactive app: the app keeps its data in state, a render function draws the page from the state, the user does something, an event handler updates the state, and render runs again.', 'Change the data, then redraw from the data.', ['State|the app’s data', 'render()|draw the page from state', 'User acts|click, type', 'Handler updates state|then render() again'], { layout: 'cycle' }),
  ],
  'javascript-interactivity/8': [
    walkthrough('devtools-steps', CE, 'A step-by-step guide to debugging with browser DevTools: open them, read the console error, set a breakpoint, inspect variables, then fix and reload.', 'A calm routine beats guessing.', [
      { title: 'Open DevTools', text: 'Press **F12** (or right-click the page and choose **Inspect**).' },
      { title: 'Read the Console', text: 'Errors show a message plus the **file and line number**. Start at the first error.' },
      { title: 'Pause with a breakpoint', text: 'In the **Sources** tab click a line number. The code stops there when it runs.' },
      { title: 'Inspect the variables', text: 'While paused, look at the values in **Scope** — is each one what you expected?' },
      { title: 'Fix one thing, then reload', text: 'Change one thing at a time so you know what fixed it.' },
    ], { at: 'end' }),
  ],

  // ── React and Full-Stack Web ─────────────────────────────────────────────
  'react-fullstack-web/1': [
    tree('component-tree', CE, 'A component tree: an App component contains a Header, a ProductList with two ProductCards, and a Footer.', 'A React app is a tree of small components.', {
      label: '<App />', children: [{ label: '<Header />' }, { label: '<ProductList />', children: [{ label: '<ProductCard />' }, { label: '<ProductCard />' }] }, { label: '<Footer />' }],
    }),
  ],
  'react-fullstack-web/2': [
    tree('props-flow', CE, 'A component tree showing props flowing downward: the App holds a user and passes it as a prop to the Header and the Profile.', 'Props flow one way: from parent to child.', {
      label: '<App />', note: 'has the user data', tone: 'accent', children: [{ label: '<Header user={user} />', note: 'receives a prop', tone: 'info' }, { label: '<Profile user={user} />', note: 'receives a prop', tone: 'info', children: [{ label: '<Avatar src={user.photo} />', note: 'passed down again', tone: 'good' }] }],
    }),
  ],
  'react-fullstack-web/3': [
    flow('usestate-cycle', CE, 'The useState cycle: the user clicks, the click handler calls setCount, React re-renders the component with the new value, and the screen shows the new count.', 'Changing state makes React redraw.', ['User clicks|onClick handler runs', 'setCount(count + 1)|ask React to change state', 'React re-renders|calls your component again', 'Screen updates|shows the new count'], { layout: 'cycle' }),
  ],
  'react-fullstack-web/4': [
    sequence('useeffect-fetch', CE, 'A sequence diagram: the component renders first with empty data, then useEffect runs and fetches from the API, the data is saved in state, and the component renders again with the data.', 'Render first, fetch after, render again.', [['comp', 'Component'], ['react', 'React'], ['api', 'API']], [
      { from: 'react', to: 'comp', label: '1. render', note: 'data is still empty' },
      { from: 'comp', to: 'api', label: '2. useEffect → fetch()' },
      { from: 'api', to: 'comp', label: '3. data arrives → setState', dashed: true },
      { from: 'react', to: 'comp', label: '4. render again', note: 'now with data' },
    ]),
  ],
  'react-fullstack-web/5': [
    table('routes-table', CE, 'A table mapping web addresses to React components: the root path shows Home, /about shows About, and /projects/:id shows a ProjectDetail for any id.', 'The router picks which component to show from the address.', ['Address', 'Component shown'], [['/', '<Home />'], ['/about', '<About />'], ['/projects/:id', '<ProjectDetail />   (:id can be 1, 2, 3 …)']]),
  ],
  'react-fullstack-web/6': [
    cards('csr-vs-ssr', CE, 'Two cards comparing client-side rendering, where the browser receives an almost empty page and builds it with JavaScript, with server-side rendering, where the server sends finished HTML first.', 'Where the HTML gets built.', [
      { title: 'Client-side rendering', badge: 'Browser builds it', tone: 'info', bullets: ['Browser gets a near-empty page + JavaScript', 'Content appears after the JavaScript runs'] },
      { title: 'Server-side rendering', badge: 'Server builds it', tone: 'good', bullets: ['Server sends finished HTML', 'Content is visible straight away; JavaScript then makes it interactive'] },
    ]),
  ],
  'react-fullstack-web/7': [
    table('tailwind-classes', CE, 'A table showing common Tailwind utility classes next to the plain CSS they stand for.', 'A utility class is a one-property CSS rule with a short name.', ['Tailwind class', 'Plain CSS'], [['p-4', 'padding: 1rem;'], ['text-center', 'text-align: center;'], ['flex', 'display: flex;'], ['rounded-lg', 'border-radius: 0.5rem;'], ['bg-blue-500', 'background-color: #3b82f6;']]),
  ],
  'react-fullstack-web/8': [
    checklist('deploy-checklist', CE, 'A checklist to complete before deploying a final React or Next.js project to Vercel.', 'Tick these off before you deploy. Saved on this device.', ['`npm run build` passes on your computer', 'No secrets or API keys are in the repository', 'Environment variables are added in Vercel’s settings', 'The README says what the project is and how to run it', 'You tested the live link on your phone', 'You have a screenshot ready for your portfolio'], { title: 'Ready to deploy?', at: 'end' }),
  ],
};

registerVisualCatalog(source);
