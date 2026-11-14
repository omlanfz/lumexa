# Lumexa Mission Log: Python, Artificial Intelligence & Modern Computing

**Course/Path:** Python, Artificial Intelligence & Modern Computing
**Lesson:** 08 of 08
**Title:** Responsible Computing, Research, CSE Specialisations and Capstone Planning
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Python

---

## Mission Brief

You have now met the whole foundation of a computer science degree: programming in several languages, the mathematics of logic and counting, how a computer is built, how an operating system and a network work, how data are stored and served, how algorithms are analysed, and a first look at artificial intelligence and modern computing. This last lesson is about what comes **around** the code: the **responsibilities** of people who build software, the **research habits** that keep your claims honest, the **directions** that a computer science and engineering degree can take, and the skill of **planning a larger project** so that you finish it.

You learn the principles of responsible computing (privacy, fairness, accessibility, sustainability, licences and integrity), how to find, judge and cite sources and how to run a reproducible experiment, what the main specialisations are and which of your fundamentals each one uses, and how to plan a capstone with a scope, tasks, dependencies, a critical path and a buffer. Then you **finish the course project**: a test suite for its components, a short report with honest limitations, a plan for what to build next, and a **study roadmap** for your first year at university.

## Learning Objectives

1. Apply professional and ethical principles (avoid harm, be honest, be fair, respect privacy, give credit) to concrete computing situations, and use a checklist to find concerns before a product is released.
2. Explain privacy, fairness, accessibility, sustainability, copyright and licences, and academic integrity, and say what a developer can do about each.
3. Use basic research skills: ask a question, evaluate sources, read a paper, cite, and run a reproducible experiment that reports several runs and their spread.
4. Describe the main CSE specialisations and relate each of them to the fundamentals of this programme.
5. Plan a capstone with a problem statement, a MoSCoW scope, tasks with dependencies, a critical path, a buffer, risks and evaluation criteria.
6. Finish the course project with automated tests, a report that states its limitations, a plan and a first-year study roadmap.

## Prerequisites

- The earlier lessons of this course, especially the tested algorithm library, the honest evaluation of the classifier and the sensor pipeline.
- The idea of a directed graph and of MoSCoW priorities from the earlier courses.
- Nothing new is installed: the program uses only the Python standard library.

## Concept Explanation

### Responsible computing

Software decides who gets a loan, which news you see, and whether a machine gives a safe dose of radiation. A computer scientist is therefore also a professional with **responsibilities**, and professions write them down. The **ACM Code of Ethics**, for example, asks computing professionals to contribute to society and human well-being, to avoid harm, to be honest and trustworthy, to be fair and not to discriminate, to respect the work of others and give credit, to respect privacy and to honour confidentiality. These principles are practical. In the 1980s the **Therac-25** radiation therapy machine gave several patients massive overdoses, some of them fatal, partly because of a software fault (a race condition) and partly because hardware safety interlocks had been removed. The lesson is that safety-critical software needs independent checks, careful testing and humility.

Six areas matter in everyday work. **Privacy**: collect only the data that you need (**data minimisation**), ask for **consent**, protect the data, let people see and delete it, and remember that removing the names from a data set does not always make it anonymous. **Fairness**: models and rules can treat groups differently (Lesson 5), so test on each group and keep a person able to overturn an automatic decision. **Accessibility**: software must work for people who use a keyboard instead of a mouse, a screen reader, captions or large text; contrast, labels, alternative text and captions are easy to add early and expensive to add late, and the World Health Organization estimates that about one person in six lives with a significant disability. **Sustainability**: data centres and devices use energy and materials, so efficient algorithms, less data and longer device lifetimes help. **Law and licences**: code, images and data have **copyright** and **licences**; open source licences such as MIT, Apache 2.0 and GPL say what you may do and what you must do (give credit, share changes); using work without permission, or presenting somebody else's work as your own, is **plagiarism** and breaks **academic integrity**. **Security**: report a vulnerability **responsibly** to its owner, before you tell the public and never to criminals. One tool turns these duties into engineering: a **design review checklist**, like the one in Example 1, which turns questions into concrete concerns that can be fixed before release.

### Research skills

**Research** means finding something out reliably: ask a **question**, choose a **method**, collect **evidence**, draw **conclusions** and say how sure you are. Computer scientists do it whenever they compare two algorithms or test a model. Good research starts with sources. **Primary sources** (papers that report original work, official documentation, specifications) are closest to the truth; **secondary** ones (textbooks, articles) explain them; videos, forum answers and encyclopaedias are the easiest to read and the easiest to get wrong. To judge a source ask: Who wrote it, and what do they know? When was it written, and is it out of date? What is the evidence? Was it **peer-reviewed**? Does the author gain from the answer? Use several sources, and trust most the ones that agree for different reasons. To **read a paper**, do not start at the top: read the abstract, then the conclusion, look at the figures, and only then the method and the details, asking at each step "what is the claim, and what supports it?". **Cite** every source that you use (author, year, title, where it was published) in one consistent style: citation gives credit, lets readers check you, and protects you from plagiarism.

For computational experiments the key word is **reproducibility**: another person, or you in six months, must be able to get the same result. Record the code and its version, the data, the settings and the **random seeds**. Fix the seed, repeat the experiment on several seeds, and report the **mean and the spread**, not the best run (Example 2). Change one thing at a time, compare with a **baseline**, and write down what did not work. When you ask for help, give a **minimal reproducible example**: the smallest program that shows the problem, the exact error message, and what you expected.

### CSE specialisations

Computer science and engineering is a broad degree, and after the first years students usually choose a direction. Universities differ in the names of their courses and in what they require, and this lesson says nothing about the rules of any university: always read the syllabus and the rules of the one you plan to join. The main directions are: **software engineering** (building and maintaining large systems: requirements, design, testing, teamwork); **systems** (operating systems, compilers, databases, distributed systems, the cloud); **networks and security** (communication, cryptography, defence and the analysis of attacks); **artificial intelligence, machine learning and data science** (learning from data, vision, language); **theory and algorithms** (complexity, computability, cryptography, optimisation); **human-computer interaction, graphics, games and multimedia** (interfaces, rendering, interactive experiences); **embedded systems and robotics** (hardware and software together: microcontrollers, sensors, control); and **computational science and bioinformatics** (computing applied to biology, physics and medicine).

Each direction draws on the fundamentals of this programme in a different mix, as the map of Lesson 7 showed: discrete mathematics and algorithms for theory and AI, operating systems and networks for systems and security, programming and design for software engineering, computer organisation for embedded systems. The best preparation for any of them is the same: strong programming, solid mathematics, clear thinking about data and algorithms, and the habit of testing and documenting your work. Choose by trying: build a small project in two directions and see which problems you cannot stop thinking about.

### Capstone planning

A **capstone** is a larger project that combines many skills, and planning it is itself a skill. Start from a **problem** that matters to someone: who are the users and what do they need? Write the **problem statement** in two sentences. List the features and prioritise them with **MoSCoW** (Lesson 7): the Musts must fit even if everything goes wrong. Break the work into **tasks** of one to three days with **dependencies** (a task can start only when the tasks that it needs are finished) and an **estimate** for each. The dependencies form a directed graph without cycles. The longest chain of dependent tasks is the **critical path**, and it fixes the shortest possible duration (Example 3); a task that is not on it has **slack** and can slip without delaying the project. Add a **buffer** (many plans use 20 to 30 per cent), because tasks always take longer than estimated, and decide in advance which Could tasks to drop if the plan does not fit. List the **risks** (the data may be worse than expected, a library may not work) with a plan B for each. Decide how you will know that it works: the **tests** and the **evaluation criteria**. Keep the work visible with Git, small commits and a short demo every week. Finish with documentation: a **README** and a **report** with the sections introduction, method, results, **limitations**, ethics and future work. The limitations section is where honest researchers show their quality.

## Key Vocabulary

| Term | Definition |
|---|---|
| **ACM Code of Ethics** | The principles of professional conduct of computing professionals: avoid harm, be honest, be fair, respect privacy and credit. |
| **Data minimisation / consent** | Collecting only the data that is needed / the clear permission of the person whose data it is. |
| **Accessibility** | Making software usable by people with different abilities: keyboard, screen readers, captions, contrast. |
| **Licence / copyright** | The rules for using code, text, images or data / the legal right of its creator. |
| **Plagiarism / academic integrity** | Presenting somebody else's work as your own / being honest about whose work and ideas are whose. |
| **Primary source** | A document that reports original work, such as a research paper or a specification. |
| **Peer review** | Checking of a paper by independent experts before it is published. |
| **Reproducibility** | Another person can get the same result from your code, data and settings. |
| **Random seed** | The starting value of a pseudo-random generator; the same seed gives the same numbers. |
| **Capstone** | A larger project that combines many skills and finishes a course or a programme. |
| **Critical path** | The longest chain of dependent tasks; it decides the shortest possible duration. |
| **Slack / buffer** | How much a task can slip without delaying the project / extra time added to a plan for the unexpected. |
| **Limitations** | The honest part of a report that says what the work does not show or cannot do. |

## Worked Examples

### Example 1: A responsible-design review in code

```python
def review(project):
    """Turn the questions of responsible design into a list of concerns."""
    concerns = []
    if project["personal_data"]:
        if not project["consent"]:
            concerns.append("personal data is collected without clear consent")
        if not project["minimal"]:
            concerns.append("it collects more data than it needs")
        if not project["deletable"]:
            concerns.append("people cannot ask for their data to be deleted")
    if project["decides_about_people"]:
        if not project["bias_tested"]:
            concerns.append("its decisions were not tested for bias")
        if not project["human_review"]:
            concerns.append("no person can check or overturn a decision")
    if not project["accessible"]:
        concerns.append("it cannot be used with a keyboard and a screen reader")
    if project["third_party"] and not project["licences_checked"]:
        concerns.append("the licences of the third-party code or data were not checked")
    return concerns


PROJECTS = {
    "Face-recognition attendance": dict(personal_data=True, consent=False, minimal=False, deletable=False, decides_about_people=True,
                                        bias_tested=False, human_review=False, accessible=True, third_party=True, licences_checked=False),
    "Class timetable app": dict(personal_data=False, consent=False, minimal=True, deletable=True, decides_about_people=False,
                                bias_tested=False, human_review=False, accessible=True, third_party=True, licences_checked=True),
    "Attendance by roll call, redesigned": dict(personal_data=True, consent=True, minimal=True, deletable=True, decides_about_people=True,
                                                bias_tested=True, human_review=True, accessible=False, third_party=False, licences_checked=False),
}
for name, project in PROJECTS.items():
    concerns = review(project)
    print(f"{name}: {len(concerns)} concern(s)")
    for concern in concerns:
        print("  -", concern)
```

```output
Face-recognition attendance: 6 concern(s)
  - personal data is collected without clear consent
  - it collects more data than it needs
  - people cannot ask for their data to be deleted
  - its decisions were not tested for bias
  - no person can check or overturn a decision
  - the licences of the third-party code or data were not checked
Class timetable app: 0 concern(s)
Attendance by roll call, redesigned: 1 concern(s)
  - it cannot be used with a keyboard and a screen reader
```

1. `review` turns the questions of responsible design into code. Each rule looks at one property of a project and adds a **concern** in plain words, much as a linter finds suspicious code. The data of each project are a dictionary of yes and no answers.
2. The **face-recognition attendance** system has **six concerns**: it collects personal data without consent, collects more than it needs, offers no deletion, makes decisions about people that were not tested for bias, has no person who can overturn a decision, and uses third-party components whose licences were not checked.
3. The **class timetable** app has **none**: it holds no personal data and decides nothing about people. The **redesigned roll call** has fixed the first six problems, but one concern is left: it cannot be used with a keyboard and a screen reader, which a review at the start would have caught cheaply.
4. A checklist is not a conscience: it finds only what someone thought to ask, and passing it does not make a project good. But it makes the questions routine, and a concern found in the design costs a conversation, while the same concern found after release can cost a person their rights or their safety.

### Example 2: A reproducible experiment, and citations

```python
import statistics


def lcg_list(seed, count, modulus=100_000):
    """Repeatable pseudo-random numbers: the same on every computer."""
    values, x = [], seed
    for _ in range(count):
        x = (x * 1103515245 + 12345) % 2 ** 31
        values.append(x % modulus)
    return values


def linear_comparisons(data, target):
    for count, item in enumerate(data, start=1):
        if item == target:
            return count
    return len(data)


def binary_comparisons(data, target):
    low, high, count = 0, len(data) - 1, 0
    while low <= high:
        mid = (low + high) // 2
        count += 1
        if data[mid] == target:
            return count
        low, high = (mid + 1, high) if data[mid] < target else (low, mid - 1)
    return count


print("Experiment: searching 1,000 sorted numbers for a number that is in the list")
linear, binary = [], []
for seed in range(1, 6):
    data = sorted(lcg_list(seed, 1000))
    target = data[(seed * 337) % 1000]
    linear.append(linear_comparisons(data, target))
    binary.append(binary_comparisons(data, target))
    print(f"  seed {seed}: linear {linear[-1]:>3} comparisons, binary {binary[-1]:>2}")
for name, runs in (("linear", linear), ("binary", binary)):
    print(f"{name}: mean {statistics.mean(runs):.1f}, stdev {statistics.stdev(runs):.1f}, range {min(runs)} to {max(runs)}")

REFERENCES = [
    {"author": "Dijkstra, E. W.", "year": 1968, "title": "Go To Statement Considered Harmful", "venue": "Communications of the ACM, 11(3), 147-148"},
    {"author": "Turing, A. M.", "year": 1950, "title": "Computing Machinery and Intelligence", "venue": "Mind, 59(236), 433-460"},
    {"author": "Knuth, D. E.", "title": "The Art of Computer Programming, Volume 3: Sorting and Searching", "venue": "Addison-Wesley"},
]


def cite(reference):
    missing = [field for field in ("author", "year", "title", "venue") if field not in reference]
    if missing:
        return f"INCOMPLETE ({', '.join(missing)} missing): {reference.get('title', '?')}"
    return f"{reference['author']} ({reference['year']}). {reference['title']}. {reference['venue']}."


print()
for reference in sorted(REFERENCES, key=lambda r: r["author"]):
    print(cite(reference))
```

```output
Experiment: searching 1,000 sorted numbers for a number that is in the list
  seed 1: linear 338 comparisons, binary 10
  seed 2: linear 675 comparisons, binary  8
  seed 3: linear  12 comparisons, binary 10
  seed 4: linear 349 comparisons, binary  9
  seed 5: linear 686 comparisons, binary 10
linear: mean 412.0, stdev 280.0, range 12 to 686
binary: mean 9.4, stdev 0.9, range 8 to 10

Dijkstra, E. W. (1968). Go To Statement Considered Harmful. Communications of the ACM, 11(3), 147-148.
INCOMPLETE (year missing): The Art of Computer Programming, Volume 3: Sorting and Searching
Turing, A. M. (1950). Computing Machinery and Intelligence. Mind, 59(236), 433-460.
```

1. The experiment counts the comparisons that two searches need in a list of 1,000 sorted pseudo-random numbers, for five different **seeds**. Because the generator is repeatable, anyone who runs the program gets the same numbers: the experiment is **reproducible**.
2. **Linear search** needed 338, 675, 12, 349 and 686 comparisons, depending on where the target happened to be: the mean is 412.0 but the standard deviation is 280.0. A single run could have been 12 or 686 and told a completely wrong story. **Binary search** needed 10, 8, 10, 9 and 10: a mean of 9.4 and a standard deviation of 0.9, close to log2 of 1,000, which is about 10.
3. Hence the rules of a computational experiment: fix and record the seeds, **repeat** the measurement, report the **mean and the spread**, and compare with a baseline (here, the linear search).
4. `cite` writes every reference in one style, and `sorted` puts them in the order of the authors. It also **checks** each reference: the third entry has no year, so the program flags it as incomplete instead of leaving a reader to find out. The first two references are real classic papers, and a real reference list should be checked in the same way.

### Example 3: Planning a capstone with a critical path

```python
TASKS = {  # days, depends on, priority (M must, S should, C could)
    "plan": (2, [], "M"),
    "data": (3, ["plan"], "M"),
    "clean": (2, ["data"], "M"),
    "model": (4, ["clean"], "M"),
    "tests": (3, ["clean"], "M"),
    "report": (3, ["model", "tests"], "M"),
    "charts": (2, ["clean"], "S"),
    "demo video": (2, ["report"], "C"),
    "app": (5, ["model"], "C"),
}
DEADLINE, BUFFER = 18, 0.20


def schedule(tasks):
    """Earliest start and finish of every task; a task starts when all its dependencies have finished."""
    finish, start = {}, {}
    remaining = dict(tasks)
    while remaining:
        ready = [name for name, (_, needs, _) in remaining.items() if all(n in finish for n in needs)]
        for name in sorted(ready):
            days, needs, _ = remaining.pop(name)
            start[name] = max((finish[n] for n in needs), default=0)
            finish[name] = start[name] + days
    return start, finish


def critical_path(tasks, finish):
    """Follow the dependency that finishes last, back from the last task."""
    name = max(finish, key=lambda n: (finish[n], n))
    path = [name]
    while tasks[name][1]:
        name = max(tasks[name][1], key=lambda n: (finish[n], n))
        path.append(name)
    return path[::-1]


usable = DEADLINE * (1 - BUFFER)
print(f"deadline {DEADLINE} days, buffer {BUFFER:.0%}: plan for at most {usable:.1f} days")
chosen = dict(TASKS)
while True:
    start, finish = schedule(chosen)
    length = max(finish.values())
    print(f"{len(chosen)} tasks need {length} days:", "fits" if length <= usable else "too long")
    if length <= usable:
        break
    dropped = max((n for n, (_, _, p) in chosen.items() if p == "C"), key=lambda n: (finish[n], n))
    print("  drop the Could task", dropped)
    del chosen[dropped]
    chosen = {n: (d, [x for x in needs if x in chosen], p) for n, (d, needs, p) in chosen.items()}
for name in sorted(start, key=lambda n: (start[n], n)):
    print(f"  {name:<10} day {start[name]:>2} to {finish[name]:>2}  {chosen[name][2]}")
print("critical path:", " > ".join(critical_path(chosen, finish)), f"({length} days)")
```

```output
deadline 18 days, buffer 20%: plan for at most 14.4 days
9 tasks need 16 days: too long
  drop the Could task demo video
8 tasks need 16 days: too long
  drop the Could task app
7 tasks need 14 days: fits
  plan       day  0 to  2  M
  data       day  2 to  5  M
  clean      day  5 to  7  M
  charts     day  7 to  9  S
  model      day  7 to 11  M
  tests      day  7 to 10  M
  report     day 11 to 14  M
critical path: plan > data > clean > model > report (14 days)
```

1. `TASKS` describes the plan: for every task its duration in days, the tasks that it depends on, and its MoSCoW priority. The deadline is 18 days, and with a **buffer** of 20 per cent the plan may use only 14.4 days.
2. `schedule` finds the **earliest start** of each task, which is the latest finish among its dependencies, and its finish, which is the start plus the days. It repeats rounds of "which tasks have all their dependencies finished?", which is a topological order of the dependency graph, an idea from the algorithms course.
3. With all nine tasks the plan needs **16 days**, more than 14.4, so it is too long. The loop drops the Could task that finishes last: first the demo video, which does not help because the app also ends on day 16, and then the app. With seven tasks the plan needs **14 days** and fits. Deciding in advance which Could tasks go first is what a MoSCoW scope is for.
4. The **critical path** is plan, data, clean, model, report: 2 + 3 + 2 + 4 + 3 = 14 days. A delay of one day in any of these delays the whole project. The tests and the charts are **not** on the path: they have slack, and the tests, which end on day 10, can slip by a day without any effect. This is the longest path in a directed acyclic graph, used for planning.

## Common Mistakes and Misconceptions

- **Treating ethics as something that is added at the end.** Privacy, fairness and accessibility are cheap in the design and expensive after the release.
- **Thinking that anonymised means safe.** Removing names often leaves combinations of facts that identify a person.
- **Copying code, text or data without checking the licence,** or without credit. It can be illegal, and it breaks academic integrity.
- **Trusting one source,** or the first search result. Check who wrote it, when, and with what evidence.
- **Reporting the best run of an experiment.** Report the mean and the spread of several runs with recorded seeds, and say how the baseline did.
- **Choosing a specialisation by its fashion.** Try small projects in two directions, and keep your fundamentals strong in all of them.
- **A plan without buffer, dependencies or priorities.** Everything is a Must, everything takes the estimated time, and nothing goes wrong: that plan has never existed.
- **A report without limitations.** Every project has them; hiding them is dishonest, and stating them is what makes the rest believable.

## Guided Hands-On Activity

**Review, repeat, plan.** Work with your teacher and the code editors.

1. In Example 1 add a fourth project from your own life (a school library app, a canteen ordering system) and answer the questions for it. Which concerns does `review` find?
2. In Example 1 add one more rule of your own (for example, "the data are kept for ever") and apply it to the three projects.
3. In Example 2 repeat the experiment with 10 seeds instead of 5. How do the mean and the standard deviation of the linear search change, and why does a single run mislead?
4. In Example 2 complete the third reference with the year 1998 (the second edition) and check that the program now accepts it. Then invent a reference with a missing venue.
5. In Example 3 change the deadline to 15 days and predict which Could tasks must go before you run it.
6. In Example 3 move the task "tests" to 6 days. Is it on the critical path now? Which path is the critical path?
7. Write your own capstone idea in two sentences, list five features with MoSCoW, and name the biggest risk and your plan B.

## Lesson Project: Capstone Plan and Final Project

### Objective

Finish the **course project**: a test suite for six components from the earlier lessons, a short **report** that states its limitations, a responsible-design review, a **plan** for the next 18 days that fits a 20 per cent buffer, and a **study roadmap** for your first year at university that puts your weakest areas first.

### Requirements

- **The components.** Use your own functions from the earlier lessons, or the compact versions in the teacher notes: `parse_marks` (Lesson 1), `median` (Lesson 2), `binary_search` and `bfs_path` (Lesson 3), `knn_predict` (Lesson 5) and a `Cloud` with an idempotent `receive(sensor, seq)` (Lesson 7).
- **The tests.** Twelve checks, two for each component: `parse_marks("72 45 88")` gives `([72, 45, 88], [])` and `parse_marks("72 abc -5 105")` gives `([72], ["abc", "-5", "105"])`; `median([3, 1, 2])` is 2 and `median([4, 1, 3, 2])` is 2.5; `binary_search([1, 3, 5, 7, 9], 7)` is 3 and for 4 it is -1; `bfs_path` on `{"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}` gives `["A", "B", "D"]` from A to D and `None` from D to A; `knn_predict` with k = 3 on the training set `[((1, 1), "low"), ((2, 1), "low"), ((8, 9), "high"), ((9, 8), "high")]` gives "low" for (2, 2), and with k = 1 gives "high" for (8, 8); a `Cloud` that receives `("A", 1)` twice stores one reading and counts one duplicate, and one that receives `("A", 1)` and `("B", 1)` stores two and counts none.
- **The report.** Print five numbered sections: the tests (the passed checks of every component, then the total), three honest limitations of your own, the responsible-design review of your project (the function `review` of Example 1 for a project that decides about people, was not tested for bias, has a person who reviews the decisions and uses only invented data), the plan, and the study roadmap.
- **The plan.** The task dictionary below, a deadline of 18 days and a buffer of 20 per cent: schedule the tasks, drop the Could task that finishes last while the plan is too long, and print the schedule and the total.
- **The roadmap.** Seven areas with your confidence from 1 to 5 (the sample ratings below); the need of an area is 6 minus its confidence; split 10 study hours a week in proportion to the need (round down; give the leftover hours one by one to the areas with the largest need, alphabetically on a tie); print the areas, the most needed first.

```text
write tests: 3 days, depends on nothing, M
test bias: 3 days, depends on write tests, M
fix findings: 2 days, depends on test bias, M
final report: 3 days, depends on fix findings, M
charts: 2 days, depends on write tests, S
demo video: 2 days, depends on final report, C
web page: 8 days, depends on fix findings, C

Programming (C, C++, Java): 4
Discrete mathematics: 2
Digital logic and architecture: 3
Data structures and algorithms: 3
Operating systems and networks: 2
Databases and the web: 4
Python and AI: 5
```

### Instructions

1. Collect the six components in one file, and write the twelve checks as a list of `(lesson, component, result)` triples.
2. Print the first section: for every component the number of passed checks, and the total.
3. Print the second section with three limitations that are true for your project.
4. Write `review` and print the third section for the project profile of the requirements.
5. Write `schedule` and the dropping loop and print the fourth section.
6. Write `roadmap` with the largest-remainder rule and print the fifth section.
7. Compare your output with the expected output, then change one component on purpose so that a test fails, and check that the report shows it.

### Expected Output

```text
Capstone report: a small Python toolkit for school data

1. Tests
  Lesson 1  parse_marks    2 of 2 passed
  Lesson 2  median         2 of 2 passed
  Lesson 3  binary_search  2 of 2 passed
  Lesson 3  bfs_path       2 of 2 passed
  Lesson 5  knn_predict    2 of 2 passed
  Lesson 7  Cloud.receive  2 of 2 passed
  12 of 12 tests passed

2. Limitations
  - The classifier was tested on only 10 students, so its accuracy is a rough guide.
  - The sensor network is a simulation; a real network fails in more ways.
  - The text analyser works for English only and cannot see sarcasm.

3. Responsible-design review: 1 concern(s)
  - its decisions were not tested for bias

4. Plan for the next 18 days (20% buffer, so 14.4 usable days)
  too long (16 days): drop the Could task web page
  write tests   day  0 to  3  M
  charts        day  3 to  5  S
  test bias     day  3 to  6  M
  fix findings  day  6 to  8  M
  final report  day  8 to 11  M
  demo video    day 11 to 13  C
  total 13 days

5. Study roadmap for the first year (10 hours a week)
  3 h  Discrete mathematics  (confidence 2 of 5)
  3 h  Operating systems and networks  (confidence 2 of 5)
  1 h  Data structures and algorithms  (confidence 3 of 5)
  1 h  Digital logic and architecture  (confidence 3 of 5)
  1 h  Databases and the web  (confidence 4 of 5)
  1 h  Programming (C, C++, Java)  (confidence 4 of 5)
  0 h  Python and AI  (confidence 5 of 5)
```

### Hints

1. **Hint 1 (the tests).** `(1, "parse_marks", parse_marks("72 45 88") == ([72, 45, 88], []))` stores the result of a check as `True` or `False`.
2. **Hint 2 (the grouping).** `dict.fromkeys((lesson, component) for ...)` gives each component once, in order.
3. **Hint 3 (the review).** Only three rules are needed here: personal data without consent, no bias test, no human review.
4. **Hint 4 (the plan).** Repeat `schedule`; while the length is above 14.4, drop the Could task that finishes last, and remove it from the dependency lists.
5. **Hint 5 (the roadmap).** `hours * need // sum(needs)` rounds down; `sorted(need, key=lambda a: (-need[a], a))[:leftover]` picks the areas that get the leftover hours.
6. **Hint 6 (the report).** Print the sections in order and use f-strings with `{name:<14}` to align the columns.

### Success Criteria

- [ ] All twelve tests pass, and a deliberately broken component makes the report show a failed test.
- [ ] The report has five numbered sections, and the limitations are true for your own project.
- [ ] The review reports exactly one concern: the decisions were not tested for bias.
- [ ] The plan drops the web page, fits in 13 days, and keeps all the Must tasks.
- [ ] The roadmap uses exactly 10 hours: 3 hours for Discrete mathematics and for Operating systems and networks, and 0 hours for Python and AI.

### Extension Challenge

Add a test for each remaining lesson component (the cleaning function of Lesson 4, the text analyser of Lesson 6) and a `README.md` that explains how to run the project and the tests. Then write the **bias test** that the plan promises: run the classifier of Lesson 5 separately for the students of each class and report the accuracy per class, and say what you would do if one class were much worse. Finally, write a one-page reflection on which specialisation you would try first, which fundamental you would strengthen before you start, and which source you would read.

## Lesson Recap

- **Responsible computing** means avoiding harm, being honest and fair, respecting privacy, designing for accessibility and sustainability, respecting licences and integrity, and reporting vulnerabilities responsibly; a **design review checklist** finds concerns early.
- **Research skills**: ask a question, judge and cite sources, read papers from the abstract and conclusion first, and run **reproducible** experiments with recorded seeds, several runs, the **spread** and a baseline.
- The **CSE specialisations** (software engineering, systems, networks and security, AI and data, theory, interaction and graphics, embedded systems and robotics, computational science) all draw on the fundamentals of this programme.
- A **capstone plan** has a problem statement, a MoSCoW scope, tasks with dependencies, a **critical path**, a **buffer**, risks, tests and a report with **limitations**.

## Homework / Extension Mission

Write the plan for a capstone that you would like to build after this programme: the problem statement in two sentences, the users, ten features with MoSCoW, at least eight tasks with estimates and dependencies, the critical path, the risks with plans B, and the way you will test and evaluate it. Run the planner of Example 3 on it, with a deadline and a buffer of your choice, and decide which Could tasks to drop. Then write half a page on the three responsible-design questions that you would ask before building it, and on how you would answer them.

## Course Project Connection

This lesson finishes the **course project**, the small Python-based computational application or data exploration project. Over eight lessons it grew from a language comparison and a marks utility into a records toolkit, a tested algorithm library, an exam results explorer, a classifier, text and image analysers and a sensor pipeline simulation. Now it has a test suite, a report that states its limitations, a responsible-design review, a plan for what to build next, and a study roadmap for your first year at university. Keep the whole project in a Git repository with a README: it is the portfolio of everything that this programme taught you, and the habits in it (tests, honest numbers, small steps, careful planning) are the ones that you will use in every specialisation.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: Therac-25 and one case of unfairness or privacy as a class discussion; 10 minutes: Example 1, applied to a real school system chosen by the class; 10 minutes: research skills, with a short source evaluation exercise and Example 2; 10 minutes: specialisations and Example 3, with the dependency graph drawn on the board; 20 minutes: the project, ending with each student reading out one limitation and one roadmap decision.

**Live demonstrations.** Run the experiment of Example 2 with one seed and with ten and show how the single run misleads. Draw the dependency graph of the capstone plan and mark the critical path in colour. Show a good and a bad README, and a good and a bad report limitation section. Let students evaluate the same claim from three sources of different quality.

**Misconceptions.** "Ethics is opinion, not engineering." "If it is on the internet, I may use it." "A good result is the one that I got on the best run." "A specialisation must be chosen on the first day." "A plan is a promise."

**Assessment of the project.** Run the program and compare the output. Check the twelve tests and break a component to see the failure. Check that the limitations are true and specific, that the review finds the one concern, that the plan drops the web page and totals 13 days, and that the roadmap uses 10 hours. Ask each student to defend one decision of their roadmap and one limitation of their project, and to say what they would do first with another week.

**Reference solution `capstone.py`** (run with `python3 capstone.py`):

```python
"""Course project, final step: tests, a report, a plan and a study roadmap."""
from collections import Counter, deque
from math import dist


# ---------- the components (compact versions of the earlier lessons) ----------
def parse_marks(text):
    marks, skipped = [], []
    for word in text.split():
        if word.lstrip("-").isdigit() and 0 <= int(word) <= 100:
            marks.append(int(word))
        else:
            skipped.append(word)
    return marks, skipped


def median(values):
    ordered = sorted(values)
    middle = len(ordered) // 2
    return ordered[middle] if len(ordered) % 2 else (ordered[middle - 1] + ordered[middle]) / 2


def binary_search(items, target):
    low, high = 0, len(items) - 1
    while low <= high:
        mid = (low + high) // 2
        if items[mid] == target:
            return mid
        low, high = (mid + 1, high) if items[mid] < target else (low, mid - 1)
    return -1


def bfs_path(graph, start, goal):
    parent, queue = {start: None}, deque([start])
    while queue:
        place = queue.popleft()
        if place == goal:
            path = []
            while place is not None:
                path.append(place)
                place = parent[place]
            return path[::-1]
        for neighbour in graph[place]:
            if neighbour not in parent:
                parent[neighbour] = place
                queue.append(neighbour)
    return None


def knn_predict(train, point, k):
    nearest = sorted((dist(features, point), label) for features, label in train)[:k]
    return Counter(label for _, label in nearest).most_common(1)[0][0]


class Cloud:
    def __init__(self):
        self.seen, self.duplicates = set(), 0

    def receive(self, sensor, seq):
        if (sensor, seq) in self.seen:
            self.duplicates += 1
        self.seen.add((sensor, seq))


# ---------- the tests ----------
GRAPH = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}
TRAIN = [((1, 1), "low"), ((2, 1), "low"), ((8, 9), "high"), ((9, 8), "high")]


def duplicate_ignored():
    cloud = Cloud()
    cloud.receive("A", 1)
    cloud.receive("A", 1)
    return len(cloud.seen) == 1 and cloud.duplicates == 1


def sensors_kept_apart():
    cloud = Cloud()
    cloud.receive("A", 1)
    cloud.receive("B", 1)
    return len(cloud.seen) == 2 and cloud.duplicates == 0


TESTS = [  # lesson, component, result of the check
    (1, "parse_marks", parse_marks("72 45 88") == ([72, 45, 88], [])),
    (1, "parse_marks", parse_marks("72 abc -5 105") == ([72], ["abc", "-5", "105"])),
    (2, "median", median([3, 1, 2]) == 2),
    (2, "median", median([4, 1, 3, 2]) == 2.5),
    (3, "binary_search", binary_search([1, 3, 5, 7, 9], 7) == 3),
    (3, "binary_search", binary_search([1, 3, 5, 7, 9], 4) == -1),
    (3, "bfs_path", bfs_path(GRAPH, "A", "D") == ["A", "B", "D"]),
    (3, "bfs_path", bfs_path(GRAPH, "D", "A") is None),
    (5, "knn_predict", knn_predict(TRAIN, (2, 2), 3) == "low"),
    (5, "knn_predict", knn_predict(TRAIN, (8, 8), 1) == "high"),
    (7, "Cloud.receive", duplicate_ignored()),
    (7, "Cloud.receive", sensors_kept_apart()),
]


# ---------- the responsible-design review ----------
def review(project):
    concerns = []
    if project["personal_data"] and not project["consent"]:
        concerns.append("personal data is collected without clear consent")
    if project["decides_about_people"]:
        if not project["bias_tested"]:
            concerns.append("its decisions were not tested for bias")
        if not project["human_review"]:
            concerns.append("no person can check or overturn a decision")
    return concerns


# ---------- the plan ----------
PLAN = {  # days, depends on, priority
    "write tests": (3, [], "M"), "test bias": (3, ["write tests"], "M"), "fix findings": (2, ["test bias"], "M"),
    "final report": (3, ["fix findings"], "M"), "charts": (2, ["write tests"], "S"),
    "demo video": (2, ["final report"], "C"), "web page": (8, ["fix findings"], "C"),
}
DEADLINE, BUFFER = 18, 0.20


def schedule(tasks):
    start, finish, remaining = {}, {}, dict(tasks)
    while remaining:
        for name in sorted(n for n, (_, needs, _) in remaining.items() if all(x in finish for x in needs)):
            days, needs, _ = remaining.pop(name)
            start[name] = max((finish[x] for x in needs), default=0)
            finish[name] = start[name] + days
    return start, finish


# ---------- the study roadmap ----------
RATINGS = {  # how confident I am, from 1 (unsure) to 5 (confident)
    "Programming (C, C++, Java)": 4, "Discrete mathematics": 2, "Digital logic and architecture": 3,
    "Data structures and algorithms": 3, "Operating systems and networks": 2, "Databases and the web": 4, "Python and AI": 5,
}


def roadmap(ratings, hours=10):
    need = {area: 6 - rating for area, rating in ratings.items()}
    share = {area: hours * n // sum(need.values()) for area, n in need.items()}
    leftover = hours - sum(share.values())
    for area in sorted(need, key=lambda a: (-need[a], a))[:leftover]:
        share[area] += 1
    return sorted(share.items(), key=lambda item: (-need[item[0]], item[0]))


if __name__ == "__main__":
    print("Capstone report: a small Python toolkit for school data\n")
    print("1. Tests")
    for lesson, component in dict.fromkeys((lesson, component) for lesson, component, _ in TESTS):
        results = [ok for l, c, ok in TESTS if (l, c) == (lesson, component)]
        print(f"  Lesson {lesson}  {component:<14} {sum(results)} of {len(results)} passed")
    print(f"  {sum(ok for _, _, ok in TESTS)} of {len(TESTS)} tests passed")

    print("\n2. Limitations")
    for limitation in ("The classifier was tested on only 10 students, so its accuracy is a rough guide.",
                       "The sensor network is a simulation; a real network fails in more ways.",
                       "The text analyser works for English only and cannot see sarcasm."):
        print("  -", limitation)

    profile = dict(personal_data=False, consent=False, decides_about_people=True, bias_tested=False, human_review=True)
    concerns = review(profile)
    print(f"\n3. Responsible-design review: {len(concerns)} concern(s)")
    for concern in concerns:
        print("  -", concern)

    usable = DEADLINE * (1 - BUFFER)
    print(f"\n4. Plan for the next {DEADLINE} days ({BUFFER:.0%} buffer, so {usable:.1f} usable days)")
    chosen = dict(PLAN)
    while True:
        start, finish = schedule(chosen)
        if max(finish.values()) <= usable:
            break
        dropped = max((n for n, (_, _, p) in chosen.items() if p == "C"), key=lambda n: (finish[n], n))
        print(f"  too long ({max(finish.values())} days): drop the Could task {dropped}")
        chosen = {n: (d, [x for x in needs if x != dropped], p) for n, (d, needs, p) in chosen.items() if n != dropped}
    for name in sorted(start, key=lambda n: (start[n], n)):
        print(f"  {name:<13} day {start[name]:>2} to {finish[name]:>2}  {chosen[name][2]}")
    print(f"  total {max(finish.values())} days")

    print("\n5. Study roadmap for the first year (10 hours a week)")
    for area, hours in roadmap(RATINGS):
        print(f"  {hours} h  {area}  (confidence {RATINGS[area]} of 5)")
```

```output
Capstone report: a small Python toolkit for school data

1. Tests
  Lesson 1  parse_marks    2 of 2 passed
  Lesson 2  median         2 of 2 passed
  Lesson 3  binary_search  2 of 2 passed
  Lesson 3  bfs_path       2 of 2 passed
  Lesson 5  knn_predict    2 of 2 passed
  Lesson 7  Cloud.receive  2 of 2 passed
  12 of 12 tests passed

2. Limitations
  - The classifier was tested on only 10 students, so its accuracy is a rough guide.
  - The sensor network is a simulation; a real network fails in more ways.
  - The text analyser works for English only and cannot see sarcasm.

3. Responsible-design review: 1 concern(s)
  - its decisions were not tested for bias

4. Plan for the next 18 days (20% buffer, so 14.4 usable days)
  too long (16 days): drop the Could task web page
  write tests   day  0 to  3  M
  charts        day  3 to  5  S
  test bias     day  3 to  6  M
  fix findings  day  6 to  8  M
  final report  day  8 to 11  M
  demo video    day 11 to 13  C
  total 13 days

5. Study roadmap for the first year (10 hours a week)
  3 h  Discrete mathematics  (confidence 2 of 5)
  3 h  Operating systems and networks  (confidence 2 of 5)
  1 h  Data structures and algorithms  (confidence 3 of 5)
  1 h  Digital logic and architecture  (confidence 3 of 5)
  1 h  Databases and the web  (confidence 4 of 5)
  1 h  Programming (C, C++, Java)  (confidence 4 of 5)
  0 h  Python and AI  (confidence 5 of 5)
```

**Differentiation.** Support: give the components and the test list, and let students write the report and the roadmap. Stretch: the per-class bias test, a README, tests for the Lessons 4 and 6 components, and the reflection on a specialisation.

**Discussion questions (not for the student quiz).** Whose job is it to ask whether a system is fair, the programmer's, the manager's or the user's? What would make you stop work on a project for ethical reasons? What is the most useful sentence in a "Limitations" section?
