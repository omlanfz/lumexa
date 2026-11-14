// FILE PATH: server/src/pre-university-cse/banks/course-5.ts
//
// Course Assessment 5 — How Computers Work: Digital Logic & Computer Architecture.

import { codeOut, crit, mcq, practical, shortAnswer, structuredBank } from '../../structured-assessments/structured.helpers';

export const COURSE_5_BANK = structuredBank({
  id: 'structured/how-computers-work-digital-logic-and-computer-architecture',
  title: 'Course Assessment: How Computers Work: Digital Logic & Computer Architecture',
  kind: 'COURSE_TEST',
  mcq: [
    codeOut(
      1,
      'python',
      `print(bin(45), hex(255), int("1011", 2), 0o17)`,
      '0b101101 0xff 11 15',
      ['0b101101 0xff 13 17', '0b110101 0xf0 11 15', '0b101101 0xff 11 17'],
      '45 = 32 + 8 + 4 + 1 = 101101 in binary; 255 is ff in hexadecimal; the binary string 1011 is 8 + 2 + 1 = 11; the octal literal 17 is 1 x 8 + 7 = 15.',
    ),
    codeOut(
      2,
      'python',
      `print((-5) & 0xFF, bin((-5) & 0xFF))`,
      '251 0b11111011',
      ['5 0b101', '123 0b1111011', '250 0b11111010'],
      'In 8-bit two\'s complement -5 is the bit pattern 11111011: invert 00000101 to 11111010 and add 1. As an unsigned number that pattern is 251.',
    ),
    mcq(
      3,
      'A half adder adds two 1-bit inputs A and B. What are its outputs for A = 1 and B = 1?',
      'Sum 0 and carry 1, because the sum is A XOR B and the carry is A AND B',
      [
        'Sum 1 and carry 1, because both inputs are 1',
        'Sum 1 and carry 0, because the sum is A OR B',
        'Sum 0 and carry 0, because the two inputs cancel',
      ],
      'In binary 1 + 1 = 10: the sum bit is 0 and a carry of 1 goes to the next position. A full adder adds a third input, the carry in.',
    ),
    mcq(
      4,
      'What does a D flip-flop do?',
      'It copies its D input into its stored bit on the active clock edge and holds that bit until the next edge',
      [
        'It changes its output whenever D changes, at any moment, without needing a clock',
        'It outputs the AND of D and the clock, so it is a logic gate with a memory of one gate delay',
        'It counts the clock pulses and outputs the total in binary',
      ],
      'A D flip-flop is the basic one-bit memory of a clocked circuit: the stored value changes only at the clock edge, which is what makes registers and counters predictable.',
    ),
    mcq(
      5,
      'What happens in the fetch step of the instruction cycle?',
      'The control unit reads the instruction at the address in the program counter from memory into the instruction register, and the program counter moves on',
      [
        'The ALU performs the arithmetic that the instruction names',
        'The result of the instruction is written back into a register',
        'The decoder works out which registers the instruction uses and sets up the ALU',
      ],
      'The cycle is fetch, decode, execute (and write back). Fetch brings the next instruction in; decode interprets it; execute does the work.',
    ),
    mcq(
      6,
      'Why does a cache make a program run faster even though the cache is much smaller than RAM?',
      'Programs reuse recent data and use nearby data (locality), so most accesses are served by the small, fast cache',
      [
        'The cache stores a second copy of the whole of RAM, so that two accesses can be made at the same time',
        'The cache is made of the same technology as the hard disk, which is faster than RAM',
        'The cache lets the CPU skip the instructions whose results were stored earlier',
      ],
      'Temporal locality (data used again soon) and spatial locality (data near what was used) mean that a small fast memory can answer most requests, so the average access time falls.',
    ),
    mcq(
      7,
      'In the instruction LOADI A, 5 of a simple CPU, which addressing mode is used for the 5?',
      'Immediate addressing: the operand 5 is part of the instruction itself',
      [
        'Direct addressing: 5 is the address of a memory cell that holds the operand',
        'Indirect addressing: 5 is the address of a cell that holds the address of the operand',
        'Register addressing: 5 is the number of the register that holds the operand',
      ],
      'With an immediate operand the value is encoded in the instruction, so no extra memory access is needed to get it.',
    ),
    mcq(
      8,
      'In a pipelined CPU, instruction 2 needs the result of instruction 1 before instruction 1 has written it back. What is this called?',
      'A data hazard, which the CPU solves by forwarding the result or by inserting a stall',
      [
        'A control hazard, which arises only when two instructions use the same register',
        'A structural hazard, which means that the program counter has overflowed',
        'A cache miss, which means that the instruction was not found in memory',
      ],
      'A data hazard is a dependency between instructions that overlap in the pipeline. Forwarding passes the result straight from one stage to another; a stall waits a cycle.',
    ),
    mcq(
      2,
      'Which Boolean expression is equal to A + A.B (A OR (A AND B))?',
      'A, by the absorption law',
      ['A.B', 'A + B', 'B'],
      'If A is 1 the whole expression is 1; if A is 0 then A.B is 0 and the expression is 0. So it always equals A.',
    ),
    codeOut(
      1,
      'python',
      `print(f"{0xB7:08b}")`,
      '10110111',
      ['10111011', '01101101', '10110011'],
      'Hexadecimal B is 1011 and 7 is 0111, and each hex digit is four bits, so 0xB7 is 10110111.',
    ),
  ],
  shortAnswers: [
    shortAnswer(
      1,
      'Convert the decimal number 156 to binary and to hexadecimal, showing your method. Then add the binary numbers 1011 and 0110, show the carries, and check your result in decimal.',
      '156 = 128 + 16 + 8 + 4, so in binary 156 is 10011100. Grouping in fours gives 1001 1100, which is 9C in hexadecimal. Adding 1011 and 0110 from the right: 1 + 0 = 1; 1 + 1 = 0 carry 1; 0 + 1 + carry 1 = 0 carry 1; 1 + 0 + carry 1 = 0 carry 1; the last carry becomes the leading 1, so the sum is 10001. Check: 11 + 6 = 17 and 10001 is 16 + 1 = 17.',
      [
        crit('Binary and hex conversion', 2, '10011100 and 9C, with the method shown (division or place values, grouping in fours).'),
        crit('Binary addition', 2, 'The sum 10001 with the carries shown.'),
        crit('Decimal check', 1, 'Checks 11 + 6 = 17 against 10001.'),
      ],
    ),
    shortAnswer(
      3,
      'Design a 1-bit full adder. Give its truth table, the Boolean expressions for sum and carry out, and explain how you would build it from two half adders and one OR gate. Then say how four of them make a 4-bit adder and what the carry does.',
      'The inputs are A, B and carry in Cin. Sum = A XOR B XOR Cin; Cout = (A AND B) OR (Cin AND (A XOR B)). The truth table has eight rows, for example 1+1+0 gives sum 0 and carry 1, and 1+1+1 gives sum 1 and carry 1. Build it with a first half adder for A and B (giving s1 and c1), a second half adder for s1 and Cin (giving the sum and c2), and an OR gate that combines c1 and c2 into Cout. Four full adders in a row, with each Cout wired to the next Cin, form a 4-bit ripple-carry adder; the carry ripples from the least significant bit to the most significant one, which is simple but makes the adder slower as it gets longer.',
      [
        crit('Truth table and expressions', 2, 'Correct truth table (or enough rows) and the sum and carry expressions.'),
        crit('Two half adders and an OR gate', 2, 'Describes the construction correctly.'),
        crit('The 4-bit adder', 1, 'Chains the carry out to the next carry in and mentions the ripple.'),
      ],
    ),
    shortAnswer(
      5,
      'Follow one instruction, ADD A, B, through the fetch, decode and execute steps of a simple CPU. Name the registers and units that take part in each step, and explain where a cache helps in this process.',
      'Fetch: the control unit places the address in the program counter (PC) on the address bus, the instruction is read from memory into the instruction register (IR), and the PC is incremented. Decode: the control unit decodes the opcode in the IR, finds out that it is an ADD and which registers it uses, and sets the control signals. Execute: the register values go to the ALU, which adds them, and the result is written back into the destination register and the status flags are updated. A cache sits between CPU and RAM: the fetch of the next instruction and the loading of operands are usually served from the fast cache instead of the slow RAM, which shortens the whole cycle.',
      [
        crit('Fetch', 1, 'PC, address, memory read into the IR, PC incremented.'),
        crit('Decode and execute', 2, 'Control unit decodes the opcode and sets signals; the ALU adds; the result is written to a register and flags are set.'),
        crit('Cache', 2, 'Explains that instruction and data accesses are served from the cache because of locality, so the cycle is faster.'),
      ],
    ),
  ],
  practical: practical({
    title: 'Design a three-input majority voter',
    language: 'text',
    instructions:
      'A safety system uses three sensors A, B and C. The output V must be 1 when at least two of the three sensors say 1, and 0 otherwise (a majority voter).\n\n' +
      '1. Write the truth table of V for the eight combinations of A, B and C.\n' +
      '2. Write the Boolean expression of V as a sum of products and simplify it as far as you can (for example with a Karnaugh map or by algebra).\n' +
      '3. Draw the gate-level circuit as a text diagram or a list of gates (AND, OR, NOT) with the names of their inputs and outputs.\n' +
      '4. Give a test plan of at least five input combinations with the expected value of V, including the combinations where one sensor disagrees with the other two.\n' +
      '5. Explain how you would build and test the circuit in a circuit simulator such as CircuitVerse (which components you would place and how you would check the result), and how many gates your simplified circuit uses.\n\n' +
      'The simplified expression should be V = AB + AC + BC. State which combinations make the output 1 and show that your circuit agrees with the truth table.',
    starterCode:
      'Truth table\nA B C | V\n0 0 0 | \n...\n\nSimplified expression\nV = \n\nGate-level circuit\n\nTest plan\n\nBuilding it in a simulator\n',
    deliverables: ['The truth table', 'The simplified Boolean expression with your working', 'The circuit as a diagram or gate list', 'The test plan and the simulator notes'],
    rubric: [
      crit('Truth table', 4, 'All eight rows are right; V is 1 exactly for 011, 101, 110 and 111.'),
      crit('Boolean expression', 5, 'A correct sum of products and a correct simplification to AB + AC + BC, with working shown.'),
      crit('Circuit', 4, 'The gate-level design implements the expression with named inputs and outputs and the correct gate count.'),
      crit('Testing', 4, 'A test plan with at least five combinations, including cases where one sensor disagrees, and a check against the table.'),
      crit('Simulator plan and clarity', 3, 'Explains how to place inputs, gates and an output in CircuitVerse and verify them; the answer is organised and clear.'),
    ],
  }),
});
