# Lumexa Mission Log: Data Structures & Algorithmic Problem-Solving

**Course/Path:** Data Structures & Algorithmic Problem-Solving
**Lesson:** 03 of 08
**Title:** Sorting Algorithms and Their Performance
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** C++ (g++)

---

## Mission Brief

Sorted data is everywhere: the contacts in your phone, the results on a leaderboard, the books on a shelf, the transactions in a bank statement. Last lesson you saw why: binary search finds one item among a million in twenty steps, but only if the list is sorted. Sorting is also the first step of many other algorithms, from finding duplicates to scheduling jobs.

There are dozens of ways to sort, and they are wonderful for learning because each one is built on a different *idea*: swap neighbours, pick the smallest, insert into place, divide and merge, partition around a pivot. Some of them are simple but slow, others are clever and fast, and one of the fast ones has a famous bad day. In this lesson you build five of them, count their comparisons and moves on best-case, worst-case and random data, and turn the numbers into the **Sorting Lab** of the Algorithm Explorer.

## Learning Objectives

1. Explain how bubble sort, selection sort and insertion sort work, and state their time complexity.
2. Explain divide and conquer, and implement merge sort and quick sort.
3. Count comparisons and moves for each algorithm on sorted, reversed and random data.
4. Compare the algorithms by time, extra space, stability and sensitivity to the input.
5. Explain why quick sort has an O(n²) worst case and how a better pivot avoids it.
6. Use `std::sort` and `std::stable_sort` with a comparator, and choose the right sort for a task.

## Prerequisites

- Lesson 1: Big O, counting operations, best, average and worst cases.
- Lesson 2: `vector` and the habit of testing the boundary cases of an algorithm.

## Concept Explanation

### What makes a sort good

A **sorting algorithm** puts the elements of a list in order. Besides its time complexity, we ask four questions: Is it **in place** (does it use only O(1) extra memory)? Is it **stable** (are equal elements kept in their original order, which matters when you sort records by one field after another)? Is it **adaptive** (does it run faster on data that is already nearly sorted)? And is it **comparison-based**? Every sort in this lesson decides the order by *comparing* two elements, and it can be proved that no comparison-based sort can beat **O(n log n)** in the worst case.

### Bubble sort

**Bubble sort** repeatedly walks along the list and swaps every pair of neighbours that are out of order. After one pass the largest element has "bubbled" to the end, so each pass can stop one place earlier. If a whole pass makes no swap, the list is sorted and the algorithm can stop. It is easy to write and to understand, but slow: **O(n²)** comparisons in the worst case, or **O(n)** on a list that is already sorted (with the early exit). It is stable and in place.

### Selection sort

**Selection sort** finds the smallest element of the unsorted part and swaps it to the front of that part, then repeats for the rest. It always makes about n²/2 comparisons, even on sorted data, so it is **O(n²)** in every case. Its one virtue is that it makes at most n − 1 swaps, which helps when moving an element is expensive. It is in place but not stable.

### Insertion sort

**Insertion sort** grows a sorted part at the front of the list: it takes the next element and slides it left past every larger element until it fits, just like sorting playing cards in your hand. It is **O(n²)** in the worst case (a reversed list) but **O(n)** on a sorted list, and it is very fast on lists that are *nearly* sorted and on small lists. It is stable and in place, which is why real libraries use it for small pieces.

### Divide and conquer: merge sort

**Divide and conquer** solves a problem by splitting it into smaller copies of itself, solving those (usually by recursion) and combining the answers. **Merge sort** splits the list in half, sorts each half recursively, and **merges** the two sorted halves by repeatedly taking the smaller front element. A list of one element is already sorted, which stops the recursion. There are about log₂ n levels of splitting and each level does O(n) work in the merges, so merge sort is **O(n log n) in every case**. Its cost is **O(n) extra space** for the merged copy. It is stable.

### Quick sort

**Quick sort** picks a **pivot**, **partitions** the list so that everything smaller than the pivot is to its left and everything larger is to its right (the pivot is now in its final place), and then sorts the two sides recursively. When the pivot splits the list roughly in half, it is **O(n log n)**, and in practice it is often the fastest sort, because it works in place and is cache-friendly. But if the pivot is always the smallest or largest element, one side is empty and the other has n − 1 elements: **O(n²)**. With the simple rule "pivot = last element", a list that is already sorted triggers exactly that worst case. Good implementations choose the pivot at random or as the median of three elements. Quick sort is in place (apart from the recursion stack) and not stable.

### Choosing and using sorts

| Algorithm | Best | Average | Worst | Extra space | Stable |
|---|---|---|---|---|---|
| Bubble (early exit) | O(n) | O(n²) | O(n²) | O(1) | yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | no |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | yes |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | yes |
| Quick (last pivot) | O(n log n) | O(n log n) | O(n²) | O(log n) | no |

In your own programs you rarely write a sort by hand. `std::sort` (an adaptive hybrid called *introsort*) is O(n log n) in the worst case, and `std::stable_sort` keeps equal elements in order. Both accept a **comparator**, a function that says which of two elements comes first, so you can sort students by marks, then by name:

```cpp
sort(students.begin(), students.end(), [](const Student& a, const Student& b) {
    return a.marks > b.marks;           // highest marks first
});
```

## Key Vocabulary

| Term | Definition |
|---|---|
| **Sorting algorithm** | A procedure that arranges the elements of a list in order. |
| **In place** | Using only O(1) extra memory beyond the list itself. |
| **Stable sort** | A sort that keeps equal elements in their original relative order. |
| **Adaptive** | Running faster when the input is already nearly sorted. |
| **Divide and conquer** | Solving a problem by splitting it into smaller copies of itself and combining the results. |
| **Merge** | Combining two sorted lists into one by repeatedly taking the smaller front element. |
| **Pivot** | The element quick sort partitions the list around. |
| **Partition** | Rearranging a list so that smaller elements come before the pivot and larger ones after it. |
| **Comparator** | A function that tells a sort which of two elements goes first. |
| **Move** | In this course, one swap of two elements or one copy of an element to a new place. |

## Worked Examples

### Example 1: Three simple sorts with counters

```cpp
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

struct Stats {
    long long comparisons = 0;
    long long moves = 0;
};

void bubble_sort(vector<int>& v, Stats& s)
{
    int n = static_cast<int>(v.size());
    for (int pass = 0; pass < n - 1; pass++) {
        bool swapped = false;
        for (int i = 0; i < n - 1 - pass; i++) {
            s.comparisons++;
            if (v[i] > v[i + 1]) {
                swap(v[i], v[i + 1]);
                s.moves++;
                swapped = true;
            }
        }
        if (!swapped) {
            break;
        }
    }
}

void selection_sort(vector<int>& v, Stats& s)
{
    int n = static_cast<int>(v.size());
    for (int i = 0; i < n - 1; i++) {
        int smallest = i;
        for (int j = i + 1; j < n; j++) {
            s.comparisons++;
            if (v[j] < v[smallest]) {
                smallest = j;
            }
        }
        if (smallest != i) {
            swap(v[i], v[smallest]);
            s.moves++;
        }
    }
}

void insertion_sort(vector<int>& v, Stats& s)
{
    for (size_t i = 1; i < v.size(); i++) {
        int key = v[i];
        int j = static_cast<int>(i) - 1;
        while (j >= 0) {
            s.comparisons++;
            if (v[j] <= key) {
                break;
            }
            v[j + 1] = v[j];
            s.moves++;
            j--;
        }
        v[j + 1] = key;
    }
}

void show(const char* name, const vector<int>& v, const Stats& s)
{
    cout << name << ":";
    for (int x : v) {
        cout << ' ' << x;
    }
    cout << "  (comparisons " << s.comparisons << ", moves " << s.moves << ")\n";
}

int main()
{
    const vector<int> original = {5, 2, 9, 1, 7, 3};
    {
        vector<int> v = original;
        Stats s;
        bubble_sort(v, s);
        show("bubble   ", v, s);
    }
    {
        vector<int> v = original;
        Stats s;
        selection_sort(v, s);
        show("selection", v, s);
    }
    {
        vector<int> v = original;
        Stats s;
        insertion_sort(v, s);
        show("insertion", v, s);
    }
    return 0;
}
```

```output
bubble   : 1 2 3 5 7 9  (comparisons 14, moves 8)
selection: 1 2 3 5 7 9  (comparisons 15, moves 2)
insertion: 1 2 3 5 7 9  (comparisons 11, moves 8)
```

1. All three sort the same six numbers, and each result is 1 2 3 5 7 9.
2. Selection sort always makes the same number of comparisons, 15 = 5 + 4 + 3 + 2 + 1, whatever the data, and only a few moves.
3. Bubble sort and insertion sort make more or fewer comparisons depending on how disordered the data is; insertion sort counts one move for every element it slides.
4. These counts are exactly what the Sorting Lab will collect for every algorithm.

### Example 2: Merge sort

```cpp
#include <iostream>
#include <vector>
using namespace std;

long long comparisons = 0;
long long moves = 0;

void merge_sort(vector<int>& v, vector<int>& tmp, int lo, int hi)
{
    if (hi - lo < 1) {
        return;
    }
    int mid = lo + (hi - lo) / 2;
    merge_sort(v, tmp, lo, mid);
    merge_sort(v, tmp, mid + 1, hi);

    int i = lo;
    int j = mid + 1;
    int k = lo;
    while (i <= mid && j <= hi) {
        comparisons++;
        if (v[i] <= v[j]) {
            tmp[k++] = v[i++];
        } else {
            tmp[k++] = v[j++];
        }
        moves++;
    }
    while (i <= mid) {
        tmp[k++] = v[i++];
        moves++;
    }
    while (j <= hi) {
        tmp[k++] = v[j++];
        moves++;
    }
    for (int x = lo; x <= hi; x++) {
        v[x] = tmp[x];
        moves++;
    }
}

int main()
{
    vector<int> v = {38, 27, 43, 3, 9, 82, 10, 27};
    vector<int> tmp(v.size());
    merge_sort(v, tmp, 0, static_cast<int>(v.size()) - 1);
    for (int x : v) {
        cout << x << ' ';
    }
    cout << '\n';
    cout << "comparisons " << comparisons << ", moves " << moves << '\n';
    return 0;
}
```

```output
3 9 10 27 27 38 43 82
comparisons 17, moves 48
```

1. `merge_sort` splits the range in half, sorts both halves and then merges them using the helper array `tmp`: that array is the O(n) extra space.
2. The merge compares the two front elements and copies the smaller one. Using `<=` takes the left element when they are equal, which keeps equal values in their original order, so the sort is stable. (With plain numbers you cannot see this; with records sorted by one field you can.)
3. Eight elements need three levels of splitting (log₂ 8 = 3), and every level handles all 8 elements twice (once into the helper array and once back): 3 × 8 × 2 = 48 moves. That is the n log n.
4. A recursion this regular makes merge sort predictable: the cost hardly depends on the data.

### Example 3: Quick sort and its worst case

```cpp
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

long long comparisons = 0;

int partition(vector<int>& v, int lo, int hi)
{
    int pivot = v[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        comparisons++;
        if (v[j] < pivot) {
            swap(v[i], v[j]);
            i++;
        }
    }
    swap(v[i], v[hi]);
    return i;
}

void quick_sort(vector<int>& v, int lo, int hi)
{
    if (lo < hi) {
        int p = partition(v, lo, hi);
        quick_sort(v, lo, p - 1);
        quick_sort(v, p + 1, hi);
    }
}

int main()
{
    vector<int> mixed = {8, 3, 7, 1, 9, 4, 6, 2};
    quick_sort(mixed, 0, static_cast<int>(mixed.size()) - 1);
    cout << "mixed data: comparisons " << comparisons << ", result:";
    for (int x : mixed) {
        cout << ' ' << x;
    }
    cout << '\n';

    comparisons = 0;
    vector<int> sorted = {1, 2, 3, 4, 5, 6, 7, 8};
    quick_sort(sorted, 0, static_cast<int>(sorted.size()) - 1);
    cout << "already sorted: comparisons " << comparisons << " (n(n-1)/2 = 28)\n";
    return 0;
}
```

```output
mixed data: comparisons 18, result: 1 2 3 4 6 7 8 9
already sorted: comparisons 28 (n(n-1)/2 = 28)
```

1. `partition` takes the last element as the pivot, moves every smaller element to the left part and finally swaps the pivot into its place. The pivot is now in its final position, so only the two sides remain.
2. On the mixed list the pivots split the data reasonably, and the comparison count stays low.
3. On the sorted list the pivot is always the largest element, so every partition leaves one empty side and the other with n − 1 elements: 7 + 6 + ... + 1 = 28 comparisons, which is n(n − 1)/2. This is the O(n²) worst case.
4. Choosing the pivot randomly, or as the median of the first, middle and last elements, makes this bad day very unlikely.

## Common Mistakes and Misconceptions

- **Thinking the fastest sort is always the best.** Insertion sort beats merge sort on short or nearly sorted lists; merge sort wins when you need guaranteed O(n log n) or stability.
- **Forgetting the early exit in bubble sort.** Without it, bubble sort always does about n²/2 comparisons, even on sorted data.
- **Merging in the wrong order.** If the merge takes the right element when the two are equal (`<` instead of `<=`), merge sort loses its stability.
- **Off-by-one errors in the recursion.** `merge_sort(v, tmp, lo, mid)` and `(mid + 1, hi)` must not overlap or skip an element.
- **Assuming quick sort is always O(n log n).** With a poor pivot rule on sorted data it is O(n²), and deep recursion can overflow the stack.
- **Sorting a copy by mistake.** A function that takes `vector<int> v` by value sorts its own copy. Pass by reference.
- **Writing a comparator that is not consistent.** A comparison such as `a <= b` (instead of `a < b`) can make `std::sort` crash or loop.
- **Believing O(n²) sorts are useless.** They are simple, in place and fine for a few dozen elements, and insertion sort is a building block of production sorts.

## Guided Hands-On Activity

**Sort by hand, then by machine.** Work with your teacher.

1. On paper, sort 5 2 9 1 7 3 with bubble sort, writing the list after every pass. Count the comparisons and swaps, then compare with Example 1.
2. Run Example 1 on an already sorted list `{1, 2, 3, 4, 5, 6}` and on a reversed list `{6, 5, 4, 3, 2, 1}`. Which of the three sorts changes the most, and which does not change at all?
3. Remove `if (!swapped) break;` from bubble sort and run it on the sorted list. How do the comparisons change?
4. In Example 2, change `<=` to `<` in the merge, and sort a list of pairs (value, original position) to show that the order of equal values is no longer kept.
5. In Example 3, change the pivot to the middle element (swap `v[mid]` with `v[hi]` first) and run it on the sorted list. What happens to the comparisons?
6. Use `std::sort` with a lambda to sort a `vector<string>` by length, then alphabetically for equal lengths.

## Lesson Project: Algorithm Explorer: Sorting Lab

### Objective

Add the **Sorting Lab** to the Algorithm Explorer: implement bubble, selection, insertion, merge and quick sort with comparison and move counters, run them on sorted, reversed, random and nearly sorted data, check that every result is really sorted, and print the comparison tables that show where each algorithm shines or struggles.

### Requirements

- A `Stats` structure (`comparisons`, `moves`) and five sorting functions, each taking `vector<int>&` and `Stats&`.
- Four data generators for a given size *n*: `sorted_data`, `reversed_data`, `random_data` (a fixed pseudo-random sequence from a simple generator, so the output never changes) and `nearly_sorted_data` (sorted, with every tenth pair of neighbours swapped).
- A function that sorts a *copy* of the data with a chosen algorithm, verifies the result with `is_sorted`, and returns the `Stats`.
- `main` prints, for *n* = 64: a **comparisons table** (one row per algorithm, one column per data set) and a **moves table** for the random data, and then the line `All results sorted: yes`.
- Quick sort uses the last element as the pivot, so its worst case is visible.

### Instructions

1. Write `Stats` and the three simple sorts. Test each on the list from Example 1.
2. Write `merge_sort` (with its helper array) and `quick_sort`, with counters.
3. Write the four data generators. For the random data, use `x = (x * 1103515245u + 12345u) & 0x7fffffffu` and take `x % 1000` for each value.
4. Write the function that sorts a copy, checks `is_sorted` from `<algorithm>` and returns the counters.
5. Print the comparisons table with `setw` for every algorithm and every data set.
6. Print the moves table for the random data and the final verification line.
7. Compare your output with the expected output, and write down which algorithm wins on each data set and why. Use a comment.

### Expected Output

```text
Comparisons (n = 64)
algorithm     sorted  reversed   random   nearly
bubble            63      2016     2006      125
selection       2016      2016     2016     2016
insertion         63      2016     1247       69
merge            192       192      299      192
quick           2016      2016      383     1806

Moves on random data
bubble          1190
selection         56
insertion       1190
merge            768
quick            205

All results sorted: yes
```

### Hints

1. **Hint 1 (copies).** `vector<int> copy = data;` then sort `copy`; keep `data` untouched for the next algorithm.
2. **Hint 2 (the function table).** Store the five algorithms in an array of `{name, function}` pairs, with `using SortFn = void (*)(vector<int>&, Stats&);` so one loop can run them all.
3. **Hint 3 (merge sort wrapper).** Make a small function `void merge_sort_all(vector<int>& v, Stats& s)` that creates the temporary vector and calls the recursive function.
4. **Hint 4 (nearly sorted).** Start from `0, 1, 2, ...` and swap `v[i]` with `v[i + 1]` for `i = 0, 10, 20, ...`.
5. **Hint 5 (random data).** Keep the generator state in an `unsigned int` so the arithmetic wraps the same way everywhere.
6. **Hint 6 (comparing algorithms fairly).** Count one comparison per test of two elements, and count one move per swap or per copy into a new place.

### Success Criteria

- [ ] All five sorts are separate functions with the same signature, and each leaves the vector sorted.
- [ ] The verification line says `yes`, which means `is_sorted` returned true for every run.
- [ ] In the comparisons table, bubble and insertion sort need only *n* − 1 comparisons on sorted data, selection sort always needs 2016, and quick sort needs 2016 on sorted and reversed data.
- [ ] Merge sort's comparison counts stay between 192 and 299 for every data set, while the O(n²) sorts range from 63 to 2016.
- [ ] The comment names the winner for each data set and gives a reason.
- [ ] The code compiles with `-Wall -Wextra` and no warnings, and the output matches the expected output.

### Extension Challenge

Add a sixth algorithm, `quick_sort_median3`, which chooses the median of the first, middle and last elements as the pivot, and show in the table that its worst case on sorted data disappears. Then add `std::sort` as a seventh algorithm by counting comparisons through a lambda comparator that increments a counter, and compare it with your own sorts.

## Lesson Recap

- Sorts are compared by time, extra space, stability and how they react to the input.
- **Bubble, selection and insertion sort** are simple O(n²) sorts; bubble and insertion are O(n) on sorted data, and selection makes the fewest swaps.
- **Merge sort** divides, sorts and merges: O(n log n) always, O(n) extra space, stable. **Quick sort** partitions around a pivot: O(n log n) on average but O(n²) with a bad pivot, in place, not stable.
- Counting comparisons and moves on best, worst and random data shows these differences in numbers.
- In real programs use `std::sort` or `std::stable_sort` with a comparator.

## Homework / Extension Mission

Use your Sorting Lab to answer three questions with data, not guesses. (1) For what size *n* does insertion sort stop being faster than merge sort on random data? Try *n* = 4, 8, 16, 32 and 64. (2) How much do the numbers for quick sort change if the pivot is the middle element? (3) For which of your data sets is selection sort the best choice, if moving an element is very expensive? Write half a page with the numbers that support each answer, and add a text bar chart of the comparison counts to your program.

## Course Project Connection

This lesson adds the **Sorting Lab** to the **Algorithm Explorer**. The `Stats` structure and the idea of "sort a copy, verify it, report the counters" will be reused by every later algorithm, and the data generators will feed the comparisons in Lesson 8. Sorting also prepares Lessons 5 and 6: the heap of Lesson 5 gives a fourth O(n log n) sort, and hashing in Lesson 6 solves some problems that otherwise need a sort.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: why sort, stability and in place, with a deck of cards. 15 minutes: the three simple sorts (Example 1; have volunteers act as the array). 15 minutes: merge sort and quick sort on the board (Examples 2 and 3). 20 minutes: the project, as a guided build; most of the table analysis continues as homework.

**Live demonstrations.** Sort eight students by height with each algorithm, physically. Show the merge-sort tree and the quick-sort partition step by step. Run quick sort on a sorted list of 20,000 numbers to show the stack overflow caused by the worst case, and then the median-of-three fix.

**Misconceptions.** "Quick sort is O(n log n)" without qualification. "Stable and unstable sorts give different sorted orders" (they give the same order of values, but a different order of equal records). "More moves means more comparisons."

**Assessment of the project.** Verify the counting rules (one comparison per test, one move per swap or copy), the copy-and-verify function, and the analysis comment. Ask each student to predict the quick-sort count on a reversed list of 64 before running it.

**Reference solution `sorting_lab.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra sorting_lab.cpp -o sorting_lab`):

```cpp
// Algorithm Explorer, Lesson 3: Sorting Lab.
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

struct Stats {
    long long comparisons = 0;
    long long moves = 0;
};

// O(n^2) time (O(n) when already sorted), O(1) space, stable.
void bubble_sort(vector<int>& v, Stats& s)
{
    int n = static_cast<int>(v.size());
    for (int pass = 0; pass < n - 1; pass++) {
        bool swapped = false;
        for (int i = 0; i < n - 1 - pass; i++) {
            s.comparisons++;
            if (v[i] > v[i + 1]) {
                swap(v[i], v[i + 1]);
                s.moves++;
                swapped = true;
            }
        }
        if (!swapped) {
            break;
        }
    }
}

// O(n^2) time always, O(1) space, at most n - 1 swaps.
void selection_sort(vector<int>& v, Stats& s)
{
    int n = static_cast<int>(v.size());
    for (int i = 0; i < n - 1; i++) {
        int smallest = i;
        for (int j = i + 1; j < n; j++) {
            s.comparisons++;
            if (v[j] < v[smallest]) {
                smallest = j;
            }
        }
        if (smallest != i) {
            swap(v[i], v[smallest]);
            s.moves++;
        }
    }
}

// O(n^2) time (O(n) when already sorted), O(1) space, stable.
void insertion_sort(vector<int>& v, Stats& s)
{
    for (size_t i = 1; i < v.size(); i++) {
        int key = v[i];
        int j = static_cast<int>(i) - 1;
        while (j >= 0) {
            s.comparisons++;
            if (v[j] <= key) {
                break;
            }
            v[j + 1] = v[j];
            s.moves++;
            j--;
        }
        v[j + 1] = key;
    }
}

void merge_rec(vector<int>& v, vector<int>& tmp, int lo, int hi, Stats& s)
{
    if (hi - lo < 1) {
        return;
    }
    int mid = lo + (hi - lo) / 2;
    merge_rec(v, tmp, lo, mid, s);
    merge_rec(v, tmp, mid + 1, hi, s);
    int i = lo;
    int j = mid + 1;
    int k = lo;
    while (i <= mid && j <= hi) {
        s.comparisons++;
        tmp[k++] = (v[i] <= v[j]) ? v[i++] : v[j++];
        s.moves++;
    }
    while (i <= mid) {
        tmp[k++] = v[i++];
        s.moves++;
    }
    while (j <= hi) {
        tmp[k++] = v[j++];
        s.moves++;
    }
    for (int x = lo; x <= hi; x++) {
        v[x] = tmp[x];
        s.moves++;
    }
}

// O(n log n) time always, O(n) extra space, stable.
void merge_sort(vector<int>& v, Stats& s)
{
    vector<int> tmp(v.size());
    merge_rec(v, tmp, 0, static_cast<int>(v.size()) - 1, s);
}

int partition_last(vector<int>& v, int lo, int hi, Stats& s)
{
    int pivot = v[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        s.comparisons++;
        if (v[j] < pivot) {
            swap(v[i], v[j]);
            s.moves++;
            i++;
        }
    }
    swap(v[i], v[hi]);
    s.moves++;
    return i;
}

void quick_rec(vector<int>& v, int lo, int hi, Stats& s)
{
    if (lo < hi) {
        int p = partition_last(v, lo, hi, s);
        quick_rec(v, lo, p - 1, s);
        quick_rec(v, p + 1, hi, s);
    }
}

// O(n log n) time on average, O(n^2) worst case with this pivot, O(log n) stack, not stable.
void quick_sort(vector<int>& v, Stats& s)
{
    quick_rec(v, 0, static_cast<int>(v.size()) - 1, s);
}

vector<int> sorted_data(int n)
{
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        v[i] = i;
    }
    return v;
}

vector<int> reversed_data(int n)
{
    vector<int> v = sorted_data(n);
    reverse(v.begin(), v.end());
    return v;
}

vector<int> random_data(int n)
{
    vector<int> v(n);
    unsigned int x = 12345u;
    for (int i = 0; i < n; i++) {
        x = (x * 1103515245u + 12345u) & 0x7fffffffu;
        v[i] = static_cast<int>(x % 1000u);
    }
    return v;
}

vector<int> nearly_sorted_data(int n)
{
    vector<int> v = sorted_data(n);
    for (int i = 0; i + 1 < n; i += 10) {
        swap(v[i], v[i + 1]);
    }
    return v;
}

using SortFn = void (*)(vector<int>&, Stats&);

struct Algorithm {
    const char* name;
    SortFn run;
};

Stats run_on_copy(SortFn sort_fn, const vector<int>& data, bool& all_sorted)
{
    vector<int> copy = data;
    Stats s;
    sort_fn(copy, s);
    if (!is_sorted(copy.begin(), copy.end())) {
        all_sorted = false;
    }
    return s;
}

int main()
{
    const int n = 64;
    const Algorithm algorithms[] = {{"bubble", bubble_sort}, {"selection", selection_sort}, {"insertion", insertion_sort},
                                    {"merge", merge_sort}, {"quick", quick_sort}};
    const vector<int> data_sets[] = {sorted_data(n), reversed_data(n), random_data(n), nearly_sorted_data(n)};
    bool all_sorted = true;

    cout << "Comparisons (n = " << n << ")\n";
    cout << left << setw(11) << "algorithm" << right << setw(9) << "sorted" << setw(10) << "reversed" << setw(9) << "random"
         << setw(9) << "nearly" << '\n';
    const int widths[] = {9, 10, 9, 9};
    for (const Algorithm& a : algorithms) {
        cout << left << setw(11) << a.name << right;
        for (size_t d = 0; d < 4; d++) {
            cout << setw(widths[d]) << run_on_copy(a.run, data_sets[d], all_sorted).comparisons;
        }
        cout << '\n';
    }

    cout << "\nMoves on random data\n";
    for (const Algorithm& a : algorithms) {
        cout << left << setw(11) << a.name << right << setw(9) << run_on_copy(a.run, data_sets[2], all_sorted).moves << '\n';
    }
    cout << "\nAll results sorted: " << (all_sorted ? "yes" : "no") << '\n';
    return 0;
}
```

```output
Comparisons (n = 64)
algorithm     sorted  reversed   random   nearly
bubble            63      2016     2006      125
selection       2016      2016     2016     2016
insertion         63      2016     1247       69
merge            192       192      299      192
quick           2016      2016      383     1806

Moves on random data
bubble          1190
selection         56
insertion       1190
merge            768
quick            205

All results sorted: yes
```

**Differentiation.** Support: provide `Stats`, the three simple sorts and the generators, and let students write merge sort, quick sort and the tables. Stretch: add median-of-three quick sort, a random pivot, `std::sort` with a counting comparator and a text bar chart.

**Discussion questions (not for the student quiz).** Why can no comparison sort be faster than O(n log n)? (Think of the number of possible orderings.) Why do libraries often switch to insertion sort for small pieces?
