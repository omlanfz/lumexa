// FILE PATH: server/src/assessments/bank/course-tests/roblox-world-builder.ts
//
// Game Creator Path → "Roblox World Builder" (8 lessons, 3 projects: Obstacle
// Course Scoring, Multiplayer Arena Teams, Custom Game World NPCs).
// Topics: 1 Studio, Explorer & services · 2 scripting basics in Luau ·
// 3 LocalScripts, Humanoid & input · 4 scoring, leaderstats & ModuleScripts ·
// 5 client/server & RemoteEvents · 6 lighting, particles, sound & tweens ·
// 7 testing & debugging · 8 publishing safely.
//
// Code answers use plain Lua only (no Roblox APIs), kept to the subset Luau and
// Lua 5.4 agree on, and are executed by the bank verifier.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

export const robloxWorldBuilder = bank({
  id: 'course-test/roblox-world-builder',
  title: 'Roblox World Builder — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Studio, the Explorer and services ────────────────────────
    mcq(
      1,
      "Which service is the safe home for scripts that must never be visible to, or changed by, players' devices — such as scoring?",
      'ServerScriptService',
      ['ReplicatedStorage', 'StarterGui', 'Workspace'],
      "Scripts in ServerScriptService only ever run on the server, and nothing in it is sent to clients, so it cannot be cheated from a player's device.",
    ),
    mcq(
      1,
      'You press Play and a Part you built falls off the map. Which property did you most likely forget to set?',
      '`Anchored`, which should be true so physics does not move the Part',
      [
        '`Size`, which should be larger',
        '`Name`, which should match the script',
        '`Color`, which should be darker',
      ],
      'An unanchored Part is affected by gravity and physics. Static structures such as floors and walls should be anchored.',
    ),
    mcq(
      1,
      'Where do `LocalScript` objects live so that each player gets a copy of them at runtime?',
      'StarterPlayer → StarterPlayerScripts',
      ['ServerStorage', 'ServerScriptService', 'Lighting'],
      'StarterPlayerScripts holds client-side control code that is copied to each player when they join.',
    ),
    mcq(
      1,
      "Which Studio panel shows and lets you edit the selected object's settings, such as Size, Color and Anchored?",
      'Properties',
      ['Explorer', 'Output', 'Toolbox'],
      'The Explorer shows the tree of objects; the Properties panel shows the dials and switches of whichever object is selected.',
    ),

    // ── Lesson 2 · Scripting basics in Luau ─────────────────────────────────
    codeOut(
      2,
      'lua',
      `local colorSequence = { "red", "green", "blue" }
print(#colorSequence, colorSequence[1])`,
      '3 red',
      ['3 green', '2 red', '3 nil'],
      'The # operator gives the length of the table (3), and Luau arrays start at index 1, so colorSequence[1] is "red".',
    ),
    codeOut(
      2,
      'lua',
      `local function greet(name)
    return "Hello, " .. name .. "!"
end

print(greet("Nova"))`,
      'Hello, Nova!',
      ['Hello, name!', 'Hello, + Nova + !', 'nil'],
      'The parameter name receives "Nova" when the function is called, and .. joins (concatenates) the pieces of text.',
    ),
    mcq(
      2,
      "Why is a `while true do` loop started with `task.spawn` in the lesson's beacon script?",
      'So the loop runs in the background and the rest of the script, such as connecting `Touched`, still runs',
      [
        'Because while loops are not allowed in a Script',
        'So the loop runs faster than a normal loop',
        'Because `task.spawn` removes the need for `task.wait`',
      ],
      'An infinite loop in the main body would block everything below it from ever running.',
    ),
    mcq(
      2,
      'In a Script inserted inside a Part called `Beacon`, what does `script.Parent` refer to?',
      'The Beacon Part — the Instance the Script is nested under',
      [
        'The whole Workspace',
        'The first player in the game',
        'The Script itself',
      ],
      'script.Parent is whatever the script sits inside in the Explorer.',
    ),

    // ── Lesson 3 · Player mechanics ─────────────────────────────────────────
    mcq(
      3,
      'Why should responsive movement controls, such as a sprint key, live in a LocalScript?',
      "It runs on the player's own device, so input is handled with no delay waiting for the server",
      [
        "LocalScripts can change other players' characters",
        'Server Scripts cannot use any numbers',
        'LocalScripts run on every device at once',
      ],
      'The client and the server are separate programs. Input happens on the client, so handling it there feels instant.',
    ),
    mcq(
      3,
      'What does `Humanoid.WalkSpeed` control?',
      'How fast the character walks (16 by default)',
      [
        'How high the character jumps',
        'How much health the character has',
        'How fast the camera turns',
      ],
      'WalkSpeed is the movement speed. JumpPower or JumpHeight controls jumping, and Health is separate.',
    ),
    mcq(
      3,
      'Why does the sprint script use guard flags such as `isBoosting` and `isOnCooldown`?',
      'They stop the function from running twice at once, so mashing the key cannot stack the boost',
      [
        'They make the Humanoid walk faster',
        'They let the server see the key press',
        'They disconnect the InputBegan event permanently',
      ],
      'A guard flag is a boolean that records "this is already happening", so repeated key presses are ignored until it clears.',
    ),
    mcq(
      3,
      'Why does the sprint script reset the WalkSpeed inside `player.CharacterAdded`?',
      'Every respawn creates a new character, so a leftover boost could carry over or point at a destroyed Humanoid',
      [
        'CharacterAdded makes the character move faster',
        'The server deletes the LocalScript on death',
        'WalkSpeed can only be changed during a respawn',
      ],
      'Connecting to CharacterAdded makes the setup run again for each new character.',
    ),

    // ── Lesson 4 · Scoring and ModuleScripts ────────────────────────────────
    mcq(
      4,
      "What makes a value appear on Roblox's built-in player list?",
      'A Folder named exactly "leaderstats" inside the Player, containing value objects such as IntValue',
      [
        'Any script that prints the score',
        'A part in Workspace named Score',
        'A ModuleScript with a table called leaderboard',
      ],
      'leaderstats is a convention the engine watches for. The name is case-sensitive.',
    ),
    codeOut(
      4,
      'lua',
      `local ScoreManager = {}
local scores = {}

function ScoreManager.addScore(name, amount)
    scores[name] = (scores[name] or 0) + amount
    return scores[name]
end

ScoreManager.addScore("Nova", 10)
print(ScoreManager.addScore("Nova", 5))`,
      '15',
      ['5', '10', 'nil'],
      'The first call stores 10 for Nova; the second adds 5 to the stored value, returning 15. (scores[name] or 0 starts a new player at zero.)',
      'This is the shape of a ScoreManager module. What does the code print?',
    ),
    mcq(
      4,
      'What does "server-authoritative" scoring mean?',
      'Only the server may change scores, because the server has the final say on anything that affects fairness',
      [
        "Each player's device decides its own score",
        'Scores are stored on the leaderboard website only',
        'The score is chosen by whichever player joins first',
      ],
      'If clients could write scores, any player could cheat. Scoring code therefore lives only in server Scripts and ModuleScripts that servers require.',
    ),
    mcq(
      4,
      'Why is `player:FindFirstChild("leaderstats")` safer than `player.leaderstats`?',
      'It returns nil instead of raising an error when the folder does not exist yet',
      [
        'It creates the folder when it is missing',
        'It makes the score larger',
        'It works on the client but not the server',
      ],
      'Right at join time the folder might not exist yet. Checking for nil lets the code return early instead of crashing.',
    ),

    // ── Lesson 5 · Multiplayer networking ───────────────────────────────────
    mcq(
      5,
      'What is the only sanctioned way for a client to ask the server to do something?',
      'Fire a RemoteEvent',
      [
        "Call the server Script's function directly",
        'Edit a value in ServerStorage',
        "Change a Part's Name",
      ],
      'Client and server are two separate programs. A RemoteEvent is the message channel between them.',
    ),
    mcq(
      5,
      'In `remote.OnServerEvent:Connect(function(player, amount) … end)`, where does `player` come from?',
      'Roblox supplies it automatically as the first argument — it is the verified sender',
      [
        'The client chooses it when it fires the event',
        'It is always the first player who joined',
        'It is read from the leaderstats folder',
      ],
      'A client cannot fake who it is, so the player argument is trustworthy even when the other arguments are not.',
    ),
    mcq(
      5,
      'A client fires `remote:FireServer(9999)` to claim a score. What should the server do?',
      'Validate the request, or ignore the number, instead of trusting it',
      [
        "Add 9999 to the player's score",
        'Give every player 9999',
        'Kick the player automatically',
      ],
      '"Never trust the client" is the key multiplayer security rule. The server decides what is allowed.',
    ),
    mcq(
      5,
      'A RemoteEvent is placed in ServerScriptService. What goes wrong?',
      'Clients cannot see it, so they cannot fire it',
      [
        'The event fires twice',
        'The server cannot see it',
        'It stops all other scripts',
      ],
      'RemoteEvents belong in ReplicatedStorage, which both the server and every client can see.',
    ),

    // ── Lesson 6 · World design and aesthetics ──────────────────────────────
    mcq(
      6,
      'Which `Lighting` property changes the time of day?',
      '`ClockTime`',
      ['`FogEnd`', '`Ambient`', '`Brightness`'],
      'ClockTime runs from 0 to 24, so 18 gives a warm 6 PM sunset look. The other properties change fog, shadow colour and light strength.',
    ),
    mcq(
      6,
      'How do you make a one-time burst of sparkles when a checkpoint is touched?',
      'Keep the ParticleEmitter disabled and call `:Emit(count)` when the checkpoint is touched',
      [
        'Leave the emitter enabled with a high Rate',
        'Insert a new Sound every time',
        'Set Lighting.ClockTime to zero',
      ],
      'An emitter that stays enabled produces a constant stream. Emit(30) fires exactly 30 particles once.',
    ),
    mcq(
      6,
      'What does `TweenService` do?',
      'Smoothly animates a property from its current value to a target value over time',
      [
        'Sends messages between the client and the server',
        'Saves the game to Roblox',
        'Detects which keys are pressed',
      ],
      'A TweenInfo sets the duration and easing curve, and the property glides instead of snapping.',
    ),
    mcq(
      6,
      'In game design, what does "juice" mean?',
      'Small feedback effects — flashes, sounds, particles — that make actions feel rewarding',
      [
        'The amount of memory a game uses',
        'The colour palette of the lighting',
        'The speed of the server',
      ],
      'Juice is the polish that makes players feel their actions have impact.',
    ),

    // ── Lesson 7 · Testing and debugging ────────────────────────────────────
    codeOut(
      7,
      'lua',
      `local ok, result = pcall(function()
    return 10 + nil
end)
print(ok, type(result))`,
      'false string',
      ['true number', 'false nil', 'true nil'],
      'Adding nil to a number is an error. pcall catches it and returns false plus the error message, which is a string.',
      'pcall runs a function safely. What does this code print?',
    ),
    mcq(
      7,
      'What does orange text in the Output window usually mean?',
      'A `warn()` message — often an early sign of a problem such as a missing object',
      [
        'A normal print() message',
        'The game has been published',
        'An error that has already been fixed',
      ],
      'Warnings are easy to ignore but often point to a race condition or missing object that will become a real bug.',
    ),
    mcq(
      7,
      'Why should multiplayer features be tested with multiple test clients?',
      'Many multiplayer bugs only appear when two or more real Player objects are in the game',
      [
        'One client cannot run LocalScripts',
        'Extra clients make scripts run faster',
        'Test clients publish the game automatically',
      ],
      'Remotes, teams and scoring across players cannot be properly checked with a single player.',
    ),
    mcq(
      7,
      'What is a race condition?',
      'A bug caused by things happening in an unexpected order, such as reading a value before another script has set it up',
      [
        'A bug that happens only when two players compete in a race',
        'A script that runs too slowly',
        'An error caused by a misspelled variable name',
      ],
      'Defensive checks such as FindFirstChild and early returns protect against the order of events being different from what you expected.',
    ),

    // ── Lesson 8 · Publishing safely ────────────────────────────────────────
    mcq(
      8,
      'What is the difference between "Publish to Roblox" and "Publish to Roblox As…" for an experience that is already published?',
      '"Publish to Roblox" updates the same experience; "Publish As…" creates a new, separate one',
      [
        '"Publish As…" updates the experience; the other creates a copy',
        'They are two names for the same action',
        '"Publish to Roblox" deletes the old experience',
      ],
      'Using the wrong one can accidentally split your work across several disconnected experiences.',
    ),
    mcq(
      8,
      'Why might a young developer keep an experience on Friends or restricted access while testing?',
      'Public lets anyone on Roblox, including strangers, join — so a game should be ready and appropriate first',
      [
        'Public games cannot be edited later',
        'Friends-only games run faster',
        'Restricted access removes the need to test',
      ],
      'Going Public is a bigger responsibility, so follow family, school and platform safety guidance about who can access your work.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      "StarterGui holds ScreenGui interface objects that are copied to every player's screen when they join.",
      true,
      "Interface objects placed in StarterGui appear on each player's own screen.",
    ),
    tf(
      2,
      'In Luau, the `..` operator joins strings together.',
      true,
      'For example, "Hello, " .. name joins the two pieces of text.',
    ),
    tf(
      3,
      'A LocalScript placed directly in Workspace reliably runs for every player.',
      false,
      'LocalScripts belong in places such as StarterPlayerScripts. Placed elsewhere they will not reliably run for every player.',
    ),
    tf(
      4,
      'A ModuleScript returns a table, which other scripts can use by calling `require()`.',
      true,
      'A ModuleScript does not run by itself; it is a reusable library that other scripts load with require.',
    ),
    tf(
      5,
      'A client can make the server think a different player fired a RemoteEvent by changing the first argument it sends.',
      false,
      'Roblox always supplies the real sender as the first argument of OnServerEvent, and a client cannot fake it.',
    ),
    tf(
      6,
      'A Sound with an empty or invalid SoundId stops the game with a loud error message.',
      false,
      'It simply fails silently — no error, just no sound — which makes it an easy mistake to miss.',
    ),
    tf(
      7,
      'Wrapping every risky line in `pcall` and ignoring the result is good defensive coding.',
      false,
      'pcall should be used deliberately, with a warn() so that failures are still visible. Silencing every error hides real bugs.',
    ),
    tf(
      8,
      'After fixing a bug in Studio, players see the fix right away without you re-publishing.',
      false,
      'Players only get what has been published, so re-publish after making a fix.',
    ),
    tf(
      8,
      'Collaborator permissions control who can edit the place in Studio, separately from who can play it.',
      true,
      'Studio access and play access are different settings.',
    ),
    tf(
      8,
      'Printing a version string such as GAME_VERSION when the server starts helps confirm which published version is running.',
      true,
      'It is a small, professional habit that saves confusion when debugging a live game.',
    ),
  ],
});

// Position 1 of the Game Creator Final Test, position 3 of Odyssey Stage 3 and
// position 9 of the Odyssey Final Test.
export const robloxWorldBuilderExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'After typing dimensions into the wrong box, a Part appears in a strange place. Which two properties were mixed up?',
        'Position (world coordinates) and Size (dimensions)',
        ['Anchored and Transparency', 'Name and Color', 'Material and Shape'],
        'Position says where the Part is; Size says how big it is. Swapping them is a common beginner mistake.',
      ),
      codeOut(
        2,
        'lua',
        `local score = 0
for i = 1, 4 do
    score = score + i
end
print(score)`,
        '10',
        ['6', '4', '0'],
        'A numeric for loop includes both ends, so i takes the values 1, 2, 3 and 4, which add up to 10.',
      ),
      mcq(
        2,
        'Why do Roblox scripts connect functions to events instead of constantly checking whether something happened?',
        'Roblox calls the connected function automatically when the event fires, so the script does not waste time polling',
        [
          'Events are the only way to print to the Output window',
          'A script can only contain one function',
          'Constant checking is not allowed in Luau',
        ],
        'Event-driven scripting is the backbone of every interactive mechanic, such as Touched and PlayerAdded.',
      ),
      mcq(
        3,
        'In `InputBegan:Connect(function(input, gameProcessedEvent) …)`, what does `gameProcessedEvent == true` tell the script?',
        "The game's own interface already used that input (for example, typing in chat), so the script should ignore it",
        [
          'The player is holding the key down',
          'The key was pressed by another player',
          'The script has crashed',
        ],
        'Returning early when gameProcessedEvent is true avoids reacting to keys the player typed into a text box.',
      ),
      codeOut(
        4,
        'lua',
        `local players = { "Nova", "Orion", "Vega" }
local joined = {}
for index, name in ipairs(players) do
    joined[#joined + 1] = index .. ":" .. name
end
print(table.concat(joined, ", "))`,
        '1:Nova, 2:Orion, 3:Vega',
        [
          '0:Nova, 1:Orion, 2:Vega',
          'Nova, Orion, Vega',
          '1:Nova 2:Orion 3:Vega',
        ],
        'ipairs counts from 1, and table.concat joins the pieces with the separator ", ".',
      ),
      mcq(
        5,
        'Which call sends a message from the server to every connected client?',
        '`FireAllClients`',
        ['`FireServer`', '`OnServerEvent`', '`FireClient`'],
        'FireClient reaches one player; FireAllClients broadcasts to everyone; FireServer goes from a client to the server.',
      ),
      mcq(
        6,
        'Why should a tweened Part normally stay anchored?',
        'A tween sets properties directly, which can conflict with physics acting on an unanchored Part',
        [
          'Anchored Parts cannot be seen',
          'Tweens only work on Sounds',
          'Physics cannot move anchored Parts at all, so tweens are unnecessary',
        ],
        'Unless you want physics and the tween both to apply, keep the tweened Part anchored.',
      ),
      mcq(
        7,
        'What does `pcall(fn)` return when `fn` runs without any error?',
        'true, followed by the value that fn returned',
        [
          'false, followed by nil',
          'Only the value that fn returned',
          'true, followed by the error message',
        ],
        'On success you get true and the result; on failure you get false and the error message.',
      ),
      mcq(
        8,
        'You fix a bug in Studio, but a friend still sees it in the live game. What is the most likely reason?',
        'The fix was never re-published',
        [
          "The bug can only be fixed on the friend's device",
          'Studio fixes are applied automatically',
          'The friend needs Collaborator access',
        ],
        'Changes in Studio only reach players once the place has been published again.',
      ),
    ],
    trueFalse: [
      tf(
        6,
        '`FindFirstChildOfClass("ParticleEmitter")` finds a child by its class rather than by its name.',
        true,
        'This is handy because ParticleEmitters are usually left with their default name.',
      ),
      tf(
        3,
        'A server Script can use UserInputService.InputBegan to reliably detect which key a particular player pressed.',
        false,
        "Input belongs in a LocalScript on the player's own device. The server has no direct view of each player's keyboard.",
      ),
    ],
  },
  stage: {
    mcq: [
      mcq(
        1,
        'Which service holds models that are hidden from clients entirely until you spawn them?',
        'ServerStorage',
        ['ReplicatedStorage', 'StarterGui', 'StarterPlayer'],
        'ServerStorage is like Workspace but never visible to clients, so it is good for models waiting to be spawned.',
      ),
      mcq(
        1,
        'What does the Workspace service hold?',
        'Everything physically present and simulated in the 3D world, such as parts, models and terrain',
        [
          'Only the scripts that run on the server',
          'Only the interface shown on each screen',
          'Only the sounds in the game',
        ],
        'Workspace is the physical world; scripts and interfaces are kept in other services.',
      ),
      codeOut(
        2,
        'lua',
        `local lives = 3

local function loseLife()
    lives = lives - 1
    return lives
end

loseLife()
print(loseLife())`,
        '1',
        ['2', '3', '0'],
        'The function changes the same local variable each time it is called: 3 → 2 on the first call and 2 → 1 on the second, which is printed.',
      ),
      mcq(
        2,
        'Which line correctly joins a name into a greeting?',
        '`print("Hello, " .. name)`',
        [
          '`print("Hello, " + name)`',
          '`print("Hello, " & name)`',
          '`print("Hello, " , + name)`',
        ],
        'Luau joins strings with .. — the + operator is only for arithmetic.',
      ),
      mcq(
        3,
        'What is the `HumanoidRootPart` of a character?',
        "The invisible part that the other body parts are welded to, which determines the character's position",
        [
          "The part that stores the player's score",
          'The camera attached to the head',
          "The part that holds the Humanoid's sounds",
        ],
        'Everything else in the character model follows the HumanoidRootPart.',
      ),
      codeOut(
        4,
        'lua',
        `local awarded = {}

local function award(userId)
    if awarded[userId] then
        return 0
    end
    awarded[userId] = true
    return 10
end

print(award(7) + award(7) + award(8))`,
        '20',
        ['30', '10', '0'],
        'Player 7 earns 10 the first time and 0 the second (the guard stops point farming); player 8 earns 10: 10 + 0 + 10 = 20.',
        'The awarded table is a per-player guard. What does this code print?',
      ),
      mcq(
        5,
        'What is `FireClient(player, …)` used for?',
        'The server sending a message to one specific player',
        [
          'A client sending a message to the server',
          'The server sending a message to every player',
          'One client sending a message to another client',
        ],
        'FireClient targets one player; FireAllClients targets everyone.',
      ),
      mcq(
        6,
        'What does `Lighting.ClockTime = 18` do?',
        'Sets the time of day to 6 PM, giving a warm sunset look',
        [
          'Sets the brightness to 18',
          'Makes the fog 18 studs thick',
          'Waits 18 seconds',
        ],
        'ClockTime is measured from 0 to 24 hours.',
      ),
      mcq(
        7,
        'A sound effect plays twice every time a Part is touched. What is the most likely cause?',
        'The same event was connected twice, usually because setup code ran more than once',
        [
          'The Sound is too loud',
          'The Part is unanchored',
          'The server has too many players',
        ],
        'Duplicate connections run the function once for each connection. Make sure setup runs only once, or disconnect old connections first.',
      ),
      mcq(
        8,
        'Which access setting is best while a game is still being tested?',
        'Friends only, or a restricted level that only invited collaborators can join',
        [
          'Public, so everyone can give feedback',
          'Public with the name hidden',
          'No access setting is needed',
        ],
        'Keep early projects limited until they are ready and appropriate to share widely.',
      ),
    ],
    trueFalse: [
      tf(
        2,
        'Luau programmers prefer `local` variables to globals, because a local variable only exists within its scope.',
        true,
        'Local variables avoid naming collisions and are faster.',
      ),
      tf(
        3,
        'The default WalkSpeed of a Humanoid is 100.',
        false,
        'The default WalkSpeed is 16, not 100. A higher value makes the character move faster.',
      ),
      tf(
        6,
        'A Sound parented to a Part plays positionally: louder near the Part and quieter far away.',
        true,
        'That makes it ideal for point-of-interest feedback such as a checkpoint.',
      ),
      tf(
        8,
        'Setting an experience to Public is a small decision, because only your friends can find it.',
        false,
        'Public means anyone on Roblox, including strangers, can discover and join it.',
      ),
    ],
  },
  odyssey: {
    mcq: [
      codeOut(
        2,
        'lua',
        `local t = { 10, 20, 30 }
print(t[2] + #t)`,
        '23',
        ['22', '13', '33'],
        't[2] is the second item (20) because arrays start at 1, and #t is the length (3): 20 + 3 = 23.',
      ),
      mcq(
        4,
        'A student names the folder "LeaderStats" instead of "leaderstats". What happens?',
        "Roblox doesn't recognise the name, so the values don't show on the built-in player list",
        [
          'Nothing — capital letters are ignored',
          'The server crashes',
          'The scores are stored twice',
        ],
        'The folder name is case-sensitive and must be exactly "leaderstats".',
      ),
    ],
    trueFalse: [
      tf(
        4,
        "A LocalScript should write each player's Score.Value, because it feels faster than waiting for the server.",
        false,
        'Scores must be server-authoritative. A client-written score can be cheated and must never be trusted.',
      ),
    ],
  },
};
