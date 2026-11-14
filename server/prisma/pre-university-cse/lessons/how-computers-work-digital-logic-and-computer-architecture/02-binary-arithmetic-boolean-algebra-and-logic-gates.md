# Lumexa Mission Log: How Computers Work: Digital Logic & Computer Architecture

**Course/Path:** How Computers Work: Digital Logic & Computer Architecture
**Lesson:** 02 of 08
**Title:** Binary Arithmetic, Boolean Algebra and Logic Gates
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** CircuitVerse · circuit lab (with Python)

---

## Mission Brief

How does a computer add 13 and 25? There is no little mathematician inside. There are wires, and each wire carries either a low or a high voltage: 0 or 1. Tiny circuits called **logic gates** combine those wires according to simple rules: output 1 only if *both* inputs are 1; output 1 if *at least one* input is 1; flip a 1 to a 0. From a handful of such gates, arranged cleverly, you can build a circuit that adds numbers, one that compares them, one that remembers them, and eventually a complete processor.

The language that describes what these circuits do is **Boolean algebra**, the same algebra of true and false that you used for logic in Course 4. In this lesson you learn how binary numbers are added and negated, you meet the seven basic gates, you discover that one gate type, the **NAND**, is enough to build all the others, and you build the **half adder**, the first circuit that does arithmetic. In CircuitVerse you will build a gate toolkit and test it against truth tables.

## Learning Objectives

1. Add binary numbers with carries, and explain overflow.
2. Represent negative numbers in two's complement, and subtract by adding.
3. Use Boolean algebra: the laws of AND, OR and NOT, De Morgan's laws, and simple simplifications.
4. Describe the seven basic gates by their truth tables and symbols.
5. Show that NAND is a universal gate by building NOT, AND, OR and XOR from NAND gates only.
6. Design and test a half adder, in CircuitVerse and in a Python gate model.

## Prerequisites

- Lesson 1: binary numbers and the CircuitVerse panel of four switches.
- Truth tables and De Morgan's laws from the logic lesson of Course 4.

## Concept Explanation

### Binary arithmetic

Binary addition follows the same column method as decimal addition, but with only four cases: 0 + 0 = 0, 0 + 1 = 1, 1 + 0 = 1 and **1 + 1 = 10** (write 0, carry 1). With a carry coming in, 1 + 1 + 1 = 11 (write 1, carry 1). For example 0110 + 0111 = 1101 (6 + 7 = 13). When the true sum needs more bits than the register has, the extra bit is lost: with 8 bits, 200 + 100 = 300 = 100101100₂, which becomes 00101100₂ = 44 and sets a **carry-out**. This is **overflow** for unsigned numbers.

### Negative numbers: two's complement

For signed numbers, computers use **two's complement**. With *n* bits, the leftmost bit has weight −2ⁿ⁻¹ and the others are positive as usual, so 8 bits cover **−128 to +127**. To **negate** a number, invert every bit and add 1: 5 = 00000101 → 11111010 → **11111011** = −5. The great advantage is that the ordinary adder works unchanged: **a − b = a + (−b)**, so one adder circuit handles addition and subtraction. The leftmost bit tells the sign (0 positive, 1 negative). Overflow happens when two numbers of the same sign give a result with the opposite sign.

### Boolean algebra

A Boolean variable is 0 or 1. The three basic operations are **AND** (written A·B or AB), **OR** (A + B) and **NOT** (A′, or Ā). They obey laws that let us simplify circuits:

| Law | AND form | OR form |
|---|---|---|
| Identity | A · 1 = A | A + 0 = A |
| Null | A · 0 = 0 | A + 1 = 1 |
| Idempotent | A · A = A | A + A = A |
| Complement | A · A′ = 0 | A + A′ = 1 |
| Commutative | A · B = B · A | A + B = B + A |
| Distributive | A · (B + C) = AB + AC | A + BC = (A + B)(A + C) |
| Absorption | A + AB = A | A(A + B) = A |
| **De Morgan** | (A · B)′ = A′ + B′ | (A + B)′ = A′ · B′ |

Fewer terms mean fewer gates, which means a cheaper, faster, cooler circuit. For example, AB + AB′ = A(B + B′) = A · 1 = A: two gates' worth of logic vanishes.

### Logic gates

A **logic gate** is an electronic circuit that implements a Boolean function on its input wires. Each gate has a standard symbol and a truth table:

| Inputs A B | AND | OR | NAND | NOR | XOR | XNOR |
|---|---|---|---|---|---|---|
| 0 0 | 0 | 0 | 1 | 1 | 0 | 1 |
| 0 1 | 0 | 1 | 1 | 0 | 1 | 0 |
| 1 0 | 0 | 1 | 1 | 0 | 1 | 0 |
| 1 1 | 1 | 1 | 0 | 0 | 0 | 1 |

NOT has one input and inverts it. NAND is "not AND", NOR is "not OR", **XOR** is 1 when the inputs *differ*, and XNOR is 1 when they are equal. In real chips each gate is a few transistors (CMOS), and its output changes a tiny moment after its inputs change: the **propagation delay** that eventually limits how fast a computer can run.

### Universal gates

NAND is **universal**: any Boolean function can be built from NAND gates alone (NOR is universal too). With NAND(a, b) = (ab)′ we get:

- **NOT**: NAND(a, a) = a′ (tie both inputs together). 1 gate.
- **AND**: NOT(NAND(a, b)) = ab. 2 gates.
- **OR**: NAND(a′, b′) = a + b (De Morgan). 3 gates.
- **XOR**: with n = NAND(a, b): NAND(NAND(a, n), NAND(b, n)). 4 gates.

Chip makers love this: one kind of gate to design, test and manufacture.

### The half adder

To add two one-bit numbers A and B, we need two outputs: a **Sum** bit and a **Carry** bit. Looking at 0+0, 0+1, 1+0, 1+1 = 00, 01, 01, 10 shows that **Sum = A XOR B** and **Carry = A AND B**. This circuit is the **half adder**: "half" because it has no carry *input*, so it cannot be chained. In Lesson 3 you will add the carry input and make a **full adder**, then chain full adders into a multi-bit adder.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Carry** | The bit passed to the next column when a column's sum is too big for one bit. |
| **Overflow** | A result that does not fit in the available bits. |
| **Two's complement** | A way to write signed numbers: invert the bits and add 1 to negate. |
| **Boolean algebra** | The algebra of 0 and 1 with AND, OR and NOT. |
| **Logic gate** | A circuit that computes a Boolean function of its input wires. |
| **NAND / NOR** | The inverted AND and the inverted OR. |
| **XOR** | Exclusive or: 1 when exactly one input is 1. |
| **Universal gate** | A gate type from which every other gate can be built. |
| **Half adder** | A circuit that adds two bits: Sum = A XOR B, Carry = A AND B. |
| **Propagation delay** | The time a gate needs to change its output after an input changes. |

## Worked Examples

### Example 1: Gates and their truth tables

```python
def AND(a, b): return a & b
def OR(a, b): return a | b
def NAND(a, b): return 1 - (a & b)
def NOR(a, b): return 1 - (a | b)
def XOR(a, b): return a ^ b
def XNOR(a, b): return 1 - (a ^ b)
def NOT(a): return 1 - a


print(" A B | AND OR NAND NOR XOR XNOR")
for a in (0, 1):
    for b in (0, 1):
        row = [AND(a, b), OR(a, b), NAND(a, b), NOR(a, b), XOR(a, b), XNOR(a, b)]
        print(f" {a} {b} | {row[0]:>3} {row[1]:>2} {row[2]:>4} {row[3]:>3} {row[4]:>3} {row[5]:>4}")
print("NOT: 0 ->", NOT(0), ", 1 ->", NOT(1))
```

```output
 A B | AND OR NAND NOR XOR XNOR
 0 0 |   0  0    1   1   0    1
 0 1 |   0  1    1   0   1    0
 1 0 |   0  1    1   0   1    0
 1 1 |   1  1    0   0   0    1
NOT: 0 -> 1 , 1 -> 0
```

1. Each gate is a function of 0s and 1s. The program prints the same table as the one above, which you can compare with your CircuitVerse gates.
2. NAND is exactly the opposite of AND in every row, and NOR the opposite of OR; XNOR is the opposite of XOR.
3. XOR is 1 when the inputs differ: rows `0 1` and `1 0`.
4. A truth table is a *complete* specification of a gate: there is nothing else to know about it.

### Example 2: Everything from NAND

```python
from itertools import product


def NAND(a, b):
    return 0 if (a and b) else 1


def NOT_n(a):
    return NAND(a, a)


def AND_n(a, b):
    return NOT_n(NAND(a, b))


def OR_n(a, b):
    return NAND(NOT_n(a), NOT_n(b))


def XOR_n(a, b):
    n = NAND(a, b)
    return NAND(NAND(a, n), NAND(b, n))


pairs = list(product((0, 1), repeat=2))
print("NOT from 1 NAND:", all(NOT_n(a) == 1 - a for a in (0, 1)))
print("AND from 2 NANDs:", all(AND_n(a, b) == (a & b) for a, b in pairs))
print("OR from 3 NANDs:", all(OR_n(a, b) == (a | b) for a, b in pairs))
print("XOR from 4 NANDs:", all(XOR_n(a, b) == (a ^ b) for a, b in pairs))
```

```output
NOT from 1 NAND: True
AND from 2 NANDs: True
OR from 3 NANDs: True
XOR from 4 NANDs: True
```

1. `NOT_n` ties both inputs of one NAND together; for input 0 the output is 1, and for input 1 it is 0.
2. `AND_n` puts a NOT after a NAND, `OR_n` inverts both inputs of a NAND (De Morgan's law), and `XOR_n` uses four NANDs.
3. Each function is compared with the built-in operation for every input pair: a truth-table proof that the NAND versions are correct.
4. Because NOT, AND and OR can be built from NAND, every Boolean function can: NAND is universal.

### Example 3: Binary addition and two's complement

```python
def add8(x, y):
    total = x + y
    return total & 255, total >> 8          # the 8-bit result and the carry-out


for x, y in ((13, 25), (200, 100)):
    result, carry = add8(x, y)
    print(f"{x:>3} + {y:>3} = {format(result, '08b')} = {result}, carry-out {carry}")


def twos_complement(n, bits=8):
    return (~n + 1) & ((1 << bits) - 1)


def signed(value, bits=8):
    return value - (1 << bits) if value >= 1 << (bits - 1) else value


five = 5
minus_five = twos_complement(five)
print("5 =", format(five, "08b"), "| -5 =", format(minus_five, "08b"), "| read as signed:", signed(minus_five))
print("12 - 5 as 12 + (-5):", format((12 + minus_five) & 255, "08b"), "=", (12 + minus_five) & 255)
print("8-bit signed range:", signed(0b10000000), "to", signed(0b01111111))
```

```output
 13 +  25 = 00100110 = 38, carry-out 0
200 + 100 = 00101100 = 44, carry-out 1
5 = 00000101 | -5 = 11111011 | read as signed: -5
12 - 5 as 12 + (-5): 00000111 = 7
8-bit signed range: -128 to 127
```

1. 13 + 25 = 38 fits in 8 bits, so the carry-out is 0. 200 + 100 = 300 does not fit: the result 44 is wrong as a number, and the carry-out 1 flags the overflow.
2. `twos_complement` inverts the bits (`~n`) and adds 1. For 5 this gives 11111011, which read as a signed number is −5.
3. Subtraction is addition: 12 + (−5) wraps around to 00000111 = 7. The adder does not need to know it is subtracting.
4. With 8 bits the signed range is −128 to +127: one more negative number than positive ones.

## Common Mistakes and Misconceptions

- **Forgetting the carry in binary addition.** 1 + 1 is 10 in binary, not 2 written in one digit.
- **Confusing XOR with OR.** OR is 1 when at least one input is 1; XOR is 1 when *exactly* one is. They differ in the row 1 1.
- **Reading NAND as "not both" backwards.** NAND is 0 only when *both* inputs are 1; it is 1 in every other row.
- **Negating by only inverting the bits.** The two's complement also needs the +1; inverting alone gives the *one's* complement.
- **Ignoring overflow.** 8-bit 127 + 1 gives −128 in two's complement and 255 + 1 gives 0 in unsigned. The result is wrong unless you check the flags.
- **Leaving an input pin unconnected in CircuitVerse.** A floating input makes the output undefined; connect every input.
- **Forgetting De Morgan when simplifying.** (A + B)′ is A′B′, not A′ + B′.
- **Thinking a half adder can add multi-bit numbers.** It has no carry input; use full adders for that (next lesson).

## Guided Hands-On Activity

**Build the toolkit.** Work with your teacher.

1. In CircuitVerse, open your *Mini Calculator System* project. Add two inputs A and B, and connect them to an AND, an OR and an XOR gate, each with its own output LED. Click through the four input settings and check the truth tables.
2. Replace the OR gate with a NOT-NOT-NAND construction: NAND(NOT A, NOT B). Does it behave like OR for all four settings?
3. Build NOT, AND, OR and XOR using only NAND gates (1, 2, 3 and 4 gates). Test each against the built-in gate.
4. Compute by hand 01101 + 01011 in binary, and 5 − 9 in 8-bit two's complement. Check with Python.
5. Simplify AB + AB′ + A′B using the laws, and check your answer with a truth table (Python or CircuitVerse).
6. Build a half adder from an XOR and an AND gate. Complete the table for all four inputs and compare with 0+0, 0+1, 1+0, 1+1.

## Lesson Project: Gate Toolkit and Half Adder

### Objective

Extend the course project, the **Mini Calculator System**, with its first arithmetic circuit: a **gate toolkit** (the basic gates tested against truth tables), a proof in circuits that **NAND is universal**, and a **half adder**, built twice: from standard gates and from NAND gates only. A Python gate model documents and checks the same behaviour.

### Requirements

- **CircuitVerse build.** On a new page of your project: (1) two inputs A and B feeding AND, OR, NAND, NOR, XOR and XNOR gates with an LED each, plus a NOT gate; (2) NOT, AND and OR built from NAND gates only; (3) a half adder with an XOR and an AND; (4) a half adder with five NAND gates only. Label every input and output.
- **Python gate model.** Write the seven gates, the NAND-only versions of NOT, AND, OR and XOR, and both half adders.
- Print: the truth table of the six two-input gates; the check that the four NAND constructions equal the real gates; the half-adder table (A, B, Sum, Carry) for both versions, with the number of gates used by each; and a check that `Sum + 2 × Carry == A + B` in every row.
- In your portfolio, include screenshots of the toolkit page and of the NAND-only half adder with the input setting A = 1, B = 1.

### Instructions

1. Build the toolkit page in CircuitVerse and test all four input settings for each gate.
2. Build the NAND-only NOT, AND and OR, and verify them.
3. Build the half adder with standard gates, then with NAND gates only (five NANDs: one shared NAND of A and B, two NANDs with it, one combining those two, and one inverting the shared NAND).
4. Write the Python gate functions and the NAND-only versions.
5. Print the gate truth table, the NAND checks and the two half-adder tables.
6. Add the check `Sum + 2 × Carry == A + B` for every row, and print the number of gates for each half adder.
7. Compare with the expected output and complete the portfolio screenshots.

### Expected Output

```text
Gate truth tables
 A B | AND OR NAND NOR XOR XNOR
 0 0 |   0  0    1   1   0    1
 0 1 |   0  1    1   0   1    0
 1 0 |   0  1    1   0   1    0
 1 1 |   1  1    0   0   0    1

Everything from NAND
  NOT from 1 NAND: True
  AND from 2 NANDs: True
  OR from 3 NANDs: True
  XOR from 4 NANDs: True

Half adders (A, B -> Sum, Carry)
 A B | standard (2 gates) | NAND only (5 gates)
 0 0 |      0 0          |      0 0
 0 1 |      1 0          |      1 0
 1 0 |      1 0          |      1 0
 1 1 |      0 1          |      0 1
  Sum + 2 x Carry == A + B in every row: True
  the two half adders agree: True
```

### Hints

1. **Hint 1 (NAND from AND).** In Python, `NAND(a, b) = 1 - (a & b)`, and a NAND with both inputs tied is a NOT.
2. **Hint 2 (the shared gate).** In the NAND half adder, let `n = NAND(a, b)`; then `sum = NAND(NAND(a, n), NAND(b, n))` and `carry = NAND(n, n)`.
3. **Hint 3 (counting gates).** Count the NAND gates by hand (5) and write the number in the printout; the standard half adder uses 2 gates.
4. **Hint 4 (CircuitVerse wiring).** Use the Input element for A and B, and drag from a gate's output pin to the next gate's input pin; click the inputs to toggle them.
5. **Hint 5 (testing).** Test every input setting, including 1 1, which is the row that differs between XOR and OR.
6. **Hint 6 (formatting).** `f"{a} {b} | {s} {c}"` prints one row, and `product((0, 1), repeat=2)` gives the four inputs.

### Success Criteria

- [ ] The CircuitVerse page contains all six gates plus NOT, correctly wired and labelled, and matching the truth tables.
- [ ] NOT, AND and OR are built from NAND gates only and behave like the real gates.
- [ ] Both half adders give Sum = A XOR B and Carry = A AND B for all four inputs; the NAND version uses exactly five gates.
- [ ] The Python model prints the tables and the checks, and every check is `True`.
- [ ] The portfolio contains the two screenshots.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Build a **2-bit comparator** in CircuitVerse that outputs 1 when A = B, using XNOR gates and an AND gate, and then a 2-bit "A greater than B" output. Write the Boolean expressions and test all 16 input combinations. Then build the half adder using NOR gates only (NOR is also universal) and count the gates.

## Lesson Recap

- **Binary addition** works like decimal addition with carries (1 + 1 = 10); a result that does not fit in the register is an **overflow**.
- **Two's complement** (invert the bits, add 1) represents negative numbers, so subtraction is addition and one adder circuit serves both.
- **Boolean algebra** has AND, OR and NOT with laws (complement, absorption, De Morgan) that simplify circuits.
- The seven gates (NOT, AND, OR, NAND, NOR, XOR, XNOR) are defined by their truth tables; **NAND is universal**.
- The **half adder** (Sum = A XOR B, Carry = A AND B) adds two bits and is the seed of every adder.

## Homework / Extension Mission

Design a circuit with three inputs that outputs 1 when **at least two inputs are 1** (the majority function). Write its truth table, derive a Boolean expression, simplify it, build it in CircuitVerse, and count its gates. Then compute the 8-bit two's complement of 100, −100 and −1, and add 100 + 100 in 8-bit two's complement: explain the result as a signed overflow. Finish by writing one paragraph explaining why a chip designer might prefer a circuit made only of NAND gates.

## Course Project Connection

This lesson adds the **gate toolkit and half adder** to the **Mini Calculator System**, the course project. Your four-switch panel from Lesson 1 will feed these gates. In Lesson 3 you will extend the half adder to a **full adder** and chain four of them into a **four-bit adder** with an operation selector, which is the arithmetic heart of the calculator. The same Boolean algebra returns in Course 7 (SQL conditions) and in Course 4 (logic), now realised in hardware.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: binary addition and overflow; two's complement on a clock face. 15 minutes: gates and Boolean laws (compare the truth tables with Course 4). 10 minutes: NAND universality (Example 2) and the half adder. 25 minutes: the CircuitVerse build, with the Python model as a check.

**Live demonstrations.** Build XOR from four NANDs live in CircuitVerse and toggle the inputs. Run 200 + 100 on an 8-bit calculator model to show overflow. Show that inverting and adding 1 turns 5 into −5 on the bit explorer in "both" mode.

**Misconceptions.** "XOR and OR are the same." "A NAND gate is a different technology." "Negative numbers use a minus bit only" (sign-magnitude is a different, less convenient scheme). "Gates compute instantly."

**Assessment of the project.** Check the CircuitVerse pages for correct wiring and labels, the five-NAND half adder, the truth-table agreement and the Python checks. Ask each student to explain why the shared NAND gate appears in three places.

**Reference solution `gates.py`** (run with `python3 gates.py`):

```python
"""Gate Toolkit and Half Adder: a Python model of the circuits built in CircuitVerse."""
from itertools import product


def AND(a, b): return a & b
def OR(a, b): return a | b
def NAND(a, b): return 1 - (a & b)
def NOR(a, b): return 1 - (a | b)
def XOR(a, b): return a ^ b
def XNOR(a, b): return 1 - (a ^ b)
def NOT(a): return 1 - a


def NOT_n(a): return NAND(a, a)
def AND_n(a, b): return NOT_n(NAND(a, b))
def OR_n(a, b): return NAND(NOT_n(a), NOT_n(b))


def XOR_n(a, b):
    n = NAND(a, b)
    return NAND(NAND(a, n), NAND(b, n))


def half_adder(a, b):
    return XOR(a, b), AND(a, b)


def half_adder_n(a, b):
    n = NAND(a, b)
    return NAND(NAND(a, n), NAND(b, n)), NAND(n, n)


PAIRS = list(product((0, 1), repeat=2))

print("Gate truth tables")
print(" A B | AND OR NAND NOR XOR XNOR")
for a, b in PAIRS:
    row = [AND(a, b), OR(a, b), NAND(a, b), NOR(a, b), XOR(a, b), XNOR(a, b)]
    print(f" {a} {b} | {row[0]:>3} {row[1]:>2} {row[2]:>4} {row[3]:>3} {row[4]:>3} {row[5]:>4}")

print("\nEverything from NAND")
print("  NOT from 1 NAND:", all(NOT_n(a) == NOT(a) for a in (0, 1)))
print("  AND from 2 NANDs:", all(AND_n(a, b) == AND(a, b) for a, b in PAIRS))
print("  OR from 3 NANDs:", all(OR_n(a, b) == OR(a, b) for a, b in PAIRS))
print("  XOR from 4 NANDs:", all(XOR_n(a, b) == XOR(a, b) for a, b in PAIRS))

print("\nHalf adders (A, B -> Sum, Carry)")
print(" A B | standard (2 gates) | NAND only (5 gates)")
for a, b in PAIRS:
    s1, c1 = half_adder(a, b)
    s2, c2 = half_adder_n(a, b)
    print(f" {a} {b} |      {s1} {c1}          |      {s2} {c2}")
print("  Sum + 2 x Carry == A + B in every row:", all(s + 2 * c == a + b for a, b in PAIRS for s, c in (half_adder(a, b), half_adder_n(a, b))))
print("  the two half adders agree:", all(half_adder(a, b) == half_adder_n(a, b) for a, b in PAIRS))
```

```output
Gate truth tables
 A B | AND OR NAND NOR XOR XNOR
 0 0 |   0  0    1   1   0    1
 0 1 |   0  1    1   0   1    0
 1 0 |   0  1    1   0   1    0
 1 1 |   1  1    0   0   0    1

Everything from NAND
  NOT from 1 NAND: True
  AND from 2 NANDs: True
  OR from 3 NANDs: True
  XOR from 4 NANDs: True

Half adders (A, B -> Sum, Carry)
 A B | standard (2 gates) | NAND only (5 gates)
 0 0 |      0 0          |      0 0
 0 1 |      1 0          |      1 0
 1 0 |      1 0          |      1 0
 1 1 |      0 1          |      0 1
  Sum + 2 x Carry == A + B in every row: True
  the two half adders agree: True
```

**Differentiation.** Support: provide the CircuitVerse starting page with the two inputs and the gates, and the Python gate functions; students build the NAND constructions. Stretch: the comparator, the majority function, the NOR-only half adder and a Python function that counts the gates of any expression.

**Discussion questions (not for the student quiz).** Why is a circuit with fewer gates usually faster and cheaper? How would you build the same half adder from relays or from water valves?
