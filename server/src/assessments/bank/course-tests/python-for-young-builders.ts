// FILE PATH: server/src/assessments/bank/course-tests/python-for-young-builders.ts
//
// Little Coders Path → "Python for Young Builders" (8 lessons, 3 projects:
// Personal Quiz App, Simple Calculator, Word Guessing Game).
// Topics: 1 print & first programs · 2 variables & input · 3 f-strings & int() ·
// 4 if / elif / else · 5 for & while loops · 6 lists · 7 a mini quiz app ·
// 8 the final mini game.
//
// Learners are young: keep the wording simple. Wherever the lesson uses
// input(), the snippets assign the typed answer to a variable instead, so every
// snippet is runnable and verified by the bank test suite.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

export const pythonForYoungBuilders = bank({
  id: 'course-test/python-for-young-builders',
  title: 'Python for Young Builders — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Hello, Python ────────────────────────────────────────────
    mcq(
      1,
      'What does the Python command `print()` do?',
      'It makes words or numbers show up on the screen',
      [
        'It sends the code to a printer',
        'It saves your program',
        'It deletes the last line',
      ],
      'A Scratch "say" block and Python\'s print() do the same job: they make words show up.',
    ),
    mcq(
      1,
      'What does Python need around the words you want to show?',
      'Quotation marks',
      ['Square brackets [ ]', 'Curly braces { }', 'Hashtags #'],
      'Words in code are wrapped in quotes, like "Hello". The parentheses ( ) go around what is inside print.',
    ),
    mcq(
      1,
      'Why does `print("Hello, world!)` cause an error?',
      'The closing quotation mark is missing',
      [
        'The word print is spelled wrong',
        'There are too many letters',
        'Python does not like the word Hello',
      ],
      'Python needs a quote at the start AND the end of your text.',
    ),
    codeOut(
      1,
      'python',
      `print("Hi", "Sam")
print("Score:", 10)`,
      'Hi Sam\nScore: 10',
      ['HiSam\nScore:10', 'Hi, Sam\nScore:, 10', 'Hi Sam\nScore 10'],
      'When print() is given several things separated by commas, it puts a space between them. Each print() starts a new line.',
    ),

    // ── Lesson 2 · Variables and input ──────────────────────────────────────
    codeOut(
      2,
      'python',
      `name = "Captain Nova"
print(name)
print("name")`,
      'Captain Nova\nname',
      ['name\nname', 'Captain Nova\nCaptain Nova', 'name\nCaptain Nova'],
      'print(name) shows what is inside the box called name. print("name") has quotes, so it shows the word itself.',
    ),
    mcq(
      2,
      'In Python, what does the `=` sign mean in `score = 10`?',
      'Store the value 10 in the box called score',
      [
        'These two things are equal, like in maths class',
        'Add 10 to the score',
        'Print the score',
      ],
      'A variable is like a labelled box. The = puts something inside it.',
    ),
    codeOut(
      2,
      'python',
      `score = 10
bonus = 5
total = score + bonus
print(total)`,
      '15',
      ['10', '5', 'score + bonus'],
      'total stores the result of 10 + 5, and print(total) shows what is in the box.',
    ),
    mcq(
      2,
      'This code gives an error. Why?\n\n```python\nname = "Ana"\nprint(nam)\n```',
      'The variable is called name but print uses nam — a typo',
      [
        'Names cannot have letters in them',
        'print cannot show a variable',
        'The quotes are on the wrong side',
      ],
      'A variable name has to be spelled exactly the same every time.',
    ),

    // ── Lesson 3 · f-strings ────────────────────────────────────────────────
    codeOut(
      3,
      'python',
      `name = "Nova"
age = 10
print(f"Hello, {name}! You are {age} years old.")`,
      'Hello, Nova! You are 10 years old.',
      [
        'Hello, {name}! You are {age} years old.',
        'Hello, name! You are age years old.',
        'Hello, Nova! You are age years old.',
      ],
      'The f before the quotes tells Python to fill in the blanks in curly braces with the values of the variables.',
    ),
    mcq(
      3,
      'What happens if you forget the `f` before the quotes in an f-string?',
      'Python shows the curly braces exactly as typed',
      [
        'Python fills in the variables anyway',
        'Python stops with a red error every time',
        'The text turns into a number',
      ],
      'Without the f, {name} is just ordinary text.',
    ),
    mcq(
      3,
      'Why do we use `int()` on an answer from `input()` before doing maths with it?',
      'input() always gives text, so int() turns it into a number',
      [
        'int() makes the answer shorter',
        'input() only gives whole numbers',
        'int() asks the question again',
      ],
      'Even if the player types 9, input() gives back the text "9". Adding 1 to text causes a TypeError.',
    ),
    codeOut(
      3,
      'python',
      `age_text = "9"
age_number = int(age_text)
print(f"Next year you will be {age_number + 1}!")`,
      'Next year you will be 10!',
      [
        'Next year you will be 91!',
        'Next year you will be {age_number + 1}!',
        'Next year you will be 9!',
      ],
      'int("9") makes the number 9, and the f-string works out 9 + 1 = 10 inside the curly braces.',
    ),

    // ── Lesson 4 · If / elif / else ─────────────────────────────────────────
    codeOut(
      4,
      'python',
      `age = 10
if age > 10:
    print("big kid missions")
elif age == 10:
    print("just became old enough")
else:
    print("soon")`,
      'just became old enough',
      ['big kid missions', 'soon', 'nothing is printed'],
      'age > 10 is False (10 is not bigger than 10), but age == 10 is True, so the elif branch runs.',
    ),
    mcq(
      4,
      'What two things are wrong with this code?\n\n```python\nage = 12\nif age >= 10\nprint("You are old enough!")\n```',
      'The if line is missing its colon, and the print line is not indented',
      [
        'The word if should be capital letters',
        'The number 12 needs quotes, and print needs a capital P',
        'There is nothing wrong with it',
      ],
      'An if line must end with a colon, and the lines inside it must be pushed in (indented).',
    ),
    mcq(
      4,
      'What is the difference between `=` and `==` in Python?',
      '`=` stores a value; `==` checks whether two things are equal',
      [
        'They are exactly the same',
        '`==` stores a value; `=` checks if things are equal',
        '`=` adds numbers; `==` subtracts them',
      ],
      'Using a single = where you meant to compare is a classic beginner mistake.',
    ),
    codeOut(
      4,
      'python',
      `age = 11
has_permission = "no"
if age >= 10 and has_permission == "yes":
    print("advanced mission")
else:
    print("not yet")`,
      'not yet',
      ['advanced mission', 'Error', 'nothing is printed'],
      'With `and`, BOTH parts must be true. age >= 10 is true, but has_permission == "yes" is false, so the else branch runs.',
    ),

    // ── Lesson 5 · Loops ────────────────────────────────────────────────────
    codeOut(
      5,
      'python',
      `for i in range(5):
    print(i)`,
      '0\n1\n2\n3\n4',
      ['1\n2\n3\n4\n5', '0\n1\n2\n3\n4\n5', '5'],
      'range(5) gives five numbers, but Python starts counting at 0, so it stops at 4.',
    ),
    codeOut(
      5,
      'python',
      `for i in range(5, 0, -1):
    print(i)
print("Liftoff!")`,
      '5\n4\n3\n2\n1\nLiftoff!',
      [
        '5\n4\n3\n2\n1\n0\nLiftoff!',
        '1\n2\n3\n4\n5\nLiftoff!',
        '4\n3\n2\n1\n0\nLiftoff!',
      ],
      'range(5, 0, -1) counts down from 5 and stops before 0. The last print is not indented, so it runs once after the loop.',
    ),
    codeOut(
      5,
      'python',
      `count = 1
while count <= 3:
    print(f"Lap {count}")
    count = count + 1`,
      'Lap 1\nLap 2\nLap 3',
      ['Lap 1\nLap 2', 'Lap 2\nLap 3', 'Lap 1\nLap 2\nLap 3\nLap 4'],
      'The loop keeps going while count is 3 or less. When count becomes 4, the condition is false and the loop stops.',
    ),
    mcq(
      5,
      'This loop never stops. Why?\n\n```python\ncount = 1\nwhile count <= 3:\n    print(count)\n```',
      'Nothing inside the loop changes count, so the condition is always true',
      [
        'print cannot be used in a loop',
        'The number 3 is too small',
        'while loops always run forever',
      ],
      'A while loop must change the thing it checks, for example count = count + 1.',
    ),

    // ── Lesson 6 · Lists ────────────────────────────────────────────────────
    codeOut(
      6,
      'python',
      `crew = ["Nova", "Max", "Zara"]
print(crew[0], crew[2])`,
      'Nova Zara',
      ['Max Zara', 'Nova Max', 'Zara Nova'],
      'Lists start counting at 0, so crew[0] is the first item and crew[2] is the third.',
    ),
    mcq(
      6,
      'A list has three items. What happens when you ask for item number 3, like `crew[3]`?',
      'Python shows an IndexError, because the valid index numbers are 0, 1 and 2',
      [
        'Python shows the last item',
        'Python shows the first item again',
        'Python adds a new item',
      ],
      'Counting starts at 0, so a list of three items has the indexes 0, 1 and 2.',
    ),
    codeOut(
      6,
      'python',
      `crew = ["Nova", "Max", "Zara"]
print(f"There are {len(crew)} crew members.")`,
      'There are 3 crew members.',
      [
        'There are 2 crew members.',
        'There are {len(crew)} crew members.',
        'There are Zara crew members.',
      ],
      'len() tells you how many items are in the list. Inside an f-string it is worked out and filled in.',
    ),
    mcq(
      6,
      'What does `random.choice(crew)` do?',
      'Picks one item from the list at random',
      [
        'Puts the list in a random order',
        'Deletes one item',
        'Counts the items in the list',
      ],
      'Run it a few times and the captain changes. Remember to import random at the top of the file.',
    ),

    // ── Lesson 7 · Mini quiz app ────────────────────────────────────────────
    codeOut(
      7,
      'python',
      `score = 0

answer1 = "green"
if answer1 == "green":
    score = score + 1

answer2 = "7"
if answer2 == "8":
    score = score + 1

print(f"You scored {score} out of 2!")`,
      'You scored 1 out of 2!',
      [
        'You scored 2 out of 2!',
        'You scored 0 out of 2!',
        'You scored {score} out of 2!',
      ],
      'The first answer matches, so the score goes up by one. The second answer ("7") does not match "8", so the score stays the same.',
    ),
    mcq(
      7,
      'What does `score = score + 1` mean?',
      'Take what is in the score box, add 1 to it, and put the new total back in the box',
      [
        'Make the score equal to 1',
        'Check whether the score is bigger than 1',
        'Print the score plus the number 1',
      ],
      'It works like a scoreboard that ticks up one point at a time.',
    ),
    mcq(
      7,
      'A quiz never gives a point for the right answer 8. The code says `if answer == 8:`. What is wrong?',
      'input() gives text, so the answer should be compared with "8" in quotes',
      [
        'The number 8 is too big',
        'if cannot be used in a quiz',
        'The word answer is not allowed',
      ],
      'The text "8" and the number 8 are different things, so they are never equal.',
    ),
    codeOut(
      7,
      'python',
      `score = 2
if score == 3:
    print("Perfect")
elif score >= 1:
    print("Good try")
else:
    print("Try again")`,
      'Good try',
      ['Perfect', 'Try again', 'Perfect\nGood try'],
      'score == 3 is false, but score >= 1 is true, so the elif branch runs. Only one branch of an if/elif/else ever runs.',
    ),

    // ── Lesson 8 · The final mini game ──────────────────────────────────────
    mcq(
      8,
      'Which numbers can `random.randint(1, 5)` give?',
      'Any whole number from 1 to 5, including both 1 and 5',
      [
        'Only 1, 2, 3 and 4',
        'Any number with decimals between 1 and 5',
        'Only the number 5',
      ],
      'randint picks a random WHOLE number and includes both ends.',
    ),
    mcq(
      8,
      'Why should a game designer plan before typing any code?',
      'To decide what the player does, what the rules are, and how they win or lose',
      [
        'Because Python will not start without a plan',
        'Because plans make the code shorter',
        'Because a plan runs the game for you',
      ],
      'Great game designers plan first, then build, then test.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'A Scratch "say" block and Python\'s `print()` do the same job: they make words show up.',
      true,
      'The only difference is how we tell the computer: blocks versus typed text.',
    ),
    tf(
      2,
      'A variable can be spelled differently each time you use it and Python will still understand.',
      false,
      'Names have to be spelled exactly the same every time. Even a small typo makes a new name that Python does not know.',
    ),
    tf(
      3,
      'If a player types 12, `input()` gives back the number 12.',
      false,
      'input() always gives back text. Use int() to turn it into a number.',
    ),
    tf(
      4,
      '`elif` lets Python check more than two choices.',
      true,
      'elif means "else, if this other thing is true".',
    ),
    tf(
      5,
      'A `while` loop stops by itself even if nothing inside it ever changes.',
      false,
      'If nothing changes the thing the loop checks, the condition stays true forever.',
    ),
    tf(
      6,
      'The first item in a Python list is item number 1.',
      false,
      'Lists start counting at 0, so the first item is item number 0.',
    ),
    tf(
      7,
      'A quiz app is made from three tools: ask a question with `input()`, check the answer with `if`/`else`, and keep score with a counting variable.',
      true,
      'Those three tools working together are all a simple quiz needs.',
    ),
    tf(
      8,
      'When you test your game, you should try answers that should win AND answers that should lose.',
      true,
      'Testing both shows whether every part of the game works.',
    ),
    tf(
      8,
      'If you see a red error message, read it carefully — it often tells you which line has the problem.',
      true,
      'Error messages are clues. Fix one thing at a time, then run it again.',
    ),
    tf(
      8,
      'When fixing a bug, you should change lots of things at the same time to save time.',
      false,
      'Fix one thing at a time and run it again, so you know which change worked.',
    ),
  ],
});

// Position 2 of the Little Coders Final Test, position 2 of Odyssey Stage 1 and
// position 2 of the Odyssey Final Test.
export const pythonForYoungBuildersExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'How could you draw a tiny rocket picture using letters and symbols?',
        'Use several print() lines, one for each row of the picture',
        [
          'Use one print() with the word rocket',
          'Use a for loop with no print()',
          'Python cannot draw with letters',
        ],
        'Each print() makes one line, so several lines stacked up make a picture.',
      ),
      codeOut(
        2,
        'python',
        `planet = "Mars"
planet = "Venus"
print(planet)`,
        'Venus',
        ['Mars', 'Mars Venus', 'planet'],
        'A variable holds one thing at a time. The second line replaces "Mars" with "Venus".',
      ),
      codeOut(
        3,
        'python',
        `age = 12
print(f"In 10 years you will be {age + 10} years old!")`,
        'In 10 years you will be 22 years old!',
        [
          'In 10 years you will be 12 years old!',
          'In 10 years you will be {age + 10} years old!',
          'In 10 years you will be 1210 years old!',
        ],
        'Maths works inside the curly braces of an f-string: 12 + 10 = 22.',
      ),
      mcq(
        3,
        'Why does `print(f"{age + 1}")` give a TypeError when `age` came straight from `input()`?',
        'age is text, and you cannot add a number to text',
        [
          'The curly braces are not allowed',
          'input() is not allowed in an f-string',
          'age needs to be a capital letter',
        ],
        'Turn the text into a number first with int().',
      ),
      codeOut(
        4,
        'python',
        `score = 75
if score >= 90:
    print("A")
elif score >= 70:
    print("B")
else:
    print("Keep practicing")`,
        'B',
        ['A', 'Keep practicing', 'A\nB'],
        'Python checks from the top. 75 is not 90 or more, but it is 70 or more, so it prints B and skips the rest.',
      ),
      codeOut(
        5,
        'python',
        `total = 0
for i in range(1, 4):
    total = total + i
print(total)`,
        '6',
        ['10', '3', '4'],
        'range(1, 4) gives 1, 2 and 3 (it stops before 4), and 1 + 2 + 3 = 6.',
      ),
      codeOut(
        6,
        'python',
        `crew = ["Nova", "Max"]
for i in range(len(crew)):
    print(i, crew[i])`,
        '0 Nova\n1 Max',
        ['1 Nova\n2 Max', '0 Max\n1 Nova', 'Nova Max'],
        'range(len(crew)) gives the index numbers 0 and 1, and crew[i] is the item at each index.',
      ),
      mcq(
        8,
        'What does a "replay loop" in the Lucky Number game do?',
        'It keeps asking "Play again?" and stops when the answer is not "yes"',
        [
          'It picks a new secret number every second',
          'It makes the player win every time',
          'It closes the game after one try',
        ],
        'while play_again == "yes": runs the whole game again each time the player says yes.',
      ),
    ],
    trueFalse: [
      tf(
        5,
        '`range(5)` gives five numbers, starting at 0.',
        true,
        'The numbers are 0, 1, 2, 3 and 4.',
      ),
      tf(
        6,
        'In Python, list indexes start at 1, just like counting everyday things.',
        false,
        'Python lists start at 0.',
      ),
    ],
  },
  stage: {
    mcq: [
      mcq(
        1,
        'In `print("Hello")`, what are the quotation marks for?',
        'To mark the words you want to show',
        [
          'To make the text louder',
          'To make the text a different colour',
          'To stop the program',
        ],
        'Python needs quotes to know where the words begin and end.',
      ),
      mcq(
        1,
        'What are the parentheses ( ) after the word `print` for?',
        'To hold what you want to print',
        [
          'To make the text smaller',
          'To count the letters',
          'To end the program',
        ],
        'Python is very exact: it needs the parentheses as well as the quotes.',
      ),
      codeOut(
        2,
        'python',
        `a = 4
b = a * 2
a = 1
print(a, b)`,
        '1 8',
        ['1 2', '4 8', '8 1'],
        'b was worked out when a was 4, so it stays 8. Changing a afterwards does not change b.',
      ),
      mcq(
        2,
        'Why are there no quote marks around `name` in `print(name)`?',
        'We want what is inside the name box, not the word "name"',
        [
          'Quotes are only for numbers',
          'Python cannot print quotes',
          'It is a mistake that Python ignores',
        ],
        'With quotes, print("name") would show the word name.',
      ),
      codeOut(
        3,
        'python',
        `print(f"{3 + 4} apples")`,
        '7 apples',
        ['3 + 4 apples', '{7} apples', '34 apples'],
        'Python works out 3 + 4 inside the curly braces, then fills in the answer.',
      ),
      codeOut(
        4,
        'python',
        `x = 5
if x > 3 and x < 5:
    print("A")
elif x >= 5:
    print("B")
else:
    print("C")`,
        'B',
        ['A', 'C', 'A\nB'],
        'x > 3 is true but x < 5 is false, so the `and` is false. The elif x >= 5 is true, so B is printed.',
      ),
      codeOut(
        5,
        'python',
        `n = 3
while n > 0:
    print(n)
    n = n - 1
print("Go!")`,
        '3\n2\n1\nGo!',
        ['3\n2\n1\n0\nGo!', '2\n1\nGo!', '3\n2\n1'],
        'The loop prints n and then lowers it. When n reaches 0, the condition n > 0 is false and the loop ends, so 0 is never printed.',
      ),
      codeOut(
        6,
        'python',
        `crew = ["Nova", "Max", "Zara", "Kai"]
print(len(crew), crew[3])`,
        '4 Kai',
        ['3 Kai', '4 Zara', '4 Max'],
        'There are four items, and index 3 is the fourth item, "Kai".',
      ),
      mcq(
        7,
        'A quiz wants three different messages: perfect, good try and try again. Which structure fits?',
        'if / elif / else',
        [
          'Three separate for loops',
          'A list with three items',
          'Three variables named score',
        ],
        'if, elif and else choose exactly one of several branches.',
      ),
      mcq(
        8,
        'Why does `import random` go at the very top of the file?',
        'Python needs to know about random before it can use random.randint()',
        [
          'It makes the file shorter',
          'It makes the game run faster',
          'It is just a decoration',
        ],
        'You must import a tool before you can use it.',
      ),
    ],
    trueFalse: [
      tf(
        5,
        'A `for` loop is the one to use when you know how many times to repeat.',
        true,
        'For example, for i in range(5) repeats exactly five times.',
      ),
      tf(
        5,
        'A `while` loop checks its condition only once, before its first pass.',
        false,
        'A while loop checks its condition before every pass.',
      ),
      tf(
        6,
        'A list can hold many pieces of information, in order, under one name.',
        true,
        'That is why a list is like a row of connected boxes.',
      ),
    ],
  },
  odyssey: {
    mcq: [
      codeOut(
        2,
        'python',
        `price = 4
qty = 3
print(price * qty)`,
        '12',
        ['7', '43', '34'],
        'The * sign multiplies: 4 × 3 = 12.',
      ),
      mcq(
        4,
        'Which line is written correctly?',
        '`if age >= 10:`',
        ['`if age >= 10`', '`if age => 10:`', '`if age = 10:`'],
        'An if line needs a colon at the end, the comparison is written >=, and a single = would store a value instead of checking one.',
      ),
      mcq(
        6,
        'What is the index number of the first item in a Python list?',
        '0',
        ['1', '-1', '2'],
        'Python lists start counting at 0.',
      ),
    ],
    trueFalse: [
      tf(
        2,
        'A variable name has to be spelled exactly the same way every time you use it.',
        true,
        'A typo such as nam instead of name makes Python look for a box that does not exist.',
      ),
    ],
  },
};
