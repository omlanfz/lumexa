# Lumexa Mission Log: Object-Oriented Programming & Programming Languages

**Course/Path:** Object-Oriented Programming & Programming Languages
**Lesson:** 08 of 08
**Title:** UML Class Diagrams and Building an Object-Oriented Application
**Duration:** 60 minutes
**Difficulty:** Advanced
**Technology:** C++ (g++) · UML

---

## Mission Brief

You now have every part of a real library system: protected books, members with a lifecycle, a hierarchy of items, loans, polymorphic fees, an abstract interface, exceptions and the STL. But a pile of parts is not an application. Before a team writes code for a system this size, they **draw it**: a diagram that shows which classes exist, what each one knows and does, and how they relate. A good diagram lets a new teammate understand the whole design in five minutes, and lets the team find a design mistake *before* it costs weeks of programming.

This final lesson of the course teaches the language of those diagrams, **UML (Unified Modeling Language) class diagrams**, and the process of turning requirements into a clean design. Then you assemble everything into one finished program: the **Library Management System**.

## Learning Objectives

1. Read and draw UML class diagrams: classes, attributes, methods, visibility and multiplicity.
2. Use the main UML relationships: association, aggregation, composition, inheritance, realization and dependency.
3. Turn written requirements into classes and responsibilities, using nouns, verbs and CRC cards.
4. Separate the program's logic from its user interface, and keep each class focused on one job.
5. Test an object-oriented design with assertions and review it against a checklist.
6. Assemble and document the finished Library Management System (LMS).

## Prerequisites

- Lessons 1 to 7: every object-oriented tool used in the LMS, from private data to exceptions.
- Course 1: menu-driven programs with `switch` and loops, as in the SRMS.

## Concept Explanation

### What UML is and why it helps

**UML** is a standard set of diagrams for describing software. It is a **communication tool**: a diagram is faster to read than code and lets people agree on a design before programming. UML has many kinds of diagram; in this course you will use the **class diagram** (the structure of the system) and meet the **sequence diagram** (messages between objects over time) in Course 7. Drawing a diagram is not a ritual: it is how you check your thinking.

### The class diagram: anatomy of a class

A class is drawn as a box with three compartments: its **name**, its **attributes** and its **methods**. A symbol in front of each member shows its visibility.

| Symbol | Meaning | C++ |
|---|---|---|
| `+` | public | `public:` |
| `-` | private | `private:` |
| `#` | protected | `protected:` |

Attributes are written `- name: type` and methods `+ name(parameters): returnType`. An **abstract class** has its name in *italics* (or the label «abstract»); an **interface** is labelled «interface».

```text
+-----------------------------+
| Book                        |
+-----------------------------+
| - id_: int                  |
| - title_: string            |
| - copies_: int              |
+-----------------------------+
| + borrow(): void            |
| + copies(): int             |
+-----------------------------+
```

### Relationships between classes

Lines between the boxes show how classes depend on each other. Six relationships cover almost everything:

| Relationship | Meaning | Drawn as | Library example |
|---|---|---|---|
| **Association** | one class uses or knows another | plain line or arrow | a `Loan` refers to a `Member` |
| **Aggregation** | a whole has parts that can live on their own | hollow diamond at the whole | a shelf has books |
| **Composition** | a whole owns parts that die with it | filled diamond at the whole | a `Library` owns its loans |
| **Inheritance** | *is-a* (generalisation) | hollow triangle at the base | `Book` is a `LibraryItem` |
| **Realization** | a class implements an interface | dashed line, hollow triangle | `Book` implements `Borrowable` |
| **Dependency** | one class uses another briefly | dashed arrow | `Library` uses `NoCopiesError` |

The numbers at the ends of a line are **multiplicities**: `1` exactly one, `0..1` optional, `0..*` any number, `1..*` at least one. For example, one `Library` owns `0..*` loans, while each `Loan` refers to exactly `1` member and `1` item.

### From requirements to classes

A common way to find classes is to read the requirements and underline the **nouns** (candidates for classes and attributes) and the **verbs** (candidates for methods). Then test each noun: does it have its own data and behaviour that matter? A **CRC card** (Class, Responsibility, Collaborators) is an index card for one class: its name, what it is responsible for, and the other classes it works with. If a card needs more than a handful of responsibilities, the class is probably doing too much. This is the **single responsibility principle**: a class should have one clear reason to change.

### Building the application in layers

Keep three layers apart:

1. **Model**: the classes of the domain (`LibraryItem`, `Member`, `Loan`) and their rules.
2. **Manager**: one class (here `Library`) that holds the collections and coordinates the model, offering operations such as `borrow(member, item)`.
3. **Interface**: the menu, the keyboard and the screen (`main`). It calls the manager and prints results.

Keeping the interface separate means the same `Library` could be driven by a menu, a web page or an automatic test, without change. Real projects also split each class into a header (`.h`) and a source (`.cpp`) file and compile them together (`g++ a.cpp b.cpp -o app`); the single-file layout in this lesson is only for convenience.

### Testing and reviewing an object-oriented design

A class that can be tested alone is a well-designed class. Write small tests that create objects, call methods and check results with `assert` (from `<cassert>`), including the failure cases. Then review the design with a checklist: Is every attribute private? Does each constructor leave a valid object? Is shared code written once (inheritance)? Does polymorphism replace type tests? Are failures reported with exceptions? Does each class have one job? Are the names clear?

## Key Vocabulary

| Term | Definition |
|---|---|
| **UML** | The Unified Modeling Language: a standard notation for diagrams of software. |
| **Class diagram** | A UML diagram of classes, their members and the relationships between them. |
| **Visibility** | The `+`, `-` or `#` symbol that shows whether a member is public, private or protected. |
| **Association** | A relationship in which one class uses or refers to another. |
| **Aggregation / composition** | Whole-part relationships; composition means the parts die with the whole. |
| **Multiplicity** | The number of objects that can take part in a relationship, such as `0..*`. |
| **CRC card** | A card listing a class's name, responsibilities and collaborators. |
| **Single responsibility** | The principle that a class should have one clear reason to change. |
| **Facade / manager class** | A class that coordinates other classes and offers simple operations to the outside. |
| **Unit test** | A small program that checks one class or function against known results. |

## Worked Examples

### Example 1: From requirements to classes

Here are the library's requirements, written in plain English:

> The library lends **books**, **magazines** and **DVDs**. Each item has an id and a title, and a number of copies. A **member** may borrow up to three items at a time. When a member borrows an item, the library records a **loan** with a due date. When the item is returned late, the member pays a **late fee** that depends on the kind of item.

1. **Underline the nouns:** library, book, magazine, DVD, item, id, title, copies, member, loan, due date, late fee, kind of item.
2. **Sort them.** *Classes*: Library, Book, Magazine, DVD, Item, Member, Loan. *Attributes*: id, title, copies, due date. *Not classes*: late fee (a calculated value, a method of the item), kind (a method that tells you the class).
3. **Underline the verbs:** lends, borrow, record, return, pay. They become the methods `borrow()`, `give_back()`, `late_fee()` and the manager's `borrow(member, item)`.
4. **Find the relationships:** Book, Magazine and DVD *are* items (inheritance); a Loan *refers to* one member and one item (association); the Library *owns* its items, members and loans (composition).
5. **Write a CRC card** for the `Library`: responsibility "lend and take back items, enforce the limit of three loans"; collaborators "LibraryItem, Member, Loan".

The result is the design you will draw in the project, and it matches the classes you built in Lessons 2 to 6.

### Example 2: From UML to C++

```cpp
#include <iostream>
#include <string>
#include <vector>
using namespace std;

struct Loan {
    int member_id;
    int item_id;
};

class Library {
private:
    vector<Loan> loans_;

public:
    void add_loan(int member_id, int item_id) { loans_.push_back({member_id, item_id}); }

    int loans_of(int member_id) const
    {
        int count = 0;
        for (const Loan& l : loans_) {
            if (l.member_id == member_id) {
                count++;
            }
        }
        return count;
    }

    int total() const { return static_cast<int>(loans_.size()); }
};

int main()
{
    Library lib;
    lib.add_loan(1, 101);
    lib.add_loan(1, 301);
    lib.add_loan(2, 301);
    cout << "total loans: " << lib.total() << '\n';
    cout << "member 1 holds " << lib.loans_of(1) << ", member 2 holds " << lib.loans_of(2) << '\n';
    return 0;
}
```

```output
total loans: 3
member 1 holds 2, member 2 holds 1
```

1. The diagram says "a `Library` owns `0..*` loans" (composition). In code that becomes a private `vector<Loan>` inside `Library`, with no way for outside code to reach it directly.
2. "A `Loan` refers to one member and one item" (association) becomes two plain ids. The loan does not own the member or the item.
3. The multiplicity `0..*` tells you to use a container, not a single variable.
4. `loans_of` answers a question about the whole collection, which only the `Library` can do. Putting such operations in the manager class is exactly its job.

### Example 3: Testing a class with assertions

```cpp
#include <cassert>
#include <iostream>
#include <stdexcept>
#include <string>
using namespace std;

class Book {
private:
    string title_;
    int copies_;

public:
    Book(const string& title, int copies) : title_(title), copies_(copies)
    {
        if (title.empty()) {
            throw invalid_argument("title must not be empty");
        }
        if (copies < 0) {
            throw invalid_argument("copies must not be negative");
        }
    }
    int copies() const { return copies_; }
    bool borrow()
    {
        if (copies_ == 0) {
            return false;
        }
        copies_--;
        return true;
    }
};

int main()
{
    Book b("Python Basics", 1);
    assert(b.copies() == 1);
    assert(b.borrow() == true);
    assert(b.copies() == 0);
    assert(b.borrow() == false);
    assert(b.copies() == 0);

    bool threw = false;
    try {
        Book bad("", 3);
    } catch (const invalid_argument&) {
        threw = true;
    }
    assert(threw);

    cout << "all tests passed\n";
    return 0;
}
```

```output
all tests passed
```

1. Each `assert` states something that must be true. If one is false, the program stops at once and names the failing line.
2. The tests cover the normal case (borrowing succeeds), the boundary (the last copy) and the failure cases (no copies left, invalid data).
3. Because `Book` has no menu and no printing of its own, it can be tested without a keyboard. That is what the layered design buys you.
4. Run the tests again after every change: they tell you at once if a change broke an old rule (a regression).

## Common Mistakes and Misconceptions

- **Drawing the code instead of the design.** A class diagram with every helper function and every `int i` is unreadable. Show the important attributes, the public methods and the relationships.
- **Confusing inheritance with association.** An arrow with a hollow triangle means *is-a*. A plain arrow means *uses* or *knows*. A `Loan` is not a kind of `Member`.
- **Using every relationship everywhere.** Aggregation versus composition is a fine distinction. If unsure, use a plain association and say what you mean in a label.
- **Forgetting multiplicities.** "A member has loans" says nothing; "0..3" tells the programmer about a rule.
- **One giant "God" class.** A class that knows everything is hard to change and test. Give each class one job.
- **Mixing the menu with the logic.** A `Library` that calls `cin` and `cout` everywhere cannot be tested or reused. Keep input and output in `main`.
- **Designing and never revising.** A diagram is a draft. When the code shows the design is wrong, change the diagram too.
- **Skipping the tests for failures.** Test what must *fail* (empty title, no copies) as carefully as what must work.

## Guided Hands-On Activity

**Design it before you build it.** Work with your teacher.

1. On paper, draw the class box for `LibraryItem`: its attributes and methods with `+` and `-`, and mark it abstract. Then draw `Book`, `Magazine` and `DVD` below it with inheritance arrows.
2. Add `Member`, `Loan` and `Library`. Connect them with the relationships from the table, and write a multiplicity at every end.
3. Type Example 2. Add a method `bool has_loan(int member_id, int item_id) const` to `Library` and test it. Does the UML diagram need to change?
4. Type Example 3 and make a test fail on purpose: change one `assert` so it is wrong, run it, and read the message. Then restore it.
5. Add two more tests to Example 3: one that a book with 2 copies can be borrowed twice, and one that a negative number of copies is rejected.
6. Write a CRC card for `Member`. Does it have more than three responsibilities? If so, which should move to another class?

## Lesson Project: LMS Capstone

### Objective

Finish the course project: draw the **UML class diagram** of the Library Management System, and assemble all the classes from Lessons 2 to 6 into one complete, menu-driven C++ application that uses inheritance, polymorphism, exceptions, templates and the STL, with a clean separation of logic and interface.

### Requirements

- A UML class diagram (on paper or in a drawing tool) with at least these classes: `LibraryItem` (abstract), `Book`, `Magazine`, `DVD`, `Member`, `Loan` and `Library`, with visibility symbols, multiplicities and the right relationship for each pair.
- `LibraryItem` is abstract, with a virtual destructor and the pure virtual methods `kind()` and `late_fee(int days)`. The late fees are 5, 2 and 10 per day for books, magazines and DVDs.
- A hierarchy of exceptions derived from `LibraryError`: not found, no copies left and loan limit reached (3).
- `Library` owns the items (`unique_ptr`), the members and the loans. It offers `borrow`, `give_back`, `list_items` and `report`, and throws exceptions for every failure. It never reads input.
- A function template that looks up an id in any `map` and throws `NotFoundError` if it is missing.
- `main` is the menu: `1` list items, `2` borrow, `3` return (with the day of return, so a late fee can be charged), `4` loans report, `0` exit. It catches `LibraryError` and prints the message.
- Every loan lasts 14 days from day 1.

### Instructions

1. Draw the class diagram first, then compare it with the classes you plan to write.
2. Write the exception classes and `LibraryItem` with its three derived classes.
3. Write the lookup template and the `Library` class with `borrow`, one operation at a time, testing each with a few lines in `main`.
4. Add `give_back` (find the loan with `find_if`, calculate the days late, charge the fee through the item's `late_fee`) and the reports.
5. Write the menu in `main`: a loop with a `switch`, a `try`/`catch` around each command, and a message for an invalid choice.
6. Run the program with the scripted input below, and compare your output with the expected output.
7. Write a README comment at the top of the file: what the system does, how to compile it, the commands, and the three classes you are proudest of.

### Expected Output

For the scripted input in the teacher's reference (list the items, then borrow item 101 and item 301 for member 1, try item 301 for member 2, try an unknown item 999, borrow 201 and a fourth item 101 for member 1, borrow 101 for member 2, return 301 for member 1 on day 20, return 301 for member 2 on day 5, show the loans, an invalid choice `7`, then exit) the program prints:

```text
LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
  Book #101 "Python Basics" (copies: 2)
  Magazine #201 "Science Today" (copies: 1)
  DVD #301 "How Computers Work" (copies: 1)

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Anika borrowed Book "Python Basics", due day 15

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Anika borrowed DVD "How Computers Work", due day 15

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Error: no copies left of "How Computers Work"

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Error: item 999 not found

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Anika borrowed Magazine "Science Today", due day 15

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Error: Anika has reached the limit of 3 loans

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Rafi borrowed Book "Python Basics", due day 15

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Anika returned "How Computers Work" on day 20. Late days: 5, fee: 50

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Error: loan of item 301 not found

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
  Anika has "Python Basics", due day 15
  Anika has "Science Today", due day 15
  Rafi has "Python Basics", due day 15

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Please choose a number from 0 to 4.

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Goodbye!
```

### Hints

1. **Hint 1 (the lookup template).** `template <typename Map> auto& find_or_throw(Map& m, int id, const string& what) { auto it = m.find(id); if (it == m.end()) throw NotFoundError(what, id); return it->second; }`.
2. **Hint 2 (the limit).** Count the member's loans with `count_if` before you call `item.take()`, so a refused loan changes nothing.
3. **Hint 3 (the late fee).** `int late = max(0, today - loan.due_day); int fee = item.late_fee(late);`.
4. **Hint 4 (removing a loan).** `loans_.erase(it);` where `it` came from `find_if`.
5. **Hint 5 (reading the menu).** Read the command with `cin >> choice` and the numbers of that command with `cin >> member >> item`.
6. **Hint 6 (a compile error about an abstract class).** Every derived class must implement *all* pure virtual functions, with exactly the same signature and `const`.

### Success Criteria

- [ ] The UML diagram shows every class with visibility, multiplicities and the correct relationships, and matches the code.
- [ ] The program uses inheritance, polymorphism, exceptions, a template and STL algorithms, and the `Library` class contains no input or output of its own other than the messages it is asked to print.
- [ ] Every failure (not found, no copies, limit reached, no such loan) is an exception that is caught and reported, and a refused action changes nothing.
- [ ] The late fee of the returned DVD is 50 (5 days late at 10 per day).
- [ ] The code compiles with `-Wall -Wextra` with no warnings, and the output matches the expected output.
- [ ] The file starts with a README comment, and the code has at least five `assert` tests in a separate test function.

### Extension Challenge

Split the program into files: one header and one source file per class family, plus `main.cpp`, and compile them with `g++ -std=c++17 *.cpp -o lms`. Add a `save` command that writes the loans to a text file and a `load` command that reads them back (reusing the idea from the SRMS in Course 1). Then rewrite the diagram: what changed in the design when persistence arrived?

## Lesson Recap

- **UML class diagrams** show classes (name, attributes, methods), visibility (`+`, `-`, `#`) and relationships with multiplicities.
- The six relationships are association, aggregation, composition, inheritance, realization and dependency; inheritance is only for *is-a*.
- Find classes from the **nouns**, methods from the **verbs**, and check each class against the **single responsibility** idea (CRC cards help).
- Keep three layers apart: **model**, **manager** and **interface**, so the logic can be tested and reused.
- Test classes with assertions, including the failure cases, and review the design against a checklist. You have now built a complete object-oriented application.

## Homework / Extension Mission

Finish the capstone and prepare a five-minute presentation of the LMS: the UML diagram on one slide or page, a live run of the scripted session, and two design decisions you are proud of (for example "late fees live in the items, so a new kind of item needs no change to `Library`"). Write one page of reflection: what was the hardest bug, which rule from Lessons 2 to 6 saved you the most trouble, and how does this design compare with your procedural catalogue from Lesson 1? Compare it with the three weaknesses you wrote then, and tick off each one that is now solved.

## Course Project Connection

This lesson **is** the course project: the finished **Library Management System using C++**. Lesson 1's procedural catalogue became protected `Book` objects (Lesson 2), members with a lifecycle (Lesson 3), an inheritance hierarchy with loans (Lesson 4), polymorphic fees (Lesson 5), a safe core with an interface, a template, exceptions and STL containers (Lesson 6), and a Java port (Lesson 7). Today they are one application with a diagram. Keep the diagram and the code in your portfolio: in Course 3 you will analyse the efficiency of the data structures behind such a system, and in Course 7 you will give it a database and a web interface.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: UML notation, with the `Book` box on the board. 10 minutes: relationships and multiplicities (draw the library diagram together, then the table). 10 minutes: requirements to classes (Example 1). 30 minutes: the project; most of the build continues at home, with the diagram drawn first.

**Live demonstrations.** Draw one wrong diagram on purpose (an inheritance arrow from `Loan` to `Member`) and ask the class to find the problem. Run the tests of Example 3 and break one rule live. Compile the final program with `-fsanitize=address,undefined` to show that it is clean.

**Misconceptions.** "UML is only for big companies." "A diagram must be perfect before coding." "Composition and aggregation are interchangeable." "The `Library` class should print its own messages."

**Assessment of the project.** Mark the diagram and the code together: do they agree? Check the layering, the exceptions, the template and the tests, and ask each student to explain one design decision. The diagram should show multiplicities such as `Library 1 — 0..* Loan`.

**Reference solution `lms.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra lms.cpp -o lms`; the input below is typed into the menu):

```cpp
// Library Management System: a menu-driven application in C++.
// Compile: g++ -std=c++17 -Wall -Wextra lms.cpp -o lms
// Commands: 1 list items | 2 borrow (member item) | 3 return (member item day) | 4 loans | 0 exit
#include <algorithm>
#include <cassert>
#include <iostream>
#include <map>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>
using namespace std;

class LibraryError : public runtime_error {
public:
    using runtime_error::runtime_error;
};

class NotFoundError : public LibraryError {
public:
    NotFoundError(const string& what, int id) : LibraryError(what + " " + to_string(id) + " not found") {}
};

class NoCopiesError : public LibraryError {
public:
    explicit NoCopiesError(const string& title) : LibraryError("no copies left of \"" + title + "\"") {}
};

class LimitError : public LibraryError {
public:
    explicit LimitError(const string& name) : LibraryError(name + " has reached the limit of 3 loans") {}
};

class LibraryItem {
private:
    int id_;
    string title_;
    int copies_;

public:
    LibraryItem(int id, const string& title, int copies) : id_(id), title_(title), copies_(copies) {}
    virtual ~LibraryItem() = default;

    int id() const { return id_; }
    const string& title() const { return title_; }
    int copies() const { return copies_; }

    void take()
    {
        if (copies_ == 0) {
            throw NoCopiesError(title_);
        }
        copies_--;
    }
    void put_back() { copies_++; }

    virtual string kind() const = 0;
    virtual int late_fee(int days) const = 0;

    string describe() const
    {
        return kind() + " #" + to_string(id_) + " \"" + title_ + "\" (copies: " + to_string(copies_) + ")";
    }
};

class Book : public LibraryItem {
public:
    using LibraryItem::LibraryItem;
    string kind() const override { return "Book"; }
    int late_fee(int days) const override { return 5 * days; }
};

class Magazine : public LibraryItem {
public:
    using LibraryItem::LibraryItem;
    string kind() const override { return "Magazine"; }
    int late_fee(int days) const override { return 2 * days; }
};

class DVD : public LibraryItem {
public:
    using LibraryItem::LibraryItem;
    string kind() const override { return "DVD"; }
    int late_fee(int days) const override { return 10 * days; }
};

class Member {
private:
    int id_;
    string name_;

public:
    Member(int id, const string& name) : id_(id), name_(name) {}
    int id() const { return id_; }
    const string& name() const { return name_; }
};

struct Loan {
    int member_id;
    int item_id;
    int due_day;
};

template <typename Map>
auto& find_or_throw(Map& m, int id, const string& what)
{
    auto it = m.find(id);
    if (it == m.end()) {
        throw NotFoundError(what, id);
    }
    return it->second;
}

class Library {
private:
    static constexpr int LOAN_DAYS = 14;
    static constexpr int MAX_LOANS = 3;

    map<int, unique_ptr<LibraryItem>> items_;
    map<int, Member> members_;
    vector<Loan> loans_;

public:
    void add_item(unique_ptr<LibraryItem> item)
    {
        int id = item->id();
        items_[id] = move(item);
    }
    void add_member(int id, const string& name) { members_.emplace(id, Member(id, name)); }

    void list_items() const
    {
        for (const auto& entry : items_) {
            cout << "  " << entry.second->describe() << '\n';
        }
    }

    void borrow(int member_id, int item_id, int today)
    {
        const string& name = find_or_throw(members_, member_id, "member").name();
        LibraryItem& item = *find_or_throw(items_, item_id, "item");
        int count = static_cast<int>(count_if(loans_.begin(), loans_.end(), [&](const Loan& l) { return l.member_id == member_id; }));
        if (count >= MAX_LOANS) {
            throw LimitError(name);
        }
        item.take();
        loans_.push_back({member_id, item_id, today + LOAN_DAYS});
        cout << name << " borrowed " << item.kind() << " \"" << item.title() << "\", due day " << today + LOAN_DAYS << '\n';
    }

    void give_back(int member_id, int item_id, int today)
    {
        const string& name = find_or_throw(members_, member_id, "member").name();
        LibraryItem& item = *find_or_throw(items_, item_id, "item");
        auto it = find_if(loans_.begin(), loans_.end(), [&](const Loan& l) { return l.member_id == member_id && l.item_id == item_id; });
        if (it == loans_.end()) {
            throw NotFoundError("loan of item", item_id);
        }
        int late = max(0, today - it->due_day);
        int fee = item.late_fee(late);
        loans_.erase(it);
        item.put_back();
        cout << name << " returned \"" << item.title() << "\" on day " << today << ". Late days: " << late << ", fee: " << fee << '\n';
    }

    void report() const
    {
        if (loans_.empty()) {
            cout << "  no loans\n";
            return;
        }
        vector<Loan> sorted = loans_;
        sort(sorted.begin(), sorted.end(), [](const Loan& a, const Loan& b) { return a.due_day < b.due_day; });
        for (const Loan& l : sorted) {
            cout << "  " << members_.at(l.member_id).name() << " has \"" << items_.at(l.item_id)->title() << "\", due day " << l.due_day << '\n';
        }
    }
};

void run_tests()
{
    Library lib;
    lib.add_member(1, "Test");
    lib.add_item(make_unique<Book>(1, "Test Book", 1));
    bool threw = false;
    try {
        lib.borrow(9, 1, 1);
    } catch (const NotFoundError&) {
        threw = true;
    }
    assert(threw);
    assert(Book(1, "x", 1).late_fee(3) == 15);
    assert(Magazine(2, "y", 1).late_fee(3) == 6);
    assert(DVD(3, "z", 1).late_fee(3) == 30);
    assert(DVD(3, "z", 1).kind() == "DVD");
}

int main()
{
    run_tests();

    Library lib;
    lib.add_item(make_unique<Book>(101, "Python Basics", 2));
    lib.add_item(make_unique<Magazine>(201, "Science Today", 1));
    lib.add_item(make_unique<DVD>(301, "How Computers Work", 1));
    lib.add_member(1, "Anika");
    lib.add_member(2, "Rafi");

    int choice = -1;
    while (true) {
        cout << "\nLMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit\nChoice:\n";
        if (!(cin >> choice) || choice == 0) {
            break;
        }
        try {
            switch (choice) {
            case 1:
                lib.list_items();
                break;
            case 2: {
                int member = 0;
                int item = 0;
                cin >> member >> item;
                lib.borrow(member, item, 1);
                break;
            }
            case 3: {
                int member = 0;
                int item = 0;
                int day = 0;
                cin >> member >> item >> day;
                lib.give_back(member, item, day);
                break;
            }
            case 4:
                lib.report();
                break;
            default:
                cout << "Please choose a number from 0 to 4.\n";
            }
        } catch (const LibraryError& e) {
            cout << "Error: " << e.what() << '\n';
        }
    }
    cout << "Goodbye!\n";
    return 0;
}
```

```input
1
2 1 101
2 1 301
2 2 301
2 1 999
2 1 201
2 1 101
2 2 101
3 1 301 20
3 2 301 5
4
7
0
```

```output
LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
  Book #101 "Python Basics" (copies: 2)
  Magazine #201 "Science Today" (copies: 1)
  DVD #301 "How Computers Work" (copies: 1)

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Anika borrowed Book "Python Basics", due day 15

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Anika borrowed DVD "How Computers Work", due day 15

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Error: no copies left of "How Computers Work"

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Error: item 999 not found

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Anika borrowed Magazine "Science Today", due day 15

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Error: Anika has reached the limit of 3 loans

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Rafi borrowed Book "Python Basics", due day 15

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Anika returned "How Computers Work" on day 20. Late days: 5, fee: 50

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Error: loan of item 301 not found

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
  Anika has "Python Basics", due day 15
  Anika has "Science Today", due day 15
  Rafi has "Python Basics", due day 15

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Please choose a number from 0 to 4.

LMS menu: 1 Items | 2 Borrow | 3 Return | 4 Loans | 0 Exit
Choice:
Goodbye!
```

**Differentiation.** Support: provide the exception classes, `LibraryItem` and `Library::list_items`, and let students add the derived classes and `borrow`. Stretch: split the program into header and source files, add persistence and add `Newspaper` without touching `Library`.

**Discussion questions (not for the student quiz).** If the library also needed a web page, which layer would you change and which would you keep? When might you choose aggregation over composition for `Library` and `Loan`?
