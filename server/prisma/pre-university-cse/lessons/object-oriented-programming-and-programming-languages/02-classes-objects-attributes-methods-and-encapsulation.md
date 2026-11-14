# Lumexa Mission Log: Object-Oriented Programming & Programming Languages

**Course/Path:** Object-Oriented Programming & Programming Languages
**Lesson:** 02 of 08
**Title:** Classes, Objects, Attributes, Methods and Encapsulation
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** C++ (g++)

---

## Mission Brief

At the end of the last lesson, one careless line, `book.copies = -5;`, put your catalogue into an impossible state. The rule "a book never has negative copies" lived only in your head. Today you fix that for good. You will design a **class** called `Book`, keep its data **private**, and let the outside world change it only through **methods** that check every change. The rule moves out of your head and into the code.

This is the first and most important object-oriented idea: **encapsulation**. By the end of the lesson you will have a `Book` class that cannot be put into a bad state, however carelessly the rest of the program behaves.

## Learning Objectives

1. Define a class with attributes (data members) and methods (member functions), and create objects from it.
2. Explain the difference between a class and an object, and show that each object has its own state.
3. Use `private` and `public` to hide data and expose a small interface.
4. Write getters and validated setters that protect an object's rules (its invariants).
5. Use `const` methods and `this`, and call methods on objects stored in a vector.
6. Build the `Book` class for the Library Management System and test it with good and bad data.

## Prerequisites

- Lesson 1: `string`, `vector`, references, `const` references and the weaknesses of procedural code.
- Course 1: structures and the dot operator.

## Concept Explanation

### Classes and objects

A **class** is a blueprint: it describes what every book has (a title, a number of copies) and what every book can do (be borrowed). An **object** is one actual book made from that blueprint. You can make as many objects as you like from one class, and each has its own values, called its **state**.

```cpp
class Book {
public:
    string title;
    int copies;
};

Book a;            // an object of type Book
a.title = "Python Basics";
a.copies = 2;
Book b;            // a second, separate object
```

This first class has no protection yet: it is a structure with a new name. The rest of the lesson turns it into a real class.

### Attributes and methods

The variables inside a class are its **attributes** (or data members). The functions inside it are its **methods** (or member functions). A method is called on an object with the dot operator, and it can use that object's attributes directly by name:

```cpp
class Book {
public:
    string title;
    int copies;

    void display() const {
        cout << title << " (" << copies << " copies)\n";
    }
};

Book a;
a.title = "Python Basics";
a.copies = 2;
a.display();       // Python Basics (2 copies)
```

Inside a method, the name `title` means "the `title` of the object this method was called on". C++ makes that object available as the pointer `this`, so `title` and `this->title` are the same. The word `const` after the parameter list promises that the method only reads the object and never changes it.

### Encapsulation: private data and a public interface

**Encapsulation** means bundling data with the methods that use it and **hiding** the data from outside code. C++ controls this with two access specifiers:

- `private`: only the class's own methods may use the member. This is the default in a `class`.
- `public`: any code may use the member.

```cpp
class Book {
private:
    int copies_ = 0;        // hidden state

public:
    int copies() const { return copies_; }         // getter: read it
    bool set_copies(int n) {                       // setter: change it, with a check
        if (n < 0) {
            return false;                          // refuse an impossible value
        }
        copies_ = n;
        return true;
    }
};
```

Now `book.copies_ = -5;` does not compile: the compiler refuses to let outside code touch a private member. The only way to change `copies_` is `set_copies`, which checks first. By convention, private attributes get a trailing underscore (`copies_`) so that the public getter can use the plain name `copies()`.

### Invariants: rules an object always keeps

A rule that must always be true for an object, such as "copies are never negative" or "a title is never empty", is its **invariant**. Encapsulation lets a class guarantee its invariants: the object starts in a valid state (here through default values written next to the attribute, such as `int copies_ = 0;`) and every setter checks before it changes anything. A setter can return `bool` to tell the caller whether the change was accepted. Everything the outside world may do to the object is the class's **interface**; how it stores the data is an **implementation detail** that the class is free to change later.

### Methods that change state

Some methods change the object: `borrow()` reduces the copies and `give_back()` increases them. A method may also refuse to act, for example when no copy is left. Because the method lives inside the class, it can use `copies_` directly while the outside code cannot.

### `struct` or `class`?

In C++ a `struct` is almost the same as a `class`; the only difference is that members are **public by default** in a `struct` and **private by default** in a `class`. Use `struct` for plain bundles of data and `class` for types that protect their rules.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Class** | A blueprint that defines the attributes and methods of its objects. |
| **Object** | One actual instance of a class, with its own state. |
| **Attribute** | A variable that belongs to an object (also called a data member). |
| **Method** | A function that belongs to a class (also called a member function). |
| **State** | The current values of an object's attributes. |
| **Encapsulation** | Bundling data with its methods and hiding the data from outside code. |
| **Access specifier** | `private` or `public`: who may use a member. |
| **Getter / setter** | Methods that read or change a private attribute. |
| **Invariant** | A rule that is always true for a valid object. |
| **Interface** | The public methods through which the outside world uses an object. |

## Worked Examples

### Example 1: One class, two independent objects

```cpp
#include <iostream>
#include <string>
using namespace std;

class Book {
private:
    string title_ = "(untitled)";
    int copies_ = 0;

public:
    void set(const string& title, int copies) {
        title_ = title;
        copies_ = copies;
    }
    bool borrow() {
        if (copies_ == 0) {
            return false;
        }
        copies_--;
        return true;
    }
    void display() const {
        cout << title_ << " - copies: " << copies_ << '\n';
    }
};

int main()
{
    Book a;
    Book b;
    a.set("Python Basics", 2);
    b.set("Digital Logic", 1);
    a.borrow();
    a.display();
    b.display();
    return 0;
}
```

```output
Python Basics - copies: 1
Digital Logic - copies: 1
```

1. `Book` is the class: one blueprint. `a` and `b` are two objects, each with its own `title_` and `copies_`.
2. `a.borrow()` changes only `a`: its copies go from 2 to 1. The object `b` is untouched.
3. `display` is marked `const` because it only reads the object. Inside it, `title_` means "the title of the object `display` was called on".
4. `main` cannot write `a.copies_ = 7;`: the member is private.

### Example 2: Setters that protect the rules

```cpp
#include <iostream>
#include <string>
using namespace std;

class Book {
private:
    string title_ = "(untitled)";
    int year_ = 0;
    int copies_ = 0;

public:
    bool set_title(const string& t) {
        if (t.empty()) {
            return false;
        }
        title_ = t;
        return true;
    }
    bool set_year(int y) {
        if (y < 1450 || y > 2026) {
            return false;
        }
        year_ = y;
        return true;
    }
    bool set_copies(int n) {
        if (n < 0) {
            return false;
        }
        copies_ = n;
        return true;
    }
    int copies() const { return copies_; }
    int year() const { return year_; }
};

int main()
{
    Book b;
    cout << boolalpha;
    cout << "set_copies(3): " << b.set_copies(3) << '\n';
    cout << "set_copies(-5): " << b.set_copies(-5) << '\n';
    cout << "copies are still " << b.copies() << '\n';
    cout << "set_year(1200): " << b.set_year(1200) << '\n';
    cout << "set_title(\"\"): " << b.set_title("") << '\n';
    return 0;
}
```

```output
set_copies(3): true
set_copies(-5): false
copies are still 3
set_year(1200): false
set_title(""): false
```

1. `cout << boolalpha;` makes `true` and `false` print as words instead of 1 and 0.
2. `set_copies(3)` passes the check and returns `true`; `set_copies(-5)` is refused and returns `false`.
3. The refused call changed nothing: `copies()` is still 3. The object stayed in a valid state.
4. The same idea protects the year (1450 to 2026) and the title (not empty). The rules live in one place, the class, instead of being repeated by every caller.

### Example 3: `const` methods and a vector of objects

```cpp
#include <iostream>
#include <string>
#include <vector>
using namespace std;

class Book {
private:
    string title_;
    int copies_;

public:
    void set(const string& title, int copies) {
        title_ = title;
        copies_ = copies;
    }
    const string& title() const { return title_; }
    int copies() const { return copies_; }
};

int total_copies(const vector<Book>& shelf)
{
    int total = 0;
    for (const Book& b : shelf) {
        total += b.copies();
    }
    return total;
}

int main()
{
    vector<Book> shelf(3);
    shelf[0].set("Python Basics", 2);
    shelf[1].set("Digital Logic", 1);
    shelf[2].set("Bangla Poems", 3);
    cout << "books: " << shelf.size() << ", copies: " << total_copies(shelf) << '\n';
    cout << "first: " << shelf[0].title() << '\n';
    return 0;
}
```

```output
books: 3, copies: 6
first: Python Basics
```

1. `vector<Book> shelf(3);` makes a vector holding three `Book` objects.
2. `total_copies` receives the vector by `const` reference, so it may call only `const` methods. `b.copies()` is `const`, so it is allowed; calling `b.set(...)` there would not compile.
3. This is why getters are marked `const`: without it, a read-only function could not use them.
4. The methods work the same on objects stored in a container as on single variables.

## Common Mistakes and Misconceptions

- **Making every attribute public.** That is a structure again. Keep attributes private and give the outside world only the methods it needs.
- **Writing a getter and a setter for everything without checks.** A setter that just assigns protects nothing. Add the rule (range, not empty, not negative) or do not expose the attribute at all.
- **Forgetting `const` on getters.** A function that receives `const Book&` cannot call a non-`const` method, and the error message is long. Mark every read-only method `const`.
- **Confusing class and object.** `Book` is the type; `Book a;` is an object. You cannot call `Book.display()`; you call `a.display()`.
- **Believing `private` means secret from the user.** It controls which *code* may touch the data, and the compiler enforces it. It is not about hiding data from the person running the program.
- **Forgetting the semicolon after the closing brace of a class.** `class Book { ... };` needs it, and omitting it gives confusing errors.
- **Using an attribute before giving it a value.** An `int` member with no initial value contains garbage. Write a default next to the attribute (`int copies_ = 0;`).
- **Putting display and input inside every method.** A method that computes a result should return it; let `main` decide what to print.

## Guided Hands-On Activity

**Protect the shelf.** Work with your teacher.

1. Type Example 1 and run it. Add a third object and a method `give_back()`, then borrow and return so that the copies go up and down.
2. In `main`, add the line `a.copies_ = 9;`. Read the compiler's error message and find the word *private* in it. Then remove the line.
3. Type Example 2. Add the invariant that the number of copies may never be more than 100, and test it with 100 and 101.
4. Change `set_year` so that it also rejects years in the future, using a constant such as `const int CURRENT_YEAR = 2026;`.
5. In Example 3, delete the word `const` from `copies()` and recompile. Which function breaks, and why?
6. Write a `display() const` method for the class in Example 3 that prints the title and the copies on one line, and call it for every book with a range-based for loop.

## Lesson Project: The Book Class

### Objective

Create the **`Book` class** for the Library Management System. It must keep all of its data private, accept only valid data, and offer a small interface to borrow, return and display. The class must be impossible to put into an invalid state.

### Requirements

- Make a class `Book` with private attributes `id_`, `title_`, `author_`, `year_` and `copies_`, each with a safe default value.
- Provide validated setters that return `bool`: the id must be positive, the title and author must not be empty, the year must be from 1450 to 2026 and the copies must not be negative.
- Provide `const` getters for all five attributes.
- Provide `borrow()` (returns `false` when no copy is left) and `give_back()`.
- Provide `display() const`, which prints a one-line summary of the book.
- `main` creates two books, shows that invalid values are rejected and that the object keeps its old valid value, borrows until a title has no copy left, and displays both books.

### Instructions

1. Write the class with the private attributes and their default values, and a `display() const` method. Test it on one object that you leave unset.
2. Add the five setters with their rules. Make each one change the attribute only after the check passes.
3. Add the `const` getters, then `borrow()` and `give_back()`.
4. Write `main`: create `a` and `b`, set valid details on both, then call the setters with invalid values and print what each returns.
5. Borrow from `a` until `borrow()` returns `false` and print the results with `boolalpha`.
6. Display both books and compare your output with the expected output below.
7. Add a comment to your class that lists its invariants, one per line.

### Expected Output

```text
set_copies(-5): false
set_year(1200): false
set_title(""): false
set_id(0): false
borrow a: true
borrow a: true
borrow a: false
101 | Python Basics by A. Rahman (2021) | copies: 1
102 | Digital Logic by S. Karim (2019) | copies: 1
```

### Hints

1. **Hint 1 (default values).** Write `int copies_ = 0;` and `string title_ = "(untitled)";` right next to the attribute declarations.
2. **Hint 2 (a setter).** Test the bad case first and return `false`; assign and return `true` only after it. Never assign before the check.
3. **Hint 3 (printing booleans).** Put `cout << boolalpha;` once at the start of `main`.
4. **Hint 4 (a getter returning text).** Return `const string&` and mark the method `const`: `const string& title() const { return title_; }`.
5. **Hint 5 (display).** Build the line with `<<`, for example `cout << id_ << " | " << title_ << " by " << author_ << " (" << year_ << ") | copies: " << copies_ << '\n';`.

### Success Criteria

- [ ] Every attribute is `private` and has a safe default value.
- [ ] A rejected setter call returns `false` and leaves the old value untouched.
- [ ] `borrow()` returns `false` when there is no copy left, and `give_back()` increases the count.
- [ ] All getters and `display` are `const`, and the code compiles with `-Wall -Wextra` and no warnings.
- [ ] Writing `a.copies_ = -5;` in `main` does not compile (I tried it, then removed the line).
- [ ] The output matches the expected output exactly.

### Extension Challenge

Add a `Member` class with a private id, a private name and a private count of books borrowed, where the count may never exceed 3. Write a method `bool can_borrow() const`. Then think about the next problem: `Book` and `Member` are both created in an unset state and filled by setters. What could go wrong if a programmer forgets to call a setter? Write down how you would solve it. Lesson 3 gives the answer.

## Lesson Recap

- A **class** is a blueprint; an **object** is one instance with its own state. Methods are the functions that belong to the class.
- **Encapsulation** hides the data (`private`) and exposes a small interface (`public`).
- Validated **setters** and safe default values let a class keep its **invariants**: it can never be put into an invalid state.
- Mark every method that only reads as `const`, so it can be used on `const` objects and `const` references.
- Your `Book` class now protects itself, which fixes the first weakness of the procedural catalogue.

## Homework / Extension Mission

Add two new rules to `Book` and test them: a title may not be longer than 60 characters, and a book whose copies are zero must report "unavailable" in `display`. Then write a `main` that fills a `vector<Book>` with five books and prints only the available ones, using a `const` method `bool available() const`. Finally, write a short paragraph answering: "Which rule did your `Book` class enforce that the procedural catalogue from Lesson 1 could not?", and give one example of a line of code that compiled before and does not compile now.

## Course Project Connection

This lesson builds the first real class of the course project, the **Library Management System using C++**: the protected `Book`. In Lesson 3 you will add a constructor so a `Book` is valid from the first moment it exists, and a `Member` class. In Lesson 4 `Book` will become one kind of library item among several. Keep your `Book` class in its own file: it is the foundation that every later class in the library builds on.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: class versus object with the vending-machine or student-card analogy. 15 minutes: private, public and the getter/setter idea with Example 2. 10 minutes: `const` methods (Example 3). 25 minutes: the project, as a guided build.

**Live demonstrations.** Write `a.copies_ = -5;` live and read the compiler's complaint with the class. Pass the same object to a function taking `const Book&` and show which methods remain callable. Ask who is "allowed" to change `copies_` and trace every place in the program that does.

**Misconceptions.** "Private is about passwords or security" (it is a compile-time rule about which code may use a member). "Every attribute needs a getter and a setter" (expose only what the interface needs). "A class is the same as an object."

**Assessment of the project.** Check that no attribute is public, that every setter checks before assigning, that the getters are `const`, and that the invariants comment is accurate. Ask each student to explain what happens to the object when a setter rejects a value.

**Reference solution `book.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra book.cpp -o book`):

```cpp
#include <iostream>
#include <string>
using namespace std;

// Invariants of Book:
//  - id is positive
//  - title and author are never empty
//  - year is between 1450 and 2026
//  - copies is never negative
class Book {
private:
    int id_ = 0;
    string title_ = "(untitled)";
    string author_ = "(unknown)";
    int year_ = 2000;
    int copies_ = 0;

public:
    bool set_id(int id)
    {
        if (id <= 0) {
            return false;
        }
        id_ = id;
        return true;
    }
    bool set_title(const string& t)
    {
        if (t.empty()) {
            return false;
        }
        title_ = t;
        return true;
    }
    bool set_author(const string& a)
    {
        if (a.empty()) {
            return false;
        }
        author_ = a;
        return true;
    }
    bool set_year(int y)
    {
        if (y < 1450 || y > 2026) {
            return false;
        }
        year_ = y;
        return true;
    }
    bool set_copies(int n)
    {
        if (n < 0) {
            return false;
        }
        copies_ = n;
        return true;
    }

    int id() const { return id_; }
    const string& title() const { return title_; }
    const string& author() const { return author_; }
    int year() const { return year_; }
    int copies() const { return copies_; }

    bool borrow()
    {
        if (copies_ == 0) {
            return false;
        }
        copies_--;
        return true;
    }
    void give_back() { copies_++; }

    void display() const
    {
        cout << id_ << " | " << title_ << " by " << author_ << " (" << year_ << ") | copies: " << copies_ << '\n';
    }
};

int main()
{
    cout << boolalpha;
    Book a;
    a.set_id(101);
    a.set_title("Python Basics");
    a.set_author("A. Rahman");
    a.set_year(2021);
    a.set_copies(2);

    Book b;
    b.set_id(102);
    b.set_title("Digital Logic");
    b.set_author("S. Karim");
    b.set_year(2019);
    b.set_copies(1);

    cout << "set_copies(-5): " << a.set_copies(-5) << '\n';
    cout << "set_year(1200): " << a.set_year(1200) << '\n';
    cout << "set_title(\"\"): " << a.set_title("") << '\n';
    cout << "set_id(0): " << b.set_id(0) << '\n';

    cout << "borrow a: " << a.borrow() << '\n';
    cout << "borrow a: " << a.borrow() << '\n';
    cout << "borrow a: " << a.borrow() << '\n';
    a.give_back();

    a.display();
    b.display();
    return 0;
}
```

```output
set_copies(-5): false
set_year(1200): false
set_title(""): false
set_id(0): false
borrow a: true
borrow a: true
borrow a: false
101 | Python Basics by A. Rahman (2021) | copies: 1
102 | Digital Logic by S. Karim (2019) | copies: 1
```

**Differentiation.** Support: provide the class skeleton with the attributes and `display`, and let students write the setters one at a time. Stretch: add `Member`, a `static` counter of how many books exist, or a method that returns a one-line `string` instead of printing.

**Discussion questions (not for the student quiz).** Why might a library prefer `set_copies(-5)` to return `false` rather than stop the program? When is a plain `struct` the better choice than a class?
