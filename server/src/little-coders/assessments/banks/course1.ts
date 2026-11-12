// FILE PATH: server/src/little-coders/assessments/banks/course1.ts
//
// COURSE 1 ASSESSMENT — Scratch Adventures. 10 MCQ + 5 True/False + one practical built in
// Stretch3 (marks: 10 + 5 + 25 = 40). Topics are the eight lessons: 1 Stage, sprites,
// green flag · 2 motion and x/y · 3 looks · 4 events and keys · 5 sound · 6 loops ·
// 7 costumes and animation · 8 stories, backdrops and messages.

import { bank, mcq, practical, scratchCode, tf } from '../lc-bank.helpers';

export const course1Bank = bank({
  id: 'lc/course-test/scratch-adventures',
  title: 'Scratch Adventures — Course Assessment',
  kind: 'COURSE',
  moduleSlug: 'scratch-adventures',
  courseNumber: 1,
  mcq: [
    mcq('concept', 'EASY', 1, 'What do we call the area where your sprites move around and your project plays?', 'The Stage', ['The Code Area', 'The Block Palette', 'The Costumes tab'], 'The Stage is the small screen where your project plays. You build your code in the Code Area.'),
    mcq('concept', 'EASY', 2, 'On the Stage, which way does a sprite move when its y number gets bigger?', 'Up', ['Down', 'Left', 'Right'], 'y is up and down. A bigger y moves a sprite up and a smaller y moves it down. x is left and right.'),
    mcq('identify', 'EASY', 3, 'Which block shows a thought bubble that goes away after 2 seconds?', '`think [Hmm...] for (2) seconds`', ['`say [Hmm...]`', '`switch costume to [costume2]`', '`change size by (2)`'], 'Think blocks make a thought bubble, and “for 2 seconds” makes it disappear by itself. Say makes a speech bubble.'),
    mcq('identify', 'MEDIUM', 5, 'You want a sound to play while the sprite keeps moving. Which block should you use?', '`start sound [Boing]`', ['`play sound [Boing] until done`', '`stop all sounds`', '`set volume to (0) %`'], 'Start sound plays the sound and the script keeps going. Play sound until done waits for the sound to finish first.'),
    mcq('predict', 'MEDIUM', 6, 'A sprite starts at x: 0, y: 0. What happens when the green flag is clicked?', 'It ends at x: 50 and says Done!', ['It ends at x: 10 and says Done!', 'It ends at x: 5 and says Done!', 'It stays at x: 0 and says Done!'], 'The repeat block runs “change x by 10” five times, so x grows by 50. Then the sprite says Done!', {
      code: scratchCode('events| when green flag clicked', 'motion| go to x: (0) y: (0)', 'control| repeat (5)', '  motion| change x by (10)', 'looks| say [Done!] for (2) seconds'),
    }),
    mcq('sequence', 'MEDIUM', 2, 'What number does the sprite say when this script finishes?', '50', ['30', '20', '0'], 'The blocks run in order: y starts at 0, goes up by 30, then up by 20. So y is 50 when the sprite says it.', {
      code: scratchCode('events| when green flag clicked', 'motion| go to x: (0) y: (0)', 'motion| change y by (30)', 'motion| change y by (20)', 'looks| say (y position) for (2) seconds'),
    }),
    mcq('predict', 'MEDIUM', 7, 'Giga has four costumes in this order: giga-a, giga-b, giga-c, giga-d. Which costume is showing when the script has finished?', 'giga-d', ['giga-a', 'giga-b', 'giga-c'], 'It starts on giga-a. “next costume” runs 3 times: giga-b, giga-c, then giga-d.', {
      code: scratchCode('events| when green flag clicked', 'looks| switch costume to [giga-a]', 'control| repeat (3)', '  looks| next costume', '  control| wait (0.2) seconds'),
    }),
    mcq('predict', 'HARD', 2, 'A sprite starts facing right (direction 90). Where is it when the script finishes?', 'Back at x: 0, y: 0, facing right', ['At x: 120, y: 0, facing right', 'At x: 30, y: -30, facing down', 'At x: 0, y: 120, facing up'], 'The sprite walks the four sides of a square: right, down, left, then up, turning right each time. It ends where it started, facing right again.', {
      code: scratchCode('events| when green flag clicked', 'motion| go to x: (0) y: (0)', 'control| repeat (4)', '  motion| move (30) steps', '  motion| turn ↻ (90) degrees'),
    }),
    mcq('sequence', 'HARD', 8, 'Both scripts start when the green flag is clicked. In what order does the sprite say its messages?', 'First!, then Second!', ['Second!, then First!', 'Only First! is said', 'Both are said at exactly the same moment'], 'Scripts run at the same time. The second script says First! straight away. The first script waits 2 seconds, so Second! comes later.', {
      code: scratchCode('events| when green flag clicked', 'control| wait (2) seconds', 'looks| say [Second!] for (1) seconds', 'events| when green flag clicked', 'looks| say [First!] for (1) seconds'),
    }),
    mcq('mistake', 'HARD', 6, 'A learner wants the sprite to move right by 10, ten times, but it only moves once. What is the mistake?', 'The “change x by (10)” block is not inside the repeat block', ['The repeat number is too small', 'The “go to” block should come last', 'The sprite needs a forever block'], 'A repeat block only repeats the blocks inside its mouth. Here the move block sits below it, so it runs just once.', {
      code: scratchCode('events| when green flag clicked', 'motion| go to x: (0) y: (0)', 'control| repeat (10)', 'motion| change x by (10)'),
    }),
  ],
  trueFalse: [
    tf('EASY', 1, 'Scratch runs the blocks in a script from the top to the bottom.', true, 'Blocks run in order, one after another, from the top of the script to the bottom.'),
    tf('EASY', 5, 'The “start sound” block waits until the sound has finished before the next block runs.', false, 'Start sound lets the script carry on straight away. “Play sound until done” is the block that waits.'),
    tf('MEDIUM', 4, 'One sprite can have several scripts that each start with their own hat block.', true, 'Each hat block waits for its own event, so a sprite can respond to many different things.'),
    tf('MEDIUM', 3, 'The block “change size by (-10)” makes a sprite bigger.', false, 'A negative number makes the sprite smaller. Use a positive number to make it bigger.'),
    tf('HARD', 7, 'A loop with “next costume” and no wait block can change costumes so fast that you cannot see the animation.', true, 'Without a wait, the loop races through the costumes in a blink. A short wait lets you see each picture.'),
  ],
  practicals: [
    practical(null, 'Space Welcome Show', 'Stretch3 (Scratch)', {
      platform: 'STRETCH3',
      brief: [
        'You are the host of a space welcome show. Build a short animated show in Stretch3 with one sprite of your choice.',
        'The show starts when the green flag is clicked. Your sprite must move, speak, change how it looks and react to the keyboard.',
        'Choose any sprite and any backdrop from the Scratch library.',
      ],
      blocks: [
        { category: 'Events', blocks: ['when green flag clicked', 'when [space] key pressed'] },
        { category: 'Motion', blocks: ['go to x: ( ) y: ( )', 'glide ( ) secs to x: ( ) y: ( )'] },
        { category: 'Looks', blocks: ['say [ ] for ( ) seconds', 'next costume', 'change size by ( )'] },
        { category: 'Control', blocks: ['repeat ( )', 'wait ( ) seconds'] },
        { category: 'Sound', blocks: ['start sound [ ]'] },
      ],
      requirements: [
        'When the green flag is clicked, the sprite first goes to a starting position.',
        'The sprite says a greeting that stays on the screen for at least 2 seconds.',
        'The sprite glides to a different place on the Stage.',
        'A loop plays a costume animation with at least 4 costume changes and a short wait, so each costume can be seen.',
        'Pressing the space key makes the sprite change size and start a sound.',
        'The project runs from the start without errors every time the green flag is clicked.',
      ],
      starter: { required: false, kind: 'NONE', label: '', url: '', note: '', modelLabels: [] },
      bonus: ['Add a second sprite that speaks after the first one has finished.'],
      handIn: 'Save your project to your computer from Stretch3 (File → Save to your computer) and upload the .sb3 file, and/or paste your shareable project link.',
    }),
  ],
});
