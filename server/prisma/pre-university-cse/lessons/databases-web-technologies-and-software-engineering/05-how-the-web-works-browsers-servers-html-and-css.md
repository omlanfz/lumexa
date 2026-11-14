# Lumexa Mission Log: Databases, Web Technologies & Software Engineering

**Course/Path:** Databases, Web Technologies & Software Engineering
**Lesson:** 05 of 08
**Title:** How the Web Works: Browsers, Servers, HTML and CSS
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** HTML · CSS

---

## Mission Brief

The database knows who the students are, but nobody can see it yet. People use a **web page**: something they open in a browser on a phone or a laptop, with no software to install. In Course 6 you followed one web request across the network. In this lesson you stand on the other side of that request and **build** what comes back: a page written in **HTML** (what is on the page) and styled with **CSS** (how it looks).

You learn how a browser turns text into a page, the structure of an HTML document, the elements that you will use again and again (headings, lists, links, tables, forms) and the CSS ideas that matter most: selectors, the box model, flexbox and **responsive** design for small screens. Then you build the first screen of the Student Information Application: the **student directory page**. This is a foundation: you learn the ideas that every web developer uses, not a full web-development course.

## Learning Objectives

1. Explain how a browser and a server cooperate to show a page, and the roles of HTML, CSS and JavaScript.
2. Write a valid HTML document with the correct skeleton, semantic elements, links, lists, tables and a form.
3. Explain the DOM as the tree that the browser builds from the HTML.
4. Write CSS with selectors, properties, colours and units, and explain the cascade.
5. Use the box model and flexbox to lay out a page, and make it responsive with a viewport tag and a media query.
6. Build the student directory page, with an accessible structure and a responsive style, for the SIA.

## Prerequisites

- The web-request lesson of the networking course: URLs, HTTP requests and responses.
- The student data from the SQL lessons (names, grade levels, e-mails) that the page will show.
- Basic typing skills; no earlier web experience is needed.

## Concept Explanation

### How a page reaches the screen

When you open a URL, the browser sends an HTTP request and the server answers with a file, almost always an **HTML** document. The browser reads the HTML from top to bottom and, whenever it meets a reference to another file (a style sheet, an image, a script), requests that file too. Three languages divide the work: **HTML** gives the page its **structure and content** (a heading, a table, a form), **CSS** gives it its **appearance** (colours, fonts, spacing, layout) and **JavaScript** gives it **behaviour** (reacting to clicks, changing the page, talking to a server; Lesson 6). A site whose files are sent unchanged is **static**; a **dynamic** site builds each page on the server (often from a database, as the SIA will do later) or in the browser with JavaScript. The code that runs in the browser is the **front end**; the code and the database on the server are the **back end**.

The browser does not keep the HTML text. It parses it into a tree of objects called the **DOM** (document object model): `html` at the root, `head` and `body` as its children, and every element, with its text, as a node below them. CSS rules are matched against the nodes of this tree, and JavaScript changes the tree; the browser then repaints the page. The developer tools (F12) show you this tree live.

### HTML: structure

An HTML document is made of **elements**. An element has an opening tag, content and a closing tag (`<p>text</p>`), may have **attributes** (`<a href="https://example.com">`) and may contain other elements. A few elements have no content and no closing tag (`<img>`, `<input>`, `<br>`). Every page has the same skeleton:

- `<!DOCTYPE html>` tells the browser to use the modern rules;
- `<html lang="en">` is the root, and `lang` helps screen readers and translators;
- `<head>` holds information *about* the page that is not displayed: `<meta charset="utf-8">` (the character encoding), `<meta name="viewport" ...>` (makes phones scale the page properly), `<title>` (the text of the browser tab) and, later, the style sheet;
- `<body>` holds everything that the user sees.

The elements you use most are: headings `<h1>` to `<h6>` (one `h1` per page, in order, never chosen for their size); paragraphs `<p>`; lists `<ul>` (bullets) and `<ol>` (numbers) with `<li>` items; links `<a href="...">`; images `<img src="..." alt="...">` (the `alt` text is what a screen reader says and what shows when the picture is missing); tables `<table>` with `<thead>`, `<tbody>`, rows `<tr>`, header cells `<th>` and data cells `<td>`; and forms `<form>` with `<label for="id">`, `<input id="id" type="...">`, `<select>`, `<textarea>` and `<button>`. **Semantic** elements describe the role of a block: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`. They look like `<div>` boxes but tell browsers, search engines and screen readers what each part is, which is why they are better than a pile of `<div>` elements. Use a table for real tabular data (rows and columns of facts, such as the students), never for the layout of a page.

### CSS: presentation

A CSS rule has a **selector** and a block of **declarations**: `selector { property: value; }`. Common selectors are the element (`p`), the class (`.card`, for elements with `class="card"`), the id (`#search`, unique on a page), a descendant (`nav a`: links inside a nav) and a state (`a:hover`: while the mouse is over it). Properties you will use constantly are `color`, `background`, `font-family`, `font-size`, `text-align`, `width`, `margin`, `padding` and `border`. Colours can be names (`white`), hexadecimal (`#1e3a8a`) or `rgb(30, 58, 138)`; lengths use `px` (pixels), `rem` (a multiple of the root font size, good for text and spacing), `%` and `vw`. Styles go in a `<style>` element in the head or, better, in an external file linked with `<link rel="stylesheet" href="style.css">`, so that many pages share them.

When rules compete, the **cascade** decides: a more specific selector beats a less specific one (an id beats a class, which beats an element), and between equals the later rule wins. Many properties are **inherited** by the children (the text colour of `body` reaches every paragraph).

### The box model, flexbox and responsive design

Every element is a rectangular **box** with four layers, from the inside out: the **content**, the **padding** (space inside the border), the **border** and the **margin** (space outside). `box-sizing: border-box` makes `width` include padding and border, which is almost always what you want. Elements are **block** (they take a full line, like `p` and `div`) or **inline** (they flow in the text, like `a` and `strong`). **Flexbox** (`display: flex` on a parent) lays its children out in a row or column with `gap`, `justify-content`, `align-items` and `flex-wrap`, and replaces most old layout tricks.

People read your page on screens from 320 to 3,000 pixels wide, so a page must be **responsive**: the viewport meta tag makes phones use their real width; relative units and `max-width` let content shrink; and **media queries**, such as `@media (max-width: 36rem) { ... }`, apply rules only on small screens (for example hiding a less important column). Also keep text readable (a 16 px body font or larger), give links and buttons room to tap, and keep enough colour contrast.

## Key Vocabulary

| Term | Definition |
|---|---|
| **HTML** | The markup language that gives a page its structure and content. |
| **CSS** | The language that styles a page: colours, fonts, spacing and layout. |
| **Element / tag / attribute** | A part of a page, such as `<p>` / the marker that opens or closes it / extra information inside the tag, such as `href`. |
| **DOM** | The tree of objects that the browser builds from the HTML. |
| **Semantic element** | An element that names its role, such as `header`, `nav`, `main`, `footer`. |
| **Selector** | The part of a CSS rule that says which elements it applies to. |
| **Cascade / specificity** | The rules that decide which CSS declaration wins when several apply. |
| **Box model** | The layers of every element: content, padding, border and margin. |
| **Flexbox** | A CSS layout mode (`display: flex`) that arranges children in a row or column. |
| **Responsive design** | Making a page adapt to any screen width. |
| **Media query** | A CSS condition, such as `@media (max-width: 36rem)`, that applies rules only for some screens. |
| **Accessibility** | Making pages usable by everyone, including people who use screen readers or keyboards. |

## Worked Examples

### Example 1: A first page

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My first page</title>
</head>
<body>
  <h1>Greenfield School</h1>
  <p>Welcome to the <strong>student directory</strong>. Our courses:</p>
  <ul>
    <li>Mathematics</li>
    <li>Physics</li>
    <li>ICT</li>
    <li>English</li>
  </ul>
  <p>Read the <a href="https://www.example.com/policy">school policy</a>.</p>
</body>
</html>
```

```output
Greenfield School
Welcome to the student directory. Our courses:
Mathematics
Physics
ICT
English
Read the school policy.
```

1. The skeleton has a `doctype`, an `html` element with the language, a `head` that the user does not see (character set, viewport and the title that appears in the browser tab) and a `body` that holds the visible page.
2. The output is what a visitor *reads*: the heading, the paragraphs, the list items and the link text. The tags themselves are never shown: `<strong>` only makes the word bold and `<a>` makes the text a link to the address in `href`.
3. The list is a `ul` with four `li` items. The browser draws the bullets; you never type them. Changing `ul` to `ol` would number the items instead.
4. This page has structure but no style: the browser uses its default look. The next examples add a table, a form and CSS.

### Example 2: A page with a table and a form

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Student directory</title>
</head>
<body>
  <header>
    <h1>Greenfield School</h1>
    <nav aria-label="Main">
      <a href="#students">Students</a>
      <a href="#courses">Courses</a>
    </nav>
  </header>
  <main>
    <section id="students">
      <h2>Student directory</h2>
      <form>
        <label for="search">Search by name</label>
        <input id="search" type="search" placeholder="Type a name">
        <button type="submit">Search</button>
      </form>
      <table>
        <caption>Four of our students</caption>
        <thead>
          <tr><th scope="col">Name</th><th scope="col">Grade</th></tr>
        </thead>
        <tbody>
          <tr><td>Ayesha Rahman</td><td>10</td></tr>
          <tr><td>Tanvir Ahmed</td><td>10</td></tr>
          <tr><td>Sadia Islam</td><td>9</td></tr>
          <tr><td>Nabil Hasan</td><td>11</td></tr>
        </tbody>
      </table>
    </section>
  </main>
  <footer>
    <p>Greenfield School student information application</p>
  </footer>
</body>
</html>
```

```output
Greenfield School
Students Courses
Student directory
Search by name
[Type a name]
Search
Four of our students
Name | Grade
Ayesha Rahman | 10
Tanvir Ahmed | 10
Sadia Islam | 9
Nabil Hasan | 11
Greenfield School student information application
```

1. The page uses **semantic elements**: a `header` with a `nav`, a `main` with a `section`, and a `footer`. They look the same as `div` elements, but a screen reader can jump straight to the navigation or the main content, and search engines understand the page better.
2. The `form` contains a `label` that is connected to its `input` by `for` and `id`: clicking the label focuses the field, and a screen reader announces it. The `placeholder` is a hint inside the empty field (shown here in brackets). The form does not do anything yet; in Lesson 6 JavaScript will make it work.
3. The student list is a `table` because it is real tabular data: `th` cells with `scope="col"` name the columns, `td` cells hold the facts and the `caption` describes the table. The output shows each row with its cells separated by bars.
4. Using a table for data and semantic elements for structure keeps the page **accessible**: the information does not depend on what it looks like.

### Example 3: Styling with CSS

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Styled directory</title>
  <style>
    :root { --brand: #1e3a8a; --soft: #eff6ff; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; line-height: 1.5; color: #1f2937; }
    header { background: var(--brand); color: white; padding: 1rem 1.5rem; }
    nav { display: flex; gap: 1.5rem; }
    nav a { color: white; }
    nav a:hover { text-decoration: underline; }
    main { max-width: 40rem; margin: 0 auto; padding: 1.5rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid #cbd5e1; }
    thead th { background: var(--soft); }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .note { margin-top: 1rem; padding: 1rem; border: 2px solid var(--brand); border-radius: 0.5rem; }
    @media (max-width: 30rem) { .note { display: none; } }
  </style>
</head>
<body>
  <header>
    <h1>Greenfield School</h1>
    <nav><a href="#list">Students</a><a href="#help">Help</a></nav>
  </header>
  <main>
    <table id="list">
      <thead><tr><th>Name</th><th>Grade</th></tr></thead>
      <tbody>
        <tr><td>Ayesha Rahman</td><td>10</td></tr>
        <tr><td>Tanvir Ahmed</td><td>10</td></tr>
        <tr><td>Sadia Islam</td><td>9</td></tr>
      </tbody>
    </table>
    <p class="note">Tip: this note disappears on narrow screens.</p>
  </main>
</body>
</html>
```

```output
Greenfield School
Students Help
Name | Grade
Ayesha Rahman | 10
Tanvir Ahmed | 10
Sadia Islam | 9
Tip: this note disappears on narrow screens.
```

1. The `<style>` element holds CSS rules. The variables `--brand` and `--soft` are declared once on `:root` and reused with `var(...)`, so a colour can be changed in one place.
2. `* { box-sizing: border-box; }` makes the `width` of every element include its padding and border, which keeps the box model predictable. `main` has a `max-width` and `margin: 0 auto`, so the content is centred and never wider than 40rem: that is the responsive basis.
3. `nav { display: flex; gap: 1.5rem; }` puts the links in a row with space between them. The selector `nav a` styles only the links inside the nav, `nav a:hover` only while the mouse is over one, and `tbody tr:nth-child(even)` gives every second row a light background (zebra stripes).
4. The rule `@media (max-width: 30rem) { .note { display: none; } }` hides the note on screens narrower than 30rem: the output above is what you see on a wide screen, and the note's line disappears on a phone. The page looks different, but the information of the table is the same everywhere.

## Common Mistakes and Misconceptions

- **Forgetting to close a tag.** An unclosed `<div>` or `<li>` can swallow the rest of the page; indent consistently and check the nesting.
- **Using headings for their size.** Headings give structure (`h1` for the page, `h2` for sections). Change the size with CSS.
- **Using tables for layout.** Tables are for tabular data; use flexbox or grid for layout.
- **Leaving out `alt` on images.** Screen readers and broken-image situations depend on it.
- **Forgetting the viewport meta tag.** Without it phones pretend to be 980 pixels wide and shrink the page.
- **Setting fixed pixel widths everywhere.** They break on small screens; use `max-width`, percentages and `rem`.
- **Not connecting a label to its input.** Use `<label for="id">` with a matching `id`, so that the field has a name.
- **Thinking CSS order does not matter.** Of two equally specific rules, the later one wins.

## Guided Hands-On Activity

**Build and break.** Work with your teacher in the HTML lab.

1. In Example 1 change the `ul` to an `ol` and add a fifth course. What changes on the page?
2. In Example 1 remove the closing `</li>` of the second item. Does the browser still show a list? What does that tell you about browsers?
3. In Example 2 add a third column `E-mail` with a `mailto:` link in each row.
4. In Example 3 change the value of `--brand` to another colour. How many parts of the page change, and why?
5. In Example 3 change `30rem` in the media query to `80rem`. At which screen width does the note vanish now?
6. Open the developer tools (F12), choose the Elements tab and find the `h1` of your page. Right-click it and edit its text: what changes, and does the file change?

## Lesson Project: SIA: The Student Directory Page

### Objective

Build the **student directory page** of the Student Information Application as one HTML file with an embedded style sheet: a header with navigation, a search form, a table of all eight students with links to their e-mail addresses, and a footer, styled with CSS and responsive on small screens. This is the first screen of the **Student Information Application**.

### Requirements

- **Structure.** The semantic skeleton `header` (with the school name as the only `h1` and a `nav` with three links: Students, Courses, Reports), `main` with a `section` (`h2` Student directory, an introduction, the search form and the table) and a `footer`.
- **The table.** A `caption`, header cells with `scope="col"` and one row for each of the eight students (name, grade level and e-mail as a `mailto:` link): Ayesha Rahman (10, ayesha@student.example), Tanvir Ahmed (10, tanvir@student.example), Sadia Islam (9, sadia@student.example), Nabil Hasan (11, nabil@student.example), Mim Akter (10, mim@student.example), Rafi Karim (12, rafi@student.example), Tasnim Noor (9, tasnim@student.example), Fahim Sarker (11, fahim@student.example).
- **The form.** A `label` connected to a search `input` and a `button`; it does not need to work yet.
- **The style.** CSS variables for the colours, `box-sizing: border-box`, a centred `main` with a `max-width`, a flexbox navigation, a styled form, zebra rows and a hover colour in the table.
- **Responsive.** The viewport meta tag, and a media query that hides the e-mail column on screens narrower than 36rem.
- **Accessibility.** One `h1`, headings in order, a label for the input, `scope` on the header cells and enough colour contrast (dark text on light backgrounds, white on dark blue).
- In your portfolio, include screenshots at a wide and a narrow width, and write three sentences about which choices make the page accessible.

### Instructions

1. Write the HTML skeleton with the semantic elements and fill in the table rows.
2. Add the search form with its label.
3. Add the `<style>` element: variables, base rules, header, navigation and footer.
4. Style the main area, the form and the table (zebra rows and hover).
5. Add the media query for narrow screens and give the e-mail cells the class `email`.
6. Test the page at a wide and a narrow width (resize the lab, or use the device mode of the developer tools).
7. Compare the visible text with the expected output and write the accessibility sentences.

### Expected Output

```text
Greenfield School
Students Courses Reports
Student directory
Eight students are listed. Search by name.
Search
[Type a name]
Search
Students of Greenfield School
Name | Grade | E-mail
Ayesha Rahman | 10 | ayesha@student.example
Tanvir Ahmed | 10 | tanvir@student.example
Sadia Islam | 9 | sadia@student.example
Nabil Hasan | 11 | nabil@student.example
Mim Akter | 10 | mim@student.example
Rafi Karim | 12 | rafi@student.example
Tasnim Noor | 9 | tasnim@student.example
Fahim Sarker | 11 | fahim@student.example
Greenfield School, student information application
```

### Hints

1. **Hint 1 (the skeleton).** Start from Example 2: header, main with a section, footer.
2. **Hint 2 (the e-mail link).** `<a href="mailto:ayesha@student.example">ayesha@student.example</a>` inside a `td`.
3. **Hint 3 (the table).** One `tr` for the header row inside `thead`, eight `tr` rows inside `tbody`.
4. **Hint 4 (the class).** Put `class="email"` on both the `th` and the `td` of the e-mail column so that one rule hides the whole column.
5. **Hint 5 (the zebra rows).** `tbody tr:nth-child(even) { background: #f8fafc; }`.
6. **Hint 6 (the media query).** `@media (max-width: 36rem) { .email { display: none; } }`.

### Success Criteria

- [ ] The page uses `header`, `nav`, `main`, `section`, `table` and `footer`, with one `h1` and an `h2`.
- [ ] The table has a caption, header cells with `scope` and eight rows with working `mailto:` links.
- [ ] The search input has a connected label.
- [ ] The style uses variables, a centred `main`, flexbox navigation, zebra rows and a hover colour.
- [ ] On a narrow screen the e-mail column disappears and the rest of the page still fits without sideways scrolling.
- [ ] The portfolio has two screenshots and three accessibility sentences.

### Extension Challenge

Move the CSS into a separate file `style.css` and link it with `<link rel="stylesheet" href="style.css">` (in the lab, keep one file; on your own computer you can use two). Then add a dark mode with `@media (prefers-color-scheme: dark)` that changes the variables, and a printable version with `@media print` that hides the navigation and the form. Finally, replace the table's layout on narrow screens: show each student as a card with `display: block` on the cells.

## Lesson Recap

- The browser requests an **HTML** file, then the files it refers to; **HTML** is the structure, **CSS** the appearance and **JavaScript** the behaviour. The browser builds the **DOM** tree from the HTML.
- A page has the skeleton `doctype`, `html`, `head` (charset, viewport, title) and `body`; **semantic elements** (`header`, `nav`, `main`, `section`, `footer`), tables for tabular data and labelled forms keep it accessible.
- CSS rules have a **selector** and declarations; the **cascade** and specificity decide conflicts; the **box model** (content, padding, border, margin) and **flexbox** lay out the page.
- **Responsive design** uses the viewport tag, relative units, `max-width` and media queries.

## Homework / Extension Mission

Build a personal page of at least three sections (about you, your favourite subjects as a list, and a table of something that you track, such as books you have read) with semantic elements and a style sheet of your own colours. Make it responsive: test it at 360 pixels wide. Then open a website you use in the developer tools, find its `h1`, its navigation and one CSS rule that uses flexbox or a media query, and write three lines about what you found.

## Course Project Connection

This lesson builds the **first screen** of the **Student Information Application**, the course project: a page that shows the students that the database of Lessons 2 to 4 holds, with a search form that is ready to be brought to life. In Lesson 6 JavaScript fills the table from data, filters it as the user types and adds a student through a form; in Lessons 7 and 8 the application is specified, tested and shipped together with its database script.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the journey of a page and the three languages; 15 minutes: HTML skeleton and semantic elements (type Example 1 live and show the DOM in the developer tools); 10 minutes: CSS, box model and flexbox; 25 minutes: the project.

**Live demonstrations.** Open the developer tools on a familiar website and edit a heading. Resize the browser to show a media query at work. Remove the viewport tag and view the page on a phone-sized window.

**Misconceptions.** "HTML is a programming language." "Headings are for making text big." "Tables are for layout." "CSS applies top to bottom, so the order never matters."

**Assessment of the project.** Open each student's page at two widths and check the structure, the table, the label, the style and the narrow-screen behaviour. Ask students to explain the difference between `h1` and `h2`, and what the media query does.

**Reference solution `index.html`** (open it in the HTML lab; the output block lists what a visitor reads on a wide screen):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Greenfield School: Student Directory</title>
  <style>
    :root { --ink: #1f2937; --brand: #1e3a8a; --soft: #eff6ff; --line: #cbd5e1; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; color: var(--ink); line-height: 1.5; }
    header, footer { background: var(--brand); color: white; padding: 1rem 1.5rem; }
    header h1 { margin: 0 0 0.5rem; }
    nav { display: flex; gap: 1.5rem; }
    nav a { color: white; }
    nav a:hover { text-decoration: underline; }
    main { max-width: 60rem; margin: 0 auto; padding: 1.5rem; }
    form { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 1rem 0; }
    input { flex: 1 1 14rem; padding: 0.5rem; border: 1px solid var(--line); border-radius: 0.375rem; }
    button { padding: 0.5rem 1rem; background: var(--brand); color: white; border: 0; border-radius: 0.375rem; }
    table { width: 100%; border-collapse: collapse; }
    caption { text-align: left; font-weight: 700; padding-bottom: 0.5rem; }
    th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--line); }
    thead th { background: var(--soft); }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: var(--soft); }
    @media (max-width: 36rem) { .email { display: none; } }
  </style>
</head>
<body>
  <header>
    <h1>Greenfield School</h1>
    <nav aria-label="Main">
      <a href="#students">Students</a>
      <a href="#courses">Courses</a>
      <a href="#reports">Reports</a>
    </nav>
  </header>
  <main>
    <section id="students">
      <h2>Student directory</h2>
      <p>Eight students are listed. Search by name.</p>
      <form>
        <label for="search">Search</label>
        <input id="search" type="search" placeholder="Type a name">
        <button type="submit">Search</button>
      </form>
      <table>
        <caption>Students of Greenfield School</caption>
        <thead>
          <tr><th scope="col">Name</th><th scope="col">Grade</th><th scope="col" class="email">E-mail</th></tr>
        </thead>
        <tbody>
          <tr><td>Ayesha Rahman</td><td>10</td><td class="email"><a href="mailto:ayesha@student.example">ayesha@student.example</a></td></tr>
          <tr><td>Tanvir Ahmed</td><td>10</td><td class="email"><a href="mailto:tanvir@student.example">tanvir@student.example</a></td></tr>
          <tr><td>Sadia Islam</td><td>9</td><td class="email"><a href="mailto:sadia@student.example">sadia@student.example</a></td></tr>
          <tr><td>Nabil Hasan</td><td>11</td><td class="email"><a href="mailto:nabil@student.example">nabil@student.example</a></td></tr>
          <tr><td>Mim Akter</td><td>10</td><td class="email"><a href="mailto:mim@student.example">mim@student.example</a></td></tr>
          <tr><td>Rafi Karim</td><td>12</td><td class="email"><a href="mailto:rafi@student.example">rafi@student.example</a></td></tr>
          <tr><td>Tasnim Noor</td><td>9</td><td class="email"><a href="mailto:tasnim@student.example">tasnim@student.example</a></td></tr>
          <tr><td>Fahim Sarker</td><td>11</td><td class="email"><a href="mailto:fahim@student.example">fahim@student.example</a></td></tr>
        </tbody>
      </table>
    </section>
  </main>
  <footer>
    <p>Greenfield School, student information application</p>
  </footer>
</body>
</html>
```

```output
Greenfield School
Students Courses Reports
Student directory
Eight students are listed. Search by name.
Search
[Type a name]
Search
Students of Greenfield School
Name | Grade | E-mail
Ayesha Rahman | 10 | ayesha@student.example
Tanvir Ahmed | 10 | tanvir@student.example
Sadia Islam | 9 | sadia@student.example
Nabil Hasan | 11 | nabil@student.example
Mim Akter | 10 | mim@student.example
Rafi Karim | 12 | rafi@student.example
Tasnim Noor | 9 | tasnim@student.example
Fahim Sarker | 11 | fahim@student.example
Greenfield School, student information application
```

**Differentiation.** Support: provide the HTML skeleton and the table with the first two rows, and a ready style sheet to modify (change colours, spacing) before writing their own. Stretch: the external style sheet, dark mode, print style and the card layout on narrow screens.

**Discussion questions (not for the student quiz).** Why is a page that works without CSS or JavaScript more robust? What are the advantages of semantic elements for a visually impaired user? Why should the e-mail column be the one to disappear on a phone rather than the name?
