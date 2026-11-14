# Lumexa Mission Log: Operating Systems, Networking & Cybersecurity

**Course/Path:** Operating Systems, Networking & Cybersecurity
**Lesson:** 01 of 08
**Title:** Operating Systems, Kernels, System Calls and Processes
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** Process viewer · Python

---

## Mission Brief

You press a key, a letter appears, music keeps playing and a download carries on in the background. Yet your computer has only a handful of CPU cores and one set of memory chips. Something must decide who runs, who may touch the disk, who owns which part of the memory and what happens when a program misbehaves. That something is the **operating system**.

This lesson opens the course and the **Computer Network Explorer** dossier, the course project. You learn what an operating system does, why it keeps a protected **kernel** apart from ordinary programs, how programs ask the kernel for help through **system calls**, and what a **process** is and how it moves through its states. Then you write a Python tool that profiles a host: its process tree, its process states, its memory users and the system calls behind a simple command.

## Learning Objectives

1. Explain what an operating system is and name its main jobs: processes, memory, files, devices and protection.
2. Distinguish the kernel from user programs, and kernel mode from user mode.
3. Explain what a system call is and trace how a familiar function such as `print` reaches the kernel.
4. Distinguish a program from a process, and describe the contents of a process and of its process control block.
5. Describe the process states and the transitions between them, and explain a context switch.
6. Build a host profile in Python from a process table: process tree, state counts, memory users and a system-call trace.

## Prerequisites

- Courses 1 to 5: programming in C and Python, and how a CPU runs instructions (the fetch-decode-execute cycle and registers).
- Basic use of a computer: files, folders and running programs.

## Concept Explanation

### What an operating system does

An **operating system (OS)** is the software that manages the hardware and gives programs a safe, simple way to use it. Without it, every program would have to drive the disk, the screen and the network card itself, and one buggy program could crash the whole machine. The OS has five main jobs. It runs programs as **processes** and shares the CPU between them. It manages **memory**, giving each process its own space. It manages **storage** through files and folders. It talks to **devices** (keyboard, display, network card) through drivers. And it provides **protection and security**: one program may not read or damage the memory or files of another. Windows, macOS, Linux, Android and iOS are operating systems; so are the small real-time systems inside cars and routers.

### The kernel, user mode and system calls

The heart of the OS is the **kernel**, the part that always stays in memory and has full control of the hardware. The CPU supports at least two privilege levels. In **kernel mode** the code may execute every instruction and touch every device; in **user mode**, where ordinary programs run, it may not. A program that tries to read the disk directly is stopped by the CPU itself.

How, then, does a program save a file? It asks the kernel through a **system call**: a special instruction (for example `syscall` on x86-64) that switches the CPU into kernel mode and jumps to an entry point that the kernel chose in advance. The kernel checks the request, does the work, switches back to user mode and returns the result. Typical system calls on Linux are `open`, `read`, `write`, `close`, `fork`, `execve`, `wait`, `exit` and `socket`. The functions you use every day sit on top of them: `printf` in C and `print` in Python end in a `write` system call with the file number 1 (the screen), and `input` ends in a `read` with the file number 0 (the keyboard). A system call is much slower than an ordinary function call because the CPU changes mode twice, so libraries collect output in a buffer and make as few system calls as they can.

Kernels are built in different styles. A **monolithic** kernel (Linux) keeps the scheduler, the memory manager, the file systems and the drivers together in one large program in kernel mode; a **microkernel** keeps only the smallest core in kernel mode and runs the rest as separate user-mode services, which is safer but needs more switches.

### Programs and processes

A **program** is a file on the disk: instructions and data that do nothing by themselves. A **process** is a program that is *running*: the OS has loaded it into memory, given it a unique **process ID (PID)** and a share of the CPU. Two windows of the same editor are one program but two processes. The memory of a process has four parts: the **code** (the instructions), the **data** (global variables), the **heap** (memory that grows when the program calls `malloc` or creates objects) and the **stack** (function calls and local variables). For every process the kernel keeps a **process control block (PCB)**: its PID and its parent's PID, its state, the saved program counter and registers, its memory map and its list of open files.

### Process states and context switches

A process is always in one of five **states**. It is **new** while the OS creates it, **ready** when it could run but waits for a CPU, **running** while a CPU executes it, **waiting** (blocked) while it waits for an event such as a key press or a disk read, and **terminated** when it has finished. The allowed moves are: new to ready (the OS *admits* it), ready to running (the **scheduler** *dispatches* it), running to ready (its time slice is over, or it was *preempted*), running to waiting (it asks for I/O), waiting to ready (the I/O is complete) and running to terminated (it calls `exit`). A waiting process never goes straight to running: it must queue as ready first.

When the OS switches the CPU from one process to another, it performs a **context switch**: it saves the registers and the program counter of the old process into its PCB and loads those of the new one. The switch is pure overhead, so systems do not make it more often than they must, and it is how a single core can appear to run hundreds of programs at once.

New processes are made by copying. On Unix-like systems the system call `fork` creates a **child** process that is a copy of its **parent**, and `exec` replaces the child's program with a new one. This gives a **process tree**: the first process, `init` (PID 1, often `systemd` today), starts the services and the login shell, and the shell starts every command you type. When the computer starts, the firmware loads the **bootloader**, the bootloader loads the kernel, and the kernel starts PID 1.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Operating system** | Software that manages hardware and runs programs for users. |
| **Kernel** | The core of the OS that runs in kernel mode and controls the hardware. |
| **User mode / kernel mode** | The unprivileged level in which programs run / the privileged level of the kernel. |
| **System call** | A controlled request from a program to the kernel, such as `read` or `write`. |
| **Process** | A program that is running, with its own memory, PID and state. |
| **PID** | The unique number of a process. |
| **PCB (process control block)** | The kernel's record of a process: state, registers, memory map, open files. |
| **Process state** | New, ready, running, waiting or terminated. |
| **Context switch** | Saving one process's CPU state and loading another's. |
| **Scheduler** | The part of the kernel that chooses which ready process runs next. |
| **Shell** | A program that reads commands and starts other programs. |
| **Daemon (service)** | A process that runs in the background and waits for work. |

## Worked Examples

### Example 1: The life of two processes

```python
VALID = {
    "new": {"ready"},
    "ready": {"running"},
    "running": {"ready", "waiting", "terminated"},
    "waiting": {"ready"},
    "terminated": set(),
}


class Process:
    def __init__(self, pid, name):
        self.pid, self.name, self.state = pid, name, "new"

    def move(self, new_state):
        if new_state not in VALID[self.state]:
            raise ValueError(f"{self.name}: cannot go from {self.state} to {new_state}")
        self.state = new_state


editor, browser = Process(101, "editor"), Process(102, "browser")
# (tick, process, new state, reason)
EVENTS = [
    (0, editor, "ready", "admitted"),
    (0, browser, "ready", "admitted"),
    (1, editor, "running", "dispatched by the scheduler"),
    (2, editor, "waiting", "waits for a key press (I/O)"),
    (2, browser, "running", "dispatched"),
    (3, editor, "ready", "key pressed: the I/O is done"),
    (4, browser, "ready", "time slice over (preempted)"),
    (4, editor, "running", "dispatched"),
    (5, editor, "terminated", "exit()"),
]
for tick, process, state, reason in EVENTS:
    process.move(state)
    print(f"tick {tick}: {process.name:<8} -> {state:<10} {reason}")

try:
    editor.move("running")
except ValueError as error:
    print("error:", error)
```

```output
tick 0: editor   -> ready      admitted
tick 0: browser  -> ready      admitted
tick 1: editor   -> running    dispatched by the scheduler
tick 2: editor   -> waiting    waits for a key press (I/O)
tick 2: browser  -> running    dispatched
tick 3: editor   -> ready      key pressed: the I/O is done
tick 4: browser  -> ready      time slice over (preempted)
tick 4: editor   -> running    dispatched
tick 5: editor   -> terminated exit()
error: editor: cannot go from terminated to running
```

1. The dictionary `VALID` is the state diagram: for each state, the states that may follow it. `move` refuses every other transition.
2. The editor runs, then waits for a key press, and while it waits the scheduler gives the CPU to the browser. This is how I/O waiting lets other processes use the CPU.
3. The key press makes the editor *ready*, not running: it must wait until the browser is preempted at tick 4 and the scheduler dispatches it again.
4. A terminated process cannot run again, so the last `move` raises an error that the program catches and prints.

### Example 2: From a function call to a system call

```python
# What the runtime asks the kernel for when a program calls a familiar function.
SYSCALLS = {
    "open": ("open", "path, mode"),
    "read": ("read", "fd, buffer, count"),
    "print": ("write", "fd=1 (screen), text"),
    "close": ("close", "fd"),
    "exit": ("exit", "status"),
}
PROGRAM = ["open", "read", "print", "close", "exit"]      # a tiny program that shows a file

print("step  user program  kernel entry                     mode switches so far")
switches = 0
for step, call in enumerate(PROGRAM, start=1):
    name, arguments = SYSCALLS[call]
    switches += 1 if name == "exit" else 2             # user -> kernel and back (exit never returns)
    print(f"{step:>4}  {call:<13}  {name + '(' + arguments + ')':<30}  {switches}")
print("total mode switches:", switches)
```

```output
step  user program  kernel entry                     mode switches so far
   1  open           open(path, mode)                2
   2  read           read(fd, buffer, count)         4
   3  print          write(fd=1 (screen), text)      6
   4  close          close(fd)                       8
   5  exit           exit(status)                    9
total mode switches: 9
```

1. Each step of the program is a familiar operation; the dictionary shows the system call that the runtime really makes. `print` becomes `write` on file number 1.
2. Every system call costs two mode switches: from user mode into the kernel and back again.
3. `exit` is special: the process ends inside the kernel and never returns to user mode, so it costs only one switch. The program makes 9 mode switches in all.
4. This is why a program that prints one character at a time is slow: each `print` that is not buffered costs two mode switches.

### Example 3: A process tree made by fork

```python
class Kernel:
    def __init__(self):
        self.next_pid = 1
        self.table = {}                          # pid -> (parent pid, name)

    def fork(self, parent_pid, name):
        """Create a child of parent_pid; the parent receives the child's new PID."""
        pid = self.next_pid
        self.next_pid += 1
        self.table[pid] = (parent_pid, name)
        return pid

    def show(self, pid=1, depth=0):
        print("  " * depth + f"{pid} {self.table[pid][1]}")
        for child, (parent, _) in sorted(self.table.items()):
            if parent == pid:
                self.show(child, depth + 1)


kernel = Kernel()
init = kernel.fork(0, "init")                    # the first process has no parent
shell = kernel.fork(init, "shell")
logger = kernel.fork(init, "logger")
editor = kernel.fork(shell, "editor")
compiler = kernel.fork(shell, "compiler")
kernel.fork(compiler, "assembler")
kernel.show()
```

```output
1 init
  2 shell
    4 editor
    5 compiler
      6 assembler
  3 logger
```

1. PIDs are handed out in order, so the first process is 1 (`init`), the shell is 2 and the logger is 3.
2. Every process except `init` has a parent: the shell started the editor and the compiler, and the compiler started the assembler.
3. `show` walks the table recursively and indents each level, which draws the process tree like the `pstree` command.
4. If a parent exits before its children, the OS gives the children to `init` so that every process always has a parent.

## Common Mistakes and Misconceptions

- **Confusing a program with a process.** A program is a file; a process is a running instance. One program can be several processes.
- **Thinking that the shell or the window system *is* the operating system.** They are programs that run on top of the kernel.
- **Believing that a running program can use the hardware directly.** In user mode it must ask the kernel through system calls.
- **Thinking that "running" means using the CPU all the time.** On one core only one process is running; the others are ready or waiting, and the scheduler rotates them quickly.
- **Moving a process from waiting straight to running.** It becomes ready first and waits its turn.
- **Treating a system call like an ordinary function call.** It crosses into the kernel and back, which is much slower.
- **Assuming that closing a window always ends the process.** Some programs keep running in the background; the process list shows the truth.
- **Calling the kernel "the whole OS".** The OS also includes system libraries, drivers, shells and tools around the kernel.

## Guided Hands-On Activity

**Meet the processes.** Work with your teacher.

1. Run Example 1 and predict the final state of the browser before you look at the output.
2. Add one more event at the end of Example 1 that moves the editor from `waiting` to `running`. Which error does the program print? Why is the move illegal?
3. In Example 2 add `"input"` to the dictionary (the system call is `read` on file number 0) and to the program. How many mode switches does the program need now?
4. Run Example 3 and draw the process tree on paper. Add a child `backup` under `logger` and predict its PID before you run it.
5. On your own computer, open the Task Manager (Windows), Activity Monitor (macOS) or run `ps` or `top` (Linux). Find three processes and note their PID, their state or CPU use, and their memory.

## Lesson Project: Process Explorer

### Objective

Write a **host profiler** in Python: from a table of the processes of a computer on the network, it prints the process tree, counts the processes in each state, lists the biggest memory users and shows the system calls behind the command `cat notes.txt`. This is the first page of your **Computer Network Explorer** dossier.

### Requirements

- Keep the host data in a dictionary (name, operating system, total memory in KB) and the processes in a list of tuples: PID, parent PID, name, state, memory in KB and CPU time in ms.
- Print the **process tree** with indentation, showing the state of each process.
- Print the **number of processes per state** for running, ready, waiting and terminated.
- Print the **three biggest memory users** with PID and memory (use `sorted` with a `key`).
- Print the **system calls** of `cat notes.txt` (open, read, write, close, exit) with a running count of the mode switches (2 for each call, but only 1 for `exit`).
- End with a **summary line**: host name, number of processes, memory used in KB, total memory and the percentage.
- In the dossier, add a short note: which process would you investigate first on a slow computer, and why?

### Instructions

1. Write the host dictionary and the process list with nine processes (use the data of the expected output).
2. Write a recursive function `show_tree(parent, depth)`.
3. Count the states with a dictionary.
4. Sort the processes by memory and print the first three.
5. Write the trace of the five system calls and count the mode switches.
6. Compute the total memory used and print the summary line.
7. Compare with the expected output and write your note.

### Expected Output

```text
Host profile: lab-pc-07 (Linux)

Process tree
1 init (waiting)
  2 sshd (waiting)
  3 cron (waiting)
  4 shell (waiting)
    5 editor (running)
    6 browser (ready)
    7 python (ready)
    9 old-job (terminated)
  8 backup (waiting)

Processes per state
  running    1
  ready      2
  waiting    5
  terminated 1

Three biggest memory users
  browser  pid 6  312,500 KB
  editor   pid 5   41,200 KB
  python   pid 7   22,800 KB

System calls of: cat notes.txt
  1. open   notes.txt            mode switches so far: 2
  2. read   fd 3                 mode switches so far: 4
  3. write  fd 1 (the screen)    mode switches so far: 6
  4. close  fd 3                 mode switches so far: 8
  5. exit   status 0             mode switches so far: 9

lab-pc-07: 9 processes use 414,600 KB of 8,192,000 KB (5.1%)
```

### Hints

1. **Hint 1 (the tree).** A function that prints one process and then calls itself for every process whose parent is that PID. Start with parent 0, the parent of `init`.
2. **Hint 2 (the indent).** `'  ' * depth` gives two spaces for each level.
3. **Hint 3 (counting).** `states[state] = states.get(state, 0) + 1` counts without an error for the first one.
4. **Hint 4 (the biggest).** `sorted(PROCESSES, key=lambda p: p[4], reverse=True)[:3]`.
5. **Hint 5 (the numbers).** `f"{memory:,}"` writes 312500 as 312,500, and `f"{used / total:.1%}"` writes a fraction as a percentage.
6. **Hint 6 (exit).** `exit` never returns to user mode, so it adds only one mode switch.

### Success Criteria

- [ ] The process tree shows nine processes with the correct parents and indentation.
- [ ] The state counts are 1 running, 2 ready, 5 waiting and 1 terminated.
- [ ] The three biggest memory users are the browser, the editor and python.
- [ ] The system-call trace ends with 9 mode switches.
- [ ] The summary line reports 414,600 KB of 8,192,000 KB (5.1%).
- [ ] The dossier note names a process and gives a reason.

### Extension Challenge

Add a function `kill(pid)` that moves a process to `terminated` and gives its children to `init` (PID 1), then show the tree again after killing the shell (PID 4). Next, add a CPU-time column to the report and print the process that has used the most CPU time. Finally, find out what the Linux command `strace` does, and describe in two sentences how you could use it to produce a trace like the one in this project.

## Lesson Recap

- An **operating system** runs programs, shares the CPU and memory, manages files and devices and protects programs from each other.
- The **kernel** runs in **kernel mode**; programs run in **user mode** and ask for services through **system calls**.
- A **process** is a running program with its own memory, PID and **PCB**; its **state** is new, ready, running, waiting or terminated.
- The scheduler dispatches ready processes, and a **context switch** saves and restores the CPU state.
- New processes are created with **fork** and form a **process tree** under `init`.

## Homework / Extension Mission

On your own computer, find out how many processes are running right now and which one uses the most memory. Draw the state diagram from memory, with all five states and the six transitions, and write one sentence for each transition. Then write a short paragraph, in your own words, that explains why a program cannot simply write to the disk by itself and what the system call adds. If you have a Linux computer or a Linux terminal, run `ps -ef` and describe the first five lines.

## Course Project Connection

This lesson opens the **Computer Network Explorer**, the course project: a dossier that grows lesson by lesson until it maps a network and analyses how information travels and how it is protected. Every machine on a network is a host that runs an operating system, so the first page is a **host profile**: its processes, their states and the system calls behind a simple command. In Lesson 2 you add scheduling results for the host, in Lesson 3 its memory results, and from Lesson 4 you connect the hosts into a network.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: "who is in charge?" (ask what happens when two programs want the same disk); 15 minutes: kernel, user mode and system calls (the sequence diagram); 15 minutes: process states (students act out the state diagram with name cards); 20 minutes: the project.

**Live demonstrations.** Open the Task Manager or `top` and find a process by PID. On Linux show `pstree` and `strace echo hello` (look for the `write` call). Show that a process in the waiting state uses no CPU.

**Misconceptions.** "The OS is the desktop." "A program and a process are the same." "A process always uses the CPU." "System calls are normal functions."

**Assessment of the project.** Check the tree (parents and indentation), the state counts, the three memory users, the mode-switch count of 9 and the summary line. Ask students why `exit` costs one switch and `read` two.

**Reference solution `process_explorer.py`** (run with `python3 process_explorer.py`):

```python
"""Process Explorer: a host profile with a process tree, state counts and a system-call trace."""

HOST = {"name": "lab-pc-07", "os": "Linux", "memory_kb": 8_192_000}

# pid, parent pid, name, state, memory in KB, CPU time in ms
PROCESSES = [
    (1, 0, "init", "waiting", 5_600, 120),
    (2, 1, "sshd", "waiting", 8_200, 45),
    (3, 1, "cron", "waiting", 3_100, 20),
    (4, 1, "shell", "waiting", 6_400, 310),
    (5, 4, "editor", "running", 41_200, 1_850),
    (6, 4, "browser", "ready", 312_500, 9_420),
    (7, 4, "python", "ready", 22_800, 640),
    (8, 1, "backup", "waiting", 14_800, 2_210),
    (9, 4, "old-job", "terminated", 0, 80),
]


def show_tree(parent=0, depth=0):
    for pid, ppid, name, state, memory, _ in PROCESSES:
        if ppid == parent:
            print(f"{'  ' * depth}{pid} {name} ({state})")
            show_tree(pid, depth + 1)


print(f"Host profile: {HOST['name']} ({HOST['os']})")
print("\nProcess tree")
show_tree()

print("\nProcesses per state")
states = {}
for _, _, _, state, _, _ in PROCESSES:
    states[state] = states.get(state, 0) + 1
for state in ("running", "ready", "waiting", "terminated"):
    print(f"  {state:<10} {states.get(state, 0)}")

print("\nThree biggest memory users")
for pid, _, name, _, memory, _ in sorted(PROCESSES, key=lambda p: p[4], reverse=True)[:3]:
    print(f"  {name:<8} pid {pid}  {memory:>7,} KB")

# the system calls behind the shell command  cat notes.txt
TRACE = [("open", "notes.txt"), ("read", "fd 3"), ("write", "fd 1 (the screen)"), ("close", "fd 3"), ("exit", "status 0")]
print("\nSystem calls of: cat notes.txt")
switches = 0
for number, (name, argument) in enumerate(TRACE, start=1):
    switches += 1 if name == "exit" else 2          # exit() never returns to user mode
    print(f"  {number}. {name:<6} {argument:<20} mode switches so far: {switches}")

used = sum(p[4] for p in PROCESSES)
print(f"\n{HOST['name']}: {len(PROCESSES)} processes use {used:,} KB of {HOST['memory_kb']:,} KB ({used / HOST['memory_kb']:.1%})")
```

```output
Host profile: lab-pc-07 (Linux)

Process tree
1 init (waiting)
  2 sshd (waiting)
  3 cron (waiting)
  4 shell (waiting)
    5 editor (running)
    6 browser (ready)
    7 python (ready)
    9 old-job (terminated)
  8 backup (waiting)

Processes per state
  running    1
  ready      2
  waiting    5
  terminated 1

Three biggest memory users
  browser  pid 6  312,500 KB
  editor   pid 5   41,200 KB
  python   pid 7   22,800 KB

System calls of: cat notes.txt
  1. open   notes.txt            mode switches so far: 2
  2. read   fd 3                 mode switches so far: 4
  3. write  fd 1 (the screen)    mode switches so far: 6
  4. close  fd 3                 mode switches so far: 8
  5. exit   status 0             mode switches so far: 9

lab-pc-07: 9 processes use 414,600 KB of 8,192,000 KB (5.1%)
```

**Differentiation.** Support: provide the host data and the `show_tree` function so that students only write the counting, sorting and trace parts. Stretch: the `kill` function with re-parenting, a CPU-time report and a simulation of `fork` that returns 0 in the child.

**Discussion questions (not for the student quiz).** Why does the kernel check every system-call argument, even though the call comes from a program on the same computer? What would go wrong if any program could switch itself into kernel mode? Why is a microkernel safer, and why is it often slower?
