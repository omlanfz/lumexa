// FILE PATH: server/src/curriculum/lesson-content/catalog/mcq/ai-builder.ts
//
// Four-option multiple-choice versions of the AI Builder pathway's descriptive,
// true/false and "write your answer" quiz questions (keyed by lineage key). Each
// rewrite is found by the start of the ORIGINAL question's text; the right answer
// comes first (its position is chosen for you). Questions without a rewrite here are
// not lost: they are kept for the teacher as discussion prompts (see quiz-mcq.ts).

import { registerMcqRewrites } from '../../quiz-mcq';
import { rw } from '../helpers';

registerMcqRewrites({
  'python-ai-foundations/1': [
    rw('Comments are executed by the Python interpreter', ['It ignores them — comments are only notes for people reading the code', 'It runs them as Python commands', 'It prints them on the screen', 'It saves them into a variable'], 'The interpreter skips comments completely; they exist to explain the code to humans.', { prompt: 'What does the Python interpreter do with a comment (a line that starts with `#`)?' }),
  ],
  'python-ai-foundations/2': [
    rw('What is the difference between `=` and `==` in Python', ['`=` stores a value in a variable; `==` checks whether two values are equal', '`=` checks whether two values are equal; `==` stores a value in a variable', 'They do exactly the same job', '`==` is used for text and `=` is used for numbers'], 'One equals sign assigns (stores) a value; two equals signs compare two values and give True or False.'),
    rw('Name the four basic data types covered today', ['String, integer, float and Boolean', 'String, list, dictionary and loop', 'Integer, function, module and comment', 'Float, tuple, class and variable'], 'Text is a string (`"Aurora-7"`), whole numbers are integers (`87`), decimals are floats (`98.6`) and True/False values are Booleans.', { prompt: 'Which list contains the four basic data types from this lesson?' }),
    rw('What is the difference between `and` and `or`', ['`and` needs both conditions to be True; `or` needs at least one of them to be True', '`and` needs at least one condition to be True; `or` needs both', '`and` and `or` mean exactly the same thing', '`and` joins text together and `or` joins numbers together'], 'With `and` both sides must be True. With `or` it is enough that one side is True.'),
    rw('If `fuel_level = 45`', ['The `elif fuel_level < 50` branch runs, because 45 is not less than 10 but it is less than 50', 'The first `if fuel_level < 10` branch runs, because 45 is a low number', 'The `else` branch runs, because 45 is less than 100', 'No branch runs, because 45 does not exactly match any limit'], 'Python checks from the top: 45 is not less than 10, so the first condition fails; 45 is less than 50, so the `elif` branch runs and sets the status to "CAUTION".'),
    rw('What data type is the value `True`', ['Boolean (`bool`)', 'String (`str`)', 'Integer (`int`)', 'Float (`float`)'], '`True` and `False` are Boolean values — the type used for yes/no decisions.'),
  ],
  'python-ai-foundations/3': [
    rw('A variable defined inside a function can be used anywhere', ['Only inside that function', 'Anywhere in the program', 'Only on the line right after the function', 'Only inside a `for` loop'], 'A variable created inside a function is local: it exists only while the function runs, so code outside it cannot use it.', { prompt: 'Where can a variable that is defined inside a function be used?' }),
  ],
  'python-ai-foundations/4': [
    rw('Lists in Python are immutable', ['A list can be changed after it is created — you can add, remove or replace items', 'A list can never be changed after it is created', 'A list can only hold numbers', 'A list can hold at most ten items'], 'Lists are mutable. (Tuples are the collections that cannot be changed.)', { prompt: 'Which statement about Python lists is true?' }),
  ],
  'python-ai-foundations/5': [
    rw('"Prediction" and "inference" refer to completely unrelated', ['They describe the same step: using a trained model on new data to produce an output', 'Prediction means training the model; inference means testing it', 'Inference means collecting data; prediction means cleaning it', 'They are completely unrelated processes'], 'Making a prediction and running inference both mean applying a trained model to new input.', { prompt: 'How are "prediction" and "inference" related in machine learning?' }),
  ],
  'python-ai-foundations/6': [
    rw('`.predict()` can only be called on data the model already saw', ['It can be called on new data the model has never seen — that is the point of predicting', 'It can only be called on the exact data the model was trained on', 'It can only be called on the test labels', 'It never needs data: `.predict()` trains the model'], '`.predict()` applies what the model learned to any new input with the same features.', { prompt: 'On which data can you call `.predict()` on a trained model?' }),
  ],
  'python-ai-foundations/7': [
    rw('You should call `.fit()` using the full dataset', ['Before training: fit on the training part and keep the test part unseen', 'After training: fit on everything first, then split it for evaluation', 'Only after the model scores badly', 'Never — one dataset is enough'], 'The test data must stay hidden while the model learns, otherwise the score no longer shows how it handles new data.', { prompt: 'When should you split the data into training and test sets?' }),
  ],
  'python-ai-foundations/8': [
    rw("It's best practice to hide a model's weaknesses", ['Be honest about the limits so the audience can trust the results and use them properly', 'Hide them so the audience stays confident', 'Mention them only if someone asks', 'Replace them with a bigger number'], 'Honest limits build trust: people can only use a result well if they know where it is weak.', { prompt: "What should you do about a model's weaknesses when you present its results?" }),
  ],
});
