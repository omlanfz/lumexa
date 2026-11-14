# Lumexa Mission Log: Discrete Mathematics & Computational Logic

**Course/Path:** Discrete Mathematics & Computational Logic
**Lesson:** 02 of 08
**Title:** Set Theory and Set Operations
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** Sets · Venn diagrams (with Python)

---

## Mission Brief

In a class of 40 students, 25 play cricket and 18 play football. Nine play both. How many play neither? If you add 25 and 18 you get 43, more than the class, because the nine who play both were counted twice. Putting the right numbers in the right places, without counting anybody twice, is the job of **set theory**.

Sets are the language in which almost all of mathematics and computing is written: a database table is a set of rows, a type is a set of values, a search result is a set of pages, and the users of a website are a set. In this lesson you learn the vocabulary and the operations on sets, draw them as **Venn diagrams**, prove **set identities** with the same brute-force confidence you used for truth tables, and use **inclusion-exclusion** to count without double counting. You will add the **Set Lab** to your Computational Logic Challenge dossier.

## Learning Objectives

1. Describe a set by listing its elements and by set-builder notation, and use ∈, ⊆, ∅, |A| and the universal set.
2. Compute the union, intersection, difference, complement, symmetric difference and Cartesian product of sets.
3. Draw and read Venn diagrams of two and three sets, and name each region.
4. Prove set identities such as De Morgan's laws and the distributive laws by membership reasoning and by brute force.
5. Use the inclusion-exclusion principle to count the elements of a union.
6. Build the Set Lab: Python code that evaluates set operations, lists Venn regions and checks identities.

## Prerequisites

- Lesson 1: propositions and truth tables (set operations mirror logical connectives).
- Loops, conditions and lists from your programming courses (the short Python code is explained as it appears).

## Concept Explanation

### Sets and notation

A **set** is a collection of distinct objects, called its **elements**. Order and repetition do not matter: {1, 2, 3} = {3, 2, 1, 1}. We write **x ∈ A** for "x is an element of A". A can be given by a **roster** ({2, 4, 6, 8}) or by **set-builder notation**: {x ∈ ℤ | x is even and 0 < x < 10}, read "the set of integers x such that...".

| Notation | Meaning |
|---|---|
| ∅ or {} | the empty set (no elements) |
| U | the universal set (everything under discussion) |
| \|A\| | the cardinality: the number of elements |
| A ⊆ B | A is a subset of B: every element of A is in B |
| A = B | A ⊆ B and B ⊆ A |
| 𝒫(A) | the power set: the set of all subsets of A; it has 2^\|A\| elements |

### Set operations

| Operation | Symbol | Elements | Python |
|---|---|---|---|
| Union | A ∪ B | in A or B (or both) | `A \| B` |
| Intersection | A ∩ B | in both A and B | `A & B` |
| Difference | A − B | in A but not in B | `A - B` |
| Complement | Aᶜ | in U but not in A | `U - A` |
| Symmetric difference | A ⊕ B | in exactly one of A, B | `A ^ B` |
| Cartesian product | A × B | all ordered pairs (a, b) | `itertools.product(A, B)` |

Two sets are **disjoint** if their intersection is empty. The Cartesian product is a *set of pairs*: |A × B| = |A| · |B|. Notice how the symbols mirror logic from Lesson 1: ∪ is "or", ∩ is "and", complement is "not", and the symmetric difference is "xor".

### Venn diagrams

A **Venn diagram** draws each set as a circle inside a rectangle that stands for U. Two overlapping circles make **four regions**: only A, only B, both, and neither. Three circles make **eight regions**. Shading regions shows an operation, and writing a count in each region organises a counting problem. The region "neither" lies *outside* every circle but inside the rectangle, and it is easy to forget.

### Set identities

Set operations obey laws, just like logic:

| Law | Identity |
|---|---|
| Commutative | A ∪ B = B ∪ A, A ∩ B = B ∩ A |
| Distributive | A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C); A ∪ (B ∩ C) = (A ∪ B) ∩ (A ∪ C) |
| De Morgan | (A ∪ B)ᶜ = Aᶜ ∩ Bᶜ and (A ∩ B)ᶜ = Aᶜ ∪ Bᶜ |
| Complement | A ∪ Aᶜ = U, A ∩ Aᶜ = ∅, (Aᶜ)ᶜ = A |
| Absorption | A ∪ (A ∩ B) = A |

To **prove** an identity you can reason about an arbitrary element ("x is in the left side iff x is in the right side"), or build a **membership table** with one row for each way an element can be in or out of each set, which is exactly a truth table. For small universes you can also check *every* possible set by brute force.

### Counting: inclusion-exclusion

To count the elements of a union, add the sizes and subtract what you counted twice: **|A ∪ B| = |A| + |B| − |A ∩ B|**. For three sets: **|A ∪ B ∪ C| = |A| + |B| + |C| − |A ∩ B| − |A ∩ C| − |B ∩ C| + |A ∩ B ∩ C|**. The cricket and football problem becomes: |A ∪ B| = 25 + 18 − 9 = 34, so 40 − 34 = **6** students play neither.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Set / element** | A collection of distinct objects; one object in it. |
| **Subset** | A set all of whose elements are in another set (A ⊆ B). |
| **Empty set** | The set with no elements, written ∅. |
| **Universal set** | The set of everything under discussion. |
| **Union / intersection** | The elements in at least one of the sets; in all of the sets. |
| **Complement** | Everything in the universal set that is not in the set. |
| **Cartesian product** | The set of all ordered pairs with the first element from A and the second from B. |
| **Power set** | The set of all subsets of a set; it has 2^n elements if the set has n. |
| **Venn diagram** | A picture of sets as overlapping circles inside a rectangle. |
| **Inclusion-exclusion** | A counting rule for unions that subtracts what was counted twice. |

## Worked Examples

### Example 1: Set operations in Python

```python
U = set(range(1, 11))
evens = {x for x in U if x % 2 == 0}
threes = {x for x in U if x % 3 == 0}

print("evens          ", sorted(evens))
print("multiples of 3 ", sorted(threes))
print("union          ", sorted(evens | threes))
print("intersection   ", sorted(evens & threes))
print("difference     ", sorted(evens - threes))
print("complement     ", sorted(U - evens))
print("symmetric diff.", sorted(evens ^ threes))
print("evens subset of U?", evens <= U, "| disjoint?", evens.isdisjoint(threes))
```

```output
evens           [2, 4, 6, 8, 10]
multiples of 3  [3, 6, 9]
union           [2, 3, 4, 6, 8, 9, 10]
intersection    [6]
difference      [2, 4, 8, 10]
complement      [1, 3, 5, 7, 9]
symmetric diff. [2, 3, 4, 8, 9, 10]
evens subset of U? True | disjoint? False
```

1. A set is built with a **set comprehension**, the Python version of set-builder notation: `{x for x in U if x % 2 == 0}`.
2. The operators `|`, `&`, `-` and `^` are union, intersection, difference and symmetric difference. The complement is `U - evens`, because Python needs the universe spelled out.
3. 6 is the only number in both sets, and 2, 4, 8, 10 are in the evens only. So the difference removes just 6 from the evens.
4. `<=` tests for a subset, and `isdisjoint` tests for an empty intersection (here they share 6, so they are not disjoint).

### Example 2: Checking identities by brute force

```python
from itertools import combinations


def subsets(universe):
    items = sorted(universe)
    return [frozenset(c) for r in range(len(items) + 1) for c in combinations(items, r)]


U = frozenset({1, 2, 3})
all_sets = subsets(U)
print("number of subsets of U:", len(all_sets))

checks = {
    "De Morgan: (A | B)' == A' & B'": lambda A, B, C: U - (A | B) == (U - A) & (U - B),
    "De Morgan: (A & B)' == A' | B'": lambda A, B, C: U - (A & B) == (U - A) | (U - B),
    "distributive: A & (B | C) == (A & B) | (A & C)": lambda A, B, C: A & (B | C) == (A & B) | (A & C),
    "false claim: A - (B - C) == (A - B) - C": lambda A, B, C: A - (B - C) == (A - B) - C,
}
for text, law in checks.items():
    holds = all(law(A, B, C) for A in all_sets for B in all_sets for C in all_sets)
    print(f"{text:<50}{holds}")
```

```output
number of subsets of U: 8
De Morgan: (A | B)' == A' & B'                    True
De Morgan: (A & B)' == A' | B'                    True
distributive: A & (B | C) == (A & B) | (A & C)    True
false claim: A - (B - C) == (A - B) - C           False
```

1. A set with 3 elements has 2³ = 8 subsets, so there are 8 × 8 × 8 = 512 triples (A, B, C). The program tries all of them.
2. The three genuine laws hold for every triple, which is a proof for this universe (and, because the argument does not depend on the particular elements, a strong evidence in general).
3. The false claim fails: one triple is enough to break it, just like a counterexample row in a truth table.
4. A `frozenset` is an unchangeable set; it is needed here because sets of sets must contain hashable elements.

### Example 3: Inclusion-exclusion

```python
students = range(1, 41)
cricket = set(range(1, 26))
football = set(range(17, 35))

print("cricket", len(cricket), "football", len(football), "both", len(cricket & football))
union = len(cricket) + len(football) - len(cricket & football)
print(f"play at least one: {union} (check: {len(cricket | football)})")
print("play neither:", len(students) - union)
print("only cricket:", len(cricket - football), "only football:", len(football - cricket))
```

```output
cricket 25 football 18 both 9
play at least one: 34 (check: 34)
play neither: 6
only cricket: 16 only football: 9
```

1. The two sets overlap in the students numbered 17 to 25: nine students, as in the story.
2. Adding the sizes would count those nine twice. Subtracting the intersection gives the correct 34 students who play at least one sport, and the direct union `|` confirms it.
3. 40 − 34 = 6 students play neither. They are *outside both circles* of the Venn diagram.
4. Differences give the "only" regions: 16 play only cricket and 9 play only football. Together with the 9 who play both and the 6 who play neither, 16 + 9 + 9 + 6 = 40.

## Common Mistakes and Misconceptions

- **Counting elements twice.** |A ∪ B| is not |A| + |B| when the sets overlap. Subtract the intersection.
- **Forgetting the region outside all circles.** A Venn diagram of two sets has four regions, not three.
- **Confusing ∈ with ⊆.** 2 ∈ {1, 2} is about an element; {2} ⊆ {1, 2} is about a subset. And {2} ∈ {{2}} is true, but 2 ∈ {{2}} is false.
- **Thinking order or repeats matter in a set.** {1, 2, 2, 3} has three elements, and {1, 2, 3} = {3, 1, 2}.
- **Mixing up difference and complement.** A − B needs two sets; the complement needs a universe.
- **Using `[]` instead of `{}` in Python.** `{}` is an empty *dictionary*; the empty set is `set()`.
- **Believing the power set has n elements.** It has 2ⁿ: each element is either in a subset or not.
- **Treating ⊆ as "smaller".** A set is a subset of itself, and ∅ is a subset of every set.

## Guided Hands-On Activity

**Draw it, then compute it.** Work with your teacher.

1. Draw a two-circle Venn diagram for the multiples of 2 and the multiples of 3 up to 20, and write each number in its region. Then check against Example 1 with U = 1..20.
2. Use the Venn diagram visual of this lesson to shade A − B, then Aᶜ ∩ Bᶜ, and compare with (A ∪ B)ᶜ.
3. In Example 1, add the Cartesian product of `{1, 2}` and `{"a", "b", "c"}` and print its size.
4. In Example 2, add the false claim "A ∪ (B − C) = (A ∪ B) − C" and find a triple that breaks it.
5. In Example 3, change the numbers to 30 cricket, 22 football and 12 both in a class of 45. How many play neither?
6. Write the power set of {a, b, c} by hand, count its elements, and then compute it with `subsets`.

## Lesson Project: Set Lab: Venn Diagrams and Identities

### Objective

Add the **Set Lab** to the Computational Logic Challenge dossier: a Python program that builds three sets over a universe of numbers, prints the set operations and the eight regions of the three-circle Venn diagram, verifies inclusion-exclusion with real counts, and checks set identities by brute force. The dossier entry also contains a hand-drawn Venn diagram and the solution of the survey problem.

### Requirements

- The universe is U = {1, ..., 20}; *A* = the even numbers, *B* = the multiples of 3, *C* = the prime numbers. Build all three with set comprehensions.
- Print A, B, C, A ∪ B, A ∩ B, A − B, Bᶜ, A ⊕ C and A ∩ B ∩ C.
- Print the **eight regions** of the Venn diagram (only A, only B, only C, A and B only, A and C only, B and C only, all three, none) with their elements and sizes, and check that the sizes add up to 20.
- Verify the three-set **inclusion-exclusion** formula against the size of A ∪ B ∪ C.
- Check by brute force over the subsets of {1, 2, 3} that De Morgan's law and the distributive law hold, and that one false identity fails; print `True` or `False`.
- Solve the survey problem in code (40 students, 25 cricket, 18 football, 9 both) and print the number who play neither.
- In the dossier, hand-draw the three-circle diagram with the numbers of your program in each region, and write two sentences about the region that is empty.

### Instructions

1. Build U, A, B and C with set comprehensions, and print the operations with a helper `show(name, s)`.
2. Work out the eight regions with set algebra (for example, only A is `A - B - C`), and loop over them to print the elements and the sizes.
3. Check that the region sizes add up to |U|.
4. Write the inclusion-exclusion formula with `len`, and compare it with `len(A | B | C)`.
5. Write `subsets` and the brute-force check of the identities over all triples.
6. Write the survey calculation and its two printed lines.
7. Compare your output with the expected output, and draw the Venn diagram in your dossier.

### Expected Output

```text
Sets over U = {1, ..., 20}
A (even)            [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
B (multiples of 3)  [3, 6, 9, 12, 15, 18]
C (primes)          [2, 3, 5, 7, 11, 13, 17, 19]
A union B           [2, 3, 4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20]
A intersect B       [6, 12, 18]
A minus B           [2, 4, 8, 10, 14, 16, 20]
complement of B     [1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20]
A xor C             [3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20]
A and B and C       []

Venn regions
  only A         6  [4, 8, 10, 14, 16, 20]
  only B         2  [9, 15]
  only C         6  [5, 7, 11, 13, 17, 19]
  A and B only   3  [6, 12, 18]
  A and C only   1  [2]
  B and C only   1  [3]
  A and B and C  0  []
  none           1  [1]
  sizes add up to 20 = |U| = 20

Inclusion-exclusion
  formula: 19  direct count: 19  equal: True

Identities checked over all 512 triples of subsets of {1, 2, 3}
  De Morgan (A | B)' == A' & B'       True
  distributive X & (Y | Z)            True
  false: X - (Y - Z) == (X - Y) - Z   False

Survey: 40 students, 25 cricket, 18 football, 9 both
  play at least one: 34
  play neither: 6
```

### Hints

1. **Hint 1 (primes).** `{x for x in U if x > 1 and all(x % d != 0 for d in range(2, x))}`.
2. **Hint 2 (regions).** Only A: `A - B - C`; A and B only: `(A & B) - C`; none: `U - (A | B | C)`.
3. **Hint 3 (printing a set in order).** `sorted(s)` turns it into a list for printing.
4. **Hint 4 (the formula).** `len(A)+len(B)+len(C)-len(A&B)-len(A&C)-len(B&C)+len(A&B&C)`.
5. **Hint 5 (brute force).** `all(law(A, B, C) for A in subsets for B in subsets for C in subsets)` with `frozenset`s.
6. **Hint 6 (aligned output).** `f"{name:<16}"` pads the label to a fixed width.

### Success Criteria

- [ ] The three sets are built with comprehensions and the operations are correct.
- [ ] All eight regions are printed, their sizes add up to 20, and the region "all three" is empty.
- [ ] The inclusion-exclusion formula gives the same number as `len(A | B | C)`.
- [ ] The brute-force check says `True` for De Morgan and the distributive law and `False` for the false identity.
- [ ] The survey answer is 6, and the dossier contains the diagram and the two sentences about the empty region.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Write a function `membership_table(expression)` that prints, for three sets, one row for each of the eight ways an element can be in or out of A, B and C, with the truth value of both sides of an identity (for example De Morgan's), so that the identity is proved by a table exactly as in Lesson 1. Then use the power set function to count how many of the 2⁸ = 256 possible "regions selections" give a set equal to A ∪ B, and explain the connection with truth tables.

## Lesson Recap

- A **set** is an unordered collection of distinct elements; |A| is its size, A ⊆ B means subset, and the power set has 2ⁿ elements.
- **Union, intersection, difference, complement and symmetric difference** correspond to or, and, and-not, not and xor from logic.
- A **Venn diagram** shows the regions of overlapping sets; with three sets there are eight regions, including the one outside all the circles.
- **Set identities** (De Morgan, distributive, absorption) can be proved by reasoning about an element, by a membership table or, for small universes, by brute force.
- **Inclusion-exclusion** counts a union without counting overlaps twice: |A ∪ B| = |A| + |B| − |A ∩ B|.

## Homework / Extension Mission

A survey of 100 students asks about three apps. 60 use app X, 50 use app Y, 40 use app Z, 30 use X and Y, 25 use X and Z, 20 use Y and Z, and 10 use all three. How many use at least one app? How many use exactly one? Solve the problem by hand with a Venn diagram, then check it in Python by building actual sets of students that satisfy the numbers. Finally, write a paragraph explaining how a database query with `AND`, `OR` and `NOT` is a set operation on rows, and which SQL words correspond to ∩, ∪ and −.

## Course Project Connection

This lesson adds the **Set Lab** to the **Computational Logic Challenge** dossier. Its Venn regions and identities use the same tools as the Truth Table Studio of Lesson 1. In Lesson 3 you will make relations out of sets of ordered pairs (subsets of a Cartesian product), and in Lesson 5 inclusion-exclusion becomes a general counting tool. Sets also return in Course 7: every SQL table is a set of rows, and the join and union operations are set operations.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the cricket and football story and set notation. 15 minutes: operations and Venn diagrams (draw together). 10 minutes: identities and brute-force proofs (Example 2). 25 minutes: the project, with the hand-drawn diagram first.

**Live demonstrations.** Use the interactive Venn visual to shade regions for each operation. Ask students to stand in two overlapping hoops (clubs) and count the overlap. Show that `{}` is a dictionary in Python.

**Misconceptions.** "Sets are ordered lists." "The complement does not need a universe." "Three overlapping circles have seven regions" (eight, counting the outside).

**Assessment of the project.** Check the region algebra (especially "none"), that the sizes add to 20, the inclusion-exclusion check, and the explanation of the empty region (no number is even, a multiple of 3 and prime at the same time). Ask each student to describe the region A ∩ C in words.

**Reference solution `set_lab.py`** (run with `python3 set_lab.py`):

```python
"""Set Lab: the second entry of the Computational Logic Challenge dossier."""
from itertools import combinations

U = set(range(1, 21))
A = {x for x in U if x % 2 == 0}
B = {x for x in U if x % 3 == 0}
C = {x for x in U if x > 1 and all(x % d != 0 for d in range(2, x))}


def show(name, s):
    print(f"{name:<20}{sorted(s)}")


print("Sets over U = {1, ..., 20}")
show("A (even)", A)
show("B (multiples of 3)", B)
show("C (primes)", C)
show("A union B", A | B)
show("A intersect B", A & B)
show("A minus B", A - B)
show("complement of B", U - B)
show("A xor C", A ^ C)
show("A and B and C", A & B & C)

print("\nVenn regions")
REGIONS = [
    ("only A", A - B - C),
    ("only B", B - A - C),
    ("only C", C - A - B),
    ("A and B only", (A & B) - C),
    ("A and C only", (A & C) - B),
    ("B and C only", (B & C) - A),
    ("A and B and C", A & B & C),
    ("none", U - (A | B | C)),
]
for name, elements in REGIONS:
    print(f"  {name:<14}{len(elements):>2}  {sorted(elements)}")
print("  sizes add up to", sum(len(e) for _, e in REGIONS), "= |U| =", len(U))

print("\nInclusion-exclusion")
formula = len(A) + len(B) + len(C) - len(A & B) - len(A & C) - len(B & C) + len(A & B & C)
print("  formula:", formula, " direct count:", len(A | B | C), " equal:", formula == len(A | B | C))


def subsets(universe):
    items = sorted(universe)
    return [frozenset(c) for r in range(len(items) + 1) for c in combinations(items, r)]


V = frozenset({1, 2, 3})
ALL = subsets(V)
LAWS = {
    "De Morgan (A | B)' == A' & B'": lambda X, Y, Z: V - (X | Y) == (V - X) & (V - Y),
    "distributive X & (Y | Z)": lambda X, Y, Z: X & (Y | Z) == (X & Y) | (X & Z),
    "false: X - (Y - Z) == (X - Y) - Z": lambda X, Y, Z: X - (Y - Z) == (X - Y) - Z,
}
print("\nIdentities checked over all", len(ALL) ** 3, "triples of subsets of {1, 2, 3}")
for text, law in LAWS.items():
    print(f"  {text:<36}{all(law(X, Y, Z) for X in ALL for Y in ALL for Z in ALL)}")

print("\nSurvey: 40 students, 25 cricket, 18 football, 9 both")
at_least_one = 25 + 18 - 9
print("  play at least one:", at_least_one)
print("  play neither:", 40 - at_least_one)
```

```output
Sets over U = {1, ..., 20}
A (even)            [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
B (multiples of 3)  [3, 6, 9, 12, 15, 18]
C (primes)          [2, 3, 5, 7, 11, 13, 17, 19]
A union B           [2, 3, 4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20]
A intersect B       [6, 12, 18]
A minus B           [2, 4, 8, 10, 14, 16, 20]
complement of B     [1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20]
A xor C             [3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20]
A and B and C       []

Venn regions
  only A         6  [4, 8, 10, 14, 16, 20]
  only B         2  [9, 15]
  only C         6  [5, 7, 11, 13, 17, 19]
  A and B only   3  [6, 12, 18]
  A and C only   1  [2]
  B and C only   1  [3]
  A and B and C  0  []
  none           1  [1]
  sizes add up to 20 = |U| = 20

Inclusion-exclusion
  formula: 19  direct count: 19  equal: True

Identities checked over all 512 triples of subsets of {1, 2, 3}
  De Morgan (A | B)' == A' & B'       True
  distributive X & (Y | Z)            True
  false: X - (Y - Z) == (X - Y) - Z   False

Survey: 40 students, 25 cricket, 18 football, 9 both
  play at least one: 34
  play neither: 6
```

**Differentiation.** Support: provide the set definitions and `show`, and let students write the regions and the checks. Stretch: add the membership-table function, the power set size check for 10 elements, and the survey with three apps.

**Discussion questions (not for the student quiz).** Why can't a set contain itself in naive set theory without causing a paradox (Russell's paradox)? How is a Python `set` implemented, and why do its elements have to be hashable?
