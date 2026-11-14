// FILE PATH: server/src/curriculum/lesson-content/catalog/pucse/c7.ts
//
// Pre-University CSE · Course 7 · Databases, Web Technologies & Software Engineering — visuals and the Mini Quiz of every lesson.
// Keys are lineage keys: "<course-slug>/<lesson position>". Every "what does this print?" question carries
// the real program (checked by running it in the Pre-University CSE spec when the toolchain is installed).

import { registerVisualCatalog } from '../../visual-catalog';
import { registerQuizCatalog } from '../../quiz-catalog';
import { cards, checklist, compare, flow, graph, grid, JS, lab, mcq, PY, sequence, SQL, table, tree, uml, venn, walkthrough } from './helpers';

const M = 'databases-web-technologies-and-software-engineering';

registerVisualCatalog({
  [`${M}/1`]: [
    compare(
      'flat-vs-tables',
      'Data, information and the trouble with flat files',
      'Two tables side by side. On the left a flat table with five rows in which the teacher Nusrat Jahan and her e-mail address are repeated in three rows and Rahim Chowdhury and his address in two. On the right a separate teachers table with one row for each teacher, which stores each e-mail address exactly once.',
      'Repeated facts on the left can drift apart. On the right each fact has one home, and the courses refer to the teacher by number.',
      { title: 'One flat table', columns: ['Student', 'Course', 'Teacher', 'Teacher e-mail'], rows: [['Ayesha', 'Physics', 'Nusrat Jahan', 'nusrat@school.example'], ['Mim', 'Physics', 'Nusrat Jahan', 'nusrat@school.example'], ['Nabil', 'Physics', 'Nusrat Jahan', 'nusrat@school.example'], ['Ayesha', 'Mathematics', 'Rahim Chowdhury', 'rahim@school.example'], ['Tanvir', 'Mathematics', 'Rahim Chowdhury', 'rahim@school.example']], highlights: [0, 1, 2].map((row) => ({ row, col: 3, tone: 'warn' })) },
      { title: 'A teachers table', columns: ['teacher_id', 'name', 'email'], rows: [[1, 'Rahim Chowdhury', 'rahim@school.example'], [2, 'Nusrat Jahan', 'nusrat@school.example']], highlights: [{ row: 1, col: 2, tone: 'good', note: 'stored once' }] },
      { arrowLabel: 'design', at: 'end' },
    ),
    cards(
      'dbms-services',
      'Databases and the DBMS',
      'Six cards for the services of a database management system: storage and retrieval, querying with SQL, integrity through constraints, security through permissions, concurrency through transactions, and backup and recovery.',
      'What the DBMS does for you, so that every program does not have to do it again.',
      [
        { title: 'Storage', subtitle: 'keeps the data', bullets: ['millions of rows', 'indexes make look-ups fast'], tone: 'info' },
        { title: 'Querying', subtitle: 'answers questions', bullets: ['SQL: say what you want', 'the DBMS finds the way'], tone: 'accent' },
        { title: 'Integrity', subtitle: 'keeps data correct', bullets: ['score between 0 and 100', 'unique e-mail, real teacher'], tone: 'good' },
        { title: 'Security', subtitle: 'protects the data', bullets: ['users and permissions', 'least privilege'], tone: 'warn' },
        { title: 'Concurrency', subtitle: 'many users at once', bullets: ['transactions', 'no half-finished changes'], tone: 'accent2' },
        { title: 'Recovery', subtitle: 'survives failures', bullets: ['backups', 'a log to repair a crash'], tone: 'info' },
      ],
      { at: 'end' },
    ),
    flow(
      'design-steps',
      'Designing a database',
      'Five steps of database design in a row. Requirements: talk to the users. Conceptual design: draw an ER diagram. Logical design: tables, keys and constraints. Physical design: types and indexes. Implementation and testing: create the database, load sample data and check the questions.',
      'A mistake found in the ER diagram costs minutes; found after launch it costs weeks.',
      ['Requirements|what data, which questions|accent', 'Conceptual|ER diagram|info', 'Logical|tables, keys, constraints|good', 'Physical|types and indexes|warn', 'Build and test|create, load, query|accent2'],
      { layout: 'row', perRow: 5, at: 'end' },
    ),
    grid(
      'sia-er-diagram',
      'Entity-relationship modelling',
      'An ER diagram of the school database, drawn from top to bottom. The entity Teacher (teacher_id, name, email) is linked by the relationship teaches, one to many, to the entity Course (course_id, title, credits). Course is linked by the relationship enrols in, many to many, to the entity Student (student_id, name, email, grade_level). The relationship enrols in has its own attribute, score.',
      'One teacher teaches many courses (1 to N). A student takes many courses and a course has many students (M to N); the score belongs to the enrolment.',
      [
        ['teacher', 'rect', 'Teacher', 0, 0, 'accent', 'teacher_id · name · email'],
        ['teaches', 'diamond', 'teaches', 0, 1.1, 'warn', '1 to many'],
        ['course', 'rect', 'Course', 0, 2.2, 'accent', 'course_id · title · credits'],
        ['enrols', 'diamond', 'enrols in', 0, 3.3, 'warn', 'attribute: score'],
        ['student', 'rect', 'Student', 0, 4.4, 'accent', 'student_id · name · email · grade_level'],
      ],
      [
        ['teacher', 'teaches', '1', { head: 'none' }],
        ['teaches', 'course', 'N', { head: 'none' }],
        ['course', 'enrols', 'N', { head: 'none' }],
        ['enrols', 'student', 'M', { head: 'none' }],
      ],
      { dy: 90, w: 300, h: 56, at: 'end' },
    ),
    table(
      'cardinality-table',
      'Entity-relationship modelling',
      'A table of the three cardinalities. One-to-one, such as a person and a passport, uses a unique foreign key in either table. One-to-many, such as a teacher and the courses taught, puts a foreign key in the table on the many side. Many-to-many, such as students and courses, needs a junction table that holds both keys and the attributes of the relationship.',
      'The cardinality decides how a relationship is stored.',
      ['Cardinality', 'Example', 'In the tables'],
      [
        ['1:1', 'a person and their passport', 'a unique foreign key in either table'],
        ['1:N', 'a teacher and the courses they teach', 'a foreign key in the table on the "many" side (courses.teacher_id)'],
        ['M:N', 'students and the courses they take', 'a junction table (enrolments) with both keys and the score'],
      ],
      { at: 'end', highlights: [{ row: 2, col: 2, tone: 'good' }] },
    ),
    lab(
      'anomaly-lab',
      'Example 1',
      'sql',
      'An SQL editor with the Example 1 queries on a flat records table, a partial update of one teacher\'s e-mail address, and a query of the distinct teachers and e-mails that returns two different addresses for the same teacher.',
      'Add a new teacher without a student and see what you must invent. Then delete the Mathematics rows and see what you lose.',
      `UPDATE records SET teacher_email = 'nusrat.jahan@school.example' WHERE student = 'Ayesha' AND course = 'Physics';
SELECT DISTINCT teacher, teacher_email FROM records ORDER BY teacher;`,
      { setup: `CREATE TABLE records (student TEXT, course TEXT, teacher TEXT, teacher_email TEXT, score INTEGER);
INSERT INTO records VALUES ('Ayesha', 'Physics', 'Nusrat Jahan', 'nusrat@school.example', 85);
INSERT INTO records VALUES ('Mim', 'Physics', 'Nusrat Jahan', 'nusrat@school.example', 93);
INSERT INTO records VALUES ('Nabil', 'Physics', 'Nusrat Jahan', 'nusrat@school.example', 55);
INSERT INTO records VALUES ('Ayesha', 'Mathematics', 'Rahim Chowdhury', 'rahim@school.example', 92);
INSERT INTO records VALUES ('Tanvir', 'Mathematics', 'Rahim Chowdhury', 'rahim@school.example', 67);`, filename: 'anomaly.sql', at: 'end' },
    ),
    lab(
      'model-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program, an ER model of a library stored as Python data, a function that checks it and a function that turns it into tables, with its expected output.',
      'Add an Author entity with a 1:N relationship to Book and predict the new columns of books.',
      `# An ER model as data: each entity has attributes (the first one is its key); each relationship links two entities
MODEL = {
    "entities": {
        "Member": ["member_id", "name", "phone"],
        "Book": ["book_id", "title", "author"],
        "Location": ["location_id", "room"],
    },
    "relationships": [
        # name, entity A, cardinality, entity B, attributes of the relationship itself, junction table name
        ("borrows", "Member", "M:N", "Book", ["due_date"], "loans"),
        ("stored in", "Location", "1:N", "Book", [], None),
    ],
}


def check(model):
    """Return the list of problems in an ER model (an empty list means that it is consistent)."""
    problems = []
    for entity, attributes in model["entities"].items():
        if not attributes or not attributes[0].endswith("_id"):
            problems.append(f"{entity} has no key: its first attribute should be like {entity.lower()}_id")
    for name, a, cardinality, b, _, _ in model["relationships"]:
        for entity in (a, b):
            if entity not in model["entities"]:
                problems.append(f"'{name}' mentions the unknown entity {entity}")
        if cardinality not in ("1:1", "1:N", "M:N"):
            problems.append(f"'{name}' has the unknown cardinality {cardinality}")
    return problems


def to_tables(model):
    """One table per entity, a foreign key for 1:N and 1:1, a junction table for M:N."""
    tables = {entity.lower() + "s": list(attributes) for entity, attributes in model["entities"].items()}
    for name, a, cardinality, b, attributes, junction in model["relationships"]:
        key_a, key_b = model["entities"][a][0], model["entities"][b][0]
        if cardinality == "M:N":
            tables[junction] = [key_a, key_b] + attributes
        else:
            tables[b.lower() + "s"].append(key_a)             # the foreign key goes on the "many" side
    return tables


print("library model:", check(MODEL) or "consistent")
for table, columns in to_tables(MODEL).items():
    print(f"  {table}({', '.join(columns)})")

BROKEN = {"entities": {"Reader": ["name", "phone"], "Book": ["book_id", "title"]},
          "relationships": [("reads", "Reader", "N:M", "Book", [], None), ("ordered from", "Shop", "1:N", "Book", [], None)]}
print("\\nbroken model:")
for problem in check(BROKEN):
    print("  -", problem)`,
      { expected: 'library model: consistent\n  members(member_id, name, phone)\n  books(book_id, title, author, location_id)\n  locations(location_id, room)\n  loans(member_id, book_id, due_date)\n\nbroken model:\n  - Reader has no key: its first attribute should be like reader_id\n  - \'reads\' has the unknown cardinality N:M\n  - \'ordered from\' mentions the unknown entity Shop', filename: 'er_model.py', at: 'end' },
    ),
    lab(
      'first-queries-lab',
      'Example 3',
      'sql',
      'An SQL editor with two tables, teachers and courses, already filled in, and the query SELECT * FROM courses, which the learner can change to try other queries.',
      'Try SELECT title FROM courses WHERE teacher_id = 2; and SELECT name FROM teachers ORDER BY name DESC;',
      `SELECT * FROM courses;`,
      { setup: `CREATE TABLE teachers (teacher_id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL);
CREATE TABLE courses (course_id INTEGER PRIMARY KEY, title TEXT NOT NULL, credits INTEGER NOT NULL, teacher_id INTEGER NOT NULL);
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example'), (2, 'Nusrat Jahan', 'nusrat@school.example'), (3, 'Imran Hossain', 'imran@school.example');
INSERT INTO courses VALUES (101, 'Mathematics', 4, 1), (102, 'Physics', 3, 2), (103, 'ICT', 2, 3), (104, 'English', 3, 2);`, filename: 'first_queries.sql', at: 'end' },
    ),
  ],
  [`${M}/2`]: [
    table(
      'relational-terms',
      'The relational model',
      'A table of the vocabulary of the relational model. A relation is a table; a tuple is a row, one fact; an attribute is a column; a domain is the set of allowed values of a column; the schema is the structure of the tables and an instance is the data they hold at one moment; NULL means unknown, which is not zero.',
      'Two vocabularies for the same thing: the mathematicians say relation, tuple and attribute; practitioners say table, row and column.',
      ['Term', 'Everyday word', 'Example'],
      [
        ['Relation', 'table', 'students'],
        ['Tuple', 'row', '(1, Ayesha Rahman, ayesha@student.example, 10)'],
        ['Attribute', 'column', 'grade_level'],
        ['Domain', 'allowed values', 'whole numbers from 9 to 12'],
        ['Schema / instance', 'structure / current data', 'the CREATE TABLE statements / the rows today'],
        ['NULL', 'unknown or not applicable', 'a score that has not been recorded yet (not 0)'],
      ],
      { at: 'end' },
    ),
    uml(
      'sia-schema-diagram',
      'Keys',
      'A schema diagram of the four tables. teachers has the primary key teacher_id. courses has the primary key course_id and the foreign key teacher_id that points to teachers. students has the primary key student_id. enrolments has the composite primary key student_id and course_id, both of which are foreign keys that point to students and courses, and the score.',
      'The arrows are foreign keys: each one points from the column that holds the number to the table where that number is the primary key.',
      [
        { id: 'teachers', name: 'teachers', col: 0, row: 0, fields: ['PK teacher_id', 'name', 'email (unique)'], tone: 'accent' },
        { id: 'courses', name: 'courses', col: 1, row: 0, fields: ['PK course_id', 'title (unique)', 'credits', 'FK teacher_id'], tone: 'accent' },
        { id: 'students', name: 'students', col: 0, row: 1, fields: ['PK student_id', 'name', 'email (unique)', 'grade_level'], tone: 'accent' },
        { id: 'enrolments', name: 'enrolments', col: 1, row: 1, fields: ['PK, FK student_id', 'PK, FK course_id', 'score'], tone: 'warn' },
      ],
      [
        ['courses', 'teachers', 'teacher_id', { head: 'open' }],
        ['enrolments', 'courses', 'course_id', { head: 'open' }],
        ['enrolments', 'students', 'student_id', { head: 'open' }],
      ],
      { dx: 300, dy: 200, at: 'end' },
    ),
    table(
      'keys-table',
      'Keys',
      'A table of the kinds of key with examples from the school database. A candidate key is a minimal set of columns that is unique: student_id and email in students. The primary key is the chosen one: student_id. A composite key has several columns: student_id and course_id in enrolments. A foreign key refers to the primary key of another table: courses.teacher_id.',
      'One table can have several candidate keys but only one primary key. A foreign key is a primary key seen from the other side.',
      ['Kind of key', 'What it is', 'In the SIA'],
      [
        ['Candidate key', 'a minimal set of columns that is unique', 'students: student_id, and also email'],
        ['Primary key', 'the candidate key you choose; unique and never NULL', 'students.student_id'],
        ['Alternate key', 'another candidate key, declared UNIQUE', 'students.email'],
        ['Composite key', 'a key of several columns', 'enrolments (student_id, course_id)'],
        ['Foreign key', 'values must match a primary key in another table', 'courses.teacher_id refers to teachers.teacher_id'],
      ],
      { at: 'end', highlights: [{ row: 1, col: 2, tone: 'good' }, { row: 4, col: 2, tone: 'info' }] },
    ),
    table(
      'dependencies-table',
      'Normalisation',
      'A table of the functional dependencies of the flat table. student_id determines the student name and the grade level, which is a partial dependency because it uses only part of the key. course_id determines the course title, the credits and the teacher name, also a partial dependency. teacher_name determines teacher_email, a transitive dependency. The pair student_id and course_id determines the score and depends on the whole key.',
      'Which column depends on what decides where it belongs. Only the last row belongs in the enrolments table.',
      ['Determinant', 'Determines', 'Problem', 'Moves to'],
      [
        ['student_id', 'student_name, grade_level', 'partial dependency (2NF)', 'students'],
        ['course_id', 'course_title, credits, teacher_name', 'partial dependency (2NF)', 'courses'],
        ['teacher_name', 'teacher_email', 'transitive dependency (3NF)', 'teachers'],
        ['(student_id, course_id)', 'score', 'none: depends on the whole key', 'enrolments'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 2, tone: 'warn' }, { row: 1, col: 2, tone: 'warn' }, { row: 2, col: 2, tone: 'bad' }, { row: 3, col: 2, tone: 'good' }] },
    ),
    walkthrough(
      'normal-forms',
      'Normalisation',
      'A four-step walk-through of normalisation. Step 1: the flat table has atomic values and a key, so it is in first normal form. Step 2: move the columns that depend on only part of the key, the student columns and the course columns, into their own tables to reach second normal form. Step 3: move the teacher columns out of courses, because they depend on the teacher and not on the course, to reach third normal form. Step 4: the result is four tables linked by keys, with each fact stored once.',
      'Three questions, in order: atomic values? the whole key? nothing but the key?',
      [
        { title: '1NF: atomic values and a key', text: 'The flat table has one value in every cell and the key (student_id, course_id). It is in first normal form, but it repeats names, titles and e-mails in every row.' },
        { title: '2NF: the whole key', text: 'student_name and grade_level depend only on student_id; course_title, credits and the teacher depend only on course_id. Move them to students and courses. What is left, (student_id, course_id, score), depends on the whole key.' },
        { title: '3NF: nothing but the key', text: 'In courses, teacher_email depends on the teacher, and the teacher depends on the course. Move the teacher columns to teachers and keep only teacher_id in courses.' },
        { title: 'The result', text: 'teachers, students, courses and enrolments, linked by foreign keys. Every fact is stored once, so it can never contradict itself.' },
      ],
      { at: 'end' },
    ),
    lab(
      'pragma-lab',
      'Example 1',
      'sql',
      'An SQL editor with the four SIA tables already created and the query PRAGMA table_info(courses), which lists the columns of the courses table.',
      'Run PRAGMA table_info(students); and PRAGMA table_info(enrolments); and name the primary key of each.',
      `PRAGMA table_info(courses);`,
      { setup: `PRAGMA foreign_keys = ON;
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12)
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  teacher_id INTEGER NOT NULL REFERENCES teachers (teacher_id)
);
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL REFERENCES students (student_id),
  course_id INTEGER NOT NULL REFERENCES courses (course_id),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);`, filename: 'table_info.sql', at: 'end' },
    ),
    lab(
      'constraints-lab',
      'Example 2',
      'sql',
      'An SQL editor with the four SIA tables created, in which the learner inserts valid rows and four bad rows with INSERT OR IGNORE and counts how many students were stored.',
      'Remove OR IGNORE from the second insert and read the error message.',
      `INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example');
INSERT INTO students VALUES (1, 'Ayesha Rahman', 'ayesha@student.example', 10);
INSERT OR IGNORE INTO students VALUES (2, 'Fake Ayesha', 'ayesha@student.example', 10);
INSERT OR IGNORE INTO students VALUES (3, 'Too Old', 'old@student.example', 13);
INSERT OR IGNORE INTO students VALUES (4, NULL, 'noname@student.example', 9);
INSERT OR IGNORE INTO students VALUES (1, 'Same Id', 'same@student.example', 9);
SELECT COUNT(*) AS students_stored FROM students;`,
      { setup: `PRAGMA foreign_keys = ON;
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12)
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  teacher_id INTEGER NOT NULL REFERENCES teachers (teacher_id)
);
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL REFERENCES students (student_id),
  course_id INTEGER NOT NULL REFERENCES courses (course_id),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);`, filename: 'constraints.sql', at: 'end' },
    ),
    lab(
      'normalise-lab',
      'Example 3',
      'sql',
      'An SQL editor with the flat table of 17 enrolments already loaded, and queries that split it into students, teachers, courses and enrolments with SELECT DISTINCT and count the values stored.',
      'Add a student whose score is NULL to the flat table and find it with IS NULL.',
      `CREATE TABLE students_n AS SELECT DISTINCT student_id, student_name, grade_level FROM flat;
CREATE TABLE teachers_n AS SELECT DISTINCT teacher_name, teacher_email FROM flat;
CREATE TABLE courses_n AS SELECT DISTINCT course_id, course_title, credits, teacher_name FROM flat;
CREATE TABLE enrolments_n AS SELECT student_id, course_id, score FROM flat;
SELECT 'flat table (before)' AS design, COUNT(*) AS row_count, 9 AS columns, COUNT(*) * 9 AS values_stored FROM flat
UNION ALL SELECT 'students', COUNT(*), 3, COUNT(*) * 3 FROM students_n
UNION ALL SELECT 'teachers', COUNT(*), 2, COUNT(*) * 2 FROM teachers_n
UNION ALL SELECT 'courses', COUNT(*), 4, COUNT(*) * 4 FROM courses_n
UNION ALL SELECT 'enrolments', COUNT(*), 3, COUNT(*) * 3 FROM enrolments_n;`,
      { setup: `CREATE TABLE flat (student_id INTEGER, student_name TEXT, grade_level INTEGER, course_id INTEGER, course_title TEXT, credits INTEGER, teacher_name TEXT, teacher_email TEXT, score INTEGER);
INSERT INTO flat VALUES
  (1, 'Ayesha Rahman', 10, 101, 'Mathematics', 4, 'Rahim Chowdhury', 'rahim@school.example', 92),
  (1, 'Ayesha Rahman', 10, 102, 'Physics', 3, 'Nusrat Jahan', 'nusrat@school.example', 85),
  (1, 'Ayesha Rahman', 10, 103, 'ICT', 2, 'Imran Hossain', 'imran@school.example', 78),
  (2, 'Tanvir Ahmed', 10, 101, 'Mathematics', 4, 'Rahim Chowdhury', 'rahim@school.example', 67),
  (2, 'Tanvir Ahmed', 10, 103, 'ICT', 2, 'Imran Hossain', 'imran@school.example', 88),
  (3, 'Sadia Islam', 9, 101, 'Mathematics', 4, 'Rahim Chowdhury', 'rahim@school.example', 74),
  (3, 'Sadia Islam', 9, 104, 'English', 3, 'Nusrat Jahan', 'nusrat@school.example', 91),
  (4, 'Nabil Hasan', 11, 102, 'Physics', 3, 'Nusrat Jahan', 'nusrat@school.example', 55),
  (4, 'Nabil Hasan', 11, 103, 'ICT', 2, 'Imran Hossain', 'imran@school.example', 69),
  (4, 'Nabil Hasan', 11, 104, 'English', 3, 'Nusrat Jahan', 'nusrat@school.example', 72),
  (5, 'Mim Akter', 10, 101, 'Mathematics', 4, 'Rahim Chowdhury', 'rahim@school.example', 88),
  (5, 'Mim Akter', 10, 102, 'Physics', 3, 'Nusrat Jahan', 'nusrat@school.example', 93),
  (5, 'Mim Akter', 10, 104, 'English', 3, 'Nusrat Jahan', 'nusrat@school.example', 81),
  (6, 'Rafi Karim', 12, 101, 'Mathematics', 4, 'Rahim Chowdhury', 'rahim@school.example', 45),
  (6, 'Rafi Karim', 12, 103, 'ICT', 2, 'Imran Hossain', 'imran@school.example', 60),
  (7, 'Tasnim Noor', 9, 104, 'English', 3, 'Nusrat Jahan', 'nusrat@school.example', 66),
  (7, 'Tasnim Noor', 9, 103, 'ICT', 2, 'Imran Hossain', 'imran@school.example', 95);`, filename: 'normalise.sql', at: 'end' },
    ),
  ],
  [`${M}/3`]: [
    table(
      'sql-parts',
      'The parts of SQL and the CRUD operations',
      'A table of the five parts of SQL. DDL defines structure with CREATE, ALTER and DROP. DML changes data with INSERT, UPDATE and DELETE. DQL reads data with SELECT. DCL controls permissions with GRANT and REVOKE. TCL controls transactions with COMMIT and ROLLBACK.',
      'One language, five jobs. In this lesson: DML and DQL, which together are the CRUD operations.',
      ['Part', 'Stands for', 'Statements', 'Job'],
      [
        ['DDL', 'data definition language', 'CREATE, ALTER, DROP', 'build the structure'],
        ['DML', 'data manipulation language', 'INSERT, UPDATE, DELETE', 'change the data'],
        ['DQL', 'data query language', 'SELECT', 'read the data'],
        ['DCL', 'data control language', 'GRANT, REVOKE', 'manage permissions'],
        ['TCL', 'transaction control language', 'COMMIT, ROLLBACK', 'group changes safely'],
      ],
      { at: 'end', highlights: [{ row: 1, col: 0, tone: 'good' }, { row: 2, col: 0, tone: 'good' }] },
    ),
    table(
      'crud-table',
      'Create, update and delete',
      'A table of the four CRUD operations. Create is INSERT INTO students VALUES. Read is SELECT name FROM students. Update is UPDATE enrolments SET score = 54 WHERE student_id = 6. Delete is DELETE FROM enrolments WHERE student_id = 7. For update and delete the warning is the same: always write the WHERE clause.',
      'Four operations, four statements. For UPDATE and DELETE the WHERE clause is your safety belt.',
      ['Operation', 'SQL', 'Example', 'Watch out'],
      [
        ['Create', 'INSERT', "INSERT INTO students (student_id, name, email, grade_level) VALUES (9, 'Zara Khan', 'zara@student.example', 9)", 'every NOT NULL column needs a value'],
        ['Read', 'SELECT', 'SELECT name, grade_level FROM students WHERE grade_level >= 11', 'without ORDER BY the order is not guaranteed'],
        ['Update', 'UPDATE', 'UPDATE enrolments SET score = 54 WHERE student_id = 6 AND course_id = 101', 'without WHERE every row changes'],
        ['Delete', 'DELETE', 'DELETE FROM enrolments WHERE student_id = 7 AND course_id = 104', 'without WHERE every row is deleted'],
      ],
      { at: 'end', highlights: [{ row: 2, col: 3, tone: 'bad' }, { row: 3, col: 3, tone: 'bad' }] },
    ),
    table(
      'operators-table',
      'Reading data with SELECT',
      'A table of the WHERE operators with an example each. Comparison operators equals, not equal, less than and greater than or equal. AND, OR and NOT combine conditions. BETWEEN includes both ends. IN tests membership in a list. LIKE searches text with percent for any characters and underscore for one character. IS NULL finds missing values.',
      'The tools of WHERE. BETWEEN includes both ends, LIKE uses % and _, and a missing value needs IS NULL, never = NULL.',
      ['Operator', 'Meaning', 'Example'],
      [
        ['=  <>  <  >  <=  >=', 'compare', 'credits >= 3'],
        ['AND  OR  NOT', 'combine conditions (use parentheses)', "grade_level = 10 AND name LIKE 'A%'"],
        ['BETWEEN a AND b', 'from a to b, both included', 'score BETWEEN 80 AND 100'],
        ['IN (x, y, z)', 'one of the listed values', 'grade_level IN (10, 11)'],
        ['LIKE', '% = any characters, _ = one character', "name LIKE 'T%'"],
        ['IS NULL', 'the value is missing', 'score IS NULL'],
      ],
      { at: 'end', highlights: [{ row: 5, col: 2, tone: 'warn', note: 'never = NULL' }] },
    ),
    flow(
      'select-order',
      'How a query is evaluated',
      'Five steps in the order in which the database evaluates a query, which is different from the order in which it is written. FROM chooses the table, WHERE keeps the rows, SELECT computes the columns, ORDER BY sorts and LIMIT cuts. An alias made in SELECT exists only from step three onwards.',
      'Think in this order: from this table, keep these rows, show these columns, sort, cut.',
      ['FROM|which table|accent', 'WHERE|which rows survive|info', 'SELECT|which columns and expressions|good', 'ORDER BY|sort the rows|warn', 'LIMIT|keep the first n|accent2'],
      { layout: 'row', perRow: 5, at: 'end' },
    ),
    lab(
      'insert-lab',
      'Example 1',
      'sql',
      'An SQL editor with the SIA database already created and filled, with a query that inserts three new students and selects the students with a number of 8 or more.',
      'Insert a student with grade level 13 and read the error; then insert the same student with grade level 12.',
      `INSERT INTO students VALUES (9, 'Zara Khan', 'zara@student.example', 9);
INSERT INTO students (student_id, name, email, grade_level) VALUES
  (10, 'Omar Faruk', 'omar@student.example', 12),
  (11, 'Lina Das', 'lina@student.example', 10);
SELECT student_id, name, grade_level FROM students WHERE student_id >= 8 ORDER BY student_id;`,
      { setup: `PRAGMA foreign_keys = ON;
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12)
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  teacher_id INTEGER NOT NULL REFERENCES teachers (teacher_id)
);
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL REFERENCES students (student_id),
  course_id INTEGER NOT NULL REFERENCES courses (course_id),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example'), (2, 'Nusrat Jahan', 'nusrat@school.example'), (3, 'Imran Hossain', 'imran@school.example');
INSERT INTO students VALUES
  (1, 'Ayesha Rahman', 'ayesha@student.example', 10),
  (2, 'Tanvir Ahmed', 'tanvir@student.example', 10),
  (3, 'Sadia Islam', 'sadia@student.example', 9),
  (4, 'Nabil Hasan', 'nabil@student.example', 11),
  (5, 'Mim Akter', 'mim@student.example', 10),
  (6, 'Rafi Karim', 'rafi@student.example', 12),
  (7, 'Tasnim Noor', 'tasnim@student.example', 9),
  (8, 'Fahim Sarker', 'fahim@student.example', 11);
INSERT INTO courses VALUES (101, 'Mathematics', 4, 1), (102, 'Physics', 3, 2), (103, 'ICT', 2, 3), (104, 'English', 3, 2);
INSERT INTO enrolments VALUES
  (1, 101, 92), (1, 102, 85), (1, 103, 78),
  (2, 101, 67), (2, 103, 88),
  (3, 101, 74), (3, 104, 91),
  (4, 102, 55), (4, 103, 69), (4, 104, 72),
  (5, 101, 88), (5, 102, 93), (5, 104, 81),
  (6, 101, 45), (6, 103, 60),
  (7, 104, 66), (7, 103, 95);`, filename: 'insert.sql', at: 'end' },
    ),
    lab(
      'update-lab',
      'Example 2',
      'sql',
      'An SQL editor with the SIA database already created and filled, with statements that correct one score, move the students of grade 9 to grade 10, delete one enrolment and count the results.',
      'Replace the DELETE by a SELECT with the same WHERE and check that it finds exactly one row before you delete.',
      `UPDATE enrolments SET score = 54 WHERE student_id = 6 AND course_id = 101;
UPDATE students SET grade_level = 10 WHERE grade_level = 9;
DELETE FROM enrolments WHERE student_id = 7 AND course_id = 104;
SELECT 'enrolments left' AS what, COUNT(*) AS value FROM enrolments
UNION ALL SELECT 'students in grade 10', COUNT(*) FROM students WHERE grade_level = 10
UNION ALL SELECT 'Rafi''s score in Mathematics', score FROM enrolments WHERE student_id = 6 AND course_id = 101;`,
      { setup: `PRAGMA foreign_keys = ON;
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12)
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  teacher_id INTEGER NOT NULL REFERENCES teachers (teacher_id)
);
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL REFERENCES students (student_id),
  course_id INTEGER NOT NULL REFERENCES courses (course_id),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example'), (2, 'Nusrat Jahan', 'nusrat@school.example'), (3, 'Imran Hossain', 'imran@school.example');
INSERT INTO students VALUES
  (1, 'Ayesha Rahman', 'ayesha@student.example', 10),
  (2, 'Tanvir Ahmed', 'tanvir@student.example', 10),
  (3, 'Sadia Islam', 'sadia@student.example', 9),
  (4, 'Nabil Hasan', 'nabil@student.example', 11),
  (5, 'Mim Akter', 'mim@student.example', 10),
  (6, 'Rafi Karim', 'rafi@student.example', 12),
  (7, 'Tasnim Noor', 'tasnim@student.example', 9),
  (8, 'Fahim Sarker', 'fahim@student.example', 11);
INSERT INTO courses VALUES (101, 'Mathematics', 4, 1), (102, 'Physics', 3, 2), (103, 'ICT', 2, 3), (104, 'English', 3, 2);
INSERT INTO enrolments VALUES
  (1, 101, 92), (1, 102, 85), (1, 103, 78),
  (2, 101, 67), (2, 103, 88),
  (3, 101, 74), (3, 104, 91),
  (4, 102, 55), (4, 103, 69), (4, 104, 72),
  (5, 101, 88), (5, 102, 93), (5, 104, 81),
  (6, 101, 45), (6, 103, 60),
  (7, 104, 66), (7, 103, 95);`, filename: 'update_delete.sql', at: 'end' },
    ),
    lab(
      'filter-lab',
      'Example 3',
      'sql',
      'An SQL editor with the SIA database already created and filled, with a query that finds the students whose name starts with T or contains the letters im, sorted by name.',
      'Write a query for the students of grade 10 whose name contains an a, sorted by name.',
      `SELECT name FROM students WHERE name LIKE 'T%' OR name LIKE '%im%' ORDER BY name;`,
      { setup: `PRAGMA foreign_keys = ON;
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12)
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  teacher_id INTEGER NOT NULL REFERENCES teachers (teacher_id)
);
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL REFERENCES students (student_id),
  course_id INTEGER NOT NULL REFERENCES courses (course_id),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example'), (2, 'Nusrat Jahan', 'nusrat@school.example'), (3, 'Imran Hossain', 'imran@school.example');
INSERT INTO students VALUES
  (1, 'Ayesha Rahman', 'ayesha@student.example', 10),
  (2, 'Tanvir Ahmed', 'tanvir@student.example', 10),
  (3, 'Sadia Islam', 'sadia@student.example', 9),
  (4, 'Nabil Hasan', 'nabil@student.example', 11),
  (5, 'Mim Akter', 'mim@student.example', 10),
  (6, 'Rafi Karim', 'rafi@student.example', 12),
  (7, 'Tasnim Noor', 'tasnim@student.example', 9),
  (8, 'Fahim Sarker', 'fahim@student.example', 11);
INSERT INTO courses VALUES (101, 'Mathematics', 4, 1), (102, 'Physics', 3, 2), (103, 'ICT', 2, 3), (104, 'English', 3, 2);
INSERT INTO enrolments VALUES
  (1, 101, 92), (1, 102, 85), (1, 103, 78),
  (2, 101, 67), (2, 103, 88),
  (3, 101, 74), (3, 104, 91),
  (4, 102, 55), (4, 103, 69), (4, 104, 72),
  (5, 101, 88), (5, 102, 93), (5, 104, 81),
  (6, 101, 45), (6, 103, 60),
  (7, 104, 66), (7, 103, 95);`, filename: 'filter.sql', at: 'end' },
    ),
  ],
  [`${M}/4`]: [
    venn(
      'inner-join-venn',
      'Joins: putting tables back together',
      'A Venn diagram of two sets, all students and the students who have enrolments. The seven students Ayesha, Tanvir, Sadia, Nabil, Mim, Rafi and Tasnim are in the overlap. Fahim is only in the set of all students because he has no enrolment. An inner join returns only the overlap.',
      'INNER JOIN: only the rows that have a match on both sides. Fahim has no enrolment, so he is not in the result.',
      ['Students', 'Enrolled'],
      { Students: ['Fahim'], 'Students,Enrolled': ['Ayesha', 'Tanvir', 'Sadia', 'Nabil', 'Mim', 'Rafi', 'Tasnim'] },
      { highlight: ['Students,Enrolled'], at: 'end' },
    ),
    venn(
      'left-join-venn',
      'Joins: putting tables back together',
      'The same Venn diagram with the left set highlighted completely. A left join returns every student: the seven who have enrolments with their course data, and Fahim with NULL in the columns that come from the enrolments.',
      'LEFT JOIN: every row of the left table, with NULL where there is no match. Filter on that NULL to find who is missing.',
      ['Students', 'Enrolled'],
      { Students: ['Fahim'], 'Students,Enrolled': ['Ayesha', 'Tanvir', 'Sadia', 'Nabil', 'Mim', 'Rafi', 'Tasnim'] },
      { highlight: ['Students', 'Students,Enrolled'], at: 'end' },
    ),
    table(
      'join-types',
      'Joins: putting tables back together',
      'A table of the kinds of join. An inner join keeps only matching pairs. A left join keeps all rows of the left table and fills NULL where nothing matches. A right join is a left join with the tables swapped. A cross join, with no ON condition, pairs every row with every row: eight students and four courses make 32 rows.',
      'Choose the join by the question: matches only (INNER), everyone on the left (LEFT), or every combination (CROSS, rarely).',
      ['Join', 'Returns', 'With the SIA data'],
      [
        ['INNER JOIN', 'only the rows that match on both sides', 'students with enrolments: 17 rows for 7 students'],
        ['LEFT JOIN', 'all rows of the left table, NULL where there is no match', 'every student, Fahim with NULL'],
        ['RIGHT JOIN', 'all rows of the right table (a left join with the tables swapped)', 'rarely needed'],
        ['CROSS JOIN (no ON)', 'every row with every row', '8 students × 4 courses = 32 rows'],
      ],
      { at: 'end', highlights: [{ row: 3, col: 2, tone: 'warn', note: 'usually a mistake' }] },
    ),
    table(
      'aggregates-table',
      'Aggregation and grouping',
      'A table of the aggregate functions with their results on the 17 scores of the school database. COUNT star counts 17 rows. SUM of the scores is 1299. The average rounds to 76.4. The minimum is 45 and the maximum is 95. COUNT of a column skips NULL values.',
      'Many rows in, one value out. With GROUP BY you get one value for each group instead of one for the whole table.',
      ['Function', 'What it returns', 'On all 17 scores'],
      [
        ['COUNT(*)', 'the number of rows', '17'],
        ['COUNT(score)', 'the number of rows where score is not NULL', '17'],
        ['SUM(score)', 'the total', '1299'],
        ['AVG(score)', 'the mean', '76.4 (ROUND(AVG(score), 1))'],
        ['MIN(score), MAX(score)', 'the smallest and the largest', '45 and 95'],
      ],
      { at: 'end' },
    ),
    flow(
      'query-pipeline',
      'Aggregation and grouping',
      'Seven steps in the order in which a query with grouping is evaluated. FROM and JOIN build the rows, WHERE filters rows, GROUP BY forms groups, HAVING filters groups, SELECT computes the columns and aggregates, ORDER BY sorts and LIMIT cuts. WHERE works on rows before grouping and HAVING works on groups after it.',
      'Rows are filtered by WHERE, then grouped, then the groups are filtered by HAVING. That is the whole difference.',
      ['FROM, JOIN|build the rows|accent', 'WHERE|filter rows|info', 'GROUP BY|form groups|good', 'HAVING|filter groups|warn', 'SELECT|columns and aggregates|accent2', 'ORDER BY, LIMIT|sort and cut|info'],
      { layout: 'row', perRow: 3, at: 'end' },
    ),
    cards(
      'acid-cards',
      'Transactions and ACID',
      'Four cards for the ACID properties. Atomicity: a transaction happens completely or not at all. Consistency: the constraints hold before and after, so the data moves from one valid state to another. Isolation: transactions that run at the same time do not see each other’s unfinished work. Durability: once committed, a change survives a crash or power failure.',
      'ACID: the four promises of a transaction.',
      [
        { title: 'Atomicity', subtitle: 'all or nothing', bullets: ['both updates or neither', 'a crash rolls back'], tone: 'accent' },
        { title: 'Consistency', subtitle: 'valid before and after', bullets: ['constraints always hold', 'no negative balance'], tone: 'good' },
        { title: 'Isolation', subtitle: 'no half-done views', bullets: ['users do not see unfinished work', 'no lost updates'], tone: 'info' },
        { title: 'Durability', subtitle: 'committed means kept', bullets: ['survives a crash', 'written to disk'], tone: 'warn' },
      ],
      { at: 'end' },
    ),
    sequence(
      'transaction-sequence',
      'Transactions and ACID',
      'A sequence diagram of a bank transfer that fails halfway. The application sends BEGIN, then an UPDATE that subtracts 500 taka from account A, which succeeds. The second UPDATE that should add 500 taka to account B fails because the connection drops. The database rolls the transaction back, so account A gets its 500 taka back and the money is not lost.',
      'Without a transaction the 500 taka would be gone. With one, the half-finished work is undone.',
      [['app', 'Application'], ['db', 'Database']],
      [
        { from: 'app', to: 'db', label: 'BEGIN' },
        { from: 'app', to: 'db', label: 'UPDATE account A: minus 500', note: 'done, but not yet permanent' },
        { from: 'app', to: 'db', label: 'UPDATE account B: plus 500', note: 'the connection drops here' },
        { from: 'db', to: 'app', label: 'ROLLBACK (automatic)', note: 'account A has its 500 taka back', dashed: true },
      ],
      { at: 'end' },
    ),
    lab(
      'join-lab',
      'Example 1',
      'sql',
      'An SQL editor with the SIA database already created and filled, with a query that joins enrolments, students and courses and lists the Mathematics scores from the highest to the lowest.',
      'Change the title to Physics, then remove the ON condition of the join with courses and count the rows.',
      `SELECT s.name AS student, c.title AS course, e.score
FROM enrolments AS e
JOIN students AS s ON s.student_id = e.student_id
JOIN courses AS c ON c.course_id = e.course_id
WHERE c.title = 'Mathematics'
ORDER BY e.score DESC;`,
      { setup: `PRAGMA foreign_keys = ON;
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12)
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  teacher_id INTEGER NOT NULL REFERENCES teachers (teacher_id)
);
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL REFERENCES students (student_id),
  course_id INTEGER NOT NULL REFERENCES courses (course_id),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example'), (2, 'Nusrat Jahan', 'nusrat@school.example'), (3, 'Imran Hossain', 'imran@school.example');
INSERT INTO students VALUES
  (1, 'Ayesha Rahman', 'ayesha@student.example', 10),
  (2, 'Tanvir Ahmed', 'tanvir@student.example', 10),
  (3, 'Sadia Islam', 'sadia@student.example', 9),
  (4, 'Nabil Hasan', 'nabil@student.example', 11),
  (5, 'Mim Akter', 'mim@student.example', 10),
  (6, 'Rafi Karim', 'rafi@student.example', 12),
  (7, 'Tasnim Noor', 'tasnim@student.example', 9),
  (8, 'Fahim Sarker', 'fahim@student.example', 11);
INSERT INTO courses VALUES (101, 'Mathematics', 4, 1), (102, 'Physics', 3, 2), (103, 'ICT', 2, 3), (104, 'English', 3, 2);
INSERT INTO enrolments VALUES
  (1, 101, 92), (1, 102, 85), (1, 103, 78),
  (2, 101, 67), (2, 103, 88),
  (3, 101, 74), (3, 104, 91),
  (4, 102, 55), (4, 103, 69), (4, 104, 72),
  (5, 101, 88), (5, 102, 93), (5, 104, 81),
  (6, 101, 45), (6, 103, 60),
  (7, 104, 66), (7, 103, 95);`, filename: 'joins.sql', at: 'end' },
    ),
    lab(
      'group-lab',
      'Example 2',
      'sql',
      'An SQL editor with the SIA database already created and filled, with a query that groups the enrolments by course and shows the number of students, the average, the lowest and the highest score.',
      'Add HAVING AVG(e.score) >= 75 to the query and see which courses remain.',
      `SELECT c.title, COUNT(*) AS students, ROUND(AVG(e.score), 1) AS average, MIN(e.score) AS lowest, MAX(e.score) AS highest
FROM enrolments AS e
JOIN courses AS c ON c.course_id = e.course_id
GROUP BY c.course_id
ORDER BY average DESC;`,
      { setup: `PRAGMA foreign_keys = ON;
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12)
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  teacher_id INTEGER NOT NULL REFERENCES teachers (teacher_id)
);
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL REFERENCES students (student_id),
  course_id INTEGER NOT NULL REFERENCES courses (course_id),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example'), (2, 'Nusrat Jahan', 'nusrat@school.example'), (3, 'Imran Hossain', 'imran@school.example');
INSERT INTO students VALUES
  (1, 'Ayesha Rahman', 'ayesha@student.example', 10),
  (2, 'Tanvir Ahmed', 'tanvir@student.example', 10),
  (3, 'Sadia Islam', 'sadia@student.example', 9),
  (4, 'Nabil Hasan', 'nabil@student.example', 11),
  (5, 'Mim Akter', 'mim@student.example', 10),
  (6, 'Rafi Karim', 'rafi@student.example', 12),
  (7, 'Tasnim Noor', 'tasnim@student.example', 9),
  (8, 'Fahim Sarker', 'fahim@student.example', 11);
INSERT INTO courses VALUES (101, 'Mathematics', 4, 1), (102, 'Physics', 3, 2), (103, 'ICT', 2, 3), (104, 'English', 3, 2);
INSERT INTO enrolments VALUES
  (1, 101, 92), (1, 102, 85), (1, 103, 78),
  (2, 101, 67), (2, 103, 88),
  (3, 101, 74), (3, 104, 91),
  (4, 102, 55), (4, 103, 69), (4, 104, 72),
  (5, 101, 88), (5, 102, 93), (5, 104, 81),
  (6, 101, 45), (6, 103, 60),
  (7, 104, 66), (7, 103, 95);`, filename: 'grouping.sql', at: 'end' },
    ),
    lab(
      'transaction-lab',
      'Example 3',
      'sql',
      'An SQL editor with the SIA database already created and filled, with a script of two transactions: one that adds an enrolment and commits, and one that deletes every enrolment and rolls back, followed by a count.',
      'Replace the final ROLLBACK by COMMIT and look at the count: the whole table is gone. Then put the ROLLBACK back.',
      `BEGIN;
INSERT INTO enrolments (student_id, course_id, score) VALUES (8, 101, 70);
COMMIT;
BEGIN;
DELETE FROM enrolments;
ROLLBACK;
SELECT COUNT(*) AS enrolments_stored FROM enrolments;`,
      { setup: `PRAGMA foreign_keys = ON;
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12)
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  teacher_id INTEGER NOT NULL REFERENCES teachers (teacher_id)
);
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL REFERENCES students (student_id),
  course_id INTEGER NOT NULL REFERENCES courses (course_id),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example'), (2, 'Nusrat Jahan', 'nusrat@school.example'), (3, 'Imran Hossain', 'imran@school.example');
INSERT INTO students VALUES
  (1, 'Ayesha Rahman', 'ayesha@student.example', 10),
  (2, 'Tanvir Ahmed', 'tanvir@student.example', 10),
  (3, 'Sadia Islam', 'sadia@student.example', 9),
  (4, 'Nabil Hasan', 'nabil@student.example', 11),
  (5, 'Mim Akter', 'mim@student.example', 10),
  (6, 'Rafi Karim', 'rafi@student.example', 12),
  (7, 'Tasnim Noor', 'tasnim@student.example', 9),
  (8, 'Fahim Sarker', 'fahim@student.example', 11);
INSERT INTO courses VALUES (101, 'Mathematics', 4, 1), (102, 'Physics', 3, 2), (103, 'ICT', 2, 3), (104, 'English', 3, 2);
INSERT INTO enrolments VALUES
  (1, 101, 92), (1, 102, 85), (1, 103, 78),
  (2, 101, 67), (2, 103, 88),
  (3, 101, 74), (3, 104, 91),
  (4, 102, 55), (4, 103, 69), (4, 104, 72),
  (5, 101, 88), (5, 102, 93), (5, 104, 81),
  (6, 101, 45), (6, 103, 60),
  (7, 104, 66), (7, 103, 95);`, filename: 'transactions.sql', at: 'end' },
    ),
    lab(
      'safe-enrol-lab',
      'Example 3',
      'sql',
      'An SQL editor with the SIA database already created and filled, with two conditional inserts that enrol students in the ICT course only if fewer than six students are enrolled and the student is not enrolled already.',
      'Change the capacity from 6 to 5 and see which student is refused.',
      `INSERT INTO enrolments (student_id, course_id)
SELECT 8, 103
WHERE (SELECT COUNT(*) FROM enrolments WHERE course_id = 103) < 6
  AND NOT EXISTS (SELECT 1 FROM enrolments WHERE student_id = 8 AND course_id = 103);
INSERT INTO enrolments (student_id, course_id)
SELECT 3, 103
WHERE (SELECT COUNT(*) FROM enrolments WHERE course_id = 103) < 6
  AND NOT EXISTS (SELECT 1 FROM enrolments WHERE student_id = 3 AND course_id = 103);
SELECT COUNT(*) AS students_in_ICT FROM enrolments WHERE course_id = 103;`,
      { setup: `PRAGMA foreign_keys = ON;
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 9 AND 12)
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  teacher_id INTEGER NOT NULL REFERENCES teachers (teacher_id)
);
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL REFERENCES students (student_id),
  course_id INTEGER NOT NULL REFERENCES courses (course_id),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example'), (2, 'Nusrat Jahan', 'nusrat@school.example'), (3, 'Imran Hossain', 'imran@school.example');
INSERT INTO students VALUES
  (1, 'Ayesha Rahman', 'ayesha@student.example', 10),
  (2, 'Tanvir Ahmed', 'tanvir@student.example', 10),
  (3, 'Sadia Islam', 'sadia@student.example', 9),
  (4, 'Nabil Hasan', 'nabil@student.example', 11),
  (5, 'Mim Akter', 'mim@student.example', 10),
  (6, 'Rafi Karim', 'rafi@student.example', 12),
  (7, 'Tasnim Noor', 'tasnim@student.example', 9),
  (8, 'Fahim Sarker', 'fahim@student.example', 11);
INSERT INTO courses VALUES (101, 'Mathematics', 4, 1), (102, 'Physics', 3, 2), (103, 'ICT', 2, 3), (104, 'English', 3, 2);
INSERT INTO enrolments VALUES
  (1, 101, 92), (1, 102, 85), (1, 103, 78),
  (2, 101, 67), (2, 103, 88),
  (3, 101, 74), (3, 104, 91),
  (4, 102, 55), (4, 103, 69), (4, 104, 72),
  (5, 101, 88), (5, 102, 93), (5, 104, 81),
  (6, 101, 45), (6, 103, 60),
  (7, 104, 66), (7, 103, 95);`, filename: 'safe_enrolment.sql', at: 'end' },
    ),
  ],
  [`${M}/5`]: [
    flow(
      'page-journey',
      'How a page reaches the screen',
      'Five steps from the address to the pixels. The browser asks the server for index.html. The server sends the HTML. The browser reads it and asks for the style sheet, images and scripts it mentions. It builds the DOM tree and applies the CSS. Finally it paints the page on the screen.',
      'A page is a conversation: one file leads to the next, and the browser builds the picture from all of them.',
      ['Browser|asks for index.html|accent', 'Server|sends the HTML|info', 'Browser|asks for CSS, images, scripts|accent', 'DOM|a tree of the page|good', 'Screen|the page is painted|warn'],
      { layout: 'row', perRow: 5, at: 'end' },
    ),
    tree(
      'dom-tree',
      'How a page reaches the screen',
      'The DOM tree of the first example page. The root html has two children: head, with meta and title, and body. The body contains an h1, a paragraph with a strong element, an unordered list with four list items and a second paragraph with a link.',
      'The browser keeps this tree, not the text. CSS is matched against its nodes and JavaScript changes it.',
      {
        label: 'html',
        children: [
          { label: 'head', tone: 'info', children: [{ label: 'meta' }, { label: 'title' }] },
          {
            label: 'body',
            tone: 'info',
            children: [
              { label: 'h1', tone: 'good' },
              { label: 'p', tone: 'good', children: [{ label: 'strong' }] },
              { label: 'ul', tone: 'good', children: [{ label: 'li ×4' }] },
              { label: 'p', tone: 'good', children: [{ label: 'a' }] },
            ],
          },
        ],
      },
      { at: 'end' },
    ),
    table(
      'html-elements',
      'HTML: structure',
      'A table of common HTML elements. h1 to h6 are headings. p is a paragraph. ul and ol with li make bulleted and numbered lists. a with href makes a link. img with src and alt shows a picture. table with tr, th and td shows tabular data. form with label, input and button collects input. header, nav, main, section and footer are semantic containers.',
      'The elements you will use most. Semantic containers say what a block is; the rest say what the content is.',
      ['Element', 'What it is for', 'Example'],
      [
        ['h1 to h6', 'headings, in order', '<h2>Student directory</h2>'],
        ['p, strong, em', 'paragraphs and emphasis', '<p>Welcome to <strong>our</strong> school.</p>'],
        ['ul, ol, li', 'bulleted and numbered lists', '<ul><li>Maths</li><li>ICT</li></ul>'],
        ['a', 'a link', '<a href="https://example.com">school site</a>'],
        ['img', 'a picture (always with alt)', '<img src="logo.png" alt="School logo">'],
        ['table, tr, th, td', 'tabular data', '<tr><td>Ayesha</td><td>10</td></tr>'],
        ['form, label, input, button', 'a form', '<label for="q">Search</label> <input id="q">'],
        ['header, nav, main, section, footer', 'semantic page parts', '<main><section>...</section></main>'],
      ],
      { at: 'end', highlights: [{ row: 4, col: 1, tone: 'warn', note: 'alt text matters' }] },
    ),
    table(
      'css-selectors',
      'CSS: presentation',
      'A table of CSS selectors. An element selector such as p matches every paragraph. A class selector such as .note matches elements with class note. An id selector such as #search matches the one element with id search. A descendant selector such as nav a matches links inside a nav. A pseudo-class such as a:hover matches a link while the mouse is over it. A selector with nth-child, such as tbody tr:nth-child(even), matches every second row.',
      'A selector says which elements a rule applies to. The more specific the selector, the stronger the rule.',
      ['Selector', 'Matches', 'Specificity'],
      [
        ['p', 'every paragraph', 'low'],
        ['.note', 'every element with class="note"', 'medium'],
        ['#search', 'the one element with id="search"', 'high'],
        ['nav a', 'links inside a nav', 'low to medium'],
        ['a:hover', 'a link while the mouse is over it', 'medium'],
        ['tbody tr:nth-child(even)', 'every second table row', 'medium'],
      ],
      { at: 'end' },
    ),
    grid(
      'box-model',
      'The box model, flexbox and responsive design',
      'A diagram of the CSS box model as nested rectangles. At the centre is the content. Around it is the padding, then the border, then the margin, the empty space outside the border. The width of the content plus the padding and border is the size of the box.',
      'Every element is four nested layers. Padding is inside the border, margin is outside it.',
      [['content', 'rect', 'content', 0, 1, 'accent', 'text, images']],
      [],
      {
        dx: 170,
        dy: 100,
        w: 130,
        h: 56,
        at: 'end',
        groups: [
          { label: 'margin', col: -0.4, row: 0.3, cols: 1.8, rows: 2.4, tone: 'warn' },
          { label: 'border', col: -0.21, row: 0.56, cols: 1.4, rows: 1.86, tone: 'accent' },
          { label: 'padding', col: -0.11, row: 0.86, cols: 1.22, rows: 1.36, tone: 'good' },
        ],
      },
    ),
    lab(
      'first-page-lab',
      'Example 1',
      'html',
      'An HTML editor with the first example page, a heading, two paragraphs, a list of courses and a link, with a live preview.',
      'Change the ul to an ol and add a fifth course.',
      `<!DOCTYPE html>
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
</html>`,
      { filename: 'index.html', at: 'end' },
    ),
    lab(
      'table-form-lab',
      'Example 2',
      'html',
      'An HTML editor with the second example page, which has a semantic header, navigation, main section, a search form and a table of four students, with a live preview.',
      'Add a third column with the e-mail address of each student as a mailto link.',
      `<!DOCTYPE html>
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
</html>`,
      { filename: 'index.html', at: 'end' },
    ),
    lab(
      'styled-page-lab',
      'Example 3',
      'html',
      'An HTML editor with the third example page, in which CSS gives the header a dark blue background, lays out the navigation with flexbox, adds zebra stripes to the table and hides a note on narrow screens, with a live preview.',
      'Change the value of --brand and watch how many parts of the page change; then change 30rem in the media query to 80rem.',
      `<!DOCTYPE html>
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
</html>`,
      { filename: 'index.html', at: 'end' },
    ),
    lab(
      'directory-workbench',
      'Instructions',
      'html',
      'An HTML editor with an empty page skeleton for the project, with a head that has the viewport tag, the title and an empty style element, and an empty body, and a live preview.',
      'Your workbench for the student directory page. Build the structure first, then the style.',
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Greenfield School: Student Directory</title>
  <style>
    /* Write your CSS here: variables, header, navigation, table, media query */
  </style>
</head>
<body>
  <!-- Write your header, main (with the form and the table) and footer here -->
</body>
</html>`,
      { filename: 'index.html', at: 'end' },
    ),
  ],
  [`${M}/6`]: [
    table(
      'array-methods',
      'JavaScript in the browser',
      'A table of the array methods filter, map, find, sort, reduce, some and every, each with an example on the array 3, 8, 5 and its result. Filter keeps the items that pass a test, map transforms every item, find returns the first match, sort reorders with a compare function, reduce combines all items into one value, and some and every ask whether any or all items pass.',
      'Seven methods cover most of what you do with lists. Each takes a function that decides what to do with one item.',
      ['Method', 'What it does', 'Example', 'Result'],
      [
        ['filter', 'keeps the items that pass a test', '[3, 8, 5].filter((n) => n > 4)', '[8, 5]'],
        ['map', 'transforms every item', '[3, 8, 5].map((n) => n * 2)', '[6, 16, 10]'],
        ['find', 'the first item that passes', '[3, 8, 5].find((n) => n > 4)', '8'],
        ['sort', 'reorders (give a compare function)', '[3, 8, 5].sort((a, b) => a - b)', '[3, 5, 8]'],
        ['reduce', 'combines all items into one value', '[3, 8, 5].reduce((sum, n) => sum + n, 0)', '16'],
        ['some, every', 'does any / do all items pass?', '[3, 8].some((n) => n > 5)', 'true'],
      ],
      { at: 'end', highlights: [{ row: 3, col: 1, tone: 'warn', note: 'changes the array itself' }] },
    ),
    table(
      'dom-methods',
      'The DOM and events',
      'A table of the most useful DOM methods and properties. querySelector finds the first element that matches a CSS selector; querySelectorAll finds all of them. textContent reads or sets the plain text of an element. createElement makes a new element and append adds it to a parent. replaceChildren empties an element. value reads what the user typed in a field. addEventListener attaches a function to an event such as input, click or submit.',
      'Find an element, read or change it, and react to events. That is nearly all of the DOM that a first project needs.',
      ['You want to...', 'Use', 'Example'],
      [
        ['find an element', 'querySelector', 'document.querySelector("#list")'],
        ['read or set its text safely', 'textContent', 'item.textContent = name;'],
        ['make and add an element', 'createElement, append', 'list.append(document.createElement("li"));'],
        ['empty an element', 'replaceChildren', 'list.replaceChildren();'],
        ['read what the user typed', 'value', 'input.value.trim()'],
        ['react to the user', 'addEventListener', 'input.addEventListener("input", render);'],
        ['stop a form from reloading the page', 'event.preventDefault', 'event.preventDefault();'],
      ],
      { at: 'end', highlights: [{ row: 1, col: 1, tone: 'good', note: 'never innerHTML for user text' }] },
    ),
    flow(
      'render-pattern',
      'The DOM and events',
      'A four-step cycle of an interactive page. An event such as typing or clicking happens. A handler function changes the data or the filter. The render function rebuilds the visible part of the page from the data. The browser shows the new page, and the cycle waits for the next event.',
      'Events change the data, render() redraws from the data. One function builds the view, so the page and the data cannot disagree.',
      ['Event|typing, click, submit|accent', 'Handler|changes the data|info', 'render()|rebuilds the view from the data|good', 'Browser|shows the new page|warn'],
      { layout: 'cycle', at: 'end' },
    ),
    sequence(
      'api-sequence',
      'APIs and JSON',
      'A sequence diagram of a page that loads its data through an API. The page in the browser asks the server for GET /api/students. The server runs the SQL query SELECT star FROM students on the database. The database returns the rows. The server turns the rows into JSON and sends them with the status 200. The page parses the JSON and renders the table.',
      'The page never talks to the database. The server runs the SQL and sends JSON; the page only draws it.',
      [['page', 'Page (JavaScript)'], ['server', 'Server (API)'], ['db', 'Database']],
      [
        { from: 'page', to: 'server', label: 'GET /api/students' },
        { from: 'server', to: 'db', label: 'SELECT * FROM students' },
        { from: 'db', to: 'server', label: 'rows', dashed: true },
        { from: 'server', to: 'page', label: '200 OK + JSON', note: '[{"id":1,"name":"Ayesha Rahman",...}]', dashed: true },
        { from: 'page', to: 'page', label: 'JSON.parse, then render()' },
      ],
      { at: 'end' },
    ),
    lab(
      'data-lab',
      'Example 1',
      'javascript',
      'A JavaScript editor with the Example 1 program, which keeps students as an array of objects, finds the grade 10 students with filter and map, ranks the averages with sort and finds a student without scores, with its expected output.',
      'Add a ninth student with one score and see whether the best three change; then print the total number of scores with reduce.',
      `const students = [
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
  console.log(\`  \${name}: \${value}\`);
}

const nobody = students.find((s) => s.scores.length === 0);
console.log("no scores yet:", nobody ? nobody.name : "nobody");

const perGrade = Object.fromEntries([9, 10, 11, 12].map((g) => [g, students.filter((s) => s.grade === g).length]));
console.log("students per grade:", JSON.stringify(perGrade));`,
      { expected: 'grade 10: Ayesha Rahman, Tanvir Ahmed, Mim Akter\nbest three:\n  Mim Akter: 87.3\n  Ayesha Rahman: 85\n  Sadia Islam: 82.5\nno scores yet: Fahim Sarker\nstudents per grade: {"9":2,"10":3,"11":2,"12":1}', filename: 'students.js', at: 'end' },
    ),
    lab(
      'live-filter-lab',
      'Example 2',
      'html',
      'An HTML editor with the Example 2 page, which draws a list of students from an array and filters it as the user types, with a live preview.',
      'Type ta in the filter, then change includes to startsWith and see which names match.',
      `<!DOCTYPE html>
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
      count.textContent = \`Showing \${shown.length} of \${students.length} students\`;
    }

    input.addEventListener("input", render);
    render();
  </script>
</body>
</html>`,
      { filename: 'index.html', at: 'end' },
    ),
    lab(
      'api-lab',
      'Example 3',
      'javascript',
      'A JavaScript editor with the Example 3 program, in which an async function loads JSON from a pretend API, handles a 404 with try and catch and converts between JSON text and objects, with its expected output.',
      'Change the first URL to /api/courses and find the line that prints the error.',
      `// A pretend server: it answers /api/students with JSON text and everything else with 404, like a real API.
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
    if (!response.ok) throw new Error(\`the server answered \${response.status}\`);
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

main();`,
      { expected: 'loaded 2 students: Ayesha Rahman and Tanvir Ahmed\ncould not load: the server answered 404\nthen 0 students\n{"id":1,"name":"Ayesha Rahman","grade":10} is a string and Ayesha Rahman is back as an object', filename: 'api.js', at: 'end' },
    ),
    lab(
      'interactive-workbench',
      'Instructions',
      'html',
      'An HTML editor with an empty page skeleton for the project: a heading, a comment where the controls and the table go, and a script element with four numbered steps, with a live preview.',
      'Your workbench for the interactive directory. Write the functions first, then the page.',
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Greenfield School: Student Directory</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; }
  </style>
</head>
<body>
  <h1>Student directory</h1>
  <!-- Add the search input, the grade select, the count, the table and the add form here -->
  <script>
    // 1. the students array
    // 2. filterStudents and validateStudent (pure functions)
    // 3. render()
    // 4. the event listeners
  </script>
</body>
</html>`,
      { filename: 'index.html', at: 'end' },
    ),
  ],
  [`${M}/7`]: [
    flow(
      'sdlc-cycle',
      'The software development life cycle',
      'A cycle of six phases: requirements, design, build, test, deploy and maintain. Maintenance feeds new requirements back into the cycle, so the life cycle never really ends while the software is in use.',
      'The phases are the same in every method; the methods differ in how big a step is and how often the cycle turns.',
      ['Requirements|what and why|accent', 'Design|how it is built|info', 'Build|write the code|good', 'Test|does it work?|warn', 'Deploy|put it into use|accent2', 'Maintain|fix and extend|info'],
      { layout: 'cycle', at: 'end' },
    ),
    table(
      'sdlc-models',
      'The software development life cycle',
      'A table that compares four ways of organising development. Waterfall does each phase completely before the next and suits fixed, well-understood requirements. Iterative and incremental development repeats the cycle in small pieces. Agile and Scrum deliver working software in sprints of one to four weeks and welcome change. DevOps adds automatic building, testing and deployment so that small changes reach users safely and often.',
      'No method is best. Choose by how well the requirements are known and how often they change.',
      ['Method', 'Idea', 'Good when', 'Risk'],
      [
        ['Waterfall', 'finish each phase before the next', 'requirements are fixed and well understood', 'working software only at the end; changes are expensive'],
        ['Iterative, incremental', 'repeat the cycle in small pieces', 'the product can grow step by step', 'the architecture can drift without care'],
        ['Agile (Scrum)', 'sprints of 1 to 4 weeks, working software each time', 'requirements change and users can give feedback', 'too little documentation or planning if misused'],
        ['DevOps', 'automate build, test and deployment', 'small changes must reach users often', 'needs good tests and tools'],
      ],
      { at: 'end' },
    ),
    flow(
      'scrum-loop',
      'The software development life cycle',
      'The Scrum loop in five steps. The product backlog is the ordered list of wanted features. Sprint planning chooses what fits the next sprint. The sprint, one to four weeks with a daily stand-up, builds a working increment. The sprint review shows it to the users. The retrospective asks how the team can work better, and the loop starts again.',
      'Scrum in one picture: plan a small piece, build it, show it, learn, repeat.',
      ['Product backlog|the ordered wish list|accent', 'Sprint planning|choose what fits|info', 'Sprint|1 to 4 weeks, daily stand-up|good', 'Sprint review|show the working increment|warn', 'Retrospective|how can we improve?|accent2'],
      { layout: 'cycle', at: 'end' },
    ),
    table(
      'requirement-types',
      'Requirements',
      'A table of functional and non-functional requirements for the school application. Functional: the user can add a student. Performance: the directory shows 1,000 students in under two seconds. Security: passwords are stored as salted slow hashes. Accessibility: every function works with a keyboard and a screen reader. Reliability: no data is lost if the power fails during a change.',
      'What the system does (functional) and how well it does it (non-functional). Both must be testable.',
      ['Kind', 'Example for the SIA', 'How to test it'],
      [
        ['Functional', 'An administrator can add a student with a name, an e-mail address and a grade level', 'add a student and see it in the table'],
        ['Performance', 'The directory shows 1,000 students in under 2 seconds', 'load 1,000 rows and time the page'],
        ['Security', 'Passwords are stored as salted slow hashes', 'inspect the user table: no plain passwords'],
        ['Accessibility', 'Every function works with a keyboard and a screen reader', 'use the page without a mouse'],
        ['Reliability', 'No data is lost if the power fails during a change', 'cut the power during a transaction and check'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 0, tone: 'good' }, { row: 1, col: 0, tone: 'info' }, { row: 2, col: 0, tone: 'info' }, { row: 3, col: 0, tone: 'info' }, { row: 4, col: 0, tone: 'info' }] },
    ),
    grid(
      'use-case-diagram',
      'UML: drawing the design',
      'A use case diagram of the Student Information Application. Inside the system boundary are eight use cases: view the directory, filter students, record a score, add a student, enrol in a course, export the list, view a report card and view a course summary. The teacher is connected to view the directory, filter students and record a score. The administrator is connected to add a student, enrol in a course and export the list. The student is connected to view a report card and the head teacher to view a course summary.',
      'Actors stand outside the box and use cases inside it. A line means that the actor takes part in the use case.',
      [
        ['teacher', 'circle', 'Teacher', 0, 1, 'accent'],
        ['admin', 'circle', 'Administrator', 0, 4.3, 'accent'],
        ['student', 'circle', 'Student', 4.2, 6, 'accent'],
        ['head', 'circle', 'Head teacher', 4.2, 7, 'accent'],
        ['uc1', 'ellipse', 'View directory', 2.1, 0, 'good'],
        ['uc2', 'ellipse', 'Filter students', 2.1, 1, 'good'],
        ['uc3', 'ellipse', 'Record a score', 2.1, 2, 'good'],
        ['uc4', 'ellipse', 'Add a student', 2.1, 3.3, 'good'],
        ['uc5', 'ellipse', 'Enrol in a course', 2.1, 4.3, 'good'],
        ['uc6', 'ellipse', 'Export the list', 2.1, 5.3, 'good'],
        ['uc7', 'ellipse', 'View report card', 2.1, 6.3, 'good'],
        ['uc8', 'ellipse', 'View course summary', 2.1, 7.3, 'good'],
      ],
      [
        ['teacher', 'uc1', undefined, { head: 'none' }],
        ['teacher', 'uc2', undefined, { head: 'none' }],
        ['teacher', 'uc3', undefined, { head: 'none' }],
        ['admin', 'uc4', undefined, { head: 'none' }],
        ['admin', 'uc5', undefined, { head: 'none' }],
        ['admin', 'uc6', undefined, { head: 'none' }],
        ['student', 'uc7', undefined, { head: 'none' }],
        ['head', 'uc8', undefined, { head: 'none' }],
      ],
      { dx: 140, dy: 72, w: 140, h: 48, at: 'end', groups: [{ label: 'Student Information Application', col: 1.5, row: -0.1, cols: 1.4, rows: 8.2, tone: 'info' }] },
    ),
    uml(
      'sia-class-diagram',
      'UML: drawing the design',
      'A class diagram with four classes. Teacher has teacher_id and name. Course has course_id, title and capacity and the method seats_left. Student has student_id, name and grade_level and the methods enrol and average. Enrolment has a score. One teacher teaches many courses. One student has zero or more enrolments and one course has zero or more enrolments, so a student and a course are linked through their enrolments.',
      'The same four things as the four tables of the database, now with behaviour. The Enrolment class is the junction table.',
      [
        { id: 'teacher', name: 'Teacher', col: 0, row: 0, fields: ['teacher_id', 'name'], methods: [], tone: 'accent' },
        { id: 'course', name: 'Course', col: 1, row: 0, fields: ['course_id', 'title', 'capacity'], methods: ['seats_left()'], tone: 'accent' },
        { id: 'student', name: 'Student', col: 0, row: 1, fields: ['student_id', 'name', 'grade_level'], methods: ['enrol(course)', 'average()'], tone: 'accent' },
        { id: 'enrolment', name: 'Enrolment', col: 1, row: 1, fields: ['score'], methods: [], tone: 'warn' },
      ],
      [
        ['teacher', 'course', 'teaches', { head: 'none', fromLabel: '1', toLabel: '*' }],
        ['student', 'enrolment', undefined, { head: 'none', fromLabel: '1', toLabel: '0..*' }],
        ['course', 'enrolment', undefined, { head: 'none', fromLabel: '1', toLabel: '0..*' }],
      ],
      { dx: 300, dy: 210, at: 'end' },
    ),
    sequence(
      'add-student-sequence',
      'UML: drawing the design',
      'A sequence diagram of adding a student. The administrator fills the form and presses Add. The page calls validateStudent. If there are errors, the page shows them and stops. If not, the page sends POST /api/students to the server. The server runs INSERT INTO students in the database, which answers that it worked. The server replies 201 Created, and the page adds the student to its list and calls render.',
      'One scenario over time. The first check is in the page, the last one in the database: the constraints of Lesson 2.',
      [['admin', 'Administrator'], ['page', 'Page'], ['server', 'API server'], ['db', 'Database']],
      [
        { from: 'admin', to: 'page', label: 'fills the form, presses Add' },
        { from: 'page', to: 'page', label: 'validateStudent()', note: 'errors? show them and stop' },
        { from: 'page', to: 'server', label: 'POST /api/students (JSON)' },
        { from: 'server', to: 'db', label: 'INSERT INTO students' },
        { from: 'db', to: 'server', label: 'ok (constraints passed)', dashed: true },
        { from: 'server', to: 'page', label: '201 Created', dashed: true },
        { from: 'page', to: 'admin', label: 'render(): the new student is in the table', dashed: true },
      ],
      { at: 'end' },
    ),
    grid(
      'layers-diagram',
      'Architecture and design principles',
      'A three-layer architecture. The presentation layer, the HTML, CSS and JavaScript in the browser, sends HTTP requests with JSON to the application layer, the API with the validation and the business rules. The application layer sends SQL to the data layer, the SQLite database with its constraints. Each layer talks only to its neighbour.',
      'Each layer talks only to its neighbour, so a new page design never touches the database.',
      [
        ['ui', 'rect', 'Presentation layer', 0, 0, 'accent', 'HTML, CSS and JavaScript in the browser'],
        ['api', 'rect', 'Application layer', 0, 1, 'good', 'API, validation, business rules'],
        ['db', 'cylinder', 'Data layer', 0, 2, 'warn', 'SQLite database, tables and constraints'],
      ],
      [
        ['ui', 'api', 'HTTP + JSON'],
        ['api', 'db', 'SQL'],
      ],
      { dy: 100, w: 340, at: 'end' },
    ),
    lab(
      'backlog-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program, a backlog of user stories that is checked against the pattern as a role, a goal and a benefit, sorted by MoSCoW priority and planned into a sprint with a capacity of 16 points, with its expected output.',
      'Rewrite US7 as a valid story, then change the capacity to 10 and predict the sprint before you run it.',
      `import re

STORIES = [
    # id, the story, priority (M must, S should, C could, W won't), points
    ("US1", "As a teacher, I want to see all students in a table, so that I can find a student quickly.", "M", 3),
    ("US2", "As a teacher, I want to filter the students by name and grade, so that I can find a group.", "M", 5),
    ("US3", "As an administrator, I want to add a new student, so that new arrivals are recorded.", "M", 5),
    ("US4", "As a teacher, I want to record a score, so that results are kept.", "S", 3),
    ("US5", "As a student, I want to see my own report card, so that I know how I am doing.", "S", 8),
    ("US6", "As an administrator, I want to export the list as a file, so that I can share it.", "C", 5),
    ("US7", "I want a dark mode.", "W", 2),
]
PATTERN = re.compile(r"^As an? (?P<role>.+?), I want (?P<goal>.+?), so that (?P<benefit>.+)\\.$")
ORDER = {"M": 0, "S": 1, "C": 2, "W": 3}

print("backlog")
valid = []
for story_id, text, priority, points in sorted(STORIES, key=lambda s: ORDER[s[2]]):
    match = PATTERN.match(text)
    if not match:
        print(f"  {story_id} {priority} NOT A USER STORY: it needs a role, a goal and a benefit")
        continue
    valid.append((story_id, priority, points, match["role"], match["goal"]))
    print(f"  {story_id} {priority} {points:>2} points  {match['role']}: {match['goal']}")

CAPACITY = 16
chosen, used = [], 0
for story_id, priority, points, role, goal in valid:
    if used + points <= CAPACITY:
        chosen.append(story_id)
        used += points
print(f"\\nsprint 1 (capacity {CAPACITY} points): {', '.join(chosen)} = {used} points")
print("left for later:", ", ".join(s[0] for s in valid if s[0] not in chosen))`,
      { expected: 'backlog\n  US1 M  3 points  teacher: to see all students in a table\n  US2 M  5 points  teacher: to filter the students by name and grade\n  US3 M  5 points  administrator: to add a new student\n  US4 S  3 points  teacher: to record a score\n  US5 S  8 points  student: to see my own report card\n  US6 C  5 points  administrator: to export the list as a file\n  US7 W NOT A USER STORY: it needs a role, a goal and a benefit\n\nsprint 1 (capacity 16 points): US1, US2, US3, US4 = 16 points\nleft for later: US5, US6', filename: 'backlog.py', at: 'end' },
    ),
    lab(
      'classes-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program, which turns the class diagram of the school into Python classes with enrol and average methods and shows the two business rules refusing a duplicate and a full course, with its expected output.',
      'Add a Course.average() method and print the average score of Mathematics.',
      `from dataclasses import dataclass, field


@dataclass
class Teacher:
    teacher_id: int
    name: str


@dataclass
class Course:
    course_id: int
    title: str
    teacher: Teacher
    capacity: int = 2
    enrolments: list = field(default_factory=list)

    def seats_left(self):
        return self.capacity - len(self.enrolments)


@dataclass
class Enrolment:
    student: "Student"
    course: Course
    score: int | None = None


@dataclass
class Student:
    student_id: int
    name: str
    grade_level: int
    enrolments: list = field(default_factory=list)

    def enrol(self, course, score=None):
        if any(e.course is course for e in self.enrolments):
            raise ValueError(f"{self.name} is already in {course.title}")
        if course.seats_left() <= 0:
            raise ValueError(f"{course.title} is full")
        enrolment = Enrolment(self, course, score)
        self.enrolments.append(enrolment)
        course.enrolments.append(enrolment)
        return enrolment

    def average(self):
        scores = [e.score for e in self.enrolments if e.score is not None]
        return round(sum(scores) / len(scores), 1) if scores else None


rahim = Teacher(1, "Rahim Chowdhury")
maths, physics = Course(101, "Mathematics", rahim), Course(102, "Physics", rahim)
ayesha, tanvir, sadia = Student(1, "Ayesha Rahman", 10), Student(2, "Tanvir Ahmed", 10), Student(3, "Sadia Islam", 9)

ayesha.enrol(maths, 92)
ayesha.enrol(physics, 85)
tanvir.enrol(maths, 67)
print("Ayesha's average:", ayesha.average())
print("Tanvir's average:", tanvir.average())
print("Sadia's average:", sadia.average())
print("seats left in Mathematics:", maths.seats_left())
for student, course in ((sadia, maths), (ayesha, maths)):
    try:
        student.enrol(course)
    except ValueError as error:
        print("refused:", error)
print("Mathematics is taught by", maths.teacher.name, "and has", len(maths.enrolments), "students")`,
      { expected: 'Ayesha\'s average: 88.5\nTanvir\'s average: 67.0\nSadia\'s average: None\nseats left in Mathematics: 0\nrefused: Mathematics is full\nrefused: Ayesha Rahman is already in Mathematics\nMathematics is taught by Rahim Chowdhury and has 2 students', filename: 'classes.py', at: 'end' },
    ),
  ],
  [`${M}/8`]: [
    grid(
      'git-areas',
      'Version control with Git and GitHub',
      'A diagram of the places that Git uses. Your files are in the working directory. The command git add copies the chosen changes into the staging area. The command git commit stores the staged changes as a commit in the local repository, which holds the complete history. The command git push sends the commits to the remote repository on GitHub, and git pull brings other people\'s commits back.',
      'Four places and three commands. git pull and git clone bring commits the other way, from GitHub to your computer.',
      [
        ['wd', 'rect', 'Working directory', 0, 0, 'info', 'your files'],
        ['stage', 'rect', 'Staging area', 1, 0, 'accent', 'the next snapshot'],
        ['repo', 'cylinder', 'Local repository', 2, 0, 'good', 'the history'],
        ['remote', 'cylinder', 'Remote (GitHub)', 3, 0, 'warn', 'the shared copy'],
      ],
      [
        ['wd', 'stage', 'git add'],
        ['stage', 'repo', 'git commit'],
        ['repo', 'remote', 'git push'],
      ],
      { dx: 232, dy: 90, w: 138, h: 60, at: 'start' },
    ),
    table(
      'git-commands',
      'Version control with Git and GitHub',
      'A table of the ten Git commands of the lesson. git init creates a repository, once at the start. git status -s lists new and changed files. git add puts a change into the staging area. git commit -m saves a snapshot with a message after each small step. git diff shows the changes that are not yet staged. git log --oneline --graph shows the history as a graph. git switch -c creates a branch and moves to it. git merge joins a branch into the current one. git push and git pull send commits to and bring them from the remote. git clone copies a remote repository with its whole history.',
      'The commands of one working day. The first six are enough for a one-person project.',
      ['Command', 'What it does', 'When you use it'],
      [
        ['git init', 'creates an empty repository in the current folder', 'once, at the start of a project'],
        ['git status -s', 'lists the files that are new or changed', 'all the time'],
        ['git add file', 'puts the change into the staging area', 'before every commit'],
        ['git commit -m "message"', 'saves a snapshot with a message', 'after each small, finished step'],
        ['git diff', 'shows the changed lines that are not staged yet', 'before you add'],
        ['git log --oneline --graph', 'shows the history as a graph', 'to see what happened'],
        ['git switch -c name', 'creates a branch and moves to it', 'at the start of a feature or a fix'],
        ['git merge name', 'joins the branch into the current one', 'when the feature is finished'],
        ['git push / git pull', 'sends commits to the remote / brings commits from it', 'to share your work and to catch up'],
        ['git clone url', 'copies a remote repository with its whole history', 'to start from an existing project'],
      ],
      { at: 'end' },
    ),
    flow(
      'pr-workflow',
      'Version control with Git and GitHub',
      'The GitHub workflow in six steps. Make a branch for the feature. Commit small steps with good messages. Push the branch to GitHub. Open a pull request. Colleagues review it and automatic checks run. When it is approved, merge it into main and delete the branch.',
      'A pull request is where the review happens: the team sees the change, comments on it, and the tests run before anything reaches main.',
      ['Branch|git switch -c feature|accent', 'Commit|small steps, clear messages|info', 'Push|git push to GitHub|good', 'Pull request|ask to merge|warn', 'Review and checks|comments, tests|accent2', 'Merge|into main, delete the branch|good'],
      { layout: 'row', perRow: 3, at: 'end' },
    ),
    walkthrough(
      'merge-conflict',
      'Version control with Git and GitHub',
      'A four-step walk-through of a merge conflict. Step 1: two branches change the same line, main to const MAX_GRADE = 12 and feature/grades to const MAX_GRADE = 13. Step 2: git merge stops with the message CONFLICT, merge conflict in app.js. Step 3: the file shows both versions between the marker lines. Step 4: a person keeps the right line, deletes the markers, runs git add and git commit, and the merge is finished.',
      'Git never guesses. When both sides changed the same lines, a person decides.',
      [
        { title: 'Two branches change the same line', text: 'On main the line is const MAX_GRADE = 12; and on feature/grades somebody changed it to const MAX_GRADE = 13;. Each branch has its own new commit.' },
        { title: 'git merge stops', text: 'git merge feature/grades reports CONFLICT (content): Merge conflict in app.js. Git cannot know which line is right, so it stops and leaves the merge unfinished.' },
        { title: 'The file shows both versions', text: 'Git writes the marker line <<<<<<< HEAD, the line from main, the marker line =======, the line from the branch and the marker line >>>>>>> feature/grades into app.js.' },
        { title: 'A person decides', text: 'Edit the file so that only the right line is left and the three marker lines are gone, then run git add app.js and git commit. The merge is finished. Often the real fix is a talk with the other author.' },
      ],
      { at: 'end' },
    ),
    table(
      'test-cases',
      'Software testing',
      'A table of eight test cases for the rule that a score is a whole number from 0 to 100. Normal: 72 is accepted. Boundary: 0 and 100 are accepted, and -1 and 101 are refused. Invalid: 85.5, the text "90" and NaN are refused.',
      'Choose cases in three kinds. The boundary cases are the ones that find off-by-one errors.',
      ['Kind of case', 'Input', 'Expected result', 'Why it is tested'],
      [
        ['Normal', '72', 'accepted', 'a typical score works'],
        ['Boundary', '0', 'accepted', 'the lowest allowed score'],
        ['Boundary', '100', 'accepted', 'the highest allowed score'],
        ['Boundary', '-1', 'refused', 'just below the range'],
        ['Boundary', '101', 'refused', 'just above the range'],
        ['Invalid', '85.5', 'refused', 'a score is a whole number'],
        ['Invalid', '"90"', 'refused', 'text is not a number'],
        ['Invalid', 'NaN', 'refused', 'not a number at all'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 2, tone: 'good' }, { row: 1, col: 2, tone: 'good' }, { row: 2, col: 2, tone: 'good' }, { row: 3, col: 2, tone: 'warn' }, { row: 4, col: 2, tone: 'warn' }, { row: 5, col: 2, tone: 'warn' }, { row: 6, col: 2, tone: 'warn' }, { row: 7, col: 2, tone: 'warn' }] },
    ),
    table(
      'test-pyramid',
      'Software testing',
      'A table of the test pyramid, from the top to the bottom. End-to-end tests check the whole application through the real page, are slow and should be few. Integration tests check parts working together, such as the API with the database, run at medium speed and should be some. Unit tests check one function on its own, are very fast and should be many.',
      'The shape of a healthy suite: many fast unit tests at the bottom and a few slow end-to-end tests at the top.',
      ['Level', 'What it checks', 'Speed', 'How many'],
      [
        ['End-to-end', 'the whole application through the real page, like a user', 'slow: seconds or minutes', 'a few'],
        ['Integration', 'parts working together, such as the API with the database', 'medium', 'some'],
        ['Unit', 'one function on its own, such as validateScore', 'very fast: milliseconds', 'many'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 3, tone: 'warn' }, { row: 1, col: 3, tone: 'info' }, { row: 2, col: 3, tone: 'good' }] },
    ),
    flow(
      'debug-loop',
      'Debugging',
      'The debugging loop in five steps. Reproduce the failure with the smallest input that always fails. Isolate it by printing values, using the debugger or bisecting. Form a hypothesis, a guess that can be wrong. Fix the cause and not the symptom. Verify the fix and add a regression test. If the test still fails, the loop starts again with a new hypothesis.',
      'The scientific method for code. Every lap ends with a test that keeps the bug from coming back.',
      ['Reproduce|the smallest failing input|accent', 'Isolate|print, debugger, bisect|info', 'Hypothesise|a guess that can be wrong|warn', 'Fix|the cause, not the symptom|good', 'Verify|and add a regression test|accent2'],
      { layout: 'cycle', at: 'end' },
    ),
    checklist(
      'review-checklist',
      'Code review, quality and shipping',
      'A checklist with six questions for a code review: is it correct, is it safe, is it readable, is it simple, is it tested, and is the change small.',
      'Review against the list, not against your mood. Say what you found, where, and why it matters.',
      [
        'Correct: does it do what the requirement says, for normal cases and for edge cases?',
        'Safe: is user input checked, is textContent used for user text, are secrets kept out of the code?',
        'Readable: clear names, short functions, comments that explain why?',
        'Simple: is there duplicated code, or an easier way to do the same?',
        'Tested: is there a test, with a boundary case and with the bug that was fixed?',
        'Small: can the change be understood in one sitting, with a clear message?',
      ],
      { title: 'The review checklist', at: 'end' },
    ),
    tree(
      'release-package',
      'Code review, quality and shipping',
      'The folder of the release package of the Student Information Application. The folder sia contains index.html and app.js, the page and its logic, sia_tests.js, the tests, schema.sql, the database script, README.md, the explanation, .gitignore, the list of files that Git must not track, and the hidden .git folder with the history.',
      'What somebody else needs in order to run, test and understand your project, and nothing more.',
      {
        label: 'sia/',
        children: [
          { label: 'index.html', tone: 'good' },
          { label: 'app.js', tone: 'good' },
          { label: 'sia_tests.js', tone: 'info' },
          { label: 'schema.sql', tone: 'warn' },
          { label: 'README.md', tone: 'accent' },
          { label: '.gitignore', tone: 'accent' },
          { label: '.git/ (history)', tone: 'accent2' },
        ],
      },
      { at: 'end' },
    ),
    graph(
      'commit-graph',
      'Example 1',
      'A directed graph of the history built by Example 1. Commit A, Create the students table, is the root. B, Add the student page, points to A. On the filter branch, C, Add the name filter, points to B and D, Add the grade filter, points to C. On main, E, Fix the page title, points to B. F, the merge commit, has two parents, E and D. G, Add the export button, points to F. The branch labels main and export point to G and the label filter points to D.',
      'Arrows point from a commit to its parent. A = create table, B = student page, C and D = the filters, E = fix title, F = the merge commit (two parents), G = export button. Branch labels are only pointers.',
      [
        { id: 'A', x: 40, y: 125, tone: 'accent' },
        { id: 'B', x: 130, y: 125, tone: 'accent' },
        { id: 'C', x: 230, y: 200, tone: 'good' },
        { id: 'D', x: 330, y: 200, tone: 'good' },
        { id: 'E', x: 230, y: 50, tone: 'accent' },
        { id: 'F', x: 430, y: 125, tone: 'info' },
        { id: 'G', x: 530, y: 125, tone: 'accent2' },
        { id: 'main', x: 530, y: 40, tone: 'warn' },
        { id: 'export', x: 530, y: 210, tone: 'warn' },
        { id: 'filter', x: 330, y: 270, tone: 'warn' },
      ],
      [['B', 'A'], ['C', 'B'], ['D', 'C'], ['E', 'B'], ['F', 'E'], ['F', 'D'], ['G', 'F'], ['main', 'G'], ['export', 'G'], ['filter', 'D']],
      { directed: true, at: 'end' },
    ),
    lab(
      'git-model-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program, a small model of Git in which commits point to their parents and branches point to commits, with merge, fast-forward and log, and its expected output.',
      'Add a branch fix-title that starts at main, makes one commit and is merged; predict whether it is a fast-forward first.',
      `import hashlib


class Repo:
    """A tiny model of Git: commits point to their parents, and branches point to commits."""

    def __init__(self):
        self.commits = {}                  # id -> (message, parents, number)
        self.branches = {"main": None}     # branch name -> id of its newest commit
        self.current = "main"

    def tip(self, branch=None):
        return self.branches[branch or self.current]

    def commit(self, message, extra_parent=None):
        parents = [p for p in (self.tip(), extra_parent) if p]
        commit_id = hashlib.sha1((message + "|" + ",".join(parents)).encode()).hexdigest()[:7]
        self.commits[commit_id] = (message, parents, len(self.commits) + 1)
        self.branches[self.current] = commit_id
        return commit_id

    def branch(self, name):
        self.branches[name] = self.tip()

    def switch(self, name):
        self.current = name

    def history(self, commit_id):
        """Every commit that can be reached by following the parent links."""
        seen, todo = set(), [commit_id]
        while todo:
            node = todo.pop()
            if node and node not in seen:
                seen.add(node)
                todo.extend(self.commits[node][1])
        return seen

    def merge(self, name):
        mine, theirs = self.tip(), self.tip(name)
        if theirs in self.history(mine):
            return "already up to date"
        if mine in self.history(theirs):
            self.branches[self.current] = theirs        # fast-forward: only the label moves
            return f"fast-forward to {theirs}"
        return f"merge commit {self.commit(f'Merge {name} into {self.current}', extra_parent=theirs)}"

    def log(self):
        for commit_id in sorted(self.history(self.tip()), key=lambda c: -self.commits[c][2]):
            message, parents, _ = self.commits[commit_id]
            note = f" (parents {parents[0]} and {parents[1]})" if len(parents) == 2 else ""
            print(f"{commit_id} {message}{note}")


repo = Repo()
repo.commit("Create the students table")
page = repo.commit("Add the student page")
repo.branch("filter")
repo.switch("filter")
repo.commit("Add the name filter")
repo.commit("Add the grade filter")
repo.switch("main")
repo.commit("Fix the page title")
print("merge filter into main:", repo.merge("filter"))
repo.branch("export")
repo.switch("export")
repo.commit("Add the export button")
repo.switch("main")
print("merge export into main:", repo.merge("export"))
print("merge export again:    ", repo.merge("export"))

print("\\nhistory of main, newest first")
repo.log()

print("\\nbranches")
for name, tip in repo.branches.items():
    print(f"  {name:<7} -> {tip}")

print("\\nsame message, other history:", Repo().commit("Add the student page"), "instead of", page)`,
      { expected: 'merge filter into main: merge commit fb7e60e\nmerge export into main: fast-forward to 9210cfc\nmerge export again:     already up to date\n\nhistory of main, newest first\n9210cfc Add the export button\nfb7e60e Merge filter into main (parents 84f3bfe and 3bb6630)\n84f3bfe Fix the page title\n3bb6630 Add the grade filter\na5593de Add the name filter\ne9af2b6 Add the student page\ncae1fbf Create the students table\n\nbranches\n  main    -> 9210cfc\n  filter  -> 3bb6630\n  export  -> 9210cfc\n\nsame message, other history: 711782a instead of e9af2b6', filename: 'git_model.py', at: 'end' },
    ),
    lab(
      'boundary-lab',
      'Example 2',
      'javascript',
      'A JavaScript editor with the Example 2 program, which runs eight test cases against a first try and a repaired grade rule and prints PASS or FAIL for each, with its expected output.',
      'Add the cases 11 and 0, then change the repaired rule to grade < 12 and see which test fails.',
      `// The rule of the requirements: a grade level is a whole number from 9 to 12.
const firstTry = (grade) => Number.isInteger(grade) && grade > 9 && grade < 12;
const repaired = (grade) => Number.isInteger(grade) && grade >= 9 && grade <= 12;

const CASES = [
  // [what the test checks, input, expected result]
  ["a typical grade", 10, true],
  ["the lowest grade", 9, true],
  ["the highest grade", 12, true],
  ["one below the range", 8, false],
  ["one above the range", 13, false],
  ["a fraction", 10.5, false],
  ["text instead of a number", "10", false],
  ["not a number", NaN, false],
];

const show = (value) => (typeof value === "string" ? \`"\${value}"\` : String(value));

function runSuite(title, rule) {
  console.log(title);
  let failed = 0;
  for (const [name, input, expected] of CASES) {
    const actual = rule(input);
    const ok = actual === expected;
    if (!ok) failed += 1;
    console.log(\`  \${ok ? "PASS" : "FAIL"}  \${name}: \${show(input)} gives \${actual}\${ok ? "" : \`, expected \${expected}\`}\`);
  }
  console.log(\`  \${CASES.length - failed} passed, \${failed} failed\\n\`);
  return failed;
}

const before = runSuite("Run 1: the first try (grade > 9 and grade < 12)", firstTry);
const after = runSuite("Run 2: after the repair (grade >= 9 and grade <= 12)", repaired);
console.log(before > 0 && after === 0 ? "The tests found the bug and the repair removed it." : "Something is still wrong.");`,
      { expected: 'Run 1: the first try (grade > 9 and grade < 12)\n  PASS  a typical grade: 10 gives true\n  FAIL  the lowest grade: 9 gives false, expected true\n  FAIL  the highest grade: 12 gives false, expected true\n  PASS  one below the range: 8 gives false\n  PASS  one above the range: 13 gives false\n  PASS  a fraction: 10.5 gives false\n  PASS  text instead of a number: "10" gives false\n  PASS  not a number: NaN gives false\n  6 passed, 2 failed\n\nRun 2: after the repair (grade >= 9 and grade <= 12)\n  PASS  a typical grade: 10 gives true\n  PASS  the lowest grade: 9 gives true\n  PASS  the highest grade: 12 gives true\n  PASS  one below the range: 8 gives false\n  PASS  one above the range: 13 gives false\n  PASS  a fraction: 10.5 gives false\n  PASS  text instead of a number: "10" gives false\n  PASS  not a number: NaN gives false\n  8 passed, 0 failed\n\nThe tests found the bug and the repair removed it.', filename: 'boundary_tests.js', at: 'end' },
    ),
    lab(
      'debug-lab',
      'Example 3',
      'javascript',
      'A JavaScript editor with the Example 3 program, which reproduces a wrong average, traces the loop, states a hypothesis, fixes the function and runs four regression checks, with its expected output.',
      'Add the check [100, 100, null] and predict its result before you run it.',
      `// Bug report: "Sadia has scores of 90 and 80 and one exam that is not marked yet. Her average shows 56.7."
function averageV1(scores) {
  let total = 0;
  for (const score of scores) total += score;
  return Math.round((total / scores.length) * 10) / 10;
}

const scores = [90, null, 80];
console.log("1. reproduce:", averageV1(scores), "(expected 85)");

console.log("2. isolate: follow the loop");
let total = 0;
for (const score of scores) {
  total += score;
  console.log(\`   after \${score}: total = \${total}\`);
}
console.log(\`   result: \${total} / \${scores.length} = \${Math.round((total / scores.length) * 10) / 10}\`);

console.log("3. hypothesis: a missing score adds 0 to the total but still counts in the divisor");
console.log("   experiment: a list with only a missing score gives", averageV1([null]), "(there should be no average)");

function averageV2(scores) {
  const real = scores.filter((score) => score !== null);
  if (real.length === 0) return null;
  return Math.round((real.reduce((sum, score) => sum + score, 0) / real.length) * 10) / 10;
}

console.log("4. fix the cause, then verify and keep the tests");
function check(name, actual, expected) {
  console.log(\`   \${actual === expected ? "PASS" : "FAIL"}  \${name}: \${actual}\`);
}
check("the report of the bug", averageV2([90, null, 80]), 85);
check("only missing scores", averageV2([null, null]), null);
check("no scores at all", averageV2([]), null);
check("rounding to one decimal", averageV2([88, 90, 84]), 87.3);`,
      { expected: '1. reproduce: 56.7 (expected 85)\n2. isolate: follow the loop\n   after 90: total = 90\n   after null: total = 90\n   after 80: total = 170\n   result: 170 / 3 = 56.7\n3. hypothesis: a missing score adds 0 to the total but still counts in the divisor\n   experiment: a list with only a missing score gives 0 (there should be no average)\n4. fix the cause, then verify and keep the tests\n   PASS  the report of the bug: 85\n   PASS  only missing scores: null\n   PASS  no scores at all: null\n   PASS  rounding to one decimal: 87.3', filename: 'debugging.js', at: 'end' },
    ),
  ],
  // @@visuals-end
});

registerQuizCatalog({
  [`${M}/1`]: [
    mcq('q1', 'Which of these is an update anomaly?', ['A teacher’s e-mail is stored in many rows and only some are changed', 'A table has so many columns that a query becomes hard to read and slow', 'A query takes a long time to run because the table has too many rows', 'Two users open the same table at the same moment'], 'Storing the same fact in many places lets the copies drift apart when only some are updated. Keeping each fact once, in one table, removes the problem.'),
    mcq('q2', 'What does this query return?', ['Maths Physics', 'ICT', 'Physics Maths', 'Maths Physics ICT'], 'The WHERE clause keeps the courses with credits of 3 or more (Maths 4, Physics 3), and ORDER BY title sorts them alphabetically: Maths, then Physics.', SQL("CREATE TABLE courses (title TEXT, credits INTEGER);\nINSERT INTO courses VALUES ('Maths', 4), ('Physics', 3), ('ICT', 2);\nSELECT title FROM courses WHERE credits >= 3 ORDER BY title")),
    mcq('q3', 'Students can take many courses and every course has many students. How is this relationship stored in a relational database?', ['In a junction table that holds the keys of both sides', 'As a list of course names in a column of the student table', 'As a foreign key in the course table only', 'It cannot be stored'], 'A many-to-many relationship becomes a table of its own, such as enrolments(student_id, course_id, score), with one row for each pair. Lists inside one cell would break searching and counting.'),
    mcq('q4', 'What is the key of an entity?', ['An attribute (or a group of them) that identifies each instance uniquely', 'The first column that was created when you designed the table', 'The attribute whose values are the longest in the whole table', 'A password that protects the table from other users'], 'A key such as student_id identifies exactly one row, so other tables can refer to it. Names are poor keys because they repeat and change.'),
    mcq('q5', 'What does this program print?', ['[\'enrols in\']', '[\'teaches\']', '[\'teaches\', \'enrols in\']', '[]'], 'Only the relationship with the cardinality M:N, enrols in, is added to the list, because only a many-to-many relationship needs a junction table.', PY('relationships = [("teaches", "Teacher", "1:N", "Course"), ("enrols in", "Student", "M:N", "Course")]\njunctions = [name for name, a, cardinality, b in relationships if cardinality == "M:N"]\nprint(junctions)')),
  ],
  [`${M}/2`]: [
    mcq('q1', 'What does this query return?', ['1', '2', '3', '0'], 'The second insert breaks UNIQUE (the e-mail a@x is already used) and the third breaks the primary key (id 1 exists). OR IGNORE skips both, so only the first row is stored.', SQL("CREATE TABLE t (id INTEGER PRIMARY KEY, email TEXT UNIQUE);\nINSERT INTO t VALUES (1, 'a@x');\nINSERT OR IGNORE INTO t VALUES (2, 'a@x');\nINSERT OR IGNORE INTO t VALUES (1, 'b@x');\nSELECT COUNT(*) FROM t")),
    mcq('q2', 'Which column is a foreign key?', ['courses.teacher_id, which must match a teachers.teacher_id', 'students.student_id, which is the primary key of the table students', 'students.name, because names identify students', 'enrolments.score, because it holds numbers'], 'A foreign key holds the primary key value of a row in another table. Referential integrity makes the database refuse a teacher_id that does not exist in teachers.'),
    mcq('q3', 'Which normal form removes the columns that depend on only a part of a composite key?', ['Second normal form (2NF)', 'First normal form (1NF)', 'Third normal form (3NF)', 'No normal form does this'], 'A partial dependency exists only when the key has several columns. 2NF moves such columns, for example student_name that depends on student_id alone, to their own table. 3NF removes dependencies between non-key columns.'),
    mcq('q4', 'What does this query return?', ['0', '1', '2', '3'], 'Comparing anything with NULL using = gives "unknown", never true, so no row matches. To find the missing scores you must write score IS NULL, which would return 1.', SQL("CREATE TABLE s (name TEXT, score INTEGER);\nINSERT INTO s VALUES ('A', 90), ('B', NULL), ('C', 0);\nSELECT COUNT(*) FROM s WHERE score = NULL")),
    mcq('q5', 'Why must a SQLite script start with PRAGMA foreign_keys = ON; if it should enforce foreign keys?', ['SQLite does not enforce foreign keys unless it is switched on', 'It makes the tables load faster when the file is opened', 'It creates the foreign keys automatically for every table', 'It is required by every SQL database before any table is made'], 'For historical reasons SQLite checks foreign keys only after the pragma is set (for each connection). Without it a course for a non-existent teacher is accepted silently.'),
  ],
  [`${M}/3`]: [
    mcq('q1', 'What does this query return?', ['Mim Rafi Tia', 'Ana Mim Rafi Tia', 'Tia Rafi Mim', 'Mim Tia'], 'WHERE keeps the students with a grade of 10 or more (Mim 10, Rafi 12, Tia 11) and ORDER BY name sorts them alphabetically. Ana, with grade 9, is filtered out.', SQL("CREATE TABLE s (name TEXT, grade INTEGER);\nINSERT INTO s VALUES ('Mim', 10), ('Ana', 9), ('Rafi', 12), ('Tia', 11);\nSELECT name FROM s WHERE grade >= 10 ORDER BY name")),
    mcq('q2', 'What does this query return?', ['2', '1', '3', '4'], 'In SQLite, LIKE ignores the case of ordinary letters, so \'A%\' matches both Ayesha and anika. Tanvir and Sadia do not start with A. The count is 2.', SQL("CREATE TABLE s (name TEXT);\nINSERT INTO s VALUES ('Ayesha'), ('anika'), ('Tanvir'), ('Sadia');\nSELECT COUNT(*) FROM s WHERE name LIKE 'A%'")),
    mcq('q3', 'What does the statement UPDATE students SET grade_level = 10; do?', ['It sets the grade level of every student to 10, because it has no WHERE', 'It sets only the first student in the table to grade 10', 'It does nothing at all, because every UPDATE needs a WHERE clause', 'It creates a new column called grade_level and fills it with 10'], 'Without a WHERE clause an UPDATE applies to every row of the table. Test the condition with a SELECT first, and always add the WHERE.'),
    mcq('q4', 'What does this query return?', ['B', 'A', 'C', '75'], 'CASE tests the conditions in order: 75 >= 80 is false, 75 >= 60 is true, so the result is B.', SQL("SELECT CASE WHEN 75 >= 80 THEN 'A' WHEN 75 >= 60 THEN 'B' ELSE 'C' END")),
    mcq('q5', 'In which order does a database evaluate the clauses of SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT?', ['FROM, WHERE, SELECT, ORDER BY, LIMIT', 'SELECT, FROM, WHERE, ORDER BY, LIMIT', 'WHERE, FROM, SELECT, LIMIT, ORDER BY', 'ORDER BY, SELECT, FROM, WHERE, LIMIT'], 'The database first picks the table (FROM), filters the rows (WHERE), then computes the columns (SELECT), sorts (ORDER BY) and cuts (LIMIT). That is why an alias from SELECT works in ORDER BY but not in WHERE.'),
  ],
  [`${M}/4`]: [
    mcq('q1', 'What does this query return?', ['Ana|Dhaka Cara|Khulna', 'Ana|Dhaka Ben|NULL Cara|Khulna', 'Ana|Dhaka', 'Ana Ben Cara'], 'An inner join keeps only the pairs that match on id: Ana (1) and Cara (3). Ben has no row in table b, so he is dropped.', SQL("CREATE TABLE a (id INTEGER, name TEXT);\nCREATE TABLE b (id INTEGER, city TEXT);\nINSERT INTO a VALUES (1, 'Ana'), (2, 'Ben'), (3, 'Cara');\nINSERT INTO b VALUES (1, 'Dhaka'), (3, 'Khulna');\nSELECT a.name, b.city FROM a JOIN b ON a.id = b.id ORDER BY a.id")),
    mcq('q2', 'What does this query return?', ['1', '0', '2', '3'], 'The LEFT JOIN keeps Ben with NULL in the columns of b. WHERE b.id IS NULL keeps exactly the rows without a match, so one row (Ben) is counted.', SQL("CREATE TABLE a (id INTEGER, name TEXT);\nCREATE TABLE b (id INTEGER, city TEXT);\nINSERT INTO a VALUES (1, 'Ana'), (2, 'Ben'), (3, 'Cara');\nINSERT INTO b VALUES (1, 'Dhaka'), (3, 'Khulna');\nSELECT COUNT(*) FROM a LEFT JOIN b ON a.id = b.id WHERE b.id IS NULL")),
    mcq('q3', 'What does this query return?', ['M|2 P|3', 'E|1 M|2 P|3', 'M|140 P|210', 'P|3'], 'GROUP BY makes one group per course: M has 2 rows, P has 3 and E has 1. HAVING COUNT(*) >= 2 removes the group E, and ORDER BY puts M before P.', SQL("CREATE TABLE s (course TEXT, score INTEGER);\nINSERT INTO s VALUES ('M', 80), ('M', 60), ('P', 90), ('P', 70), ('P', 50), ('E', 75);\nSELECT course, COUNT(*) FROM s GROUP BY course HAVING COUNT(*) >= 2 ORDER BY course")),
    mcq('q4', 'What does this script return?', ['3', '0', '1', '6'], 'The DELETE happens inside a transaction, and the ROLLBACK undoes it, so all three rows are still there.', SQL("CREATE TABLE t (n INTEGER);\nINSERT INTO t VALUES (1), (2), (3);\nBEGIN;\nDELETE FROM t;\nROLLBACK;\nSELECT COUNT(*) FROM t")),
    mcq('q5', 'What does the A in ACID stand for, and what does it promise?', ['Atomicity: a transaction happens completely or not at all', 'Accuracy: every value is correct', 'Availability: the database is always online', 'Authorisation: only the users who are allowed may change data'], 'Atomicity means that the statements of a transaction are one unit: either all of them take effect (COMMIT) or none (ROLLBACK, or a crash before the commit).'),
  ],
  [`${M}/5`]: [
    mcq('q1', 'Where does the text that appears in the browser tab belong?', ['In the title element inside the head', 'In an h1 element inside the body', 'In a meta element', 'In the footer element'], 'The title element in the head is not displayed on the page. Browsers show its text in the tab and in the bookmarks, and search engines use it as the name of the page.'),
    mcq('q2', 'Which CSS selector matches every element that has class="card"?', ['.card', '#card', 'card', 'card:hover'], 'A dot before a name selects by class. #card would select the one element with id="card", plain card would select elements named card, and :hover only applies while the mouse is over an element.'),
    mcq('q3', 'In the CSS box model, what is the order of the layers from the content outwards?', ['padding, border, margin', 'margin, border, padding', 'border, padding, margin', 'padding, margin, border'], 'The content is surrounded by padding (space inside the border), then the border itself, then the margin (space outside the border, between this element and its neighbours).'),
    mcq('q4', 'Why should every img element have an alt attribute?', ['Screen readers read it aloud, and it is shown if the picture cannot load', 'It makes the picture load faster on a slow connection', 'It sets the size of the picture on the page in pixels', 'It is only needed for pictures of text, such as a scanned page of a book'], 'The alt text describes the picture for people who cannot see it (and for search engines), and it is shown when the file is missing or slow. It has nothing to do with the speed or the size of the image.'),
    mcq('q5', 'What does the tag <meta name="viewport" content="width=device-width, initial-scale=1"> do?', ['It makes the page use the real width of the device, so responsive CSS works', 'It sets the width of every element on the page to exactly 100 pixels', 'It hides the whole page on screens that are narrower than a laptop', 'It loads the style sheet that belongs to the page on a phone'], 'Without it, phones pretend to be about 980 pixels wide and shrink the whole page. With it, the page is laid out for the device’s real width, and media queries react to it.'),
  ],
  [`${M}/6`]: [
    mcq('q1', 'What does this program print?', ['[ 16, 10, 24 ]', '[ 6, 16, 10, 24 ]', '[ 8, 5, 12 ]', '[ 16, 10 ]'], 'filter keeps the numbers greater than 4, which are 8, 5 and 12; map then doubles each of them: 16, 10 and 24. The number 3 is removed before the doubling.', JS('console.log([3, 8, 5, 12].filter((n) => n > 4).map((n) => n * 2));')),
    mcq('q2', 'What does this program print?', ['true false', 'true true', 'false false', 'false true'], 'The loose comparison == converts the string "0" to the number 0, so 0 == "0" is true. The strict comparison === does not convert types, so 0 === "0" is false. Always use ===.', JS('console.log(0 == "0", 0 === "0");')),
    mcq('q3', 'What does this program print?', ['10', '9', 'Error: user is const', 'undefined'], 'const stops the variable from being reassigned, but the object it holds can still be changed. user.grade += 1 changes the property grade from 9 to 10.', JS('const user = { name: "Ana", grade: 9 };\nuser.grade += 1;\nconsole.log(user.grade);')),
    mcq('q4', 'Why should a page put text typed by a user into the page with textContent instead of innerHTML?', ['innerHTML runs any HTML or script in the text (XSS), but textContent shows plain text', 'textContent is always faster than innerHTML, so it should be preferred', 'innerHTML cannot show ordinary text, only elements with a tag around them', 'textContent also checks the spelling of the words that it shows'], 'Text that is inserted with innerHTML is parsed as HTML, so a "name" that contains a script tag or an event attribute can run code in the visitor’s browser. textContent never interprets the text.'),
    mcq('q5', 'What is event.preventDefault() used for in the submit handler of a form?', ['It stops the browser from reloading the page, so the script can handle the form', 'It deletes the form from the page after it has been sent', 'It sends the form twice, once by the script and once more by the browser', 'It checks that all of the fields in the form are filled in'], 'By default, submitting a form sends a request and reloads the page. preventDefault() cancels that default action so that the script can validate the data and update the page without a reload.'),
  ],
  [`${M}/7`]: [
    mcq('q1', 'Which of these is a non-functional requirement?', ['The directory must show 1,000 students in under two seconds', 'The user can add a new student to the directory', 'The user can filter the students of the directory by grade', 'The teacher can record a score for each student'], 'A non-functional requirement says how well the system must work (here: performance). The other three describe things that the system must be able to do, which are functional requirements.'),
    mcq('q2', 'What does this program print?', ['True False', 'True True', 'False False', 'False True'], 'The first text has a role, a goal and a benefit in the right form, so the pattern matches. The second has no role and no benefit, so it does not match.', PY('import re\npattern = r"^As an? (.+?), I want (.+?), so that (.+)\\.$"\nfor text in ["As a teacher, I want a table, so that I can see students.", "I want a table."]:\n    print(bool(re.match(pattern, text)))')),
    mcq('q3', 'What is a sprint in Scrum?', ['A fixed time box of one to four weeks that ends with a working increment', 'A meeting at which the project is closed and the team is thanked', 'A document that lists all of the requirements of the whole project', 'The last phase of the waterfall model, when the product is delivered'], 'A sprint is a short, fixed period at the start of which the team plans what to build and at the end of which it shows working software. Then the next sprint begins.'),
    mcq('q4', 'In a UML class diagram, what does the multiplicity 0..* at the Enrolment end of a Student-Enrolment line mean?', ['A student can have zero or more enrolments', 'A student has exactly one enrolment', 'An enrolment can belong to many students', 'A student must have at least one enrolment'], '0..* means "zero or more": a new student may have no enrolments yet, and may have many. 1..* would mean at least one.'),
    mcq('q5', 'What does this program print?', ['[5, 3, 2]', '[5, 3, 8, 2]', '[5, 3]', '[5, 8]'], 'The stories are taken in order while they fit the capacity of 10: 5, then 3 (total 8); the 8 does not fit (it would make 16); the 2 fits and fills the sprint exactly: [5, 3, 2].', PY('points = [5, 3, 8, 2]\ncapacity, chosen = 10, []\nfor p in points:\n    if sum(chosen) + p <= capacity:\n        chosen.append(p)\nprint(chosen)')),
  ],
  [`${M}/8`]: [
    mcq('q1', 'What is the difference between `git add` and `git commit`?', ['`git add` puts changes into the staging area; `git commit` saves them as a snapshot', '`git add` saves a snapshot of the files; `git commit` copies that snapshot to GitHub', '`git add` creates a new branch; `git commit` merges that branch into main', '`git add` downloads new commits from GitHub; `git commit` uploads your own commits'], 'The staging area is the draft of the next snapshot: `git add` chooses what goes into it, and `git commit` stores it in the history of the local repository. Sending commits to GitHub is `git push`.'),
    mcq('q2', 'What does this program print?', ['false false true false', 'false true true true', 'false true true false', 'true true true true'], 'The rule uses `g > 9 && g < 12`, which excludes the boundary values 9 and 12. So 8 gives false, 9 gives false, 10 gives true and 12 gives false: a classic off-by-one error that only boundary tests find.', JS('const isValid = (g) => Number.isInteger(g) && g > 9 && g < 12;\nconsole.log([8, 9, 10, 12].map(isValid).join(" "));')),
    mcq('q3', 'On `main` the history is A, B, C. A branch `feature` was made at B and has one commit D. What does `git merge feature` create when you are on `main`?', ['A merge commit with the two parents C and D', 'A fast-forward that only moves the label `main` to D', 'Nothing, because the branch is already merged', 'A merge conflict in every case'], 'Both lines have new commits (C on `main`, D on `feature`), so the label cannot simply slide forward: Git makes a merge commit with two parents. A conflict happens only if both sides changed the same lines.'),
    mcq('q4', 'A function returns a wrong value but shows no error message. What is the best first step?', ['Find the smallest input that always gives the wrong result', 'Rewrite the whole function from scratch', 'Change lines at random until the output looks right', 'Assume that the language itself has a bug'], 'Debugging starts with reproducing the failure with the smallest input that always fails. Then you can isolate the cause, form a hypothesis and test it, instead of guessing.'),
    mcq('q5', 'What does this program print?', ['90 null', '60 null', '90 0', '60 0'], 'The missing score is removed first, so the average of 80 and 100 is 90; with only missing scores nothing is left, so the function returns null instead of dividing.', JS('const average = (scores) => {\n  const real = scores.filter((s) => s !== null);\n  return real.length === 0 ? null : real.reduce((a, b) => a + b, 0) / real.length;\n};\nconsole.log(average([80, null, 100]), average([null]));')),
  ],
  // @@quiz-end
});
