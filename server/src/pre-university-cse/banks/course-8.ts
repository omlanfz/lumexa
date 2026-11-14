// FILE PATH: server/src/pre-university-cse/banks/course-8.ts
//
// Course Assessment 8 — Python, Artificial Intelligence & Modern Computing.

import { codeOut, crit, mcq, practical, shortAnswer, structuredBank } from '../../structured-assessments/structured.helpers';

export const COURSE_8_BANK = structuredBank({
  id: 'structured/python-artificial-intelligence-and-modern-computing',
  title: 'Course Assessment: Python, Artificial Intelligence & Modern Computing',
  kind: 'COURSE_TEST',
  mcq: [
    codeOut(
      1,
      'python',
      `print(7 // 2, 7 % 2, 2 ** 5, "ab" * 3)`,
      '3 1 32 ababab',
      ['3.5 1 10 ababab', '3 1 32 ab3', '4 1 25 ababab'],
      '// is floor division (3), % is the remainder (1), ** is the power (32), and multiplying a string by 3 repeats it.',
    ),
    codeOut(
      2,
      'python',
      `d = {"a": 1}
d["b"] = d.get("b", 0) + 5
print(d, len(set("banana")))`,
      "{'a': 1, 'b': 5} 3",
      ["{'a': 1, 'b': 5} 6", "{'a': 1} 3", "{'a': 1, 'b': 0} 3"],
      'get returns the default 0 for the missing key, so b becomes 5. A set keeps each letter once: b, a and n, so its length is 3.',
    ),
    codeOut(
      3,
      'python',
      `from functools import lru_cache


@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)


print(fib(10), fib.cache_info().misses)`,
      '55 11',
      ['55 177', '89 11', '55 10'],
      'fib(10) is 55. With the cache every value from fib(0) to fib(10) is computed exactly once, so there are 11 misses; the plain recursion would make 177 calls.',
    ),
    codeOut(
      4,
      'python',
      `import statistics

d = [2, 4, 4, 4, 5, 5, 7, 9]
print(statistics.mean(d), statistics.median(d), statistics.mode(d))`,
      '5 4.5 4',
      ['5 4 4', '4.5 5 4', '5 4.5 5'],
      'The sum is 40, so the mean is 5; the two middle values are 4 and 5, so the median is 4.5; the value 4 occurs most often.',
    ),
    mcq(
      5,
      'A classifier is right for 99 per cent of its training examples but only for 72 per cent of new examples. What is the most likely problem?',
      'Overfitting: the model has learned the noise of the training data and does not generalise',
      [
        'Underfitting: the model is too simple to learn the pattern at all',
        'The test set is too large for the accuracy to be meaningful',
        'The model should be trained on the test set as well to close the gap',
      ],
      'A large gap between training and test accuracy is the signature of overfitting. Testing on data that the model never saw is what exposes it.',
    ),
    mcq(
      6,
      'What does a large language model do when it writes a sentence?',
      'It repeatedly predicts a likely next token from the text so far and appends it, so it can produce fluent text that is false',
      [
        'It looks up the sentence in a database of true facts and copies it',
        'It understands the topic as a person does and checks each claim before it writes',
        'It translates the question into a search query and returns the first web page',
      ],
      'A language model is trained to continue text in a likely way, not in a true way. That is why it can state something wrong with the same confidence as something right.',
    ),
    mcq(
      7,
      'A sensor retries a message until it is acknowledged, so the cloud sometimes receives a message twice. Which design makes the duplicate harmless?',
      'An idempotent receiver that remembers the sequence numbers it has applied and ignores a repeat',
      [
        'A faster network, so that acknowledgements are never lost',
        'Sending each message exactly once and never retrying',
        'Ordering the messages by the clock of each device',
      ],
      'Retries are needed because messages can be lost, so duplicates must be tolerated. Sequence numbers let the receiver apply each message once.',
    ),
    mcq(
      8,
      'Which use of a chatbot for a school assignment is the most responsible?',
      'Ask it to explain an idea, check the explanation in a reliable source, write your own answer, and say that you used it if the rules require',
      [
        'Paste the question, hand in the answer unchanged, and keep quiet about it',
        'Trust every reference that it gives because it sounds confident',
        'Paste your classmates\' private messages into it so that it can summarise them',
      ],
      'Responsible use keeps your own thinking, verifies the facts, protects private data and follows the rules about disclosure.',
    ),
    codeOut(
      5,
      'python',
      `tp, fp, fn = 8, 2, 4
print(round(tp / (tp + fp), 2), round(tp / (tp + fn), 2))`,
      '0.8 0.67',
      ['0.67 0.8', '0.8 0.8', '0.67 0.67'],
      'Precision is TP / (TP + FP) = 8 / 10 = 0.8: how many flagged cases are real. Recall is TP / (TP + FN) = 8 / 12 = 0.67: how many real cases were found.',
    ),
    mcq(
      4,
      'Hours of study and exam scores have a correlation of 0.9 in a class. What can you conclude?',
      'Students who study more tend to score higher, but the correlation alone does not prove that studying causes the higher scores',
      [
        'Studying causes 90 per cent of the score of every student',
        'Every student who studies more than the average will score higher',
        'There is no relationship, because a correlation is only a coincidence',
      ],
      'A correlation measures how two variables move together. Other factors (earlier knowledge, motivation) may cause both, so causation needs more than a correlation.',
    ),
  ],
  shortAnswers: [
    shortAnswer(
      2,
      'Explain what is wrong with `def add(item, bucket=[]): bucket.append(item); return bucket`. Say what `add(1)` followed by `add(2)` returns, why, and show the corrected function.',
      'A default argument is created once, when the def statement runs, so the empty list is shared by every call that does not pass its own bucket. add(1) returns [1], and add(2) returns [1, 2], because the second call appends to the same list. The corrected version uses None as the default and creates the list inside the function: def add(item, bucket=None): if bucket is None: bucket = []; bucket.append(item); return bucket. Then add(1) gives [1] and add(2) gives [2].',
      [
        crit('The problem', 2, 'Explains that the default is created once and shared between calls.'),
        crit('The two results', 1, 'States [1] and [1, 2], with the reason.'),
        crit('The fix', 2, 'Uses None and creates a new list inside the function, with correct code.'),
      ],
    ),
    shortAnswer(
      5,
      'Explain what a training set and a test set are, what overfitting means, and why accuracy alone can mislead when 98 per cent of emails are not spam. Name two measures that give a better picture.',
      'The training set is the data that the model learns from; the test set is held back and used once at the end to measure how well the model works on new data. Overfitting means that the model has learned the noise of the training data, so it does very well on the training set and badly on the test set. If 98 per cent of the emails are not spam, a filter that always says "not spam" is 98 per cent accurate and catches no spam at all. Precision (how many flagged emails are really spam) and recall (how many of the real spam emails were found), together with the confusion matrix, give a better picture.',
      [
        crit('Training and test sets', 1, 'Defines both and says why the test set is kept apart.'),
        crit('Overfitting', 2, 'Explains that the model memorises noise and shows the gap between training and test results.'),
        crit('Why accuracy misleads, and better measures', 2, 'Explains the always-not-spam filter and names precision and recall (or the confusion matrix).'),
      ],
    ),
    shortAnswer(
      7,
      'An IoT temperature sensor sends a reading every minute and retries when it gets no acknowledgement. Explain why the cloud may receive the same reading twice, how a sequence number prevents double counting, and name one privacy or safety consideration for the data of such a system.',
      'The sensor cannot tell whether the message or only the acknowledgement was lost, so when the acknowledgement is lost it sends the reading again and the cloud receives it twice. If every reading carries a sequence number, the cloud keeps the numbers it has already applied and ignores a repeat, so the stored data and totals are correct (the receiver is idempotent). A consideration for data from homes or people: readings can reveal habits, so collect only what is needed, protect it with encryption and access control, and let people see and delete it; a device with a default password could also be taken over and misused.',
      [
        crit('Why duplicates happen', 2, 'Explains the lost acknowledgement and the retry.'),
        crit('Sequence numbers', 2, 'Says that the receiver remembers applied numbers and ignores repeats (idempotent).'),
        crit('Privacy or safety', 1, 'Names a sensible consideration and a measure.'),
      ],
    ),
  ],
  practical: practical({
    title: 'Clean, summarise and judge exam results',
    language: 'python',
    instructions:
      'Write a Python program that analyses exam results given as CSV text.\n\n' +
      '1. Parse this text with the csv module (columns id, class, hours, score): `1,10,12,88`, `2,10,8,67`, `3,9,3,38`, `4,11,10,75`, `5,10,14,94`, `6,9,6,58`, `7,11,,70`, `8,12,9,105`, `9,12,7,55`, `10,9,5,80`, `10,9,5,80`. Remove (and report, with the reason) a duplicate id, a missing value and a score outside 0 to 100; never remove silently.\n' +
      '2. For the clean rows print the number of students, the mean and the median score, and the mean score of each class.\n' +
      '3. Find the outliers of the score with the 1.5 x IQR rule (use statistics.quantiles) and say whether any exist.\n' +
      '4. Compute the correlation between hours and score and print it with two decimals.\n' +
      '5. Finish with two sentences that say what the data show and one limitation (for example the small sample), without claiming that hours cause scores.\n\n' +
      'Expected: three rows are removed (one duplicate, one missing hours, one score of 105) and seven clean rows remain.',
    starterCode:
      'import csv\nimport io\nimport statistics\n\n' +
      'RAW = """id,class,hours,score\n1,10,12,88\n2,10,8,67\n3,9,3,38\n4,11,10,75\n5,10,14,94\n6,9,6,58\n7,11,,70\n8,12,9,105\n9,12,7,55\n10,9,5,80\n10,9,5,80\n"""\n\n\n' +
      'def clean(text):\n    """Return (clean rows, a list of messages about removed rows)."""\n    pass\n\n\n# summarise, find outliers, correlate\n',
    deliverables: ['Your complete Python program', 'The printed log, the summaries and the correlation', 'Two sentences of conclusion and one limitation'],
    rubric: [
      crit('Cleaning and log', 5, 'Removes the duplicate, the missing value and the impossible score, keeps the raw data, and reports each removal with its reason.'),
      crit('Summaries', 4, 'Correct count, mean, median and the mean of each class, using the statistics module or correct code.'),
      crit('Outliers and correlation', 4, 'Applies the 1.5 x IQR rule correctly and computes the correlation (by formula or statistics.correlation) with two decimals.'),
      crit('Honest conclusion', 4, 'States what the data show, avoids claiming causation, and names a real limitation such as the small sample.'),
      crit('Code quality', 3, 'Functions with docstrings, clear names, no repeated code, readable output.'),
    ],
  }),
});
