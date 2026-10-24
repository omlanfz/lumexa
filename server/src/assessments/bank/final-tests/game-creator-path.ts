// FILE PATH: server/src/assessments/bank/final-tests/game-creator-path.ts
//
// Game Creator Path — Final Test: 25 MCQ + 5 True/False drawn from the
// pathway's three modules (Roblox World Builder, Python Arcade Games, Advanced
// Game Design) plus one ~15-minute Pygame logic project the teacher marks.

import { composeBank, project } from '../bank.helpers';
import { advancedGameDesignExtras } from '../course-tests/advanced-game-design';
import { pythonArcadeGamesExtras } from '../course-tests/python-arcade-games';
import { robloxWorldBuilderExtras } from '../course-tests/roblox-world-builder';

export const gameCreatorFinal = composeBank({
  id: 'final-test/game-creator-path',
  title: 'Game Creator Path — Final Test',
  type: 'FINAL_TEST',
  slices: [
    robloxWorldBuilderExtras.final,
    pythonArcadeGamesExtras.final,
    advancedGameDesignExtras.final,
  ],
  codingProject: project({
    key: 'P01',
    title: 'Coin Collector Rules',
    language: 'python',
    instructions: `You are writing the rules for a small coin-collecting game. There is no window to draw: you only need the game logic, using pygame.Rect objects. You have about 15 minutes. The starter code creates the player, the coins and the hazards. Write code that:

1. Defines collect_coins(player, coins), which removes every coin that touches the player from the coins list and RETURNS how many were collected.
2. Defines count_hazard_hits(player, hazards), which RETURNS how many hazards overlap the player.
3. Gives 10 points for each coin collected, and takes 1 life for each hazard hit. Lives must never go below 0.
4. Sets the game state to "GAME_OVER" if lives reach 0, otherwise keeps it as "PLAYING".
5. Prints the number of coins collected, the coins left, the score, the lives and the state.

Be careful not to remove items from a list while you are looping over that same list. Use clear names and put the 10 points in a named constant.`,
    starterCode: `import pygame

COIN_POINTS = 10  # points for each coin collected

player = pygame.Rect(100, 100, 40, 40)
coins = [
    pygame.Rect(110, 110, 20, 20),
    pygame.Rect(300, 100, 20, 20),
    pygame.Rect(130, 90, 20, 20),
]
hazards = [
    pygame.Rect(120, 120, 30, 30),
    pygame.Rect(400, 400, 30, 30),
]

score = 0
lives = 3
state = "PLAYING"


# 1. collect_coins(player, coins)


# 2. count_hazard_hits(player, hazards)


# 3. Update the score and lives, then 4. update the state


# 5. Print the results
`,
    rubric: [
      {
        criterion: 'Collision functions',
        maxPoints: 6,
        lookFor:
          'Both functions use colliderect (or an equivalent overlap test) and RETURN a number rather than printing it. With the starter data collect_coins returns 2 (the first and third coins touch the player) and count_hazard_hits returns 1.',
      },
      {
        criterion: 'Safe removal from the list',
        maxPoints: 4,
        lookFor:
          'The coins list is changed without removing items from it while looping over that same list — for example by building a new list of the remaining coins, looping over a copy, or using the group-collision style. One coin should remain afterwards.',
      },
      {
        criterion: 'Score, lives and game state',
        maxPoints: 6,
        lookFor:
          'Score becomes 20 (10 per coin using the named constant), lives go from 3 to 2 and never drop below 0 (max(0, …) or an equivalent check), and the state is "PLAYING" (it would be "GAME_OVER" if lives reached 0).',
      },
      {
        criterion: 'Readability and output',
        maxPoints: 4,
        lookFor:
          'Prints all five results clearly, uses meaningful names, keeps the logic inside functions or well-ordered sections, and adds short comments. Award full marks only if the program would run as written.',
      },
    ],
  }),
});
