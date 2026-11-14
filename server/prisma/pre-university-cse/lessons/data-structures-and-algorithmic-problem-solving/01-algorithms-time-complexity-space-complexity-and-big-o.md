# Lumexa Mission Log: Data Structures & Algorithmic Problem-Solving

**Course/Path:** Data Structures & Algorithmic Problem-Solving
**Lesson:** 01 of 08
**Title:** Algorithms, Time Complexity, Space Complexity and Big O
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** C++ (g++)

---

## Mission Brief

Two students write a program that finds a name in a list of one million students. Both programs are correct. On the teacher's laptop, the first answers instantly; the second takes eleven minutes. Neither student made a mistake in the *logic*: they chose different **algorithms**, and one grows far more slowly than the other as the list gets longer.

Correct code is the beginning of software engineering, not the end. Real systems search millions of records, route millions of packets and sort billions of values, so how an algorithm's cost **grows with the size of the input** matters more than almost anything else. In this lesson you learn to measure that growth without a stopwatch, to describe it in the language professionals use (**Big O notation**), and to build the first piece of the course project: the **Algorithm Explorer's counter harness**, a tool that every later algorithm in this course will plug into.

## Learning Objectives

1. Define an algorithm and the qualities of a good one (correctness, efficiency, clarity).
2. Measure the cost of an algorithm by counting basic operations as a function of the input size *n*.
3. Explain Big O notation, and rank O(1), O(log n), O(n), O(n log n), O(n²) and O(2ⁿ) by growth.
4. Work out the time complexity of loops, nested loops and halving loops, and distinguish best, average and worst cases.
5. Explain space complexity, in-place algorithms and the memory used by recursion.
6. Build the operation-counting harness of the Algorithm Explorer and use it to classify four algorithms by their growth.

## Prerequisites

- Course 1: loops, nested loops, functions and arrays.
- Course 2: `vector`, lambdas and `std::function` are used lightly in the project.

## Concept Explanation

### What makes an algorithm good?

An **algorithm** is a finite, precise sequence of steps that solves a problem. A good algorithm is **correct** (it gives the right answer for every valid input), **efficient** (it does not waste time or memory) and **clear** (people can read and maintain it). In this course, correctness comes first, and then we compare efficiency, which is the subject of this lesson.

### Counting operations instead of seconds

Timing a program with a stopwatch depends on the computer, the compiler, what else is running and the exact input. Two people would get different numbers for the same algorithm. Computer scientists instead **count basic operations** (a comparison, an addition, an assignment) and express the count as a function of the **input size** *n*. For a list of *n* names, a search that looks at every name does about *n* comparisons, on any computer.

```cpp
long long steps = 0;
for (int i = 0; i < n; i++) {
    steps++;                       // one basic operation per pass
}
// steps == n
```

### Big O notation

**Big O notation** describes how the cost grows when *n* becomes large, keeping only the most important term and ignoring constants. An algorithm that does 3n + 5 steps is **O(n)**: for large *n* the "3" and the "+ 5" do not change the *shape* of the growth. The common classes, from slowest-growing (best) to fastest-growing (worst):

| Class | Name | Typical example | If n doubles... |
|---|---|---|---|
| O(1) | constant | read the first element | cost stays the same |
| O(log n) | logarithmic | binary search (halving) | cost grows by one step |
| O(n) | linear | scan a list once | cost doubles |
| O(n log n) | linearithmic | a good sort (merge sort) | cost a little more than doubles |
| O(n²) | quadratic | compare every pair | cost quadruples |
| O(2ⁿ) | exponential | try every subset | cost squares: hopeless for large n |

Two rules make Big O easy: **drop constants** (O(5n) is O(n)) and **drop lower-order terms** (O(n² + n) is O(n²)), because for large *n* the biggest term dominates.

### Analysing code

You can read the complexity straight from the structure of the code:

- **A single loop** over *n* items: O(n).
- **A loop inside a loop**, both over *n*: O(n²).
- **Two loops one after the other**: O(n) + O(n) = O(n), because the constants are dropped.
- **A loop that halves (or doubles) its variable each pass**, such as `while (n > 1) n /= 2;`: O(log n), because you can halve *n* only about log₂ n times before reaching 1.
- **A loop of n passes that contains a halving loop**: O(n log n).

### Best, average and worst case

The cost may depend on the data and not only on its size. Searching a list for a name finds it at once if it is first (**best case**, O(1)), after about half the list on average (**average case**, O(n)), or only after checking everything if it is last or missing (**worst case**, O(n)). Unless told otherwise, Big O means the **worst case**, because it is a promise that the algorithm will never be slower than that.

### Space complexity

**Space complexity** counts the extra memory an algorithm needs, beyond its input, as a function of *n*. An algorithm that adds up a list with one variable uses O(1) extra space; one that makes a sorted copy of the list uses O(n). An algorithm that works inside the input, with only a few extra variables, is **in place**. Recursion costs space too: each pending call is stored on the call stack, so a recursion that goes *n* deep uses O(n) space. There is often a **trade-off**: a hash table (Lesson 6) buys speed with extra memory.

### Why it matters

At a billion simple operations per second, an O(n²) algorithm on a million items needs about 10¹² operations, roughly 17 minutes; an O(n log n) algorithm needs about 2 × 10⁷, which is a fiftieth of a second. An O(2ⁿ) algorithm on only 60 items would take decades. Choosing the right algorithm is worth more than any amount of faster hardware.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Algorithm** | A finite, precise sequence of steps that solves a problem. |
| **Input size (n)** | The amount of data an algorithm works on, such as the length of a list. |
| **Time complexity** | How the number of operations grows with the input size. |
| **Big O notation** | A way to describe growth that keeps the dominant term and ignores constants. |
| **Worst / best / average case** | The cost for the least favourable, most favourable and typical inputs of a given size. |
| **Space complexity** | How the extra memory used grows with the input size. |
| **In-place algorithm** | An algorithm that uses only O(1) extra memory beyond its input. |
| **Logarithmic growth** | Growth that adds a constant each time the input doubles. |
| **Exponential growth** | Growth that multiplies by a constant each time the input grows by one. |
| **Trade-off** | Gaining speed by spending memory, or the reverse. |

## Worked Examples

### Example 1: Counting steps in three loops

```cpp
#include <iostream>
using namespace std;

long long linear_steps(int n)
{
    long long steps = 0;
    for (int i = 0; i < n; i++) {
        steps++;
    }
    return steps;
}

long long nested_steps(int n)
{
    long long steps = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            steps++;
        }
    }
    return steps;
}

long long halving_steps(int n)
{
    long long steps = 0;
    while (n > 1) {
        n /= 2;
        steps++;
    }
    return steps;
}

int main()
{
    for (int n = 10; n <= 40; n *= 2) {
        cout << "n=" << n << ": linear " << linear_steps(n) << ", nested " << nested_steps(n)
             << ", halving " << halving_steps(n) << '\n';
    }
    return 0;
}
```

```output
n=10: linear 10, nested 100, halving 3
n=20: linear 20, nested 400, halving 4
n=40: linear 40, nested 1600, halving 5
```

1. Each function counts its own basic operations in `steps` instead of timing anything.
2. When *n* doubles from 10 to 20 to 40, the linear count doubles (10, 20, 40), and the nested count **quadruples** (100, 400, 1600).
3. The halving count barely moves: 3, 4, 5. Each doubling of *n* adds just one step, which is the signature of O(log n).
4. You can recognise a growth class from how the count reacts when *n* doubles. You will use exactly this idea in the project.

### Example 2: How long would it really take?

```cpp
#include <iomanip>
#include <iostream>
#include <string>
using namespace std;

string pretty(double seconds)
{
    if (seconds < 1.0) {
        return "under a second";
    }
    if (seconds < 3600.0) {
        return to_string(static_cast<long long>(seconds)) + " seconds";
    }
    if (seconds < 86400.0 * 365) {
        return to_string(static_cast<long long>(seconds / 86400.0)) + " days";
    }
    return to_string(static_cast<long long>(seconds / (86400.0 * 365))) + " years";
}

int main()
{
    const double per_second = 1e9;
    cout << left << setw(6) << "n" << setw(18) << "O(n)" << setw(18) << "O(n^2)" << "O(2^n)\n";
    for (int n : {20, 40, 60}) {
        double linear = n / per_second;
        double quadratic = static_cast<double>(n) * n / per_second;
        double exponential = static_cast<double>(1ULL << n) / per_second;
        cout << left << setw(6) << n << setw(18) << pretty(linear) << setw(18) << pretty(quadratic) << pretty(exponential) << '\n';
    }
    return 0;
}
```

```output
n     O(n)              O(n^2)            O(2^n)
20    under a second    under a second    under a second
40    under a second    under a second    1099 seconds
60    under a second    under a second    36 years
```

1. The program assumes a computer that does one billion operations per second and converts each operation count into time.
2. For *n* = 20 every algorithm is instant, which is why a slow algorithm can look fine in a small test. At *n* = 40 the exponential algorithm already needs about 18 minutes while the other two are still instant.
3. At *n* = 60 the O(2ⁿ) algorithm needs more than thirty years, while the O(n²) one is still instant.
4. The lesson: test with *large* inputs, and read the growth class before you trust a program that "works".

### Example 3: Best, worst and average case

```cpp
#include <iostream>
#include <vector>
using namespace std;

int linear_search(const vector<int>& v, int target, int& comparisons)
{
    comparisons = 0;
    for (size_t i = 0; i < v.size(); i++) {
        comparisons++;
        if (v[i] == target) {
            return static_cast<int>(i);
        }
    }
    return -1;
}

int main()
{
    vector<int> v = {40, 7, 19, 33, 5, 28, 12, 61};
    int c = 0;
    linear_search(v, 40, c);
    cout << "best case (first item): " << c << " comparison(s)\n";
    linear_search(v, 61, c);
    cout << "worst case (last item): " << c << " comparison(s)\n";
    linear_search(v, 99, c);
    cout << "not found: " << c << " comparison(s)\n";

    int total = 0;
    for (int x : v) {
        linear_search(v, x, c);
        total += c;
    }
    cout << "average over all items: " << static_cast<double>(total) / v.size() << " comparisons\n";
    return 0;
}
```

```output
best case (first item): 1 comparison(s)
worst case (last item): 8 comparison(s)
not found: 8 comparison(s)
average over all items: 4.5 comparisons
```

1. Searching for the first value costs one comparison, the best case. Searching for the last value, or for a value that is missing, costs all 8: the worst case.
2. The average over every item in the list is (1 + 2 + ... + 8) / 8 = 4.5, which is about *n*/2.
3. Big O keeps only the dominant term and drops the constant ½, so the average case is still O(n), the same class as the worst case.
4. The algorithm is the same; only the input changes the cost. That is why we always say *which* case we are describing.

## Common Mistakes and Misconceptions

- **Timing instead of counting.** A stopwatch measures one machine on one day. Counting operations compares algorithms fairly.
- **Believing O(n) is always faster than O(n²).** Big O is about growth for large *n*. For very small inputs a "worse" algorithm can be faster. Test with large inputs.
- **Keeping constants.** "O(3n)" is just O(n). Constants matter in practice, but not in the Big O class.
- **Confusing O(log n) with O(n).** A halving loop is logarithmic: a million items need only about 20 steps.
- **Assuming the average case equals the worst case.** They can differ, for example in quicksort (Lesson 3). Always say which case you mean.
- **Counting only time and forgetting space.** An algorithm that is fast but needs gigabytes of extra memory may not be usable. Think about both.
- **Thinking Big O gives the exact running time.** It gives the *shape* of the growth, not a number of seconds.
- **Ignoring hidden loops.** A call to a function that itself loops (or `string::find`, or `vector::insert` in the middle) adds its own cost to your analysis.

## Guided Hands-On Activity

**Be the profiler.** Work with your teacher.

1. Type Example 1 and run it. Before you do, predict the three numbers for *n* = 20, then check.
2. Add a fourth function, `triple_steps`, with three nested loops, and print its count for *n* = 10, 20 and 40. What happens when *n* doubles? Which class is it?
3. Add a function with a single loop that runs `n / 2` times. Is it still O(n)? Why?
4. Type Example 2 and add *n* = 80 for the O(n²) column. Then try to add 100 for O(2ⁿ): what goes wrong with `1ULL << n`, and what does that tell you?
5. Type Example 3 and change the vector so the target is in the middle. How many comparisons now?
6. For each of these, write the Big O: (a) printing the first element, (b) a loop that adds up all elements, (c) a loop inside a loop over pairs, (d) `while (n > 0) n /= 10;` (counting digits), (e) two separate loops over the same list.

## Lesson Project: Algorithm Explorer: The Counter Harness

### Objective

Start the course project, the **Algorithm Explorer**, by building its core: a reusable **counter harness** that runs any algorithm on growing input sizes, counts its basic operations, and reports *how the count grows* when *n* doubles. Every algorithm you write in this course will plug into it.

### Requirements

- A `Counter` structure with a `steps` field (a `long long`) that algorithms increase for each basic operation.
- Five algorithms with the signature `void name(int n, Counter& c)`: `constant_time` (1 step), `logarithmic` (halving), `linear`, `n_log_n` (a linear loop that contains a halving loop) and `quadratic`.
- A function `report(name, algorithm)` that runs the algorithm for *n* = 8, 16, 32, 64, 128 and 256, and prints *n*, the steps and the growth since the previous size.
- A function `describe(previous, current)` that returns the growth class: *stays the same* (O(1)), *adds 1* (O(log n)), *doubles* (O(n)), *a bit more than doubles* (O(n log n)) or *quadruples* (O(n²)).
- `main` reports the five algorithms and then prints a summary table of the steps of every algorithm for *n* = 1000.
- Each algorithm is a separate function that knows nothing about the report: the harness takes it as a parameter (`function<void(int, Counter&)>`).

### Instructions

1. Write the `Counter` structure and the five algorithms. Test each one alone for *n* = 8 and *n* = 16 by hand.
2. Write `describe`, using the ratio of the two counts. Check the "adds 1" case first, then the ratio ranges.
3. Write `report` with `setw` so the columns line up, and call it for one algorithm.
4. Call `report` for all five algorithms.
5. Write the summary table for *n* = 1000, using the same `Counter` and one line per algorithm.
6. Compile with `-Wall -Wextra`, run, and compare with the expected output. Find the case in which two classes look similar and explain why `describe` can tell them apart.
7. Add a comment above each algorithm that states its Big O and its space complexity.

### Expected Output

```text
constant_time
     n     steps  growth when n doubles
     8         1  -
    16         1  stays the same -> O(1)
    32         1  stays the same -> O(1)
    64         1  stays the same -> O(1)
   128         1  stays the same -> O(1)
   256         1  stays the same -> O(1)

logarithmic
     n     steps  growth when n doubles
     8         3  -
    16         4  adds 1 -> O(log n)
    32         5  adds 1 -> O(log n)
    64         6  adds 1 -> O(log n)
   128         7  adds 1 -> O(log n)
   256         8  adds 1 -> O(log n)

linear
     n     steps  growth when n doubles
     8         8  -
    16        16  doubles -> O(n)
    32        32  doubles -> O(n)
    64        64  doubles -> O(n)
   128       128  doubles -> O(n)
   256       256  doubles -> O(n)

n_log_n
     n     steps  growth when n doubles
     8        24  -
    16        64  a bit more than doubles -> O(n log n)
    32       160  a bit more than doubles -> O(n log n)
    64       384  a bit more than doubles -> O(n log n)
   128       896  a bit more than doubles -> O(n log n)
   256      2048  a bit more than doubles -> O(n log n)

quadratic
     n     steps  growth when n doubles
     8        64  -
    16       256  quadruples -> O(n^2)
    32      1024  quadruples -> O(n^2)
    64      4096  quadruples -> O(n^2)
   128     16384  quadruples -> O(n^2)
   256     65536  quadruples -> O(n^2)

Steps for n = 1000
constant_time          1
logarithmic            9
linear              1000
n_log_n             9000
quadratic        1000000
```

### Hints

1. **Hint 1 (the algorithms).** For `n_log_n`: `for (int i = 0; i < n; i++) { int m = n; while (m > 1) { m /= 2; c.steps++; } }`.
2. **Hint 2 (the class).** Write `double ratio = static_cast<double>(current) / previous;` and test `current == previous + 1` before the ratio ranges.
3. **Hint 3 (the first row).** There is no previous size for *n* = 8, so print `-` for the growth in the first row.
4. **Hint 4 (passing an algorithm).** `void report(const string& name, const function<void(int, Counter&)>& algorithm)` needs `#include <functional>`; you can pass the function by name.
5. **Hint 5 (the ratio ranges).** Use 0.95 to 1.05 for "stays the same", 1.9 to 2.1 for "doubles", 2.1 to 3.0 for "a bit more than doubles" and 3.8 to 4.2 for "quadruples".
6. **Hint 6 (an unused parameter warning).** In `constant_time(int n, Counter& c)` write `(void)n;` to tell the compiler you know.

### Success Criteria

- [ ] Each algorithm is a separate function with the same signature, and the harness knows nothing about how they work.
- [ ] The report prints *n*, the steps and a growth description, with the columns aligned.
- [ ] The five algorithms are classified correctly: O(1), O(log n), O(n), O(n log n) and O(n²).
- [ ] The summary for *n* = 1000 shows the five step counts and they are in increasing order.
- [ ] Every algorithm has a comment with its time and space complexity.
- [ ] The code compiles with `-Wall -Wextra` and no warnings, and the output matches the expected output.

### Extension Challenge

Add an exponential algorithm, `exponential(int n, Counter& c)`, that counts 2ⁿ steps (use recursion that calls itself twice), and run it only for *n* = 10 to 24 in steps of 2. What does `describe` need to recognise it? Then add a `time_it` function using `<chrono>` that measures real seconds for the quadratic algorithm at *n* = 5000, and compare the *shape* of the real times with the step counts.

## Lesson Recap

- An **algorithm** is a precise, finite procedure; a good one is correct, efficient and clear.
- Compare algorithms by **counting basic operations** as a function of the input size *n*, not by timing them.
- **Big O** keeps the dominant term and drops constants: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ).
- Loops give the clue: one loop is O(n), nested loops O(n²), a halving loop O(log n). Distinguish best, average and worst cases.
- **Space complexity** counts extra memory; recursion uses stack space; there is often a time-space trade-off.

## Homework / Extension Mission

Add two more algorithms to your harness and classify them: `sum_pairs`, which adds `i + j` for every pair with `i < j` (how many steps?), and `digits`, which counts the digits of *n* by dividing by 10 (is it O(log n)?). Then write a one-page "Big O cheat sheet" for yourself with: the six classes, an example of each, what happens when *n* doubles, and how many steps each needs for *n* = 1,000,000. Finally, answer in a paragraph: "Why does a better algorithm usually beat a faster computer?"

## Course Project Connection

This lesson starts the **Algorithm Explorer**, the course project: a program that visualises and compares algorithms. The `Counter` harness you built is its foundation: in Lesson 2 you will plug in linear and binary search, in Lesson 3 five sorting algorithms, and so on, up to the final comparison in Lesson 8. Keep the harness in its own file and keep its interface unchanged (`void algorithm(int n, Counter& c)` and later versions that take data), so every new lesson adds to it without breaking what is already there.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the one-million-names story and why counting beats timing. 15 minutes: Big O and reading complexity from loops (Example 1 live on the projector). 10 minutes: best and worst case (Example 3), space complexity. 25 minutes: the project, as a guided build.

**Live demonstrations.** Run Example 1 for *n* up to 5000 and let students see the nested count explode. Show real timing with `<chrono>` for the quadratic loop at doubling sizes. Use a deck of cards: find a card by checking each one, then by halving a sorted deck.

**Misconceptions.** "Big O is the running time." "O(n²) is always slower than O(n)" (only for large *n*). "Log n means n divided by something." Ask students to compute log₂ of 1000 and 1,000,000 by halving.

**Assessment of the project.** Check that the algorithms and the harness are separate, that `describe` handles the "adds 1" case before the ratios, and that every algorithm has an accurate complexity comment. Ask each student to predict the step count for *n* = 512 and verify it.

**Reference solution `harness.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra harness.cpp -o harness`):

```cpp
// Algorithm Explorer, Lesson 1: the counter harness.
#include <functional>
#include <iomanip>
#include <iostream>
#include <string>
using namespace std;

struct Counter {
    long long steps = 0;
};

// O(1) time, O(1) space: look at the first element.
void constant_time(int n, Counter& c)
{
    (void)n;
    c.steps++;
}

// O(log n) time, O(1) space: halve n until it reaches 1.
void logarithmic(int n, Counter& c)
{
    while (n > 1) {
        n /= 2;
        c.steps++;
    }
}

// O(n) time, O(1) space: visit every element once.
void linear(int n, Counter& c)
{
    for (int i = 0; i < n; i++) {
        c.steps++;
    }
}

// O(n log n) time, O(1) space: a linear loop that contains a halving loop.
void n_log_n(int n, Counter& c)
{
    for (int i = 0; i < n; i++) {
        int m = n;
        while (m > 1) {
            m /= 2;
            c.steps++;
        }
    }
}

// O(n^2) time, O(1) space: look at every pair.
void quadratic(int n, Counter& c)
{
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            c.steps++;
        }
    }
}

string describe(long long previous, long long current)
{
    if (previous == 0) {
        return "-";
    }
    double ratio = static_cast<double>(current) / static_cast<double>(previous);
    if (ratio >= 0.95 && ratio <= 1.05) {
        return "stays the same -> O(1)";
    }
    if (current == previous + 1) {
        return "adds 1 -> O(log n)";
    }
    if (ratio >= 1.9 && ratio <= 2.1) {
        return "doubles -> O(n)";
    }
    if (ratio > 2.1 && ratio < 3.0) {
        return "a bit more than doubles -> O(n log n)";
    }
    if (ratio >= 3.8 && ratio <= 4.2) {
        return "quadruples -> O(n^2)";
    }
    return "unclear";
}

void report(const string& name, const function<void(int, Counter&)>& algorithm)
{
    cout << name << '\n';
    cout << setw(6) << "n" << setw(10) << "steps" << "  growth when n doubles\n";
    long long previous = 0;
    for (int n = 8; n <= 256; n *= 2) {
        Counter c;
        algorithm(n, c);
        cout << setw(6) << n << setw(10) << c.steps << "  " << describe(previous, c.steps) << '\n';
        previous = c.steps;
    }
    cout << '\n';
}

int main()
{
    report("constant_time", constant_time);
    report("logarithmic", logarithmic);
    report("linear", linear);
    report("n_log_n", n_log_n);
    report("quadratic", quadratic);

    cout << "Steps for n = 1000\n";
    const int n = 1000;
    struct Entry {
        const char* name;
        function<void(int, Counter&)> run;
    };
    Entry entries[] = {{"constant_time", constant_time}, {"logarithmic", logarithmic}, {"linear", linear},
                       {"n_log_n", n_log_n}, {"quadratic", quadratic}};
    for (const Entry& e : entries) {
        Counter c;
        e.run(n, c);
        cout << setw(14) << left << e.name << right << setw(10) << c.steps << '\n';
    }
    return 0;
}
```

```output
constant_time
     n     steps  growth when n doubles
     8         1  -
    16         1  stays the same -> O(1)
    32         1  stays the same -> O(1)
    64         1  stays the same -> O(1)
   128         1  stays the same -> O(1)
   256         1  stays the same -> O(1)

logarithmic
     n     steps  growth when n doubles
     8         3  -
    16         4  adds 1 -> O(log n)
    32         5  adds 1 -> O(log n)
    64         6  adds 1 -> O(log n)
   128         7  adds 1 -> O(log n)
   256         8  adds 1 -> O(log n)

linear
     n     steps  growth when n doubles
     8         8  -
    16        16  doubles -> O(n)
    32        32  doubles -> O(n)
    64        64  doubles -> O(n)
   128       128  doubles -> O(n)
   256       256  doubles -> O(n)

n_log_n
     n     steps  growth when n doubles
     8        24  -
    16        64  a bit more than doubles -> O(n log n)
    32       160  a bit more than doubles -> O(n log n)
    64       384  a bit more than doubles -> O(n log n)
   128       896  a bit more than doubles -> O(n log n)
   256      2048  a bit more than doubles -> O(n log n)

quadratic
     n     steps  growth when n doubles
     8        64  -
    16       256  quadruples -> O(n^2)
    32      1024  quadruples -> O(n^2)
    64      4096  quadruples -> O(n^2)
   128     16384  quadruples -> O(n^2)
   256     65536  quadruples -> O(n^2)

Steps for n = 1000
constant_time          1
logarithmic            9
linear              1000
n_log_n             9000
quadratic        1000000
```

**Differentiation.** Support: provide the `Counter`, `constant_time`, `linear` and `describe`, and let students write the other algorithms and `report`. Stretch: add `exponential`, a `time_it` with `<chrono>` and a chart of the counts (for example a text bar chart).

**Discussion questions (not for the student quiz).** Why is it fair to ignore constants in Big O, and when does it stop being fair? If memory were free, would space complexity matter?
