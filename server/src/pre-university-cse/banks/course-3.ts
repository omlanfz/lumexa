// FILE PATH: server/src/pre-university-cse/banks/course-3.ts
//
// Course Assessment 3 — Data Structures & Algorithmic Problem-Solving.

import { codeOut, crit, mcq, practical, shortAnswer, structuredBank } from '../../structured-assessments/structured.helpers';

export const COURSE_3_BANK = structuredBank({
  id: 'structured/data-structures-and-algorithmic-problem-solving',
  title: 'Course Assessment: Data Structures & Algorithmic Problem-Solving',
  kind: 'COURSE_TEST',
  mcq: [
    mcq(
      1,
      'What is the worst-case time complexity of searching an unsorted array of n items for a value, and why?',
      'O(n), because every item may have to be examined before the value is found or ruled out',
      [
        'O(log n), because the search can always discard half of the array',
        'O(1), because an array gives direct access to any item',
        'O(n squared), because each item is compared with every other item',
      ],
      'Without any order in the data, nothing allows items to be skipped, so in the worst case all n items are checked.',
    ),
    codeOut(
      2,
      'python',
      `items = [2, 4, 6, 8, 10, 12, 14, 16]
lo, hi, steps = 0, len(items) - 1, 0
while lo <= hi:
    mid = (lo + hi) // 2
    steps += 1
    if items[mid] == 4:
        break
    if items[mid] < 4:
        lo = mid + 1
    else:
        hi = mid - 1
print(steps)`,
      '2',
      ['1', '3', '4'],
      'The first middle position is 3 (the value 8), which is too large, so hi becomes 2. The next middle is 1, the value 4, found at the second step.',
    ),
    codeOut(
      3,
      'python',
      `a = [5, 1, 4, 2, 8]
for i in range(len(a) - 1):
    if a[i] > a[i + 1]:
        a[i], a[i + 1] = a[i + 1], a[i]
print(a)`,
      '[1, 4, 2, 5, 8]',
      ['[1, 2, 4, 5, 8]', '[1, 4, 5, 2, 8]', '[5, 1, 4, 2, 8]'],
      'This is exactly one bubble sort pass: 5 is carried to the right past 1, 4 and 2 and stops before the 8. One pass is not enough to finish the sort.',
    ),
    codeOut(
      4,
      'python',
      `from collections import deque

s, q = [], deque()
for x in [1, 2, 3]:
    s.append(x)
    q.append(x)
print(s.pop(), q.popleft())`,
      '3 1',
      ['1 3', '3 3', '1 1'],
      'A stack gives back the last item pushed (last in, first out), a queue the first one added (first in, first out).',
    ),
    mcq(
      5,
      'Which statement about an in-order traversal of a binary search tree is true?',
      'It visits the keys in ascending order, because left subtrees hold smaller keys and right subtrees larger ones',
      [
        'It visits the keys in the order in which they were inserted',
        'It visits the root first and then every leaf from left to right',
        'It visits the keys in descending order, because the largest key is always the root',
      ],
      'In-order means left subtree, node, right subtree. With the search-tree property this produces the keys in sorted order.',
    ),
    mcq(
      6,
      'What is a collision in a hash table?',
      'Two different keys are mapped by the hash function to the same index, so the table must store both somehow',
      [
        'The table is full and no further key can be inserted without growing it',
        'The same key is inserted twice and the second value replaces the first',
        'A key is looked up but the hash function returns a negative index',
      ],
      'Many keys share few slots, so collisions are unavoidable. Chaining and open addressing are two ways to handle them.',
    ),
    codeOut(
      7,
      'python',
      `from collections import deque

g = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}
seen, order, q = {"A"}, [], deque(["A"])
while q:
    n = q.popleft()
    order.append(n)
    for m in g[n]:
        if m not in seen:
            seen.add(m)
            q.append(m)
print("".join(order))`,
      'ABCD',
      ['ABDC', 'ACBD', 'ADBC'],
      'Breadth-first search visits the vertices in rings of distance: A, then its neighbours B and C, then D, which is discovered from B.',
    ),
    mcq(
      8,
      'A shop has coins of 1, 3 and 4 taka and must pay exactly 6 taka with as few coins as possible. Which statement is correct?',
      'Greedy takes 4 + 1 + 1 (three coins), but dynamic programming finds 3 + 3 (two coins), so greedy is not always optimal',
      [
        'Greedy and dynamic programming both give 4 + 1 + 1, which is optimal',
        'Greedy gives 3 + 3 and dynamic programming gives 4 + 1 + 1',
        'The amount cannot be paid exactly with these coins',
      ],
      'Taking the largest coin first is fast but not always optimal. Dynamic programming compares all the sub-answers and finds the two-coin solution.',
    ),
    mcq(
      3,
      'Which sorting algorithm takes O(n log n) time in every case and keeps equal items in their original order?',
      'Merge sort, because it always splits in halves, merges in linear time, and takes from the left half first on a tie',
      [
        'Bubble sort, because it compares neighbours and never moves equal items',
        'Selection sort, because it repeatedly selects the minimum in O(log n)',
        'Quick sort with a fixed first pivot, because it always splits the list evenly',
      ],
      'Merge sort is O(n log n) in the best, average and worst case, and with a merge that prefers the left item on equal keys it is stable.',
    ),
    mcq(
      2,
      'What must be true of an array before binary search can be used on it?',
      'The items must be sorted, because each comparison discards the half in which the target cannot lie',
      [
        'The array must have an even number of items so that it can be halved exactly',
        'The items must be distinct, because binary search cannot compare equal values',
        'The array must be stored in a linked list so that the middle can be reached quickly',
      ],
      'Binary search relies on order: if the middle value is smaller than the target, everything to its left is smaller too and can be skipped.',
    ),
  ],
  shortAnswers: [
    shortAnswer(
      2,
      'A sorted list holds 1,000,000 student ids. Compare linear search and binary search for finding one id: give the largest number of comparisons each needs (approximately) and explain the reason for the difference. When would linear search still be the better choice?',
      'Linear search may need 1,000,000 comparisons in the worst case (O(n)). Binary search halves the remaining range at every step, so it needs at most about log2(1,000,000), roughly 20 comparisons (O(log n)). The difference comes from using the order of the data: each comparison removes half of the candidates instead of one. Linear search is still better when the list is small, unsorted, or searched only once, because sorting first would cost more than the single scan.',
      [
        crit('The two counts', 2, 'About 1,000,000 for linear and about 20 for binary (log2 of 10^6); 1 mark if only one count is right.'),
        crit('The reason', 2, 'Explains that binary search halves the range each step because the data are sorted, while linear search removes one item per step.'),
        crit('When linear is better', 1, 'Names a sensible case: small data, unsorted data, or one single search.'),
      ],
    ),
    shortAnswer(
      4,
      'Explain the difference between a stack and a queue, give one real use of each, and describe in words or pseudocode how a stack can check whether the brackets in a text like "{[()]}" are balanced.',
      'A stack is last in, first out: items are pushed and popped at the same end. A queue is first in, first out: items are added at the back and removed from the front. A stack is used for undo, function calls or bracket matching; a queue for printer jobs or breadth-first search. To check brackets, read the text from left to right: push every opening bracket; at a closing bracket pop the stack and check that the popped bracket is its partner, otherwise the text is not balanced; at the end the stack must be empty.',
      [
        crit('Stack and queue', 2, 'Correctly contrasts last in, first out with first in, first out and names where items enter and leave.'),
        crit('Two uses', 1, 'One real use for each structure.'),
        crit('Bracket algorithm', 2, 'Push openings, pop and compare at closings, and require an empty stack at the end (1 mark for a partial description).'),
      ],
    ),
    shortAnswer(
      7,
      'Explain why breadth-first search finds a shortest path (the fewest edges) in an unweighted graph. Say how the path is rebuilt after the search and why this method is not enough when the edges have different weights.',
      'Breadth-first search explores the vertices in rings of increasing distance from the start: all vertices one edge away, then two edges, and so on, using a queue. The first time it reaches the goal is therefore along a path with the fewest edges. To rebuild the path, the search stores for each vertex the vertex it was discovered from (its parent) and follows the parents back from the goal to the start. With weights the fewest edges is not the smallest total weight, so an algorithm such as Dijkstra, which always expands the vertex with the smallest total distance, is needed.',
      [
        crit('Why BFS works', 2, 'Explains the ring-by-ring order with a queue, so the goal is first reached by the fewest edges.'),
        crit('Rebuilding the path', 2, 'Describes parent links followed back from the goal.'),
        crit('Weighted graphs', 1, 'Says that fewest edges is not least weight and names a weighted-path method such as Dijkstra.'),
      ],
    ),
  ],
  practical: practical({
    title: 'Shortest route on a campus map',
    language: 'cpp',
    instructions:
      'A campus is stored as an adjacency list. Write a C++ program that finds the shortest route (fewest steps) between two places with breadth-first search.\n\n' +
      '1. Store the graph: Gate: Library, Canteen; Library: Gate, Admin, Lab; Canteen: Gate, Hall; Admin: Library, Hall; Lab: Library, Workshop; Hall: Canteen, Admin, Workshop; Workshop: Lab, Hall.\n' +
      '2. Write `std::vector<std::string> shortestPath(start, goal)` that uses a queue and a map of parents, and returns the places on the route in order (an empty vector if there is none).\n' +
      '3. In main, print the route from Gate to Workshop as `Gate > Library > Lab > Workshop` and the number of steps, and then the route from Admin to Canteen.\n' +
      '4. Explain in a comment why a queue (and not a stack) gives a shortest route, and state the time complexity of your search.\n\n' +
      'Expected first output line: `Gate > Library > Lab > Workshop (3 steps)`. Handle the case that start and goal are the same place.',
    starterCode:
      '#include <iostream>\n#include <map>\n#include <queue>\n#include <string>\n#include <vector>\n\n' +
      'using Graph = std::map<std::string, std::vector<std::string>>;\n\n' +
      '// std::vector<std::string> shortestPath(const Graph& g, const std::string& start, const std::string& goal)\n\n' +
      'int main() {\n    Graph campus = {\n        {"Gate", {"Library", "Canteen"}},\n        // the other places\n    };\n}\n',
    deliverables: ['Your complete C++ program', 'The printed routes', 'The comment about the queue and the complexity'],
    rubric: [
      crit('Graph and data structures', 4, 'The adjacency list is correct and a queue and a parent map (or similar) are used sensibly.'),
      crit('Breadth-first search', 6, 'Marks visited places, expands in queue order, stops at the goal and handles an unreachable goal.'),
      crit('Path rebuilding and output', 4, 'Rebuilds the route from the parents, prints it in the required format with the number of steps; start equal to goal works.'),
      crit('Complexity and reasoning', 3, 'States O(V + E) and explains why a queue gives the fewest steps.'),
      crit('Code quality', 3, 'Clear names, no global state, const references for the graph, short comments.'),
    ],
  }),
});
