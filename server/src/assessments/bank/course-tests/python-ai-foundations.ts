// FILE PATH: server/src/assessments/bank/course-tests/python-ai-foundations.ts
//
// AI Builder Path → "Python and AI Foundations" (8 lessons, 3 projects: Number
// Prediction Model, Simple Image Classifier, Data Pattern Finder).
// Topics: 1 Python basics & first program · 2 variables, types, logic ·
// 3 loops, functions, modules · 4 lists, dictionaries · 5 machine-learning
// concepts · 6 first prediction model · 7 training/testing/evaluating ·
// 8 presenting results.

import { ModuleExtras, bank, codeOut, mcq, snippet, tf } from '../bank.helpers';

export const pythonAiFoundations = bank({
  id: 'course-test/python-ai-foundations',
  title: 'Python and AI Foundations — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Python basics ────────────────────────────────────────────
    mcq(
      1,
      'What does the Python interpreter do with your program?',
      'It reads the code line by line and runs each instruction as it goes',
      [
        'It turns the whole program into a separate app before anything runs',
        'It rewrites your mistakes so that the program always works',
        'It sends your code to a website to be checked first',
      ],
      'An interpreter executes code as it reads it, which is why you can try a single line and see the result straight away.',
    ),
    codeOut(
      1,
      'python',
      `crew_name = "Cadet"
print("Welcome aboard, " + crew_name + ".")`,
      'Welcome aboard, Cadet.',
      [
        'Welcome aboard, crew_name.',
        'Welcome aboard,Cadet.',
        'Welcome aboard, + Cadet + .',
      ],
      'The + joins (concatenates) the pieces of text, and crew_name is replaced by the value stored in it: "Cadet".',
    ),
    mcq(
      1,
      'A program contains the line `# Check the fuel level before launch`. What does Python do with this line?',
      'It ignores it — it is a comment written for people to read',
      [
        'It prints it on the screen',
        'It runs it as an instruction',
        'It stops with an error because it is not valid code',
      ],
      'Everything after a # is a comment. Comments never change how the program runs; they explain the code to humans.',
    ),
    mcq(
      1,
      `This line fails with "SyntaxError: unterminated string literal":\n\n${snippet('python', 'print("Systems check initiated.)')}\n\nWhat is the bug?`,
      'The closing quotation mark is missing',
      [
        'print must be written with a capital P',
        'A string is not allowed to contain a full stop',
        'The line needs a # at the start',
      ],
      'Text must start and end with matching quotes. Without the closing quote Python cannot tell where the string stops.',
    ),

    // ── Lesson 2 · Variables, data types and logic ──────────────────────────
    codeOut(
      2,
      'python',
      `fuel_level = 92.5
print(type(fuel_level))`,
      "<class 'float'>",
      ["<class 'int'>", "<class 'str'>", "<class 'bool'>"],
      'A number written with a decimal point is a float.',
    ),
    mcq(
      2,
      'Which of these is a valid Python variable name?',
      'fuel_level_2',
      ['2nd_fuel', 'fuel level', 'for'],
      'Names may use letters, digits and underscores, but cannot start with a digit, contain spaces or be a reserved keyword such as `for`.',
    ),
    codeOut(
      2,
      'python',
      `fuel_level = 45
if fuel_level < 10:
    status = "CRITICAL"
elif fuel_level < 50:
    status = "CAUTION"
else:
    status = "NOMINAL"
print(status)`,
      'CAUTION',
      ['CRITICAL', 'NOMINAL', 'CAUTION NOMINAL'],
      'Python checks the conditions from top to bottom and stops at the first one that is True: 45 is not below 10, but it is below 50.',
    ),
    codeOut(
      2,
      'python',
      `oxygen_ok = True
fuel_ok = False
print(oxygen_ok and fuel_ok)
print(oxygen_ok or fuel_ok)`,
      'False\nTrue',
      ['True\nTrue', 'False\nFalse', 'True\nFalse'],
      '`and` is True only when both sides are True; `or` is True when at least one side is True.',
    ),

    // ── Lesson 3 · Loops, functions and modules ─────────────────────────────
    codeOut(
      3,
      'python',
      `for i in range(3):
    print("Check", i)`,
      'Check 0\nCheck 1\nCheck 2',
      [
        'Check 1\nCheck 2\nCheck 3',
        'Check 0\nCheck 1\nCheck 2\nCheck 3',
        'Check 3',
      ],
      'range(3) produces 0, 1 and 2 — it starts at 0 and stops before 3.',
    ),
    mcq(
      3,
      `This program never reaches the last line:\n\n${snippet(
        'python',
        `countdown = 5
while countdown > 0:
    print(countdown)
print("Liftoff!")`,
      )}\n\nWhy?`,
      'countdown never changes inside the loop, so the condition stays True forever',
      [
        'A while loop is not allowed to contain print()',
        'range() must be used in every loop',
        'Liftoff! is printed before the loop starts',
      ],
      'Something inside a while loop must eventually make its condition False — for example `countdown = countdown - 1`. Otherwise it is an infinite loop.',
    ),
    codeOut(
      3,
      'python',
      `def calculate_fuel_needed(distance_km, efficiency_km_per_liter):
    return distance_km / efficiency_km_per_liter

print(calculate_fuel_needed(9000, 12))`,
      '750.0',
      ['750', '108000', 'None'],
      'The function returns 9000 / 12. The / operator always gives a float, so the result is 750.0, not 750.',
    ),
    mcq(
      3,
      `What happens when this program runs?\n\n${snippet(
        'python',
        `def compute_score(hours_studied):
    bonus = 5
    return hours_studied * 10 + bonus

print(compute_score(3))
print(bonus)`,
      )}`,
      'It prints 35, then raises a NameError because `bonus` only exists inside the function',
      [
        'It prints 35 and then 5',
        'It prints 35 and then 0',
        'It raises an error before printing anything',
      ],
      'A variable created inside a function is local: it disappears when the function ends, so the last line cannot find `bonus`.',
    ),

    // ── Lesson 4 · Lists and dictionaries ───────────────────────────────────
    codeOut(
      4,
      'python',
      `crew_names = ["Nova", "Orion", "Vega", "Lyra"]
print(crew_names[-1])
print(crew_names[1:3])`,
      "Lyra\n['Orion', 'Vega']",
      [
        "Lyra\n['Nova', 'Orion']",
        "Nova\n['Orion', 'Vega', 'Lyra']",
        "Lyra\n['Orion', 'Vega', 'Lyra']",
      ],
      'Index -1 is the last item. The slice [1:3] starts at index 1 and stops before index 3.',
    ),
    codeOut(
      4,
      'python',
      `readings = [92.5, 88.0, 85.5]
readings.append(79.0)
readings.remove(88.0)
print(len(readings))`,
      '3',
      ['2', '4', '5'],
      'append adds one item (4 in total), remove takes one out (3 left), and len counts what remains.',
    ),
    codeOut(
      4,
      'python',
      `ship = {"name": "Aurora-7", "fuel": 92.5}
ship["fuel"] = 88.0
ship["destination"] = "Europa"
print(ship["fuel"], len(ship))`,
      '88.0 3',
      ['92.5 2', '88.0 2', '92.5 3'],
      'Assigning to an existing key updates its value; assigning to a new key adds a pair, so the dictionary now has three keys.',
    ),
    codeOut(
      4,
      'python',
      `students = [
    {"name": "Nova", "test_score": 65},
    {"name": "Orion", "test_score": 88},
]
total = 0
for student in students:
    total += student["test_score"]
print(total / len(students))`,
      '76.5',
      ['153', '76', '88'],
      'The loop adds 65 + 88 = 153, and 153 divided by the 2 students is 76.5.',
    ),

    // ── Lesson 5 · Machine-learning concepts ────────────────────────────────
    mcq(
      5,
      'What is the key difference between rule-based programming and machine learning?',
      'In rule-based programming a person writes the rules; in machine learning the computer finds the pattern from many examples',
      [
        'Machine learning programs are written without using any code',
        'Rule-based programs learn from their mistakes, while machine learning programs never change',
        'There is no difference — they are two names for the same thing',
      ],
      'Machine learning flips the usual approach: instead of hand-coding the rules, we give the computer examples of inputs and correct outputs and let it work out the rules.',
    ),
    mcq(
      5,
      "A dataset records hours studied and hours slept for each student, plus each student's test score. If we want to predict test scores, which column is the label?",
      'The test score',
      ['Hours studied', 'Hours slept', 'The trained model'],
      'The label (target) is the answer we want the model to predict. Hours studied and hours slept are the features — the known inputs.',
    ),
    mcq(
      5,
      'Which of these is a regression problem?',
      "Predicting a student's exact test score",
      [
        'Deciding whether an email is spam',
        'Telling which digit (0–9) a picture shows',
        'Sorting photos into cat, dog or bird',
      ],
      'Regression predicts a continuous number. The other three choose between a limited set of categories, which is classification.',
    ),
    mcq(
      5,
      'The Data Pattern Finder project groups similar data points together without ever being told the correct groups. What kind of learning is this?',
      'Unsupervised learning (clustering)',
      [
        'Supervised classification',
        'Supervised regression',
        'Rule-based programming',
      ],
      'With no labels to learn from, the model has to discover the groupings itself — that is unsupervised learning, and grouping is called clustering.',
    ),

    // ── Lesson 6 · A first prediction model ─────────────────────────────────
    mcq(
      6,
      'In `model.fit(X, y)`, what do `X` and `y` hold?',
      '`X` holds the features (inputs) and `y` holds the labels (correct outputs)',
      [
        '`X` holds the labels and `y` holds the features',
        '`X` holds the test data and `y` holds the training data',
        '`X` is the trained model and `y` is its prediction',
      ],
      'By convention a capital X is the table of input features and a lowercase y is the list of correct answers — echoing y = f(X).',
    ),
    mcq(
      6,
      'Why does the lesson call `hours_studied.reshape(-1, 1)` before training?',
      'scikit-learn expects the features as a 2D array: one row per example and one column per feature',
      [
        'It sorts the hours from smallest to largest',
        'It converts the numbers into text labels',
        'It removes the label column from the data',
      ],
      'Even with one feature, X must be 2D — here 10 rows and 1 column. Checking X.shape before training saves a lot of beginner errors.',
    ),
    mcq(
      6,
      'Which call is the learning step that works out the slope and intercept?',
      '`model.fit(X, y)`',
      [
        '`model.predict(new_hours)`',
        '`LinearRegression()`',
        '`model.intercept_`',
      ],
      '`LinearRegression()` only creates an untrained model; `.fit()` studies the examples and learns from them; `.predict()` uses what was learned.',
    ),
    mcq(
      6,
      'A trained model has slope 6.5 and intercept 45. What score does it predict for 4 hours of study?',
      '71',
      ['26', '51.5', '1170'],
      'prediction = intercept + slope × input = 45 + 6.5 × 4 = 71.',
    ),
    codeOut(
      6,
      'python',
      `import numpy as np

hours = np.array([1, 2, 3])
print(hours * 2)`,
      '[2 4 6]',
      ['[1, 2, 3, 1, 2, 3]', '[2 3 4]', '6'],
      'NumPy arrays do vectorized maths: the operation is applied to every element at once. (A plain Python list times 2 would repeat the list.)',
      'What is printed when this code runs?',
      { requires: ['numpy'] },
    ),

    // ── Lesson 7 · Training, testing and evaluating ─────────────────────────
    mcq(
      7,
      'A dataset has 100 examples and you call `train_test_split(X, y, test_size=0.2, random_state=42)`. How many examples go into the test set?',
      '20',
      ['80', '42', '2'],
      'test_size=0.2 reserves 20% of the data for testing: 20 examples. The other 80 are used for training, and 42 is just a seed.',
    ),
    mcq(
      7,
      'A model scores R² = 0.99 on its training data but only R² = 0.55 on the test data. What does this suggest?',
      'It is overfitting: it memorized the training examples instead of learning the general pattern',
      [
        'It is underfitting: it is too simple to learn anything',
        'It is a good fit, because the training score is high',
        'The test set must be wrong, because test scores are always higher',
      ],
      'A large gap between training and test performance is the classic sign of overfitting. Underfitting would show low scores on both.',
    ),
    mcq(
      7,
      'Why does Mean Squared Error square each error before averaging?',
      "So overestimates and underestimates don't cancel each other out, and bigger mistakes count for more",
      [
        'So the result is always a whole number',
        'So that a perfect model gets an MSE of 1',
        'So the result is measured in the same units as the label',
      ],
      'Squaring makes every error positive and punishes large errors more. (The units become squared, which is why RMSE is often easier to explain.)',
    ),

    // ── Lesson 8 · Presenting results ───────────────────────────────────────
    mcq(
      8,
      'Which sentence explains `R² = 0.87` best to a parent who is not technical?',
      'Our model explains about 87% of the differences in test scores based on hours studied',
      [
        'The model gets 87% of its predictions exactly right',
        'The model is wrong 87% of the time',
        '87 students took the test',
      ],
      'R² is the share of the variation in the label that the model explains — it is not a count of exactly-right predictions.',
    ),
    mcq(
      8,
      'A model has MSE = 16 (in points squared). What is the RMSE, and how would you describe it to a non-technical audience?',
      '4 points — on average the predictions are off by roughly 4 points',
      [
        '16 points — every prediction is off by exactly 16',
        '256 points — the error multiplied by itself',
        '0.25 points — the error divided by 4',
      ],
      "RMSE is the square root of MSE, so it is back in the label's own units: √16 = 4. That makes it much easier to explain.",
    ),
  ],
  trueFalse: [
    tf(
      1,
      'Python is popular for AI mainly because it is easy to read and has powerful free libraries such as NumPy, pandas and scikit-learn.',
      true,
      'Readability plus a huge toolbox of ready-made libraries is why Python is the standard language of AI and data science.',
    ),
    tf(
      2,
      'In Python, a single `=` is used to check whether two values are equal.',
      false,
      'A single `=` assigns a value to a variable. Two equals signs, `==`, compare two values.',
    ),
    tf(
      3,
      '`range(5)` produces the numbers 1, 2, 3, 4 and 5.',
      false,
      'range(5) starts at 0 and stops before 5, so it produces 0, 1, 2, 3 and 4.',
    ),
    tf(
      4,
      'A tuple can be changed after it is created, just like a list.',
      false,
      'Lists are mutable, but tuples are immutable — they cannot be modified once created.',
    ),
    tf(
      5,
      'In supervised learning, the training data includes the correct answers (labels) as well as the features.',
      true,
      'The model learns by comparing its predictions with the known correct labels and adjusting to reduce its errors.',
    ),
    tf(
      6,
      '`model.predict()` expects the new input as a 2D array, even when you only want a prediction for a single value.',
      true,
      'That is why the lesson writes `np.array([[4.5]])` — one row with one feature. predict() also returns an array.',
    ),
    tf(
      7,
      'R² = 0.0 means the model does no better than simply predicting the average value every time.',
      true,
      'R² = 1 is a perfect fit and R² = 0 means no improvement over always guessing the mean of the labels.',
    ),
    tf(
      7,
      'It is fine to train the model on the test set as long as you report the results honestly.',
      false,
      'Letting test data influence training is data leakage. It makes the evaluation meaningless because the model has already seen the "exam".',
    ),
    tf(
      8,
      'A good chart has a clear title, labelled axes and — when it shows more than one series — a legend.',
      true,
      'Without a title, axis labels and a legend the viewer cannot tell what the chart means.',
    ),
    tf(
      8,
      "Leaving a model's weaknesses out of a presentation makes it more trustworthy.",
      false,
      'Stating honest limits is a sign of credibility. Hiding weaknesses or overclaiming undermines trust.',
    ),
  ],
});

// Position 1 of the AI Builder Final Test, position 2 of Odyssey Stage 3 and
// position 8 of the Odyssey Final Test.
export const pythonAiFoundationsExtras: ModuleExtras = {
  final: {
    mcq: [
      codeOut(
        2,
        'python',
        `callsign = "Nova"
print(callsign * 2 + "!")`,
        'NovaNova!',
        ['Nova2!', 'Nova!Nova!', 'Nova Nova!'],
        'The * repeats the string twice ("NovaNova") and the + then joins the "!" on the end.',
      ),
      codeOut(
        3,
        'python',
        `for n in range(1, 10):
    if n % 4 == 0:
        break
    print(n)`,
        '1\n2\n3',
        ['1\n2\n3\n4', '4', '1\n2\n3\n5\n6\n7\n9'],
        'break ends the whole loop the moment n reaches 4 (the first multiple of 4), so only 1, 2 and 3 are printed. (`continue` would skip just the multiples of 4 and print 1 2 3 5 6 7 9.)',
      ),
      codeOut(
        4,
        'python',
        `crew = ["Vega", "Nova", "Lyra"]
crew.sort()
print(crew[0])`,
        'Lyra',
        ['Vega', 'Nova', 'None'],
        'sort() reorders the list in place, alphabetically: ["Lyra", "Nova", "Vega"]. Index 0 is now "Lyra". (sort() itself returns None, which is why you never write crew = crew.sort().)',
      ),
      mcq(
        5,
        'In machine learning, what is "inference"?',
        'Using an already-trained model to produce an output for new input it has not seen before',
        [
          'Showing the training examples to the model so it can learn the pattern',
          'Splitting the dataset into a training set and a test set',
          "Measuring how far the model's predictions are from the true values",
        ],
        'Training is the learning step; inference (prediction) is using the finished model on fresh inputs.',
      ),
      mcq(
        6,
        'What does `LinearRegression().fit(X, y)` work out from the training examples?',
        'The slope and intercept of the straight line that makes the total squared error as small as possible',
        [
          'A lookup table that stores every training example so it can be found again',
          'A random line that is then adjusted by hand until the predictions look right',
          'A rule written in advance by the programmer, which fit() simply saves',
        ],
        'fit() uses least squares: it calculates the slope and intercept that minimize the sum of squared distances between the line and the points.',
      ),
      codeOut(
        6,
        'python',
        `import numpy as np

hours = np.array([1, 2, 3, 4, 5, 6, 7])
X = hours.reshape(-1, 1)
print(X.shape)`,
        '(7, 1)',
        ['(1, 7)', '(7,)', '(7, 7)'],
        'reshape(-1, 1) means "work out the number of rows yourself, but use exactly one column" — so 7 values become 7 rows and 1 column.',
        'What is printed when this code runs?',
        { requires: ['numpy'] },
      ),
      mcq(
        7,
        'Which order of steps gives an honest evaluation of a model?',
        'Split the data, train on the training set only, then evaluate on the test set',
        [
          'Train on all of the data, split it afterwards, then evaluate on the training set',
          'Evaluate on the test set, train on the training set, then split the data',
          'Split the data, evaluate on the training set, then train on the test set',
        ],
        'The split must come first and the test set must stay untouched until the end — otherwise information leaks from the test data into training.',
      ),
      codeOut(
        7,
        'python',
        `actual = [10, 20, 30, 40]
predicted = [11, 19, 32, 38]
total = 0
for i in range(4):
    total += (actual[i] - predicted[i]) ** 2
print(total / 4)`,
        '2.5',
        ['0.0', '10', '1.5'],
        'The errors are -1, 1, -2 and 2. Squared they are 1, 1, 4 and 4, which add up to 10; dividing by 4 examples gives an MSE of 2.5. (Without squaring, the errors would cancel to 0.0.)',
        'This code calculates the Mean Squared Error of four predictions. What does it print?',
      ),
      mcq(
        8,
        'In a short presentation about a model, which section should say where the model might be wrong?',
        'The honest limits',
        ['The question', 'The data', 'What is next'],
        'A presentation should include the honest limits of the model — saying so is a mark of credibility, not weakness.',
      ),
    ],
    trueFalse: [
      tf(
        7,
        'Using `random_state=42` in `train_test_split` makes the split reproducible, and any other fixed whole number would work in the same way.',
        true,
        'random_state is only a seed. The number 42 has no special meaning; a fixed seed simply gives the same split every time.',
      ),
      tf(
        4,
        'In a Python dictionary, each value is looked up by its position number, exactly like an item in a list.',
        false,
        'A dictionary stores key-value pairs and values are looked up by key (for example ship["fuel"]). Position numbers belong to lists.',
      ),
    ],
  },
  stage: {
    mcq: [
      codeOut(
        1,
        'python',
        `print("Total:", 5 + 3)`,
        'Total: 8',
        ['Total: 5 + 3', 'Total:8', '8'],
        'The expression 5 + 3 is worked out first, and print() puts a space between its two arguments.',
      ),
      codeOut(
        2,
        'python',
        `print(7 != 7.0)`,
        'False',
        ['True', '7', 'None'],
        'Python treats 7 and 7.0 as equal, so "not equal" is False.',
      ),
      codeOut(
        2,
        'python',
        `print(10 / 5)`,
        '2.0',
        ['2', '5.0', '50'],
        'The / operator always returns a float in Python, even when the division comes out exactly. Use // when you want a whole-number result.',
      ),
      codeOut(
        3,
        'python',
        `total = 0
for n in range(1, 6):
    if n == 3:
        continue
    total += n
print(total)`,
        '12',
        ['15', '3', '10'],
        'continue skips only the rest of that one pass (n = 3), so the loop adds 1 + 2 + 4 + 5 = 12. A break would have stopped the loop altogether and left 3.',
      ),
      codeOut(
        3,
        'python',
        `def greet(name):
    print("Hi", name)

result = greet("Nova")
print(result)`,
        'Hi Nova\nNone',
        ['Hi Nova\nHi Nova', 'Hi Nova\nNova', 'None'],
        'greet() prints its message but has no return statement, so it gives back None — which is what ends up in result.',
      ),
      codeOut(
        4,
        'python',
        `fuel_readings = [92.5, 88.0, 85.5, 79.0, 74.5]
print(fuel_readings[2:])`,
        '[85.5, 79.0, 74.5]',
        ['[92.5, 88.0]', '[88.0, 85.5, 79.0, 74.5]', '[85.5]'],
        'A slice with only a start index runs from that index to the end of the list. Index 2 is the third item, 85.5.',
      ),
      mcq(
        4,
        `A tuple has been created with this line:\n\n${snippet('python', 'location = (34.05, -118.24)')}\n\nWhich of these lines then raises an error?`,
        '`location[0] = 40.0`',
        [
          '`print(location[1])`',
          '`print(len(location))`',
          '`coords = list(location)`',
        ],
        'Tuples are immutable — an item cannot be reassigned after creation. Reading an item, taking its length or converting it to a list are all fine.',
      ),
      mcq(
        5,
        "A dataset lists each house's floor area, its number of bedrooms and its sale price. A model will predict the sale price. Which columns are the features?",
        'Floor area and number of bedrooms',
        ['Sale price only', 'Sale price and floor area', 'All three columns'],
        'Features are the known inputs; the sale price is the label the model learns to predict.',
      ),
      mcq(
        6,
        'A trained model predicts `test_score = 45 + 7 × hours_studied`. What does the 45 tell you?',
        'The predicted score for a student who studied for 0 hours (the intercept)',
        [
          'The number of extra points gained for each additional hour of study',
          'The highest score any student can reach',
          'The average error the model makes on the test set',
        ],
        'The intercept is the prediction when the input is zero. The 7 is the slope: points gained per extra hour.',
      ),
      mcq(
        7,
        'How many arrays does `train_test_split(X, y, test_size=0.2)` return?',
        'Four: X_train, X_test, y_train and y_test',
        [
          'Two: the training set and the test set',
          'One: a single array holding all of the data',
          'Three: the features, the labels and the predictions',
        ],
        'The function splits both X and y, so it returns four arrays (it comes back as a tuple of four values).',
      ),
    ],
    trueFalse: [
      tf(
        2,
        'In Python, the indentation of a line is required syntax: it decides which block of code the line belongs to.',
        true,
        'Unlike many languages that use curly braces, Python uses indentation (typically 4 spaces) to define blocks.',
      ),
      tf(
        7,
        'If a model scores perfectly on the data it was trained on, it is guaranteed to perform well on brand-new data.',
        false,
        'A model can score perfectly simply by memorizing the training examples (overfitting). Only performance on unseen test data shows whether it generalizes.',
      ),
      tf(
        4,
        'A Python list can hold values of different types at the same time, such as numbers and strings.',
        true,
        'Lists can hold any data types, even a mix, for example [92.5, "Nova", True].',
      ),
    ],
  },
  odyssey: {
    mcq: [
      codeOut(
        2,
        'python',
        `print(7 / 2, 7 // 2)`,
        '3.5 3',
        ['3 3.5', '3.5 3.5', '3.0 3'],
        '/ is ordinary division and gives 3.5; // is floor division and drops the fraction, giving 3.',
      ),
      codeOut(
        4,
        'python',
        `scores = {"Nova": 65, "Orion": 88}
print(scores["Orion"] - scores["Nova"])`,
        '23',
        ['153', '-23', '88'],
        'The dictionary is looked up by key: 88 - 65 = 23.',
      ),
      mcq(
        5,
        'Each email in a dataset has been marked "spam" or "not spam" by a person. A model learns to predict that mark from the words in the email. What is the label?',
        'The "spam" / "not spam" mark',
        [
          'The words in the email',
          'The trained model',
          'The length of the email',
        ],
        'The label is the correct answer the model learns to predict; the words are the features.',
      ),
    ],
    trueFalse: [
      tf(
        5,
        'Unsupervised learning needs a dataset in which every example is already labelled with the correct answer.',
        false,
        'Unsupervised learning works with features only — for example, clustering groups similar data points without any labels.',
      ),
    ],
  },
};
