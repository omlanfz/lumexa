# Lumexa Mission Log: Programming Foundations with C

**Course/Path:** Programming Foundations with C
**Lesson:** 01 of 08
**Title:** Introduction to Programming, Algorithms, Flowcharts and Pseudocode
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** C (gcc)

---

## Mission Brief

Every year, a school in Dhaka has to turn thousands of exam papers into result sheets. Done by hand, one tired teacher adds up three marks, divides by three, checks the pass mark and writes a grade, and then does it again for the next student, and the next. Somewhere around paper two hundred, a mistake creeps in. A computer never gets tired and never skips a step, but it also never guesses: it does **exactly** what it is told, in exactly the order it is told. So the real skill is not typing. The real skill is working out the precise steps first.

That is what you start learning today. You will meet the idea that sits underneath all of computer science, the **algorithm**, and two ways to write one down before any code exists: the **flowchart** and **pseudocode**. Then you will write, compile and run your first C program. By the end of the lesson you will have the blueprint of the **Student Result Management System (SRMS)**, the program you will grow, lesson by lesson, into a complete menu-driven C application by Lesson 8.

## Learning Objectives

1. Explain what an algorithm is and how it differs from a program.
2. Break a problem into its inputs, its processing steps and its outputs.
3. Draw a flowchart with the standard symbols for sequence and decision.
4. Write clear pseudocode for a simple algorithm and trace it by hand with sample data.
5. Describe how a C source file becomes a running program (write, compile, run).
6. Write, compile and run a C program that prints text, and recognise and fix a simple syntax error.

## Prerequisites

- Basic school-level arithmetic and algebra (averages, comparisons such as "less than 33").
- A way to write and run C: the Code Lab in this lesson (when it shows a Run button), an online C compiler, or `gcc` on your own computer. Your teacher will show the option you will use.

## Concept Explanation

### What is a program?

A **program** is a list of instructions that a computer follows. The processor inside a computer is very fast but very literal: it can add numbers, compare them, move data around and jump to a different instruction, and nothing more. Every app you have ever used, from a calculator to a video game, is a huge list of those tiny instructions arranged so that together they do something useful.

Because the processor only understands numbers (machine code), people write programs in a **programming language** that is easier to read, and then a tool translates it. **C**, the language of this course, was created in the early 1970s and is still one of the most important languages in the world. Operating systems, databases, game engines and the software inside phones, cars and medical devices are all written largely in C or its relatives. Learning C first teaches you what the computer is really doing, which is exactly what a university computer science course expects you to understand.

### Algorithms: the idea behind every program

An **algorithm** is a finite, ordered list of clear steps that solves a problem. A recipe is an algorithm for cooking; the method you learned for long division is an algorithm for dividing. An algorithm is independent of any programming language: the same algorithm can be written in C, in Python, or on paper.

A good algorithm has five properties:

| Property | Meaning | Example (average of three marks) |
|---|---|---|
| **Input** | It takes zero or more values to work on. | The three marks. |
| **Output** | It produces at least one result. | The average. |
| **Definiteness** | Every step is precise and unambiguous. | "Add the three marks", not "combine the marks somehow". |
| **Finiteness** | It stops after a limited number of steps. | Three additions, one division, then it ends. |
| **Effectiveness** | Every step is simple enough to actually be done. | Adding and dividing are basic operations. |

### From problem to program

Professional programmers follow the same four stages every time, and so will you:

1. **Understand** the problem: what goes in, what must come out, what rules connect them?
2. **Plan** an algorithm: write it as steps, a flowchart or pseudocode, and test it by hand.
3. **Code** the algorithm in a language such as C.
4. **Test and fix**: run it with sample data, including awkward data, and correct what is wrong.

Most beginners skip stage 2 and go straight to typing. That is why their programs are slow to write and full of errors. A thirty-second plan on paper regularly saves thirty minutes of debugging.

### Inputs, processing and outputs

Before drawing anything, write the problem as three lists. For one student in the SRMS:

| Inputs | Processing | Outputs |
|---|---|---|
| The student's name and three subject marks (0 to 100) | Add the marks to get the total, divide by 3 to get the average, and check whether every mark reaches the pass mark of 33 | The name, the total, the average and the result (PASS or FAIL) |

This simple table is called a **problem analysis**. If you cannot fill it in, you do not yet understand the problem well enough to program it.

### Flowcharts

A **flowchart** draws an algorithm as shapes joined by arrows, so you can follow the logic with your finger. Only a few standard symbols are used:

| Symbol | Shape | Used for |
|---|---|---|
| Terminator | Rounded oval | START and END |
| Input / Output | Parallelogram | Reading values in, showing results |
| Process | Rectangle | A calculation or an assignment |
| Decision | Diamond | A yes/no question; one arrow leaves for each answer |

Arrows show the direction of flow. Read the flowchart below from the top, following the arrows, and notice the one diamond: it is the only place where the path splits.

### Pseudocode

**Pseudocode** is an algorithm written in structured plain English. It has no strict grammar, but it follows conventions so that anyone can read it and any programmer can turn it into code: one action per line, capital words for the structure (`START`, `READ`, `DISPLAY`, `IF`, `ELSE`, `END IF`), an arrow `←` for "store the result in", and indentation to show what belongs inside a decision.

```text
START
    DISPLAY "Enter the student's name"
    READ name
    READ mark1, mark2, mark3
    total ← mark1 + mark2 + mark3
    average ← total / 3
    IF mark1 ≥ 33 AND mark2 ≥ 33 AND mark3 ≥ 33 THEN
        result ← "PASS"
    ELSE
        result ← "FAIL"
    END IF
    DISPLAY name, total, average, result
END
```

Notice what the pseudocode does *not* worry about: how the name is typed in, or how many decimal places are shown. Those are details for the code. The pseudocode captures the **logic**.

### Why C, and how a C program runs

C is a **compiled** language. You write **source code** in a text file (for example `hello.c`). A tool called a **compiler** (we use `gcc`) reads the whole file, checks it against the rules of the language (the **syntax**) and, if it is correct, translates it into an **executable** file of machine code. You then run the executable and the processor carries out your instructions.

Compare this with an *interpreted* language such as Python, where an interpreter reads and runs your code line by line. A compiled program usually runs faster and, more importantly for you, the compiler catches many mistakes **before** the program ever runs.

### The shape of a first C program

Every C program you will write in this course has this skeleton:

```c
#include <stdio.h>

int main(void)
{
    printf("Hello, SRMS!\n");
    return 0;
}
```

```output
Hello, SRMS!
```

Read it line by line:

- `#include <stdio.h>` asks the compiler to bring in the **standard input/output library**, which provides `printf`. Without it the compiler does not know what `printf` is.
- `int main(void)` declares the **main function**. Every C program starts running at `main`. `int` says it hands back a whole number when it finishes; `void` says it takes nothing in.
- `{` and `}` (**braces**) mark where the body of `main` starts and ends.
- `printf("Hello, SRMS!\n");` is a **statement**: it prints the text between the quotation marks. `\n` is an **escape sequence** meaning "start a new line". Every statement in C ends with a **semicolon**.
- `return 0;` tells the operating system the program finished successfully.

C is **case-sensitive**: `printf` and `Printf` are different words, and only the first exists.

### Comments: notes for humans

Text that the compiler ignores, written for the people reading the code, is a **comment**. Write `//` for a note to the end of the line, or `/* ... */` for a longer note. Good comments explain *why* you did something, not what the obvious line does.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Algorithm** | A finite, ordered list of clear steps that solves a problem. |
| **Program** | An algorithm written in a programming language so a computer can carry it out. |
| **Source code** | The text of a program, as a person writes it. |
| **Compiler** | A tool that checks source code and translates it into machine code. |
| **Executable** | The file of machine code that the computer can run. |
| **Syntax** | The grammar rules of a programming language; breaking them is a syntax error. |
| **Flowchart** | A diagram of an algorithm made of standard symbols joined by arrows. |
| **Pseudocode** | An algorithm written in structured, language-independent plain English. |
| **Statement** | One complete instruction in C, ending with a semicolon. |
| **Comment** | Text ignored by the compiler, written to explain the code to readers. |
| **Escape sequence** | A backslash code inside text, such as `\n` for a new line. |
| **Trace table** | A table in which you record the value of every variable as you follow an algorithm by hand. |

## Worked Examples

### Example 1: Choose the larger of two marks

**Problem.** A teacher wants to know which of two marks is higher.

1. Inputs: two marks, `a` and `b`. Output: the larger one.
2. Decide: if `a` is greater than `b`, the answer is `a`; otherwise it is `b`.
3. Pseudocode:

```text
START
    READ a, b
    IF a > b THEN
        larger ← a
    ELSE
        larger ← b
    END IF
    DISPLAY larger
END
```

4. Test with `a = 72, b = 65`: `72 > 65` is true, so `larger = 72`. Test with `a = 40, b = 40`: `40 > 40` is false, so the ELSE branch gives `larger = 40`. Both are correct, which shows the equal case is handled too.

### Example 2: Tracing the result algorithm by hand

A **trace table** is how you test an algorithm before writing any code. Follow the pseudocode from the section above with two students and record every value:

| Step | name | mark1 | mark2 | mark3 | total | average | all marks ≥ 33? | result |
|---|---|---|---|---|---|---|---|---|
| Student A: read | Anika | 72 | 65 | 90 | | | | |
| calculate | Anika | 72 | 65 | 90 | 227 | 75.67 | | |
| decide | Anika | 72 | 65 | 90 | 227 | 75.67 | yes | PASS |
| Student B: read | Rafi | 85 | 28 | 60 | | | | |
| calculate | Rafi | 85 | 28 | 60 | 173 | 57.67 | | |
| decide | Rafi | 85 | 28 | 60 | 173 | 57.67 | no (28 < 33) | FAIL |

Rafi's average is a respectable 57.67, yet the algorithm says FAIL, because one subject is below 33. A trace table exposes exactly this kind of rule so that you can decide whether it is the rule you *want*. Here it is the real rule used in Bangladesh's secondary exams: you must pass every subject.

### Example 3: Walking through a program and reading an error

Here is a slightly longer program. Predict the output before you read it.

```c
#include <stdio.h>

int main(void)
{
    printf("Student Result Management System\n");
    printf("--------------------------------\n");
    printf("Total marks: %d\n", 72 + 65 + 90);
    return 0;
}
```

```output
Student Result Management System
--------------------------------
Total marks: 227
```

1. The first two `printf` lines print fixed text, each ending with `\n` so the next line starts fresh.
2. In the third, `%d` is a **placeholder**: it means "put a whole number here". The value after the comma, `72 + 65 + 90`, is worked out by the computer to give 227 and is placed where `%d` stands. You will study placeholders properly in Lesson 2.
3. Now suppose you forget the semicolon at the end of the second line. The compiler refuses to build the program and reports something like this:

```text
srms.c: In function 'main':
srms.c:6:5: error: expected ';' before 'printf'
```

4. Read it from left to right: the **file** (`srms.c`), the **line number** (6), the **column** and the **message**. The compiler usually points at the line *after* a missing semicolon, because that is where it noticed something was wrong. Fix the line above, compile again, and the error disappears.

## Common Mistakes and Misconceptions

- **"Programming means typing code."** Typing is the last and smallest part. Experienced programmers spend most of their time understanding the problem and planning. Always write the analysis and the pseudocode first.
- **Forgetting the semicolon.** Every statement ends with `;`. The error message often points to the *next* line, so look at the line above the one reported.
- **Wrong capitals.** `Printf`, `PRINTF` and `printf` are three different names. Only `printf` works. The same holds for `main`.
- **Straight quotes only.** Text copied from a word processor can contain curly quotation marks (“ ”). C needs straight ones (`"`). The compiler reports a confusing error about stray characters.
- **Forgetting `\n`.** Without it, the next output continues on the same line and your result slip looks like one long sentence.
- **"The computer will understand what I mean."** It will not. If a step is vague, the computer cannot do it. This is why an algorithm must be definite.
- **Mixing up the kinds of error.** A **syntax error** breaks the grammar and stops compilation. A **runtime error** crashes a running program. A **logic error** runs but gives a wrong answer (for example dividing by 2 instead of 3 when averaging three marks). Logic errors are the hardest, and only careful testing finds them.

## Guided Hands-On Activity

**Compile and run your first program, and break it on purpose.** Work with your teacher through these steps.

1. Open your editor, or the Code Lab below, and create a file called `hello.c`.
2. Type the Hello program from this lesson exactly. Do not copy and paste: typing it builds the habit of reading every character.
3. Compile it. On your own computer that is `gcc hello.c -o hello`; in the Code Lab, press **Run**.
4. Run it and check that the output is `Hello, SRMS!`.
5. Now **break it**: delete the semicolon after `printf(...)`. Compile again and read the error message. What line does it name? What does it say is missing?
6. Fix it again. Then change `printf("Hello, SRMS!\n");` to use `\n` twice, and then not at all, and see what each does to the output.
7. Add a second `printf` that prints your own name, and a comment above it that explains what the line does.

```c
#include <stdio.h>

int main(void)
{
    // Print a greeting for the new system
    printf("Hello, SRMS!\n");
    return 0;
}
```

```output
Hello, SRMS!
```

## Lesson Project: SRMS Blueprint: The Result Algorithm

### Objective

Design the first piece of the Student Result Management System: the algorithm that turns one student's marks into a result. You will analyse the problem, draw the flowchart, write and trace the pseudocode, and write a first C program that prints the system's banner. Everything you produce today is reused in the next seven lessons.

### Requirements

- A **problem analysis table** listing the inputs, the processing and the outputs of the SRMS for one student.
- A **flowchart** of the result algorithm that uses the four standard symbols and has exactly one decision.
- **Pseudocode** that matches your flowchart, with the pass rule: a student passes only if all three marks are at least 33.
- A **trace table** that tests your pseudocode with at least two students, one who passes and one who fails because of a single low subject.
- A C program, `srms_banner.c`, that prints the SRMS banner shown below with your own name, and has at least two comments.

### Instructions

1. Write the problem analysis table (inputs, processing, outputs) in a document or on paper.
2. Draw the flowchart on paper or with any free diagram tool. Start at START and finish at END. Use a parallelogram for each input and output, a rectangle for each calculation and a diamond for the pass decision.
3. Write the pseudocode, one action per line, using `←` for assignments and indentation inside the IF.
4. Pick two students (one who passes, one who fails on a single subject) and fill in a trace table, row by row, exactly as in Example 2.
5. Write `srms_banner.c`. It must print the banner below, with your own name on the `Student` line.
6. Compile it, run it and compare your output with the expected output. Fix any compiler errors.
7. Put the analysis, flowchart, pseudocode, trace table and banner program in one folder named `srms`. You will need them next lesson.

### Expected Output

Your banner program must print exactly this (your own name replaces *Your Name*):

```output
==========================================
  STUDENT RESULT MANAGEMENT SYSTEM (SRMS)
==========================================
Course  : Programming Foundations with C
Student : Your Name
Version : 0.1 (blueprint)
------------------------------------------
Pass mark per subject : 33
Subjects per student  : 3
```

The flowchart is on your paper, so check it with this list: one START, one END, two input boxes (name, marks), two process boxes (total, average), one diamond with a "Yes" arrow and a "No" arrow, and one output box.

### Hints

1. **Hint 1 (stuck on the analysis).** Ask yourself three questions in order: What does the user type? What must the program print? What calculation connects the two? Each answer is one column of the table.
2. **Hint 2 (stuck on the diamond).** Write the question inside the diamond as a yes/no sentence, such as "Are all three marks at least 33?". Draw one arrow labelled Yes to the PASS box and one labelled No to the FAIL box, then join both back to the output box.
3. **Hint 3 (banner looks wrong).** Count the characters in the `=` line and make every other line fit the same width. Each `printf` needs its own `\n` and its own semicolon.
4. **Hint 4 (the compiler complains).** Read the line number in the first error only. One missing semicolon can cause several messages, and fixing the first often removes the rest.

### Success Criteria

- [ ] My problem analysis names the inputs, the processing and the outputs separately.
- [ ] My flowchart uses the correct symbol for every step and has exactly one decision with two labelled arrows.
- [ ] My pseudocode and my flowchart describe the same algorithm.
- [ ] My trace table shows one PASS and one FAIL caused by a single mark below 33, and the totals and averages are correct.
- [ ] `srms_banner.c` compiles with no errors and prints the banner exactly, with my own name.
- [ ] My program contains at least two comments that explain *why*, not just what.
- [ ] All five items are saved in one folder ready for Lesson 2.

### Extension Challenge

Extend your pseudocode so the algorithm handles **a whole class** instead of one student: it first asks how many students there are, then repeats the result steps for each one, and at the end announces the name of the student with the highest total. Mark the repeated part clearly with an indented `REPEAT ... END REPEAT`, and add a second flowchart for it. Which new variables do you need to keep track of the best student so far? You will turn exactly this plan into C in Lesson 4.

## Lesson Recap

- An **algorithm** is a finite, ordered list of clear steps; a **program** is an algorithm written in a language a computer can run.
- Plan before you code: understand the problem, write the algorithm, then code and test.
- A **problem analysis** separates inputs, processing and outputs. A **flowchart** uses standard symbols; **pseudocode** is structured plain English; a **trace table** tests an algorithm by hand.
- C is compiled: **source code** is checked and translated by the **compiler** into an **executable**.
- A C program starts at `main`, ends every statement with `;`, is case-sensitive, and uses `\n` for a new line.
- Syntax errors stop compilation, runtime errors crash a running program, and logic errors give wrong answers quietly.

## Homework / Extension Mission

Finish the SRMS blueprint folder if you did not complete it in class. Then choose **two** of these problems and, for each, write a problem analysis table, pseudocode and a trace table with two test cases: (a) decide whether a year is a leap year; (b) convert a temperature from Celsius to Fahrenheit and say whether it is below freezing; (c) work out a mobile data bill where the first 2 GB cost a fixed price and every extra GB costs more. Finally, write a second C program, `about_me.c`, that prints a four-line profile of yourself using `printf` and `\n`, with a comment above each line. Be ready to show your folder at the start of the next lesson.

## Course Project Connection

This lesson created the **blueprint of the Student Result Management System**, the course project you will finish in Lesson 8. Your problem analysis tells you what data the system stores, your flowchart and pseudocode are the logic you will translate into C in Lessons 2 and 3, and your banner program is the first screen of the finished application. Keep the `srms` folder: every lesson from now on adds one component to it.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 5 minutes hook (ask "how would you tell a robot to make tea, exactly?" and let the class discover how vague instructions fail); 20 minutes concepts (algorithm properties, the analysis table, flowchart and pseudocode); 10 minutes the first C program and the compile cycle; 10 minutes the guided activity; 15 minutes starting the project, with the rest as continuation work.

**Live demonstration.** Compile `hello.c`, run it, remove the semicolon and show the error. Repeat with `Printf`. Let students predict the message before you press Enter. Stress that error messages are help, not punishment.

**Misconceptions to watch for.** Students think a flowchart arrow means "time passes". Say that it means "go next to". Students often put calculations inside the decision diamond: a diamond holds only a question.

**Reference answers.**

Problem analysis: inputs are the name and three marks (0 to 100); processing is total = sum, average = total / 3, check every mark ≥ 33; outputs are name, total, average and PASS or FAIL.

Flowchart order: START, input name, input three marks, process total, process average, decision "Are all three marks at least 33?", Yes arrow to process `result ← PASS`, No arrow to process `result ← FAIL`, both arrows join at the output box, then END.

Trace table (the shape matters more than the numbers; check arithmetic): a passing student such as 70, 55, 41 gives total 166, average 55.33, PASS; a failing student such as 90, 90, 32 gives total 212, average 70.67, FAIL because of the 32.

Reference `srms_banner.c` (accept any equivalent banner as long as every line ends with `\n` and the student's name appears):

```c
#include <stdio.h>

int main(void)
{
    // Print the banner of the Student Result Management System
    printf("==========================================\n");
    printf("  STUDENT RESULT MANAGEMENT SYSTEM (SRMS)\n");
    printf("==========================================\n");
    printf("Course  : Programming Foundations with C\n");
    printf("Student : Your Name\n");
    printf("Version : 0.1 (blueprint)\n");
    printf("------------------------------------------\n");
    // The rules the system will apply
    printf("Pass mark per subject : 33\n");
    printf("Subjects per student  : 3\n");
    return 0;
}
```

```output
==========================================
  STUDENT RESULT MANAGEMENT SYSTEM (SRMS)
==========================================
Course  : Programming Foundations with C
Student : Your Name
Version : 0.1 (blueprint)
------------------------------------------
Pass mark per subject : 33
Subjects per student  : 3
```

**Differentiation.** Support: give a half-filled flowchart and let students add the missing shapes. Stretch: ask students to find a *different* correct algorithm for the pass rule (for example, find the smallest mark and test only that one) and explain which is simpler to read.

**Discussion questions (not for the student quiz).** Is a recipe that says "add salt to taste" an algorithm? Which of the five properties does it break? Why does the pass rule in the SRMS treat a single failed subject differently from a low average?

**Check before moving on.** Every student has compiled and run a program and has seen at least one real compiler error. If not, spend the first 10 minutes of the next lesson on it.
