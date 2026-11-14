// FILE PATH: server/src/assessments/bank/course-tests/problem-solving-program-design.ts
//
// Python Foundations → "Problem Solving & Program Design" (8 lessons, 3 projects, each built in two
// lessons: Text-Based Adventure Game 2-3, Library Management System 4-5, Personal Expense Tracker
// 6-7; lesson 8 recaps all three).
// Topics: 1 computational thinking · 2 functions in depth & modules · 3 nested collections ·
// 4 algorithms & patterns · 5 debugging & testing · 6 error handling · 7 files, CSV & JSON ·
// 8 object-oriented programming.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

export const problemSolvingProgramDesign = bank({
  id: 'course-test/problem-solving-program-design',
  title: 'Problem Solving & Program Design — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Computational thinking ───────────────────────────────────
    mcq(
      1,
      'Which part of computational thinking is about ignoring the details that do not matter and keeping the ones that do?',
      'Abstraction',
      ['Decomposition', 'Pattern recognition', 'Debugging'],
      'Abstraction means focusing on what is important for the problem and leaving out the rest.',
    ),
    mcq(
      1,
      'What is a trace table used for?',
      'Recording the value of each variable at every step of a dry run',
      [
        'Storing the final answers of a program in a file',
        'Listing every error that Python can raise',
        'Drawing the shapes of a flowchart',
      ],
      'A trace table has one row per step and one column per variable, so you can follow the algorithm by hand.',
    ),
    mcq(
      1,
      'Why is it useful to write pseudocode before writing the Python code?',
      'It lets you design the logic without worrying about syntax',
      [
        'It makes the final program run faster',
        'It removes the need for testing',
        'It is required by the Python interpreter',
      ],
      'Pseudocode focuses on the steps. Translating them into Python afterwards is much easier.',
    ),
    mcq(
      1,
      'In a flowchart, which shape is normally used for a yes/no decision?',
      'A diamond',
      ['A rectangle', 'An oval', 'A circle'],
      'The diamond asks a question with two ways out. Rectangles show actions, and ovals mark the start and end.',
    ),

    // ── Lesson 2 · Functions in depth and modules ───────────────────────────
    codeOut(
      2,
      'python',
      `def describe(name, rank="Cadet"):
    return name + " (" + rank + ")"

print(describe("Lyra", rank="Pilot"))`,
      'Lyra (Pilot)',
      ['Lyra (Cadet)', 'Pilot (Lyra)', 'Lyra Pilot'],
      'The keyword argument rank="Pilot" replaces the default value of "Cadet".',
    ),
    codeOut(
      2,
      'python',
      `def stats(nums):
    return min(nums), max(nums)

low, high = stats([4, 9, 2])
print(low, high)`,
      '2 9',
      ['4 9', '9 2', '(2, 9)'],
      'The function returns two values as a tuple, and unpacking puts the smallest in low and the largest in high.',
    ),
    mcq(
      2,
      'Which statement makes the functions of a file called toolkit.py (in the same folder) available in another file?',
      'import toolkit',
      ['include toolkit', 'using toolkit', 'load toolkit.py'],
      'Python imports a module by its file name without the .py ending.',
    ),
    codeOut(
      2,
      'python',
      `def counter():
    total = 5
    return total

total = 100
print(counter(), total)`,
      '5 100',
      ['5 5', '100 100', '100 5'],
      'The total inside counter is a separate local variable, so it does not change the global total.',
    ),

    // ── Lesson 3 · Nested collections ───────────────────────────────────────
    codeOut(
      3,
      'python',
      `crew = [{"name": "Nova", "age": 30}, {"name": "Orion", "age": 28}]
print(crew[0]["name"], crew[1]["age"])`,
      'Nova 28',
      ['Orion 30', 'Nova 30', 'Orion 28'],
      'crew[0] is the first record and crew[1] is the second; the key then picks one value from each.',
    ),
    codeOut(
      3,
      'python',
      `grid = [[1, 2], [3, 4], [5, 6]]
print(grid[2][1])`,
      '6',
      ['5', '4', '3'],
      'grid[2] is the third row [5, 6], and [1] picks the second item of that row.',
    ),
    codeOut(
      3,
      'python',
      `print([n * n for n in range(1, 5) if n % 2 == 0])`,
      '[4, 16]',
      ['[1, 4, 9, 16]', '[2, 4]', '[4, 8]'],
      'Only the even numbers 2 and 4 pass the condition, and each is squared.',
    ),
    mcq(
      3,
      'Which structure is the best fit for a map of rooms where every room has a description and a set of exits?',
      'A dictionary whose values are dictionaries',
      [
        'A single string with all the rooms in it',
        'A tuple of numbers',
        'A set of room names',
      ],
      'Each room name is a key, and its value is a dictionary of facts about that room.',
    ),

    // ── Lesson 4 · Algorithms and patterns ──────────────────────────────────
    codeOut(
      4,
      'python',
      `items = [8, 3, 5]
for i in range(len(items)):
    if items[i] == 5:
        print(i)`,
      '2',
      ['5', '3', '1'],
      'This is a linear search: it checks the items in turn, and 5 is found at index 2.',
    ),
    codeOut(
      4,
      'python',
      `print(sorted([4, 1, 3], reverse=True))`,
      '[4, 3, 1]',
      ['[1, 3, 4]', '[4, 1, 3]', '[3, 1, 4]'],
      'sorted() returns a new list in order, and reverse=True puts the largest first.',
    ),
    codeOut(
      4,
      'python',
      `counts = {}
for ch in "banana":
    counts[ch] = counts.get(ch, 0) + 1
print(counts["a"])`,
      '3',
      ['1', '2', '6'],
      'The frequency table counts each letter, and "a" appears three times in banana.',
    ),
    mcq(
      4,
      'How does the work of a linear search change as the list gets longer?',
      'It grows in step with the number of items',
      [
        'It stays the same however long the list is',
        'It grows with the square of the number of items',
        'It shrinks as the list gets longer',
      ],
      'In the worst case a linear search looks at every item, so ten times as many items means about ten times as many checks.',
    ),

    // ── Lesson 5 · Debugging and testing ────────────────────────────────────
    mcq(
      5,
      'Which kind of error produces no error message at all?',
      'A logic error',
      ['A syntax error', 'A runtime error', 'An indentation error'],
      'With a logic error the program runs normally but gives a wrong result, so only testing finds it.',
    ),
    mcq(
      5,
      'Which statement checks that a function gives the result you expect, and stops the program if it does not?',
      'assert',
      ['print', 'import', 'return'],
      'An assert statement raises an AssertionError when its condition is False.',
    ),
    mcq(
      5,
      'A traceback ends with the line "ZeroDivisionError: division by zero". What does this last line tell you?',
      'The name of the error and a message about what went wrong',
      [
        'The line number of the next instruction',
        'How long the program ran for',
        'The name of the file that was opened',
      ],
      'Read a traceback from the bottom: the last line names the error, and the lines above show where it happened.',
    ),
    codeOut(
      5,
      'python',
      `def double(x):
    return x * 2

assert double(4) == 8
print("passed")`,
      'passed',
      ['8', 'True', 'double(4)'],
      'The assert is true, so nothing happens and the program carries on to print "passed".',
    ),

    // ── Lesson 6 · Error handling ───────────────────────────────────────────
    codeOut(
      6,
      'python',
      `try:
    print(10 / 0)
except ZeroDivisionError:
    print("cannot divide")`,
      'cannot divide',
      ['0', 'inf', '10'],
      'Dividing by zero raises a ZeroDivisionError, so the except block runs instead of crashing the program.',
    ),
    codeOut(
      6,
      'python',
      `try:
    print("A")
finally:
    print("B")`,
      'A\nB',
      ['B\nA', 'A', 'B'],
      'The try block runs first, and the finally block always runs at the end.',
    ),
    codeOut(
      6,
      'python',
      `def check(age):
    if age < 0:
        raise ValueError("negative age")
    return age

try:
    check(-5)
except ValueError as error:
    print(error)`,
      'negative age',
      ['-5', 'ValueError', 'None'],
      'raise creates the exception with the message, and as error captures it so that print() can show the message.',
    ),
    mcq(
      6,
      'Which block of a try statement runs only when the try block finished without an error?',
      'else',
      ['finally', 'except', 'raise'],
      'else is for the code that depends on the try block having worked.',
    ),

    // ── Lesson 7 · Files, CSV and JSON ──────────────────────────────────────
    mcq(
      7,
      'Which file mode adds new text to the end of a file without erasing what is already in it?',
      '"a"',
      ['"w"', '"r"', '"x"'],
      'The append mode keeps the existing content. The write mode "w" replaces it.',
    ),
    codeOut(
      7,
      'python',
      `import json

data = json.loads('{"fuel": 80}')
print(data["fuel"] + 5)`,
      '85',
      ['805', '80', '{"fuel": 85}'],
      'json.loads turns the JSON text into a dictionary, and the number 80 stays a number, so 80 + 5 = 85.',
    ),
    mcq(
      7,
      'What does csv.DictReader give you for each row of a CSV file?',
      'A dictionary whose keys are the column names from the first row',
      [
        'A single string with the whole row in it',
        'A tuple of numbers',
        'A set of the unique values in the row',
      ],
      'DictReader uses the header row for the keys, so you can write row["amount"].',
    ),

    // ── Lesson 8 · Object-oriented programming ──────────────────────────────
    codeOut(
      8,
      'python',
      `class Counter:
    def __init__(self):
        self.value = 0

    def add(self, n):
        self.value += n

c = Counter()
c.add(5)
c.add(2)
print(c.value)`,
      '7',
      ['5', '2', '0'],
      "The constructor sets value to 0, and each call to add() increases the same object's value: 0 + 5 + 2 = 7.",
    ),
    codeOut(
      8,
      'python',
      `class Ship:
    def __init__(self, name):
        self.name = name

a = Ship("Aurora")
b = Ship("Voyager")
print(a.name, b.name)`,
      'Aurora Voyager',
      ['Aurora Aurora', 'Voyager Voyager', 'Ship Ship'],
      'Each object has its own attributes, so a and b keep different names.',
    ),
    mcq(
      8,
      'What is an object in object-oriented programming?',
      'One real item created from a class, with its own attribute values',
      [
        'The blueprint that describes a kind of item',
        'A function that returns a value',
        "A file that stores a program's data",
      ],
      'The class is the blueprint; an object (instance) is one thing built from it.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'Writing down the expected outcome of each edge case before coding helps you check the finished program.',
      true,
      'The expected outcomes become test cases that tell you whether the program is right.',
    ),
    tf(
      2,
      'In a function call, a positional argument may be written after a keyword argument.',
      false,
      'Positional arguments must come first. Writing one after a keyword argument is a syntax error.',
    ),
    tf(
      3,
      'A dictionary can hold another dictionary as one of its values.',
      true,
      'Values can be any kind of object, which is what makes nested data structures possible.',
    ),
    tf(
      4,
      'Calling scores.sort() returns a new sorted list and leaves the original list unchanged.',
      false,
      'sort() changes the list in place and returns None. sorted() is the one that returns a new list.',
    ),
    tf(
      4,
      'Starting a maximum search with the first item works even when all the numbers are negative.',
      true,
      'Starting from the first item never assumes a value that might be larger than every item, unlike starting from 0.',
    ),
    tf(
      5,
      'It is a good debugging habit to change several things at once so that the bug disappears faster.',
      false,
      'Change one thing at a time, so you know which change fixed the bug (or caused a new one).',
    ),
    tf(
      6,
      'A function can raise an exception with raise and let the code that called it decide how to handle it.',
      true,
      'The caller can catch the exception with try and except and respond in its own way.',
    ),
    tf(
      7,
      'A relative path such as data/scores.csv works whichever folder the program is run from.',
      false,
      'A relative path starts from the working directory, so running the program from another folder can break it.',
    ),
    tf(
      8,
      'By convention, the first parameter of a method is called self.',
      true,
      'self is the object the method is working on. Python passes it in automatically.',
    ),
    tf(
      8,
      'Two objects created from the same class always have the same attribute values.',
      false,
      'Each object has its own attributes, and the values can differ, like the name of each Ship.',
    ),
  ],
});

/** What this course adds to the Python Foundations Final Test (never a copy of a Course Test question). */
export const problemSolvingProgramDesignExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'Which of these is an example of decomposition?',
        'Splitting a mission planner into reading the tasks, sorting them, fitting them into the time available and printing the plan',
        [
          'Fixing a spelling mistake in one line of code',
          'Running the finished program twice to check it',
          'Choosing a longer name for a variable',
        ],
        'Decomposition breaks one big problem into smaller steps that you can solve one at a time.',
      ),
      codeOut(
        2,
        'python',
        `def power(base, exp=2):
    return base ** exp

print(power(3), power(2, 5))`,
        '9 32',
        ['6 10', '9 10', '3 32'],
        'power(3) uses the default exponent 2 (3 × 3 = 9), and power(2, 5) is 2 to the power of 5 = 32.',
      ),
      codeOut(
        3,
        'python',
        `rooms = {"lab": {"exits": {"east": "garden"}}}
print(rooms["lab"]["exits"]["east"])`,
        'garden',
        ['lab', 'east', '{"east": "garden"}'],
        'Each pair of brackets goes one level deeper: the room, its exits, and then the direction.',
      ),
      codeOut(
        4,
        'python',
        `scores = [72, 45, 88]
best = scores[0]
for s in scores:
    if s > best:
        best = s
print(best)`,
        '88',
        ['72', '45', '205'],
        'The accumulator starts at 72 and is replaced whenever a bigger score is found, ending with 88.',
      ),
      mcq(
        5,
        'Which is the best description of a syntax error?',
        'Code that breaks the grammar rules of Python, so it cannot run at all',
        [
          'Code that runs but gives a wrong answer',
          'Code that stops while it is running because of a bad value',
          'Code that runs very slowly',
        ],
        'Python reports a syntax error before running the program, usually naming the line.',
      ),
      codeOut(
        6,
        'python',
        `try:
    value = int("12a")
except ValueError:
    value = 0
print(value)`,
        '0',
        ['12', '12a', 'ValueError'],
        'int("12a") raises a ValueError, so the except block sets value to 0.',
      ),
      codeOut(
        7,
        'python',
        `import csv
import io

row = next(csv.reader(io.StringIO("sun,star,5")))
print(type(row[2]).__name__)`,
        'str',
        ['int', 'float', 'list'],
        'Everything read from a CSV file is text, even a value that looks like a number.',
      ),
      codeOut(
        8,
        'python',
        `class Planet:
    def __init__(self, name):
        self.name = name

    def __str__(self):
        return "Planet " + self.name

print(Planet("Mars"))`,
        'Planet Mars',
        ['Mars', 'Planet', '<Planet object>'],
        'print() uses the __str__ method to turn the object into text.',
      ),
    ],
    trueFalse: [
      tf(
        3,
        'A list of dictionaries is a natural way to store several records that each have the same fields.',
        true,
        'Each dictionary is one record, and each key is one field, like the rows and columns of a table.',
      ),
      tf(
        6,
        'A bare "except:" is the best way to catch errors because it handles every possible mistake.',
        false,
        'A bare except also hides mistakes in your own code. Name the exception you expect.',
      ),
    ],
  },
};
