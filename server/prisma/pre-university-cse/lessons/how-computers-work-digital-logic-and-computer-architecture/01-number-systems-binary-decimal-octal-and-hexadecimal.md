# Lumexa Mission Log: How Computers Work: Digital Logic & Computer Architecture

**Course/Path:** How Computers Work: Digital Logic & Computer Architecture
**Lesson:** 01 of 08
**Title:** Number Systems: Binary, Decimal, Octal and Hexadecimal
**Duration:** 60 minutes
**Difficulty:** Beginner to Intermediate
**Technology:** CircuitVerse · bit explorer (with Python)

---

## Mission Brief

Inside every phone, laptop and game console there are billions of tiny switches called transistors. A switch can be in only two states: off or on. That is all a computer has to work with, and from those two states it builds music, photographs, messages and maps. The trick is a way of writing numbers, and everything else, using only two symbols: **binary**.

In this course you open the computer and look inside: from the logic gates, through adders and memory, up to a working processor. It all starts here, with how numbers are written. You will learn to convert between decimal, binary, octal and hexadecimal, why programmers love hexadecimal, and how the same pattern of bits can mean a number, a letter or a colour. Then you open **CircuitVerse**, a free simulator that runs in your browser (no hardware needed), and build the first part of the course project: a panel of four switches with a hexadecimal display, which every circuit later in the course will reuse.

## Learning Objectives

1. Explain why computers use binary, and use the terms bit, nibble, byte and word.
2. Use positional notation to read numbers in binary, octal, decimal and hexadecimal.
3. Convert between the four systems by hand, using division, place values and grouping.
4. Explain how the same bits can represent unsigned numbers, text characters and colours.
5. Build a four-switch input panel with a hexadecimal display in CircuitVerse and predict its output.
6. Write a Python converter that implements the conversion algorithms and checks them against Python's built-in functions.

## Prerequisites

- School arithmetic and powers (2³ = 8).
- No programming experience beyond what you used in Courses 1 to 3; the Python is short and explained.
- A web browser, to use CircuitVerse (circuitverse.org).

## Concept Explanation

### Why binary?

A transistor is a switch with two reliable states: low voltage and high voltage. Distinguishing two states is easy and very robust against noise; distinguishing ten would be hard and error-prone. So computers represent information with **bits** (binary digits), each 0 or 1. A group of 4 bits is a **nibble**, 8 bits form a **byte**, and the natural size the processor works with at once is a **word** (commonly 32 or 64 bits). Memory sizes use powers of two: 1 KiB = 2¹⁰ = 1,024 bytes, 1 MiB = 2²⁰ bytes, 1 GiB = 2³⁰ bytes. With *n* bits you can make **2ⁿ different patterns**: 8 bits give 256, enough for the values 0 to 255.

### Positional notation

In the decimal system, the digits of 5,307 mean 5·10³ + 3·10² + 0·10¹ + 7·10⁰: each position has a **weight** that is a power of the **base** (10). Every positional system works the same way with a different base:

| System | Base | Digits | Example | Value |
|---|---|---|---|---|
| Binary | 2 | 0, 1 | 1011₂ | 1·8 + 0·4 + 1·2 + 1·1 = 11 |
| Octal | 8 | 0 to 7 | 157₈ | 1·64 + 5·8 + 7·1 = 111 |
| Decimal | 10 | 0 to 9 | 111₁₀ | 111 |
| Hexadecimal | 16 | 0 to 9, A to F | 6F₁₆ | 6·16 + 15·1 = 111 |

In hexadecimal the letters A to F stand for the digits 10 to 15. The weights of an 8-bit binary number, from the right, are 1, 2, 4, 8, 16, 32, 64, 128. Programming languages mark the base with a prefix: `0b1011`, `0o157`, `0x6F`.

### Converting between systems

- **Binary to decimal**: add the weights of the positions that hold a 1. 1011₂ = 8 + 2 + 1 = 11.
- **Decimal to binary**: divide by 2 again and again, writing down the remainders; read them from last to first. 13 ÷ 2 = 6 r **1**, 6 ÷ 2 = 3 r **0**, 3 ÷ 2 = 1 r **1**, 1 ÷ 2 = 0 r **1**, so 13 = 1101₂.
- **Binary to hexadecimal**: split the bits into groups of four from the right and replace each group by one hex digit. 1101 0110₂ = D6₁₆. Hexadecimal is a **compact way to write binary**: one hex digit is exactly one nibble.
- **Binary to octal**: the same, with groups of three bits.
- **Any base to decimal**: add digit × weight; **decimal to any base**: divide repeatedly by the base.

In Python: `int("1101", 2)` converts a string from base 2; `bin(13)`, `oct(13)` and `hex(13)` give the text forms; `format(13, "08b")` pads a binary number to 8 digits.

### One pattern, many meanings

Bits have no meaning by themselves: a program decides how to *interpret* them. The pattern 01000001 is the **number** 65 if read as an unsigned integer, the **character** "A" if read as ASCII text (every character has a numeric code: "A" = 65, "a" = 97, "0" = 48), and part of a **colour** if read as a pixel: web colours are written as three hex bytes, #FF8800 = red 255, green 136, blue 0 (orange). Memory addresses and IP addresses (Course 6) are also written in hexadecimal or in groups of bytes. A signed number needs a convention for negatives, **two's complement**, which you will meet in Lesson 2.

### The tools of this course

**CircuitVerse** is a free logic-circuit simulator at circuitverse.org/simulator. You drag components (inputs, gates, outputs, displays) onto a canvas, join them with wires, and click the inputs to see the outputs change instantly: a laboratory with no hardware, no cost and no risk. Alongside it, this course uses an in-lesson **bit explorer** (to flip bits and see the value), small circuit simulators and an assembly simulator, plus short Python programs to check your reasoning.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Bit** | A binary digit: 0 or 1. |
| **Nibble / byte / word** | 4 bits; 8 bits; the processor's natural group (such as 32 or 64 bits). |
| **Base (radix)** | The number of different digits of a positional system. |
| **Positional notation** | A way of writing numbers in which a digit's value depends on its position. |
| **Binary / octal / hexadecimal** | Number systems with base 2, 8 and 16. |
| **Place value (weight)** | The power of the base that a digit position stands for. |
| **ASCII** | A code that gives each basic character a number, such as "A" = 65. |
| **KiB / MiB / GiB** | Binary units: 1,024 bytes; 1,024 KiB; 1,024 MiB. |
| **Simulator** | A program that imitates a circuit so you can test it without hardware. |
| **Hex display** | A CircuitVerse output that shows the value of a 4-bit input as one hexadecimal digit. |

## Worked Examples

### Example 1: One number, four systems

```python
print(f"{'decimal':>8}  {'binary':>8}  {'octal':>5}  {'hex':>4}")
for n in (5, 10, 37, 100, 255):
    print(f"{n:>8}  {n:08b}  {n:>5o}  {n:>4X}")

print(int("1011", 2), int("157", 8), int("6F", 16), int("0b1011", 0), int("0x6F", 0))
print(2 ** 8, 2 ** 10, 2 ** 16)
```

```output
 decimal    binary  octal   hex
       5  00000101      5     5
      10  00001010     12     A
      37  00100101     45    25
     100  01100100    144    64
     255  11111111    377    FF
11 111 111 11 111
256 1024 65536
```

1. The format letters `b`, `o`, `X` print a number in binary, octal and hexadecimal; `08b` pads the binary form to eight digits.
2. 255 is 11111111 in binary, 377 in octal and FF in hexadecimal: the largest 8-bit value, written with the biggest digit in every system.
3. `int(text, base)` goes the other way. 1011₂, 157₈ (with the base 8) and 6F₁₆ read as the decimal numbers 11, 111 and 111; base 0 lets the prefix choose.
4. The last line shows that 8 bits make 256 patterns, 10 bits 1,024 and 16 bits 65,536.

### Example 2: The conversion algorithms

```python
def to_binary(n):
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
print("algorithms agree with Python for 0..999:", checks)
```

```output
13 in binary: 1101 | 1101 in decimal: 13
200 in hex: C8 | binary 11010110 in hex: D6
algorithms agree with Python for 0..999: True
```

1. `to_binary` follows the division method: the remainder of each division by 2 is the next bit, and putting it in *front* of the string reads the remainders from last to first.
2. `from_binary` uses the "shift and add" method: each new bit doubles the value so far and adds the bit, which is the same as adding weights.
3. `to_hex` is the same division method with base 16; the string `HEX` turns a remainder from 0 to 15 into a digit.
4. The last line tests all three algorithms against Python's own conversions for 1,000 numbers: they agree. A test like this is how you trust code that you have written yourself.

### Example 3: Bits that mean something

```python
bits = "01000001"
value = int(bits, 2)
print(bits, "=", value, "=", hex(value), "=", chr(value))
print("codes of Hi!:", [ord(c) for c in "Hi!"], [format(ord(c), "08b") for c in "Hi!"])

colour = "FF8800"
red, green, blue = (int(colour[i:i + 2], 16) for i in (0, 2, 4))
print(f"#{colour} = red {red}, green {green}, blue {blue}")

pattern = "110101101"
padded = pattern.zfill(12)
print("binary", pattern, "-> hex", " ".join(format(int(padded[i:i + 4], 2), "X") for i in range(0, 12, 4)))
```

```output
01000001 = 65 = 0x41 = A
codes of Hi!: [72, 105, 33] ['01001000', '01101001', '00100001']
#FF8800 = red 255, green 136, blue 0
binary 110101101 -> hex 1 A D
```

1. The same eight bits are the number 65, the hexadecimal value 0x41 and the character "A". The meaning depends on how the program reads them.
2. `ord` gives the code of a character, and `chr` the character of a code; "Hi!" is three bytes.
3. A web colour is three bytes in hexadecimal: FF is 255, 88 is 136 and 00 is 0, so #FF8800 is a strong orange.
4. To convert 110101101 to hexadecimal, pad it on the left to a multiple of 4 bits (0001 1010 1101) and read each group as a hex digit: 1, A and D, that is 1AD.

## Common Mistakes and Misconceptions

- **Reading the weights from the left.** The rightmost bit has weight 1 (2⁰), not the leftmost.
- **Forgetting that hexadecimal has digits above 9.** A to F are the digits 10 to 15; "10" in hex is sixteen, not ten.
- **Mixing up the remainder order in division.** The first remainder is the *rightmost* bit.
- **Grouping bits from the left.** Group from the right, and pad the left end with zeros.
- **Using 1,000 instead of 1,024.** KB in everyday use is often 1,000, but KiB is exactly 1,024; check the unit.
- **Believing "binary" is a different kind of number.** The number is the same; only the way of writing it changes.
- **Thinking a bit pattern has one meaning.** Whether 01000001 is 65 or "A" depends on the program.
- **Leaving out leading zeros when the width matters.** An 8-bit register always has 8 digits: 5 is 00000101.

## Guided Hands-On Activity

**Convert and build.** Work with your teacher.

1. Use the bit explorer of this lesson to set the 8 bits to 37. Read the binary, hexadecimal and decimal values, then flip the leftmost bit and see what changes.
2. Convert by hand: 45 to binary; 11001110₂ to decimal; 10101011₂ to hexadecimal; 3E₁₆ to binary; 255 to octal. Check each with Python.
3. Type Example 2 and add `to_octal(n)` with the same method. Test it against `format(n, "o")`.
4. Open CircuitVerse (circuitverse.org/simulator). Place an **Input** component and set its bit width to 4. Add a **Hex Display** and connect them with a wire. Click the input and change its value: what does the display show for 1010? For 1111?
5. Replace the one 4-bit input by **four 1-bit inputs** joined with a **Splitter** (combine 1,1,1,1 into a 4-bit bus) feeding the Hex Display. Label the inputs 8, 4, 2 and 1.
6. Write down the hex digit you expect for the switch settings 0110, 1001 and 1110, and test them in the simulator.

## Lesson Project: Number System Converter and Switch Display

### Objective

Start the course project, the **Mini Calculator System**, with its input panel: a **four-switch panel with a hexadecimal display** built in CircuitVerse, and a Python **converter** that documents and tests the same behaviour. Every circuit in this course will take its inputs from your panel.

### Requirements

- **CircuitVerse build.** Four 1-bit **Input** switches labelled 8, 4, 2 and 1 (most significant first), a **Splitter** that combines them into one 4-bit bus, a **Hex Display** on the bus and four **LEDs** showing the individual bits. Save the circuit with a clear name and keep the link or an exported image for your portfolio.
- **Python converter.** Write `to_binary`, `from_binary`, `to_hex` and `from_hex` (no use of `bin`, `int(text, 2)` or `format` inside them), and test them against Python's built-ins for 0 to 999.
- Print the **switch table**: for all 16 settings of the four switches, print the four bits, the decimal value and the hex digit the display must show.
- Print a **conversion table** of five numbers (7, 42, 100, 200, 255) in 8-bit binary, octal and hexadecimal, and the line `all conversions verified`.
- In the notes of your portfolio, answer: what are the largest and smallest values the panel can show, and how many different switch settings are there?

### Instructions

1. In CircuitVerse, place the four inputs, the splitter and the hex display, and connect them (the splitter combines 1-bit lines into a 4-bit bus). Test all 16 settings.
2. Add four LEDs with a second splitter that separates the bus into bits (or connect the inputs to the LEDs directly) so that you can see the bits as lights.
3. Write the four conversion functions in Python.
4. Write the loop that prints the 16 rows of the switch table, with the bits as `8 4 2 1` columns.
5. Write the conversion table for the five numbers, and the verification loop.
6. Compare your table with the display of your circuit for at least five settings.
7. Write the portfolio notes and save a screenshot of your circuit showing the setting 1010 (A).

### Expected Output

```text
Switch panel: all 16 settings
   8  4  2  1  decimal  hex display
  0  0  0  0        0            0
  0  0  0  1        1            1
  0  0  1  0        2            2
  0  0  1  1        3            3
  0  1  0  0        4            4
  0  1  0  1        5            5
  0  1  1  0        6            6
  0  1  1  1        7            7
  1  0  0  0        8            8
  1  0  0  1        9            9
  1  0  1  0       10            A
  1  0  1  1       11            B
  1  1  0  0       12            C
  1  1  0  1       13            D
  1  1  1  0       14            E
  1  1  1  1       15            F

Conversions
 decimal    binary  octal   hex
       7  00000111      7     7
      42  00101010     52    2A
     100  01100100    144    64
     200  11001000    310    C8
     255  11111111    377    FF

all conversions verified
```

### Hints

1. **Hint 1 (the splitter).** In CircuitVerse, set the splitter's input bit widths to "1 1 1 1" and its output width to 4, so that four wires become one bus (check the labels on the splitter's side).
2. **Hint 2 (bit order).** The switch labelled 8 is the most significant bit: it must be the *first* line into the splitter, the one that becomes the left digit.
3. **Hint 3 (the display).** The Hex Display expects a 4-bit input; if it shows nothing, check that the bus is connected to its input pin.
4. **Hint 4 (division method).** In `to_binary`, add the remainder in front of the result with `digits = str(n % 2) + digits`.
5. **Hint 5 (table rows).** Loop `n` from 0 to 15, and get each bit with `(n >> k) & 1` for k = 3, 2, 1, 0.
6. **Hint 6 (formatting).** `f"{n:>3}"` right-aligns a number, and `"  ".join(...)` joins the four bit columns.

### Success Criteria

- [ ] The circuit has four labelled switches (8, 4, 2, 1), a splitter, a hex display and LEDs, and shows the right digit for all 16 settings.
- [ ] The converter functions do not use the built-in conversions, and agree with them for all 1,000 numbers.
- [ ] The switch table has 16 rows with the right bits, decimal values and hex digits.
- [ ] The conversion table is correct for the five numbers, and the program prints `all conversions verified`.
- [ ] The portfolio notes state the range 0 to 15 and the 16 possible settings.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Extend the panel to **eight switches** and two hex displays (a high and a low nibble) in CircuitVerse, and extend the converter to read an 8-bit number and print its two hex digits. Then add a decoder in Python that, given the 8-bit value as a *character code*, prints the ASCII character and write down which codes are printable.

## Lesson Recap

- Computers use **binary** because a transistor has two reliable states; a bit is 0 or 1, a nibble is 4 bits, a byte is 8 bits, and *n* bits give 2ⁿ patterns.
- In **positional notation** each digit has a weight that is a power of the base: 2 (binary), 8 (octal), 10 (decimal) or 16 (hexadecimal).
- Convert with place values, repeated division by the base, and grouping bits in fours (hex) or threes (octal).
- The same bits can mean a number, a character or a colour: the program decides.
- **CircuitVerse** lets you build and test circuits in the browser; your switch panel with a hex display is the input of every later circuit.

## Homework / Extension Mission

Create a **cheat sheet** with the powers of two up to 2¹⁶, the 16 hex digits with their 4-bit patterns, and the ASCII codes of the digits, capital letters and small letters. Use your converter to convert your birth year, your phone number's last two digits and the colour #1E90FF, and explain each result in words. Then answer: how many different colours can three bytes represent (give the exact number and write it in hexadecimal), and why do web designers prefer hex colours to writing three decimal numbers?

## Course Project Connection

This lesson starts the **Mini Calculator System**, the course project: a tested digital system built in CircuitVerse. The four-switch panel with a hexadecimal display is its input stage. In Lesson 2 you will add logic gates and a half adder, in Lesson 3 a four-bit adder with an operation selector, in Lesson 4 a register and a counter, and in Lesson 8 you will integrate everything into one calculator with a build report. Keep your CircuitVerse project open: every lesson adds to it.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: transistors as switches, and bits. 15 minutes: positional notation and conversions on the board, with the bit explorer. 10 minutes: one pattern, many meanings (Example 3). 25 minutes: CircuitVerse build and the Python converter. Make sure every student has a CircuitVerse account (or uses the guest mode) before the lesson.

**Live demonstrations.** Use the bit explorer to flip bits and show the three readings at once. Build the panel live in CircuitVerse, and let students predict the digit before you click. Show a hex editor or a colour picker to connect hex to real tools.

**Misconceptions.** "Binary is only for experts." "Hex is a different number." "Bigger base means bigger number." "A byte is always a letter."

**Assessment of the project.** Check the circuit (labels, bit order, all 16 settings), the converters (no built-ins inside), the table and the notes. Ask each student to explain why the switch labelled 8 must go to the leftmost position of the bus.

**Reference solution `converter.py`** (run with `python3 converter.py`):

```python
"""Number System Converter: the Python part of the Mini Calculator System input panel."""
HEX = "0123456789ABCDEF"


def to_binary(n):
    if n == 0:
        return "0"
    digits = ""
    while n > 0:
        digits = str(n % 2) + digits
        n //= 2
    return digits


def from_binary(text):
    value = 0
    for bit in text:
        value = value * 2 + int(bit)
    return value


def to_hex(n):
    if n == 0:
        return "0"
    digits = ""
    while n > 0:
        digits = HEX[n % 16] + digits
        n //= 16
    return digits


def from_hex(text):
    value = 0
    for digit in text:
        value = value * 16 + HEX.index(digit)
    return value


print("Switch panel: all 16 settings")
print("   8  4  2  1  decimal  hex display")
for n in range(16):
    bits = [(n >> k) & 1 for k in (3, 2, 1, 0)]
    print("  " + "  ".join(str(b) for b in bits) + f"  {n:>7}  {to_hex(n):>11}")

print("\nConversions")
print(f"{'decimal':>8}  {'binary':>8}  {'octal':>5}  {'hex':>4}")
for n in (7, 42, 100, 200, 255):
    print(f"{n:>8}  {to_binary(n).zfill(8)}  {n:>5o}  {to_hex(n):>4}")

verified = all(
    to_binary(n) == bin(n)[2:] and from_binary(to_binary(n)) == n and to_hex(n) == format(n, "X") and from_hex(to_hex(n)) == n
    for n in range(0, 1000)
)
print("\nall conversions verified" if verified else "\nMISMATCH FOUND")
```

```output
Switch panel: all 16 settings
   8  4  2  1  decimal  hex display
  0  0  0  0        0            0
  0  0  0  1        1            1
  0  0  1  0        2            2
  0  0  1  1        3            3
  0  1  0  0        4            4
  0  1  0  1        5            5
  0  1  1  0        6            6
  0  1  1  1        7            7
  1  0  0  0        8            8
  1  0  0  1        9            9
  1  0  1  0       10            A
  1  0  1  1       11            B
  1  1  0  0       12            C
  1  1  0  1       13            D
  1  1  1  0       14            E
  1  1  1  1       15            F

Conversions
 decimal    binary  octal   hex
       7  00000111      7     7
      42  00101010     52    2A
     100  01100100    144    64
     200  11001000    310    C8
     255  11111111    377    FF

all conversions verified
```

**Differentiation.** Support: provide `to_binary` and `from_binary`, and let students write the hex functions and the table. Stretch: the eight-switch panel, octal functions, and a converter that accepts negative numbers in two's complement.

**Discussion questions (not for the student quiz).** Why do people write colours and memory addresses in hexadecimal and not in binary? Why is the number of bits in a byte 8 and not 10?
