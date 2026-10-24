// FILE PATH: server/src/assessments/bank/course-tests/javascript-interactivity.ts
//
// Web Developer Path → "JavaScript and Interactivity" (8 lessons, 3 projects:
// Interactive To-Do App, Live Weather Dashboard, Memory Card Game).
// Topics: 1 JavaScript fundamentals · 2 the DOM · 3 events · 4 fetch & JSON ·
// 5 async/await · 6 localStorage · 7 a complete app (state + render) ·
// 8 debugging, timers & polish.
//
// JavaScript code answers print primitives or joined strings (never raw arrays
// or objects) so they read the same in every console, and the bank verifier runs
// them in Node. Where a snippet needs a JS template literal, the backticks and
// ${ } are escaped inside the TypeScript template string.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

export const javascriptInteractivity = bank({
  id: 'course-test/javascript-interactivity',
  title: 'JavaScript and Interactivity — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · JavaScript fundamentals ──────────────────────────────────
    mcq(
      1,
      'A program declares `const fuel = 5;` and later runs `fuel = 6;`. What happens?',
      'It throws a TypeError, because a const cannot be reassigned',
      [
        'fuel quietly becomes 6',
        'fuel stays 5 and nothing is reported',
        'The program stops at the first line',
      ],
      'Use const for values that should never be reassigned, and let for values that change.',
    ),
    codeOut(
      1,
      'javascript',
      `let fuel = 100;
fuel = fuel - 4;
const ready = fuel > 80;
console.log(fuel, ready);`,
      '96 true',
      ['100 true', '96 false', '96 80'],
      'fuel becomes 96, and 96 > 80 is the boolean true, which is stored in ready.',
    ),
    codeOut(
      1,
      'javascript',
      `function hoursFlown(distance, speed) {
  if (speed === 0) {
    return 0;
  }
  return distance / speed;
}

console.log(hoursFlown(100, 0), hoursFlown(100, 4));`,
      '0 25',
      ['Infinity 25', '0 400', 'NaN 25'],
      'The guard clause returns 0 early when speed is 0, instead of dividing by zero (which would give Infinity). 100 / 4 = 25.',
    ),
    codeOut(
      1,
      'javascript',
      `const crew = ["Nova", "Orion"];
for (let i = 0; i <= crew.length; i++) {
  console.log(crew[i]);
}`,
      'Nova\nOrion\nundefined',
      ['Nova\nOrion', 'Nova\nOrion\nnull', 'Orion\nundefined'],
      'The condition i <= crew.length is an off-by-one error: on the last pass i is 2, and crew[2] does not exist, so it is undefined. Use i < crew.length.',
      'This loop has a classic bug. What does it print?',
    ),

    // ── Lesson 2 · The DOM ──────────────────────────────────────────────────
    mcq(
      2,
      'What does `document.querySelector(".row")` return if no element matches?',
      '`null`',
      ['`undefined`', 'An empty array', 'It throws an error'],
      'Using the result without checking is why you see errors like "Cannot set properties of null".',
    ),
    mcq(
      2,
      'What is the difference between `.textContent` and `.innerHTML`?',
      '.textContent sets plain text and is safe; .innerHTML parses HTML markup, which is risky with untrusted input',
      [
        '.innerHTML is safe and .textContent is risky',
        'They always produce the same result',
        '.textContent only works on buttons',
      ],
      'Prefer .textContent unless you specifically need to inject HTML.',
    ),
    mcq(
      2,
      'What is the best way to change how an element looks in a way you will reuse?',
      'Define a CSS class and add, remove or toggle it with `classList`',
      [
        'Set `.style` properties everywhere',
        'Rewrite the stylesheet with JavaScript',
        'Use `.innerHTML` to add a style tag',
      ],
      'JavaScript decides which class applies, and CSS decides what that class looks like.',
    ),
    mcq(
      2,
      'You create a new list item with `document.createElement("li")` and fill in its text, but it does not show up on the page. Why?',
      'It exists only in memory until you attach it with something like `appendChild`',
      [
        'Elements created by JavaScript are always hidden',
        'createElement needs the page to be reloaded',
        'It must be given an id first',
      ],
      'Attaching it to an element that is already on the page, such as the <ul>, makes it visible.',
    ),

    // ── Lesson 3 · Events ───────────────────────────────────────────────────
    mcq(
      3,
      "What does `event.preventDefault()` do in a form's submit handler?",
      'Stops the page from reloading, so JavaScript can handle the data itself',
      [
        'Stops the form from existing',
        'Clears the form fields',
        'Makes the submit button faster',
      ],
      'By default a submitted form reloads the page, which would wipe out all of the JavaScript state.',
    ),
    mcq(
      3,
      'What is the difference between the `input` and `change` events on a text field?',
      '`input` fires on every keystroke; `change` fires only when the field loses focus after being changed',
      [
        '`input` fires when the page loads; `change` fires on every click',
        'They are two names for the same event',
        '`change` fires on every keystroke; `input` fires when the field loses focus',
      ],
      'That is why a live preview needs the input event.',
    ),
    mcq(
      3,
      'What is event delegation?',
      'Attaching one listener to a stable parent and using `event.target` to see which child was used',
      [
        'Attaching a separate listener to every child, one by one',
        'Letting the browser choose which event to fire',
        'Removing all of the event listeners from a page',
      ],
      'It also works for items that are added after the page loads, because the parent already exists.',
    ),
    mcq(
      3,
      'A keydown handler checks `event.key === "enter"`, but it never matches the Enter key. Why?',
      'String comparisons are case-sensitive, and the key is "Enter" with a capital E',
      [
        'Enter cannot be detected with keydown',
        'event.key only works for letters',
        'The comparison should use a single =',
      ],
      'JavaScript compares strings exactly.',
    ),

    // ── Lesson 4 · Fetch and JSON ───────────────────────────────────────────
    mcq(
      4,
      'What does `fetch(url)` return immediately?',
      'A Promise, which will settle when the network request finishes',
      [
        'The data from the server',
        'The status code as a number',
        'A copy of the web page',
      ],
      'You then use .then() (or await) to wait for the result.',
    ),
    mcq(
      4,
      'A server replies to a fetch request with a 404 status. What happens to the fetch Promise?',
      'It still resolves — you must check `response.ok` yourself',
      [
        'It rejects, so .catch() runs',
        'It never settles',
        'It turns the 404 into an empty response',
      ],
      'The Promise only rejects on a real network failure. A bad status is still a completed request.',
    ),
    mcq(
      4,
      'Real fetch code often has two `.then()` calls. Why?',
      '`response.json()` also returns a Promise, because parsing the body is asynchronous',
      [
        'The first one is for errors and the second for success',
        'Every Promise needs exactly two handlers',
        'The second one repeats the request',
      ],
      'The first .then() receives the Response "envelope"; the second receives the parsed data.',
    ),
    codeOut(
      4,
      'javascript',
      `const text = '{"city": "Oslo", "temp": 4}';
const data = JSON.parse(text);
console.log(data.city, data.temp + 1);`,
      'Oslo 5',
      ['Oslo 41', 'Oslo 4', 'undefined 5'],
      'JSON.parse turns the string into a real object, so data.temp is the number 4 and 4 + 1 is 5. (Without parsing, text.temp would be undefined.)',
      'What is printed when this code runs?',
    ),

    // ── Lesson 5 · async / await ────────────────────────────────────────────
    mcq(
      5,
      'What does marking a function `async` do?',
      'It makes the function always return a Promise, and lets you use `await` inside it',
      [
        'It makes the function run faster',
        'It makes the function run in a separate window',
        'It removes the need for return',
      ],
      'async/await is syntax sugar built on top of Promises.',
    ),
    mcq(
      5,
      'A developer writes `const data = response.json();` without `await`. What is `data`?',
      'A pending Promise, not the parsed object',
      ['The parsed object', 'undefined', 'The text of the response'],
      'response.json() is asynchronous, so it must be awaited (or followed by .then()).',
    ),
    mcq(
      5,
      'Why is a `finally` block useful around a request that disables a button while it loads?',
      'It runs whether or not there was an error, so the button is always re-enabled',
      [
        'It makes the request faster',
        'It only runs if the request fails',
        'It cancels the request',
      ],
      'Without it, an error could leave the button disabled forever.',
    ),
    codeOut(
      5,
      'javascript',
      `async function two() {
  return 2;
}

console.log(two() instanceof Promise);`,
      'true',
      ['false', '2', 'undefined'],
      'An async function always returns a Promise, even when its body simply returns a number.',
      'What is printed when this code runs?',
    ),

    // ── Lesson 6 · localStorage ─────────────────────────────────────────────
    codeOut(
      6,
      'javascript',
      `const tasks = [{ id: 1, text: "Pack", done: false }];
const saved = JSON.stringify(tasks);
const loaded = JSON.parse(saved);
console.log(typeof saved, loaded[0].text);`,
      'string Pack',
      ['object Pack', 'string undefined', 'array Pack'],
      'localStorage can only store strings, so the array is stringified first. JSON.parse then turns the string back into an array whose first item has the text "Pack".',
      'What is printed when this code runs?',
    ),
    mcq(
      6,
      'What does `localStorage.getItem("tasks")` return when nothing was ever saved under that key?',
      '`null`',
      ['`undefined`', 'An empty string', '`0`'],
      'Checking `=== undefined` would not catch this case.',
    ),
    mcq(
      6,
      'You run `localStorage.setItem("user", { name: "Nova" })` without `JSON.stringify`. What gets stored?',
      'The useless string "[object Object]"',
      [
        'The object, exactly as it is',
        'The string \'{"name":"Nova"}\'',
        'Nothing — an error is thrown',
      ],
      'localStorage turns whatever it is given into a string. Objects become "[object Object]", so stringify before saving.',
    ),
    mcq(
      6,
      'Where does localStorage data live, and who can see it?',
      "On the user's own device, tied to the page's origin (protocol, domain and port)",
      [
        'On the server, visible to every visitor',
        'On a separate database for each tab',
        'In the HTML file itself',
      ],
      "It is never sent to a server by the browser, and different origins cannot read each other's data.",
    ),

    // ── Lesson 7 · A complete interactive app ───────────────────────────────
    mcq(
      7,
      'In the "single source of truth" pattern, what do the add, toggle and delete functions do?',
      'Update the state, save it, and then call one shared `render()` function',
      [
        'Edit the page directly and leave the state alone',
        'Render the page once, then wait for a reload',
        'Delete the render function',
      ],
      'Because the UI is rebuilt from the state every time, it can never drift out of sync.',
    ),
    mcq(
      7,
      'Why give each task a stable `id` instead of identifying it by its array index?',
      'Indexes shift when items are removed or filtered, so they quickly point to the wrong task',
      [
        'Ids make the list shorter',
        'Indexes cannot be used in JavaScript',
        'Ids are required by localStorage',
      ],
      'Even a simple Date.now() is enough to make an id unique.',
    ),
    codeOut(
      7,
      'javascript',
      `const tasks = [
  { id: 1, text: "A", completed: true },
  { id: 2, text: "B", completed: false },
  { id: 3, text: "C", completed: false },
];
const active = tasks.filter((task) => !task.completed);
console.log(active.length, active[0].text);`,
      '2 B',
      ['1 A', '2 A', '3 B'],
      'filter returns a new array holding only the tasks that are not completed: B and C. It has length 2 and its first item is B.',
      'What is printed when this code runs?',
    ),
    codeOut(
      7,
      'javascript',
      `const task = { id: 1, text: "A", completed: false };
const toggled = { ...task, completed: !task.completed };
console.log(task.completed, toggled.completed);`,
      'false true',
      ['true true', 'false false', 'true false'],
      'The spread copies the task into a new object and overrides completed. The original task is not mutated, which avoids bugs with shared references.',
      'What is printed when this code runs?',
    ),

    // ── Lesson 8 · Debugging and polish ─────────────────────────────────────
    mcq(
      8,
      'Why is `array.sort(() => Math.random() - 0.5)` a poor way to shuffle?',
      'It is statistically biased, so some orders come up more often — use the Fisher-Yates shuffle',
      [
        'It changes the length of the array',
        'It only works on numbers',
        'It deletes the first item',
      ],
      'Fisher-Yates walks backwards and swaps each item with a random earlier one, which makes every order equally likely.',
    ),
    mcq(
      8,
      'In the memory game, what does the `isChecking` lock flag prevent?',
      'A third click interfering while a mismatched pair is still being shown',
      [
        'The game from ever finishing',
        'The shuffle from happening',
        'Matching tiles from staying face up',
      ],
      'Without the lock, selectedIds could end up holding more than two ids.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'Modern JavaScript code defaults to `const` and uses `let` only for values that need to change.',
      true,
      'This makes it obvious which values are allowed to change.',
    ),
    tf(
      2,
      '`document.querySelectorAll` returns all of the matching elements as a NodeList that you can loop over.',
      true,
      'It is not a live array: re-query it after adding elements.',
    ),
    tf(
      3,
      '`addEventListener` called on a list item only affects items that already exist at that moment.',
      true,
      'This is why event delegation on the parent is helpful for items added later.',
    ),
    tf(
      4,
      'A 500 Server Error response makes the Promise from `fetch()` reject.',
      false,
      'It only rejects on a genuine network failure. A bad status still resolves, so check response.ok.',
    ),
    tf(
      5,
      'In an ordinary script, using `await` inside a function that is not marked `async` is a SyntaxError.',
      true,
      'await only works inside async functions (the common mistake is forgetting the async keyword).',
    ),
    tf(
      6,
      'Browsers send localStorage data to the server with every request.',
      false,
      "localStorage lives only on the user's device and is not sent anywhere automatically.",
    ),
    tf(
      7,
      'It is good practice to patch individual DOM elements by hand in each of add, toggle and delete, instead of using one render function.',
      false,
      'That leads to the UI and state drifting out of sync. One render() function rebuilds the UI from the state.',
    ),
    tf(
      8,
      '`setTimeout` runs its callback once, after a delay, without freezing the rest of the page.',
      true,
      'setInterval is the repeating version.',
    ),
    tf(
      8,
      '`clearTimeout` can cancel a delayed action before it fires, using the id that `setTimeout` returned.',
      true,
      'This matters if the player triggers a new action before the old one was due.',
    ),
    tf(
      8,
      'In the memory game, it is fine to forget to clear `selectedIds` in the mismatch branch as long as the match branch clears it.',
      false,
      'Forgetting it in either path silently breaks every game after the first pair.',
    ),
  ],
});

// Position 2 of the Web Developer Final Test, position 3 of Odyssey Stage 2 and
// position 6 of the Odyssey Final Test.
export const javascriptInteractivityExtras: ModuleExtras = {
  final: {
    mcq: [
      codeOut(
        1,
        'javascript',
        'const formatHours = (h) => `${h} hours`;\nconsole.log(formatHours(3));',
        '3 hours',
        ['${h} hours', 'h hours', 'formatHours(3)'],
        'The backticks make a template literal, and ${h} is replaced with the value of h.',
      ),
      mcq(
        1,
        'Why is `if (x = 5)` a bug when you meant to compare?',
        'A single = assigns 5 to x instead of comparing; use === to compare',
        [
          '= is not allowed inside an if',
          'It compares x with the string "5"',
          'It compares x with 5 using a looser rule',
        ],
        'Assigning inside a condition accidentally overwrites the variable.',
      ),
      mcq(
        2,
        'A script in the `<head>` without `defer` calls `querySelector("#status")` and gets "Cannot set properties of null". Why?',
        'The elements in the page body do not exist yet when the script runs',
        [
          'The id contains a hash sign',
          'querySelector cannot find ids',
          'The script is missing a semicolon',
        ],
        'Put the script at the end of the body or add defer so the page is built first.',
      ),
      codeOut(
        3,
        'javascript',
        `const input = "  launch  ";
console.log(input.trim().length);`,
        '6',
        ['10', '8', '0'],
        'trim() removes the leading and trailing spaces, leaving "launch", which has 6 characters.',
      ),
      codeOut(
        5,
        'javascript',
        `console.log(encodeURIComponent("New York"));`,
        'New%20York',
        ['New York', 'New+York', 'New_York'],
        'encodeURIComponent escapes characters that are not safe in a URL; a space becomes %20.',
      ),
      mcq(
        6,
        'Why should `JSON.parse()` be wrapped in a `try`/`catch` when loading saved data?',
        'Corrupted stored data would otherwise crash the page when it loads',
        [
          'JSON.parse is very slow',
          'try/catch makes the data encrypted',
          'JSON.parse always throws an error',
        ],
        'A user could edit storage in DevTools, so fail gracefully with a fallback.',
      ),
      mcq(
        7,
        'Why should `saveTasks()` be called after every change to the state?',
        'Otherwise some actions would not survive a page reload',
        [
          'Saving makes render() unnecessary',
          'It makes the tasks load faster',
          'It deletes completed tasks',
        ],
        'If you forget to save after deleting, the deleted task comes back after a reload.',
      ),
      codeOut(
        8,
        'javascript',
        `const SYMBOLS = ["A", "B"];
const copy = [...SYMBOLS];
copy.reverse();
console.log(SYMBOLS.join(""), copy.join(""));`,
        'AB BA',
        ['BA BA', 'AB AB', 'BA AB'],
        'The spread makes a separate copy, so reversing the copy leaves the original SYMBOLS array untouched.',
      ),
    ],
    trueFalse: [
      tf(
        1,
        'An arrow function is a shorter way to write a function expression.',
        true,
        'For example, const greet = () => { } instead of function greet() { }.',
      ),
      tf(
        3,
        'The `change` event fires on every keystroke in a text field.',
        false,
        'That is the input event. change fires when the field loses focus after its value changed.',
      ),
    ],
  },
  stage: {
    mcq: [
      codeOut(
        1,
        'javascript',
        `console.log(typeof "5", typeof 5, typeof true);`,
        'string number boolean',
        [
          'number number boolean',
          'string string boolean',
          'string number string',
        ],
        'Quotes make "5" a string; 5 is a number; true is a boolean.',
      ),
      codeOut(
        1,
        'javascript',
        `if (true) {
  let secret = 7;
}
console.log(typeof secret);`,
        'undefined',
        ['number', 'object', 'string'],
        'let is block-scoped: secret only exists inside the curly braces. Outside them, typeof reports an unknown name as "undefined".',
      ),
      codeOut(
        1,
        'javascript',
        `let n = 3;
let total = 0;
while (n > 0) {
  total += n;
  n--;
}
console.log(total);`,
        '6',
        ['3', '0', '9'],
        'The loop adds 3, then 2, then 1: 3 + 2 + 1 = 6. Decrementing n each time is what lets the loop end.',
      ),
      mcq(
        2,
        'Which method removes an element from the page?',
        '`element.remove()`',
        ['`element.hide()`', '`element.delete()`', '`element.erase()`'],
        'remove() takes the element out of the DOM completely.',
      ),
      mcq(
        2,
        'An element already has the class `done`. What does `element.classList.toggle("done")` do?',
        'It removes the class',
        [
          'It adds a second done class',
          'It does nothing',
          'It removes every class',
        ],
        'toggle adds the class if it is missing and removes it if it is present.',
      ),
      mcq(
        3,
        'Which event fires when the user presses a key on the keyboard?',
        '`keydown`',
        ['`click`', '`submit`', '`resize`'],
        'event.key then tells you which key it was.',
      ),
      mcq(
        3,
        'Why does the lesson move the submit logic into a named function such as `submitCommand()`?',
        'Both the click handler and the Enter-key handler can call the same logic instead of duplicating it',
        [
          'Named functions run faster',
          'addEventListener needs a name',
          'Anonymous functions are forbidden',
        ],
        'Keeping a single copy of the logic makes it easier to change.',
      ),
      mcq(
        4,
        'What is an API "endpoint"?',
        'A specific URL that returns data or performs an action',
        [
          'The last line of a JavaScript file',
          'The end of a loop',
          'A button on a web page',
        ],
        'A web API is used by sending an HTTP request to an endpoint.',
      ),
      codeOut(
        5,
        'javascript',
        `console.log(encodeURIComponent("Zürich & more"));`,
        'Z%C3%BCrich%20%26%20more',
        ['Zürich & more', 'Zürich%20&%20more', 'Z%FCrich+%26+more'],
        'encodeURIComponent escapes spaces (%20), the ampersand (%26) and accented characters (ü becomes %C3%BC) so the city name is safe in a URL.',
      ),
      mcq(
        6,
        'Which call deletes everything stored in localStorage for the origin?',
        '`localStorage.clear()`',
        [
          '`localStorage.removeItem("all")`',
          '`localStorage.delete()`',
          '`localStorage.reset("*")`',
        ],
        'removeItem deletes one key; clear wipes the whole origin.',
      ),
    ],
    trueFalse: [
      tf(
        6,
        '`JSON.parse` turns a JSON string back into a JavaScript value.',
        true,
        'JSON.stringify goes the other way.',
      ),
      tf(
        1,
        'Variables declared with `let` leak out of the block they were declared in, like `var` does.',
        false,
        'let and const are block-scoped, which is why var is rarely used now.',
      ),
      tf(
        8,
        '`setTimeout` schedules code to run once, after a delay.',
        true,
        'The page keeps working while it waits.',
      ),
      tf(
        6,
        '`localStorage` can store an array directly without any conversion.',
        false,
        'localStorage stores only strings, so convert with JSON.stringify first.',
      ),
    ],
  },
  odyssey: {
    mcq: [
      codeOut(
        1,
        'javascript',
        `console.log(10 % 3);`,
        '1',
        ['3', '0', '3.33'],
        '% is the remainder operator: 10 divided by 3 is 3 with 1 left over.',
      ),
      mcq(
        3,
        'Which method attaches a click handler to an element?',
        '`element.addEventListener("click", handler)`',
        [
          '`element.onClickAdd(handler)`',
          '`element.listen(handler, "click")`',
          '`element.attach("click")`',
        ],
        'addEventListener takes the event type and the function to run.',
      ),
      codeOut(
        7,
        'javascript',
        `console.log([1, 2, 3].map((n) => n * 2).join(","));`,
        '2,4,6',
        ['1,2,3', '6', '2,4,6,8'],
        'map builds a new array by applying the function to each item, and join turns it into a string.',
      ),
    ],
    trueFalse: [
      tf(
        7,
        'Date.now() is a simple way to give each new task a unique id.',
        true,
        'A stable unique id is more reliable than an array index.',
      ),
    ],
  },
};
