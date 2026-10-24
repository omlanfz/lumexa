// FILE PATH: server/src/assessments/bank/course-tests/python-arcade-games.ts
//
// Game Creator Path → "Python Arcade Games" (8 lessons, 3 projects: Space
// Shooter, Maze Runner with Timer, Brick Breaker Clone).
// Topics: 1 Python basics for games · 2 the game loop · 3 sprites & groups ·
// 4 collision detection · 5 enemy AI, waves & scoring · 6 sound · 7 game states ·
// 8 project structure & sharing.
//
// Code answers that use pygame only touch Rect/Sprite/Group logic (no window or
// audio device is needed), so the bank verifier can run them.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

const PYGAME = { requires: ['pygame'] };

export const pythonArcadeGames = bank({
  id: 'course-test/python-arcade-games',
  title: 'Python Arcade Games — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Python basics for games ──────────────────────────────────
    codeOut(
      1,
      'python',
      `class Ship:
    def __init__(self, name):
        self.name = name
        self.fuel = 100

    def burn(self, amount):
        self.fuel = max(0, self.fuel - amount)

ship = Ship("Voyager")
ship.burn(70)
ship.burn(70)
print(ship.fuel)`,
      '0',
      ['-40', '30', '100'],
      'The first burn leaves 30. The second would give -40, but max(0, …) clamps the value so fuel can never go below zero.',
    ),
    mcq(
      1,
      'Inside a class method, what does `self` refer to?',
      'The particular object the method is being called on',
      [
        'The class itself, shared by all objects',
        'The first argument the caller passes in',
        'The module that contains the class',
      ],
      'self lets each object keep its own attributes — every Ship has its own self.fuel.',
    ),
    mcq(
      1,
      'Inside a method, why must you write `self.fuel = self.fuel - 1` rather than `fuel = fuel - 1`?',
      "Only `self.fuel` is the object's attribute, so a plain local name would not update the Ship",
      [
        'Python forbids variables that are named fuel',
        'Methods can only change numbers that are written in capital letters',
        'The self version runs faster',
      ],
      'Attributes belong to the object through self. A plain name inside the method is a different, local variable.',
    ),
    codeOut(
      1,
      'python',
      `ticks = 3
for tick in range(1, ticks + 1):
    print("Tick", tick)`,
      'Tick 1\nTick 2\nTick 3',
      [
        'Tick 1\nTick 2',
        'Tick 0\nTick 1\nTick 2\nTick 3',
        'Tick 0\nTick 1\nTick 2',
      ],
      'range(1, ticks + 1) is deliberate: it starts at 1 and includes the final tick. range(1, ticks) would stop one short.',
    ),

    // ── Lesson 2 · The game loop ────────────────────────────────────────────
    mcq(
      2,
      'What are the steps of every frame of a game loop, in order?',
      'Handle events, update the game state, draw everything, then wait for the next frame',
      [
        'Draw everything, handle events, wait, then update the game state',
        'Update the game state, wait, handle events, then draw everything',
        'Wait for the next frame, draw everything, then handle events',
      ],
      'Whatever the game, this structure never changes: input → update → draw → tick.',
    ),
    mcq(
      2,
      'What does `clock.tick(60)` do?',
      'Caps the loop at 60 frames per second and returns the milliseconds since the previous call',
      [
        'Runs the loop exactly 60 times, then stops',
        'Waits 60 seconds',
        'Draws 60 sprites',
      ],
      'The returned value divided by 1000 is the delta time (dt) in seconds.',
    ),
    codeOut(
      2,
      'python',
      `SHIP_SPEED = 300
dt = 0.5
ship_x = 100
ship_x += SHIP_SPEED * dt
print(ship_x)`,
      '250.0',
      ['400', '150.0', '300.5'],
      'Movement is speed × time: 300 pixels per second × 0.5 seconds = 150 pixels, so 100 + 150 = 250.0.',
      'The ship moves for one frame that lasted 0.5 seconds. What does this code print?',
    ),
    mcq(
      2,
      'Why use `pygame.key.get_pressed()` rather than the `KEYDOWN` event for continuous movement?',
      'KEYDOWN fires only once per key press, which gives stuttery one-step movement',
      [
        'get_pressed() is the only way to detect a closed window',
        'KEYDOWN only works with the mouse',
        'get_pressed() draws the ship automatically',
      ],
      'get_pressed() reports the current state of every key each frame, so holding a key keeps the ship moving smoothly.',
    ),

    // ── Lesson 3 · Sprites and groups ───────────────────────────────────────
    mcq(
      3,
      'Which two attributes does a `pygame.sprite.Sprite` need to be drawn and used for collisions?',
      '`image` and `rect`',
      [
        '`score` and `health`',
        '`speed` and `direction`',
        '`group` and `state`',
      ],
      'image is what the sprite looks like (a Surface); rect is where it is and how big it is.',
    ),
    mcq(
      3,
      'What does `all_sprites.update(dt)` do?',
      'Calls update(dt) on every sprite in the group',
      [
        'Redraws the whole screen',
        'Updates only the first sprite in the group',
        'Removes every sprite from the group',
      ],
      'A Group lets you update or draw many sprites with a single call instead of looping by hand.',
    ),
    mcq(
      3,
      'Why does a Sprite subclass call `super().__init__()` first?',
      'To let Sprite set itself up (including group tracking) before you add your own attributes',
      [
        "To copy the parent class's image",
        'To make the sprite invisible',
        'To start the game loop',
      ],
      "Forgetting it leads to confusing errors, because the sprite's internal machinery was never initialised.",
    ),
    codeOut(
      3,
      'python',
      `import pygame

rect = pygame.Rect(0, 0, 44, 34)
rect.center = (100, 200)
print(rect.x, rect.y)`,
      '78 183',
      ['100 200', '56 166', '0 0'],
      'Positioning by the centre puts the left edge half a width to the left (100 − 22 = 78) and the top half a height above (200 − 17 = 183).',
      'What is printed when this code runs?',
      PYGAME,
    ),

    // ── Lesson 4 · Collision detection ──────────────────────────────────────
    codeOut(
      4,
      'python',
      `import pygame

a = pygame.Rect(0, 0, 50, 50)
b = pygame.Rect(40, 40, 50, 50)
c = pygame.Rect(60, 0, 20, 20)
print(a.colliderect(b), a.colliderect(c))`,
      'True False',
      ['False True', 'True True', 'False False'],
      'a covers x 0–49, and b starts at x = 40, so they overlap. c starts at x = 60, past the right edge of a (50), so there is no overlap.',
      'What is printed when this code runs?',
      PYGAME,
    ),
    mcq(
      4,
      'After `pygame.sprite.groupcollide(bullets, enemies, True, True)`, what has happened to a bullet and the enemy it overlaps?',
      'Both have been removed from their groups',
      [
        'Only the bullet has been removed',
        'Only the enemy has been removed',
        'Neither — the function only reports the hit',
      ],
      'The two True arguments (dokill1, dokill2) tell Pygame to remove matching sprites from both groups. The function also returns a dictionary of the hits.',
    ),
    mcq(
      4,
      'A new `Bullet` must be added to which groups?',
      'Both `bullets` (for collision checks) and `all_sprites` (for updating and drawing)',
      ['Only all_sprites', 'Only bullets', 'Only the enemies group'],
      'A sprite behaves correctly only if it is in every group that needs to handle it.',
    ),
    mcq(
      4,
      'Why is `keys[pygame.K_SPACE]` inside the update loop a poor way to shoot?',
      'Holding the key fires a new bullet every frame, around 60 per second',
      [
        'It cannot detect the space bar',
        'It only works once per game',
        'It deletes the other bullets',
      ],
      'Using KEYDOWN (fires once per press) or a cooldown timer limits the rate of fire.',
    ),

    // ── Lesson 5 · Enemies, AI and scoring ──────────────────────────────────
    mcq(
      5,
      'What does "AI" usually mean for an enemy in a 2D arcade game like this one?',
      'Small, readable rules — such as bouncing between the edges and shooting on a timer',
      [
        'A trained neural network',
        'A second game loop',
        "The player's own controls",
      ],
      'Rule-based logic like "if the timer is up, shoot" makes enemies feel alive with very little code.',
    ),
    codeOut(
      5,
      'python',
      `def shoot_interval(wave):
    return max(0.8, 2.5 - wave * 0.15)

print(shoot_interval(1), shoot_interval(20))`,
      '2.35 0.8',
      ['2.35 -0.5', '2.5 0.8', '2.35 2.35'],
      'At wave 1 the interval is 2.5 − 0.15 = 2.35. At wave 20 the formula would give −0.5, but max(0.8, …) clamps it to 0.8.',
      "This formula scales an enemy's firing interval with the wave number. What does the code print?",
    ),
    mcq(
      5,
      'An enemy bounces with `if self.rect.left <= 0 or self.rect.right >= SCREEN_WIDTH: self.direction *= -1`. What does `*= -1` do?',
      'Flips the direction from left to right (or right to left)',
      [
        "Doubles the enemy's speed",
        'Makes the enemy disappear',
        'Resets the enemy to the left edge',
      ],
      'Multiplying the direction (1 or −1) by −1 reverses it, giving a patrol with almost no code.',
    ),
    mcq(
      5,
      'Why does the Enemy class set a flag such as `want_to_shoot` instead of creating Bullet objects itself?',
      'It keeps Enemy independent of bullet and group management, which makes it easier to test and extend',
      [
        'Flags make the bullets faster',
        'Python does not allow one class to create another',
        'It stops the enemy from ever shooting',
      ],
      'Separating deciding (set a flag) from acting (the main loop spawns the bullet) avoids tight coupling between classes.',
    ),

    // ── Lesson 6 · Sound ────────────────────────────────────────────────────
    mcq(
      6,
      'Which Pygame tool is meant for long background music?',
      '`pygame.mixer.music`',
      ['`pygame.mixer.Sound`', '`pygame.draw`', '`pygame.event`'],
      'mixer.music streams one long track from disk. Sound objects are loaded into memory for short effects.',
    ),
    mcq(
      6,
      'What does "defensive loading" of sound files mean?',
      'Wrapping the loading in try/except so a missing file means silent gameplay instead of a crash',
      [
        'Loading every sound file twice',
        'Encrypting the sound files',
        'Deleting sounds that are not used',
      ],
      'Sound should be an enhancement, never a dependency. Store None on failure and check for it before playing.',
    ),
    mcq(
      6,
      'Which argument makes background music repeat forever?',
      '`loops=-1`',
      ['`loops=0`', '`loops=1`', '`volume=1.0`'],
      'Without loops=-1 the music plays once and stops.',
    ),
    mcq(
      6,
      'Why is playing a sound effect every frame while the player is touching a hazard a problem?',
      'It would restart the sound around 60 times per second, creating a noisy mess',
      [
        'It uses up the sound files',
        'It stops the music for good',
        'It makes the hazard disappear',
      ],
      'Trigger a sound when something happens (a hit starts), not on every frame that a condition remains true.',
    ),

    // ── Lesson 7 · Game states ──────────────────────────────────────────────
    mcq(
      7,
      'What is a state machine?',
      'A system that is always in exactly one of a fixed set of states, with rules for moving between them',
      [
        'A class that stores every sprite in the game',
        'A loop that runs the game at 60 frames per second',
        'A list of every key the player can press',
      ],
      'A game has a lifecycle — MENU, PLAYING, GAME_OVER — and the loop branches on the current state.',
    ),
    codeOut(
      7,
      'python',
      `class GameState:
    MENU = "menu"
    PLAYING = "playing"
    GAME_OVER = "game_over"

state = GameState.MENU
health = 0
if state == GameState.MENU:
    state = GameState.PLAYING
if state == GameState.PLAYING and health <= 0:
    state = GameState.GAME_OVER
print(state)`,
      'game_over',
      ['menu', 'playing', 'GameState.GAME_OVER'],
      'The two if statements run one after the other. The first moves MENU to PLAYING; the second then sees PLAYING with zero health and moves to GAME_OVER. The value printed is the string "game_over".',
      'This code moves through game states. What does it print?',
    ),
    mcq(
      7,
      'Why is a single `start_new_game()` method used for restarting?',
      'Every piece of session data (player, score, sprite groups) is rebuilt in one place, so nothing leaks from the last run',
      [
        'It makes the game load faster',
        "It resets the computer's clock",
        'It hides the menu from the player',
      ],
      'The most common restart bug is resetting some data but forgetting the rest, such as old bullets still flying.',
    ),
    mcq(
      7,
      'What bug appears if the update logic runs regardless of the current state?',
      'Enemies keep moving while the player is still on the menu or the game over screen',
      [
        'The window cannot be closed',
        'The sound stops playing',
        'The score is shown in the wrong colour',
      ],
      'Wrap gameplay updates in a check such as `if self.state == GameState.PLAYING`.',
    ),

    // ── Lesson 8 · Project structure and sharing ────────────────────────────
    mcq(
      8,
      'Why split a game into files such as settings.py, player.py, enemy.py and game.py?',
      'Each file has one job, and shared constants live in one place so a single change retunes the whole game',
      [
        'Python cannot run files longer than 100 lines',
        'Separate files make the game run faster',
        'Pygame only loads sprites from separate files',
      ],
      'Clean structure makes the project easier to read, change and share.',
    ),
    mcq(
      8,
      'Why build file paths with `os.path.dirname(__file__)` instead of hard-coding something like `C:\\Users\\you\\sounds\\shoot.wav`?',
      'A path built relative to the script works on any computer and from any starting folder',
      [
        'Hard-coded paths are slower to read',
        'dirname(__file__) compresses the sound files',
        'It lets the game run without a window',
      ],
      'A hard-coded path breaks the moment the game is moved to another computer.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'A function that returns a value is easier to reuse and test than one that only prints it.',
      true,
      'Returned values can be stored, compared and checked, whereas printed text cannot be used by the rest of the program.',
    ),
    tf(
      2,
      'If a game forgets to call `pygame.display.flip()`, the window can look blank or frozen even though the drawing code runs.',
      true,
      'flip() is what actually shows the finished frame on screen.',
    ),
    tf(
      3,
      "A sprite's `rect` is used only for drawing and is never used for collision detection.",
      false,
      "The rect gives both the sprite's position for drawing and the bounding box used for collisions.",
    ),
    tf(
      4,
      'Pixel-perfect collision is faster than rectangle collision, which is why it is used in almost every 2D game.',
      false,
      'Rect collision is the fast, simple choice and is good enough for almost every 2D game. Pixel-perfect collision is slower and rarely needed.',
    ),
    tf(
      5,
      'Because enemy "AI" in an arcade game means neural networks, an enemy needs training data before it can move.',
      false,
      'Arcade AI is rule-based logic such as timers, patrols and bounces.',
    ),
    tf(
      6,
      'Short sound effects that may overlap, such as lasers, should be streamed with `pygame.mixer.music`.',
      false,
      'Short effects belong in pygame.mixer.Sound objects, and mixer.music is for one long background track.',
    ),
    tf(
      7,
      'Mistyping a state as the string "mnu" silently fails every comparison, with no error message.',
      true,
      'Comparing strings just returns False, which is why named constants (a GameState class) are safer than scattered raw strings.',
    ),
    tf(
      8,
      'Pinning a version in a dependency list (such as pygame==2.6.1) helps other people recreate the same tested setup.',
      true,
      'Unpinned dependencies can pull in a later version with different behaviour.',
    ),
    tf(
      8,
      'A good README explains what the game is, how to run it and how to play it.',
      true,
      'The README is the first thing anyone sees, so it should answer those questions.',
    ),
    tf(
      8,
      'A README only needs a title, because players can work out the controls themselves.',
      false,
      'Controls, how to run the game and what it is all belong in the README.',
    ),
  ],
});

// Position 2 of the Game Creator Final Test, position 3 of Odyssey Stage 1 and
// position 3 of the Odyssey Final Test.
export const pythonArcadeGamesExtras: ModuleExtras = {
  final: {
    mcq: [
      codeOut(
        1,
        'python',
        `def check_status(fuel, hull):
    if hull <= 0:
        return "DESTROYED"
    elif fuel < 10:
        return "LOW FUEL"
    return "OK"

print(check_status(5, 80), check_status(50, 0))`,
        'LOW FUEL DESTROYED',
        ['OK DESTROYED', 'LOW FUEL OK', 'DESTROYED DESTROYED'],
        'The first call has hull 80 (not destroyed) and fuel 5 (below 10), so it returns "LOW FUEL". The second has hull 0, which is checked first, so it returns "DESTROYED".',
      ),
      mcq(
        2,
        'Where is `clock.tick(FPS)` normally called?',
        "Once per loop iteration, typically at the very top, so dt reflects the previous frame's duration",
        [
          'Only once, before the loop begins',
          "Inside every sprite's update method",
          'After the loop has ended',
        ],
        'Calling it once per frame both caps the frame rate and gives you the elapsed time.',
      ),
      mcq(
        3,
        'What does `self.image.get_rect(center=(x, y))` return?',
        'A Rect the same size as the image, positioned by its centre point',
        [
          'A copy of the image',
          'The colour at the centre of the image',
          "The sprite's speed",
        ],
        'It is a convenient way to place a sprite by its centre instead of its top-left corner.',
      ),
      codeOut(
        4,
        'python',
        `import pygame

rect = pygame.Rect(10, 10, 20, 20)
print(rect.collidepoint(15, 15), rect.collidepoint(30, 30))`,
        'True False',
        ['False True', 'True True', 'False False'],
        'The rectangle covers x and y from 10 up to, but not including, 30. The point (15, 15) is inside; (30, 30) sits on the excluded right and bottom edge.',
        'What is printed when this code runs?',
        PYGAME,
      ),
      mcq(
        5,
        'Why is the wave timer reset after a new wave spawns?',
        'Otherwise waves would trigger far more often than intended',
        [
          'Otherwise the player could not move',
          'Otherwise the sprites would lose their images',
          'Otherwise the window would close',
        ],
        'The timer counts up until the next wave is due, so it must start again from zero.',
      ),
      mcq(
        6,
        'Why is a missing sound file handled by storing `None` and checking it before every `.play()`?',
        'The game then runs normally without that sound, instead of crashing',
        [
          'It makes the sound louder',
          'It plays the sound twice',
          'It deletes the sound file',
        ],
        'This is what makes sound a pure enhancement, never a dependency.',
      ),
      mcq(
        7,
        'After Game Over, the player restarts and sees bullets from the previous run still flying. What went wrong?',
        'The restart routine forgot to reset the bullets group',
        [
          'The player pressed the wrong key',
          'The menu state was never created',
          'The bullets were drawn in the wrong colour',
        ],
        'Every piece of mutable session data must be recreated or cleared when a new game starts.',
      ),
      mcq(
        8,
        'Which of these should be kept out of version control?',
        'Generated output such as the dist/ and build/ folders',
        ['The main.py file', 'The README', 'The settings.py file'],
        'Generated files are not source code. A .gitignore keeps them (and __pycache__) out of the repository.',
      ),
    ],
    trueFalse: [
      tf(
        4,
        '`pygame.sprite.spritecollide(sprite, group, True)` removes the colliding members of the group.',
        true,
        'The third argument (dokill=True) removes every member of the group that collided with the sprite.',
      ),
      tf(
        6,
        '`pygame.mixer.music` is the right tool for a short laser sound that may overlap with itself.',
        false,
        'Short effects that can overlap use pygame.mixer.Sound. mixer.music plays one streamed track at a time.',
      ),
    ],
  },
  stage: {
    mcq: [
      mcq(
        1,
        'Why are constants such as `SCREEN_WIDTH` written in ALL_CAPS?',
        'By convention, to signal that they should not change while the game runs',
        [
          'Python only accepts capital letters for numbers',
          'It makes them run faster',
          'It makes them visible to other programs',
        ],
        'Python has no true constants, so ALL_CAPS is a naming convention that tells readers not to change the value.',
      ),
      codeOut(
        1,
        'python',
        `health = 30
hits = 0
while health > 0:
    health -= 12
    hits += 1
print(hits, health)`,
        '3 -6',
        ['2 6', '3 6', '2 -6'],
        'Health goes 30 → 18 → 6 → −6, which takes three hits. The loop only checks health > 0 at the top, so it can end below zero — which is why games often clamp health.',
      ),
      mcq(
        2,
        'What is delta time (`dt`) in a game loop?',
        "The time in seconds since the previous frame, used so speed doesn't depend on the frame rate",
        [
          'The total time the game has been running',
          'The number of sprites in the game',
          'The size of the window',
        ],
        'Multiplying speed by dt makes movement the same on a fast and a slow computer.',
      ),
      mcq(
        2,
        "Which event type is fired when the player clicks the window's close button?",
        '`pygame.QUIT`',
        ['`pygame.KEYDOWN`', '`pygame.MOUSEMOTION`', '`pygame.K_ESCAPE`'],
        'Checking for QUIT inside the event loop lets the game shut down cleanly.',
      ),
      mcq(
        3,
        'What does `all_sprites.draw(screen)` do?',
        "Draws every sprite in the group using each sprite's image and rect",
        [
          'Updates every sprite in the group',
          'Removes every sprite from the screen',
          'Saves the screen to a file',
        ],
        "Group.draw blits each sprite's image at the position given by its rect.",
      ),
      codeOut(
        4,
        'python',
        `import pygame

class Box(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.rect = pygame.Rect(x, y, 10, 10)

bullets = pygame.sprite.Group(Box(0, 0), Box(100, 0), Box(300, 0))
enemies = pygame.sprite.Group(Box(5, 5), Box(105, 5), Box(500, 500), Box(600, 600))
hits = pygame.sprite.groupcollide(bullets, enemies, True, True)
print(len(hits), len(bullets), len(enemies))`,
        '2 1 2',
        ['2 3 4', '1 1 2', '2 1 4'],
        'Two bullets overlap an enemy, so hits has two entries. Because both dokill arguments are True, those two bullets and two enemies are removed: 1 bullet and 2 enemies remain.',
        'This code checks bullets against enemies. What does it print?',
        PYGAME,
      ),
      mcq(
        5,
        'How does a simple patrol enemy behave at the edges of the screen?',
        'It reverses direction when it reaches the left or right edge',
        ['It disappears', 'It teleports to the player', 'It speeds up forever'],
        'Reversing direction at the boundaries creates believable patrol behaviour with almost no code.',
      ),
      mcq(
        6,
        'Which Pygame object plays short sound effects that may overlap, such as lasers?',
        '`pygame.mixer.Sound`',
        ['`pygame.mixer.music`', '`pygame.display`', '`pygame.time.Clock`'],
        'A Sound is loaded once and can be played as many times as needed, even overlapping itself.',
      ),
      mcq(
        7,
        'In which game state should the loop run enemy movement and collision checks?',
        'Only the PLAYING state',
        ['Every state', 'Only the MENU state', 'Only the GAME_OVER state'],
        'The same key and the same loop mean different things in different states, so gameplay updates are wrapped in a state check.',
      ),
      mcq(
        8,
        'What is the benefit of bundling a finished game into a single standalone executable file?',
        'Players can run it without needing Python or Pygame on their computer',
        [
          'The game runs faster than the Python version',
          'The source code is automatically improved',
          'It adds sound effects',
        ],
        'The bundle contains a private interpreter, your code and all of its dependencies.',
      ),
    ],
    trueFalse: [
      tf(
        1,
        'A function that returns a string is easier to test than one that only prints a message.',
        true,
        'A returned value can be compared with an expected result; printed text cannot.',
      ),
      tf(
        2,
        'Moving a sprite by a fixed number of pixels each frame (such as `ship_x -= 5`) gives the same speed on every computer.',
        false,
        'The speed would depend on how many frames per second each computer manages. Using speed × dt fixes that.',
      ),
      tf(
        4,
        '`rect.colliderect(other)` returns True when the two rectangles overlap at all.',
        true,
        'Everything else, such as spritecollide and groupcollide, is built on this same idea.',
      ),
      tf(
        4,
        'Pixel-perfect collision is needed for almost every 2D game, because rectangles are too inaccurate.',
        false,
        'Rectangle collision is good enough for almost every 2D game.',
      ),
    ],
  },
  odyssey: {
    mcq: [
      codeOut(
        3,
        'python',
        `import pygame

r = pygame.Rect(10, 20, 30, 40)
print(r.right, r.bottom)`,
        '40 60',
        ['30 40', '10 20', '60 40'],
        'right is x + width (10 + 30 = 40) and bottom is y + height (20 + 40 = 60).',
        'What is printed when this code runs?',
        PYGAME,
      ),
      mcq(
        5,
        'Why do arcade games use waves that get harder over time?',
        'A game that never gets harder gets boring, and one that is always brutal is frustrating',
        [
          'Waves are the only way to make sprites move',
          'Waves reduce the number of enemies on screen',
          'Waves stop the player from scoring',
        ],
        'Difficulty scaling keeps the pacing interesting: more enemies, faster movement, shorter firing intervals.',
      ),
      mcq(
        7,
        'What does `start_new_game()` do?',
        'Recreates all the mutable session data — player, score and sprite groups — from scratch',
        [
          'Closes the window',
          "Loads the next level's music",
          'Pauses the game',
        ],
        'Centralising the reset in one method is how leftover data from the last run is avoided.',
      ),
    ],
    trueFalse: [],
  },
};
