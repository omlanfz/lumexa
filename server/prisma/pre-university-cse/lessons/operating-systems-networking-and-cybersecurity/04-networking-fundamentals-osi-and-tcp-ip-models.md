# Lumexa Mission Log: Operating Systems, Networking & Cybersecurity

**Course/Path:** Operating Systems, Networking & Cybersecurity
**Lesson:** 04 of 08
**Title:** Networking Fundamentals, OSI and TCP/IP Models
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** Network map · Python

---

## Mission Brief

When you open a web page, a message leaves your laptop, crosses a wireless link, a switch and a router, travels over cables you will never see and arrives at a computer in another city, and the answer makes the same journey back, all in a fraction of a second. Nobody designed one giant machine to do it. Instead, millions of different devices cooperate because they all follow the same **protocols**, organised in **layers**.

In this lesson you meet the building blocks of a network (hosts, switches, routers, links), the **OSI** and **TCP/IP** layer models, **encapsulation**, and the addresses used at each layer. You then draw and analyse a network map in Python and in your **Computer Network Explorer** dossier: from here on the dossier is about *networks*, not just one host.

## Learning Objectives

1. Describe what a network is, and distinguish LAN, WAN and the internet, and clients from servers.
2. Name the roles of hosts, switches, routers, access points and links, and the layer each works at.
3. Explain bandwidth, latency and throughput.
4. List the seven OSI layers and the four TCP/IP layers, say what each does and give an example protocol for each.
5. Explain encapsulation and calculate the header overhead of a frame.
6. Explain how a switch learns MAC addresses, and build and analyse a network map with a path search.

## Prerequisites

- Lessons 1 to 3: hosts, processes and what an operating system does.
- Python: dictionaries, lists, functions and loops; breadth-first search from the data structures course.
- Binary and hexadecimal numbers (Course 5).

## Concept Explanation

### What a network is

A **network** is a group of devices, called **nodes** or **hosts**, joined by **links** so that they can exchange data. A **LAN** (local area network) covers a room, a home or an office; a **WAN** (wide area network) joins LANs across cities or countries; the **internet** is the global network of networks. In the **client-server** model a **server** waits for requests and **clients** send them (a browser asks a web server for a page); in **peer-to-peer** networks all nodes can play both roles.

Devices have different jobs. A **host** (PC, phone, server) runs the applications. A **switch** connects the devices of one LAN and sends each frame only to the port where the destination is. A **router** connects *different* networks and decides where to forward each packet next. An **access point** joins wireless devices to the wired LAN. A **modem** connects a LAN to the provider's line, and a **firewall** filters traffic (Lesson 8). The older **hub** simply repeated every signal to every port and has disappeared. The links are **wired** (copper Ethernet cables, optical fibre) or **wireless** (Wi-Fi, mobile networks). The usual shape of a LAN is a **star** around a switch; others are the bus, the ring and the **mesh**, in which many links give many routes.

Three numbers describe a link. **Bandwidth** is how many bits per second it can carry (for example 1 Gbit/s). **Latency** is the delay of one bit or packet (for example 5 ms), and the delay for a request and its answer is the **round-trip time (RTT)**, which the `ping` command measures. **Throughput** is the speed you actually get, which is lower than the bandwidth because of delays, errors and sharing. A wide road (bandwidth) does not make the road shorter (latency).

### Protocols and layers

A **protocol** is a set of rules that two devices follow to communicate: the format of the messages, their order and what to do when something goes wrong. Network software is organised in **layers**. Each layer offers a service to the layer above, uses the service of the layer below and hides its details. A web browser does not need to know whether the data travels over Wi-Fi or fibre, and an improvement in Wi-Fi does not change the browser. This division of work is why the internet could grow to billions of devices.

### The OSI model and the TCP/IP model

The **OSI model** divides communication into seven layers; the **TCP/IP model**, which the internet really uses, has four. From the top:

- **7 Application** and **6 Presentation** and **5 Session** (in TCP/IP all three form the **Application** layer): the programs and their protocols (HTTP, DNS, SMTP), the format and encryption of the data (TLS) and the management of conversations.
- **4 Transport**: end-to-end delivery between *programs*, identified by **port numbers**. **TCP** is reliable and ordered; **UDP** is fast and simple (Lesson 5). The unit is the **segment**.
- **3 Network** (the **Internet** layer in TCP/IP): addressing and **routing** between networks with **IP addresses**. The unit is the **packet**.
- **2 Data link** and **1 Physical** (the **Link** layer in TCP/IP): delivery inside one network with **MAC addresses** (Ethernet, Wi-Fi), and the signals on the cable or in the air. The unit is the **frame**, and at layer 1 the bits.

A memory aid for the OSI layers from 7 down to 1 is "All People Seem To Need Data Processing" (Application, Presentation, Session, Transport, Network, Data link, Physical).

### Encapsulation

When an application sends data, each layer on the way down wraps it in its own **header** (the Ethernet layer also adds a trailer). This is **encapsulation**. The transport layer adds the source and destination ports to make a segment; the network layer adds the source and destination IP addresses to make a packet; the link layer adds the source and destination MAC addresses to make a frame. On the way up at the receiver, each layer removes its header (**decapsulation**) and passes the rest upwards. The headers cost space: Ethernet 14 bytes, IPv4 20 bytes and TCP 20 bytes, so 54 bytes of overhead on every frame, which is large for tiny messages and small for large ones.

### Addresses at each layer

Each layer has its own kind of address. A **MAC address** (48 bits, written like `3C:52:82:1A:B4:9F`) identifies a network card inside its LAN, and a **switch** reads it. An **IP address** (32 bits in IPv4, such as `192.168.1.20`) identifies a host on the internet and a **router** reads it. A **port number** (16 bits, such as 80 or 443) identifies the application on the host. And a **name** such as `www.example.com` is translated into an IP address by DNS (Lesson 6). A frame keeps the same IP addresses from the sender to the receiver, but its MAC addresses change at every router, because MAC addresses only make sense inside one LAN.

### How a switch learns

A switch starts with an empty **MAC table**. Whenever a frame arrives, the switch looks at its *source* address and remembers the port it came from. Then it looks at the *destination* address: if it is in the table, the frame goes out of that one port; if not, the switch **floods** the frame out of every other port, and the real destination answers, which teaches the switch its port. Within a few frames the switch knows everybody and traffic no longer reaches hosts that it was not meant for.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Host / node** | A device connected to a network. |
| **LAN / WAN** | A local network in one place / a network that joins places far apart. |
| **Switch / router** | A device that forwards frames inside a LAN by MAC address / one that forwards packets between networks by IP address. |
| **Protocol** | An agreed set of rules and message formats for communication. |
| **Layer** | A level of the protocol stack that offers a service to the layer above. |
| **Encapsulation** | Wrapping data with a header at each layer on the way down. |
| **Frame / packet / segment** | The units of the link, network and transport layers. |
| **MAC address / IP address / port** | The address of a network card / of a host / of an application. |
| **Bandwidth / latency / RTT** | Bits per second a link can carry / the delay of a link / the delay of a request and its reply. |
| **Flooding** | Sending a frame out of all ports except the one it arrived on. |

## Worked Examples

### Example 1: Encapsulation and header overhead

```python
ETHERNET, IP, TCP = 14, 20, 20                     # header sizes in bytes (Ethernet's 4-byte trailer is ignored)


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
print(f"the headers add {frame[-1][3] - frame[0][3]} bytes to {frame[0][3]} bytes of data\n")

print("payload  frame size  overhead")
for payload in (10, 100, 1000, 1460):
    total = payload + ETHERNET + IP + TCP
    print(f"{payload:>7}  {total:>10}  {(ETHERNET + IP + TCP) / total:>8.0%}")
```

```output
Application  data     "GET /index.html"                                  15 bytes
Transport    segment  TCP header: port 51000 -> 80                       35 bytes
Network      packet   IP header: 192.168.1.20 -> 192.168.2.10            55 bytes
Link         frame    Ethernet header: 3C:52:A1 -> 7E:10:B4              69 bytes
the headers add 54 bytes to 15 bytes of data

payload  frame size  overhead
     10          64       84%
    100         154       35%
   1000        1054        5%
   1460        1514        4%
```

1. The message `GET /index.html` is 15 bytes of application data. The transport layer adds a 20-byte TCP header with the ports (51000 is the client's temporary port, 80 is the web server), giving a 35-byte segment.
2. The network layer adds the 20-byte IP header with both IP addresses (a 55-byte packet), and the link layer adds the 14-byte Ethernet header with both MAC addresses (a 69-byte frame).
3. The three headers add 54 bytes. For a payload of 10 bytes that is 84% of the frame, but for a payload of 1,460 bytes (the most that fits into a 1,500-byte IP packet with these headers) it is only 4%.
4. This is why many small messages waste bandwidth, and why protocols collect data into larger packets when they can.

### Example 2: A network map and a path

```python
from collections import deque

LINKS = {                                          # (device 1, device 2): one-way delay in milliseconds
    ("PC-A", "SW1"): 0.2, ("PC-B", "SW1"): 0.2, ("AP", "SW1"): 0.3, ("Laptop", "AP"): 3.0,
    ("SW1", "R1"): 0.3, ("R1", "SW2"): 0.3, ("SW2", "Web"): 0.2, ("SW2", "DB"): 0.2, ("R1", "ISP"): 10.0,
}
KIND = {"PC-A": "host", "PC-B": "host", "Laptop": "host", "Web": "host", "DB": "host",
        "SW1": "switch", "SW2": "switch", "AP": "access point", "R1": "router", "ISP": "router"}
LAYER = {"host": 7, "switch": 2, "access point": 2, "router": 3}      # the highest layer a device works at

graph = {}
for (a, b), delay in LINKS.items():
    graph.setdefault(a, {})[b] = delay
    graph.setdefault(b, {})[a] = delay


def shortest_path(start, goal):
    """Breadth-first search: the path with the fewest hops."""
    queue, seen = deque([[start]]), {start}
    while queue:
        path = queue.popleft()
        if path[-1] == goal:
            return path
        for neighbour in sorted(graph[path[-1]]):
            if neighbour not in seen:
                seen.add(neighbour)
                queue.append(path + [neighbour])


print("device  kind          layer")
for device in sorted(KIND):
    print(f"{device:<7} {KIND[device]:<13} {LAYER[KIND[device]]}")

path = shortest_path("Laptop", "DB")
delay = sum(graph[a][b] for a, b in zip(path, path[1:]))
print("\npath:", " -> ".join(path))
print(f"{len(path) - 1} links, one-way delay {delay:.1f} ms, round trip (ping) {2 * delay:.1f} ms")
print("layers on the way:", ", ".join(f"{d} (L{LAYER[KIND[d]]})" for d in path))
```

```output
device  kind          layer
AP      access point  2
DB      host          7
ISP     router        3
Laptop  host          7
PC-A    host          7
PC-B    host          7
R1      router        3
SW1     switch        2
SW2     switch        2
Web     host          7

path: Laptop -> AP -> SW1 -> R1 -> SW2 -> DB
5 links, one-way delay 4.1 ms, round trip (ping) 8.2 ms
layers on the way: Laptop (L7), AP (L2), SW1 (L2), R1 (L3), SW2 (L2), DB (L7)
```

1. The network is a **graph**: devices are nodes and links are edges with a delay. The dictionary `graph` stores both directions of every link.
2. The table lists each device with the highest layer it works at: hosts work up to the application layer (7), routers up to the network layer (3), switches and access points only up to the data link layer (2).
3. A breadth-first search finds the path with the fewest hops from the laptop to the database server: Laptop, AP, SW1, R1, SW2, DB, five links in all. The one-way delay is the sum of the link delays, 4.1 ms, so a `ping` would show about 8.2 ms.
4. The wireless link (3.0 ms) is the slowest inside the office. The path crosses the router (layer 3) because the laptop and the database are in different networks.

### Example 3: A switch that learns

```python
class Switch:
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
print("MAC table:", switch.table)
```

```output
port  from -> to   switch action
   1  AA -> BB     flood to ports 2, 3, 4
   2  BB -> AA     forward to port 1
   1  AA -> BB     forward to port 2
   3  CC -> AA     forward to port 1
   4  DD -> FF     flood to ports 1, 2, 3
MAC table: {'AA': 1, 'BB': 2, 'CC': 3, 'DD': 4}
```

1. The switch begins with an empty table. The first frame (AA to BB) arrives on port 1: the switch learns that AA is on port 1, does not know BB, and **floods** the frame to ports 2, 3 and 4.
2. BB answers on port 2: the switch learns BB, finds AA in its table and forwards the frame to port 1 only.
3. The next frame from AA to BB goes to port 2 only, and CC's frame to AA goes to port 1 only: the other hosts no longer see this traffic.
4. A frame for an unknown destination (FF) is flooded again. After a few frames the table lists every active host, which is also why a switch is faster and more private than a hub.

## Common Mistakes and Misconceptions

- **Confusing the internet with the web.** The web (HTTP pages) is one application that uses the internet; email and video calls use it too.
- **Mixing up switch and router.** A switch forwards frames inside one LAN by MAC address; a router connects different networks by IP address.
- **Thinking that bandwidth is speed.** Bandwidth is capacity; the time a message needs also depends on latency and on sharing.
- **Believing that MAC addresses travel end to end.** They change at every router; the IP addresses stay the same.
- **Mixing the layer numbers of the two models.** OSI has seven layers, TCP/IP four; the TCP/IP application layer covers OSI layers 5 to 7.
- **Forgetting the header overhead.** A one-byte message still costs 54 bytes with Ethernet, IP and TCP.
- **Thinking that a hub and a switch behave the same.** A hub repeats everything to everybody; a switch learns and forwards selectively.
- **Treating the layer model as exact reality.** It is a way of thinking: real protocols sometimes cross layers, but the model makes problems easier to find.

## Guided Hands-On Activity

**Map and measure.** Work with your teacher.

1. In Example 1 change the message to a 100-byte string (use `"x" * 100`). What is the frame size and the overhead?
2. In Example 2 find the path from `PC-A` to `Web`. How many links does it have, and what is the ping time?
3. In Example 2 add a link `("PC-B", "AP"): 0.3` and find the path from `PC-B` to `Laptop` again. Does the path change? Why?
4. In Example 3 add the frames `(2, "BB", "CC")` and `(3, "CC", "BB")` and predict the actions before you run it.
5. On your own computer open a terminal and run `ping 127.0.0.1` (your own computer) and `ping` of a website your teacher names. Compare the round-trip times and explain the difference with the word *latency*.
6. Draw the network map of your classroom or home on paper: label every device with its layer and every link as wired or wireless.

## Lesson Project: Map My Network

### Objective

Build a **network map** of the office network of your dossier in Python: classify every device by layer, find the paths and ping times between hosts, find the single point of failure, watch the switch SW1 learn, and calculate the size of the frame for a web request. This is the first network page of your **Computer Network Explorer** dossier.

### Requirements

- Use the devices and links of Example 2 (hosts PC-A, PC-B, Laptop, Web, DB; devices SW1, SW2, AP, R1, ISP).
- Print a **device table** with the kind, the highest layer and what the device reads in a frame (hosts: all layers, up to the data; switches and access points: MAC addresses; routers: IP addresses).
- Print the **path, the number of links and the ping time** for Laptop to DB and for PC-A to Web, and what each device on the path reads.
- Find the **single point of failure**: run the path search for Laptop to DB with R1 removed and print the result.
- Run the switch SW1 (ports: PC-A 1, PC-B 2, AP 3, R1 4) on five frames and print the actions and the final MAC table.
- Print the size of the frame that carries the web request `GET /report` (11 bytes of data) and the overhead.
- In the dossier, write one paragraph: which device would you duplicate to make the network more reliable, and why?

### Instructions

1. Copy the data and `shortest_path` from Example 2 and add an optional `blocked` parameter that skips a device.
2. Print the device table with the "reads" column.
3. Write a function that prints a connection: path, links, ping and the layers.
4. Print both connections and the failure test.
5. Copy the `Switch` class and run the five frames.
6. Compute the frame size of the request and its overhead.
7. Compare with the expected output and write the paragraph.

### Expected Output

```text
Device table
device  kind          layer  reads
AP      access point      2  MAC addresses
DB      host              7  all layers
ISP     router            3  IP addresses
Laptop  host              7  all layers
PC-A    host              7  all layers
PC-B    host              7  all layers
R1      router            3  IP addresses
SW1     switch            2  MAC addresses
SW2     switch            2  MAC addresses
Web     host              7  all layers

Laptop to DB: Laptop -> AP -> SW1 -> R1 -> SW2 -> DB
  5 links, ping 8.2 ms
  reads: AP MAC addresses; SW1 MAC addresses; R1 IP addresses; SW2 MAC addresses

PC-A to Web: PC-A -> SW1 -> R1 -> SW2 -> Web
  4 links, ping 2.0 ms
  reads: SW1 MAC addresses; R1 IP addresses; SW2 MAC addresses

Single point of failure test (R1 removed)
  Laptop to DB: NOT reachable: R1 is a single point of failure

Switch SW1 (ports: PC-A 1, PC-B 2, AP 3, R1 4)
  PC-A -> PC-B: flood to ports 2, 3, 4
  PC-B -> PC-A: forward to port 1
  Laptop -> PC-A: forward to port 1
  R1 -> Laptop: forward to port 3
  PC-A -> R1: forward to port 4
  MAC table: {'PC-A': 1, 'PC-B': 2, 'Laptop': 3, 'R1': 4}

The request 'GET /report' (11 bytes) travels in a frame of 65 bytes: overhead 83%
```

### Hints

1. **Hint 1 (the blocked device).** In `shortest_path(start, goal, blocked=())`, skip a neighbour when `neighbour in blocked`; return `None` if the queue empties.
2. **Hint 2 (what is read).** A dictionary from kind to text: `{"host": "all layers", "switch": "MAC addresses", ...}`.
3. **Hint 3 (the ping).** The round trip is twice the sum of the link delays on the path.
4. **Hint 4 (the switch).** Call `switch.receive(port, source, destination)` and print the list that it returns.
5. **Hint 5 (the frame).** The frame is the message length plus 14 + 20 + 20 bytes; the overhead is 54 divided by the frame size.
6. **Hint 6 (the failure).** If the function returns `None`, print that the two hosts cannot reach each other.

### Success Criteria

- [ ] The device table lists all ten devices with the right layer and the right "reads" text.
- [ ] Both paths are correct, the ping times are 8.2 ms and 2.0 ms, and each path lists what every device reads.
- [ ] Removing R1 makes the database unreachable, and the output says so.
- [ ] The switch floods the first frame and learns all four hosts.
- [ ] The frame for `GET /report` is 65 bytes with an overhead of 83%.
- [ ] The dossier contains a paragraph that names a device and gives a reason.

### Extension Challenge

Add a second router `R2` that also connects SW1 and SW2, and show that removing R1 no longer disconnects the Laptop from the database. Then find the route with the *smallest delay* instead of the fewest hops by using Dijkstra's algorithm (from the data structures course), and show a case where the two answers differ. Finally, add a hub-like behaviour to `Switch` (flooding every frame) and count how many frames each host receives for the same traffic with a hub and with a switch.

## Lesson Recap

- A **network** joins hosts with links; **switches** forward by MAC address inside a LAN, **routers** forward by IP address between networks.
- **Bandwidth** is capacity, **latency** is delay and **RTT** is the delay of a round trip.
- **Layers** hide details: OSI has seven (application, presentation, session, transport, network, data link, physical), TCP/IP has four (application, transport, internet, link).
- **Encapsulation** adds a header at each layer: segment, packet, frame; Ethernet, IP and TCP together cost 54 bytes per frame.
- A switch **learns** the port of each MAC address from the source of the frames and **floods** unknown destinations.

## Homework / Extension Mission

Draw the network of your home: the router, the devices and how each connects (cable or Wi-Fi). Name the layer that each device works at and find your router's IP address (the "default gateway" in your network settings). Then take the sentence "I am sending a photo to a friend" and write what happens at each of the seven OSI layers in one line each. Finally, calculate by hand the frame size and the overhead for a 500-byte payload with Ethernet, IP and TCP headers and compare it with Example 1.

## Course Project Connection

This lesson turns the **Computer Network Explorer**, the course project, from a host profile into a **network map**: the hosts of Lessons 1 to 3 now sit on a switched LAN behind a router, and the map records the devices, the links and the layer each device works at. In Lesson 5 you give the map an addressing plan with subnets and a routing table, in Lesson 6 you trace a web request across it, and in Lessons 7 and 8 you protect it.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: "send a letter" analogy for layers and encapsulation (envelope inside a parcel inside a van); 15 minutes: devices, the OSI table and the TCP/IP model; 10 minutes: encapsulation (Example 1, students compute the overhead by hand first); 10 minutes: the switch table (act it out with students as ports); 15 minutes: the project.

**Live demonstrations.** Run `ping` to a nearby host and to a far one and discuss latency. Open Wireshark or a browser's network tab to show a real header if the school permits it. Act out a switch with name cards and a table on the board.

**Misconceptions.** "The internet is the web." "A router and a switch are the same." "More bandwidth means lower latency." "MAC addresses are used across the whole internet."

**Assessment of the project.** Check the device table, both paths and ping times, the failure test, the learning switch and the frame size. Ask students why the MAC addresses change at the router while the IP addresses do not.

**Reference solution `map_my_network.py`** (run with `python3 map_my_network.py`):

```python
"""Map My Network: the office network of the dossier, analysed in Python."""
from collections import deque

LINKS = {
    ("PC-A", "SW1"): 0.2, ("PC-B", "SW1"): 0.2, ("AP", "SW1"): 0.3, ("Laptop", "AP"): 3.0,
    ("SW1", "R1"): 0.3, ("R1", "SW2"): 0.3, ("SW2", "Web"): 0.2, ("SW2", "DB"): 0.2, ("R1", "ISP"): 10.0,
}
KIND = {"PC-A": "host", "PC-B": "host", "Laptop": "host", "Web": "host", "DB": "host",
        "SW1": "switch", "SW2": "switch", "AP": "access point", "R1": "router", "ISP": "router"}
LAYER = {"host": 7, "switch": 2, "access point": 2, "router": 3}
READS = {"host": "all layers", "switch": "MAC addresses", "access point": "MAC addresses", "router": "IP addresses"}

graph = {}
for (a, b), delay in LINKS.items():
    graph.setdefault(a, {})[b] = delay
    graph.setdefault(b, {})[a] = delay


def shortest_path(start, goal, blocked=()):
    queue, seen = deque([[start]]), {start}
    while queue:
        path = queue.popleft()
        if path[-1] == goal:
            return path
        for neighbour in sorted(graph[path[-1]]):
            if neighbour not in seen and neighbour not in blocked:
                seen.add(neighbour)
                queue.append(path + [neighbour])
    return None


print("Device table")
print("device  kind          layer  reads")
for device in sorted(KIND):
    print(f"{device:<7} {KIND[device]:<13} {LAYER[KIND[device]]:>5}  {READS[KIND[device]]}")


def connection(start, goal):
    path = shortest_path(start, goal)
    delay = sum(graph[a][b] for a, b in zip(path, path[1:]))
    print(f"\n{start} to {goal}: {' -> '.join(path)}")
    print(f"  {len(path) - 1} links, ping {2 * delay:.1f} ms")
    print("  reads:", "; ".join(f"{d} {READS[KIND[d]]}" for d in path[1:-1]))


connection("Laptop", "DB")
connection("PC-A", "Web")
print("\nSingle point of failure test (R1 removed)")
broken = shortest_path("Laptop", "DB", blocked=("R1",))
print("  Laptop to DB:", "still reachable via " + " -> ".join(broken) if broken else "NOT reachable: R1 is a single point of failure")


class Switch:
    def __init__(self, ports):
        self.ports = ports
        self.table = {}

    def receive(self, port, source, destination):
        self.table[source] = port
        if destination in self.table:
            return [self.table[destination]]
        return [p for p in range(1, self.ports + 1) if p != port]


print("\nSwitch SW1 (ports: PC-A 1, PC-B 2, AP 3, R1 4)")
switch = Switch(4)
for port, source, destination in [(1, "PC-A", "PC-B"), (2, "PC-B", "PC-A"), (3, "Laptop", "PC-A"), (4, "R1", "Laptop"), (1, "PC-A", "R1")]:
    out = switch.receive(port, source, destination)
    action = f"forward to port {out[0]}" if len(out) == 1 else "flood to ports " + ", ".join(map(str, out))
    print(f"  {source} -> {destination}: {action}")
print("  MAC table:", switch.table)

message = "GET /report"
frame = len(message) + 14 + 20 + 20
print(f"\nThe request '{message}' ({len(message)} bytes) travels in a frame of {frame} bytes: overhead {54 / frame:.0%}")
```

```output
Device table
device  kind          layer  reads
AP      access point      2  MAC addresses
DB      host              7  all layers
ISP     router            3  IP addresses
Laptop  host              7  all layers
PC-A    host              7  all layers
PC-B    host              7  all layers
R1      router            3  IP addresses
SW1     switch            2  MAC addresses
SW2     switch            2  MAC addresses
Web     host              7  all layers

Laptop to DB: Laptop -> AP -> SW1 -> R1 -> SW2 -> DB
  5 links, ping 8.2 ms
  reads: AP MAC addresses; SW1 MAC addresses; R1 IP addresses; SW2 MAC addresses

PC-A to Web: PC-A -> SW1 -> R1 -> SW2 -> Web
  4 links, ping 2.0 ms
  reads: SW1 MAC addresses; R1 IP addresses; SW2 MAC addresses

Single point of failure test (R1 removed)
  Laptop to DB: NOT reachable: R1 is a single point of failure

Switch SW1 (ports: PC-A 1, PC-B 2, AP 3, R1 4)
  PC-A -> PC-B: flood to ports 2, 3, 4
  PC-B -> PC-A: forward to port 1
  Laptop -> PC-A: forward to port 1
  R1 -> Laptop: forward to port 3
  PC-A -> R1: forward to port 4
  MAC table: {'PC-A': 1, 'PC-B': 2, 'Laptop': 3, 'R1': 4}

The request 'GET /report' (11 bytes) travels in a frame of 65 bytes: overhead 83%
```

**Differentiation.** Support: provide the data, `shortest_path` and the `Switch` class so that students write the table, the connection report and the failure test. Stretch: the second router, Dijkstra's lowest-delay route and the hub comparison.

**Discussion questions (not for the student quiz).** Why is it useful that a layer does not know how the layer below works? What would break if MAC addresses stayed the same across the whole internet? Why does a wireless link usually have a higher and less predictable latency than a cable?
