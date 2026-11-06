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
    rw('What punctuation marks must wrap around a string', ['Quotation marks (`" "` or `\' \'`) around the text', 'Round brackets `( )` around the text', 'Square brackets `[ ]` around the text', 'Curly braces `{ }` around the text'], 'Quotation marks tell Python where the text starts and where it ends.'),
    rw('What does Python call a line that starts with `#`', ['A comment — Python ignores it completely', 'A command that prints text', 'A syntax error that stops the program', 'A variable that stores a number'], 'Comments are notes for the people reading the code.'),
    rw('What happens if you forget a closing quotation mark', ['A syntax error, because Python can\'t tell where the string ends', 'Python adds the missing quote itself and carries on', 'Python prints the text, but leaves off the missing quote', 'Nothing happens — the program runs just as it did before'], 'A string needs an opening and a closing quotation mark.'),
    rw("Python runs your program's lines in a random order", ['One at a time, from top to bottom', 'In a random order each time', 'From the bottom to the top', 'All at the same moment'], 'Python reads your program from the first line to the last (loops and functions change the path, but never at random).', { prompt: "In what order does Python run your program's lines?" }),
  ],
  'Variables and User Input': [
    rw('What symbol do you use to store a value in a variable', ['`=`', '`==`', '`:`', '`->`'], 'One equals sign assigns a value to a name. Two equals signs compare values.'),
    rw('What does `input()` always return', ['Text (a string)', 'A whole number', 'A decimal number', 'True or False'], 'Even if the player types `7`, `input()` gives you the text "7".', { prompt: 'No matter what the player types, what kind of value does `input()` return?' }),
    rw('Why should a variable be named `age` instead of `x`', ['A clear name says what it stores, so code is easier to read and debug', 'Python only accepts variable names that are real English words', 'Short names such as `x` make the program run much more slowly', 'A variable named `x` cannot be used to store a number'], 'Good names make a program easier to understand — for you and for anyone else.'),
    rw('What happens if you spell a variable name differently in two places', ['Python sees two different names, so the misspelt one gives a `NameError`', 'Python corrects the spelling automatically and carries on running', 'Python uses the first spelling that it saw in both places', 'Python prints a small warning, but the program works as normal'], 'Python matches names exactly, letter for letter.'),
    rw("quotes belong around a variable's name when you print it", ['`name`', 'Ava', '"Ava"', 'An error'], 'Quotation marks turn `name` into plain text. To show the value stored in the variable, write `print(name)` without quotes.', { prompt: 'If the variable `name` stores "Ava", what does `print("name")` display?' }),
  ],
  'Printing and String Formatting': [
    rw('What letter goes right before the opening quote of an f-string', ['`f`', '`s`', '`p`', '`i`'], 'The `f` stands for "formatted". It lets you put variables inside the text.'),
    rw('What do curly braces `{ }` do inside an f-string', ['They are replaced by the value of what is inside them', 'They create a list that holds the text inside them', 'They turn the whole line into a comment that Python skips', 'They make the text inside them appear in bold type'], 'For example `f"Hello, {name}!"` shows the value stored in `name`.'),
    rw('Why do we need `int()` after using `input()` for a number', ['`input()` returns text, and maths can\'t be done on text until it\'s converted', '`int()` makes the number print faster and more neatly on screen', '`input()` only ever accepts whole numbers, so `int()` just confirms it', '`int()` checks that the number the player typed is positive'], '`int(input("Age: "))` turns the typed text into a whole number you can calculate with.'),
    rw('What error appears if you try to add a string and an integer directly', ['A `TypeError`', 'A `SyntaxError`', 'A `NameError`', 'A `ZeroDivisionError`'], 'Python will not guess how to add text and a number. Convert one of them first.'),
    rw("Can you do math directly inside an f-string's curly braces", ['Yes — Python calculates it before putting the result into the text', 'No — braces can only ever hold a single variable name', 'Only addition works; other sums need to be done first', 'Only when the f-string is used inside a loop'], 'For example `f"{3 * 4} apples"` shows `12 apples`.'),
  ],
  'If/Else Decisions': [
    rw('What symbol compares two values for equality', ['`==`', '`=`', '`!=`', '`=>`'], 'Two equals signs ask "are these equal?". One equals sign stores a value.'),
    rw('What keyword lets you check a third (or fourth) possibility', ['`elif`', '`else if`', '`elseif`', '`otherwise`'], '`elif` is short for "else if": it checks another condition when the earlier ones were false.'),
    rw('What two things must every `if`/`elif`/`else` line have', ['A condition and a colon `:` at the end of the line', 'A condition and a semicolon `;` at the end of the line', 'A colon at the start and the condition in curly braces', 'Only the keyword — no condition'], 'Every `if` and `elif` line needs a condition and ends with a colon (`else` needs just the colon).', { prompt: 'What must every `if` and `elif` line have?' }),
    rw('What does `and` require for a combined condition to be `True`', ['Both conditions must be `True`', 'At least one condition must be `True`', 'Both conditions must be `False`', 'Neither condition may be `True`'], 'With `and`, one false side makes the whole condition false.'),
    rw("Why is a final `else` useful even when you think you've covered every case", ['It catches unexpected input, rather than the program doing nothing', 'It makes the whole program run a little faster', 'Python requires every `if` statement to end with an `else`', 'It repeats the first condition to double-check it'], 'Players do unexpected things. `else` gives your program a sensible reply anyway.'),
  ],
  'While Loops and For Loops': [
    rw("What's the difference between a `for` loop and a `while` loop", ['`for` repeats a set number of times; `while` repeats until its condition is false', '`while` repeats a set number of times; `for` repeats until you press stop', 'They are the same, but `while` is the newer way of writing it', 'A `for` loop can only count backwards, from a number down to 0'], 'Use `for` when you know how many times; use `while` when you repeat until something happens.'),
    rw('What does `range(5)` actually produce', ['The numbers 0, 1, 2, 3, 4 (five numbers in total)', 'The numbers 1, 2, 3, 4, 5 (five numbers in total)', 'The numbers 0, 1, 2, 3, 4, 5 (six numbers in total)', 'Just the single number 5, repeated five times'], '`range(5)` starts at 0 and stops before 5.'),
    rw('What causes an infinite loop', ['A condition that never becomes `False`, so it never stops', 'A loop that has too few lines inside it to finish', 'A loop that uses `range()` instead of a condition', 'A loop whose body is indented by four spaces'], 'If nothing changes the condition, a `while` loop keeps going forever.'),
    rw('What must happen inside a `while` loop for it to eventually stop', ['Something inside the loop must change what the condition checks', 'The loop must print something each time it runs', 'The loop must contain an `if` statement inside it', 'The loop must call `range()` before it starts'], 'For example, adding 1 to a counter each time round.'),
    rw('code indented inside a loop runs once per pass through the loop', ['Once on every pass through the loop', 'Only once, on the first pass', 'Only on the last pass', 'Never — indented code is skipped'], 'The indented lines are the loop body. They run again for each pass.', { prompt: 'How often does the indented code inside a loop run?' }),
  ],
  'Lists and Simple Data': [
    rw('What index number does the first item in a list have', ['`0`', '`1`', '`-1`', '`first`'], 'Python counts positions from 0, so `words[0]` is the first item.'),
    rw('What module do you need to import to use `random.choice()`', ['The `random` module', 'The `math` module', 'The `choice` module', 'The `time` module'], '`import random` makes `random.choice()` available.'),
    rw('What does `len(words)` return', ['The number of items in the list', 'The last item in the list', 'The first item in the list', 'The total number of letters in all the words'], '`len()` counts items, so a list of 5 words has a length of 5.'),
    rw("What error happens if you access an index that doesn't exist", ['An `IndexError`', 'A `KeyError`', 'A `NameError`', 'A `ValueError`'], 'A list of 3 items has indexes 0, 1 and 2, so `words[3]` raises an `IndexError`.'),
    rw('`random.choice()` always picks the same item every time you run the program', ['It picks a random item from the list, so it can differ each time', 'It always picks the first item in the list, so the game never varies', 'It picks the longest item in the list every time you run it', 'It picks an item in alphabetical order, one after another'], 'That is why the word-guessing game can use a different word each time you play.', { prompt: 'What does `random.choice(words)` do each time the program runs?' }),
  ],
  'Randomness and Finishing Your Game': [
    rw('What does `.lower()` do to a string', ['It converts all the letters in the string to lowercase', 'It converts all the letters to uppercase', 'It removes all of the spaces from the string', 'It counts how many letters are in the string'], 'Lowercasing a guess lets "Python" and "python" match.'),
    rw('What is a Boolean flag used for', ['To track whether something, like winning, has happened', 'To store the name of the player who is guessing', 'To count how many guesses the player has left', 'To make the program run faster by skipping the loop'], 'For example `won = False` becomes `True` when the player guesses the word.'),
    rw('Why does the `while` loop check both `guess_count < attempts` and `not won`', ['So the loop stops when the player runs out of attempts or wins', 'So the loop runs twice as many times as it would', 'Because Python requires two conditions in every loop', 'So that the player can never actually win the game'], 'Joining the two checks with `and` keeps the loop going only while both are true.'),
    rw('What would happen if `guess_count` were never increased inside the loop', ['The loop would never end, because its condition stays true', 'The game would end after the very first guess', 'Python would raise a `NameError` on the first guess', 'The player would win automatically after ten guesses'], 'Something inside the loop has to move it closer to stopping.'),
    rw('Where should `won = False` be placed', ['Before the loop, so it starts as `False` each game', 'Inside the loop, so it is reset on every guess', 'After the loop, once the game has finished', 'Anywhere at all — the position makes no difference to the game'], 'Inside the loop it would be reset to `False` on every guess, wiping out a win.', { prompt: 'Where should `won = False` be placed: before the loop or inside it?' }),
  ],
  'Your Python Portfolio — Polish and Present': [
    rw('What symbol starts a comment in Python', ['`#`', '`//`', '`--`', '`/*`'], 'Python ignores everything after a `#` on that line.'),
    rw('What do all three of your projects have in common', ['They all use variables, f-strings, conditionals and loops', 'They all draw graphics and animations in a window', 'They all connect to the internet to fetch live data', 'They all use the Pygame library to handle key presses'], 'The three projects are text programs built from the same core ideas.'),
    rw('What pattern does a menu reuse from lesson 4', ['The `if`/`elif`/`else` decision-making pattern', 'The f-string pattern from Lesson 3', 'The `random.choice()` pattern from Lesson 6', 'The `range()` pattern from Lesson 5'], 'A menu checks the player\'s choice with `if`, `elif` and `else`.', { prompt: 'Which pattern from Lesson 4 does a menu reuse?' }),
    rw('Why is specific feedback more useful than "is it good?"', ['Specific feedback tells you exactly what to improve', 'Specific feedback is always kinder than a vague answer', 'Vague feedback takes much longer for a person to give', 'Specific feedback is only ever meant for teachers'], 'Ask pointed questions such as "Was the menu clear?" to get something you can change.'),
    rw('What should you do before considering a project finished', ['Test every option and path yourself, and ideally have someone else try it too', 'Delete all the comments', 'Run it once and hope it works', 'Add as many features as you can'], 'Other people use a program in ways you did not plan for.'),
  ],
});
