# Lumexa Mission Log: How Computers Work: Digital Logic & Computer Architecture

**Course/Path:** How Computers Work: Digital Logic & Computer Architecture
**Lesson:** 08 of 08
**Title:** Computer Organisation, Basic Pipelining and Digital Circuit Simulation
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** CircuitVerse · Python (simulation and testing)

---

## Mission Brief

You have now built the parts of a computer one by one: switches, gates, an adder, an ALU, a register, a counter and a small ROM, and you have written programs for the CPU that they model. This last lesson does three things. First it zooms **out**, to see how a whole computer is organised (processor, memory, buses and input/output) and why a computer with a higher clock rate is not always faster. Then it explains **pipelining**, the assembly-line trick that lets a processor work on several instructions at once. Finally it zooms **in** again to the craft of **simulating and testing** digital circuits, and uses it to integrate all the pieces into the **Mini Calculator System**, the course project, with a build report that an engineer would be proud to hand over.

## Learning Objectives

1. Describe the organisation of a computer (processor, memory, buses, input/output) and explain polling, interrupts and DMA.
2. Use the CPU performance equation to compare processors, and explain why clock rate alone does not measure speed.
3. Explain how a five-stage pipeline overlaps instructions, and why it raises throughput but not the time of one instruction.
4. Recognise structural, data and control hazards and the usual remedies: stalls, forwarding and branch prediction.
5. Test a digital design with a simulator, using exhaustive and targeted tests, a software golden model and a timing estimate.
6. Integrate the Mini Calculator System, test it against a model and write its build report.

## Prerequisites

- Lessons 3 to 5: the adder, the ALU with flags, the accumulator register and the instruction cycle (the project integrates them).
- Lesson 6: memory hierarchy; Lesson 7: assembly language and the toy CPU.
- Python from the earlier courses (functions, loops, dictionaries).

## Concept Explanation

### Computer organisation: processor, memory, buses and input/output

A computer has five classic parts: **input**, **output**, **memory**, a **datapath** (the ALU and registers that do the work) and a **control** unit (which sequences the work). The datapath and the control together are the **processor**. The parts are joined by **buses**, bundles of wires with three jobs: the **address bus** says *where* (which memory cell or device), the **data bus** carries the *value*, and the **control bus** carries signals such as read, write, clock and interrupt.

Input and output devices (keyboard, display, disk, network card) are connected through **controllers**. A controller has a few registers, and in **memory-mapped I/O** those registers have addresses just like memory cells: the program talks to a device with ordinary `LOAD` and `STORE` instructions. There are three ways to move data. With **polling** the CPU asks the device again and again whether it is ready: simple, but it wastes time. With **interrupts** the device sends a signal when it is ready: the CPU saves what it was doing, runs a short **interrupt handler** and then resumes. With **DMA** (direct memory access) a controller copies a whole block between the device and memory without involving the CPU for each byte, and interrupts the CPU only when it is finished. When you press a key, the keyboard controller raises an interrupt, a handler stores the key code, and your program reads it a moment later.

### Measuring performance

The **CPU performance equation** says: **CPU time = instruction count × CPI × clock period**, or, equivalently, instruction count × CPI ÷ clock rate. **CPI** is the average number of clock cycles per instruction (its inverse is **IPC**, instructions per cycle). There are three levers: fewer instructions (a better algorithm or compiler), a lower CPI (pipelining, caches) and a faster clock (limited by heat and power). A processor with a higher clock rate but a worse CPI can be slower, which is why advertised gigahertz alone mean little. More cores help only the work that can be shared: **Amdahl's law** says that if a fraction p of a program can run in parallel on n cores, the speed-up is 1 ÷ ((1 − p) + p ÷ n), and the serial part (1 − p) sets a limit that no number of cores can beat.

### Pipelining: an assembly line for instructions

Washing, drying and folding clothes for four people one after the other is slow; starting the second wash while the first load dries is faster. A **pipeline** does this with instructions. A classic five-stage pipeline splits the instruction cycle into **IF** (fetch), **ID** (decode and read the registers), **EX** (execute in the ALU), **MEM** (access memory) and **WB** (write the result back). Pipeline registers between the stages hold each instruction's partial results, so five instructions are in flight at the same time, each in a different stage.

Without a pipeline, *n* instructions of *k* stages take *n × k* cycles. With an ideal pipeline they take **k + n − 1** cycles: the first instruction needs *k* cycles to emerge and every later one follows one cycle behind. For large *n* the speed-up approaches *k*. Notice what pipelining does **not** do: one instruction still takes five cycles to travel through; the **throughput** (instructions finished per cycle) improves, not the **latency**. A pipeline also shortens the clock period, because each stage does only part of the work, and the clock must fit the slowest stage. Real processors use 10 to 20 stages and even start several instructions per cycle (**superscalar** designs).

### Pipeline hazards

An ideal pipeline never has to wait, but real programs cause **hazards**: situations in which the next instruction cannot proceed in its normal cycle. A **structural hazard** means two instructions need the same hardware at the same time (for example one memory for both instructions and data). A **data hazard** means an instruction needs a result that an earlier instruction has not produced yet (`ADD R3, R1, R4` right after a `LW R1, 0(R2)`). A **control hazard** appears at a branch: the processor does not yet know which instruction comes next. The remedies are a **stall** (insert a "bubble" and wait), **forwarding** or **bypassing** (send a result directly from the ALU or the memory stage to the instruction that needs it, without waiting for the write-back), a smarter **instruction order** chosen by the compiler, and **branch prediction** (guess the direction of the branch and continue; if the guess was wrong, throw the work away and start again, which costs several cycles).

### Simulating and testing digital circuits

Engineers simulate a design long before they build it. A **simulator** models gates and signals: it evaluates the **netlist** (the list of gates and the wires between them) for given inputs, and, if gate delays are included, shows *when* each output settles. Three habits make testing trustworthy. First, a **golden model**: a short program (in Python, say) that computes what the circuit *should* output for every test, so that the expected values are never worked out by guessing. Second, **exhaustive testing** when it is possible: a 4-bit adder has only 2⁸ = 256 input pairs, so every one can be checked; a 32-bit adder has 2⁶⁴, so it needs **targeted tests** of the corner cases (zero, the maximum value, the carry boundaries, the overflow) plus random ones. Third, **timing analysis**: the longest chain of gates between two registers is the **critical path**, and the clock period must be at least as long as it.

Professional hardware is written in a **hardware description language** such as Verilog and simulated before it becomes a chip or an FPGA configuration. This is a full adder in Verilog; compare it with the gate diagram of Lesson 3:

```verilog
module full_adder(input a, input b, input cin, output sum, output cout);
  assign sum  = a ^ b ^ cin;
  assign cout = (a & b) | (cin & (a ^ b));
endmodule
```

## Key Vocabulary

| Term | Definition |
|---|---|
| **Bus** | A set of wires that carries addresses, data or control signals between parts of a computer. |
| **Memory-mapped I/O** | Device registers that have memory addresses, so ordinary load and store instructions reach them. |
| **Interrupt** | A signal from a device that makes the CPU run a handler and then resume. |
| **DMA** | Direct memory access: a controller moves a block of data to or from memory without the CPU. |
| **CPI** | Cycles per instruction: the average number of clock cycles one instruction takes. |
| **Pipeline** | A design that overlaps the stages of several instructions, like an assembly line. |
| **Hazard** | A situation in which the next instruction cannot proceed in its normal pipeline cycle. |
| **Forwarding** | Sending a result straight to the stage that needs it, before it is written back. |
| **Netlist** | The list of gates and wires that describes a digital circuit. |
| **Golden model** | A trusted software model that predicts the correct outputs for every test. |
| **Critical path** | The slowest chain of gates between two registers; it sets the shortest possible clock period. |

## Worked Examples

### Example 1: Comparing processors

```python
def cpu_time(instructions, cpi, clock_hz):
    """The processor performance equation: time = instructions x CPI / clock rate."""
    return instructions * cpi / clock_hz


def amdahl(parallel_fraction, cores):
    """Amdahl's law: the serial part limits the speed-up that more cores can give."""
    return 1 / ((1 - parallel_fraction) + parallel_fraction / cores)


program = 2_000_000_000                        # two billion instructions
machines = (("X: 3.0 GHz, CPI 2.0", 3.0e9, 2.0), ("Y: 2.0 GHz, CPI 1.0", 2.0e9, 1.0), ("Z: 4.0 GHz, CPI 3.0", 4.0e9, 3.0))
base = cpu_time(program, machines[0][2], machines[0][1])
print("machine               time   speed-up over X")
for name, clock, cpi in machines:
    seconds = cpu_time(program, cpi, clock)
    print(f"{name:<20} {seconds:>5.2f} s  {base / seconds:>5.2f}x")

print("\ncores  speed-up (80% of the work can be shared)")
for cores in (1, 2, 4, 8, 64):
    print(f"{cores:>5}  {amdahl(0.8, cores):>5.2f}x")
print("limit with endless cores:", round(amdahl(0.8, 10**9), 2), "x")
```

```output
machine               time   speed-up over X
X: 3.0 GHz, CPI 2.0   1.33 s   1.00x
Y: 2.0 GHz, CPI 1.0   1.00 s   1.33x
Z: 4.0 GHz, CPI 3.0   1.50 s   0.89x

cores  speed-up (80% of the work can be shared)
    1   1.00x
    2   1.67x
    4   2.50x
    8   3.33x
   64   4.71x
limit with endless cores: 5.0 x
```

1. The same program of two billion instructions takes 1.33 s on X, 1.00 s on Y and 1.50 s on Z.
2. Machine Z has the fastest clock (4 GHz) but the worst CPI (3.0), so it is the *slowest*; machine Y, with the slowest clock, is the fastest. Clock rate alone does not tell you which computer is quicker.
3. With 80% of the work shareable, 2 cores give 1.67 times the speed, 8 cores 3.33 times and 64 cores only 4.71 times: the serial 20% caps the speed-up at 5, however many cores you add.
4. When someone quotes one number as the speed of a computer, ask which part of the equation it measures.

### Example 2: A pipeline with hazards

```python
PROGRAM = [
    ("LW  R1, 0(R2)", "R1", ["R2"], True),
    ("ADD R3, R1, R4", "R3", ["R1", "R4"], False),
    ("SUB R5, R3, R6", "R5", ["R3", "R6"], False),
    ("AND R7, R5, R1", "R7", ["R5", "R1"], False),
    ("OR  R8, R2, R6", "R8", ["R2", "R6"], False),
]


def schedule(program, forwarding):
    """Five stages: IF ID EX MEM WB. Returns [(instruction, stall cycles, cycle of WB)]."""
    timeline, available, delay = [], {}, 0
    for i, (text, dest, sources, is_load) in enumerate(program):
        fetch = i + 1 + delay                     # everything behind a stall moves later
        ex = fetch + 2                            # IF, ID, then EX
        needed = max((available[r] + 1 for r in sources if r in available), default=0)
        stall = max(0, needed - ex)               # wait until the operand exists
        ex += stall
        delay += stall
        if dest:                                  # the cycle after which the result can be used
            available[dest] = (ex + 1 if is_load else ex) if forwarding else ex + 2
        timeline.append((text, stall, ex + 2))
    return timeline


n = len(PROGRAM)
print(f"{n} instructions, 5 stages")
print(f"  no pipeline:    {5 * n} cycles")
print(f"  ideal pipeline: {5 + n - 1} cycles")
for forwarding in (False, True):
    timeline = schedule(PROGRAM, forwarding)
    total = timeline[-1][2]
    stalls = sum(stall for _, stall, _ in timeline)
    print(f"  with hazards, forwarding {'on' if forwarding else 'off'}: {total} cycles, {stalls} stall cycles, CPI {total / n:.2f}")
    for text, stall, done in timeline:
        print(f"    {text:<16} stalls {stall}   finishes in cycle {done}")
```

```output
5 instructions, 5 stages
  no pipeline:    25 cycles
  ideal pipeline: 9 cycles
  with hazards, forwarding off: 15 cycles, 6 stall cycles, CPI 3.00
    LW  R1, 0(R2)    stalls 0   finishes in cycle 5
    ADD R3, R1, R4   stalls 2   finishes in cycle 8
    SUB R5, R3, R6   stalls 2   finishes in cycle 11
    AND R7, R5, R1   stalls 2   finishes in cycle 14
    OR  R8, R2, R6   stalls 0   finishes in cycle 15
  with hazards, forwarding on: 10 cycles, 1 stall cycles, CPI 2.00
    LW  R1, 0(R2)    stalls 0   finishes in cycle 5
    ADD R3, R1, R4   stalls 1   finishes in cycle 7
    SUB R5, R3, R6   stalls 0   finishes in cycle 8
    AND R7, R5, R1   stalls 0   finishes in cycle 9
    OR  R8, R2, R6   stalls 0   finishes in cycle 10
```

1. Without a pipeline the five instructions need 5 × 5 = 25 cycles; an ideal pipeline needs 5 + 5 − 1 = 9.
2. Each instruction of this program uses a result of an earlier one. Without forwarding, an instruction must wait until the result has been written back to the register file, which costs 2 stall cycles each time: 15 cycles and a CPI of 3.00.
3. With forwarding the result goes straight from the ALU to the next instruction, so only the load-use pair costs a cycle: the value that `LW` reads from memory is not available until the end of the MEM stage, so `ADD` must wait one cycle. The total drops to 10 cycles.
4. The two timing diagrams below show the same schedules, cycle by cycle. A compiler can remove the remaining stall by moving an independent instruction (such as the `OR`) between the `LW` and the `ADD`.

### Example 3: Simulating and timing a circuit

```python
GATES = {"AND": lambda a, b: a & b, "OR": lambda a, b: a | b, "XOR": lambda a, b: a ^ b}
DELAY_NS = 1.0                                 # every gate takes the same time, to keep the model simple


def full_adder(n, a, b, cin):
    """Five gates: (output, kind, input 1, input 2)."""
    return [
        (f"x{n}", "XOR", a, b),
        (f"s{n}", "XOR", f"x{n}", cin),
        (f"p{n}", "AND", a, b),
        (f"q{n}", "AND", f"x{n}", cin),
        (f"c{n}", "OR", f"p{n}", f"q{n}"),
    ]


def ripple_adder(bits):
    netlist, carry = [], "zero"
    for n in range(bits):
        netlist += full_adder(n, f"a{n}", f"b{n}", carry)
        carry = f"c{n}"
    return netlist


def simulate(netlist, inputs):
    """Evaluate the gates in order: the value of every signal and the time at which it settles."""
    value = {**inputs, "zero": 0}
    settle = {name: 0.0 for name in value}
    for out, kind, in1, in2 in netlist:
        value[out] = GATES[kind](value[in1], value[in2])
        settle[out] = max(settle[in1], settle[in2]) + DELAY_NS
    return value, settle


adder = ripple_adder(4)
print(f"4-bit ripple-carry adder: {len(adder)} gates")

failures = 0
for a in range(16):
    for b in range(16):
        inputs = {**{f"a{n}": a >> n & 1 for n in range(4)}, **{f"b{n}": b >> n & 1 for n in range(4)}}
        value, settle = simulate(adder, inputs)
        total = sum(value[f"s{n}"] << n for n in range(4)) + (value["c3"] << 4)
        failures += total != a + b
print(f"exhaustive test: {16 * 16} input combinations, {failures} failures")

print("settling time of the outputs (ns):")
for name in ("s0", "s1", "s2", "s3", "c3"):
    print(f"  {name}: {settle[name]:.0f}")
slowest = max(settle[name] for name in ("s0", "s1", "s2", "s3", "c3"))
print(f"critical path: {slowest:.0f} ns, so the clock period must be at least that long: at most {1000 / slowest:.0f} MHz")
```

```output
4-bit ripple-carry adder: 20 gates
exhaustive test: 256 input combinations, 0 failures
settling time of the outputs (ns):
  s0: 2
  s1: 4
  s2: 6
  s3: 8
  c3: 9
critical path: 9 ns, so the clock period must be at least that long: at most 111 MHz
```

1. The adder is only a **netlist**: a list of gates in the order in which they can be evaluated, each with its kind and two inputs. `simulate` computes every signal and also the time at which it settles (the latest input time plus one gate delay).
2. The exhaustive test applies all 16 × 16 = 256 pairs and compares the circuit with Python's own addition. It finds no failures. A single wrong gate (change an `XOR` to an `OR` and run it) makes many of the 256 tests fail at once.
3. The settling times show the **ripple** effect: bit 0 is ready after 2 ns, but each higher bit has to wait for the carry of the bit below, so the carry-out needs 9 ns. This 9 ns chain is the critical path.
4. The clock period must be longer than the critical path, so this adder limits a 1 ns-per-gate design to about 111 MHz. Faster adders (carry-lookahead) and pipelining shorten the path per clock cycle.

## Common Mistakes and Misconceptions

- **Believing that a higher clock rate always means a faster computer.** The equation has three factors: instruction count, CPI and clock period (Example 1).
- **Thinking that pipelining makes a single instruction finish sooner.** It raises throughput; the latency of one instruction stays about the same.
- **Forgetting the ramp-up of a pipeline.** *n* instructions need *k + n − 1* cycles, not *n*.
- **Treating hazards as bugs.** They are normal and the hardware handles them with stalls and forwarding; a program never fails because of a hazard, it only runs slower.
- **Testing only the easy cases.** Always include zero, the largest value, the carry boundary and the overflow (for a 4-bit adder: 0 + 0, 15 + 1, 15 + 15).
- **Trusting a circuit because it worked once.** A table of expected values from a golden model is evidence; one lucky try is not.
- **Ignoring timing.** A circuit can be logically perfect and still be too slow for its clock.
- **Treating the simulator as the real hardware.** Ideal gates in a simulator hide glitches, heat and wire delays; real designs are tested again after they are built.

## Guided Hands-On Activity

**Measure, predict and test.** Work with your teacher.

1. In Example 1 add a machine W with a 5.0 GHz clock and a CPI of 4.0. Is it faster than X? Compute its time by hand first.
2. In Example 1 change the shareable fraction to 0.95. Predict the speed-up for 64 cores, then run it.
3. In Example 2 move the `OR` instruction between the `LW` and the `ADD`. Predict the number of cycles with forwarding, then run it. What did the reordering achieve?
4. In Example 2 append one more independent instruction at the end of the program. How many cycles does the program need with and without forwarding?
5. In Example 3 change the adder to 8 bits and the test loops to 256 × 256 (remember to compare with `c7`). How long is the critical path now?
6. In Example 3 replace one `XOR` in `full_adder` with an `OR`. How many of the 256 tests fail?
7. In CircuitVerse open your Mini Calculator project, set the switches for the first test of the project and read the display; then press the clock and compare.

## Lesson Project: Mini Calculator System: Build Report

### Objective

Integrate everything you built in this course into one **Mini Calculator System** in CircuitVerse, test it against a Python **golden model** with a ten-step test plan, estimate its timing, and write the **build report** that documents the design, the tests and what you learned.

### Requirements

- **CircuitVerse integration.** One project that contains: (1) a four-switch input panel for B with a hexadecimal display (Lesson 1); (2) the four-bit ALU of Lessons 3 and 5 with the operations ADD, SUB, AND and OR chosen by two select switches, and the Z and C flag LEDs; (3) the four-bit accumulator of Lesson 4, with a Load switch and a clock button, whose output feeds input A of the ALU, so that each clock pulse with Load = 1 performs **ACC ← ACC op B**; (4) a hexadecimal display for the accumulator; (5) a label on every part. The constant ROM of Lesson 6 may be added as an extra.
- **Python golden model.** A class `MiniCalculator` with `clock(op, b, load)` that returns the accumulator and the flags, using the ALU of Lesson 5 (`alu4`; the carry for SUB is 1 when there is no borrow).
- **Test plan.** Ten steps, starting from ACC = 0: ADD 9, ADD 8, SUB 1, SUB 1, AND 10, OR 5, AND 0, ADD 15, ADD 1, OR 6. For each step the report lists the expected ACC (hexadecimal), Z and C, the values you observed in CircuitVerse and PASS or FAIL.
- **Timing estimate.** Using the ripple-carry critical path of Example 3 (9 gate delays), add 1 delay for the SUB inverter, 2 for the result multiplexer and 1 for the register set-up, and compute the shortest clock period and the highest clock rate for a single stage; then for a design split in two pipeline stages (adder | multiplexer and register).
- **Build report** (two pages): (1) goal and specification; (2) block diagram; (3) a table of the parts and the lesson each one came from; (4) the test results; (5) the timing estimate; (6) limitations and ideas for improvement; (7) a short reflection. Include the link to the CircuitVerse project and three screenshots.

### Instructions

1. Open your CircuitVerse project and bring together the panel, the ALU with flags and the accumulator. Check that the output of the accumulator feeds input A of the ALU.
2. Add the Load switch, the clock button, the two hexadecimal displays and the two flag LEDs. Label everything.
3. Write the Python class `MiniCalculator` and the list of ten test steps.
4. Run the ten steps in CircuitVerse: set B and the operation, set Load = 1, press the clock once and write down the accumulator, Z and C.
5. Type your observed values into the `OBSERVED` list of the program, run it and read the PASS and FAIL lines. Find the cause of every FAIL.
6. Compute the timing estimate for one stage and for two stages.
7. Draw the block diagram and write the report, using the checklist below.

### Expected Output

```text
Mini Calculator System: test report
step  op   B   expected         observed         result
   1  ADD  9   9 Z=0 C=0      9 Z=0 C=0      PASS
   2  ADD  8   1 Z=0 C=1      1 Z=0 C=1      PASS
   3  SUB  1   0 Z=1 C=1      0 Z=1 C=1      PASS
   4  SUB  1   F Z=0 C=0      F Z=0 C=0      PASS
   5  AND 10   A Z=0 C=0      A Z=0 C=0      PASS
   6  OR   5   F Z=0 C=0      F Z=0 C=0      PASS
   7  AND  0   0 Z=1 C=0      0 Z=1 C=0      PASS
   8  ADD 15   F Z=0 C=0      F Z=0 C=0      PASS
   9  ADD  1   0 Z=1 C=1      0 Z=1 C=1      PASS
  10  OR   6   6 Z=0 C=0      6 Z=0 C=0      PASS
10 of 10 tests passed

Timing estimate (1 ns per gate delay)
  one stage:  13 ns -> 76.9 MHz
  two stages: 10 ns -> 100.0 MHz, but a result needs 2 clock cycles
```

### Hints

1. **Hint 1 (wiring).** The register must feed input A of the ALU and be loaded from its result: a loop through a flip-flop is fine, because the clock edge breaks the loop.
2. **Hint 2 (the first step).** ACC starts at 0, so ADD 9 gives 9. To change B, use the four switches; to change the operation use the two select switches (00 ADD, 01 SUB, 10 AND, 11 OR).
3. **Hint 3 (the carry for SUB).** The circuit's carry LED is 1 when there is *no* borrow. The test SUB 1 from 1 gives 0 with Z = 1 and C = 1; SUB 1 from 0 gives F with C = 0.
4. **Hint 4 (the clock).** One press of the clock button must change the accumulator only once. Set Load = 0 and press the clock to check that the register holds its value.
5. **Hint 5 (the golden model).** The model must contain no logic of its own beyond `alu4`; it exists to predict the circuit, not to copy its mistakes.
6. **Hint 6 (timing).** One stage: 1 + 9 + 2 + 1 = 13 gate delays. Two stages: the slower one has 1 + 9 = 10 delays. The clock rate is 1000 ÷ period in ns, in MHz.
7. **Hint 7 (a FAIL).** Change one value in `OBSERVED` on purpose to see how a failing test is reported. A test that cannot fail proves nothing.

### Success Criteria

- [ ] The CircuitVerse project contains the panel, the ALU with Z and C, the accumulator with Load and clock, and two displays, all labelled.
- [ ] All ten test steps pass: the circuit and the golden model agree on ACC, Z and C for every step.
- [ ] The timing estimate is correct: 13 ns and about 76.9 MHz for one stage, 10 ns and 100 MHz for two stages.
- [ ] The report has all seven sections, a block diagram, the table of parts and the test results.
- [ ] The report explains in its own words why a pipelined version has a higher clock rate but takes two cycles per result.
- [ ] The project link and three screenshots are included.

### Extension Challenge

Add the **constant ROM** of Lesson 6 to the calculator: a button that replaces ACC with the square of the number on the B switches. Then extend the Python golden model with this operation and add three tests. Finally, build the two-stage version in CircuitVerse (a register between the adder and the multiplexer) and show with a timing diagram that the result appears one clock cycle later.

## Lesson Recap

- A computer is **input, output, memory, datapath and control** joined by **buses**; devices use **polling**, **interrupts** or **DMA**.
- **CPU time = instruction count × CPI × clock period**: clock rate alone does not decide speed, and **Amdahl's law** limits what more cores can do.
- A **pipeline** overlaps instructions: *n* instructions need *k + n − 1* cycles. It raises throughput, not latency, and it must handle **structural, data and control hazards** with stalls, forwarding and prediction.
- Digital designs are **simulated and tested** with exhaustive and targeted tests, a **golden model** and a timing analysis whose result is the **critical path**.
- The **Mini Calculator System** brings the gates, adder, ALU, register and display together, and the **build report** records what it does and how you know it works.

## Homework / Extension Mission

Write a one-page "letter to a friend" that explains, without jargon, why a 4 GHz phone processor can be slower than a 3 GHz laptop processor, using the performance equation, and why a pipeline does not make one instruction finish faster. Then, with the golden model of the project, invent three additional tests that look for corner cases of the calculator (for example SUB 0 from 0 and AND 15) and predict their results. Finally, use the method of Example 3 to calculate how long the critical path of an 8-bit ripple-carry adder is, and explain why that matters for the clock rate.

## Course Project Connection

This lesson **completes the course project**, the Mini Calculator System. Lesson 1 gave it a four-switch input panel and a display, Lesson 2 the gates, Lesson 3 the adder and the operation select, Lesson 4 the accumulator register, Lesson 5 the ALU with flags and the instruction cycle, Lesson 6 the constant ROM and the memory hierarchy, and Lesson 7 the assembly language for the CPU that it models. Here you integrate, test and document it. The course assessment that follows checks everything you have learned in this course, and the ideas return in the next course on operating systems and networking.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: computer organisation (draw the five parts and the buses; follow one key press through the controller, the interrupt and the handler). 10 minutes: performance (Example 1: ask which machine is fastest *before* running it). 10 minutes: pipelining (students act as the five stages for four "instructions" on the board). 30 minutes: integration, testing and the build report (pair work).

**Live demonstrations.** Show the CPU time equation with two real machines from a spec sheet. Draw the pipeline diagram on the board and make a data hazard appear. Run Example 3 and then break one gate to show the exhaustive test catching it. Show the Mini Calculator and step through the test plan together, reading the flags aloud.

**Misconceptions.** "More gigahertz always means faster." "Pipelining makes each instruction faster." "Hazards are errors in the program." "If it worked once, it is correct." "A simulation proves the real chip works."

**Assessment of the project.** Mark the report against the criteria: specification and block diagram (10), the CircuitVerse project (20), the ten tests with a correct expected column and honest observed values (30), the timing estimate (15), the table of parts and limitations (10), the reflection (15). Check that every FAIL, if any, is explained and fixed rather than hidden.

**Reference solution `calculator_model.py`** (run with `python3 calculator_model.py`; the `OBSERVED` list holds what a correct circuit shows):

```python
"""Mini Calculator System: golden model, test report and timing estimate."""

MASK = 15


def alu4(op, a, b):
    raw = {"ADD": a + b, "SUB": a + ((~b) & MASK) + 1, "AND": a & b, "OR": a | b}[op]
    result = raw & MASK
    carry = int(raw > MASK) if op in ("ADD", "SUB") else 0       # for SUB: 1 means "no borrow"
    return result, int(result == 0), carry


class MiniCalculator:
    """ACC <- ACC op B on every clock pulse while Load = 1."""

    def __init__(self):
        self.acc, self.z, self.c = 0, 1, 0

    def clock(self, op, b, load=1):
        if load:
            self.acc, self.z, self.c = alu4(op, self.acc, b)
        return self.acc, self.z, self.c


TEST_PLAN = [("ADD", 9), ("ADD", 8), ("SUB", 1), ("SUB", 1), ("AND", 10), ("OR", 5), ("AND", 0), ("ADD", 15), ("ADD", 1), ("OR", 6)]
# What your CircuitVerse build shows after each clock pulse: (ACC as one hexadecimal digit, Z, C).
OBSERVED = [("9", 0, 0), ("1", 0, 1), ("0", 1, 1), ("F", 0, 0), ("A", 0, 0), ("F", 0, 0), ("0", 1, 0), ("F", 0, 0), ("0", 1, 1), ("6", 0, 0)]

calculator = MiniCalculator()
print("Mini Calculator System: test report")
print("step  op   B   expected         observed         result")
passed = 0
for step, ((op, b), seen) in enumerate(zip(TEST_PLAN, OBSERVED), start=1):
    acc, z, c = calculator.clock(op, b)
    expected = (f"{acc:X}", z, c)
    ok = seen == expected
    passed += ok
    print(f"{step:>4}  {op:<3} {b:>2}   {expected[0]} Z={expected[1]} C={expected[2]}      {seen[0]} Z={seen[1]} C={seen[2]}      {'PASS' if ok else 'FAIL'}")
print(f"{passed} of {len(TEST_PLAN)} tests passed")


def clock_mhz(stage_delays_ns):
    """The clock period is set by the slowest stage."""
    return 1000 / max(stage_delays_ns)


one_stage = [1 + 9 + 2 + 1]                    # SUB inverter + adder carry chain + result multiplexer + register set-up
two_stages = [1 + 9, 2 + 1]                    # stage 1: inverter and adder; stage 2: multiplexer and register
print("\nTiming estimate (1 ns per gate delay)")
print(f"  one stage:  {max(one_stage)} ns -> {clock_mhz(one_stage):.1f} MHz")
print(f"  two stages: {max(two_stages)} ns -> {clock_mhz(two_stages):.1f} MHz, but a result needs 2 clock cycles")
```

```output
Mini Calculator System: test report
step  op   B   expected         observed         result
   1  ADD  9   9 Z=0 C=0      9 Z=0 C=0      PASS
   2  ADD  8   1 Z=0 C=1      1 Z=0 C=1      PASS
   3  SUB  1   0 Z=1 C=1      0 Z=1 C=1      PASS
   4  SUB  1   F Z=0 C=0      F Z=0 C=0      PASS
   5  AND 10   A Z=0 C=0      A Z=0 C=0      PASS
   6  OR   5   F Z=0 C=0      F Z=0 C=0      PASS
   7  AND  0   0 Z=1 C=0      0 Z=1 C=0      PASS
   8  ADD 15   F Z=0 C=0      F Z=0 C=0      PASS
   9  ADD  1   0 Z=1 C=1      0 Z=1 C=1      PASS
  10  OR   6   6 Z=0 C=0      6 Z=0 C=0      PASS
10 of 10 tests passed

Timing estimate (1 ns per gate delay)
  one stage:  13 ns -> 76.9 MHz
  two stages: 10 ns -> 100.0 MHz, but a result needs 2 clock cycles
```

**Differentiation.** Support: give the ten-step table with the expected column filled in and let students only run the circuit and record the observed values. Stretch: the ROM extension, the two-stage circuit and a Python netlist of the whole calculator tested against the golden model.

**Discussion questions (not for the student quiz).** Why do processors not simply use a 20 GHz clock? What would a branch misprediction cost in a 20-stage pipeline, and why does that make good predictors valuable? How could a hardware designer be *sure* that a 64-bit adder works if exhaustive testing is impossible?
