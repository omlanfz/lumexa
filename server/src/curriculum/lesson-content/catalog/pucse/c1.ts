// FILE PATH: server/src/curriculum/lesson-content/catalog/pucse/c1.ts
//
// Pre-University CSE · Course 1 · Programming Foundations with C — visuals and the Mini Quiz of every lesson.
// Keys are lineage keys: "<course-slug>/<lesson position>". Every "what does this print?" question carries
// the real program (checked by running it in pre-university-cse.spec.ts when gcc is available).

import { registerVisualCatalog } from '../../visual-catalog';
import { registerQuizCatalog } from '../../quiz-catalog';
import { arrays, bitExplorer, cards, circuit, flow, grid, lab, mcq, memory, sequence, stackQueue, table, trace, truthTable } from './helpers';

const C = (code: string) => ({ language: 'c', code });
const M = 'programming-foundations-with-c';

registerVisualCatalog({
  [`${M}/1`]: [
    grid(
      'result-flowchart',
      'Flowcharts',
      'A flowchart of the result algorithm. START, then read the name and the three marks, then calculate the total, then the average. A diamond asks whether all three marks are at least 33. Yes leads to result PASS, no leads to result FAIL. Both join to display the result, then END.',
      'The result algorithm for one student: one decision, two outcomes, one way out.',
      [
        ['s', 'terminator', 'START', 0, 0, 'good'],
        ['in', 'io', 'READ name, mark1, mark2, mark3', 0, 1],
        ['tot', 'process', 'total ← mark1 + mark2 + mark3', 0, 2],
        ['avg', 'process', 'average ← total / 3', 0, 3],
        ['d', 'decision', 'All three marks ≥ 33?', 0, 4.1, 'warn'],
        ['p', 'process', 'result ← "PASS"', -1.15, 5.3, 'good'],
        ['f', 'process', 'result ← "FAIL"', 1.15, 5.3, 'bad'],
        ['out', 'io', 'DISPLAY name, total, average, result', 0, 6.4],
        ['e', 'terminator', 'END', 0, 7.4, 'good'],
      ],
      [
        ['s', 'in'],
        ['in', 'tot'],
        ['tot', 'avg'],
        ['avg', 'd'],
        ['d', 'p', 'Yes'],
        ['d', 'f', 'No'],
        ['p', 'out'],
        ['f', 'out'],
        ['out', 'e'],
      ],
      { dx: 215, dy: 76, w: 210 },
    ),
    flow(
      'source-to-output',
      'Why C, and how a C program runs',
      'A pipeline: you write source code in a .c file, the compiler checks it and translates it, an executable file of machine code is produced, and running it gives the output.',
      'A compiled language is translated once, before it runs.',
      ['You write|hello.c (source code)|accent', 'Compiler (gcc)|checks the syntax, translates|accent2', 'Executable|machine code the CPU runs', 'Run it|./hello|good', 'Output|Hello, SRMS!|good'],
      { perRow: 5 },
    ),
    lab(
      'hello-lab',
      'The shape of a first C program',
      'c',
      'A C code editor containing the Hello, SRMS program, with the output it should print.',
      'Run it, then change the text between the quotation marks and run it again.',
      `#include <stdio.h>

int main(void)
{
    printf("Hello, SRMS!\\n");
    return 0;
}`,
      { expected: 'Hello, SRMS!', hint: 'If nothing happens, check that the line ends with a semicolon and that the quotation marks are straight ones (").', at: 'end', filename: 'hello.c' },
    ),
    cards(
      'three-error-kinds',
      'Common Mistakes and Misconceptions',
      'Three cards for the three kinds of error: a syntax error stops the compiler, a runtime error crashes a running program, and a logic error runs but gives the wrong answer.',
      'Every bug you will ever meet is one of these three.',
      [
        { title: 'Syntax error', badge: 'Compiler stops', tone: 'bad', bullets: ['Breaks the grammar of C', 'Example: a missing semicolon', 'The compiler tells you the line'] },
        { title: 'Runtime error', badge: 'Program crashes', tone: 'warn', bullets: ['Compiles fine, fails while running', 'Example: dividing by zero', 'Appears only with certain input'] },
        { title: 'Logic error', badge: 'Wrong answer', tone: 'info', bullets: ['Compiles and runs without complaint', 'Example: dividing by 2 instead of 3', 'Only careful testing finds it'] },
      ],
      { at: 'end' },
    ),
  ],
  [`${M}/2`]: [
    memory(
      'variables-in-memory',
      'Variables: named boxes in memory',
      'A memory diagram of the stack: five variables with example addresses and values. bangla holds 72, english 65, math 90, total 227 and average 75.67, each in its own cell.',
      'Each variable is a named cell: its type decides how many bytes it takes. (The addresses are only examples; yours will differ.)',
      [
        {
          label: 'Stack (variables of main)',
          cells: [
            { name: 'bangla', addr: '0x7ffc2a10', value: '72', type: 'int' },
            { name: 'english', addr: '0x7ffc2a14', value: '65', type: 'int' },
            { name: 'math', addr: '0x7ffc2a18', value: '90', type: 'int' },
            { name: 'total', addr: '0x7ffc2a1c', value: '227', type: 'int' },
            { name: 'average', addr: '0x7ffc2a20', value: '75.67', type: 'double', note: '8 bytes' },
          ],
        },
      ],
    ),
    bitExplorer('overflow-explorer', 'Data types', 'An 8-bit explorer: switch the bits and read the value in binary, decimal, hexadecimal and two’s complement. Starting at 127, adding 1 wraps to -128.', 'Press + 1 on 127: a fixed number of bits wraps around. That is overflow.', 8, 127, { at: 'end', mode: 'twos' }),
    trace(
      'integer-division-trace',
      'Integer division and casting',
      'A step-through of three lines: total is 227, the integer division 227 / 3 gives 75 which is stored as 75.0, and the cast version gives 75.666666666666671.',
      'The division happens first, in integers; only then is the answer stored in a double.',
      ['int total = 227;', 'double wrong = total / 3;', 'double right = (double)total / 3;', 'printf("%.2f %.2f", wrong, right);'],
      [
        { line: 1, vars: { total: 227 }, note: 'total holds the whole number 227.' },
        { line: 2, vars: { total: 227, wrong: 75 }, note: 'Both operands are int, so 227 / 3 is integer division = 75. The 0.67 is already gone when 75 is stored as 75.0.' },
        { line: 3, vars: { total: 227, wrong: 75, right: 75.67 }, note: '(double)total makes one operand a double, so the division keeps its decimals: 75.666…' },
        { line: 4, vars: { total: 227, wrong: 75, right: 75.67 }, output: '75.00 75.67', note: '%.2f prints two decimals, so the lost fraction shows clearly.' },
      ],
      { at: 'end' },
    ),
    lab(
      'precedence-lab',
      'Guided Hands-On Activity',
      'c',
      'A C editor with the Example 2 program about integer division, remainder and precedence, and its expected output.',
      'Predict each line, run the program (or copy it to your own compiler), then change one thing and predict again.',
      `#include <stdio.h>

int main(void)
{
    int total = 227;
    printf("%d\\n", total / 3);
    printf("%.2f\\n", (double)total / 3);
    printf("%d\\n", total % 3);
    printf("%d\\n", 2 + 3 * 4);
    printf("%d\\n", (2 + 3) * 4);
    return 0;
}`,
      { expected: '75\n75.67\n2\n14\n20', filename: 'division.c', at: 'end' },
    ),
  ],
  [`${M}/3`]: [
    truthTable(
      'logic-operators-table',
      'Relational and logical operators',
      'A truth table for p and q showing p AND q, p OR q, NOT (p AND q) and (NOT p) OR (NOT q). The last two columns are the same in every row.',
      'Try to fill each column on paper first, then check: the last two columns match, which is De Morgan\u2019s law.',
      ['p', 'q'],
      [['p && q', 'p and q'], ['p || q', 'p or q'], ['!(p && q)', 'not (p and q)'], ['!p || !q', 'not p or not q']],
      { reveal: false, at: 'end' },
    ),
    circuit(
      'pass-rule-circuit',
      'Relational and logical operators',
      'A logic circuit for the pass rule: three inputs M1, M2 and M3 mean each mark is at least 33. Two AND gates in a row give PASS only when all three inputs are 1.',
      'The pass rule is an AND of three conditions: logic in software and logic in hardware are the same idea.',
      { inputs: [{ id: 'M1', label: 'M1' }, { id: 'M2', label: 'M2' }, { id: 'M3', label: 'M3' }], gates: [{ id: 'g1', type: 'AND', in: ['M1', 'M2'] }, { id: 'g2', type: 'AND', in: ['g1', 'M3'] }], outputs: [{ id: 'PASS', from: 'g2', label: 'PASS' }], truthTable: true },
      { at: 'end' },
    ),
    grid(
      'grade-ladder',
      'Choosing among many: else if',
      'A flowchart of the grade ladder: six decisions in a column, each asking whether the mark is at least a threshold from 80 down to 33. Yes leads to a grade; No falls to the next decision; below 33 the grade is F.',
      'C runs down the ladder and stops at the first Yes: the order of the tests is the logic.',
      [
        ['d1', 'decision', 'mark ≥ 80 ?', 0, 0, 'warn'], ['o1', 'process', 'A+  ·  5.00', 1.3, 0, 'good'],
        ['d2', 'decision', 'mark ≥ 70 ?', 0, 1, 'warn'], ['o2', 'process', 'A  ·  4.00', 1.3, 1, 'good'],
        ['d3', 'decision', 'mark ≥ 60 ?', 0, 2, 'warn'], ['o3', 'process', 'A-  ·  3.50', 1.3, 2, 'good'],
        ['d4', 'decision', 'mark ≥ 50 ?', 0, 3, 'warn'], ['o4', 'process', 'B  ·  3.00', 1.3, 3, 'good'],
        ['d5', 'decision', 'mark ≥ 40 ?', 0, 4, 'warn'], ['o5', 'process', 'C  ·  2.00', 1.3, 4, 'good'],
        ['d6', 'decision', 'mark ≥ 33 ?', 0, 5, 'warn'], ['o6', 'process', 'D  ·  1.00', 1.3, 5, 'good'],
        ['o7', 'process', 'F  ·  0.00', 0, 6.1, 'bad'],
      ],
      [['d1', 'o1', 'Yes'], ['d1', 'd2', 'No'], ['d2', 'o2', 'Yes'], ['d2', 'd3', 'No'], ['d3', 'o3', 'Yes'], ['d3', 'd4', 'No'], ['d4', 'o4', 'Yes'], ['d4', 'd5', 'No'], ['d5', 'o5', 'Yes'], ['d5', 'd6', 'No'], ['d6', 'o6', 'Yes'], ['d6', 'o7', 'No']],
      { dx: 215, dy: 66, w: 170, h: 52, at: 'end' },
    ),
    lab(
      'grade-point-lab',
      'Guided Hands-On Activity',
      'c',
      'A C editor with the grade-point program, with the input 65 prepared and the output it should print.',
      'Run it (or copy it to your own compiler), then change the input to each boundary mark and compare with your predictions.',
      `#include <stdio.h>

int main(void)
{
    int mark;
    double point;

    printf("Enter a mark:\\n");
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
    printf("Grade point: %.2f\\n", point);
    return 0;
}`,
      { stdin: '65', expected: 'Enter a mark:\nGrade point: 3.50', filename: 'grade.c', at: 'end' },
    ),
  ],
  [`${M}/4`]: [
    grid(
      'loop-flowchart',
      'The for loop',
      'A flowchart of a for loop: set i to 1, then a decision asks whether i is at most 5. Yes runs the body and then adds 1 to i and goes back to the decision. No leaves the loop and ends.',
      'Every loop is this shape: initialise once, test, run the body, update, test again.',
      [
        ['s', 'terminator', 'START', 0, 0, 'good'],
        ['init', 'process', 'i ← 1', 0, 1],
        ['c', 'decision', 'i ≤ 5 ?', 0, 2.2, 'warn'],
        ['b', 'process', 'body: print i', 0, 3.5],
        ['u', 'process', 'i ← i + 1', 0, 4.5],
        ['e', 'terminator', 'END', -1.5, 2.2, 'good'],
      ],
      [['s', 'init'], ['init', 'c'], ['c', 'b', 'Yes'], ['b', 'u'], ['u', 'c', '', { curve: 70 }], ['c', 'e', 'No']],
      { dx: 200, dy: 74, w: 170, h: 50, at: 'end' },
    ),
    trace(
      'for-sum-trace',
      'Program execution: following the flow of control',
      'A step-through of a for loop that adds 1, 2 and 3 into sum: after the third pass sum is 6 and the loop ends when i becomes 4.',
      'Watch i and sum change on every pass: this is what a trace table records.',
      ['int sum = 0;', 'for (int i = 1; i <= 3; i++) {', '    sum += i;', '}', 'printf("%d", sum);'],
      [
        { line: 1, vars: { sum: 0 }, note: 'The accumulator starts at 0, before the loop.' },
        { line: 2, vars: { sum: 0, i: 1 }, note: 'i is set to 1 and i <= 3 is true, so the body runs.' },
        { line: 3, vars: { sum: 1, i: 1 }, note: 'sum becomes 0 + 1.' },
        { line: 2, vars: { sum: 1, i: 2 }, note: 'The update i++ makes i 2; 2 <= 3 is true.' },
        { line: 3, vars: { sum: 3, i: 2 }, note: 'sum becomes 1 + 2.' },
        { line: 2, vars: { sum: 3, i: 3 }, note: 'i is 3; 3 <= 3 is still true.' },
        { line: 3, vars: { sum: 6, i: 3 }, note: 'sum becomes 3 + 3.' },
        { line: 2, vars: { sum: 6, i: 4 }, note: 'i is 4; 4 <= 3 is false, so the loop ends.' },
        { line: 5, vars: { sum: 6, i: 4 }, output: '6', note: 'After the loop the total is ready to use.' },
      ],
      { at: 'end' },
    ),
    lab(
      'sentinel-lab',
      'Guided Hands-On Activity',
      'c',
      'A C editor with the sentinel-loop program that reads marks until -1, with the input 72, 65, 90, -1 prepared.',
      'Run it (or copy it to your own compiler), then change the input: what happens with no marks at all?',
      `#include <stdio.h>

int main(void)
{
    int mark, count = 0, sum = 0, highest = -1;

    printf("Enter marks, -1 to finish:\\n");
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
        printf("Marks: %d, average: %.2f, highest: %d\\n", count, (double)sum / count, highest);
    } else {
        printf("No marks entered.\\n");
    }
    return 0;
}`,
      { stdin: '72\n65\n90\n-1', expected: 'Enter marks, -1 to finish:\nMarks: 3, average: 75.67, highest: 90', filename: 'marks.c', at: 'end' },
    ),
  ],
  [`${M}/5`]: [
    sequence(
      'call-and-return',
      'Anatomy of a function',
      'A sequence diagram: main calls grade_point with the argument 72, the function runs with mark equal to 72 and returns 4.0 to main.',
      'Arguments go in as copies; one value comes back.',
      [['main', 'main()'], ['fn', 'grade_point(int mark)']],
      [
        { from: 'main', to: 'fn', label: 'grade_point(72)', note: 'mark is a copy of 72' },
        { from: 'fn', to: 'main', label: 'return 4.0', note: 'the function’s variables disappear', dashed: true },
      ],
    ),
    memory(
      'pass-by-value-memory',
      'Pass by value',
      'A memory diagram with two stack frames. main has a variable mark holding 5. The function try_to_change has its own variable mark holding 99. They are different cells with different addresses.',
      'The two variables are both called mark, but they are different boxes: changing one never changes the other.',
      [
        { label: 'Frame of main()', cells: [{ name: 'mark', addr: '0x7ffc3a1c', value: '5', type: 'int', note: 'unchanged' }] },
        { label: 'Frame of try_to_change()', cells: [{ name: 'mark', addr: '0x7ffc3a0c', value: '99', type: 'int', note: 'a copy of 5, then set to 99', tone: 'warn' }] },
      ],
    ),
    stackQueue(
      'factorial-call-stack',
      'Recursion and the call stack',
      'A call stack for factorial(3): main calls factorial(3), which calls factorial(2), which calls factorial(1). factorial(1) is the base case and returns 1, then the frames are removed one by one as 2 and 6 are returned.',
      'Frames pile up on the way down to the base case and are removed on the way back up.',
      'call-stack',
      [
        { items: ['main()'], note: 'The program starts in main.' },
        { items: ['main()', 'factorial(3)  n = 3'], op: 'main calls factorial(3)', note: 'A new frame is pushed with n = 3. It must wait for factorial(2).' },
        { items: ['main()', 'factorial(3)  n = 3', 'factorial(2)  n = 2'], op: 'factorial(3) calls factorial(2)', note: 'Another frame. n = 2, and again the answer depends on a smaller call.' },
        { items: ['main()', 'factorial(3)  n = 3', 'factorial(2)  n = 2', 'factorial(1)  n = 1'], op: 'factorial(2) calls factorial(1)', note: 'n <= 1: this is the base case. It will return 1 without calling anything.' },
        { items: ['main()', 'factorial(3)  n = 3', 'factorial(2)  n = 2'], op: 'factorial(1) returns 1', note: 'The top frame is popped. factorial(2) can now work out 2 * 1.' },
        { items: ['main()', 'factorial(3)  n = 3'], op: 'factorial(2) returns 2', note: 'Popped. factorial(3) can now work out 3 * 2.' },
        { items: ['main()'], op: 'factorial(3) returns 6', note: 'The stack is back to main, which receives 6.' },
      ],
    ),
    lab(
      'grade-point-function-lab',
      'Worked Examples',
      'c',
      'A C editor with the grade_point function and a main that calls it three times, with the expected output.',
      'Change one threshold inside grade_point and run again: every call changes, because the logic lives in one place.',
      `#include <stdio.h>

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
    printf("72 -> %.2f\\n", grade_point(72));
    printf("33 -> %.2f\\n", grade_point(33));
    printf("28 -> %.2f\\n", grade_point(28));
    return 0;
}`,
      { expected: '72 -> 4.00\n33 -> 1.00\n28 -> 0.00', filename: 'grade_function.c', at: 'end' },
    ),
  ],
  [`${M}/6`]: [
    arrays(
      'marks-array',
      'Arrays: many values, one name',
      'An array of five marks drawn as boxes with indexes 0 to 4 underneath, and again after marks[3] is set to 45. Only the fourth box changes.',
      'The index counts from the start: the first element is marks[0], the last is marks[4].',
      [
        { label: 'marks', cells: [72, 65, 90, 41, 58] },
        { label: 'after marks[3] = 45;', cells: [72, 65, 90, 45, 58], highlight: [{ from: 3, to: 3, tone: 'warn' }] },
      ],
    ),
    arrays(
      'string-array',
      'Strings: arrays of characters',
      'The string Anika stored in a char array of 30 cells: the letters A, n, i, k, a in cells 0 to 4, then the null character in cell 5, then unused cells.',
      'A string needs one more cell than it has letters: the \\0 that marks the end.',
      [{ label: 'name[30] = "Anika"', cells: ['A', 'n', 'i', 'k', 'a', '\\0', '?', '?', '?', '…'], highlight: [{ from: 5, to: 5, tone: 'bad' }], dim: [6, 7, 8, 9] }],
    ),
    table(
      'marks-2d-table',
      'Two-dimensional arrays',
      'A table for the 2D array marks with three rows (students) and three columns (subjects). The cell marks[1][2], which holds 60, is highlighted.',
      'marks[row][column]: the first index picks the student, the second picks the subject.',
      ['', 'column 0', 'column 1', 'column 2'],
      [['row 0', 72, 65, 90], ['row 1', 85, 28, 60], ['row 2', 55, 48, 62]],
      { highlights: [{ row: 1, col: 3, tone: 'warn', note: 'marks[1][2]' }] },
    ),
    lab(
      'table-lab',
      'Worked Examples',
      'c',
      'A C editor with the program that prints row totals and column averages of a 2D marks table, with its expected output.',
      'Add a fourth student: change STUDENTS and the initial table, and run again. Which loops needed no change?',
      `#include <stdio.h>

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
        printf("student %d total: %d\\n", s + 1, total);
    }
    for (int j = 0; j < SUBJECTS; j++) {
        int sum = 0;
        for (int s = 0; s < STUDENTS; s++) {
            sum += marks[s][j];
        }
        printf("subject %d average: %.2f\\n", j + 1, (double)sum / STUDENTS);
    }
    return 0;
}`,
      { expected: 'student 1 total: 227\nstudent 2 total: 173\nstudent 3 total: 165\nsubject 1 average: 70.67\nsubject 2 average: 47.00\nsubject 3 average: 70.67', filename: 'table.c', at: 'end' },
    ),
  ],
  [`${M}/7`]: [
    memory(
      'pointer-basics-memory',
      'Pointers: variables that hold addresses',
      'A memory diagram: x holds 42 at one address. p is a pointer whose value is the address of x, and an arrow goes from p to x.',
      'p holds an address; *p is the thing at that address. (The addresses are examples; they change on every run.)',
      [
        {
          label: 'Stack',
          cells: [
            { name: 'x', addr: '0x7ffc3a1c', value: '42', type: 'int' },
            { name: 'p', addr: '0x7ffc3a20', value: '0x7ffc3a1c', type: 'int *', pointsTo: '0x7ffc3a1c', note: '&x' },
          ],
        },
      ],
    ),
    arrays(
      'pointer-arithmetic',
      'Arrays and pointers',
      'An array of five marks with a pointer named marks at index 0 and a pointer named marks plus 2 at index 2. Adding 2 to the pointer moves it two elements along, to the value 90.',
      'marks + 2 is the address of marks[2]: pointer arithmetic moves in whole elements, not bytes.',
      [{ label: 'marks (int)', cells: [72, 65, 90, 41, 58], pointers: [{ index: 0, label: 'marks' }, { index: 2, label: 'marks + 2', tone: 'warn' }], highlight: [{ from: 2, to: 2, tone: 'warn' }] }],
    ),
    memory(
      'stack-and-heap',
      'malloc, calloc, realloc and free',
      'A stack and heap diagram: on the stack the variable n holds 4 and the pointer marks holds the address of a block on the heap. The heap block holds four ints: 60, 70, 80 and 90.',
      'The pointer lives on the stack; the memory it points to lives on the heap until you call free.',
      [
        {
          label: 'Stack',
          cells: [
            { name: 'n', addr: '0x7ffc3a1c', value: '4', type: 'int' },
            { name: 'marks', addr: '0x7ffc3a20', value: '0x55d0a1c0', type: 'int *', pointsTo: '0x55d0a1c0' },
          ],
        },
        {
          label: 'Heap (malloc(4 * sizeof *marks))',
          cells: [
            { name: 'marks[0]', addr: '0x55d0a1c0', value: '60', type: 'int', tone: 'good' },
            { name: 'marks[1]', addr: '0x55d0a1c4', value: '70', type: 'int', tone: 'good' },
            { name: 'marks[2]', addr: '0x55d0a1c8', value: '80', type: 'int', tone: 'good' },
            { name: 'marks[3]', addr: '0x55d0a1cc', value: '90', type: 'int', tone: 'good' },
          ],
        },
      ],
    ),
    lab(
      'pointer-basics-lab',
      'Worked Examples',
      'c',
      'A C editor with the pointer basics program and its expected output.',
      'Change *p = 99 to *p = 7 and predict x before you run it.',
      `#include <stdio.h>

int main(void)
{
    int x = 42;
    int *p = &x;

    printf("x = %d, *p = %d\\n", x, *p);
    *p = 99;
    printf("after *p = 99: x = %d\\n", x);
    printf("p points to x? %d\\n", p == &x);
    return 0;
}`,
      { expected: 'x = 42, *p = 42\nafter *p = 99: x = 99\np points to x? 1', filename: 'pointers.c', at: 'end' },
    ),
  ],
  [`${M}/8`]: [
    memory(
      'struct-in-memory',
      'Structures and pointers',
      'A memory diagram of one Student variable named a. Its members sit side by side in one block: roll 101, name Anika Rahman, the marks 72, 65 and 90, and the total 227. A pointer s holds the address of the first byte of that block.',
      'A structure is one block of memory with its members side by side. s->total means "follow s to the block, then step to the total member". (The addresses are examples, and the 2 bytes of padding are typical for a 64-bit computer.)',
      [
        {
          label: 'Student a (52 bytes)',
          cells: [
            { name: 'a.roll', addr: '0x7ffc3a00', value: '101', type: 'int' },
            { name: 'a.name', addr: '0x7ffc3a04', value: '"Anika Rahman"', type: 'char[30]', note: '30 bytes + 2 padding' },
            { name: 'a.marks[0]', addr: '0x7ffc3a24', value: '72', type: 'int' },
            { name: 'a.marks[1]', addr: '0x7ffc3a28', value: '65', type: 'int' },
            { name: 'a.marks[2]', addr: '0x7ffc3a2c', value: '90', type: 'int' },
            { name: 'a.total', addr: '0x7ffc3a30', value: '227', type: 'int' },
          ],
        },
        {
          label: 'A pointer to it',
          cells: [{ name: 's', addr: '0x7ffc3a60', value: '0x7ffc3a00', type: 'Student *', pointsTo: '0x7ffc3a00', note: '&a' }],
        },
      ],
      { at: 'end' },
    ),
    table(
      'file-modes',
      'Files: data that survives',
      'A table of the three file modes. Mode r reads and keeps the data but fails with NULL if the file is missing. Mode w writes and erases an existing file, or creates a new one. Mode a appends to the end and keeps the data, or creates a new file.',
      'The mode decides what happens to a file that is already there. "w" is the dangerous one.',
      ['Mode', 'Opens the file for', 'If the file already exists', 'If the file is missing'],
      [
        ['"r"', 'reading', 'keeps all of its data', 'fopen returns NULL'],
        ['"w"', 'writing', 'erases everything at once', 'creates a new, empty file'],
        ['"a"', 'appending', 'keeps the data and adds at the end', 'creates a new, empty file'],
      ],
      {
        at: 'end',
        highlights: [
          { row: 1, col: 2, tone: 'bad', note: 'Old data is lost' },
          { row: 0, col: 3, tone: 'warn', note: 'Always test for NULL' },
        ],
      },
    ),
    flow(
      'save-load-round-trip',
      'Designing a file format',
      'A five-step round trip. The roster in memory is written by save_roster, which opens the file for writing, prints one line per student and closes it. The data now lives on disk in srms_data.txt, one student per line. Later, load_roster opens the file for reading, reads each line with fgets and sscanf, and closes it. The roster is back in memory with the totals and GPA recalculated.',
      'Save the inputs, then calculate the rest again after loading. The file never stores anything the program can work out.',
      ['In memory|a Roster of Student|accent', 'save_roster|fopen "w", fprintf, fclose|accent2', 'On disk|srms_data.txt, one student per line', 'load_roster|fopen "r", fgets, sscanf, fclose|accent2', 'In memory again|totals and GPA recalculated|good'],
      { perRow: 5, at: 'end' },
    ),
    grid(
      'debug-cycle',
      'Debugging: a method, not luck',
      'A flowchart of the debugging cycle. Reproduce the bug with the smallest failing input, read the evidence, form a hypothesis, test it with a print statement, an assertion or a debugger, fix one thing, then re-run the failing case and the earlier tests. A decision asks whether all tests pass: yes ends the cycle, no goes back to form a new hypothesis.',
      'Debugging is a loop of hypothesis and test. Change one thing at a time, then run every test again.',
      [
        ['rep', 'process', 'Reproduce it with the smallest failing input', 0, 0, 'accent'],
        ['ev', 'process', 'Read the evidence: message, line, wrong output', 0, 1],
        ['hyp', 'process', 'Form a hypothesis', 0, 2, 'warn'],
        ['test', 'process', 'Test it: print, assert or debugger', 0, 3],
        ['fix', 'process', 'Fix ONE thing', 0, 4, 'accent2'],
        ['rerun', 'process', 'Re-run the failing case and the old tests', 0, 5],
        ['ok', 'decision', 'All tests pass?', 0, 6.1, 'warn'],
        ['done', 'terminator', 'Bug fixed', 0, 7.3, 'good'],
      ],
      [
        ['rep', 'ev'],
        ['ev', 'hyp'],
        ['hyp', 'test'],
        ['test', 'fix'],
        ['fix', 'rerun'],
        ['rerun', 'ok'],
        ['ok', 'done', 'Yes'],
        ['ok', 'hyp', 'No', { via: [[320, 510], [320, 354], [320, 198]] }],
      ],
      { dx: 215, dy: 76, w: 210, at: 'end' },
    ),
    grid(
      'srms-architecture',
      'Project development: from requirements to a working system',
      'A block diagram of the finished SRMS. The main function runs the menu loop and calls five groups of functions: add_student; list_all and search_student; show_topper and show_stats; save_roster; and load_roster. All of them work on one Roster, the heap array of Student. Only save_roster and load_roster also reach the file srms_data.txt on disk.',
      'Every menu option ends up working on the same Roster. Only Save and Load touch the file.',
      [
        ['main', 'rect', 'main()', 2, 0, 'good', 'menu loop and switch'],
        ['add', 'rect', 'Add (1)', 0, 1, 'accent', 'add_student'],
        ['view', 'rect', 'View (2, 3)', 1, 1, 'accent', 'list_all, search_student'],
        ['stats', 'rect', 'Analyse (4, 5)', 2, 1, 'accent', 'show_topper, show_stats'],
        ['save', 'rect', 'Save (6)', 3, 1, 'accent2', 'save_roster'],
        ['load', 'rect', 'Load (7)', 4, 1, 'accent2', 'load_roster'],
        ['roster', 'rect', 'Roster', 2, 2.1, 'warn', 'heap array of Student, count, capacity'],
        ['file', 'cylinder', 'srms_data.txt', 2, 3.3, 'info', 'one student per line'],
      ],
      [
        ['main', 'add'],
        ['main', 'view'],
        ['main', 'stats'],
        ['main', 'save'],
        ['main', 'load'],
        ['add', 'roster', 'roster_add'],
        ['view', 'roster'],
        ['stats', 'roster'],
        ['save', 'roster'],
        ['load', 'roster', 'roster_add'],
        ['roster', 'file', 'save: write · load: read', { head: 'both' }],
      ],
      { dx: 178, dy: 92, w: 168, at: 'end' },
    ),
    lab(
      'file-round-trip-lab',
      'Example 2',
      'c',
      'A C editor with the file round trip program that writes two students to demo.txt, reads them back and prints their totals, with its expected output.',
      'Run it. Then change the second fopen mode to "r+" or the file name to one that does not exist, and predict what happens before you run it again.',
      `#include <stdio.h>

int main(void)
{
    FILE *out = fopen("demo.txt", "w");
    if (out == NULL) {
        printf("Cannot open the file.\\n");
        return 1;
    }
    fprintf(out, "Anika 72 65 90\\n");
    fprintf(out, "Rafi 85 28 60\\n");
    fclose(out);

    FILE *in = fopen("demo.txt", "r");
    if (in == NULL) {
        printf("Cannot read the file.\\n");
        return 1;
    }
    char name[30];
    int a, b, c;
    while (fscanf(in, "%29s %d %d %d", name, &a, &b, &c) == 4) {
        printf("%s: total %d\\n", name, a + b + c);
    }
    fclose(in);
    return 0;
}`,
      { expected: 'Anika: total 227\nRafi: total 173', filename: 'files.c', at: 'end' },
    ),
    lab(
      'buggy-average-lab',
      'Guided Hands-On Activity',
      'c',
      'A C editor with a program that should print the total and the average of five marks but contains two bugs. The expected output is Total 326 and Average 65.20.',
      'Two bugs hide in this program. Use print statements to find them, fix one at a time, and run it until the output matches.',
      `#include <stdio.h>

int main(void)
{
    int marks[5] = {72, 65, 90, 41, 58};
    int n = 5;
    int sum = 0;
    for (int i = 0; i < n - 1; i++) {
        sum += marks[i];
    }
    double average = sum / n;
    printf("Total: %d\\nAverage: %.2f\\n", sum, average);
    return 0;
}`,
      { expected: 'Total: 326\nAverage: 65.20', hint: 'The total is 58 too small, which is the last mark: look at the loop condition. Then check the type of the division.', filename: 'buggy.c', at: 'end' },
    ),
  ],
  // @@visuals-end
});

registerQuizCatalog({
  [`${M}/1`]: [
    mcq('q1', 'A recipe step says "stir until it looks right". Which property of a good algorithm does this step break?', ['Definiteness: every step must be precise and unambiguous', 'Finiteness: the algorithm must stop after a limited number of steps', 'Input: an algorithm must take at least one value', 'Output: an algorithm must display something on a screen'], 'Definiteness means each step is exact enough to be carried out without guessing. "Looks right" is a judgement, not an instruction.'),
    mcq('q2', 'Which flowchart symbol is used to ask a yes/no question such as "Are all three marks at least 33?"', ['A diamond (decision)', 'A rectangle (process)', 'A parallelogram (input/output)', 'A rounded oval (terminator)'], 'A diamond holds a yes/no question and has one arrow out for each answer. Calculations go in rectangles.'),
    mcq('q3', 'What is the job of the C compiler?', ['To check your source code against the rules of C and translate it into machine code', 'To run your program one line at a time while you watch it', 'To type the source code for you from a flowchart', 'To store your marks permanently on the hard disk'], 'The compiler checks the syntax and, if it is correct, translates the whole source file into an executable file.'),
    mcq('q4', 'What does this program print?', ['Result: 42', 'Result: 40 + 2', 'Result: %d', 'Result: 4 2'], 'The placeholder %d is replaced by the value after the comma. The computer first works out 40 + 2 = 42.', C('#include <stdio.h>\n\nint main(void)\n{\n    printf("Result: %d\\n", 40 + 2);\n    return 0;\n}')),
    mcq('q5', 'A program compiles and runs without any message, but it divides the total of three marks by 2 instead of 3. What kind of error is this?', ['A logic error: it runs but gives a wrong answer', 'A syntax error: it breaks the grammar of C', 'A runtime error: the program crashes while running', 'No error: the compiler would have fixed it'], 'The grammar is fine and nothing crashes, but the result is wrong. Only testing with known answers catches a logic error.'),
  ],
  [`${M}/2`]: [
    mcq('q1', 'Which declaration is the best choice for storing an average mark such as 75.67?', ['double average;', 'int average;', 'char average;', 'void average;'], 'An average usually has a decimal part, so it needs double. An int would throw the decimals away.'),
    mcq('q2', 'What does this program print?', ['3 1', '3.5 1', '3 3', '4 1'], 'With two integers, 7 / 2 is integer division = 3, and 7 % 2 is the remainder 1.', C('#include <stdio.h>\n\nint main(void)\n{\n    int a = 7, b = 2;\n    printf("%d %d\\n", a / b, a % b);\n    return 0;\n}')),
    mcq('q3', 'The variable total is the int 227 and average is a double. Why does average = total / 3; store 75.0 instead of 75.67?', ['Both 227 and 3 are integers, so the division is done as integer division before the result is stored', 'A double can never hold a decimal part when it is assigned with the = operator', 'The compiler rounds every division result to the nearest ten', 'The value 3 is too small to divide a three-digit number accurately'], 'The type of the calculation depends on its operands, not on the variable that receives the answer. Cast one operand: (double)total / 3.'),
    mcq('q4', 'Which statement correctly reads a whole number typed by the user into the int variable mark?', ['scanf("%d", &mark);', 'scanf("%d", mark);', 'scanf("%f", &mark);', 'scanf(mark);'], 'scanf needs the format specifier for the type (%d for int) and the address of the variable (&mark) so it knows where to store the value.'),
    mcq('q5', 'What does this program print?', ['65 B', 'A 66', 'A B', '65 66'], 'A char is a small number: %d prints the code 65 for \'A\', and %c prints the letter for the code 66, which is B.', C('#include <stdio.h>\n\nint main(void)\n{\n    printf("%d %c\\n", \'A\', 66);\n    return 0;\n}')),
  ],
  [`${M}/3`]: [
    mcq('q1', 'What does this program print?', ['A', 'A+', 'A-', 'Nothing'], 'The tests run from the top and only the first true branch runs. 85 is at least 70, so "A" is printed and the more specific test below it is never reached. The ladder is in the wrong order.', C('#include <stdio.h>\n\nint main(void)\n{\n    int mark = 85;\n    if (mark >= 70) {\n        printf("A\\n");\n    } else if (mark >= 80) {\n        printf("A+\\n");\n    }\n    return 0;\n}')),
    mcq('q2', 'Which condition is true exactly when mark is a valid mark from 0 to 100 inclusive?', ['mark >= 0 && mark <= 100', 'mark >= 0 || mark <= 100', '0 <= mark <= 100', 'mark > 0 && mark < 100'], 'Both bounds must hold, so use &&. With || every number satisfies at least one side. 0 <= mark <= 100 is evaluated as (0 <= mark) <= 100, which is always true. The last choice wrongly rejects 0 and 100.'),
    mcq('q3', 'What does the statement if (mark = 33) { ... } do?', ['It assigns 33 to mark, and because 33 is non-zero the condition is always true', 'It checks whether mark is equal to 33 and runs the block only then', 'It checks whether mark is at least 33 and runs the block only then', 'It does not compile, because a condition cannot contain an equals sign'], 'A single = is assignment. The value of the assignment is 33, and any non-zero value counts as true in C. Use == to compare.'),
    mcq('q4', 'What does this program print?', ['safe', 'big', 'It crashes with a division by zero', 'Nothing'], 'In a && b, if a is false C does not evaluate b (short-circuit evaluation). Since a != 0 is false, 100 / a is never calculated.', C('#include <stdio.h>\n\nint main(void)\n{\n    int a = 0;\n    if (a != 0 && 100 / a > 2) {\n        printf("big\\n");\n    } else {\n        printf("safe\\n");\n    }\n    return 0;\n}')),
    mcq('q5', 'What does this program print?', ['AB', 'A', 'B', 'ABC'], 'case 1 prints A, and because there is no break it falls through into case 2, which prints B and then stops at break.', C('#include <stdio.h>\n\nint main(void)\n{\n    int c = 1;\n    switch (c) {\n        case 1:\n            printf("A");\n        case 2:\n            printf("B");\n            break;\n        case 3:\n            printf("C");\n    }\n    printf("\\n");\n    return 0;\n}')),
  ],
  [`${M}/4`]: [
    mcq('q1', 'How many times does the body of this loop run? for (int i = 0; i < 5; i++) { ... }', ['5 times (i is 0, 1, 2, 3 and 4)', '4 times (i is 1, 2, 3 and 4)', '6 times (i is 0 to 5)', 'It never stops'], 'i starts at 0 and the loop continues while i < 5, so i takes the values 0, 1, 2, 3 and 4: five repeats. Using <= 5 would give six.'),
    mcq('q2', 'What does this program print?', ['3 2 1', '2 1 0', '3 2 1 0', '1 2 3'], 'n starts at 3. Each pass prints n and then subtracts 1; the loop stops when n is no longer greater than 0, so 0 is never printed.', C('#include <stdio.h>\n\nint main(void)\n{\n    int n = 3;\n    while (n > 0) {\n        printf("%d ", n);\n        n--;\n    }\n    printf("\\n");\n    return 0;\n}')),
    mcq('q3', 'Which loop is guaranteed to run its body at least once, which makes it the natural choice for a menu?', ['do-while', 'while', 'for', 'None of them can guarantee it'], 'A do-while loop tests its condition after the body, so the body always runs once. A while or for loop tests first and may never run.'),
    mcq('q4', 'What does this program print?', ['1 3', '1 3 5', '1 2 3 4', '2 4 6'], 'continue skips the even numbers, and break stops the loop when i reaches 5 before it is printed, so only 1 and 3 are printed.', C('#include <stdio.h>\n\nint main(void)\n{\n    for (int i = 1; i <= 6; i++) {\n        if (i % 2 == 0) {\n            continue;\n        }\n        if (i == 5) {\n            break;\n        }\n        printf("%d ", i);\n    }\n    printf("\\n");\n    return 0;\n}')),
    mcq('q5', 'The loop while (i < 3) { printf("x"); } never ends. What is the most likely cause?', ['The loop variable i is never changed inside the loop, so the condition stays true', 'The condition i < 3 uses the wrong comparison symbol for a while loop', 'A while loop is only allowed to repeat when it is written inside a for loop', 'printf is not allowed inside the body of a loop'], 'A loop ends only when its condition becomes false. Nothing inside the body changes i, so i < 3 stays true forever. Add i++ (and check it moves towards the end).'),
  ],
  [`${M}/5`]: [
    mcq('q1', 'What is the purpose of a function prototype such as double average_of(int total, int subjects); placed above main?', ['It tells the compiler the function’s name, parameter types and return type before the function is defined', 'It runs the function once automatically when the program starts', 'It reserves memory for the value that the function will return', 'It stops the function from being called more than once'], 'The compiler reads a file from the top. A prototype lets main call a function that is defined further down, because the compiler already knows how to check the call.'),
    mcq('q2', 'What does this program print?', ['9', '5', '7', '12'], 'The inner call add(3, 4) is evaluated first and gives 7; then add(2, 7) gives 9.', C('#include <stdio.h>\n\nint add(int a, int b)\n{\n    return a + b;\n}\n\nint main(void)\n{\n    printf("%d\\n", add(2, add(3, 4)));\n    return 0;\n}')),
    mcq('q3', 'What does this program print?', ['5', '99', '0', '104'], 'C passes a copy of n into x. The function changes only its own copy, so n in main is still 5.', C('#include <stdio.h>\n\nvoid change(int x)\n{\n    x = 99;\n}\n\nint main(void)\n{\n    int n = 5;\n    change(n);\n    printf("%d\\n", n);\n    return 0;\n}')),
    mcq('q4', 'The variable result is declared inside the function compute(). Why does using result inside main() cause a compile error?', ['result is a local variable: its scope is only the function that declares it', 'result is a reserved word that main is not allowed to use', 'Variables declared in a function can only hold whole numbers', 'main() is not allowed to use any variable at all'], 'A local variable exists only inside the function (or block) where it is declared. Other functions cannot see it; pass values with parameters and return values instead.'),
    mcq('q5', 'What does this program print?', ['24', '4', '10', '1'], 'f(4) = 4 * f(3) = 4 * 3 * f(2) = 4 * 3 * 2 * f(1) = 4 * 3 * 2 * 1 = 24. The base case n <= 1 returns 1.', C('#include <stdio.h>\n\nint f(int n)\n{\n    if (n <= 1) {\n        return 1;\n    }\n    return n * f(n - 1);\n}\n\nint main(void)\n{\n    printf("%d\\n", f(4));\n    return 0;\n}')),
  ],
  [`${M}/6`]: [
    mcq('q1', 'Which indexes are valid for the array int a[5]?', ['0, 1, 2, 3 and 4', '1, 2, 3, 4 and 5', '0, 1, 2, 3, 4 and 5', 'Any whole number, because C checks nothing'], 'An array of 5 elements has indexes 0 to 4. a[5] is out of bounds. C does not check, which is why using it is dangerous undefined behaviour, but only 0 to 4 are valid.'),
    mcq('q2', 'What does this program print?', ['4', '10', '5', '3'], 'strlen counts the characters before the null character, not the size of the array. "Rafi" has 4 letters.', C('#include <stdio.h>\n#include <string.h>\n\nint main(void)\n{\n    char s[10] = "Rafi";\n    printf("%d\\n", (int)strlen(s));\n    return 0;\n}')),
    mcq('q3', 'Which condition correctly tests whether the strings a and b contain the same text?', ['strcmp(a, b) == 0', 'a == b', 'a = b', 'strcmp(a, b) == 1'], 'strcmp returns 0 when the two strings are equal. Using == compares the addresses of the arrays, not their text.'),
    mcq('q4', 'What does this program print?', ['4', '2', '5', '1'], 'm[1][0] is row 1, column 0: the first element of the second row {4, 5, 6}, which is 4.', C('#include <stdio.h>\n\nint main(void)\n{\n    int m[2][3] = {{1, 2, 3}, {4, 5, 6}};\n    printf("%d\\n", m[1][0]);\n    return 0;\n}')),
    mcq('q5', 'A function receives the parameter int row[]. Why can it change the caller’s array?', ['The array is not copied: the function receives the address of its first element', 'Every parameter in C is always passed by reference', 'The compiler copies the array back to the caller when the function ends', 'It cannot: arrays are passed by value like int arguments'], 'Unlike a single int, an array argument is not copied. The function gets the address of the first element, so row[i] = ... changes the caller’s data.'),
  ],
  [`${M}/7`]: [
    mcq('q1', 'After these statements run, what is the value of x?  int x = 10;  int *p = &x;  *p = 25;', ['25', '10', 'The address of x', 'It is undefined'], 'p holds the address of x, so *p = 25 stores 25 in the cell that x names. x and *p are two names for the same variable.'),
    mcq('q2', 'What does this program print?', ['8 3', '3 8', '3 3', '8 8'], 'swap receives the addresses of a and b and exchanges the values stored there, so a becomes 8 and b becomes 3.', C('#include <stdio.h>\n\nvoid swap(int *x, int *y)\n{\n    int t = *x;\n    *x = *y;\n    *y = t;\n}\n\nint main(void)\n{\n    int a = 3, b = 8;\n    swap(&a, &b);\n    printf("%d %d\\n", a, b);\n    return 0;\n}')),
    mcq('q3', 'Which statement correctly reserves heap memory for 10 ints?', ['int *a = malloc(10 * sizeof *a);', 'int *a = malloc(10);', 'int a = malloc(10 * sizeof(int));', 'int *a = free(10 * sizeof *a);'], 'malloc takes the number of BYTES, so multiply the count by the size of one element. malloc(10) would reserve only 10 bytes, far too little for 10 ints.'),
    mcq('q4', 'What is a memory leak?', ['Memory taken from the heap that the program never gives back with free', 'Reading a value from an array index that is too large', 'Using a pointer that has the value NULL', 'Storing a number that is too large for its type'], 'A leak is heap memory that stays reserved because free was never called. A long-running program that leaks slowly uses up all the memory.'),
    mcq('q5', 'Why is int *f(void) { int x = 5; return &x; } a bug?', ['x is destroyed when f returns, so the returned pointer dangles', 'A function is not allowed to return a pointer', 'The address of a variable cannot be taken with &', 'x must be declared before the function'], 'A local variable lives on the stack only while the function runs. After it returns, the memory is reused, so the pointer points to something that no longer exists (a dangling pointer).'),
  ],
  [`${M}/8`]: [
    mcq('q1', 'What does this program print?', ['101 205', '101 200', '101 5', '205 101'], 'bonus receives the address of a, so s->total += 5 changes the caller’s structure: total goes from 200 to 205. The roll is untouched.', C('#include <stdio.h>\n\ntypedef struct {\n    int roll;\n    int total;\n} Student;\n\nvoid bonus(Student *s)\n{\n    s->total += 5;\n}\n\nint main(void)\n{\n    Student a = {101, 200};\n    bonus(&a);\n    printf("%d %d\\n", a.roll, a.total);\n    return 0;\n}')),
    mcq('q2', 'Which fopen call opens an existing file so that new lines are added at the end without erasing what is already stored?', ['fopen("data.txt", "a")', 'fopen("data.txt", "w")', 'fopen("data.txt", "r")', 'fopen("data.txt", "rw")'], 'Mode "a" appends. Mode "w" erases the old content the moment the file is opened, "r" only reads, and "rw" is not a valid mode.'),
    mcq('q3', 'What does this program print?', ['56', '15', '78', '0'], 'fprintf writes the line "7 8" to the file. After the file is closed and opened for reading, fscanf reads a = 7 and b = 8, and the program prints their product, 56.', C('#include <stdio.h>\n\nint main(void)\n{\n    int a = 0, b = 0;\n    FILE *f = fopen("t.txt", "w");\n    if (f == NULL) {\n        return 1;\n    }\n    fprintf(f, "7 8\\n");\n    fclose(f);\n\n    f = fopen("t.txt", "r");\n    if (f == NULL) {\n        return 1;\n    }\n    fscanf(f, "%d %d", &a, &b);\n    fclose(f);\n    printf("%d\\n", a * b);\n    return 0;\n}')),
    mcq('q4', 'A program prints a wrong total for a class. What is the best first step?', ['Find the smallest input that fails, then print the variables inside the loop to see where the value goes wrong', 'Rewrite the whole program from the beginning, because the old code cannot be trusted', 'Change several lines at once and see whether the answer happens to improve', 'Assume the compiler is broken and install it again'], 'Debugging starts with a reproducible, small failing case and evidence. Printing the variables shows exactly where the value stops matching your expectation, so you can fix one thing instead of guessing.'),
    mcq('q5', 'Why does the SRMS file contain only the roll number, name and marks, and not the total or the GPA?', ['They can be recalculated when the file is loaded, so the file can never disagree with the grade rules', 'C cannot write a decimal number such as a GPA into a text file', 'A text file is only allowed to contain whole numbers and names', 'Totals and GPAs must stay secret and may not be stored on disk'], 'Save the inputs and calculate the rest again. If the grade rules change, an old file still gives correct results, and nothing stored can contradict the program.'),
  ],
  // @@quiz-end
});
