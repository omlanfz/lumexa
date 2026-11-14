// FILE PATH: server/src/curriculum/lesson-content/catalog/pucse/c4.ts
//
// Pre-University CSE · Course 4 · Discrete Mathematics & Computational Logic — visuals and the Mini Quiz of every lesson.
// Keys are lineage keys: "<course-slug>/<lesson position>". Every "what does this print?" question carries
// the real program (checked by running it in the Pre-University CSE spec when the toolchain is installed).

import { registerVisualCatalog } from '../../visual-catalog';
import { registerQuizCatalog } from '../../quiz-catalog';
import { automaton, C, cards, flow, graph, grid, lab, mcq, PY, table, trace, treeSteps, truthTable, V, venn } from './helpers';

const M = 'discrete-mathematics-and-computational-logic';

registerVisualCatalog({
  [`${M}/1`]: [
    cards(
      'translation-traps',
      'Translating English into logic',
      'Four cards with tricky English phrases and their logic. If p then q is p implies q. P only if q is also p implies q. P unless q is not q implies p. Neither p nor q is not p and not q.',
      'Four phrases that trip people up. "Only if" points the arrow the other way from "if".',
      [
        { title: 'if p then q', badge: 'p → q', tone: 'info', bullets: ['"p implies q"', '"q if p"', 'False only when p is true and q is false'] },
        { title: 'p only if q', badge: 'p → q', tone: 'warn', bullets: ['Not q → p!', '"You may vote only if you are 18"', 'vote → 18'] },
        { title: 'p unless q', badge: '¬q → p', tone: 'accent', bullets: ['"If not q, then p"', 'Same as p ∨ q', '"Stay in unless it is dry"'] },
        { title: 'neither p nor q', badge: '¬p ∧ ¬q', tone: 'good', bullets: ['Both are false', 'Same as ¬(p ∨ q)', 'De Morgan again'] },
      ],
      { at: 'end' },
    ),
    truthTable(
      'implication-table',
      'Truth tables',
      'A truth table for p and q with four columns: p implies q, not p or q, not q implies not p, and q implies p. The first three columns are identical in every row. The fourth, the converse, differs in two rows.',
      'The first three columns are equal: an implication is the same as "not p or q" and as its contrapositive. The converse is different.',
      ['p', 'q'],
      [
        ['p → q', 'p -> q'],
        ['¬p ∨ q', 'not p or q'],
        ['¬q → ¬p', 'not q -> not p'],
        ['q → p', 'q -> p'],
      ],
      { at: 'end', reveal: true },
    ),
    truthTable(
      'de-morgan-table',
      'Laws of logic',
      'A truth table for p and q with four columns: not (p and q), not p or not q, not (p or q) and not p and not q. The first two columns agree in every row, and so do the last two. These are De Morgan’s laws.',
      'De Morgan’s laws: negating an AND gives an OR of negations, and negating an OR gives an AND of negations.',
      ['p', 'q'],
      [
        ['¬(p ∧ q)', 'not (p and q)'],
        ['¬p ∨ ¬q', 'not p or not q'],
        ['¬(p ∨ q)', 'not (p or q)'],
        ['¬p ∧ ¬q', 'not p and not q'],
      ],
      { at: 'end', reveal: true },
    ),
    table(
      'quantifier-negation',
      'Predicates and quantifiers',
      'A table of quantified statements, their negations and Python versions. Not for all x P of x is the same as there exists x with not P of x. Not there exists x P of x is the same as for all x not P of x.',
      'To negate a quantified statement, swap the quantifier and negate the predicate.',
      ['Statement', 'Negation', 'In Python'],
      [
        ['∀x P(x)', '∃x ¬P(x)', 'all(P(x) for x in D)  versus  any(not P(x) for x in D)'],
        ['∃x P(x)', '∀x ¬P(x)', 'any(P(x) for x in D)  versus  all(not P(x) for x in D)'],
        ['∀x ∃y R(x, y)', '∃x ∀y ¬R(x, y)', 'the order of the quantifiers matters'],
      ],
      { at: 'end' },
    ),
    lab(
      'equivalence-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that checks logical equivalences by trying every row of the truth table, with its expected output.',
      'Add a check that not (p or q) is equivalent to (not p) and (not q), and one for p and (q or r) versus (p and q) or r.',
      `from itertools import product


def implies(a, b):
    return (not a) or b


def equivalent(f, g, n):
    return all(f(*row) == g(*row) for row in product([True, False], repeat=n))


print("De Morgan:", equivalent(lambda p, q: not (p and q), lambda p, q: (not p) or (not q), 2))
print("contrapositive:", equivalent(lambda p, q: implies(p, q), lambda p, q: implies(not q, not p), 2))
print("converse:", equivalent(lambda p, q: implies(p, q), lambda p, q: implies(q, p), 2))
print("distribution:", equivalent(lambda p, q, r: p and (q or r), lambda p, q, r: (p and q) or (p and r), 3))`,
      { expected: 'De Morgan: True\ncontrapositive: True\nconverse: False\ndistribution: True', filename: 'equivalence.py', at: 'end' },
    ),
  ],
  [`${M}/2`]: [
    table(
      'power-set-table',
      'Sets and notation',
      'A table of the power set of the set with elements a, b and c. There is one subset of size 0, the empty set; three subsets of size 1; three subsets of size 2; and one subset of size 3. That is 8 subsets in total, which is 2 to the power 3.',
      'Each element is either in a subset or not: 2 choices for each of 3 elements gives 2 × 2 × 2 = 8 subsets.',
      ['Size', 'Subsets', 'How many'],
      [
        ['0', '∅', '1'],
        ['1', '{a}  {b}  {c}', '3'],
        ['2', '{a, b}  {a, c}  {b, c}', '3'],
        ['3', '{a, b, c}', '1'],
      ],
      { at: 'end' },
    ),
    table(
      'sets-and-logic',
      'Set operations',
      'A table that links set operations to logic. Union corresponds to or, intersection to and, complement to not, and symmetric difference to exclusive or. Each row also shows the Python operator for sets and the Python operator for booleans.',
      'The same ideas, in two languages: an element is in A ∪ B exactly when "in A or in B" is true.',
      ['Set operation', 'Logic', 'Python sets', 'Python booleans'],
      [
        ['A ∪ B', 'p ∨ q', 'A | B', 'p or q'],
        ['A ∩ B', 'p ∧ q', 'A & B', 'p and q'],
        ['Aᶜ', '¬p', 'U - A', 'not p'],
        ['A ⊕ B', 'p ⊕ q', 'A ^ B', 'p != q'],
      ],
      { at: 'end' },
    ),
    venn(
      'survey-venn',
      'Venn diagrams',
      'A Venn diagram of a class of 40 students. 16 students play only cricket, 9 play only football, 9 play both, and 6 play neither, outside both circles. Cricket in total is 25 and football is 18.',
      'The regions never overlap, so their counts add to 40. The 6 outside both circles are easy to forget.',
      ['Cricket', 'Football'],
      { Cricket: ['16 only'], Football: ['9 only'], 'Cricket,Football': ['9 both'], none: ['6 neither'] },
      { at: 'end', highlight: ['Cricket,Football'] },
    ),
    venn(
      'three-set-venn',
      'Venn diagrams',
      'A three-circle Venn diagram over the numbers 1 to 20. A is the even numbers, B the multiples of 3 and C the primes. Only A has 4, 8, 10, 14, 16 and 20; only B has 9 and 15; only C has 5, 7, 11, 13, 17 and 19; A and B only has 6, 12 and 18; A and C only has 2; B and C only has 3; the region of all three is empty; and 1 lies outside all three circles.',
      'Eight regions for three sets. No number is even, a multiple of 3 and prime at once, so the centre is empty.',
      ['A', 'B', 'C'],
      { A: [4, 8, 10, 14, 16, 20], B: [9, 15], C: [5, 7, 11, 13, 17, 19], 'A,B': [6, 12, 18], 'A,C': [2], 'B,C': [3], 'A,B,C': [], none: [1] },
      { at: 'end', highlight: ['A,B,C'] },
    ),
    lab(
      'inclusion-exclusion-lab',
      'Example 3',
      'python',
      'A Python editor with the Example 3 program that counts the students who play cricket, football, both and neither using inclusion-exclusion, with its expected output.',
      'Change the numbers to 30 cricket, 22 football and 12 both in a class of 45. How many play neither?',
      `students = range(1, 41)
cricket = set(range(1, 26))
football = set(range(17, 35))

print("cricket", len(cricket), "football", len(football), "both", len(cricket & football))
union = len(cricket) + len(football) - len(cricket & football)
print(f"play at least one: {union} (check: {len(cricket | football)})")
print("play neither:", len(students) - union)
print("only cricket:", len(cricket - football), "only football:", len(football - cricket))`,
      { expected: 'cricket 25 football 18 both 9\nplay at least one: 34 (check: 34)\nplay neither: 6\nonly cricket: 16 only football: 9', filename: 'survey.py', at: 'end' },
    ),
  ],
  [`${M}/3`]: [
    graph(
      'divides-digraph',
      'Relations',
      'A directed graph of the relation divides on the numbers 1, 2, 3, 4 and 6, without the loops. There is an arrow from 1 to each of 2, 3, 4 and 6; from 2 to 4 and 6; and from 3 to 6. An arrow from a to b means a divides b.',
      'A relation drawn as a directed graph: one arrow for each pair (a, b) with a dividing b. (Each number also divides itself; the loops are left out.)',
      [
        { id: '1', x: 60, y: 110 },
        { id: '2', x: 200, y: 40 },
        { id: '3', x: 200, y: 180 },
        { id: '4', x: 340, y: 40 },
        { id: '6', x: 340, y: 180 },
      ],
      [['1', '2'], ['1', '3'], ['1', '4'], ['1', '6'], ['2', '4'], ['2', '6'], ['3', '6']],
      { directed: true, at: 'end' },
    ),
    table(
      'relation-property-table',
      'Properties of a relation on a set',
      'A table of six relations and their properties. At most or equal is reflexive, antisymmetric and transitive: a partial order. Less than is antisymmetric and transitive only. Equal is all four. Congruent mod 3 is reflexive, symmetric and transitive: an equivalence relation. Divides is a partial order. Is friends with is only symmetric.',
      'Test every property separately. An equivalence relation needs reflexive, symmetric and transitive; a partial order needs reflexive, antisymmetric and transitive.',
      ['Relation', 'Reflexive', 'Symmetric', 'Antisymmetric', 'Transitive', 'Kind'],
      [
        ['a ≤ b', '✓', '✗', '✓', '✓', 'partial order'],
        ['a < b', '✗', '✗', '✓', '✓', 'strict order'],
        ['a = b', '✓', '✓', '✓', '✓', 'equivalence (and order)'],
        ['a ≡ b (mod 3)', '✓', '✓', '✗', '✓', 'equivalence'],
        ['a divides b', '✓', '✗', '✓', '✓', 'partial order'],
        ['a is friends with b', '✗', '✓', '✗', '✗', 'neither'],
      ],
      { at: 'end', highlights: [{ row: 3, col: 5, tone: 'good' }, { row: 0, col: 5, tone: 'info' }, { row: 4, col: 5, tone: 'info' }] },
    ),
    grid(
      'injective-not-surjective',
      'Functions',
      'A mapping diagram of a function from A with elements 1, 2 and 3 to B with elements a, b, c and d. Each element of A has one arrow: 1 to b, 2 to a and 3 to c. No two inputs share an output, so the function is injective, but d receives no arrow, so it is not surjective.',
      'Injective: no two arrows end at the same element. Not surjective: d is never hit, so it is outside the range.',
      [
        ['a1', 'circle', '1', 0, 0, 'accent'],
        ['a2', 'circle', '2', 0, 1, 'accent'],
        ['a3', 'circle', '3', 0, 2, 'accent'],
        ['ba', 'circle', 'a', 2, 0, 'good'],
        ['bb', 'circle', 'b', 2, 1, 'good'],
        ['bc', 'circle', 'c', 2, 2, 'good'],
        ['bd', 'circle', 'd', 2, 3, 'bad'],
      ],
      [['a1', 'bb'], ['a2', 'ba'], ['a3', 'bc']],
      { dx: 200, dy: 62, w: 52, at: 'end' },
    ),
    table(
      'function-kinds',
      'Functions',
      'A table of the three kinds of function. Injective: different inputs give different outputs, for example f of x equals 2x, but not x squared on the integers. Surjective: every element of the codomain is an output, for example x plus 1 on the integers, but not 2x. Bijective: both, so the function has an inverse.',
      'Injective, surjective, bijective: three questions you can ask of any function.',
      ['Kind', 'Rule', 'Example', 'Counter-example'],
      [
        ['Injective', 'different inputs, different outputs', 'f(x) = 2x on ℤ', 'f(x) = x² on ℤ (2 and −2 collide)'],
        ['Surjective', 'every codomain element is hit', 'f(x) = x + 1 on ℤ → ℤ', 'f(x) = 2x on ℤ → ℤ (odd numbers missed)'],
        ['Bijective', 'both: it has an inverse', 'f(x) = x + 1 on ℤ', 'f(x) = x² on ℤ'],
      ],
      { at: 'end' },
    ),
    table(
      'mod5-addition',
      'Modular arithmetic',
      'The addition table modulo 5. Each row and column is labelled 0 to 4, and each cell is the sum reduced modulo 5. For example 3 plus 4 is 7, which is 2 modulo 5, and every row contains each remainder exactly once.',
      'Addition mod 5: the numbers wrap around like a clock with five hours. Every row is a shuffle of 0 to 4.',
      ['+', '0', '1', '2', '3', '4'],
      [
        ['0', '0', '1', '2', '3', '4'],
        ['1', '1', '2', '3', '4', '0'],
        ['2', '2', '3', '4', '0', '1'],
        ['3', '3', '4', '0', '1', '2'],
        ['4', '4', '0', '1', '2', '3'],
      ],
      { at: 'end', highlights: [{ row: 3, col: 5, tone: 'good', note: '3 + 4 = 7 ≡ 2' }] },
    ),
    lab(
      'classes-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that sorts the numbers 0 to 11 into the three equivalence classes of congruence modulo 3, with its expected output.',
      'Change 3 to 5 and describe the classes. Then change the relation to "same last digit" (x % 10) on range(0, 30).',
      `elements = range(0, 12)
classes = {}
for x in elements:
    classes.setdefault(x % 3, []).append(x)

for remainder in sorted(classes):
    print(f"class of {remainder} (mod 3): {classes[remainder]}")

all_members = sorted(x for members in classes.values() for x in members)
print("they cover everything:", all_members == list(elements))
print("they are disjoint:", sum(len(m) for m in classes.values()) == len(set(all_members)))
print("5 ≡ 14 (mod 3):", (14 - 5) % 3 == 0, "| 5 ≡ 7 (mod 3):", (7 - 5) % 3 == 0)`,
      { expected: 'class of 0 (mod 3): [0, 3, 6, 9]\nclass of 1 (mod 3): [1, 4, 7, 10]\nclass of 2 (mod 3): [2, 5, 8, 11]\nthey cover everything: True\nthey are disjoint: True\n5 ≡ 14 (mod 3): True | 5 ≡ 7 (mod 3): False', filename: 'classes.py', at: 'end' },
    ),
  ],
  [`${M}/4`]: [
    table(
      'euclid-table',
      'Proof by contradiction',
      'A table of Euclid’s construction. Starting from the prime 2, multiply the primes so far and add 1: 3, then 7, then 43, then 1807, then 23479. The smallest prime factor of each result is 3, 7, 43, 13 and 53, and none of them was in the list already. The number 1807 is not prime itself, it is 13 times 139.',
      'Multiply the primes you have and add 1: the result leaves remainder 1 for every listed prime, so its prime factors are new.',
      ['Primes so far', 'Product + 1', 'Smallest prime factor', 'Already in the list?'],
      [
        ['2', '3', '3', 'no'],
        ['2, 3', '7', '7', 'no'],
        ['2, 3, 7', '43', '43', 'no'],
        ['2, 3, 7, 43', '1807 = 13 × 139', '13', 'no'],
        ['2, 3, 7, 43, 13', '23479 = 53 × 443', '53', 'no'],
      ],
      { at: 'end', highlights: [{ row: 3, col: 1, tone: 'warn', note: 'Not prime itself' }] },
    ),
    flow(
      'induction-dominoes',
      'Mathematical induction',
      'A four-step flow of an induction proof. The base case shows that P of 1 is true. The inductive step shows that if P of k is true, then P of k plus 1 is true. Together they make a chain of dominoes: P of 1 gives P of 2, which gives P of 3, and so on. The conclusion is that P of n is true for every n from 1 upwards.',
      'Induction is a line of dominoes: the first one falls (base case), and each one knocks over the next (inductive step).',
      ['Base case|P(1) is true|accent', 'Inductive step|if P(k) then P(k + 1)|accent2', 'The chain|P(1) → P(2) → P(3) → ...', 'Conclusion|P(n) for every n ≥ 1|good'],
      { perRow: 4, at: 'end' },
    ),
    trace(
      'loop-invariant-trace',
      'Proofs and programs',
      'A step-through of a loop that adds the first three odd numbers. After each pass the total equals k squared: 0, then 1, then 4, then 9. This fact is the loop invariant, and its truth after every pass is an induction proof.',
      'After every pass, total = k². True at the start (base case) and preserved by each pass (inductive step).',
      ['total = 0', 'k = 0', 'while k < n:', '    k += 1', '    total += 2 * k - 1'],
      [
        { line: 1, vars: { total: 0 }, note: 'Start: total is 0.' },
        { line: 2, vars: { total: 0, k: 0 }, note: 'Invariant holds before the loop: total = 0 = 0² (the base case).' },
        { line: 4, vars: { total: 0, k: 1 }, note: 'Pass 1: k becomes 1.' },
        { line: 5, vars: { total: 1, k: 1 }, note: 'Add the 1st odd number, 1. total = 1 = 1²: the invariant is preserved.' },
        { line: 4, vars: { total: 1, k: 2 }, note: 'Pass 2: k becomes 2.' },
        { line: 5, vars: { total: 4, k: 2 }, note: 'Add 3. total = 4 = 2².' },
        { line: 4, vars: { total: 4, k: 3 }, note: 'Pass 3: k becomes 3.' },
        { line: 5, vars: { total: 9, k: 3 }, note: 'Add 5. total = 9 = 3².' },
        { line: 3, vars: { total: 9, k: 3 }, output: 'total = 9', note: 'k < n is false (n = 3), so the loop ends with k = n and the invariant gives total = n² = 9.' },
      ],
      { at: 'end' },
    ),
    cards(
      'four-proof-methods',
      'Writing a good proof',
      'Four cards for the four proof methods. A direct proof assumes p and derives q. A contrapositive proof assumes not q and derives not p. A proof by contradiction assumes the opposite and reaches an impossibility. A proof by induction proves a base case and a step from k to k plus 1.',
      'Four tools. Choose the one that makes the first step easiest.',
      [
        { title: 'Direct', badge: 'p → q', tone: 'info', bullets: ['Assume p', 'Use definitions and algebra', 'Arrive at q'] },
        { title: 'Contrapositive', badge: '¬q → ¬p', tone: 'accent', bullets: ['Assume the conclusion is false', 'Derive that the hypothesis is false', 'Equivalent to the original'] },
        { title: 'Contradiction', badge: 'assume ¬S', tone: 'warn', bullets: ['Assume the statement is false', 'Derive an impossible result', 'So the statement is true'] },
        { title: 'Induction', badge: 'P(n), n ≥ 1', tone: 'good', bullets: ['Base case: P(1)', 'Step: P(k) gives P(k + 1)', 'Use the hypothesis!'] },
      ],
      { at: 'end' },
    ),
    lab(
      'invariant-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that adds the first n odd numbers and asserts the loop invariant at every pass, with its expected output.',
      'Change the invariant to check total == k * (k + 1) // 2 for the loop that adds 1, 2, 3, ... instead.',
      `def sum_of_odds(n):
    total = 0
    k = 0
    while k < n:
        assert total == k * k            # invariant: after k passes, total = k^2
        k += 1
        total += 2 * k - 1               # add the k-th odd number
    assert total == n * n                # invariant plus "k == n" gives the result
    return total


for n in (0, 1, 5, 10):
    print(f"sum of the first {n} odd numbers = {sum_of_odds(n)} = {n}^2")
print("the invariant held at every pass")`,
      { expected: 'sum of the first 0 odd numbers = 0 = 0^2\nsum of the first 1 odd numbers = 1 = 1^2\nsum of the first 5 odd numbers = 25 = 5^2\nsum of the first 10 odd numbers = 100 = 10^2\nthe invariant held at every pass', filename: 'invariant.py', at: 'end' },
    ),
  ],
  [`${M}/5`]: [
    grid(
      'order-decision',
      'Combinations',
      'A decision flowchart. Ask whether order matters. If yes, use permutations: P of n and r equals n factorial over n minus r factorial. If no, use combinations: C of n and r equals n factorial over r factorial times n minus r factorial.',
      'The first question for every counting problem: does order matter?',
      [
        ['q', 'decision', 'Does order matter?', 0, 0, 'warn'],
        ['p', 'terminator', 'Permutation: P(n, r) = n! / (n − r)!', -1.2, 1.4, 'accent'],
        ['c', 'terminator', 'Combination: C(n, r) = n! / (r! (n − r)!)', 1.2, 1.4, 'good'],
      ],
      [
        ['q', 'p', 'Yes (a ranking, a PIN)'],
        ['q', 'c', 'No (a committee, a hand of cards)'],
      ],
      { dx: 235, dy: 95, w: 215, at: 'end' },
    ),
    table(
      'pascal-triangle',
      'Combinations',
      'The first seven rows of Pascal’s triangle, which lists the values of n choose r. Row 4 is 1, 4, 6, 4, 1 and row 5 is 1, 5, 10, 10, 5, 1. Each number is the sum of the two above it, and each row is symmetric.',
      'Each entry is the sum of the two above it. Row n lists C(n, 0) to C(n, n), and its sum is 2ⁿ.',
      ['n', 'r = 0', 'r = 1', 'r = 2', 'r = 3', 'r = 4', 'r = 5', 'r = 6'],
      [
        ['0', '1', '', '', '', '', '', ''],
        ['1', '1', '1', '', '', '', '', ''],
        ['2', '1', '2', '1', '', '', '', ''],
        ['3', '1', '3', '3', '1', '', '', ''],
        ['4', '1', '4', '6', '4', '1', '', ''],
        ['5', '1', '5', '10', '10', '5', '1', ''],
        ['6', '1', '6', '15', '20', '15', '6', '1'],
      ],
      { at: 'end', highlights: [{ row: 5, col: 3, tone: 'good', note: 'C(5, 2) = 10' }, { row: 4, col: 3, tone: 'info' }, { row: 4, col: 2, tone: 'info' }] },
    ),
    table(
      'two-dice-table',
      'Probability',
      'A six-by-six table of the sums of two dice. The sum 7 appears six times, along one diagonal, out of 36 equally likely outcomes, so its probability is 6 over 36, which is 1 over 6. The sums 2 and 12 appear only once.',
      'The 36 pairs are equally likely, but the sums are not: 7 appears six times, 2 and 12 only once.',
      ['+', '1', '2', '3', '4', '5', '6'],
      [
        ['1', '2', '3', '4', '5', '6', '7'],
        ['2', '3', '4', '5', '6', '7', '8'],
        ['3', '4', '5', '6', '7', '8', '9'],
        ['4', '5', '6', '7', '8', '9', '10'],
        ['5', '6', '7', '8', '9', '10', '11'],
        ['6', '7', '8', '9', '10', '11', '12'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 6, tone: 'good' }, { row: 1, col: 5, tone: 'good' }, { row: 2, col: 4, tone: 'good' }, { row: 3, col: 3, tone: 'good' }, { row: 4, col: 2, tone: 'good' }, { row: 5, col: 1, tone: 'good' }] },
    ),
    V(
      'chart',
      'birthday-chart',
      'Simulation and the birthday paradox',
      'A line chart of the probability that at least two people share a birthday, for groups of 5 to 60 people. It is 0.03 for 5 people, 0.51 for 23 people, 0.89 for 40 people and 0.99 for 60 people.',
      'The chance rises much faster than intuition expects: 23 people are enough for even odds.',
      {
        kind: 'line',
        xLabel: 'People in the room',
        yLabel: 'Probability of a shared birthday',
        categories: ['5', '10', '15', '20', '23', '30', '40', '50', '60'],
        series: [{ name: 'P(shared birthday)', values: [0.027, 0.117, 0.253, 0.411, 0.507, 0.706, 0.891, 0.97, 0.994] }],
      },
      { at: 'end' },
    ),
    lab(
      'counting-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program that counts PINs, committees and arrangements with formulas and checks two of them by brute force, with its expected output.',
      'Add the number of ways to arrange 5 students in a line, and the number of ways to choose 2 of them to carry a banner.',
      `from itertools import combinations, permutations
from math import comb, factorial, perm

print("PINs with 4 digits:", 10 ** 4)
print("PINs with no repeated digit:", perm(10, 4), "| brute force:", sum(1 for p in permutations(range(10), 4)))
print("committees of 3 from 10:", comb(10, 3), "| brute force:", sum(1 for c in combinations(range(10), 3)))
print("captain, vice, treasurer from 10:", perm(10, 3))
print("ways to arrange MISSISSIPPI:", factorial(11) // (factorial(4) * factorial(4) * factorial(2)))
print("PINs with a repeated digit:", 10 ** 4 - perm(10, 4))`,
      { expected: 'PINs with 4 digits: 10000\nPINs with no repeated digit: 5040 | brute force: 5040\ncommittees of 3 from 10: 120 | brute force: 120\ncaptain, vice, treasurer from 10: 720\nways to arrange MISSISSIPPI: 34650\nPINs with a repeated digit: 4960', filename: 'counting.py', at: 'end' },
    ),
  ],
  [`${M}/6`]: [
    graph(
      'campus-graph',
      'Graphs and degrees',
      'A weighted graph of nine campus places and ten footpaths with their lengths in metres. Gate connects to Library (120) and Canteen (80). Library connects to Lab (60) and Hall (90). Canteen connects to Lab (70) and Field (100). Hall connects to Office (40). Field connects to Dorm (110). Dorm connects to Office (55) and Garden (45). The Garden is joined only to the Dorm.',
      'The campus as a graph: places are vertices and footpaths are edges with their lengths. The Dorm–Garden path is the only way to the Garden.',
      [
        { id: 'Gate', x: 50, y: 120 },
        { id: 'Library', x: 170, y: 45 },
        { id: 'Canteen', x: 170, y: 195 },
        { id: 'Lab', x: 295, y: 120 },
        { id: 'Hall', x: 320, y: 30 },
        { id: 'Field', x: 330, y: 215 },
        { id: 'Office', x: 450, y: 55 },
        { id: 'Dorm', x: 460, y: 170 },
        { id: 'Garden', x: 560, y: 215 },
      ],
      [['Gate', 'Library', 120], ['Gate', 'Canteen', 80], ['Library', 'Lab', 60], ['Library', 'Hall', 90], ['Canteen', 'Lab', 70], ['Canteen', 'Field', 100], ['Hall', 'Office', 40], ['Field', 'Dorm', 110], ['Dorm', 'Office', 55], ['Dorm', 'Garden', 45]],
      { at: 'end' },
    ),
    table(
      'konigsberg-degrees',
      'Euler paths and circuits',
      'A table of the four land areas of Königsberg and the number of bridges at each. Area A has 5 bridges and areas B, C and D have 3 each. All four degrees are odd, so by Euler’s theorem there is no walk that crosses every bridge exactly once.',
      'Four vertices of odd degree: Euler proved that no walk can cross each bridge exactly once.',
      ['Land area', 'Bridges (degree)', 'Odd or even?'],
      [
        ['A (the island)', '5', 'odd'],
        ['B', '3', 'odd'],
        ['C', '3', 'odd'],
        ['D', '3', 'odd'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 2, tone: 'bad' }, { row: 1, col: 2, tone: 'bad' }, { row: 2, col: 2, tone: 'bad' }, { row: 3, col: 2, tone: 'bad' }] },
    ),
    cards(
      'euler-rules',
      'Euler paths and circuits',
      'Three cards summarising Euler’s theorem for a connected graph. If every vertex has even degree, an Euler circuit exists. If exactly two vertices have odd degree, an Euler path exists from one to the other. If more than two vertices have odd degree, no Euler walk exists.',
      'Count the odd vertices: 0 gives a circuit, 2 gives a path, anything else gives nothing.',
      [
        { title: 'All degrees even', badge: 'Euler circuit', tone: 'good', bullets: ['A closed walk using every edge once', 'Start anywhere, end where you started', 'Example: a square'] },
        { title: 'Exactly two odd', badge: 'Euler path', tone: 'info', bullets: ['Start at one odd vertex', 'End at the other', 'Example: a square with one diagonal'] },
        { title: 'More than two odd', badge: 'No Euler walk', tone: 'bad', bullets: ['Four or more vertices of odd degree', 'Königsberg: four odd areas', 'Add edges to fix the degrees'] },
      ],
      { at: 'end' },
    ),
    graph(
      'kruskal-steps',
      'Trees and spanning trees',
      'A step-through of Kruskal’s algorithm on a graph of five vertices. The edges are sorted by weight. B–C (2), C–D (3), A–B (4) and C–E (5) are taken, because each joins two different groups. D–E (6), B–D (7) and A–C (8) would each close a cycle, so they are skipped. The tree has 4 edges and total weight 14.',
      'Take the cheapest edges first, but skip any edge that would close a cycle. Five vertices need four edges.',
      [
        { id: 'A', x: 60, y: 110 },
        { id: 'B', x: 200, y: 40 },
        { id: 'C', x: 210, y: 185 },
        { id: 'D', x: 360, y: 55 },
        { id: 'E', x: 380, y: 190 },
      ],
      [['A', 'B', 4], ['A', 'C', 8], ['B', 'C', 2], ['B', 'D', 7], ['C', 'D', 3], ['C', 'E', 5], ['D', 'E', 6]],
      {
        at: 'end',
        steps: [
          { visit: [], edges: [], note: 'Sort the edges by weight: B–C 2, C–D 3, A–B 4, C–E 5, D–E 6, B–D 7, A–C 8.' },
          { visit: ['B', 'C'], edges: [['B', 'C']], note: 'Take B–C (2): it joins two different groups.' },
          { visit: ['B', 'C', 'D'], edges: [['B', 'C'], ['C', 'D']], note: 'Take C–D (3): D joins the group {B, C}.' },
          { visit: ['A', 'B', 'C', 'D'], edges: [['B', 'C'], ['C', 'D'], ['A', 'B']], note: 'Take A–B (4): A joins the group.' },
          { visit: ['A', 'B', 'C', 'D', 'E'], edges: [['B', 'C'], ['C', 'D'], ['A', 'B'], ['C', 'E']], note: 'Take C–E (5): E joins. Now all five vertices are connected by 4 edges: a tree.' },
          { visit: ['A', 'B', 'C', 'D', 'E'], edges: [['B', 'C'], ['C', 'D'], ['A', 'B'], ['C', 'E']], note: 'D–E (6), B–D (7) and A–C (8) would close cycles, so they are skipped. Total weight 2 + 3 + 4 + 5 = 14.' },
        ],
      },
    ),
    lab(
      'euler-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that finds the connected components of a graph and uses the degrees to decide whether an Euler circuit or path exists, with its expected output.',
      'Add a fifth vertex E joined to D only, and predict the new verdict before you run it.',
      `def components(vertices, edges):
    adjacent = {v: [] for v in vertices}
    for a, b in edges:
        adjacent[a].append(b)
        adjacent[b].append(a)
    seen, groups = set(), []
    for start in vertices:
        if start in seen:
            continue
        group, stack = [], [start]
        seen.add(start)
        while stack:
            v = stack.pop()
            group.append(v)
            for w in adjacent[v]:
                if w not in seen:
                    seen.add(w)
                    stack.append(w)
        groups.append(sorted(group))
    return groups


def euler_verdict(vertices, edges):
    degree = {v: 0 for v in vertices}
    for a, b in edges:
        degree[a] += 1
        degree[b] += 1
    odd = sorted(v for v in vertices if degree[v] % 2 == 1)
    if len(components(vertices, edges)) > 1:
        return "not connected"
    if not odd:
        return "Euler circuit exists"
    if len(odd) == 2:
        return f"Euler path exists from {odd[0]} to {odd[1]}"
    return f"no Euler walk ({len(odd)} odd vertices)"


square = ["A", "B", "C", "D"]
print("square:", euler_verdict(square, [("A", "B"), ("B", "C"), ("C", "D"), ("D", "A")]))
print("square with one diagonal:", euler_verdict(square, [("A", "B"), ("B", "C"), ("C", "D"), ("D", "A"), ("A", "C")]))
print("square with both diagonals:", euler_verdict(square, [("A", "B"), ("B", "C"), ("C", "D"), ("D", "A"), ("A", "C"), ("B", "D")]))
print("two separate edges:", euler_verdict(square, [("A", "B"), ("C", "D")]))`,
      { expected: 'square: Euler circuit exists\nsquare with one diagonal: Euler path exists from A to C\nsquare with both diagonals: no Euler walk (4 odd vertices)\ntwo separate edges: not connected', filename: 'euler.py', at: 'end' },
    ),
  ],
  [`${M}/7`]: [
    trace(
      'hanoi-recurrence-trace',
      'Recurrence relations',
      'A step-through of a loop that computes the Tower of Hanoi move counts from the recurrence H of n equals 2 times H of n minus 1 plus 1. Starting from 0, the values are 1, 3, 7 and 15 for 1, 2, 3 and 4 disks.',
      'A recurrence is easy to compute: each term comes from the one before. Each extra disk doubles the work and adds one.',
      ['h = 0', 'for n in range(1, 5):', '    h = 2 * h + 1'],
      [
        { line: 1, vars: { h: 0 }, note: 'H(0) = 0: no disks need no moves.' },
        { line: 3, vars: { n: 1, h: 1 }, note: 'H(1) = 2 × 0 + 1 = 1.' },
        { line: 3, vars: { n: 2, h: 3 }, note: 'H(2) = 2 × 1 + 1 = 3.' },
        { line: 3, vars: { n: 3, h: 7 }, note: 'H(3) = 2 × 3 + 1 = 7.' },
        { line: 3, vars: { n: 4, h: 15 }, output: '15', note: 'H(4) = 2 × 7 + 1 = 15. The pattern is 2ⁿ − 1.' },
      ],
      { at: 'end' },
    ),
    table(
      'hanoi-table',
      'Recurrence relations',
      'A table of the minimum number of moves for the Tower of Hanoi: 0 disks need 0 moves, 1 disk 1, 2 disks 3, 3 disks 7, 4 disks 15, 5 disks 31 and 6 disks 63. Each value is one less than a power of two.',
      'Each extra disk doubles the work and adds one move: H(n) = 2^n − 1.',
      ['Disks n', 'Moves H(n)', 'Pattern'],
      [
        ['0', '0', '2⁰ − 1'],
        ['1', '1', '2¹ − 1'],
        ['2', '3', '2² − 1'],
        ['3', '7', '2³ − 1'],
        ['4', '15', '2⁴ − 1'],
        ['5', '31', '2⁵ − 1'],
        ['6', '63', '2⁶ − 1'],
      ],
      { at: 'end', highlights: [{ row: 6, col: 1, tone: 'good' }] },
    ),
    treeSteps(
      'hanoi-tree',
      'Solving recurrences',
      'Two frames of the recursion for the Tower of Hanoi with 3 disks. First, moving 3 disks means moving 2 disks, moving the biggest disk, and moving 2 disks again. Then each group of 2 disks splits the same way into two single-disk moves and one move of disk 2. There are 7 moves at the leaves and the middle nodes.',
      'To move n disks: move n − 1 disks, move the biggest, move n − 1 disks. H(3) = 2 × 3 + 1 = 7.',
      [
        { root: { label: 'move 3 disks: 7 moves', children: [{ label: 'move 2 disks: 3 moves', tone: 'info' }, { label: 'move disk 3: 1 move', tone: 'good' }, { label: 'move 2 disks: 3 moves', tone: 'info' }] }, note: 'The recurrence H(3) = 2 H(2) + 1: two smaller towers and one big move.' },
        { root: { label: 'move 3 disks: 7 moves', children: [{ label: 'move 2 disks: 3 moves', tone: 'info', children: [{ label: 'move disk 1' }, { label: 'move disk 2', tone: 'good' }, { label: 'move disk 1' }] }, { label: 'move disk 3', tone: 'good' }, { label: 'move 2 disks: 3 moves', tone: 'info', children: [{ label: 'move disk 1' }, { label: 'move disk 2', tone: 'good' }, { label: 'move disk 1' }] }] }, note: 'Unrolled: 7 single-disk moves in all (the seven leaves).' },
      ],
      { at: 'end' },
    ),
    V(
      'chart',
      'growth-chart',
      'Solving recurrences',
      'A line chart of three sequences for n from 0 to 8. The arithmetic sequence 2 plus 3n grows steadily to 26, the Fibonacci numbers grow faster to 21, and the doubling sequence 5 times 2 to the n shoots up to 1,280.',
      'Arithmetic grows by a constant, Fibonacci by a ratio of about 1.6, and doubling by a ratio of 2: geometric growth soon wins.',
      {
        kind: 'line',
        xLabel: 'n',
        yLabel: 'Term',
        categories: ['0', '1', '2', '3', '4', '5', '6', '7', '8'],
        series: [
          { name: 'Arithmetic 2 + 3n', values: [2, 5, 8, 11, 14, 17, 20, 23, 26] },
          { name: 'Fibonacci', values: [0, 1, 1, 2, 3, 5, 8, 13, 21] },
          { name: 'Doubling 5·2ⁿ', values: [5, 10, 20, 40, 80, 160, 320, 640, 1280] },
        ],
      },
      { at: 'end' },
    ),
    lab(
      'hanoi-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that solves the Tower of Hanoi for 3 disks by recursion, prints the seven moves, and compares the number of moves for 1 to 7 disks with 2 to the n minus 1, with its expected output.',
      'Add n = 20 to the table: how many moves is that, and how long would it take at one move per second?',
      `def hanoi(n, source, spare, target, moves):
    if n == 0:
        return
    hanoi(n - 1, source, target, spare, moves)
    moves.append((n, source, target))
    hanoi(n - 1, spare, source, target, moves)


moves = []
hanoi(3, "A", "B", "C", moves)
for disk, source, target in moves:
    print(f"move disk {disk} from {source} to {target}")

print("n  moves  2^n - 1")
for n in range(1, 8):
    recorded = []
    hanoi(n, "A", "B", "C", recorded)
    print(f"{n}  {len(recorded):>5}  {2 ** n - 1:>7}")`,
      { expected: 'move disk 1 from A to C\nmove disk 2 from A to B\nmove disk 1 from C to B\nmove disk 3 from A to C\nmove disk 1 from B to A\nmove disk 2 from B to C\nmove disk 1 from A to C\nn  moves  2^n - 1\n1      1        1\n2      3        3\n3      7        7\n4     15       15\n5     31       31\n6     63       63\n7    127      127', filename: 'hanoi.py', at: 'end' },
    ),
  ],
  [`${M}/8`]: [
    automaton(
      'ends-with-01',
      'Deterministic finite automata',
      'A state diagram of a DFA with three states that accepts binary strings ending in 01. State q0 means no useful tail, q1 means the last symbol was 0, and q2 means the last two symbols were 01 and is accepting. Reading 0 always leads to q1; reading 1 from q1 leads to q2; reading 1 from q0 or q2 leads to q0.',
      'Three states remember just enough of the tail: nothing useful, "0", or "01". Try the test strings.',
      ['q0', 'q1', 'q2'],
      'q0',
      ['q2'],
      [
        ['q0', 'q1', '0'],
        ['q0', 'q0', '1'],
        ['q1', 'q1', '0'],
        ['q1', 'q2', '1'],
        ['q2', 'q1', '0'],
        ['q2', 'q0', '1'],
      ],
      { at: 'end', test: ['1101', '001', '10', '0101'] },
    ),
    automaton(
      'divisible-by-3',
      'Deterministic finite automata',
      'A state diagram of a DFA that accepts binary numbers divisible by 3. The states r0, r1 and r2 are the remainder of the number read so far. Reading a bit b moves from remainder r to remainder 2r plus b, modulo 3. The start state and the only accepting state is r0.',
      'The states are the remainders mod 3. Each bit turns the remainder r into (2r + b) mod 3: a finite machine checks a number of any length.',
      ['r0', 'r1', 'r2'],
      'r0',
      ['r0'],
      [
        ['r0', 'r0', '0'],
        ['r0', 'r1', '1'],
        ['r1', 'r2', '0'],
        ['r1', 'r0', '1'],
        ['r2', 'r1', '0'],
        ['r2', 'r2', '1'],
      ],
      { at: 'end', test: ['11', '110', '101', '1001'] },
    ),
    automaton(
      'mobile-prefix-dfa',
      'Deterministic finite automata',
      'A DFA for the first four symbols of a Bangladeshi mobile number. State s0 expects the digit 0, s1 expects 1, s2 expects a digit from 3 to 9 and s3 expects any digit. State s4, reached after four correct symbols, is accepting. Any other symbol, and any symbol after s4, leads to a dead state that is never left.',
      'A four-symbol prefix machine: any unexpected symbol falls into the dead state for good. (The project DFA continues the same way up to state s11.)',
      ['s0', 's1', 's2', 's3', 's4', 'dead'],
      's0',
      ['s4'],
      [
        ['s0', 's1', '0'],
        ['s1', 's2', '1'],
        ['s2', 's3', '3-9'],
        ['s3', 's4', '0-9'],
        ['s0', 'dead', 'other'],
        ['s1', 'dead', 'other'],
        ['s2', 'dead', 'other'],
        ['s4', 'dead', 'any'],
      ],
      { at: 'end' },
    ),
    table(
      'language-hierarchy',
      'Regular languages and what a DFA cannot do',
      'A table of three kinds of machine. A finite automaton has only a finite number of states, recognises the regular languages and can check strings ending in 01 but not balanced brackets. A pushdown automaton adds a stack, recognises the context-free languages and can check balanced brackets. A Turing machine has an unbounded tape and can compute anything that can be computed.',
      'More memory, more power: finite states, then a stack, then an unbounded tape.',
      ['Machine', 'Memory', 'Language class', 'Can do', 'Cannot do'],
      [
        ['DFA / NFA / regex', 'finitely many states', 'regular', 'strings ending in 01', 'balanced brackets, aⁿbⁿ'],
        ['Pushdown automaton', 'states + one stack', 'context-free', 'balanced brackets, aⁿbⁿ', 'aⁿbⁿcⁿ'],
        ['Turing machine', 'an unbounded tape', 'recursively enumerable', 'any algorithm', 'solve the halting problem'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 4, tone: 'warn' }] },
    ),
    lab(
      'dfa-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that runs a three-state DFA for strings ending in 01 and checks it against a regular expression on all 511 binary strings of length 0 to 8, with its expected output.',
      'Change the DFA and the regex to "strings that contain 11". How many states do you need?',
      `import re
from itertools import product

# States: 0 = no useful tail, 1 = last symbol was 0, 2 = last two symbols were 01.
delta = {
    (0, "0"): 1, (0, "1"): 0,
    (1, "0"): 1, (1, "1"): 2,
    (2, "0"): 1, (2, "1"): 0,
}
start, accepting = 0, {2}


def run(text):
    state = start
    for symbol in text:
        state = delta[(state, symbol)]
    return state in accepting


print("trace of 1101:", end=" ")
state = start
for symbol in "1101":
    state = delta[(state, symbol)]
    print(state, end=" ")
print("-> accepted:", state in accepting)

checked = agree = 0
for length in range(0, 9):
    for bits in product("01", repeat=length):
        text = "".join(bits)
        checked += 1
        agree += run(text) == bool(re.fullmatch(r"[01]*01", text))
print("strings checked:", checked, "| DFA and regex agree on:", agree)`,
      { expected: 'trace of 1101: 0 0 1 2 -> accepted: True\nstrings checked: 511 | DFA and regex agree on: 511', filename: 'dfa.py', at: 'end' },
    ),
  ],
  // @@visuals-end
});

registerQuizCatalog({
  [`${M}/1`]: [
    mcq('q1', 'Which statement is the contrapositive of "If it rains, the match is cancelled"?', ['If the match is not cancelled, then it did not rain', 'If the match is cancelled, then it rained', 'If it does not rain, then the match is not cancelled', 'It rains and the match is not cancelled'], 'The contrapositive of p → q is ¬q → ¬p, and it is equivalent to the original. The second choice is the converse and the third is the inverse; neither is equivalent.'),
    mcq('q2', 'What does this program print?', ['False True True', 'True False False', 'False False True', 'True True True'], '(not p) or q is False or False = False. p and (not q) is True and True = True. p != q is the exclusive or, and it is True because p and q differ.', PY('p = True\nq = False\nprint((not p) or q, p and (not q), p != q)')),
    mcq('q3', 'How is "p only if q" written in logic?', ['p → q', 'q → p', 'p ↔ q', 'p ∧ q'], '"p only if q" means p can happen only when q does: if p then q. The reverse reading, q → p, is "p if q".'),
    mcq('q4', 'Which formula is logically equivalent to ¬(p ∨ q)?', ['¬p ∧ ¬q', '¬p ∨ ¬q', 'p ∧ q', '¬p → q'], 'By De Morgan’s law, negating an OR gives an AND of the negations: "neither p nor q" means not p and not q.'),
    mcq('q5', 'What does this program print?', ['False True', 'True True', 'True False', 'False False'], 'all(...) is ∀: not every number in the list is even (7 is odd), so it is False. any(...) is ∃: there is an odd number, 7, so it is True.', PY('domain = [2, 4, 6, 7]\nprint(all(x % 2 == 0 for x in domain), any(x % 2 == 1 for x in domain))')),
  ],
  [`${M}/2`]: [
    mcq('q1', 'What does this program print?', ['[3, 4] [1, 2] [1, 2, 5]', '[1, 2, 3, 4, 5] [1, 2] [3, 4]', '[3, 4] [5] [1, 2, 3, 4, 5]', '[1, 2] [3, 4] [5]'], 'A & B is the intersection {3, 4}; A - B is the difference {1, 2}; A ^ B is the symmetric difference: the elements in exactly one set, {1, 2, 5}.', PY('A = {1, 2, 3, 4}\nB = {3, 4, 5}\nprint(sorted(A & B), sorted(A - B), sorted(A ^ B))')),
    mcq('q2', 'How many subsets does a set with 5 elements have?', ['32', '10', '25', '5'], 'Each of the 5 elements is either in a subset or not, so there are 2 × 2 × 2 × 2 × 2 = 2⁵ = 32 subsets, including the empty set and the set itself.'),
    mcq('q3', 'In a class of 30, 18 study maths, 12 study physics and 5 study both. How many study neither?', ['5', '0', '7', '10'], 'At least one: 18 + 12 − 5 = 25 students. So 30 − 25 = 5 study neither.'),
    mcq('q4', 'By De Morgan’s law, which set is equal to the complement of A ∩ B?', ['Aᶜ ∪ Bᶜ', 'Aᶜ ∩ Bᶜ', 'A ∪ B', 'A − B'], 'The complement of an intersection is the union of the complements, just as ¬(p ∧ q) is ¬p ∨ ¬q in logic.'),
    mcq('q5', 'What does this program print?', ['3 True True', '6 True True', '3 False True', '3 True False'], 'A set keeps each element once, so {1, 2, 2, 3, 3, 3} has 3 elements. 2 is an element, and {2} is a subset.', PY('s = {1, 2, 2, 3, 3, 3}\nprint(len(s), 2 in s, {2} <= s)')),
  ],
  [`${M}/3`]: [
    mcq('q1', 'Which properties together make a relation an equivalence relation?', ['Reflexive, symmetric and transitive', 'Reflexive, antisymmetric and transitive', 'Symmetric and antisymmetric', 'Injective and surjective'], 'An equivalence relation is reflexive, symmetric and transitive; it splits the set into equivalence classes. Reflexive, antisymmetric and transitive describes a partial order.'),
    mcq('q2', 'What does this program print?', ['2 2 1', '2 -3 1', '17 3 56', '2 2 6'], '17 % 5 is 2. In Python (-3) % 5 is 2, because the result always has the sign of the divisor and lies between 0 and 4. And 56 % 5 is 1.', PY('print(17 % 5, (-3) % 5, (7 * 8) % 5)')),
    mcq('q3', 'Which statement about the relation "<" on the integers is correct?', ['It is transitive, but neither reflexive nor symmetric', 'It is reflexive and transitive, but not symmetric', 'It is symmetric and transitive, but it is not reflexive', 'It is an equivalence relation, so it splits the integers into classes'], 'a < a is never true, so "<" is not reflexive. a < b does not give b < a, so it is not symmetric. But a < b and b < c do give a < c: it is transitive.'),
    mcq('q4', 'The function f(x) = x² maps the integers to the integers. Which statement is true?', ['It is not injective, because f(2) = f(-2)', 'It is injective and surjective', 'It is surjective, because every integer is a square', 'It has an inverse function'], 'Two different inputs, 2 and −2, give the same output 4, so f is not injective. It is also not surjective (3 is not a square), and so it has no inverse.'),
    mcq('q5', 'What does this program print?', ['[[3, 6], [1, 4, 7], [2, 5]]', '[[1, 4, 7], [2, 5], [3, 6]]', '[[1, 2, 3], [4, 5, 6], [7]]', '[[0], [1], [2]]'], 'The numbers 1 to 7 are grouped by their remainder mod 3, and the groups are printed in the order of the remainders 0, 1 and 2: [3, 6], [1, 4, 7] and [2, 5].', PY('classes = {}\nfor x in range(1, 8):\n    classes.setdefault(x % 3, []).append(x)\nprint([classes[k] for k in sorted(classes)])')),
  ],
  [`${M}/4`]: [
    mcq('q1', 'Which value of n is a counterexample to the claim "for every integer n, n² > n"?', ['n = 1', 'n = 2', 'n = 10', 'n = -4'], 'For n = 1, n² = 1, and 1 > 1 is false. One counterexample is enough to disprove a "for all" claim. For 2, 10 and −4 the claim happens to be true.'),
    mcq('q2', 'What is the first step of a proof by contradiction of a statement S?', ['Assume that S is false', 'Assume that S is true and derive S', 'Test S on many examples', 'Prove the converse of S'], 'You assume the opposite of what you want to prove. If that assumption leads to something impossible, the assumption was wrong, so S is true.'),
    mcq('q3', 'In a proof by induction, what is the inductive hypothesis?', ['The assumption that P(k) is true for an arbitrary k', 'The proof that the first statement, P(1), is true', 'The final claim that P(n) is true for every natural number n', 'The statement P(k + 1), which is what has to be proved'], 'In the inductive step you assume P(k) (the hypothesis) and use it to prove P(k + 1). The base case is proved separately.'),
    mcq('q4', 'What does this program print?', ['25 True', '25 False', '15 False', '9 True'], 'The loop adds the first five odd numbers: 1 + 3 + 5 + 7 + 9 = 25, which equals 5².', PY('total = 0\nfor k in range(1, 6):\n    total += 2 * k - 1\nprint(total, total == 5 ** 2)')),
    mcq('q5', 'Which statement is logically equivalent to "if n² is even, then n is even"?', ['If n is odd, then n² is odd', 'If n is even, then n² is even', 'If n² is odd, then n is odd', 'n² is even and n is odd'], 'The contrapositive of p → q is ¬q → ¬p: "if n is not even (odd), then n² is not even (odd)". The second choice is the converse and the third is the inverse; neither is equivalent.'),
  ],
  [`${M}/5`]: [
    mcq('q1', 'How many different 3-letter codes can be made from the 26 letters A to Z if letters may repeat?', ['17,576', '15,600', '2,600', '78'], 'Each of the three positions can be any of 26 letters, independently: 26 × 26 × 26 = 17,576 (the product rule). 15,600 would be the count with no repeated letter.'),
    mcq('q2', 'What does this program print?', ['10 20', '20 10', '10 10', '5 2'], 'comb(5, 2) = 10 counts the unordered pairs; perm(5, 2) = 5 × 4 = 20 counts the ordered pairs. Each pair is counted twice when order matters.', PY('from math import comb, perm\nprint(comb(5, 2), perm(5, 2))')),
    mcq('q3', 'Which of these is a combination, where the order does not matter?', ['Choosing 3 students for a committee', 'Awarding gold, silver and bronze medals', 'Setting a four-digit PIN', 'Arranging 5 books on a shelf'], 'A committee is the same whichever order its members are listed in. Medals, PINs and shelf arrangements all depend on the order.'),
    mcq('q4', 'What does this program print?', ['1/6', '1/36', '1/12', '1/3'], 'Of the 36 equally likely pairs of two dice, six have equal numbers: (1,1) to (6,6). So the probability is 6/36 = 1/6.', PY('from fractions import Fraction\noutcomes = [(a, b) for a in range(1, 7) for b in range(1, 7)]\nprint(Fraction(sum(1 for a, b in outcomes if a == b), len(outcomes)))')),
    mcq('q5', 'A fair coin lands heads five times in a row. What is the probability that the next toss is heads?', ['1/2', 'Less than 1/2, because tails is due', 'More than 1/2, because heads is on a streak', '1/32'], 'Tosses are independent: the coin has no memory. The probability of heads on the next toss is still 1/2. (1/32 is the chance of the five heads before.)'),
  ],
  [`${M}/6`]: [
    mcq('q1', 'A graph has five vertices with degrees 2, 2, 3, 3 and 4. How many edges does it have?', ['7', '14', '5', '6'], 'By the handshaking lemma the degrees add up to twice the number of edges: 2 + 2 + 3 + 3 + 4 = 14, so there are 14 / 2 = 7 edges.'),
    mcq('q2', 'A connected graph has an even degree at every vertex. Which statement must be true?', ['It has an Euler circuit', 'It has no cycles', 'It is a tree', 'It has a bridge'], 'Euler’s theorem: a connected graph has an Euler circuit if and only if every vertex has even degree. A graph with all degrees even always has cycles and never has a bridge.'),
    mcq('q3', 'How many edges does a tree with 12 vertices have?', ['11', '12', '13', '66'], 'A tree on n vertices always has exactly n − 1 edges: connected with no cycles. For 12 vertices that is 11 edges.'),
    mcq('q4', 'What does this program print?', ['[2, 2, 3, 1] True', '[1, 1, 2, 0] False', '[2, 2, 3, 1] False', '[4, 3, 2, 1] True'], 'The loop adds one to the degree of both ends of every edge, giving the degrees 2, 2, 3 and 1. Their sum, 8, is twice the 4 edges, as the handshaking lemma says.', PY('edges = [(0, 1), (0, 2), (1, 2), (2, 3)]\ndegree = [0] * 4\nfor a, b in edges:\n    degree[a] += 1\n    degree[b] += 1\nprint(degree, sum(degree) == 2 * len(edges))')),
    mcq('q5', 'What is a spanning tree of a connected graph?', ['A tree that contains every vertex, using some of the graph’s edges', 'A path that visits every edge of the graph exactly once', 'A cycle that visits every vertex of the graph exactly once', 'A smaller graph with the same edges but fewer vertices'], 'A spanning tree connects all the vertices with no cycles, so it keeps the graph connected with the fewest edges (n − 1). Kruskal’s algorithm finds one of minimum total weight.'),
  ],
  [`${M}/7`]: [
    mcq('q1', 'What does this program print?', ['14', '11', '12', '8'], 'The sequence starts at 2 and adds 3 four times: 5, 8, 11, 14. It is an arithmetic sequence with difference 3.', PY('a = 2\nfor _ in range(4):\n    a += 3\nprint(a)')),
    mcq('q2', 'What is the closed form of the recurrence a(n) = 2·a(n−1) with a(0) = 5?', ['a(n) = 5·2ⁿ', 'a(n) = 2·5ⁿ', 'a(n) = 5 + 2n', 'a(n) = 5n'], 'Each term is twice the previous one, so after n steps the starting value 5 has been doubled n times: 5·2ⁿ. It is a geometric sequence with ratio 2.'),
    mcq('q3', 'How many moves does the Tower of Hanoi need for 6 disks?', ['63', '64', '36', '12'], 'H(n) = 2ⁿ − 1, so H(6) = 64 − 1 = 63. By the recurrence: 1, 3, 7, 15, 31, 63.'),
    mcq('q4', 'What is the sum 1 + 2 + 3 + ... + 100?', ['5,050', '5,000', '5,100', '10,100'], 'Gauss’s formula n(n + 1)/2 gives 100 × 101 / 2 = 5,050. Pairing 1 with 100, 2 with 99, and so on gives 50 pairs, each adding to 101.'),
    mcq('q5', 'What does this program print?', ['55', '89', '34', '10'], 'This loop generates the Fibonacci numbers: after ten steps a holds the tenth Fibonacci number, 55 (0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55).', PY('a, b = 0, 1\nfor _ in range(10):\n    a, b = b, a + b\nprint(a)')),
  ],
  [`${M}/8`]: [
    mcq('q1', 'What does this program print?', ['True False', 'True True', 'False False', 'False True'], 'The pattern 01[3-9]\\d{8} needs the third digit to be 3 to 9, then eight more digits. 01712345678 fits; 01212345678 has a 2 as its third digit, so it does not.', PY('import re\npattern = r"01[3-9]\\d{8}"\nprint(bool(re.fullmatch(pattern, "01712345678")), bool(re.fullmatch(pattern, "01212345678")))')),
    mcq('q2', 'Which of these languages is not regular, so no DFA can recognise it?', ['Strings of n a’s followed by exactly n b’s (aⁿbⁿ)', 'Binary strings that end in 01', 'Binary numbers that are divisible by 3', 'Binary strings that contain an even number of 1s'], 'A DFA has only finitely many states, so it cannot count an unbounded number of a’s to compare with the b’s. The other three languages need only a fixed amount of memory.'),
    mcq('q3', 'What must a DFA have for every state and every symbol of the alphabet?', ['Exactly one transition', 'At least two transitions', 'No transition', 'A transition back to the start state'], 'In a deterministic automaton each (state, symbol) pair has exactly one next state. A dead state is often added to take the symbols that would otherwise have no transition.'),
    mcq('q4', 'What does this program print?', ['True', 'False', '0', '4'], 'The state flips between 0 and 1 for every 1 that is read. The string has four 1s, so the state ends at 0: an even number of 1s.', PY('state = 0\nfor bit in "110101":\n    if bit == "1":\n        state = 1 - state\nprint(state == 0)')),
    mcq('q5', 'Which regular expression matches exactly the strings a, ab, abb, abbb, and so on?', ['ab*', 'a*b', '(ab)*', 'a|b*'], 'ab* means one a followed by zero or more b’s. a*b needs a b at the end, (ab)* repeats the pair ab, and a|b* is either a single a or any number of b’s.'),
  ],
  // @@quiz-end
});
