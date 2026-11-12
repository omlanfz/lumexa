// FILE PATH: server/src/little-coders/assessments/banks/course4.ts
//
// COURSE 4 ASSESSMENT — Python Explorers (EduBlocks). Topics: 1 print and order · 2 Turtle ·
// 3 for loops · 4 variables and maths · 5 input and strings · 6 if / elif / else ·
// 7 random · 8 a quiz game. Every "what does this print?" answer is checked by running the
// program with real Python in the test suite.

import { bank, mcq, practical, pyCode, tf } from '../lc-bank.helpers';

export const course4Bank = bank({
  id: 'lc/course-test/python-explorers',
  title: 'Python Explorers — Course Assessment',
  kind: 'COURSE',
  moduleSlug: 'python-explorers',
  courseNumber: 4,
  mcq: [
    mcq('concept', 'EASY', 1, 'In EduBlocks, what does each block stand for?', 'A line of real Python code', ['A picture shown on the screen', 'A sprite on the Stage', 'A sound that plays'], 'EduBlocks blocks are real Python. Open the code view to see the same program written as text.'),
    mcq('concept', 'EASY', 4, 'What is a variable in Python?', 'A name that stores a value', ['A block that draws a line', 'A way to repeat code', 'A message shown to the user'], 'A variable has a name and holds a value, such as crew = 4.'),
    mcq('identify', 'EASY', 2, 'Which Turtle block turns the turtle so it can draw a corner?', '`turtle.right( 90 )`', ['`turtle.forward( 90 )`', '`turtle.penup()`', '`turtle.pencolor( "red" )`'], 'Right and left turn the turtle. Forward moves it, penup lifts the pen and pencolor changes the colour.'),
    mcq('identify', 'MEDIUM', 5, 'Which block asks the user a question and waits for an answer?', '`input( )`', ['`print( )`', '`range( )`', '`len( )`'], 'input shows a question and waits for the user to type. print only shows text.'),
    mcq('predict', 'MEDIUM', 4, 'What does this program print?', '12', ['7', '43', '3'], 'tanks is crew times days: 4 × 3 = 12.', {
      code: pyCode('variables| crew = 4', 'variables| days = 3', 'variables| tanks = crew * days', 'statements| print( tanks )'),
      verify: { stdout: '12' },
    }),
    mcq('predict', 'MEDIUM', 3, 'What does this program print?', '6', ['3', '2', '8'], 'The loop runs 3 times and adds 2 each time: 2, 4, then 6.', {
      code: pyCode('variables| total = 0', 'loops| for i in range( 3 ):', '  variables| total += 2', 'statements| print( total )'),
      verify: { stdout: '6' },
    }),
    mcq('sequence', 'MEDIUM', 6, 'Which message does this program print?', 'Warning', ['Safe', 'Danger', 'Nothing'], 'Python checks from the top. 45 is not bigger than 70, but it is bigger than 30, so it prints Warning and skips the rest.', {
      code: pyCode('variables| oxygen = 45', 'logic| if oxygen > 70:', '  statements| print( "Safe" )', 'logic| elif oxygen > 30:', '  statements| print( "Warning" )', 'logic| else:', '  statements| print( "Danger" )'),
      verify: { stdout: 'Warning' },
    }),
    mcq('predict', 'HARD', 5, 'What does this program print?', '10\nAge: 9', ['9\nAge: 9', '10\nAge: 10', '19\nAge: 19'], 'int( "9" ) turns the text 9 into the number 9, so age + 1 is 10. Joining the texts "Age: " and "9" gives Age: 9.', {
      code: pyCode('variables| age = int( "9" )', 'statements| print( age + 1 )', 'statements| print( "Age: " + "9" )'),
      verify: { stdout: '10\nAge: 9' },
    }),
    mcq('sequence', 'HARD', 8, 'What does this program print?', 'Score: 1', ['Perfect', 'Score: 0', 'Nothing is printed'], 'answer.lower() turns Mars into mars, so the first check is true and score becomes 1. The score is not bigger than 1, so the else part prints Score: 1.', {
      code: pyCode('variables| answer = "Mars"', 'variables| score = 0', 'logic| if answer.lower() == "mars":', '  variables| score += 1', 'logic| if score > 1:', '  statements| print( "Perfect" )', 'logic| else:', '  statements| print( "Score:", score )'),
      verify: { stdout: 'Score: 1' },
    }),
    mcq('mistake', 'HARD', 7, 'Python stops with the error “name random is not defined”. What is the mistake?', 'The program never imports random', ['randint needs three numbers', 'print cannot show a number', 'The variable roll is spelled wrong'], 'The random blocks need “import random” at the top of the program. Without it, Python does not know the name random.', {
      code: pyCode('variables| roll = random.randint( 1, 6 )', 'statements| print( roll )'),
      verify: { error: 'NameError' },
    }),
  ],
  trueFalse: [
    tf('EASY', 1, 'Python runs the blocks in a program from the top to the bottom.', true, 'Python reads one line at a time, from the first block to the last.'),
    tf('EASY', 6, 'In Python, a single = compares two values and says if they match.', false, 'One = stores a value. Two == compare two values.'),
    tf('MEDIUM', 3, 'A for loop with range( 4 ) repeats the blocks inside it 4 times.', true, 'range( 4 ) makes the loop run 4 times.'),
    tf('MEDIUM', 2, 'The block turtle.penup() lets the turtle move without drawing a line.', true, 'With the pen up, the turtle moves but leaves no line. pendown puts the pen back.'),
    tf('HARD', 5, 'input( ) always gives you a number, even when the user types 5.', false, 'input always gives text. Use int( ) to turn it into a number.'),
  ],
  practicals: [
    practical(null, 'Space Snack Bar', 'EduBlocks', {
      platform: 'EDUBLOCKS',
      brief: [
        'Build a Python program in EduBlocks for a snack bar on a space station.',
        'The program asks the visitor questions, does a calculation, makes a random choice and prints a friendly message using the answers.',
        'You choose the snack names and the numbers.',
      ],
      blocks: [
        { category: 'Imports / Random', blocks: ['import random', 'random.randint( )'] },
        { category: 'Statements', blocks: ['print( )', 'input( )', 'int( )'] },
        { category: 'Variables', blocks: ['variable = value'] },
        { category: 'Math', blocks: ['arithmetic ( + − × )'] },
        { category: 'Logic', blocks: ['if', 'elif', 'else', 'compare ( == )'] },
        { category: 'Loops', blocks: ['for i in range( ):'] },
      ],
      requirements: [
        'The program asks for the visitor’s name and for how many astronauts are eating, using input.',
        'The number of astronauts is turned into a whole number before it is used in maths.',
        'A variable stores the total snacks needed (astronauts times a number of snacks each that you choose).',
        'A random number from 1 to 3 chooses the snack of the day, and an if / elif / else prints a different snack for each number.',
        'A for loop prints a short countdown of at least 3 numbered lines before the final message.',
        'The final message uses the visitor’s name and the total number of snacks.',
      ],
      starter: { required: false, kind: 'NONE', label: '', url: '', note: '', modelLabels: [] },
      bonus: ['Print the visitor’s name in capital letters.'],
      handIn: 'Download your program from EduBlocks as a .py file and upload it, and/or upload a screenshot of your blocks and output, and/or paste a shareable link.',
    }),
  ],
});
