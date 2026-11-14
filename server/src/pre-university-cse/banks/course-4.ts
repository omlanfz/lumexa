// FILE PATH: server/src/pre-university-cse/banks/course-4.ts
//
// Course Assessment 4 — Discrete Mathematics & Computational Logic.

import { codeOut, crit, mcq, practical, shortAnswer, structuredBank } from '../../structured-assessments/structured.helpers';

export const COURSE_4_BANK = structuredBank({
  id: 'structured/discrete-mathematics-and-computational-logic',
  title: 'Course Assessment: Discrete Mathematics & Computational Logic',
  kind: 'COURSE_TEST',
  mcq: [
    codeOut(
      1,
      'python',
      `p = True
q = False
print((not p) or q, p and (not q), p != q)`,
      'False True True',
      ['True True False', 'False False True', 'True False True'],
      'not p is False, so (not p) or q is False; p and (not q) is True; p != q is True because the two values differ (exclusive or).',
    ),
    codeOut(
      2,
      'python',
      `A = {1, 2, 3, 4}
B = {3, 4, 5}
print(sorted(A & B), sorted(A - B), len(A | B))`,
      '[3, 4] [1, 2] 5',
      ['[1, 2] [3, 4] 5', '[3, 4] [1, 2] 7', '[3, 4] [5] 5'],
      'The intersection holds the common elements 3 and 4, the difference A - B holds 1 and 2, and the union {1, 2, 3, 4, 5} has 5 elements.',
    ),
    mcq(
      3,
      'On the set {1, 2, 3} the relation R = {(1,1), (2,2), (3,3), (1,2), (2,1)} is given. Which statement is true?',
      'R is an equivalence relation, with the equivalence classes {1, 2} and {3}',
      [
        'R is reflexive and symmetric but not transitive, so it is not an equivalence relation',
        'R is an equivalence relation with three equivalence classes {1}, {2} and {3}',
        'R is transitive and antisymmetric, so it is a partial order',
      ],
      'R contains every (x, x), whenever (a, b) is present so is (b, a), and the pairs chain correctly (for example (1,2) and (2,1) give (1,1)). So it is reflexive, symmetric and transitive, and 1 and 2 are related to each other but not to 3.',
    ),
    mcq(
      4,
      'In a proof by induction, what must the inductive step show?',
      'That if the statement holds for some k (the inductive hypothesis), it also holds for k + 1',
      [
        'That the statement holds for every number from 1 to 100 when each one is tested',
        'That the statement holds for k + 1, assuming that it is false for k',
        'That the negation of the statement leads to a contradiction for the number 1',
      ],
      'Induction has two parts: a base case, and a step that proves P(k) implies P(k + 1). Together they cover every number from the base case upward.',
    ),
    codeOut(
      5,
      'python',
      `from math import comb, perm

print(comb(5, 2), perm(5, 2), 2 ** 5)`,
      '10 20 32',
      ['10 10 32', '20 10 10', '20 20 25'],
      'Choosing 2 of 5 without order gives C(5, 2) = 10, arranging 2 of 5 in order gives P(5, 2) = 20, and 5 yes/no choices give 2^5 = 32 outcomes.',
    ),
    mcq(
      6,
      'A connected graph has 7 vertices and no cycles. How many edges does it have?',
      '6, because a connected graph without cycles is a tree, and a tree on n vertices has n - 1 edges',
      [
        '7, because every vertex needs one edge of its own',
        '21, because a connected graph joins every pair of vertices',
        'It cannot be said, because the number of edges of a tree depends on its shape',
      ],
      'A tree is a connected graph without cycles, and every tree with n vertices has exactly n - 1 edges: with 7 vertices that is 6.',
    ),
    codeOut(
      7,
      'python',
      `a = [1, 2]
for n in range(2, 8):
    a.append(a[n - 1] + 2 * a[n - 2])
print(a)`,
      '[1, 2, 4, 8, 16, 32, 64, 128]',
      ['[1, 2, 3, 5, 8, 13, 21, 34]', '[1, 2, 4, 7, 12, 20, 33, 54]', '[1, 2, 5, 12, 29, 70, 169, 408]'],
      'Each term is the previous one plus twice the one before it: 2 + 2 = 4, 4 + 4 = 8, 8 + 8 = 16, and so on. The sequence satisfies a(n) = 2 a(n - 1), the powers of two.',
    ),
    codeOut(
      8,
      'python',
      `import re

print(bool(re.fullmatch(r"(ab)*c", "ababc")), bool(re.fullmatch(r"(ab)*c", "abac")))`,
      'True False',
      ['True True', 'False True', 'False False'],
      '(ab)*c accepts any number of repetitions of "ab" followed by one "c". "ababc" has two repetitions then c; "abac" breaks the pattern after "ab".',
    ),
    mcq(
      1,
      'Which statement is equivalent to "not (p and q)" according to De Morgan\'s law?',
      '(not p) or (not q)',
      ['(not p) and (not q)', 'p or q', 'p and (not q)'],
      'De Morgan\'s laws: the negation of a conjunction is the disjunction of the negations, and the negation of a disjunction is the conjunction of the negations.',
    ),
    mcq(
      5,
      'A fair coin is flipped 3 times. What is the probability of at least one head?',
      '7/8, because only one of the eight equally likely outcomes (three tails) has no head',
      [
        '3/8, because there are three flips and each one gives a head with probability 1/8',
        '1/2, because each flip is a fair coin and the flips do not influence each other',
        '3/4, because two of the three flips must be heads on average',
      ],
      'Use the complement: P(no head) = (1/2)^3 = 1/8, so P(at least one head) = 1 - 1/8 = 7/8.',
    ),
  ],
  shortAnswers: [
    shortAnswer(
      4,
      'Prove by induction that the sum of the first n odd numbers is n squared, that is 1 + 3 + 5 + ... + (2n - 1) = n^2 for every n >= 1. Write the base case, the inductive hypothesis and the inductive step.',
      'Base case: for n = 1 the sum is 1 and 1^2 = 1, so the statement holds. Inductive hypothesis: assume that for some k >= 1, 1 + 3 + ... + (2k - 1) = k^2. Inductive step: for k + 1 the sum is the sum up to (2k - 1) plus the next odd number 2(k + 1) - 1 = 2k + 1. By the hypothesis this equals k^2 + 2k + 1 = (k + 1)^2. So the statement holds for k + 1; by induction it holds for every n >= 1.',
      [
        crit('Base case', 1, 'Checks n = 1 correctly.'),
        crit('Hypothesis stated', 1, 'States clearly that the formula is assumed for some k.'),
        crit('Inductive step', 2, 'Adds the next odd number 2k + 1 to k^2 and simplifies to (k + 1)^2.'),
        crit('Conclusion', 1, 'Concludes that the statement holds for all n by the principle of induction.'),
      ],
    ),
    shortAnswer(
      6,
      'A graph has the vertices A, B, C, D and E and the edges AB, BC, CD, DA, AC and DE. Give the degree of every vertex, say whether the graph has an Euler path or an Euler circuit, and justify your answer with the rule that you use.',
      'The degrees are A = 3 (B, D, C), B = 2 (A, C), C = 3 (B, D, A), D = 3 (C, A, E) and E = 1 (D). An Euler circuit needs every degree even, and an Euler path needs exactly 0 or 2 vertices of odd degree. Here four vertices (A, C, D and E) have odd degree, so the graph has neither an Euler path nor an Euler circuit.',
      [
        crit('Degrees', 2, 'All five degrees are right (3, 2, 3, 3, 1); 1 mark if one or two are wrong.'),
        crit('The rule', 2, 'States that a circuit needs all degrees even and a path needs exactly zero or two odd degrees.'),
        crit('Conclusion', 1, 'Counts four odd vertices and concludes that there is no Euler path and no circuit.'),
      ],
    ),
    shortAnswer(
      8,
      'Describe a deterministic finite automaton (DFA) that accepts exactly the binary strings that end in 01. Give its states, its start state, its accepting state and its transitions, and show what it does with the inputs 1101 and 0110.',
      'Use three states: q0 (the last symbol was not a useful start: no progress), q1 (the last symbol was 0, so a 1 would complete 01) and q2 (the string so far ends in 01). q0 is the start state and q2 is the only accepting state. Transitions: q0 on 0 goes to q1, q0 on 1 stays in q0; q1 on 0 stays in q1, q1 on 1 goes to q2; q2 on 0 goes to q1, q2 on 1 goes to q0. For 1101: q0 -1-> q0 -1-> q0 -0-> q1 -1-> q2, which accepts. For 0110: q0 -0-> q1 -1-> q2 -1-> q0 -0-> q1, which rejects because q1 is not accepting.',
      [
        crit('States and start/accept', 2, 'Defines states with meaning, a start state and the accepting state.'),
        crit('Transitions', 2, 'A complete and correct transition table for both inputs from every state.'),
        crit('Traces', 1, 'Shows 1101 accepted and 0110 rejected by following the states.'),
      ],
    ),
  ],
  practical: practical({
    title: 'Truth tables and tautologies in Python',
    language: 'python',
    instructions:
      'Write a Python program that works with propositional logic.\n\n' +
      '1. Write `table(expression, names)` that evaluates a logical expression, given as a string that uses `and`, `or`, `not` and the variable names, for every combination of True and False and returns the rows as a list of tuples (the values of the variables and the result).\n' +
      '2. Write `is_tautology(expression, names)` that returns True when the result is True in every row, and `equivalent(e1, e2, names)` that returns True when two expressions give the same result in every row.\n' +
      '3. Use your functions to print the truth table of `p and (not q)`, and to report whether each of these is a tautology: `p or (not p)`, `p and q`, `(not (p and q)) == ((not p) or (not q))`.\n' +
      '4. Use `equivalent` to check De Morgan\'s law for `not (p or q)` and `(not p) and (not q)`.\n\n' +
      'Print the table with one row per line, written as `p=True q=False -> True`. Expected: `p or (not p)` is a tautology, `p and q` is not, and De Morgan\'s law holds. Explain in a comment why checking all rows is a proof for propositional logic.',
    starterCode:
      'from itertools import product\n\n\n' +
      'def table(expression, names):\n    """Return a list of (values, result) rows."""\n    rows = []\n    # evaluate the expression for every combination of True and False\n    return rows\n\n\n' +
      'def is_tautology(expression, names):\n    pass\n\n\n' +
      'def equivalent(e1, e2, names):\n    pass\n\n\n' +
      '# print the table and the checks\n',
    deliverables: ['Your complete Python program', 'The printed table and the results of the checks', 'The comment about why checking all rows is a proof'],
    rubric: [
      crit('Truth table generation', 5, 'Generates all 2^n combinations (for example with itertools.product) and evaluates the expression correctly for each.'),
      crit('Tautology and equivalence', 5, 'is_tautology and equivalent are correct and reuse table(); they work for two variables and would for more.'),
      crit('Required checks and output', 4, 'Prints the table in the format shown and the four checks with the right answers.'),
      crit('Reasoning', 3, 'Explains that propositional logic has finitely many cases, so checking every row is a complete proof.'),
      crit('Code quality', 3, 'Readable code, docstrings or comments, no unsafe use of eval on unchecked input (or a comment on the risk).'),
    ],
  }),
});
