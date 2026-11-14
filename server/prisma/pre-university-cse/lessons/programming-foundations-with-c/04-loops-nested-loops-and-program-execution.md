# Lumexa Mission Log: Programming Foundations with C

**Course/Path:** Programming Foundations with C
**Lesson:** 04 of 08
**Title:** Loops, Nested Loops and Program Execution
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** C (gcc)

---

## Mission Brief

Your SRMS can grade one student. A school has hundreds. Typing the program once per student is absurd, and copying the code 300 times is worse. The whole point of a computer is that it can repeat a task a million times without getting bored, and the tool for that is the **loop**.

Loops are where programs start to feel powerful, and where beginners meet their first really strange bugs: programs that never stop, that stop one step too early, or that skip the last student. In this lesson you will learn C's three loops, `while`, `do-while` and `for`, how to put one loop inside another, and how to **trace** a program by hand so that you always know exactly what it is doing. You will use them to give the SRMS a menu and to process a whole class.

## Learning Objectives

1. Write `while`, `do-while` and `for` loops and choose the right one for a task.
2. Identify the initialisation, condition and update of any loop and trace its execution with a trace table.
3. Use counters, accumulators and sentinel values to total, count and find the largest of many inputs.
4. Use `break` and `continue` correctly, and recognise and fix infinite loops and off-by-one errors.
5. Write nested loops to print tables and patterns, and predict how many times the inner body runs.
6. Build a menu-driven SRMS that processes a whole class of students.

## Prerequisites

- Lesson 3: `if`/`else`, `&&`/`||`, `switch` and the grade and pass rules.
- Lesson 2: variables, `scanf`, `printf` and arithmetic.

## Concept Explanation

### Why loops?

A **loop** repeats a block of statements while a condition is true. Without loops, printing the numbers 1 to 100 needs a hundred `printf` lines; with a loop it needs three. Loops also make a program **flexible**: the number of repeats can depend on the data, such as the number of students typed in.

Every well-behaved loop has three parts:

1. **Initialisation**: set the starting value of the loop variable.
2. **Condition**: test, before each repeat, whether to go on.
3. **Update**: change the loop variable so the condition will eventually become false.

If the update is missing or goes the wrong way, the loop never ends: an **infinite loop**.

### The while loop

`while` tests the condition **first**. If it is false at the start, the body never runs:

```c
int n = 3;
while (n > 0) {
    printf("%d\n", n);
    n--;
}
```

Use `while` when you do not know in advance how many repeats there will be, for example "keep reading marks until the user types -1".

### The do-while loop

`do-while` runs the body **first** and tests afterwards, so it always runs **at least once**. It is the natural choice for menus and for input validation, where you must ask before you can check:

```c
int mark;
do {
    printf("Enter a mark (0-100):\n");
    scanf("%d", &mark);
} while (mark < 0 || mark > 100);
```

Notice the semicolon after the closing condition: `do-while` is the only loop that needs one.

### The for loop

`for` packs the three loop parts into one line, which makes it ideal when you know the number of repeats:

```c
for (int i = 1; i <= 5; i++) {
    printf("%d ", i);
}
```

The parts run in this order: initialisation once (`int i = 1`), then condition (`i <= 5`), body, update (`i++`), condition again, body, update… until the condition is false. Declaring the variable inside the `for` (`int i = 1`) is allowed since the C99 standard and limits its **scope** to the loop.

| Use this | When |
|---|---|
| `for` | you know how many times to repeat ("for each of 30 students") |
| `while` | you repeat until something happens and may not run at all |
| `do-while` | the body must run at least once (menus, validation) |

### Counters, accumulators and sentinels

Three patterns appear in almost every program:

- A **counter** counts how many times something happens: `passed++;`
- An **accumulator** builds a running total: `sum += mark;`
- A **sentinel** is a special value that means "stop", such as -1 after the last mark. It must be a value that can never be real data.

Create counters and accumulators **before** the loop (usually at 0), update them **inside**, and use them **after**. To find the largest value, start with a value smaller than any real one (or with the first value) and replace it whenever you see something bigger.

### break and continue

- `break` leaves the loop immediately.
- `continue` skips the rest of this repeat and jumps to the next one.

```c
for (int i = 1; i <= 6; i++) {
    if (i % 2 == 0) continue;   // skip even numbers
    if (i == 5) break;          // stop completely at 5
    printf("%d ", i);           // prints 1 3
}
```

Use them sparingly: a loop with a clear condition is easier to understand than one with several exits.

### Nested loops

A loop inside a loop is a **nested loop**. For every single pass of the **outer** loop, the **inner** loop runs completely. If the outer loop runs 3 times and the inner loop runs 4 times, the inner body runs 3 × 4 = 12 times. Nested loops are the tool for tables, grids and patterns:

```c
for (int row = 1; row <= 3; row++) {
    for (int col = 1; col <= 4; col++) {
        printf("* ");
    }
    printf("\n");      // after each row, start a new line
}
```

### Program execution: following the flow of control

Every program is a path of execution through three basic structures: **sequence** (one statement after another), **selection** (`if`/`switch` choose a path) and **iteration** (loops repeat a path). To understand any program, you must be able to follow that path as the computer does. The reliable way is a **trace table**: one column per variable and one row per step. Tracing before you run is called a **dry run**, and it finds bugs that testing can miss.

| Step | i | sum | Action |
|---|---|---|---|
| start | | 0 | `sum = 0` |
| 1 | 1 | 1 | `sum += 1` |
| 2 | 2 | 3 | `sum += 2` |
| 3 | 3 | 6 | `sum += 3`, then `i++` makes `i` 4 and `i <= 3` is false: the loop ends |

### Infinite loops and off-by-one errors

An **infinite loop** never ends, usually because the update is missing (`while (i < 3)` with no `i++`) or moves the wrong way. Stop a runaway program with **Ctrl + C**. An **off-by-one error** repeats once too often or once too few, almost always because of `<` versus `<=`, or counting from 0 versus 1. The cure is the trace table with the *first* and *last* values filled in.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Loop** | A statement that repeats a block while a condition is true. |
| **Iteration** | One pass through the body of a loop. |
| **Loop variable** | A variable that controls a loop, such as `i`. |
| **Counter** | A variable that counts how many times something happens. |
| **Accumulator** | A variable that builds up a running total. |
| **Sentinel** | A special input value that tells the program to stop reading. |
| **Nested loop** | A loop placed inside the body of another loop. |
| **Infinite loop** | A loop whose condition never becomes false. |
| **Off-by-one error** | Repeating one time too many or too few. |
| **Trace table** | A table that records every variable at every step of a hand run. |
| **Control flow** | The order in which statements are executed. |

## Worked Examples

### Example 1: A for loop with an accumulator

```c
#include <stdio.h>

int main(void)
{
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        sum += i;
        printf("i = %d, sum = %d\n", i, sum);
    }
    printf("Total: %d\n", sum);
    return 0;
}
```

```output
i = 1, sum = 1
i = 2, sum = 3
i = 3, sum = 6
i = 4, sum = 10
i = 5, sum = 15
Total: 15
```

1. `sum` is created and set to 0 **before** the loop, so each pass can add to it.
2. The loop runs five times: `i` takes the values 1, 2, 3, 4, 5. When `i` becomes 6 the condition `i <= 5` is false and the loop ends.
3. The last `printf` is outside the loop, so it runs once, after the loop, when the total is complete.
4. Change `i <= 5` to `i < 5` and the loop runs only four times and the total is 10: a classic off-by-one error.

### Example 2: A sentinel loop for any number of marks

How many marks will the teacher type? We do not know, so we use a `while` loop and a sentinel of -1:

```c
#include <stdio.h>

int main(void)
{
    int mark, count = 0, sum = 0, highest = -1;

    printf("Enter marks, -1 to finish:\n");
    scanf("%d", &mark);
    while (mark != -1) {
        count++;
        sum += mark;
        if (mark > highest) {
            highest = mark;
        }
        scanf("%d", &mark);
    }
    if (count > 0) {
        printf("Marks: %d, average: %.2f, highest: %d\n", count, (double)sum / count, highest);
    } else {
        printf("No marks entered.\n");
    }
    return 0;
}
```

```input
72
65
90
-1
```

```output
Enter marks, -1 to finish:
Marks: 3, average: 75.67, highest: 90
```

1. The first `scanf` happens **before** the loop. This is the standard shape of a sentinel loop: read, test, process, read again.
2. Each pass adds to `count` and `sum`, and replaces `highest` when a bigger mark appears. `highest` starts at -1, which is lower than any real mark.
3. When the user types -1, `mark != -1` is false and the loop ends; the sentinel itself is never counted.
4. The `if (count > 0)` check avoids dividing by zero when no marks are entered. Always ask: what if the loop never runs?

### Example 3: Nested loops make a bar chart

Here the outer loop goes through students, and the inner loop draws one star for every 10 marks of the total.

```c
#include <stdio.h>

int main(void)
{
    int totals[3] = {227, 173, 150};
    for (int s = 0; s < 3; s++) {
        printf("S%d |", s + 1);
        for (int k = 0; k < totals[s] / 10; k++) {
            putchar('*');
        }
        printf(" %d\n", totals[s]);
    }
    return 0;
}
```

```output
S1 |********************** 227
S2 |***************** 173
S3 |*************** 150
```

1. `totals[3]` is an **array** of three numbers; you will study arrays in Lesson 6. For now read `totals[s]` as "the total of student s".
2. For student 1, the inner loop runs 22 times (227 / 10 = 22 in integer division), printing 22 stars on one line.
3. After the inner loop finishes, the `printf` adds the number and a newline, and the outer loop moves to the next student.
4. In total the inner body ran 22 + 17 + 15 = 54 times: nested loops multiply work, which is why their cost matters, a theme of Course 3.

## Common Mistakes and Misconceptions

- **Off-by-one.** `for (i = 0; i <= 5; i++)` runs six times, not five. Decide whether you count from 0 or 1 and whether the end value is included, then trace the first and last passes.
- **A semicolon after the loop header.** `for (i = 0; i < 5; i++);` is a loop with an *empty body*; the block after it runs only once. Never put `;` there.
- **Forgetting the update.** `while (i < 5) { printf("x"); }` never ends because `i` never changes. Use Ctrl + C to stop it, then add the update.
- **Using `=` in the condition.** `while (choice = 0)` assigns and the loop never runs. Use `==` or `!=`.
- **Counting the sentinel.** If you process the value `-1` before testing it, it ends up in your total and average. Read the next value *at the bottom* of the loop, as in Example 2.
- **Resetting at the wrong place.** Setting `sum = 0;` *inside* the loop throws the running total away on every pass. Initialise accumulators before the loop.
- **Mixing up outer and inner.** In nested loops, the **inner** loop variable changes fastest. Reusing the same variable name (`i`) for both loops makes the outer loop misbehave.

## Guided Hands-On Activity

**Trace first, then run.** Do each step on paper before the computer.

1. Type Example 1 into your editor, but do not run it. Draw a trace table with columns `i` and `sum` and fill in all five rows by hand.
2. Run it and check every number against your table.
3. Change the loop to count **down** from 5 to 1 (`i--` and `i >= 1`). Predict the output, then run it.
4. Change it to add only the **even** numbers up to 10, once with `continue` and once with `i += 2`. Do both give the same total?
5. Write a nested loop that prints this triangle (use the bar chart as a model):

```text
*
**
***
****
```

6. Deliberately create an infinite loop (leave out the update), run it, and stop it with Ctrl + C. Write down the exact change that fixed it.

## Lesson Project: Class Roster Loop and Menu

### Objective

Upgrade the SRMS from one student to a whole class, controlled by a menu. The program shows a menu and keeps running until the user chooses Exit. It reads the marks of any number of students, validates every mark, grades each student, draws a bar for each total, and can show a summary of the class.

### Requirements

- A **menu loop** (`do-while`) with three options: `1) Enter results for a class`, `2) Show class summary` and `0) Exit`, handled with a `switch`. An invalid choice prints `Please choose 0, 1 or 2.`
- Option 1 asks `How many students?`, then uses a `for` loop to read **three marks** for each student.
- Each mark is **validated** with a `do-while` loop: while the mark is below 0 or above 100, print `  Invalid mark, enter 0-100:` and read again.
- For each student print one line: `S<number> |`, a bar of stars (**one star per 10 marks of the total**), the total and PASS or FAIL (a student passes only if every mark is at least 33).
- Option 2 prints the number of students, how many passed, the **class average** of the totals (two decimals) and the **highest total with that student's number**. If no results were entered it prints `No results entered yet.`

### Instructions

1. Copy `srms_grades.c` to `srms_class.c`. Remove the grade ladder for now; you will bring it back in Lesson 5 as a function.
2. Write the skeleton of the `do-while` menu and the `switch` with the three cases and a `default`. Test that the menu repeats and that 0 ends the program.
3. In case 1, ask for the number of students and write the outer `for` loop.
4. Inside it, write the inner `for` loop for the three marks, with the `do-while` validation around each `scanf`.
5. After the marks, print the student's line with the star bar (an inner `for` loop) and update the class counters: students, passed, sum of totals, and the highest total with its student number.
6. Reset the counters at the **start** of case 1, so a second batch does not add to the first.
7. Implement case 2, including the "no results yet" message, and test with the session below, then with a batch of your own.

### Expected Output

For the input sequence `1`, `3`, `72 65 90`, `85 28 60`, `40 105 50 60`, `2`, `0` (note the invalid mark 105 for student 3) the program prints:

```text
=== SRMS MENU ===
1) Enter results for a class
2) Show class summary
0) Exit
Choice:
How many students?
Student 1 - enter 3 marks:
S1 |********************** 227 PASS
Student 2 - enter 3 marks:
S2 |***************** 173 FAIL
Student 3 - enter 3 marks:
  Invalid mark, enter 0-100:
S3 |*************** 150 PASS

=== SRMS MENU ===
1) Enter results for a class
2) Show class summary
0) Exit
Choice:
Students     : 3
Passed       : 2
Class average: 183.33
Highest total: 227 (student 1)

=== SRMS MENU ===
1) Enter results for a class
2) Show class summary
0) Exit
Choice:
Goodbye!
```

### Hints

1. **Hint 1 (the menu appears once and the program ends).** Check the condition at the bottom: it must be `while (choice != 0);`. Make sure `choice` is declared *before* the `do`.
2. **Hint 2 (the invalid mark is counted).** Put the validation loop around the `scanf`, and add to the total only **after** the loop ends, when the mark is valid.
3. **Hint 3 (the class average is wrong).** Keep the sum of the totals in a `long` (or `int`) accumulator and divide with a cast: `(double)class_sum / count`. Also check that you reset it at the start of option 1.
4. **Hint 4 (the bar has the wrong length).** The number of stars is `total / 10` (integer division). Use `<` in the inner loop: `for (int k = 0; k < total / 10; k++)`.
5. **Hint 5 (stuck on the highest total).** Start `best_total` at -1, then `if (total > best_total) { best_total = total; best_number = s; }` inside the student loop.

### Success Criteria

- [ ] The menu repeats until I choose 0, and any other number gives the "Please choose" message.
- [ ] An invalid mark (such as 105) is rejected and re-asked, and is never added to the total.
- [ ] Each student's line shows a bar of the right length, the total and the right PASS or FAIL.
- [ ] The summary shows the correct number of students, passed students, class average and highest total with the student number.
- [ ] A second run of option 1 starts from zero and does not add to the first batch.
- [ ] Option 2 before any entry prints "No results entered yet."

### Extension Challenge

Add option `3) Print the grade scale` that uses **nested loops** to print a 7-row table of the Bangladesh grade bands with a bar of stars whose length equals the grade point times 4 (A+ = 20 stars). Then add a counter for **how many students failed because of a single subject**, and print it in the summary. Which loop variables does it need, and where must it be reset?

## Lesson Recap

- A loop has an **initialisation**, a **condition** and an **update**; forgetting the update gives an infinite loop.
- Use `for` when you know the count, `while` when you may not run at all, and `do-while` when you must run at least once (menus and validation).
- **Counters**, **accumulators** and **sentinels** are the three patterns behind most loops; initialise before, update inside, use after.
- `break` leaves a loop and `continue` skips to the next pass; a nested loop's inner body runs (outer × inner) times.
- A **trace table** lets you follow the control flow by hand and finds off-by-one errors before you run the code.

## Homework / Extension Mission

Complete `srms_class.c` and test it with at least two batches, including an empty class (0 students) and an invalid mark. Then write `patterns.c` that, using nested loops, prints (a) a right-angled triangle of numbers 1 to 5, (b) a 9 × 9 multiplication table in aligned columns and (c) a pyramid of stars with five rows. For each pattern, write in a comment how many times the inner loop body runs in total. Finally, write a short trace table (in a comment) for the first three passes of your multiplication-table loops.

## Course Project Connection

The **Student Result Management System** is now a real, repeating application: it has a main menu, processes any number of students with validated input, and summarises a class. The menu loop you wrote is the skeleton of the final system, and in Lesson 8 every menu option will call a proper function. In Lesson 5 you will rebuild this program from reusable functions so that it stops being one long block of code.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 5 minutes: ask how many times the class would have to run a result program. 25 minutes: the three loops, counters/accumulators/sentinels, nested loops and tracing, drawing trace tables on the board. 10 minutes: the activity. 20 minutes: the project, with the rest at home.

**Live demonstrations.** Trace Example 1 on the board *before* running it. Then write `i <= 5` as `i < 5` and let students see the off-by-one. Create an infinite loop and stop it with Ctrl + C so that students are never afraid of it.

**Misconceptions.** "A `for` loop checks its condition at the end" (the condition is checked first). "`break` ends the program" (it ends only the loop). "Two loops can share a variable `i`."

**Reference solution `srms_class.c`:**

```c
#include <stdio.h>

#define SUBJECTS 3
#define PASS_MARK 33

int main(void)
{
    int choice;
    int count = 0;
    int passed = 0;
    int best_total = -1;
    int best_number = 0;
    long class_sum = 0;

    do {
        printf("\n=== SRMS MENU ===\n");
        printf("1) Enter results for a class\n");
        printf("2) Show class summary\n");
        printf("0) Exit\n");
        printf("Choice:\n");
        scanf("%d", &choice);

        switch (choice) {
            case 1: {
                int n;
                printf("How many students?\n");
                scanf("%d", &n);
                count = 0;
                passed = 0;
                best_total = -1;
                best_number = 0;
                class_sum = 0;
                for (int s = 1; s <= n; s++) {
                    int total = 0;
                    int all_pass = 1;
                    printf("Student %d - enter %d marks:\n", s, SUBJECTS);
                    for (int j = 1; j <= SUBJECTS; j++) {
                        int mark;
                        do {
                            scanf("%d", &mark);
                            if (mark < 0 || mark > 100) {
                                printf("  Invalid mark, enter 0-100:\n");
                            }
                        } while (mark < 0 || mark > 100);
                        total += mark;
                        if (mark < PASS_MARK) {
                            all_pass = 0;
                        }
                    }
                    printf("S%d |", s);
                    for (int k = 0; k < total / 10; k++) {
                        putchar('*');
                    }
                    printf(" %d %s\n", total, all_pass ? "PASS" : "FAIL");
                    count++;
                    class_sum += total;
                    if (all_pass) {
                        passed++;
                    }
                    if (total > best_total) {
                        best_total = total;
                        best_number = s;
                    }
                }
                break;
            }
            case 2:
                if (count == 0) {
                    printf("No results entered yet.\n");
                } else {
                    printf("Students     : %d\n", count);
                    printf("Passed       : %d\n", passed);
                    printf("Class average: %.2f\n", (double)class_sum / count);
                    printf("Highest total: %d (student %d)\n", best_total, best_number);
                }
                break;
            case 0:
                printf("Goodbye!\n");
                break;
            default:
                printf("Please choose 0, 1 or 2.\n");
        }
    } while (choice != 0);
    return 0;
}
```

```input
1
3
72 65 90
85 28 60
40 105 50 60
2
0
```

```output
=== SRMS MENU ===
1) Enter results for a class
2) Show class summary
0) Exit
Choice:
How many students?
Student 1 - enter 3 marks:
S1 |********************** 227 PASS
Student 2 - enter 3 marks:
S2 |***************** 173 FAIL
Student 3 - enter 3 marks:
  Invalid mark, enter 0-100:
S3 |*************** 150 PASS

=== SRMS MENU ===
1) Enter results for a class
2) Show class summary
0) Exit
Choice:
Students     : 3
Passed       : 2
Class average: 183.33
Highest total: 227 (student 1)

=== SRMS MENU ===
1) Enter results for a class
2) Show class summary
0) Exit
Choice:
Goodbye!
```

Note the compound statement braces `case 1: { ... }`: a `case` that declares variables needs its own block. Mention this only if a student asks.

**Differentiation.** Support: give the menu skeleton and the student-loop skeleton. Stretch: ask students to read marks until a sentinel (-1) instead of asking for the number of students, and to explain which design is more convenient for a teacher.

**Discussion questions (not for the student quiz).** Why is a `do-while` right for validation but a `for` right for "each student"? How would you tell a hundred-thousand-student version of this program from a slow one? (A preview of Big O in Course 3.)
