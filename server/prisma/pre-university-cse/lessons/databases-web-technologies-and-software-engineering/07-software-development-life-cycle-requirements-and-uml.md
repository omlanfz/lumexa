# Lumexa Mission Log: Databases, Web Technologies & Software Engineering

**Course/Path:** Databases, Web Technologies & Software Engineering
**Lesson:** 07 of 08
**Title:** Software Development Life Cycle, Requirements and UML
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** UML · user stories · Python

---

## Mission Brief

You have built a database, a page and a little logic. But a real application is not built by *typing code*; it is built by a team that first agrees **what** to build, then **how** it will be structured, then builds and tests it in steps. Many software projects fail not because the programmers cannot code, but because nobody wrote down what the users really needed, or because the plan could not cope with a change of mind.

This lesson is about the **engineering around the code**. You learn the phases of the **software development life cycle (SDLC)** and the main ways of organising them (waterfall and agile), how to write **requirements** as **user stories** with acceptance criteria and priorities, and how to draw the design with **UML** diagrams: use cases, classes and sequences. You will write the requirements and the design of the Student Information Application and check your backlog with a small Python program.

## Learning Objectives

1. Describe the phases of the SDLC and compare the waterfall, iterative and agile approaches, including Scrum.
2. Distinguish functional from non-functional requirements and write clear, testable requirements.
3. Write user stories with acceptance criteria and prioritise them with MoSCoW.
4. Read and draw UML use case, class and sequence diagrams.
5. Describe a layered architecture and map classes and requirements to the code and the database.
6. Produce the requirements and the design of the SIA, and check and plan the backlog with a Python program.

## Prerequisites

- Lessons 1 to 6: the database, the page and the JavaScript logic of the SIA (this lesson documents and plans them).
- Object-oriented programming (classes, attributes, methods and relationships) from the programming course.
- Basic Python: lists, dictionaries, loops and regular expressions as used in the earlier examples.

## Concept Explanation

### The software development life cycle

Software is made in phases, whatever the method. **Planning and requirements** decide what the software must do and why; **analysis and design** decide how it will be built (structure, data, interfaces); **implementation** writes the code; **testing** checks that it works and meets the requirements; **deployment** puts it into use; and **maintenance** fixes faults and adds features, which is where most of the total cost lies. The **cost of change** grows steeply with time: a misunderstanding found in the requirements costs a conversation, the same misunderstanding found after release costs a rebuild and angry users.

Methods differ in how they arrange the phases. In the **waterfall** model each phase is completed before the next begins, with documents handed from one to the next. It is clear and suits projects whose requirements are fixed and well understood (a bridge, a safety system), but it is painful when requirements change, because the working software appears only at the end. **Iterative and incremental** development repeats the cycle in small pieces, each delivering a usable increment. **Agile** methods, written down in the Agile Manifesto (2001), push this to the extreme: working software over documentation, collaboration with the customer, responding to change. **Scrum** is the most common agile framework: a **product owner** keeps the **product backlog** (the ordered list of wanted features), the team works in fixed time boxes of one to four weeks called **sprints**, each starting with **sprint planning** (choose what fits), with a **daily stand-up** (what I did, what I will do, what blocks me), and ending with a **sprint review** (show the working increment to the users) and a **retrospective** (how can we work better?). **Kanban** instead visualises work on a board and limits how much is in progress. **DevOps** adds automatic building, testing and deployment (continuous integration and delivery), so that small changes reach users safely and often.

### Requirements

A **requirement** says what the software must do or be. **Functional requirements** describe behaviour ("the user can add a student"). **Non-functional requirements** describe qualities: **performance** (the list shows 1,000 students in under two seconds), **security** (passwords are stored hashed), **usability and accessibility** (usable with a keyboard and a screen reader), **reliability** (no data is lost if the power fails) and **portability** (works on phones). A good requirement is **clear** (one reading only), **testable** (you can decide whether it is met), **necessary** and **prioritised**. "The system should be fast" is a wish; "a search returns within one second for 10,000 students" is a requirement. Requirements come from **stakeholders** (users, teachers, administrators, the owner) by interviews, questionnaires, observing the real work and studying existing documents. **Scope creep**, the slow growth of the requirements without a decision to pay for it, is a common reason for failure, and the cure is a visible, prioritised backlog.

Agile teams write requirements as **user stories**: *"As a **role**, I want **goal**, so that **benefit**."* The role says who needs it, the goal what, and the benefit why (if you cannot state the benefit, perhaps you do not need the feature). Each story gets **acceptance criteria**, concrete checks that tell when it is done, often written as *given, when, then*: "Given a student with e-mail a@x, when an administrator adds another student with a@x, then the page shows an error and the table does not change." Stories are **prioritised** with **MoSCoW**: **M**ust have (without it the product is useless), **S**hould have (important but not vital), **C**ould have (nice if time allows) and **W**on't have (this time). The team **estimates** each story in **story points**, a relative size, and a sprint is planned by taking the highest-priority stories that fit its capacity.

### UML: drawing the design

The **Unified Modelling Language (UML)** is a standard set of diagrams for the design of software. Three are enough for a first project.

- A **use case diagram** shows who uses the system and what they can do. **Actors** (teacher, administrator, student) stand outside a box that represents the system; **use cases** are ovals inside it ("Add student"); a line joins an actor to the use cases they take part in.
- A **class diagram** shows the classes of the program: each box has the name, the **attributes** and the **methods**; the lines are **associations** with **multiplicities** (`1`, `0..*`, `1..*`), and a hollow triangle means inheritance. Classes in the program often match the entities of the ER diagram: a `Student` class corresponds to the `students` table.
- A **sequence diagram** shows how objects talk **over time**: lifelines run downwards and arrows are messages (a call, a return), which is ideal for one scenario such as "add a student".

Diagrams are tools for thinking and communicating, not decoration: draw them on paper or a whiteboard first, and keep them as simple as they can be while still answering the question of the reader.

### Architecture and design principles

Most web applications have **layers**: a **presentation layer** (the HTML, CSS and JavaScript that the user sees), an **application layer** (the logic and the API that decide and validate) and a **data layer** (the database). Each layer talks only to its neighbour, so that one can be changed without breaking the others (a new web design does not touch the database). Good design follows a few principles: **separation of concerns** (each part has one job: the pure functions of Lesson 6 are logic, the DOM code is display), **single responsibility** (one class or function does one thing), **DRY** (do not repeat yourself: one source for each fact, like the one home of each fact in a database) and **keep it simple**. Finally, write down the **decisions**: a short README and a list of design decisions tell the next developer (often you, months later) why the code looks as it does.

## Key Vocabulary

| Term | Definition |
|---|---|
| **SDLC** | The software development life cycle: requirements, design, implementation, testing, deployment and maintenance. |
| **Waterfall / agile** | A method with sequential phases / a method of short iterations, working software and frequent change. |
| **Scrum / sprint** | An agile framework / its fixed time box of one to four weeks. |
| **Product backlog** | The ordered list of everything that the product may need. |
| **Functional / non-functional requirement** | What the system must do / how well it must do it (speed, security, usability). |
| **User story** | A requirement in the form "As a role, I want goal, so that benefit." |
| **Acceptance criteria** | Concrete checks that decide when a story is done. |
| **MoSCoW** | Must, Should, Could, Won't: a way to prioritise requirements. |
| **UML** | The standard modelling language with use case, class and sequence diagrams. |
| **Actor / use case** | Someone or something that uses the system / something the system does for an actor. |
| **Multiplicity** | How many objects can be linked in a UML association: 1, 0..*, 1..*. |
| **Layered architecture** | A design with presentation, application and data layers. |

## Worked Examples

### Example 1: A backlog that checks itself

```python
import re

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
PATTERN = re.compile(r"^As an? (?P<role>.+?), I want (?P<goal>.+?), so that (?P<benefit>.+)\.$")
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
print(f"\nsprint 1 (capacity {CAPACITY} points): {', '.join(chosen)} = {used} points")
print("left for later:", ", ".join(s[0] for s in valid if s[0] not in chosen))
```

```output
backlog
  US1 M  3 points  teacher: to see all students in a table
  US2 M  5 points  teacher: to filter the students by name and grade
  US3 M  5 points  administrator: to add a new student
  US4 S  3 points  teacher: to record a score
  US5 S  8 points  student: to see my own report card
  US6 C  5 points  administrator: to export the list as a file
  US7 W NOT A USER STORY: it needs a role, a goal and a benefit

sprint 1 (capacity 16 points): US1, US2, US3, US4 = 16 points
left for later: US5, US6
```

1. Each story is data: an id, the text, a MoSCoW priority and a size in story points. A **regular expression** checks the form "As a *role*, I want *goal*, so that *benefit*." and picks out its three parts.
2. The stories are sorted by priority: the three Musts first, then the Shoulds, the Could and the Won't. `US7`, "I want a dark mode.", has no role and no benefit, so it is rejected: the check enforces the discipline that a story says *who* needs it and *why*.
3. **Sprint planning** takes the stories in priority order while they fit the capacity of 16 points: US1 + US2 + US3 + US4 = 3 + 5 + 5 + 3 = 16. The report card (8 points) and the export (5 points) wait for a later sprint.
4. The plan is only as good as the estimates, but the habit is valuable: the team knows what is in, what is out and why.

### Example 2: From class diagram to code

```python
from dataclasses import dataclass, field


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
print("Mathematics is taught by", maths.teacher.name, "and has", len(maths.enrolments), "students")
```

```output
Ayesha's average: 88.5
Tanvir's average: 67.0
Sadia's average: None
seats left in Mathematics: 0
refused: Mathematics is full
refused: Ayesha Rahman is already in Mathematics
Mathematics is taught by Rahim Chowdhury and has 2 students
```

1. The four classes are the boxes of a **class diagram**: each has attributes (the fields) and methods (`seats_left`, `enrol`, `average`). The lines of the diagram are the **associations**: a `Course` knows its `Teacher` (many courses, one teacher), and an `Enrolment` links one `Student` with one `Course` and carries the `score`, just like the junction table of the database.
2. The rules of the requirements live in the methods. `enrol` refuses a duplicate enrolment and a full course, the two rules of the safe enrolment of Lesson 4, now in code; `average` ignores scores that are still `None`, like `AVG` ignoring NULL.
3. Ayesha has the average of 92 and 85, 88.5; Tanvir has 67; Sadia has no scores, so her average is `None`, not 0. Mathematics has a capacity of 2 and two students, so no seat is left.
4. The two refused enrolments show the two business rules at work: Sadia is refused because Mathematics is full, and Ayesha because she is in the course already. The design (diagram), the data (tables) and the code (classes) all describe the same model.

## Common Mistakes and Misconceptions

- **Jumping into code without requirements.** The cost of finding out what the users need grows with every line written.
- **Writing vague requirements.** "Fast" and "user-friendly" cannot be tested; give a number or a check.
- **User stories without a benefit.** If you cannot say why, ask whether the feature is needed.
- **Treating everything as a Must.** If everything is a Must, nothing is prioritised.
- **Believing that agile means "no planning" or "no documentation".** Agile plans in short cycles and documents what is needed, not everything.
- **Using UML as decoration.** A diagram that nobody reads or updates is wasted; draw to think and to communicate.
- **Confusing a class diagram with an ER diagram.** A class diagram has methods and models objects in a program; an ER diagram models stored data. They overlap but have different jobs.
- **Mixing the layers.** Putting SQL inside the HTML or the display code inside the validation makes every change risky.

## Guided Hands-On Activity

**Plan like a team.** Work with your teacher.

1. In Example 1 rewrite `US7` as a valid user story with a role, a goal and a benefit, and run the program again.
2. In Example 1 change the capacity to 10 and predict the sprint before you run it.
3. In Example 1 add a story "As a teacher, I want to print a class list, so that I can use it in class without a computer." with the priority S and 3 points. Where does it appear in the sprint?
4. In Example 2 add the method `Course.average()` that returns the average of all scores in the course, and print it for Mathematics.
5. Write three acceptance criteria in the form *given, when, then* for the story "As an administrator, I want to add a new student".
6. On paper, draw a use case diagram for a school library with the actors member, librarian and administrator and at least five use cases.

## Lesson Project: SIA: Requirements and Design

### Objective

Write the **requirements and the design** of the Student Information Application: a prioritised backlog of user stories with acceptance criteria, a use case diagram, a class diagram, a sequence diagram for "add a student" and a layered architecture, and a Python program that **checks the backlog** and plans the sprints. This is the specification of the **Student Information Application**.

### Requirements

- **Backlog.** Nine user stories in the form "As a role, I want goal, so that benefit.", each with a MoSCoW priority, a size in story points, acceptance criteria and the place of the design where it lives: US1 see all students in a table (M, 3), US2 filter by name and grade (M, 5), US3 add a student with validation (M, 5), US4 record a score from 0 to 100 (M, 3), US5 a student's report card (S, 8), US6 a summary of each course (S, 5), US7 enrol without exceeding the seats (S, 5), US8 export the list as a file (C, 5) and US9 a dark mode (W, 2).
- **The checker.** A Python program that validates each story against the pattern, requires acceptance criteria for every Must and Should story, requires a design element for every story, and prints the backlog sorted by priority and the problems it found.
- **The plan.** With a capacity of 13 points per sprint, plan the sprints in priority order (a story that does not fit starts the next sprint), skip the Won't stories and report in which sprint all Must stories are finished.
- **Diagrams.** A use case diagram (actors teacher, administrator, student and head teacher and their use cases), a class diagram (`Student`, `Course`, `Teacher`, `Enrolment` with attributes, methods and multiplicities), a sequence diagram for "add a student" (page, logic, API, database) and a three-layer architecture diagram.
- **Non-functional requirements.** Write at least four, each testable (performance, security, accessibility, reliability).
- In your portfolio, include the backlog, the four diagrams and a README paragraph that explains the architecture and one design decision.

### Instructions

1. Write the nine stories and decide the acceptance criteria and the design element of each.
2. Store them as Python data and write the pattern check.
3. Print the backlog sorted by priority and the problems.
4. Write the sprint planner with the capacity of 13 points.
5. Print the plan and the sprint in which all Musts are done.
6. Draw the four diagrams, reusing the classes and the tables of the earlier lessons.
7. Write the non-functional requirements and the README paragraph; compare the program output with the expected output.

### Expected Output

```text
Backlog by priority
  US1 Must    3 points  teacher: to see all students in a table
  US2 Must    5 points  teacher: to filter the students by name and grade
  US3 Must    5 points  administrator: to add a new student
  US4 Must    3 points  teacher: to record a score
  US5 Should  8 points  student: to see my own report card
  US6 Should  5 points  head teacher: a summary of each course
  US7 Should  5 points  administrator: to enrol a student without exceeding the seats
  US8 Could   5 points  administrator: to export the list as a file
  US9 Won't   2 points  visitor: a dark mode
Problems found: none

Plan with a capacity of 13 points per sprint
  sprint 1: US1, US2, US3 = 13 points
  sprint 2: US4, US5 = 11 points
  sprint 3: US6, US7 = 10 points
  sprint 4: US8 = 5 points
all Must stories are finished after sprint 2
not planned: US9
```

### Hints

1. **Hint 1 (the pattern).** `^As an? (?P<role>.+?), I want (?P<goal>.+?), so that (?P<benefit>.+)\.$` accepts "a" and "an".
2. **Hint 2 (the check).** `if priority in "MS" and not criteria:` finds Must and Should stories without acceptance criteria.
3. **Hint 3 (the sort).** Sort by `ORDER[priority]` with `ORDER = {"M": 0, "S": 1, "C": 2, "W": 3}`.
4. **Hint 4 (the sprints).** When `used + points > CAPACITY`, close the current sprint and start a new one with this story.
5. **Hint 5 (the Musts).** Remember in which sprint each story landed in a dictionary and take the maximum over the Must stories.
6. **Hint 6 (the diagrams).** Draw the class diagram from the tables of Lesson 2 and the sequence from the code of Lesson 6.

### Success Criteria

- [ ] All nine stories pass the check, and the checker reports "Problems found: none".
- [ ] The backlog is printed by priority: four Musts, three Shoulds, a Could and a Won't.
- [ ] The plan has four sprints, with all Musts finished after sprint 2 and US9 not planned.
- [ ] The four diagrams show the same classes, tables and messages.
- [ ] At least four non-functional requirements are testable.
- [ ] The portfolio has the backlog, the diagrams and the README paragraph.

### Extension Challenge

Add a **definition of done** (code reviewed, tests pass, no console errors, accessible) and extend the checker to refuse a story that has more than 8 points (too big: split it). Then add a function that computes the **velocity** (points finished per sprint) from a list of past sprints and uses it as the capacity. Finally, draw an **activity diagram** for the enrolment process, with the decisions "course full?" and "already enrolled?".

## Lesson Recap

- The **SDLC** runs from requirements and design through implementation and testing to deployment and maintenance; **waterfall** does the phases in order, **agile** and **Scrum** deliver small increments in **sprints**.
- **Requirements** are functional or non-functional, clear and testable; **user stories** state role, goal and benefit, with **acceptance criteria** and a **MoSCoW** priority.
- **UML** gives use case, class and sequence diagrams; classes and tables model the same entities.
- A **layered architecture** (presentation, application, data) and the principles of **separation of concerns**, **single responsibility** and **DRY** keep a design changeable; document the decisions.

## Homework / Extension Mission

Pick a small system that you use (a canteen ordering app, a library, a bus-ticket machine). Write six user stories with priorities and acceptance criteria, two non-functional requirements, and draw a use case diagram and a class diagram. Then explain in a paragraph why you chose your Must stories, and what you would do if the head of the school asked for a seventh Must story in the middle of the project.

## Course Project Connection

This lesson **specifies** the **Student Information Application**, the course project, after the fact and for the future: the requirements of what you built in Lessons 1 to 6, the diagrams that describe it and a plan for what comes next. In Lesson 8 you test the application against these requirements, review its code, put it under version control and ship it with its database script and a README.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: a famous failed project and the cost of late changes; 10 minutes: waterfall against agile, with the Scrum loop on the board; 15 minutes: user stories and MoSCoW (students write three stories for the school canteen); 10 minutes: the three UML diagrams; 15 minutes: the project.

**Live demonstrations.** Take a vague requirement ("the page must be fast") and make it testable with the class. Run the backlog checker with a broken story. Draw the sequence diagram of "add a student" on the board and compare it with the JavaScript code of Lesson 6.

**Misconceptions.** "Agile means no documentation." "A requirement is a wish." "Everything is a Must." "UML must be drawn with special software."

**Assessment of the project.** Check the backlog (format, criteria, priorities), the output of the checker, the sprint plan and the four diagrams for consistency with each other (the same classes and messages everywhere). Ask students to justify one Won't decision.

**Reference solution `backlog_check.py`** (run with `python3 backlog_check.py`):

```python
"""SIA: Requirements and Design - the backlog of the Student Information Application, checked and planned."""
import re

PATTERN = re.compile(r"^As an? (?P<role>.+?), I want (?P<goal>.+?), so that (?P<benefit>.+)\.$")
ORDER = {"M": 0, "S": 1, "C": 2, "W": 3}
NAMES = {"M": "Must", "S": "Should", "C": "Could", "W": "Won't"}

STORIES = [
    # id, the story, priority, points, acceptance criteria, where it lives in the design
    ("US1", "As a teacher, I want to see all students in a table, so that I can find a student quickly.", "M", 3,
     ["all eight students are listed with name, grade and e-mail"], "page: render(); database: students"),
    ("US2", "As a teacher, I want to filter the students by name and grade, so that I can find a group.", "M", 5,
     ["typing ta shows two students", "choosing grade 10 shows three students"], "page: filterStudents()"),
    ("US3", "As an administrator, I want to add a new student, so that new arrivals are recorded.", "M", 5,
     ["a valid student appears in the table", "an invalid student shows messages and is not added"], "page: validateStudent(); database: INSERT"),
    ("US4", "As a teacher, I want to record a score, so that results are kept.", "M", 3,
     ["a score from 0 to 100 is stored", "a score of 150 is refused"], "database: enrolments.score CHECK"),
    ("US5", "As a student, I want to see my own report card, so that I know how I am doing.", "S", 8,
     ["it lists my courses and my average"], "database: join and AVG"),
    ("US6", "As a head teacher, I want a summary of each course, so that I can compare the courses.", "S", 5,
     ["it shows students, average and highest score per course"], "database: GROUP BY"),
    ("US7", "As an administrator, I want to enrol a student without exceeding the seats, so that no course is overfull.", "S", 5,
     ["the sixth student is accepted", "the seventh is refused"], "database: conditional INSERT"),
    ("US8", "As an administrator, I want to export the list as a file, so that I can share it.", "C", 5, [], "page: a download link"),
    ("US9", "As a visitor, I want a dark mode, so that the page is comfortable at night.", "W", 2, [], "page: CSS variables"),
]

print("Backlog by priority")
valid, problems = [], []
for story_id, text, priority, points, criteria, where in sorted(STORIES, key=lambda s: ORDER[s[2]]):
    match = PATTERN.match(text)
    if not match:
        problems.append(f"{story_id} is not a user story")
        continue
    if priority in "MS" and not criteria:
        problems.append(f"{story_id} is a {NAMES[priority]} story and needs acceptance criteria")
    if not where:
        problems.append(f"{story_id} is not traced to a design element")
    valid.append((story_id, priority, points))
    print(f"  {story_id} {NAMES[priority]:<6} {points:>2} points  {match['role']}: {match['goal']}")
print("Problems found:", "; ".join(problems) or "none")

CAPACITY = 13
sprint, sprints, used = [], [], 0
for story_id, priority, points in valid:
    if priority == "W":
        continue
    if used + points > CAPACITY:
        sprints.append((sprint, used))
        sprint, used = [], 0
    sprint.append(story_id)
    used += points
sprints.append((sprint, used))
print(f"\nPlan with a capacity of {CAPACITY} points per sprint")
for number, (ids, total) in enumerate(sprints, start=1):
    print(f"  sprint {number}: {', '.join(ids)} = {total} points")
musts = [s for s in valid if s[1] == "M"]
done_in = {sid: n for n, (ids, _) in enumerate(sprints, start=1) for sid in ids}
print("all Must stories are finished after sprint", max(done_in[s[0]] for s in musts))
print("not planned:", ", ".join(s[0] for s in valid if s[1] == "W"))
```

```output
Backlog by priority
  US1 Must    3 points  teacher: to see all students in a table
  US2 Must    5 points  teacher: to filter the students by name and grade
  US3 Must    5 points  administrator: to add a new student
  US4 Must    3 points  teacher: to record a score
  US5 Should  8 points  student: to see my own report card
  US6 Should  5 points  head teacher: a summary of each course
  US7 Should  5 points  administrator: to enrol a student without exceeding the seats
  US8 Could   5 points  administrator: to export the list as a file
  US9 Won't   2 points  visitor: a dark mode
Problems found: none

Plan with a capacity of 13 points per sprint
  sprint 1: US1, US2, US3 = 13 points
  sprint 2: US4, US5 = 11 points
  sprint 3: US6, US7 = 10 points
  sprint 4: US8 = 5 points
all Must stories are finished after sprint 2
not planned: US9
```

**Differentiation.** Support: provide the story data with the criteria missing for two stories so that students find and fix them with the checker. Stretch: the definition of done, the velocity function and the activity diagram.

**Discussion questions (not for the student quiz).** Why is the benefit part of a user story the most important part? What is lost when a team skips the retrospective? When would you actually prefer waterfall to agile?
