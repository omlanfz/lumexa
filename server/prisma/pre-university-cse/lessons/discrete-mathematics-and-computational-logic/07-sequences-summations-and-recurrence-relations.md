# Lumexa Mission Log: Discrete Mathematics & Computational Logic

**Course/Path:** Discrete Mathematics & Computational Logic
**Lesson:** 07 of 08
**Title:** Sequences, Summations and Recurrence Relations
**Duration:** 60 minutes
**Difficulty:** Advanced
**Technology:** Sequences · recurrences (with Python)

---

## Mission Brief

An ancient legend tells of a temple with three pegs and 64 golden disks. Monks move one disk at a time, never putting a larger disk on a smaller one, and when the whole tower has moved from the first peg to the third, the world will end. How long does the monks' task take? For 3 disks, 7 moves. For 10 disks, 1,023. For 64 disks, 18,446,744,073,709,551,615 moves: even at one move per second, about 585 billion years.

You can find that number without playing the game, in two steps. First, notice that moving *n* disks takes twice the moves for *n* − 1 disks, plus one: **H(n) = 2·H(n − 1) + 1**. That is a **recurrence relation**. Second, **solve** it, replacing the self-referencing rule by a formula that gives H(n) directly: H(n) = 2ⁿ − 1. The same skill tells you how long a recursive algorithm takes, how fast a population or a loan grows, and why naive Fibonacci in Course 3 exploded. In this lesson you work with **sequences**, **sums** and **recurrences**, and build the **Recurrence Solver** for your dossier.

## Learning Objectives

1. Describe sequences by an explicit formula and by a recurrence, and recognise arithmetic and geometric sequences.
2. Use summation notation and the closed forms for arithmetic, square and geometric sums.
3. Set up recurrences for real problems, such as the Tower of Hanoi, and compute their terms.
4. Solve simple recurrences by iteration (unrolling) and verify a closed form by induction.
5. Solve a linear second-order recurrence with the characteristic equation, and relate recurrences to algorithm running times.
6. Build the Recurrence Solver: Python code that compares recurrence terms with closed forms and classifies sequences.

## Prerequisites

- Lesson 4: induction (used to verify closed forms) and Lesson 5: counting.
- Course 3: recursion, memoisation and the running times of merge sort and binary search.

## Concept Explanation

### Sequences

A **sequence** is an ordered list of numbers a₀, a₁, a₂, ... It can be given by an **explicit formula** (aₙ = 3n + 2 gives 2, 5, 8, 11, ...) or by a **recurrence**: a rule for aₙ in terms of earlier terms plus **initial conditions** that start it. Two families appear everywhere:

- An **arithmetic sequence** adds a constant **difference** d each step: aₙ = a₀ + n·d. (Pocket money that grows by 50 taka a week.)
- A **geometric sequence** multiplies by a constant **ratio** r: aₙ = a₀ · rⁿ. (Compound interest, population doubling.)

### Summations

The sum a₁ + a₂ + ... + aₙ is written with **sigma notation**: Σᵢ₌₁ⁿ aᵢ. Closed forms that you should know:

| Sum | Closed form |
|---|---|
| 1 + 2 + ... + n | n(n + 1) / 2 |
| 1² + 2² + ... + n² | n(n + 1)(2n + 1) / 6 |
| a + (a + d) + ... (n terms, arithmetic) | n/2 · (first + last) |
| 1 + r + r² + ... + rⁿ (r ≠ 1) | (rⁿ⁺¹ − 1) / (r − 1) |

Gauss's trick for 1 + 2 + ... + n: write the sum forwards and backwards; each pair adds to n + 1, and there are n pairs, so twice the sum is n(n + 1). Sums are linear: Σ (a·xᵢ + b·yᵢ) = a·Σ xᵢ + b·Σ yᵢ. Sums appear when you count the steps of nested loops: a loop `for i in range(n): for j in range(i)` runs 0 + 1 + ... + (n − 1) = n(n − 1)/2 times (the Big O analysis you did in Course 3).

### Recurrence relations

A **recurrence relation** defines aₙ from earlier terms. Examples: **factorial** n! = n · (n − 1)!; **Fibonacci** Fₙ = Fₙ₋₁ + Fₙ₋₂ with F₀ = 0, F₁ = 1; **Tower of Hanoi** Hₙ = 2Hₙ₋₁ + 1 with H₀ = 0 (move n − 1 disks away, move the largest, move n − 1 disks back on top); **compound interest** Bₙ = 1.05 · Bₙ₋₁. A recurrence is easy to *compute* (with a loop or recursion) but hard to *use* for a large n, so we want a **closed form**.

### Solving recurrences

**Iteration (unrolling).** Substitute the rule repeatedly until a pattern appears. For Hₙ = 2Hₙ₋₁ + 1: Hₙ = 2(2Hₙ₋₂ + 1) + 1 = 4Hₙ₋₂ + 3 = 8Hₙ₋₃ + 7 = ... = 2ᵏHₙ₋ₖ + (2ᵏ − 1). With k = n and H₀ = 0: **Hₙ = 2ⁿ − 1**.

**Guess and verify.** Compute some terms, guess the formula, and prove it by induction (Lesson 4). Check Hₙ = 2ⁿ − 1: base H₀ = 0 = 2⁰ − 1; step: 2Hₖ + 1 = 2(2ᵏ − 1) + 1 = 2ᵏ⁺¹ − 1. ✓

**Characteristic equation (linear, second order).** For aₙ = c₁aₙ₋₁ + c₂aₙ₋₂, try aₙ = rⁿ. Substituting gives **r² = c₁r + c₂**. If the equation has two different roots r₁ and r₂, then aₙ = A·r₁ⁿ + B·r₂ⁿ, where A and B are fixed by the initial conditions. For Fibonacci the roots are (1 ± √5)/2, which gives **Binet's formula**, with the golden ratio φ ≈ 1.618 as the growth rate.

### Recurrences and algorithms

The running time of a recursive algorithm is a recurrence. Binary search halves the problem: T(n) = T(n/2) + 1, so T(n) = log₂ n + 1. Merge sort splits in two and merges in n steps: **T(n) = 2T(n/2) + n**, which unrolls to T(n) = n·log₂ n + n for n a power of 2. The naive Fibonacci's number of calls satisfies C(n) = C(n − 1) + C(n − 2) + 1, which grows like φⁿ: exponential. For divide-and-conquer recurrences T(n) = a·T(n/b) + f(n), the **Master Theorem** gives the answer from a, b and f; you will meet it when you study algorithms further.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Sequence** | An ordered list of numbers a₀, a₁, a₂, ... |
| **Arithmetic / geometric sequence** | A sequence with a constant difference / a constant ratio. |
| **Summation (Σ)** | The sum of the terms of a sequence over a range. |
| **Closed form** | A formula that gives aₙ directly, without the earlier terms. |
| **Recurrence relation** | A rule that defines aₙ from earlier terms. |
| **Initial conditions** | The starting values that a recurrence needs. |
| **Iteration (unrolling)** | Solving a recurrence by substituting it into itself until a pattern appears. |
| **Characteristic equation** | The equation r² = c₁r + c₂ that gives the solutions of a linear recurrence. |
| **Tower of Hanoi** | A puzzle whose minimum number of moves satisfies H(n) = 2H(n − 1) + 1. |
| **Fibonacci sequence** | 0, 1, 1, 2, 3, 5, 8, ..., where each term is the sum of the previous two. |

## Worked Examples

### Example 1: Closed forms for sums

```python
for n in (1, 2, 10, 100):
    triangular = sum(range(1, n + 1))
    squares = sum(i * i for i in range(1, n + 1))
    geometric = sum(2 ** i for i in range(0, n + 1))
    ok = (
        triangular == n * (n + 1) // 2
        and squares == n * (n + 1) * (2 * n + 1) // 6
        and geometric == 2 ** (n + 1) - 1
    )
    print(f"n = {n:>3}: sum i = {triangular}, sum i^2 = {squares}, 2^0 + ... + 2^n = {geometric} | formulas agree: {ok}")
```

```output
n =   1: sum i = 1, sum i^2 = 1, 2^0 + ... + 2^n = 3 | formulas agree: True
n =   2: sum i = 3, sum i^2 = 5, 2^0 + ... + 2^n = 7 | formulas agree: True
n =  10: sum i = 55, sum i^2 = 385, 2^0 + ... + 2^n = 2047 | formulas agree: True
n = 100: sum i = 5050, sum i^2 = 338350, 2^0 + ... + 2^n = 2535301200456458802993406410751 | formulas agree: True
```

1. For each *n* the program computes three sums the slow way (with a loop) and compares them with the closed forms.
2. The triangular sum 1 + ... + 100 is 5050, which is 100 · 101 / 2: the story of Gauss as a schoolboy.
3. The geometric sum 2⁰ + 2¹ + ... + 2ⁿ equals 2ⁿ⁺¹ − 1. It is the same number as the Tower of Hanoi count, which is no accident.
4. Agreement for four values is evidence, not proof; the closed forms are proved by induction (Lesson 4).

### Example 2: The Tower of Hanoi

```python
def hanoi(n, source, spare, target, moves):
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
    print(f"{n}  {len(recorded):>5}  {2 ** n - 1:>7}")
```

```output
move disk 1 from A to C
move disk 2 from A to B
move disk 1 from C to B
move disk 3 from A to C
move disk 1 from B to A
move disk 2 from B to C
move disk 1 from A to C
n  moves  2^n - 1
1      1        1
2      3        3
3      7        7
4     15       15
5     31       31
6     63       63
7    127      127
```

1. To move *n* disks: move *n* − 1 disks out of the way, move the biggest disk, and move the *n* − 1 disks back on top. That is the recurrence H(n) = 2H(n − 1) + 1.
2. For 3 disks the program prints the 7 moves, and the table shows the move counts 1, 3, 7, 15, ..., which is the sequence 2ⁿ − 1.
3. The table compares the number of recorded moves with the closed form for n = 1 to 7. They agree every time.
4. The solution grows exponentially: each extra disk doubles the work, so 64 disks are far beyond any computer.

### Example 3: Iteration, closed forms and Fibonacci

```python
from math import sqrt


def merge_sort_cost(n):
    return 1 if n == 1 else 2 * merge_sort_cost(n // 2) + n


print("n   T(n) = 2T(n/2) + n   n*log2(n) + n")
for k in range(0, 7):
    n = 2 ** k
    print(f"{n:<4}{merge_sort_cost(n):<21}{n * k + n}")

phi = (1 + sqrt(5)) / 2
a, b = 0, 1
ok = True
for n in range(0, 31):
    if a != round(phi ** n / sqrt(5)):
        ok = False
    a, b = b, a + b
print("Fibonacci by recurrence equals Binet's formula for n = 0..30:", ok)
```

```output
n   T(n) = 2T(n/2) + n   n*log2(n) + n
1   1                    1
2   4                    4
4   12                   12
8   32                   32
16  80                   80
32  192                  192
64  448                  448
Fibonacci by recurrence equals Binet's formula for n = 0..30: True
```

1. The recurrence T(n) = 2T(n/2) + n for merge sort, computed directly, matches the closed form n·log₂ n + n for every power of two.
2. Unrolling gives the same result: T(n) = 2²T(n/4) + 2n = ... = n·T(1) + n·log₂ n.
3. Fibonacci numbers come out of the recurrence and from **Binet's formula** φⁿ/√5 (rounded): the golden ratio φ is the larger root of r² = r + 1.
4. The check runs up to n = 30. For larger n, floating-point rounding would eventually spoil Binet's formula, a reminder that closed forms and computers need care.

## Common Mistakes and Misconceptions

- **Forgetting the initial conditions.** Different starting values give completely different sequences: a recurrence is incomplete without them.
- **Off-by-one in the exponent.** 2⁰ + ... + 2ⁿ has n + 1 terms and equals 2ⁿ⁺¹ − 1, not 2ⁿ − 1.
- **Guessing a formula from two terms.** Two terms fit many formulas. Use at least four and then prove it.
- **Confusing arithmetic and geometric.** Constant *difference* is arithmetic; constant *ratio* is geometric.
- **Skipping the verification.** A guessed closed form is only a conjecture until it is checked by induction.
- **Treating the sum formula as valid for r = 1.** The geometric formula divides by r − 1; for r = 1 the sum is simply n + 1.
- **Using the characteristic equation for non-linear recurrences.** It only works for linear recurrences with constant coefficients.
- **Trusting floating-point closed forms for huge n.** Use integers when you can.

## Guided Hands-On Activity

**Compute, guess, verify.** Work with your teacher.

1. Classify each sequence as arithmetic, geometric or neither, and give its next two terms: 5, 8, 11, 14; 3, 6, 12, 24; 1, 4, 9, 16; 100, 90, 80, 70.
2. Use Gauss's trick to find 1 + 2 + ... + 200 by hand, and check with Python.
3. Type Example 2 and add `n = 20` to the table. How many moves is that, and how long would it take at one move per second?
4. Solve aₙ = aₙ₋₁ + 4 with a₀ = 3 by unrolling, then verify your formula by induction.
5. Write the recurrence for the number of binary strings of length n with no two consecutive 1s (Hint: the last symbol is 0 or the last two are 01). Compute the first six terms and find the pattern.
6. In Example 3, change `merge_sort_cost` to model binary search, T(n) = T(n/2) + 1, and compare it with log₂ n + 1.

## Lesson Project: Recurrence Solver

### Objective

Add the **Recurrence Solver** to the dossier: a Python program that generates the terms of five recurrences, compares them with the closed forms you derived, classifies sequences as arithmetic or geometric from their first terms, and solves a second-order recurrence with the characteristic equation.

### Requirements

- Write `terms(step, initial, count)` that returns the first `count` terms of a recurrence: `step` takes the list of earlier terms and returns the next one.
- Five recurrences and their closed forms (derive each closed form on paper, and use it in the program): (1) aₙ = aₙ₋₁ + 3, a₀ = 2; (2) aₙ = 2aₙ₋₁, a₀ = 5; (3) Hₙ = 2Hₙ₋₁ + 1, H₀ = 0; (4) aₙ = aₙ₋₁ + n, a₀ = 0; (5) aₙ = 3aₙ₋₁ − 2aₙ₋₂, a₀ = 1, a₁ = 3.
- For each recurrence, print the first eight terms and whether the recurrence and the closed form agree for n = 0 to 40.
- Write `classify(sequence)` that returns `arithmetic (d = ...)`, `geometric (r = ...)` or `neither`, and apply it to the first terms of the five sequences.
- For recurrence 5, solve the characteristic equation r² = 3r − 2 in code (with the quadratic formula), print the two roots and the constants A and B from the initial conditions, and show that A·r₁ⁿ + B·r₂ⁿ matches the terms.
- In the dossier, show the unrolling of recurrences 1 and 3, and an induction proof that recurrence 4 has the closed form n(n + 1)/2.

### Instructions

1. Derive each closed form on paper (unrolling for 1 to 4, the characteristic equation for 5), and keep the work for the dossier.
2. Write `terms`, using a loop that appends `step(sequence)` until it has enough terms.
3. Write the five `step` functions and the five closed-form functions, and the comparison for n = 0..40.
4. Write `classify` using the differences and the ratios of the first terms.
5. Solve the characteristic equation for recurrence 5 with the quadratic formula, and find A and B from a₀ and a₁ (two equations, two unknowns).
6. Print everything in the layout of the expected output.
7. Compare with the expected output and finish the dossier page.

### Expected Output

```text
Recurrence, first terms, closed form agrees for n = 0..40, type
  a(n) = a(n-1) + 3, a(0) = 2
    [2, 5, 8, 11, 14, 17, 20, 23]  agrees: True  type: arithmetic (d = 3)
  a(n) = 2 a(n-1), a(0) = 5
    [5, 10, 20, 40, 80, 160, 320, 640]  agrees: True  type: geometric (r = 2)
  H(n) = 2 H(n-1) + 1, H(0) = 0
    [0, 1, 3, 7, 15, 31, 63, 127]  agrees: True  type: neither
  a(n) = a(n-1) + n, a(0) = 0
    [0, 1, 3, 6, 10, 15, 21, 28]  agrees: True  type: neither
  a(n) = 3 a(n-1) - 2 a(n-2), a(0) = 1, a(1) = 3
    [1, 3, 7, 15, 31, 63, 127, 255]  agrees: True  type: neither

Characteristic equation of a(n) = 3 a(n-1) - 2 a(n-2)
  r^2 = 3r - 2 has roots 2 and 1
  a(n) = A * 2^n + B * 1^n with A = 2, B = -1
  formula matches the recurrence for n = 0..40: True
```

### Hints

1. **Hint 1 (the generator).** `seq = list(initial); while len(seq) < count: seq.append(step(seq))`.
2. **Hint 2 (step functions).** For recurrence 4 you need the index: `lambda s: s[-1] + len(s)`; for recurrence 5: `lambda s: 3 * s[-1] - 2 * s[-2]`.
3. **Hint 3 (the closed forms).** (1) 2 + 3n, (2) 5·2ⁿ, (3) 2ⁿ − 1, (4) n(n + 1)/2, (5) 2ⁿ⁺¹ − 1.
4. **Hint 4 (classify).** Arithmetic if all consecutive differences are equal; geometric if all consecutive ratios are equal and no term is zero.
5. **Hint 5 (roots).** r = (3 ± √(9 − 8)) / 2, which gives 2 and 1.
6. **Hint 6 (A and B).** A + B = a₀ and A·r₁ + B·r₂ = a₁; solve the two equations.

### Success Criteria

- [ ] `terms` is a generic function, and the five recurrences are expressed as `step` functions.
- [ ] All five closed forms agree with the recurrences for n = 0 to 40.
- [ ] `classify` reports arithmetic for recurrence 1, geometric for recurrence 2, and neither for recurrences 3, 4 and 5.
- [ ] The characteristic equation gives the roots 2 and 1, with A = 2 (for 2ⁿ) and B = −1 (for 1ⁿ), and matches the terms.
- [ ] The dossier page contains the unrolling of recurrences 1 and 3 and an induction proof for recurrence 4.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Add the recurrence for the number of binary strings of length n with no two consecutive 1s, solve it (it is Fibonacci in disguise), and check your closed form. Then write a function that estimates the *growth rate* of any sequence as the limit of aₙ₊₁ / aₙ, and use it on Fibonacci to approximate the golden ratio to ten digits.

## Lesson Recap

- A **sequence** can be given by an explicit formula or by a recurrence with initial conditions; **arithmetic** sequences add a constant, **geometric** sequences multiply by one.
- **Summation** formulas (triangular, squares, geometric) count loop iterations and cumulative quantities.
- A **recurrence** like H(n) = 2H(n − 1) + 1 is solved by **iteration** (unrolling) or by guessing and verifying with induction; linear second-order recurrences use the **characteristic equation**.
- The running time of recursive algorithms is a recurrence: binary search T(n) = T(n/2) + 1, merge sort T(n) = 2T(n/2) + n, naive Fibonacci exponential.
- Always check a closed form against the recurrence, and prove it by induction.

## Homework / Extension Mission

A bank pays 6% interest per year on 10,000 taka and you add 1,000 taka at the end of every year: Bₙ = 1.06·Bₙ₋₁ + 1000, B₀ = 10,000. Compute B₁₀ with your program, then solve the recurrence by unrolling to get a closed form (a geometric series is involved) and check that it gives the same B₁₀. Then use the closed form to find the first year in which the balance exceeds 50,000 taka. Write half a page on how this recurrence is like the Tower of Hanoi and how it differs.

## Course Project Connection

This lesson adds the **Recurrence Solver** to the **Computational Logic Challenge** dossier. It uses induction (Lesson 4) to verify formulas and counting (Lesson 5) to set up recurrences, and it explains the running times you measured in Course 3. In Lesson 8 you will use the same recursive thinking to build a pattern matcher, and the growth rates connect directly to Big O in every later course.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the Hanoi legend and the recurrence. 10 minutes: sequences and sums (Example 1). 15 minutes: recurrences and the unrolling method (Example 2, with real disks). 25 minutes: the project; the paper derivations are the heart, and students can finish them as homework.

**Live demonstrations.** Play Tower of Hanoi with three and four coins and count the moves aloud. Show Gauss's trick on the board with the numbers 1 to 10. Run the Fibonacci recursion with a call counter to connect with Course 3.

**Misconceptions.** "A recurrence is the same as a loop." "Two terms determine a sequence." "Geometric growth is slow at first, so it is not dangerous." "The closed form must be found by luck" (unrolling is a method).

**Assessment of the project.** Check the five closed forms, the generic `terms`, the characteristic-equation work and the induction proof in the dossier. Ask each student to unroll one recurrence on the board.

**Reference solution `recurrence_solver.py`** (run with `python3 recurrence_solver.py`):

```python
"""Recurrence Solver: the seventh entry of the Computational Logic Challenge dossier."""
from math import sqrt


def terms(step, initial, count):
    seq = list(initial)
    while len(seq) < count:
        seq.append(step(seq))
    return seq


RECURRENCES = [
    ("a(n) = a(n-1) + 3, a(0) = 2", lambda s: s[-1] + 3, [2], lambda n: 2 + 3 * n),
    ("a(n) = 2 a(n-1), a(0) = 5", lambda s: 2 * s[-1], [5], lambda n: 5 * 2 ** n),
    ("H(n) = 2 H(n-1) + 1, H(0) = 0", lambda s: 2 * s[-1] + 1, [0], lambda n: 2 ** n - 1),
    ("a(n) = a(n-1) + n, a(0) = 0", lambda s: s[-1] + len(s), [0], lambda n: n * (n + 1) // 2),
    ("a(n) = 3 a(n-1) - 2 a(n-2), a(0) = 1, a(1) = 3", lambda s: 3 * s[-1] - 2 * s[-2], [1, 3], lambda n: 2 ** (n + 1) - 1),
]


def classify(seq):
    differences = {b - a for a, b in zip(seq, seq[1:])}
    if len(differences) == 1:
        return f"arithmetic (d = {differences.pop()})"
    if all(x != 0 for x in seq[:-1]):
        ratios = {b / a for a, b in zip(seq, seq[1:])}
        if len(ratios) == 1:
            return f"geometric (r = {ratios.pop():g})"
    return "neither"


print("Recurrence, first terms, closed form agrees for n = 0..40, type")
for text, step, initial, closed in RECURRENCES:
    seq = terms(step, initial, 41)
    agrees = all(seq[n] == closed(n) for n in range(41))
    print(f"  {text}")
    print(f"    {seq[:8]}  agrees: {agrees}  type: {classify(seq[:8])}")

print("\nCharacteristic equation of a(n) = 3 a(n-1) - 2 a(n-2)")
c1, c2 = 3, -2
root = sqrt(c1 * c1 + 4 * c2)
r1, r2 = (c1 + root) / 2, (c1 - root) / 2
a0, a1 = 1, 3
B = (a1 - a0 * r1) / (r2 - r1)
A = a0 - B
print(f"  r^2 = 3r - 2 has roots {r1:g} and {r2:g}")
print(f"  a(n) = A * {r1:g}^n + B * {r2:g}^n with A = {A:g}, B = {B:g}")
seq = terms(RECURRENCES[4][1], [1, 3], 41)
print("  formula matches the recurrence for n = 0..40:", all(abs(A * r1 ** n + B * r2 ** n - seq[n]) < 1e-6 for n in range(41)))
```

```output
Recurrence, first terms, closed form agrees for n = 0..40, type
  a(n) = a(n-1) + 3, a(0) = 2
    [2, 5, 8, 11, 14, 17, 20, 23]  agrees: True  type: arithmetic (d = 3)
  a(n) = 2 a(n-1), a(0) = 5
    [5, 10, 20, 40, 80, 160, 320, 640]  agrees: True  type: geometric (r = 2)
  H(n) = 2 H(n-1) + 1, H(0) = 0
    [0, 1, 3, 7, 15, 31, 63, 127]  agrees: True  type: neither
  a(n) = a(n-1) + n, a(0) = 0
    [0, 1, 3, 6, 10, 15, 21, 28]  agrees: True  type: neither
  a(n) = 3 a(n-1) - 2 a(n-2), a(0) = 1, a(1) = 3
    [1, 3, 7, 15, 31, 63, 127, 255]  agrees: True  type: neither

Characteristic equation of a(n) = 3 a(n-1) - 2 a(n-2)
  r^2 = 3r - 2 has roots 2 and 1
  a(n) = A * 2^n + B * 1^n with A = 2, B = -1
  formula matches the recurrence for n = 0..40: True
```

**Differentiation.** Support: provide `terms`, the recurrences and the comparison, and let students derive and enter the closed forms. Stretch: add the Fibonacci-like string-counting recurrence, the growth-rate estimator and a solver for linear recurrences with complex roots.

**Discussion questions (not for the student quiz).** Why does the Tower of Hanoi legend make the end of the world so far away? What would happen to the runtime of merge sort if the merge step took n² instead of n steps?
