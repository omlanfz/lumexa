# Lumexa Mission Log: Data Structures & Algorithmic Problem-Solving

**Course/Path:** Data Structures & Algorithmic Problem-Solving
**Lesson:** 05 of 08
**Title:** Recursion, Trees, Binary Search Trees and Heaps
**Duration:** 60 minutes
**Difficulty:** Advanced
**Technology:** C++ (g++)

---

## Mission Brief

Your computer's folders form a tree: a folder contains files and other folders, which contain more files and folders. To count every file you do not need to know how deep the nesting goes: you write one rule, "count the files here, then do the same for each folder inside", and let it repeat. That rule that uses itself is **recursion**, and the shape it works on is a **tree**.

Trees give us two of the most important data structures in computing. The **binary search tree** keeps data sorted so that you can search, insert and delete in O(log n); and the **heap** always puts the most important item at the top, which makes priority queues and a fourth O(n log n) sort possible. In this lesson you master recursion, build both trees, and add them, with their step counters, to the Algorithm Explorer.

## Learning Objectives

1. Write recursive functions with a base case and a recursive case, and trace the call stack.
2. Explain why naive recursive Fibonacci is exponential and how remembering results (memoisation) fixes it.
3. Use tree vocabulary and perform pre-order, in-order, post-order and level-order traversals.
4. Implement a binary search tree with insertion, search and traversal, and explain why its height decides its speed.
5. Explain the heap property, the array layout of a heap, sift-up, sift-down and heap sort.
6. Build the Trees and Heaps part of the Algorithm Explorer and measure call counts, tree heights and comparisons.

## Prerequisites

- Lesson 4: nodes, pointers and the stack; Lesson 1: Big O; Lesson 3: sorting by comparisons.
- Course 1: functions and pointers.

## Concept Explanation

### Recursion

A **recursive** function calls itself on a smaller version of the same problem. Every recursive function needs two parts: a **base case** that is solved directly and stops the recursion, and a **recursive case** that moves *towards* the base case.

```cpp
long long factorial(int n)
{
    if (n <= 1) {
        return 1;                       // base case
    }
    return n * factorial(n - 1);        // smaller problem: n - 1
}
```

Each call waits for the call it made, so the pending calls pile up on the **call stack** (Lesson 4) and return one by one, in reverse. Forget the base case, or never move towards it, and the stack fills up (a **stack overflow**). Recursion costs O(depth) stack space.

### When recursion explodes

The naive Fibonacci function calls itself twice, and the two calls repeat each other's work:

```cpp
long long fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
```

The number of calls roughly multiplies by 1.6 every time *n* grows by one: **exponential**. The cure is **memoisation**: store each result the first time you compute it and reuse it. Fibonacci then needs only about 2n calls: O(n). You will meet the same idea again, as dynamic programming, in Lesson 8.

### Trees

A **tree** is a hierarchy of nodes. The top node is the **root**; each node has zero or more **children**; a node with none is a **leaf**; the parent, ancestors and **subtrees** follow naturally. The **depth** of a node is the number of edges from the root, and the **height** of the tree is its greatest depth. A **binary tree** allows at most two children per node, a **left** and a **right** one.

**Traversals** visit every node in a systematic order:

| Traversal | Order | Typical use |
|---|---|---|
| Pre-order | node, left, right | copy a tree, print a hierarchy |
| In-order | left, node, right | list a search tree in sorted order |
| Post-order | left, right, node | delete a tree, evaluate an expression |
| Level-order | row by row, using a queue | find the shortest path from the root |

The first three are natural to write recursively. Level-order uses the **queue** from Lesson 4.

### Binary search trees

A **binary search tree (BST)** keeps a rule at every node: *everything in the left subtree is smaller, everything in the right subtree is larger*. To search, start at the root and go left or right, discarding a whole subtree at each step, which is binary search on a tree. Insertion follows the same path and attaches the new node where the search ends. An in-order traversal lists the keys in **sorted order**.

The cost of every operation is **O(h)**, where *h* is the height. If the keys arrive in random order, the tree stays bushy and *h* is about log₂ n. But if the keys arrive already **sorted**, every key goes to the right of the last, and the tree degenerates into a linked list of height *n*: O(n). Self-balancing trees (AVL, red-black) repair this automatically, and `std::map` and `std::set` are balanced search trees.

### Heaps and priority queues

A **binary heap** is a *complete* binary tree (every row full except possibly the last, filled from the left) with a **heap property**: in a **max-heap** every parent is at least as large as its children, so the largest item is always at the **root**. Because the tree is complete, it is stored in a plain **array**, with no pointers: the children of the node at index *i* are at **2i + 1** and **2i + 2**, and its parent is at **(i − 1) / 2**.

- **push**: add the item at the end and **sift up** (swap with its parent while it is larger): O(log n).
- **pop**: take the root, move the last item to the root and **sift down** (swap with the larger child while it is smaller): O(log n).
- **Heap sort**: push everything, then pop repeatedly: O(n log n), in place when done inside the array.

A heap implements a **priority queue**, in which the next item out is always the most important, not the oldest. The standard library provides `std::priority_queue`.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Recursion** | A function that solves a problem by calling itself on a smaller version of it. |
| **Base case** | The simple case that a recursive function solves directly to stop the recursion. |
| **Memoisation** | Storing computed results so that they are never computed twice. |
| **Tree / root / leaf** | A hierarchy of nodes; the top node; a node without children. |
| **Height** | The length of the longest path from the root down to a leaf. |
| **Traversal** | Visiting every node of a tree in a systematic order. |
| **Binary search tree** | A binary tree where left keys are smaller and right keys are larger than each node. |
| **Heap property** | Every parent is at least as large as (max-heap) its children. |
| **Sift up / sift down** | Swapping an item with its parent or child until the heap property is restored. |
| **Priority queue** | A collection that always removes the most important item first. |

## Worked Examples

### Example 1: Recursion and call counts

```cpp
#include <iostream>
#include <vector>
using namespace std;

long long calls = 0;

long long fib(int n)
{
    calls++;
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

long long fib_memo(int n, vector<long long>& memo)
{
    calls++;
    if (n < 2) {
        return n;
    }
    if (memo[n] != -1) {
        return memo[n];
    }
    memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo);
    return memo[n];
}

int main()
{
    for (int n : {10, 20, 30}) {
        calls = 0;
        long long a = fib(n);
        long long naive_calls = calls;
        calls = 0;
        vector<long long> memo(n + 1, -1);
        long long b = fib_memo(n, memo);
        cout << "fib(" << n << ") = " << a << " (same: " << (a == b) << "), naive calls " << naive_calls
             << ", memoised calls " << calls << '\n';
    }
    return 0;
}
```

```output
fib(10) = 55 (same: 1), naive calls 177, memoised calls 19
fib(20) = 6765 (same: 1), naive calls 21891, memoised calls 39
fib(30) = 832040 (same: 1), naive calls 2692537, memoised calls 59
```

1. The naive version needs 177 calls for *n* = 10, about 22 thousand for 20 and 2.7 million for 30: it multiplies by about 120 every time *n* grows by 10. That is exponential.
2. The memoised version stores each answer in `memo` and only needs 19, 39 and 59 calls: about 2n − 1, which is linear.
3. Both return the same value. Memoisation changes the cost, not the result.
4. Counting calls with a global counter is the recursive equivalent of the step counters of Lesson 1.

### Example 2: A binary search tree

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

struct TreeNode {
    int key;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* insert(TreeNode* node, int key)
{
    if (node == nullptr) {
        return new TreeNode{key, nullptr, nullptr};
    }
    if (key < node->key) {
        node->left = insert(node->left, key);
    } else if (key > node->key) {
        node->right = insert(node->right, key);
    }
    return node;
}

int height(const TreeNode* node)
{
    if (node == nullptr) {
        return -1;
    }
    return 1 + max(height(node->left), height(node->right));
}

void in_order(const TreeNode* node, vector<int>& out)
{
    if (node == nullptr) {
        return;
    }
    in_order(node->left, out);
    out.push_back(node->key);
    in_order(node->right, out);
}

int comparisons_to_find(const TreeNode* node, int key)
{
    int count = 0;
    while (node != nullptr) {
        count++;
        if (key == node->key) {
            return count;
        }
        node = key < node->key ? node->left : node->right;
    }
    return count;
}

void destroy(TreeNode* node)
{
    if (node != nullptr) {
        destroy(node->left);
        destroy(node->right);
        delete node;
    }
}

int main()
{
    TreeNode* tree = nullptr;
    for (int k : {50, 30, 70, 20, 40, 60, 80}) {
        tree = insert(tree, k);
    }
    vector<int> sorted;
    in_order(tree, sorted);
    cout << "in-order:";
    for (int k : sorted) {
        cout << ' ' << k;
    }
    cout << "\nheight " << height(tree) << ", comparisons to find 60: " << comparisons_to_find(tree, 60) << '\n';
    destroy(tree);

    TreeNode* chain = nullptr;
    for (int k = 1; k <= 7; k++) {
        chain = insert(chain, k);
    }
    cout << "sorted input: height " << height(chain) << ", comparisons to find 7: " << comparisons_to_find(chain, 7) << '\n';
    destroy(chain);
    return 0;
}
```

```output
in-order: 20 30 40 50 60 70 80
height 2, comparisons to find 60: 3
sorted input: height 6, comparisons to find 7: 7
```

1. `insert` is recursive: it goes left or right until it meets a null link and attaches the new node there. Each recursive call returns the (possibly new) subtree.
2. The in-order traversal prints the keys in sorted order, which shows that the left-smaller, right-larger rule holds everywhere.
3. The balanced tree of seven nodes has height 2, and finding 60 takes 3 comparisons.
4. The same seven keys inserted in sorted order make a chain of height 6, and finding 7 takes 7 comparisons. The shape of the tree, not the number of keys, decides the cost.

### Example 3: A max-heap in an array

```cpp
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

class MaxHeap {
private:
    vector<int> a_;

    void sift_up(size_t i)
    {
        while (i > 0 && a_[(i - 1) / 2] < a_[i]) {
            swap(a_[(i - 1) / 2], a_[i]);
            i = (i - 1) / 2;
        }
    }
    void sift_down(size_t i)
    {
        for (;;) {
            size_t largest = i;
            size_t l = 2 * i + 1;
            size_t r = 2 * i + 2;
            if (l < a_.size() && a_[l] > a_[largest]) {
                largest = l;
            }
            if (r < a_.size() && a_[r] > a_[largest]) {
                largest = r;
            }
            if (largest == i) {
                return;
            }
            swap(a_[i], a_[largest]);
            i = largest;
        }
    }

public:
    void push(int v)
    {
        a_.push_back(v);
        sift_up(a_.size() - 1);
    }
    int pop()
    {
        int top = a_[0];
        a_[0] = a_.back();
        a_.pop_back();
        if (!a_.empty()) {
            sift_down(0);
        }
        return top;
    }
    bool empty() const { return a_.empty(); }
    void print() const
    {
        for (int x : a_) {
            cout << x << ' ';
        }
        cout << '\n';
    }
};

int main()
{
    MaxHeap h;
    for (int v : {40, 70, 20, 90, 60, 50, 80}) {
        h.push(v);
    }
    cout << "heap array: ";
    h.print();
    cout << "popped in order:";
    while (!h.empty()) {
        cout << ' ' << h.pop();
    }
    cout << '\n';
    return 0;
}
```

```output
heap array: 90 70 80 40 60 20 50
popped in order: 90 80 70 60 50 40 20
```

1. The heap is just a `vector`: the parent of index *i* is `(i - 1) / 2` and its children are `2i + 1` and `2i + 2`.
2. After the seven pushes the largest value, 90, is at index 0, but the rest of the array is only *partly* ordered: a heap is not sorted, it only guarantees the parent-is-larger rule.
3. Each `pop` removes the root, puts the last item there and sifts it down: O(log n).
4. Popping everything returns the values from largest to smallest, so pushing then popping is a heap sort: n pushes and n pops of O(log n) each give O(n log n).

## Common Mistakes and Misconceptions

- **Forgetting the base case, or not moving towards it.** `factorial(n)` that calls `factorial(n)` never ends and overflows the stack.
- **Using naive recursion where results repeat.** Fibonacci and similar problems need memoisation or a loop.
- **Thinking a BST is always fast.** Sorted input makes it a chain with O(n) operations. Balanced trees fix this.
- **Confusing the BST rule with the heap rule.** A BST orders *left < node < right*; a heap only orders *parent ≥ children* and says nothing about left versus right.
- **Believing a heap is sorted.** Only the root is guaranteed to be the maximum. The array is not in order.
- **Forgetting to free tree nodes.** Use a post-order traversal in a `destroy` function, or smart pointers.
- **Off-by-one in heap indices.** In a 0-based array the children of *i* are `2i + 1` and `2i + 2`; with 1-based arrays they are `2i` and `2i + 1`.
- **Deleting nodes from a BST carelessly.** A node with two children must be replaced by its in-order successor; a leaf or one-child node is simpler.

## Guided Hands-On Activity

**Grow a tree, and a heap.** Work with your teacher.

1. Type Example 1. Add `n = 40` for the memoised version only, and explain why you must not try it for the naive version.
2. On paper, draw the BST made by inserting 8, 3, 10, 1, 6, 14, 4, 7, 13 in that order. Then list its pre-order, in-order and post-order traversals.
3. Type Example 2 and add `pre_order` and `post_order` functions. Check them against your paper answers.
4. Insert 7, 6, 5, 4, 3, 2, 1 into the BST. What is its height, and what does that show?
5. Type Example 3 and draw the heap array as a tree. Check that every parent is larger than its children.
6. Change the heap to a **min-heap** by reversing the two comparisons, and pop the values. What order do they come out in?

## Lesson Project: Algorithm Explorer: Trees and Heaps

### Objective

Add the **Trees and Heaps** section to the Algorithm Explorer: count the calls of recursive Fibonacci with and without memoisation, build a binary search tree from random and from sorted data and compare their heights and search costs, and implement heap sort with comparison counting.

### Requirements

- `fib_naive` and `fib_memo` with a global call counter, run for *n* = 10, 20 and 30, printing the value and both call counts.
- A BST (`insert` that returns the new subtree, `height`, `comparisons_to_find`, `destroy`) built twice from 31 keys: one set of pseudo-random keys and one sorted set. Print the height and the *total* comparisons needed to find every key.
- A `MaxHeap` with `push` and `pop` that counts every comparison, and `heap_sort(vector<int>)` that returns the values in ascending order (pop gives descending order: collect them backwards).
- The program verifies `heap_sort` with `is_sorted` and prints the comparison count for 31 random keys.
- Every function with a loop or recursion has a comment with its Big O.

### Instructions

1. Write the two Fibonacci functions and the table for *n* = 10, 20, 30.
2. Write the BST functions. Test with the keys 50, 30, 70, 20, 40, 60, 80 first.
3. Generate 31 pseudo-random unique keys: `x = (x * 1103515245u + 12345u) & 0x7fffffffu;` and keep `x % 1000`, skipping repeats.
4. Build the random tree and the sorted tree. For each, compute the height and the total comparisons over all keys.
5. Write `MaxHeap` with a comparison counter, and `heap_sort` using it.
6. Print the three sections with `setw`, compile with `-Wall -Wextra -fsanitize=address,undefined` and check for leaks.
7. Compare with the expected output and write a comment: which tree is better and by how much?

### Expected Output

```text
Fibonacci
   n    fib(n)   naive calls  memoised calls
  10        55           177              19
  20      6765         21891              39
  30    832040       2692537              59

Binary search tree with 31 keys
data      height   comparisons
random         7           157
sorted        30           496

Heap sort of the 31 random keys
sorted correctly: yes
comparisons: 215
```

### Hints

1. **Hint 1 (unique keys).** Keep a `vector<int>` of keys so far and test `find(keys.begin(), keys.end(), k) == keys.end()` before adding.
2. **Hint 2 (total comparisons).** Add `comparisons_to_find(tree, k)` for every key `k` in the list.
3. **Hint 3 (heap comparisons).** Increase the counter for every comparison between two array elements inside `sift_up` and `sift_down`.
4. **Hint 4 (the sort).** Push all the values, then pop `n` times, writing from the end of the result vector backwards.
5. **Hint 5 (a leak).** Call `destroy(tree)` after you finish with each tree, and use a post-order traversal in it.
6. **Hint 6 (a very deep chain).** For 31 keys recursion depth is fine; do not run the sorted case with 100,000 keys.

### Success Criteria

- [ ] The Fibonacci table shows the same value for both versions and the memoised count is linear (about 2n − 1).
- [ ] The random tree is much lower than the sorted tree (the sorted tree has height 30), and the total comparisons confirm it.
- [ ] `heap_sort` returns a sorted vector (verified by `is_sorted`) and reports its comparisons.
- [ ] No memory leak is reported by the sanitizer.
- [ ] Every function has a Big O comment, and the closing comment explains the result in numbers.
- [ ] The code compiles with `-Wall -Wextra` with no warnings, and the output matches the expected output.

### Extension Challenge

Add a **self-balancing step** to the BST: after inserting the sorted keys, rebuild the tree from the sorted vector by always choosing the middle key as the root (a recursive function with `lo` and `hi`). Compare the new height and comparisons with the degenerate tree. Then add a level-order traversal using the queue from Lesson 4.

## Lesson Recap

- **Recursion** needs a base case and progress towards it; the call stack holds the pending calls, and results that repeat should be memoised.
- A **tree** is a hierarchy; traversals visit nodes in pre-, in-, post- or level-order, and an in-order walk of a BST gives sorted keys.
- A **BST** costs O(height): O(log n) when balanced, O(n) when it degenerates into a chain.
- A **heap** is a complete tree stored in an array with the parent-is-larger rule; push and pop cost O(log n), and heap sort costs O(n log n).
- Choose a structure by the shape of the questions: sorted lookups (BST), most important first (heap), simple lists (vector).

## Homework / Extension Mission

Add a function that checks whether a given binary tree is a valid BST (pass the allowed minimum and maximum down the recursion), and test it on a tree you break on purpose. Then use `std::priority_queue` (a max-heap) to solve this task: *given a list of exam marks, print the five highest, without sorting the whole list*. Describe the Big O of your approach in terms of the number of marks *n* and the number of results *k*.

## Course Project Connection

This lesson adds the **Trees and Heaps** part to the **Algorithm Explorer**: recursion call counts, the BST with its heights and the heap sort with its comparison counter. The linked nodes of Lesson 4 became tree nodes, and the heap gives your explorer a fourth O(n log n) sort. In Lesson 6 the same node idea becomes the chains of a hash table, and in Lesson 7 trees generalise to graphs.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: recursion and the call stack (act out factorial with students as stack frames). 10 minutes: Fibonacci explosion and memoisation (Example 1). 15 minutes: trees, BSTs and traversals on the board (Example 2). 25 minutes: the heap (Example 3) and the project as a guided build.

**Live demonstrations.** Draw the call tree of `fib(5)` and circle the repeated work. Build a BST from the class's birthdays, then from sorted ones. Show the heap array and tree side by side and animate sift-up and sift-down with cards.

**Misconceptions.** "Recursion is always slower than loops" (it costs stack space and sometimes repeats work; it is the natural tool for trees). "A heap is a sorted array." "A BST search is always O(log n)."

**Assessment of the project.** Verify the base cases, the call counts (about 2n − 1 for memoised Fibonacci), the sorted-tree height of 30 versus the random tree height, the use of post-order for `destroy` and a clean sanitizer run. Ask each student to explain why sorted input is the worst case.

**Reference solution `trees_heaps.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra -fsanitize=address,undefined trees_heaps.cpp -o trees_heaps`):

```cpp
// Algorithm Explorer, Lesson 5: Trees and Heaps.
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

long long calls = 0;

// O(2^n) time: the two recursive calls repeat each other's work.
long long fib_naive(int n)
{
    calls++;
    return n < 2 ? n : fib_naive(n - 1) + fib_naive(n - 2);
}

// O(n) time and O(n) space: each value is computed once.
long long fib_memo(int n, vector<long long>& memo)
{
    calls++;
    if (n < 2) {
        return n;
    }
    if (memo[n] != -1) {
        return memo[n];
    }
    memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo);
    return memo[n];
}

struct TreeNode {
    int key;
    TreeNode* left;
    TreeNode* right;
};

// O(h) time: one path from the root.
TreeNode* insert(TreeNode* node, int key)
{
    if (node == nullptr) {
        return new TreeNode{key, nullptr, nullptr};
    }
    if (key < node->key) {
        node->left = insert(node->left, key);
    } else if (key > node->key) {
        node->right = insert(node->right, key);
    }
    return node;
}

// O(n) time: visits every node.
int height(const TreeNode* node)
{
    if (node == nullptr) {
        return -1;
    }
    return 1 + max(height(node->left), height(node->right));
}

// O(h) time.
int comparisons_to_find(const TreeNode* node, int key)
{
    int count = 0;
    while (node != nullptr) {
        count++;
        if (key == node->key) {
            return count;
        }
        node = key < node->key ? node->left : node->right;
    }
    return count;
}

// O(n) time: post-order, children before the node.
void destroy(TreeNode* node)
{
    if (node != nullptr) {
        destroy(node->left);
        destroy(node->right);
        delete node;
    }
}

// O(log n) per push and per pop.
class MaxHeap {
private:
    vector<int> a_;

    void sift_up(size_t i)
    {
        while (i > 0) {
            comparisons++;
            if (a_[(i - 1) / 2] >= a_[i]) {
                break;
            }
            swap(a_[(i - 1) / 2], a_[i]);
            i = (i - 1) / 2;
        }
    }
    void sift_down(size_t i)
    {
        for (;;) {
            size_t largest = i;
            size_t l = 2 * i + 1;
            size_t r = 2 * i + 2;
            if (l < a_.size()) {
                comparisons++;
                if (a_[l] > a_[largest]) {
                    largest = l;
                }
            }
            if (r < a_.size()) {
                comparisons++;
                if (a_[r] > a_[largest]) {
                    largest = r;
                }
            }
            if (largest == i) {
                return;
            }
            swap(a_[i], a_[largest]);
            i = largest;
        }
    }

public:
    static long long comparisons;
    void push(int v)
    {
        a_.push_back(v);
        sift_up(a_.size() - 1);
    }
    int pop()
    {
        int top = a_[0];
        a_[0] = a_.back();
        a_.pop_back();
        if (!a_.empty()) {
            sift_down(0);
        }
        return top;
    }
    bool empty() const { return a_.empty(); }
};

long long MaxHeap::comparisons = 0;

// O(n log n) time.
vector<int> heap_sort(const vector<int>& values)
{
    MaxHeap heap;
    for (int v : values) {
        heap.push(v);
    }
    vector<int> out(values.size());
    for (size_t i = out.size(); i > 0; i--) {
        out[i - 1] = heap.pop();
    }
    return out;
}

vector<int> random_keys(int n)
{
    vector<int> keys;
    unsigned int x = 2024u;
    while (static_cast<int>(keys.size()) < n) {
        x = (x * 1103515245u + 12345u) & 0x7fffffffu;
        int k = static_cast<int>(x % 1000u);
        if (find(keys.begin(), keys.end(), k) == keys.end()) {
            keys.push_back(k);
        }
    }
    return keys;
}

void report_tree(const char* name, const vector<int>& keys)
{
    TreeNode* tree = nullptr;
    for (int k : keys) {
        tree = insert(tree, k);
    }
    long long total = 0;
    for (int k : keys) {
        total += comparisons_to_find(tree, k);
    }
    cout << left << setw(8) << name << right << setw(8) << height(tree) << setw(14) << total << '\n';
    destroy(tree);
}

int main()
{
    cout << "Fibonacci\n";
    cout << setw(4) << "n" << setw(10) << "fib(n)" << setw(14) << "naive calls" << setw(16) << "memoised calls" << '\n';
    for (int n : {10, 20, 30}) {
        calls = 0;
        long long value = fib_naive(n);
        long long naive_calls = calls;
        calls = 0;
        vector<long long> memo(n + 1, -1);
        fib_memo(n, memo);
        cout << setw(4) << n << setw(10) << value << setw(14) << naive_calls << setw(16) << calls << '\n';
    }

    cout << "\nBinary search tree with 31 keys\n";
    cout << left << setw(8) << "data" << right << setw(8) << "height" << setw(14) << "comparisons" << '\n';
    vector<int> shuffled = random_keys(31);
    vector<int> ascending = shuffled;
    sort(ascending.begin(), ascending.end());
    report_tree("random", shuffled);
    report_tree("sorted", ascending);

    cout << "\nHeap sort of the 31 random keys\n";
    vector<int> result = heap_sort(shuffled);
    cout << "sorted correctly: " << (is_sorted(result.begin(), result.end()) ? "yes" : "no") << '\n';
    cout << "comparisons: " << MaxHeap::comparisons << '\n';
    return 0;
}
```

```output
Fibonacci
   n    fib(n)   naive calls  memoised calls
  10        55           177              19
  20      6765         21891              39
  30    832040       2692537              59

Binary search tree with 31 keys
data      height   comparisons
random         7           157
sorted        30           496

Heap sort of the 31 random keys
sorted correctly: yes
comparisons: 215
```

**Differentiation.** Support: provide the Fibonacci functions, `insert`, `height` and `destroy`, and let students write the heap and the experiments. Stretch: add the rebuilt balanced tree, level-order traversal with the queue, and a min-heap `priority_queue` with a comparator.

**Discussion questions (not for the student quiz).** Why can a heap sort be done in place but a merge sort cannot? Why is `std::map` implemented as a balanced tree rather than a plain BST?
