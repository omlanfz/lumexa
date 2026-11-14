# Lumexa Mission Log: Discrete Mathematics & Computational Logic

**Course/Path:** Discrete Mathematics & Computational Logic
**Lesson:** 08 of 08
**Title:** Formal Languages, Regular Expressions and Introduction to Finite Automata
**Duration:** 60 minutes
**Difficulty:** Advanced
**Technology:** Regex · finite automata (with Python)

---

## Mission Brief

When a website asks for your mobile number and says "invalid number" before you even press the button, something has *recognised a pattern*. When your editor highlights the keywords of a program, when a search finds every date in a document, when a network filter blocks a certain kind of request, a machine is deciding, character by character, whether a string belongs to a family of strings. The mathematics behind these tools is the theory of **formal languages**, and the simplest machines that do the job are **finite automata**.

You use the notation every day without knowing it: it is called a **regular expression**. In this lesson you learn what a language is in the mathematical sense, write regular expressions, design **finite automata** as state diagrams and as code, prove (by brute force) that a regular expression and an automaton agree, and discover what these machines *cannot* do. You will finish the Computational Logic Challenge with the **Pattern Machine**: a regex and a DFA for a real pattern, a Bangladeshi mobile number.

## Learning Objectives

1. Define alphabets, strings and languages, and the operations union, concatenation and star.
2. Write and read regular expressions, using Python's `re` module to test, search and replace.
3. Define a deterministic finite automaton (DFA) formally, draw its state diagram and simulate it.
4. Design DFAs for simple languages, such as "ends with 01" and "binary numbers divisible by 3".
5. Compare a regex with a DFA by exhaustive testing, and explain why a DFA cannot count or match nested brackets.
6. Build the Pattern Machine: a regular expression and a DFA for mobile numbers, compared on hundreds of strings.

## Prerequisites

- Lesson 2 (sets), Lesson 1 (logic) and Lesson 3 (functions: a DFA's transition function).
- Course 3: stacks and the idea of a state machine are helpful but not required.

## Concept Explanation

### Alphabets, strings and languages

An **alphabet** Σ is a finite set of symbols: {0, 1} for binary, the digits 0 to 9, or the letters a to z. A **string** is a finite sequence of symbols; its **length** is the number of symbols; the **empty string** ε has length 0. Σ* is the set of *all* strings over Σ. A **language** is any set of strings, a subset of Σ*: "binary strings that end in 01", "valid mobile numbers", "all the keywords of Python". The central question is **membership**: given a string, is it in the language? Languages can be combined like sets, and with two string-specific operations:

| Operation | Meaning | Example |
|---|---|---|
| **Union** L₁ ∪ L₂ | strings in either language | {a} ∪ {b} = {a, b} |
| **Concatenation** L₁L₂ | a string from L₁ followed by one from L₂ | {a}{b, c} = {ab, ac} |
| **Star** L* | zero or more strings of L joined together | {ab}* = {ε, ab, abab, ...} |

### Regular expressions

A **regular expression** (regex) is a compact way of writing a language built only from single symbols, union, concatenation and star. The practical syntax (as in Python's `re`) adds conveniences:

| Syntax | Meaning | Example |
|---|---|---|
| `abc` | the exact text | `cat` matches "cat" |
| `a\|b` | union: a or b | `cat\|dog` |
| `*`, `+`, `?` | zero or more, one or more, zero or one | `ab*` matches "a", "ab", "abb" |
| `{n}`, `{n,m}` | exactly n, or n to m, repeats | `\d{4}` is four digits |
| `[a-z]`, `[0-9]`, `[^x]` | a character class; anything but x | `[3-9]` |
| `\d`, `\w`, `\s`, `.` | a digit, a word character, a space, any character | `\d+` |
| `^`, `$` | the start and the end of the string | `^\d+$` |
| `( )` | grouping | `(ab)+` |

In Python, `re.fullmatch(pattern, text)` tests whether the *whole* string is in the language (it replaces the anchors), `re.search` finds a match anywhere, `re.findall` lists all matches and `re.sub` replaces them. A mobile number such as 01712345678 is the language `01[3-9]\d{8}`: "01", a digit from 3 to 9, then eight digits.

### Deterministic finite automata

A **deterministic finite automaton (DFA)** is a machine with a finite number of **states**. It reads a string one symbol at a time, and for each (state, symbol) pair there is exactly one next state. Formally it is a 5-tuple **(Q, Σ, δ, q₀, F)**: a set of states Q, an alphabet Σ, a **transition function** δ: Q × Σ → Q, a **start state** q₀ and a set of **accepting states** F ⊆ Q. The machine **accepts** a string if it ends in an accepting state. We draw a DFA as a **state diagram**: circles for states, arrows labelled with symbols, a pointer for the start state and double circles for accepting states.

Example: a DFA for "binary strings ending in 01" needs three states that remember the *tail* of what has been read: *no useful tail*, *last symbol was 0*, and *last two symbols were 01* (accepting). Another example: "binary numbers divisible by 3". Read the bits from the left; if the value so far has remainder *r* mod 3, then reading bit *b* gives the value 2·r + b, so δ(r, b) = (2r + b) mod 3. Three states (the remainders), start state 0, accepting state 0. The machine never stores the number, only the remainder: that is the whole point of a finite automaton.

### Regular languages and what a DFA cannot do

A language is **regular** if some DFA (equivalently, some NFA, or some regular expression) recognises it: **Kleene's theorem**. An **NFA** is allowed to have several possible next states for a symbol, and is often easier to design; any NFA can be converted to a DFA. But a DFA has **finite memory**: it cannot count without bound. The language {aⁿbⁿ} (n a's followed by n b's) and the language of **balanced parentheses** are *not* regular: to check them you must remember how many opening brackets are still open, which can be arbitrarily many. Those languages need a machine with a **stack** (a *pushdown automaton*, Course 3), and programming languages as a whole need even more. This ladder of machines and languages is the **Chomsky hierarchy**.

### Automata in practice

Compilers use DFAs in their **lexers** to split source code into tokens; search tools, spam filters and network firewalls use regexes; form validators check phone numbers, dates and IDs; protocols such as TCP are described as state machines (Course 6); and game characters are often controlled by a state machine. Warning: some regex engines use backtracking, and a badly written pattern such as `(a+)+$` can take exponential time on the wrong input ("catastrophic backtracking"), a real source of security problems.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Alphabet** | A finite set of symbols. |
| **String / ε** | A finite sequence of symbols; the empty string. |
| **Language** | A set of strings over an alphabet. |
| **Kleene star (L\*)** | Zero or more strings of L concatenated. |
| **Regular expression** | A pattern that describes a regular language. |
| **DFA** | A deterministic finite automaton: states, transitions, a start state and accepting states. |
| **Transition function** | The rule δ(state, symbol) that gives the next state. |
| **Accepting state** | A state in which the machine accepts the string if the input ends there. |
| **Regular language** | A language recognised by a DFA, an NFA or a regular expression. |
| **State diagram** | A drawing of an automaton with circles and labelled arrows. |

## Worked Examples

### Example 1: Regular expressions in Python

```python
import re

patterns = {
    "student id": r"2[0-9]-\d{4}",
    "mobile": r"01[3-9]\d{8}",
    "simple word": r"[a-z]+(-[a-z]+)*",
}
tests = ["25-0042", "2-0042", "01712345678", "01212345678", "0171234567", "hello", "well-known", "-odd"]
for name, pattern in patterns.items():
    accepted = [t for t in tests if re.fullmatch(pattern, t)]
    print(f"{name:<12}{pattern:<22}accepts {accepted}")

text = "Call 01712345678 or 01912345678 before 5 pm."
print("numbers found:", re.findall(r"01[3-9]\d{8}", text))
print("with digits hidden:", re.sub(r"\d", "#", text))
```

```output
student id  2[0-9]-\d{4}          accepts ['25-0042']
mobile      01[3-9]\d{8}          accepts ['01712345678']
simple word [a-z]+(-[a-z]+)*      accepts ['hello', 'well-known']
numbers found: ['01712345678', '01912345678']
with digits hidden: Call ########### or ########### before # pm.
```

1. `re.fullmatch` checks that the *whole* string belongs to the language described by the pattern. `2-0042` fails the student-ID pattern because the ID needs two digits before the dash.
2. `01[3-9]\d{8}` rejects `01212345678` (the third digit must be 3 to 9) and `0171234567` (only ten digits).
3. `re.findall` extracts every match from a longer text, and `re.sub` replaces each digit by `#`: regexes are a search-and-replace tool too.
4. The patterns are *languages*: each pattern is the set of strings that it accepts.

### Example 2: A DFA for "ends with 01", compared with a regex

```python
import re
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
print("strings checked:", checked, "| DFA and regex agree on:", agree)
```

```output
trace of 1101: 0 0 1 2 -> accepted: True
strings checked: 511 | DFA and regex agree on: 511
```

1. The transition table `delta` is the whole machine. Reading `1101` moves it through the states 0, 0, 1, 2: it ends in state 2, which accepts.
2. The loop tries every binary string of length 0 to 8 (511 strings) and compares the DFA with the regular expression `[01]*01`. They agree on every one: for these lengths the two descriptions define the same language.
3. A machine with three states "remembers" only the last two symbols, which is enough for this language.
4. Testing every string up to a length is evidence, not a proof, but for machines with few states it is a strong check: a theorem says that two DFAs with *m* and *n* states are equivalent as soon as they agree on all strings shorter than *m* + *n*.

### Example 3: A DFA for "binary numbers divisible by 3"

```python
def divisible_by_3(bits):
    state = 0
    for b in bits:
        state = (2 * state + int(b)) % 3
    return state == 0


mistakes = 0
for number in range(0, 101):
    bits = format(number, "b")
    if divisible_by_3(bits) != (number % 3 == 0):
        mistakes += 1
print("numbers tested: 101 | mistakes:", mistakes)
print("accepted binary strings up to 30:", [format(n, "b") for n in range(31) if divisible_by_3(format(n, "b"))])
```

```output
numbers tested: 101 | mistakes: 0
accepted binary strings up to 30: ['0', '11', '110', '1001', '1100', '1111', '10010', '10101', '11000', '11011', '11110']
```

1. The state is just the remainder mod 3. Reading a new bit *b* turns the value *v* into 2v + b, so the new remainder is (2r + b) mod 3: a finite number of states is enough, although the numbers have unbounded length.
2. The automaton is tested against Python's own `%` operator for 0 to 100, with no mistakes.
3. The accepted strings are the binary forms of the multiples of 3: 0, 11 (3), 110 (6), 1001 (9), 1100 (12), ...
4. This is the elegance of automata: a few states replace arithmetic on arbitrarily large numbers.

## Common Mistakes and Misconceptions

- **Using `re.match` and thinking it tests the whole string.** `match` only anchors at the start. Use `fullmatch`, or add `^` and `$`.
- **Forgetting to escape special characters.** `.` matches *any* character; use `\.` for a literal dot, and a raw string `r"..."` in Python.
- **Greedy surprises.** `.*` matches as much as possible, so `<.*>` on `<a><b>` matches the whole text. Use `.*?` for the shortest match.
- **Confusing the regex language with the language of strings.** The expression `a*` is not the string "a*": it describes the set {ε, a, aa, aaa, ...}.
- **Giving a DFA a missing transition.** In a DFA *every* state needs a transition for *every* symbol. Add a **dead state** that collects all the invalid input.
- **Thinking a DFA can count.** It can count modulo a fixed number, but not without bound: a DFA cannot recognise aⁿbⁿ.
- **Using a regex for nested structure.** HTML, JSON and balanced brackets are not regular. Use a parser.
- **Writing patterns with catastrophic backtracking.** Nested repeats such as `(a+)+` can freeze a server on hostile input.

## Guided Hands-On Activity

**Match, design, test.** Work with your teacher.

1. Write a regex for each, and test it with at least four accepted and four rejected strings: (a) a student ID of the form `BD-2025-0042` (b) a time such as `09:45` (c) a binary string with an even number of 0s.
2. Type Example 1 and add the pattern for a date `DD/MM/YYYY` (digits only). What mistakes does it allow, for example 99/99/2025? Can a regex alone fix them?
3. Draw on paper the state diagram of the DFA of Example 2 (three circles, six arrows). Then draw the DFA for "binary strings with an even number of 1s" (two states).
4. In Example 2, change the DFA and the regex to "strings that *contain* 11". How many states do you need?
5. In Example 3, change the modulus to 5. What is the new transition function?
6. Explain in two sentences why no DFA can recognise the balanced parentheses, using the idea of states as "memory".

## Lesson Project: Pattern Machine: Regex and DFA

### Objective

Finish the dossier with the **Pattern Machine**: for a real pattern, a Bangladeshi mobile number, write a regular expression and a DFA, compare them on hundreds of strings, and then demonstrate in code why a DFA with finite memory cannot match nested brackets.

### Requirements

- The language is: `01`, then a digit from 3 to 9, then eight more digits (eleven digits in all). The regular expression is `01[3-9]\d{8}`.
- Implement a DFA for the same language with twelve counting states (the number of correct symbols read so far, 0 to 11) and a dead state. The transition function is a Python function `delta(state, symbol)`, and a class (or functions) provides `accepts(text)`.
- Start from the three valid numbers `01712345678`, `01912345678` and `01301020304`. For each, generate **all single-character mutations**: replace each of its 11 positions by each of the *other* nine digits, and also test the number with the last character removed and with an extra `0` appended (101 strings per number).
- Print: the number of valid numbers accepted by the regex and by the DFA, the number of strings tested, whether the two agree on *every* string, and how many of the mutated strings are still valid.
- Build a DFA for balanced parentheses that can only remember a depth of at most 3 (states 0 to 3 and a dead state). Show that it accepts `(())` and `()()`, correctly rejects `(()` and `)(`, but wrongly rejects the balanced string `((((()))))` with depth 5. Print the three results and explain in a comment why this happens.
- In the dossier, draw a state diagram of a DFA for the first four symbols of the number pattern (states 0 to 4 and the dead state), and write a paragraph on why a regex is better for humans and a DFA is better for a fast, simple machine.

### Instructions

1. Write the regular expression and test it by hand on your own phone number and four bad examples.
2. Write `delta(state, symbol)`: state 0 expects `0`; state 1 expects `1`; state 2 expects a digit from 3 to 9; states 3 to 10 expect any digit; state 11 (accepting) accepts nothing more; `-1` is the dead state.
3. Write `accepts(text)` by running `delta` over the symbols and testing for state 11.
4. Write `mutations(number)` that yields every one-character replacement, the shortened string and the extended string.
5. Run the comparison with `re.fullmatch` and count agreements and the mutations that are still valid.
6. Write the depth-limited bracket DFA and its three tests.
7. Compare with the expected output, and finish the dossier page with the diagram and paragraph.

### Expected Output

```text
Mobile number pattern: 01[3-9]\d{8}
  valid numbers accepted by the regex: 3 of 3
  valid numbers accepted by the DFA:   3 of 3
  mutated strings tested: 303
  regex and DFA agree on every string: True
  mutations that are still valid numbers: 234

Balanced brackets with a DFA that can remember a depth of 3 at most
  (())        accepted
  ()()        accepted
  (()         rejected
  )(          rejected
  ((((()))))  rejected
  ((((())))) is balanced (depth 5) but the DFA rejects it: finite memory cannot count.
```

### Hints

1. **Hint 1 (the pattern).** `re.compile(r"01[3-9]\d{8}")` and `PATTERN.fullmatch(text)` returns `None` when the text is not in the language.
2. **Hint 2 (the DFA).** `if state == 0: return 1 if symbol == "0" else -1`, and so on; once in the dead state `-1` return `-1`.
3. **Hint 3 (digits only).** `symbol in "0123456789"` and `symbol in "3456789"` test the character classes; any other symbol goes to the dead state.
4. **Hint 4 (mutations).** `number[:i] + d + number[i + 1:]` replaces position `i` by the digit `d`.
5. **Hint 5 (agreement).** `all(accepts(t) == bool(PATTERN.fullmatch(t)) for t in tests)`.
6. **Hint 6 (the bracket DFA).** States 0 to 3 are the current depth; `(` adds one (going over 3 means the dead state), `)` subtracts one (below 0 means dead), and the string is accepted if it ends in state 0.

### Success Criteria

- [ ] The regex and the DFA both accept the three valid numbers and reject the invalid ones.
- [ ] Both give the same answer on every one of the mutated and resized strings.
- [ ] The count of mutations that are still valid is correct (for example, changing the third digit to another value from 3 to 9 keeps a number valid).
- [ ] The bracket DFA accepts `(())` and `()()`, rejects `(()` and `)(`, and fails on the depth-5 string, with an honest comment about finite memory.
- [ ] The dossier page contains the state diagram and a clear paragraph.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Convert your DFA into a **minimal** one by merging equivalent states (here there is nothing to merge, but try it on the "ends with 01" DFA with an extra redundant state). Then write a small function that converts a regular expression made only of literals, `|` and `*` into an NFA with Thompson's construction, and simulate the NFA by tracking the set of current states.

## Lesson Recap

- A **language** is a set of strings over an alphabet; the key question is membership.
- **Regular expressions** describe regular languages with union, concatenation and star; use `re.fullmatch` for whole-string tests in Python.
- A **DFA** has finitely many states, one transition for each symbol, a start state and accepting states; it recognises exactly the regular languages, as regular expressions and NFAs do.
- A DFA remembers only a bounded amount, so it cannot match nested brackets or count aⁿbⁿ; those need a stack.
- Automata and regular expressions power lexers, validators, filters and protocols.

## Homework / Extension Mission

Design, draw and implement a DFA for each of these languages over {0, 1}: (a) strings with no two consecutive 1s, (b) strings whose length is a multiple of 3, (c) binary numbers divisible by 5. Test each against a regular expression or a direct check for all strings up to length 12. Then write one real-world regular expression of your own (for example a simplified email address or a Bangladeshi National ID number), test it on 15 examples, and write a paragraph on one string that your pattern wrongly accepts or rejects and why.

## Course Project Connection

This lesson completes the **Computational Logic Challenge** dossier. Its eight entries are: the Truth Table Studio, the Set Lab, the Relation Detective, the Proof Portfolio, the Counting and Probability Challenge, the Campus Graph Builder, the Recurrence Solver and the Pattern Machine. Together they show you can translate statements into logic, reason about sets and relations, prove claims, count and estimate, model with graphs, solve recurrences and describe patterns formally. Assemble them into one folder with a one-page index. The ideas return in Course 5 (logic circuits are Boolean formulas), Course 6 (protocols as state machines) and Course 7 (conditions in SQL).

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: pattern recognition in everyday software; languages as sets of strings. 15 minutes: regexes, with a live tester (Example 1). 15 minutes: DFAs on the board, drawn as state diagrams (Examples 2 and 3). 20 minutes: the project; assemble the dossier as homework.

**Live demonstrations.** Walk a student string through a DFA drawn on the floor with chalk, with students as the "token" moving between circles. Show a catastrophic-backtracking regex freezing a small program. Use an online regex visualiser to draw the automaton of a pattern.

**Misconceptions.** "A regex describes one string." "A DFA can have missing transitions" (add the dead state). "Regexes can parse HTML." "More states always means more power."

**Assessment of the project.** Check the DFA's transition function (the dead state), the mutation generator, the agreement check and the honest comment about finite memory. Review the whole dossier for completeness: eight entries with clear titles, code that runs, and written proofs.

**Reference solution `pattern_machine.py`** (run with `python3 pattern_machine.py`):

```python
"""Pattern Machine: the last entry of the Computational Logic Challenge dossier."""
import re

PATTERN = re.compile(r"01[3-9]\d{8}")
DIGITS = "0123456789"
DEAD = -1


def delta(state, symbol):
    if state == DEAD or state == 11:
        return DEAD
    if state == 0:
        return 1 if symbol == "0" else DEAD
    if state == 1:
        return 2 if symbol == "1" else DEAD
    if state == 2:
        return 3 if symbol in "3456789" else DEAD
    return state + 1 if symbol in DIGITS else DEAD


def accepts(text):
    state = 0
    for symbol in text:
        state = delta(state, symbol)
    return state == 11


def mutations(number):
    for i in range(len(number)):
        for d in DIGITS:
            if d != number[i]:
                yield number[:i] + d + number[i + 1:]
    yield number[:-1]
    yield number + "0"


valid = ["01712345678", "01912345678", "01301020304"]
print("Mobile number pattern: 01[3-9]\\d{8}")
print("  valid numbers accepted by the regex:", sum(1 for v in valid if PATTERN.fullmatch(v)), "of", len(valid))
print("  valid numbers accepted by the DFA:  ", sum(1 for v in valid if accepts(v)), "of", len(valid))

tests = [m for v in valid for m in mutations(v)]
agree = all(accepts(t) == bool(PATTERN.fullmatch(t)) for t in tests)
still_valid = sum(1 for t in tests if accepts(t))
print("  mutated strings tested:", len(tests))
print("  regex and DFA agree on every string:", agree)
print("  mutations that are still valid numbers:", still_valid)


def bracket_state(state, symbol):
    if state == DEAD:
        return DEAD
    if symbol == "(":
        return state + 1 if state < 3 else DEAD
    if symbol == ")":
        return state - 1 if state > 0 else DEAD
    return DEAD


def depth_limited_balanced(text):
    state = 0
    for symbol in text:
        state = bracket_state(state, symbol)
    return state == 0


print("\nBalanced brackets with a DFA that can remember a depth of 3 at most")
for text in ["(())", "()()", "(()", ")(", "((((()))))"]:
    print(f"  {text:<12}{'accepted' if depth_limited_balanced(text) else 'rejected'}")
print("  ((((())))) is balanced (depth 5) but the DFA rejects it: finite memory cannot count.")
```

```output
Mobile number pattern: 01[3-9]\d{8}
  valid numbers accepted by the regex: 3 of 3
  valid numbers accepted by the DFA:   3 of 3
  mutated strings tested: 303
  regex and DFA agree on every string: True
  mutations that are still valid numbers: 234

Balanced brackets with a DFA that can remember a depth of 3 at most
  (())        accepted
  ()()        accepted
  (()         rejected
  )(          rejected
  ((((()))))  rejected
  ((((())))) is balanced (depth 5) but the DFA rejects it: finite memory cannot count.
```

**Differentiation.** Support: provide `delta` for the first four states and the mutation generator, and let students complete the machine and the tests. Stretch: add the NFA with Thompson's construction, minimisation, and a lexer for arithmetic expressions with a DFA.

**Discussion questions (not for the student quiz).** Why do programming languages need grammars that are more powerful than regular expressions? What would a DFA for all valid Bangladeshi mobile numbers *with* the optional +88 prefix look like?
