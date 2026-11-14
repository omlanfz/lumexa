// FILE PATH: server/src/pre-university-cse/banks/course-6.ts
//
// Course Assessment 6 — Operating Systems, Networking & Cybersecurity.

import { codeOut, crit, mcq, practical, shortAnswer, structuredBank } from '../../structured-assessments/structured.helpers';

export const COURSE_6_BANK = structuredBank({
  id: 'structured/operating-systems-networking-and-cybersecurity',
  title: 'Course Assessment: Operating Systems, Networking & Cybersecurity',
  kind: 'COURSE_TEST',
  mcq: [
    mcq(
      1,
      'What is a system call?',
      'A request from a user program to the kernel for a service that only the kernel may perform, such as reading a file',
      [
        'A call from one user program to a function inside another user program',
        'A message that the CPU sends to the memory when it needs the next instruction',
        'A command that a user types to start a program',
      ],
      'User programs run with limited privileges. When they need the hardware (files, network, memory), they ask the kernel through a system call, which switches to kernel mode and back.',
    ),
    codeOut(
      2,
      'python',
      `bursts = [6, 2, 4]
wait, t = [], 0
for b in bursts:
    wait.append(t)
    t += b
print(wait, round(sum(wait) / len(wait), 1))`,
      '[0, 6, 8] 4.7',
      ['[6, 8, 12] 8.7', '[0, 2, 6] 2.7', '[0, 6, 8] 14.0'],
      'With first-come, first-served scheduling each process waits for the sum of the bursts before it: 0, 6 and 6 + 2 = 8, an average of 14 / 3 = 4.7.',
    ),
    mcq(
      3,
      'A program touches a page of its memory that is not in RAM at that moment. What happens?',
      'A page fault: the operating system loads the page from disk into a free frame, updates the page table and restarts the instruction',
      [
        'The program is stopped with an error, because every page must be in RAM before it can run',
        'The CPU skips the instruction and carries on with the next one',
        'The memory controller copies the page from the cache back into RAM',
      ],
      'Virtual memory lets a program use more memory than RAM holds. Pages are brought in on demand, and a page fault is the event that triggers it.',
    ),
    mcq(
      4,
      'At which layer of the TCP/IP model does the Internet Protocol (IP) work, and what does it do?',
      'The Internet (network) layer, where it addresses packets and routes them from source to destination across networks',
      [
        'The Application layer, where it formats web pages for the browser',
        'The Link layer, where it moves bits over the cable between two neighbouring devices',
        'The Transport layer, where it makes sure that every byte arrives in order',
      ],
      'IP gives every device an address and forwards packets hop by hop. Reliable, ordered delivery is the job of TCP at the transport layer.',
    ),
    codeOut(
      5,
      'python',
      `import ipaddress

n = ipaddress.ip_network("192.168.10.0/26")
print(n.num_addresses - 2, n.broadcast_address)`,
      '62 192.168.10.63',
      ['64 192.168.10.64', '62 192.168.10.255', '30 192.168.10.31'],
      'A /26 leaves 6 host bits, so there are 2^6 = 64 addresses; two are reserved (network and broadcast), so 62 are usable. The block runs from .0 to .63, and .63 is the broadcast address.',
    ),
    mcq(
      6,
      'What does a DNS resolver do when a browser asks for www.school.example?',
      'It asks the DNS servers, step by step or from its cache, for the IP address that belongs to that name and returns it',
      [
        'It downloads the web page and passes it to the browser',
        'It encrypts the connection between the browser and the web server',
        'It decides which network card the browser may use',
      ],
      'People use names, but packets need IP addresses. The resolver translates the name to an address; the browser then connects to that address.',
    ),
    codeOut(
      7,
      'python',
      `import hashlib

print(hashlib.sha256(b"abc").hexdigest()[:8])`,
      'ba7816bf',
      ['ba7816be', 'a9993e36', 'e3b0c442'],
      'SHA-256 always gives the same digest for the same input: the digest of "abc" starts with ba7816bf. A tiny change of the input would change the whole digest.',
    ),
    mcq(
      8,
      'A student can ping the IP address 8.8.8.8 successfully but cannot open any website by its name. What is the most likely fault?',
      'The name resolution (DNS) is failing, because the network itself works if an IP address can be reached',
      [
        'The network cable is broken, because pings always fail when the cable is faulty',
        'The firewall blocks all outgoing packets, because a ping is the same as a web request',
        'The web servers of every site are down at the same time',
      ],
      'Reaching an address proves that connectivity and routing work. If names fail while addresses succeed, look at DNS settings or the resolver.',
    ),
    mcq(
      2,
      'Two threads each hold one lock and wait for the other. Which change removes the circular-wait condition for deadlock?',
      'Make every thread acquire the locks in the same fixed order',
      [
        'Give each thread a longer time slice so that it finishes before the other starts',
        'Let both threads hold their lock for ever so that nobody can take it',
        'Add a third thread that watches the other two',
      ],
      'Deadlock needs mutual exclusion, hold and wait, no pre-emption and circular wait. A global lock order makes a cycle of waiting threads impossible.',
    ),
    mcq(
      7,
      'What is the right way for a website to store users\' passwords?',
      'Store only a salted hash made with a slow password-hashing function, never the password itself',
      [
        'Encrypt every password with one secret key and store the encrypted text next to the key',
        'Store the passwords in plain text but restrict access to the database',
        'Store the first six characters of each password so that it can be recovered if forgotten',
      ],
      'A salted slow hash cannot be reversed and makes guessing expensive. If the database leaks, the passwords are not directly exposed.',
    ),
  ],
  shortAnswers: [
    shortAnswer(
      2,
      'Explain the difference between a process and a thread. Name two things that threads of one process share and two that each thread has for itself. Then show with a small example why two threads that both execute counter = counter + 1 can lose an update, and name one way to prevent it.',
      'A process is a running program with its own address space and resources; a thread is a unit of execution inside a process. Threads of the same process share the code, the heap (global data) and open files; each thread has its own stack and its own registers (program counter). If two threads read counter = 5, both compute 6 and both write 6, one increment is lost: this is a race condition, because the read-add-write sequence is not atomic. A mutex (lock) around the update, or an atomic operation, prevents it.',
      [
        crit('Process and thread', 1, 'Distinguishes the two correctly.'),
        crit('Shared and private', 2, 'Two shared items (heap, code, files) and two private items (stack, registers).'),
        crit('Race condition and fix', 2, 'Shows how an update is lost and names a lock or atomic operation as the remedy.'),
      ],
    ),
    shortAnswer(
      6,
      'Describe step by step what happens when a browser opens https://school.example/ for the first time: name the protocols or services involved in each step (DNS, TCP, TLS, HTTP) and what each step achieves.',
      'First the browser asks DNS for the IP address of school.example. It then opens a TCP connection to that address (port 443) with the three-way handshake (SYN, SYN-ACK, ACK), which sets up a reliable byte stream. Next TLS starts: the server sends its certificate, the browser checks that it is valid and belongs to the name, and both sides agree on keys, so everything after this is encrypted and the server is authenticated. Then the browser sends an HTTP request (GET /) through the encrypted connection and the server answers with a status code and the page, which the browser renders and from which it requests more resources.',
      [
        crit('DNS and TCP', 2, 'DNS lookup of the name and a TCP connection with the handshake.'),
        crit('TLS', 2, 'Certificate check, key agreement, encryption and authentication of the server.'),
        crit('HTTP exchange', 1, 'The request and the response with a status code and the page.'),
      ],
    ),
    shortAnswer(
      7,
      'A school offers Wi-Fi to students and staff. Name three threats (for example phishing, eavesdropping, weak passwords) and give one practical control for each. Explain the principle of least privilege with an example from the school network.',
      'Phishing: staff are tricked into entering a password on a fake page; controls are training, checking the address and multi-factor authentication. Eavesdropping on the Wi-Fi: someone reads traffic; controls are WPA2/WPA3 encryption and HTTPS for sites. Weak or shared passwords: attackers guess them; controls are long unique passwords, a password manager and lockout after repeated failures. The principle of least privilege means that every user and program gets only the permissions it needs: students can read the shared materials but cannot change them, and only the administrator account can change network settings.',
      [
        crit('Threats', 2, 'Three realistic threats, each clearly described.'),
        crit('Controls', 2, 'A sensible control for each threat, with the reason that it works.'),
        crit('Least privilege', 1, 'Defines the principle and gives a correct school example.'),
      ],
    ),
  ],
  practical: practical({
    title: 'Find the suspicious hosts in a connection log',
    language: 'python',
    instructions:
      'A school firewall writes one line for every connection attempt, in the form `time source destination port result`, where the result is OK or DENIED. Write a Python program that analyses the log below.\n\n' +
      '1. Parse the log text into records (time, source, destination, port, result). Ignore blank lines and report how many lines were malformed (fewer than five fields).\n' +
      '2. Count the denied attempts for each source address.\n' +
      '3. Report every source with three or more denied attempts as suspicious, most denials first, and list the different ports that it tried.\n' +
      '4. Print the number of connections, the number denied, and the percentage denied with one decimal.\n' +
      '5. Add a comment that explains what a firewall rule could do about a suspicious source and one reason why a source with many denials might still be harmless.\n\n' +
      'Log: `09:00:01 10.0.0.5 10.0.1.2 80 OK`, `09:00:04 10.0.0.9 10.0.1.2 22 DENIED`, `09:00:05 10.0.0.9 10.0.1.2 23 DENIED`, `09:00:07 10.0.0.5 10.0.1.3 443 OK`, `09:00:09 10.0.0.9 10.0.1.4 3389 DENIED`, `09:00:11 10.0.0.7 10.0.1.2 80 DENIED`, `broken line`.\n\n' +
      'Expected: 6 connections, 4 denied (66.7%), one malformed line, and 10.0.0.9 as the only suspicious source with the ports 22, 23 and 3389.',
    starterCode:
      'LOG = """09:00:01 10.0.0.5 10.0.1.2 80 OK\n09:00:04 10.0.0.9 10.0.1.2 22 DENIED\n09:00:05 10.0.0.9 10.0.1.2 23 DENIED\n09:00:07 10.0.0.5 10.0.1.3 443 OK\n09:00:09 10.0.0.9 10.0.1.4 3389 DENIED\n09:00:11 10.0.0.7 10.0.1.2 80 DENIED\nbroken line\n"""\n\n\n' +
      'def parse(text):\n    """Return (records, malformed_count)."""\n    pass\n\n\n# count, report and print\n',
    deliverables: ['Your complete Python program', 'The printed report', 'The comment about the firewall rule and false alarms'],
    rubric: [
      crit('Parsing and malformed lines', 4, 'Splits each line into fields, skips blank lines, and counts malformed lines correctly.'),
      crit('Counting and suspicious sources', 6, 'Counts denials per source with a dictionary and reports sources with three or more, sorted by count, with their ports.'),
      crit('Statistics and output', 4, 'Prints 6 connections, 4 denied and 66.7 per cent with correct formatting.'),
      crit('Security reasoning', 3, 'Explains a sensible rule (for example block or rate-limit the source) and a plausible harmless cause (a misconfigured but legitimate device).'),
      crit('Code quality', 3, 'Functions, clear names, no repeated code, comments where needed.'),
    ],
  }),
});
