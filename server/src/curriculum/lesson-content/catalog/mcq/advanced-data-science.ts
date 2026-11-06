// FILE PATH: server/src/curriculum/lesson-content/catalog/mcq/advanced-data-science.ts
//
// Four-option multiple-choice versions of the "Advanced Data Science" custom course's
// "write your answer" quiz questions. That course's lessons were redesigned by hand, so
// they are found by lesson TITLE (the course has no module lineage of its own). The
// Cosmic Defender lessons (orders 10–17) already have six multiple-choice questions each;
// their three reflection questions are kept for the teacher as discussion prompts.

import { registerMcqRewritesByTitle } from '../../quiz-mcq';
import { rw } from '../helpers';

registerMcqRewritesByTitle({
  'From Blocks to Words — Hello, Python!': [
    rw('What function do you use to display text on the screen', ['`print()`', '`show()`', '`display()`', '`echo()`'], '`print()` displays whatever you put inside its brackets.'),
    rw('What punctuation marks must wrap around a string', ['Quotation marks (`" "` or `\' \'`)', 'Round brackets `( )`', 'Square brackets `[ ]`', 'Curly braces `{ }`'], 'Quotation marks tell Python where the text starts and where it ends.'),
    rw('What does Python call a line that starts with `#`', ['A comment — Python ignores it', 'A command that prints text', 'A syntax error', 'A variable'], 'Comments are notes for the people reading the code.'),
    rw('What happens if you forget a closing quotation mark', ['Python shows a syntax error, because it cannot tell where the string ends', 'Python adds the missing quote itself', 'Python prints the text without the quote', 'Nothing happens — the program runs normally'], 'A string needs an opening and a closing quotation mark.'),
    rw("Python runs your program's lines in a random order", ['One at a time, from top to bottom', 'In a random order each time', 'From the bottom to the top', 'All at the same moment'], 'Python reads your program from the first line to the last (loops and functions change the path, but never at random).', { prompt: "In what order does Python run your program's lines?" }),
  ],
  'Variables and User Input': [
    rw('What symbol do you use to store a value in a variable', ['`=`', '`==`', '`:`', '`->`'], 'One equals sign assigns a value to a name. Two equals signs compare values.'),
    rw('What does `input()` always return', ['Text (a string)', 'A whole number', 'A decimal number', 'True or False'], 'Even if the player types `7`, `input()` gives you the text "7".', { prompt: 'No matter what the player types, what kind of value does `input()` return?' }),
    rw('Why should a variable be named `age` instead of `x`', ['A clear name describes what the variable stores, so the code is easier to read and debug', 'Python only accepts names that are real words', 'Short names make the program run slower', 'A variable named `x` cannot store numbers'], 'Good names make a program easier to understand — for you and for anyone else.'),
    rw('What happens if you spell a variable name differently in two places', ['Python treats them as two different variables, and the misspelled one does not exist — causing a `NameError`', 'Python corrects the spelling automatically', 'Python uses the first spelling for both', 'Python prints a warning but works normally'], 'Python matches names exactly, letter for letter.'),
    rw("quotes belong around a variable's name when you print it", ['`name`', 'Ava', '"Ava"', 'An error'], 'Quotation marks turn `name` into plain text. To show the value stored in the variable, write `print(name)` without quotes.', { prompt: 'If the variable `name` stores "Ava", what does `print("name")` display?' }),
  ],
  'Printing and String Formatting': [
    rw('What letter goes right before the opening quote of an f-string', ['`f`', '`s`', '`p`', '`i`'], 'The `f` stands for "formatted". It lets you put variables inside the text.'),
    rw('What do curly braces `{ }` do inside an f-string', ['They are replaced by the value of the variable or expression inside them', 'They create a list', 'They turn the line into a comment', 'They make the text bold'], 'For example `f"Hello, {name}!"` shows the value stored in `name`.'),
    rw('Why do we need `int()` after using `input()` for a number', ['`input()` always returns text, even when you type a number, and Python cannot do math on text without converting it first', '`int()` makes the number print faster', '`input()` only accepts whole numbers', '`int()` checks that the player typed a positive number'], '`int(input("Age: "))` turns the typed text into a whole number you can calculate with.'),
    rw('What error appears if you try to add a string and an integer directly', ['A `TypeError`', 'A `SyntaxError`', 'A `NameError`', 'A `ZeroDivisionError`'], 'Python will not guess how to add text and a number. Convert one of them first.'),
    rw("Can you do math directly inside an f-string's curly braces", ['Yes — Python calculates it before inserting the result into the string', 'No — braces can only hold one variable name', 'Only addition works', 'Only inside a loop'], 'For example `f"{3 * 4} apples"` shows `12 apples`.'),
  ],
  'If/Else Decisions': [
    rw('What symbol compares two values for equality', ['`==`', '`=`', '`!=`', '`=>`'], 'Two equals signs ask "are these equal?". One equals sign stores a value.'),
    rw('What keyword lets you check a third (or fourth) possibility', ['`elif`', '`else if`', '`elseif`', '`otherwise`'], '`elif` is short for "else if": it checks another condition when the earlier ones were false.'),
    rw('What two things must every `if`/`elif`/`else` line have', ['A condition and a colon `:` at the end of the line', 'A condition and a semicolon `;` at the end of the line', 'A colon at the start and the condition in curly braces', 'Only the keyword — no condition'], 'Every `if` and `elif` line needs a condition and ends with a colon (`else` needs just the colon).', { prompt: 'What must every `if` and `elif` line have?' }),
    rw('What does `and` require for a combined condition to be `True`', ['Both conditions must be `True`', 'At least one condition must be `True`', 'Both conditions must be `False`', 'Neither condition may be `True`'], 'With `and`, one false side makes the whole condition false.'),
    rw("Why is a final `else` useful even when you think you've covered every case", ['It safely catches any unexpected input, instead of the program silently doing nothing', 'It makes the program run faster', 'Python requires every `if` to have an `else`', 'It repeats the first condition'], 'Players do unexpected things. `else` gives your program a sensible reply anyway.'),
  ],
  'While Loops and For Loops': [
    rw("What's the difference between a `for` loop and a `while` loop", ['A `for` loop repeats a set number of times (or once per item); a `while` loop repeats until its condition becomes false', 'A `while` loop repeats a set number of times; a `for` loop repeats forever', 'They are exactly the same', 'A `for` loop can only count backwards'], 'Use `for` when you know how many times; use `while` when you repeat until something happens.'),
    rw('What does `range(5)` actually produce', ['The numbers 0, 1, 2, 3, 4 (five numbers in total)', 'The numbers 1, 2, 3, 4, 5', 'The numbers 0 to 5, including 5', 'Just the number 5'], '`range(5)` starts at 0 and stops before 5.'),
    rw('What causes an infinite loop', ['A condition that never becomes `False`, so the loop never stops', 'A loop with too few lines inside it', 'A loop that uses `range()`', 'A loop that is indented'], 'If nothing changes the condition, a `while` loop keeps going forever.'),
    rw('What must happen inside a `while` loop for it to eventually stop', ['Something inside the loop must change the condition being checked', 'The loop must print something', 'The loop must contain an `if`', 'The loop must call `range()`'], 'For example, adding 1 to a counter each time round.'),
    rw('code indented inside a loop runs once per pass through the loop', ['Once on every pass through the loop', 'Only once, on the first pass', 'Only on the last pass', 'Never — indented code is skipped'], 'The indented lines are the loop body. They run again for each pass.', { prompt: 'How often does the indented code inside a loop run?' }),
  ],
  'Lists and Simple Data': [
    rw('What index number does the first item in a list have', ['`0`', '`1`', '`-1`', '`first`'], 'Python counts positions from 0, so `words[0]` is the first item.'),
    rw('What module do you need to import to use `random.choice()`', ['The `random` module', 'The `math` module', 'The `choice` module', 'The `time` module'], '`import random` makes `random.choice()` available.'),
    rw('What does `len(words)` return', ['The number of items in the list', 'The last item in the list', 'The first item in the list', 'The total number of letters in all the words'], '`len()` counts items, so a list of 5 words has a length of 5.'),
    rw("What error happens if you access an index that doesn't exist", ['An `IndexError`', 'A `KeyError`', 'A `NameError`', 'A `ValueError`'], 'A list of 3 items has indexes 0, 1 and 2, so `words[3]` raises an `IndexError`.'),
    rw('`random.choice()` always picks the same item every time you run the program', ['It picks a random item from the list, so it can pick a different one each time', 'It always picks the first item', 'It always picks the same item', 'It picks the longest item'], 'That is why the word-guessing game can use a different word each time you play.', { prompt: 'What does `random.choice(words)` do each time the program runs?' }),
  ],
  'Randomness and Finishing Your Game': [
    rw('What does `.lower()` do to a string', ['It converts all the letters in the string to lowercase', 'It converts all the letters to uppercase', 'It removes the spaces from the string', 'It counts the letters in the string'], 'Lowercasing a guess lets "Python" and "python" match.'),
    rw('What is a Boolean flag used for', ['To track whether something (like winning) has happened, using `True` and `False`', "To store the player's name", 'To count how many guesses are left', 'To make the program faster'], 'For example `won = False` becomes `True` when the player guesses the word.'),
    rw('Why does the `while` loop check both `guess_count < attempts` and `not won`', ['So the loop stops as soon as either the player runs out of attempts or wins — whichever comes first', 'So the loop runs twice as many times', 'Because Python requires two conditions in every loop', 'So the player can never win'], 'Joining the two checks with `and` keeps the loop going only while both are true.'),
    rw('What would happen if `guess_count` were never increased inside the loop', ['The loop would never end, because its condition would always stay true (an infinite loop)', 'The game would end after one guess', 'Python would raise a `NameError`', 'The player would win automatically'], 'Something inside the loop has to move it closer to stopping.'),
    rw('Where should `won = False` be placed', ['Before the loop, so it starts as `False` every time the game begins', 'Inside the loop, so it resets on every guess', 'After the loop, once the game has ended', 'Anywhere — the position makes no difference'], 'Inside the loop it would be reset to `False` on every guess, wiping out a win.', { prompt: 'Where should `won = False` be placed: before the loop or inside it?' }),
  ],
  'Your Python Portfolio — Polish and Present': [
    rw('What symbol starts a comment in Python', ['`#`', '`//`', '`--`', '`/*`'], 'Python ignores everything after a `#` on that line.'),
    rw('What do all three of your projects have in common', ['They all use variables, f-strings, conditionals and loops — the same core building blocks in different combinations', 'They all draw graphics in a window', 'They all connect to the internet', 'They all use the Pygame library'], 'The three projects are text programs built from the same core ideas.'),
    rw('What pattern does a menu reuse from lesson 4', ['The `if`/`elif`/`else` decision-making pattern', 'The f-string pattern', 'The `random.choice()` pattern', 'The `range()` pattern'], 'A menu checks the player\'s choice with `if`, `elif` and `else`.', { prompt: 'Which pattern from Lesson 4 does a menu reuse?' }),
    rw('Why is specific feedback more useful than "is it good?"', ['Specific feedback points to exactly what to improve, while a vague answer gives you nothing to act on', 'Specific feedback is always kinder', 'Vague feedback takes longer to give', 'Specific feedback is only for teachers'], 'Ask pointed questions such as "Was the menu clear?" to get something you can change.'),
    rw('What should you do before considering a project finished', ['Test every option and path yourself, and ideally have someone else try it too', 'Delete all the comments', 'Run it once and hope it works', 'Add as many features as you can'], 'Other people use a program in ways you did not plan for.'),
  ],
});
