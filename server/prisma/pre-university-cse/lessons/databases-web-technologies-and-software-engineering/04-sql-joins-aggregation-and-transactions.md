# Lumexa Mission Log: Databases, Web Technologies & Software Engineering

**Course/Path:** Databases, Web Technologies & Software Engineering
**Lesson:** 04 of 08
**Title:** SQL Joins, Aggregation and Transactions
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** SQL (SQLite)

---

## Mission Brief

A normalised database keeps every fact in one place, and that has a price: the facts that you want to *see together* are spread over several tables. A report card needs the student's name (in `students`), the course title (in `courses`) and the score (in `enrolments`). The tool that puts them back together is the **join**. And a head teacher does not want 17 rows of scores; she wants the *average per course*, the *highest mark* and *how many students* each course has. That is **aggregation**.

There is a third problem: what if the power fails halfway through a change that needs two steps, such as moving a student from one course to another? **Transactions** make a group of statements succeed or fail as a whole. In this lesson you learn all three, and you write the **reports** and the **safe enrolment** of the Student Information Application.

## Learning Objectives

1. Combine tables with `INNER JOIN` and `LEFT JOIN`, with table aliases, and explain what each returns.
2. Find rows without a match with a `LEFT JOIN` and `IS NULL`.
3. Summarise data with `COUNT`, `SUM`, `AVG`, `MIN` and `MAX`, and group it with `GROUP BY`.
4. Distinguish `WHERE` from `HAVING`, and write a simple subquery.
5. Explain transactions and the ACID properties, and use `BEGIN`, `COMMIT` and `ROLLBACK`.
6. Write the reports and a safe, conditional enrolment for the SIA.

## Prerequisites

- Lesson 3: `SELECT`, `WHERE`, `ORDER BY`, `LIKE`, `CASE` and the CRUD statements.
- Lesson 2: keys and foreign keys (a join matches a foreign key with a primary key).
- The SIA schema and sample data of Lesson 3 (the setup of this lesson is the same).

## Concept Explanation

### Joins: putting tables back together

A **join** combines rows of two tables whose values match. You write the match in the `ON` clause, usually a foreign key against a primary key: `ON s.student_id = e.student_id`. Tables get short **aliases** (`students AS s`, or just `students s`) so that columns can be named without confusion (`s.name`, `c.title`).

- **INNER JOIN** (or just `JOIN`) keeps only the pairs that match. A student with no enrolment, or a course with no student, does not appear.
- **LEFT JOIN** keeps *every* row of the left table and, where there is no match in the right table, fills the right-hand columns with **NULL**. It answers questions about absence: students with no enrolment are exactly the rows of `students LEFT JOIN enrolments` where the right-hand key `IS NULL`.
- A join of three or more tables is simply a chain of joins: `enrolments JOIN students JOIN courses`.
- A join *without* an `ON` condition (a **cross join**) pairs every row with every row: 8 students × 4 courses = 32 rows. If a report shows far too many rows, a missing or wrong `ON` is the usual cause.

(`RIGHT JOIN` and `FULL JOIN` exist too, but a `RIGHT JOIN` is just a `LEFT JOIN` with the tables swapped, so most people never use it.)

### Aggregation and grouping

An **aggregate function** turns many rows into one value: `COUNT(*)` counts rows, `COUNT(column)` counts the rows where the column is not NULL, `SUM`, `AVG` (the mean), `MIN` and `MAX`. Used alone, they summarise the whole table: `SELECT AVG(score) FROM enrolments;`. With **GROUP BY** they summarise each *group*: `GROUP BY course_id` makes one group per course, and the aggregates are calculated per group, so you get one row per course. Every column in the `SELECT` list must either be in the `GROUP BY` or inside an aggregate function. `ROUND(x, 1)` rounds to one decimal place.

Two filters work at different times. `WHERE` filters the **rows before** they are grouped; `HAVING` filters the **groups after** the aggregates are calculated. So "only the courses whose average is at least 75" is a `HAVING`, because the average does not exist until the groups are formed, while "only the scores of grade 10 students" is a `WHERE`. The full evaluation order is now: `FROM` and `JOIN`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`, `LIMIT`.

A **subquery** is a query inside a query, in brackets. A subquery that returns one value can be used like a number: `WHERE score > (SELECT AVG(score) FROM enrolments)` finds the scores that are above the overall average. A subquery that returns a list works with `IN`: `WHERE student_id IN (SELECT student_id FROM enrolments)`. `EXISTS` and `NOT EXISTS` ask whether a subquery returns any row at all.

### Transactions and ACID

Some changes consist of several statements that only make sense together: moving 500 taka from one account to another is a `UPDATE` that subtracts and an `UPDATE` that adds. If the power fails between them, 500 taka have vanished. A **transaction** groups statements so that they take effect **all or nothing**: you start with `BEGIN`, finish with `COMMIT` to keep the changes, or with `ROLLBACK` to undo all of them. (Every single statement is already a small transaction of its own.) A database that offers reliable transactions promises the four **ACID** properties: **Atomicity** (all or nothing), **Consistency** (the constraints hold before and after, so the data moves from one valid state to another), **Isolation** (transactions running at the same time do not see each other's half-finished work) and **Durability** (once committed, the change survives a crash).

Transactions are also the tool for **concurrency**. In an enrolment system two students may press "enrol" for the last seat at the same moment. A *check* ("is there still a seat?") followed by an *insert* is dangerous if another transaction can slip in between. The safest form is to do the check and the insert in **one statement**: `INSERT ... SELECT ... WHERE (seats are left)` inserts the row only if the condition is true at that moment, and the database makes the whole statement atomic.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Join** | Combining rows of two tables whose values match. |
| **INNER JOIN / LEFT JOIN** | A join that keeps only matching pairs / one that keeps all rows of the left table, with NULL where there is no match. |
| **Alias** | A short temporary name for a table or column, such as `s` for `students`. |
| **Aggregate function** | A function that turns many rows into one value: COUNT, SUM, AVG, MIN, MAX. |
| **GROUP BY** | Forms groups of rows so that aggregates are calculated for each group. |
| **HAVING** | Filters groups after the aggregates are calculated (WHERE filters rows before). |
| **Subquery** | A query inside another query. |
| **Transaction** | A group of statements that succeed or fail as a whole. |
| **COMMIT / ROLLBACK** | Keep all the changes of the transaction / undo them all. |
| **ACID** | Atomicity, consistency, isolation, durability. |
| **Concurrency** | Many users changing the database at the same time. |

## Worked Examples

### Example 1: Joins

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
SELECT s.name AS student, c.title AS course, e.score
FROM enrolments AS e
JOIN students AS s ON s.student_id = e.student_id
JOIN courses AS c ON c.course_id = e.course_id
WHERE c.title = 'Mathematics'
ORDER BY e.score DESC;
```

```output
student|course|score
Ayesha Rahman|Mathematics|92
Mim Akter|Mathematics|88
Sadia Islam|Mathematics|74
Tanvir Ahmed|Mathematics|67
Rafi Karim|Mathematics|45
```

```sql
-- query headers
SELECT s.name, e.course_id
FROM students AS s
LEFT JOIN enrolments AS e ON e.student_id = s.student_id
WHERE s.student_id IN (7, 8)
ORDER BY s.student_id;
```

```output
name|course_id
Tasnim Noor|103
Tasnim Noor|104
Fahim Sarker|NULL
```

```sql
-- query headers
SELECT s.name AS student_without_courses
FROM students AS s
LEFT JOIN enrolments AS e ON e.student_id = s.student_id
WHERE e.student_id IS NULL;
```

```output
student_without_courses
Fahim Sarker
```

1. The first query joins **three tables**: each enrolment is matched with its student (`ON s.student_id = e.student_id`) and with its course. The `WHERE` keeps Mathematics, and `ORDER BY` puts the best score first. Names that were scattered over three tables are now in one row.
2. The second query shows what a **LEFT JOIN** does. Tasnim (7) has two enrolments, so she appears twice. Fahim (8) has none, but he is still in the result, with a NULL where the course would be: the left table's rows are never lost.
3. The third query uses that NULL to find the students **without** any enrolment: the right-hand key is NULL exactly when no match exists. An inner join could never answer this question, because it drops the unmatched rows.
4. Aliases (`s`, `e`, `c`) keep the queries short and make clear which table a column comes from; `student_id` exists in two tables, so it must be written with its alias.

### Example 2: Aggregation, grouping and HAVING

```sql
-- query headers
SELECT c.title, COUNT(*) AS students, ROUND(AVG(e.score), 1) AS average, MIN(e.score) AS lowest, MAX(e.score) AS highest
FROM enrolments AS e
JOIN courses AS c ON c.course_id = e.course_id
GROUP BY c.course_id
ORDER BY average DESC;
```

```output
title|students|average|lowest|highest
ICT|5|78.0|60|95
Physics|3|77.7|55|93
English|4|77.5|66|91
Mathematics|5|73.2|45|92
```

```sql
-- query headers
SELECT c.title, ROUND(AVG(e.score), 1) AS average
FROM enrolments AS e
JOIN courses AS c ON c.course_id = e.course_id
WHERE e.score >= 60
GROUP BY c.course_id
HAVING COUNT(*) >= 4
ORDER BY c.title;
```

```output
title|average
English|77.5
ICT|78.0
Mathematics|80.3
```

```sql
-- query headers
SELECT student_id, score FROM enrolments
WHERE score > (SELECT AVG(score) FROM enrolments)
ORDER BY score DESC, student_id;
```

```output
student_id|score
7|95
5|93
1|92
3|91
2|88
5|88
1|85
5|81
1|78
```

1. The first query makes **one group per course** (`GROUP BY c.course_id`) and calculates five aggregates for each group: the number of enrolments, the average rounded to one decimal, the lowest and the highest score. The result has one row per course, sorted by the alias `average`.
2. The second query shows the difference between `WHERE` and `HAVING`. `WHERE e.score >= 60` throws out low scores *before* grouping; then the groups are formed; then `HAVING COUNT(*) >= 4` keeps only the courses that still have four or more scores. Mathematics (4 scores of 60 or more), English (4) and ICT (5) survive; Physics, with only 2 scores of 60 or more, does not.
3. The third query uses a **subquery** that returns one number, the overall average of all scores (about 76.4). The outer query lists the scores above it. The subquery runs once and its value is used like a constant.
4. Aggregates ignore NULL: `AVG(score)` is computed over the scores that exist, and `COUNT(score)` counts only them, while `COUNT(*)` counts every row.

### Example 3: Transactions

```sql
-- query headers
BEGIN;
INSERT INTO enrolments (student_id, course_id, score) VALUES (8, 101, 70);
COMMIT;
BEGIN;
DELETE FROM enrolments;
ROLLBACK;
SELECT COUNT(*) AS enrolments_stored FROM enrolments;
```

```output
enrolments_stored
18
```

```sql
-- query headers
INSERT INTO enrolments (student_id, course_id)
SELECT 8, 103
WHERE (SELECT COUNT(*) FROM enrolments WHERE course_id = 103) < 6
  AND NOT EXISTS (SELECT 1 FROM enrolments WHERE student_id = 8 AND course_id = 103);
INSERT INTO enrolments (student_id, course_id)
SELECT 3, 103
WHERE (SELECT COUNT(*) FROM enrolments WHERE course_id = 103) < 6
  AND NOT EXISTS (SELECT 1 FROM enrolments WHERE student_id = 3 AND course_id = 103);
SELECT COUNT(*) AS students_in_ICT FROM enrolments WHERE course_id = 103;
```

```output
students_in_ICT
6
```

1. In the first script, the first transaction adds an enrolment and is **committed**: the change is permanent. The second transaction deletes *every* enrolment and is then **rolled back**: nothing is deleted. Seventeen original rows plus the one that was committed make 18, which proves that `COMMIT` kept its change and `ROLLBACK` undid the other.
2. A `ROLLBACK` is what happens automatically if the program crashes before the `COMMIT`: the database restores the state from before the transaction. This is atomicity: the transaction either happened completely or not at all.
3. The second script is a **safe, conditional enrolment**. Each `INSERT ... SELECT ... WHERE` inserts a row only if two things are true *at that moment*: fewer than 6 students are enrolled in the course and the student is not enrolled already. There is no gap between the check and the insert.
4. ICT has 5 students at the start, so student 8 gets the last seat (6 students), and the attempt of student 3 is silently refused because the course is full. The final count is 6, not 7: the capacity rule cannot be broken, even if two users try at the same time.

## Common Mistakes and Misconceptions

- **Forgetting the ON condition.** Without it the join pairs every row with every row (a cross join) and the report explodes.
- **Using an inner join to find missing rows.** An inner join drops them; use a `LEFT JOIN` and `IS NULL`.
- **Selecting a column that is neither grouped nor aggregated.** In `GROUP BY` queries, every selected column must be in the `GROUP BY` or inside an aggregate.
- **Putting an aggregate in WHERE.** `WHERE AVG(score) > 70` is an error; use `HAVING`, because the average exists only after grouping.
- **Using WHERE where HAVING is needed, and the reverse.** `WHERE` filters rows before the groups are formed, `HAVING` filters the groups.
- **Counting with the wrong COUNT.** `COUNT(*)` counts rows, `COUNT(score)` skips NULLs.
- **Checking first, inserting later.** Between the check and the insert another user can change the data; put both in one statement or one transaction.
- **Believing that a rollback needs special care.** A crash or an error before `COMMIT` rolls the transaction back automatically; that is the point.

## Guided Hands-On Activity

**Join, group and protect.** Work with your teacher in the SQL lab.

1. In Example 1 change the title in the first query to `Physics`. Which students appear, and in which order?
2. In Example 1 remove the `ON` condition from the join with `courses`. How many rows does the query return now, and why?
3. In Example 2 add `AVG(e.score) >= 75` as a `HAVING` condition to the first query. Which courses remain?
4. In Example 2 write a query for the *teachers* with the number of enrolments of all their courses (join `teachers`, `courses` and `enrolments`).
5. In Example 3 change the capacity from 6 to 5 and run the second script. What is the final count, and who was refused?
6. In Example 3 remove the `COMMIT` and replace the final `ROLLBACK` by `COMMIT`. What does the final count show now, and which rows were lost?

## Lesson Project: SIA: Reports and Safe Enrolment

### Objective

Write the **reports** and the **safe enrolment** of the Student Information Application: five reports that join and summarise the data, and a conditional enrolment that respects the capacity of a course and refuses duplicates. This adds the reporting layer to the **Student Information Application**.

### Requirements

- **R1 Roster.** Every enrolment with the student's name, the course title and the score, sorted by course title and then by student name.
- **R2 Course summary.** For each course: the title, the teacher's name, the number of enrolments, the average score rounded to one decimal and the highest score; the best average first.
- **R3 Report cards.** For each student who has at least two enrolments: the name, the number of courses and the average score rounded to one decimal, best average first (use `GROUP BY` and `HAVING`).
- **R4 Not enrolled.** The students who have no enrolment at all (`LEFT JOIN` and `IS NULL`).
- **R5 Above average.** The scores that are higher than the overall average, with the student's name and the course title, best first.
- **SE Safe enrolment.** A conditional `INSERT ... SELECT ... WHERE` that enrols a student in a course only if the course has fewer than 6 students and the student is not enrolled in it already. Test: student 8 in ICT (accepted: last seat), student 3 in ICT (refused: full), student 8 in ICT again (refused: duplicate) and student 8 in Physics (accepted). Show the number of students of each course afterwards.
- Save the reports as `reports.sql` with a comment above each, and explain in two sentences why SE does the check and the insert in one statement.

### Instructions

1. Load the schema and the sample data (copy the setup block of Example 1).
2. Write R1 as a three-table join and check the sort order.
3. Write R2 with the teacher (a fourth table) and `GROUP BY`; write R3 with `HAVING COUNT(*) >= 2`.
4. Write R4 with a `LEFT JOIN` and R5 with a subquery on the average.
5. Write SE as a reusable pattern, run the four test enrolments one after the other, then the final counts.
6. Compare each result with the expected output.
7. Save `reports.sql`, with comments, and write the two-sentence explanation.

### Expected Output

```text
R1 roster
course|student|score
English|Mim Akter|81
English|Nabil Hasan|72
English|Sadia Islam|91
English|Tasnim Noor|66
ICT|Ayesha Rahman|78
ICT|Nabil Hasan|69
ICT|Rafi Karim|60
ICT|Tanvir Ahmed|88
ICT|Tasnim Noor|95
Mathematics|Ayesha Rahman|92
Mathematics|Mim Akter|88
Mathematics|Rafi Karim|45
Mathematics|Sadia Islam|74
Mathematics|Tanvir Ahmed|67
Physics|Ayesha Rahman|85
Physics|Mim Akter|93
Physics|Nabil Hasan|55

R2 course summary
title|teacher|enrolments|average|highest
ICT|Imran Hossain|5|78.0|95
Physics|Nusrat Jahan|3|77.7|93
English|Nusrat Jahan|4|77.5|91
Mathematics|Rahim Chowdhury|5|73.2|92

R3 report cards of students with at least two enrolments
name|courses|average
Mim Akter|3|87.3
Ayesha Rahman|3|85.0
Sadia Islam|2|82.5
Tasnim Noor|2|80.5
Tanvir Ahmed|2|77.5
Nabil Hasan|3|65.3
Rafi Karim|2|52.5

R4 students who are not enrolled
name
Fahim Sarker

R5 scores above the overall average
student|course|score
Tasnim Noor|ICT|95
Mim Akter|Physics|93
Ayesha Rahman|Mathematics|92
Sadia Islam|English|91
Mim Akter|Mathematics|88
Tanvir Ahmed|ICT|88
Ayesha Rahman|Physics|85
Mim Akter|English|81
Ayesha Rahman|ICT|78

SE safe enrolment: four attempts, then the number of students in each course
title|students
English|4
ICT|6
Mathematics|5
Physics|4
```

### Hints

1. **Hint 1 (the join).** `FROM enrolments e JOIN students s ON s.student_id = e.student_id JOIN courses c ON c.course_id = e.course_id`.
2. **Hint 2 (the fourth table).** To get the teacher, add `JOIN teachers t ON t.teacher_id = c.teacher_id` and group by `c.course_id`.
3. **Hint 3 (HAVING).** `HAVING COUNT(*) >= 2` keeps the groups with two or more rows.
4. **Hint 4 (the absent rows).** `LEFT JOIN enrolments e ON e.student_id = s.student_id WHERE e.student_id IS NULL`.
5. **Hint 5 (the subquery).** `WHERE e.score > (SELECT AVG(score) FROM enrolments)`.
6. **Hint 6 (the safe insert).** `INSERT INTO enrolments (student_id, course_id) SELECT 8, 103 WHERE (SELECT COUNT(*) FROM enrolments WHERE course_id = 103) < 6 AND NOT EXISTS (...)`.

### Success Criteria

- [ ] R1 lists 17 enrolments in the right order, with names and titles instead of numbers.
- [ ] R2 shows four courses with their teachers, counts, averages and highest scores.
- [ ] R3 shows only the students with two or more courses.
- [ ] R4 returns exactly one student, Fahim Sarker.
- [ ] R5 lists only scores above the overall average (76.4).
- [ ] SE accepts the first and the last enrolment, refuses the full course and the duplicate, and no course exceeds 6 students.

### Extension Challenge

Write a report that shows, for each teacher, the number of different students that they teach (`COUNT(DISTINCT ...)`). Then write the "drop and add" move of a student from Physics to ICT as one transaction (`BEGIN`, `DELETE`, conditional `INSERT`, `COMMIT`) and explain what you would need in a programming language to roll back if the insert is refused. Finally, add a `capacity` column to `courses` and change SE so that it reads the capacity from the table instead of using the number 6.

## Lesson Recap

- A **join** matches rows through keys: `INNER JOIN` keeps matches only, `LEFT JOIN` keeps all left rows with NULL where nothing matches, and `LEFT JOIN ... IS NULL` finds absent rows.
- **Aggregate functions** (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) summarise rows; `GROUP BY` gives one result per group; `WHERE` filters rows before grouping and `HAVING` filters groups after it.
- A **subquery** is a query in brackets; a one-value subquery can be used like a number.
- A **transaction** (`BEGIN`, `COMMIT`, `ROLLBACK`) makes several statements succeed or fail as one; the database promises **ACID**; a conditional `INSERT ... SELECT ... WHERE` does the check and the insert atomically.

## Homework / Extension Mission

On your own table from Lesson 3 (books, members and loans work well), write: an inner join of three tables, a `LEFT JOIN` that finds the members who have never borrowed anything, a `GROUP BY` report with `COUNT` and `AVG`, a `HAVING` query and a subquery. Then describe in a paragraph a situation in a library where a transaction is needed (lending a book needs two changes), and write the statements between `BEGIN` and `COMMIT`.

## Course Project Connection

This lesson adds the **reporting layer** and the **safe enrolment** to the **Student Information Application**, the course project: the data that the web page will show is no longer raw rows but joined, summarised reports, and enrolment can no longer break the capacity rule. In Lessons 5 and 6 the web page presents and filters these results, and in Lessons 7 and 8 the whole application is specified, tested and shipped.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: why joins exist (show the report card with three tables on the board); 15 minutes: `INNER` and `LEFT JOIN` on the same two tables, with Fahim as the discussion point; 10 minutes: `GROUP BY`, `WHERE` against `HAVING`; 10 minutes: transactions and ACID with the bank transfer story; 15 minutes: the project.

**Live demonstrations.** Delete the `ON` condition and count the rows (32 for two tables, many more for three). Run the safe enrolment twice and watch the second attempt change nothing. Run the transaction script one statement at a time in the lab, showing the result sets in between.

**Misconceptions.** "A join modifies the tables." "`WHERE` and `HAVING` are the same." "`COUNT(score)` and `COUNT(*)` are the same." "Transactions are only for banks."

**Assessment of the project.** Compare R1 to R5 with the expected output; for SE check that both refused attempts change nothing and that the final counts do not exceed the capacity. Ask why the check and the insert are in one statement.

**Reference solution `reports.sql`** (the setup of Example 1 comes first; each report runs on top of it):

```sql
-- query headers
-- R1 roster
SELECT c.title AS course, s.name AS student, e.score
FROM enrolments AS e
JOIN students AS s ON s.student_id = e.student_id
JOIN courses AS c ON c.course_id = e.course_id
ORDER BY c.title, s.name;
```

```output
course|student|score
English|Mim Akter|81
English|Nabil Hasan|72
English|Sadia Islam|91
English|Tasnim Noor|66
ICT|Ayesha Rahman|78
ICT|Nabil Hasan|69
ICT|Rafi Karim|60
ICT|Tanvir Ahmed|88
ICT|Tasnim Noor|95
Mathematics|Ayesha Rahman|92
Mathematics|Mim Akter|88
Mathematics|Rafi Karim|45
Mathematics|Sadia Islam|74
Mathematics|Tanvir Ahmed|67
Physics|Ayesha Rahman|85
Physics|Mim Akter|93
Physics|Nabil Hasan|55
```

```sql
-- query headers
-- R2 course summary
SELECT c.title, t.name AS teacher, COUNT(*) AS enrolments, ROUND(AVG(e.score), 1) AS average, MAX(e.score) AS highest
FROM enrolments AS e
JOIN courses AS c ON c.course_id = e.course_id
JOIN teachers AS t ON t.teacher_id = c.teacher_id
GROUP BY c.course_id
ORDER BY average DESC;
```

```output
title|teacher|enrolments|average|highest
ICT|Imran Hossain|5|78.0|95
Physics|Nusrat Jahan|3|77.7|93
English|Nusrat Jahan|4|77.5|91
Mathematics|Rahim Chowdhury|5|73.2|92
```

```sql
-- query headers
-- R3 report cards of students with at least two enrolments
SELECT s.name, COUNT(*) AS courses, ROUND(AVG(e.score), 1) AS average
FROM students AS s
JOIN enrolments AS e ON e.student_id = s.student_id
GROUP BY s.student_id
HAVING COUNT(*) >= 2
ORDER BY average DESC;
```

```output
name|courses|average
Mim Akter|3|87.3
Ayesha Rahman|3|85.0
Sadia Islam|2|82.5
Tasnim Noor|2|80.5
Tanvir Ahmed|2|77.5
Nabil Hasan|3|65.3
Rafi Karim|2|52.5
```

```sql
-- query headers
-- R4 students who are not enrolled
SELECT s.name
FROM students AS s
LEFT JOIN enrolments AS e ON e.student_id = s.student_id
WHERE e.student_id IS NULL;
```

```output
name
Fahim Sarker
```

```sql
-- query headers
-- R5 scores above the overall average
SELECT s.name AS student, c.title AS course, e.score
FROM enrolments AS e
JOIN students AS s ON s.student_id = e.student_id
JOIN courses AS c ON c.course_id = e.course_id
WHERE e.score > (SELECT AVG(score) FROM enrolments)
ORDER BY e.score DESC, s.name;
```

```output
student|course|score
Tasnim Noor|ICT|95
Mim Akter|Physics|93
Ayesha Rahman|Mathematics|92
Sadia Islam|English|91
Mim Akter|Mathematics|88
Tanvir Ahmed|ICT|88
Ayesha Rahman|Physics|85
Mim Akter|English|81
Ayesha Rahman|ICT|78
```

```sql
-- query headers
-- SE safe enrolment: four attempts, then the number of students in each course
INSERT INTO enrolments (student_id, course_id) SELECT 8, 103
WHERE (SELECT COUNT(*) FROM enrolments WHERE course_id = 103) < 6
  AND NOT EXISTS (SELECT 1 FROM enrolments WHERE student_id = 8 AND course_id = 103);
INSERT INTO enrolments (student_id, course_id) SELECT 3, 103
WHERE (SELECT COUNT(*) FROM enrolments WHERE course_id = 103) < 6
  AND NOT EXISTS (SELECT 1 FROM enrolments WHERE student_id = 3 AND course_id = 103);
INSERT INTO enrolments (student_id, course_id) SELECT 8, 103
WHERE (SELECT COUNT(*) FROM enrolments WHERE course_id = 103) < 6
  AND NOT EXISTS (SELECT 1 FROM enrolments WHERE student_id = 8 AND course_id = 103);
INSERT INTO enrolments (student_id, course_id) SELECT 8, 102
WHERE (SELECT COUNT(*) FROM enrolments WHERE course_id = 102) < 6
  AND NOT EXISTS (SELECT 1 FROM enrolments WHERE student_id = 8 AND course_id = 102);
SELECT c.title, COUNT(*) AS students FROM enrolments AS e JOIN courses AS c ON c.course_id = e.course_id GROUP BY c.course_id ORDER BY c.title;
```

```output
title|students
English|4
ICT|6
Mathematics|5
Physics|4
```

**Differentiation.** Support: provide the join of R1 as a model and the skeleton of the safe insert; students complete R2 to R5 by changing it. Stretch: the distinct-students report, the one-transaction move and the capacity column.

**Discussion questions (not for the student quiz).** Why is a `LEFT JOIN ... IS NULL` the right tool for "who has not done X"? What could go wrong if two users enrol in the last seat at the same moment and the check is done in the application and not in the database? Why do databases offer isolation levels?
