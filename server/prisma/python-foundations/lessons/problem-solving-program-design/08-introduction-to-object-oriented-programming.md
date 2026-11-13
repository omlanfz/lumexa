# Lumexa Mission Log: Problem Solving & Program Design

**Course/Path:** Problem Solving & Program Design
**Lesson:** 08 of 08
**Title:** Introduction to Object-Oriented Programming
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

Before an engineer builds a spacecraft, there is a **blueprint**: a design that describes what every spacecraft of that type has (a name, a fuel tank, a crew) and what it can do (launch, burn fuel, dock). One blueprint can produce many spacecraft, and each one has its own fuel level and its own crew. Python has the same idea. It is called **object-oriented programming**, and it is how most large programs are organised. Today you will learn to write your own blueprints, called classes, to create objects from them and to keep a program's data and behaviour together in one place. It is the last lesson of the course, so you will also build the capstone project: a **Library Management System**.

## Learning Objectives

1. Compare procedural programming with object-oriented programming.
2. Explain what classes and objects are, and create both.
3. Define attributes and methods, and write the `__init__()` constructor.
4. Explain what `self` means.
5. Use the basics of encapsulation to protect an object's data.
6. Organise related data and functionality into classes that work together.

## Prerequisites

- Lesson 2: you can write functions with parameters and return values.
- Lesson 3: you can store records in dictionaries and lists.
- Lesson 7: you can save and load data with JSON.

## Concept Explanation

### Procedural and object-oriented programming

So far you have written **procedural** programs: data stored in variables and dictionaries, and separate functions that work on it. That works well for small programs. But in a large program it becomes hard to see which functions belong to which data.

**Object-oriented programming (OOP)** bundles the data and the functions that work on it into one unit, called an **object**. Instead of `burn_fuel(ship, 20)` you write `ship.burn_fuel(20)`: the ship knows how to burn its own fuel.

### Classes and objects

A **class** is a blueprint: it describes what things of one kind have and do. An **object** (also called an **instance**) is one real thing built from the blueprint. The class `Spacecraft` is the design; `aurora` and `voyager` are two separate spacecraft, each with their own data.

```python
class Spacecraft:
    pass                      # an empty blueprint

aurora = Spacecraft()         # create an object
voyager = Spacecraft()        # create another one
```

By convention, class names use **CapitalWords** (`Spacecraft`, `LibraryBook`) and variable and method names use `snake_case`.

### Attributes and methods

- An **attribute** is a variable that belongs to an object. It stores the object's data: `ship.name`, `ship.fuel`.
- A **method** is a function that belongs to an object. It defines what the object can do: `ship.refuel(10)`.

You read and change attributes with a dot, and you call methods with a dot and brackets.

### The `__init__()` constructor

`__init__()` is a special method that Python runs **automatically** every time a new object is created. It is called the **constructor**, and its job is to set up the object's starting attributes:

```python
class Spacecraft:
    def __init__(self, name, fuel=100):
        self.name = name
        self.fuel = fuel
        self.crew = []

aurora = Spacecraft("Aurora")             # fuel defaults to 100
voyager = Spacecraft("Voyager", 60)
print(aurora.name, aurora.fuel)           # Aurora 100
```

### Understanding `self`

Inside a class, `self` is the object that a method is working on. When you write `aurora.refuel(10)`, Python passes `aurora` into the method as `self` automatically. So `self.fuel` means *this* spacecraft's fuel, and `voyager.fuel` is a completely separate value. The first parameter of every method is `self`, and you never type it when you call the method.

### Methods that change an object

```python
class Spacecraft:
    def __init__(self, name, fuel=100):
        self.name = name
        self.fuel = fuel

    def burn_fuel(self, amount):
        self.fuel -= amount

    def __str__(self):
        return f"{self.name} with {self.fuel}% fuel"
```

The special method `__str__()` tells Python how to turn an object into text, so `print(aurora)` shows something readable instead of a memory address.

### Encapsulation fundamentals

**Encapsulation** means keeping an object's data safe by controlling how it is changed. If anyone can write `ship.fuel = -500`, nothing stops nonsense. Instead:

- Mark data that should not be touched directly with a leading underscore, `_fuel`. It is a promise among programmers: *"please use the methods, not the attribute."*
- Put the rules inside methods that **validate** before they change anything.

```python
def burn_fuel(self, amount):
    if amount > self._fuel:
        print("Not enough fuel!")
        return False
    self._fuel -= amount
    return True
```

Now the spacecraft protects its own data, and every part of the program uses the same safe door.

### Organising related data and functionality into classes

Good designs give each class **one clear responsibility** and let classes work together. A library program, for example, needs a `Book`, a `Member` and a `Library` that holds the books and the members. Objects can contain other objects: a `Library` has a list of `Book` objects. When you design with classes, ask: *what are the "things" in my program, what do they know, and what can they do?*

## Key Vocabulary

| Term | Definition |
|---|---|
| **Object-oriented programming** | Organising a program as objects that combine data and behaviour. |
| **Class** | A blueprint that describes the attributes and methods of a kind of object. |
| **Object (instance)** | One real item created from a class. |
| **Attribute** | A variable that belongs to an object. |
| **Method** | A function that belongs to an object. |
| **`__init__()`** | The constructor: runs when an object is created and sets up its attributes. |
| **`self`** | The object that a method is currently working on. |
| **Encapsulation** | Keeping data safe by letting it change only through methods. |
| **`__str__()`** | A special method that says how an object is shown as text. |
| **Responsibility** | The single job that a class is designed to do. |

## Code Example: Spacecraft Blueprints

```python
# spacecraft.py
# A class with attributes, methods, a constructor and basic encapsulation

class Spacecraft:
    """A spacecraft with a name, a fuel tank and a crew list."""

    def __init__(self, name, fuel=100):
        self.name = name
        self._fuel = fuel          # the underscore means: use the methods
        self.crew = []

    def add_crew(self, member):
        self.crew.append(member)

    def get_fuel(self):
        return self._fuel

    def burn_fuel(self, amount):
        """Use fuel, but never more than is left."""
        if amount > self._fuel:
            print(f"{self.name}: not enough fuel for that burn!")
            return False
        self._fuel -= amount
        return True

    def refuel(self, amount):
        if amount <= 0:
            print("The refuel amount must be positive.")
            return
        self._fuel = min(100, self._fuel + amount)

    def __str__(self):
        return f"{self.name}: {self._fuel}% fuel, crew of {len(self.crew)}"


aurora = Spacecraft("Aurora")
voyager = Spacecraft("Voyager", 60)
aurora.add_crew("Nova")
aurora.add_crew("Orion")
voyager.add_crew("Lyra")

print(aurora)
print(voyager)
aurora.burn_fuel(35)
voyager.burn_fuel(80)          # more than the tank holds
voyager.refuel(70)             # cannot go over 100
print(aurora)
print(voyager)
print("Aurora fuel is", aurora.get_fuel(), "and Voyager fuel is", voyager.get_fuel())
```

Expected output:

```text
Aurora: 100% fuel, crew of 2
Voyager: 60% fuel, crew of 1
Voyager: not enough fuel for that burn!
Aurora: 65% fuel, crew of 2
Voyager: 100% fuel, crew of 1
Aurora fuel is 65 and Voyager fuel is 100
```

The two spacecraft come from the same class but have separate data: burning fuel on `aurora` did not touch `voyager`. And the rules about fuel live in one place, inside the class.

## Instructor-Guided Coding Walkthrough

1. Show a procedural version of the spacecraft with a dictionary and two functions. Ask students what happens if they need ten spacecraft with different rules.
2. Create an empty class and two objects. Give each object a different attribute by hand and print them, then move the setup into `__init__()`.
3. Add a method and call it on two objects. Ask students to explain, using `self`, why only one object changed.
4. Print an object with and without `__str__()` and compare.
5. Set `aurora.fuel = -500` directly, and show why a validated method is safer. Introduce the underscore convention.
6. Sketch the three classes of the library system on the board (Book, Member, Library) and ask students what each one knows and does.

Discussion questions:

- What is the difference between a class and an object?
- Why does Python need `self` in a method?
- Which everyday things around you could be classes, and what would be their attributes and methods?

## Student Mission / Guided Challenge

**Capstone Project: Library Management System**

Build `library.py`, an object-oriented application that manages books, borrowers and borrowing records. This is your third portfolio project of Course 2, and a guided Google Colab version is linked in the Project section below this lesson.

1. Write a `Book` class with the attributes `title`, `author`, `isbn` and `available` (a Boolean that starts as `True`) and a `__str__()` method.
2. Write a `Member` class with a `name`, a `member_id` and a list of the `isbn` numbers the member has borrowed. Add a rule that a member may borrow at most three books at a time.
3. Write a `Library` class that holds a dictionary of books (by `isbn`) and a dictionary of members (by `member_id`), and a list of **borrowing records** (member, book, date borrowed, date returned).
4. Give `Library` the methods `add_book()`, `register_member()`, `borrow_book(member_id, isbn)`, `return_book(member_id, isbn)` and `search(text)` that finds books by part of the title or author.
5. Validate everything: a book that is already out cannot be borrowed, an unknown member or book must give a clear message, and a member over the limit is refused. Use `try` and `except` or return values consistently.
6. Add `save()` and `load()` methods that store the library in a JSON file, so that the books, members and records survive between runs.
7. Build a menu loop in a `main()` function to use every feature, and test with at least ten situations, including the edge cases above.
8. Keep each class to a single responsibility and add a docstring to every class and method.

**Bonus objective:** Add due dates and a `report_overdue()` method that lists the books that should have been returned.

## Common Mistakes

- Forgetting `self` as the first parameter of a method.
- Forgetting `self.` before an attribute inside a method, which creates a plain local variable instead.
- Writing `Spacecraft` when you mean `Spacecraft()`: the first is the class, the second creates an object.
- Giving every object the same mutable default, such as `crew=[]` as a parameter. Create the list inside `__init__()` instead.
- Writing a class with no clear job that does everything.
- Changing attributes directly from outside the class and skipping the validation in the methods.

## Lesson Recap

You learned a new way to organise programs. A class is a blueprint; objects are the things built from it. Attributes store an object's data, methods define what it can do, `__init__()` sets it up and `self` refers to the object itself. You protected data with encapsulation and saw how several classes can work together. Together with the files, errors, algorithms and functions of this course, you can now design and build complete applications.

## Homework / Extension Mission

**Solo Mission: Library Upgrade**

Extend your Library Management System so that it behaves like a real library. Your program must:

1. Add a `Library.search_by_author()` method that handles capital letters and partial names, and a method that lists every book a member currently has on loan.
2. Add a **late fee** rule: when a book is returned after the due date, calculate a fee per overdue day and store it in the borrowing record. Show the fee when the book is returned.
3. Create a `Magazine` class that works like `Book` but has an `issue_number`. Use it in the library with as little new code as you can, and add a comment explaining your decision.
4. Write a `report()` method that prints the number of books, how many are out and the name of the most active member.
5. Write at least eight `assert` tests for the `Library` class that create their own small library and check borrow, return, limit and search behaviour.
6. Add a one-paragraph design note describing each class, what it is responsible for and one thing you would change if you had more time.

## Portfolio Connection

The **Library Management System** is the capstone of Course 2: it combines the planning of Lesson 1, the functions and modules of Lesson 2, the nested data of Lesson 3, the algorithms of Lesson 4, the testing of Lesson 5, the error handling of Lesson 6 and the files of Lesson 7, all inside classes. Together with the **Text-Based Adventure Game** and the **Personal Expense Tracker**, it makes a portfolio that shows you can build real programs. In Course 3 you will meet the tools that professional Python developers use, and learn to explore data with Jupyter, NumPy and Pandas.
