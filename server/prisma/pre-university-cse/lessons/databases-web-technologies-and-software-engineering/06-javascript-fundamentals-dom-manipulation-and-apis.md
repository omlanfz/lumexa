# Lumexa Mission Log: Databases, Web Technologies & Software Engineering

**Course/Path:** Databases, Web Technologies & Software Engineering
**Lesson:** 06 of 08
**Title:** JavaScript Fundamentals, DOM Manipulation and APIs
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** JavaScript

---

## Mission Brief

The student directory of the last lesson looks fine, but it is a photograph: the search box does nothing and the table can never change. A page that reacts, that filters as you type, validates a form and updates itself without reloading, needs a programming language that runs *inside the browser*. That language is **JavaScript**, the only language that every browser understands, and one of the most widely used in the world.

In this lesson you learn the parts of JavaScript that you need for a first interactive page: values and functions, arrays and objects, the **DOM** (how a script reads and changes the page), **events** (how it reacts to the user), and **APIs and JSON** (how it asks a server for data). You make the student directory **interactive**: it filters by name and grade, shows a count, and adds a new student after validating the form. You will also separate the *logic* from the *display*, so that the logic can be tested without a browser.

## Learning Objectives

1. Write JavaScript with `let`, `const`, functions, arrow functions, conditions, loops, arrays and objects.
2. Use the array methods `filter`, `map`, `find`, `sort` and `reduce` to process data.
3. Select and change elements with the DOM (`querySelector`, `textContent`, `createElement`) and react to events (`addEventListener`).
4. Explain what an API is, read and write JSON, and use `fetch` with `async` and `await` (including handling a failed request).
5. Separate the logic of an application from its display, and explain why `textContent` is safer than `innerHTML`.
6. Make the student directory interactive: render from data, filter, count and add a validated student.

## Prerequisites

- Lesson 5: HTML structure, the student directory page and CSS.
- Programming from Courses 1 to 4: variables, conditions, loops, functions, arrays and dictionaries (JavaScript objects are like dictionaries).
- Lesson 3 of the SQL part: the student data (names, grade levels, e-mails) that the script will handle.

## Concept Explanation

### JavaScript in the browser

A script is added to a page with the `<script>` element, best placed at the end of the `body` so that the elements it uses already exist. The browser runs it in a sandbox: the script can change the page but cannot read your files. `console.log(...)` writes to the **console** of the developer tools, the first place to look when something does not work. The same language also runs outside the browser in **Node.js**, which we use in this lesson to test the logic.

The basics will look familiar. Variables are declared with `let` (can change) and `const` (cannot be reassigned; prefer it). The main types are numbers, strings, booleans, `null` and `undefined`, **arrays** (`[1, 2, 3]`) and **objects** (`{ name: "Ayesha", grade: 10 }`, key-value pairs like Python dictionaries). Text can be built with **template literals** (`` `Showing ${n} students` ``). Compare with `===` and `!==` (strict, no type conversion); the loose `==` converts types in surprising ways and should be avoided. Functions are written as `function name(a, b) { ... }` or as **arrow functions** `(a, b) => a + b`. Loops are `for (const item of list)` and `while`. Errors are handled with `try { ... } catch (error) { ... }`.

JavaScript is at its best with arrays. The methods `filter` (keep the items that pass a test), `map` (transform each item), `find` (the first item that passes), `sort` (reorder, with a compare function), `reduce` (combine all items into one value) and `forEach` (do something for each) take a function as an argument. `students.filter((s) => s.grade === 10).map((s) => s.name)` reads like the SQL `SELECT name WHERE grade_level = 10`.

### The DOM and events

The page is a tree, the **DOM** (Lesson 5), and JavaScript can read and change it. `document.querySelector("#list")` finds the first element that matches a CSS selector (`querySelectorAll` finds all); `element.textContent = "..."` sets its text; `document.createElement("li")` makes a new element, `list.append(item)` adds it and `list.replaceChildren()` empties it; `input.value` reads what the user typed; `element.classList.add("error")` changes its CSS class. An **event** is something that happens: a click, a key press, typing in a field (`input`), a form being submitted (`submit`). You attach a function to it with `element.addEventListener("input", handler)`. A form's `submit` event normally reloads the page, so a handler calls `event.preventDefault()` first.

Interactive pages follow one simple pattern: keep the **data** in a variable (an array of students), write one function `render()` that rebuilds the part of the page from the data, and call `render()` at the start and after every change. The event handlers only change the data (or the filter text) and call `render()`. This is far less error-prone than patching the page piece by piece.

A security rule belongs here: when you put text that a user typed into the page, use `textContent`, not `innerHTML`. With `innerHTML`, a "name" such as `<img src=x onerror=...>` would be run as HTML and could steal data (this attack is called *cross-site scripting*, XSS). `textContent` treats the text as plain text and is always safe.

### APIs and JSON

An **API** (application programming interface) is a way for one program to ask another for something. A **web API** answers HTTP requests at addresses such as `/api/students`, usually with data in **JSON** (JavaScript object notation), a text format for objects and arrays: `[{"id":1,"name":"Ayesha Rahman","grade":10}]`. `JSON.stringify(object)` turns data into JSON text and `JSON.parse(text)` turns text back into data. In the browser, `fetch(url)` sends the request and returns a **promise**, a value that will be available later; with `async` and `await` the code reads from top to bottom:

`const response = await fetch("/api/students"); if (!response.ok) throw new Error(...); const students = await response.json();`

A failed request (no network, status 404 or 500) must be handled with `try/catch` and a message to the user. In a complete application, the server behind `/api/students` would run the SQL query of Lesson 3 and send the rows as JSON; the page would never touch the database directly, which is both safer and easier to change. In this lesson the data are in an array in the page, and a function that pretends to be the server shows the pattern.

### Separating logic from display

Code that decides things (which students match the filter, whether a form is valid) should not depend on the page. Write it as **pure functions**: they take data in and return data out, with no `document` inside. They can then be tested in a few lines in Node, without a browser, and the DOM code stays short. In the next lesson you will see how much easier testing becomes with this habit.

## Key Vocabulary

| Term | Definition |
|---|---|
| **JavaScript** | The programming language of the web, which runs in every browser (and in Node.js). |
| **const / let** | Declare a variable that cannot be reassigned / one that can. |
| **Arrow function** | A short way to write a function: `(a, b) => a + b`. |
| **Array method** | A method such as `filter`, `map`, `find`, `sort` or `reduce` that takes a function. |
| **DOM manipulation** | Reading and changing the page tree with a script. |
| **Event / listener** | Something that happens in the page, such as a click / a function that runs when it does. |
| **Pure function** | A function that only uses its inputs and returns a result, without side effects. |
| **API** | A way for a program to ask another program for data or services. |
| **JSON** | A text format for objects and arrays, used by most web APIs. |
| **Promise, async/await** | A value that arrives later / the syntax that waits for it in readable order. |
| **XSS** | Cross-site scripting: an attack that makes a page run a script that an attacker typed. |

## Worked Examples

### Example 1: Data, functions and array methods

```javascript
const students = [
  { id: 1, name: "Ayesha Rahman", grade: 10, scores: [92, 85, 78] },
  { id: 2, name: "Tanvir Ahmed", grade: 10, scores: [67, 88] },
  { id: 3, name: "Sadia Islam", grade: 9, scores: [74, 91] },
  { id: 4, name: "Nabil Hasan", grade: 11, scores: [55, 69, 72] },
  { id: 5, name: "Mim Akter", grade: 10, scores: [88, 93, 81] },
  { id: 6, name: "Rafi Karim", grade: 12, scores: [45, 60] },
  { id: 7, name: "Tasnim Noor", grade: 9, scores: [66, 95] },
  { id: 8, name: "Fahim Sarker", grade: 11, scores: [] },
];

const average = (numbers) => (numbers.length === 0 ? null : numbers.reduce((sum, n) => sum + n, 0) / numbers.length);

const grade10 = students.filter((s) => s.grade === 10).map((s) => s.name);
console.log("grade 10:", grade10.join(", "));

const ranked = students
  .filter((s) => s.scores.length > 0)
  .map((s) => ({ name: s.name, average: Math.round(average(s.scores) * 10) / 10 }))
  .sort((a, b) => b.average - a.average);
console.log("best three:");
for (const { name, average: value } of ranked.slice(0, 3)) {
  console.log(`  ${name}: ${value}`);
}

const nobody = students.find((s) => s.scores.length === 0);
console.log("no scores yet:", nobody ? nobody.name : "nobody");

const perGrade = Object.fromEntries([9, 10, 11, 12].map((g) => [g, students.filter((s) => s.grade === g).length]));
console.log("students per grade:", JSON.stringify(perGrade));
```

```output
grade 10: Ayesha Rahman, Tanvir Ahmed, Mim Akter
best three:
  Mim Akter: 87.3
  Ayesha Rahman: 85
  Sadia Islam: 82.5
no scores yet: Fahim Sarker
students per grade: {"9":2,"10":3,"11":2,"12":1}
```

1. The data is an **array of objects**, one object for each student, like the rows of the `students` table with the scores added. `average` is an arrow function that uses `reduce` to add the numbers and returns `null` for an empty list.
2. `filter` keeps the students of grade 10 and `map` turns each into just the name. Chaining the two is the JavaScript version of `SELECT name FROM students WHERE grade_level = 10`.
3. The ranking chains `filter` (students with scores), `map` (a new object with the rounded average) and `sort` with a compare function (`b.average - a.average` puts the highest first). The three best averages are the same numbers as in the SQL report of Lesson 4: Mim 87.3, Ayesha 85, Sadia 82.5.
4. `find` returns the first matching object, or `undefined`: here Fahim has no scores. `Object.fromEntries` and `JSON.stringify` build and print a count for each grade as JSON.

### Example 2: A page that reacts

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Live filter</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 2rem auto; padding: 0 1rem; }
    input { padding: 0.5rem; width: 100%; box-sizing: border-box; }
    li { padding: 0.25rem 0; }
    #count { color: #475569; }
  </style>
</head>
<body>
  <h1>Students</h1>
  <label for="search">Filter by name</label>
  <input id="search" type="search" placeholder="Type a name">
  <p id="count"></p>
  <ul id="list"></ul>
  <script>
    const students = ["Ayesha Rahman", "Tanvir Ahmed", "Sadia Islam", "Nabil Hasan", "Mim Akter", "Rafi Karim", "Tasnim Noor", "Fahim Sarker"];
    const input = document.querySelector("#search");
    const list = document.querySelector("#list");
    const count = document.querySelector("#count");

    function render() {
      const text = input.value.trim().toLowerCase();
      const shown = students.filter((name) => name.toLowerCase().includes(text));
      list.replaceChildren();
      for (const name of shown) {
        const item = document.createElement("li");
        item.textContent = name;
        list.append(item);
      }
      count.textContent = `Showing ${shown.length} of ${students.length} students`;
    }

    input.addEventListener("input", render);
    render();
  </script>
</body>
</html>
```

```output
Students
Filter by name
[Type a name]
Showing 8 of 8 students
Ayesha Rahman
Tanvir Ahmed
Sadia Islam
Nabil Hasan
Mim Akter
Rafi Karim
Tasnim Noor
Fahim Sarker
```

1. The script is at the end of the `body`, so the three elements already exist when `querySelector` looks for them. The data is a plain array, the page is drawn by one function, `render`.
2. `render` reads the filter text, keeps the names that contain it (`filter` and `includes`, both lower-cased so that capital letters do not matter), **empties** the list with `replaceChildren()` and builds one `li` for each name with `createElement`, `textContent` and `append`. Finally it writes the count.
3. The last two lines connect everything: `addEventListener("input", render)` calls `render` every time the user types a character, and `render()` is called once at the start to draw the full list (the output above). Typing `ta` leaves two names, Tanvir Ahmed and Tasnim Noor, and the count says `Showing 2 of 8 students`.
4. The names are inserted with `textContent`, not `innerHTML`, so even a name that contains HTML tags would be shown as text and never run.

### Example 3: Asking an API for JSON

```javascript
// A pretend server: it answers /api/students with JSON text and everything else with 404, like a real API.
function fakeFetch(url) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (url === "/api/students") {
        const body = '[{"id":1,"name":"Ayesha Rahman","grade":10},{"id":2,"name":"Tanvir Ahmed","grade":10}]';
        resolve({ ok: true, status: 200, text: () => Promise.resolve(body) });
      } else {
        resolve({ ok: false, status: 404, text: () => Promise.resolve('{"error":"not found"}') });
      }
    }, 10);
  });
}

async function loadStudents(url) {
  try {
    const response = await fakeFetch(url);
    if (!response.ok) throw new Error(`the server answered ${response.status}`);
    return JSON.parse(await response.text());
  } catch (error) {
    console.log("could not load:", error.message);
    return [];
  }
}

async function main() {
  const list = await loadStudents("/api/students");
  console.log("loaded", list.length, "students:", list.map((s) => s.name).join(" and "));
  const none = await loadStudents("/api/teachers");
  console.log("then", none.length, "students");
  const text = JSON.stringify(list[0]);
  console.log(text, "is a", typeof text, "and", JSON.parse(text).name, "is back as an object");
}

main();
```

```output
loaded 2 students: Ayesha Rahman and Tanvir Ahmed
could not load: the server answered 404
then 0 students
{"id":1,"name":"Ayesha Rahman","grade":10} is a string and Ayesha Rahman is back as an object
```

1. `fakeFetch` plays the part of the network: it returns a **promise** that is settled after a short delay, with a response object that has `ok`, `status` and a `text()` method, like the real `fetch`. In a browser you would write `fetch("/api/students")` instead.
2. `loadStudents` is `async`, so it can `await` the response. It checks `response.ok` and throws an error for a 404; the `try/catch` turns every failure into a message and an empty list, so the page never breaks because a server is down.
3. `JSON.parse` turns the JSON text into an array of objects, and `JSON.stringify` turns an object back into text: a string that can be sent over the network or stored. The last line shows both directions.
4. In the SIA, the server behind `/api/students` would run `SELECT ... FROM students` and send the rows as JSON; the page would only render them. The rest of this course keeps the data in the page, but the structure of the code is the same.

## Common Mistakes and Misconceptions

- **Using `==` instead of `===`.** `0 == "0"` is true and `0 === "0"` is false; always use the strict comparison.
- **Running the script before the elements exist.** A script in the `head` that looks for `#list` finds nothing; put it at the end of the `body` or use `defer`.
- **Putting user text into `innerHTML`.** It can run attacker-supplied HTML; use `textContent`.
- **Forgetting `event.preventDefault()` in a submit handler.** The browser reloads the page and your changes disappear.
- **Changing the page in many places by hand.** Keep the data in one variable and rebuild with one `render()` function.
- **Forgetting that `fetch` is asynchronous.** Without `await` you get a promise instead of the data.
- **Never handling a failed request.** The network can fail; always use `try/catch` and show the user a message.
- **Mixing logic and display.** A function that both decides and draws cannot be tested without a browser; keep the logic pure.

## Guided Hands-On Activity

**Make it react.** Work with your teacher in the JavaScript and HTML labs.

1. In Example 1 add `{ id: 9, name: "Zara Khan", grade: 9, scores: [77] }` and find the best three again. Did the ranking change?
2. In Example 1 write a line that prints the total number of scores of all students with `reduce`.
3. In Example 2 type `ta` in the filter and check the count. Then change `includes` to `startsWith`: which names match `ta` now?
4. In Example 2 add a second `<p id="hint">` that shows `No student found.` when the list is empty (use `shown.length === 0`).
5. In Example 3 change the URL in the first call to `"/api/courses"` and read the output. Which line of `loadStudents` produced the message?
6. Open the console of your browser (F12), type `document.querySelector("h1").textContent = "Hello"` on any page, and watch the page change. What happens when you reload?

## Lesson Project: SIA: Make It Interactive

### Objective

Make the **student directory** interactive: the table is drawn from data by JavaScript, it filters by name and by grade level and shows a count, and a form adds a new student after **validation**. The filtering and the validation are pure functions that you test in Node. This brings the front end of the **Student Information Application** to life.

### Requirements

- **Data.** The eight students of the database as an array of objects (`id`, `name`, `email`, `grade`).
- **Pure functions.** `filterStudents(students, text, grade)` (name contains the text, ignoring capitals; `grade` is `"all"` or a grade level) and `validateStudent(candidate, students)` which returns a list of messages: the name is required; the e-mail address must look like an address and must not be used already (compare ignoring capitals); the grade level must be a whole number from 9 to 12.
- **Tests.** At least eleven tests for the two functions in Node that print PASS or FAIL for each and the number of passed tests.
- **The page.** A function `render()` that rebuilds the table from the filtered data with `createElement` and `textContent` (never `innerHTML`) and shows `Showing X of Y students`; a search input, a grade `select` (All, 9, 10, 11, 12) that both call `render()`; and a form with name, e-mail and grade level that, on submit, calls `event.preventDefault()`, validates, shows the messages next to the form or adds the student (with the next `id`), clears the form and renders again.
- Keep the structure of Lesson 5 (header, main, table, footer), and make sure that the whole page works with the keyboard.
- In your portfolio, include a screenshot of the page with the filter `ta` and one with the validation messages, and the output of the tests.

### Instructions

1. Write `filterStudents` and `validateStudent` as pure functions and test them in Node first.
2. Write the page skeleton with the filter controls, the empty table body, the count and the add form.
3. Write `render()`: filter, empty the table body, add a row for each student, update the count.
4. Connect the events: `input` on the search field, `change` on the select and `submit` on the form.
5. In the submit handler: read the fields, build the candidate, validate it, show the errors or add the student, reset the form and call `render()`.
6. Try it with the keyboard and with bad input (an empty name, an address without `@`, a duplicate address, a grade of 13).
7. Compare the output of the tests and the visible text of the page with the expected output; take the two screenshots.

### Expected Output

```text
node logic.js
PASS  empty filter shows everybody
PASS  a name filter ignores capitals
PASS  a grade filter
PASS  name and grade together
PASS  no match gives an empty list
PASS  a valid student
PASS  an empty name
PASS  a bad e-mail address
PASS  a duplicate e-mail address
PASS  a grade out of range
PASS  several problems at once
11 of 11 tests passed

The page when it opens
Greenfield School
Student directory
Search
[Type a name]
Grade
[All]
Showing 8 of 8 students
Students
Name | Grade | E-mail
Ayesha Rahman | 10 | ayesha@student.example
Tanvir Ahmed | 10 | tanvir@student.example
Sadia Islam | 9 | sadia@student.example
Nabil Hasan | 11 | nabil@student.example
Mim Akter | 10 | mim@student.example
Rafi Karim | 12 | rafi@student.example
Tasnim Noor | 9 | tasnim@student.example
Fahim Sarker | 11 | fahim@student.example
Add a student
Name
[text]
E-mail
[email]
Grade
[9]
Add
Greenfield School, student information application
```

### Hints

1. **Hint 1 (the filter).** `s.name.toLowerCase().includes(needle) && (grade === "all" || s.grade === Number(grade))`.
2. **Hint 2 (the e-mail test).** A simple regular expression: `/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidate.email)`.
3. **Hint 3 (the duplicate).** `students.some((s) => s.email.toLowerCase() === candidate.email.toLowerCase())`.
4. **Hint 4 (the grade).** The select gives a string: convert it with `Number(...)` before you validate.
5. **Hint 5 (the next id).** `Math.max(...students.map((s) => s.id)) + 1`.
6. **Hint 6 (the render).** Empty the body with `tbody.replaceChildren()` first, then add the new rows; set the count last.

### Success Criteria

- [ ] The eleven tests pass in Node and the output ends with `11 of 11 tests passed`.
- [ ] The page shows all eight students and `Showing 8 of 8 students` when it opens.
- [ ] Typing `ta` shows two students; choosing grade 10 shows three; both together work.
- [ ] A bad form shows the messages and adds nothing; a good form adds the student, clears the form and updates the count.
- [ ] The code uses `textContent`, never `innerHTML`, for user text, and `event.preventDefault()` in the submit handler.
- [ ] The logic functions contain no `document`.

### Extension Challenge

Sort the table by clicking a column header (name or grade), toggling ascending and descending. Then save the students in the browser with `localStorage` (`JSON.stringify` to save, `JSON.parse` to load) so that an added student is still there after reloading, and handle the case that nothing is stored yet. Finally, replace the array by a call of your `loadStudents` function from Example 3, so that the page would be ready for a real API.

## Lesson Recap

- JavaScript runs in the browser: `const` and `let`, functions and arrow functions, arrays and objects, and the array methods `filter`, `map`, `find`, `sort` and `reduce`.
- The **DOM** is changed with `querySelector`, `textContent`, `createElement` and `append`; **events** are handled with `addEventListener`; a form handler calls `event.preventDefault()`.
- Keep the **data** in a variable, rebuild the view with one **`render()`** function, use `textContent` (not `innerHTML`) for user text and keep the logic in **pure functions** that can be tested in Node.
- An **API** answers requests with **JSON**; `fetch` with `async` and `await` loads it, and `try/catch` handles failures.

## Homework / Extension Mission

Add a second page feature of your own to the directory: a counter of students per grade that updates when a student is added, or a button that sorts the table by name. Write two new tests for the pure function behind it before you write the page code. Then write a short paragraph, for a classmate, that explains the difference between `textContent` and `innerHTML` and why it matters for security.

## Course Project Connection

This lesson makes the web page of the **Student Information Application**, the course project, interactive: it renders the students from data, filters them, validates new students and keeps its logic testable. The structure matches the real application: a server and database behind an API on one side, a page that renders JSON on the other. In Lesson 7 you write the requirements and the design of the whole application as user stories and UML diagrams, and in Lesson 8 you write the test suite, review the code and package the project with its database script.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: JavaScript against Python (same ideas, new syntax); 10 minutes: array methods on the SIA data in the console; 15 minutes: the DOM and events (build Example 2 live, typing in the filter); 5 minutes: `fetch` and JSON (the API picture); 20 minutes: the project, in pairs.

**Live demonstrations.** Change the page with `document.querySelector(...)` in the browser console. Type `<b>hello</b>` as a student name in a version that uses `innerHTML` and in one that uses `textContent`. Run the tests of the pure functions in the lab with the console output.

**Misconceptions.** "JavaScript is Java." "`==` and `===` are the same." "The page keeps the data." "innerHTML is just a shortcut."

**Assessment of the project.** Run the tests, then open the page and try the filter, the grade select, the valid and the invalid form. Check the code for `innerHTML`, `preventDefault` and for any `document` inside the pure functions. Ask students why the logic is separate from the page.

**Reference solution, part 1: `logic.js`** (the pure functions and their tests, run with Node):

```javascript
// The pure logic of the application: no document, no DOM, so it can be tested anywhere
function filterStudents(students, text, grade) {
  const needle = text.trim().toLowerCase();
  return students.filter((s) => s.name.toLowerCase().includes(needle) && (grade === "all" || s.grade === Number(grade)));
}

function validateStudent(candidate, students) {
  const errors = [];
  if (candidate.name.trim() === "") errors.push("The name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidate.email)) errors.push("The e-mail address is not valid.");
  else if (students.some((s) => s.email.toLowerCase() === candidate.email.toLowerCase())) errors.push("This e-mail address is already used.");
  if (!Number.isInteger(candidate.grade) || candidate.grade < 9 || candidate.grade > 12) errors.push("The grade level must be 9, 10, 11 or 12.");
  return errors;
}

const students = [
  { id: 1, name: "Ayesha Rahman", email: "ayesha@student.example", grade: 10 },
  { id: 2, name: "Tanvir Ahmed", email: "tanvir@student.example", grade: 10 },
  { id: 3, name: "Sadia Islam", email: "sadia@student.example", grade: 9 },
  { id: 4, name: "Nabil Hasan", email: "nabil@student.example", grade: 11 },
  { id: 5, name: "Mim Akter", email: "mim@student.example", grade: 10 },
  { id: 6, name: "Rafi Karim", email: "rafi@student.example", grade: 12 },
  { id: 7, name: "Tasnim Noor", email: "tasnim@student.example", grade: 9 },
  { id: 8, name: "Fahim Sarker", email: "fahim@student.example", grade: 11 },
];

let passed = 0;
let total = 0;
function test(name, actual, expected) {
  total += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : ` (got ${JSON.stringify(actual)})`}`);
}

const names = (list) => list.map((s) => s.name);
test("empty filter shows everybody", filterStudents(students, "", "all").length, 8);
test("a name filter ignores capitals", names(filterStudents(students, "TA", "all")), ["Tanvir Ahmed", "Tasnim Noor"]);
test("a grade filter", names(filterStudents(students, "", "10")), ["Ayesha Rahman", "Tanvir Ahmed", "Mim Akter"]);
test("name and grade together", names(filterStudents(students, "ta", "9")), ["Tasnim Noor"]);
test("no match gives an empty list", filterStudents(students, "zzz", "all"), []);
test("a valid student", validateStudent({ name: "Zara Khan", email: "zara@student.example", grade: 9 }, students), []);
test("an empty name", validateStudent({ name: "  ", email: "x@student.example", grade: 9 }, students), ["The name is required."]);
test("a bad e-mail address", validateStudent({ name: "Zara", email: "zara.at.example", grade: 9 }, students), ["The e-mail address is not valid."]);
test("a duplicate e-mail address", validateStudent({ name: "Zara", email: "MIM@student.example", grade: 9 }, students), ["This e-mail address is already used."]);
test("a grade out of range", validateStudent({ name: "Zara", email: "zara@student.example", grade: 13 }, students), ["The grade level must be 9, 10, 11 or 12."]);
test("several problems at once", validateStudent({ name: "", email: "no", grade: 8 }, students).length, 3);
console.log(`${passed} of ${total} tests passed`);
```

```output
PASS  empty filter shows everybody
PASS  a name filter ignores capitals
PASS  a grade filter
PASS  name and grade together
PASS  no match gives an empty list
PASS  a valid student
PASS  an empty name
PASS  a bad e-mail address
PASS  a duplicate e-mail address
PASS  a grade out of range
PASS  several problems at once
11 of 11 tests passed
```

**Reference solution, part 2: `index.html`** (the page; the output block lists what a visitor reads when it opens):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Greenfield School: Student Directory</title>
  <style>
    :root { --ink: #1f2937; --brand: #1e3a8a; --soft: #eff6ff; --line: #cbd5e1; --bad: #b91c1c; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; color: var(--ink); line-height: 1.5; }
    header, footer { background: var(--brand); color: white; padding: 1rem 1.5rem; }
    header h1 { margin: 0; }
    main { max-width: 60rem; margin: 0 auto; padding: 1.5rem; }
    .controls, #add-form { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 1rem 0; }
    input, select { padding: 0.5rem; border: 1px solid var(--line); border-radius: 0.375rem; }
    #search { flex: 1 1 14rem; }
    button { padding: 0.5rem 1rem; background: var(--brand); color: white; border: 0; border-radius: 0.375rem; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    caption { text-align: left; font-weight: 700; padding-bottom: 0.5rem; }
    th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--line); }
    thead th { background: var(--soft); }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .error { color: var(--bad); margin: 0.25rem 0; }
    @media (max-width: 36rem) { .email { display: none; } }
  </style>
</head>
<body>
  <header>
    <h1>Greenfield School</h1>
  </header>
  <main>
    <h2>Student directory</h2>
    <div class="controls">
      <label for="search">Search</label>
      <input id="search" type="search" placeholder="Type a name">
      <label for="grade">Grade</label>
      <select id="grade">
        <option value="all">All</option>
        <option value="9">9</option>
        <option value="10">10</option>
        <option value="11">11</option>
        <option value="12">12</option>
      </select>
    </div>
    <p id="count"></p>
    <table>
      <caption>Students</caption>
      <thead><tr><th scope="col">Name</th><th scope="col">Grade</th><th scope="col" class="email">E-mail</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
    <h2>Add a student</h2>
    <form id="add-form" novalidate>
      <label for="new-name">Name</label>
      <input id="new-name" type="text">
      <label for="new-email">E-mail</label>
      <input id="new-email" type="email">
      <label for="new-grade">Grade</label>
      <input id="new-grade" type="number" value="9">
      <button type="submit">Add</button>
    </form>
    <div id="messages" aria-live="polite"></div>
  </main>
  <footer>
    <p>Greenfield School, student information application</p>
  </footer>
  <script>
    function filterStudents(students, text, grade) {
      const needle = text.trim().toLowerCase();
      return students.filter((s) => s.name.toLowerCase().includes(needle) && (grade === "all" || s.grade === Number(grade)));
    }

    function validateStudent(candidate, students) {
      const errors = [];
      if (candidate.name.trim() === "") errors.push("The name is required.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidate.email)) errors.push("The e-mail address is not valid.");
      else if (students.some((s) => s.email.toLowerCase() === candidate.email.toLowerCase())) errors.push("This e-mail address is already used.");
      if (!Number.isInteger(candidate.grade) || candidate.grade < 9 || candidate.grade > 12) errors.push("The grade level must be 9, 10, 11 or 12.");
      return errors;
    }

    const students = [
      { id: 1, name: "Ayesha Rahman", email: "ayesha@student.example", grade: 10 },
      { id: 2, name: "Tanvir Ahmed", email: "tanvir@student.example", grade: 10 },
      { id: 3, name: "Sadia Islam", email: "sadia@student.example", grade: 9 },
      { id: 4, name: "Nabil Hasan", email: "nabil@student.example", grade: 11 },
      { id: 5, name: "Mim Akter", email: "mim@student.example", grade: 10 },
      { id: 6, name: "Rafi Karim", email: "rafi@student.example", grade: 12 },
      { id: 7, name: "Tasnim Noor", email: "tasnim@student.example", grade: 9 },
      { id: 8, name: "Fahim Sarker", email: "fahim@student.example", grade: 11 },
    ];

    const search = document.querySelector("#search");
    const gradeSelect = document.querySelector("#grade");
    const rows = document.querySelector("#rows");
    const count = document.querySelector("#count");
    const messages = document.querySelector("#messages");
    const form = document.querySelector("#add-form");

    function cell(text, className) {
      const td = document.createElement("td");
      td.textContent = text;
      if (className) td.className = className;
      return td;
    }

    function render() {
      const shown = filterStudents(students, search.value, gradeSelect.value);
      rows.replaceChildren();
      for (const s of shown) {
        const tr = document.createElement("tr");
        tr.append(cell(s.name), cell(String(s.grade)), cell(s.email, "email"));
        rows.append(tr);
      }
      count.textContent = `Showing ${shown.length} of ${students.length} students`;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const candidate = {
        name: document.querySelector("#new-name").value,
        email: document.querySelector("#new-email").value.trim(),
        grade: Number(document.querySelector("#new-grade").value),
      };
      const errors = validateStudent(candidate, students);
      messages.replaceChildren();
      if (errors.length > 0) {
        for (const message of errors) {
          const p = document.createElement("p");
          p.className = "error";
          p.textContent = message;
          messages.append(p);
        }
        return;
      }
      students.push({ id: Math.max(...students.map((s) => s.id)) + 1, name: candidate.name.trim(), email: candidate.email, grade: candidate.grade });
      form.reset();
      render();
    });

    search.addEventListener("input", render);
    gradeSelect.addEventListener("change", render);
    render();
  </script>
</body>
</html>
```

```output
Greenfield School
Student directory
Search
[Type a name]
Grade
[All]
Showing 8 of 8 students
Students
Name | Grade | E-mail
Ayesha Rahman | 10 | ayesha@student.example
Tanvir Ahmed | 10 | tanvir@student.example
Sadia Islam | 9 | sadia@student.example
Nabil Hasan | 11 | nabil@student.example
Mim Akter | 10 | mim@student.example
Rafi Karim | 12 | rafi@student.example
Tasnim Noor | 9 | tasnim@student.example
Fahim Sarker | 11 | fahim@student.example
Add a student
Name
[text]
E-mail
[email]
Grade
[9]
Add
Greenfield School, student information application
```

**Differentiation.** Support: provide `filterStudents` and the page skeleton; students write `render`, the events and `validateStudent` with the list of rules on a card. Stretch: sorting by column header, `localStorage` and the `loadStudents` API function.

**Discussion questions (not for the student quiz).** Why is it important that the server validates a new student again, even though the page already did? What could go wrong if the page used `innerHTML` for the student names? How would the page change if the data came from `fetch` instead of an array?
