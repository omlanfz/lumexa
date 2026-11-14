# Lumexa Mission Log: How Computers Work: Digital Logic & Computer Architecture

**Course/Path:** How Computers Work: Digital Logic & Computer Architecture
**Lesson:** 05 of 08
**Title:** CPU Architecture: ALU, Control Unit and Instruction Cycle
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** CircuitVerse · assembly simulator (with Python)

---

## Mission Brief

You now own the parts of a processor: an ALU that adds and does logic, registers that remember, a counter that counts, multiplexers that route, and a clock that keeps time. What turns them into a **computer** is one idea: a computer follows a *list of instructions stored in memory*, one at a time, forever. At every tick it asks the same three questions: *What is my next instruction? What does it mean? Do it.*

That endless loop, **fetch, decode, execute**, is what happens billions of times per second when you run any program, from a game to the operating system. In this lesson you assemble the pieces into a CPU: you meet the **control unit** that orchestrates the other parts, you learn how the ALU reports **flags** such as "the result was zero", and you follow a tiny program through the cycle, step by step, on a **toy CPU** with two registers. Your project: a mini ALU with a zero flag in CircuitVerse, and a hand-traced instruction cycle.

## Learning Objectives

1. Name the parts of a CPU (ALU, registers, program counter, instruction register, control unit, buses) and what each does.
2. Explain the stored-program idea and the von Neumann architecture.
3. Explain how an ALU produces its result and the Zero and Carry flags, and how comparison and conditional jumps use them.
4. Describe the instruction cycle (fetch, decode, execute) and trace instructions through it.
5. Explain the role of the control unit and control signals, hardwired versus microprogrammed.
6. Build a four-operation ALU with a zero flag, and trace three instructions on the toy CPU.

## Prerequisites

- Lesson 3: the adder, the multiplexer and the decoder; Lesson 4: registers, the counter and state machines.
- Lesson 2: two's complement and the gates.

## Concept Explanation

### The parts of a CPU

A **central processing unit (CPU)** contains:

- the **ALU** (arithmetic logic unit): adds, subtracts, ANDs, ORs and compares;
- **registers**: very fast storage inside the CPU; general-purpose registers (A and B in our toy CPU) hold data;
- the **program counter (PC)**: a register that holds the *address of the next instruction*;
- the **instruction register (IR)**: holds the instruction currently being executed;
- the **control unit (CU)**: a state machine that decodes the instruction and tells the other parts what to do;
- **buses**: groups of wires that carry addresses, data and control signals between the CPU and **memory**.

In the **von Neumann architecture**, instructions and data share one memory and one set of buses, so a program is just data that the CPU interprets: it is *stored* in memory, and a different program is loaded to make the same hardware do a different job. (The **Harvard architecture** keeps separate memories for code and data, as in many microcontrollers.)

### The ALU and its flags

Besides the result, the ALU outputs **flags**, single bits that describe the result: **Z (Zero)** is 1 if the result is all zeros (a NOR of the result bits); **C (Carry)** is 1 if an addition carried out of the top bit, or a subtraction needed a borrow; real CPUs also have a **Negative** flag (the top bit) and an **Overflow** flag. The control unit uses the flags for decisions. To compare A with B, the CPU *subtracts* B from A and keeps only the flags: **Z = 1 means equal**, and C = 1 means A < B for unsigned numbers. A **conditional jump** such as "jump if zero" loads the program counter with a new address only when the flag condition holds; this is how `if` and `while` exist in hardware.

### Instructions and the instruction set

An **instruction** is a binary word with an **opcode** (which operation) and operands (which registers, which address, which constant). The list of all instructions a CPU understands is its **instruction set architecture (ISA)**; machine language is that binary code, and **assembly language** gives each instruction a readable name. The toy CPU of this course has two 8-bit registers, A and B, a program counter, an instruction register, the flags Z and C, and 16 bytes of data memory. It understands:

| Kind | Instructions |
|---|---|
| **Data movement** | `LOADI R, n` (put a constant in R), `LOAD R, addr`, `STORE R, addr`, `MOV R, S` |
| **Arithmetic and logic** | `ADD R, S`, `SUB R, S`, `AND R, S`, `OR R, S`, `INC R`, `DEC R`, `CMP R, S` |
| **Control flow** | `JMP label`, `JZ label` (jump if Z = 1), `JNZ label` (jump if Z = 0), `HALT` |

### The instruction cycle: fetch, decode, execute

The CPU repeats three phases:

1. **Fetch**: copy the instruction at the address in PC into IR, then increase PC so that it points to the next instruction (IR ← memory[PC]; PC ← PC + 1).
2. **Decode**: the control unit reads the opcode in IR and works out which control signals are needed.
3. **Execute**: carry out the instruction: send operands through the ALU, move data between registers and memory, or (for a jump) load a new address into PC.

Then the cycle starts again, until a HALT. Because PC was already incremented during fetch, ordinary instructions run in sequence, while a **jump** simply overwrites PC, so the next fetch happens somewhere else. The whole cycle is paced by the clock; simple CPUs need several clock ticks per instruction, and modern ones overlap many instructions with **pipelining** (Lesson 8).

### The control unit

The **control unit** turns the decoded opcode into **control signals**: which register to write (RegWrite), which ALU operation (ALUOp), whether to read or write memory (MemRead, MemWrite), whether to load the PC (PCLoad). A **hardwired** control unit is a fixed network of gates and a state machine (fast); a **microprogrammed** one stores the sequence of signals for each instruction in a small ROM (flexible, used for complex instruction sets). Either way, it is the state machine of Lesson 4 with the opcode as an input.

## Key Vocabulary

| Term | Definition |
|---|---|
| **ALU** | The circuit that performs arithmetic and logic operations. |
| **Program counter (PC)** | The register that holds the address of the next instruction. |
| **Instruction register (IR)** | The register that holds the instruction being executed. |
| **Control unit** | The state machine that decodes instructions and sends control signals. |
| **Flag** | A single bit that describes the last result, such as Zero or Carry. |
| **Opcode** | The part of an instruction that says which operation to perform. |
| **Instruction set (ISA)** | The collection of instructions that a CPU understands. |
| **Assembly language** | A readable notation for machine instructions. |
| **Fetch–decode–execute** | The three phases the CPU repeats for every instruction. |
| **Von Neumann architecture** | A design in which instructions and data share one memory. |

## Worked Examples

### Example 1: An ALU with flags

```python
def alu(op, a, b, bits=8):
    mask = (1 << bits) - 1
    raw = {"ADD": a + b, "SUB": a - b, "AND": a & b, "OR": a | b}[op]
    result = raw & mask
    zero = int(result == 0)
    carry = int(raw > mask or raw < 0)           # carry-out of an addition, or a borrow in a subtraction
    return result, zero, carry


print("op   a   b | result  Z  C")
for op, a, b in (("ADD", 200, 100), ("ADD", 20, 30), ("SUB", 5, 5), ("SUB", 3, 5), ("AND", 12, 10), ("OR", 12, 10)):
    result, z, c = alu(op, a, b)
    print(f"{op:<3} {a:>3} {b:>3} | {result:>6}  {z}  {c}")
```

```output
op   a   b | result  Z  C
ADD 200 100 |     44  0  1
ADD  20  30 |     50  0  0
SUB   5   5 |      0  1  0
SUB   3   5 |    254  0  1
AND  12  10 |      8  0  0
OR   12  10 |     14  0  0
```

1. The ALU computes the result and keeps only the lower 8 bits (`& mask`), like an 8-bit register would.
2. 200 + 100 = 300 does not fit: the result is 44 and the Carry flag is 1. 5 − 5 = 0 sets the Zero flag, which is how a CPU tests for equality.
3. 3 − 5 is negative: the result wraps to 254 and C = 1 signals the borrow, so after a comparison "A < B" shows as C = 1.
4. The control unit never looks at the numbers themselves, only at the flags, when it decides whether to jump.

### Example 2: A first program for the toy CPU

```asm
; memory: 12, 30
      LOAD A, 0        ; A = memory[0]
      LOAD B, 1        ; B = memory[1]
      ADD A, B         ; A = A + B, and set the flags
      STORE A, 2       ; memory[2] = A
      HALT
```

```output
A=42 B=30 Z=0 C=0 steps=5
mem: [0]=12 [1]=30 [2]=42
```

1. The first line is a comment that gives the starting contents of the data memory: 12 at address 0 and 30 at address 1.
2. `LOAD A, 0` reads memory cell 0 into register A; `LOAD B, 1` does the same for B. The ALU can only work on registers, so the data must be fetched first.
3. `ADD A, B` leaves 42 in A; `STORE A, 2` writes it to address 2; `HALT` stops the clock.
4. The final state shows A = 42, B = 30, Z = 0 (the result is not zero), C = 0 (no carry), five instructions executed, and the memory now holding 12, 30 and 42.

### Example 3: A loop with a conditional jump

```asm
      LOADI A, 0       ; running total
      LOADI B, 5       ; counter
loop: ADD A, B         ; total = total + counter
      DEC B            ; counter = counter - 1 (sets Z when it reaches 0)
      JNZ loop         ; jump back while the counter is not zero
      HALT
```

```output
A=15 B=0 Z=1 C=0 steps=18
```

1. The label `loop` names the address of the `ADD` instruction. `JNZ loop` loads PC with that address when Z = 0: the cycle jumps backwards, which creates a loop.
2. The loop adds 5, 4, 3, 2 and 1. `DEC B` sets Z when B reaches 0, and then `JNZ` does not jump, so execution falls through to `HALT`.
3. The final A is 15 = 5 + 4 + 3 + 2 + 1. The program ran 18 instructions in all: 2 for the setup, 5 passes of 3 instructions, and `HALT`.
4. Conditional jumps are how `while` and `for` loops exist at the machine level: everything you wrote in C in Course 1 became jumps like this.

## Common Mistakes and Misconceptions

- **Thinking the CPU "understands" programs.** It only executes binary instructions one after another; understanding is the programmer's job.
- **Forgetting that PC points to the *next* instruction** while the current one executes (it was incremented during the fetch).
- **Confusing registers with memory.** Registers are inside the CPU and very fast; memory is outside, slower and much bigger.
- **Expecting `CMP` to change a register.** Comparison only sets the flags.
- **Reading the carry flag as an error.** C = 1 is information: an addition carried out, or a subtraction borrowed. Only your program decides whether it matters.
- **Jumping without setting the flag first.** `JNZ` tests Z from the *last* instruction that changed it; put the `DEC` or `CMP` right before the jump.
- **Forgetting HALT.** The program counter runs off the end of the program and the CPU faults.
- **Believing a CPU runs one instruction per clock tick.** Simple CPUs use several ticks; fast CPUs overlap or run several instructions per tick.

## Guided Hands-On Activity

**Trace the cycle.** Work with your teacher.

1. Open the assembly simulator of this lesson with the program of Example 2. Press **Step** and, for each instruction, write down PC, IR, A, B, Z and C before and after.
2. Change the memory contents to 200 and 100 and run again. What do the carry flag and the final A show?
3. Run Example 3 step by step. How many times does `JNZ` jump, and when is it *not* taken? What are Z and A at the end?
4. Write a program that subtracts memory[1] from memory[0] and stores the result in memory[2], and test it with 9 and 9 (Z = 1) and with 3 and 5 (C = 1).
5. Write a program that stores the value of A in all of the memory cells 0, 1, 2 and 3 with a loop (hint: use register B as the address and `STORE A, [B]`).
6. In CircuitVerse, open your 4-bit ALU from Lesson 3 and add a **Zero flag**: a 4-input NOR gate on the result bits, with an LED. Test it with 5 − 5 (you will add SUB in the project).

## Lesson Project: Mini ALU and Instruction Cycle Trace

### Objective

Extend the **Mini Calculator System** with a **four-operation ALU that has Zero and Carry flags**, and trace **three instructions** of the toy CPU through the fetch–decode–execute cycle, both by hand and with a Python simulator that prints the trace.

### Requirements

- **CircuitVerse build.** Extend your ALU of Lesson 3 into a 4-bit ALU with the operations ADD, SUB, AND and OR (two select switches): SUB uses the XOR-with-Sub trick of Lesson 3 (B inverted, carry-in 1), and a multiplexer selects the result. Add a **Z flag** LED (4-input NOR of the result) and a **C flag** LED (the adder's carry-out; for SUB it is 1 when A ≥ B in this circuit, so state clearly how you interpret it in your notes).
- **Python ALU model.** Write `alu4(op, a, b)` returning (result, Z, C) for 4-bit values, and print a table for the pairs (9, 5), (5, 5), (3, 5) and (15, 1) with all four operations.
- **Python toy CPU.** Write a small class `ToyCPU` that executes the program `LOADI A, 5 / LOADI B, 3 / SUB A, B / HALT` and prints for each instruction the three phases (fetch, decode, execute) and the state afterwards (PC, A, B, Z, C).
- **By hand.** In your portfolio, write a trace table of the program of Example 2 (PC, IR, A, B, Z, C after each of its five instructions) and check it with the simulator.
- Add one paragraph: which flag makes a loop end in Example 3, and why?

### Instructions

1. In CircuitVerse, add the SUB operation and the flags to the ALU of Lesson 3. Test 9 − 5, 5 − 5 and 3 − 5.
2. Write `alu4` in Python and print the operation table.
3. Write `ToyCPU` with `PC`, `A`, `B`, `Z` and `C`, and a `step()` method that prints the fetch, decode and execute lines.
4. Run the three-instruction program and print the state after each step, ending with HALT.
5. Run Example 2 in the assembly simulator of this lesson and fill your hand trace.
6. Compare the Python trace with your circuit's flags for at least four cases.
7. Write the paragraph about the loop condition and finish the portfolio.

### Expected Output

```text
4-bit ALU (result, Z, C); for SUB the carry is 1 when there is no borrow
  a    b  op   result  Z  C
  9    5  ADD  1110   0  0
  9    5  SUB  0100   0  1
  9    5  AND  0001   0  0
  9    5  OR   1101   0  0
  5    5  ADD  1010   0  0
  5    5  SUB  0000   1  1
  5    5  AND  0101   0  0
  5    5  OR   0101   0  0
  3    5  ADD  1000   0  0
  3    5  SUB  1110   0  0
  3    5  AND  0001   0  0
  3    5  OR   0111   0  0
 15    1  ADD  0000   1  1
 15    1  SUB  1110   0  1
 15    1  AND  0001   0  0
 15    1  OR   1111   0  0

Instruction cycle trace of LOADI A, 5 / LOADI B, 3 / SUB A, B / HALT
instruction 1: LOADI A, 5
  fetch   IR <- program[0]; PC <- 1
  decode  load an immediate value into register A
  execute A <- 5
  state   PC=1 A=5 B=0 Z=0 C=0
instruction 2: LOADI B, 3
  fetch   IR <- program[1]; PC <- 2
  decode  load an immediate value into register B
  execute B <- 3
  state   PC=2 A=5 B=3 Z=0 C=0
instruction 3: SUB A, B
  fetch   IR <- program[2]; PC <- 3
  decode  the ALU subtracts the second register from the first
  execute A <- 5 - 3 = 2; Z=0, C=0
  state   PC=3 A=2 B=3 Z=0 C=0
instruction 4: HALT
  fetch   IR <- program[3]; PC <- 4
  decode  stop the clock
  execute the CPU halts
  state   PC=4 A=2 B=3 Z=0 C=0
```

### Hints

1. **Hint 1 (SUB in the ALU).** In the ADD/SUB unit, XOR each bit of B with `Sub` and use `Sub` as the first carry-in; the result is A + (−B).
2. **Hint 2 (the Zero flag).** Z = NOR of the four result bits: it is 1 only when all of them are 0.
3. **Hint 3 (the carry in subtraction).** In this circuit C is the adder's carry-out: 9 − 5 gives C = 1 (no borrow), 3 − 5 gives C = 0 (borrow).
4. **Hint 4 (the CPU class).** Keep the program as a list of tuples, `("LOADI", "A", 5)`, and use PC as the list index.
5. **Hint 5 (fetch).** The fetch phase prints `IR <- program[PC]` and then increases PC by 1 before the execute phase.
6. **Hint 6 (flags).** Set Z and C only for the arithmetic instructions; LOADI and HALT leave them unchanged.

### Success Criteria

- [ ] The CircuitVerse ALU does ADD, SUB, AND and OR, and the Z and C LEDs behave as the Python table says.
- [ ] The Python table and the circuit agree for the four test pairs.
- [ ] The toy CPU prints fetch, decode and execute for every instruction and the correct final registers (A = 2, B = 3).
- [ ] The hand trace of Example 2 matches the simulator.
- [ ] The paragraph names the Zero flag as the loop condition and explains it.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Add the instructions `JZ`, `JNZ`, `JMP` and `CMP` to your `ToyCPU` and run the loop of Example 3 on it, printing one line per executed instruction. Then write an assembly program that multiplies 6 by 7 using repeated addition, test it in the simulator, and count how many instructions it executes. How would a hardware multiplier change that count?

## Lesson Recap

- A **CPU** is an ALU, registers, a program counter, an instruction register and a control unit, connected by buses to memory; in the **von Neumann** design instructions and data share the memory.
- The ALU produces a result and **flags** (Zero, Carry); comparison subtracts and keeps only the flags; **conditional jumps** use them to make decisions.
- Every instruction goes through **fetch** (IR ← memory[PC], PC ← PC + 1), **decode** and **execute**; a jump simply overwrites PC.
- The **control unit** (hardwired or microprogrammed) turns the opcode into control signals: it is the state machine of Lesson 4.
- A **toy CPU** with a handful of instructions already runs loops and stores results: the same ideas scale up to real processors.

## Homework / Extension Mission

Write three assembly programs for the toy CPU, test each in the simulator and write down the final state: (1) find the larger of memory[0] and memory[1] and store it in memory[2] (use `CMP` and a jump); (2) count how many times you can subtract 3 from 20 before the result would go below zero; (3) store the numbers 1 to 5 in memory cells 0 to 4. For each, count the instructions executed. Then write a half-page explanation of how a `for` loop from your Course 1 C programs would be translated into fetch-decode-execute steps.

## Course Project Connection

This lesson turns your **Mini Calculator System**, the course project, into the beginnings of a CPU: the ALU with flags and the register are the datapath, and the instruction cycle is the control. In Lesson 6 you will add a constant ROM (a tiny read-only memory), in Lesson 7 you will write real programs in assembly language for the same toy CPU, and in Lesson 8 you will integrate the switches, the ALU, the register and the display into one tested calculator with a build report.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: "a program is data": the stored-program idea. 15 minutes: parts of the CPU on the board (draw the datapath with students naming each wire). 15 minutes: the cycle, with the assembly simulator stepping through Example 2. 20 minutes: the ALU flags and the project.

**Live demonstrations.** Step the simulator and keep a running trace on the board. Make students predict the next PC before each step; show that a jump changes PC. Build the Zero flag live in CircuitVerse.

**Misconceptions.** "The CPU reads the whole program at once." "Registers and memory are the same." "Flags are errors." "PC holds the current instruction's address" (it holds the next).

**Assessment of the project.** Check the circuit (SUB trick, flags), the Python table, the trace output and the hand trace. Ask each student to explain why `DEC B` must come right before `JNZ`.

**Reference solution `cpu_trace.py`** (run with `python3 cpu_trace.py`):

```python
"""Mini ALU and Instruction Cycle Trace: a 4-bit ALU model and a tiny toy CPU that prints the cycle."""


def alu4(op, a, b):
    raw = {"ADD": a + b, "SUB": a + ((~b) & 15) + 1, "AND": a & b, "OR": a | b}[op]
    result = raw & 15
    carry = int(raw > 15) if op in ("ADD", "SUB") else 0
    return result, int(result == 0), carry


print("4-bit ALU (result, Z, C); for SUB the carry is 1 when there is no borrow")
print("  a    b  op   result  Z  C")
for a, b in ((9, 5), (5, 5), (3, 5), (15, 1)):
    for op in ("ADD", "SUB", "AND", "OR"):
        result, z, c = alu4(op, a, b)
        print(f"{a:>3} {b:>4}  {op:<3}  {result:04b}   {z}  {c}")


class ToyCPU:
    def __init__(self, program):
        self.program = program
        self.pc, self.a, self.b, self.z, self.c = 0, 0, 0, 0, 0
        self.halted = False

    def reg(self, name):
        return self.a if name == "A" else self.b

    def set_reg(self, name, value):
        if name == "A":
            self.a = value & 255
        else:
            self.b = value & 255

    def step(self, number):
        op, *args = self.program[self.pc]
        print(f"instruction {number}: {op} {', '.join(str(x) for x in args)}".rstrip().rstrip(","))
        print(f"  fetch   IR <- program[{self.pc}]; PC <- {self.pc + 1}")
        self.pc += 1
        if op == "LOADI":
            print(f"  decode  load an immediate value into register {args[0]}")
            self.set_reg(args[0], args[1])
            print(f"  execute {args[0]} <- {args[1]}")
        elif op == "SUB":
            x, y = self.reg(args[0]), self.reg(args[1])
            print("  decode  the ALU subtracts the second register from the first")
            self.set_reg(args[0], x - y)
            self.z, self.c = int((x - y) & 255 == 0), int(x < y)
            print(f"  execute {args[0]} <- {x} - {y} = {(x - y) & 255}; Z={self.z}, C={self.c}")
        elif op == "HALT":
            print("  decode  stop the clock")
            self.halted = True
            print("  execute the CPU halts")
        print(f"  state   PC={self.pc} A={self.a} B={self.b} Z={self.z} C={self.c}")


print("\nInstruction cycle trace of LOADI A, 5 / LOADI B, 3 / SUB A, B / HALT")
cpu = ToyCPU([("LOADI", "A", 5), ("LOADI", "B", 3), ("SUB", "A", "B"), ("HALT",)])
number = 1
while not cpu.halted:
    cpu.step(number)
    number += 1
```

```output
4-bit ALU (result, Z, C); for SUB the carry is 1 when there is no borrow
  a    b  op   result  Z  C
  9    5  ADD  1110   0  0
  9    5  SUB  0100   0  1
  9    5  AND  0001   0  0
  9    5  OR   1101   0  0
  5    5  ADD  1010   0  0
  5    5  SUB  0000   1  1
  5    5  AND  0101   0  0
  5    5  OR   0101   0  0
  3    5  ADD  1000   0  0
  3    5  SUB  1110   0  0
  3    5  AND  0001   0  0
  3    5  OR   0111   0  0
 15    1  ADD  0000   1  1
 15    1  SUB  1110   0  1
 15    1  AND  0001   0  0
 15    1  OR   1111   0  0

Instruction cycle trace of LOADI A, 5 / LOADI B, 3 / SUB A, B / HALT
instruction 1: LOADI A, 5
  fetch   IR <- program[0]; PC <- 1
  decode  load an immediate value into register A
  execute A <- 5
  state   PC=1 A=5 B=0 Z=0 C=0
instruction 2: LOADI B, 3
  fetch   IR <- program[1]; PC <- 2
  decode  load an immediate value into register B
  execute B <- 3
  state   PC=2 A=5 B=3 Z=0 C=0
instruction 3: SUB A, B
  fetch   IR <- program[2]; PC <- 3
  decode  the ALU subtracts the second register from the first
  execute A <- 5 - 3 = 2; Z=0, C=0
  state   PC=3 A=2 B=3 Z=0 C=0
instruction 4: HALT
  fetch   IR <- program[3]; PC <- 4
  decode  stop the clock
  execute the CPU halts
  state   PC=4 A=2 B=3 Z=0 C=0
```

**Differentiation.** Support: provide the CircuitVerse ALU from Lesson 3 with the SUB control already wired, and the first two instructions of `ToyCPU`. Stretch: the jump instructions, a multiplier program, and a Python assembler that converts text into the instruction list.

**Discussion questions (not for the student quiz).** Why does the program counter increase *during* the fetch? What would happen if a program wrote over its own instructions in memory?
