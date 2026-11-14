# Lumexa Mission Log: Object-Oriented Programming & Programming Languages

**Course/Path:** Object-Oriented Programming & Programming Languages
**Lesson:** 05 of 08
**Title:** Polymorphism, Overloading, Overriding and Virtual Functions
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** C++ (g++)

---

## Mission Brief

At the end of Lesson 4 the library hit a puzzle: when a `DVD` was described through a `LibraryItem` reference, only the *base* description appeared. The program knew the object was a DVD, yet it ran the base class's code. Imagine the library's late-fee screen: it holds a list of items of every kind and must charge 5 per day for a book, 2 per day for a magazine and 10 per day for a DVD. Without a fix, it would need a long chain of `if (type == ...)` tests that must be edited every time a new kind of item appears. That is weakness 3 of Lesson 1, still alive.

The fix is **polymorphism**, from the Greek for "many forms": one call, such as `item->late_fee(3)`, behaves differently depending on the real kind of object it is applied to. Today you learn the three tools that make it work: **overloading**, **overriding** and **virtual functions**. You will turn the library catalogue into one that treats every item uniformly, and prints with a natural `cout << item`.

## Learning Objectives

1. Explain polymorphism and distinguish compile-time from run-time polymorphism.
2. Overload functions and use the rules the compiler follows to choose among them.
3. Override a base-class method with `virtual` and `override`, and explain why a base pointer then calls the derived version.
4. Store different derived objects in one container through base-class pointers (`unique_ptr`) without slicing.
5. Overload the output operator `<<` so objects can be printed with `cout`.
6. Build a polymorphic library catalogue with an overloaded search and run-time late fees.

## Prerequisites

- Lesson 4: base and derived classes, constructor chains and the base-reference puzzle of Example 3.
- Lesson 3: destructors and object lifecycle (a base destructor must behave correctly for derived objects).

## Concept Explanation

### Polymorphism: one name, many behaviours

**Polymorphism** lets the same expression do different things depending on the types involved. C++ has two kinds:

- **Compile-time polymorphism**: the compiler chooses the version while building the program. Function overloading and operator overloading are examples.
- **Run-time polymorphism**: the program chooses the version while running, based on the real type of the object. Virtual functions are the example.

### Function overloading

**Overloading** means giving several functions the same name but different parameter lists. The compiler picks the one whose parameters match the call:

```cpp
const LibraryItem* find(int id) const;                   // search by id
const LibraryItem* find(const string& title) const;      // search by title

catalogue.find(201);                     // calls the int version
catalogue.find("Science Today");         // calls the string version
```

The return type alone cannot tell two overloads apart; the number or the types of the parameters must differ. Overloading gives one natural name to related actions, so callers need to remember only one.

### Operator overloading

C++ lets a class define what operators such as `<<`, `==` or `+` mean for its objects. To print an object with `cout << item`, write a function named `operator<<` that takes the stream and the object, and returns the stream so that calls can be chained:

```cpp
ostream& operator<<(ostream& out, const LibraryItem& item)
{
    return out << item.describe();
}

cout << book << '\n';          // calls operator<<(cout, book)
```

Return `ostream&`, not `void`: `cout << a << b` is evaluated as `(cout << a) << b`, so the first call must hand the stream back.

### Overriding and virtual functions

A derived class **overrides** a base class's method by defining one with the same name and parameters. For the correct version to be chosen at run time, the base method must be declared **`virtual`**. Add `override` to the derived version, so the compiler checks that you really are overriding something and have not made a typo:

```cpp
class LibraryItem {
public:
    virtual int late_fee(int days) const { return 5 * days; }
    virtual ~LibraryItem() = default;        // a virtual destructor, see below
};

class DVD : public LibraryItem {
public:
    int late_fee(int days) const override { return 10 * days; }
};

const LibraryItem& item = dvd;
item.late_fee(3);       // 30: the DVD version runs, even through a base reference
```

When a class has virtual functions, each object carries a hidden pointer to a table of the functions that belong to its real type (the **vtable**). A call through a base pointer or reference follows that pointer, so the real object decides which function runs. This is **dynamic dispatch**.

### A virtual destructor

If you delete a derived object through a base pointer and the base destructor is not `virtual`, only the base destructor runs, and the derived part is never cleaned up. **Every class that is meant to be used polymorphically must have a virtual destructor.**

### Polymorphic collections

To hold different kinds of item in one container, store **pointers** to the base class. Storing the objects themselves would *slice* them (Lesson 4). A `unique_ptr<LibraryItem>` is a smart pointer: it owns one object and deletes it automatically, so you do not write `delete`:

```cpp
vector<unique_ptr<LibraryItem>> items;
items.push_back(make_unique<Book>(101, "Python Basics", "A. Rahman"));
items.push_back(make_unique<DVD>(301, "How Computers Work", 95));
for (const auto& item : items) {
    cout << item->late_fee(3) << '\n';     // each object answers for itself
}
```

Now a new kind of item needs one new class and no change to the code that loops over the collection.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Polymorphism** | One call that behaves differently depending on the types involved. |
| **Overloading** | Several functions with the same name and different parameter lists. |
| **Operator overloading** | Defining what an operator means for a class. |
| **Overriding** | Replacing a base class's method in a derived class with the same signature. |
| **`virtual`** | Marks a method so that the real type of the object decides which version runs. |
| **`override`** | A keyword that asks the compiler to check that a method really overrides a base one. |
| **Dynamic dispatch** | Choosing the function to run while the program runs. |
| **Vtable** | The hidden table of virtual functions that each polymorphic object points to. |
| **Virtual destructor** | A destructor declared `virtual`, so derived objects are cleaned up through a base pointer. |
| **`unique_ptr`** | A smart pointer that owns one object and deletes it automatically. |

## Worked Examples

### Example 1: Overloading

```cpp
#include <iostream>
#include <string>
using namespace std;

void show(int n) { cout << "int: " << n << '\n'; }
void show(double x) { cout << "double: " << x << '\n'; }
void show(const string& s) { cout << "string: " << s << '\n'; }
void show(const string& s, int times)
{
    for (int i = 0; i < times; i++) {
        cout << "repeat: " << s << '\n';
    }
}

int main()
{
    show(7);
    show(2.5);
    show("library");
    show("hello", 2);
    return 0;
}
```

```output
int: 7
double: 2.5
string: library
repeat: hello
repeat: hello
```

1. All four functions are called `show`; the parameter lists differ, so the compiler can tell them apart.
2. `show(7)` matches `int` exactly, `show(2.5)` matches `double`, and the text literal converts to a `string`.
3. The last call has two arguments, so only the two-parameter overload can match.
4. The choice is made when the program is *compiled*, which is why overloading is compile-time polymorphism.

### Example 2: Virtual functions fix the Lesson 4 puzzle

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>
using namespace std;

class Item {
public:
    virtual ~Item() = default;
    virtual string who() const { return "item"; }
};

class Book : public Item {
public:
    string who() const override { return "book"; }
};

class DVD : public Item {
public:
    string who() const override { return "dvd"; }
};

void show(const Item& i)
{
    cout << i.who() << '\n';
}

int main()
{
    Book b;
    DVD d;
    show(b);
    show(d);

    vector<unique_ptr<Item>> items;
    items.push_back(make_unique<Book>());
    items.push_back(make_unique<DVD>());
    items.push_back(make_unique<Item>());
    for (const auto& p : items) {
        cout << p->who() << ' ';
    }
    cout << '\n';
    return 0;
}
```

```output
book
dvd
book dvd item
```

1. In Lesson 4 the same `show(const Item&)` printed `item` for a `Book`. Declaring `who` as `virtual` changes that: now the real object decides, and `show` prints `book` and `dvd`.
2. `override` tells the compiler to check that `Book::who` really overrides a virtual function; a typo such as `whoo` would be a compile error instead of a silent new function.
3. The vector holds `unique_ptr<Item>` pointers, so each element keeps its true type. The loop calls `who()` on each pointer and gets `book`, `dvd` and `item`.
4. The `Item` destructor is virtual, and each `unique_ptr` deletes its object when the vector is destroyed, so there is no leak and no `delete` in sight.

### Example 3: Overloading the output operator

```cpp
#include <iostream>
#include <string>
using namespace std;

class Book {
private:
    string title_;
    int copies_;

public:
    Book(const string& title, int copies) : title_(title), copies_(copies) {}
    const string& title() const { return title_; }
    int copies() const { return copies_; }
};

ostream& operator<<(ostream& out, const Book& b)
{
    return out << b.title() << " [" << b.copies() << " left]";
}

int main()
{
    Book a("Python Basics", 2);
    Book b("Digital Logic", 0);
    cout << a << '\n';
    cout << a << " and " << b << '\n';
    return 0;
}
```

```output
Python Basics [2 left]
Python Basics [2 left] and Digital Logic [0 left]
```

1. `operator<<` takes the stream by reference and the book by `const` reference, and *returns the stream*.
2. `cout << a << " and " << b` works because each `<<` returns `cout` for the next one to use.
3. The operator uses only public getters, so it needs no special access. It is an ordinary function that happens to have an operator's name.
4. `cout << a` now reads like the built-in types, which is the point of operator overloading.

## Common Mistakes and Misconceptions

- **Forgetting `virtual`.** Without it you get the Lesson 4 behaviour: the declared type of the reference decides, not the real object.
- **A signature that differs by accident.** If the derived method has a different parameter list or is missing `const`, it *hides* the base version instead of overriding it. `override` turns that mistake into a compile error. Use it every time.
- **No virtual destructor in a polymorphic base.** Deleting through a base pointer then skips the derived destructor. Add `virtual ~Base() = default;`.
- **Storing derived objects by value in a `vector<Base>`.** The objects are sliced. Store `unique_ptr<Base>` (or other pointers).
- **Confusing overloading with overriding.** Overloading: same name, different parameters, chosen at compile time. Overriding: same name *and* parameters in a derived class, chosen at run time.
- **Returning `void` from `operator<<`.** Chained output such as `cout << a << b` then fails to compile.
- **Overloading on the return type.** The compiler does not look at it: `int f()` and `double f()` cannot coexist.
- **Overloading operators with a surprising meaning.** Keep `+` for addition-like things and `<<` for output so that code stays readable.

## Guided Hands-On Activity

**Many forms, one call.** Work with your teacher.

1. Type Example 1. Add a `show(char c)` overload and call `show('x')`. Then call `show(3.0f)` (a `float`) and predict which overload runs.
2. Type Example 2. Remove the word `virtual` from `Item::who` and run it again. What changes in the output, and why?
3. Restore `virtual`, then change `override` on `DVD::who` to a method named `whoo` and recompile. Read the compiler error, and explain what `override` just protected you from.
4. Add a `Magazine` class to Example 2 whose `who()` returns `"magazine"`. Add it to the vector. How many lines of the loop did you have to change?
5. Type Example 3. Add `operator==` for two `Book` objects that compares titles, and test it with `if (a == b)`.
6. Make the `Item` destructor in Example 2 non-virtual and print a message from each `Book` and `DVD` destructor. Delete a `DVD` through an `Item*` and watch which destructors run.

## Lesson Project: Polymorphic Catalogue

### Objective

Turn the library catalogue into a **polymorphic** one: a `Catalogue` that owns items of every kind through base pointers, finds them with overloaded `find` functions, prints them with `cout << *item`, and calculates late fees at run time without a single `if (type == ...)`.

### Requirements

- `LibraryItem` has an id, a title, a virtual destructor and the virtual methods `kind()`, `describe()` and `late_fee(int days)`. The base fee is 5 per day.
- `Book` (author), `Magazine` (issue number) and `DVD` (minutes) derive from it, each overriding `kind()`, `describe()` (reusing the base version) and, for `Magazine` (2 per day) and `DVD` (10 per day), `late_fee`. A book keeps the base fee.
- Use `override` on every overriding method.
- `operator<<` for `LibraryItem` prints `describe()`.
- `Catalogue` stores `vector<unique_ptr<LibraryItem>>` and has `add`, an overloaded `find(int id)` and `find(const string& title)` (each returns a pointer or `nullptr`), `print()` and `print_fees(int days)`.
- `main` adds one item of each kind, prints the catalogue, finds items by id and by title, reports one failed search, and prints the late fee of every item for 3 days.

### Instructions

1. Write `LibraryItem` with its virtual methods and virtual destructor, and test `describe()` on a single object.
2. Write `Book`, `Magazine` and `DVD`, using `override`, and make sure each calls the base `describe()`.
3. Write `operator<<` and test it on one object through a base reference.
4. Write `Catalogue` with `add`, `print` and `print_fees`, storing the items as `unique_ptr`.
5. Add the two overloaded `find` functions.
6. Write `main` as specified and compare your output with the expected output.
7. Add a new class, `Newspaper`, in fewer than ten lines. Check that the loop in `print_fees` needs no change.

### Expected Output

```text
Catalogue:
  Book #101 Python Basics by A. Rahman
  Magazine #201 Science Today, issue 42
  DVD #301 How Computers Work, 95 min
Found by id: Magazine #201 Science Today, issue 42
Found by title: DVD #301 How Computers Work, 95 min
No item with id 999.
Late fees for 3 days:
  Python Basics: 15
  Science Today: 6
  How Computers Work: 30
```

### Hints

1. **Hint 1 (virtual base).** `virtual string describe() const { ... }` in the base, and `string describe() const override { ... }` in each derived class.
2. **Hint 2 (reusing the base).** `return LibraryItem::describe() + " by " + author_;`.
3. **Hint 3 (the container).** `catalogue.add(make_unique<Book>(101, "Python Basics", "A. Rahman"));` and `items_.push_back(move(item));` inside `add`.
4. **Hint 4 (the search).** Loop with `for (const auto& p : items_)` and return `p.get()` when the id matches; return `nullptr` at the end.
5. **Hint 5 (a compile error about an abstract or hidden function).** Compare the signatures: the parameter list and the `const` must match the base exactly.
6. **Hint 6 (calling through the pointer).** Use `p->late_fee(days)` and `*p` for the output operator.

### Success Criteria

- [ ] Every overriding method uses `override`, and the base class has a virtual destructor.
- [ ] The late fees come out as 15, 6 and 30 for 3 days, calculated through base pointers with no type test.
- [ ] Both `find` overloads work, and a failed search returns `nullptr` and is reported.
- [ ] `cout << *item` prints each item through the overloaded operator.
- [ ] Adding `Newspaper` required no change to `Catalogue`.
- [ ] The code compiles with `-Wall -Wextra` with no warnings, and the output matches the expected output.

### Extension Challenge

Write an overloaded `operator==` for `LibraryItem` that compares ids, and an overloaded `operator<` that compares titles, so that `sort` from `<algorithm>` can order a `vector<LibraryItem*>` alphabetically (give `sort` a lambda that dereferences the pointers). Then explain, in your own words, why sorting a `vector<LibraryItem>` of objects would slice them.

## Lesson Recap

- **Polymorphism**: one call, many behaviours. Compile-time: overloading. Run-time: virtual functions.
- **Overloading** gives related functions one name with different parameters. **Overriding** replaces a base method in a derived class, and needs `virtual` in the base so the real object decides.
- Always write `override`, and give every polymorphic base a virtual destructor.
- Store different kinds of objects in one container as `unique_ptr<Base>`; never as base objects by value.
- Overload `operator<<` and return the stream so objects print naturally and chain.

## Homework / Extension Mission

Extend the polymorphic catalogue with a new method, `virtual int loan_days() const`, returning 14 for a book, 7 for a magazine and 3 for a DVD, and use it to print each item's due day for a loan made on day 10. Add a `ReferenceBook` whose `loan_days()` returns 0, and make `Catalogue` print "not for loan" for it without testing its type. Then write a half-page explanation in your own words: how does the compiler know which `late_fee` to call for a `unique_ptr<LibraryItem>`, and what is the "price" of that flexibility in memory? (Hint: the vtable pointer.)

## Course Project Connection

This lesson makes the **Library Management System using C++** polymorphic: the `Catalogue` treats every kind of item uniformly, the late-fee logic lives in the item classes, and a new kind of item needs one new class. This fixes the third procedural weakness from Lesson 1 completely. In Lesson 6 you will make the system safer with an abstract `Borrowable` interface, a template repository, exceptions for failures and the STL containers.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: re-run Lesson 4's puzzle and name polymorphism. 10 minutes: overloading (Example 1) and the operator. 15 minutes: virtual functions, `override`, the vtable picture and the virtual destructor (Example 2). 25 minutes: the project, as a guided build.

**Live demonstrations.** Remove `virtual` and `override` one at a time and let the class predict the output. Print `sizeof` of a class with and without a virtual function to show the hidden vtable pointer. Delete a derived object through a non-virtual base destructor to show the missing destructor message.

**Misconceptions.** "Overriding and overloading are the same." "`virtual` makes the program slow" (the cost is one extra pointer dereference, usually small). "A base pointer cannot hold a derived object."

**Assessment of the project.** Check for `override` on every overriding method, the virtual destructor, `unique_ptr` ownership, the two `find` overloads, and the absence of any type test in `print_fees`. Ask each student to explain what `p->late_fee(3)` does when `p` points to a DVD.

**Reference solution `catalogue.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra catalogue.cpp -o catalogue`):

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>
using namespace std;

class LibraryItem {
private:
    int id_;
    string title_;

public:
    LibraryItem(int id, const string& title) : id_(id), title_(title) {}
    virtual ~LibraryItem() = default;

    int id() const { return id_; }
    const string& title() const { return title_; }

    virtual string kind() const { return "Item"; }
    virtual string describe() const { return kind() + " #" + to_string(id_) + " " + title_; }
    virtual int late_fee(int days) const { return 5 * days; }
};

class Book : public LibraryItem {
private:
    string author_;

public:
    Book(int id, const string& title, const string& author) : LibraryItem(id, title), author_(author) {}
    string kind() const override { return "Book"; }
    string describe() const override { return LibraryItem::describe() + " by " + author_; }
};

class Magazine : public LibraryItem {
private:
    int issue_;

public:
    Magazine(int id, const string& title, int issue) : LibraryItem(id, title), issue_(issue) {}
    string kind() const override { return "Magazine"; }
    string describe() const override { return LibraryItem::describe() + ", issue " + to_string(issue_); }
    int late_fee(int days) const override { return 2 * days; }
};

class DVD : public LibraryItem {
private:
    int minutes_;

public:
    DVD(int id, const string& title, int minutes) : LibraryItem(id, title), minutes_(minutes) {}
    string kind() const override { return "DVD"; }
    string describe() const override { return LibraryItem::describe() + ", " + to_string(minutes_) + " min"; }
    int late_fee(int days) const override { return 10 * days; }
};

ostream& operator<<(ostream& out, const LibraryItem& item)
{
    return out << item.describe();
}

class Catalogue {
private:
    vector<unique_ptr<LibraryItem>> items_;

public:
    void add(unique_ptr<LibraryItem> item) { items_.push_back(move(item)); }

    const LibraryItem* find(int id) const
    {
        for (const auto& p : items_) {
            if (p->id() == id) {
                return p.get();
            }
        }
        return nullptr;
    }

    const LibraryItem* find(const string& title) const
    {
        for (const auto& p : items_) {
            if (p->title() == title) {
                return p.get();
            }
        }
        return nullptr;
    }

    void print() const
    {
        for (const auto& p : items_) {
            cout << "  " << *p << '\n';
        }
    }

    void print_fees(int days) const
    {
        for (const auto& p : items_) {
            cout << "  " << p->title() << ": " << p->late_fee(days) << '\n';
        }
    }
};

int main()
{
    Catalogue catalogue;
    catalogue.add(make_unique<Book>(101, "Python Basics", "A. Rahman"));
    catalogue.add(make_unique<Magazine>(201, "Science Today", 42));
    catalogue.add(make_unique<DVD>(301, "How Computers Work", 95));

    cout << "Catalogue:\n";
    catalogue.print();

    if (const LibraryItem* p = catalogue.find(201)) {
        cout << "Found by id: " << *p << '\n';
    }
    if (const LibraryItem* p = catalogue.find("How Computers Work")) {
        cout << "Found by title: " << *p << '\n';
    }
    if (catalogue.find(999) == nullptr) {
        cout << "No item with id 999.\n";
    }

    cout << "Late fees for 3 days:\n";
    catalogue.print_fees(3);
    return 0;
}
```

```output
Catalogue:
  Book #101 Python Basics by A. Rahman
  Magazine #201 Science Today, issue 42
  DVD #301 How Computers Work, 95 min
Found by id: Magazine #201 Science Today, issue 42
Found by title: DVD #301 How Computers Work, 95 min
No item with id 999.
Late fees for 3 days:
  Python Basics: 15
  Science Today: 6
  How Computers Work: 30
```

**Differentiation.** Support: provide `LibraryItem`, `Book` and `Catalogue::print`, and let students add the other classes and `find`. Stretch: add `loan_days`, `Newspaper`, `operator==` and `sort`, and explain slicing with a counter-example.

**Discussion questions (not for the student quiz).** Why can a `unique_ptr` not be copied, only moved? When would you *not* make a function virtual?
