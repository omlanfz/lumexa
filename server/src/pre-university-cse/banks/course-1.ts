// FILE PATH: server/src/pre-university-cse/banks/course-1.ts
//
// Course Assessment 1 — Programming Foundations with C (8 lessons). Part A: 10 multiple choice
// (four are verified by compiling and running the code), Part B: 3 short answers, Part C: one practical.

import { codeOut, crit, mcq, practical, shortAnswer, structuredBank } from '../../structured-assessments/structured.helpers';

export const COURSE_1_BANK = structuredBank({
  id: 'structured/programming-foundations-with-c',
  title: 'Course Assessment: Programming Foundations with C',
  kind: 'COURSE_TEST',
  mcq: [
    mcq(
      1,
      'A teacher asks you to solve a problem with a program. Which order of steps is the sound one?',
      'Understand the problem, design the algorithm with a flowchart or pseudocode, write the code, then test and debug it',
      [
        'Write the code first, draw the flowchart afterwards, and test only if the program does not compile',
        'Choose the data types, write the output statements, and describe the problem when the program is finished',
        'Test the program on the final data, write the code, and design the algorithm if the tests fail',
      ],
      'An algorithm is designed before it is coded, and the finished program is tested against the original problem. Planning first saves most of the debugging.',
    ),
    codeOut(
      2,
      'c',
      `#include <stdio.h>

int main(void) {
    int a = 17, b = 5;
    printf("%d %d %.1f\\n", a / b, a % b, (double)a / b);
    return 0;
}`,
      '3 2 3.4',
      ['3 2 3.0', '3.4 2 3.4', '3 3 3.4'],
      'Both operands of 17 / 5 are integers, so the division truncates to 3; 17 % 5 is the remainder 2; the cast makes the third division a floating-point 3.4.',
    ),
    codeOut(
      3,
      'c',
      `#include <stdio.h>

int main(void) {
    int marks = 72;
    if (marks >= 80) printf("A");
    else if (marks >= 70) printf("B");
    else if (marks >= 60) printf("C");
    else printf("F");
    printf("\\n");
    return 0;
}`,
      'B',
      ['A', 'C', 'BC'],
      'An else-if ladder stops at the first true condition: 72 is not at least 80, but it is at least 70, so only B is printed and the lower tests are never evaluated.',
    ),
    codeOut(
      4,
      'c',
      `#include <stdio.h>

int main(void) {
    int total = 0;
    for (int i = 1; i <= 10; i++) {
        if (i % 2 == 0) continue;
        if (i > 7) break;
        total += i;
    }
    printf("%d\\n", total);
    return 0;
}`,
      '16',
      ['25', '28', '12'],
      'continue skips the even numbers and break ends the loop at 9, so the odd numbers 1, 3, 5 and 7 are added: 16.',
    ),
    mcq(
      5,
      'A variable is declared inside the function total() of a C program. What is true about it?',
      'It is local: only total() can use it, and it ceases to exist when the function returns',
      [
        'It is global: every function in the file can read it as long as the program runs',
        'It keeps its value between calls of total(), so the next call starts where the last one ended',
        'It is visible to the caller of total(), which can read it by name after the call',
      ],
      'Variables declared in a function have local scope and automatic storage: they are created when the function is called and destroyed when it returns. Only a static or a global variable survives between calls.',
    ),
    codeOut(
      6,
      'c',
      `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "code";
    printf("%zu %zu %c\\n", sizeof s, strlen(s), s[1]);
    return 0;
}`,
      '5 4 o',
      ['4 4 o', '5 5 c', '4 5 o'],
      'The array holds the four letters and the terminating null character, so sizeof gives 5 while strlen stops at the null and gives 4; s[1] is the second character, o.',
    ),
    codeOut(
      7,
      'c',
      `#include <stdio.h>

int main(void) {
    int x = 10;
    int *p = &x;
    *p = *p + 5;
    printf("%d %d\\n", x, *p);
    return 0;
}`,
      '15 15',
      ['10 15', '15 10', '10 10'],
      'p holds the address of x, so writing through *p changes x itself. Both x and *p now read the same memory location, which holds 15.',
    ),
    mcq(
      7,
      'A program calls malloc() for an array and later stops using it, but never calls free(). What is the result?',
      'A memory leak: the block stays reserved until the program ends, so a long-running program can run out of memory',
      [
        'A compile error, because every malloc() must be matched by a free() before the program can be built',
        'The operating system immediately corrupts the array so that it cannot be read again',
        'Nothing at all, because C frees every block automatically when the pointer goes out of scope',
      ],
      'C has no garbage collector. Memory obtained with malloc() belongs to the program until free() is called, so forgetting it leaks the block.',
    ),
    mcq(
      3,
      'A student writes "if (score = 50)" instead of "if (score == 50)". What does the code do?',
      'It assigns 50 to score and the condition is always true, because a non-zero value counts as true',
      [
        'It compares score with 50 and the condition is true only when they are equal',
        'It refuses to compile, because a condition may never contain an assignment',
        'It sets score to 0 first and then compares it with 50, so the condition is always false',
      ],
      'A single = is assignment, and the value of an assignment expression is the value assigned. 50 is non-zero, so the condition is true for every score and score is overwritten.',
    ),
    codeOut(
      5,
      'c',
      `#include <stdio.h>

void bump(int a[], int n) {
    for (int i = 0; i < n; i++) a[i] *= 2;
}

int main(void) {
    int v[3] = {1, 2, 3};
    bump(v, 3);
    printf("%d %d %d\\n", v[0], v[1], v[2]);
    return 0;
}`,
      '2 4 6',
      ['1 2 3', '2 3 4', '1 4 9'],
      'An array parameter is passed as the address of its first element, so bump() works on the caller\'s own array and the doubling is still there after the call.',
    ),
  ],
  shortAnswers: [
    shortAnswer(
      4,
      'Trace this program and write exactly what it prints. Then say how many times the statement inside the inner loop runs, and why.\n\n```c\nfor (int i = 1; i <= 3; i++)\n    for (int j = 1; j <= i; j++)\n        printf("%d", i * j);\n```',
      'The program prints 124369. For i = 1 the inner loop runs once and prints 1; for i = 2 it runs twice and prints 2 and 4; for i = 3 it runs three times and prints 3, 6 and 9. The inner statement therefore runs 1 + 2 + 3 = 6 times, because the upper limit of j is i, so the inner loop gets longer on each pass of the outer loop.',
      [
        crit('Correct output', 2, 'The printed text is exactly 124369 (2 marks); 1 mark if the digits are right but the order or grouping is wrong.'),
        crit('Count with reason', 2, 'States 6 runs and explains 1 + 2 + 3 because the inner loop limit is i (1 mark for the count alone).'),
        crit('Trace or explanation', 1, 'Shows the values of i and j, or explains how nested loops repeat the inner loop completely for every outer pass.'),
      ],
    ),
    shortAnswer(
      7,
      'A program contains `int *p = malloc(3 * sizeof(int));`. Explain what this line does in memory, how the program should stop using the block, and what goes wrong if p is used after that. Name the problem and one habit that prevents it.',
      'malloc reserves a block of 3 * sizeof(int) bytes on the heap and returns its address, which is stored in the pointer p (or NULL if the request fails, which should be checked). When the block is no longer needed the program calls free(p); forgetting this is a memory leak. After free the pointer still holds the old address but the memory is no longer the program\'s, so using p is undefined behaviour: p is a dangling pointer. A good habit is to set p = NULL right after free(p) and to check pointers before use.',
      [
        crit('Allocation explained', 2, 'Says that a block of 3 ints is reserved on the heap and its address is kept in p; mentions that NULL means failure.'),
        crit('Release', 1, 'Says free(p) returns the block, and that forgetting it is a memory leak.'),
        crit('Dangling pointer and prevention', 2, 'Names the dangling pointer, says that use after free is undefined behaviour, and gives a habit such as p = NULL after free.'),
      ],
    ),
    shortAnswer(
      8,
      'A program must keep the roll number, the name and the marks of 40 students and save them to a file so that they can be read in the next run. Describe the data type you would define, the functions you would write (names and what each does) and the file functions you would call, including how you would deal with a file that cannot be opened.',
      'Define a struct Student with an int roll, a char name[50] and a float marks, and keep 40 of them in an array of struct Student. Write functions such as add_student, print_all, save and load. save opens the file with fopen in "w" or "wb" mode, writes each record with fprintf or fwrite and closes it with fclose; load opens it with "r" or "rb" and reads with fscanf or fread. fopen returns NULL when the file cannot be opened, so the program checks for NULL, prints a message (for example with perror) and does not continue to read or write.',
      [
        crit('Data type', 2, 'A struct with the three fields and an array of 40 (or a clear alternative); fields have suitable types.'),
        crit('Functions and file calls', 2, 'Names sensible functions and uses fopen, fprintf/fwrite or fscanf/fread, and fclose with correct modes.'),
        crit('Error handling', 1, 'Checks that fopen returned NULL and reacts, for example with a message and a safe exit.'),
      ],
    ),
  ],
  practical: practical({
    title: 'Result statistics with functions and arrays',
    language: 'c',
    instructions:
      'A teacher keeps the marks of eight students in an array. Write a C program that reports on them.\n\n' +
      '1. Store these marks in an array: 72, 45, 88, 30, 91, 66, 58, 79.\n' +
      '2. Write a function `double average(const int marks[], int n)` that returns the average.\n' +
      '3. Write a function `int count_passed(const int marks[], int n, int pass_mark)` that returns how many marks are at least the pass mark (use 40).\n' +
      '4. Write a function `char grade(int mark)` that returns A for 80 or more, B for 70 to 79, C for 60 to 69, D for 40 to 59 and F below 40.\n' +
      '5. In main, print the average with one decimal, the highest mark, the number of students who passed, and then one line per student with the mark and the grade.\n\n' +
      'Use loops (no hard-coded totals), keep the logic in the functions, and make the program print exactly one line per student in the order of the array. ' +
      'Expected first lines: `Average: 66.1`, `Highest: 91`, `Passed: 7 of 8`.',
    starterCode:
      '#include <stdio.h>\n\n' +
      '/* Write average(), count_passed() and grade() here. */\n\n' +
      'int main(void) {\n' +
      '    int marks[8] = {72, 45, 88, 30, 91, 66, 58, 79};\n' +
      '    /* Print the average, the highest mark, the passes and one line per student. */\n' +
      '    return 0;\n' +
      '}\n',
    deliverables: [
      'Your complete C program',
      'The output of one run (copy the lines that the program prints)',
    ],
    rubric: [
      crit('Correct results', 6, 'The average 66.1, the highest 91 and 7 of 8 passed are right; every grade is right (about 1 mark each part).'),
      crit('Functions and parameters', 4, 'average, count_passed and grade are separate functions with suitable parameters and return types, and main only calls them.'),
      crit('Loops, arrays and conditions', 4, 'Uses loops over the array without hard-coded totals, finds the maximum correctly, and uses an if-else ladder for the grade.'),
      crit('Output format and edge cases', 3, 'Output matches the required format (one decimal, one line per student); the average avoids integer division.'),
      crit('Code quality', 3, 'Clear names, consistent indentation and short comments; no unused variables or warnings.'),
    ],
  }),
});
