# Lumexa Mission Log: Data Structures & Algorithmic Problem-Solving

**Course/Path:** Data Structures & Algorithmic Problem-Solving
**Lesson:** 07 of 08
**Title:** Graphs, BFS, DFS and Shortest-Path Concepts
**Duration:** 60 minutes
**Difficulty:** Advanced
**Technology:** C++ (g++)

---

## Mission Brief

When your phone gives you walking directions from the school gate to the library, it is solving a graph problem. So is the social network that suggests "people you may know", the search engine that follows links from page to page, and the build tool that decides which program to compile first. A **graph** is the most general data structure there is: a set of things (**vertices**) and the connections between them (**edges**).

Trees, which you met last lesson, are a special kind of graph. Graphs have cycles, several routes between two places, and sometimes no route at all, which makes them far more interesting. In this lesson you learn how to store a graph, how to explore it in two different ways (**breadth-first** and **depth-first search**) and how to find the shortest route, first by counting roads and then by adding up minutes. You will put it all into the **Graph Explorer**, a walking-time map of a school campus.

## Learning Objectives

1. Use graph vocabulary: vertex, edge, directed, weighted, degree, path, cycle, connected and component.
2. Represent a graph with an adjacency matrix and an adjacency list, and compare their costs.
3. Implement breadth-first search with a queue, and use it to find the fewest-edges path.
4. Implement depth-first search with recursion, and use it to explore connectivity.
5. Explain why BFS fails for weighted graphs, and describe and implement Dijkstra's algorithm with a priority queue.
6. Build the Graph Explorer: a campus graph with BFS, DFS and shortest-time routes.

## Prerequisites

- Lesson 4: the queue; Lesson 5: recursion and the heap (`priority_queue`); Lesson 1: Big O.
- Lesson 6: a hash table could map place names to numbers (we use plain indexes).

## Concept Explanation

### Graphs

A **graph** G = (V, E) has a set of **vertices** (nodes) and a set of **edges** joining pairs of them. In an **undirected** graph an edge works both ways (a footpath); in a **directed** graph it has a direction (a one-way street, a link from one web page to another). In a **weighted** graph each edge has a number, such as a distance or a cost. The **degree** of a vertex is the number of edges at it. A **path** is a sequence of vertices joined by edges; a **cycle** is a path that returns to its start. A graph is **connected** if there is a path between every pair of vertices; otherwise it falls into separate **connected components**. A tree is a connected graph with no cycles.

### Representing a graph

| | Adjacency matrix | Adjacency list |
|---|---|---|
| What it is | a V × V table; cell (i, j) is 1 (or the weight) if the edge exists | for every vertex, a list of its neighbours |
| Memory | O(V²) | O(V + E) |
| Is there an edge between i and j? | O(1) | O(degree of i) |
| List the neighbours of i | O(V) | O(degree of i) |
| Best for | small or dense graphs | large, sparse graphs (most real ones) |

In C++ an adjacency list is simply `vector<vector<int>> adj;`, or `vector<vector<Edge>>` when edges carry weights.

### Breadth-first search (BFS)

**BFS** explores a graph in rings around the start: first the start, then all its neighbours, then *their* neighbours, and so on. It uses a **queue** (Lesson 4): take a vertex from the front, add each unvisited neighbour to the back and mark it visited. A **visited** array stops it from going round cycles forever. BFS visits every vertex and edge once, so it costs **O(V + E)**. Because it finishes each ring before starting the next, the first time it reaches a vertex is by a path with the **fewest edges**: BFS finds the shortest path in an **unweighted** graph. Remember each vertex's **parent** to rebuild the path.

### Depth-first search (DFS)

**DFS** goes as deep as possible along one path before backing up, like exploring a maze with a ball of string. It is easiest to write **recursively**: visit a vertex, mark it, and call DFS on each unvisited neighbour (the call stack plays the part of the stack). It also costs **O(V + E)**. DFS is the tool for **connectivity** (count the components), **cycle detection**, **topological ordering** of tasks with dependencies, and solving mazes. It does *not* find shortest paths.

### Shortest paths with weights

When edges have different weights, the path with the fewest edges is not always the fastest: a direct road of 15 minutes loses to three short roads of 2, 3 and 4 minutes. **Dijkstra's algorithm** handles this for **non-negative** weights. It keeps the best known distance to every vertex (infinity at first, 0 at the start) and a **priority queue** of vertices ordered by distance. It repeatedly takes the closest unfinished vertex and **relaxes** its edges: if going through it gives a shorter route to a neighbour, update the neighbour's distance. With a binary heap it costs **O((V + E) log V)**. With negative weights Dijkstra fails and Bellman-Ford is used; for maps with a known destination, A* adds a guess of the remaining distance to search faster.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Vertex / edge** | A node of a graph; a connection between two vertices. |
| **Directed / weighted** | Edges that have a direction; edges that carry a number. |
| **Degree** | The number of edges at a vertex. |
| **Path / cycle** | A sequence of vertices joined by edges; a path that returns to its start. |
| **Connected component** | A maximal set of vertices that can all reach each other. |
| **Adjacency list** | For every vertex, the list of its neighbours (and weights). |
| **BFS / DFS** | Breadth-first search (ring by ring, with a queue) and depth-first search (deep first, with recursion). |
| **Visited set** | The record of vertices already reached, which stops endless loops. |
| **Relaxation** | Updating a distance when a shorter route to a vertex is found. |
| **Dijkstra's algorithm** | A shortest-path algorithm for non-negative weights, using a priority queue. |

## Worked Examples

### Example 1: Breadth-first search

```cpp
#include <iostream>
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
    cout << '\n';
    for (int v = 0; v < 6; v++) {
        cout << names[v] << ": " << hops[v] << " hop(s)\n";
    }
    string path;
    for (int v = 5; v != -1; v = parent[v]) {
        path = string(1, names[v]) + (path.empty() ? "" : " -> ") + path;
    }
    cout << "path to F: " << path << '\n';
    return 0;
}
```

```output
BFS order: A B C D E F
A: 0 hop(s)
B: 1 hop(s)
C: 1 hop(s)
D: 2 hop(s)
E: 2 hop(s)
F: 3 hop(s)
path to F: A -> B -> D -> F
```

1. The graph is stored as an adjacency list: `adj[a]` lists the neighbours of `a`. The lambda `road` adds an edge in both directions.
2. BFS takes a vertex from the front of the queue, and appends each unvisited neighbour to the back, setting its distance to one more than the current vertex's.
3. The vertices come out in rings: A first; then B and C (one hop); then D and E (two hops); then F (three hops).
4. `hops == -1` doubles as the *visited* marker. The `parent` array records how each vertex was reached, so the path to F is rebuilt by walking back from F to the start.

### Example 2: Depth-first search and components

```cpp
#include <iostream>
#include <vector>
using namespace std;

void dfs(int v, const vector<vector<int>>& adj, vector<bool>& seen, vector<int>& order)
{
    seen[v] = true;
    order.push_back(v);
    for (int next : adj[v]) {
        if (!seen[next]) {
            dfs(next, adj, seen, order);
        }
    }
}

int main()
{
    vector<vector<int>> adj(7);
    auto road = [&](int a, int b) {
        adj[a].push_back(b);
        adj[b].push_back(a);
    };
    road(0, 1);
    road(1, 2);
    road(2, 0);
    road(2, 3);
    road(4, 5);

    vector<bool> seen(7, false);
    int components = 0;
    for (int start = 0; start < 7; start++) {
        if (!seen[start]) {
            vector<int> order;
            dfs(start, adj, seen, order);
            components++;
            cout << "component " << components << ":";
            for (int v : order) {
                cout << ' ' << v;
            }
            cout << '\n';
        }
    }
    cout << "number of components: " << components << '\n';
    return 0;
}
```

```output
component 1: 0 1 2 3
component 2: 4 5
component 3: 6
number of components: 3
```

1. `dfs` marks the vertex, records it and immediately recurses into the first unvisited neighbour, so it dives deep before it backs up.
2. The outer loop starts a new DFS from every vertex not yet seen. Each start begins a new **component**, so counting the starts counts the components.
3. Vertices 0, 1, 2 and 3 form one component (with a cycle 0-1-2), 4 and 5 another, and 6 is alone: three components.
4. The `seen` array makes the cycle 0-1-2 harmless. Without it, DFS would go round the triangle forever.

### Example 3: Dijkstra's algorithm

```cpp
#include <climits>
#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>
using namespace std;

struct Edge {
    int to;
    int weight;
};

int main()
{
    const string names = "ABCDE";
    vector<vector<Edge>> adj(5);
    auto road = [&](int a, int b, int w) {
        adj[a].push_back({b, w});
        adj[b].push_back({a, w});
    };
    road(0, 1, 4);
    road(0, 2, 1);
    road(2, 1, 2);
    road(1, 3, 1);
    road(2, 3, 5);
    road(3, 4, 3);

    vector<int> dist(5, INT_MAX);
    vector<int> parent(5, -1);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    dist[0] = 0;
    pq.push({0, 0});
    while (!pq.empty()) {
        auto [d, v] = pq.top();
        pq.pop();
        if (d > dist[v]) {
            continue;
        }
        for (const Edge& e : adj[v]) {
            if (dist[v] + e.weight < dist[e.to]) {
                dist[e.to] = dist[v] + e.weight;
                parent[e.to] = v;
                pq.push({dist[e.to], e.to});
            }
        }
    }
    for (int v = 0; v < 5; v++) {
        cout << names[v] << ": " << dist[v] << '\n';
    }
    string path;
    for (int v = 4; v != -1; v = parent[v]) {
        path = string(1, names[v]) + (path.empty() ? "" : " -> ") + path;
    }
    cout << "fastest route to E: " << path << '\n';
    return 0;
}
```

```output
A: 0
B: 3
C: 1
D: 4
E: 7
fastest route to E: A -> C -> B -> D -> E
```

1. `priority_queue` with `greater` is a **min**-heap of (distance, vertex) pairs: the closest unfinished vertex is always on top.
2. A road A-B of 4 is *not* the best way to B: going A → C → B costs 1 + 2 = 3. The relaxation `dist[v] + weight < dist[e.to]` finds this and updates B.
3. The check `d > dist[v]` skips stale queue entries: a vertex may be queued several times with worse distances.
4. The distances are final once a vertex leaves the queue, which is why non-negative weights are required. The `parent` array rebuilds the route A → C → B → D → E, 7 minutes in total.

## Common Mistakes and Misconceptions

- **No visited set.** On a graph with a cycle, BFS or DFS then never terminates. Mark vertices when you first *reach* them.
- **Marking visited too late in BFS.** If you mark a vertex only when you take it from the queue, it may be queued many times. Mark it when you add it.
- **Using BFS for weighted shortest paths.** BFS minimises the number of edges, not the total weight. Use Dijkstra.
- **Using Dijkstra with negative weights.** It can finish a vertex too early and give wrong answers. Use Bellman-Ford.
- **Forgetting the second direction of an undirected edge.** Add both `adj[a]` and `adj[b]`.
- **Believing DFS finds shortest paths.** It finds *a* path, often a long one.
- **Choosing a matrix for a huge sparse graph.** A graph of a million vertices would need 10¹² cells. Use adjacency lists.
- **Confusing a tree with a graph.** A tree is a connected graph without cycles; general graphs can have cycles and several components.

## Guided Hands-On Activity

**Explore a map.** Work with your teacher.

1. Draw the graph of Example 1 on paper. Run BFS by hand with a queue drawn on the side, and compare with the program's order.
2. Change the order in which `road` calls are made in Example 1. Does the BFS order change? Do the hop counts change? What does that tell you?
3. In Example 2, add the road `road(3, 4)` and run it again. How many components are there now?
4. Write a recursive DFS for Example 1's graph and print its visit order. How does it differ from the BFS order?
5. In Example 3, change the weight of A-B from 4 to 2 and predict the new distances and the new route before you run it.
6. Add a direct road A-E with weight 20 to Example 3. Does the fastest route change? What would BFS say is the shortest route to E?

## Lesson Project: Algorithm Explorer: Graph Explorer

### Objective

Add the **Graph Explorer** to the Algorithm Explorer: model a school campus as a weighted graph, explore it with BFS and DFS, count its connected components, and find the fastest walking route from the gate to every place with Dijkstra, comparing it with the route that uses the fewest roads.

### Requirements

- A `Graph` class with place names, an adjacency list of weighted roads (`vector<vector<Edge>>`), `add_place` and `add_road`.
- `bfs(start, hops, parent)` that fills the fewest-roads distance and the parent of every reachable place and returns the visit order.
- A recursive `dfs` that returns the visit order, and `components()` that counts the connected components.
- `dijkstra(start, minutes, parent)` using a `priority_queue`, and `route(parent, target)` that returns the route as text.
- The campus has nine places and eleven roads (listed in the reference solution), and the *Garden* has no road, so it is unreachable.
- `main` prints the BFS order, the DFS order, the number of components, and a table with the hops, the minutes and the fastest route to each place; the Dorm shows why "fewest roads" and "fastest" differ.

### Instructions

1. Write `Graph` with `add_place`, `add_road` (in both directions) and a method that returns the number of places and roads.
2. Write `bfs` with a queue, a `hops` vector initialised to -1 and a `parent` vector.
3. Write the recursive `dfs` and `components`, using one `seen` vector.
4. Write `dijkstra` with a min-heap and `route` that follows the parents back and builds `A -> B -> C`.
5. Build the campus graph, print the three summaries and the table with `setw`.
6. Print `unreachable` for places with no path.
7. Compare with the expected output, and write a comment explaining why the Dorm's BFS route and its Dijkstra route are different.

### Expected Output

```text
Campus map: 9 places, 11 roads
BFS from Gate: Gate, Library, Canteen, Dorm, Hall, Office, Lab, Field
DFS from Gate: Gate, Library, Hall, Lab, Canteen, Field, Dorm, Office
Connected components: 2

Place      roads  minutes  fastest route
Library        1        4  Gate -> Library
Canteen        1        2  Gate -> Canteen
Lab            2        5  Gate -> Canteen -> Lab
Hall           2        9  Gate -> Library -> Hall
Office         2       10  Gate -> Library -> Office
Field          2        5  Gate -> Canteen -> Field
Dorm           1        9  Gate -> Canteen -> Field -> Dorm
Garden     unreachable

Fewest roads to the Dorm: Gate -> Dorm (1 road)
```

### Hints

1. **Hint 1 (adding roads).** `add_road(a, b, w)` does two `push_back` calls: `adj_[a].push_back({b, w});` and `adj_[b].push_back({a, w});`.
2. **Hint 2 (BFS bookkeeping).** Mark `hops[next]` when you *add* `next` to the queue, not when you remove it.
3. **Hint 3 (the min-heap).** `priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>>` with `{distance, vertex}` pairs.
4. **Hint 4 (building the route).** Walk from the target with `v = parent[v]` until `-1`, adding each name to the *front* of the text.
5. **Hint 5 (unreachable places).** A place with `minutes == INT_MAX` was never reached; print `unreachable` instead of numbers.
6. **Hint 6 (DFS order).** The order depends on the order in which roads were added; that is normal.

### Success Criteria

- [ ] The graph is an adjacency list of weighted edges with both directions stored.
- [ ] BFS reports the fewest roads and DFS visits every reachable place once; the number of components is 2.
- [ ] Dijkstra gives 9 minutes to the Dorm by the route Gate → Canteen → Field → Dorm, while BFS says the Dorm is 1 road away.
- [ ] The Garden is reported as unreachable and does not break the table.
- [ ] No algorithm visits a place twice or loops forever.
- [ ] The code compiles with `-Wall -Wextra` and no warnings, and the output matches the expected output.

### Extension Challenge

Add a method `has_cycle()` using DFS (remember the parent so that the edge back to it does not count as a cycle). Then add **A\*-style** thinking: give each place map coordinates, and compare the number of vertices Dijkstra settles with the number a version settles when its priority is `distance + straight-line distance to the target`.

## Lesson Recap

- A **graph** is vertices and edges; edges may be directed or weighted, and a graph may have cycles and several components.
- Store sparse graphs as **adjacency lists** (O(V + E) memory); matrices need O(V²).
- **BFS** (queue) explores in rings and finds the fewest-edges path; **DFS** (recursion) goes deep and finds components and cycles. Both are O(V + E).
- With weights, fewest edges is not fastest: **Dijkstra** with a min-heap finds the cheapest routes for non-negative weights in O((V + E) log V).
- Always keep a visited set (or distance array) so that cycles cannot trap the search.

## Homework / Extension Mission

Use BFS on a grid to solve a maze: read a small map of `.` (free) and `#` (wall) characters, a start `S` and an end `E`, and print the length of the shortest path (the grid is an implicit graph: each cell's neighbours are the four cells next to it). Then answer in a paragraph: why does BFS find the shortest path on the maze, and what would you change to make it work if some squares (mud) took 3 minutes to cross instead of 1?

## Course Project Connection

This lesson adds the **Graph Explorer** to the **Algorithm Explorer**. It reuses the queue of Lesson 4 (BFS), the recursion of Lesson 5 (DFS) and the heap of Lesson 5 (Dijkstra), so you can see how the earlier structures work together. In Lesson 8 the final comparison menu will let a user run every algorithm of the course, including these, and compare the counts. In Course 6 the same graphs describe computer networks and routing.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: graph vocabulary with maps and social networks. 10 minutes: adjacency lists and BFS drawn with a class "queue" (Example 1). 10 minutes: DFS and components (Example 2). 30 minutes: Dijkstra intuition (Example 3), then the project as a guided build.

**Live demonstrations.** Use the interactive graph visual to step through BFS, DFS and Dijkstra. Have students stand as vertices holding string "edges" and pass a token to show BFS rings. Show a graph with a negative edge where Dijkstra goes wrong.

**Misconceptions.** "BFS and DFS find the same paths." "The shortest path always has the fewest edges." "A graph must be connected." "DFS is just BFS with a different data structure" (replacing the queue by a stack does give a DFS-like order, but recursion is the clearer idea).

**Assessment of the project.** Check the visited logic, both directions of each road, the min-heap, the stale-entry check and the handling of the unreachable Garden. Ask each student to explain why the Dorm has 1 hop but 9 minutes.

**Reference solution `graph_explorer.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra graph_explorer.cpp -o graph_explorer`):

```cpp
// Algorithm Explorer, Lesson 7: Graph Explorer.
#include <climits>
#include <functional>
#include <iomanip>
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>
using namespace std;

struct Edge {
    int to;
    int minutes;
};

class Graph {
private:
    vector<string> names_;
    vector<vector<Edge>> adj_;
    size_t roads_ = 0;

    void dfs_visit(int v, vector<bool>& seen, vector<int>& order) const
    {
        seen[v] = true;
        order.push_back(v);
        for (const Edge& e : adj_[v]) {
            if (!seen[e.to]) {
                dfs_visit(e.to, seen, order);
            }
        }
    }

public:
    int add_place(const string& name)
    {
        names_.push_back(name);
        adj_.emplace_back();
        return static_cast<int>(names_.size()) - 1;
    }

    void add_road(int a, int b, int minutes)
    {
        adj_[a].push_back({b, minutes});
        adj_[b].push_back({a, minutes});
        roads_++;
    }

    size_t places() const { return names_.size(); }
    size_t roads() const { return roads_; }
    const string& name(int v) const { return names_[v]; }

    // O(V + E): fewest roads from start.
    vector<int> bfs(int start, vector<int>& hops, vector<int>& parent) const
    {
        hops.assign(names_.size(), -1);
        parent.assign(names_.size(), -1);
        vector<int> order;
        queue<int> q;
        hops[start] = 0;
        q.push(start);
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            order.push_back(v);
            for (const Edge& e : adj_[v]) {
                if (hops[e.to] == -1) {
                    hops[e.to] = hops[v] + 1;
                    parent[e.to] = v;
                    q.push(e.to);
                }
            }
        }
        return order;
    }

    // O(V + E): deep first, recursive.
    vector<int> dfs(int start) const
    {
        vector<bool> seen(names_.size(), false);
        vector<int> order;
        dfs_visit(start, seen, order);
        return order;
    }

    // O(V + E): one DFS per component.
    int components() const
    {
        vector<bool> seen(names_.size(), false);
        int count = 0;
        for (size_t v = 0; v < names_.size(); v++) {
            if (!seen[v]) {
                vector<int> ignore;
                dfs_visit(static_cast<int>(v), seen, ignore);
                count++;
            }
        }
        return count;
    }

    // O((V + E) log V): fastest minutes from start (non-negative weights).
    void dijkstra(int start, vector<int>& minutes, vector<int>& parent) const
    {
        minutes.assign(names_.size(), INT_MAX);
        parent.assign(names_.size(), -1);
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
        minutes[start] = 0;
        pq.push({0, start});
        while (!pq.empty()) {
            pair<int, int> top = pq.top();
            pq.pop();
            int d = top.first;
            int v = top.second;
            if (d > minutes[v]) {
                continue;
            }
            for (const Edge& e : adj_[v]) {
                if (minutes[v] + e.minutes < minutes[e.to]) {
                    minutes[e.to] = minutes[v] + e.minutes;
                    parent[e.to] = v;
                    pq.push({minutes[e.to], e.to});
                }
            }
        }
    }

    string route(const vector<int>& parent, int target) const
    {
        string text;
        for (int v = target; v != -1; v = parent[v]) {
            text = names_[v] + (text.empty() ? "" : " -> ") + text;
        }
        return text;
    }
};

string join(const Graph& g, const vector<int>& order)
{
    string text;
    for (int v : order) {
        text += (text.empty() ? "" : ", ") + g.name(v);
    }
    return text;
}

int main()
{
    Graph g;
    int gate = g.add_place("Gate");
    int library = g.add_place("Library");
    int canteen = g.add_place("Canteen");
    int lab = g.add_place("Lab");
    int hall = g.add_place("Hall");
    int office = g.add_place("Office");
    int field = g.add_place("Field");
    int dorm = g.add_place("Dorm");
    g.add_place("Garden");

    g.add_road(gate, library, 4);
    g.add_road(gate, canteen, 2);
    g.add_road(gate, dorm, 15);
    g.add_road(library, hall, 5);
    g.add_road(library, office, 6);
    g.add_road(canteen, lab, 3);
    g.add_road(canteen, field, 3);
    g.add_road(lab, hall, 4);
    g.add_road(hall, office, 2);
    g.add_road(field, dorm, 4);
    g.add_road(lab, field, 2);

    cout << "Campus map: " << g.places() << " places, " << g.roads() << " roads\n";
    vector<int> hops;
    vector<int> parent_bfs;
    cout << "BFS from Gate: " << join(g, g.bfs(gate, hops, parent_bfs)) << '\n';
    cout << "DFS from Gate: " << join(g, g.dfs(gate)) << '\n';
    cout << "Connected components: " << g.components() << "\n\n";

    vector<int> minutes;
    vector<int> parent;
    g.dijkstra(gate, minutes, parent);
    cout << left << setw(9) << "Place" << right << setw(7) << "roads" << setw(9) << "minutes" << "  fastest route\n";
    for (size_t v = 1; v < g.places(); v++) {
        cout << left << setw(9) << g.name(static_cast<int>(v)) << right;
        if (minutes[v] == INT_MAX) {
            cout << "  unreachable\n";
        } else {
            cout << setw(7) << hops[v] << setw(9) << minutes[v] << "  " << g.route(parent, static_cast<int>(v)) << '\n';
        }
    }
    cout << "\nFewest roads to the Dorm: " << g.route(parent_bfs, dorm) << " (" << hops[dorm] << " road)\n";
    return 0;
}
```

```output
Campus map: 9 places, 11 roads
BFS from Gate: Gate, Library, Canteen, Dorm, Hall, Office, Lab, Field
DFS from Gate: Gate, Library, Hall, Lab, Canteen, Field, Dorm, Office
Connected components: 2

Place      roads  minutes  fastest route
Library        1        4  Gate -> Library
Canteen        1        2  Gate -> Canteen
Lab            2        5  Gate -> Canteen -> Lab
Hall           2        9  Gate -> Library -> Hall
Office         2       10  Gate -> Library -> Office
Field          2        5  Gate -> Canteen -> Field
Dorm           1        9  Gate -> Canteen -> Field -> Dorm
Garden     unreachable

Fewest roads to the Dorm: Gate -> Dorm (1 road)
```

**Differentiation.** Support: provide `Graph` with `add_place`, `add_road` and `bfs`, and let students write DFS, components and Dijkstra. Stretch: add `has_cycle`, a grid maze solver, and a version of Dijkstra with a coordinates-based A* priority.

**Discussion questions (not for the student quiz).** Why does a stack replace the call stack in an iterative DFS? How would you change the campus graph if some roads were one-way?
