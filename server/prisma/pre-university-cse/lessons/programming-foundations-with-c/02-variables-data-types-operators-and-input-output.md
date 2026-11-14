# Lumexa Mission Log: Programming Foundations with C

**Course/Path:** Programming Foundations with C
**Lesson:** 02 of 08
**Title:** Variables, Data Types, Operators and Input/Output
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** C (gcc)

---

## Mission Brief

Last lesson you planned the Student Result Management System on paper. Today it starts to *remember* things. A result slip needs a name, three marks, a total and an average, and a program can only work with data that is stored somewhere. In C, storage is a **variable**: a named box in the computer's memory that holds one value of one **type**.

You will learn how to create variables, choose the right type for each kind of data, calculate with **operators**, and talk to the user with `printf` and `scanf`. These four ideas are the foundation of every C program ever written. By the end of the lesson your SRMS will read real marks from the keyboard and print a neat result slip.

## Learning Objectives

1. Declare, initialise and name variables of type `int`, `float`, `double` and `char`.
2. Choose a suitable data type and explain what happens when a value is too large for it.
3. Use arithmetic, assignment, increment and relational operators, and predict results using operator precedence.
4. Explain integer division and use a cast to get a decimal result.
5. Read values with `scanf` and print aligned, formatted output with `printf`.
6. Define constants with `#define` and `const`, and build the SRMS mark-entry and result-slip program.

## Prerequisites

- Lesson 1: you can write, compile and run a C program that uses `printf`, and you know the algorithm for one student's result.
- School arithmetic: averages, remainders, brackets and the order of operations.

## Concept Explanation

### Variables: named boxes in memory

A **variable** is a named location in memory that stores a value. Creating one is called **declaring** it, and the first value you put in is its **initialisation**:

```c
int total = 0;          // a whole number, starting at 0
double average = 0.0;   // a number with a decimal part
char grade = 'A';       // one character, in single quotes
```

The **type** tells the compiler how much memory the variable needs and how to interpret the bits stored there. The **name** (an **identifier**) must start with a letter or underscore, can contain letters, digits and underscores, is case-sensitive, and cannot be a **keyword** such as `int` or `return`. By convention, C programmers use lowercase words joined by underscores: `pass_mark`, `total_marks`.

Think of a variable as a labelled drawer. **Assignment** (`=`) puts a new value into the drawer, replacing the old one: `total = 227;` The `=` sign does **not** mean "equals" as in mathematics. It means "work out the right-hand side, then store it in the left-hand side".

### Data types

C has a small set of **basic data types**:

| Type | Stores | Typical size | Example |
|---|---|---|---|
| `char` | One character (stored as a small number) | 1 byte | `'A'`, `'7'` |
| `int` | A whole number | 4 bytes | `227`, `-15` |
| `long` | A larger whole number | 4 or 8 bytes | `3000000000L` |
| `float` | A decimal number, about 7 digits of accuracy | 4 bytes | `75.67f` |
| `double` | A decimal number, about 15 digits of accuracy | 8 bytes | `75.6666667` |

Use `int` for counts and marks, and `double` for averages and money. A type has a **range**. A 4-byte `int` holds roughly −2.1 billion to +2.1 billion. If a calculation goes past the end, the value **overflows**: in practice it wraps around to a wrong number, silently. The bit explorer below shows the same effect on a tiny 8-bit number: add 1 to 127 in two's complement and it becomes −128. You will study why in Course 5.

### Constants

A value that must never change should be a **constant**, so nobody can change it by accident and so the number has a name. There are two common ways:

```c
#define PASS_MARK 33       // the preprocessor replaces PASS_MARK with 33 everywhere
const int SUBJECTS = 3;    // a real variable that the compiler will not let you change
```

Never scatter "magic numbers" like `33` through a program. If the pass mark changes, you want to edit one line.

### Operators

An **operator** combines values. The ones you need now:

| Group | Operators | Example | Result |
|---|---|---|---|
| Arithmetic | `+  -  *  /  %` | `17 % 5` | `2` (the remainder) |
| Assignment | `=  +=  -=  *=  /=` | `total += 40` | adds 40 to `total` |
| Increment | `++  --` | `count++` | adds 1 to `count` |
| Relational | `<  >  <=  >=  ==  !=` | `mark >= 33` | `1` (true) or `0` (false) |

C has no separate true/false type in this lesson: a comparison gives `1` for true and `0` for false.

**Precedence** decides which operator goes first: brackets, then `*  /  %`, then `+  -`, then comparisons, then `=`. When in doubt, add brackets. `2 + 3 * 4` is 14, but `(2 + 3) * 4` is 20.

### Integer division and casting

When **both** operands are integers, `/` throws away the fractional part:

```c
int total = 227;
double wrong = total / 3;           // 227 / 3 is 75 (integer division), then stored as 75.0
double right = (double)total / 3;   // the cast makes one operand a double, so the division keeps decimals
```

A **cast** such as `(double)total` temporarily converts a value to another type. This single mistake, integer division where you wanted decimals, is one of the most common bugs in marks and money programs.

### Output with printf

`printf` prints text and values. Inside the text, a **format specifier** starting with `%` is replaced by the next value:

| Specifier | Prints | Example |
|---|---|---|
| `%d` | an `int` | `printf("%d", 227);` → `227` |
| `%f` | a `double` | `printf("%f", 75.5);` → `75.500000` |
| `%.2f` | a `double` with 2 decimals | `printf("%.2f", 75.666);` → `75.67` |
| `%c` | one character | `printf("%c", 'A');` → `A` |
| `%s` | a piece of text | `printf("%s", "Anika");` → `Anika` |
| `%5d` | an `int` in a field 5 wide | `printf("[%5d]", 72);` → `[   72]` |
| `%-8s` | text, left-aligned in 8 spaces | `printf("[%-8s]", "Ana");` → `[Ana     ]` |

The number of specifiers must match the number of values, and the type must match the specifier. `%d` with a decimal value prints garbage.

### Input with scanf

`scanf` reads typed input into a variable. It uses the same specifiers, and for numbers it needs the **address-of operator** `&`, which tells it *where* in memory to put the value:

```c
int mark;
scanf("%d", &mark);        // read a whole number into mark

double price;
scanf("%lf", &price);      // note: %lf to READ a double (but %f to print one)
```

For a single word of text, pass the name of a character array and **no** `&`:

```c
char name[30];             // room for up to 29 characters and the end marker
scanf("%29s", name);       // reads one word; the 29 stops overflow
```

You will study arrays properly in Lesson 6; for now treat `char name[30]` as "a box that holds a word". `scanf` skips spaces and stops at a space, so it reads *one word*. Reading a full name with spaces needs a different tool, which you will meet later.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Variable** | A named location in memory that stores a value of one type. |
| **Declaration** | Telling the compiler a variable's type and name. |
| **Initialisation** | Giving a variable its first value. |
| **Data type** | Describes what kind of value a variable holds and how much memory it uses. |
| **Identifier** | The name of a variable, function or constant. |
| **Constant** | A named value that cannot change while the program runs. |
| **Operator** | A symbol that combines or compares values, such as `+` or `>=`. |
| **Operand** | A value an operator works on. |
| **Cast** | An explicit conversion of a value to another type, such as `(double)total`. |
| **Overflow** | A result too large for its type, which wraps around to a wrong value. |
| **Format specifier** | A `%` code in `printf` or `scanf` that stands for a value, such as `%d`. |
| **Address-of operator (`&`)** | Gives the memory address of a variable; `scanf` needs it to store input. |

## Worked Examples

### Example 1: Variables, arithmetic and formatted output

This program stores three marks, calculates the total and the average, and prints a small table. Read it and predict each line before checking the output.

```c
#include <stdio.h>

#define SUBJECTS 3

int main(void)
{
    int bangla = 72, english = 65, math = 90;
    int total = bangla + english + math;
    double average = (double)total / SUBJECTS;

    printf("%-8s %5d\n", "Bangla", bangla);
    printf("%-8s %5d\n", "English", english);
    printf("%-8s %5d\n", "Math", math);
    printf("%-8s %5d\n", "Total", total);
    printf("%-8s %8.2f\n", "Average", average);
    return 0;
}
```

```output
Bangla      72
English     65
Math        90
Total      227
Average     75.67
```

1. Three `int` variables are declared and initialised on one line, separated by commas.
2. `total` is calculated when it is declared: 72 + 65 + 90 = 227.
3. `(double)total / SUBJECTS` makes the division use decimals: 227 / 3 = 75.666…, stored in `average`.
4. `%-8s` prints the label left-aligned in 8 spaces, and `%5d` prints the number right-aligned in 5 spaces, so the numbers line up in a column. `%8.2f` does the same for the average, with two decimals.

### Example 2: Integer division, remainder and precedence

```c
#include <stdio.h>

int main(void)
{
    int total = 227;
    printf("%d\n", total / 3);
    printf("%.2f\n", (double)total / 3);
    printf("%d\n", total % 3);
    printf("%d\n", 2 + 3 * 4);
    printf("%d\n", (2 + 3) * 4);
    return 0;
}
```

```output
75
75.67
2
14
20
```

1. `total / 3` has two integers, so the answer is the whole number 75 and the remainder is thrown away.
2. Casting one operand to `double` keeps the decimals: 75.67.
3. `total % 3` is the **remainder**: 227 = 3 × 75 + 2, so it prints 2. The remainder operator is perfect for "is this number even?" (`n % 2 == 0`) and for wrapping around a range.
4. Multiplication comes before addition, so `2 + 3 * 4` is 14. The brackets in the last line change the order and give 20.

### Example 3: Reading input and a program that uses it

When you run a program that uses `scanf`, you type the values and press Enter. The block labelled **Input** shows what was typed, and the block labelled **Output** shows what the program printed.

```c
#include <stdio.h>

int main(void)
{
    char name[30];
    int mark;

    printf("Name:\n");
    scanf("%29s", name);
    printf("Mark:\n");
    scanf("%d", &mark);
    printf("%s scored %d, which is %d above the pass mark of 33.\n", name, mark, mark - 33);
    return 0;
}
```

```input
Rafi
58
```

```output
Name:
Mark:
Rafi scored 58, which is 25 above the pass mark of 33.
```

1. `scanf("%29s", name)` reads the word `Rafi` into `name` (no `&`, because `name` already stands for an address).
2. `scanf("%d", &mark)` reads 58 into `mark`; the `&` tells `scanf` where `mark` lives.
3. The last `printf` has one `%s` and two `%d` specifiers, matched in order to `name`, `mark` and `mark - 33`.
4. On your screen, what you typed appears right after each prompt. The output block above shows only what the program itself printed.

## Common Mistakes and Misconceptions

- **Forgetting `&` in `scanf`.** `scanf("%d", mark);` compiles with a warning but crashes or corrupts memory. Numbers need `&mark`; a word in a `char` array does not.
- **Using `%f` to read a `double`.** Print with `%f` or `%.2f`, but read with `%lf`. Reading with `%f` stores garbage.
- **Integer division.** `average = total / 3;` with an `int` total throws away the decimals. Cast one side: `(double)total / 3`.
- **`=` versus `==`.** `=` stores a value; `==` compares two values. Writing `if (mark = 33)` assigns 33 instead of testing.
- **Mismatched specifiers.** `printf("%d", 75.5);` and `printf("%s", 42);` print nonsense, because the specifier and the value disagree. Count them and match the types.
- **Uninitialised variables.** `int total;` followed by `total += 5;` starts from garbage. Always give a variable its first value, usually 0.
- **Thinking `=` means "equal to".** `total = total + 1;` is nonsense in algebra, but in C it means "take the old total, add 1 and store it back". That is exactly what `total++` does.

## Guided Hands-On Activity

**Predict, run, explain.** Work with your teacher and write down your prediction *before* you run each step.

1. Type Example 2 into your editor. Before running, write what you expect each of the five lines to print.
2. Run it and compare. For each line that surprised you, explain why in one sentence.
3. Change `total / 3` to `total / 3.0` and run again. What changes, and why?
4. Add a variable `int a = 7, b = 2;` and print `a / b`, `a % b` and `(double)a / b`. Predict first.
5. Overflow experiment: declare `int big = 2147483647;`, add 1 to it, and print the result with `%d`. What do you see? Write one sentence about why a program that handles money or ages must choose its types carefully.
6. Open the bit explorer above, set it to 127 and press **+ 1**. What happens, and how does it match your overflow experiment?

## Lesson Project: Mark Entry and Result Slip

### Objective

Turn the algorithm from Lesson 1 into a working C program. The program reads a student's name and three subject marks from the keyboard, calculates the total and the average, and prints a neat, aligned result slip. This is the heart of the Student Result Management System.

### Requirements

- Use `#define` for `SUBJECTS` and `PASS_MARK`, and no other "magic numbers" in your calculations.
- Read the student's name (one word) and the marks in **Bangla, English and Math** from the keyboard.
- Store the total in an `int` and the average in a `double`, using a cast so that the average keeps its decimals.
- Print the result slip with labels left-aligned and numbers right-aligned in columns, and the average with exactly two decimals.
- Print a line that tells how many marks the student's total is above or below the *minimum total for a pass* (`PASS_MARK * SUBJECTS`).

### Instructions

1. Create `srms_slip.c` in your `srms` folder and write the skeleton with `#include <stdio.h>`, the two `#define` lines and `main`.
2. Declare the variables you need: a `char name[30]`, three `int` marks, an `int total` and a `double average`.
3. Print a prompt for each input and read it with `scanf` (remember `&` for the marks, none for `name`).
4. Calculate `total` and `average`.
5. Print the slip. Start with a title line, then one line per item. Use `%-12s` for labels and `%5d` or `%8.2f` for values.
6. Add the line that compares the total with `PASS_MARK * SUBJECTS`.
7. Compile, run it with the sample input below, and compare your output with the expected output. Then try a second student of your own.

### Expected Output

For the input `Anika`, `72 65 90` the slip must look like this (your wording of the title may differ, but the numbers and alignment must match):

```text
Enter the student's name:
Enter marks in Bangla, English and Math:

===== SRMS RESULT SLIP =====
Name         : Anika
Bangla       :    72
English      :    65
Math         :    90
Total        :   227
Average      :   75.67
Minimum total to pass: 99
Your total is 128 above the minimum.
```

### Hints

1. **Hint 1 (the average is wrong).** Look at the line that calculates the average. If both the total and the divisor are integers, C throws the decimals away. Cast the total: `(double)total / SUBJECTS`.
2. **Hint 2 (the numbers do not line up).** Put a field width in the specifier: `%5d` for whole numbers, `%8.2f` for the average. Use the same width for every number in the column.
3. **Hint 3 (scanf seems to be skipped).** Check that each `scanf` format matches its variable: `%29s` for `name`, `%d` for each mark, and that every mark has `&` in front of it.
4. **Hint 4 (the minimum total).** The pass mark applies to each subject, so the smallest total that could pass is `PASS_MARK * SUBJECTS`. Subtract that from `total` to see how far above it the student is.

### Success Criteria

- [ ] The program compiles with no errors and no warnings.
- [ ] `SUBJECTS` and `PASS_MARK` are defined once and used in the calculations; there is no bare `3` or `33` in an expression.
- [ ] The average keeps its decimals (75.67, not 75.00).
- [ ] The labels are left-aligned and the numbers are right-aligned in neat columns.
- [ ] Running it with Anika's marks gives total 227 and average 75.67.
- [ ] I tested a second student and checked the total and average by hand.

### Extension Challenge

Make the slip handle **decimal marks**: change the marks to `double` (for example 72.5 and 64.25), read them with `%lf`, and print them with one decimal place. Then add a line that prints the student's **highest** and **lowest** mark without using any `if` statement yet: think about how you could get them using only arithmetic. (You will do this properly with `if` in the next lesson, but this puzzle is worth ten minutes now.)

## Lesson Recap

- A **variable** has a type, a name and a value; `=` stores a value and never means "equals".
- Choose `int` for whole numbers and `double` for decimals; a result too big for its type **overflows** silently.
- Use `#define` or `const` for values that never change instead of "magic numbers".
- Integer division discards decimals; a **cast** such as `(double)total / 3` keeps them; `%` gives the remainder.
- `printf` uses specifiers (`%d`, `%.2f`, `%s`, `%5d`, `%-8s`); `scanf` reads values, needs `&` for numbers (and `%lf` for a `double`).

## Homework / Extension Mission

Finish `srms_slip.c` and make sure it works for at least three different students. Then write a second program, `fee_calculator.c`, that reads a student's monthly fee (a `double`), the number of months (an `int`) and a discount percentage (an `int`), and prints the total fee before the discount, the discount amount and the final amount to two decimals. Choose a type for every variable and write a one-line comment explaining each choice. Finally, in two or three sentences, explain what would go wrong if you stored the total fee in a `char`.

## Course Project Connection

Your **Student Result Management System** can now accept real input. `srms_slip.c` is the first working piece of the course project: it already performs the "calculate and display" part of the algorithm you designed in Lesson 1. In Lesson 3 you will add decisions (grades and pass or fail), and in Lesson 4 you will repeat the whole process for an entire class. Keep your file: the next lesson builds directly on it.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 5 minutes: ask "where does a program keep a mark while it works?" 25 minutes: variables, types, operators, integer division and format specifiers, with live prediction questions after each. 10 minutes: the guided activity. 20 minutes: the project, with the rest as continuation.

**Live demonstrations.** Show integer division by changing `/ 3` to `/ 3.0` and letting students predict. Show overflow with `2147483647 + 1` (it prints a negative number on typical systems; the C standard calls signed overflow undefined, so tell students it is a bug whatever it prints). Remove the `&` in `scanf` and let the program crash.

**Common misconceptions.** "`=` is equals" (read `x = x + 1` aloud as "make x become x plus one"); "`%d` works for every number"; "a `char` is only a letter" (it is a small number that happens to print as a letter).

**Reference solution `srms_slip.c`** (the exact prompts may vary):

```c
#include <stdio.h>

#define SUBJECTS 3
#define PASS_MARK 33

int main(void)
{
    char name[30];
    int bangla, english, math;
    int total;
    double average;
    int minimum = PASS_MARK * SUBJECTS;

    printf("Enter the student's name:\n");
    scanf("%29s", name);
    printf("Enter marks in Bangla, English and Math:\n");
    scanf("%d %d %d", &bangla, &english, &math);

    total = bangla + english + math;
    average = (double)total / SUBJECTS;

    printf("\n===== SRMS RESULT SLIP =====\n");
    printf("%-12s : %s\n", "Name", name);
    printf("%-12s : %5d\n", "Bangla", bangla);
    printf("%-12s : %5d\n", "English", english);
    printf("%-12s : %5d\n", "Math", math);
    printf("%-12s : %5d\n", "Total", total);
    printf("%-12s : %7.2f\n", "Average", average);
    printf("Minimum total to pass: %d\n", minimum);
    if (total >= minimum)
        printf("Your total is %d above the minimum.\n", total - minimum);
    else
        printf("Your total is %d below the minimum.\n", minimum - total);
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
Name         : Anika
Bangla       :    72
English      :    65
Math         :    90
Total        :   227
Average      :   75.67
Minimum total to pass: 99
Your total is 128 above the minimum.
```

Note that the reference solution uses `if` ahead of its time as a convenience; students may print only the difference without it. If a student's average column is aligned differently from the expected output, accept it as long as every number is right-aligned in one column and has two decimals.

**Differentiation.** Support: provide the skeleton with the `scanf` lines filled in. Stretch: ask students to find the real range of `int` on their machine with `INT_MAX` from `<limits.h>` and to explain overflow with a calendar example (a day counter in an `unsigned char` wraps after 255).

**Discussion questions (not for the student quiz).** Why does C make you choose a type for every variable when Python does not? Which type would you use for a bank balance, and why not `float`?
