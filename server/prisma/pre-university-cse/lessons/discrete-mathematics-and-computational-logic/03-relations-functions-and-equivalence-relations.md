# Lumexa Mission Log: Discrete Mathematics & Computational Logic

**Course/Path:** Discrete Mathematics & Computational Logic
**Lesson:** 03 of 08
**Title:** Relations, Functions and Equivalence Relations
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** Relations · modular arithmetic (with Python)

---

## Mission Brief

"Is a sibling of", "is older than", "lives in the same city as", "divides", "is a prerequisite for": all of these are **relations**, a way of saying which things are connected to which. A database is full of them (students and the courses they take), a social network is one huge relation, and every function in your programs is a special, well-behaved kind of relation: each input is connected to exactly one output.

Some relations have a wonderful property: they *sort things into groups*. "Has the same remainder when divided by 3" splits all integers into exactly three boxes; "lives in the same city" splits people into cities. Mathematicians call them **equivalence relations**, and recognising one lets you replace a huge collection by a handful of representatives, which is how hash tables, clocks, checksums and cryptography work. In this lesson you detect relation properties, find equivalence classes, study functions and modular arithmetic, and add the **Relation Detective** to your dossier.

## Learning Objectives

1. Define a relation as a set of ordered pairs, and represent it as a set, a matrix and a directed graph.
2. Test a relation for reflexivity, symmetry, antisymmetry and transitivity.
3. Recognise equivalence relations and partial orders, and compute equivalence classes.
4. Define functions with domain, codomain and range, and decide whether they are injective, surjective or bijective.
5. Compose functions, find inverses of bijections, and use modular arithmetic (congruence) correctly.
6. Build the Relation Detective: a Python tool that classifies relations and functions.

## Prerequisites

- Lesson 2: sets, Cartesian products and set comprehensions.
- Lesson 1: quantifiers (∀ and ∃), which define the properties below.

## Concept Explanation

### Relations

A **relation** R from a set A to a set B is a subset of the Cartesian product A × B: a set of ordered pairs (a, b), where "a is related to b" is written **a R b**. A relation *on* a set A is a subset of A × A. For example, on {1, 2, 3, 4} the relation "divides" is {(1,1), (1,2), (1,3), (1,4), (2,2), (2,4), (3,3), (4,4)}. We can show a relation as a list of pairs, as a **matrix** of 0s and 1s, or as a **directed graph** with an arrow for each pair (graphs return in Lesson 6).

### Properties of a relation on a set

For a relation R on A:

| Property | Definition (for all elements) | Example |
|---|---|---|
| **Reflexive** | a R a | ≤ and "divides" |
| **Symmetric** | if a R b then b R a | "is a sibling of", = |
| **Antisymmetric** | if a R b and b R a then a = b | ≤, "divides" on positive integers |
| **Transitive** | if a R b and b R c then a R c | <, ≤, "divides", = |

Because A is finite we can test each property by checking every pair or triple, which is how the program of this lesson does it. Beware: *symmetric* and *antisymmetric* are not opposites. Equality is both; "divides" on 1, 2 is antisymmetric but not symmetric; a relation can also be neither.

### Equivalence relations and partial orders

A relation that is **reflexive, symmetric and transitive** is an **equivalence relation**. It behaves like "is the same as" for some feature: same remainder, same city, same birthday. Its great property: it splits the set into **equivalence classes**, groups of related elements, which are *disjoint* and together *cover* the whole set (a **partition**). The class of *a* is [a] = {x | x R a}. A relation that is **reflexive, antisymmetric and transitive** is a **partial order**: it ranks elements, but some pairs may be incomparable ("divides": 2 and 3 are not related either way). A **total order** like ≤ compares every pair.

### Functions

A **function** f: A → B assigns to *each* element of A **exactly one** element of B. A is the **domain**, B the **codomain**, and the set of values actually produced is the **range** (or image). A relation is a function only if no input has two outputs and no input is left out. Key properties:

- **Injective (one-to-one)**: different inputs give different outputs (f(a) = f(b) implies a = b).
- **Surjective (onto)**: every element of the codomain is an output (range = codomain).
- **Bijective**: both. Only a bijection has an **inverse** function f⁻¹ that undoes it.

The **composition** (g ∘ f)(x) = g(f(x)) applies f first. If |A| = |B| and A is finite, a function is injective exactly when it is surjective, so each is a bijection.

### Modular arithmetic

We say a **≡ b (mod n)** when a and b leave the same remainder on division by n, i.e. n divides a − b. Congruence mod n is an equivalence relation whose n classes are the remainders 0, 1, ..., n − 1. Arithmetic respects it: if a ≡ a′ and b ≡ b′ then a + b ≡ a′ + b′ and a · b ≡ a′ · b′. That makes a clock (mod 12), the days of the week (mod 7), a hash table (from Course 3) and a check digit all examples of the same idea. In Python, `a % n` always gives a result from 0 to n − 1, even for negative a: `(-3) % 5 == 2`.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Relation** | A set of ordered pairs; a subset of A × B. |
| **Reflexive / symmetric / transitive** | The properties a R a; a R b ⇒ b R a; and a R b, b R c ⇒ a R c. |
| **Antisymmetric** | a R b and b R a together force a = b. |
| **Equivalence relation** | A relation that is reflexive, symmetric and transitive. |
| **Equivalence class** | The set of all elements related to a given element. |
| **Partition** | A division of a set into disjoint, non-empty groups that cover it. |
| **Partial order** | A relation that is reflexive, antisymmetric and transitive. |
| **Function** | A relation in which every input has exactly one output. |
| **Injective / surjective / bijective** | One-to-one; onto; both. |
| **Congruence (mod n)** | a ≡ b (mod n) when a and b have the same remainder on division by n. |

## Worked Examples

### Example 1: Testing the properties of a relation

```python
A = range(1, 7)
relations = {
    "<=": {(a, b) for a in A for b in A if a <= b},
    "divides": {(a, b) for a in A for b in A if b % a == 0},
    "same parity": {(a, b) for a in A for b in A if (a - b) % 2 == 0},
    "differs by 1": {(a, b) for a in A for b in A if abs(a - b) == 1},
}


def reflexive(R):
    return all((a, a) in R for a in A)


def symmetric(R):
    return all((b, a) in R for (a, b) in R)


def antisymmetric(R):
    return all(a == b for (a, b) in R if (b, a) in R)


def transitive(R):
    return all((a, c) in R for (a, b) in R for (b2, c) in R if b == b2)


print(f"{'relation':<14}refl  symm  anti  trans")
for name, R in relations.items():
    print(f"{name:<14}{reflexive(R)!s:<6}{symmetric(R)!s:<6}{antisymmetric(R)!s:<6}{transitive(R)}")
```

```output
relation      refl  symm  anti  trans
<=            True  False True  True
divides       True  False True  True
same parity   True  True  False True
differs by 1  False True  False False
```

1. A relation on `A` is just a set of pairs, built here with set comprehensions that say when `a` is related to `b`.
2. Each test is the definition written as `all(...)`: reflexive checks every `(a, a)`; symmetric checks that every pair can be reversed; transitive checks every chain `a R b`, `b R c`.
3. `<=` and `divides` are reflexive, antisymmetric and transitive: partial orders. "Same parity" is reflexive, symmetric and transitive: an equivalence relation. "Differs by 1" is only symmetric.
4. The antisymmetric column is not the opposite of the symmetric column: "same parity" is symmetric but not antisymmetric, whereas `<=` is antisymmetric but not symmetric.

### Example 2: Equivalence classes

```python
elements = range(0, 12)
classes = {}
for x in elements:
    classes.setdefault(x % 3, []).append(x)

for remainder in sorted(classes):
    print(f"class of {remainder} (mod 3): {classes[remainder]}")

all_members = sorted(x for members in classes.values() for x in members)
print("they cover everything:", all_members == list(elements))
print("they are disjoint:", sum(len(m) for m in classes.values()) == len(set(all_members)))
print("5 ≡ 14 (mod 3):", (14 - 5) % 3 == 0, "| 5 ≡ 7 (mod 3):", (7 - 5) % 3 == 0)
```

```output
class of 0 (mod 3): [0, 3, 6, 9]
class of 1 (mod 3): [1, 4, 7, 10]
class of 2 (mod 3): [2, 5, 8, 11]
they cover everything: True
they are disjoint: True
5 ≡ 14 (mod 3): True | 5 ≡ 7 (mod 3): False
```

1. Putting each number in the group of its remainder is exactly the construction of the equivalence classes of "has the same remainder mod 3".
2. There are three classes (0, 1, 2), they cover 0 to 11, and no number is in two classes: together they form a **partition**.
3. 5 and 14 are congruent mod 3 because their difference, 9, is divisible by 3, and so they are in the same class. 5 and 7 differ by 2, so they are not.
4. Replacing "the whole set" by "three representatives" is the key idea behind hash tables and clock arithmetic.

### Example 3: Functions, composition and inverses

```python
def classify(f, domain, codomain):
    outputs = [f(x) for x in domain]
    injective = len(set(outputs)) == len(outputs)
    surjective = set(outputs) == set(codomain)
    return injective, surjective


square = lambda x: x * x
print("x*x on -2..2 to {0,1,4}:", classify(square, range(-2, 3), {0, 1, 4}))
print("x*x on 0..2 to {0,1,4}: ", classify(square, range(0, 3), {0, 1, 4}))

f = lambda x: (2 * x + 1) % 7
g = lambda x: (3 * x) % 7
print("f is a bijection on 0..6:", classify(f, range(7), range(7)))
inverse = {f(x): x for x in range(7)}
print("inverse of f:", [inverse[y] for y in range(7)])
print("g after f of 2:", g(f(2)), "| f after g of 2:", f(g(2)))
```

```output
x*x on -2..2 to {0,1,4}: (False, True)
x*x on 0..2 to {0,1,4}:  (True, True)
f is a bijection on 0..6: (True, True)
inverse of f: [3, 0, 4, 1, 5, 2, 6]
g after f of 2: 1 | f after g of 2: 6
```

1. A function is injective if its outputs are all different, and surjective if the set of outputs equals the whole codomain.
2. x² on −2..2 is not injective, because f(2) = f(−2) = 4; restricted to 0..2 it is both injective and onto {0, 1, 4}.
3. f(x) = (2x + 1) mod 7 is a bijection on 0..6, so it has an inverse, built here by swapping inputs and outputs.
4. Composition is not commutative: `g(f(2))` and `f(g(2))` give different results.

## Common Mistakes and Misconceptions

- **Thinking "symmetric" and "antisymmetric" are opposites.** A relation can be both (equality) or neither.
- **Forgetting reflexivity.** "Is a sibling of" is symmetric and transitive-ish but not reflexive (nobody is their own sibling), so it is not an equivalence relation.
- **Checking transitivity with only one example.** Transitivity must hold for *every* chain a R b, b R c.
- **Confusing a relation with a function.** A relation may give an input several outputs, or none; a function gives exactly one.
- **Confusing the range with the codomain.** The range is what the function actually produces; the codomain is where it is *allowed* to land.
- **Believing every function has an inverse.** Only bijections do: x² on the integers has none (±2 both map to 4).
- **Negative remainders.** In some languages `(-3) % 5` is -3; in Python it is 2. Know your language when you use modular arithmetic.
- **Reading a ≡ b (mod n) as "a mod n equals b".** It means a and b have the same remainder, and n divides a − b.

## Guided Hands-On Activity

**Detective work.** Work with your teacher.

1. For each relation on the set of people in your class, decide which of reflexive, symmetric, transitive hold: "is taller than", "has the same first letter as", "is a friend of".
2. Type Example 1. Add the relation "less than" (`a < b`) and the relation "equal" (`a == b`), and predict the table before you run it.
3. Draw the directed graph of "divides" on {1, 2, 3, 4, 6}. How many arrows are there, not counting the loops?
4. In Example 2, change 3 to 5 and describe the classes. How many are there, and why?
5. In Example 3, test `lambda x: x % 4` on `range(8)` with codomain `range(4)`. Is it injective? surjective?
6. Find the inverse of f(x) = (2x + 1) mod 7 by hand (solve 2x + 1 ≡ y) and compare with the program's list.

## Lesson Project: Relation Detective

### Objective

Add the **Relation Detective** to the Computational Logic Challenge dossier: a Python tool that takes relations on {1, ..., 8}, tests the four properties, names each relation (equivalence relation, partial order or neither), prints the equivalence classes of the equivalence relation, and analyses three functions for injectivity, surjectivity and inverses.

### Requirements

- Build five relations on A = {1, ..., 8} as sets of pairs: `<=`, `divides`, `congruent mod 3`, `differs by 1` and `sum is even`.
- Write `reflexive`, `symmetric`, `antisymmetric` and `transitive`, and a `kind` function that returns "equivalence relation", "partial order" or "neither".
- Print a table with the four properties and the kind for each relation.
- For every equivalence relation, print its equivalence classes and check that they form a partition of A.
- Analyse three functions from A to A or to a stated codomain: `x mod 4` (to {0, 1, 2, 3}), `9 - x` (to A) and `x // 2` (to {0, ..., 4}): print whether each is injective, surjective and bijective, and print the inverse of the bijection.
- Print the composition (f ∘ g)(3) and (g ∘ f)(3) for two of the functions, showing that order matters.
- In the dossier, draw the directed graph of "divides" on {1, 2, 3, 4, 6}, and write a paragraph explaining why "differs by 1" is not an equivalence relation.

### Instructions

1. Build the five relations with set comprehensions, and write the four property tests as in Example 1.
2. Write `kind` from the three combinations, and print the table with `f"{...:<22}"`-style padding.
3. Write the function that groups A into classes for an equivalence relation: for each element, find the elements related to it, and collect the distinct classes.
4. Check the partition: classes are pairwise disjoint and their union is A.
5. Write `classify(f, domain, codomain)` as in Example 3, and the inverse for the bijection.
6. Write the composition lines, and print everything in the layout of the expected output.
7. Compare with the expected output and complete the dossier page with your graph and paragraph.

### Expected Output

```text
relation          refl   symm   anti   trans  kind
<=                True   False  True   True   partial order
divides           True   False  True   True   partial order
congruent mod 3   True   True   False  True   equivalence relation
differs by 1      False  True   False  False  neither
sum is even       True   True   False  True   equivalence relation

Equivalence classes
  congruent mod 3: [[1, 4, 7], [2, 5, 8], [3, 6]] (partition: True)
  sum is even: [[1, 3, 5, 7], [2, 4, 6, 8]] (partition: True)

Functions on A = {1..8}
  x mod 4  injective False  surjective True   bijective False
  9 - x    injective True   surjective True   bijective True  inverse {8: 1, 7: 2, 6: 3, 5: 4, 4: 5, 3: 6, 2: 7, 1: 8}
  x // 2   injective False  surjective True   bijective False

Composition: (f after g)(3) = 6 | (g after f)(3) = 2 with f = 9 - x and g = x mod 4
```

### Hints

1. **Hint 1 (divides).** `{(a, b) for a in A for b in A if b % a == 0}`.
2. **Hint 2 (kind).** An equivalence relation is reflexive, symmetric and transitive; a partial order is reflexive, antisymmetric and transitive.
3. **Hint 3 (classes).** `frozenset(b for b in A if (a, b) in R)` for each `a`, collected in a set, gives the distinct classes.
4. **Hint 4 (partition).** `sum(len(c) for c in classes) == len(A)` and `set().union(*classes) == set(A)` together show a partition.
5. **Hint 5 (formatting booleans).** `str(value)` or `f"{value!s:<6}"` pads a boolean to a fixed width.
6. **Hint 6 (the inverse).** `{f(x): x for x in A}` is the inverse of a bijection.

### Success Criteria

- [ ] The four property tests are correct, including the difference between symmetric and antisymmetric.
- [ ] The table classifies `<=` and `divides` as partial orders, `congruent mod 3` and `sum is even` as equivalence relations, and `differs by 1` as neither.
- [ ] The classes of each equivalence relation form a partition of A.
- [ ] `9 - x` is found to be a bijection, with its inverse printed, and `x mod 4` is reported as surjective but not injective.
- [ ] The two compositions give different results.
- [ ] The dossier page contains the graph of "divides" and a correct explanation, and the output matches the expected output.

### Extension Challenge

Write a function that computes the **transitive closure** of a relation (the smallest transitive relation containing it) by repeatedly adding the pairs (a, c) forced by (a, b) and (b, c) until nothing changes (Warshall's idea). Apply it to "differs by 1" and describe the result in words. Then write a function `hasse(R)` that removes the reflexive pairs and the pairs implied by transitivity from a partial order, and print the cover relation of "divides" on {1, 2, 3, 4, 6, 12}.

## Lesson Recap

- A **relation** is a set of ordered pairs; on a set it may be **reflexive**, **symmetric**, **antisymmetric** and **transitive**.
- **Equivalence relations** (reflexive, symmetric, transitive) split a set into disjoint **equivalence classes** that form a partition; **partial orders** (reflexive, antisymmetric, transitive) rank elements.
- A **function** gives each input exactly one output; it is **injective** (one-to-one), **surjective** (onto) or **bijective** (both), and only bijections have inverses.
- **Composition** applies one function after another, and its order matters.
- **Congruence mod n** is an equivalence relation with n classes, the foundation of clocks, hashing and checksums.

## Homework / Extension Mission

Invent two relations on a set of ten people or things from real life (for example the students of your class). One should be an equivalence relation and one a partial order. Check each property with Python on your data, print the classes of the equivalence relation, and write a short report explaining why the classes are useful (for example "form seating groups with no friends separated"). Then solve: how many different functions are there from a 3-element set to a 4-element set, how many are injective, and why is the answer to "how many are surjective" zero for a 3-to-4 function?

## Course Project Connection

This lesson adds the **Relation Detective** to the **Computational Logic Challenge** dossier. It uses sets and Cartesian products from Lesson 2 and the quantifiers of Lesson 1, and it prepares the graphs of Lesson 6: a relation *is* a directed graph. The equivalence classes mod n are the same buckets as in the hash tables of Course 3, and the congruences will return in Lesson 4 (proofs about divisibility) and in the cryptography of Course 6.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: real-life relations and what "same remainder" does. 15 minutes: the four properties, with examples and non-examples on the board (Example 1). 10 minutes: equivalence classes and partitions (Example 2). 25 minutes: functions (Example 3) and the project.

**Live demonstrations.** Sort the class by birth month, then ask which properties hold and why the groups appear. Draw the "divides" digraph with arrows. Show `(-3) % 5` in Python and in C.

**Misconceptions.** "A relation must be a function." "Symmetric and antisymmetric are opposites." "Congruent means equal." "Every function has an inverse."

**Assessment of the project.** Check the property tests, the classification table, the partition check, the bijection's inverse and the explanation of why "differs by 1" fails (it is not reflexive and not transitive). Ask each student to give a relation that is symmetric but not transitive.

**Reference solution `relation_detective.py`** (run with `python3 relation_detective.py`):

```python
"""Relation Detective: the third entry of the Computational Logic Challenge dossier."""
A = list(range(1, 9))
RELATIONS = {
    "<=": {(a, b) for a in A for b in A if a <= b},
    "divides": {(a, b) for a in A for b in A if b % a == 0},
    "congruent mod 3": {(a, b) for a in A for b in A if (a - b) % 3 == 0},
    "differs by 1": {(a, b) for a in A for b in A if abs(a - b) == 1},
    "sum is even": {(a, b) for a in A for b in A if (a + b) % 2 == 0},
}


def reflexive(R):
    return all((a, a) in R for a in A)


def symmetric(R):
    return all((b, a) in R for (a, b) in R)


def antisymmetric(R):
    return all(a == b for (a, b) in R if (b, a) in R)


def transitive(R):
    return all((a, c) in R for (a, b) in R for (b2, c) in R if b == b2)


def kind(R):
    if reflexive(R) and symmetric(R) and transitive(R):
        return "equivalence relation"
    if reflexive(R) and antisymmetric(R) and transitive(R):
        return "partial order"
    return "neither"


def classes_of(R):
    return sorted((sorted(c) for c in {frozenset(b for b in A if (a, b) in R) for a in A}), key=lambda c: c[0])


print(f"{'relation':<18}{'refl':<7}{'symm':<7}{'anti':<7}{'trans':<7}kind")
for name, R in RELATIONS.items():
    print(f"{name:<18}{reflexive(R)!s:<7}{symmetric(R)!s:<7}{antisymmetric(R)!s:<7}{transitive(R)!s:<7}{kind(R)}")

print("\nEquivalence classes")
for name, R in RELATIONS.items():
    if kind(R) == "equivalence relation":
        classes = classes_of(R)
        partition = sum(len(c) for c in classes) == len(A) and set().union(*map(set, classes)) == set(A)
        print(f"  {name}: {classes} (partition: {partition})")


def classify(f, domain, codomain):
    outputs = [f(x) for x in domain]
    injective = len(set(outputs)) == len(outputs)
    surjective = set(outputs) == set(codomain)
    return injective, surjective


FUNCTIONS = [
    ("x mod 4", lambda x: x % 4, range(4)),
    ("9 - x", lambda x: 9 - x, A),
    ("x // 2", lambda x: x // 2, range(5)),
]
print("\nFunctions on A = {1..8}")
for name, f, codomain in FUNCTIONS:
    inj, sur = classify(f, A, codomain)
    line = f"  {name:<8} injective {inj!s:<6} surjective {sur!s:<6} bijective {inj and sur}"
    if inj and sur:
        line += "  inverse " + str({f(x): x for x in A})
    print(line)

f = FUNCTIONS[1][1]
g = FUNCTIONS[0][1]
print("\nComposition: (f after g)(3) =", f(g(3)), "| (g after f)(3) =", g(f(3)), "with f = 9 - x and g = x mod 4")
```

```output
relation          refl   symm   anti   trans  kind
<=                True   False  True   True   partial order
divides           True   False  True   True   partial order
congruent mod 3   True   True   False  True   equivalence relation
differs by 1      False  True   False  False  neither
sum is even       True   True   False  True   equivalence relation

Equivalence classes
  congruent mod 3: [[1, 4, 7], [2, 5, 8], [3, 6]] (partition: True)
  sum is even: [[1, 3, 5, 7], [2, 4, 6, 8]] (partition: True)

Functions on A = {1..8}
  x mod 4  injective False  surjective True   bijective False
  9 - x    injective True   surjective True   bijective True  inverse {8: 1, 7: 2, 6: 3, 5: 4, 4: 5, 3: 6, 2: 7, 1: 8}
  x // 2   injective False  surjective True   bijective False

Composition: (f after g)(3) = 6 | (g after f)(3) = 2 with f = 9 - x and g = x mod 4
```

**Differentiation.** Support: provide the relations and the four tests, and let students write `kind`, the classes and the function analysis. Stretch: add the transitive closure, the Hasse diagram and a check that congruence mod n respects addition and multiplication.

**Discussion questions (not for the student quiz).** Why is "is friends with" usually not an equivalence relation? How is a database foreign key a relation, and when is it a function?
