# Lumexa Mission Log: How Computers Work: Digital Logic & Computer Architecture

**Course/Path:** How Computers Work: Digital Logic & Computer Architecture
**Lesson:** 07 of 08
**Title:** Machine Instructions, Assembly Language and Addressing Modes
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Assembly simulator · Python (with CircuitVerse)

---

## Mission Brief

Every program you have ever used, a game, a browser or a Python script, finally becomes a long list of small binary numbers that the CPU fetches, decodes and executes one after another. Those numbers are **machine instructions**. Nobody enjoys writing them in binary, so people invented **assembly language**: a readable text form in which the word `0101 0011 00000001` is written `ADD A, B`, and a program called the **assembler** that translates one into the other.

In this lesson you study the instruction set of the toy CPU from Lesson 5, see how a line of assembly turns into a 16-bit number by writing a small assembler in Python, learn the four **addressing modes** (and discover that "register indirect" is exactly what a C pointer does), and then write four real assembly programs: a sum, an if/else decision, a table of powers of two and a multiplication.

## Learning Objectives

1. Explain what a machine instruction is (an opcode and its operands) and what an instruction set architecture (ISA) is.
2. Describe the roles of the compiler, the assembler and the CPU on the way from C source code to a running program.
3. Read and write assembly programs for the toy CPU using data-movement, arithmetic, compare and jump instructions.
4. Identify the addressing mode of an instruction (immediate, register, direct or register indirect) and relate each mode to C.
5. Translate an if/else decision and a loop into compare-and-jump instructions.
6. Encode instructions as 16-bit machine words and decode them again with a Python assembler.

## Prerequisites

- Lesson 5: the CPU, the instruction cycle and the first assembly programs on the toy CPU.
- Lesson 1: binary and hexadecimal numbers (machine words are written in both).
- Pointers from the C course: an address is a number that names a memory cell.

## Concept Explanation

### Machine instructions and the instruction set

A **machine instruction** is one binary word that tells the CPU to do one small thing, such as "add register B to register A" or "jump to instruction 2". It has two kinds of fields: the **opcode** says *what* to do, and the **operands** say *with what*: which registers, which constant, which memory address. The complete collection of instructions that a CPU understands, with their binary formats, registers and addressing modes, is its **instruction set architecture (ISA)**. Different CPU families speak different ISAs: x86-64 (most laptops and servers), ARM (phones and Apple computers) and RISC-V (open and growing) can all run a program written in C, but the machine code that each one gets is completely different, which is why a program built for one cannot run on another.

ISAs differ in style. A **RISC** design (ARM, RISC-V) has a small set of simple, fixed-length instructions, and only `LOAD` and `STORE` touch memory (a **load-store** architecture). A **CISC** design (x86) has many complex, variable-length instructions, some of which work on memory directly. The toy CPU of this course is RISC-like: its instructions are simple, arithmetic works on registers only and data must be loaded first.

The toy CPU packs each instruction into **16 bits** in the model used by Example 1: 4 bits of opcode, 1 bit that names the register (A or B), 3 bits of addressing mode and 8 bits of operand (a number, a memory address, a jump target or a second register).

### Assembly language and the assembler

**Assembly language** gives every machine instruction a short name, a **mnemonic** (`LOAD`, `ADD`, `JNZ`), lets you write constants in decimal or hexadecimal and lets you name addresses with **labels** (`loop:`). Each line of assembly becomes exactly one machine instruction: that one-to-one rule separates assembly from C, where one line may become dozens of instructions. The **assembler** is the program that does the translation. It works in two passes: the first reads the program and records the address of every label (a jump may refer to a label that appears *later*), and the second encodes every instruction, replacing each label by its address.

Assembly sits at the bottom of the toolchain you already know. When you compile a C program, the **compiler** translates C into assembly, the **assembler** turns the assembly into machine code, the **linker** joins your code with library code and the CPU executes the result. A C compiler can show you its assembly (`gcc -S`), and a **disassembler** turns machine code back into assembly. Programmers read assembly to find performance problems, to debug crashes, to write the first instructions that run when a computer starts and to study malware; most of the time, though, they write in a higher-level language.

### The instruction set of the toy CPU

The toy CPU has two 8-bit registers, **A** and **B**, two flags, **Z** (zero) and **C** (carry or borrow), and a data memory of 16 cells (addresses 0 to 15) that each hold 8 bits. In the table, R and S stand for A or B.

| Instruction | What it does | Flags |
|---|---|---|
| `LOADI R, n` | R ← the number n | unchanged |
| `LOAD R, addr` or `LOAD R, [S]` | R ← memory[addr] or memory[S] | unchanged |
| `STORE R, addr` or `STORE R, [S]` | memory[addr] or memory[S] ← R | unchanged |
| `MOV R, S` | R ← S | unchanged |
| `ADD`, `SUB`, `AND`, `OR` (`R, S`) | R ← R op S | set Z and C |
| `INC R`, `DEC R` | R ← R + 1 or R − 1 | set Z |
| `CMP R, S` | compare R with S and change nothing else | Z = 1 if equal, C = 1 if R is less than S |
| `JMP label` | PC ← the address of the label | unchanged |
| `JZ label`, `JNZ label` | jump if Z = 1, jump if Z = 0 | unchanged |
| `HALT` | stop the CPU | unchanged |

Two details matter in practice. First, only the arithmetic, logic, `INC`, `DEC` and `CMP` instructions change the flags: `LOAD`, `STORE` and `MOV` leave them alone, so a conditional jump always tests the flags of the *last flag-setting* instruction. Second, there is no instruction that adds a memory cell directly: data must be loaded into a register first, which is the load-store style.

### Addressing modes

An **addressing mode** is the rule that tells the CPU where an operand comes from. The toy CPU has four of them:

| Mode | Example | What the CPU does | In C |
|---|---|---|---|
| Immediate | `LOADI A, 9` | uses the number written inside the instruction | `a = 9;` |
| Register | `MOV B, A` | uses the value in a register | `b = a;` |
| Direct | `LOAD A, 5` | the instruction contains the memory address | `a = score;` (a variable at a fixed address) |
| Register indirect | `LOAD A, [B]` | the register contains the memory address | `a = *p;` (p is a pointer) |

Real CPUs add more: **indexed** addressing (a base address plus a register, ideal for arrays), **relative** addressing (an offset from the program counter, used by jumps) and indirect addressing through memory. The modes exist because programs need constants, variables, arrays and pointers, and each is reached most naturally in a different way. Register indirect addressing is the reason a C pointer is only a number: `*p` becomes a `LOAD` through a register that holds p.

### Control flow: if/else and loops as jumps

At machine level there is no `if` and no `while`, only jumps. A decision is a **compare** followed by a **conditional jump** that skips a block of instructions; a loop is a **backward jump**. The pattern for if/else is: compare, jump to the "then" part when the condition holds, otherwise fall into the "else" part and jump over the "then" part. A counting loop is: set a counter, do the work, change the counter and jump back while the counter has not reached zero. In C the keywords `if`, `for` and `while` hide these jumps; the compiler produces them for you.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Machine instruction** | One binary word that tells the CPU to do one small operation. |
| **Opcode / operand** | The field that says what to do / the fields that say what to do it with. |
| **ISA (instruction set architecture)** | The instructions, formats, registers and addressing modes that a CPU understands. |
| **Assembly language** | A text notation with one mnemonic for every machine instruction. |
| **Assembler** | The program that translates assembly into machine code, replacing labels by addresses. |
| **Mnemonic** | The short name of an instruction, such as ADD or JNZ. |
| **Label** | A name for an address in the program, such as `loop:`; it has no machine code of its own. |
| **Addressing mode** | The rule that says where an operand comes from: a constant, a register or a memory address. |
| **Register indirect** | A mode in which a register holds the address of the data, like a C pointer. |
| **Jump (branch)** | An instruction that loads a new address into the program counter. |
| **Load-store architecture** | A design in which only LOAD and STORE access memory; arithmetic uses registers. |

## Worked Examples

### Example 1: From assembly to machine code

```python
OPCODES = {"HALT": 0, "LOADI": 1, "LOAD": 2, "STORE": 3, "MOV": 4, "ADD": 5, "SUB": 6, "AND": 7,
           "OR": 8, "INC": 9, "DEC": 10, "CMP": 11, "JMP": 12, "JZ": 13, "JNZ": 14}
NAMES = {code: name for name, code in OPCODES.items()}
REGISTER = {"A": 0, "B": 1}


def parse(source):
    """Pass 1: strip the comments and note the address of every label."""
    labels, program = {}, []
    for line in source.splitlines():
        line = line.split(";")[0].strip()
        if ":" in line:
            label, line = line.split(":")
            labels[label.strip()] = len(program)
            line = line.strip()
        if line:
            mnemonic, *operands = line.replace(",", " ").split()
            program.append((mnemonic.upper(), operands))
    return labels, program


def encode(mnemonic, operands, labels):
    """Pass 2: build the 16-bit word  oooo r mmm nnnnnnnn."""
    register, mode, operand = 0, 0, 0
    if mnemonic in ("JMP", "JZ", "JNZ"):
        operand = labels[operands[0]]                 # a label becomes an address
    elif operands:
        register = REGISTER[operands[0]]
        if len(operands) == 2:
            second = operands[1]
            if mnemonic == "LOADI":
                mode, operand = 1, int(second)        # immediate: the value itself
            elif second.startswith("["):
                mode, operand = 4, REGISTER[second.strip("[]")]   # register indirect
            elif mnemonic in ("LOAD", "STORE"):
                mode, operand = 2, int(second)        # direct: a memory address
            else:
                mode, operand = 3, REGISTER[second]   # register
    return OPCODES[mnemonic] << 12 | register << 11 | mode << 8 | operand


def decode(word):
    """The disassembler: machine code back to assembly (the labels are lost)."""
    opcode, register, mode, operand = word >> 12, word >> 11 & 1, word >> 8 & 7, word & 255
    name, first = NAMES[opcode], "AB"[register]
    if name == "HALT":
        return name
    if name in ("JMP", "JZ", "JNZ"):
        return f"{name} {operand}"
    if mode == 0:
        return f"{name} {first}"
    if mode in (1, 2):
        second = str(operand)                         # immediate value or memory address
    elif mode == 3:
        second = "AB"[operand]                        # a register
    else:
        second = "[" + "AB"[operand] + "]"            # register indirect
    return f"{name} {first}, {second}"


SOURCE = """
      LOADI A, 0       ; running total
      LOADI B, 5       ; counter
loop: ADD A, B         ; total = total + counter
      DEC B            ; counter = counter - 1
      JNZ loop         ; repeat while the counter is not zero
      HALT
"""
labels, program = parse(SOURCE)
print("addr  op   r mod operand   hex   decoded")
for address, (mnemonic, operands) in enumerate(program):
    word = encode(mnemonic, operands, labels)
    fields = f"{word >> 12:04b} {word >> 11 & 1} {word >> 8 & 7:03b} {word & 255:08b}"
    print(f"{address:>4}  {fields}   {word:04X}  {decode(word)}")
print("labels:", labels)
```

```output
addr  op   r mod operand   hex   decoded
   0  0001 0 001 00000000   1100  LOADI A, 0
   1  0001 1 001 00000101   1905  LOADI B, 5
   2  0101 0 011 00000001   5301  ADD A, B
   3  1010 1 000 00000000   A800  DEC B
   4  1110 0 000 00000010   E002  JNZ 2
   5  0000 0 000 00000000   0000  HALT
labels: {'loop': 2}
```

1. `parse` is **pass 1**: it removes the comments and records the address of every label (`loop` is instruction 2), because a jump may name a label that appears later in the file.
2. `encode` is **pass 2**: it builds the 16-bit word from four fields: the opcode in bits 15 to 12, the register in bit 11, the addressing mode in bits 10 to 8 and the operand in bits 7 to 0. For `ADD A, B` that gives 0101 0 011 00000001, which is 5301 in hexadecimal.
3. The label disappears: `JNZ loop` becomes `E002`, a jump to address 2, and the disassembler can only print `JNZ 2` because the name was never stored in the machine code. `HALT` is the word of all zeros.
4. The mode field tells the CPU how to read the operand: 1 = immediate, 2 = direct, 3 = register, 4 = register indirect.
5. This encoding is a *model*: real instruction sets use their own formats (a RISC-V instruction has 32 bits, an x86 instruction has 1 to 15 bytes), but the idea of an opcode plus register and constant fields is the same.

### Example 2: A tour of the addressing modes

```asm
      LOADI A, 9        ; immediate: the value 9 is inside the instruction
      STORE A, 5        ; direct: memory[5] = A
      LOADI B, 5        ; B now holds an address
      LOADI A, 0        ; clear A, to prove that the next load really works
      LOAD A, [B]       ; register indirect: A = memory[B] = memory[5]
      MOV B, A          ; register: B = A
      HALT
```

```output
A=9 B=9 Z=0 C=0 steps=7
mem: [5]=9
```

1. `LOADI A, 9` is **immediate** addressing: the number 9 is part of the instruction itself, so no memory is read.
2. `STORE A, 5` is **direct** addressing: the instruction holds the address 5 of the memory cell that receives the value of A.
3. `LOADI B, 5` puts the *address* 5 into B as ordinary data; `LOADI A, 0` clears A so that the next instruction visibly does something.
4. `LOAD A, [B]` is **register indirect**: the CPU reads B (it is 5) and then reads memory[5], which holds 9. This is `a = *p;` in C, with B playing the part of the pointer `p`.
5. `MOV B, A` is **register** addressing: both operands are registers and memory is not used. The final state shows A = 9, B = 9, memory[5] = 9 and 7 instructions executed, including `HALT`.

### Example 3: Filling memory with a loop

```asm
      LOADI B, 7        ; B is the address of the cell to fill
fill: STORE B, [B]      ; memory[B] = B
      DEC B             ; the next cell down (Z = 1 when B reaches 0)
      JNZ fill          ; repeat while B is not zero
      HALT
```

```output
A=0 B=0 Z=1 C=0 steps=23
mem: [1]=1 [2]=2 [3]=3 [4]=4 [5]=5 [6]=6 [7]=7
```

1. Register B plays two roles: it is the value to store *and* the address of the cell. `STORE B, [B]` writes the value 7 into memory cell 7, then 6 into cell 6, and so on.
2. `DEC B` moves the pointer to the next cell and sets Z when B reaches zero; `JNZ fill` jumps back while Z = 0. Changing a pointer inside a loop is how assembly walks through an array.
3. Cells 1 to 7 hold their own addresses, but cell 0 was **not** written: the loop stops as soon as B becomes 0. This off-by-one boundary is the most common bug in loops, in assembly and in C.
4. The program executed 1 + 7 × 3 + 1 = 23 instructions: the setup, seven passes of three instructions each and the `HALT`.

## Common Mistakes and Misconceptions

- **Confusing immediate with direct addressing.** `LOADI A, 5` puts the number 5 in A; `LOAD A, 5` puts the *contents of memory cell 5* in A.
- **Forgetting `HALT`.** The program counter runs past the last instruction and the CPU reports a fault.
- **Expecting `LOAD`, `STORE` or `MOV` to set the flags.** Only arithmetic, logic, `INC`, `DEC` and `CMP` do, so a `JZ` straight after a `LOAD` tests an old result.
- **Off-by-one errors in loops.** A loop that stops when its counter reaches zero never handles the cell with index 0 (Example 3).
- **Using an address outside 0 to 15.** The data memory has 16 cells; any other address stops the program with a fault.
- **Writing a loop that cannot end.** A `JNZ` whose counter is never changed, or never reaches zero, repeats forever; the simulator stops it after 500 instructions.
- **Believing assembly is portable.** Every CPU family has its own instruction set: toy-CPU assembly does not run on a real x86 or ARM processor.
- **Treating a label as an instruction.** A label only names an address; the assembler removes it and puts the number in the jump.

## Guided Hands-On Activity

**Run, predict and change.** Work with your teacher in the simulators of Examples 2 and 3.

1. Step through Example 2. Before each Step, say what the next instruction will change, then read the *decode* line, which names the addressing mode.
2. In Example 2 change `LOADI B, 5` to `LOADI B, 6` and predict the final A. Run it and explain the result.
3. In Example 3 change `LOADI B, 7` to `LOADI B, 15`. Which cells are filled now, and how many instructions are executed?
4. Delete `HALT` from Example 3 and run it. Read the message and explain what happens when the program counter passes the last instruction.
5. In the Python assembler of Example 1 replace the program with the one of Example 2. Which instruction gets the mode 100, and which gets 010?
6. Hand-assemble `MOV B, A` from the field table (opcode 4, register B, mode 3, operand 0), then check your hexadecimal word with the assembler.

## Lesson Project: Assembly Programs on a Toy CPU

### Objective

Write **four assembly programs** for the toy CPU (a sum, an if/else decision, a table of powers of two and a multiplication), predict and trace them by hand, run them in the simulator, and turn one of them into machine code with the Python assembler of Example 1.

### Requirements

- **Program 1: sum.** Direct addressing. Memory cells 0, 1 and 2 hold 12, 30 and 7; store their sum in cell 3.
- **Program 2: decision.** Compare and jump. Cells 0 and 1 hold two numbers; store 1 in cell 2 if they are equal and 0 if they are not. Run it for 25 and 25, and again for 25 and 26.
- **Program 3: powers of two.** A loop and register indirect addressing. Fill cells 0 to 7 with 1, 2, 4, ..., 128. Use no counter other than the pointer: the loop must end because the doubling overflows the 8-bit register.
- **Program 4: multiplication.** Repeated addition. Cells 0 and 1 hold 6 and 7; leave 6 × 7 in cell 2. With only two registers, keep the product and the counter in memory.
- Every line of every program has a comment and every program ends with `HALT`.
- A short report with a hand trace of the first three passes of Program 3 and one pass of Program 4, and the final state of each program (A, B, Z, C, instructions executed and the memory cells that are not zero).
- The machine-code listing of Program 3 produced by the Python assembler.

### Instructions

1. Open the project workbench below (an editable simulator) with the memory 12, 30, 7. Write Program 1, run it and note the final state.
2. Write Program 2 with the memory 25, 25. Run it, then change the memory to 25, 26 and run it again.
3. Write Program 3 with a single loop: store, move the pointer, double, jump. Predict the number of instructions before you run it.
4. Write Program 4 with the memory 6, 7: load the product and the multiplicand, add, store; load the counter, decrement, store; jump back while the counter is not zero.
5. Comment every line and write down the final state of each program.
6. Paste Program 3 into the Python assembler (Example 1), run it and copy the listing.
7. Compare your results with the expected output and finish the report.

### Expected Output

```text
Program 1 (sum)            A=49 B=7 Z=0 C=0 steps=7
  mem: [0]=12 [1]=30 [2]=7 [3]=49
Program 2 (25 and 25)      A=1 B=25 Z=1 C=0 steps=7
  mem: [0]=25 [1]=25 [2]=1
Program 2 (25 and 26)      A=0 B=26 Z=0 C=1 steps=8
  mem: [0]=25 [1]=26
Program 3 (powers of two)  A=0 B=8 Z=1 C=1 steps=35
  mem: [0]=1 [1]=2 [2]=4 [3]=8 [4]=16 [5]=32 [6]=64 [7]=128
Program 4 (6 x 7)          A=0 B=6 Z=1 C=0 steps=59
  mem: [0]=6 [2]=42

Machine code of Program 3
addr  op   r mod operand   hex   decoded
   0  0001 0 001 00000001   1101  LOADI A, 1
   1  0001 1 001 00000000   1900  LOADI B, 0
   2  0011 0 100 00000001   3401  STORE A, [B]
   3  1001 1 000 00000000   9800  INC B
   4  0101 0 011 00000000   5300  ADD A, A
   5  1110 0 000 00000010   E002  JNZ 2
   6  0000 0 000 00000000   0000  HALT
```

The simulator shows the same facts in its register panel, flag lights and memory panel; the lines above list them as text: the registers A and B, the flags Z and C, the number of instructions executed (`steps`) and the memory cells that are not zero.

### Hints

1. **Hint 1 (Program 1).** Load the first two numbers, `ADD`, load the third number into B (reusing it), `ADD` again and `STORE A, 3`.
2. **Hint 2 (Program 2).** `CMP A, B` sets Z when the numbers are equal. `JZ same` jumps to the label `same`; the other branch must end with `JMP done` so that it skips the `same` part.
3. **Hint 3 (Program 3).** `STORE A, [B]` writes A into the cell whose address is in B. After each store, `INC B` moves to the next cell and `ADD A, A` doubles A. Put `ADD A, A` just before `JNZ`, because the jump tests the flags of the last flag-setting instruction.
4. **Hint 4 (the end of Program 3).** 128 + 128 = 256 does not fit in 8 bits: A wraps to 0, so Z = 1 and the loop ends. No separate counter is needed.
5. **Hint 5 (Program 4).** Keep the product in cell 2 and the counter in cell 1. `STORE` does not change the flags, so the jump still sees the flag set by `DEC`.
6. **Hint 6 (check yourself).** The number of instructions executed should be 7, 7 (or 8), 35 and 59.
7. **Hint 7 (machine code).** `STORE A, [B]` must come out as `3401`: opcode 3, register A, mode 100 (register indirect), operand 1 (the register B).

### Success Criteria

- [ ] Program 1 leaves 49 in register A and in memory cell 3.
- [ ] Program 2 stores 1 for 25 and 25 and 0 for 25 and 26, using `CMP` and a conditional jump.
- [ ] Program 3 fills cells 0 to 7 with 1, 2, 4, ..., 128 and stops by itself after 35 instructions.
- [ ] Program 4 leaves 42 in cell 2 after 59 instructions.
- [ ] Every program line has a comment and every program ends with `HALT`.
- [ ] The report contains the hand traces, the final states and the machine-code listing of Program 3.

### Extension Challenge

Write **division by repeated subtraction**: divide the number in cell 0 by the number in cell 1 and store the quotient in cell 2, first for 24 ÷ 4 (it should give 6). Then try 25 ÷ 4 and watch what happens: the simulator stops the program after 500 instructions. Explain why the loop never ends (the toy CPU has no "jump if carry" instruction, so it cannot detect that the remainder became smaller than the divisor) and design such an instruction on paper: its opcode, its encoding and the change to the control unit. Finally, extend the Python assembler so that it reports an error message instead of crashing for an unknown mnemonic, an undefined label or an address above 15.

## Lesson Recap

- A **machine instruction** is a binary word with an **opcode** and **operands**; the complete set a CPU understands is its **ISA**.
- **Assembly language** gives each instruction a mnemonic and each address a label; the **assembler** translates it in two passes into machine code.
- The toy CPU has the **addressing modes** immediate, register, direct and **register indirect**, the last of which is what a C pointer does.
- **Decisions and loops** are a compare (or arithmetic) that sets a flag, plus a conditional jump; `LOAD`, `STORE` and `MOV` do not change the flags.
- With few registers, programs keep values in memory and load them when needed, which is why real CPUs have many more registers.

## Homework / Extension Mission

1. Hand-assemble the instructions `LOADI B, 9`, `STORE A, [B]` and `JNZ 4` into 16-bit hexadecimal words using the field layout of Example 1, then check them with the Python assembler.
2. Write an assembly program that swaps the numbers in memory cells 0 and 1, and test it with 17 and 4.
3. In four sentences explain why `a = *p;` in C needs register indirect addressing in assembly, and which register plays the part of `p`.
4. If you have a computer with a C compiler, compile a small function such as `int twice(int x) { return x + x; }` with `gcc -S` and read the assembly: find the instruction that does the addition.

## Course Project Connection

This lesson shows what the hardware of the **Mini Calculator System**, the course project, is *for*: the ALU, the register and the counter that you built in CircuitVerse are the parts that execute instructions such as `ADD`, `LOAD` and `JNZ`. The four programs you wrote run on the toy CPU model of the simulator, and their machine words are what the control unit would decode. In Lesson 8 you will see how real processors speed this cycle up with pipelining, then integrate the switches, the adder, the register and the display into one tested system and write the build report.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: "a program is only numbers": show `gcc -S` output (or a compiler explorer) for a three-line C function. 15 minutes: the instruction set and the encoding (Example 1 on the projector; students decode a word by hand). 10 minutes: the addressing modes with Example 2 in the simulator. 25 minutes: the four project programs in pairs, with the final state compared against the expected output.

**Live demonstrations.** Step through Example 2 and read the *decode* line aloud each time. Show the decode of `JNZ 2` in Example 1 and ask where the name `loop` went. Run Program 3 and stop at the last pass to show the doubling overflow and the carry flag.

**Misconceptions.** "Assembly and machine code are the same thing." "Assembly is the same on every computer." "`LOAD` sets the zero flag." "A label is an instruction." "A pointer is a special kind of data."

**Assessment of the project.** Check the four final states and the instruction counts against the expected output, ask every student to name the addressing mode of each instruction in Program 3, and check the hand traces in the report.

**Reference solutions** (paste each program into the simulator).

Program 1, the sum:

```asm
; memory: 12, 30, 7
      LOAD A, 0         ; A = 12
      LOAD B, 1         ; B = 30
      ADD A, B          ; A = 42
      LOAD B, 2         ; B = 7
      ADD A, B          ; A = 49
      STORE A, 3        ; memory[3] = 49
      HALT
```

```output
A=49 B=7 Z=0 C=0 steps=7
mem: [0]=12 [1]=30 [2]=7 [3]=49
```

Program 2, the decision (for 25 and 25, then for 25 and 26):

```asm
; memory: 25, 25
      LOAD A, 0         ; A = first number
      LOAD B, 1         ; B = second number
      CMP A, B          ; Z = 1 when they are equal
      JZ same           ; equal: go to the then-part
      LOADI A, 0        ; else-part: the result is 0
      JMP done          ; skip the then-part
same: LOADI A, 1        ; then-part: the result is 1
done: STORE A, 2        ; memory[2] = result
      HALT
```

```output
A=1 B=25 Z=1 C=0 steps=7
mem: [0]=25 [1]=25 [2]=1
```

```asm
; memory: 25, 26
      LOAD A, 0         ; A = first number
      LOAD B, 1         ; B = second number
      CMP A, B          ; Z = 1 when they are equal
      JZ same           ; equal: go to the then-part
      LOADI A, 0        ; else-part: the result is 0
      JMP done          ; skip the then-part
same: LOADI A, 1        ; then-part: the result is 1
done: STORE A, 2        ; memory[2] = result
      HALT
```

```output
A=0 B=26 Z=0 C=1 steps=8
mem: [0]=25 [1]=26
```

Program 3, the powers of two:

```asm
      LOADI A, 1        ; first power of two
      LOADI B, 0        ; B is the address pointer
loop: STORE A, [B]      ; memory[B] = A
      INC B             ; next address
      ADD A, A          ; double A (128 + 128 wraps to 0 and sets Z and C)
      JNZ loop          ; repeat until the doubling overflows
      HALT
```

```output
A=0 B=8 Z=1 C=1 steps=35
mem: [0]=1 [1]=2 [2]=4 [3]=8 [4]=16 [5]=32 [6]=64 [7]=128
```

Program 4, 6 × 7 by repeated addition:

```asm
; memory: 6, 7
      LOADI A, 0
      STORE A, 2        ; product = 0
loop: LOAD A, 2         ; A = product so far
      LOAD B, 0         ; B = multiplicand
      ADD A, B          ; A = product + multiplicand
      STORE A, 2        ; save the product
      LOAD A, 1         ; A = counter
      DEC A             ; one addition fewer to do (Z = 1 at zero)
      STORE A, 1        ; save the counter
      JNZ loop          ; STORE leaves Z alone, so this tests the DEC
      HALT
```

```output
A=0 B=6 Z=1 C=0 steps=59
mem: [0]=6 [2]=42
```

Machine code of Program 3 (the assembler of Example 1 with this source; the functions `parse`, `encode` and `decode` are the same as in Example 1):

```python
OPCODES = {"HALT": 0, "LOADI": 1, "LOAD": 2, "STORE": 3, "MOV": 4, "ADD": 5, "SUB": 6, "AND": 7,
           "OR": 8, "INC": 9, "DEC": 10, "CMP": 11, "JMP": 12, "JZ": 13, "JNZ": 14}
NAMES = {code: name for name, code in OPCODES.items()}
REGISTER = {"A": 0, "B": 1}


def parse(source):
    labels, program = {}, []
    for line in source.splitlines():
        line = line.split(";")[0].strip()
        if ":" in line:
            label, line = line.split(":")
            labels[label.strip()] = len(program)
            line = line.strip()
        if line:
            mnemonic, *operands = line.replace(",", " ").split()
            program.append((mnemonic.upper(), operands))
    return labels, program


def encode(mnemonic, operands, labels):
    register, mode, operand = 0, 0, 0
    if mnemonic in ("JMP", "JZ", "JNZ"):
        operand = labels[operands[0]]
    elif operands:
        register = REGISTER[operands[0]]
        if len(operands) == 2:
            second = operands[1]
            if mnemonic == "LOADI":
                mode, operand = 1, int(second)
            elif second.startswith("["):
                mode, operand = 4, REGISTER[second.strip("[]")]
            elif mnemonic in ("LOAD", "STORE"):
                mode, operand = 2, int(second)
            else:
                mode, operand = 3, REGISTER[second]
    return OPCODES[mnemonic] << 12 | register << 11 | mode << 8 | operand


def decode(word):
    opcode, register, mode, operand = word >> 12, word >> 11 & 1, word >> 8 & 7, word & 255
    name, first = NAMES[opcode], "AB"[register]
    if name == "HALT":
        return name
    if name in ("JMP", "JZ", "JNZ"):
        return f"{name} {operand}"
    if mode == 0:
        return f"{name} {first}"
    if mode in (1, 2):
        second = str(operand)
    elif mode == 3:
        second = "AB"[operand]
    else:
        second = "[" + "AB"[operand] + "]"
    return f"{name} {first}, {second}"


SOURCE = """
      LOADI A, 1        ; first power of two
      LOADI B, 0        ; B is the address pointer
loop: STORE A, [B]      ; memory[B] = A
      INC B             ; next address
      ADD A, A          ; double A (128 + 128 wraps to 0 and sets Z and C)
      JNZ loop          ; repeat until the doubling overflows
      HALT
"""
labels, program = parse(SOURCE)
print("Machine code of Program 3")
print("addr  op   r mod operand   hex   decoded")
for address, (mnemonic, operands) in enumerate(program):
    word = encode(mnemonic, operands, labels)
    fields = f"{word >> 12:04b} {word >> 11 & 1} {word >> 8 & 7:03b} {word & 255:08b}"
    print(f"{address:>4}  {fields}   {word:04X}  {decode(word)}")
```

```output
Machine code of Program 3
addr  op   r mod operand   hex   decoded
   0  0001 0 001 00000001   1101  LOADI A, 1
   1  0001 1 001 00000000   1900  LOADI B, 0
   2  0011 0 100 00000001   3401  STORE A, [B]
   3  1001 1 000 00000000   9800  INC B
   4  0101 0 011 00000000   5300  ADD A, A
   5  1110 0 000 00000010   E002  JNZ 2
   6  0000 0 000 00000000   0000  HALT
```

**Differentiation.** Support: give students the skeleton of each program (labels and comments, with the instructions blank) and a copy of the instruction table. Stretch: the division program of the extension, the `JC` design and a Python *simulator* for the toy CPU (about 40 lines: fetch an instruction from the list, `match` on the mnemonic, update registers, flags and memory).

**Discussion questions (not for the student quiz).** Why do real CPUs have 16 or 32 registers instead of 2, and what does Program 4 have to do because there are so few? How could a compiler turn `for (i = 0; i < 8; i++) a[i] = 1 << i;` into Program 3? What would a `JC` instruction need in the control unit's hardware?
