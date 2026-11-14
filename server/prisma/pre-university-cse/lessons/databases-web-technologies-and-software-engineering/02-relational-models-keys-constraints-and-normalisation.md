# Lumexa Mission Log: Databases, Web Technologies & Software Engineering

**Course/Path:** Databases, Web Technologies & Software Engineering
**Lesson:** 02 of 08
**Title:** Relational Models, Keys, Constraints and Normalisation
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** SQL (SQLite)

---

## Mission Brief

An ER diagram is a drawing. A relational database is a machine that *enforces* the rules of the drawing: it refuses a second account with the same e-mail address, a grade level of 13, a course that has no teacher, a mark of 150. These guarantees come from three ideas that you learn in this lesson: the **relational model** (all data lives in tables), **keys** (the primary key that identifies a row and the foreign key that links tables) and **constraints** (rules the database checks on every change).

You also learn **normalisation**, the method that removes the repeated facts that caused the trouble in Lesson 1, by splitting one big table into several smaller ones that are linked by keys. At the end you write the `schema.sql` of the Student Information Application and test it with bad data that must be refused.

## Learning Objectives

1. Describe the relational model: relations (tables), tuples (rows), attributes (columns), domains and NULL.
2. Distinguish super, candidate, primary, composite and foreign keys, and explain referential integrity.
3. Write `CREATE TABLE` statements with data types and the constraints NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY, CHECK and DEFAULT.
4. Explain functional dependencies, and normalise a table to first, second and third normal form.
5. Explain what the database does when a constraint is violated, and test constraints with bad data.
6. Turn the ER model of the SIA into a normalised schema and verify it with a schema report and constraint tests.

## Prerequisites

- Lesson 1: ER diagrams, entities, attributes, cardinality and the tables that an ER diagram becomes.
- Sets, relations and functions from the discrete mathematics course (a relation is a set of tuples).
- The SQL basics of Lesson 1: `SELECT`, `FROM`, `WHERE` and `ORDER BY`.

## Concept Explanation

### The relational model

In the **relational model**, invented by Edgar Codd in 1970, all data is stored in **relations**, which we draw as **tables**. A table has a fixed list of named **attributes** (the **columns**), and its content is a *set* of **tuples** (the **rows**). Each attribute has a **domain**: the set of allowed values (whole numbers from 9 to 12 for a grade level; text for a name). Three properties follow from the mathematics: there are **no duplicate rows**, the **order of rows does not matter**, and every value is **atomic**, a single value and not a list. The structure of the tables is the **schema**; the data in them at one moment is an **instance**.

A table can hold **NULL**: a special marker that means "unknown" or "not applicable". NULL is not zero and not an empty string: a student whose score has not been recorded yet has `score = NULL`, which is different from a score of 0. NULL is contagious in comparisons: `NULL = NULL` is not true, so you ask `IS NULL` instead.

### Keys

A **key** identifies a row. A **superkey** is any set of columns that is unique for every row; a **candidate key** is a *minimal* superkey (nothing can be removed); the one candidate key that you choose for the table is the **primary key**, which must be unique and never NULL and should never change. The other candidate keys are declared **UNIQUE**: in `students`, both `student_id` and `email` are candidate keys, and `student_id` is the primary key. A **composite key** has several columns: in `enrolments` the pair `(student_id, course_id)` is the primary key, because a student may enrol in a course only once. A **surrogate key** is a made-up number such as `student_id` that carries no meaning; it is usually better than a **natural key** such as an e-mail address, which can change.

A **foreign key** is a column whose values must match the primary key of a row in another table: `courses.teacher_id` points to `teachers.teacher_id`. The rule that every foreign key value refers to a row that exists (or is NULL) is **referential integrity**. It means that you cannot create a course for a non-existent teacher, and, by default, you cannot delete a teacher who still has courses. (SQL lets you choose other reactions with `ON DELETE CASCADE`, which deletes the dependent rows, or `ON DELETE SET NULL`.)

### Constraints in SQL

Constraints are declared when the table is created (`CREATE TABLE`) and checked by the database for every `INSERT`, `UPDATE` and `DELETE`:

- `PRIMARY KEY` — unique and not NULL; `INTEGER PRIMARY KEY` in SQLite numbers the rows automatically;
- `NOT NULL` — a value is required;
- `UNIQUE` — no two rows may have the same value;
- `CHECK (condition)` — a rule such as `grade_level BETWEEN 9 AND 12`;
- `DEFAULT value` — the value used when none is given;
- `FOREIGN KEY ... REFERENCES table (column)` — referential integrity. (SQLite enforces foreign keys only after the command `PRAGMA foreign_keys = ON;`.)

The common data types are `INTEGER` (whole numbers), `REAL` (decimals), `TEXT` (strings) and, in SQLite, `BLOB`. When a statement breaks a constraint, the database **rejects the whole statement** with an error message, and the data stays unchanged. This is the point of constraints: the *database* guarantees the rules, whatever the programs, the web pages or the typing mistakes of the users.

### Normalisation

**Normalisation** is the process of organising tables so that each fact is stored once. It is based on **functional dependencies**: *A → B* means that the value of A determines the value of B (a `student_id` determines the student's name). Consider the flat table `flat(student_id, student_name, grade_level, course_id, course_title, credits, teacher_name, teacher_email, score)` with the key `(student_id, course_id)`.

- **First normal form (1NF)**: every value is atomic, there are no repeating groups (a column "courses" with a list inside breaks it) and rows are identified by a key. The flat table is in 1NF.
- **Second normal form (2NF)**: 1NF plus **no partial dependency**: no non-key column may depend on *part* of a composite key. Here `student_name` and `grade_level` depend only on `student_id`, and `course_title`, `credits` and the teacher depend only on `course_id`. Move them to their own tables, `students` and `courses`; what remains, `enrolments(student_id, course_id, score)`, depends on the whole key.
- **Third normal form (3NF)**: 2NF plus **no transitive dependency**: no non-key column may depend on another non-key column. In `courses`, the teacher's e-mail depends on the teacher, who depends on the course (`course_id → teacher → teacher_email`). Move the teacher's data to a `teachers` table and keep only `teacher_id` in `courses`.

The result is exactly the four tables of the ER diagram of Lesson 1: every fact lives in one place. The price is that a question about a student's marks needs **joins** of several tables (Lesson 4); in rare cases, for speed, designers **denormalise** on purpose, accepting some repetition. The rule of thumb is: "every non-key column depends on the key, the whole key and nothing but the key."

## Key Vocabulary

| Term | Definition |
|---|---|
| **Relation / tuple / attribute** | A table / a row / a column. |
| **Domain** | The set of values that a column may hold. |
| **NULL** | The marker for "unknown" or "not applicable", different from 0 and from an empty string. |
| **Candidate key / primary key** | A minimal set of columns that identifies rows / the one that is chosen for the table. |
| **Composite key** | A key made of several columns. |
| **Foreign key** | A column that must match the primary key of a row in another table. |
| **Referential integrity** | The rule that every foreign key refers to a row that exists. |
| **Constraint** | A rule that the database checks on every change, such as NOT NULL, UNIQUE or CHECK. |
| **Functional dependency** | A → B: the value of A determines the value of B. |
| **Normalisation / 1NF, 2NF, 3NF** | Removing repeated facts by splitting tables, in steps called normal forms. |
| **Schema / instance** | The structure of the tables / the data they hold at one moment. |

## Worked Examples

### Example 1: Creating the tables with keys and constraints

```sql
-- setup
PRAGMA foreign_keys = ON;
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
```

```sql
-- query headers
PRAGMA table_info(courses);
```

```output
cid|name|type|notnull|dflt_value|pk
0|course_id|INTEGER|0|NULL|1
1|title|TEXT|1|NULL|0
2|credits|INTEGER|1|NULL|0
3|teacher_id|INTEGER|1|NULL|0
```

1. The first block is the schema of the SIA, a direct translation of the ER diagram: four tables, one for each entity and one junction table, `enrolments`, for the many-to-many relationship. `PRAGMA foreign_keys = ON;` switches on the enforcement of foreign keys.
2. `INTEGER PRIMARY KEY` makes `course_id` the key (unique, never NULL). `NOT NULL` makes a value compulsory, `UNIQUE` makes every title different and the `CHECK` lines keep credits and grade levels in range. `REFERENCES teachers (teacher_id)` makes `teacher_id` a foreign key.
3. `enrolments` has a **composite primary key** `(student_id, course_id)`: the same student cannot enrol in the same course twice. Its `score` column has no `NOT NULL`, so it may be empty until the course is graded.
4. `PRAGMA table_info(courses)` reports the columns of the table: position, name, type, whether NOT NULL is set (1) and whether it is part of the primary key (the last column). The database knows its own schema, and this is how tools and programs can ask for it.

### Example 2: Constraints at work

```sql
-- query headers
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example');
INSERT INTO students VALUES (1, 'Ayesha Rahman', 'ayesha@student.example', 10);
INSERT OR IGNORE INTO students VALUES (2, 'Fake Ayesha', 'ayesha@student.example', 10);
INSERT OR IGNORE INTO students VALUES (3, 'Too Old', 'old@student.example', 13);
INSERT OR IGNORE INTO students VALUES (4, NULL, 'noname@student.example', 9);
INSERT OR IGNORE INTO students VALUES (1, 'Same Id', 'same@student.example', 9);
SELECT COUNT(*) AS students_stored FROM students;
```

```output
students_stored
1
```

```text
UNIQUE constraint failed: students.email
CHECK constraint failed: grade_level BETWEEN 9 AND 12
NOT NULL constraint failed: students.name
UNIQUE constraint failed: students.student_id
```

1. The two valid rows are stored. Then four bad rows are offered: a duplicate e-mail address, a grade level of 13, a missing name and a repeated student number. `INSERT OR IGNORE` tells SQLite to skip a row that breaks a rule instead of stopping with an error.
2. After all four attempts, only **one** student is stored: the database refused every bad row. That is the guarantee of constraints.
3. Without `OR IGNORE`, each bad `INSERT` stops with an error and changes nothing. The four lines of the text block are the messages of the four statements (the exact wording of the CHECK message can differ a little between SQLite versions): the first names the unique column, the second the broken check, the third the missing value and the fourth the duplicated primary key.
4. The same protection holds for foreign keys: `INSERT INTO courses VALUES (102, 'Physics', 3, 99)` fails with `FOREIGN KEY constraint failed` while no teacher number 99 exists, and so does deleting a teacher who still has courses.

### Example 3: Normalising a flat table

```sql
-- setup
CREATE TABLE flat (student_id INTEGER, student_name TEXT, grade_level INTEGER, course_id INTEGER, course_title TEXT, credits INTEGER, teacher_name TEXT, teacher_email TEXT, score INTEGER);
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
  (7, 'Tasnim Noor', 9, 103, 'ICT', 2, 'Imran Hossain', 'imran@school.example', 95);
```

```sql
-- query headers
SELECT teacher_email, COUNT(*) AS copies FROM flat GROUP BY teacher_email ORDER BY teacher_email;
```

```output
teacher_email|copies
imran@school.example|5
nusrat@school.example|7
rahim@school.example|5
```

```sql
-- query headers
CREATE TABLE students_n AS SELECT DISTINCT student_id, student_name, grade_level FROM flat;
CREATE TABLE teachers_n AS SELECT DISTINCT teacher_name, teacher_email FROM flat;
CREATE TABLE courses_n AS SELECT DISTINCT course_id, course_title, credits, teacher_name FROM flat;
CREATE TABLE enrolments_n AS SELECT student_id, course_id, score FROM flat;
SELECT 'flat table (before)' AS design, COUNT(*) AS row_count, 9 AS columns, COUNT(*) * 9 AS values_stored FROM flat
UNION ALL SELECT 'students', COUNT(*), 3, COUNT(*) * 3 FROM students_n
UNION ALL SELECT 'teachers', COUNT(*), 2, COUNT(*) * 2 FROM teachers_n
UNION ALL SELECT 'courses', COUNT(*), 4, COUNT(*) * 4 FROM courses_n
UNION ALL SELECT 'enrolments', COUNT(*), 3, COUNT(*) * 3 FROM enrolments_n;
```

```output
design|row_count|columns|values_stored
flat table (before)|17|9|153
students|7|3|21
teachers|3|2|6
courses|4|4|16
enrolments|17|3|51
```

1. The flat table has 17 rows, one for each enrolment, and every row repeats the student's name and grade level, the course data and the teacher's name and e-mail. The first query shows that each teacher's e-mail is stored as many times as the teacher has enrolments: 7 copies of Nusrat Jahan's address, 5 of Imran Hossain's address and 5 of Rahim Chowdhury's.
2. The flat table breaks 2NF (`student_name` depends on `student_id` alone; the course data on `course_id` alone) and 3NF (the teacher's e-mail depends on the teacher, not on the key). `SELECT DISTINCT` pulls each fact out once: one row for each student, each teacher and each course. The `enrolments` table keeps only the two keys and the score, which depend on the whole key.
3. Counting the stored values shows the gain: the flat table holds 17 rows × 9 columns = 153 values; the four small tables hold 21 + 6 + 16 + 51 = 94 values. More important than the saving is the safety: an e-mail address now has one home, so it can never contradict itself.
4. In the next step the `courses` table would hold `teacher_id` instead of the teacher's name (this lesson's schema already does), and the tables would be linked by joins (Lesson 4).

## Common Mistakes and Misconceptions

- **Using NULL as if it were 0 or an empty string.** NULL means "unknown"; compare it with `IS NULL`, never with `= NULL`.
- **Choosing a changeable value as the primary key.** E-mail addresses and names change; use a surrogate number.
- **Forgetting `PRAGMA foreign_keys = ON` in SQLite.** Without it the foreign keys are declared but not enforced.
- **Putting constraints only in the web page.** A page can be bypassed; the database is the last line of defence and must enforce the rules itself.
- **Confusing UNIQUE with PRIMARY KEY.** A table has one primary key but may have several unique columns; a unique column may be NULL where a primary key may not.
- **Splitting a table without keys.** After normalising, the tables must be linkable: every foreign key needs its primary key.
- **Over-normalising or never normalising.** Aim for 3NF; stop there unless a measured performance problem says otherwise.
- **Thinking a failed statement half-worked.** A rejected statement changes nothing.

## Guided Hands-On Activity

**Break the rules.** Work with your teacher in the SQL lab.

1. In Example 1 run `PRAGMA table_info(students);` and `PRAGMA table_info(enrolments);` and describe the primary key of each.
2. In Example 2 remove `OR IGNORE` from the second insert and run it: read the error message. Which constraint did you break?
3. In Example 2 add an `INSERT INTO courses VALUES (101, 'Mathematics', 4, 99);` (a course for a teacher that does not exist). What happens and why?
4. In Example 2 add `INSERT OR IGNORE INTO enrolments VALUES (1, 101, 150);` after creating course 101 and student 1. Is the row stored?
5. In Example 3 find the functional dependencies of the flat table: write at least four of the form `A → B`.
6. Add a student whose score is not yet known (`NULL`) to the flat table and run `SELECT * FROM flat WHERE score IS NULL;`. Why does `WHERE score = NULL` return nothing?

## Lesson Project: SIA: The Relational Schema

### Objective

Turn the ER model of Lesson 1 into the **relational schema** of the Student Information Application: write `schema.sql` with the four normalised tables, their keys and constraints, report the schema with a query, and test the constraints with eight bad inserts that must all be refused.

### Requirements

- **The tables.** `teachers(teacher_id, name, email)`, `students(student_id, name, email, grade_level)`, `courses(course_id, title, credits, teacher_id)` and `enrolments(student_id, course_id, score)`.
- **Keys.** An integer primary key in each of the first three tables; the composite primary key `(student_id, course_id)` in `enrolments`; the foreign keys `courses.teacher_id`, `enrolments.student_id` and `enrolments.course_id`.
- **Constraints.** `NOT NULL` for every column except `score`; `UNIQUE` for the e-mail columns and for the course title; `CHECK (grade_level BETWEEN 9 AND 12)`, `CHECK (credits > 0)` and `CHECK (score BETWEEN 0 AND 100)`.
- **Schema report.** One query that lists every table with each of its columns, their types, whether NOT NULL is set and whether the column belongs to the primary key (use `sqlite_master` and `pragma_table_info`).
- **Constraint tests.** After inserting one valid teacher, student, course and enrolment, try these eight bad inserts and write down the error message of each: a duplicate student e-mail, a grade level of 13, a student without a name, a repeated student number, a course for an unknown teacher, a course with negative credits, a score of 150 and a second enrolment of the same student in the same course.
- In your portfolio, include the SQL file, the schema report and the table of the eight tests with their messages, and explain which normal form each design decision satisfies.

### Instructions

1. Write the four `CREATE TABLE` statements in the order teachers, students, courses, enrolments, with `PRAGMA foreign_keys = ON;` first.
2. Run the script in the SQL lab and check that it ends without an error.
3. Write the schema report query and compare its output with the expected output.
4. Insert one valid row in each table.
5. Run each of the eight bad inserts alone (without `OR IGNORE`) and write down the message.
6. Run the constraint test again with `INSERT OR IGNORE` and check that the row counts do not change.
7. Write a short paragraph on 1NF, 2NF and 3NF for the SIA.

### Expected Output

```text
Schema report
table|column|type|not_null|pk
courses|course_id|INTEGER|0|1
courses|title|TEXT|1|0
courses|credits|INTEGER|1|0
courses|teacher_id|INTEGER|1|0
enrolments|student_id|INTEGER|1|1
enrolments|course_id|INTEGER|1|2
enrolments|score|INTEGER|0|0
students|student_id|INTEGER|0|1
students|name|TEXT|1|0
students|email|TEXT|1|0
students|grade_level|INTEGER|1|0
teachers|teacher_id|INTEGER|0|1
teachers|name|TEXT|1|0
teachers|email|TEXT|1|0

Constraint test with INSERT OR IGNORE (rows stored)
table|rows_stored
students|1
courses|1
enrolments|1

Error messages without OR IGNORE
duplicate e-mail            UNIQUE constraint failed: students.email
grade level 13              CHECK constraint failed: grade_level BETWEEN 9 AND 12
no name                     NOT NULL constraint failed: students.name
repeated student number     UNIQUE constraint failed: students.student_id
unknown teacher             FOREIGN KEY constraint failed
negative credits            CHECK constraint failed: credits > 0
score of 150                CHECK constraint failed: score BETWEEN 0 AND 100
same enrolment twice        UNIQUE constraint failed: enrolments.student_id, enrolments.course_id
```

### Hints

1. **Hint 1 (the order).** Create `teachers` before `courses` and `students` and `courses` before `enrolments`, because a foreign key refers to a table that must already exist.
2. **Hint 2 (the composite key).** Write `PRIMARY KEY (student_id, course_id)` as a separate line at the end of the `enrolments` definition.
3. **Hint 3 (the check).** `CHECK (score BETWEEN 0 AND 100)` lets NULL through, which is what we want for a score that is not known yet.
4. **Hint 4 (the report).** `FROM sqlite_master AS m, pragma_table_info(m.name) AS p WHERE m.type = 'table'` joins every table name with its columns.
5. **Hint 5 (the tests).** Run the inserts one by one: after an error, the rest of a script is not executed.
6. **Hint 6 (foreign keys).** If the unknown-teacher insert is accepted, you forgot `PRAGMA foreign_keys = ON;`.

### Success Criteria

- [ ] `schema.sql` creates four tables and runs without an error.
- [ ] The schema report lists 14 columns with the correct types, NOT NULL flags and primary-key positions.
- [ ] Each of the eight bad inserts is refused with a message that names the broken rule.
- [ ] With `INSERT OR IGNORE`, the row counts stay at one student, one course and one enrolment.
- [ ] The foreign key test works only because foreign keys were switched on.
- [ ] The portfolio paragraph explains 1NF, 2NF and 3NF for the SIA.

### Extension Challenge

Add `ON DELETE CASCADE` to the foreign key `enrolments.student_id`, so that deleting a student also removes their enrolments, and show with two queries that it works. Then add a `DEFAULT 'active'` column `status` to `students` with a CHECK that only allows `active`, `graduated` and `left`. Finally create an index on `enrolments(course_id)` and explain, in two sentences, what an index is for and what it costs.

## Lesson Recap

- The **relational model** stores data in tables of rows and columns; there are no duplicate rows, row order does not matter and values are atomic; **NULL** means unknown.
- A **primary key** identifies a row; a **composite key** has several columns; a **foreign key** links to another table and **referential integrity** keeps the link valid.
- **Constraints** (NOT NULL, UNIQUE, CHECK, DEFAULT, PRIMARY KEY, FOREIGN KEY) make the database itself refuse bad data; the rejected statement changes nothing.
- **Normalisation** (1NF, 2NF, 3NF) removes repeated facts by splitting tables along functional dependencies: every non-key column depends on the key, the whole key and nothing but the key.

## Homework / Extension Mission

Take the flat table of a small shop (`sale_id, customer_name, customer_phone, product_name, product_price, quantity`) and normalise it to 3NF: write the functional dependencies, name the tables and their keys, and write the `CREATE TABLE` statements with constraints. Then check them in the SQL lab with a few valid and invalid rows. Finally, explain in four sentences why a web form that checks the grade level is not enough, even if the database already has a `CHECK` constraint.

## Course Project Connection

This lesson turns the ER diagram of the **Student Information Application**, the course project, into its relational schema: `teachers`, `students`, `courses` and `enrolments`, with keys and constraints that guarantee the rules. In Lesson 3 you create this database, load the sample data and write the queries, in Lesson 4 you add the reports and the safe enrolment, and in Lessons 5 and 6 the web page shows the data. The schema you write now does not change again.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: tables, rows and NULL (ask: is NULL the same as 0?); 10 minutes: keys with the SIA tables on the board; 10 minutes: constraints, with live attempts to break them in the SQL lab; 15 minutes: normalisation of the flat table in three steps; 15 minutes: the project.

**Live demonstrations.** Run the bad inserts one by one and read the messages aloud. Show `PRAGMA foreign_keys = OFF` and watch an unknown teacher being accepted, then switch it on. Normalise the flat table by colouring the columns that depend on `student_id` and on `course_id`.

**Misconceptions.** "NULL is zero." "The web page is enough to check the data." "The primary key can be any column." "More tables are always better."

**Assessment of the project.** Run each student's `schema.sql` in the lab; check the 14-column report, the eight refused inserts and the explanation of the normal forms. Ask why `score` has no NOT NULL.

**Reference solution `schema.sql`** (with the schema report and the constraint test; run in the SQL lab):

```sql
-- setup
PRAGMA foreign_keys = ON;
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
```

The schema report:

```sql
-- query headers
SELECT m.name AS "table", p.name AS "column", p.type, p."notnull" AS not_null, p.pk
FROM sqlite_master AS m, pragma_table_info(m.name) AS p
WHERE m.type = 'table'
ORDER BY m.name, p.cid;
```

```output
table|column|type|not_null|pk
courses|course_id|INTEGER|0|1
courses|title|TEXT|1|0
courses|credits|INTEGER|1|0
courses|teacher_id|INTEGER|1|0
enrolments|student_id|INTEGER|1|1
enrolments|course_id|INTEGER|1|2
enrolments|score|INTEGER|0|0
students|student_id|INTEGER|0|1
students|name|TEXT|1|0
students|email|TEXT|1|0
students|grade_level|INTEGER|1|0
teachers|teacher_id|INTEGER|0|1
teachers|name|TEXT|1|0
teachers|email|TEXT|1|0
```

The constraint test (one valid row in each table, then the bad rows with `OR IGNORE`; the counts must stay at 1):

```sql
-- query headers
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example');
INSERT INTO students VALUES (1, 'Ayesha Rahman', 'ayesha@student.example', 10);
INSERT INTO courses VALUES (101, 'Mathematics', 4, 1);
INSERT INTO enrolments VALUES (1, 101, 92);
INSERT OR IGNORE INTO students VALUES (2, 'Fake Ayesha', 'ayesha@student.example', 10);
INSERT OR IGNORE INTO students VALUES (3, 'Too Old', 'old@student.example', 13);
INSERT OR IGNORE INTO students VALUES (4, NULL, 'noname@student.example', 9);
INSERT OR IGNORE INTO students VALUES (1, 'Same Id', 'same@student.example', 9);
INSERT OR IGNORE INTO courses VALUES (102, 'Physics', -3, 1);
INSERT OR IGNORE INTO enrolments VALUES (1, 101, 150);
INSERT OR IGNORE INTO enrolments VALUES (1, 101, 50);
SELECT 'students' AS "table", COUNT(*) AS rows_stored FROM students
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'enrolments', COUNT(*) FROM enrolments;
```

```output
table|rows_stored
students|1
courses|1
enrolments|1
```

Without `OR IGNORE`, the eight bad inserts of the project fail with messages like these (the unknown-teacher insert needs `PRAGMA foreign_keys = ON;`):

```text
duplicate e-mail            UNIQUE constraint failed: students.email
grade level 13              CHECK constraint failed: grade_level BETWEEN 9 AND 12
no name                     NOT NULL constraint failed: students.name
repeated student number     UNIQUE constraint failed: students.student_id
unknown teacher             FOREIGN KEY constraint failed
negative credits            CHECK constraint failed: credits > 0
score of 150                CHECK constraint failed: score BETWEEN 0 AND 100
same enrolment twice        UNIQUE constraint failed: enrolments.student_id, enrolments.course_id
```

**Differentiation.** Support: provide the `CREATE TABLE` statements for `teachers` and `students` and let students write `courses` and `enrolments`, with a checklist of the constraints. Stretch: `ON DELETE CASCADE`, the status column and the index.

**Discussion questions (not for the student quiz).** Why should the database, and not only the program, enforce the rules? When would you choose a natural key such as an e-mail address instead of a surrogate number? What can go wrong if a table is normalised too far?
