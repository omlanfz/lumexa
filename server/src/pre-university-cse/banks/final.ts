// FILE PATH: server/src/pre-university-cse/banks/final.ts
//
// The Final Assessment of Pre-University CSE: the same 45-mark, 40-minute structure as every course
// assessment, with Part A drawing on all eight courses (topic = course number) and Parts B and C
// asking the student to connect courses.

import { codeOut, crit, mcq, practical, shortAnswer, structuredBank } from '../../structured-assessments/structured.helpers';

export const FINAL_BANK = structuredBank({
  id: 'structured/pre-university-cse-final',
  title: 'Final Assessment: Pre-University CSE',
  kind: 'FINAL_TEST',
  mcq: [
    codeOut(
      1,
      'c',
      `#include <stdio.h>

int main(void) {
    int a[4] = {10, 20, 30, 40};
    int *p = a + 1;
    printf("%d %d\\n", *p, *(p + 2));
    return 0;
}`,
      '20 40',
      ['10 30', '20 30', '30 40'],
      'a + 1 points to the second element, 20. Adding 2 more elements to the pointer reaches the fifth position counted from a, which is the element a[3] = 40.',
    ),
    mcq(
      2,
      'Which feature lets one function call work on objects of different classes, with the version chosen from the real object at run time?',
      'Polymorphism through virtual (overridden) functions',
      [
        'Encapsulation through private data members',
        'Overloading, which chooses between functions at run time from the values of the arguments',
        'Composition, which stores one object inside another',
      ],
      'A call through a base-class pointer or reference runs the derived class\'s override when the function is virtual. Overloading is resolved at compile time from the argument types.',
    ),
    codeOut(
      3,
      'python',
      `import heapq

h = []
for x in [5, 1, 4, 2]:
    heapq.heappush(h, x)
print(heapq.heappop(h), heapq.heappop(h))`,
      '1 2',
      ['5 4', '1 5', '2 1'],
      'A min-heap always gives back its smallest element first, so the two pops return 1 and then 2, however the values were pushed.',
    ),
    mcq(
      4,
      'What is the contrapositive of "if it rains, the match is cancelled"?',
      'If the match is not cancelled, then it did not rain',
      [
        'If it does not rain, the match is not cancelled',
        'If the match is cancelled, then it rained',
        'If it rains, the match is not cancelled',
      ],
      'The contrapositive of p implies q is not q implies not p, and it is always logically equivalent to the original statement. The converse and the inverse are not.',
    ),
    mcq(
      5,
      'How many bits does a binary counter need to be able to count the numbers 0 to 999?',
      '10 bits, because 2^10 = 1024 is the smallest power of two that is at least 1000',
      [
        '9 bits, because 2^9 = 512 and the counter can reuse the top bit',
        '8 bits, because one byte holds a number as large as any digit string',
        '999 bits, because every number needs its own bit',
      ],
      'n bits give 2^n different values. 2^9 = 512 is too few for 1000 values and 2^10 = 1024 is enough.',
    ),
    mcq(
      6,
      'What does the TCP three-way handshake achieve?',
      'It sets up a connection: both sides confirm that they can send and receive and agree on starting sequence numbers',
      [
        'It encrypts the data that the two sides will exchange',
        'It finds the IP address that belongs to a host name',
        'It decides which of several routers a packet must use',
      ],
      'SYN, SYN-ACK and ACK establish a TCP connection with agreed sequence numbers, which is the basis of reliable, ordered delivery. Encryption is done by TLS, name lookup by DNS.',
    ),
    codeOut(
      7,
      'sql',
      `CREATE TABLE t (a INTEGER);
INSERT INTO t VALUES (1), (2), (NULL), (3);
SELECT COUNT(*), COUNT(a), AVG(a) FROM t;`,
      '4|3|2.0',
      ['4|4|1.5', '3|3|2.0', '4|3|1.5'],
      'COUNT(*) counts rows (4), COUNT(a) ignores NULL (3), and AVG ignores NULL too: (1 + 2 + 3) / 3 = 2.0.',
    ),
    codeOut(
      8,
      'python',
      `from math import dist

pts = [((0, 0), "a"), ((5, 5), "b"), ((1, 0), "a")]
q = (4, 4)
print(min(pts, key=lambda p: dist(p[0], q))[1])`,
      'b',
      ['a', '(5, 5)', '1'],
      'This is a 1-nearest-neighbour classifier: the closest point to (4, 4) is (5, 5), so the query gets its label b.',
    ),
    mcq(
      3,
      'A program has a loop over n items, and inside it another loop over the same n items. What is its time complexity?',
      'O(n squared), because the inner statement runs n times for each of the n passes of the outer loop',
      [
        'O(2n), because there are two loops, each of which takes n steps',
        'O(n log n), because the inner loop halves the data at each step',
        'O(n), because the loops use the same list',
      ],
      'Nested loops multiply: n passes of the outer loop times n of the inner loop gives n x n steps. Two loops one after the other would add to O(2n), which is O(n).',
    ),
    mcq(
      6,
      'Which situation is an example of the principle of least privilege?',
      'A student account can read the shared course files but cannot change them or the system settings',
      [
        'Every teacher shares one administrator password so that nobody is ever locked out',
        'A program runs as the administrator so that it never meets a permission error',
        'All staff can read and change every folder to save time',
      ],
      'Least privilege gives each account and program only the permissions it needs, so a mistake or a stolen password can do limited damage.',
    ),
  ],
  shortAnswers: [
    shortAnswer(
      3,
      'A school must schedule exams so that two exams that share at least one student are never in the same period. Model this as a graph: say what the vertices and the edges are, what a colouring of the graph means, and how it gives the number of periods. Say which data structure you would use to store the graph and the time complexity of building it for e exams and s students.',
      'Each exam is a vertex, and two exams are joined by an edge when at least one student takes both. A colouring gives every vertex a colour so that no edge joins two vertices of the same colour: each colour is an exam period, so a valid colouring is a valid timetable and the smallest number of colours needed (the chromatic number) is the fewest periods. Store the graph as an adjacency list (a dictionary from each exam to the set of exams that clash with it). To build it, put the students of each exam in a set and compare the exams in pairs, or go through each student and connect all the exams that the student takes; either way the work grows with the number of enrolments plus the number of exam pairs, for example O(e squared x s) for the naive pair comparison. Finding the minimum colouring is hard, so a greedy colouring is used in practice and gives a good but not always optimal timetable.',
      [
        crit('The graph model', 2, 'Vertices are exams and edges join exams that share a student.'),
        crit('Colouring and periods', 2, 'A colour is a period; the number of colours is the number of periods; no edge joins equal colours.'),
        crit('Data structure and complexity', 1, 'An adjacency list and a reasonable statement of the cost of building it.'),
      ],
    ),
    shortAnswer(
      7,
      'Design the data side of a student information system: give three tables with their keys, write one SQL query that returns the average score of each student, and explain how a web page should get that data from the server. Name two measures that keep the system secure.',
      'Tables: students(student_id PK, name, email UNIQUE), courses(course_id PK, title) and enrolments(student_id FK, course_id FK, score CHECK (score BETWEEN 0 AND 100), PRIMARY KEY (student_id, course_id)). The query is SELECT s.name, AVG(e.score) FROM students s JOIN enrolments e ON e.student_id = s.student_id GROUP BY s.student_id, s.name; AVG ignores NULL scores. The page does not touch the database: it asks a server API over HTTPS with fetch, receives JSON, and puts it into the page with textContent. Security measures: store passwords only as salted slow hashes and check permissions on the server; and use parameterised queries with validation of every input, so that injected text is never run as SQL or HTML.',
      [
        crit('Tables and keys', 2, 'Three suitable tables with primary and foreign keys and a constraint.'),
        crit('SQL query', 1, 'A correct join with AVG and GROUP BY.'),
        crit('Page and server', 1, 'Explains that the page uses an API with fetch and JSON, not a direct database connection.'),
        crit('Security measures', 1, 'Two sensible measures, for example salted hashing and parameterised queries or validation.'),
      ],
    ),
    shortAnswer(
      5,
      'Explain what happens from the moment you press the key A on a keyboard to the moment the letter appears on the screen. Use at least four ideas from different courses of the program (for example binary encoding, the CPU instruction cycle, the operating system, memory) and say what each one contributes.',
      'The keyboard controller turns the key press into a binary code (a scan code and then a character code such as ASCII or Unicode, where A is 65, 01000001) and signals the CPU with an interrupt. The operating system\'s keyboard driver, running in the kernel, handles the interrupt, reads the code and passes it to the program that has the focus through a system call or an event. The program, a sequence of machine instructions that the CPU fetches, decodes and executes, stores the character in memory (RAM, served through the cache) and updates its data structure, for example a string in a text buffer. It then asks the operating system to draw the text, the graphics hardware turns the pixel values into the picture, and the character appears. Each layer hides the details of the next, which is how a complex system is built from simple parts.',
      [
        crit('Encoding and interrupt', 2, 'The key press becomes a binary code and reaches the CPU or the operating system through an interrupt or a driver.'),
        crit('Operating system and program', 1, 'The kernel or driver passes the character to the right program (events, system calls).'),
        crit('CPU and memory', 1, 'Instructions are fetched and executed and the character is stored in memory (data structure, cache).'),
        crit('Display and layering', 1, 'The text is drawn as pixels, and the answer connects at least four ideas from different courses.'),
      ],
    ),
  ],
  practical: practical({
    title: 'A tested ranking toolkit',
    language: 'python',
    instructions:
      'A teacher keeps each student\'s marks in text lines such as `Ayesha:92,85,90`. Write a Python toolkit that reads, checks, ranks and reports on them, with tests.\n\n' +
      '1. Write `parse_line(line)` that returns the name and the list of marks as integers, and raises ValueError with a clear message for an empty name, a missing colon, a mark that is not a whole number, or a mark outside 0 to 100.\n' +
      '2. Write `average(marks)` that returns the mean rounded to one decimal place (None for an empty list).\n' +
      '3. Write `rank(students)` that returns the students sorted by average, highest first, and by name when the averages are equal.\n' +
      '4. Load these lines with a loop that catches ValueError and prints `rejected: <message>` for each bad line: `Ayesha:92,85,90`, `Tanvir:67,71,64`, `Sadia:38,45,52`, `Nabil:75,68,x`, `Mim:88,94,91`, `:50,60`, `Rafi:105,60,70`.\n' +
      '5. Print the ranking as `1. Mim 91.0` and so on, and write at least four tests with a small PASS/FAIL printing helper that cover a normal line, a boundary mark (0 and 100), a bad line and the tie rule.\n' +
      '6. In a comment state the time complexity of `rank` and name one fairness or privacy point about ranking students.\n\n' +
      'Expected: three lines are rejected, the ranking is Mim 91.0, Ayesha 89.0, Tanvir 67.3, Sadia 45.0, and all your tests pass.',
    starterCode:
      'def parse_line(line):\n    """Return (name, marks) or raise ValueError."""\n    pass\n\n\n' +
      'def average(marks):\n    pass\n\n\n' +
      'def rank(students):\n    pass\n\n\n' +
      'LINES = ["Ayesha:92,85,90", "Tanvir:67,71,64", "Sadia:38,45,52", "Nabil:75,68,x", "Mim:88,94,91", ":50,60", "Rafi:105,60,70"]\n\n# load, rank, print, and test\n',
    deliverables: ['Your complete Python program', 'The printed rejections and ranking', 'The output of your tests', 'The comment about complexity and fairness or privacy'],
    rubric: [
      crit('Parsing and validation', 5, 'parse_line accepts good lines and raises ValueError with a clear message for each kind of bad line; the three bad lines are rejected.'),
      crit('Average and ranking', 4, 'average rounds correctly and handles an empty list; rank sorts by average then name and gives the required order.'),
      crit('Tests', 5, 'At least four tests with PASS/FAIL output, including boundary marks and the tie rule, and they would fail if a function were wrong.'),
      crit('Reasoning', 3, 'States the complexity of the sort as O(n log n) and names a sensible fairness or privacy point.'),
      crit('Code quality', 3, 'Functions with docstrings, clear names, specific exception handling, and tidy output.'),
    ],
  }),
});
