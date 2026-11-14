# Lumexa Mission Log: Programming Foundations with C

**Course/Path:** Programming Foundations with C
**Lesson:** 07 of 08
**Title:** Pointers, Memory Addresses and Dynamic Memory Allocation
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** C (gcc)

---

## Mission Brief

Every variable you have created lives somewhere in the computer's memory, at a specific **address**, like a house on a street. Until now C hid that from you. This lesson takes the cover off, and it is the lesson that separates C from most other languages. A **pointer** is a variable that holds an address. With pointers a function can change its caller's data, a program can build structures that grow and shrink, and you can ask the operating system for exactly as much memory as the job needs.

Pointers have a reputation for being hard. They are not hard, but they are **precise**: you must always know what an address points to, and what lives there. In return you gain real control, and you finally understand why arrays behave as they did in Lesson 6. By the end you will make the SRMS handle a class of *any* size by asking for memory while it runs.

## Learning Objectives

1. Explain what a memory address is, and use `&` (address-of) and `*` (dereference) correctly.
2. Declare pointers, initialise them (including `NULL`) and read or change a variable through a pointer.
3. Use pointers as function parameters to change the caller's variables and to return several results.
4. Explain the relationship between arrays and pointers, and use simple pointer arithmetic.
5. Allocate, resize and release memory with `malloc`, `calloc`, `realloc` and `free`, and describe the stack and the heap.
6. Recognise memory leaks, dangling pointers, double frees and out-of-bounds access, and avoid them.

## Prerequisites

- Lesson 6: arrays, strings and 2D arrays (you will see what they really are).
- Lesson 5: functions and pass by value, whose limitation pointers remove.

## Concept Explanation

### Memory and addresses

Memory is a very long row of numbered byte-sized cells. The number of a cell is its **address**. A variable occupies one or more consecutive cells, and its address is the address of its first cell. The **address-of operator** `&` gives the address of a variable, and the specifier `%p` prints one:

```c
int x = 42;
printf("%p\n", (void *)&x);     // something like 0x7ffc3a1c (differs on every run and machine)
```

You will rarely print addresses in real programs, but seeing them once makes the idea concrete. The memory diagram below shows a variable `x` and a pointer `p` that stores the address of `x`.

### Pointers: variables that hold addresses

A **pointer** is a variable whose value is an address. The `*` in a declaration marks it as a pointer:

```c
int x = 42;
int *p = &x;        // p is a pointer to int, and it holds the address of x
```

The same `*` in an expression means **dereference**: "go to the address and use what is there":

```c
printf("%d\n", *p);   // prints 42: the value x holds
*p = 99;              // changes x itself, through the pointer
printf("%d\n", x);    // prints 99
```

So `p` is the address, `*p` is the thing at that address. A pointer's **type** (`int *`, `double *`, `char *`) tells the compiler how many bytes to read and how to interpret them.

### NULL and uninitialised pointers

A pointer that points nowhere should hold the special value **`NULL`**. Dereferencing `NULL` crashes the program (a **segmentation fault**), which is far better than silently using a random address. An **uninitialised pointer** (declared but never set) holds garbage, and using it is one of the most serious C bugs. Always initialise: `int *p = NULL;` or point it at something real.

### Pointers and functions: changing the caller's variables

In Lesson 5 you learned that C passes **copies**. If you pass the *address* of a variable, the function can reach back and change the original:

```c
void swap(int *a, int *b)
{
    int temp = *a;
    *a = *b;
    *b = temp;
}
/* call: swap(&x, &y); */
```

This is also how a function can return **several results**: pass the addresses of variables to fill. And it is exactly what `scanf` does with `&mark`. You have been passing addresses since Lesson 2.

### Arrays and pointers

In most expressions an array's name **stands for the address of its first element**. That is why an array argument is not copied (Lesson 6): the function receives that address. These are equivalent:

```c
marks[i]        *(marks + i)
```

**Pointer arithmetic** adds in units of the pointed-to type: `p + 1` points to the *next int*, which is 4 bytes further on, not 1. So `marks + 2` is the address of `marks[2]`. A 2D table can be stored in one flat block, where the cell for row `r` and column `c` lives at index `r * COLUMNS + c` (this is how memory really holds a 2D array).

### Dynamic memory: the stack and the heap

A program has two main memory areas:

| Area | Holds | Lifetime | Size |
|---|---|---|---|
| **Stack** | local variables and function parameters | created and destroyed automatically with each function call | small, fixed |
| **Heap** | memory you request at run time | stays until **you** release it | large, limited by the system |

The size of an array on the stack must be known when you write the program. But how many students will there be? The heap solves that: you ask for exactly the amount you need **while the program runs**.

### malloc, calloc, realloc and free

These functions come from `<stdlib.h>`:

| Function | What it does |
|---|---|
| `malloc(bytes)` | reserves that many bytes and returns the address (contents are not set) |
| `calloc(count, size)` | reserves `count` items and sets every byte to zero |
| `realloc(ptr, bytes)` | changes the size of a block, keeping its contents |
| `free(ptr)` | gives the block back to the system |

```c
int n = 5;
int *marks = malloc(n * sizeof *marks);    // room for 5 ints
if (marks == NULL) {                       // malloc can fail: always check
    printf("Out of memory.\n");
    return 1;
}
marks[0] = 72;                             // use it like an array
free(marks);                               // release it when finished
marks = NULL;                              // so it cannot be used by mistake
```

`sizeof *marks` is the size of one `int`; writing it this way stays correct if the type changes. The golden rule: **every `malloc` needs exactly one matching `free`**.

### The classic memory bugs

- **Memory leak**: forgetting `free`. The memory stays reserved until the program ends. A long-running server slowly eats all the memory.
- **Dangling pointer**: using a pointer after the memory was freed (**use after free**). The data may look fine, then change or crash later.
- **Double free**: freeing the same block twice, which corrupts the heap.
- **Out of bounds**: reading or writing past the end of a block, as with arrays.
- **Dereferencing `NULL`**: a crash, but at least an obvious one.

A good habit is to compile with the address sanitiser while you learn: `gcc -Wall -g -fsanitize=address program.c`. It stops the program with a clear message at the first leak, overflow or use after free.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Address** | The number that identifies a cell of memory. |
| **Pointer** | A variable that stores an address. |
| **Address-of (`&`)** | The operator that gives the address of a variable. |
| **Dereference (`*`)** | The operator that follows a pointer to the value it points to. |
| **NULL** | A special pointer value meaning "points to nothing". |
| **Pointer arithmetic** | Adding to a pointer in units of the type it points to. |
| **Stack** | Memory for local variables, managed automatically per function call. |
| **Heap** | Memory requested at run time that lives until it is freed. |
| **Memory leak** | Heap memory that is never freed. |
| **Dangling pointer** | A pointer to memory that has already been freed or has gone out of scope. |
| **Segmentation fault** | A crash caused by using memory the program may not use. |

## Worked Examples

### Example 1: Pointer basics

```c
#include <stdio.h>

int main(void)
{
    int x = 42;
    int *p = &x;

    printf("x = %d, *p = %d\n", x, *p);
    *p = 99;
    printf("after *p = 99: x = %d\n", x);
    printf("p points to x? %d\n", p == &x);
    return 0;
}
```

```output
x = 42, *p = 42
after *p = 99: x = 99
p points to x? 1
```

1. `p` holds the address of `x`, so `*p` and `x` are two names for the same cell.
2. `*p = 99;` writes 99 into that cell, so `x` changes without ever being mentioned.
3. `p == &x` compares two addresses and gives 1 (true). The numbers themselves are never printed because they change on each run.

### Example 2: A function that changes two variables and one that returns two results

```c
#include <stdio.h>

void swap(int *a, int *b)
{
    int temp = *a;
    *a = *b;
    *b = temp;
}

void min_max(const int *values, int n, int *min, int *max)
{
    *min = *max = values[0];
    for (int i = 1; i < n; i++) {
        if (values[i] < *min) *min = values[i];
        if (values[i] > *max) *max = values[i];
    }
}

int main(void)
{
    int x = 5, y = 9;
    swap(&x, &y);
    printf("x = %d, y = %d\n", x, y);

    int marks[5] = {72, 65, 90, 41, 58};
    int lo, hi;
    min_max(marks, 5, &lo, &hi);
    printf("min = %d, max = %d\n", lo, hi);
    return 0;
}
```

```output
x = 9, y = 5
min = 41, max = 90
```

1. `swap(&x, &y)` passes the **addresses** of `x` and `y`. Inside `swap`, `*a` and `*b` *are* `x` and `y`, so the three assignments really exchange their values: `x` becomes 9 and `y` becomes 5. This is exactly what the by-value version in Lesson 5 could not do.
2. `min_max` hands back **two** results without returning anything: it writes through the pointers `min` and `max`, which hold the addresses of `lo` and `hi` in `main`.
3. The `const` in `const int *values` is a promise that the function will only read the array, never change it. The compiler enforces the promise.
4. `scanf("%d", &mark)` has used this very mechanism since Lesson 2: you gave it the address, so it could store the number there.

### Example 3: Dynamic memory with malloc and free

```c
#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    int n = 4;
    int *marks = malloc(n * sizeof *marks);
    if (marks == NULL) {
        printf("Out of memory.\n");
        return 1;
    }
    for (int i = 0; i < n; i++) {
        marks[i] = 60 + i * 10;
    }
    long sum = 0;
    for (int i = 0; i < n; i++) {
        sum += *(marks + i);
    }
    printf("average = %.1f\n", (double)sum / n);

    n = 8;
    int *bigger = realloc(marks, n * sizeof *bigger);
    if (bigger == NULL) {
        free(marks);
        return 1;
    }
    marks = bigger;
    for (int i = 4; i < n; i++) {
        marks[i] = 0;
    }
    printf("kept the first value: %d, new size: %d\n", marks[0], n);

    free(marks);
    return 0;
}
```

```output
average = 75.0
kept the first value: 60, new size: 8
```

1. `malloc` reserves room for 4 `int`s on the heap and returns its address; the result is checked for `NULL`.
2. `marks[i]` and `*(marks + i)` are the same thing: the pointer is used exactly like an array.
3. `realloc` grows the block to 8 ints and **keeps the first four values**. It may move the block, so the result goes into a *new* pointer first; if it failed, the old block is still valid and must still be freed.
4. Exactly one `free` at the end releases the block. Forgetting it leaks 32 bytes; calling it twice crashes.

## Common Mistakes and Misconceptions

- **Using an uninitialised pointer.** `int *p; *p = 5;` writes to a random address. Set pointers to `NULL` or to a real address first.
- **Mixing up `p` and `*p`.** `p` is the address; `*p` is the value. `p = 5` (with `int *p`) is a type error, while `*p = 5` is a store.
- **Forgetting to check `malloc`.** If the system runs out of memory it returns `NULL`, and using it crashes. Always test.
- **Forgetting `free`.** Memory leaks. Match every `malloc`/`calloc` with one `free`.
- **Using memory after `free`.** The pointer still holds the old address, but the block belongs to someone else now. Set it to `NULL` after freeing.
- **Freeing twice, or freeing something that was not malloc'd.** Both corrupt the heap. Free only what you allocated, exactly once.
- **Wrong size.** `malloc(n)` reserves `n` *bytes*, not `n` ints. Use `n * sizeof *p`.
- **Returning the address of a local variable.** The variable disappears when the function returns, so the pointer dangles. Return a value, or allocate on the heap.
- **Writing past the end of a block.** `malloc(5 * sizeof *p)` then `p[5] = 0;` is a buffer overflow. Keep the size next to the pointer and check it.

## Guided Hands-On Activity

**Draw the memory, then find the memory bugs.** Work with your teacher.

1. Type Example 2. Before running it, draw `x`, `y`, `a` and `b` as boxes with arrows, and predict the values of `x` and `y` after `swap(&x, &y)`. Run it and check. Then rewrite `swap` with plain `int a, int b` parameters (as in Lesson 5) and show, by printing in `main`, that nothing changes. Explain the difference in one sentence.
2. In `main`, add `printf("%d\n", *(marks + 2));` and predict the value before running. Then try `*(marks + 5)` and explain why it is a bug even if it prints something.
3. Type Example 3. Compile it with the address sanitiser: `gcc -Wall -g -fsanitize=address example3.c -o example3` and run it. It should be silent.
4. Delete the line `free(marks);`, compile and run again. Read the leak report the sanitiser prints, and say how many bytes were lost.
5. Put `free(marks);` back, then add a second `free(marks);` straight after it. What does the sanitiser say now?
6. Change the allocation to `malloc(n)` (forgetting `sizeof`) and write to `marks[3]`. What does the sanitiser report, and why?
7. Draw the memory for Example 1 as two boxes (`x` and `p`) with an arrow from `p` to `x`, and update the drawing after `*p = 99`.

## Lesson Project: Dynamic Class Size with malloc

### Objective

Remove the "maximum five students" limit from the Lesson 6 marks table. The program asks how many students there are **while it runs**, reserves exactly enough heap memory for their names, marks and totals, fills it, reports on the class using pointer-based functions, and then releases everything. A clean run with the address sanitiser proves that you managed memory correctly.

### Requirements

- Ask `How many students?` and read it with `read_line` and `sscanf`. Reject anything that is not a whole number of at least 1.
- Allocate with `malloc`/`calloc` and `sizeof *pointer`: a block of `n * NAME_LEN` characters for the names, a block of `n * SUBJECTS` ints for the marks (treated as a flat table: student `s`, subject `j` at `s * SUBJECTS + j`) and a zero-filled block of `n` ints for the totals.
- **Check every allocation** for `NULL`, and free what was already allocated before returning.
- Write `class_stats(const int *totals, int n, int *highest, int *lowest, double *average)`, which returns its three results **through pointers**.
- Print one line per student (name, three marks, total), then the highest total, the lowest total and the average total, then `Memory released.`
- Free all three blocks exactly once, and run the finished program with `-fsanitize=address` without any report.

### Instructions

1. Copy `srms_table.c` to `srms_dynamic.c`. Remove `MAX_STUDENTS` and the three fixed arrays.
2. Read `n`, validate it, and write the three allocations with the `NULL` checks.
3. Rewrite the reading loop. Read a name into `names + s * NAME_LEN` and the marks into `marks[s * SUBJECTS + j]`, adding to `totals[s]`.
4. Print the table with one `printf` per student, using the same index formula.
5. Write `class_stats` using only pointer parameters for its outputs, and call it with `&high`, `&low` and `&avg`.
6. Free the three blocks and print `Memory released.`
7. Compile with `gcc -Wall -g -fsanitize=address`, run the sample session and confirm the output and that the sanitiser is silent.
8. Break it deliberately (skip one `free`) to see the leak report, then fix it.

### Expected Output

For the input `4`, then the four names and mark lines `Anika Rahman` / `72 65 90`, `Rafi Ahmed` / `85 28 60`, `Sadia Islam` / `55 48 62`, `Imran Hossain` / `91 88 79`:

```text
How many students?
Student 1 name:
Marks (Bangla English Math):
Student 2 name:
Marks (Bangla English Math):
Student 3 name:
Marks (Bangla English Math):
Student 4 name:
Marks (Bangla English Math):

Anika Rahman     72   65   90  total 227
Rafi Ahmed       85   28   60  total 173
Sadia Islam      55   48   62  total 165
Imran Hossain    91   88   79  total 258
Highest total: 258
Lowest total : 165
Average total: 205.75
Memory released.
```

### Hints

1. **Hint 1 (a crash on the second student).** Check the index of the marks. Student `s`, subject `j` is at `s * SUBJECTS + j`, not `s + j`. Check the name offset too: `names + s * NAME_LEN`.
2. **Hint 2 (the sanitiser reports a leak).** Count your allocations and your frees: there must be three of each. A `return` in the middle of `main` must free whatever was allocated so far.
3. **Hint 3 (garbage in the totals).** `malloc` does not clear memory. Use `calloc` for `totals`, or set each total to 0 before adding.
4. **Hint 4 (`class_stats` returns wrong values).** Assign through the pointers: `*highest = ...`. Writing `highest = ...` changes only the local copy of the pointer.
5. **Hint 5 (heap-buffer-overflow).** A mistake in the size. Use `n * SUBJECTS * sizeof *marks`, with `sizeof` and with both factors.

### Success Criteria

- [ ] The program works for any number of students, such as 1, 4 and 50, with no fixed maximum.
- [ ] Every allocation is checked and every allocated block is freed exactly once.
- [ ] `class_stats` returns its three results through pointer parameters.
- [ ] The output matches the expected output for the sample session.
- [ ] A run with `-fsanitize=address` produces no error and no leak report.
- [ ] I can explain, in my own words, the difference between `p` and `*p` and between the stack and the heap.

### Extension Challenge

Make the class **growable**: instead of asking for the count first, keep reading students until the user types an empty name, starting with room for 2 students and **doubling the capacity with `realloc`** whenever it is full (and copy nothing by hand). Keep a `count` and a `capacity`, and print how many times the block had to grow. Why is doubling better than adding one slot each time? (Think about how many copies `realloc` might have to make. You will answer this precisely in Course 3.)

## Lesson Recap

- Every variable has an **address**; `&x` gives it, and a **pointer** stores one: `int *p = &x;`.
- `*p` follows the pointer: reading or writing it reads or writes the variable itself; initialise pointers and use `NULL` for "nothing".
- Passing **addresses** lets a function change its caller's variables and return several results.
- An array name is the address of its first element, so `a[i]` is `*(a + i)`; pointer arithmetic moves in whole elements.
- `malloc`/`calloc`/`realloc` take memory from the **heap**; **every allocation needs exactly one `free`**, and every allocation must be checked for `NULL`.
- Leaks, dangling pointers, double frees and out-of-bounds writes are the classic bugs; the address sanitiser finds them early.

## Homework / Extension Mission

Finish `srms_dynamic.c` and run it with the address sanitiser for classes of 1, 2 and 30 students. Then write `ptr_practice.c` containing: (a) `void reverse(int *a, int n)` that reverses an array in place using only pointer notation, (b) `int *make_range(int n)` that allocates and returns an array holding 1 to `n` (the caller frees it), (c) a `main` that tests both and frees correctly. In a comment, explain what would be wrong with `int *make_range(int n) { int a[100]; ... return a; }`. Draw a diagram of the stack and the heap at the moment `make_range` returns.

## Course Project Connection

The **Student Result Management System** no longer has a size limit: its memory grows to match the class and is released when the work is done. You also have the key tool for the next step. In Lesson 8 you will group a student's name, marks and totals into one **structure**, store the structures in a heap array, and save them to a **file**, which completes the course project. The pointer functions you wrote here (returning several results through addresses) are the pattern for the menu functions in the final system.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 5 minutes: the street-and-houses analogy; draw `x` and `p` as two boxes and an arrow. 25 minutes: `&`, `*`, pass-by-pointer, arrays and pointers, the stack versus the heap, `malloc`/`free`. 10 minutes: the sanitiser activity. 20 minutes: the project.

**Live demonstrations.** Draw memory on the board and update it line by line. Run Example 3 with the address sanitiser, remove `free`, and read the leak report aloud. Show that `p` and `&x` are equal but `*p` and `x` are what we use.

**Misconceptions.** "A pointer *is* the value." "Pointer arithmetic adds bytes." "`free` sets the pointer to NULL." "malloc zeroes the memory."

**Reference solution `srms_dynamic.c`:**

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SUBJECTS 3
#define NAME_LEN 30

void read_line(char *buf, int size)
{
    if (fgets(buf, size, stdin) == NULL) {
        buf[0] = '\0';
        return;
    }
    buf[strcspn(buf, "\n")] = '\0';
}

void class_stats(const int *totals, int n, int *highest, int *lowest, double *average)
{
    long sum = 0;
    *highest = totals[0];
    *lowest = totals[0];
    for (int i = 0; i < n; i++) {
        if (totals[i] > *highest) {
            *highest = totals[i];
        }
        if (totals[i] < *lowest) {
            *lowest = totals[i];
        }
        sum += totals[i];
    }
    *average = (double)sum / n;
}

int main(void)
{
    char line[100];
    int n;

    printf("How many students?\n");
    read_line(line, sizeof line);
    if (sscanf(line, "%d", &n) != 1 || n < 1) {
        printf("Please enter a whole number of at least 1.\n");
        return 1;
    }

    char *names = malloc((size_t)n * NAME_LEN);
    int *marks = malloc((size_t)n * SUBJECTS * sizeof *marks);
    int *totals = calloc((size_t)n, sizeof *totals);
    if (names == NULL || marks == NULL || totals == NULL) {
        printf("Out of memory.\n");
        free(names);
        free(marks);
        free(totals);
        return 1;
    }

    for (int s = 0; s < n; s++) {
        printf("Student %d name:\n", s + 1);
        read_line(names + s * NAME_LEN, NAME_LEN);
        printf("Marks (Bangla English Math):\n");
        read_line(line, sizeof line);
        sscanf(line, "%d %d %d", &marks[s * SUBJECTS], &marks[s * SUBJECTS + 1], &marks[s * SUBJECTS + 2]);
        for (int j = 0; j < SUBJECTS; j++) {
            totals[s] += marks[s * SUBJECTS + j];
        }
    }

    printf("\n");
    for (int s = 0; s < n; s++) {
        printf("%-14s %4d %4d %4d  total %d\n", names + s * NAME_LEN, marks[s * SUBJECTS], marks[s * SUBJECTS + 1],
               marks[s * SUBJECTS + 2], totals[s]);
    }

    int high, low;
    double avg;
    class_stats(totals, n, &high, &low, &avg);
    printf("Highest total: %d\n", high);
    printf("Lowest total : %d\n", low);
    printf("Average total: %.2f\n", avg);

    free(names);
    free(marks);
    free(totals);
    printf("Memory released.\n");
    return 0;
}
```

```input
4
Anika Rahman
72 65 90
Rafi Ahmed
85 28 60
Sadia Islam
55 48 62
Imran Hossain
91 88 79
```

```output
How many students?
Student 1 name:
Marks (Bangla English Math):
Student 2 name:
Marks (Bangla English Math):
Student 3 name:
Marks (Bangla English Math):
Student 4 name:
Marks (Bangla English Math):

Anika Rahman     72   65   90  total 227
Rafi Ahmed       85   28   60  total 173
Sadia Islam      55   48   62  total 165
Imran Hossain    91   88   79  total 258
Highest total: 258
Lowest total : 165
Average total: 205.75
Memory released.
```

**Differentiation.** Support: provide the allocation block with the checks and let students write the loops. Stretch: ask for the growable version with `realloc` and a discussion of amortised cost.

**Discussion questions (not for the student quiz).** Why do languages such as Python and Java hide pointers, and what do they pay for that? Why is a buffer overflow a security problem and not just a bug?
