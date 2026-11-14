# Lumexa Mission Log: Data Structures & Algorithmic Problem-Solving

**Course/Path:** Data Structures & Algorithmic Problem-Solving
**Lesson:** 08 of 08
**Title:** Divide and Conquer, Greedy Algorithms and Introduction to Dynamic Programming
**Duration:** 60 minutes
**Difficulty:** Advanced
**Technology:** C++ (g++)

---

## Mission Brief

A cashier must give 6 taka in change using coins of 1, 3 and 4 taka. The natural rule, "always hand over the biggest coin that fits", gives 4 + 1 + 1: three coins. But 3 + 3 does it with two. The rule was fast and simple, and it was wrong. Whether a clever shortcut is safe is one of the deepest questions in algorithm design, and it separates the **greedy** strategies that work from those that only look like they do.

So far each algorithm in this course came with its own trick. Now we step back and look at the **strategies** behind them: **divide and conquer** (merge sort, binary search), **greedy** choices (Dijkstra) and **dynamic programming** (the memoised Fibonacci of Lesson 5). Knowing the strategies means you can attack problems you have never seen. In this last lesson of the course you study each strategy, compare them on the same problems, and finish the **Algorithm Explorer** by connecting every algorithm of the course in a single menu program.

## Learning Objectives

1. Name the main design strategies (brute force, divide and conquer, greedy, dynamic programming) and what each is good for.
2. Apply divide and conquer to a new problem (fast exponentiation) and explain how it gives O(log n).
3. Explain when a greedy choice is safe and show a case in which it fails.
4. Explain overlapping subproblems and optimal substructure, and solve a problem with memoisation and with a bottom-up table.
5. Choose a strategy for a problem and justify the choice with counts.
6. Build the final Algorithm Explorer: a menu program that runs every algorithm family of the course and a strategy comparison.

## Prerequisites

- All earlier lessons of this course, especially Lesson 5 (recursion and memoisation) and Lessons 2, 3, 4, 6 and 7 for the menu program.
- Course 1: menu-driven programs with `switch`.

## Concept Explanation

### Design strategies

An algorithm is rarely invented from nothing: it is usually an instance of a **strategy**.

| Strategy | The idea | Examples |
|---|---|---|
| **Brute force** | try every possibility | linear search, trying all subsets |
| **Divide and conquer** | split into smaller copies of the problem, solve them, combine | binary search, merge sort, quick sort |
| **Greedy** | at each step take the choice that looks best right now, and never reconsider | Dijkstra, Huffman coding, activity selection |
| **Dynamic programming** | solve each smaller subproblem once, store the answer, and build up | memoised Fibonacci, shortest paths, knapsack |

### Divide and conquer

**Divide and conquer** has three steps: **divide** the problem into smaller subproblems of the same kind, **conquer** them (recursively, stopping at a trivial base case) and **combine** their answers. Merge sort divides the list in half and merges; binary search divides and discards one half. The cost is described by a **recurrence**: merge sort is T(n) = 2·T(n/2) + O(n) = O(n log n); binary search is T(n) = T(n/2) + O(1) = O(log n).

A classic new example is **fast exponentiation**. To compute xⁿ, a loop does n − 1 multiplications. But xⁿ = (xⁿᐟ²)² when *n* is even, and x · (x⁽ⁿ⁻¹⁾ᐟ²)² when *n* is odd. Each step halves *n*, so only about log₂ n steps are needed: **O(log n)**. This is how cryptography (Course 6) raises numbers to enormous powers.

### Greedy algorithms

A **greedy algorithm** builds a solution one step at a time, always taking the locally best choice and never undoing it. It is simple and fast, but it is only *correct* when two properties hold: the **greedy-choice property** (a locally best choice can always be part of an optimal solution) and **optimal substructure** (what remains after the choice is a smaller problem of the same kind). Greedy is correct for making change with the coins 1, 5, 10 and 25 (always take the biggest that fits), for Dijkstra's shortest paths with non-negative weights and for choosing the most non-overlapping meetings by earliest finish time. It is *wrong* for the coins 1, 3 and 4. When you cannot prove that a greedy choice is safe, test it against a slower method that is certain to be right.

### Dynamic programming

**Dynamic programming (DP)** applies to problems with two properties: **optimal substructure** (the best solution is built from best solutions of smaller subproblems) and **overlapping subproblems** (the same subproblems arise again and again, as in Fibonacci). Instead of re-solving, we store each answer once. There are two styles:

- **Top-down (memoisation)**: write the natural recursion and cache each result (as in Lesson 5).
- **Bottom-up (tabulation)**: fill a table from the smallest subproblem upwards, with loops. No recursion, no stack overflow.

For the **minimum number of coins** for an amount *a*, the best answer is 1 + the best answer for `a - coin`, for the best choice of coin. Filling `best[0..amount]` takes O(amount × number of coins) steps; the plain recursion without a cache takes exponential time. DP also solves the knapsack problem, the longest common subsequence (used by `diff`) and edit distance (spell checkers).

### Choosing a strategy

Ask in order: Can the problem be split into independent halves? (**Divide and conquer.**) Does a locally best choice provably stay optimal? (**Greedy.**) Do the subproblems overlap, and is the best answer built from best sub-answers? (**Dynamic programming.**) Otherwise, **brute force**, with pruning if possible. Always check your choice with a counter, as in Lesson 1.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Divide and conquer** | Split a problem into smaller copies, solve them, and combine the answers. |
| **Recurrence** | An equation that describes the cost of a recursive algorithm in terms of smaller inputs. |
| **Greedy algorithm** | An algorithm that always takes the locally best choice and never reconsiders it. |
| **Greedy-choice property** | The property that a locally best choice can be part of an optimal solution. |
| **Optimal substructure** | The property that an optimal solution contains optimal solutions of its subproblems. |
| **Overlapping subproblems** | Subproblems that occur many times in a recursion. |
| **Dynamic programming** | Solving each subproblem once and storing the answer. |
| **Memoisation / tabulation** | Dynamic programming top-down with a cache, or bottom-up with a table. |
| **Fast exponentiation** | Computing powers by repeated squaring in O(log n) multiplications. |
| **Heuristic** | A rule of thumb that usually, but not always, gives a good answer. |

## Worked Examples

### Example 1: Divide and conquer, fast exponentiation

```cpp
#include <iostream>
using namespace std;

const unsigned long long MOD = 1000000007ULL;
long long multiplications = 0;

unsigned long long power_naive(unsigned long long x, int n)
{
    unsigned long long result = 1;
    for (int i = 0; i < n; i++) {
        result = result * x % MOD;
        multiplications++;
    }
    return result;
}

unsigned long long power_fast(unsigned long long x, int n)
{
    if (n == 0) {
        return 1;
    }
    unsigned long long half = power_fast(x, n / 2);
    multiplications++;
    unsigned long long result = half * half % MOD;
    if (n % 2 == 1) {
        result = result * x % MOD;
        multiplications++;
    }
    return result;
}

int main()
{
    for (int n : {10, 30, 1000}) {
        multiplications = 0;
        unsigned long long a = power_naive(3, n);
        long long naive_count = multiplications;
        multiplications = 0;
        unsigned long long b = power_fast(3, n);
        cout << "3^" << n << " mod 1e9+7 = " << a << " (same: " << (a == b) << "), naive " << naive_count
             << " multiplications, fast " << multiplications << '\n';
    }
    return 0;
}
```

```output
3^10 mod 1e9+7 = 59049 (same: 1), naive 10 multiplications, fast 6
3^30 mod 1e9+7 = 130653412 (same: 1), naive 30 multiplications, fast 9
3^1000 mod 1e9+7 = 56888193 (same: 1), naive 1000 multiplications, fast 16
```

1. The naive loop does *n* multiplications. The fast version halves *n* at every call, so it needs about log₂ n squarings (plus one extra multiplication for each odd step).
2. For *n* = 1000 that is 1000 against fewer than twenty, and the answers are identical.
3. The `% MOD` keeps the numbers inside 64 bits. The same trick is used in cryptography to compute huge powers.
4. This is divide and conquer in its purest form: one smaller subproblem (n / 2), solved once, then combined by squaring.

### Example 2: Greedy works, then fails

```cpp
#include <iostream>
#include <vector>
using namespace std;

int greedy_coins(const vector<int>& coins, int amount)
{
    int count = 0;
    for (int i = static_cast<int>(coins.size()) - 1; i >= 0; i--) {
        while (amount >= coins[i]) {
            amount -= coins[i];
            count++;
        }
    }
    return amount == 0 ? count : -1;
}

int main()
{
    cout << "coins 1, 5, 10, 25 and amount 63: " << greedy_coins({1, 5, 10, 25}, 63) << " coins\n";
    cout << "coins 1, 3, 4 and amount 6: " << greedy_coins({1, 3, 4}, 6) << " coins (the best is 2: 3 + 3)\n";
    return 0;
}
```

```output
coins 1, 5, 10, 25 and amount 63: 6 coins
coins 1, 3, 4 and amount 6: 3 coins (the best is 2: 3 + 3)
```

1. The greedy rule takes the biggest coin that still fits, as many times as it fits, then moves to the next smaller coin.
2. With 1, 5, 10 and 25, the rule is correct: 63 = 25 + 25 + 10 + 1 + 1 + 1, six coins, which is the best possible.
3. With 1, 3 and 4, the rule takes 4 first, and is then forced to use 1 + 1. The locally best choice (the biggest coin) spoiled the whole solution: three coins instead of two.
4. A greedy algorithm needs a *proof* that its choice is safe. A counter-example, like 6 with coins 1, 3, 4, is enough to show that it is not.

### Example 3: Dynamic programming, the minimum coins

```cpp
#include <climits>
#include <iostream>
#include <vector>
using namespace std;

long long calls = 0;

int min_coins_naive(const vector<int>& coins, int amount)
{
    calls++;
    if (amount == 0) {
        return 0;
    }
    int best = INT_MAX;
    for (int c : coins) {
        if (c <= amount) {
            int sub = min_coins_naive(coins, amount - c);
            if (sub != INT_MAX && sub + 1 < best) {
                best = sub + 1;
            }
        }
    }
    return best;
}

int min_coins_dp(const vector<int>& coins, int amount, long long& steps)
{
    vector<int> best(amount + 1, INT_MAX);
    best[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            steps++;
            if (c <= a && best[a - c] != INT_MAX && best[a - c] + 1 < best[a]) {
                best[a] = best[a - c] + 1;
            }
        }
    }
    return best[amount];
}

int main()
{
    vector<int> coins = {1, 3, 4};
    for (int amount : {6, 12, 20}) {
        calls = 0;
        int a = min_coins_naive(coins, amount);
        long long steps = 0;
        int b = min_coins_dp(coins, amount, steps);
        cout << "amount " << amount << ": " << a << " coins (dp agrees: " << (a == b) << "), naive calls " << calls
             << ", dp steps " << steps << '\n';
    }
    return 0;
}
```

```output
amount 6: 2 coins (dp agrees: 1), naive calls 24, dp steps 18
amount 12: 3 coins (dp agrees: 1), naive calls 441, dp steps 36
amount 20: 5 coins (dp agrees: 1), naive calls 20736, dp steps 60
```

1. `best[a]` holds the fewest coins for amount `a`. It is built from smaller answers: `best[a - c] + 1` for each coin `c`. This is optimal substructure.
2. The table is filled once from 1 up to the amount, so the work is (amount × number of coins).
3. The naive recursion solves the same small amounts again and again (overlapping subproblems), and its calls explode as the amount grows, exactly like naive Fibonacci in Lesson 5.
4. Both methods agree: 2 coins for 6 (3 + 3), 3 coins for 12 and 5 coins for 20. DP finds the true optimum that the greedy rule missed.

## Common Mistakes and Misconceptions

- **Assuming greedy is always right.** It is only right when it can be proved. Test greedy against a brute-force or DP solution on small inputs.
- **Using DP when there are no overlapping subproblems.** If the subproblems never repeat, memoisation only adds memory.
- **Dividing into subproblems that overlap, and calling it divide and conquer.** Pure divide and conquer splits into *independent* parts. Overlapping parts need DP.
- **Forgetting the base cases of the table.** `best[0] = 0` must be set, and unreachable states must be marked (here `INT_MAX`) and skipped.
- **Overflow when adding to a sentinel.** `INT_MAX + 1` overflows. Check for the sentinel before adding.
- **Confusing memoisation with caching of anything.** Memoisation stores the results of a *pure* function for repeated arguments.
- **Not choosing a strategy by evidence.** Count operations on realistic inputs before you decide that something is "fast enough".
- **Thinking one strategy fits all.** Sorting uses divide and conquer, shortest paths use greedy choices, and optimisation problems often need DP.

## Guided Hands-On Activity

**Compare the strategies.** Work with your teacher.

1. Type Example 1. Add *n* = 1,000,000 for the fast version only and describe how many multiplications it needs. Why must you not try it with the naive version?
2. Type Example 2. Find a different set of coins (not 1, 3, 4) for which greedy fails, and an amount that shows it.
3. Draw the table `best[0..12]` for the coins 1, 3, 4 by hand, filling it from left to right, and check it against the program.
4. Type Example 3. Raise the amount to 30 for the naive version. What happens to the call count, and what does that tell you?
5. Change the coins in Example 3 to {1, 5, 10, 25}. Do the greedy and DP answers now agree for 63?
6. Write the **activity selection** greedy: given meetings with start and end times, choose the largest number that do not overlap, by always taking the meeting that ends first. Test it with five meetings.

## Lesson Project: Algorithm Explorer: The Final Comparison

### Objective

Finish the **Algorithm Explorer**: one menu-driven program that connects every algorithm family of the course (searching, sorting, stacks and queues, trees and heaps, hashing, graphs) and adds the **strategy comparison** of this lesson, where fast exponentiation, greedy change and DP are measured against their naive versions.

### Requirements

- A menu: `1` Searching, `2` Sorting, `3` Stacks and queues, `4` Trees and heaps, `5` Hashing, `6` Graphs, `7` Strategies, `0` Exit; an invalid choice prints `Please choose a number from 0 to 7.`
- Each of options 1 to 6 runs a **compact experiment** with real counters: (1) linear versus binary search on 1,024 sorted numbers (missing target); (2) insertion, merge and quick sort on 64 pseudo-random numbers; (3) a bracket check with `std::stack` of two strings and a three-job `std::queue`; (4) the height of a BST built from 31 random keys and from the same keys sorted, and the three largest keys from a `priority_queue`; (5) the collisions of djb2 with 16 buckets for 12 words; (6) BFS roads and Dijkstra minutes from the gate to the dorm in a five-place graph.
- Option 7 runs the three strategy comparisons of this lesson: fast versus naive power (3³⁰), greedy versus dynamic programming for the coins 1, 3, 4 and amount 6 and for 1, 5, 10, 25 and amount 63, and the naive recursion versus DP for the minimum number of coins with amount 20.
- All the numbers come from counters in the code, never from constants typed in.

### Instructions

1. Write the menu loop and the six small experiments one at a time. Keep each function short (about 20 lines) and test it alone.
2. Reuse your own code from Lessons 2 to 7 where you can; use the standard `stack`, `queue`, `priority_queue` and `unordered_map` where the lessons showed how they work.
3. Write option 7 from the three examples of this lesson.
4. Run the program with the scripted input (the choices 1 to 7, an invalid 9, and 0) and compare with the expected output.
5. Check that every count is produced by the code (change an input size and see the counts change).
6. Write a README comment at the top: the options, how to compile, and one sentence about which strategy each experiment shows.
7. Add a comment above each experiment with the Big O of the algorithms it compares.

### Expected Output

```text
Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  1024 sorted numbers, missing target: linear 1024 comparisons, binary 11

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  64 random numbers: insertion 1188, merge 301, quick 416 comparisons; all sorted: yes

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  {[(a+b)*c]-d} balanced: 1, {[(])} balanced: 0
  print queue order: report photo essay

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  BST height for 31 keys: random order 7, sorted order 30
  three largest keys from the heap: 95236 95168 92701

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  12 words in 16 buckets: 3 collisions, longest chain 3

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  Gate to Dorm: 1 road by BFS, but 9 minutes by Dijkstra

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  divide and conquer: 3^30 needs 30 multiplications naively and 9 by squaring (same answer: 1)
  greedy against DP, coins 1 3 4, amount 6: greedy 3 coins, DP 2 coins
  greedy against DP, coins 1 5 10 25, amount 63: greedy 6 coins, DP 6 coins
  minimum coins for 20 (coins 1 3 4): 5 (same: 1), naive recursion 20736 calls, DP 60 steps

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
Please choose a number from 0 to 7.

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
Goodbye!
```

### Hints

1. **Hint 1 (the menu).** A `do`/`while` or `while (true)` loop with `cin >> choice` and a `switch`, as in the SRMS of Course 1.
2. **Hint 2 (the random numbers).** `x = (x * 1103515245u + 12345u) & 0x7fffffffu;` then `x % 1000`, from a fixed starting value, so the output never changes.
3. **Hint 3 (compact sorts).** Pass a `long long& comparisons` to each sort instead of a structure, to keep the code short.
4. **Hint 4 (the BST).** The insert from Lesson 5 and its `height`; call the sorted case with `sort` on a copy of the keys.
5. **Hint 5 (the hash).** Collisions = items − number of non-empty buckets, with djb2 in `uint32_t`.
6. **Hint 6 (the tiny graph).** An adjacency matrix of weights (0 = no road) keeps the compact BFS and Dijkstra short.

### Success Criteria

- [ ] All seven options work, and an invalid choice gets the right message.
- [ ] The strategy comparison shows greedy giving 3 coins for 6 with {1, 3, 4} while DP gives 2.
- [ ] Fast power needs far fewer multiplications than the naive power, and both give the same value.
- [ ] Every number in the output comes from a counter in the code.
- [ ] Each experiment is a separate function with a Big O comment.
- [ ] The code compiles with `-Wall -Wextra` with no warnings, and the output matches the expected output.

### Extension Challenge

Add option `8`: **Race**. The user types a problem size, and the program times the naive and the better algorithm of the three comparisons with `<chrono>`, printing real milliseconds next to the operation counts. Then add the **0/1 knapsack** problem (given weights and values and a capacity, find the best total value) solved by DP, and compare it with the greedy "best value per weight first" rule on an example where greedy fails.

## Lesson Recap

- Most algorithms are instances of a strategy: **brute force**, **divide and conquer**, **greedy** or **dynamic programming**.
- **Divide and conquer** splits into independent subproblems and combines them (merge sort, binary search, fast exponentiation: O(log n) multiplications).
- A **greedy** choice is fast but only correct when it can be proved safe; coins 1, 3, 4 show it failing.
- **Dynamic programming** stores answers to overlapping subproblems, top-down (memoisation) or bottom-up (a table), turning exponential recursion into polynomial time.
- Choose a strategy by the structure of the problem, and verify the choice with counters.

## Homework / Extension Mission

Solve **the longest common subsequence** of two strings with a DP table (for example, "AGGTAB" and "GXTXAYB" share "GTAB", of length 4), print the table, and give the Big O of your solution. Then write a one-page summary of the whole course for yourself: for each of the eight lessons, write the problem it solves, the key idea, the Big O, and one sentence on where you have seen it in a real program. Bring it to your first Course 4 lesson.

## Course Project Connection

This lesson completes the **Algorithm Explorer**, the course project: the final menu program connects the search race, the sorting lab, the data-structure toolkit, the trees and heaps, the hash table lab and the graph explorer, and adds the strategy comparison. Keep it in your portfolio. The same ideas return in Course 4 (recurrences and graphs in discrete mathematics), in Course 6 (queues in scheduling, graphs in networks, fast exponentiation in cryptography) and in Course 8 (algorithms in Python).

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the coin-change story and the four strategies. 10 minutes: divide and conquer and fast exponentiation (Example 1). 10 minutes: greedy and its failure (Example 2). 10 minutes: DP and the table (Example 3). 20 minutes: the capstone menu; the build continues at home, with the earlier labs as the source.

**Live demonstrations.** Fill the DP table on the board with the class calling out values. Run the naive recursion for amount 30 and watch it stall. Ask the class to invent coin systems where greedy fails.

**Misconceptions.** "Greedy always finds the best answer." "Dynamic programming is just recursion." "Divide and conquer and dynamic programming are the same" (independent versus overlapping subproblems).

**Assessment of the project.** Check that counts are computed, not typed; the menu and invalid-choice handling; the correct greedy failure; and the Big O comments. Ask each student to explain which strategy each experiment shows, and why.

**Reference solution `explorer.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra explorer.cpp -o explorer`; the input below is typed into the menu):

```cpp
// Algorithm Explorer: the final comparison (a menu that connects the algorithms of the course).
// Compile: g++ -std=c++17 -Wall -Wextra explorer.cpp -o explorer
// Options: 1 search | 2 sort | 3 stack and queue | 4 trees and heaps | 5 hashing | 6 graphs | 7 strategies | 0 exit
#include <algorithm>
#include <climits>
#include <cstdint>
#include <functional>
#include <iomanip>
#include <iostream>
#include <queue>
#include <stack>
#include <string>
#include <utility>
#include <vector>
using namespace std;

vector<int> random_numbers(int n, unsigned int seed)
{
    vector<int> v(n);
    unsigned int x = seed;
    for (int& value : v) {
        x = (x * 1103515245u + 12345u) & 0x7fffffffu;
        value = static_cast<int>(x % 100000u);
    }
    return v;
}

// 1. Searching: linear O(n) against binary O(log n), worst case (missing target).
void run_searching()
{
    vector<int> v(1024);
    for (int i = 0; i < 1024; i++) {
        v[i] = 2 * i;
    }
    int target = 2047;
    long long linear = 0;
    for (int x : v) {
        linear++;
        if (x == target) {
            break;
        }
    }
    long long binary = 0;
    int low = 0;
    int high = 1023;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        binary++;
        if (v[mid] == target) {
            break;
        }
        if (v[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    cout << "  1024 sorted numbers, missing target: linear " << linear << " comparisons, binary " << binary << '\n';
}

// 2. Sorting: insertion O(n^2), merge O(n log n), quick O(n log n) on average.
void insertion_sort(vector<int>& v, long long& c)
{
    for (size_t i = 1; i < v.size(); i++) {
        int key = v[i];
        int j = static_cast<int>(i) - 1;
        while (j >= 0) {
            c++;
            if (v[j] <= key) {
                break;
            }
            v[j + 1] = v[j];
            j--;
        }
        v[j + 1] = key;
    }
}

void merge_sort(vector<int>& v, vector<int>& tmp, int lo, int hi, long long& c)
{
    if (hi <= lo) {
        return;
    }
    int mid = lo + (hi - lo) / 2;
    merge_sort(v, tmp, lo, mid, c);
    merge_sort(v, tmp, mid + 1, hi, c);
    int i = lo;
    int j = mid + 1;
    int k = lo;
    while (i <= mid && j <= hi) {
        c++;
        tmp[k++] = (v[i] <= v[j]) ? v[i++] : v[j++];
    }
    while (i <= mid) {
        tmp[k++] = v[i++];
    }
    while (j <= hi) {
        tmp[k++] = v[j++];
    }
    copy(tmp.begin() + lo, tmp.begin() + hi + 1, v.begin() + lo);
}

void quick_sort(vector<int>& v, int lo, int hi, long long& c)
{
    if (lo >= hi) {
        return;
    }
    int pivot = v[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        c++;
        if (v[j] < pivot) {
            swap(v[i++], v[j]);
        }
    }
    swap(v[i], v[hi]);
    quick_sort(v, lo, i - 1, c);
    quick_sort(v, i + 1, hi, c);
}

void run_sorting()
{
    const vector<int> data = random_numbers(64, 7u);
    vector<int> a = data;
    vector<int> b = data;
    vector<int> d = data;
    vector<int> tmp(64);
    long long ci = 0;
    long long cm = 0;
    long long cq = 0;
    insertion_sort(a, ci);
    merge_sort(b, tmp, 0, 63, cm);
    quick_sort(d, 0, 63, cq);
    cout << "  64 random numbers: insertion " << ci << ", merge " << cm << ", quick " << cq << " comparisons; all sorted: "
         << (is_sorted(a.begin(), a.end()) && is_sorted(b.begin(), b.end()) && is_sorted(d.begin(), d.end()) ? "yes" : "no") << '\n';
}

// 3. Stacks and queues: a stack checks brackets, a queue keeps the order of jobs. All O(1) per operation.
bool balanced(const string& text)
{
    const string openers = "([{";
    const string closers = ")]}";
    stack<char> st;
    for (char c : text) {
        if (openers.find(c) != string::npos) {
            st.push(c);
        } else if (closers.find(c) != string::npos) {
            if (st.empty() || openers.find(st.top()) != closers.find(c)) {
                return false;
            }
            st.pop();
        }
    }
    return st.empty();
}

void run_structures()
{
    cout << "  {[(a+b)*c]-d} balanced: " << balanced("{[(a+b)*c]-d}") << ", {[(])} balanced: " << balanced("{[(])}") << '\n';
    queue<string> jobs;
    for (const char* name : {"report", "photo", "essay"}) {
        jobs.push(name);
    }
    cout << "  print queue order:";
    while (!jobs.empty()) {
        cout << ' ' << jobs.front();
        jobs.pop();
    }
    cout << '\n';
}

// 4. Trees and heaps: a BST costs O(height); a heap gives the largest keys in O(log n) each.
struct Node {
    int key;
    Node* left;
    Node* right;
};

Node* bst_insert(Node* n, int key)
{
    if (n == nullptr) {
        return new Node{key, nullptr, nullptr};
    }
    if (key < n->key) {
        n->left = bst_insert(n->left, key);
    } else if (key > n->key) {
        n->right = bst_insert(n->right, key);
    }
    return n;
}

int bst_height(const Node* n) { return n == nullptr ? -1 : 1 + max(bst_height(n->left), bst_height(n->right)); }

void bst_free(Node* n)
{
    if (n != nullptr) {
        bst_free(n->left);
        bst_free(n->right);
        delete n;
    }
}

void run_trees()
{
    vector<int> keys = random_numbers(31, 11u);
    vector<int> ascending = keys;
    sort(ascending.begin(), ascending.end());
    Node* random_tree = nullptr;
    Node* sorted_tree = nullptr;
    for (int k : keys) {
        random_tree = bst_insert(random_tree, k);
    }
    for (int k : ascending) {
        sorted_tree = bst_insert(sorted_tree, k);
    }
    cout << "  BST height for 31 keys: random order " << bst_height(random_tree) << ", sorted order " << bst_height(sorted_tree) << '\n';
    bst_free(random_tree);
    bst_free(sorted_tree);
    priority_queue<int> heap(keys.begin(), keys.end());
    cout << "  three largest keys from the heap:";
    for (int i = 0; i < 3; i++) {
        cout << ' ' << heap.top();
        heap.pop();
    }
    cout << '\n';
}

// 5. Hashing: djb2 into a chaining table; collisions = items - non-empty buckets.
uint32_t djb2(const string& s)
{
    uint32_t h = 5381;
    for (unsigned char c : s) {
        h = h * 33 + c;
    }
    return h;
}

void run_hashing()
{
    const vector<string> words = {"sort", "search", "stack", "string", "class", "compile", "tree", "table", "heap", "hash", "graph", "queue"};
    vector<int> bucket(16, 0);
    for (const string& w : words) {
        bucket[djb2(w) % 16]++;
    }
    int used = static_cast<int>(count_if(bucket.begin(), bucket.end(), [](int n) { return n > 0; }));
    cout << "  12 words in 16 buckets: " << words.size() - used << " collisions, longest chain " << *max_element(bucket.begin(), bucket.end()) << '\n';
}

// 6. Graphs: BFS counts roads, Dijkstra counts minutes. O(V + E) and O((V + E) log V).
void run_graphs()
{
    const int n = 5;
    const char* names[n] = {"Gate", "Library", "Canteen", "Field", "Dorm"};
    int w[n][n] = {};
    auto road = [&](int a, int b, int m) { w[a][b] = w[b][a] = m; };
    road(0, 1, 4);
    road(0, 2, 2);
    road(0, 4, 15);
    road(2, 3, 3);
    road(3, 4, 4);
    vector<int> hops(n, -1);
    queue<int> q;
    hops[0] = 0;
    q.push(0);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (int u = 0; u < n; u++) {
            if (w[v][u] > 0 && hops[u] == -1) {
                hops[u] = hops[v] + 1;
                q.push(u);
            }
        }
    }
    vector<int> minutes(n, INT_MAX);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    minutes[0] = 0;
    pq.push({0, 0});
    while (!pq.empty()) {
        pair<int, int> top = pq.top();
        pq.pop();
        if (top.first > minutes[top.second]) {
            continue;
        }
        for (int u = 0; u < n; u++) {
            if (w[top.second][u] > 0 && top.first + w[top.second][u] < minutes[u]) {
                minutes[u] = top.first + w[top.second][u];
                pq.push({minutes[u], u});
            }
        }
    }
    cout << "  Gate to " << names[4] << ": " << hops[4] << " road by BFS, but " << minutes[4] << " minutes by Dijkstra\n";
}

// 7. Strategies.
const unsigned long long MOD = 1000000007ULL;

unsigned long long power_naive(unsigned long long x, int n, long long& count)
{
    unsigned long long r = 1;
    for (int i = 0; i < n; i++) {
        r = r * x % MOD;
        count++;
    }
    return r;
}

unsigned long long power_fast(unsigned long long x, int n, long long& count)
{
    if (n == 0) {
        return 1;
    }
    unsigned long long half = power_fast(x, n / 2, count);
    count++;
    unsigned long long r = half * half % MOD;
    if (n % 2 == 1) {
        r = r * x % MOD;
        count++;
    }
    return r;
}

int greedy_coins(const vector<int>& coins, int amount)
{
    int count = 0;
    for (int i = static_cast<int>(coins.size()) - 1; i >= 0; i--) {
        while (amount >= coins[i]) {
            amount -= coins[i];
            count++;
        }
    }
    return count;
}

int coins_naive(const vector<int>& coins, int amount, long long& calls)
{
    calls++;
    if (amount == 0) {
        return 0;
    }
    int best = INT_MAX;
    for (int c : coins) {
        if (c <= amount) {
            int sub = coins_naive(coins, amount - c, calls);
            if (sub != INT_MAX && sub + 1 < best) {
                best = sub + 1;
            }
        }
    }
    return best;
}

int coins_dp(const vector<int>& coins, int amount, long long& steps)
{
    vector<int> best(amount + 1, INT_MAX);
    best[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            steps++;
            if (c <= a && best[a - c] != INT_MAX && best[a - c] + 1 < best[a]) {
                best[a] = best[a - c] + 1;
            }
        }
    }
    return best[amount];
}

void run_strategies()
{
    long long naive = 0;
    long long fast = 0;
    unsigned long long a = power_naive(3, 30, naive);
    unsigned long long b = power_fast(3, 30, fast);
    cout << "  divide and conquer: 3^30 needs " << naive << " multiplications naively and " << fast << " by squaring (same answer: " << (a == b) << ")\n";
    long long steps = 0;
    cout << "  greedy against DP, coins 1 3 4, amount 6: greedy " << greedy_coins({1, 3, 4}, 6) << " coins, DP " << coins_dp({1, 3, 4}, 6, steps) << " coins\n";
    cout << "  greedy against DP, coins 1 5 10 25, amount 63: greedy " << greedy_coins({1, 5, 10, 25}, 63) << " coins, DP "
         << coins_dp({1, 5, 10, 25}, 63, steps) << " coins\n";
    long long calls = 0;
    steps = 0;
    int x = coins_naive({1, 3, 4}, 20, calls);
    int y = coins_dp({1, 3, 4}, 20, steps);
    cout << "  minimum coins for 20 (coins 1 3 4): " << x << " (same: " << (x == y) << "), naive recursion " << calls << " calls, DP " << steps << " steps\n";
}

int main()
{
    int choice = -1;
    while (true) {
        cout << "\nAlgorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit\nChoice:\n";
        if (!(cin >> choice) || choice == 0) {
            break;
        }
        switch (choice) {
        case 1:
            run_searching();
            break;
        case 2:
            run_sorting();
            break;
        case 3:
            run_structures();
            break;
        case 4:
            run_trees();
            break;
        case 5:
            run_hashing();
            break;
        case 6:
            run_graphs();
            break;
        case 7:
            run_strategies();
            break;
        default:
            cout << "Please choose a number from 0 to 7.\n";
        }
    }
    cout << "Goodbye!\n";
    return 0;
}
```

```input
1
2
3
4
5
6
7
9
0
```

```output
Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  1024 sorted numbers, missing target: linear 1024 comparisons, binary 11

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  64 random numbers: insertion 1188, merge 301, quick 416 comparisons; all sorted: yes

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  {[(a+b)*c]-d} balanced: 1, {[(])} balanced: 0
  print queue order: report photo essay

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  BST height for 31 keys: random order 7, sorted order 30
  three largest keys from the heap: 95236 95168 92701

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  12 words in 16 buckets: 3 collisions, longest chain 3

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  Gate to Dorm: 1 road by BFS, but 9 minutes by Dijkstra

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
  divide and conquer: 3^30 needs 30 multiplications naively and 9 by squaring (same answer: 1)
  greedy against DP, coins 1 3 4, amount 6: greedy 3 coins, DP 2 coins
  greedy against DP, coins 1 5 10 25, amount 63: greedy 6 coins, DP 6 coins
  minimum coins for 20 (coins 1 3 4): 5 (same: 1), naive recursion 20736 calls, DP 60 steps

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
Please choose a number from 0 to 7.

Algorithm Explorer: 1 Search | 2 Sort | 3 Stack+Queue | 4 Trees | 5 Hash | 6 Graphs | 7 Strategies | 0 Exit
Choice:
Goodbye!
```

**Differentiation.** Support: provide the menu, option 1 and option 7, and let students add the others from their own earlier programs. Stretch: add the timing race, knapsack, and the longest common subsequence.

**Discussion questions (not for the student quiz).** Why is a greedy algorithm often the first thing to try even when it may be wrong? What would you need to prove to be sure that greedy works for a coin system?
