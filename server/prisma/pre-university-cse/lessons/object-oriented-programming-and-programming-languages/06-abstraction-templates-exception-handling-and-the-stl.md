# Lumexa Mission Log: Object-Oriented Programming & Programming Languages

**Course/Path:** Object-Oriented Programming & Programming Languages
**Lesson:** 06 of 08
**Title:** Abstraction, Templates, Exception Handling and the STL
**Duration:** 60 minutes
**Difficulty:** Advanced
**Technology:** C++ (g++)

---

## Mission Brief

Your library works, but it is fragile in three ways. First, code that lends items depends on the details of `Book` rather than on the *idea* of something that can be borrowed. Second, you keep writing the same "store things by id and find them" code for books, members and DVDs. Third, failures are reported with `false` and printed messages, which callers can easily ignore: a failed borrow silently continues as if nothing had happened.

Professional C++ answers each problem with a tool from this lesson: **abstraction** (programming to an interface), **templates** (one piece of code for any type), **exceptions** (errors that cannot be ignored) and the **Standard Template Library**, **STL** (ready-made containers and algorithms). Together they turn your library into a safe, reusable core.

## Learning Objectives

1. Define an abstract class with pure virtual functions and program to an interface.
2. Write function templates and class templates, and explain how the compiler uses them.
3. Throw, catch and define custom exceptions, and explain how the stack unwinds.
4. Choose among the STL containers `vector`, `map` and `set`, and use `sort`, `find_if` and `count_if` with lambdas.
5. Combine abstraction, templates, exceptions and the STL in one design.
6. Build the "Safe Library Core": a `Borrowable` interface, a template `Repository` and a family of library exceptions.

## Prerequisites

- Lessons 4 and 5: inheritance, virtual functions, `override` and `unique_ptr`.
- Lesson 3: object lifecycle, because exceptions run destructors as they unwind the stack.

## Concept Explanation

### Abstraction: the idea without the details

**Abstraction** means showing *what* something does and hiding *how*. When you drive a car you use the pedals and the wheel, not the engine. In C++ an **abstract class** states a set of operations that every implementation must provide, without saying how. It contains at least one **pure virtual function**, written `= 0`. You cannot create an object of an abstract class; you can only derive from it and implement every pure function.

```cpp
class Borrowable {                       // an interface
public:
    virtual ~Borrowable() = default;
    virtual void borrow() = 0;           // pure virtual: no body here
    virtual void give_back() = 0;
    virtual bool available() const = 0;
};

class Book : public Borrowable {
public:
    void borrow() override { /* ... */ }
    void give_back() override { /* ... */ }
    bool available() const override { return true; }
};
```

Now code can be written against the interface: `void lend(Borrowable& item)` works for any current or future class that implements `Borrowable`. This is **programming to an interface**, and it is why a change in `Book` cannot break the code that lends things.

### Templates: code that works for any type

A **template** is a pattern from which the compiler generates code for the types you use. A **function template** removes duplicated functions:

```cpp
template <typename T>
T larger(T a, T b) { return a > b ? a : b; }

larger(3, 9);            // T is int
larger(2.5, 1.5);        // T is double
```

A **class template** does the same for a whole class. The library's `Repository<T>` can store books, members or DVDs with the same code: `Repository<Book>`, `Repository<Member>`. The requirement is that the type supports what the template uses (here, `T` needs an `id()` method). The standard library is made of templates: `vector<int>` and `vector<string>` come from the same `vector<T>`.

### Exceptions: errors that cannot be ignored

Returning `false` is easy to ignore. An **exception** is an object thrown to signal an error; it travels up the call chain until something *catches* it, and the program cannot carry on as if nothing happened:

```cpp
try {
    book.borrow();                       // may throw
    cout << "borrowed\n";                // skipped if borrow() throws
} catch (const NoCopiesError& e) {       // handler for this kind of error
    cout << "problem: " << e.what() << '\n';
}
```

Inside the function you write `throw NoCopiesError(title);`. The standard library offers ready-made exception classes, all derived from `std::exception` and declared in `<stdexcept>`: `runtime_error`, `invalid_argument`, `out_of_range`. Every one has a `what()` method that returns its message. You can define your own by deriving from them; a **hierarchy of exceptions** lets callers catch a precise error or a whole family.

When an exception is thrown, C++ **unwinds the stack**: it leaves each function in turn, running the destructors of its local objects, until it finds a matching `catch`. That is why objects that clean up after themselves (RAII, Lesson 3) are exception-safe. Three rules matter:

- **Catch by `const` reference**, `catch (const exception& e)`, to avoid copying and slicing.
- **Order the handlers from specific to general.** The first matching `catch` wins, so put `NoCopiesError` before `LibraryError` before `exception`.
- **Use exceptions for exceptional failures** (a missing item, an impossible state), not for ordinary control flow.

Exceptions also solve the problem from Lesson 3: a constructor cannot return `false`, but it can `throw` when its arguments are invalid.

### The STL: containers, iterators and algorithms

The **Standard Template Library** gives you tested building blocks. **Containers** store data, **algorithms** work on it, and **iterators** connect them. The ones you will use most:

| Container | What it is | Lookup | Use it for |
|---|---|---|---|
| `vector<T>` | a growing array | by index; searching is slow | the default choice for a list |
| `map<K, V>` | key-value pairs, sorted by key | fast, by key | books by id |
| `set<T>` | unique values, sorted | fast membership test | unique authors |
| `unordered_map<K, V>` | key-value pairs, hashed | very fast, by key | large lookups, order not needed |

The header `<algorithm>` has `sort`, `find_if`, `count_if`, `max_element` and many more. They take a pair of iterators (`v.begin()`, `v.end()`) and often a **lambda**, a small unnamed function written in place:

```cpp
sort(books.begin(), books.end(), [](const Book& a, const Book& b) { return a.title() < b.title(); });
int free = count_if(books.begin(), books.end(), [](const Book& b) { return b.available(); });
```

Using the STL instead of hand-written loops gives you code that is shorter, tested and easier to read.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Abstraction** | Showing what an object does and hiding how it does it. |
| **Abstract class** | A class with at least one pure virtual function; it cannot be instantiated. |
| **Pure virtual function** | A virtual function declared `= 0` that derived classes must implement. |
| **Interface** | An abstract class that only lists the operations an implementation must provide. |
| **Template** | A pattern from which the compiler generates code for each type used. |
| **Exception** | An object thrown to signal an error and handled with `try` and `catch`. |
| **Stack unwinding** | Leaving functions one by one, running destructors, until a handler is found. |
| **STL** | The Standard Template Library: containers, iterators and algorithms. |
| **Iterator** | An object that points to an element of a container and can move along it. |
| **Lambda** | A small unnamed function written where it is used. |

## Worked Examples

### Example 1: An abstract interface

```cpp
#include <iostream>
#include <string>
using namespace std;

class Borrowable {
public:
    virtual ~Borrowable() = default;
    virtual bool borrow() = 0;
    virtual string name() const = 0;
};

class Book : public Borrowable {
private:
    int copies_ = 1;

public:
    bool borrow() override
    {
        if (copies_ == 0) {
            return false;
        }
        copies_--;
        return true;
    }
    string name() const override { return "Book"; }
};

class Laptop : public Borrowable {
public:
    bool borrow() override { return true; }
    string name() const override { return "Laptop"; }
};

void lend(Borrowable& item)
{
    cout << item.name() << ": " << (item.borrow() ? "lent" : "not available") << '\n';
}

int main()
{
    Book b;
    Laptop l;
    lend(b);
    lend(b);
    lend(l);
    return 0;
}
```

```output
Book: lent
Book: not available
Laptop: lent
```

1. `Borrowable` has only pure virtual functions, so it is an interface: `Borrowable x;` would not compile.
2. `Book` and `Laptop` are unrelated except that both promise to implement the interface.
3. `lend` is written once, against the interface. It works for `Book`, for `Laptop`, and for any class you write next year.
4. The book has one copy, so the second `lend(b)` reports "not available".

### Example 2: Templates and the STL together

```cpp
#include <algorithm>
#include <iostream>
#include <map>
#include <string>
#include <vector>
using namespace std;

template <typename T>
T larger(T a, T b)
{
    return a > b ? a : b;
}

int main()
{
    cout << larger(3, 9) << ' ' << larger(2.5, 1.5) << ' ' << larger<string>("pear", "apple") << '\n';

    vector<int> copies = {5, 2, 9, 1};
    sort(copies.begin(), copies.end(), [](int a, int b) { return a > b; });
    cout << "sorted high to low:";
    for (int c : copies) {
        cout << ' ' << c;
    }
    cout << '\n';
    int many = count_if(copies.begin(), copies.end(), [](int c) { return c >= 5; });
    cout << "titles with 5 or more copies: " << many << '\n';

    map<string, int> stock;
    stock["Python Basics"] = 2;
    stock["Digital Logic"] = 1;
    stock["Python Basics"] += 3;
    for (const auto& entry : stock) {
        cout << entry.first << " -> " << entry.second << '\n';
    }
    return 0;
}
```

```output
9 2.5 pear
sorted high to low: 9 5 2 1
titles with 5 or more copies: 2
Digital Logic -> 1
Python Basics -> 5
```

1. One template, `larger`, serves `int`, `double` and `string`; the compiler generates three versions. `larger<string>` names the type explicitly.
2. `sort` takes the range and a lambda that says "a comes before b if a is larger", so the numbers come out high to low.
3. `count_if` counts the elements for which the lambda returns `true`.
4. A `map` stores pairs sorted by key: "Digital Logic" comes before "Python Basics". `stock["Python Basics"] += 3` creates or updates an entry.

### Example 3: Exceptions and stack unwinding

```cpp
#include <iostream>
#include <stdexcept>
#include <string>
using namespace std;

class NoCopiesError : public runtime_error {
public:
    explicit NoCopiesError(const string& title) : runtime_error("no copies left of " + title) {}
};

class Guard {
public:
    Guard() { cout << "  guard on\n"; }
    ~Guard() { cout << "  guard off\n"; }
};

void borrow(const string& title, int copies)
{
    Guard g;
    if (copies == 0) {
        throw NoCopiesError(title);
    }
    cout << "  borrowed " << title << '\n';
}

int main()
{
    try {
        cout << "first call\n";
        borrow("Python Basics", 2);
        cout << "second call\n";
        borrow("Digital Logic", 0);
        cout << "this line is skipped\n";
    } catch (const NoCopiesError& e) {
        cout << "caught: " << e.what() << '\n';
    } catch (const exception& e) {
        cout << "other error: " << e.what() << '\n';
    }
    cout << "program continues\n";
    return 0;
}
```

```output
first call
  guard on
  borrowed Python Basics
  guard off
second call
  guard on
  guard off
caught: no copies left of Digital Logic
program continues
```

1. The first call succeeds, and `Guard` switches itself off when the function ends.
2. In the second call, `throw` leaves `borrow` immediately. Even so, "guard off" appears: while the stack unwinds, C++ runs the destructors of the local objects. That is what makes RAII safe with exceptions.
3. The line after the second call is skipped, because the control jumped to the matching handler.
4. The handler for `NoCopiesError` is listed first, so it catches this error; `exception` would catch any other standard error. After the handler the program carries on.

## Common Mistakes and Misconceptions

- **Instantiating an abstract class.** `Borrowable b;` does not compile. Create an object of a class that implements all the pure virtual functions.
- **Forgetting to implement every pure virtual function.** The derived class stays abstract, and you get an error when you try to create an object. `override` helps you spot mismatches.
- **Putting template code in a `.cpp` file.** The compiler needs the whole template when it generates code, so templates normally live in header files.
- **Catching by value.** `catch (exception e)` copies and slices the exception. Catch by `const` reference.
- **Wrong handler order.** If `catch (const exception&)` comes first, it catches everything and the specific handlers are never reached.
- **Using exceptions for normal flow.** Looping "until an exception happens" is slow and hard to read. Use exceptions for real errors.
- **Swallowing an exception with an empty `catch`.** The program carries on in an unknown state. Handle the error or let it travel up.
- **Hand-writing a loop the STL already provides.** `count_if`, `find_if` and `sort` are shorter and less error-prone.
- **Using `map::operator[]` just to look something up.** It *creates* a missing key. Use `find` or `at` when you only want to read.

## Guided Hands-On Activity

**Make the library safe.** Work with your teacher.

1. Type Example 1. Add a third class, `Projector`, that implements `Borrowable`, and lend it without changing `lend`.
2. Try to create `Borrowable x;` and read the error. Then remove the `override` keyword from `Book::name` and add a typo to the name; note which message the compiler gives.
3. Type Example 2. Call `larger(3, 2.5)` and read the error: why can the compiler not choose `T`? Fix it with `larger<double>(3, 2.5)`.
4. In Example 2, replace the lambda in `sort` so the numbers come out low to high, then use `find_if` to print the first number greater than 4.
5. Type Example 3. Swap the order of the two `catch` clauses and run it. What changes, and why?
6. Add `throw invalid_argument("copies must not be negative");` to `borrow` when `copies < 0` and call it with `-1`. Which handler catches it?

## Lesson Project: Safe Library Core

### Objective

Rebuild the foundations of the library so they are **safe and reusable**: an abstract `Borrowable` interface, a hierarchy of library exceptions, a `Repository<T>` class template that stores any kind of item by id, and STL algorithms for reports.

### Requirements

- An abstract class `Borrowable` with pure virtual `borrow()`, `give_back()` and `available() const`, and a virtual destructor.
- `Book` implements `Borrowable`. Its `borrow()` throws `NoCopiesError` when no copy is left.
- A `LibraryError` class derived from `runtime_error`, and two classes derived from it: `NotFoundError(int id)` and `NoCopiesError(const string& title)`.
- A class template `Repository<T>` backed by a `map<int, T>` with `add(const T&)` (throws `invalid_argument` for a duplicate id), `get(int id)` (throws `NotFoundError`), `size() const` and `all() const` (returns a `vector<T>` in id order). `T` must have an `id()` method.
- Use the repository for both `Book` and a small `Member` class.
- `main` makes a borrowing helper with `try` and `catch`, borrows an available book, one with no copies and an unknown id, adds a duplicate book id, and then uses `sort` and `count_if` with lambdas to print the books in title order and the number that are available.

### Instructions

1. Write the exception classes and test each one with a `throw` inside `try` in `main`.
2. Write `Borrowable` and `Book`, with `borrow()` throwing `NoCopiesError`.
3. Write `Repository<T>` and test it with one `Book`.
4. Write the small `Member` class (`id()`, `name()`) and create a `Repository<Member>` to prove that the template is reusable.
5. Write the `try_borrow` helper that borrows by id and prints a message for success, for `NoCopiesError` and for any other `LibraryError`.
6. Write the duplicate-id test with a `catch (const exception&)`.
7. Sort the books by title and count the available ones with lambdas, and compare your output with the expected output.

### Expected Output

```text
Books: 3, members: 2
Borrowed "Python Basics".
Cannot borrow: no copies left of "Bangla Poems".
Library error: no item with id 999.
Rejected: duplicate id 101.
Books by title:
  Bangla Poems (copies: 0)
  Digital Logic (copies: 1)
  Python Basics (copies: 1)
Available titles: 2
```

### Hints

1. **Hint 1 (exception classes).** `class NotFoundError : public LibraryError { public: explicit NotFoundError(int id) : LibraryError("no item with id " + to_string(id)) {} };`
2. **Hint 2 (the template).** `template <typename T> class Repository { map<int, T> items_; ... };`
3. **Hint 3 (the duplicate check).** Use `items_.count(item.id()) > 0` and `throw invalid_argument("duplicate id " + to_string(item.id()));`.
4. **Hint 4 (the order of handlers).** `catch (const NoCopiesError&)`, then `catch (const LibraryError&)`, so the specific one comes first.
5. **Hint 5 (a template compile error).** Read the *first* error line only: it usually names the line of your own code that the template used.
6. **Hint 6 (a map insert surprise).** `insert` does nothing if the key exists; test for the duplicate yourself first.

### Success Criteria

- [ ] `Borrowable` is abstract, and `Book` implements it with `override`.
- [ ] Failures are reported with exceptions, and the handlers are ordered from specific to general and catch by `const` reference.
- [ ] `Repository<T>` works for two different types without any change to its code.
- [ ] The report uses `sort` and `count_if` with lambdas, not hand-written loops.
- [ ] No error is ignored: each of the four failures produces a message.
- [ ] The code compiles with `-Wall -Wextra` and no warnings, and the output matches the expected output.

### Extension Challenge

Make `Repository<T>` offer `template <typename Pred> vector<T> where(Pred pred) const` that returns every item for which the predicate is true, and use it to list the available books. Then add a `LimitReachedError` for members who try to borrow a fourth book, and write the `Member::borrow` that throws it. Which parts of `main` did you not have to change?

## Lesson Recap

- **Abstraction** hides how and shows what. An abstract class has pure virtual functions; program against the interface, not the implementation.
- **Templates** let one definition work for many types; `Repository<Book>` and `Repository<Member>` share one class.
- **Exceptions** make errors impossible to ignore. Throw objects, catch by `const` reference, order handlers from specific to general, and rely on destructors for clean-up while the stack unwinds.
- The **STL** provides containers (`vector`, `map`, `set`), algorithms (`sort`, `find_if`, `count_if`) and lambdas, so you rarely write loops by hand.
- Together they turn a working program into a safe, reusable core.

## Homework / Extension Mission

Add a `Magazine` class that implements `Borrowable` and store magazines in a third repository, `Repository<Magazine>`. Write one function template `report(const Repository<T>& repo)` that prints the number of items and then each item's id, working for all three types. Make sure every failure in your program is reported with an exception and that no `catch` block is empty. Finally, write a short note: which of the four tools in this lesson (abstraction, templates, exceptions, STL) would you remove last, and why?

## Course Project Connection

This lesson builds the **safe core** of the **Library Management System using C++**: an interface that code can depend on, a reusable `Repository<T>` for books, members and later items, and a family of exceptions that make every failure visible. In Lesson 7 you will port `Book` and `Member` to Java and compare how the two languages express the same ideas, and in Lesson 8 you will assemble the final application on top of this core.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: abstraction and Example 1. 10 minutes: templates and the STL (Example 2). 10 minutes: exceptions and unwinding (Example 3, step through on the board). 30 minutes: the project, as a guided build.

**Live demonstrations.** Show the template error message for `larger(3, 2.5)` and teach students to read the first line. Run Example 3 with the catch order swapped. Use the debugger to step into a `throw` and watch the destructors run.

**Misconceptions.** "Exceptions are slow, so avoid them everywhere" (they cost only when thrown; use them for real errors). "A template is a class" (it is a recipe for classes). "`map[...]` only reads."

**Assessment of the project.** Verify that `Borrowable` is abstract, that no handler catches by value or is empty, that the repository code is shared between two types, and that the report uses algorithms with lambdas.

**Reference solution `core.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra core.cpp -o core`):

```cpp
#include <algorithm>
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>
#include <vector>
using namespace std;

class LibraryError : public runtime_error {
public:
    explicit LibraryError(const string& message) : runtime_error(message) {}
};

class NotFoundError : public LibraryError {
public:
    explicit NotFoundError(int id) : LibraryError("no item with id " + to_string(id)) {}
};

class NoCopiesError : public LibraryError {
public:
    explicit NoCopiesError(const string& title) : LibraryError("no copies left of \"" + title + "\"") {}
};

class Borrowable {
public:
    virtual ~Borrowable() = default;
    virtual void borrow() = 0;
    virtual void give_back() = 0;
    virtual bool available() const = 0;
};

class Book : public Borrowable {
private:
    int id_;
    string title_;
    int copies_;

public:
    Book(int id, const string& title, int copies) : id_(id), title_(title), copies_(copies) {}
    int id() const { return id_; }
    const string& title() const { return title_; }
    int copies() const { return copies_; }

    void borrow() override
    {
        if (copies_ == 0) {
            throw NoCopiesError(title_);
        }
        copies_--;
    }
    void give_back() override { copies_++; }
    bool available() const override { return copies_ > 0; }
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

template <typename T>
class Repository {
private:
    map<int, T> items_;

public:
    void add(const T& item)
    {
        if (items_.count(item.id()) > 0) {
            throw invalid_argument("duplicate id " + to_string(item.id()));
        }
        items_.insert({item.id(), item});
    }

    T& get(int id)
    {
        auto it = items_.find(id);
        if (it == items_.end()) {
            throw NotFoundError(id);
        }
        return it->second;
    }

    size_t size() const { return items_.size(); }

    vector<T> all() const
    {
        vector<T> out;
        for (const auto& entry : items_) {
            out.push_back(entry.second);
        }
        return out;
    }
};

void try_borrow(Repository<Book>& books, int id)
{
    try {
        Book& b = books.get(id);
        b.borrow();
        cout << "Borrowed \"" << b.title() << "\".\n";
    } catch (const NoCopiesError& e) {
        cout << "Cannot borrow: " << e.what() << ".\n";
    } catch (const LibraryError& e) {
        cout << "Library error: " << e.what() << ".\n";
    }
}

int main()
{
    Repository<Book> books;
    books.add(Book(101, "Python Basics", 2));
    books.add(Book(102, "Digital Logic", 1));
    books.add(Book(103, "Bangla Poems", 0));

    Repository<Member> members;
    members.add(Member(1, "Anika"));
    members.add(Member(2, "Rafi"));
    cout << "Books: " << books.size() << ", members: " << members.size() << '\n';

    try_borrow(books, 101);
    try_borrow(books, 103);
    try_borrow(books, 999);

    try {
        books.add(Book(101, "Duplicate", 1));
    } catch (const exception& e) {
        cout << "Rejected: " << e.what() << ".\n";
    }

    vector<Book> all = books.all();
    sort(all.begin(), all.end(), [](const Book& a, const Book& b) { return a.title() < b.title(); });
    cout << "Books by title:\n";
    for (const Book& b : all) {
        cout << "  " << b.title() << " (copies: " << b.copies() << ")\n";
    }
    int free = static_cast<int>(count_if(all.begin(), all.end(), [](const Book& b) { return b.available(); }));
    cout << "Available titles: " << free << '\n';
    return 0;
}
```

```output
Books: 3, members: 2
Borrowed "Python Basics".
Cannot borrow: no copies left of "Bangla Poems".
Library error: no item with id 999.
Rejected: duplicate id 101.
Books by title:
  Bangla Poems (copies: 0)
  Digital Logic (copies: 1)
  Python Basics (copies: 1)
Available titles: 2
```

**Differentiation.** Support: provide the exception classes and `Borrowable`, and let students write `Book` and the `try_borrow` helper. Stretch: add the `where` predicate, `LimitReachedError` and a `Repository<Magazine>`.

**Discussion questions (not for the student quiz).** Why is it better for `borrow()` to throw than to return `false`? What might go wrong if a template is written for a type that has no `id()` method?
