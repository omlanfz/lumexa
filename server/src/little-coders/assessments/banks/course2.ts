// FILE PATH: server/src/little-coders/assessments/banks/course2.ts
//
// COURSE 2 ASSESSMENT — Scratch Game Studio. Topics: 1 controls and the game loop ·
// 2 touching · 3 variables and score · 4 if / else and comparisons · 5 random ·
// 6 timer and lives · 7 messages, levels and backdrops · 8 clones.

import { bank, mcq, practical, scratchCode, tf } from '../lc-bank.helpers';

export const course2Bank = bank({
  id: 'lc/course-test/scratch-game-studio',
  title: 'Scratch Game Studio — Course Assessment',
  kind: 'COURSE',
  moduleSlug: 'scratch-game-studio',
  courseNumber: 2,
  mcq: [
    mcq('concept', 'EASY', 3, 'What is a variable in a Scratch game?', 'A named box that stores a value, such as the score', ['A block that moves a sprite across the Stage', 'A picture that is drawn on the backdrop', 'A sound that plays when the player wins'], 'A variable has a name and holds a value. A game can change the value, for example by adding 1 to the score.'),
    mcq('concept', 'EASY', 2, 'What does the “touching [Star]?” block tell you?', 'Whether the sprite is touching the Star right now: yes or no', ['How far away the Star is', 'What colour the Star is', 'How many Stars are on the Stage'], 'Touching is a yes-or-no question. Put it in an if block to do something when two sprites meet.'),
    mcq('identify', 'EASY', 5, 'Which block gives a different number each time, like rolling a dice?', '`pick random (1) to (6)`', ['`change [score] by (6)`', '`repeat (6)`', '`wait (6) seconds`'], 'Pick random chooses a whole number between the two numbers each time it runs.'),
    mcq('identify', 'MEDIUM', 6, 'Which block tells you how many seconds the game has been running?', '`timer`', ['`x position`', '`loudness`', '`mouse down?`'], 'The timer counts seconds. Use “reset timer” at the start so it begins at 0.'),
    mcq('predict', 'MEDIUM', 3, 'What is the score when this script has finished?', '6', ['2', '3', '5'], 'The score starts at 0. The repeat block adds 2 three times: 2, 4, then 6.', {
      code: scratchCode('events| when green flag clicked', 'variables| set [score] to (0)', 'control| repeat (3)', '  variables| change [score] by (2)'),
    }),
    mcq('predict', 'MEDIUM', 4, 'What does the sprite say when the green flag is clicked?', 'Keep going!', ['Game over!', 'Both messages', 'Nothing'], 'lives is 1. The question “lives < 1” is false, so the else part runs and the sprite says Keep going!', {
      code: scratchCode('events| when green flag clicked', 'variables| set [lives] to (1)', 'control| if {(lives) < (1)} then', '  looks| say [Game over!] for (2) seconds', 'control| else', '  looks| say [Keep going!] for (2) seconds'),
    }),
    mcq('sequence', 'MEDIUM', 7, 'The score is 0 when the game starts and goes up by 1 for each star caught. When does the backdrop change to Galaxy?', 'When the score reaches 5', ['As soon as the green flag is clicked', 'When the score reaches 2', 'It never changes'], 'The wait until block holds the script until the score is 5. Then it broadcasts “level 2”, and the receiving script changes the backdrop.', {
      code: scratchCode('events| when green flag clicked', 'control| wait until {(score) = (5)}', 'events| broadcast [level 2]', 'events| when I receive [level 2]', 'looks| switch backdrop to [Galaxy]'),
    }),
    mcq('predict', 'HARD', 8, 'How many sprites are on the Stage after this script has finished, counting the original and all the clones?', '4', ['3', '1', '6'], 'The loop makes 3 clones of the original sprite. With the original, that is 4 sprites.', {
      code: scratchCode('events| when green flag clicked', 'control| repeat (3)', '  control| create clone of [myself]'),
    }),
    mcq('sequence', 'HARD', 1, 'The rocket is at x: 40 and is touching Rocks. The right arrow is not pressed. What does the rocket do in the next trip around the loop?', 'It goes back to x: 0, y: -120', ['It moves to x: 45', 'It stays at x: 40', 'The script stops'], 'The first if is false because the key is not pressed. The second if is true because the rocket touches Rocks, so it goes back to the start.', {
      code: scratchCode('events| when green flag clicked', 'motion| go to x: (0) y: (-120)', 'control| forever', '  control| if {key [right arrow] pressed?} then', '    motion| change x by (5)', '  control| if {touching [Rocks]?} then', '    motion| go to x: (0) y: (-120)'),
    }),
    mcq('mistake', 'HARD', 6, 'The player loses many lives from one meteor and lives go below zero. What is the best fix?', 'After a hit, send the Rocks back to the top so one hit only counts once', ['Set lives to 100 at the start', 'Remove the forever block', 'Change -1 to +1'], 'While the Rocks keep touching the rocket, every trip around the loop takes another life. Moving the Rocks away after a hit makes one hit cost one life.', {
      code: scratchCode('events| when green flag clicked', 'variables| set [lives] to (3)', 'control| forever', '  control| if {touching [Rocks]?} then', '    variables| change [lives] by (-1)'),
    }),
  ],
  trueFalse: [
    tf('EASY', 3, 'A variable called score can go up and down while a game is running.', true, 'The value of a variable can change whenever your code uses “set” or “change”.'),
    tf('EASY', 5, 'The block “pick random (1) to (3)” can give the number 4.', false, 'It only gives whole numbers from 1 to 3, including 1 and 3.'),
    tf('MEDIUM', 4, 'In an if / else block, the else part runs when the question in the if is false.', true, 'The if part runs for true. The else part is the other path, for false.'),
    tf('MEDIUM', 8, 'The blocks under “when I start as a clone” run in the original sprite as soon as the green flag is clicked.', false, 'Only a new clone runs those blocks, at the moment it is created.'),
    tf('HARD', 6, 'The block “reset timer” should run at the start of a game so the timer begins at 0.', true, 'The timer keeps counting. Resetting it at the start makes every game begin from 0.'),
  ],
  practicals: [
    practical(null, 'Falling Stars Game', 'Stretch3 (Scratch)', {
      platform: 'STRETCH3',
      brief: [
        'Build a small catch-and-score game in Stretch3.',
        'The player moves a sprite left and right with the arrow keys while stars fall from the top. Catching a star scores points, and the game must be able to end.',
        'Choose your own sprites and backdrop from the Scratch library.',
      ],
      blocks: [
        { category: 'Events', blocks: ['when green flag clicked'] },
        { category: 'Control', blocks: ['forever', 'if < > then', 'stop [all]'] },
        { category: 'Sensing', blocks: ['key [ ] pressed?', 'touching [ ]?', 'timer', 'reset timer'] },
        { category: 'Operators', blocks: ['pick random ( ) to ( )', '( ) > ( )'] },
        { category: 'Variables', blocks: ['set [ ] to ( )', 'change [ ] by ( )'] },
        { category: 'Motion', blocks: ['change x by ( )', 'change y by ( )', 'go to x: ( ) y: ( )'] },
      ],
      requirements: [
        'The player moves left and right smoothly with the arrow keys.',
        'A falling star starts at a random place along the top of the Stage each time.',
        'When the player touches the star, a variable called score goes up by 1 and the star goes back to the top.',
        'The score is set to 0 every time the game starts and is shown on the Stage.',
        'The game stops when the timer passes a limit that you choose.',
        'At least one if block is used to check for a touch or for the time limit.',
      ],
      starter: { required: false, kind: 'NONE', label: '', url: '', note: '', modelLabels: [] },
      bonus: ['Add a second falling object that takes points away.'],
      handIn: 'Save your project to your computer from Stretch3 (File → Save to your computer) and upload the .sb3 file, and/or paste your shareable project link.',
    }),
  ],
});
