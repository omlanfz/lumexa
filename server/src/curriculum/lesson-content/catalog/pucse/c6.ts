// FILE PATH: server/src/curriculum/lesson-content/catalog/pucse/c6.ts
//
// Pre-University CSE · Course 6 · Operating Systems, Networking & Cybersecurity — visuals and the Mini Quiz of every lesson.
// Keys are lineage keys: "<course-slug>/<lesson position>". Every "what does this print?" question carries
// the real program (checked by running it in the Pre-University CSE spec when the toolchain is installed).

import { registerVisualCatalog } from '../../visual-catalog';
import { registerQuizCatalog } from '../../quiz-catalog';
import { bitExplorer, cards, compare, flow, gantt, graph, grid, lab, mcq, memory, PY, scheduler, sequence, subnet, table, tool, tree, V } from './helpers';

const M = 'operating-systems-networking-and-cybersecurity';

registerVisualCatalog({
  [`${M}/1`]: [
    grid(
      'os-layers',
      'The kernel, user mode and system calls',
      'A vertical stack of five layers. From the top: applications such as the browser, the editor and your Python program; libraries and the shell; the system call interface; the kernel with processes, memory, file systems, drivers and networking; and the hardware at the bottom. A line between the libraries and the kernel marks the border between user mode and kernel mode, which is crossed only through system calls.',
      'Programs never touch the hardware. Everything below the system-call line runs in kernel mode.',
      [
        ['apps', 'rect', 'Applications', 0, 0, 'accent', 'browser · editor · games · your Python program'],
        ['libs', 'rect', 'Libraries and shell', 0, 1, 'accent2', 'print · printf · file functions · the command line'],
        ['sys', 'rect', 'System call interface', 0, 2, 'warn', 'open · read · write · fork · exit'],
        ['kernel', 'rect', 'Kernel', 0, 3, 'good', 'processes · memory · files · drivers · network'],
        ['hw', 'cylinder', 'Hardware', 0, 4, 'info', 'CPU · memory · disk · keyboard · network card'],
      ],
      [
        ['apps', 'libs', 'calls'],
        ['libs', 'sys', 'user mode'],
        ['sys', 'kernel', 'kernel mode'],
        ['kernel', 'hw', 'controls'],
      ],
      { dy: 96, w: 340, at: 'end' },
    ),
    grid(
      'process-states',
      'Process states and context switches',
      'A state diagram with five states. A process is admitted from new to ready, dispatched from ready to running, and ends with exit from running to terminated. From running it returns to ready when its time slice is over, or goes to waiting to wait for I/O and then back to ready when the I/O is done. A waiting process never goes straight to running.',
      'Six arrows are all that is allowed. Notice that waiting always returns to ready, never directly to running.',
      [
        ['new', 'round', 'new', 0, 1, 'info', 'being created'],
        ['ready', 'round', 'ready', 1, 1, 'accent', 'waits for a CPU'],
        ['running', 'round', 'running', 2, 1, 'good', 'on the CPU'],
        ['done', 'round', 'terminated', 3, 1, 'bad', 'finished'],
        ['waiting', 'round', 'waiting', 1.5, 2.6, 'warn', 'blocked on I/O'],
      ],
      [
        ['new', 'ready', 'admit'],
        ['ready', 'running', 'dispatch'],
        ['running', 'done', 'exit'],
        ['running', 'ready', 'time out', { via: [[570, 86], [335, 86]] }],
        ['running', 'waiting', 'I/O wait'],
        ['waiting', 'ready', 'I/O done'],
      ],
      { dx: 235, dy: 100, w: 150, at: 'end' },
    ),
    table(
      'process-table',
      'Programs and processes',
      'A table in the style of the ps command with five processes. Each row shows a PID, the PID of its parent, the name, the state and the memory in kilobytes. The shell has PID 4 and is the parent of the editor, the browser and python.',
      'What a process listing looks like: every process has a PID, a parent and a state. The shell (PID 4) is the parent of three of them.',
      ['PID', 'PPID', 'Name', 'State', 'Memory (KB)'],
      [
        [1, 0, 'init', 'waiting', '5,600'],
        [4, 1, 'shell', 'waiting', '6,400'],
        [5, 4, 'editor', 'running', '41,200'],
        [6, 4, 'browser', 'ready', '312,500'],
        [7, 4, 'python', 'ready', '22,800'],
      ],
      { at: 'end', highlights: [{ row: 2, col: 3, tone: 'good', note: 'on the CPU' }, { row: 3, col: 4, tone: 'warn', note: 'the biggest' }] },
    ),
    sequence(
      'syscall-sequence',
      'Example 2',
      'A sequence diagram of one read system call. The program calls read in the library; the library makes a system call that switches the CPU into kernel mode; the kernel asks the disk for the data; the disk answers with an interrupt; the kernel returns to user mode and the library hands the bytes to the program.',
      'One read(): two mode switches, and the slow part, the disk, happens inside the kernel.',
      [['prog', 'Program'], ['lib', 'Library'], ['kernel', 'Kernel'], ['disk', 'Disk']],
      [
        { from: 'prog', to: 'lib', label: 'read(fd, buffer, n)' },
        { from: 'lib', to: 'kernel', label: 'system call', note: 'user mode becomes kernel mode' },
        { from: 'kernel', to: 'disk', label: 'request the block' },
        { from: 'disk', to: 'kernel', label: 'data ready (interrupt)', dashed: true },
        { from: 'kernel', to: 'lib', label: 'return', note: 'kernel mode becomes user mode', dashed: true },
        { from: 'lib', to: 'prog', label: 'bytes read', dashed: true },
      ],
      { at: 'end' },
    ),
    lab(
      'process-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program: a Process class that only allows legal state transitions, run on an editor and a browser process, with its expected output including the error for an illegal move.',
      'Add an event that moves the browser from waiting to running and read the error message.',
      `VALID = {
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
    print("error:", error)`,
      { expected: 'tick 0: editor   -> ready      admitted\ntick 0: browser  -> ready      admitted\ntick 1: editor   -> running    dispatched by the scheduler\ntick 2: editor   -> waiting    waits for a key press (I/O)\ntick 2: browser  -> running    dispatched\ntick 3: editor   -> ready      key pressed: the I/O is done\ntick 4: browser  -> ready      time slice over (preempted)\ntick 4: editor   -> running    dispatched\ntick 5: editor   -> terminated exit()\nerror: editor: cannot go from terminated to running', filename: 'process.py', at: 'end' },
    ),
  ],
  [`${M}/2`]: [
    grid(
      'threads-in-a-process',
      'Threads',
      'A diagram of one process with three threads. A box at the top holds what all threads share: the code, the global data and the heap. Below it three boxes, Thread 1, Thread 2 and Thread 3, each have their own stack and their own registers. Dashed arrows from every thread to the shared box show that they all use the same memory.',
      'One process, three threads: shared code, data and heap; separate stacks and registers.',
      [
        ['shared', 'rect', 'Shared by all threads', 1, 0, 'info', 'code · global data · heap'],
        ['t1', 'round', 'Thread 1', 0, 1.6, 'accent', 'own stack · own registers'],
        ['t2', 'round', 'Thread 2', 1, 1.6, 'accent', 'own stack · own registers'],
        ['t3', 'round', 'Thread 3', 2, 1.6, 'accent', 'own stack · own registers'],
      ],
      [
        ['t1', 'shared', 'same memory', { dashed: true }],
        ['t2', 'shared', undefined, { dashed: true }],
        ['t3', 'shared', undefined, { dashed: true }],
      ],
      { dx: 200, dy: 100, w: 175, at: 'end', groups: [{ label: 'One process', col: 0, row: -0.1, cols: 3, rows: 3, tone: 'info' }] },
    ),
    scheduler(
      'scheduler-example',
      'CPU scheduling',
      'A CPU scheduler simulator with four processes: P1 arrives at 0 and needs 8 units, P2 arrives at 1 and needs 4, P3 arrives at 2 and needs 9, P4 arrives at 3 and needs 5. It draws the Gantt chart and the waiting and turnaround times of FCFS, and the learner can switch to SJF, SRTF or round robin and change the quantum.',
      'Switch the algorithm and watch the Gantt chart and the averages change. These are the same numbers as in Example 1.',
      [['P1', 0, 8], ['P2', 1, 4], ['P3', 2, 9], ['P4', 3, 5]],
      'FCFS',
      { quantum: 3, at: 'end' },
    ),
    table(
      'race-interleaving',
      'Concurrency problems',
      'A table that replays a race condition. The counter starts at 5. Thread 1 and thread 2 both load 5 into their registers, both add 1 to get 6, and both store 6. After two increments the counter is 6 instead of 7: one update was lost.',
      'Two increments should give 7. The interleaving load, load, add, add, store, store gives 6.',
      ['Step', 'Thread', 'Action', 'T1 register', 'T2 register', 'Counter'],
      [
        [1, 'T1', 'load the counter', '5', '-', '5'],
        [2, 'T2', 'load the counter', '5', '5', '5'],
        [3, 'T1', 'add 1', '6', '5', '5'],
        [4, 'T2', 'add 1', '6', '6', '5'],
        [5, 'T1', 'store', '6', '6', '6'],
        [6, 'T2', 'store', '6', '6', '6'],
      ],
      { at: 'end', highlights: [{ row: 1, col: 4, tone: 'warn', note: 'stale value' }, { row: 5, col: 5, tone: 'bad', note: 'one update lost' }] },
    ),
    graph(
      'deadlock-graph',
      'Deadlock',
      'A directed graph of a deadlock with two threads and two locks. Thread T1 wants lock B, which is held by thread T2; T2 wants lock A, which is held by T1. The arrows T1 to lock B, lock B to T2, T2 to lock A and lock A to T1 form a cycle, so neither thread can ever continue.',
      'Arrows point from a thread to the lock it wants (A or B), and from a lock to the thread that holds it. A cycle means deadlock.',
      [
        { id: 'T1', x: 90, y: 60, tone: 'accent' },
        { id: 'B', x: 300, y: 60, tone: 'warn' },
        { id: 'T2', x: 300, y: 190, tone: 'accent' },
        { id: 'A', x: 90, y: 190, tone: 'warn' },
      ],
      [['T1', 'B'], ['B', 'T2'], ['T2', 'A'], ['A', 'T1']],
      { directed: true, at: 'end' },
    ),
    lab(
      'scheduler-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program, which implements FCFS, shortest job first and round robin and prints the Gantt chart and the waiting, turnaround and response times for four processes, with its expected output.',
      'Add a fifth process (P5, 4, 1) and see which scheduler treats it best.',
      `PROCESSES = [("P1", 0, 8), ("P2", 1, 4), ("P3", 2, 9), ("P4", 3, 5)]      # name, arrival time, burst time


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
    print(f"  average waiting {sum(waits) / n:.2f}, turnaround {sum(turns) / n:.2f}, response {sum(responses) / n:.2f}\\n")


report("FCFS", fcfs(PROCESSES), PROCESSES)
report("SJF (non-preemptive)", sjf(PROCESSES), PROCESSES)
report("Round robin, quantum 3", round_robin(PROCESSES, 3), PROCESSES)`,
      { expected: 'FCFS\n  chart: P1[0-8] P2[8-12] P3[12-21] P4[21-26]\n  P1: waiting  0, turnaround  8, response  0\n  P2: waiting  7, turnaround 11, response  7\n  P3: waiting 10, turnaround 19, response 10\n  P4: waiting 18, turnaround 23, response 18\n  average waiting 8.75, turnaround 15.25, response 8.75\n\nSJF (non-preemptive)\n  chart: P1[0-8] P2[8-12] P4[12-17] P3[17-26]\n  P1: waiting  0, turnaround  8, response  0\n  P2: waiting  7, turnaround 11, response  7\n  P3: waiting 15, turnaround 24, response 15\n  P4: waiting  9, turnaround 14, response  9\n  average waiting 7.75, turnaround 14.25, response 7.75\n\nRound robin, quantum 3\n  chart: P1[0-3] P2[3-6] P3[6-9] P4[9-12] P1[12-15] P2[15-16] P3[16-19] P4[19-21] P1[21-23] P3[23-26]\n  P1: waiting 15, turnaround 23, response  0\n  P2: waiting 11, turnaround 15, response  2\n  P3: waiting 15, turnaround 24, response  4\n  P4: waiting 13, turnaround 18, response  6\n  average waiting 13.50, turnaround 20.00, response 3.00', filename: 'schedulers.py', at: 'end' },
    ),
    lab(
      'race-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that replays two threads incrementing a shared counter with and without a lock, for six pseudo-random interleavings, with its expected output.',
      'Raise the number of increments to 100 and check whether the unlocked counter is ever correct.',
      `def run_threads(increments, use_lock, seed):
    """Two threads each add 1 to a shared counter \`increments\` times.
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
    print(f"{seed:>4}  {run_threads(10, False, seed):>14}  {run_threads(10, True, seed):>9}")`,
      { expected: 'two threads, 10 increments each: the right answer is 20\nseed  without a lock  with a lock\n   1              11         20\n   2              10         20\n   3              15         20\n   4              12         20\n   5              13         20\n   6              10         20', filename: 'race.py', at: 'end' },
    ),
  ],
  [`${M}/3`]: [
    memory(
      'address-space',
      'Memory management and address spaces',
      'A diagram of the virtual address space of one process, from high addresses at the top to low addresses at the bottom: the stack for local variables and function calls, which grows downwards; a large unused gap; the heap for memory that the program allocates, which grows upwards; the global data; and the code of the program at the lowest addresses.',
      'Each process sees its own private layout like this, starting at address 0. The OS and the MMU map it onto real frames.',
      [
        {
          label: 'Virtual address space of one process',
          cells: [
            { name: 'stack', addr: 'high addresses', value: 'local variables, function calls', note: 'grows downwards', tone: 'warn' },
            { name: 'unused', addr: 'the gap', value: 'room for the stack and the heap to grow', tone: 'info' },
            { name: 'heap', addr: 'above the data', value: 'memory from malloc, new objects', note: 'grows upwards', tone: 'accent' },
            { name: 'global data', addr: 'above the code', value: 'global and static variables', tone: 'good' },
            { name: 'code', addr: 'address 0', value: 'the instructions of the program', tone: 'accent2' },
          ],
        },
      ],
      { at: 'end' },
    ),
    flow(
      'translation-flow',
      'Paging',
      'Four steps of address translation. The virtual address 0x1234 is split into page number 1 and offset 564. The page table says that page 1 is in frame 2. The physical address is frame 2 times 4096 plus the offset 564, which is 0x2234.',
      'The MMU does this for every memory access: split, look up, put back together. The offset is never translated.',
      ['Virtual address|0x1234 = 4,660|accent', 'Split|page 1, offset 564|info', 'Page table|page 1 is in frame 2|warn', 'Physical address|2 × 4096 + 564 = 0x2234|good'],
      { layout: 'row', perRow: 4, at: 'end' },
    ),
    grid(
      'paging-diagram',
      'Paging',
      'A diagram of paging. On the left four virtual pages of a process; on the right three frames of RAM and the disk. Page 0 maps to frame 5, page 1 to frame 2 and page 2 to frame 7, so the pages are scattered in RAM. Page 3 is not in RAM: its arrow goes to the disk and uses a dashed line, because touching it causes a page fault.',
      'The page table maps pages to frames in any order. A dashed arrow means the page is on disk: touching it causes a page fault.',
      [
        ['p0', 'rect', 'Page 0', 0, 0, 'accent', 'virtual'],
        ['p1', 'rect', 'Page 1', 0, 1, 'accent', 'virtual'],
        ['p2', 'rect', 'Page 2', 0, 2, 'accent', 'virtual'],
        ['p3', 'rect', 'Page 3', 0, 3, 'accent', 'virtual'],
        ['f5', 'rect', 'Frame 5', 2, 0, 'good', 'RAM'],
        ['f2', 'rect', 'Frame 2', 2, 1, 'good', 'RAM'],
        ['f7', 'rect', 'Frame 7', 2, 2, 'good', 'RAM'],
        ['disk', 'cylinder', 'Disk (swap)', 2, 3, 'warn', 'not in RAM'],
      ],
      [
        ['p0', 'f5', 'page table'],
        ['p1', 'f2', 'page table'],
        ['p2', 'f7', 'page table'],
        ['p3', 'disk', 'page fault', { dashed: true }],
      ],
      { dx: 260, dy: 85, w: 160, at: 'end' },
    ),
    compare(
      'belady-compare',
      'Virtual memory and page replacement',
      'Two tables of FIFO page replacement on the reference string 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5. With 3 frames the table shows 9 page faults. With 4 frames it shows 10 page faults: more memory, more faults. This is Belady’s anomaly.',
      'Belady’s anomaly: giving FIFO a fourth frame made this program fault more often, 10 times instead of 9.',
      {
        title: '3 frames: 9 faults',
        columns: ['Ref', 'Frames', 'Fault?'],
        rows: [[1, '1', 'fault'], [2, '1 2', 'fault'], [3, '1 2 3', 'fault'], [4, '2 3 4', 'fault'], [1, '3 4 1', 'fault'], [2, '4 1 2', 'fault'], [5, '1 2 5', 'fault'], [1, '1 2 5', 'hit'], [2, '1 2 5', 'hit'], [3, '2 5 3', 'fault'], [4, '5 3 4', 'fault'], [5, '5 3 4', 'hit']],
        highlights: [0, 1, 2, 3, 4, 5, 6, 9, 10].map((row) => ({ row, col: 2, tone: 'bad' })),
      },
      {
        title: '4 frames: 10 faults',
        columns: ['Ref', 'Frames', 'Fault?'],
        rows: [[1, '1', 'fault'], [2, '1 2', 'fault'], [3, '1 2 3', 'fault'], [4, '1 2 3 4', 'fault'], [1, '1 2 3 4', 'hit'], [2, '1 2 3 4', 'hit'], [5, '2 3 4 5', 'fault'], [1, '3 4 5 1', 'fault'], [2, '4 5 1 2', 'fault'], [3, '5 1 2 3', 'fault'], [4, '1 2 3 4', 'fault'], [5, '2 3 4 5', 'fault']],
        highlights: [0, 1, 2, 3, 6, 7, 8, 9, 10, 11].map((row) => ({ row, col: 2, tone: 'bad' })),
      },
      { arrowLabel: 'one more frame', at: 'end' },
    ),
    tree(
      'directory-tree',
      'File systems',
      'A directory tree. The root contains three directories: home, which contains the user directories ana and ben, each with files; etc, which contains the files hosts and passwd; and an empty directory. A path such as /home/ana/notes.txt names a file by walking from the root down the tree.',
      'A file system is a tree. A path is the walk from the root to a file or directory.',
      {
        label: '/ (root)',
        children: [
          { label: 'home/', tone: 'info', children: [{ label: 'ana/', tone: 'info', children: [{ label: 'notes.txt', tone: 'good' }, { label: 'photo.jpg', tone: 'good' }, { label: 'essay.docx', tone: 'good' }] }, { label: 'ben/', tone: 'info', children: [{ label: 'game.py', tone: 'good' }, { label: 'scores.csv', tone: 'good' }] }] },
          { label: 'etc/', tone: 'info', children: [{ label: 'hosts', tone: 'good' }, { label: 'passwd', tone: 'good' }] },
          { label: 'empty/', tone: 'info' },
        ],
      },
      { at: 'end' },
    ),
    lab(
      'translate-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program, a page-table translator that splits virtual addresses into page and offset and reports physical addresses, page faults and segmentation faults, with its expected output.',
      'Add the addresses 0x1FFF and 0x2000 to the loop and explain which frames they land in.',
      `PAGE_SIZE = 4096                                   # 4 KiB pages, like most real systems
PAGE_TABLE = {0: 5, 1: 2, 2: 7, 3: None}           # virtual page -> physical frame (None: not in RAM)


def translate(virtual_address):
    page, offset = divmod(virtual_address, PAGE_SIZE)
    if page not in PAGE_TABLE:
        return page, offset, None, "SEGMENTATION FAULT (no such page)"
    frame = PAGE_TABLE[page]
    if frame is None:
        return page, offset, None, "PAGE FAULT (the page is on disk)"
    return page, offset, frame, f"{frame * PAGE_SIZE + offset:#06x}"


print("virtual   page  offset  frame  physical address")
for address in (0x0000, 0x0010, 0x1234, 0x2FFF, 0x3000, 0x9000):
    page, offset, frame, result = translate(address)
    shown = "-" if frame is None else frame
    print(f"{address:#06x}  {page:>5}  {offset:>6}  {shown:>5}  {result}")`,
      { expected: 'virtual   page  offset  frame  physical address\n0x0000      0       0      5  0x5000\n0x0010      0      16      5  0x5010\n0x1234      1     564      2  0x2234\n0x2fff      2    4095      7  0x7fff\n0x3000      3       0      -  PAGE FAULT (the page is on disk)\n0x9000      9       0      -  SEGMENTATION FAULT (no such page)', filename: 'translate.py', at: 'end' },
    ),
    lab(
      'replacement-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program that counts the page faults of FIFO, LRU and optimal replacement on a reference string, and shows Belady\'s anomaly, with its expected output.',
      'Run a loop over three pages with 2 and then 3 frames and compare FIFO with LRU.',
      `def fifo(refs, frames):
    memory, faults = [], 0
    for page in refs:
        if page not in memory:
            faults += 1
            if len(memory) == frames:
                memory.pop(0)                          # evict the page that arrived first
            memory.append(page)
    return faults


def lru(refs, frames):
    memory, faults = [], 0                             # the least recently used page is first in the list
    for page in refs:
        if page in memory:
            memory.remove(page)                        # a hit: it becomes the most recently used
        else:
            faults += 1
            if len(memory) == frames:
                memory.pop(0)
        memory.append(page)
    return faults


def optimal(refs, frames):
    memory, faults = [], 0
    for i, page in enumerate(refs):
        if page in memory:
            continue
        faults += 1
        if len(memory) == frames:
            future = refs[i + 1:]
            # evict the page whose next use is farthest away (or that is never used again)
            memory.remove(max(memory, key=lambda p: future.index(p) if p in future else len(future) + 1))
        memory.append(page)
    return faults


REFS = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
print(f"{len(REFS)} page references, 3 frames")
for name, algorithm in (("FIFO", fifo), ("LRU", lru), ("Optimal", optimal)):
    faults = algorithm(REFS, 3)
    print(f"  {name:<8} {faults:>2} page faults, hit rate {1 - faults / len(REFS):.0%}")

BELADY = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
print("\\nBelady's anomaly with FIFO on", BELADY)
for frames in (3, 4):
    print(f"  {frames} frames: {fifo(BELADY, frames)} page faults")`,
      { expected: '20 page references, 3 frames\n  FIFO     15 page faults, hit rate 25%\n  LRU      12 page faults, hit rate 40%\n  Optimal   9 page faults, hit rate 55%\n\nBelady\'s anomaly with FIFO on [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]\n  3 frames: 9 page faults\n  4 frames: 10 page faults', filename: 'replacement.py', at: 'end' },
    ),
  ],
  [`${M}/4`]: [
    table(
      'osi-table',
      'The OSI model and the TCP/IP model',
      'A table of the seven OSI layers from application at the top to physical at the bottom, with the matching TCP/IP layer, the unit of data and examples. Application, presentation and session map to the TCP/IP application layer; transport has segments; network has packets and is the internet layer; data link has frames and physical has bits, and both belong to the TCP/IP link layer.',
      'Seven OSI layers, four TCP/IP layers. The unit of data changes as it moves down: data, segment, packet, frame, bits.',
      ['#', 'OSI layer', 'TCP/IP layer', 'Unit', 'Examples'],
      [
        [7, 'Application', 'Application', 'data', 'HTTP, DNS, SMTP, FTP'],
        [6, 'Presentation', 'Application', 'data', 'TLS encryption, JPEG, character sets'],
        [5, 'Session', 'Application', 'data', 'keeping a conversation or login open'],
        [4, 'Transport', 'Transport', 'segment', 'TCP, UDP, port numbers'],
        [3, 'Network', 'Internet', 'packet', 'IP, ICMP, routers'],
        [2, 'Data link', 'Link', 'frame', 'Ethernet, Wi-Fi, MAC addresses, switches'],
        [1, 'Physical', 'Link', 'bits', 'cables, fibre, radio signals'],
      ],
      { at: 'end', highlights: [{ row: 3, col: 3, tone: 'info' }, { row: 4, col: 3, tone: 'accent' }, { row: 5, col: 3, tone: 'good' }] },
    ),
    grid(
      'encapsulation-diagram',
      'Encapsulation',
      'A diagram of one Ethernet frame as nested boxes. In the middle is the application data. The TCP header and the data together form a segment. The IP header plus the segment form a packet. The Ethernet header, the packet and a small trailer form the frame. The headers are 20 bytes for TCP, 20 bytes for IP and 14 bytes for Ethernet.',
      'Each layer wraps what it gets from above. The frame on the cable is a packet in an Ethernet envelope; the packet is a segment in an IP envelope.',
      [
        ['eth', 'rect', 'Ethernet header', 0, 1, 'good', '14 B · MAC addresses'],
        ['ip', 'rect', 'IP header', 1, 1, 'accent', '20 B · IP addresses'],
        ['tcp', 'rect', 'TCP header', 2, 1, 'info', '20 B · ports'],
        ['data', 'rect', 'Data', 3, 1, 'warn', 'the message'],
        ['trailer', 'rect', 'Trailer', 4.3, 1, 'good', '4 B · check'],
      ],
      [],
      {
        dx: 160,
        dy: 100,
        w: 120,
        at: 'end',
        groups: [
          { label: 'Frame (link layer)', col: 0, row: 0.27, cols: 5.3, rows: 1.94, tone: 'good' },
          { label: 'Packet (network layer)', col: 1, row: 0.53, cols: 3.2, rows: 1.56, tone: 'accent' },
          { label: 'Segment (transport layer)', col: 2, row: 0.79, cols: 2, rows: 1.18, tone: 'info' },
        ],
      },
    ),
    table(
      'addresses-table',
      'Addresses at each layer',
      'A table of four kinds of address. The MAC address, such as 3C:52:82:1A:B4:9F, works at the link layer, is read by switches and is valid inside one LAN. The IP address, such as 192.168.1.20, works at the network layer, is read by routers and is valid across networks. The port number, such as 443, works at the transport layer and picks the application. A name such as www.example.com is turned into an IP address by DNS.',
      'Four addresses answer four questions: which card, which host, which program, which name.',
      ['Layer', 'Address', 'Example', 'Read by', 'Works'],
      [
        ['Link (2)', 'MAC address', '3C:52:82:1A:B4:9F', 'switches', 'inside one LAN'],
        ['Network (3)', 'IP address', '192.168.1.20', 'routers', 'across networks'],
        ['Transport (4)', 'Port number', '443', 'the operating system', 'picks the application'],
        ['Application (7)', 'Name', 'www.example.com', 'DNS', 'turned into an IP address'],
      ],
      { at: 'end' },
    ),
    grid(
      'office-network',
      'Example 2',
      'A map of the office network. The internet cloud connects to the router R1. R1 connects to switch SW1 on LAN 1 and switch SW2 on LAN 2. On LAN 1, SW1 serves PC-A, PC-B and an access point, and the laptop connects to the access point over Wi-Fi. On LAN 2, SW2 serves the Web server and the DB server.',
      'The map that Example 2 stores in a dictionary: ten devices, nine links. Each device shows the layer it works at.',
      [
        ['isp', 'cloud', 'ISP / Internet', 2.5, 0, 'accent2', 'router · layer 3'],
        ['r1', 'ellipse', 'R1', 2.5, 1, 'warn', 'router · layer 3'],
        ['sw1', 'rect', 'SW1', 1, 2, 'info', 'switch · layer 2'],
        ['sw2', 'rect', 'SW2', 4, 2, 'info', 'switch · layer 2'],
        ['pca', 'round', 'PC-A', 0, 3, 'accent', 'host · layer 7'],
        ['pcb', 'round', 'PC-B', 1, 3, 'accent', 'host · layer 7'],
        ['ap', 'rect', 'AP', 2, 3, 'info', 'Wi-Fi AP · layer 2'],
        ['laptop', 'round', 'Laptop', 2, 4, 'accent', 'host · layer 7'],
        ['web', 'round', 'Web', 3.5, 3, 'accent', 'host · layer 7'],
        ['db', 'round', 'DB', 4.5, 3, 'accent', 'host · layer 7'],
      ],
      [
        ['isp', 'r1', '10 ms', { head: 'none' }],
        ['r1', 'sw1', undefined, { head: 'none' }],
        ['r1', 'sw2', undefined, { head: 'none' }],
        ['sw1', 'pca', undefined, { head: 'none' }],
        ['sw1', 'pcb', undefined, { head: 'none' }],
        ['sw1', 'ap', undefined, { head: 'none' }],
        ['ap', 'laptop', 'Wi-Fi 3 ms', { head: 'none', dashed: true }],
        ['sw2', 'web', undefined, { head: 'none' }],
        ['sw2', 'db', undefined, { head: 'none' }],
      ],
      {
        dx: 150,
        dy: 95,
        w: 128,
        at: 'end',
        groups: [
          { label: 'LAN 1 · 192.168.1.0/24', col: 0, row: 1.7, cols: 3, rows: 3.3, tone: 'info' },
          { label: 'LAN 2 · 192.168.2.0/24', col: 3.5, row: 1.7, cols: 2, rows: 2.3, tone: 'good' },
        ],
      },
    ),
    lab(
      'encapsulation-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program that wraps a web request in a TCP header, an IP header and an Ethernet header and prints the size at every layer and the header overhead for four payload sizes, with its expected output.',
      'Change the message to 100 characters with "x" * 100 and compare the overhead.',
      `ETHERNET, IP, TCP = 14, 20, 20                     # header sizes in bytes (Ethernet's 4-byte trailer is ignored)


def encapsulate(message, src_port, dst_port, src_ip, dst_ip, src_mac, dst_mac):
    """Walk down the stack: every layer wraps what it receives from above with its own header."""
    size = len(message)
    layers = [("Application", "data", f'"{message}"', size)]
    size += TCP
    layers.append(("Transport", "segment", f"TCP header: port {src_port} -> {dst_port}", size))
    size += IP
    layers.append(("Network", "packet", f"IP header: {src_ip} -> {dst_ip}", size))
    size += ETHERNET
    layers.append(("Link", "frame", f"Ethernet header: {src_mac} -> {dst_mac}", size))
    return layers


frame = encapsulate("GET /index.html", 51000, 80, "192.168.1.20", "192.168.2.10", "3C:52:A1", "7E:10:B4")
for name, unit, header, size in frame:
    print(f"{name:<12} {unit:<8} {header:<48} {size:>4} bytes")
print(f"the headers add {frame[-1][3] - frame[0][3]} bytes to {frame[0][3]} bytes of data\\n")

print("payload  frame size  overhead")
for payload in (10, 100, 1000, 1460):
    total = payload + ETHERNET + IP + TCP
    print(f"{payload:>7}  {total:>10}  {(ETHERNET + IP + TCP) / total:>8.0%}")`,
      { expected: 'Application  data     "GET /index.html"                                  15 bytes\nTransport    segment  TCP header: port 51000 -> 80                       35 bytes\nNetwork      packet   IP header: 192.168.1.20 -> 192.168.2.10            55 bytes\nLink         frame    Ethernet header: 3C:52:A1 -> 7E:10:B4              69 bytes\nthe headers add 54 bytes to 15 bytes of data\n\npayload  frame size  overhead\n     10          64       84%\n    100         154       35%\n   1000        1054        5%\n   1460        1514        4%', filename: 'encapsulate.py', at: 'end' },
    ),
    lab(
      'switch-lab',
      'Example 3',
      'python',
      'A Python editor with the Example 3 program, a Switch class that learns MAC addresses and floods frames for unknown destinations, run on five frames, with its expected output.',
      'Add two more frames and predict whether the switch forwards or floods each one.',
      `class Switch:
    """A layer-2 switch: it learns which port each MAC address is on."""

    def __init__(self, ports):
        self.ports = ports
        self.table = {}                                  # MAC address -> port number

    def receive(self, port, source, destination):
        self.table[source] = port                        # learn: the sender is on this port
        if destination in self.table:
            return [self.table[destination]]             # known: forward out of one port only
        return [p for p in range(1, self.ports + 1) if p != port]    # unknown: flood all other ports


switch = Switch(4)
FRAMES = [(1, "AA", "BB"), (2, "BB", "AA"), (1, "AA", "BB"), (3, "CC", "AA"), (4, "DD", "FF")]
print("port  from -> to   switch action")
for port, source, destination in FRAMES:
    out = switch.receive(port, source, destination)
    action = f"forward to port {out[0]}" if len(out) == 1 else "flood to ports " + ", ".join(map(str, out))
    print(f"{port:>4}  {source} -> {destination}     {action}")
print("MAC table:", switch.table)`,
      { expected: 'port  from -> to   switch action\n   1  AA -> BB     flood to ports 2, 3, 4\n   2  BB -> AA     forward to port 1\n   1  AA -> BB     forward to port 2\n   3  CC -> AA     forward to port 1\n   4  DD -> FF     flood to ports 1, 2, 3\nMAC table: {\'AA\': 1, \'BB\': 2, \'CC\': 3, \'DD\': 4}', filename: 'switch.py', at: 'end' },
    ),
  ],
  [`${M}/5`]: [
    bitExplorer(
      'octet-explorer',
      'IPv4 addresses',
      'A bit explorer with eight switches showing the last octet of the address 192.168.1.130, which is 130 or 10000010 in binary. Switching bits on and off shows how an octet is built from 128, 64, 32, 16, 8, 4, 2 and 1.',
      'One octet of an IPv4 address is eight bits. 130 is 128 + 2. Click the bits to build other octets such as 192 or 168.',
      8,
      130,
      { mode: 'unsigned', at: 'end' },
    ),
    table(
      'special-ranges',
      'IPv4 addresses',
      'A table of special IPv4 address ranges. 10.0.0.0/8 has about 16.7 million addresses and is private. 172.16.0.0/12 has about 1 million and is private. 192.168.0.0/16 has 65,536 and is the usual range of homes and small offices. 127.0.0.0/8 is the loopback range for the computer itself. 169.254.0.0/16 is link-local, what a computer uses when it finds no DHCP server.',
      'Private ranges are free to use inside your own network; they are not routed on the internet.',
      ['Range', 'Addresses', 'Meaning'],
      [
        ['10.0.0.0/8', '16,777,216', 'private: large organisations'],
        ['172.16.0.0/12', '1,048,576', 'private: medium networks'],
        ['192.168.0.0/16', '65,536', 'private: homes and small offices'],
        ['127.0.0.0/8', '16,777,216', 'loopback: this computer (127.0.0.1)'],
        ['169.254.0.0/16', '65,536', 'link-local: no DHCP server was found'],
      ],
      { at: 'end', highlights: [{ row: 2, col: 2, tone: 'good', note: 'your home router' }] },
    ),
    subnet(
      'subnet-example',
      'Subnet masks, prefixes and subnetting',
      'A subnet calculator for the address 192.168.1.130 with the prefix 26. It shows the mask 255.255.255.192, the network address 192.168.1.128, the broadcast address 192.168.1.191 and the host range 192.168.1.129 to 192.168.1.190, with 62 usable hosts. The learner can change the address and the prefix.',
      'Change the prefix and watch the network, the broadcast address and the host range move. These are the numbers of Example 1.',
      '192.168.1.130',
      26,
      { at: 'end' },
    ),
    gantt(
      'vlsm-blocks',
      'Subnet masks, prefixes and subnetting',
      'A single bar for the 256 addresses of 192.168.10.0/24 divided by VLSM, drawn in units of 4 addresses. Staff takes the first 128 addresses as a /25, guests the next 64 as a /26, servers 32 as a /27, management 16 as a /28, two router links 4 each as /30 subnets, and the last 8 addresses stay unused.',
      'VLSM: the largest block comes first and each block starts where the last one ended. One unit on the scale is 4 addresses; the last 8 addresses (2 units) are spare.',
      ['192.168.10.0/24'],
      [
        { lane: '192.168.10.0/24', start: 0, end: 32, label: 'Staff /25', tone: 'accent' },
        { lane: '192.168.10.0/24', start: 32, end: 48, label: 'Guests /26', tone: 'info' },
        { lane: '192.168.10.0/24', start: 48, end: 56, label: 'Servers', tone: 'good' },
        { lane: '192.168.10.0/24', start: 56, end: 60, label: 'Mgmt', tone: 'warn' },
        { lane: '192.168.10.0/24', start: 60, end: 61, tone: 'accent2' },
        { lane: '192.168.10.0/24', start: 61, end: 62, tone: 'accent2' },
        { lane: '192.168.10.0/24', start: 62, end: 64, tone: 'bad' },
      ],
      { max: 64, unit: 'x4 addresses', at: 'end' },
    ),
    sequence(
      'tcp-handshake',
      'The transport layer: ports, UDP and TCP',
      'A sequence diagram of a TCP connection. The client sends SYN with sequence number 100. The server answers SYN-ACK with sequence number 300 and acknowledgement 101. The client sends ACK with acknowledgement 301 and the connection is open. Data flows with acknowledgements, and at the end a FIN closes the connection.',
      'Three messages open a TCP connection. After that every segment is acknowledged, which is what makes TCP reliable and slower to start than UDP.',
      [['client', 'Client'], ['server', 'Server']],
      [
        { from: 'client', to: 'server', label: 'SYN (seq 100)', note: 'I want to talk' },
        { from: 'server', to: 'client', label: 'SYN-ACK (seq 300, ack 101)', note: 'OK, and I want to talk too', dashed: true },
        { from: 'client', to: 'server', label: 'ACK (ack 301)', note: 'the connection is open' },
        { from: 'client', to: 'server', label: 'data: GET /index.html' },
        { from: 'server', to: 'client', label: 'ACK, then the page', dashed: true },
        { from: 'client', to: 'server', label: 'FIN', note: 'I am finished' },
      ],
      { at: 'end' },
    ),
    table(
      'tcp-udp-table',
      'The transport layer: ports, UDP and TCP',
      'A table that compares TCP and UDP. TCP is connection-oriented, reliable, ordered, has a 20-byte header and is used for web pages, email and file transfer. UDP is connectionless, gives no guarantee, has an 8-byte header and is used for DNS, voice and video calls and games.',
      'TCP trades speed for reliability; UDP trades reliability for speed. The application decides which it needs.',
      ['Feature', 'TCP', 'UDP'],
      [
        ['Connection', 'opened first (three-way handshake)', 'none: each datagram stands alone'],
        ['Delivery', 'guaranteed: lost data is resent', 'not guaranteed'],
        ['Order', 'bytes arrive in order', 'may arrive out of order'],
        ['Header', '20 bytes or more', '8 bytes'],
        ['Speed', 'slower to start, controls its pace', 'fast, no waiting'],
        ['Typical use', 'web pages, e-mail, file transfer', 'DNS, voice and video calls, games'],
      ],
      { at: 'end' },
    ),
    lab(
      'subnet-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program that calculates the mask, network address, broadcast address and host range of 192.168.1.130/26 with bit operations and checks them against the ipaddress module, with its expected output.',
      'Change the address to 10.1.5.77 and the prefix to 28 and compare with your hand calculation.',
      `import ipaddress


def to_int(ip):
    a, b, c, d = (int(part) for part in ip.split("."))
    return a << 24 | b << 16 | c << 8 | d


def to_ip(number):
    return ".".join(str(number >> shift & 255) for shift in (24, 16, 8, 0))


def dotted_binary(number):
    bits = f"{number:032b}"
    return ".".join(bits[i:i + 8] for i in range(0, 32, 8))


def describe(ip, prefix):
    mask = (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF          # prefix ones, then zeros
    network = to_int(ip) & mask                               # AND keeps the network part
    broadcast = network | (~mask & 0xFFFFFFFF)                # OR sets all host bits to 1
    return mask, network, broadcast


ip, prefix = "192.168.1.130", 26
mask, network, broadcast = describe(ip, prefix)
print(f"address      {ip:<16} {dotted_binary(to_int(ip))}")
print(f"mask   /{prefix}   {to_ip(mask):<16} {dotted_binary(mask)}")
print(f"network      {to_ip(network):<16} {dotted_binary(network)}")
print(f"broadcast    {to_ip(broadcast):<16} {dotted_binary(broadcast)}")
print(f"usable hosts {to_ip(network + 1)} to {to_ip(broadcast - 1)}  ({2 ** (32 - prefix) - 2} hosts)")

check = ipaddress.ip_network(f"{ip}/{prefix}", strict=False)
print("matches the ipaddress module:", to_ip(network) == str(check.network_address) and to_ip(broadcast) == str(check.broadcast_address))`,
      { expected: 'address      192.168.1.130    11000000.10101000.00000001.10000010\nmask   /26   255.255.255.192  11111111.11111111.11111111.11000000\nnetwork      192.168.1.128    11000000.10101000.00000001.10000000\nbroadcast    192.168.1.191    11000000.10101000.00000001.10111111\nusable hosts 192.168.1.129 to 192.168.1.190  (62 hosts)\nmatches the ipaddress module: True', filename: 'subnet.py', at: 'end' },
    ),
    lab(
      'routing-lab',
      'Example 3',
      'python',
      'A Python editor with the Example 3 program, a routing table with a default route and overlapping networks, a longest-prefix-match function and a TTL demonstration, with its expected output.',
      'Add the route 192.168.1.64/26 via 192.168.1.65 and predict which route 192.168.1.77 uses.',
      `import ipaddress

# destination network, next hop, interface
ROUTES = [
    ("0.0.0.0/0", "203.0.113.1", "eth0"),              # the default route: everything else
    ("192.168.1.0/24", "directly connected", "eth1"),
    ("192.168.2.0/24", "directly connected", "eth2"),
    ("192.168.0.0/16", "192.168.2.254", "eth2"),       # a bigger block, reached through another router
    ("192.168.2.128/25", "192.168.2.130", "eth2"),
]
TABLE = [(ipaddress.ip_network(net), hop, nic) for net, hop, nic in ROUTES]


def route(destination):
    """Longest prefix match: of all routes that contain the address, the most specific one wins."""
    address = ipaddress.ip_address(destination)
    matches = [r for r in TABLE if address in r[0]]
    return max(matches, key=lambda r: r[0].prefixlen)


print("destination      route chosen         next hop            interface")
for destination in ("192.168.1.77", "192.168.2.20", "192.168.2.200", "192.168.9.9", "8.8.8.8"):
    network, hop, nic = route(destination)
    print(f"{destination:<16} {str(network):<20} {hop:<19} {nic}")

ttl = 4
print("\\na packet with TTL 4 crossing routers:")
for router in ("R1", "R2", "R3", "R4", "R5"):
    ttl -= 1
    print(f"  {router}: TTL is now {ttl}" + ("  -> dropped, an ICMP 'time exceeded' goes back" if ttl == 0 else ""))
    if ttl == 0:
        break`,
      { expected: 'destination      route chosen         next hop            interface\n192.168.1.77     192.168.1.0/24       directly connected  eth1\n192.168.2.20     192.168.2.0/24       directly connected  eth2\n192.168.2.200    192.168.2.128/25     192.168.2.130       eth2\n192.168.9.9      192.168.0.0/16       192.168.2.254       eth2\n8.8.8.8          0.0.0.0/0            203.0.113.1         eth0\n\na packet with TTL 4 crossing routers:\n  R1: TTL is now 3\n  R2: TTL is now 2\n  R3: TTL is now 1\n  R4: TTL is now 0  -> dropped, an ICMP \'time exceeded\' goes back', filename: 'routing.py', at: 'end' },
    ),
  ],
  [`${M}/6`]: [
    table(
      'url-anatomy',
      'Clients, servers and URLs',
      'A table that takes the URL https://www.example.com:443/search?q=network&page=2#results apart. The scheme https says which protocol; the host www.example.com says which computer; the port 443 says which program; the path /search says which resource; the query q=network&page=2 gives parameters; the fragment #results is a position in the page that is never sent to the server.',
      'Six parts, six jobs. Only the host needs DNS; only the fragment stays in the browser.',
      ['Part', 'Example', 'Meaning'],
      [
        ['Scheme', 'https', 'which protocol to use'],
        ['Host', 'www.example.com', 'which computer (DNS turns it into an IP address)'],
        ['Port', '443', 'which program on that computer'],
        ['Path', '/search', 'which resource on the server'],
        ['Query', 'q=network&page=2', 'extra parameters as name=value pairs'],
        ['Fragment', '#results', 'a position inside the page; never sent to the server'],
      ],
      { at: 'end', highlights: [{ row: 5, col: 2, tone: 'info', note: 'browser only' }] },
    ),
    sequence(
      'dns-sequence',
      'DNS: the phone book of the internet',
      'A sequence diagram of a DNS lookup with a cold cache. The browser asks the resolver for www.example.com. The resolver asks a root server, which answers with the .com servers. The resolver asks a .com server, which answers with the name server of example.com. The resolver asks that name server, which answers with the address 93.184.216.34 and a TTL of 300 seconds. The resolver caches the answer and passes it to the browser.',
      'Three questions, each one level deeper in the hierarchy. The resolver does the walking and the caching; the browser asks only once.',
      [['browser', 'Browser'], ['resolver', 'Resolver'], ['root', 'Root'], ['tld', '.com servers'], ['auth', 'Name server']],
      [
        { from: 'browser', to: 'resolver', label: 'www.example.com?', note: 'not in the cache' },
        { from: 'resolver', to: 'root', label: 'www.example.com?' },
        { from: 'root', to: 'resolver', label: 'ask the .com servers', dashed: true },
        { from: 'resolver', to: 'tld', label: 'www.example.com?' },
        { from: 'tld', to: 'resolver', label: 'ask ns.example.com', dashed: true },
        { from: 'resolver', to: 'auth', label: 'www.example.com?' },
        { from: 'auth', to: 'resolver', label: '93.184.216.34, TTL 300 s', dashed: true },
        { from: 'resolver', to: 'browser', label: '93.184.216.34', note: 'and cached for 300 s', dashed: true },
      ],
      { at: 'end' },
    ),
    compare(
      'http-messages',
      'HTTP: requests and responses',
      'Two tables side by side. The request has a request line, GET /about HTTP/1.1, then headers such as Host and Accept, an empty line and no body for a GET. The response has a status line, HTTP/1.1 200 OK, then headers such as Content-Type and Content-Length, an empty line and the body, an HTML page.',
      'Both messages have the same shape: a first line, headers, an empty line and a body.',
      { title: 'Request (client to server)', columns: ['Part', 'Example'], rows: [['Request line', 'GET /about HTTP/1.1'], ['Header', 'Host: www.example.com'], ['Header', 'Accept: text/html'], ['Empty line', ''], ['Body', '(none for GET)']] },
      { title: 'Response (server to client)', columns: ['Part', 'Example'], rows: [['Status line', 'HTTP/1.1 200 OK'], ['Header', 'Content-Type: text/html'], ['Header', 'Content-Length: 17'], ['Empty line', ''], ['Body', '<h1>About us</h1>']] },
      { arrowLabel: 'server answers', at: 'end' },
    ),
    table(
      'status-codes',
      'HTTP: requests and responses',
      'A table of common HTTP status codes by class. 200 OK is success. 301 Moved Permanently and 304 Not Modified are redirection. 400 Bad Request, 401 Unauthorized, 403 Forbidden and 404 Not Found are client errors. 500 Internal Server Error and 503 Service Unavailable are server errors.',
      'Read the first digit: 2 worked, 3 go elsewhere, 4 you asked wrongly, 5 the server failed.',
      ['Code', 'Name', 'Meaning'],
      [
        [200, 'OK', 'the request worked and the body is the answer'],
        [301, 'Moved Permanently', 'use the address in the Location header from now on'],
        [304, 'Not Modified', 'your cached copy is still good'],
        [400, 'Bad Request', 'the server could not understand the request'],
        [401, 'Unauthorized', 'you must log in first'],
        [403, 'Forbidden', 'you are known, but not allowed'],
        [404, 'Not Found', 'there is no such resource'],
        [500, 'Internal Server Error', 'the server program failed'],
        [503, 'Service Unavailable', 'the server is overloaded or down for maintenance'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 0, tone: 'good' }, { row: 1, col: 0, tone: 'info' }, { row: 2, col: 0, tone: 'info' }, { row: 3, col: 0, tone: 'warn' }, { row: 4, col: 0, tone: 'warn' }, { row: 5, col: 0, tone: 'warn' }, { row: 6, col: 0, tone: 'warn' }, { row: 7, col: 0, tone: 'bad' }, { row: 8, col: 0, tone: 'bad' }] },
    ),
    sequence(
      'tls-sequence',
      'HTTPS and TLS',
      'A sequence diagram of an HTTPS request. After the TCP handshake the browser sends a ClientHello with the ciphers it supports and a key share. The server answers with a ServerHello, its certificate, a key share and Finished. The browser checks the certificate against the authorities it trusts and sends Finished, and both sides now know the same session key. The HTTP request and the response then travel encrypted.',
      'The TLS handshake costs one round trip. From then on the request and the answer are encrypted with a key that only the two ends know.',
      [['browser', 'Browser'], ['server', 'Server']],
      [
        { from: 'browser', to: 'server', label: 'TCP handshake first', note: 'SYN, SYN-ACK, ACK' },
        { from: 'browser', to: 'server', label: 'ClientHello', note: 'ciphers and a key share' },
        { from: 'server', to: 'browser', label: 'ServerHello, certificate, Finished', note: 'the certificate proves the name', dashed: true },
        { from: 'browser', to: 'server', label: 'Finished', note: 'the certificate is checked; both now know the session key' },
        { from: 'browser', to: 'server', label: 'encrypted: GET /products' },
        { from: 'server', to: 'browser', label: 'encrypted: 200 OK and the page', dashed: true },
      ],
      { at: 'end' },
    ),
    tool(
      'devtools-network',
      'Developer tools and the cost of a request',
      'A launch card for the Network tab of the browser developer tools, with six steps: open the tools with F12, reload the page, click the first request, read the headers, read the timing of DNS, connection, TLS, waiting and download, and look at the certificate behind the padlock.',
      'Every browser has these tools built in. Use them to check the numbers of your Python tracer against a real request.',
      'Browser developer tools (Network tab)',
      'https://developer.chrome.com/docs/devtools/network',
      'Press F12 in any browser to open the developer tools. The Network tab lists every request of the page with its status, size and timing.',
      [
        'Open any web page and press F12 (or Ctrl+Shift+I; Cmd+Option+I on a Mac) to open the developer tools.',
        'Click the Network tab, then reload the page with Ctrl+R so that the requests are recorded.',
        'Click the first request in the list and open the Headers tab: find the method, the status code and the response headers.',
        'Open the Timing tab: find the DNS lookup, the initial connection, the TLS (SSL) handshake, the waiting for the server and the content download.',
        'Compare the longest step with the waterfall of your Python tracer. Which one dominates for a small page, and which for a large one?',
        'Click the padlock in the address bar and look at the certificate: who issued it, and until when is it valid?',
      ],
      { at: 'end' },
    ),
    lab(
      'dns-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program, a DNS resolver with a cache and TTL that walks the root, the TLD and the authoritative servers, run on five lookups at different times, with its expected output.',
      'Add lookups at t=299 and t=301 and decide which one is answered from the cache.',
      `ROOT = {"com": "tld-com"}                                  # the root servers know who runs each top-level domain
TLD = {"tld-com": {"example.com": "ns.example.com"}}       # the .com servers know the name server of each domain
AUTHORITATIVE = {"ns.example.com": {"www.example.com": ("93.184.216.34", 300), "mail.example.com": ("93.184.216.40", 600)}}


class Resolver:
    def __init__(self):
        self.cache = {}                                    # name -> (IP address, time when the entry expires)

    def lookup(self, name, now):
        if name in self.cache and self.cache[name][1] > now:
            return self.cache[name][0], ["answered from the cache"]
        top = name.rsplit(".", 1)[1]
        domain = ".".join(name.split(".")[-2:])
        tld_server = ROOT[top]
        name_server = TLD[tld_server][domain]
        address, ttl = AUTHORITATIVE[name_server][name]
        self.cache[name] = (address, now + ttl)            # keep the answer for its TTL
        return address, [f"root server: .{top} is run by {tld_server}",
                         f"{tld_server}: {domain} is run by {name_server}",
                         f"{name_server}: {name} is {address} (cache it for {ttl} s)"]


resolver = Resolver()
for now, name in ((0, "www.example.com"), (10, "www.example.com"), (10, "mail.example.com"), (400, "www.example.com"), (401, "www.example.com")):
    address, steps = resolver.lookup(name, now)
    print(f"t={now:>3} s  {name:<17} -> {address}")
    for step in steps:
        print(f"           {step}")`,
      { expected: 't=  0 s  www.example.com   -> 93.184.216.34\n           root server: .com is run by tld-com\n           tld-com: example.com is run by ns.example.com\n           ns.example.com: www.example.com is 93.184.216.34 (cache it for 300 s)\nt= 10 s  www.example.com   -> 93.184.216.34\n           answered from the cache\nt= 10 s  mail.example.com  -> 93.184.216.40\n           root server: .com is run by tld-com\n           tld-com: example.com is run by ns.example.com\n           ns.example.com: mail.example.com is 93.184.216.40 (cache it for 600 s)\nt=400 s  www.example.com   -> 93.184.216.34\n           root server: .com is run by tld-com\n           tld-com: example.com is run by ns.example.com\n           ns.example.com: www.example.com is 93.184.216.34 (cache it for 300 s)\nt=401 s  www.example.com   -> 93.184.216.34\n           answered from the cache', filename: 'resolver.py', at: 'end' },
    ),
    lab(
      'http-lab',
      'Example 3',
      'python',
      'A Python editor with the Example 3 program, a tiny web server that parses raw HTTP requests and builds responses with the status codes 200, 301, 401 and 404, with its expected output.',
      'Add a /contact page and a redirect from /old-contact, then request both.',
      `PAGES = {"/": "<h1>Home</h1>", "/about": "<h1>About us</h1>"}
REDIRECTS = {"/old-about": "/about"}
USERS = {"ana": "s3cret"}


def handle(raw_request):
    """A tiny web server: parse a raw HTTP request and build a raw HTTP response."""
    head, _, body = raw_request.partition("\\r\\n\\r\\n")
    request_line, *header_lines = head.split("\\r\\n")
    method, path, version = request_line.split(" ")
    headers = dict(line.split(": ", 1) for line in header_lines)
    extra = {}
    if method == "GET" and path in PAGES:
        status, text = "200 OK", PAGES[path]
    elif method == "GET" and path in REDIRECTS:
        status, text, extra = "301 Moved Permanently", "", {"Location": REDIRECTS[path]}
    elif method == "POST" and path == "/login":
        form = dict(pair.split("=") for pair in body.split("&"))
        ok = USERS.get(form.get("user")) == form.get("password")
        status, text = ("200 OK", "Welcome " + form["user"]) if ok else ("401 Unauthorized", "Wrong user or password")
    else:
        status, text = "404 Not Found", "No such page"
    lines = [f"HTTP/1.1 {status}", "Content-Type: text/html", f"Content-Length: {len(text.encode())}"]
    lines += [f"{name}: {value}" for name, value in extra.items()]
    return "\\r\\n".join(lines) + "\\r\\n\\r\\n" + text


def get(path):
    return f"GET {path} HTTP/1.1\\r\\nHost: www.example.com\\r\\nAccept: text/html"


request = get("/about")
print("--- request ---")
print(request.replace("\\r\\n", "\\n"))
print("--- response ---")
print(handle(request).replace("\\r\\n", "\\n"))

print("\\n--- more requests ---")
login = "POST /login HTTP/1.1\\r\\nHost: www.example.com\\r\\nContent-Type: application/x-www-form-urlencoded\\r\\n\\r\\n"
for raw in (get("/"), get("/old-about"), get("/missing"), login + "user=ana&password=s3cret", login + "user=ana&password=wrong"):
    head, _, body = raw.partition("\\r\\n\\r\\n")
    label = head.split("\\r\\n")[0] + (f"  [{body}]" if body else "")
    print(f"{label:<60} -> {handle(raw).split(chr(13) + chr(10))[0]}")`,
      { expected: '--- request ---\nGET /about HTTP/1.1\nHost: www.example.com\nAccept: text/html\n--- response ---\nHTTP/1.1 200 OK\nContent-Type: text/html\nContent-Length: 17\n\n<h1>About us</h1>\n\n--- more requests ---\nGET / HTTP/1.1                                               -> HTTP/1.1 200 OK\nGET /old-about HTTP/1.1                                      -> HTTP/1.1 301 Moved Permanently\nGET /missing HTTP/1.1                                        -> HTTP/1.1 404 Not Found\nPOST /login HTTP/1.1  [user=ana&password=s3cret]             -> HTTP/1.1 200 OK\nPOST /login HTTP/1.1  [user=ana&password=wrong]              -> HTTP/1.1 401 Unauthorized', filename: 'tiny_server.py', at: 'end' },
    ),
  ],
  [`${M}/7`]: [
    cards(
      'cia-triad',
      'Cybersecurity basics',
      'Three cards for the goals of security. Confidentiality: only the right people can read the data; threats are eavesdropping and stolen databases; defences are encryption and access control. Integrity: data cannot be changed without being noticed; threats are tampering and malware; defences are hashes, signatures and backups. Availability: the service works when needed; threats are denial of service and failures; defences are redundancy, updates and monitoring.',
      'The CIA triad: every security measure protects at least one of the three.',
      [
        { title: 'Confidentiality', subtitle: 'only the right people can read it', bullets: ['threat: eavesdropping, a stolen database', 'defence: encryption, access control, MFA'], tone: 'info' },
        { title: 'Integrity', subtitle: 'it cannot be changed unnoticed', bullets: ['threat: tampering, malware', 'defence: hashes, signatures, HMAC, backups'], tone: 'good' },
        { title: 'Availability', subtitle: 'it works when it is needed', bullets: ['threat: denial of service, failure', 'defence: redundancy, updates, monitoring'], tone: 'warn' },
      ],
      { at: 'end' },
    ),
    flow(
      'password-flow',
      'Authentication and passwords',
      'A four-step flow for storing a password safely. The typed password gets a random salt added, is run through a slow hash such as PBKDF2, bcrypt or Argon2, and only the salt and the resulting hash are stored. The password itself is never stored.',
      'Sign-up: the password is turned into a salted slow hash and then forgotten. Only the salt and the hash are kept.',
      ['Password|typed by the user|accent', 'Add a salt|random, different for each user|info', 'Slow hash|PBKDF2, bcrypt or Argon2|warn', 'Store|salt and hash, never the password|good'],
      { layout: 'row', perRow: 4, at: 'end' },
    ),
    flow(
      'login-flow',
      'Authentication and passwords',
      'A four-step flow for checking a login. The typed password is combined with the salt that is stored for that user, run through the same slow hash, and the result is compared with the stored hash. If they are equal, the user is authenticated; if not, the login is denied.',
      'Login: repeat the calculation with the stored salt and compare. No password is ever stored, so none can be leaked.',
      ['Typed password|plus the user’s stored salt|accent', 'Same slow hash|PBKDF2, bcrypt or Argon2|warn', 'Compare|with the stored hash|info', 'Granted or denied|equal means granted|good'],
      { layout: 'row', perRow: 4, at: 'end' },
    ),
    V(
      'chart',
      'entropy-chart',
      'Authentication and passwords',
      'A bar chart of password strength in bits of entropy. Eight lowercase letters give 37.6 bits, eight letters and digits 47.6, four random words 51.7, twelve mixed characters 78.7 and six random words 77.5. Length matters more than complexity: six random words are about as strong as twelve random symbols.',
      'Each extra bit doubles the number of guesses. Length and true randomness beat clever substitutions.',
      {
        kind: 'bar',
        xLabel: 'Password',
        yLabel: 'Bits of entropy',
        categories: ['8 lowercase', '8 letters + digits', '4 random words', '12 mixed characters', '6 random words'],
        series: [{ name: 'Entropy (bits)', values: [37.6, 47.6, 51.7, 78.7, 77.5] }],
      },
      { at: 'end' },
    ),
    table(
      'rbac-matrix',
      'Authorisation and access control',
      'A role-based access control table. A student may read courses but not write grades or configure the server. A teacher may read courses and write grades. An admin may read courses, write grades and configure the server. Permissions belong to roles, and users are put into roles.',
      'RBAC in one table: give permissions to roles, then put people into roles. Nobody gets more than the job needs.',
      ['Role', 'courses.read', 'grades.write', 'server.configure'],
      [
        ['student', 'yes', 'no', 'no'],
        ['teacher', 'yes', 'yes', 'no'],
        ['admin', 'yes', 'yes', 'yes'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 1, tone: 'good' }, { row: 0, col: 2, tone: 'bad' }, { row: 0, col: 3, tone: 'bad' }, { row: 1, col: 1, tone: 'good' }, { row: 1, col: 2, tone: 'good' }, { row: 1, col: 3, tone: 'bad' }, { row: 2, col: 1, tone: 'good' }, { row: 2, col: 2, tone: 'good' }, { row: 2, col: 3, tone: 'good' }] },
    ),
    table(
      'crypto-families',
      'Cryptography',
      'A table of the three families of cryptography. A hash function has no key, is one-way, and is used for integrity and password storage; an example is SHA-256. Symmetric encryption has one shared key, can be reversed with the key, and encrypts bulk data; an example is AES. Public-key cryptography has a public and a private key, and is used for key exchange and signatures; examples are RSA and elliptic curves.',
      'Three tools, three jobs. A hash is not encryption, because nothing can undo it.',
      ['Family', 'Keys', 'Example', 'Used for', 'Reversible?'],
      [
        ['Hash', 'none', 'SHA-256', 'integrity, password storage, signatures', 'no, never'],
        ['Symmetric encryption', 'one shared key', 'AES', 'encrypting data in bulk', 'yes, with the key'],
        ['Public-key cryptography', 'public key and private key', 'RSA, elliptic curves', 'key exchange, digital signatures', 'yes, with the other key'],
      ],
      { at: 'end' },
    ),
    flow(
      'public-key-flow',
      'Cryptography',
      'A four-step flow of public-key encryption. Bob makes a key pair and publishes his public key. Alice encrypts her message with Bob’s public key. The ciphertext travels over the network where anyone can see it. Bob decrypts it with his private key, which only he has.',
      'Anyone can lock the box with Bob’s public key; only Bob has the key that opens it.',
      ['Bob|makes a key pair and publishes the public key|accent', 'Alice|encrypts with Bob’s public key|info', 'The ciphertext|travels; anyone can see it|warn', 'Bob|decrypts with his private key|good'],
      { layout: 'row', perRow: 4, at: 'end' },
    ),
    lab(
      'hash-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program that computes SHA-256 hashes, measures the avalanche effect and stores two equal passwords as different salted PBKDF2 hashes, with its expected output.',
      'Hash your own name, then your name with one letter changed, and compare the first 20 hex digits.',
      `import hashlib


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


print("A hash has a fixed length and no way back")
for text in ("hello", "hello!", "Hello", "a" * 1000):
    print(f"  {text[:10]:<12} ({len(text):>4} chars) -> {sha(text)[:20]}...")

a, b = sha("pay Ana 100 taka"), sha("pay Ana 900 taka")
different_bits = bin(int(a, 16) ^ int(b, 16)).count("1")
print(f"\\nchanging one character flips {different_bits} of the 256 bits (the avalanche effect)")

print("\\nStoring passwords: the salt makes equal passwords look different")
for user, salt in (("ana", b"s9a7"), ("ben", b"k2d5")):
    stored = hashlib.pbkdf2_hmac("sha256", b"Lumexa2025", salt, 10_000).hex()
    print(f"  {user}: salt {salt.decode()}  hash {stored[:24]}...")


def check(password, salt, stored):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 10_000).hex() == stored


stored = hashlib.pbkdf2_hmac("sha256", b"Lumexa2025", b"s9a7", 10_000).hex()
print("\\nlogin with the right password:", check("Lumexa2025", b"s9a7", stored))
print("login with a wrong password:  ", check("lumexa2025", b"s9a7", stored))`,
      { expected: 'A hash has a fixed length and no way back\n  hello        (   5 chars) -> 2cf24dba5fb0a30e26e8...\n  hello!       (   6 chars) -> ce06092fb948d9ffac7d...\n  Hello        (   5 chars) -> 185f8db32271fe25f561...\n  aaaaaaaaaa   (1000 chars) -> 41edece42d63e8d9bf51...\n\nchanging one character flips 124 of the 256 bits (the avalanche effect)\n\nStoring passwords: the salt makes equal passwords look different\n  ana: salt s9a7  hash 456d3b8cccc9f819b98b8ce2...\n  ben: salt k2d5  hash add5370a8a7abc0cc83961db...\n\nlogin with the right password: True\nlogin with a wrong password:   False', filename: 'hashing.py', at: 'end' },
    ),
    lab(
      'cipher-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program, a Caesar cipher with a brute-force attack and a frequency analysis, with its expected output.',
      'Encrypt your own sentence with the shift 7 and let a classmate break it.',
      `import string

LETTERS = string.ascii_uppercase


def caesar(text, shift):
    """Move every letter \`shift\` places along the alphabet; leave everything else alone."""
    out = []
    for ch in text.upper():
        out.append(LETTERS[(LETTERS.index(ch) + shift) % 26] if ch in LETTERS else ch)
    return "".join(out)


secret = caesar("WE MEET AT THE LIBRARY BEFORE THE EXAM TO REVISE THE SECURE NETWORK NOTES", 3)
print("encrypted:", secret)
print("decrypted:", caesar(secret, -3))

print("\\nan attacker simply tries all 25 keys:")
for shift in (1, 2, 3, 4):
    print(f"  shift {shift}: {caesar(secret, -shift)[:40]}...")
print("  ...")

counts = {letter: secret.count(letter) for letter in LETTERS}
commonest = max(counts, key=counts.get)
print(f"\\nfrequency analysis: the commonest letter is {commonest}; if it stands for E, the shift is {(LETTERS.index(commonest) - LETTERS.index('E')) % 26}")`,
      { expected: 'encrypted: ZH PHHW DW WKH OLEUDUB EHIRUH WKH HADP WR UHYLVH WKH VHFXUH QHWZRUN QRWHV\ndecrypted: WE MEET AT THE LIBRARY BEFORE THE EXAM TO REVISE THE SECURE NETWORK NOTES\n\nan attacker simply tries all 25 keys:\n  shift 1: YG OGGV CV VJG NKDTCTA DGHQTG VJG GZCO V...\n  shift 2: XF NFFU BU UIF MJCSBSZ CFGPSF UIF FYBN U...\n  shift 3: WE MEET AT THE LIBRARY BEFORE THE EXAM T...\n  shift 4: VD LDDS ZS SGD KHAQZQX ADENQD SGD DWZL S...\n  ...\n\nfrequency analysis: the commonest letter is H; if it stands for E, the shift is 3', filename: 'caesar.py', at: 'end' },
    ),
    lab(
      'caesar-js-lab',
      'Example 2',
      'javascript',
      'A JavaScript editor with the Caesar cipher program that encrypts and decrypts a message with the shift 3, with its expected output.',
      'Change the shift to 13 and encrypt the result a second time. What do you get?',
      `function caesar(text, shift) {
  const A = 65;
  return [...text.toUpperCase()]
    .map((ch) => (ch >= "A" && ch <= "Z" ? String.fromCharCode(((ch.charCodeAt(0) - A + shift + 26) % 26) + A) : ch))
    .join("");
}

const secret = caesar("MEET ME AT THE LIBRARY AT NOON", 3);
console.log("encrypted:", secret);
console.log("decrypted:", caesar(secret, -3));`,
      { expected: 'encrypted: PHHW PH DW WKH OLEUDUB DW QRRQ\ndecrypted: MEET ME AT THE LIBRARY AT NOON', filename: 'caesar.js', at: 'end' },
    ),
    lab(
      'rsa-lab',
      'Example 3',
      'python',
      'A Python editor with the Example 3 program, a toy RSA with the primes 61 and 53 that encrypts, decrypts, signs and verifies, and then breaks the key by factoring, with its expected output.',
      'Use the primes 101 and 103 with e = 7 and check that decryption still works.',
      `p, q = 61, 53                                  # two secret primes (real keys use primes with hundreds of digits)
n = p * q                                      # 3233: part of both keys
phi = (p - 1) * (q - 1)                        # 3120: needed to build the private key
e = 17                                         # the public exponent
d = pow(e, -1, phi)                            # the private exponent: the inverse of e modulo phi
print(f"public key (n={n}, e={e}); private key d={d}")

message = "HI!"
numbers = [ord(ch) for ch in message]
encrypted = [pow(m, e, n) for m in numbers]    # anyone can encrypt with the public key
decrypted = "".join(chr(pow(c, d, n)) for c in encrypted)
print(f"message {message!r} -> numbers {numbers} -> encrypted {encrypted}")
print(f"decrypted with the private key: {decrypted!r}")

digest = sum(numbers) % n                      # a (very weak) stand-in for a hash of the message
signature = pow(digest, d, n)                  # only the owner of d can sign
print(f"\\nsignature of {message!r}: {signature}; anyone can verify it:", pow(signature, e, n) == digest)
tampered = sum(ord(ch) for ch in "HI?") % n
print("signature of a changed message is accepted:", pow(signature, e, n) == tampered)

print("\\nbreaking the key means factoring n:")
for guess in range(2, n):
    if n % guess == 0:
        print(f"  {n} = {guess} x {n // guess} found after {guess - 1} tries; for a 2048-bit n this is impossible in practice")
        break`,
      { expected: 'public key (n=3233, e=17); private key d=2753\nmessage \'HI!\' -> numbers [72, 73, 33] -> encrypted [3000, 1486, 1853]\ndecrypted with the private key: \'HI!\'\n\nsignature of \'HI!\': 2055; anyone can verify it: True\nsignature of a changed message is accepted: False\n\nbreaking the key means factoring n:\n  3233 = 53 x 61 found after 52 tries; for a 2048-bit n this is impossible in practice', filename: 'rsa.py', at: 'end' },
    ),
  ],
  [`${M}/8`]: [
    table(
      'threats-table',
      'Network threats, seen from the defender’s side',
      'A table of eight network threats with what happens and the usual defence. Eavesdropping is fixed by HTTPS, VPN and WPA3. Spoofing by authentication and certificates. Man-in-the-middle by TLS with certificate checks. Denial of service by rate limiting and extra capacity. Port scanning by closing unused ports and a default-deny firewall. Brute force by MFA, lockouts and slow hashes. Phishing and malware by training and updates. Misconfiguration by hardening and review.',
      'Every threat has a defence at some layer. Most of the cheap ones are about configuration and habits, not gadgets.',
      ['Threat', 'What happens', 'Usual defence'],
      [
        ['Eavesdropping', 'someone reads unencrypted traffic', 'HTTPS, a VPN, WPA3 Wi-Fi'],
        ['Spoofing', 'a fake sender, DNS answer or hotspot', 'authentication, certificates, filtering'],
        ['Man-in-the-middle', 'an attacker sits between two parties', 'TLS with certificate checks'],
        ['Denial of service', 'a service is overloaded', 'rate limiting, spare capacity, a CDN'],
        ['Port scanning', 'probing many ports for open services', 'close unused ports, default-deny firewall'],
        ['Brute force', 'fast guessing of passwords', 'MFA, lockouts, slow password hashes'],
        ['Phishing, malware', 'users are tricked, harmful code runs', 'training, updates, least privilege'],
        ['Misconfiguration', 'default passwords, open test servers', 'hardening, review, inventory'],
      ],
      { at: 'end', highlights: [{ row: 7, col: 0, tone: 'warn', note: 'the most common cause of breaches' }] },
    ),
    grid(
      'firewall-zones',
      'Defences: firewalls, segmentation, detection and encryption',
      'A diagram of the router R1 acting as a firewall between the internet and four zones. From the internet only TCP port 443 to the servers is allowed. The servers accept port 443 from anyone and port 22 only from the management zone. The staff zone and the guest zone may only go out to the web and DNS. The management zone is for administrators. Everything else is denied by the default rule.',
      'Zones and a default-deny firewall: each arrow is something that the rules allow. Anything without an arrow is blocked.',
      [
        ['net', 'cloud', 'Internet', 2, 0, 'accent2', 'untrusted'],
        ['fw', 'rect', 'R1 firewall', 2, 1.2, 'warn', 'default deny'],
        ['staff', 'rect', 'Staff', 0, 2.6, 'accent', '192.168.10.0/25'],
        ['guests', 'rect', 'Guests', 1.33, 2.6, 'info', '192.168.10.128/26'],
        ['servers', 'rect', 'Servers', 2.67, 2.6, 'good', '192.168.10.192/27'],
        ['mgmt', 'rect', 'Management', 4, 2.6, 'accent', '192.168.10.224/28'],
      ],
      [
        ['net', 'fw', 'only tcp 443 to the servers'],
        ['fw', 'servers', '443 from anyone'],
        ['fw', 'staff', 'web and DNS out'],
        ['fw', 'guests', 'web and DNS out'],
        ['mgmt', 'fw', 'admins only'],
      ],
      { dx: 190, dy: 95, w: 160, at: 'end' },
    ),
    table(
      'stride-table',
      'Threat modelling',
      'A table of the six STRIDE threat categories. Spoofing breaks authentication; tampering breaks integrity; repudiation is denying an action and is countered with logs; information disclosure breaks confidentiality; denial of service breaks availability; elevation of privilege breaks authorisation. Each row gives an example and a typical control.',
      'STRIDE: six questions to ask about every part of a system.',
      ['Letter', 'Threat', 'Property broken', 'Example', 'Typical control'],
      [
        ['S', 'Spoofing', 'authentication', 'a forged login or sender', 'MFA, certificates'],
        ['T', 'Tampering', 'integrity', 'changing grades or a file', 'hashes, signatures, access control'],
        ['R', 'Repudiation', 'accountability', '“I never ran that command”', 'audit logs'],
        ['I', 'Information disclosure', 'confidentiality', 'a stolen database', 'encryption, least privilege'],
        ['D', 'Denial of service', 'availability', 'flooding a web server', 'rate limits, redundancy'],
        ['E', 'Elevation of privilege', 'authorisation', 'a guest reaching the servers', 'segmentation, RBAC'],
      ],
      { at: 'end' },
    ),
    table(
      'risk-matrix',
      'Threat modelling',
      'A risk matrix with likelihood on the horizontal axis and impact on the vertical axis, each low, medium or high. Low likelihood and low impact is a low risk; high likelihood and high impact is a high risk; the cells between are medium. Treat the high risks first.',
      'Likelihood against impact. The corner at the bottom right is where the money should go first.',
      ['Impact \\ Likelihood', 'Low', 'Medium', 'High'],
      [
        ['High', 'MEDIUM', 'HIGH', 'HIGH'],
        ['Medium', 'LOW', 'MEDIUM', 'HIGH'],
        ['Low', 'LOW', 'LOW', 'MEDIUM'],
      ],
      { at: 'end', highlights: [{ row: 0, col: 1, tone: 'warn' }, { row: 0, col: 2, tone: 'bad' }, { row: 0, col: 3, tone: 'bad' }, { row: 1, col: 1, tone: 'good' }, { row: 1, col: 2, tone: 'warn' }, { row: 1, col: 3, tone: 'bad' }, { row: 2, col: 1, tone: 'good' }, { row: 2, col: 2, tone: 'good' }, { row: 2, col: 3, tone: 'warn' }] },
    ),
    grid(
      'troubleshooting-flowchart',
      'Troubleshooting',
      'A flowchart of the troubleshooting ladder. Six questions in order: is the link up, is there a valid IP address, can the gateway be reached, can the internet be reached, does the name resolve, does the service answer. Each yes leads to the next question and each no leads to the fix for that step: fix the cable or Wi-Fi, check DHCP, check the router and switch, call the provider, fix the DNS setting, check the server and the firewall. After the last yes the problem is solved and gets documented.',
      'Start at the bottom layer and go up. The first question that gets a no is where the problem is.',
      [
        ['d1', 'decision', 'Link up?', 0, 0, 'accent', 'cable or Wi-Fi'],
        ['d2', 'decision', 'IP address?', 0, 1, 'accent', 'not 169.254.x.x'],
        ['d3', 'decision', 'Gateway?', 0, 2, 'accent', 'ping the router'],
        ['d4', 'decision', 'Internet?', 0, 3, 'accent', 'ping 8.8.8.8'],
        ['d5', 'decision', 'Name resolves?', 0, 4, 'accent', 'nslookup'],
        ['d6', 'decision', 'Service answers?', 0, 5, 'accent', 'curl or browser'],
        ['ok', 'terminator', 'Works', 0, 6, 'good', 'document it'],
        ['f1', 'rect', 'Fix cable or Wi-Fi', 2, 0, 'warn'],
        ['f2', 'rect', 'Check DHCP', 2, 1, 'warn'],
        ['f3', 'rect', 'Check router and switch', 2, 2, 'warn'],
        ['f4', 'rect', 'Call the provider', 2, 3, 'warn'],
        ['f5', 'rect', 'Fix the DNS setting', 2, 4, 'warn'],
        ['f6', 'rect', 'Check server and firewall', 2, 5, 'warn'],
      ],
      [
        ['d1', 'd2', 'yes'], ['d2', 'd3', 'yes'], ['d3', 'd4', 'yes'], ['d4', 'd5', 'yes'], ['d5', 'd6', 'yes'], ['d6', 'ok', 'yes'],
        ['d1', 'f1', 'no'], ['d2', 'f2', 'no'], ['d3', 'f3', 'no'], ['d4', 'f4', 'no'], ['d5', 'f5', 'no'], ['d6', 'f6', 'no'],
      ],
      { dx: 240, dy: 118, w: 210, h: 84, at: 'end' },
    ),
    table(
      'tools-table',
      'Troubleshooting',
      'A table of troubleshooting tools and the question that each answers. ipconfig or ip addr shows my address and gateway; ping shows whether a host is reachable and how long a round trip takes; traceroute or tracert shows the routers on the path; nslookup or dig shows what DNS answers; curl or the browser tools show what the web server answers; netstat or ss shows open ports and connections.',
      'One tool per question. Use the one that matches the step of the ladder where you are.',
      ['Tool', 'Question it answers', 'Example'],
      [
        ['ipconfig, ip addr', 'what are my IP address and gateway?', 'ip addr'],
        ['ping', 'is that host reachable, and how fast?', 'ping 192.168.10.1'],
        ['traceroute, tracert', 'which routers does my packet pass?', 'traceroute www.example.com'],
        ['nslookup, dig', 'what does DNS answer?', 'nslookup www.example.com'],
        ['curl, browser tools', 'what does the web server answer?', 'curl -I https://www.example.com'],
        ['netstat, ss', 'which ports are open, which connections exist?', 'ss -tln'],
      ],
      { at: 'end' },
    ),
    lab(
      'firewall-lab',
      'Example 1',
      'python',
      'A Python editor with the Example 1 program, a firewall rule engine that checks six rules from the top with the first match winning and a default deny, run on six packets, with its expected output.',
      'Move the staff browsing rule below the default deny and see what happens to staff web traffic.',
      `import ipaddress

ANY = ipaddress.ip_network("0.0.0.0/0")
STAFF = ipaddress.ip_network("192.168.10.0/25")
GUESTS = ipaddress.ip_network("192.168.10.128/26")
SERVERS = ipaddress.ip_network("192.168.10.192/27")

# action, protocol, source network, destination network, destination port (None = any); checked from the top
RULES = [
    ("allow", "tcp", ANY, SERVERS, 443),               # anybody may use the secure web server
    ("allow", "tcp", STAFF, SERVERS, 22),              # only staff may administer the servers
    ("allow", "udp", STAFF, ANY, 53),                  # staff may ask DNS questions
    ("allow", "tcp", STAFF, ANY, 443),                 # staff may browse
    ("allow", "tcp", GUESTS, ANY, 443),                # guests may browse, nothing else
    ("deny", "any", ANY, ANY, None),                   # default deny: everything else is blocked
]


def decide(protocol, source, destination, port):
    """The first rule that matches decides."""
    for number, (action, proto, src, dst, rule_port) in enumerate(RULES, start=1):
        if (proto in ("any", protocol) and ipaddress.ip_address(source) in src
                and ipaddress.ip_address(destination) in dst and rule_port in (None, port)):
            return number, action
    return len(RULES), "deny"


PACKETS = [
    ("tcp", "198.51.100.7", "192.168.10.200", 443, "stranger opens the secure web server"),
    ("tcp", "198.51.100.7", "192.168.10.200", 22, "stranger tries SSH to the server"),
    ("tcp", "192.168.10.45", "192.168.10.200", 22, "a staff PC administers the server"),
    ("tcp", "192.168.10.150", "192.168.10.200", 22, "a guest tries SSH to the server"),
    ("udp", "192.168.10.45", "8.8.8.8", 53, "a staff PC asks DNS"),
    ("tcp", "192.168.10.45", "93.184.216.34", 23, "a staff PC uses telnet (unencrypted)"),
]
print("rule  decision  packet")
for protocol, source, destination, port, why in PACKETS:
    number, action = decide(protocol, source, destination, port)
    packet = f"{protocol} {source} -> {destination}:{port}"
    print(f"{number:>4}  {action.upper():<8}  {packet:<44} {why}")`,
      { expected: 'rule  decision  packet\n   1  ALLOW     tcp 198.51.100.7 -> 192.168.10.200:443       stranger opens the secure web server\n   6  DENY      tcp 198.51.100.7 -> 192.168.10.200:22        stranger tries SSH to the server\n   2  ALLOW     tcp 192.168.10.45 -> 192.168.10.200:22       a staff PC administers the server\n   6  DENY      tcp 192.168.10.150 -> 192.168.10.200:22      a guest tries SSH to the server\n   3  ALLOW     udp 192.168.10.45 -> 8.8.8.8:53              a staff PC asks DNS\n   6  DENY      tcp 192.168.10.45 -> 93.184.216.34:23        a staff PC uses telnet (unencrypted)', filename: 'firewall.py', at: 'end' },
    ),
    lab(
      'risk-lab',
      'Example 2',
      'python',
      'A Python editor with the Example 2 program, a threat model that scores six threats by likelihood times impact, ranks them and labels them high, medium or low, with its expected output.',
      'Add the threat \'an unpatched server is taken over\' with likelihood 3 and impact 5 and see where it ranks.',
      `# threat, STRIDE category, likelihood 1-5, impact 1-5
THREATS = [
    ("phishing e-mail steals a staff password", "Spoofing", 4, 4),
    ("stolen password database", "Information disclosure", 2, 5),
    ("denial of service against the web server", "Denial of service", 3, 4),
    ("someone changes grades without permission", "Tampering", 2, 5),
    ("guest Wi-Fi used to reach the servers", "Elevation of privilege", 3, 3),
    ("an admin denies running a command", "Repudiation", 1, 2),
]


def level(score):
    return "HIGH" if score >= 15 else "MEDIUM" if score >= 8 else "LOW"


print("risk = likelihood x impact")
print("risk  level   likelihood  impact  threat (STRIDE)")
for name, stride, likelihood, impact in sorted(THREATS, key=lambda t: t[2] * t[3], reverse=True):
    score = likelihood * impact
    print(f"{score:>4}  {level(score):<6}  {likelihood:>10}  {impact:>6}  {name} ({stride})")
high = [t[0] for t in THREATS if level(t[2] * t[3]) == "HIGH"]
print(f"\\n{len(high)} high risk(s) to treat first")`,
      { expected: 'risk = likelihood x impact\nrisk  level   likelihood  impact  threat (STRIDE)\n  16  HIGH             4       4  phishing e-mail steals a staff password (Spoofing)\n  12  MEDIUM           3       4  denial of service against the web server (Denial of service)\n  10  MEDIUM           2       5  stolen password database (Information disclosure)\n  10  MEDIUM           2       5  someone changes grades without permission (Tampering)\n   9  MEDIUM           3       3  guest Wi-Fi used to reach the servers (Elevation of privilege)\n   2  LOW              1       2  an admin denies running a command (Repudiation)\n\n1 high risk(s) to treat first', filename: 'threat_model.py', at: 'end' },
    ),
    lab(
      'log-lab',
      'Example 3',
      'python',
      'A Python editor with the Example 3 program that analyses a log, counts failed logins per address and the distinct ports probed, and flags a brute-force attempt and a port scan, with its expected output.',
      'Add six failures from a new address and check that it is flagged; then change the threshold to 7.',
      `from collections import Counter, defaultdict

LOG = """\\
10:00:01 FAIL ana from 203.0.113.9 port 22
10:00:03 OK ben from 192.168.10.45 port 22
10:00:04 FAIL ana from 203.0.113.9 port 22
10:00:05 FAIL admin from 203.0.113.9 port 22
10:00:06 FAIL root from 203.0.113.9 port 22
10:00:07 FAIL ana from 203.0.113.9 port 22
10:00:08 FAIL cara from 203.0.113.9 port 22
10:01:10 FAIL ben from 192.168.10.45 port 22
10:02:00 OK cara from 192.168.10.30 port 443
10:03:00 PROBE - from 198.51.100.7 port 21
10:03:00 PROBE - from 198.51.100.7 port 22
10:03:01 PROBE - from 198.51.100.7 port 23
10:03:01 PROBE - from 198.51.100.7 port 25
10:03:01 PROBE - from 198.51.100.7 port 80
10:03:02 PROBE - from 198.51.100.7 port 443
10:03:02 PROBE - from 198.51.100.7 port 3389"""

failures, ports = Counter(), defaultdict(set)
for line in LOG.splitlines():
    time, kind, user, _, address, _, port = line.split()
    if kind == "FAIL":
        failures[address] += 1
    if kind == "PROBE":
        ports[address].add(int(port))

print("failed logins per address")
for address, count in failures.most_common():
    verdict = "BRUTE-FORCE SUSPECT: block it" if count >= 5 else "probably a typing mistake"
    print(f"  {address:<15} {count} failures  {verdict}")
print("\\ndistinct ports touched per address")
for address, touched in ports.items():
    verdict = "PORT SCAN: block it" if len(touched) >= 5 else "normal"
    print(f"  {address:<15} {len(touched)} ports  {verdict}")`,
      { expected: 'failed logins per address\n  203.0.113.9     6 failures  BRUTE-FORCE SUSPECT: block it\n  192.168.10.45   1 failures  probably a typing mistake\n\ndistinct ports touched per address\n  198.51.100.7    7 ports  PORT SCAN: block it', filename: 'log_analysis.py', at: 'end' },
    ),
  ],
  // @@visuals-end
});

registerQuizCatalog({
  [`${M}/1`]: [
    mcq('q1', 'Why can an ordinary program not read the disk directly?', ['It runs in user mode, so only the kernel may use the hardware and the program must make a system call', 'Disks can only be read by the shell', 'Programs are not fast enough to read a disk', 'The disk can only be read while the computer starts'], 'The CPU runs programs in user mode, where hardware instructions are forbidden. The kernel, in kernel mode, performs the access when a program asks for it through a system call such as read.'),
    mcq('q2', 'What does this program print?', ['terminated', 'ready', 'waiting', 'running'], 'The process is dispatched (running), waits for I/O (waiting), the I/O completes (ready), it is dispatched again (running) and then exits (terminated).', PY('moves = {("ready", "dispatch"): "running", ("running", "io_wait"): "waiting",\n         ("waiting", "io_done"): "ready", ("running", "exit"): "terminated"}\nstate = "ready"\nfor event in ["dispatch", "io_wait", "io_done", "dispatch", "exit"]:\n    state = moves[(state, event)]\nprint(state)')),
    mcq('q3', 'What is the difference between a program and a process?', ['A program is a file with instructions; a process is a program that is running, with its own memory, PID and state', 'There is no difference', 'A process is the file on the disk and a program is the running copy', 'A program always has exactly one process'], 'The same program can be started several times: each run is a separate process with its own PID and memory, while the program file stays unchanged on the disk.'),
    mcq('q4', 'When a process that is waiting for a key press gets its key, what happens next?', ['It moves to the ready state and waits until the scheduler dispatches it', 'It moves straight to the running state', 'It is terminated', 'It moves back to the new state'], 'A waiting process becomes ready when its event happens. Only the scheduler can move a ready process to running, because another process may be using the CPU.'),
    mcq('q5', 'What does this program print?', ['3 4', '2 3', '3 3', '4 4'], 'The PIDs are handed out in order: init gets 1, shell gets 2 and editor gets 3, and then next_pid is 4.', PY('pids = {}\nnext_pid = 1\nfor name in ["init", "shell", "editor"]:\n    pids[name] = next_pid\n    next_pid += 1\nprint(pids["editor"], next_pid)')),
  ],
  [`${M}/2`]: [
    mcq('q1', 'What does this program print?', ['6.5', '26.0', '4.0', '13.0'], 'With FCFS the waiting times are the sum of the earlier bursts: 0, 6, 8 and 12. Their sum is 26 and the average of the four is 26 / 4 = 6.5.', PY('bursts = [6, 2, 4, 3]          # all arrive at time 0, served in this order\ntime, waits = 0, []\nfor burst in bursts:\n    waits.append(time)\n    time += burst\nprint(sum(waits) / len(waits))')),
    mcq('q2', 'What do the threads of one process share?', ['The code, the global data and the heap', 'The stack and the registers', 'Only the program counter', 'Nothing: each thread has its own memory'], 'Threads live in the same address space, so they share code, global variables and the heap. Each thread keeps its own stack, registers and program counter.'),
    mcq('q3', 'Two threads each run counter = counter + 1 on a shared counter that starts at 0, with no lock. Which final values are possible?', ['1 or 2', 'Only 2', 'Only 1', '0, 1 or 2'], 'If the threads run one after the other the result is 2. If both load 0 before either stores, both store 1 and one update is lost. A final value of 0 is impossible because each thread stores at least 1.'),
    mcq('q4', 'What does this program print?', ['12 7', '14 9', '12 5', '7 12'], 'Turnaround time is finish minus arrival: 14 - 2 = 12. Waiting time is turnaround minus burst: 12 - 5 = 7.', PY('arrival, burst, finish = 2, 5, 14\nprint(finish - arrival, finish - arrival - burst)')),
    mcq('q5', 'Which measure removes the possibility of a circular wait between locks?', ['Making every thread take its locks in the same global order', 'Giving every thread a larger stack', 'Using a smaller time quantum', 'Adding more CPU cores'], 'If all threads acquire locks in one fixed order, a thread can never hold a later lock while waiting for an earlier one, so no cycle of waiting threads can form. More cores or a different quantum do not change who waits for whom.'),
  ],
  [`${M}/3`]: [
    mcq('q1', 'What does this program print?', ['1076', '2100', '1024', '52'], 'divmod(2100, 1024) gives page 2 and offset 52. The page table maps page 2 to frame 1, so the physical address is 1 × 1024 + 52 = 1076. The offset is copied, not translated.', PY('page_size = 1024\ntable = {0: 4, 1: 9, 2: 1}\naddress = 2100\npage, offset = divmod(address, page_size)\nprint(table[page] * page_size + offset)')),
    mcq('q2', 'What happens on a page fault?', ['The OS loads the missing page from disk into a frame, updates the page table and restarts the instruction', 'The program is always terminated', 'The CPU skips the instruction', 'The computer restarts'], 'A page fault is a normal event in demand paging: the page is valid but not in RAM. The kernel brings it in, which may take milliseconds, and the program continues as if nothing had happened.'),
    mcq('q3', 'What does this program print?', ['4', '3', '5', '2'], 'With 2 frames and LRU: 1 misses; 2 misses; 1 hits; 3 misses and evicts 2; 2 misses and evicts 1. That is 4 faults.', PY('refs, frames, memory, faults = [1, 2, 1, 3, 2], 2, [], 0\nfor page in refs:\n    if page in memory:\n        memory.remove(page)\n    else:\n        faults += 1\n        if len(memory) == frames:\n            memory.pop(0)\n    memory.append(page)\nprint(faults)')),
    mcq('q4', 'Why does a file of 1 byte use a whole 4096-byte block on the disk?', ['A file system allocates whole blocks, so the unused rest of the last block is wasted (internal fragmentation)', 'The file system adds 4095 bytes of padding for safety', 'A block can hold only files of exactly 4096 bytes', 'Small files are always compressed to one block'], 'The block is the unit of allocation. The file needs at least one block, and what it does not use inside that block cannot be given to another file: this is internal fragmentation.'),
    mcq('q5', 'Which statement about virtual memory is correct?', ['It lets a process use more memory than the RAM installed, by keeping only the pages in use in RAM', 'It makes the RAM physically larger', 'It means that all processes share the same addresses', 'It stores the whole program in the CPU cache'], 'Virtual memory keeps rarely used pages on the disk and brings them into RAM on demand, so the total virtual memory of all processes can be larger than the RAM. The price is the speed of the disk when a page fault occurs.'),
  ],
  [`${M}/4`]: [
    mcq('q1', 'Which OSI layer is responsible for IP addresses and routing between networks?', ['The network layer (layer 3)', 'The data link layer (layer 2)', 'The transport layer (layer 4)', 'The application layer (layer 7)'], 'Layer 3 adds the IP addresses in the packet header, and routers use them to choose where to send each packet next. Layer 2 uses MAC addresses and layer 4 uses port numbers.'),
    mcq('q2', 'What does this program print?', ['154 35', '100 54', '154 54', '54 35'], 'The headers are 14 + 20 + 20 = 54 bytes, so the frame is 54 + 100 = 154 bytes. The overhead is 54 / 154, which is about 35 percent.', PY('headers = 14 + 20 + 20\npayload = 100\nprint(headers + payload, round(100 * headers / (headers + payload)))')),
    mcq('q3', 'A switch receives a frame whose destination MAC address is not in its table. What does it do?', ['It floods the frame out of every port except the one it arrived on', 'It drops the frame', 'It sends the frame back to the sender', 'It asks the router for the address'], 'With an unknown destination the switch cannot choose one port, so it floods. The real destination answers, and the switch learns its port from the source address of that answer.'),
    mcq('q4', 'What does this program print?', ['Application > Transport > Network > Data link', 'Application > Network > Transport > Data link', 'Data link > Network > Transport > Application', '7 > 4 > 3 > 2'], 'The dictionary translates each layer number into its name, and join puts " > " between them. The numbers 7, 4, 3 and 2 are the application, transport, network and data link layers.', PY('layers = {1: "Physical", 2: "Data link", 3: "Network", 4: "Transport", 5: "Session", 6: "Presentation", 7: "Application"}\nstack = [7, 4, 3, 2]\nprint(" > ".join(layers[n] for n in stack))')),
    mcq('q5', 'Which device connects two different networks and forwards packets by IP address?', ['A router', 'A switch', 'A hub', 'A network cable'], 'A router has an interface in each network and chooses the next hop from the destination IP address. A switch only forwards frames inside one LAN, and a hub repeats everything to everybody.'),
  ],
  [`${M}/5`]: [
    mcq('q1', 'What does this program print?', ['30 192.168.1.31', '32 192.168.1.32', '30 192.168.1.30', '29 192.168.1.31'], 'A /27 has 2^5 = 32 addresses. Two of them (the network address and the broadcast address) are not usable, so 30 hosts. The broadcast address is the last address of 192.168.1.0 to 192.168.1.31.', PY('import ipaddress\nnet = ipaddress.ip_network("192.168.1.0/27")\nprint(net.num_addresses - 2, net.broadcast_address)')),
    mcq('q2', 'How many usable host addresses does a /28 subnet have?', ['14', '16', '28', '30'], 'A /28 leaves 4 host bits, so 2^4 = 16 addresses. The first (network) and the last (broadcast) are reserved, which leaves 14.'),
    mcq('q3', 'What does this program print?', ['10.1.0.0/16', '10.0.0.0/8', '0.0.0.0/0', '10.1.2.3/32'], 'The address 10.1.2.3 matches all three routes. A router uses the longest prefix, the most specific route, and /16 is longer than /8 and /0.', PY('import ipaddress\nroutes = ["10.0.0.0/8", "10.1.0.0/16", "0.0.0.0/0"]\naddress = ipaddress.ip_address("10.1.2.3")\nnetworks = [ipaddress.ip_network(r) for r in routes]\nbest = max((n for n in networks if address in n), key=lambda n: n.prefixlen)\nprint(best)')),
    mcq('q4', 'Why does a live video call normally use UDP and not TCP?', ['A late packet is useless, and TCP would delay the video by waiting to resend lost data', 'UDP is more reliable than TCP', 'TCP cannot carry video', 'UDP encrypts the video automatically'], 'In a live call, data that arrives late is worthless. UDP sends everything immediately and accepts occasional losses, while TCP would stall the stream until a lost segment has been resent.'),
    mcq('q5', 'What is the order of the TCP three-way handshake?', ['SYN, SYN-ACK, ACK', 'ACK, SYN, SYN-ACK', 'SYN, ACK, FIN', 'SYN-ACK, SYN, ACK'], 'The client sends SYN, the server replies with SYN-ACK (it acknowledges the SYN and sends its own), and the client confirms with ACK. Then the connection is open and data can flow.'),
  ],
  [`${M}/6`]: [
    mcq('q1', 'What does DNS do?', ['It turns a host name into an IP address', 'It encrypts the connection to a website', 'It downloads the web page', 'It stores cookies in the browser'], 'DNS is the phone book of the internet: it maps names such as www.example.com to IP addresses. The page itself is fetched afterwards with HTTP.'),
    mcq('q2', 'What does this program print?', ['shop.example.com 8443 [\'7\']', 'shop.example.com 443 [\'7\']', 'shop.example.com 8443 7', 'cart 8443 [\'7\']'], 'urlparse gives the host shop.example.com and the explicit port 8443. parse_qs returns a dictionary of lists, so the value of id is the list [\'7\'].', PY('from urllib.parse import urlparse, parse_qs\nu = urlparse("https://shop.example.com:8443/cart?id=7&lang=en")\nprint(u.hostname, u.port, parse_qs(u.query)["id"])')),
    mcq('q3', 'A web server answers a request with the status code 404. What does it mean?', ['The server works, but the requested resource does not exist', 'The server program crashed', 'The password was wrong', 'The connection was not encrypted'], 'A 4xx code is a client error: the request was understood, but there is no resource at that path. A server failure would be 5xx, and a wrong password is usually 401.'),
    mcq('q4', 'What does HTTPS add to HTTP?', ['Encryption, integrity and authentication of the server with a certificate (TLS)', 'A faster connection', 'A guarantee that the website owner is honest', 'Automatic protection against viruses'], 'HTTPS is HTTP inside TLS: others on the path cannot read or change the data, and the certificate proves that the server owns the name. It says nothing about whether the site itself can be trusted.'),
    mcq('q5', 'What does this program print?', ['success client error server error', 'redirect client error success', 'success server error client error', '2 4 5'], 'The code is divided by 100 with integer division, which leaves the class: 200 gives 2 (success), 404 gives 4 (client error) and 503 gives 5 (server error).', PY('def kind(code):\n    return {2: "success", 3: "redirect", 4: "client error", 5: "server error"}[code // 100]\n\n\nprint(kind(200), kind(404), kind(503))')),
  ],
  [`${M}/7`]: [
    mcq('q1', 'Why should a website store a salted, slow hash of your password instead of the password itself?', ['A stolen database then does not reveal the passwords, equal passwords look different, and guessing is slow', 'It makes the website load faster', 'It lets the website e-mail you your password if you forget it', 'It encrypts the password so the website can read it later'], 'A hash cannot be reversed, so the stolen database holds no passwords. The salt makes equal passwords produce different hashes, and a slow hash makes every guess expensive for the attacker.'),
    mcq('q2', 'What does this program print?', ['37.6 56.4', '37.6 47.6', '8.0 12.0', '208 312'], 'The entropy of random lowercase letters is length × log2(26), and log2(26) is about 4.70. So 8 letters give 37.6 bits and 12 letters give 56.4 bits.', PY('import math\nprint(round(8 * math.log2(26), 1), round(12 * math.log2(26), 1))')),
    mcq('q3', 'Which statement is correct?', ['Authentication proves who you are; authorisation decides what you may do', 'Authentication decides what you may do; authorisation proves who you are', 'They mean the same thing', 'Authorisation is only needed for administrators'], 'A login (authentication) only identifies you. After that, the access control policy (authorisation) decides which resources you may read or change.'),
    mcq('q4', 'What does this program print?', ['DEF UVW', 'XYZ ABC', 'DEF XYZ', 'ABC UVW'], 'Shifting A, B, C forward by 3 gives D, E, F. Shifting X, Y, Z backward by 3 gives U, V, W. The modulo 26 keeps the letters inside the alphabet.', PY('print("".join(chr((ord(c) - 65 + 3) % 26 + 65) for c in "ABC"), "".join(chr((ord(c) - 65 - 3) % 26 + 65) for c in "XYZ"))')),
    mcq('q5', 'With public-key cryptography, which key does Alice use to send Bob a secret message?', ['Bob’s public key', 'Alice’s private key', 'Bob’s private key', 'Alice’s public key'], 'Anyone may encrypt with Bob’s public key, but only Bob has the private key that decrypts the message. Alice’s private key would be used to sign, not to keep a message secret.'),
  ],
  [`${M}/8`]: [
    mcq('q1', 'A firewall checks its rules from the top and the first matching rule wins. What should the last rule be?', ['A rule that denies everything that no earlier rule allowed (default deny)', 'A rule that allows everything', 'A rule that logs the traffic and allows it', 'There should be no last rule'], 'With default deny, anything that was not explicitly allowed is blocked, so a forgotten or new service stays closed. A final allow-all rule would make the whole list pointless.'),
    mcq('q2', 'What does this program print?', ['phishing 16', 'DDoS 10', 'weak Wi-Fi password 9', 'phishing 4'], 'The risk of each threat is likelihood × impact: phishing 4 × 4 = 16, DDoS 2 × 5 = 10, weak Wi-Fi password 3 × 3 = 9. The largest is phishing, with 16.', PY('threats = {"phishing": (4, 4), "DDoS": (2, 5), "weak Wi-Fi password": (3, 3)}\nscores = {name: l * i for name, (l, i) in threats.items()}\nprint(max(scores, key=scores.get), max(scores.values()))')),
    mcq('q3', 'A user can ping 8.8.8.8 but cannot open any website by name. What is the most likely problem?', ['DNS: the names are not being resolved to IP addresses', 'The network cable is unplugged', 'The router is switched off', 'The computer has no IP address'], 'Pinging an IP address works, so the link, the IP address, the gateway and the internet are fine. What fails is the step that turns a name into an address: DNS.'),
    mcq('q4', 'What does this program print?', ['[(\'10.0.0.5\', 3)]', '[(\'10.0.0.7\', 1)]', '[(\'10.0.0.9\', 1)]', '[(\'FAIL\', 4)]'], 'Only lines that start with FAIL are counted, per address. The address 10.0.0.5 failed three times, 10.0.0.7 once; the OK line is ignored. most_common(1) returns the address with the most failures.', PY('from collections import Counter\nlog = ["FAIL 10.0.0.5", "OK 10.0.0.9", "FAIL 10.0.0.5", "FAIL 10.0.0.7", "FAIL 10.0.0.5"]\nfailures = Counter(line.split()[1] for line in log if line.startswith("FAIL"))\nprint(failures.most_common(1))')),
    mcq('q5', 'What is the main purpose of network segmentation?', ['To limit how far an attacker or a failure can spread between zones', 'To make the network faster', 'To give every device a public IP address', 'To replace the need for passwords'], 'Splitting the network into zones with a firewall between them means that a compromised guest laptop, for example, cannot reach the servers directly. It limits the damage of an incident.'),
  ],
  // @@quiz-end
});
