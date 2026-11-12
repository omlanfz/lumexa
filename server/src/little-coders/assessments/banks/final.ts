// FILE PATH: server/src/little-coders/assessments/banks/final.ts
//
// FINAL ASSESSMENT — the whole Little Coders program. Same standardized shape as every course
// assessment (10 MCQ + 5 True/False + one 25-mark practical), but cumulative: the topic of each
// question is its COURSE (1–5), two questions per course. There are two practical versions —
// SCRATCH_AI (Stretch3) and PYTHON (EduBlocks) — and an admin chooses the assigned version before
// the assessment, so nobody has to switch platforms during the test.

import { bank, mcq, practical, pyCode, scratchCode, tf } from '../lc-bank.helpers';

export const finalBank = bank({
  id: 'lc/final-test/little-coders',
  title: 'Little Coders — Final Assessment',
  kind: 'FINAL',
  mcq: [
    mcq('identify', 'EASY', 1, 'Which block makes a sprite change to the next picture in its costume list?', '`next costume`', ['`next backdrop`', '`change size by (10)`', '`move (10) steps`'], 'Next costume shows the next picture in the sprite’s costume list. Next backdrop changes the scene behind the sprites.'),
    mcq('predict', 'MEDIUM', 1, 'A sprite starts at x: -100. What happens when the green flag is clicked?', 'It ends at x: 0 and says Arrived!', ['It ends at x: -75 and says Arrived!', 'It ends at x: 25 and says Arrived!', 'It ends at x: 0 and says nothing'], 'The repeat block adds 25 to x four times: -100 + 100 = 0. Then the sprite says Arrived!', {
      code: scratchCode('events| when green flag clicked', 'motion| go to x: (-100) y: (0)', 'control| repeat (4)', '  motion| change x by (25)', 'looks| say [Arrived!] for (2) seconds'),
    }),
    mcq('identify', 'MEDIUM', 2, 'Which block checks whether the up arrow key is being held down right now?', '`key [up arrow] pressed?`', ['`when [up arrow] key pressed`', '`change y by (10)`', '`touching [edge]?`'], 'Key pressed? is a yes-or-no question. Put it in an if block inside a forever loop to check it all the time.'),
    mcq('sequence', 'HARD', 2, 'The player catches stars one at a time. When does “You win!” appear?', 'After the score reaches 3', ['As soon as the green flag is clicked', 'After the score reaches 6', 'After 3 seconds'], 'The wait until block holds the script until the score is 3. Then the win message is broadcast and the receiving script says it.', {
      code: scratchCode('events| when green flag clicked', 'variables| set [score] to (0)', 'control| wait until {(score) = (3)}', 'events| broadcast [win]', 'events| when I receive [win]', 'looks| say [You win!] for (2) seconds'),
    }),
    mcq('concept', 'EASY', 3, 'What does an image classification model need so it can tell an apple from a banana?', 'Lots of example pictures for each class', ['A list of rules written as code', 'Only the names Apple and Banana', 'A very fast computer and no examples'], 'A model learns from examples. The more varied pictures it sees of each class, the better it can tell them apart.'),
    mcq('sequence', 'MEDIUM', 3, 'Which order is right for building a project that reacts to your own AI model?', 'Record examples, train the model, test it, then export the share link', ['Export the share link, record examples, then train the model', 'Test the model, record examples, then train it', 'Train the model, then record examples, then test it'], 'A model needs examples before it can be trained, and it should be tested before you share it. The link comes last.'),
    mcq('concept', 'EASY', 5, 'Why do programmers put repeated blocks into a function?', 'So the blocks can be written once and used many times', ['So the program runs slower', 'So the blocks are hidden from the user', 'So the computer forgets the blocks'], 'A function is a recipe you write once. Calling it again is quicker than copying the blocks.'),
    mcq('predict', 'MEDIUM', 4, 'What does this program print?', 'Wait\n50', ['Go\n50', 'Wait\n40', 'Go\n40'], '40 is not bigger than or equal to 50, so the else part prints Wait. Then fuel + 10 is 50.', {
      code: pyCode('variables| fuel = 40', 'variables| need = 50', 'logic| if fuel >= need:', '  statements| print( "Go" )', 'logic| else:', '  statements| print( "Wait" )', 'statements| print( fuel + 10 )'),
      verify: { stdout: 'Wait\n50' },
    }),
    mcq('predict', 'HARD', 5, 'What does this program print?', 'Mars0\nVenus1', ['Mars\nVenus', 'Mars1\nVenus2', '0Mars\n1Venus'], 'The loop uses the index i. label( "Mars", 0 ) joins Mars and 0, and label( "Venus", 1 ) joins Venus and 1.', {
      code: pyCode('functions| def label( planet, number ):', '  functions| return planet + str( number )', 'lists| names = ["Mars", "Venus"]', 'loops| for i in range( len( names ) ):', '  statements| print( label( names[i], i ) )'),
      verify: { stdout: 'Mars0\nVenus1' },
    }),
    mcq('mistake', 'HARD', 4, 'The user types 9, but Python stops with an error on the print line. What is the mistake?', 'age is text, so it needs int( ) before adding 1', ['print cannot add numbers', 'input needs a second question', 'age must be written in capital letters'], 'input always gives text. Adding a number to text causes an error. Wrap the input in int( ) first.', {
      code: pyCode('variables| age = input( "How old are you?" )', 'statements| print( age + 1 )'),
      verify: { inputs: ['9'], error: 'TypeError' },
    }),
  ],
  trueFalse: [
    tf('EASY', 1, 'A hat block is where a Scratch script starts.', true, 'Hat blocks such as “when green flag clicked” wait for an event and start the script.'),
    tf('EASY', 3, 'An AI model can recognise classes it was never shown any examples of.', false, 'A model only learns what is in its examples. It cannot recognise a class it has never seen.'),
    tf('MEDIUM', 2, 'A forever loop with an if touching? block inside lets a game keep checking for hits.', true, 'The loop runs again and again, so the touching question is asked all the time.'),
    tf('MEDIUM', 4, 'In Python, = stores a value and == compares two values.', true, 'Use one = to set a variable and two == to ask whether two values are equal.'),
    tf('HARD', 5, 'A function runs its blocks as soon as it is defined, before it is called.', false, 'The def only stores the function. Its blocks run when the function is called.'),
  ],
  practicals: [
    practical('SCRATCH_AI', 'Voice Rocket Rescue', 'Stretch3 (Scratch + TM2Scratch)', {
      platform: 'STRETCH3',
      brief: [
        'Your teacher gives you a prepared sound model link. It already knows three spoken words: Go, Stop and Home. You do not need to train anything.',
        'Build a voice-controlled rescue game in Stretch3. The player speaks to fly a rocket and catch a star before time runs out.',
        'Use built-in sprites from the Scratch library, such as the Rocketship and the Star.',
      ],
      blocks: [
        { category: 'TM2Scratch (extension)', blocks: ['sound classification model URL [ ]', 'when received sound label [ ]'] },
        { category: 'Events', blocks: ['when green flag clicked'] },
        { category: 'Control', blocks: ['forever', 'if < > then', 'stop [all]'] },
        { category: 'Variables', blocks: ['set [ ] to ( )', 'change [ ] by ( )'] },
        { category: 'Sensing', blocks: ['touching [ ]?', 'timer', 'reset timer'] },
        { category: 'Operators', blocks: ['pick random ( ) to ( )', '( ) > ( )'] },
        { category: 'Motion', blocks: ['change x by ( )', 'go to x: ( ) y: ( )'] },
      ],
      requirements: [
        'When the green flag is clicked, the sound model loads and the variables score and moving are set to 0.',
        'The words Go and Stop use sound-label events to start and stop the rocket moving.',
        'The word Home sends the rocket back to its starting position.',
        'While the rocket is moving, a loop keeps moving it and checks whether it touches the Star.',
        'Touching the Star adds 1 to score and sends the Star to a random place.',
        'The game stops with a message when the timer passes a limit that you choose.',
      ],
      starter: {
        required: true,
        kind: 'MODEL_URL',
        label: 'Prepared sound model link (Go, Stop, Home)',
        url: '',
        note: 'Admin: paste the shareable link of a verified sound model with the classes Go, Stop and Home (and Background Noise). Until it is added, students are told their teacher will share the link.',
        modelLabels: ['Go', 'Stop', 'Home'],
      },
      bonus: ['Add a third word of your own that makes the rocket go faster.'],
      handIn: 'Save your project from Stretch3 (File → Save to your computer) and upload the .sb3 file, and/or paste your shareable project link.',
    }),
    practical('PYTHON', 'Mission Log Generator', 'EduBlocks', {
      platform: 'EDUBLOCKS',
      brief: [
        'Build a Python program in EduBlocks that writes a mission log for a space crew.',
        'It asks the commander’s name, goes through a list of mission tasks, and uses a function and a random number to decide how each task went.',
        'You choose the tasks and the messages.',
      ],
      blocks: [
        { category: 'Imports / Random', blocks: ['import random', 'random.randint( )'] },
        { category: 'Statements', blocks: ['print( )', 'input( )'] },
        { category: 'Lists', blocks: ['list [ ]'] },
        { category: 'Functions', blocks: ['def name( parameter ):', 'function call'] },
        { category: 'Loops', blocks: ['for ... in ...:'] },
        { category: 'Logic', blocks: ['if', 'else', 'compare ( == )'] },
        { category: 'Variables', blocks: ['variable = value', 'variable += value'] },
      ],
      requirements: [
        'The program asks for the commander’s name with input.',
        'A list holds at least 3 mission tasks.',
        'A function with a parameter reports the result of one task.',
        'A for loop calls the function once for every task in the list.',
        'Inside the function, a random number and an if / else decide whether the task was a success or needs another try.',
        'A variable counts the successes, and the final message uses the commander’s name and the number of successes.',
      ],
      starter: { required: false, kind: 'NONE', label: '', url: '', note: '', modelLabels: [] },
      bonus: ['Print the commander’s name in capital letters in the final message.'],
      handIn: 'Download your program from EduBlocks as a .py file and upload it, and/or upload a screenshot of your blocks and output, and/or paste a shareable link.',
    }),
  ],
});
