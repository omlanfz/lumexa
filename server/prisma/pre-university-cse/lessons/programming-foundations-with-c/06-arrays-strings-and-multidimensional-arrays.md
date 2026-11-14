# Lumexa Mission Log: Programming Foundations with C

**Course/Path:** Programming Foundations with C
**Lesson:** 06 of 08
**Title:** Arrays, Strings and Multidimensional Arrays
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** C (gcc)

---

## Mission Brief

So far every mark has lived in its own variable: `m1`, `m2`, `m3`. That works for three subjects and one student. For a class of 40 students with 6 subjects you would need 240 variable names, and you could not write a loop over them. The tool that fixes this is the **array**: a row of boxes of the same type, numbered 0, 1, 2…, that you can walk through with a loop.

Text has the same problem. A student's name is a *row of characters*, and in C a **string** is simply an array of characters that ends with a special marker. Today you learn arrays, strings and **two-dimensional arrays** (tables with rows and columns). You will use them to store a whole class in memory, print a marks table with totals and averages, find the topper and search the class by name.

## Learning Objectives

1. Declare, initialise and index one-dimensional arrays, and use loops to process them.
2. Explain why array indexes start at 0 and what happens when an index is out of bounds.
3. Store and process strings as `char` arrays that end with `'\0'`, using `strlen`, `strcpy`, `strcmp` and `fgets`.
4. Pass arrays to functions together with their size, and explain why the function can change them.
5. Use two-dimensional arrays and arrays of strings to store a table of data.
6. Build a marks table for a class: totals, subject averages, the topper and a name search.

## Prerequisites

- Lesson 5: functions, parameters and prototypes (you will reuse the grade functions' ideas).
- Lesson 4: `for` loops and nested loops, which are the natural way to process arrays.

## Concept Explanation

### Arrays: many values, one name

An **array** stores a fixed number of values of the **same type** in consecutive memory cells. Each value is an **element**, reached by its **index** in square brackets:

```c
int marks[5] = {72, 65, 90, 41, 58};

printf("%d\n", marks[0]);   // 72: the FIRST element has index 0
marks[3] = 45;              // replace the fourth element
```

Indexes start at **0**, so an array of 5 elements has the valid indexes 0, 1, 2, 3 and 4. The index counts how far the element is from the start. The array below shows `marks` with its indexes underneath.

The size must be known when you declare the array: use a constant such as `#define MAX_STUDENTS 40`. If you give fewer initial values than the size, the rest become 0.

### Going through an array with a loop

Arrays and `for` loops belong together. The loop variable *is* the index:

```c
int sum = 0;
for (int i = 0; i < 5; i++) {
    sum += marks[i];
}
```

The same pattern gives you the classic array algorithms: the **sum**, the **maximum** (compare with the best so far), a **linear search** (stop when you find the value) and **reversing** (swap the first and last, then move inwards).

### Out of bounds: the dangerous mistake

C does **not** check the index. Writing `marks[5]` or `marks[-1]` reads or overwrites memory that belongs to something else: **undefined behaviour**. It may crash, print garbage, or silently corrupt another variable and fail much later. Always make sure `0 <= index < size`. Loops that use `i < size` (never `i <= size`) are safe.

### Arrays and functions

An array does not carry its size with it. A function that receives an array must also receive the number of elements:

```c
int total_of(int row[], int n)
{
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += row[i];
    }
    return sum;
}
```

Unlike `int` arguments, an **array is not copied** when you pass it. The function receives the *address* of the first element, so a function that changes `row[i]` changes the caller's array. (Lesson 7 explains why.)

### Strings: arrays of characters

A **string** in C is an array of `char` that ends with the **null character** `'\0'` (the character with code 0). The `'\0'` marks where the text stops, so a string of 5 letters needs **6** cells:

```c
char name[30] = "Anika";     // 'A' 'n' 'i' 'k' 'a' '\0' and the rest unused
```

Never forget the room for `'\0'`. The standard library `<string.h>` has the tools:

| Function | What it does | Example |
|---|---|---|
| `strlen(s)` | number of characters before `'\0'` | `strlen("Anika")` is 5 |
| `strcpy(dest, src)` | copies `src` into `dest` (including `'\0'`) | `strcpy(name, "Rafi")` |
| `strcmp(a, b)` | 0 if equal, negative if `a` comes first, positive if after | `strcmp("Ana", "Ana") == 0` |
| `strcat(dest, src)` | appends `src` to the end of `dest` | `strcat(name, " Khan")` |

You **cannot** compare strings with `==` or copy them with `=`: those would compare or copy *addresses*, not the text. Always use `strcmp` and `strcpy`.

### Reading text safely

`scanf("%s", ...)` stops at the first space, so it cannot read "Anika Rahman". To read a whole line use `fgets`:

```c
char line[100];
fgets(line, sizeof line, stdin);          // reads up to 99 characters, keeps the newline
line[strcspn(line, "\n")] = '\0';         // remove the newline, if there is one
```

`fgets` never writes past the size you give it, which makes it far safer than `scanf("%s")` (which has no limit unless you add one). Mixing `scanf` and `fgets` is a trap: `scanf` leaves the Enter key in the input, so the next `fgets` reads an empty line. A reliable habit is to read **every** line with `fgets` and then extract numbers with `sscanf(line, "%d", &n)`.

### Two-dimensional arrays

A **two-dimensional array** is a table: the first index is the **row**, the second is the **column**.

```c
int marks[3][3] = {
    {72, 65, 90},     // student 0
    {85, 28, 60},     // student 1
    {55, 48, 62}      // student 2
};
printf("%d\n", marks[1][2]);   // row 1, column 2: 60
```

You process a table with **nested loops**: the outer loop over rows, the inner over columns. A row total keeps the row fixed and loops over columns; a column average keeps the column fixed and loops over rows. When a function receives a 2D array it must know the **number of columns**: `int marks[][3]`.

An **array of strings** is a 2D array of `char`: `char names[40][30]` holds 40 names of up to 29 characters each, and `names[2]` is the third name, a string you can pass to `strcmp`.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Array** | A fixed number of values of one type stored in consecutive memory. |
| **Element** | One value in an array. |
| **Index** | The position of an element, counted from 0. |
| **Out of bounds** | Using an index outside the valid range, which is undefined behaviour. |
| **String** | A `char` array that ends with the null character `'\0'`. |
| **Null character** | `'\0'`, the character with code 0 that marks the end of a string. |
| **Linear search** | Checking the elements one by one until a match is found. |
| **Two-dimensional array** | An array of arrays: a table with rows and columns. |
| **Buffer overflow** | Writing more data than an array can hold, corrupting nearby memory. |
| **Undefined behaviour** | Code whose result the C standard does not define; anything can happen. |

## Worked Examples

### Example 1: Sum, maximum, minimum and search

```c
#include <stdio.h>

int main(void)
{
    int marks[5] = {72, 65, 90, 41, 58};
    int n = sizeof marks / sizeof marks[0];
    int sum = 0, max = marks[0], min = marks[0], found = -1;

    for (int i = 0; i < n; i++) {
        sum += marks[i];
        if (marks[i] > max) max = marks[i];
        if (marks[i] < min) min = marks[i];
        if (marks[i] == 90 && found == -1) found = i;
    }
    printf("n = %d, sum = %d, average = %.1f\n", n, sum, (double)sum / n);
    printf("max = %d, min = %d\n", max, min);
    printf("90 is at index %d\n", found);
    return 0;
}
```

```output
n = 5, sum = 326, average = 65.2
max = 90, min = 41
90 is at index 2
```

1. `sizeof marks / sizeof marks[0]` is the total bytes of the array divided by the bytes of one element, which gives the number of elements (5). It works only where the array was declared, not inside a function that received it.
2. `max` and `min` both **start with the first element**; then every other element is compared with them.
3. The search records the first index where 90 appears (`found` starts at -1, a value that can never be an index).
4. The loop uses `i < n`, so it never touches `marks[5]`.

### Example 2: Strings

```c
#include <stdio.h>
#include <string.h>

int main(void)
{
    char first[20] = "Anika";
    char last[20];
    char full[40];

    strcpy(last, "Rahman");
    strcpy(full, first);
    strcat(full, " ");
    strcat(full, last);

    printf("%s has %d characters\n", full, (int)strlen(full));
    printf("compare Anika/Anika: %d\n", strcmp("Anika", "Anika"));
    printf("equal? %s\n", strcmp(first, "Anika") == 0 ? "yes" : "no");
    return 0;
}
```

```output
Anika Rahman has 12 characters
compare Anika/Anika: 0
equal? yes
```

1. `strcpy(last, "Rahman")` copies the text into `last`; `last = "Rahman"` would not compile.
2. `strcpy` then two `strcat` calls build "Anika Rahman" in `full`. `full` is big enough (40) for 12 characters and the `'\0'`; if it were too small, the program would corrupt memory.
3. `strlen` counts the characters before `'\0'`: 5 + 1 + 6 = 12.
4. `strcmp` returns **0** when two strings are equal, which is why the test is `== 0`.

### Example 3: A two-dimensional table

```c
#include <stdio.h>

#define STUDENTS 3
#define SUBJECTS 3

int main(void)
{
    int marks[STUDENTS][SUBJECTS] = {{72, 65, 90}, {85, 28, 60}, {55, 48, 62}};

    for (int s = 0; s < STUDENTS; s++) {
        int total = 0;
        for (int j = 0; j < SUBJECTS; j++) {
            total += marks[s][j];
        }
        printf("student %d total: %d\n", s + 1, total);
    }
    for (int j = 0; j < SUBJECTS; j++) {
        int sum = 0;
        for (int s = 0; s < STUDENTS; s++) {
            sum += marks[s][j];
        }
        printf("subject %d average: %.2f\n", j + 1, (double)sum / STUDENTS);
    }
    return 0;
}
```

```output
student 1 total: 227
student 2 total: 173
student 3 total: 165
subject 1 average: 70.67
subject 2 average: 47.00
subject 3 average: 70.67
```

1. A **row total** fixes the student `s` and loops over the columns `j`. A **column average** fixes the subject `j` and loops over the students `s`. Swapping the loops swaps the question.
2. `total` is declared inside the outer loop, so it restarts at 0 for every student; `sum` does the same for every subject.
3. Both nested loops run `STUDENTS * SUBJECTS` times: 9 steps for each pass over the whole table.

## Common Mistakes and Misconceptions

- **Using the size as an index.** An array of 5 has indexes 0 to 4. `marks[5]` is out of bounds. Loop with `i < 5`, never `i <= 5`.
- **Forgetting the `'\0'`.** A string of 5 letters needs 6 cells. `char name[5] = "Anika";` has no room for the terminator and breaks every string function.
- **Comparing or copying strings with `==` and `=`.** `if (name == "Rafi")` compares addresses, not text. Use `strcmp(name, "Rafi") == 0` and `strcpy`.
- **Using `scanf("%s")` for a full name.** It stops at the space, so "Anika Rahman" becomes "Anika". Use `fgets`, and add a field width (`%29s`) if you do use `scanf`.
- **Mixing `scanf` and `fgets`.** After `scanf("%d", &n)` the newline is still waiting, so the next `fgets` returns an empty line. Read every line with `fgets` and use `sscanf`.
- **Expecting `sizeof` to work in a function.** Inside a function that received an array, `sizeof row` is the size of an address, not the array. Pass the length as a parameter.
- **Writing past the end.** A name longer than the array silently overwrites other variables. Always bound input with the array size.
- **Forgetting the column count in a 2D parameter.** `int marks[][]` does not compile; the function must know the columns: `int marks[][SUBJECTS]`.

## Guided Hands-On Activity

**Arrays on paper and on screen.** Work with your teacher.

1. Draw the array `{72, 65, 90, 41, 58}` as five boxes with the indexes 0 to 4 underneath. Then draw it again after `marks[3] = 45;`.
2. Type Example 1 and, before running, write down the values of `sum`, `max` and `min` after each pass of the loop in a trace table.
3. Change it to find the **index** of the largest mark, not the value, and print both.
4. Write a loop that **reverses** the array in place (swap `marks[i]` with `marks[n - 1 - i]` for the first half).
5. Break it on purpose: change `i < n` to `i <= n` and run. What is printed for the extra element? Why is this dangerous?
6. Type Example 2. Then add a line that prints the name backwards with a `for` loop that starts at `strlen(full) - 1`.
7. Extend Example 3 with a fourth student and a fourth subject. Which constants change, and which loops need no change at all?

## Lesson Project: Marks Table with 2D Arrays

### Objective

Store a whole class in memory and report on it. The program reads up to five students, each with a **full name** and three marks, keeps the data in a 2D array of marks and an array of strings for the names, prints a neat marks table with totals and PASS/FAIL, shows the average of each subject, announces the topper and searches the class by name.

### Requirements

- Use `char names[MAX_STUDENTS][NAME_LEN]` for the names and `int marks[MAX_STUDENTS][SUBJECTS]` for the marks, with `#define` constants.
- Read **every line** with a `read_line` function (using `fgets`) and extract numbers with `sscanf`. Names may contain spaces.
- Reject a student count outside 1 to `MAX_STUDENTS` with the message `Please enter a number from 1 to 5.`
- Write and use at least these functions: `read_line`, `total_of`, `all_passed`, `column_average`, `find_topper` and `find_student` (by name, using `strcmp`).
- Print a table of every student (number, name, three marks, total, PASS/FAIL), then the average of each subject, then the topper's name and total.
- Ask for a name to search for and report `Found: <name> is student <n> with total <t>.` or `"<name>" is not in the list.`

### Instructions

1. Copy the grade ideas you need from `srms_funcs.c`; define the constants and declare the three arrays (`names`, `marks`, `totals`).
2. Write `read_line` and test it by reading and printing one name that contains a space.
3. Write the loop that reads the student count, then each student's name and marks, and stores the total.
4. Write `total_of` and `all_passed` (both take an array and its size).
5. Print the table with a header line and one `printf` per student, using field widths so the columns line up.
6. Write `column_average` (nested thinking: fix the column, loop over students) and `find_topper`; print the results.
7. Write `find_student` with `strcmp`; read the search name with `read_line` and print the right message.
8. Test with the sample session below, with a student count of 0 and of 6, and with a name that is not in the list.

### Expected Output

For the input lines `3`, `Anika Rahman`, `72 65 90`, `Rafi Ahmed`, `85 28 60`, `Sadia Islam`, `55 48 62` and the search name `Rafi Ahmed`:

```text
How many students (max 5)?
Student 1 name:
Marks (Bangla English Math):
Student 2 name:
Marks (Bangla English Math):
Student 3 name:
Marks (Bangla English Math):

No  Name           Bangla English  Math  Total  Result
1   Anika Rahman       72      65    90    227  PASS
2   Rafi Ahmed         85      28    60    173  FAIL
3   Sadia Islam        55      48    62    165  PASS
Subject averages:   70.67   47.00 70.67
Topper: Anika Rahman (227)
Search for a name:
Found: Rafi Ahmed is student 2 with total 173.
```

### Hints

1. **Hint 1 (the name has no spaces).** You are probably reading it with `scanf("%s")`. Read the whole line with `fgets` and remove the newline with `strcspn`.
2. **Hint 2 (a name is read as empty).** An earlier `scanf` left the Enter key waiting. Read the count with `fgets` and `sscanf`, as in `read_line` plus `sscanf(line, "%d", &n)`.
3. **Hint 3 (the table does not line up).** Use the same widths in the header and the rows: `%-14s` for names, `%6d`, `%7d`, `%5d` for the marks, `%6d` for the total.
4. **Hint 4 (wrong subject average).** For a column average the *subject* index stays fixed and the *student* index changes: `marks[s][subject]`.
5. **Hint 5 (the search never matches).** `strcmp` returns 0 when equal. Check that you compare with `== 0` and that the newline was removed from the search name.

### Success Criteria

- [ ] Names with spaces are stored correctly, and nothing is read past the array sizes.
- [ ] All three arrays are used and every loop stays within `0 <= index < size`.
- [ ] The table, the subject averages (70.67, 47.00, 70.67) and the topper match the expected output.
- [ ] The search finds an existing name and reports a missing one.
- [ ] A student count of 0 or 6 is rejected with the message.
- [ ] No string is compared with `==` or copied with `=`.

### Extension Challenge

Add **sorting**: after reading the data, print a second table of the students in order of **total, highest first**, without changing the original arrays (sort an array of indexes, or copy the totals). You will not need any new C features, only a nested loop that swaps two neighbours when they are in the wrong order (a **bubble sort**). How many comparisons does your sort make for 5 students? For 500? You will answer that question properly in Course 3.

## Lesson Recap

- An **array** stores many values of one type; the first index is **0**, and C never checks the bounds.
- A **string** is a `char` array ending in `'\0'`; use `strlen`, `strcpy`, `strcmp`, `strcat` and never `==` or `=`.
- Read text safely with `fgets` (and `sscanf` for numbers); `scanf("%s")` stops at spaces.
- A function receives an array **without copying it**, so it also needs the length.
- A **2D array** is a table processed with nested loops: fix one index, loop over the other.

## Homework / Extension Mission

Finish the marks table. Then write `text_tools.c` that reads a sentence with `fgets` and reports (a) its length, (b) the number of vowels, (c) the number of words (count the transitions from a space to a letter), (d) the sentence reversed and (e) whether it is a palindrome when you ignore spaces. Test with at least five sentences, including an empty line and one with extra spaces. Finally, explain in a comment why `char word[3] = "cat";` is a bug, and write the corrected line.

## Course Project Connection

The **Student Result Management System** can now hold a whole class in memory and answer questions about it: totals, subject averages, the topper and a search by name. Parallel arrays (`names`, `marks`, `totals`) work, but they are fragile because the pieces of one student live in three places. In Lesson 8 you will combine them into a single `struct`, and in Lesson 7 you will remove the fixed limit of five students with dynamic memory.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 5 minutes: the 240-variables problem. 25 minutes: arrays and indexing (draw boxes), strings and `'\0'`, `fgets`, 2D arrays with a table on the board. 10 minutes: the activity. 20 minutes: the project.

**Live demonstrations.** Show out-of-bounds with `marks[5]` and `marks[100]` and discuss why "it printed something" is not "it works". Show `char name[5] = "Anika";` and the compiler warning. Show `scanf("%d")` followed by `fgets` returning an empty line.

**Misconceptions.** "Arrays start at 1." "`name == "Rafi"` compares text." "`sizeof` always gives the array length."

**Reference solution `srms_table.c`:**

```c
#include <stdio.h>
#include <string.h>

#define MAX_STUDENTS 5
#define SUBJECTS 3
#define NAME_LEN 30
#define PASS_MARK 33

void read_line(char buf[], int size)
{
    if (fgets(buf, size, stdin) == NULL) {
        buf[0] = '\0';
        return;
    }
    buf[strcspn(buf, "\n")] = '\0';
}

int total_of(int row[], int n)
{
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += row[i];
    }
    return sum;
}

int all_passed(int row[], int n)
{
    for (int i = 0; i < n; i++) {
        if (row[i] < PASS_MARK) {
            return 0;
        }
    }
    return 1;
}

double column_average(int marks[][SUBJECTS], int students, int subject)
{
    int sum = 0;
    for (int s = 0; s < students; s++) {
        sum += marks[s][subject];
    }
    return (double)sum / students;
}

int find_topper(int totals[], int n)
{
    int best = 0;
    for (int i = 1; i < n; i++) {
        if (totals[i] > totals[best]) {
            best = i;
        }
    }
    return best;
}

int find_student(char names[][NAME_LEN], int n, char key[])
{
    for (int i = 0; i < n; i++) {
        if (strcmp(names[i], key) == 0) {
            return i;
        }
    }
    return -1;
}

int main(void)
{
    char names[MAX_STUDENTS][NAME_LEN];
    int marks[MAX_STUDENTS][SUBJECTS];
    int totals[MAX_STUDENTS];
    char line[100];
    char key[NAME_LEN];
    int n;

    printf("How many students (max %d)?\n", MAX_STUDENTS);
    read_line(line, sizeof line);
    sscanf(line, "%d", &n);
    if (n < 1 || n > MAX_STUDENTS) {
        printf("Please enter a number from 1 to %d.\n", MAX_STUDENTS);
        return 1;
    }

    for (int s = 0; s < n; s++) {
        printf("Student %d name:\n", s + 1);
        read_line(names[s], NAME_LEN);
        printf("Marks (Bangla English Math):\n");
        read_line(line, sizeof line);
        sscanf(line, "%d %d %d", &marks[s][0], &marks[s][1], &marks[s][2]);
        totals[s] = total_of(marks[s], SUBJECTS);
    }

    printf("\n%-3s %-14s %6s %7s %5s %6s  %s\n", "No", "Name", "Bangla", "English", "Math", "Total", "Result");
    for (int s = 0; s < n; s++) {
        printf("%-3d %-14s %6d %7d %5d %6d  %s\n", s + 1, names[s], marks[s][0], marks[s][1], marks[s][2], totals[s],
               all_passed(marks[s], SUBJECTS) ? "PASS" : "FAIL");
    }
    printf("%-18s %6.2f %7.2f %5.2f\n", "Subject averages:", column_average(marks, n, 0), column_average(marks, n, 1), column_average(marks, n, 2));

    int top = find_topper(totals, n);
    printf("Topper: %s (%d)\n", names[top], totals[top]);

    printf("Search for a name:\n");
    read_line(key, NAME_LEN);
    int found = find_student(names, n, key);
    if (found >= 0) {
        printf("Found: %s is student %d with total %d.\n", names[found], found + 1, totals[found]);
    } else {
        printf("\"%s\" is not in the list.\n", key);
    }
    return 0;
}
```

```input
3
Anika Rahman
72 65 90
Rafi Ahmed
85 28 60
Sadia Islam
55 48 62
Rafi Ahmed
```

```output
How many students (max 5)?
Student 1 name:
Marks (Bangla English Math):
Student 2 name:
Marks (Bangla English Math):
Student 3 name:
Marks (Bangla English Math):

No  Name           Bangla English  Math  Total  Result
1   Anika Rahman       72      65    90    227  PASS
2   Rafi Ahmed         85      28    60    173  FAIL
3   Sadia Islam        55      48    62    165  PASS
Subject averages:   70.67   47.00 70.67
Topper: Anika Rahman (227)
Search for a name:
Found: Rafi Ahmed is student 2 with total 173.
```

**Differentiation.** Support: provide `read_line` and the table header, and let students write the loops. Stretch: ask for the sorted ranking, then discuss why a 2D `char` array is wasteful for names of very different lengths (a preview of dynamic memory).

**Discussion questions (not for the student quiz).** Why did the designers of C leave array bounds unchecked, and what did it cost? What would a spreadsheet's row and column index look like as a 2D array?
