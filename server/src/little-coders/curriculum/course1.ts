// FILE PATH: server/src/little-coders/curriculum/course1.ts
//
// COURSE 1 — SCRATCH ADVENTURES (MIT Scratch). Eight lessons, one project each:
//   1 Rocket Launch · 2 Dancing Alien · 3 Talking Space Pet · 4 Control Your Rocket
//   5 Space DJ · 6 Dancing Starfield · 7 Alien Animation Studio · 8 Lost Space Puppy
//
// Sprite, costume, backdrop and sound names are the ones in Scratch's own library
// (checked against scratch-gui's sprites.json / backdrops.json). Scratch shows costume
// names in lower case (giga-a); they are written here as the curriculum lists them.

import type { LcLessonSpec } from '../lc.types';
import { concept, mistake, sc, tip, vid } from './helpers';

export const COURSE_1: LcLessonSpec[] = [
  // ───────────────────────────── 1 · Welcome to Scratch! ─────────────────────────────
  {
    course: 1,
    lesson: 1,
    title: 'Welcome to Scratch!',
    emoji: '🚀',
    platform: 'SCRATCH',
    mission: {
      hook: 'Every game and animation you love was built from colourful blocks.',
      objective:
        'Snap blocks together in the right order to make a rocket launch.',
      badge: 'Launch Commander',
    },
    concepts: [
      concept(
        '🎭',
        'The Stage and sprites',
        'The Stage is where things happen. Sprites are the characters on it.',
        'A project can have many sprites. Each sprite has its own blocks, but they all share one Stage.',
      ),
      concept(
        '🏁',
        'The green flag',
        'The green flag starts your code.',
        'A hat block such as “when green flag clicked” waits for the flag. The blocks snapped under it run when you click it.',
      ),
      concept(
        '🧩',
        'Blocks run in order',
        'Scratch runs blocks from top to bottom, one at a time.',
        'This is called a sequence. If you swap two blocks, you change what happens first!',
      ),
      concept(
        '📍',
        'x and y positions',
        'x is left and right. y is up and down. (0, 0) is the middle.',
        'A bigger x moves right and a bigger y moves up. The Stage goes from -240 to 240 across and -180 to 180 up and down.',
      ),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Click the green flag!',
      intro: 'Watch each block light up as it runs, from top to bottom.',
      backdrop: 'space',
      sprites: [
        { id: 'rocket', emoji: '🚀', label: 'Rocketship', x: 0, y: -120 },
      ],
      scripts: [
        {
          sprite: 'rocket',
          lines: [
            'events| when green flag clicked',
            'motion| go to x: (0) y: (-120)',
            'looks| say [Ready for launch!] for (2) seconds',
            'control| repeat (10)',
            '  motion| change y by (20)',
            'looks| say [Blast off!] for (2) seconds',
          ],
        },
      ],
      hint: 'What would happen if “say Blast off!” came first?',
    },
    examples: [
      sc(
        'launch',
        'The launch script',
        [
          'events| when green flag clicked',
          'motion| go to x: (0) y: (-120)',
          'looks| say [Ready for launch!] for (2) seconds',
          'control| repeat (10)',
          '  motion| change y by (20)',
          'looks| say [Blast off!] for (2) seconds',
        ],
        {
          intro: 'Tap a block to see what it does.',
          sprite: 'Rocketship',
          notes: {
            '1': 'The hat block starts the script when the green flag is clicked.',
            '2': 'Puts the rocket at the bottom of the Stage.',
            '4': 'Repeat runs the blocks inside it 10 times.',
            '5': 'Each time, y goes up by 20, so the rocket flies up.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Start with a hat',
        'Every script begins with a hat block. It tells Scratch when to start.',
      ),
      mistake(
        'Blocks that do not snap',
        'The blocks look close together, but they are not joined, so only one part runs.',
        'Drag the block until it clicks under the one above.',
      ),
      tip(
        'Click to test',
        'You can click any script to try it without the green flag.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'Which block starts a script when you click the green flag?',
      options: [
        'when green flag clicked',
        'change y by (20)',
        'say [Blast off!] for (2) seconds',
        'repeat (10)',
      ],
      answer: 0,
      hint: 'Hat blocks start scripts. Look in Events.',
      explain:
        '“when green flag clicked” is an Events hat block. It waits for the flag, then runs everything under it.',
    },
    project: {
      name: 'Rocket Launch',
      goal: 'A rocket says it is ready, then blasts off up the Stage.',
      assets: [
        { name: 'Stars', note: 'Backdrop: Choose a Backdrop → Stars' },
        { name: 'Rocketship', note: 'Use its first costume' },
      ],
      steps: [
        { text: 'Open Scratch. Click Choose a Backdrop and pick Stars.' },
        {
          text: 'Delete the cat. Click Choose a Sprite and add the Rocketship.',
        },
        { text: 'From Events, drag out “when green flag clicked”.' },
        {
          text: 'From Motion, add “go to x: 0 y: -120” so the rocket starts at the bottom.',
        },
        { text: 'From Looks, add “say Ready for launch! for 2 seconds”.' },
        {
          text: 'From Control, add “repeat 10” and put “change y by 20” inside it.',
        },
        {
          text: 'Finish with “say Blast off! for 2 seconds”. Click the green flag!',
          stack: 'launch',
        },
      ],
      stacks: [
        sc(
          'launch',
          'Rocket Launch',
          [
            'events| when green flag clicked',
            'motion| go to x: (0) y: (-120)',
            'looks| say [Ready for launch!] for (2) seconds',
            'control| repeat (10)',
            '  motion| change y by (20)',
            'looks| say [Blast off!] for (2) seconds',
          ],
          { sprite: 'Rocketship' },
        ),
      ],
      checklist: [
        'My rocket starts at the bottom',
        'It says “Ready for launch!”',
        'It flies up the Stage',
        'It says “Blast off!”',
      ],
      stretch: 'Make the rocket bigger with “set size to 150 %”.',
    },
    homework: {
      name: 'Rocket Landing',
      instructions:
        'Make a simpler version. Start the rocket at the top of the Stage, say “Landing!”, then bring it down.',
      deliverable:
        'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'Use a negative number to move down.',
    },
    teacherNotes: `## Class flow (about 45 min)
1. **Hook (3 min)** – Ask: “Where do you see code today?” Collect three answers.
2. **Tour (7 min)** – Share the page. Point to Stage, Sprite list, Block palette and Code area in Scratch.
3. **Demo (5 min)** – Press the flag in the page demo. Let learners predict each block.
4. **Build (20 min)** – Learners follow the project steps. Pause after step 4 and test.
5. **Wrap-up (5 min)** – Each learner explains one block aloud.

## Discussion prompts
- What happens if the blocks are in a different order?
- Why do we need a hat block?

## Watch for
- Blocks dropped near, not snapped to, the script.
- The cat is still on the Stage — that is fine, but the project uses the Rocketship.`,
    video: vid(
      'Welcome to Scratch!',
      'What is hiding behind every game and animation?',
      'Build the Rocket Launch project',
      {
        hook: [
          'A glowing screen zooms out: a game, an app, a video, all made of tiny coloured blocks.',
          'Every game you love started as blocks that someone snapped together. Today, you become that someone.',
          'Blocks make games!',
        ],
        concept: [
          'Friendly robot host Pixel waves. The Scratch Stage appears with a rocket sprite.',
          'In Scratch, the Stage is where your story happens, and sprites are your characters.',
          'Stage + Sprites',
        ],
        explain: [
          'Blocks snap together like space-station modules. A green flag glows and the blocks light up one by one.',
          'Click the green flag and your blocks run in order, top to bottom. Every block is a tiny instruction, and together they make a launch. Change the order, and you change the story.',
          'Top to bottom',
        ],
        demo: [
          'A rocket waits at the bottom. Two blocks snap on and it shoots upward.',
          'Watch: go to the bottom, say hello, then change y again and again. Up goes the rocket!',
          'go to x: 0 y: -120',
        ],
        tip: [
          'A hat block sparkles when snapped on. A loose block wobbles.',
          'Tip: every script starts with a hat block, and blocks must click together.',
          'Hat first!',
        ],
        challenge: [
          'Pixel holds up two blocks and asks which one starts the code.',
          'Your turn! Find the block that starts a script, then launch your own rocket.',
          'Mission: Rocket Launch',
        ],
      },
    ),
  },

  // ───────────────────────────── 2 · Let's Make Things Move! ─────────────────────────────
  {
    course: 1,
    lesson: 2,
    title: "Let's Make Things Move!",
    emoji: '👽',
    platform: 'SCRATCH',
    mission: {
      hook: 'Moving blocks can turn a still picture into a dance party.',
      objective: 'Use motion blocks and x/y positions to make an alien dance.',
      badge: 'Dance Captain',
    },
    concepts: [
      concept(
        '👣',
        'Move steps',
        '“move 10 steps” pushes a sprite forward in the direction it faces.',
        'A negative number such as -40 moves the sprite backwards.',
      ),
      concept(
        '🔄',
        'Turn degrees',
        'Turning changes the direction a sprite faces.',
        'A full turn is 360 degrees. Turning 90 degrees is a quarter turn, like the corner of a square.',
      ),
      concept(
        '🗺️',
        'Go to x and y',
        '“go to x: y:” jumps to an exact spot on the Stage.',
        '“glide” does the same move but slowly, so you can see the sprite travel.',
      ),
      concept(
        '➕',
        'Change by',
        '“change x by 10” slides right. “change y by 10” slides up.',
        'Use negative numbers to go left or down. “set x to” jumps to a number instead of changing it.',
      ),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Watch Giga dance',
      intro: 'Press the green flag. Each motion block lights up as it runs.',
      backdrop: 'night',
      sprites: [{ id: 'giga', emoji: '👽', label: 'Giga', x: 0, y: 0 }],
      scripts: [
        {
          sprite: 'giga',
          lines: [
            'events| when green flag clicked',
            'motion| go to x: (0) y: (0)',
            'control| repeat (3)',
            '  motion| move (40) steps',
            '  motion| turn ↻ (45) degrees',
            '  motion| move (-40) steps',
            '  motion| turn ↺ (45) degrees',
            'motion| glide (1) secs to x: (-120) y: (60)',
            'motion| glide (1) secs to x: (120) y: (-60)',
          ],
        },
      ],
      hint: 'Which block makes the slow slide across the Stage?',
    },
    examples: [
      sc(
        'dance',
        'The dance moves',
        [
          'events| when green flag clicked',
          'motion| go to x: (0) y: (0)',
          'control| repeat (4)',
          '  motion| move (40) steps',
          '  motion| turn ↻ (45) degrees',
          '  motion| move (-40) steps',
          '  motion| turn ↺ (45) degrees',
          'motion| glide (1) secs to x: (-120) y: (60)',
          'motion| glide (1) secs to x: (120) y: (-60)',
        ],
        {
          intro: 'Tap a block to see what it does.',
          sprite: 'Giga',
          notes: {
            '2': 'Starts Giga in the middle of the Stage.',
            '4': 'Steps forward 40.',
            '5': 'Turns right a little.',
            '6': 'Steps back again — a wiggle!',
            '8': 'Glide moves slowly to a spot you choose.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Try small numbers',
        'Change a number a little and click the script again. You can see what it does!',
      ),
      mistake(
        'Nothing seems to move',
        'The sprite moved off the edge of the Stage, so you cannot see it.',
        'Use “go to x: 0 y: 0” to bring it back to the middle.',
      ),
      tip(
        'Use the position box',
        'Under the Stage you can see the sprite’s x and y. Drag it and watch them change.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt:
        'Giga is at x: 0, y: 0. You run “change y by 50”. Where does Giga go?',
      options: [
        'Up the Stage',
        'Down the Stage',
        'Left across the Stage',
        'Right across the Stage',
      ],
      answer: 0,
      hint: 'y is up and down. Is 50 bigger or smaller than 0?',
      explain:
        'A bigger y moves a sprite up. “change y by 50” adds 50 to y, so Giga rises.',
    },
    project: {
      name: 'Dancing Alien',
      goal: 'Giga wiggles, then glides across the Stage in a dance.',
      assets: [
        { name: 'Giga', costumes: ['Giga-a'], note: 'Choose a Sprite → Giga' },
        { name: 'Night City', note: 'Backdrop (or any you like)' },
      ],
      steps: [
        { text: 'Add the Giga sprite and a backdrop you like.' },
        { text: 'Start with “when green flag clicked” and “go to x: 0 y: 0”.' },
        { text: 'Add “repeat 4” and put “move 40 steps” inside.' },
        {
          text: 'Inside the repeat, add “turn 45 degrees”, “move -40 steps” and a turn the other way.',
        },
        {
          text: 'After the repeat, add two “glide” blocks to two different spots.',
        },
        {
          text: 'Click the green flag. Change the numbers to invent your own dance!',
          stack: 'dance',
        },
      ],
      stacks: [
        sc(
          'dance',
          'Dancing Alien',
          [
            'events| when green flag clicked',
            'motion| go to x: (0) y: (0)',
            'control| repeat (4)',
            '  motion| move (40) steps',
            '  motion| turn ↻ (45) degrees',
            '  motion| move (-40) steps',
            '  motion| turn ↺ (45) degrees',
            'motion| glide (1) secs to x: (-120) y: (60)',
            'motion| glide (1) secs to x: (120) y: (-60)',
          ],
          { sprite: 'Giga' },
        ),
      ],
      checklist: [
        'Giga starts in the middle',
        'Giga wiggles four times',
        'Giga glides to two spots',
        'I changed a number to make my own dance',
      ],
      stretch: 'Add “point in direction 90” at the end so Giga faces right.',
    },
    homework: {
      name: 'Mini Dance',
      instructions:
        'Make Giga do a shorter dance with only two moves and one glide.',
      deliverable:
        'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'Start with “go to x: 0 y: 0” so every dance begins in the same place.',
    },
    teacherNotes: `## Class flow (about 45 min)
1. **Warm-up (5 min)** – “Simon says”: learners follow move/turn instructions on their feet.
2. **Concepts (7 min)** – Use the cards. Stress that y is *up and down*.
3. **Demo (5 min)** – Press the flag; ask learners to predict where Giga ends.
4. **Build (22 min)** – Follow the project steps; learners must change at least two numbers.
5. **Share (6 min)** – Two learners show their dance.

## Discussion prompts
- What is the difference between “go to” and “glide”?
- How do you move a sprite down?

## Watch for
- Sprites that “disappear” off the edge — use go to x: 0 y: 0.
- Mixing up turn ↻ and turn ↺.`,
    video: vid(
      "Let's Make Things Move!",
      'How do you make a picture dance?',
      'Build the Dancing Alien project',
      {
        hook: [
          'An alien freezes in the middle of a dark Stage. Music starts. Nothing moves yet.',
          'This alien wants to dance, but it is frozen. How do we get it moving?',
          'Make it move!',
        ],
        concept: [
          'A grid appears over the Stage with an x line and a y line, glowing.',
          'Motion blocks move sprites. Where a sprite is depends on two numbers: x and y.',
          'x and y',
        ],
        explain: [
          'Arrows slide the alien right for x, up for y. A turn block spins it like a clock hand.',
          'Change x to go left or right, change y to go up or down, and turn to face a new way.',
          'x → y ↑ turn ↻',
        ],
        demo: [
          'The alien steps forward, turns, steps back, then glides across the Stage in a swirl of stars.',
          'Move, turn, move back. Then glide. Together, the blocks make a dance. Change the numbers to invent your own moves.',
          'move · turn · glide',
        ],
        tip: [
          'A tiny red alert shows the alien off the edge of the Stage; a hand drags it back.',
          'Tip: if your sprite vanishes, use go to x zero y zero to bring it home.',
          'go to x: 0 y: 0',
        ],
        challenge: [
          'Pixel points to the alien and asks which way change y by 50 will send it.',
          'Which way does change y by fifty go? Then build the Dancing Alien and show us your moves.',
          'Mission: Dancing Alien',
        ],
      },
    ),
  },

  // ───────────────────────────── 3 · Give Your Characters a Personality ─────────────────────────────
  {
    course: 1,
    lesson: 3,
    title: 'Give Your Characters a Personality',
    emoji: '🐾',
    platform: 'SCRATCH',
    mission: {
      hook: 'A few Looks blocks can make a sprite feel alive.',
      objective:
        'Use say, think, costumes, size and backdrops to give a sprite a personality.',
      badge: 'Pet Whisperer',
    },
    concepts: [
      concept(
        '💬',
        'Say and think',
        '“say” shows a speech bubble. “think” shows a thought bubble.',
        'Add “for 2 seconds” and the bubble goes away by itself. Without it, the bubble stays until another say block.',
      ),
      concept(
        '👕',
        'Costumes',
        'A costume is one picture of a sprite. Switching costumes changes how it looks.',
        'Open the Costumes tab to see them all. “next costume” goes to the next picture in the list.',
      ),
      concept(
        '📏',
        'Size',
        '“change size by 10” makes a sprite bigger. A negative number makes it smaller.',
        '“set size to 100 %” puts it back to normal. Bigger can mean excited. Smaller can mean shy!',
      ),
      concept(
        '🌌',
        'Backdrops',
        'A backdrop is the picture behind your sprites.',
        '“switch backdrop to” changes the whole scene. Use it to move your story to a new place.',
      ),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Meet Pico',
      intro: 'Press the flag, then click Pico. Watch the Looks blocks run.',
      backdrop: 'night',
      sprites: [
        {
          id: 'pico',
          emoji: '👾',
          label: 'Pico',
          x: 0,
          y: -20,
          costumes: ['👾', '😺', '🤩', '😴'],
        },
      ],
      scripts: [
        {
          sprite: 'pico',
          lines: [
            'events| when green flag clicked',
            'looks| set size to (100) %',
            "looks| say [Hi! I'm Pico, your space pet!] for (2) seconds",
            'looks| think [Hmm... what shall we explore?] for (2) seconds',
            'looks| switch costume to [pico-b]',
            'looks| change size by (30)',
            "looks| say [Let's go!] for (2) seconds",
          ],
        },
        {
          sprite: 'pico',
          lines: [
            'events| when this sprite clicked',
            'looks| next costume',
            'looks| say [Hee hee!] for (1) seconds',
          ],
        },
      ],
      hint: 'Which block gives Pico a thought bubble?',
    },
    examples: [
      sc(
        'personality',
        'Pico shows its personality',
        [
          'events| when green flag clicked',
          'looks| switch backdrop to [Moon]',
          "looks| say [Hi! I'm Pico, your space pet!] for (2) seconds",
          'looks| think [Hmm... what shall we explore?] for (2) seconds',
          'looks| switch costume to [pico-b]',
          'looks| change size by (30)',
        ],
        {
          intro: 'Tap a block to see what it does.',
          sprite: 'Pico',
          notes: {
            '2': 'Changes the scene behind Pico.',
            '3': 'Pico talks for two seconds.',
            '4': 'Pico thinks — the bubble looks like a cloud.',
            '5': 'Pico puts on a different costume.',
            '6': 'Pico grows bigger, like it is excited!',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Match the mood',
        'Use a big size and a happy costume for excited. Small and sleepy costume for tired.',
      ),
      mistake(
        'The speech bubble never goes away',
        'You used “say Hello!” without “for 2 seconds”, so the bubble stays.',
        'Use “say … for 2 seconds”, or add another say block with nothing in it.',
      ),
      tip(
        'Name your costumes',
        'In the Costumes tab you can rename costumes so they are easy to find.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt:
        'You want a thought bubble that disappears after 3 seconds. Which block is right?',
      options: [
        'think [Hmm...] for (3) seconds',
        'say [Hmm...]',
        'switch costume to [pico-b]',
        'change size by (3)',
      ],
      answer: 0,
      hint: 'Thought bubble = think. Disappears = “for … seconds”.',
      explain:
        '“think … for 3 seconds” shows a thought bubble and removes it after 3 seconds.',
    },
    project: {
      name: 'Talking Space Pet',
      goal: 'Pico says hello, thinks, changes costume and grows. Click Pico and it giggles!',
      assets: [
        {
          name: 'Pico',
          costumes: ['Pico-a', 'Pico-b', 'Pico-c', 'Pico-d'],
          note: 'Choose a Sprite → Pico',
        },
        { name: 'Moon', note: 'Backdrop: Choose a Backdrop → Moon' },
      ],
      steps: [
        { text: 'Add the Pico sprite. Choose the Moon backdrop.' },
        { text: 'Start with “when green flag clicked”.' },
        { text: 'Add a say block so Pico introduces itself for 2 seconds.' },
        { text: 'Add a think block with a question for Pico to wonder about.' },
        { text: 'Add “switch costume to pico-b” and “change size by 30”.' },
        {
          text: 'Make a second script: “when this sprite clicked”, then “next costume” and a giggle.',
          stack: 'click',
        },
      ],
      stacks: [
        sc(
          'story',
          'Pico introduces itself',
          [
            'events| when green flag clicked',
            'looks| switch backdrop to [Moon]',
            "looks| say [Hi! I'm Pico, your space pet!] for (2) seconds",
            'looks| think [Hmm... what shall we explore?] for (2) seconds',
            'looks| switch costume to [pico-b]',
            'looks| change size by (30)',
          ],
          { sprite: 'Pico' },
        ),
        sc(
          'click',
          'Click Pico',
          [
            'events| when this sprite clicked',
            'looks| next costume',
            'looks| say [Hee hee!] for (1) seconds',
          ],
          { sprite: 'Pico' },
        ),
      ],
      checklist: [
        'Pico says something',
        'Pico thinks something',
        'Pico changes costume',
        'Clicking Pico makes it giggle',
      ],
      stretch:
        'Add “set size to 100 %” at the start so Pico always begins normal size.',
    },
    homework: {
      name: 'Shy Pico',
      instructions:
        'Make a simpler pet: Pico says one thing, then gets smaller and changes costume to look shy.',
      deliverable:
        'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'A negative number in “change size by” makes a sprite smaller.',
    },
    teacherNotes: `## Class flow (about 45 min)
1. **Hook (4 min)** – Show two sprites: one still, one talking. Which feels alive?
2. **Concepts (7 min)** – Say vs think; costumes tab tour.
3. **Demo (5 min)** – Click Pico in the page demo.
4. **Build (22 min)** – Project steps; each learner picks their own pet words.
5. **Share (7 min)** – Learners read their pet’s lines aloud in a pet voice.

## Discussion prompts
- How can size or costume show a feeling?
- When would you use think instead of say?

## Watch for
- Learners using the wrong costume name — open the Costumes tab to copy it.
- Very long speech: ask them to keep it short.`,
    video: vid(
      'Give Your Characters a Personality',
      'How does a sprite show how it feels?',
      'Build the Talking Space Pet project',
      {
        hook: [
          'A silent grey space pet sits on the Moon. It blinks, but says nothing.',
          'This little pet is quiet and still. What if it could talk, think and feel?',
          'Bring it to life!',
        ],
        concept: [
          'Speech and thought bubbles pop up, then a costume swap and a size pulse.',
          'Looks blocks change how a sprite appears: what it says, what it wears and how big it is.',
          'Looks blocks',
        ],
        explain: [
          'Bubble sizes pulse in time. Costumes flip like cards. The backdrop slides to a new planet.',
          'Say makes a speech bubble. Think makes a thought. Costumes and size change the mood, and backdrops change the place.',
          'say · think · costume',
        ],
        demo: [
          'The pet says hello, thinks, puts on a happy costume and grows with a pop.',
          'Watch the pet say hello, wonder about something, then grow bigger because it is excited.',
          'change size by 30',
        ],
        tip: [
          'A bubble that will not go away; a clock icon fixes it.',
          'Tip: add for two seconds so the speech bubble goes away by itself. Little details like these give your pet a big personality.',
          'for 2 seconds',
        ],
        challenge: [
          'The pet tilts its head and asks for a thought bubble that lasts three seconds.',
          'Which block gives a thought bubble for three seconds? Then build your own talking space pet.',
          'Mission: Talking Space Pet',
        ],
      },
    ),
  },

  // ───────────────────────────── 4 · Making Things Interactive ─────────────────────────────
  {
    course: 1,
    lesson: 4,
    title: 'Making Things Interactive',
    emoji: '🎮',
    platform: 'SCRATCH',
    mission: {
      hook: 'When your code listens to the keyboard, you are in control.',
      objective: 'Use Events blocks so a rocket reacts to key presses.',
      badge: 'Pilot',
    },
    concepts: [
      concept(
        '⚡',
        'Events',
        'An event is something that happens, like a key press or a click.',
        'Hat blocks in the Events category wait for an event. When it happens, the blocks under them run.',
      ),
      concept(
        '⌨️',
        'Keyboard interaction',
        '“when right arrow key pressed” runs when you press that key.',
        'You can choose any key from the dropdown: arrows, space, letters and numbers.',
      ),
      concept(
        '↔️',
        'Move with change by',
        'Arrow keys often use “change x by” and “change y by”.',
        'Right: change x by 20. Left: change x by -20. Up: change y by 20. Down: change y by -20.',
      ),
      concept(
        '🧠',
        'Many scripts at once',
        'One sprite can have many scripts. Each waits for its own event.',
        'They all run at the same time, so your rocket can listen to every key.',
      ),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Fly the rocket',
      intro: 'Press the arrow buttons or space. Each key runs its own script.',
      backdrop: 'space',
      keys: ['right arrow', 'left arrow', 'up arrow', 'down arrow', 'space'],
      sprites: [
        {
          id: 'rocket',
          emoji: '🚀',
          label: 'Rocketship',
          x: 0,
          y: -60,
          costumes: ['🚀', '🔥'],
        },
      ],
      scripts: [
        {
          sprite: 'rocket',
          lines: [
            'events| when [right arrow] key pressed',
            'motion| change x by (20)',
          ],
        },
        {
          sprite: 'rocket',
          lines: [
            'events| when [left arrow] key pressed',
            'motion| change x by (-20)',
          ],
        },
        {
          sprite: 'rocket',
          lines: [
            'events| when [up arrow] key pressed',
            'motion| change y by (20)',
          ],
        },
        {
          sprite: 'rocket',
          lines: [
            'events| when [down arrow] key pressed',
            'motion| change y by (-20)',
          ],
        },
        {
          sprite: 'rocket',
          lines: ['events| when [space] key pressed', 'looks| next costume'],
        },
      ],
      hint: 'Which key script moves the rocket up?',
    },
    examples: [
      sc(
        'keys',
        'Two key scripts',
        [
          'events| when [right arrow] key pressed',
          'motion| change x by (20)',
          'events| when [up arrow] key pressed',
          'motion| change y by (20)',
        ],
        {
          intro: 'Tap a block to see what it does.',
          sprite: 'Rocketship',
          notes: {
            '1': 'Waits for the right arrow key.',
            '2': 'Slides the rocket to the right.',
            '3': 'A second hat block waits for the up arrow.',
            '4': 'Moves the rocket up.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Test every key',
        'Press each key after you build it. Make sure it does what you expect.',
      ),
      mistake(
        'The rocket moves the wrong way',
        'The number has the wrong sign, for example change x by 20 on the left arrow.',
        'Left and down use negative numbers: -20.',
      ),
      tip(
        'Use the space key for fun',
        'A space key script can change costume to show the rocket flames.',
      ),
    ],
    challenge: {
      kind: 'order',
      prompt:
        'Put these blocks in the right order so the rocket moves left when you press the left arrow.',
      language: 'scratch',
      lines: [
        'events| when [left arrow] key pressed',
        'motion| change x by (-20)',
        'looks| next costume',
      ],
      hint: 'A hat block always goes first.',
      explain:
        'The hat “when left arrow key pressed” goes first. Then the blocks run: slide left, then change costume.',
    },
    project: {
      name: 'Control Your Rocket',
      goal: 'Fly the rocket with the arrow keys. Press space to light its flames!',
      assets: [
        {
          name: 'Rocketship',
          costumes: [
            'Rocketship-a',
            'Rocketship-b',
            'Rocketship-c',
            'Rocketship-d',
            'Rocketship-e',
          ],
          note: 'Choose a Sprite → Rocketship',
        },
        { name: 'Stars', note: 'Backdrop' },
      ],
      steps: [
        { text: 'Add the Rocketship sprite and the Stars backdrop.' },
        {
          text: 'Make a script: “when green flag clicked” then “go to x: 0 y: 0”.',
        },
        { text: 'Add “when right arrow key pressed” with “change x by 20”.' },
        {
          text: 'Make three more scripts for left, up and down. Use negative numbers for left and down.',
        },
        { text: 'Add “when space key pressed” with “next costume”.' },
        {
          text: 'Click the green flag, then fly! Test every key.',
          stack: 'controls',
        },
      ],
      stacks: [
        sc(
          'controls',
          'Control scripts',
          [
            'events| when green flag clicked',
            'motion| go to x: (0) y: (0)',
            'events| when [right arrow] key pressed',
            'motion| change x by (20)',
            'events| when [space] key pressed',
            'looks| next costume',
          ],
          { sprite: 'Rocketship' },
        ),
      ],
      checklist: [
        'The rocket goes right and left',
        'The rocket goes up and down',
        'Space changes the costume',
        'I tested every key',
      ],
      stretch: 'Add “start sound laser1” to the space key script.',
    },
    homework: {
      name: 'Left and Right Only',
      instructions:
        'Make a simpler rocket that only moves left and right with the arrow keys.',
      deliverable:
        'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'You need two scripts. Each starts with its own “when key pressed” hat block.',
    },
    teacherNotes: `## Class flow (about 45 min)
1. **Hook (3 min)** – “Without events, a program could not hear you.” Play the page demo.
2. **Concepts (7 min)** – Events cards; show the key dropdown.
3. **Demo (5 min)** – Press each demo key; ask learners which script ran.
4. **Build (24 min)** – Project steps; test after each script.
5. **Reflect (6 min)** – “What other events can you name?” (click, flag, message)

## Discussion prompts
- Why do left and down use negative numbers?
- Can two scripts run at the same time?

## Watch for
- Wrong key chosen in the dropdown (up vs. down).
- Learners holding a key and expecting smooth motion — explain each press runs once.`,
    video: vid(
      'Making Things Interactive',
      'How does a game know which key you pressed?',
      'Build the Control Your Rocket project',
      {
        hook: [
          'A rocket sits still while a hand hovers over the keyboard. Nothing happens.',
          'You press a key, but the rocket does not move. Why not?',
          'Wake up the rocket!',
        ],
        concept: [
          'A bright spark leaps from a keyboard to a yellow hat block.',
          'An event is something that happens, like a key press. Events blocks listen for it. Click the yellow Events category to find them all.',
          'Events listen',
        ],
        explain: [
          'Each arrow key sends a spark to its own hat block. The rocket slides in that direction.',
          'Right arrow runs one script. Up arrow runs another. Each script waits for its own key, so you can give every key its own job.',
          'One key, one script',
        ],
        demo: [
          'A rocket zips left, right, up and down as keys light up. Space lights its flames.',
          'Press right and the rocket slides right. Press space and its flames change.',
          'when right arrow key pressed',
        ],
        tip: [
          'The rocket slides left when it should go right; a minus sign flips it.',
          'Tip: left and down use negative numbers, like minus twenty. Test each key to be sure.',
          'Use -20',
        ],
        challenge: [
          'Pixel shows three jumbled blocks and a left arrow.',
          'Which block goes first when the left arrow is pressed? Then build your own rocket controls.',
          'Mission: Control Your Rocket',
        ],
      },
    ),
  },

  // ───────────────────────────── 5 · Sounds, Music & Effects ─────────────────────────────
  {
    course: 1,
    lesson: 5,
    title: 'Sounds, Music & Effects',
    emoji: '🎧',
    platform: 'SCRATCH',
    mission: {
      hook: 'Sound can turn a project into a party.',
      objective:
        'Use Sound and Looks effects blocks to build a space DJ booth.',
      badge: 'Space DJ',
    },
    concepts: [
      concept(
        '🔊',
        'Start a sound',
        '“start sound” plays a sound and the script keeps going.',
        'Use it when you want sound and movement at the same time.',
      ),
      concept(
        '⏳',
        'Play until done',
        '“play sound until done” waits for the sound to finish first.',
        'The next block only runs after the sound ends. Great for sounds in a row.',
      ),
      concept(
        '🎚️',
        'Volume and pitch',
        'Volume makes sound louder or quieter. Pitch makes it higher or lower.',
        'Set volume to 0 to be silent and 100 to be full. “clear sound effects” puts everything back to normal.',
      ),
      concept(
        '🌈',
        'Visual effects',
        '“change color effect by 25” changes how a sprite looks.',
        'Looks effects are only for what you see. Sound effects are only for what you hear.',
      ),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Click the DJ pads',
      intro:
        'Click a pad to play its sound and change its colour. Use the arrows to change the pitch.',
      backdrop: 'night',
      keys: ['up arrow', 'down arrow', 'space'],
      sprites: [
        { id: 'robot', emoji: '🤖', label: 'Robot', x: -140, y: -40 },
        { id: 'rocket', emoji: '🚀', label: 'Rocketship', x: 0, y: -40 },
        { id: 'ball', emoji: '⚽', label: 'Ball', x: 140, y: -40 },
      ],
      scripts: [
        {
          sprite: 'robot',
          lines: [
            'events| when this sprite clicked',
            'sound| start sound [computer beep]',
            'looks| change [color] effect by (25)',
          ],
        },
        {
          sprite: 'rocket',
          lines: [
            'events| when this sprite clicked',
            'sound| start sound [space ripple]',
            'looks| change [color] effect by (25)',
          ],
        },
        {
          sprite: 'ball',
          lines: [
            'events| when this sprite clicked',
            'sound| start sound [Boing]',
            'looks| change [color] effect by (25)',
          ],
        },
        {
          sprite: 'robot',
          lines: [
            'events| when [up arrow] key pressed',
            'sound| change [pitch] effect by (10)',
          ],
        },
        {
          sprite: 'robot',
          lines: [
            'events| when [down arrow] key pressed',
            'sound| change [pitch] effect by (-10)',
          ],
        },
        {
          sprite: 'robot',
          lines: [
            'events| when [space] key pressed',
            'sound| clear sound effects',
          ],
        },
      ],
      hint: 'Which block makes the sound higher?',
    },
    examples: [
      sc(
        'pad',
        'A DJ pad',
        [
          'events| when this sprite clicked',
          'sound| start sound [computer beep]',
          'looks| change [color] effect by (25)',
          'events| when [up arrow] key pressed',
          'sound| change [pitch] effect by (10)',
        ],
        {
          intro: 'Tap a block to see what it does.',
          sprite: 'Robot',
          notes: {
            '2': 'Plays the sound while the script keeps going.',
            '3': 'The pad changes colour each time you click it.',
            '5': 'Pitch makes every sound a little higher.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Listen first',
        'Open the Sounds tab and play each sound before you choose one.',
      ),
      mistake(
        'No sound plays',
        'The computer volume is low, or the volume block is set to 0.',
        'Turn up your volume and use “set volume to 100 %”.',
      ),
      tip(
        'Start vs play until done',
        'Use “start sound” for overlaps. Use “play sound until done” for one after another.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt:
        'You want sound B to play only AFTER sound A is finished. Which block do you use for sound A?',
      options: [
        'play sound [Boing] until done',
        'start sound [Boing]',
        'stop all sounds',
        'change [pitch] effect by (10)',
      ],
      answer: 0,
      hint: 'One block waits for the sound to end.',
      explain:
        '“play sound until done” makes the script wait. “start sound” would let the next block run straight away.',
    },
    project: {
      name: 'Space DJ',
      goal: 'Three pads play different sounds and change colour. Arrow keys change the pitch.',
      assets: [
        { name: 'Robot', costumes: ['Robot-a'], note: 'Sound: computer beep' },
        {
          name: 'Rocketship',
          costumes: ['Rocketship-a'],
          note: 'Sound: space ripple',
        },
        { name: 'Ball', costumes: ['Ball-a'], note: 'Sound: Boing' },
        { name: 'Neon Tunnel', note: 'Backdrop' },
      ],
      steps: [
        {
          text: 'Add the Robot, Rocketship and Ball sprites. Choose the Neon Tunnel backdrop.',
        },
        { text: 'Drag the sprites so they sit in a row like DJ pads.' },
        {
          text: 'On the Robot, build “when this sprite clicked” with “start sound computer beep”.',
        },
        { text: 'Add “change color effect by 25” so the pad flashes.' },
        {
          text: 'Copy the script to the other two sprites. Change each sound.',
        },
        {
          text: 'Add up arrow and down arrow scripts that change the pitch. Add space to clear it.',
          stack: 'pad',
        },
      ],
      stacks: [
        sc(
          'pad',
          'DJ pad and pitch',
          [
            'events| when this sprite clicked',
            'sound| start sound [computer beep]',
            'looks| change [color] effect by (25)',
            'events| when [up arrow] key pressed',
            'sound| change [pitch] effect by (10)',
            'events| when [space] key pressed',
            'sound| clear sound effects',
          ],
          { sprite: 'Robot' },
        ),
      ],
      checklist: [
        'Each pad plays its own sound',
        'Each pad changes colour',
        'Up arrow makes sounds higher',
        'Space clears the effects',
      ],
      stretch: 'Add “set volume to 60 %” when the green flag is clicked.',
    },
    homework: {
      name: 'Two-Pad Mixer',
      instructions:
        'Make a simpler DJ booth with only two sprites. Each one plays a different sound when clicked.',
      deliverable:
        'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'Use the “when this sprite clicked” hat block on each sprite.',
    },
    teacherNotes: `## Class flow (about 45 min)
1. **Hook (3 min)** – Play two sounds; ask which one is “higher”.
2. **Concepts (7 min)** – Start vs play-until-done; volume vs pitch.
3. **Demo (5 min)** – Click pads in the page demo.
4. **Build (24 min)** – Project steps; learners choose sounds in the Sounds tab.
5. **DJ set (6 min)** – Learners play their booth for a partner.

## Discussion prompts
- When do you need “until done”?
- What can sound add to a game or story?

## Watch for
- Muted device speakers or headphones.
- Pitch pushed too far — use “clear sound effects”.`,
    video: vid(
      'Sounds, Music & Effects',
      'What makes a project sound amazing?',
      'Build the Space DJ project',
      {
        hook: [
          'A silent dance floor. The lights pulse, but there is no music.',
          'Lights, aliens, dancing — but something is missing. Can you hear it?',
          'Add the sound!',
        ],
        concept: [
          'A sound wave appears, rising and falling as a speaker thumps.',
          'Sound blocks play sounds. You can start them, wait for them, and change how they sound.',
          'Sound blocks',
        ],
        explain: [
          'Two sounds play: one overlaps, the next waits its turn. A pitch dial turns up.',
          'Start sound plays and moves on. Play until done waits. Pitch makes sounds higher or lower. Try each one and listen to the difference.',
          'start · until done · pitch',
        ],
        demo: [
          'Three glowing pads flash as a click plays a sound; the DJ turns the pitch up.',
          'Click a pad: a sound plays and the pad changes colour. Press up and the pitch rises. Every pad is its own script.',
          'start sound',
        ],
        tip: [
          'A tiny speaker icon is muted; a hand turns it up.',
          'Tip: if you hear nothing, check your volume and the set volume block.',
          'Check volume',
        ],
        challenge: [
          'The DJ holds two sound blocks and asks which waits for the end.',
          'Which block waits until the sound is done? Then build your own Space DJ booth.',
          'Mission: Space DJ',
        ],
      },
    ),
  },

  // ───────────────────────────── 6 · The Magic of Repetition ─────────────────────────────
  {
    course: 1,
    lesson: 6,
    title: 'The Magic of Repetition',
    emoji: '✨',
    platform: 'SCRATCH',
    mission: {
      hook: 'Computers never get tired of repeating things.',
      objective: 'Use repeat and forever loops to make a starfield dance.',
      badge: 'Loop Wizard',
    },
    concepts: [
      concept(
        '🔁',
        'Loops',
        'A loop repeats blocks so you do not have to add them again and again.',
        'Instead of ten “change y by 20” blocks, one repeat 10 block does the job.',
      ),
      concept(
        '🔢',
        'Repeat',
        '“repeat 10” runs the blocks inside exactly 10 times.',
        'Change the number to repeat more or fewer times.',
      ),
      concept(
        '♾️',
        'Forever',
        '“forever” repeats until you press the red stop button.',
        'It is perfect for things that keep going, like twinkling stars.',
      ),
      concept(
        '⏱️',
        'Wait inside loops',
        'A “wait” block slows a loop down so you can see what happens.',
        'Without a wait, a loop can run so fast it looks like nothing changes.',
      ),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'A dancing starfield',
      intro:
        'Press the green flag. Three stars loop forever. Press stop when you are ready.',
      backdrop: 'space',
      sprites: [
        { id: 'star1', emoji: '⭐', label: 'Star', x: -120, y: 60 },
        { id: 'star2', emoji: '🌟', label: 'Star', x: 0, y: -40 },
        { id: 'star3', emoji: '✨', label: 'Star', x: 120, y: 70 },
      ],
      scripts: [
        {
          sprite: 'star1',
          lines: [
            'events| when green flag clicked',
            'control| forever',
            '  motion| go to [random position]',
            '  looks| change [color] effect by (25)',
            '  control| wait (0.5) seconds',
          ],
        },
        {
          sprite: 'star2',
          lines: [
            'events| when green flag clicked',
            'control| forever',
            '  motion| go to [random position]',
            '  looks| change [color] effect by (25)',
            '  control| wait (0.5) seconds',
          ],
        },
        {
          sprite: 'star3',
          lines: [
            'events| when green flag clicked',
            'control| forever',
            '  motion| go to [random position]',
            '  looks| change [color] effect by (25)',
            '  control| wait (0.5) seconds',
          ],
        },
      ],
      hint: 'Which block makes the loop go on and on?',
    },
    examples: [
      sc(
        'forever',
        'A forever loop',
        [
          'events| when green flag clicked',
          'looks| set size to (60) %',
          'control| forever',
          '  motion| go to [random position]',
          '  looks| change [color] effect by (25)',
          '  control| wait (0.5) seconds',
        ],
        {
          intro: 'Tap a block to see what it does.',
          sprite: 'Star',
          notes: {
            '3': 'Everything inside runs again and again.',
            '4': 'The star jumps to a new spot each time.',
            '6': 'Waits half a second so you can see the jump.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Press stop',
        'A forever loop never ends by itself. Press the red stop button.',
      ),
      mistake(
        'The blocks are not inside the loop',
        'A block sits under the loop, not inside it, so it runs only after the loop ends.',
        'Drag it into the mouth of the loop until the loop hugs it.',
      ),
      tip(
        'Copy sprites',
        'Right-click a sprite and choose duplicate. Each copy keeps the same blocks.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'Which loop block keeps going until you press the stop button?',
      options: [
        'forever',
        'repeat (10)',
        'wait (1) seconds',
        'go to [random position]',
      ],
      answer: 0,
      hint: 'It has no number.',
      explain:
        '“forever” has no number, so it never stops by itself. “repeat 10” stops after 10 times.',
    },
    project: {
      name: 'Dancing Starfield',
      goal: 'Many stars jump around the Stage and change colour, forever.',
      assets: [
        {
          name: 'Star',
          costumes: ['Star'],
          note: 'Choose a Sprite → Star, then duplicate it',
        },
        { name: 'Space', note: 'Backdrop' },
      ],
      steps: [
        { text: 'Add the Star sprite and the Space backdrop.' },
        { text: 'Build “when green flag clicked”, then “set size to 60 %”.' },
        { text: 'Add a “forever” loop from Control.' },
        {
          text: 'Inside it, add “go to random position”, “change color effect by 25” and “wait 0.5 seconds”.',
        },
        {
          text: 'Right-click the Star and choose duplicate. Do it four times.',
        },
        {
          text: 'Click the green flag and watch your starfield dance!',
          stack: 'twinkle',
        },
      ],
      stacks: [
        sc(
          'twinkle',
          'Twinkling star',
          [
            'events| when green flag clicked',
            'looks| set size to (60) %',
            'control| forever',
            '  motion| go to [random position]',
            '  looks| change [color] effect by (25)',
            '  control| wait (0.5) seconds',
          ],
          { sprite: 'Star' },
        ),
      ],
      checklist: [
        'My star jumps around',
        'It changes colour',
        'I have at least four stars',
        'I used a loop, not lots of copies of a block',
      ],
      stretch:
        'Add “change size by 10” and “change size by -10” inside the loop to make the stars pulse.',
    },
    homework: {
      name: 'Ten Twinkles',
      instructions:
        'Make one star twinkle ten times with a repeat block, then stop.',
      deliverable:
        'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'Use repeat 10 instead of forever, and keep the wait block inside it.',
    },
    teacherNotes: `## Class flow (about 45 min)
1. **Hook (3 min)** – Clap-a-pattern: “clap 3 times” vs. “clap 3 times, 3 times”.
2. **Concepts (7 min)** – Repeat vs forever. Show how loops save blocks.
3. **Demo (5 min)** – Run the demo; press the stop button together.
4. **Build (24 min)** – Project steps; learners duplicate stars.
5. **Share (6 min)** – Learners explain where the loop starts and ends.

## Discussion prompts
- What would the project look like with no wait block?
- When would you pick repeat instead of forever?

## Watch for
- Loops that look frozen (no wait) — add wait 0.5.
- Blocks sitting under, not inside, the loop.`,
    video: vid(
      'The Magic of Repetition',
      'What if you never had to do the same thing twice?',
      'Build the Dancing Starfield project',
      {
        hook: [
          'A tired robot stacks the same block over and over; the pile reaches the ceiling.',
          'Ten blocks, then ten more. This robot is tired. There must be an easier way.',
          'There is!',
        ],
        concept: [
          'A glowing loop arrow wraps around three blocks and they pulse in time.',
          'A loop repeats blocks for you. You write them once and the computer does the rest.',
          'Loops repeat',
        ],
        explain: [
          'A repeat counter ticks from one to ten. A forever loop shows an endless circle with a stop sign.',
          'Repeat ten runs ten times. Forever keeps going until you press stop. A wait block slows it down, so you can enjoy the show.',
          'repeat · forever · wait',
        ],
        demo: [
          'A single star twinkles, then copies appear until the Stage sparkles.',
          'One loop makes a star jump and change colour. Duplicate the sprite and you get a starfield. Press stop whenever you like.',
          'forever',
        ],
        tip: [
          'A block sits just outside the loop; a hand drags it inside.',
          'Tip: blocks must be inside the loop to repeat. Drag them into its mouth.',
          'Inside the loop',
        ],
        challenge: [
          'The robot holds up repeat and forever blocks and tilts its head.',
          'Which block never stops by itself? Then build your own dancing starfield.',
          'Mission: Dancing Starfield',
        ],
      },
    ),
  },

  // ───────────────────────────── 7 · Bringing Characters to Life ─────────────────────────────
  {
    course: 1,
    lesson: 7,
    title: 'Bringing Characters to Life',
    emoji: '🎬',
    platform: 'SCRATCH',
    mission: {
      hook: 'Animation is just pictures changing quickly.',
      objective:
        'Use costumes and loops to animate two aliens dancing together.',
      badge: 'Animator',
    },
    concepts: [
      concept(
        '🖼️',
        'Animation',
        'An animation is a set of pictures shown one after another.',
        'Flip-books work the same way. Each page is a little different, so the picture seems to move.',
      ),
      concept(
        '👗',
        'Costume cycle',
        '“next costume” inside a loop makes a sprite animate.',
        'Giga has four costumes. When it reaches the last one, “next costume” goes back to the first.',
      ),
      concept(
        '⌛',
        'Timing',
        'A short wait between costumes sets how fast the animation plays.',
        'Try 0.2 seconds. A bigger number looks slow, a smaller one looks fast.',
      ),
      concept(
        '📣',
        'Broadcast',
        '“broadcast” sends a message. “when I receive” waits for it.',
        'Use it to make two sprites start at the very same time.',
      ),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Animate the aliens',
      intro:
        'Press the flag. One message starts both sprites dancing together.',
      backdrop: 'night',
      sprites: [
        {
          id: 'giga',
          emoji: '👽',
          label: 'Giga',
          x: -80,
          y: -20,
          costumes: ['👽', '🤩', '👽', '😎'],
        },
        {
          id: 'nano',
          emoji: '👾',
          label: 'Nano',
          x: 80,
          y: -20,
          costumes: ['👾', '😜', '👾', '🤪'],
        },
      ],
      scripts: [
        {
          sprite: 'giga',
          lines: [
            'events| when green flag clicked',
            'events| broadcast [dance]',
          ],
        },
        {
          sprite: 'giga',
          lines: [
            'events| when I receive [dance]',
            'control| repeat (8)',
            '  looks| next costume',
            '  control| wait (0.2) seconds',
          ],
        },
        {
          sprite: 'nano',
          lines: [
            'events| when I receive [dance]',
            'control| repeat (8)',
            '  looks| next costume',
            '  control| wait (0.2) seconds',
          ],
        },
      ],
      hint: 'How does Nano know when to start?',
    },
    examples: [
      sc(
        'animate',
        'A costume animation',
        [
          'events| when green flag clicked',
          'events| broadcast [dance]',
          'events| when I receive [dance]',
          'control| repeat (8)',
          '  looks| next costume',
          '  control| wait (0.2) seconds',
        ],
        {
          intro: 'Tap a block to see what it does.',
          sprite: 'Giga',
          notes: {
            '2': 'Sends the message “dance” to every sprite.',
            '3': 'Any sprite with this hat block starts when it hears “dance”.',
            '5': 'Switches to the next picture.',
            '6': 'A short wait sets the animation speed.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Speed it up',
        'Use a smaller wait, like 0.1 seconds, to make the animation faster.',
      ),
      mistake(
        'The animation jumps too fast to see',
        'There is no wait block in the loop, so costumes change instantly.',
        'Add “wait 0.2 seconds” inside the loop.',
      ),
      tip(
        'Message names',
        'Use the same message name in broadcast and when I receive. Check the spelling.',
      ),
    ],
    challenge: {
      kind: 'order',
      prompt:
        'Put the blocks in order to animate a sprite when it hears the message “dance”.',
      language: 'scratch',
      lines: [
        'events| when I receive [dance]',
        'control| repeat (8)',
        'looks| next costume',
      ],
      hint: 'The hat block goes first, then the loop, then what to repeat.',
      explain:
        'Start with the hat block. Then repeat 8. The next costume block goes inside the repeat so it runs 8 times.',
    },
    project: {
      name: 'Alien Animation Studio',
      goal: 'Giga and Nano dance together using costumes and a broadcast message.',
      assets: [
        { name: 'Giga', costumes: ['Giga-a', 'Giga-b', 'Giga-c', 'Giga-d'] },
        { name: 'Nano', costumes: ['Nano-a', 'Nano-b', 'Nano-c', 'Nano-d'] },
        { name: 'Night City', note: 'Backdrop' },
      ],
      steps: [
        {
          text: 'Add Giga and Nano. Choose a backdrop. Place them side by side.',
        },
        {
          text: 'On Giga, build “when green flag clicked” then “broadcast dance”.',
        },
        { text: 'On Giga, build “when I receive dance”, then “repeat 8”.' },
        {
          text: 'Inside the repeat, add “next costume” and “wait 0.2 seconds”.',
        },
        {
          text: 'Copy that script to Nano by dragging it onto the Nano sprite.',
        },
        {
          text: 'Click the green flag. Change the wait time to make a faster or slower dance!',
          stack: 'dance',
        },
      ],
      stacks: [
        sc(
          'dance',
          'Dance together',
          [
            'events| when green flag clicked',
            'events| broadcast [dance]',
            'events| when I receive [dance]',
            'control| repeat (8)',
            '  looks| next costume',
            '  control| wait (0.2) seconds',
          ],
          { sprite: 'Giga' },
        ),
      ],
      checklist: [
        'Both aliens change costumes',
        'They start at the same time',
        'The dance is not too fast or too slow',
        'I changed the wait time',
      ],
      stretch:
        'Add “change x by 10” inside the loop so the aliens dance across the Stage.',
    },
    homework: {
      name: 'One-Alien Animation',
      instructions:
        'Animate only Giga. Use a repeat loop with next costume and a wait block.',
      deliverable:
        'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'You do not need a broadcast for one sprite — use the green flag hat block.',
    },
    teacherNotes: `## Class flow (about 45 min)
1. **Hook (4 min)** – Flip-book demo with paper or a slide deck.
2. **Concepts (7 min)** – Costumes tab tour; show costume order.
3. **Demo (5 min)** – Press the flag; ask how Nano knows when to dance.
4. **Build (23 min)** – Project steps; learners test different wait times.
5. **Share (6 min)** – Gallery walk: learners watch each other’s dance.

## Discussion prompts
- Why does a wait block change how an animation feels?
- What would happen if the message names did not match?

## Watch for
- Typos in the message name.
- Dragging a script onto the wrong sprite.`,
    video: vid(
      'Bringing Characters to Life',
      'How do cartoons make pictures move?',
      'Build the Alien Animation Studio project',
      {
        hook: [
          'A pile of alien drawings flips like a flip-book and the alien waves.',
          'Look at this alien wave. But it is not moving. It is just pictures changing fast!',
          'Pictures that move!',
        ],
        concept: [
          'Four alien costumes line up in a strip and a highlight hops from one to the next.',
          'Animation is lots of pictures shown one after another. In Scratch, each picture is a costume. Switch them quickly and the picture moves.',
          'Costumes = frames',
        ],
        explain: [
          'A loop plays next costume with a clock ticking. A speech balloon of a message jumps between two aliens.',
          'Put next costume inside a loop with a short wait. Use broadcast to tell more sprites to start together.',
          'loop + wait + broadcast',
        ],
        demo: [
          'Two aliens dance in step as a broadcast arrow bursts from one to the other.',
          'One message starts both aliens. They loop through costumes and dance in time.',
          'broadcast dance',
        ],
        tip: [
          'Costumes flash by too fast to see; a clock block slows them.',
          'Tip: add a wait block, like zero point two seconds, so you can see each costume.',
          'wait 0.2',
        ],
        challenge: [
          'The alien holds three jumbled blocks and a message envelope.',
          'Which block goes first when a sprite hears the message? Then build your own animation studio.',
          'Mission: Alien Animation Studio',
        ],
      },
    ),
  },

  // ───────────────────────────── 8 · My First Animated Story ─────────────────────────────
  {
    course: 1,
    lesson: 8,
    title: 'My First Animated Story',
    emoji: '📖',
    platform: 'SCRATCH',
    mission: {
      hook: 'Every story has a beginning, a middle and an end — and now you can code all three.',
      objective:
        'Combine backdrops, speech, motion and messages into a short animated story.',
      badge: 'Story Maker',
    },
    concepts: [
      concept(
        '🎞️',
        'Scenes',
        'A story is made of scenes. In Scratch, each scene can have its own backdrop.',
        '“switch backdrop to” changes the place. You can switch backdrops as the story moves on.',
      ),
      concept(
        '🗣️',
        'Taking turns',
        'Characters take turns speaking so the story is easy to follow.',
        'Use “say for seconds” so each line ends before the next one starts.',
      ),
      concept(
        '📨',
        'Passing the baton',
        'Use “broadcast” so one character tells another when it is their turn.',
        'The first sprite broadcasts a message. The next sprite waits with “when I receive”.',
      ),
      concept(
        '🧭',
        'Plan first',
        'Plan your story: who, where, what happens, how it ends.',
        'Write three short lines before you start coding. Then turn each line into blocks.',
      ),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'The Lost Space Puppy',
      intro:
        'Press the flag to watch the story. Look at how the message passes between sprites.',
      backdrop: 'space',
      sprites: [
        { id: 'giga', emoji: '👽', label: 'Giga', x: -100, y: -30 },
        { id: 'puppy', emoji: '🐶', label: 'Puppy', x: 110, y: -50 },
      ],
      scripts: [
        {
          sprite: 'giga',
          lines: [
            'events| when green flag clicked',
            'looks| say [Oh no! My space puppy is lost!] for (3) seconds',
            'motion| glide (2) secs to x: (60) y: (-30)',
            'looks| think [Where could he be?] for (2) seconds',
            'events| broadcast [found]',
          ],
        },
        {
          sprite: 'puppy',
          lines: [
            'events| when green flag clicked',
            'looks| hide',
            'events| when I receive [found]',
            'looks| show',
            'looks| say [Woof! I am here!] for (2) seconds',
          ],
        },
        {
          sprite: 'giga',
          lines: [
            'events| when I receive [found]',
            'looks| say [There you are!] for (2) seconds',
          ],
        },
      ],
      hint: 'Which block makes the puppy appear?',
    },
    examples: [
      sc(
        'story',
        'Scene one',
        [
          'events| when green flag clicked',
          'looks| switch backdrop to [Space]',
          'looks| say [Oh no! My space puppy is lost!] for (3) seconds',
          'motion| glide (2) secs to x: (60) y: (-30)',
          'events| broadcast [found]',
        ],
        {
          intro: 'Tap a block to see what it does.',
          sprite: 'Giga',
          notes: {
            '2': 'Sets the scene.',
            '3': 'The story begins with a problem.',
            '5': 'Tells the puppy it is time to appear.',
          },
        },
      ),
    ],
    tips: [
      tip(
        'Keep lines short',
        'Short speech bubbles are easier to read than long ones.',
      ),
      mistake(
        'A character speaks at the wrong time',
        'Two sprites both start talking when the green flag is clicked.',
        'Use broadcast and when I receive so they take turns.',
      ),
      tip(
        'Test each scene',
        'Click the flag after each new scene to catch mistakes early.',
      ),
    ],
    challenge: {
      kind: 'choose',
      prompt:
        'The puppy must appear AFTER Giga says “Where could he be?”. What should Giga do next?',
      options: [
        'broadcast [found]',
        'hide',
        'change size by (10)',
        'stop [all]',
      ],
      answer: 0,
      hint: 'How does one sprite tell another when it is time?',
      explain:
        'Giga broadcasts the message “found”. The puppy has a “when I receive found” hat block, so it appears right then.',
    },
    project: {
      name: 'Lost Space Puppy',
      goal: 'Giga loses a puppy, searches for it, finds it and celebrates — in three scenes.',
      assets: [
        { name: 'Giga', costumes: ['Giga-a', 'Giga-b', 'Giga-c', 'Giga-d'] },
        { name: 'Puppy', note: 'Choose a Sprite → Puppy' },
        { name: 'Space', note: 'Backdrop' },
        { name: 'Moon', note: 'Second backdrop' },
      ],
      steps: [
        {
          text: 'Add Giga, the Puppy, and the Space backdrop. Write your story in three short lines.',
        },
        {
          text: 'Scene 1: Giga says the puppy is lost, then glides across the Stage.',
        },
        { text: 'Add “broadcast found” at the end of scene 1.' },
        {
          text: 'Puppy: hide at the start. Show and say hello when it hears “found”.',
        },
        {
          text: 'Scene 3: switch the backdrop to Moon and let Giga celebrate with a costume change.',
        },
        {
          text: 'Click the green flag and watch your story. Fix anything that feels too fast!',
          stack: 'story',
        },
      ],
      stacks: [
        sc(
          'story',
          'Giga’s scene',
          [
            'events| when green flag clicked',
            'looks| switch backdrop to [Space]',
            'looks| say [Oh no! My space puppy is lost!] for (3) seconds',
            'motion| glide (2) secs to x: (60) y: (-30)',
            'events| broadcast [found]',
          ],
          { sprite: 'Giga' },
        ),
        sc(
          'puppy',
          'Puppy’s scene',
          [
            'events| when green flag clicked',
            'looks| hide',
            'events| when I receive [found]',
            'looks| show',
            'looks| say [Woof! I am here!] for (2) seconds',
          ],
          { sprite: 'Puppy' },
        ),
      ],
      checklist: [
        'My story has a beginning, middle and end',
        'Characters take turns',
        'I used at least two backdrops',
        'I used broadcast at least once',
      ],
      stretch: 'Add a third character, or a sound when the puppy is found.',
    },
    homework: {
      name: 'Two-Scene Story',
      instructions:
        'Make a shorter story with two scenes. Use two sprites and one broadcast message.',
      deliverable:
        'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'Plan first: who is in the story, and what is the problem?',
    },
    teacherNotes: `## Class flow (about 45 min)
1. **Hook (3 min)** – “Tell me a story in three sentences.” Learners share.
2. **Plan (7 min)** – Learners write a 3-line plan on paper or in a note.
3. **Demo (5 min)** – Press the flag in the page demo; trace the message.
4. **Build (24 min)** – Learners turn their plan into scenes.
5. **Showcase (6 min)** – Learners present their story.

## Discussion prompts
- Which sprite goes first, and how does the next one know when to start?
- How did planning help you build faster?

## Watch for
- Overly long stories — encourage three short scenes.
- Sprites speaking over each other.`,
    video: vid(
      'My First Animated Story',
      'How do you turn an idea into a story that moves?',
      'Build the Lost Space Puppy project',
      {
        hook: [
          'A storybook opens and a page glows. A little alien looks around, worried.',
          'Giga has lost something. Can we help tell the story of how it is found? Today you tell it yourself.',
          'Tell the story!',
        ],
        concept: [
          'Three storyboard cards fill in: beginning, middle and end.',
          'A story has scenes. Each scene has a place, characters and something that happens.',
          'Beginning · Middle · End',
        ],
        explain: [
          'Backdrops slide in. Speech bubbles take turns. A message arrow passes from one character to the next.',
          'Use backdrops for places, say blocks for talking, and broadcast to tell the next character it is their turn.',
          'say · backdrop · broadcast',
        ],
        demo: [
          'Giga searches the Moon. A message pings and a puppy pops up, wagging its tail.',
          'Giga broadcasts a message. The puppy hears it, appears and says hello. Story complete! Planning your scenes first makes building easy.',
          'broadcast found',
        ],
        tip: [
          'Two speech bubbles collide; a clock keeps them apart.',
          'Tip: let characters take turns with say for seconds and broadcast.',
          'Take turns',
        ],
        challenge: [
          'A blank storyboard waits with three empty cards.',
          'Plan three scenes for your story. Then build the Lost Space Puppy and make it your own.',
          'Mission: Lost Space Puppy',
        ],
      },
    ),
  },
];
