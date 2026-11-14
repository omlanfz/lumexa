# Lumexa Mission Log: Databases, Web Technologies & Software Engineering

**Course/Path:** Databases, Web Technologies & Software Engineering
**Lesson:** 01 of 08
**Title:** Database Fundamentals, DBMS and Entity-Relationship Diagrams
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** ER diagram · SQL (SQLite)

---

## Mission Brief

Every school keeps lists: students, courses, teachers, marks. Many schools keep them in spreadsheets, and every school that does discovers the same troubles: the same teacher's e-mail typed in fifty places, two files that disagree, a course that nobody can delete without losing a student. Almost every app you use, from a bank to a messaging service, solves this with a **database**.

In this course you build a **Student Information Application** (SIA): a real, small application with a designed database, SQL reports and a web page. This first lesson is about *thinking before typing*. You see why a flat list of records goes wrong, what a **database management system (DBMS)** gives you, how a database is designed, and how to draw an **entity-relationship (ER) diagram**. You write a small Python model checker that turns your design into tables, and you design the data of the SIA.

## Learning Objectives

1. Explain the difference between data and information, and the problems of storing records in files and spreadsheets (redundancy, inconsistency and anomalies).
2. Explain what a database and a DBMS are and list the services a DBMS provides.
3. Describe the steps of database design from requirements to implementation.
4. Identify entities, attributes, keys and relationships, and read and draw an ER diagram with its cardinalities (1:1, 1:N and M:N).
5. Explain how an ER diagram becomes tables, including the junction table for a many-to-many relationship.
6. Write a Python model of an ER diagram that checks itself and lists the tables to create, and apply it to the SIA.

## Prerequisites

- Courses 1 to 4: programming with variables, lists, dictionaries and functions in Python; sets and relations from the discrete mathematics course.
- Everyday use of a spreadsheet: rows, columns and tables.

## Concept Explanation

### Data, information and the trouble with flat files

**Data** are raw facts: `92`, `Ayesha`, `Physics`. **Information** is data in a context that makes it useful: "Ayesha scored 92 in Physics, the highest mark in the class". A database turns facts into information when you ask it questions.

The simplest way to store records is one big flat file or spreadsheet with one row for each fact: *student, course, teacher, teacher's e-mail, score*. It works for a day and then causes trouble. **Redundancy**: the teacher's name and e-mail are repeated in every row of every course she teaches. **Inconsistency**: when she changes her e-mail and somebody edits only some rows, the file now contains two different e-mails for the same person (an **update anomaly**). **Insertion anomaly**: you cannot store a new teacher until she has at least one student. **Deletion anomaly**: if the last student leaves a course, you lose the only record of the course and of its teacher. Add to these the lack of rules (a score of 250 is accepted), of security (everybody sees everything) and of safe sharing (two people saving at the same time), and you see why serious applications need a database.

### Databases and the DBMS

A **database** is an organised collection of related data. A **database management system (DBMS)** is the software that stores and protects it and answers questions about it: PostgreSQL, MySQL, Oracle, SQL Server and **SQLite** (the small DBMS inside phones and browsers, and the one we use in this course) are all DBMSs. Instead of reading files, programs ask the DBMS in a language, usually **SQL** (*structured query language*), and the DBMS does the work. A DBMS provides:

- **Storage and retrieval** of large amounts of data, quickly (with indexes);
- **Querying**: ask a question once in SQL, get exactly the matching rows;
- **Integrity**: rules (constraints) that keep the data correct: a score must be between 0 and 100, an e-mail must be unique, a course must have a real teacher;
- **Security**: users get only the permissions they need;
- **Concurrency**: many users read and write at the same time without damaging each other's work (transactions, Lesson 4);
- **Backup and recovery** after a crash.

Most databases today are **relational**: data lives in **tables** of rows and columns that are linked by keys (Lessons 2 to 4). Other kinds, collectively called **NoSQL**, store documents (MongoDB), key-value pairs (Redis) or graphs; they suit special needs, but a relational database is the right default for structured data such as students and marks.

### Designing a database

Good databases are designed, not typed. The usual steps are: **(1) Requirements**: talk to the users and write down what data they keep and what questions they ask. **(2) Conceptual design**: draw an **ER diagram** of the things and the links between them, with no thought of technology. **(3) Logical design**: turn the diagram into tables, keys and constraints (Lesson 2). **(4) Physical design**: choose types and indexes for speed. **(5) Implementation and testing**: create the database, load sample data and check that the questions can be answered (Lessons 3 and 4). A mistake found at step 2 costs a minute with a pencil; the same mistake found after the application is in use costs weeks.

### Entity-relationship modelling

An **entity** is a kind of thing that you want to store facts about (Student, Course, Teacher). An **attribute** is a fact about it (name, e-mail, grade level). One attribute, or a small group, is the **key**: it identifies each instance uniquely (`student_id`); a made-up identifier is better than a name, because names repeat and change. A **relationship** is a link between entities (a Teacher *teaches* a Course; a Student *enrols in* a Course). The **cardinality** of a relationship says how many instances can be linked:

- **one-to-one (1:1)**: each instance of A is linked to at most one B and vice versa (a person and their passport);
- **one-to-many (1:N)**: one A is linked to many Bs, but each B has one A (one teacher teaches many courses, each course has one teacher);
- **many-to-many (M:N)**: many As with many Bs (a student takes many courses, a course has many students).

Sometimes the link itself has attributes: the *score* belongs neither to the student nor to the course, but to the *enrolment*. To read a diagram, say each relationship in both directions: "A teacher teaches many courses; a course is taught by exactly one teacher." A well-made ER diagram answers the questions of the users before a single table exists.

To turn the diagram into tables (Lesson 2): every entity becomes a table; a **1:N** relationship becomes a **foreign key** in the table on the "many" side (the course table gets `teacher_id`); an **M:N** relationship becomes a separate **junction table** that holds the keys of both sides and the attributes of the relationship (an `enrolments` table with `student_id`, `course_id` and `score`). A column that would hold a list ("Maths, Physics, ICT") is a warning sign that a relationship is hiding inside an attribute.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Data / information** | Raw facts / facts in a context that makes them useful. |
| **Database / DBMS** | An organised collection of related data / the software that manages it. |
| **SQL** | The language used to create, change and query relational databases. |
| **Redundancy / anomaly** | Storing the same fact many times / an error that the repetition causes when data is changed. |
| **Entity** | A kind of thing that the database stores facts about. |
| **Attribute** | A fact about an entity. |
| **Key** | An attribute (or group) that identifies each instance of an entity uniquely. |
| **Relationship** | A link between entities, such as a teacher teaches a course. |
| **Cardinality** | How many instances can be linked: 1:1, 1:N or M:N. |
| **Foreign key** | A column that holds the key of a row in another table. |
| **Junction table** | A table that implements an M:N relationship with the keys of both sides. |
| **ER diagram** | A drawing of entities, attributes and relationships. |

## Worked Examples

### Example 1: Why a flat table goes wrong

```sql
-- setup
CREATE TABLE records (student TEXT, course TEXT, teacher TEXT, teacher_email TEXT, score INTEGER);
INSERT INTO records VALUES ('Ayesha', 'Physics', 'Nusrat Jahan', 'nusrat@school.example', 85);
INSERT INTO records VALUES ('Mim', 'Physics', 'Nusrat Jahan', 'nusrat@school.example', 93);
INSERT INTO records VALUES ('Nabil', 'Physics', 'Nusrat Jahan', 'nusrat@school.example', 55);
INSERT INTO records VALUES ('Ayesha', 'Mathematics', 'Rahim Chowdhury', 'rahim@school.example', 92);
INSERT INTO records VALUES ('Tanvir', 'Mathematics', 'Rahim Chowdhury', 'rahim@school.example', 67);
```

```sql
-- query headers
UPDATE records SET teacher_email = 'nusrat.jahan@school.example' WHERE student = 'Ayesha' AND course = 'Physics';
SELECT DISTINCT teacher, teacher_email FROM records ORDER BY teacher;
```

```output
teacher|teacher_email
Nusrat Jahan|nusrat.jahan@school.example
Nusrat Jahan|nusrat@school.example
Rahim Chowdhury|rahim@school.example
```

1. The setup block creates one flat table, `records`, with one row per student and course, and the teacher's name and e-mail repeated in every row. With five rows that is only a small waste, with five thousand it is a real one.
2. Someone changes Nusrat Jahan's e-mail, but updates only one of her three rows (the `UPDATE` has a `WHERE` that matches Ayesha's row only). Nothing in the table stops this.
3. The query for the distinct teachers and e-mails now returns *two different e-mails for the same teacher*. Which one is right? The table cannot say: this is an **update anomaly**.
4. A database design stores each fact **once**: the teacher's e-mail lives in a `teachers` table with one row per teacher, and the courses only refer to the teacher by a number. Then a change is made in exactly one place.

### Example 2: An ER model that checks itself

```python
# An ER model as data: each entity has attributes (the first one is its key); each relationship links two entities
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
print("\nbroken model:")
for problem in check(BROKEN):
    print("  -", problem)
```

```output
library model: consistent
  members(member_id, name, phone)
  books(book_id, title, author, location_id)
  locations(location_id, room)
  loans(member_id, book_id, due_date)

broken model:
  - Reader has no key: its first attribute should be like reader_id
  - 'reads' has the unknown cardinality N:M
  - 'ordered from' mentions the unknown entity Shop
```

1. The model is plain Python data: a dictionary of entities with their attributes (the first attribute is the key) and a list of relationships with a name, the two entities, the cardinality, the attributes of the relationship and the name of the junction table, if it needs one.
2. `check` finds design mistakes automatically: an entity without a key, a relationship that mentions an entity that does not exist, an invalid cardinality. The broken model has all three mistakes, and each one is reported.
3. `to_tables` applies the translation rules. Every entity becomes a table; the 1:N relationship *stored in* puts `location_id` into `books` (the "many" side); the M:N relationship *borrows* becomes the junction table `loans` with both keys and its own attribute `due_date`.
4. Checking a design before building anything is cheap. You will use the same idea in the project, with the entities of the school.

### Example 3: Your first SQL queries

```sql
-- setup
CREATE TABLE teachers (teacher_id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL);
CREATE TABLE courses (course_id INTEGER PRIMARY KEY, title TEXT NOT NULL, credits INTEGER NOT NULL, teacher_id INTEGER NOT NULL);
INSERT INTO teachers VALUES (1, 'Rahim Chowdhury', 'rahim@school.example'), (2, 'Nusrat Jahan', 'nusrat@school.example'), (3, 'Imran Hossain', 'imran@school.example');
INSERT INTO courses VALUES (101, 'Mathematics', 4, 1), (102, 'Physics', 3, 2), (103, 'ICT', 2, 3), (104, 'English', 3, 2);
```

```sql
-- query headers
SELECT * FROM courses;
```

```output
course_id|title|credits|teacher_id
101|Mathematics|4|1
102|Physics|3|2
103|ICT|2|3
104|English|3|2
```

```sql
-- query headers
SELECT title, credits FROM courses WHERE credits >= 3 ORDER BY title;
```

```output
title|credits
English|3
Mathematics|4
Physics|3
```

```sql
-- query
SELECT COUNT(*) FROM courses WHERE teacher_id = 2;
```

```output
2
```

1. The first block is the **setup**: it creates two tables and fills them. A **table** has named **columns** (the attributes) and one **row** for each instance; `teacher_id` in `courses` is the foreign key that links each course to its teacher.
2. `SELECT * FROM courses;` returns every column of every row (`*` means "all columns").
3. The second query chooses two columns (`title`, `credits`), keeps only the rows where `credits >= 3` (`WHERE`) and sorts them by title (`ORDER BY`): Mathematics, Physics and English.
4. The third query counts the courses of teacher 2 (Nusrat Jahan): she teaches two. SQL describes *what* you want, not how to find it; the DBMS chooses the method. Lessons 3 and 4 teach the language in depth.

## Common Mistakes and Misconceptions

- **Thinking a database is a spreadsheet.** A spreadsheet is one table with no rules; a database has many linked tables, constraints, security and safe concurrent access.
- **Using a name as the key.** Names repeat and change; use an identifier such as `student_id`.
- **Storing a list in one column.** "Maths, Physics, ICT" in one cell breaks searching and counting; use a junction table.
- **Confusing the entity with its attributes.** If you want facts *about* something (a teacher's e-mail), it is probably an entity with attributes, not an attribute of something else.
- **Putting the foreign key on the wrong side.** In a 1:N relationship the foreign key goes in the table on the "many" side.
- **Forgetting the attributes of the relationship.** A score belongs to the enrolment, not to the student or the course.
- **Skipping the design.** Starting with tables instead of questions leads to rebuilds; draw the ER diagram first.
- **Believing that NoSQL is always better.** NoSQL databases solve particular problems; structured data with relationships suits a relational database.

## Guided Hands-On Activity

**Spot the anomaly, draw the model.** Work with your teacher.

1. In Example 1 add a new teacher (`'Imran Hossain'`) to the `records` table without any student. What do you have to invent? Explain the insertion anomaly in one sentence.
2. In Example 1 delete all rows of the course `Mathematics`. What did you lose besides the marks?
3. In Example 2 add an entity `Author` and a 1:N relationship from `Author` to `Book`. Run `check` and `to_tables` and predict the new columns of `books` first.
4. In Example 2 change one relationship to the cardinality `1:M` and read the problem that `check` reports.
5. In Example 3 run `SELECT title FROM courses WHERE teacher_id = 2;` and `SELECT name FROM teachers ORDER BY name DESC;` in the SQL lab.
6. On paper, draw an ER diagram for a bus company with buses, drivers and routes. Decide the cardinalities and mark the key of each entity.

## Lesson Project: SIA: Design the Data

### Objective

Design the data of the **Student Information Application** (SIA): list the entities, attributes, keys and relationships of the school, draw the ER diagram, and write a Python model that checks the design and lists the tables that Lesson 2 will create. This starts the **Student Information Application**, the course project.

### Requirements

- **Entities and attributes.** Student (id, name, e-mail, grade level 9 to 12), Teacher (id, name, e-mail) and Course (id, title, credits above 0), each with a key and a type for each attribute, and a note for the keys and the unique e-mail and title.
- **Relationships.** A teacher teaches many courses and a course has exactly one teacher (1:N). A student enrols in many courses and a course has many students (M:N), and each enrolment has a score from 0 to 100 that stays empty until the course is graded; the junction table is called `enrolments`.
- **Business rules.** Write four rules in plain language (for example "emails are unique for students and for teachers").
- **ER diagram.** Draw it on paper or use the diagram of this lesson as your model, with the cardinalities written on the lines.
- **Python model.** Write the data dictionary, the relationships and the business rules as Python data, a function `check` that reports a missing or double key, an unknown entity or cardinality, and an attribute on a relationship that is not M:N, and a function that lists the tables with their columns (the foreign key in `courses`, the junction table with the score).
- Print the data dictionary, the relationships with the way each is implemented, the result of the check, the tables and the rules.

### Instructions

1. List the entities, the attributes and the keys. Decide the type of every attribute.
2. Decide the cardinality of each relationship by saying it in both directions.
3. Write the Python data: the entities (attribute, type, note), the relationships and the rules.
4. Write `check` and test it by breaking the model on purpose (remove a key, misspell an entity).
5. Print the data dictionary and the relationships.
6. Derive the tables: one per entity, a foreign key for the 1:N relationship and a junction table for the M:N relationship.
7. Compare with the expected output and draw the final ER diagram for your dossier.

### Expected Output

```text
Data dictionary
entity   attribute    type                  note
Student  student_id   whole number          key
Student  name         text
Student  email        text                  unique
Student  grade_level  whole number 9 to 12
Teacher  teacher_id   whole number          key
Teacher  name         text
Teacher  email        text                  unique
Course   course_id    whole number          key
Course   title        text                  unique
Course   credits      whole number above 0

Relationships
  Teacher teaches Course: 1:N -> foreign key teacher_id in courses
  Student enrols in Course: M:N -> junction table enrolments

Checks: the model is consistent

Tables to create in Lesson 2
  students(student_id, name, email, grade_level)
  teachers(teacher_id, name, email)
  courses(course_id, title, credits, teacher_id)
  enrolments(student_id, course_id, score)

Business rules
  1. a student may enrol in many courses, and a course has many students
  2. every course is taught by exactly one teacher
  3. an enrolment has a score from 0 to 100, which stays empty until the course is graded
  4. emails are unique for students and for teachers
```

### Hints

1. **Hint 1 (the key).** Use `student_id`, `teacher_id` and `course_id` as keys: made-up numbers never change.
2. **Hint 2 (the cardinality).** "One teacher, many courses; each course has one teacher" is 1:N with the key of the teacher going into the course table.
3. **Hint 3 (the junction).** A many-to-many relationship needs its own table with the two keys and the attribute `score`.
4. **Hint 4 (the check).** Count the attributes marked `key` for each entity: there must be exactly one.
5. **Hint 5 (the order).** Print the dictionary entity by entity with `f"{entity:<8} {name:<12} {kind:<21} {note}"`.
6. **Hint 6 (the empty score).** A score that is not known yet is stored as `NULL` (empty), not as 0; write that in the type note.

### Success Criteria

- [ ] The data dictionary lists all three entities with their attributes, types and notes.
- [ ] The relationship list shows the 1:N relationship with a foreign key and the M:N relationship with a junction table.
- [ ] The check reports that the model is consistent, and reports a problem when you break the model.
- [ ] The tables are `students`, `teachers`, `courses` (with `teacher_id`) and `enrolments` (with both keys and the score).
- [ ] The ER diagram shows the entities, the relationships and the cardinalities.
- [ ] Four business rules are written in plain language.

### Extension Challenge

Add a fourth entity, `Department`, with a 1:N relationship to `Teacher` (each teacher belongs to one department), update the model and check that the tables change as expected. Then extend `check` so that it also reports an M:N relationship without a junction table name. Finally, think about attendance: a student attends a lesson on a date. Decide whether `Lesson` is a new entity, what its attributes are, and how the model changes.

## Lesson Recap

- A flat file repeats facts; changing some copies but not others creates **inconsistency**, and facts cannot be added or deleted independently (**anomalies**).
- A **DBMS** stores data and gives querying with SQL, **integrity**, security, concurrency and recovery; most databases are **relational**.
- Design goes **requirements, ER diagram, tables, physical design, implementation and testing**.
- An **ER diagram** has **entities**, **attributes**, **keys** and **relationships** with **cardinality** (1:1, 1:N, M:N); a 1:N relationship becomes a **foreign key** and an M:N relationship becomes a **junction table**.

## Homework / Extension Mission

Choose a small organisation that you know (a library, a pharmacy, a football club, a mobile-phone shop) and design its data: list at least three entities with their attributes and keys, decide the cardinality of every relationship, and draw the ER diagram. Then write the tables that the diagram will become, with the foreign keys. Finally, write two questions that the organisation could ask of its data (for example "which members have an overdue book?") and note which tables each question needs.

## Course Project Connection

This lesson starts the **Student Information Application**, the course project: before any table exists, the design of the data is drawn and checked. In Lesson 2 the ER diagram becomes a normalised relational schema with keys and constraints, in Lessons 3 and 4 you create the database, load it and query it, and in Lessons 5 and 6 you build the web page that shows it. The ER diagram you draw now is the map of the whole application.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: show a messy spreadsheet and let students find the problems before naming them; 15 minutes: DBMS services and the design steps; 15 minutes: ER modelling (draw the school on the board with the class deciding the cardinalities); 20 minutes: the project.

**Live demonstrations.** Update one row of the flat table and show the two e-mails. Draw the SIA diagram step by step and ask "can a course have two teachers?" to expose the 1:N decision. Run Example 3 in the SQL lab.

**Misconceptions.** "A database is a big spreadsheet." "Names make good keys." "A list in one cell is fine." "NoSQL replaces SQL."

**Assessment of the project.** Check the dictionary (one key per entity), the cardinalities and the junction table, the output of the checker and the ER diagram. Ask students why the score is not an attribute of Student or Course.

**Reference solution `sia_model.py`** (run with `python3 sia_model.py`):

```python
"""SIA: Design the Data - the ER model of the Student Information Application, checked and turned into tables."""

ENTITIES = {
    "Student": [("student_id", "whole number", "key"), ("name", "text", ""), ("email", "text", "unique"), ("grade_level", "whole number 9 to 12", "")],
    "Teacher": [("teacher_id", "whole number", "key"), ("name", "text", ""), ("email", "text", "unique")],
    "Course": [("course_id", "whole number", "key"), ("title", "text", "unique"), ("credits", "whole number above 0", "")],
}
RELATIONSHIPS = [
    # name, entity A, cardinality, entity B, attributes of the relationship (name, type), junction table name
    ("teaches", "Teacher", "1:N", "Course", [], None),
    ("enrols in", "Student", "M:N", "Course", [("score", "0 to 100, NULL until graded")], "enrolments"),
]
RULES = [
    "a student may enrol in many courses, and a course has many students",
    "every course is taught by exactly one teacher",
    "an enrolment has a score from 0 to 100, which stays empty until the course is graded",
    "emails are unique for students and for teachers",
]


def check(entities, relationships):
    problems = []
    for entity, attributes in entities.items():
        keys = [name for name, _, note in attributes if note == "key"]
        if len(keys) != 1:
            problems.append(f"{entity} needs exactly one key, it has {len(keys)}")
    for name, a, cardinality, b, extra, junction in relationships:
        if a not in entities or b not in entities:
            problems.append(f"'{name}' mentions an unknown entity")
        if cardinality not in ("1:1", "1:N", "M:N"):
            problems.append(f"'{name}' has an unknown cardinality")
        if extra and cardinality != "M:N":
            problems.append(f"'{name}': attributes of a relationship need a junction table, so it should be M:N")
    return problems


def key_of(entity):
    return next(name for name, _, note in ENTITIES[entity] if note == "key")


print("Data dictionary")
print("entity   attribute    type                  note")
for entity, attributes in ENTITIES.items():
    for name, kind, note in attributes:
        print(f"{entity:<8} {name:<12} {kind:<21} {note}".rstrip())

print("\nRelationships")
for name, a, cardinality, b, extra, junction in RELATIONSHIPS:
    how = f"junction table {junction}" if cardinality == "M:N" else f"foreign key {key_of(a)} in {b.lower()}s"
    print(f"  {a} {name} {b}: {cardinality} -> {how}")

print("\nChecks:", check(ENTITIES, RELATIONSHIPS) or "the model is consistent")

tables = {entity.lower() + "s": [name for name, _, _ in attributes] for entity, attributes in ENTITIES.items()}
for name, a, cardinality, b, extra, junction in RELATIONSHIPS:
    if cardinality == "M:N":
        tables[junction] = [key_of(a), key_of(b)] + [attribute for attribute, _ in extra]
    else:
        tables[b.lower() + "s"].append(key_of(a))
print("\nTables to create in Lesson 2")
for table, columns in tables.items():
    print(f"  {table}({', '.join(columns)})")
print("\nBusiness rules")
for number, rule in enumerate(RULES, start=1):
    print(f"  {number}. {rule}")
```

```output
Data dictionary
entity   attribute    type                  note
Student  student_id   whole number          key
Student  name         text
Student  email        text                  unique
Student  grade_level  whole number 9 to 12
Teacher  teacher_id   whole number          key
Teacher  name         text
Teacher  email        text                  unique
Course   course_id    whole number          key
Course   title        text                  unique
Course   credits      whole number above 0

Relationships
  Teacher teaches Course: 1:N -> foreign key teacher_id in courses
  Student enrols in Course: M:N -> junction table enrolments

Checks: the model is consistent

Tables to create in Lesson 2
  students(student_id, name, email, grade_level)
  teachers(teacher_id, name, email)
  courses(course_id, title, credits, teacher_id)
  enrolments(student_id, course_id, score)

Business rules
  1. a student may enrol in many courses, and a course has many students
  2. every course is taught by exactly one teacher
  3. an enrolment has a score from 0 to 100, which stays empty until the course is graded
  4. emails are unique for students and for teachers
```

**Differentiation.** Support: give the entity and attribute lists and a half-filled ER diagram so that students decide the cardinalities and write the dictionary. Stretch: the department entity, the junction-name check and the attendance model.

**Discussion questions (not for the student quiz).** Why is it better that every fact is stored once? What would the ER diagram look like if a course could have several teachers? What are the risks of changing a database design after the application is in use?
