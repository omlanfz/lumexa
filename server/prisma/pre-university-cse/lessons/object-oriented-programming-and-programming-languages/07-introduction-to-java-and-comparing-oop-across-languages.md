# Lumexa Mission Log: Object-Oriented Programming & Programming Languages

**Course/Path:** Object-Oriented Programming & Programming Languages
**Lesson:** 07 of 08
**Title:** Introduction to Java and Comparing OOP Across Languages
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** Java (JDK) · C++ (g++)

---

## Mission Brief

The library board is impressed by your C++ system, but the school's IT team asks a fair question: "Could this also run on our teaching platform, which is written in Java?" You do not have to start from zero. Object-oriented ideas are not tied to one language: classes, objects, encapsulation, inheritance and polymorphism look very similar in C++, Java, C#, Python and Kotlin. What changes is the syntax and, more importantly, the *model* underneath: who manages memory, what is copied and what is shared.

In this lesson you meet **Java**, one of the most widely used languages in industry, port the `Book` and `Member` classes of your library to it, and build a comparison table that shows what is the same, what is different and why. Learning a second language this way is how professionals work: they recognise the ideas and look up the syntax.

## Learning Objectives

1. Explain how Java programs are compiled to bytecode and run by the Java Virtual Machine.
2. Write classes, constructors, getters, interfaces and subclasses in Java.
3. Explain how Java handles memory (references and garbage collection) differently from C++.
4. Use Java exceptions, `ArrayList` and `HashMap` in a small program.
5. Compare C++ and Java on at least eight points and explain the reasons for the differences.
6. Port `Book` and `Member` from C++ to Java and record the comparison table.

## Prerequisites

- Lessons 2 to 6: classes, constructors, inheritance, virtual functions, exceptions and the STL.
- A JDK (`javac` and `java`) or the Java Code Lab, when your teacher has it enabled.

## Concept Explanation

### Java at a glance

Java was released in 1995 with the promise "write once, run anywhere". The compiler `javac` does not produce machine code for one computer: it produces **bytecode**, stored in `.class` files, which the **Java Virtual Machine (JVM)** runs. The same bytecode runs on Windows, Linux or macOS, as long as a JVM is installed.

```text
javac Main.java        # compile: Main.java -> Main.class (bytecode)
java Main              # run: the JVM executes the bytecode
```

Everything in Java lives inside a class, and the program starts at `public static void main(String[] args)`. A file that contains a `public class Main` must be named `Main.java`.

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, library!");
    }
}
```

### Classes and objects in Java

The ideas of Lessons 2 and 3 carry over almost word for word: attributes, a constructor with the class's name, methods, `private` and `public`, `this`. Three differences matter at once. Objects are always created with `new` and are always used through **references**. Access modifiers are written on each member, not in blocks. And there is no destructor: memory is freed by the **garbage collector**.

```java
class Book {
    private final int id;            // final: cannot change after construction
    private final String title;
    private int copies;

    public Book(int id, String title, int copies) {
        this.id = id;
        this.title = title;
        this.copies = Math.max(copies, 0);      // keep the invariant
    }

    public int getCopies() { return copies; }

    @Override
    public String toString() { return "#" + id + " " + title + " (copies: " + copies + ")"; }
}
```

Java names getters `getCopies()` by convention. The method `toString()` plays the role of `operator<<`: `System.out.println(book)` calls it automatically.

### References and garbage collection

In C++ a variable `Book b;` *is* the object. In Java a variable `Book b` holds a **reference** to an object that lives on the heap, and `Book c = b;` makes a second reference to the *same* object, not a copy. There are no pointers to manipulate and no `delete`. When no reference to an object remains, the **garbage collector** reclaims its memory some time later. This removes whole families of bugs (dangling pointers, double deletes, leaks of ordinary objects), at the cost of less control over exactly when memory is freed. Because there is no destructor, cleanup of files and connections uses `try`-with-resources and `close()`.

### Inheritance, interfaces and polymorphism in Java

A class **extends** one class and **implements** any number of interfaces. `super(...)` calls the base constructor. Every method is **virtual by default**: calling a method through a base reference runs the real object's version, with no `virtual` keyword. Add `@Override` so the compiler checks the signature, just like C++'s `override`.

```java
abstract class Item {
    protected final String title;
    Item(String title) { this.title = title; }
    abstract int lateFee(int days);                 // like a pure virtual function
}

class Dvd extends Item {
    Dvd(String title) { super(title); }
    @Override int lateFee(int days) { return 10 * days; }
}
```

An **interface** lists methods a class promises to provide, like the `Borrowable` interface in Lesson 6. Java allows only *single* inheritance of classes, but a class may implement many interfaces.

### Exceptions and collections in Java

Java exceptions use `try`, `catch` and `throw`, like C++. Java also has **checked exceptions**: a method that can throw one must declare it with `throws`, and callers must catch it or declare it too. Unchecked exceptions (those derived from `RuntimeException`, such as `IllegalArgumentException`) need no declaration. The collections you used from the STL have close relatives: `ArrayList<T>` is Java's `vector`, `HashMap<K, V>` is `unordered_map`, and `HashSet<T>` is `unordered_set`. Java **generics** (`ArrayList<Book>`) resemble C++ templates in use, but work differently inside.

### Comparing C++ and Java

| Point | C++ | Java |
|---|---|---|
| Compiled to | machine code for one platform | bytecode for the JVM (runs anywhere) |
| Memory | manual, with RAII and smart pointers | garbage collector |
| Objects | stored by value; copies are real | always used through references |
| Pointers | yes | none (references only) |
| Destructors | yes, run at a known moment | none; `close()` and try-with-resources |
| Virtual methods | only with `virtual` | every method, by default |
| Multiple inheritance | yes, of classes | no: one class, many interfaces |
| Operator overloading | yes | no (except `+` on strings) |
| Generic code | templates (generated per type) | generics (checked, one shared version) |
| Headers | `.h` and `.cpp` files | none: one class per file |

### Beyond two languages

The same ideas appear in other languages with their own flavour: Python (everything is an object, no `private` keyword, dynamic typing), C# (very close to Java), JavaScript (classes on top of prototypes) and Kotlin (a concise language for the JVM). When you meet a new object-oriented language, ask the same questions: How do I define a class? How are objects created and destroyed? How do inheritance and interfaces work? How are errors reported? This lesson's table is your template.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Java** | A class-based, object-oriented language that runs on the Java Virtual Machine. |
| **Bytecode** | Platform-neutral instructions produced by `javac` and run by the JVM. |
| **JVM** | The Java Virtual Machine: the program that executes bytecode. |
| **Reference** | A variable that holds the location of an object rather than the object itself. |
| **Garbage collector** | The part of the JVM that frees objects that are no longer used. |
| **Interface** | A list of methods that implementing classes must provide. |
| **`extends` / `implements`** | The keywords for inheriting from a class and for providing an interface. |
| **Checked exception** | An exception that a method must declare or catch. |
| **Generics** | Java's way of writing a class or method that works for many types. |
| **`toString()`** | The method that gives an object's text form, used by `println`. |

## Worked Examples

### Example 1: A class in Java

```java
public class Main {
    public static void main(String[] args) {
        Book a = new Book(101, "Python Basics", 2);
        Book b = a;
        b.borrow();
        System.out.println(a);
        System.out.println(b == a);
    }
}

class Book {
    private final int id;
    private final String title;
    private int copies;

    public Book(int id, String title, int copies) {
        this.id = id;
        this.title = title;
        this.copies = Math.max(copies, 0);
    }

    public void borrow() {
        if (copies > 0) {
            copies--;
        }
    }

    @Override
    public String toString() {
        return "#" + id + " " + title + " (copies: " + copies + ")";
    }
}
```

```output
#101 Python Basics (copies: 1)
true
```

1. `new Book(...)` creates the object on the heap, and `a` holds a reference to it.
2. `Book b = a;` does **not** copy the book: `b` is a second reference to the same object. In C++ this line would have made an independent copy.
3. So `b.borrow()` changes the book that `a` also refers to, and printing `a` shows one copy left.
4. `b == a` compares the references and is `true`: they point to the same object. Printing `a` calls `toString()` automatically.

### Example 2: Inheritance, `@Override` and polymorphism

```java
import java.util.ArrayList;
import java.util.List;

abstract class Item {
    protected final String title;

    Item(String title) {
        this.title = title;
    }

    abstract int lateFee(int days);

    @Override
    public String toString() {
        return title;
    }
}

class Book extends Item {
    Book(String title) {
        super(title);
    }

    @Override
    int lateFee(int days) {
        return 5 * days;
    }
}

class Dvd extends Item {
    Dvd(String title) {
        super(title);
    }

    @Override
    int lateFee(int days) {
        return 10 * days;
    }
}

public class Main {
    public static void main(String[] args) {
        List<Item> items = new ArrayList<>();
        items.add(new Book("Python Basics"));
        items.add(new Dvd("How Computers Work"));
        for (Item item : items) {
            System.out.println(item + ": " + item.lateFee(3));
        }
    }
}
```

```output
Python Basics: 15
How Computers Work: 30
```

1. `Item` is abstract, with the abstract method `lateFee` (C++'s pure virtual function). `Book` and `Dvd` extend it and use `super(title)` to build the base part.
2. The `List<Item>` holds references to `Book` and `Dvd` objects. There is no slicing and no need for `unique_ptr`: every object is already used through a reference.
3. `item.lateFee(3)` runs the real object's version without any `virtual` keyword, because every Java method is virtual by default.
4. `item + ": "` calls `toString()` on the item, which returns its title.

### Example 3: Exceptions, `ArrayList` and `HashMap`

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class NoCopiesException extends Exception {
    public NoCopiesException(String title) {
        super("no copies left of " + title);
    }
}

public class Main {
    static void borrow(String title, Map<String, Integer> stock) throws NoCopiesException {
        int left = stock.getOrDefault(title, 0);
        if (left == 0) {
            throw new NoCopiesException(title);
        }
        stock.put(title, left - 1);
    }

    public static void main(String[] args) {
        Map<String, Integer> stock = new HashMap<>();
        stock.put("Python Basics", 1);
        stock.put("Digital Logic", 0);

        List<String> requests = new ArrayList<>();
        requests.add("Python Basics");
        requests.add("Python Basics");
        requests.add("Digital Logic");

        for (String title : requests) {
            try {
                borrow(title, stock);
                System.out.println("borrowed " + title);
            } catch (NoCopiesException e) {
                System.out.println("failed: " + e.getMessage());
            } finally {
                System.out.println("request for " + title + " processed");
            }
        }
    }
}
```

```output
borrowed Python Basics
request for Python Basics processed
failed: no copies left of Python Basics
request for Python Basics processed
failed: no copies left of Digital Logic
request for Digital Logic processed
```

1. `NoCopiesException extends Exception`, so it is a *checked* exception: `borrow` must declare `throws NoCopiesException`, and `main` must catch it.
2. `HashMap` stores the stock like `unordered_map`; `getOrDefault` avoids the "missing key" problem that `map[...]` has in C++.
3. The `finally` block runs whether or not an exception happened. It is Java's tool for cleanup, because Java has no destructors.
4. The second request for the same title fails because the one copy was already borrowed.

## Common Mistakes and Misconceptions

- **Thinking `Book b = a;` copies the object.** In Java it copies the *reference*. Both variables refer to the same object. To make a real copy you must write one (for example a copy constructor).
- **Comparing strings with `==`.** In Java `==` on objects compares references. Use `a.equals(b)` to compare the text.
- **Forgetting `new`.** Declaring `Book b;` creates no object, only an empty reference. Using it gives a `NullPointerException`.
- **Looking for destructors and `delete`.** They do not exist. Rely on the garbage collector for memory and on `try`-with-resources for files.
- **Expecting a class named `Book` in `Main.java` to be `public`.** A file can contain only one public class, and its name must match the file name.
- **Assuming Java is "better" or "worse" than C++.** Each makes different trade-offs: speed and control (C++) against safety and portability (Java). Choose by the problem.
- **Forgetting `@Override`.** Without it, a typo in the method name creates a new method silently, just as `override` protects you in C++.
- **Translating C++ line by line.** Idiomatic Java uses getters named `getX()`, `ArrayList` and interfaces instead of copying C++ idioms.

## Guided Hands-On Activity

**Port a class, then compare.** Work with your teacher.

1. Type Example 1 into `Main.java`, compile it with `javac Main.java` and run it with `java Main`. Change `Book b = a;` so that `b` is a *new* `Book` with the same data, and see how the output changes.
2. Add a method `getTitle()` and a `giveBack()` method to `Book`, and call them from `main`.
3. Type Example 2. Add a `Magazine` class that extends `Item` with a late fee of 2 per day, add one to the list, and note that the loop does not change.
4. Remove the word `abstract` from `Item.lateFee` and from the class, and read the error. Which C++ message does it resemble?
5. Type Example 3. Remove `throws NoCopiesException` from `borrow` and read the compiler message about checked exceptions. Put it back.
6. Compare strings: write `String x = new String("lib"); String y = new String("lib");` and print `x == y` and `x.equals(y)`. Explain the two results.

## Lesson Project: Book and Member in Java

### Objective

Port the `Book` and `Member` classes of the library to Java, keeping every rule you enforced in C++, and then record a **C++ versus Java comparison table** of at least eight rows based on what you observed while porting.

### Requirements

- A `Book` class with private `id`, `title` and `copies`, a constructor that rejects a non-positive id and an empty title with `IllegalArgumentException`, and replaces negative copies by 0.
- `Book` has getters, `borrow()` (which throws a checked `NoCopiesException` when no copy is left), `giveBack()` and `toString()`.
- A `Member` class with a private id, name and a list of the books currently borrowed, a limit of 3 books, `borrow(Book)` (which throws `IllegalStateException` at the limit), `giveBack(Book)` and `toString()`.
- `main` creates books and a member, borrows until each of the three failure cases happens (no copies, the limit, an invalid book), and prints what the member holds.
- Write a comparison table with at least eight rows, each stating a C++ feature, the Java equivalent and one sentence saying *why* they differ.

### Instructions

1. Write `NoCopiesException` and the `Book` class with the validating constructor, and test it with a good and a bad book.
2. Add `borrow()`, `giveBack()`, the getters and `toString()`.
3. Write `Member` with an `ArrayList<Book>` and the limit.
4. Write `main` to exercise every success and failure path, catching each exception type with a clear message.
5. Print the member (its `toString()` should list the titles) and the books' remaining copies.
6. Run the program and check your output against the expected output.
7. Write the comparison table, starting from the one in this lesson, and add at least two rows of your own from what you noticed (for example "constructor validation" and "string comparison").

### Expected Output

```text
Borrowed Python Basics
Borrowed Digital Logic
Borrowed Bangla Poems
Refused: Anika has reached the limit of 3 books
Member 1: Anika holds 3 book(s) [Python Basics, Digital Logic, Bangla Poems]
Cannot borrow: no copies left of "Digital Logic"
Borrowed Digital Logic
Member 2: Rafi holds 1 book(s) [Digital Logic]
Rejected: id must be positive
#101 Python Basics (copies: 1)
#102 Digital Logic (copies: 0)
```

### Hints

1. **Hint 1 (rejecting bad data).** In the constructor: `if (id <= 0) { throw new IllegalArgumentException("id must be positive"); }`.
2. **Hint 2 (a checked exception).** `public void borrow() throws NoCopiesException { ... }`, and the caller must use `try`/`catch` or declare `throws`.
3. **Hint 3 (the list).** `private final List<Book> borrowed = new ArrayList<>();` needs `import java.util.ArrayList;` and `import java.util.List;`.
4. **Hint 4 (the order of the work).** In `Member.borrow`, check the limit first, then call `book.borrow()`, and add to the list only after it succeeds.
5. **Hint 5 (listing the titles).** Build the text with a `StringBuilder` or a `for` loop over `borrowed`.
6. **Hint 6 (a missing class error).** One file may hold several classes, but only one can be `public` and its name must match the file: `Main`.

### Success Criteria

- [ ] `Book` and `Member` keep their data private and enforce the same rules as in C++.
- [ ] A `NoCopiesException` (checked) is thrown and caught, and the other two failures are handled with the right exception types.
- [ ] A member can never hold more than three books, and a failed borrow changes nothing.
- [ ] The comparison table has at least eight rows, each with a reason, including two rows that come from my own observations.
- [ ] The program compiles with `javac` without warnings and its output matches the expected output.

### Extension Challenge

Add the `Item`, `Book` and `Dvd` hierarchy from Example 2 to your Java library, with an interface `Borrowable`, and an `ArrayList<Item>` for the catalogue. Then write the same `lateFee` report in both languages and compare the number of lines and the number of concepts (smart pointers, `virtual`, `override`, destructors) that each version needed.

## Lesson Recap

- Java compiles to **bytecode** that the **JVM** runs on any platform; memory is managed by a **garbage collector**.
- The object-oriented ideas are the same as in C++ (classes, constructors, encapsulation, inheritance, polymorphism), but objects are always used through **references** and every method is virtual by default.
- Java has **interfaces**, single inheritance of classes, **checked exceptions** and collections such as `ArrayList` and `HashMap`.
- A comparison table (compilation, memory, objects, pointers, destructors, virtual, inheritance, operators, generics, headers) explains *why* the languages differ.
- Learning a second language means recognising the ideas and looking up the syntax.

## Homework / Extension Mission

Finish the Java port and the comparison table. Then choose a third language from this list: Python, C# or Kotlin. Write the `Book` class in it (constructor, private-by-convention data, a validating setter and `__str__` or `toString`), and add a third column to your table. Answer in a paragraph: which feature of C++ do you miss most in Java, and which Java feature would you most like to have in C++? Bring your table to the next lesson, where you will use it to draw the UML diagram of the finished library.

## Course Project Connection

This lesson proves that your design, not the language, is the valuable part of the **Library Management System**: the same classes, rules and exceptions work in C++ and in Java. The comparison table you build is part of your project portfolio. In Lesson 8 you will draw the UML class diagram of the whole library and assemble the finished C++ application, using what you learned about interfaces, exceptions and collections.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: bytecode and the JVM, with a diagram. 10 minutes: Example 1 (references, the most important difference). 10 minutes: inheritance and exceptions (Examples 2 and 3). 30 minutes: the project, as a guided build, with the table built together at the end.

**Live demonstrations.** Run Example 1 in C++ (with `Book b = a;`) and in Java side by side and ask which line differs. Show `==` versus `equals` on strings. Show a `NullPointerException` from an object that was never created with `new`.

**Misconceptions.** "Java has no pointers, so nothing can be shared" (references are shared by default). "Garbage collection means no memory problems" (leaks are still possible, for example through forgotten references in a list). "Java is slow."

**Assessment of the project.** Check the validating constructor, the checked exception, the limit logic (nothing changes on failure), and the quality of the table: each row should explain a *reason*, for example "no destructors because the garbage collector frees memory".

**Reference solution `Main.java`** (compile with `javac Main.java`, run with `java Main`):

```java
import java.util.ArrayList;
import java.util.List;

class NoCopiesException extends Exception {
    public NoCopiesException(String title) {
        super("no copies left of \"" + title + "\"");
    }
}

class Book {
    private final int id;
    private final String title;
    private int copies;

    public Book(int id, String title, int copies) {
        if (id <= 0) {
            throw new IllegalArgumentException("id must be positive");
        }
        if (title == null || title.isEmpty()) {
            throw new IllegalArgumentException("title must not be empty");
        }
        this.id = id;
        this.title = title;
        this.copies = Math.max(copies, 0);
    }

    public int getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public int getCopies() {
        return copies;
    }

    public void borrow() throws NoCopiesException {
        if (copies == 0) {
            throw new NoCopiesException(title);
        }
        copies--;
    }

    public void giveBack() {
        copies++;
    }

    @Override
    public String toString() {
        return "#" + id + " " + title + " (copies: " + copies + ")";
    }
}

class Member {
    public static final int LIMIT = 3;

    private final int id;
    private final String name;
    private final List<Book> borrowed = new ArrayList<>();

    public Member(int id, String name) {
        this.id = id;
        this.name = name;
    }

    public void borrow(Book book) throws NoCopiesException {
        if (borrowed.size() >= LIMIT) {
            throw new IllegalStateException(name + " has reached the limit of " + LIMIT + " books");
        }
        book.borrow();
        borrowed.add(book);
    }

    public void giveBack(Book book) {
        if (borrowed.remove(book)) {
            book.giveBack();
        }
    }

    @Override
    public String toString() {
        StringBuilder titles = new StringBuilder();
        for (Book b : borrowed) {
            if (titles.length() > 0) {
                titles.append(", ");
            }
            titles.append(b.getTitle());
        }
        return "Member " + id + ": " + name + " holds " + borrowed.size() + " book(s)"
                + (borrowed.isEmpty() ? "" : " [" + titles + "]");
    }
}

public class Main {
    static void tryBorrow(Member m, Book b) {
        try {
            m.borrow(b);
            System.out.println("Borrowed " + b.getTitle());
        } catch (NoCopiesException e) {
            System.out.println("Cannot borrow: " + e.getMessage());
        } catch (IllegalStateException e) {
            System.out.println("Refused: " + e.getMessage());
        }
    }

    public static void main(String[] args) {
        Book python = new Book(101, "Python Basics", 2);
        Book logic = new Book(102, "Digital Logic", 1);
        Book poems = new Book(103, "Bangla Poems", 3);
        Book atlas = new Book(104, "World Atlas", 1);
        Member anika = new Member(1, "Anika");

        tryBorrow(anika, python);
        tryBorrow(anika, logic);
        tryBorrow(anika, poems);
        tryBorrow(anika, atlas);
        System.out.println(anika);

        Member rafi = new Member(2, "Rafi");
        tryBorrow(rafi, logic);

        anika.giveBack(logic);
        tryBorrow(rafi, logic);
        System.out.println(rafi);

        try {
            new Book(0, "Invalid", 1);
        } catch (IllegalArgumentException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
        System.out.println(python);
        System.out.println(logic);
    }
}
```

```output
Borrowed Python Basics
Borrowed Digital Logic
Borrowed Bangla Poems
Refused: Anika has reached the limit of 3 books
Member 1: Anika holds 3 book(s) [Python Basics, Digital Logic, Bangla Poems]
Cannot borrow: no copies left of "Digital Logic"
Borrowed Digital Logic
Member 2: Rafi holds 1 book(s) [Digital Logic]
Rejected: id must be positive
#101 Python Basics (copies: 1)
#102 Digital Logic (copies: 0)
```

**Differentiation.** Support: provide `NoCopiesException` and `Book` and let students write `Member` and `main`. Stretch: add the `Item` hierarchy, an interface, `HashMap<Integer, Book>` for the catalogue and a table row for generics.

**Discussion questions (not for the student quiz).** Why did Java's designers leave out pointer arithmetic and operator overloading? What does "write once, run anywhere" cost?
