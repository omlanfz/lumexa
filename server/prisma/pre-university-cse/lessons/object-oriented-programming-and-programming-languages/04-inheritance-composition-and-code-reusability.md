# Lumexa Mission Log: Object-Oriented Programming & Programming Languages

**Course/Path:** Object-Oriented Programming & Programming Languages
**Lesson:** 04 of 08
**Title:** Inheritance, Composition and Code Reusability
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** C++ (g++)

---

## Mission Brief

The library is growing. It no longer lends only books: it also lends magazines and DVDs. A book has an author, a magazine has an issue number and a DVD has a running time, but all three have an id, a title and a number of copies, and all three can be borrowed and returned. If you copy and paste the `Book` class twice, a fix to the borrowing rule must be repeated three times, and one copy will be forgotten. That is weakness 3 from Lesson 1.

The answer is **code reuse**, and C++ gives you two tools for it. **Inheritance** lets a new class build on an existing one ("a magazine *is a* library item"). **Composition** lets a class be built from other objects ("a loan *has a* member"). Knowing which to use is one of the most important design skills in object-oriented programming. Today you build the `LibraryItem` hierarchy and the `Loan` class that ties members and items together.

## Learning Objectives

1. Create a derived class from a base class, and explain what it inherits.
2. Use `public`, `protected` and `private` correctly in a hierarchy, and pass arguments to a base constructor.
3. Predict the order in which constructors and destructors run in an inheritance chain.
4. Decide between inheritance (*is-a*) and composition (*has-a*) for a design.
5. Reuse a base-class method from a derived class and extend it with new behaviour.
6. Build the `LibraryItem` hierarchy (`Book`, `Magazine`, `DVD`) and a `Loan` class for the Library Management System.

## Prerequisites

- Lesson 2: classes, private attributes, getters and setters.
- Lesson 3: constructors, member initializer lists and destructors.

## Concept Explanation

### Inheritance: an *is-a* relationship

**Inheritance** lets a new class, the **derived class**, take over the attributes and methods of an existing class, the **base class**, and then add its own. In C++ you write the base class after a colon:

```cpp
class LibraryItem {                  // base class
public:
    int id() const { return id_; }
private:
    int id_ = 0;
};

class Book : public LibraryItem {    // derived class: a Book is a LibraryItem
private:
    string author_;                  // new data that only books have
};
```

A `Book` object contains everything a `LibraryItem` has, plus its own `author_`. Use inheritance when the sentence "**X is a Y**" is true: a book *is a* library item, a DVD *is a* library item. Write `public` before the base class name: without it, `class` inheritance defaults to `private`, and the base's public methods are no longer public.

### Access control in a hierarchy

Besides `public` and `private`, a third specifier, `protected`, means "visible to this class and to the classes derived from it, but not to the outside world". The base class's **private** members still exist inside every derived object, but the derived class cannot touch them directly: it must use the base's public or protected methods. In most designs, keep attributes `private` and let the derived class use the base's public interface; this keeps the base free to change.

| Member of the base | The base class | A derived class | Outside code |
|---|---|---|---|
| `private` | yes | no | no |
| `protected` | yes | yes | no |
| `public` | yes | yes | yes |

### Building the base part: constructor chains

A derived object is built in two stages: first the **base part**, then the derived part. The derived class's constructor must say which base constructor to use, in its initializer list. Destruction runs the other way round: the derived part first, then the base part.

```cpp
Book(int id, const string& title, const string& author, int copies)
    : LibraryItem(id, title, copies),      // build the base part first
      author_(author) {}                   // then the Book's own data
```

If the base class has no default constructor and the derived constructor does not name one, the program does not compile: the compiler cannot guess what arguments the base needs.

### Reusing and extending base behaviour

A derived class gets every public method of its base for free: `book.borrow()` works without being rewritten. A derived class can also define its own version of a method with the same name and call the base version from inside it with the scope operator `::`:

```cpp
void describe() const {
    cout << "Book ";
    LibraryItem::describe();     // reuse the base's description
    cout << " by " << author_;   // then add the Book part
}
```

The result: the borrowing rule, the copy count and the basic description are written once in `LibraryItem`, and `Book`, `Magazine` and `DVD` each add only what is special about them.

### Composition: a *has-a* relationship

**Composition** builds a class from other objects stored as its attributes. Use it when the sentence "**X has a Y**" is true: a loan *has a* member, and *has a* due date. The parts are constructed before the whole and destroyed after it.

```cpp
class Loan {
private:
    Member member_;          // a Loan has a Member
    int due_day_;            // and a due date
};
```

### Choosing between them

Inheritance ties two classes tightly together: a change to the base can affect every derived class. Composition keeps classes independent. A good rule of thumb is: **use inheritance for a true *is-a* relationship, and prefer composition otherwise.** Never inherit just to reuse a method: a `Loan` is not a kind of `Member`, even though it uses one.

| | Inheritance | Composition |
|---|---|---|
| Relationship | **is-a**: a `Book` is a `LibraryItem` | **has-a**: a `Loan` has a `Member` |
| C++ form | `class Book : public LibraryItem` | `Member member_;` as an attribute |
| Coupling | tight | loose |
| Use it when | the derived class is a special kind of the base | one object is made from or uses another |

## Key Vocabulary

| Term | Definition |
|---|---|
| **Inheritance** | Building a new class on an existing one so it reuses its attributes and methods. |
| **Base class** | The class that is inherited from (also called the parent or superclass). |
| **Derived class** | The class that inherits (also called the child or subclass). |
| **is-a relationship** | The relationship that justifies inheritance: a book is a library item. |
| **has-a relationship** | The relationship modelled by composition: a loan has a member. |
| **Composition** | Building a class from objects stored as its attributes. |
| **`protected`** | An access level visible to the class and its derived classes only. |
| **Base constructor call** | Naming the base constructor in the derived class's initializer list. |
| **Code reuse** | Writing a rule once and using it everywhere it applies. |
| **Slicing** | Losing the derived part of an object when it is copied into a base-class object. |

## Worked Examples

### Example 1: The constructor chain

```cpp
#include <iostream>
#include <string>
using namespace std;

class LibraryItem {
private:
    string title_;

public:
    LibraryItem(const string& title) : title_(title) { cout << "LibraryItem built: " << title_ << '\n'; }
    ~LibraryItem() { cout << "LibraryItem destroyed\n"; }
};

class Book : public LibraryItem {
private:
    string author_;

public:
    Book(const string& title, const string& author) : LibraryItem(title), author_(author)
    {
        cout << "Book built, author " << author_ << '\n';
    }
    ~Book() { cout << "Book destroyed\n"; }
};

int main()
{
    Book b("Python Basics", "A. Rahman");
    cout << "main ends\n";
    return 0;
}
```

```output
LibraryItem built: Python Basics
Book built, author A. Rahman
main ends
Book destroyed
LibraryItem destroyed
```

1. Creating a `Book` first runs the `LibraryItem` constructor, because `Book(...)` names it in its initializer list, and only then the body of the `Book` constructor.
2. At the end of `main`, destruction runs in the reverse order: the `Book` destructor first, then the `LibraryItem` destructor.
3. This guarantees that the base part is complete before the derived part uses it, and still exists while the derived part is cleaned up.

### Example 2: Composition: the part is built before the whole

```cpp
#include <iostream>
#include <string>
using namespace std;

class Author {
private:
    string name_;

public:
    Author(const string& name) : name_(name) { cout << "Author built: " << name_ << '\n'; }
    ~Author() { cout << "Author destroyed: " << name_ << '\n'; }
    const string& name() const { return name_; }
};

class Book {
private:
    string title_;
    Author author_;

public:
    Book(const string& title, const string& author_name) : title_(title), author_(author_name)
    {
        cout << "Book built: " << title_ << '\n';
    }
    ~Book() { cout << "Book destroyed: " << title_ << '\n'; }
    void show() const { cout << title_ << " by " << author_.name() << '\n'; }
};

int main()
{
    Book b("Digital Logic", "S. Karim");
    b.show();
    return 0;
}
```

```output
Author built: S. Karim
Book built: Digital Logic
Digital Logic by S. Karim
Book destroyed: Digital Logic
Author destroyed: S. Karim
```

1. A `Book` *has an* `Author`: the author is stored inside the book as the attribute `author_`. This is composition.
2. The member initializer list builds `author_` before the body of the `Book` constructor runs, so the author exists when the book is complete.
3. On destruction the order reverses: the book first, then the author it contains.
4. The `Book` uses the author only through its public method `name()`. The two classes stay independent, which is why composition is called "loose coupling".

### Example 3: A base reference sees only the base part

```cpp
#include <iostream>
using namespace std;

class Item {
public:
    void who() const { cout << "item"; }
};

class Book : public Item {
public:
    void who() const { cout << "book"; }
};

void show(const Item& i)
{
    i.who();
}

int main()
{
    Book b;
    show(b);
    cout << ' ';
    b.who();
    cout << '\n';
    return 0;
}
```

```output
item book
```

1. `Book` defines its own `who`, so `b.who()` prints `book`.
2. The function `show` takes an `Item` reference. A `Book` *is an* `Item`, so the call is allowed, but through that reference C++ looks only at the `Item` part, and calls `Item::who`.
3. This surprises many programmers: the function chosen depends on the *declared* type of the reference, not on the real object. Lesson 5 shows how the keyword `virtual` changes this, and it is the key to polymorphism.

## Common Mistakes and Misconceptions

- **Inheriting to reuse code when the relationship is not *is-a*.** A `Loan` is not a kind of `Member`. If you cannot say "X is a Y" truthfully, use composition.
- **Forgetting `public` in `class Book : public LibraryItem`.** The inheritance becomes `private` and outside code cannot call the inherited methods.
- **Not calling a base constructor that needs arguments.** The error message mentions "no matching function for call to `LibraryItem::LibraryItem()`". Name the base constructor in the initializer list.
- **Making base attributes `protected` by habit.** It exposes the data to every derived class. Keep attributes `private` and use public methods.
- **Deep hierarchies.** A chain of five or six inherited classes is very hard to understand. Keep hierarchies shallow.
- **Expecting `Book::who` to be used through a base reference.** Without `virtual`, the base version runs (Example 3). That is the topic of the next lesson.
- **Copying a `Book` into a `vector<LibraryItem>`.** Only the `LibraryItem` part is stored: the author is *sliced off*. Store pointers or use polymorphism instead (Lesson 5).
- **Calling base methods by retyping their code.** Call the base version with `LibraryItem::describe()` so the rule stays in one place.

## Guided Hands-On Activity

**From one class to a family.** Work with your teacher.

1. Type Example 1. Add a `Magazine` class derived from `LibraryItem` with an `issue_` number and run it. Predict the six lines of output before you run it.
2. Remove `LibraryItem(title)` from the initializer list of `Book`, recompile, and read the error. What does the compiler say the base class is missing?
3. In Example 2, add a second `Author` attribute named `translator_`. In what order are the two authors constructed, and what decides that order?
4. Change `class Book : public Item` in Example 3 to `class Book : Item` (no `public`) and read the new error from `show(b)`.
5. For each pair, decide *is-a* or *has-a*, and write one sentence of explanation: Magazine and LibraryItem; Loan and Member; Library and Book; DVD and LibraryItem; Member and Loan.
6. Draw on paper the class diagram for `LibraryItem`, `Book`, `Magazine`, `DVD` and `Loan`, with an arrow from each derived class to its base. Keep it for Lesson 8.

## Lesson Project: Library Item Hierarchy and Loans

### Objective

Replace the separate `Book` class with a **hierarchy**: a base class `LibraryItem` that holds everything that books, magazines and DVDs share, and three derived classes that add only what is special. Then add a `Loan` class, built from a member and an item, so that the library can record who borrowed what.

### Requirements

- `LibraryItem` has private `id_`, `title_` and `copies_`, a constructor, getters, `borrow()`, `give_back()` and `describe() const`, which prints the base description without a line break.
- `Book` adds `author_`, `Magazine` adds an `issue_` number and `DVD` adds `minutes_`. Each derived constructor calls the base constructor, and each derived `describe()` reuses `LibraryItem::describe()` and adds its own part.
- A small `Member` class has an id and a name, with a `name()` getter.
- `Loan` stores a `Member` (composition), a reference to the borrowed `LibraryItem`, and a due day. It has `display() const`.
- `main` creates one book, one magazine and one DVD, describes all three, borrows items for a member (including a DVD that has only one copy, requested twice), stores the successful loans in a `vector<Loan>`, prints the loans and then the copies that remain, and finally describes the DVD once more through a `LibraryItem&` reference.

### Instructions

1. Write `LibraryItem` with its constructor, getters and the borrow and return methods, and test it with one object.
2. Add `Book` with the author, calling the base constructor and reusing the base's `describe()`.
3. Add `Magazine` and `DVD` the same way. Every derived constructor should be only a few lines.
4. Write the small `Member` class.
5. Write `Loan` with its three attributes and a `display() const` method that prints the member's name, the item's title and the due day.
6. Write `main`: describe the three items, make three borrow attempts, create a `Loan` for each success, print the loans and then the remaining copies.
7. Add the last lines of `main`: a `LibraryItem& any = dvd;` and a call to `any.describe();`.
8. Compare your output with the expected output, and write down why the last line shows only the base description of the DVD (see Example 3).

### Expected Output

```text
Book #101 Python Basics (copies: 2) by A. Rahman
Magazine #201 Science Today (copies: 1), issue 42
DVD #301 How Computers Work (copies: 1), 95 min
No copy of "How Computers Work" is left.
Loans:
Anika borrowed "Python Basics", due on day 14
Anika borrowed "How Computers Work", due on day 7
Copies left: book 1, magazine 1, dvd 0
Through a LibraryItem reference: #301 How Computers Work (copies: 0)
```

### Hints

1. **Hint 1 (the base call).** Write `Book(int id, const string& title, const string& author, int copies) : LibraryItem(id, title, copies), author_(author) {}`.
2. **Hint 2 (reusing the base).** Inside `Book::describe()` call `LibraryItem::describe();` and then print the extra part.
3. **Hint 3 (the loan).** `Loan(const Member& m, LibraryItem& item, int due_day) : member_(m), item_(item), due_day_(due_day) {}`.
4. **Hint 4 (only successful loans).** Call `borrow()` first and create the `Loan` only if it returned `true`.
5. **Hint 5 (the vector).** `vector<Loan> loans; loans.push_back(Loan(anika, book, 14));`
6. **Hint 6 (a compile error about a missing default constructor).** `Loan` has no default constructor, so create loans with their arguments and do not write `vector<Loan> loans(3);`.

### Success Criteria

- [ ] All shared data and rules are written once, in `LibraryItem`; no derived class repeats `id_`, `title_` or `copies_`.
- [ ] Each derived constructor calls the base constructor in its initializer list.
- [ ] `Loan` stores a `Member` by composition and refers to an item, and the code uses inheritance only for true *is-a* relationships.
- [ ] A second borrow of the one-copy DVD is refused, and no loan is created for it.
- [ ] The code compiles with `-Wall -Wextra` and no warnings, and the output matches the expected output.

### Extension Challenge

Add a fourth item type, `Newspaper`, in fewer than ten lines, and notice how little code a new kind of item needs. Then give `LibraryItem` a `late_fee(int days) const` method that returns 5 per day, and give `DVD` its own version that charges 10 per day. Test it on a `DVD` and on a `LibraryItem&` that refers to the same DVD. Which fee do you get through the reference, and why does that surprise you?

## Lesson Recap

- **Inheritance** (*is-a*) builds a derived class on a base class, so shared data and rules are written once.
- A derived constructor builds the base part first by naming the base constructor in its initializer list; destruction runs in reverse.
- Keep attributes `private` and let derived classes use the base's public interface; use `protected` sparingly.
- **Composition** (*has-a*) builds a class from other objects. Prefer it unless the relationship is truly *is-a*.
- Without `virtual`, a base reference runs the base version of a method. Lesson 5 explains how to fix that.

## Homework / Extension Mission

Extend your hierarchy with a `ReferenceBook` that cannot be borrowed (its `borrow()` should always fail). Then write a `Library` class that *has a* `vector<Book>` and a `vector<Loan>` and offers the methods `add_book`, `lend` and `report`. Draw the UML class diagram for everything you have so far, marking inheritance with a hollow-triangle arrow and composition with a filled diamond. Finally, write a paragraph answering: "Why did I use inheritance for `Book` but composition for `Loan`? What would have gone wrong if `Loan` had inherited from `Member`?"

## Course Project Connection

This lesson turns the separate `Book` into the **`LibraryItem` hierarchy** and adds the **`Loan`** class of the **Library Management System using C++**. The members you wrote in Lesson 3 are now stored inside loans, and the constructors you wrote there make every part valid. In Lesson 5 you will make the whole hierarchy *polymorphic*, so that one piece of code can print or search any kind of item correctly, and the limitation you saw in Example 3 will disappear.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the duplication problem and the *is-a* test. 15 minutes: inheritance mechanics with Example 1 (draw the memory layout of a `Book`: a `LibraryItem` part, then the `Book` part). 10 minutes: composition and the choice between them (Example 2). 25 minutes: the project, as a guided build.

**Live demonstrations.** Run Example 1 and have the class predict the order before running. Show Example 3 and ask students to guess the output; most predict `book book`. Ask for counter-examples to "a square is-a rectangle" to show that *is-a* in code means *behaves like*.

**Misconceptions.** "Inheritance is for reuse" (it is for *is-a*; reuse is a benefit). "A derived class can read its base's private members." "A base reference picks the derived method automatically."

**Assessment of the project.** Check that shared data is declared only in `LibraryItem`, that every derived constructor names the base constructor, that `Loan` uses composition for the member, and that the explanation of the base-reference observation is correct.

**Reference solution `hierarchy.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra hierarchy.cpp -o hierarchy`):

```cpp
#include <iostream>
#include <string>
#include <vector>
using namespace std;

class LibraryItem {
private:
    int id_;
    string title_;
    int copies_;

public:
    LibraryItem(int id, const string& title, int copies)
        : id_(id), title_(title), copies_(copies < 0 ? 0 : copies) {}

    int id() const { return id_; }
    const string& title() const { return title_; }
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

    void describe() const
    {
        cout << "#" << id_ << " " << title_ << " (copies: " << copies_ << ")";
    }
};

class Book : public LibraryItem {
private:
    string author_;

public:
    Book(int id, const string& title, const string& author, int copies)
        : LibraryItem(id, title, copies), author_(author) {}

    void describe() const
    {
        cout << "Book ";
        LibraryItem::describe();
        cout << " by " << author_;
    }
};

class Magazine : public LibraryItem {
private:
    int issue_;

public:
    Magazine(int id, const string& title, int issue, int copies)
        : LibraryItem(id, title, copies), issue_(issue) {}

    void describe() const
    {
        cout << "Magazine ";
        LibraryItem::describe();
        cout << ", issue " << issue_;
    }
};

class DVD : public LibraryItem {
private:
    int minutes_;

public:
    DVD(int id, const string& title, int minutes, int copies)
        : LibraryItem(id, title, copies), minutes_(minutes) {}

    void describe() const
    {
        cout << "DVD ";
        LibraryItem::describe();
        cout << ", " << minutes_ << " min";
    }
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

class Loan {
private:
    Member member_;
    LibraryItem& item_;
    int due_day_;

public:
    Loan(const Member& m, LibraryItem& item, int due_day) : member_(m), item_(item), due_day_(due_day) {}

    void display() const
    {
        cout << member_.name() << " borrowed \"" << item_.title() << "\", due on day " << due_day_ << '\n';
    }
};

int main()
{
    Book book(101, "Python Basics", "A. Rahman", 2);
    Magazine magazine(201, "Science Today", 42, 1);
    DVD dvd(301, "How Computers Work", 95, 1);

    book.describe();
    cout << '\n';
    magazine.describe();
    cout << '\n';
    dvd.describe();
    cout << '\n';

    Member anika(1, "Anika");
    vector<Loan> loans;
    if (book.borrow()) {
        loans.push_back(Loan(anika, book, 14));
    }
    if (dvd.borrow()) {
        loans.push_back(Loan(anika, dvd, 7));
    }
    if (dvd.borrow()) {
        loans.push_back(Loan(anika, dvd, 7));
    } else {
        cout << "No copy of \"" << dvd.title() << "\" is left.\n";
    }

    cout << "Loans:\n";
    for (const Loan& l : loans) {
        l.display();
    }
    cout << "Copies left: book " << book.copies() << ", magazine " << magazine.copies() << ", dvd " << dvd.copies() << '\n';

    LibraryItem& any = dvd;
    cout << "Through a LibraryItem reference: ";
    any.describe();
    cout << '\n';
    return 0;
}
```

```output
Book #101 Python Basics (copies: 2) by A. Rahman
Magazine #201 Science Today (copies: 1), issue 42
DVD #301 How Computers Work (copies: 1), 95 min
No copy of "How Computers Work" is left.
Loans:
Anika borrowed "Python Basics", due on day 14
Anika borrowed "How Computers Work", due on day 7
Copies left: book 1, magazine 1, dvd 0
Through a LibraryItem reference: #301 How Computers Work (copies: 0)
```

**Differentiation.** Support: provide `LibraryItem` and `Book` and let students write `Magazine`, `DVD` and `Loan` by following the pattern. Stretch: add `Newspaper`, the `late_fee` challenge, and a `Library` class that has-a vector of `Loan`.

**Discussion questions (not for the student quiz).** Why does the last line of the reference output show only the base description of the DVD? Is a `Square` a kind of `Rectangle` in code, if `set_width` on a square must also change its height?
