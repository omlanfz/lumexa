# Lumexa Mission Log: Object-Oriented Programming & Programming Languages

**Course/Path:** Object-Oriented Programming & Programming Languages
**Lesson:** 03 of 08
**Title:** Constructors, Destructors and Object Lifecycle
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** C++ (g++)

---

## Mission Brief

Your `Book` class from Lesson 2 refuses bad data, but there is still a gap: a `Book` is born in an *unset* state and only becomes useful after someone remembers to call the right setters. A forgotten call leaves a book with the title "(untitled)" and no author. In a library with thousands of books, someone will forget.

C++ solves this with **constructors**: special functions that run automatically at the moment an object is created, so it is valid from its very first instant. Its partner, the **destructor**, runs automatically when the object disappears, so it can clean up after itself. Today you learn the whole **life of an object**, from birth to destruction, and you build the `Member` class of the library while tracing every step.

## Learning Objectives

1. Write default, parameterized and copy constructors, and use a member initializer list.
2. Make a constructor give an object a valid state, even when it receives invalid arguments.
3. Write a destructor and explain when C++ calls it, including the reverse order of destruction.
4. Trace the lifecycle of objects through blocks, function calls and copies.
5. Explain when an object is copied, and avoid needless copies with `const` references.
6. Build the `Member` class of the Library Management System, with a lifecycle trace.

## Prerequisites

- Lesson 2: classes, private attributes, public methods and validated setters.
- Lesson 1: references and `const` references, which decide when copies happen.

## Concept Explanation

### Constructors: a valid object from the first instant

A **constructor** has the same name as its class and no return type. C++ calls it automatically whenever an object is created. A class may have several constructors with different parameters; the compiler picks the one that matches how you create the object:

```cpp
class Book {
private:
    string title_;
    int copies_;

public:
    Book() : title_("(untitled)"), copies_(0) {}                  // default constructor
    Book(const string& title, int copies)                         // parameterized constructor
        : title_(title.empty() ? "(untitled)" : title),
          copies_(copies < 0 ? 0 : copies) {}
};

Book a;                          // calls Book()
Book b("Python Basics", 3);      // calls Book(string, int)
```

The part after the colon is the **member initializer list**: it sets each attribute at the moment it is created, which is better (and sometimes required) compared with assigning inside the body. A constructor cannot return `false`, so when it receives invalid data it must either fall back on a safe value, as above, or report the failure with an exception (Lesson 6). The constructor is where an object's invariants are first established.

### Destructors: cleaning up

A **destructor** has the name of the class with a `~` in front, takes no parameters and returns nothing. It runs automatically when the object is destroyed, which gives the class a place to release what it owns: close a file, free memory, or record that it has gone.

```cpp
class Member {
public:
    ~Member() { cout << "goodbye\n"; }
};
```

You never call a destructor yourself for an ordinary variable. Tying the release of a resource to the end of an object's life is a central C++ idea called **RAII**, and it is why a `vector` can free its own memory without a `free` call.

### The lifecycle of an object

An object's life has three stages: **created** (a constructor runs), **in use** (its methods run), and **destroyed** (its destructor runs). What ends its life depends on where it lives:

| Where the object lives | Created | Destroyed |
|---|---|---|
| A local variable | when execution reaches the declaration | when execution leaves its block `{ }` |
| A parameter passed by value | when the function is called (a copy) | when the function ends |
| An element of a `vector` | when it is added | when it is removed or the vector is destroyed |
| On the heap (`new`) | when `new` runs | when you call `delete` |

Local objects are destroyed in the **reverse order** of their creation: the last one created is the first one destroyed. Objects on the heap are created with `new` and must be released with `delete`; a modern program usually avoids that by letting a `vector` or a smart pointer such as `unique_ptr` own the object.

### Copying objects

When an object is copied, C++ builds the new object with a **copy constructor**, which receives the original as a `const` reference: `Member(const Member& other)`. A copy happens when you write `Member c = a;`, when you pass an object **by value** to a function, and when you return one by value or add one to a `vector`. If you do not write a copy constructor, the compiler writes one that copies every attribute. That is usually correct, but a class that owns a resource, such as a raw pointer, needs its own careful copy rules. To avoid needless copies, pass objects by `const` reference.

### Static members: data that belongs to the class

A `static` attribute is shared by *all* objects of the class instead of being copied into each one. A constructor can add one to a counter and the destructor can subtract one, so the class always knows how many objects are alive. A `static` method can be called on the class itself: `Member::alive()`.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Constructor** | A function with the class's name that runs automatically when an object is created. |
| **Default constructor** | A constructor that needs no arguments. |
| **Member initializer list** | The `: a_(x), b_(y)` part that sets attributes as they are created. |
| **Destructor** | A function named `~ClassName` that runs automatically when an object is destroyed. |
| **Lifecycle** | The stages of an object's life: created, in use, destroyed. |
| **Scope** | The region of code in which a variable exists, usually a `{ }` block. |
| **Copy constructor** | A constructor that builds a new object as a copy of an existing one. |
| **RAII** | Resource Acquisition Is Initialization: an object releases what it owns in its destructor. |
| **Static member** | A member that belongs to the class itself and is shared by all its objects. |
| **Heap object** | An object created with `new`; it lives until `delete` is called. |

## Worked Examples

### Example 1: Constructors that always produce a valid object

```cpp
#include <iostream>
#include <string>
using namespace std;

class Book {
private:
    string title_;
    int copies_;

public:
    Book() : title_("(untitled)"), copies_(0) {}
    Book(const string& title, int copies)
        : title_(title.empty() ? "(untitled)" : title),
          copies_(copies < 0 ? 0 : copies) {}

    void display() const
    {
        cout << title_ << " - copies: " << copies_ << '\n';
    }
};

int main()
{
    Book a;
    Book b("Python Basics", 3);
    Book c("", -4);
    a.display();
    b.display();
    c.display();
    return 0;
}
```

```output
(untitled) - copies: 0
Python Basics - copies: 3
(untitled) - copies: 0
```

1. `Book a;` calls the default constructor, so the book is valid even though no data was supplied.
2. `Book b("Python Basics", 3);` calls the parameterized constructor; the initializer list copies the good data.
3. `Book c("", -4);` passes two bad values. The constructor replaces them with safe ones, so the object is never invalid.
4. Because the constructors establish the invariants, no `Book` can exist in a broken state, and the "forgotten setter" problem is gone.

### Example 2: Constructors and destructors in order

```cpp
#include <iostream>
#include <string>
using namespace std;

class Noisy {
private:
    string name_;

public:
    Noisy(const string& name) : name_(name) { cout << "construct " << name_ << '\n'; }
    ~Noisy() { cout << "destroy " << name_ << '\n'; }
};

int main()
{
    Noisy a("A");
    {
        Noisy b("B");
        Noisy c("C");
        cout << "inner block ends\n";
    }
    Noisy d("D");
    cout << "main ends\n";
    return 0;
}
```

```output
construct A
construct B
construct C
inner block ends
destroy C
destroy B
construct D
main ends
destroy D
destroy A
```

1. `A` is created first. The braces open an inner block in which `B` and `C` are created.
2. When the inner block ends, its objects are destroyed in **reverse** order: `C` first, then `B`. `A` is untouched.
3. `D` is created next. When `main` ends, the remaining objects are destroyed in reverse order of creation: `D`, then `A`.
4. Nobody called the destructors: C++ calls them at exactly the right moment, every time. That is the guarantee that makes cleanup reliable.

### Example 3: When is an object copied?

```cpp
#include <iostream>
using namespace std;

class Tag {
public:
    Tag() { cout << "  made\n"; }
    Tag(const Tag&) { cout << "  copied\n"; }
    ~Tag() { cout << "  gone\n"; }
};

void by_value(Tag t) { cout << "  inside by_value\n"; }
void by_reference(const Tag& t) { cout << "  inside by_reference\n"; }

int main()
{
    Tag t;
    cout << "call by_value:\n";
    by_value(t);
    cout << "call by_reference:\n";
    by_reference(t);
    cout << "end of main\n";
    return 0;
}
```

```output
  made
call by_value:
  copied
  inside by_value
  gone
call by_reference:
  inside by_reference
end of main
  gone
```

1. `Tag t;` runs the default constructor once: "made".
2. `by_value(t)` has to build the parameter as a copy, so the copy constructor runs, and the copy is destroyed as soon as the function ends.
3. `by_reference(t)` makes no copy at all, so there is no "copied" and no extra "gone".
4. The last "gone" belongs to `t` itself, at the end of `main`. Passing large objects by `const` reference avoids all the copies, which is why Lesson 1 recommended it.

## Common Mistakes and Misconceptions

- **Giving a constructor a return type.** `void Book() {}` is an ordinary function, not a constructor. A constructor has no return type, not even `void`.
- **Assigning in the body instead of initializing.** It works for simple types, but a member that is a `const` or a reference *must* be set in the initializer list.
- **Initializer list order surprises.** Members are initialized in the order they are *declared* in the class, not the order you write them in the list. Keep the two the same.
- **Writing `Book b();` to create an object.** That declares a function! Write `Book b;` or `Book b{};`.
- **Calling a destructor by hand.** For an ordinary local object, C++ calls it for you. Calling it yourself would destroy the object twice.
- **Forgetting `delete` for an object made with `new`.** The object never gets destroyed, so its destructor never runs. Prefer a plain variable, a `vector`, or `unique_ptr`.
- **Passing big objects by value.** Every call copies the whole object. Use `const Type&` unless the function needs its own copy.
- **Thinking a constructor can refuse to create an object.** It cannot return a failure; give safe defaults or signal failure with an exception.

## Guided Hands-On Activity

**Watch an object live and die.** Work with your teacher.

1. Type Example 2 and run it. Before you run it, write down the order of the messages you expect, then compare.
2. Add a third level of braces with a new `Noisy` object `E` inside, and predict where its destruction message appears.
3. Move the line `Noisy d("D");` to the very top of `main`. How does the order of the final messages change?
4. Type Example 3 and run it. Change `by_reference(const Tag& t)` to `by_reference(Tag t)` and watch the new "copied" and "gone" lines appear.
5. In Example 1, add a constructor call with only a title, `Book("Atlas")`, by giving the second parameter a default value: `int copies = 1`. Create an object with it.
6. Write a class `Door` whose constructor prints "door built" and whose destructor prints "door removed". Create one `Door` in `main`, one in a block, and one with `new` that you forget to delete. Which message never appears?

## Lesson Project: Member Class and Lifecycle Trace

### Objective

Build the **`Member` class** of the Library Management System with a default constructor, a parameterized constructor that always yields a valid object, a copy constructor, a destructor and a static counter of live members. Then write a `main` that traces the lifecycle of members through blocks, copies and function calls.

### Requirements

- Make `Member` with private `id_`, `name_` and `borrowed_` (the number of books the member holds, from 0 to 3).
- Provide a default constructor (id 0, name "(guest)") and a parameterized constructor `Member(int id, const string& name)` that replaces an invalid id (not positive) with 0 and an empty name with "(guest)". Use initializer lists.
- Provide a copy constructor and a destructor, each printing a one-line message that shows the name (`[create]`, `[copy]`, `[destroy]`).
- Keep a `static int alive_` counter, increased by every constructor and decreased by the destructor, with a `static int alive()` method.
- Provide `borrow()` (returns `false` after 3 books), `give_back()` and `display() const`.
- `main` must show the counter before, inside and after a block, a function that takes a `Member` by value and one that takes it by `const` reference, a copy made with `Member c = a;`, and a member created from invalid data.

### Instructions

1. Write the class with the three attributes, the static counter (remember to define it outside the class: `int Member::alive_ = 0;`) and `display() const`.
2. Add the default and the parameterized constructors with initializer lists, each printing a `[create]` line and increasing the counter.
3. Add the copy constructor and the destructor, with their messages and the counter changes.
4. Add `borrow()` and `give_back()` with the limit of three books.
5. Write the two functions `show_by_value(Member m)` and `show_by_reference(const Member& m)`.
6. Write `main` as described in the requirements, with the messages `Entering a block` and `Leaving the block` around the block.
7. Run the program, check every `[create]` has a matching `[destroy]`, and compare with the expected output.

### Expected Output

```text
Start. Members alive: 0
Entering a block
  [create] Anika
  [create] (guest)
Members alive: 2
  [copy] Anika
  inside show_by_value
  member 101: Anika, books: 1
  [destroy] Anika
  inside show_by_reference
  member 101: Anika, books: 1
  [copy] Anika
Members alive: 3
Leaving the block
  [destroy] Anika
  [destroy] (guest)
  [destroy] Anika
After the block. Members alive: 0
Invalid data falls back to safe values:
  [create] (guest)
  member 0: (guest), books: 0
End of main
  [destroy] (guest)
```

### Hints

1. **Hint 1 (the counter).** A `static` attribute is declared inside the class and *defined* once outside: `int Member::alive_ = 0;`.
2. **Hint 2 (a safe id).** In the initializer list write `id_(id > 0 ? id : 0)`, and do the same idea for the name with `name.empty()`.
3. **Hint 3 (the copy).** `Member(const Member& other) : id_(other.id_), name_(other.name_), borrowed_(other.borrowed_) { ... }`.
4. **Hint 4 (the order of messages).** Draw the objects on paper in the order they are created and cross them out in reverse order as each scope ends.
5. **Hint 5 (a missing destroy line).** Objects declared in `main` are destroyed after the `return` statement, so their messages appear after the last line you print.
6. **Hint 6 (a negative counter).** Check that *every* constructor, including the copy constructor, increases `alive_`.

### Success Criteria

- [ ] Each constructor leaves the object valid, and invalid arguments are replaced by safe values.
- [ ] Every `[create]` or `[copy]` line has a matching `[destroy]` line, and the live-member count returns to zero.
- [ ] The trace shows a copy for the pass-by-value call and none for the `const` reference call.
- [ ] Objects are destroyed in the reverse order of their creation.
- [ ] The code compiles with `-Wall -Wextra` with no warnings, and the output matches the expected output.

### Extension Challenge

Make the class own a resource: give `Member` a private `string* notes_` created with `new` in the constructors and released with `delete` in the destructor. First leave out the copy constructor and see what the compiler-generated copy does when two members share one pointer. Then write a copy constructor that makes a **deep copy** and explain in two sentences why a destructor and a copy constructor usually come together.

## Lesson Recap

- A **constructor** runs when an object is created, so the object is valid from its first instant. Use a member initializer list.
- A **destructor** runs automatically when the object's life ends, so a class can clean up after itself (RAII).
- Local objects are destroyed in reverse order of creation, at the end of their block.
- A copy constructor builds an object from an existing one; passing by value copies, and passing by `const` reference does not.
- A `static` member belongs to the class and is shared by all objects, for example a counter of live objects.

## Homework / Extension Mission

Add a `Book` constructor to your Lesson 2 class so that every `Book` is valid when it is created, and keep the setters for later changes. Then extend your `Member` trace: create a `vector<Member>` with three members and print the live counter after each `push_back`, then after the vector goes out of scope. Look carefully at how many `[copy]` lines appear, and write a paragraph that explains why `push_back` caused copies and which C++ feature (`reserve` or `emplace_back`) could reduce them. Finally, answer: why can a constructor not return `false` and what are two ways to report a bad argument?

## Course Project Connection

This lesson adds the second class of the **Library Management System using C++**: `Member`, together with a lifecycle trace that proves every object is created and destroyed correctly. Your `Book` now also gets a constructor, so both classes are valid from the first instant. In Lesson 4 a `Loan` will be built from a member and a book, and you will rely on the constructors you wrote here to make sure every part of a loan is valid.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: why constructors (use the "forgotten setter" story). 10 minutes: destructors and Example 2 on the board. 10 minutes: copies and Example 3. 30 minutes: the project, as a guided build with the trace.

**Live demonstrations.** Draw the stack of live objects on the board and cross them out as each scope ends. Show the compiler-generated copy by deleting the copy constructor from Example 3. Show `Book b();` being treated as a function declaration (the "most vexing parse").

**Misconceptions.** "A destructor frees the object's memory" (it runs just before the memory is released; it releases *resources the object owns*). "Objects in different scopes live as long as the program." "A copy is always harmless."

**Assessment of the project.** Verify that the counter returns to zero, that each message pair matches, that the copy appears only for the by-value call, and that students can explain the reverse destruction order.

**Reference solution `member.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra member.cpp -o member`):

```cpp
#include <iostream>
#include <string>
using namespace std;

class Member {
private:
    int id_;
    string name_;
    int borrowed_;
    static int alive_;

public:
    Member() : id_(0), name_("(guest)"), borrowed_(0)
    {
        alive_++;
        cout << "  [create] " << name_ << '\n';
    }
    Member(int id, const string& name)
        : id_(id > 0 ? id : 0), name_(name.empty() ? "(guest)" : name), borrowed_(0)
    {
        alive_++;
        cout << "  [create] " << name_ << '\n';
    }
    Member(const Member& other) : id_(other.id_), name_(other.name_), borrowed_(other.borrowed_)
    {
        alive_++;
        cout << "  [copy] " << name_ << '\n';
    }
    ~Member()
    {
        alive_--;
        cout << "  [destroy] " << name_ << '\n';
    }

    bool borrow()
    {
        if (borrowed_ >= 3) {
            return false;
        }
        borrowed_++;
        return true;
    }
    void give_back()
    {
        if (borrowed_ > 0) {
            borrowed_--;
        }
    }
    void display() const
    {
        cout << "  member " << id_ << ": " << name_ << ", books: " << borrowed_ << '\n';
    }
    static int alive() { return alive_; }
};

int Member::alive_ = 0;

void show_by_value(Member m)
{
    cout << "  inside show_by_value\n";
    m.display();
}

void show_by_reference(const Member& m)
{
    cout << "  inside show_by_reference\n";
    m.display();
}

int main()
{
    cout << "Start. Members alive: " << Member::alive() << '\n';
    {
        cout << "Entering a block\n";
        Member a(101, "Anika");
        Member b;
        a.borrow();
        cout << "Members alive: " << Member::alive() << '\n';
        show_by_value(a);
        show_by_reference(a);
        Member c = a;
        cout << "Members alive: " << Member::alive() << '\n';
        cout << "Leaving the block\n";
    }
    cout << "After the block. Members alive: " << Member::alive() << '\n';

    cout << "Invalid data falls back to safe values:\n";
    Member bad(-7, "");
    bad.display();
    cout << "End of main\n";
    return 0;
}
```

```output
Start. Members alive: 0
Entering a block
  [create] Anika
  [create] (guest)
Members alive: 2
  [copy] Anika
  inside show_by_value
  member 101: Anika, books: 1
  [destroy] Anika
  inside show_by_reference
  member 101: Anika, books: 1
  [copy] Anika
Members alive: 3
Leaving the block
  [destroy] Anika
  [destroy] (guest)
  [destroy] Anika
After the block. Members alive: 0
Invalid data falls back to safe values:
  [create] (guest)
  member 0: (guest), books: 0
End of main
  [destroy] (guest)
```

**Differentiation.** Support: provide the class with the attributes and `display`, and let students add one constructor at a time and watch the trace. Stretch: add the `notes_` pointer with a deep copy, then rewrite it with `unique_ptr` or `vector<string>` and explain why no destructor is needed.

**Discussion questions (not for the student quiz).** Why does C++ destroy objects in reverse order? What would happen if two `Member` objects both owned the same raw pointer and both destructors ran?
