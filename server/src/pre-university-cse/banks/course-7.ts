// FILE PATH: server/src/pre-university-cse/banks/course-7.ts
//
// Course Assessment 7 — Databases, Web Technologies & Software Engineering.

import { codeOut, crit, mcq, practical, shortAnswer, structuredBank } from '../../structured-assessments/structured.helpers';

export const COURSE_7_BANK = structuredBank({
  id: 'structured/databases-web-technologies-and-software-engineering',
  title: 'Course Assessment: Databases, Web Technologies & Software Engineering',
  kind: 'COURSE_TEST',
  mcq: [
    mcq(
      1,
      'Students can take many courses and a course has many students. How is this many-to-many relationship stored in a relational database?',
      'In a separate junction table (for example enrolments) whose rows hold a student id and a course id as foreign keys',
      [
        'By adding a list of course names to every row of the students table',
        'By giving the students table one foreign key for each course that exists',
        'By storing every student twice, once for each course that the student takes',
      ],
      'A relational column holds one value, so a many-to-many relationship needs its own table that pairs the two keys, one row for each combination.',
    ),
    mcq(
      2,
      'Which problem does third normal form remove?',
      'A non-key column that depends on another non-key column (a transitive dependency), so that a fact is stored in more than one place',
      [
        'A table that has no primary key, so that no row can be identified',
        'A column that holds a list of values instead of a single value',
        'A foreign key that refers to a row that no longer exists',
      ],
      'In third normal form every non-key column depends on the key, the whole key and nothing but the key. Moving the dependent columns to their own table stops one fact from being repeated.',
    ),
    codeOut(
      3,
      'sql',
      `CREATE TABLE s (id INTEGER, grade INTEGER);
INSERT INTO s VALUES (1, 9), (2, 10), (3, 10), (4, 11);
SELECT grade, COUNT(*) FROM s GROUP BY grade HAVING COUNT(*) > 1;`,
      '10|2',
      ['9|1', '10|3', '11|1'],
      'GROUP BY forms one group for each grade; HAVING keeps only the groups with more than one row. Only grade 10 occurs twice.',
    ),
    codeOut(
      4,
      'sql',
      `CREATE TABLE c (id INTEGER, title TEXT);
CREATE TABLE e (cid INTEGER, score INTEGER);
INSERT INTO c VALUES (1, 'Maths'), (2, 'ICT');
INSERT INTO e VALUES (1, 80), (1, 60), (2, 90);
SELECT c.title, AVG(e.score) FROM c JOIN e ON e.cid = c.id WHERE c.title = 'Maths' GROUP BY c.title;`,
      'Maths|70.0',
      ['Maths|140.0', 'Maths|80.0', 'ICT|90.0'],
      'The join pairs each score with its course. For Maths the scores 80 and 60 are averaged to 70.0; the ICT row is removed by the WHERE clause.',
    ),
    mcq(
      5,
      'Which CSS selector styles only the element whose id is "header"?',
      '#header',
      ['.header', 'header', '*header'],
      'In CSS a hash selects an id and a dot selects a class, while a bare name selects every element of that tag. An id should be unique on a page.',
    ),
    codeOut(
      6,
      'javascript',
      `const marks = [40, 75, 90, 55];
console.log(marks.filter((m) => m >= 50).map((m) => m - 50).reduce((a, b) => a + b, 0));`,
      '70',
      ['25', '195', '220'],
      'filter keeps 75, 90 and 55; map subtracts 50 from each, giving 25, 40 and 5; reduce adds them to 70.',
    ),
    mcq(
      7,
      'In Scrum, what is a sprint?',
      'A fixed time box of one to four weeks in which the team builds a working increment of the product',
      [
        'A meeting at the start of the project at which all the requirements are written down',
        'The final phase of the project in which the product is tested and released',
        'A list of the features that the customer has asked for, ordered by priority',
      ],
      'A sprint is a short, fixed period. It starts with planning, ends with a review of working software, and the next sprint begins immediately after.',
    ),
    mcq(
      8,
      'Two Git branches both changed the same line of the same file, and one is merged into the other. What happens?',
      'Git reports a merge conflict and a person must choose the correct lines, then add and commit the result',
      [
        'Git keeps the version of the branch that has more commits and discards the other',
        'Git merges both lines into one automatically and never needs help',
        'Git deletes the file from both branches so that the problem cannot spread',
      ],
      'Git can merge changes to different lines on its own, but when both sides changed the same lines it cannot know which is right. It marks the file and leaves the decision to a person.',
    ),
    mcq(
      6,
      'Why should a web page put text typed by a user into the page with textContent instead of innerHTML?',
      'innerHTML would run HTML or script that is hidden in the text (cross-site scripting), while textContent treats it as plain text',
      [
        'textContent is faster, and there is no other difference between the two',
        'innerHTML cannot display letters outside the English alphabet',
        'textContent also validates the text and rejects anything unsafe',
      ],
      'User text may contain markup such as an image tag with an event handler. innerHTML interprets it and may run it; textContent always shows it as harmless text.',
    ),
    mcq(
      4,
      'What does ROLLBACK do inside a database transaction?',
      'It undoes every change made since the transaction began, so the database returns to its earlier state',
      [
        'It saves all the changes permanently and ends the transaction',
        'It deletes the table in which the last change was made',
        'It repeats the last statement until it succeeds',
      ],
      'A transaction is all or nothing: COMMIT makes its changes permanent and ROLLBACK cancels them, which protects data from half-finished updates.',
    ),
  ],
  shortAnswers: [
    shortAnswer(
      2,
      'A library wants to store books, members and loans. Design the tables: name each table, give its columns with the primary key, and show the foreign keys. Say what constraint you would add to make sure that a member cannot borrow the same copy twice at the same time, and why.',
      'Tables: members(member_id PK, name, email UNIQUE); books(book_id PK, title, author, copies INTEGER CHECK (copies >= 0)); loans(loan_id PK, member_id FK to members, book_id FK to books, borrowed_on DATE NOT NULL, returned_on DATE). A loan row links one member to one book, so the many-to-many relationship is resolved. To stop the same open loan from being recorded twice, add a unique constraint or index on (member_id, book_id) for rows where returned_on is null (a partial unique index), or check in the application inside a transaction. The database enforces it for every program, so the rule cannot be skipped by a mistake in one page.',
      [
        crit('Tables and keys', 2, 'Three tables with sensible columns, primary keys and the foreign keys of loans.'),
        crit('Relationship', 1, 'Explains that loans resolves the many-to-many relationship between members and books.'),
        crit('Constraint and reason', 2, 'A suitable unique constraint (or transaction check) and the reason that the database should enforce it.'),
      ],
    ),
    shortAnswer(
      6,
      'A page must show a list of students that it gets from the address /api/students as JSON. Describe the steps with fetch, async and await, how you handle an error such as a failed request, and how you put the names into the page safely. Mention why the logic should be separated from the display.',
      'The page calls fetch("/api/students") with await inside an async function, checks response.ok (and throws an Error if it is false), and parses the body with await response.json() to get an array. A try/catch around the call shows a message to the user if the network fails or the server returns an error status. For each student the code creates an element with document.createElement, sets its textContent (not innerHTML) so that names cannot inject markup, and appends it to the list. Keeping the data processing (filtering, validating) in pure functions and the DOM code in a small render function makes the logic testable without a browser and the display easy to change.',
      [
        crit('fetch, async and await', 2, 'Uses fetch with await, checks response.ok and parses the JSON.'),
        crit('Error handling', 1, 'try/catch or an equivalent, with a message to the user.'),
        crit('Safe display', 1, 'createElement and textContent instead of innerHTML, with the reason.'),
        crit('Separation of logic and display', 1, 'Pure functions for the logic and a separate render function, and why that helps testing.'),
      ],
    ),
    shortAnswer(
      8,
      'A function isValidGrade(grade) must accept only whole numbers from 9 to 12. List at least six test cases (the input and the expected result), explain which of them are boundary tests and why boundaries matter, and give the one-line bug that these tests would catch.',
      'Test cases: 8 gives false, 9 true, 10 true, 12 true, 13 false, 10.5 false, "10" (text) false, NaN false. The boundary tests are 8, 9, 12 and 13, because bugs hide at the edges of a range: the classic off-by-one error, for example writing grade > 9 && grade < 12 instead of grade >= 9 && grade <= 12, makes 9 and 12 fail while the typical values still pass. A suite that tests only 10 would not notice the bug, but the cases 9 and 12 catch it at once.',
      [
        crit('Test cases', 2, 'At least six sensible cases with correct expected results, including a non-integer or wrong type.'),
        crit('Boundaries and why', 2, 'Identifies 8, 9, 12 and 13 as the boundary cases and explains that bugs cluster at the edges.'),
        crit('The bug', 1, 'Describes the off-by-one comparison and how the boundary tests expose it.'),
      ],
    ),
  ],
  practical: practical({
    title: 'Queries for a school database',
    language: 'sql',
    sqlSetup:
      'PRAGMA foreign_keys = ON;\n' +
      'CREATE TABLE courses (course_id INTEGER PRIMARY KEY, title TEXT NOT NULL, capacity INTEGER NOT NULL);\n' +
      'CREATE TABLE students (student_id INTEGER PRIMARY KEY, name TEXT NOT NULL, grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12));\n' +
      'CREATE TABLE enrolments (student_id INTEGER NOT NULL REFERENCES students(student_id), course_id INTEGER NOT NULL REFERENCES courses(course_id), score INTEGER CHECK (score BETWEEN 0 AND 100), PRIMARY KEY (student_id, course_id));\n' +
      "INSERT INTO courses VALUES (1, 'Mathematics', 3), (2, 'Physics', 2), (3, 'ICT', 3);\n" +
      "INSERT INTO students VALUES (1, 'Ayesha', 10), (2, 'Tanvir', 10), (3, 'Sadia', 9), (4, 'Nabil', 11), (5, 'Mim', 10);\n" +
      'INSERT INTO enrolments VALUES (1, 1, 92), (1, 2, 85), (2, 1, 67), (2, 3, 71), (3, 1, 38), (4, 3, 75), (5, 2, 88), (5, 3, NULL);',
    instructions:
      'The tables `courses`, `students` and `enrolments` are already created and filled. Write SQL for each task and show the rows that it returns.\n\n' +
      '1. List the names of the students of grade level 10, in alphabetical order.\n' +
      '2. List each course title with the number of students who are enrolled in it (courses with no students must still appear with 0), ordered by the title.\n' +
      '3. For each student, show the name and the average score (ignoring NULL), for students who have at least one score, highest average first.\n' +
      '4. List the courses whose enrolled students have an average score below 75, using GROUP BY and HAVING.\n' +
      '5. Write a single INSERT ... SELECT statement that enrols student 3 in course 2 only if the course still has a free seat (compare the number of enrolments with the capacity), and explain in a sentence why the check and the insert are one statement.\n\n' +
      'Expected for task 1: Ayesha, Mim, Tanvir. Expected for task 3: the highest average belongs to Mim (88.0).',
    starterCode: '-- Task 1\n\n-- Task 2\n\n-- Task 3\n\n-- Task 4\n\n-- Task 5\n',
    deliverables: ['The SQL of every task', 'The rows returned by tasks 1 to 4', 'One sentence on why the seat check and the insert are one statement'],
    rubric: [
      crit('Filtering and ordering', 3, 'Task 1 uses WHERE and ORDER BY correctly and returns Ayesha, Mim, Tanvir.'),
      crit('Joins and counting', 5, 'Task 2 uses a LEFT JOIN with GROUP BY so that empty courses show 0; the counts are right.'),
      crit('Aggregation', 5, 'Tasks 3 and 4 use AVG, GROUP BY, HAVING and ORDER BY correctly and treat NULL properly.'),
      crit('Safe conditional insert', 4, 'Task 5 is one INSERT ... SELECT with a seat check, and the explanation mentions atomicity and concurrent users.'),
      crit('Correctness and style', 3, 'Statements run without errors, use clear aliases and formatting, and the results are shown.'),
    ],
  }),
});
