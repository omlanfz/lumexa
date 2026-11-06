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
    rw('Comments are executed by the Python interpreter', ['It skips them — they are only notes for human readers', 'It runs them like any other command in the program', 'It prints them on the screen when the program starts', 'It stores them in a variable so the program can reuse them'], 'The interpreter skips comments completely; they exist to explain the code to humans.', { prompt: 'What does the Python interpreter do with a comment (a line that starts with `#`)?' }),
  ],
  'python-ai-foundations/2': [
    rw('What is the difference between `=` and `==` in Python', ['`=` stores a value in a variable; `==` checks whether two values are equal', '`=` checks whether two values are equal; `==` stores a value in a variable', 'They are interchangeable — either one can be used for both jobs', '`=` is only used for numbers and `==` is only used for text'], 'One equals sign assigns (stores) a value; two equals signs compare two values and give True or False.'),
    rw('Name the four basic data types covered today', ['String, integer, float and Boolean', 'String, list, dictionary and loop', 'Integer, function, module and comment', 'Float, tuple, class and variable'], 'Text is a string (`"Aurora-7"`), whole numbers are integers (`87`), decimals are floats (`98.6`) and True/False values are Booleans.', { prompt: 'Which list contains the four basic data types from this lesson?' }),
    rw('What is the difference between `and` and `or`', ['`and` needs both conditions to be True; `or` needs just one of them', '`and` needs just one condition to be True; `or` needs both of them', '`and` and `or` mean the same thing — Python treats them as two spellings', '`and` joins pieces of text together, while `or` adds numbers together'], 'With `and` both sides must be True. With `or` it is enough that one side is True.'),
    rw('If `fuel_level = 45`', ['The `elif` branch runs: 45 is not below 10, but it is below 50', 'The first `if` branch runs: 45 is a low number, so the first test passes', 'The `else` branch runs: 45 is below 100, so every other test is skipped', 'No branch runs: 45 does not exactly match any of the limits in the code'], 'Python checks from the top: 45 is not less than 10, so the first condition fails; 45 is less than 50, so the `elif` branch runs and sets the status to "CAUTION".'),
    rw('What data type is the value `True`', ['Boolean (`bool`)', 'String (`str`)', 'Integer (`int`)', 'Float (`float`)'], '`True` and `False` are Boolean values — the type used for yes/no decisions.'),
  ],
  'python-ai-foundations/3': [
    rw('A variable defined inside a function can be used anywhere', ['Only inside that function', 'Anywhere in the program', 'Only on the line right after the function', 'Only inside a `for` loop'], 'A variable created inside a function is local: it exists only while the function runs, so code outside it cannot use it.', { prompt: 'Where can a variable that is defined inside a function be used?' }),
  ],
  'python-ai-foundations/4': [
    rw('Lists in Python are immutable', ['Lists can be changed after creation: you can add, remove or replace items', 'Lists can never be changed after creation — every edit makes a brand-new list', 'A list can only be changed by deleting it and creating it again', 'Lists can be changed, but only by adding items — items can never be removed'], 'Lists are mutable. (Tuples are the collections that cannot be changed.)', { prompt: 'Which statement about Python lists is true?' }),
  ],
  'python-ai-foundations/5': [
    rw('"Prediction" and "inference" refer to completely unrelated', ['They mean the same step: using a trained model on new data to get an output', 'Prediction means training the model; inference means testing it afterwards', 'Inference means collecting the data; prediction means cleaning it up', 'They are unrelated: prediction is for numbers and inference is for text'], 'Making a prediction and running inference both mean applying a trained model to new input.', { prompt: 'How are "prediction" and "inference" related in machine learning?' }),
  ],
  'python-ai-foundations/6': [
    rw('`.predict()` can only be called on data the model already saw', ['On new data the model has never seen — that is the point of predicting', 'Only on the exact rows it was trained on, because the model memorises them', 'Only on the test labels, because those already hold the right answers', 'On no data at all — calling `.predict()` on its own is what trains the model'], '`.predict()` applies what the model learned to any new input with the same features.', { prompt: 'On which data can you call `.predict()` on a trained model?' }),
  ],
  'python-ai-foundations/7': [
    rw('You should call `.fit()` using the full dataset', ['Before training: fit on the training part and keep the test part unseen', 'After training: fit on everything first, then split it for evaluation', 'Only after the model scores badly, to find out what went wrong', 'Never — one dataset is enough, because the model learns the same either way'], 'The test data must stay hidden while the model learns, otherwise the score no longer shows how it handles new data.', { prompt: 'When should you split the data into training and test sets?' }),
  ],
  'python-ai-foundations/8': [
    rw("It's best practice to hide a model's weaknesses", ['Be honest about the limits so the audience can trust the result', 'Hide them so the audience stays confident in the model\'s results', 'Mention them only if someone in the audience asks about them', 'Replace them with one big accuracy number so nothing looks weak'], 'Honest limits build trust: people can only use a result well if they know where it is weak.', { prompt: "What should you do about a model's weaknesses when you present its results?" }),
  ],
});
