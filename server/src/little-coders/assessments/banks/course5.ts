// FILE PATH: server/src/little-coders/assessments/banks/course5.ts
//
// COURSE 5 ASSESSMENT — Python Creative Lab (EduBlocks). Topics: 1 lists and index ·
// 2 looping through lists · 3 functions · 4 parameters and return · 5 while loops ·
// 6 nested loops · 7 debugging · 8 structured programs. Code answers are executed by the tests.

import { bank, mcq, practical, pyCode, tf } from '../lc-bank.helpers';

export const course5Bank = bank({
  id: 'lc/course-test/python-creative-lab',
  title: 'Python Creative Lab — Course Assessment',
  kind: 'COURSE',
  moduleSlug: 'python-creative-lab',
  courseNumber: 5,
  mcq: [
    mcq(
      'concept',
      'EASY',
      1,
      'In a Python list, what is the index of the first item?',
      '0',
      ['1', '-1', 'The length of the list'],
      'Python starts counting at 0, so the first item has index 0.',
    ),
    mcq(
      'concept',
      'EASY',
      3,
      'What is a function?',
      'A group of blocks with a name that you can use again and again',
      [
        'A number that stores a score',
        'A loop that never ends',
        'A message shown to the user',
      ],
      'You write a function once with def, then call it by name whenever you need it.',
    ),
    mcq(
      'identify',
      'EASY',
      2,
      'Which block visits every item in a list called colours, one at a time?',
      '`for colour in colours:`',
      ['`while colours:`', '`colours.append( )`', '`def colours():`'],
      'A for loop over a list runs once for each item. append adds an item and def makes a function.',
    ),
    mcq(
      'identify',
      'MEDIUM',
      5,
      'Which block keeps repeating as long as a question is true?',
      '`while guess != secret:`',
      ['`for i in range( 3 ):`', '`def guess():`', '`return guess`'],
      'A while loop checks its question before each repeat and stops when it becomes false.',
    ),
    mcq(
      'predict',
      'MEDIUM',
      1,
      'What does this program print?',
      '4\npear',
      ['3\npear', '4\napple', '4\nplum'],
      'append adds kiwi, so the list has 4 items. Index 1 is the second item: pear.',
      {
        code: pyCode(
          'lists| fruits = ["apple", "pear", "plum"]',
          'lists| fruits.append( "kiwi" )',
          'statements| print( len( fruits ) )',
          'statements| print( fruits[1] )',
        ),
        verify: { stdout: '4\npear' },
      },
    ),
    mcq(
      'predict',
      'MEDIUM',
      4,
      'What does this program print?',
      '15',
      ['8', '5', '53'],
      'triple( 5 ) sends 5 into n, and the function returns 5 × 3 = 15.',
      {
        code: pyCode(
          'functions| def triple( n ):',
          '  functions| return n * 3',
          'statements| print( triple( 5 ) )',
        ),
        verify: { stdout: '15' },
      },
    ),
    mcq(
      'sequence',
      'MEDIUM',
      6,
      'How many lines does this program print?',
      '6',
      ['5', '3', '2'],
      'The outer loop runs 2 times and the inner loop runs 3 times for each of them, so the inner print runs 2 × 3 = 6 times.',
      {
        code: pyCode(
          'loops| for a in range( 2 ):',
          '  loops| for b in range( 3 ):',
          '    statements| print( "*" )',
        ),
        verify: { lines: 6 },
      },
    ),
    mcq(
      'predict',
      'HARD',
      5,
      'What does this program print?',
      '4',
      ['1', '7', '10'],
      'n goes 10, then 7, then 4. When n is 4, “n > 4” is false, so the loop stops and prints 4.',
      {
        code: pyCode(
          'variables| n = 10',
          'loops| while n > 4:',
          '  variables| n -= 3',
          'statements| print( n )',
        ),
        verify: { stdout: '4' },
      },
    ),
    mcq(
      'sequence',
      'HARD',
      8,
      'Which order works for a program that greets every crew member in a list?',
      'Make the list, define the function, then loop and call the function',
      [
        'Loop first, then make the list, then define the function',
        'Call the function first, then define it, then make the list',
        'Define the function, loop, then make the list',
      ],
      'The loop needs the list and the function to exist before it runs. Python reads from the top, so make both first.',
    ),
    mcq(
      'mistake',
      'HARD',
      7,
      'This program prints 3 forever and never stops. What is the mistake?',
      'count never changes, so the question count > 0 is always true',
      [
        'print cannot be used inside a loop',
        'count must be a text value',
        'The loop needs range( )',
      ],
      'Something inside a while loop must change, or the question never becomes false. Use count -= 1 inside the loop.',
      {
        code: pyCode(
          'variables| count = 3',
          'loops| while count > 0:',
          '  statements| print( count )',
        ),
      },
    ),
  ],
  trueFalse: [
    tf(
      'EASY',
      1,
      'Python counts the items in a list starting from 0.',
      true,
      'The first item is index 0, the second is index 1, and so on.',
    ),
    tf(
      'EASY',
      3,
      'A function runs as soon as you define it with def.',
      false,
      'A def only stores the recipe. The function runs when you call it by name.',
    ),
    tf(
      'MEDIUM',
      2,
      'A for loop over a list runs the blocks inside it once for each item.',
      true,
      'The loop variable holds the current item each time round.',
    ),
    tf(
      'MEDIUM',
      4,
      'The arguments are the names listed in the def line of a function.',
      false,
      'The names in the def line are parameters. Arguments are the values you give when you call the function.',
    ),
    tf(
      'HARD',
      6,
      'If the outer loop runs 3 times and the inner loop runs 2 times each time, the inner blocks run 6 times in total.',
      true,
      'The inner loop runs fully for every step of the outer loop: 3 × 2 = 6.',
    ),
  ],
  practicals: [
    practical(null, 'Planet Postcards', 'EduBlocks', {
      platform: 'EDUBLOCKS',
      brief: [
        'Build a Python program in EduBlocks that sends postcards from planets.',
        'It stores planets in a list, uses a function with a parameter to write each postcard, and checks a secret code with a while loop.',
        'You choose the planets, the postcard words and the secret code.',
      ],
      blocks: [
        { category: 'Lists', blocks: ['list [ ]'] },
        { category: 'Loops', blocks: ['for ... in ...:', 'while ...:'] },
        {
          category: 'Functions',
          blocks: ['def name( parameter ):', 'function call'],
        },
        { category: 'Logic', blocks: ['if', 'compare ( == , != )'] },
        { category: 'Statements', blocks: ['print( )', 'input( )'] },
        { category: 'Variables', blocks: ['variable = value'] },
      ],
      requirements: [
        'A list holds at least 3 planet names.',
        'A function with at least one parameter prints a postcard message that uses the parameter.',
        'A for loop goes through the list and calls the function once for every planet.',
        'A while loop asks for a secret code again and again until the right code is typed.',
        'At least one wrong code is rejected with a message.',
        'After the loop, the program prints a message saying the postcards were sent.',
      ],
      starter: {
        required: false,
        kind: 'NONE',
        label: '',
        url: '',
        note: '',
        modelLabels: [],
      },
      bonus: [
        'Count how many wrong codes were typed and print the number at the end.',
      ],
      handIn:
        'Download your program from EduBlocks as a .py file and upload it, and/or upload a screenshot of your blocks and output, and/or paste a shareable link.',
    }),
  ],
});
