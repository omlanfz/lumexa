// FILE PATH: server/src/pre-university-cse/outline.ts
//
// The canonical outline of the Pre-University CSE program: its eight courses (CourseModule rows),
// the eight teaching lessons of each (64 in all), the eight course-level projects and, for every
// lesson, the hands-on project it contains and what that project adds to the course project.
//
// ONE source of truth. The course seed (module / lesson / project rows), the lesson-file builder
// (server/prisma/pre-university-cse/build.ts), the assessment banks, the public catalog snapshot,
// the curriculum PDF and the tests all read this file, so a title can never differ between the
// website, the lesson page, the PDF and the assessments.
//
// Lesson titles and the order of the curriculum follow the official Pre-University CSE
// curriculum. Do not rename or reorder them here without changing the lesson files, the
// quizzes and the PDF together (the build script and the specs fail when they disagree).

export const PUCSE_SLUG = 'pre-university-cse';
export const PUCSE_TITLE = 'Pre-University CSE';
export const PUCSE_CATEGORY = 'Pre-University CSE';
export const PUCSE_EMOJI = '🎓';
/** The dataset file (without .json) the course seed reads, see PATHWAY_SLUGS in curriculum-source.ts. */
export const PUCSE_PATHWAY_FILE = 'pre-university-cse-path';

export const PUCSE_COURSE_COUNT = 8;
export const PUCSE_LESSONS_PER_COURSE = 8;
export const PUCSE_LESSON_COUNT = PUCSE_COURSE_COUNT * PUCSE_LESSONS_PER_COURSE; // 64
export const PUCSE_COURSE_ASSESSMENTS = PUCSE_COURSE_COUNT; // 8
export const PUCSE_FINAL_ASSESSMENTS = 1;
/** Every scheduled session: 64 teaching lessons + 8 course assessments + 1 final assessment. */
export const PUCSE_SESSIONS = PUCSE_LESSON_COUNT + PUCSE_COURSE_ASSESSMENTS + PUCSE_FINAL_ASSESSMENTS; // 73

export const PUCSE_FINAL_TITLE = `${PUCSE_TITLE} — Final Assessment`;

/** What a learner is told in the catalog. Kept here so the seed, the PDF and the website agree. */
export const PUCSE_DESCRIPTION =
  "A university-preparation journey for Grades 9–12 and HSC graduates who plan to study CSE or Computer Science, in Bangladesh or abroad. Students build the programming skills, computational thinking, mathematical reasoning and core computer science knowledge a CSE bachelor's degree demands: C and C++ programming, object-oriented design, data structures and algorithms, discrete mathematics, digital logic and computer architecture, operating systems, networking and cybersecurity, databases, web technologies and software engineering, and an introduction to Python and artificial intelligence. No prior coding experience is needed; basic school-level algebra is expected. 8 courses, 64 teaching lessons plus 8 course assessments and a Final Assessment.";

export interface PuLesson {
  /** 1–8 inside its course. */
  position: number;
  /** 1–64 across the program (the number learners and parents see as "Lesson N"). */
  number: number;
  /** The official lesson title — also the title of the lesson page. */
  title: string;
  /** File name (without .md) in server/prisma/pre-university-cse/lessons/<course-slug>/. */
  file: string;
  /** The language or tool the lesson is taught with ("C (gcc)", "SQL (SQLite)", "CircuitVerse"). */
  tool: string;
  /** The lesson's own hands-on project — a different one in every lesson. */
  project: string;
  /** What this lesson's project adds to the course project (shown as the lesson checkpoint). */
  adds: string;
}

export interface PuCourseProject {
  slug: string;
  title: string;
  /** One sentence: what the student ends up with. */
  description: string;
}

export interface PuCourse {
  /** 1–8 ("Course 01"). */
  number: number;
  slug: string;
  title: string;
  /** Primary language / tools, for the PDF and the course summary. */
  languages: string;
  /** One line for the website (course outcome). */
  outcome: string;
  /** A short paragraph for the curriculum PDF and the admin course description. */
  summary: string;
  project: PuCourseProject;
  lessons: PuLesson[];
}

type LessonDef = [title: string, tool: string, project: string, adds: string];

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function course(
  number: number,
  slug: string,
  title: string,
  languages: string,
  outcome: string,
  summary: string,
  project: PuCourseProject,
  defs: LessonDef[],
): PuCourse {
  if (defs.length !== PUCSE_LESSONS_PER_COURSE) {
    throw new Error(`${slug}: expected ${PUCSE_LESSONS_PER_COURSE} lessons, found ${defs.length}`);
  }
  return {
    number,
    slug,
    title,
    languages,
    outcome,
    summary,
    project,
    lessons: defs.map(([lessonTitle, tool, lessonProject, adds], i) => ({
      position: i + 1,
      number: (number - 1) * PUCSE_LESSONS_PER_COURSE + i + 1,
      title: lessonTitle,
      file: `${String(i + 1).padStart(2, '0')}-${slugify(lessonTitle).slice(0, 80).replace(/-+$/g, '')}`,
      tool,
      project: lessonProject,
      adds,
    })),
  };
}

export const PUCSE_COURSES: PuCourse[] = [
  course(
    1,
    'programming-foundations-with-c',
    'Programming Foundations with C',
    'C',
    'Think in algorithms, then write structured C programs with functions, arrays, pointers, structures and files',
    'Students develop structured programming skills and learn to translate problems into working programs. They start from algorithms, flowcharts and pseudocode, then write C that makes decisions, repeats work, is split into functions, stores data in arrays, strings and structures, manages memory with pointers and keeps its records in files. The Student Result Management System grows lesson by lesson.',
    {
      slug: 'student-result-management-system',
      title: 'Student Result Management System using C',
      description:
        'A menu-driven C program that records students and their marks, calculates totals, averages and grades, finds the top student and saves every record to a file.',
    },
    [
      ['Introduction to Programming, Algorithms, Flowcharts and Pseudocode', 'C (gcc) · flowchart editor', 'SRMS Blueprint: The Result Algorithm', 'Designs the whole system as an algorithm, a flowchart and pseudocode, and prints the SRMS banner from the first C program.'],
      ['Variables, Data Types, Operators and Input/Output', 'C (gcc)', 'Mark Entry and Result Slip', 'Reads a student’s name and marks, calculates total and average, and prints a formatted result slip.'],
      ['Conditional Statements and Boolean Logic', 'C (gcc)', 'Grade and Pass/Fail Decision Engine', 'Adds mark validation, the Bangladesh GPA grade scale and the pass/fail rule.'],
      ['Loops, Nested Loops and Program Execution', 'C (gcc)', 'Class Roster Loop and Menu', 'Repeats entry for a whole class, finds the highest, lowest and class average, and adds the main menu loop.'],
      ['Functions, Parameters, Scope and Modular Programming', 'C (gcc)', 'Refactor SRMS into Functions', 'Splits the program into tested functions (total, average, grade, printSlip) with prototypes and clear scope.'],
      ['Arrays, Strings and Multidimensional Arrays', 'C (gcc)', 'Marks Table with 2D Arrays', 'Stores names and a students-by-subjects marks table, with per-student totals, per-subject averages and name search.'],
      ['Pointers, Memory Addresses and Dynamic Memory Allocation', 'C (gcc)', 'Dynamic Class Size with malloc', 'Allocates the class on the heap with malloc, passes data by pointer and releases it with free.'],
      ['Structures, File Handling, Debugging and Project Development', 'C (gcc)', 'SRMS: The Complete System', 'Combines a Student structure, file save/load and a debugging pass into the finished menu-driven system.'],
    ],
  ),
  course(
    2,
    'object-oriented-programming-and-programming-languages',
    'Object-Oriented Programming & Programming Languages',
    'C++ (with Java comparisons)',
    'Move from structured code to object-oriented design in C++ and see how other languages express the same ideas',
    'Students progress from structured programming to object-oriented software design. They model real things as classes, control their lifecycle, reuse code through inheritance and composition, use polymorphism, templates, exceptions and the STL, and meet Java through meaningful comparisons so they understand how programming languages differ. The Library Management System grows lesson by lesson.',
    {
      slug: 'library-management-system',
      title: 'Library Management System using C++',
      description:
        'An object-oriented C++ application with books, members, loans and a catalogue, designed with a UML class diagram and driven by a menu.',
    },
    [
      ['Introduction to C++ and Procedural vs Object-Oriented Programming', 'C++ (g++)', 'Library Catalogue, Procedural Version', 'Builds the baseline procedural catalogue and feels where scattered data and functions start to hurt.'],
      ['Classes, Objects, Attributes, Methods and Encapsulation', 'C++ (g++)', 'The Book Class', 'Introduces the Book class with private attributes, validated setters and a display method.'],
      ['Constructors, Destructors and Object Lifecycle', 'C++ (g++)', 'Member Class and Lifecycle Trace', 'Adds the Member class with constructors, a destructor and a traced object lifecycle.'],
      ['Inheritance, Composition and Code Reusability', 'C++ (g++)', 'Library Item Hierarchy and Loans', 'Creates a LibraryItem base class with Book, Magazine and DVD, and a Loan that is composed of a member and an item.'],
      ['Polymorphism, Overloading, Overriding and Virtual Functions', 'C++ (g++)', 'Polymorphic Catalogue', 'Makes the catalogue polymorphic with virtual functions, an overloaded search and an overloaded output operator.'],
      ['Abstraction, Templates, Exception Handling and the STL', 'C++ (g++)', 'Safe Library Core', 'Adds an abstract Borrowable interface, a template Repository, exceptions for failures and STL containers.'],
      ['Introduction to Java and Comparing OOP Across Languages', 'Java (JDK) · C++ (g++)', 'Book and Member in Java', 'Ports Book and Member to Java and records a C++ versus Java comparison table.'],
      ['UML Class Diagrams and Building an Object-Oriented Application', 'C++ (g++) · UML', 'LMS Capstone', 'Draws the UML class diagram and assembles the finished Library Management System.'],
    ],
  ),
  course(
    3,
    'data-structures-and-algorithmic-problem-solving',
    'Data Structures & Algorithmic Problem-Solving',
    'C++',
    'Implement, analyse and compare the core data structures and algorithms of computer science',
    'The central course of the program. Students learn to measure algorithms with Big O, then implement searching, sorting, linked lists, stacks, queues, recursion, trees, heaps, hash tables and graphs from scratch, and finish with divide and conquer, greedy methods and an introduction to dynamic programming. Every structure is built, traced, measured and applied to a problem. Algorithm Explorer grows lesson by lesson.',
    {
      slug: 'algorithm-explorer',
      title: 'Algorithm Explorer: visualising and comparing algorithms',
      description:
        'A C++ program that runs algorithms on generated data, prints step-by-step traces, counts the work each one does and compares their performance in a final report.',
    },
    [
      ['Algorithms, Time Complexity, Space Complexity and Big O', 'C++ (g++)', 'Algorithm Explorer: The Counter Harness', 'Builds the operation-counting harness every later algorithm plugs into.'],
      ['Arrays, Vectors, Searching and Binary Search', 'C++ (g++)', 'Algorithm Explorer: Search Race', 'Adds linear and binary search with comparison counters and a low/mid/high trace.'],
      ['Sorting Algorithms and Their Performance', 'C++ (g++)', 'Algorithm Explorer: Sorting Lab', 'Adds bubble, selection, insertion, merge and quick sort with comparison and swap counts on best, average and worst-case data.'],
      ['Linked Lists, Stacks and Queues', 'C++ (g++)', 'Algorithm Explorer: Data-Structure Toolkit', 'Implements a linked list, a stack and a queue, and uses them for a bracket checker and a step log.'],
      ['Recursion, Trees, Binary Search Trees and Heaps', 'C++ (g++)', 'Algorithm Explorer: Trees and Heaps', 'Adds recursion call counting, a binary search tree and a heap with heap sort.'],
      ['Hash Tables and Hashing', 'C++ (g++)', 'Algorithm Explorer: Hash Table Lab', 'Builds a chaining hash table and measures collisions for different table sizes and hash functions.'],
      ['Graphs, BFS, DFS and Shortest-Path Concepts', 'C++ (g++)', 'Algorithm Explorer: Graph Explorer', 'Adds a graph with BFS, DFS and shortest-path search over a campus map.'],
      ['Divide and Conquer, Greedy Algorithms and Introduction to Dynamic Programming', 'C++ (g++)', 'Algorithm Explorer: The Final Comparison', 'Connects every algorithm in one menu program and compares naive, greedy, divide-and-conquer and dynamic-programming solutions.'],
    ],
  ),
  course(
    4,
    'discrete-mathematics-and-computational-logic',
    'Discrete Mathematics & Computational Logic',
    'Mathematics (with optional Python and JavaScript)',
    'Reason precisely: logic, sets, relations, proofs, counting, graphs, recurrences and formal languages',
    'The mathematical foundation of computer science, taught so that it is accessible to Grades 9–12 yet academically meaningful. Students move from truth tables and sets to relations, proofs and induction, counting and probability, graph theory, sequences and recurrence relations, and finally formal languages and finite automata. Interactive visualisations and exercises carry the course; small programs check the mathematics but never replace it. The Computational Logic Challenge dossier grows lesson by lesson.',
    {
      slug: 'computational-logic-challenge',
      title: 'Computational Logic Challenge: logic problems, graphs and mathematical reasoning',
      description:
        'A portfolio of solved logic problems, constructed graphs and written proofs that demonstrates mathematical reasoning from propositions to finite automata.',
    },
    [
      ['Propositional Logic, Predicate Logic and Truth Tables', 'Logic · truth-table builder', 'Truth Table Studio', 'Opens the dossier with translated statements, truth tables and an equivalence proof by table.'],
      ['Set Theory and Set Operations', 'Sets · Venn diagrams', 'Set Lab: Venn Diagrams and Identities', 'Adds set operations, Venn diagrams, set identities and an inclusion–exclusion problem.'],
      ['Relations, Functions and Equivalence Relations', 'Relations · modular arithmetic', 'Relation Detective', 'Adds a classified relation, equivalence classes and a function-properties analysis.'],
      ['Mathematical Proofs, Induction and Contradiction', 'Proof writing', 'Proof Portfolio', 'Adds four written proofs: direct, contrapositive, contradiction and induction.'],
      ['Counting Principles, Permutations, Combinations and Probability', 'Counting · probability', 'Counting and Probability Challenge', 'Adds counting and probability problems checked by a simulation.'],
      ['Graph Theory, Paths, Trees and Connectivity', 'Graphs · adjacency matrices', 'Campus Graph Builder', 'Adds a graph model of a campus with degrees, an Euler analysis, connectivity and a spanning tree.'],
      ['Sequences, Summations and Recurrence Relations', 'Sequences · recurrences', 'Recurrence Solver', 'Adds closed forms for sums and recurrences, verified for small cases.'],
      ['Formal Languages, Regular Expressions and Introduction to Finite Automata', 'Regex · finite automata', 'Pattern Machine: Regex and DFA', 'Completes the dossier with regular expressions and a finite automaton for a real pattern.'],
    ],
  ),
  course(
    5,
    'how-computers-work-digital-logic-and-computer-architecture',
    'How Computers Work: Digital Logic & Computer Architecture',
    'CircuitVerse (browser simulator)',
    'Understand how computers represent information, process instructions and run programs, down to the logic gates',
    'Students understand how computers represent information, process instructions and execute programs. They convert between number systems, perform binary arithmetic, build circuits from logic gates, design adders, multiplexers, flip-flops, registers and counters, follow the CPU through the instruction cycle, explore the memory hierarchy, and write assembly language. Everything is taught online with browser-based simulations, interactive circuit visualisations, processor diagrams and guided demonstrations: no hardware or electronics kit is needed. The simple digital logic system grows lesson by lesson in CircuitVerse.',
    {
      slug: 'digital-logic-system-in-circuitverse',
      title: 'Build and simulate a simple digital logic system using CircuitVerse',
      description:
        'A four-bit calculator unit built from gates, an adder, a multiplexer, an ALU and a register, designed and tested in the CircuitVerse browser simulator.',
    },
    [
      ['Number Systems: Binary, Decimal, Octal and Hexadecimal', 'CircuitVerse · bit explorer', 'Number System Converter and Switch Display', 'Builds the four-switch input panel with a hexadecimal display that every later circuit reuses.'],
      ['Binary Arithmetic, Boolean Algebra and Logic Gates', 'CircuitVerse · circuit lab', 'Gate Toolkit and Half Adder', 'Builds the basic gates, proves NAND is universal and designs a half adder.'],
      ['Combinational Circuits: Adders, Multiplexers and Decoders', 'CircuitVerse · circuit lab', 'Four-Bit Adder with Operation Select', 'Builds a full adder, chains it into a four-bit adder and adds a multiplexer to select the operation.'],
      ['Sequential Circuits: Flip-Flops, Registers and Counters', 'CircuitVerse · circuit lab', 'Accumulator Register and Counter', 'Adds a four-bit register with load control and a counter that remembers a result.'],
      ['CPU Architecture: ALU, Control Unit and Instruction Cycle', 'CircuitVerse · assembly simulator', 'Mini ALU and Instruction Cycle Trace', 'Builds a four-operation ALU with a zero flag and traces three instructions through the cycle.'],
      ['Memory Hierarchy: Registers, Cache, RAM and Storage', 'CircuitVerse · calculators', 'Memory Hierarchy Calculator and Constant ROM', 'Adds a small constant memory and a calculator for hit rates and average access time.'],
      ['Machine Instructions, Assembly Language and Addressing Modes', 'Assembly simulator', 'Assembly Programs on a Toy CPU', 'Writes assembly programs for the toy CPU that the logic system is modelled on.'],
      ['Computer Organisation, Basic Pipelining and Digital Circuit Simulation', 'CircuitVerse', 'Mini Calculator System: Build Report', 'Integrates switches, adder/ALU, register and display into one tested system with a build report.'],
    ],
  ),
  course(
    6,
    'operating-systems-networking-and-cybersecurity',
    'Operating Systems, Networking & Cybersecurity',
    'Operating-system tools, network tools and browser developer tools',
    'See how software runs, how computers communicate and how information is protected',
    'Students understand how software runs, how computers communicate and how information is protected. They study processes, threads, scheduling, memory and file systems, then the OSI and TCP/IP models, IP addressing, subnetting, routing, TCP and UDP, DNS, HTTP and HTTPS, and finish with defensive cybersecurity: authentication, authorisation, cryptography, threat analysis and basic troubleshooting. Cybersecurity is taught as defence, at a level suited to the age group. The Computer Network Explorer dossier grows lesson by lesson.',
    {
      slug: 'computer-network-explorer',
      title: 'Computer Network Explorer: map a network and investigate how information travels',
      description:
        'A network dossier that maps a network, designs its addressing, traces a web request across it and analyses its security.',
    },
    [
      ['Operating Systems, Kernels, System Calls and Processes', 'Process viewer · Python', 'Process Explorer', 'Opens the dossier with a host profile: the processes, states and system calls of the machine on the network.'],
      ['Threads, CPU Scheduling, Concurrency and Deadlocks', 'Scheduler simulator', 'Scheduler Simulator Lab', 'Adds scheduling results for the host, a race-condition demonstration and a deadlock analysis.'],
      ['Memory Management, Virtual Memory and File Systems', 'Python · paging lab', 'Paging Playground', 'Adds memory management results: address translation, page replacement and the file-system layout of the host.'],
      ['Networking Fundamentals, OSI and TCP/IP Models', 'Network map', 'Map My Network', 'Draws the network map with devices, links and the layer each device works at.'],
      ['IP Addressing, Subnetting, Routing, TCP and UDP', 'Subnet calculator', 'Subnet Designer', 'Adds an addressing plan, a routing table and a TCP versus UDP decision for each service.'],
      ['DNS, HTTP, HTTPS and Client-Server Communication', 'Browser developer tools', 'Follow the Request', 'Adds a traced web request from DNS lookup to the HTTPS response.'],
      ['Cybersecurity, Authentication, Authorisation and Cryptography', 'Python · JavaScript', 'Secure It: Passwords, Hashes and Ciphers', 'Adds the authentication, hashing and encryption design for the network’s services.'],
      ['Network Security, Threat Analysis and Basic Troubleshooting', 'Network map · checklists', 'Network Explorer Final Report', 'Completes the dossier with a threat model, firewall rules and a troubleshooting flowchart.'],
    ],
  ),
  course(
    7,
    'databases-web-technologies-and-software-engineering',
    'Databases, Web Technologies & Software Engineering',
    'SQL (SQLite) · HTML · CSS · JavaScript',
    'Design a database, query it with SQL, build a basic web interface and work like a software engineer',
    'Students understand how software is designed, how information is stored and how web applications work. They design a database with entity-relationship diagrams, normalise it, create and query it with SQL including joins, aggregation and transactions, learn how browsers and servers talk, build pages with HTML, CSS and JavaScript, and practise the software development life cycle, requirements, UML, Git, testing, debugging and code review. This is a foundation, not a copy of the Web Developer program. The Student Information Application grows lesson by lesson.',
    {
      slug: 'student-information-application',
      title: 'A database-backed student information application with a basic web interface',
      description:
        'A student information application: a designed and normalised database, SQL scripts and reports, and a web interface built with HTML, CSS and JavaScript.',
    },
    [
      ['Database Fundamentals, DBMS and Entity-Relationship Diagrams', 'ER diagram · SQL', 'SIA: Design the Data', 'Starts the application with an entity-relationship diagram of students, courses, teachers and enrolments.'],
      ['Relational Models, Keys, Constraints and Normalisation', 'SQL (SQLite)', 'SIA: The Relational Schema', 'Turns the diagram into normalised tables with keys and constraints.'],
      ['SQL: CRUD Operations, Queries and Filtering', 'SQL (SQLite)', 'SIA: Create and Query the Database', 'Creates the tables, loads sample data and writes the basic queries.'],
      ['SQL Joins, Aggregation and Transactions', 'SQL (SQLite)', 'SIA: Reports and Safe Enrolment', 'Adds join and aggregate reports and a safe enrolment transaction.'],
      ['How the Web Works: Browsers, Servers, HTML and CSS', 'HTML · CSS', 'SIA: The Student Directory Page', 'Builds the first page of the application with HTML and CSS.'],
      ['JavaScript Fundamentals, DOM Manipulation and APIs', 'JavaScript', 'SIA: Make It Interactive', 'Makes the page interactive: renders records from data, filters them and adds a student through a form.'],
      ['Software Development Life Cycle, Requirements and UML', 'UML · user stories', 'SIA: Requirements and Design', 'Writes the requirements and UML design for the application.'],
      ['Git, GitHub, Software Testing, Debugging and Code Review', 'Git · JavaScript tests', 'SIA: Test, Review and Ship', 'Tests, reviews and packages the finished application with its database script.'],
    ],
  ),
  course(
    8,
    'python-artificial-intelligence-and-modern-computing',
    'Python, Artificial Intelligence & Modern Computing',
    'Python',
    'Use Python to solve problems and explore data, then survey AI and the fields of modern computing',
    'Students learn Python, compare it with the languages they have met, and use it to implement algorithms and work with structured data. They then get an introductory, honest tour of artificial intelligence, machine learning, natural language processing, computer vision and generative AI, and of cloud computing, mobile development, robotics, IoT and distributed systems, and see how each connects back to the fundamentals of the program. The course closes with responsible computing, research skills, CSE specialisations and capstone planning. It does not try to teach specialist-level AI, data science, mobile or cloud development.',
    {
      slug: 'python-computational-project',
      title: 'A small Python-based computational application or data exploration project',
      description:
        'A small, finished Python program that solves a real problem or explores a data set, with tests, a short report and a plan for what to build next.',
    },
    [
      ['Introduction to Python and Comparing Programming Languages', 'Python', 'Same Task, Five Languages', 'Starts the project folder with a language comparison and a first Python utility.'],
      ['Python Data Types, Collections, Functions and Modules', 'Python', 'Student Records Toolkit', 'Adds a reusable module for records, statistics and reports.'],
      ['Python Problem-Solving Lab: Implementing Algorithms', 'Python', 'Algorithm Library with Tests', 'Adds tested search, sort, graph and memoised algorithms to the toolkit.'],
      ['Data Science Fundamentals and Working with Structured Data', 'Python', 'Exam Results Explorer', 'Adds loading, cleaning and summarising a structured data set.'],
      ['Artificial Intelligence and Machine Learning Fundamentals', 'Python', 'Tiny Classifier from Scratch', 'Adds a nearest-neighbour classifier with a train/test evaluation.'],
      ['Natural Language Processing, Computer Vision and Generative AI', 'Python', 'Text and Image Analysers', 'Adds a text analyser and an image-filter experiment, and a responsible-use note on generative AI.'],
      ['Exploring Cloud Computing, Mobile Development, Robotics, IoT and Distributed Systems', 'Python', 'IoT Sensor Pipeline Simulation', 'Adds a simulated sensor pipeline and a technology landscape map.'],
      ['Responsible Computing, Research, CSE Specialisations and Capstone Planning', 'Python', 'Capstone Plan and Final Project', 'Finishes the project with tests and a report, plus a study roadmap for the first CSE year.'],
    ],
  ),
];

export const PUCSE_LESSONS: PuLesson[] = PUCSE_COURSES.flatMap((c) => c.lessons);

export function puCourseBySlug(slug: string): PuCourse | undefined {
  return PUCSE_COURSES.find((c) => c.slug === slug);
}

/** `Lesson.order` (the session number) of teaching lesson `position` (1–8) of course `courseNumber` (1–8). */
export function sessionOfLesson(courseNumber: number, position: number): number {
  return (courseNumber - 1) * (PUCSE_LESSONS_PER_COURSE + 1) + position;
}

/** `Lesson.order` of the course assessment that closes course `courseNumber`. */
export function sessionOfCourseAssessment(courseNumber: number): number {
  return courseNumber * (PUCSE_LESSONS_PER_COURSE + 1);
}

/** The Final Assessment is the very last session. */
export const PUCSE_FINAL_SESSION = PUCSE_SESSIONS;

/** Title of a course's assessment session. */
export function courseAssessmentTitle(course: Pick<PuCourse, 'title'>): string {
  return `${course.title} — Course Assessment`;
}
