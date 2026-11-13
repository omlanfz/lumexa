// FILE PATH: server/src/assessments/bank/course-tests/python-programming-essentials.ts
//
// Python Foundations → "Python Programming Essentials" (8 lessons, 3 projects: Smart Calculator,
// Number Guessing Game, Python Quiz Master).
// Topics: 1 first program & syntax · 2 variables & data types · 3 input, output & operators ·
// 4 conditional logic · 5 loops · 6 strings · 7 collections · 8 functions.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

export const pythonProgrammingEssentials = bank({
  id: 'course-test/python-programming-essentials',
  title: 'Python Programming Essentials — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · First program and syntax ─────────────────────────────────
    mcq(
      1,
      'What is the job of the Python interpreter?',
      'To read your source code and carry out its instructions',
      [
        'To store your program as a picture on the screen',
        'To correct the spelling of every word you type',
        'To keep a copy of your program on the internet',
      ],
      'The interpreter reads the source code you write and has the computer run each instruction.',
    ),
    codeOut(
      1,
      'python',
      `print("Mission", "Control")`,
      'Mission Control',
      ['MissionControl', 'Mission, Control', '"Mission" "Control"'],
      'print() puts a space between the items it is given, and the quotation marks are not shown.',
    ),
    mcq(
      1,
      'Which of these lines is a comment that Python ignores?',
      '# remember to check the fuel',
      [
        'print("remember to check the fuel")',
        '"remember to check the fuel"',
        'remember to check the fuel',
      ],
      'A comment starts with #. Everything after it on that line is a note for people.',
    ),
    codeOut(
      1,
      'python',
      `print("Fuel:", 100 - 8)`,
      'Fuel: 92',
      ['Fuel: 100 - 8', 'Fuel:92', 'Fuel: 8'],
      'The calculation is not inside quotes, so Python works it out (100 - 8 = 92) before printing.',
    ),

    // ── Lesson 2 · Variables and data types ─────────────────────────────────
    mcq(
      2,
      'Which name can be used for a variable?',
      'crew_count',
      ['2crew', 'crew count', 'while'],
      'Names use letters, digits and underscores, cannot start with a digit, cannot contain spaces and cannot be a reserved word such as while.',
    ),
    codeOut(
      2,
      'python',
      `print(type(3.0))`,
      "<class 'float'>",
      ["<class 'int'>", "<class 'str'>", "<class 'bool'>"],
      'A number written with a decimal point is a float, even when its decimal part is zero.',
    ),
    codeOut(
      2,
      'python',
      `fuel = 90
fuel = fuel - 15
print(fuel)`,
      '75',
      ['90', '15', '105'],
      'Python works out fuel - 15 using the current value (90) and stores the answer (75) back in fuel.',
    ),
    codeOut(
      2,
      'python',
      `print(int("12") + 3)`,
      '15',
      ['123', '12 + 3', '"15"'],
      'int("12") turns the text into the number 12, so the + adds numbers: 12 + 3 = 15.',
    ),

    // ── Lesson 3 · Input, output and operators ──────────────────────────────
    mcq(
      3,
      'What type of value does input() always give back?',
      'A string (text)',
      ['An integer', 'A float', 'A Boolean'],
      'Even if the user types digits, input() returns text. Wrap it in int() or float() to calculate with it.',
    ),
    codeOut(
      3,
      'python',
      `print(17 // 5, 17 % 5)`,
      '3 2',
      ['3.4 2', '3 3', '2 3'],
      '17 // 5 is the whole-number part of the division (3) and 17 % 5 is what is left over (2).',
    ),
    codeOut(
      3,
      'python',
      `name = "Nova"
crew = 4
print(f"{name} leads {crew} astronauts")`,
      'Nova leads 4 astronauts',
      [
        '{name} leads {crew} astronauts',
        'name leads crew astronauts',
        'Nova leads crew astronauts',
      ],
      'In an f-string, the names inside the curly braces are replaced by their values.',
    ),
    codeOut(
      3,
      'python',
      `print((2 + 3) * 4)`,
      '20',
      ['14', '24', '9'],
      'Brackets are worked out first: 2 + 3 = 5, and then 5 * 4 = 20.',
    ),

    // ── Lesson 4 · Conditional logic ────────────────────────────────────────
    codeOut(
      4,
      'python',
      `age = 15
if age >= 18:
    print("adult")
elif age >= 13:
    print("teen")
else:
    print("child")`,
      'teen',
      ['adult', 'child', 'teen\nchild'],
      '15 is not at least 18, but it is at least 13, so the elif branch runs and the else branch is skipped.',
    ),
    mcq(
      4,
      'Which condition is True only when age is at least 12 and at most 18?',
      'age >= 12 and age <= 18',
      [
        'age >= 12 or age <= 18',
        'age > 12 and age < 18',
        'age == 12 and age == 18',
      ],
      'and needs both comparisons to be True, and >= and <= include the end values 12 and 18.',
    ),
    codeOut(
      4,
      'python',
      `temp = 30
if temp > 25:
    print("hot")
if temp > 20:
    print("warm")`,
      'hot\nwarm',
      ['hot', 'warm', 'warm\nhot'],
      'These are two separate if statements, and each one checks its own condition. 30 is greater than both 25 and 20.',
    ),
    mcq(
      4,
      'Which operator checks that two values are NOT equal?',
      '!=',
      ['==', '=!', '<>'],
      '!= is True when the two values differ. Two equals signs (==) test for equality.',
    ),

    // ── Lesson 5 · Loops ────────────────────────────────────────────────────
    codeOut(
      5,
      'python',
      `total = 0
for n in range(1, 4):
    total += n
print(total)`,
      '6',
      ['4', '10', '3'],
      'The loop adds 1, 2 and 3 to the total (range(1, 4) stops before 4): 1 + 2 + 3 = 6.',
    ),
    codeOut(
      5,
      'python',
      `for i in range(3):
    print("*" * (i + 1))`,
      '*\n**\n***',
      ['***\n**\n*', '***', '*\n*\n*'],
      'i is 0, 1 and 2, so the lines are "*" repeated 1, 2 and 3 times.',
    ),
    mcq(
      5,
      'What does the break statement do inside a loop?',
      'It ends the whole loop immediately',
      [
        'It skips to the next pass of the loop',
        'It pauses the loop for one second',
        'It restarts the loop from the beginning',
      ],
      'break leaves the loop at once. continue is the statement that skips to the next pass.',
    ),
    codeOut(
      5,
      'python',
      `for n in range(1, 6):
    if n == 3:
        continue
    print(n)`,
      '1\n2\n4\n5',
      ['1\n2', '1\n2\n3\n4\n5', '3'],
      'When n is 3, continue skips the print for that pass only, and the loop carries on with 4 and 5.',
    ),

    // ── Lesson 6 · Strings ──────────────────────────────────────────────────
    codeOut(
      6,
      'python',
      `word = "telescope"
print(word[0:4])`,
      'tele',
      ['tel', 'teles', 'scope'],
      'The slice [0:4] takes the characters at positions 0, 1, 2 and 3 and stops before position 4.',
    ),
    codeOut(
      6,
      'python',
      `print("Mission Control".replace("Control", "Base"))`,
      'Mission Base',
      ['Control Base', 'Mission Control', 'Base'],
      'replace() returns a new string in which every "Control" is swapped for "Base".',
    ),
    codeOut(
      6,
      'python',
      `text = "go go go"
print(text.count("go"))`,
      '3',
      ['2', '6', '1'],
      'count() tells you how many times the piece of text appears: "go" appears three times.',
    ),
    codeOut(
      6,
      'python',
      `print(len("Moon base"))`,
      '9',
      ['8', '2', '10'],
      'len() counts every character, including the space: M-o-o-n, a space, and b-a-s-e make 9.',
    ),

    // ── Lesson 7 · Collections ──────────────────────────────────────────────
    codeOut(
      7,
      'python',
      `crew = ["Nova", "Orion", "Lyra"]
crew.remove("Orion")
print(crew)`,
      "['Nova', 'Lyra']",
      ["['Orion']", "['Nova', 'Orion']", "['Nova', 'Orion', 'Lyra']"],
      'remove() deletes the first item that matches, so Orion is taken out of the list.',
    ),
    codeOut(
      7,
      'python',
      `supplies = {"food": 5, "water": 8}
supplies["food"] += 2
print(supplies["food"])`,
      '7',
      ['5', '8', '2'],
      'The value stored under the key "food" is read, increased by 2 and stored back: 5 + 2 = 7.',
    ),
    codeOut(
      7,
      'python',
      `print(len({1, 2, 2, 3, 3, 3}))`,
      '3',
      ['6', '5', '1'],
      'A set keeps each value only once, so the set holds just 1, 2 and 3.',
    ),

    // ── Lesson 8 · Functions ────────────────────────────────────────────────
    codeOut(
      8,
      'python',
      `def area(width, height=2):
    return width * height

print(area(5))`,
      '10',
      ['7', '5', '2'],
      'height was not given, so it uses its default value of 2: 5 * 2 = 10.',
    ),
    codeOut(
      8,
      'python',
      `def add(a, b):
    return a + b

print(add(add(1, 2), 3))`,
      '6',
      ['3', '123', '9'],
      'The inner call add(1, 2) returns 3, and then add(3, 3) returns 6.',
    ),
    mcq(
      8,
      'What does the return statement do?',
      'It sends a value back to the code that called the function and ends the function',
      [
        'It prints a value on the screen and keeps the function running',
        'It repeats the function until a condition is met',
        'It saves the value in a file',
      ],
      'return hands a value back to the caller. Printing is a different job that print() does.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'Python runs the instructions of a program from the top to the bottom, one at a time.',
      true,
      'Python starts at the first line and runs each instruction in order, stopping at the first error.',
    ),
    tf(
      2,
      'int(7.9) rounds the number up to 8.',
      false,
      'int() cuts off the decimals, so int(7.9) is 7.',
    ),
    tf(
      3,
      'The expression 10 / 2 gives the whole number 5 rather than the decimal 5.0.',
      false,
      'The / operator always gives a float, so 10 / 2 is 5.0. Use // for floor division.',
    ),
    tf(
      4,
      'In an if / elif / else chain, Python runs every branch whose condition is True.',
      false,
      'Python runs only the first branch whose condition is True and skips the rest.',
    ),
    tf(
      4,
      'The word elif is short for "else if".',
      true,
      'elif lets you test another condition when the earlier ones were False.',
    ),
    tf(
      5,
      'A while loop whose condition never becomes False will keep running forever.',
      true,
      'This is an infinite loop. Make sure something inside the loop changes the condition.',
    ),
    tf(
      6,
      'A string cannot be changed in place: name[0] = "L" causes an error.',
      true,
      'Strings are immutable. To change one you build a new string.',
    ),
    tf(
      7,
      'You can change a tuple by assigning a new value to one of its items.',
      false,
      'Tuples are immutable, so assigning to an item causes an error. Lists can be changed.',
    ),
    tf(
      8,
      'A variable that is created inside a function can be used anywhere in the program.',
      false,
      'It is a local variable: it exists only while the function runs.',
    ),
    tf(
      8,
      'A function can give back a value without printing anything.',
      true,
      'A function that uses return gives its result to the caller, which can store, print or reuse it.',
    ),
  ],
});

/** What this course adds to the Python Foundations Final Test (never a copy of a Course Test question). */
export const pythonProgrammingEssentialsExtras: ModuleExtras = {
  final: {
    mcq: [
      codeOut(
        1,
        'python',
        `print("A" + "B")`,
        'AB',
        ['A + B', 'A B', 'AB + AB'],
        'The + joins (concatenates) the two strings with nothing between them.',
      ),
      codeOut(
        2,
        'python',
        `name = "Lyra"
print(type(name) == str)`,
        'True',
        ['False', 'str', 'Lyra'],
        'name holds text, so its type is str and the comparison is True.',
      ),
      codeOut(
        3,
        'python',
        `x = 10
x *= 3
x -= 4
print(x)`,
        '26',
        ['30', '6', '34'],
        'x becomes 30 after *= 3 and then 26 after -= 4.',
      ),
      codeOut(
        3,
        'python',
        `print(2 ** 5)`,
        '32',
        ['10', '25', '7'],
        '** is the power operator: 2 to the power of 5 is 2 × 2 × 2 × 2 × 2 = 32.',
      ),
      codeOut(
        4,
        'python',
        `score = 72
if score >= 90:
    print("A")
elif score >= 70:
    print("B")
else:
    print("C")`,
        'B',
        ['A', 'C', 'A\nB'],
        '72 fails the first test but passes the second, so "B" is printed and the else branch is skipped.',
      ),
      codeOut(
        5,
        'python',
        `count = 0
for a in range(3):
    for b in range(2):
        count += 1
print(count)`,
        '6',
        ['5', '3', '2'],
        'The inner loop runs 2 times for each of the 3 passes of the outer loop: 3 × 2 = 6.',
      ),
      codeOut(
        6,
        'python',
        `print("rocket"[-1] + "rocket"[0])`,
        'tr',
        ['rt', 'tt', 'ro'],
        'Index -1 is the last character (t) and index 0 is the first (r), so the result is "tr".',
      ),
      codeOut(
        7,
        'python',
        `data = {"a": 1, "b": 2}
for key in data:
    print(key, data[key])`,
        'a 1\nb 2',
        ['1 a\n2 b', 'a\nb', 'a b\n1 2'],
        'Looping over a dictionary visits its keys, and data[key] looks up the value of each one.',
      ),
      codeOut(
        8,
        'python',
        `def f():
    x = 5
    return x

x = 1
print(f() + x)`,
        '6',
        ['10', '2', '5'],
        'The x inside f is a separate local variable. f() returns 5 and the global x is 1, so 5 + 1 = 6.',
      ),
    ],
    trueFalse: [
      tf(
        5,
        'The loop for i in range(5) runs its body five times.',
        true,
        'range(5) produces five numbers (0 to 4), so the loop body runs five times.',
      ),
      tf(
        7,
        'A set can hold the same value twice.',
        false,
        'A set keeps only unique values: adding a value that is already there changes nothing.',
      ),
    ],
  },
};
