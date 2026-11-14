# Lumexa Mission Log: How Computers Work: Digital Logic & Computer Architecture

**Course/Path:** How Computers Work: Digital Logic & Computer Architecture
**Lesson:** 04 of 08
**Title:** Sequential Circuits: Flip-Flops, Registers and Counters
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** CircuitVerse · circuit lab (with Python)

---

## Mission Brief

Every circuit so far forgets. Change the inputs of your adder and the sum changes at once; remove the inputs, and there is nothing left. A real calculator, however, must *remember*: the number you typed, the running total, the instruction it is about to execute. To remember, a circuit needs a loop in which its own output feeds back into its input, and a way to say *when* to capture a value instead of letting it flow through.

The first answer is the **latch**: two gates wired in a circle, each holding the other in place. The practical answer is the **flip-flop**, which captures one bit at the exact moment a **clock** ticks and holds it until the next tick. Group flip-flops and you get a **register**; make them toggle in sequence and you get a **counter**; connect them with logic and you get a **state machine**, the same finite automata you met in Course 4, now made of silicon. In this lesson you build all of these, and add an **accumulator register** and a **counter** to your Mini Calculator System.

## Learning Objectives

1. Explain the difference between combinational and sequential circuits, and the role of the clock.
2. Explain how an SR latch stores a bit, and how a D flip-flop captures a bit on a clock edge.
3. Build a register with a load control from D flip-flops and multiplexers, and a shift register.
4. Build and analyse synchronous counters, and explain how they divide frequency.
5. Describe a finite state machine as a state register plus combinational logic.
6. Build an accumulator register and a four-bit counter in CircuitVerse and model them in Python.

## Prerequisites

- Lesson 3: the four-bit adder with operation select (its output will feed your register), multiplexers.
- Course 4: finite automata, to recognise a state machine.

## Concept Explanation

### Sequential circuits and the clock

In a **sequential circuit** the output depends on the inputs *and on stored state*, which means on what happened before. Memory comes from **feedback**: an output wired back to an input. Feedback without discipline is chaos, so computers use a **clock**: a signal that alternates 0, 1, 0, 1 at a fixed **frequency** (a 3 GHz CPU has 3 billion ticks per second). All the memory elements capture their new value at the same instant, the **rising edge** of the clock (the moment it goes from 0 to 1). Between edges the logic has time to settle. This is **synchronous design**, and it keeps millions of gates in step. The clock period must be longer than the slowest path (the "critical path", such as a long carry chain).

### Latches and flip-flops

An **SR latch** is two NOR gates, each with its output fed into the other's input. Its inputs are **Set** (S) and **Reset** (R). Set S = 1 and the output Q becomes 1 and stays 1 after S returns to 0; Reset R = 1 and Q becomes 0. With both inputs 0 the latch **remembers**. (Setting S = R = 1 together is forbidden: the outputs are both 0 and the next state is unpredictable.) A latch changes whenever its inputs do, which is hard to control.

A **D flip-flop** is edge-triggered: on each rising clock edge it copies its data input D to its output Q, and then ignores D until the next edge. It stores **one bit**. Other kinds:

| Flip-flop | Inputs | At the clock edge |
|---|---|---|
| **D** | D | Q ← D |
| **T** (toggle) | T | if T = 1 then Q flips, otherwise Q holds |
| **JK** | J, K | J K = 00 hold, 01 reset, 10 set, 11 toggle |

### Registers

A **register** is a row of flip-flops sharing one clock: a 4-bit register stores 4 bits. To keep its value unless told to change it, put a **2-to-1 multiplexer** in front of each D input: one input is the new data, the other is the flip-flop's own Q (feedback). A **Load** control selects between them: when Load = 1 the register loads the new value at the next clock edge; when Load = 0 it holds. A register whose input is the output of an ALU is an **accumulator**: it holds the running total. A **shift register** passes each bit to its neighbour on every clock edge; shifting left is multiplying by 2, shifting right is dividing by 2, and shift registers also convert between serial and parallel data (as in a USB port).

### Counters

A **counter** is a register that counts the clock pulses. Build it from **T flip-flops**: bit 0 toggles at every clock edge, bit 1 toggles when bit 0 is 1, bit 2 when bits 0 and 1 are both 1, and so on. This is a **synchronous counter** (all flip-flops share the clock). The value counts 0, 1, 2, ..., 2ⁿ − 1 and **wraps** to 0. Bit 0 toggles every cycle, bit 1 every second cycle, bit 2 every fourth: each bit has **half the frequency** of the previous one, so a counter is also a **frequency divider**. The **program counter** of a CPU is exactly a counter with a load input.

### State machines

A **finite state machine (FSM)** is a state register plus two blocks of combinational logic: one computes the **next state** from the current state and the inputs, the other computes the **outputs**. It is the hardware version of the DFAs of Course 4: the flip-flops hold the state number in binary. A traffic light controller (red, green, yellow), a vending machine and the control unit of a CPU (Lesson 5) are all FSMs.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Sequential circuit** | A circuit whose output depends on its inputs and on stored state. |
| **Clock** | A periodic signal that tells every flip-flop when to capture its input. |
| **Rising edge** | The moment the clock changes from 0 to 1. |
| **Latch** | A feedback circuit of two gates that stores one bit (for example an SR latch). |
| **Flip-flop** | An edge-triggered one-bit memory such as a D, T or JK flip-flop. |
| **Register** | A group of flip-flops that stores a multi-bit value. |
| **Load enable** | A control that decides whether a register captures new data or holds its value. |
| **Shift register** | A register whose bits move to the neighbouring position on every clock edge. |
| **Counter** | A register that counts clock pulses. |
| **Finite state machine** | A state register plus logic for the next state and the outputs. |

## Worked Examples

### Example 1: A D flip-flop and a register with load

```python
class Register4:
    """Four D flip-flops with a load enable: a 2-to-1 mux in front of each D input."""

    def __init__(self):
        self.q = 0

    def clock(self, load, data):
        d = data & 15 if load else self.q        # the multiplexer: new data or the old value
        self.q = d                               # the flip-flops capture d on the clock edge
        return self.q


reg = Register4()
print("cycle  load  data  Q after the clock edge")
for cycle, (load, data) in enumerate([(1, 5), (0, 9), (0, 3), (1, 12), (0, 7), (1, 20)], start=1):
    q = reg.clock(load, data)
    print(f"{cycle:>5}  {load:>4}  {data:>4}  {q:04b} ({q})")
```

```output
cycle  load  data  Q after the clock edge
    1     1     5  0101 (5)
    2     0     9  0101 (5)
    3     0     3  0101 (5)
    4     1    12  1100 (12)
    5     0     7  1100 (12)
    6     1    20  0100 (4)
```

1. The register keeps a 4-bit value in `self.q`. On each `clock` call (a rising edge) it captures `d`: the new data if Load is 1, otherwise its own old value.
2. In cycles 2 and 3 Load is 0, so the data inputs 9 and 3 are *ignored* and the register still holds 5: the circuit **remembers**.
3. In cycle 4 the register loads 12. In cycle 6 the data 20 is wider than 4 bits, so only its lower four bits (0100 = 4) are stored.
4. All four flip-flops update together at the clock edge, so the register never shows a mix of old and new bits.

### Example 2: A synchronous counter and frequency division

```python
class Counter4:
    def __init__(self):
        self.bits = [0, 0, 0, 0]                  # bit 0 first

    def clock(self, reset=0):
        if reset:
            self.bits = [0, 0, 0, 0]
            return
        toggle = [1]                              # T input of bit k: all lower bits are 1
        for k in range(1, 4):
            toggle.append(toggle[-1] & self.bits[k - 1])
        self.bits = [b ^ t for b, t in zip(self.bits, toggle)]

    def value(self):
        return sum(b << k for k, b in enumerate(self.bits))


counter = Counter4()
values, toggles = [], [0, 0, 0, 0]
for cycle in range(1, 21):
    before = list(counter.bits)
    counter.clock()
    values.append(counter.value())
    if cycle <= 16:
        for k in range(4):
            toggles[k] += before[k] != counter.bits[k]
print("count after each of 20 clock edges:", values)
print("toggles of bit 0, 1, 2, 3 in the first 16 edges:", toggles)
```

```output
count after each of 20 clock edges: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3, 4]
toggles of bit 0, 1, 2, 3 in the first 16 edges: [16, 8, 4, 2]
```

1. Bit 0 always toggles. Bit k toggles only when all lower bits are 1: the "carry" of the counter, produced by AND gates.
2. After 15 comes 0: a 4-bit counter wraps around every 16 clock pulses (2⁴).
3. Over the first 16 edges, bit 0 toggles 16 times, bit 1 eight times, bit 2 four times and bit 3 twice: each bit runs at half the frequency of the one before.
4. A counter therefore divides the clock frequency by 2, 4, 8 and 16: how a 32,768 Hz watch crystal becomes one tick per second.

### Example 3: A shift register and a state machine

```python
bits = [0, 0, 0, 0]
print("shifting in 1, 0, 1, 1 (left shift = times 2):")
for b in (1, 0, 1, 1):
    bits = bits[1:] + [b]                         # every bit moves one place left, the new bit enters on the right
    print("  ", bits, "=", int("".join(map(str, bits)), 2))

# A state machine that detects the pattern 101 in a stream of bits (overlapping allowed).
NEXT = {("S0", 0): "S0", ("S0", 1): "S1", ("S1", 0): "S10", ("S1", 1): "S1", ("S10", 0): "S0", ("S10", 1): "S101", ("S101", 0): "S10", ("S101", 1): "S1"}
state, found = "S0", []
stream = [1, 0, 1, 1, 0, 1, 0, 0, 1]
for index, bit in enumerate(stream):
    state = NEXT[(state, bit)]
    if state == "S101":
        found.append(index)
print("stream", stream, "-> pattern 101 ends at positions", found)
```

```output
shifting in 1, 0, 1, 1 (left shift = times 2):
   [0, 0, 0, 1] = 1
   [0, 0, 1, 0] = 2
   [0, 1, 0, 1] = 5
   [1, 0, 1, 1] = 11
stream [1, 0, 1, 1, 0, 1, 0, 0, 1] -> pattern 101 ends at positions [2, 5]
```

1. In the shift register every bit moves one place left on each clock edge and the new bit enters on the right. After four edges it holds 1011 = 11, and each shift doubled the value before adding the new bit.
2. The state machine is a table of (state, input) → next state: the same structure as the DFA transition table of Course 4. In hardware the state is stored in flip-flops and `NEXT` is combinational logic.
3. The detector remembers how much of "101" it has seen: nothing (S0), "1" (S1), "10" (S10) or the whole pattern (S101).
4. It finds the pattern ending at positions 2 and 5. After a match the machine falls back to S10 or S1 (not to S0), so overlapping matches such as the ones in 10101 are found too.

## Common Mistakes and Misconceptions

- **Confusing a latch with a flip-flop.** A latch is level-sensitive (it follows its inputs while enabled); a flip-flop captures only on the clock edge.
- **Setting S = R = 1 on an SR latch.** The state afterwards is undefined; avoid it.
- **Forgetting the feedback path in a register with load.** The multiplexer must feed Q back to D, or the register forgets when Load = 0.
- **Thinking all flip-flops update one after another.** In a synchronous design they all update at the same edge, using the values from just *before* the edge.
- **Starting a counter without a reset.** Flip-flops power up in an unknown state; add a reset input to start from 0.
- **Using the output of a counter as a clock without care.** A ripple counter's delays accumulate; synchronous counters use a shared clock.
- **Expecting a state machine to remember more than its states.** It can only remember what its finite number of states can encode.
- **Making the clock too fast.** If the period is shorter than the slowest signal path, flip-flops capture wrong values.

## Guided Hands-On Activity

**Remember and count.** Work with your teacher.

1. In CircuitVerse build an **SR latch** from two NOR gates (cross-coupled), with inputs S and R and an output Q. Set, reset, and hold it. Try S = R = 1 and see what goes wrong.
2. Replace it by a **D flip-flop** with a **Clock** element. Set D to 1 and click the clock: when does Q change?
3. Build a **1-bit register with load**: a 2-to-1 multiplexer chooses between D and Q for the flip-flop's input. Test Load = 1 and Load = 0.
4. Extend to **4 bits**, sharing the clock and the Load switch. Feed it from your four switches and show Q on a hex display.
5. Build a **4-bit counter** from T flip-flops (or use CircuitVerse's counter element): T0 = 1, T1 = Q0, T2 = Q0·Q1, T3 = Q0·Q1·Q2. Click the clock and watch the display count.
6. Add a **reset** input that returns the counter to 0. Then count to 15 and click once more: what happens?

## Lesson Project: Accumulator Register and Counter

### Objective

Extend the **Mini Calculator System** with memory: a **four-bit accumulator register** with a load control, fed by the ALU of Lesson 3, and a **four-bit counter** that counts clock pulses. A Python model produces the trace that your circuit must reproduce.

### Requirements

- **CircuitVerse build.** (1) A 4-bit register from four D flip-flops and four 2-to-1 multiplexers, with a shared **Clock** and a **Load** switch; (2) the register's input comes from the ALU of Lesson 3 (A is the register's own output, B comes from your switch panel, the operation from the two select switches), so each Load + clock pulse performs ACC ← ACC op B; (3) a separate 4-bit counter with a Reset switch; (4) hex displays for the accumulator and the counter.
- **Python model.** Classes `Register4` (with `clock(load, data)`) and `Counter4` (with `clock(reset)`), and the ALU of Lesson 3 as a function `alu(a, b, op)` (ADD, AND, OR, XOR on 4 bits).
- Print the **accumulator trace** for the sequence of (load, B, op): (1, 3, ADD), (1, 5, ADD), (0, 7, ADD), (1, 7, ADD), (1, 1, ADD), (1, 5, XOR), (1, 12, OR), (1, 9, AND): the cycle, the inputs and the accumulator after the clock edge in binary and hexadecimal. Mark the cycle where the register *holds* (Load = 0).
- Print the **counter**: the value after each of 18 clock pulses (with the wrap from 15 to 0) and the number of toggles of each bit in 16 pulses.
- In the portfolio, include a screenshot of your accumulator after the fourth clock pulse (it must show F) and write down how many clock pulses the counter needs to return to 0.

### Instructions

1. Build the 1-bit register with load in CircuitVerse, then replicate it four times with a shared clock.
2. Connect the ALU output to the register inputs and the register output back to input A of the ALU.
3. Build the counter from T flip-flops with a reset, and test the wrap-around.
4. Write the Python classes and the ALU function.
5. Run the eight-step sequence in Python and print the trace.
6. Run the counter for 18 pulses and count the toggles in the first 16.
7. Compare your circuit with the trace for all eight steps, then take the screenshot.

### Expected Output

```text
Accumulator trace (ACC <- ACC op B when Load = 1)
cycle load  B  op   ACC    hex
    1    1   3  ADD  0011   3
    2    1   5  ADD  1000   8
    3    0   7  ADD  1000   8  (holds)
    4    1   7  ADD  1111   F
    5    1   1  ADD  0000   0
    6    1   5  XOR  0101   5
    7    1  12  OR   1101   D
    8    1   9  AND  1001   9

Counter value after each of 18 clock pulses:
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2]
  toggles of bit 0, 1, 2, 3 in the first 16 pulses: [16, 8, 4, 2]
  after reset: 0
```

### Hints

1. **Hint 1 (the load multiplexer).** For each bit, D = Load·NewBit + Load′·Q, where `NewBit` is the ALU result bit.
2. **Hint 2 (the clock).** Use one Clock element for all flip-flops; in CircuitVerse you can click it manually to step slowly.
3. **Hint 3 (the feedback).** Output A of the ALU is the accumulator's Q; check that you did not connect the panel switches to both A and B.
4. **Hint 4 (the hold cycle).** When Load = 0 the accumulator must keep its value, whatever B and the operation are.
5. **Hint 5 (counter wiring).** T1 = Q0, T2 = Q0 AND Q1, T3 = Q0 AND Q1 AND Q2; T0 is tied to 1.
6. **Hint 6 (the Python ALU).** `alu(a, b, op)` returns `(a + b) & 15`, `a & b`, `a | b` or `a ^ b` for op 0 to 3.

### Success Criteria

- [ ] The register stores its value between clock pulses and holds it when Load = 0.
- [ ] The accumulator performs the eight operations of the trace in your circuit and gives the same results as the Python model.
- [ ] The counter counts 0 to 15, wraps to 0 and resets on the Reset switch, with the bit toggle counts 16, 8, 4 and 2.
- [ ] The accumulator shows F after the fourth clock pulse, and the portfolio screenshot shows it.
- [ ] The portfolio states that the counter returns to 0 after 16 pulses.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Turn the counter into a **program counter**: add a Load input and a 4-bit data input, so the counter can either count up or jump to a given value (a multiplexer in front of the T logic, or a register with an incrementer). Test "count 5 times, jump to 12, count 3 times". Then build a 4-bit shift register and show that shifting left twice multiplies the value 3 by 4.

## Lesson Recap

- **Sequential circuits** depend on stored state; memory comes from feedback, and a **clock** makes all the memory elements update together.
- An **SR latch** stores a bit in two cross-coupled gates; a **D flip-flop** captures its input on the clock's rising edge.
- A **register** is a row of flip-flops; a multiplexer with Q fed back gives it a **load** control; an ALU feeding its own register makes an **accumulator**.
- A **counter** (T flip-flops) counts pulses, wraps around after 2ⁿ, and divides the clock frequency by 2, 4, 8, ...
- A **finite state machine** is a state register plus next-state logic: the hardware form of the automata of Course 4.

## Homework / Extension Mission

Design a **traffic-light controller** as a state machine with states Green, Yellow and Red that cycles on each clock pulse (Green, Yellow, Red, Green...). Choose a 2-bit encoding, write the next-state table and the output table, build it in CircuitVerse with two D flip-flops, and test it. Then compute: if your counter's clock is 1 kHz, what is the frequency of bit 3, and what is the time between two wrap-arounds of an 8-bit counter? Write a short paragraph on why a CPU needs both combinational circuits and registers.

## Course Project Connection

This lesson gives the **Mini Calculator System**, the course project, its memory: the accumulator register holds the result of the ALU from Lesson 3, and the counter will become the program counter of the CPU in Lesson 5. In Lesson 6 you will study larger memories (cache, RAM and ROM) built from the same flip-flop idea, and in Lesson 8 the register, the ALU, the switches and the display will be integrated and tested as one calculator.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: why memory needs feedback (the SR latch, live in CircuitVerse). 15 minutes: flip-flops and the clock; registers with load (Example 1). 10 minutes: counters and frequency division (Example 2). 25 minutes: the accumulator and counter build.

**Live demonstrations.** Click the CircuitVerse clock slowly and ask what will change before each click. Show the forbidden S = R = 1 state. Slow the clock to see the counter's bits toggling at different rates. Use the interactive circuit visual's clock button.

**Misconceptions.** "A flip-flop remembers continuously" (it samples at the edge). "All gates in a register switch one after another." "A counter is combinational." "More states means more flip-flops linearly" (log₂ of the number of states).

**Assessment of the project.** Check the feedback path, the shared clock, the ALU loop, the hold behaviour and the counter wrap. Ask each student to predict the accumulator after (1, 3, ADD) twice.

**Reference solution `accumulator.py`** (run with `python3 accumulator.py`):

```python
"""Accumulator Register and Counter: a clock-by-clock Python model of the CircuitVerse build."""


class Register4:
    def __init__(self):
        self.q = 0

    def clock(self, load, data):
        self.q = (data & 15) if load else self.q
        return self.q


class Counter4:
    def __init__(self):
        self.bits = [0, 0, 0, 0]

    def clock(self, reset=0):
        if reset:
            self.bits = [0, 0, 0, 0]
            return
        toggle = [1]
        for k in range(1, 4):
            toggle.append(toggle[-1] & self.bits[k - 1])
        self.bits = [b ^ t for b, t in zip(self.bits, toggle)]

    def value(self):
        return sum(b << k for k, b in enumerate(self.bits))


NAMES = ["ADD", "AND", "OR", "XOR"]


def alu(a, b, op):
    return [(a + b) & 15, a & b, a | b, a ^ b][op]


acc = Register4()
SEQUENCE = [(1, 3, 0), (1, 5, 0), (0, 7, 0), (1, 7, 0), (1, 1, 0), (1, 5, 3), (1, 12, 2), (1, 9, 1)]
print("Accumulator trace (ACC <- ACC op B when Load = 1)")
print("cycle load  B  op   ACC    hex")
for cycle, (load, b, op) in enumerate(SEQUENCE, start=1):
    acc.clock(load, alu(acc.q, b, op))
    note = "  (holds)" if not load else ""
    print(f"{cycle:>5} {load:>4} {b:>3}  {NAMES[op]:<3}  {acc.q:04b}   {acc.q:X}{note}")

counter = Counter4()
values, toggles = [], [0, 0, 0, 0]
for _ in range(18):
    before = list(counter.bits)
    counter.clock()
    values.append(counter.value())
    if len(values) <= 16:
        for k in range(4):
            toggles[k] += before[k] != counter.bits[k]
print("\nCounter value after each of 18 clock pulses:")
print(" ", values)
print("  toggles of bit 0, 1, 2, 3 in the first 16 pulses:", toggles)
counter.clock(reset=1)
print("  after reset:", counter.value())
```

```output
Accumulator trace (ACC <- ACC op B when Load = 1)
cycle load  B  op   ACC    hex
    1    1   3  ADD  0011   3
    2    1   5  ADD  1000   8
    3    0   7  ADD  1000   8  (holds)
    4    1   7  ADD  1111   F
    5    1   1  ADD  0000   0
    6    1   5  XOR  0101   5
    7    1  12  OR   1101   D
    8    1   9  AND  1001   9

Counter value after each of 18 clock pulses:
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2]
  toggles of bit 0, 1, 2, 3 in the first 16 pulses: [16, 8, 4, 2]
  after reset: 0
```

**Differentiation.** Support: provide the 1-bit register with load as a sub-circuit and the Python `Counter4`. Stretch: the program counter with load, the shift register multiplication, and the traffic-light FSM.

**Discussion questions (not for the student quiz).** Why can't the output of a flip-flop be wired directly back to its own D input without a gate in between, and what does a gate in the loop change? What limits the maximum clock frequency of a CPU?
