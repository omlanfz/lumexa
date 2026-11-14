# Lumexa Mission Log: Operating Systems, Networking & Cybersecurity

**Course/Path:** Operating Systems, Networking & Cybersecurity
**Lesson:** 03 of 08
**Title:** Memory Management, Virtual Memory and File Systems
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Python · paging lab

---

## Mission Brief

Your computer may have 8 GB of RAM and yet run programs that together "use" much more. Every program believes that it owns a huge, private memory starting at address zero, and a bug in one program cannot read the memory of another. And when you save a photo, the OS finds free space on the disk, remembers where the pieces are and lets you find it again by a name. These three miracles are **memory management**, **virtual memory** and the **file system**.

In this lesson you learn how the OS gives every process its own **virtual address space**, how **paging** translates virtual addresses into physical ones, what happens on a **page fault** and which page to throw out when memory is full. Then you see how a file system turns a disk of numbered blocks into files and folders. You write the translators and simulators yourself, and add the memory results of the host to your **Computer Network Explorer** dossier.

## Learning Objectives

1. Explain why the OS manages memory: allocation, protection and sharing, and the idea of an address space.
2. Distinguish virtual from physical addresses and translate an address with a page table.
3. Explain demand paging, page faults and thrashing, and compare the FIFO, LRU and optimal replacement algorithms.
4. Explain internal and external fragmentation.
5. Describe how a file system organises files, directories, blocks and metadata, and calculate the disk space that a file uses.
6. Build a paging and file-system simulator for the host in the dossier.

## Prerequisites

- Lessons 1 and 2: processes, the kernel and scheduling.
- Course 5: the memory hierarchy, cache hits and misses, and hexadecimal numbers.
- Python: functions, dictionaries, lists and f-strings.

## Concept Explanation

### Memory management and address spaces

Every running program needs memory for its code, its data and its stack, and the OS must share the RAM among many processes. It has three goals: **allocation** (give each process the memory it needs and take it back when the process ends), **protection** (a process may not touch the memory of another process or of the kernel) and **sharing** (let processes share memory on purpose, for example one copy of a library). To make this simple, the OS gives each process its own **virtual address space**: the process sees addresses from 0 up to a large limit (for 64-bit systems an enormous one), laid out as code, global data, the **heap** that grows upwards, and the **stack** that grows downwards. The addresses a program uses are **virtual** (logical) addresses. The addresses of the real memory chips are **physical** addresses. A hardware unit in the CPU, the **memory management unit (MMU)**, translates every virtual address into a physical one while the OS controls the translation tables.

The simplest scheme gives each process one contiguous block of RAM. It suffers from **external fragmentation**: after many processes have started and finished, the free memory is split into small holes, and a large request fails although the total free memory is enough. Modern systems avoid this with paging.

### Paging

In **paging**, the virtual address space is cut into fixed-size **pages** (typically 4 KiB) and the physical memory into **frames** of the same size. A **page table**, kept for each process, says which frame holds each page. A virtual address is split into a **page number** and an **offset** inside the page: `page, offset = divmod(address, page_size)`. The MMU looks the page number up in the page table, takes the frame number and computes `physical = frame × page_size + offset`. The pages of a process may be scattered anywhere in RAM, so there is no external fragmentation; only the last page of a process is partly empty (**internal fragmentation**), which wastes less than one page. Because a table lookup in memory for every access would be slow, the MMU keeps recent translations in a small, fast cache, the **TLB** (translation lookaside buffer), which works exactly like the caches of Course 5. If a page is not allowed, or does not exist, the hardware raises a fault and the kernel stops the process (a *segmentation fault*).

### Virtual memory and page replacement

With **virtual memory**, not all pages of a process have to be in RAM. The page table can mark a page as *not present*, and the OS keeps that page on the disk, in a swap area. This is **demand paging**: a page is loaded only when it is used. When a process touches a page that is not in RAM, the hardware raises a **page fault**; the kernel finds a free frame (or evicts another page, writing it to disk if it was changed), reads the page from disk, updates the page table and restarts the instruction. A page fault costs millions of times more than a normal memory access, so the *hit rate* of the pages in RAM is vital. If a system has too little RAM for the pages that its processes use, it spends its time swapping pages in and out instead of running programs, which is called **thrashing**.

When RAM is full and a new page must come in, a **page replacement algorithm** chooses the victim. **FIFO** evicts the page that has been in memory longest; it is simple but may evict a page that is used all the time, and it can even suffer from **Belady's anomaly**: with some reference strings, *more* frames cause *more* faults. **LRU** (least recently used) evicts the page that has not been used for the longest time, on the assumption that the past predicts the future (locality); it is good but needs bookkeeping, so real systems use approximations. **Optimal** evicts the page whose next use is farthest in the future; it gives the fewest faults possible, but it needs to know the future, so it is only a yardstick.

### File systems

Programs need to keep data after they end, so the OS provides **files**: named sequences of bytes on a persistent device. A **file system** organises the disk, which is a long array of numbered **blocks** (typically 4 KiB), into **directories** (folders) and files, in a **tree** that starts at the **root** (`/` in Unix, `C:\` in Windows). A **path** such as `/home/ana/notes.txt` names a file by walking down the tree. For every file the file system stores **metadata**: the size, the owner, the permissions, the times of creation and change and the list of blocks. In Unix file systems this record is the **inode**; the directory entry only links a name to an inode number, which is why one file can have several names (**hard links**). A file may be stored in **contiguous** blocks (fast, but it suffers from fragmentation), as a **linked** chain of blocks (as in FAT) or with an **index** of block numbers (as in inodes); a **bitmap** records which blocks are free. A file always takes whole blocks, so the unused part of its last block is wasted. A **journaling** file system writes its intended changes to a log first, so that it can repair itself after a power failure.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Virtual address** | An address inside a process's own address space; the MMU translates it. |
| **Physical address** | The address of a real location in RAM. |
| **Page / frame** | A fixed-size piece of virtual memory / of physical memory. |
| **Page table** | The per-process table that maps pages to frames. |
| **MMU / TLB** | The hardware that translates addresses / its cache of recent translations. |
| **Page fault** | A trap that happens when a process uses a page that is not in RAM. |
| **Demand paging** | Loading a page into RAM only when it is first used. |
| **Thrashing** | Constant swapping because there is too little RAM for the pages in use. |
| **Fragmentation** | Wasted memory: unused space inside a page or block (internal) or small unusable holes between blocks (external). |
| **Inode** | The record of a file's metadata and block list in a Unix file system. |
| **Directory / path** | A file that lists names and what they point to / the route from the root to a file. |
| **Journaling** | Writing planned changes to a log first so that the file system can recover after a crash. |

## Worked Examples

### Example 1: Translating addresses with a page table

```python
PAGE_SIZE = 4096                                   # 4 KiB pages, like most real systems
PAGE_TABLE = {0: 5, 1: 2, 2: 7, 3: None}           # virtual page -> physical frame (None: not in RAM)


def translate(virtual_address):
    page, offset = divmod(virtual_address, PAGE_SIZE)
    if page not in PAGE_TABLE:
        return page, offset, None, "SEGMENTATION FAULT (no such page)"
    frame = PAGE_TABLE[page]
    if frame is None:
        return page, offset, None, "PAGE FAULT (the page is on disk)"
    return page, offset, frame, f"{frame * PAGE_SIZE + offset:#06x}"


print("virtual   page  offset  frame  physical address")
for address in (0x0000, 0x0010, 0x1234, 0x2FFF, 0x3000, 0x9000):
    page, offset, frame, result = translate(address)
    shown = "-" if frame is None else frame
    print(f"{address:#06x}  {page:>5}  {offset:>6}  {shown:>5}  {result}")
```

```output
virtual   page  offset  frame  physical address
0x0000      0       0      5  0x5000
0x0010      0      16      5  0x5010
0x1234      1     564      2  0x2234
0x2fff      2    4095      7  0x7fff
0x3000      3       0      -  PAGE FAULT (the page is on disk)
0x9000      9       0      -  SEGMENTATION FAULT (no such page)
```

1. `divmod(address, 4096)` splits the virtual address into the page number and the offset inside the page. For 0x1234 (4,660) that is page 1 and offset 564.
2. The page table says that page 1 is in frame 2, so the physical address is 2 × 4096 + 564 = 0x2234. The offset never changes: only the page number is translated.
3. Page 3 exists but is marked *not present*: the hardware raises a **page fault** and the OS would load the page from disk. Page 9 is not in the table at all, which is a **segmentation fault** and ends the program.
4. Pages 0, 1 and 2 are in frames 5, 2 and 7, in a different order and not next to each other: the process sees one continuous memory, but the frames are scattered.

### Example 2: Page replacement

```python
def fifo(refs, frames):
    memory, faults = [], 0
    for page in refs:
        if page not in memory:
            faults += 1
            if len(memory) == frames:
                memory.pop(0)                          # evict the page that arrived first
            memory.append(page)
    return faults


def lru(refs, frames):
    memory, faults = [], 0                             # the least recently used page is first in the list
    for page in refs:
        if page in memory:
            memory.remove(page)                        # a hit: it becomes the most recently used
        else:
            faults += 1
            if len(memory) == frames:
                memory.pop(0)
        memory.append(page)
    return faults


def optimal(refs, frames):
    memory, faults = [], 0
    for i, page in enumerate(refs):
        if page in memory:
            continue
        faults += 1
        if len(memory) == frames:
            future = refs[i + 1:]
            # evict the page whose next use is farthest away (or that is never used again)
            memory.remove(max(memory, key=lambda p: future.index(p) if p in future else len(future) + 1))
        memory.append(page)
    return faults


REFS = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
print(f"{len(REFS)} page references, 3 frames")
for name, algorithm in (("FIFO", fifo), ("LRU", lru), ("Optimal", optimal)):
    faults = algorithm(REFS, 3)
    print(f"  {name:<8} {faults:>2} page faults, hit rate {1 - faults / len(REFS):.0%}")

BELADY = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
print("\nBelady's anomaly with FIFO on", BELADY)
for frames in (3, 4):
    print(f"  {frames} frames: {fifo(BELADY, frames)} page faults")
```

```output
20 page references, 3 frames
  FIFO     15 page faults, hit rate 25%
  LRU      12 page faults, hit rate 40%
  Optimal   9 page faults, hit rate 55%

Belady's anomaly with FIFO on [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
  3 frames: 9 page faults
  4 frames: 10 page faults
```

1. The same 20 page references are run through three policies with 3 frames. **FIFO** has 15 faults, **LRU** 12 and **Optimal** 9, so the hit rates are 25%, 40% and 55%.
2. LRU uses the past to guess the future and is much better than FIFO here. Optimal looks at the real future (`future.index`), which no real OS can do: it shows how close LRU comes to the best possible.
3. The second test is **Belady's anomaly**: with FIFO, giving the program a fourth frame *increases* the faults from 9 to 10. LRU and Optimal never behave like this.
4. A page fault takes milliseconds on a disk and a memory access only nanoseconds, so a few percent fewer faults makes a large difference.

### Example 3: A tiny file system

```python
BLOCK = 4096                                       # bytes per disk block

FILESYSTEM = {                                     # a directory is a dict, a file is its size in bytes
    "home": {
        "ana": {"notes.txt": 1_200, "photo.jpg": 3_500_000, "essay.docx": 48_000},
        "ben": {"game.py": 9_800, "scores.csv": 4_096},
    },
    "etc": {"hosts": 220, "passwd": 1_900},
    "empty": {},
}


def blocks_for(size):
    return -(-size // BLOCK)                       # round up: even 1 byte needs a whole block


def show(tree, depth=0):
    """Print the tree and return (blocks used, bytes of data) below this directory."""
    total_blocks = total_bytes = 0
    for name, item in tree.items():
        if isinstance(item, dict):
            print("  " * depth + name + "/")
            b, s = show(item, depth + 1)
        else:
            b, s = blocks_for(item), item
            print("  " * depth + f"{name}  {s:,} bytes in {b} block(s)")
        total_blocks, total_bytes = total_blocks + b, total_bytes + s
    return total_blocks, total_bytes


def find(tree, path):
    node = tree
    for part in path.strip("/").split("/"):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


blocks, data = show(FILESYSTEM)
print(f"\ntotal: {data:,} bytes of data use {blocks} blocks = {blocks * BLOCK:,} bytes of disk")
print(f"wasted in the last block of each file: {blocks * BLOCK - data:,} bytes")
for path in ("/home/ana/notes.txt", "/home/ben", "/home/zoe/plan.txt"):
    found = find(FILESYSTEM, path)
    print(f"{path}: " + ("not found" if found is None else "a directory" if isinstance(found, dict) else f"{found:,} bytes"))
```

```output
home/
  ana/
    notes.txt  1,200 bytes in 1 block(s)
    photo.jpg  3,500,000 bytes in 855 block(s)
    essay.docx  48,000 bytes in 12 block(s)
  ben/
    game.py  9,800 bytes in 3 block(s)
    scores.csv  4,096 bytes in 1 block(s)
etc/
  hosts  220 bytes in 1 block(s)
  passwd  1,900 bytes in 1 block(s)
empty/

total: 3,565,216 bytes of data use 874 blocks = 3,579,904 bytes of disk
wasted in the last block of each file: 14,688 bytes
/home/ana/notes.txt: 1,200 bytes
/home/ben: a directory
/home/zoe/plan.txt: not found
```

1. The file system is a **tree**: a directory is a dictionary of names and a file is a number (its size). `show` walks the tree recursively, indenting each level.
2. `blocks_for` rounds up: the 1,200-byte file takes one whole block, and `scores.csv`, at exactly 4,096 bytes, takes exactly one. The 3,500,000-byte photo needs 855 blocks.
3. Altogether 3,565,216 bytes of data occupy 874 blocks (3,579,904 bytes of disk), so 14,688 bytes are wasted in the last blocks: **internal fragmentation**, on average half a block per file.
4. `find` resolves a **path** by walking down one name at a time and returns `None` as soon as a name is missing, which is what "No such file or directory" means.

## Common Mistakes and Misconceptions

- **Confusing virtual and physical addresses.** Programs only ever see virtual addresses; the MMU produces the physical ones.
- **Translating the offset.** Only the page number is looked up; the offset is copied unchanged into the physical address.
- **Thinking that a page fault is an error.** It is a normal event in demand paging: the OS loads the page and the program carries on.
- **Believing that more frames always mean fewer faults.** True for LRU and Optimal, but not for FIFO (Belady's anomaly).
- **Mixing up internal and external fragmentation.** Internal is waste *inside* an allocated page or block; external is unusable free space *between* allocated pieces.
- **Thinking that deleting a file erases its data.** Usually only the directory entry and the inode are released; the blocks keep their old content until they are reused.
- **Forgetting that every file takes whole blocks.** Thousands of tiny files waste far more space than their sizes suggest.
- **Ignoring thrashing.** Adding more programs to a computer with too little RAM makes everything slower, not just the new program.

## Guided Hands-On Activity

**Translate, replace and measure.** Work with your teacher.

1. In Example 1 translate the addresses 0x1FFF and 0x2000 by hand and then add them to the loop. Which pages are they in, and why do they land in frames 2 and 7?
2. In Example 1 change the page size to 1024 and the table to `{0: 3, 1: 8, 2: None, 3: 1}`. Predict the physical address of virtual address 1030, then run it.
3. In Example 2 run the string `[1, 2, 3, 1, 2, 3, 1, 2, 3]` with 2 and with 3 frames. What happens to FIFO and LRU, and why is a loop over three pages bad with two frames?
4. In Example 3 add a file of 8,192 bytes and one of 8,193 bytes to a directory. How many blocks does each take?
5. In Example 3 add `find(FILESYSTEM, "/etc")`. What does it return, and how would you list the names inside?
6. On your own computer, find the "cluster" or "block" size of your file system (on Windows: `fsutil fsinfo ntfsinfo C:` or a file's *Size on disk*; on Linux: `stat -f .`) and compare a small file's size with its size on disk.

## Lesson Project: Paging Playground

### Objective

Write a **paging playground** for the host in your dossier: translate the addresses of the host's `python` process with a page table, compare FIFO, LRU and optimal replacement for the browser's page references with 3, 4 and 5 frames, and survey the host's files for disk usage. This adds the memory page to your **Computer Network Explorer** dossier.

### Requirements

- **Address translation.** Page size 1024 bytes and the page table `{0: 3, 1: 8, 2: None, 3: 1, 4: None, 5: 6}`. Translate the addresses 100, 1030, 2100, 3072, 3500, 4200, 5500 and 6200, and print the page, the offset, the frame and the physical address, or `PAGE FAULT` (page not in RAM) or `SEGMENTATION FAULT` (no such page).
- **Page replacement.** For the references `[1, 2, 3, 4, 2, 1, 5, 6, 2, 1, 2, 3, 7, 6, 3, 2, 1, 2, 3, 6]` print the number of page faults of FIFO, LRU and optimal for 3, 4 and 5 frames, and the smallest number of frames for which LRU has at most 8 faults.
- **File-system survey.** For the directory tree `home/student` (notes.txt 2,300 bytes; project.py 5,100; photo.png 215,000), `var/log` (syslog 120,000; auth.log 8,200) and `tmp` (cache.bin 4,096) with 4,096-byte blocks, print the number of files, the bytes of data, the blocks used, the bytes wasted and the path of the largest file (use a recursive generator that yields `(path, size)`).
- In the dossier, add a short recommendation: which replacement algorithm you would use for the host, and why.

### Instructions

1. Write `translate(address)` with `divmod` and the three outcomes.
2. Print the translation table for the eight addresses.
3. Copy `fifo`, `lru` and `optimal` from Example 2 and print the table for 3, 4 and 5 frames.
4. Find the smallest number of frames with at most 8 LRU faults using a loop.
5. Write the generator `walk(tree, prefix)` that yields every file with its full path.
6. Compute the survey figures and print them.
7. Compare with the expected output and write the recommendation.

### Expected Output

```text
Address translation of the python process (page size 1024)
virtual  page  offset  frame  physical
    100     0     100      3  3172
   1030     1       6      8  8198
   2100     2      52      -  PAGE FAULT
   3072     3       0      1  1024
   3500     3     428      1  1452
   4200     4     104      -  PAGE FAULT
   5500     5     380      6  6524
   6200     6      56      -  SEGMENTATION FAULT

Page faults of the browser (20 references)
frames  FIFO  LRU  Optimal
     3    16   15       11
     4    14   10        8
     5    10    8        7
smallest number of frames with at most 8 LRU faults: 5

File-system survey
  6 files, 354,696 bytes of data
  90 blocks of 4096 bytes = 368,640 bytes of disk
  13,944 bytes wasted in the last blocks
  largest file: /home/student/photo.png
```

### Hints

1. **Hint 1 (the split).** `page, offset = divmod(address, 1024)`; the physical address is `frame * 1024 + offset`.
2. **Hint 2 (the faults).** `PAGE_TABLE.get(page, "missing")` lets you tell a missing page from a page with the value `None`.
3. **Hint 3 (the table).** `f"{frames:>6}  {fifo(REFS, frames):>4}  {lru(REFS, frames):>3}  {optimal(REFS, frames):>7}"` aligns the columns.
4. **Hint 4 (the smallest).** `next(f for f in range(1, 10) if lru(REFS, f) <= 8)`.
5. **Hint 5 (the generator).** Use `yield` for a file and `yield from walk(item, path + "/")` for a directory.
6. **Hint 6 (the largest).** `max(files, key=lambda f: f[1])` finds the file with the largest size.

### Success Criteria

- [ ] The translation table shows the right frames and physical addresses, two page faults and one segmentation fault.
- [ ] The page-fault table is correct for 3, 4 and 5 frames, and LRU reaches at most 8 faults with 5 frames.
- [ ] The survey reports six files, the data size, the blocks used, the waste and `/home/student/photo.png` as the largest file.
- [ ] The program uses a recursive generator for the files.
- [ ] The dossier contains a recommendation with a reason.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Add a **TLB** with 2 entries to the translator (use LRU replacement for its entries) and count the TLB hits for a list of 20 addresses that stay mostly in two pages. Then add the **clock** (second-chance) page replacement algorithm, which approximates LRU with a reference bit, and compare its faults with LRU on the reference string. Finally, extend the file-system survey to a list of the five biggest wasters of space (the files with the most wasted bytes in their last block).

## Lesson Recap

- Every process has a **virtual address space**; the **MMU** translates virtual addresses to physical ones using a **page table**, and only the page number is translated, never the offset.
- **Virtual memory** keeps only the needed pages in RAM (**demand paging**); a **page fault** loads a missing page from disk, and **thrashing** happens when there is too little RAM.
- **FIFO, LRU** and **optimal** replacement differ in the faults they cause; FIFO can show **Belady's anomaly**, and LRU approximates the unreachable optimum.
- A **file system** organises disk blocks into a tree of directories and files with **inodes**; files take whole blocks, so the last block of each file wastes space.

## Homework / Extension Mission

Find the amount of RAM of your computer and the number of processes running, and estimate how much memory an average process would get if the RAM were divided equally. Explain in a paragraph why virtual memory allows the total memory of all processes to be larger than the RAM, and what the cost is. Then draw a directory tree of your own school folder with six files, choose realistic file sizes, and compute by hand how many 4,096-byte blocks they need and how many bytes are wasted. Finally, explain what happens to the data of a file when you delete it.

## Course Project Connection

This lesson adds the **memory page** to the **Computer Network Explorer**, the course project: the host profile from Lesson 1 and the scheduling results from Lesson 2 now have memory behaviour (address translation and page replacement) and a file-system layout. A server that handles many network connections is exactly the kind of host that needs enough RAM and a good replacement policy. From Lesson 4 you leave the single host and connect many hosts into a network.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the idea of a private address space (ask: how can two programs both use address 1000?); 15 minutes: paging by hand on the board with a four-page table; 10 minutes: page replacement (students run FIFO by hand on a short string); 10 minutes: file systems, blocks and wasted space; 15 minutes: the project.

**Live demonstrations.** Translate one address on the board in binary: the top bits are the page number and the low 12 bits are the offset. Show Belady's anomaly by running the two frame counts. On Linux show `ls -l` against `du` for a small file, or the Windows *Size* against *Size on disk*.

**Misconceptions.** "A page fault is a crash." "More RAM always means fewer faults." "Virtual memory is the same as the swap file." "Deleting wipes the data."

**Assessment of the project.** Check the translation table (including the two kinds of fault), the fault table for 3, 4 and 5 frames and the survey figures. Ask students why LRU needs 5 frames for at most 8 faults and what Optimal would need.

**Reference solution `paging_playground.py`** (run with `python3 paging_playground.py`):

```python
"""Paging Playground: address translation, page replacement and a file-system survey of the host."""

PAGE_SIZE = 1024
PAGE_TABLE = {0: 3, 1: 8, 2: None, 3: 1, 4: None, 5: 6}      # page -> frame (None: on disk)


def translate(address):
    page, offset = divmod(address, PAGE_SIZE)
    if page not in PAGE_TABLE:
        return page, offset, "-", "SEGMENTATION FAULT"
    frame = PAGE_TABLE[page]
    if frame is None:
        return page, offset, "-", "PAGE FAULT"
    return page, offset, frame, frame * PAGE_SIZE + offset


print("Address translation of the python process (page size 1024)")
print("virtual  page  offset  frame  physical")
for address in (100, 1030, 2100, 3072, 3500, 4200, 5500, 6200):
    page, offset, frame, physical = translate(address)
    print(f"{address:>7}  {page:>4}  {offset:>6}  {frame:>5}  {physical}")


def fifo(refs, frames):
    memory, faults = [], 0
    for page in refs:
        if page not in memory:
            faults += 1
            if len(memory) == frames:
                memory.pop(0)
            memory.append(page)
    return faults


def lru(refs, frames):
    memory, faults = [], 0
    for page in refs:
        if page in memory:
            memory.remove(page)
        else:
            faults += 1
            if len(memory) == frames:
                memory.pop(0)
        memory.append(page)
    return faults


def optimal(refs, frames):
    memory, faults = [], 0
    for i, page in enumerate(refs):
        if page in memory:
            continue
        faults += 1
        if len(memory) == frames:
            future = refs[i + 1:]
            memory.remove(max(memory, key=lambda p: future.index(p) if p in future else len(future) + 1))
        memory.append(page)
    return faults


REFS = [1, 2, 3, 4, 2, 1, 5, 6, 2, 1, 2, 3, 7, 6, 3, 2, 1, 2, 3, 6]
print("\nPage faults of the browser (20 references)")
print("frames  FIFO  LRU  Optimal")
for frames in (3, 4, 5):
    print(f"{frames:>6}  {fifo(REFS, frames):>4}  {lru(REFS, frames):>3}  {optimal(REFS, frames):>7}")
print("smallest number of frames with at most 8 LRU faults:", next(f for f in range(1, 10) if lru(REFS, f) <= 8))

BLOCK = 4096
HOST_FILES = {
    "home": {"student": {"notes.txt": 2_300, "project.py": 5_100, "photo.png": 215_000}},
    "var": {"log": {"syslog": 120_000, "auth.log": 8_200}},
    "tmp": {"cache.bin": 4_096},
}


def walk(tree, prefix=""):
    for name, item in tree.items():
        path = f"{prefix}/{name}"
        if isinstance(item, dict):
            yield from walk(item, path)
        else:
            yield path, item


files = list(walk(HOST_FILES))
data = sum(size for _, size in files)
blocks = sum(-(-size // BLOCK) for _, size in files)
print("\nFile-system survey")
print(f"  {len(files)} files, {data:,} bytes of data")
print(f"  {blocks} blocks of {BLOCK} bytes = {blocks * BLOCK:,} bytes of disk")
print(f"  {blocks * BLOCK - data:,} bytes wasted in the last blocks")
print("  largest file:", max(files, key=lambda f: f[1])[0])
```

```output
Address translation of the python process (page size 1024)
virtual  page  offset  frame  physical
    100     0     100      3  3172
   1030     1       6      8  8198
   2100     2      52      -  PAGE FAULT
   3072     3       0      1  1024
   3500     3     428      1  1452
   4200     4     104      -  PAGE FAULT
   5500     5     380      6  6524
   6200     6      56      -  SEGMENTATION FAULT

Page faults of the browser (20 references)
frames  FIFO  LRU  Optimal
     3    16   15       11
     4    14   10        8
     5    10    8        7
smallest number of frames with at most 8 LRU faults: 5

File-system survey
  6 files, 354,696 bytes of data
  90 blocks of 4096 bytes = 368,640 bytes of disk
  13,944 bytes wasted in the last blocks
  largest file: /home/student/photo.png
```

**Differentiation.** Support: provide `translate`, the three algorithms and the file tree, and ask students to write the driver code and the generator. Stretch: the TLB, the clock algorithm and the "biggest wasters" list.

**Discussion questions (not for the student quiz).** Why does the OS keep a *separate* page table for every process? What would happen to security if all processes shared one? Why is it dangerous to treat a file system that *looks* empty after deleting as really empty?
