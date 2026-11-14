# Lumexa Mission Log: Programming Foundations with C

**Course/Path:** Programming Foundations with C
**Lesson:** 05 of 08
**Title:** Functions, Parameters, Scope and Modular Programming
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** C (gcc)

---

## Mission Brief

Remember the grade ladder in Lesson 3? You wrote it, then copied it two more times and changed the variable names. If the school changes the pass mark from 33 to 40, you must find and fix three places, and if you miss one, the program quietly gives different students different rules. Copying code is how bugs multiply.

Professional programmers follow a simple rule: **write it once, give it a name, and use the name**. That named, reusable piece of code is a **function**. You have been using functions since Lesson 1 (`printf` and `scanf` are functions that someone else wrote). Today you learn to write your own, to pass information into them and get answers back, to understand where a variable lives and dies, and to split a program into **modules**. Your SRMS will shrink, become easier to read, and become possible to extend into the final system.

## Learning Objectives

1. Define and call functions with parameters and return values, and write function prototypes.
2. Explain the difference between parameters and arguments, and between `void` and value-returning functions.
3. Explain **pass by value** and predict what a function can and cannot change.
4. Distinguish local, global and block **scope**, and explain a variable's lifetime.
5. Trace a recursive function and explain how the **call stack** grows and shrinks.
6. Split a program into several well-named functions and describe how header files support modular programming.

## Prerequisites

- Lesson 4: loops, menus and tracing with a trace table.
- Lesson 3: the grade ladder and pass rule you will now turn into functions.

## Concept Explanation

### Why functions?

A **function** is a named block of code that performs one job. Functions give a program four big advantages:

- **Reuse**: write the logic once, use it everywhere.
- **Readability**: `grade_point(mark)` says what is happening; fifteen lines of `else if` do not.
- **Testing**: a small function can be tested on its own with known inputs.
- **Teamwork**: different people can write different functions and combine them.

### Anatomy of a function

```c
double average_of(int total, int subjects)    // header: return type, name, parameters
{
    return (double)total / subjects;          // body: the work, and the value sent back
}
```

- The **return type** (`double`) says what kind of value comes back. A function that sends back nothing has the type **`void`**.
- The **name** should be a verb or a question that says what it does: `grade_point`, `is_valid_mark`.
- The **parameters** (`int total, int subjects`) are the inputs, with their types.
- `return` sends a value back to the caller and ends the function immediately.

To **call** a function, write its name with the **arguments** in brackets: `average_of(227, 3)`. The word *parameter* is the variable in the function's definition; the word *argument* is the actual value you pass when you call it.

### Prototypes: declaring before use

The compiler reads a file from top to bottom, so it must know about a function **before** it sees a call. Either define the function above `main`, or put a **prototype** (just the header followed by `;`) near the top and the definition anywhere below:

```c
double average_of(int total, int subjects);     // prototype

int main(void)
{
    printf("%.2f\n", average_of(227, 3));       // the compiler already knows the types
    return 0;
}

double average_of(int total, int subjects)      // definition
{
    return (double)total / subjects;
}
```

### Pass by value

When you call a function, C **copies** each argument into the parameter. The function works on its own copies, so changing a parameter inside the function never changes the caller's variable. This is called **pass by value**. It is why `printf` can never accidentally change your marks, and it is also why a function cannot, by itself, change two variables of its caller (like a `swap`). In Lesson 7 you will see how pointers solve that.

### Scope and lifetime

**Scope** is the part of the program where a name can be used.

- A **local variable** (declared inside a function) exists only in that function. Two functions can each have a variable called `total` without any clash.
- A **block** variable (declared inside `{ }`, for example in a loop) exists only in that block.
- A **global variable** (declared outside every function) can be used everywhere, which sounds convenient and is usually a trap: any function can change it, so a bug can be anywhere. Prefer parameters and return values.

**Lifetime** is how long a variable exists. A local variable is created when the function is called and destroyed when it returns, so its value is **not remembered** from one call to the next, unless it is declared `static`.

### Recursion and the call stack

A function may call **itself**. This is **recursion**, and it works when each call solves a smaller version of the same problem and there is a **base case** that stops it:

```c
int factorial(int n)
{
    if (n <= 1) {
        return 1;                 // base case
    }
    return n * factorial(n - 1);  // smaller problem
}
```

Every call gets its own **stack frame** holding its parameters and local variables. The frames are stacked on top of each other, and each is removed when its call returns. The call stack below shows `factorial(3)` going down to the base case and then returning back up. Recursion is a major topic of Course 3.

### Modular programming and header files

A **module** is a group of related functions kept in its own file. C programs are usually split into **source files** (`.c`, the definitions) and **header files** (`.h`, the prototypes). A header is a contract: it tells other files *what* a module offers without showing *how*.

```c
/* srms_grades.h */
#ifndef SRMS_GRADES_H
#define SRMS_GRADES_H
double grade_point(int mark);
int has_passed(int a, int b, int c);
#endif
```

Other files write `#include "srms_grades.h"` (with quotation marks for your own headers). The `#ifndef` lines are an **include guard** that stops the header being included twice. You compile several files together with one command, for example `gcc main.c srms_grades.c -o srms`.

### Designing good functions

- One function, **one job**. If you need the word "and" to describe it, split it.
- Keep it short enough to read without scrolling.
- Choose names that read like English: `if (is_valid_mark(m))`.
- Decide what comes in (parameters) and what goes out (the return value) *before* you write the body.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Function** | A named, reusable block of code that performs one job. |
| **Parameter** | A variable in a function's definition that receives a value. |
| **Argument** | The actual value passed to a function when it is called. |
| **Return value** | The result a function sends back with `return`. |
| **Prototype** | A declaration of a function's name, parameters and return type, ending in `;`. |
| **Pass by value** | Passing a copy of an argument, so the function cannot change the original. |
| **Scope** | The part of a program where a name can be used. |
| **Local variable** | A variable that exists only inside the function or block that declares it. |
| **Global variable** | A variable declared outside every function. |
| **Recursion** | A function calling itself on a smaller problem until a base case is reached. |
| **Call stack** | The stack of frames, one per active function call. |
| **Header file** | A `.h` file that lists the prototypes of a module. |

## Worked Examples

### Example 1: From a ladder to a function

The grade ladder from Lesson 3 becomes a function that is written once and called as many times as needed:

```c
#include <stdio.h>

#define PASS_MARK 33

double grade_point(int mark)
{
    if (mark >= 80) return 5.0;
    if (mark >= 70) return 4.0;
    if (mark >= 60) return 3.5;
    if (mark >= 50) return 3.0;
    if (mark >= 40) return 2.0;
    if (mark >= PASS_MARK) return 1.0;
    return 0.0;
}

int main(void)
{
    printf("72 -> %.2f\n", grade_point(72));
    printf("33 -> %.2f\n", grade_point(33));
    printf("28 -> %.2f\n", grade_point(28));
    return 0;
}
```

```output
72 -> 4.00
33 -> 1.00
28 -> 0.00
```

1. The function takes one `int` and returns a `double`.
2. Each `return` leaves the function at once, so no `else` is needed: if the first test is true we never reach the others.
3. `main` calls it three times with different arguments. The ladder exists **once**; a change to the scale is made in one place.
4. Calling `grade_point(72)` is a **copy** of 72 going into `mark`; nothing in `main` can be changed by it.

### Example 2: Pass by value in action

```c
#include <stdio.h>

void try_to_change(int mark)
{
    mark = 99;
    printf("inside the function: %d\n", mark);
}

int main(void)
{
    int mark = 5;
    try_to_change(mark);
    printf("back in main: %d\n", mark);
    return 0;
}
```

```output
inside the function: 99
back in main: 5
```

1. `main` has a variable `mark` (5). Calling `try_to_change(mark)` copies the **value** 5 into the function's own `mark`.
2. The function changes *its* copy to 99 and prints it.
3. When the function returns, its copy is destroyed. `main`'s `mark` was never touched, so it is still 5. Both variables are called `mark`, but they are different variables in different scopes.
4. If you want a function to hand a value back, **return it**: `mark = fix_mark(mark);`.

### Example 3: Recursion and the call stack

```c
#include <stdio.h>

int factorial(int n)
{
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main(void)
{
    printf("factorial(5) = %d\n", factorial(5));
    return 0;
}
```

```output
factorial(5) = 120
```

1. `factorial(5)` needs `factorial(4)`, which needs `factorial(3)`, and so on down to `factorial(1)`, which returns 1 (the base case). Five frames are on the stack at the deepest point.
2. Then the answers come back up: `2 * 1 = 2`, `3 * 2 = 6`, `4 * 6 = 24`, `5 * 24 = 120`.
3. Without the base case the function would call itself forever, filling the stack until the program crashes (a **stack overflow**).

## Common Mistakes and Misconceptions

- **Expecting a function to change the caller's variable.** Because arguments are copied, `swap(a, b)` written with plain `int` parameters swaps only the copies. Return the new value or wait for pointers in Lesson 7.
- **Forgetting the return.** A function that promises an `int` but has a path with no `return` gives a garbage value (and the compiler warns). Make sure every path returns.
- **Calling before declaring.** Using a function above its definition, with no prototype, causes a warning or an error. Add the prototype or move the definition up.
- **Mismatched arguments.** `grade_point()` with no argument, or `grade_point(72, 3)` with two, is an error. The call must match the parameters in number, order and type.
- **Ignoring the returned value.** Writing `grade_point(72);` on its own calculates and throws the answer away. Store it or print it.
- **Overusing globals.** A global variable can be changed by any function, so bugs are hard to find. Pass what a function needs as parameters.
- **A recursive function with no base case.** It never stops and crashes with a stack overflow. Always write the base case first.
- **Confusing parameter and argument.** The *parameter* is in the definition; the *argument* is in the call.

## Guided Hands-On Activity

**Build a toolbox of tiny functions.** Work with your teacher, testing each function before moving on.

1. Create `toolbox.c`. Write `int square(int n)` that returns `n * n`, and call it from `main` with 5, -3 and 0.
2. Write `int is_even(int n)` that returns 1 when `n` is even and 0 otherwise, using `%`. Test with 4 and 7.
3. Write `int larger(int a, int b)`. Then write `int largest_of_three(int a, int b, int c)` that **calls** `larger` twice instead of repeating the comparison.
4. Add a prototype for each function above `main` and move the definitions below `main`.
5. Write `void print_line(int length)` that prints that many `=` characters and a newline. Use it to underline a heading.
6. Add `int factorial(int n)` (recursive) and print `factorial(6)`. Then trace by hand the frames for `factorial(3)` on paper.
7. Experiment: write a function that tries to change its parameter and prove, by printing in `main`, that the caller's variable is unchanged.

## Lesson Project: Refactor SRMS into Functions

### Objective

Rebuild the Lesson 3 result slip with **functions**, so that the grade logic is written once, every part of the program has a clear name, and `main` reads like the algorithm you drew in Lesson 1. The behaviour must not change: for the same input the new program prints exactly the same slip. This is called **refactoring**.

### Requirements

- Write these functions, each doing **one** job: `is_valid_mark(int mark)`, `grade_point(int mark)`, `grade_letter(int mark)`, `grade_sign(int mark)`, `has_passed(int a, int b, int c)`, `gpa_of(int a, int b, int c)` and `print_subject(char label[], int mark)`.
- The grade ladder must exist **once** (inside `grade_point`, `grade_letter` and `grade_sign`), not three times.
- `main` must only read input, validate it by calling `is_valid_mark`, call the functions, and print: no grade logic inside `main`.
- Put a **prototype** for every function above `main` and the definitions below it.
- For Anika (72, 65, 90) and Rafi (85, 28, 60) the slip must be **identical** to the Lesson 3 slip.

### Instructions

1. Copy `srms_grades.c` to `srms_funcs.c`. Keep the old file: you will compare outputs.
2. Write the prototypes first (just the headers followed by `;`). This is your plan for the design.
3. Write `is_valid_mark` and use it in `main`. Test that 105 and -1 are rejected.
4. Turn the ladder into `grade_point`. Test it with the boundary marks 80, 79, 70, 60, 50, 40, 33 and 32.
5. Write `grade_letter` and `grade_sign` the same way (the letter A covers 60 and above; the sign `+` is for 80 and above, `-` for 60 to 69, otherwise a space).
6. Write `has_passed`, then `gpa_of` that **calls** `has_passed` and `grade_point` (no repeated logic).
7. Write `print_subject` so one call prints one subject line, and call it three times from `main`.
8. Run both programs with the same inputs and compare the output line by line.

### Expected Output

For the input `Anika` and `72 65 90`, the output is identical to Lesson 3:

```text
Enter the student's name:
Enter marks in Bangla, English and Math:

===== SRMS RESULT SLIP =====
Name    : Anika
Bangla  :  72  A   4.00
English :  65  A-  3.50
Math    :  90  A+  5.00
Total   : 227
Average : 75.67
GPA     : 4.17
Result  : PASS
```

For `Rafi` and `85 28 60` the Result is `FAIL`, the English line shows `F` with `0.00`, and the GPA is `0.00`.

### Hints

1. **Hint 1 (the compiler says "implicit declaration").** A function is used before the compiler has seen it. Add its prototype above `main`.
2. **Hint 2 (a grade is wrong at a boundary).** Test each function alone with a tiny `main` before connecting them. Check `>=` against `>` at 80, 70, 60, 50, 40 and 33.
3. **Hint 3 (the sign column is misaligned).** `grade_sign` must return a space `' '` (not an empty value) when there is no `+` or `-`, so `%c%c` always prints two characters.
4. **Hint 4 (the GPA of a failing student is not zero).** `gpa_of` must call `has_passed` first and `return 0.0;` if it fails, before adding any grade points.
5. **Hint 5 (a text parameter).** `print_subject` receives a word in a parameter written `char label[]`. You will see exactly how this works in Lessons 6 and 7; for now use it with `%s`.

### Success Criteria

- [ ] There are seven functions, each with one job and a prototype above `main`.
- [ ] No grade or pass logic remains in `main`.
- [ ] The ladder exists once per function, and changing `PASS_MARK` is a one-line change.
- [ ] The output for Anika and Rafi is identical to the Lesson 3 program, line for line.
- [ ] Each function was tested on its own with boundary values before being combined.
- [ ] The program compiles with `gcc -Wall` and no warnings.

### Extension Challenge

Split the program into **modules**: put the seven function prototypes in `srms_grades.h` (with an include guard), the definitions in `srms_grades.c`, and keep only `main` in `main.c`. Compile with `gcc main.c srms_grades.c -o srms`. Then change the pass mark in the one place it is defined and prove that the whole program changes. What would have happened to the Lesson 3 version?

## Lesson Recap

- A **function** has a return type, a name, parameters and a body; `return` sends a value back and `void` means nothing is returned.
- A **prototype** lets you call a function before its definition; the **parameter** is in the definition and the **argument** is in the call.
- **Pass by value** copies arguments, so a function cannot change its caller's variables; **return** the result instead.
- A **local** variable exists only inside its function or block; avoid **globals**.
- **Recursion** needs a base case; each call adds a frame to the **call stack**, which unwinds as the calls return.
- **Modules** and header files split a program into well-named, reusable parts.

## Homework / Extension Mission

Finish `srms_funcs.c` and its comparison with the Lesson 3 version. Then write `stats.c` with functions `int sum_of_three(int a, int b, int c)`, `int max_of_three(...)`, `int min_of_three(...)`, `double mean_of_three(...)` and `int range_of_three(...)` (largest minus smallest), each calling an earlier function where it makes sense. Write a `main` that reads three marks and prints the five statistics, and list at least six test cases, including all-equal marks. Finally, in a comment, explain in two sentences why `swap(int a, int b)` cannot swap the caller's variables, and what you would need to change.

## Course Project Connection

Your **Student Result Management System** is now modular. The grade rules live in functions you can test, read and change in one place, and `main` reads like the algorithm from Lesson 1. This is the structure of the finished system: in Lesson 6 you will store many students in arrays and call these same functions for each one, and in Lesson 8 every menu option will be a function. Keep `srms_funcs.c` safe; it is the code you will build on.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 5 minutes: show the three copies of the ladder and ask what happens if the pass mark changes. 25 minutes: anatomy, prototypes, pass by value, scope, recursion. 10 minutes: the toolbox activity. 20 minutes: the refactoring project.

**Live demonstrations.** Run the pass-by-value example and let students predict the second line. Draw the call stack for `factorial(3)` on the board as boxes stacking up and then being removed. Rename the parameter and show the program still works (parameter names are private to the function).

**Misconceptions.** "A function with a parameter called `mark` changes the `mark` in `main`." "`return` only appears at the end." "Recursion is magic"; stress base case plus smaller problem.

**Reference solution `srms_funcs.c`:**

```c
#include <stdio.h>

#define PASS_MARK 33

int is_valid_mark(int mark);
double grade_point(int mark);
char grade_letter(int mark);
char grade_sign(int mark);
int has_passed(int a, int b, int c);
double gpa_of(int a, int b, int c);
void print_subject(char label[], int mark);

int main(void)
{
    char name[30];
    int m1, m2, m3, total;

    printf("Enter the student's name:\n");
    scanf("%29s", name);
    printf("Enter marks in Bangla, English and Math:\n");
    scanf("%d %d %d", &m1, &m2, &m3);

    if (!is_valid_mark(m1) || !is_valid_mark(m2) || !is_valid_mark(m3)) {
        printf("Invalid mark: marks must be between 0 and 100.\n");
        return 1;
    }
    total = m1 + m2 + m3;

    printf("\n===== SRMS RESULT SLIP =====\n");
    printf("%-8s: %s\n", "Name", name);
    print_subject("Bangla", m1);
    print_subject("English", m2);
    print_subject("Math", m3);
    printf("%-8s: %d\n", "Total", total);
    printf("%-8s: %.2f\n", "Average", (double)total / 3.0);
    printf("%-8s: %.2f\n", "GPA", gpa_of(m1, m2, m3));
    printf("%-8s: %s\n", "Result", has_passed(m1, m2, m3) ? "PASS" : "FAIL");
    return 0;
}

int is_valid_mark(int mark)
{
    return mark >= 0 && mark <= 100;
}

double grade_point(int mark)
{
    if (mark >= 80) return 5.0;
    if (mark >= 70) return 4.0;
    if (mark >= 60) return 3.5;
    if (mark >= 50) return 3.0;
    if (mark >= 40) return 2.0;
    if (mark >= PASS_MARK) return 1.0;
    return 0.0;
}

char grade_letter(int mark)
{
    if (mark >= 60) return 'A';
    if (mark >= 50) return 'B';
    if (mark >= 40) return 'C';
    if (mark >= PASS_MARK) return 'D';
    return 'F';
}

char grade_sign(int mark)
{
    if (mark >= 80) return '+';
    if (mark >= 60 && mark < 70) return '-';
    return ' ';
}

int has_passed(int a, int b, int c)
{
    return a >= PASS_MARK && b >= PASS_MARK && c >= PASS_MARK;
}

double gpa_of(int a, int b, int c)
{
    if (!has_passed(a, b, c)) {
        return 0.0;
    }
    return (grade_point(a) + grade_point(b) + grade_point(c)) / 3.0;
}

void print_subject(char label[], int mark)
{
    printf("%-8s: %3d  %c%c %5.2f\n", label, mark, grade_letter(mark), grade_sign(mark), grade_point(mark));
}
```

```input
Anika
72 65 90
```

```output
Enter the student's name:
Enter marks in Bangla, English and Math:

===== SRMS RESULT SLIP =====
Name    : Anika
Bangla  :  72  A   4.00
English :  65  A-  3.50
Math    :  90  A+  5.00
Total   : 227
Average : 75.67
GPA     : 4.17
Result  : PASS
```

Compile it twice (the Lesson 3 file and this one) and compare with `diff` to show students what "refactoring" means: the behaviour is the same and the structure is better.

**Differentiation.** Support: provide the seven prototypes and let students fill in the bodies one at a time. Stretch: ask students to make `grade_point` table-driven (an array of thresholds) after Lesson 6, and to discuss when a global constant is acceptable.

**Discussion questions (not for the student quiz).** Why is it good that `printf` cannot change your variables? When is recursion a poor choice? What would a function named `do_everything` tell you about the author's design?
