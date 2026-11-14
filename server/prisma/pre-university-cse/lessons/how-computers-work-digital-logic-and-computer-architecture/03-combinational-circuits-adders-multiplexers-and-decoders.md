# Lumexa Mission Log: How Computers Work: Digital Logic & Computer Architecture

**Course/Path:** How Computers Work: Digital Logic & Computer Architecture
**Lesson:** 03 of 08
**Title:** Combinational Circuits: Adders, Multiplexers and Decoders
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** CircuitVerse · circuit lab (with Python)

---

## Mission Brief

Your half adder from Lesson 2 can add two bits, but a calculator must add *numbers*: several bits at a time, where each column has to take in the carry from the column to its right. And a calculator that can only add is not much of a calculator: it should also be able to do other operations, and a circuit has no "if" statement to choose between them. It needs a different kind of component, a **selector**.

In this lesson you build three families of circuits that appear in every processor. **Adders** do arithmetic; **multiplexers** pick one of several inputs; **decoders** turn a binary code into a single active line, such as "this memory chip". All three are **combinational circuits**: the output depends only on the inputs *right now*, with no memory of the past. By the end you will have a four-bit adder that can also AND, OR and XOR, selected by two switches: the arithmetic-logic heart of the course project.

## Learning Objectives

1. Explain what a combinational circuit is, and follow the design steps from truth table to circuit.
2. Build a full adder from two half adders and chain four of them into a ripple-carry adder.
3. Explain carry delay, overflow, and how an adder can also subtract.
4. Explain and build a 2-to-1 multiplexer and describe larger ones (4-to-1).
5. Explain and build a 2-to-4 decoder and give examples of its use.
6. Build the four-bit adder with operation select in CircuitVerse and model it in Python.

## Prerequisites

- Lesson 2: gates, Boolean algebra, two's complement and the half adder.
- Lesson 1: the four-switch panel and hexadecimal display in your CircuitVerse project.

## Concept Explanation

### Combinational circuits and their design

In a **combinational circuit** each output is a Boolean function of the *current* inputs only. (Circuits with memory are **sequential**, the topic of Lesson 4.) The usual design recipe: (1) state the requirement; (2) write a **truth table**; (3) read off a Boolean expression, for example a **sum of products** (an OR of AND terms, one for each row with output 1); (4) **simplify** it with the algebraic laws or a **Karnaugh map** (a grid that makes neighbouring 1s easy to group); (5) draw the circuit and test every row.

### The full adder

A half adder cannot accept a carry from the right. A **full adder** adds three bits: A, B and a carry-in **Cin**, and produces a **Sum** and a carry-out **Cout**. Its truth table has 2³ = 8 rows, and the two outputs are **Sum = A ⊕ B ⊕ Cin** and **Cout = A·B + Cin·(A ⊕ B)**. It is built from two half adders and an OR gate: the first half adder adds A and B; the second adds that sum and Cin; the carries of both are ORed. Total: 5 gates (two XOR, two AND, one OR).

### The ripple-carry adder

To add two *n*-bit numbers, use *n* full adders in a row. Bit 0 has Cin = 0 (or the "carry-in" of the whole adder); each Cout feeds the Cin of the next bit. The carry **ripples** from the least significant bit to the most significant bit, so the last sum bit is correct only after the carry has passed through all *n* adders: the delay grows with *n*. Fast CPUs use **carry-lookahead** circuits to speed this up. The last carry-out tells you about **overflow** of unsigned numbers; for signed numbers, overflow occurs when the carries into and out of the top bit differ.

**Subtraction** comes almost for free (Lesson 2: a − b = a + (−b)). XOR every bit of B with a control line **Sub**, and feed **Sub** into the first Cin: when Sub = 1, B is inverted and 1 is added, which is exactly the two's complement of B. One circuit adds *and* subtracts.

### Multiplexers

A **multiplexer (mux)** selects one of several data inputs and passes it to the output. A **2-to-1 mux** has data inputs A and B, a select line S and output Y = S′·A + S·B: when S = 0 the output copies A, when S = 1 it copies B. A **4-to-1 mux** needs **two** select lines to choose among four inputs; in general 2ⁿ inputs need n select lines. Multiplexers route data inside a CPU, choose the source of a register's input, and implement the "which operation?" choice in an ALU. A mux can also implement any Boolean function: connect the function's truth-table values to the data inputs, and the variables to the select lines.

### Decoders (and encoders)

A **decoder** turns an *n*-bit code into 2ⁿ lines of which **exactly one is active**. A **2-to-4 decoder** with inputs A₁A₀ has outputs D₀ to D₃: D₀ = A₁′A₀′, D₁ = A₁′A₀, D₂ = A₁A₀′, D₃ = A₁A₀. Decoders select a memory location or chip from an address, choose which register to write, and decode the instruction code into control signals. An **encoder** does the reverse; a **demultiplexer** sends one input to one of several outputs.

### Buses in CircuitVerse

A **bus** is a group of wires carrying a multi-bit value. In CircuitVerse the **Input** and **Output** elements can be set to 4 bits, and a **Splitter** separates or combines bits. Library components include a **Multiplexer** (you set the number of select bits), a **Decoder** and an **Adder**, but to learn how they work you will build the first versions yourself from gates, then use sub-circuits to keep the diagram tidy.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Combinational circuit** | A circuit whose outputs depend only on the current inputs. |
| **Sum of products** | A Boolean expression that ORs together AND terms. |
| **Karnaugh map** | A grid used to simplify Boolean expressions by grouping neighbouring 1s. |
| **Full adder** | A circuit that adds two bits and a carry-in, giving a sum and a carry-out. |
| **Ripple-carry adder** | A chain of full adders in which each carry feeds the next stage. |
| **Multiplexer** | A circuit that selects one of several inputs under the control of select lines. |
| **Select line** | A control input that chooses which data input a multiplexer passes. |
| **Decoder** | A circuit that activates exactly one of 2ⁿ outputs for an n-bit input code. |
| **Bus** | A group of wires that carries a multi-bit value. |
| **Carry-lookahead** | A faster adder design that computes carries in advance instead of rippling. |

## Worked Examples

### Example 1: The full adder

```python
from itertools import product


def half_adder(a, b):
    return a ^ b, a & b


def full_adder(a, b, cin):
    s1, c1 = half_adder(a, b)
    s2, c2 = half_adder(s1, cin)
    return s2, c1 | c2


print(" A B Cin | Sum Cout | A+B+Cin")
for a, b, cin in product((0, 1), repeat=3):
    s, cout = full_adder(a, b, cin)
    print(f" {a} {b}  {cin}  |  {s}    {cout}   | {a + b + cin} = {cout}{s} in binary")
print("always Sum + 2 x Cout = A + B + Cin:", all(s + 2 * c == a + b + cin for a, b, cin in product((0, 1), repeat=3) for s, c in [full_adder(a, b, cin)]))
```

```output
 A B Cin | Sum Cout | A+B+Cin
 0 0  0  |  0    0   | 0 = 00 in binary
 0 0  1  |  1    0   | 1 = 01 in binary
 0 1  0  |  1    0   | 1 = 01 in binary
 0 1  1  |  0    1   | 2 = 10 in binary
 1 0  0  |  1    0   | 1 = 01 in binary
 1 0  1  |  0    1   | 2 = 10 in binary
 1 1  0  |  0    1   | 2 = 10 in binary
 1 1  1  |  1    1   | 3 = 11 in binary
always Sum + 2 x Cout = A + B + Cin: True
```

1. The full adder is two half adders and an OR gate. The first adds A and B; the second adds that sum and the carry-in; either half adder may produce a carry.
2. All eight rows agree with ordinary arithmetic: the largest case, 1 + 1 + 1 = 3 = 11 in binary, gives Sum 1 and Cout 1.
3. The last line checks the whole truth table against Python's addition: a complete proof for a three-input circuit.
4. This is the building block: one full adder per bit of the number.

### Example 2: A four-bit ripple-carry adder with subtraction

```python
def half_adder(a, b):
    return a ^ b, a & b


def full_adder(a, b, cin):
    s1, c1 = half_adder(a, b)
    s2, c2 = half_adder(s1, cin)
    return s2, c1 | c2


def to_bits(n):
    return [(n >> k) & 1 for k in range(4)]            # least significant bit first


def from_bits(bits):
    return sum(bit << k for k, bit in enumerate(bits))


def add4(x, y, sub=0):
    a, b = to_bits(x), [bit ^ sub for bit in to_bits(y)]   # XOR with Sub inverts B
    carry, out = sub, []                                   # Sub is the first carry-in
    for k in range(4):
        s, carry = full_adder(a[k], b[k], carry)
        out.append(s)
    return from_bits(out), carry


for x, y, sub in ((6, 7, 0), (9, 9, 0), (9, 5, 1), (3, 5, 1)):
    value, carry = add4(x, y, sub)
    op = "-" if sub else "+"
    print(f"{x:>2} {op} {y} = {value:04b} ({value:>2}), carry-out {carry}")
print("all 256 additions correct:", all(add4(x, y)[0] == (x + y) % 16 and add4(x, y)[1] == (x + y) // 16 for x in range(16) for y in range(16)))
```

```output
 6 + 7 = 1101 (13), carry-out 0
 9 + 9 = 0010 ( 2), carry-out 1
 9 - 5 = 0100 ( 4), carry-out 1
 3 - 5 = 1110 (14), carry-out 0
all 256 additions correct: True
```

1. `add4` chains four full adders: the carry produced by bit k is the carry-in of bit k + 1, so it **ripples** from the lowest bit up.
2. 9 + 9 = 18 does not fit in 4 bits: the result 0010 (2) is wrong as a number, but the carry-out 1 flags the overflow.
3. Subtraction reuses the same adder: XOR every bit of B with `sub` and start with carry-in `sub`. 9 − 5 gives 4 with carry-out 1 (no borrow); 3 − 5 gives 14, which is −2 in 4-bit two's complement, with carry-out 0.
4. The last line checks all 256 input pairs against ordinary arithmetic.

### Example 3: Multiplexer, decoder and an operation select

```python
def mux2(a, b, s):
    return (a & (1 - s)) | (b & s)


def mux4(d0, d1, d2, d3, s1, s0):
    return mux2(mux2(d0, d1, s0), mux2(d2, d3, s0), s1)


def decoder2to4(a1, a0):
    return [int(not a1 and not a0), int(not a1 and a0), int(a1 and not a0), int(a1 and a0)]


print("mux2: S=0 selects A, S=1 selects B:", [mux2(1, 0, 0), mux2(1, 0, 1)])
print("mux4 with data 0,1,1,0 and select 10:", mux4(0, 1, 1, 0, 1, 0))
for code in range(4):
    print(f"decoder input {code:02b} -> outputs D0..D3 = {decoder2to4(code >> 1, code & 1)}")


def one_bit_alu(a, b, op):
    return mux4(a ^ b, a & b, a | b, a ^ b ^ 1, op >> 1, op & 1)


print("1-bit unit for a = 1, b = 0, op 00..11:", [one_bit_alu(1, 0, op) for op in range(4)])
```

```output
mux2: S=0 selects A, S=1 selects B: [1, 0]
mux4 with data 0,1,1,0 and select 10: 1
decoder input 00 -> outputs D0..D3 = [1, 0, 0, 0]
decoder input 01 -> outputs D0..D3 = [0, 1, 0, 0]
decoder input 10 -> outputs D0..D3 = [0, 0, 1, 0]
decoder input 11 -> outputs D0..D3 = [0, 0, 0, 1]
1-bit unit for a = 1, b = 0, op 00..11: [1, 0, 1, 0]
```

1. `mux2` copies A when S = 0 and B when S = 1. `mux4` is built from three 2-to-1 multiplexers, two for the lower select bit and one for the upper.
2. The decoder always has exactly one 1 among its four outputs: the one whose number is the input code.
3. `one_bit_alu` computes four results at once (XOR, AND, OR, XNOR) and uses the multiplexer, controlled by two select bits, to choose which one leaves the circuit. This "compute everything, select one" idea is the core of an ALU.
4. In your four-bit unit the same multiplexer will choose between the adder's result and the logic operations.

## Common Mistakes and Misconceptions

- **Forgetting the carry-in of the first stage.** It must be connected (0 for adding, 1 for subtracting), never left floating.
- **Connecting the carry the wrong way.** Cout of bit k goes to Cin of bit k + 1, not k − 1.
- **Reading overflow from the sum bits.** Overflow shows in the carry-out (unsigned) or in the sign logic (signed); the sum bits alone look "normal".
- **Mixing up the select-line order.** With S₁S₀ = 10 a 4-to-1 mux selects input 2 (binary 10), counting from input 0.
- **Thinking a decoder is a counter.** A decoder only changes when its inputs change; it has no memory.
- **Believing the adder is slow only because of gates.** The carry chain, not a single gate, creates the delay: it grows with the number of bits.
- **Building a bus with unlabelled single wires.** Name each bit (a3 a2 a1 a0) so you can debug.
- **Forgetting to test every input pair.** A 4-bit adder has 256 input pairs, which is exactly why you also write a program to test it.

## Guided Hands-On Activity

**Build, chain, select.** Work with your teacher.

1. In CircuitVerse, build a full adder from two of your half adders (Lesson 2) and an OR gate. Test all eight input rows against the table above.
2. Put the full adder in a **sub-circuit** (a reusable block with inputs A, B, Cin and outputs Sum, Cout) so you can use it four times.
3. Chain four copies: Cout of each into the Cin of the next. Connect two 4-bit inputs A and B (from splitters) and show the result on a hex display, with Cout on an LED.
4. Test 6 + 7, 9 + 9 and 15 + 1. What happens to the carry and the sum in each case?
5. Build a 2-to-1 multiplexer from NOT, AND and OR gates, and test its four input settings.
6. Build a 2-to-4 decoder from gates, with inputs A₁A₀ and four LEDs, and check that exactly one LED is on for each code.

## Lesson Project: Four-Bit Adder with Operation Select

### Objective

Extend the **Mini Calculator System** with its arithmetic-logic stage: a **four-bit adder** built from full adders, and a **multiplexer-based operation select** with which two switches choose between ADD, AND, OR and XOR. A Python model checks the circuit against ordinary arithmetic for all inputs.

### Requirements

- **CircuitVerse build.** A full-adder sub-circuit (two half adders and an OR); four of them chained into a four-bit adder with inputs A and B (two 4-bit switch panels from Lesson 1), a carry-in of 0, a 4-bit sum and a carry-out LED; then four 4-to-1 multiplexers (one per bit) whose data inputs are the adder's sum bit, A AND B, A OR B and A XOR B for that bit, controlled by two select switches S₁S₀ (00 = ADD, 01 = AND, 10 = OR, 11 = XOR). The result goes to a hexadecimal display, and the carry LED is meaningful only for ADD.
- **Python model.** Write `full_adder`, `add4`, `mux4` and `alu4(a, b, op)` as in the examples.
- Print a table of the results for the pairs (6, 7), (9, 9), (12, 10), (15, 1) with all four operations (result in binary and hex, and the carry-out for ADD).
- Verify and print: all 256 additions agree with ordinary arithmetic (sum and carry-out), and all 256 AND, OR and XOR results agree with Python's `&`, `|` and `^`.
- In your portfolio, include a screenshot of the circuit set to 9 + 9 (ADD) showing the carry, and one set to 12 XOR 10.

### Instructions

1. Build and test the full adder, then make it a sub-circuit.
2. Chain four full adders and connect the two input panels, the hex display and the carry LED. Test 6 + 7 and 9 + 9.
3. For each bit, build a 4-to-1 multiplexer (from library or from gates) with the four data inputs listed above, and join the select switches.
4. Test all four operations for the pair 12 and 10 (results 22 → 6 with carry, 8, 14, 6).
5. Write the Python model of the same structure, bit by bit.
6. Print the table and the two verification lines.
7. Compare your circuit's outputs with the table for at least six cases, then take the screenshots.

### Expected Output

```text
A    B    op   result  hex  carry-out
0110 0111 ADD  1101    D    0
0110 0111 AND  0110    6    -
0110 0111 OR   0111    7    -
0110 0111 XOR  0001    1    -
1001 1001 ADD  0010    2    1
1001 1001 AND  1001    9    -
1001 1001 OR   1001    9    -
1001 1001 XOR  0000    0    -
1100 1010 ADD  0110    6    1
1100 1010 AND  1000    8    -
1100 1010 OR   1110    E    -
1100 1010 XOR  0110    6    -
1111 0001 ADD  0000    0    1
1111 0001 AND  0001    1    -
1111 0001 OR   1111    F    -
1111 0001 XOR  1110    E    -

all 256 additions agree with arithmetic: True
all 256 AND, OR and XOR results agree with Python: True
```

### Hints

1. **Hint 1 (the full adder).** Sum = (A XOR B) XOR Cin; Cout = (A AND B) OR (Cin AND (A XOR B)).
2. **Hint 2 (the chain).** Use bit 0 as the least significant: its Cin is 0. Be careful which splitter output is bit 0.
3. **Hint 3 (the multiplexers).** A 4-to-1 multiplexer has two select pins; connect the same S₁ and S₀ switches to all four multiplexers.
4. **Hint 4 (testing the circuit).** 12 = 1100 and 10 = 1010: AND = 1000 (8), OR = 1110 (14), XOR = 0110 (6), and ADD = 10110 (22): the sum bits 0110 (6) and a carry of 1.
5. **Hint 5 (the Python bits).** `to_bits(n)` returns the four bits with the least significant first; reverse when you print them.
6. **Hint 6 (the carry for logic operations).** Print the carry only for ADD; for the other operations show a dash.

### Success Criteria

- [ ] The CircuitVerse project has a full-adder sub-circuit, a four-bit adder and four multiplexers with shared select switches.
- [ ] The circuit adds correctly, including the carry-out for 9 + 9 and 15 + 1.
- [ ] AND, OR and XOR give bitwise results for all inputs, selected by the two switches.
- [ ] The Python model matches the circuit in the table and passes both 256-pair checks.
- [ ] The portfolio contains the two screenshots.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Add the **subtract** option: use the XOR-with-Sub trick to make the select code 100 (a third select switch) mean A − B, and add an **overflow** LED for signed numbers (carry into the top bit differs from carry out of it). Then add a **zero flag** LED that lights when the result is 0000 (a four-input NOR). These flags return in the CPU of Lesson 5.

## Lesson Recap

- A **combinational circuit** depends only on its current inputs; design goes truth table, expression, simplify, circuit.
- A **full adder** (two half adders and an OR) adds A, B and Cin; **n** of them form a **ripple-carry adder**, whose delay grows with n; XOR on B plus Cin = 1 turns it into a subtractor.
- A **multiplexer** selects one of 2ⁿ inputs with n select lines; it routes data and chooses operations.
- A **decoder** activates one of 2ⁿ outputs for an n-bit code, used to select memory locations, registers and instructions.
- "Compute all the operations, then select one with a multiplexer" is the pattern of every ALU.

## Homework / Extension Mission

Design, draw and build a **4-to-1 multiplexer** from three 2-to-1 multiplexers, and a **3-to-8 decoder** from gates. Then solve this design problem: a school locker room has three doors, each with a sensor that is 1 when open; build a circuit (a truth table, an expression and a CircuitVerse circuit) that outputs 1 when exactly one door is open. Finally, estimate the delay of a 16-bit ripple-carry adder if each full adder needs 2 gate delays for its carry and compare it with a 4-bit adder.

## Course Project Connection

This lesson adds the **adder and operation select** to the **Mini Calculator System**, the course project. The two switch panels from Lesson 1 feed the adder, and the logic gates from Lesson 2 appear inside the full adder. In Lesson 4 a register will *store* the result, in Lesson 5 the multiplexer and adder will become the ALU of a small CPU, and in Lesson 8 everything is integrated into one tested calculator.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: combinational design and the full adder (truth table on the board). 15 minutes: ripple-carry and subtraction (Example 2). 10 minutes: multiplexers and decoders (Example 3). 25 minutes: the CircuitVerse build. Have the full adder sub-circuit ready as a template for students who need help.

**Live demonstrations.** Chain four full adders in CircuitVerse and toggle inputs to watch the carry ripple (use a slow simulation or probes). Use the interactive circuit visuals to test a mux and a decoder. Show 9 + 9 overflow on the hex display.

**Misconceptions.** "The carry goes into the same column." "A decoder stores a value." "Overflow always shows in the sum." "A multiplexer calculates something."

**Assessment of the project.** Check the sub-circuit, the chaining order, the shared select switches, the six test cases and the Python checks. Ask each student to trace 15 + 1 through the four stages.

**Reference solution `alu4.py`** (run with `python3 alu4.py`):

```python
"""Four-Bit Adder with Operation Select: a gate-level Python model of the CircuitVerse build."""


def half_adder(a, b):
    return a ^ b, a & b


def full_adder(a, b, cin):
    s1, c1 = half_adder(a, b)
    s2, c2 = half_adder(s1, cin)
    return s2, c1 | c2


def to_bits(n):
    return [(n >> k) & 1 for k in range(4)]


def from_bits(bits):
    return sum(bit << k for k, bit in enumerate(bits))


def add4(x, y):
    a, b = to_bits(x), to_bits(y)
    carry, out = 0, []
    for k in range(4):
        s, carry = full_adder(a[k], b[k], carry)
        out.append(s)
    return out, carry


def mux2(a, b, s):
    return (a & (1 - s)) | (b & s)


def mux4(d0, d1, d2, d3, s1, s0):
    return mux2(mux2(d0, d1, s0), mux2(d2, d3, s0), s1)


def alu4(x, y, op):
    a, b = to_bits(x), to_bits(y)
    sums, carry = add4(x, y)
    result = [mux4(sums[k], a[k] & b[k], a[k] | b[k], a[k] ^ b[k], op >> 1, op & 1) for k in range(4)]
    return from_bits(result), carry if op == 0 else None


NAMES = ["ADD", "AND", "OR", "XOR"]
print("A    B    op   result  hex  carry-out")
for x, y in ((6, 7), (9, 9), (12, 10), (15, 1)):
    for op in range(4):
        value, carry = alu4(x, y, op)
        carry_text = "-" if carry is None else str(carry)
        print(f"{x:04b} {y:04b} {NAMES[op]:<4} {value:04b}    {value:X}    {carry_text}")

adds = all(from_bits(add4(x, y)[0]) == (x + y) % 16 and add4(x, y)[1] == (x + y) // 16 for x in range(16) for y in range(16))
logic = all(alu4(x, y, 1)[0] == x & y and alu4(x, y, 2)[0] == x | y and alu4(x, y, 3)[0] == x ^ y for x in range(16) for y in range(16))
print("\nall 256 additions agree with arithmetic:", adds)
print("all 256 AND, OR and XOR results agree with Python:", logic)
```

```output
A    B    op   result  hex  carry-out
0110 0111 ADD  1101    D    0
0110 0111 AND  0110    6    -
0110 0111 OR   0111    7    -
0110 0111 XOR  0001    1    -
1001 1001 ADD  0010    2    1
1001 1001 AND  1001    9    -
1001 1001 OR   1001    9    -
1001 1001 XOR  0000    0    -
1100 1010 ADD  0110    6    1
1100 1010 AND  1000    8    -
1100 1010 OR   1110    E    -
1100 1010 XOR  0110    6    -
1111 0001 ADD  0000    0    1
1111 0001 AND  0001    1    -
1111 0001 OR   1111    F    -
1111 0001 XOR  1110    E    -

all 256 additions agree with arithmetic: True
all 256 AND, OR and XOR results agree with Python: True
```

**Differentiation.** Support: provide the full-adder sub-circuit and the first two chained stages. Stretch: the subtract option, overflow and zero flags, and a carry-lookahead model that computes all carries at once.

**Discussion questions (not for the student quiz).** Why do real CPUs compute all operations in parallel and then select one? How does a multiplexer make "if" possible in hardware?
