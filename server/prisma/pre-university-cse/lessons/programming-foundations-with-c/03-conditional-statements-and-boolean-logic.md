# Lumexa Mission Log: Programming Foundations with C

**Course/Path:** Programming Foundations with C
**Lesson:** 03 of 08
**Title:** Conditional Statements and Boolean Logic
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** C (gcc)

---

## Mission Brief

Your result slip can now add and average, but it cannot *decide*. It prints "75.67" whether the student passed or failed three subjects. Real programs are full of decisions: is the password right, is the mark valid, is there enough balance, did the player win? A program that cannot choose is just a calculator.

In this lesson you give your SRMS a brain. You will learn `if`, `else if` and `else`, the logical operators `&&`, `||` and `!`, and the `switch` statement, and you will use them to turn a mark into a grade and to apply the real Bangladesh rule: a student who fails **any** subject fails the exam. Along the way you will see the **Boolean logic** that every university computer science course builds on, from logic gates to proofs.

## Learning Objectives

1. Write `if`, `if-else` and `else if` statements with correct braces and conditions.
2. Combine conditions with `&&`, `||` and `!` and work out the result with a truth table.
3. Explain how C treats 0 and non-zero as false and true, and avoid the `=` versus `==` bug.
4. Choose between an `else if` ladder and a `switch` statement for a given problem.
5. Validate input (such as a mark outside 0–100) before using it.
6. Convert a mark to a grade and grade point with the Bangladesh scale, and decide pass or fail for the SRMS.

## Prerequisites

- Lesson 2: variables, `int` and `double`, `printf`, `scanf` and relational operators such as `>=`.
- The SRMS pass rule from Lesson 1: a student must score at least 33 in every subject.

## Concept Explanation

### Making a decision with if

A **conditional statement** runs some code only when a **condition** is true. The condition goes in brackets after `if`, and the code to run goes in braces:

```c
if (mark >= 33) {
    printf("Pass\n");
}
```

If `mark >= 33` is true the `printf` runs; otherwise it is skipped. Always use braces, even for a single statement. Leaving them out is legal but is the source of many bugs when someone later adds a second line.

Add an `else` for the opposite case:

```c
if (mark >= 33) {
    printf("Pass\n");
} else {
    printf("Fail\n");
}
```

### Choosing among many: else if

When there are more than two outcomes, chain the tests. C checks them from the top and runs **only the first branch whose condition is true**; the rest are skipped:

```c
if (mark >= 80) {
    printf("A+\n");
} else if (mark >= 70) {
    printf("A\n");
} else if (mark >= 60) {
    printf("A-\n");
} else {
    printf("Below 60\n");
}
```

Order matters. Because the tests run top to bottom, the condition `mark >= 70` is only ever reached when `mark >= 80` was already false, so it does not need to say "and less than 80". If you wrote the ladder from the smallest threshold upward, every mark of 33 or more would match the first test. That is a classic logic error.

### Relational and logical operators

A condition is built from **relational operators** (`<  >  <=  >=  ==  !=`) and combined with **logical operators**:

| Operator | Name | True when | Example |
|---|---|---|---|
| `&&` | AND | both sides are true | `mark >= 33 && mark <= 100` |
| `||` | OR | at least one side is true | `mark < 0 || mark > 100` |
| `!` | NOT | the side is false | `!(mark >= 33)` |

A **truth table** lists every possible combination of inputs and the result. Study the one below; it is the same table you will meet again as logic gates in Course 5 and as propositional logic in Course 4.

C evaluates `&&` and `||` **left to right and stops as soon as the answer is known** (**short-circuit evaluation**). In `a != 0 && 100 / a > 2`, if `a` is 0 the right side is never evaluated, so there is no division by zero. Precedence: `!` first, then `&&`, then `||`. Use brackets to make your intent obvious.

### True and false in C

C has no separate "true" and "false" in the basic language: **0 means false and any other value means true**. A comparison gives 1 or 0. This explains the most famous C bug:

```c
if (mark = 33) {      // WRONG: assigns 33 to mark, and 33 is non-zero, so this is always true
```

The programmer meant `mark == 33`. Turn on compiler warnings (`gcc -Wall`) and the compiler will point it out. You can also write the constant first (`33 == mark`) so that a typo becomes an error.

### Nested conditions

A decision can sit inside another decision:

```c
if (mark >= 0 && mark <= 100) {
    if (mark >= 33) {
        printf("Pass\n");
    } else {
        printf("Fail\n");
    }
} else {
    printf("Invalid mark\n");
}
```

Each `else` belongs to the nearest unmatched `if`. Indentation shows the structure to people, but only the braces tell the compiler. Keep nesting shallow: if you go more than two or three levels deep, flatten it with `&&` or `else if`.

### The switch statement

When one variable is compared against several **exact values**, `switch` is clearer than a long `else if` ladder. It is perfect for menus:

```c
switch (choice) {
    case 1:
        printf("Add a student\n");
        break;
    case 2:
        printf("Show all students\n");
        break;
    default:
        printf("Unknown option\n");
}
```

`switch` works on whole numbers and single characters (not on ranges or decimals). Each `case` must end with `break`; without it, execution **falls through** into the next case. `default` runs when no case matches. For ranges such as 80–100, use an `else if` ladder.

### The conditional operator

A short `if-else` that picks one of two values can be written as `condition ? value_if_true : value_if_false`:

```c
printf("%s\n", mark >= 33 ? "Pass" : "Fail");
```

Use it for simple choices only. If it needs a second thought to read, use `if`.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Condition** | An expression that is true (non-zero) or false (zero). |
| **Branch** | One of the paths a program can take at a decision. |
| **Boolean** | A value that is either true or false, named after the logician George Boole. |
| **Logical operator** | `&&`, `||` or `!`: combines or reverses conditions. |
| **Truth table** | A table of every input combination and the result of a logical expression. |
| **Short-circuit evaluation** | Stopping as soon as the answer of `&&` or `||` is known. |
| **Nested** | Placed inside another statement of the same kind. |
| **Fall-through** | Running on into the next `case` of a `switch` because `break` is missing. |
| **Boundary value** | A value exactly at the edge of a condition, such as 33 or 80; the best test data. |
| **Validation** | Checking that input is acceptable before using it. |

## Worked Examples

### Example 1: The Bangladesh grade scale

Bangladesh's secondary and higher secondary exams convert each subject mark to a **grade** and a **grade point**. The scale is the one your SRMS will use:

| Marks | Grade | Grade point |
|---|---|---|
| 80 – 100 | A+ | 5.00 |
| 70 – 79 | A | 4.00 |
| 60 – 69 | A- | 3.50 |
| 50 – 59 | B | 3.00 |
| 40 – 49 | C | 2.00 |
| 33 – 39 | D | 1.00 |
| 0 – 32 | F | 0.00 |

Here is one subject, from mark to grade point:

```c
#include <stdio.h>

int main(void)
{
    int mark;
    double point;

    printf("Enter a mark:\n");
    scanf("%d", &mark);

    if (mark >= 80) {
        point = 5.0;
    } else if (mark >= 70) {
        point = 4.0;
    } else if (mark >= 60) {
        point = 3.5;
    } else if (mark >= 50) {
        point = 3.0;
    } else if (mark >= 40) {
        point = 2.0;
    } else if (mark >= 33) {
        point = 1.0;
    } else {
        point = 0.0;
    }
    printf("Grade point: %.2f\n", point);
    return 0;
}
```

```input
65
```

```output
Enter a mark:
Grade point: 3.50
```

1. The ladder starts at the highest threshold. 65 fails `>= 80` and `>= 70`, then passes `>= 60`, so `point` becomes 3.5 and the rest of the ladder is skipped.
2. No branch says "less than 70" because that is already known: we only reach `>= 60` when the earlier tests failed.
3. Exactly one branch runs, so `point` is always set. That is why the final `else` matters: it covers every mark below 33.

### Example 2: A pass rule with &&, and the truth table

The SRMS rule is "pass only if **all three** marks are at least 33". With `&&`:

```c
#include <stdio.h>

int main(void)
{
    int a = 85, b = 28, c = 60;
    int all_pass = (a >= 33 && b >= 33 && c >= 33);
    int any_fail = (a < 33 || b < 33 || c < 33);

    printf("all_pass = %d\n", all_pass);
    printf("any_fail = %d\n", any_fail);
    printf("not any_fail = %d\n", !any_fail);
    return 0;
}
```

```output
all_pass = 0
any_fail = 1
not any_fail = 0
```

1. `a >= 33` is 1, `b >= 33` is 0 (28 is below 33), `c >= 33` is 1. `&&` needs **all** to be true, so `all_pass` is 0.
2. `any_fail` asks the opposite question with `||`: at least one is below 33, so it is 1.
3. The two are opposites: `all_pass` equals `!any_fail`. This is **De Morgan's law**: "not (A and B and C)" is the same as "(not A) or (not B) or (not C)". You will prove it with truth tables in Course 4.
4. Rafi's marks (85, 28, 60) have a good average, yet the rule says FAIL, exactly as you traced in Lesson 1.

### Example 3: A menu with switch

```c
#include <stdio.h>

int main(void)
{
    int choice;
    printf("1) Add  2) Show  3) Exit\n");
    scanf("%d", &choice);
    switch (choice) {
        case 1:
            printf("Adding a student\n");
            break;
        case 2:
            printf("Showing all students\n");
            break;
        case 3:
            printf("Goodbye\n");
            break;
        default:
            printf("Choose 1, 2 or 3\n");
    }
    return 0;
}
```

```input
2
```

```output
1) Add  2) Show  3) Exit
Showing all students
```

1. `switch` jumps straight to `case 2`, runs its statement and meets `break`, which leaves the whole `switch`.
2. Remove the `break` after `case 2` and the program would print "Showing all students" **and** "Goodbye". That is fall-through.
3. This is the shape of the SRMS main menu you will build in Lesson 4.

## Common Mistakes and Misconceptions

- **`=` instead of `==`.** `if (mark = 33)` always runs the branch and silently changes `mark`. Compile with `-Wall` and read the warnings.
- **A ladder in the wrong order.** Testing `mark >= 33` first makes every passing mark an "A" or a "D" depending on how you wrote the rest. Start with the highest threshold, or use `&&` to give each branch a closed range.
- **Writing `0 < mark < 100`.** In C this is evaluated as `(0 < mark) < 100`, which is always true. Write `mark > 0 && mark < 100`.
- **A missing `break` in a switch.** The program runs into the next case. Unless you want fall-through on purpose, end every case with `break`.
- **A semicolon after the condition.** `if (mark < 33);` ends the statement immediately, so the following block always runs.
- **Comparing decimals with `==`.** `0.1 + 0.2 == 0.3` is false for `double` because decimals are stored approximately. Compare with a small tolerance instead.
- **Forgetting the boundary.** A pass mark of 33 means 33 itself passes, so the test is `>= 33`, not `> 33`. Always test the boundary values 32, 33 and 34.

## Guided Hands-On Activity

**Boundary testing.** Good programmers test the edges, where bugs hide. Work with your teacher.

1. Type Example 1 into your editor. Do not run it yet.
2. On paper, predict the grade point for these marks: 100, 80, 79, 70, 60, 50, 40, 33, 32, 0. Write them in a table.
3. Run the program ten times, once for each mark, and compare with your predictions. Mark every difference in red.
4. Now break it on purpose: change `>= 33` in the second-to-last branch to `> 33` and run mark 33 again. What changed? Which of your boundary tests found the problem?
5. Swap the order of the first two branches (put `>= 70` before `>= 80`) and run mark 85. Explain in one sentence why the answer is wrong.
6. Enter the mark 150. What does the program do? Write one sentence about what a real result system should do instead. You will fix it in the project.

## Lesson Project: Grade and Pass/Fail Decision Engine

### Objective

Extend your result slip so the SRMS decides. For each of three subjects the program converts the mark to a grade and a grade point, checks that every mark is valid, applies the real pass rule, and prints the student's GPA and result. A student who fails any subject receives a GPA of 0.00 and the result FAIL.

### Requirements

- Read the student's name and the marks in **Bangla, English and Math**, as in Lesson 2.
- **Validate** the marks: if any mark is below 0 or above 100, print `Invalid mark: marks must be between 0 and 100.` and stop with `return 1;`.
- Convert each mark to a grade (letter and sign) and a grade point using the Bangladesh scale in this lesson, with an `else if` ladder.
- Define `PASS_MARK` once with `#define PASS_MARK 33` and use it in the ladder and in the pass rule.
- A student **passes** only if all three marks are at least `PASS_MARK`. The **GPA** is the average of the three grade points for a pass, and 0.00 for a fail.
- Print the slip: each subject's mark, grade and grade point, then the total, the average, the GPA and the result (PASS or FAIL).

### Instructions

1. Copy your `srms_slip.c` from Lesson 2 to `srms_grades.c`.
2. Add the `PASS_MARK` constant and the validation `if` directly after the `scanf`. Use `||` to test all three marks in one condition.
3. Write the grade ladder for the **first** subject. Store the grade letter in a `char`, the sign (`'+'`, `'-'` or a space) in another `char`, and the point in a `double`.
4. Test the ladder with boundary marks before continuing (80, 79, 70, 60, 50, 40, 33, 32).
5. Copy the ladder for the second and third subjects and change the names of the variables. (This is repetitive. Notice how much you are copying; Lesson 5 will show you how to avoid it.)
6. Calculate `all_pass` with `&&`, then set the GPA and the result with an `if-else`.
7. Print the slip and test all three sample students below, plus an invalid mark such as 105.

### Expected Output

Input `Anika`, then `72 65 90` (a pass):

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

Input `Rafi`, then `85 28 60` (fails one subject):

```text
Enter the student's name:
Enter marks in Bangla, English and Math:

===== SRMS RESULT SLIP =====
Name    : Rafi
Bangla  :  85  A+  5.00
English :  28  F   0.00
Math    :  60  A-  3.50
Total   : 173
Average : 57.67
GPA     : 0.00
Result  : FAIL
```

Input `Tania`, then `105 70 70` prints only the two prompt lines and then: `Invalid mark: marks must be between 0 and 100.`

### Hints

1. **Hint 1 (every mark is graded "A+").** Your ladder is probably in the wrong order, or one condition uses `<=`. Write the thresholds on paper from highest to lowest and copy them down in that order.
2. **Hint 2 (the GPA is wrong for a pass).** Add the three grade points *before* dividing, and divide by 3.0 or `(double)` something so the division keeps decimals.
3. **Hint 3 (a failing student still gets a GPA).** Calculate `all_pass` first, and set the GPA to 0.0 inside the `else` branch of `if (all_pass)`.
4. **Hint 4 (the sign shows as a number).** A `char` prints as a letter only with `%c`. Use `%c%c` for the letter and the sign, and print a space as the sign for grades with no `+` or `-`.

### Success Criteria

- [ ] The program rejects any mark below 0 or above 100 and stops.
- [ ] All eight boundary marks (80, 79, 70, 60, 50, 40, 33, 32) give the grade and point from the scale.
- [ ] Rafi (85, 28, 60) gets FAIL and a GPA of 0.00 even though his average is high.
- [ ] Anika (72, 65, 90) gets PASS and a GPA of 4.17.
- [ ] `PASS_MARK` is defined once and used instead of a bare 33.
- [ ] The program compiles with `gcc -Wall` and reports no warnings.

### Extension Challenge

Add an **honours remark** under the result with a `switch` on the grade of the *lowest* subject, or print "Outstanding" for a GPA of 5.00, "Excellent" for 4.00 and above, "Good" for 3.00 and above and "Needs improvement" otherwise. Then answer in a comment: why can you not use `switch` on the GPA directly? (Think about what types `switch` accepts, and what you could convert the GPA into.)

## Lesson Recap

- `if`, `else if` and `else` choose **one** branch; a ladder is tested from the top, so order matters.
- `&&`, `||` and `!` combine conditions; C stops evaluating as soon as the answer is known.
- In C, **0 is false and everything else is true**; `=` assigns and `==` compares.
- Use `switch` for exact values and menus (with `break`), and `else if` for ranges.
- Validate input, test **boundary values**, and keep nesting shallow.

## Homework / Extension Mission

Finish `srms_grades.c` and test it with the eight boundary marks. Then write `triangle.c`: read three side lengths and decide whether they can form a triangle (every side must be shorter than the sum of the other two), and if so print whether it is equilateral, isosceles or scalene. List at least eight test cases, including a degenerate triangle (3, 4, 7), and mark which ones are boundary cases. Finally, in a comment, rewrite your triangle condition using `!` and De Morgan's law and say which version you find easier to read.

## Course Project Connection

Your **Student Result Management System** now makes the decisions that the whole system depends on: valid or invalid input, a grade and a grade point for each subject, and the PASS/FAIL rule. The ladder you copied three times is a deliberate warning sign. In Lesson 5 you will turn it into one reusable function, and in Lesson 4 you will repeat the entire decision process for a whole class. Keep `srms_grades.c` in your folder.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 5 minutes: ask which real systems make decisions (an ATM, a game). 25 minutes: `if`, ladders, `&&`/`||`/`!` with a truth table drawn on the board, `=` vs `==`, `switch`. 10 minutes: the boundary-testing activity. 20 minutes: the project; finish at home.

**Live demonstrations.** Run Example 1 with 80, 79, 33 and 32. Then swap two branches and run 85. Show the `=` bug and compile with `-Wall` to read the warning.

**Misconceptions.** "Else if checks every condition" (it stops at the first true one). "`0 < x < 100` works" (it compiles and is always true). "A `switch` can handle ranges."

**Reference solution `srms_grades.c`:**

```c
#include <stdio.h>

#define PASS_MARK 33

int main(void)
{
    char name[30];
    int m1, m2, m3;
    char l1, s1, l2, s2, l3, s3;
    double p1, p2, p3, gpa;
    int total, all_pass;

    printf("Enter the student's name:\n");
    scanf("%29s", name);
    printf("Enter marks in Bangla, English and Math:\n");
    scanf("%d %d %d", &m1, &m2, &m3);

    if (m1 < 0 || m1 > 100 || m2 < 0 || m2 > 100 || m3 < 0 || m3 > 100) {
        printf("Invalid mark: marks must be between 0 and 100.\n");
        return 1;
    }

    if (m1 >= 80)             { l1 = 'A'; s1 = '+'; p1 = 5.0; }
    else if (m1 >= 70)        { l1 = 'A'; s1 = ' '; p1 = 4.0; }
    else if (m1 >= 60)        { l1 = 'A'; s1 = '-'; p1 = 3.5; }
    else if (m1 >= 50)        { l1 = 'B'; s1 = ' '; p1 = 3.0; }
    else if (m1 >= 40)        { l1 = 'C'; s1 = ' '; p1 = 2.0; }
    else if (m1 >= PASS_MARK) { l1 = 'D'; s1 = ' '; p1 = 1.0; }
    else                      { l1 = 'F'; s1 = ' '; p1 = 0.0; }

    if (m2 >= 80)             { l2 = 'A'; s2 = '+'; p2 = 5.0; }
    else if (m2 >= 70)        { l2 = 'A'; s2 = ' '; p2 = 4.0; }
    else if (m2 >= 60)        { l2 = 'A'; s2 = '-'; p2 = 3.5; }
    else if (m2 >= 50)        { l2 = 'B'; s2 = ' '; p2 = 3.0; }
    else if (m2 >= 40)        { l2 = 'C'; s2 = ' '; p2 = 2.0; }
    else if (m2 >= PASS_MARK) { l2 = 'D'; s2 = ' '; p2 = 1.0; }
    else                      { l2 = 'F'; s2 = ' '; p2 = 0.0; }

    if (m3 >= 80)             { l3 = 'A'; s3 = '+'; p3 = 5.0; }
    else if (m3 >= 70)        { l3 = 'A'; s3 = ' '; p3 = 4.0; }
    else if (m3 >= 60)        { l3 = 'A'; s3 = '-'; p3 = 3.5; }
    else if (m3 >= 50)        { l3 = 'B'; s3 = ' '; p3 = 3.0; }
    else if (m3 >= 40)        { l3 = 'C'; s3 = ' '; p3 = 2.0; }
    else if (m3 >= PASS_MARK) { l3 = 'D'; s3 = ' '; p3 = 1.0; }
    else                      { l3 = 'F'; s3 = ' '; p3 = 0.0; }

    total = m1 + m2 + m3;
    all_pass = (m1 >= PASS_MARK && m2 >= PASS_MARK && m3 >= PASS_MARK);
    if (all_pass) {
        gpa = (p1 + p2 + p3) / 3.0;
    } else {
        gpa = 0.0;
    }

    printf("\n===== SRMS RESULT SLIP =====\n");
    printf("%-8s: %s\n", "Name", name);
    printf("%-8s: %3d  %c%c %5.2f\n", "Bangla", m1, l1, s1, p1);
    printf("%-8s: %3d  %c%c %5.2f\n", "English", m2, l2, s2, p2);
    printf("%-8s: %3d  %c%c %5.2f\n", "Math", m3, l3, s3, p3);
    printf("%-8s: %d\n", "Total", total);
    printf("%-8s: %.2f\n", "Average", (double)total / 3.0);
    printf("%-8s: %.2f\n", "GPA", gpa);
    printf("%-8s: %s\n", "Result", all_pass ? "PASS" : "FAIL");
    return 0;
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

Check Rafi (85, 28, 60) and the invalid input (105, 70, 70) against the expected outputs in the project by running the reference with them.

**Differentiation.** Support: give the first ladder complete and let students copy and adapt it. Stretch: ask students to find a way to avoid repeating the ladder (a hint towards functions) and to handle a pass mark that differs for one subject.

**Discussion questions (not for the student quiz).** Is it fair that a student with an average of 57 fails? Where else does "any single failure fails the whole" apply (a chain's weakest link, a security check)? Which is safer in a hospital system: `if (a && b)` or `if (a || b)`, and why?
