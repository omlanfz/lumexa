# Lumexa Mission Log: Discrete Mathematics & Computational Logic

**Course/Path:** Discrete Mathematics & Computational Logic
**Lesson:** 04 of 08
**Title:** Mathematical Proofs, Induction and Contradiction
**Duration:** 60 minutes
**Difficulty:** Advanced
**Technology:** Proof writing (with Python as a sanity checker)

---

## Mission Brief

Take the formula n² + n + 41. Put in 0 and you get 41, a prime. Put in 1 and you get 43, a prime. Try 2, 3, 4, ..., 39: every single result is prime. Forty tests in a row. Does the formula always give a prime? Computers have checked far more cases than people can do by hand, and still the answer is **no**: for n = 40 the result is 1681, which is 41 × 41.

Testing can show that a claim is *false*, but no amount of testing can show that it is *true* for infinitely many cases. That is the job of a **proof**: an argument so careful that it convinces anyone, forever. Proofs are not just for mathematicians. A proof that a sorting algorithm is correct, that a loop always ends, or that a protocol cannot leak a secret is what makes software trustworthy. In this lesson you learn the four classic techniques (**direct proof**, **contrapositive**, **contradiction** and **induction**), you write proofs in a clear structure, and you build the **Proof Portfolio** for your dossier.

## Learning Objectives

1. Explain what a proof is, and why testing examples cannot prove a general claim but one counterexample can disprove it.
2. Write direct proofs and proofs by contrapositive for statements about integers.
3. Write a proof by contradiction, including the proof that √2 is irrational and that there are infinitely many primes.
4. Prove statements by mathematical induction, and explain the roles of the base case and the inductive step.
5. Link induction to programming: loop invariants and recursion.
6. Build the Proof Portfolio: four written proofs and a program that sanity-checks their claims.

## Prerequisites

- Lesson 1: implication, contrapositive and quantifiers.
- Lesson 3: congruence and divisibility; school algebra with even and odd numbers.

## Concept Explanation

### What is a proof?

A **proof** is a finite sequence of logical steps that shows a statement follows from **definitions**, **axioms** (accepted starting facts) and earlier **theorems**. A small helper theorem is a **lemma**; a quick consequence is a **corollary**. A claim of the form "for all n, P(n)" is **disproved** by a single **counterexample** (as n = 40 breaks the formula above), but proved only by an argument that covers *every* n. Checking examples is valuable (it finds mistakes and suggests what to prove) but it is **not a proof**.

Two definitions we use throughout: an integer *n* is **even** if n = 2k for some integer k, and **odd** if n = 2k + 1 for some integer k. An integer *a* **divides** *b* if b = a·k for some integer k.

### Direct proof

To prove "if p then q" directly, *assume* p and use definitions and algebra to reach q.

> **Claim.** If n is odd, then n² is odd.
> **Proof.** Let n be odd, so n = 2k + 1 for some integer k. Then n² = (2k + 1)² = 4k² + 4k + 1 = 2(2k² + 2k) + 1. Since 2k² + 2k is an integer, n² has the form 2m + 1, so n² is odd. ∎

The symbol ∎ ("Q.E.D.") marks the end. Notice how the proof used the *definition* of odd twice.

### Proof by contrapositive

Since p → q ≡ ¬q → ¬p (Lesson 1), you may prove the contrapositive instead; this helps when "not q" is easier to use than "p".

> **Claim.** If n² is even, then n is even.
> **Proof.** We prove the contrapositive: if n is odd, then n² is odd. This is exactly the claim above. Since a statement and its contrapositive are equivalent, the original claim holds. ∎

### Proof by contradiction

To prove a statement S, *assume S is false* and derive something impossible (a statement and its negation). Then S must be true.

> **Claim.** √2 is irrational.
> **Proof.** Suppose √2 is rational: √2 = a/b with integers a, b in lowest terms (no common factor). Squaring, 2b² = a², so a² is even, so a is even (contrapositive claim above): a = 2c. Then 2b² = 4c², so b² = 2c², so b² is even and b is even. Now a and b are both even, contradicting "lowest terms". So √2 is irrational. ∎

The same method proves that there are **infinitely many primes**: if there were only finitely many, p₁, ..., pₖ, then N = p₁·p₂···pₖ + 1 leaves remainder 1 when divided by every pᵢ, so any prime factor of N is a prime that is not in the list, a contradiction.

### Mathematical induction

**Induction** proves statements P(n) for every integer n ≥ n₀. It is like a line of dominoes: if the first falls, and each falling domino knocks the next, all fall.

1. **Base case**: prove P(n₀).
2. **Inductive step**: assume P(k) for an arbitrary k ≥ n₀ (the **inductive hypothesis**) and prove P(k + 1).

> **Claim.** For every n ≥ 1, 1 + 2 + ... + n = n(n + 1)/2.
> **Proof.** *Base case:* for n = 1 both sides equal 1. *Inductive step:* assume 1 + 2 + ... + k = k(k + 1)/2. Then 1 + 2 + ... + k + (k + 1) = k(k + 1)/2 + (k + 1) = (k + 1)(k/2 + 1) = (k + 1)(k + 2)/2, which is the formula for n = k + 1. By induction the formula holds for all n ≥ 1. ∎

**Strong induction** assumes P(m) for *all* m ≤ k to prove P(k + 1); it is used when the next case depends on several earlier ones (every integer ≥ 2 is a product of primes).

### Proofs and programs

Induction is the mathematics of loops and recursion. A **loop invariant** is a statement that is true before the loop, stays true after every pass (the inductive step), and, together with the loop condition, gives the result when the loop ends. A recursive function is correct by induction on the size of its input: the base case returns the right answer, and if the recursive call is right, so is the result built from it. This is why a proof of a program's correctness is often an induction.

### Writing a good proof

State the **claim** exactly. Say which **method** you use. Name the variables and what you assume. Justify every step with a definition or a known fact. End with a clear conclusion and the mark ∎. Common **fallacies**: proving only examples, assuming what you must prove (circular reasoning), dividing by something that may be zero, and affirming the consequent (Lesson 1).

## Key Vocabulary

| Term | Definition |
|---|---|
| **Proof** | A logical argument that shows a statement follows from definitions and known facts. |
| **Theorem / lemma / corollary** | A proven statement; a helper theorem; a quick consequence. |
| **Counterexample** | A single case that shows a "for all" claim is false. |
| **Direct proof** | A proof that assumes the hypothesis and derives the conclusion. |
| **Contrapositive** | The statement ¬q → ¬p, equivalent to p → q. |
| **Proof by contradiction** | A proof that assumes the opposite and derives an impossibility. |
| **Induction** | A proof in two parts: a base case and a step from k to k + 1. |
| **Inductive hypothesis** | The assumption that P(k) is true, used to prove P(k + 1). |
| **Loop invariant** | A fact that is true before and after every pass of a loop. |
| **Rational / irrational** | A number that can / cannot be written as a fraction of integers. |

## Worked Examples

### Example 1: Evidence is not proof

```python
def smallest_factor(n):
    d = 2
    while d * d <= n:
        if n % d == 0:
            return d
        d += 1
    return n


def is_prime(n):
    return n > 1 and smallest_factor(n) == n


first_failure = next(n for n in range(0, 100) if not is_prime(n * n + n + 41))
print(f"n*n + n + 41 is prime for n = 0..{first_failure - 1}")
value = first_failure ** 2 + first_failure + 41
print(f"but n = {first_failure} gives {value} = {smallest_factor(value)} * {value // smallest_factor(value)}")

total = 0
for n in range(1, 1001):
    total += n
    assert total == n * (n + 1) // 2
print("1 + 2 + ... + n = n(n+1)/2 checked for n = 1..1000 (evidence only; induction proves it)")
```

```output
n*n + n + 41 is prime for n = 0..39
but n = 40 gives 1681 = 41 * 41
1 + 2 + ... + n = n(n+1)/2 checked for n = 1..1000 (evidence only; induction proves it)
```

1. The program finds the first *counterexample* to "n² + n + 41 is always prime": n = 40 gives 1681 = 41 × 41. One counterexample is enough to destroy a universal claim.
2. The second claim has no known counterexample, and a thousand checks pass. That makes us trust it, but the proof by induction (above) is what makes it a theorem.
3. `assert` stops the program if a check fails: a cheap way to test a conjecture before spending effort on a proof.
4. Use computers to *explore and refute*, and proofs to *establish* what is true for all cases.

### Example 2: A loop invariant (induction in code)

```python
def sum_of_odds(n):
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
print("the invariant held at every pass")
```

```output
sum of the first 0 odd numbers = 0 = 0^2
sum of the first 1 odd numbers = 1 = 1^2
sum of the first 5 odd numbers = 25 = 5^2
sum of the first 10 odd numbers = 100 = 10^2
the invariant held at every pass
```

1. The invariant "total = k²" is true before the loop (k = 0, total = 0): this is the **base case**.
2. If it is true at the start of a pass, adding the next odd number 2(k + 1) − 1 = 2k + 1 turns k² into k² + 2k + 1 = (k + 1)²: this is the **inductive step**.
3. When the loop stops, k = n, so the invariant says total = n². The program proves its own result, one pass at a time.
4. This is precisely the induction proof of "1 + 3 + 5 + ... + (2n − 1) = n²", written as code.

### Example 3: Euclid's proof, by computer

```python
def smallest_factor(n):
    d = 2
    while d * d <= n:
        if n % d == 0:
            return d
        d += 1
    return n


primes = [2]
for _ in range(5):
    n = 1
    for p in primes:
        n *= p
    n += 1
    new = smallest_factor(n)
    print(f"{primes} -> product + 1 = {n}, smallest prime factor {new}, already in the list? {new in primes}")
    primes.append(new)
```

```output
[2] -> product + 1 = 3, smallest prime factor 3, already in the list? False
[2, 3] -> product + 1 = 7, smallest prime factor 7, already in the list? False
[2, 3, 7] -> product + 1 = 43, smallest prime factor 43, already in the list? False
[2, 3, 7, 43] -> product + 1 = 1807, smallest prime factor 13, already in the list? False
[2, 3, 7, 43, 13] -> product + 1 = 23479, smallest prime factor 53, already in the list? False
```

1. Euclid's idea: multiply all the primes you have, add 1, and look at the prime factors of the result. None of them can be on the list, because dividing by any listed prime leaves remainder 1.
2. The number itself need not be prime (1807 = 13 × 139 in the fourth line), but its smallest prime factor is always a *new* prime.
3. So any finite list of primes can be extended, which contradicts "these are all the primes": there are infinitely many.
4. The program shows the construction at work. The proof by contradiction explains why it always works.

## Common Mistakes and Misconceptions

- **Proving a statement by examples.** "It works for 1, 2 and 3" proves nothing about all n.
- **Assuming what you want to prove.** Circular reasoning is the most common flaw in student proofs.
- **Forgetting the base case.** Without a first domino, nothing falls. "All horses have the same colour" is "proved" by an induction that skips a base case.
- **Not using the inductive hypothesis.** If your inductive step never uses P(k), it is not an induction.
- **Proving the converse by mistake.** Proving q → p does not prove p → q (Lesson 1).
- **Dividing by zero in the middle of an algebraic argument.** A hidden division can make 1 = 2.
- **Using a letter twice.** If n = 2k and m = 2k, then n = m. Use different letters for different integers.
- **Ending without a conclusion.** Say clearly which statement was proved and by which method.

## Guided Hands-On Activity

**Prove it, then test it.** Work with your teacher.

1. Write a direct proof that the sum of two even numbers is even, using n = 2a and m = 2b.
2. Write the contrapositive of "if n² is divisible by 3 then n is divisible by 3", and prove it by splitting n into the cases n = 3k + 1 and n = 3k + 2.
3. Type Example 1 and use `assert` to test the claim "n² ≥ n for every integer n from -50 to 50". Find a counterexample or explain why it holds.
4. Prove by induction that 2ⁿ > n for all n ≥ 1, writing the base case and the inductive step carefully.
5. Type Example 2 and change it to check the invariant total = k(k + 1)/2 for the sum 1 + 2 + ... + n.
6. Find the mistake in this "proof" that 1 = 2: *let a = b; then a² = ab; so a² − b² = ab − b²; so (a + b)(a − b) = b(a − b); divide by (a − b): a + b = b; so 2b = b; so 2 = 1.*

## Lesson Project: Proof Portfolio

### Objective

Create the **Proof Portfolio**, the fourth entry of your Computational Logic Challenge dossier: four clearly written proofs, one by each of the four techniques, together with a Python program that sanity-checks each claim for small cases and shows a conjecture that fails.

### Requirements

- Write these four proofs, each with the structure **Claim / Method / Proof / ∎**:
  1. **Direct proof:** the sum of two odd integers is even.
  2. **Contrapositive:** if n² is even, then n is even.
  3. **Contradiction:** √3 is irrational (you may use the lemma "if 3 divides n², then 3 divides n", which you must also prove by cases).
  4. **Induction:** for every integer n ≥ 1, 1 + 3 + 5 + ... + (2n − 1) = n².
- Write a program `checker.py` that: (a) finds and prints the first counterexample of the conjecture "n² + n + 41 is prime"; (b) sanity-checks claim 1 for all odd pairs between −99 and 99; (c) sanity-checks claim 2 for n from −200 to 200; (d) searches for a fraction p/q with q up to 200 and p² = 3q² and reports that none exists; (e) checks claim 4 for n from 1 to 200 with a loop invariant `assert`; (f) prints one line for each check.
- The program must use `assert` or an explicit test so that a wrong claim would be caught, and it must be honest in its wording: a check is "no counterexample found", never "proved".
- In the portfolio, add a paragraph explaining why the program does not prove the claims.

### Instructions

1. Write the four proofs on paper first. For each, list the definitions you will use (even, odd, divides, rational).
2. Check each proof: does every step follow from a definition or a known fact? Does the induction use the hypothesis?
3. Write `smallest_factor` and `is_prime`, and the counterexample search for n² + n + 41.
4. Write checks (b) to (e), each as a small loop with a test.
5. Print one line per check, in the layout of the expected output.
6. Run the program; then swap one claim for a false one (for example "sum of two odd numbers is odd") to see the check fail.
7. Write the paragraph about the limits of testing, and assemble the portfolio.

### Expected Output

```text
conjecture: n*n + n + 41 is always prime            FALSE, first counterexample n = 40 (1681)
claim 1: sum of two odd integers is even            no counterexample found
claim 2: if n*n is even then n is even              no counterexample found
claim 3: p*p == 3*q*q has no solution (q <= 200)    no counterexample found
claim 4: 1 + 3 + ... + (2n-1) = n*n, n <= 200       no counterexample found
Checks are evidence, not proofs: only the written proofs establish the claims for every n.
```

### Hints

1. **Hint 1 (direct proof).** Let a = 2k + 1 and b = 2m + 1, and add them.
2. **Hint 2 (the lemma for √3).** If n = 3k + 1 or n = 3k + 2, then n² leaves remainder 1 when divided by 3, so 3 divides n² only if 3 divides n.
3. **Hint 3 (contradiction for √3).** Suppose √3 = a/b in lowest terms; then a² = 3b², so 3 divides a, say a = 3c; then 3b² = 9c², so b² = 3c², so 3 divides b: a contradiction.
4. **Hint 4 (induction).** In the step, add the next term 2(k + 1) − 1 = 2k + 1 to k² and recognise (k + 1)².
5. **Hint 5 (the fraction search).** Loop `q` from 1 to 200 and `p` from 0 to 400, and test `p * p == 3 * q * q`.
6. **Hint 6 (the output).** Use `f"{text:<48}{result}"` to align the results.

### Success Criteria

- [ ] All four proofs follow the structure Claim / Method / Proof / ∎ and use the definitions correctly.
- [ ] The √3 proof includes the lemma about divisibility by 3, proved by cases.
- [ ] The induction has a base case, a stated inductive hypothesis and a step that really uses it.
- [ ] The program finds the counterexample at n = 40 and reports "no counterexample found" for the four claims.
- [ ] The paragraph explains clearly why checking cases is not proving.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Prove by **strong induction** that every integer n ≥ 2 is a product of primes. Then write a Python function that returns the prime factorisation of n and use an `assert` to check, for n from 2 to 2000, that the product of the factors equals n. Explain how the program's recursion mirrors the structure of the strong-induction proof.

## Lesson Recap

- A **proof** is a complete logical argument from definitions and known facts; examples are evidence, a **counterexample** is a disproof.
- **Direct proofs** assume the hypothesis; **contrapositive** proofs prove ¬q → ¬p; **contradiction** proofs assume the opposite and reach an impossibility.
- **Induction** has a base case and an inductive step that uses the inductive hypothesis; strong induction assumes all smaller cases.
- A **loop invariant** is an induction inside a program, and recursive functions are correct by induction on the input size.
- Write proofs with a clear claim, method, justified steps and a conclusion.

## Homework / Extension Mission

Prove one more claim with each of two different techniques and compare them: "the product of two odd integers is odd" (direct) and "if the product of two integers is even, at least one is even" (contrapositive). Then prove by induction that n³ − n is divisible by 3 for all n ≥ 1, and check it with your program for n up to 1000. Finally, pick a function from your Course 1 or Course 3 programs (a loop or a recursion) and write its loop invariant or inductive correctness argument in four or five sentences.

## Course Project Connection

This lesson adds the **Proof Portfolio** to the **Computational Logic Challenge** dossier. The proofs use the contrapositive from Lesson 1, divisibility and congruence from Lesson 3, and prepare Lesson 7, where recurrences are solved and verified by induction. In Course 3 you already met the idea of correctness through recursion; here it becomes a tool you can state and prove. Proof habits also matter in Course 6, where security claims must be argued, not just tested.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the n² + n + 41 story. 15 minutes: direct, contrapositive and contradiction with the model proofs. 10 minutes: induction with dominoes and the loop invariant (Example 2). 25 minutes: the project; the proofs themselves are the core, and students may finish them as homework.

**Live demonstrations.** Run Example 1 and let the class guess where the formula fails. Show the "1 = 2" fallacy and let students find the division by zero. Set up real dominoes, then remove one, to show why the base case matters.

**Misconceptions.** "If it works for many cases, it is proved." "Induction assumes what we want to prove" (it assumes P(k), the hypothesis, and proves P(k + 1)). "A proof by contradiction is a trick."

**Assessment of the project.** Mark each proof against a rubric: claim stated, method named, every step justified, hypothesis used (induction), conclusion given. Check the program's honest wording. Ask each student to explain in one sentence why the converse of the lemma is also true.

**Reference solution `checker.py`** (run with `python3 checker.py`):

```python
"""Proof Portfolio checker: sanity checks for the claims of the portfolio. It proves nothing."""


def smallest_factor(n):
    d = 2
    while d * d <= n:
        if n % d == 0:
            return d
        d += 1
    return n


def is_prime(n):
    return n > 1 and smallest_factor(n) == n


def report(text, result):
    print(f"{text:<52}{result}")


first = next(n for n in range(0, 100) if not is_prime(n * n + n + 41))
report("conjecture: n*n + n + 41 is always prime", f"FALSE, first counterexample n = {first} ({first * first + first + 41})")

odds = range(-99, 100, 2)
report("claim 1: sum of two odd integers is even", "no counterexample found" if all((a + b) % 2 == 0 for a in odds for b in odds) else "COUNTEREXAMPLE")

report("claim 2: if n*n is even then n is even", "no counterexample found" if all(n % 2 == 0 for n in range(-200, 201) if (n * n) % 2 == 0) else "COUNTEREXAMPLE")

solutions = [(p, q) for q in range(1, 201) for p in range(0, 401) if p * p == 3 * q * q]
report("claim 3: p*p == 3*q*q has no solution (q <= 200)", "no counterexample found" if not solutions else f"COUNTEREXAMPLE {solutions[0]}")

total = 0
ok = True
for k in range(0, 200):
    if total != k * k:
        ok = False
    total += 2 * (k + 1) - 1
report("claim 4: 1 + 3 + ... + (2n-1) = n*n, n <= 200", "no counterexample found" if ok and total == 200 * 200 else "COUNTEREXAMPLE")
print("Checks are evidence, not proofs: only the written proofs establish the claims for every n.")
```

```output
conjecture: n*n + n + 41 is always prime            FALSE, first counterexample n = 40 (1681)
claim 1: sum of two odd integers is even            no counterexample found
claim 2: if n*n is even then n is even              no counterexample found
claim 3: p*p == 3*q*q has no solution (q <= 200)    no counterexample found
claim 4: 1 + 3 + ... + (2n-1) = n*n, n <= 200       no counterexample found
Checks are evidence, not proofs: only the written proofs establish the claims for every n.
```

**Differentiation.** Support: give the proof skeletons (claim, method, first line) and let students fill in the steps. Stretch: strong induction, the proof that √2 + √3 is irrational, and a loop-invariant proof for binary search from Course 3.

**Discussion questions (not for the student quiz).** Can a computer check a proof? Why do mathematicians still trust the proof of a theorem that no program has verified, and why do programmers still test code that has been proved correct?
