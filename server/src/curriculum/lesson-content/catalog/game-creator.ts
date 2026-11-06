// FILE PATH: server/src/curriculum/lesson-content/catalog/game-creator.ts
//
// Visuals for the Game Creator pathway (lineage keys "<module-slug>/<position>").

import { registerVisualCatalog, type CatalogSource } from '../visual-catalog';
import { V, cards, checklist, flow, sequence, table, trace, uiMap } from './helpers';

const CE = 'Concept Explanation';

const source: CatalogSource = {
  // ── Roblox World Builder ─────────────────────────────────────────────────
  'roblox-world-builder/1': [
    uiMap('studio-map', 'Roblox Studio Concepts', 'A map of the Roblox Studio window: the toolbar across the top, the Toolbox on the left, the 3D viewport in the middle, the Explorer and Properties panels on the right, and the Output window at the bottom.', 'Click a panel to see what it is for.', [
      { id: 'toolbar', label: 'Home toolbar', desc: 'Select, Move, Scale and Rotate tools, plus Play to test your game.', x: 1, y: 1, w: 98, h: 11 },
      { id: 'toolbox', label: 'Toolbox', desc: 'Models, meshes and scripts made by Roblox and the community — check anything before you use it.', x: 1, y: 14, w: 17, h: 58 },
      { id: 'viewport', label: '3D viewport', desc: 'Where you build the world. Right-click and drag to look around.', x: 20, y: 14, w: 52, h: 58 },
      { id: 'explorer', label: 'Explorer', desc: 'The tree of everything in your game — Workspace, scripts, lighting — in one list.', x: 74, y: 14, w: 25, h: 28 },
      { id: 'properties', label: 'Properties', desc: 'Settings of the selected thing: colour, size, material, whether it is Anchored.', x: 74, y: 44, w: 25, h: 28 },
      { id: 'output', label: 'Output', desc: 'Messages from your scripts, including print() results and error messages.', x: 1, y: 75, w: 98, h: 22 },
    ], { title: 'Roblox Studio (sketch)' }),
  ],
  'roblox-world-builder/2': [
    trace('lua-loop-trace', CE, 'Step through a Lua loop that adds 1, 2 and 3 to a score, watching the variables change.', 'Watch `score` change as the loop runs.', ['local score = 0', 'for i = 1, 3 do', '  score = score + i', 'end', 'print(score)'], [
      { line: 1, vars: { score: 0 }, note: 'score starts at 0.' },
      { line: 2, vars: { score: 0, i: 1 }, note: 'The loop starts with i = 1.' },
      { line: 3, vars: { score: 1, i: 1 }, note: '0 + 1 = 1.' },
      { line: 2, vars: { score: 1, i: 2 }, note: 'i goes up to 2.' },
      { line: 3, vars: { score: 3, i: 2 }, note: '1 + 2 = 3.' },
      { line: 2, vars: { score: 3, i: 3 }, note: 'i goes up to 3.' },
      { line: 3, vars: { score: 6, i: 3 }, note: '3 + 3 = 6.' },
      { line: 5, vars: { score: 6 }, output: '6', note: 'The loop ended; print shows 6.' },
    ]),
  ],
  'roblox-world-builder/3': [
    table('humanoid-props', CE, 'A table of Humanoid properties that control how a player character moves, with their default values.', 'Change these properties from a script to change how a character moves.', ['Property', 'Controls', 'Default'], [['WalkSpeed', 'how fast the character walks', 16], ['JumpPower', 'how strongly it jumps', 50], ['Health', 'how much damage it can take', 100]]),
  ],
  'roblox-world-builder/4': [
    flow('score-cycle', CE, 'A scoring cycle: a player touches a coin, the script checks the rule, the score is increased, and the leaderboard shows the new value.', 'Event → rule → update → show.', ['Event|a player touches a coin', 'Rule|is it a player? not collected yet?', 'Update|score = score + 1', 'Show|the leaderboard changes'], { layout: 'cycle' }),
  ],
  'roblox-world-builder/5': [
    sequence('remote-event', CE, 'A sequence diagram: a client script fires a RemoteEvent to the server, the server checks the request and changes the game, and the change is shown to every player.', 'The client asks; the server decides.', [['client', 'Client (player’s device)'], ['server', 'Server']], [
      { from: 'client', to: 'server', label: 'RemoteEvent:FireServer()', note: 'a request: "buy this item"' },
      { from: 'server', to: 'server', label: 'Check the request', note: 'is it allowed? do they have enough coins?' },
      { from: 'server', to: 'client', label: 'Result is replicated', note: 'everyone sees the same world', dashed: true },
    ]),
  ],
  'roblox-world-builder/6': [
    cards('world-design-principles', CE, 'Three cards for world design: guide the eye with landmarks and paths, set the mood with colour and lighting, and keep one consistent theme.', 'Three ideas that make a world feel designed.', [
      { title: 'Guide the eye', tone: 'info', bullets: ['A tall landmark to head for', 'Paths and light that lead the way'] },
      { title: 'Set the mood', tone: 'accent', bullets: ['A limited colour palette', 'Lighting and sky that match the feeling'] },
      { title: 'Keep a theme', tone: 'good', bullets: ['Materials and shapes that belong together', 'Details that tell a story'] },
    ]),
  ],
  'roblox-world-builder/7': [
    flow('debug-loop', CE, 'The testing and debugging loop: play-test, spot the problem, read the Output window, fix it, and test again.', 'Debugging is a loop, not a one-off.', ['Play-test|press Play', 'Spot the problem|what happened vs what you wanted', 'Read the Output|errors say which line', 'Fix it|change one thing', 'Test again|did it work?'], { layout: 'cycle' }),
  ],
  'roblox-world-builder/8': [
    checklist('publish-checklist', CE, 'A checklist to complete before publishing a Roblox game and sharing it with friends.', 'Tick these off before you share your game. Saved on this device.', ['The game has a name and a description', 'It has an icon or thumbnail', 'It has been play-tested to the end at least once', 'Sharing settings are set to who you want to play it', 'You know how to send the link to friends', 'You have asked a friend to try it and tell you what confused them'], { title: 'Ready to publish?', at: 'end' }),
  ],

  // ── Python Arcade Games ──────────────────────────────────────────────────
  'python-arcade-games/1': [
    trace('lives-trace', CE, 'Step through code that starts a player with 3 lives, removes one, and checks for game over.', 'Variables hold the state of the game.', ['lives = 3', 'lives = lives - 1', 'if lives == 0:', '    print("Game over")', 'print("Lives left:", lives)'], [
      { line: 1, vars: { lives: 3 }, note: 'The player starts with 3 lives.' },
      { line: 2, vars: { lives: 2 }, note: 'The player is hit: one life lost.' },
      { line: 3, vars: { lives: 2 }, note: 'Is lives equal to 0? No, so line 4 is skipped.' },
      { line: 5, vars: { lives: 2 }, output: 'Lives left: 2', note: 'The program prints what is left.' },
    ]),
  ],
  'python-arcade-games/2': [
    flow('game-loop', CE, 'The game loop in Pygame: handle events, update the game state, draw everything, flip the display, and repeat about sixty times a second.', 'Every game is this loop, over and over.', ['Handle events|keys, mouse, quit', 'Update|move things, check rules', 'Draw|paint the frame', 'Display flip + clock|show it, wait for 1/60 s'], { layout: 'cycle' }),
  ],
  'python-arcade-games/3': [
    V('stage', 'movement-stage', CE, 'A grid where you move a player with the arrow keys or buttons and see its x and y position change, with a goal flag and a wall.', 'x grows to the right, y grows downward.', {
      cols: 8, rows: 6, sprites: [{ kind: 'player', x: 1, y: 4 }, { kind: 'goal', x: 6, y: 1 }, { kind: 'wall', x: 4, y: 2 }, { kind: 'wall', x: 4, y: 3 }, { kind: 'wall', x: 4, y: 4 }],
    }),
  ],
  'python-arcade-games/4': [
    V('stage', 'collision-stage', CE, 'A grid where you walk a player into walls, items and an enemy to see different collision results.', 'Try each kind of collision.', {
      cols: 8, rows: 6, sprites: [{ kind: 'player', x: 0, y: 5 }, { kind: 'wall', x: 3, y: 3 }, { kind: 'wall', x: 3, y: 4 }, { kind: 'item', x: 2, y: 1 }, { kind: 'item', x: 5, y: 4 }, { kind: 'enemy', x: 6, y: 2 }, { kind: 'goal', x: 7, y: 0 }],
    }, { at: 'end' }),
    cards('rect-overlap', CE, 'Two rectangles collide only when their horizontal ranges overlap and their vertical ranges overlap.', 'Rectangle collision needs both checks to be true.', [
      { title: 'Overlap in x?', bullets: ['a.left < b.right', 'and a.right > b.left'], tone: 'info' },
      { title: 'Overlap in y?', bullets: ['a.top < b.bottom', 'and a.bottom > b.top'], tone: 'accent' },
      { title: 'Both true', bullets: ['The rectangles collide'], tone: 'good', badge: 'Collision' },
    ], { at: 'end' }),
  ],
  'python-arcade-games/5': [
    flow('enemy-states', CE, 'A simple enemy behaviour machine: the enemy patrols until the player comes within range, then chases, then goes back to patrolling when the player gets away.', 'A few states and rules make an enemy feel smart.', ['Patrol|walk back and forth', 'Chase|move toward the player'], { layout: 'row', edges: [{ from: 0, to: 1, label: 'player in range' }, { from: 1, to: 0, label: 'player out of range', dashed: true }] }),
  ],
  'python-arcade-games/6': [
    flow('sound-flow', CE, 'How to play a sound effect in Pygame: start the mixer, load the sound file once, and play it when an event such as a hit or a shot happens.', 'Load once, play when it matters.', ['mixer.init()|start the sound system', 'Load the sound|once, before the loop', 'Event happens|a hit or a shot', 'sound.play()|in the right place'], { perRow: 4 }),
  ],
  'python-arcade-games/7': [
    flow('game-states', CE, 'A state machine with three game states: from the menu, pressing a key starts play; losing all lives moves to game over; pressing a key returns to the menu.', 'One variable says which screen you are on.', ['MENU|title screen', 'PLAYING|the game itself', 'GAME_OVER|score and retry'], { layout: 'row', edges: [{ from: 0, to: 1, label: 'press Enter' }, { from: 1, to: 2, label: 'lives = 0' }, { from: 2, to: 0, label: 'press R', dashed: true }] }),
  ],
  'python-arcade-games/8': [
    checklist('share-game', CE, 'A checklist of what a shareable Python game needs: a README, a requirements file, its assets, and a test on a fresh setup.', 'If a friend can’t run it, it isn’t finished. Saved on this device.', ['README explains how to install and run it', 'README lists the controls', 'requirements.txt lists pygame and any other package', 'Images and sounds are inside the project folder (relative paths)', 'It runs from a fresh copy of the folder', 'A screenshot or short description is ready to share'], { title: 'Ready to share?', at: 'end' }),
  ],

  // ── Advanced Game Design ─────────────────────────────────────────────────
  'advanced-game-design/1': [
    flow('core-loop', 'The Core Loop', 'The core loop of a game: the player takes on a challenge, performs an action, gets a reward, and the reward leads to the next challenge.', 'What the player does over and over.', ['Challenge|a goal or obstacle', 'Action|the player responds', 'Reward|points, loot, progress'], { layout: 'cycle' }),
    cards('flow-state', 'Flow State', 'Three cards: a challenge much harder than the player’s skill causes anxiety, much easier causes boredom, and a close match gives flow.', 'Balance challenge against skill.', [
      { title: 'Too hard', badge: 'Anxiety', tone: 'bad', bullets: ['Challenge far above skill', 'Players quit'] },
      { title: 'Just right', badge: 'Flow', tone: 'good', bullets: ['Challenge matches skill', 'Time disappears'] },
      { title: 'Too easy', badge: 'Boredom', tone: 'warn', bullets: ['Skill far above challenge', 'Players drift away'] },
    ]),
  ],
  'advanced-game-design/2': [
    flow('teach-test-twist', 'Teach, Test, Twist', 'A three-step pattern for introducing a mechanic: teach it safely, test it under mild pressure, then twist it in a new way.', 'Introduce a mechanic in three beats.', ['Teach|safe space to learn it', 'Test|use it under pressure', 'Twist|a surprising new use'], { perRow: 3 }),
    V('chart', 'difficulty-curve', 'Pacing and the Difficulty Curve', 'A line chart of difficulty across ten levels that rises with small dips for relief rather than climbing in a straight line.', 'Illustrative curve: difficulty rises, with breathers.', {
      kind: 'line', xLabel: 'Level', yLabel: 'Difficulty (1–10)', categories: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], series: [{ name: 'Difficulty', values: [1, 2, 3, 2, 4, 5, 4, 6, 8, 7] }],
    }),
  ],
  'advanced-game-design/3': [
    flow('player-fsm', 'Finite State Machines', 'A finite state machine for a player character: idle, walking and jumping, with arrows labelled by what moves it between states.', 'A character is in exactly one state at a time.', ['Idle', 'Walking', 'Jumping'], { layout: 'row', edges: [{ from: 0, to: 1, label: 'move key' }, { from: 1, to: 0, label: 'no key', dashed: true }, { from: 1, to: 2, label: 'space' }, { from: 2, to: 0, label: 'lands', dashed: true }] }),
  ],
  'advanced-game-design/4': [
    uiMap('unity-map', 'The Unity Editor Layout', 'A map of the Unity editor: the Hierarchy list on the left, the Scene and Game views in the middle, the Inspector on the right, and the Project and Console panels at the bottom.', 'Click a panel to see what it does.', [
      { id: 'hierarchy', label: 'Hierarchy', desc: 'Every GameObject in the open scene, as a list.', x: 1, y: 3, w: 18, h: 66 },
      { id: 'scene', label: 'Scene view', desc: 'Where you place and move things in the world.', x: 21, y: 3, w: 46, h: 40 },
      { id: 'game', label: 'Game view', desc: 'What the player will see through the camera when you press Play.', x: 21, y: 45, w: 46, h: 24 },
      { id: 'inspector', label: 'Inspector', desc: 'The components and settings of whatever is selected — Transform, Rigidbody, your scripts.', x: 69, y: 3, w: 30, h: 66 },
      { id: 'project', label: 'Project & Console', desc: 'Project holds your files (scripts, prefabs, art); Console shows messages and errors.', x: 1, y: 72, w: 98, h: 25 },
    ], { title: 'Unity editor (sketch)', at: 'end' }),
  ],
  'advanced-game-design/5': [
    V('mockup', 'hud-wireframe', 'UI vs. HUD', 'A wireframe of a game screen: health top-left, score top-right, an ability bar at the bottom, and the centre left clear for play.', 'A HUD shows what matters, at the edges, and leaves the action clear.', {
      kind: 'hud',
      sections: [
        { label: 'Top-left: health', text: 'Heart icons or a bar', callout: 'Critical info in a consistent corner.' },
        { label: 'Top-right: score', text: 'A big, readable number', callout: 'Score should be readable in a glance.' },
        { label: 'Centre: play area', text: 'Kept clear', callout: 'Never cover the action.' },
        { label: 'Bottom: abilities', text: 'Icons with key hints', callout: 'Show the key to press.' },
      ],
    }, { at: 'end' }),
  ],
  'advanced-game-design/6': [
    flow('iteration-loop', 'The Iteration Loop', 'The iteration loop: build a version, playtest it with other people, observe and gather data, decide what to change, improve, and playtest again.', 'Games are improved by repeating this loop.', ['Build|a playable version', 'Playtest|with someone new', 'Observe|watch, don’t explain', 'Decide|what to change', 'Improve|then go round again'], { layout: 'cycle' }),
  ],
  'advanced-game-design/7': [
    table('frame-budget', 'The Frame Budget', 'A table showing how a target frame rate sets the time available to do all the work for one frame.', 'Everything must fit in the budget, every frame.', ['Target', 'Time for one frame'], [['30 FPS', '33.3 ms'], ['60 FPS', '16.7 ms'], ['120 FPS', '8.3 ms']], { highlights: [{ row: 1, col: 1, tone: 'good' }] }),
    flow('object-pool', 'Object Pooling', 'Object pooling: create a set of bullets once at the start, take one from the pool when firing, and return it to the pool afterwards instead of destroying it.', 'Reuse objects instead of creating and destroying them each frame.', ['Create once|20 bullets at the start', 'Fire|take one from the pool', 'Hit or off-screen|return it', 'Back in the pool|ready to reuse'], { layout: 'cycle', at: 'end' }),
  ],
  'advanced-game-design/8': [
    checklist('final-polish', 'Systematic Edge-Case Testing', 'A checklist of edge cases to test and polish steps to finish before submitting a game.', 'Test the weird cases too. Saved on this device.', ['Press every key at once, and no keys at all', 'Pause, resume, restart — in the middle of everything', 'Lose on the very first second; win with 1 life left', 'Resize or minimise the window', 'README with controls and how to run', 'No leftover debug prints or test cheats', 'Sound and music at a sensible volume'], { title: 'Before you submit', at: 'end' }),
  ],
};

registerVisualCatalog(source);
