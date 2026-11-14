# Lumexa Mission Log: Operating Systems, Networking & Cybersecurity

**Course/Path:** Operating Systems, Networking & Cybersecurity
**Lesson:** 02 of 08
**Title:** Threads, CPU Scheduling, Concurrency and Deadlocks
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Scheduler simulator · Python

---

## Mission Brief

A computer with four cores may be running three hundred processes. A web browser downloads a file, draws a page and plays a video at the same time. Somebody has to decide *who* gets the CPU *when*, and when several of them use the same data, somebody has to prevent them from corrupting it. Worst of all, programs that wait for each other can freeze forever.

In this lesson you study **threads**, the **scheduling algorithms** that share the CPU, the **race conditions** that appear when threads share data, and **deadlocks**. You will not just read about them: you write the schedulers, replay a race condition step by step and detect a deadlock with a small graph algorithm, and you add the results to the **Computer Network Explorer** dossier.

## Learning Objectives

1. Explain what a thread is and how threads differ from processes, and distinguish concurrency from parallelism.
2. Compute waiting time, turnaround time and response time for a schedule.
3. Compare FCFS, SJF and round-robin scheduling and say when each is suitable.
4. Explain a race condition and show how a lock (mutual exclusion) prevents it.
5. State the four conditions of a deadlock and detect a deadlock in a wait-for graph.
6. Build a simulator that schedules a workload, demonstrates a race condition and analyses a deadlock.

## Prerequisites

- Lesson 1: processes, states, the scheduler and context switches.
- Python from the earlier courses: functions, lists, dictionaries and loops.

## Concept Explanation

### Threads

A **thread** is a path of execution inside a process. A process may have several threads; they **share** the code, the global data and the heap of the process, but each has its **own stack** and its own saved registers and program counter. A word processor, for example, can use one thread for typing, one for the spell checker and one for saving. Threads are cheaper than processes: creating one is faster and switching between threads of the same process does not change the memory map. The price is that they all see the same data, so a bug in one thread can damage the others.

Two words are easy to confuse. **Concurrency** means that several tasks are *in progress* at the same time, even if a single core switches between them quickly. **Parallelism** means that several tasks are *executing at the same instant*, which needs several cores. A single-core computer can be concurrent but not parallel.

### CPU scheduling

When more processes are ready than there are CPUs, the **scheduler** decides who runs next. For each process it measures: the **burst time** (how long it needs the CPU), the **waiting time** (time spent in the ready queue), the **turnaround time** (from arrival to finish, which is waiting plus burst) and the **response time** (from arrival until it first runs). A scheduler may be **non-preemptive** (a process keeps the CPU until it finishes or waits) or **preemptive** (the OS may take the CPU away).

- **FCFS** (first come, first served) runs processes in order of arrival. It is simple and fair in the order sense, but one long job makes everyone behind it wait (the **convoy effect**).
- **SJF** (shortest job first) runs the shortest ready process next. It gives the smallest possible average waiting time, but it must know the burst times in advance and long jobs may **starve**. Its preemptive version is SRTF (shortest remaining time first).
- **Round robin (RR)** gives each process a small slice of time, the **quantum**, then moves it to the back of the queue. Every process gets the CPU quickly, which suits interactive systems, but average turnaround is worse and a very small quantum wastes time on context switches.
- **Priority scheduling** runs the most important process first; **aging** raises the priority of processes that have waited long, to prevent starvation.

### Concurrency problems: race conditions and locks

When threads share data, the result can depend on the exact order in which their steps interleave: a **race condition**. The classic example is `counter = counter + 1`. It looks like one step, but the CPU does three: **load** the counter into a register, **add** 1, **store** the register back. If two threads both load 5 before either stores, both compute 6 and store 6: one increment is *lost*, and the final value is wrong. The part of a program that touches shared data is its **critical section**. The cure is **mutual exclusion**: a **lock** (mutex) that only one thread can hold at a time, so the three steps of an increment can never be interleaved with another thread's. Semaphores and monitors are more general versions of the same idea.

### Deadlock

Locks solve one problem and create another. A **deadlock** is a state in which every thread of a group waits for a resource that another thread of the group holds, so none of them can ever continue. It needs four conditions at once (the **Coffman conditions**): **mutual exclusion** (a resource is held by one thread at a time), **hold and wait** (a thread holds a resource while it waits for another), **no preemption** (a resource cannot be taken away) and **circular wait** (a cycle of threads each waiting for the next). The OS can draw a **wait-for graph**, with an arrow from each thread to the thread whose lock it needs: a cycle means deadlock. Ways to deal with it are **prevention** (break one condition, for example make every thread take locks in the same global order, which removes circular waits), **avoidance** (refuse requests that could lead to deadlock, as in the banker's algorithm), **detection and recovery** (find the cycle and kill or roll back a thread) and, in practice for many systems, simply ignoring it. A deadlock is not the same as **starvation**, where a thread waits for a very long time but could in principle continue.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Thread** | A path of execution inside a process; threads share the process's memory but have their own stacks. |
| **Concurrency / parallelism** | Tasks in progress at the same time / tasks executing at the same instant. |
| **Burst time** | The time a process needs on the CPU. |
| **Waiting, turnaround, response time** | Time in the ready queue / from arrival to finish / from arrival to first run. |
| **Preemption** | Taking the CPU away from a running process. |
| **Quantum** | The time slice of a round-robin scheduler. |
| **Race condition** | A bug in which the result depends on the order in which threads' steps interleave. |
| **Critical section** | The part of a program that uses shared data and must not run in two threads at once. |
| **Mutex (lock)** | A lock that only one thread can hold at a time. |
| **Deadlock** | A cycle of threads that each wait for a resource held by the next. |
| **Starvation** | A process that is never, or only very rarely, given what it needs. |

## Worked Examples

### Example 1: Three schedulers

```python
PROCESSES = [("P1", 0, 8), ("P2", 1, 4), ("P3", 2, 9), ("P4", 3, 5)]      # name, arrival time, burst time


def fcfs(processes):
    """First come, first served: run each process to the end in order of arrival."""
    time, chart = 0, []
    for name, arrival, burst in sorted(processes, key=lambda p: p[1]):
        time = max(time, arrival)
        chart.append((name, time, time + burst))
        time += burst
    return chart


def sjf(processes):
    """Shortest job first (non-preemptive): when the CPU is free, run the shortest process that has arrived."""
    waiting, time, chart = list(processes), 0, []
    while waiting:
        ready = [p for p in waiting if p[1] <= time] or [min(waiting, key=lambda p: p[1])]
        job = min(ready, key=lambda p: (p[2], p[1]))
        time = max(time, job[1])
        chart.append((job[0], time, time + job[2]))
        time += job[2]
        waiting.remove(job)
    return chart


def round_robin(processes, quantum):
    """Each process runs for at most one quantum, then goes to the back of the queue."""
    remaining = {name: burst for name, _, burst in processes}
    pending = sorted(processes, key=lambda p: p[1])
    queue, time, chart = [], 0, []
    while pending or queue:
        while pending and pending[0][1] <= time:
            queue.append(pending.pop(0)[0])
        if not queue:                                   # the CPU is idle until the next arrival
            time = pending[0][1]
            continue
        name = queue.pop(0)
        run = min(quantum, remaining[name])
        chart.append((name, time, time + run))
        time += run
        remaining[name] -= run
        while pending and pending[0][1] <= time:        # new arrivals queue up before the preempted process
            queue.append(pending.pop(0)[0])
        if remaining[name]:
            queue.append(name)
    return chart


def report(title, chart, processes):
    finish = {name: end for name, _, end in chart}      # the last segment of a process ends at its finish time
    first = {}
    for name, start, _ in chart:
        first.setdefault(name, start)                   # the first time the process gets the CPU
    print(title)
    print("  chart:", " ".join(f"{name}[{start}-{end}]" for name, start, end in chart))
    waits, turns, responses = [], [], []
    for name, arrival, burst in processes:
        turnaround = finish[name] - arrival             # from arrival until it is finished
        waits.append(turnaround - burst)                # the part of that time spent not running
        turns.append(turnaround)
        responses.append(first[name] - arrival)         # how long until it first runs
        print(f"  {name}: waiting {waits[-1]:>2}, turnaround {turns[-1]:>2}, response {responses[-1]:>2}")
    n = len(processes)
    print(f"  average waiting {sum(waits) / n:.2f}, turnaround {sum(turns) / n:.2f}, response {sum(responses) / n:.2f}\n")


report("FCFS", fcfs(PROCESSES), PROCESSES)
report("SJF (non-preemptive)", sjf(PROCESSES), PROCESSES)
report("Round robin, quantum 3", round_robin(PROCESSES, 3), PROCESSES)
```

```output
FCFS
  chart: P1[0-8] P2[8-12] P3[12-21] P4[21-26]
  P1: waiting  0, turnaround  8, response  0
  P2: waiting  7, turnaround 11, response  7
  P3: waiting 10, turnaround 19, response 10
  P4: waiting 18, turnaround 23, response 18
  average waiting 8.75, turnaround 15.25, response 8.75

SJF (non-preemptive)
  chart: P1[0-8] P2[8-12] P4[12-17] P3[17-26]
  P1: waiting  0, turnaround  8, response  0
  P2: waiting  7, turnaround 11, response  7
  P3: waiting 15, turnaround 24, response 15
  P4: waiting  9, turnaround 14, response  9
  average waiting 7.75, turnaround 14.25, response 7.75

Round robin, quantum 3
  chart: P1[0-3] P2[3-6] P3[6-9] P4[9-12] P1[12-15] P2[15-16] P3[16-19] P4[19-21] P1[21-23] P3[23-26]
  P1: waiting 15, turnaround 23, response  0
  P2: waiting 11, turnaround 15, response  2
  P3: waiting 15, turnaround 24, response  4
  P4: waiting 13, turnaround 18, response  6
  average waiting 13.50, turnaround 20.00, response 3.00
```

1. Every scheduler returns a **Gantt chart**: a list of (process, start, end) segments. The metrics are computed in one place, `report`: turnaround = finish − arrival, waiting = turnaround − burst, response = first start − arrival.
2. **FCFS** runs P1 for 8 units while the others wait; the average waiting time is 8.75. **SJF** lets the short jobs P2 and P4 jump ahead of P3 and lowers it to 7.75, the best average possible for this workload.
3. **Round robin** slices the CPU every 3 units. Its average waiting time (13.50) and turnaround (20.00) are the worst, because every process is interrupted again and again, but its average **response** time is only 3.00 against 8.75 for FCFS: every process starts quickly.
4. There is no "best" scheduler, only a best one for a goal: SJF for throughput, round robin for interactive systems.

### Example 2: A race condition, replayed

```python
def run_threads(increments, use_lock, seed):
    """Two threads each add 1 to a shared counter `increments` times.
    One increment is three steps: load the counter, add 1, store it back.
    A pseudo-random scheduler decides which thread runs the next step."""
    counter, owner = 0, None
    threads = [{"step": 0, "reg": 0, "left": increments} for _ in range(2)]
    state = seed
    while any(t["left"] for t in threads):
        state = (state * 1103515245 + 12345) % 2**31               # a repeatable "random" number
        can_run = [i for i, t in enumerate(threads)
                   if t["left"] and (not use_lock or t["step"] > 0 or owner is None)]
        i = can_run[(state >> 16) % len(can_run)]
        t = threads[i]
        if t["step"] == 0:
            t["reg"] = counter                                     # load
            owner = i if use_lock else None                        # take the lock
        elif t["step"] == 1:
            t["reg"] += 1                                          # add
        else:
            counter = t["reg"]                                     # store
            t["left"] -= 1
            owner = None                                           # release the lock
        t["step"] = (t["step"] + 1) % 3
    return counter


print("two threads, 10 increments each: the right answer is 20")
print("seed  without a lock  with a lock")
for seed in range(1, 7):
    print(f"{seed:>4}  {run_threads(10, False, seed):>14}  {run_threads(10, True, seed):>9}")
```

```output
two threads, 10 increments each: the right answer is 20
seed  without a lock  with a lock
   1              11         20
   2              10         20
   3              15         20
   4              12         20
   5              13         20
   6              10         20
```

1. Each increment is split into the three steps *load*, *add* and *store*, and a scheduler with a repeatable pseudo-random choice decides which thread runs the next step. Different seeds are different interleavings.
2. Without a lock the final counter is never 20: it is between 10 and 15 in these runs. Whenever both threads load the same value, one increment is lost.
3. With a lock, a thread that starts an increment holds the lock until its store is finished, so the other thread cannot interleave: the answer is 20 for every seed.
4. The bug is worse than it looks: for another seed, or on another day, the result changes. Races are hard to find by testing, so they must be prevented by design.

### Example 3: Detecting a deadlock

```python
def wait_for_graph(owner, wants):
    """owner[lock] = thread that holds it; wants[thread] = lock it is waiting for.
    Returns {thread: the thread it is waiting for}."""
    return {t: owner[lock] for t, lock in wants.items() if lock in owner and owner[lock] != t}


def find_cycle(wait_for):
    """Follow the 'is waiting for' arrows; a cycle means that nobody can ever continue."""
    for start in wait_for:
        path, node = [], start
        while node is not None and node not in path:
            path.append(node)
            node = wait_for.get(node)
        if node is not None:
            return path[path.index(node):] + [node]
    return None


SCENARIOS = {
    "two threads, opposite lock order": ({"A": "T1", "B": "T2"}, {"T1": "B", "T2": "A"}),
    "three threads in a circle": ({"A": "T1", "B": "T2", "C": "T3"}, {"T1": "B", "T2": "C", "T3": "A"}),
    "everybody locks in the order A, B, C": ({"A": "T1", "B": "T2"}, {"T1": "B", "T2": "C", "T3": "A"}),
}
for name, (owner, wants) in SCENARIOS.items():
    cycle = find_cycle(wait_for_graph(owner, wants))
    print(f"{name}:")
    print("   ", "DEADLOCK " + " -> ".join(cycle) if cycle else "no deadlock: someone can always continue")
```

```output
two threads, opposite lock order:
    DEADLOCK T1 -> T2 -> T1
three threads in a circle:
    DEADLOCK T1 -> T2 -> T3 -> T1
everybody locks in the order A, B, C:
    no deadlock: someone can always continue
```

1. `wait_for_graph` turns "who owns which lock" and "who wants which lock" into the wait-for graph: thread T waits for the thread that owns the lock T wants.
2. `find_cycle` follows the arrows from every thread. If the path returns to a thread it has already visited, that part of the path is the cycle: T1 waits for T2, T2 for T1, and neither can ever continue.
3. In the third scenario every thread follows the same lock order (A before B before C). T2 wants C, which nobody holds, so it can finish and release B, then T1 gets B and finishes, then T3 gets A: **no circular wait is possible**.
4. A global lock order is the simplest and most common way to prevent deadlock in real programs.

## Common Mistakes and Misconceptions

- **Confusing concurrency with parallelism.** Concurrency is about structure (many tasks in progress); parallelism needs several cores.
- **Thinking that threads have separate memory.** They share the memory of their process, which is why they need locks and why one bad thread can corrupt the others.
- **Believing that `counter += 1` is a single step.** It is a load, an add and a store, and another thread can run in between.
- **Forgetting that waiting time excludes the burst.** Turnaround = waiting + burst, and response time is not the same as waiting time.
- **Assuming that the shortest-job-first average is always achievable.** It needs to know the burst times in advance, which a real OS rarely does.
- **Making the round-robin quantum too small or too large.** Too small wastes time on context switches; too large turns round robin into FCFS.
- **Locking too much.** A lock around everything removes the benefit of threads; a lock that is taken in different orders by different threads can deadlock.
- **Mixing up deadlock and starvation.** In a deadlock nobody in the cycle can ever continue; in starvation somebody could, but is always passed over.

## Guided Hands-On Activity

**Schedule, break and fix.** Work with your teacher.

1. Open the scheduler simulator under Example 1 and run FCFS, SJF and round robin for the four processes. Compare the Gantt charts with the output of Example 1.
2. In Example 1 change the quantum from 3 to 6 and then to 1. What happens to the average response time and the number of chart segments?
3. In Example 1 add a fifth process `("P5", 4, 1)`. Which scheduler gives it the best waiting time? Why?
4. In Example 2 change `increments` to 100 and run the unlocked version. Is it ever correct? What does this say about testing for races?
5. In Example 3 add a scenario with four threads in a circle and check that the cycle is found. Then change one `wants` entry so that the circle breaks.
6. Say, for each of the four Coffman conditions, how the global lock order of scenario 3 removes or avoids it.

## Lesson Project: Scheduler Simulator Lab

### Objective

Write a **scheduler simulator** for the workload of the host in your dossier: compare FCFS, SJF and round robin, demonstrate a race condition with and without a lock, and analyse a deadlock between three threads before and after a lock-ordering fix. This adds the scheduling page to your **Computer Network Explorer** dossier.

### Requirements

- Use the workload ("editor", arrival 0, burst 5), ("browser", 1, 3), ("python", 2, 8), ("backup", 3, 6) and ("shell", 4, 2).
- Implement `fcfs`, `sjf` and `round_robin` (quantum 3) and print one line for each with the average waiting, turnaround and response time. Then print which algorithm has the best average waiting time and which has the best response time.
- Reuse `run_threads` to print the final counter for the seeds 1 to 5 (10 increments per thread), without and with the lock.
- Analyse this deadlock: the *editor* holds `notes.txt` and wants `database`; the *backup* job holds `database` and wants `network`; *python* holds `network` and wants `notes.txt`. Print the cycle. Then apply the lock-ordering fix (nobody may hold a later lock while waiting for an earlier one in the order `notes.txt`, `database`, `network`): *python* releases `network` and waits only for `notes.txt`. Print the result.
- In the dossier, write one recommendation: which scheduler would you choose for this host, and why?

### Instructions

1. Copy the three scheduler functions from Example 1 and write a small function that returns the three averages.
2. Run the three schedulers on the host workload and print the table.
3. Pick the best algorithms with `min(..., key=...)`.
4. Copy `run_threads` from Example 2 and print the five seeds.
5. Model the deadlock with `owner` and `wants` dictionaries, find the cycle and print it.
6. Change the scenario to the fixed version and run the detection again.
7. Compare your output with the expected output and write the recommendation.

### Expected Output

```text
Scheduling the host workload
algorithm           waiting  turnaround  response
FCFS                  8.20       13.00      8.20
SJF                   5.60       10.40      5.60
Round robin (q=3)     9.60       14.40      4.40
best average waiting time: SJF
best response time: Round robin (q=3)

Race condition: two threads, 10 increments each (right answer 20)
seed  without lock  with lock
   1            11         20
   2            10         20
   3            15         20
   4            12         20
   5            13         20

Deadlock analysis
  before: DEADLOCK editor -> backup -> python -> editor
  after the lock-order fix: no deadlock
```

### Hints

1. **Hint 1 (the averages).** Return `(sum(waits) / n, sum(turns) / n, sum(responses) / n)` from the same loop as in `report`.
2. **Hint 2 (the best).** `min(results, key=lambda name: results[name][0])` gives the name with the smallest average waiting time.
3. **Hint 3 (the table).** `f"{name:<18}{waiting:>8.2f}{turnaround:>12.2f}{response:>10.2f}"` aligns the columns.
4. **Hint 4 (the lock).** `run_threads(10, True, seed)` is the locked version; it must print 20 for every seed.
5. **Hint 5 (the deadlock).** `owner` maps a lock to the thread that holds it; `wants` maps a thread to the lock it waits for.
6. **Hint 6 (the fix).** In the fixed scenario *python* no longer owns `network`, so remove it from `owner` and make *python* want `notes.txt` only.

### Success Criteria

- [ ] The table shows the three algorithms with their averages, and SJF has the best waiting time while round robin has the best response time.
- [ ] The race demonstration prints five seeds; the locked results are all 20 and the unlocked ones are all lower.
- [ ] The first deadlock analysis prints the cycle editor -> backup -> python -> editor.
- [ ] The fixed scenario reports no deadlock.
- [ ] The dossier contains a one-paragraph scheduler recommendation with a reason.
- [ ] The program runs without errors and its output matches the expected output.

### Extension Challenge

Add a fourth scheduler, **SRTF** (shortest remaining time first, preemptive), and compare its averages with SJF. Then add **priority scheduling with aging** and show on a workload with one low-priority job that the job starves without aging and finishes with it. Finally, extend `find_cycle` so that it also works when a thread can wait for several threads.

## Lesson Recap

- A **thread** is a path of execution inside a process; threads share memory, so they are cheap but need care. **Concurrency** is many tasks in progress; **parallelism** is many executing at once.
- Schedulers are judged by **waiting**, **turnaround** and **response** time: SJF minimises the average waiting time, round robin gives quick responses.
- A **race condition** happens when threads interleave the load, add and store of a shared update; a **lock** makes the critical section mutually exclusive.
- A **deadlock** needs mutual exclusion, hold and wait, no preemption and circular wait; a cycle in the **wait-for graph** reveals it, and a global lock order prevents it.

## Homework / Extension Mission

Choose a real situation that is like a scheduler or a deadlock (traffic at a four-way junction with no signal, a single printer in a lab, two people who each hold one of two pens and need both) and explain it with the vocabulary of this lesson: which are the resources, which condition is present and what would be a fair rule. Then compute by hand the FCFS and SJF average waiting times for the workload (A, 0, 6), (B, 1, 2), (C, 2, 4) and check them with Example 1. Finally write five lines of pseudocode for a thread that safely increments a shared counter with a lock.

## Course Project Connection

This lesson adds the **scheduling page** to the **Computer Network Explorer**, the course project: the processes on the host profile from Lesson 1 are the workload, and you recommend how the host should schedule them. The race-condition demonstration and the deadlock analysis also matter later, because every server on a network handles many requests with many threads. In Lesson 3 you add the memory results of the host, and from Lesson 4 the hosts are connected into a network.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: threads and the shared memory picture; 15 minutes: scheduling (students draw the Gantt charts of Example 1 by hand before running it); 10 minutes: the race condition (act it out with two students and a counter on the board); 10 minutes: deadlock (act it out with two students and two pens); 15 minutes: the project.

**Live demonstrations.** Run the scheduler simulator with the same processes and switch the algorithm. Act out the race: two students read the counter from the board, add 1 in their heads, then write it back. Draw the wait-for cycle for the classic two-lock deadlock.

**Misconceptions.** "Threads are small processes with their own memory." "`counter += 1` is atomic." "Round robin is always best because it is fair." "Deadlock and a slow program are the same thing."

**Assessment of the project.** Check the three averages against the expected output, the race results (locked 20, unlocked lower), the printed cycle and the fixed scenario. Ask why the lock removes the race but a wrong lock order can create a deadlock.

**Reference solution `scheduler_lab.py`** (run with `python3 scheduler_lab.py`):

```python
"""Scheduler Simulator Lab: schedulers, a race condition and a deadlock analysis."""

HOST = [("editor", 0, 5), ("browser", 1, 3), ("python", 2, 8), ("backup", 3, 6), ("shell", 4, 2)]


def fcfs(processes):
    time, chart = 0, []
    for name, arrival, burst in sorted(processes, key=lambda p: p[1]):
        time = max(time, arrival)
        chart.append((name, time, time + burst))
        time += burst
    return chart


def sjf(processes):
    waiting, time, chart = list(processes), 0, []
    while waiting:
        ready = [p for p in waiting if p[1] <= time] or [min(waiting, key=lambda p: p[1])]
        job = min(ready, key=lambda p: (p[2], p[1]))
        time = max(time, job[1])
        chart.append((job[0], time, time + job[2]))
        time += job[2]
        waiting.remove(job)
    return chart


def round_robin(processes, quantum):
    remaining = {name: burst for name, _, burst in processes}
    pending = sorted(processes, key=lambda p: p[1])
    queue, time, chart = [], 0, []
    while pending or queue:
        while pending and pending[0][1] <= time:
            queue.append(pending.pop(0)[0])
        if not queue:
            time = pending[0][1]
            continue
        name = queue.pop(0)
        run = min(quantum, remaining[name])
        chart.append((name, time, time + run))
        time += run
        remaining[name] -= run
        while pending and pending[0][1] <= time:
            queue.append(pending.pop(0)[0])
        if remaining[name]:
            queue.append(name)
    return chart


def averages(chart, processes):
    finish = {name: end for name, _, end in chart}
    first = {}
    for name, start, _ in chart:
        first.setdefault(name, start)
    waits, turns, responses = [], [], []
    for name, arrival, burst in processes:
        turns.append(finish[name] - arrival)
        waits.append(turns[-1] - burst)
        responses.append(first[name] - arrival)
    n = len(processes)
    return sum(waits) / n, sum(turns) / n, sum(responses) / n


results = {
    "FCFS": averages(fcfs(HOST), HOST),
    "SJF": averages(sjf(HOST), HOST),
    "Round robin (q=3)": averages(round_robin(HOST, 3), HOST),
}
print("Scheduling the host workload")
print("algorithm           waiting  turnaround  response")
for name, (waiting, turnaround, response) in results.items():
    print(f"{name:<18}{waiting:>8.2f}{turnaround:>12.2f}{response:>10.2f}")
print("best average waiting time:", min(results, key=lambda name: results[name][0]))
print("best response time:", min(results, key=lambda name: results[name][2]))


def run_threads(increments, use_lock, seed):
    counter, owner = 0, None
    threads = [{"step": 0, "reg": 0, "left": increments} for _ in range(2)]
    state = seed
    while any(t["left"] for t in threads):
        state = (state * 1103515245 + 12345) % 2**31
        can_run = [i for i, t in enumerate(threads)
                   if t["left"] and (not use_lock or t["step"] > 0 or owner is None)]
        i = can_run[(state >> 16) % len(can_run)]
        t = threads[i]
        if t["step"] == 0:
            t["reg"] = counter
            owner = i if use_lock else None
        elif t["step"] == 1:
            t["reg"] += 1
        else:
            counter = t["reg"]
            t["left"] -= 1
            owner = None
        t["step"] = (t["step"] + 1) % 3
    return counter


print("\nRace condition: two threads, 10 increments each (right answer 20)")
print("seed  without lock  with lock")
for seed in range(1, 6):
    print(f"{seed:>4}  {run_threads(10, False, seed):>12}  {run_threads(10, True, seed):>9}")


def wait_for_graph(owner, wants):
    return {t: owner[lock] for t, lock in wants.items() if lock in owner and owner[lock] != t}


def find_cycle(wait_for):
    for start in wait_for:
        path, node = [], start
        while node is not None and node not in path:
            path.append(node)
            node = wait_for.get(node)
        if node is not None:
            return path[path.index(node):] + [node]
    return None


print("\nDeadlock analysis")
before = ({"notes.txt": "editor", "database": "backup", "network": "python"},
          {"editor": "database", "backup": "network", "python": "notes.txt"})
after = ({"notes.txt": "editor", "database": "backup"},
         {"editor": "database", "backup": "network", "python": "notes.txt"})
for label, (owner, wants) in (("before", before), ("after the lock-order fix", after)):
    cycle = find_cycle(wait_for_graph(owner, wants))
    print(f"  {label}:", "DEADLOCK " + " -> ".join(cycle) if cycle else "no deadlock")
```

```output
Scheduling the host workload
algorithm           waiting  turnaround  response
FCFS                  8.20       13.00      8.20
SJF                   5.60       10.40      5.60
Round robin (q=3)     9.60       14.40      4.40
best average waiting time: SJF
best response time: Round robin (q=3)

Race condition: two threads, 10 increments each (right answer 20)
seed  without lock  with lock
   1            11         20
   2            10         20
   3            15         20
   4            12         20
   5            13         20

Deadlock analysis
  before: DEADLOCK editor -> backup -> python -> editor
  after the lock-order fix: no deadlock
```

**Differentiation.** Support: provide `fcfs` and `report` and let students write `sjf` by changing one line of `fcfs`; give the deadlock dictionaries. Stretch: SRTF, priority with aging, and a wait-for graph in which a thread may wait for several others.

**Discussion questions (not for the student quiz).** Why is it impossible for an OS to run true SJF? How could it *estimate* the next burst from the past ones? Why do many real programs avoid holding more than one lock at a time?
