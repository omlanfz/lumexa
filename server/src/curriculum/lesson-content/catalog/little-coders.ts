// FILE PATH: server/src/curriculum/lesson-content/catalog/little-coders.ts
//
// Visuals AND knowledge checks for the Little Coders pathway (lineage keys
// "<module-slug>/<position>"). These lessons have no quiz of their own, so each gets
// a short, friendly knowledge check written for their age group — three multiple-choice
// questions with four options each, like every quiz question in Lumexa.

import { registerVisualCatalog, type CatalogSource } from '../visual-catalog';
import { registerQuizCatalog } from '../quiz-catalog';
import { blk, blocks, cards, checklist, flow, mcq, table, trace, tree, uiMap } from './helpers';

const source: CatalogSource = {
  // ── Scratch Adventures ───────────────────────────────────────────────────
  'scratch-adventures/1': [
    flow('robot-steps', 'Think Like a Coder', 'Three steps: you write exact steps like a recipe, the robot follows them in order without guessing, and something happens.', 'Coding is giving a computer exact steps.', ['You write the steps|like a recipe', 'The robot follows them|exactly, in order', 'Something happens!|and you see the result'], { perRow: 3 }),
  ],
  'scratch-adventures/2': [
    uiMap('scratch-map', 'Think Like a Coder', 'A map of the Scratch editor: the block palette on the left, the code area in the middle, the stage at the top right with the green flag and stop buttons, and the sprite list below the stage.', 'Tap a part to learn what it does.', [
      { id: 'palette', label: 'Block palette', desc: 'All the coding blocks, sorted into coloured groups like Motion, Looks and Sound.', x: 1, y: 3, w: 22, h: 90 },
      { id: 'code', label: 'Code area', desc: 'Drag blocks here and snap them together to build your script.', x: 25, y: 3, w: 40, h: 90 },
      { id: 'flag', label: '🏁 and ⏹', desc: 'The green flag starts your program. The red stop sign stops it.', x: 67, y: 3, w: 32, h: 10 },
      { id: 'stage', label: 'Stage', desc: 'Where your sprites perform. This is what your audience sees.', x: 67, y: 15, w: 32, h: 45 },
      { id: 'sprites', label: 'Sprite list', desc: 'All of your characters. Click one to choose which sprite you are coding.', x: 67, y: 62, w: 32, h: 31 },
    ], { title: 'The Scratch editor (sketch)' }),
  ],
  'scratch-adventures/3': [
    table('stage-map', 'The Stage Map', 'A table of the Scratch stage coordinates: the centre is 0, 0; the left and right edges are x of minus 240 and 240; the bottom and top edges are y of minus 180 and 180.', 'Every spot on the stage has an x and a y.', ['Place', 'x', 'y'], [['Centre', 0, 0], ['Right edge', 240, 0], ['Left edge', -240, 0], ['Top edge', 0, 180], ['Bottom edge', 0, -180]], { highlights: [{ row: 0, col: 1, tone: 'good' }, { row: 0, col: 2, tone: 'good' }] }),
    blocks('sprite-show', 'Your 3 Superpowers', 'A Scratch script in three colours: an event block, then a Motion block, a Looks block and a Sound block.', 'Motion (blue), Looks (purple) and Sound (pink) working together.', [{ title: 'A sprite show', blocks: [blk('event', 'when 🏁 clicked'), blk('motion', 'move 50 steps'), blk('looks', 'say Hello! for 2 seconds'), blk('sound', 'play sound Meow until done')] }]),
  ],
  'scratch-adventures/4': [
    blocks('broadcast-blocks', 'Broadcasting Is Like a Walkie-Talkie', 'Two Scratch scripts: one sprite broadcasts a message when the space key is pressed, and another sprite says something when it receives that message.', 'One sprite shouts, another listens.', [
      { title: 'Sprite 1', blocks: [blk('event', 'when space key pressed'), blk('event', 'broadcast go')] },
      { title: 'Sprite 2', blocks: [blk('event', 'when I receive go'), blk('looks', "say Let's go! for 2 seconds")] },
    ], { at: 'end' }),
  ],
  'scratch-adventures/5': [
    blocks('square-loop', 'Walk in a Square', 'Two versions of a script that draws a square: one repeats the same two blocks four times by hand, the other uses a repeat 4 loop.', 'A loop does the repeating for you.', [
      { title: 'Without a loop', blocks: [blk('motion', 'move 100 steps'), blk('motion', 'turn 90 degrees'), blk('motion', 'move 100 steps'), blk('motion', 'turn 90 degrees'), blk('motion', '… and so on, 4 times')] },
      { title: 'With a loop', blocks: [blk('control', 'repeat 4', [blk('motion', 'move 100 steps'), blk('motion', 'turn 90 degrees')])] },
    ], { at: 'end' }),
  ],
  'scratch-adventures/6': [
    tree('raining-tree', "What's a Condition", 'A simple decision: if it is raining take an umbrella, otherwise wear sunglasses.', 'A condition is a question with a yes or no answer.', { label: 'Is it raining?', children: [{ label: 'Yes → take an umbrella ☂️', tone: 'info' }, { label: 'No → wear sunglasses 😎', tone: 'warn' }] }),
    blocks('bounce-blocks', 'A Sprite That Bounces', 'A Scratch script that forever moves the sprite and, if it is touching the edge, turns it around.', 'forever + if = a sprite that makes decisions.', [{ title: 'Bounce', blocks: [blk('event', 'when 🏁 clicked'), blk('control', 'forever', [blk('motion', 'move 10 steps'), blk('control', 'if touching edge? then', [blk('motion', 'turn 180 degrees')])])] }], { at: 'end' }),
  ],
  'scratch-adventures/7': [
    flow('story-map', 'Plan Before You Build', 'A story plan: scene 1 leads to scene 2, which leads to a choice, and the choice leads to one of two endings.', 'A storyboard shows where each scene can go.', ['Scene 1', 'Scene 2', 'Choice', 'Ending A', 'Ending B'], { edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3, label: 'door' }, { from: 2, to: 4, label: 'window' }], perRow: 5 }),
  ],
  'scratch-adventures/8': [
    flow('game-plan', 'Plan Your Game First', 'The path to a finished game: plan it, build the score, build the win condition, put the full game together, and share it.', 'Small steps make a big game.', ['Plan it|on paper first', 'Score|a variable that counts', 'Win condition|a rule for winning', 'Full game|put it together', 'Share it|show your friends'], { perRow: 5 }),
  ],

  // ── Python for Young Builders ────────────────────────────────────────────
  'python-for-young-builders/1': [
    table('blocks-to-python', 'Think Like a Coder', 'A table matching Scratch blocks with the Python code that does the same job: say matches print, ask and wait matches input, and repeat matches a for loop.', 'Same ideas, new words.', ['In Scratch', 'In Python'], [['say Hello!', 'print("Hello!")'], ['ask and wait', 'input("Question? ")'], ['repeat 10', 'for i in range(10):'], ['if … then', 'if …:']]),
  ],
  'python-for-young-builders/2': [
    trace('input-trace', 'Think Like a Coder', 'Step through two lines of Python: input waits for the player to type a name, which is stored in a variable, and print then says hello.', 'A variable is a labelled box. input() fills it.', ['name = input("What is your name? ")', 'print("Hi", name)'], [
      { line: 1, vars: {}, note: 'Python asks the question and waits for you to type…' },
      { line: 1, vars: { name: 'Mia' }, note: 'You typed Mia. Now the box called name holds "Mia".' },
      { line: 2, vars: { name: 'Mia' }, output: 'Hi Mia', note: 'print uses what is in the box.' },
    ]),
  ],
  'python-for-young-builders/3': [
    table('fstring-compare', 'Your First F-String', 'A table showing that print with an f in front fills in the variable, while without the f it prints the curly brackets as they are.', 'Don’t forget the f!', ['Code', 'What shows on the screen'], [['print("Hi, {name}!")', 'Hi, {name}!'], ['print(f"Hi, {name}!")', 'Hi, Mia!']], { highlights: [{ row: 0, col: 1, tone: 'bad' }, { row: 1, col: 1, tone: 'good' }], title: 'name = "Mia"' }),
  ],
  'python-for-young-builders/4': [
    tree('grade-tree', 'Think Like a Coder', 'A decision tree for a grading machine: a score of 90 or more gives A, otherwise a score of 70 or more gives B, otherwise keep going.', 'if / elif / else is a decision tree.', { label: 'score >= 90 ?', children: [{ label: 'Yes → "A"', tone: 'good' }, { label: 'No → score >= 70 ?', children: [{ label: 'Yes → "B"', tone: 'info' }, { label: 'No → "Keep going!"', tone: 'warn' }] }] }),
  ],
  'python-for-young-builders/5': [
    trace('for-trace', 'Your First For Loop', 'Step through a for loop that prints Go three times while the counter goes from 0 to 2.', 'range(3) counts 0, 1, 2 — three times round.', ['for count in range(3):', '    print("Go!", count)'], [
      { line: 1, vars: { count: 0 }, note: 'First time round: count is 0.' },
      { line: 2, vars: { count: 0 }, output: 'Go! 0' },
      { line: 1, vars: { count: 1 }, note: 'Second time: count is 1.' },
      { line: 2, vars: { count: 1 }, output: 'Go! 1' },
      { line: 1, vars: { count: 2 }, note: 'Third time: count is 2.' },
      { line: 2, vars: { count: 2 }, output: 'Go! 2', note: 'range(3) has no more numbers, so the loop ends.' },
    ]),
    flow('while-cycle', 'Your First While Loop', 'A while loop checks its condition, runs the code inside if it is true, then checks again, and stops when the condition is false.', 'A while loop keeps asking: should I go round again?', ['Check the condition|is it still True?', 'Run the code inside|do the steps', 'Condition False?|leave the loop'], { layout: 'cycle', at: 'end' }),
  ],
  'python-for-young-builders/6': [
    table('list-index', 'Your First List', 'A list of three crew names with the numbers 0, 1 and 2 above them: counting in a list starts at zero.', 'The first item is at position 0, not 1.', ['index →', '0', '1', '2'], [['crew', '"Mia"', '"Leo"', '"Zoe"']], { highlights: [{ row: 0, col: 1, tone: 'good', note: 'crew[0] is "Mia"' }], title: 'crew = ["Mia", "Leo", "Zoe"]' }),
  ],
  'python-for-young-builders/7': [
    flow('quiz-app-flow', 'Think Like a Coder', 'The steps of a quiz app: ask a question, get the answer, check it, add to the score if right, repeat for each question, and show the final score.', 'Every quiz question goes through the same steps.', ['Ask the question|print / input', 'Check the answer|if answer == "..."', 'Add to the score|score = score + 1', 'Next question|repeat', 'Show the score|at the end'], { perRow: 5 }),
  ],
  'python-for-young-builders/8': [
    flow('lucky-number', 'A Model Game', 'The Lucky Number Game loop: the computer picks a secret number, the player guesses, the game says too high, too low or correct, and repeats until the guess is right.', 'A game is a loop with rules.', ['Pick a secret number|random', 'Player guesses|input()', 'Too high, too low, or right?|if / elif / else', 'Right? → win!|otherwise guess again'], { layout: 'cycle' }),
  ],

  // ── AI for Kids ──────────────────────────────────────────────────────────
  'ai-for-kids/1': [
    cards('rules-vs-learning', 'The Big Idea', 'Two cards: a normal program follows rules a person wrote, while AI learns patterns from lots of examples.', 'Two ways to make a computer do a job.', [
      { title: 'A normal program', badge: 'Rules', tone: 'info', bullets: ['A person writes every rule', 'Does exactly what the rules say'] },
      { title: 'Machine learning', badge: 'Examples', tone: 'good', bullets: ['Learns patterns from many examples', 'Can get things wrong — and can be taught more'] },
    ]),
  ],
  'ai-for-kids/2': [
    flow('train-cycle', 'Step-by-step', 'The cycle of training an image model: collect examples, label them, train the model, test it, then improve it with better examples and go round again.', 'Train, test, improve — then repeat.', ['Collect examples|photos of each thing', 'Label them|name each group', 'Train|let the computer learn', 'Test|try new pictures', 'Improve|add better examples'], { layout: 'cycle' }),
  ],
  'ai-for-kids/3': [
    flow('ml4kids-bridge', 'Steps', 'How Scratch uses a model trained in ML for Kids: train the model, a special Scratch block asks it about what it was shown, the model answers with a label, and your code reacts to that label.', 'Train it, ask it, react to the answer.', ['Train the model|in ML for Kids', 'Scratch asks it|a special block', 'It answers|with a label', 'Your code reacts|e.g. a broadcast'], { perRow: 4 }),
  ],
  'ai-for-kids/4': [
    table('rps-rules', "What's inside the game", 'The three rules of rock-paper-scissors: rock beats scissors, scissors beat paper, and paper beats rock.', 'The game checks these rules every round.', ['This one…', 'beats…'], [['rock', 'scissors'], ['scissors', 'paper'], ['paper', 'rock']]),
  ],
  'ai-for-kids/5': [
    cards('good-examples', 'Steps', 'Two cards: a sound model trained with many different voices, volumes and background noises works better than one trained with just two quiet recordings.', 'More varied examples make a stronger model.', [
      { title: 'Weak training', badge: 'Fragile', tone: 'bad', bullets: ['One voice, one volume', 'Only 2 recordings', 'Quiet room only'] },
      { title: 'Strong training', badge: 'Better', tone: 'good', bullets: ['Different voices and volumes', 'Many recordings of each word', 'Some background noise too'] },
    ]),
  ],
  'ai-for-kids/6': [
    flow('voice-story', "What's inside", 'How the voice story works: you say a phrase, the sound model picks a label, a broadcast is sent, and the story follows path A or path B.', 'Your voice chooses the path.', ['You say a phrase|or the stand-in', 'Sound model|picks a label', 'Broadcast|a message is sent', 'Story path A', 'Story path B'], { edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3, label: 'label A' }, { from: 2, to: 4, label: 'label B' }], perRow: 5 }),
  ],
  'ai-for-kids/7': [
    flow('mood-pipeline', 'Look at the code', 'How the virtual pet reacts: the camera sees a face, the model gives a mood label, and the pet changes to match.', 'The model gives a guess; the code decides what the pet does.', ['Camera sees a face|a picture', 'Model guesses a mood|a label', 'Pet reacts|happy, neutral or sad'], { perRow: 3 }),
  ],
  'ai-for-kids/8': [
    checklist('showcase-practice', 'Practice first!', 'A checklist to complete before presenting a project at the showcase.', 'Tick these off before you present. Saved on this device.', ['I said my three points out loud', 'I ran my project once before showing it', 'I know what it can do — and what it can’t do yet', 'I have a plan if something doesn’t work', 'I thanked the people who helped me'], { title: 'Ready to present?', at: 'end' }),
  ],
};

registerVisualCatalog(source);

// Short, friendly knowledge checks: three questions per lesson, each with four options.
// Question ids q1–q3 are stable: a stored copy of the first release's version of a question
// (which used other shapes) is replaced by the same id here.
registerQuizCatalog({
  'scratch-adventures/1': [
    mcq('q1', 'What is **code**?', ['A set of instructions a computer can follow', 'A secret password that unlocks the computer', 'A kind of video game you play on a screen', 'A type of computer screen that shows pictures'], 'Code is a list of instructions. A computer follows them exactly, in order.'),
    mcq('q2', 'Which sentence about computers is true?', ['A computer follows your steps exactly, in order', 'A computer guesses what you meant when a step is unclear', 'A computer fixes your mistakes by itself', 'A computer skips steps that look boring'], 'Computers follow instructions exactly. If the steps are unclear, they do the wrong thing — that is why coders are precise.'),
    mcq('q3', 'Which list of steps makes a sandwich in the right order?', ['Put the bread on the plate, add the filling, put the second slice on top', 'Add the filling, put the second slice on top, put the bread on the plate', 'Put the second slice on top, put the bread on the plate, add the filling', 'Add the filling, put the bread on the plate, put the second slice on top'], 'The order matters, just like in code.'),
  ],
  'scratch-adventures/2': [
    mcq('q1', 'Where do your sprites perform in Scratch?', ['The stage', 'The block palette', 'The sprite list', 'The menu bar'], 'The stage is where your sprites move and talk. The audience sees the stage.'),
    mcq('q2', 'What does the green flag do?', ['Starts your program', 'Deletes a sprite', 'Saves your project', 'Changes the costume'], 'Clicking the green flag runs every script that starts with “when 🏁 clicked”.'),
    mcq('q3', 'Which sentence about sprites is true?', ['A sprite is a character or object that you can program', 'A sprite is the colour of a Scratch block', 'A sprite is another word for the stage background', 'A sprite is a sound that you record yourself'], 'Sprites can be animals, people, objects — anything you can code to move, talk or change.'),
  ],
  'scratch-adventures/3': [
    mcq('q1', 'Which block belongs to the **Looks** superpower?', ['say Hello!', 'move 10 steps', 'play sound Meow', 'turn 15 degrees'], 'Looks blocks change how a sprite looks or what it says. Motion blocks move it and Sound blocks make noise.'),
    mcq('q2', 'What can happen if you change the order of the blocks in a script?', ['The sprite may do something different, as blocks run top to bottom', 'Nothing happens — the order of the blocks never matters at all', 'Scratch always puts them back into the right order for you', 'The script stops working until you reload the whole page'], 'Scratch runs blocks from top to bottom. Changing the order changes what happens.'),
    mcq('q3', 'Where is the centre of the Scratch stage?', ['x = 0, y = 0', 'x = 240, y = 180', 'x = −240, y = −180', 'x = 100, y = 100'], 'The middle of the stage is (0, 0). x goes left and right, y goes down and up.'),
  ],
  'scratch-adventures/4': [
    mcq('q1', 'What does a **hat block** (like “when space key pressed”) do?', ['Starts a script when something happens', 'Makes the sprite wear a hat on its head', 'Ends the program when it is finished', 'Plays a sound when the project loads'], 'A hat block waits for something — a key, a click, a message — and then runs the blocks under it.'),
    mcq('q2', 'What does **broadcast** do?', ['Sends a message that other scripts can hear', 'Shows the stage to everyone in the room', 'Makes the sprite louder when it talks', 'Saves the project onto the computer'], 'A broadcast is like a walkie-talkie message. Scripts with “when I receive” listen for it.'),
    mcq('q3', 'Which sentence about broadcasts is true?', ['More than one sprite can react to the same broadcast', 'Only one sprite can ever hear a broadcast', 'Only the sprite that sent it can hear it', 'A broadcast makes a sprite get louder and bigger'], 'Every script that is listening for that message will run — which is how you make a whole scene react.'),
  ],
  'scratch-adventures/5': [
    mcq('q1', 'Which block makes blocks run again and again?', ['repeat', 'say', 'turn', 'hide'], 'A loop block, like repeat or forever, runs the blocks inside it more than once.'),
    mcq('q2', 'To walk in a square, how many times do you repeat “move, then turn 90 degrees”?', ['4', '2', '3', '10'], 'A square has 4 sides and 4 corners.'),
    mcq('q3', 'Why do coders use loops?', ['A loop saves you from building the same blocks again', 'Loops make the stage bigger so more sprites fit', 'Loops are the only way to make a sprite move', 'Loops delete the blocks that you do not need'], 'One repeat block can do the work of many copied blocks — shorter code, fewer mistakes.'),
  ],
  'scratch-adventures/6': [
    mcq('q1', 'An **if** block runs the blocks inside it when…', ['the condition is true', 'the condition is false', 'the green flag is red', 'the sprite is hidden'], 'If the condition is true, the blocks inside run. If not, Scratch skips them.'),
    mcq('q2', 'What does an if/else block let a sprite do?', ['Choose between two different things', 'Run every block in the script twice', 'Hide the whole stage from the player', 'Play every sound in the project at once'], 'If the condition is true it does the first thing; otherwise it does the else part.'),
    mcq('q3', 'Which of these is a **condition** (a yes-or-no question)?', ['touching edge?', 'move 10 steps', 'play sound Meow', 'say Hello!'], 'A condition is a question the computer can answer with yes (true) or no (false).'),
  ],
  'scratch-adventures/7': [
    mcq('q1', 'Which order is best for building a story?', ['Draw a storyboard, build scene 1, build scene 2, add a player choice', 'Add a player choice, build scene 2, draw a storyboard, build scene 1', 'Build scene 2, add a player choice, build scene 1, draw a storyboard', 'Build scene 1, add a player choice, draw a storyboard, build scene 2'], 'Planning first makes building quicker.'),
    mcq('q2', 'What can switch your story from one scene to the next?', ['A broadcast message', 'A new sprite name', 'The stage size', 'The green flag colour'], 'A broadcast “turns the page”: the next scene’s scripts start when they receive it.'),
    mcq('q3', 'Why is it helpful to plan on paper before you build?', ['You can see the scenes and choices before building', 'Paper makes the finished code run much faster', 'Scratch will not start unless you have a plan', 'A plan makes the sprites move on their own'], 'A quick storyboard helps you see the scenes and choices before you place a single block.'),
  ],
  'scratch-adventures/8': [
    mcq('q1', 'Where does a game keep track of the score?', ['In a variable', 'In the costume', 'In the backdrop', 'In a sound'], 'A variable is a box with a name that holds a number — change it and the score changes.'),
    mcq('q2', 'What is a **win condition**?', ['A rule that decides when the player has won', 'A prize that you buy from the shop', 'A sprite that waves at the player', 'A loud sound that plays at the start'], 'For example: “if score = 10, then say You win!”.'),
    mcq('q3', 'Your game is not working the way you wanted. What is a good thing to do?', ['Test one small part at a time and fix what is wrong', 'Delete the whole game and start again straight away', 'Add lots more blocks until it works', 'Ignore it and share the game anyway'], 'Debug detectives look for the small part that is wrong and fix just that.'),
  ],

  'python-for-young-builders/1': [
    mcq('q1', 'What does this program show on the screen?', ['Hello!', 'print("Hello!")', '"Hello!"', 'Nothing'], 'print shows the words inside the quotes — without the quotes.', { language: 'python', code: 'print("Hello!")' }),
    mcq('q2', 'What kind of language is Python?', ['A text language: you type instructions, not drag blocks', 'A block-based language, where you snap blocks together', 'A language that can only be used to make games', 'A language that only computers can read, not people'], 'The ideas are the same as in Scratch, but you write them as words.'),
    mcq('q3', 'Which Python code does the same job as the Scratch block “say Hello!”?', ['print("Hello!")', 'input("Hello!")', 'for i in range(10):', 'if "Hello!":'], 'say in Scratch is print in Python; input asks a question, for repeats, if decides.'),
  ],
  'python-for-young-builders/2': [
    mcq('q1', 'What does this program show?', ['Mia', 'name', '"name"', 'Nothing'], 'The variable name holds "Mia", so print(name) shows Mia.', { language: 'python', code: 'name = "Mia"\nprint(name)' }),
    mcq('q2', 'What does `input()` do?', ['Waits for the user to type something', 'Prints a message on the screen', 'Ends the program straight away', 'Makes a list of the player\'s names'], 'input() pauses the program until the person types an answer and presses Enter.'),
    mcq('q3', 'What is a variable?', ['A labelled box that stores a value', 'A command that ends the program', 'A kind of loop that repeats forever', 'A picture that appears on the screen'], 'You give it a name, put a value inside, and use the name later.'),
  ],
  'python-for-young-builders/3': [
    mcq('q1', 'What does this show?', ['Hi, Leo!', 'Hi, {name}!', 'Hi, name!', 'Nothing'], 'The f in front tells Python to put the value of name inside the curly brackets.', { language: 'python', code: 'name = "Leo"\nprint(f"Hi, {name}!")' }),
    mcq('q2', 'What happens if you forget the **f** in an f-string?', ['It prints {name} instead of the value', 'Python crashes with an error straight away', 'It prints the value of the variable twice', 'Nothing is printed on the screen at all'], 'Without the f, the curly brackets are just ordinary text.'),
    mcq('q3', '`input()` always gives you text. Which function turns it into a whole number so you can do maths?', ['int()', 'print()', 'str()', 'len()'], 'int("5") becomes the number 5.'),
  ],
  'python-for-young-builders/4': [
    mcq('q1', 'What does this program show?', ['B', 'A', 'Keep going', 'Nothing'], '75 is not 90 or more, but it is 70 or more, so the elif part runs and shows B.', { language: 'python', code: 'score = 75\nif score >= 90:\n    print("A")\nelif score >= 70:\n    print("B")\nelse:\n    print("Keep going")' }),
    mcq('q2', 'What does `elif` mean?', ['“else, if this other condition is true”', '“end the loop and start again”', '“print the answer on the screen”', '“ask the user another question”'], 'elif lets you check another condition when the first one was False.'),
    mcq('q3', 'Which symbol checks whether two things are **equal**?', ['==', '=', '=>', '!'], 'One = stores a value in a variable; two == asks “are these equal?”.'),
  ],
  'python-for-young-builders/5': [
    mcq('q1', 'How many times does this print "Go!"?', ['3 times', '2 times', '4 times', 'Once'], 'range(3) gives 0, 1, 2 — three times round the loop.', { language: 'python', code: 'for i in range(3):\n    print("Go!")' }),
    mcq('q2', 'When does a **while** loop stop?', ['When its condition becomes False', 'After exactly 10 times', 'Never — it always runs forever', 'When the program is saved'], 'A while loop keeps going as long as its condition is True.'),
    mcq('q3', 'What can happen if the condition of a loop never changes?', ['The loop can run forever (an infinite loop)', 'The loop runs exactly once and then stops', 'Python deletes the loop from the program', 'The computer turns itself off to be safe'], 'Make sure something inside the loop can make the condition False.'),
  ],
  'python-for-young-builders/6': [
    mcq('q1', 'What does this show?', ['Mia', 'Leo', 'Zoe', 'crew'], 'List positions start at 0, so crew[0] is the first item, "Mia".', { language: 'python', code: 'crew = ["Mia", "Leo", "Zoe"]\nprint(crew[0])' }),
    mcq('q2', 'How do you add a new item to the end of a list?', ['crew.append("Kai")', 'crew.add("Kai")', 'print("Kai")', 'crew = "Kai"'], '.append() puts a new item at the end of the list.'),
    mcq('q3', 'What position number does the first item in a list have?', ['0', '1', '2', '-1'], 'Python counts from 0, so the first item is at position 0.'),
  ],
  'python-for-young-builders/7': [
    mcq('q1', 'How does the quiz app check whether an answer is right?', ['It compares the answer to the right one with ==', 'It guesses and hopes to be right', 'It prints the answer on the screen', 'It asks the same question again'], 'if answer == "paris": means “is what the player typed equal to the right answer?”.'),
    mcq('q2', 'What keeps track of how many answers were right?', ['A variable such as score', 'A comment that starts with #', 'A print statement on its own', 'A file name with .py on the end'], 'score = score + 1 adds one each time the player gets it right.'),
    mcq('q3', 'Which order do the steps of a quiz app go in?', ['Ask the question, get the answer, check if it is right, add to the score, show the final score', 'Show the final score, ask the question, add to the score, get the answer, check if it is right', 'Get the answer, show the final score, ask the question, check if it is right, add to the score', 'Check if it is right, ask the question, show the final score, get the answer, add to the score'], 'Each question follows these steps; the final score comes last.'),
  ],
  'python-for-young-builders/8': [
    mcq('q1', 'Which module helps a game pick a random secret number?', ['random', 'print', 'time', 'input'], 'import random lets you use random.randint(1, 10) to pick a number.'),
    mcq('q2', 'Why is a plan on paper useful before you code a game?', ['It shows what to build, and in what order', 'It makes the finished game run faster', 'Python will not start without a plan on paper', 'It makes your code shorter all by itself'], 'A short plan shows what you need to build, in what order.'),
    mcq('q3', 'You have one more hour to improve your game. Which is a good idea?', ['Add one new feature, such as a replay option, and test it', 'Delete the scoring so the game is simpler', 'Rename every variable to a single letter', 'Remove the instructions so players must guess'], 'Small, tested improvements make a game better without breaking it.'),
  ],

  'ai-for-kids/1': [
    mcq('q1', 'How does a machine learning AI learn?', ['From lots of examples', 'By reading minds', 'By guessing at random every time', 'It is born knowing everything'], 'Machine learning finds patterns in many examples — like lots of cat and dog pictures.'),
    mcq('q2', 'Which sentence about AI is true?', ['AI finds patterns in data and can still make silly mistakes', 'AI always understands things exactly like a human does', 'AI never makes a mistake, however hard the job', 'AI works without any data or examples at all'], 'AI can be very good at one job and still get things wrong.'),
    mcq('q3', 'Which of these uses AI?', ['A phone that understands your voice when you speak', 'A calculator that adds 2 + 2 when you press equals', 'A light switch that turns a lamp on and off', 'A paper book with pictures that never change'], 'Voice assistants learn from lots of recordings. A calculator or a light switch just follows fixed rules.'),
  ],
  'ai-for-kids/2': [
    mcq('q1', 'Why do we give the model many different examples?', ['So it learns what matters, not just one picture', 'To make the computer work more slowly', 'To fill up the computer\'s memory', 'So that the pictures look nice together'], 'With lots of different examples the model learns the pattern, not one particular photo.'),
    mcq('q2', 'What can you do if the model gets something wrong?', ['Add more and better examples, then train it again', 'Nothing — a model can never be improved', 'Delete all the photos and give up', 'Turn the computer off and on again'], 'Better examples make a better model — that is how you improve it.'),
    mcq('q3', 'Which order is right for training a model?', ['Collect examples, label them, train the model, test it, improve it', 'Train the model, collect examples, test it, label them, improve it', 'Test it, train the model, label them, collect examples, improve it', 'Improve it, test it, train the model, label them, collect examples'], 'Collect → label → train → test → improve.'),
  ],
  'ai-for-kids/3': [
    mcq('q1', 'When do you train the model?', ['First — then Scratch asks the trained model', 'After the Scratch project has finished running', 'Never — Scratch trains the model by itself', 'Only after you have shared the project'], 'The model learns in ML for Kids; Scratch then asks it questions.'),
    mcq('q2', 'What does the model give back to Scratch?', ['Its answer (a label) for what it was shown', 'A brand new sprite for your project', 'A different Scratch project to open', 'A sound effect to play at the end'], 'It answers with the label it thinks fits best.'),
    mcq('q3', 'What can your code do with the model’s answer?', ['Make sprites react, for example with a broadcast', 'Nothing at all — it is only for show', 'Delete the project to save space', 'Turn off the computer when it\'s done'], 'You can use the label like a condition: if the label is “happy”, do this.'),
  ],
  'ai-for-kids/4': [
    mcq('q1', 'Which pair is right in rock-paper-scissors?', ['Rock beats scissors', 'Scissors beat rock', 'Paper beats scissors', 'Rock beats paper'], 'Rock beats scissors, scissors beat paper, and paper beats rock.'),
    mcq('q2', 'Do the rules of rock-paper-scissors change from round to round?', ['No — the game checks the same three rules every time', 'Yes — the rules are random each round', 'Yes — the computer invents new rules', 'The rules only apply to the first round'], 'The rules stay the same; only the choices change.'),
    mcq('q3', 'Which idea would make a rock-paper-scissors game more fun?', ['Keep a score and play best of five', 'Remove the winner message', 'Let rock always win', 'Hide what the computer chose'], 'A score and a goal give the game something to aim for.'),
  ],
  'ai-for-kids/5': [
    mcq('q1', 'Why record each word more than once?', ['To give the model different examples of each word', 'To use up all of the storage space', 'So the words sound longer when played', 'It makes no difference to the model'], 'Different recordings teach the model what stays the same about a word.'),
    mcq('q2', 'Which sentence about background noise is true?', ['It can confuse a model that never heard noise in training', 'Sound models always ignore any background noise', 'Noise makes a sound model learn much faster', 'Noise only ever matters for picture models'], 'If it never heard noise in training, noise can make it guess wrong.'),
    mcq('q3', 'The sound model mixes up two words. What helps most?', ['More and better examples of each word', 'Turning the speaker volume right up', 'Deleting the project and starting over', 'Shouting the words much louder'], 'Add clear, varied examples of the words it mixes up, then train again.'),
  ],
  'ai-for-kids/6': [
    mcq('q1', 'What decides which path the story takes?', ['The label the sound model gives', 'The colour of the stage backdrop', 'A coin that the computer flips', 'The size of the main sprite'], 'The label from the model decides which broadcast is sent.'),
    mcq('q2', 'Which sentence about broadcasts in the voice story is true?', ['A broadcast can start a different part of the story', 'A broadcast deletes the story that came before', 'A broadcast only ever changes the colours', 'A broadcast ends the project for everyone'], 'Scripts listening for a broadcast run when it is sent.'),
    mcq('q3', 'How does your voice change the story?', ['The sound model gives a label that picks the story path', 'Your voice changes the colour of the stage and sprites', 'Your voice deletes all of the other story paths', 'Your voice makes all of the sprites bigger'], 'Voice → label → broadcast → story path.'),
  ],
  'ai-for-kids/7': [
    mcq('q1', 'What does the expression model look at?', ['A picture of a face', 'A person’s password', 'A person’s thoughts', 'A sound recording'], 'It looks at what the face looks like in the camera picture.'),
    mcq('q2', 'Does the expression model know how a person really feels inside?', ['No — it only guesses from how a face looks', 'Yes — it always knows exactly how they feel', 'Yes — it can read thoughts inside the head', 'Only when the person is smiling widely'], 'A smile does not always mean someone is happy, so the guess can be wrong.'),
    mcq('q3', 'Why should we be careful when AI guesses how people feel?', ['A smile does not always mean happy, so the guess can be wrong', 'AI is never wrong about how people are feeling', 'People never hide how they are really feeling', 'Faces never change from one moment to the next'], 'AI sees the face, not the feeling behind it.'),
  ],
  'ai-for-kids/8': [
    mcq('q1', 'What is a good thing to do before you present?', ['Practise out loud', 'Skip testing', 'Read from the screen the whole time', 'Change everything at the last minute'], 'Practising out loud helps you know what you want to say and how long it takes.'),
    mcq('q2', 'Is it good to say what your project cannot do yet?', ['Yes — honesty about limits shows you understand it', 'No — never mention any problems with your project', 'No — only ever say the good parts about it', 'Only if someone in the audience asks twice'], 'Honesty about limits is a sign of a good maker.'),
    mcq('q3', 'What is a good way to end your showcase?', ['Say what you are proudest of and thank your helpers', 'Say nothing and leave the room quietly', 'List every single mistake in a loud voice', 'Skip the demo and read all of the code aloud'], 'End on what you are proud of — and say thank you.'),
  ],
});
