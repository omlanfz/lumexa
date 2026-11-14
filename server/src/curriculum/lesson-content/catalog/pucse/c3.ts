// FILE PATH: server/src/curriculum/lesson-content/catalog/pucse/c3.ts
//
// Pre-University CSE · Course 3 · Data Structures & Algorithmic Problem-Solving — visuals and the Mini Quiz of every lesson.
// Keys are lineage keys: "<course-slug>/<lesson position>". Every "what does this print?" question carries
// the real program (checked by running it in the Pre-University CSE spec when the toolchain is installed).

import { registerVisualCatalog } from '../../visual-catalog';
import { registerQuizCatalog } from '../../quiz-catalog';
import { algoSteps, arrays, cards, checklist, compare, CPP, flow, graph, grid, hashTable, lab, linkedLists, mcq, stackQueue, table, trace, treeSteps, V } from './helpers';

const M = 'data-structures-and-algorithmic-problem-solving';

registerVisualCatalog({
  [`${M}/1`]: [
    V(
      'chart',
      'growth-curves',
      'Big O notation',
      'A line chart of five growth curves for n from 1 to 8. O(log n) stays almost flat, O(n) rises steadily, O(n log n) rises faster, O(n squared) climbs steeply to 64 and O(2 to the n) shoots up to 256.',
      'Only the shape matters. Even for tiny n, exponential growth leaves the other curves far behind.',
      {
        kind: 'line',
        xLabel: 'Input size n',
        yLabel: 'Steps',
        categories: ['1', '2', '3', '4', '5', '6', '7', '8'],
        series: [
          { name: 'O(log n)', values: [0, 1, 1.58, 2, 2.32, 2.58, 2.81, 3] },
          { name: 'O(n)', values: [1, 2, 3, 4, 5, 6, 7, 8] },
          { name: 'O(n log n)', values: [0, 2, 4.75, 8, 11.6, 15.5, 19.7, 24] },
          { name: 'O(n²)', values: [1, 4, 9, 16, 25, 36, 49, 64] },
          { name: 'O(2ⁿ)', values: [2, 4, 8, 16, 32, 64, 128, 256] },
        ],
      },
      { at: 'end' },
    ),
    cards(
      'loop-patterns',
      'Analysing code',
      'Four cards for four loop patterns. One loop over n items is O(n). A loop inside a loop is O(n squared). A loop that halves its variable is O(log n). A loop of n passes that contains a halving loop is O(n log n).',
      'Read the complexity from the shape of the loops.',
      [
        { title: 'One loop', badge: 'O(n)', tone: 'info', bullets: ['for (i = 0; i < n; i++)', 'n passes', 'Doubling n doubles the work'] },
        { title: 'Loop in a loop', badge: 'O(n²)', tone: 'bad', bullets: ['Both loops run n times', 'n × n passes', 'Doubling n quadruples the work'] },
        { title: 'Halving loop', badge: 'O(log n)', tone: 'good', bullets: ['while (n > 1) n /= 2;', 'About log₂ n passes', 'Doubling n adds one step'] },
        { title: 'Halving loop inside a loop', badge: 'O(n log n)', tone: 'accent', bullets: ['n passes of a log n loop', 'n × log n steps', 'A little more than double'] },
      ],
      { at: 'end' },
    ),
    trace(
      'halving-trace',
      'Analysing code',
      'A step-through of the halving loop for n equal to 16. n becomes 8, 4, 2 and 1 and steps counts up to 4, because 16 can be halved four times. The loop ends when n is no longer greater than 1.',
      'Halving 16 takes 4 steps: log₂ 16 = 4. Double n to 32 and you need just one more.',
      ['int steps = 0;', 'while (n > 1) {', '    n = n / 2;', '    steps++;', '}'],
      [
        { line: 1, vars: { n: 16, steps: 0 }, note: 'Start with n = 16 and no steps counted.' },
        { line: 3, vars: { n: 8, steps: 0 }, note: 'The first pass halves n: 16 becomes 8.' },
        { line: 4, vars: { n: 8, steps: 1 }, note: 'One step counted.' },
        { line: 3, vars: { n: 4, steps: 1 }, note: 'Second pass: 8 becomes 4.' },
        { line: 4, vars: { n: 4, steps: 2 }, note: 'Two steps.' },
        { line: 3, vars: { n: 2, steps: 2 }, note: 'Third pass: 4 becomes 2.' },
        { line: 4, vars: { n: 2, steps: 3 }, note: 'Three steps.' },
        { line: 3, vars: { n: 1, steps: 3 }, note: 'Fourth pass: 2 becomes 1.' },
        { line: 4, vars: { n: 1, steps: 4 }, note: 'Four steps.' },
        { line: 2, vars: { n: 1, steps: 4 }, note: 'n > 1 is now false, so the loop ends after 4 steps.' },
      ],
      { at: 'end' },
    ),
    table(
      'growth-table',
      'Why it matters',
      'A table of the number of steps for five growth classes at four input sizes. At n equal to 1 million, O(log n) needs 20 steps, O(n log n) needs about 20 million and O(n squared) needs a million million. O(2 to the n) is impossible long before that.',
      'The same input, five very different bills. This is why the choice of algorithm matters more than the speed of the computer.',
      ['n', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'],
      [
        ['10', '3', '10', '33', '100', '1,024'],
        ['100', '7', '100', '664', '10,000', 'about 10³⁰'],
        ['1,000', '10', '1,000', '9,966', '1,000,000', 'about 10³⁰¹'],
        ['1,000,000', '20', '1,000,000', '19,931,569', '10¹²', 'impossible'],
      ],
      { at: 'end', highlights: [{ row: 1, col: 5, tone: 'bad', note: 'Already hopeless' }, { row: 3, col: 1, tone: 'good', note: 'Only 20 steps' }] },
    ),
    lab(
      'counting-lab',
      'Example 1',
      'cpp',
      'A C++ editor with the Example 1 program that counts the steps of a linear, a nested and a halving loop for n equal to 10, 20 and 40, with its expected output.',
      'Add a fourth function with three nested loops and print its count: what happens when n doubles?',
      `#include <iostream>
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
             << ", halving " << halving_steps(n) << '\\n';
    }
    return 0;
}`,
      { expected: 'n=10: linear 10, nested 100, halving 3\nn=20: linear 20, nested 400, halving 4\nn=40: linear 40, nested 1600, halving 5', filename: 'counting.cpp', at: 'end' },
    ),
  ],
  [`${M}/2`]: [
    arrays(
      'array-access',
      'Arrays and vectors',
      'An array of five marks stored in consecutive memory addresses, four bytes apart: 0x1000, 0x1004, 0x1008, 0x100c and 0x1010. A pointer shows that marks[2] is found by arithmetic: the start address plus 2 times 4 bytes, so it takes one step whatever the size of the array.',
      'Element i lives at start + i × size (here 0x1000 + 2 × 4 = 0x1008), so reading any element takes one step: O(1).',
      [
        { label: 'marks (int)', cells: [72, 65, 90, 41, 58], pointers: [{ index: 2, label: 'marks[2]', tone: 'warn' }], highlight: [{ from: 2, to: 2, tone: 'warn' }] },
        { label: 'address', cells: ['0x1000', '0x1004', '0x1008', '0x100c', '0x1010'], hideIndex: true },
      ],
      { at: 'end' },
    ),
    algoSteps(
      'binary-search-steps',
      'Binary search',
      'Three frames of a binary search for 47 in a sorted list of 15 numbers. First the middle, index 7 with value 34, is too small, so the left half is discarded. Then the middle of the remaining range, index 11 with value 58, is too big, so the right part is discarded. Finally the middle of the last range, index 9, holds 47 and the search succeeds after three comparisons.',
      'Each look discards half of what is left. Fifteen items need only three looks here, and a million items need about twenty.',
      [
        { array: [3, 8, 12, 15, 21, 26, 30, 34, 41, 47, 52, 58, 63, 70, 77], marks: { 0: 'range', 1: 'range', 2: 'range', 3: 'range', 4: 'range', 5: 'range', 6: 'range', 7: 'current', 8: 'range', 9: 'range', 10: 'range', 11: 'range', 12: 'range', 13: 'range', 14: 'range' }, counters: { comparisons: 1 }, note: 'low = 0, high = 14, mid = 7: the value 34 is smaller than 47, so the target must be to the right.' },
        { array: [3, 8, 12, 15, 21, 26, 30, 34, 41, 47, 52, 58, 63, 70, 77], marks: { 8: 'range', 9: 'range', 10: 'range', 11: 'current', 12: 'range', 13: 'range', 14: 'range' }, counters: { comparisons: 2 }, note: 'low = 8, high = 14, mid = 11: the value 58 is bigger than 47, so the target must be to the left.' },
        { array: [3, 8, 12, 15, 21, 26, 30, 34, 41, 47, 52, 58, 63, 70, 77], marks: { 8: 'range', 9: 'found', 10: 'range' }, counters: { comparisons: 3 }, note: 'low = 8, high = 10, mid = 9: the value is 47. Found at index 9 after 3 comparisons.' },
      ],
      { at: 'end' },
    ),
    V(
      'chart',
      'comparisons-chart',
      'Comparing them',
      'A line chart of the worst-case number of comparisons for lists of 2 to 256 items. Linear search follows the list size, rising from 2 to 256. Binary search stays low, rising only from 2 to 9.',
      'Double the list and linear search doubles its work; binary search adds one comparison.',
      {
        kind: 'line',
        xLabel: 'List size n',
        yLabel: 'Worst-case comparisons',
        categories: ['2', '4', '8', '16', '32', '64', '128', '256'],
        series: [
          { name: 'Linear search', values: [2, 4, 8, 16, 32, 64, 128, 256] },
          { name: 'Binary search', values: [2, 3, 4, 5, 6, 7, 8, 9] },
        ],
      },
      { at: 'end' },
    ),
    checklist(
      'search-test-cases',
      'Testing a search',
      'A checklist of seven test cases for a search function: an empty list, a one-element list where the target is present, a one-element list where it is missing, the first element, the last element, a value smaller than all and a value larger than all.',
      'Run these seven before you trust a search.',
      ['Empty list: returns -1 without crashing', 'One element, target present', 'One element, target missing', 'Target is the first element', 'Target is the last element', 'Target smaller than every element', 'Target larger than every element'],
      { at: 'end' },
    ),
    lab(
      'binary-trace-lab',
      'Example 2',
      'cpp',
      'A C++ editor with the Example 2 program that traces a binary search for 47 and for 10 in a sorted list of 15 numbers, with its expected output.',
      'Search for the first value (3) and the last (77): how many steps does each take?',
      `#include <iostream>
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
        cout << "  step " << steps << ": low=" << low << " high=" << high << " mid=" << mid << " value=" << v[mid] << '\\n';
        if (v[mid] == target) {
            cout << "  found at index " << mid << '\\n';
            return mid;
        }
        if (v[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    cout << "  not found\\n";
    return -1;
}

int main()
{
    vector<int> v = {3, 8, 12, 15, 21, 26, 30, 34, 41, 47, 52, 58, 63, 70, 77};
    cout << "search 47:\\n";
    binary_search_trace(v, 47);
    cout << "search 10:\\n";
    binary_search_trace(v, 10);
    return 0;
}`,
      { expected: 'search 47:\n  step 1: low=0 high=14 mid=7 value=34\n  step 2: low=8 high=14 mid=11 value=58\n  step 3: low=8 high=10 mid=9 value=47\n  found at index 9\nsearch 10:\n  step 1: low=0 high=14 mid=7 value=34\n  step 2: low=0 high=6 mid=3 value=15\n  step 3: low=0 high=2 mid=1 value=8\n  step 4: low=2 high=2 mid=2 value=12\n  not found', filename: 'binary_trace.cpp', at: 'end' },
    ),
  ],
  [`${M}/3`]: [
    algoSteps(
      'bubble-pass',
      'Bubble sort',
      'Eight frames of the first pass of bubble sort on 5, 2, 9, 1 and 7. Each pair of neighbours is compared; 5 and 2 are swapped, 5 and 9 are left, 9 and 1 are swapped, and 9 and 7 are swapped. At the end of the pass the largest value, 9, has bubbled to the end.',
      'One pass of bubble sort: neighbours are compared and swapped when out of order, so the largest value bubbles to the end.',
      [
        { array: [5, 2, 9, 1, 7], marks: { 0: 'compare', 1: 'compare' }, counters: { comparisons: 1, swaps: 0 }, note: 'Compare 5 and 2: they are out of order.' },
        { array: [2, 5, 9, 1, 7], marks: { 0: 'swap', 1: 'swap' }, counters: { comparisons: 1, swaps: 1 }, note: 'Swap them: 2 5 9 1 7.' },
        { array: [2, 5, 9, 1, 7], marks: { 1: 'compare', 2: 'compare' }, counters: { comparisons: 2, swaps: 1 }, note: 'Compare 5 and 9: already in order, so no swap.' },
        { array: [2, 5, 9, 1, 7], marks: { 2: 'compare', 3: 'compare' }, counters: { comparisons: 3, swaps: 1 }, note: 'Compare 9 and 1: out of order.' },
        { array: [2, 5, 1, 9, 7], marks: { 2: 'swap', 3: 'swap' }, counters: { comparisons: 3, swaps: 2 }, note: 'Swap them: 9 moves one place to the right.' },
        { array: [2, 5, 1, 9, 7], marks: { 3: 'compare', 4: 'compare' }, counters: { comparisons: 4, swaps: 2 }, note: 'Compare 9 and 7: out of order.' },
        { array: [2, 5, 1, 7, 9], marks: { 3: 'swap', 4: 'swap' }, counters: { comparisons: 4, swaps: 3 }, note: 'Swap them: 9 reaches the end.' },
        { array: [2, 5, 1, 7, 9], marks: { 4: 'sorted' }, counters: { comparisons: 4, swaps: 3 }, note: 'End of pass 1: the largest value is in its final place. The next pass can stop one place earlier.' },
      ],
      { at: 'end' },
    ),
    treeSteps(
      'merge-sort-tree',
      'Divide and conquer: merge sort',
      'Six frames of merge sort on eight numbers. The list is split in half again and again until every piece has one element, then the pieces are merged pairwise into sorted lists of two, four and finally eight numbers.',
      'Divide until the pieces are trivial, then merge sorted pieces. There are log₂ 8 = 3 levels of splitting and 3 levels of merging.',
      (() => {
        const data = [5, 2, 9, 1, 7, 3, 8, 4];
        type N = { label: string; tone?: string; children?: N[] };
        const build = (lo: number, hi: number, depth: number, split: number, merged: number): N => {
          const part = data.slice(lo, hi + 1);
          const isMerged = depth >= merged;
          const shown = isMerged ? [...part].sort((a, b) => a - b) : part;
          const node: N = { label: `[${shown.join(' ')}]`, ...(isMerged && part.length > 1 ? { tone: 'good' } : {}) };
          if (depth < split && hi > lo) {
            const mid = lo + Math.floor((hi - lo) / 2);
            node.children = [build(lo, mid, depth + 1, split, merged), build(mid + 1, hi, depth + 1, split, merged)];
          }
          return node;
        };
        return [
          { root: build(0, 7, 0, 1, 99), note: 'Divide: split the list in half.' },
          { root: build(0, 7, 0, 2, 99), note: 'Keep dividing each half.' },
          { root: build(0, 7, 0, 3, 99), note: 'Until every piece has one element. A list of one is already sorted.' },
          { root: build(0, 7, 0, 3, 2), note: 'Merge pairs: compare the fronts and take the smaller. Now four sorted lists of two.' },
          { root: build(0, 7, 0, 3, 1), note: 'Merge again: two sorted lists of four.' },
          { root: build(0, 7, 0, 3, 0), note: 'Last merge: one sorted list of eight. Every level did O(n) work, and there are log n levels.' },
        ];
      })(),
      { at: 'end' },
    ),
    algoSteps(
      'quick-partition',
      'Quick sort',
      'Seven frames of one partition step of quick sort on 8, 3, 7, 1, 9 and 4, with the last element, 4, as the pivot. Elements smaller than 4 are swapped to the front of the list: 3 and then 1. At the end the pivot is swapped into index 2, its final position, with 3 and 1 on its left and 8, 9 and 7 on its right.',
      'Partition: everything smaller than the pivot is gathered at the front, and the pivot is swapped into its final place.',
      [
        { array: [8, 3, 7, 1, 9, 4], marks: { 5: 'pivot' }, counters: { comparisons: 0 }, note: 'The pivot is the last element, 4. Everything smaller will be collected at the front.' },
        { array: [8, 3, 7, 1, 9, 4], marks: { 5: 'pivot', 0: 'compare' }, counters: { comparisons: 1 }, note: '8 is not smaller than 4: leave it where it is.' },
        { array: [3, 8, 7, 1, 9, 4], marks: { 5: 'pivot', 0: 'swap', 1: 'swap' }, counters: { comparisons: 2 }, note: '3 is smaller than 4: swap it into the front zone.' },
        { array: [3, 8, 7, 1, 9, 4], marks: { 5: 'pivot', 2: 'compare' }, counters: { comparisons: 3 }, note: '7 is not smaller: leave it.' },
        { array: [3, 1, 7, 8, 9, 4], marks: { 5: 'pivot', 1: 'swap', 3: 'swap' }, counters: { comparisons: 4 }, note: '1 is smaller: swap it into the front zone.' },
        { array: [3, 1, 7, 8, 9, 4], marks: { 5: 'pivot', 4: 'compare' }, counters: { comparisons: 5 }, note: '9 is not smaller. The scan is finished.' },
        { array: [3, 1, 4, 8, 9, 7], marks: { 2: 'sorted' }, counters: { comparisons: 5 }, note: 'Swap the pivot into index 2. It is in its final place: 3 and 1 are on its left, 8, 9 and 7 on its right. Now sort each side.' },
      ],
      { at: 'end' },
    ),
    cards(
      'five-sorts-at-a-glance',
      'Choosing and using sorts',
      'Five cards, one for each sorting algorithm with its key idea and complexity. Bubble sort swaps neighbours. Selection sort picks the smallest. Insertion sort inserts into a sorted part. Merge sort divides and merges in O(n log n). Quick sort partitions around a pivot and is fast on average.',
      'Five different ideas for the same job.',
      [
        { title: 'Bubble', badge: 'O(n²)', tone: 'warn', bullets: ['Swap neighbours that are out of order', 'O(n) if already sorted', 'Stable, in place'] },
        { title: 'Selection', badge: 'O(n²)', tone: 'warn', bullets: ['Pick the smallest, swap it to the front', 'Fewest swaps (n − 1)', 'Not stable'] },
        { title: 'Insertion', badge: 'O(n²)', tone: 'info', bullets: ['Slide each item into the sorted part', 'Great for small or nearly sorted lists', 'Stable, in place'] },
        { title: 'Merge', badge: 'O(n log n)', tone: 'good', bullets: ['Divide, sort halves, merge', 'Always O(n log n)', 'Needs O(n) extra space'] },
        { title: 'Quick', badge: 'O(n log n) avg', tone: 'accent', bullets: ['Partition around a pivot', 'Worst case O(n²) with a bad pivot', 'In place, not stable'] },
      ],
      { at: 'start' },
    ),
    lab(
      'quick-sort-lab',
      'Example 3',
      'cpp',
      'A C++ editor with the Example 3 program that sorts a mixed list and an already sorted list with quick sort and counts the comparisons, with its expected output.',
      'Choose the middle element as the pivot (swap it with the last element first) and run the sorted list again.',
      `#include <iostream>
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
    cout << '\\n';

    comparisons = 0;
    vector<int> sorted = {1, 2, 3, 4, 5, 6, 7, 8};
    quick_sort(sorted, 0, static_cast<int>(sorted.size()) - 1);
    cout << "already sorted: comparisons " << comparisons << " (n(n-1)/2 = 28)\\n";
    return 0;
}`,
      { expected: 'mixed data: comparisons 18, result: 1 2 3 4 6 7 8 9\nalready sorted: comparisons 28 (n(n-1)/2 = 28)', filename: 'quick_sort.cpp', at: 'end' },
    ),
  ],
  [`${M}/4`]: [
    linkedLists(
      'singly-linked-list',
      'Linked lists',
      'A singly linked list with four nodes holding 5, 10, 20 and 30. A head label points to the first node and a tail label to the last. Each node points to the next one, and the last node points to nothing.',
      'A chain of nodes. The list is just a pointer to the first node; each node knows only the next one.',
      [{ label: 'list', kind: 'singly', nodes: [5, 10, 20, 30], head: 'head', tail: 'tail' }],
      { at: 'end' },
    ),
    linkedLists(
      'push-front-lists',
      'Linked lists',
      'Two lists. Before, the list holds 10 and 20 with head pointing to 10. After push_front of 5, the list holds 5, 10 and 20 and head points to the new node 5, whose next pointer leads to the old first node.',
      'push_front changes two pointers and moves nothing: O(1), however long the list is.',
      [
        { label: 'before', kind: 'singly', nodes: [10, 20], head: 'head' },
        { label: 'after push_front(5)', kind: 'singly', nodes: [5, 10, 20], head: 'head' },
      ],
      { at: 'end' },
    ),
    stackQueue(
      'stack-operations',
      'Stacks',
      'A stack over five steps. 1, 2 and 3 are pushed in that order, so 3 is on top. Then pop returns 3 and pop returns 2: the last item in is the first item out.',
      'Push adds on top; pop removes from the top. Last in, first out.',
      'stack',
      [
        { items: ['1'], op: 'push(1)', note: '1 goes onto the empty stack.' },
        { items: ['1', '2'], op: 'push(2)', note: '2 goes on top of 1.' },
        { items: ['1', '2', '3'], op: 'push(3)', note: '3 is now on top.' },
        { items: ['1', '2'], op: 'pop() returns 3', note: 'The top item comes off first: last in, first out.' },
        { items: ['1'], op: 'pop() returns 2', note: 'Then the next one down.' },
      ],
      { at: 'end' },
    ),
    stackQueue(
      'queue-operations',
      'Queues',
      'A queue over six steps. A, B and C are enqueued at the back. Dequeue returns A, the front. D is enqueued at the back, and dequeue returns B. The first item in is the first item out.',
      'Enqueue adds at the back; dequeue removes from the front. First in, first out.',
      'queue',
      [
        { items: ['A'], op: 'enqueue(A)', note: 'A joins the empty queue.' },
        { items: ['A', 'B'], op: 'enqueue(B)', note: 'B joins at the back.' },
        { items: ['A', 'B', 'C'], op: 'enqueue(C)', note: 'C joins at the back.' },
        { items: ['B', 'C'], op: 'dequeue() returns A', note: 'The front item leaves first: first in, first out.' },
        { items: ['B', 'C', 'D'], op: 'enqueue(D)', note: 'D joins at the back.' },
        { items: ['C', 'D'], op: 'dequeue() returns B', note: 'B was next in line.' },
      ],
      { at: 'end' },
    ),
    stackQueue(
      'bracket-balanced',
      'Applications: balanced brackets and a step log',
      'A stack while checking the text {[()]}. The three opening brackets are pushed. Each closing bracket pops the top and finds the matching opener. The stack is empty at the end, so the brackets are balanced.',
      'Opening brackets are pushed; each closing bracket must match the top. Empty at the end means balanced.',
      'stack',
      [
        { items: ['{'], op: 'read {  push', note: 'An opener: push it.' },
        { items: ['{', '['], op: 'read [  push', note: 'Another opener: push.' },
        { items: ['{', '[', '('], op: 'read (  push', note: 'And another.' },
        { items: ['{', '['], op: 'read )  pop (', note: 'A closer: the top is ( and ) matches it.' },
        { items: ['{'], op: 'read ]  pop [', note: 'The top is [ and ] matches.' },
        { items: [], op: 'read }  pop {', note: 'The top is { and } matches. The stack is empty: balanced.' },
      ],
      { at: 'end' },
    ),
    stackQueue(
      'bracket-mismatch',
      'Applications: balanced brackets and a step log',
      'A stack while checking the text {[(])}. The three openers are pushed. When the closing square bracket arrives, the top of the stack is a round bracket, which needs a round closer, so the checker reports a mismatch.',
      'The closer must match the most recent opener. Here ] arrives while ( is on top: mismatch.',
      'stack',
      [
        { items: ['{'], op: 'read {  push', note: 'An opener: push it.' },
        { items: ['{', '['], op: 'read [  push', note: 'Another opener.' },
        { items: ['{', '[', '('], op: 'read (  push', note: 'And another.' },
        { items: ['{', '[', '('], op: 'read ]  top is (', note: 'The top is ( but ] needs [ on top: mismatch! The text is not balanced.' },
      ],
      { at: 'end' },
    ),
    lab(
      'stack-lab',
      'Example 2',
      'cpp',
      'A C++ editor with the Example 2 program, a stack built on a linked list that pushes six words and pops them in reverse order, with its expected output.',
      'Push the letters of a word one at a time instead, and pop them to print the word backwards.',
      `#include <iostream>
#include <string>
using namespace std;

class Stack {
private:
    struct Node {
        string value;
        Node* next;
    };
    Node* top_ = nullptr;

public:
    Stack() = default;
    Stack(const Stack&) = delete;
    Stack& operator=(const Stack&) = delete;
    ~Stack()
    {
        while (top_ != nullptr) {
            Node* next = top_->next;
            delete top_;
            top_ = next;
        }
    }
    void push(const string& v) { top_ = new Node{v, top_}; }
    bool pop(string& out)
    {
        if (top_ == nullptr) {
            return false;
        }
        Node* gone = top_;
        out = gone->value;
        top_ = gone->next;
        delete gone;
        return true;
    }
    bool empty() const { return top_ == nullptr; }
};

int main()
{
    Stack s;
    for (const string& word : {"stacks", "are", "last", "in", "first", "out"}) {
        s.push(word);
    }
    string w;
    while (s.pop(w)) {
        cout << w << ' ';
    }
    cout << '\\n';
    cout << "pop from empty stack: " << s.pop(w) << '\\n';
    return 0;
}`,
      { expected: 'out first in last are stacks\npop from empty stack: 0', filename: 'stack.cpp', at: 'end' },
    ),
  ],
  [`${M}/5`]: [
    stackQueue(
      'call-stack-factorial',
      'Recursion',
      'The call stack while factorial of 3 runs. main calls factorial(3), which calls factorial(2), which calls factorial(1). The base case returns 1. Then the calls return one by one: factorial(2) returns 2, factorial(3) returns 6, and control goes back to main.',
      'Each call waits on the stack for the call it made. The stack grows on the way down and unwinds on the way back.',
      'call-stack',
      [
        { items: ['main', 'factorial(3)'], op: 'call factorial(3)', note: 'main asks for 3!. The call must wait for factorial(2).' },
        { items: ['main', 'factorial(3)', 'factorial(2)'], op: 'call factorial(2)', note: '3 × factorial(2): a smaller problem.' },
        { items: ['main', 'factorial(3)', 'factorial(2)', 'factorial(1)'], op: 'call factorial(1)', note: 'The base case: n <= 1 returns 1 without another call.' },
        { items: ['main', 'factorial(3)', 'factorial(2)'], op: 'factorial(1) returns 1', note: 'factorial(2) can now finish: 2 × 1 = 2.' },
        { items: ['main', 'factorial(3)'], op: 'factorial(2) returns 2', note: 'factorial(3) can now finish: 3 × 2 = 6.' },
        { items: ['main'], op: 'factorial(3) returns 6', note: 'Back in main with the answer 6.' },
      ],
      { at: 'end' },
    ),
    V(
      'chart',
      'fib-calls',
      'When recursion explodes',
      'A line chart of the number of calls needed to compute Fibonacci numbers. The naive recursive version needs 15, 177, 1,973 and 21,891 calls for n equal to 5, 10, 15 and 20. The memoised version needs only 9, 19, 29 and 39.',
      'Naive recursion repeats work and explodes; memoisation keeps the calls linear.',
      {
        kind: 'line',
        xLabel: 'n',
        yLabel: 'Number of calls',
        categories: ['5', '10', '15', '20'],
        series: [
          { name: 'Naive fib(n)', values: [15, 177, 1973, 21891] },
          { name: 'Memoised fib(n)', values: [9, 19, 29, 39] },
        ],
      },
      { at: 'end' },
    ),
    treeSteps(
      'traversals',
      'Trees',
      'Four frames showing the same binary tree of seven keys with the order in which each traversal visits them. Pre-order gives 50, 30, 20, 40, 70, 60, 80. In-order gives 20, 30, 40, 50, 60, 70, 80, which is sorted. Post-order gives 20, 40, 30, 60, 80, 70, 50. Level-order gives 50, 30, 70, 20, 40, 60, 80.',
      'Same tree, four orders. In-order on a binary search tree gives the keys in sorted order.',
      (() => {
        const root = { label: '50', children: [{ label: '30', children: [{ label: '20' }, { label: '40' }] }, { label: '70', children: [{ label: '60' }, { label: '80' }] }] };
        return [
          { root, array: [50, 30, 20, 40, 70, 60, 80], note: 'Pre-order: the node first, then its left subtree, then its right subtree.' },
          { root, array: [20, 30, 40, 50, 60, 70, 80], note: 'In-order: left subtree, the node, right subtree. On a search tree this lists the keys in sorted order.' },
          { root, array: [20, 40, 30, 60, 80, 70, 50], note: 'Post-order: both subtrees first, then the node. Used to delete a tree safely.' },
          { root, array: [50, 30, 70, 20, 40, 60, 80], note: 'Level-order: row by row from the top, using a queue.' },
        ];
      })(),
      { at: 'end' },
    ),
    treeSteps(
      'bst-building',
      'Binary search trees',
      'Four frames about binary search trees. First 50, 30 and 70 are inserted. Then 20, 40, 60 and 80 complete a balanced tree of height 2. Searching for 60 goes right from 50, left from 70 and finds it in three comparisons. Finally, keys inserted in sorted order, 1, 2, 3, 4, form a chain where every node has only a right child.',
      'Keys in random order give a bushy tree and fast searches. Keys in sorted order give a chain and slow ones.',
      [
        { root: { label: '50', children: [{ label: '30' }, { label: '70' }] }, note: 'Insert 50 (the root), then 30 (smaller: left) and 70 (larger: right).' },
        { root: { label: '50', children: [{ label: '30', children: [{ label: '20' }, { label: '40' }] }, { label: '70', children: [{ label: '60' }, { label: '80' }] }] }, note: 'Insert 20, 40, 60 and 80. A full tree of 7 keys has height 2.' },
        { root: { label: '50', tone: 'info', children: [{ label: '30' }, { label: '70', tone: 'info', children: [{ label: '60', tone: 'good' }, { label: '80' }] }] }, note: 'Search for 60: bigger than 50, go right; smaller than 70, go left; found. Three comparisons, and half the tree was skipped at each step.' },
        { root: { label: '1', tone: 'bad', children: [{ label: '2', tone: 'bad', children: [{ label: '3', tone: 'bad', children: [{ label: '4', tone: 'bad' }] }] }] }, note: 'Insert 1, 2, 3, 4 in sorted order: every key goes to the right of the last, so the tree is a chain of height n − 1 and a search is O(n).' },
      ],
      { at: 'end' },
    ),
    treeSteps(
      'heap-as-tree',
      'Heaps and priority queues',
      'Two frames of a max-heap with seven values. As an array it is 90, 70, 80, 40, 60, 20 and 50. As a tree, 90 is the root with children 70 and 80, and each of those has two children. Every parent is larger than its children. The children of index 0 are the items at indexes 1 and 2.',
      'A heap is a complete tree stored in an array. The children of index i are at 2i + 1 and 2i + 2.',
      [
        { root: { label: '90', children: [{ label: '70', children: [{ label: '40' }, { label: '60' }] }, { label: '80', children: [{ label: '20' }, { label: '50' }] }] }, array: [90, 70, 80, 40, 60, 20, 50], note: 'The heap as a tree and as an array. Every parent is at least as large as its children, so the maximum is always the root.' },
        { root: { label: '90', tone: 'good', children: [{ label: '70', tone: 'info', children: [{ label: '40' }, { label: '60' }] }, { label: '80', tone: 'info', children: [{ label: '20' }, { label: '50' }] }] }, array: [90, 70, 80, 40, 60, 20, 50], note: 'Index 0 (90) has its children at indexes 2 × 0 + 1 = 1 and 2 × 0 + 2 = 2 (70 and 80). No pointers are needed.' },
      ],
      { at: 'end' },
    ),
    lab(
      'recursion-lab',
      'Example 1',
      'cpp',
      'A C++ editor with the Example 1 program that counts the calls of naive and memoised Fibonacci for n equal to 10, 20 and 30, with its expected output.',
      'Try n = 35 for the naive version and notice the pause, then try the memoised version.',
      `#include <iostream>
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
             << ", memoised calls " << calls << '\\n';
    }
    return 0;
}`,
      { expected: 'fib(10) = 55 (same: 1), naive calls 177, memoised calls 19\nfib(20) = 6765 (same: 1), naive calls 21891, memoised calls 39\nfib(30) = 832040 (same: 1), naive calls 2692537, memoised calls 59', filename: 'fib.cpp', at: 'end' },
    ),
  ],
  [`${M}/6`]: [
    flow(
      'hash-lookup-flow',
      'The idea: compute the address',
      'A four-step flow of a hash table lookup for the key graph. The key is given to the hash function, which produces a large number. The number is reduced modulo the table size 7 to give bucket 5. The table looks only in bucket 5.',
      'A hash table does not search: it computes where the key must be and looks only there.',
      ['Key|"graph"|accent', 'Hash function|hash("graph") = a large number', 'Modulo|number % 7 = 5', 'Bucket 5|look only here|good'],
      { perRow: 4, at: 'end' },
    ),
    hashTable(
      'chaining-interactive',
      'Collisions and chaining',
      'An interactive hash table with seven buckets and chaining. Words are hashed into buckets, and words that collide are stacked in the same bucket. You can switch the hash function and watch the buckets fill unevenly or evenly.',
      'Switch between the hash functions and watch the chains. A good hash spreads the words; first-letter-mod piles them up.',
      7,
      ['stack', 'queue', 'tree', 'graph', 'heap', 'sort', 'search', 'array'],
      { hash: 'sum-mod', method: 'chaining', at: 'end' },
    ),
    hashTable(
      'probing-interactive',
      'Open addressing',
      'An interactive hash table with seven slots and linear probing. When a word lands on an occupied slot, it moves on to the next free slot, wrapping around the end of the table. You can switch the hash function and see runs of occupied slots form.',
      'With linear probing every key lives in the array itself. A collision moves the key to the next free slot, and clusters grow.',
      7,
      ['stack', 'queue', 'tree', 'graph', 'heap', 'sort'],
      { hash: 'first-letter-mod', method: 'linear-probing', at: 'end' },
    ),
    V(
      'chart',
      'load-factor-chart',
      'Load factor and resizing',
      'A line chart of the average number of comparisons for a successful lookup in a chaining hash table as the load factor grows. It is about 1.1 at a load factor of 0.25, 1.5 at a load factor of 1 and 3 at a load factor of 4.',
      'The average successful lookup costs about 1 + α/2 comparisons: cheap while α is small, which is why tables resize.',
      {
        kind: 'line',
        xLabel: 'Load factor (items per bucket)',
        yLabel: 'Average comparisons',
        categories: ['0.25', '0.5', '0.75', '1', '2', '4'],
        series: [{ name: 'Chaining, successful lookup', values: [1.125, 1.25, 1.375, 1.5, 2, 3] }],
      },
      { at: 'end' },
    ),
    lab(
      'unordered-map-lab',
      'Example 3',
      'cpp',
      'A C++ editor with the Example 3 program that counts votes with an unordered_map, with its expected output.',
      'Print tally["zed"] and then tally.size(): what changed, and why?',
      `#include <iostream>
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
    cout << "anika " << tally["anika"] << ", rafi " << tally["rafi"] << ", nila " << tally["nila"] << '\\n';
    cout << "distinct candidates: " << tally.size() << '\\n';
    cout << "contains 'zed': " << tally.count("zed") << '\\n';
    return 0;
}`,
      { expected: "anika 4, rafi 2, nila 2\ndistinct candidates: 3\ncontains 'zed': 0", filename: 'votes.cpp', at: 'end' },
    ),
  ],
  [`${M}/7`]: [
    compare(
      'adjacency-forms',
      'Representing a graph',
      'Two ways to store the same graph with vertices A, B, C and D and edges A-B, A-C, B-C and C-D. The adjacency matrix is a four-by-four table of ones and zeros. The adjacency list gives each vertex its list of neighbours: A has B and C, B has A and C, C has A, B and D, and D has C.',
      'Same graph, two layouts. The list stores only the edges that exist, so it is much smaller for big sparse graphs.',
      { title: 'Adjacency matrix (V × V)', columns: ['', 'A', 'B', 'C', 'D'], rows: [['A', 0, 1, 1, 0], ['B', 1, 0, 1, 0], ['C', 1, 1, 0, 1], ['D', 0, 0, 1, 0]] },
      { title: 'Adjacency list (V + E)', columns: ['Vertex', 'Neighbours'], rows: [['A', 'B, C'], ['B', 'A, C'], ['C', 'A, B, D'], ['D', 'C']] },
      { at: 'end' },
    ),
    graph(
      'bfs-steps',
      'Breadth-first search (BFS)',
      'A step-through of breadth-first search on a graph of six vertices A to F. A is visited first, and its neighbours B and C join the queue. Then B, C, D, E and F are taken from the queue in turn. The order is A, B, C, D, E, F, in rings of distance from A.',
      'BFS finishes each ring before it starts the next. The queue holds the vertices waiting to be explored.',
      [
        { id: 'A', x: 60, y: 110 },
        { id: 'B', x: 190, y: 45 },
        { id: 'C', x: 190, y: 175 },
        { id: 'D', x: 330, y: 45 },
        { id: 'E', x: 330, y: 175 },
        { id: 'F', x: 470, y: 110 },
      ],
      [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F']],
      {
        at: 'end',
        steps: [
          { visit: ['A'], queue: ['A'], note: 'Start: mark A visited and put it in the queue.' },
          { visit: ['A', 'B', 'C'], queue: ['B', 'C'], current: 'A', note: 'Take A from the queue. Its unvisited neighbours B and C are marked and queued.' },
          { visit: ['A', 'B', 'C', 'D'], queue: ['C', 'D'], current: 'B', note: 'Take B. D is new, so it joins the queue.' },
          { visit: ['A', 'B', 'C', 'D', 'E'], queue: ['D', 'E'], current: 'C', note: 'Take C. Its neighbours A and D are visited already; E is new.' },
          { visit: ['A', 'B', 'C', 'D', 'E', 'F'], queue: ['E', 'F'], current: 'D', note: 'Take D. F is new.' },
          { visit: ['A', 'B', 'C', 'D', 'E', 'F'], queue: ['F'], current: 'E', note: 'Take E. Nothing new.' },
          { visit: ['A', 'B', 'C', 'D', 'E', 'F'], queue: [], current: 'F', note: 'Take F. The queue is empty: BFS is done. Order: A B C D E F.' },
        ],
      },
    ),
    graph(
      'dfs-steps',
      'Depth-first search (DFS)',
      'A step-through of depth-first search on the same six-vertex graph. DFS goes from A to B to D, then to C, E and F, going as deep as possible before it backs up. The stack shows the recursive calls waiting to finish. The order is A, B, D, C, E, F.',
      'DFS dives along one path until it is stuck, then backs up. The call stack remembers the way back.',
      [
        { id: 'A', x: 60, y: 110 },
        { id: 'B', x: 190, y: 45 },
        { id: 'C', x: 190, y: 175 },
        { id: 'D', x: 330, y: 45 },
        { id: 'E', x: 330, y: 175 },
        { id: 'F', x: 470, y: 110 },
      ],
      [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F']],
      {
        at: 'end',
        steps: [
          { visit: ['A'], stack: ['A'], current: 'A', note: 'Visit A and call dfs on its first neighbour.' },
          { visit: ['A', 'B'], stack: ['A', 'B'], current: 'B', note: 'Visit B: the first unvisited neighbour of A.' },
          { visit: ['A', 'B', 'D'], stack: ['A', 'B', 'D'], current: 'D', note: 'Visit D: the first unvisited neighbour of B.' },
          { visit: ['A', 'B', 'D', 'C'], stack: ['A', 'B', 'D', 'C'], current: 'C', note: 'From D, the neighbour B is visited, so go to C.' },
          { visit: ['A', 'B', 'D', 'C', 'E'], stack: ['A', 'B', 'D', 'C', 'E'], current: 'E', note: 'From C, go to E.' },
          { visit: ['A', 'B', 'D', 'C', 'E', 'F'], stack: ['A', 'B', 'D', 'C', 'E', 'F'], current: 'F', note: 'From E, go to F. Every vertex has been visited.' },
          { visit: ['A', 'B', 'D', 'C', 'E', 'F'], stack: [], note: 'Now the calls return one by one and the stack empties. Order: A B D C E F.' },
        ],
      },
    ),
    graph(
      'dijkstra-steps',
      'Shortest paths with weights',
      'A step-through of Dijkstra on a weighted graph of five vertices. From A, B is at 4 and C at 1. Taking C improves B to 3 and reaches D at 6. Taking B improves D to 4. Taking D reaches E at 7. The fastest route to E is A, C, B, D, E, with a total of 7.',
      'Always finish the closest unfinished vertex, and relax its edges. A longer-looking route (A, C, B) can beat the direct road.',
      [
        { id: 'A', x: 60, y: 110 },
        { id: 'B', x: 200, y: 45 },
        { id: 'C', x: 200, y: 175 },
        { id: 'D', x: 340, y: 110 },
        { id: 'E', x: 470, y: 110 },
      ],
      [['A', 'B', 4], ['A', 'C', 1], ['C', 'B', 2], ['B', 'D', 1], ['C', 'D', 5], ['D', 'E', 3]],
      {
        at: 'end',
        steps: [
          { visit: ['A'], current: 'A', dist: { A: 0 }, note: 'Start at A with distance 0. Everything else is infinity.' },
          { visit: ['A'], current: 'A', dist: { A: 0, B: 4, C: 1 }, edges: [['A', 'B'], ['A', 'C']], note: 'Relax the edges of A: B is at 4 and C is at 1.' },
          { visit: ['A', 'C'], current: 'C', dist: { A: 0, B: 3, C: 1, D: 6 }, edges: [['C', 'B'], ['C', 'D']], note: 'The closest unfinished vertex is C (1). Going through C makes B only 3 (1 + 2), and reaches D at 6.' },
          { visit: ['A', 'C', 'B'], current: 'B', dist: { A: 0, B: 3, C: 1, D: 4 }, edges: [['B', 'D']], note: 'Next is B (3). Through B, D drops from 6 to 4.' },
          { visit: ['A', 'C', 'B', 'D'], current: 'D', dist: { A: 0, B: 3, C: 1, D: 4, E: 7 }, edges: [['D', 'E']], note: 'Next is D (4). It reaches E at 7.' },
          { visit: ['A', 'C', 'B', 'D', 'E'], current: 'E', dist: { A: 0, B: 3, C: 1, D: 4, E: 7 }, note: 'All distances are final. The fastest route to E is A → C → B → D → E: 7 minutes.' },
        ],
      },
    ),
    lab(
      'bfs-lab',
      'Example 1',
      'cpp',
      'A C++ editor with the Example 1 program that runs breadth-first search on a graph of six vertices and prints the visit order, the hops and the path to F, with its expected output.',
      'Add the road road(0, 5) and see how the hops to F and the path change.',
      `#include <iostream>
#include <queue>
#include <string>
#include <vector>
using namespace std;

int main()
{
    const string names = "ABCDEF";
    vector<vector<int>> adj(6);
    auto road = [&](int a, int b) {
        adj[a].push_back(b);
        adj[b].push_back(a);
    };
    road(0, 1);
    road(0, 2);
    road(1, 3);
    road(2, 3);
    road(2, 4);
    road(3, 5);
    road(4, 5);

    vector<int> hops(6, -1);
    vector<int> parent(6, -1);
    queue<int> q;
    hops[0] = 0;
    q.push(0);
    cout << "BFS order:";
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        cout << ' ' << names[v];
        for (int next : adj[v]) {
            if (hops[next] == -1) {
                hops[next] = hops[v] + 1;
                parent[next] = v;
                q.push(next);
            }
        }
    }
    cout << '\\n';
    for (int v = 0; v < 6; v++) {
        cout << names[v] << ": " << hops[v] << " hop(s)\\n";
    }
    string path;
    for (int v = 5; v != -1; v = parent[v]) {
        path = string(1, names[v]) + (path.empty() ? "" : " -> ") + path;
    }
    cout << "path to F: " << path << '\\n';
    return 0;
}`,
      { expected: 'BFS order: A B C D E F\nA: 0 hop(s)\nB: 1 hop(s)\nC: 1 hop(s)\nD: 2 hop(s)\nE: 2 hop(s)\nF: 3 hop(s)\npath to F: A -> B -> D -> F', filename: 'bfs.cpp', at: 'end' },
    ),
  ],
  [`${M}/8`]: [
    treeSteps(
      'fast-power-tree',
      'Divide and conquer',
      'Three frames of the recursion for 3 to the power 30. The call for exponent 30 makes one call for exponent 15, which calls 7, then 3, then 1, then 0. The exponent halves at every level, so the chain has only about log base 2 of n calls. On the way back each call squares its result.',
      'One smaller subproblem per call (n/2), so the chain is only log₂ n deep: 30 → 15 → 7 → 3 → 1 → 0.',
      [
        { root: { label: 'power(3, 30)', children: [{ label: 'power(3, 15)' }] }, note: 'To compute 3^30, compute 3^15 once, then square it.' },
        { root: { label: 'power(3, 30)', children: [{ label: 'power(3, 15)', children: [{ label: 'power(3, 7)', children: [{ label: 'power(3, 3)', children: [{ label: 'power(3, 1)', children: [{ label: 'power(3, 0)', tone: 'info' }] }] }] }] }] }, note: 'The exponent halves each time (odd exponents lose one first): 30, 15, 7, 3, 1, 0. The base case power(3, 0) = 1 stops the recursion.' },
        { root: { label: 'power(3, 30)', tone: 'good', children: [{ label: 'power(3, 15)', tone: 'good', children: [{ label: 'power(3, 7)', tone: 'good', children: [{ label: 'power(3, 3)', tone: 'good', children: [{ label: 'power(3, 1)', tone: 'good', children: [{ label: 'power(3, 0)', tone: 'info' }] }] }] }] }] }, note: 'On the way back, every call squares the result of the call below (and multiplies by 3 for odd exponents): 9 multiplications instead of 30.' },
      ],
      { at: 'end' },
    ),
    V(
      'chart',
      'naive-vs-dp',
      'Dynamic programming',
      'A line chart of the work needed to find the minimum number of coins with coins 1, 3 and 4. For the amounts 6, 12 and 20 the naive recursion needs 24, 441 and 20,736 calls, while dynamic programming needs only 18, 36 and 60 steps.',
      'Naive recursion repeats subproblems and explodes. The DP table solves each amount once.',
      {
        kind: 'line',
        xLabel: 'Amount to change',
        yLabel: 'Calls or steps',
        categories: ['6', '12', '20'],
        series: [
          { name: 'Naive recursion (calls)', values: [24, 441, 20736] },
          { name: 'Dynamic programming (steps)', values: [18, 36, 60] },
        ],
      },
      { at: 'end' },
    ),
    table(
      'dp-table',
      'Dynamic programming',
      'The dynamic programming table for the fewest coins with coins 1, 3 and 4, for amounts 0 to 6. The fewest coins are 0, 1, 2, 1, 1, 2 and 2. The amount 6 is best made as 3 plus 3, with two coins, where the greedy rule would use three.',
      'Each cell is built from earlier cells: best[a] = 1 + the best of best[a − coin]. Amount 6 uses 3 + 3.',
      ['Amount', '0', '1', '2', '3', '4', '5', '6'],
      [
        ['Fewest coins', '0', '1', '2', '1', '1', '2', '2'],
        ['One best way', '–', '1', '1 + 1', '3', '4', '4 + 1', '3 + 3'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 7, tone: 'good', note: 'Greedy gets 3' }] },
    ),
    grid(
      'strategy-decision',
      'Choosing a strategy',
      'A decision flowchart for choosing a strategy. If the problem splits into independent parts, use divide and conquer. Otherwise, if a locally best choice is provably safe, use a greedy algorithm. Otherwise, if the subproblems overlap, use dynamic programming. Otherwise use brute force, with pruning if possible.',
      'Three questions, in order. Then check the choice with counters.',
      [
        ['q1', 'decision', 'Splits into independent parts?', 0, 0, 'warn'],
        ['dc', 'terminator', 'Divide and conquer', 2, 0, 'good'],
        ['q2', 'decision', 'Is a local best choice provably safe?', 0, 1.5, 'warn'],
        ['gr', 'terminator', 'Greedy', 2, 1.5, 'good'],
        ['q3', 'decision', 'Do subproblems overlap?', 0, 3, 'warn'],
        ['dp', 'terminator', 'Dynamic programming', 2, 3, 'good'],
        ['bf', 'terminator', 'Brute force (prune if you can)', 0, 4.5, 'info'],
      ],
      [
        ['q1', 'dc', 'Yes'],
        ['q1', 'q2', 'No'],
        ['q2', 'gr', 'Yes'],
        ['q2', 'q3', 'No'],
        ['q3', 'dp', 'Yes'],
        ['q3', 'bf', 'No'],
      ],
      { dx: 250, dy: 82, w: 230, at: 'end' },
    ),
    lab(
      'greedy-lab',
      'Example 2',
      'cpp',
      'A C++ editor with the Example 2 program in which a greedy coin-change rule is correct for the coins 1, 5, 10 and 25 but gives three coins instead of two for the coins 1, 3 and 4, with its expected output.',
      'Find another coin system for which greedy fails. Hint: try the coins 1, 6 and 10 with the amount 12.',
      `#include <iostream>
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
    cout << "coins 1, 5, 10, 25 and amount 63: " << greedy_coins({1, 5, 10, 25}, 63) << " coins\\n";
    cout << "coins 1, 3, 4 and amount 6: " << greedy_coins({1, 3, 4}, 6) << " coins (the best is 2: 3 + 3)\\n";
    return 0;
}`,
      { expected: 'coins 1, 5, 10, 25 and amount 63: 6 coins\ncoins 1, 3, 4 and amount 6: 3 coins (the best is 2: 3 + 3)', filename: 'greedy.cpp', at: 'end' },
    ),
  ],
  // @@visuals-end
});

registerQuizCatalog({
  [`${M}/1`]: [
    mcq('q1', 'What does Big O notation describe?', ['How the number of steps (or the memory) grows as the input size grows', 'The exact number of seconds a program takes on your computer', 'The number of lines of code in a program', 'The largest input a computer can store'], 'Big O describes the shape of the growth for large inputs, ignoring constants. It is not a time in seconds, because that depends on the machine.'),
    mcq('q2', 'What does this program print?', ['25', '10', '5', '20'], 'Two nested loops that each run n = 5 times execute the inner statement 5 × 5 = 25 times. That is O(n²) growth.', CPP('#include <iostream>\nusing namespace std;\n\nint main()\n{\n    int n = 5;\n    int steps = 0;\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) {\n            steps++;\n        }\n    }\n    cout << steps << "\\n";\n    return 0;\n}')),
    mcq('q3', 'What does this program print?', ['6', '64', '63', '5'], 'The loop halves n each pass: 64, 32, 16, 8, 4, 2, 1. That is 6 halvings, because 2 to the power 6 is 64. The growth is logarithmic.', CPP('#include <iostream>\nusing namespace std;\n\nint main()\n{\n    int n = 64;\n    int steps = 0;\n    while (n > 1) {\n        n /= 2;\n        steps++;\n    }\n    cout << steps << "\\n";\n    return 0;\n}')),
    mcq('q4', 'When the input size doubles, an algorithm’s number of steps goes from 1,000 to 4,000. Which growth does that suggest?', ['Quadratic, O(n²)', 'Linear, O(n)', 'Logarithmic, O(log n)', 'Constant, O(1)'], 'Doubling the input multiplied the work by four, which is the signature of quadratic growth. Linear growth would double the steps; logarithmic growth would add a constant.'),
    mcq('q5', 'A list-searching algorithm checks the items one by one. Which statement about its cases is correct?', ['Best case: the target is first, O(1). Worst case: it is last or missing, O(n)', 'Best case: the target is last, O(n). Worst case: the target is first, O(1)', 'Every case takes exactly n steps, because every item is always checked', 'Best and worst case are always the same for every searching algorithm'], 'If the target is the first item, one comparison is enough. If it is last or missing, all n items are checked. Big O normally quotes the worst case.'),
  ],
  [`${M}/2`]: [
    mcq('q1', 'What must be true before binary search can be used on a list?', ['The list is sorted', 'The list has an even number of elements', 'The list contains no duplicate values', 'The list is stored on the heap'], 'Binary search throws half the range away by comparing with the middle element. That only works when the elements are in order.'),
    mcq('q2', 'What does this program print?', ['6 3', '6 7', '13 3', '3 6'], 'The target 13 is at index 6. The middles visited are index 3 (value 7), index 5 (value 11) and index 6 (value 13): three comparisons.', CPP('#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main()\n{\n    vector<int> v = {1, 3, 5, 7, 9, 11, 13};\n    int target = 13;\n    int low = 0;\n    int high = 6;\n    int steps = 0;\n    int index = -1;\n    while (low <= high) {\n        int mid = low + (high - low) / 2;\n        steps++;\n        if (v[mid] == target) {\n            index = mid;\n            break;\n        }\n        if (v[mid] < target) {\n            low = mid + 1;\n        } else {\n            high = mid - 1;\n        }\n    }\n    cout << index << " " << steps << "\\n";\n    return 0;\n}')),
    mcq('q3', 'About how many comparisons does binary search need, at most, to search 1,000,000 sorted items?', ['About 20', 'About 500,000', 'About 1,000', 'Exactly 1,000,000'], 'Each step halves the range, and 2 to the power 20 is just over a million, so 20 or 21 looks are enough. Linear search could need all 1,000,000.'),
    mcq('q4', 'Which expression finds the middle index without any risk of overflow for very large arrays?', ['low + (high - low) / 2', '(low + high) / 2', '(high - low) / 2', 'low / 2 + high'], 'For huge arrays, low + high can exceed the largest int. low + (high - low) / 2 never does, and gives the same middle.'),
    mcq('q5', 'What does this program print?', ['1 1 4', '1 1 3', '1 3 4', '0 1 4'], 'binary_search answers 1 (found). lower_bound is the first position of a 4, index 1, and upper_bound is the position just after the last 4, index 4.', CPP('#include <algorithm>\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main()\n{\n    vector<int> v = {2, 4, 4, 4, 9};\n    cout << binary_search(v.begin(), v.end(), 4) << " " << (lower_bound(v.begin(), v.end(), 4) - v.begin()) << " "\n         << (upper_bound(v.begin(), v.end(), 4) - v.begin()) << "\\n";\n    return 0;\n}')),
  ],
  [`${M}/3`]: [
    mcq('q1', 'Which sorting algorithm makes exactly the same number of comparisons whatever order the data starts in (for the same n)?', ['Selection sort', 'Insertion sort', 'Bubble sort with an early exit', 'Quick sort'], 'Selection sort always scans the whole unsorted part to find the smallest element, so it makes n(n − 1)/2 comparisons for every input. The others depend on how disordered the data is.'),
    mcq('q2', 'What does this program print?', ['3 2 1 4', '1 2 3 4', '4 3 2 1', '3 4 2 1'], 'One bubble-sort pass compares neighbours and swaps them when out of order. The largest value, 4, bubbles to the end: 3 2 1 4. The list is not yet sorted.', CPP('#include <iostream>\n#include <utility>\n#include <vector>\nusing namespace std;\n\nint main()\n{\n    vector<int> v = {4, 3, 2, 1};\n    for (int i = 0; i < 3; i++) {\n        if (v[i] > v[i + 1]) {\n            swap(v[i], v[i + 1]);\n        }\n    }\n    for (int x : v) {\n        cout << x << " ";\n    }\n    cout << "\\n";\n    return 0;\n}')),
    mcq('q3', 'Why can quick sort take O(n²) time?', ['If the pivot is always the smallest or largest item, one side of each partition is empty', 'Because recursion always makes an algorithm run in quadratic time', 'Because it copies the whole list at every step', 'Because it must compare every element with every other element in each pass'], 'A good pivot splits the list in two halves. A bad pivot (for example the last element of a sorted list) splits it into n − 1 elements and none, so the work adds up to n + (n − 1) + ... + 1.'),
    mcq('q4', 'What does this program print?', ['1 2 3 4 9 10', '1 4 9 2 3 10', '1 2 3 4 10 9', '10 9 4 3 2 1'], 'This is the merge step of merge sort: repeatedly take the smaller of the two front elements. The result is both lists merged in order.', CPP('#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main()\n{\n    vector<int> a = {1, 4, 9};\n    vector<int> b = {2, 3, 10};\n    vector<int> out;\n    size_t i = 0;\n    size_t j = 0;\n    while (i < a.size() && j < b.size()) {\n        if (a[i] <= b[j]) {\n            out.push_back(a[i++]);\n        } else {\n            out.push_back(b[j++]);\n        }\n    }\n    while (i < a.size()) {\n        out.push_back(a[i++]);\n    }\n    while (j < b.size()) {\n        out.push_back(b[j++]);\n    }\n    for (int x : out) {\n        cout << x << " ";\n    }\n    cout << "\\n";\n    return 0;\n}')),
    mcq('q5', 'Students are sorted by name, and then sorted by class with a stable sort. What does stability guarantee?', ['Students in the same class stay in alphabetical order', 'The second sort is always faster than the first sort', 'The sort uses no extra memory while it rearranges the list', 'The sort always takes O(n log n) time, even in the worst case'], 'A stable sort keeps elements that compare equal (the same class) in their previous relative order, which was alphabetical. Stability says nothing about speed or memory.'),
  ],
  [`${M}/4`]: [
    mcq('q1', 'Which operation takes O(1) time in a singly linked list that has only a head pointer?', ['Inserting a new node at the front', 'Reading the 100th element', 'Searching for a given value', 'Appending a node at the end'], 'Inserting at the front changes just two pointers, whatever the length. Reading by position, searching and appending without a tail pointer all need a walk along the list.'),
    mcq('q2', 'What does this program print?', ['3 2 1', '1 2 3', '1 3 2', '3 1 2'], 'A stack is last in, first out: the last number pushed, 3, is popped first.', CPP('#include <iostream>\n#include <stack>\nusing namespace std;\n\nint main()\n{\n    stack<int> s;\n    s.push(1);\n    s.push(2);\n    s.push(3);\n    while (!s.empty()) {\n        cout << s.top() << " ";\n        s.pop();\n    }\n    cout << "\\n";\n    return 0;\n}')),
    mcq('q3', 'What does this program print?', ['1 2 3', '3 2 1', '2 1 3', '1 3 2'], 'A queue is first in, first out: the numbers come back in the order they were added.', CPP('#include <iostream>\n#include <queue>\nusing namespace std;\n\nint main()\n{\n    queue<int> q;\n    q.push(1);\n    q.push(2);\n    q.push(3);\n    while (!q.empty()) {\n        cout << q.front() << " ";\n        q.pop();\n    }\n    cout << "\\n";\n    return 0;\n}')),
    mcq('q4', 'Which data structure is the natural choice for checking that the brackets in a formula are balanced?', ['A stack', 'A queue', 'A sorted array', 'A binary search'], 'The most recently opened bracket must be the first one closed, which is last in, first out: a stack.'),
    mcq('q5', 'You remove a node from a linked list but forget to call delete on it. What happens?', ['The node stays allocated but unreachable: a memory leak', 'The compiler frees it automatically', 'It is freed the next time the list changes size', 'It becomes part of the stack'], 'C++ does not free memory that you allocated with new unless you call delete (or use a smart pointer). The node can no longer be reached, so the memory is leaked.'),
  ],
  [`${M}/5`]: [
    mcq('q1', 'What is the purpose of the base case of a recursive function?', ['It stops the recursion, so the calls do not continue forever', 'It makes the recursive function run faster than a loop', 'It stores the results of earlier calls so they can be reused', 'It converts the recursion into a loop that the compiler runs'], 'Without a base case that is solved directly, the function would call itself forever and the call stack would overflow. Every recursive case must move towards the base case.'),
    mcq('q2', 'What does this program print?', ['10', '4', '24', '9'], 'sum(4) = 4 + sum(3) = 4 + 3 + sum(2) = 4 + 3 + 2 + sum(1) = 4 + 3 + 2 + 1 + sum(0) = 10. The base case sum(0) returns 0.', CPP('#include <iostream>\nusing namespace std;\n\nint sum(int n)\n{\n    if (n == 0) {\n        return 0;\n    }\n    return n + sum(n - 1);\n}\n\nint main()\n{\n    cout << sum(4) << "\\n";\n    return 0;\n}')),
    mcq('q3', 'What does this program print?', ['1 3 4 5 8', '5 3 8 1 4', '1 4 3 8 5', '8 5 4 3 1'], 'The program builds a binary search tree and prints it with an in-order traversal (left subtree, node, right subtree), which lists the keys in sorted order.', CPP('#include <iostream>\nusing namespace std;\n\nstruct N {\n    int k;\n    N* l;\n    N* r;\n};\n\nN* add(N* n, int k)\n{\n    if (n == nullptr) {\n        return new N{k, nullptr, nullptr};\n    }\n    if (k < n->k) {\n        n->l = add(n->l, k);\n    } else {\n        n->r = add(n->r, k);\n    }\n    return n;\n}\n\nvoid show(const N* n)\n{\n    if (n == nullptr) {\n        return;\n    }\n    show(n->l);\n    cout << n->k << " ";\n    show(n->r);\n}\n\nint main()\n{\n    N* root = nullptr;\n    for (int k : {5, 3, 8, 1, 4}) {\n        root = add(root, k);\n    }\n    show(root);\n    cout << "\\n";\n    return 0;\n}')),
    mcq('q4', 'Why can a binary search tree become slow?', ['If keys arrive in sorted order it becomes a chain of height n, so a search takes O(n)', 'Because a binary search tree can hold at most 1,000 keys before it overflows', 'Because every node has to be sorted again after each search is finished', 'Because an in-order traversal needs a sorted array to be built first'], 'The cost of every operation is O(height). Random keys keep the tree bushy (height about log n), but sorted keys all go to the right of each other and make a chain.'),
    mcq('q5', 'What does this program print?', ['9 4', '9 3', '3 9', '4 9'], 'priority_queue is a max-heap: top() is the largest value. After 9 is popped, the largest of the remaining 3 and 4 is 4.', CPP('#include <iostream>\n#include <queue>\nusing namespace std;\n\nint main()\n{\n    priority_queue<int> pq;\n    pq.push(3);\n    pq.push(9);\n    pq.push(4);\n    cout << pq.top() << " ";\n    pq.pop();\n    cout << pq.top() << "\\n";\n    return 0;\n}')),
  ],
  [`${M}/6`]: [
    mcq('q1', 'What does the hash function of a hash table do?', ['It turns a key into a number that is used to choose a slot', 'It sorts the keys into alphabetical order inside the table', 'It removes duplicate keys from the table before they are stored', 'It encrypts the keys so that nobody else can read them'], 'The hash function maps a key to a number; the table size is then used to reduce it to a slot index. The same key always gives the same index, so a lookup goes straight to the right place.'),
    mcq('q2', 'What does this program print?', ['2 2', '3 2', '2 3', '1 2'], 'm["a"]++ runs twice for "a" and once for "b", so m["a"] is 2, and the map has two distinct keys.', CPP('#include <iostream>\n#include <string>\n#include <unordered_map>\nusing namespace std;\n\nint main()\n{\n    unordered_map<string, int> m;\n    m["a"]++;\n    m["b"]++;\n    m["a"]++;\n    cout << m["a"] << " " << m.size() << "\\n";\n    return 0;\n}')),
    mcq('q3', 'Two different keys are assigned to the same slot of a hash table. What is this called?', ['A collision', 'An overflow', 'A rehash', 'A duplicate key'], 'A collision is two different keys with the same index. Collisions are unavoidable, so a hash table needs a plan for them, such as chaining or probing.'),
    mcq('q4', 'A chaining hash table holds 150 items in 100 buckets. What is its load factor?', ['1.5', '0.67', '15', '100'], 'The load factor is the number of items divided by the number of buckets: 150 / 100 = 1.5. On average each bucket holds one and a half items.'),
    mcq('q5', 'What does this program print?', ['4', '6', '3', '2'], 'An unordered_set stores each value once. The six numbers contain the distinct values 4, 8, 15 and 16, so the size is 4.', CPP('#include <iostream>\n#include <unordered_set>\nusing namespace std;\n\nint main()\n{\n    unordered_set<int> s;\n    for (int x : {4, 8, 4, 15, 8, 16}) {\n        s.insert(x);\n    }\n    cout << s.size() << "\\n";\n    return 0;\n}')),
  ],
  [`${M}/7`]: [
    mcq('q1', 'Which search is guaranteed to find a path with the fewest edges in an unweighted graph?', ['Breadth-first search', 'Depth-first search', 'Binary search', 'Linear search'], 'BFS explores in rings of increasing distance, so the first time it reaches a vertex is by a path with the fewest edges. DFS may find a much longer path.'),
    mcq('q2', 'What does this program print?', ['0 1 2 3', '0 1 3 2', '0 2 1 3', '3 2 1 0'], 'BFS starts at 0, then visits its neighbours 1 and 2 in order, then the neighbour of 1 that is new, 3.', CPP('#include <iostream>\n#include <queue>\n#include <vector>\nusing namespace std;\n\nint main()\n{\n    vector<vector<int>> adj(4);\n    adj[0] = {1, 2};\n    adj[1] = {0, 3};\n    adj[2] = {0};\n    adj[3] = {1};\n    vector<bool> seen(4, false);\n    queue<int> q;\n    q.push(0);\n    seen[0] = true;\n    while (!q.empty()) {\n        int v = q.front();\n        q.pop();\n        cout << v << " ";\n        for (int next : adj[v]) {\n            if (!seen[next]) {\n                seen[next] = true;\n                q.push(next);\n            }\n        }\n    }\n    cout << "\\n";\n    return 0;\n}')),
    mcq('q3', 'A recursive depth-first search uses which structure to remember where to go back to?', ['The call stack', 'A queue', 'A hash table', 'A sorted array'], 'Each recursive call waits on the call stack while its neighbours are explored. When a vertex has no new neighbours, the call returns and the search backs up.'),
    mcq('q4', 'Why can plain BFS not find the fastest route on a map whose roads have different lengths?', ['It minimises the number of roads, not the total length', 'It cannot visit more than one vertex of the graph at a time', 'It only works on graphs in which all vertices have the same degree', 'It always chooses the longest available road before the shorter ones'], 'BFS counts edges, so a single 15-minute road beats three roads of 2, 3 and 4 minutes. Weighted shortest paths need Dijkstra’s algorithm.'),
    mcq('q5', 'What does this program print?', ['3', '2', '5', '1'], 'The graph has edges 0-1 and 2-3, and vertex 4 has none. That gives three connected components: {0, 1}, {2, 3} and {4}.', CPP('#include <iostream>\n#include <vector>\nusing namespace std;\n\nvoid visit(int v, const vector<vector<int>>& adj, vector<bool>& seen)\n{\n    seen[v] = true;\n    for (int next : adj[v]) {\n        if (!seen[next]) {\n            visit(next, adj, seen);\n        }\n    }\n}\n\nint main()\n{\n    vector<vector<int>> adj(5);\n    adj[0] = {1};\n    adj[1] = {0};\n    adj[2] = {3};\n    adj[3] = {2};\n    vector<bool> seen(5, false);\n    int components = 0;\n    for (int v = 0; v < 5; v++) {\n        if (!seen[v]) {\n            visit(v, adj, seen);\n            components++;\n        }\n    }\n    cout << components << "\\n";\n    return 0;\n}')),
  ],
  [`${M}/8`]: [
    mcq('q1', 'Which strategy splits a problem into independent subproblems, solves each one and combines the answers?', ['Divide and conquer', 'Greedy', 'Brute force', 'Dynamic programming'], 'Divide and conquer splits, solves and combines: merge sort, binary search and fast exponentiation are examples. Dynamic programming is for subproblems that overlap.'),
    mcq('q2', 'What does this program print?', ['3', '2', '4', '12'], 'The greedy rule takes the biggest coin first: 10 + 1 + 1 = three coins. The best answer is 6 + 6 = two coins, so greedy is not optimal for the coins 1, 6 and 10.', CPP('#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main()\n{\n    vector<int> coins = {1, 6, 10};\n    int amount = 12;\n    int count = 0;\n    for (int i = 2; i >= 0; i--) {\n        while (amount >= coins[i]) {\n            amount -= coins[i];\n            count++;\n        }\n    }\n    cout << count << "\\n";\n    return 0;\n}')),
    mcq('q3', 'Which two properties make a problem suitable for dynamic programming?', ['Optimal substructure and overlapping subproblems', 'Sorted input and unique keys', 'A graph without cycles and a single start vertex', 'Independent subproblems and a greedy choice'], 'The best answer must be built from best answers to smaller subproblems (optimal substructure), and the same subproblems must occur again and again (overlapping), so storing them saves time.'),
    mcq('q4', 'What does this program print?', ['1024', '20', '100', '512'], 'power(2, 10) = power(2, 5) squared, and so on; the recursion halves the exponent. The result is 2 to the power 10 = 1024.', CPP('#include <iostream>\nusing namespace std;\n\nlong long power(long long x, int n)\n{\n    if (n == 0) {\n        return 1;\n    }\n    long long half = power(x, n / 2);\n    return n % 2 == 1 ? half * half * x : half * half;\n}\n\nint main()\n{\n    cout << power(2, 10) << "\\n";\n    return 0;\n}')),
    mcq('q5', 'Why does the naive recursive solution of the minimum-coins problem become very slow for large amounts?', ['It solves the same smaller amounts again and again', 'It uses a hash table that is too small', 'It sorts the coins at every step', 'It can only handle amounts that are powers of two'], 'The recursion for amount a calls itself for a - 1, a - 3 and a - 4, and these calls overlap heavily. Without a cache, the same subproblems are solved over and over, which makes the number of calls explode.'),
  ],
  // @@quiz-end
});
