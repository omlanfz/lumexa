// FILE PATH: server/src/assessments/bank/course-tests/advanced-game-design.ts
//
// Game Creator Path → "Advanced Game Design" (8 lessons, 3 projects: RPG
// Adventure Storyline, Physics Puzzle Game, Published Portfolio Game).
// Topics: 1 game design fundamentals · 2 level design · 3 game architecture
// (inheritance, composition, state machines) · 4 Unity basics · 5 UI & HUD
// design · 6 playtesting & iteration · 7 performance · 8 polish & submission.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

export const advancedGameDesign = bank({
  id: 'course-test/advanced-game-design',
  title: 'Advanced Game Design — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Game design fundamentals ─────────────────────────────────
    mcq(
      1,
      'What is a game\'s "core loop"?',
      'The smallest repeating cycle of action, feedback and reward that a player performs over and over',
      [
        'The code that keeps the window open',
        'The loop that draws every sprite 60 times a second',
        'The story that connects all of the levels',
      ],
      'In Breakout it is aim → hit the ball → break bricks → watch the score rise → repeat. If the core loop is not fun in its rawest form, nothing added later will save the game.',
    ),
    mcq(
      1,
      'Which three ingredients does a good core loop have?',
      'A clear goal, meaningful immediate feedback, and rising stakes so it does not get stale',
      [
        'A story, a soundtrack, and a boss fight',
        'A timer, a score, and a menu',
        'A tutorial, a shop, and a leaderboard',
      ],
      'The goal tells players what to do, feedback tells them how they did, and escalation keeps the loop interesting.',
    ),
    mcq(
      1,
      'In the flow-state picture, what do players feel when the challenge is far above their skill?',
      'Anxiety — and they may quit',
      ['Boredom', 'Flow', 'Mastery'],
      'Too much challenge causes anxiety and too little causes boredom. Flow lives on the diagonal where challenge rises just a little faster than skill.',
    ),
    codeOut(
      1,
      'python',
      `difficulty = 0
for frame_count in range(1, 901):
    if frame_count % 300 == 0:
        difficulty += 1
print(difficulty)`,
      '3',
      ['2', '9', '300'],
      'frame_count % 300 == 0 is true at frames 300, 600 and 900, so the difficulty rises three times. At 60 FPS that is one step every 5 seconds.',
      'At 60 FPS this loop simulates 900 frames (15 seconds) of a game. What does it print?',
    ),

    // ── Lesson 2 · Level design ─────────────────────────────────────────────
    mcq(
      2,
      'A designer places the first spike out in the open, with plenty of room to react. Which part of "teach, test, twist" is this?',
      'Teach',
      ['Test', 'Twist', 'Pacing'],
      'Teach introduces an element in a safe context. Test puts it in a more demanding one, and Twist surprises the player with a new combination.',
    ),
    mcq(
      2,
      'What is the main benefit of describing levels as data and loading them with one generic loader?',
      'New levels can be added or edited without changing the game logic',
      [
        'The levels load faster than any other method',
        'The player can no longer see the level layout',
        'It removes the need to test the levels',
      ],
      'Content (layouts) is separated from logic (how the game runs), and the same loader works for level 1 and level 50.',
    ),
    codeOut(
      2,
      'python',
      `level = [
    "#######",
    "#P.G.G#",
    "#S...E#",
    "#######",
]
gems = spikes = 0
for row in level:
    gems += row.count("G")
    spikes += row.count("S")
print(gems, spikes)`,
      '2 1',
      ['1 2', '2 2', '3 1'],
      'Each character is part of a level grid ("G" = gem, "S" = spike). The loop adds up the matching characters in every row: two gems and one spike.',
      'In this level grid, G is a gem and S is a spike. What does the code print?',
    ),
    mcq(
      2,
      'The level exit only works once `level.gems` is empty. What does this design choice do?',
      'It forces the player to explore the whole level and collect every gem',
      [
        'It makes the game run faster',
        'It hides the exit from the player',
        'It removes the spikes from the level',
      ],
      'Small rules like exit gating shape how a player moves through the space.',
    ),

    // ── Lesson 3 · Architecture ─────────────────────────────────────────────
    mcq(
      3,
      'Which relationship should be modelled with inheritance?',
      'A Player is an Entity',
      [
        'A Player has an Inventory',
        'A Level has a list of walls',
        'A Game has a score',
      ],
      '"Is-a" relationships use inheritance. "Has-a" relationships, like a player owning an inventory, use composition.',
    ),
    codeOut(
      3,
      'python',
      `ALLOWED = {
    "MENU": {"PLAYING"},
    "PLAYING": {"PAUSED", "GAME_OVER", "WIN"},
    "PAUSED": {"PLAYING"},
}

def can_move(current, target):
    return target in ALLOWED.get(current, set())

print(can_move("MENU", "WIN"), can_move("PAUSED", "PLAYING"))`,
      'False True',
      ['True True', 'False False', 'True False'],
      'MENU may only move to PLAYING, so MENU → WIN is rejected (False). PAUSED → PLAYING is in the allowed set (True).',
      'This is the idea behind a state machine\'s "legal transitions". What does the code print?',
    ),
    mcq(
      3,
      'Why prefer one authoritative `state` variable to several flags such as `is_paused` and `is_game_over`?',
      'Several flags can be true at once and contradict each other',
      [
        'Flags cannot store booleans',
        'A state variable makes the sprites move faster',
        'Flags are deleted when the game restarts',
      ],
      'A finite state machine guarantees the game is in exactly one named state at a time.',
    ),
    mcq(
      3,
      'What does encapsulation mean?',
      "Hiding an object's internal details behind a clean interface of methods, such as `take_damage()`",
      [
        "Putting all of the game's code in a single file",
        'Making every attribute global so anything can change it',
        'Copying an object so that it can be changed safely',
      ],
      'If only Player.take_damage() changes health, invincibility frames and other side effects can never be skipped.',
    ),

    // ── Lesson 4 · Unity ────────────────────────────────────────────────────
    mcq(
      4,
      'What is a GameObject in Unity?',
      'The base "thing" in a scene — the player, camera, light and ground are all GameObjects, with behaviour added through Components',
      [
        'A script that must be written in Python',
        'A saved copy of the whole game',
        'A texture applied to a surface',
      ],
      'A GameObject starts as an empty container with a Transform, and everything else comes from attached Components.',
    ),
    mcq(
      4,
      'Where should code that moves a character continuously go in a Unity script?',
      'In `Update()`, because `Start()` runs only once',
      ['In `Start()`', 'In the Inspector', 'In the Project window'],
      'Update() runs every frame, so continuous movement belongs there. Putting it in Start() would move the object only once.',
    ),
    mcq(
      4,
      'Which Unity panel shows every Component attached to the selected GameObject and lets you edit their values?',
      'The Inspector',
      ['The Hierarchy', 'The Project window', 'The Game view'],
      'The Hierarchy lists the GameObjects, the Project window browses assets, and the Game view shows what the player sees.',
    ),
    mcq(
      4,
      'What is a Prefab?',
      'A saved, reusable template of a GameObject and its components that can be placed many times',
      [
        'A script that runs before the game starts',
        'A window that shows error messages',
        'A kind of physics force',
      ],
      "Prefabs are Unity's answer to stamping out many copies of an enemy, coin or bullet.",
    ),

    // ── Lesson 5 · UI and player experience ─────────────────────────────────
    mcq(
      5,
      'A health bar that stays on screen during play belongs to which part of the interface?',
      'The HUD',
      ['The pause menu', 'The settings screen', 'The title screen'],
      'The HUD is persistent information shown while the game runs. UI screens are the ones the player navigates.',
    ),
    mcq(
      5,
      'Where should HUD elements normally be placed?',
      'In the corners and along the edges, not over the centre of the play area',
      [
        'Directly over the player',
        'In the centre of the screen',
        'Behind the game world',
      ],
      'A HUD must never block the area the player most needs to watch.',
    ),
    mcq(
      5,
      'What does "affordance" mean for a UI element?',
      'Its appearance hints at how it can be used, such as a raised rectangle that looks clickable',
      [
        'How much memory the element needs',
        'Whether the element is free of charge',
        'How fast the element animates',
      ],
      'Learned conventions make a rectangle with a border and centred text look like a button before anyone reads it.',
    ),
    mcq(
      5,
      'Why should a button visibly react when the mouse hovers over it or clicks it?',
      "It confirms the interaction was registered, so players don't doubt their click",
      [
        'It makes the game load faster',
        'It hides the button',
        'It changes the game state automatically',
      ],
      'Without hover and click feedback, players are unsure whether the click registered and start double-clicking.',
    ),

    // ── Lesson 6 · Playtesting and iteration ────────────────────────────────
    mcq(
      6,
      "Why can't you playtest your own game alone?",
      'You already know every layout and hazard, so you cannot see the game as a first-time player does',
      [
        'Playtesting needs two computers',
        'A developer cannot press the keys',
        'Games can only be tested after they are published',
      ],
      'You have built up invisible expertise. External playtesters surprise you with things you never anticipated, and that is the point.',
    ),
    mcq(
      6,
      'Which of these is the best playtest question?',
      '"Which part took you the most tries?"',
      [
        '"Wasn\'t that level fun?"',
        '"Did you like level 2?"',
        '"You found the exit easily, didn\'t you?"',
      ],
      'Specific, non-leading questions produce actionable answers. Leading questions invite a polite lie.',
    ),
    codeOut(
      6,
      'python',
      `deaths = [(5, 2), (5, 2), (9, 4), (5, 2), (7, 1)]
counts = {}
for spot in deaths:
    counts[spot] = counts.get(spot, 0) + 1
hotspot = max(counts, key=counts.get)
print(hotspot, counts[hotspot])`,
      '(5, 2) 3',
      ['(9, 4) 1', '(5, 2) 5', '(7, 1) 1'],
      'The loop counts how often each position appears. (5, 2) appears three times, so it is the death hotspot — a likely sign of an unfair or unclear hazard.',
      'Each pair is where a player died. What does this hotspot finder print?',
    ),
    mcq(
      6,
      'A playtester is stuck on a puzzle. What should you do?',
      'Stay silent and take notes, because being stuck is the data',
      [
        'Explain the solution straight away',
        'Take the controller and finish the level',
        'Stop the test and fix the puzzle immediately',
      ],
      'Helping erases the exact information the playtest exists to capture.',
    ),

    // ── Lesson 7 · Performance ──────────────────────────────────────────────
    mcq(
      7,
      'What is the first rule of performance work?',
      'Measure first (profile), then optimise only what is actually slow',
      [
        'Rewrite the whole game in a faster language',
        'Optimise whatever feels slow',
        'Remove all of the sprites',
      ],
      'Even experienced developers guess wrong about bottlenecks. clock.get_fps(), time.perf_counter() and cProfile show where time really goes.',
    ),
    codeOut(
      7,
      'python',
      `fps = 50
budget_ms = 1000 / fps
print(budget_ms)`,
      '20.0',
      ['50.0', '0.02', '2.0'],
      'A frame budget is the time available for everything in one frame: 1000 ms ÷ 50 frames = 20 ms. (At 60 FPS the budget is about 16.7 ms.)',
      'A game runs at 50 frames per second. How many milliseconds does each frame have, to do all of its work? What is printed?',
    ),
    mcq(
      7,
      'What does object pooling do?',
      'It creates a fixed set of reusable objects up front and recycles them instead of constantly creating and destroying new ones',
      [
        "It stores all of the game's objects on disk",
        'It deletes objects that are off-screen for good',
        'It draws every object twice for smoothness',
      ],
      'Allocation and garbage collection have a real cost, so a bullet-hell game reuses inactive bullets.',
    ),
    mcq(
      7,
      'Which of these is a classic per-frame performance mistake?',
      'Loading a font or image inside the game loop instead of once at startup',
      [
        'Storing the score in a variable',
        'Drawing a sprite once per frame',
        'Calling clock.tick(60) once per frame',
      ],
      'Expensive setup should happen once, outside the loop, and then be reused.',
    ),

    // ── Lesson 8 · Polish and submission ────────────────────────────────────
    mcq(
      8,
      'Which of these is an example of polish rather than a new feature?',
      'Making every button react to hover and flashing the player when they take damage',
      [
        'Adding a new boss level',
        'Adding multiplayer',
        'Rewriting the physics engine',
      ],
      'Polish is the accumulation of small, cheap details applied consistently — feedback effects, edge-case handling and tuned timing.',
    ),
    mcq(
      8,
      'What does "scope discipline" mean?',
      'Knowing when a feature is good enough to ship rather than endlessly tinkering',
      [
        'Adding as many features as possible before the deadline',
        'Limiting the game to one level',
        'Never changing a design once it has been decided',
      ],
      'Finishing and shipping a polished smaller game beats an unfinished bigger one.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'A "hard" game takes skill, while an "unfair" game gives the player no way to see or avoid the danger.',
      true,
      'Keep hazards visible and give players time to react so that difficulty stays fair.',
    ),
    tf(
      2,
      'In a "teach" section, a designer should introduce one new idea at a time.',
      true,
      'Two new mechanics at once makes it hard for a player to learn either.',
    ),
    tf(
      3,
      'Setting `game.player.health = 999` from a debug menu respects encapsulation, because the debug menu is part of the game.',
      false,
      "It reaches into the object's internals and skips the logic in take_damage(). Call a method instead.",
    ),
    tf(
      4,
      'A Rigidbody with no Collider will still collide with the floor in Unity.',
      false,
      'Without Colliders, objects have no physical shape for collisions, so they can fall or pass through other objects.',
    ),
    tf(
      5,
      'Giving each screen its own button style keeps players alert and is good UI practice.',
      false,
      'Consistency teaches the player once what a button looks like. Changing styles forces them to re-learn on every screen.',
    ),
    tf(
      6,
      'Telemetry can reveal patterns, such as many players dying at the same spot, without watching every session personally.',
      true,
      'Automatically logged events turn individual stories into patterns across many sessions.',
    ),
    tf(
      7,
      'Checking every object against every other object for collisions stays fast even with thousands of objects.',
      false,
      'That approach is O(n²): doubling the objects roughly quadruples the checks.',
    ),
    tf(
      8,
      'Screen shake is applied only when the frame is drawn, so collision checks and object positions are unaffected.',
      true,
      'This keeps the juice effect purely visual and the game logic unchanged.',
    ),
    tf(
      8,
      'Systematic edge-case testing means deliberately trying to break your own game — mashing keys, hitting every screen edge, retrying immediately.',
      true,
      'Every crash you find first is a crash a stranger will never hit.',
    ),
    tf(
      8,
      'Polish is optional extra credit and can be skipped without anyone noticing.',
      false,
      'An unpolished game reads as unfinished. Polish is a required phase near the end of development.',
    ),
  ],
});

// Position 3 of the Game Creator Final Test (Advanced Game Design is not part
// of the Odyssey, so it has no stage or Odyssey share).
export const advancedGameDesignExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'A game feels too hard, so the designer changes the asteroid speed, spawn rate and damage all at once. What is the problem?',
        'Nobody can tell which change caused the improvement or the frustration',
        [
          'Changing speed is not allowed in a game loop',
          'Spawn rates can only be changed by playtesters',
          'The core loop will stop working',
        ],
        'Escalate one variable at a time (for example speed, then spawn rate) so each change can be judged on its own.',
      ),
      mcq(
        1,
        'Why should every loss of health be paired with a flash, a sound or some other clear signal?',
        'Otherwise players will not understand why they are being punished',
        [
          'It makes the health bar bigger',
          'It saves the game automatically',
          'It speeds up the next level',
        ],
        'Feedback must be instant and visible to feel meaningful.',
      ),
      mcq(
        2,
        'Why does a good difficulty curve include easier "breather" sections?',
        'Constant maximum tension exhausts players, and breathers let them feel their growing mastery',
        [
          'Easy sections are quicker to build',
          'Players are not allowed to fail twice in a row',
          'They let designers skip the Test stage',
        ],
        'Think of a staircase with landings: a hard section, a breather, then a harder section than before.',
      ),
      codeOut(
        3,
        'python',
        `class Inventory:
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)

class Player:
    def __init__(self):
        self.inventory = Inventory()

hero = Player()
hero.inventory.add("key")
hero.inventory.add("map")
print(len(hero.inventory.items))`,
        '2',
        ['0', '1', 'Inventory'],
        'Player has an Inventory (composition). Two items are added to it, so the list holds two entries.',
        'A Player owns an Inventory object. What does this code print?',
      ),
      mcq(
        4,
        "Why apply forces or set a Rigidbody's velocity instead of directly setting `transform.position`?",
        'Setting the position directly bypasses the physics and can cause jittery, unrealistic collisions',
        [
          'Setting the position is not possible in C#',
          'Forces make the object invisible',
          'transform.position only works on UI elements',
        ],
        'Let the physics engine move physics objects; it then handles collisions correctly.',
      ),
      mcq(
        5,
        'The HUD health bar turns red when health drops below 40%. Which UX idea is this?',
        'Visual hierarchy — the HUD escalates urgency as danger increases, without a text warning',
        [
          'Affordance — the bar looks clickable',
          'Object pooling — the bar is recycled',
          'Encapsulation — the bar hides its value',
        ],
        'Colour, size and motion draw the eye to the information the player needs most right now.',
      ),
      mcq(
        6,
        'What is confirmation bias in game development?',
        'Only noticing feedback that confirms what you already believed, and ignoring data that contradicts it',
        [
          'Asking playtesters to confirm their name',
          'Testing a feature twice before keeping it',
          'Confirming that the game saved correctly',
        ],
        'A repeated death hotspot is real signal even if you personally never struggled there.',
      ),
      mcq(
        7,
        'When a pooled object is reused, why must all of its state be reset?',
        'A recycled object that keeps old state will behave like its previous use',
        [
          'Pooled objects cannot be reused otherwise',
          'The garbage collector requires it',
          'Resetting makes the object invisible',
        ],
        "Forgetting to reset a value such as a bullet's velocity causes subtle bugs.",
      ),
    ],
    trueFalse: [
      tf(
        8,
        'Juice effects such as screen shake add feel without changing what a hit actually does.',
        true,
        'A hit still deals the same damage whether or not the screen shakes, but it feels much more impactful.',
      ),
    ],
  },
};
