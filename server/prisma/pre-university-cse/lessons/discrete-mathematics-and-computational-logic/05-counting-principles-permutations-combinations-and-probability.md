# Lumexa Mission Log: Discrete Mathematics & Computational Logic

**Course/Path:** Discrete Mathematics & Computational Logic
**Lesson:** 05 of 08
**Title:** Counting Principles, Permutations, Combinations and Probability
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Counting · probability (with Python)

---

## Mission Brief

How many four-digit PINs are there? Ten thousand. How many have no repeated digit? How many different ways can a class of 30 choose a captain, a vice-captain and a treasurer? How likely is it that two people in a room of 23 share a birthday? (Most people guess "very unlikely". It is a little better than a coin toss.)

Counting sounds easy until the numbers get large and the conditions subtle, and then it becomes a precise science: **combinatorics**. It tells a security engineer how many passwords an attacker must try, tells a database designer how many possible keys exist, tells a hash-table programmer how soon collisions arrive (Course 3), and is the foundation of **probability**, which measures how likely things are. In this lesson you learn the counting rules, permutations and combinations, and the basics of probability, and you check your answers by brute force and by **simulation** in the **Counting and Probability Challenge**.

## Learning Objectives

1. Apply the sum rule, the product rule and counting by complement.
2. Count arrangements with permutations, including repeated items, and selections with combinations.
3. Decide whether order matters, and choose between P(n, r) and C(n, r).
4. Compute probabilities of events with equally likely outcomes, complements, unions and conditional events.
5. Explain independence and expected value, and the birthday paradox.
6. Build the Counting and Probability Challenge: exact answers, brute-force checks and simulations.

## Prerequisites

- Lesson 2: sets, union and inclusion-exclusion; Lesson 1: logical conditions ("and", "or", "not").
- Fractions and percentages from school mathematics.

## Concept Explanation

### Basic counting rules

The **product rule**: if a task has two *independent* stages, with *m* ways for the first and *n* ways for the second, there are **m × n** ways in total. A four-digit PIN has 10 · 10 · 10 · 10 = 10,000 possibilities. The **sum rule**: if a task can be done in *m* ways *or* in *n* different ways, with no overlap, there are **m + n** ways. (If the cases overlap, use inclusion-exclusion from Lesson 2.) Often the easiest way to count "at least one" is by **complement**: count *all* outcomes and subtract those with *none*. PINs that have at least one repeated digit: 10,000 − (10 · 9 · 8 · 7) = 10,000 − 5,040 = 4,960.

### Permutations

A **permutation** is an arrangement in which **order matters**. There are **n! = n · (n − 1) · ... · 2 · 1** ways to arrange *n* different objects (0! = 1). Arranging only *r* of the *n* objects gives **P(n, r) = n! / (n − r)!**. For example, a captain, a vice-captain and a treasurer chosen from 30 students: P(30, 3) = 30 · 29 · 28 = 24,360. When some objects are identical, divide by the factorial of each repeat: the letters of MISSISSIPPI (11 letters: 4 I, 4 S, 2 P, 1 M) can be arranged in 11! / (4! · 4! · 2! · 1!) = 34,650 ways.

### Combinations

A **combination** is a selection in which **order does not matter**. There are **C(n, r) = n! / (r! · (n − r)!)** ways to choose *r* of *n* objects ("n choose r"), also written as a binomial coefficient. Choosing a committee of 3 from 30 students: C(30, 3) = 4,060, which is P(30, 3) divided by 3! = 6, because each committee was counted 6 times as an ordered list. Useful facts: C(n, r) = C(n, n − r); the numbers C(n, r) form **Pascal's triangle**; and the **binomial theorem** says (a + b)ⁿ = Σ C(n, r) aⁿ⁻ʳ bʳ. The question to ask is always: *does the order matter?*

### The pigeonhole principle

If more than *k* objects are put into *k* boxes, some box holds at least two. Among any 13 people, two share a birth month. It looks trivial but proves surprising things, such as: in any group of 367 people two share a birthday, or any hash function must have collisions when there are more keys than slots (Course 3).

### Probability

An **experiment** has a **sample space** S of outcomes, and an **event** E is a subset of S. When all outcomes are **equally likely**, **P(E) = |E| / |S|**. So P(sum of two dice is 7) = 6/36 = 1/6, counting the six outcomes (1,6), (2,5), (3,4), (4,3), (5,2), (6,1). Probabilities lie between 0 and 1. Key rules:

- **Complement**: P(not E) = 1 − P(E).
- **Union**: P(A or B) = P(A) + P(B) − P(A and B) (inclusion-exclusion).
- **Conditional probability**: P(A | B) = P(A and B) / P(B), the chance of A *given* that B has happened.
- **Independence**: A and B are independent if P(A and B) = P(A) · P(B); coin tosses are independent.
- **Expected value**: E[X] = Σ x · P(X = x), the average over many repeats; a fair die has E = 3.5.

### Simulation and the birthday paradox

When the exact count is hard, we can **simulate**: repeat the random experiment many times and report the fraction of successes. By the **law of large numbers** the fraction approaches the true probability. The **birthday paradox** shows how counting beats intuition: the chance that *n* people have all different birthdays is (365/365) · (364/365) · ... · ((365 − n + 1)/365), so for n = 23 the chance of a shared birthday is about 50.7%, and for n = 60 it is over 99%. The same arithmetic is why hash tables with only a few hundred keys already start colliding, and why cryptographic hashes need very long outputs.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Product rule** | If two independent stages have m and n ways, the whole task has m × n ways. |
| **Factorial** | n! = n · (n − 1) · ... · 1, the number of arrangements of n different objects. |
| **Permutation** | An ordered arrangement; P(n, r) counts ordered selections of r from n. |
| **Combination** | An unordered selection; C(n, r) counts the ways to choose r from n. |
| **Pigeonhole principle** | If more than k objects go into k boxes, some box has at least two. |
| **Sample space / event** | The set of all outcomes; a subset of it. |
| **Probability** | A number from 0 to 1 that measures how likely an event is. |
| **Conditional probability** | The probability of A given that B has happened: P(A and B) / P(B). |
| **Independent events** | Events where one does not change the probability of the other. |
| **Expected value** | The average value of a random quantity over many repeats. |

## Worked Examples

### Example 1: Counting, and checking by brute force

```python
from itertools import combinations, permutations
from math import comb, factorial, perm

print("PINs with 4 digits:", 10 ** 4)
print("PINs with no repeated digit:", perm(10, 4), "| brute force:", sum(1 for p in permutations(range(10), 4)))
print("committees of 3 from 10:", comb(10, 3), "| brute force:", sum(1 for c in combinations(range(10), 3)))
print("captain, vice, treasurer from 10:", perm(10, 3))
print("ways to arrange MISSISSIPPI:", factorial(11) // (factorial(4) * factorial(4) * factorial(2)))
print("PINs with a repeated digit:", 10 ** 4 - perm(10, 4))
```

```output
PINs with 4 digits: 10000
PINs with no repeated digit: 5040 | brute force: 5040
committees of 3 from 10: 120 | brute force: 120
captain, vice, treasurer from 10: 720
ways to arrange MISSISSIPPI: 34650
PINs with a repeated digit: 4960
```

1. `perm(10, 4)` is P(10, 4) = 10 · 9 · 8 · 7 = 5,040, and enumerating all the ordered selections with `permutations` gives the same number.
2. `comb(10, 3)` is C(10, 3) = 120: each committee is counted once, however its members are ordered.
3. The MISSISSIPPI count divides 11! by the factorials of the repeated letters (4 I's, 4 S's, 2 P's).
4. Counting by **complement** gives "at least one repeat": all 10,000 PINs minus the 5,040 with no repeat.

### Example 2: Exact probability against a simulation

```python
from fractions import Fraction


class Random:
    """A tiny random-number generator, so that the output is the same everywhere."""

    def __init__(self, seed):
        self.state = seed

    def below(self, n):
        self.state = (self.state * 1103515245 + 12345) % (2 ** 31)
        return (self.state >> 8) % n


outcomes = [(a, b) for a in range(1, 7) for b in range(1, 7)]
event = [(a, b) for (a, b) in outcomes if a + b == 7]
exact = Fraction(len(event), len(outcomes))
print("exact P(sum is 7) =", exact, "=", round(float(exact), 4))

rng = Random(2024)
trials = 20000
hits = sum(1 for _ in range(trials) if rng.below(6) + 1 + rng.below(6) + 1 == 7)
print("simulated, 20000 rolls:", round(hits / trials, 4))
print("exact P(not 7) =", 1 - exact)
```

```output
exact P(sum is 7) = 1/6 = 0.1667
simulated, 20000 rolls: 0.16
exact P(not 7) = 5/6
```

1. All 36 outcomes of two dice are equally likely, so the probability is the number of favourable outcomes divided by 36: 6/36 = 1/6.
2. `Fraction` keeps the answer exact (1/6) instead of a rounded decimal.
3. The simulation rolls two dice 20,000 times and reports the fraction of sevens. It is close to 0.1667 but not equal: simulations give *estimates*.
4. The generator is written out so that the output does not depend on the Python version. The complement 1 − 1/6 = 5/6 is the probability of *not* getting 7.

### Example 3: The birthday paradox

```python
def all_different(n):
    p = 1.0
    for i in range(n):
        p *= (365 - i) / 365
    return p


for n in (10, 23, 40, 60):
    print(f"{n:>3} people: P(shared birthday) = {1 - all_different(n):.4f}")
```

```output
 10 people: P(shared birthday) = 0.1169
 23 people: P(shared birthday) = 0.5073
 40 people: P(shared birthday) = 0.8912
 60 people: P(shared birthday) = 0.9941
```

1. The chance that everyone has a *different* birthday is the product of 365/365, 364/365, 363/365, ..., one factor for each new person.
2. The chance of a shared birthday is the complement, 1 minus that product.
3. At 23 people it is already above one half (0.5073), and at 60 people it is close to certain (0.9941).
4. Counting pairs explains it: 23 people form 253 pairs, and each pair is a chance for a match. This growth of pairs is exactly why hash collisions appear so early.

## Common Mistakes and Misconceptions

- **Using permutations when order does not matter (or the reverse).** A committee is a combination; a ranking is a permutation. Ask "does swapping two choices give a different outcome?"
- **Adding when you should multiply.** Independent stages multiply; separate cases add.
- **Counting overlapping cases twice.** If cases overlap, subtract the overlap (inclusion-exclusion).
- **Assuming all outcomes are equally likely.** The sum of two dice is *not* equally likely to be 2 and 7. Count the equally likely *pairs* instead.
- **Believing in the gambler's fallacy.** After five heads, the next toss is still 50-50: independent events have no memory.
- **Confusing P(A | B) with P(B | A).** "Most hackers are clever" does not mean "most clever people are hackers".
- **Treating a simulation as exact.** Simulation gives an estimate with random error; more trials make it smaller.
- **Forgetting that probabilities lie between 0 and 1.** A result of 1.3 or -0.2 means a mistake.

## Guided Hands-On Activity

**Count it two ways.** Work with your teacher.

1. A school code has two letters (A to Z) followed by three digits (0 to 9). How many codes are there? How many have all different letters and different digits? Compute each with the product rule and check by Python.
2. Type Example 1. Add: in how many ways can 5 students be arranged in a line? In how many ways can 2 of the 5 be chosen to carry a banner?
3. Write the number of arrangements of the letters in your first name (handle repeated letters) and check with `itertools.permutations` and a `set`.
4. In Example 2, change the event to "the sum is at least 10" and compute the exact probability as a fraction; then run the simulation and compare.
5. In Example 3, find by trial the smallest number of people for which the chance of a shared birthday exceeds 90%.
6. Print the first eight rows of Pascal's triangle with `comb`, and check that each row sums to a power of two. Explain why in one sentence.

## Lesson Project: Counting and Probability Challenge

### Objective

Add the **Counting and Probability Challenge** to the dossier: a Python program that solves six problems **exactly**, checks the counting ones by brute force, and checks the probability ones by simulation with a fixed random generator. Your dossier page explains, for each problem, which rule you used and why.

### Requirements

- Problem 1: four-digit PINs with all different digits. Exact answer (product rule or `perm`) and a brute-force count with `itertools`.
- Problem 2: a committee of 3 and an officer team (president, vice-president, treasurer) from 10 students. Exact answers (`comb`, `perm`) and brute-force counts.
- Problem 3: the number of distinct arrangements of the letters of STATISTICS (a formula with factorials) and a brute-force count of the arrangements of the shorter word STATS (also with repeats) to confirm the method.
- Problem 4: the probability that two dice sum to at least 10: an exact `Fraction`, and a simulation of 20,000 rolls with the generator of Example 2 seeded with 7.
- Problem 5: the probability that two of 23 people share a birthday: the exact product formula and a simulation of 4,000 groups, with the same generator (seed 11).
- Problem 6: the conditional probability P(heart | red) for a card drawn from a 52-card deck, computed by listing the cards, and the expected value of one fair die roll as a `Fraction`.
- Print each exact answer, the brute-force check and the simulated value (rounded to 3 decimals) on aligned lines; write one `assert` per exact count that compares it with the brute-force count.

### Instructions

1. Write the dossier reasoning for each problem first: which rule (product, permutation, combination, complement, conditional) and why.
2. Write the helper `Random` class and the `below(n)` method as in Example 2.
3. Solve problems 1 to 3 with `math`, check them with `itertools`, and assert equality.
4. Solve problem 4 exactly with `Fraction` and by simulation.
5. For problem 5, simulate a group by drawing 23 birthdays with `below(365)` and checking for a duplicate with a `set`.
6. Build the deck for problem 6 as a list of (rank, suit) pairs, and count the red cards and the red hearts.
7. Compare with the expected output, and finish the dossier page.

### Expected Output

```text
1. PINs with 4 different digits
   exact 5040, brute force 5040
2. Committees and officer teams from 10 students
   committee of 3: 120, president/vice/treasurer: 720
3. Arrangements of letters with repeats
   STATISTICS: 50400, STATS: 30 (checked by brute force)
4. Two dice, sum at least 10
   exact 1/6, simulated 0.166
5. Birthday: two of 23 people share a birthday
   exact 0.507, simulated 0.510
6. Conditional probability and expected value
   P(heart | red) = 1/2
   expected value of one die = 7/2
```

### Hints

1. **Hint 1 (STATISTICS).** The letters are S:3, T:3, I:2, A:1, C:1, so the count is 10! / (3! · 3! · 2!).
2. **Hint 2 (brute force with repeats).** `len(set(permutations("STATS")))` counts distinct arrangements.
3. **Hint 3 (the dice event).** Count the pairs (a, b) with `a + b >= 10`: (4,6), (5,5), (6,4), (5,6), (6,5), (6,6), which is 6 of 36.
4. **Hint 4 (a duplicate in a group).** `len(set(days)) < len(days)` is true when two people share a birthday.
5. **Hint 5 (conditional probability).** Count the hearts among the red cards: 13 of 26.
6. **Hint 6 (expected value).** `sum(Fraction(x, 6) * 1 for x in range(1, 7))`, or `Fraction(sum(range(1, 7)), 6)`.

### Success Criteria

- [ ] The counting answers are correct and each one is confirmed by brute force with an `assert`.
- [ ] The dice probability is the exact fraction 1/6, and the simulation is close to it.
- [ ] The birthday probability is close to 0.507 exactly and by simulation, and the dossier explains why 23 is enough.
- [ ] P(heart | red) is 1/2 and the expected value of a die is 7/2.
- [ ] The dossier page names the rule used for each problem and justifies whether order matters.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Add a seventh problem, the **Monty Hall** game: a prize is behind one of three doors; you pick door 1, the host (who knows where the prize is) opens a door without the prize, and you may switch. Simulate 10,000 games with "stay" and "switch", and report the win rates. Then explain the result by counting the three equally likely cases.

## Lesson Recap

- The **product rule** multiplies independent stages, the **sum rule** adds separate cases, and counting by **complement** handles "at least one".
- **Permutations** count ordered arrangements (n!, P(n, r), repeats divide out); **combinations** count unordered selections, C(n, r).
- With equally likely outcomes, **P(E) = |E| / |S|**; also P(not E) = 1 − P(E), P(A | B) = P(A and B) / P(B), and independent events multiply.
- **Expected value** is the long-run average; the **birthday paradox** shows how fast collisions arrive.
- **Simulation** estimates probabilities when counting is hard, and brute force verifies counting formulas on small cases.

## Homework / Extension Mission

A lottery asks you to choose 6 numbers from 1 to 45. How many possible tickets are there, and what is the chance that one ticket wins the jackpot? Compute it exactly, then use your simulator to estimate how many tickets you would have to buy, on average, to win once (it will be very large: explain why you should not simulate that directly). Next, compute how many random 8-character passwords from the 62 letters and digits exist, and how many years an attacker testing a billion passwords per second would need to try them all. Write a short note on what this says about password length.

## Course Project Connection

This lesson adds the **Counting and Probability Challenge** to the **Computational Logic Challenge** dossier. It reuses inclusion-exclusion (Lesson 2) and the logical connectives (Lesson 1), and its brute-force checks follow the habit of Lesson 4: trust a formula only after testing it. Counting also underlies the graph theory of Lesson 6 (counting edges and paths), the recurrences of Lesson 7 (counting sequences) and the security discussions of Course 6 (password strength and hash collisions).

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: PINs and the product rule. 15 minutes: permutations and combinations (the key question: does order matter?). 10 minutes: probability rules and the birthday paradox (Example 3). 25 minutes: the project, with the dossier reasoning first.

**Live demonstrations.** Ask the class to find the first shared birthday among the students present. Roll two physical dice 50 times and compare with 1/6. Run the simulation with different seeds and discuss the spread.

**Misconceptions.** "Two dice sums are equally likely." "After five heads, tails is due." "P(A | B) equals P(B | A)." "More simulation steps give an exact answer."

**Assessment of the project.** Check the rule named for each problem, the correct formulas, the assertions and the honest comparison between exact and simulated values. Ask each student why STATS and STATISTICS divide by factorials.

**Reference solution `challenge.py`** (run with `python3 challenge.py`):

```python
"""Counting and Probability Challenge: the fifth entry of the Computational Logic Challenge dossier."""
from fractions import Fraction
from itertools import combinations, permutations, product
from math import comb, factorial, perm


class Random:
    def __init__(self, seed):
        self.state = seed

    def below(self, n):
        self.state = (self.state * 1103515245 + 12345) % (2 ** 31)
        return (self.state >> 8) % n


print("1. PINs with 4 different digits")
exact = perm(10, 4)
brute = sum(1 for _ in permutations(range(10), 4))
assert exact == brute
print(f"   exact {exact}, brute force {brute}")

print("2. Committees and officer teams from 10 students")
committees = comb(10, 3)
teams = perm(10, 3)
assert committees == sum(1 for _ in combinations(range(10), 3))
assert teams == sum(1 for _ in permutations(range(10), 3))
print(f"   committee of 3: {committees}, president/vice/treasurer: {teams}")

print("3. Arrangements of letters with repeats")
statistics = factorial(10) // (factorial(3) * factorial(3) * factorial(2))
stats = factorial(5) // (factorial(2) * factorial(2))
assert stats == len(set(permutations("STATS")))
print(f"   STATISTICS: {statistics}, STATS: {stats} (checked by brute force)")

print("4. Two dice, sum at least 10")
outcomes = [(a, b) for a, b in product(range(1, 7), repeat=2)]
exact = Fraction(sum(1 for a, b in outcomes if a + b >= 10), len(outcomes))
rng = Random(7)
trials = 20000
hits = sum(1 for _ in range(trials) if (rng.below(6) + 1) + (rng.below(6) + 1) >= 10)
print(f"   exact {exact}, simulated {hits / trials:.3f}")

print("5. Birthday: two of 23 people share a birthday")
different = 1.0
for i in range(23):
    different *= (365 - i) / 365
rng = Random(11)
groups = 4000
shared = sum(1 for _ in range(groups) if len({rng.below(365) for _ in range(23)}) < 23)
print(f"   exact {1 - different:.3f}, simulated {shared / groups:.3f}")

print("6. Conditional probability and expected value")
deck = [(rank, suit) for rank in range(1, 14) for suit in "hdcs"]
red = [card for card in deck if card[1] in "hd"]
hearts = [card for card in red if card[1] == "h"]
print(f"   P(heart | red) = {Fraction(len(hearts), len(red))}")
print(f"   expected value of one die = {sum(Fraction(x, 6) for x in range(1, 7))}")
```

```output
1. PINs with 4 different digits
   exact 5040, brute force 5040
2. Committees and officer teams from 10 students
   committee of 3: 120, president/vice/treasurer: 720
3. Arrangements of letters with repeats
   STATISTICS: 50400, STATS: 30 (checked by brute force)
4. Two dice, sum at least 10
   exact 1/6, simulated 0.166
5. Birthday: two of 23 people share a birthday
   exact 0.507, simulated 0.510
6. Conditional probability and expected value
   P(heart | red) = 1/2
   expected value of one die = 7/2
```

**Differentiation.** Support: provide the `Random` class, the deck construction and the dossier template with the rule names to choose from. Stretch: add the Monty Hall simulation, the lottery calculation and a check of the binomial theorem for n = 10.

**Discussion questions (not for the student quiz).** Why do statisticians worry about a "good" random generator? How is the birthday paradox used to attack hash functions?
