# Lumexa Mission Log: Python, Artificial Intelligence & Modern Computing

**Course/Path:** Python, Artificial Intelligence & Modern Computing
**Lesson:** 05 of 08
**Title:** Artificial Intelligence and Machine Learning Fundamentals
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Python

---

## Mission Brief

Spam filters, translation apps, video recommendations and medical image checkers all seem to share one idea: the computer is not told the rules, it **learns** them from examples. That is **machine learning**, the heart of today's artificial intelligence. It is also a topic wrapped in hype, so the first skill of a computer scientist is an honest map: what AI is and is not, how a model learns from data, how to find out whether it really works, and when it fails.

In this lesson you learn the main kinds of machine learning, the vocabulary of **features**, **labels** and **training and test sets**, and the ideas of **overfitting**, **accuracy**, the **confusion matrix**, **precision** and **recall**. You see how a single artificial **neuron** learns, and why one neuron is not enough. You then build a **k-nearest-neighbours classifier from scratch**, train it on one part of a data set, test it on another and report the result honestly. This is a first tour, not a specialist course: the aim is that you understand what the libraries do before you use them.

## Learning Objectives

1. Distinguish AI, machine learning and deep learning, and name the three main kinds of learning with an example of each.
2. Explain the supervised learning pipeline: features, labels, training set, model, prediction and evaluation on a test set.
3. Implement a k-nearest-neighbours classifier from scratch, including distance, voting and min-max scaling.
4. Evaluate a classifier with a baseline, accuracy, the confusion matrix, precision and recall, and recognise overfitting and data leakage.
5. Explain how a neuron and a simple neural network work, and train a perceptron on AND, OR and XOR.
6. Describe the limits and risks of machine learning (biased data, spurious patterns, no understanding, privacy) and the need for human oversight.

## Prerequisites

- Lessons 1 to 4: Python functions, collections, tests and the handling of structured data, including the idea of a train and a test set of rows.
- Distance in the plane and the idea of a straight line, from the mathematics courses.
- The statistics words from Lesson 4: mean, correlation, sample.

## Concept Explanation

### What AI and machine learning are

**Artificial intelligence (AI)** is the field of making computers do tasks that normally need human intelligence: understanding speech, translating, playing games, driving. It includes many techniques. The oldest, **rule-based** (symbolic) AI, writes the knowledge down by hand as rules: *if the temperature is above 38 and there is a cough, suspect flu*. It works in narrow, well-understood areas but cannot cope with tasks for which nobody can write the rules, such as recognising a cat in a photograph. **Machine learning (ML)** takes the opposite route: instead of writing the rules you give the computer many **examples** and let a learning algorithm find the pattern itself. **Deep learning** is the part of machine learning that uses **neural networks** with many layers; it drives most of the recent advances in vision, speech and language, and it needs a lot of data and computing power. Everything that exists today is **narrow AI**: a system trained for one task, which does not understand the world and cannot move to another task by itself. A system that could do any intellectual task is called artificial general intelligence; it does not exist, and experts disagree about whether and when it might.

Machine learning has three main kinds. In **supervised learning** every training example comes with the right answer, the **label**, and the model learns to predict the label of new examples. If the label is a category (pass or fail, spam or not spam) the task is **classification**; if it is a number (tomorrow's temperature) it is **regression**. In **unsupervised learning** there are no labels and the algorithm looks for structure, for example **clustering** customers into groups of similar ones. In **reinforcement learning** an **agent** acts in an environment, receives rewards and penalties, and learns by trial and error which actions pay off, as in game-playing programs and robot control.

### Learning from examples: features, labels and evaluation

A data set for supervised learning is a table. Every row is an **example**; the input columns are the **features** (hours studied, attendance) and one column is the **label** (pass or fail). The learning algorithm builds a **model**, a function from features to a predicted label whose behaviour depends on **parameters** learned from the data. The goal is **generalisation**: to do well on **new** examples, not on the ones it has seen. So the data are split into a **training set**, used to build the model, and a **test set**, kept aside and used to measure how well the model generalises. Testing on the training data would be like marking a student with the very questions that they memorised.

A model that is too simple misses the pattern (**underfitting**). A model that is too flexible also learns the **noise**, the accidents and mistakes of the training data, and then does well on the training set and badly on the test set (**overfitting**). To measure a classifier, **accuracy** (the share of correct answers) is the first number, but it can mislead: if only 1 student in 10 fails, a model that always says "pass" is right 90 per cent of the time and finds no failing student at all. So compare with a **baseline**, the best trivial rule, and look at the **confusion matrix**, the table of true positives (TP), false positives (FP), false negatives (FN) and true negatives (TN). **Precision** = TP / (TP + FP) tells you how many of the flagged cases are real; **recall** = TP / (TP + FN) tells you how many of the real cases were found. Which one matters more depends on the task: a screening test for a serious illness needs high recall, a spam filter that must not delete real mail needs high precision. Two cautions: a **small test set** gives a shaky estimate, and **data leakage**, any way in which information from the test set gets into the training (for example scaling with the limits of all rows, or using a feature that contains the answer), makes the result look better than it is.

### k-nearest neighbours

The easiest classifier to understand is **k-nearest neighbours (k-NN)**. It does no training at all: it keeps the examples. To classify a new point it measures the **distance** to every stored example (for two features the Euclidean distance, the square root of the sum of the squared differences, which `math.dist` computes), takes the **k nearest** ones and lets them **vote**: the most common label wins. Its one setting is **k**. With k = 1 the answer is the label of the single nearest example, so a noisy example decides everything (overfitting); with a very large k the vote smooths away real detail (underfitting). Use an odd k for two classes so that there are no ties.

k-NN has a hidden requirement: the features must be on **comparable scales**. If one feature is attendance (0 to 100) and another is hours (0 to 15), the differences in attendance dominate the distance and the hours are practically ignored. **Min-max scaling** rewrites every feature as (value - minimum) / (maximum - minimum), a number from 0 to 1. The minimum and the maximum must come from the **training set only**, otherwise the test set leaks into the training. k-NN is easy and often good on small data, but every prediction compares with all stored examples, so it gets slow on big data, and it is sensitive to irrelevant features.

### Neurons and neural networks

An artificial **neuron** is a tiny function, loosely inspired by a nerve cell. It multiplies each input by a **weight**, adds the products and a **bias**, and passes the sum through an **activation function**: the **perceptron** uses a step (output 1 if the sum is above 0, else 0), and modern networks use smooth functions such as the sigmoid or ReLU. The weights and the bias are the parameters that learning adjusts. The **perceptron learning rule** is simple: for every training example compute the output; if it is wrong, change each weight by `rate * error * input` and the bias by `rate * error`, where the error is the target minus the output; repeat over the data until a whole pass has no mistakes.

A single neuron can separate two classes only with a **straight line** (a plane in more dimensions). It learns AND and OR, but it can never learn XOR (exclusive or), whose true and false cases cannot be separated by one line; this limit, pointed out in 1969, slowed neural network research for years. The answer is to stack neurons in **layers**: a network with a **hidden layer** can learn XOR, and a **deep** network with many layers can learn very complicated functions. Such networks are trained by **gradient descent**, repeated small changes of all the weights in the direction that reduces the error, and the **backpropagation** algorithm works out how much each weight contributed to the error. Remember what this is: a very large pattern-fitting function, not a thinking mind.

### Limits, bias and responsible use

A model learns whatever patterns the data contain, including the ones that you did not want. If the training data are **biased** (they under-represent a group, or record past unfair decisions) the model reproduces the bias and may amplify it: a hiring model trained on past hiring decisions copies the old preferences, and systems trained mostly on pictures of one group tend to make more mistakes on others. A model can also learn a **spurious pattern**: in a well-known research example a classifier that seemed to tell wolves from dogs had learned to look for snow in the background. Models answer with great confidence, but they do not **understand**, they cannot easily explain themselves, and they can fail in ways that a person never would when an input differs from the training data. Training data often contain personal information, which raises questions of **privacy**.

So use machine learning where errors are affordable, keep a **human in the loop** for decisions that affect people, test on data that resemble the real use and on each group that is affected, report accuracy honestly with the size of the test set, and be ready to say that a simple rule or a table does the job better.

## Key Vocabulary

| Term | Definition |
|---|---|
| **AI / machine learning / deep learning** | Computers doing tasks that need intelligence / learning the rules from examples / machine learning with many-layer neural networks. |
| **Supervised / unsupervised / reinforcement** | Learning from labelled examples / finding structure without labels / learning from rewards by trial and error. |
| **Feature / label** | An input column of the data / the answer that the model must predict. |
| **Training set / test set** | The rows used to build the model / the rows kept aside to measure it. |
| **Overfitting** | Learning the noise of the training data: good on the training set, bad on new data. |
| **Baseline** | The best trivial rule, such as always answering the most common class. |
| **Confusion matrix** | The counts of TP, FP, FN and TN for a classifier. |
| **Precision / recall** | TP / (TP + FP): how many flagged cases are real / TP / (TP + FN): how many real cases were found. |
| **k-nearest neighbours** | A classifier that lets the k closest stored examples vote. |
| **Min-max scaling** | Rewriting a feature as (value - minimum) / (maximum - minimum), so that it lies between 0 and 1. |
| **Data leakage** | Test information that gets into the training, making the result look too good. |
| **Neuron / perceptron** | A weighted sum of inputs plus a bias and an activation / a neuron with a step activation. |
| **Gradient descent** | Repeated small changes of the weights in the direction that reduces the error. |
| **Bias (in data)** | A systematic unfairness or imbalance in the training data that the model copies. |

## Worked Examples

### Example 1: k-nearest neighbours on a tiny data set

```python
from collections import Counter
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
print("scaled distances:  ", "a-b", round(dist(scale(a), scale(b)), 2), " a-c", round(dist(scale(a), scale(c)), 2))
```

```output
new student: (10, 75)
  distance  5.10  pass
  distance  6.00  fail
  distance  7.07  fail
  distance  7.28  pass
  distance 10.44  fail
k = 1: pass
k = 3: fail
k = 5: fail
unscaled distances: a-b 8.0  a-c 25.0
scaled distances:   a-b 0.53  a-c 0.25
```

1. `TRAIN` holds 16 labelled students, each a pair of features (hours studied, attendance) and a label. `nearest` computes the Euclidean distance from the new point to every example with `math.dist`, sorts and keeps the `k` smallest. `predict` lets those neighbours vote with a `Counter`, and the most common label wins.
2. The five nearest neighbours of the student (10, 75) are at the distances 5.10 (pass), 6.00 (fail), 7.07 (fail), 7.28 (pass) and 10.44 (fail). With **k = 1** the answer is "pass", because the nearest example is a pass; with **k = 3** the votes are pass, fail, fail, so the answer is "fail"; with **k = 5** it is two passes against three fails, so "fail" again. **The answer depends on k**: for a student on the border between the groups the model is uncertain, and an honest system should say so.
3. The last two lines show why **scaling** matters. Student a differs from b by 8 hours and from c by 25 points of attendance. Unscaled, c looks three times as far from a as b does. But 8 hours is more than half of the whole range of hours (0 to 15), while 25 points are only a quarter of the range of attendance. After dividing each feature by its maximum, the distances are 0.53 and 0.25: the order reverses, and the hours finally count as they should.

### Example 2: Overfitting, and why accuracy is not enough

```python
from collections import Counter

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
    print(f"{name:<14} TP {tp} FP {fp} FN {fn} TN {tn} | accuracy {acc:.0%}, precision {precision:.2f}, recall {recall:.2f}")
```

```output
k   train  test
1   100%   50%
3    86%  100%
5    86%  100%
7    71%   75%

always ok      TP 0 FP 0 FN 5 TN 45 | accuracy 90%, precision 0.00, recall 0.00
a real filter  TP 4 FP 3 FN 1 TN 42 | accuracy 92%, precision 0.57, recall 0.80
```

1. The training data follow the rule "pass from about 7 hours", except two **noisy labels**: the student with 3 hours who passed by luck and the student with 10 hours who failed by accident. The test rows lie between the training points, close to the noise.
2. With **k = 1** the training accuracy is 100 per cent, because every training point is its own nearest neighbour, noise included, but the test accuracy is only 50 per cent: the model has **memorised the noise** (overfitting). With **k = 3 and 5** the neighbours outvote the noisy points: the training accuracy falls to 86 per cent (the two noisy points are now "wrong"), but the test accuracy rises to 100 per cent. With **k = 7** both fall to 71 and 75 per cent, because the vote smooths away the real boundary (underfitting). The training accuracy alone would have told you to choose k = 1: **only the test set tells the truth**.
3. The second part has 50 emails, 5 of them spam. The lazy filter that always answers "ok" has an accuracy of **90 per cent** and a recall of 0.00: it finds no spam at all. The real filter has an accuracy of only 92 per cent, but it finds 4 of the 5 spam mails (recall 0.80) at the price of 3 good mails in the spam folder (precision 0.57). Accuracy alone hides this difference, and a baseline and a confusion matrix show it.
4. Eight test rows are a **small test set**: "100 per cent" means no mistakes on eight points, not a perfect model. Always say how large the test set was.

### Example 3: One neuron learns AND and OR, but not XOR

```python
def train_perceptron(examples, epochs=20, rate=1):
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
    print(f"{name}: weights {w1}, {w2}, bias {bias} -> outputs {outputs} ({status})")
```

```output
AND: weights 2, 1, bias -2 -> outputs [0, 0, 0, 1] (learned in 6 epochs)
OR: weights 1, 1, bias 0 -> outputs [0, 1, 1, 1] (learned in 4 epochs)
XOR: weights -1, 0, bias 1 -> outputs [1, 1, 0, 0] (never learned it in 20 epochs)
```

1. `train_perceptron` is one neuron: it computes the weighted sum plus the bias, outputs 1 if the sum is above 0 and 0 otherwise, and after every **wrong** answer it moves the weights by `rate * error * input` and the bias by `rate * error`. One pass over all the examples is an **epoch**; training stops when an epoch has no mistakes.
2. **AND** is learned in 6 epochs, with the weights 2 and 1 and the bias -2: the sum `2 * x1 + x2 - 2` is positive only for (1, 1). **OR** is learned in 4 epochs, with the weights 1 and 1 and the bias 0. Both are problems in which a straight line separates the 1s from the 0s.
3. **XOR** is never learned: whatever the weights, the points (0, 1) and (1, 0) must be on one side of the line and (0, 0) and (1, 1) on the other, and no straight line does that. After 20 epochs the neuron still answers `[1, 1, 0, 0]`, only two of the four correctly. A **hidden layer** of neurons removes the limit, and deep networks are stacks of such layers trained by gradient descent.

## Common Mistakes and Misconceptions

- **Testing on the training data.** The score is then meaningless; always keep a test set that the model never saw.
- **Forgetting to scale the features,** or scaling with the minimum and maximum of all rows. The first lets the biggest numbers decide; the second is data leakage.
- **Judging a classifier by accuracy alone.** Compare with the baseline and look at precision and recall, especially when one class is rare.
- **Choosing k = 1,** or a k so large that the vote ignores the data. Test several odd values of k on data that were not used for training.
- **Trusting a tiny test set.** A result on eight or ten examples is a rough guide, not a promise.
- **Putting the answer into a feature,** or any other leak of the label. The model then looks brilliant and fails in real use.
- **Believing that a model understands.** It fits patterns; it can be confident and wrong, and it can be fooled by inputs unlike its training data.
- **Using machine learning when a rule will do,** or ignoring who is missing from the training data and who will be affected by the errors.

## Guided Hands-On Activity

**Train, test, doubt.** Work with your teacher and the code editors.

1. In Example 1 classify the student (4, 80) with k = 1, 3 and 5. Does the answer change? What does that tell you about this student?
2. In Example 1 add the example `((10, 75), "pass")` to `TRAIN` and classify the student (10, 75) with k = 1. Why is the answer now trivial, and why would testing like this be dishonest?
3. In Example 1 scale the features with the function `scale` before computing the distances, and compare the five nearest neighbours of (10, 75) with the unscaled ones. Which list changes?
4. In Example 2 change the noisy label of the 3-hour student to "fail" and run the table again. What happens to the training and test accuracy for k = 1?
5. In Example 2 invent a filter that misses 2 of the 5 spam mails and flags none of the good ones. Work out its accuracy, precision and recall by hand and check them with `metrics`.
6. In Example 3 train a NAND gate (targets `[1, 1, 1, 0]`). Does it converge? Explain why or why not.
7. Write one task for which recall matters more than precision and one for which precision matters more, and say what each kind of mistake costs.

## Lesson Project: Tiny Classifier from Scratch

### Objective

Build a **tiny classifier from scratch** for the course project: a k-nearest-neighbours model that predicts from the hours studied and the score of the last term whether a student will pass or fail, trained on one part of a data set, tested on another, compared with a baseline, with and without scaling, and reported honestly.

### Requirements

- **Load and split.** Read the CSV text below (columns `hours`, `last_term`, `result`) with `csv.DictReader`. Every fourth row (rows 4, 8, 12, ...) is a **test row**; the other rows are **training rows**.
- **The model.** `neighbours(train, point, k)` with `math.dist`, and `predict(train, point, k)` with a vote (use odd values of k). A scaler `make_scaler(train)` that applies min-max scaling with the minimum and maximum taken from the **training rows only**.
- **Evaluation.** The size of the two sets, the **baseline** accuracy (always answering the most common class of the test set), the accuracy on the test rows for k = 1, 3, 5, 7 and 9, both **unscaled and scaled**, and the **confusion matrix** for k = 5 with scaled features and FAIL as the positive ("at risk") class, with precision and recall.
- **Predictions.** Classify the new students (6 hours, last term 52) and (12 hours, last term 70) with k = 5 and scaled features, and print the votes of the five neighbours.
- **Honesty.** Finish with a line that says that the test set is small and that the accuracy is a rough guide, not a promise.

```text
hours,last_term,result
1,35,FAIL
8,48,FAIL
15,61,PASS
7,74,PASS
14,87,PASS
6,40,FAIL
13,53,PASS
5,66,PASS
12,79,PASS
4,92,PASS
11,45,PASS
3,58,FAIL
10,71,PASS
2,84,FAIL
9,37,FAIL
1,50,FAIL
8,63,PASS
15,76,PASS
7,89,PASS
14,42,PASS
6,55,PASS
13,68,PASS
5,81,FAIL
12,94,PASS
4,47,FAIL
11,60,PASS
3,73,FAIL
10,86,PASS
2,39,FAIL
9,52,PASS
1,65,FAIL
8,78,PASS
15,91,PASS
7,44,FAIL
14,57,PASS
6,70,FAIL
13,83,PASS
5,36,FAIL
12,49,PASS
4,62,FAIL
```

### Instructions

1. Store the CSV text in a string and write `load` to return a list of `(hours, last_term, result)` rows with numbers as `int`.
2. Write `split` so that the rows with index 3, 7, 11, ... go to the test set.
3. Write `neighbours` and `predict` with `Counter`, and check one prediction by hand.
4. Write `make_scaler` and use it on both the training and the test features, with limits from the training rows only.
5. Print the sizes, the baseline and the table of accuracies for k = 1, 3, 5, 7 and 9, unscaled and scaled.
6. Compute the confusion matrix for k = 5 (scaled, FAIL positive), precision and recall, and classify the two new students with their votes.
7. Compare your output with the expected output.

### Expected Output

```text
40 students: 30 to train on, 10 to test on
baseline: always answering PASS is right for 60%

 k   unscaled   scaled
 1       50%      60%
 3       60%     100%
 5       60%      80%
 7       60%      80%
 9       60%      80%

confusion matrix for k = 5, scaled, FAIL = at risk: TP 3, FN 1, FP 1, TN 5
precision 0.75 (flagged students who really fail), recall 0.75 (failing students that were found)

new student (6, 52): FAIL  (votes: PASS, FAIL, FAIL, FAIL, FAIL)

new student (12, 70): PASS  (votes: PASS, PASS, PASS, PASS, PASS)

Only 10 test students: treat the accuracy as a rough guide, not a promise.
```

### Hints

1. **Hint 1 (the split).** `[row for i, row in enumerate(rows) if i % 4 == 3]` gives every fourth row, counting from the fourth.
2. **Hint 2 (the distance).** `dist((hours, score), (h, s))` from `math` is the Euclidean distance; sort `(distance, label)` pairs and keep `[:k]`.
3. **Hint 3 (the vote).** `Counter(labels).most_common(1)[0][0]` is the winning label.
4. **Hint 4 (the scaling).** `(v - low) / (high - low)` for each column, with `low` and `high` from `zip(*training_features)`.
5. **Hint 5 (the matrix).** With FAIL positive, TP counts actual FAIL predicted FAIL, FN actual FAIL predicted PASS, FP actual PASS predicted FAIL.
6. **Hint 6 (no leakage).** Compute the scaler once from the training rows and apply it to the new students too.

### Success Criteria

- [ ] The split gives 30 training rows and 10 test rows, and the baseline is 60 per cent.
- [ ] Unscaled accuracy never beats the baseline of 60 per cent; scaled accuracy beats it for k = 3 to 9, and k = 3 reaches 100 per cent on the test rows.
- [ ] The confusion matrix for k = 5 has TP 3, FN 1, FP 1 and TN 5, with precision and recall of 0.75.
- [ ] The two new students are classified FAIL and PASS, with their votes printed.
- [ ] The scaler uses the training rows only, and the output ends with the honesty line.

### Extension Challenge

Replace the single split by **leave-one-out testing**: for each of the 40 rows, predict it from the other 39 and report the accuracy for each k; compare it with the 10-row test accuracy. Then add **distance-weighted voting**, where nearer neighbours count more, and a third feature of your own invention, and check whether the accuracy improves. Finally, write a short note for the head teacher that explains what this classifier may be used for, what it must not be used for, and who should check its decisions.

## Lesson Recap

- **AI** is a broad field; **machine learning** learns the rules from examples; **deep learning** uses many-layer neural networks. Today's systems are **narrow**. The kinds are **supervised**, **unsupervised** and **reinforcement** learning.
- Supervised learning uses **features** and **labels**, a **training set** and a **test set**; **overfitting** is memorising the noise; always compare with a **baseline** and use the **confusion matrix**, **precision** and **recall**.
- **k-NN** classifies by a vote of the k closest examples; it needs **scaled** features, with limits taken from the training set only, and a sensible k.
- A **neuron** is a weighted sum, a bias and an activation; one neuron learns AND and OR but not XOR; layers and gradient descent give deep learning.
- Models inherit **bias** from their data, can learn **spurious patterns**, do not understand, and need **human oversight**.

## Homework / Extension Mission

Choose a decision that you could imagine a classifier making in a school (which students need extra help, which library book to recommend). Write down the features that you would use and the label, say where the training data would come from, and list three ways in which the data could be biased or incomplete. Then describe what the two kinds of mistakes (false positive and false negative) would cost a student, and write the rule that decides whether a person must check the model's answer.

## Course Project Connection

This lesson adds the **Tiny Classifier from Scratch** to the **course project**, the small Python-based computational application or data exploration project. It is the machine learning part of the project: the same habits as in the Exam Results Explorer of Lesson 4 (clean data, honest numbers, report the limits) applied to prediction, with the train and test split, the baseline and the confusion matrix as the new tools. In Lesson 6 the same ideas are applied to text and images, where the data need a different kind of preparation.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the AI, ML and deep learning map and the three kinds of learning, with examples from the students' phones; 15 minutes: Example 1, with the class playing "human k-NN" on a scatter plot drawn on the board; 10 minutes: Example 2, with the overfitting table predicted before it is shown; 5 minutes: Example 3 and the XOR limit; 20 minutes: the project, with the bias discussion as the closing five minutes.

**Live demonstrations.** Draw the 16 training points on the board, mark a new student and let the class vote with k = 1, 3 and 5. Show that testing a model on its own training data gives 100 per cent. Let students try to draw one straight line that separates the XOR cases. Ask what could go wrong if this classifier were used to decide which students get extra lessons.

**Misconceptions.** "Machine learning means that the computer thinks." "A higher accuracy is always better." "More features always help." "A model that is right 99 per cent of the time is almost perfect." "Deep learning is the only machine learning."

**Assessment of the project.** Run the classifier and compare the output. Check that the scaler is built from the training rows only (change the test rows and see whether the scaled training features change), that the baseline is printed, and that the confusion matrix and the two new predictions are right. Ask: why is 100 per cent for k = 3 on ten students not a reason to trust k = 3, and what would you do to choose k more reliably?

**Reference solution `classifier.py`** (run with `python3 classifier.py`):

```python
"""Course project, step 5: a tiny k-nearest-neighbours classifier, trained and tested from scratch."""
import csv
import io
from collections import Counter
from math import dist

DATA = """hours,last_term,result
1,35,FAIL
8,48,FAIL
15,61,PASS
7,74,PASS
14,87,PASS
6,40,FAIL
13,53,PASS
5,66,PASS
12,79,PASS
4,92,PASS
11,45,PASS
3,58,FAIL
10,71,PASS
2,84,FAIL
9,37,FAIL
1,50,FAIL
8,63,PASS
15,76,PASS
7,89,PASS
14,42,PASS
6,55,PASS
13,68,PASS
5,81,FAIL
12,94,PASS
4,47,FAIL
11,60,PASS
3,73,FAIL
10,86,PASS
2,39,FAIL
9,52,PASS
1,65,FAIL
8,78,PASS
15,91,PASS
7,44,FAIL
14,57,PASS
6,70,FAIL
13,83,PASS
5,36,FAIL
12,49,PASS
4,62,FAIL
"""


def load(text):
    """Rows of (hours, last term score, result) from the CSV text."""
    return [(int(r["hours"]), int(r["last_term"]), r["result"]) for r in csv.DictReader(io.StringIO(text))]


def split(rows):
    """Every fourth row is a test row; the others are training rows."""
    train = [((h, s), result) for i, (h, s, result) in enumerate(rows) if i % 4 != 3]
    test = [((h, s), result) for i, (h, s, result) in enumerate(rows) if i % 4 == 3]
    return train, test


def make_scaler(train):
    """Min-max scaling to 0..1, with the limits taken from the TRAINING rows only."""
    columns = list(zip(*[features for features, _ in train]))
    low, high = [min(c) for c in columns], [max(c) for c in columns]
    return lambda features: tuple((v - lo) / (hi - lo) for v, lo, hi in zip(features, low, high))


def neighbours(train, point, k):
    """The k nearest training examples as (distance, result) pairs."""
    return sorted((dist(features, point), result) for features, result in train)[:k]


def predict(train, point, k):
    votes = Counter(result for _, result in neighbours(train, point, k))
    return votes.most_common(1)[0][0]


def accuracy(train, test, k, transform=lambda features: features):
    moved = [(transform(features), result) for features, result in train]
    return sum(predict(moved, transform(features), k) == result for features, result in test) / len(test)


def confusion(train, test, k, transform, positive):
    moved = [(transform(features), result) for features, result in train]
    pairs = [(result, predict(moved, transform(features), k)) for features, result in test]
    tp = sum(a == positive and p == positive for a, p in pairs)
    fn = sum(a == positive and p != positive for a, p in pairs)
    fp = sum(a != positive and p == positive for a, p in pairs)
    return tp, fn, fp, len(pairs) - tp - fn - fp


if __name__ == "__main__":
    rows = load(DATA)
    train, test = split(rows)
    scale = make_scaler(train)
    shares = Counter(result for _, result in test)
    baseline = shares.most_common(1)[0]
    print(f"{len(rows)} students: {len(train)} to train on, {len(test)} to test on")
    print(f"baseline: always answering {baseline[0]} is right for {baseline[1] / len(test):.0%}")
    print("\n k   unscaled   scaled")
    for k in (1, 3, 5, 7, 9):
        print(f"{k:>2}   {accuracy(train, test, k):>7.0%}   {accuracy(train, test, k, scale):>6.0%}")
    tp, fn, fp, tn = confusion(train, test, 5, scale, "FAIL")
    print(f"\nconfusion matrix for k = 5, scaled, FAIL = at risk: TP {tp}, FN {fn}, FP {fp}, TN {tn}")
    print(f"precision {tp / (tp + fp):.2f} (flagged students who really fail), recall {tp / (tp + fn):.2f} (failing students that were found)")
    moved = [(scale(features), result) for features, result in train]
    for point in [(6, 52), (12, 70)]:
        found = neighbours(moved, scale(point), 5)
        print(f"\nnew student {point}: {predict(moved, scale(point), 5)}  (votes: {', '.join(label for _, label in found)})")
    print("\nOnly", len(test), "test students: treat the accuracy as a rough guide, not a promise.")
```

```output
40 students: 30 to train on, 10 to test on
baseline: always answering PASS is right for 60%

 k   unscaled   scaled
 1       50%      60%
 3       60%     100%
 5       60%      80%
 7       60%      80%
 9       60%      80%

confusion matrix for k = 5, scaled, FAIL = at risk: TP 3, FN 1, FP 1, TN 5
precision 0.75 (flagged students who really fail), recall 0.75 (failing students that were found)

new student (6, 52): FAIL  (votes: PASS, FAIL, FAIL, FAIL, FAIL)

new student (12, 70): PASS  (votes: PASS, PASS, PASS, PASS, PASS)

Only 10 test students: treat the accuracy as a rough guide, not a promise.
```

**Differentiation.** Support: give `load`, `split` and `neighbours`, and let students write the vote, the scaler and the evaluation. Stretch: leave-one-out testing, distance-weighted voting, a third feature, and a decision stump (a single threshold rule) as a second model to compare with k-NN.

**Discussion questions (not for the student quiz).** Why is it dishonest to choose k by looking at the test set? Who might be harmed by a false negative in the "at risk" classifier, and who by a false positive? What would you want to know about the data before trusting a model that predicts school results?
