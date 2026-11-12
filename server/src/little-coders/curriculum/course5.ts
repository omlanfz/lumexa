// FILE PATH: server/src/little-coders/curriculum/course5.ts
//
// COURSE 5 — PYTHON CREATIVE LAB (EduBlocks). Entirely block-based. Eight lessons:
//   1 Planet Picker · 2 Solar System Parade · 3 Star Stamp Studio · 4 Custom Planet Maker
//   5 Space Password Challenge · 6 Galaxy Pattern Generator · 7 Repair Mission Control
//   8 Space Explorer Adventure (capstone)
//
// EduBlocks' Loops group has "for [variable] in [expression]:" (for each) and
// "for [i] in range( ):" (counting) — both are used here. Programs are real Python and are
// executed by the tests.

import type { LcLessonSpec } from '../lc.types';
import { concept, mistake, py, tip, vid } from './helpers';

const TURTLE_HEAD = [
  'imports| from turtle import *',
  'turtle| turtle = Turtle()',
];

export const COURSE_5: LcLessonSpec[] = [
  // ───────────────────────────── 1 · Working with Lists ─────────────────────────────
  {
    course: 5,
    lesson: 1,
    title: 'Working with Lists',
    emoji: '🪐',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'A list lets one variable hold many things.',
      objective:
        'Store planets in a list, read items by index, add new ones and pick one at random.',
      badge: 'List Keeper',
    },
    concepts: [
      concept(
        '📋',
        'Lists',
        'A list holds many values in one variable.',
        'planets = ["Mercury", "Venus", "Earth"] stores three names in one box.',
      ),
      concept(
        '🔢',
        'Indexing',
        'Every item has a number, called its index. Counting starts at 0.',
        'planets[0] is the first item. planets[2] is the third.',
      ),
      concept(
        '➕',
        'Add to a list',
        'planets.append( "Mars" ) adds an item at the end.',
        'The Lists group also has insert, remove and pop blocks.',
      ),
      concept(
        '🎲',
        'Pick at random',
        'random.choice( planets ) picks one item for you.',
        'Use len( planets ) to count how many items the list has.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Explore a list',
      intro:
        'Press Run to see the first planet, the size of the list, a new item and a random pick.',
      lines: [
        'imports| import random',
        'lists| planets = ["Mercury", "Venus", "Earth", "Mars"]',
        'statements| print( planets[0] )',
        'statements| print( "Planets:", len( planets ) )',
        'lists| planets.append( "Jupiter" )',
        'statements| print( "Planets now:", len( planets ) )',
        'variables| pick = random.choice( planets )',
        'statements| print( "Your planet is", pick )',
      ],
      hint: 'Why is planets[0] the first planet?',
    },
    examples: [
      py(
        'list',
        'A list and its items',
        [
          'lists| planets = ["Mercury", "Venus", "Earth"]',
          'statements| print( planets[0] )',
          'statements| print( planets[2] )',
          'lists| planets.append( "Mars" )',
          'statements| print( len( planets ) )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'Makes a list with three items.',
            '2': 'Index 0 is the first item: Mercury.',
            '3': 'Index 2 is the third item: Earth.',
            '4': 'Adds Mars at the end.',
            '5': 'The list now has four items.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Start counting at 0',
        'The first item is index 0, the second is index 1. Computers start at 0.',
      ),
      mistake(
        'Python says list index out of range',
        'You asked for an index that is bigger than the last item.',
        'A list of 4 items has indexes 0, 1, 2 and 3. Check len( ) first.',
      ),
      tip(
        'Commas separate items',
        'Put a comma between each item. Words need quotes.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'What does this program print?',
      code: {
        language: 'edublocks',
        lines: [
          'lists| planets = ["Mercury", "Venus", "Earth", "Mars"]',
          'statements| print( planets[1] )',
        ],
      },
      options: ['Venus', 'Mercury', 'Earth', 'Mars'],
      answer: 0,
      hint: 'Counting starts at 0.',
      explain: 'Index 0 is Mercury, so index 1 is Venus.',
    },
    project: {
      name: 'Planet Picker',
      goal: 'Make a list of planets and let Python pick one for the explorer to visit.',
      steps: [
        { text: 'Add “import random” at the top.' },
        {
          text: 'From Lists, make planets = [ "Mercury", "Venus", "Earth", "Mars", "Jupiter" ].',
        },
        { text: 'Print the first planet using planets[0].' },
        { text: 'Print how many planets there are with len( planets ).' },
        { text: 'Use planets.append( ... ) to add your own planet.' },
        {
          text: 'Use random.choice( planets ) to pick a planet and print “Your planet is”.',
          stack: 'picker',
        },
      ],
      stacks: [
        py('picker', 'Planet Picker', [
          'imports| import random',
          'lists| planets = ["Mercury", "Venus", "Earth", "Mars", "Jupiter"]',
          'statements| print( "First planet:", planets[0] )',
          'statements| print( "Number of planets:", len( planets ) )',
          'lists| planets.append( "Saturn" )',
          'variables| pick = random.choice( planets )',
          'statements| print( "Your planet is", pick )',
        ]),
      ],
      checklist: [
        'My list has at least five planets',
        'I printed the first planet with an index',
        'I added a planet with append',
        'A random planet is picked',
      ],
      stretch:
        'Use planets.remove( ... ) to take one planet out and print the list size again.',
    },
    homework: {
      name: 'Moon Picker',
      instructions:
        'Make a simpler picker with a list of three moons. Print one moon by index and one random moon.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'You need import random, a list and random.choice.',
    },
    teacherNotes: `## Before class
- In EduBlocks, check the Lists group (list, items by index, .append / .insert / .extend / .pop / .remove, .index, reverse). Check the Imports group for “import random” — if it is missing, type it into the custom code block.

## Class flow (about 50 min)
1. **Hook (4 min)** – Physical list: five learners stand in a line; “who is index 0?”.
2. **Concepts (8 min)** – Lists, index from 0, append, len.
3. **Demo (5 min)** – Run the demo; ask what the last print will say.
4. **Build (25 min)** – Project steps.
5. **Share (8 min)** – Learners show their picker.

## Discussion prompts
- Why does Python count from 0?
- What could we store in a list besides planets?

## Watch for
- Quotes missing from list items.
- Index out of range errors — they are great teaching moments.`,
    video: vid(
      'Working with Lists',
      'How can one variable hold a whole solar system?',
      'Build the Planet Picker',
      {
        hook: [
          'A shelf of tiny planets hovers in the dark. Each one is stored in a separate box.',
          'Eight planets, eight variables? That is too many boxes! What if one box could hold them all?',
          'One box, many planets!',
        ],
        concept: [
          'A long box opens and planets line up inside it, each wearing a number tag starting from zero.',
          'A list stores many values in one variable. Each item has an index, and counting starts at zero.',
          'List + index',
        ],
        explain: [
          'A number zero hovers over Mercury. Append drops a new planet on the end. A dice picks one at random.',
          'Use square brackets to read an item. Append adds to the end. Len counts the items. Random choice picks one for you.',
          '[0] · append · len',
        ],
        demo: [
          'The program prints Mercury, counts the planets, adds Saturn and picks Jupiter at random.',
          'Print the first planet, count them, add a new one, and pick a random planet to visit.',
          'random.choice( planets )',
        ],
        tip: [
          'A tag numbered five points at a missing planet; an error bubble says out of range.',
          'Tip: a list of four items has indexes zero to three. Index four is out of range.',
          'Last index = len − 1',
        ],
        challenge: [
          'A short list floats and an arrow points at index one.',
          'Which planet is at index one? Then build your own Planet Picker.',
          'Mission: Planet Picker',
        ],
      },
    ),
  },

  // ───────────────────────────── 2 · Loops & Collections ─────────────────────────────
  {
    course: 5,
    lesson: 2,
    title: 'Loops & Collections',
    emoji: '🎺',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'A loop can visit every item in a list, one by one.',
      objective:
        'Use a for loop to go through a list and draw a parade of planets.',
      badge: 'Parade Leader',
    },
    concepts: [
      concept(
        '🚶',
        'Looping through a list',
        'for planet in planets: runs the blocks once for each item.',
        'planet is a new name for the current item. It changes each time around the loop.',
      ),
      concept(
        '🔁',
        'Same blocks, new item',
        'The blocks inside the loop run for every item.',
        'Add more items to the list and the loop automatically handles them.',
      ),
      concept(
        '🔢',
        'Count and index',
        'for i in range( len( planets ) ): gives you the index.',
        'Use planets[i] to get the item at that index. It is useful when you need the number as well.',
      ),
      concept(
        '🎨',
        'Loop and draw',
        'Turtle blocks inside a loop can draw one shape for each item.',
        'Move forward between shapes so they do not overlap.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Start the parade',
      intro:
        'Press Run. The loop visits each planet and the turtle draws a circle.',
      lines: [
        ...TURTLE_HEAD,
        'turtle| turtle.speed( 0 )',
        'lists| planets = ["Mercury", "Venus", "Earth", "Mars"]',
        'loops| for planet in planets:',
        '  statements| print( planet, "joins the parade!" )',
        '  turtle| turtle.circle( 20 )',
        '  turtle| turtle.penup()',
        '  turtle| turtle.forward( 60 )',
        '  turtle| turtle.pendown()',
      ],
      hint: 'How many times does the loop run?',
    },
    examples: [
      py(
        'each',
        'Visit every item',
        [
          'lists| planets = ["Mercury", "Venus", "Earth"]',
          'loops| for planet in planets:',
          '  statements| print( "Hello,", planet )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '2': 'Runs once for each item in the list.',
            '3': 'planet is Mercury, then Venus, then Earth.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Name it well',
        'Use a singular name for the loop variable: for planet in planets.',
      ),
      mistake(
        'The loop does nothing',
        'The blocks are not inside the loop, so they never repeat.',
        'Drag the blocks into the loop so they are indented.',
      ),
      tip(
        'Add to the list',
        'Add a new planet to the list and run again. The loop picks it up with no extra code.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'How many lines does this program print?',
      code: {
        language: 'edublocks',
        lines: [
          'lists| crew = ["Ana", "Ben", "Cal"]',
          'loops| for member in crew:',
          '  statements| print( member )',
        ],
      },
      options: ['3', '1', '4', '0'],
      answer: 0,
      hint: 'The loop runs once for each item.',
      explain:
        'There are three names in the list, so the loop runs three times and prints three lines.',
    },
    project: {
      name: 'Solar System Parade',
      goal: 'A parade where every planet in the list is announced and drawn in a row.',
      steps: [
        { text: 'Add the Turtle setup blocks and turtle.speed( 0 ).' },
        { text: 'Make a list of four planets.' },
        { text: 'From Loops, add “for planet in planets:”.' },
        {
          text: 'Inside it, print the planet’s name with “joins the parade!”.',
        },
        {
          text: 'Inside it, draw a circle, lift the pen, move forward and put the pen down.',
        },
        {
          text: 'Run it. Add more planets to the list and run again!',
          stack: 'parade',
        },
      ],
      stacks: [
        py('parade', 'Solar System Parade', [
          ...TURTLE_HEAD,
          'turtle| turtle.speed( 0 )',
          'lists| planets = ["Mercury", "Venus", "Earth", "Mars"]',
          'loops| for planet in planets:',
          '  statements| print( planet, "joins the parade!" )',
          '  turtle| turtle.circle( 20 )',
          '  turtle| turtle.penup()',
          '  turtle| turtle.forward( 60 )',
          '  turtle| turtle.pendown()',
        ]),
      ],
      checklist: [
        'The loop uses my list',
        'Each planet is announced',
        'A shape is drawn for each planet',
        'It still works when I add a planet',
      ],
      stretch:
        'Use for i in range( len( planets ) ) and print the number with each planet.',
    },
    homework: {
      name: 'Crew Roll Call',
      instructions:
        'Make a list of three crew names and use a for loop to print “Welcome, name!” for each one.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'You need one list, one loop and one print inside it.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (4 min)** – A real roll call: “every name gets the same hello”.
2. **Concepts (8 min)** – for … in list; range( len ).
3. **Demo (5 min)** – Run the page demo.
4. **Build (25 min)** – Project steps.
5. **Share (8 min)** – Parade gallery.

## Discussion prompts
- What does the loop variable hold each time?
- Why is it good that the loop does not need to know the list size?

## Watch for
- Variables named the same for the list and the loop item.
- Missing indent for blocks inside the loop.`,
    video: vid(
      'Loops & Collections',
      'How do you say hello to every planet?',
      'Build the Solar System Parade',
      {
        hook: [
          'A line of planets waits at a gate. A trumpet plays, but only one planet marches out.',
          'Five planets, one trumpet call each? That is a lot of copy and paste. There is a smarter way!',
          'One loop, every planet!',
        ],
        concept: [
          'A loop arrow circles a list, and a spotlight hops from one planet to the next.',
          'A for loop can visit every item in a list. The loop variable holds the current item each time round.',
          'for planet in planets',
        ],
        explain: [
          'Blocks inside the loop glow for each planet. A tag shows the loop variable changing: Mercury, Venus, Earth.',
          'Write the blocks once. Python runs them for every item, and the loop variable changes each time.',
          'Same blocks, new item',
        ],
        demo: [
          'Each planet parades out, gets announced and leaves a circle on the canvas, in a neat row.',
          'The parade prints each planet name, draws a circle, and moves forward for the next one.',
          'draw + move',
        ],
        tip: [
          'A lonely trumpet plays outside the loop; a hand drags it inside.',
          'Tip: if nothing repeats, check that your blocks are inside the loop. Look for the indent.',
          'Inside the loop',
        ],
        challenge: [
          'A list of three names slides in and a number three glows nearby.',
          'How many lines will the loop print? Then build your own Solar System Parade.',
          'Mission: Solar System Parade',
        ],
      },
    ),
  },

  // ───────────────────────────── 3 · Creating Your Own Functions ─────────────────────────────
  {
    course: 5,
    lesson: 3,
    title: 'Creating Your Own Functions',
    emoji: '⭐',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'A function is a recipe you write once and use again and again.',
      objective:
        'Create a function that draws a star and use it to stamp stars in different places.',
      badge: 'Function Designer',
    },
    concepts: [
      concept(
        '📖',
        'A function is a recipe',
        'A function is a group of blocks with a name.',
        'Make it once with “def”. Then use it as many times as you like.',
      ),
      concept(
        '🏗️',
        'def',
        '“def draw_star():” makes a new function called draw_star.',
        'The blocks inside the def are the recipe. They do not run until you call it.',
      ),
      concept(
        '📞',
        'Calling a function',
        'Write the function name with brackets to run it: draw_star()',
        'Every call runs the whole recipe from the start.',
      ),
      concept(
        '♻️',
        'Reuse',
        'Functions mean you never repeat the same blocks.',
        'If you want to fix the star, you fix it in one place.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Stamp some stars',
      intro: 'Press Run. The star is defined once, then stamped twice.',
      lines: [
        ...TURTLE_HEAD,
        'turtle| turtle.speed( 0 )',
        'functions| def draw_star():',
        '  loops| for i in range( 5 ):',
        '    turtle| turtle.forward( 50 )',
        '    turtle| turtle.right( 144 )',
        'functions| draw_star()',
        'turtle| turtle.penup()',
        'turtle| turtle.forward( 120 )',
        'turtle| turtle.pendown()',
        'functions| draw_star()',
      ],
      hint: 'When does the star start to be drawn?',
    },
    examples: [
      py(
        'def',
        'Make and call',
        [
          'functions| def say_hello():',
          '  statements| print( "Hello, explorer!" )',
          'functions| say_hello()',
          'functions| say_hello()',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'Creates a function called say_hello. Nothing runs yet.',
            '2': 'The recipe: what the function does.',
            '3': 'Runs the recipe.',
            '4': 'Runs it again — the same blocks, no copying!',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Define before you call',
        'Put the def above the first call. Python reads from top to bottom.',
      ),
      mistake(
        'Nothing happens',
        'You made the function but never called it.',
        'Add the function name with brackets below the def: draw_star()',
      ),
      tip(
        'Name it for what it does',
        'draw_star tells you what the function does. Use words and underscores.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'How many times does “Hello” print?',
      code: {
        language: 'edublocks',
        lines: [
          'functions| def say_hello():',
          '  statements| print( "Hello" )',
          'functions| say_hello()',
          'functions| say_hello()',
          'functions| say_hello()',
        ],
      },
      options: ['3', '1', '4', '0'],
      answer: 0,
      hint: 'The def does not print. The calls do.',
      explain:
        'The function is called three times, and each call prints Hello once.',
    },
    project: {
      name: 'Star Stamp Studio',
      goal: 'Create a draw_star function, then stamp stars across the canvas.',
      steps: [
        { text: 'Add the Turtle setup blocks and turtle.speed( 0 ).' },
        {
          text: 'From Functions (the Definitions group), add “def draw_star():”.',
        },
        {
          text: 'Inside it, add “for i in range( 5 ):” with turtle.forward( 50 ) and turtle.right( 144 ).',
        },
        { text: 'Below the def, call draw_star().' },
        {
          text: 'Lift the pen, move forward 120, put the pen down and call draw_star() again.',
        },
        {
          text: 'Stamp a whole row of stars. Try a loop around the calls!',
          stack: 'stamp',
        },
      ],
      stacks: [
        py('stamp', 'Star Stamp Studio', [
          ...TURTLE_HEAD,
          'turtle| turtle.speed( 0 )',
          'functions| def draw_star():',
          '  loops| for i in range( 5 ):',
          '    turtle| turtle.forward( 50 )',
          '    turtle| turtle.right( 144 )',
          'functions| draw_star()',
          'turtle| turtle.penup()',
          'turtle| turtle.forward( 120 )',
          'turtle| turtle.pendown()',
          'functions| draw_star()',
        ]),
      ],
      checklist: [
        'My function is called draw_star',
        'The def comes before the calls',
        'I stamped at least three stars',
        'I did not copy the star blocks',
      ],
      stretch: 'Put the stamping in a for loop to stamp five stars in a row.',
    },
    homework: {
      name: 'Square Stamp',
      instructions:
        'Make a function called draw_square. Call it twice, in two different places.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your drawing.',
      hint: 'A square is four forward( 50 ) and right( 90 ) moves.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (4 min)** – “Recipe card” analogy: one recipe, many cakes.
2. **Concepts (8 min)** – def, body, call.
3. **Demo (5 min)** – Run the page demo and mark where the function runs.
4. **Build (25 min)** – Project steps.
5. **Gallery (8 min)** – Stamp studio art.

## Discussion prompts
- Why does the star not draw when you only write the def?
- What is the benefit of changing one function instead of ten copies?

## Watch for
- Calls placed before the def.
- Calls without brackets.`,
    video: vid(
      'Creating Your Own Functions',
      'How can you teach Python a brand-new trick?',
      'Build the Star Stamp Studio',
      {
        hook: [
          'A recipe card floats in space, then ten identical cakes pop out of it one after another.',
          'One recipe, ten cakes! What if code worked like that? Write it once, use it again and again.',
          'Write it once!',
        ],
        concept: [
          'A glowing card labelled draw_star holds a small stack of blocks. A call arrow points at it.',
          'A function is a group of blocks with a name. You create it once with def, then call it whenever you need it.',
          'def and call',
        ],
        explain: [
          'The card stays on the shelf until a call arrow lights it. Then the blocks run and a star appears.',
          'The def only stores the recipe. Nothing happens until you call the function by name, with brackets after it.',
          'draw_star()',
        ],
        demo: [
          'A star is drawn, the turtle hops right, and a second star appears. The code is only defined once.',
          'Define the star once, then call it twice in different places. Two stars, but the star blocks appear only once!',
          'Reuse',
        ],
        tip: [
          'A function card sits unused; an arrow reminds you to call it.',
          'Tip: a def does nothing until you call it. Add the call below.',
          'Call it!',
        ],
        challenge: [
          'A function card and three call arrows float above a speech bubble.',
          'How many times does Hello print? Then build your own Star Stamp Studio.',
          'Mission: Star Stamp Studio',
        ],
      },
    ),
  },

  // ───────────────────────────── 4 · Functions with Superpowers ─────────────────────────────
  {
    course: 5,
    lesson: 4,
    title: 'Functions with Superpowers',
    emoji: '🪐',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'Give a function inputs and it can do a different job every time.',
      objective:
        'Use parameters and arguments to make a function that draws planets of any size and colour.',
      badge: 'Planet Maker',
    },
    concepts: [
      concept(
        '🎛️',
        'Parameters',
        'A parameter is a name for a value the function needs.',
        'def make_planet( size, colour ): says the function needs a size and a colour.',
      ),
      concept(
        '📨',
        'Arguments',
        'An argument is the real value you give when you call the function.',
        'make_planet( 30, "orange" ) sends 30 and "orange" into the function.',
      ),
      concept(
        '↩️',
        'Return a value',
        '“return” sends a value back from the function.',
        'area = area_of_square( 5 ) stores the answer the function gives back.',
      ),
      concept(
        '🧩',
        'Same recipe, new result',
        'One function with different arguments makes different results.',
        'A big blue planet, a small red planet — from the same blocks.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Make planets',
      intro: 'Press Run. The same function makes three different planets.',
      lines: [
        ...TURTLE_HEAD,
        'turtle| turtle.speed( 0 )',
        'functions| def make_planet( size, colour ):',
        '  turtle| turtle.fillcolor( colour )',
        '  turtle| turtle.begin_fill()',
        '  turtle| turtle.circle( size )',
        '  turtle| turtle.end_fill()',
        'functions| make_planet( 30, "orange" )',
        'turtle| turtle.penup()',
        'turtle| turtle.forward( 90 )',
        'turtle| turtle.pendown()',
        'functions| make_planet( 20, "blue" )',
      ],
      hint: 'What are the two arguments for the first planet?',
    },
    examples: [
      py(
        'params',
        'A function with inputs',
        [
          'functions| def area_of_square( side ):',
          '  functions| return side * side',
          'statements| print( "Area:", area_of_square( 5 ) )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'side is a parameter — an input to the function.',
            '2': 'return sends the answer back.',
            '3': '5 is the argument. The function returns 25.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Match the order',
        'Arguments go in the same order as the parameters. size first, then colour.',
      ),
      mistake(
        'Python says missing argument',
        'You called the function with fewer values than it needs.',
        'Give one argument for every parameter.',
      ),
      tip(
        'Print or store',
        'A function that returns a value does not print by itself. Print it, or store it in a variable.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'What does this program print?',
      code: {
        language: 'edublocks',
        lines: [
          'functions| def double( number ):',
          '  functions| return number * 2',
          'statements| print( double( 4 ) )',
        ],
      },
      options: ['8', '4', '2', '6'],
      answer: 0,
      hint: 'The argument is 4. What does the function do with it?',
      explain:
        'double( 4 ) sends 4 into number. It returns 4 times 2, which is 8.',
    },
    project: {
      name: 'Custom Planet Maker',
      goal: 'A make_planet function that draws a planet of any size and colour. Use it to build a solar system.',
      steps: [
        { text: 'Add the Turtle setup blocks and turtle.speed( 0 ).' },
        { text: 'Add “def make_planet( size, colour ):”.' },
        {
          text: 'Inside it, set turtle.fillcolor( colour ), turtle.begin_fill(), turtle.circle( size ), turtle.end_fill().',
        },
        { text: 'Call make_planet( 30, "orange" ) to draw the first planet.' },
        {
          text: 'Lift the pen, move forward, put the pen down, and call it again with new numbers and a new colour.',
        },
        {
          text: 'Make at least four planets. Each call uses different arguments!',
          stack: 'planets',
        },
      ],
      stacks: [
        py('planets', 'Custom Planet Maker', [
          ...TURTLE_HEAD,
          'turtle| turtle.speed( 0 )',
          'functions| def make_planet( size, colour ):',
          '  turtle| turtle.fillcolor( colour )',
          '  turtle| turtle.begin_fill()',
          '  turtle| turtle.circle( size )',
          '  turtle| turtle.end_fill()',
          'functions| make_planet( 30, "orange" )',
          'turtle| turtle.penup()',
          'turtle| turtle.forward( 90 )',
          'turtle| turtle.pendown()',
          'functions| make_planet( 20, "blue" )',
        ]),
      ],
      checklist: [
        'My function has two parameters',
        'I called it at least four times',
        'Each planet has a different size or colour',
        'The function blocks are written only once',
      ],
      stretch: 'Add a third parameter for where the planet goes.',
    },
    homework: {
      name: 'One-Parameter Planet',
      instructions:
        'Make a simpler function called small_planet that takes only a size. Call it three times with three sizes.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your drawing.',
      hint: 'Use turtle.circle( size ) inside the function.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (4 min)** – “Make me a sandwich” — which details does the function need?
2. **Concepts (8 min)** – parameter vs argument; return.
3. **Demo (5 min)** – Run the page demo; point at the arguments.
4. **Build (25 min)** – Project steps.
5. **Reflect (8 min)** – Learners explain one parameter in their own words.

## Discussion prompts
- What is the difference between a parameter and an argument?
- When is return useful?

## Watch for
- Mixed-up argument order.
- Forgetting that a returned value must be printed or stored.`,
    video: vid(
      'Functions with Superpowers',
      'How can one recipe make a thousand different planets?',
      'Build the Custom Planet Maker',
      {
        hook: [
          'A machine hums and spits out a planet. Then another, bigger. Then another, red. Same machine, different planets!',
          'This one machine makes planets of every size and colour. How does it know what to make?',
          'Give it inputs!',
        ],
        concept: [
          'Two empty slots on the machine are labelled size and colour. A hand drops in a number and a word.',
          'A function can have inputs. Parameters are the names in the def. Arguments are the real values you give when you call.',
          'Parameters + arguments',
        ],
        explain: [
          'The numbers thirty and orange slide into the slots. A planet pops out. A return arrow carries a result back.',
          'Call make_planet with thirty and orange for a big orange planet. Return can also send a value back to the caller.',
          'make_planet( 30, "orange" )',
        ],
        demo: [
          'Three planets appear: big orange, small blue, medium green, each from the same function.',
          'Call the same function three times with different arguments, and you get three different planets.',
          'Same code, new planet',
        ],
        tip: [
          'A planet is missing its colour; an arrow shows one argument is missing.',
          'Tip: give one argument for every parameter, in the same order.',
          'Match the order',
        ],
        challenge: [
          'A double machine multiplies a number by two, with a four going in.',
          'What does the function return for four? Then build your own Custom Planet Maker.',
          'Mission: Planet Maker',
        ],
      },
    ),
  },

  // ───────────────────────────── 5 · Keep Going Until It Works! ─────────────────────────────
  {
    course: 5,
    lesson: 5,
    title: 'Keep Going Until It Works!',
    emoji: '🔐',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'Some jobs need you to keep trying until you get it right.',
      objective:
        'Use a while loop to keep asking for a password until the answer is correct.',
      badge: 'Code Breaker',
    },
    concepts: [
      concept(
        '♾️',
        'while loops',
        '“while” repeats blocks as long as a question is true.',
        'while guess != secret: keeps going until the guess matches the secret.',
      ),
      concept(
        '🔍',
        'A condition',
        'The question after while is called the condition.',
        'Python checks it before each repeat. When it becomes false, the loop stops.',
      ),
      concept(
        '🔄',
        'Change something inside',
        'Something inside the loop must change, or it never ends.',
        'Here the guess changes each time the player types a new answer.',
      ),
      concept(
        '🛑',
        'Infinite loops',
        'A loop that never stops is called an infinite loop.',
        'If your program is stuck, press the stop button and check the condition.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Crack the password',
      intro:
        'The secret word is “orbit”. Try wrong guesses first, then the right one.',
      inputs: ['moon', 'star', 'orbit'],
      lines: [
        'variables| secret = "orbit"',
        'variables| guess = ""',
        'loops| while guess != secret:',
        '  variables| guess = input( "Enter the password:" )',
        '  logic| if guess != secret:',
        '    statements| print( "Access denied. Try again." )',
        'statements| print( "Access granted! Welcome aboard." )',
      ],
      hint: 'When does the loop stop?',
    },
    examples: [
      py(
        'while',
        'A while loop',
        [
          'variables| count = 3',
          'loops| while count > 0:',
          '  statements| print( count )',
          '  variables| count -= 1',
          'statements| print( "Liftoff!" )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '2': 'Keeps going while count is bigger than 0.',
            '4': 'Takes one away each time — this makes the loop end.',
            '5': 'Runs after the loop is finished.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Always change something',
        'Make sure something inside the loop changes, so the question can become false.',
      ),
      mistake(
        'The program never stops',
        'The while condition never becomes false because nothing inside the loop changes it.',
        'Update a variable inside the loop, like count -= 1 or a new input.',
      ),
      tip(
        'Start the variable first',
        'Set guess = "" before the loop, so Python can check it the first time.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'What does this program print?',
      code: {
        language: 'edublocks',
        lines: [
          'variables| count = 3',
          'loops| while count > 0:',
          '  statements| print( count )',
          '  variables| count -= 1',
        ],
      },
      options: ['3, 2, 1', '3, 2, 1, 0', '1, 2, 3', 'Nothing'],
      answer: 0,
      hint: 'The loop stops when count reaches 0.',
      explain:
        'It prints 3, then 2, then 1. When count becomes 0, “count > 0” is false and the loop stops without printing 0.',
    },
    project: {
      name: 'Space Password Challenge',
      goal: 'Ask for the password again and again until the player gets it right.',
      steps: [
        {
          text: 'Make secret = "orbit" (or your own secret word) and guess = "".',
        },
        { text: 'From Loops, add “while guess != secret:”.' },
        {
          text: 'Inside the loop, add guess = input( "Enter the password:" ).',
        },
        {
          text: 'Add an if guess != secret that prints "Access denied. Try again."',
        },
        { text: 'After the loop, print "Access granted! Welcome aboard."' },
        {
          text: 'Run it. Try three wrong guesses, then the right one.',
          stack: 'password',
        },
      ],
      stacks: [
        py('password', 'Password Challenge', [
          'variables| secret = "orbit"',
          'variables| guess = ""',
          'loops| while guess != secret:',
          '  variables| guess = input( "Enter the password:" )',
          '  logic| if guess != secret:',
          '    statements| print( "Access denied. Try again." )',
          'statements| print( "Access granted! Welcome aboard." )',
        ]),
      ],
      checklist: [
        'The loop keeps asking until the password is right',
        'A wrong guess shows a message',
        'The right guess ends the loop',
        'There is a message after the loop',
      ],
      stretch:
        'Add a counter that counts the wrong guesses and prints it at the end.',
    },
    homework: {
      name: 'Countdown',
      instructions:
        'Make a simpler while loop that counts down from 5 to 1, then prints “Liftoff!”.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'Use count -= 1 inside the loop.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (4 min)** – “Keep guessing my number until you get it.”
2. **Concepts (8 min)** – while vs for; condition; infinite loops.
3. **Demo (5 min)** – Try the page demo with wrong guesses first.
4. **Build (25 min)** – Project steps; learners choose their own secret.
5. **Reflect (8 min)** – What would make the loop infinite?

## Discussion prompts
- What changes inside the loop?
- When would you use while instead of for?

## Watch for
- Forgetting to set guess before the loop.
- An infinite loop — show how to stop the program.`,
    video: vid(
      'Keep Going Until It Works!',
      'How does a program keep trying until it succeeds?',
      'Build the Space Password Challenge',
      {
        hook: [
          'A locked airlock door blinks red. A tiny keypad flashes and a hand tries a code. Wrong. Try again.',
          'The door stays locked until you get it right. But how does the program keep asking?',
          'Try again!',
        ],
        concept: [
          'A circular arrow repeats around a question mark, and a green tick stops it.',
          'A while loop keeps repeating as long as a question is true. When the question turns false, the loop stops.',
          'while',
        ],
        explain: [
          'The question guess not equal to secret glows red, then green. Something inside the loop changes each turn.',
          'Ask the player again and again. Check the condition each time. Something inside must change, or the loop never ends.',
          'while guess != secret',
        ],
        demo: [
          'Two wrong guesses show access denied. The third guess, orbit, opens the airlock.',
          'Moon is wrong. Star is wrong. Orbit is right, and the loop stops. Access granted!',
          'Access granted!',
        ],
        tip: [
          'A loop runs forever with a tired alien; a change arrow ends it.',
          'Tip: make sure something inside the loop changes, or it will never stop. Use a counter or a new answer.',
          'Change something',
        ],
        challenge: [
          'A count variable shows three and a decrease arrow is inside a loop.',
          'What does the countdown print? Then build your own Space Password Challenge.',
          'Mission: Password Challenge',
        ],
      },
    ),
  },

  // ───────────────────────────── 6 · Loops Inside Loops ─────────────────────────────
  {
    course: 5,
    lesson: 6,
    title: 'Loops Inside Loops',
    emoji: '🌀',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'A loop inside a loop makes patterns that grow fast.',
      objective:
        'Use nested loops to draw a galaxy pattern and build a multiplication table.',
      badge: 'Pattern Wizard',
    },
    concepts: [
      concept(
        '🪆',
        'Nested loops',
        'A nested loop is a loop inside another loop.',
        'Like a clock: for every hour the minute hand goes round once.',
      ),
      concept(
        '🔢',
        'How many times?',
        'The inner loop runs fully for every step of the outer loop.',
        '12 outer repeats × 4 inner repeats = 48 inner runs.',
      ),
      concept(
        '🔷',
        'Shape and rotate',
        'The inner loop draws a shape. The outer loop turns it.',
        'Draw a square, turn a little, repeat — and a flower of squares appears.',
      ),
      concept(
        '✖️',
        'Tables',
        'Two loops can make a table of numbers.',
        'One loop for rows and one for columns, with a calculation inside.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Nested loops',
      intro:
        'Press Run. The outer loop counts rows. The inner loop prints a whole row each time.',
      lines: [
        'loops| for a in range( 1, 4 ):',
        '  loops| for b in range( 1, 4 ):',
        '    statements| print( a, "x", b, "=", a * b )',
      ],
      hint: 'How many lines will be printed?',
    },
    examples: [
      py(
        'nested',
        'Squares in a circle',
        [
          ...TURTLE_HEAD,
          'loops| for petal in range( 12 ):',
          '  loops| for side in range( 4 ):',
          '    turtle| turtle.forward( 60 )',
          '    turtle| turtle.right( 90 )',
          '  turtle| turtle.right( 30 )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '3': 'The outer loop makes 12 petals.',
            '4': 'The inner loop draws a square: 4 sides.',
            '7': 'This turn is in the outer loop, so it happens once per petal.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Check the indent',
        'The inner loop is indented under the outer loop. Its blocks are indented even more.',
      ),
      mistake(
        'The pattern looks wrong',
        'A block that should be in the outer loop is inside the inner loop, or the other way round.',
        'Check which loop each block belongs to by looking at the indent.',
      ),
      tip(
        'Test with small numbers',
        'Try 3 outer and 2 inner repeats first and count the output.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'How many times does “Hi” print?',
      code: {
        language: 'edublocks',
        lines: [
          'loops| for row in range( 3 ):',
          '  loops| for col in range( 2 ):',
          '    statements| print( "Hi" )',
        ],
      },
      options: ['6', '5', '3', '2'],
      answer: 0,
      hint: 'The inner loop runs fully for every outer repeat.',
      explain:
        'The outer loop runs 3 times, and each time the inner loop runs 2 times. 3 × 2 = 6.',
    },
    project: {
      name: 'Galaxy Pattern Generator',
      goal: 'Draw a galaxy of squares with a nested loop.',
      steps: [
        { text: 'Add the Turtle setup blocks and turtle.speed( 0 ).' },
        { text: 'Add an outer loop: “for petal in range( 12 ):”.' },
        { text: 'Inside it, add the inner loop “for side in range( 4 ):”.' },
        {
          text: 'Inside the inner loop, add turtle.forward( 60 ) and turtle.right( 90 ).',
        },
        {
          text: 'After the inner loop (still inside the outer loop), add turtle.right( 30 ).',
        },
        {
          text: 'Run it. Change the numbers to make a new pattern!',
          stack: 'galaxy',
        },
      ],
      stacks: [
        py('galaxy', 'Galaxy Pattern', [
          ...TURTLE_HEAD,
          'turtle| turtle.speed( 0 )',
          'turtle| turtle.pencolor( "purple" )',
          'loops| for petal in range( 12 ):',
          '  loops| for side in range( 4 ):',
          '    turtle| turtle.forward( 60 )',
          '    turtle| turtle.right( 90 )',
          '  turtle| turtle.right( 30 )',
        ]),
      ],
      checklist: [
        'My program uses a loop inside a loop',
        'The inner loop draws a shape',
        'The outer loop turns it',
        'I changed a number to make a new pattern',
      ],
      stretch: 'Change the inner loop to draw a triangle and see what happens.',
    },
    homework: {
      name: 'Small Table',
      instructions:
        'Make a simpler nested loop that prints a 2 by 2 times table.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'Use for a in range( 1, 3 ) with for b in range( 1, 3 ) inside it.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (4 min)** – Clock analogy: for every hour, the minute hand circles once.
2. **Concepts (8 min)** – Nested loops and counting runs.
3. **Demo (5 min)** – Predict the number of lines first.
4. **Build (25 min)** – Project steps; change numbers.
5. **Gallery (8 min)** – Galaxy gallery.

## Discussion prompts
- How many inner runs are there in total?
- What happens if the last turn is moved inside the inner loop?

## Watch for
- Wrong indent.
- Learners using range( 1, 3 ) and expecting 3 repeats.`,
    video: vid(
      'Loops Inside Loops',
      'What happens when a loop has its own loop?',
      'Build the Galaxy Pattern Generator',
      {
        hook: [
          'A small square spins once. Then a hundred squares spin together into a glowing galaxy.',
          'One square is easy. But how do you draw a whole galaxy of squares without a hundred blocks?',
          'Loops in loops!',
        ],
        concept: [
          'A clock face shows the minute hand circling once for every hour that ticks by.',
          'A nested loop is a loop inside another loop. The inner loop runs fully each time the outer loop runs once.',
          'Nested loops',
        ],
        explain: [
          'An inner loop draws four sides. The outer loop turns the square a little and repeats it twelve times.',
          'The inner loop draws a shape. The outer loop turns it and repeats. Twelve times four is forty-eight moves.',
          'Inner draws · outer turns',
        ],
        demo: [
          'Twelve squares fan out and form a galaxy. A table of times tables prints beside it.',
          'Draw a square, turn a little, and repeat twelve times. A galaxy appears from just two loops.',
          '12 × 4',
        ],
        tip: [
          'A turn block sits inside the wrong loop and the pattern breaks; an indent guide shows where it belongs.',
          'Tip: check the indent. It shows which loop each block belongs to.',
          'Check the indent',
        ],
        challenge: [
          'A three-by-two grid of speech bubbles says Hi.',
          'How many times does Hi print? Then build your own Galaxy Pattern Generator.',
          'Mission: Galaxy Pattern',
        ],
      },
    ),
  },

  // ───────────────────────────── 7 · Finding & Fixing Bugs ─────────────────────────────
  {
    course: 5,
    lesson: 7,
    title: 'Finding & Fixing Bugs',
    emoji: '🐞',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'Every programmer writes bugs. Great programmers know how to find them.',
      objective:
        'Read error messages, test a program step by step and fix three bugs in mission control.',
      badge: 'Bug Hunter',
    },
    concepts: [
      concept(
        '🐞',
        'What is a bug?',
        'A bug is a mistake in a program.',
        'Bugs can crash the program or make it give the wrong answer.',
      ),
      concept(
        '💬',
        'Error messages',
        'Python tells you what went wrong and on which line.',
        'Read the last line of the message first. It names the problem, such as NameError.',
      ),
      concept(
        '🔬',
        'Test and trace',
        'Run the program and check each answer against what you expect.',
        'Add a print block to see what a variable holds at that moment.',
      ),
      concept(
        '🛠️',
        'Fix one at a time',
        'Change one thing, then run again.',
        'If you change many things at once, you cannot tell which fix worked.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'Meet an error',
      intro:
        'Press Run. Python stops and tells us what went wrong. Can you spot the typo?',
      expectError: true,
      lines: [
        'variables| fuel = 40',
        'variables| needed = 50',
        'logic| if fule < needed:',
        '  statements| print( "Add more fuel!" )',
      ],
      hint: 'Compare the name in line 1 with the name in line 3.',
    },
    examples: [
      py(
        'trace',
        'Trace with print',
        [
          'variables| count = 3',
          'loops| while count > 0:',
          '  statements| print( "count is", count )',
          '  variables| count -= 1',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '3': 'A print inside the loop shows what the variable holds each time.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Read the error',
        'The message names the problem. NameError means a name was not found — check your spelling.',
      ),
      mistake(
        'The program runs but the answer is wrong',
        'A number is text, an operator is wrong, or a loop range is off by one.',
        'Use print blocks to check what each variable holds.',
      ),
      tip(
        'Rubber duck',
        'Explain your code out loud to a friend, or a toy. You often spot the bug as you speak.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt:
        'This countdown should print 3, 2, 1 — but it prints nothing. What is the bug?',
      code: {
        language: 'edublocks',
        lines: ['loops| for i in range( 3, 0 ):', '  statements| print( i )'],
      },
      options: [
        'The range goes up, so there is nothing to count down. It needs a step of -1.',
        'print is spelled wrong',
        'The loop has no colon',
        'i is not a number',
      ],
      answer: 0,
      hint: 'range( 3, 0 ) counts upwards from 3 to 0.',
      explain:
        'range( 3, 0 ) starts at 3 and goes up, so it never reaches 0 and has no items. Use range( 3, 0, -1 ) to count down.',
    },
    project: {
      name: 'Repair Mission Control',
      goal: 'Mission control has three bugs. Rebuild the program in EduBlocks, run it, find all three bugs and fix them.',
      steps: [
        {
          text: 'Build the broken program blocks exactly as shown in the stack below.',
          stack: 'broken',
        },
        { text: 'Run it. Read the output carefully. What looks wrong?' },
        { text: 'Bug hunt 1: Oxygen tanks should be 12, not 444. Why?' },
        {
          text: 'Bug hunt 2: With 40 fuel and 50 needed, mission control says Ready for launch! Is that right?',
        },
        {
          text: 'Bug hunt 3: The countdown prints nothing, then Liftoff!. Why?',
        },
        { text: 'Fix the bugs one at a time. Run the program after each fix.' },
      ],
      stacks: [
        py('broken', 'Broken mission control', [
          'variables| fuel = 40',
          'variables| needed = 50',
          'variables| crew = "4"',
          'variables| tanks = crew * 3',
          'statements| print( "Oxygen tanks:", tanks )',
          'logic| if fuel > needed:',
          '  statements| print( "Add more fuel!" )',
          'logic| else:',
          '  statements| print( "Ready for launch!" )',
          'loops| for i in range( 3, 0 ):',
          '  statements| print( i )',
          'statements| print( "Liftoff!" )',
        ]),
      ],
      checklist: [
        'I found all three bugs',
        'I fixed one bug at a time',
        'My program now prints 12 oxygen tanks',
        'The countdown prints 3, 2, 1',
      ],
      stretch: 'Add a print block that shows the fuel left over after launch.',
    },
    homework: {
      name: 'Bug Spotter',
      instructions:
        'Write a short program with one bug on purpose. Swap with a friend, or ask a grown-up to find it and say what the fix is.',
      deliverable:
        'Your Python file (main.py) with a note saying where the bug is, or a screenshot.',
      hint: 'A typo in a variable name is an easy bug to hide.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (4 min)** – Show a program with a typo; ask what the error means.
2. **Concepts (8 min)** – Error messages, tracing with print.
3. **Demo (5 min)** – Run the page demo; read the error together.
4. **Build (25 min)** – Rebuild the broken program, then hunt and fix.
5. **Share (8 min)** – Learners explain how they found each bug.

## The three bugs and fixes (teacher only)
1. \`crew = "4"\` is text, so \`crew * 3\` repeats the text and gives "444". Fix: \`crew = 4\`.
2. The messages are swapped: with fuel 40 and needed 50 the program says "Ready for launch!". Fix: swap the two print messages (or change the condition to \`fuel < needed\`).
3. \`range( 3, 0 )\` counts upwards so it is empty. Fix: \`range( 3, 0, -1 )\`.

## Discussion prompts
- Which bug crashed the program, and which gave a wrong answer?
- How did tracing with print help?

## Watch for
- Learners fixing several things at once.
- Changing the numbers instead of the real bug.`,
    video: vid(
      'Finding & Fixing Bugs',
      'What do you do when your code goes wrong?',
      'Build the Repair Mission Control project',
      {
        hook: [
          'Mission control flashes red. A tiny bug scuttles across the screen and sparks fly.',
          'Oh no! A bug has crawled into mission control. The program is not working. What now?',
          'Bug alert!',
        ],
        concept: [
          'A magnifying glass hovers over a red error message and a cartoon bug hides behind a line of code.',
          'A bug is a mistake in a program. Some bugs crash it. Others give the wrong answer without any warning.',
          'Bugs happen',
        ],
        explain: [
          'The error message slides in: name error on line three. A print block drops in to show a hidden variable.',
          'Read the error message. It names the problem and the line. Use print blocks to check what your variables hold.',
          'Read · trace · fix',
        ],
        demo: [
          'The detective finds a typo, fixes one block, and the program runs. Another bug appears, and is squashed.',
          'Fix one bug at a time, and run again after each fix. That way you know which change worked.',
          'One fix at a time',
        ],
        tip: [
          'Three changes happen at once and a question mark floats; a single arrow shows one at a time.',
          'Tip: change one thing at a time. Then you know exactly what fixed the bug.',
          'One at a time',
        ],
        challenge: [
          'A broken countdown prints nothing and a puzzled alien scratches its head.',
          'Why does the countdown print nothing? Then build the program, find three bugs and repair mission control.',
          'Mission: Repair Control',
        ],
      },
    ),
  },

  // ───────────────────────────── 8 · My Python Capstone ─────────────────────────────
  {
    course: 5,
    lesson: 8,
    title: 'My Python Capstone',
    emoji: '🚀',
    platform: 'EDUBLOCKS',
    mission: {
      hook: 'This is your chance to build something that is entirely yours.',
      objective:
        'Plan and build a space explorer adventure using lists, loops, functions, input and decisions.',
      badge: 'Python Explorer',
    },
    concepts: [
      concept(
        '🗺️',
        'Plan first',
        'Write down what your program will do before you build it.',
        'List the inputs, the decisions and the outputs. Then pick the blocks.',
      ),
      concept(
        '🧱',
        'Structured programs',
        'Split a big idea into small functions.',
        'visit( planet ) does one job. The main program just calls it for each planet.',
      ),
      concept(
        '🧰',
        'Use everything',
        'Lists, loops, functions, input, if / else and random all work together.',
        'You already know every block you need.',
      ),
      concept(
        '✅',
        'Test and improve',
        'Run your program many times and fix what you find.',
        'Ask a friend to try it. They will find things you did not think of.',
      ),
    ],
    demo: {
      kind: 'python-run',
      title: 'An explorer adventure',
      intro:
        'Type an explorer name, then press Run. Run it again for a different adventure!',
      inputs: ['Nova'],
      lines: [
        'imports| import random',
        'lists| planets = ["Mars", "Venus", "Jupiter"]',
        'functions| def visit( planet ):',
        '  statements| print( "Landing on", planet )',
        '  variables| treasure = random.randint( 1, 3 )',
        '  logic| if treasure == 1:',
        '    statements| print( "You found a crystal!" )',
        '  logic| else:',
        '    statements| print( "Nothing here. Keep exploring!" )',
        'variables| name = input( "Explorer name?" )',
        'statements| print( "Welcome,", name )',
        'loops| for planet in planets:',
        '  functions| visit( planet )',
        'statements| print( "Mission complete,", name )',
      ],
      hint: 'Where does the program call the function?',
    },
    examples: [
      py(
        'plan',
        'The shape of a program',
        [
          'lists| planets = ["Mars", "Venus", "Jupiter"]',
          'functions| def visit( planet ):',
          '  statements| print( "Landing on", planet )',
          'loops| for planet in planets:',
          '  functions| visit( planet )',
        ],
        {
          intro: 'Tap a block to see what it does.',
          notes: {
            '1': 'The data: a list of places.',
            '2': 'A function that does one job.',
            '4': 'A loop that visits each place.',
            '5': 'The loop calls the function.',
          },
        },
      ),
    ],
    tips: [
      tip('Start small', 'Get one planet working first. Then add more.'),
      mistake(
        'Everything is in one long list of blocks',
        'The program works but is hard to read and change.',
        'Move repeated blocks into a function with a clear name.',
      ),
      tip(
        'Ask a friend to play',
        'Watch someone else use your program. Do not explain — see what they do.',
      ),
    ],
    challenge: {
      kind: 'order',
      prompt:
        'Put the blocks in the best order to build a planet visit: the data, the function, then the loop.',
      language: 'edublocks',
      lines: [
        'lists| planets = ["Mars", "Venus"]',
        'functions| def visit( planet ):',
        'loops| for planet in planets:',
      ],
      hint: 'A function must be defined before it is called, and a loop needs its list.',
      explain:
        'Make the data first, then define the function, then loop over the data. Each block depends on the one before.',
    },
    project: {
      name: 'Space Explorer Adventure',
      goal: 'Your own adventure: an explorer visits planets, finds surprises and ends with a message. You decide the story!',
      steps: [
        {
          text: 'Plan on paper: your explorer, three planets and two or three things that can happen.',
        },
        {
          text: 'Make a list of your planets. Add “import random” if you will use chance.',
        },
        {
          text: 'Write a function, such as visit( planet ), that does one job. Use if / else inside it.',
        },
        { text: 'Ask for the explorer’s name with input and print a welcome.' },
        {
          text: 'Use a for loop to visit every planet by calling your function.',
        },
        {
          text: 'Print an ending message. Test it several times and improve it.',
          stack: 'adventure',
        },
      ],
      stacks: [
        py('adventure', 'Adventure skeleton', [
          'imports| import random',
          'lists| planets = ["Mars", "Venus", "Jupiter"]',
          'functions| def visit( planet ):',
          '  statements| print( "Landing on", planet )',
          '  variables| treasure = random.randint( 1, 3 )',
          '  logic| if treasure == 1:',
          '    statements| print( "You found a crystal!" )',
          '  logic| else:',
          '    statements| print( "Nothing here. Keep exploring!" )',
          'variables| name = input( "Explorer name?" )',
          'statements| print( "Welcome,", name )',
          'loops| for planet in planets:',
          '  functions| visit( planet )',
          'statements| print( "Mission complete,", name )',
        ]),
      ],
      checklist: [
        'It uses a list and a loop',
        'It has at least one function of my own',
        'It asks the user a question',
        'It makes at least one decision',
      ],
      stretch: 'Add a score for treasures found and print it at the end.',
    },
    homework: {
      name: 'Adventure Upgrade',
      instructions:
        'Improve your capstone: add one new planet, one new thing that can happen, and one new message.',
      deliverable:
        'Your Python file (main.py) or a screenshot of your blocks and output.',
      hint: 'Add to the list, then add another branch in your function.',
    },
    teacherNotes: `## Class flow (about 60 min)
1. **Hook (4 min)** – “What would you like to explore?” Collect ideas.
2. **Plan (8 min)** – Learners sketch inputs, decisions and outputs on paper.
3. **Demo (5 min)** – Show the page demo; trace where each concept is used.
4. **Build (35 min)** – Learners build independently; you circulate and ask questions, not answers.
5. **Showcase (8 min)** – Learners present and explain one block.

## Discussion prompts
- Which part are you proudest of?
- What would you change if you had another hour?

## Watch for
- Over-large plans — suggest two or three planets.
- Learners stuck on syntax — send them to the lesson examples.`,
    video: vid(
      'My Python Capstone',
      'What will you build with everything you have learned?',
      'Build the Space Explorer Adventure',
      {
        hook: [
          'A blank star map opens in front of a lone explorer. Every planet is a question mark.',
          'You have learned lists, loops, functions and decisions. What will you build with them?',
          'Your adventure!',
        ],
        concept: [
          'A blueprint unrolls with sections: data, function, loop, decisions. Blocks fly into each section.',
          'A good program starts with a plan. List what it needs, then use the right tool for each job.',
          'Plan, then build',
        ],
        explain: [
          'A list of planets feeds a loop. The loop calls a visit function. Dice and if blocks decide what the explorer finds.',
          'Put the places in a list. Loop over them. Call a function for each visit. Use random and if else to surprise the explorer.',
          'list · loop · function',
        ],
        demo: [
          'Nova lands on Mars, then Venus, then Jupiter, finding a crystal on the way.',
          'Name the explorer, visit each planet, find treasure by chance, and end with a message. Run it again for a new story!',
          'New story each run',
        ],
        tip: [
          'One giant tangle of blocks, and a clean tidy function replaces it.',
          'Tip: if you copy the same blocks twice, put them in a function.',
          'Make a function',
        ],
        challenge: [
          'The explorer holds a blank map and a pencil.',
          'Plan your own adventure on paper, then build it. This capstone is all yours!',
          'Mission: Your Adventure',
        ],
      },
    ),
  },
];
