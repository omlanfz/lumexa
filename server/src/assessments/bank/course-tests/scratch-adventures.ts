// FILE PATH: server/src/assessments/bank/course-tests/scratch-adventures.ts
//
// Little Coders Path → "Scratch Adventures" (8 lessons, 3 projects: Animated
// Animal Story, Interactive Quiz Game, Creative Music Maker).
// Topics: 1 what coding is · 2 meeting Scratch & sprites · 3 motion, looks &
// sound · 4 events & broadcasting · 5 loops · 6 if/else decisions ·
// 7 an interactive story · 8 a final game with a Score.
//
// Scratch is block-based, so scripts are shown as text stacks (indentation =
// blocks inside a C-shaped block). Learners are young: keep the wording simple.

import { ModuleExtras, bank, mcq, snippet, tf } from '../bank.helpers';

export const scratchAdventures = bank({
  id: 'course-test/scratch-adventures',
  title: 'Scratch Adventures — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · What is coding? ──────────────────────────────────────────
    mcq(
      1,
      'In coding, what is "code"?',
      'A list of step-by-step instructions that tells a computer exactly what to do',
      [
        'A picture that a computer draws by itself',
        'A secret word that makes a computer work',
        'A game that only grown-ups can play',
      ],
      'Code is a list of instructions. The computer follows them exactly, one step at a time.',
    ),
    mcq(
      1,
      'You tell a robot friend, "Make my bed." The robot just stares at you. Why?',
      'Robots cannot guess — you have to explain every step',
      [
        'The robot is too tired',
        'The robot does not like beds',
        'The robot only understands very long words',
      ],
      'Computers have no imagination. Pull up the sheet, straighten the blanket, fluff the pillow… every step has to be spelled out.',
    ),
    mcq(
      1,
      'Which of these is an example of code hiding in the world around you?',
      'A traffic light that changes colour by following instructions a person wrote',
      [
        'A tree growing taller',
        'The wind blowing the leaves',
        'A rainbow after the rain',
      ],
      'Traffic lights, microwaves, phones and video games all follow instructions that people wrote.',
    ),
    mcq(
      1,
      'In the Human Robot game, what should the Robot do?',
      'Follow exactly what the Coder says — nothing more and nothing less',
      [
        'Guess what the Coder wants and do it',
        'Do the instructions in any order',
        'Skip the instructions that look too hard',
      ],
      'That is how a real computer works: it does exactly what the instructions say.',
    ),

    // ── Lesson 2 · Meet Scratch ─────────────────────────────────────────────
    mcq(
      2,
      'In Scratch, what is the Stage?',
      'The little screen where your story or game happens',
      [
        'The place where you snap blocks together',
        'The list of all your characters',
        'The colourful menu of blocks',
      ],
      'The Stage is like a small TV screen. The Code Area is where you snap blocks together, the Sprite List shows the characters, and the Block Palette holds the blocks.',
    ),
    mcq(
      2,
      'Where do you snap blocks together to build your code?',
      'The Code Area',
      ['The Stage', 'The Sprite List', 'The Green Flag'],
      'You drag blocks from the Block Palette into the Code Area.',
    ),
    mcq(
      2,
      'What is a sprite?',
      'A character or object that you bring to life with code',
      [
        'A kind of block that plays sounds',
        'The background picture of the Stage',
        'A special number',
      ],
      'The Cat is the sprite you start with, and you can add many more.',
    ),
    mcq(
      2,
      'A coder clicks a "move 10 steps" block but the cat does not seem to move. What should the debug detective check?',
      'That the right sprite is selected, and whether the cat has moved off the edge of the Stage',
      [
        'That the computer is plugged in',
        'That the blocks are the same colour',
        'That the Stage is full-screen',
      ],
      'Check the clues: is the sprite selected, did you click the block, and can you even see the sprite?',
    ),

    // ── Lesson 3 · Motion, Looks and Sound ──────────────────────────────────
    mcq(
      3,
      'Where is the very middle of the Scratch Stage?',
      'x: 0, y: 0',
      ['x: 100, y: 100', 'x: -100, y: -100', 'x: 0, y: 100'],
      'The Stage is like a map. x tells you left or right, y tells you up or down, and the middle is 0 for both.',
    ),
    mcq(
      3,
      'A sprite is at x: -100, y: 0 and is facing right. It does "move 50 steps". Where does it end up?',
      'x: -50, y: 0',
      ['x: 50, y: 0', 'x: -150, y: 0', 'x: -100, y: 50'],
      'Moving right adds to x: -100 + 50 = -50. Its up-and-down position (y) does not change.',
    ),
    mcq(
      3,
      'What colour are the Motion blocks in Scratch?',
      'Blue',
      ['Purple', 'Pink', 'Yellow'],
      "Motion is blue (the sprite's feet), Looks is purple (its face and clothes), and Sound is pink (its voice).",
    ),
    mcq(
      3,
      'Why can swapping the order of two blocks change what a sprite does?',
      'Code runs from the top to the bottom, so the order matters',
      [
        'Blocks work in any order',
        'The bottom block always runs first',
        'Only the colour of a block matters',
      ],
      'One of the biggest secrets of coding: the order you put things in changes what happens.',
    ),

    // ── Lesson 4 · Events and broadcasting ──────────────────────────────────
    mcq(
      4,
      'What does a hat block such as "when green flag clicked" do?',
      'It waits for an event and then starts the stack of blocks underneath it, like a doorbell',
      [
        'It stops all of the other blocks',
        'It makes the sprite bigger',
        'It saves the project',
      ],
      'Nothing happens under a hat block until the event happens. Then the whole stack springs into action.',
    ),
    mcq(
      4,
      'A sprite uses a "broadcast" block. What is true about the sprite that shouts the message?',
      'It does not need to know who is listening',
      [
        'It must be touching the sprite that listens',
        'It can only send a message to one sprite',
        'It must have the same name as the listener',
      ],
      'Broadcasting is like a walkie-talkie: anyone tuned to that message hears it.',
    ),
    mcq(
      4,
      'Sprite A has "broadcast [Go]" and Sprite B has "when I receive [go]", but both were typed separately. When the green flag is clicked, nothing happens. Why?',
      'Scratch treats "Go" and "go" as two different messages — pick the same one from the dropdown',
      [
        'Broadcasts only work with capital letters',
        'The green flag is broken',
        'Sprite B must be bigger than Sprite A',
      ],
      'A typo creates a brand-new message. Always choose the existing message from the dropdown list.',
    ),
    mcq(
      4,
      `Here are two scripts:\n\n${snippet(
        'text',
        `Sprite 1:
  when green flag clicked
  broadcast [wave hello]

Sprite 2:
  when I receive [wave hello]
  say [Hi there!] for 2 seconds`,
      )}\n\nWhat happens when the green flag is clicked?`,
      'Sprite 2 says "Hi there!", even though only Sprite 1 has the broadcast block',
      [
        'Nothing happens',
        'Sprite 1 says "Hi there!"',
        'Both sprites say "wave hello"',
      ],
      'The broadcast is the message, and Sprite 2\'s "when I receive" block hears it and runs its stack.',
    ),

    // ── Lesson 5 · Loops ────────────────────────────────────────────────────
    mcq(
      5,
      'Which loop keeps going until you click the red stop sign?',
      'forever',
      ['repeat 10', 'repeat until', 'when green flag clicked'],
      '"repeat 10" stops after ten times, and "repeat until" stops when its condition becomes true. "forever" never stops by itself.',
    ),
    mcq(
      5,
      `Look at this script:\n\n${snippet(
        'text',
        `when green flag clicked
repeat 4
  move 50 steps
  turn right 90 degrees`,
      )}\n\nWhat shape does the sprite walk?`,
      'A square',
      ['A triangle', 'A straight line', 'A circle'],
      'Four equal sides and four right-angle (90 degree) turns make a square.',
    ),
    mcq(
      5,
      `This sprite repeats a move and a turn:\n\n${snippet(
        'text',
        `repeat 8
  move 10 steps
  turn right 45 degrees`,
      )}\n\nIn total, how many steps does it move?`,
      '80 steps',
      ['10 steps', '45 steps', '360 steps'],
      'Each pass moves 10 steps and it repeats 8 times: 8 × 10 = 80. (The turns add up to 8 × 45 = 360 degrees, a full circle.)',
    ),
    mcq(
      5,
      'To walk a triangle, how many degrees should the sprite turn at each corner?',
      '120 degrees',
      ['90 degrees', '60 degrees', '180 degrees'],
      'Divide a full turn (360 degrees) by the number of sides: 360 ÷ 3 = 120.',
    ),

    // ── Lesson 6 · Conditionals ─────────────────────────────────────────────
    mcq(
      6,
      'What is a condition in coding?',
      'A yes-or-no question, like "Is the sprite touching the edge?"',
      ['A kind of sound block', "A sprite's costume", 'A very long loop'],
      'If the answer is yes (true), the code inside the "if" block runs. If it is no (false), it is skipped.',
    ),
    mcq(
      6,
      'What is the difference between "if … then" and "if … then / else"?',
      '"if … then" only does something when the condition is true; "if … then / else" always picks exactly one of two paths',
      [
        '"if … then / else" runs both paths every time',
        'They are exactly the same block',
        '"if … then" can only be used with the space key',
      ],
      'Think of an if/else as a fork in a hiking trail: you always take exactly one way.',
    ),
    mcq(
      6,
      `Look at this script:\n\n${snippet(
        'text',
        `forever
  if <key [space] pressed?> then
    say [Jumping!] for 1 seconds
  else
    say [Waiting...] for 1 seconds`,
      )}\n\nThe space key is NOT being pressed. What does the sprite say?`,
      'Waiting...',
      ['Jumping!', 'Nothing at all', 'Jumping! and then Waiting...'],
      'The condition is false, so the "else" path runs.',
    ),
    mcq(
      6,
      'A sprite is supposed to say "Ouch!" only when it touches the edge, but it says "Ouch!" all the time. What is the most likely mistake?',
      'The "touching edge?" block is not plugged into the condition slot of the "if" block',
      [
        'The sprite has the wrong costume',
        'The Stage is too small',
        'The "forever" block is the wrong colour',
      ],
      'If the condition slot is empty, the check does not do its job. Check the hexagon-shaped slot inside the "if" block.',
    ),

    // ── Lesson 7 · An interactive story ─────────────────────────────────────
    mcq(
      7,
      'How can a project "turn the page" from Scene 1 to Scene 2?',
      'Use "broadcast [scene 2]" in Scene 1 and "when I receive [scene 2]" in Scene 2',
      ['Delete Scene 1', 'Make the sprite bigger', 'Click the red stop sign'],
      'A broadcast works like a page-turner for your whole project.',
    ),
    mcq(
      7,
      'Why is it a good idea to draw a storyboard before building a story?',
      'Planning a beginning, a middle and an end first makes the build smoother',
      [
        'Scratch cannot start without a drawing',
        'It makes the sprites run faster',
        'It is the only way to add sound',
      ],
      'Every good story has a beginning, a middle (a problem or surprise) and an end.',
    ),
    mcq(
      7,
      'How can you make a story react to the player, like a real game?',
      'Add an "if … then / else" decision, such as "if space key pressed"',
      ['Add a second Stage', 'Make the story longer', 'Use only "say" blocks'],
      'Different branches of an if/else let the story change depending on what the player does.',
    ),
    mcq(
      7,
      'Scene 1 uses "broadcast [scene 2]" but nothing happens in Scene 2. What is the most likely missing piece?',
      'A matching "when I receive [scene 2]" block on the sprite or Stage that should react',
      ['A bigger Stage', 'A second green flag', 'A louder sound'],
      'A message does nothing unless something is listening for it.',
    ),

    // ── Lesson 8 · The final game ───────────────────────────────────────────
    mcq(
      8,
      `Here is part of a click-and-score game:\n\n${snippet(
        'text',
        `when green flag clicked
  set [Score] to 0
  forever
    if <(Score) = 5> then
      say [You win!] for 2 seconds
      stop [all]

when this sprite clicked
  change [Score] by 1`,
      )}\n\nHow many times must the player click the sprite to win?`,
      '5 times',
      ['1 time', '4 times', '10 times'],
      'Score starts at 0 and goes up by 1 on each click, so it reaches 5 after five clicks.',
    ),
    mcq(
      8,
      'A game keeps checking "did the player win yet?" Which three things work together to do that?',
      'A loop, a condition (if) and a Score variable',
      [
        'A costume, a sound and a backdrop',
        'A broadcast, a hat block and a sprite',
        'A green flag, a stop sign and a Stage',
      ],
      'A game is really a story that keeps checking: loops + conditionals + a variable.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'A computer can guess what you mean if an instruction is missing.',
      false,
      'Computers have no imagination. They only do exactly what the instructions say.',
    ),
    tf(
      2,
      'The Block Palette in Scratch sorts the blocks by colour and type.',
      true,
      'Motion, Looks, Sound, Events and the other groups each have their own colour.',
    ),
    tf(
      3,
      'The "go to x: y:" block teleports a sprite, while "move 10 steps" walks it a little way in the direction it is facing.',
      true,
      'Use go to for an exact address on the Stage and move for walking.',
    ),
    tf(
      4,
      'You should type a new message name on every sprite, so that each sprite has its own broadcast.',
      false,
      'Messages must match exactly, so always pick the same message from the dropdown list.',
    ),
    tf(
      5,
      'If the move and turn blocks land outside the C-shaped gap of a repeat block, they will not be repeated.',
      true,
      'Only blocks snapped inside the gap are repeated. Blocks outside run just once.',
    ),
    tf(
      6,
      'In an "if … then / else" block, both the "then" path and the "else" path run every time.',
      false,
      'Exactly one path runs: "then" if the condition is true, otherwise "else".',
    ),
    tf(
      7,
      'Every good story has a beginning, a middle and an end.',
      true,
      'A storyboard of three boxes is a quick way to plan them.',
    ),
    tf(
      8,
      'A variable such as Score lets a project remember a number.',
      true,
      'The Score can go up with "change Score by 1" and can be checked by an "if" block.',
    ),
    tf(
      8,
      'You should wait until your whole game is finished before you test it for the first time.',
      false,
      'Click the green flag after every few blocks, so mistakes are easy to find.',
    ),
    tf(
      8,
      'Clicking the green flag after every few blocks helps you find problems early.',
      true,
      'Testing often is one of the best habits of a real coder.',
    ),
  ],
});

// Position 1 of the Little Coders Final Test, position 1 of Odyssey Stage 1 and
// position 1 of the Odyssey Final Test.
export const scratchAdventuresExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'Why does code have to be exact, like a recipe?',
        'A recipe that says "add sugar" with no amount could ruin the cake — a computer needs the same kind of exact instructions',
        [
          'Because computers only read recipes',
          'Because exact code is shorter',
          'Because computers can guess the missing parts',
        ],
        'Computers can only do what they are told, so missing details make strange results.',
      ),
      mcq(
        2,
        'Which area of Scratch shows all of the characters in your project?',
        'The Sprite List',
        ['The Code Area', 'The Block Palette', 'The Stage backdrop'],
        'The Sprite List sits below the Stage and lists every sprite.',
      ),
      mcq(
        3,
        'A sprite is in the middle of the Stage (x: 0, y: 0). It does "go to x: -100 y: 50". Where does it end up?',
        'To the left of the middle and higher up',
        [
          'To the right of the middle and higher up',
          'To the left of the middle and lower down',
          'To the right of the middle and lower down',
        ],
        'A negative x is to the left and a positive y is up.',
      ),
      mcq(
        3,
        'A sprite is meant to grow a little every time it is clicked, but now it is huge — bigger than the Stage. What can fix it?',
        'Add a "set size to 100" block to reset it to normal before it grows again',
        ['Add a louder sound', 'Add a second Stage', 'Remove the green flag'],
        'Without a reset, the size keeps growing every time the script runs.',
      ),
      mcq(
        4,
        'Which hat block starts a stack when you click directly on the sprite?',
        '"when this sprite clicked"',
        [
          '"when green flag clicked"',
          '"when [space] key pressed"',
          '"when I receive [message]"',
        ],
        'Each hat block listens for a different event.',
      ),
      mcq(
        5,
        'Why do coders love loops?',
        'They repeat instructions without copying and pasting the same blocks again and again',
        [
          'They make the Stage bigger',
          'They stop the project',
          "They change the sprite's name",
        ],
        'Instead of writing "clap" a hundred times, you say "repeat 100: clap".',
      ),
      mcq(
        6,
        `What does this script make the sprite do?\n\n${snippet(
          'text',
          `when green flag clicked
forever
  move 10 steps
  if <touching [edge]?> then
    turn right 180 degrees`,
        )}`,
        'Walk along and turn around whenever it hits the edge',
        [
          'Walk in a square',
          'Stand still and spin',
          'Say "edge" over and over',
        ],
        'The if block checks for the edge on every pass of the forever loop. Turning 180 degrees sends the sprite back.',
      ),
      mcq(
        7,
        'Which block changes the picture behind the characters when a new scene starts?',
        '"switch backdrop to"',
        ['"next costume"', '"change size by"', '"play sound"'],
        'Backdrops belong to the Stage. Costumes belong to a sprite.',
      ),
      mcq(
        8,
        'Which part of a project remembers a number such as a Score?',
        'A variable',
        ['A hat block', 'A backdrop', 'A costume'],
        'A variable is like a labelled box that holds a value you can read and change.',
      ),
    ],
    trueFalse: [
      tf(
        5,
        '"repeat until <condition>" keeps going until its condition becomes true.',
        true,
        'It is a loop that stops by itself when the answer to its yes-or-no question turns to yes.',
      ),
      tf(
        4,
        'A sprite can react to a key press, but it can never react to a click.',
        false,
        'Hat blocks such as "when this sprite clicked" let sprites react to clicks as well as keys.',
      ),
    ],
  },
  stage: {
    mcq: [
      mcq(
        1,
        'Which is the best instruction to give a robot friend?',
        'Take 2 steps forward, then turn left',
        ['Go over there', 'Do the thing', 'Move somewhere nice'],
        'Clear, exact steps can be followed perfectly. Vague ones cannot.',
      ),
      mcq(
        2,
        'How do you run a whole Scratch project?',
        'Click the green flag',
        [
          'Click the red stop sign',
          'Click the Stage backdrop',
          'Click the Sprite List',
        ],
        'The green flag starts every "when green flag clicked" stack.',
      ),
      mcq(
        3,
        'Which way do negative x numbers go on the Stage?',
        'Left',
        ['Right', 'Up', 'Down'],
        'Negative x is left and positive x is right. For y, negative is down and positive is up.',
      ),
      mcq(
        3,
        `Look at this script (the sprite is facing right):\n\n${snippet(
          'text',
          `go to x: 0 y: 0
move 30 steps
move 20 steps`,
        )}\n\nWhere does the sprite end up?`,
        'x: 50, y: 0',
        ['x: 30, y: 20', 'x: 20, y: 0', 'x: 0, y: 50'],
        'Starting at 0 and moving right 30 and then 20 more puts it at x: 50. The y position does not change.',
      ),
      mcq(
        4,
        'What does "when I receive [message]" do?',
        'It listens for a broadcast and runs its stack of blocks when it hears it',
        [
          'It sends a message to every sprite',
          'It deletes the message',
          "It changes the sprite's name",
        ],
        'It is the listening half of a broadcast.',
      ),
      mcq(
        5,
        `How many seconds does this whole script take?\n\n${snippet(
          'text',
          `repeat 3
  say [Hello!] for 1 seconds`,
        )}`,
        '3 seconds',
        ['1 second', '4 seconds', '6 seconds'],
        'The sprite says Hello for 1 second, and the loop does it 3 times: 3 × 1 = 3.',
      ),
      mcq(
        5,
        `A sprite runs this script. How many steps does it move in total?\n\n${snippet(
          'text',
          `repeat 5
  move 10 steps
repeat 2
  move 5 steps`,
        )}`,
        '60 steps',
        ['50 steps', '15 steps', '70 steps'],
        'The first loop moves 5 × 10 = 50 steps and the second moves 2 × 5 = 10 steps: 50 + 10 = 60.',
      ),
      mcq(
        6,
        'What do you call the yes-or-no question inside an "if" block?',
        'A condition',
        ['A costume', 'A broadcast', 'A backdrop'],
        'If the condition is true, the blocks inside the "if" run.',
      ),
      mcq(
        7,
        'A story uses "broadcast [scene 3]" to start its last part. Which block starts Scene 3?',
        '"when I receive [scene 3]"',
        [
          '"when green flag clicked"',
          '"when this sprite clicked"',
          '"forever"',
        ],
        'The matching "when I receive" block hears the broadcast.',
      ),
      mcq(
        8,
        'A game says "You win!" when the Score is 5. Which block ends the whole project at that moment?',
        '"stop [all]"',
        ['"next costume"', '"set Score to 0"', '"go to x: 0 y: 0"'],
        'stop all halts every script in the project.',
      ),
    ],
    trueFalse: [
      tf(
        1,
        'Computers follow instructions exactly, one step at a time.',
        true,
        'They do not guess or fill in the gaps.',
      ),
      tf(
        4,
        'A message that one sprite broadcasts can only be heard by that same sprite.',
        false,
        'Any sprite (or the Stage) with a matching "when I receive" block can hear it.',
      ),
      tf(
        5,
        'A "forever" loop keeps running until the project is stopped.',
        true,
        'Click the red stop sign to end it.',
      ),
    ],
  },
  odyssey: {
    mcq: [
      mcq(
        3,
        'A sprite is at x: 100, y: 0 and does "go to x: -100 y: 0". What happens?',
        'It jumps straight to the left side of the Stage',
        [
          'It slowly walks to the right',
          'It stays where it is',
          'It turns upside down',
        ],
        '"go to" teleports the sprite to the exact address.',
      ),
      mcq(
        5,
        'Which script makes a sprite walk in a perfect square?',
        'repeat 4: move 50 steps, turn right 90 degrees',
        [
          'repeat 3: move 50 steps, turn right 120 degrees',
          'forever: move 50 steps',
          'repeat 4: say Hello',
        ],
        'A square has four equal sides and four 90-degree turns.',
      ),
      mcq(
        8,
        'The variable Score is 3. The sprite runs "change Score by 2". What is Score now?',
        '5',
        ['2', '3', '6'],
        '"change by" adds to the current value: 3 + 2 = 5.',
      ),
    ],
    trueFalse: [],
  },
};
