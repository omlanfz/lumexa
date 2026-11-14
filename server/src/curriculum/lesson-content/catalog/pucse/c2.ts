// FILE PATH: server/src/curriculum/lesson-content/catalog/pucse/c2.ts
//
// Pre-University CSE · Course 2 · Object-Oriented Programming & Programming Languages — visuals and the Mini Quiz of every lesson.
// Keys are lineage keys: "<course-slug>/<lesson position>". Every "what does this print?" question carries
// the real program (checked by running it in the Pre-University CSE spec when the toolchain is installed).

import { registerVisualCatalog } from '../../visual-catalog';
import { registerQuizCatalog } from '../../quiz-catalog';
import { algoSteps, arrays, cards, checklist, CPP, flow, grid, JAVA, lab, mcq, memory, sequence, stackQueue, table, trace, uml } from './helpers';

const M = 'object-oriented-programming-and-programming-languages';

registerVisualCatalog({
  [`${M}/1`]: [
    flow(
      'cpp-build-pipeline',
      'From C to C++',
      'A five-step pipeline: main.cpp is the source file, the preprocessor expands the include lines, the compiler checks the C++ and translates it, the linker joins the standard library, and the result is an executable file you run.',
      'g++ runs all four stages for you. The standard library is linked in at the end.',
      ['Source|main.cpp|accent', 'Preprocessor|expands #include lines', 'Compiler|checks C++, makes object code|accent2', 'Linker|joins the standard library', 'Executable|./main|good'],
      { perRow: 5, at: 'end' },
    ),
    arrays(
      'vector-push-back',
      'Strings and vectors',
      'Two rows showing a vector of titles. Before push_back it holds three titles; after titles.push_back of World Atlas it holds four, and the new element at index 3 is highlighted.',
      'push_back adds one element at the end and the vector grows by itself: size() goes from 3 to 4.',
      [
        { label: 'before', cells: ['Python Basics', 'Digital Logic', 'Bangla Poems'] },
        { label: 'after push_back("World Atlas")', cells: ['Python Basics', 'Digital Logic', 'Bangla Poems', 'World Atlas'], highlight: [{ from: 3, to: 3, tone: 'good' }] },
      ],
      { at: 'end' },
    ),
    lab(
      'reference-lab',
      'Example 2',
      'cpp',
      'A C++ editor with the Example 2 program about passing by value, by reference and by const reference, and its expected output.',
      'Change fee_by_value so that it takes int& and predict the first line before you run it.',
      `#include <iostream>
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
    cout << "after fee_by_value: " << fee << '\\n';
    fee_by_reference(fee);
    cout << "after fee_by_reference: " << fee << '\\n';

    vector<string> titles = {"Python Basics", "Digital Logic"};
    cout << "letters in all titles: " << total_letters(titles) << '\\n';
    return 0;
}`,
      { expected: 'after fee_by_value: 10\nafter fee_by_reference: 15\nletters in all titles: 26', filename: 'references.cpp', at: 'end' },
    ),
    grid(
      'everyone-touches-the-data',
      'Procedural programming, and where it hurts',
      'A block diagram of the procedural catalogue. main calls add_book, borrow_book, return_book and print_catalogue, and every one of them reaches straight into the same vector of books. A dashed arrow shows main also changing a book directly, with no function in between.',
      'In procedural code every function, and main itself, reaches straight into the shared data. Nothing guards it.',
      [
        ['main', 'rect', 'main()', 1.5, 0, 'good'],
        ['add', 'rect', 'add_book', 0, 1, 'accent'],
        ['borrow', 'rect', 'borrow_book', 1, 1, 'accent'],
        ['return', 'rect', 'return_book', 2, 1, 'accent'],
        ['print', 'rect', 'print_catalogue', 3, 1, 'accent'],
        ['data', 'cylinder', 'vector<Book>', 1.5, 2, 'warn', 'open to every function'],
      ],
      [
        ['main', 'add'],
        ['main', 'borrow'],
        ['main', 'return'],
        ['main', 'print'],
        ['add', 'data'],
        ['borrow', 'data'],
        ['return', 'data'],
        ['print', 'data'],
        ['main', 'data', 'catalogue[0].copies = -5', { dashed: true, via: [[860, 46], [860, 146], [860, 246]] }],
      ],
      { dx: 190, dy: 100, w: 170, at: 'end' },
    ),
    cards(
      'four-pillars-preview',
      'Object-oriented programming: the big idea',
      'Four cards previewing the four pillars of object-oriented programming. Encapsulation hides data behind methods and arrives in Lesson 2. Inheritance reuses a class in another and arrives in Lesson 4. Polymorphism lets one call behave differently for different objects and arrives in Lesson 5. Abstraction exposes only what matters and arrives in Lesson 6.',
      'Four ideas, one per lesson. You already felt the problem each one solves.',
      [
        { title: 'Encapsulation', badge: 'Lesson 2', tone: 'accent', bullets: ['Data hidden inside the object', 'Changed only through its methods', 'Fixes: "copies = -5"'] },
        { title: 'Inheritance', badge: 'Lesson 4', tone: 'accent2', bullets: ['A new class builds on an old one', 'Book, Magazine and DVD share code', 'Fixes: copy and paste'] },
        { title: 'Polymorphism', badge: 'Lesson 5', tone: 'info', bullets: ['One call, different behaviour', 'print() works for any item', 'Fixes: long if-else chains'] },
        { title: 'Abstraction', badge: 'Lesson 6', tone: 'good', bullets: ['Show what an object does, hide how', 'Interfaces and templates', 'Fixes: code tied to details'] },
      ],
      { at: 'end' },
    ),
  ],
  [`${M}/2`]: [
    memory(
      'objects-own-state',
      'Classes and objects',
      'A memory diagram of two Book objects named a and b in main. Each has its own title_ and copies_: a holds Python Basics with 1 copy and b holds Digital Logic with 1 copy. They share the class but not the data.',
      'One class, two objects: each object has its own copy of the attributes. Changing a never changes b.',
      [
        {
          label: 'Object a (a Book)',
          cells: [
            { name: 'a.title_', addr: '0x7ffc2000', value: '"Python Basics"', type: 'string' },
            { name: 'a.copies_', addr: '0x7ffc2020', value: '1', type: 'int', tone: 'good' },
          ],
        },
        {
          label: 'Object b (a Book)',
          cells: [
            { name: 'b.title_', addr: '0x7ffc2030', value: '"Digital Logic"', type: 'string' },
            { name: 'b.copies_', addr: '0x7ffc2050', value: '1', type: 'int', tone: 'good' },
          ],
        },
      ],
      { at: 'end' },
    ),
    uml(
      'book-class-diagram',
      'Encapsulation: private data and a public interface',
      'A UML class diagram. The Book class has private attributes id_, title_, author_, year_ and copies_, marked with a minus sign, and public methods marked with a plus sign: set_copies, copies, borrow, give_back and display. A second box, main, may call the public methods, but writing to copies_ directly is a compile error.',
      'Minus means private, plus means public. Outside code reaches the data only through the plus methods.',
      [
        {
          id: 'book',
          name: 'Book',
          col: 1.4,
          row: 0,
          tone: 'accent',
          fields: ['- id_: int', '- title_: string', '- author_: string', '- year_: int', '- copies_: int'],
          methods: ['+ set_copies(n): bool', '+ copies(): int', '+ borrow(): bool', '+ give_back(): void', '+ display(): void'],
        },
        { id: 'main', name: 'main()', col: 0, row: 0.35, tone: 'good', fields: [], methods: ['a.set_copies(3)  OK', 'a.copies_ = -5  compile error'] },
      ],
      [['main', 'book', 'public interface only']],
      { dx: 300, dy: 190, at: 'end' },
    ),
    trace(
      'setter-trace',
      'Invariants: rules an object always keeps',
      'A step-through of two setter calls. set_copies(3) passes the check and returns true, so copies_ becomes 3. set_copies(-5) fails the check n < 0 and returns false before changing anything, so copies_ stays 3.',
      'A rejected call changes nothing: the object is never left in an invalid state.',
      ['bool ok1 = b.set_copies(3);', 'bool ok2 = b.set_copies(-5);', 'cout << ok1 << " " << ok2 << " " << b.copies();'],
      [
        { line: 1, vars: { 'n (parameter)': 3, copies_: 3, ok1: 'true' }, note: '3 is not negative, so the check passes: copies_ becomes 3 and the method returns true.' },
        { line: 2, vars: { 'n (parameter)': -5, copies_: 3, ok1: 'true', ok2: 'false' }, note: '-5 fails the check n < 0, so the method returns false BEFORE it assigns anything. copies_ is still 3.' },
        { line: 3, vars: { copies_: 3, ok1: 'true', ok2: 'false' }, output: '1 0 3', note: 'Without boolalpha the booleans print as 1 and 0; the copies are still 3.' },
      ],
      { at: 'end' },
    ),
    table(
      'who-can-use-what',
      'Encapsulation: private data and a public interface',
      'A table of three members of Book and who may use them. The private attribute copies_ can be used only by the class itself, while the public methods copies and set_copies can be used by any code.',
      'The compiler checks the access rules every time you build the program.',
      ['Member', 'Declared', 'Used inside Book', 'Used by main()'],
      [
        ['copies_', 'private', 'yes', 'no: compile error'],
        ['copies()', 'public', 'yes', 'yes (read it)'],
        ['set_copies(n)', 'public', 'yes', 'yes (checked change)'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 3, tone: 'bad', note: 'Blocked by the compiler' }, { row: 2, col: 3, tone: 'good', note: 'Goes through the check' }] },
    ),
    lab(
      'setter-lab',
      'Example 2',
      'cpp',
      'A C++ editor with the Example 2 program in which the setters of a Book reject invalid values, with its expected output.',
      'Add the rule "at most 100 copies" to set_copies and test it with 100 and 101.',
      `#include <iostream>
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
    cout << "set_copies(3): " << b.set_copies(3) << '\\n';
    cout << "set_copies(-5): " << b.set_copies(-5) << '\\n';
    cout << "copies are still " << b.copies() << '\\n';
    cout << "set_year(1200): " << b.set_year(1200) << '\\n';
    cout << "set_title(\\"\\"): " << b.set_title("") << '\\n';
    return 0;
}`,
      { expected: 'set_copies(3): true\nset_copies(-5): false\ncopies are still 3\nset_year(1200): false\nset_title(""): false', filename: 'setters.cpp', at: 'end' },
    ),
  ],
  [`${M}/3`]: [
    flow(
      'object-lifecycle',
      'The lifecycle of an object',
      'A five-step flow showing the life of a local object. Execution reaches the declaration, the constructor runs and the object is in a valid state, the object is in use while its methods run, the scope ends when the closing brace is reached, and the destructor runs to clean up.',
      'Every object follows the same path. The constructor and the destructor run automatically at the two ends.',
      ['Declaration|Member a(101, "Anika");', 'Constructor runs|valid state, counter + 1|accent', 'In use|methods are called|good', 'Scope ends|the closing brace }', 'Destructor runs|clean up, counter - 1|warn'],
      { perRow: 5, at: 'end' },
    ),
    stackQueue(
      'destruction-order',
      'The lifecycle of an object',
      'A stack of live objects while Example 2 runs. A, B and C are created and pushed; when the inner block ends, C and then B are destroyed; D is created; when main ends, D and then A are destroyed. The last object created is always the first destroyed.',
      'Live objects behave like a stack: the last one created is the first one destroyed.',
      'stack',
      [
        { items: ['A'], op: 'construct A', note: 'A is created first, so it sits at the bottom.' },
        { items: ['A', 'B'], op: 'construct B', note: 'B is created inside the inner block.' },
        { items: ['A', 'B', 'C'], op: 'construct C', note: 'C is created after B, so it is on top.' },
        { items: ['A', 'B'], op: 'destroy C', note: 'The inner block ends: the top object, C, is destroyed first.' },
        { items: ['A'], op: 'destroy B', note: 'Then B. A, from the outer block, is untouched.' },
        { items: ['A', 'D'], op: 'construct D', note: 'D is created next.' },
        { items: ['A'], op: 'destroy D', note: 'main ends: D, created last, is destroyed first.' },
        { items: [], op: 'destroy A', note: 'A, created first, is destroyed last.' },
      ],
      { at: 'end' },
    ),
    table(
      'special-member-functions',
      'Copying objects',
      'A table of four special member functions of Member: the default constructor, the parameterized constructor, the copy constructor and the destructor, with when each one runs and an example.',
      'Four special functions that C++ runs for you at the right moment.',
      ['Function', 'Looks like', 'Runs when', 'Example'],
      [
        ['Default constructor', 'Member()', 'an object is created with no arguments', 'Member a;'],
        ['Parameterized constructor', 'Member(int id, const string& name)', 'an object is created with arguments', 'Member a(101, "Anika");'],
        ['Copy constructor', 'Member(const Member& other)', 'an object is copied', 'Member c = a;  or  show(a) by value'],
        ['Destructor', '~Member()', 'the object’s life ends', 'the closing brace of its block'],
      ],
      { at: 'end' },
    ),
    lab(
      'copy-trace-lab',
      'Example 3',
      'cpp',
      'A C++ editor with the Example 3 program that traces when a Tag object is made, copied and destroyed, with its expected output.',
      'Change by_reference to take Tag by value and watch the extra "copied" and "gone" lines appear.',
      `#include <iostream>
using namespace std;

class Tag {
public:
    Tag() { cout << "  made\\n"; }
    Tag(const Tag&) { cout << "  copied\\n"; }
    ~Tag() { cout << "  gone\\n"; }
};

void by_value(Tag t) { cout << "  inside by_value\\n"; }
void by_reference(const Tag& t) { cout << "  inside by_reference\\n"; }

int main()
{
    Tag t;
    cout << "call by_value:\\n";
    by_value(t);
    cout << "call by_reference:\\n";
    by_reference(t);
    cout << "end of main\\n";
    return 0;
}`,
      { expected: '  made\ncall by_value:\n  copied\n  inside by_value\n  gone\ncall by_reference:\n  inside by_reference\nend of main\n  gone', filename: 'copies.cpp', at: 'end' },
    ),
  ],
  [`${M}/4`]: [
    uml(
      'library-hierarchy',
      'Inheritance: an',
      'A UML class diagram of the library item hierarchy. LibraryItem is the base class with id_, title_ and copies_ and the methods borrow, give_back and describe. Book, Magazine and DVD each point to LibraryItem with a hollow-triangle inheritance arrow, and each adds one attribute: author_, issue_ and minutes_.',
      'The hollow arrow means "is a". The shared data and rules live once, in LibraryItem; each derived class adds only what is special.',
      [
        { id: 'item', name: 'LibraryItem', col: 1, row: 0, tone: 'accent', fields: ['- id_: int', '- title_: string', '- copies_: int'], methods: ['+ borrow(): bool', '+ give_back(): void', '+ describe() const'] },
        { id: 'book', name: 'Book', col: 0, row: 1.25, tone: 'accent2', fields: ['- author_: string'], methods: ['+ describe() const'] },
        { id: 'mag', name: 'Magazine', col: 1, row: 1.25, tone: 'accent2', fields: ['- issue_: int'], methods: ['+ describe() const'] },
        { id: 'dvd', name: 'DVD', col: 2, row: 1.25, tone: 'accent2', fields: ['- minutes_: int'], methods: ['+ describe() const'] },
      ],
      [
        ['book', 'item', 'is a', { head: 'open' }],
        ['mag', 'item', 'is a', { head: 'open' }],
        ['dvd', 'item', 'is a', { head: 'open' }],
      ],
      { dx: 250, dy: 190, at: 'end' },
    ),
    stackQueue(
      'constructor-chain',
      'Building the base part: constructor chains',
      'A stack showing the life of a Book object. First the LibraryItem part is built, then the Book part is added on top. At the end of its life the Book part is destroyed first, then the LibraryItem part.',
      'Build from the bottom up, tear down from the top down: the base part is built first and destroyed last.',
      'stack',
      [
        { items: ['LibraryItem part'], op: 'LibraryItem(title) runs', note: 'The base constructor, named in the initializer list, builds the base part first.' },
        { items: ['LibraryItem part', 'Book part'], op: 'Book constructor body runs', note: 'Then the derived part is built on top of it.' },
        { items: ['LibraryItem part'], op: '~Book() runs', note: 'At the end of main the derived part is destroyed first.' },
        { items: [], op: '~LibraryItem() runs', note: 'Then the base part, which the derived part relied on until the very end.' },
      ],
      { at: 'end' },
    ),
    uml(
      'loan-composition',
      'Composition: a',
      'A UML class diagram of the Loan class. Loan has a Member as an attribute, shown with a filled diamond at the Loan end meaning composition, and it also refers to a LibraryItem, shown with a plain arrow. It stores a due_day_ number.',
      'The filled diamond means "has a" (composition): the Member is stored inside the Loan. The plain arrow means "refers to".',
      [
        { id: 'loan', name: 'Loan', col: 1, row: 0, tone: 'warn', fields: ['- member_: Member', '- item_: LibraryItem&', '- due_day_: int'], methods: ['+ display() const'] },
        { id: 'member', name: 'Member', col: 0, row: 1.3, tone: 'accent', fields: ['- id_: int', '- name_: string'], methods: ['+ name() const'] },
        { id: 'item', name: 'LibraryItem', col: 2, row: 1.3, tone: 'accent', fields: ['- id_: int', '- title_: string'], methods: ['+ title() const'] },
      ],
      [
        ['loan', 'member', 'has a', { head: 'filled-diamond' }],
        ['loan', 'item', 'refers to'],
      ],
      { dx: 260, dy: 170, at: 'end' },
    ),
    lab(
      'base-reference-lab',
      'Example 3',
      'cpp',
      'A C++ editor with the Example 3 program in which a function takes a base-class reference to a Book and calls who(), with its expected output.',
      'Predict the output. Then add the word virtual before void who() const in Item and run it again: Lesson 5 explains what changes.',
      `#include <iostream>
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
    cout << '\\n';
    return 0;
}`,
      { expected: 'item book', filename: 'base_reference.cpp', at: 'end' },
    ),
  ],
  [`${M}/5`]: [
    flow(
      'dynamic-dispatch',
      'Overriding and virtual functions',
      'A four-step flow of a virtual call. The program calls item->late_fee(3) through a base pointer, follows the hidden pointer from the object to its vtable, finds the late_fee entry of the real class, and runs DVD::late_fee, which returns 30.',
      'The base pointer says what the call looks like; the real object decides what runs.',
      ['Call|item->late_fee(3)|accent', 'Follow the hidden pointer|object to its vtable', 'Find the entry|late_fee of the real class', 'Run it|DVD::late_fee returns 30|good'],
      { perRow: 4, at: 'end' },
    ),
    table(
      'overloading-vs-overriding',
      'Overriding and virtual functions',
      'A table comparing overloading with overriding. Overloading uses the same name with different parameters in one scope and is chosen at compile time. Overriding uses the same name and the same parameters in a derived class and is chosen at run time when the base method is virtual.',
      'Two words that sound alike and mean different things. Overloading is chosen by the compiler; overriding by the object.',
      ['', 'Overloading', 'Overriding'],
      [
        ['Same name?', 'yes', 'yes'],
        ['Parameter list', 'must differ', 'must be identical (same signature)'],
        ['Where', 'same class or scope', 'base class and derived class'],
        ['Chosen', 'at compile time', 'at run time (when the base method is virtual)'],
        ['Keywords', 'none', 'virtual in the base, override in the derived class'],
      ],
      { at: 'end', highlights: [{ row: 3, col: 1, tone: 'info', note: 'Compiler decides' }, { row: 3, col: 2, tone: 'good', note: 'The object decides' }] },
    ),
    sequence(
      'polymorphic-call',
      'Polymorphic collections',
      'A sequence diagram. main calls print_fees(3) on the Catalogue. The Catalogue calls late_fee(3) on a Book and receives 15, then calls late_fee(3) on a DVD and receives 30. The call is the same each time; the answer depends on the object.',
      'The Catalogue sends the same message to every item. Each item answers in its own way.',
      [['main', 'main()'], ['cat', 'Catalogue'], ['book', 'Book'], ['dvd', 'DVD']],
      [
        { from: 'main', to: 'cat', label: 'print_fees(3)' },
        { from: 'cat', to: 'book', label: 'late_fee(3)' },
        { from: 'book', to: 'cat', label: '15', dashed: true },
        { from: 'cat', to: 'dvd', label: 'late_fee(3)' },
        { from: 'dvd', to: 'cat', label: '30', dashed: true },
      ],
      { at: 'end' },
    ),
    lab(
      'virtual-lab',
      'Example 2',
      'cpp',
      'A C++ editor with the Example 2 program in which a virtual who() method is overridden by Book and DVD, with its expected output.',
      'Remove the word virtual from Item::who and run it again: the output returns to the Lesson 4 behaviour.',
      `#include <iostream>
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
    cout << i.who() << '\\n';
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
    cout << '\\n';
    return 0;
}`,
      { expected: 'book\ndvd\nbook dvd item', filename: 'virtual.cpp', at: 'end' },
    ),
  ],
  [`${M}/6`]: [
    uml(
      'borrowable-interface',
      'Abstraction: the idea',
      'A UML class diagram. Borrowable is an interface with three pure virtual methods: borrow, give_back and available. Book, Magazine and Laptop each implement the interface, shown with dashed arrows with hollow heads. Code written against Borrowable works with any of them.',
      'The interface lists what every implementation must do. Code that depends only on Borrowable does not care which class is behind it.',
      [
        { id: 'borrowable', name: 'Borrowable', col: 1, row: 0, tone: 'warn', fields: ['«interface»'], methods: ['+ borrow() = 0', '+ give_back() = 0', '+ available() const = 0'] },
        { id: 'book', name: 'Book', col: 0, row: 1.25, tone: 'accent', fields: [], methods: ['+ borrow() override', '+ give_back() override', '+ available() override'] },
        { id: 'mag', name: 'Magazine', col: 1, row: 1.25, tone: 'accent', fields: [], methods: ['+ borrow() override', '+ give_back() override', '+ available() override'] },
        { id: 'laptop', name: 'Laptop', col: 2, row: 1.25, tone: 'accent', fields: [], methods: ['+ borrow() override', '+ give_back() override', '+ available() override'] },
      ],
      [
        ['book', 'borrowable', 'implements', { head: 'open', dashed: true }],
        ['mag', 'borrowable', 'implements', { head: 'open', dashed: true }],
        ['laptop', 'borrowable', 'implements', { head: 'open', dashed: true }],
      ],
      { dx: 250, dy: 190, at: 'end' },
    ),
    flow(
      'exception-path',
      'Exceptions: errors that cannot be ignored',
      'A five-step flow of an exception. The try block runs code that may fail, a throw statement creates an error object, the stack unwinds and runs destructors as functions are left, the first matching catch handler runs, and the program continues after the catch block.',
      'A thrown error leaves each function in turn, tidying up as it goes, until a handler takes it.',
      ['try block|code that may fail|accent', 'throw|an error object is created|bad', 'Stack unwinds|destructors run on the way out|warn', 'catch|the first matching handler runs|accent2', 'Program continues|after the catch block|good'],
      { perRow: 5, at: 'end' },
    ),
    algoSteps(
      'sort-with-lambda',
      'The STL: containers',
      'Two frames of an array of four numbers. Before the sort they are 5, 2, 9 and 1. After sort with the lambda a greater than b they are 9, 5, 2 and 1, from high to low, all marked as sorted.',
      'The lambda says when a comes before b. sort does the rest.',
      [
        { array: [5, 2, 9, 1], note: 'Before: copies per title, in the order they were added.' },
        { array: [9, 5, 2, 1], marks: { 0: 'sorted', 1: 'sorted', 2: 'sorted', 3: 'sorted' }, note: 'After sort(begin, end, [](int a, int b) { return a > b; }): high to low.' },
      ],
      { at: 'end' },
    ),
    lab(
      'exceptions-lab',
      'Example 3',
      'cpp',
      'A C++ editor with the Example 3 program that throws a NoCopiesError, catches it and shows a Guard object cleaning up while the stack unwinds, with its expected output.',
      'Swap the order of the two catch clauses and run it again. Which handler runs now, and why?',
      `#include <iostream>
#include <stdexcept>
#include <string>
using namespace std;

class NoCopiesError : public runtime_error {
public:
    explicit NoCopiesError(const string& title) : runtime_error("no copies left of " + title) {}
};

class Guard {
public:
    Guard() { cout << "  guard on\\n"; }
    ~Guard() { cout << "  guard off\\n"; }
};

void borrow(const string& title, int copies)
{
    Guard g;
    if (copies == 0) {
        throw NoCopiesError(title);
    }
    cout << "  borrowed " << title << '\\n';
}

int main()
{
    try {
        cout << "first call\\n";
        borrow("Python Basics", 2);
        cout << "second call\\n";
        borrow("Digital Logic", 0);
        cout << "this line is skipped\\n";
    } catch (const NoCopiesError& e) {
        cout << "caught: " << e.what() << '\\n';
    } catch (const exception& e) {
        cout << "other error: " << e.what() << '\\n';
    }
    cout << "program continues\\n";
    return 0;
}`,
      { expected: 'first call\n  guard on\n  borrowed Python Basics\n  guard off\nsecond call\n  guard on\n  guard off\ncaught: no copies left of Digital Logic\nprogram continues', filename: 'exceptions.cpp', at: 'end' },
    ),
  ],
  [`${M}/7`]: [
    flow(
      'java-pipeline',
      'Java at a glance',
      'A four-step pipeline. The source file Main.java is compiled by javac into bytecode in Main.class, which is the same on every operating system; the Java Virtual Machine then runs the bytecode and collects garbage.',
      'Java is compiled to bytecode once, and the JVM on each computer runs it. That is "write once, run anywhere".',
      ['Source|Main.java|accent', 'javac|checks the code, makes bytecode|accent2', 'Bytecode|Main.class, the same on every OS', 'JVM|java Main runs it and collects garbage|good'],
      { perRow: 4, at: 'end' },
    ),
    memory(
      'value-vs-reference',
      'References and garbage collection',
      'A comparison of C++ and Java memory. In C++ the variables b and c each hold their own Book object, so c is a real copy. In Java the variables a and b are two references holding the same address, and both point to one Book object on the heap.',
      'C++ variables hold objects; Java variables hold references. In Java, Book b = a; makes two names for one object, not a copy. (The addresses are examples.)',
      [
        {
          label: 'C++ stack: Book c = b;',
          cells: [
            { name: 'b', addr: '0x7ffc1000', value: 'Book #101, 2 copies', type: 'Book' },
            { name: 'c', addr: '0x7ffc1040', value: 'Book #101, 2 copies (a copy)', type: 'Book', tone: 'good' },
          ],
        },
        {
          label: 'Java stack: Book b = a;',
          cells: [
            { name: 'a', addr: '0x7ffc2000', value: '0x5a10', type: 'reference', pointsTo: '0x5a10' },
            { name: 'b', addr: '0x7ffc2008', value: '0x5a10', type: 'reference', pointsTo: '0x5a10' },
          ],
        },
        {
          label: 'Java heap',
          cells: [{ name: 'the Book', addr: '0x5a10', value: '#101, 2 copies', type: 'Book object', tone: 'warn' }],
        },
      ],
      { at: 'end' },
    ),
    cards(
      'oop-in-four-languages',
      'Beyond two languages',
      'Four cards comparing object-oriented languages. C++ compiles to machine code with manual memory and RAII. Java compiles to bytecode with a garbage collector and interfaces. Python is interpreted, dynamically typed and treats everything as an object. C# runs on .NET and is very close to Java.',
      'The ideas carry over. Ask the same questions of every new language: classes, memory, inheritance, errors.',
      [
        { title: 'C++', badge: 'machine code', tone: 'accent', bullets: ['Manual memory and RAII', 'Multiple inheritance', 'Templates, operator overloading'] },
        { title: 'Java', badge: 'bytecode', tone: 'accent2', bullets: ['Garbage collector', 'Interfaces, single inheritance', 'Checked exceptions'] },
        { title: 'Python', badge: 'interpreted', tone: 'good', bullets: ['Dynamic typing', 'Everything is an object', 'Privacy by convention (_x)'] },
        { title: 'C#', badge: '.NET', tone: 'info', bullets: ['Very close to Java', 'Properties and LINQ', 'Garbage collected'] },
      ],
      { at: 'end' },
    ),
    lab(
      'java-book-lab',
      'Example 1',
      'java',
      'A Java editor with the Example 1 program in which two references refer to the same Book object, with its expected output.',
      'Predict the output. Then change Book b = a; so that b is a new Book with the same data, and run it again.',
      `public class Main {
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
}`,
      { expected: '#101 Python Basics (copies: 1)\ntrue', filename: 'Main.java', at: 'end' },
    ),
  ],
  [`${M}/8`]: [
    uml(
      'lms-class-diagram',
      'Relationships between classes',
      'A UML class diagram of the Library Management System. Library owns zero or more items, loans and members, shown with filled diamonds. LibraryItem is abstract and is the base of Book, Magazine and DVD, shown with hollow triangles. Each Loan refers to exactly one Member and one LibraryItem.',
      'The finished design on one page: filled diamonds mean the Library owns its parts, hollow triangles mean "is a", plain arrows mean "refers to".',
      [
        { id: 'library', name: 'Library', col: 1.7, row: 0, tone: 'warn', fields: ['- items_: map<int, LibraryItem>', '- members_: map<int, Member>', '- loans_: vector<Loan>'], methods: ['+ borrow(member, item, day)', '+ give_back(member, item, day)', '+ list_items() const', '+ report() const'] },
        { id: 'item', name: 'LibraryItem', col: 0, row: 1.7, tone: 'accent', fields: ['«abstract»', '- id_: int', '- title_: string', '- copies_: int'], methods: ['+ take(): void', '+ put_back(): void', '+ kind(): string', '+ late_fee(days): int'] },
        { id: 'loan', name: 'Loan', col: 1.7, row: 1.7, tone: 'accent2', fields: ['- member_id: int', '- item_id: int', '- due_day: int'], methods: [] },
        { id: 'member', name: 'Member', col: 3.4, row: 1.7, tone: 'accent', fields: ['- id_: int', '- name_: string'], methods: ['+ name() const'] },
        { id: 'book', name: 'Book', col: -0.7, row: 3.5, tone: 'good', fields: [], methods: ['+ kind()', '+ late_fee(days)'] },
        { id: 'mag', name: 'Magazine', col: 0.55, row: 3.5, tone: 'good', fields: [], methods: ['+ kind()', '+ late_fee(days)'] },
        { id: 'dvd', name: 'DVD', col: 1.8, row: 3.5, tone: 'good', fields: [], methods: ['+ kind()', '+ late_fee(days)'] },
      ],
      [
        ['library', 'item', 'owns', { head: 'filled-diamond', toLabel: '0..*' }],
        ['library', 'loan', 'owns', { head: 'filled-diamond', toLabel: '0..*' }],
        ['library', 'member', 'owns', { head: 'filled-diamond', toLabel: '0..*' }],
        ['loan', 'member', 'refers to', { toLabel: '1' }],
        ['loan', 'item', 'refers to', { toLabel: '1' }],
        ['book', 'item', '', { head: 'open' }],
        ['mag', 'item', '', { head: 'open' }],
        ['dvd', 'item', '', { head: 'open' }],
      ],
      { dx: 250, dy: 150, at: 'end' },
    ),
    cards(
      'three-layers',
      'Building the application in layers',
      'Three cards for the three layers of the application. The model holds the domain classes and their rules. The manager, the Library class, holds the collections and coordinates the model. The interface, main, reads commands and prints results.',
      'Keep the layers apart and you can test the logic without a keyboard, and change the interface without touching the rules.',
      [
        { title: 'Model', badge: 'rules', tone: 'accent', bullets: ['LibraryItem, Book, Member, Loan', 'Each class protects its own data', 'No input or output'] },
        { title: 'Manager', badge: 'coordination', tone: 'warn', bullets: ['The Library class', 'Owns the collections', 'borrow, give_back, report; throws exceptions'] },
        { title: 'Interface', badge: 'main()', tone: 'good', bullets: ['The menu, the keyboard, the screen', 'Calls the Library', 'Catches exceptions and prints them'] },
      ],
      { at: 'end' },
    ),
    sequence(
      'borrow-sequence',
      'Building the application in layers',
      'A sequence diagram of one borrow. main calls borrow(1, 301, day 1) on the Library. The Library calls take() on the DVD, which returns, or throws NoCopiesError. The Library then adds a loan with due day 15 and main prints the message.',
      'One command travels down through the layers and back. Each object does only its own part of the work.',
      [['ui', 'main()'], ['lib', 'Library'], ['item', 'DVD'], ['loans', 'Loan list']],
      [
        { from: 'ui', to: 'lib', label: 'borrow(1, 301, day 1)' },
        { from: 'lib', to: 'item', label: 'take()' },
        { from: 'item', to: 'lib', label: 'ok, or throws NoCopiesError', dashed: true },
        { from: 'lib', to: 'loans', label: 'add loan (due day 15)' },
        { from: 'lib', to: 'ui', label: 'message printed', dashed: true },
      ],
      { at: 'end' },
    ),
    checklist(
      'design-review',
      'Testing and reviewing an object-oriented design',
      'A design review checklist with eight questions: every attribute private, each constructor leaving a valid object, shared code written once, polymorphism instead of type tests, failures reported with exceptions, one job per class, tests for the failure cases, and clear names.',
      'Run through these eight questions before you call a design finished.',
      ['Is every attribute private?', 'Does each constructor leave a valid object?', 'Is shared code written once, in a base class?', 'Does polymorphism replace type tests?', 'Are failures reported with exceptions?', 'Does each class have one job?', 'Do the tests cover the failure cases?', 'Are the names clear?'],
      { at: 'end' },
    ),
    lab(
      'unit-test-lab',
      'Example 3',
      'cpp',
      'A C++ editor with the Example 3 program that checks a Book with assert statements, including an invalid-data case, with its expected output.',
      'Change one assert so that it is wrong and read the message. Then add a test for borrowing a book with two copies twice.',
      `#include <cassert>
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

    cout << "all tests passed\\n";
    return 0;
}`,
      { expected: 'all tests passed', filename: 'tests.cpp', at: 'end' },
    ),
  ],
  // @@visuals-end
});

registerQuizCatalog({
  [`${M}/1`]: [
    mcq('q1', 'Which statement about C++ and C is correct?', ['C++ keeps most of C’s syntax and adds classes, references and a standard library', 'C++ cannot compile any code that was originally written in the C language', 'C++ programs are interpreted line by line and are never compiled', 'C++ has no free functions: everything must be written inside a class'], 'C++ began as "C with Classes". Most C still compiles, and C++ adds new tools on top. It is compiled (with g++), and ordinary functions are still allowed.'),
    mcq('q2', 'What does this program print?', ['15', '10', '5', 'It does not compile'], 'The parameter x is a reference: another name for a. So x += 5 changes a itself, and 10 + 5 = 15 is printed.', CPP('#include <iostream>\nusing namespace std;\n\nvoid bump(int& x)\n{\n    x += 5;\n}\n\nint main()\n{\n    int a = 10;\n    bump(a);\n    cout << a << \'\\n\';\n    return 0;\n}')),
    mcq('q3', 'Which parameter declaration is best for a function that only reads a very large vector of strings?', ['const vector<string>& v', 'vector<string> v', 'vector<string>& v', 'const vector<string> v'], 'A const reference avoids copying the whole vector and promises not to change it. A plain vector parameter copies every string, and a const value is still a copy.'),
    mcq('q4', 'What does this program print?', ['3 15', '2 15', '3 8', '2 8'], 'The vector starts with {4, 8}; push_back adds 15 at the end, so the size is 3 and the element at index 2 is 15.', CPP('#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main()\n{\n    vector<int> v = {4, 8};\n    v.push_back(15);\n    cout << v.size() << " " << v[2] << "\\n";\n    return 0;\n}')),
    mcq('q5', 'In a procedural catalogue, any function can set a book’s copies to a negative number. Which weakness of procedural design is this?', ['No protection: nothing stops code from putting the data into an invalid state', 'Slow execution: procedural programs are always slower than object-oriented ones', 'Missing functions: a procedural program is not allowed to contain functions', 'Memory leaks: a struct can never be released from memory'], 'The rule "copies are never negative" is not part of the data, so any code can break it. Object-oriented design fixes this by hiding the data behind methods that enforce the rule.'),
  ],
  [`${M}/2`]: [
    mcq('q1', 'What is the difference between a class and an object?', ['A class is a blueprint; an object is one instance made from it, with its own state', 'A class is a variable and an object is a function that works on it', 'An object is the blueprint, and a class is one copy made from that blueprint', 'There is no difference: they are two words for the same thing in C++'], 'The class describes the attributes and methods. Each object made from it holds its own values. Book is the class; Book a; creates an object.'),
    mcq('q2', 'What does this program print?', ['4', '-1', '0', 'It does not compile'], 'set(4) is accepted and stores 4. set(-1) is refused (it returns false) and changes nothing, so get() still returns 4.', CPP('#include <iostream>\nusing namespace std;\n\nclass Counter {\nprivate:\n    int n_ = 0;\n\npublic:\n    bool set(int v)\n    {\n        if (v < 0) {\n            return false;\n        }\n        n_ = v;\n        return true;\n    }\n    int get() const { return n_; }\n};\n\nint main()\n{\n    Counter c;\n    c.set(4);\n    c.set(-1);\n    cout << c.get() << \'\\n\';\n    return 0;\n}')),
    mcq('q3', 'A class declares int copies_; in its private section. What happens when main() contains a.copies_ = 5;?', ['It does not compile: private members are usable only by the class’s own methods', 'It compiles, and the private copies_ is set to 5 as written', 'It compiles, but the program crashes with an error when it is run', 'It compiles, but the assignment is quietly ignored when the program runs'], 'Access rules are checked by the compiler. Outside code must use the public interface, for example a setter that validates the value.'),
    mcq('q4', 'What does this program print?', ['3 2', '2 3', '3 3', '2 2'], 'a and b are separate objects, each with its own v. a.inc() runs twice (1 becomes 3) and b.inc() once (1 becomes 2).', CPP('#include <iostream>\nusing namespace std;\n\nclass Box {\npublic:\n    int v = 1;\n    void inc() { v++; }\n};\n\nint main()\n{\n    Box a;\n    Box b;\n    a.inc();\n    a.inc();\n    b.inc();\n    cout << a.v << " " << b.v << "\\n";\n    return 0;\n}')),
    mcq('q5', 'Why should a getter such as int copies() const be marked const?', ['It promises not to change the object, so it can be called on const objects', 'It makes the compiler store the returned result in read-only memory for speed', 'It allows the method to be called only once for each object', 'It turns the private attribute into a public one that anyone may read'], 'A const method only reads the object. A function that receives a const Book& may call only const methods, so every read-only method should be marked const.'),
  ],
  [`${M}/3`]: [
    mcq('q1', 'What is the main purpose of a constructor?', ['To put a new object into a valid starting state as soon as it is created', 'To delete the object and free its memory when it is no longer needed', 'To make every attribute of the class public so that main can read it', 'To copy the finished object into a vector of other objects'], 'A constructor runs automatically when an object is created, so the object can never exist in an unset, invalid state.'),
    mcq('q2', 'What does this program print?', ['z y x', 'x y z', 'y z x', 'Nothing is printed'], 'Local objects are destroyed in the reverse order of their creation, so the destructors run for z, then y, then x.', CPP('#include <iostream>\n#include <string>\nusing namespace std;\n\nclass T {\nprivate:\n    string n_;\n\npublic:\n    T(const string& n) : n_(n) {}\n    ~T() { cout << n_ << " "; }\n};\n\nint main()\n{\n    T a("x");\n    T b("y");\n    T c("z");\n    return 0;\n}')),
    mcq('q3', 'When does the destructor of a local object run?', ['Automatically, when the object goes out of scope', 'Only when you call it yourself, for example a.~Member();', 'Only when the whole program ends', 'When the first method of the object is called'], 'C++ calls the destructor for you when the block that contains the object ends. Calling it by hand for a local variable would destroy it twice.'),
    mcq('q4', 'What does this program print?', ['5 0', '5 -3', '0 0', '5 5'], 'The constructor replaces a negative width with 0. Box a(5) keeps 5; Box b(-3) becomes 0.', CPP('#include <iostream>\nusing namespace std;\n\nclass Box {\nprivate:\n    int w_;\n\npublic:\n    Box(int w) : w_(w < 0 ? 0 : w) {}\n    int w() const { return w_; }\n};\n\nint main()\n{\n    Box a(5);\n    Box b(-3);\n    cout << a.w() << " " << b.w() << "\\n";\n    return 0;\n}')),
    mcq('q5', 'A function is declared as void show(Member m) and called as show(a). Which constructor builds the parameter m?', ['The copy constructor, because the argument is copied into m', 'The default constructor, because m starts without a value', 'No constructor at all: parameters are never constructed', 'The destructor, because the argument is destroyed at the call'], 'Passing by value copies the argument, so the copy constructor runs. Declaring the parameter as const Member& would avoid the copy entirely.'),
  ],
  [`${M}/4`]: [
    mcq('q1', 'Which design is the best use of composition (a has-a relationship)?', ['A Loan class that stores a Member and a due date as attributes', 'A Loan class that inherits from Member, because every loan involves a member', 'A Member class that inherits from Book, so that members can be borrowed', 'A DVD class that inherits from Loan, so that DVDs can have a due date'], 'A loan HAS a member and a due date, so they are its attributes. Inheritance is only for is-a relationships: a loan is not a kind of member.'),
    mcq('q2', 'What does this program print?', ['A B ~B ~A', 'B A ~A ~B', 'A B ~A ~B', 'B ~B A ~A'], 'The base part is built first (A), then the derived part (B). Destruction runs in reverse: the derived destructor (~B) first, then the base destructor (~A).', CPP('#include <iostream>\nusing namespace std;\n\nstruct A {\n    A() { cout << "A "; }\n    ~A() { cout << "~A "; }\n};\n\nstruct B : A {\n    B() { cout << "B "; }\n    ~B() { cout << "~B "; }\n};\n\nint main()\n{\n    B b;\n    return 0;\n}')),
    mcq('q3', 'A base class has only the constructor Base(int x). The derived class constructor does not mention Base in its initializer list. What happens?', ['It does not compile: there is no default Base constructor for it to call', 'Base is built automatically with x set to 0', 'The derived class inherits the constructor Base(int x) and uses it', 'It compiles, but the base part of the object stays unbuilt'], 'A derived constructor must build the base part. If the base has no default constructor, you have to name the one to use, with arguments, in the initializer list.'),
    mcq('q4', 'What does this program print?', ['item book', 'book book', 'item item', 'book item'], 'Without virtual, the function that runs depends on the declared type of the reference. show() takes an Item reference, so Item::who runs; b.who() uses the Book version.', CPP('#include <iostream>\nusing namespace std;\n\nstruct Item {\n    void who() const { cout << "item"; }\n};\n\nstruct Book : Item {\n    void who() const { cout << "book"; }\n};\n\nvoid show(const Item& i)\n{\n    i.who();\n}\n\nint main()\n{\n    Book b;\n    show(b);\n    cout << " ";\n    b.who();\n    cout << "\\n";\n    return 0;\n}')),
    mcq('q5', 'Which statement about protected members is correct?', ['They are visible to the class and its derived classes, but not to outside code', 'They are visible to every part of the program, like public members', 'They are visible only to the class itself, like private members', 'They are visible only to classes that are not derived from the class'], 'protected sits between private and public: the class and every class derived from it can use the member, but outside code cannot.'),
  ],
  [`${M}/5`]: [
    mcq('q1', 'What is the difference between overloading and overriding?', ['Overloading gives one name several parameter lists; overriding replaces a virtual method in a derived class', 'Overloading replaces a base method in a derived class; overriding gives one name several parameter lists', 'They are the same thing, used for different kinds of classes', 'Overloading works only for operators; overriding works only for constructors'], 'Overloading is chosen by the compiler from the argument types. Overriding is chosen at run time from the real type of the object, and needs virtual in the base class.'),
    mcq('q2', 'What does this program print?', ['book', 'item', 'itembook', 'It does not compile'], 'who() is virtual, so the call through the Item pointer runs the version of the real object, a Book. Without virtual it would print item.', CPP('#include <iostream>\nusing namespace std;\n\nstruct Item {\n    virtual void who() const { cout << "item"; }\n};\n\nstruct Book : Item {\n    void who() const override { cout << "book"; }\n};\n\nint main()\n{\n    Book b;\n    const Item* p = &b;\n    p->who();\n    cout << "\\n";\n    return 0;\n}')),
    mcq('q3', 'What does this program print?', ['int double string', 'double double string', 'int int int', 'string string string'], 'The compiler picks the overload whose parameter matches the argument: 3 is an int, 3.0 is a double, and the text literal converts to a string.', CPP('#include <iostream>\n#include <string>\nusing namespace std;\n\nvoid show(int) { cout << "int "; }\nvoid show(double) { cout << "double "; }\nvoid show(const string&) { cout << "string "; }\n\nint main()\n{\n    show(3);\n    show(3.0);\n    show("hi");\n    cout << "\\n";\n    return 0;\n}')),
    mcq('q4', 'Why should the destructor of a polymorphic base class be virtual?', ['So deleting a derived object through a base pointer runs the derived destructor too', 'So that the destructor can return a value to the code that deletes the object', 'So that the class can be copied safely with a copy constructor', 'So that the constructor of the base class is called a second time'], 'Without a virtual destructor, deleting through a base pointer runs only the base destructor, and the derived part is never cleaned up.'),
    mcq('q5', 'What should operator<< return so that cout << a << b works?', ['The stream, by reference (ostream&)', 'void', 'The object that was printed', 'A bool that says whether printing worked'], 'cout << a << b means (cout << a) << b. The first call must return the stream so the second << has something to write to.'),
  ],
  [`${M}/6`]: [
    mcq('q1', 'What makes a class abstract in C++?', ['It has a pure virtual function (= 0), so no object of it can be created', 'All of its members are private, so nothing can be used from outside', 'It is declared with the keyword abstract in front of the class name', 'It has no data members, only member functions that do nothing'], 'A pure virtual function has no body in the class and must be implemented by derived classes. Until then the class is abstract and cannot be instantiated.'),
    mcq('q2', 'What does this program print?', ['9 2.5 pear', '3 1.5 apple', '9 2.5 apple', '9 2 pear'], 'The same template works for int, double and string: the larger of 3 and 9 is 9, of 2.5 and 1.5 is 2.5, and "pear" comes after "apple" in alphabetical order.', CPP('#include <iostream>\n#include <string>\nusing namespace std;\n\ntemplate <typename T>\nT larger(T a, T b)\n{\n    return a > b ? a : b;\n}\n\nint main()\n{\n    cout << larger(3, 9) << " " << larger(2.5, 1.5) << " " << larger<string>("pear", "apple") << "\\n";\n    return 0;\n}')),
    mcq('q3', 'What does this program print?', ['A C D', 'A B C D', 'A B D', 'A C'], 'After A is printed, throw leaves the try block at once, so B is skipped. The handler prints C, and the program continues after the catch block with D.', CPP('#include <iostream>\n#include <stdexcept>\nusing namespace std;\n\nint main()\n{\n    try {\n        cout << "A ";\n        throw runtime_error("x");\n        cout << "B ";\n    } catch (const exception& e) {\n        cout << "C ";\n    }\n    cout << "D\\n";\n    return 0;\n}')),
    mcq('q4', 'Why is it best to catch an exception as catch (const exception& e)?', ['It avoids copying the exception and avoids slicing a derived exception', 'It forces the exception to be thrown again by the next catch block', 'It makes catch blocks run faster than ordinary function calls do', 'C++ does not allow an exception to be caught by value at all'], 'Catching by const reference avoids a copy and keeps the full derived object. Catching by value would slice a derived exception down to its base class.'),
    mcq('q5', 'What does this program print?', ['9 1', '5 1', '1 9', '9 5'], 'The lambda a > b puts larger numbers first, so after sort the vector is 9, 5, 2, 1; v[0] is 9 and v[3] is 1.', CPP('#include <algorithm>\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main()\n{\n    vector<int> v = {5, 2, 9, 1};\n    sort(v.begin(), v.end(), [](int a, int b) { return a > b; });\n    cout << v[0] << " " << v[3] << "\\n";\n    return 0;\n}')),
  ],
  [`${M}/7`]: [
    mcq('q1', 'What does the Java compiler javac produce?', ['Bytecode in a .class file, which the Java Virtual Machine runs', 'A native executable for the current operating system only', 'Machine code that runs without any other program', 'A C++ source file'], 'javac translates source code into bytecode. The same bytecode runs on any computer that has a JVM, which is why Java is called portable.'),
    mcq('q2', 'What does this program print?', ['7 LIBRARY', '3 LIB', '7 library', '4 RARY'], 'a + "rary" gives "library", which has 7 letters; toUpperCase() gives "LIBRARY".', JAVA('public class Main {\n    public static void main(String[] args) {\n        String a = "lib";\n        String b = a + "rary";\n        System.out.println(b.length() + " " + b.toUpperCase());\n    }\n}')),
    mcq('q3', 'In Java, what happens to an object that no reference points to any more?', ['The garbage collector reclaims its memory automatically', 'The programmer must free it with delete', 'Its destructor runs immediately at the end of the block', 'It stays in memory until the computer is restarted'], 'Java has no delete and no destructors. The garbage collector finds objects that can no longer be reached and frees them.'),
    mcq('q4', 'What does this program print?', ['book', 'item', 'itembook', 'It does not compile'], 'Every Java method is virtual by default, so the call through the Item reference runs the version of the real object, a Book. In C++ you would need the virtual keyword.', JAVA('class Item {\n    String who() { return "item"; }\n}\n\nclass Book extends Item {\n    @Override\n    String who() { return "book"; }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Item i = new Book();\n        System.out.println(i.who());\n    }\n}')),
    mcq('q5', 'After Book b = a; in Java, where a is a Book variable, what is true?', ['a and b are two references to the same Book object', 'b is an independent copy of the Book', 'b holds the first half of the Book’s data', 'The program does not compile, because objects cannot be assigned'], 'Assigning a reference copies the reference, not the object. Changing the book through b is visible through a. In C++ the same line would copy the whole object.'),
  ],
  [`${M}/8`]: [
    mcq('q1', 'In a UML class diagram, what does a minus sign (-) in front of an attribute mean?', ['The attribute is private', 'The attribute is public', 'The attribute is protected', 'The attribute is static'], 'The visibility symbols are + for public, - for private and # for protected. Attributes are usually private, so most attributes in a class diagram start with a minus sign.'),
    mcq('q2', 'In a class diagram, a filled diamond at the Library end of a line to Loan shows which relationship?', ['Composition: the Library owns its loans, and they belong to it', 'Inheritance: a Loan is a kind of Library', 'Realization: Loan implements an interface of Library', 'Dependency: Library uses Loan for a moment'], 'A filled diamond is composition, a strong whole-part relationship. Inheritance is a hollow triangle, and realization is a dashed line with a hollow triangle.'),
    mcq('q3', 'One class stores the books, draws the menu, reads the keyboard and saves files. Which principle tells you to split it?', ['Single responsibility: each class should have one clear reason to change', 'Encapsulation: make all attributes public so other classes can help', 'Polymorphism: make every function virtual', 'Overloading: give every function the same name'], 'A class that does everything is hard to test and to change. Give each class one job, for example the model, the manager and the interface.'),
    mcq('q4', 'What does this program print?', ['3', '4', '2', '1'], 'The loop counts the loans whose member id is 1: the first, second and fourth entries, so mine is 3.', CPP('#include <iostream>\n#include <vector>\nusing namespace std;\n\nstruct Loan {\n    int member;\n    int item;\n};\n\nint main()\n{\n    vector<Loan> loans = {{1, 101}, {1, 301}, {2, 301}, {1, 201}};\n    int mine = 0;\n    for (const Loan& l : loans) {\n        if (l.member == 1) {\n            mine++;\n        }\n    }\n    cout << mine << "\\n";\n    return 0;\n}')),
    mcq('q5', 'Why should the Library class not read from the keyboard or print its own menu?', ['So its logic can be tested and reused with another interface, such as a web page', 'Because C++ does not allow cout or cin to be used inside a class method', 'Because a class may not have more than ten methods and ten attributes', 'Because printing from inside a class is much slower than printing from main'], 'Separating logic from the interface lets you test the Library with assertions and drive it from a menu, a web page or a script. Nothing forbids printing in a class; it is a design choice.'),
  ],
  // @@quiz-end
});
