// FILE PATH: server/src/little-coders/curriculum/course4.ts
//
// COURSE 4 — PYTHON EXPLORERS (EduBlocks). Entirely block-based: no typing of Python is
// required. Eight lessons, one project each:
//   1 Mission Control Console · 2 Rocket Badge · 3 Rainbow Galaxy · 4 Moon Base Supply
//   Calculator · 5 Space Passport Generator · 6 Oxygen Safety Checker · 7 Alien Treasure
//   Machine · 8 Space Rescue Quiz
//
// Every block line is the Python the EduBlocks block shows. The tests run each runnable
// program with a real Python interpreter, so the code in a lesson always works.
// (This course was called "Python for Young Builders" before the redesign.)

import type { LcLessonSpec } from '../lc.types';
import { concept, mistake, py, tip, vid } from './helpers';

const TURTLE_HEAD = [
  'imports| from turtle import *',
  'turtle| turtle = Turtle()',
];

export const COURSE_4: LcLessonSpec[] = [
  // ───────────────────────────── 1 · Welcome to Python! ─────────────────────────────
  {
    course: 4,
    lesson: 1,
    title: 'Welcome to Python!',
    emoji: '🐍',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'Python is a real programming language — and you can build it with blocks.',
      objective:
        'Use print blocks in the right order to make a mission control console.',
      badge: 'Console Operator',
    },
    concepts: [
      concept(
        '🧩',
        'Blocks write code',
        'In EduBlocks, every block is a line of real Python.',
        'Press the code button to see the Python the blocks write. Blocks and code always match.',
      ),
      concept(
        '🖥️',
        'Output',
        'Output is what a program shows on the screen.',
        'In Python the print block shows text in the output box when you press Run.',
      ),
      concept(
        '📜',
        'Sequencing',
        'Python runs one line at a time, from top to bottom.',
        'If you swap two print blocks, the lines appear in the new order.',
      ),
      concept(
        '✍️',
        'Text in quotes',
        'Words inside quotation marks are text.',
        'print( "Hello" ) shows Hello. The quotes tell Python it is text, not a command.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Run the console',
      intro:
        'Press Run. Each line lights up as it runs, and the output appears below.',
      lines: [
        'statements| print( "Mission Control online" )',
        'statements| print( "Systems check..." )',
        'statements| print( "3" )',
        'statements| print( "2" )',
        'statements| print( "1" )',
        'statements| print( "Liftoff!" )',
      ],
      hint: 'What would happen if “Liftoff!” was the first block?',
    },
    examples: [
      py(
        'print',
        'The print block',
        [
          'statements| print( "Mission Control online" )',
          'statements| print( "Systems check..." )',
          'statements| print( "Liftoff!" )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'Shows the words between the quotes in the output.',
            '2': 'Runs second, so it appears second.',
            '3': 'The last line runs last.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Look at the code view',
        'Switch to the code view to see the Python your blocks write.',
      ),
      mistake(
        'Nothing shows up',
        'The print block is not connected to the start of the program, or you forgot to press Run.',
        'Snap the block under the others and press the Run button.',
      ),
      tip('Quotes matter', 'Text needs quotation marks. Numbers do not.'),
    ],
    challenge: {
      kind: 'order',
      prompt:
        'Put the print blocks in order so the countdown reads: 3, 2, 1, Liftoff!',
      language: 'edublocks',
      lines: [
        'statements| print( "3" )',
        'statements| print( "2" )',
        'statements| print( "1" )',
        'statements| print( "Liftoff!" )',
      ],
      hint: 'Python runs from top to bottom.',
      explain:
        'Python runs the first block first. So the order of the blocks is the order of the output.',
    },
    project: {
      name: 'Mission Control Console',
      goal: 'A console that welcomes the commander, shows a status check and counts down to liftoff.',
      steps: [
        {
          text: 'Open EduBlocks and choose Python. You will see the blocks on the left.',
        },
        {
          text: 'Find the Statements group. Drag a print block onto the workspace.',
        },
        {
          text: 'Type a welcome inside the quotes, like === MISSION CONTROL ===.',
        },
        { text: 'Add more print blocks for the welcome and the status check.' },
        { text: 'Add the countdown: 3, 2, 1, Liftoff!' },
        {
          text: 'Press Run and read your console. Open the code view to see the Python.',
          stack: 'console',
        },
      ],
      stacks: [
        py('console', 'Mission Control Console', [
          'statements| print( "=== MISSION CONTROL ===" )',
          'statements| print( "Welcome, Commander!" )',
          'statements| print( "All systems ready." )',
          'statements| print( "Launch in 3" )',
          'statements| print( "2" )',
          'statements| print( "1" )',
          'statements| print( "Liftoff!" )',
        ]),
      ],
      checklist: [
        'My console has a title',
        'It welcomes the commander',
        'It counts down 3, 2, 1',
        'It ends with Liftoff!',
      ],
      stretch: 'Add two more status lines before the countdown.',
    },
    homework: {
      name: 'Mini Console',
      instructions:
        'Make a shorter console with five print blocks: a title, a welcome, and a 2, 1, Liftoff! countdown.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'Press Run to check the output matches your plan.',
    },
    teacherNotes: `## Before class
- Open https://app.edublocks.org/ and check the group names in your version. Blocks show real Python text.
- Learners should be able to see the output panel when they press Run.

## Class flow (about 50 min)
1. **Hook (4 min)** – “What do you think Python is?” — hear the guesses.
2. **Tour (8 min)** – Palette on the left, workspace, Run button, code view.
3. **Demo (5 min)** – Run the page demo; point out one line = one block.
4. **Build (25 min)** – Project steps; learners personalise their console.
5. **Wrap-up (8 min)** – Each learner reads their console aloud.

## Discussion prompts
- What is the same about a Scratch script and a Python program?
- Why does the order of the blocks matter?

## Watch for
- Missing quotes (a red block or an error).
- Learners placing blocks loose on the workspace instead of snapped together.

## Starting a project
EduBlocks opens an empty workspace — nothing is pre-filled. Learners can save their work with the download option in the editor (it saves a .py file).`,
    video: vid(
      'Welcome to Python!',
      'What if blocks could write a real programming language?',
      'Build the Mission Control Console',
      {
        hook: [
          'A space console flickers to life and a green cursor blinks, waiting for a command.',
          'This is real Python code, the language used by real scientists. And you can build it with blocks!',
          'Real Python!',
        ],
        concept: [
          'A block snaps to the left and a line of Python code appears beside it, matching exactly.',
          'In EduBlocks, every block is a line of real Python. Blocks and code always match, so you learn Python as you build.',
          'Blocks = code',
        ],
        explain: [
          'A print block fires text onto the output screen. Lines stack in order, top to bottom.',
          'The print block shows text on the screen. Python reads from the top, one line at a time. Put text inside quotes.',
          'print( "text" )',
        ],
        demo: [
          'A countdown appears one line at a time: three, two, one, liftoff. A rocket rises.',
          'Three print blocks in order give you a countdown. Press Run and the lines appear in the same order as the blocks.',
          'Run!',
        ],
        tip: [
          'A missing quote shows a red squiggle; a hand adds it back.',
          'Tip: text needs quotation marks. If you see an error, check your quotes first.',
          'Check quotes',
        ],
        challenge: [
          'A jumbled pile of print blocks floats above the console.',
          'Put the blocks in order for a countdown. Then build your own Mission Control Console.',
          'Mission: Control Console',
        ],
      },
    ),
  },

  // ───────────────────────────── 2 · Drawing with Python ─────────────────────────────
  {
    course: 4,
    lesson: 2,
    title: 'Drawing with Python',
    emoji: '🎨',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'A little turtle can draw anything you tell it to.',
      objective:
        'Use Turtle blocks to draw a rocket badge with shapes, colours and moves.',
      badge: 'Badge Designer',
    },
    concepts: [
      concept(
        '🐢',
        'The turtle',
        'A turtle is a pen that moves on a canvas.',
        'It starts in the middle, facing right. You move it with forward, left and right blocks.',
      ),
      concept(
        '↪️',
        'Move and turn',
        'turtle.forward( 100 ) draws a line. turtle.right( 90 ) turns it.',
        'The number after forward is how far. The number after right is the angle in degrees.',
      ),
      concept(
        '🖊️',
        'Pen and colour',
        'turtle.pencolor changes the colour. penup lifts the pen. pendown puts it back.',
        'Lift the pen to move without drawing.',
      ),
      concept(
        '📌',
        'Go to a spot',
        'turtle.goto( x, y ) jumps to an exact spot.',
        'Use penup first, or you will draw a line to the new spot.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Watch the turtle draw',
      intro: 'Press Run. The turtle draws a badge circle and a red triangle.',
      lines: [
        ...TURTLE_HEAD,
        'turtle| turtle.pencolor( "navy" )',
        'turtle| turtle.width( 4 )',
        'turtle| turtle.circle( 70 )',
        'turtle| turtle.penup()',
        'turtle| turtle.goto( -25, 20 )',
        'turtle| turtle.pendown()',
        'turtle| turtle.pencolor( "red" )',
        'turtle| turtle.forward( 50 )',
        'turtle| turtle.left( 120 )',
        'turtle| turtle.forward( 50 )',
        'turtle| turtle.left( 120 )',
        'turtle| turtle.forward( 50 )',
      ],
      hint: 'Why does the turtle lift its pen before goto?',
    },
    examples: [
      py(
        'draw',
        'Draw a square',
        [
          ...TURTLE_HEAD,
          'turtle| turtle.forward( 100 )',
          'turtle| turtle.right( 90 )',
          'turtle| turtle.forward( 100 )',
          'turtle| turtle.right( 90 )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'Brings in the turtle drawing tools.',
            '2': 'Makes a turtle called turtle.',
            '3': 'Draws a line forwards.',
            '4': 'Turns right 90 degrees — a corner!',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Small numbers first',
        'Try forward( 50 ) to start. You can make it bigger later.',
      ),
      mistake(
        'The turtle draws a line I do not want',
        'The pen was down when the turtle moved to a new place.',
        'Use turtle.penup() before goto, then turtle.pendown().',
      ),
      tip(
        'Start with the turtle',
        'Always put the Turtle blocks at the top: the import, then “turtle = Turtle()”.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt:
        'The turtle faces right. Which block makes it draw a line going UP the screen?',
      options: [
        'turtle.left( 90 ) then turtle.forward( 100 )',
        'turtle.forward( 100 ) only',
        'turtle.pencolor( "red" )',
        'turtle.penup()',
      ],
      answer: 0,
      hint: 'First turn, then move.',
      explain:
        'Turning left 90 degrees makes the turtle face up. Then forward draws the line upwards.',
    },
    project: {
      name: 'Rocket Badge',
      goal: 'Draw a round badge with a red triangle rocket inside.',
      steps: [
        {
          text: 'From Imports, add “from turtle import *”. From Turtle, add “turtle = Turtle()”.',
        },
        {
          text: 'Add turtle.pencolor and turtle.width to choose the colour and thickness.',
        },
        { text: 'Add turtle.circle( 70 ) to draw the badge.' },
        {
          text: 'Use penup, goto and pendown to move inside the badge without drawing a line.',
        },
        {
          text: 'Draw a triangle with forward( 50 ) and left( 120 ), three times.',
        },
        {
          text: 'Press Run! Change the colours and sizes to make it yours.',
          stack: 'badge',
        },
      ],
      stacks: [
        py('badge', 'Rocket Badge', [
          ...TURTLE_HEAD,
          'turtle| turtle.pencolor( "navy" )',
          'turtle| turtle.width( 4 )',
          'turtle| turtle.circle( 70 )',
          'turtle| turtle.penup()',
          'turtle| turtle.goto( -25, 20 )',
          'turtle| turtle.pendown()',
          'turtle| turtle.pencolor( "red" )',
          'turtle| turtle.forward( 50 )',
          'turtle| turtle.left( 120 )',
          'turtle| turtle.forward( 50 )',
          'turtle| turtle.left( 120 )',
          'turtle| turtle.forward( 50 )',
        ]),
      ],
      checklist: [
        'My badge has a round border',
        'There is a triangle inside',
        'I used at least two colours',
        'I used penup and pendown',
      ],
      stretch:
        'Add two small circles as windows using goto and turtle.circle( 5 ).',
    },
    homework: {
      name: 'Mini Badge',
      instructions:
        'Draw a simpler badge: a circle with one coloured triangle or square inside.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your drawing.',
      hint: 'Use penup and goto to move inside the circle.',
    },
    teacherNotes: `## Before class
- Check that the Turtle group appears in EduBlocks (it shows \`turtle = Turtle()\`, \`turtle.forward( )\` …). The drawing appears in the output area.

## Class flow (about 50 min)
1. **Hook (4 min)** – “Draw a square” on the board by giving instructions (turn, move).
2. **Concepts (8 min)** – forward, right, angles.
3. **Demo (5 min)** – Watch the turtle draw in the page demo.
4. **Build (25 min)** – Project steps; change numbers to see effects.
5. **Gallery (8 min)** – Learners show badges.

## Discussion prompts
- Why do we turn 90 degrees for a square?
- What does the pen do when it is up?

## Watch for
- Missing the Turtle setup blocks at the top.
- Angles that do not close the shape (120 for a triangle).`,
    video: vid(
      'Drawing with Python',
      'How can code draw a picture?',
      'Build the Rocket Badge',
      {
        hook: [
          'A tiny turtle sits on a blank canvas, holding a pen, ready to draw.',
          'What if a few lines of code could draw a whole badge? Meet the turtle!',
          'Code can draw!',
        ],
        concept: [
          'The turtle moves forward and a line follows it. It turns, and a corner appears.',
          'The turtle is a pen that moves where you tell it. Forward draws a line. Right and left turn it.',
          'forward · right · left',
        ],
        explain: [
          'A colour wheel spins and the line changes colour. A pen lifts and lands. A goto arrow jumps the turtle.',
          'Pencolor changes the colour. Penup lifts the pen to move without drawing. Goto jumps to an exact spot.',
          'penup · goto · pendown',
        ],
        demo: [
          'A navy circle appears, then a red triangle inside it. A rocket badge is born.',
          'Draw a circle for the badge. Lift the pen, jump inside, and draw a red triangle. That is a rocket badge!',
          'circle + triangle',
        ],
        tip: [
          'An unwanted line streaks across the canvas; a lifted pen fixes it.',
          'Tip: use penup before goto, so you do not draw a line to the new spot.',
          'penup before goto',
        ],
        challenge: [
          'The turtle faces right and a question mark floats above it.',
          'How do you make the turtle draw a line up the screen? Then build your own Rocket Badge.',
          'Mission: Rocket Badge',
        ],
      },
    ),
  },

  // ───────────────────────────── 3 · Repeat Magic in Python ─────────────────────────────
  {
    course: 4,
    lesson: 3,
    title: 'Repeat Magic in Python',
    emoji: '🌈',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'Loops let one small idea fill a whole galaxy.',
      objective:
        'Use for loops with range to repeat Turtle moves and draw a rainbow galaxy.',
      badge: 'Loop Master',
    },
    concepts: [
      concept(
        '🔁',
        'Loops',
        'A loop repeats code so you do not copy and paste it.',
        'One loop of ten turns is much shorter than ten copies of the same blocks.',
      ),
      concept(
        '🔢',
        'for i in range( 5 ):',
        'This loop runs the blocks inside 5 times.',
        'The blocks that are indented inside the loop are the ones that repeat.',
      ),
      concept(
        '📥',
        'Inside the loop',
        'Blocks inside the loop repeat. Blocks outside run only once.',
        'Check the indent in the code view. Indented lines are inside the loop.',
      ),
      concept(
        '🌀',
        'Patterns',
        'Repeating a move and a turn makes patterns.',
        'Circle then turn 20 degrees, repeated 18 times, makes a flower!',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Watch the loop',
      intro:
        'Press Run. The turtle draws a circle, turns a little, and repeats — 18 times!',
      lines: [
        ...TURTLE_HEAD,
        'turtle| turtle.speed( 0 )',
        'turtle| turtle.pencolor( "red" )',
        'loops| for i in range( 18 ):',
        '  turtle| turtle.circle( 60 )',
        '  turtle| turtle.right( 20 )',
      ],
      hint: 'Which blocks are inside the loop?',
    },
    examples: [
      py(
        'loop',
        'A loop',
        [
          'loops| for i in range( 5 ):',
          '  statements| print( "Hello, galaxy!" )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'Repeats the blocks inside five times. i counts 0, 1, 2, 3, 4.',
            '2': 'This line is inside the loop, so it runs five times.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Count the repeats',
        'range( 18 ) repeats 18 times. A full turn is 360 degrees, so 18 times 20 degrees is a full turn.',
      ),
      mistake(
        'The loop draws only one circle',
        'The turn block is outside the loop, so only the circle repeats.',
        'Drag both blocks inside the loop so they repeat together.',
      ),
      tip(
        'Use speed 0',
        'turtle.speed( 0 ) makes the turtle draw as fast as possible.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'How many times does “Hello” print?',
      code: {
        language: 'edublocks',
        lines: [
          'loops| for i in range( 4 ):',
          '  statements| print( "Hello" )',
        ],
      },
      options: ['4', '3', '5', '1'],
      answer: 0,
      hint: 'Look at the number inside range.',
      explain:
        'range( 4 ) repeats the blocks inside 4 times. So Hello prints 4 times.',
    },
    project: {
      name: 'Rainbow Galaxy',
      goal: 'Draw spinning circles in three colours to make a rainbow galaxy.',
      steps: [
        {
          text: 'Add the Turtle setup blocks: import, “turtle = Turtle()”, and turtle.speed( 0 ).',
        },
        { text: 'Add turtle.pencolor( "red" ).' },
        { text: 'From Loops, add “for i in range( 18 ):”.' },
        { text: 'Inside it, add turtle.circle( 60 ) and turtle.right( 20 ).' },
        { text: 'Change the colour, add a second loop with a smaller circle.' },
        {
          text: 'Press Run and watch your galaxy. Add a third colour!',
          stack: 'galaxy',
        },
      ],
      stacks: [
        py('galaxy', 'Rainbow Galaxy', [
          ...TURTLE_HEAD,
          'turtle| turtle.speed( 0 )',
          'turtle| turtle.width( 2 )',
          'turtle| turtle.pencolor( "red" )',
          'loops| for i in range( 18 ):',
          '  turtle| turtle.circle( 60 )',
          '  turtle| turtle.right( 20 )',
          'turtle| turtle.pencolor( "blue" )',
          'loops| for i in range( 18 ):',
          '  turtle| turtle.circle( 40 )',
          '  turtle| turtle.right( 20 )',
        ]),
      ],
      checklist: [
        'My drawing uses at least two colours',
        'Each shape is made with a loop',
        'The circles are inside the loop',
        'I changed a number to make it my own',
      ],
      stretch: 'Add a third loop with a smaller circle in a third colour.',
    },
    homework: {
      name: 'One-Colour Flower',
      instructions:
        'Draw a simpler flower: one for loop that draws a circle and turns, in one colour.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your drawing.',
      hint: '18 repeats of a 20-degree turn make a full circle.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (4 min)** – “Clap 5 times” vs. “Repeat 5 times: clap”.
2. **Concepts (8 min)** – Loops, range, indent.
3. **Demo (5 min)** – Watch the galaxy appear.
4. **Build (25 min)** – Project steps; ask learners to predict before pressing Run.
5. **Share (8 min)** – Gallery walk.

## Discussion prompts
- Which blocks are inside the loop, and how can you tell?
- How many degrees make a full turn?

## Watch for
- Loop blocks left empty.
- Using different numbers so the shape never closes — try 360 / repeats.`,
    video: vid(
      'Repeat Magic in Python',
      'How do you draw a hundred circles without a hundred blocks?',
      'Build the Rainbow Galaxy',
      {
        hook: [
          'A turtle draws a single circle. Then a thousand circles fill the screen in a blink.',
          'This galaxy has hundreds of circles. But the code is only a few blocks long. How?',
          'Loop magic!',
        ],
        concept: [
          'A loop arrow circles around a block and a counter ticks up one by one.',
          'A loop repeats blocks again and again. In Python, a for loop with range tells it how many times.',
          'for ... in range',
        ],
        explain: [
          'Blocks inside the loop glow and repeat. Blocks outside the loop stay dark and run once.',
          'Blocks inside the loop repeat. Blocks outside run once. A circle and a small turn, repeated, makes a flower pattern.',
          'Inside = repeats',
        ],
        demo: [
          'A red flower grows petal by petal, then a blue one blooms inside it.',
          'Draw a circle, turn a little, and repeat eighteen times. Then switch colour for a rainbow galaxy.',
          'range( 18 )',
        ],
        tip: [
          'A single lonely circle appears; an arrow drags the turn block into the loop.',
          'Tip: if only one circle appears, check that both blocks are inside the loop. Look at the indent.',
          'Both inside!',
        ],
        challenge: [
          'A loop with four printed hellos waits on screen as a number floats nearby.',
          'How many times does the loop run? Then build your own Rainbow Galaxy.',
          'Mission: Rainbow Galaxy',
        ],
      },
    ),
  },

  // ───────────────────────────── 4 · Variables & Calculations ─────────────────────────────
  {
    course: 4,
    lesson: 4,
    title: 'Variables & Calculations',
    emoji: '🧮',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'Computers are brilliant at maths — if you give them the numbers.',
      objective:
        'Use variables and arithmetic to calculate the supplies a moon base needs.',
      badge: 'Supply Officer',
    },
    concepts: [
      concept(
        '📦',
        'Variables',
        'A variable is a name that holds a value.',
        'astronauts = 4 stores the number 4 in a box named astronauts.',
      ),
      concept(
        '➗',
        'Arithmetic',
        'Python can add, subtract, multiply and divide.',
        'Use + for add, - for subtract, * for multiply and / for divide.',
      ),
      concept(
        '🔄',
        'Change a variable',
        'You can update a variable with a new value.',
        'days += 1 adds one to days. days = 10 replaces it with 10.',
      ),
      concept(
        '🖨️',
        'Print the result',
        'Print a label and a variable together.',
        'print( "Total:", total ) shows the words and the number on one line.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Run the calculator',
      intro:
        'Press Run and watch the variables fill up as the program calculates.',
      lines: [
        'variables| astronauts = 4',
        'variables| days = 7',
        'variables| oxygen_per_day = 3',
        'variables| oxygen_needed = astronauts * days * oxygen_per_day',
        'statements| print( "Oxygen tanks needed:", oxygen_needed )',
      ],
      hint: 'What is 4 × 7 × 3?',
    },
    examples: [
      py(
        'calc',
        'Variables and maths',
        [
          'variables| astronauts = 4',
          'variables| days = 7',
          'variables| oxygen_needed = astronauts * days * 3',
          'statements| print( "Oxygen tanks needed:", oxygen_needed )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'Stores 4 in astronauts.',
            '3': 'Multiplies three values and stores the answer.',
            '4': 'Prints a label and the answer.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Pick clear names',
        'oxygen_needed is a better name than x. Use underscores instead of spaces.',
      ),
      mistake(
        'Python says a name is not defined',
        'You used a variable before you set it, or spelled it differently.',
        'Set every variable above the line that uses it, and check the spelling.',
      ),
      tip(
        'Test with small numbers',
        'Try 2 astronauts and 2 days first. You can check the answer in your head.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'What does this program print?',
      code: {
        language: 'edublocks',
        lines: [
          'variables| crew = 3',
          'variables| days = 5',
          'variables| food = crew * days',
          'statements| print( food )',
        ],
      },
      options: ['15', '8', '35', '5'],
      answer: 0,
      hint: 'The * sign means multiply.',
      explain: '3 times 5 is 15. Python stores 15 in food and prints it.',
    },
    project: {
      name: 'Moon Base Supply Calculator',
      goal: 'Calculate how many oxygen tanks, food packs and total supplies a moon base needs.',
      steps: [
        {
          text: 'Make variables: astronauts = 4, days = 7, oxygen_per_day = 3 and food_per_day = 2.',
        },
        { text: 'Make oxygen_needed = astronauts * days * oxygen_per_day.' },
        { text: 'Print “Oxygen tanks needed:” and oxygen_needed.' },
        {
          text: 'Do the same for the food: food_needed = astronauts * days * food_per_day.',
        },
        { text: 'Add total = oxygen_needed + food_needed and print it.' },
        {
          text: 'Change astronauts and days and run it again. Does the answer change?',
          stack: 'supplies',
        },
      ],
      stacks: [
        py('supplies', 'Supply Calculator', [
          'variables| astronauts = 4',
          'variables| days = 7',
          'variables| oxygen_per_day = 3',
          'variables| food_per_day = 2',
          'variables| oxygen_needed = astronauts * days * oxygen_per_day',
          'statements| print( "Oxygen tanks needed:", oxygen_needed )',
          'variables| food_needed = astronauts * days * food_per_day',
          'statements| print( "Food packs needed:", food_needed )',
          'variables| total = oxygen_needed + food_needed',
          'statements| print( "Total supplies:", total )',
        ]),
      ],
      checklist: [
        'All my numbers are stored in variables',
        'It calculates oxygen and food',
        'It prints a total',
        'It still works when I change a number',
      ],
      stretch:
        'Add water_needed with its own variable and add it to the total.',
    },
    homework: {
      name: 'Snack Calculator',
      instructions:
        'Make a simpler calculator: how many snacks do 3 astronauts need for 5 days if each eats 2 a day?',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'Use one multiplication and one print.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (4 min)** – “How many tanks for 4 people for a week?” Do it on paper first.
2. **Concepts (8 min)** – Variable boxes; operators.
3. **Demo (5 min)** – Run the calculator.
4. **Build (25 min)** – Project steps; learners change the numbers.
5. **Reflect (8 min)** – Why use variables instead of typing 84?

## Discussion prompts
- What happens if you change astronauts to 6?
- Why is oxygen_needed a better name than x?

## Watch for
- Using a variable before it is set.
- Variable names with spaces.

## Tip for print
To print words and a value on one line, use the Text group’s comma list block inside print.`,
    video: vid(
      'Variables & Calculations',
      'How do you plan supplies for a moon base?',
      'Build the Moon Base Supply Calculator',
      {
        hook: [
          'A moon base glows in the dark. A pile of crates waits, and nobody knows how many are enough.',
          'Four astronauts, seven days. How many oxygen tanks do they need? You could count. Or code!',
          'Calculate!',
        ],
        concept: [
          'Labelled boxes appear on a shelf: astronauts, days, tanks. Numbers drop into each one.',
          'A variable is a name that stores a value. Python can read it and use it in calculations.',
          'Variables store values',
        ],
        explain: [
          'Boxes slide into a multiplication machine. Out comes a big number. A plus sign adds two results together.',
          'Use plus to add, minus to subtract, star to multiply and slash to divide. Store the answer in a new variable.',
          '+ − × ÷',
        ],
        demo: [
          'The program multiplies four by seven by three and prints eighty-four oxygen tanks.',
          'Four astronauts, seven days, three tanks a day. Python multiplies it all and prints eighty-four!',
          'astronauts * days',
        ],
        tip: [
          'A red error says name not defined; a hand moves the variable above the line.',
          'Tip: set a variable before you use it, and spell it exactly the same each time.',
          'Set it first',
        ],
        challenge: [
          'Three crates and five days float above a multiplication sign.',
          'What does three times five print? Then build your own Moon Base Supply Calculator.',
          'Mission: Supply Calculator',
        ],
      },
    ),
  },

  // ───────────────────────────── 5 · Let the User Join In! ─────────────────────────────
  {
    course: 4,
    lesson: 5,
    title: 'Let the User Join In!',
    emoji: '🛂',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'The best programs ask you questions.',
      objective:
        'Use input and strings to build a passport generator that uses the traveller’s answers.',
      badge: 'Passport Officer',
    },
    concepts: [
      concept(
        '⌨️',
        'Input',
        'input( ) asks a question and waits for the user to type an answer.',
        'name = input( "What is your name?" ) stores the answer in name.',
      ),
      concept(
        '🔤',
        'Strings',
        'Text in Python is called a string.',
        'A string can be a name, a planet or a sentence. Use quotes for strings you type in the code.',
      ),
      concept(
        '🔠',
        'Change the text',
        'name.upper() makes letters capital. name.lower() makes them small.',
        'These blocks are in the Text group. They return a new string.',
      ),
      concept(
        '🔢',
        'Numbers from input',
        'input always gives text, even for numbers.',
        'Wrap it in int( ) to turn it into a number you can add to.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Make a passport',
      intro: 'Type your answers into the boxes, then press Run.',
      inputs: ['Alex', 'Mars', '9'],
      lines: [
        'variables| name = input( "What is your name?" )',
        'variables| planet = input( "Which planet are you from?" )',
        'variables| age = int( input( "How old are you?" ) )',
        'statements| print( "=== SPACE PASSPORT ===" )',
        'statements| print( "Name:", name.upper() )',
        'statements| print( "Home planet:", planet )',
        'statements| print( "Next year you will be", age + 1 )',
      ],
      hint: 'Why do we use int( ) around the age?',
    },
    examples: [
      py(
        'input',
        'Ask and answer',
        [
          'variables| name = input( "What is your name?" )',
          'statements| print( "Welcome aboard,", name )',
          'statements| print( name.upper() )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'Asks the question and stores the answer.',
            '2': 'Prints text and the answer.',
            '3': 'Prints the name in capital letters.',
          },
        },
      ),
    ],
    tips: [
      tip('Ask clearly', 'Write the question so the user knows what to type.'),
      mistake(
        'Python says it cannot add a number to text',
        'The age came from input( ), so it is text, not a number.',
        'Use int( input( ... ) ) to turn the answer into a number.',
      ),
      tip(
        'Test with different answers',
        'Run your program twice with different answers. The output should change.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt:
        'The user types 9 for age. Which line turns it into a number so you can add 1?',
      options: [
        'age = int( input( "How old are you?" ) )',
        'age = input( "How old are you?" )',
        'age = print( "How old are you?" )',
        'age = str( 9 )',
      ],
      answer: 0,
      hint: 'You need to wrap the input.',
      explain:
        'input( ) gives text. int( ) turns it into a whole number, so age + 1 works.',
    },
    project: {
      name: 'Space Passport Generator',
      goal: 'Ask the traveller three questions and print a space passport with their answers.',
      steps: [
        { text: 'Add name = input( "What is your name?" ).' },
        { text: 'Add planet = input( "Which planet are you from?" ).' },
        { text: 'Add age = int( input( "How old are you?" ) ).' },
        { text: 'Print a title: === SPACE PASSPORT ===.' },
        { text: 'Print the name (use .upper()), the planet and the age.' },
        {
          text: 'Print “Next year you will be”, age + 1. Run it and answer the questions!',
          stack: 'passport',
        },
      ],
      stacks: [
        py('passport', 'Space Passport', [
          'variables| name = input( "What is your name?" )',
          'variables| planet = input( "Which planet are you from?" )',
          'variables| age = int( input( "How old are you?" ) )',
          'statements| print( "=== SPACE PASSPORT ===" )',
          'statements| print( "Name:", name.upper() )',
          'statements| print( "Home planet:", planet )',
          'statements| print( "Age:", age )',
          'statements| print( "Next year you will be", age + 1 )',
          'statements| print( "Welcome aboard!" )',
        ]),
      ],
      checklist: [
        'It asks three questions',
        'It prints the answers back',
        'The name is in capital letters',
        'The age plus one works',
      ],
      stretch: 'Ask for a favourite food and add it to the passport.',
    },
    homework: {
      name: 'Name Badge',
      instructions:
        'Make a simpler program: ask for a name and a favourite colour, then print a short badge with both.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'Use two input blocks and two print blocks.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (4 min)** – “Interview” a learner: what questions would a computer ask?
2. **Concepts (8 min)** – input, strings, int.
3. **Demo (5 min)** – Fill in the demo answers and run.
4. **Build (25 min)** – Project steps; swap answers with a partner.
5. **Wrap-up (8 min)** – Show off passports.

## Discussion prompts
- Why does age need int( )?
- What could go wrong if the user types a word for age?

## Watch for
- Forgetting the quotes in the question.
- Typing the answer in the wrong place — the input box appears when the program runs.`,
    video: vid(
      'Let the User Join In!',
      'How does a program ask you a question?',
      'Build the Space Passport Generator',
      {
        hook: [
          'A passport officer at a space gate slides a blank passport across the counter and asks a question.',
          'Welcome to the space gate! But who are you, and where are you from? The program has to ask!',
          'Ask the user!',
        ],
        concept: [
          'A speech bubble pops out of the program and a keyboard types an answer back into a variable box.',
          'Input asks a question and waits for the answer. The answer goes into a variable you can use later.',
          'input( )',
        ],
        explain: [
          'The answer Mars drops into the planet box. A magic wand turns the name into big capitals. A number gets wrapped in int.',
          'Words are called strings. You can change them, like upper for capitals. Input always gives text, so wrap numbers in int.',
          'upper() · int( )',
        ],
        demo: [
          'The program asks three questions. The answers fill a glowing space passport, stamped and ready.',
          'Type a name, a planet and an age. The program prints your passport and tells you how old you will be next year.',
          'age + 1',
        ],
        tip: [
          'Red text says cannot add number to text; an int wrapper turns the text into a number.',
          'Tip: input always gives text. Use int to turn it into a number before adding.',
          'Wrap it in int( )',
        ],
        challenge: [
          'The passport officer holds up the number nine and a wrapper block.',
          'Which block turns the typed nine into a number? Then build your own Space Passport Generator.',
          'Mission: Passport Generator',
        ],
      },
    ),
  },

  // ───────────────────────────── 6 · Making Decisions in Python ─────────────────────────────
  {
    course: 4,
    lesson: 6,
    title: 'Making Decisions in Python',
    emoji: '🫁',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'Programs can make choices, just like you do.',
      objective:
        'Use if, elif and else with comparisons to build an oxygen safety checker.',
      badge: 'Safety Officer',
    },
    concepts: [
      concept(
        '🔀',
        'if and else',
        'if runs blocks only when something is true. else runs when it is not.',
        'You can only follow one path. Python picks the first one that is true.',
      ),
      concept(
        '⚖️',
        'Comparisons',
        'Compare with ==, !=, <, <=, > and >=.',
        '== asks “are they equal?”. One = stores a value, two == compares.',
      ),
      concept(
        '🪜',
        'elif',
        'elif means “else if”. It checks another question.',
        'Use it when you have more than two paths, such as safe, warning and danger.',
      ),
      concept(
        '📏',
        'Indentation',
        'Blocks inside an if are indented in the code view.',
        'The indented lines belong to that if. They run only when it is true.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Check the oxygen',
      intro: 'Type an oxygen level, then press Run. Try 80, then 50, then 10.',
      inputs: ['55'],
      lines: [
        'variables| oxygen = int( input( "Oxygen level (0-100)?" ) )',
        'logic| if oxygen > 70:',
        '  statements| print( "Safe: plenty of oxygen." )',
        'logic| elif oxygen > 30:',
        '  statements| print( "Warning: oxygen is getting low." )',
        'logic| else:',
        '  statements| print( "DANGER: return to base now!" )',
      ],
      hint: 'Which path runs for 55?',
    },
    examples: [
      py(
        'decide',
        'if / elif / else',
        [
          'logic| if oxygen > 70:',
          '  statements| print( "Safe" )',
          'logic| elif oxygen > 30:',
          '  statements| print( "Warning" )',
          'logic| else:',
          '  statements| print( "Danger" )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'Checks the first question.',
            '3': 'Only checked if the first was false.',
            '5': 'Runs when nothing above was true.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Order matters',
        'Python checks from top to bottom and stops at the first true one. Put the biggest number first.',
      ),
      mistake(
        'The wrong message shows',
        'You used = (store) instead of == (compare), or the checks are in the wrong order.',
        'Use == to compare, and test the biggest number first.',
      ),
      tip(
        'Test every path',
        'Try one number for each path: safe, warning and danger.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'oxygen is 20. What does this program print?',
      code: {
        language: 'edublocks',
        lines: [
          'variables| oxygen = 20',
          'logic| if oxygen > 70:',
          '  statements| print( "Safe" )',
          'logic| elif oxygen > 30:',
          '  statements| print( "Warning" )',
          'logic| else:',
          '  statements| print( "Danger" )',
        ],
      },
      options: ['Danger', 'Safe', 'Warning', 'Nothing'],
      answer: 0,
      hint: 'Is 20 bigger than 70? Is it bigger than 30?',
      explain:
        '20 is not bigger than 70 and not bigger than 30, so Python runs the else path: Danger.',
    },
    project: {
      name: 'Oxygen Safety Checker',
      goal: 'Ask for an oxygen level and print Safe, Warning or Danger.',
      steps: [
        { text: 'Add oxygen = int( input( "Oxygen level (0-100)?" ) ).' },
        {
          text: 'From Logic, add an if block. Use the compare block: oxygen > 70.',
        },
        { text: 'Inside it, print "Safe: plenty of oxygen."' },
        { text: 'Add an elif for oxygen > 30 that prints a warning.' },
        { text: 'Add an else that prints DANGER.' },
        {
          text: 'Run it three times with 80, 50 and 10. All three paths should work!',
          stack: 'checker',
        },
      ],
      stacks: [
        py('checker', 'Oxygen Checker', [
          'variables| oxygen = int( input( "Oxygen level (0-100)?" ) )',
          'logic| if oxygen > 70:',
          '  statements| print( "Safe: plenty of oxygen." )',
          'logic| elif oxygen > 30:',
          '  statements| print( "Warning: oxygen is getting low." )',
          'logic| else:',
          '  statements| print( "DANGER: return to base now!" )',
        ]),
      ],
      checklist: [
        'It asks for an oxygen level',
        'It prints three different messages',
        'I tested a high, medium and low number',
        'The checks are in the right order',
      ],
      stretch: 'Add a fourth level for exactly 100: “Tanks are full!”.',
    },
    homework: {
      name: 'Two-Way Checker',
      instructions:
        'Make a simpler checker with only if and else: oxygen above 50 is Safe, otherwise Danger.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'Run it twice, with a high and a low number.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (4 min)** – Human “if”: stand if you are taller than the teacher.
2. **Concepts (8 min)** – if / elif / else; == vs =.
3. **Demo (5 min)** – Try three numbers.
4. **Build (25 min)** – Project steps; test three paths.
5. **Reflect (8 min)** – Swap programs and try to break them.

## Discussion prompts
- What happens if we swap the order of the checks?
- When would we use elif instead of another if?

## Watch for
- = used instead of ==.
- Blocks placed outside the if, not inside it.`,
    video: vid(
      'Making Decisions in Python',
      'How does a program choose what to do?',
      'Build the Oxygen Safety Checker',
      {
        hook: [
          'A warning light on a space base flashes red, then green, then amber, as a number changes.',
          'The oxygen is dropping! How does the computer know whether to stay calm or sound the alarm?',
          'Make a choice!',
        ],
        concept: [
          'A path splits into three glowing roads: green, amber and red, and a number rolls down one of them.',
          'If, elif and else let a program choose one path. Python checks each question from the top down.',
          'if / elif / else',
        ],
        explain: [
          'A scale compares two numbers. Two equals signs ask are they the same. Indented blocks slide inside each road.',
          'Compare numbers with bigger than, smaller than and double equals. The blocks inside, indented, run only when the question is true.',
          '>  <  ==',
        ],
        demo: [
          'A level of eighty shows safe. Fifty shows warning. Ten sounds the red alarm.',
          'Eighty is safe. Fifty is a warning. Ten is danger! The same program gives three different answers.',
          '80 · 50 · 10',
        ],
        tip: [
          'One equals sign sits in a question box with a red cross; a double equals fixes it.',
          'Tip: use double equals to compare. A single equals stores a value. Test all three paths.',
          '== compares',
        ],
        challenge: [
          'A gauge at twenty points at three roads and asks which one it takes.',
          'Oxygen is twenty. Which message prints? Then build your own Oxygen Safety Checker.',
          'Mission: Safety Checker',
        ],
      },
    ),
  },

  // ───────────────────────────── 7 · Randomness & Smart Decisions ─────────────────────────────
  {
    course: 4,
    lesson: 7,
    title: 'Randomness & Smart Decisions',
    emoji: '🎰',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'A little luck makes a program feel alive.',
      objective:
        'Use random numbers and conditions to build an alien treasure machine.',
      badge: 'Treasure Hunter',
    },
    concepts: [
      concept(
        '🎲',
        'Random numbers',
        'random.randint( 1, 6 ) gives a whole number from 1 to 6.',
        'Both ends count, just like a dice. It can be different every time you run.',
      ),
      concept(
        '📥',
        'Import random',
        'Random blocks need “import random” at the top.',
        'Without it, Python says the name random is not defined.',
      ),
      concept(
        '🧠',
        'Smart decisions',
        'Use the random number in if / elif / else.',
        'Each number leads to a different prize. The program decides for you.',
      ),
      concept(
        '🔗',
        'and / or',
        '“or” is true when either side is true. “and” needs both.',
        'if roll == 1 or roll == 2 is true when the roll is 1 or 2.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Open the treasure machine',
      intro: 'Press Run. Press it again — the answer can change!',
      lines: [
        'imports| import random',
        'variables| roll = random.randint( 1, 6 )',
        'statements| print( "You rolled", roll )',
        'logic| if roll == 6:',
        '  statements| print( "Jackpot! A golden star!" )',
        'logic| elif roll > 3:',
        '  statements| print( "Nice! A shiny crystal." )',
        'logic| else:',
        '  statements| print( "A small space pebble." )',
      ],
      hint: 'Which numbers give a crystal?',
    },
    examples: [
      py(
        'random',
        'A random roll',
        [
          'imports| import random',
          'variables| roll = random.randint( 1, 6 )',
          'statements| print( "You rolled", roll )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'Brings in the random tools.',
            '2': 'Picks a random whole number from 1 to 6.',
            '3': 'Shows the number.',
          },
        },
      ),
    ],
    tips: [
      tip('Run it many times', 'Press Run ten times. Do you see every prize?'),
      mistake(
        'Python says random is not defined',
        'The program does not import random.',
        'Add “import random” at the top. If you cannot find an import random block, type it into the custom code block.',
      ),
      tip('Both ends count', 'randint( 1, 6 ) can give 1 and it can give 6.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'Which block gives a random whole number from 1 to 10?',
      options: [
        'random.randint( 1, 10 )',
        'print( 10 )',
        'int( "10" )',
        'range( 10 )',
      ],
      answer: 0,
      hint: 'It has a first and last number.',
      explain:
        'random.randint( 1, 10 ) picks a whole number between 1 and 10, including both.',
    },
    project: {
      name: 'Alien Treasure Machine',
      goal: 'Press Run to open the machine and win a random treasure: pebble, crystal or golden star.',
      steps: [
        { text: 'Add “import random” at the top (check the Imports group).' },
        { text: 'Add roll = random.randint( 1, 6 ).' },
        { text: 'Print "You rolled" and roll.' },
        {
          text: 'Add if roll == 6 for the golden star, elif roll > 3 for a crystal.',
        },
        { text: 'Add an else for the small pebble.' },
        {
          text: 'Run it ten times and write down which treasures you find.',
          stack: 'treasure',
        },
      ],
      stacks: [
        py('treasure', 'Treasure Machine', [
          'imports| import random',
          'variables| roll = random.randint( 1, 6 )',
          'statements| print( "You rolled", roll )',
          'logic| if roll == 6:',
          '  statements| print( "Jackpot! A golden star!" )',
          'logic| elif roll > 3:',
          '  statements| print( "Nice! A shiny crystal." )',
          'logic| else:',
          '  statements| print( "A small space pebble." )',
        ]),
      ],
      checklist: [
        'I imported random',
        'The roll changes each time',
        'Three different treasures can appear',
        'I ran it at least ten times',
      ],
      stretch: 'Use “or” to give the same prize for rolls 1 or 2.',
    },
    homework: {
      name: 'Coin Flip',
      instructions:
        'Make a simpler machine: roll random.randint( 1, 2 ). Print Heads for 1 and Tails for anything else.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'You need import random, one roll and one if / else.',
    },
    teacherNotes: `## Before class
- Check the Imports group in your EduBlocks version. If it has no “import random”, type \`import random\` into the custom code block (“# your own code”) at the top.

## Class flow (about 50 min)
1. **Hook (4 min)** – Roll a dice. “Can you predict it?”.
2. **Concepts (8 min)** – randint, import, using the number in if/elif/else.
3. **Demo (5 min)** – Run the demo many times.
4. **Build (25 min)** – Project steps.
5. **Share (8 min)** – Who got the golden star first?

## Discussion prompts
- Why do we run it many times to test?
- What is the chance of rolling a 6?

## Watch for
- Missing import.
- elif checks in the wrong order.`,
    video: vid(
      'Randomness & Smart Decisions',
      'How does a program surprise you?',
      'Build the Alien Treasure Machine',
      {
        hook: [
          'A glowing alien vending machine shakes. Something drops, but nobody knows what.',
          'Every time you press the button, something different drops out. How does a program do that?',
          'Press the button!',
        ],
        concept: [
          'A dice rolls through space and lands on a number as arrows fan out to prizes.',
          'Random numbers let a program choose by luck. random dot randint gives a whole number between two values.',
          'random.randint',
        ],
        explain: [
          'A banner says import random at the top. The rolled number flows into an if, elif, else ladder with three prizes.',
          'Import random first. Then use the number in a decision: six gets a golden star, higher than three a crystal, else a pebble.',
          'import random',
        ],
        demo: [
          'The machine rumbles. A pebble drops. Press again, and a golden star shines.',
          'Run the program once and get a pebble. Run it again and you might get a golden star!',
          'Run again!',
        ],
        tip: [
          'An error says random is not defined; an import banner appears at the top.',
          'Tip: if Python says random is not defined, add import random at the top.',
          'import random',
        ],
        challenge: [
          'A dice floats and a question mark follows it.',
          'Which block rolls one to ten? Then build your own Alien Treasure Machine.',
          'Mission: Treasure Machine',
        ],
      },
    ),
  },

  // ───────────────────────────── 8 · My First Python Game ─────────────────────────────
  {
    course: 4,
    lesson: 8,
    title: 'My First Python Game',
    emoji: '🏆',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'You now know enough Python to build a game.',
      objective:
        'Combine input, variables, if / else and a score into a Space Rescue Quiz.',
      badge: 'Game Maker',
    },
    concepts: [
      concept(
        '🎯',
        'A game plan',
        'A quiz asks, checks, scores and finishes.',
        'Plan the steps first: ask a question, check the answer, add a point, show the score.',
      ),
      concept(
        '🔤',
        'Compare text',
        'Use == to check if two strings are equal.',
        'answer.lower() == "mars" is true if the player types Mars, mars or MARS.',
      ),
      concept(
        '➕',
        'Score with +=',
        'score += 1 adds one point.',
        'Start with score = 0. Add one each time the answer is right.',
      ),
      concept(
        '🏁',
        'The final message',
        'Use the score to choose a final message.',
        'Perfect score? Mission complete! Otherwise, try again.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Play the quiz',
      intro: 'Type your answers, then press Run. Try one right and one wrong!',
      inputs: ['mars', '8'],
      lines: [
        'variables| score = 0',
        'variables| answer = input( "Which planet is the Red Planet?" )',
        'logic| if answer.lower() == "mars":',
        '  statements| print( "Correct!" )',
        '  variables| score += 1',
        'logic| else:',
        '  statements| print( "Not quite. It is Mars." )',
        'variables| answer = input( "How many legs does a spider have?" )',
        'logic| if answer == "8":',
        '  statements| print( "Correct!" )',
        '  variables| score += 1',
        'logic| else:',
        '  statements| print( "Not quite. It is 8." )',
        'statements| print( "Your score:", score, "out of 2" )',
      ],
      hint: 'When does the score go up?',
    },
    examples: [
      py(
        'quiz',
        'One question',
        [
          'variables| score = 0',
          'variables| answer = input( "Which planet is the Red Planet?" )',
          'logic| if answer.lower() == "mars":',
          '  statements| print( "Correct!" )',
          '  variables| score += 1',
          'logic| else:',
          '  statements| print( "Not quite." )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'Start with no points.',
            '3': 'Compares the answer, ignoring capital letters.',
            '5': 'Adds one point.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Plan before you build',
        'Write your three questions and answers on paper first.',
      ),
      mistake(
        'Right answers are marked wrong',
        'The player typed Mars with a capital, but you compared with "mars".',
        'Use .lower() on the answer before you compare.',
      ),
      tip(
        'Test with all right and all wrong',
        'Run your quiz with every answer right, then every answer wrong.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'The player types MARS. Which check says it is correct?',
      options: [
        'answer.lower() == "mars"',
        'answer == "mars"',
        'answer = "mars"',
        'answer != "mars"',
      ],
      answer: 0,
      hint: 'Make the letters small before you compare.',
      explain:
        '.lower() makes MARS into mars, so the comparison is true. A single = would store a value, not compare.',
    },
    project: {
      name: 'Space Rescue Quiz',
      goal: 'A three-question space quiz that keeps score and ends with a message.',
      steps: [
        {
          text: 'Plan three questions about space, with a short answer for each.',
        },
        { text: 'Start with score = 0.' },
        {
          text: 'Question 1: answer = input( ... ), then an if / else that prints Correct or Not quite. Add score += 1 when right.',
        },
        {
          text: 'Copy the question block twice for questions 2 and 3 and change the words.',
        },
        { text: 'Print “Your score:”, score, “out of 3”.' },
        {
          text: 'Finish with an if / else that prints a different message for a perfect score.',
          stack: 'quiz',
        },
      ],
      stacks: [
        py('quiz', 'Quiz skeleton', [
          'variables| score = 0',
          'variables| answer = input( "Which planet is the Red Planet?" )',
          'logic| if answer.lower() == "mars":',
          '  statements| print( "Correct!" )',
          '  variables| score += 1',
          'logic| else:',
          '  statements| print( "Not quite. It is Mars." )',
          'statements| print( "Your score:", score )',
        ]),
        py('finish', 'The ending', [
          'logic| if score == 3:',
          '  statements| print( "Mission complete! Perfect score!" )',
          'logic| else:',
          '  statements| print( "Good try. Play again!" )',
        ]),
      ],
      checklist: [
        'It asks three questions',
        'It scores right answers',
        'It shows the score',
        'It has a different ending for a perfect score',
      ],
      stretch: 'Add a fourth question that asks for a number and uses int( ).',
    },
    homework: {
      name: 'One-Question Quiz',
      instructions:
        'Make a simpler quiz with one question, a score and a Correct / Not quite message.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'Use score = 0, one input, one if / else, and one print for the score.',
    },
    teacherNotes: `## Class flow (about 55 min)
1. **Hook (4 min)** – Play a quick quiz out loud; “How would we code this?”.
2. **Plan (7 min)** – Learners write three questions on paper.
3. **Demo (5 min)** – Try the page demo with right and wrong answers.
4. **Build (30 min)** – Project steps; test with a partner.
5. **Showcase (9 min)** – Learners quiz each other.

## Discussion prompts
- Which parts of the quiz did you reuse?
- How could you add more questions quickly?

## Watch for
- Capital letters in answers.
- Score not reset or placed inside the if.`,
    video: vid(
      'My First Python Game',
      'Can you build a whole game with the blocks you know?',
      'Build the Space Rescue Quiz',
      {
        hook: [
          'A rescue ship flies toward a stranded astronaut. A quiz screen flickers: answer to open the airlock!',
          'The astronaut is stuck behind a locked door. Only the right answers will open it!',
          'Rescue time!',
        ],
        concept: [
          'A game plan unfolds with four glowing steps: ask, check, score, finish.',
          'A quiz game follows a simple plan: ask a question, check the answer, add to the score, and show the result.',
          'Ask · check · score',
        ],
        explain: [
          'A typed answer is made lowercase and compared. A score counter ticks up with plus equals.',
          'Use lower so any capital letters work. Compare with double equals. If it matches, add one with plus equals.',
          '.lower() == · score += 1',
        ],
        demo: [
          'The player answers Mars and gets a point. A wrong answer says not quite. The final score appears.',
          'Answer correctly and the score rises. At the end, the game prints your score and a final message.',
          'Score out of 3',
        ],
        tip: [
          'A capital letter makes a correct answer fail; a lower tool fixes it.',
          'Tip: use lower on the answer so Mars, mars and MARS all work.',
          '.lower()',
        ],
        challenge: [
          'The astronaut taps the airlock and holds up a keyboard.',
          'The player types a capital word. Which check still marks it right? Then build your own Space Rescue Quiz.',
          'Mission: Rescue Quiz',
        ],
      },
    ),
  },
];
