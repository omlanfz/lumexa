// FILE PATH: server/src/assessments/bank/course-tests/machine-learning-projects.ts
//
// Data Scientist Path → "Machine Learning Projects" (8 lessons, 3 projects:
// House Price Predictor, Customer Churn Predictor, Movie Recommendation Engine).
// Topics: 1 how ML works · 2 regression vs classification · 3 train/test splits
// & evaluation · 4 linear regression from scratch · 5 decision trees & random
// forests · 6 feature engineering · 7 model tuning · 8 serving a model as an API.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

const SKLEARN = { requires: ['sklearn'] };
const PANDAS = { requires: ['pandas'] };

export const machineLearningProjects = bank({
  id: 'course-test/machine-learning-projects',
  title: 'Machine Learning Projects — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · How machine learning works ───────────────────────────────
    mcq(
      1,
      'Which description matches the machine learning training loop?',
      'Guess, measure how wrong the guess was, adjust the internal settings a little, and repeat',
      [
        'Write the rules by hand, then test them on a few examples',
        'Look up the answer in a table of past examples',
        'Run the program once and save its output',
      ],
      'After seeing thousands of examples, the tiny nudges add up and the model has effectively discovered the rules on its own.',
    ),
    mcq(
      1,
      'To predict what a used bicycle will sell for, which part of the data is the label?',
      'The price it actually sold for',
      ['Its tyre wear', 'Its brand', 'The local demand'],
      'The label (target) is the answer the model learns to predict; brand, tyre wear and demand are features.',
    ),
    mcq(
      1,
      'Why do we measure a model on data it has never seen?',
      'A model can look great on data it memorized, so only unseen data shows how it will do on new cases',
      [
        'Unseen data is always easier to predict',
        'The model cannot read data it has seen before',
        'It makes the model train faster',
      ],
      'Scoring on the training data is like grading a student on the exact quiz whose answer key they were given.',
    ),
    mcq(
      1,
      'In machine learning, what is the "model"?',
      'A flexible mathematical recipe that turns features into a prediction and adjusts itself during training',
      [
        'The table of examples it learns from',
        'The list of correct answers',
        'The chart used to present the results',
      ],
      'The dataset holds the examples; the model is the structure that learns the pattern from them.',
    ),

    // ── Lesson 2 · Regression vs classification ─────────────────────────────
    mcq(
      2,
      'Which of these tasks is a classification problem?',
      'Deciding whether a customer will churn or stay',
      [
        "Predicting tomorrow's temperature in degrees",
        'Predicting a house price in dollars',
        'Predicting a delivery time in minutes',
      ],
      'Classification chooses between a small, fixed set of labels. The other three predict a number that can take almost any value in a range, which is regression.',
    ),
    mcq(
      2,
      "What is true of scikit-learn's `LogisticRegression`?",
      'It is a classification algorithm, despite having "regression" in its name',
      [
        'It predicts continuous numbers such as prices',
        'It is used only for grouping unlabelled data',
        'It cannot produce probabilities',
      ],
      'It computes a number, squashes it into a probability between 0 and 1, and picks the more likely category. The name is historical.',
    ),
    mcq(
      2,
      'What does `predict_proba()` give you that `predict()` does not?',
      'The estimated probability of every possible category',
      [
        'The training error of the model',
        'A faster prediction',
        'The names of the features',
      ],
      'A classifier can say how confident it is in each category, which is often more useful than a single predicted label.',
    ),
    codeOut(
      2,
      'python',
      `from sklearn.metrics import accuracy_score

actual = ["cat", "dog", "dog", "cat", "dog"]
predicted = ["cat", "dog", "cat", "cat", "dog"]
print(accuracy_score(actual, predicted))`,
      '0.8',
      ['0.2', '0.6', '4'],
      'Four of the five predictions match exactly, so the accuracy is 4 / 5 = 0.8.',
      'What is printed when this code runs?',
      SKLEARN,
    ),

    // ── Lesson 3 · Train/test splits and evaluation ─────────────────────────
    codeOut(
      3,
      'python',
      `from sklearn.metrics import mean_absolute_error, mean_squared_error

actual = [100, 200, 300, 400]
predicted = [110, 190, 330, 380]
print(mean_absolute_error(actual, predicted), mean_squared_error(actual, predicted))`,
      '17.5 375.0',
      ['17.5 17.5', '375.0 17.5', '70 1500'],
      'The errors are 10, 10, 30 and 20. MAE is their average size: 70 / 4 = 17.5. MSE squares them first (100 + 100 + 900 + 400 = 1500) and then averages: 375.0.',
      'What is printed when this code runs?',
      SKLEARN,
    ),
    mcq(
      3,
      "A model's MSE is 400 (in dollars squared). What is its RMSE, and why is it useful to report?",
      '20 dollars — the square root brings the error back into dollars, which is easier to explain',
      [
        '200 dollars — MSE divided by 2',
        '160,000 dollars — MSE multiplied by itself',
        '400 dollars — RMSE is always equal to MSE',
      ],
      'RMSE = √MSE = √400 = 20. Because it is in the label\'s own units, you can say "our predictions are off by about $20".',
    ),
    mcq(
      3,
      'Why use cross-validation instead of a single train/test split?',
      'One split can be luckier or unluckier than average; averaging across several splits gives a more trustworthy estimate',
      [
        'It makes the model train on the test data',
        'It removes the need to hold out any data',
        'It guarantees a higher score',
      ],
      'In the lesson, 5-fold R² scores varied from roughly 0.52 to 0.69, which is exactly the variation a single split hides.',
    ),
    mcq(
      3,
      'What does `stratify` do when splitting data for classification?',
      'It keeps roughly the same proportion of each class in the training and test sets',
      [
        'It shuffles the data twice',
        'It removes the smallest class',
        'It converts the labels to numbers',
      ],
      'This matters most when the classes are imbalanced, so the rare class is still represented in the test set.',
    ),

    // ── Lesson 4 · Linear regression from scratch ──────────────────────────
    mcq(
      4,
      'What does the cost function (Mean Squared Error) measure?',
      'How wrong the current line is, averaged over all the training examples',
      [
        'How many features the model has',
        'How long the training takes',
        'How steep the line is',
      ],
      "Each example's error is squared (so errors cannot cancel, and big misses count extra) and averaged. A perfect line would have a cost of zero.",
    ),
    mcq(
      4,
      'In the foggy-hillside picture of gradient descent, what does taking a small step downhill correspond to?',
      'Nudging the slope and intercept in the direction that reduces the cost',
      [
        'Choosing a new dataset',
        'Randomly picking a new line',
        'Raising the learning rate to its maximum',
      ],
      'Gradient descent repeats small adjustments in the direction that lowers the cost until it settles near the valley floor — the best line.',
    ),
    codeOut(
      4,
      'python',
      `sizes = [1, 2, 3, 4]
prices = [3, 5, 7, 9]
slope, intercept = 2.0, 0.0
total = 0
for i in range(4):
    prediction = slope * sizes[i] + intercept
    total += (prediction - prices[i]) ** 2
print(total / 4)`,
      '1.0',
      ['0.0', '4.0', '2.0'],
      'The line predicts 2, 4, 6 and 8 while the real prices are 3, 5, 7 and 9, so every error is −1. Each squared error is 1, and the average is 1.0. (The intercept of 1 would make this a perfect line with cost 0.)',
      'This code measures the cost of one candidate line. What does it print?',
    ),
    mcq(
      4,
      'Why are features normalized before running gradient descent on real data?',
      'Features on very different scales can make the steps unstable',
      [
        'Normalizing removes the need for a learning rate',
        'Gradient descent only works on text',
        'It turns a regression problem into a classification problem',
      ],
      'Without normalization the cost can wobble or explode. Subtracting the mean and dividing by the standard deviation puts every feature on a similar scale.',
    ),

    // ── Lesson 5 · Decision trees and random forests ────────────────────────
    mcq(
      5,
      'In a decision tree, what is a "leaf"?',
      'An endpoint that holds the final prediction',
      [
        'A question the tree asks about a feature',
        'The first node at the top of the tree',
        'A copy of the training data',
      ],
      'Each question is a node; a leaf is where an example ends up and the answer is read off.',
    ),
    mcq(
      5,
      'Which setting limits how deep a decision tree can grow, to reduce overfitting?',
      '`max_depth`',
      ['`n_estimators`', '`random_state`', '`test_size`'],
      'max_depth (and min_samples_split) stop a tree from creating questions so specific that it memorizes the training set.',
    ),
    mcq(
      5,
      'How does a random forest make a regression prediction?',
      'It averages the predictions of many trees, each trained on a random subset of the data and features',
      [
        'It uses only the single deepest tree',
        'It uses the first tree it trained',
        'It multiplies the predictions of all the trees together',
      ],
      'This "wisdom of crowds" approach cancels out the quirks of individual trees. (For classification the trees vote.)',
    ),
    mcq(
      5,
      'What do `feature_importances_` tell you about a trained random forest?',
      'How much each feature contributed to its decisions; the values add up to 1.0',
      [
        'How many rows each feature has missing',
        'Which features are categorical',
        'The accuracy on the test set',
      ],
      'In the lesson, median_income had by far the highest importance (about 0.52).',
    ),

    // ── Lesson 6 · Feature engineering ──────────────────────────────────────
    mcq(
      6,
      'Dividing `total_rooms` by `households` creates a new feature. What kind of feature is it, and why can it help?',
      'A ratio feature showing the typical house size in a district — more informative than either raw count alone',
      [
        'A categorical feature that replaces both columns',
        'A label that tells the model the right answer',
        'A duplicate of total_rooms',
      ],
      'A district with 10,000 rooms could be dense small apartments or a few huge houses; rooms per household captures the real-world difference.',
    ),
    mcq(
      6,
      'Why is encoding NEAR BAY = 1, INLAND = 2, ISLAND = 3 a mistake?',
      'It falsely implies an order and a size relationship between categories that have none',
      [
        'Models cannot read numbers that start at 1',
        'It makes the dataset too large',
        'Text is always better for a model than numbers',
      ],
      'One-hot encoding gives each category its own 0/1 column, so no category looks "bigger" than another.',
    ),
    codeOut(
      6,
      'python',
      `import pandas as pd

df = pd.DataFrame({"ocean": ["NEAR BAY", "INLAND", "NEAR BAY", "ISLAND"]})
print(pd.get_dummies(df["ocean"]).shape)`,
      '(4, 3)',
      ['(4, 1)', '(3, 4)', '(3, 3)'],
      'get_dummies makes one 0/1 column per category (NEAR BAY, INLAND, ISLAND) for each of the four rows: 4 rows and 3 columns.',
      'What is printed when this code runs?',
      PANDAS,
    ),
    mcq(
      6,
      'What should you watch for when engineering a ratio feature?',
      'The column you divide by might contain zeros, causing errors or infinite values',
      [
        'Ratios can only be made from text columns',
        'A ratio feature must always be rounded to a whole number',
        'You can only create one ratio per dataset',
      ],
      'Handle zero denominators deliberately — and, as always, check whether the new feature actually improves the test score.',
    ),

    // ── Lesson 7 · Model tuning ─────────────────────────────────────────────
    mcq(
      7,
      'Which of these is a hyperparameter?',
      'The `max_depth` you choose for a decision tree before training',
      [
        'The slope that linear regression learns',
        'The split thresholds a tree learns from the data',
        'The intercept of a fitted line',
      ],
      'Parameters are learned automatically during training; hyperparameters are settings you choose beforehand that control how the model learns.',
    ),
    codeOut(
      7,
      'python',
      `n_estimators = [100, 200, 300]
max_depth = [None, 10, 20]
print(len(n_estimators) * len(max_depth))`,
      '9',
      ['6', '3', '27'],
      'A grid search tries every combination: 3 values × 3 values = 9 models. Add a third hyperparameter with 3 values and it jumps to 27 — the "combinatorial explosion".',
      'A grid search will try every combination of these values. What does this code print?',
    ),
    mcq(
      7,
      'In `RandomizedSearchCV`, what does `n_iter=10` mean?',
      'Only 10 randomly sampled combinations are tried',
      [
        'Every combination is tried 10 times',
        'The model is trained for 10 epochs',
        'The best 10 combinations are averaged',
      ],
      'This keeps the search fast when the full grid (324 combinations in the lesson) would take too long.',
    ),
    mcq(
      7,
      'What is wrong with choosing hyperparameters by repeatedly checking the test set?',
      'The test set then influences the choice, so the reported score is inflated',
      [
        'The test set is too small to tune with',
        'Nothing — the test set exists for tuning',
        'Hyperparameters cannot be checked on any data',
      ],
      'Tune with cross-validation on the training data, and touch the test set only once at the end for an honest final number.',
    ),

    // ── Lesson 8 · Serving a model as an API ────────────────────────────────
    mcq(
      8,
      'Why should the saved model be loaded once when the API starts, rather than inside the `/predict` function?',
      'Loading once keeps it in memory so every request is fast',
      [
        'A model can only be loaded one time ever',
        'Loading inside the function would delete the model file',
        'Flask refuses to load files inside functions',
      ],
      'Loading from disk on every request works but is much slower in real use.',
    ),
    mcq(
      8,
      'Why does the `/predict` endpoint use the POST method?',
      'The caller sends data for the server to process, rather than just asking to view a page',
      [
        'POST requests are always faster than GET',
        'GET requests cannot return JSON',
        'POST encrypts the data automatically',
      ],
      "The house's features travel in the request body as JSON, and the prediction comes back in the response.",
    ),
  ],
  trueFalse: [
    tf(
      1,
      'A trained model understands what its features mean — for example, what "blood pressure" is.',
      false,
      'The model only finds numeric patterns in the data; it has no understanding of the domain.',
    ),
    tf(
      2,
      'Accuracy is a sensible way to score a regression model that predicts house prices.',
      false,
      'Accuracy counts exact matches among a fixed set of categories. For numbers use MAE, MSE, RMSE or R².',
    ),
    tf(
      3,
      'Precision answers the question: of everything the model labelled positive, what fraction really was positive?',
      true,
      'Recall is the companion question: of everything that really was positive, what fraction did the model catch?',
    ),
    tf(
      4,
      'If the learning rate is set far too high, the cost can increase instead of decreasing.',
      true,
      'The steps overshoot the valley. A rate that is far too low looks like nothing is happening.',
    ),
    tf(
      5,
      'A random forest usually has a much smaller gap between its training score and its test score than one deep decision tree.',
      true,
      'Averaging many trees trained on random subsets reduces overfitting.',
    ),
    tf(
      6,
      'Adding more engineered features always improves test performance.',
      false,
      'In the lesson, the engineered version scored essentially the same. You have to measure whether a feature helped.',
    ),
    tf(
      7,
      '`RandomizedSearchCV` is guaranteed to find the single best combination of hyperparameters.',
      false,
      'It samples only some combinations, so it may miss the very best — but it usually finds a very good one quickly.',
    ),
    tf(
      8,
      'Engineered features must be computed inside the API exactly the way they were computed during training.',
      true,
      'A mismatch between training-time and serving-time feature engineering silently gives wrong predictions.',
    ),
    tf(
      8,
      'A request that is missing required fields should get an HTTP 400 response with a clear error message.',
      true,
      'Validating input and returning a descriptive error is better than letting a malformed request crash the server.',
    ),
    tf(
      8,
      'A trained model stays available after the training script ends, even if it was never saved to a file.',
      false,
      'The model lives only in the memory of the running process. Saving it (for example with joblib) lets another program load it later.',
    ),
  ],
});

// Position 3 of the Data Scientist Final Test (Machine Learning Projects is not
// part of the Odyssey, so it has no stage or Odyssey share).
export const machineLearningProjectsExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        2,
        'A classifier predicts one of three flower species and `predict()` returns the codes 0, 1 or 2. What should you do before showing results to a user?',
        'Map the numeric class codes back to the real species names',
        [
          'Round the codes to one decimal place',
          'Multiply the codes by their probabilities',
          'Delete the codes and retrain',
        ],
        'Without the mapping you get confusing output such as "Predicted: 2" instead of "Predicted: virginica".',
      ),
      mcq(
        3,
        'A spam filter flags 20 emails as spam, and 15 of them really are spam. There are 30 spam emails in total. What are its precision and recall for spam?',
        'Precision 0.75 and recall 0.5',
        [
          'Precision 0.5 and recall 0.75',
          'Precision 0.75 and recall 0.75',
          'Precision 0.5 and recall 0.5',
        ],
        'Precision = 15 / 20 = 0.75 (of the flagged emails, how many were spam). Recall = 15 / 30 = 0.5 (of the spam, how many were caught).',
      ),
      mcq(
        3,
        'In a confusion matrix laid out as `[[TN, FP], [FN, TP]]`, which cell holds the false positives?',
        'Row 0, column 1 — predicted positive but actually negative',
        [
          'Row 1, column 0 — predicted negative but actually positive',
          'Row 0, column 0 — predicted negative and actually negative',
          'Row 1, column 1 — predicted positive and actually positive',
        ],
        'A false positive is a wrong "yes". It sits in the top-right cell of the matrix as laid out.',
      ),
      mcq(
        4,
        'How did the lesson check that its from-scratch gradient descent was correct?',
        "By comparing its slope, intercept and predictions with scikit-learn's LinearRegression on the same data",
        [
          'By checking that the cost went up on each step',
          'By running it on the test set only',
          'By comparing it with a random forest',
        ],
        'If the two agree closely, there is no hidden magic in `.fit()` — it is the same idea, optimized.',
      ),
      mcq(
        5,
        'In the lesson, the random forest had a smaller train/test gap than the deep single tree. Why?',
        "Averaging many trees trained on different random subsets cancels out each tree's quirks",
        [
          'A forest never looks at the training data',
          'Each tree in a forest is shallower than one node',
          'A forest is evaluated only on its training data',
        ],
        'Each tree overfits in its own way; their average is steadier and generalizes better.',
      ),
      mcq(
        6,
        'What is missing value imputation?',
        'Filling gaps with a sensible value, such as the median, instead of dropping the whole row',
        [
          'Deleting every column that has a gap',
          'Replacing every missing value with a random number',
          'Marking the missing values as the label',
        ],
        'Imputing keeps rows that would otherwise be lost, as long as the fill value is sensible for the column.',
      ),
      mcq(
        7,
        'Why does a hyperparameter search score each candidate with cross-validation on the training data?',
        'So a combination that got lucky on one split is not chosen, and the test set is kept for one final honest score',
        [
          'So the search can use the test labels',
          'So every candidate gets the same score',
          'So the search finishes faster than a single split',
        ],
        'Cross-validation inside tuning gives a more trustworthy comparison between candidates.',
      ),
      mcq(
        8,
        'What is the `/health` endpoint of a prediction API for?',
        'It lets monitoring tools check, cheaply, that the service is alive',
        [
          'It trains the model again',
          "It returns the model's feature importances",
          'It deletes old predictions',
        ],
        'A lightweight GET endpoint that returns status "ok" is a common real-world pattern.',
      ),
    ],
    trueFalse: [
      tf(
        8,
        'A library such as joblib can save a trained scikit-learn model to a file so another program can load it without retraining.',
        true,
        'This is called serialization, and it is what makes a model usable by a separate server.',
      ),
    ],
  },
};
