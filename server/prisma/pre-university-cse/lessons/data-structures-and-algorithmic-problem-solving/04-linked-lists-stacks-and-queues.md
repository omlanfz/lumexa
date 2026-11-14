# Lumexa Mission Log: Data Structures & Algorithmic Problem-Solving

**Course/Path:** Data Structures & Algorithmic Problem-Solving
**Lesson:** 04 of 08
**Title:** Linked Lists, Stacks and Queues
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** C++ (g++)

---

## Mission Brief

Press *undo* in a text editor and the last thing you typed disappears; press it again and the thing before that goes too. The editor keeps your actions in a pile where the *newest* is always on top. Now think of the print queue in your school's computer lab: the first job sent is the first one printed. Two everyday structures, two opposite rules: **last in, first out** and **first in, first out**.

Until now you stored data in arrays, where elements sit side by side. In this lesson you meet a different way to organise memory, the **linked list**, in which every piece of data points to the next. On top of it you build the two most useful restricted structures in computing: the **stack** and the **queue**. You will use them to check that the brackets in a formula are balanced, and to keep a log of the steps of your program, as the Data-Structure Toolkit of the Algorithm Explorer.

## Learning Objectives

1. Explain how a singly linked list stores data in nodes joined by pointers, and implement its core operations.
2. Compare a linked list with an array or vector on access, insertion, deletion and memory.
3. Explain the stack (last in, first out) and the queue (first in, first out), and implement both.
4. Use a stack to check balanced brackets and a queue to keep an ordered log.
5. Manage dynamic memory correctly with `new`, `delete` and a destructor.
6. Build the Data-Structure Toolkit: a template `LinkedList`, a `Stack`, a `Queue`, a bracket checker and a step log.

## Prerequisites

- Pointers, `new` and `delete` (or `malloc` and `free`) from Course 1.
- Classes, destructors and templates from Course 2.
- Big O from Lesson 1.

## Concept Explanation

### Linked lists

A **linked list** is a chain of **nodes**. Each node holds a value and a pointer to the next node; the last node's pointer is `nullptr`. The list itself needs only a pointer to the first node, the **head** (and often one to the last node, the **tail**). Nodes are created one at a time with `new`, so they can be anywhere in memory and the list can grow without ever copying its elements.

```cpp
struct Node {
    int value;
    Node* next;
};
Node* head = nullptr;                    // an empty list
head = new Node{10, head};               // push_front(10)
head = new Node{5, head};                // push_front(5): list is 5 -> 10
```

The structure changes what is cheap:

| Operation | Array / vector | Singly linked list |
|---|---|---|
| Read the *i*-th element | O(1) | O(n): walk from the head |
| Insert or remove at the front | O(n): shift everything | O(1) |
| Insert after a node you already hold | O(n) | O(1): change two pointers |
| Insert at the end | O(1) amortised | O(1) with a tail pointer, otherwise O(n) |
| Search for a value | O(n) | O(n) |
| Memory | compact | extra pointer per node, scattered nodes |

Use a linked list when you insert and remove often at the ends or in the middle and rarely need to jump to the *i*-th element. A **doubly linked list** adds a `prev` pointer so you can also walk backwards and remove a node in O(1) when you hold it; the standard library offers `std::list` and `std::forward_list`.

### Managing the nodes

Every `new` needs a matching `delete`. When you remove a node you must save its `next` pointer *before* deleting it, and when the list is destroyed its **destructor** must delete every node, or the program **leaks** memory. A list that owns raw pointers must also forbid copying (a copy would share the nodes and delete them twice), so the class declares its copy operations `= delete`.

### Stacks

A **stack** follows the rule **last in, first out (LIFO)**, like a pile of plates. It has three operations, all O(1): **push** (put an item on top), **pop** (remove the top item) and **top** (look at it). Stacks are everywhere: the **call stack** that remembers where each function should return, the *undo* history, the *back* button in a browser, evaluating arithmetic, and **matching brackets**. A stack is easy to build on a linked list: push and pop both work at the head. The standard library provides `std::stack`.

### Queues

A **queue** follows the rule **first in, first out (FIFO)**, like people waiting at a counter. Its operations are **enqueue** (add at the back), **dequeue** (remove from the front) and **front** (look at the first item), all O(1) if the linked list keeps both a head and a tail pointer. Queues appear in print spoolers, task scheduling in the operating system (Course 6), network buffers and **breadth-first search** (Lesson 7). The standard library provides `std::queue` and the double-ended `std::deque`.

### Applications: balanced brackets and a step log

To check that `{[(a+b)*c]-d}` has correctly paired brackets, scan the text: push every **opening** bracket on a stack; at every **closing** bracket, pop the top and check that it is the matching opener. The text is balanced if no mismatch occurs and the stack is empty at the end. A stack fits perfectly because the *most recently opened* bracket must be the *first closed*. A queue suits a **log**: messages are added as things happen and printed later in the order they occurred.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Node** | One element of a linked structure: a value plus a pointer to the next node. |
| **Head / tail** | The first and the last node of a list. |
| **Singly / doubly linked** | Nodes point only forward, or both forward and backward. |
| **Stack** | A last-in, first-out collection with push, pop and top. |
| **Queue** | A first-in, first-out collection with enqueue, dequeue and front. |
| **LIFO / FIFO** | Last in, first out; first in, first out. |
| **Call stack** | The stack of active function calls that tells each function where to return. |
| **Memory leak** | Memory that was allocated but can no longer be reached or freed. |
| **Underflow** | Trying to pop or dequeue from an empty stack or queue. |
| **Abstract data type (ADT)** | A description of what operations a structure offers, independent of how it is built. |

## Worked Examples

### Example 1: A singly linked list

```cpp
#include <iostream>
using namespace std;

struct Node {
    int value;
    Node* next;
};

void push_front(Node*& head, int v)
{
    head = new Node{v, head};
}

void push_back(Node*& head, int v)
{
    Node* n = new Node{v, nullptr};
    if (head == nullptr) {
        head = n;
        return;
    }
    Node* cur = head;
    while (cur->next != nullptr) {
        cur = cur->next;
    }
    cur->next = n;
}

bool remove_value(Node*& head, int v)
{
    Node** link = &head;
    while (*link != nullptr) {
        if ((*link)->value == v) {
            Node* gone = *link;
            *link = gone->next;
            delete gone;
            return true;
        }
        link = &(*link)->next;
    }
    return false;
}

void print(const Node* head)
{
    for (const Node* cur = head; cur != nullptr; cur = cur->next) {
        cout << cur->value << " -> ";
    }
    cout << "null\n";
}

void destroy(Node*& head)
{
    while (head != nullptr) {
        Node* next = head->next;
        delete head;
        head = next;
    }
}

int main()
{
    Node* head = nullptr;
    push_back(head, 10);
    push_back(head, 20);
    push_back(head, 30);
    push_front(head, 5);
    print(head);
    cout << "remove 20: " << remove_value(head, 20) << '\n';
    cout << "remove 99: " << remove_value(head, 99) << '\n';
    print(head);
    destroy(head);
    return 0;
}
```

```output
5 -> 10 -> 20 -> 30 -> null
remove 20: 1
remove 99: 0
5 -> 10 -> 30 -> null
```

1. `push_front` creates a node whose `next` is the old head, then makes it the new head: O(1), no shifting.
2. `push_back` must walk to the last node first, so with only a head pointer it is O(n). (A tail pointer fixes that.)
3. `remove_value` keeps a pointer to the *link* that points at the current node. Removing a node is then just `*link = gone->next;` and `delete gone;`, with no special case for the head.
4. `destroy` saves `next` *before* deleting each node, and the program frees every node it allocated.

### Example 2: A stack built on a linked list

```cpp
#include <iostream>
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
    cout << '\n';
    cout << "pop from empty stack: " << s.pop(w) << '\n';
    return 0;
}
```

```output
out first in last are stacks
pop from empty stack: 0
```

1. `push` and `pop` both work at the head of the list, so both are O(1).
2. The words come out in the *reverse* of the order they went in: last in, first out.
3. `pop` returns `false` for an empty stack instead of crashing: popping an empty stack is an **underflow**, and a good stack reports it.
4. The destructor deletes the remaining nodes, so the stack cleans up after itself even if it is not empty.

### Example 3: A queue with head and tail

```cpp
#include <iostream>
#include <string>
using namespace std;

class Queue {
private:
    struct Node {
        string value;
        Node* next;
    };
    Node* head_ = nullptr;
    Node* tail_ = nullptr;
    int size_ = 0;

public:
    Queue() = default;
    Queue(const Queue&) = delete;
    Queue& operator=(const Queue&) = delete;
    ~Queue()
    {
        string ignore;
        while (dequeue(ignore)) {
        }
    }
    void enqueue(const string& v)
    {
        Node* n = new Node{v, nullptr};
        if (tail_ != nullptr) {
            tail_->next = n;
        } else {
            head_ = n;
        }
        tail_ = n;
        size_++;
    }
    bool dequeue(string& out)
    {
        if (head_ == nullptr) {
            return false;
        }
        Node* gone = head_;
        out = gone->value;
        head_ = gone->next;
        if (head_ == nullptr) {
            tail_ = nullptr;
        }
        delete gone;
        size_--;
        return true;
    }
    int size() const { return size_; }
};

int main()
{
    Queue printer;
    printer.enqueue("report.pdf");
    printer.enqueue("homework.docx");
    printer.enqueue("photo.png");
    cout << "jobs waiting: " << printer.size() << '\n';
    string job;
    while (printer.dequeue(job)) {
        cout << "printing " << job << '\n';
    }
    cout << "jobs waiting: " << printer.size() << '\n';
    return 0;
}
```

```output
jobs waiting: 3
printing report.pdf
printing homework.docx
printing photo.png
jobs waiting: 0
```

1. The tail pointer makes `enqueue` O(1): the new node is attached after the tail without walking the list.
2. `dequeue` removes at the head, also O(1). When the last node is removed, the tail must be reset to `nullptr` too, a classic detail that is easy to forget.
3. The jobs are printed in exactly the order they arrived: first in, first out.
4. The standard library's `std::queue<string>` does the same job with `push`, `pop`, `front` and `empty`, and you will use it in the breadth-first search of Lesson 7.

## Common Mistakes and Misconceptions

- **Deleting a node before saving its `next`.** After `delete n;` the pointer `n->next` is invalid. Save `next` first.
- **Forgetting to reset the tail.** When a queue becomes empty, both `head_` and `tail_` must be `nullptr`, or the next `enqueue` writes through a dangling pointer.
- **Losing the list by overwriting the head.** `head = head->next;` without keeping the old head leaks it. Keep a temporary pointer, then `delete` it.
- **Leaking nodes.** Every `new Node` needs a `delete`, including the nodes still in the list when it is destroyed. Put the clean-up in the destructor.
- **Copying a list class that owns raw pointers.** The default copy shares the nodes, and both copies delete them. Forbid copying or write a deep copy.
- **Assuming a linked list is faster than a vector.** For most programs a `vector` wins, because its elements are contiguous and the processor reads them quickly. Choose a list when its operations match your problem.
- **Popping from an empty stack or queue.** Check `empty()` first or return a failure value.
- **Mixing up the two rules.** A stack removes the *newest* item, a queue the *oldest*. If your output is reversed, check which one you built.

## Guided Hands-On Activity

**Build and break the structures.** Work with your teacher.

1. Type Example 1. Add `int count(const Node* head)` and `bool contains(const Node* head, int v)` and call them. What are their Big O costs?
2. Draw Example 1 on paper: boxes for the nodes and arrows for `next`, and redraw the list after each of the four insertions.
3. In Example 1, remove the first value, a middle value and the last value, one at a time. Which case worries you most, and does `remove_value` handle it?
4. Type Example 2 and use it to reverse the characters of a word, one letter at a time. Why does a stack reverse things?
5. Type Example 3. Remove the line `tail_ = nullptr;` from `dequeue`, enqueue three jobs, dequeue all of them and enqueue a new one. What goes wrong?
6. Replace your own stack by `std::stack<string>` and your own queue by `std::queue<string>` in a copy of the programs, and compare the amount of code you needed.

## Lesson Project: Algorithm Explorer: Data-Structure Toolkit

### Objective

Add the **Data-Structure Toolkit** to the Algorithm Explorer: a reusable template `LinkedList<T>`, and a `Stack<T>` and a `Queue<T>` built on top of it. Then use them to build a **bracket checker** and a **step log** that records what the toolkit did.

### Requirements

- A class template `LinkedList<T>` with a private `Node`, a head and a tail pointer and a size, and the operations `push_front`, `push_back`, `pop_front(T&)`, `front()`, `contains`, `remove`, `size`, `empty` and `to_string()`. It owns its nodes: a destructor deletes them and copying is forbidden.
- `Stack<T>` (push, pop, top, empty, size) and `Queue<T>` (enqueue, dequeue, front, empty, size), each a thin class that *has a* `LinkedList<T>` and uses the right end of it.
- A function `check_brackets(const string&)` that uses a `Stack<char>` and returns a message: `balanced`, `unexpected ')'` (a closer with no opener, naming the character), `mismatch: expected X but found Y`, or `missing closer for '('`.
- A **step log**: a `Queue<string>` to which `main` adds one line for each part of the demonstration; at the end `main` prints the log in order.
- `main` demonstrates the list, the stack (LIFO), the queue (FIFO), five bracket tests and finally prints the step log.

### Instructions

1. Write `LinkedList<T>` with its destructor and test `push_front`, `push_back`, `remove` and `to_string` on a list of ints.
2. Write `Stack<T>` and `Queue<T>` on top of the list. Check the order of the output of each.
3. Write `check_brackets` with a `Stack<char>`: handle the three bracket kinds, the unexpected closer, the mismatch and the leftover opener.
4. Test it with the five strings from the expected output.
5. Add the step log: `log.enqueue("...")` after each demonstration, and print the log with `dequeue` at the end.
6. Compile with `-Wall -Wextra -fsanitize=address,undefined` and make sure it reports no leak.
7. Compare with the expected output, and write a comment with the Big O of every operation of your `LinkedList`.

### Expected Output

```text
list: 5 -> 10 -> 20 -> 30 -> null
after remove(20): 5 -> 10 -> 30 -> null, contains 30: 1, size 3
stack pops: 3 2 1
queue dequeues: A B C
Bracket checker
  (a+b)*[c-d] -> balanced
  {[(a+b)*c]-d} -> balanced
  ((a+b) -> missing closer for '('
  {[(])} -> mismatch: expected ) but found ]
  a) -> unexpected ')'
  (empty string) -> balanced
Step log:
  1. linked list demonstrated
  2. stack demonstrated (last in, first out)
  3. queue demonstrated (first in, first out)
  4. bracket checker run on six strings
```

### Hints

1. **Hint 1 (the template).** Put `template <typename T>` before the class and write the node as a private `struct Node { T value; Node* next; };`.
2. **Hint 2 (a stack on a list).** `push(v)` calls `list_.push_front(v)`, `pop(out)` calls `list_.pop_front(out)`, and `top()` returns `list_.front()`.
3. **Hint 3 (a queue on a list).** `enqueue(v)` calls `list_.push_back(v)`, and `dequeue(out)` calls `list_.pop_front(out)`.
4. **Hint 4 (matching).** A small function `char opener_of(char closer)` that returns `'('` for `')'`, and so on, keeps the checker short.
5. **Hint 5 (the messages).** Use `string("mismatch: expected ") + expected_closer + " but found " + c`.
6. **Hint 6 (leaks).** If the sanitizer reports a leak, check `pop_front` frees the node and that the destructor runs the loop until the head is `nullptr`.

### Success Criteria

- [ ] `LinkedList<T>` is a class template that owns its nodes, with a destructor and no copying.
- [ ] `Stack` and `Queue` contain a list rather than copying its code, and give LIFO and FIFO order.
- [ ] The bracket checker reports all five cases correctly, including the empty string.
- [ ] The step log prints in the order the steps happened.
- [ ] A run with `-fsanitize=address,undefined` reports no errors and no leaks.
- [ ] The code compiles with `-Wall -Wextra` with no warnings, and the output matches the expected output.

### Extension Challenge

Add `reverse()` to `LinkedList<T>` that reverses the list in place (without creating new nodes), with three pointers `prev`, `cur` and `next`. Then implement `Queue<T>` a second time with a circular array of fixed size, and measure with your counter from Lesson 1 how many steps each version needs for 100,000 enqueues and dequeues.

## Lesson Recap

- A **linked list** is a chain of nodes joined by pointers: O(1) insertion and removal at the front (and after a known node), but O(n) access by position.
- A **stack** is last in, first out; a **queue** is first in, first out. Both are O(1) per operation when built on a linked list with head and tail.
- A stack matches nested brackets, remembers calls and implements *undo*; a queue keeps order for logs, printing and breadth-first search.
- Every `new` needs a `delete`: put the clean-up in a destructor and forbid copying a class that owns raw pointers.
- Choose the structure whose operations match the problem; for most plain lists, a `vector` is still the fastest.

## Homework / Extension Mission

Use your stack to evaluate a **postfix expression** such as `3 4 + 2 *` (push numbers; at an operator, pop two numbers, apply it and push the result), and use it again to convert an ordinary expression with brackets to postfix, if you are ready for a challenge. Then use your queue to simulate a bank counter: 20 customers arrive at known times, each needs a known number of minutes, and you print the average waiting time. Write a paragraph on which structure you chose for each part and why.

## Course Project Connection

This lesson adds the **Data-Structure Toolkit** to the **Algorithm Explorer**. The `LinkedList`, `Stack` and `Queue` are the building blocks of what follows: the stack appears again in the recursion of Lesson 5, the linked nodes become the *tree nodes* of Lesson 5 and the *chains* of the hash table in Lesson 6, and the queue drives the breadth-first search of Lesson 7. The step log will also record the work of later algorithms in the final menu of Lesson 8.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: undo and the print queue; stacks and queues as rules. 15 minutes: linked list nodes and pointers drawn on the board (Example 1). 10 minutes: stack and queue, built on the list. 25 minutes: the project, as a guided build.

**Live demonstrations.** Use sticky notes and string to build a list on the wall; delete a node and show the two pointer changes. Walk the bracket checker through `{[(])}` with a stack of cards. Show a memory leak report from `-fsanitize=address` by removing one `delete`.

**Misconceptions.** "A linked list is always better than an array for insertion" (finding the position costs O(n)). "Pointers are the data." "A queue and a stack differ only in names."

**Assessment of the project.** Check ownership (destructor, no copying), the use of composition for the stack and queue, the five bracket cases (especially the empty string and the leftover opener), and a clean sanitizer run. Ask each student to draw the list after two pushes and one pop.

**Reference solution `toolkit.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra -fsanitize=address,undefined toolkit.cpp -o toolkit`):

```cpp
// Algorithm Explorer, Lesson 4: Data-Structure Toolkit.
#include <iostream>
#include <string>
using namespace std;

// Singly linked list with head and tail pointers. It owns its nodes.
// push_front O(1), push_back O(1), pop_front O(1), contains O(n), remove O(n).
template <typename T>
class LinkedList {
private:
    struct Node {
        T value;
        Node* next;
    };
    Node* head_ = nullptr;
    Node* tail_ = nullptr;
    size_t size_ = 0;

public:
    LinkedList() = default;
    LinkedList(const LinkedList&) = delete;
    LinkedList& operator=(const LinkedList&) = delete;
    ~LinkedList()
    {
        while (head_ != nullptr) {
            Node* next = head_->next;
            delete head_;
            head_ = next;
        }
    }

    void push_front(const T& v)
    {
        head_ = new Node{v, head_};
        if (tail_ == nullptr) {
            tail_ = head_;
        }
        size_++;
    }

    void push_back(const T& v)
    {
        Node* n = new Node{v, nullptr};
        if (tail_ != nullptr) {
            tail_->next = n;
        } else {
            head_ = n;
        }
        tail_ = n;
        size_++;
    }

    bool pop_front(T& out)
    {
        if (head_ == nullptr) {
            return false;
        }
        Node* gone = head_;
        out = gone->value;
        head_ = gone->next;
        if (head_ == nullptr) {
            tail_ = nullptr;
        }
        delete gone;
        size_--;
        return true;
    }

    const T* front() const { return head_ != nullptr ? &head_->value : nullptr; }

    bool contains(const T& v) const
    {
        for (const Node* cur = head_; cur != nullptr; cur = cur->next) {
            if (cur->value == v) {
                return true;
            }
        }
        return false;
    }

    bool remove(const T& v)
    {
        Node* prev = nullptr;
        for (Node* cur = head_; cur != nullptr; prev = cur, cur = cur->next) {
            if (cur->value == v) {
                if (prev != nullptr) {
                    prev->next = cur->next;
                } else {
                    head_ = cur->next;
                }
                if (cur == tail_) {
                    tail_ = prev;
                }
                delete cur;
                size_--;
                return true;
            }
        }
        return false;
    }

    size_t size() const { return size_; }
    bool empty() const { return size_ == 0; }

    string to_string() const
    {
        string text;
        for (const Node* cur = head_; cur != nullptr; cur = cur->next) {
            text += std::to_string(cur->value) + " -> ";
        }
        return text + "null";
    }
};

template <typename T>
class Stack {
private:
    LinkedList<T> list_;

public:
    void push(const T& v) { list_.push_front(v); }
    bool pop(T& out) { return list_.pop_front(out); }
    const T* top() const { return list_.front(); }
    bool empty() const { return list_.empty(); }
    size_t size() const { return list_.size(); }
};

template <typename T>
class Queue {
private:
    LinkedList<T> list_;

public:
    void enqueue(const T& v) { list_.push_back(v); }
    bool dequeue(T& out) { return list_.pop_front(out); }
    const T* front() const { return list_.front(); }
    bool empty() const { return list_.empty(); }
    size_t size() const { return list_.size(); }
};

char opener_of(char closer)
{
    return closer == ')' ? '(' : closer == ']' ? '[' : '{';
}

char closer_of(char opener)
{
    return opener == '(' ? ')' : opener == '[' ? ']' : '}';
}

string check_brackets(const string& text)
{
    Stack<char> openers;
    for (char c : text) {
        if (c == '(' || c == '[' || c == '{') {
            openers.push(c);
        } else if (c == ')' || c == ']' || c == '}') {
            char top = 0;
            if (!openers.pop(top)) {
                return string("unexpected '") + c + "'";
            }
            if (top != opener_of(c)) {
                return string("mismatch: expected ") + closer_of(top) + " but found " + c;
            }
        }
    }
    char left = 0;
    if (openers.pop(left)) {
        return string("missing closer for '") + left + "'";
    }
    return "balanced";
}

int main()
{
    Queue<string> log;

    LinkedList<int> list;
    list.push_back(10);
    list.push_back(20);
    list.push_back(30);
    list.push_front(5);
    cout << "list: " << list.to_string() << '\n';
    list.remove(20);
    cout << "after remove(20): " << list.to_string() << ", contains 30: " << list.contains(30) << ", size " << list.size() << '\n';
    log.enqueue("linked list demonstrated");

    Stack<int> stack;
    for (int i = 1; i <= 3; i++) {
        stack.push(i);
    }
    cout << "stack pops:";
    int x = 0;
    while (stack.pop(x)) {
        cout << ' ' << x;
    }
    cout << '\n';
    log.enqueue("stack demonstrated (last in, first out)");

    Queue<string> queue;
    queue.enqueue("A");
    queue.enqueue("B");
    queue.enqueue("C");
    cout << "queue dequeues:";
    string s;
    while (queue.dequeue(s)) {
        cout << ' ' << s;
    }
    cout << '\n';
    log.enqueue("queue demonstrated (first in, first out)");

    cout << "Bracket checker\n";
    for (const string& text : {string("(a+b)*[c-d]"), string("{[(a+b)*c]-d}"), string("((a+b)"), string("{[(])}"), string("a)")}) {
        cout << "  " << text << " -> " << check_brackets(text) << '\n';
    }
    cout << "  (empty string) -> " << check_brackets("") << '\n';
    log.enqueue("bracket checker run on six strings");

    cout << "Step log:\n";
    int step = 1;
    string line;
    while (log.dequeue(line)) {
        cout << "  " << step++ << ". " << line << '\n';
    }
    return 0;
}
```

```output
list: 5 -> 10 -> 20 -> 30 -> null
after remove(20): 5 -> 10 -> 30 -> null, contains 30: 1, size 3
stack pops: 3 2 1
queue dequeues: A B C
Bracket checker
  (a+b)*[c-d] -> balanced
  {[(a+b)*c]-d} -> balanced
  ((a+b) -> missing closer for '('
  {[(])} -> mismatch: expected ) but found ]
  a) -> unexpected ')'
  (empty string) -> balanced
Step log:
  1. linked list demonstrated
  2. stack demonstrated (last in, first out)
  3. queue demonstrated (first in, first out)
  4. bracket checker run on six strings
```

**Differentiation.** Support: provide `LinkedList<T>` with `push_front`, `push_back` and the destructor, and let students write the stack, queue and checker. Stretch: add `reverse()`, the postfix evaluator, a circular-array queue and a doubly linked list.

**Discussion questions (not for the student quiz).** Why is a linked list a poor choice for a binary search? Why does the call stack of a program overflow on infinite recursion?
