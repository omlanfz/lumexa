# Lumexa Mission Log: Discrete Mathematics & Computational Logic

**Course/Path:** Discrete Mathematics & Computational Logic
**Lesson:** 06 of 08
**Title:** Graph Theory, Paths, Trees and Connectivity
**Duration:** 60 minutes
**Difficulty:** Advanced
**Technology:** Graphs · adjacency matrices (with Python)

---

## Mission Brief

In 1736 the people of Königsberg asked a puzzle: is there a walk through the city that crosses each of its seven bridges exactly once? The mathematician Leonhard Euler did not wander the streets to try. He drew the city as dots and lines, noticed that the answer depended only on how many lines met at each dot, and proved that no such walk exists. In doing so he founded **graph theory**.

Graphs are the simplest and most powerful model of "things and their connections": roads, computer networks, friendships, circuits, dependencies between tasks, molecules. In Course 3 you searched graphs with BFS and Dijkstra; here you study their *structure*: degrees, paths, cycles, connectivity, trees, and the surprising theorem that tells you from the degrees alone whether an Euler walk exists. You will model a school campus as a graph and add the **Campus Graph Builder** to your dossier.

## Learning Objectives

1. Use graph terminology: vertices, edges, degree, path, cycle, connected, component, bridge, tree.
2. Prove and use the handshaking lemma, and represent a graph by an adjacency list and an adjacency matrix.
3. Decide whether a graph has an Euler circuit or path from its degrees, and explain how Hamiltonian cycles differ.
4. Explain trees and spanning trees, and build a minimum spanning tree with Kruskal's algorithm.
5. Find connected components and bridges by program.
6. Build the Campus Graph Builder: degrees, an Euler analysis, connectivity checks and a spanning tree for a campus.

## Prerequisites

- Lesson 2 and 3: sets and relations (a graph is a set of vertices and a relation on them).
- BFS, adjacency lists and the idea of a graph from Course 3.
- Lesson 4 (proofs) and Lesson 5 (counting arguments).

## Concept Explanation

### Graphs and degrees

A **graph** G = (V, E) has a set V of **vertices** and a set E of **edges**, each joining two vertices. In a **simple graph** there are no loops and no repeated edges. Two vertices joined by an edge are **adjacent**; the **degree** of a vertex is the number of edges at it. **The handshaking lemma** says that the sum of all degrees is **exactly twice the number of edges**, because every edge has two ends: Σ deg(v) = 2|E|. A consequence: the number of vertices of odd degree is always even. A **complete graph** Kₙ, with an edge between every pair of its n vertices, has n(n − 1)/2 edges.

A graph is stored as an **adjacency list** (each vertex lists its neighbours) or an **adjacency matrix** (an n × n table with 1 where an edge exists). For an undirected graph the matrix is symmetric, and the row sums are the degrees.

### Paths, cycles and connectivity

A **path** is a sequence of vertices in which consecutive ones are adjacent and none repeats; a **cycle** is a path that returns to its start. A graph is **connected** if there is a path between every pair of vertices; otherwise it splits into **connected components**. An edge whose removal disconnects the graph (or increases the number of components) is a **bridge**: a single point of failure in a network. You can test connectivity with BFS or DFS from any vertex: the graph is connected exactly when the search reaches all vertices.

### Euler paths and circuits

An **Euler circuit** is a closed walk that uses every *edge* exactly once; an **Euler path** is an open one. **Euler's theorem**: a connected graph has an Euler circuit if and only if **every vertex has even degree**, and an Euler path (but no circuit) if and only if **exactly two vertices have odd degree**; the path must start at one of the odd vertices and end at the other. Intuition: every time a walk enters a vertex through one edge it leaves through another, so edges at a vertex come in pairs, except at the start and end. Königsberg's graph had four vertices of odd degree, so no walk existed. A **Hamiltonian cycle** visits every *vertex* exactly once; unlike Euler's case there is no simple test, and the problem is hard (NP-complete).

### Trees and spanning trees

A **tree** is a connected graph with **no cycles**. A tree with n vertices always has **exactly n − 1 edges**, and between any two vertices there is exactly one path. A **spanning tree** of a connected graph is a tree that contains every vertex, using some of the graph's edges: it keeps the network connected with the fewest links. In a **weighted** graph, a **minimum spanning tree (MST)** has the smallest possible total weight (the cheapest cabling). **Kruskal's algorithm** is a greedy method (as in Course 3): sort the edges by weight and add each edge unless it would create a cycle. To detect cycles quickly, keep the vertices in groups with a **union-find** structure: an edge is safe only if its ends are in different groups.

### Why graphs matter

Roads and maps (shortest paths), networks (connectivity and bridges), scheduling (colouring a graph so that neighbours get different colours), social networks (degrees and communities), and compilers (dependency graphs). The same few ideas, degrees, paths, trees, apply to all of them.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Vertex / edge** | A point of a graph; a connection between two vertices. |
| **Degree** | The number of edges at a vertex. |
| **Handshaking lemma** | The sum of the degrees equals twice the number of edges. |
| **Path / cycle** | A sequence of adjacent vertices without repeats; a path that returns to its start. |
| **Connected component** | A maximal set of vertices that are all joined by paths. |
| **Bridge** | An edge whose removal disconnects the graph. |
| **Euler circuit / path** | A walk that uses every edge exactly once (closed / open). |
| **Hamiltonian cycle** | A cycle that visits every vertex exactly once. |
| **Tree / spanning tree** | A connected graph without cycles; a tree that contains every vertex. |
| **Minimum spanning tree** | A spanning tree of least total weight. |

## Worked Examples

### Example 1: Degrees, the handshaking lemma and a matrix

```python
names = ["A", "B", "C", "D", "E"]
edges = [("A", "B"), ("A", "C"), ("B", "C"), ("C", "D"), ("D", "E")]
index = {name: i for i, name in enumerate(names)}

adjacent = {name: [] for name in names}
matrix = [[0] * len(names) for _ in names]
for a, b in edges:
    adjacent[a].append(b)
    adjacent[b].append(a)
    matrix[index[a]][index[b]] = matrix[index[b]][index[a]] = 1

for name in names:
    print(f"{name}: neighbours {adjacent[name]}, degree {len(adjacent[name])}")
total = sum(len(v) for v in adjacent.values())
print("sum of degrees:", total, "| twice the edges:", 2 * len(edges))
print("adjacency matrix:")
for name, row in zip(names, matrix):
    print(" ", name, row, "row sum", sum(row))
```

```output
A: neighbours ['B', 'C'], degree 2
B: neighbours ['A', 'C'], degree 2
C: neighbours ['A', 'B', 'D'], degree 3
D: neighbours ['C', 'E'], degree 2
E: neighbours ['D'], degree 1
sum of degrees: 10 | twice the edges: 10
adjacency matrix:
  A [0, 1, 1, 0, 0] row sum 2
  B [1, 0, 1, 0, 0] row sum 2
  C [1, 1, 0, 1, 0] row sum 3
  D [0, 0, 1, 0, 1] row sum 2
  E [0, 0, 0, 1, 0] row sum 1
```

1. Each edge adds one to the degree of each of its two ends, so the degrees always sum to twice the number of edges: 10 here.
2. The adjacency matrix is symmetric (an undirected graph), and the sum of each row equals the degree of that vertex.
3. The vertices of odd degree are C (degree 3) and E (degree 1). The number of odd vertices, two, is even, as the lemma predicts.
4. Lists use less memory for sparse graphs; matrices answer "is there an edge between A and B?" in one lookup.

### Example 2: Connectivity and Euler's theorem

```python
def components(vertices, edges):
    adjacent = {v: [] for v in vertices}
    for a, b in edges:
        adjacent[a].append(b)
        adjacent[b].append(a)
    seen, groups = set(), []
    for start in vertices:
        if start in seen:
            continue
        group, stack = [], [start]
        seen.add(start)
        while stack:
            v = stack.pop()
            group.append(v)
            for w in adjacent[v]:
                if w not in seen:
                    seen.add(w)
                    stack.append(w)
        groups.append(sorted(group))
    return groups


def euler_verdict(vertices, edges):
    degree = {v: 0 for v in vertices}
    for a, b in edges:
        degree[a] += 1
        degree[b] += 1
    odd = sorted(v for v in vertices if degree[v] % 2 == 1)
    if len(components(vertices, edges)) > 1:
        return "not connected"
    if not odd:
        return "Euler circuit exists"
    if len(odd) == 2:
        return f"Euler path exists from {odd[0]} to {odd[1]}"
    return f"no Euler walk ({len(odd)} odd vertices)"


square = ["A", "B", "C", "D"]
print("square:", euler_verdict(square, [("A", "B"), ("B", "C"), ("C", "D"), ("D", "A")]))
print("square with one diagonal:", euler_verdict(square, [("A", "B"), ("B", "C"), ("C", "D"), ("D", "A"), ("A", "C")]))
print("square with both diagonals:", euler_verdict(square, [("A", "B"), ("B", "C"), ("C", "D"), ("D", "A"), ("A", "C"), ("B", "D")]))
print("two separate edges:", euler_verdict(square, [("A", "B"), ("C", "D")]))
```

```output
square: Euler circuit exists
square with one diagonal: Euler path exists from A to C
square with both diagonals: no Euler walk (4 odd vertices)
two separate edges: not connected
```

1. `components` explores from each unvisited vertex with a stack (a depth-first search) and collects what it reaches: one group per component.
2. In the plain square every degree is 2 (even), so there is an Euler circuit. One diagonal makes A and C odd (degree 3), so there is an Euler *path* between them.
3. Both diagonals make every degree 3: four odd vertices, so no Euler walk exists at all, as in Königsberg.
4. A disconnected graph fails the theorem's first condition: it has no walk that reaches every edge.

### Example 3: Kruskal's minimum spanning tree

```python
edges = [(4, "A", "B"), (8, "A", "C"), (2, "B", "C"), (7, "B", "D"), (3, "C", "D"), (5, "C", "E"), (6, "D", "E")]
parent = {v: v for v in "ABCDE"}


def find(v):
    while parent[v] != v:
        parent[v] = parent[parent[v]]
        v = parent[v]
    return v


chosen, total = [], 0
for weight, a, b in sorted(edges):
    root_a, root_b = find(a), find(b)
    if root_a != root_b:
        parent[root_a] = root_b
        chosen.append((a, b, weight))
        total += weight
        print(f"take {a}-{b} ({weight})")
    else:
        print(f"skip {a}-{b} ({weight}): it would make a cycle")
print("spanning tree edges:", len(chosen), "(a tree on 5 vertices has 4) | total weight", total)
```

```output
take B-C (2)
take C-D (3)
take A-B (4)
take C-E (5)
skip D-E (6): it would make a cycle
skip B-D (7): it would make a cycle
skip A-C (8): it would make a cycle
spanning tree edges: 4 (a tree on 5 vertices has 4) | total weight 14
```

1. Kruskal sorts the edges by weight and looks at the cheapest first. B–C (2) and C–D (3) are always safe.
2. `find` returns the "group leader" of a vertex. An edge is added only if its ends have different leaders, so it joins two groups and never creates a cycle.
3. The edge A–B (4) joins A to the group {B, C, D}; C–E (5) adds E. The remaining edges would each close a cycle, so they are skipped.
4. The result has 4 edges for 5 vertices (a tree) and total weight 14: the cheapest way to connect all five places.

## Common Mistakes and Misconceptions

- **Confusing walks and paths.** A path never repeats a vertex; a walk may.
- **Mixing up Euler and Hamiltonian.** Euler: every *edge* once (easy test by degrees). Hamiltonian: every *vertex* once (no easy test).
- **Forgetting that the graph must be connected.** The even-degree test only works for a connected graph (ignoring isolated vertices).
- **Counting a tree's edges wrongly.** A tree on n vertices has n − 1 edges, no more and no fewer.
- **Calling any connected graph a tree.** A tree has no cycles.
- **Thinking the MST is unique, or that it has the shortest paths.** An MST minimises total weight, not the distance between two particular places (that is Dijkstra's job).
- **Using the matrix for huge sparse graphs.** The memory grows as n².
- **Counting each undirected edge twice in a list.** Count each edge once; remember that the degree sum counts it twice.

## Guided Hands-On Activity

**Draw, count, compute.** Work with your teacher.

1. Draw the graph of Königsberg: four land areas A, B, C, D and seven bridges (A–B twice, A–C twice, A–D, B–D, C–D). Compute the degree of each vertex and use Euler's theorem to settle the puzzle.
2. Type Example 1 and add the edge ("E", "A"). Which vertices have odd degree now, and what happens to the sum of degrees?
3. In Example 2, find the smallest number of edges to add to the "two separate edges" graph so that an Euler path exists.
4. Draw K₅. How many edges does it have? Is there an Euler circuit? (Check the degrees.)
5. In Example 3, change the weight of A–C from 8 to 1. Predict the new MST before running it.
6. List three real situations from your school or home that are graphs, and say what the vertices and edges are in each.

## Lesson Project: Campus Graph Builder

### Objective

Add the **Campus Graph Builder** to the dossier: model a school campus as a weighted graph, then use a Python program to report its degrees, check the handshaking lemma, build the adjacency matrix, find components and bridges, decide whether the groundskeeper can walk every path exactly once, and compute the cheapest cabling (a minimum spanning tree).

### Requirements

- Nine places: Gate, Library, Lab, Canteen, Hall, Office, Field, Dorm, Garden; and ten paths with lengths in metres: Gate–Library 120, Gate–Canteen 80, Library–Lab 60, Library–Hall 90, Canteen–Lab 70, Canteen–Field 100, Hall–Office 40, Field–Dorm 110, Dorm–Office 55, Dorm–Garden 45.
- Print the degree of every place, and check the handshaking lemma.
- Print the 9 × 9 adjacency matrix (0 and 1), one row per place.
- Print the number of connected components, and find every **bridge** by removing each path in turn and recounting the components.
- Decide whether an Euler circuit or path exists; if not, list the places of odd degree and suggest one new path that would help.
- Build a minimum spanning tree with Kruskal's algorithm and print the chosen paths, their total length, the total length of all paths and the saving.
- In the dossier, draw the campus graph, mark the bridge and the odd-degree places, and explain in a paragraph why the Garden path is a risk.

### Instructions

1. Store the places and paths as lists, and build the degree dictionary and the adjacency matrix.
2. Write `components(vertices, edges)` as in Example 2, and check that the campus is connected.
3. For each path, call `components` on the edge list without that path; a path is a bridge if the number of components goes up.
4. Count the odd-degree places and give the Euler verdict, using the rules of the theorem.
5. Write Kruskal's algorithm with a union-find (`find`), as in Example 3, and print the chosen paths in order.
6. Compute the saving: the total of all the paths minus the total of the tree.
7. Compare with the expected output, and complete the dossier page.

### Expected Output

```text
Degrees
  Gate    2
  Library 3
  Lab     2
  Canteen 3
  Hall    2
  Office  2
  Field   2
  Dorm    3
  Garden  1
  sum of degrees 20 = 2 x 10 paths: True

Adjacency matrix (Gate, Library, Lab, Canteen, Hall, Office, Field, Dorm, Garden)
  Gate    0 1 0 1 0 0 0 0 0
  Library 1 0 1 0 1 0 0 0 0
  Lab     0 1 0 1 0 0 0 0 0
  Canteen 1 0 1 0 0 0 1 0 0
  Hall    0 1 0 0 0 1 0 0 0
  Office  0 0 0 0 1 0 0 1 0
  Field   0 0 0 1 0 0 0 1 0
  Dorm    0 0 0 0 0 1 1 0 1
  Garden  0 0 0 0 0 0 0 1 0

Connectivity
  components: 1
  bridges: [('Dorm', 'Garden')]

Euler analysis
  places of odd degree: ['Library', 'Canteen', 'Dorm', 'Garden']
  no Euler circuit or path: the groundskeeper cannot walk every path exactly once

Minimum spanning tree (Kruskal)
  Hall-Office 40
  Dorm-Garden 45
  Dorm-Office 55
  Library-Lab 60
  Canteen-Lab 70
  Gate-Canteen 80
  Library-Hall 90
  Canteen-Field 100
  tree length 540 m, all paths 770 m, saving 230 m
```

### Hints

1. **Hint 1 (the graph).** Keep `edges` as tuples `(a, b, length)`, and pass `[(a, b) for a, b, _ in edges]` to `components`.
2. **Hint 2 (the matrix).** `index = {name: i}`; set both `matrix[i][j]` and `matrix[j][i]` to 1.
3. **Hint 3 (bridges).** `without = edges[:i] + edges[i + 1:]`; if `len(components(...without...)) > len(components(...edges...))`, edge `i` is a bridge.
4. **Hint 4 (the Euler verdict).** Zero odd places: a circuit; exactly two: a path between them; otherwise none.
5. **Hint 5 (one new path).** Joining two odd places with a new edge makes both even: pick the two places that are nearest.
6. **Hint 6 (Kruskal).** Sort by length, and union two groups only when their `find` results differ.

### Success Criteria

- [ ] The degrees are correct and the degree sum is 20, twice the 10 paths.
- [ ] The matrix is symmetric, and its row sums equal the degrees.
- [ ] Exactly one bridge, Dorm–Garden, is found, and the campus has one component.
- [ ] The Euler analysis lists the four odd places (Library, Canteen, Dorm, Garden) and says no Euler walk exists.
- [ ] The MST has 8 paths and a total length of 540 metres, saving 230 metres.
- [ ] The dossier page contains the graph with the bridge and a clear explanation of the risk.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Write a function that finds **all articulation points**, places whose removal (together with their paths) disconnects the campus, and report them. Then write a function that uses a simple backtracking search to decide whether the campus graph has a **Hamiltonian path** (a path through all nine places), and compare the effort with Euler's theorem, which needed only the degrees.

## Lesson Recap

- A graph has vertices and edges; the **degree** counts edges at a vertex, and the **handshaking lemma** says the degrees sum to twice the number of edges.
- Graphs are stored as adjacency lists or matrices; **connected components** and **bridges** show the weak points of a network.
- **Euler's theorem**: a connected graph has an Euler circuit if all degrees are even, and an Euler path if exactly two are odd. Hamiltonian cycles have no such easy test.
- A **tree** is a connected graph without cycles, with n − 1 edges; a **spanning tree** connects all vertices, and Kruskal's greedy algorithm builds a **minimum spanning tree**.
- Many real problems are graph problems once you choose the vertices and the edges.

## Homework / Extension Mission

Model your own neighbourhood or a transport map (at least eight places and twelve connections) as a graph in Python. Compute its degrees, its components, its bridges, and its minimum spanning tree with the real distances, and decide whether a postman could deliver letters along every street exactly once. Then write a paragraph: which place is the most important single point of failure, and what one new connection would make your network most robust?

## Course Project Connection

This lesson adds the **Campus Graph Builder** to the **Computational Logic Challenge** dossier. It reuses relations (a graph is a symmetric relation on the vertices, Lesson 3), proofs and counting arguments (the handshaking lemma, Lessons 4 and 5), and the idea of a greedy algorithm. In Lesson 7 you will count paths with recurrences, and in Course 6 the same graphs model computer networks, routers and attack surfaces.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the Königsberg story. 10 minutes: degrees, the handshaking lemma and representations (Example 1). 10 minutes: Euler's theorem (Example 2) with students tracing walks. 30 minutes: trees, Kruskal (Example 3) and the project.

**Live demonstrations.** Try to draw a figure without lifting the pencil (the "envelope" and the "house with an X"), then count odd vertices. Run Kruskal by hand on cards. Delete a bridge from the campus graph and show the component count change.

**Misconceptions.** "A path can revisit vertices." "A tree can have a cycle." "Euler and Hamilton are the same problem." "The MST gives the shortest route between two places."

**Assessment of the project.** Check the degree sum, the symmetric matrix, the bridge search, the Euler verdict (four odd places), and the MST total (540) and saving (230). Ask each student to explain why a bridge is a risk and how adding one path fixes it.

**Reference solution `campus_graph.py`** (run with `python3 campus_graph.py`):

```python
"""Campus Graph Builder: the sixth entry of the Computational Logic Challenge dossier."""
PLACES = ["Gate", "Library", "Lab", "Canteen", "Hall", "Office", "Field", "Dorm", "Garden"]
PATHS = [
    ("Gate", "Library", 120), ("Gate", "Canteen", 80), ("Library", "Lab", 60), ("Library", "Hall", 90),
    ("Canteen", "Lab", 70), ("Canteen", "Field", 100), ("Hall", "Office", 40), ("Field", "Dorm", 110),
    ("Dorm", "Office", 55), ("Dorm", "Garden", 45),
]


def components(vertices, edges):
    adjacent = {v: [] for v in vertices}
    for a, b in edges:
        adjacent[a].append(b)
        adjacent[b].append(a)
    seen, groups = set(), []
    for start in vertices:
        if start in seen:
            continue
        group, stack = [], [start]
        seen.add(start)
        while stack:
            v = stack.pop()
            group.append(v)
            for w in adjacent[v]:
                if w not in seen:
                    seen.add(w)
                    stack.append(w)
        groups.append(sorted(group))
    return groups


degree = {p: 0 for p in PLACES}
for a, b, _ in PATHS:
    degree[a] += 1
    degree[b] += 1
print("Degrees")
for place in PLACES:
    print(f"  {place:<8}{degree[place]}")
print(f"  sum of degrees {sum(degree.values())} = 2 x {len(PATHS)} paths:", sum(degree.values()) == 2 * len(PATHS))

index = {p: i for i, p in enumerate(PLACES)}
matrix = [[0] * len(PLACES) for _ in PLACES]
for a, b, _ in PATHS:
    matrix[index[a]][index[b]] = matrix[index[b]][index[a]] = 1
print("\nAdjacency matrix (Gate, Library, Lab, Canteen, Hall, Office, Field, Dorm, Garden)")
for place, row in zip(PLACES, matrix):
    print(f"  {place:<8}{' '.join(str(x) for x in row)}")

plain = [(a, b) for a, b, _ in PATHS]
print("\nConnectivity")
print("  components:", len(components(PLACES, plain)))
bridges = [PATHS[i][:2] for i in range(len(PATHS)) if len(components(PLACES, plain[:i] + plain[i + 1:])) > len(components(PLACES, plain))]
print("  bridges:", bridges)

odd = [p for p in PLACES if degree[p] % 2 == 1]
print("\nEuler analysis")
print("  places of odd degree:", odd)
if not odd:
    print("  an Euler circuit exists")
elif len(odd) == 2:
    print(f"  an Euler path exists from {odd[0]} to {odd[1]}")
else:
    print("  no Euler circuit or path: the groundskeeper cannot walk every path exactly once")

parent = {p: p for p in PLACES}


def find(p):
    while parent[p] != p:
        parent[p] = parent[parent[p]]
        p = parent[p]
    return p


print("\nMinimum spanning tree (Kruskal)")
total = 0
for a, b, length in sorted(PATHS, key=lambda e: e[2]):
    if find(a) != find(b):
        parent[find(a)] = find(b)
        total += length
        print(f"  {a}-{b} {length}")
everything = sum(length for _, _, length in PATHS)
print(f"  tree length {total} m, all paths {everything} m, saving {everything - total} m")
```

```output
Degrees
  Gate    2
  Library 3
  Lab     2
  Canteen 3
  Hall    2
  Office  2
  Field   2
  Dorm    3
  Garden  1
  sum of degrees 20 = 2 x 10 paths: True

Adjacency matrix (Gate, Library, Lab, Canteen, Hall, Office, Field, Dorm, Garden)
  Gate    0 1 0 1 0 0 0 0 0
  Library 1 0 1 0 1 0 0 0 0
  Lab     0 1 0 1 0 0 0 0 0
  Canteen 1 0 1 0 0 0 1 0 0
  Hall    0 1 0 0 0 1 0 0 0
  Office  0 0 0 0 1 0 0 1 0
  Field   0 0 0 1 0 0 0 1 0
  Dorm    0 0 0 0 0 1 1 0 1
  Garden  0 0 0 0 0 0 0 1 0

Connectivity
  components: 1
  bridges: [('Dorm', 'Garden')]

Euler analysis
  places of odd degree: ['Library', 'Canteen', 'Dorm', 'Garden']
  no Euler circuit or path: the groundskeeper cannot walk every path exactly once

Minimum spanning tree (Kruskal)
  Hall-Office 40
  Dorm-Garden 45
  Dorm-Office 55
  Library-Lab 60
  Canteen-Lab 70
  Gate-Canteen 80
  Library-Hall 90
  Canteen-Field 100
  tree length 540 m, all paths 770 m, saving 230 m
```

**Differentiation.** Support: provide the data, `components` and the degree table, and let students write the bridges, the Euler verdict and Kruskal. Stretch: add the articulation points, a Hamiltonian-path backtracker and a comparison of Kruskal with Prim.

**Discussion questions (not for the student quiz).** Why does Euler's argument use only the degrees and not the shape of the graph? Why might a hospital network prefer a graph with no bridges?
