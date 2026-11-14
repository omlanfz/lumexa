// FILE PATH: server/src/curriculum/lesson-content/catalog/pucse/c5.ts
//
// Pre-University CSE · Course 5 · How Computers Work: Digital Logic & Computer Architecture — visuals and the Mini Quiz of every lesson.
// Keys are lineage keys: "<course-slug>/<lesson position>". Every "what does this print?" question carries
// the real program (checked by running it in the Pre-University CSE spec when the toolchain is installed).

import { registerVisualCatalog } from '../../visual-catalog';
import { registerQuizCatalog } from '../../quiz-catalog';
import { asmLab, automaton, bitExplorer, cards, checklist, circuit, compare, flow, gantt, grid, lab, mcq, PY, table, tool, trace, truthTable, V } from './helpers';

const M = 'how-computers-work-digital-logic-and-computer-architecture';

registerVisualCatalog({
  [`${M}/1`]: [
    bitExplorer(
      'bit-explorer-37',
      'Positional notation',
      'An eight-bit explorer showing the number 37: the bits 00100101, with the place values 128, 64, 32, 16, 8, 4, 2 and 1. The bits that are set are 32, 4 and 1, which add up to 37. The same value is 25 in hexadecimal.',
      'Flip the bits and watch the value. 37 = 32 + 4 + 1: add the weights of the bits that are 1.',
      8,
      37,
      { at: 'end', mode: 'unsigned' },
    ),
    table(
      'number-systems-table',
      'Converting between systems',
      'A table of the numbers 0 to 15 in decimal, binary, octal and hexadecimal. The hexadecimal digits A to F stand for 10 to 15, and each hexadecimal digit corresponds to exactly four binary digits.',
      'Memorise this table: one hex digit is exactly one nibble (4 bits).',
      ['Decimal', 'Binary', 'Octal', 'Hex'],
      [
        ['0', '0000', '0', '0'],
        ['1', '0001', '1', '1'],
        ['2', '0010', '2', '2'],
        ['3', '0011', '3', '3'],
        ['4', '0100', '4', '4'],
        ['5', '0101', '5', '5'],
        ['6', '0110', '6', '6'],
        ['7', '0111', '7', '7'],
        ['8', '1000', '10', '8'],
        ['9', '1001', '11', '9'],
        ['10', '1010', '12', 'A'],
        ['11', '1011', '13', 'B'],
        ['12', '1100', '14', 'C'],
        ['13', '1101', '15', 'D'],
        ['14', '1110', '16', 'E'],
        ['15', '1111', '17', 'F'],
      ],
      { at: 'end', highlights: [{ row: 10, col: 3, tone: 'info', note: 'A = ten' }, { row: 15, col: 3, tone: 'info', note: 'F = fifteen' }] },
    ),
    cards(
      'conversion-methods',
      'Converting between systems',
      'Four cards for four conversions. Binary to decimal: add the weights of the 1 bits. Decimal to binary: divide by 2 and read the remainders from the last to the first. Binary to hexadecimal: group the bits in fours from the right. Binary to octal: group the bits in threes.',
      'Four methods cover almost every conversion you will meet.',
      [
        { title: 'Binary → decimal', badge: 'add weights', tone: 'info', bullets: ['1011₂: 8 + 2 + 1', 'Weights: 1, 2, 4, 8, 16, ...', '= 11'] },
        { title: 'Decimal → binary', badge: 'divide by 2', tone: 'accent', bullets: ['13 ÷ 2 = 6 r 1', 'Keep dividing the quotient', 'Read remainders last to first: 1101'] },
        { title: 'Binary → hex', badge: 'groups of 4', tone: 'good', bullets: ['1101 0110', 'D 6', '= D6₁₆'] },
        { title: 'Binary → octal', badge: 'groups of 3', tone: 'warn', bullets: ['011 010 110', '3 2 6', '= 326₈'] },
      ],
      { at: 'end' },
    ),
    tool(
      'circuitverse-panel',
      'The tools of this course',
      'Launch card for CircuitVerse, a free browser-based logic circuit simulator, with seven steps for building the four-switch panel with a hexadecimal display.',
      'Your first CircuitVerse build: four switches, a splitter and a hex display. No hardware needed.',
      'CircuitVerse',
      'https://circuitverse.org/simulator',
      'A free logic-circuit simulator that runs in your browser: drag components, wire them up and click the inputs to see the outputs change.',
      [
        'Open the simulator and start a new project; name it "Mini Calculator System".',
        'From the Input menu, place four Input components and rename them 8, 4, 2 and 1.',
        'Place a Splitter and set its bit-width split to 1 1 1 1, so four single-bit wires join into one 4-bit bus.',
        'Wire input 8 to the first pin of the splitter, then 4, 2 and 1 in order.',
        'Place a Hex Display from the Output menu and connect the splitter’s 4-bit pin to it.',
        'Click each input to toggle it and check that the display shows the value of the switch setting.',
        'Add four LEDs to show the bits, then save the project and keep its link for your portfolio.',
      ],
      { at: 'end' },
    ),
    lab(
      'conversion-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that implements binary and hexadecimal conversion by division and by shift-and-add, and checks them against Python’s built-in functions for 1,000 numbers, with its expected output.',
      'Add to_octal(n) with the same method and test it against format(n, "o").',
      `def to_binary(n):
    if n == 0:
        return "0"
    digits = ""
    while n > 0:
        digits = str(n % 2) + digits       # the remainder is the next bit, from the right
        n //= 2
    return digits


def from_binary(text):
    value = 0
    for bit in text:
        value = value * 2 + int(bit)       # shift left and add the new bit
    return value


HEX = "0123456789ABCDEF"


def to_hex(n):
    if n == 0:
        return "0"
    digits = ""
    while n > 0:
        digits = HEX[n % 16] + digits
        n //= 16
    return digits


print("13 in binary:", to_binary(13), "| 1101 in decimal:", from_binary("1101"))
print("200 in hex:", to_hex(200), "| binary 11010110 in hex:", to_hex(from_binary("11010110")))
checks = all(to_binary(n) == bin(n)[2:] and from_binary(to_binary(n)) == n and to_hex(n) == format(n, "X") for n in range(0, 1000))
print("algorithms agree with Python for 0..999:", checks)`,
      { expected: '13 in binary: 1101 | 1101 in decimal: 13\n200 in hex: C8 | binary 11010110 in hex: D6\nalgorithms agree with Python for 0..999: True', filename: 'conversion.py', at: 'end' },
    ),
  ],
  [`${M}/2`]: [
    table(
      'binary-addition-steps',
      'Binary arithmetic',
      'A column-by-column addition of 0110 and 0111. In the rightmost column 0 plus 1 is 1 with no carry. In the next column 1 plus 1 is 0 with a carry of 1. In the third column 1 plus 1 plus the carry 1 is 1 with a carry of 1. In the leftmost column 0 plus 0 plus the carry 1 is 1. The result is 1101, which is 13.',
      '6 + 7 = 13: add column by column from the right, passing the carry to the next column.',
      ['', 'bit 3', 'bit 2', 'bit 1', 'bit 0'],
      [
        ['carry in', '1', '1', '0', '0'],
        ['A = 0110', '0', '1', '1', '0'],
        ['B = 0111', '0', '1', '1', '1'],
        ['sum = 1101', '1', '1', '0', '1'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 1, tone: 'warn' }, { row: 0, col: 2, tone: 'warn' }] },
    ),
    bitExplorer(
      'twos-complement-explorer',
      'Negative numbers: two’s complement',
      'An eight-bit explorer showing the pattern 11111011 in both the unsigned and the two’s complement readings. Read as unsigned it is 251; read as two’s complement it is minus 5, because the leftmost bit has weight minus 128.',
      'The same bits, two readings: 251 unsigned, −5 in two’s complement. Invert the bits of 5 and add 1 to get this pattern.',
      8,
      251,
      { at: 'end', mode: 'both' },
    ),
    truthTable(
      'gate-truth-table',
      'Logic gates',
      'A truth table for two inputs A and B with six columns: AND, OR, NAND, NOR, XOR and XNOR. NAND is the opposite of AND in every row, NOR the opposite of OR, and XNOR the opposite of XOR. XOR is 1 only when the inputs differ.',
      'Reveal the columns one at a time and predict each before you look. Compare with the gates you build in CircuitVerse.',
      ['A', 'B'],
      [
        ['AND', 'A and B'],
        ['OR', 'A or B'],
        ['NAND', 'A nand B'],
        ['NOR', 'A nor B'],
        ['XOR', 'A xor B'],
        ['XNOR', 'A xnor B'],
      ],
      { at: 'end', reveal: true, symbols: '01' },
    ),
    circuit(
      'nand-xor-circuit',
      'Universal gates',
      'A circuit that builds XOR from four NAND gates. The first NAND combines A and B. Two more NAND gates combine A with that result and B with that result. A final NAND combines those two, and its output is A XOR B.',
      'XOR from four NANDs: the first NAND is shared. Toggle the inputs and compare with a real XOR.',
      {
        inputs: ['A', 'B'],
        gates: [
          { id: 'n', type: 'NAND', in: ['A', 'B'], label: 'n' },
          { id: 'p', type: 'NAND', in: ['A', 'n'], label: 'p' },
          { id: 'q', type: 'NAND', in: ['B', 'n'], label: 'q' },
          { id: 'x', type: 'NAND', in: ['p', 'q'], label: 'out' },
        ],
        outputs: [{ id: 'X', from: 'x', label: 'A XOR B' }],
        truthTable: true,
      },
      { at: 'end' },
    ),
    circuit(
      'half-adder-circuit',
      'The half adder',
      'A half adder circuit with inputs A and B. An XOR gate gives the Sum output and an AND gate gives the Carry output. For A and B both equal to 1 the sum is 0 and the carry is 1, which is 10 in binary.',
      'Sum = A XOR B, Carry = A AND B. Click the inputs: with A = B = 1 the result is 10 (binary for 2).',
      {
        inputs: ['A', 'B'],
        gates: [
          { id: 'x', type: 'XOR', in: ['A', 'B'], label: 'XOR' },
          { id: 'c', type: 'AND', in: ['A', 'B'], label: 'AND' },
        ],
        outputs: [
          { id: 'S', from: 'x', label: 'Sum' },
          { id: 'C', from: 'c', label: 'Carry' },
        ],
        truthTable: true,
      },
      { at: 'end' },
    ),
    lab(
      'nand-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that builds NOT, AND, OR and XOR from NAND gates only and checks each against the real operation for every input, with its expected output.',
      'Add a NOR gate built from NANDs (OR followed by NOT) and check it against 1 - (a | b).',
      `from itertools import product


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
print("XOR from 4 NANDs:", all(XOR_n(a, b) == (a ^ b) for a, b in pairs))`,
      { expected: 'NOT from 1 NAND: True\nAND from 2 NANDs: True\nOR from 3 NANDs: True\nXOR from 4 NANDs: True', filename: 'nand.py', at: 'end' },
    ),
  ],
  [`${M}/3`]: [
    circuit(
      'full-adder-circuit',
      'The full adder',
      'A full adder circuit with inputs A, B and Cin. A first XOR gate combines A and B, and a second XOR gate combines that result with Cin to give the Sum. Two AND gates and an OR gate produce the carry-out: A AND B, ORed with Cin AND the first XOR.',
      'Two half adders and an OR gate. Click the inputs: with A = B = Cin = 1 the result is 11 in binary (Sum 1, Cout 1).',
      {
        inputs: ['A', 'B', 'Cin'],
        gates: [
          { id: 'x1', type: 'XOR', in: ['A', 'B'], label: 'A⊕B' },
          { id: 's', type: 'XOR', in: ['x1', 'Cin'], label: 'Sum' },
          { id: 'a1', type: 'AND', in: ['A', 'B'], label: 'AB' },
          { id: 'a2', type: 'AND', in: ['x1', 'Cin'], label: 'Cin(A⊕B)' },
          { id: 'co', type: 'OR', in: ['a1', 'a2'], label: 'Cout' },
        ],
        outputs: [
          { id: 'Sum', from: 's', label: 'Sum' },
          { id: 'Cout', from: 'co', label: 'Cout' },
        ],
        truthTable: true,
      },
      { at: 'end' },
    ),
    grid(
      'ripple-carry-diagram',
      'The ripple-carry adder',
      'A block diagram of a four-bit ripple-carry adder. Four full adders FA0 to FA3 are in a row, with FA0 on the right. The carry-in of the whole adder, 0, enters FA0. The carry-out of each full adder is the carry-in of the next one to its left: c1, c2 and c3. The last carry-out leaves FA3. Each full adder also receives one bit of A and one bit of B.',
      'The carry ripples from bit 0 to bit 3: the last sum bit is ready only after the carry has crossed all four stages.',
      [
        ['cout', 'terminator', 'carry-out', -1, 0, 'warn'],
        ['fa3', 'rect', 'FA 3', 0, 0, 'accent', 'a3  b3  → s3'],
        ['fa2', 'rect', 'FA 2', 1, 0, 'accent', 'a2  b2  → s2'],
        ['fa1', 'rect', 'FA 1', 2, 0, 'accent', 'a1  b1  → s1'],
        ['fa0', 'rect', 'FA 0', 3, 0, 'accent', 'a0  b0  → s0'],
        ['cin', 'terminator', 'Cin = 0', 4, 0, 'info'],
      ],
      [
        ['cin', 'fa0'],
        ['fa0', 'fa1', 'c1'],
        ['fa1', 'fa2', 'c2'],
        ['fa2', 'fa3', 'c3'],
        ['fa3', 'cout'],
      ],
      { dx: 150, dy: 80, w: 125, at: 'end' },
    ),
    circuit(
      'mux-circuit',
      'Multiplexers',
      'A 2-to-1 multiplexer made of gates. The select line S goes through a NOT gate. One AND gate lets input A through when S is 0, another lets input B through when S is 1, and an OR gate combines them into the output Y.',
      'S = 0 copies A to the output; S = 1 copies B. Toggle S and watch Y follow a different input.',
      {
        inputs: ['A', 'B', 'S'],
        gates: [
          { id: 'ns', type: 'NOT', in: ['S'], label: 'S′' },
          { id: 't1', type: 'AND', in: ['A', 'ns'], label: 'A·S′' },
          { id: 't2', type: 'AND', in: ['B', 'S'], label: 'B·S' },
          { id: 'y', type: 'OR', in: ['t1', 't2'], label: 'Y' },
        ],
        outputs: [{ id: 'Y', from: 'y', label: 'Y' }],
        truthTable: true,
      },
      { at: 'end' },
    ),
    circuit(
      'decoder-circuit',
      'Decoders (and encoders)',
      'A 2-to-4 decoder made of gates. Two NOT gates invert A1 and A0, and four AND gates combine the inputs so that exactly one of the outputs D0 to D3 is 1 for each of the four input codes.',
      'Exactly one output is 1: the one whose number is the input code. Try 00, 01, 10 and 11.',
      {
        inputs: ['A1', 'A0'],
        gates: [
          { id: 'n1', type: 'NOT', in: ['A1'], label: 'A1′' },
          { id: 'n0', type: 'NOT', in: ['A0'], label: 'A0′' },
          { id: 'd0', type: 'AND', in: ['n1', 'n0'], label: 'D0' },
          { id: 'd1', type: 'AND', in: ['n1', 'A0'], label: 'D1' },
          { id: 'd2', type: 'AND', in: ['A1', 'n0'], label: 'D2' },
          { id: 'd3', type: 'AND', in: ['A1', 'A0'], label: 'D3' },
        ],
        outputs: [
          { id: 'D0', from: 'd0', label: 'D0' },
          { id: 'D1', from: 'd1', label: 'D1' },
          { id: 'D2', from: 'd2', label: 'D2' },
          { id: 'D3', from: 'd3', label: 'D3' },
        ],
        truthTable: true,
      },
      { at: 'end' },
    ),
    lab(
      'ripple-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that models a four-bit ripple-carry adder with a subtract control and checks all 256 additions, with its expected output.',
      'Try 15 + 1 and 8 - 9: what do the carry-out and the result tell you?',
      `def half_adder(a, b):
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
print("all 256 additions correct:", all(add4(x, y)[0] == (x + y) % 16 and add4(x, y)[1] == (x + y) // 16 for x in range(16) for y in range(16)))`,
      { expected: ' 6 + 7 = 1101 (13), carry-out 0\n 9 + 9 = 0010 ( 2), carry-out 1\n 9 - 5 = 0100 ( 4), carry-out 1\n 3 - 5 = 1110 (14), carry-out 0\nall 256 additions correct: True', filename: 'ripple.py', at: 'end' },
    ),
  ],
  [`${M}/4`]: [
    circuit(
      'sr-latch-circuit',
      'Latches and flip-flops',
      'An SR latch made of two NOR gates wired in a loop. The output of each gate feeds an input of the other. Setting S to 1 makes Q equal to 1, and it stays 1 when S returns to 0; setting R to 1 makes Q equal to 0. With both inputs 0 the latch remembers its last value.',
      'Two NOR gates holding each other in place: the loop is the memory. Click S, then R, then neither, and watch Q remember. (Avoid S = R = 1.)',
      {
        inputs: ['S', 'R'],
        gates: [
          { id: 'q', type: 'NOR', in: ['R', 'qn'], label: 'NOR' },
          { id: 'qn', type: 'NOR', in: ['S', 'q'], label: 'NOR' },
        ],
        outputs: [
          { id: 'Q', from: 'q', label: 'Q' },
          { id: 'Qn', from: 'qn', label: 'Q′' },
        ],
      },
      { at: 'end' },
    ),
    circuit(
      'register-bit-circuit',
      'Registers',
      'A one-bit register with a load control. A multiplexer made of gates chooses the flip-flop input: when Load is 1 it passes the new data D, and when Load is 0 it passes the flip-flop’s own output Q, fed back. The D flip-flop captures the chosen value at each clock edge.',
      'Load = 1: the next clock edge captures D. Load = 0: Q is fed back, so the register holds. Set the inputs, then press the clock.',
      {
        inputs: ['D', 'L'],
        gates: [
          { id: 'nl', type: 'NOT', in: ['L'], label: 'L′' },
          { id: 'a', type: 'AND', in: ['D', 'L'], label: 'D·L' },
          { id: 'b', type: 'AND', in: ['q', 'nl'], label: 'Q·L′' },
          { id: 'm', type: 'OR', in: ['a', 'b'], label: 'mux' },
          { id: 'q', type: 'DFF', in: ['m'], label: 'D flip-flop' },
        ],
        outputs: [{ id: 'Q', from: 'q', label: 'Q' }],
      },
      { at: 'end' },
    ),
    circuit(
      'counter-circuit',
      'Counters',
      'A three-bit synchronous counter with an enable input. Three T flip-flops share the clock. The first toggles when the enable is 1, the second toggles when the enable and the first bit are both 1, and the third toggles when the enable and the first two bits are all 1. Each clock edge counts up by one.',
      'Press the clock repeatedly with En = 1 and read Q2 Q1 Q0 as a binary number: 000, 001, 010, 011, ... and back to 000.',
      {
        inputs: [{ id: 'En', value: 1 }],
        gates: [
          { id: 'f0', type: 'TFF', in: ['En'], label: 'T0' },
          { id: 'a1', type: 'AND', in: ['En', 'f0'], label: 'En·Q0' },
          { id: 'f1', type: 'TFF', in: ['a1'], label: 'T1' },
          { id: 'a2', type: 'AND', in: ['a1', 'f1'], label: 'En·Q0·Q1' },
          { id: 'f2', type: 'TFF', in: ['a2'], label: 'T2' },
        ],
        outputs: [
          { id: 'Q0', from: 'f0', label: 'Q0' },
          { id: 'Q1', from: 'f1', label: 'Q1' },
          { id: 'Q2', from: 'f2', label: 'Q2' },
        ],
      },
      { at: 'end' },
    ),
    automaton(
      'detect-101',
      'State machines',
      'A state diagram of a machine that detects the bit pattern 101. State S0 means nothing useful has been seen, S1 means the last bit was 1, S10 means the last two bits were 10, and S101 means the pattern has just been completed. After a match the machine moves to S10 on a 0 or to S1 on a 1, so overlapping matches are found.',
      'The same kind of diagram as the automata of Course 4. In hardware the state number is stored in flip-flops. Try the test strings.',
      ['S0', 'S1', 'S10', 'S101'],
      'S0',
      ['S101'],
      [
        ['S0', 'S0', '0'],
        ['S0', 'S1', '1'],
        ['S1', 'S10', '0'],
        ['S1', 'S1', '1'],
        ['S10', 'S0', '0'],
        ['S10', 'S101', '1'],
        ['S101', 'S10', '0'],
        ['S101', 'S1', '1'],
      ],
      { at: 'end', test: ['101', '1011', '10101', '100'] },
    ),
    lab(
      'register-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program that models a four-bit register with a load enable and prints its value after six clock edges, with its expected output.',
      'Change the sequence so that the register loads 15, holds for two cycles and then loads 0.',
      `class Register4:
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
    print(f"{cycle:>5}  {load:>4}  {data:>4}  {q:04b} ({q})")`,
      { expected: 'cycle  load  data  Q after the clock edge\n    1     1     5  0101 (5)\n    2     0     9  0101 (5)\n    3     0     3  0101 (5)\n    4     1    12  1100 (12)\n    5     0     7  1100 (12)\n    6     1    20  0100 (4)', filename: 'register.py', at: 'end' },
    ),
  ],
  [`${M}/5`]: [
    grid(
      'cpu-block-diagram',
      'The parts of a CPU',
      'A block diagram of the toy CPU and its memory. The program counter holds an address that goes to memory. The instruction that comes back is stored in the instruction register, whose opcode goes to the control unit. The control unit sends control signals, shown dashed, to the registers and to the ALU. The registers and the ALU exchange data, and the ALU reports the Zero and Carry flags to the control unit.',
      'Solid arrows carry addresses and data; dashed arrows carry control signals. The control unit is the conductor of the orchestra.',
      [
        ['mem', 'cylinder', 'Memory', 0, 1, 'info', 'program and data'],
        ['pc', 'rect', 'PC', 1.4, 0, 'accent', 'next address'],
        ['ir', 'rect', 'IR', 1.4, 1.2, 'accent', 'current instruction'],
        ['cu', 'rect', 'Control unit', 3, 0.6, 'warn', 'decodes the opcode'],
        ['regs', 'rect', 'Registers A, B', 1.4, 2.5, 'good', 'fast storage'],
        ['alu', 'rect', 'ALU', 3, 2.5, 'good', 'result, flags Z and C'],
      ],
      [
        ['pc', 'mem', 'address'],
        ['mem', 'ir', 'instruction'],
        ['ir', 'cu', 'opcode'],
        ['cu', 'regs', 'control signals', { dashed: true }],
        ['cu', 'alu', 'control signals', { dashed: true }],
        ['regs', 'alu', 'data', { head: 'both' }],
        ['alu', 'cu', 'flags Z, C', { dashed: true }],
      ],
      { dx: 215, dy: 100, w: 175, at: 'end' },
    ),
    flow(
      'instruction-cycle',
      'The instruction cycle: fetch, decode, execute',
      'A cycle of four steps. Fetch copies the instruction at the address in the program counter into the instruction register and increases the program counter. Decode lets the control unit read the opcode. Execute carries out the instruction with the ALU, the registers, memory or the program counter. Then the cycle repeats with the next instruction until a HALT.',
      'Three phases, repeated billions of times per second. A jump simply overwrites PC, so the next fetch happens somewhere else.',
      ['Fetch|IR ← memory[PC]; PC ← PC + 1|accent', 'Decode|the control unit reads the opcode|accent2', 'Execute|ALU, registers, memory or PC|good', 'Repeat|until HALT'],
      { layout: 'cycle', at: 'end' },
    ),
    asmLab(
      'first-program-lab',
      'Example 2',
      'An assembly simulator with the program of Example 2, which loads the numbers 12 and 30 from memory, adds them and stores the sum 42 at address 2. Step through it and watch the program counter, the instruction register, the registers and the flags.',
      'Press Step and watch PC, IR, A, B and the flags. Predict each result before you press.',
      `LOAD A, 0        ; A = memory[0]
LOAD B, 1        ; B = memory[1]
ADD A, B         ; A = A + B, and set the flags
STORE A, 2       ; memory[2] = A
HALT`,
      { memory: [12, 30], memorySize: 16, editable: true, at: 'end' },
    ),
    asmLab(
      'loop-lab',
      'Example 3',
      'An assembly simulator with a loop that adds 5, 4, 3, 2 and 1. DEC sets the Zero flag when B reaches 0, and JNZ jumps back to the label loop while the Zero flag is 0. At the end A holds 15.',
      'Watch the jump: JNZ loads PC with the address of the label loop until Z becomes 1.',
      `      LOADI A, 0       ; running total
      LOADI B, 5       ; counter
loop: ADD A, B         ; total = total + counter
      DEC B            ; counter = counter - 1 (sets Z when it reaches 0)
      JNZ loop         ; jump back while the counter is not zero
      HALT`,
      { memorySize: 16, editable: true, at: 'end' },
    ),
    lab(
      'alu-flags-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program that models an eight-bit ALU producing a result, a Zero flag and a Carry flag for ADD, SUB, AND and OR, with its expected output.',
      'Add the case SUB 0, 1 and predict the result and the flags before you run it.',
      `def alu(op, a, b, bits=8):
    mask = (1 << bits) - 1
    raw = {"ADD": a + b, "SUB": a - b, "AND": a & b, "OR": a | b}[op]
    result = raw & mask
    zero = int(result == 0)
    carry = int(raw > mask or raw < 0)           # carry-out of an addition, or a borrow in a subtraction
    return result, zero, carry


print("op   a   b | result  Z  C")
for op, a, b in (("ADD", 200, 100), ("ADD", 20, 30), ("SUB", 5, 5), ("SUB", 3, 5), ("AND", 12, 10), ("OR", 12, 10)):
    result, z, c = alu(op, a, b)
    print(f"{op:<3} {a:>3} {b:>3} | {result:>6}  {z}  {c}")`,
      { expected: 'op   a   b | result  Z  C\nADD 200 100 |     44  0  1\nADD  20  30 |     50  0  0\nSUB   5   5 |      0  1  0\nSUB   3   5 |    254  0  1\nAND  12  10 |      8  0  0\nOR   12  10 |     14  0  0', filename: 'alu.py', at: 'end' },
    ),
  ],
  [`${M}/6`]: [
    grid(
      'memory-hierarchy',
      'Speed, size and cost',
      'A vertical diagram of the memory hierarchy with five levels from the CPU registers at the top to the SSD or hard disk at the bottom. Each level is bigger, cheaper per byte and slower than the one above it: registers about 0.3 nanoseconds and tens of bytes, L1 cache about 1 nanosecond and 32 to 64 kibibytes, L2 and L3 cache 4 to 40 nanoseconds and 1 to 32 mebibytes, main memory 60 to 100 nanoseconds and 4 to 64 gibibytes, SSD or hard disk 0.1 to 5 milliseconds and up to 20 terabytes. Arrows labelled miss show that a request moves down to the next level when the data is not found.',
      'Each level holds copies of the most used data of the level below it. A request travels down only when the faster level misses.',
      [
        ['reg', 'rect', 'CPU registers', 0, 0, 'accent', '0.3 ns · tens of bytes · flip-flops'],
        ['l1', 'rect', 'L1 cache', 0, 1, 'good', '1 ns · 32 to 64 KiB · SRAM'],
        ['l2', 'rect', 'L2 / L3 cache', 0, 2, 'good', '4 to 40 ns · 1 to 32 MiB · SRAM'],
        ['ram', 'cylinder', 'Main memory (RAM)', 0, 3, 'info', '60 to 100 ns · 4 to 64 GiB · DRAM'],
        ['disk', 'cylinder', 'SSD / hard disk', 0, 4, 'warn', '0.1 to 5 ms · up to 20 TB · persistent'],
      ],
      [
        ['reg', 'l1', 'miss'],
        ['l1', 'l2', 'miss'],
        ['l2', 'ram', 'miss'],
        ['ram', 'disk', 'page fault'],
      ],
      { dy: 96, w: 330, at: 'start' },
    ),
    table(
      'human-scale-table',
      'Speed, size and cost',
      'A table that rescales the access times of the memory levels so that a register access lasts one second. An L1 access then takes about 3 seconds, L2 or L3 13 seconds to 2 minutes, RAM 3 to 6 minutes, an SSD about 4 days and a hard disk about 6 months.',
      'Nanoseconds are hard to feel. If a register access took one second, waiting for the disk would take half a year.',
      ['Level', 'Real time', 'If a register access took 1 second'],
      [
        ['Registers', '0.3 ns', '1 second'],
        ['L1 cache', '1 ns', 'about 3 seconds'],
        ['L2 / L3 cache', '4 to 40 ns', '13 seconds to 2 minutes'],
        ['Main memory (RAM)', '60 to 100 ns', '3 to 6 minutes'],
        ['SSD', '0.1 ms', 'about 4 days'],
        ['Hard disk', '5 ms', 'about 6 months'],
      ],
      { at: 'end', highlights: [{ row: 3, col: 2, tone: 'warn', note: 'A coffee break' }, { row: 5, col: 2, tone: 'bad', note: 'Half a year' }] },
    ),
    trace(
      'cache-check-trace',
      'How a cache works',
      'A step-through of a direct-mapped cache with 4 lines of 4 words handling the addresses 0, 1, 16 and 0. Address 0 is a miss and is stored in line 0 with tag 0. Address 1 is in the same block, so it is a hit. Address 16 is in block 4, which also maps to line 0 but has tag 1, so it is a miss that replaces block 0. Address 0 then misses again, because its block was evicted: a conflict miss.',
      'The check in three lines: block number, index (which line) and tag (which block is in that line). A hit needs the stored tag to match.',
      [
        'tags = [None] * 4                  # 4 cache lines, all empty',
        'for address in addresses:',
        '    block_number = address // 4    # which block of 4 words',
        '    index = block_number % 4       # which cache line',
        '    tag = block_number // 4        # which block shares that line',
        '    hit = tags[index] == tag',
        '    tags[index] = tag              # the line now holds this block',
      ],
      [
        { line: 1, vars: { tags: '[-, -, -, -]' }, note: 'An empty cache: four lines, nothing stored. A dash means empty.' },
        { line: 3, vars: { address: 0, block_number: 0, tags: '[-, -, -, -]' }, note: 'Address 0 lies in block 0 (0 // 4).' },
        { line: 4, vars: { address: 0, block_number: 0, index: 0, tags: '[-, -, -, -]' }, note: 'Block 0 belongs in cache line 0 (0 % 4).' },
        { line: 5, vars: { address: 0, block_number: 0, index: 0, tag: 0, tags: '[-, -, -, -]' }, note: 'The tag says which block is stored in the line: block number // 4.' },
        { line: 6, vars: { address: 0, block_number: 0, index: 0, tag: 0, hit: 'False', tags: '[-, -, -, -]' }, note: 'Line 0 is empty: a miss (M).' },
        { line: 7, vars: { address: 0, block_number: 0, index: 0, tag: 0, hit: 'False', tags: '[0, -, -, -]' }, note: 'Block 0 is now stored in line 0 with tag 0.' },
        { line: 5, vars: { address: 1, block_number: 0, index: 0, tag: 0, tags: '[0, -, -, -]' }, note: 'Address 1 is in the same block 0: same line, same tag.' },
        { line: 6, vars: { address: 1, block_number: 0, index: 0, tag: 0, hit: 'True', tags: '[0, -, -, -]' }, note: 'The line holds tag 0, which equals the tag asked for: a hit (H). This is spatial locality.' },
        { line: 5, vars: { address: 16, block_number: 4, index: 0, tag: 1, tags: '[0, -, -, -]' }, note: 'Address 16 is in block 4. Its line is 4 % 4 = 0, the same line as block 0, and its tag is 1.' },
        { line: 6, vars: { address: 16, block_number: 4, index: 0, tag: 1, hit: 'False', tags: '[0, -, -, -]' }, note: 'Line 0 holds tag 0, not 1: a miss, although most of the cache is empty. This is a conflict miss.' },
        { line: 7, vars: { address: 16, block_number: 4, index: 0, tag: 1, hit: 'False', tags: '[1, -, -, -]' }, note: 'Block 4 replaces block 0 in line 0.' },
        { line: 5, vars: { address: 0, block_number: 0, index: 0, tag: 0, tags: '[1, -, -, -]' }, note: 'Back to address 0: block 0 maps to line 0 again.' },
        { line: 6, vars: { address: 0, block_number: 0, index: 0, tag: 0, hit: 'False', tags: '[1, -, -, -]' }, note: 'Line 0 now holds tag 1: another miss. Blocks 0 and 4 keep evicting each other.' },
        { line: 7, vars: { address: 0, block_number: 0, index: 0, tag: 0, hit: 'False', tags: '[0, -, -, -]' }, note: 'Ping-pong: with this access pattern a direct-mapped cache never hits.' },
      ],
      { at: 'end' },
    ),
    V(
      'chart',
      'amat-vs-miss-rate',
      'Average memory access time',
      'A line chart of the average memory access time in nanoseconds against the miss rate of the L1 cache, for a hit time of 1 ns and a miss penalty of 100 ns. The average time rises from 3 ns at a 2 percent miss rate to 6 ns at 5 percent, 11 ns at 10 percent and 21 ns at 20 percent. A flat line at 100 ns shows main memory without any cache.',
      'AMAT = 1 + miss rate × 100 ns. Even a 20% miss rate is five times faster than no cache at all, and each cut in the miss rate pays off.',
      {
        kind: 'line',
        xLabel: 'L1 miss rate',
        yLabel: 'Average access time (ns)',
        categories: ['2%', '5%', '10%', '20%'],
        series: [
          { name: 'With an L1 cache', values: [3, 6, 11, 21] },
          { name: 'RAM only', values: [100, 100, 100, 100] },
        ],
      },
      { at: 'end' },
    ),
    table(
      'array-layout-table',
      'Example 3',
      'A table of the addresses of an 8 by 8 array stored row by row, from 0 in the top left corner to 63 in the bottom right. Walking along row 0 visits the neighbouring addresses 0 to 7, which fill just two cache blocks. Walking down column 0 visits the addresses 0, 8, 16 and so on up to 56, eight words apart, so every access is in a different block.',
      'Row-major storage: the address of element [r][c] is r × 8 + c. Green cells are what a row-by-row loop touches first; red cells are what a column-by-column loop touches.',
      ['', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
      [
        ['r0', 0, 1, 2, 3, 4, 5, 6, 7],
        ['r1', 8, 9, 10, 11, 12, 13, 14, 15],
        ['r2', 16, 17, 18, 19, 20, 21, 22, 23],
        ['r3', 24, 25, 26, 27, 28, 29, 30, 31],
        ['r4', 32, 33, 34, 35, 36, 37, 38, 39],
        ['r5', 40, 41, 42, 43, 44, 45, 46, 47],
        ['r6', 48, 49, 50, 51, 52, 53, 54, 55],
        ['r7', 56, 57, 58, 59, 60, 61, 62, 63],
      ],
      {
        at: 'end',
        highlights: [
          { row: 0, col: 2, tone: 'good', note: 'Along a row: neighbours' },
          { row: 0, col: 3, tone: 'good' },
          { row: 0, col: 4, tone: 'good' },
          { row: 0, col: 5, tone: 'good' },
          { row: 0, col: 6, tone: 'good' },
          { row: 0, col: 7, tone: 'good' },
          { row: 0, col: 8, tone: 'good' },
          { row: 1, col: 1, tone: 'bad', note: 'Down a column: 8 apart' },
          { row: 2, col: 1, tone: 'bad' },
          { row: 3, col: 1, tone: 'bad' },
          { row: 4, col: 1, tone: 'bad' },
          { row: 5, col: 1, tone: 'bad' },
          { row: 6, col: 1, tone: 'bad' },
          { row: 7, col: 1, tone: 'bad' },
          { row: 0, col: 1, tone: 'accent' },
        ],
      },
    ),
    lab(
      'cache-lab',
      'Example 2',
      'python',
      'A Python editor with a direct-mapped cache simulator for 4 lines of 4 words, run on three access patterns: the sequential addresses 0 to 31 with a 75 percent hit rate, the ping-pong pattern 0 and 16 with no hits, and a small loop over the addresses 0, 4, 8 and 12 repeated six times with a hit rate of 83 percent, with its expected output.',
      'Change lines to 8 and run again, then invent a pattern that makes this cache miss every time.',
      `def simulate(addresses, lines=4, block=4):
    tags = [None] * lines
    hits, log = 0, []
    for address in addresses:
        block_number = address // block
        index = block_number % lines
        tag = block_number // lines
        hit = tags[index] == tag
        hits += hit
        tags[index] = tag
        log.append("H" if hit else "M")
    return hits, "".join(log)


patterns = (
    ("sequential 0..31", list(range(32))),
    ("ping-pong 0, 16", [0, 16] * 8),
    ("loop 0, 4, 8, 12", [0, 4, 8, 12] * 6),
)
for name, pattern in patterns:
    hits, log = simulate(pattern)
    print(f"{name:<18}{hits:>2}/{len(pattern)} hits = {hits / len(pattern):>4.0%}")
    print("  ", log)`,
      {
        expected: 'sequential 0..31  24/32 hits =  75%\n   MHHHMHHHMHHHMHHHMHHHMHHHMHHHMHHH\nping-pong 0, 16    0/16 hits =   0%\n   MMMMMMMMMMMMMMMM\nloop 0, 4, 8, 12  20/24 hits =  83%\n   MMMMHHHHHHHHHHHHHHHHHHHH',
        filename: 'cache.py',
        at: 'end',
      },
    ),
    circuit(
      'rom-squares-circuit',
      'RAM, ROM and address decoding',
      'A tiny read-only memory with two address lines A1 and A0 that stores the squares 0, 1, 4 and 9 in four bits. NOT gates and AND gates decode the address into one word line for each of the addresses 1, 2 and 3. The data bit D3 comes straight from the word line of address 3, D2 from the word line of address 2, and D0 from an OR gate that joins the word lines of addresses 1 and 3. Bit D1 is always 0, so it needs no gate.',
      'A ROM is a decoder plus OR gates. Set the address A1 A0 and read the square on D3 D2 D0 (D1 is always 0): address 3 gives 1001, which is 9.',
      {
        inputs: ['A1', 'A0'],
        gates: [
          { id: 'na1', type: 'NOT', in: ['A1'], label: 'A1′' },
          { id: 'na0', type: 'NOT', in: ['A0'], label: 'A0′' },
          { id: 'w1', type: 'AND', in: ['na1', 'A0'], label: 'word 1' },
          { id: 'w2', type: 'AND', in: ['A1', 'na0'], label: 'word 2' },
          { id: 'w3', type: 'AND', in: ['A1', 'A0'], label: 'word 3' },
          { id: 'd0', type: 'OR', in: ['w1', 'w3'], label: 'D0' },
        ],
        outputs: [
          { id: 'D3', from: 'w3', label: 'D3 (8)' },
          { id: 'D2', from: 'w2', label: 'D2 (4)' },
          { id: 'D0', from: 'd0', label: 'D0 (1)' },
        ],
        truthTable: true,
      },
      { at: 'end' },
    ),
  ],
  [`${M}/7`]: [
    table(
      'instruction-format-table',
      'Machine instructions and the instruction set',
      'A table that shows six toy-CPU instructions split into the four fields of their 16-bit machine word: the 4-bit opcode, the 1-bit register, the 3-bit addressing mode and the 8-bit operand, with the word written in hexadecimal. LOADI A, 10 is 110A, LOAD B, [A] is 2C00, STORE A, 5 is 3205, ADD A, B is 5301, JNZ loop with the label at address 2 is E002 and HALT is 0000.',
      'The same format for every instruction. The mode field says how to read the operand: 001 immediate, 010 direct, 011 register, 100 register indirect.',
      ['Assembly', 'Opcode', 'Reg', 'Mode', 'Operand', 'Word'],
      [
        ['LOADI A, 10', '0001', '0', '001', '00001010', '110A'],
        ['LOAD B, [A]', '0010', '1', '100', '00000000', '2C00'],
        ['STORE A, 5', '0011', '0', '010', '00000101', '3205'],
        ['ADD A, B', '0101', '0', '011', '00000001', '5301'],
        ['JNZ loop (loop is at address 2)', '1110', '0', '000', '00000010', 'E002'],
        ['HALT', '0000', '0', '000', '00000000', '0000'],
      ],
      { at: 'end', highlights: [{ row: 1, col: 3, tone: 'info', note: 'register indirect' }, { row: 2, col: 3, tone: 'accent', note: 'direct' }, { row: 4, col: 4, tone: 'good', note: 'a label became an address' }] },
    ),
    flow(
      'toolchain-flow',
      'Assembly language and the assembler',
      'A chain of six steps from a C program to a running program: C source code goes into the compiler, which produces assembly language; the assembler turns the assembly into machine code; the CPU fetches, decodes and executes the machine code.',
      'Assembly is the middle of the chain. The compiler writes it, the assembler turns it into numbers, and the CPU only ever sees the numbers.',
      ['C source|if, while, printf|accent', 'Compiler|C becomes assembly|info', 'Assembly|LOAD, ADD, JNZ|accent2', 'Assembler|text becomes numbers|info', 'Machine code|binary words|good', 'CPU|fetch, decode, execute|warn'],
      { layout: 'row', perRow: 3, at: 'end' },
    ),
    table(
      'addressing-modes-table',
      'Addressing modes',
      'A table of the four addressing modes of the toy CPU. Immediate: LOADI A, 9 uses the number inside the instruction, like a = 9 in C. Register: MOV B, A uses a register, like b = a. Direct: LOAD A, 5 holds the memory address in the instruction, like reading a variable. Register indirect: LOAD A, [B] takes the address from a register, like a = *p with a pointer.',
      'Where does the operand come from? From the instruction, from a register, from a fixed address or from an address held in a register.',
      ['Mode', 'Example', 'The operand comes from...', 'In C'],
      [
        ['Immediate', 'LOADI A, 9', 'the instruction itself', 'a = 9;'],
        ['Register', 'MOV B, A', 'a register', 'b = a;'],
        ['Direct', 'LOAD A, 5', 'the memory cell whose address is in the instruction', 'a = score;'],
        ['Register indirect', 'LOAD A, [B]', 'the memory cell whose address is in register B', 'a = *p;'],
      ],
      { at: 'end', highlights: [{ row: 3, col: 3, tone: 'good', note: 'a pointer' }] },
    ),
    compare(
      'if-else-compare',
      'Control flow',
      'Two tables side by side. On the left, a C if/else that sets r to 1 when a equals b and to 2 otherwise. On the right, the same decision in toy assembly: CMP A, B sets the zero flag, JZ then jumps to the then-part when the numbers are equal, the else-part loads 2 into A and jumps to the end with JMP end, and the then-part loads 1 into A.',
      'The same decision twice. The word if disappears: a comparison, a conditional jump and an unconditional jump do all the work.',
      { title: 'C', columns: ['Line', 'Code'], rows: [[1, 'if (a == b) {'], [2, '    r = 1;'], [3, '} else {'], [4, '    r = 2;'], [5, '}']] },
      { title: 'Toy assembly', columns: ['Line', 'Code'], rows: [[1, 'CMP A, B'], [2, 'JZ then'], [3, 'LOADI A, 2'], [4, 'JMP end'], [5, 'then: LOADI A, 1'], [6, 'end: ...']], highlights: [{ row: 1, col: 1, tone: 'warn', note: 'jump when equal' }, { row: 3, col: 1, tone: 'info', note: 'skip the then-part' }] },
      { arrowLabel: 'compiler', at: 'end' },
    ),
    lab(
      'assembler-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program, a two-pass assembler and a disassembler for the toy CPU, which turns the loop program of Lesson 5 into six 16-bit machine words, with its expected output.',
      'Replace the SOURCE with the program of Example 2 and look at the mode field of STORE A, 5 and LOAD A, [B].',
      `OPCODES = {"HALT": 0, "LOADI": 1, "LOAD": 2, "STORE": 3, "MOV": 4, "ADD": 5, "SUB": 6, "AND": 7,
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
print("labels:", labels)`,
      {
        expected: 'addr  op   r mod operand   hex   decoded\n   0  0001 0 001 00000000   1100  LOADI A, 0\n   1  0001 1 001 00000101   1905  LOADI B, 5\n   2  0101 0 011 00000001   5301  ADD A, B\n   3  1010 1 000 00000000   A800  DEC B\n   4  1110 0 000 00000010   E002  JNZ 2\n   5  0000 0 000 00000000   0000  HALT\nlabels: {\'loop\': 2}',
        filename: 'assembler.py',
        at: 'end',
      },
    ),
    asmLab(
      'modes-lab',
      'Example 2',
      'An assembly simulator with the program of Example 2, a tour of the addressing modes: LOADI loads a constant, STORE writes it to memory cell 5 with direct addressing, LOAD A, [B] reads it back through the address held in register B, and MOV copies a register. At the end A, B and memory cell 5 all hold 9.',
      'Press Step and read the decode line: it names the addressing mode of every instruction.',
      `      LOADI A, 9        ; immediate: the value 9 is inside the instruction
      STORE A, 5        ; direct: memory[5] = A
      LOADI B, 5        ; B now holds an address
      LOADI A, 0        ; clear A, to prove that the next load really works
      LOAD A, [B]       ; register indirect: A = memory[B] = memory[5]
      MOV B, A          ; register: B = A
      HALT`,
      { memorySize: 16, editable: true, at: 'end' },
    ),
    asmLab(
      'fill-lab',
      'Example 3',
      'An assembly simulator with a loop that fills memory using register indirect addressing. Register B holds the address and is also the value stored: STORE B, [B] writes 7 into cell 7, then 6 into cell 6, down to 1 into cell 1. DEC B sets the zero flag when B reaches 0, which ends the loop before cell 0 is written.',
      'Watch the memory panel fill from cell 7 downwards, and notice that cell 0 is never written.',
      `      LOADI B, 7        ; B is the address of the cell to fill
fill: STORE B, [B]      ; memory[B] = B
      DEC B             ; the next cell down (Z = 1 when B reaches 0)
      JNZ fill          ; repeat while B is not zero
      HALT`,
      { memorySize: 16, editable: true, at: 'end' },
    ),
    asmLab(
      'project-workbench',
      'Instructions',
      'A blank assembly workbench for the lesson project, an editable simulator whose data memory starts with the numbers 12, 30 and 7. It holds a single HALT instruction; write each of the four programs here, run it and read the registers, flags and memory.',
      'Your workbench. Write a program, press Run, and compare the final state with the expected output. Change the memory cells to test other numbers.',
      `; Program 1: add the numbers in cells 0, 1 and 2 and store the sum in cell 3
; Write your instructions here, one per line, each with a comment.
      HALT`,
      { memory: [12, 30, 7], memorySize: 16, editable: true, at: 'end' },
    ),
  ],
  [`${M}/8`]: [
    cards(
      'five-components',
      'Computer organisation',
      'Five cards for the five classic parts of a computer. Input: keyboard, mouse, microphone and network in. Output: display, speakers, printer and network out. Memory: cache, main memory and storage. Datapath: the ALU, the registers and the internal buses. Control: the control unit that sequences everything and answers interrupts.',
      'Every computer, from a phone to a supercomputer, is these five parts joined by buses.',
      [
        { title: 'Input', subtitle: 'brings data in', bullets: ['keyboard, mouse, touch screen', 'microphone, camera, sensors', 'network card (receive)'], tone: 'info' },
        { title: 'Output', subtitle: 'sends results out', bullets: ['display, speakers, printer', 'motors and lights', 'network card (send)'], tone: 'good' },
        { title: 'Memory', subtitle: 'holds programs and data', bullets: ['registers and cache', 'main memory (RAM)', 'SSD and hard disk'], tone: 'warn' },
        { title: 'Datapath', subtitle: 'does the work', bullets: ['ALU and flags', 'registers', 'internal buses'], tone: 'accent' },
        { title: 'Control', subtitle: 'decides what happens next', bullets: ['decodes instructions', 'sends control signals', 'answers interrupts'], tone: 'accent2' },
      ],
      { at: 'end' },
    ),
    gantt(
      'pipeline-ideal',
      'Pipelining',
      'A timing diagram of an ideal five-stage pipeline running five instructions. Each row is one instruction and each column one clock cycle. Instruction 1 goes through IF, ID, EX, MEM and WB in cycles 1 to 5; instruction 2 starts one cycle later, and so on, so the fifth instruction finishes in cycle 9 instead of cycle 25 without a pipeline.',
      'The staircase: every cycle a new instruction enters and an old one leaves. Five instructions finish in 5 + 5 - 1 = 9 cycles.',
      ['I1', 'I2', 'I3', 'I4', 'I5'],
      [
        { lane: 'I1', start: 0, end: 1, label: 'IF', tone: 'info' },
        { lane: 'I1', start: 1, end: 2, label: 'ID', tone: 'accent' },
        { lane: 'I1', start: 2, end: 3, label: 'EX', tone: 'good' },
        { lane: 'I1', start: 3, end: 4, label: 'MEM', tone: 'warn' },
        { lane: 'I1', start: 4, end: 5, label: 'WB', tone: 'accent2' },
        { lane: 'I2', start: 1, end: 2, label: 'IF', tone: 'info' },
        { lane: 'I2', start: 2, end: 3, label: 'ID', tone: 'accent' },
        { lane: 'I2', start: 3, end: 4, label: 'EX', tone: 'good' },
        { lane: 'I2', start: 4, end: 5, label: 'MEM', tone: 'warn' },
        { lane: 'I2', start: 5, end: 6, label: 'WB', tone: 'accent2' },
        { lane: 'I3', start: 2, end: 3, label: 'IF', tone: 'info' },
        { lane: 'I3', start: 3, end: 4, label: 'ID', tone: 'accent' },
        { lane: 'I3', start: 4, end: 5, label: 'EX', tone: 'good' },
        { lane: 'I3', start: 5, end: 6, label: 'MEM', tone: 'warn' },
        { lane: 'I3', start: 6, end: 7, label: 'WB', tone: 'accent2' },
        { lane: 'I4', start: 3, end: 4, label: 'IF', tone: 'info' },
        { lane: 'I4', start: 4, end: 5, label: 'ID', tone: 'accent' },
        { lane: 'I4', start: 5, end: 6, label: 'EX', tone: 'good' },
        { lane: 'I4', start: 6, end: 7, label: 'MEM', tone: 'warn' },
        { lane: 'I4', start: 7, end: 8, label: 'WB', tone: 'accent2' },
        { lane: 'I5', start: 4, end: 5, label: 'IF', tone: 'info' },
        { lane: 'I5', start: 5, end: 6, label: 'ID', tone: 'accent' },
        { lane: 'I5', start: 6, end: 7, label: 'EX', tone: 'good' },
        { lane: 'I5', start: 7, end: 8, label: 'MEM', tone: 'warn' },
        { lane: 'I5', start: 8, end: 9, label: 'WB', tone: 'accent2' },
      ],
      { max: 9, unit: 'cycle', at: 'end' },
    ),
    V(
      'chart',
      'pipeline-speedup',
      'Pipelining',
      'A line chart of the ideal speed-up of a five-stage pipeline against the number of instructions. The speed-up is 1.0 for one instruction, 1.67 for two, 2.78 for five, 3.57 for ten, 4.81 for one hundred and 4.98 for one thousand, approaching but never reaching 5.',
      'Speed-up = 5n / (n + 4). Short programs see little benefit; long ones approach the number of stages.',
      {
        kind: 'line',
        xLabel: 'Number of instructions n',
        yLabel: 'Speed-up over no pipeline',
        categories: ['1', '2', '5', '10', '100', '1000'],
        series: [{ name: 'Five-stage pipeline', values: [1, 1.67, 2.78, 3.57, 4.81, 4.98] }],
      },
      { at: 'end' },
    ),
    table(
      'hazard-table',
      'Pipeline hazards',
      'A table of the three kinds of pipeline hazard. A structural hazard is two instructions needing the same hardware, for example a single memory port, and is fixed by duplicating the hardware. A data hazard is an instruction needing a result that is not ready, as in ADD right after LW, and is fixed by forwarding, stalls or reordering. A control hazard is a branch whose direction is not yet known, fixed by branch prediction.',
      'Three reasons for waiting, and the usual cure for each.',
      ['Hazard', 'Cause', 'Example', 'Usual remedy'],
      [
        ['Structural', 'two instructions need the same hardware in the same cycle', 'one memory used to fetch an instruction and to load data', 'duplicate the hardware (separate instruction and data caches)'],
        ['Data', 'an instruction needs a result that an earlier one has not produced', 'ADD R3, R1, R4 right after LW R1, 0(R2)', 'forwarding, a stall, or a better instruction order'],
        ['Control', 'the next instruction depends on a branch that is not decided yet', 'JNZ loop', 'branch prediction (and flushing the pipeline on a wrong guess)'],
      ],
      { at: 'end', highlights: [{ row: 1, col: 3, tone: 'good', note: 'Example 2' }] },
    ),
    gantt(
      'pipeline-no-forwarding',
      'Example 2',
      'A timing diagram of the five-instruction program of Example 2 on a five-stage pipeline without forwarding. The ADD, SUB and AND instructions each wait two extra cycles in the ID stage, shown as stall bars, until the result they need has been written back. The program finishes in cycle 15.',
      'Without forwarding: three data hazards, two stall cycles each, 15 cycles in total.',
      ['LW R1, 0(R2)', 'ADD R3, R1, R4', 'SUB R5, R3, R6', 'AND R7, R5, R1', 'OR R8, R2, R6'],
      [
        { lane: 'LW R1, 0(R2)', start: 0, end: 1, label: 'IF', tone: 'info' },
        { lane: 'LW R1, 0(R2)', start: 1, end: 2, label: 'ID', tone: 'accent' },
        { lane: 'LW R1, 0(R2)', start: 2, end: 3, label: 'EX', tone: 'good' },
        { lane: 'LW R1, 0(R2)', start: 3, end: 4, label: 'MEM', tone: 'warn' },
        { lane: 'LW R1, 0(R2)', start: 4, end: 5, label: 'WB', tone: 'accent2' },
        { lane: 'ADD R3, R1, R4', start: 1, end: 2, label: 'IF', tone: 'info' },
        { lane: 'ADD R3, R1, R4', start: 2, end: 3, label: 'ID', tone: 'accent' },
        { lane: 'ADD R3, R1, R4', start: 3, end: 5, label: 'stall', tone: 'bad' },
        { lane: 'ADD R3, R1, R4', start: 5, end: 6, label: 'EX', tone: 'good' },
        { lane: 'ADD R3, R1, R4', start: 6, end: 7, label: 'MEM', tone: 'warn' },
        { lane: 'ADD R3, R1, R4', start: 7, end: 8, label: 'WB', tone: 'accent2' },
        { lane: 'SUB R5, R3, R6', start: 2, end: 5, label: 'IF', tone: 'info' },
        { lane: 'SUB R5, R3, R6', start: 5, end: 6, label: 'ID', tone: 'accent' },
        { lane: 'SUB R5, R3, R6', start: 6, end: 8, label: 'stall', tone: 'bad' },
        { lane: 'SUB R5, R3, R6', start: 8, end: 9, label: 'EX', tone: 'good' },
        { lane: 'SUB R5, R3, R6', start: 9, end: 10, label: 'MEM', tone: 'warn' },
        { lane: 'SUB R5, R3, R6', start: 10, end: 11, label: 'WB', tone: 'accent2' },
        { lane: 'AND R7, R5, R1', start: 5, end: 8, label: 'IF', tone: 'info' },
        { lane: 'AND R7, R5, R1', start: 8, end: 9, label: 'ID', tone: 'accent' },
        { lane: 'AND R7, R5, R1', start: 9, end: 11, label: 'stall', tone: 'bad' },
        { lane: 'AND R7, R5, R1', start: 11, end: 12, label: 'EX', tone: 'good' },
        { lane: 'AND R7, R5, R1', start: 12, end: 13, label: 'MEM', tone: 'warn' },
        { lane: 'AND R7, R5, R1', start: 13, end: 14, label: 'WB', tone: 'accent2' },
        { lane: 'OR R8, R2, R6', start: 8, end: 11, label: 'IF', tone: 'info' },
        { lane: 'OR R8, R2, R6', start: 11, end: 12, label: 'ID', tone: 'accent' },
        { lane: 'OR R8, R2, R6', start: 12, end: 13, label: 'EX', tone: 'good' },
        { lane: 'OR R8, R2, R6', start: 13, end: 14, label: 'MEM', tone: 'warn' },
        { lane: 'OR R8, R2, R6', start: 14, end: 15, label: 'WB', tone: 'accent2' },
      ],
      { max: 15, unit: 'cycle', at: 'end' },
    ),
    gantt(
      'pipeline-forwarding',
      'Example 2',
      'A timing diagram of the same program with forwarding. Only the ADD after the load waits one cycle, because the loaded value is available at the end of the MEM stage; every other instruction follows without delay. The program finishes in cycle 10.',
      'With forwarding: one stall (the load-use hazard) and 10 cycles in total.',
      ['LW R1, 0(R2)', 'ADD R3, R1, R4', 'SUB R5, R3, R6', 'AND R7, R5, R1', 'OR R8, R2, R6'],
      [
        { lane: 'LW R1, 0(R2)', start: 0, end: 1, label: 'IF', tone: 'info' },
        { lane: 'LW R1, 0(R2)', start: 1, end: 2, label: 'ID', tone: 'accent' },
        { lane: 'LW R1, 0(R2)', start: 2, end: 3, label: 'EX', tone: 'good' },
        { lane: 'LW R1, 0(R2)', start: 3, end: 4, label: 'MEM', tone: 'warn' },
        { lane: 'LW R1, 0(R2)', start: 4, end: 5, label: 'WB', tone: 'accent2' },
        { lane: 'ADD R3, R1, R4', start: 1, end: 2, label: 'IF', tone: 'info' },
        { lane: 'ADD R3, R1, R4', start: 2, end: 3, label: 'ID', tone: 'accent' },
        { lane: 'ADD R3, R1, R4', start: 3, end: 4, label: 'stall', tone: 'bad' },
        { lane: 'ADD R3, R1, R4', start: 4, end: 5, label: 'EX', tone: 'good' },
        { lane: 'ADD R3, R1, R4', start: 5, end: 6, label: 'MEM', tone: 'warn' },
        { lane: 'ADD R3, R1, R4', start: 6, end: 7, label: 'WB', tone: 'accent2' },
        { lane: 'SUB R5, R3, R6', start: 2, end: 4, label: 'IF', tone: 'info' },
        { lane: 'SUB R5, R3, R6', start: 4, end: 5, label: 'ID', tone: 'accent' },
        { lane: 'SUB R5, R3, R6', start: 5, end: 6, label: 'EX', tone: 'good' },
        { lane: 'SUB R5, R3, R6', start: 6, end: 7, label: 'MEM', tone: 'warn' },
        { lane: 'SUB R5, R3, R6', start: 7, end: 8, label: 'WB', tone: 'accent2' },
        { lane: 'AND R7, R5, R1', start: 4, end: 5, label: 'IF', tone: 'info' },
        { lane: 'AND R7, R5, R1', start: 5, end: 6, label: 'ID', tone: 'accent' },
        { lane: 'AND R7, R5, R1', start: 6, end: 7, label: 'EX', tone: 'good' },
        { lane: 'AND R7, R5, R1', start: 7, end: 8, label: 'MEM', tone: 'warn' },
        { lane: 'AND R7, R5, R1', start: 8, end: 9, label: 'WB', tone: 'accent2' },
        { lane: 'OR R8, R2, R6', start: 5, end: 6, label: 'IF', tone: 'info' },
        { lane: 'OR R8, R2, R6', start: 6, end: 7, label: 'ID', tone: 'accent' },
        { lane: 'OR R8, R2, R6', start: 7, end: 8, label: 'EX', tone: 'good' },
        { lane: 'OR R8, R2, R6', start: 8, end: 9, label: 'MEM', tone: 'warn' },
        { lane: 'OR R8, R2, R6', start: 9, end: 10, label: 'WB', tone: 'accent2' },
      ],
      { max: 10, unit: 'cycle', at: 'end' },
    ),
    lab(
      'pipeline-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 pipeline model: it schedules five instructions on a five-stage pipeline, with and without forwarding, and prints the cycles, the stalls and the CPI, with its expected output.',
      'Move the OR instruction between LW and ADD and predict the new total before you run the model.',
      `PROGRAM = [
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
        print(f"    {text:<16} stalls {stall}   finishes in cycle {done}")`,
      {
        expected: '5 instructions, 5 stages\n  no pipeline:    25 cycles\n  ideal pipeline: 9 cycles\n  with hazards, forwarding off: 15 cycles, 6 stall cycles, CPI 3.00\n    LW  R1, 0(R2)    stalls 0   finishes in cycle 5\n    ADD R3, R1, R4   stalls 2   finishes in cycle 8\n    SUB R5, R3, R6   stalls 2   finishes in cycle 11\n    AND R7, R5, R1   stalls 2   finishes in cycle 14\n    OR  R8, R2, R6   stalls 0   finishes in cycle 15\n  with hazards, forwarding on: 10 cycles, 1 stall cycles, CPI 2.00\n    LW  R1, 0(R2)    stalls 0   finishes in cycle 5\n    ADD R3, R1, R4   stalls 1   finishes in cycle 7\n    SUB R5, R3, R6   stalls 0   finishes in cycle 8\n    AND R7, R5, R1   stalls 0   finishes in cycle 9\n    OR  R8, R2, R6   stalls 0   finishes in cycle 10',
        filename: 'pipeline.py',
        at: 'end',
      },
    ),
    lab(
      'netlist-lab',
      'Example 3',
      'python',
      'A Python editor with the Example 3 gate-level simulator: a four-bit ripple-carry adder as a netlist of twenty gates, tested on all 256 input pairs, with the settling time of each output, with its expected output.',
      'Change one XOR to an OR and count the failures, then try the 8-bit version and watch the critical path grow.',
      `GATES = {"AND": lambda a, b: a & b, "OR": lambda a, b: a | b, "XOR": lambda a, b: a ^ b}
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
print(f"critical path: {slowest:.0f} ns, so the clock period must be at least that long: at most {1000 / slowest:.0f} MHz")`,
      {
        expected: '4-bit ripple-carry adder: 20 gates\nexhaustive test: 256 input combinations, 0 failures\nsettling time of the outputs (ns):\n  s0: 2\n  s1: 4\n  s2: 6\n  s3: 8\n  c3: 9\ncritical path: 9 ns, so the clock period must be at least that long: at most 111 MHz',
        filename: 'netlist.py',
        at: 'end',
      },
    ),
    checklist(
      'report-checklist',
      'Instructions',
      'A checklist of the seven sections of the build report: goal and specification, block diagram, table of parts, test results, timing estimate, limitations and ideas, and reflection, plus the project link and three screenshots.',
      'Tick the sections as you write them. A report is finished when a classmate could rebuild the calculator from it.',
      [
        'Goal and specification: what the calculator does, its inputs and its outputs',
        'Block diagram: panel, ALU with flags, accumulator, displays, clock and Load',
        'Table of parts: each part and the lesson it came from',
        'Test results: the ten steps with expected, observed and PASS or FAIL',
        'Timing estimate: the critical path, the clock period, one stage against two',
        'Limitations and ideas: 4 bits only, no multiplication, what you would add',
        'Reflection: what was hardest, what you would do differently',
        'The CircuitVerse project link and three screenshots',
      ],
      { at: 'end', title: 'Build report checklist' },
    ),
  ],
  // @@visuals-end
});

registerQuizCatalog({
  [`${M}/1`]: [
    mcq('q1', 'What does this program print?', ['11 0xff 0101', '11 255 0101', '13 0xff 101', '11 0xff 101'], 'int("1011", 2) reads binary and gives 11; hex(255) gives the text 0xff; and format(5, "04b") writes 5 in binary padded to four digits: 0101.', PY('print(int("1011", 2), hex(255), format(5, "04b"))')),
    mcq('q2', 'What is 11010110 (binary) in hexadecimal?', ['D6', 'B6', 'D3', '6D'], 'Split into nibbles: 1101 = D and 0110 = 6. So the hexadecimal value is D6.'),
    mcq('q3', 'How many different patterns can 10 bits represent?', ['1,024', '100', '512', '2,048'], 'Each extra bit doubles the number of patterns: 2¹⁰ = 1,024. Ten bits can represent the values 0 to 1,023.'),
    mcq('q4', 'In ASCII, which character does the bit pattern 01000001 represent?', ['A', 'a', 'B', '1'], '01000001 is the number 65 (64 + 1), and 65 is the ASCII code of the capital letter A. The small letter a is 97.'),
    mcq('q5', 'Why do computers store information in binary?', ['A transistor switch reliably has two states, which is easy to build and robust against noise', 'Binary numbers are shorter than decimal numbers', 'Decimal arithmetic is impossible for a computer', 'Binary was chosen only by tradition'], 'Telling two voltage levels apart is simple and reliable; telling ten would be fragile. Binary numbers are actually longer than decimal ones, but the hardware is far simpler.'),
  ],
  [`${M}/2`]: [
    mcq('q1', 'What is 0110 + 0111 in binary?', ['1101', '1001', '1011', '1111'], '6 + 7 = 13, which is 1101 in binary. Column by column from the right: 0 + 1 = 1; 1 + 1 = 0 carry 1; 1 + 1 + carry 1 = 1 carry 1; 0 + 0 + carry 1 = 1.'),
    mcq('q2', 'What does this program print?', ['11111011', '11111010', '00000101', '10000101'], 'Inverting the bits of 5 (00000101) gives 11111010, and adding 1 gives 11111011. This is the 8-bit two’s complement representation of −5.', PY('print(format((~5 + 1) & 255, "08b"))')),
    mcq('q3', 'Which gate outputs 1 only when its two inputs are different?', ['XOR', 'AND', 'NOR', 'XNOR'], 'XOR (exclusive or) is 1 when exactly one input is 1. XNOR is the opposite: 1 when the inputs are equal.'),
    mcq('q4', 'Which gate type can be used to build every other logic gate?', ['NAND', 'AND', 'OR', 'XOR'], 'NAND (and NOR) is a universal gate. NOT, AND, OR and XOR can all be built from NAND gates alone. AND, OR and XOR cannot build NOT on their own.'),
    mcq('q5', 'What does this program print?', ['0 1', '1 0', '1 1', '0 0'], 'This is a half adder for 1 + 1: the sum bit is 1 XOR 1 = 0, and the carry bit is 1 AND 1 = 1. Together they give binary 10, which is 2.', PY('a, b = 1, 1\nprint(a ^ b, a & b)')),
  ],
  [`${M}/3`]: [
    mcq('q1', 'How many rows does the truth table of a full adder have?', ['8', '4', '6', '16'], 'A full adder has three inputs (A, B and the carry-in), so its truth table has 2³ = 8 rows. A half adder, with two inputs, has 4.'),
    mcq('q2', 'What does this program print?', ['1 1', '1 0', '0 1', '0 0'], 'This is a full adder for 1 + 1 + 1 = 3, which is 11 in binary: the sum bit is 1 XOR 1 XOR 1 = 1, and the carry-out is (1 AND 1) OR (1 AND (1 XOR 1)) = 1.', PY('a, b, c = 1, 1, 1\ns = a ^ b ^ c\ncout = (a & b) | (c & (a ^ b))\nprint(s, cout)')),
    mcq('q3', 'How many select lines does a 4-to-1 multiplexer need?', ['2', '1', '4', '3'], 'To choose among 2ⁿ inputs you need n select lines. Four inputs are 2², so two select lines are enough.'),
    mcq('q4', 'Why does a ripple-carry adder become slow when it has many bits?', ['Each full adder must wait for the carry from the stage before it', 'The sum bits have to be inverted before they are shown', 'A bus can carry only four bits at a time', 'Full adders cannot work on more than one bit'], 'The carry must travel from the least significant stage to the most significant one, one stage after another, so the delay grows with the number of bits. Carry-lookahead circuits compute the carries in parallel to avoid this.'),
    mcq('q5', 'A 2-to-4 decoder receives the input 10 (binary). Which output is 1?', ['D2', 'D1', 'D3', 'D0'], 'A decoder activates exactly one output: the one whose number equals the input code. The code 10 is 2, so D2 is 1 and the others are 0.'),
  ],
  [`${M}/4`]: [
    mcq('q1', 'What is the main difference between a latch and a flip-flop?', ['A flip-flop captures its input only at a clock edge, while a latch follows its inputs while it is enabled', 'A flip-flop stores many bits and a latch stores one', 'A latch needs a clock and a flip-flop does not', 'A flip-flop is made of AND gates only'], 'A D flip-flop samples its input at the rising clock edge and then ignores it, which makes timing predictable. A latch is level-sensitive: it changes whenever its inputs change while it is enabled.'),
    mcq('q2', 'What does this program print?', ['1', '17', '0', '15'], 'A 4-bit counter wraps from 15 to 0. Starting at 14: 15, then 0, then 1. The mask & 15 keeps only the lower four bits.', PY('count = 14\nfor _ in range(3):\n    count = (count + 1) & 15\nprint(count)')),
    mcq('q3', 'A D flip-flop has D = 1 and Q = 0. What is Q after the next rising clock edge?', ['1', '0', 'It toggles back and forth', 'It is undefined'], 'At the rising edge a D flip-flop copies D to Q. Since D is 1, Q becomes 1 and stays there until a later edge captures a different value.'),
    mcq('q4', 'How many clock pulses does a 4-bit binary counter need to return to 0 from 0?', ['16', '15', '8', '4'], 'A 4-bit counter has 2⁴ = 16 states, 0 to 15. After the 16th clock pulse it wraps around to 0 again.'),
    mcq('q5', 'A register has a load control. What happens at the clock edge when Load = 0?', ['It keeps (holds) its old value', 'It loads zero', 'It loads the data input anyway', 'It shifts its bits one place'], 'With Load = 0 the multiplexer passes the register’s own output back to its input, so the flip-flops capture the value they already hold: the register remembers.'),
  ],
  [`${M}/5`]: [
    mcq('q1', 'What does the program counter (PC) hold?', ['The address of the next instruction to fetch', 'The instruction that is being executed', 'The result of the last calculation', 'The number of instructions in the program'], 'The PC holds the address of the next instruction. During the fetch phase the instruction at that address is copied into the instruction register, and the PC is increased (or replaced, by a jump).'),
    mcq('q2', 'What final state does the toy CPU reach when it runs this program?', ['A=7 B=3 Z=0 C=0 steps=4', 'A=13 B=3 Z=0 C=0 steps=4', 'A=7 B=3 Z=1 C=0 steps=4', 'A=3 B=7 Z=0 C=0 steps=4'], 'LOADI A, 10 and LOADI B, 3 set the registers; SUB A, B leaves 10 − 3 = 7 in A; the result is not zero (Z = 0) and there is no borrow (C = 0). Four instructions run, including HALT.', { language: 'asm', code: 'LOADI A, 10\nLOADI B, 3\nSUB A, B\nHALT' }),
    mcq('q3', 'What happens during the fetch phase of the instruction cycle?', ['The instruction at the address in PC is copied into IR, and PC is increased', 'The ALU adds the two registers', 'The result is written back to memory', 'The control unit switches the clock off'], 'Fetch is the first phase: IR ← memory[PC] and PC ← PC + 1. Decoding and executing come afterwards.'),
    mcq('q4', 'The ALU subtracts 5 − 5. Which flag is set?', ['Zero (Z = 1)', 'Carry (C = 1) only', 'Overflow only', 'No flag is ever set by a subtraction'], 'The result is all zeros, so the Zero flag is 1. This is how a CPU tests whether two values are equal: subtract and look at Z.'),
    mcq('q5', 'The instruction JNZ loop is executed when the Zero flag is 1. Does it jump?', ['No: JNZ jumps only when Z = 0', 'Yes: it always jumps', 'Yes: JNZ jumps when Z = 1', 'It stops the CPU'], 'JNZ means "jump if not zero": it loads the program counter with the label only when Z = 0. With Z = 1 the program continues with the next instruction.'),
  ],
  [`${M}/6`]: [
    mcq('q1', 'What does this program print?', ['6.0', '4.0', '82.0', '2.05'], 'AMAT = hit time + miss rate × miss penalty = 2 + 0.05 × 80 = 2 + 4 = 6 ns, which Python prints as 6.0.', PY('def amat(hit, miss_rate, penalty):\n    return hit + miss_rate * penalty\n\n\nprint(amat(2, 0.05, 80))')),
    mcq('q2', 'Which statement about the memory hierarchy is correct?', ['Going down the hierarchy, memory gets bigger, cheaper per byte and slower', 'Going down the hierarchy, memory gets bigger, cheaper per byte and faster', 'Registers are the largest and the slowest level', 'Every level has the same access time; only the size differs'], 'No technology is fast, large and cheap at once, so computers combine small fast memories (registers, caches) with large slow ones (RAM, SSD, disk). The CPU gets the speed of the top level most of the time and the size of the bottom level.'),
    mcq('q3', 'A loop adds up the elements of an array one after another. Which kind of locality lets the cache serve most of these reads?', ['Spatial locality: neighbouring elements lie in the same cache block', 'Temporal locality only: every element is read many times', 'No kind: caches only store instructions, never data', 'Associative locality: the cache searches every line'], 'When the CPU reads one element, the cache fetches the whole block around it, so the next elements are already there. That is spatial locality. Each element here is read only once, so temporal locality does not help.'),
    mcq('q4', 'What does this program print?', ['0 0', '0 4', '0 1', '1 0'], 'The address 0 is in block 0 and the address 16 is in block 4. Both blocks map to line block_number % 4 = 0, so they compete for the same cache line: a conflict.', PY('block = 4\nlines = 4\nfor address in (0, 16):\n    block_number = address // block\n    print(block_number % lines, end=" ")')),
    mcq('q5', 'A memory chip has 4 address lines and 8 data lines. How many bits can it store?', ['128 bits (16 locations of 8 bits)', '32 bits (4 locations of 8 bits)', '12 bits', '256 bits (256 locations of 1 bit)'], 'n address lines select 2ⁿ locations: 2⁴ = 16 locations. Each holds 8 bits (one byte), so the chip stores 16 × 8 = 128 bits.'),
  ],
  [`${M}/7`]: [
    mcq('q1', 'What is the difference between LOADI A, 5 and LOAD A, 5?', ['LOADI A, 5 puts the number 5 in A, while LOAD A, 5 copies the contents of memory cell 5 into A', 'There is no difference: both put the number 5 in A', 'LOADI A, 5 reads memory cell 5, while LOAD A, 5 puts the number 5 in A', 'LOAD A, 5 writes A into memory cell 5'], 'LOADI uses immediate addressing: the 5 is inside the instruction. LOAD uses direct addressing: the 5 is an address, and the CPU reads the memory cell that has this address.'),
    mcq('q2', 'What final state does the toy CPU reach when it runs this program?', ['A=8 B=4 Z=0 C=0 steps=5 mem: [4]=8', 'A=7 B=4 Z=0 C=0 steps=5 mem: [4]=7', 'A=8 B=4 Z=0 C=0 steps=5 mem: [8]=4', 'A=4 B=8 Z=0 C=0 steps=5 mem: [4]=8'], 'B = 4 is an address. LOAD A, [B] reads memory[4] = 7 into A, INC A makes it 8, and STORE A, [B] writes 8 back into memory[4]. Five instructions run, including HALT.', { language: 'asm', code: '; memory: 0, 0, 0, 0, 7\n      LOADI B, 4\n      LOAD A, [B]\n      INC A\n      STORE A, [B]\n      HALT' }),
    mcq('q3', 'Which addressing mode does LOAD A, [B] use?', ['Register indirect: register B holds the address of the memory cell', 'Immediate: register B holds the value to load', 'Direct: the instruction itself holds the address', 'Register: both operands are registers'], 'The brackets mean "the memory cell whose address is in B". This is what a pointer does in C: a = *p; reads the cell whose address is stored in p.'),
    mcq('q4', 'What does an assembler do?', ['It translates assembly instructions into machine code and replaces labels by addresses', 'It translates C source code into assembly language', 'It loads machine code into memory and starts the program', 'It finds the logical mistakes in a program'], 'The assembler turns each line of assembly into one machine instruction. Translating C into assembly is the job of the compiler, loading a program is done by the operating system loader, and finding logical mistakes is the programmer’s job, helped by a debugger.'),
    mcq('q5', 'What final state does the toy CPU reach when it runs this program?', ['A=0 B=0 Z=1 C=0 steps=8', 'A=0 B=0 Z=1 C=0 steps=5', 'A=0 B=3 Z=0 C=0 steps=8', 'A=3 B=0 Z=1 C=0 steps=8'], 'The loop body is DEC B and JNZ loop, and it runs three times (B = 2, 1, 0). Altogether 1 (LOADI) + 3 × 2 + 1 (HALT) = 8 instructions run. DEC B leaves Z = 1 when B reaches 0, so the last JNZ does not jump.', { language: 'asm', code: '      LOADI B, 3\nloop: DEC B\n      JNZ loop\n      HALT' }),
  ],
  [`${M}/8`]: [
    mcq('q1', 'What does this program print?', ['0.5', '2.0', '8.0', '0.125'], 'CPU time = instructions × CPI ÷ clock rate = 1,000,000,000 × 2 ÷ 4,000,000,000 = 0.5 seconds.', PY('instructions = 1_000_000_000\ncpi = 2\nclock_hz = 4_000_000_000\nprint(instructions * cpi / clock_hz)')),
    mcq('q2', 'What does this program print?', ['500 104', '104 500', '500 500', '105 104'], 'Without a pipeline, 100 instructions of 5 stages take 5 × 100 = 500 cycles. An ideal pipeline needs stages + n − 1 = 5 + 100 − 1 = 104 cycles.', PY('stages, n = 5, 100\nprint(stages * n, stages + n - 1)')),
    mcq('q3', 'What is a data hazard in a pipeline?', ['An instruction needs a result that an earlier, unfinished instruction has not produced yet', 'Two instructions need the same hardware in the same clock cycle', 'The processor does not yet know which instruction comes after a branch', 'Data in memory is damaged by a power failure'], 'A data hazard is a read-after-write dependency: ADD R3, R1, R4 right after LW R1, 0(R2) needs R1 before it exists. The second description is a structural hazard and the third is a control hazard.'),
    mcq('q4', 'What is forwarding (bypassing) used for?', ['To send a result straight from a pipeline stage to the instruction that needs it, without waiting for the write-back', 'To copy data from main memory into the cache', 'To jump to the interrupt handler when a device is ready', 'To make the clock run faster'], 'Forwarding connects the output of the ALU or memory stage to the input of the ALU, so a dependent instruction can continue without waiting for the result to reach the register file. It removes most data-hazard stalls.'),
    mcq('q5', 'A designer tests a 4-bit adder only with the pairs 1 + 1, 2 + 3 and 5 + 5. Why is this not enough?', ['The corner cases such as 0 + 0, 15 + 1 and 15 + 15 are untested; with only 256 pairs, all of them can be tested', 'Three tests are always enough for an adder', 'A 4-bit adder can only be tested with a real chip', 'The tests should use the same numbers, so that the results can be compared'], 'The carry and the overflow appear only for larger values. A 4-bit adder has just 16 × 16 = 256 input pairs, so an exhaustive test, checked against a golden model, is easy and proves far more than three lucky examples.'),
  ],
  // @@quiz-end
});
