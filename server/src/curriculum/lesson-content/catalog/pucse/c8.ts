// FILE PATH: server/src/curriculum/lesson-content/catalog/pucse/c8.ts
//
// Pre-University CSE · Course 8 · Python, Artificial Intelligence & Modern Computing — visuals and the Mini Quiz of every lesson.
// Keys are lineage keys: "<course-slug>/<lesson position>". Every "what does this print?" question carries
// the real program (checked by running it in the Pre-University CSE spec when the toolchain is installed).

import { registerVisualCatalog } from '../../visual-catalog';
import { registerQuizCatalog } from '../../quiz-catalog';
import { algoSteps, cards, checklist, flow, graph, grid, lab, mcq, PY, sequence, table, trace, tree, uml, V, walkthrough } from './helpers';

const M = 'python-artificial-intelligence-and-modern-computing';

registerVisualCatalog({
  [`${M}/1`]: [
    table(
      'language-compare',
      'Five languages, five answers',
      'A table that compares five languages by release year, typing, how they run and memory management. C (1972) and C++ (1985) are static, compiled to machine code, with manual memory. Python (1991) and JavaScript (1995) are dynamic and garbage collected, Python on a bytecode virtual machine and JavaScript with a JIT. Java (1995) is static, runs as bytecode on the JVM with a JIT and is garbage collected.',
      'The same questions, five different answers. None of the answers is best for every job.',
      ['Language', 'Released', 'Typing', 'How it runs', 'Memory'],
      [
        ['C', '1972', 'static', 'machine code', 'manual'],
        ['C++', '1985', 'static', 'machine code', 'manual, RAII'],
        ['Python', '1991', 'dynamic', 'bytecode on a VM', 'garbage collected'],
        ['Java', '1995', 'static', 'bytecode on the JVM, JIT', 'garbage collected'],
        ['JavaScript', '1995', 'dynamic', 'JIT in the engine', 'garbage collected'],
      ],
      { at: 'end', highlights: [{ row: 2, col: 2, tone: 'accent' }, { row: 4, col: 2, tone: 'accent' }, { row: 0, col: 2, tone: 'info' }, { row: 1, col: 2, tone: 'info' }, { row: 3, col: 2, tone: 'info' }] },
    ),
    grid(
      'run-paths',
      'Five languages, five answers',
      'Two ways of running a program. In the top row, C source is translated by a compiler into machine code, which the CPU runs directly. In the bottom row, Python source is translated by a bytecode compiler into bytecode, which a virtual machine executes on the CPU, one instruction at a time.',
      'C is translated once to machine code. Python is translated to bytecode, and the virtual machine runs that on the CPU.',
      [
        ['c-src', 'rect', 'C source', 0, 0, 'info', 'prog.c'],
        ['c-cc', 'rect', 'Compiler', 1, 0, 'accent', 'gcc'],
        ['c-bin', 'rect', 'Machine code', 2, 0, 'good', 'prog'],
        ['py-src', 'rect', 'Python source', 0, 1.4, 'info', 'prog.py'],
        ['py-cc', 'rect', 'Bytecode compiler', 1, 1.4, 'accent', 'inside Python'],
        ['py-bc', 'rect', 'Bytecode', 2, 1.4, 'good', 'in memory'],
        ['py-vm', 'rect', 'Virtual machine', 3, 1.4, 'warn', 'runs each instruction'],
        ['cpu', 'rect', 'CPU', 4, 0.7, 'accent2', 'executes'],
      ],
      [
        ['c-src', 'c-cc'],
        ['c-cc', 'c-bin'],
        ['c-bin', 'cpu', 'runs directly'],
        ['py-src', 'py-cc'],
        ['py-cc', 'py-bc'],
        ['py-bc', 'py-vm'],
        ['py-vm', 'cpu'],
      ],
      { dx: 185, dy: 90, w: 120, h: 54, at: 'end' },
    ),
    table(
      'python-types',
      'Python at a glance',
      'A table of the common Python types. int holds whole numbers of any size, for example 42, and cannot be changed. float holds decimals such as 3.14. str holds text such as "Ayesha" and cannot be changed. bool is True or False. None means no value. list holds an ordered collection such as [72, 45] and can be changed. tuple holds a fixed collection such as (1972, "C"). dict maps keys to values such as {"C": 1972} and can be changed.',
      'Know which types can change (list, dict) and which cannot: it explains why b = a can surprise you.',
      ['Type', 'Example', 'Can it change?', 'Notes'],
      [
        ['int', '42', 'no', 'any size: 2 ** 100 works'],
        ['float', '3.14', 'no', '/ always gives a float'],
        ['str', '"Ayesha"', 'no', 'indexing and slicing work, items cannot be assigned'],
        ['bool', 'True', 'no', 'False, True; counts as 0 and 1 in sums'],
        ['None', 'None', 'no', 'the "no value" object'],
        ['list', '[72, 45, 88]', 'yes', 'ordered; names are references to it'],
        ['tuple', '(1972, "C")', 'no', 'a fixed group of values'],
        ['dict', '{"C": 1972}', 'yes', 'maps keys to values'],
      ],
      { at: 'end', highlights: [{ row: 5, col: 2, tone: 'warn' }, { row: 7, col: 2, tone: 'warn' }] },
    ),
    cards(
      'python-tools',
      'Tools: the REPL, scripts and packages',
      'Four cards for the everyday Python tools. The REPL is an interactive prompt started with python3. A script is a file such as report.py that is run with python3 report.py. pip installs third-party packages. A virtual environment, made with python3 -m venv .venv, keeps the packages of one project apart from the others.',
      'Experiment in the REPL, keep programs in scripts, and give every project its own virtual environment.',
      [
        { title: 'REPL', subtitle: 'python3', tone: 'info', bullets: ['type 2 + 3, see 5', 'best for small experiments'] },
        { title: 'Script', subtitle: 'python3 report.py', tone: 'accent', bullets: ['a file that you keep', 'if __name__ == "__main__":'] },
        { title: 'pip', subtitle: 'pip install name', tone: 'good', bullets: ['third-party packages', 'list them in requirements.txt'] },
        { title: 'Virtual environment', subtitle: 'python3 -m venv .venv', tone: 'warn', bullets: ['one set of packages per project', 'projects cannot break each other'] },
      ],
      { at: 'end' },
    ),
    cards(
      'language-choice',
      'Choosing a language',
      'Five cards that say when to choose each language. Choose C for direct control of memory and hardware, such as firmware and operating systems. Choose C++ when you need speed and abstraction, such as games and browsers. Choose Java for large long-lived business systems and Android. Choose JavaScript for anything that runs in the browser. Choose Python for data, AI, scripting and fast experiments.',
      'Choose by the problem, the platform and the people who will maintain the code. Combinations are normal.',
      [
        { title: 'C', subtitle: 'control', tone: 'info', bullets: ['firmware, kernels', 'tiny memory'] },
        { title: 'C++', subtitle: 'speed and abstraction', tone: 'accent', bullets: ['games, browsers', 'databases'] },
        { title: 'Java', subtitle: 'large systems', tone: 'warn', bullets: ['business services', 'Android'] },
        { title: 'JavaScript', subtitle: 'the web', tone: 'good', bullets: ['pages in the browser', 'servers with Node'] },
        { title: 'Python', subtitle: 'data and AI', tone: 'accent2', bullets: ['experiments, scripts', 'data science, machine learning'] },
      ],
      { at: 'end' },
    ),
    trace(
      'grade-loop-trace',
      'Example 2',
      'A step-through of the first two turns of the loop of Example 2. The dictionary counts starts empty. The first pair is Ayesha and 92, the grade is A+ and counts becomes A+ 1, and the line Ayesha 92 A+ is printed. The second pair is Tanvir and 67, the grade is A- and counts becomes A+ 1, A- 1, and the line Tanvir 67 A- is printed.',
      'Each turn: take the next pair, look up the grade, update the count, print the row.',
      ['counts = {}', 'for name, mark in zip(students, marks):', '    letter = grade(mark)', '    counts[letter] = counts.get(letter, 0) + 1', '    print(f"{name:<8}{mark:>5}  {letter}")'],
      [
        { line: 1, vars: { counts: '{}' }, note: 'An empty dictionary that will map a grade to a count.' },
        { line: 2, vars: { counts: '{}', name: 'Ayesha', mark: 92 }, note: 'zip gives the first pair: Ayesha and 92.' },
        { line: 3, vars: { counts: '{}', name: 'Ayesha', mark: 92, letter: 'A+' }, note: 'grade(92): the first test, 92 >= 80, is true.' },
        { line: 4, vars: { counts: "{'A+': 1}", name: 'Ayesha', mark: 92, letter: 'A+' }, note: 'get returns 0 for a new key, so the count becomes 0 + 1.' },
        { line: 5, vars: { counts: "{'A+': 1}", name: 'Ayesha', mark: 92, letter: 'A+' }, output: 'Ayesha     92  A+', note: 'The row is padded to the widths 8 and 5.' },
        { line: 2, vars: { counts: "{'A+': 1}", name: 'Tanvir', mark: 67 }, note: 'The second pair: Tanvir and 67.' },
        { line: 3, vars: { counts: "{'A+': 1}", name: 'Tanvir', mark: 67, letter: 'A-' }, note: 'grade(67): not >= 80, not >= 70, but >= 60.' },
        { line: 4, vars: { counts: "{'A+': 1, 'A-': 1}", name: 'Tanvir', mark: 67, letter: 'A-' }, note: 'A new key again, so a new entry with the count 1.' },
        { line: 5, vars: { counts: "{'A+': 1, 'A-': 1}", name: 'Tanvir', mark: 67, letter: 'A-' }, output: 'Tanvir     67  A-', note: 'The second row. Three more turns follow.' },
      ],
      { at: 'end' },
    ),
    grid(
      'alias-diagram',
      'Example 3',
      'A diagram of the end of Example 3. The names a and b both point to one list, 1, 2, 3, 4, because b = a made only a second name. The name c points to a different list, 1, 2, 3, 4, 5, made by a.copy() and changed afterwards.',
      'a and b are two names for one list. c is a separate copy, so appending to c did not change a.',
      [
        ['a', 'circle', 'a', 0, 0, 'accent'],
        ['b', 'circle', 'b', 0, 1, 'accent'],
        ['c', 'circle', 'c', 0, 2.4, 'warn'],
        ['l1', 'rect', 'one list', 2, 0.5, 'good', '[1, 2, 3, 4]'],
        ['l2', 'rect', 'another list', 2, 2.4, 'info', '[1, 2, 3, 4, 5]'],
      ],
      [
        ['a', 'l1'],
        ['b', 'l1'],
        ['c', 'l2'],
      ],
      { dx: 150, dy: 70, w: 150, h: 54, at: 'end' },
    ),
    lab(
      'c-report-lab',
      'Example 1',
      'c',
      'A C editor with the marks report program, which prints the count, the average, the highest mark and the number of passes of six marks, with its expected output.',
      'Change the last mark to 100 and predict the new average before you run it.',
      `#include <stdio.h>

int main(void) {
    int marks[] = {72, 45, 88, 30, 91, 66};
    int count = sizeof marks / sizeof marks[0];
    int total = 0, highest = marks[0], passed = 0;
    for (int i = 0; i < count; i++) {
        total += marks[i];
        if (marks[i] > highest) highest = marks[i];
        if (marks[i] >= 33) passed++;
    }
    printf("count %d\\naverage %.1f\\nhighest %d\\npassed %d\\n", count, (double)total / count, highest, passed);
    return 0;
}`,
      { expected: 'count 6\naverage 65.3\nhighest 91\npassed 5', filename: 'report.c', at: 'end' },
    ),
    lab(
      'js-report-lab',
      'Example 1',
      'javascript',
      'A JavaScript editor with the marks report program written with reduce, Math.max and filter, with its expected output.',
      'Print the lowest mark as well, using Math.min.',
      `const marks = [72, 45, 88, 30, 91, 66];
const total = marks.reduce((sum, m) => sum + m, 0);
console.log("count", marks.length);
console.log("average", (total / marks.length).toFixed(1));
console.log("highest", Math.max(...marks));
console.log("passed", marks.filter((m) => m >= 33).length);`,
      { expected: 'count 6\naverage 65.3\nhighest 91\npassed 5', filename: 'report.js', at: 'end' },
    ),
    lab(
      'py-report-lab',
      'Example 1',
      'python',
      'A Python editor with the five-line marks report program, with its expected output.',
      'Add a line that prints the lowest mark, and a line that prints the marks sorted from highest to lowest.',
      `marks = [72, 45, 88, 30, 91, 66]
print("count", len(marks))
print("average", f"{sum(marks) / len(marks):.1f}")
print("highest", max(marks))
print("passed", sum(1 for m in marks if m >= 33))`,
      { expected: 'count 6\naverage 65.3\nhighest 91\npassed 5', filename: 'report.py', at: 'end' },
    ),
    lab(
      'grade-lab',
      'Example 2',
      'python',
      'A Python editor with the grade ladder, the zip loop, the dictionary of counts and the best student, with its expected output.',
      'Change the marks so that two students get an A+ and look at the dictionary of grades.',
      `def grade(mark):
    if mark >= 80:
        return "A+"
    elif mark >= 70:
        return "A"
    elif mark >= 60:
        return "A-"
    elif mark >= 50:
        return "B"
    elif mark >= 40:
        return "C"
    elif mark >= 33:
        return "D"
    return "F"


students = ["Ayesha", "Tanvir", "Sadia", "Nabil", "Mim"]
marks = [92, 67, 38, 75, 29]

print(f"{'Name':<8}{'Mark':>5}  Grade")
counts = {}
for name, mark in zip(students, marks):
    letter = grade(mark)
    counts[letter] = counts.get(letter, 0) + 1
    print(f"{name:<8}{mark:>5}  {letter}")

print()
print("grades:", dict(sorted(counts.items())))
best_mark, best_name = max(zip(marks, students))
print("best:", best_name, "with", best_mark)
print("passed:", ", ".join(name for name, mark in zip(students, marks) if mark >= 33))`,
      { expected: 'Name     Mark  Grade\nAyesha     92  A+\nTanvir     67  A-\nSadia      38  D\nNabil      75  A\nMim        29  F\n\ngrades: {\'A\': 1, \'A+\': 1, \'A-\': 1, \'D\': 1, \'F\': 1}\nbest: Ayesha with 92\npassed: Ayesha, Tanvir, Sadia, Nabil', filename: 'grades.py', at: 'end' },
    ),
    lab(
      'types-lab',
      'Example 3',
      'python',
      'A Python editor with the program that shows types, integer division, a very big integer, list aliases and a TypeError, with its expected output.',
      'Replace c = a.copy() with c = a and predict what print(a, c) shows.',
      `print(type(7), type(7.0), type("7"), type([7]), type(None))
print(7 / 2, 7 // 2, 7 % 2, 2 ** 100)

a = [1, 2, 3]
b = a
b.append(4)
print(a, a is b)
c = a.copy()
c.append(5)
print(a, c)

try:
    print("3" + 4)
except TypeError as error:
    print("TypeError:", error)`,
      { expected: '<class \'int\'> <class \'float\'> <class \'str\'> <class \'list\'> <class \'NoneType\'>\n3.5 3 1 1267650600228229401496703205376\n[1, 2, 3, 4] True\n[1, 2, 3, 4] [1, 2, 3, 4, 5]\nTypeError: can only concatenate str (not "int") to str', filename: 'types.py', at: 'end' },
    ),
  ],
  [`${M}/2`]: [
    table(
      'collections-compare',
      'Collections: list, tuple, set and dict',
      'A table of the four Python collections. A list such as [72, 45, 88] is ordered, can change and allows duplicates; reading by position is fast and searching for a value looks at the items one by one. A tuple such as (1972, "C") is ordered, cannot change and allows duplicates. A set such as {72, 45, 88} has no order, can change and holds each item once; a membership test is fast. A dict such as {"Maths": 92} keeps insertion order, can change and has unique keys; a lookup by key is fast.',
      'Choose the collection by the question that you will ask most often.',
      ['Type', 'Example', 'Ordered', 'Changes', 'Repeats', 'Fast at'],
      [
        ['list', '[72, 45, 88]', 'yes', 'yes', 'allowed', 'position'],
        ['tuple', '(1972, "C")', 'yes', 'no', 'allowed', 'position'],
        ['set', '{72, 45, 88}', 'no', 'yes', 'no', 'x in s'],
        ['dict', '{"Maths": 92}', 'insertion', 'yes', 'keys: no', 'key lookup'],
      ],
      { at: 'end', highlights: [{ row: 2, col: 5, tone: 'good' }, { row: 3, col: 5, tone: 'good' }, { row: 0, col: 5, tone: 'warn' }] },
    ),
    tree(
      'which-collection',
      'Collections: list, tuple, set and dict',
      'A decision tree for choosing a collection. The first question is whether you need to look things up by a key: if yes, use a dict. If not, ask whether you need only unique items: if yes, use a set. If not, ask whether the group never changes: if yes, use a tuple, otherwise use a list.',
      'Three questions in order: a key? unique items? never changes?',
      {
        label: 'Look up by a key?',
        children: [
          { label: 'yes: dict', tone: 'good' },
          {
            label: 'no: only unique items?',
            tone: 'info',
            children: [
              { label: 'yes: set', tone: 'good' },
              {
                label: 'no: never changes?',
                tone: 'info',
                children: [{ label: 'yes: tuple', tone: 'good' }, { label: 'no: list', tone: 'good' }],
              },
            ],
          },
        ],
      },
      { at: 'end' },
    ),
    cards(
      'scope-levels',
      'Functions, scope and errors',
      'Four cards for the four scope levels that Python searches in order. Local: the names made inside the function. Enclosing: the names of the functions around it. Global: the names at the top level of the file. Built-in: the names that Python provides, such as len, max and print.',
      'Python looks for a name in this order and stops at the first match.',
      [
        { title: 'Local', subtitle: '1st', tone: 'accent', bullets: ['parameters and names assigned inside the function'] },
        { title: 'Enclosing', subtitle: '2nd', tone: 'info', bullets: ['names of the functions around it'] },
        { title: 'Global', subtitle: '3rd', tone: 'warn', bullets: ['names at the top level of the file'] },
        { title: 'Built-in', subtitle: '4th', tone: 'good', bullets: ['len, max, print, sum', 'do not reuse these names'] },
      ],
      { at: 'end' },
    ),
    table(
      'exceptions-table',
      'Functions, scope and errors',
      'A table of six common Python exceptions. ValueError: the right type but a wrong value, such as int("abc"). TypeError: the wrong type, such as "3" + 4. KeyError: a missing dictionary key, such as {"a": 1}["b"]. IndexError: a position that does not exist, such as [1, 2][5]. ZeroDivisionError: dividing by zero, such as 1 / 0. FileNotFoundError: opening a file that does not exist.',
      'Catch the specific exception that you expect and let every other one stop the program loudly.',
      ['Exception', 'When it happens', 'Example'],
      [
        ['ValueError', 'right type, wrong value', 'int("abc")'],
        ['TypeError', 'wrong type', '"3" + 4'],
        ['KeyError', 'a dictionary key is missing', '{"a": 1}["b"]'],
        ['IndexError', 'a position does not exist', '[1, 2][5]'],
        ['ZeroDivisionError', 'division by zero', '1 / 0'],
        ['FileNotFoundError', 'the file does not exist', 'open("missing.txt")'],
      ],
      { at: 'end' },
    ),
    trace(
      'default-trap-trace',
      'Example 2',
      'A step-through of the mutable default argument trap. The def line runs once and creates the default list. The first call add_bad(1) uses that list and appends 1. The second call add_bad(2) uses the same list, which already holds 1, and appends 2, so it returns [1, 2].',
      'The default list is created once, so every call that gives no bucket shares it.',
      ['def add_bad(item, bucket=[]):', '    bucket.append(item)', '    return bucket', 'add_bad(1)', 'print(add_bad(2))'],
      [
        { line: 1, vars: { 'default list': '[]' }, note: 'def runs once. The default list is created now and kept inside the function.' },
        { line: 4, vars: { 'default list': '[]' }, note: 'First call: no bucket is given, so the default list is used.' },
        { line: 2, vars: { item: 1, bucket: '[1]', 'default list': '[1]' }, note: 'append changes that one list, so the default is now [1].' },
        { line: 5, vars: { 'default list': '[1]' }, note: 'Second call: again no bucket, so the same changed list is used.' },
        { line: 2, vars: { item: 2, bucket: '[1, 2]', 'default list': '[1, 2]' }, note: 'append adds 2 to the list that already holds 1.' },
        { line: 3, vars: { item: 2, bucket: '[1, 2]' }, output: '[1, 2]', note: 'The shared list is returned. add_good makes a new list in every call instead.' },
      ],
      { at: 'end' },
    ),
    uml(
      'student-dataclass',
      'Records: dictionaries and dataclasses',
      'A class diagram with the Student dataclass and the records module. Student has the fields student_id, an int, name, a str, and marks, a dict from subject to mark, and the methods average, which returns the mean mark rounded to one decimal, and best_subject, which returns the subject with the highest mark. The records module has the functions make_student, load_students and rank_students, and it creates and uses Student objects.',
      'The data and the code that understands it live together in Student. @dataclass writes the constructor, the printed form and == for you.',
      [
        { id: 'student', name: 'Student', col: 0, row: 0, fields: ['student_id: int', 'name: str', 'marks: dict'], methods: ['average()', 'best_subject()'], tone: 'accent' },
        { id: 'records', name: 'records.py', col: 1, row: 0, fields: [], methods: ['make_student()', 'load_students()', 'rank_students()'], tone: 'info' },
      ],
      [['records', 'student', 'creates, uses', { head: 'open' }]],
      { dx: 300, dy: 210, at: 'end' },
    ),
    flow(
      'json-round-trip',
      'Records: dictionaries and dataclasses',
      'The JSON round trip in six steps. Student objects are turned into dictionaries by asdict. json.dumps turns the dictionaries into text. The text can be saved or sent. json.loads turns it back into dictionaries, and Student(**item) rebuilds the Student objects. Comparing the result with the originals proves that nothing was lost.',
      'Save, load, compare: the cheapest test of a storage format.',
      ['Student objects|the data in memory|accent', 'asdict|objects to dictionaries|info', 'json.dumps|dictionaries to text|good', 'text|saved or sent|warn', 'json.loads|text to dictionaries|good', 'Student(**item)|dictionaries to objects|accent2'],
      { layout: 'row', perRow: 3, at: 'end' },
    ),
    grid(
      'module-layout',
      'Modules, packages and the standard library',
      'The layout of a small project. The file main.py imports records, which holds the Student class and the functions. The file records.py imports two standard library modules, statistics and json. Because of the __main__ guard, importing records prints nothing.',
      'main.py uses records.py, and records.py uses the standard library. Each file has one job.',
      [
        ['main', 'rect', 'main.py', 0, 1, 'info', 'runs the program'],
        ['records', 'rect', 'records.py', 2, 1, 'accent', 'Student and the functions'],
        ['statistics', 'rect', 'statistics', 4, 0, 'good', 'standard library'],
        ['json', 'rect', 'json', 4, 2, 'good', 'standard library'],
      ],
      [
        ['main', 'records', 'import records'],
        ['records', 'statistics', 'import'],
        ['records', 'json', 'import'],
      ],
      { dx: 150, dy: 70, w: 130, h: 54, at: 'end' },
    ),
    table(
      'stdlib-tour',
      'Modules, packages and the standard library',
      'A table of eight standard library modules. math: functions and constants such as math.sqrt. statistics: mean, median, mode and standard deviation. collections: Counter, defaultdict and deque. random: random numbers, repeatable with a seed. json: converts between text and data. datetime: dates and times. csv: reads and writes comma separated files. re: regular expressions. pathlib: file paths and reading files.',
      'Look in the standard library before you write a helper or install a package.',
      ['Module', 'What it gives you', 'A typical call'],
      [
        ['math', 'functions and constants', 'math.sqrt(16)'],
        ['statistics', 'mean, median, mode, standard deviation', 'statistics.median([3, 1, 2])'],
        ['collections', 'Counter, defaultdict, deque', 'Counter("hello")'],
        ['random', 'random numbers, repeatable with a seed', 'random.Random(1).randint(1, 6)'],
        ['json', 'text to data and back', 'json.dumps({"a": 1})'],
        ['datetime', 'dates and times', 'datetime.date(2026, 3, 2)'],
        ['csv', 'comma separated files', 'csv.reader(lines)'],
        ['re', 'regular expressions', 're.findall(r"\\d+", text)'],
        ['pathlib', 'file paths and reading files', 'Path("data.txt").read_text()'],
      ],
      { at: 'end' },
    ),
    V(
      'chart',
      'subject-means',
      'Lesson Project: Student Records Toolkit',
      'A bar chart of the class mean of each subject for the five valid students of the project. Maths is 72.0, Physics is 72.6 and ICT is 75.4.',
      'The three subject means that the project report prints: close together, with ICT the highest.',
      {
        kind: 'bar',
        xLabel: 'Subject',
        yLabel: 'Class mean',
        categories: ['Maths', 'Physics', 'ICT'],
        series: [{ name: 'Class mean', values: [72, 72.6, 75.4] }],
      },
      { at: 'start' },
    ),
    lab(
      'collections-lab',
      'Example 1',
      'python',
      'A Python editor with the program that sorts, slices, intersects sets, groups marks in a dictionary and counts with Counter, with its expected output.',
      'Add the row ("Mim", "Maths", 88) and predict the new sets before you run it.',
      `from collections import Counter

rows = [
    ("Ayesha", "Maths", 92), ("Tanvir", "Maths", 67), ("Sadia", "Maths", 38),
    ("Ayesha", "Physics", 85), ("Tanvir", "Physics", 71), ("Mim", "Physics", 88),
    ("Nabil", "ICT", 75),
]

best_three = sorted(rows, key=lambda row: row[2], reverse=True)[:3]
print("top 3:", best_three)

maths = {name for name, subject, _ in rows if subject == "Maths"}
physics = {name for name, subject, _ in rows if subject == "Physics"}
print("both:", sorted(maths & physics))
print("maths only:", sorted(maths - physics))
print("either:", sorted(maths | physics))

by_subject = {}
for name, subject, mark in rows:
    by_subject.setdefault(subject, []).append(mark)
print(by_subject)
print({subject: round(sum(marks) / len(marks), 1) for subject, marks in by_subject.items()})
print(Counter(subject for _, subject, _ in rows).most_common())
print("Mim" in physics, "Mim" in maths)`,
      { expected: 'top 3: [(\'Ayesha\', \'Maths\', 92), (\'Mim\', \'Physics\', 88), (\'Ayesha\', \'Physics\', 85)]\nboth: [\'Ayesha\', \'Tanvir\']\nmaths only: [\'Sadia\']\neither: [\'Ayesha\', \'Mim\', \'Sadia\', \'Tanvir\']\n{\'Maths\': [92, 67, 38], \'Physics\': [85, 71, 88], \'ICT\': [75]}\n{\'Maths\': 65.7, \'Physics\': 81.3, \'ICT\': 75.0}\n[(\'Maths\', 3), (\'Physics\', 3), (\'ICT\', 1)]\nTrue False', filename: 'collections_demo.py', at: 'end' },
    ),
    lab(
      'functions-lab',
      'Example 2',
      'python',
      'A Python editor with the program that defines describe and parse_mark, handles errors with try, except and finally, and shows the mutable default argument trap, with its expected output.',
      'Add a default argument to describe that is returned instead of raising an error.',
      `def describe(values, label="values"):
    """Return the count, mean, minimum and maximum of a list of numbers."""
    if not values:
        raise ValueError(f"no {label} to describe")
    return len(values), round(sum(values) / len(values), 1), min(values), max(values)


def parse_mark(text):
    """Turn text into a mark from 0 to 100, or raise ValueError with a clear message."""
    value = int(text)
    if not 0 <= value <= 100:
        raise ValueError(f"{value} is outside 0 to 100")
    return value


count, mean, low, high = describe([92, 67, 38, 75, 88])
print(count, mean, low, high)
print(describe([5, 9], label="scores")[1])

for text in ["72", "abc", "105"]:
    try:
        print("ok:", parse_mark(text))
    except ValueError as error:
        print("bad:", error)
    finally:
        print("checked", repr(text))

try:
    describe([], label="marks")
except ValueError as error:
    print("error:", error)


def add_bad(item, bucket=[]):
    bucket.append(item)
    return bucket


def add_good(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket


add_bad(1)
print("bad default:", add_bad(2))
add_good(1)
print("good default:", add_good(2))`,
      { expected: '5 72.0 38 92\n7.0\nok: 72\nchecked \'72\'\nbad: invalid literal for int() with base 10: \'abc\'\nchecked \'abc\'\nbad: 105 is outside 0 to 100\nchecked \'105\'\nerror: no marks to describe\nbad default: [1, 2]\ngood default: [2]', filename: 'functions_demo.py', at: 'end' },
    ),
    lab(
      'dataclass-lab',
      'Example 3',
      'python',
      'A Python editor with the Student dataclass, its methods and a JSON round trip check, with its expected output.',
      'Give Sadia two equal best marks and see which subject best_subject returns.',
      `import json
from dataclasses import asdict, dataclass, field


@dataclass
class Student:
    student_id: int
    name: str
    marks: dict = field(default_factory=dict)

    def average(self):
        return round(sum(self.marks.values()) / len(self.marks), 1) if self.marks else None

    def best_subject(self):
        return max(self.marks, key=self.marks.get) if self.marks else None


students = [
    Student(1, "Ayesha Rahman", {"Maths": 92, "Physics": 85, "ICT": 90}),
    Student(2, "Tanvir Ahmed", {"Maths": 67, "Physics": 71, "ICT": 64}),
    Student(3, "Sadia Islam"),
]
print(students[0])
for student in students:
    print(student.name, student.average(), student.best_subject())

text = json.dumps([asdict(s) for s in students])
print(text[:72] + "...")
loaded = [Student(**item) for item in json.loads(text)]
print("round trip equal:", loaded == students)
print("module name:", __name__)`,
      { expected: 'Student(student_id=1, name=\'Ayesha Rahman\', marks={\'Maths\': 92, \'Physics\': 85, \'ICT\': 90})\nAyesha Rahman 89.0 Maths\nTanvir Ahmed 67.3 Physics\nSadia Islam None None\n[{"student_id": 1, "name": "Ayesha Rahman", "marks": {"Maths": 92, "Phys...\nround trip equal: True\nmodule name: __main__', filename: 'student_dataclass.py', at: 'end' },
    ),
  ],
  [`${M}/3`]: [
    flow(
      'algorithm-routine',
      'From pseudo-code to Python',
      'The routine for implementing an algorithm in six steps. Write the specification with the precondition. List the edge cases. Write the tests. Write the code. Run the tests and count the operations. Compare the results with a trusted oracle such as sorted.',
      'Tests come before code, and the oracle keeps you honest.',
      ['Specify|input, output, precondition|accent', 'Edge cases|empty, one, duplicates|info', 'Tests|PASS or FAIL|warn', 'Code|a clear, small function|good', 'Run and count|comparisons, not seconds|accent2', 'Oracle|compare with sorted|good'],
      { layout: 'row', perRow: 3, at: 'end' },
    ),
    table(
      'algorithm-compare',
      'Searching and sorting',
      'A table of five algorithms. Linear search takes 1 comparison at best and n at worst and needs nothing. Binary search takes 1 at best and about log2 n plus 1 at worst and needs sorted data. Insertion sort takes n minus 1 comparisons for sorted input and n times n minus 1 over 2 for reversed input, in place and stable. Merge sort takes about n log2 n comparisons in every case, needs O(n) extra memory and is stable. Python sorted, which uses Timsort, takes about n minus 1 comparisons for sorted input and n log2 n at worst, with O(n) extra memory, and is stable.',
      'Counts, not seconds: the same on every computer.',
      ['Algorithm', 'Best case', 'Worst case', 'Needs'],
      [
        ['Linear search', '1 comparison', 'n comparisons', 'nothing'],
        ['Binary search', '1 comparison', 'about log2 n + 1', 'sorted data'],
        ['Insertion sort', 'n - 1 (sorted input)', 'n(n - 1)/2 (reversed input)', 'in place, stable'],
        ['Merge sort', 'about (n log2 n) / 2', 'about n log2 n', 'O(n) extra memory, stable'],
        ['sorted() (Timsort)', 'about n - 1 (sorted input)', 'about n log2 n', 'O(n) extra memory, stable'],
      ],
      { at: 'end', highlights: [{ row: 4, col: 0, tone: 'good' }, { row: 2, col: 2, tone: 'warn' }] },
    ),
    algoSteps(
      'insertion-steps',
      'Searching and sorting',
      'Six frames of insertion sort on the list 5, 2, 4, 6, 1, 3. The first item alone is sorted. Inserting 2 shifts 5 to the right. Inserting 4 shifts 5. Inserting 6 shifts nothing. Inserting 1 shifts four items. Inserting 3 shifts three items, and the list is sorted.',
      'The sorted prefix grows by one item at a time. Each insertion shifts the bigger items one place to the right.',
      [
        { array: [5, 2, 4, 6, 1, 3], marks: { 0: 'sorted' }, note: 'The first item alone is a sorted prefix.', counters: { comparisons: 0 } },
        { array: [2, 5, 4, 6, 1, 3], marks: { 0: 'sorted', 1: 'sorted' }, note: 'Insert 2: it is smaller than 5, so 5 moves right and 2 lands at the front.', counters: { comparisons: 1 } },
        { array: [2, 4, 5, 6, 1, 3], marks: { 0: 'sorted', 1: 'sorted', 2: 'sorted' }, note: 'Insert 4: 5 moves right, then 4 is not smaller than 2 and stops.', counters: { comparisons: 3 } },
        { array: [2, 4, 5, 6, 1, 3], marks: { 0: 'sorted', 1: 'sorted', 2: 'sorted', 3: 'sorted' }, note: 'Insert 6: one comparison, nothing moves.', counters: { comparisons: 4 } },
        { array: [1, 2, 4, 5, 6, 3], marks: { 0: 'sorted', 1: 'sorted', 2: 'sorted', 3: 'sorted', 4: 'sorted' }, note: 'Insert 1: it is smaller than all four, so all four move right.', counters: { comparisons: 8 } },
        { array: [1, 2, 3, 4, 5, 6], marks: { 0: 'sorted', 1: 'sorted', 2: 'sorted', 3: 'sorted', 4: 'sorted', 5: 'sorted' }, note: 'Insert 3: 6, 5 and 4 move right, and 3 stops after 2. The list is sorted.', counters: { comparisons: 12 } },
      ],
      { at: 'end' },
    ),
    V(
      'chart',
      'growth-factors',
      'Example 1',
      'A line chart of how much more work each algorithm needs when n grows from 100 to 200, 400 and 800, compared with n equal to 100. Linear search grows 1, 2, 4, 8 times. Binary search grows 1, 1.2, 1.3, 1.5 times. Merge sort grows 1, 2.3, 5.4, 12.2 times. Insertion sort grows 1, 3.7, 14.9, 57.2 times.',
      'The same data as the table, as growth factors. Insertion sort leaves the others far behind.',
      {
        kind: 'line',
        xLabel: 'n (number of items)',
        yLabel: 'Work compared with n = 100',
        categories: ['100', '200', '400', '800'],
        series: [
          { name: 'binary search', values: [1, 1.17, 1.33, 1.5] },
          { name: 'linear search', values: [1, 2, 4, 8] },
          { name: 'merge sort', values: [1, 2.34, 5.39, 12.22] },
          { name: 'insertion sort', values: [1, 3.68, 14.93, 57.21] },
        ],
      },
      { at: 'end' },
    ),
    graph(
      'campus-bfs',
      'Example 2',
      'A step-through of breadth-first search from the Gate on the campus graph. The Gate is queued. Taking the Gate discovers the Library and the Canteen. Taking the Library discovers Admin and the Lab. Taking the Canteen discovers the Hall. Taking Admin discovers nothing new. Taking the Lab discovers the Workshop, so the shortest path to the Workshop is Gate, Library, Lab, Workshop. The Garden is never reached.',
      'BFS explores in rings of distance. The Workshop is first reached through the Lab, and the Garden is an island.',
      [
        { id: 'Gate', x: 50, y: 110, tone: 'accent' },
        { id: 'Library', x: 180, y: 45 },
        { id: 'Canteen', x: 180, y: 175 },
        { id: 'Lab', x: 320, y: 30 },
        { id: 'Admin', x: 320, y: 110 },
        { id: 'Hall', x: 320, y: 190 },
        { id: 'Workshop', x: 470, y: 110 },
        { id: 'Garden', x: 470, y: 205, tone: 'warn' },
      ],
      [['Gate', 'Library'], ['Gate', 'Canteen'], ['Library', 'Admin'], ['Library', 'Lab'], ['Canteen', 'Hall'], ['Admin', 'Hall'], ['Lab', 'Workshop'], ['Hall', 'Workshop']],
      {
        at: 'end',
        steps: [
          { visit: ['Gate'], queue: ['Gate'], note: 'Start: mark the Gate and put it in the queue.' },
          { visit: ['Gate', 'Library', 'Canteen'], queue: ['Library', 'Canteen'], current: 'Gate', note: 'Take the Gate: the Library and the Canteen are new.' },
          { visit: ['Gate', 'Library', 'Canteen', 'Admin', 'Lab'], queue: ['Canteen', 'Admin', 'Lab'], current: 'Library', note: 'Take the Library: Admin and the Lab are new.' },
          { visit: ['Gate', 'Library', 'Canteen', 'Admin', 'Lab', 'Hall'], queue: ['Admin', 'Lab', 'Hall'], current: 'Canteen', note: 'Take the Canteen: only the Hall is new.' },
          { visit: ['Gate', 'Library', 'Canteen', 'Admin', 'Lab', 'Hall'], queue: ['Lab', 'Hall'], current: 'Admin', note: 'Take Admin: the Library and the Hall are known already.' },
          { visit: ['Gate', 'Library', 'Canteen', 'Admin', 'Lab', 'Hall', 'Workshop'], queue: ['Hall', 'Workshop'], current: 'Lab', note: 'Take the Lab: the Workshop is new, found through the Lab. Shortest path: Gate, Library, Lab, Workshop.' },
        ],
      },
    ),
    tree(
      'fib-calls',
      'Example 3',
      'The call tree of the plain fib(5), with 15 calls. fib(5) calls fib(4) and fib(3). fib(4) calls fib(3) and fib(2). The second fib(3), the second fib(2) and all the calls below them repeat work that was already done. The repeated subtrees are marked.',
      'Fifteen calls for fib(5), and most of them repeat work. With a cache each value is computed once.',
      {
        label: 'fib(5)',
        children: [
          {
            label: 'fib(4)',
            tone: 'info',
            children: [
              { label: 'fib(3)', tone: 'good', children: [{ label: 'fib(2)', tone: 'good', children: [{ label: 'fib(1)', tone: 'good' }, { label: 'fib(0)', tone: 'good' }] }, { label: 'fib(1)', tone: 'good' }] },
              { label: 'fib(2)', tone: 'warn', children: [{ label: 'fib(1)', tone: 'warn' }, { label: 'fib(0)', tone: 'warn' }] },
            ],
          },
          {
            label: 'fib(3)',
            tone: 'warn',
            children: [{ label: 'fib(2)', tone: 'warn', children: [{ label: 'fib(1)', tone: 'warn' }, { label: 'fib(0)', tone: 'warn' }] }, { label: 'fib(1)', tone: 'warn' }],
          },
        ],
      },
      { at: 'end' },
    ),
    table(
      'coin-dp-table',
      'Example 3',
      'The dynamic programming table for the amounts 0 to 6 with the coins 1, 3 and 4. The fewest coins are 0, 1, 2, 1, 1, 2 and 2. The amount 6 needs 2 coins, 3 and 3, while the greedy rule takes 4, 1 and 1, which is 3 coins.',
      'Each row is built from earlier rows. Row 6 uses 3 + 3 = 2 coins, which greedy never finds.',
      ['Amount', 'Fewest coins', 'Made from'],
      [
        ['0', '0', 'nothing'],
        ['1', '1', '1'],
        ['2', '2', '1 + 1'],
        ['3', '1', '3'],
        ['4', '1', '4'],
        ['5', '2', '4 + 1'],
        ['6', '2', '3 + 3'],
      ],
      { at: 'end', highlights: [{ row: 6, col: 1, tone: 'good', note: 'greedy: 3' }, { row: 6, col: 2, tone: 'good' }] },
    ),
    cards(
      'edge-case-checklist',
      'Testing and measuring algorithms',
      'Six cards for testing an algorithm: the empty list, one item, duplicates, the order of the input (sorted, reversed), a missing target, and the oracle comparison with sorted on pseudo-random data.',
      'Six checks that find most bugs before the users do.',
      [
        { title: 'Empty', subtitle: '[]', tone: 'info', bullets: ['no crash, a sensible answer'] },
        { title: 'One item', subtitle: '[7]', tone: 'info', bullets: ['the loop bounds are right'] },
        { title: 'Duplicates', subtitle: '[3, 3, 1]', tone: 'accent', bullets: ['first match? stable order?'] },
        { title: 'Order', subtitle: 'sorted, reversed', tone: 'accent', bullets: ['best and worst case'] },
        { title: 'Missing', subtitle: 'target not there', tone: 'warn', bullets: ['returns -1 or None'] },
        { title: 'Oracle', subtitle: 'sorted(data)', tone: 'good', bullets: ['many pseudo-random lists', 'repeatable with a seed'] },
      ],
      { at: 'end' },
    ),
    lab(
      'counting-lab',
      'Example 1',
      'python',
      'A Python editor with the search and sort functions that count comparisons and the table for n of 100, 200, 400 and 800, with its expected output.',
      'Change the seed of lcg to 99 and check whether the doubling factors stay about the same.',
      `def lcg(seed, count, modulus=10_000):
    """A tiny pseudo-random generator: the same numbers on every computer."""
    values, x = [], seed
    for _ in range(count):
        x = (x * 1103515245 + 12345) % 2 ** 31
        values.append(x % modulus)
    return values


def linear_search(items, target):
    comparisons = 0
    for index, item in enumerate(items):
        comparisons += 1
        if item == target:
            return index, comparisons
    return -1, comparisons


def binary_search(items, target):
    low, high, comparisons = 0, len(items) - 1, 0
    while low <= high:
        mid = (low + high) // 2
        comparisons += 1
        if items[mid] == target:
            return mid, comparisons
        if items[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1, comparisons


def insertion_sort(items):
    items, comparisons = list(items), 0
    for i in range(1, len(items)):
        key, j = items[i], i - 1
        while j >= 0:
            comparisons += 1
            if items[j] <= key:
                break
            items[j + 1] = items[j]
            j -= 1
        items[j + 1] = key
    return items, comparisons


def merge_sort(items):
    if len(items) <= 1:
        return list(items), 0
    middle = len(items) // 2
    left, left_count = merge_sort(items[:middle])
    right, right_count = merge_sort(items[middle:])
    merged, i, j, comparisons = [], 0, 0, left_count + right_count
    while i < len(left) and j < len(right):
        comparisons += 1
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged, comparisons


print(f"{'n':>5} {'linear':>7} {'binary':>7} {'insertion':>10} {'merge':>7}")
previous = None
for n in (100, 200, 400, 800):
    data = lcg(7, n)
    ordered, merge_count = merge_sort(data)
    assert ordered == sorted(data) == insertion_sort(data)[0]
    _, linear_count = linear_search(data, -1)
    _, binary_count = binary_search(ordered, -1)
    _, insertion_count = insertion_sort(data)
    print(f"{n:>5} {linear_count:>7} {binary_count:>7} {insertion_count:>10} {merge_count:>7}")
    if previous:
        print(f"      doubling n: insertion x{insertion_count / previous[0]:.1f}, merge x{merge_count / previous[1]:.1f}")
    previous = (insertion_count, merge_count)`,
      { expected: '    n  linear  binary  insertion   merge\n  100     100       6       2797     550\n  200     200       7      10279    1289\n      doubling n: insertion x3.7, merge x2.3\n  400     400       8      41757    2963\n      doubling n: insertion x4.1, merge x2.3\n  800     800       9     160013    6724\n      doubling n: insertion x3.8, merge x2.3', filename: 'counting.py', at: 'end' },
    ),
    lab(
      'bfs-lab',
      'Example 2',
      'python',
      'A Python editor with breadth-first search, depth-first search and the connected components of the campus graph, with its expected output.',
      'Add an edge between the Hall and the Garden and predict the new shortest path to the Garden.',
      `from collections import deque

CAMPUS = {
    "Gate": ["Library", "Canteen"],
    "Library": ["Gate", "Admin", "Lab"],
    "Canteen": ["Gate", "Hall"],
    "Admin": ["Library", "Hall"],
    "Lab": ["Library", "Workshop"],
    "Hall": ["Canteen", "Admin", "Workshop"],
    "Workshop": ["Lab", "Hall"],
    "Garden": [],
}


def bfs_path(graph, start, goal):
    """The shortest path from start to goal (fewest steps), or None."""
    parent = {start: None}
    queue = deque([start])
    while queue:
        place = queue.popleft()
        if place == goal:
            path = []
            while place is not None:
                path.append(place)
                place = parent[place]
            return path[::-1]
        for neighbour in graph[place]:
            if neighbour not in parent:
                parent[neighbour] = place
                queue.append(neighbour)
    return None


def reachable(graph, place, seen=None):
    """Every place that can be reached from \`place\` (depth-first search)."""
    seen = set() if seen is None else seen
    seen.add(place)
    for neighbour in graph[place]:
        if neighbour not in seen:
            reachable(graph, neighbour, seen)
    return seen


def components(graph):
    seen, count = set(), 0
    for place in graph:
        if place not in seen:
            seen |= reachable(graph, place)
            count += 1
    return count


for goal in ("Workshop", "Admin", "Gate", "Garden"):
    path = bfs_path(CAMPUS, "Gate", goal)
    print(f"Gate -> {goal}:", " > ".join(path) + f" ({len(path) - 1} steps)" if path else "no path")
print("reachable from Gate:", sorted(reachable(CAMPUS, "Gate")))
print("separate parts:", components(CAMPUS))
CAMPUS["Canteen"].append("Garden")
CAMPUS["Garden"].append("Canteen")
print("after a path to the garden:", " > ".join(bfs_path(CAMPUS, "Gate", "Garden")), "| parts:", components(CAMPUS))`,
      { expected: 'Gate -> Workshop: Gate > Library > Lab > Workshop (3 steps)\nGate -> Admin: Gate > Library > Admin (2 steps)\nGate -> Gate: Gate (0 steps)\nGate -> Garden: no path\nreachable from Gate: [\'Admin\', \'Canteen\', \'Gate\', \'Hall\', \'Lab\', \'Library\', \'Workshop\']\nseparate parts: 2\nafter a path to the garden: Gate > Canteen > Garden | parts: 1', filename: 'campus.py', at: 'end' },
    ),
    lab(
      'memo-lab',
      'Example 3',
      'python',
      'A Python editor with the naive and memoised Fibonacci functions and the greedy and dynamic programming coin functions, with its expected output.',
      'Compare greedy_coins and min_coins for 63 with the coins 1, 5, 10, 21 and 25.',
      `from functools import lru_cache

calls = 0


def fib_naive(n):
    global calls
    calls += 1
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)


@lru_cache(maxsize=None)
def fib_memo(n):
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)


print("fib(25) naive:", fib_naive(25), "after", calls, "calls")
print("fib(25) memo: ", fib_memo(25), "with", fib_memo.cache_info())
print("fib(90) memo: ", fib_memo(90))


def greedy_coins(amount, coins):
    count = 0
    for coin in sorted(coins, reverse=True):
        count += amount // coin
        amount %= coin
    return count if amount == 0 else None


def min_coins(amount, coins):
    best = [0] + [None] * amount
    for total in range(1, amount + 1):
        options = [best[total - c] + 1 for c in coins if c <= total and best[total - c] is not None]
        best[total] = min(options) if options else None
    return best[amount]


for amount, coins in [(63, [1, 5, 10, 25]), (6, [1, 3, 4]), (7, [2, 4])]:
    print(amount, coins, "greedy:", greedy_coins(amount, coins), "dp:", min_coins(amount, coins))`,
      { expected: 'fib(25) naive: 75025 after 242785 calls\nfib(25) memo:  75025 with CacheInfo(hits=23, misses=26, maxsize=None, currsize=26)\nfib(90) memo:  2880067194370816120\n63 [1, 5, 10, 25] greedy: 6 dp: 6\n6 [1, 3, 4] greedy: 3 dp: 2\n7 [2, 4] greedy: None dp: None', filename: 'memo_and_coins.py', at: 'end' },
    ),
  ],
  [`${M}/4`]: [
    flow(
      'ds-workflow',
      'The data science workflow',
      'The data science workflow as a cycle of six steps: ask a question, collect the data, clean it, explore it, model or test an idea, and communicate the result. The answer raises new questions, so the cycle starts again.',
      'A loop, not a line. Most of the time is spent on the Clean step.',
      ['Question|what do we want to know?|accent', 'Collect|who, how, why?|info', 'Clean|rules and a log|warn', 'Explore|summaries, charts|good', 'Model|test an idea|accent2', 'Communicate|honestly, with limits|info'],
      { layout: 'cycle', at: 'end' },
    ),
    table(
      'variable-kinds',
      'The data science workflow',
      'A table of four kinds of variable and the summary that fits each. A nominal categorical variable such as the class label or a city has no order and is summarised with the mode and a frequency table. An ordinal categorical variable such as the grade A plus, A, A minus has an order and is summarised with the median and the mode. A discrete numerical variable such as the number of siblings is summarised with the mean and the median. A continuous numerical variable such as hours studied is summarised with the mean, the median and the standard deviation.',
      'Choose the summary by the kind of variable.',
      ['Kind of variable', 'Example', 'Summary that fits'],
      [
        ['categorical, nominal', 'class label, city', 'mode, frequency table'],
        ['categorical, ordinal', 'grade A+, A, A-, B', 'median, mode'],
        ['numerical, discrete', 'number of siblings', 'mean, median'],
        ['numerical, continuous', 'hours studied, height', 'mean, median, standard deviation'],
      ],
      { at: 'end' },
    ),
    table(
      'cleaning-problems',
      'Loading and cleaning data',
      'A table of six data problems with a possible rule for each. A missing value, such as an empty hours cell: drop the row, or fill it in and flag it. A duplicate, such as id 8 twice: keep the first. An impossible value, such as a score of 105: drop it, or ask for a correction. A wrong type, such as the text abc in hours: drop it, or convert it if that is possible. An inconsistent label, such as a class written with spaces: strip and normalise it. A true outlier, such as 28 hours: keep it and report it.',
      'Every problem needs a rule, and every use of a rule needs a line in the log.',
      ['Problem', 'Example', 'A rule you can choose', 'Log line in the lesson'],
      [
        ['Missing value', 'an empty hours cell', 'drop the row, or fill it and flag it', 'hours is missing'],
        ['Duplicate', 'id 8 twice', 'keep the first row', 'the id 8 is a duplicate'],
        ['Impossible value', 'a score of 105', 'drop it, or ask for a correction', 'score 105 is outside 0 to 100'],
        ['Wrong type', "'abc' in hours", 'drop it, or convert if possible', "hours 'abc' is not a number"],
        ['Inconsistent label', "' 10 ' or 'class 10'", 'strip spaces and normalise', 'normalised, no row lost'],
        ['True outlier', '28 hours of study', 'keep it, and report it', 'listed as an outlier'],
      ],
      { at: 'end', highlights: [{ row: 5, col: 2, tone: 'good' }] },
    ),
    V(
      'chart',
      'score-bands',
      'Example 2',
      'A bar chart of how many of the 20 students scored in each band of ten. 30 to 39: 1. 40 to 49: 1. 50 to 59: 3. 60 to 69: 3. 70 to 79: 6. 80 to 89: 3. 90 to 99: 3.',
      'The histogram of Example 2: a bump in the 70s and thin tails on both sides.',
      {
        kind: 'bar',
        xLabel: 'Score band',
        yLabel: 'Students',
        categories: ['30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-99'],
        series: [{ name: 'Students', values: [1, 1, 3, 3, 6, 3, 3] }],
      },
      { at: 'end' },
    ),
    V(
      'chart',
      'hours-scatter',
      'Example 3',
      'A scatter plot of 20 students, with hours of study on the horizontal axis and the score on the vertical axis, and the least-squares line through the points. The points rise from about 2 hours and 41 points to 15 hours and 97 points, with a correlation of about 0.85.',
      'More hours go with higher scores, with some scatter. The line is score = 39.1 + 3.7 x hours.',
      {
        kind: 'scatter',
        xLabel: 'Hours studied',
        yLabel: 'Score',
        fitLine: true,
        series: [{ name: 'students', points: [{ x: 12, y: 88 }, { x: 8, y: 67 }, { x: 3, y: 38 }, { x: 10, y: 75 }, { x: 14, y: 94 }, { x: 9, y: 72 }, { x: 6, y: 58 }, { x: 11, y: 83 }, { x: 7, y: 55 }, { x: 5, y: 80 }, { x: 10, y: 79 }, { x: 4, y: 71 }, { x: 13, y: 91 }, { x: 8, y: 64 }, { x: 6, y: 61 }, { x: 12, y: 70 }, { x: 2, y: 41 }, { x: 9, y: 70 }, { x: 15, y: 97 }, { x: 5, y: 57 }] }],
      },
      { at: 'end' },
    ),
    walkthrough(
      'pearson-steps',
      'Relationships, correlation and honest conclusions',
      'A four-step walk-through of the correlation coefficient. Step 1: subtract the means from every value, 8.45 hours and 70.55 points. Step 2: multiply the two deviations of each student; a student above average in both gets a positive product. Step 3: add the products and divide by the square root of the product of the two sums of squared deviations. Step 4: the result is 0.852, because most products are positive.',
      'r is the average agreement of the deviations from the means, scaled to lie between -1 and 1.',
      [
        { title: '1. Centre the data', text: 'Subtract the mean of each variable: 8.45 hours and 70.55 points. A student with 14 hours and 94 points has the deviations +5.55 and +23.45.' },
        { title: '2. Multiply the deviations', text: 'For this student 5.55 x 23.45 is about +130, positive because both are above average. A student above average in one and below in the other gives a negative product.' },
        { title: '3. Add and scale', text: 'Add all the products (sxy). Divide by the square root of (sum of squared hour deviations x sum of squared score deviations), so that the answer stays between -1 and 1.' },
        { title: '4. Read the result', text: 'Here r = 0.852: most products are positive, so more hours go with higher scores. A value near 0 would mean that the positive and negative products cancel.' },
      ],
      { at: 'end' },
    ),
    cards(
      'honest-conclusions',
      'Relationships, correlation and honest conclusions',
      'Four cards with four warnings. Correlation is not causation: temperature causes both ice cream sales and sunburn. One outlier can change r: from 0.85 to 0.47 with one odd student. Do not extrapolate: the line predicts 188 points for 40 hours. The sample matters: 20 students of one school are not all students.',
      'Four ways to fool yourself, and the number from the lesson that shows each one.',
      [
        { title: 'Correlation is not causation', subtitle: 'confounder', tone: 'warn', bullets: ['ice cream and sunburn: r = 0.999', 'temperature causes both'] },
        { title: 'One outlier', subtitle: 'r = 0.85 to 0.47', tone: 'accent', bullets: ['look at the scatter plot', 'report r with and without it'] },
        { title: 'No extrapolation', subtitle: '40 hours gives 188', tone: 'info', bullets: ['the line was fitted to 2 to 15 hours', 'a score cannot exceed 100'] },
        { title: 'The sample', subtitle: '20 students, one school', tone: 'good', bullets: ['print n with every summary', 'ask who is missing'] },
      ],
      { at: 'end' },
    ),
    lab(
      'cleaning-lab',
      'Example 1',
      'python',
      'A Python editor with the program that reads a CSV text, drops duplicate, missing, non-numeric and impossible rows and prints a log, with its expected output.',
      'Add a row with the score -5 and a row with the class written as \' 10 \' and see what the rules do.',
      `import csv
import io

RAW = """id,name,class,hours,score
1,Ayesha,10,12,88
2,Tanvir,10,8,67
3,Sadia,9,3,38
4,Nabil,11,10,75
5,Mim,10,14,94
6,Rafi,12,,60
7,Tasnim,9,6,105
8,Fahim,11,9,72
8,Fahim,11,9,72
9,Zara,10,abc,81
10,Imran,12,7,55
"""


def clean(raw_text):
    """Return the clean rows and a log that explains every row that was removed."""
    rows, log, seen = [], [], set()
    for line, row in enumerate(csv.DictReader(io.StringIO(raw_text)), start=2):
        name = row["name"].strip()
        if row["id"] in seen:
            log.append(f"line {line}: {name} dropped, the id {row['id']} is a duplicate")
            continue
        seen.add(row["id"])
        try:
            hours = float(row["hours"])
        except ValueError:
            problem = "hours is missing" if row["hours"].strip() == "" else f"hours '{row['hours']}' is not a number"
            log.append(f"line {line}: {name} dropped, {problem}")
            continue
        score = int(row["score"])
        if not 0 <= score <= 100:
            log.append(f"line {line}: {name} dropped, score {score} is outside 0 to 100")
            continue
        rows.append({"id": int(row["id"]), "name": name, "class": int(row["class"]), "hours": hours, "score": score})
    return rows, log


rows, log = clean(RAW)
print("\\n".join(log))
print(f"{len(RAW.splitlines()) - 1} data lines read, {len(rows)} kept, {len(log)} removed")
print(rows[0])
print("kept names:", ", ".join(r["name"] for r in rows))
print("types:", type(rows[0]["hours"]).__name__, type(rows[0]["score"]).__name__, type(rows[0]["class"]).__name__)`,
      { expected: 'line 7: Rafi dropped, hours is missing\nline 8: Tasnim dropped, score 105 is outside 0 to 100\nline 10: Fahim dropped, the id 8 is a duplicate\nline 11: Zara dropped, hours \'abc\' is not a number\n11 data lines read, 7 kept, 4 removed\n{\'id\': 1, \'name\': \'Ayesha\', \'class\': 10, \'hours\': 12.0, \'score\': 88}\nkept names: Ayesha, Tanvir, Sadia, Nabil, Mim, Fahim, Imran\ntypes: float int int', filename: 'cleaning.py', at: 'end' },
    ),
    lab(
      'statistics-lab',
      'Example 2',
      'python',
      'A Python editor with the program that computes the mean, median, standard deviation, quartiles, class means and a text histogram of 20 scores, with its expected output.',
      'Add the mode of the scores, and then add the score 5 and run the outlier check again.',
      `import statistics
from collections import Counter, defaultdict

DATA = [  # class, hours studied, score
    (10, 12, 88), (10, 8, 67), (9, 3, 38), (11, 10, 75), (10, 14, 94), (12, 9, 72), (9, 6, 58), (11, 11, 83),
    (12, 7, 55), (9, 5, 80), (10, 10, 79), (11, 4, 71), (12, 13, 91), (9, 8, 64), (10, 6, 61), (11, 12, 70),
    (12, 2, 41), (9, 9, 70), (10, 15, 97), (11, 5, 57),
]
scores = [score for _, _, score in DATA]

print("n:", len(scores), "| mean:", round(statistics.mean(scores), 1), "| median:", statistics.median(scores))
print("range:", min(scores), "to", max(scores), "| stdev:", round(statistics.stdev(scores), 1))
q1, q2, q3 = statistics.quantiles(scores, n=4)
print("quartiles:", q1, q2, q3, "| IQR:", q3 - q1)

by_class = defaultdict(list)
for school_class, _, score in DATA:
    by_class[school_class].append(score)
for school_class in sorted(by_class):
    values = by_class[school_class]
    print(f"class {school_class}: {len(values)} students, mean {statistics.mean(values):.1f}, median {statistics.median(values)}, best {max(values)}")

bands = Counter(score // 10 * 10 for score in scores)
for band in range(30, 100, 10):
    print(f"{band}-{band + 9} | {'#' * bands[band]} {bands[band] or ''}".rstrip())

with_outlier = scores + [5]
print("add one score of 5: mean", round(statistics.mean(with_outlier), 1), "median", statistics.median(with_outlier))`,
      { expected: 'n: 20 | mean: 70.5 | median: 70.5\nrange: 38 to 97 | stdev: 16.2\nquartiles: 58.75 70.5 82.25 | IQR: 23.5\nclass 9: 5 students, mean 62.0, median 64, best 80\nclass 10: 6 students, mean 81.0, median 83.5, best 97\nclass 11: 5 students, mean 71.2, median 71, best 83\nclass 12: 4 students, mean 64.8, median 63.5, best 91\n30-39 | # 1\n40-49 | # 1\n50-59 | ### 3\n60-69 | ### 3\n70-79 | ###### 6\n80-89 | ### 3\n90-99 | ### 3\nadd one score of 5: mean 67.4 median 70', filename: 'statistics_demo.py', at: 'end' },
    ),
    lab(
      'correlation-lab',
      'Example 3',
      'python',
      'A Python editor with the correlation coefficient, the least-squares line and the ice cream and sunburn example, with its expected output.',
      'Add 3 hours to every student and check that r does not change.',
      `import statistics

hours = [12, 8, 3, 10, 14, 9, 6, 11, 7, 5, 10, 4, 13, 8, 6, 12, 2, 9, 15, 5]
scores = [88, 67, 38, 75, 94, 72, 58, 83, 55, 80, 79, 71, 91, 64, 61, 70, 41, 70, 97, 57]


def pearson(xs, ys):
    """The correlation coefficient r, from -1 to 1."""
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    return sxy / (sxx * syy) ** 0.5


def least_squares(xs, ys):
    """The line y = intercept + slope * x that is closest to the points."""
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    return my - slope * mx, slope


r = pearson(hours, scores)
print("r =", round(r, 3), "| library check:", round(statistics.correlation(hours, scores), 3))
intercept, slope = least_squares(hours, scores)
print(f"score = {intercept:.1f} + {slope:.1f} x hours")
print("prediction for 10 hours:", round(intercept + slope * 10), "| for 40 hours:", round(intercept + slope * 40))
print("r with one odd student (20 hours, score 45):", round(pearson(hours + [20], scores + [45]), 3))

temperature = [15, 18, 24, 28, 33, 35]
ice_cream = [20, 25, 40, 60, 85, 90]
sunburn = [3, 4, 9, 14, 22, 24]
print("ice cream and sunburn: r =", round(pearson(ice_cream, sunburn), 3))
print("temperature and ice cream: r =", round(pearson(temperature, ice_cream), 3), "| temperature and sunburn: r =", round(pearson(temperature, sunburn), 3))`,
      { expected: 'r = 0.852 | library check: 0.852\nscore = 39.1 + 3.7 x hours\nprediction for 10 hours: 76 | for 40 hours: 188\nr with one odd student (20 hours, score 45): 0.468\nice cream and sunburn: r = 0.999\ntemperature and ice cream: r = 0.987 | temperature and sunburn: r = 0.985', filename: 'correlation.py', at: 'end' },
    ),
  ],
  [`${M}/5`]: [
    tree(
      'ai-ml-dl',
      'What AI and machine learning are',
      'A tree of the relationship between AI, machine learning and deep learning. Artificial intelligence is the whole field. It contains rule-based systems, whose rules are written by hand, and machine learning, which learns the rules from examples. Machine learning contains classic methods such as k-nearest neighbours, decision trees and regression, and deep learning, which uses neural networks with many layers.',
      'Deep learning is a part of machine learning, and machine learning is a part of AI.',
      {
        label: 'Artificial intelligence',
        children: [
          { label: 'Rule-based systems', tone: 'info' },
          {
            label: 'Machine learning',
            tone: 'accent',
            children: [
              { label: 'k-NN, trees, regression', tone: 'good' },
              { label: 'Deep learning', tone: 'good', children: [{ label: 'many-layer neural nets' }] },
            ],
          },
        ],
      },
      { at: 'end' },
    ),
    table(
      'learning-kinds',
      'What AI and machine learning are',
      'A table of the three kinds of machine learning. Supervised learning uses examples with labels to predict a label or a number, for example pass or fail from hours and attendance. Unsupervised learning uses examples without labels to find groups or structure, for example grouping customers by buying habits. Reinforcement learning uses rewards from trial and error to learn the actions that earn the most reward, for example a program learning a board game.',
      'The kind depends on what feedback the learner gets: the right answer, none, or a reward.',
      ['Kind', 'Training data', 'Goal', 'Example'],
      [
        ['Supervised', 'examples with labels', 'predict a label or a number', 'pass or fail from hours'],
        ['Unsupervised', 'examples without labels', 'find groups or structure', 'grouping customers'],
        ['Reinforcement', 'rewards from trial and error', 'learn actions that earn rewards', 'a program learning a game'],
      ],
      { at: 'end' },
    ),
    flow(
      'ml-pipeline',
      'Learning from examples: features, labels and evaluation',
      'The supervised learning pipeline in six steps. Collect labelled examples. Clean and prepare the features. Split the data into a training set and a test set. Train the model on the training set. Evaluate it on the test set against a baseline. Use it with a human in the loop and keep checking it.',
      'The test set is touched once, at the end, and a person stays responsible for the decisions.',
      ['Collect|labelled examples|accent', 'Clean|and scale the features|info', 'Split|training and test sets|warn', 'Train|build the model|good', 'Evaluate|baseline, confusion matrix|accent2', 'Use|with a human in the loop|info'],
      { layout: 'row', perRow: 3, at: 'end' },
    ),
    table(
      'confusion-matrix',
      'Learning from examples: features, labels and evaluation',
      'A confusion matrix for the spam filter of Example 2. Of the 5 real spam mails, 4 were flagged (true positives) and 1 was missed (false negative). Of the 45 good mails, 3 were wrongly flagged (false positives) and 42 were left alone (true negatives). Precision is 4 over 7, 0.57, and recall is 4 over 5, 0.80.',
      'Precision = TP / (TP + FP) = 4 / 7. Recall = TP / (TP + FN) = 4 / 5. The numbers are those of the real filter in Example 2.',
      ['', 'predicted spam', 'predicted ok'],
      [
        ['actually spam', 'TP = 4', 'FN = 1'],
        ['actually ok', 'FP = 3', 'TN = 42'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 1, tone: 'good' }, { row: 1, col: 2, tone: 'good' }, { row: 0, col: 2, tone: 'warn', note: 'missed spam' }, { row: 1, col: 1, tone: 'warn', note: 'good mail flagged' }] },
    ),
    V(
      'chart',
      'knn-scatter',
      'Example 1',
      'A scatter plot of the 16 training students with hours studied on the horizontal axis and attendance on the vertical axis. The passing students lie at the upper right, from 8 hours and 80 per cent upwards. The failing students lie at the lower left, with few hours or low attendance. The new student, at 10 hours and 75 per cent, lies near the border between the two groups.',
      'The new student (10, 75) lies near the border, so the vote of the nearest neighbours is uncertain.',
      {
        kind: 'scatter',
        xLabel: 'Hours studied',
        yLabel: 'Attendance (%)',
        series: [
          { name: 'pass', points: [{ x: 12, y: 95 }, { x: 10, y: 90 }, { x: 14, y: 85 }, { x: 9, y: 88 }, { x: 11, y: 80 }, { x: 13, y: 92 }, { x: 8, y: 82 }, { x: 15, y: 96 }] },
          { name: 'fail', points: [{ x: 3, y: 60 }, { x: 5, y: 70 }, { x: 2, y: 85 }, { x: 6, y: 55 }, { x: 4, y: 75 }, { x: 7, y: 65 }, { x: 9, y: 58 }, { x: 1, y: 90 }] },
          { name: 'new student', points: [{ x: 10, y: 75 }] },
        ],
      },
      { at: 'end' },
    ),
    V(
      'chart',
      'k-train-test',
      'Example 2',
      'A line chart of the accuracy of the classifier for k equal to 1, 3, 5 and 7. Training accuracy is 100, 86, 86 and 71 per cent. Test accuracy is 50, 100, 100 and 75 per cent. At k equal to 1 the training accuracy is perfect but the test accuracy is only 50 per cent, which is overfitting.',
      'Training accuracy keeps falling as k grows. Test accuracy tells the truth: best at k = 3 and 5.',
      {
        kind: 'line',
        xLabel: 'k (number of neighbours)',
        yLabel: 'Accuracy (%)',
        categories: ['1', '3', '5', '7'],
        series: [
          { name: 'training set', values: [100, 86, 86, 71] },
          { name: 'test set', values: [50, 100, 100, 75] },
        ],
      },
      { at: 'end' },
    ),
    grid(
      'neuron-diagram',
      'Neurons and neural networks',
      'A diagram of one artificial neuron. The inputs x1 and x2 are multiplied by the weights w1 and w2 and flow into a node that adds them together with a bias. The sum goes through an activation function, a step in the perceptron, and the result is the output, 0 or 1.',
      'A neuron is a weighted sum, a bias and an activation. Learning changes w1, w2 and the bias.',
      [
        ['x1', 'rect', 'input x1', 0, 0, 'info'],
        ['x2', 'rect', 'input x2', 0, 1.5, 'info'],
        ['sum', 'rect', 'weighted sum + bias', 2, 0.75, 'accent', 'w1 x1 + w2 x2 + b'],
        ['act', 'rect', 'activation', 4, 0.75, 'warn', 'step: above 0 gives 1'],
        ['out', 'rect', 'output', 6, 0.75, 'good', '0 or 1'],
      ],
      [
        ['x1', 'sum', 'w1'],
        ['x2', 'sum', 'w2'],
        ['sum', 'act'],
        ['act', 'out'],
      ],
      { dx: 105, dy: 70, w: 120, h: 56, at: 'end' },
    ),
    table(
      'gates-table',
      'Example 3',
      'A truth table of AND, OR and XOR for the four input pairs. AND is 1 only for 1 and 1. OR is 1 unless both inputs are 0. XOR is 1 when the inputs differ. One neuron can learn AND and OR, but not XOR, because no straight line separates the XOR cases.',
      'Plot the four inputs on a plane: for AND and OR one straight line separates the 1s from the 0s. For XOR no line does.',
      ['x1', 'x2', 'AND', 'OR', 'XOR'],
      [
        ['0', '0', '0', '0', '0'],
        ['0', '1', '0', '1', '1'],
        ['1', '0', '0', '1', '1'],
        ['1', '1', '1', '1', '0'],
        ['one neuron can learn it?', '-', 'yes', 'yes', 'no'],
      ],
      { at: 'end', highlights: [{ row: 4, col: 2, tone: 'good' }, { row: 4, col: 3, tone: 'good' }, { row: 4, col: 4, tone: 'warn' }] },
    ),
    cards(
      'ml-limits',
      'Limits, bias and responsible use',
      'Four cards about the limits of machine learning. Biased data: the model copies what the data contain, including unfairness. Spurious patterns: a model may learn the background instead of the object. No understanding: it is confident but does not know why. Privacy and oversight: training data hold personal information and people must check important decisions.',
      'Four reasons to keep a person responsible for what a model decides.',
      [
        { title: 'Biased data', subtitle: 'garbage in, bias out', tone: 'warn', bullets: ['past decisions may be unfair', 'groups may be missing'] },
        { title: 'Spurious patterns', subtitle: 'right for the wrong reason', tone: 'accent', bullets: ['snow in the background', 'test on real conditions'] },
        { title: 'No understanding', subtitle: 'confident, not wise', tone: 'info', bullets: ['fails on unusual inputs', 'hard to explain'] },
        { title: 'Privacy and oversight', subtitle: 'people stay responsible', tone: 'good', bullets: ['personal data in training sets', 'a human checks important decisions'] },
      ],
      { at: 'end' },
    ),
    lab(
      'knn-lab',
      'Example 1',
      'python',
      'A Python editor with the k-nearest-neighbours functions, the five nearest neighbours of a new student, the predictions for k of 1, 3 and 5 and the scaled and unscaled distances, with its expected output.',
      'Classify the student (4, 80) with k = 1, 3 and 5 and see whether the answer changes.',
      `from collections import Counter
from math import dist

TRAIN = [  # (hours studied, attendance %), result
    ((12, 95), "pass"), ((10, 90), "pass"), ((14, 85), "pass"), ((9, 88), "pass"),
    ((11, 80), "pass"), ((13, 92), "pass"), ((8, 82), "pass"), ((15, 96), "pass"),
    ((3, 60), "fail"), ((5, 70), "fail"), ((2, 85), "fail"), ((6, 55), "fail"),
    ((4, 75), "fail"), ((7, 65), "fail"), ((9, 58), "fail"), ((1, 90), "fail"),
]


def nearest(train, point, k):
    """The k training examples closest to the point, as (distance, label) pairs."""
    return sorted((dist(features, point), label) for features, label in train)[:k]


def predict(train, point, k):
    votes = Counter(label for _, label in nearest(train, point, k))
    return votes.most_common(1)[0][0]


student = (10, 75)
print("new student:", student)
for distance, label in nearest(TRAIN, student, 5):
    print(f"  distance {distance:5.2f}  {label}")
for k in (1, 3, 5):
    print(f"k = {k}: {predict(TRAIN, student, k)}")

a, b, c = (10, 75), (2, 75), (10, 100)
print("unscaled distances:", "a-b", dist(a, b), " a-c", dist(a, c))
scale = lambda p: (p[0] / 15, p[1] / 100)
print("scaled distances:  ", "a-b", round(dist(scale(a), scale(b)), 2), " a-c", round(dist(scale(a), scale(c)), 2))`,
      { expected: 'new student: (10, 75)\n  distance  5.10  pass\n  distance  6.00  fail\n  distance  7.07  fail\n  distance  7.28  pass\n  distance 10.44  fail\nk = 1: pass\nk = 3: fail\nk = 5: fail\nunscaled distances: a-b 8.0  a-c 25.0\nscaled distances:   a-b 0.53  a-c 0.25', filename: 'knn.py', at: 'end' },
    ),
    lab(
      'overfitting-lab',
      'Example 2',
      'python',
      'A Python editor with a one-feature classifier that shows training and test accuracy for different k, and a confusion matrix function that compares an always-ok filter with a real spam filter, with its expected output.',
      'Change the noisy label of the 3-hour student to fail and see what happens to k = 1.',
      `from collections import Counter

# One feature: hours studied. The true rule is "pass from about 7 hours", but two training labels are noise.
TRAIN = [(1, "fail"), (2, "fail"), (3, "pass"), (4, "fail"), (5, "fail"), (6, "fail"), (7, "pass"),
         (8, "pass"), (9, "pass"), (10, "fail"), (11, "pass"), (12, "pass"), (13, "pass"), (14, "pass")]
TEST = [(2.6, "fail"), (3.3, "fail"), (4.5, "fail"), (6.2, "fail"), (7.4, "pass"), (9.6, "pass"), (10.4, "pass"), (12.5, "pass")]


def predict(train, hours, k):
    nearest = sorted(train, key=lambda row: abs(row[0] - hours))[:k]
    return Counter(label for _, label in nearest).most_common(1)[0][0]


def accuracy(train, rows, k):
    return sum(predict(train, hours, k) == label for hours, label in rows) / len(rows)


print("k   train  test")
for k in (1, 3, 5, 7):
    print(f"{k}   {accuracy(TRAIN, TRAIN, k):>4.0%}  {accuracy(TRAIN, TEST, k):>4.0%}")


def metrics(actual, predicted, positive):
    tp = sum(a == positive and p == positive for a, p in zip(actual, predicted))
    fp = sum(a != positive and p == positive for a, p in zip(actual, predicted))
    fn = sum(a == positive and p != positive for a, p in zip(actual, predicted))
    tn = len(actual) - tp - fp - fn
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    return tp, fp, fn, tn, (tp + tn) / len(actual), precision, recall


actual = ["spam"] * 5 + ["ok"] * 45
lazy = ["ok"] * 50
filtered = ["spam"] * 4 + ["ok"] + ["spam"] * 3 + ["ok"] * 42
print()
for name, predicted in (("always ok", lazy), ("a real filter", filtered)):
    tp, fp, fn, tn, acc, precision, recall = metrics(actual, predicted, "spam")
    print(f"{name:<14} TP {tp} FP {fp} FN {fn} TN {tn} | accuracy {acc:.0%}, precision {precision:.2f}, recall {recall:.2f}")`,
      { expected: 'k   train  test\n1   100%   50%\n3    86%  100%\n5    86%  100%\n7    71%   75%\n\nalways ok      TP 0 FP 0 FN 5 TN 45 | accuracy 90%, precision 0.00, recall 0.00\na real filter  TP 4 FP 3 FN 1 TN 42 | accuracy 92%, precision 0.57, recall 0.80', filename: 'overfitting.py', at: 'end' },
    ),
    lab(
      'perceptron-lab',
      'Example 3',
      'python',
      'A Python editor with a single perceptron trained on the AND, OR and XOR gates, with its expected output.',
      'Train a NAND gate with the targets [1, 1, 1, 0] and say whether it converges.',
      `def train_perceptron(examples, epochs=20, rate=1):
    """A single neuron with a step activation, trained with the perceptron rule."""
    w1 = w2 = bias = 0
    for epoch in range(1, epochs + 1):
        mistakes = 0
        for (x1, x2), target in examples:
            output = 1 if w1 * x1 + w2 * x2 + bias > 0 else 0
            error = target - output
            if error:
                w1 += rate * error * x1
                w2 += rate * error * x2
                bias += rate * error
                mistakes += 1
        if mistakes == 0:
            return (w1, w2, bias), epoch
    return (w1, w2, bias), None


INPUTS = [(0, 0), (0, 1), (1, 0), (1, 1)]
GATES = {"AND": [0, 0, 0, 1], "OR": [0, 1, 1, 1], "XOR": [0, 1, 1, 0]}
for name, targets in GATES.items():
    (w1, w2, bias), epoch = train_perceptron(list(zip(INPUTS, targets)))
    outputs = [1 if w1 * x1 + w2 * x2 + bias > 0 else 0 for x1, x2 in INPUTS]
    status = f"learned in {epoch} epochs" if epoch else "never learned it in 20 epochs"
    print(f"{name}: weights {w1}, {w2}, bias {bias} -> outputs {outputs} ({status})")`,
      { expected: 'AND: weights 2, 1, bias -2 -> outputs [0, 0, 0, 1] (learned in 6 epochs)\nOR: weights 1, 1, bias 0 -> outputs [0, 1, 1, 1] (learned in 4 epochs)\nXOR: weights -1, 0, bias 1 -> outputs [1, 1, 0, 0] (never learned it in 20 epochs)', filename: 'perceptron.py', at: 'end' },
    ),
  ],
  [`${M}/6`]: [
    flow(
      'nlp-pipeline',
      'Natural language processing: from text to numbers',
      'The basic NLP pipeline in six steps. Start with the raw text. Tokenise it into words. Normalise it by lower-casing and removing punctuation. Remove the stop words. Count the remaining words to get a bag of words. Analyse the counts: keywords, similarity and sentiment.',
      'Every NLP system starts by turning text into numbers.',
      ['Raw text|a sentence or a book|accent', 'Tokenise|split into words|info', 'Normalise|lower-case, no punctuation|info', 'Stop words|drop the, and, is|warn', 'Count|the bag of words|good', 'Analyse|keywords, similarity, sentiment|accent2'],
      { layout: 'row', perRow: 3, at: 'end' },
    ),
    table(
      'tfidf-table',
      'Example 1',
      'The top TF-IDF keywords of the four documents of Example 1. Football: team 4.16, cheered 1.39 and fans 1.39. Science: club 2.77, robot 2.77 and built 1.39. Canteen: menu 2.77, canteen 1.39 and fish 1.39. Exams: exams 2.77, monday 1.39 and notes 1.39.',
      'A word scores high when it is frequent in one document and rare in the others.',
      ['Document', 'Top keywords (TF-IDF)', 'Why they score high'],
      [
        ['football', 'team 4.16, cheered 1.39, fans 1.39', '"team": 3 times, in 1 of 4 documents'],
        ['science', 'club 2.77, robot 2.77, built 1.39', 'twice each, only in this document'],
        ['canteen', 'menu 2.77, canteen 1.39, fish 1.39', '"menu": twice, only here'],
        ['exams', 'exams 2.77, monday 1.39, notes 1.39', '"exams": twice, only here'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 1, tone: 'good' }] },
    ),
    table(
      'pixel-values',
      'Computer vision: images as numbers',
      'A 5 by 5 patch of a grayscale image shown as numbers: the top left of a bright square. The background pixels have the value 30 and the pixels of the square have the value 200. The picture is only numbers: 0 is black and 255 is white.',
      'What the computer sees: numbers. 30 is dark, 200 is bright. The step from 30 to 200 is the edge of the square.',
      ['', 'col 0', 'col 1', 'col 2', 'col 3', 'col 4'],
      [
        ['row 0', '30', '30', '30', '30', '30'],
        ['row 1', '30', '30', '30', '30', '30'],
        ['row 2', '30', '30', '200', '200', '200'],
        ['row 3', '30', '30', '200', '200', '200'],
        ['row 4', '30', '30', '200', '200', '200'],
      ],
      { at: 'end', highlights: [2, 3, 4].flatMap((row) => [2, 3, 4].map((col) => ({ row, col: col + 1, tone: 'accent' }))) },
    ),
    table(
      'kernels',
      'Computer vision: images as numbers',
      'A table of three 3 by 3 kernels. Blur: nine ones divided by nine, which averages the neighbourhood and softens the image. Edge detection: 0, -1, 0 in the top row, -1, 4, -1 in the middle row and 0, -1, 0 in the bottom row, which gives 0 where the picture is flat and a large number at an edge. Sharpen: the same as edge detection but with 5 in the centre, which makes edges crisper.',
      'The same sliding calculation, three different kernels, three different effects.',
      ['Filter', 'Kernel (rows)', 'Effect'],
      [
        ['Blur', '[1 1 1] [1 1 1] [1 1 1], divided by 9', 'averages the neighbours: smooth, less noise'],
        ['Edge detection', '[0 -1 0] [-1 4 -1] [0 -1 0]', '0 where flat, large where brightness changes'],
        ['Sharpen', '[0 -1 0] [-1 5 -1] [0 -1 0]', 'the original plus its edges: crisper picture'],
      ],
      { at: 'end' },
    ),
    walkthrough(
      'convolution-steps',
      'Example 2',
      'A four-step walk-through of the edge kernel at the top border of the bright square. Step 1: place the 3 by 3 kernel over a patch with 30, 30, 30 in the top row and 200 everywhere else. Step 2: multiply the centre 200 by 4, which is 800, and the four neighbours 30, 200, 200 and 200 by minus 1, which is minus 630. Step 3: the sum is 170, a strong edge. Step 4: in the flat middle of the square the same calculation gives 800 minus 800, which is 0.',
      'Multiply, add, slide: the whole of image filtering is this one calculation repeated for every position.',
      [
        { title: '1. Place the kernel', text: 'Put the 3 x 3 kernel over a 3 x 3 patch of the image. At the top border of the square the patch is 30, 30, 30 in its top row and 200 in the other two rows.' },
        { title: '2. Multiply', text: 'The centre pixel 200 is multiplied by 4, which is 800. The four neighbours that touch it, 30 above and 200 left, right and below, are multiplied by -1, which gives -630. The corners have the kernel value 0.' },
        { title: '3. Add', text: '800 - 630 = 170. A large number means that the brightness changes here: this pixel is on an edge.' },
        { title: '4. Slide on', text: 'In the flat middle of the square all neighbours are 200, so the sum is 4 x 200 - 4 x 200 = 0. The kernel moves one pixel at a time, so the result is two pixels smaller in each direction.' },
      ],
      { at: 'end' },
    ),
    flow(
      'llm-loop',
      'Generative AI and large language models',
      'The loop of text generation in five steps. The prompt is split into tokens. The model computes a probability for every possible next token. One token is picked, with the temperature controlling how adventurous the choice is. The token is appended to the text. The loop repeats with the longer text until the answer is finished.',
      'A language model writes one token at a time, and each token is a likely, not a verified, continuation.',
      ['Prompt|your text|accent', 'Tokens|pieces of words|info', 'Model|a probability for each next token|warn', 'Pick|one token, set by the temperature|good', 'Append|add it to the text and repeat|accent2'],
      { layout: 'cycle', at: 'end' },
    ),
    cards(
      'genai-use',
      'Generative AI and large language models',
      'Four cards about generative AI. Good for: drafts, explanations, translation and help with code. Careful with facts and references: they can be invented. Careful with maths and logic details: the answer may look right and be wrong. Never share personal data or passwords with a chatbot.',
      'A powerful assistant with no sense of truth: use it where a mistake is cheap and a check is easy.',
      [
        { title: 'Good for', subtitle: 'drafts and ideas', tone: 'good', bullets: ['explaining a concept', 'translation, summaries', 'help with code, then test it'] },
        { title: 'Careful: facts', subtitle: 'hallucination', tone: 'warn', bullets: ['invented details', 'references that do not exist'] },
        { title: 'Careful: reasoning', subtitle: 'looks right, is wrong', tone: 'accent', bullets: ['arithmetic and logic slips', 'check every step'] },
        { title: 'Never share', subtitle: 'privacy', tone: 'info', bullets: ['passwords, personal data', 'other people\'s messages'] },
      ],
      { at: 'end' },
    ),
    table(
      'bigram-table',
      'Example 3',
      'The bigram counts of Example 3 for three words. After the word the came robot 2 times and football, match, science, team and club once each, 7 in total. After won came a 2 times and the 1 time, 3 in total. After robot came can, a full stop and won once each, 3 in total.',
      'The whole model is this table: which word followed which, and how often.',
      ['Word', 'What followed it in the corpus', 'Total'],
      [
        ['the', 'robot 2, football 1, match 1, science 1, team 1, club 1', '7'],
        ['won', 'a 2, the 1', '3'],
        ['robot', 'can 1, full stop 1, won 1', '3'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 1, tone: 'info' }] },
    ),
    checklist(
      'responsible-checklist',
      'Using generative AI responsibly',
      'A checklist of six rules for using generative AI responsibly: verify the facts, disclose the help, protect personal data, keep your own thinking, watch for bias and harm, and stay accountable.',
      'Six habits. If you cannot tick all six, do not hand it in.',
      [
        'Verify: check every fact that matters in a reliable source, and find every reference yourself',
        'Disclose: say when AI helped, and follow the rules of your school and your teacher',
        'Protect: never paste passwords, personal data or other people\'s private messages',
        'Think: use it to learn (ask for an explanation, then try the problem yourself)',
        'Watch: look for bias, harmful content and fakes (deepfakes) before you share anything',
        'Own it: you, not the model, are responsible for what you submit or publish',
      ],
      { at: 'end' },
    ),
    lab(
      'text-lab',
      'Example 1',
      'python',
      'A Python editor with the text analyser: tokens, TF-IDF keywords, cosine similarity of four documents and a lexicon sentiment function, with its expected output.',
      'Add the review "The food was not bad." and predict its score before you run it.',
      `import math
import re
from collections import Counter

DOCS = {
    "football": "The school football team won the match. The team played well and the fans cheered the team.",
    "science": "The science club built a robot. The robot can follow a line and the club won a prize.",
    "canteen": "The canteen has a new menu. The menu has rice, fish and fruit, and the food is fresh.",
    "exams": "The exams start on Monday. Students should revise the science notes and sleep well before the exams.",
}
STOP = {"the", "a", "an", "and", "is", "are", "has", "can", "on", "in", "of", "to", "should", "before", "new"}


def tokens(text):
    """Lower-case words made of letters, without the stop words."""
    return [word for word in re.findall(r"[a-z]+", text.lower()) if word not in STOP]


counts = {name: Counter(tokens(text)) for name, text in DOCS.items()}
n = len(DOCS)
document_frequency = Counter(word for c in counts.values() for word in c)
for name, c in counts.items():
    scores = {word: c[word] * math.log(n / document_frequency[word]) for word in c}
    best = sorted(scores.items(), key=lambda item: (-item[1], item[0]))[:3]
    print(f"{name:<9}", ", ".join(f"{word} {score:.2f}" for word, score in best))


def cosine(a, b):
    dot = sum(a[w] * b[w] for w in a if w in b)
    return dot / (math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values())))


pairs = sorted(((cosine(counts[a], counts[b]), a, b) for a in counts for b in counts if a < b), reverse=True)
for similarity, a, b in pairs:
    print(f"similarity {a}/{b}: {similarity:.2f}")
print("a document with itself:", round(cosine(counts["exams"], counts["exams"]), 2))

POSITIVE = {"good", "great", "love", "fresh", "excellent", "happy"}
NEGATIVE = {"bad", "boring", "terrible", "late", "hate", "sad"}


def sentiment(text):
    score, flip = 0, False
    for word in re.findall(r"[a-z]+", text.lower()):
        if word in {"not", "never", "no"}:
            flip = True
            continue
        value = (word in POSITIVE) - (word in NEGATIVE)
        if value:
            score += -value if flip else value
        flip = False
    return score


for review in ["The food was good.", "The food was not good.", "I love waiting two hours for lunch."]:
    print(f"{sentiment(review):+d}  {review}")`,
      { expected: 'football  team 4.16, cheered 1.39, fans 1.39\nscience   club 2.77, robot 2.77, built 1.39\ncanteen   menu 2.77, canteen 1.39, fish 1.39\nexams     exams 2.77, monday 1.39, notes 1.39\nsimilarity exams/science: 0.08\nsimilarity exams/football: 0.07\nsimilarity football/science: 0.06\nsimilarity canteen/science: 0.00\nsimilarity canteen/football: 0.00\nsimilarity canteen/exams: 0.00\na document with itself: 1.0\n+1  The food was good.\n-1  The food was not good.\n+1  I love waiting two hours for lunch.', filename: 'text_analyser.py', at: 'end' },
    ),
    lab(
      'image-lab',
      'Example 2',
      'python',
      'A Python editor with an 8 by 8 grayscale image, a threshold, a 3 by 3 convolution with a blur kernel and an edge kernel, and a character display, with its expected output.',
      'Try the sharpening kernel [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] and describe the result.',
      `RAMP = " .:-=+*#%@"

IMAGE = [[30] * 8 for _ in range(8)]
for row in range(2, 6):
    for col in range(2, 6):
        IMAGE[row][col] = 200
IMAGE[0][7] = 90


def show(image):
    for row in image:
        print("".join(RAMP[min(9, int(max(0, v) * 10 // 256))] * 2 for v in row))


def convolve(image, kernel):
    """Slide a 3 x 3 kernel over the image; the result is two pixels smaller in each direction."""
    size = len(image)
    return [[sum(kernel[i][j] * image[r + i][c + j] for i in range(3) for j in range(3)) for c in range(size - 2)] for r in range(size - 2)]


BLUR = [[1 / 9] * 3 for _ in range(3)]
EDGE = [[0, -1, 0], [-1, 4, -1], [0, -1, 0]]

print("original (noise pixel at the top right)")
show(IMAGE)
print("\\nthreshold at 128")
show([[255 if v >= 128 else 0 for v in row] for row in IMAGE])
print("\\nblur")
blurred = convolve(IMAGE, BLUR)
show(blurred)
print("\\nedges")
show([[abs(v) for v in row] for row in convolve(IMAGE, EDGE)])
print("\\nsample numbers, row 2 of the edge map:", [round(v) for v in convolve(IMAGE, EDGE)[2]])
print("brightest blurred pixel:", round(max(max(row) for row in blurred)))`,
      { expected: 'original (noise pixel at the top right)\n..............--\n................\n....########....\n....########....\n....########....\n....########....\n................\n................\n\nthreshold at 128\n\n\n    @@@@@@@@\n    @@@@@@@@\n    @@@@@@@@\n    @@@@@@@@\n\n\n\nblur\n..::----::::\n::==++++==::\n--++####++--\n--++####++--\n::==++++==::\n..::----::..\n\nedges\n  ********\n**@@****@@**\n****    ****\n****    ****\n**@@****@@**\n  ********\n\nsample numbers, row 2 of the edge map: [-170, 170, 0, 0, 170, -170]\nbrightest blurred pixel: 200', filename: 'image_filters.py', at: 'end' },
    ),
    lab(
      'bigram-lab',
      'Example 3',
      'python',
      'A Python editor with a bigram language model that counts which word follows which and generates sentences with a repeatable pseudo-random generator, with its expected output.',
      'Add three sentences to the corpus and see how the generated sentences change.',
      `from collections import Counter, defaultdict

CORPUS = ("the football team won the match . the science club won a prize . the robot can follow a line . "
          "the team played well . the club built a robot . the robot won a prize .")
words = CORPUS.split()
following = defaultdict(Counter)
for first, second in zip(words, words[1:]):
    following[first][second] += 1

for word in ("the", "won", "robot"):
    total = sum(following[word].values())
    print(f"after '{word}':", ", ".join(f"{w} {c}/{total}" for w, c in following[word].most_common()))


def generate(start, length, seed):
    """Pick each next word at random, weighted by how often it followed the word in the corpus."""
    state, sentence = seed, [start]
    for _ in range(length):
        options = sorted(following[sentence[-1]].items())
        state = (state * 1103515245 + 12345) % 2 ** 31
        pick = state % sum(count for _, count in options)
        for word, count in options:
            if pick < count:
                break
            pick -= count
        sentence.append(word)
        if word == ".":
            break
    return " ".join(sentence)


for seed in (1, 2, 3, 4, 5, 6):
    print(f"seed {seed}: {generate('the', 9, seed)}")`,
      { expected: 'after \'the\': robot 2/7, football 1/7, match 1/7, science 1/7, team 1/7, club 1/7\nafter \'won\': a 2/3, the 1/3\nafter \'robot\': can 1/3, . 1/3, won 1/3\nseed 1: the robot .\nseed 2: the match .\nseed 3: the match .\nseed 4: the club built a line .\nseed 5: the club won a prize .\nseed 6: the science club won a robot .', filename: 'bigram_model.py', at: 'end' },
    ),
  ],
  [`${M}/7`]: [
    table(
      'cloud-models',
      'Cloud computing',
      'A table of four cloud service models. IaaS: you manage the operating system, the runtime, your code and your data, and the provider manages the hardware, the network and the virtualisation; an example is a rented virtual machine. PaaS: you manage your code and data, and the provider manages the servers, the operating system and the scaling. SaaS: you manage only your own content and settings, and the provider manages the whole application, for example web mail. Serverless: you write small functions, and the provider runs and scales them and bills each run.',
      'The higher the model, the less you manage and the less you control.',
      ['Model', 'You manage', 'Provider manages', 'Example'],
      [
        ['IaaS', 'OS, runtime, code, data', 'hardware, network', 'a rented virtual machine'],
        ['PaaS', 'your code and data', 'servers, OS, scaling', 'a platform for web apps'],
        ['SaaS', 'content and settings', 'the whole application', 'web mail, online documents'],
        ['Serverless', 'small functions', 'servers, scaling', 'runs when a file is uploaded'],
      ],
      { at: 'end' },
    ),
    grid(
      'iot-architecture',
      'Robotics and the Internet of Things',
      'The architecture of an IoT system. Three sensors send readings by radio to a gateway, which validates and smooths them. The gateway sends messages over the internet to the cloud, which stores them and raises alerts. A phone app shows a dashboard that the cloud provides through an API.',
      'Devices, gateway, cloud, app: data flows to the right, and part of the work is done at the edge, in the gateway.',
      [
        ['s1', 'rect', 'Sensor 1', 0, 0, 'info'],
        ['s2', 'rect', 'Sensor 2', 0, 1, 'info'],
        ['s3', 'rect', 'Sensor 3', 0, 2, 'info'],
        ['gw', 'rect', 'Gateway', 2, 1, 'accent', 'validates, smooths'],
        ['cloud', 'cylinder', 'Cloud', 4, 1, 'good', 'stores, alerts'],
        ['app', 'rect', 'Phone app', 6, 1, 'warn', 'dashboard'],
      ],
      [
        ['s1', 'gw', 'radio'],
        ['s2', 'gw'],
        ['s3', 'gw'],
        ['gw', 'cloud', 'MQTT / HTTPS'],
        ['cloud', 'app', 'API'],
      ],
      { dx: 110, dy: 62, w: 118, h: 50, at: 'end' },
    ),
    flow(
      'sense-think-act',
      'Robotics and the Internet of Things',
      'The sense, think, act loop of a robot. Sensors measure the world, the controller decides what to do, and the actuators move. The movement changes the world, and the sensors measure the new situation, so the loop repeats many times a second.',
      'Feedback: the result of every action is measured again.',
      ['Sense|distance, camera, motion|accent', 'Think|controller and algorithm|info', 'Act|motors and valves|good', 'The world changes|and is measured again|warn'],
      { layout: 'cycle', at: 'end' },
    ),
    sequence(
      'mqtt-sequence',
      'Robotics and the Internet of Things',
      'A sequence diagram of MQTT. The dashboard and the alert service both subscribe to the topic farm/temperature at the broker. The sensor publishes the value 33.4 on that topic. The broker delivers the value to both subscribers. The alert service sees that the value is above 32 and sends an alert.',
      'Publish and subscribe: the sensor never knows who receives its value.',
      [['sensor', 'Sensor'], ['broker', 'MQTT broker'], ['alert', 'Alert service'], ['dash', 'Dashboard']],
      [
        { from: 'dash', to: 'broker', label: 'subscribe farm/temperature' },
        { from: 'alert', to: 'broker', label: 'subscribe farm/temperature' },
        { from: 'sensor', to: 'broker', label: 'publish farm/temperature 33.4' },
        { from: 'broker', to: 'dash', label: 'deliver 33.4', dashed: true },
        { from: 'broker', to: 'alert', label: 'deliver 33.4', dashed: true },
        { from: 'alert', to: 'alert', label: 'above 32: raise an alert' },
      ],
      { at: 'end' },
    ),
    cards(
      'distributed-problems',
      'Distributed systems',
      'Six cards for the problems of distributed systems: a message can be lost, delayed, duplicated or reordered, a node can fail while others run, and there is no shared clock.',
      'The network is not a wire inside one computer. Design for all six problems.',
      [
        { title: 'Lost', subtitle: 'message never arrives', tone: 'warn', bullets: ['retry after a timeout'] },
        { title: 'Delayed', subtitle: 'arrives much later', tone: 'info', bullets: ['slow looks like dead'] },
        { title: 'Duplicated', subtitle: 'arrives twice', tone: 'warn', bullets: ['make the receiver idempotent'] },
        { title: 'Reordered', subtitle: 'arrives in another order', tone: 'accent', bullets: ['use sequence numbers'] },
        { title: 'Node failure', subtitle: 'partial failure', tone: 'accent', bullets: ['replicate, fail over'] },
        { title: 'No shared clock', subtitle: 'clocks differ', tone: 'info', bullets: ['do not order events by device time'] },
      ],
      { at: 'end' },
    ),
    table(
      'delivery-guarantees',
      'Distributed systems',
      'A table of three delivery guarantees. At-most-once: the sender sends once and never retries, so a message may be lost. At-least-once: the sender retries until it receives an acknowledgement, so a message may be delivered twice. Effectively-once: at-least-once delivery plus an idempotent receiver that ignores sequence numbers it has already applied, so every message has its effect exactly once.',
      'Retries cure loss and create duplicates; sequence numbers cure duplicates.',
      ['Guarantee', 'What the sender does', 'The risk'],
      [
        ['At-most-once', 'sends once, no retry', 'a message may be lost'],
        ['At-least-once', 'retries until acknowledged', 'a message may arrive twice'],
        ['Effectively-once', 'retries; the receiver checks sequence numbers', 'extra bookkeeping at the receiver'],
      ],
      { at: 'end', highlights: [{ row: 2, col: 0, tone: 'good' }] },
    ),
    cards(
      'landscape-cards',
      'The technology landscape: connecting back to the fundamentals',
      'Six cards, one for each technology, listing the fundamentals that it uses. Cloud computing: operating systems, networks, databases, security, algorithms. Mobile development: programming, networks, databases, security, computer architecture. Robotics: computer architecture, algorithms, programming, discrete mathematics. IoT: computer architecture, networks, security, programming. Distributed systems: networks, operating systems, algorithms, discrete mathematics, databases. AI: algorithms, discrete mathematics, programming, databases.',
      'The same fundamentals appear in every field, in different mixes. Networks, algorithms, programming and databases appear in four of the six.',
      [
        { title: 'Cloud computing', tone: 'info', bullets: ['operating systems', 'networks, databases', 'security, algorithms'] },
        { title: 'Mobile development', tone: 'accent', bullets: ['programming', 'networks, databases, security', 'computer architecture'] },
        { title: 'Robotics', tone: 'good', bullets: ['computer architecture', 'algorithms, programming', 'discrete mathematics'] },
        { title: 'Internet of Things', tone: 'warn', bullets: ['computer architecture', 'networks, security', 'programming'] },
        { title: 'Distributed systems', tone: 'accent', bullets: ['networks, operating systems', 'algorithms, databases', 'discrete mathematics'] },
        { title: 'Artificial intelligence', tone: 'info', bullets: ['algorithms, programming', 'discrete mathematics', 'databases'] },
      ],
      { at: 'end' },
    ),
    sequence(
      'ack-retry',
      'Example 2',
      'A sequence diagram of a lost acknowledgement. The sensor sends reading 7. The cloud applies it and sends an acknowledgement, which is lost. The sensor times out and sends reading 7 again. The cloud sees that it has already applied number 7, ignores the copy and acknowledges again, and this time the acknowledgement arrives.',
      'The retry was right, and the duplicate is harmless because the cloud remembers sequence number 7.',
      [['sensor', 'Sensor'], ['cloud', 'Cloud']],
      [
        { from: 'sensor', to: 'cloud', label: 'send #7 (value 7)' },
        { from: 'cloud', to: 'cloud', label: 'apply #7, total grows by 7' },
        { from: 'cloud', to: 'sensor', label: 'ack #7 (lost on the way)', dashed: true },
        { from: 'sensor', to: 'sensor', label: 'timeout: no ack' },
        { from: 'sensor', to: 'cloud', label: 'send #7 again' },
        { from: 'cloud', to: 'cloud', label: '#7 already applied: ignore' },
        { from: 'cloud', to: 'sensor', label: 'ack #7', dashed: true },
      ],
      { at: 'end' },
    ),
    V(
      'chart',
      'feedback-traces',
      'Example 3',
      'A line chart of the distance of the robot to the wall over 14 steps for three controller settings, and the target of 20. With gain 0.3 and no delay the distance falls smoothly to about 21. With gain 0.3 and a sensor delay of two steps it overshoots to 7 and returns to 23. With gain 0.9 and the same delay it swings from minus 10 up to 49.',
      'Same robot, same wall: only the gain and the sensor delay differ. Late feedback plus a strong reaction means oscillation.',
      {
        kind: 'line',
        xLabel: 'Step',
        yLabel: 'Distance to the wall (cm)',
        categories: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'],
        series: [
          { name: 'target (20)', values: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20] },
          { name: 'gain 0.3, no delay', values: [85, 70, 55, 44, 37, 32, 28, 26, 24, 23, 22, 21, 21, 21] },
          { name: 'gain 0.3, delay 2', values: [85, 70, 55, 40, 25, 14, 8, 7, 9, 12, 16, 19, 22, 23] },
          { name: 'gain 0.9, delay 2', values: [85, 70, 55, 40, 25, 10, -5, -10, 0, 14, 30, 44, 49, 41] },
        ],
      },
      { at: 'end' },
    ),
    lab(
      'gateway-lab',
      'Example 1',
      'python',
      'A Python editor with a gateway that validates 24 hourly temperature readings, smooths them with a moving average and finds the alert hours on the raw and the smoothed data, with its expected output.',
      'Change the smoothing window to 5 and see how the peak and the alert hour move.',
      `READINGS = [24.1, 23.8, 23.5, None, 22.9, 22.7, 23.4, 25.0, 27.2, 29.5, 31.8, 33.4,
            34.9, -999, 35.6, 34.2, 32.0, 30.1, 28.4, 85.0, 26.3, 25.1, 24.6, 24.0]   # one per hour


def validate(readings, low=-10, high=50):
    """Keep (hour, value) pairs that make sense; explain every reading that is rejected."""
    good, rejected = [], []
    for hour, value in enumerate(readings):
        if value is None:
            rejected.append(f"hour {hour}: no reading")
        elif not low <= value <= high:
            rejected.append(f"hour {hour}: {value} is outside {low} to {high}")
        else:
            good.append((hour, value))
    return good, rejected


def smooth(pairs, window=3):
    """Moving average of the last \`window\` valid readings."""
    out = []
    for i, (hour, _) in enumerate(pairs):
        recent = [v for _, v in pairs[max(0, i - window + 1):i + 1]]
        out.append((hour, sum(recent) / len(recent)))
    return out


def alerts(pairs, limit, run=2):
    """Hours at which the value has been above the limit for \`run\` valid readings in a row."""
    found, streak = [], 0
    for hour, value in pairs:
        streak = streak + 1 if value > limit else 0
        if streak == run:
            found.append(hour)
    return found


good, rejected = validate(READINGS)
print(len(READINGS), "readings,", len(good), "valid")
print("\\n".join("rejected - " + r for r in rejected))
smoothed = smooth(good)
print("raw peak:", max(v for _, v in good), "| smoothed peak:", round(max(v for _, v in smoothed), 1))
print("alert hours (raw > 32 twice in a row):     ", alerts(good, 32))
print("alert hours (smoothed > 32 twice in a row):", alerts(smoothed, 32))
for hour, value in smoothed[9:17]:
    print(f"  hour {hour:>2}: smoothed {value:.1f}")`,
      { expected: '24 readings, 21 valid\nrejected - hour 3: no reading\nrejected - hour 13: -999 is outside -10 to 50\nrejected - hour 19: 85.0 is outside -10 to 50\nraw peak: 35.6 | smoothed peak: 34.9\nalert hours (raw > 32 twice in a row):      [12]\nalert hours (smoothed > 32 twice in a row): [14]\n  hour 10: smoothed 29.5\n  hour 11: smoothed 31.6\n  hour 12: smoothed 33.4\n  hour 14: smoothed 34.6\n  hour 15: smoothed 34.9\n  hour 16: smoothed 33.9\n  hour 17: smoothed 32.1\n  hour 18: smoothed 30.2', filename: 'gateway.py', at: 'end' },
    ),
    lab(
      'delivery-lab',
      'Example 2',
      'python',
      'A Python editor with a simulated unreliable network that loses messages and acknowledgements, and three delivery strategies: send once, retry and count everything, and retry with sequence numbers, with its expected output.',
      'Change the loss to 10 and then to 60 and see which strategy stays correct.',
      `def chance(state, percent):
    """A repeatable coin: returns (event happens?, next state)."""
    state = (state * 1103515245 + 12345) % 2 ** 31
    return (state >> 8) % 100 < percent, state


def run(strategy, seed=11, loss=30, readings=range(1, 21)):
    """A sensor sends the numbers 1..20 over a network that loses messages and acknowledgements."""
    state, total, applied, sent, seen = seed, 0, 0, 0, set()
    for sequence in readings:
        for attempt in range(8):
            sent += 1
            lost, state = chance(state, loss)
            if not lost:                                   # the message arrives
                if strategy != "dedupe" or sequence not in seen:
                    total += sequence
                    applied += 1
                seen.add(sequence)
                ack_lost, state = chance(state, loss)
                if not ack_lost:
                    break                                  # the sensor got the acknowledgement
            if strategy == "once":
                break                                      # no retry
    return sent, applied, total


print(f"{'strategy':<26}{'sent':>5}{'applied':>9}{'total':>7}   (correct total: {sum(range(1, 21))})")
for label, strategy in (("send once, no retry", "once"), ("retry, count everything", "retry"), ("retry + sequence numbers", "dedupe")):
    sent, applied, total = run(strategy)
    print(f"{label:<26}{sent:>5}{applied:>9}{total:>7}   {'correct' if total == 210 else 'wrong'}")`,
      { expected: 'strategy                   sent  applied  total   (correct total: 210)\nsend once, no retry          20       12    133   wrong\nretry, count everything      42       25    283   wrong\nretry + sequence numbers     42       20    210   correct', filename: 'delivery.py', at: 'end' },
    ),
    lab(
      'feedback-lab',
      'Example 3',
      'python',
      'A Python editor with a proportional controller that drives a robot toward a wall with different gains and sensor delays, with its expected output.',
      'Try the gain 0.5 with a sensor delay of 1 and describe what the robot does.',
      `def run(gain, delay, steps=14, start=100.0, target=20.0, top_speed=15.0):
    """A robot drives toward a wall; its distance sensor reports the value from \`delay\` steps ago."""
    distance, history, trace = start, [start], []
    for _ in range(steps):
        sensed = history[max(0, len(history) - 1 - delay)]
        speed = max(-top_speed, min(top_speed, gain * (sensed - target)))
        distance -= speed
        history.append(distance)
        trace.append(round(distance))
    return trace


for gain, delay in ((0.3, 0), (0.3, 2), (0.9, 2)):
    print(f"gain {gain}, sensor delay {delay}:", run(gain, delay))`,
      { expected: 'gain 0.3, sensor delay 0: [85, 70, 55, 44, 37, 32, 28, 26, 24, 23, 22, 21, 21, 21]\ngain 0.3, sensor delay 2: [85, 70, 55, 40, 25, 14, 8, 7, 9, 12, 16, 19, 22, 23]\ngain 0.9, sensor delay 2: [85, 70, 55, 40, 25, 10, -5, -10, 0, 14, 30, 44, 49, 41]', filename: 'feedback.py', at: 'end' },
    ),
  ],
  [`${M}/8`]: [
    cards(
      'ethics-principles',
      'Responsible computing',
      'Six cards for principles of professional conduct in computing, in the spirit of the ACM Code of Ethics: contribute to society, avoid harm, be honest, be fair, respect privacy, and give credit for the work of others.',
      'Principles that every project of this programme can be checked against.',
      [
        { title: 'Serve society', subtitle: 'well-being', tone: 'good', bullets: ['build things that help people', 'think about who is affected'] },
        { title: 'Avoid harm', subtitle: 'safety first', tone: 'warn', bullets: ['test, review, add safeguards', 'the Therac-25 lesson'] },
        { title: 'Be honest', subtitle: 'trustworthy', tone: 'info', bullets: ['report limitations', 'do not overstate results'] },
        { title: 'Be fair', subtitle: 'no discrimination', tone: 'accent', bullets: ['test on every group', 'keep a person in the loop'] },
        { title: 'Respect privacy', subtitle: 'minimise and protect', tone: 'info', bullets: ['collect only what you need', 'consent and deletion'] },
        { title: 'Give credit', subtitle: 'integrity', tone: 'good', bullets: ['cite sources, respect licences', 'no plagiarism'] },
      ],
      { at: 'end' },
    ),
    checklist(
      'design-review',
      'Responsible computing',
      'A design review checklist with eight questions: personal data and consent, data minimisation, deletion, bias testing, human review of decisions, accessibility, licences, and the energy use of the system.',
      'Ask these questions in the design, when the answers are cheap to act on.',
      [
        'Personal data: do we collect any, and do people know and agree (consent)?',
        'Minimal: do we collect only the data that we really need?',
        'Deletion: can people see their data and ask for it to be deleted?',
        'Fairness: were decisions about people tested on each group for bias?',
        'Oversight: can a person check and overturn an automatic decision?',
        'Accessibility: does it work with a keyboard and a screen reader, with captions and good contrast?',
        'Licences: did we check the licence of every third-party library, image and data set?',
        'Footprint: can it use less data, less energy, and work on older devices?',
      ],
      { at: 'end' },
    ),
    table(
      'licences',
      'Responsible computing',
      'A table of four common licences. MIT lets you use, copy, modify and sell the work if you keep the copyright notice and the licence text. Apache 2.0 is similar and also grants patent rights, and you must state your changes. GPL lets you use, modify and share the work, but your changes must be shared under the GPL too. Creative Commons Attribution lets you share and adapt a creative work if you give credit.',
      'A licence says what you may do and what you must do. No licence at all means that you may not copy.',
      ['Licence', 'You may', 'You must'],
      [
        ['MIT', 'use, copy, modify, sell', 'keep the copyright notice and the licence text'],
        ['Apache 2.0', 'the same, plus a patent grant', 'keep the notices and state your changes'],
        ['GPL', 'use, modify, share', 'share your changes under the GPL too (copyleft)'],
        ['Creative Commons BY', 'share and adapt a creative work', 'give credit to the author'],
      ],
      { at: 'end' },
    ),
    flow(
      'research-cycle',
      'Research skills',
      'The research cycle in five steps: ask a question, choose a method, collect evidence, draw a conclusion with its limits, and share the work with citations and everything needed to reproduce it. The conclusion raises new questions, so the cycle starts again.',
      'Research is a loop, and honesty about limits is part of the conclusion.',
      ['Question|clear and testable|accent', 'Method|baseline, one change at a time|info', 'Evidence|several runs, recorded seeds|good', 'Conclusion|with its limits|warn', 'Share|cite, document, reproduce|accent2'],
      { layout: 'cycle', at: 'end' },
    ),
    table(
      'source-quality',
      'Research skills',
      'A table of three kinds of source. Primary sources, such as research papers, documentation and specifications, report the original work and are closest to the truth but are harder to read. Secondary sources, such as textbooks and articles, explain primary ones and may simplify or lag behind. Tertiary sources, such as encyclopaedias, videos and forum answers, are the easiest to read and the easiest to get wrong.',
      'Start with a tertiary source to get the idea, and check it against a primary one.',
      ['Kind', 'Examples', 'Good for', 'Risk'],
      [
        ['Primary', 'papers, specifications, docs', 'the original work', 'dense; one paper is not final'],
        ['Secondary', 'textbooks, review articles', 'clear explanations', 'may be simplified or old'],
        ['Tertiary', 'encyclopaedias, videos, forums', 'a quick overview', 'errors, unknown author'],
      ],
      { at: 'end' },
    ),
    walkthrough(
      'read-a-paper',
      'Research skills',
      'A five-step way to read a research paper. First the abstract, for the claim in a few lines. Second the conclusion, to see whether the claim holds. Third the figures and tables, which show the evidence. Fourth the method, to judge whether the evidence is fair. Last the details and the references, only if the paper matters to you.',
      'Do not start at the top and read to the end. Ask at each step: what is the claim, and what supports it?',
      [
        { title: '1. The abstract', text: 'A few lines that state the question, the method and the claim. Decide whether the paper is relevant to you at all.' },
        { title: '2. The conclusion', text: 'What do the authors say they showed, and what do they admit that they did not show (the limitations)?' },
        { title: '3. The figures and tables', text: 'The evidence in compact form. Check the axes, the baseline, the number of runs and the size of the differences.' },
        { title: '4. The method', text: 'How were the data collected and the experiment run? Could you repeat it? Is the comparison fair?' },
        { title: '5. The details and the references', text: 'Read the proofs and the appendix only if you need them, and follow the references to the sources that the paper relies on.' },
      ],
      { at: 'end' },
    ),
    table(
      'specialisations',
      'CSE specialisations',
      'A table of eight directions of a CSE degree with what you do in each and the fundamentals it uses: software engineering, systems, networks and security, AI and data science, theory and algorithms, interaction, graphics and games, embedded systems and robotics, and computational science. Each uses a different mix of programming, mathematics, algorithms, architecture, operating systems, networks and databases.',
      'Eight directions, one set of fundamentals in different mixes. Check the rules of your own university for how to choose.',
      ['Direction', 'What you do', 'Fundamentals'],
      [
        ['Software engineering', 'large systems, in teams', 'programming, databases, testing'],
        ['Systems', 'OS, compilers, the cloud', 'OS, architecture, networks'],
        ['Networks and security', 'communication, cryptography', 'networks, maths, OS'],
        ['AI and data science', 'learn from data', 'algorithms, maths, data'],
        ['Theory and algorithms', 'complexity, proofs', 'discrete maths, algorithms'],
        ['Interaction, graphics, games', 'interfaces, rendering', 'programming, maths'],
        ['Embedded and robotics', 'hardware and software', 'architecture, logic, control'],
        ['Computational science', 'computing for science', 'maths, algorithms, programming'],
      ],
      { at: 'end' },
    ),
    graph(
      'capstone-graph',
      'Example 3',
      'The dependency graph of the capstone plan. Plan leads to data, data to clean. Clean leads to model, tests and charts. Model and tests lead to report. Report leads to the demo video, and model also leads to the app. The critical path is plan, data, clean, model, report, 14 days. The demo video and the app are Could tasks.',
      'Arrows mean "must finish before". The purple chain is the critical path; the orange tasks are the Could tasks that may be dropped.',
      [
        { id: 'plan', x: 45, y: 110, tone: 'accent' },
        { id: 'data', x: 145, y: 110, tone: 'accent' },
        { id: 'clean', x: 245, y: 110, tone: 'accent' },
        { id: 'model', x: 350, y: 45, tone: 'accent' },
        { id: 'tests', x: 350, y: 115, tone: 'good' },
        { id: 'charts', x: 350, y: 185, tone: 'info' },
        { id: 'report', x: 455, y: 80, tone: 'accent' },
        { id: 'video', x: 555, y: 50, tone: 'warn' },
        { id: 'app', x: 455, y: 170, tone: 'warn' },
      ],
      [['plan', 'data'], ['data', 'clean'], ['clean', 'model'], ['clean', 'tests'], ['clean', 'charts'], ['model', 'report'], ['tests', 'report'], ['report', 'video'], ['model', 'app']],
      { directed: true, at: 'end' },
    ),
    V(
      'chart',
      'roadmap-hours',
      'Lesson Project: Capstone Plan and Final Project',
      'A bar chart of the weekly study hours of the roadmap: 3 hours each for discrete mathematics and for operating systems and networks, 1 hour each for data structures and algorithms, digital logic and architecture, databases and the web, and programming, and 0 hours for Python and AI.',
      'The weaker the confidence, the more hours: the roadmap puts the time where it is needed.',
      {
        kind: 'bar',
        xLabel: 'Area',
        yLabel: 'Hours a week',
        categories: ['Discrete', 'OS and nets', 'DSA', 'Logic', 'Databases', 'Programming', 'Python, AI'],
        series: [{ name: 'Hours a week', values: [3, 3, 1, 1, 1, 1, 0] }],
      },
      { at: 'start' },
    ),
    lab(
      'review-lab',
      'Example 1',
      'python',
      'A Python editor with a design review function that turns yes and no answers about a project into a list of concerns, applied to three projects, with its expected output.',
      'Add a fourth project of your own and a new rule, for example \'the data are kept for ever\'.',
      `def review(project):
    """Turn the questions of responsible design into a list of concerns."""
    concerns = []
    if project["personal_data"]:
        if not project["consent"]:
            concerns.append("personal data is collected without clear consent")
        if not project["minimal"]:
            concerns.append("it collects more data than it needs")
        if not project["deletable"]:
            concerns.append("people cannot ask for their data to be deleted")
    if project["decides_about_people"]:
        if not project["bias_tested"]:
            concerns.append("its decisions were not tested for bias")
        if not project["human_review"]:
            concerns.append("no person can check or overturn a decision")
    if not project["accessible"]:
        concerns.append("it cannot be used with a keyboard and a screen reader")
    if project["third_party"] and not project["licences_checked"]:
        concerns.append("the licences of the third-party code or data were not checked")
    return concerns


PROJECTS = {
    "Face-recognition attendance": dict(personal_data=True, consent=False, minimal=False, deletable=False, decides_about_people=True,
                                        bias_tested=False, human_review=False, accessible=True, third_party=True, licences_checked=False),
    "Class timetable app": dict(personal_data=False, consent=False, minimal=True, deletable=True, decides_about_people=False,
                                bias_tested=False, human_review=False, accessible=True, third_party=True, licences_checked=True),
    "Attendance by roll call, redesigned": dict(personal_data=True, consent=True, minimal=True, deletable=True, decides_about_people=True,
                                                bias_tested=True, human_review=True, accessible=False, third_party=False, licences_checked=False),
}
for name, project in PROJECTS.items():
    concerns = review(project)
    print(f"{name}: {len(concerns)} concern(s)")
    for concern in concerns:
        print("  -", concern)`,
      { expected: 'Face-recognition attendance: 6 concern(s)\n  - personal data is collected without clear consent\n  - it collects more data than it needs\n  - people cannot ask for their data to be deleted\n  - its decisions were not tested for bias\n  - no person can check or overturn a decision\n  - the licences of the third-party code or data were not checked\nClass timetable app: 0 concern(s)\nAttendance by roll call, redesigned: 1 concern(s)\n  - it cannot be used with a keyboard and a screen reader', filename: 'design_review.py', at: 'end' },
    ),
    lab(
      'experiment-lab',
      'Example 2',
      'python',
      'A Python editor with a reproducible experiment that counts the comparisons of linear and binary search for five seeds, reports the mean and the spread, and formats and checks three references, with its expected output.',
      'Use 10 seeds instead of 5 and give the third reference the year 1998.',
      `import statistics


def lcg_list(seed, count, modulus=100_000):
    """Repeatable pseudo-random numbers: the same on every computer."""
    values, x = [], seed
    for _ in range(count):
        x = (x * 1103515245 + 12345) % 2 ** 31
        values.append(x % modulus)
    return values


def linear_comparisons(data, target):
    for count, item in enumerate(data, start=1):
        if item == target:
            return count
    return len(data)


def binary_comparisons(data, target):
    low, high, count = 0, len(data) - 1, 0
    while low <= high:
        mid = (low + high) // 2
        count += 1
        if data[mid] == target:
            return count
        low, high = (mid + 1, high) if data[mid] < target else (low, mid - 1)
    return count


print("Experiment: searching 1,000 sorted numbers for a number that is in the list")
linear, binary = [], []
for seed in range(1, 6):
    data = sorted(lcg_list(seed, 1000))
    target = data[(seed * 337) % 1000]
    linear.append(linear_comparisons(data, target))
    binary.append(binary_comparisons(data, target))
    print(f"  seed {seed}: linear {linear[-1]:>3} comparisons, binary {binary[-1]:>2}")
for name, runs in (("linear", linear), ("binary", binary)):
    print(f"{name}: mean {statistics.mean(runs):.1f}, stdev {statistics.stdev(runs):.1f}, range {min(runs)} to {max(runs)}")

REFERENCES = [
    {"author": "Dijkstra, E. W.", "year": 1968, "title": "Go To Statement Considered Harmful", "venue": "Communications of the ACM, 11(3), 147-148"},
    {"author": "Turing, A. M.", "year": 1950, "title": "Computing Machinery and Intelligence", "venue": "Mind, 59(236), 433-460"},
    {"author": "Knuth, D. E.", "title": "The Art of Computer Programming, Volume 3: Sorting and Searching", "venue": "Addison-Wesley"},
]


def cite(reference):
    missing = [field for field in ("author", "year", "title", "venue") if field not in reference]
    if missing:
        return f"INCOMPLETE ({', '.join(missing)} missing): {reference.get('title', '?')}"
    return f"{reference['author']} ({reference['year']}). {reference['title']}. {reference['venue']}."


print()
for reference in sorted(REFERENCES, key=lambda r: r["author"]):
    print(cite(reference))`,
      { expected: 'Experiment: searching 1,000 sorted numbers for a number that is in the list\n  seed 1: linear 338 comparisons, binary 10\n  seed 2: linear 675 comparisons, binary  8\n  seed 3: linear  12 comparisons, binary 10\n  seed 4: linear 349 comparisons, binary  9\n  seed 5: linear 686 comparisons, binary 10\nlinear: mean 412.0, stdev 280.0, range 12 to 686\nbinary: mean 9.4, stdev 0.9, range 8 to 10\n\nDijkstra, E. W. (1968). Go To Statement Considered Harmful. Communications of the ACM, 11(3), 147-148.\nINCOMPLETE (year missing): The Art of Computer Programming, Volume 3: Sorting and Searching\nTuring, A. M. (1950). Computing Machinery and Intelligence. Mind, 59(236), 433-460.', filename: 'experiment.py', at: 'end' },
    ),
    lab(
      'plan-lab',
      'Example 3',
      'python',
      'A Python editor with a project planner that schedules tasks with dependencies, drops Could tasks until the plan fits the deadline with a buffer, and prints the critical path, with its expected output.',
      'Change the deadline to 15 days and predict which Could tasks must go.',
      `TASKS = {  # days, depends on, priority (M must, S should, C could)
    "plan": (2, [], "M"),
    "data": (3, ["plan"], "M"),
    "clean": (2, ["data"], "M"),
    "model": (4, ["clean"], "M"),
    "tests": (3, ["clean"], "M"),
    "report": (3, ["model", "tests"], "M"),
    "charts": (2, ["clean"], "S"),
    "demo video": (2, ["report"], "C"),
    "app": (5, ["model"], "C"),
}
DEADLINE, BUFFER = 18, 0.20


def schedule(tasks):
    """Earliest start and finish of every task; a task starts when all its dependencies have finished."""
    finish, start = {}, {}
    remaining = dict(tasks)
    while remaining:
        ready = [name for name, (_, needs, _) in remaining.items() if all(n in finish for n in needs)]
        for name in sorted(ready):
            days, needs, _ = remaining.pop(name)
            start[name] = max((finish[n] for n in needs), default=0)
            finish[name] = start[name] + days
    return start, finish


def critical_path(tasks, finish):
    """Follow the dependency that finishes last, back from the last task."""
    name = max(finish, key=lambda n: (finish[n], n))
    path = [name]
    while tasks[name][1]:
        name = max(tasks[name][1], key=lambda n: (finish[n], n))
        path.append(name)
    return path[::-1]


usable = DEADLINE * (1 - BUFFER)
print(f"deadline {DEADLINE} days, buffer {BUFFER:.0%}: plan for at most {usable:.1f} days")
chosen = dict(TASKS)
while True:
    start, finish = schedule(chosen)
    length = max(finish.values())
    print(f"{len(chosen)} tasks need {length} days:", "fits" if length <= usable else "too long")
    if length <= usable:
        break
    dropped = max((n for n, (_, _, p) in chosen.items() if p == "C"), key=lambda n: (finish[n], n))
    print("  drop the Could task", dropped)
    del chosen[dropped]
    chosen = {n: (d, [x for x in needs if x in chosen], p) for n, (d, needs, p) in chosen.items()}
for name in sorted(start, key=lambda n: (start[n], n)):
    print(f"  {name:<10} day {start[name]:>2} to {finish[name]:>2}  {chosen[name][2]}")
print("critical path:", " > ".join(critical_path(chosen, finish)), f"({length} days)")`,
      { expected: 'deadline 18 days, buffer 20%: plan for at most 14.4 days\n9 tasks need 16 days: too long\n  drop the Could task demo video\n8 tasks need 16 days: too long\n  drop the Could task app\n7 tasks need 14 days: fits\n  plan       day  0 to  2  M\n  data       day  2 to  5  M\n  clean      day  5 to  7  M\n  charts     day  7 to  9  S\n  model      day  7 to 11  M\n  tests      day  7 to 10  M\n  report     day 11 to 14  M\ncritical path: plan > data > clean > model > report (14 days)', filename: 'planner.py', at: 'end' },
    ),
  ],
  // @@visuals-end
});

registerQuizCatalog({
  [`${M}/1`]: [
    mcq('q1', 'Which statement about Python is true?', ['The type belongs to the value, so one name can refer to a number now and to text later', 'Every variable must be declared with its type before it is used', 'A Python program is compiled to machine code before it runs, like a C program', 'Python integers overflow at 2 to the power of 31'], 'Python is dynamically typed: the type belongs to the value, not to the name. Integers have any size, and CPython compiles source to bytecode, not to machine code.'),
    mcq('q2', 'What does this program print?', ['3.5 3 1', '3 3 1', '3.5 3.5 1', '3 3.5 1'], '`/` is true division and always gives a float (3.5), `//` is floor division (3) and `%` is the remainder (1).', PY('print(7 / 2, 7 // 2, 7 % 2)')),
    mcq('q3', 'What does this program print?', ['[1, 2, 3] [1, 2, 3, 4]', '[1, 2] [1, 2, 3, 4]', '[1, 2, 3, 4] [1, 2, 3, 4]', '[1, 2] [1, 2, 3]'], '`b = a` is a second name for the same list, so appending 3 through `b` changes `a`. `a.copy()` makes a separate list, so appending 4 to `c` leaves `a` alone.', PY('a = [1, 2]\nb = a\nb.append(3)\nc = a.copy()\nc.append(4)\nprint(a, c)')),
    mcq('q4', 'How does a standard CPython program run?', ['It is compiled to bytecode, which a virtual machine then executes', 'It is compiled to machine code by the programmer before every run', 'The CPU reads the source text directly', 'It is translated to Java bytecode and run by the JVM'], 'CPython first compiles the source to bytecode and then executes the bytecode on its virtual machine. C compiles to machine code, and Java uses a different bytecode and a different virtual machine.'),
    mcq('q5', 'You must write the firmware of a tiny sensor with 2 KB of memory and strict timing. Which choice is best justified?', ['C or C++, because they give direct control of memory and need no heavy runtime', 'Python, because it is the shortest and quickest language to write', 'JavaScript, because it runs in every browser and on every phone and laptop', 'Any language will do, because speed and memory never matter for firmware'], 'With very little memory and strict timing you need control and a small runtime, which compiled languages such as C and C++ give. Short code is not the deciding criterion here.'),
  ],
  [`${M}/2`]: [
    mcq('q1', 'What does this program print?', ['[2, 3]', '[1, 2, 3, 4]', '[1, 4]', '[2, 3, 4]'], '`&` is the intersection of two sets: the items that are in both, 2 and 3. `sorted` turns the set into a list in a fixed order.', PY('print(sorted({1, 2, 3} & {2, 3, 4}))')),
    mcq('q2', 'What does this program print?', ['[1, 2]', '[2]', '[1]', '[2, 1]'], 'The default list `[]` is created once, when `def` runs, so both calls share it. The first call puts 1 in it and the second call adds 2 to the same list.', PY('def add(item, bucket=[]):\n    bucket.append(item)\n    return bucket\n\n\nadd(1)\nprint(add(2))')),
    mcq('q3', 'What does this program print?', ['1', '0', 'KeyError', '2'], '`d.get("b", 0)` returns the default 0 because the key "b" is missing, and `d["a"]` is 1, so the sum is 1. Only `d["b"]` would raise a KeyError.', PY('d = {"a": 1}\nprint(d.get("b", 0) + d["a"])')),
    mcq('q4', 'Which collection is best for checking quickly, many times, whether a student id has been seen before?', ['A set, because a membership test takes about constant time', 'A list, because it keeps the ids in the order in which they came', 'A tuple, because it cannot change', 'A string, because it is the simplest type'], 'A set (and a dict) uses a hash table, so `x in s` takes about O(1) however many ids there are, while a list must look at the items one by one.'),
    mcq('q5', 'What does `if __name__ == "__main__":` do?', ['It runs the code below only when the file is run directly, not when it is imported', 'It makes the whole file run faster, because Python reads the file only once', 'It imports the module called __main__ from the standard library', 'It stops the program at once when an error happens in the file'], 'When a file is run directly its `__name__` is "__main__"; when it is imported, `__name__` is the module name. The guard lets one file be both a library and a program.'),
  ],
  [`${M}/3`]: [
    mcq('q1', 'What does this program print?', ['6 3', '6 7', '3 1', '5 2'], 'The range shrinks from the whole list to the right half twice: the middle positions are 3 (value 8), 5 (value 12) and then 6 (value 14), found at the third comparison. A linear search would have needed 7.', PY('items = [2, 4, 6, 8, 10, 12, 14]\nlow, high, steps = 0, len(items) - 1, 0\nwhile low <= high:\n    mid = (low + high) // 2\n    steps += 1\n    if items[mid] == 14:\n        break\n    low = mid + 1\nprint(mid, steps)')),
    mcq('q2', 'Which statement about a greedy algorithm is true?', ['It is fast but not always optimal: for the coins 1, 3 and 4 it pays 6 with three coins', 'It always finds the optimal answer because it chooses the best item every time', 'It tries every possible combination, so it is slow', 'It needs a sorted input to work'], 'A greedy algorithm takes the locally best choice at each step. That is fast, but for some problems, such as making 6 from the coins 1, 3 and 4, it misses the best answer, and dynamic programming is needed.'),
    mcq('q3', 'What does this program print?', ['11', '10', '177', '55'], 'With the cache, each value from fib(0) to fib(10) is computed once, so there are 11 misses. The answer 55 is the value of fib(10), and the plain recursion would make 177 calls.', PY('from functools import lru_cache\n\n\n@lru_cache(maxsize=None)\ndef f(n):\n    return n if n < 2 else f(n - 1) + f(n - 2)\n\n\nf(10)\nprint(f.cache_info().misses)')),
    mcq('q4', 'Why do we test our own sorting function against the built-in `sorted` on pseudo-random lists?', ['`sorted` is a trusted oracle, and seeded random data finds many cases and can be repeated', 'Because `sorted` is always slower than our function, so the comparison is fair', 'Because a good test needs random data that is different on every single run', 'Because our function must call `sorted` internally to do its own work'], 'An oracle is a trusted reference: if our result differs from sorted(data) on any input, there is a bug. A seeded generator gives the same lists every run, so a failing case can be reproduced and fixed.'),
    mcq('q5', 'What does this program print?', ['B', 'C', 'A', 'None'], 'BFS takes A first and discovers B and C. B is taken before C, and B finds D first, so D\'s parent is B. C then finds D already known and does not change it.', PY('from collections import deque\n\ngraph = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}\nparent, queue = {"A": None}, deque(["A"])\nwhile queue:\n    node = queue.popleft()\n    for n in graph[node]:\n        if n not in parent:\n            parent[n] = node\n            queue.append(n)\nprint(parent["D"])')),
  ],
  [`${M}/4`]: [
    mcq('q1', 'What does this program print?', ['24.8 7', '7 24.8', '24.8 24.8', '7 7'], 'The mean is 124 / 5 = 24.8, pulled up by the extreme value 100. The median is the middle value, 7, and is not affected by the extreme value.', PY('import statistics\ndata = [3, 5, 7, 9, 100]\nprint(statistics.mean(data), statistics.median(data))')),
    mcq('q2', 'Which practice is right when you clean a data set?', ['Keep the raw data, apply explicit rules and log every row that you remove and why', 'Delete every row that looks strange and do not mention it in the report', 'Change unusual values so that the results look neat and tidy in the chart', 'Clean the raw file in place so that there is only one copy to look after'], 'Cleaning must be explicit and auditable: the raw data stay untouched and a log says what was removed and why, so that others can check or change a decision.'),
    mcq('q3', 'What does this program print?', ['[(30, 1), (40, 1), (50, 2), (60, 2), (70, 2)]', '[(30, 1), (40, 1), (50, 1), (60, 1), (70, 1)]', '[(38, 1), (45, 1), (52, 1), (58, 1), (61, 1), (67, 1), (70, 1), (79, 1)]', '[(3, 1), (4, 1), (5, 2), (6, 2), (7, 2)]'], 'Integer division by 10 and multiplication by 10 put each score into its band of ten: 38 goes to 30, 45 to 40, 52 and 58 to 50, 61 and 67 to 60, 70 and 79 to 70.', PY('from collections import Counter\nscores = [38, 45, 52, 58, 61, 67, 70, 79]\nprint(sorted(Counter(s // 10 * 10 for s in scores).items()))')),
    mcq('q4', 'Ice cream sales and sunburn cases have a correlation of 0.99. What is the best conclusion?', ['A third factor, hot weather, drives both; correlation alone does not prove causation', 'Ice cream causes sunburn, because the two rise together every summer', 'Sunburn makes people buy ice cream to cool their skin down again', 'A correlation of 0.99 is too high to be real, so it must be a calculation error'], 'A correlation measures how two variables move together, not why. Here hot weather, a confounder, raises both, so neither causes the other.'),
    mcq('q5', 'What does this program print?', ['-1.0', '1.0', '0.0', '-0.5'], 'Every time x grows by 1, y falls by 2, along an exact straight line, so the correlation is perfectly negative: -1.0.', PY('import statistics\nxs = [1, 2, 3, 4]\nys = [8, 6, 4, 2]\nprint(round(statistics.correlation(xs, ys), 2))')),
  ],
  [`${M}/5`]: [
    mcq('q1', 'Which task is an example of supervised learning?', ['Predicting pass or fail from the hours and attendance of past students with known results', 'Grouping customers by their buying habits when nobody has named the groups', 'A robot learning to walk by receiving a reward for every step without falling', 'Writing the rules of a flu check by hand'], 'Supervised learning needs labelled examples: here the past results are the labels. Grouping without labels is unsupervised, rewards from trial and error are reinforcement learning, and hand-written rules are not machine learning at all.'),
    mcq('q2', 'What does this program print?', ['B', 'A', '4', 'None'], 'The squared distances from (4, 4) are 18 for (1, 1), 2 for (5, 5) and 8 for (2, 2). The nearest example is (5, 5), whose label is B.', PY('points = [((1, 1), "A"), ((5, 5), "B"), ((2, 2), "A")]\nquery = (4, 4)\nnearest = min(points, key=lambda p: (p[0][0] - query[0]) ** 2 + (p[0][1] - query[1]) ** 2)\nprint(nearest[1])')),
    mcq('q3', 'A classifier is right for 98 per cent of its training examples but only for 70 per cent of new examples. What is the most likely problem?', ['Overfitting: it has memorised the training data, noise included', 'Underfitting: the model is too simple to learn the pattern', 'The test set is too big for the model to cope with', 'The features are scaled, which always lowers the accuracy'], 'A large gap between training and test accuracy is the signature of overfitting. An underfitting model is poor on both sets.'),
    mcq('q4', 'What does this program print?', ['75%', '6%', '60%', '0.75'], 'Six of the eight predictions equal the actual labels, and 6 / 8 = 0.75, which the format code `.0%` prints as 75%.', PY('actual = [1, 0, 1, 1, 0, 0, 1, 0]\npredicted = [1, 0, 0, 1, 0, 1, 1, 0]\ncorrect = sum(a == p for a, p in zip(actual, predicted))\nprint(f"{correct / len(actual):.0%}")')),
    mcq('q5', 'A model that detects a rare illness is right 99 per cent of the time. Why might it still be useless?', ['If only 1 patient in 100 is ill, a model that always says "healthy" is 99 per cent accurate', 'Because 99 per cent is never high enough for any task that involves a patient', 'Because accuracy can only be measured on the training set, never on new data', 'Because rare illnesses cannot be predicted by any model, however well it is trained'], 'With a rare class, a trivial baseline already has a high accuracy. Recall (the share of ill patients found) and the confusion matrix show whether the model is really useful.'),
  ],
  [`${M}/6`]: [
    mcq('q1', 'What is a token in natural language processing?', ['A small unit of text, such as a word or part of a word, that a model reads', 'A password or key that lets you use a language model on a website', 'The probability that a whole sentence is correct, from 0 to 1', 'A picture that is stored as a grid of pixels, each with a colour'], 'Text is split into tokens (words or pieces of words), and every NLP method works on those units, usually by counting them or turning them into numbers.'),
    mcq('q2', 'What does this program print?', ["['don', 't', 'panic', 'it', 's']", "['don't', 'panic', 'it's', '42']", "['dont', 'panic', 'its']", "['don', 't', 'panic', 'it', 's', '42']"], 'The pattern `[a-z]+` matches runs of lower-case letters only. The apostrophes split "don\'t" into don and t, and "it\'s" into it and s, and the digits 42 are not letters, so they are left out.', PY('import re\nprint(re.findall(r"[a-z]+", "Don\'t panic: it\'s 42!".lower()))')),
    mcq('q3', 'What does this program print?', ['[30, 30, 30]', '[0, 90, 0]', '[90, 90, 90]', '[0, 30, 0]'], 'Each output value is the integer average of three neighbouring pixels. Every window of three contains the 90 once, so each average is 90 // 3 = 30: the bright pixel has been blurred into its neighbours.', PY('row = [0, 0, 90, 0, 0]\nblurred = [sum(row[i - 1:i + 2]) // 3 for i in range(1, 4)]\nprint(blurred)')),
    mcq('q4', 'Why can a large language model produce a fluent but false statement?', ['It predicts likely next words from its training data and cannot check facts', 'Because it copies whole sentences from the internet without changing them', 'Because it always answers at random, whatever the question was', 'Because it understands the topic well, but it wants to trick the user'], 'A language model is trained to continue text in a likely way, not in a true way. It can therefore produce a smooth sentence that is wrong, a hallucination, with the same confidence as a right one.'),
    mcq('q5', 'Which use of a chatbot for a school assignment is the most responsible?', ['Asking it to explain an idea, checking it in a reliable source, and writing your own answer', 'Pasting the question and handing in the answer unchanged, as your own work', 'Pasting the private messages of your classmates so that it can summarise them for you', 'Trusting every reference that it gives, because the answer sounds confident'], 'Responsible use keeps your own thinking, verifies the facts, protects private data and follows the rules about disclosure. Handing in unchecked AI text as your own breaks academic integrity.'),
  ],
  [`${M}/7`]: [
    mcq('q1', 'Which cloud service model gives you a finished application, such as web mail or an online document editor, that you only use?', ['SaaS (software as a service)', 'IaaS (infrastructure as a service)', 'PaaS (platform as a service)', 'A private data centre that you own'], 'With SaaS the provider runs the whole application and you only use it. With IaaS you rent machines and manage the software yourself, and with PaaS you supply your own code.'),
    mcq('q2', 'What does this program print?', ['[34, 35, 37]', '[20, 22, 60]', '[34, 34, 34]', '[22, 60, 24]'], 'Each output value is the average of three neighbouring readings: (20 + 22 + 60) / 3 = 34, (22 + 60 + 24) / 3 = 35.3 and (60 + 24 + 26) / 3 = 36.7, which round to 34, 35 and 37. The spike of 60 is spread over three values.', PY('values = [20, 22, 60, 24, 26]\nsmooth = [sum(values[i - 1:i + 2]) / 3 for i in range(1, 4)]\nprint([round(v) for v in smooth])')),
    mcq('q3', 'A sensor message arrives twice because the acknowledgement of the first copy was lost. What makes the receiver safe?', ['An idempotent receiver that ignores a sequence number it has already applied', 'A faster network that never loses an acknowledgement or any other packet', 'Sending every message three times to be sure that one arrives', 'Using the clock of the sensor to put the messages in the right order'], 'Retries are necessary, so duplicates will happen. If the receiver checks sequence numbers and applies each one only once, a repeated message has no further effect.'),
    mcq('q4', 'What does this program print?', ['16', '28', '12', '23'], 'Only the first copy of each sequence number is added: 5 + 7 + 4 = 16. The repeated (2, 7) and (1, 5) are ignored because their sequence numbers are already in the set.', PY('seen, total = set(), 0\nfor seq, value in [(1, 5), (2, 7), (2, 7), (3, 4), (1, 5)]:\n    if seq not in seen:\n        seen.add(seq)\n        total += value\nprint(total)')),
    mcq('q5', 'Why is part of the processing of sensor data often done at the edge, near the sensor?', ['It saves bandwidth, reacts faster and still works when the connection is poor', 'It makes the data of the sensor impossible for any attacker to hack', 'The cloud is not able to store all of the data that sensors produce', 'Sensors are not able to send their data over a network at all'], 'Filtering, averaging and quick alarms near the sensor reduce the data that must be sent, shorten the reaction time and let the system work during a network failure. It does not remove the need for security.'),
  ],
  [`${M}/8`]: [
    mcq('q1', 'Which action follows the principle of data minimisation?', ['Collecting only the data that the feature needs, and deleting it when it is not needed', 'Collecting everything now, because it may well be useful for something one day', 'Removing the names from the data and then sharing it with anyone who asks', 'Keeping all of the data for ever as a backup, in case it is needed'], 'Data minimisation means collecting and keeping only what is needed for a clear purpose. More data means more risk to the people it describes.'),
    mcq('q2', 'What does this program print?', ['7', '8', '6', '5'], 'The task a finishes on day 2. Task b finishes on day 2 + 3 = 5 and task c on day 2 + 1 = 3. Task d must wait for both, so it starts on day 5 and finishes on day 7: the critical path is a, b, d.', PY('tasks = {"a": (2, []), "b": (3, ["a"]), "c": (1, ["a"]), "d": (2, ["b", "c"])}\nfinish = {}\nfor name in ["a", "b", "c", "d"]:\n    days, needs = tasks[name]\n    finish[name] = max((finish[n] for n in needs), default=0) + days\nprint(finish["d"])')),
    mcq('q3', 'Why should an experiment be repeated with several random seeds?', ['One run may be lucky or unlucky; several runs show the typical result and its spread', 'Because the first run of an experiment is always wrong and must be thrown away', 'Because the random numbers change the algorithm itself between the runs', 'Because every report must contain at least five numbers for each result'], 'A single run can be far from typical. Reporting the mean and the spread of several runs, with the seeds recorded, is honest and lets others repeat the experiment.'),
    mcq('q4', 'What does this program print?', ["{'a': 6, 'b': 3} 1", "{'a': 7, 'b': 3} 0", "{'a': 6, 'b': 4} 0", "{'a': 5, 'b': 5} 0"], 'Each share is rounded down: 10 * 2 // 3 = 6 and 10 * 1 // 3 = 3. Together they use 9 of the 10 hours, so 1 hour is left over, which the roadmap hands to the area with the largest need.', PY('need = {"a": 2, "b": 1}\nhours = 10\nshare = {k: hours * v // sum(need.values()) for k, v in need.items()}\nprint(share, hours - sum(share.values()))')),
    mcq('q5', 'What belongs in the limitations section of a project report?', ['An honest list of what the work cannot show, such as a small test set or simulated data', 'A list of the features that were planned for the project but that nobody wanted', 'The reasons why the project is better than all of the other projects of the class', 'Nothing at all, because limitations only make the whole report look weak'], 'Stating the limitations (a small test set, simulated data, one language) tells the reader how far the results can be trusted. Hiding them is dishonest and makes the rest of the report less believable.'),
  ],
  // @@quiz-end
});
