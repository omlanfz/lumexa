// FILE PATH: server/src/little-coders/curriculum/course2.ts
//
// COURSE 2 — SCRATCH GAME STUDIO (MIT Scratch). Eight lessons, one game each:
//   1 Asteroid Maze · 2 Catch the Falling Stars · 3 Star Collector · 4 Keycard Escape
//   5 Mystery Prize Machine · 6 Meteor Dodge · 7 Space Mission: Three Levels · 8 Meteor Blaster

import type { LcLessonSpec } from '../lc.types';
import { concept, mistake, sc, tip, vid } from './helpers';

export const COURSE_2: LcLessonSpec[] = [
  // ───────────────────────────── 1 · Game Controls & Movement ─────────────────────────────
  {
    course: 2,
    lesson: 1,
    title: 'Game Controls & Movement',
    emoji: '🕹️',
    platform: 'SCRATCH',
    mission: {
      hook: 'Great games feel smooth because the code checks the keyboard all the time.',
      objective: 'Control a ship with the arrow keys and send it back to the start when it hits an asteroid.',
      badge: 'Maze Pilot',
    },
    concepts: [
      concept('⌨️', 'Keyboard controls', '“key pressed?” checks if a key is held down right now.', 'Put it inside an “if” block inside “forever” and the game checks the keys again and again. Movement feels smooth.'),
      concept('📍', 'Coordinates', 'Every spot on the Stage has an x and a y.', 'Use “go to x: y:” to put a sprite at a start position. A new game should always start from the same place.'),
      concept('🧱', 'Boundaries', 'A boundary is something the player must not cross.', 'Check “touching” inside the loop. If the ship touches an asteroid, send it back to the start.'),
      concept('🔄', 'The game loop', 'A “forever” loop is the heartbeat of a game.', 'Everything inside runs over and over: check keys, move, check for hits. Games do this many times every second.'),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Fly through the maze',
      intro: 'Press the green flag, then hold the arrow buttons. Touch an asteroid and see what happens!',
      backdrop: 'space',
      keys: ['right arrow', 'left arrow', 'up arrow', 'down arrow'],
      sprites: [
        { id: 'ship', emoji: '🚀', label: 'Rocketship', x: -200, y: -120 },
        { id: 'rock1', emoji: '🪨', label: 'Rocks', x: -40, y: -40 },
        { id: 'rock2', emoji: '🪨', label: 'Rocks2', x: 90, y: 50 },
        { id: 'goal', emoji: '⭐', label: 'Star', x: 200, y: 120 },
      ],
      scripts: [
        {
          sprite: 'ship',
          lines: [
            'events| when green flag clicked',
            'motion| go to x: (-200) y: (-120)',
            'control| forever',
            '  control| if {key [right arrow] pressed?} then',
            '    motion| change x by (6)',
            '  control| if {key [left arrow] pressed?} then',
            '    motion| change x by (-6)',
            '  control| if {key [up arrow] pressed?} then',
            '    motion| change y by (6)',
            '  control| if {key [down arrow] pressed?} then',
            '    motion| change y by (-6)',
            '  control| if {touching [Rocks]?} then',
            '    motion| go to x: (-200) y: (-120)',
            '  control| if {touching [Rocks2]?} then',
            '    motion| go to x: (-200) y: (-120)',
          ],
        },
        { sprite: 'goal', lines: ['events| when green flag clicked', 'control| wait until {touching [Rocketship]?}', 'looks| say [You made it!] for (2) seconds'] },
      ],
      hint: 'Why is the “touching” check inside the forever loop?',
    },
    examples: [
      sc(
        'controls',
        'Smooth controls',
        ['events| when green flag clicked', 'motion| go to x: (-200) y: (-120)', 'control| forever', '  control| if {key [right arrow] pressed?} then', '    motion| change x by (6)', '  control| if {touching [Rocks]?} then', '    motion| go to x: (-200) y: (-120)'],
        { intro: 'Tap a block to see what it does.', sprite: 'Rocketship', notes: { '2': 'Every game starts from the same place.', '3': 'The game loop checks everything again and again.', '4': 'Asks: is the right arrow being held?', '5': 'If yes, slide right a little.', '6': 'Asks: did the ship hit the asteroid?', '7': 'If yes, back to the start.' } },
      ),
    ],
    tips: [
      tip('Small steps feel smooth', 'Change x by 5 or 6, not 50. Small moves checked often feel smooth.'),
      mistake('The ship only moves once per key press', 'You used “when key pressed” hat blocks, which run once per press.', 'Use “forever” with “if key pressed?” so the keys are checked all the time.'),
      tip('Give the player a fair start', 'Start the ship far from the asteroids so the game is not over straight away.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'Which block asks, “is the up arrow being held down right now?”',
      options: ['if {key [up arrow] pressed?} then', 'when [up arrow] key pressed', 'change y by (6)', 'forever'],
      answer: 0,
      hint: 'It is a question with a yes or no answer.',
      explain: '“key up arrow pressed?” is a Sensing question. Inside an “if” block it makes the code run only while the key is held.',
    },
    project: {
      name: 'Asteroid Maze',
      goal: 'Steer a rocket through floating asteroids to the star. Touch an asteroid and you start again!',
      assets: [
        { name: 'Rocketship', costumes: ['Rocketship-a'] },
        { name: 'Rocks', note: 'Duplicate it to make more asteroids' },
        { name: 'Star', note: 'The goal' },
        { name: 'Space', note: 'Backdrop' },
      ],
      steps: [
        { text: 'Add the Rocketship, Rocks and Star sprites. Choose the Space backdrop. Duplicate the Rocks to build a maze.' },
        { text: 'On the Rocketship, start with “when green flag clicked” and “go to x: -200 y: -120”.' },
        { text: 'Add a “forever” loop. Inside it, add four “if key pressed?” blocks, one for each arrow key.' },
        { text: 'In each “if”, add “change x by” or “change y by”. Use small numbers like 6 or -6.' },
        { text: 'Add an “if touching Rocks?” block that sends the rocket back to the start. Do the same for each asteroid.' },
        { text: 'On the Star, use “wait until touching Rocketship?” and then say “You made it!”.', stack: 'controls' },
      ],
      stacks: [
        sc('controls', 'Ship controls', ['events| when green flag clicked', 'motion| go to x: (-200) y: (-120)', 'control| forever', '  control| if {key [right arrow] pressed?} then', '    motion| change x by (6)', '  control| if {touching [Rocks]?} then', '    motion| go to x: (-200) y: (-120)'], { sprite: 'Rocketship' }),
        sc('goal', 'The goal', ['events| when green flag clicked', 'control| wait until {touching [Rocketship]?}', 'looks| say [You made it!] for (2) seconds'], { sprite: 'Star' }),
      ],
      checklist: ['The ship moves in four directions', 'It starts at the same place every time', 'Touching an asteroid sends it back', 'Reaching the star shows a message'],
      stretch: 'Make a second level by adding more asteroids close together.',
    },
    homework: {
      name: 'Two-Key Ship',
      instructions: 'Make a simpler game: the ship moves left and right with two keys, and goes back to the start if it touches one asteroid.',
      deliverable: 'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'Use forever with “if key pressed?” for each key.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (3 min)** – Compare a hat-block mover (jerky) with a forever-loop mover (smooth).
2. **Concepts (7 min)** – The game loop; sensing vs events.
3. **Demo (5 min)** – Hold keys in the page demo; ask where the check happens.
4. **Build (28 min)** – Project steps; test after each “if”.
5. **Play (7 min)** – Swap laptops and try each other’s mazes.

## Discussion prompts
- Why does the game loop need to be forever?
- What would happen if the touching check were outside the loop?

## Watch for
- “if” blocks placed outside the forever loop.
- Large step values that jump over asteroids.`,
    video: vid('Game Controls & Movement', 'How does a game know you are pressing a key right now?', 'Build the Asteroid Maze game', {
      hook: ['A spaceship drifts toward a field of asteroids. You press a key, but the ship barely moves.', 'You press a key, but the ship only moves once. Why is this game so hard to steer?', 'Smooth controls!'],
      concept: ['A glowing loop circles the ship, checking four arrow keys again and again, like a heartbeat.', 'A game loop checks the keyboard over and over, many times every second. That is what makes controls smooth.', 'The game loop'],
      explain: ['Inside a forever loop, small if-blocks ask: is the key held? Each yes moves the ship a tiny step.', 'Put an if block inside forever. Ask: is the right arrow pressed? If yes, change x by a small number. Check every key the same way.', 'forever + if key pressed?'],
      demo: ['The ship zigzags past asteroids. It bumps one and zips back to its starting dock.', 'Touch an asteroid and the code sends the ship home. The touching check lives inside the loop too.', 'if touching? go to start'],
      tip: ['A big step number makes the ship jump over a rock; a small number keeps it safe.', 'Tip: use small numbers, like six, so movement feels smooth and nothing is skipped.', 'Small steps'],
      challenge: ['The ship hovers at the start gate as a question mark floats above the keyboard.', 'Which block asks if a key is held down right now? Then build your own Asteroid Maze.', 'Mission: Asteroid Maze'],
    }),
  },

  // ───────────────────────────── 2 · Making Sprites Interact ─────────────────────────────
  {
    course: 2,
    lesson: 2,
    title: 'Making Sprites Interact',
    emoji: '⭐',
    platform: 'SCRATCH',
    mission: {
      hook: 'Games get exciting when sprites notice each other.',
      objective: 'Detect when two sprites touch, and use random positions to make stars fall again and again.',
      badge: 'Star Catcher',
    },
    concepts: [
      concept('🤝', 'Collision detection', '“touching” asks if two sprites are touching.', 'It gives a yes or no answer, so you can put it in an “if” block and react when it is true.'),
      concept('🎲', 'Random positions', '“pick random -200 to 200” gives a different number each time.', 'Use it in “go to x:” so a star appears in a new place every time it falls.'),
      concept('⬇️', 'Falling', '“change y by -6” moves a sprite down a little each loop.', 'A forever loop repeats it, so the sprite keeps falling.'),
      concept('♻️', 'Reset', 'When a star is caught or leaves the Stage, send it back to the top.', 'That way a single star can fall forever. You do not need to make hundreds of stars.'),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Catch the stars',
      intro: 'Press the flag. Move the bowl with the arrow buttons. Catch the falling star!',
      backdrop: 'night',
      keys: ['left arrow', 'right arrow'],
      sprites: [
        { id: 'bowl', emoji: '🥣', label: 'Bowl', x: 0, y: -140 },
        { id: 'star', emoji: '⭐', label: 'Star', x: 0, y: 170 },
      ],
      scripts: [
        { sprite: 'bowl', lines: ['events| when green flag clicked', 'motion| go to x: (0) y: (-140)', 'control| forever', '  control| if {key [left arrow] pressed?} then', '    motion| change x by (-8)', '  control| if {key [right arrow] pressed?} then', '    motion| change x by (8)'] },
        {
          sprite: 'star',
          lines: [
            'events| when green flag clicked',
            'motion| go to x: (0) y: (170)',
            'control| forever',
            '  motion| change y by (-6)',
            '  control| if {touching [Bowl]?} then',
            '    motion| go to x: (pick random (-200) to (200)) y: (170)',
            '  control| if {(y position) < (-170)} then',
            '    motion| go to x: (pick random (-200) to (200)) y: (170)',
          ],
        },
      ],
      hint: 'What brings the star back to the top?',
    },
    examples: [
      sc(
        'fall',
        'A falling star',
        ['events| when green flag clicked', 'motion| go to x: (0) y: (170)', 'control| forever', '  motion| change y by (-6)', '  control| if {touching [Bowl]?} then', '    motion| go to x: (pick random (-200) to (200)) y: (170)'],
        { intro: 'Tap a block to see what it does.', sprite: 'Star', notes: { '2': 'Starts at the top of the Stage.', '4': 'Falls a little each time around the loop.', '5': 'Checks if the bowl caught it.', '6': 'Jumps to a random place at the top.' } },
      ),
    ],
    tips: [
      tip('The top is y: 170', 'The top of the Stage is about y: 170. Start stars there so they fall into view.'),
      mistake('The star never comes back', 'It falls past the bottom and nothing sends it up again.', 'Add an “if y position < -170” block that moves it back to the top.'),
      tip('Use random for surprise', 'A random x makes every fall different, which is more fun to play.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'The star should jump to a different place at the top every time. Which block should go in “go to x: ( ) y: 170”?',
      options: ['pick random (-200) to (200)', 'change y by (-6)', 'touching [Bowl]?', 'wait (1) seconds'],
      answer: 0,
      hint: 'You need a different number each time.',
      explain: '“pick random -200 to 200” gives a new x every time, so the star can start anywhere across the Stage.',
    },
    project: {
      name: 'Catch the Falling Stars',
      goal: 'Stars fall from the sky. Move the bowl to catch them — every catch sends the star back to the top.',
      assets: [
        { name: 'Bowl', costumes: ['Bowl-a'] },
        { name: 'Star', costumes: ['Star'] },
        { name: 'Night City', note: 'Backdrop (or Stars)' },
      ],
      steps: [
        { text: 'Add the Bowl and Star sprites. Choose a backdrop.' },
        { text: 'Bowl: use “forever” with two “if key pressed?” blocks to move left and right.' },
        { text: 'Star: “go to x: 0 y: 170”, then “forever”.' },
        { text: 'Inside the loop, add “change y by -6”.' },
        { text: 'Add “if touching Bowl?” and send the star to a random x at the top.' },
        { text: 'Add a second “if” for when the star falls off the bottom. Test the game!', stack: 'fall' },
      ],
      stacks: [
        sc('fall', 'Falling star', ['events| when green flag clicked', 'motion| go to x: (0) y: (170)', 'control| forever', '  motion| change y by (-6)', '  control| if {touching [Bowl]?} then', '    motion| go to x: (pick random (-200) to (200)) y: (170)', '  control| if {(y position) < (-170)} then', '    motion| go to x: (pick random (-200) to (200)) y: (170)'], { sprite: 'Star' }),
      ],
      checklist: ['The star falls from the top', 'The bowl moves left and right', 'A caught star returns to the top', 'A missed star also returns to the top'],
      stretch: 'Make the star fall faster by changing -6 to -9.',
    },
    homework: {
      name: 'One Falling Star',
      instructions: 'Make a simpler game with one star that falls, and a bowl that follows the arrow keys. When the star touches the bowl, it goes back to the top.',
      deliverable: 'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'You can skip the “fell off the bottom” check for this version.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (3 min)** – Toss a paper “star” into a bin: “How does the computer know I caught it?”
2. **Concepts (7 min)** – touching = yes/no question.
3. **Demo (5 min)** – Catch and miss in the page demo.
4. **Build (28 min)** – Project steps; check the star resets.
5. **Play (7 min)** – Swap and play.

## Discussion prompts
- Which block answers a yes/no question?
- Why do we need two ways to reset the star?

## Watch for
- The “if” blocks outside the forever loop.
- Star speed too high to catch.`,
    video: vid('Making Sprites Interact', 'How does a game know when two things touch?', 'Build the Catch the Falling Stars game', {
      hook: ['A glowing star tumbles through the night. A bowl waits below. The star drops right through it.', 'The star fell right through the bowl! The game did not notice. How do we make sprites aware of each other?', 'Make them notice!'],
      concept: ['A glowing outline appears around the bowl and the star as they overlap, and a green tick pops up.', 'Touching is a question the computer asks: are these two sprites touching? The answer is yes or no.', 'touching = yes / no'],
      explain: ['An if block holds the touching question. When it says yes, a small action runs. Random dice spin above.', 'Put touching inside an if block. If yes, send the star back to the top at a random x so every fall is different.', 'if touching → random x'],
      demo: ['The bowl slides under the star. Pop! The star jumps to the top at a new place.', 'Catch the star and it returns to the top somewhere new. Miss it, and it also resets. The game never ends.', 'pick random -200 to 200'],
      tip: ['A star slips off the bottom and vanishes; a loop arrow sends it back.', 'Tip: always check for the star falling off the bottom, so it can come back.', 'Reset the star'],
      challenge: ['Pixel holds up four blocks and a dice icon.', 'Which block gives a different x every time? Then build your own Catch the Falling Stars game.', 'Mission: Catch the Stars'],
    }),
  },

  // ───────────────────────────── 3 · Keeping Score! ─────────────────────────────
  {
    course: 2,
    lesson: 3,
    title: 'Keeping Score!',
    emoji: '🏆',
    platform: 'SCRATCH',
    mission: {
      hook: 'A score turns “playing” into “winning”.',
      objective: 'Use a variable to count stars caught and show the score on the Stage.',
      badge: 'Score Keeper',
    },
    concepts: [
      concept('📦', 'Variables', 'A variable is a labelled box that stores a number or word.', 'You choose its name, like “score”. The box keeps its value while the game runs.'),
      concept('0️⃣', 'Set to zero', '“set score to 0” empties the box at the start of the game.', 'Without it, the score from your last game would still be there.'),
      concept('➕', 'Change by', '“change score by 1” adds one every time you catch a star.', 'Use a negative number, like -1, to take points away.'),
      concept('📺', 'Show the score', 'A tick box next to the variable shows it on the Stage.', 'Players can see how well they are doing. You can also use “show variable” and “hide variable”.'),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Collect and count',
      intro: 'Move the bowl to catch stars and watch the score grow.',
      backdrop: 'night',
      keys: ['left arrow', 'right arrow'],
      sprites: [
        { id: 'bowl', emoji: '🥣', label: 'Bowl', x: 0, y: -140 },
        { id: 'star', emoji: '⭐', label: 'Star', x: 40, y: 170 },
      ],
      scripts: [
        { sprite: 'bowl', lines: ['events| when green flag clicked', 'motion| go to x: (0) y: (-140)', 'control| forever', '  control| if {key [left arrow] pressed?} then', '    motion| change x by (-8)', '  control| if {key [right arrow] pressed?} then', '    motion| change x by (8)'] },
        {
          sprite: 'star',
          lines: [
            'events| when green flag clicked',
            'variables| set [score] to (0)',
            'control| forever',
            '  motion| change y by (-6)',
            '  control| if {touching [Bowl]?} then',
            '    variables| change [score] by (1)',
            '    sound| start sound [collect]',
            '    motion| go to x: (pick random (-200) to (200)) y: (170)',
            '  control| if {(y position) < (-170)} then',
            '    motion| go to x: (pick random (-200) to (200)) y: (170)',
          ],
        },
      ],
      hint: 'Where does the score go back to zero?',
    },
    examples: [
      sc(
        'score',
        'Count the stars',
        ['events| when green flag clicked', 'variables| set [score] to (0)', 'control| forever', '  motion| change y by (-6)', '  control| if {touching [Bowl]?} then', '    variables| change [score] by (1)', '    sound| start sound [collect]', '    motion| go to x: (pick random (-200) to (200)) y: (170)'],
        { intro: 'Tap a block to see what it does.', sprite: 'Star', notes: { '2': 'Starts every game with a score of zero.', '6': 'Adds one point for each catch.', '7': 'A little sound makes catching feel good.' } },
      ),
    ],
    tips: [
      tip('Pick a clear name', 'Name your variable “score”, not “thing”. Clear names make code easier to read.'),
      mistake('The score keeps going up between games', 'You forgot to set the score to 0 when the game starts.', 'Add “set score to 0” right after the hat block.'),
      tip('Make it for all sprites', 'When you make a variable, choose “For all sprites” so every sprite can use it.'),
    ],
    challenge: {
      kind: 'order',
      prompt: 'Put these blocks in order so the game starts at zero and adds a point when the star touches the bowl.',
      language: 'scratch',
      lines: ['events| when green flag clicked', 'variables| set [score] to (0)', 'variables| change [score] by (1)'],
      hint: 'Start the game, reset the score, then change it.',
      explain: 'First the hat block, then “set score to 0” so you begin at zero. “Change score by 1” runs later, each time you catch a star.',
    },
    project: {
      name: 'Star Collector',
      goal: 'Catch stars to score points. A sound plays on every catch.',
      assets: [
        { name: 'Bowl', costumes: ['Bowl-a'] },
        { name: 'Star', note: 'It has a “collect” sound' },
      ],
      steps: [
        { text: 'Open your Catch the Falling Stars project, or start a new one with a Bowl and a Star.' },
        { text: 'Go to Variables. Click “Make a Variable”, name it score, choose “For all sprites”.' },
        { text: 'On the Star, add “set score to 0” right after the hat block.' },
        { text: 'Inside “if touching Bowl?”, add “change score by 1”.' },
        { text: 'Add “start sound collect” so every catch plays a sound.' },
        { text: 'Tick the box next to score so it shows on the Stage. Play and beat your best!', stack: 'score' },
      ],
      stacks: [
        sc('score', 'Score and sound', ['events| when green flag clicked', 'variables| set [score] to (0)', 'control| forever', '  motion| change y by (-6)', '  control| if {touching [Bowl]?} then', '    variables| change [score] by (1)', '    sound| start sound [collect]', '    motion| go to x: (pick random (-200) to (200)) y: (170)'], { sprite: 'Star' }),
      ],
      checklist: ['A score is shown on the Stage', 'It starts at 0', 'It goes up by 1 on every catch', 'A sound plays on every catch'],
      stretch: 'Add a second variable called misses and add 1 when a star falls off the bottom.',
    },
    homework: {
      name: 'Count Five',
      instructions: 'Add a score to your game. When the score reaches 5, the bowl says “You win!”.',
      deliverable: 'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'Use “wait until score = 5”, then “say You win!”.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (3 min)** – “How does a game remember your points?” Draw a box on the board.
2. **Concepts (7 min)** – The variable box: name + value.
3. **Demo (5 min)** – Watch the score tick up.
4. **Build (28 min)** – Project steps; check “For all sprites”.
5. **Challenge (7 min)** – Learners try for 10 points and compare.

## Discussion prompts
- What would happen without “set score to 0”?
- What else could a variable remember?

## Watch for
- Making the variable “For this sprite only”.
- Score displayed on the Stage covering the action.`,
    video: vid('Keeping Score!', 'How does a game remember how well you are doing?', 'Build the Star Collector game', {
      hook: ['A star drops into a bowl. Nothing else happens. No points, no cheer, no sound.', 'You caught the star! But the game did not tell you anything. Where are my points?', 'Count the points!'],
      concept: ['A labelled box named score floats on screen, with a number inside.', 'A variable is a labelled box that stores a number. In this game, the box is named score.', 'A variable is a box'],
      explain: ['The score box fills with zero. Each catch adds a coin and the number ticks up. A sound pops.', 'Set score to zero at the start. Then change score by one, every time a star is caught. The number grows.', 'set · change by'],
      demo: ['The bowl slides left and right, catching stars as the score rises from zero to five.', 'Each star adds one point and plays a sound. You can see your score on the Stage.', 'change score by 1'],
      tip: ['The score box still says seven from the last game; a reset button sets it to zero.', 'Tip: set the score to zero at the start, or your last game score stays.', 'set score to 0'],
      challenge: ['Pixel holds three blocks up and a trophy glows at five points.', 'Put the blocks in order: start, set score to zero, then change by one. Then build your own Star Collector.', 'Mission: Star Collector'],
    }),
  },

  // ───────────────────────────── 4 · Making Decisions with Code ─────────────────────────────
  {
    course: 2,
    lesson: 4,
    title: 'Making Decisions with Code',
    emoji: '🗝️',
    platform: 'SCRATCH',
    mission: {
      hook: 'A game feels smart when it makes decisions.',
      objective: 'Use if / else, comparisons and AND / OR to decide if the player can escape.',
      badge: 'Master Escapist',
    },
    concepts: [
      concept('🔀', 'If and else', '“if … then … else” picks one of two paths.', 'If the question is true, the first path runs. If it is false, the else path runs instead.'),
      concept('⚖️', 'Comparisons', 'Compare numbers with =, < and >.', '“hasKey = 1” is true only when hasKey is exactly 1. “score > 5” is true when the score is bigger than 5.'),
      concept('🔗', 'AND and OR', '“and” needs both to be true. “or” needs just one.', 'Use “and” when two things must happen together, like touching the exit AND having the key.'),
      concept('🚩', 'A flag variable', 'A variable can remember a yes (1) or no (0).', 'Set hasKey to 1 when the player gets the keycard. Check it later at the exit.'),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Find the keycard',
      intro: 'Move Giga to the exit first — it is locked! Then get the keycard and try again.',
      backdrop: 'space',
      keys: ['right arrow', 'left arrow', 'up arrow', 'down arrow'],
      sprites: [
        { id: 'giga', emoji: '👽', label: 'Giga', x: -180, y: -100 },
        { id: 'key', emoji: '🔑', label: 'Key', x: 0, y: 100 },
        { id: 'ship', emoji: '🚀', label: 'Rocketship', x: 180, y: -100 },
      ],
      scripts: [
        {
          sprite: 'giga',
          lines: [
            'events| when green flag clicked',
            'variables| set [hasKey] to (0)',
            'control| forever',
            '  control| if {key [right arrow] pressed?} then',
            '    motion| change x by (6)',
            '  control| if {key [left arrow] pressed?} then',
            '    motion| change x by (-6)',
            '  control| if {key [up arrow] pressed?} then',
            '    motion| change y by (6)',
            '  control| if {key [down arrow] pressed?} then',
            '    motion| change y by (-6)',
            '  control| if {touching [Key]?} then',
            '    variables| set [hasKey] to (1)',
          ],
        },
        {
          sprite: 'ship',
          lines: [
            'events| when green flag clicked',
            'control| forever',
            '  control| if {touching [Giga]?} then',
            '    control| if {(hasKey) = (1)} then',
            '      looks| say [Escaped!] for (2) seconds',
            '      control| stop [all]',
            '    control| else',
            '      looks| say [Locked! Find the keycard.] for (1) seconds',
          ],
        },
      ],
      hint: 'What is hasKey when the game starts?',
    },
    examples: [
      sc(
        'exit',
        'The locked exit',
        ['events| when green flag clicked', 'control| forever', '  control| if {touching [Giga]?} then', '    control| if {(hasKey) = (1)} then', '      looks| say [Escaped!] for (2) seconds', '      control| stop [all]', '    control| else', '      looks| say [Locked! Find the keycard.] for (1) seconds'],
        { intro: 'Tap a block to see what it does.', sprite: 'Rocketship', notes: { '3': 'Checks if the player reached the exit.', '4': 'Asks: does the player have the key?', '5': 'If yes, the player escapes.', '7': 'Otherwise the exit stays locked.' } },
      ),
    ],
    tips: [
      tip('One equals sign', 'In Scratch, “=” compares two things. It is a question, not an instruction.'),
      mistake('The exit opens without the key', 'hasKey was never set back to 0 at the start, or you compared with the wrong number.', 'Set hasKey to 0 when the green flag is clicked, and check “hasKey = 1”.'),
      tip('Else is the other path', '“else” runs only when the “if” question is false. You do not need to ask it twice.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'Giga touches the exit and hasKey = 0. Which path runs?',
      code: { language: 'scratch', lines: ['control| if {(hasKey) = (1)} then', '  looks| say [Escaped!] for (2) seconds', 'control| else', '  looks| say [Locked!] for (2) seconds'] },
      options: ['The else path: “Locked!”', 'The first path: “Escaped!”', 'Both paths run', 'Neither path runs'],
      answer: 0,
      hint: 'Is hasKey = 1 true when hasKey is 0?',
      explain: 'The question “hasKey = 1” is false when hasKey is 0, so the else path runs and the exit stays locked.',
    },
    project: {
      name: 'Keycard Escape',
      goal: 'Find the keycard, then reach the escape rocket. Without the keycard, the exit stays locked.',
      assets: [
        { name: 'Giga', costumes: ['Giga-a'] },
        { name: 'Key', costumes: ['Key'] },
        { name: 'Rocketship', costumes: ['Rocketship-a'], note: 'The escape rocket' },
      ],
      steps: [
        { text: 'Add Giga, Key and Rocketship. Place them far apart. Make a variable called hasKey.' },
        { text: 'Giga: start with “set hasKey to 0”, then use forever with arrow key checks to move.' },
        { text: 'Inside forever, add “if touching Key?” and “set hasKey to 1”.' },
        { text: 'Rocketship: forever, then “if touching Giga?”.' },
        { text: 'Inside it, add “if hasKey = 1” with “say Escaped!” and “stop all”, then an “else” that says Locked!.' },
        { text: 'Test: try the exit first, then get the key. Both paths should work!', stack: 'exit' },
      ],
      stacks: [
        sc('key', 'Collect the key', ['events| when green flag clicked', 'variables| set [hasKey] to (0)', 'control| forever', '  control| if {touching [Key]?} then', '    variables| set [hasKey] to (1)'], { sprite: 'Giga' }),
        sc('exit', 'The exit', ['events| when green flag clicked', 'control| forever', '  control| if {touching [Giga]?} then', '    control| if {(hasKey) = (1)} then', '      looks| say [Escaped!] for (2) seconds', '      control| stop [all]', '    control| else', '      looks| say [Locked! Find the keycard.] for (1) seconds'], { sprite: 'Rocketship' }),
      ],
      checklist: ['Without the key, the exit says Locked!', 'Touching the key sets hasKey to 1', 'With the key, the exit says Escaped!', 'I tested both paths'],
      stretch: 'Use “and” so the key only counts when the game is not over yet.',
    },
    homework: {
      name: 'Simple Lock',
      instructions: 'Make a smaller game with one lock and one key. If the player has the key at the exit, say “Open!”. If not, say “Locked!”.',
      deliverable: 'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'You need one variable and one if/else.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (3 min)** – Role-play: a learner “guards” a door and asks, “Do you have the key?”.
2. **Concepts (7 min)** – if/else tree; comparisons; and/or.
3. **Demo (5 min)** – Try the exit with and without the key.
4. **Build (28 min)** – Project steps; learners test both paths.
5. **Reflect (7 min)** – “What other decisions could a game make?”

## Discussion prompts
- When is an “else” useful?
- How is “and” different from “or”?

## Watch for
- else placed under the wrong if.
- hasKey not reset at the start.`,
    video: vid('Making Decisions with Code', 'How does a game decide what happens next?', 'Build the Keycard Escape game', {
      hook: ['An alien runs to a glowing exit and bumps into a locked door. The door stays shut.', 'The alien reached the exit, but the door will not open. What is the game checking?', 'Break the lock!'],
      concept: ['A path splits in two like a road sign. One arrow says yes, one says no.', 'An if else block makes a decision. If something is true, one thing happens. Otherwise, something else does.', 'if / else'],
      explain: ['A scale compares two numbers. A key icon sets a flag to one. An and-gate needs both lights on.', 'Compare with equals, less than and greater than. A variable can remember a one for yes. And needs both true.', 'hasKey = 1 ?'],
      demo: ['The alien tries the exit and sees Locked. It grabs the key, tries again, and the door slides open.', 'Without the key the else path says locked. With the key, the first path says escaped.', 'else: Locked!'],
      tip: ['A flag still says one from the last game; a reset arrow sets it to zero.', 'Tip: set your key flag back to zero at the start of every game.', 'Reset hasKey'],
      challenge: ['Pixel holds up a key and asks what happens if hasKey is zero.', 'If hasKey is zero at the exit, which path runs? Then build your own Keycard Escape.', 'Mission: Keycard Escape'],
    }),
  },

  // ───────────────────────────── 5 · Randomness & Game Challenges ─────────────────────────────
  {
    course: 2,
    lesson: 5,
    title: 'Randomness & Game Challenges',
    emoji: '🎁',
    platform: 'SCRATCH',
    mission: {
      hook: 'A little luck makes every game different.',
      objective: 'Use pick random with if / else to build a prize machine that surprises the player.',
      badge: 'Prize Master',
    },
    concepts: [
      concept('🎲', 'Random numbers', '“pick random 1 to 3” gives 1, 2 or 3 — you never know which.', 'Every time the block runs it makes a new choice, like rolling a dice.'),
      concept('📦', 'Remember the roll', 'Store the number in a variable so you can use it again.', 'If you pick random twice, you could get two different numbers. A variable keeps one roll.'),
      concept('🪜', 'A chain of choices', 'Use if / else inside else to check one number after another.', 'If it is 1, do this. Else if it is 2, do that. Else, do the last thing.'),
      concept('⚖️', 'Fair challenges', 'Randomness makes a game fair and surprising.', 'Good games mix skill and luck, so the player never knows exactly what will happen.'),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Click the machine',
      intro: 'Click the gift machine and see which prize you get. Try it a few times!',
      backdrop: 'night',
      sprites: [{ id: 'gift', emoji: '🎁', label: 'Gift', x: 0, y: -20 }],
      scripts: [
        {
          sprite: 'gift',
          lines: [
            'events| when this sprite clicked',
            'variables| set [prize] to (pick random (1) to (3))',
            'control| if {(prize) = (1)} then',
            '  looks| say [A shiny crystal!] for (2) seconds',
            'control| else',
            '  control| if {(prize) = (2)} then',
            '    looks| say [A space puppy!] for (2) seconds',
            '  control| else',
            '    looks| say [A golden star!] for (2) seconds',
          ],
        },
      ],
      hint: 'What number gives the golden star?',
    },
    examples: [
      sc(
        'prize',
        'Pick a prize',
        ['events| when this sprite clicked', 'variables| set [prize] to (pick random (1) to (3))', 'control| if {(prize) = (1)} then', '  looks| say [A shiny crystal!] for (2) seconds', 'control| else', '  control| if {(prize) = (2)} then', '    looks| say [A space puppy!] for (2) seconds', '  control| else', '    looks| say [A golden star!] for (2) seconds'],
        { intro: 'Tap a block to see what it does.', sprite: 'Gift', notes: { '2': 'Rolls a number from 1 to 3 and keeps it in the prize variable.', '3': 'If it is 1…', '5': '…otherwise check the next number.', '8': 'Anything left over is a 3.' } },
      ),
    ],
    tips: [
      tip('Roll once', 'Save the random number in a variable. Then every if checks the same roll.'),
      mistake('Two prizes show up at once', 'The ifs are not connected with else, so more than one can run.', 'Use else to link them so exactly one path runs.'),
      tip('Test many times', 'Click your machine 10 times. Do you see every prize? That is how you test random code.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'You want a random number from 1 to 6, like a dice. Which block do you use?',
      options: ['pick random (1) to (6)', 'change [prize] by (6)', 'repeat (6)', 'wait (6) seconds'],
      answer: 0,
      hint: 'It has a first number and a last number.',
      explain: '“pick random 1 to 6” chooses a whole number between 1 and 6 each time it runs, just like rolling a dice.',
    },
    project: {
      name: 'Mystery Prize Machine',
      goal: 'Click the machine to win a surprise prize: a crystal, a space puppy or a golden star.',
      assets: [
        { name: 'Gift', costumes: ['Gift-a', 'Gift-b'], note: 'The prize machine' },
        { name: 'Crystal', costumes: ['Crystal-a', 'Crystal-b'], note: 'Optional: prize pictures' },
        { name: 'Puppy', note: 'Optional: prize pictures' },
        { name: 'Star', note: 'Optional: prize pictures' },
      ],
      steps: [
        { text: 'Add the Gift sprite and a backdrop. Make a variable called prize.' },
        { text: 'Start with “when this sprite clicked”.' },
        { text: 'Add “set prize to pick random 1 to 3”.' },
        { text: 'Add an “if prize = 1” that says A shiny crystal!. Add an else.' },
        { text: 'Inside the else, add another if/else for prize = 2 (space puppy) and prize 3 (golden star).' },
        { text: 'Click the machine ten times. Do all the prizes appear?', stack: 'prize' },
      ],
      stacks: [
        sc('prize', 'Prize machine', ['events| when this sprite clicked', 'variables| set [prize] to (pick random (1) to (3))', 'control| if {(prize) = (1)} then', '  looks| say [A shiny crystal!] for (2) seconds', 'control| else', '  control| if {(prize) = (2)} then', '    looks| say [A space puppy!] for (2) seconds', '  control| else', '    looks| say [A golden star!] for (2) seconds'], { sprite: 'Gift' }),
      ],
      checklist: ['The machine gives different prizes', 'Only one prize shows each click', 'I clicked many times to test it', 'I wrote my own prize messages'],
      stretch: 'Add a fourth prize by changing random to 1 to 4 and adding another else.',
    },
    homework: {
      name: 'Coin Flip',
      instructions: 'Make a simpler machine with only two outcomes: Heads or Tails. Use pick random 1 to 2.',
      deliverable: 'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'You only need one if / else.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (3 min)** – Roll a real dice; “can you predict the next roll?”.
2. **Concepts (7 min)** – Random number, variable, else-chain.
3. **Demo (5 min)** – Click the page demo a few times.
4. **Build (28 min)** – Project steps; test ten times.
5. **Share (7 min)** – Learners swap and try to guess each other’s prizes.

## Discussion prompts
- Why save the random number in a variable?
- How many times should you test random code?

## Watch for
- else missing between ifs.
- Random range not matching the number of prizes.`,
    video: vid('Randomness & Game Challenges', 'How do games surprise you every time?', 'Build the Mystery Prize Machine', {
      hook: ['A glowing prize machine hums. Three mystery boxes shuffle behind its glass.', 'Click, and a surprise pops out. But which one? Even the computer does not know yet!', 'A surprise!'],
      concept: ['A dice rolls and lands on a number. Arrows lead from the number to three different prizes.', 'Pick random chooses a number for you. You write what happens for each number.', 'pick random'],
      explain: ['The rolled number is stored in a prize box. A chain of if-else gates checks one, then two, then three.', 'Store the roll in a variable. Then ask: is it one? If not, is it two? If not, it must be three.', 'if → else → else'],
      demo: ['The alien clicks the machine three times and gets a crystal, a puppy, then a star.', 'Click once for a crystal. Click again for a puppy. The same code gives different results every time.', 'Click for a prize'],
      tip: ['Two prizes pop out at once; an else link joins the gates.', 'Tip: connect your choices with else, so only one prize appears each time. Test it many times.', 'Use else'],
      challenge: ['A dice floats and Pixel asks how to roll one to six.', 'Which block rolls a number from one to six? Then build your own Mystery Prize Machine.', 'Mission: Prize Machine'],
    }),
  },

  // ───────────────────────────── 6 · Timers, Lives & Survival ─────────────────────────────
  {
    course: 2,
    lesson: 6,
    title: 'Timers, Lives & Survival',
    emoji: '☄️',
    platform: 'SCRATCH',
    mission: {
      hook: 'Lives and a countdown make every move matter.',
      objective: 'Use a timer and a lives variable to build a survival game.',
      badge: 'Survivor',
    },
    concepts: [
      concept('⏱️', 'The timer', '“timer” counts the seconds since the game started.', 'Use “reset timer” when the game begins so it always starts at 0.'),
      concept('❤️', 'Lives', 'Lives are a variable. Start with 3. Lose one when you get hit.', '“change lives by -1” takes one life away. You can show hearts, or just the number.'),
      concept('☠️', 'Game over', 'When lives reach 0, the game is over.', 'Check “lives < 1” inside the loop. Then say Game over and use “stop all”.'),
      concept('🏁', 'Winning', 'You win by surviving long enough.', 'Check “timer > 20”. If the player is still alive when the timer reaches 20, they win.'),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Dodge the meteors',
      intro: 'Move the rocket with the arrow buttons. Do not get hit three times!',
      backdrop: 'space',
      keys: ['left arrow', 'right arrow'],
      sprites: [
        { id: 'ship', emoji: '🚀', label: 'Rocketship', x: 0, y: -130 },
        { id: 'rock', emoji: '☄️', label: 'Rocks', x: 40, y: 170 },
      ],
      scripts: [
        { sprite: 'ship', lines: ['events| when green flag clicked', 'variables| set [lives] to (3)', 'sensing| reset timer', 'control| forever', '  control| if {key [left arrow] pressed?} then', '    motion| change x by (-8)', '  control| if {key [right arrow] pressed?} then', '    motion| change x by (8)'] },
        {
          sprite: 'rock',
          lines: [
            'events| when green flag clicked',
            'control| forever',
            '  motion| change y by (-6)',
            '  control| if {touching [Rocketship]?} then',
            '    variables| change [lives] by (-1)',
            '    motion| go to x: (pick random (-200) to (200)) y: (170)',
            '  control| if {(y position) < (-170)} then',
            '    motion| go to x: (pick random (-200) to (200)) y: (170)',
            '  control| if {(lives) < (1)} then',
            '    looks| say [Game over!] for (2) seconds',
            '    control| stop [all]',
          ],
        },
      ],
      hint: 'What happens to lives when the rocket is hit?',
    },
    examples: [
      sc(
        'lives',
        'Lives and game over',
        ['events| when green flag clicked', 'variables| set [lives] to (3)', 'sensing| reset timer', 'control| forever', '  control| if {touching [Rocks]?} then', '    variables| change [lives] by (-1)', '  control| if {(lives) < (1)} then', '    looks| say [Game over!] for (2) seconds', '    control| stop [all]'],
        { intro: 'Tap a block to see what it does.', sprite: 'Rocketship', notes: { '2': 'Start with three lives.', '3': 'Start the timer from 0.', '6': 'One life lost when hit.', '7': 'Checks if the lives ran out.', '9': 'Ends the game.' } },
      ),
    ],
    tips: [
      tip('Tell the player', 'Show lives and time on the Stage by ticking their boxes. Players love to see them.'),
      mistake('A hit takes away lots of lives', 'The meteor is still touching the rocket in the next loop, so it hits again.', 'Move the meteor back to the top right after the hit.'),
      tip('Test the win', 'Change 20 to 5 while you test so you can see the win message quickly.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'You want the game to end when the player has no lives left. Which check is right?',
      options: ['if {(lives) < (1)} then … stop [all]', 'if {(timer) > (20)} then … change [lives] by (1)', 'forever … wait (1) seconds', 'set [lives] to (3)'],
      answer: 0,
      hint: 'No lives left means lives is smaller than 1.',
      explain: '“lives < 1” is true when lives is 0, so the game stops. The other choices do not end the game.',
    },
    project: {
      name: 'Meteor Dodge',
      goal: 'Dodge falling meteors for 20 seconds. You have three lives — lose them all and it is game over!',
      assets: [
        { name: 'Rocketship', costumes: ['Rocketship-a'] },
        { name: 'Rocks', costumes: ['Rocks'], note: 'The meteor' },
        { name: 'Space', note: 'Backdrop' },
      ],
      steps: [
        { text: 'Add the Rocketship, the Rocks and a space backdrop. Make a variable called lives.' },
        { text: 'Rocketship: “set lives to 3”, “reset timer”, then forever with left/right key checks.' },
        { text: 'Rocks: forever, “change y by -6”, and reset it to the top when it leaves the Stage.' },
        { text: 'Add “if touching Rocketship?” with “change lives by -1” and a reset to the top.' },
        { text: 'Add “if lives < 1” to say Game over! and use “stop all”.' },
        { text: 'Add “if timer > 20” to say You survived! and stop. Test your game!', stack: 'lives' },
      ],
      stacks: [
        sc('lives', 'Lives and timer', ['events| when green flag clicked', 'variables| set [lives] to (3)', 'sensing| reset timer', 'control| forever', '  control| if {(lives) < (1)} then', '    looks| say [Game over!] for (2) seconds', '    control| stop [all]', '  control| if {(timer) > (20)} then', '    looks| say [You survived!] for (2) seconds', '    control| stop [all]'], { sprite: 'Rocketship' }),
      ],
      checklist: ['I start with 3 lives', 'A hit takes away 1 life', 'Zero lives means Game over', 'Surviving 20 seconds wins'],
      stretch: 'Add a second meteor by duplicating the Rocks sprite.',
    },
    homework: {
      name: 'Three Lives',
      instructions: 'Make a simpler game: a falling rock, a rocket and 3 lives. When lives reach 0, say Game over!.',
      deliverable: 'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'Skip the timer for this version.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (3 min)** – “What is the best part of a game with lives?” Collect answers.
2. **Concepts (7 min)** – timer vs. variables; game over check.
3. **Demo (5 min)** – Lose all three lives on purpose.
4. **Build (28 min)** – Project steps; test the win with a shorter timer.
5. **Play (7 min)** – Learners try each other’s survival games.

## Discussion prompts
- Why check lives inside the forever loop?
- How could you make the game harder?

## Watch for
- Meteor hitting several times in a row.
- Timer not reset at the start.`,
    video: vid('Timers, Lives & Survival', 'What makes a game exciting to survive?', 'Build the Meteor Dodge game', {
      hook: ['Meteors rain down on a tiny rocket. A countdown ticks louder with every second.', 'Meteors are coming! You have three lives and twenty seconds. Can you survive?', 'Survive!'],
      concept: ['A stopwatch spins beside three glowing hearts at the corner of the screen.', 'A timer counts seconds. Lives are a variable. Together they make a game exciting and fair.', 'timer + lives'],
      explain: ['A hit makes one heart crack and the lives number drop. At zero, a red game over banner slides in.', 'Reset the timer at the start. Change lives by minus one on a hit. If lives are less than one, say game over and stop.', 'lives < 1 → stop all'],
      demo: ['The rocket dodges, gets hit once, dodges again, and the timer passes twenty with a win.', 'Dodge the meteors. If one hits, you lose a life. Survive twenty seconds and you win!', 'timer > 20'],
      tip: ['One meteor hits again and again; a reset arrow moves it away after the hit.', 'Tip: send the meteor back to the top after a hit, so one hit takes only one life.', 'Reset after a hit'],
      challenge: ['The rocket holds up a life check block and a question mark.', 'Which check ends the game when you run out of lives? Then build your own Meteor Dodge.', 'Mission: Meteor Dodge'],
    }),
  },

  // ───────────────────────────── 7 · Multiple Levels & Game Scenes ─────────────────────────────
  {
    course: 2,
    lesson: 7,
    title: 'Multiple Levels & Game Scenes',
    emoji: '🪐',
    platform: 'SCRATCH',
    mission: {
      hook: 'Big games are made of many small levels.',
      objective: 'Use broadcasts, backdrops and variables to build a three-level space mission.',
      badge: 'Mission Designer',
    },
    concepts: [
      concept('🌌', 'Backdrops as scenes', 'Each level can have its own backdrop.', '“switch backdrop to Galaxy” changes the whole scene, so the player feels like they moved on.'),
      concept('📣', 'Broadcasts', '“broadcast level 2” sends a message to every sprite.', 'Any sprite with “when I receive level 2” hears it and reacts.'),
      concept('🎚️', 'Level variables', 'A variable such as “speed” can change with each level.', 'Higher speed makes the next level harder.'),
      concept('⏳', 'Wait until', '“wait until score = 5” pauses a script until it becomes true.', 'It is a neat way to wait for the player to reach a goal.'),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Level up!',
      intro: 'Catch stars with the bowl. At 3 points, the level changes!',
      backdrop: 'space',
      keys: ['left arrow', 'right arrow'],
      sprites: [
        { id: 'bowl', emoji: '🥣', label: 'Bowl', x: 0, y: -140 },
        { id: 'star', emoji: '⭐', label: 'Star', x: 30, y: 170 },
      ],
      scripts: [
        { sprite: 'bowl', lines: ['events| when green flag clicked', 'control| forever', '  control| if {key [left arrow] pressed?} then', '    motion| change x by (-8)', '  control| if {key [right arrow] pressed?} then', '    motion| change x by (8)'] },
        {
          sprite: 'star',
          lines: [
            'events| when green flag clicked',
            'variables| set [score] to (0)',
            'variables| set [speed] to (4)',
            'control| forever',
            '  motion| change y by ((speed) * (-1))',
            '  control| if {touching [Bowl]?} then',
            '    variables| change [score] by (1)',
            '    motion| go to x: (pick random (-200) to (200)) y: (170)',
            '  control| if {(y position) < (-170)} then',
            '    motion| go to x: (pick random (-200) to (200)) y: (170)',
          ],
        },
        { sprite: 'star', lines: ['events| when green flag clicked', 'control| wait until {(score) = (3)}', 'events| broadcast [level 2]', 'control| wait until {(score) = (6)}', 'events| broadcast [level 3]'] },
        { sprite: 'star', lines: ['events| when I receive [level 2]', 'looks| switch backdrop to [Galaxy]', 'variables| set [speed] to (7)'] },
        { sprite: 'star', lines: ['events| when I receive [level 3]', 'looks| switch backdrop to [Nebula]', 'variables| set [speed] to (10)'] },
      ],
      hint: 'What does the star do when it hears “level 2”?',
    },
    examples: [
      sc(
        'levels',
        'Level messages',
        ['events| when green flag clicked', 'control| wait until {(score) = (5)}', 'events| broadcast [level 2]', 'events| when I receive [level 2]', 'looks| switch backdrop to [Galaxy]', 'variables| set [speed] to (7)'],
        { intro: 'Tap a block to see what it does.', sprite: 'Star', notes: { '2': 'Waits here until the score reaches 5.', '3': 'Sends the “level 2” message to all sprites.', '4': 'Any sprite can listen for the message.', '5': 'A new scene for the new level.', '6': 'Things fall faster in level 2.' } },
      ),
    ],
    tips: [
      tip('Name messages clearly', 'Use “level 2” and “level 3”. Clear names stop you getting lost.'),
      mistake('A level never starts', 'The message in “broadcast” does not match “when I receive”.', 'Check the spelling. They must be exactly the same.'),
      tip('Plan the levels', 'Write down what changes in each level: backdrop, speed and goal.'),
    ],
    challenge: {
      kind: 'order',
      prompt: 'Put the blocks in order to start level 2 when the score reaches 5.',
      language: 'scratch',
      lines: ['events| when green flag clicked', 'control| wait until {(score) = (5)}', 'events| broadcast [level 2]'],
      hint: 'The script must wait for the score before it sends the message.',
      explain: 'The script starts with the flag, waits until the score is 5, and only then broadcasts level 2.',
    },
    project: {
      name: 'Space Mission: Three Levels',
      goal: 'A star-catching mission with three levels. Each level has a new backdrop and falls faster!',
      assets: [
        { name: 'Bowl', costumes: ['Bowl-a'] },
        { name: 'Star', costumes: ['Star'] },
        { name: 'Stars', note: 'Level 1 backdrop' },
        { name: 'Galaxy', note: 'Level 2 backdrop' },
        { name: 'Nebula', note: 'Level 3 backdrop' },
      ],
      steps: [
        { text: 'Start with your Star Collector game. Add the backdrops Stars, Galaxy and Nebula. Make variables score and speed.' },
        { text: 'Change the star to fall by speed: “change y by speed × -1”, and start with “set speed to 4”.' },
        { text: 'Make a new script: “wait until score = 5”, then “broadcast level 2”.' },
        { text: 'Add “wait until score = 10”, then “broadcast level 3”.' },
        { text: 'Make two “when I receive” scripts. Each switches the backdrop and sets a higher speed.' },
        { text: 'Test all three levels. Add a Win message at the end!', stack: 'levels' },
      ],
      stacks: [
        sc('levels', 'Levels', ['events| when green flag clicked', 'variables| set [speed] to (4)', 'control| wait until {(score) = (5)}', 'events| broadcast [level 2]', 'control| wait until {(score) = (10)}', 'events| broadcast [level 3]'], { sprite: 'Star' }),
        sc('scenes', 'Scenes', ['events| when I receive [level 2]', 'looks| switch backdrop to [Galaxy]', 'variables| set [speed] to (7)', 'events| when I receive [level 3]', 'looks| switch backdrop to [Nebula]', 'variables| set [speed] to (10)'], { sprite: 'Star' }),
      ],
      checklist: ['Level 1 uses the Stars backdrop', 'Level 2 starts at score 5 with a new backdrop', 'Level 3 starts at score 10 and is faster', 'The messages match exactly'],
      stretch: 'Add a “You win!” message when the score reaches 15.',
    },
    homework: {
      name: 'Two Levels',
      instructions: 'Make a simpler game with only two levels. Change the backdrop and the speed when the score reaches 3.',
      deliverable: 'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'Use one broadcast and one “when I receive”.',
    },
    teacherNotes: `## Class flow (about 50 min)
1. **Hook (3 min)** – Show a short clip idea: “level 1, level 2”. What changed?
2. **Concepts (7 min)** – Messages, backdrops, speed variable.
3. **Demo (5 min)** – Reach level 2 in the page demo.
4. **Build (28 min)** – Project steps; test with a low score first.
5. **Reflect (7 min)** – “How would you add level 4?”

## Discussion prompts
- Why use a message instead of putting everything in one script?
- What else could change between levels?

## Watch for
- Mismatched message names.
- Backdrops with the same name as a sprite.`,
    video: vid('Multiple Levels & Game Scenes', 'How do games grow from one level to many?', 'Build the Space Mission with three levels', {
      hook: ['A space scene glows, then melts into a new one with a swirl of colour and a ding.', 'You win level one, and the whole world changes! How does a game move to the next level?', 'Level up!'],
      concept: ['Three backdrops line up like film frames, each with a speed dial that gets higher.', 'A level is a scene with its own backdrop and its own difficulty. A message tells every sprite to switch.', 'Level = scene + speed'],
      explain: ['A wait-until block holds at a score of five, then a message flies across the stage and sprites react.', 'Wait until the score is five. Then broadcast level two. Sprites with when I receive switch the backdrop and set the speed.', 'wait until → broadcast'],
      demo: ['The score hits five. The backdrop changes to a galaxy and the stars fall faster.', 'Reach five points and the game says level two. The backdrop changes and the stars speed up.', 'broadcast level 2'],
      tip: ['A message arrow flies, but the receiving sprite ignores it; a spelling check lights up.', 'Tip: broadcast and when I receive must have exactly the same message name.', 'Same name!'],
      challenge: ['Pixel holds three jumbled blocks above a level two sign.', 'Put the blocks in order to start level two at five points. Then build your own three-level mission.', 'Mission: Three Levels'],
    }),
  },

  // ───────────────────────────── 8 · Clones & Arcade Games ─────────────────────────────
  {
    course: 2,
    lesson: 8,
    title: 'Clones & Arcade Games',
    emoji: '👾',
    platform: 'SCRATCH',
    mission: {
      hook: 'One sprite can become hundreds with clones.',
      objective: 'Use clones to build an arcade game with lasers and falling meteors.',
      badge: 'Arcade Champion',
    },
    concepts: [
      concept('🧬', 'Clones', 'A clone is a copy of a sprite that runs its own script.', '“create clone of myself” makes a copy that keeps the same blocks and picture.'),
      concept('🚦', 'When I start as a clone', 'This hat block tells each clone what to do.', 'The original sprite does not run it. Only the new clones do.'),
      concept('🧹', 'Delete this clone', 'Clones must be deleted when they are done.', 'Otherwise the game fills with clones and slows down. Delete one when it is hit or leaves the Stage.'),
      concept('🔫', 'Shooting', 'A laser is a clone created when you press space.', 'Each laser flies up and deletes itself at the top of the Stage.'),
    ],
    demo: {
      kind: 'scratch-stage',
      title: 'Blast the meteors',
      intro: 'Move the rocket and press the space button to shoot lasers at the meteors.',
      backdrop: 'space',
      keys: ['left arrow', 'right arrow', 'space'],
      sprites: [
        { id: 'ship', emoji: '🚀', label: 'Rocketship', x: 0, y: -140 },
        { id: 'laser', emoji: '⚡', label: 'Lightning', x: 0, y: -140 },
        { id: 'rock', emoji: '☄️', label: 'Rocks', x: 0, y: 170 },
      ],
      scripts: [
        { sprite: 'ship', lines: ['events| when green flag clicked', 'variables| set [score] to (0)', 'control| forever', '  control| if {key [left arrow] pressed?} then', '    motion| change x by (-8)', '  control| if {key [right arrow] pressed?} then', '    motion| change x by (8)'] },
        { sprite: 'ship', lines: ['events| when [space] key pressed', 'control| create clone of [Lightning]'] },
        { sprite: 'laser', lines: ['events| when green flag clicked', 'looks| hide', 'control| when I start as a clone', 'motion| go to x: (0) y: (-120)', 'looks| show', 'control| repeat (30)', '  motion| change y by (10)', 'control| delete this clone'] },
        { sprite: 'rock', lines: ['events| when green flag clicked', 'looks| hide', 'control| forever', '  control| create clone of [myself]', '  control| wait (1.5) seconds'] },
        { sprite: 'rock', lines: ['control| when I start as a clone', 'looks| show', 'motion| go to x: (pick random (-200) to (200)) y: (170)', 'control| repeat until {(y position) < (-160)}', '  motion| change y by (-4)', 'control| delete this clone'] },
      ],
      hint: 'Which hat block do the clones use?',
    },
    examples: [
      sc(
        'clone',
        'Meteors from clones',
        ['events| when green flag clicked', 'looks| hide', 'control| forever', '  control| create clone of [myself]', '  control| wait (1.5) seconds', 'control| when I start as a clone', 'looks| show', 'control| repeat until {(y position) < (-160)}', '  motion| change y by (-4)', 'control| delete this clone'],
        { intro: 'Tap a block to see what it does.', sprite: 'Rocks', notes: { '2': 'The original hides — only the clones are seen.', '4': 'Makes a new copy.', '6': 'Starts every clone.', '8': 'The clone falls until it leaves the Stage.', '10': 'Cleans up so the game stays fast.' } },
      ),
    ],
    tips: [
      tip('Hide the original', 'Hide the original sprite, so you only see the clones.'),
      mistake('The game gets slower and slower', 'Clones are never deleted, so hundreds pile up.', 'Add “delete this clone” when each one finishes its job.'),
      tip('Clone of a different sprite', 'The ship can create a clone of the laser sprite. Choose it in the dropdown.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'A clone has finished flying up the Stage. What should it do last?',
      options: ['delete this clone', 'create clone of [myself]', 'hide', 'when I start as a clone'],
      answer: 0,
      hint: 'Clones that are not needed slow the game.',
      explain: '“delete this clone” removes a finished clone so the game stays fast.',
    },
    project: {
      name: 'Meteor Blaster',
      goal: 'Shoot lasers at falling meteors and score points. An arcade game made from clones!',
      assets: [
        { name: 'Rocketship', costumes: ['Rocketship-a'] },
        { name: 'Lightning', note: 'The laser' },
        { name: 'Rocks', note: 'The meteors' },
        { name: 'Space', note: 'Backdrop' },
      ],
      steps: [
        { text: 'Add the Rocketship, Lightning and Rocks. Make a variable called score.' },
        { text: 'Rocketship: move left and right with forever, and use “when space key pressed” to create a clone of Lightning.' },
        { text: 'Lightning: hide at the start. As a clone, go to the ship, show, fly up with “repeat 30”, then delete the clone.' },
        { text: 'Rocks: hide, then forever create a clone of myself every 1.5 seconds.' },
        { text: 'Rocks clones: show, go to a random x at the top, fall, and delete the clone at the bottom.' },
        { text: 'Add “if touching Lightning?” to the meteor clones: “change score by 1” and delete the clone.', stack: 'clone' },
      ],
      stacks: [
        sc('shoot', 'Laser clones', ['events| when [space] key pressed', 'control| create clone of [Lightning]', 'control| when I start as a clone', 'looks| show', 'control| repeat (30)', '  motion| change y by (10)', 'control| delete this clone'], { sprite: 'Lightning' }),
        sc('clone', 'Meteor clones', ['events| when green flag clicked', 'looks| hide', 'control| forever', '  control| create clone of [myself]', '  control| wait (1.5) seconds', 'control| when I start as a clone', 'looks| show', 'control| repeat until {(y position) < (-160)}', '  motion| change y by (-4)', '  control| if {touching [Lightning]?} then', '    variables| change [score] by (1)', '    control| delete this clone', 'control| delete this clone'], { sprite: 'Rocks' }),
      ],
      checklist: ['Pressing space fires a laser', 'Meteors fall from random places', 'A hit adds to the score', 'Every clone deletes itself'],
      stretch: 'Add lives: lose one if a meteor reaches the bottom.',
    },
    homework: {
      name: 'Laser Tester',
      instructions: 'Make a simpler game: only the ship and lasers. Press space to fire a laser clone that flies up and deletes itself.',
      deliverable: 'Your Scratch project file (.sb3) or a shareable project link.',
      hint: 'Test by pressing space many times. Is the game still fast?',
    },
    teacherNotes: `## Class flow (about 55 min)
1. **Hook (3 min)** – Show photocopies: “one page, many copies”.
2. **Concepts (8 min)** – Clones: create, run, delete.
3. **Demo (5 min)** – Shoot a few lasers in the page demo.
4. **Build (30 min)** – Project steps; build lasers first, then meteors.
5. **Arcade day (9 min)** – Learners play each other’s games.

## Discussion prompts
- Why is deleting clones important?
- What other game objects could be clones?

## Watch for
- Forgetting to hide the original.
- Clones running the wrong hat block.`,
    video: vid('Clones & Arcade Games', 'How can one sprite turn into a whole swarm?', 'Build the Meteor Blaster arcade game', {
      hook: ['One tiny meteor appears, then splits into a shower of dozens, raining across the stage.', 'One meteor becomes a whole shower. But the game only has one meteor sprite. How?', 'Clone it!'],
      concept: ['A sprite steps through a mirror and out come copies, each carrying the same blocks.', 'A clone is a copy of a sprite. Each clone runs its own script when it starts.', 'Clones'],
      explain: ['Create clone makes a copy. When I start as a clone starts its script. A broom sweeps finished clones away.', 'Create clone of myself, then use when I start as a clone to tell each copy what to do. Delete the clone when it is done.', 'create · start · delete'],
      demo: ['The rocket fires laser clones that streak upward and vanish, as meteor clones fall and burst.', 'Press space and the rocket makes a laser clone. It flies up and deletes itself. Meteors are clones too!', 'create clone of'],
      tip: ['A pile of clones slows the game; a broom clears them out.', 'Tip: always delete this clone when it finishes, or the game will slow down.', 'delete this clone'],
      challenge: ['Pixel holds up a clone block and a broom, and asks what happens last.', 'What should a clone do when its job is done? Then build your own Meteor Blaster.', 'Mission: Meteor Blaster'],
    }),
  },
];
