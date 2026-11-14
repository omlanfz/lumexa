# Lumexa Mission Log: Python, Artificial Intelligence & Modern Computing

**Course/Path:** Python, Artificial Intelligence & Modern Computing
**Lesson:** 03 of 08
**Title:** Python Problem-Solving Lab: Implementing Algorithms
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Python

---

## Mission Brief

In the course on data structures you described algorithms in pseudo-code and analysed them with Big O. But an algorithm that exists only on paper has not been tested, and a claim such as "binary search needs about log n steps" is only a claim until you have counted the steps of a real run. In this lab you **implement** the classic algorithms in Python, **test** them against trusted answers, and **measure** them, so that theory and practice meet.

You write searching, sorting, graph and dynamic programming code, you build the habit of testing the edge cases first (the empty list, the single item, the duplicates), and you count comparisons instead of seconds, because a count is the same on every computer. You finish by adding a tested **Algorithm Library** to the course project.

## Learning Objectives

1. Turn a specification and pseudo-code into a correct Python function, with a docstring, a precondition and the edge cases handled.
2. Implement linear and binary search, insertion sort and merge sort, and explain when each is the right choice and why Python's built-in `sorted` is usually better.
3. Represent a graph as a dictionary of lists, and implement breadth-first search (shortest path) and depth-first search (reachability).
4. Use recursion, memoisation and dynamic programming, and explain why a greedy rule can fail.
5. Test algorithms with edge cases and with a trusted oracle on repeatable pseudo-random data.
6. Measure algorithms by counting operations, and relate the counts to Big O.

## Prerequisites

- Lessons 1 and 2: Python functions, lists, dictionaries, comprehensions, errors and modules.
- Big O notation, searching, sorting, graphs and recursion from the course on data structures and algorithmic problem solving.
- The idea of automatic tests from the web and software engineering lessons.

## Concept Explanation

### From pseudo-code to Python

An algorithm is a precise, finite recipe that turns an input into an output. Writing it as code is the only way to be sure that you understood it, and the routine is always the same. First state the **specification**: the input, the output and the **precondition** (what must be true for the algorithm to work, for example "the list is sorted"). Then think about the **edge cases** before you type: the empty list, one item, duplicates, the target at the first or last position, the target missing. Write the function with a docstring, write the tests, and run them. Python makes this pleasant, but three habits matter. Do not change the caller's list unless the function says so (copy it first with `list(items)`). Remember that a slice such as `items[:middle]` **copies** the items, which costs O(n). And use the standard library as the **oracle**, the trusted reference that your own function must agree with: `sorted` for sorting, `bisect` for binary search.

### Searching and sorting

**Linear search** looks at the items one by one, O(n), and works on any list. **Binary search** needs a **sorted** list and halves the range at every step: look at the middle item, and continue in the half where the target must be. It needs about log2 n comparisons, so about 20 for a million items. The loop is famous for off-by-one bugs: with `low` and `high` as the first and last position still in play, the test is `while low <= high`, the middle is `(low + high) // 2`, and the new range is `mid + 1` or `mid - 1`; if you forget the `+ 1` or the `- 1`, the loop may never end.

**Insertion sort** grows a sorted prefix: it takes the next item and shifts the bigger items one place to the right until the item fits. It is in place, **stable** (equal items keep their order) and very fast on short or nearly sorted lists, with O(n) comparisons for sorted input, but about n squared over two for reversed input and n squared over four on average. **Merge sort** splits the list in half, sorts the halves recursively and **merges** them by always taking the smaller front item. It needs O(n log n) comparisons in every case and O(n) extra memory, and it is stable. Python's built-in `sorted` and `list.sort` use **Timsort**, a hybrid of merge sort and insertion sort that is O(n log n) in the worst case, close to O(n) on data that is already sorted, stable, and written in C, so in real programs you use it and give it a `key`.

To check a Big O claim you can time the program, but time depends on the computer and on what else it is doing. Instead you can **count operations**, for example comparisons. The count is the same on every machine, so a table of counts shows the growth law. If the input doubles, an O(n) count doubles, an O(n log n) count grows by a little more than two, an O(n squared) count grows by about four, and an O(log n) count grows by one.

### Graphs, recursion and memoisation

A **graph** has vertices joined by edges. In Python the natural representation is a **dictionary of lists**, the adjacency list: `{"Gate": ["Library", "Canteen"], ...}`. **Breadth-first search (BFS)** uses a **queue** (`collections.deque`, whose `popleft` is O(1), unlike `list.pop(0)`) and explores the places in rings of distance from the start. In a graph without weights the first time BFS reaches the goal is along a **shortest path**, the one with the fewest edges. To rebuild the path, record each place's **parent** when it is first discovered and follow the parents back from the goal. **Depth-first search (DFS)** goes as deep as possible before it backs up; it is written naturally with recursion, answers "what can be reached from here?", and when it is started from every unvisited place it counts the **connected components**. Both visit every vertex and edge once, which is O(V + E).

**Recursion** solves a problem with smaller copies of itself and needs a **base case** that stops and a step that moves toward it. Python allows about a thousand nested calls and then raises `RecursionError`. Recursion can also repeat work: the plain `fib(n) = fib(n - 1) + fib(n - 2)` computes the same values again and again, so its number of calls grows exponentially. **Memoisation** stores each result when it is first computed, using a dictionary or the decorator `@lru_cache`, so every value is computed only once and the time becomes O(n). **Dynamic programming** fills a table of answers to the small problems in a sensible order and builds the answer to the big one from them, for example the fewest coins for every amount from 0 up. It is needed when a **greedy** rule (always take the biggest coin) is fast but not always right: with the coins 1, 3 and 4 the greedy rule pays 6 as 4 + 1 + 1, three coins, but the best is 3 + 3, two coins.

### Testing and measuring algorithms

Test the **edge cases** every time: the empty list, one item, two items, duplicates, negative numbers, already sorted, reversed, a missing target, a target at either end. Then test against the **oracle** on many inputs: sort a few hundred pseudo-random lists with your function and with `sorted`, and demand equal results. The random numbers must be **repeatable**, so that a failure can be reproduced: this lesson uses a tiny hand-written generator (a linear congruential generator, `x = (x * 1103515245 + 12345) mod 2^31`), which gives the same numbers on every computer; in larger programs use `random.Random(seed)`. A test must be able to fail, so check it once against a deliberately broken function. Use explicit checks that print PASS or FAIL rather than relying on `assert` alone, because running Python with the `-O` option removes `assert` statements. When you must time code, use `time.perf_counter()` or the `timeit` module, repeat the measurement and take the smallest result, and remember that Big O describes how the cost *grows*, not how many seconds it takes.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Precondition** | What must be true before an algorithm can work, such as "the list is sorted". |
| **Edge case** | An unusual input at the limits of the specification: empty, single, duplicate, missing. |
| **Oracle** | A trusted reference, such as `sorted`, that your function's results are compared with. |
| **Stable sort** | A sort that keeps equal items in their original order. |
| **Timsort** | Python's built-in sort: a hybrid of merge sort and insertion sort, O(n log n) worst case. |
| **Adjacency list** | A graph stored as a dictionary that maps each vertex to the list of its neighbours. |
| **BFS / DFS** | Breadth-first search: rings of distance, with a queue / depth-first search: as deep as possible, with recursion. |
| **Queue / deque** | First in, first out / `collections.deque`, a queue with O(1) operations at both ends. |
| **Base case** | The input of a recursive function that is answered without a recursive call. |
| **Memoisation** | Storing the result of each call so that it is computed only once. |
| **Dynamic programming** | Solving a problem from a table of answers to its smaller problems. |
| **Greedy algorithm** | An algorithm that always takes the locally best choice; fast, but not always optimal. |
| **Big O** | The growth of the cost of an algorithm with the size of its input. |

## Worked Examples

### Example 1: Counting comparisons

```python
def lcg(seed, count, modulus=10_000):
    """A tiny pseudo-random generator: the same numbers on every computer."""
    values, x = [], seed
    for _ in range(count):
        x = (x * 1103515245 + 12345) % 2 ** 31
        values.append(x % modulus)
    return values


def linear_search(items, target):
    comparisons = 0
    for index, item in enumerate(items):
        comparisons += 1
        if item == target:
            return index, comparisons
    return -1, comparisons


def binary_search(items, target):
    low, high, comparisons = 0, len(items) - 1, 0
    while low <= high:
        mid = (low + high) // 2
        comparisons += 1
        if items[mid] == target:
            return mid, comparisons
        if items[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1, comparisons


def insertion_sort(items):
    items, comparisons = list(items), 0
    for i in range(1, len(items)):
        key, j = items[i], i - 1
        while j >= 0:
            comparisons += 1
            if items[j] <= key:
                break
            items[j + 1] = items[j]
            j -= 1
        items[j + 1] = key
    return items, comparisons


def merge_sort(items):
    if len(items) <= 1:
        return list(items), 0
    middle = len(items) // 2
    left, left_count = merge_sort(items[:middle])
    right, right_count = merge_sort(items[middle:])
    merged, i, j, comparisons = [], 0, 0, left_count + right_count
    while i < len(left) and j < len(right):
        comparisons += 1
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged, comparisons


print(f"{'n':>5} {'linear':>7} {'binary':>7} {'insertion':>10} {'merge':>7}")
previous = None
for n in (100, 200, 400, 800):
    data = lcg(7, n)
    ordered, merge_count = merge_sort(data)
    assert ordered == sorted(data) == insertion_sort(data)[0]
    _, linear_count = linear_search(data, -1)
    _, binary_count = binary_search(ordered, -1)
    _, insertion_count = insertion_sort(data)
    print(f"{n:>5} {linear_count:>7} {binary_count:>7} {insertion_count:>10} {merge_count:>7}")
    if previous:
        print(f"      doubling n: insertion x{insertion_count / previous[0]:.1f}, merge x{merge_count / previous[1]:.1f}")
    previous = (insertion_count, merge_count)
```

```output
    n  linear  binary  insertion   merge
  100     100       6       2797     550
  200     200       7      10279    1289
      doubling n: insertion x3.7, merge x2.3
  400     400       8      41757    2963
      doubling n: insertion x4.1, merge x2.3
  800     800       9     160013    6724
      doubling n: insertion x3.8, merge x2.3
```

1. `lcg` is a pseudo-random generator that anybody can reproduce, so every run sorts the same lists. Each function returns its **comparison count** next to its result. The `assert` line is the **oracle test**: both sorts must agree with `sorted(data)` for every size.
2. The search target is `-1`, which is **not in the list**: that is the worst case. Linear search compares with every item, so its count is exactly n (100, 200, 400, 800). Binary search needs only 6, 7, 8 and 9 comparisons: one more each time n doubles, which is the signature of **O(log n)**.
3. Insertion sort needs 2,797, then 10,279, 41,757 and 160,013 comparisons. Each time n doubles the count is multiplied by about **four** (x3.7, x4.1, x3.8), which is the signature of **O(n squared)**. Merge sort needs 550, 1,289, 2,963 and 6,724 comparisons, multiplied by only about **2.3** each time: the signature of **O(n log n)**.
4. At n = 800 insertion sort needs about 24 times as many comparisons as merge sort, and the gap grows with n. Counting made the Big O claims visible without a stopwatch.

### Example 2: Shortest paths and reachability

```python
from collections import deque

CAMPUS = {
    "Gate": ["Library", "Canteen"],
    "Library": ["Gate", "Admin", "Lab"],
    "Canteen": ["Gate", "Hall"],
    "Admin": ["Library", "Hall"],
    "Lab": ["Library", "Workshop"],
    "Hall": ["Canteen", "Admin", "Workshop"],
    "Workshop": ["Lab", "Hall"],
    "Garden": [],
}


def bfs_path(graph, start, goal):
    """The shortest path from start to goal (fewest steps), or None."""
    parent = {start: None}
    queue = deque([start])
    while queue:
        place = queue.popleft()
        if place == goal:
            path = []
            while place is not None:
                path.append(place)
                place = parent[place]
            return path[::-1]
        for neighbour in graph[place]:
            if neighbour not in parent:
                parent[neighbour] = place
                queue.append(neighbour)
    return None


def reachable(graph, place, seen=None):
    """Every place that can be reached from `place` (depth-first search)."""
    seen = set() if seen is None else seen
    seen.add(place)
    for neighbour in graph[place]:
        if neighbour not in seen:
            reachable(graph, neighbour, seen)
    return seen


def components(graph):
    seen, count = set(), 0
    for place in graph:
        if place not in seen:
            seen |= reachable(graph, place)
            count += 1
    return count


for goal in ("Workshop", "Admin", "Gate", "Garden"):
    path = bfs_path(CAMPUS, "Gate", goal)
    print(f"Gate -> {goal}:", " > ".join(path) + f" ({len(path) - 1} steps)" if path else "no path")
print("reachable from Gate:", sorted(reachable(CAMPUS, "Gate")))
print("separate parts:", components(CAMPUS))
CAMPUS["Canteen"].append("Garden")
CAMPUS["Garden"].append("Canteen")
print("after a path to the garden:", " > ".join(bfs_path(CAMPUS, "Gate", "Garden")), "| parts:", components(CAMPUS))
```

```output
Gate -> Workshop: Gate > Library > Lab > Workshop (3 steps)
Gate -> Admin: Gate > Library > Admin (2 steps)
Gate -> Gate: Gate (0 steps)
Gate -> Garden: no path
reachable from Gate: ['Admin', 'Canteen', 'Gate', 'Hall', 'Lab', 'Library', 'Workshop']
separate parts: 2
after a path to the garden: Gate > Canteen > Garden | parts: 1
```

1. `CAMPUS` is an **adjacency list**: each place maps to the list of places that are one step away. The Garden has no neighbours at all, so it is an island.
2. `bfs_path` keeps a queue of places to explore and a dictionary `parent` that doubles as the **visited set**. When the goal comes out of the queue, the path is rebuilt by following the parents back and reversing the list. BFS discovers the Library before the Canteen, so of the two three-step routes to the Workshop it returns the one through the Library and the Lab.
3. The three special cases are handled without extra code: the path from the Gate to the Gate is just `Gate` with 0 steps, and a goal that can never be reached makes the queue run empty, so the function returns `None` and the program prints "no path".
4. `reachable` is a **depth-first search** written with recursion, and `components` repeats it from every place that has not been seen yet. The campus has **2** separate parts, the main campus (seven places) and the Garden. After a path Canteen to Garden is added, there is **1** part, and the shortest way to the Garden is Gate, Canteen, Garden.

### Example 3: Memoisation, dynamic programming and the greedy trap

```python
from functools import lru_cache

calls = 0


def fib_naive(n):
    global calls
    calls += 1
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)


@lru_cache(maxsize=None)
def fib_memo(n):
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)


print("fib(25) naive:", fib_naive(25), "after", calls, "calls")
print("fib(25) memo: ", fib_memo(25), "with", fib_memo.cache_info())
print("fib(90) memo: ", fib_memo(90))


def greedy_coins(amount, coins):
    count = 0
    for coin in sorted(coins, reverse=True):
        count += amount // coin
        amount %= coin
    return count if amount == 0 else None


def min_coins(amount, coins):
    best = [0] + [None] * amount
    for total in range(1, amount + 1):
        options = [best[total - c] + 1 for c in coins if c <= total and best[total - c] is not None]
        best[total] = min(options) if options else None
    return best[amount]


for amount, coins in [(63, [1, 5, 10, 25]), (6, [1, 3, 4]), (7, [2, 4])]:
    print(amount, coins, "greedy:", greedy_coins(amount, coins), "dp:", min_coins(amount, coins))
```

```output
fib(25) naive: 75025 after 242785 calls
fib(25) memo:  75025 with CacheInfo(hits=23, misses=26, maxsize=None, currsize=26)
fib(90) memo:  2880067194370816120
63 [1, 5, 10, 25] greedy: 6 dp: 6
6 [1, 3, 4] greedy: 3 dp: 2
7 [2, 4] greedy: None dp: None
```

1. `fib_naive(25)` needs **242,785 calls** to compute one number, because it recomputes `fib(23)` twice, `fib(22)` three times and so on. The number of calls grows exponentially: `fib_naive(90)` would need more than 9 x 10 to the power 18 calls, which is tens of thousands of years at ten million calls per second.
2. `@lru_cache` remembers every result. `fib_memo(25)` makes only 49 calls: 26 **misses** (each value from 0 to 25 is computed once) and 23 **hits** (answered from the cache). That is O(n), and `fib_memo(90)` returns 2,880,067,194,370,816,120 at once, a number far beyond a C `long`, which Python's integers handle exactly.
3. `min_coins` is **dynamic programming**: `best[total]` is the fewest coins for each amount from 0 up to the goal, built from the smaller amounts by trying every coin. `greedy_coins` always takes the biggest coin first.
4. For 63 with the coins 1, 5, 10 and 25 both give 6 coins. For 6 with 1, 3 and 4 the greedy rule gives 3 (4 + 1 + 1) but the best is **2** (3 + 3): greedy is fast but can be wrong. For 7 with 2 and 4 the amount is impossible, and both functions return `None`.

## Common Mistakes and Misconceptions

- **Binary search on an unsorted list.** It returns wrong answers without any error; the precondition is part of the specification.
- **Off-by-one errors in the loop bounds.** `while low < high` or `high = mid` can skip the last candidate or loop forever; test the one-item and two-item lists.
- **Changing the caller's list.** A sort that works in place and returns `None` surprises the caller; copy first, or document it.
- **Recursion without a base case,** or with a step that does not move toward it. Python stops it with a `RecursionError` after about a thousand calls.
- **Plain recursion for overlapping problems.** The naive Fibonacci recomputes the same values exponentially often; add a cache.
- **Believing that a greedy rule is always optimal.** It is correct for some coin systems and wrong for others; prove it or test against dynamic programming.
- **Timing a single run.** One measurement is noise; count operations, or repeat the timing and take the minimum.
- **Testing only the happy path.** The empty list, duplicates and a missing target find the bugs that typical data never shows.

## Guided Hands-On Activity

**Break it, then measure it.** Work with your teacher and the code editors.

1. In Example 1 change the seed of `lcg` from 7 to 99 and run it again. Do the doubling factors of the two sorts stay about the same?
2. Add a call `insertion_sort(list(range(800)))` and one with `list(range(800, 0, -1))`, and predict both counts before you run them (use n - 1 and n times n - 1 over 2).
3. Change `binary_search` to `while low < high` and run the Example 1 table. Which tests or counts show that something is wrong? Then restore it.
4. Write `selection_sort(items)` that counts comparisons, and check that for n = 100 the count is always 4,950.
5. In Example 2 add the edge Hall to Garden (in both directions) and predict the new shortest path from the Gate to the Garden.
6. In Example 3 compute `min_coins(63, [1, 5, 10, 21, 25])` and `greedy_coins(63, [1, 5, 10, 21, 25])` and explain the difference.
7. Time `fib_naive(30)` with `time.perf_counter()` and compare it with `fib_memo(30)`.

## Lesson Project: Algorithm Library with Tests

### Objective

Add a tested **Algorithm Library** to the course project: search, sort, graph and memoised functions in one module, a test suite that includes the edge cases and the oracle checks, and a small table that shows the best, worst and average behaviour of two sorting algorithms.

### Requirements

- **The functions.** `linear_search(items, target)` and `binary_search(items, target)` that return the index or -1; `insertion_sort(items)` and `merge_sort(items)` that return a **new** sorted list together with the number of comparisons; `bfs_path(graph, start, goal)` that returns the shortest path or `None`; `fib(n)` with memoisation (use `lru_cache`); and `min_coins(amount, coins)` with dynamic programming.
- **The tests.** At least **18 tests**, each printed as PASS or FAIL, and a summary line. They must cover the empty list, one item, duplicates, negative numbers, a reversed list, a missing target and a target at either end; the two sorts must be compared with `sorted` on pseudo-random lists of the sizes 0, 1, 2, 10, 100 and 500; `insertion_sort` must leave its input unchanged; `bfs_path` needs a case where start equals goal and a case with no path; `fib(90)` must be exact; and `min_coins` needs a case where the greedy rule fails and an impossible amount.
- **The measurements.** Print the comparisons that insertion sort and merge sort need for 200 numbers that are already sorted, reversed and pseudo-random (use the generator `lcg`).
- **The toolkit link.** Use `binary_search` to find the student with id 4 in the sorted list of ids `[1, 2, 3, 4, 5]` of Lesson 2, and print its position.
- Keep the library in one file, with docstrings, and put nothing that prints at the top level except the tests and the measurements.

### Instructions

1. Copy `lcg` and the search and sort functions from Example 1, and change the searches so that they return only the index.
2. Add `bfs_path` from Example 2, and `fib` and `min_coins` from Example 3.
3. Write the `test(name, condition)` helper that prints PASS or FAIL and counts the results.
4. Write the tests group by group: searches, sorts, graph, memoisation and dynamic programming.
5. Break `binary_search` on purpose (for example with `while low < high`), check that a test fails, and repair it.
6. Print the measurements and the toolkit line.
7. Compare your output with the expected output.

### Expected Output

```text
PASS  linear search finds the first duplicate
PASS  linear search: missing item and empty list
PASS  binary search finds every item
PASS  binary search: below, between and above
PASS  binary search: empty and one-item lists
PASS  insertion sort: empty, single, reversed
PASS  insertion sort: duplicates and negatives
PASS  insertion sort keeps its input unchanged
PASS  merge sort: empty, single, reversed
PASS  merge sort: duplicates and negatives
PASS  insertion sort agrees with sorted()
PASS  merge sort agrees with sorted()
PASS  bfs finds a shortest path
PASS  bfs: start is the goal
PASS  bfs: no path to an island
PASS  fib: the first ten numbers
PASS  fib(90) is exact
PASS  min_coins beats greedy
PASS  min_coins: zero and impossible

19 of 19 tests passed

Comparisons to sort 200 numbers
input           insertion   merge
already sorted        199     732
reversed            19900     812
pseudo-random       10279    1289

student 4 is at position 3 of [1, 2, 3, 4, 5]
```

### Hints

1. **Hint 1 (the oracle).** `all(merge_sort(lcg(5, n))[0] == sorted(lcg(5, n)) for n in sizes)` tests many sizes in one line.
2. **Hint 2 (the input unchanged).** Make a list, call the sort, and compare the list with a copy that you made before.
3. **Hint 3 (the order of the table).** Use `list(range(n))` for sorted, `list(range(n, 0, -1))` for reversed and `lcg(7, n)` for pseudo-random data.
4. **Hint 4 (the cache).** `@lru_cache(maxsize=None)` above `def fib(n):` is enough; the base case is `n < 2`.
5. **Hint 5 (the coins).** `best[total - coin] + 1` is the count if the last coin is `coin`; skip entries that are `None`.
6. **Hint 6 (a failing test).** A test that can never fail proves nothing; break one function and see the FAIL.

### Success Criteria

- [ ] At least 18 tests are printed and every one passes.
- [ ] The edge cases (empty, one item, duplicates, missing target, reversed list) are tested.
- [ ] You broke a function on purpose and a test failed.
- [ ] The table shows that insertion sort needs 199 comparisons for sorted input and 19,900 for reversed input.
- [ ] Merge sort needs far fewer comparisons than insertion sort on random input, and about the same order of magnitude in every case.

### Extension Challenge

Add `quick_sort(items)` with a random pivot (use `random.Random(1)` to keep it repeatable) and compare its comparison count with merge sort. Then write `dfs_path(graph, start, goal)` and show a graph on which it finds a longer path than `bfs_path`. Finally, implement the knapsack problem with dynamic programming for the items (weight, value) = (2, 3), (3, 4), (4, 5), (5, 6) and a capacity of 5, and explain why a greedy choice by value alone would be wrong.

## Lesson Recap

- Implement an algorithm from a **specification**: precondition, edge cases, docstring, then tests, then code; compare with an **oracle** such as `sorted`.
- **Binary search** is O(log n) and needs sorted data; **insertion sort** is O(n) to O(n squared), **merge sort** is O(n log n); Python's **Timsort** is the one to use in practice.
- **BFS** with a queue finds shortest paths in unweighted graphs; **DFS** finds what is reachable; both are O(V + E) on an adjacency list.
- **Memoisation** and **dynamic programming** remove repeated work; a **greedy** rule is fast but can be wrong.
- **Counting operations** shows the growth law of an algorithm on every computer.

## Homework / Extension Mission

Choose a problem from your daily life that has a graph in it (a bus network, friends in a class, the rooms of a building) and write it as a dictionary of lists with at least ten places. Write `bfs_path` tests for it: a normal path, a path of length zero and an impossible path. Then pick one algorithm of this lesson, predict its operation counts for a list twice as long and four times as long, run it, and write a paragraph that explains whether the result agreed with the Big O of the algorithm and why.

## Course Project Connection

This lesson adds the **Algorithm Library** to the **course project**, the small Python-based computational application or data exploration project: tested search, sort, graph and memoised functions next to the Student Records Toolkit of Lesson 2. The last line of the output already uses the library on the toolkit's data. In Lesson 4 the toolkit meets a larger data set, and the sorting and searching code is what you will use to rank and look up its records.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: pseudo-code to Python for binary search on the board, with the off-by-one cases; 15 minutes: Example 1, with predictions of the doubling factors before running it; 10 minutes: Example 2, with the campus drawn on the board and BFS rings coloured; 10 minutes: Example 3, the call tree of `fib(5)` drawn by the class; 15 minutes: the project.

**Live demonstrations.** Change `<=` to `<` in `binary_search` and let the class find the failing input (a one-item list). Draw the call tree of `fib(5)` and mark the repeated subtrees. Show a `RecursionError` with `fib_naive(5000)` and explain the limit. Compare the time of the naive and memoised Fibonacci for n = 32.

**Misconceptions.** "Binary search always works." "Insertion sort is always slow." "A cache makes a function faster only the first time." "Greedy is the same as optimal." "More lines means a slower algorithm."

**Assessment of the project.** Run the library and compare the report. Check the tests for edge cases and for a test that was shown to fail, and that `insertion_sort` leaves its input unchanged. Check that the sorted-input count is 199 and the reversed-input count 19,900, and ask why merge sort does not care. Ask students to say, for each function, its precondition and its Big O.

**Reference solution `algorithms.py`** (run with `python3 algorithms.py`):

```python
"""Course project, step 3: the Algorithm Library with its tests."""
from collections import deque
from functools import lru_cache


def lcg(seed, count, modulus=10_000):
    """A tiny pseudo-random generator: the same numbers on every computer."""
    values, x = [], seed
    for _ in range(count):
        x = (x * 1103515245 + 12345) % 2 ** 31
        values.append(x % modulus)
    return values


def linear_search(items, target):
    """Index of the first item equal to target, or -1."""
    for index, item in enumerate(items):
        if item == target:
            return index
    return -1


def binary_search(items, target):
    """Index of target in a SORTED list, or -1."""
    low, high = 0, len(items) - 1
    while low <= high:
        middle = (low + high) // 2
        if items[middle] == target:
            return middle
        if items[middle] < target:
            low = middle + 1
        else:
            high = middle - 1
    return -1


def insertion_sort(items):
    """Return (a new sorted list, the number of comparisons)."""
    items, comparisons = list(items), 0
    for i in range(1, len(items)):
        key, j = items[i], i - 1
        while j >= 0:
            comparisons += 1
            if items[j] <= key:
                break
            items[j + 1] = items[j]
            j -= 1
        items[j + 1] = key
    return items, comparisons


def merge_sort(items):
    """Return (a new sorted list, the number of comparisons)."""
    if len(items) <= 1:
        return list(items), 0
    middle = len(items) // 2
    left, left_count = merge_sort(items[:middle])
    right, right_count = merge_sort(items[middle:])
    merged, i, j, comparisons = [], 0, 0, left_count + right_count
    while i < len(left) and j < len(right):
        comparisons += 1
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged, comparisons


def bfs_path(graph, start, goal):
    """The shortest path (fewest steps) from start to goal, or None."""
    parent = {start: None}
    queue = deque([start])
    while queue:
        place = queue.popleft()
        if place == goal:
            path = []
            while place is not None:
                path.append(place)
                place = parent[place]
            return path[::-1]
        for neighbour in graph[place]:
            if neighbour not in parent:
                parent[neighbour] = place
                queue.append(neighbour)
    return None


@lru_cache(maxsize=None)
def fib(n):
    """The n-th Fibonacci number; every value is computed once."""
    return n if n < 2 else fib(n - 1) + fib(n - 2)


def min_coins(amount, coins):
    """The fewest coins that make the amount, or None if it is impossible."""
    best = [0] + [None] * amount
    for total in range(1, amount + 1):
        options = [best[total - c] + 1 for c in coins if c <= total and best[total - c] is not None]
        best[total] = min(options) if options else None
    return best[amount]


# ---------- the tests ----------
passed = failed = 0


def test(name, condition):
    global passed, failed
    if condition:
        passed += 1
    else:
        failed += 1
    print(f"{'PASS' if condition else 'FAIL'}  {name}")


def keeps_input():
    data = [3, 1, 2]
    insertion_sort(data)
    return data == [3, 1, 2]


CAMPUS = {
    "Gate": ["Library", "Canteen"], "Library": ["Gate", "Admin", "Lab"], "Canteen": ["Gate", "Hall"],
    "Admin": ["Library", "Hall"], "Lab": ["Library", "Workshop"], "Hall": ["Canteen", "Admin", "Workshop"],
    "Workshop": ["Lab", "Hall"], "Garden": [],
}
SIZES = (0, 1, 2, 10, 100, 500)
SHORT_CASES = ([], [7], [5, 4, 3, 2, 1])
ordered = sorted(lcg(3, 50))

test("linear search finds the first duplicate", linear_search([4, 8, 8, 1], 8) == 1)
test("linear search: missing item and empty list", linear_search([4, 8], 5) == -1 and linear_search([], 5) == -1)
test("binary search finds every item", all(ordered[binary_search(ordered, v)] == v for v in ordered))
test("binary search: below, between and above", all(binary_search([2, 4, 6, 8], v) == -1 for v in (1, 5, 9)))
test("binary search: empty and one-item lists", binary_search([], 3) == -1 and binary_search([3], 3) == 0)
test("insertion sort: empty, single, reversed", all(insertion_sort(x)[0] == sorted(x) for x in SHORT_CASES))
test("insertion sort: duplicates and negatives", insertion_sort([3, -1, 3, 0, -1])[0] == [-1, -1, 0, 3, 3])
test("insertion sort keeps its input unchanged", keeps_input())
test("merge sort: empty, single, reversed", all(merge_sort(x)[0] == sorted(x) for x in SHORT_CASES))
test("merge sort: duplicates and negatives", merge_sort([3, -1, 3, 0, -1])[0] == [-1, -1, 0, 3, 3])
test("insertion sort agrees with sorted()", all(insertion_sort(lcg(5, n))[0] == sorted(lcg(5, n)) for n in SIZES))
test("merge sort agrees with sorted()", all(merge_sort(lcg(5, n))[0] == sorted(lcg(5, n)) for n in SIZES))
test("bfs finds a shortest path", bfs_path(CAMPUS, "Gate", "Workshop") == ["Gate", "Library", "Lab", "Workshop"])
test("bfs: start is the goal", bfs_path(CAMPUS, "Lab", "Lab") == ["Lab"])
test("bfs: no path to an island", bfs_path(CAMPUS, "Gate", "Garden") is None)
test("fib: the first ten numbers", [fib(n) for n in range(10)] == [0, 1, 1, 2, 3, 5, 8, 13, 21, 34])
test("fib(90) is exact", fib(90) == 2880067194370816120)
test("min_coins beats greedy", min_coins(6, [1, 3, 4]) == 2 and min_coins(63, [1, 5, 10, 21, 25]) == 3)
test("min_coins: zero and impossible", min_coins(0, [5]) == 0 and min_coins(7, [2, 4]) is None)
print(f"\n{passed} of {passed + failed} tests passed\n")

# ---------- the measurements ----------
n = 200
cases = {"already sorted": list(range(n)), "reversed": list(range(n, 0, -1)), "pseudo-random": lcg(7, n)}
print(f"Comparisons to sort {n} numbers")
print(f"{'input':<15}{'insertion':>10}{'merge':>8}")
for label, data in cases.items():
    print(f"{label:<15}{insertion_sort(data)[1]:>10}{merge_sort(data)[1]:>8}")
ids = [1, 2, 3, 4, 5]
print("\nstudent 4 is at position", binary_search(ids, 4), "of", ids)
```

```output
PASS  linear search finds the first duplicate
PASS  linear search: missing item and empty list
PASS  binary search finds every item
PASS  binary search: below, between and above
PASS  binary search: empty and one-item lists
PASS  insertion sort: empty, single, reversed
PASS  insertion sort: duplicates and negatives
PASS  insertion sort keeps its input unchanged
PASS  merge sort: empty, single, reversed
PASS  merge sort: duplicates and negatives
PASS  insertion sort agrees with sorted()
PASS  merge sort agrees with sorted()
PASS  bfs finds a shortest path
PASS  bfs: start is the goal
PASS  bfs: no path to an island
PASS  fib: the first ten numbers
PASS  fib(90) is exact
PASS  min_coins beats greedy
PASS  min_coins: zero and impossible

19 of 19 tests passed

Comparisons to sort 200 numbers
input           insertion   merge
already sorted        199     732
reversed            19900     812
pseudo-random       10279    1289

student 4 is at position 3 of [1, 2, 3, 4, 5]
```

**Differentiation.** Support: give `lcg`, the searches and the test helper; students write the sorts and the other tests. Stretch: quick sort with a random pivot, `dfs_path`, the knapsack problem, and a comparison of the library's counts with the time of `sorted`.

**Discussion questions (not for the student quiz).** Why is counting comparisons a better way to compare algorithms than timing them? When would you choose insertion sort over merge sort? Why does `lru_cache` turn an exponential function into a linear one?
