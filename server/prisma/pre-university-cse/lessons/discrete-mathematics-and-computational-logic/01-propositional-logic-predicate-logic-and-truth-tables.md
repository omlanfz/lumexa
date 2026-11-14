# Lumexa Mission Log: Discrete Mathematics & Computational Logic

**Course/Path:** Discrete Mathematics & Computational Logic
**Lesson:** 01 of 08
**Title:** Propositional Logic, Predicate Logic and Truth Tables
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** Logic · truth-table builder (with Python)

---

## Mission Brief

A school rule says: "If a student is absent for three days, then a parent must be called." On Monday a parent is called. Does that prove the student was absent for three days? Many people say yes. Logic says no: perhaps the parent was called for another reason. A single mistaken step like this, called *affirming the consequent*, is behind countless bugs, contracts that mean something different from what was intended, and arguments that sound right but are not.

Computers are built from logic, programs are full of logical conditions, and mathematics is a chain of logical steps. In this lesson you learn to turn everyday sentences into precise **propositions**, to test them exhaustively with **truth tables**, to recognise the laws that let you simplify them, and to reach for **predicates and quantifiers** when a statement is about "every" or "some". You will open the course project, the **Computational Logic Challenge**, with its first dossier entry: the **Truth Table Studio**.

## Learning Objectives

1. Define a proposition, and use the connectives NOT, AND, OR, XOR, implication and biconditional.
2. Translate English sentences, including "only if" and "unless", into logical formulas.
3. Build a truth table for a formula, and classify it as a tautology, a contradiction or a contingency.
4. Prove two formulas equivalent by their truth tables, and use De Morgan's laws and the contrapositive.
5. Use predicates, the quantifiers ∀ and ∃, and their negation rules, including in Python with `all` and `any`.
6. Build the Truth Table Studio: translated statements, truth tables, an equivalence check and an argument-validity check.

## Prerequisites

- Basic school algebra and the habit of testing a claim with examples.
- Course 1: `if` conditions and the operators `&&`, `||` and `!` (the same ideas, written differently).

## Concept Explanation

### Propositions and connectives

A **proposition** is a statement that is either **true** or **false**, but not both: "7 is prime" is a proposition; "Close the door" and "x + 1 = 5" (until *x* is known) are not. We name propositions with letters such as *p* and *q* and combine them with **connectives**:

| Connective | Symbol | Read as | Python | True when |
|---|---|---|---|---|
| Negation | ¬p | not p | `not p` | p is false |
| Conjunction | p ∧ q | p and q | `p and q` | both are true |
| Disjunction | p ∨ q | p or q (inclusive) | `p or q` | at least one is true |
| Exclusive or | p ⊕ q | p or q but not both | `p != q` | exactly one is true |
| Implication | p → q | if p then q | `(not p) or q` | p is false, or q is true |
| Biconditional | p ↔ q | p if and only if q | `p == q` | p and q have the same value |

The implication p → q is false in exactly one case: **p true and q false**. A promise "if it rains, I will take an umbrella" is broken only when it rains and I go without one. If it does not rain, the promise is *not broken*, whatever I do. Precedence, strongest first: ¬, ∧, ∨, →, ↔.

### Translating English into logic

Translation is a skill. Some phrases are traps:

- "**if p then q**" and "**p implies q**" are p → q.
- "**p only if q**" is p → q (not q → p): p can happen only when q does.
- "**p if q**" is q → p; "**p if and only if q**" is p ↔ q.
- "**p unless q**" means "if not q then p", that is ¬q → p (equivalent to p ∨ q).
- "**neither p nor q**" is ¬p ∧ ¬q; "**p but q**" is p ∧ q.

### Truth tables

A **truth table** lists every combination of truth values of the variables (2ⁿ rows for *n* variables) and the value of the formula in each. It is a complete, mechanical proof: nothing is left unchecked. A formula is a **tautology** if it is true in every row (p ∨ ¬p), a **contradiction** if it is false in every row (p ∧ ¬p), and a **contingency** if it can be either. Two formulas are **logically equivalent** (≡) if they have the same value in every row. An argument with premises and a conclusion is **valid** if there is no row in which all the premises are true and the conclusion is false; such a row is a **counterexample**.

### Laws of logic

Equivalences let us rewrite a formula without changing its meaning:

| Law | Equivalence |
|---|---|
| Double negation | ¬¬p ≡ p |
| De Morgan | ¬(p ∧ q) ≡ ¬p ∨ ¬q and ¬(p ∨ q) ≡ ¬p ∧ ¬q |
| Implication as OR | p → q ≡ ¬p ∨ q |
| Contrapositive | p → q ≡ ¬q → ¬p |
| Biconditional | p ↔ q ≡ (p → q) ∧ (q → p) |
| Distribution | p ∧ (q ∨ r) ≡ (p ∧ q) ∨ (p ∧ r) |

The **converse** q → p and the **inverse** ¬p → ¬q of p → q are *not* equivalent to it: confusing them is the mistake in the Mission Brief. Only the contrapositive is.

### Predicates and quantifiers

Propositional logic cannot say "every student passed". A **predicate** P(x) is a statement about a variable *x* that becomes a proposition when *x* is given a value from a **domain**. **Quantifiers** make statements about the whole domain: **∀x P(x)** ("for all x, P(x)") and **∃x P(x)** ("there exists an x with P(x)"). Their negations swap each other: ¬∀x P(x) ≡ ∃x ¬P(x) and ¬∃x P(x) ≡ ∀x ¬P(x). The **order** of mixed quantifiers matters: "for every person there is someone they love" (∀x ∃y) is not "there is someone whom everyone loves" (∃y ∀x). In Python, `all(...)` is ∀ and `any(...)` is ∃ over a finite domain.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Proposition** | A statement that is either true or false. |
| **Connective** | An operator that combines propositions: ¬, ∧, ∨, ⊕, →, ↔. |
| **Truth table** | A table of the value of a formula for every combination of its variables. |
| **Tautology / contradiction** | A formula that is always true / always false. |
| **Contingency** | A formula that is true for some inputs and false for others. |
| **Logical equivalence** | Two formulas with the same truth value in every row (written ≡). |
| **Contrapositive** | For p → q, the statement ¬q → ¬p, which is equivalent to it. |
| **Predicate** | A statement P(x) about a variable that becomes a proposition when x is chosen. |
| **Quantifier** | ∀ (for all) or ∃ (there exists), applied to a predicate over a domain. |
| **Counterexample** | An assignment that makes all premises true and the conclusion false. |

## Worked Examples

### Example 1: A truth table by program

```python
from itertools import product


def implies(a, b):
    return (not a) or b


headings = ["p", "q", "p->q", "q->p", "p<->q"]
print("  " + "  ".join(headings))
for p, q in product([True, False], repeat=2):
    cells = [p, q, implies(p, q), implies(q, p), p == q]
    print("  " + "  ".join(("T" if c else "F").center(len(h)) for c, h in zip(cells, headings)))
```

```output
  p  q  p->q  q->p  p<->q
  T  T   T     T      T
  T  F   F     T      F
  F  T   T     F      F
  F  F   T     T      T
```

1. `product([True, False], repeat=2)` generates all four combinations of two variables: the rows of the table.
2. `implies(a, b)` is `(not a) or b`, the law "implication as OR". It is false only for `p = T, q = F`.
3. The columns for `p -> q` and `q -> p` differ in the two middle rows, so an implication is **not** the same as its converse.
4. The biconditional column is true only where *p* and *q* agree, which is where *both* implications are true.

### Example 2: Checking equivalences by brute force

```python
from itertools import product


def implies(a, b):
    return (not a) or b


def equivalent(f, g, n):
    return all(f(*row) == g(*row) for row in product([True, False], repeat=n))


print("De Morgan:", equivalent(lambda p, q: not (p and q), lambda p, q: (not p) or (not q), 2))
print("contrapositive:", equivalent(lambda p, q: implies(p, q), lambda p, q: implies(not q, not p), 2))
print("converse:", equivalent(lambda p, q: implies(p, q), lambda p, q: implies(q, p), 2))
print("distribution:", equivalent(lambda p, q, r: p and (q or r), lambda p, q, r: (p and q) or (p and r), 3))
```

```output
De Morgan: True
contrapositive: True
converse: False
distribution: True
```

1. `equivalent` tries every row and checks that both formulas agree: a truth-table proof.
2. De Morgan's law, the contrapositive and the distributive law are equivalences, so they print `True`.
3. The converse is not equivalent to the original implication, so it prints `False`: one row is enough to break an equivalence.
4. With three variables there are 2³ = 8 rows. The method works for any number of variables, but the work doubles with every new one.

### Example 3: Quantifiers over a finite domain

```python
domain = range(1, 11)

print("for all x: x*x >= x ->", all(x * x >= x for x in domain))
print("exists x: x*x == 49 ->", any(x * x == 49 for x in domain))
print("not (for all x: x is even) ->", not all(x % 2 == 0 for x in domain))
print("exists x: x is odd ->", any(x % 2 == 1 for x in domain))

people = [1, 2, 3]
admires = {(1, 2), (2, 3), (3, 1)}
print("everyone admires someone ->", all(any((x, y) in admires for y in people) for x in people))
print("someone is admired by everyone ->", any(all((x, y) in admires for x in people) for y in people))
```

```output
for all x: x*x >= x -> True
exists x: x*x == 49 -> True
not (for all x: x is even) -> True
exists x: x is odd -> True
everyone admires someone -> True
someone is admired by everyone -> False
```

1. `all(...)` over the domain is ∀ and `any(...)` is ∃. The first statement is true for every number from 1 to 10, and the second is true because x = 7 gives 49.
2. The third and fourth lines illustrate negation: "not every number is even" is the same as "some number is odd", and both are true.
3. In the last two lines the *same* relation gives different answers with the quantifiers in the other order: everyone admires someone (∀x ∃y), but nobody is admired by everyone (∃y ∀x).
4. A finite domain lets us check quantified statements by brute force, as a truth table does for propositions.

## Common Mistakes and Misconceptions

- **Reading "if p then q" as "p because of q".** An implication does not claim a cause, and it is true whenever *p* is false.
- **Confusing an implication with its converse.** "If it rains the ground is wet" does not mean "if the ground is wet it rained".
- **Translating "only if" backwards.** "You may vote only if you are 18" is *vote → 18*, not the other way round.
- **Reading "or" as exclusive.** In logic and in programming, `or` is inclusive: it is true if both are true. Use ⊕ when you mean one but not both.
- **Negating a conjunction without changing the connective.** ¬(p ∧ q) is ¬p ∨ ¬q, not ¬p ∧ ¬q (De Morgan).
- **Believing a table with one true row proves a law.** A law needs *every* row, a counterexample needs only one.
- **Swapping the order of mixed quantifiers.** ∀x ∃y and ∃y ∀x say different things.
- **Negating "all" as "none".** The negation of "all students passed" is "at least one student did not pass", not "no student passed".

## Guided Hands-On Activity

**Translate, tabulate, test.** Work with your teacher.

1. Use the truth-table visual of this lesson to fill the table for p → q, ¬p ∨ q and ¬q → ¬p. Which columns are identical?
2. Translate into logic with *r* = "it is raining" and *u* = "I take an umbrella": (a) "If it rains, I take an umbrella." (b) "I take an umbrella only if it rains." (c) "I take an umbrella unless it is dry." Which two are equivalent, if any?
3. Type Example 1 and add a column for p ⊕ q (`p != q`) and one for ¬(p ↔ q). What do you notice?
4. In Example 2, add a check that p ∨ (q ∧ r) ≡ (p ∨ q) ∧ (p ∨ r), and one that p → (q → r) ≡ (p → q) → r. Predict each answer first.
5. In Example 3, change the domain to `range(0, 11)` and the predicate to `x * x > x`. Which statements change, and why?
6. Write the negation of "Every student in the class passed at least one exam" using quantifiers, push the negation inwards and say it in English.

## Lesson Project: Truth Table Studio

### Objective

Open the **Computational Logic Challenge** dossier with the **Truth Table Studio**: a Python program that checks six translated statements, builds a truth table, classifies formulas, tests equivalences and decides whether two arguments are valid. The dossier entry also contains your written translations and a short equivalence proof.

### Requirements

- Use the atoms *r* = "it is raining", *c* = "I carry an umbrella", *s* = "I am at school", *h* = "I have homework". Translate these statements into Python formulas and also write them with logic symbols in your dossier:
  1. If it is raining, then I carry an umbrella.
  2. I carry an umbrella only if it is raining.
  3. I am at school unless it is raining.
  4. I have homework and I am not at school.
  5. Either I am at school or I have homework, but not both.
  6. It is raining if and only if I carry an umbrella.
- Write the helpers `implies`, `rows` (all assignments of the variables), `show` (print a truth table), `classify` (tautology, contradiction or contingency), `equivalent` and `counterexample`.
- The program prints: (1) in how many of the 16 rows each translated statement is true, and whether statements 1 and 2 are equivalent; (2) the truth table of `p and not q`; (3) the classification of four formulas; (4) four equivalence checks (De Morgan, contrapositive, converse, inverse); (5) the validity of three arguments (modus ponens, affirming the consequent, hypothetical syllogism), printing a counterexample for the invalid one.
- In the dossier, add a paragraph that proves p → q ≡ ¬q → ¬p with a four-row truth table, and explains in your own words why the converse is not equivalent.

### Instructions

1. Write the six translations first, on paper, with the symbols. Check "only if" and "unless" twice.
2. Write `implies`, `rows` and `tf` (which turns `True` into `"T"`), and test them with two variables.
3. Write `show`, and print the table for `p and not q` with the headings `p`, `q`, `not q` and `p and not q`.
4. Write `classify` and `equivalent`, and run them on the formulas from the requirements.
5. Write `counterexample(names, premises, conclusion)`, which returns the first row where all premises are true and the conclusion is false, or `None`.
6. Write the part that counts the rows for the six translated statements over the four atoms.
7. Compare your output with the expected output, and write the dossier paragraph with your table.

### Expected Output

```text
Translated statements (true in how many of 16 rows)
  1. r -> c                  12
  2. c -> r (only if)        12
  3. not r -> s (unless)     12
  4. h and not s              4
  5. s xor h                  8
  6. r <-> c                  8
  statements 1 and 2 equivalent: False

Truth table: p and not q
            p            q        not q  p and not q
            T            T            F            F
            T            F            T            T
            F            T            F            F
            F            F            T            F

Classification
  (p -> q) or (q -> p)            tautology
  (p or q) and not p and not q    contradiction
  p -> (p or q)                   tautology
  p xor q                         contingency

Equivalences
  not (p and q) == (not p) or (not q)   True
  p -> q == not q -> not p              True
  p -> q == q -> p (converse)           False
  p -> q == not p -> not q (inverse)    False

Arguments
  modus ponens: valid
  affirming the consequent: invalid, counterexample p=F q=T
  hypothetical syllogism: valid
```

### Hints

1. **Hint 1 (the translations).** Statement 2 is `implies(c, r)`, statement 3 is `implies(not r, s)`, and statement 5 is `s != h`.
2. **Hint 2 (all rows).** `product([True, False], repeat=len(names))` and `dict(zip(names, values))` give an assignment per row.
3. **Hint 3 (calling a formula).** Store formulas as functions of keyword arguments (`lambda p, q: ...`) and call them with `f(**env)`.
4. **Hint 4 (counting rows).** `sum(1 for env in rows(names) if f(**env))`.
5. **Hint 5 (a counterexample).** Premises are all true and the conclusion is false: `all(p(**env) for p in premises) and not conclusion(**env)`.
6. **Hint 6 (formatting).** `f"{text:<34}"` pads text to a fixed width, and `"T" if value else "F"` prints booleans.

### Success Criteria

- [ ] The six statements are translated correctly, with "only if" and "unless" handled as in the lesson.
- [ ] Statements 1 and 2 are reported as *not* equivalent, and the program counts the rows for each statement.
- [ ] `classify` correctly reports a tautology, a contradiction and contingencies.
- [ ] The contrapositive is shown equivalent and the converse and inverse are not.
- [ ] The invalid argument (affirming the consequent) comes with a counterexample row.
- [ ] The dossier paragraph contains a correct four-row proof and a clear explanation of the converse.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Extend the studio to read a formula typed as text (for example `p and (q or not r)`), find its variable names automatically, and print its truth table, using Python's `eval` *only* on a string made from the variable names and a whitelist of the words `and`, `or`, `not`, `True`, `False` and brackets. Explain in a comment why `eval` on untrusted text is dangerous, and then write a small parser that does not use `eval` at all.

## Lesson Recap

- A **proposition** is true or false; connectives combine propositions, and p → q is false only when p is true and q is false.
- Translate carefully: "p only if q" is p → q; "p unless q" is ¬q → p.
- A **truth table** checks every case: it classifies formulas (tautology, contradiction, contingency) and proves equivalences and the validity of arguments.
- The **contrapositive** is equivalent to an implication; the **converse** and **inverse** are not. De Morgan's laws turn ∧ into ∨ when negating.
- **Predicates** and the quantifiers ∀ and ∃ express statements about a domain; negating swaps the quantifier, and their order matters.

## Homework / Extension Mission

Collect five sentences from real life (a school rule, a game rule, a terms-of-use sentence, a recipe, a road sign), translate each into logic with named atoms, and say which are ambiguous in English and how you resolved the ambiguity. Then use the studio to check one surprising claim, for example "(p → q) ∧ (q → r) ⊢ (p → r)" or "¬(p ↔ q) ≡ (p ⊕ q)", and add the table to your dossier. Finally, write one program condition from your Course 1 code and simplify it with De Morgan's laws, showing that both versions give the same truth table.

## Course Project Connection

This lesson opens the **Computational Logic Challenge**, the course project: a dossier of logic problems, graphs and mathematical reasoning. The Truth Table Studio is its first entry, with your translations and an equivalence proof. In the next lessons you will add set operations (Lesson 2), a classified relation (Lesson 3), four proofs (Lesson 4), counting and probability (Lesson 5), a campus graph (Lesson 6), recurrences (Lesson 7) and a pattern machine (Lesson 8). The same logic reappears in digital circuits (Course 5) and in database conditions (Course 7).

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the absent-student story and propositions. 15 minutes: connectives and translation traps (do a "translate this sentence" quick-fire). 10 minutes: truth tables and laws with the interactive visual. 25 minutes: the project, with the translations done first on paper.

**Live demonstrations.** Use the truth-table visual to reveal a column at a time, and ask students to predict it. Play "spot the converse" with newspaper-style claims. Show `all` and `any` as the quantifiers in the Python console.

**Misconceptions.** "If p is false, p → q is meaningless" (it is true: vacuous truth). "Or means one of them." "Negating 'all' gives 'none'." "A true conclusion makes the argument valid."

**Assessment of the project.** Check the translations of "only if" and "unless" first, then the program output and the counterexample, then the dossier proof. Ask each student to explain why statement 2 is not equivalent to statement 1.

**Reference solution `studio.py`** (run with `python3 studio.py`):

```python
"""Truth Table Studio: the first entry of the Computational Logic Challenge dossier."""
from itertools import product


def implies(a, b):
    return (not a) or b


def rows(names):
    for values in product([True, False], repeat=len(names)):
        yield dict(zip(names, values))


def tf(value):
    return "T" if value else "F"


def show(names, columns):
    headings = names + [heading for heading, _ in columns]
    print("  " + "  ".join(f"{h:>11}" for h in headings))
    for env in rows(names):
        cells = [tf(env[n]) for n in names] + [tf(f(**env)) for _, f in columns]
        print("  " + "  ".join(f"{c:>11}" for c in cells))


def classify(names, formula):
    results = [formula(**env) for env in rows(names)]
    if all(results):
        return "tautology"
    if not any(results):
        return "contradiction"
    return "contingency"


def equivalent(names, f, g):
    return all(f(**env) == g(**env) for env in rows(names))


def counterexample(names, premises, conclusion):
    for env in rows(names):
        if all(p(**env) for p in premises) and not conclusion(**env):
            return env
    return None


ATOMS = ["r", "c", "s", "h"]
STATEMENTS = [
    ("1. r -> c", lambda r, c, s, h: implies(r, c)),
    ("2. c -> r (only if)", lambda r, c, s, h: implies(c, r)),
    ("3. not r -> s (unless)", lambda r, c, s, h: implies(not r, s)),
    ("4. h and not s", lambda r, c, s, h: h and not s),
    ("5. s xor h", lambda r, c, s, h: s != h),
    ("6. r <-> c", lambda r, c, s, h: r == c),
]

print("Translated statements (true in how many of 16 rows)")
for text, f in STATEMENTS:
    print(f"  {text:<26}{sum(1 for env in rows(ATOMS) if f(**env)):>3}")
print("  statements 1 and 2 equivalent:", equivalent(ATOMS, STATEMENTS[0][1], STATEMENTS[1][1]))

print("\nTruth table: p and not q")
show(["p", "q"], [("not q", lambda p, q: not q), ("p and not q", lambda p, q: p and not q)])

print("\nClassification")
FORMULAS = [
    ("(p -> q) or (q -> p)", lambda p, q: implies(p, q) or implies(q, p)),
    ("(p or q) and not p and not q", lambda p, q: (p or q) and not p and not q),
    ("p -> (p or q)", lambda p, q: implies(p, p or q)),
    ("p xor q", lambda p, q: p != q),
]
for text, f in FORMULAS:
    print(f"  {text:<32}{classify(['p', 'q'], f)}")

print("\nEquivalences")
PAIRS = [
    ("not (p and q) == (not p) or (not q)", lambda p, q: not (p and q), lambda p, q: (not p) or (not q)),
    ("p -> q == not q -> not p", lambda p, q: implies(p, q), lambda p, q: implies(not q, not p)),
    ("p -> q == q -> p (converse)", lambda p, q: implies(p, q), lambda p, q: implies(q, p)),
    ("p -> q == not p -> not q (inverse)", lambda p, q: implies(p, q), lambda p, q: implies(not p, not q)),
]
for text, f, g in PAIRS:
    print(f"  {text:<38}{equivalent(['p', 'q'], f, g)}")

print("\nArguments")
ARGUMENTS = [
    ("modus ponens", ["p", "q"], [lambda p, q: implies(p, q), lambda p, q: p], lambda p, q: q),
    ("affirming the consequent", ["p", "q"], [lambda p, q: implies(p, q), lambda p, q: q], lambda p, q: p),
    ("hypothetical syllogism", ["p", "q", "r"], [lambda p, q, r: implies(p, q), lambda p, q, r: implies(q, r)], lambda p, q, r: implies(p, r)),
]
for text, names, premises, conclusion in ARGUMENTS:
    found = counterexample(names, premises, conclusion)
    if found is None:
        print(f"  {text}: valid")
    else:
        print(f"  {text}: invalid, counterexample " + " ".join(f"{n}={tf(v)}" for n, v in found.items()))
```

```output
Translated statements (true in how many of 16 rows)
  1. r -> c                  12
  2. c -> r (only if)        12
  3. not r -> s (unless)     12
  4. h and not s              4
  5. s xor h                  8
  6. r <-> c                  8
  statements 1 and 2 equivalent: False

Truth table: p and not q
            p            q        not q  p and not q
            T            T            F            F
            T            F            T            T
            F            T            F            F
            F            F            T            F

Classification
  (p -> q) or (q -> p)            tautology
  (p or q) and not p and not q    contradiction
  p -> (p or q)                   tautology
  p xor q                         contingency

Equivalences
  not (p and q) == (not p) or (not q)   True
  p -> q == not q -> not p              True
  p -> q == q -> p (converse)           False
  p -> q == not p -> not q (inverse)    False

Arguments
  modus ponens: valid
  affirming the consequent: invalid, counterexample p=F q=T
  hypothetical syllogism: valid
```

**Differentiation.** Support: provide `implies`, `rows` and `show`, and let students write the formulas, `classify` and `equivalent`. Stretch: add the formula parser, a minimiser for two-variable formulas, and the check of a law with three variables such as the distributive law.

**Discussion questions (not for the student quiz).** Why is "if 2 + 2 = 5 then the moon is cheese" a true statement? How do `and` and `or` in Python differ from `&` and `|`?
