// FILE PATH: server/src/curriculum/lesson-content/catalog/python-foundations.ts
//
// Visuals for the Python Foundations pathway. Keys are lineage keys: "<module-slug>/<position>".
// Everything drawn here is data validated by normalizeVisuals and drawn by the client from that
// data. Illustrative numbers are always captioned as illustrative; every code-trace below is
// the real behaviour of the lesson's own code.

import { registerVisualCatalog, type CatalogSource } from '../visual-catalog';
import { V, cards, checklist, compare, flow, sequence, table, trace, uiMap, walkthrough } from './helpers';

const source: CatalogSource = {
  // ── Course 1 · Python Programming Essentials ─────────────────────────────
  'python-programming-essentials/1': [
    flow('how-python-runs', 'Source code and the interpreter', 'A pipeline: you write source code in a .py file, the Python interpreter reads it, the computer carries it out, and the output appears on the screen.', 'From a file you write to output on the screen.', ['You write code|greeting.py|accent', 'Python interpreter|reads it line by line|accent2', 'Computer runs it|follows each instruction', 'Output|appears on the screen|good']),
    walkthrough('first-run', 'Running your first program', 'Four steps to create, type, run and read the output of a first Python program.', 'Follow along in your own editor.', [
      { title: 'Create a new file', text: 'Open your editor, create a new file and save it as `hello.py`. The name must end in `.py`.' },
      { title: 'Type the instruction', text: 'Type one line into the file. Use straight quotation marks.', code: 'print("Hello, Mission Control!")' },
      { title: 'Run it', text: 'Press the **Run** button (or the keyboard shortcut your teacher shows you).' },
      { title: 'Read the output', text: 'Look in the output panel. You should see exactly the words you put inside the quotation marks.' },
    ], { at: 'end' }),
    trace('top-to-bottom', 'How Python executes instructions', 'Step through a four-line program and watch each line print in order, from top to bottom.', 'Python runs one line at a time, from the top.', ['print("3")', 'print("2")', 'print("1")', 'print("Liftoff!")'], [
      { line: 1, output: '3', note: 'Line 1 runs first and prints 3.' },
      { line: 2, output: '2', note: 'Then line 2 prints 2.' },
      { line: 3, output: '1', note: 'Then line 3 prints 1.' },
      { line: 4, output: 'Liftoff!', note: 'The last line prints Liftoff! — the order of the output is the order of the lines.' },
    ], { at: 'end' }),
  ],
  'python-programming-essentials/2': [
    cards('naming-rules', 'Naming variables', 'Two cards: variable names that are allowed and clear, and names that break the rules, each with the reason.', 'Good names are descriptive; broken names cause errors.', [
      { title: 'Good names', badge: 'Allowed', tone: 'good', bullets: ['`fuel_level` — says what it holds', '`crew_count` — snake_case, no spaces', '`stage_3` — a digit is fine if it is not first'] },
      { title: 'Not allowed', badge: 'Error', tone: 'bad', bullets: ['`3rd_stage` — starts with a digit', '`crew count` — contains a space', '`class` — a reserved keyword'] },
    ]),
    table('type-conversion', 'Type conversion', 'A table of four conversions: int of text, float of text, str of a number and int of a decimal, with the value and type each one gives.', 'Calling the type\'s name converts a value.', ['Expression', 'Result', 'Type'], [['int("250")', '250', 'int'], ['float("3.5")', '3.5', 'float'], ['str(4)', '"4"', 'str'], ['int(9.99)', '9 (decimals are dropped, not rounded)', 'int']], { highlights: [{ row: 3, col: 1, tone: 'warn', note: 'Not 10!' }] }),
    trace('reassign-fuel', 'Updating and reassigning variables', 'Step through three assignments to one variable and watch its value being replaced each time.', 'Python works out the right-hand side first, then stores it.', ['fuel_percent = 87', 'fuel_percent = 80', 'fuel_percent = fuel_percent - 12.5', 'print(fuel_percent)'], [
      { line: 1, vars: { fuel_percent: 87 }, note: 'The variable is created and holds 87.' },
      { line: 2, vars: { fuel_percent: 80 }, note: 'The old value is replaced by 80.' },
      { line: 3, vars: { fuel_percent: 67.5 }, note: '80 - 12.5 is worked out first, then stored back in the same variable.' },
      { line: 4, vars: { fuel_percent: 67.5 }, output: '67.5', note: 'print shows the current value.' },
    ], { at: 'end' }),
  ],
  'python-programming-essentials/3': [
    flow('input-flow', 'Asking the user with', 'A pipeline: the user types 4, input gives back the text "4", int turns it into the number 4, and then the program can calculate with it.', 'input() always returns text. Convert it before you calculate.', ['User types|4', 'input() returns|the text "4"|warn', 'int() converts|the number 4|accent', 'Calculation|crew * 3 = 12|good']),
    table('precedence-examples', 'Operator precedence and expressions', 'A table of four expressions, the result of each and the reason: multiplication before addition, brackets first, left to right for subtraction, and power before multiplication.', 'When in doubt, add brackets.', ['Expression', 'Result', 'Why'], [['2 + 3 * 4', '14', 'multiplication first'], ['(2 + 3) * 4', '20', 'brackets first'], ['10 - 4 - 3', '3', 'left to right'], ['2 * 3 ** 2', '18', 'power before multiplication']], { highlights: [{ row: 1, col: 1, tone: 'good' }] }),
  ],
  'python-programming-essentials/4': [
    trace('if-trace', 'The if statement', 'Step through an if statement with fuel set to 15: the condition is true so the indented lines run, and then the program carries on with the last line.', 'Only the indented lines belong to the if.', ['fuel = 15', 'if fuel < 20:', '    print("WARNING: fuel is low")', '    print("Return to base")', 'print("Status check complete")'], [
      { line: 1, vars: { fuel: 15 }, note: 'fuel is 15.' },
      { line: 2, vars: { fuel: 15 }, note: '15 < 20 is True, so the indented block will run.' },
      { line: 3, vars: { fuel: 15 }, output: 'WARNING: fuel is low', note: 'First line of the block.' },
      { line: 4, vars: { fuel: 15 }, output: 'Return to base', note: 'Second line of the block.' },
      { line: 5, vars: { fuel: 15 }, output: 'Status check complete', note: 'Not indented: it runs whatever the condition said.' },
    ], { at: 'end' }),
    V('tree', 'fuel-decision-tree', 'elif several choices', 'A decision tree for fuel: if fuel is at least 80 it is excellent; otherwise if at least 50 it is good; otherwise if at least 20 it is low; otherwise critical.', 'Python tests from the top and uses the first branch that is true.', {
      root: { label: 'fuel >= 80 ?', children: [{ label: 'Yes → "excellent"', tone: 'good' }, { label: 'No → fuel >= 50 ?', children: [{ label: 'Yes → "good"', tone: 'info' }, { label: 'No → fuel >= 20 ?', children: [{ label: 'Yes → "low"', tone: 'warn' }, { label: 'No → "critical"', tone: 'bad' }] }] }] },
    }, { at: 'end' }),
  ],
  'python-programming-essentials/5': [
    trace('for-range-trace', 'The for loop', 'Step through a for loop over range(1, 4) and watch the loop variable take the values 1, 2 and 3.', 'The loop variable changes on every pass.', ['for count in range(1, 4):', '    print("Orbit number", count)', 'print("Done")'], [
      { line: 1, vars: { count: 1 }, note: 'First pass: count is 1.' },
      { line: 2, vars: { count: 1 }, output: 'Orbit number 1' },
      { line: 1, vars: { count: 2 }, note: 'Second pass: count is 2.' },
      { line: 2, vars: { count: 2 }, output: 'Orbit number 2' },
      { line: 1, vars: { count: 3 }, note: 'Third pass: count is 3. range(1, 4) stops before 4.' },
      { line: 2, vars: { count: 3 }, output: 'Orbit number 3' },
      { line: 3, vars: { count: 3 }, output: 'Done', note: 'The loop is finished, so the last line runs once.' },
    ]),
    flow('while-cycle', 'The while loop', 'A cycle: check the condition; if it is true run the block and update the variable, then check again; when it is false leave the loop.', 'A while loop checks its condition before every pass.', ['Check the condition|fuel > 40 ?|accent', 'Run the block|print and use fuel|accent2', 'Update the variable|fuel -= 15|good'], { layout: 'cycle' }),
    trace('accumulator-trace', 'Counters and accumulators', 'Step through a loop that adds the fuel burned in four stages into a running total.', 'Create the accumulator before the loop; update it inside.', ['total_fuel = 0', 'for burn in [12, 18, 9, 21]:', '    total_fuel += burn', 'print(total_fuel)'], [
      { line: 1, vars: { total_fuel: 0 }, note: 'The accumulator starts at 0, before the loop.' },
      { line: 3, vars: { burn: 12, total_fuel: 12 }, note: '0 + 12' },
      { line: 3, vars: { burn: 18, total_fuel: 30 }, note: '12 + 18' },
      { line: 3, vars: { burn: 9, total_fuel: 39 }, note: '30 + 9' },
      { line: 3, vars: { burn: 21, total_fuel: 60 }, note: '39 + 21' },
      { line: 4, vars: { total_fuel: 60 }, output: '60', note: 'After the loop, the total is ready to use.' },
    ], { at: 'end' }),
  ],
  'python-programming-essentials/6': [
    table('slice-examples', 'Slicing', 'A table of four slices of the string Rover with the characters each one returns and a short explanation.', 'A slice stops just before the stop index.', ['Slice of "Rover"', 'Result', 'Meaning'], [['name[0:3]', 'Rov', 'indexes 0, 1, 2'], ['name[:3]', 'Rov', 'start defaults to 0'], ['name[2:]', 'ver', 'stop defaults to the end'], ['name[::-1]', 'revoR', 'a step of -1 reverses it']], { highlights: [{ row: 3, col: 1, tone: 'accent' }] }),
    flow('split-join-flow', 'Splitting and joining', 'A pipeline: the sentence all systems are go is split into a list of four words, and the list is joined back together with dashes.', 'split() makes a list; join() makes a string.', ['String|"all systems are go"', 'split()|["all", "systems", "are", "go"]|accent', 'join with "-"|"all-systems-are-go"|good']),
  ],
  'python-programming-essentials/7': [
    cards('four-collections', 'Choosing the right collection', 'Four cards for lists, tuples, sets and dictionaries, each with a short rule for when to use it.', 'Pick the collection that matches the job.', [
      { title: 'List', badge: '[ ]', tone: 'info', bullets: ['Ordered and changeable', 'Use for a group you will edit'] },
      { title: 'Tuple', badge: '( )', tone: 'accent', bullets: ['Ordered and fixed', 'Use for data that must not change'] },
      { title: 'Set', badge: '{ }', tone: 'good', bullets: ['Unique values, no order', 'Use to remove duplicates'] },
      { title: 'Dictionary', badge: '{ k: v }', tone: 'warn', bullets: ['Key → value pairs', 'Use to look things up by name'] },
    ]),
    table('dict-lookup', 'Dictionaries', 'A dictionary of supplies drawn as a table of keys and values, with the lookup supplies["food"] highlighted.', 'You look up a value by its key.', ['Key', 'Value'], [['"oxygen"', 5], ['"food"', 12], ['"water"', 8]], { highlights: [{ row: 1, col: 1, tone: 'good', note: 'supplies["food"] is 12' }] }),
  ],
  'python-programming-essentials/8': [
    sequence('function-call', 'Parameters and arguments', 'A sequence diagram: the main program calls fuel_needed with 400 and 3, the function runs, and returns 12.0 to the caller.', 'Arguments go in; the return value comes out.', [['main', 'Your program'], ['fn', 'fuel_needed(distance_km, burn_rate)']], [
      { from: 'main', to: 'fn', label: 'fuel_needed(400, 3)', note: 'distance_km = 400, burn_rate = 3' },
      { from: 'fn', to: 'main', label: 'return 12.0', note: '400 / 100 * 3', dashed: true },
    ]),
    cards('scope-cards', 'Local and global scope', 'Two cards: a global variable can be read from anywhere, a local variable exists only while its function runs.', 'Where a variable is created decides where it can be used.', [
      { title: 'Global', badge: 'Outside functions', tone: 'info', bullets: ['`rocket = "Aurora"`', 'Functions can read it', 'Lives until the program ends'] },
      { title: 'Local', badge: 'Inside a function', tone: 'warn', bullets: ['`stage = 2`', 'Only that function can use it', 'Disappears when the function ends'] },
    ]),
    flow('quiz-structure', 'Organising a program into small', 'A pipeline for the quiz program: main calls run_quiz, which calls ask_question and show_feedback for each question, then show_results.', 'One small function for each job, and main() to start them.', ['main()|starts the quiz|accent', 'run_quiz()|loops over the questions|accent2', 'ask_question()|returns True or False', 'show_feedback()|right or wrong message', 'show_results()|score and rank|good'], { perRow: 5, at: 'end' }),
  ],

  // ── Course 2 · Problem Solving & Program Design ──────────────────────────
  'problem-solving-program-design/1': [
    flow('thinking-steps', 'What is computational thinking', 'A row of steps for solving a problem: break it down, find patterns, ignore the details that do not matter, design the algorithm, write the code and test it.', 'Think first, then code, then test.', ['Decompose|split it into small tasks|accent', 'Find patterns|have I seen this before?|accent2', 'Abstract|keep what matters', 'Design|pseudocode and flowchart', 'Code|translate the steps', 'Test|dry run and edge cases|good'], { perRow: 3 }),
    V('tree', 'planner-decision', 'Flowcharts', 'A decision for each task in the planner: does it fit in the time left? If yes add it to the plan, if no put it in the list of tasks that did not fit.', 'The one decision at the heart of the planner.', {
      root: { label: 'Next task (most important first)', children: [{ label: 'Fits in the time left?', children: [{ label: 'Yes → add it to the plan', tone: 'good' }, { label: 'No → put it in the "did not fit" list', tone: 'warn' }] }] },
    }),
    table('trace-table', 'Tracing with a dry run', 'A trace table for the planner showing, for each task, whether it fits and the minutes used afterwards.', 'A dry run finds logic mistakes before you code.', ['Step', 'Task', 'Fits?', 'minutes used'], [['start', '', '', 0], [1, 'Check oxygen (15)', 'yes', 15], [2, 'Repair antenna (90)', 'yes', 105], [3, 'Exercise (45)', 'no — 150 would be exceeded', 105]], { highlights: [{ row: 3, col: 2, tone: 'warn' }] }),
  ],
  'problem-solving-program-design/2': [
    table('argument-styles', 'Positional and keyword arguments', 'A table of three ways to call describe_trip: positional, keyword, and a mix, each giving the same result.', 'Keyword arguments make a call easier to read.', ['Call', 'Style'], [['describe_trip("Mars", 225000000, 4)', 'positional: order matters'], ['describe_trip(crew=4, destination="Mars", distance_km=225000000)', 'keyword: any order'], ['describe_trip("Mars", crew=4, distance_km=225000000)', 'a mix: positional first']]),
    sequence('import-sequence', 'Importing and reusing code', 'A sequence diagram: main.py imports toolkit, Python runs toolkit.py once, then main.py calls toolkit.format_duration and gets text back.', 'import runs the module once, then you can call its functions.', [['main', 'main.py'], ['tk', 'toolkit.py']], [
      { from: 'main', to: 'tk', label: 'import toolkit', note: 'Python runs the file once' },
      { from: 'main', to: 'tk', label: 'toolkit.format_duration(125)' },
      { from: 'tk', to: 'main', label: '"2 h 05 min"', dashed: true },
    ], { at: 'end' }),
  ],
  'problem-solving-program-design/3': [
    compare('records-as-table', 'A list containing dictionaries', 'On the left a list of dictionaries as text; on the right the same data as a table with one row per dictionary and one column per key.', 'A list of dictionaries is a table in disguise.',
      { title: 'crew (list of dictionaries)', columns: ['index', 'dictionary'], rows: [[0, '{"name": "Nova", "role": "Pilot"}'], [1, '{"name": "Orion", "role": "Engineer"}'], [2, '{"name": "Lyra", "role": "Doctor"}']] },
      { title: 'The same data as a table', columns: ['name', 'role'], rows: [['Nova', 'Pilot'], ['Orion', 'Engineer'], ['Lyra', 'Doctor']] },
      { arrowLabel: 'each dictionary is one row' }),
    V('tree', 'rooms-tree', 'Nested dictionaries', 'The nested dictionary of rooms drawn as a tree: the lab has a description, an exits dictionary with south and east, and so on.', 'Every level of brackets takes you one level deeper.', {
      root: { label: 'rooms', children: [
        { label: '"hangar"', children: [{ label: '"description": "A huge hangar."' }, { label: '"exits"', children: [{ label: '"north": "lab"', tone: 'info' }] }] },
        { label: '"lab"', children: [{ label: '"description": "A quiet laboratory."' }, { label: '"exits"', children: [{ label: '"south": "hangar"', tone: 'info' }, { label: '"east": "garden"', tone: 'info' }] }] },
      ] },
    }, { at: 'end' }),
  ],
  'problem-solving-program-design/4': [
    trace('max-trace', 'Finding minimum and maximum values', 'Step through the accumulator pattern that finds the highest of three scores.', 'Start with the first item, then replace it whenever you meet a bigger one.', ['highest = scores[0]', 'for score in scores:', '    if score > highest:', '        highest = score'], [
      { line: 1, vars: { highest: 72 }, note: 'Assume the first score (72) is the highest.' },
      { line: 3, vars: { score: 72, highest: 72 }, note: '72 > 72 is False.' },
      { line: 4, vars: { score: 88, highest: 88 }, note: '88 > 72 is True, so the answer is replaced.' },
      { line: 3, vars: { score: 45, highest: 88 }, note: '45 > 88 is False: the answer stays 88.' },
    ], { at: 'end' }),
    table('growth-table', 'Introduction to algorithm efficiency', 'A table showing how many steps constant, linear and quadratic algorithms need for 10, 1,000 and 1,000,000 items. Illustrative numbers.', 'Work grows at very different speeds as the data grows.', ['Items (n)', 'Constant', 'Linear', 'Quadratic (n × n)'], [['10', '1', '10', '100'], ['1,000', '1', '1,000', '1,000,000'], ['1,000,000', '1', '1,000,000', '1,000,000,000,000']], { highlights: [{ row: 2, col: 3, tone: 'bad', note: 'far too slow' }] }),
  ],
  'problem-solving-program-design/5': [
    cards('error-kinds', 'Three kinds of errors', 'Three cards for syntax errors, runtime errors and logic errors, saying when each is found.', 'The hardest bug is the one with no error message.', [
      { title: 'Syntax error', badge: 'Before running', tone: 'info', bullets: ['Python cannot understand the line', 'Missing colon or bracket', 'Python names the line'] },
      { title: 'Runtime error', badge: 'While running', tone: 'warn', bullets: ['Python stops with a traceback', 'Division by zero, missing key', 'Read the last line first'] },
      { title: 'Logic error', badge: 'Silent', tone: 'bad', bullets: ['No message at all', 'The answer is simply wrong', 'Only testing finds it'] },
    ]),
    flow('debug-routine', 'Fixing errors systematically', 'A cycle of six debugging steps: reproduce the bug, read the message, isolate the problem, form a hypothesis, change one thing, and retest.', 'Follow the routine instead of guessing.', ['Reproduce|make it happen every time|accent', 'Read|the message and line number', 'Isolate|the smallest failing code', 'Hypothesis|"I think the cause is…"|accent2', 'Change one thing|never several at once', 'Retest|and add a new test|good'], { layout: 'cycle' }),
  ],
  'problem-solving-program-design/6': [
    V('tree', 'try-except-tree', 'Catching errors with', 'What happens in a try statement: the try block runs; if an error happens, the matching except block runs; if there was no error, the else block runs; finally always runs at the end.', 'except runs on an error, else on success, finally always.', {
      root: { label: 'try: the risky code', children: [{ label: 'Error happens', tone: 'bad', children: [{ label: 'except runs', tone: 'warn' }] }, { label: 'No error', tone: 'good', children: [{ label: 'else runs', tone: 'good' }] }, { label: 'finally: always runs last', tone: 'info' }] },
    }),
    sequence('validation-loop', 'Validating user input', 'A sequence diagram of a validation loop: the program asks, the user types abc, the program rejects it and asks again, the user types 4, and the program accepts it.', 'Keep asking until the answer is valid.', [['p', 'Program'], ['u', 'User']], [
      { from: 'p', to: 'u', label: 'Crew size (1-6)?' },
      { from: 'u', to: 'p', label: '"abc"', dashed: true },
      { from: 'p', to: 'u', label: 'That is not a whole number. Try again.' },
      { from: 'u', to: 'p', label: '"4"', dashed: true },
      { from: 'p', to: 'u', label: 'Accepted ✅' },
    ], { at: 'end' }),
  ],
  'problem-solving-program-design/7': [
    flow('persistence-cycle', 'Loading, storing and updating', 'A cycle: the program starts and loads the data file, changes the data in memory, saves the file, and next time starts by loading it again.', 'Load, change, save: that is how a program remembers.', ['Start|the program opens', 'Load|read the file (or start empty)|accent', 'Change|add, edit or delete in memory|accent2', 'Save|write the whole file again|good'], { layout: 'cycle' }),
    compare('csv-vs-json', 'Working with JSON data', 'The same two expenses shown as CSV text lines and as a JSON list of dictionaries.', 'CSV is a plain table; JSON keeps structure.',
      { title: 'expenses.csv', columns: ['line'], rows: [['item,amount'], ['Oxygen filter,12.5'], ['Solar cell,40.0']] },
      { title: 'expenses.json', columns: ['line'], rows: [['[{"item": "Oxygen filter", "amount": 12.5},'], [' {"item": "Solar cell", "amount": 40.0}]']] },
      { arrowLabel: 'same data, two formats' }),
  ],
  'problem-solving-program-design/8': [
    cards('class-vs-object', 'Classes and objects', 'A blueprint card for the Spacecraft class with its attributes and methods, and two object cards for aurora and voyager with their own values.', 'One class, many objects, each with its own data.', [
      { title: 'class Spacecraft', badge: 'Blueprint', tone: 'accent', bullets: ['Attributes: name, fuel, crew', 'Methods: add_crew(), burn_fuel(), refuel()'] },
      { title: 'aurora', badge: 'Object', tone: 'good', bullets: ['name = "Aurora"', 'fuel = 65', 'crew = ["Nova", "Orion"]'] },
      { title: 'voyager', badge: 'Object', tone: 'info', bullets: ['name = "Voyager"', 'fuel = 100', 'crew = ["Lyra"]'] },
    ]),
    V('tree', 'library-classes', 'Organising related data and functionality', 'The Library object contains a dictionary of Book objects, a dictionary of Member objects and a list of borrowing records.', 'Objects can contain other objects.', {
      root: { label: 'Library', children: [
        { label: 'books', children: [{ label: 'Book "B001"', tone: 'info' }, { label: 'Book "B002"', tone: 'info' }] },
        { label: 'members', children: [{ label: 'Member "M1"', tone: 'good' }, { label: 'Member "M2"', tone: 'good' }] },
        { label: 'records', children: [{ label: 'who borrowed what, and when', tone: 'warn' }] },
      ] },
    }, { at: 'end' }),
  ],

  // ── Course 3 · Python Tools & Data Foundations ───────────────────────────
  'python-tools-data-foundations/1': [
    V('tree', 'project-layout', 'How Python projects are organised', 'A project folder tree: personal_workspace contains README.md, .gitignore, and the folders src with main.py, data, notebooks and docs.', 'One place for each kind of file.', {
      root: { label: 'personal_workspace/', children: [{ label: 'README.md' }, { label: '.gitignore' }, { label: 'src/', children: [{ label: 'main.py', tone: 'good' }] }, { label: 'data/' }, { label: 'notebooks/' }, { label: 'docs/' }] },
    }),
    uiMap('vscode-map', 'A development environment', 'A sketch of the VS Code window: the Explorer on the left, the editor in the middle, the Run button at the top right, the terminal at the bottom and the status bar showing the Python interpreter.', 'The main areas of VS Code.', [
      { id: 'explorer', label: 'Explorer', desc: 'The files and folders of your project. Open a whole folder, not just one file.', x: 2, y: 8, w: 20, h: 62 },
      { id: 'run', label: 'Run button', desc: 'Runs the file that is open in the editor.', x: 74, y: 2, w: 24, h: 8 },
      { id: 'editor', label: 'Editor', desc: 'Where you write code, with colours, suggestions and error underlines.', x: 24, y: 12, w: 74, h: 42 },
      { id: 'terminal', label: 'Terminal', desc: 'A text window for commands such as running a script or using Git.', x: 24, y: 56, w: 74, h: 28 },
      { id: 'status', label: 'Status bar · interpreter', desc: 'Shows which Python interpreter is selected. Click it to change it.', x: 2, y: 88, w: 96, h: 9 },
    ], { title: 'Visual Studio Code (sketch)' }),
    flow('git-flow', 'Introduction to version control', 'A pipeline for Git: edit your files, choose the changes with git add, save a snapshot with git commit, and optionally push the history to GitHub.', 'Git records snapshots; GitHub keeps an online copy.', ['Edit files|write and test your code|accent', 'git add|choose what goes in the snapshot|accent2', 'git commit|save it with a message|good', 'git push|copy the history to GitHub|info'], { at: 'end' }),
  ],
  'python-tools-data-foundations/2': [
    cards('module-library-package', 'Modules, libraries and packages', 'Three cards that explain a module as one Python file, a package as a folder of modules and a library as a general word for reusable code.', 'In everyday talk, library covers all three.', [
      { title: 'Module', badge: 'One file', tone: 'info', bullets: ['A single .py file', 'Example: `math`'] },
      { title: 'Package', badge: 'A folder', tone: 'accent', bullets: ['Several modules together', 'Example: `pandas`'] },
      { title: 'Library', badge: 'Reusable code', tone: 'good', bullets: ['A general word for either', 'Example: the NumPy library'] },
    ]),
    flow('venv-flow', 'Virtual environments', 'A pipeline: create a virtual environment, activate it, install packages into it, record them in requirements.txt, and let anyone rebuild it from that file.', 'Each project gets its own private set of libraries.', ['Create|python -m venv .venv|accent', 'Activate|the prompt shows (.venv)|accent2', 'Install|python -m pip install ...', 'Record|requirements.txt|good', 'Rebuild|pip install -r requirements.txt|info'], { perRow: 5, at: 'end' }),
  ],
  'python-tools-data-foundations/3': [
    uiMap('notebook-map', 'What are Jupyter Notebooks', 'A map of a notebook window: the menu and toolbar across the top, a text cell, a code cell, the output shown under it and the kernel status in the corner.', 'The parts of a notebook.', [
      { id: 'menu', label: 'Menu & toolbar', desc: 'Save, add a cell and run it with the Run button or Shift + Enter.', x: 2, y: 2, w: 70, h: 12 },
      { id: 'kernel', label: 'Kernel', desc: 'The Python process that remembers your variables. Restarting it clears them.', x: 74, y: 2, w: 24, h: 12 },
      { id: 'text', label: 'Markdown cell', desc: 'Formatted text for headings and explanations.', x: 2, y: 18, w: 96, h: 14 },
      { id: 'code', label: 'Code cell  [1]', desc: 'Python code. The number in the brackets shows the order the cells were run in.', x: 2, y: 36, w: 96, h: 24 },
      { id: 'out', label: 'Output', desc: 'The result of the cell appears right underneath it.', x: 2, y: 64, w: 96, h: 30 },
    ], { title: 'A Jupyter notebook (sketch)' }),
    trace('kernel-state', 'Execution order and kernel state', 'Step through two cells run in a surprising order: running the second cell twice doubles the score again because the kernel remembers it.', 'The kernel remembers what you RAN, not what you see.', ['# Cell A', 'score = 10', '# Cell B', 'score = score * 2'], [
      { line: 2, vars: { score: 10 }, note: 'Run Cell A: score is 10.' },
      { line: 4, vars: { score: 20 }, note: 'Run Cell B: 10 * 2 = 20.' },
      { line: 4, vars: { score: 40 }, note: 'Run Cell B again: the kernel still remembers 20, so 20 * 2 = 40. Same page, different result!' },
      { line: 2, vars: { score: 10 }, note: 'Run Cell A again: score is back to 10. Restart and run all keeps you safe.' },
    ], { at: 'end' }),
  ],
  'python-tools-data-foundations/4': [
    compare('list-vs-array', 'Arrays and their advantages', 'Adding two Python lists joins them end to end, while adding two NumPy arrays adds them item by item.', 'The same + sign does different jobs.',
      { title: 'Python lists', columns: ['code', 'result'], rows: [['[1, 2, 3] + [10, 20, 30]', '[1, 2, 3, 10, 20, 30]'], ['[1, 2, 3] * 2', '[1, 2, 3, 1, 2, 3]']] },
      { title: 'NumPy arrays', columns: ['code', 'result'], rows: [['np.array([1, 2, 3]) + np.array([10, 20, 30])', '[11 22 33]'], ['np.array([1, 2, 3]) * 2', '[2 4 6]']], highlights: [{ row: 0, col: 1, tone: 'good' }, { row: 1, col: 1, tone: 'good' }] },
      { arrowLabel: 'element-wise maths' }),
    table('grid-indexing', 'Indexing and slicing', 'A 3 by 4 array of the numbers 1 to 12 with the element at row 1, column 2 highlighted as 7, and the whole of column 1 highlighted.', 'grid[row, column]: the row always comes first.', ['', 'col 0', 'col 1', 'col 2', 'col 3'], [['row 0', 1, 2, 3, 4], ['row 1', 5, 6, 7, 8], ['row 2', 9, 10, 11, 12]], { highlights: [{ row: 1, col: 3, tone: 'good', note: 'grid[1, 2] is 7' }, { row: 0, col: 2, tone: 'info' }, { row: 2, col: 2, tone: 'info', note: 'grid[:, 1] is the whole column' }] }),
    table('mask-table', 'Basic array manipulation', 'A table of six temperatures with a column showing True or False for temps greater than 22, and which values are kept.', 'A condition makes a mask; the mask picks the values.', ['temperature', 'temps > 22', 'kept?'], [[21.5, 'False', '—'], [19.0, 'False', '—'], [23.4, 'True', '✔'], [22.1, 'False', '—'], [20.8, 'False', '—'], [25.0, 'True', '✔']], { highlights: [{ row: 2, col: 1, tone: 'good' }, { row: 5, col: 1, tone: 'good' }] }),
  ],
  'python-tools-data-foundations/5': [
    cards('series-dataframe', 'Series and DataFrames', 'Two cards comparing a Series, one labelled column of values, with a DataFrame, a whole table of several columns sharing one index.', 'A DataFrame is a collection of Series.', [
      { title: 'Series', badge: 'One column', tone: 'info', bullets: ['Values with an index', '`radius["Earth"]` → 6371'] },
      { title: 'DataFrame', badge: 'A table', tone: 'good', bullets: ['Rows and named columns', 'Columns share one index', '`df["radius_km"]` → a Series'] },
    ]),
    compare('csv-to-dataframe', 'Loading CSV datasets', 'A CSV file shown as lines of text separated by commas, and the same data as a Pandas table with named columns.', 'read_csv turns lines of text into a table.',
      { title: 'planets.csv (text)', columns: ['line'], rows: [['name,type,radius_km'], ['Mercury,rocky,2440'], ['Earth,rocky,6371'], ['Jupiter,gas giant,69911']] },
      { title: 'DataFrame', columns: ['name', 'type', 'radius_km'], rows: [['Mercury', 'rocky', 2440], ['Earth', 'rocky', 6371], ['Jupiter', 'gas giant', 69911]] },
      { arrowLabel: 'pd.read_csv' }),
    table('filter-rows', 'Filtering and sorting records', 'A table of planets where the rows with a radius above 5000 km are highlighted, showing what df[df["radius_km"] > 5000] keeps.', 'Filtering keeps only the rows where the condition is True.', ['name', 'type', 'radius_km'], [['Mercury', 'rocky', 2440], ['Venus', 'rocky', 6052], ['Mars', 'rocky', 3390], ['Jupiter', 'gas giant', 69911]], { highlights: [{ row: 1, col: 2, tone: 'good' }, { row: 3, col: 2, tone: 'good' }], title: 'df[df["radius_km"] > 5000] keeps the green rows' }),
  ],
  'python-tools-data-foundations/6': [
    flow('cleaning-steps', 'Raw and messy datasets', 'A row of cleaning steps: look at the data, find the problems, decide what to do, fix a copy, check the result and then chart it.', 'Look first, change second, and keep a record.', ['Look|head, info, describe|accent', 'Find problems|missing, duplicates, types', 'Decide|drop, fill or leave', 'Fix a copy|never the original|accent2', 'Check|before and after|good', 'Chart|and explain it'], { perRow: 3 }),
    compare('cleaning-before-after', 'Handling missing values', 'Two tables: one with an empty cell, a duplicated row, a number stored as text and untidy names; the other after cleaning has them fixed.', 'Cleaning fixes gaps, duplicates, types and text.',
      { title: 'Before', columns: ['student', 'study_hours', 'sleep_hours'], rows: [[' Nova ', 2.5, 7.5], ['Orion', '', 6.0], ['Orion', '', 6.0], ['Kai', 4.5, 'five']], highlights: [{ row: 0, col: 0, tone: 'warn', note: 'extra spaces' }, { row: 1, col: 1, tone: 'bad', note: 'missing value' }, { row: 2, col: 0, tone: 'warn', note: 'duplicate row' }, { row: 3, col: 2, tone: 'warn', note: 'text, not a number' }] },
      { title: 'After', columns: ['student', 'study_hours', 'sleep_hours'], rows: [['Nova', 2.5, 7.5], ['Orion', 3.5, 6.0], ['Kai', 4.5, 6.5]], highlights: [{ row: 1, col: 1, tone: 'good', note: 'filled with the median' }, { row: 2, col: 2, tone: 'good', note: 'filled with the median' }] },
      { arrowLabel: 'strip · drop_duplicates · to_numeric · fillna' }),
    V('chart', 'study-by-grade', 'Introduction to Matplotlib', 'A bar chart of the average study hours for grade 8 and grade 9, made with plt.bar, with a title and labelled axes. Illustrative numbers.', 'Create it, label it, show it. Illustrative numbers.', {
      kind: 'bar', xLabel: 'Grade', yLabel: 'Hours per day', categories: ['Grade 8', 'Grade 9'], series: [{ name: 'Average study hours', values: [2.25, 3.58] }],
    }, { at: 'end' }),
  ],
  'python-tools-data-foundations/7': [
    sequence('http-conversation', 'How applications communicate', 'A sequence diagram: your Python program sends a GET request to the ISS API, and the server replies with status code 200 and JSON text.', 'One request, one response.', [['client', 'Your program (client)'], ['server', 'API server']], [
      { from: 'client', to: 'server', label: 'GET /v1/satellites/25544', note: 'requests.get(url, timeout=10)' },
      { from: 'server', to: 'client', label: '200 OK + JSON', note: 'response.json() → a dictionary', dashed: true },
    ]),
    V('tree', 'json-structure', 'Working with JSON responses', 'A JSON response drawn as a tree: a dictionary with the keys name, id, latitude, longitude, altitude, velocity and units, each holding a value.', 'A JSON response is a dictionary you already know how to use.', {
      root: { label: 'response.json()', children: [{ label: '"name": "iss"' }, { label: '"id": 25544' }, { label: '"latitude": 47.46', tone: 'info' }, { label: '"longitude": -137.59', tone: 'info' }, { label: '"altitude": 423.67' }, { label: '"velocity": 27587.33', tone: 'good' }, { label: '"units": "kilometers"' }] },
    }),
  ],
  'python-tools-data-foundations/8': [
    flow('project-workflow', 'Planning an independent project', 'A row of project steps: plan the questions, write the requirements, set up the structure, build the smallest useful version, test it, document it and commit and share it.', 'Plan, build small, test, document, share.', ['Plan|problem and questions|accent', 'Requirements|Must / Should / Could', 'Structure|src, data, docs', 'Build small|the first useful slice|accent2', 'Test|assert and edge cases', 'Document|README|good', 'Commit & share|clear messages|info'], { perRow: 4 }),
    table('requirements-table', 'Identifying project requirements', 'A table of example requirements sorted into Must, Should and Could.', 'Must items are the core; the others are extras.', ['Priority', 'Requirement'], [['Must', 'Load the survey and report how many students answered'], ['Must', 'Clean missing values and duplicates and say what changed'], ['Should', 'Let the user choose a grade to look at'], ['Could', 'Save the charts as image files']], { highlights: [{ row: 0, col: 0, tone: 'bad' }, { row: 1, col: 0, tone: 'bad' }, { row: 2, col: 0, tone: 'warn' }, { row: 3, col: 0, tone: 'info' }] }),
    checklist('capstone-ready', 'Sharing a project', 'A checklist to tick off before sharing a finished project.', 'Tick these off before you share. Saved on this device.', ['The project runs from a clean start', 'Every chart has a title, labels and a legend where it helps', 'The README explains what it does and how to run it', 'There are at least five commits with clear messages', 'No names, passwords or keys are anywhere in the project', 'A parent or guardian agreed before anything goes online'], { at: 'end', title: 'Ready to share?' }),
  ],
};

registerVisualCatalog(source);
