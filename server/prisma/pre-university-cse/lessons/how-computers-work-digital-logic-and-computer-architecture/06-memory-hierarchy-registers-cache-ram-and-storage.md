# Lumexa Mission Log: How Computers Work: Digital Logic & Computer Architecture

**Course/Path:** How Computers Work: Digital Logic & Computer Architecture
**Lesson:** 06 of 08
**Title:** Memory Hierarchy: Registers, Cache, RAM and Storage
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** CircuitVerse · calculators (with Python)

---

## Mission Brief

A modern CPU can finish an addition in about a third of a nanosecond. Fetching a number from main memory takes about a hundred times longer; fetching it from a hard disk takes millions of times longer. If a processor waited for memory on every instruction, it would spend almost all of its life doing nothing. Yet your computer feels fast. Why?

The answer is a trick based on one simple observation: programs do not use memory randomly. They keep coming back to the same few things. So computers use not one memory but a **hierarchy** of them: a tiny, extremely fast memory next to the CPU, a bigger and slower one behind it, and so on down to cheap, huge, slow storage. The CPU *thinks* it has one big fast memory, and most of the time it is right. In this lesson you learn how the hierarchy works, how to measure it with **hit rates** and **average access time**, and how read-only memory holds fixed data, and you add a **calculator** and a **constant ROM** to your project.

## Learning Objectives

1. Explain the trade-off between speed, size and cost, and describe the levels of the memory hierarchy.
2. Explain temporal and spatial locality, and why caches work.
3. Explain how a direct-mapped cache decides hit or miss, using the tag, index and offset of an address.
4. Calculate hit rate, miss penalty and average memory access time (AMAT) for one and two cache levels.
5. Distinguish RAM from ROM, SRAM from DRAM, and describe how address decoding selects a memory location.
6. Build a constant ROM in CircuitVerse and a Python memory calculator and cache simulator.

## Prerequisites

- Lesson 3: decoders and multiplexers; Lesson 4: registers (memory made of flip-flops).
- Lesson 5: the CPU and its instruction cycle (the fetch reads memory).

## Concept Explanation

### Speed, size and cost

There is no memory that is fast, big and cheap at the same time: fast memory (made of flip-flop-like SRAM cells) needs more transistors per bit, so it is expensive and small; slow memory is dense, cheap and large. The solution is a **hierarchy**. The figures below are typical **orders of magnitude** (they change with each generation, but the ratios stay):

| Level | Typical size | Typical access time | Technology |
|---|---|---|---|
| Registers | tens of bytes | about 0.3 ns | flip-flops inside the CPU |
| L1 cache | 32 to 64 KiB | about 1 ns | SRAM |
| L2 / L3 cache | 1 to 32 MiB | about 4 to 40 ns | SRAM |
| Main memory (RAM) | 4 to 64 GiB | about 60 to 100 ns | DRAM |
| SSD | 128 GB to 4 TB | about 100,000 ns (0.1 ms) | flash memory |
| Hard disk | 1 to 20 TB | about 5,000,000 ns (5 ms) | magnetic |

Each step down is about ten times bigger and ten to a hundred times slower.

### Locality of reference

Programs show **locality**: **temporal locality** means that something used recently is likely to be used again soon (a loop counter, an instruction in a loop); **spatial locality** means that things near something used recently are likely to be used soon (the next element of an array, the next instruction). A **cache** exploits both: when the CPU asks for a byte, the cache fetches a whole **block** (or *line*) of neighbouring bytes and keeps it, so the next requests are served quickly. Reading a two-dimensional array in the order it is stored (row by row in C) uses spatial locality; reading it column by column does not, and can be many times slower, even though the program does the same arithmetic.

### How a cache works

A request is a **hit** if the data is in the cache and a **miss** if not (the CPU waits while the block is fetched from the next level: the **miss penalty**). The **hit rate** is hits divided by accesses and the **miss rate** is 1 minus that. In a **direct-mapped cache** each memory block can live in exactly one cache line, chosen by the address. The address is split into three fields: the **offset** (which byte within the block), the **index** (which cache line) and the **tag** (which of the many blocks that share that line is stored there). On an access the cache checks the line given by the index: a hit if the line is valid *and* its tag equals the address's tag. Two blocks that map to the same line keep evicting each other (a **conflict miss**). Real caches are often **set-associative** (each block may use any of a few lines) and use a replacement rule such as **LRU** (evict the least recently used). On writes, a **write-through** cache updates memory at once, a **write-back** cache waits until the line is evicted.

### Average memory access time

The speed of a memory system is summarised by the **average memory access time**:

**AMAT = hit time + miss rate × miss penalty**

With a hit time of 1 ns, a miss rate of 10% and a miss penalty of 100 ns, AMAT = 1 + 0.10 × 100 = 11 ns: much better than the 100 ns of main memory alone. With two cache levels the miss penalty of L1 is the AMAT of L2: **AMAT = H₁ + m₁ × (H₂ + m₂ × Memory)**, where m₂ is the *local* miss rate of L2. Because a miss costs so much, even a small improvement in the hit rate has a large effect: halving the miss rate halves the penalty term.

### RAM, ROM and address decoding

**RAM** (random-access memory) can be read and written and loses its contents without power (volatile). **SRAM** (static RAM, six transistors per bit) is fast and used for caches; **DRAM** (dynamic RAM, one transistor and a capacitor per bit) is dense and cheaper, and must be refreshed constantly; it is main memory. **ROM** (read-only memory) keeps its contents without power: firmware, boot code, lookup tables and constants. A memory chip with *n* address lines holds 2ⁿ locations of *w* bits each. To place several chips in one address space, a **decoder** (Lesson 3) turns the top address bits into a **chip select** signal. The list of which address ranges belong to which chip is the **memory map**. Below main memory comes **storage** (SSD, hard disk), which is persistent; the operating system uses it to extend RAM as **virtual memory** (Course 6).

## Key Vocabulary

| Term | Definition |
|---|---|
| **Memory hierarchy** | Levels of memory from small and fast to large and slow. |
| **Locality** | The tendency of programs to reuse recent data (temporal) and nearby data (spatial). |
| **Cache** | A small fast memory that keeps copies of recently used data. |
| **Hit / miss** | Finding the data in the cache / not finding it. |
| **Miss penalty** | The extra time needed to get the data from the next level after a miss. |
| **Tag, index, offset** | The three fields of an address used by a direct-mapped cache. |
| **AMAT** | Average memory access time = hit time + miss rate × miss penalty. |
| **SRAM / DRAM** | Fast, expensive static memory; dense, cheap memory that needs refreshing. |
| **ROM** | Read-only, non-volatile memory for fixed data such as firmware. |
| **Memory map** | The assignment of address ranges to memory chips and devices. |

## Worked Examples

### Example 1: Average memory access time

```python
def amat(hit_time, miss_rate, miss_penalty):
    return hit_time + miss_rate * miss_penalty


print("RAM only:", 100, "ns")
print("L1 cache alone, 10% misses:", amat(1, 0.10, 100), "ns")

l2 = amat(10, 0.20, 100)                      # the AMAT of L2 is the miss penalty of L1
l1 = amat(1, 0.10, l2)
print("L2 cache: AMAT =", l2, "ns")
print("L1 + L2: AMAT =", l1, "ns", "| speed-up over RAM only:", round(100 / l1, 1), "x")

print("miss rate  AMAT (ns)")
for miss_rate in (0.20, 0.10, 0.05, 0.02):
    print(f"{miss_rate:>8.0%}  {amat(1, miss_rate, 100):>8.1f}")
```

```output
RAM only: 100 ns
L1 cache alone, 10% misses: 11.0 ns
L2 cache: AMAT = 30.0 ns
L1 + L2: AMAT = 4.0 ns | speed-up over RAM only: 25.0 x
miss rate  AMAT (ns)
     20%      21.0
     10%      11.0
      5%       6.0
      2%       3.0
```

1. With one cache level, AMAT = 1 + 0.10 × 100 = 11 ns: the cache cuts the average time from 100 ns to 11 ns.
2. With two levels, the miss penalty seen by L1 is the AMAT of L2: 10 + 0.20 × 100 = 30 ns, so L1 + L2 give 1 + 0.10 × 30 = 4 ns, 25 times faster than RAM alone.
3. The table shows how sensitive the result is to the miss rate: going from 20% to 2% misses cuts AMAT from 21 ns to 3 ns.
4. This is why cache design is about reducing misses, not about speeding up hits.

### Example 2: A direct-mapped cache simulator

```python
def simulate(addresses, lines=4, block=4):
    tags = [None] * lines
    hits = 0
    log = []
    for address in addresses:
        block_number = address // block
        index = block_number % lines
        tag = block_number // lines
        hit = tags[index] == tag
        hits += hit
        tags[index] = tag
        log.append("H" if hit else "M")
    return hits, "".join(log)


sequential = list(range(32))
ping_pong = [0, 16] * 8                         # addresses 0 and 16 map to the same line

for name, pattern in (("sequential 0..31", sequential), ("ping-pong 0,16,0,16...", ping_pong)):
    hits, log = simulate(pattern)
    print(f"{name:<24} hit rate {hits}/{len(pattern)} = {hits / len(pattern):.0%}")
    print("  ", log)
```

```output
sequential 0..31         hit rate 24/32 = 75%
   MHHHMHHHMHHHMHHHMHHHMHHHMHHHMHHH
ping-pong 0,16,0,16...   hit rate 0/16 = 0%
   MMMMMMMMMMMMMMMM
```

1. The cache has 4 lines of 4 words. An address is split into the block number (`address // 4`), the line index (block number mod 4) and the tag (block number div 4).
2. In the sequential pattern, the first word of every block misses (M) and the next three hit (H): spatial locality gives a 75% hit rate.
3. The addresses 0 and 16 belong to different blocks that map to the *same* line, so each access evicts the other: a **conflict miss** every time, and a hit rate of 0%, even though only two blocks are in use and the cache is mostly empty.
4. A set-associative cache would keep both blocks; this is why real caches allow a block more than one possible place.

### Example 3: Locality in a two-dimensional array

```python
ROWS, COLS = 8, 8


def hit_rate(order):
    tags, hits = [None] * 4, 0
    for r, c in order:
        address = r * COLS + c                   # row-major storage, as in C
        block = address // 4
        index, tag = block % 4, block // 4
        hits += tags[index] == tag
        tags[index] = tag
    return hits / len(order)


row_by_row = [(r, c) for r in range(ROWS) for c in range(COLS)]
column_by_column = [(r, c) for c in range(COLS) for r in range(ROWS)]
print(f"row by row:       hit rate {hit_rate(row_by_row):.0%}")
print(f"column by column: hit rate {hit_rate(column_by_column):.0%}")
```

```output
row by row:       hit rate 75%
column by column: hit rate 0%
```

1. The array is stored row by row, so walking along a row visits neighbouring addresses: each fetched block serves four accesses, and the hit rate is 75%.
2. Walking down a column jumps eight words each time, so every access lands in a different block that evicts the previous one: no hits at all.
3. Both loops add up the same 64 numbers; only the *order* differs. On a real computer this can make a program several times slower.
4. The lesson for programmers: arrange your loops so that they follow the memory layout (in C, the last index changes fastest).

## Common Mistakes and Misconceptions

- **Believing the cache is a separate program.** It is hardware that works automatically; the programmer only influences it through access patterns.
- **Confusing hit rate with hit time.** The hit rate is a fraction of accesses; the hit time is how long a hit takes.
- **Using the wrong miss rate in a two-level formula.** The L2 term uses its *local* miss rate (misses per L2 access).
- **Thinking a bigger cache is always faster.** A larger cache has a longer hit time and costs more; the design is a balance.
- **Forgetting that RAM is volatile.** Power off and its contents vanish; storage and ROM keep their data.
- **Mixing up ROM and storage.** ROM holds fixed data (firmware, tables) and is read at RAM speeds; an SSD is large, slower and writable.
- **Ignoring locality when writing code.** Two loops with the same arithmetic can differ greatly in speed.
- **Reading the timing table as exact.** The figures are typical orders of magnitude, not specifications.

## Guided Hands-On Activity

**Measure and build.** Work with your teacher.

1. Type Example 1 and compute AMAT for a hit time of 2 ns, a miss rate of 4% and a miss penalty of 80 ns. How does it compare with RAM alone?
2. Type Example 2 and try a third pattern: the addresses 0, 4, 8, 12, 0, 4, 8, 12 repeated three times (a small loop over four blocks). What is the hit rate, and why?
3. Change `lines` to 8 in Example 2 and run the ping-pong pattern again. Explain the new result.
4. Type Example 3 and change the array to 16 × 16 with a cache of 16 lines. Does column order still have no hits?
5. In CircuitVerse, place a **ROM** element with 4 address bits and 8 data bits (look in the Misc components). Fill it with the first 16 powers of two or any 16 values, and connect your four-switch panel to the address and a hex display to the data.
6. Test the addresses 0, 5 and 15 and compare the displayed values with your table.

## Lesson Project: Memory Hierarchy Calculator and Constant ROM

### Objective

Extend the **Mini Calculator System** with a **constant ROM** that holds the squares of the numbers 0 to 15, and write a **memory hierarchy calculator** in Python that computes average access times for a three-level hierarchy and simulates a direct-mapped cache on two access patterns.

### Requirements

- **CircuitVerse build.** A ROM with a 4-bit address and 8-bit data, containing n² for n = 0 to 15 (0, 1, 4, 9, ..., 225). The address comes from your four-switch panel; the data goes to **two hex displays** (high and low nibble). Add a label for each part.
- **Python calculator.** Write `amat` (single and two-level) and print: (1) the AMAT of RAM only, of L1 + RAM and of L1 + L2 + RAM for the parameters H₁ = 1 ns, m₁ = 10%, H₂ = 10 ns, m₂ = 20% (local), RAM = 100 ns and the speed-up; (2) a table of AMAT for L1 miss rates 20%, 10%, 5% and 2%.
- **Cache simulator.** Write `simulate(addresses, lines, block)` for a direct-mapped cache and run it on: the sequential pattern 0 to 63, the ping-pong pattern 0 and 32 repeated 16 times, and a loop over 8 words repeated 8 times, with 8 lines of 4 words. Print each hit rate and the H/M log for the first 32 accesses.
- **ROM listing.** Print the contents of the squares ROM (address, hexadecimal value, decimal value) and verify with an assertion that each value equals the address squared.
- In your portfolio, include a screenshot of the ROM circuit with the address 13 selected (the display must show A9), and a table that lists the three hit rates.

### Instructions

1. In CircuitVerse place the ROM (4 address bits, 8 data bits) and fill it with the 16 squares.
2. Connect the switch panel to the address and two hex displays to the data (use a splitter to separate the high and low nibble).
3. Write `amat` and the two-level calculation, and print the three AMAT values and the miss-rate table.
4. Write `simulate` and the three access patterns, and print the hit rates and logs.
5. Generate the ROM contents with a list comprehension, print the listing and add the assertion.
6. Test the ROM circuit for four addresses and compare with the listing.
7. Compare your output with the expected output and finish the portfolio.

### Expected Output

```text
Average memory access time (ns)
  RAM only             100.0
  L1 + RAM              11.0
  L1 + L2 + RAM          4.0   speed-up over RAM only: 25x
  L1 miss rate  AMAT of L1 + RAM
          20%             21.0
          10%             11.0
           5%              6.0
           2%              3.0

Direct-mapped cache: 8 lines of 4 words
  sequential 0..63      hit rate 48/64 = 75%
    first 32: MHHHMHHHMHHHMHHHMHHHMHHHMHHHMHHH
  ping-pong 0, 32 x16   hit rate 0/32 = 0%
    first 32: MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
  loop over 8 words x8  hit rate 62/64 = 97%
    first 32: MHHHMHHHHHHHHHHHHHHHHHHHHHHHHHHH

Constant ROM: the squares of 0..15
  addr  hex  decimal
     0   00        0
     1   01        1
     2   04        4
     3   09        9
     4   10       16
     5   19       25
     6   24       36
     7   31       49
     8   40       64
     9   51       81
    10   64      100
    11   79      121
    12   90      144
    13   A9      169
    14   C4      196
    15   E1      225
```

### Hints

1. **Hint 1 (hex digits).** 13² = 169 = A9 in hexadecimal: the high nibble is A (10) and the low nibble is 9.
2. **Hint 2 (the formula).** `amat(hit, miss_rate, penalty) = hit + miss_rate * penalty`, and for two levels pass `amat(h2, m2, ram)` as the penalty of L1.
3. **Hint 3 (the mapping).** `block_number = address // block`, `index = block_number % lines`, `tag = block_number // lines`.
4. **Hint 4 (the loop pattern).** `list(range(8)) * 8` is a loop over 8 words repeated 8 times.
5. **Hint 5 (the log).** Append "H" for a hit and "M" for a miss, and print the first 32 characters with `log[:32]`.
6. **Hint 6 (ROM contents in CircuitVerse).** Double-click the ROM and enter the values in hexadecimal in the data editor.

### Success Criteria

- [ ] The CircuitVerse ROM shows the right square for every address, in two hex digits (for example 0D → A9).
- [ ] The AMAT values are 100, 11 and 4 ns, with a speed-up of 25 times for the full hierarchy.
- [ ] The cache simulator gives the hit rates of the three patterns, and the ping-pong pattern shows conflict misses.
- [ ] The ROM listing is printed and the assertion passes.
- [ ] The portfolio contains the screenshot and the table of hit rates.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Make the cache **2-way set-associative** with LRU replacement (2 lines per set) and run the ping-pong pattern again: what is the new hit rate? Then add a **write-back** counter: for a pattern of reads and writes, count how many times a dirty line is evicted. Finally, extend the ROM in CircuitVerse to 5 address bits holding the squares of 0 to 31 (check that the largest value, 961, no longer fits in 8 bits: how many data bits do you need?).

## Lesson Recap

- Memory is arranged in a **hierarchy** (registers, cache, RAM, storage) that trades speed against size and cost.
- Programs show **temporal and spatial locality**, and a **cache** keeps recently used blocks so most accesses are hits.
- A direct-mapped cache splits an address into **tag, index and offset**; two blocks with the same index cause **conflict misses**.
- **AMAT = hit time + miss rate × miss penalty**; with two levels the penalty of L1 is the AMAT of L2.
- **RAM** is volatile and writable (SRAM fast, DRAM dense); **ROM** keeps fixed data; decoders select chips by address.

## Homework / Extension Mission

Write a C program (from Course 1) that sums a 2000 × 2000 array of integers in row order and then in column order, and measure the time of each with `clock()`. Explain the difference in terms of cache hits. Then compute the AMAT for a processor with an L1 hit time of 2 ns, a miss rate of 8%, an L2 hit time of 12 ns, a local L2 miss rate of 25% and a RAM time of 90 ns. Finally, answer: why do SSDs and RAM not simply replace the cache, since an SSD is also "fast"?

## Course Project Connection

This lesson adds the **constant ROM** and the **memory hierarchy calculator** to the **Mini Calculator System**, the course project: the ROM can hold constants and lookup tables, and the calculator explains why memory systems are built the way they are. In Lesson 7 you will write assembly programs that read and write memory with different addressing modes, and in Lesson 8 you will integrate the whole system and write the build report. The cache ideas return in Course 6 (virtual memory and paging) and in Course 3 (why arrays are fast).

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the latency numbers as a "human scale" story (if a register access took one second, RAM would take minutes and a disk months). 15 minutes: locality and the cache (Example 2 on the board with a 4-line cache drawn). 10 minutes: AMAT (Example 1). 25 minutes: the ROM build and the calculator.

**Live demonstrations.** Draw the 4-line cache on the board and have students act as the CPU requesting addresses. Run the row/column summation in C with large arrays and time both. Show the ROM element in CircuitVerse and edit its contents.

**Misconceptions.** "The cache is managed by the program." "More memory is always faster." "ROM cannot be read quickly." "A hit rate of 90% means 10% of programs are slow."

**Assessment of the project.** Check the AMAT values (11 and 4 ns), the simulator's mapping, the hit rates, the ROM contents and the assertion. Ask each student to explain the ping-pong hit rate of 0%.

**Reference solution `memory_calculator.py`** (run with `python3 memory_calculator.py`):

```python
"""Memory Hierarchy Calculator and Constant ROM listing."""


def amat(hit_time, miss_rate, miss_penalty):
    return hit_time + miss_rate * miss_penalty


RAM = 100
l1_only = amat(1, 0.10, RAM)
l2 = amat(10, 0.20, RAM)
full = amat(1, 0.10, l2)
print("Average memory access time (ns)")
print(f"  RAM only            {RAM:>6.1f}")
print(f"  L1 + RAM            {l1_only:>6.1f}")
print(f"  L1 + L2 + RAM       {full:>6.1f}   speed-up over RAM only: {RAM / full:.0f}x")
print("  L1 miss rate  AMAT of L1 + RAM")
for miss_rate in (0.20, 0.10, 0.05, 0.02):
    print(f"  {miss_rate:>11.0%}  {amat(1, miss_rate, RAM):>15.1f}")


def simulate(addresses, lines=8, block=4):
    tags = [None] * lines
    hits, log = 0, []
    for address in addresses:
        block_number = address // block
        index, tag = block_number % lines, block_number // lines
        hit = tags[index] == tag
        hits += hit
        tags[index] = tag
        log.append("H" if hit else "M")
    return hits, "".join(log)


print("\nDirect-mapped cache: 8 lines of 4 words")
PATTERNS = [
    ("sequential 0..63", list(range(64))),
    ("ping-pong 0, 32 x16", [0, 32] * 16),
    ("loop over 8 words x8", list(range(8)) * 8),
]
for name, pattern in PATTERNS:
    hits, log = simulate(pattern)
    print(f"  {name:<22}hit rate {hits}/{len(pattern)} = {hits / len(pattern):.0%}")
    print(f"    first 32: {log[:32]}")

ROM = [n * n for n in range(16)]
assert all(ROM[n] == n ** 2 for n in range(16))
print("\nConstant ROM: the squares of 0..15")
print("  addr  hex  decimal")
for address, value in enumerate(ROM):
    print(f"  {address:>4}   {value:02X}  {value:>7}")
```

```output
Average memory access time (ns)
  RAM only             100.0
  L1 + RAM              11.0
  L1 + L2 + RAM          4.0   speed-up over RAM only: 25x
  L1 miss rate  AMAT of L1 + RAM
          20%             21.0
          10%             11.0
           5%              6.0
           2%              3.0

Direct-mapped cache: 8 lines of 4 words
  sequential 0..63      hit rate 48/64 = 75%
    first 32: MHHHMHHHMHHHMHHHMHHHMHHHMHHHMHHH
  ping-pong 0, 32 x16   hit rate 0/32 = 0%
    first 32: MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
  loop over 8 words x8  hit rate 62/64 = 97%
    first 32: MHHHMHHHHHHHHHHHHHHHHHHHHHHHHHHH

Constant ROM: the squares of 0..15
  addr  hex  decimal
     0   00        0
     1   01        1
     2   04        4
     3   09        9
     4   10       16
     5   19       25
     6   24       36
     7   31       49
     8   40       64
     9   51       81
    10   64      100
    11   79      121
    12   90      144
    13   A9      169
    14   C4      196
    15   E1      225
```

**Differentiation.** Support: provide the ROM contents as a ready list and the `amat` function; students write the simulator. Stretch: the 2-way set-associative cache with LRU, the write-back counter and a model of a TLB.

**Discussion questions (not for the student quiz).** Why is DRAM cheaper than SRAM, and why does it need refreshing? What does a cache do to the *worst-case* timing of a program, and why does that matter for real-time systems?
