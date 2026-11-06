// FILE PATH: server/src/curriculum/lesson-content/catalog/advanced-data-science.ts
//
// Visuals for the redesigned lessons of the custom "Advanced Data Science" course.
// These lessons were rewritten (new titles, new sections), so they are matched by
// TITLE and win over the visuals they would otherwise inherit from the pathway
// lesson they were imported from. Lessons that kept their original title (orders
// 1–6) inherit by lineage and need nothing here.

import { registerTitleCatalog } from '../visual-catalog';
import { V, checklist, flow, table, trace } from './helpers';

const CE = 'Concept Explanation';

registerTitleCatalog({
  'Randomness and Finishing Your Game': [
    table('random-functions', CE, 'A table of three common functions from Python’s random module and what each one returns.', 'Three ways to ask for something random.', ['Call', 'Gives you'], [['random.randint(1, 10)', 'a whole number from 1 to 10 (both included)'], ['random.choice(items)', 'one item picked from a list'], ['random.random()', 'a decimal from 0 up to (but not including) 1']]),
  ],
  'Your Python Portfolio — Polish and Present': [
    checklist('portfolio-polish', CE, 'A checklist for polishing a Python project before presenting it in a portfolio.', 'Tick these off before you present. Saved on this device.', ['A README says what it is and how to run it', 'Names and comments make the code easy to read', 'Every path of the program has been tested', 'A screenshot or short demo is ready', 'You can explain one thing you are proud of and one thing you would improve'], { title: 'Polished and ready?', at: 'end' }),
  ],
  'Cosmic Defender — Part 1: Player & Game Window': [
    flow('cosmic-game-loop', CE, 'The Cosmic Defender game loop: handle events, update the ship, draw the frame, and repeat about sixty times a second.', 'Every frame runs these steps.', ['Handle events|keys and quit', 'Update|move the ship', 'Draw|paint the frame', 'Display flip + clock|wait for 1/60 s'], { layout: 'cycle' }),
  ],
  'Cosmic Defender — Part 2: Enemy Fleet': [
    V('stage', 'fleet-grid', CE, 'A grid with a fleet of enemies along the top and the player’s ship at the bottom, which you can move to see how x and y change.', 'x grows to the right, y grows downward — enemies sit at small y.', {
      cols: 9, rows: 6, sprites: [{ kind: 'player', x: 4, y: 5 }, ...[1, 2, 3, 4, 5, 6, 7].map((x) => ({ kind: 'enemy', x, y: 0 })), ...[2, 3, 4, 5, 6].map((x) => ({ kind: 'enemy', x, y: 1 }))],
    }, { at: 'end' }),
  ],
  'Cosmic Defender — Part 3: Lasers & Shooting': [
    flow('laser-life', CE, 'The life of a laser: the player presses space, a laser is created at the ship, it moves up every frame, and it is removed when it hits an enemy or leaves the screen.', 'Create it, move it, remove it.', ['Space pressed|player fires', 'Create a laser|at the ship’s position', 'Move it up|every frame', 'Hit or off-screen?|then remove the laser'], { perRow: 4 }),
  ],
  'Cosmic Defender — Part 4: Combat & Scoring': [
    flow('score-flow', CE, 'What happens when a laser hits an enemy: the enemy is removed, points are added to the score, and the new score is drawn.', 'A hit changes the game state, then the screen shows it.', ['Laser hits an enemy|collision detected', 'Remove the enemy', 'score = score + points', 'Draw the new score'], { perRow: 4 }),
  ],
  'Cosmic Defender — Part 5: Health & Survival': [
    trace('health-trace', CE, 'Step through a health counter that drops by one each time the ship is hit and ends the game at zero.', 'Health is a number the game keeps checking.', ['health = 3', 'health = health - 1', 'if health <= 0:', '    game_over = True'], [
      { line: 1, vars: { health: 3, game_over: false }, note: 'The ship starts with 3 health.' },
      { line: 2, vars: { health: 2, game_over: false }, note: 'The ship is hit: health goes down by 1.' },
      { line: 3, vars: { health: 2, game_over: false }, note: 'Is health 0 or less? No — keep playing.' },
      { line: 2, vars: { health: 1, game_over: false }, note: 'Hit again.' },
      { line: 2, vars: { health: 0, game_over: false }, note: 'And again: health is now 0.' },
      { line: 3, vars: { health: 0, game_over: false }, note: 'Health is 0 or less — the condition is True.' },
      { line: 4, vars: { health: 0, game_over: true }, note: 'The game is over.' },
    ]),
  ],
  'Cosmic Defender — Part 6: Menus & Game States': [
    flow('cosmic-states', CE, 'The game states of Cosmic Defender: from the menu, pressing a key starts the game; losing all health moves to game over; a key press returns to the menu.', 'One variable says which screen you are on.', ['MENU|title screen', 'PLAYING|the game itself', 'GAME_OVER|score and retry'], { layout: 'row', edges: [{ from: 0, to: 1, label: 'press Enter' }, { from: 1, to: 2, label: 'health = 0' }, { from: 2, to: 0, label: 'press R', dashed: true }] }),
  ],
  'Polish & Showcase Your Projects': [
    checklist('showcase-ready', CE, 'A checklist for polishing and presenting two finished projects.', 'Tick these off before you share. Saved on this device.', ['Both projects run from a fresh copy of the folder', 'Each has a README with how to run it and the controls', 'Screenshots or a short recording are ready', 'You tested the unusual cases (win, lose, restart)', 'You can explain what you built and what you would improve'], { title: 'Showcase checklist', at: 'end' }),
  ],
});
