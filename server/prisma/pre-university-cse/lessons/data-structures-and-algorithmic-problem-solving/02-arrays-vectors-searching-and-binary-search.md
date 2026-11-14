# Lumexa Mission Log: Data Structures & Algorithmic Problem-Solving

**Course/Path:** Data Structures & Algorithmic Problem-Solving
**Lesson:** 02 of 08
**Title:** Arrays, Vectors, Searching and Binary Search
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** C++ (g++)

---

## Mission Brief

Open any phone contact list. You type three letters and the person you want appears instantly, even if you have thousands of contacts. The phone does not look at every contact one by one: it uses the fact that the list is **sorted** and jumps straight to the middle, throws half of the list away, and repeats. That idea, **binary search**, finds one name among a million in about twenty steps.

Searching is the most common thing computers do, and it is the perfect place to *see* Big O in action. In this lesson you first look at the structure that holds the data, the **array** and its flexible cousin the **vector**; then you write **linear search** and **binary search**, count their comparisons with the harness idea from Lesson 1, and stage a **race** between them for the Algorithm Explorer.

## Learning Objectives

1. Explain how arrays and vectors store data in contiguous memory, and state the cost of their main operations.
2. Write linear search and explain its best, worst and average cases.
3. Write iterative binary search with `low`, `mid` and `high`, and explain why it needs sorted data and runs in O(log n).
4. Count comparisons, trace a search step by step and verify the results by hand.
5. Use `binary_search`, `lower_bound` and `upper_bound` from the C++ standard library.
6. Build the "Search Race" part of the Algorithm Explorer and compare the two searches on growing inputs.

## Prerequisites

- Lesson 1: Big O, counting operations and the worst, average and best cases.
- Course 1: arrays and loops. Course 2: `vector`.

## Concept Explanation

### Arrays and vectors

An **array** stores its elements side by side in **contiguous memory**. Because every element has the same size, the computer can find element `i` by arithmetic alone: *address of element i = start address + i × element size*. That makes reading or writing `a[i]` a **constant-time, O(1)** operation, no matter how large the array is. This is called **random access**.

A C++ `vector` is a **dynamic array**: it keeps the same contiguous layout but grows when needed. Its costs follow from that layout:

| Operation | Cost | Why |
|---|---|---|
| Read or write `v[i]` | O(1) | arithmetic on the start address |
| `push_back` (add at the end) | O(1) on average | there is usually spare room; occasionally the vector copies itself into a larger block |
| Insert or erase in the middle | O(n) | every later element must be shifted along |
| Search for a value in an unsorted vector | O(n) | there is no shortcut: look at each element |

Contiguous storage is also very fast in practice, because the processor can load neighbouring elements together (it is "cache-friendly").

### Linear search

**Linear search** (or sequential search) checks the elements one at a time, from the start, until it finds the target or reaches the end:

```cpp
int linear_search(const vector<int>& v, int target)
{
    for (size_t i = 0; i < v.size(); i++) {
        if (v[i] == target) {
            return static_cast<int>(i);      // found: return its index
        }
    }
    return -1;                               // not found
}
```

It works on *any* data, sorted or not. Its best case is O(1) (the target is first), and its worst and average cases are O(n): a million items may need a million comparisons.

### Binary search

If the data is **sorted**, you can do much better. **Binary search** keeps a range of positions that could still contain the target, between `low` and `high`. It looks at the **middle** element `mid`: if it is the target, done; if the target is larger, everything at or before `mid` can be discarded (set `low = mid + 1`); if smaller, discard everything at or after it (`high = mid - 1`). Each step throws away half of the remaining range.

```cpp
int binary_search_index(const vector<int>& v, int target)
{
    int low = 0;
    int high = static_cast<int>(v.size()) - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;    // safe: cannot overflow
        if (v[mid] == target) {
            return mid;
        }
        if (v[mid] < target) {
            low = mid + 1;                   // the target is to the right
        } else {
            high = mid - 1;                  // the target is to the left
        }
    }
    return -1;                               // the range is empty: not found
}
```

The range halves each time, so a list of *n* items needs at most about **log₂ n + 1** looks: **O(log n)**. The write `low + (high - low) / 2` is used instead of `(low + high) / 2` because the sum `low + high` could overflow an `int` for very large arrays. Binary search is simple to describe and easy to get wrong: the loop condition `low <= high` and the updates `mid + 1` and `mid - 1` must be exactly right, or the loop never ends or skips the target.

### Comparing them

| n | Linear search (worst) | Binary search (worst) |
|---|---|---|
| 10 | 10 | 4 |
| 1,000 | 1,000 | 10 |
| 1,000,000 | 1,000,000 | 20 |
| 1,000,000,000 | 1,000,000,000 | 30 |

There is a catch: binary search needs sorted data, and sorting costs O(n log n) (Lesson 3). If you search a list only once, linear search may be cheaper overall. If you search the same list many times, sort once and use binary search every time.

### Searching with the standard library

The `<algorithm>` header provides `binary_search` (is the value there?), `lower_bound` (an iterator to the first element that is not less than the value) and `upper_bound` (the first element greater than the value). They require a sorted range. With duplicates, `lower_bound` and `upper_bound` together give the **range of equal elements**: `upper_bound - lower_bound` is how many times the value occurs.

### Testing a search

Searches are famous for off-by-one errors, so test the boundaries: an **empty** vector, **one** element (present and missing), the **first** and the **last** element, a **middle** element, a value **smaller than all** and **larger than all**, and **duplicates**. A search that passes all of these is probably right.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Array** | A block of equally sized elements stored side by side in memory. |
| **Random access** | Reading any element by its index in constant time. |
| **Vector** | C++'s dynamic array: contiguous, and able to grow. |
| **Linear search** | Checking elements one by one until the target is found. |
| **Binary search** | Repeatedly halving the range of a sorted list to find a target. |
| **Precondition** | A condition that must hold for an algorithm to work, such as "the list is sorted". |
| **Comparison** | One test of a list element against the target, the unit we count. |
| **Loop invariant** | A fact that is true before and after every pass of a loop. |
| **`lower_bound` / `upper_bound`** | Standard functions that find the edges of a run of equal values in a sorted range. |
| **Off-by-one error** | A bug caused by a boundary that is one too many or too few. |

## Worked Examples

### Example 1: Linear search with a counter

```cpp
#include <iostream>
#include <vector>
using namespace std;

struct SearchResult {
    int index;
    long long comparisons;
};

SearchResult linear_search(const vector<int>& v, int target)
{
    SearchResult r{-1, 0};
    for (size_t i = 0; i < v.size(); i++) {
        r.comparisons++;
        if (v[i] == target) {
            r.index = static_cast<int>(i);
            return r;
        }
    }
    return r;
}

int main()
{
    vector<int> v = {40, 7, 19, 33, 5, 28, 12, 61};
    for (int target : {40, 33, 61, 99}) {
        SearchResult r = linear_search(v, target);
        cout << "target " << target << ": index " << r.index << ", comparisons " << r.comparisons << '\n';
    }
    return 0;
}
```

```output
target 40: index 0, comparisons 1
target 33: index 3, comparisons 4
target 61: index 7, comparisons 8
target 99: index -1, comparisons 8
```

1. `SearchResult` returns two facts at once: where the target was found (or -1) and how many comparisons it took.
2. The list is not sorted, and linear search does not care.
3. The first value needs 1 comparison, the value 33 needs 4, the last value needs all 8, and the missing value 99 also needs all 8 and returns index -1.
4. The count equals the position plus one when the target is present, and *n* when it is absent: O(n).

### Example 2: Binary search with a trace

```cpp
#include <iostream>
#include <vector>
using namespace std;

int binary_search_trace(const vector<int>& v, int target)
{
    int low = 0;
    int high = static_cast<int>(v.size()) - 1;
    int steps = 0;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        steps++;
        cout << "  step " << steps << ": low=" << low << " high=" << high << " mid=" << mid << " value=" << v[mid] << '\n';
        if (v[mid] == target) {
            cout << "  found at index " << mid << '\n';
            return mid;
        }
        if (v[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    cout << "  not found\n";
    return -1;
}

int main()
{
    vector<int> v = {3, 8, 12, 15, 21, 26, 30, 34, 41, 47, 52, 58, 63, 70, 77};
    cout << "search 47:\n";
    binary_search_trace(v, 47);
    cout << "search 10:\n";
    binary_search_trace(v, 10);
    return 0;
}
```

```output
search 47:
  step 1: low=0 high=14 mid=7 value=34
  step 2: low=8 high=14 mid=11 value=58
  step 3: low=8 high=10 mid=9 value=47
  found at index 9
search 10:
  step 1: low=0 high=14 mid=7 value=34
  step 2: low=0 high=6 mid=3 value=15
  step 3: low=0 high=2 mid=1 value=8
  step 4: low=2 high=2 mid=2 value=12
  not found
```

1. The sorted list has 15 values. For target 47 the first middle is index 7 (value 34). Since 34 is smaller than 47, `low` moves to 8.
2. The range 8 to 14 has middle index 11 (value 58), which is too big, so `high` moves to 10. The range 8 to 10 has middle 9 (value 47): found after only 3 looks, not 10.
3. The search for 10, which is not in the list, keeps halving until `low` passes `high`, which means the range is empty, and reports "not found" after 4 steps.
4. Each trace line shows the shrinking range. Practise producing these by hand: it is the best way to understand binary search.

### Example 3: The standard library's searches

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main()
{
    vector<int> v = {2, 4, 4, 4, 9, 15};
    cout << "contains 4? " << binary_search(v.begin(), v.end(), 4) << '\n';
    cout << "contains 5? " << binary_search(v.begin(), v.end(), 5) << '\n';

    auto first = lower_bound(v.begin(), v.end(), 4);
    auto after = upper_bound(v.begin(), v.end(), 4);
    cout << "first 4 at index " << (first - v.begin()) << '\n';
    cout << "after the last 4 at index " << (after - v.begin()) << '\n';
    cout << "number of 4s: " << (after - first) << '\n';
    return 0;
}
```

```output
contains 4? 1
contains 5? 0
first 4 at index 1
after the last 4 at index 4
number of 4s: 3
```

1. `binary_search` only answers yes or no (printed as 1 or 0), and needs a sorted range.
2. `lower_bound` returns an iterator to the first element that is *not less than* 4, which is index 1.
3. `upper_bound` returns an iterator to the first element *greater than* 4, which is index 4.
4. The distance between them is the number of 4s: 3. Subtracting `v.begin()` turns an iterator into an index.

## Common Mistakes and Misconceptions

- **Using binary search on unsorted data.** It silently gives wrong answers. Always check the precondition, or sort first.
- **`low < high` instead of `low <= high`.** The loop then stops one step early and misses a list with one element left.
- **`low = mid` or `high = mid` instead of `mid + 1` / `mid - 1`.** The range may stop shrinking, and the loop never ends.
- **Computing `(low + high) / 2` for huge arrays.** The sum can overflow. Use `low + (high - low) / 2`.
- **Thinking binary search is always better.** For a list searched once, or a very short list, linear search is simpler and may be cheaper overall.
- **Forgetting that `vector::insert` in the middle is O(n).** Building a sorted vector by inserting each value in place costs O(n²).
- **Mixing up an index and a value.** The search returns where the target is (-1 for "not found"), not the target itself.
- **Not testing the boundaries.** Most search bugs hide in the first element, the last element and the empty list.

## Guided Hands-On Activity

**Race the searches by hand and by machine.** Work with your teacher.

1. Type Example 1. Add a target that appears twice and see which index linear search returns. Why does it stop at the first?
2. Type Example 2. Search for the first value (3) and for the last (77). How many steps does each need?
3. On paper, perform binary search for 26 in the same list. Write down `low`, `high` and `mid` for every step, then check against the program.
4. Change `low = mid + 1` to `low = mid` in Example 2 and search for 10. What happens, and why?
5. Type Example 3 and use `lower_bound` to find where 5 *would* be inserted to keep the list sorted. What index do you get?
6. Write down seven test cases for a search function (empty, one element found, one element missing, first, last, smaller than all, larger than all) and run all of them against Example 2's function by changing `main`.

## Lesson Project: Algorithm Explorer: Search Race

### Objective

Add the second part of the Algorithm Explorer: a **search race**. Implement linear search and binary search with comparison counters, show a `low`/`mid`/`high` trace for one binary search, and compare the two algorithms on growing sorted lists, for the worst case and for the average over every item.

### Requirements

- A `SearchResult` structure with `index` and `comparisons`.
- `linear_search(v, target)` and `binary_search_counted(v, target, trace)`, both returning a `SearchResult`. One comparison is one look at an element.
- When `trace` is `true`, the binary search prints one line per step with `low`, `high`, `mid` and the value at `mid`.
- A function `make_sorted(n)` that returns the sorted even numbers `0, 2, 4, ...` (`n` of them).
- `main` prints (1) the trace for target 47 in the fixed 15-element list from Example 2, (2) a **worst-case table** for *n* = 16, 256, 4096 and 65536 (the target is a missing odd number), and (3) an **average-case table**: the average comparisons over every present item.
- Both searches must find the same index for every target (check it with a counter of mismatches and print the result).

### Instructions

1. Write `SearchResult` and the linear search with its counter. Test it on a small list.
2. Write `binary_search_counted` with the trace option and test it against the list from Example 2.
3. Write `make_sorted` and the worst-case table: the largest even value in the list is `2 * (n - 1)`, so for each *n* search for `2 * n - 1`, an odd number that is larger than every element and therefore missing.
4. Write the average-case table: loop over every present item and divide the total comparisons by *n*.
5. Add the cross-check: for every present item, compare the two indices and count mismatches.
6. Print the three parts with `setw` so the columns line up, compile with `-Wall -Wextra` and compare with the expected output.
7. Write down, in a comment, which of the two tables shows the O(log n) behaviour most clearly and why.

### Expected Output

```text
Trace: binary search for 47
  step 1: low=0 high=14 mid=7 value=34
  step 2: low=8 high=14 mid=11 value=58
  step 3: low=8 high=10 mid=9 value=47
  found at index 9 after 3 comparisons

Worst case (the target is not in the list)
       n   linear   binary
      16       16        5
     256      256        9
    4096     4096       13
   65536    65536       17

Average over every item in the list
       n   linear   binary  mismatches
      16     8.50     3.38           0
     256   128.50     7.04           0
    4096  2048.50    11.00           0
   65536 32768.50    15.00           0
```

### Hints

1. **Hint 1 (a missing target).** `2 * n - 1` is odd, so it is never in the list of even numbers, and it is larger than every element.
2. **Hint 2 (the trace).** Print inside the loop right after computing `mid`, and only `if (trace)`.
3. **Hint 3 (averages).** Keep a `long long total` and print `static_cast<double>(total) / n` with `fixed << setprecision(2)`.
4. **Hint 4 (the cross-check).** `if (linear_search(v, t).index != binary_search_counted(v, t, false).index) mismatches++;`
5. **Hint 5 (setw for a double).** Set `fixed` and `setprecision(2)` once, before the average table, and use `setw(9)` for each column.
6. **Hint 6 (comparisons are off by one).** Count the comparison *before* you test the value, once per loop pass.

### Success Criteria

- [ ] Both searches are separate functions that return an index and a count, and neither prints anything unless `trace` is on.
- [ ] The trace for 47 matches the hand trace from Example 2: three steps ending at index 9.
- [ ] In the worst-case table, the linear column equals *n*, and the binary column grows by only 4 each time *n* is multiplied by 16, staying close to log₂ *n* + 1.
- [ ] The average-case table shows about *n*/2 for linear search and a number near log₂ *n* for binary search.
- [ ] The mismatch count is 0 for every size.
- [ ] The code compiles with `-Wall -Wextra` and no warnings, and the output matches the expected output.

### Extension Challenge

Add `first_occurrence(v, target)`, a binary search that returns the index of the *first* equal value in a list with duplicates (without using `lower_bound`), and test it on `{2, 4, 4, 4, 9}`. Then add a third racer: the standard `binary_search` timed with `<chrono>` on one million elements searched 100,000 times, and compare real time for linear and binary search.

## Lesson Recap

- Arrays and vectors store elements contiguously, so `v[i]` is O(1); inserting or erasing in the middle is O(n).
- **Linear search** works on any list and costs O(n); **binary search** needs a sorted list and costs O(log n) by halving the range with `low`, `mid` and `high`.
- Count **comparisons** to compare algorithms fairly, and check boundaries (empty, first, last, missing) to catch off-by-one errors.
- `binary_search`, `lower_bound` and `upper_bound` are the standard tools for sorted ranges.
- Sorting first only pays off when you search the same data many times.

## Homework / Extension Mission

Write a program that reads a sorted list of student marks from a text file and answers queries: how many students scored at least a given mark (use `lower_bound`), and whether any student scored exactly a given mark. Then solve this puzzle with binary search: "I am thinking of a number from 1 to 1,000,000. After each guess I tell you higher or lower. What is the largest number of guesses you ever need?" Write a program that plays the guesser and prove, with your counter, that 20 is enough.

## Course Project Connection

This lesson adds the **Search Race** to the **Algorithm Explorer**: linear and binary search with comparison counters and a trace of `low`, `mid` and `high`. Keep the `SearchResult` structure: in Lesson 3 the sorting algorithms will report `comparisons` and `swaps` in the same way, and the final menu program in Lesson 8 will let the user pick any algorithm and see its count. Binary search also returns in Lesson 5 as the idea behind binary search trees.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: arrays, vectors and the cost table. 10 minutes: linear search and the "guess my number" game played by the class. 15 minutes: binary search on the board with a 15-element list (Example 2). 25 minutes: the project, as a guided build.

**Live demonstrations.** Play "guess my number from 1 to 100" with two volunteers, one using linear guesses and one halving. Trace binary search for a missing value on the board. Show an infinite loop caused by `low = mid` and explain it with the invariant.

**Misconceptions.** "Binary search works on any list." "The middle is always `(low + high) / 2` and that is always safe." "Log n is a small constant."

**Assessment of the project.** Verify the loop condition and updates, the counting rule (one comparison per look), the correctness cross-check, and that students can explain why the binary column in the worst-case table grows by 4 when *n* is multiplied by 16 (log₂ 16 = 4). Ask them to predict the next row (*n* = 1,048,576) before you run it.

**Reference solution `search_race.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra search_race.cpp -o search_race`):

```cpp
// Algorithm Explorer, Lesson 2: Search Race.
#include <iomanip>
#include <iostream>
#include <vector>
using namespace std;

struct SearchResult {
    int index;
    long long comparisons;
};

// O(n) time, O(1) space. Works on any list.
SearchResult linear_search(const vector<int>& v, int target)
{
    SearchResult r{-1, 0};
    for (size_t i = 0; i < v.size(); i++) {
        r.comparisons++;
        if (v[i] == target) {
            r.index = static_cast<int>(i);
            return r;
        }
    }
    return r;
}

// O(log n) time, O(1) space. Needs a sorted list.
SearchResult binary_search_counted(const vector<int>& v, int target, bool trace)
{
    SearchResult r{-1, 0};
    int low = 0;
    int high = static_cast<int>(v.size()) - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        r.comparisons++;
        if (trace) {
            cout << "  step " << r.comparisons << ": low=" << low << " high=" << high << " mid=" << mid
                 << " value=" << v[mid] << '\n';
        }
        if (v[mid] == target) {
            r.index = mid;
            return r;
        }
        if (v[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return r;
}

vector<int> make_sorted(int n)
{
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        v[i] = 2 * i;
    }
    return v;
}

int main()
{
    vector<int> fixed_list = {3, 8, 12, 15, 21, 26, 30, 34, 41, 47, 52, 58, 63, 70, 77};
    cout << "Trace: binary search for 47\n";
    SearchResult t = binary_search_counted(fixed_list, 47, true);
    cout << "  found at index " << t.index << " after " << t.comparisons << " comparisons\n\n";

    cout << "Worst case (the target is not in the list)\n";
    cout << setw(8) << "n" << setw(9) << "linear" << setw(9) << "binary" << '\n';
    for (int n : {16, 256, 4096, 65536}) {
        vector<int> v = make_sorted(n);
        int missing = 2 * n - 1;
        cout << setw(8) << n << setw(9) << linear_search(v, missing).comparisons << setw(9)
             << binary_search_counted(v, missing, false).comparisons << '\n';
    }

    cout << "\nAverage over every item in the list\n";
    cout << setw(8) << "n" << setw(9) << "linear" << setw(9) << "binary" << setw(12) << "mismatches" << '\n';
    cout << fixed << setprecision(2);
    for (int n : {16, 256, 4096, 65536}) {
        vector<int> v = make_sorted(n);
        long long linear_total = 0;
        long long binary_total = 0;
        int mismatches = 0;
        for (int target : v) {
            SearchResult a = linear_search(v, target);
            SearchResult b = binary_search_counted(v, target, false);
            linear_total += a.comparisons;
            binary_total += b.comparisons;
            if (a.index != b.index) {
                mismatches++;
            }
        }
        cout << setw(8) << n << setw(9) << static_cast<double>(linear_total) / n << setw(9)
             << static_cast<double>(binary_total) / n << setw(12) << mismatches << '\n';
    }
    return 0;
}
```

```output
Trace: binary search for 47
  step 1: low=0 high=14 mid=7 value=34
  step 2: low=8 high=14 mid=11 value=58
  step 3: low=8 high=10 mid=9 value=47
  found at index 9 after 3 comparisons

Worst case (the target is not in the list)
       n   linear   binary
      16       16        5
     256      256        9
    4096     4096       13
   65536    65536       17

Average over every item in the list
       n   linear   binary  mismatches
      16     8.50     3.38           0
     256   128.50     7.04           0
    4096  2048.50    11.00           0
   65536 32768.50    15.00           0
```

**Differentiation.** Support: provide `SearchResult`, the linear search and `make_sorted`, and let students write the binary search and the tables. Stretch: add `first_occurrence`, an interpolation search for evenly spread data, and timing with `<chrono>`.

**Discussion questions (not for the student quiz).** Why does the binary column grow by exactly one each time *n* is doubled, and by four each time *n* is multiplied by 16? Why can binary search be used to find the square root of a number, even though there is no list?
