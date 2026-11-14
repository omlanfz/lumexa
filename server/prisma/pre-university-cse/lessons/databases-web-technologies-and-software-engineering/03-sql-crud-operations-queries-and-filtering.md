# Lumexa Mission Log: Databases, Web Technologies & Software Engineering

**Course/Path:** Databases, Web Technologies & Software Engineering
**Lesson:** 03 of 08
**Title:** SQL: CRUD Operations, Queries and Filtering
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** SQL (SQLite)

---

## Mission Brief

You have designed the data and written the schema. Now you make the database *do* things. SQL, the *structured query language*, has been the way to talk to relational databases since the 1970s, and it is still one of the most useful skills in computing: every analyst, back-end developer and data scientist uses it every week. Its power lies in one idea: you describe **what** you want, and the database works out **how** to get it.

In this lesson you learn the four everyday jobs of a database, **create, read, update and delete (CRUD)**, with `INSERT`, `SELECT`, `UPDATE` and `DELETE`, and you learn to **filter**, **sort** and **shape** the answers with `WHERE`, `ORDER BY`, `LIMIT`, `LIKE`, `BETWEEN`, `IN` and `CASE`. Then you load the sample data of the **Student Information Application** and write the queries that answer real questions about it.

## Learning Objectives

1. Name the parts of SQL (DDL, DML, DQL, DCL and TCL) and the four CRUD operations.
2. Insert, update and delete rows safely with `INSERT`, `UPDATE` and `DELETE`, always checking the `WHERE` clause.
3. Select columns and rows with `SELECT`, `WHERE`, comparison and logical operators, `BETWEEN`, `IN`, `LIKE` and `IS NULL`.
4. Sort and limit results with `ORDER BY`, `LIMIT` and `DISTINCT`, and shape them with aliases, expressions, functions and `CASE`.
5. Explain the logical order in which a query is evaluated.
6. Create the SIA database with its sample data and write eight queries that answer questions about it.

## Prerequisites

- Lessons 1 and 2: the SIA design, tables, keys and constraints (the schema of this lesson is the one of Lesson 2).
- Conditions and logic from the programming courses: comparison operators and `and`, `or`, `not`.

## Concept Explanation

### The parts of SQL and the CRUD operations

SQL is one language with several parts. **DDL** (data definition language) creates the structure: `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`. **DML** (data manipulation) changes the data: `INSERT`, `UPDATE`, `DELETE`. **DQL** (data query) reads it: `SELECT`. **DCL** (data control) manages permissions: `GRANT`, `REVOKE`. **TCL** (transaction control) groups changes safely: `COMMIT`, `ROLLBACK` (Lesson 4). Applications mostly perform four jobs, **CRUD**: **C**reate (`INSERT`), **R**ead (`SELECT`), **U**pdate (`UPDATE`) and **D**elete (`DELETE`). Keywords are not case-sensitive, a statement ends with a semicolon, `--` starts a comment, and text values are written in single quotes: `'Ayesha'`.

### Create, update and delete

`INSERT INTO table (columns) VALUES (values);` adds a row; name the columns, so that the statement still works if the table later gets a new column, and several rows can be added at once by listing several value lists. A column you leave out gets its `DEFAULT` or NULL (a missing `score` stays NULL). `UPDATE table SET column = value WHERE condition;` changes the rows that match the condition, and the right-hand side may use the old value: `SET grade_level = grade_level + 1`. `DELETE FROM table WHERE condition;` removes the matching rows. The most dangerous mistake in SQL is forgetting the **WHERE**: `UPDATE students SET grade_level = 10;` changes *every* row, and `DELETE FROM students;` empties the table. The habit that prevents it is to write the condition first as a `SELECT ... WHERE ...`, look at the rows it returns, and only then turn it into an `UPDATE` or `DELETE`. The constraints of Lesson 2 still apply: a change that would break a rule is refused.

### Reading data with SELECT

`SELECT` has the general shape

`SELECT columns FROM table WHERE condition ORDER BY columns LIMIT n;`

`SELECT *` returns all columns; naming columns returns only those. `AS` gives a column an **alias** (`credits * 10 AS points`). `DISTINCT` removes duplicate rows. `WHERE` keeps only the rows for which the condition is true. The comparison operators are `=`, `<>` (not equal), `<`, `>`, `<=` and `>=`; conditions combine with `AND`, `OR` and `NOT` (AND binds tighter than OR, so use parentheses). `BETWEEN a AND b` includes both ends, `IN (x, y, z)` tests membership, and `LIKE` searches text with the wildcards `%` (any characters) and `_` (exactly one character): `LIKE 'T%'` is "starts with T", `LIKE '%a%'` is "contains a". A missing value is found with `IS NULL`, never with `= NULL`. `ORDER BY` sorts (`ASC` is the default, `DESC` reverses, and a second column breaks ties), `LIMIT n` keeps the first *n* rows (so "top five" is `ORDER BY ... DESC LIMIT 5`).

You can also compute: arithmetic (`score * 1.1`), the text operator `||` (concatenation), functions such as `UPPER`, `LOWER`, `LENGTH`, `SUBSTR`, `ROUND` and `ABS`, and the conditional expression `CASE WHEN score >= 80 THEN 'A' WHEN score >= 60 THEN 'B' ELSE 'C' END`, which turns numbers into labels.

### How a query is evaluated

You write `SELECT` first, but the database thinks in a different order, and it helps to think the same way: first **FROM** (which table), then **WHERE** (which rows survive), then **SELECT** (which columns and expressions to compute), then **DISTINCT**, then **ORDER BY** (sort) and finally **LIMIT** (cut). This explains why an alias defined in `SELECT` can be used in `ORDER BY` but not in `WHERE`: when `WHERE` runs, the alias does not exist yet. Reading a query in this order, "from this table, keep these rows, show these columns, sort, cut", turns any question into a query.

## Key Vocabulary

| Term | Definition |
|---|---|
| **DDL / DML / DQL** | The parts of SQL that define structure / change data / read data. |
| **CRUD** | Create, read, update, delete: the four jobs of most applications. |
| **INSERT / UPDATE / DELETE** | Statements that add, change and remove rows. |
| **SELECT** | The statement that reads data. |
| **WHERE** | The clause that keeps only the rows for which a condition is true. |
| **ORDER BY / LIMIT** | Sort the result / keep only the first rows. |
| **Alias (AS)** | A temporary name for a column or expression in the result. |
| **LIKE** | A text search with the wildcards % (any characters) and _ (one character). |
| **DISTINCT** | Removes duplicate rows from the result. |
| **CASE** | An expression that returns different values for different conditions. |
| **Predicate** | A condition that is true, false or unknown for each row. |

## Worked Examples

### Example 1: Create: inserting rows

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
  (7, 104, 66), (7, 103, 95);
```

```sql
-- query headers
INSERT INTO students VALUES (9, 'Zara Khan', 'zara@student.example', 9);
INSERT INTO students (student_id, name, email, grade_level) VALUES
  (10, 'Omar Faruk', 'omar@student.example', 12),
  (11, 'Lina Das', 'lina@student.example', 10);
SELECT student_id, name, grade_level FROM students WHERE student_id >= 8 ORDER BY student_id;
```

```output
student_id|name|grade_level
8|Fahim Sarker|11
9|Zara Khan|9
10|Omar Faruk|12
11|Lina Das|10
```

```sql
-- query headers
INSERT INTO students VALUES (9, 'Zara Khan', 'zara@student.example', 9);
INSERT INTO enrolments (student_id, course_id) VALUES (9, 101);
SELECT * FROM enrolments WHERE student_id = 9;
```

```output
student_id|course_id|score
9|101|NULL
```

1. The first block is the **setup** that every example of this lesson builds on: the schema of Lesson 2 and the sample data of the SIA (3 teachers, 8 students, 4 courses and 17 enrolments with scores).
2. The first query inserts three students: one with a list of values in table order, two with a column list (`INSERT INTO students (student_id, name, ...) VALUES (...), (...)`). The `SELECT` shows the new rows together with student 8.
3. The second query enrols the new student in Mathematics, but gives no score: the column list contains only `student_id` and `course_id`, so `score` stays **NULL**: the course has no mark yet, which is different from a mark of 0.
4. Both queries start again from the setup, so the inserted rows are not kept between examples. In a real database they would be stored permanently.

### Example 2: Update and delete

```sql
-- query headers
UPDATE enrolments SET score = 54 WHERE student_id = 6 AND course_id = 101;
UPDATE students SET grade_level = 10 WHERE grade_level = 9;
DELETE FROM enrolments WHERE student_id = 7 AND course_id = 104;
SELECT 'enrolments left' AS what, COUNT(*) AS value FROM enrolments
UNION ALL SELECT 'students in grade 10', COUNT(*) FROM students WHERE grade_level = 10
UNION ALL SELECT 'Rafi''s score in Mathematics', score FROM enrolments WHERE student_id = 6 AND course_id = 101;
```

```output
what|value
enrolments left|16
students in grade 10|5
Rafi's score in Mathematics|54
```

1. The first `UPDATE` corrects one score: the `WHERE` names the whole key of the enrolment (student 6 and course 101), so exactly one row changes.
2. The second `UPDATE` is a **bulk** update: it moves every student of grade 9 (Sadia and Tasnim) to grade 10, so grade 10 now has five students instead of three.
3. The `DELETE` removes one enrolment, so 16 of the 17 enrolments are left. The three result lines come from three small queries joined with `UNION ALL`, which stacks result sets with the same number of columns.
4. Without a `WHERE`, `UPDATE students SET grade_level = 10;` would have changed *all eight* rows, and `DELETE FROM enrolments;` would have emptied the table. Always write and test the condition as a `SELECT` first.

### Example 3: Filtering, sorting and shaping

```sql
-- query headers
SELECT name, grade_level FROM students WHERE grade_level >= 11 ORDER BY name;
```

```output
name|grade_level
Fahim Sarker|11
Nabil Hasan|11
Rafi Karim|12
```

```sql
-- query headers
SELECT name FROM students WHERE name LIKE 'T%' OR name LIKE '%im%' ORDER BY name;
```

```output
name
Fahim Sarker
Mim Akter
Rafi Karim
Tanvir Ahmed
Tasnim Noor
```

```sql
-- query headers
SELECT student_id, score, CASE WHEN score >= 80 THEN 'A' WHEN score >= 60 THEN 'B' ELSE 'C' END AS band
FROM enrolments WHERE course_id = 101 ORDER BY score DESC;
```

```output
student_id|score|band
1|92|A
5|88|A
3|74|B
2|67|B
6|45|C
```

```sql
-- query headers
SELECT name, UPPER(name) AS shout, LENGTH(name) AS letters FROM students ORDER BY letters DESC, name LIMIT 3;
```

```output
name|shout|letters
Ayesha Rahman|AYESHA RAHMAN|13
Fahim Sarker|FAHIM SARKER|12
Tanvir Ahmed|TANVIR AHMED|12
```

1. The first query combines a comparison with sorting: the students of grade 11 or 12, in alphabetical order. The result has the two columns that `SELECT` names.
2. The second uses `LIKE`: names that start with T (`'T%'`) *or* contain `im` anywhere (`'%im%'`). Tanvir and Tasnim start with T; Fahim, Mim and Rafi Karim contain `im` (Fah-im, M-im, Kar-im); Tasnim matches both patterns. `LIKE` ignores the difference between capital and small letters for ordinary letters in SQLite.
3. The third query shapes numbers into labels with `CASE`: the Mathematics scores are shown from the highest to the lowest with the band A (80 and over), B (60 to 79) or C (below 60); the alias `band` is the column name in the result.
4. The fourth query computes with functions (`UPPER`, `LENGTH`), sorts by the alias `letters` (allowed in `ORDER BY`), breaks ties with the name and `LIMIT 3` keeps the three longest names.

## Common Mistakes and Misconceptions

- **Forgetting the WHERE of an UPDATE or DELETE.** It changes or deletes every row. Test the condition with a `SELECT` first.
- **Comparing with NULL using `=`.** Use `IS NULL` or `IS NOT NULL`.
- **Mixing AND and OR without parentheses.** `A OR B AND C` means `A OR (B AND C)`; write the parentheses you mean.
- **Using double quotes for text.** Text values go in single quotes; an apostrophe inside text is written twice (`'Rafi''s'`).
- **Thinking `BETWEEN` excludes the ends.** It includes both: `BETWEEN 80 AND 100` accepts 80.
- **Using an alias in WHERE.** The alias is created after `WHERE` is evaluated; repeat the expression or use a subquery.
- **Expecting a fixed row order without ORDER BY.** A table is a set: without `ORDER BY`, the order is not guaranteed.
- **Writing `LIMIT` without `ORDER BY` for a "top n".** Without sorting, you get n arbitrary rows.

## Guided Hands-On Activity

**Ask the database.** Work with your teacher in the SQL lab (every lab starts from the same data).

1. In Example 1 insert a student whose grade level is 13 and read the error. Then insert the same student with grade level 12.
2. In Example 2 replace the `DELETE` by a `SELECT` with the same `WHERE` and check that it returns exactly one row before you delete.
3. Write a query for the students of grade 10 whose name contains an `a`, sorted by name.
4. Write a query that shows the courses with the title in capital letters and the credits multiplied by 10 as `points`.
5. Write a query for the five best scores of all courses (`ORDER BY score DESC LIMIT 5`). What do you notice about ties?
6. Run `UPDATE students SET grade_level = 10;` in the lab and then `SELECT DISTINCT grade_level FROM students;`. Explain what happened; the lab starts again from the setup every time you run, so nothing is lost.

## Lesson Project: SIA: Create and Query the Database

### Objective

Create the **Student Information Application** database with its sample data and write **eight queries** that answer real questions about the school: sorting, filtering, searching with `LIKE`, ranges, distinct values, bands with `CASE` and a short create-update-delete sequence. This builds the data layer of the **Student Information Application**.

### Requirements

- **The database.** Use the schema of Lesson 2 and load the sample data of the setup of this lesson (3 teachers, 8 students, 4 courses, 17 enrolments).
- **Query 1.** All students, with grade level, sorted by name.
- **Query 2.** The courses of three or more credits, sorted by title.
- **Query 3.** The students whose name starts with `T`, sorted by name.
- **Query 4.** The five best scores of 80 or more (`BETWEEN`), sorted from the highest, ties broken by `student_id`: student, course and score.
- **Query 5.** The distinct grade levels, in order.
- **Query 6.** The Mathematics scores (course 101) with a band A, B or C written with `CASE` (A from 80, B from 60, C below 60), best first.
- **Query 7.** The students of grade 10 or 11 whose name contains an `a`, sorted by name.
- **Query 8.** A create-update-delete sequence: add the student `Zara Khan` (grade 9) and enrol her in course 101, set her score to 77, withdraw student 7 from course 104, and show the number of enrolments afterwards and Zara's score.
- Write each query's purpose in a comment, keep every `WHERE` condition tested with a `SELECT` before you use it in an `UPDATE` or `DELETE`, and save everything in one file `queries.sql`.

### Instructions

1. Create the tables of Lesson 2 and load the sample data (copy the setup block).
2. Write queries 1 and 2 and compare them with the expected output.
3. Write queries 3 to 5: `LIKE`, `BETWEEN` with `ORDER BY` and `LIMIT`, and `DISTINCT`.
4. Write query 6 with `CASE`, and query 7 with `IN`, `LIKE` and parentheses.
5. Write query 8: insert, update, delete, then the counting `SELECT`.
6. Run each query alone and check the rows against the expected output.
7. Add comments and save `queries.sql`; write two more questions of your own and answer them.

### Expected Output

```text
Q1 all students, sorted by name
name|grade_level
Ayesha Rahman|10
Fahim Sarker|11
Mim Akter|10
Nabil Hasan|11
Rafi Karim|12
Sadia Islam|9
Tanvir Ahmed|10
Tasnim Noor|9

Q2 courses with 3 or more credits
title|credits
English|3
Mathematics|4
Physics|3

Q3 students whose name starts with T
name
Tanvir Ahmed
Tasnim Noor

Q4 the five best scores of 80 or more
student_id|course_id|score
7|103|95
5|102|93
1|101|92
3|104|91
2|103|88

Q5 the distinct grade levels
grade_level
9
10
11
12

Q6 the Mathematics scores with a band
student_id|score|band
1|92|A
5|88|A
3|74|B
2|67|B
6|45|C

Q7 students of grade 10 or 11 whose name contains an a
name|grade_level
Ayesha Rahman|10
Fahim Sarker|11
Mim Akter|10
Nabil Hasan|11
Tanvir Ahmed|10

Q8 add Zara, enrol her, set her score, withdraw student 7 from English, then count
what|value
enrolments now|17
Zara's score in Mathematics|77
```

### Hints

1. **Hint 1 (sorting).** `ORDER BY name` sorts alphabetically; add `DESC` for the reverse.
2. **Hint 2 (LIKE).** `LIKE 'T%'` means "starts with T"; `LIKE '%a%'` means "contains a".
3. **Hint 3 (ranges).** `score BETWEEN 80 AND 100` includes 80 and 100.
4. **Hint 4 (the top five).** `ORDER BY score DESC, student_id LIMIT 5`.
5. **Hint 5 (CASE).** `CASE WHEN score >= 80 THEN 'A' WHEN score >= 60 THEN 'B' ELSE 'C' END AS band`; the conditions are tested in order.
6. **Hint 6 (the sequence).** Insert the student before the enrolment (the foreign key needs the student); in the final result, `UNION ALL` joins two small `SELECT` statements.

### Success Criteria

- [ ] The database is created and loaded without an error, with 8 students and 17 enrolments.
- [ ] Queries 1 to 7 return exactly the rows of the expected output.
- [ ] Query 8 leaves 17 enrolments (one added, one withdrawn) and shows Zara's score 77.
- [ ] No `UPDATE` or `DELETE` is run without a `WHERE`.
- [ ] Every query has a comment that says which question it answers.
- [ ] Two extra questions are written and answered in `queries.sql`.

### Extension Challenge

Write a query that shows each student's name and grade level together with a text label such as `'Ayesha Rahman (grade 10)'` using the `||` operator. Then write a query for the courses whose title is *not* `Mathematics` or `Physics` using `NOT IN`, and one for the enrolments in the score range 60 to 79 sorted by course. Finally, find out what `OFFSET` does and use `LIMIT 3 OFFSET 3` to show the second page of three students.

## Lesson Recap

- **CRUD**: `INSERT` creates, `SELECT` reads, `UPDATE` changes and `DELETE` removes rows; constraints still apply.
- **Always check the WHERE**: write the condition as a `SELECT` first; without it `UPDATE` and `DELETE` affect every row.
- `SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT` reads and shapes data; `LIKE`, `BETWEEN`, `IN` and `IS NULL` filter, `CASE` and functions compute.
- A query is evaluated as **FROM, WHERE, SELECT, ORDER BY, LIMIT**, which is why aliases work in `ORDER BY` but not in `WHERE`.

## Homework / Extension Mission

Invent a small table of your own (for example `books(book_id, title, author, year, copies)`) with at least eight rows, create it with sensible constraints and write ten queries on it: three with `WHERE`, two with `LIKE`, one with `BETWEEN`, one with `IN`, one with `ORDER BY ... LIMIT`, one with `CASE` and one `UPDATE` and one `DELETE` that you first test with a `SELECT`. Then explain in three sentences why `UPDATE` without `WHERE` is dangerous and how you protect yourself.

## Course Project Connection

This lesson builds the **data layer** of the **Student Information Application**, the course project: the database exists, holds the sample data, and answers the first real questions about students, courses and scores. In Lesson 4 you add reports that combine tables (joins and aggregates) and a safe enrolment that uses a transaction. In Lessons 5 and 6 the same data appears on a web page, where the page shows the rows that these queries return.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: CRUD on the board with the SIA tables; 15 minutes: `SELECT` step by step, adding one clause at a time in the lab; 10 minutes: the evaluation order (students predict whether an alias works in `WHERE`); 25 minutes: the project, in pairs, with the expected output on the board.

**Live demonstrations.** Run a `DELETE` with the `WHERE` forgotten *in the lab* (it starts again from the setup) to show the effect safely. Change one condition at a time and watch the rows change. Show `LIKE 'T%'` against `LIKE '%t%'`.

**Misconceptions.** "A table has a natural order." "`= NULL` finds the missing values." "`BETWEEN` excludes the ends." "An alias can be used anywhere."

**Assessment of the project.** Compare each query's rows with the expected output, check the `queries.sql` comments and the habit of testing a condition with `SELECT` before `UPDATE` or `DELETE`. Ask why query 8 inserts the student before the enrolment.

**Reference solution `queries.sql`** (the setup of Example 1 comes first; each query runs on top of it):

```sql
-- query headers
-- Q1 all students, sorted by name
SELECT name, grade_level FROM students ORDER BY name;
```

```output
name|grade_level
Ayesha Rahman|10
Fahim Sarker|11
Mim Akter|10
Nabil Hasan|11
Rafi Karim|12
Sadia Islam|9
Tanvir Ahmed|10
Tasnim Noor|9
```

```sql
-- query headers
-- Q2 courses with 3 or more credits
SELECT title, credits FROM courses WHERE credits >= 3 ORDER BY title;
```

```output
title|credits
English|3
Mathematics|4
Physics|3
```

```sql
-- query headers
-- Q3 students whose name starts with T
SELECT name FROM students WHERE name LIKE 'T%' ORDER BY name;
```

```output
name
Tanvir Ahmed
Tasnim Noor
```

```sql
-- query headers
-- Q4 the five best scores of 80 or more
SELECT student_id, course_id, score FROM enrolments WHERE score BETWEEN 80 AND 100 ORDER BY score DESC, student_id LIMIT 5;
```

```output
student_id|course_id|score
7|103|95
5|102|93
1|101|92
3|104|91
2|103|88
```

```sql
-- query headers
-- Q5 the distinct grade levels
SELECT DISTINCT grade_level FROM students ORDER BY grade_level;
```

```output
grade_level
9
10
11
12
```

```sql
-- query headers
-- Q6 the Mathematics scores with a band
SELECT student_id, score, CASE WHEN score >= 80 THEN 'A' WHEN score >= 60 THEN 'B' ELSE 'C' END AS band
FROM enrolments WHERE course_id = 101 ORDER BY score DESC;
```

```output
student_id|score|band
1|92|A
5|88|A
3|74|B
2|67|B
6|45|C
```

```sql
-- query headers
-- Q7 students of grade 10 or 11 whose name contains an a
SELECT name, grade_level FROM students WHERE grade_level IN (10, 11) AND name LIKE '%a%' ORDER BY name;
```

```output
name|grade_level
Ayesha Rahman|10
Fahim Sarker|11
Mim Akter|10
Nabil Hasan|11
Tanvir Ahmed|10
```

```sql
-- query headers
-- Q8 add Zara, enrol her, set her score, withdraw student 7 from English, then count
INSERT INTO students VALUES (9, 'Zara Khan', 'zara@student.example', 9);
INSERT INTO enrolments (student_id, course_id) VALUES (9, 101);
UPDATE enrolments SET score = 77 WHERE student_id = 9 AND course_id = 101;
DELETE FROM enrolments WHERE student_id = 7 AND course_id = 104;
SELECT 'enrolments now' AS what, COUNT(*) AS value FROM enrolments
UNION ALL SELECT 'Zara''s score in Mathematics', score FROM enrolments WHERE student_id = 9 AND course_id = 101;
```

```output
what|value
enrolments now|17
Zara's score in Mathematics|77
```

**Differentiation.** Support: give queries 1, 2 and 5 as models and let students write the other five, with a table of the `WHERE` operators on the desk. Stretch: the extension queries (`||`, `NOT IN`, `OFFSET`) and a plan for a "student search" page that uses these queries.

**Discussion questions (not for the student quiz).** Why does SQL describe *what* you want and not *how* to get it? What could an application do to avoid the "forgotten WHERE" accident (hint: think of the review of queries, backups and transactions)? Why is `LIKE '%a%'` slower on a big table than `= 'Ayesha'`?
