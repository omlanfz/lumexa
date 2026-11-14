# Lumexa Mission Log: Object-Oriented Programming & Programming Languages

**Course/Path:** Object-Oriented Programming & Programming Languages
**Lesson:** 01 of 08
**Title:** Introduction to C++ and Procedural vs Object-Oriented Programming
**Duration:** 60 minutes
**Difficulty:** Beginner to Intermediate
**Technology:** C++ (g++)

---

## Mission Brief

A school library wants a small system to keep track of its books: who has borrowed what, and how many copies are left. You already know how to do this in C: a `struct`, an array and a handful of functions. In this course you will build that system twice, first the way you already know and then the way professional teams build large programs: with **objects**.

Today you start with the familiar way, now written in **C++**. It will work, and that is the point. As you build it, notice how the data and the functions that use it drift apart, and how easily one careless line can put the library into an impossible state, such as a book with minus five copies. That pain is exactly the problem that **object-oriented programming** was invented to solve.

## Learning Objectives

1. Explain how C++ relates to C, and compile and run a C++ program with `g++`.
2. Use `cin`, `cout`, `getline`, `std::string` and `std::vector` for input, output and collections.
3. Pass arguments by value, by reference and by `const` reference, and choose between them.
4. Describe procedural programming and name three weaknesses that appear as a program grows.
5. Describe the object-oriented idea (objects, classes and the four pillars) and compare it with procedural design.
6. Build the procedural version of the library catalogue as the baseline for the course project.

## Prerequisites

- Course 1: functions, arrays, structures and the habit of testing a program with known data.
- The `g++` compiler (or the C++ Code Lab, when your teacher has it enabled).

## Concept Explanation

### From C to C++

C++ was created by Bjarne Stroustrup in the early 1980s as "C with Classes". It keeps C's speed and most of its syntax, and adds tools for building large programs: **classes** and objects, a **standard library** (strings, vectors, algorithms), **references**, **templates** and **exceptions**. C++ source files end in `.cpp`, and you compile them with `g++`:

```text
g++ -std=c++17 -Wall -Wextra main.cpp -o main
```

Most of the C you wrote in Course 1 still compiles as C++, but good C++ replaces risky C tools with safer ones:

| Task | In C (Course 1) | In C++ |
|---|---|---|
| Output | `printf("%d\n", n);` | `cout << n << '\n';` |
| Input | `scanf("%d", &n);` | `cin >> n;` |
| Text | `char name[30];` | `string name;` |
| Growing list | `malloc` and `realloc` | `vector<int> v; v.push_back(5);` |
| Memory clean-up | you call `free` | the library does it for you |

### Input and output with iostream

The header `<iostream>` provides `cout` (output) and `cin` (input). The operator `<<` sends values to `cout`, and `>>` takes them from `cin`. The standard library lives in the **namespace** `std`; writing `using namespace std;` at the top lets you leave out the `std::` prefix.

```cpp
int copies;
cout << "Copies: ";
cin >> copies;
cout << "You entered " << copies << '\n';
```

`cin >> x` stops at whitespace, so it reads one word. To read a whole line, including spaces, use `getline(cin, line);`. If you read a number with `>>` and then call `getline`, the newline left behind is read as an empty line: call `cin.ignore();` in between. To align columns, include `<iomanip>` and use `setw(10)` and `left`.

### Strings and vectors

`std::string` holds text of any length. You join strings with `+`, compare them with `==`, and ask for `title.size()`. `std::vector<T>` is a list that grows by itself:

```cpp
vector<string> titles = {"Python Basics", "Digital Logic"};
titles.push_back("World Atlas");      // add at the end
cout << titles.size() << '\n';        // 3
for (const string& t : titles) {      // visit every element
    cout << t << '\n';
}
```

The loop `for (const string& t : titles)` is a **range-based for**: it visits every element without an index. `auto` lets the compiler work out a type for you (`auto n = titles.size();`).

### References and function parameters

By default C++ passes a **copy** of each argument, just like C. A **reference** parameter (`int& x`) is another name for the caller's variable, so the function can change it without the pointer syntax you met in Course 1. A **`const` reference** (`const vector<string>& v`) avoids the copy of a large object and promises not to change it.

| Parameter | Copies the argument? | Can change the caller's value? | Use it for |
|---|---|---|---|
| `int x` | yes | no | small values such as numbers |
| `int& x` | no | yes | a result the function must change |
| `const string& s` | no | no | big objects that are only read |

### Procedural programming, and where it hurts

In **procedural programming** you organise a program as a list of steps: data lives in variables and structures, and functions act on it. That is how you built the SRMS, and it works very well for small programs. As a program grows, three problems appear:

1. **No protection.** Any function (or any line in `main`) can change any value, even to something that makes no sense.
2. **Data and behaviour are separate.** Nothing links a `Book` to the functions that are allowed to change it; you must remember to pass the right data to the right function.
3. **Copy and paste to extend.** A new kind of item, such as a magazine, needs its own functions or long `if` chains, and a change to a book has to be repeated everywhere.

### Object-oriented programming: the big idea

In **object-oriented programming (OOP)** you design around *things*. An **object** bundles some data with the functions that work on that data; a **class** is the blueprint from which objects are made. The data can be hidden behind a small, safe interface, so that other code can only change it in ways the object allows. OOP rests on four ideas that you will meet one by one in this course: **encapsulation**, **abstraction**, **inheritance** and **polymorphism**.

| | Procedural | Object-oriented |
|---|---|---|
| Main question | "What steps must happen?" | "What things exist, and what can each do?" |
| Unit of design | the function | the object (data + functions) |
| Who may change the data? | any function | only the object's own functions |
| Adding a new kind of item | copy and edit functions | create a new class |

## Key Vocabulary

| Term | Definition |
|---|---|
| **C++** | A compiled language that extends C with classes, a standard library and safer tools. |
| **Namespace** | A named group of names; the standard library lives in `std`. |
| **`std::string`** | A library type that stores text of any length. |
| **`std::vector`** | A library type for a list that grows automatically. |
| **Reference (`&`)** | A second name for an existing variable. |
| **`const` reference** | A reference that reads the original without copying or changing it. |
| **Procedural programming** | Organising a program as steps: data in variables, behaviour in functions. |
| **Object** | A unit that bundles data with the functions that work on it. |
| **Class** | A blueprint that describes what its objects contain and can do. |
| **Paradigm** | A style or way of organising programs, such as procedural or object-oriented. |

## Worked Examples

### Example 1: Hello, Library (strings, vectors and input)

```cpp
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main()
{
    string name;
    cout << "Your name: ";
    getline(cin, name);

    vector<string> titles = {"Python Basics", "Digital Logic", "Bangla Poems"};
    titles.push_back("World Atlas");

    cout << "Welcome, " << name << "! The library has " << titles.size() << " titles:\n";
    for (const string& t : titles) {
        cout << " - " << t << '\n';
    }
    return 0;
}
```

```input
Anika Rahman
```

```output
Your name: Welcome, Anika Rahman! The library has 4 titles:
 - Python Basics
 - Digital Logic
 - Bangla Poems
 - World Atlas
```

1. `getline(cin, name)` reads the whole line, so a name with a space works. (The prompt and the greeting run together here only because the input comes from a file; at a keyboard the Enter key you press supplies the line break.)
2. The vector starts with three titles and `push_back` adds a fourth, so `titles.size()` is 4.
3. `for (const string& t : titles)` visits each title. The `const &` avoids copying every string.
4. There is no `free` and no array size to track: the vector manages its own memory.

### Example 2: Value, reference and const reference

```cpp
#include <iostream>
#include <string>
#include <vector>
using namespace std;

void fee_by_value(int fee) { fee += 5; }
void fee_by_reference(int& fee) { fee += 5; }

int total_letters(const vector<string>& titles)
{
    int total = 0;
    for (const string& t : titles) {
        total += static_cast<int>(t.size());
    }
    return total;
}

int main()
{
    int fee = 10;
    fee_by_value(fee);
    cout << "after fee_by_value: " << fee << '\n';
    fee_by_reference(fee);
    cout << "after fee_by_reference: " << fee << '\n';

    vector<string> titles = {"Python Basics", "Digital Logic"};
    cout << "letters in all titles: " << total_letters(titles) << '\n';
    return 0;
}
```

```output
after fee_by_value: 10
after fee_by_reference: 15
letters in all titles: 26
```

1. `fee_by_value` receives a copy, so the caller's `fee` stays 10.
2. `fee_by_reference` receives the variable itself, so `fee` becomes 15.
3. `total_letters` only reads the vector, so it takes it by `const` reference: no copy, and the compiler refuses any attempt to change it.
4. "Python Basics" has 13 characters and "Digital Logic" has 13, so the total is 26.

### Example 3: Nothing protects the data

```cpp
#include <iostream>
#include <string>
using namespace std;

struct Book {
    string title;
    int copies;
};

bool borrow(Book& b)
{
    if (b.copies == 0) {
        return false;
    }
    b.copies--;
    return true;
}

int main()
{
    Book b = {"Python Basics", 1};
    cout << borrow(b) << ' ' << borrow(b) << '\n';

    b.copies = -3;   // any code is allowed to do this
    cout << b.title << " has " << b.copies << " copies\n";
    return 0;
}
```

```output
1 0
Python Basics has -3 copies
```

1. The first `borrow` succeeds (`1`) and the second fails (`0`), because no copy is left.
2. In `main`, one careless line sets `copies` to -3. The `borrow` function carefully avoided going below zero, yet nothing stops other code from doing it.
3. This is weakness 1 from the lesson. The rule "copies are never negative" lives only in the programmer's head. In Lesson 2 you will make it part of the data itself.

## Common Mistakes and Misconceptions

- **Forgetting the headers.** Using `string` without `#include <string>` or `cout` without `#include <iostream>` gives long, confusing error messages. Include what you use.
- **Mixing `cin >>` with `getline`.** After `cin >> n` the Enter key is still waiting, so the next `getline` returns an empty line. Call `cin.ignore();` first.
- **Comparing text with a pointer mindset.** With `std::string`, `a == b` compares the text. (With C character arrays it compared addresses, as you saw in Course 1.)
- **Copying a big vector by accident.** `void show(vector<string> v)` copies every string on every call. Use `const vector<string>& v`.
- **Trusting `v[i]` blindly.** `v[10]` on a vector of 3 elements is undefined behaviour, just like an array in C. Use `v.at(10)` when you want a checked access that raises an error.
- **Thinking "C++ is just C with a new name".** C++ includes C, but it is also a different way of thinking. Writing C code with `.cpp` files misses its benefits.
- **Thinking OOP throws away functions.** An object's functions, called **methods**, are still functions. OOP changes where they live and who is allowed to call them.

## Guided Hands-On Activity

**From C habits to C++ habits.** Work with your teacher.

1. Type Example 1 into `hello.cpp`, compile it with `g++ -std=c++17 -Wall -Wextra hello.cpp -o hello` and run it. Add two more titles to the vector and watch the count change.
2. Replace the `getline` call with `cin >> name` and enter `Anika Rahman`. What happens to the second word, and why?
3. In Example 2, change `fee_by_reference` so it also subtracts a discount that is passed as a `const int&`. Predict the output before running it.
4. Add `cout << titles.at(5);` to Example 1 and run it. Read the error message the program ends with, then remove the line.
5. Type Example 3 and add a method-like safety rule: write `set_copies(Book& b, int n)` that refuses a negative number. Then notice that `b.copies = -3;` still works. Why is the function not enough?
6. On paper, list three kinds of data in a real library (books, members, loans) and the actions each needs. This list is the plan for the rest of the course.

## Lesson Project: Library Catalogue, Procedural Version

### Objective

Build the baseline of the course project: a small **procedural** library catalogue in C++ that adds books, lists them, and lets members borrow and return copies. You will then *see* its weaknesses with your own eyes, which is the reason the next seven lessons exist.

### Requirements

- Define `struct Book` with an `id`, a `title`, an `author` and the number of `copies` on the shelf, and keep all books in one `vector<Book>`.
- Write these functions, each receiving the catalogue as a parameter (no global variables): `add_book`, `find_index` (returns -1 when the id is unknown), `print_catalogue`, `borrow_book` and `return_book`.
- Pass the catalogue by reference when a function changes it and by `const` reference when it only reads it.
- `borrow_book` and `return_book` must return `true` or `false` and print a clear message for each outcome: success, no copies left, unknown id.
- `main` runs a scripted demonstration: add three books, print the catalogue, borrow one title three times (it has two copies), borrow an unknown id, return one copy, print again, and finally set a book's copies to -5 directly.
- End the source file with a comment that lists three weaknesses of this design.

### Instructions

1. Write `struct Book` and the `add_book` function. Test it by adding one book and printing its title from `main`.
2. Write `find_index`, using a loop over the vector and returning `-1` after the loop if nothing matches.
3. Write `print_catalogue` with `<iomanip>` so that the columns line up, and call it after adding the three books.
4. Write `borrow_book` (find the book, check the copies, decrease them, print a message) and test it with every outcome.
5. Write `return_book` in the same style, then write the scripted `main` from the requirements.
6. Add the careless line `catalogue[0].copies = -5;` at the end, print the result and read it.
7. Write the three-weakness comment, and check your output against the expected output below.

### Expected Output

```text
ID    Title             Author        Copies
101   Python Basics     A. Rahman     2
102   Digital Logic     S. Karim      1
103   Bangla Poems      R. Tagore     3

Borrowed "Python Basics". Copies left: 1
Borrowed "Python Basics". Copies left: 0
"Python Basics" has no copies left.
No book with id 999.
Returned "Python Basics". Copies now: 1

ID    Title             Author        Copies
101   Python Basics     A. Rahman     1
102   Digital Logic     S. Karim      1
103   Bangla Poems      R. Tagore     3

After one careless line: Python Basics has -5 copies.
```

### Hints

1. **Hint 1 (adding a book).** `catalogue.push_back({id, title, author, copies});` builds a `Book` from the four values and appends it.
2. **Hint 2 (the loop).** Use `for (size_t i = 0; i < catalogue.size(); i++)` and convert with `static_cast<int>(i)` when you return the index.
3. **Hint 3 (aligned columns).** `cout << left << setw(6) << b.id << setw(24) << b.title;` pads each field to a fixed width.
4. **Hint 4 (the messages).** Check the unknown id first, then the missing copies, and only then change the data.
5. **Hint 5 (a compile error about `size_t`).** Add `#include <vector>` and compare an index of type `size_t` with `catalogue.size()`, not with an `int`.

### Success Criteria

- [ ] The program compiles with `-Wall -Wextra` and no warnings.
- [ ] All five functions exist, take the catalogue as a parameter, and use `&` or `const &` correctly.
- [ ] Borrowing three times from a two-copy title fails the third time with a clear message, and an unknown id is reported.
- [ ] The output matches the expected output exactly, including the final negative copy count.
- [ ] The closing comment names three real weaknesses of the design in my own words.

### Extension Challenge

Add a `Member` structure with an id and a name, and a `vector<Member>`. Write `borrow_for_member` so that a member can borrow at most two books at once, which means you must also remember which books each member has. Notice how many separate vectors and functions you must now keep in step. Write down which weaknesses grew worse.

## Lesson Recap

- C++ extends C with classes, a standard library (`string`, `vector`), references and more, and you compile it with `g++`.
- Use `cin`, `cout` and `getline` for input and output; use `string` and `vector` instead of character arrays and `malloc`.
- Pass small values by value, results by reference and large read-only objects by `const` reference.
- Procedural programs keep data and functions apart, so anything can change the data, and extending them means copying code.
- Object-oriented programming bundles data with the functions allowed to change it. You will build it step by step, starting with a `Book` class in the next lesson.

## Homework / Extension Mission

Finish the procedural catalogue and make it interactive: add a text menu (list, borrow, return, quit) that reads the user's choice with `cin` and runs until the user quits. Test it with a script of at least ten commands and keep the script. Then write half a page, in your own words, answering three questions: Which rule in your program is only "in your head" and not enforced by the code? What would you have to change if the library also lent DVDs? Which part of your program would you most like to hide from the rest of the code, and why?

## Course Project Connection

This lesson builds the **baseline** of the course project, the **Library Management System using C++**. In the following lessons the same library grows: a protected `Book` class (Lesson 2), a `Member` class with a lifecycle (Lesson 3), a hierarchy of library items and loans (Lesson 4), polymorphic searching and printing (Lesson 5), a safe core with templates and exceptions (Lesson 6), a Java port (Lesson 7) and a finished, documented application (Lesson 8). Keep your catalogue and its "three weaknesses" comment: you will compare it with the final version at the end of the course.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: C to C++ and `g++`. 10 minutes: iostream, strings, vectors. 10 minutes: references. 10 minutes: procedural weaknesses and the OOP idea (use Example 3 live). 20 minutes: the project, as a guided build.

**Live demonstrations.** Show the same small task in C (`printf`, `char[]`) and C++ (`cout`, `string`) side by side. Make Example 3 fail on purpose and ask the class who is "responsible" for the rule that copies are never negative.

**Misconceptions.** "References are pointers" (they are aliases and cannot be null or re-seated). "`using namespace std;` is required" (it is a convenience). "OOP is always better" (small programs are fine procedurally; the benefit grows with size).

**Assessment of the project.** Check that every function receives the catalogue as a parameter, that `const &` is used for read-only functions, that all three borrow outcomes are handled, and that the weakness comment is specific (for example "`main` can set copies to -5") rather than generic.

**Reference solution `catalogue.cpp`** (compile with `g++ -std=c++17 -Wall -Wextra catalogue.cpp -o catalogue`):

```cpp
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

struct Book {
    int id;
    string title;
    string author;
    int copies;
};

void add_book(vector<Book>& catalogue, int id, const string& title, const string& author, int copies)
{
    catalogue.push_back({id, title, author, copies});
}

int find_index(const vector<Book>& catalogue, int id)
{
    for (size_t i = 0; i < catalogue.size(); i++) {
        if (catalogue[i].id == id) {
            return static_cast<int>(i);
        }
    }
    return -1;
}

void print_catalogue(const vector<Book>& catalogue)
{
    cout << left << setw(6) << "ID" << setw(18) << "Title" << setw(14) << "Author" << "Copies\n";
    for (const Book& b : catalogue) {
        cout << left << setw(6) << b.id << setw(18) << b.title << setw(14) << b.author << b.copies << '\n';
    }
}

bool borrow_book(vector<Book>& catalogue, int id)
{
    int i = find_index(catalogue, id);
    if (i == -1) {
        cout << "No book with id " << id << ".\n";
        return false;
    }
    if (catalogue[i].copies == 0) {
        cout << "\"" << catalogue[i].title << "\" has no copies left.\n";
        return false;
    }
    catalogue[i].copies--;
    cout << "Borrowed \"" << catalogue[i].title << "\". Copies left: " << catalogue[i].copies << '\n';
    return true;
}

bool return_book(vector<Book>& catalogue, int id)
{
    int i = find_index(catalogue, id);
    if (i == -1) {
        cout << "No book with id " << id << ".\n";
        return false;
    }
    catalogue[i].copies++;
    cout << "Returned \"" << catalogue[i].title << "\". Copies now: " << catalogue[i].copies << '\n';
    return true;
}

int main()
{
    vector<Book> catalogue;
    add_book(catalogue, 101, "Python Basics", "A. Rahman", 2);
    add_book(catalogue, 102, "Digital Logic", "S. Karim", 1);
    add_book(catalogue, 103, "Bangla Poems", "R. Tagore", 3);

    print_catalogue(catalogue);
    cout << '\n';
    borrow_book(catalogue, 101);
    borrow_book(catalogue, 101);
    borrow_book(catalogue, 101);
    borrow_book(catalogue, 999);
    return_book(catalogue, 101);
    cout << '\n';
    print_catalogue(catalogue);

    catalogue[0].copies = -5;
    cout << "\nAfter one careless line: " << catalogue[0].title << " has " << catalogue[0].copies << " copies.\n";
    return 0;
}

// Weaknesses of this design:
// 1. Any code can change any field, so "copies is never negative" is not enforced.
// 2. The data (Book) and the functions that may change it are only related by habit.
// 3. A new kind of item (a DVD) would need new functions or a long if-else chain.
```

```output
ID    Title             Author        Copies
101   Python Basics     A. Rahman     2
102   Digital Logic     S. Karim      1
103   Bangla Poems      R. Tagore     3

Borrowed "Python Basics". Copies left: 1
Borrowed "Python Basics". Copies left: 0
"Python Basics" has no copies left.
No book with id 999.
Returned "Python Basics". Copies now: 1

ID    Title             Author        Copies
101   Python Basics     A. Rahman     1
102   Digital Logic     S. Karim      1
103   Bangla Poems      R. Tagore     3

After one careless line: Python Basics has -5 copies.
```

**Differentiation.** Support: provide `struct Book`, `add_book` and `print_catalogue`, and let students write the borrow and return functions. Stretch: add the menu, the `Member` extension and a function that finds books by part of a title.

**Discussion questions (not for the student quiz).** Which of the three weaknesses would hurt most in a library with 50,000 books and ten programmers? Why might a language designer add classes to C instead of inventing a new language?
