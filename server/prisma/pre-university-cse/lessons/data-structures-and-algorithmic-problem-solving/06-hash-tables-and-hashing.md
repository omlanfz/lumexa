# Lumexa Mission Log: Data Structures & Algorithmic Problem-Solving

**Course/Path:** Data Structures & Algorithmic Problem-Solving
**Lesson:** 06 of 08
**Title:** Hash Tables and Hashing
**Duration:** 60 minutes
**Difficulty:** Advanced
**Technology:** C++ (g++)

---

## Mission Brief

When you type a username on a website, the site decides in a flash whether that name is already taken, even among millions of accounts. Binary search on a sorted list needs about twenty steps for a million names. A hash table needs, on average, *one*. It does not search at all: it **computes where the item must be** and looks only there.

That is the magic and the catch of hashing. The computation is a **hash function** that turns any key into a number; two different keys can land on the same spot (a **collision**), and the whole art of a hash table lies in making collisions rare and cheap. In this lesson you build a hash table with *chaining*, compare good and bad hash functions with real numbers, and add the **Hash Table Lab** to the Algorithm Explorer.

## Learning Objectives

1. Explain how a hash table finds a key by computing an index, and why lookups are O(1) on average.
2. Write simple hash functions for numbers and strings, and judge their quality.
3. Explain collisions and resolve them with chaining; describe open addressing (linear probing).
4. Define the load factor and explain why and when a table is resized.
5. Use `unordered_map` and `unordered_set` and choose them over `map` and `vector` correctly.
6. Build a chaining hash table and measure collisions for different sizes and hash functions.

## Prerequisites

- Lesson 4: linked lists (the chains); Lesson 1: Big O and average versus worst case.
- Lesson 2: searching, and Lesson 5: the binary search tree as the alternative.

## Concept Explanation

### The idea: compute the address

An array finds element *i* instantly. A **hash table** gives *any* key the same power by converting the key into an index with a **hash function**: `index = hash(key) % table_size`. To store a key you put it in that slot; to look it up you compute the same index and look only there. The result is an **associative container**: a collection of key-value pairs (a dictionary) with O(1) average insert, lookup and delete.

| Structure | Lookup | Insert | Keeps order? |
|---|---|---|---|
| Unsorted vector | O(n) | O(1) | no |
| Sorted vector | O(log n) | O(n) | yes |
| Balanced BST (`map`) | O(log n) | O(log n) | yes |
| Hash table (`unordered_map`) | O(1) average, O(n) worst | O(1) average | no |

### Hash functions

A good hash function is **deterministic** (the same key always gives the same number), **fast**, and spreads keys **uniformly** over the table. Bad hash functions cluster keys:

- **First letter**: all words beginning with "s" collide.
- **Sum of the letters**: "stop" and "pots" collide, and totals clump in a narrow range.
- **A polynomial hash**, such as **djb2**, mixes position and value: `h = h * 33 + c` for each character, starting at 5381.

```cpp
uint32_t djb2(const string& s)
{
    uint32_t h = 5381;
    for (unsigned char c : s) {
        h = h * 33 + c;           // unsigned arithmetic wraps around safely
    }
    return h;
}
```

A **prime** table size spreads the remainders better than a size with many factors (such as a power of two) when the hash function is mediocre.

### Collisions and chaining

By the pigeonhole principle, if there are more keys than slots (or even just by chance, see the birthday paradox) two keys will land in the same slot: a **collision**. **Chaining** stores a small list in every slot: the table is an array of **buckets**, each holding all keys with that index. Insert appends to the bucket; lookup scans only that bucket. If the hash function is good, each bucket stays short.

### Open addressing

**Open addressing** keeps every key inside the array itself. On a collision it **probes** for another free slot: with **linear probing** it tries the next index, then the next, and so on (wrapping around). Lookup follows the same probe sequence until it finds the key or an empty slot. It uses less memory and is cache-friendly, but long runs of occupied slots (*clustering*) slow it down when the table is nearly full, and deleting an item needs special care.

### Load factor and resizing

The **load factor** α = n / m (items divided by slots) tells how crowded the table is. With chaining, the average bucket has α items, so a lookup costs about 1 + α comparisons. Implementations therefore **resize** (typically double the size and **rehash** every key) when α passes a threshold such as 0.75. A single resize is O(n) but happens rarely, so the *amortised* cost of an insert stays O(1). In the worst case, if every key lands in one bucket, a hash table degrades to a linked list: O(n). That is why hash quality matters, and why hash functions for security (Course 6) are designed so that collisions cannot be found on purpose.

### Hashing in C++

`std::unordered_map<K, V>` and `std::unordered_set<K>` are hash tables with chaining. They offer `insert`, `find`, `count`, `erase` and `operator[]`, and report `bucket_count()` and `load_factor()`. Use them for **counting** (words, votes), **removing duplicates**, **caching** results and **fast membership tests**. Use `map` when you need the keys in order.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Hash function** | A function that turns a key into a number. |
| **Hash table** | A table that stores each key at an index computed from the key. |
| **Bucket / slot** | One position of the table. |
| **Collision** | Two different keys that map to the same slot. |
| **Chaining** | Resolving collisions by keeping a list of keys in every bucket. |
| **Open addressing** | Resolving collisions by probing for another free slot inside the array. |
| **Load factor** | The number of items divided by the number of slots. |
| **Rehashing** | Moving every key into a bigger table when the load factor gets too high. |
| **Uniform hashing** | Spreading keys evenly over all the slots. |
| **Amortised cost** | The average cost per operation over a long sequence of operations. |

## Worked Examples

### Example 1: Three hash functions compared

```cpp
#include <cstdint>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

uint32_t first_letter(const string& s) { return static_cast<unsigned char>(s[0]); }

uint32_t letter_sum(const string& s)
{
    uint32_t h = 0;
    for (unsigned char c : s) {
        h += c;
    }
    return h;
}

uint32_t djb2(const string& s)
{
    uint32_t h = 5381;
    for (unsigned char c : s) {
        h = h * 33 + c;
    }
    return h;
}

void distribution(const char* name, uint32_t (*hash)(const string&), const vector<string>& words, int size)
{
    vector<int> counts(size, 0);
    for (const string& w : words) {
        counts[hash(w) % size]++;
    }
    cout << name << ":";
    for (int c : counts) {
        cout << ' ' << c;
    }
    cout << '\n';
}

int main()
{
    vector<string> words = {"stack", "queue", "tree", "graph", "heap", "sort", "search", "array", "string", "hash", "list", "table"};
    cout << "items per bucket (7 buckets, 12 words)\n";
    distribution("first letter", first_letter, words, 7);
    distribution("letter sum  ", letter_sum, words, 7);
    distribution("djb2        ", djb2, words, 7);
    return 0;
}
```

```output
items per bucket (7 buckets, 12 words)
first letter: 0 1 0 5 2 1 3
letter sum  : 2 2 2 2 1 3 0
djb2        : 4 1 1 2 2 0 2
```

1. Twelve words are spread over seven buckets by each function. A perfect spread would be about 1 or 2 words per bucket.
2. The first-letter hash piles five words into bucket 3: "stack", "sort", "search" and "string" all start with "s", and "list" happens to have the same remainder. That is the clustering you would expect.
3. The letter sum and djb2 spread the words better, and djb2 usually does best because each character's *position* changes the result.
4. Counting the items per bucket is the simplest way to measure a hash function: the flatter the counts, the better the hash.

### Example 2: A chaining hash table

```cpp
#include <cstdint>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

uint32_t djb2(const string& s)
{
    uint32_t h = 5381;
    for (unsigned char c : s) {
        h = h * 33 + c;
    }
    return h;
}

class HashTable {
private:
    vector<vector<string>> buckets_;

public:
    explicit HashTable(size_t size) : buckets_(size) {}

    void insert(const string& key)
    {
        vector<string>& bucket = buckets_[djb2(key) % buckets_.size()];
        for (const string& k : bucket) {
            if (k == key) {
                return;
            }
        }
        bucket.push_back(key);
    }

    bool contains(const string& key) const
    {
        for (const string& k : buckets_[djb2(key) % buckets_.size()]) {
            if (k == key) {
                return true;
            }
        }
        return false;
    }

    void print() const
    {
        for (size_t i = 0; i < buckets_.size(); i++) {
            cout << i << ":";
            for (const string& k : buckets_[i]) {
                cout << ' ' << k;
            }
            cout << '\n';
        }
    }
};

int main()
{
    HashTable table(5);
    for (const char* w : {"stack", "queue", "tree", "graph", "heap", "sort"}) {
        table.insert(w);
    }
    table.insert("tree");
    table.print();
    cout << "contains graph: " << table.contains("graph") << ", contains list: " << table.contains("list") << '\n';
    return 0;
}
```

```output
0: heap
1:
2: queue tree sort
3: stack graph
4:
contains graph: 1, contains list: 0
```

1. The table is a vector of buckets, and each bucket is a vector of keys: that is chaining.
2. `insert` computes the bucket from the hash, checks that the key is not there already, and appends it. The second insert of "tree" changes nothing.
3. `contains` computes the same bucket and scans only that bucket, so it looks at a few keys instead of all six.
4. Some buckets hold several words and others none: with only 5 buckets for 6 keys, collisions are certain.

### Example 3: `unordered_map` in practice

```cpp
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

int main()
{
    vector<string> votes = {"anika", "rafi", "anika", "nila", "rafi", "anika", "nila", "anika"};
    unordered_map<string, int> tally;
    for (const string& v : votes) {
        tally[v]++;
    }
    cout << "anika " << tally["anika"] << ", rafi " << tally["rafi"] << ", nila " << tally["nila"] << '\n';
    cout << "distinct candidates: " << tally.size() << '\n';
    cout << "contains 'zed': " << tally.count("zed") << '\n';
    return 0;
}
```

```output
anika 4, rafi 2, nila 2
distinct candidates: 3
contains 'zed': 0
```

1. `tally[v]++` creates a missing entry with the value 0 and then adds 1: counting with a hash table takes one line.
2. Each lookup and update is O(1) on average, so counting *n* votes is O(n) in total, instead of O(n log n) with a sorted `map` or O(n²) with a vector.
3. `count("zed")` tests membership without creating an entry, unlike `tally["zed"]`, which would add one.
4. `unordered_map` does not keep the keys in any useful order, so printing it gives an unspecified order. Use `map` if you need sorted output.

## Common Mistakes and Misconceptions

- **Believing hash tables are always O(1).** It is O(1) *on average* with a good hash and a low load factor. A bad hash gives O(n).
- **Forgetting that order is lost.** Iterating an `unordered_map` gives an arbitrary order. Use `map` or sort the keys when order matters.
- **Using `operator[]` just to look something up.** It *inserts* a default value for a missing key. Use `find` or `count`.
- **Choosing a poor hash function.** First letters, string lengths and plain sums cluster keys. Use a polynomial hash for strings.
- **Ignoring the load factor.** A crowded table is slow. Choose a size at least as large as the number of items, or let the library rehash.
- **Using a modifiable key.** If a key changes after it is stored, its hash changes and it can no longer be found.
- **Mixing up hashing for tables with hashing for security.** A table hash only needs to spread keys; a cryptographic hash must also resist attack (Course 6).
- **Hashing floating-point numbers or objects carelessly.** Two equal-looking values must hash equally, so define hash and equality together.

## Guided Hands-On Activity

**Measure the spread.** Work with your teacher.

1. Type Example 1 and run it. Add the word "set" and "tuple" and a fourth function that returns the word length. Which function is worst, and why?
2. Change the number of buckets in Example 1 from 7 to 8, then to 10. What happens to the sum hash, and why does a prime size help?
3. Type Example 2. Draw the table on paper with the words in their buckets, then add three more words and watch for collisions.
4. In Example 2, add a function that returns the length of the longest bucket and print it.
5. Type Example 3 and print `tally.bucket_count()` and `tally.load_factor()` before and after adding 100 more different names. What do you notice?
6. Use `unordered_set<int>` to count the *distinct* numbers in `{4, 8, 15, 16, 23, 42, 4, 8, 15}` in a single pass.

## Lesson Project: Algorithm Explorer: Hash Table Lab

### Objective

Add the **Hash Table Lab** to the Algorithm Explorer: build a chaining hash table that takes its hash function and size as parameters, insert 40 words into it for three different hash functions and four table sizes, and measure collisions, the longest chain and the average number of comparisons per lookup.

### Requirements

- Three hash functions with the signature `uint32_t f(const string&)`: `first_letter`, `letter_sum` and `djb2`.
- A class `ChainedHashTable` constructed with a size and a hash function, with `insert`, `comparisons_to_find` (the number of keys inspected to find a stored key), `longest_chain` and `collisions` (the number of keys that share a bucket with an earlier key, which is `items - non-empty buckets`).
- The 40 words of the reference solution, which deliberately start with similar letters (ten of them with "s"), inserted in the same order every time.
- A report for every hash function and for the table sizes 8, 16, 31 and 64, with the load factor, the collisions, the longest chain and the average comparisons per lookup (over all 40 words, with two decimals).
- Every lookup must find its key; the program checks this and prints `all keys found: yes`.

### Instructions

1. Write the three hash functions and test each on three words by hand.
2. Write `ChainedHashTable` with a vector of vector of strings.
3. Write `collisions` and `longest_chain` by looking at the bucket sizes.
4. Write `comparisons_to_find` by scanning the bucket and counting the keys inspected, including the match.
5. Write the report loop over the three functions and four sizes with `setw`.
6. Add the check that every key is found, and print the final line.
7. Compare with the expected output, and write a comment: which combination is best, and which is worst, with numbers?

### Expected Output

```text
first letter (40 words)
  size    load  collisions  longest   avg compares
     8    5.00          33       17           5.53
    16    2.50          31       17           5.08
    31    1.29          29       10           3.27
    64    0.62          29       10           3.27

letter sum (40 words)
  size    load  collisions  longest   avg compares
     8    5.00          32       10           3.55
    16    2.50          25        5           2.10
    31    1.29          16        4           1.55
    64    0.62           7        3           1.25

djb2 (40 words)
  size    load  collisions  longest   avg compares
     8    5.00          32       10           3.55
    16    2.50          25        5           2.10
    31    1.29          20        4           1.73
    64    0.62           9        4           1.32

all keys found: yes
```

### Hints

1. **Hint 1 (the table type).** `vector<vector<string>> buckets_;` constructed with `buckets_(size)`.
2. **Hint 2 (collisions).** `collisions = items - number of buckets with at least one key`.
3. **Hint 3 (average comparisons).** Total comparisons over all stored words divided by the number of words, printed with `fixed << setprecision(2)`.
4. **Hint 4 (passing a hash function).** `using HashFn = uint32_t (*)(const string&);` and a constructor parameter of that type.
5. **Hint 5 (unsigned arithmetic).** Keep the hash in `uint32_t` and take `% size` at the end so the result never depends on the platform.
6. **Hint 6 (a printing mess).** Set `fixed` and `setprecision(2)` once, before the loops, and use `setw` for every column.

### Success Criteria

- [ ] The table takes its hash function and size as parameters and has no global state.
- [ ] For `first_letter` the longest chain is clearly worse than for `letter_sum` and `djb2` (17 against 10 or less at size 8, and still 10 at size 64), and the numbers show it.
- [ ] Growing the table lowers the collisions and the average comparisons for `djb2` (from 32 collisions at size 8 to 9 at size 64).
- [ ] Every one of the 12 runs finds all 40 keys (`all keys found: yes`).
- [ ] The comment names the best and the worst combination with numbers.
- [ ] The code compiles with `-Wall -Wextra` and no warnings, and the output matches the expected output.

### Extension Challenge

Implement **linear probing** as a second table class (`ProbingHashTable`) with a fixed size of 64, and compare the average probes per lookup at load factors 0.25, 0.5 and 0.9. Then add **rehashing** to the chaining table: when the load factor exceeds 0.75, double the size and reinsert all keys, and count how many times it happens for 1,000 insertions.

## Lesson Recap

- A **hash table** computes `hash(key) % size` to find the slot directly, so lookups are O(1) on average.
- A good hash function is deterministic, fast and uniform; bad ones (first letter, plain sums) cluster keys.
- **Collisions** are unavoidable; **chaining** keeps a list per bucket, **open addressing** probes for another slot.
- The **load factor** n/m controls the speed; tables resize and rehash when it grows too large, which is O(1) amortised.
- Use `unordered_map` and `unordered_set` for counting, duplicates and fast membership; use `map` when order matters.

## Homework / Extension Mission

Use `unordered_map` to solve three problems and give the Big O of each: (1) the **first non-repeating character** of a string, (2) **two numbers that add up to a target** in an array (the *two-sum* problem, in one pass), and (3) the **most frequent word** in a paragraph. Then find, in your Hash Table Lab, a set of 8 words that all collide with `first_letter` and explain in two sentences why an attacker who knows your hash function could slow your table down on purpose.

## Course Project Connection

This lesson adds the **Hash Table Lab** to the **Algorithm Explorer**, reusing the vector-of-vectors idea from the linked lists of Lesson 4 as chains. The measurements (collisions, chain length, comparisons) follow the style of the counters from Lessons 1 to 3. In Lesson 7 a hash table will map node names to graph nodes, and in Course 6 you will meet hashing again as a tool for security: passwords and checksums.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the library-card analogy (the call number is the hash). 10 minutes: hash functions, with Example 1 live. 10 minutes: collisions, chaining and load factor (Example 2 drawn on the board). 30 minutes: the project, as a guided build.

**Live demonstrations.** Hash the students' names with the letter sum on a 10-slot board and let them see the collisions. Run Example 3 with 100,000 keys and show `bucket_count()` growing. Use the interactive hash-table visual to switch hash functions and methods. In the lab's output, point out that for the table sizes 8 and 16 the `letter_sum` and `djb2` rows are identical: the multiplier 33 leaves the low bits unchanged (33 is 1 more than 32), so the multiplication does not mix anything in for those sizes, and a prime size such as 31 avoids the problem.

**Misconceptions.** "A hash table is always O(1)." "Collisions mean the table is broken." "A bigger table always fixes a bad hash function" (clustering stays).

**Assessment of the project.** Check the collision count definition, the average comparisons, the unsigned arithmetic and the comment. Ask each student to predict what happens to the longest chain for `first_letter` when the size grows from 8 to 64.

**Reference solution `hash_lab.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra hash_lab.cpp -o hash_lab`):

```cpp
// Algorithm Explorer, Lesson 6: Hash Table Lab.
#include <algorithm>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

using HashFn = uint32_t (*)(const string&);

uint32_t first_letter(const string& s) { return static_cast<unsigned char>(s[0]); }

uint32_t letter_sum(const string& s)
{
    uint32_t h = 0;
    for (unsigned char c : s) {
        h += c;
    }
    return h;
}

uint32_t djb2(const string& s)
{
    uint32_t h = 5381;
    for (unsigned char c : s) {
        h = h * 33 + c;
    }
    return h;
}

// Chaining: insert O(1), lookup O(chain length).
class ChainedHashTable {
private:
    vector<vector<string>> buckets_;
    HashFn hash_;
    size_t items_ = 0;

public:
    ChainedHashTable(size_t size, HashFn hash) : buckets_(size), hash_(hash) {}

    void insert(const string& key)
    {
        buckets_[hash_(key) % buckets_.size()].push_back(key);
        items_++;
    }

    int comparisons_to_find(const string& key) const
    {
        int count = 0;
        for (const string& k : buckets_[hash_(key) % buckets_.size()]) {
            count++;
            if (k == key) {
                return count;
            }
        }
        return -count;
    }

    size_t longest_chain() const
    {
        size_t longest = 0;
        for (const auto& b : buckets_) {
            longest = max(longest, b.size());
        }
        return longest;
    }

    size_t collisions() const
    {
        size_t used = 0;
        for (const auto& b : buckets_) {
            if (!b.empty()) {
                used++;
            }
        }
        return items_ - used;
    }
};

int main()
{
    const vector<string> words = {
        "sort", "search", "stack", "string", "set", "struct", "switch", "static", "shift", "swap",
        "class", "compile", "code", "cache", "call", "char", "const", "print", "pointer", "pop",
        "push", "pipe", "tree", "table", "type", "token", "loop", "list", "map", "memory",
        "merge", "heap", "hash", "function", "file", "float", "array", "algorithm", "binary", "queue"};
    struct Choice {
        const char* name;
        HashFn fn;
    };
    const Choice choices[] = {{"first letter", first_letter}, {"letter sum", letter_sum}, {"djb2", djb2}};
    bool all_found = true;

    cout << fixed << setprecision(2);
    for (const Choice& c : choices) {
        cout << c.name << " (40 words)\n";
        cout << setw(6) << "size" << setw(8) << "load" << setw(12) << "collisions" << setw(9) << "longest" << setw(15) << "avg compares" << '\n';
        for (size_t size : {8, 16, 31, 64}) {
            ChainedHashTable table(size, c.fn);
            for (const string& w : words) {
                table.insert(w);
            }
            long long total = 0;
            for (const string& w : words) {
                int n = table.comparisons_to_find(w);
                if (n < 0) {
                    all_found = false;
                } else {
                    total += n;
                }
            }
            cout << setw(6) << size << setw(8) << static_cast<double>(words.size()) / static_cast<double>(size) << setw(12)
                 << table.collisions() << setw(9) << table.longest_chain() << setw(15)
                 << static_cast<double>(total) / static_cast<double>(words.size()) << '\n';
        }
        cout << '\n';
    }
    cout << "all keys found: " << (all_found ? "yes" : "no") << '\n';
    return 0;
}
```

```output
first letter (40 words)
  size    load  collisions  longest   avg compares
     8    5.00          33       17           5.53
    16    2.50          31       17           5.08
    31    1.29          29       10           3.27
    64    0.62          29       10           3.27

letter sum (40 words)
  size    load  collisions  longest   avg compares
     8    5.00          32       10           3.55
    16    2.50          25        5           2.10
    31    1.29          16        4           1.55
    64    0.62           7        3           1.25

djb2 (40 words)
  size    load  collisions  longest   avg compares
     8    5.00          32       10           3.55
    16    2.50          25        5           2.10
    31    1.29          20        4           1.73
    64    0.62           9        4           1.32

all keys found: yes
```

**Differentiation.** Support: provide the hash functions and the class skeleton with `insert`, and let students write the measurements and the report. Stretch: add linear probing, rehashing, and a hash of your own design compared on the same words.

**Discussion questions (not for the student quiz).** Why does a good hash function look "random" even though it is deterministic? Why do some languages randomise their string hash on every program start?
