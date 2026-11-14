// FILE PATH: server/src/pre-university-cse/banks/course-2.ts
//
// Course Assessment 2 — Object-Oriented Programming & Programming Languages (C++ and Java).

import { codeOut, crit, mcq, practical, shortAnswer, structuredBank } from '../../structured-assessments/structured.helpers';

export const COURSE_2_BANK = structuredBank({
  id: 'structured/object-oriented-programming-and-programming-languages',
  title: 'Course Assessment: Object-Oriented Programming & Programming Languages',
  kind: 'COURSE_TEST',
  mcq: [
    mcq(
      1,
      'What is the main difference between procedural and object-oriented programming?',
      'Object-oriented programs bundle data and the functions that work on it into objects, while procedural programs keep data and functions separate',
      [
        'Procedural programs cannot use functions, while object-oriented programs are built only from functions',
        'Object-oriented programs run faster, because objects are compiled to machine code and functions are not',
        'Procedural programs cannot store data, so every value must be passed in by the user',
      ],
      'In procedural code the data and the functions are separate and the functions are applied to the data. In object-oriented code they are combined into objects that protect and manage their own data.',
    ),
    codeOut(
      2,
      'cpp',
      `#include <iostream>

class Counter {
    int n = 0;
public:
    void add(int k) { if (k > 0) n += k; }
    int value() const { return n; }
};

int main() {
    Counter c;
    c.add(5);
    c.add(-3);
    c.add(2);
    std::cout << c.value() << "\\n";
}`,
      '7',
      ['4', '5', '10'],
      'add() ignores the non-positive argument, so only 5 and 2 are added. The data member n is private: the rule in add() cannot be bypassed from outside the class.',
    ),
    codeOut(
      3,
      'cpp',
      `#include <iostream>

struct T {
    const char* name;
    T(const char* n) : name(n) { std::cout << "+" << name; }
    ~T() { std::cout << "-" << name; }
};

void run() {
    T a("A");
    { T b("B"); }
    T c("C");
}

int main() {
    run();
    std::cout << "\\n";
}`,
      '+A+B-B+C-C-A',
      ['+A+B+C-A-B-C', '+A+B-B+C-A-C', '+A-A+B-B+C-C'],
      'Objects are constructed in the order of their declaration and destroyed when their scope ends: b ends at the closing brace, and at the end of run() the remaining objects are destroyed in reverse order, c then a.',
    ),
    mcq(
      4,
      'In a design, a Car has an Engine and the engine cannot exist without the car. Which relationship is this?',
      'Composition: the Car owns an Engine object as a part, which lives and dies with it',
      [
        'Inheritance: Car should be written as a derived class of Engine',
        'Overloading: Car and Engine are two functions with the same name and different parameters',
        'Polymorphism: Car and Engine must both override one virtual function',
      ],
      'Use inheritance for an "is a" relationship and composition for "has a". A car is not a kind of engine; it has one, so the Engine is a member of Car.',
    ),
    codeOut(
      5,
      'cpp',
      `#include <iostream>

struct Shape {
    virtual double area() const { return 0; }
    virtual ~Shape() = default;
};

struct Square : Shape {
    double s;
    Square(double s) : s(s) {}
    double area() const override { return s * s; }
};

int main() {
    Shape* p = new Square(3);
    std::cout << p->area() << "\\n";
    delete p;
}`,
      '9',
      ['0', '3', '6'],
      'area() is virtual, so the call through a Shape pointer is bound at run time to the function of the object that is really there, a Square. Without virtual the base version would run and print 0.',
    ),
    codeOut(
      6,
      'cpp',
      `#include <algorithm>
#include <iostream>
#include <vector>

template <typename T>
T biggest(const std::vector<T>& v) {
    return *std::max_element(v.begin(), v.end());
}

int main() {
    std::vector<int> a{3, 9, 4};
    std::vector<double> b{2.5, 1.5};
    std::cout << biggest(a) << " " << biggest(b) << "\\n";
}`,
      '9 2.5',
      ['3 2.5', '9 1.5', '4 1.5'],
      'The same template is instantiated twice, once for int and once for double. std::max_element returns an iterator to the largest item, which is dereferenced.',
    ),
    codeOut(
      7,
      'java',
      `class Animal {
    String sound() { return "..."; }
}

class Dog extends Animal {
    String sound() { return "Woof"; }
}

public class Main {
    public static void main(String[] args) {
        Animal a = new Dog();
        System.out.println(a.sound());
    }
}`,
      'Woof',
      ['...', 'Animal', 'Dog'],
      'Java chooses the method from the actual object, a Dog, not from the declared type Animal. Every non-private Java method is virtual by default.',
    ),
    mcq(
      8,
      'In a UML class diagram, what does a line that ends in a hollow triangle at the first class mean?',
      'Inheritance: the other class is derived from the class at the triangle',
      [
        'Composition: the class at the triangle is a part owned by the other class',
        'A dependency: one class only uses the other as a parameter',
        'A multiplicity of zero or one on that end of the association',
      ],
      'A solid line with a hollow (unfilled) triangle is the generalisation arrow, pointing from the derived class to its base class. A filled diamond marks composition.',
    ),
    mcq(
      3,
      'Why do many classes keep their data members private and set them through a constructor and methods?',
      'So that every object starts in a valid state and no code outside the class can break its rules',
      [
        'Because private data is stored in faster memory than public data',
        'Because a class with public data cannot have any methods',
        'Because the compiler refuses to create objects whose data members are public',
      ],
      'Encapsulation lets the class guarantee its invariants: the constructor establishes a valid state and the methods keep it valid, while outside code can only use the public interface.',
    ),
    codeOut(
      6,
      'cpp',
      `#include <iostream>
#include <stdexcept>

int main() {
    try {
        throw std::runtime_error("bad");
        std::cout << "after";
    } catch (const std::exception& e) {
        std::cout << e.what() << "\\n";
    }
}`,
      'bad',
      ['after', 'bad after', 'std::runtime_error'],
      'throw leaves the try block at once, so the statement after it never runs; the catch block receives the exception and prints its message.',
    ),
  ],
  shortAnswers: [
    shortAnswer(
      2,
      'A class BankAccount must never hold a negative balance. Explain how you would design the class (data, constructor, methods) so that this can never happen, and write the key code of the constructor and of withdraw().',
      'Make the balance a private data member so that only the class can change it. The constructor receives the opening balance and refuses a negative value, for example by throwing std::invalid_argument or by setting 0. The public method withdraw(amount) checks that the amount is positive and not larger than the balance before it subtracts, and otherwise reports an error (an exception or a false result). deposit() checks for a positive amount. Because no other code can touch the balance, the rule cannot be bypassed.',
      [
        crit('Encapsulation', 2, 'The balance is private and changed only through public methods; the class owns the rule.'),
        crit('Validation in code', 2, 'The constructor and withdraw() check their inputs (negative start, amount above the balance) and show the key code.'),
        crit('Error reporting', 1, 'Says what happens when the rule would be broken: an exception or a clear failure result.'),
      ],
    ),
    shortAnswer(
      5,
      'Explain how a virtual function lets a Shape* pointer call the right area() for a Circle or a Square. What would happen without the word virtual, and why is a virtual destructor needed in the base class? Use a short example.',
      'A virtual function is called through the object\'s virtual table, so the version that runs is chosen at run time from the real type of the object: a Shape* that points to a Circle calls Circle::area(), one that points to a Square calls Square::area(). Without virtual the call is bound at compile time to the type of the pointer, so Shape::area() would run for both. A virtual destructor makes delete on a base pointer call the destructor of the derived class too, so that the derived part of the object is cleaned up and nothing leaks.',
      [
        crit('Run-time dispatch', 2, 'Explains that the function is chosen from the actual object (virtual table / dynamic binding).'),
        crit('Without virtual', 2, 'Says the base version would run (static binding) and shows or describes the effect in the example.'),
        crit('Virtual destructor', 1, 'Explains that deleting through a base pointer must run the derived destructor.'),
      ],
    ),
    shortAnswer(
      8,
      'Design a small library system. Give a text class diagram for Book, Member and Loan with the attributes of each, one method for each class, the relationships between them with multiplicities, and explain one design decision (for example why Loan is a class of its own).',
      'Book (id, title, available: bool; checkOut(), giveBack()); Member (id, name, loans; canBorrow()); Loan (book, member, dueDate; isOverdue()). A Member has 0..* Loans, and each Loan refers to exactly one Member; a Book is in at most one open Loan at a time (0..1), and a Book may appear in many Loans over time. Loan is a class of its own because a loan has facts that belong to neither the book nor the member, such as the due date, and because the many-to-many relationship between members and books over time is easier to model with an association class.',
      [
        crit('Classes, attributes and methods', 2, 'Three classes with sensible attributes and at least one method each.'),
        crit('Relationships and multiplicities', 2, 'Shows how Member, Book and Loan are linked and writes the multiplicities on the lines.'),
        crit('Design decision', 1, 'Gives and justifies one decision, for example the Loan class or encapsulating availability in Book.'),
      ],
    ),
  ],
  practical: practical({
    title: 'Library loans with classes',
    language: 'cpp',
    instructions:
      'Complete this small library program. A Book is available or on loan; a Member may hold at most two books at a time.\n\n' +
      '1. Complete the class `Book` with a private id, a private title, a private bool `onLoan`, a constructor, `getTitle()`, `isAvailable()`, `checkOut()` and `giveBack()`.\n' +
      '2. Complete the class `Member` with a name and a count of loans, and `canBorrow()` which is true while the member holds fewer than two books.\n' +
      '3. Write a function `bool lend(Book& book, Member& member)` that lends the book only when the book is available and the member can borrow, and updates both objects; it returns whether the loan was made.\n' +
      '4. In main, create three books and one member, try to lend all three books, and print for each attempt "Lent: title" or "Refused: title".\n\n' +
      'Expected output: `Lent: Algorithms`, `Lent: Networks`, `Refused: Databases`.\n\n' +
      'Keep the data members private, give every class a constructor, and do not repeat the rules outside the classes.',
    starterCode:
      '#include <iostream>\n#include <string>\n\n' +
      'class Book {\n    // data: id, title, onLoan\npublic:\n    // constructor, getTitle(), isAvailable(), checkOut(), giveBack()\n};\n\n' +
      'class Member {\n    // data: name, loans\npublic:\n    // constructor, canBorrow(), addLoan()\n};\n\n' +
      '// bool lend(Book& book, Member& member)\n\n' +
      'int main() {\n    // three books, one member, three attempts\n}\n',
    deliverables: ['Your complete C++ program', 'The output of one run'],
    rubric: [
      crit('Classes and encapsulation', 5, 'Book and Member have private data and public methods; nothing outside the classes changes their data directly.'),
      crit('Constructors and methods', 4, 'Every class has a working constructor, and the methods do what is described (checkOut, giveBack, canBorrow).'),
      crit('The lending rule', 5, 'lend() refuses an unavailable book and a member who already holds two books, and updates both objects when it succeeds.'),
      crit('Correct output', 3, 'The three lines of the expected output appear in the right order.'),
      crit('Design and quality', 3, 'Clear names, const-correct getters, no duplicated rules, short comments.'),
    ],
  }),
});
