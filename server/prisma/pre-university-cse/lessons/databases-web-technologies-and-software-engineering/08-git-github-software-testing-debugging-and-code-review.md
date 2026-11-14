# Lumexa Mission Log: Databases, Web Technologies & Software Engineering

**Course/Path:** Databases, Web Technologies & Software Engineering
**Lesson:** 08 of 08
**Title:** Git, GitHub, Software Testing, Debugging and Code Review
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Git · JavaScript tests

---

## Mission Brief

The Student Information Application now has a database, a page, some logic and a specification. But "it worked when I tried it" is not the standard of professional software. A real team must be able to answer four questions at any moment: **What changed, when and why?** (version control), **Does it still work?** (automatic tests), **Why does it fail, and where is the cause?** (debugging) and **Is this change good enough to join the product?** (code review). And at the end somebody else must be able to **run** what you built: that is shipping.

This lesson gives you the tools for all of them. You learn how **Git** records history as a graph of commits, and how branches, merges and pull requests let many people work on one project through **GitHub**; how to write **unit tests** that catch the bugs that hide at the edges of the data; how to **debug** by method instead of by luck; and how to **review** code with a checklist. Then you test, review and package the Student Information Application, with a printed test report and a release check that decides whether it is ready to ship.

## Learning Objectives

1. Explain what version control is, use the core Git commands (`init`, `status`, `add`, `commit`, `log`, `switch`, `merge`, `push`, `pull`) and describe the GitHub workflow of branch, pull request, review and merge.
2. Describe how Git stores history as a graph of commits with parents, and tell a fast-forward from a merge commit and from a merge conflict.
3. Write automatic unit tests (arrange, act, assert) for normal, boundary and invalid input, and explain test-driven development, regression tests and the test pyramid.
4. Debug systematically: reproduce the failure, isolate it, form a hypothesis, fix the cause, verify the fix and add a regression test.
5. Review code with a checklist (correctness, edge cases, readability, security, tests) and write kind, specific review comments.
6. Test, review and package the Student Information Application with a test report, a README, a database script and an automatic release check.

## Prerequisites

- Lessons 1 to 7: the database, the page, the JavaScript logic and the specification of the SIA.
- JavaScript functions, arrays and objects from Lesson 6, and Python dictionaries and classes from the earlier courses.
- Optional: Git installed on your computer and a free GitHub account. Without them you can still follow the lesson: the Python model of Example 1 shows how Git thinks, and the commands can be tried later with your teacher.

## Concept Explanation

### Version control with Git and GitHub

**Version control** is a system that records every change to a project: what changed, who changed it, when and why. You can compare versions, go back to a working one, and let several people work at the same time without overwriting each other. **Git**, written by Linus Torvalds in 2005 for the Linux kernel, is the standard tool. It is **distributed**: every copy of the project (a **clone**) holds the complete history, so you can work without a network and nothing is lost if one copy disappears.

Git works with three places. Your files live in the **working directory**. `git add` copies the changes that you choose into the **staging area**, the draft of the next snapshot. `git commit -m "message"` stores the staged changes as a **commit** in the **repository**. A commit is a snapshot of all the files plus the author, the time, the message and the id of its **parent** commit, the one it grew from. The id is a hash computed from all of that, so if anything in the history changes, every id after it changes too. This is how Git notices tampering and corruption.

A **branch** is only a small movable label that points to a commit. Making one is almost free, so the habit is to make one for every feature or fix: `git switch -c feature/filter` creates the branch and moves to it, and every new commit moves that label forward. When the work is finished, `git merge feature/filter` joins it to the branch you are on. If `main` has not moved since the branch was made, Git simply slides the `main` label forward (a **fast-forward**). If both lines have new commits, Git creates a **merge commit** with two parents. If both lines changed the same lines of the same file, Git cannot decide: it reports a **merge conflict**, marks the file with `<<<<<<<`, `=======` and `>>>>>>>`, and a person edits the file to keep what is right, then runs `git add` and `git commit`. This is a real terminal session, with the files `schema.sql`, `app.js` and `README.md` created with an editor between the commands (your commit ids will differ):

```text
$ mkdir sia
$ cd sia
$ git init -b main
Initialized empty Git repository in /home/student/sia/.git/
$ git status -s
?? schema.sql
$ git add schema.sql
$ git commit -m "Create the students table"
[main (root-commit) de69319] Create the students table
 1 file changed, 1 insertion(+)
 create mode 100644 schema.sql
$ git switch -c feature/filter
Switched to a new branch 'feature/filter'
$ git add app.js
$ git commit -m "Add the filter function"
[feature/filter 5341795] Add the filter function
 1 file changed, 1 insertion(+)
 create mode 100644 app.js
$ git switch main
Switched to branch 'main'
$ git add README.md
$ git commit -m "Add a README"
[main 739c072] Add a README
 1 file changed, 1 insertion(+)
 create mode 100644 README.md
$ git merge feature/filter -m "Merge feature/filter"
Merge made by the 'ort' strategy.
 app.js | 1 +
 1 file changed, 1 insertion(+)
 create mode 100644 app.js
$ git log --oneline --graph
*   61c831b Merge feature/filter
|\
| * 5341795 Add the filter function
* | 739c072 Add a README
|/
* de69319 Create the students table
```

**GitHub** (and similar services such as GitLab) keeps a **remote** copy of the repository on a server: `git push` sends your commits there, `git pull` brings other people's commits back and `git clone url` copies a whole project. Its central idea is the **pull request**: you push a branch and ask for it to be merged into `main`. The team sees exactly what changed, comments on it (a **code review**), automatic checks such as the test suite run on every push (**continuous integration**), and only then is the branch merged. A few habits make all this work: commit small and often, write messages that say what and why ("Validate the grade range 9 to 12", not "update"), pull before you push, and never commit **secrets** (passwords, keys) or generated folders such as `node_modules`: list them in a `.gitignore` file.

### Software testing

**Testing** means running a program to find defects and to gain confidence that it does what the requirements say. Clicking through the page by hand is slow, and it gets skipped when a deadline is near. An **automated test** is a small program that checks another program, and the whole collection can be run in a second after every change. A **unit test** checks one small unit, usually a function, on its own. Each test has the same three parts, often called **arrange, act, assert**: prepare the input, call the function, and compare the result with the expected value (`assertEqual(actual, expected)`). One input with its expected result is a **test case**, the collection is the **test suite** and the printed result is the **test report**.

The skill is choosing the cases. Take the rule "a score is a whole number from 0 to 100". **Normal** cases are typical values (72). **Boundary** cases are the values on and just outside the edges: 0, 100, -1 and 101. Most bugs hide at the boundaries, because the classic mistake is an **off-by-one error**: `<` written where `<=` was meant. **Invalid** cases are things that should never arrive but will: 85.5, the text `"90"`, `NaN`. A suite with only typical values passes even when the code is wrong at the edges, as Example 2 will show.

**Test-driven development (TDD)** turns this around: write a test that fails (red), write just enough code to make it pass (green), tidy the code (refactor), and repeat. The tests then are a checked specification, and they exist because they were written first. A **regression test** is a test added when a bug has been found, so that the same bug can never come back unnoticed. Test the tests, too: if you break the code on purpose and no test fails, the tests are worthless. The **test pyramid** advises many fast unit tests at the bottom, fewer **integration tests** in the middle (parts working together, such as the API with the database) and a few slow **end-to-end tests** at the top (a robot clicking through the real page). **Code coverage** shows which lines the tests ran, so it reveals what is *not* tested, but 100 per cent coverage does not prove correctness. As Edsger Dijkstra put it, testing can show that bugs are present, never that none are left.

### Debugging

A **bug** is a defect in the code (or the requirement); a **failure** is what the user sees; **debugging** is finding the cause and removing it. There are three kinds. A **syntax error** stops the program from starting, and the message names the line. A **runtime error** stops it while it runs (an exception); read the message from the top, find the file and the line. A **logic error** gives a wrong answer without any message, and it is the hardest, because the program does exactly what you wrote, not what you meant.

Good debugging is the scientific method. **Reproduce** the failure with the smallest input that always fails. **Isolate** it: print the values at each step (`console.log`), or use the debugger of the browser or the editor, with **breakpoints** that pause the program and let you step through line by line and watch the variables; or **bisect**, checking the data in the middle of the program to learn which half contains the fault. Then form a **hypothesis** ("a missing score is counted as zero"), run one **experiment** that could prove it wrong, fix the **cause** rather than the symptom, and **verify** the fix; finally add a regression test. Change one thing at a time, read the error message first, check your assumptions (types, units, off-by-one), and explain the problem aloud to a classmate or a rubber duck, which often finds the bug by itself. When a bug seems impossible, look in your own code first, not in the language.

### Code review, quality and shipping

In a **code review** a second person reads a change before it is merged. It finds bugs and security holes that the author no longer sees, spreads knowledge in the team and keeps the style consistent. A reviewer asks: Does it do what the requirement says? Are the edge cases and errors handled? Is it readable (clear names, short functions, comments that explain *why*)? Is it secure (user input checked, `textContent` instead of `innerHTML`, no secrets)? Is it tested? Is it as simple as it can be? Good review comments are **specific**, **kind** and about the code, not the person: "This function changes the list and writes to the page, so I cannot test it. Could we split the logic from the display?" is useful; "bad code" is not. Tools help too: a **linter** finds suspicious code, a **formatter** ends arguments about spaces, and continuous integration runs the tests.

**Shipping** means that somebody else can use your work. A release has the code, the **database script** (`schema.sql` with the `CREATE TABLE` statements and sample data), a **README** (what it is, how to run it, how to run the tests, what the database looks like, what is missing), a `.gitignore`, and a **version** marked with a Git **tag** such as `v1.0.0`. **Semantic versioning** reads MAJOR.MINOR.PATCH: a breaking change raises the first number, a new feature the second, a bug fix the third. A **release checklist** is the list of things that must be true before shipping, and the best checklists are run by a script, as the project of this lesson does.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Version control** | A system that records every change to a project so that versions can be compared and restored. |
| **Repository / commit** | The project folder with its complete history / one saved snapshot with a message and a link to its parent. |
| **Staging area** | The place where `git add` collects the changes that will go into the next commit. |
| **Branch** | A small movable label that points to a commit, used for one line of work. |
| **Merge / fast-forward / conflict** | Joining two lines of work / only moving a label / both sides changed the same lines and a person must choose. |
| **Remote / pull request** | The copy of the repository on a server such as GitHub / a request to merge a branch, with a review. |
| **Unit test / assertion** | An automatic check of one small function / the statement in it that compares the result with the expected value. |
| **Boundary value** | An input on the edge of a valid range, and the values just outside it. |
| **TDD / regression test** | Writing the failing test first / a test added after a bug so that it cannot return. |
| **Debugging** | Finding and removing the cause of a defect, by reproducing, isolating, hypothesising, fixing and verifying. |
| **Code review** | Reading a change by somebody else before it is merged, with a checklist and kind, specific comments. |

## Worked Examples

### Example 1: How Git remembers history

```python
import hashlib


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
        seen, stack = set(), [commit_id]
        while stack:
            node = stack.pop()
            if node and node not in seen:
                seen.add(node)
                stack.extend(self.commits[node][1])
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

print("\nhistory of main, newest first")
repo.log()

print("\nbranches")
for name, tip in repo.branches.items():
    print(f"  {name:<7} -> {tip}")

print("\nsame message, other history:", Repo().commit("Add the student page"), "instead of", page)
```

```output
merge filter into main: merge commit fb7e60e
merge export into main: fast-forward to 9210cfc
merge export again:     already up to date

history of main, newest first
9210cfc Add the export button
fb7e60e Merge filter into main (parents 84f3bfe and 3bb6630)
84f3bfe Fix the page title
3bb6630 Add the grade filter
a5593de Add the name filter
e9af2b6 Add the student page
cae1fbf Create the students table

branches
  main    -> 9210cfc
  filter  -> 3bb6630
  export  -> 9210cfc

same message, other history: 711782a instead of e9af2b6
```

1. A **commit** is a record with a message and a list of **parents**. Its id is a hash (SHA-1, shortened to seven characters) of the message and the parents, so the id depends on the whole history behind it. A **branch** is only a name that points to a commit, which is why creating one costs nothing.
2. `filter` starts at "Add the student page" and gets two commits. Meanwhile `main` gets "Fix the page title", so the two lines have **diverged**. Merging `filter` into `main` cannot just move a label, so it creates a **merge commit** with **two parents**: the old tip of `main` and the tip of `filter`. The log shows both parents.
3. `export` is created at the merge commit and gets one commit. `main` has not moved, and its tip is an **ancestor** of the tip of `export`, so the merge is a **fast-forward**: only the label `main` moves, and no new commit is made. Merging `export` again finds that its tip is already in the history of `main`, so there is nothing to do.
4. The last line shows why history cannot be changed unnoticed: the same message has another id in a repository with another history, because the parent is part of what is hashed. Change one old commit and every id after it changes.

### Example 2: Unit tests find the bug at the boundary

```javascript
// The rule of the requirements: a grade level is a whole number from 9 to 12.
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

const show = (value) => (typeof value === "string" ? `"${value}"` : String(value));

function runSuite(title, rule) {
  console.log(title);
  let failed = 0;
  for (const [name, input, expected] of CASES) {
    const actual = rule(input);
    const ok = actual === expected;
    if (!ok) failed += 1;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}: ${show(input)} gives ${actual}${ok ? "" : `, expected ${expected}`}`);
  }
  console.log(`  ${CASES.length - failed} passed, ${failed} failed\n`);
  return failed;
}

const before = runSuite("Run 1: the first try (grade > 9 and grade < 12)", firstTry);
const after = runSuite("Run 2: after the repair (grade >= 9 and grade <= 12)", repaired);
console.log(before > 0 && after === 0 ? "The tests found the bug and the repair removed it." : "Something is still wrong.");
```

```output
Run 1: the first try (grade > 9 and grade < 12)
  PASS  a typical grade: 10 gives true
  FAIL  the lowest grade: 9 gives false, expected true
  FAIL  the highest grade: 12 gives false, expected true
  PASS  one below the range: 8 gives false
  PASS  one above the range: 13 gives false
  PASS  a fraction: 10.5 gives false
  PASS  text instead of a number: "10" gives false
  PASS  not a number: NaN gives false
  6 passed, 2 failed

Run 2: after the repair (grade >= 9 and grade <= 12)
  PASS  a typical grade: 10 gives true
  PASS  the lowest grade: 9 gives true
  PASS  the highest grade: 12 gives true
  PASS  one below the range: 8 gives false
  PASS  one above the range: 13 gives false
  PASS  a fraction: 10.5 gives false
  PASS  text instead of a number: "10" gives false
  PASS  not a number: NaN gives false
  8 passed, 0 failed

The tests found the bug and the repair removed it.
```

1. The rule is "from 9 to 12", and the first try wrote `grade > 9 && grade < 12`: a classic **off-by-one** error, because 9 and 12 themselves are excluded. `Number.isInteger` already rejects fractions, text and `NaN`.
2. `CASES` is a table of **test cases**: a name, an input and the expected result. `runSuite` is the test runner: for every case it **acts** (calls the rule), **asserts** (compares with the expected value) and prints PASS or FAIL, then a summary.
3. Run 1 fails exactly two tests, the lowest and the highest grade, which are the **boundary values**. The typical grade 10 passes, and so do all the invalid inputs. A suite with only normal cases would have said "all passed" and the bug would have reached the users.
4. After the repair to `>=` and `<=` all eight tests pass. In **test-driven development** you would have written the table first, watched it fail, and only then written the rule. The table stays in the project as a **regression suite**.

### Example 3: Debugging a wrong average

```javascript
// Bug report: "Sadia has scores of 90 and 80 and one exam that is not marked yet. Her average shows 56.7."
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
  console.log(`   after ${score}: total = ${total}`);
}
console.log(`   result: ${total} / ${scores.length} = ${Math.round((total / scores.length) * 10) / 10}`);

console.log("3. hypothesis: a missing score adds 0 to the total but still counts in the divisor");
console.log("   experiment: a list with only a missing score gives", averageV1([null]), "(there should be no average)");

function averageV2(scores) {
  const real = scores.filter((score) => score !== null);
  if (real.length === 0) return null;
  return Math.round((real.reduce((sum, score) => sum + score, 0) / real.length) * 10) / 10;
}

console.log("4. fix the cause, then verify and keep the tests");
function check(name, actual, expected) {
  console.log(`   ${actual === expected ? "PASS" : "FAIL"}  ${name}: ${actual}`);
}
check("the report of the bug", averageV2([90, null, 80]), 85);
check("only missing scores", averageV2([null, null]), null);
check("no scores at all", averageV2([]), null);
check("rounding to one decimal", averageV2([88, 90, 84]), 87.3);
```

```output
1. reproduce: 56.7 (expected 85)
2. isolate: follow the loop
   after 90: total = 90
   after null: total = 90
   after 80: total = 170
   result: 170 / 3 = 56.7
3. hypothesis: a missing score adds 0 to the total but still counts in the divisor
   experiment: a list with only a missing score gives 0 (there should be no average)
4. fix the cause, then verify and keep the tests
   PASS  the report of the bug: 85
   PASS  only missing scores: null
   PASS  no scores at all: null
   PASS  rounding to one decimal: 87.3
```

1. **Reproduce.** The smallest input that fails is the list from the bug report, `[90, null, 80]`: the function returns 56.7, not 85. There is no error message, so this is a **logic error**.
2. **Isolate.** Printing the total after every step shows where the picture goes wrong: after `null` the total is still 90, because JavaScript turns `null` into 0 in arithmetic. At the end the program divides 170 by 3, the **number of entries**, not by the 2 real scores.
3. **Hypothesis and experiment.** "A missing score adds nothing to the total but still counts in the divisor." The experiment is a list with only a missing score: it gives 0, where the right answer is "no average". The experiment could have disproved the hypothesis; it did not.
4. **Fix the cause, verify, keep the tests.** `averageV2` first removes the missing scores, returns `null` when nothing is left and divides by the number of *real* scores. The four checks become regression tests, so this bug can never return. SQL's `AVG`, which ignores NULL (Lesson 4), already had this right.

## Common Mistakes and Misconceptions

- **Committing everything at once with the message "update".** The history can no longer explain what changed or why; commit small steps with a message that says what and why.
- **Committing secrets or generated files.** A password that was pushed once must be treated as public, even if the file is deleted later: keep it out with `.gitignore` and change the password.
- **Testing only typical values.** The bugs live at the boundaries and in the invalid input: test 0, 100, -1, 101, empty, `null` and `NaN`.
- **Changing the test so that it passes.** A failing test is information. Change it only when the requirement has changed, not to silence it.
- **Debugging by random changes.** Without a hypothesis you cannot learn from a result. Change one thing at a time and say what you expect to see.
- **Believing that 100 per cent coverage means no bugs.** Coverage shows what ran, not whether the results were checked or the right cases were chosen.
- **Treating a review as an attack, or as a stamp.** "LGTM" without reading helps nobody, and personal remarks help nobody; comment on the code and say why.

## Guided Hands-On Activity

**Test, debug and review.** Work with your teacher.

1. In Example 2 add the cases `["the middle of the range", 11, true]` and `["zero", 0, false]` and run it again. Which tests of the first run still fail?
2. In Example 2 change the repaired rule to `grade >= 9 && grade < 12` and run it. Which test fails now, and what does it tell you about the rule?
3. In Example 3 add the check `check("a perfect score and a missing one", averageV2([100, 100, null]), 100)` and predict the result before you run it.
4. **Test first.** Write four test cases for a function `letterGrade(score)` with the scale "80 or more is A, 60 to 79 is B, 40 to 59 is C, below 40 is F", choosing boundary values (39, 40, 59, 60, 79, 80). Then write the function and make all the cases pass.
5. **Review this code.** Use the checklist of the lesson and write down at least five problems. Then write two review comments that are specific and kind.

```javascript
function addStudent(list, name, email, grade) {
  list.push({ id: list.length, name: name, email: email, grade: grade });
  document.getElementById("message").innerHTML = "Added " + name;
  return true;
}
```

6. In Example 1 add a third branch `fix-title` that starts at the tip of `main`, makes one commit and is merged into `main`. Predict first whether the merge is a fast-forward or a merge commit, then run it.
7. If Git is installed, repeat the terminal session of the lesson in a new folder and look at `git log --oneline --graph`.

## Lesson Project: SIA: Test, Review and Ship

### Objective

**Test, review and package** the Student Information Application: an automatic test suite for its logic with a printed report, a review of its code against the checklist, a Git history of small commits, and a release package that a script checks before you ship. This finishes the **Student Information Application**.

### Requirements

- **The logic.** The functions that can be tested without a browser: `filterStudents` and `validateStudent` (Lesson 6), `validateScore(value)` (a whole number from 0 to 100, user story US4), `average(scores)` (missing scores ignored, `null` when nothing is marked, rounded to one decimal, US5) and `canEnrol(course, studentId)` (refuses a student who is in the course already and a full course, checking the duplicate first, US7).
- **The test suite.** A small test runner (`describe`, `test`, `assertEqual`) and **at least 20 tests** in five groups, one for each function. They must include normal cases, the boundary values (grades 8, 9, 12, 13 and scores -1, 0, 100, 101) and invalid input (85.5, `"90"`, `NaN`, an empty name, a malformed e-mail address). The program prints PASS or FAIL for every test and a summary line.
- **The test of the tests.** Break one function on purpose (for example `>= 9` to `> 9`), check that at least one test fails, and repair it again.
- **The release check.** A function `checkRelease(files)` that receives the names and the texts of the package and returns the problems: a missing required file (`README.md`, `schema.sql`, `index.html`, `app.js`, `sia_tests.js`, `.gitignore`), a README without the sections "How to run", "Database" and "Tests", and a file that looks as if it contains a secret (`password =`, `api_key`, `secret`). Run it on a first draft that has problems and on the final package that has none.
- **Git and review.** A repository with at least six commits with meaningful messages, one feature branch merged into `main` (with a pull request on GitHub if you have an account), a `.gitignore`, and a short review of your own code: three comments from the checklist, each with the change you made.

### Instructions

1. Collect the five logic functions in one file, together with the list of the eight students of the SIA.
2. Write the three test helpers: `describe` prints a group name, `test` runs a body inside `try` and `catch` and prints PASS or FAIL, and `assertEqual` throws an error when the two values differ.
3. Write the tests group by group; write the boundary and invalid cases first, because they find the most bugs.
4. Run the suite. Then break one function, watch a test fail, and repair it.
5. Write `checkRelease` and the two packages (a first draft with problems, and the final package), print the reports and the line "Ready to ship: yes" only when every test passed and the final package has no problems.
6. Put the project under Git: `git init`, a `.gitignore`, and one commit for each step above; create a branch for the release check, merge it, and tag the result `v1.0.0`.
7. Review your own code with the checklist, apply the changes and compare the program output with the expected output.

### Expected Output

```text
validateStudent
  PASS  accepts a valid student
  PASS  refuses an empty name
  PASS  refuses a malformed e-mail address
  PASS  refuses a used e-mail address, ignoring capitals
  PASS  accepts the lowest and the highest grade
  PASS  refuses the grades just outside the range
filterStudents
  PASS  an empty filter keeps everybody
  PASS  ignores capitals in the name
  PASS  combines name and grade
validateScore
  PASS  accepts a typical score
  PASS  accepts the lowest and the highest score
  PASS  refuses -1 and 101
  PASS  refuses a fraction
  PASS  refuses text and NaN
average
  PASS  averages real scores
  PASS  ignores missing scores
  PASS  is null when nothing is marked
  PASS  rounds to one decimal
canEnrol
  PASS  accepts a student when a seat is free
  PASS  refuses a student who is in the course already
  PASS  refuses a student when the course is full
  PASS  checks the duplicate before the seats

22 of 22 tests passed

Release check of the first draft: 5 files, 6 problems
  1. missing file schema.sql
  2. missing file .gitignore
  3. README.md has no "How to run" section
  4. README.md has no "Database" section
  5. README.md has no "Tests" section
  6. config.js may contain a secret
Release check of the final package: 6 files, no problems

Ready to ship: yes
```

### Hints

1. **Hint 1 (the runner).** `test(name, body)` calls `body()` inside `try`; if `assertEqual` throws, the `catch` prints FAIL with `error.message`.
2. **Hint 2 (comparing).** `JSON.stringify(actual) === JSON.stringify(expected)` compares arrays and objects, but note that `NaN` becomes `null` in JSON.
3. **Hint 3 (the score rule).** `Number.isInteger(value)` is false for `85.5`, for the text `"90"` and for `NaN`, so one check handles all the invalid input.
4. **Hint 4 (the average).** Remove the `null` scores first, return `null` if nothing is left, and only then divide by the number of real scores.
5. **Hint 5 (the release check).** `name in files` tests for a file, `text.includes("## Database")` tests a README section, and a regular expression such as `/password\s*=|api[_-]?key|secret/i` finds the obvious secrets.
6. **Hint 6 (Git).** `git add -p` lets you commit one change at a time, and `git log --oneline --graph` shows the history and the merge.

### Success Criteria

- [ ] The suite has at least 20 tests in five groups, and every test passes.
- [ ] The boundary values (8, 9, 12, 13 and -1, 0, 100, 101) and the invalid inputs are tested.
- [ ] You broke a function on purpose and a test failed.
- [ ] The release check reports the problems of the first draft and none for the final package, and the program prints "Ready to ship: yes".
- [ ] The repository has at least six meaningful commits, a merged branch, a `.gitignore` and a tag.
- [ ] Your review has three comments from the checklist, each with the change you made.

### Extension Challenge

Add a test for each of the remaining user stories that can be tested without a browser, and push your repository to GitHub with a pull request that a classmate reviews with the checklist. Then write a **GitHub Actions** workflow that runs `node sia_tests.js` on every push, so that the test suite becomes a **continuous integration** check. Finally, say whether your next change would raise the MAJOR, MINOR or PATCH number of the tag.

## Lesson Recap

- **Git** records history as a graph of commits with parents; a **branch** is a movable label; a **merge** is a fast-forward, a merge commit or, when both sides changed the same lines, a conflict that a person resolves. **GitHub** adds the remote copy and the **pull request**.
- **Unit tests** check one function with normal, **boundary** and invalid cases; **TDD** writes the test first and a **regression test** stops an old bug from returning; the **test pyramid** has many unit tests and few end-to-end tests.
- **Debugging** is a method: reproduce, isolate, hypothesise, fix the cause, verify and keep a test.
- A **code review** uses a checklist and gives specific, kind comments; a **release** has code, a database script, a README, a `.gitignore` and a version, and a script can check it.

## Homework / Extension Mission

Put one of your own projects under Git (a program from an earlier course will do). Write down five commits with good messages, make a branch with one new feature, and merge it. Then write three tests for one of its functions, including one boundary case, and one regression test for a bug that you found or invent. Finally, swap the project with a classmate, review each other's code with the checklist, and write one paragraph about the most useful comment that you received and why.

## Course Project Connection

This lesson finishes the **Student Information Application**, the course project. Over the eight lessons it grew from an entity-relationship diagram through tables, SQL queries and reports, a web page and JavaScript logic to a specification, and now it is tested, reviewed, kept under version control and packaged with its database script and a README. Keep the repository: it is a portfolio piece, and the habits of this lesson (small commits, tests first, a review before every merge) are the ones that you will use at university and at work.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the four questions of a real team and a live Git session (init, two commits, a branch, a merge, `log --graph`); 10 minutes: Example 1, drawing the commit graph on the board before running it; 15 minutes: testing, with Example 2 (predict which tests fail before running it) and the boundary table; 10 minutes: debugging with Example 3 and the code review exercise; 15 minutes: the project.

**Live demonstrations.** Make a merge conflict on purpose (the same line on two branches). Let the class guess which tests of Example 2 fail before you run it. Break the reference solution (`>= 9` to `> 9`) and show which test catches it. Show a pull request on GitHub with a comment and a green check.

**Misconceptions.** "Git and GitHub are the same thing." "A commit saves only the changed lines." "More tests always mean better tests." "A bug that cannot be reproduced does not exist." "Reviews are for beginners."

**Assessment of the project.** Run the suite and check the count of tests and their groups, the boundary and invalid cases, and that the student really broke a function and saw a test fail. Check `git log --oneline --graph` for small commits with meaningful messages and a merged branch, the release check with its two reports, and the three review comments. Ask: which test would have caught the bug of Example 3?

**Reference solution `sia_tests.js`** (run with `node sia_tests.js`):

```javascript
"use strict";
// SIA: Test, Review and Ship - the logic of the Student Information Application, its test suite and a release check.

// ---------- the logic of the application (Lessons 6 and 7) ----------
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

function validateScore(value) {
  if (!Number.isInteger(value)) return "The score must be a whole number.";
  if (value < 0 || value > 100) return "The score must be from 0 to 100.";
  return null;
}

function average(scores) {
  const real = scores.filter((score) => score !== null);
  if (real.length === 0) return null;
  return Math.round((real.reduce((sum, score) => sum + score, 0) / real.length) * 10) / 10;
}

function canEnrol(course, studentId) {
  if (course.students.includes(studentId)) return { ok: false, reason: "already enrolled" };
  if (course.students.length >= course.capacity) return { ok: false, reason: "course is full" };
  return { ok: true, reason: "" };
}

// ---------- a tiny test runner ----------
const results = [];

function describe(name) {
  console.log(name);
}

function test(name, body) {
  try {
    body();
    results.push(true);
    console.log(`  PASS  ${name}`);
  } catch (error) {
    results.push(false);
    console.log(`  FAIL  ${name}: ${error.message}`);
  }
}

function assertEqual(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

// ---------- the test suite ----------
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
const names = (list) => list.map((s) => s.name);
const zara = { name: "Zara Khan", email: "zara@student.example", grade: 9 };

describe("validateStudent");
test("accepts a valid student", () => assertEqual(validateStudent(zara, students), []));
test("refuses an empty name", () => assertEqual(validateStudent({ ...zara, name: "  " }, students), ["The name is required."]));
test("refuses a malformed e-mail address", () => assertEqual(validateStudent({ ...zara, email: "zara.at.example" }, students), ["The e-mail address is not valid."]));
test("refuses a used e-mail address, ignoring capitals", () => assertEqual(validateStudent({ ...zara, email: "MIM@student.example" }, students), ["This e-mail address is already used."]));
test("accepts the lowest and the highest grade", () => {
  assertEqual(validateStudent({ ...zara, grade: 9 }, students), []);
  assertEqual(validateStudent({ ...zara, grade: 12 }, students), []);
});
test("refuses the grades just outside the range", () => {
  assertEqual(validateStudent({ ...zara, grade: 8 }, students).length, 1);
  assertEqual(validateStudent({ ...zara, grade: 13 }, students).length, 1);
});

describe("filterStudents");
test("an empty filter keeps everybody", () => assertEqual(filterStudents(students, "", "all").length, 8));
test("ignores capitals in the name", () => assertEqual(names(filterStudents(students, "TA", "all")), ["Tanvir Ahmed", "Tasnim Noor"]));
test("combines name and grade", () => assertEqual(names(filterStudents(students, "ta", "9")), ["Tasnim Noor"]));

describe("validateScore");
test("accepts a typical score", () => assertEqual(validateScore(72), null));
test("accepts the lowest and the highest score", () => {
  assertEqual(validateScore(0), null);
  assertEqual(validateScore(100), null);
});
test("refuses -1 and 101", () => {
  assertEqual(validateScore(-1), "The score must be from 0 to 100.");
  assertEqual(validateScore(101), "The score must be from 0 to 100.");
});
test("refuses a fraction", () => assertEqual(validateScore(85.5), "The score must be a whole number."));
test("refuses text and NaN", () => {
  assertEqual(validateScore("90"), "The score must be a whole number.");
  assertEqual(validateScore(NaN), "The score must be a whole number.");
});

describe("average");
test("averages real scores", () => assertEqual(average([92, 85]), 88.5));
test("ignores missing scores", () => assertEqual(average([90, null, 80]), 85));
test("is null when nothing is marked", () => {
  assertEqual(average([]), null);
  assertEqual(average([null, null]), null);
});
test("rounds to one decimal", () => assertEqual(average([88, 90, 84]), 87.3));

describe("canEnrol");
test("accepts a student when a seat is free", () => assertEqual(canEnrol({ capacity: 3, students: [1, 2] }, 5), { ok: true, reason: "" }));
test("refuses a student who is in the course already", () => assertEqual(canEnrol({ capacity: 3, students: [1, 2] }, 2), { ok: false, reason: "already enrolled" }));
test("refuses a student when the course is full", () => assertEqual(canEnrol({ capacity: 2, students: [1, 2] }, 5), { ok: false, reason: "course is full" }));
test("checks the duplicate before the seats", () => assertEqual(canEnrol({ capacity: 2, students: [1, 2] }, 1), { ok: false, reason: "already enrolled" }));

const passed = results.filter(Boolean).length;
console.log(`\n${passed} of ${results.length} tests passed\n`);

// ---------- the release check ----------
const REQUIRED_FILES = ["README.md", "schema.sql", "index.html", "app.js", "sia_tests.js", ".gitignore"];
const README_SECTIONS = ["How to run", "Database", "Tests"];

function checkRelease(files) {
  const problems = [];
  for (const name of REQUIRED_FILES) {
    if (!(name in files)) problems.push(`missing file ${name}`);
  }
  const readme = files["README.md"] || "";
  for (const section of README_SECTIONS) {
    if (!readme.includes(`## ${section}`)) problems.push(`README.md has no "${section}" section`);
  }
  for (const [name, text] of Object.entries(files)) {
    if (/password\s*=|api[_-]?key|secret/i.test(text)) problems.push(`${name} may contain a secret`);
  }
  return problems;
}

function report(label, files) {
  const problems = checkRelease(files);
  console.log(`${label}: ${Object.keys(files).length} files, ${problems.length === 0 ? "no problems" : `${problems.length} problems`}`);
  problems.forEach((problem, index) => console.log(`  ${index + 1}. ${problem}`));
  return problems.length;
}

const draft = {
  "index.html": "<h1>Student Directory</h1>",
  "app.js": "function render() {}",
  "sia_tests.js": "test('works', () => {});",
  "README.md": "A student directory.",
  "config.js": "const password = 'admin123';",
};
const readme = [
  "Student Information Application",
  "## How to run",
  "Open index.html in a browser.",
  "## Database",
  "Run schema.sql in SQLite to create the four tables.",
  "## Tests",
  "Run node sia_tests.js and expect every test to pass.",
].join("\n");
const release = {
  "index.html": draft["index.html"],
  "app.js": draft["app.js"],
  "sia_tests.js": draft["sia_tests.js"],
  "README.md": readme,
  "schema.sql": "CREATE TABLE students (student_id INTEGER PRIMARY KEY, name TEXT NOT NULL);",
  ".gitignore": "node_modules/\n.env\n",
};

report("Release check of the first draft", draft);
const left = report("Release check of the final package", release);
console.log(passed === results.length && left === 0 ? "\nReady to ship: yes" : "\nReady to ship: no");
```

```output
validateStudent
  PASS  accepts a valid student
  PASS  refuses an empty name
  PASS  refuses a malformed e-mail address
  PASS  refuses a used e-mail address, ignoring capitals
  PASS  accepts the lowest and the highest grade
  PASS  refuses the grades just outside the range
filterStudents
  PASS  an empty filter keeps everybody
  PASS  ignores capitals in the name
  PASS  combines name and grade
validateScore
  PASS  accepts a typical score
  PASS  accepts the lowest and the highest score
  PASS  refuses -1 and 101
  PASS  refuses a fraction
  PASS  refuses text and NaN
average
  PASS  averages real scores
  PASS  ignores missing scores
  PASS  is null when nothing is marked
  PASS  rounds to one decimal
canEnrol
  PASS  accepts a student when a seat is free
  PASS  refuses a student who is in the course already
  PASS  refuses a student when the course is full
  PASS  checks the duplicate before the seats

22 of 22 tests passed

Release check of the first draft: 5 files, 6 problems
  1. missing file schema.sql
  2. missing file .gitignore
  3. README.md has no "How to run" section
  4. README.md has no "Database" section
  5. README.md has no "Tests" section
  6. config.js may contain a secret
Release check of the final package: 6 files, no problems

Ready to ship: yes
```

**Differentiation.** Support: give the test runner and one finished group; students write the other groups from the boundary table. Stretch: a GitHub Actions workflow, a CHANGELOG with the version decision, and tests for the page code with a library such as Jest.

**Discussion questions (not for the student quiz).** Why is the failing test the most valuable moment of test-driven development? What would you lose if every commit were called "update"? When is it better to fix a bug first and write the test afterwards?
