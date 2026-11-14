# Lumexa Mission Log: Operating Systems, Networking & Cybersecurity

**Course/Path:** Operating Systems, Networking & Cybersecurity
**Lesson:** 05 of 08
**Title:** IP Addressing, Subnetting, Routing, TCP and UDP
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Subnet calculator · Python

---

## Mission Brief

Every device on the internet needs an address, and every router on the way needs to know in which direction to send a packet for that address. A company with three hundred computers cannot put them all in one flat network, so it splits its address block into **subnets**. And when the packet arrives, the receiving computer has to decide which program gets it, and whether the sender should check that every byte arrived (**TCP**) or just throw the data over the wall as quickly as possible (**UDP**).

In this lesson you learn how an **IPv4 address** is built, how a **subnet mask** and the **prefix length** split it into a network part and a host part, how to **subnet** a network, how a **router** chooses a route, and how TCP and UDP differ. You calculate everything by hand *and* with Python, and add an addressing plan and a routing table to your **Computer Network Explorer** dossier.

## Learning Objectives

1. Explain the structure of an IPv4 address, and distinguish private, public and special addresses.
2. Calculate the network address, broadcast address, host range and number of hosts from an address and a prefix length.
3. Subnet a network into equal subnets and design a plan with variable-length subnets (VLSM).
4. Explain how a router uses its routing table, the longest-prefix match, the default route and the TTL.
5. Compare TCP and UDP, describe the TCP three-way handshake and choose the right protocol for a service.
6. Build an addressing plan, a routing table and a protocol decision for the dossier network.

## Prerequisites

- Lesson 4: the layers, encapsulation, MAC and IP addresses and the network map.
- Binary numbers and bit operations (AND, OR, NOT, shifts) from Course 5.
- Python: functions, lists, dictionaries and f-strings.

## Concept Explanation

### IPv4 addresses

An **IPv4 address** has **32 bits**, written as four **octets** in decimal, separated by dots: `192.168.1.130` is `11000000.10101000.00000001.10000010`. There are about 4.3 billion possible addresses, which is no longer enough. The long-term answer is **IPv6**, with 128-bit addresses written in hexadecimal (`2001:db8::1`); the short-term answer is **NAT** (network address translation), in which a router lets a whole LAN share one public address.

Not every address can be used everywhere. **Private** addresses are for use inside LANs and are never routed on the internet: `10.0.0.0/8`, `172.16.0.0/12` and `192.168.0.0/16`. Others are **special**: `127.0.0.1` ("localhost") always means *this computer*, and `169.254.x.x` is what a computer gives itself when it cannot find a DHCP server. **DHCP** is the service that gives a computer its address, mask, router and DNS server automatically when it joins a network.

### Subnet masks, prefixes and subnetting

Every IP address has two parts: a **network part**, which is the same for all hosts of one network, and a **host part**, which identifies the host. The **subnet mask** says where the line between them is. A mask is a block of 1 bits followed by 0 bits, for example `255.255.255.0`, and the **prefix length** is the number of 1 bits, written after a slash: `255.255.255.0` is `/24`, and `192.168.1.0/24` means "the network whose first 24 bits are 192.168.1".

With the address and the mask, three calculations give everything:

- **Network address** = address AND mask (all host bits become 0). It names the network.
- **Broadcast address** = network OR (NOT mask) (all host bits become 1). A packet sent to it reaches every host of the network.
- **Usable hosts** = 2^(32 − prefix) − 2. The network address and the broadcast address cannot be given to hosts. A /24 has 254 hosts, a /26 has 62, a /30 has 2.

**Subnetting** splits one network into smaller ones by moving the line to the right: *borrowing* host bits. Borrowing 2 bits turns one /24 into four /26 subnets. With **VLSM** (variable-length subnet masks), different subnets get different sizes, so that a department of 100 computers gets a /25 and a link between two routers gets only a /30. The method: sort the needs from the largest to the smallest, give each the smallest block that fits (host bits = ⌈log₂(hosts + 2)⌉) and allocate the blocks one after the other.

### Routing

A **router** has several interfaces, each in a different network, and a **routing table**: a list of destination networks, the **next hop** (the next router, or "directly connected") and the interface to use. For each packet it takes the destination IP address and looks for the matching route. If several routes match, the **longest prefix** wins: the most specific one. A route to `0.0.0.0/0`, the **default route**, matches everything and sends unknown destinations to the provider. Routing is done hop by hop: each router decides only the *next* step. To stop packets from circling forever, every packet carries a **TTL** (time to live) that each router decreases by one; at 0 the packet is dropped and an ICMP "time exceeded" message goes back (this is how `traceroute` finds the routers on a path). Routes may be entered by hand (**static routing**) or learned from neighbouring routers by routing protocols (**dynamic routing**: RIP and OSPF inside an organisation, BGP between providers).

### The transport layer: ports, UDP and TCP

An IP address gets a packet to a host; a **port number** (0 to 65,535) gets the data to the right program on it. Well-known ports are 80 (HTTP), 443 (HTTPS), 22 (SSH), 25 (SMTP) and 53 (DNS). A **socket** is an IP address plus a port.

**UDP** is *connectionless*: each datagram is sent on its own, with no guarantee that it arrives, arrives once or arrives in order, and almost no overhead (an 8-byte header). It is good for short requests (DNS) and for data in which a late packet is useless (voice and video calls, online games).

**TCP** is *connection-oriented* and *reliable*. It first opens a connection with the **three-way handshake**: the client sends **SYN**, the server answers **SYN-ACK**, the client sends **ACK**. Then it numbers every byte (**sequence numbers**), the receiver confirms what arrived (**acknowledgements**), lost segments are **retransmitted**, the sender is slowed down if the receiver (**flow control**) or the network (**congestion control**) cannot keep up, and the bytes reach the program in order. The connection ends with **FIN**. TCP is used where every byte must arrive: web pages, email and file transfers. Reliability costs time (the handshake, the waiting for acknowledgements), which is why real-time services choose UDP.

## Key Vocabulary

| Term | Definition |
|---|---|
| **IPv4 / IPv6** | The 32-bit and the 128-bit version of the internet protocol address. |
| **Private address** | An address for use inside a LAN only, for example 192.168.x.x. |
| **Subnet mask / prefix length** | The pattern that splits an address into network and host parts / the number of 1 bits in it. |
| **Network / broadcast address** | The first address of a subnet, which names it / its last address, which reaches every host. |
| **Subnetting / VLSM** | Splitting a network into smaller ones / using subnets of different sizes. |
| **Routing table** | The list of networks, next hops and interfaces that a router uses to forward packets. |
| **Longest-prefix match** | The rule that the most specific matching route is used. |
| **Default route** | The route 0.0.0.0/0 that matches every destination not matched by another route. |
| **TTL** | A counter, decreased at every router, that stops packets from circling forever. |
| **Port / socket** | A number that identifies a program on a host / an IP address with a port. |
| **TCP / UDP** | The reliable connection-oriented / the simple connectionless transport protocol. |
| **Three-way handshake** | SYN, SYN-ACK, ACK: the way TCP opens a connection. |

## Worked Examples

### Example 1: Subnet arithmetic from scratch

```python
import ipaddress


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
print("matches the ipaddress module:", to_ip(network) == str(check.network_address) and to_ip(broadcast) == str(check.broadcast_address))
```

```output
address      192.168.1.130    11000000.10101000.00000001.10000010
mask   /26   255.255.255.192  11111111.11111111.11111111.11000000
network      192.168.1.128    11000000.10101000.00000001.10000000
broadcast    192.168.1.191    11000000.10101000.00000001.10111111
usable hosts 192.168.1.129 to 192.168.1.190  (62 hosts)
matches the ipaddress module: True
```

1. `to_int` and `to_ip` convert between dotted decimal and a 32-bit number, so that the bit operations of Course 5 can be used on addresses.
2. The /26 mask has 26 one bits followed by 6 zero bits, which is 255.255.255.192. ANDing the address with the mask clears the 6 host bits: 192.168.1.130 belongs to the network 192.168.1.128.
3. ORing the network with the inverted mask sets all host bits to 1, which gives the broadcast address 192.168.1.191. The usable hosts are everything in between: .129 to .190, which is 2⁶ − 2 = 62 hosts.
4. The standard `ipaddress` module gives the same answers, so in practice you would use it; calculating once by hand shows what it does.

### Example 2: Subnetting a network

```python
import ipaddress

office = ipaddress.ip_network("192.168.1.0/24")
print(f"{office}: {office.num_addresses} addresses, mask {office.netmask}")
print("\nsplit into four /26 subnets:")
for number, subnet in enumerate(office.subnets(new_prefix=26), start=1):
    hosts = list(subnet.hosts())
    print(f"  {number}. {str(subnet):<17} hosts {hosts[0]} to {hosts[-1]}  ({len(hosts)} usable)  broadcast {subnet.broadcast_address}")

print("\nprefix  mask             addresses  usable hosts")
for prefix in (24, 25, 26, 27, 28, 29, 30):
    net = ipaddress.ip_network(f"10.0.0.0/{prefix}")
    print(f"  /{prefix}   {str(net.netmask):<16} {net.num_addresses:>9}  {net.num_addresses - 2:>12}")

print("\nsame network?")
for a, b in (("192.168.1.10", "192.168.1.200"), ("192.168.1.10", "192.168.2.10")):
    print(f"  {a} and {b} in 192.168.1.0/24:", ipaddress.ip_address(a) in office and ipaddress.ip_address(b) in office)
```

```output
192.168.1.0/24: 256 addresses, mask 255.255.255.0

split into four /26 subnets:
  1. 192.168.1.0/26    hosts 192.168.1.1 to 192.168.1.62  (62 usable)  broadcast 192.168.1.63
  2. 192.168.1.64/26   hosts 192.168.1.65 to 192.168.1.126  (62 usable)  broadcast 192.168.1.127
  3. 192.168.1.128/26  hosts 192.168.1.129 to 192.168.1.190  (62 usable)  broadcast 192.168.1.191
  4. 192.168.1.192/26  hosts 192.168.1.193 to 192.168.1.254  (62 usable)  broadcast 192.168.1.255

prefix  mask             addresses  usable hosts
  /24   255.255.255.0          256           254
  /25   255.255.255.128        128           126
  /26   255.255.255.192         64            62
  /27   255.255.255.224         32            30
  /28   255.255.255.240         16            14
  /29   255.255.255.248          8             6
  /30   255.255.255.252          4             2

same network?
  192.168.1.10 and 192.168.1.200 in 192.168.1.0/24: True
  192.168.1.10 and 192.168.2.10 in 192.168.1.0/24: False
```

1. A /24 has 256 addresses. Borrowing two host bits makes four /26 subnets of 64 addresses each: 192.168.1.0, .64, .128 and .192, each with 62 usable hosts.
2. Each subnet loses two addresses: its first (the network address) and its last (the broadcast address). That is why a /30, with only 4 addresses, serves exactly 2 hosts, the two ends of a point-to-point link.
3. Each step of the prefix length halves the number of addresses: /24 has 254 hosts, /25 has 126, /26 has 62, and so on.
4. Two hosts can talk directly only if they are in the same subnet. 192.168.1.10 and 192.168.2.10 are in different networks, so their packets must go through a router.

### Example 3: A router chooses a route

```python
import ipaddress

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
print("\na packet with TTL 4 crossing routers:")
for router in ("R1", "R2", "R3", "R4", "R5"):
    ttl -= 1
    print(f"  {router}: TTL is now {ttl}" + ("  -> dropped, an ICMP 'time exceeded' goes back" if ttl == 0 else ""))
    if ttl == 0:
        break
```

```output
destination      route chosen         next hop            interface
192.168.1.77     192.168.1.0/24       directly connected  eth1
192.168.2.20     192.168.2.0/24       directly connected  eth2
192.168.2.200    192.168.2.128/25     192.168.2.130       eth2
192.168.9.9      192.168.0.0/16       192.168.2.254       eth2
8.8.8.8          0.0.0.0/0            203.0.113.1         eth0

a packet with TTL 4 crossing routers:
  R1: TTL is now 3
  R2: TTL is now 2
  R3: TTL is now 1
  R4: TTL is now 0  -> dropped, an ICMP 'time exceeded' goes back
```

1. The table has five routes. For each destination, `route` collects *all* routes that contain the address and picks the one with the longest prefix, the most specific.
2. 192.168.2.200 matches 192.168.2.0/24, 192.168.0.0/16, 0.0.0.0/0 and also 192.168.2.128/25: the /25 is the longest, so its next hop is used. 192.168.2.20 does not match the /25, so the /24 wins.
3. 192.168.9.9 matches only the /16 and the default route, so the /16 is chosen. 8.8.8.8 matches nothing but the default route, which sends it to the provider.
4. The TTL shows how a packet that is stuck in a routing loop is eventually dropped: every router subtracts one, and at zero the packet is discarded and the sender is told.

## Common Mistakes and Misconceptions

- **Forgetting the two reserved addresses.** A subnet with 2ⁿ addresses has 2ⁿ − 2 usable hosts.
- **Reading the mask as decimal numbers.** The mask is a pattern of bits: 255.255.255.192 means 26 ones, not "a bit less than 255".
- **Thinking that /24 and 255.255.255.0 are different things.** They are two ways of writing the same mask.
- **Putting hosts of one department in different subnets without a router.** Hosts in different subnets can only talk through a router.
- **Choosing the first matching route instead of the longest.** A router uses the most specific route, not the first in the list.
- **Believing that private addresses work on the internet.** They are not routed; NAT translates them to a public address at the edge.
- **Assuming that UDP is "bad" and TCP "good".** UDP is the better choice when speed matters more than perfect delivery or the message is a single short request.
- **Confusing the IP address with the port.** The address finds the computer, the port finds the program on it.

## Guided Hands-On Activity

**Calculate and check.** Work with your teacher.

1. By hand, find the network address, the broadcast address and the number of hosts for `10.1.5.77/28`, then check with Example 1 (change the address and the prefix).
2. In Example 2 split `192.168.1.0/24` into eight /27 subnets. How many hosts has each? Which subnet contains 192.168.1.100?
3. In Example 3 add the route `("192.168.1.64/26", "192.168.1.65", "eth3")` and predict which route 192.168.1.77 now uses. Run it to confirm.
4. In Example 3 change the TTL to 2. At which router does the packet die?
5. Write down the three-way handshake as three lines (who sends what to whom) and say which of the three messages can already carry data in practice.
6. On your computer, find your own IP address, subnet mask and default gateway (`ipconfig` on Windows, `ip addr` and `ip route` on Linux, `ifconfig` or the network settings on macOS). Is your address private? What is your prefix length?

## Lesson Project: Subnet Designer

### Objective

Write a **subnet designer** for the company network of your dossier: a VLSM addressing plan for one `/24` block, the routing table of the router R1 with a longest-prefix test, and a TCP-or-UDP decision for six services. This adds the addressing page to your **Computer Network Explorer** dossier.

### Requirements

- **Addressing plan.** Divide `192.168.10.0/24` for: Staff PCs (100 hosts), Servers (20), Guest Wi-Fi (50), Management (10) and two router links, R1-ISP and R1-Branch (2 hosts each). Allocate from the largest to the smallest and print for each: name, needed hosts, subnet in CIDR notation, mask, first and last usable host, broadcast address and the number of usable hosts. Print how many addresses are used and how many are left.
- **Routing table of R1.** Build it from the plan (a directly connected route for each subnet and an interface name), add a route for the branch network `192.168.20.0/24` through the branch end of the link and a default route to the ISP end of the link. Print the table and the route chosen for the destinations 192.168.10.45, 192.168.10.150, 192.168.10.200, 192.168.10.230, 192.168.20.7 and 8.8.8.8.
- **TCP or UDP.** For six services (web page over HTTPS, e-mail, file transfer, DNS lookup, video call, online game) store the port and two facts (is it a short single request, is late data useless) and choose the protocol with a function. Print the table with the reason.
- In the dossier, add a short paragraph on what you would change in the plan if the number of staff PCs doubled.

### Instructions

1. Compute each subnet's prefix with `32 - ceil(log2(hosts + 2))` and allocate the blocks one after the other, largest first.
2. Print the plan table and the used and spare addresses.
3. Build the routes with `ipaddress.ip_network` and write `route()` with the longest-prefix rule.
4. Print the routing table and the six test destinations.
5. Store the services as dictionaries and write `choose(service)`.
6. Print the protocol table with the reasons.
7. Compare with the expected output and write the paragraph.

### Expected Output

```text
Addressing plan for 192.168.10.0/24
name            need  subnet              mask             first - last host               usable
Staff PCs        100  192.168.10.0/25     255.255.255.128  192.168.10.1 - 192.168.10.126     126
Guest Wi-Fi       50  192.168.10.128/26   255.255.255.192  192.168.10.129 - 192.168.10.190     62
Servers           20  192.168.10.192/27   255.255.255.224  192.168.10.193 - 192.168.10.222     30
Management        10  192.168.10.224/28   255.255.255.240  192.168.10.225 - 192.168.10.238     14
Link R1-ISP        2  192.168.10.240/30   255.255.255.252  192.168.10.241 - 192.168.10.242      2
Link R1-Branch     2  192.168.10.244/30   255.255.255.252  192.168.10.245 - 192.168.10.246      2
addresses used: 248 of 256; unused: 8

Routing table of R1
  192.168.10.240/30  via directly connected  eth0
  192.168.10.244/30  via directly connected  eth5
  192.168.10.224/28  via directly connected  eth4
  192.168.10.192/27  via directly connected  eth3
  192.168.10.128/26  via directly connected  eth2
  192.168.10.0/25    via directly connected  eth1
  192.168.20.0/24    via 192.168.10.246      eth5
  0.0.0.0/0          via 192.168.10.242      eth0

Where do packets go?
  192.168.10.45   -> 192.168.10.0/25    eth1  (directly connected)
  192.168.10.150  -> 192.168.10.128/26  eth2  (directly connected)
  192.168.10.200  -> 192.168.10.192/27  eth3  (directly connected)
  192.168.10.230  -> 192.168.10.224/28  eth4  (directly connected)
  192.168.20.7    -> 192.168.20.0/24    eth5  (192.168.10.246)
  8.8.8.8         -> 0.0.0.0/0          eth0  (192.168.10.242)

TCP or UDP?
  Web page (HTTPS)     port   443  TCP  every byte must arrive, in order
  E-mail (SMTP)        port   587  TCP  every byte must arrive, in order
  File transfer (SFTP) port    22  TCP  every byte must arrive, in order
  DNS lookup           port    53  UDP  one short request: a handshake would cost more than the message
  Video call           port  5004  UDP  late data is useless: speed matters more than perfect delivery
  Online game          port 27015  UDP  late data is useless: speed matters more than perfect delivery
```

### Hints

1. **Hint 1 (the prefix).** For 100 hosts: log2(102) is about 6.7, so 7 host bits, prefix 32 − 7 = 25.
2. **Hint 2 (the allocation).** `ipaddress.ip_network((next_free, prefix))` builds the subnet from an integer address; then add `subnet.num_addresses` to `next_free`.
3. **Hint 3 (the hosts).** `hosts = list(subnet.hosts())`; the first is `hosts[0]` and the last is `hosts[-1]`.
4. **Hint 4 (the route).** Keep only the routes whose network contains the address (`address in network`) and take the one with the largest `prefixlen`.
5. **Hint 5 (the link ends).** In a /30 the two usable addresses are the two ends of the link: use the first for R1 and the second for the other router.
6. **Hint 6 (the choice).** A short single request or data that is useless when late goes to UDP; everything else goes to TCP.

### Success Criteria

- [ ] The plan allocates six subnets without overlap: /25, /26, /27, /28 and two /30, and leaves 8 addresses unused.
- [ ] Every subnet has enough usable hosts for its need.
- [ ] The routing table has a route for every subnet, the branch network and the default route.
- [ ] The six test destinations use the intended routes, including the default route for 8.8.8.8.
- [ ] The protocol table gives TCP for web, e-mail and file transfer, and UDP for DNS, video calls and games, each with a reason.
- [ ] The dossier contains a paragraph about doubling the staff.

### Extension Challenge

Make the plan *fail on purpose*: ask for 130 staff PCs and 100 guests and show with a clear message that the block cannot hold them, then propose a bigger block. Next, add a function that checks whether two subnets of your plan overlap (use `overlaps`), and test the whole plan. Finally, simulate the TCP three-way handshake with sequence numbers: print the three segments (SYN seq=100, SYN-ACK seq=300 ack=101, ACK seq=101 ack=301).

## Lesson Recap

- An **IPv4 address** has 32 bits; the **prefix length** says how many belong to the network. **Network** = address AND mask, **broadcast** = network OR NOT mask, **usable hosts** = 2^(32 − prefix) − 2.
- **Subnetting** splits a network; **VLSM** gives each subnet the smallest block that fits, allocated from the largest to the smallest.
- A **router** picks the route with the **longest prefix**; the **default route** catches the rest; the **TTL** stops loops.
- **Ports** find the program; **UDP** is simple and fast; **TCP** opens a connection with a **three-way handshake** and delivers every byte in order.

## Homework / Extension Mission

Find the IP address, mask and default gateway of your home or school computer and compute by hand the network address, the broadcast address and the number of hosts of your subnet. Then design, on paper, an addressing plan for a school with four labs (30, 30, 20 and 10 computers) from the block `10.20.0.0/24`, and check it with Python. Finally, explain in three sentences why a video call uses UDP and a bank website uses TCP.

## Course Project Connection

This lesson gives the **Computer Network Explorer**, the course project, its **addressing plan and routing table**: the map of Lesson 4 now has subnets with masks, host ranges and a router that knows where to send each packet, and every service on it has a transport protocol. In Lesson 6 you trace a web request across this network from the DNS lookup to the HTTPS response, and in Lessons 7 and 8 you secure it.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the address as a postal address with a street part and a house part; 15 minutes: masks and subnetting by hand (use binary on the board for one /26); 10 minutes: routing and longest prefix (Example 3); 10 minutes: TCP and UDP; 15 minutes: the project.

**Live demonstrations.** Show `ipconfig` or `ip addr` and `ip route` on the teacher's computer. Run `traceroute` or `tracert` to a website and relate each line to a router and the TTL. Use the subnet calculator visual to change the prefix and watch the host range move.

**Misconceptions.** "The mask is just a number." "A /30 has four hosts." "The router picks the first matching route." "UDP loses all your data."

**Assessment of the project.** Check that the subnets do not overlap and are big enough, the unused address count (8), the routes chosen for the six test destinations and the protocol reasons. Ask students why the staff network is allocated first.

**Reference solution `subnet_designer.py`** (run with `python3 subnet_designer.py`):

```python
"""Subnet Designer: a VLSM addressing plan, a routing table and a TCP-or-UDP decision."""
import ipaddress
import math

BLOCK = ipaddress.ip_network("192.168.10.0/24")
NEEDS = [("Staff PCs", 100), ("Servers", 20), ("Guest Wi-Fi", 50), ("Management", 10), ("Link R1-ISP", 2), ("Link R1-Branch", 2)]

print(f"Addressing plan for {BLOCK}")
print("name            need  subnet              mask             first - last host               usable")
next_free = int(BLOCK.network_address)
plan = {}
for name, need in sorted(NEEDS, key=lambda item: item[1], reverse=True):
    prefix = 32 - math.ceil(math.log2(need + 2))            # +2 for the network and broadcast addresses
    subnet = ipaddress.ip_network((next_free, prefix))
    plan[name] = subnet
    hosts = list(subnet.hosts())
    print(f"{name:<15} {need:>4}  {str(subnet):<19} {str(subnet.netmask):<16} {str(hosts[0]) + ' - ' + str(hosts[-1]):<30} {len(hosts):>6}")
    next_free += subnet.num_addresses
used = next_free - int(BLOCK.network_address)
print(f"addresses used: {used} of {BLOCK.num_addresses}; unused: {BLOCK.num_addresses - used}")

INTERFACES = {"Staff PCs": "eth1", "Guest Wi-Fi": "eth2", "Servers": "eth3", "Management": "eth4", "Link R1-ISP": "eth0", "Link R1-Branch": "eth5"}
isp_end = list(plan["Link R1-ISP"].hosts())[1]
branch_end = list(plan["Link R1-Branch"].hosts())[1]
ROUTES = [(plan[name], "directly connected", INTERFACES[name]) for name in INTERFACES]
ROUTES.append((ipaddress.ip_network("192.168.20.0/24"), str(branch_end), "eth5"))
ROUTES.append((ipaddress.ip_network("0.0.0.0/0"), str(isp_end), "eth0"))

print("\nRouting table of R1")
for network, hop, nic in sorted(ROUTES, key=lambda r: (-r[0].prefixlen, r[0])):
    print(f"  {str(network):<18} via {hop:<19} {nic}")


def route(destination):
    address = ipaddress.ip_address(destination)
    return max((r for r in ROUTES if address in r[0]), key=lambda r: r[0].prefixlen)


print("\nWhere do packets go?")
for destination in ("192.168.10.45", "192.168.10.150", "192.168.10.200", "192.168.10.230", "192.168.20.7", "8.8.8.8"):
    network, hop, nic = route(destination)
    print(f"  {destination:<15} -> {str(network):<18} {nic}  ({hop})")

SERVICES = [
    {"name": "Web page (HTTPS)", "port": 443, "short_request": False, "late_is_useless": False},
    {"name": "E-mail (SMTP)", "port": 587, "short_request": False, "late_is_useless": False},
    {"name": "File transfer (SFTP)", "port": 22, "short_request": False, "late_is_useless": False},
    {"name": "DNS lookup", "port": 53, "short_request": True, "late_is_useless": False},
    {"name": "Video call", "port": 5004, "short_request": False, "late_is_useless": True},
    {"name": "Online game", "port": 27015, "short_request": False, "late_is_useless": True},
]


def choose(service):
    if service["short_request"]:
        return "UDP", "one short request: a handshake would cost more than the message"
    if service["late_is_useless"]:
        return "UDP", "late data is useless: speed matters more than perfect delivery"
    return "TCP", "every byte must arrive, in order"


print("\nTCP or UDP?")
for service in SERVICES:
    protocol, reason = choose(service)
    print(f"  {service['name']:<20} port {service['port']:>5}  {protocol}  {reason}")
```

```output
Addressing plan for 192.168.10.0/24
name            need  subnet              mask             first - last host               usable
Staff PCs        100  192.168.10.0/25     255.255.255.128  192.168.10.1 - 192.168.10.126     126
Guest Wi-Fi       50  192.168.10.128/26   255.255.255.192  192.168.10.129 - 192.168.10.190     62
Servers           20  192.168.10.192/27   255.255.255.224  192.168.10.193 - 192.168.10.222     30
Management        10  192.168.10.224/28   255.255.255.240  192.168.10.225 - 192.168.10.238     14
Link R1-ISP        2  192.168.10.240/30   255.255.255.252  192.168.10.241 - 192.168.10.242      2
Link R1-Branch     2  192.168.10.244/30   255.255.255.252  192.168.10.245 - 192.168.10.246      2
addresses used: 248 of 256; unused: 8

Routing table of R1
  192.168.10.240/30  via directly connected  eth0
  192.168.10.244/30  via directly connected  eth5
  192.168.10.224/28  via directly connected  eth4
  192.168.10.192/27  via directly connected  eth3
  192.168.10.128/26  via directly connected  eth2
  192.168.10.0/25    via directly connected  eth1
  192.168.20.0/24    via 192.168.10.246      eth5
  0.0.0.0/0          via 192.168.10.242      eth0

Where do packets go?
  192.168.10.45   -> 192.168.10.0/25    eth1  (directly connected)
  192.168.10.150  -> 192.168.10.128/26  eth2  (directly connected)
  192.168.10.200  -> 192.168.10.192/27  eth3  (directly connected)
  192.168.10.230  -> 192.168.10.224/28  eth4  (directly connected)
  192.168.20.7    -> 192.168.20.0/24    eth5  (192.168.10.246)
  8.8.8.8         -> 0.0.0.0/0          eth0  (192.168.10.242)

TCP or UDP?
  Web page (HTTPS)     port   443  TCP  every byte must arrive, in order
  E-mail (SMTP)        port   587  TCP  every byte must arrive, in order
  File transfer (SFTP) port    22  TCP  every byte must arrive, in order
  DNS lookup           port    53  UDP  one short request: a handshake would cost more than the message
  Video call           port  5004  UDP  late data is useless: speed matters more than perfect delivery
  Online game          port 27015  UDP  late data is useless: speed matters more than perfect delivery
```

**Differentiation.** Support: provide the `ipaddress` calls (`ip_network((int, prefix))`, `hosts()`, `subnets()`) on a card and the services list; students write the loops. Stretch: the failing plan, the overlap check and the handshake with sequence numbers.

**Discussion questions (not for the student quiz).** Why do routers not need to know the whole path to a destination, only the next hop? What goes wrong if two subnets overlap? Why does a game send its position updates with UDP even though some are lost?
