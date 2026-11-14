# Lumexa Mission Log: Programming Foundations with C

**Course/Path:** Programming Foundations with C
**Lesson:** 08 of 08
**Title:** Structures, File Handling, Debugging and Project Development
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** C (gcc)

---

## Mission Brief

Your SRMS keeps a student's name in one array, the marks in another and the total in a third. Rename a student, delete one, sort them, and you must keep three arrays in step: forget one and the data is silently wrong. Worse, when you close the program, **everything vanishes**. A result system that forgets its results is not a result system.

This final lesson of the course fixes both problems. A **structure** groups the pieces of one student into a single unit. **File handling** makes the data survive after the program ends. And because a finished program is more than the sum of its parts, you will also learn how professionals **find bugs systematically** and how a larger program is **planned, built and tested step by step**. At the end of the lesson you assemble everything from the past seven lessons into the complete **Student Result Management System**.

## Learning Objectives

1. Define a `struct` and a `typedef`, create arrays of structures and access members with `.` and `->`.
2. Open, write, read and close text files with `fopen`, `fprintf`, `fscanf`, `fgets` and `fclose`, checking for errors.
3. Design a simple file format and save and load a list of records.
4. Apply a systematic debugging method using print statements, compiler warnings, assertions and a debugger.
5. Plan a program from requirements to a function design, and build and test it in small increments.
6. Assemble the complete menu-driven SRMS from the pieces built in this course.

## Prerequisites

- Lesson 7: pointers, `malloc`/`realloc`/`free` and pointer parameters (structures are usually passed by pointer).
- Lessons 1 to 6: the grade functions, loops, menus, strings and arrays you will now combine.

## Concept Explanation

### Structures: one name for related data

A **structure** (`struct`) groups variables of different types under one name. Each variable inside is a **member**:

```c
struct Student {
    int roll;
    char name[30];
    int marks[3];
    int total;
};

struct Student a = {101, "Anika Rahman", {72, 65, 90}, 0};
printf("%s has roll %d\n", a.name, a.roll);   // the dot reaches a member
```

A structure is a **new type** that you design. A `typedef` gives it a shorter name, so you can write `Student` instead of `struct Student`:

```c
typedef struct {
    int roll;
    char name[30];
    int marks[3];
    int total;
} Student;
```

You can make arrays of structures (`Student class_list[40]`), allocate them on the heap (`malloc(n * sizeof(Student))`), and assign one structure to another with `=` (the whole thing is copied, including the arrays inside it).

### Structures and pointers

Passing a big structure by value copies all of it. It is cheaper, and necessary if the function must change it, to pass a **pointer**. To reach a member through a pointer, use the **arrow operator** `->`:

```c
void evaluate(Student *s)
{
    s->total = s->marks[0] + s->marks[1] + s->marks[2];   // same as (*s).total
}
/* call: evaluate(&a); */
```

`s->total` means "the `total` member of the structure that `s` points to". Use `const Student *s` when a function only needs to read.

### Files: data that survives

A **file** stores data on disk. In C you work with a **file pointer** of type `FILE *`:

| Step | Code | Meaning |
|---|---|---|
| Open | `FILE *f = fopen("data.txt", "w");` | `"r"` read, `"w"` write (erases the file), `"a"` append |
| Check | `if (f == NULL) { ... }` | the file may be missing or locked: always test |
| Use | `fprintf(f, ...)`, `fscanf(f, ...)`, `fgets(line, size, f)` | like `printf`, `scanf` and `fgets`, with the file as the first or last argument |
| Close | `fclose(f);` | flushes the data to disk and releases the file |

A text file is human-readable, so you can open it in an editor and see exactly what your program saved. Forgetting `fclose` can lose the last data; forgetting the `NULL` check crashes the program when a file is missing.

### Designing a file format

A program must be able to read back what it wrote, so decide on a **format**. A simple, popular choice is one record per line with a separator that cannot appear in the data, such as `|`:

```text
101|Anika Rahman|72|65|90
102|Rafi Ahmed|85|28|60
```

To read a line back, `sscanf(line, "%d|%29[^|]|%d|%d|%d", ...)` splits it. The pattern `%29[^|]` means "read up to 29 characters that are not a `|`", which allows names with spaces. Only save the **inputs** (roll, name, marks); recalculate the totals and GPA when loading, so the file can never disagree with the grade rules.

### Debugging: a method, not luck

A **bug** is a difference between what you meant and what the program does. Finding it by randomly changing code wastes hours. Use a method:

1. **Reproduce** it with the smallest input that fails, every time.
2. **Read the evidence**: the compiler message, the line number, the exact wrong output.
3. **Form a hypothesis** ("I think the loop skips the last mark") and **test** it, usually by printing the variables: `printf("i=%d sum=%d\n", i, sum);`. This is **print debugging**.
4. **Fix one thing**, then re-run the failing case *and* the earlier tests (a **regression test**).

Powerful helpers: compile with `gcc -Wall -Wextra -g` and read every warning; use `assert(index >= 0 && index < n);` from `<assert.h>` to stop the program at a broken assumption; compile with `-fsanitize=address,undefined` to catch memory and arithmetic errors; and learn a **debugger**. With `gdb` you can `break main`, `run`, `next` (one line), `print sum`, and `backtrace` to see how you got here. Explaining the code aloud to someone (or a rubber duck) is surprisingly effective.

### Project development: from requirements to a working system

Large programs are built in an order that keeps them working:

1. **Requirements**: what must the system do? (Add, list, search, topper, statistics, save, load.)
2. **Design**: choose the data (`Student`, `Roster`) and a function for each job, with its parameters and results, before writing any bodies.
3. **Build incrementally**: write one function, test it alone, and only then add the next. After each step the program should still compile and run.
4. **Test** with normal data, boundary data and bad data (empty class, invalid roll, missing file).
5. **Polish and document**: clear names, comments that say *why*, and a short note on how to use it.

Professional teams add **version control** (such as Git, which you will meet in Course 7) so that every working step is saved and can be restored.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Structure (`struct`)** | A user-defined type that groups variables, called members, under one name. |
| **Member** | One variable inside a structure. |
| **`typedef`** | A declaration that gives an existing type a new name. |
| **Arrow operator (`->`)** | Reaches a member through a pointer to a structure. |
| **File pointer (`FILE *`)** | A handle that represents an open file. |
| **Text file** | A file whose bytes are readable characters. |
| **File format** | The agreed layout of the data inside a file. |
| **Debugging** | Finding and fixing the cause of a bug. |
| **Regression test** | Re-running earlier tests after a change to prove nothing else broke. |
| **Assertion** | A check that stops the program if an assumption is false. |
| **Requirement** | A statement of something the system must do. |
| **Incremental development** | Building a program in small, tested steps. |

## Worked Examples

### Example 1: Structures and the arrow operator

```c
#include <stdio.h>

#define SUBJECTS 3

typedef struct {
    int roll;
    char name[30];
    int marks[SUBJECTS];
} Student;

int total_of(const Student *s)
{
    int t = 0;
    for (int j = 0; j < SUBJECTS; j++) {
        t += s->marks[j];
    }
    return t;
}

int main(void)
{
    Student a = {101, "Anika Rahman", {72, 65, 90}};
    Student list[2] = {a, {102, "Rafi Ahmed", {85, 28, 60}}};

    printf("%d %s %d\n", a.roll, a.name, total_of(&a));
    for (int i = 0; i < 2; i++) {
        printf("%d: %s -> %d\n", list[i].roll, list[i].name, total_of(&list[i]));
    }
    return 0;
}
```

```output
101 Anika Rahman 227
101: Anika Rahman -> 227
102: Rafi Ahmed -> 173
```

1. `Student` is one type holding an int, a string and an array of marks. A **variable** `a` of this type holds them all together.
2. `a.roll` reaches a member of a variable; `s->marks[j]` reaches a member through a pointer. The two forms mean the same.
3. `list` is an array of two students; the first element is a *copy* of `a`. `list[i].name` is the name of student `i`.
4. `total_of` takes a pointer so the whole structure is not copied, and `const` promises it will not change it.

### Example 2: A file round trip

```c
#include <stdio.h>

int main(void)
{
    FILE *out = fopen("demo.txt", "w");
    if (out == NULL) {
        printf("Cannot open the file.\n");
        return 1;
    }
    fprintf(out, "Anika 72 65 90\n");
    fprintf(out, "Rafi 85 28 60\n");
    fclose(out);

    FILE *in = fopen("demo.txt", "r");
    if (in == NULL) {
        printf("Cannot read the file.\n");
        return 1;
    }
    char name[30];
    int a, b, c;
    while (fscanf(in, "%29s %d %d %d", name, &a, &b, &c) == 4) {
        printf("%s: total %d\n", name, a + b + c);
    }
    fclose(in);
    return 0;
}
```

```output
Anika: total 227
Rafi: total 173
```

1. Opening with `"w"` creates the file (or erases an existing one). Both `fopen` calls are checked for `NULL`.
2. `fprintf` works exactly like `printf`, with the file as its first argument.
3. `fscanf` returns the **number of items it read**. The loop continues while it reads 4 values and stops at the end of the file, because it then returns less than 4.
4. Both files are closed. Run the program and open `demo.txt` in an editor to see the data your program wrote.

### Example 3: Debugging a program that gives a wrong answer

This program should print the total and the average of five marks. It compiles without a warning, but the answer is wrong.

```c
#include <stdio.h>

int main(void)
{
    int marks[5] = {72, 65, 90, 41, 58};
    int n = 5;
    int sum = 0;
    for (int i = 0; i < n - 1; i++) {
        sum += marks[i];
    }
    double average = sum / n;
    printf("Total: %d\nAverage: %.2f\n", sum, average);
    return 0;
}
```

```output
Total: 268
Average: 53.00
```

1. **Reproduce and read the evidence.** The correct total is 72 + 65 + 90 + 41 + 58 = 326 and the average is 65.20. The program prints 268 and 53.00: both are wrong.
2. **Hypothesis 1:** a mark is being skipped. 326 − 268 = 58, which is the last mark. Test it by printing inside the loop: `printf("i=%d sum=%d\n", i, sum);` shows `i` going from 0 to 3 only, so the loop ends one pass early. The condition should be `i < n`.
3. **Hypothesis 2:** even with the right total, 326 / 5 would give 65, not 65.20, because both operands are integers (Lesson 2). The fix is a cast.
4. **Fix both, then re-run.** One change at a time, with the failing case checked after each.

```c
#include <stdio.h>

int main(void)
{
    int marks[5] = {72, 65, 90, 41, 58};
    int n = 5;
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += marks[i];
    }
    double average = (double)sum / n;
    printf("Total: %d\nAverage: %.2f\n", sum, average);
    return 0;
}
```

```output
Total: 326
Average: 65.20
```

## Common Mistakes and Misconceptions

- **Using `.` on a pointer, or `->` on a variable.** `s.total` where `s` is a `Student *` fails to compile. Use `->` for pointers and `.` for variables.
- **Forgetting `fclose`.** Data may stay in a buffer and never reach the disk, and you may run out of open files. Close every file you open.
- **Not checking `fopen`.** A missing file returns `NULL`; using it crashes. Always test and print a clear message.
- **Opening with `"w"` by accident.** `"w"` erases the file immediately. To add records, use `"a"`; to read, `"r"`.
- **Saving calculated values.** If you save the GPA and later change the grade rules, the file disagrees with the code. Save the inputs and recalculate.
- **A separator that can appear in the data.** If names could contain `|`, the format breaks. Choose a separator that cannot occur, or forbid it on input.
- **Changing many things at once while debugging.** You will not know which change helped. Change one thing, then test.
- **Assuming "it compiles" means "it works".** The compiler checks grammar, not meaning. Test with known answers and boundary data.
- **Writing the whole program before testing anything.** Build and test one function at a time.

## Guided Hands-On Activity

**Structures, files and a bug hunt.** Work with your teacher.

1. Type Example 1. Add a `double average` member to `Student`, write `void evaluate(Student *s)` that fills `total` and `average` through the pointer, and call it for both students.
2. Type Example 2 and run it. Open `demo.txt` in a text editor and check that its contents match what you expected. Then change the first `fopen` mode to `"a"`, run twice, and explain what happened to the file.
3. Make the program fail on purpose: change the file name in the second `fopen` to a file that does not exist. Does your `NULL` check catch it? What would have happened without the check?
4. Type the **buggy** version of Example 3 and *do not read the explanation*. Find the two bugs yourself with print statements, and write down each hypothesis and the test that confirmed it.
5. Add `#include <assert.h>` and, inside the loop, `assert(i >= 0 && i < 5);`. Then change the loop condition to `i <= n` and run: what does the assertion say?
6. Compile the program with `-fsanitize=address,undefined -g` while the loop reads `i <= n`. Read the report and name the exact kind of error.
7. If your teacher provides `gdb`, start it with `gdb ./a.out`, type `break main`, `run`, then `next` a few times and `print sum` to watch the variable change.

## Lesson Project: SRMS: The Complete System

### Objective

Assemble the finished **Student Result Management System**: a menu-driven C program that stores students as structures in a growing heap array, applies the Bangladesh grade rules, answers questions about the class, and saves to and loads from a file. It uses every idea of the course: variables, decisions, loops, functions, arrays and strings, pointers and dynamic memory, structures and files.

### Requirements

- Use `typedef struct` for `Student` (roll number, name, three marks, total, GPA and a passed flag) and a `Roster` structure that holds a pointer to a heap array, a `count` and a `capacity`.
- Grow the array with `realloc` (start with room for 2 and double when full), check every allocation, and `free` the array before the program ends.
- The menu has these options: `1 Add`, `2 List`, `3 Find`, `4 Topper`, `5 Stats`, `6 Save`, `7 Load` and `0 Exit`, handled with a `switch`, and an invalid choice prints `Please choose a number from 0 to 7.`
- **Add** reads a roll number (positive, not already used), a name with spaces and three marks, validates them (0 to 100) and rejects bad data with a clear message.
- Use the grade rules from Lessons 3 and 5: a student passes only if every mark is at least 33; the GPA is the average of the grade points, or 0.00 for a fail.
- **Save** writes one line per student as `roll|name|m1|m2|m3`; **Load** reads them back and recalculates totals and GPA. Both must report errors if the file cannot be opened.
- Every function has one job and a prototype or a definition above its first use; no function is longer than about 30 lines.

### Instructions

1. **Plan.** On paper, list your functions with their parameters and results: `read_line`, `grade_point`, `evaluate`, `roster_add`, `find_by_roll`, `add_student`, `list_all`, `search_student`, `show_topper`, `show_stats`, `save_roster`, `load_roster`, and `main`.
2. **Step 1.** Write the structures and `evaluate`, and test it with one hard-coded student printed from `main`.
3. **Step 2.** Add `roster_add` with `realloc`, `list_all` and `print_student`. Test by adding three hard-coded students.
4. **Step 3.** Write `add_student` with validation, and the menu loop with `Add`, `List` and `Exit`.
5. **Step 4.** Add `find_by_roll` (returning a pointer or `NULL`), then `Find`, `Topper` and `Stats`.
6. **Step 5.** Write `save_roster` and `load_roster`, using `fprintf` and `fgets` with `sscanf`.
7. **Step 6.** Test with normal data, an empty class, a duplicate roll, an invalid mark and a missing file. Compile with `-Wall -Wextra -fsanitize=address,undefined -g` and fix every report.
8. **Step 7.** Write a five-line `README` comment at the top of the file: what the program does, how to compile it and the input format.

### Expected Output

For this session of menu choices and data (`1`, roll `101`, `Anika Rahman`, `72 65 90`; `1`, roll `102`, `Rafi Ahmed`, `85 28 60`; then `2`, `3` with `102`, `4`, `5`, `6`, `7`, `2`, an invalid `9`, and `0`) the program prints:

```text
SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Roll number:
Name:
Marks (Bangla English Math):
Added Anika Rahman.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Roll number:
Name:
Marks (Bangla English Math):
Added Rafi Ahmed.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Roll  Name           Bangla English Math Total   GPA Result
101   Anika Rahman       72      65   90   227  4.17 PASS
102   Rafi Ahmed         85      28   60   173  0.00 FAIL

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Roll number to find:
Roll  Name           Bangla English Math Total   GPA Result
102   Rafi Ahmed         85      28   60   173  0.00 FAIL

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Topper: Anika Rahman (roll 101) with 227 marks.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Students: 2, passed: 1, failed: 1
Average total: 200.00, highest: 227, lowest: 173

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Saved 2 student(s) to srms_data.txt.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Loaded 2 student(s) from srms_data.txt.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Roll  Name           Bangla English Math Total   GPA Result
101   Anika Rahman       72      65   90   227  4.17 PASS
102   Rafi Ahmed         85      28   60   173  0.00 FAIL

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Please choose a number from 0 to 7.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Goodbye!
```

### Hints

1. **Hint 1 (a crash when adding the third student).** Check `roster_add`: when `count == capacity` you must call `realloc` and store the new pointer. A pointer to an old element (for example one returned by `find_by_roll`) becomes invalid after the array moves.
2. **Hint 2 (the name reads as empty).** A `scanf` left a newline in the input. Read every line with `read_line` and extract numbers with `sscanf`, as in Lesson 6.
3. **Hint 3 (load gives garbage).** Check the `sscanf` pattern: `"%d|%29[^|]|%d|%d|%d"` and that you compare its result with 5. Zero the structure first with `memset(&s, 0, sizeof s);`.
4. **Hint 4 (the GPA differs after loading).** Call `evaluate(&s)` after reading, so the totals and GPA are recalculated from the marks.
5. **Hint 5 (the sanitiser reports a leak).** The array in `Roster` must be freed once, at the end of `main`. A `return` in the middle of `main` must free it too.
6. **Hint 6 (`Find` prints the wrong student).** `find_by_roll` compares the *roll number*, not the position. Print `s->roll` to check.

### Success Criteria

- [ ] All eight menu options work, and an invalid choice gets the right message.
- [ ] Students are stored in a heap array that grows by doubling, and nothing is leaked (a sanitiser run is silent).
- [ ] Marks outside 0 to 100, a duplicate or invalid roll and a missing file are all handled with a clear message and no crash.
- [ ] After Save and Load the list shows exactly the same students, totals, GPAs and results.
- [ ] The grade rules are the Bangladesh rules from Lesson 3: the pass mark is 33 in every subject and a failed student has a GPA of 0.00.
- [ ] Every function has one job, and I tested each one before adding the next.
- [ ] The code compiles with `-Wall -Wextra` with no warnings, and the top of the file explains how to use it.

### Extension Challenge

Add three professional features: **(a)** option `8 Delete a student` that removes a roll number by shifting the later elements down; **(b)** option `9 Sort` that lists students by total, highest first, using a nested loop to swap structures (copy the whole `Student` with `=`); **(c)** a **binary file** format using `fwrite` and `fread` for the whole `Student` array, and a short note comparing it with your text format: which is easier to inspect, and which is faster? Then measure the file sizes for 1,000 students.

## Lesson Recap

- A **structure** groups related data of different types into one new type; use `.` on a variable and `->` on a pointer, and pass big structures by pointer.
- **Files** make data survive: `fopen` (check for `NULL`), `fprintf`/`fscanf`/`fgets`, `fclose`; save the *inputs* in a clear format and recalculate the rest.
- Debug with a **method**: reproduce, read the evidence, form a hypothesis, test it, fix one thing, re-run all tests; use warnings, assertions, sanitisers and a debugger.
- Build large programs **incrementally**: requirements, design, one tested function at a time, then polish and document.
- You can now build a complete C application using variables, decisions, loops, functions, arrays, strings, pointers, dynamic memory, structures and files.

## Homework / Extension Mission

Finish the complete SRMS and give it a final test pass using a written **test plan**: a table of at least twelve cases (a normal student, a failing student, a student with a mark of exactly 33 and 32, an invalid mark, a duplicate roll, an empty class, a missing file, a class of 100 students, and so on) with the expected result of each and a tick when it passes. Then write a one-page **user guide** that explains each menu option. Finally, prepare a three-minute demonstration of your SRMS for the first lesson of the next course, where you will also name the three parts of the program you are proudest of and the one you would redesign.

## Course Project Connection

This lesson **is** the course project: the finished **Student Result Management System using C**. Everything you built across the eight lessons is inside it. The algorithm and flowchart from Lesson 1 became the `evaluate` logic; input and arithmetic from Lesson 2 became `add_student`; the grade ladder from Lesson 3 and the functions from Lesson 5 became `grade_point` and the passed rule; the menu and loops from Lesson 4 became `main`; arrays and strings from Lesson 6 became names and marks; pointers and `realloc` from Lesson 7 became the growing roster; and structures and files from today completed the system. Keep it: you will be asked to present it, and in Course 2 you will rebuild a similar system with classes.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: structures and `->`. 10 minutes: files and the format. 10 minutes: the debugging method and Example 3. 30 minutes: the project, as a guided build in steps; this lesson is the capstone and most of the work continues at home.

**Live demonstrations.** Open `srms_data.txt` in a text editor after saving to show the data. Debug Example 3 live, asking students for hypotheses. Show gdb's `break`, `next` and `print` on the buggy program.

**Misconceptions.** "A structure variable is a pointer." "A file is loaded by `fopen`" (it only opens a handle). "The compiler finds logic errors."

**Assessment of the project.** Mark against the Success Criteria; ask each student to explain one function aloud and to demonstrate a failing input. Look for single-purpose functions, `NULL` checks and a silent sanitiser run.

**Reference solution `srms.c`** (compile with `gcc -std=c11 -Wall -Wextra srms.c -o srms`; it writes `srms_data.txt` in the current folder):

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SUBJECTS 3
#define NAME_LEN 30
#define PASS_MARK 33
#define DATA_FILE "srms_data.txt"

typedef struct {
    int roll;
    char name[NAME_LEN];
    int marks[SUBJECTS];
    int total;
    double gpa;
    int passed;
} Student;

typedef struct {
    Student *items;
    int count;
    int capacity;
} Roster;

static void read_line(char *buf, int size)
{
    if (fgets(buf, size, stdin) == NULL) {
        buf[0] = '\0';
        return;
    }
    buf[strcspn(buf, "\n")] = '\0';
}

static double grade_point(int mark)
{
    if (mark >= 80) return 5.0;
    if (mark >= 70) return 4.0;
    if (mark >= 60) return 3.5;
    if (mark >= 50) return 3.0;
    if (mark >= 40) return 2.0;
    if (mark >= PASS_MARK) return 1.0;
    return 0.0;
}

static void evaluate(Student *s)
{
    double points = 0.0;
    s->total = 0;
    s->passed = 1;
    for (int j = 0; j < SUBJECTS; j++) {
        s->total += s->marks[j];
        points += grade_point(s->marks[j]);
        if (s->marks[j] < PASS_MARK) {
            s->passed = 0;
        }
    }
    s->gpa = s->passed ? points / SUBJECTS : 0.0;
}

static int roster_add(Roster *r, Student s)
{
    if (r->count == r->capacity) {
        int bigger = r->capacity == 0 ? 2 : r->capacity * 2;
        Student *items = realloc(r->items, (size_t)bigger * sizeof *items);
        if (items == NULL) {
            return 0;
        }
        r->items = items;
        r->capacity = bigger;
    }
    r->items[r->count++] = s;
    return 1;
}

static Student *find_by_roll(Roster *r, int roll)
{
    for (int i = 0; i < r->count; i++) {
        if (r->items[i].roll == roll) {
            return &r->items[i];
        }
    }
    return NULL;
}

static void print_header(void)
{
    printf("%-5s %-14s %6s %7s %4s %5s %5s %s\n", "Roll", "Name", "Bangla", "English", "Math", "Total", "GPA", "Result");
}

static void print_student(const Student *s)
{
    printf("%-5d %-14s %6d %7d %4d %5d %5.2f %s\n", s->roll, s->name, s->marks[0], s->marks[1], s->marks[2], s->total,
           s->gpa, s->passed ? "PASS" : "FAIL");
}

static void add_student(Roster *r)
{
    Student s;
    char line[100];
    memset(&s, 0, sizeof s);
    printf("Roll number:\n");
    read_line(line, sizeof line);
    if (sscanf(line, "%d", &s.roll) != 1 || s.roll < 1) {
        printf("Invalid roll number.\n");
        return;
    }
    if (find_by_roll(r, s.roll) != NULL) {
        printf("Roll %d already exists.\n", s.roll);
        return;
    }
    printf("Name:\n");
    read_line(s.name, NAME_LEN);
    printf("Marks (Bangla English Math):\n");
    read_line(line, sizeof line);
    if (sscanf(line, "%d %d %d", &s.marks[0], &s.marks[1], &s.marks[2]) != SUBJECTS) {
        printf("Please enter three numbers.\n");
        return;
    }
    for (int j = 0; j < SUBJECTS; j++) {
        if (s.marks[j] < 0 || s.marks[j] > 100) {
            printf("Invalid mark: marks must be between 0 and 100.\n");
            return;
        }
    }
    evaluate(&s);
    if (roster_add(r, s)) {
        printf("Added %s.\n", s.name);
    } else {
        printf("Out of memory.\n");
    }
}

static void list_all(const Roster *r)
{
    if (r->count == 0) {
        printf("No students yet.\n");
        return;
    }
    print_header();
    for (int i = 0; i < r->count; i++) {
        print_student(&r->items[i]);
    }
}

static void search_student(Roster *r)
{
    char line[100];
    int roll;
    printf("Roll number to find:\n");
    read_line(line, sizeof line);
    if (sscanf(line, "%d", &roll) != 1) {
        printf("Invalid roll number.\n");
        return;
    }
    Student *s = find_by_roll(r, roll);
    if (s == NULL) {
        printf("No student with roll %d.\n", roll);
        return;
    }
    print_header();
    print_student(s);
}

static void show_topper(const Roster *r)
{
    if (r->count == 0) {
        printf("No students yet.\n");
        return;
    }
    int best = 0;
    for (int i = 1; i < r->count; i++) {
        if (r->items[i].total > r->items[best].total) {
            best = i;
        }
    }
    printf("Topper: %s (roll %d) with %d marks.\n", r->items[best].name, r->items[best].roll, r->items[best].total);
}

static void show_stats(const Roster *r)
{
    if (r->count == 0) {
        printf("No students yet.\n");
        return;
    }
    long sum = 0;
    int passed = 0;
    int high = r->items[0].total, low = r->items[0].total;
    for (int i = 0; i < r->count; i++) {
        sum += r->items[i].total;
        passed += r->items[i].passed;
        if (r->items[i].total > high) high = r->items[i].total;
        if (r->items[i].total < low) low = r->items[i].total;
    }
    printf("Students: %d, passed: %d, failed: %d\n", r->count, passed, r->count - passed);
    printf("Average total: %.2f, highest: %d, lowest: %d\n", (double)sum / r->count, high, low);
}

static int save_roster(const Roster *r, const char *path)
{
    FILE *f = fopen(path, "w");
    if (f == NULL) {
        return 0;
    }
    for (int i = 0; i < r->count; i++) {
        const Student *s = &r->items[i];
        fprintf(f, "%d|%s|%d|%d|%d\n", s->roll, s->name, s->marks[0], s->marks[1], s->marks[2]);
    }
    fclose(f);
    return 1;
}

static int load_roster(Roster *r, const char *path)
{
    FILE *f = fopen(path, "r");
    char line[200];
    if (f == NULL) {
        return -1;
    }
    r->count = 0;
    while (fgets(line, sizeof line, f) != NULL) {
        Student s;
        memset(&s, 0, sizeof s);
        line[strcspn(line, "\n")] = '\0';
        if (sscanf(line, "%d|%29[^|]|%d|%d|%d", &s.roll, s.name, &s.marks[0], &s.marks[1], &s.marks[2]) == 5) {
            evaluate(&s);
            roster_add(r, s);
        }
    }
    fclose(f);
    return r->count;
}

int main(void)
{
    Roster roster = {NULL, 0, 0};
    char line[100];
    int choice;

    do {
        printf("\nSRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit\nChoice:\n");
        read_line(line, sizeof line);
        if (sscanf(line, "%d", &choice) != 1) {
            choice = -1;
        }
        switch (choice) {
            case 1: add_student(&roster); break;
            case 2: list_all(&roster); break;
            case 3: search_student(&roster); break;
            case 4: show_topper(&roster); break;
            case 5: show_stats(&roster); break;
            case 6:
                if (save_roster(&roster, DATA_FILE)) {
                    printf("Saved %d student(s) to %s.\n", roster.count, DATA_FILE);
                } else {
                    printf("Could not write %s.\n", DATA_FILE);
                }
                break;
            case 7: {
                int n = load_roster(&roster, DATA_FILE);
                if (n < 0) {
                    printf("Could not open %s.\n", DATA_FILE);
                } else {
                    printf("Loaded %d student(s) from %s.\n", n, DATA_FILE);
                }
                break;
            }
            case 0: printf("Goodbye!\n"); break;
            default: printf("Please choose a number from 0 to 7.\n");
        }
    } while (choice != 0);

    free(roster.items);
    return 0;
}
```

```input
1
101
Anika Rahman
72 65 90
1
102
Rafi Ahmed
85 28 60
2
3
102
4
5
6
7
2
9
0
```

```output
SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Roll number:
Name:
Marks (Bangla English Math):
Added Anika Rahman.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Roll number:
Name:
Marks (Bangla English Math):
Added Rafi Ahmed.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Roll  Name           Bangla English Math Total   GPA Result
101   Anika Rahman       72      65   90   227  4.17 PASS
102   Rafi Ahmed         85      28   60   173  0.00 FAIL

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Roll number to find:
Roll  Name           Bangla English Math Total   GPA Result
102   Rafi Ahmed         85      28   60   173  0.00 FAIL

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Topper: Anika Rahman (roll 101) with 227 marks.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Students: 2, passed: 1, failed: 1
Average total: 200.00, highest: 227, lowest: 173

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Saved 2 student(s) to srms_data.txt.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Loaded 2 student(s) from srms_data.txt.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Roll  Name           Bangla English Math Total   GPA Result
101   Anika Rahman       72      65   90   227  4.17 PASS
102   Rafi Ahmed         85      28   60   173  0.00 FAIL

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Please choose a number from 0 to 7.

SRMS menu: 1 Add | 2 List | 3 Find | 4 Topper | 5 Stats | 6 Save | 7 Load | 0 Exit
Choice:
Goodbye!
```

**Differentiation.** Support: provide the structures, `evaluate`, `roster_add` and `list_all`, and let students build the rest. Stretch: add delete, sort and the binary file, and write a test script that feeds the menu from a file.

**Discussion questions (not for the student quiz).** Why does the program save marks but not totals? What could go wrong if two programs open the same file? How is a `struct` in C different from a `class` you will meet in Course 2?
