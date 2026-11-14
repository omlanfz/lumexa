# Lumexa Mission Log: Operating Systems, Networking & Cybersecurity

**Course/Path:** Operating Systems, Networking & Cybersecurity
**Lesson:** 08 of 08
**Title:** Network Security, Threat Analysis and Basic Troubleshooting
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Network map · checklists · Python

---

## Mission Brief

A network that works is only half of the job. The other half is keeping it working when something goes wrong: when a stranger probes it, when someone guesses passwords, when a cable is pulled or a name stops resolving. Professionals answer with three habits. They **design defences** before an attack (firewalls, segments, least privilege). They **think like a defender about threats**: what could go wrong, how likely is it and how bad would it be. And they **troubleshoot systematically**, from the cable up, instead of trying things at random.

In this last lesson of the course you learn the main **network threats** (from the defender's side), **firewalls** and other protections, **threat modelling** with STRIDE and a risk table, **log analysis** that spots attacks, and a **troubleshooting ladder**. Then you complete the **Computer Network Explorer** dossier with its final report. This lesson teaches *defence only*: you will detect and block attacks in simulations, and you must never test anything on a network that is not yours.

## Learning Objectives

1. Name the main network threats and match each with a defence.
2. Write and evaluate firewall rules with first-match order and default deny, and explain segmentation, DMZ, IDS and VPN.
3. Build a simple threat model: assets, threats (STRIDE), likelihood, impact and controls, ranked by risk.
4. Find brute-force logins and port scans by analysing logs.
5. Troubleshoot a network problem with a systematic ladder and the right tools (`ping`, `traceroute`, `nslookup`, `curl`).
6. Complete the Computer Network Explorer dossier with a security analysis and a final report.

## Prerequisites

- Lessons 4 to 7: the network map, addressing and subnets, DNS, HTTP, TLS, authentication and cryptography.
- Python: functions, dictionaries, `collections.Counter`, sets and the `ipaddress` module.

## Concept Explanation

### Network threats, seen from the defender's side

A network can be attacked at every layer. The common threats, and what they mean for a defender, are these:

- **Eavesdropping (sniffing)**: reading traffic that is not encrypted, for example on an open Wi-Fi network. Defence: HTTPS, VPNs and WPA3.
- **Spoofing**: pretending to be somebody else (a forged sender address, a fake DNS answer, a fake Wi-Fi hotspot). Defence: authentication, certificates, filtering of impossible source addresses.
- **Man-in-the-middle**: an attacker who sits between two parties and reads or changes their messages. Defence: TLS with proper certificate checks.
- **Denial of service (DoS, DDoS)**: overloading a service so that real users cannot use it. Defence: rate limiting, extra capacity, a CDN, filtering by the provider.
- **Reconnaissance and port scanning**: probing many ports to find open services. Defence: close unused ports, a firewall with default deny, and detection.
- **Brute-force and credential attacks**: guessing or reusing passwords at high speed. Defence: strong passwords, MFA, lockouts and rate limits, slow hashes.
- **Phishing and malware**: tricking users and running harmful programs. Defence: training, updates, filtering and least privilege.
- **Misconfiguration**: default passwords, services open to the whole internet, forgotten test servers. This is the cause of a large share of real breaches, and the cheapest to prevent.

### Defences: firewalls, segmentation, detection and encryption

A **firewall** filters traffic by rules. Each rule names an action (**allow** or **deny**) and what it matches: the protocol, the source, the destination and the port. Rules are checked **from the top and the first match wins**, so order matters, and the last rule should be a **default deny** that blocks everything not explicitly allowed. A **stateless** firewall looks at each packet alone; a **stateful** firewall remembers connections and allows the replies to traffic that was allowed out. Firewalls work well together with **network segmentation**: splitting the network into zones (staff, servers, guests, management) with the firewall between them, so that a problem in one zone cannot spread freely to the others. A server that must be reachable from the internet is placed in a **DMZ** (demilitarised zone), isolated from the internal network.

Other layers support this. An **intrusion detection system (IDS)** watches traffic and logs for signs of an attack and raises an alarm; an **intrusion prevention system (IPS)** also blocks it. A **VPN** (virtual private network) builds an encrypted tunnel, so that remote staff can reach the office network safely. **Wi-Fi** must use WPA2 or WPA3 with a strong passphrase (never the obsolete WEP), and guests should get their own network. **Updates**, **backups** and **logs** are as important as any gadget: updates close known holes, backups make a ransomware attack survivable, and logs make an attack visible.

### Threat modelling

Before choosing defences, work out what you must defend and against what. A simple **threat model** has five steps: **(1)** list the **assets** (the customer database, the web server, the staff accounts); **(2)** draw the network and the paths the data takes; **(3)** list the **threats**; **(4)** rate each by **likelihood** and **impact** (for example 1 to 5 each) and compute **risk = likelihood × impact**; **(5)** choose **controls** for the highest risks first, and review the model regularly. To make the list of threats complete, use **STRIDE**: **S**poofing (breaks authentication), **T**ampering (integrity), **R**epudiation (denying an action: needs logs), **I**nformation disclosure (confidentiality), **D**enial of service (availability) and **E**levation of privilege (authorisation). Risk is never zero; the goal is to reduce the biggest risks to a level that is acceptable.

### Troubleshooting

A network problem looks the same from the user's chair, "the internet is broken", whatever the cause. A **systematic method** finds it quickly: **define** the problem exactly (who, what, since when), **gather** facts, form a **hypothesis**, **test** it with one change at a time, **fix** it, **verify** that it is solved and **document** it. A very effective strategy is the **ladder**, working from the bottom layer up: is the **link** up (cable, Wi-Fi)? Does the computer have a valid **IP address** (not `169.254.x.x`)? Can it reach the **gateway** (the router)? Can it reach **the internet** by IP address? Does **DNS** turn a name into an address? Does the **service** answer on its port? The first step that fails is where to look.

The tools match the steps: `ipconfig` or `ip addr` (my address and gateway), `ping` (is a host reachable, and how long does the round trip take), `traceroute` or `tracert` (which routers does the packet pass), `nslookup` or `dig` (what does DNS answer), `curl` or the browser's developer tools (what does the web server answer), and `netstat` or `ss` (which ports are open and which connections exist). Typical patterns: *no link* means cable or Wi-Fi; *a 169.254 address* means that DHCP failed; *ping to an IP address works but names fail* means DNS; *names resolve but the page does not load* means the service, the port or a firewall; *slow* usually means latency, congestion or a weak Wi-Fi signal.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Firewall** | A device or program that allows or denies traffic according to rules. |
| **Default deny** | A last rule that blocks everything that no earlier rule allowed. |
| **Segmentation / DMZ** | Splitting a network into zones separated by a firewall / a zone for servers that the internet may reach. |
| **IDS / IPS** | A system that detects attacks and raises an alarm / one that also blocks them. |
| **VPN** | An encrypted tunnel through an untrusted network. |
| **Denial of service** | An attack that overloads a service so that users cannot use it. |
| **Port scan** | Probing many ports of a host to find open services. |
| **Threat model** | A structured list of assets, threats, risks and controls. |
| **STRIDE** | Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege. |
| **Risk** | Likelihood multiplied by impact. |
| **Troubleshooting ladder** | Checking link, IP address, gateway, internet, DNS and service in order. |
| **Log** | A record of events used to find problems and attacks. |

## Worked Examples

### Example 1: A firewall rule engine

```python
import ipaddress

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
    print(f"{number:>4}  {action.upper():<8}  {packet:<44} {why}")
```

```output
rule  decision  packet
   1  ALLOW     tcp 198.51.100.7 -> 192.168.10.200:443       stranger opens the secure web server
   6  DENY      tcp 198.51.100.7 -> 192.168.10.200:22        stranger tries SSH to the server
   2  ALLOW     tcp 192.168.10.45 -> 192.168.10.200:22       a staff PC administers the server
   6  DENY      tcp 192.168.10.150 -> 192.168.10.200:22      a guest tries SSH to the server
   3  ALLOW     udp 192.168.10.45 -> 8.8.8.8:53              a staff PC asks DNS
   6  DENY      tcp 192.168.10.45 -> 93.184.216.34:23        a staff PC uses telnet (unencrypted)
```

1. Each rule is a tuple: the action, the protocol, the source network, the destination network and the destination port. `decide` walks the list from the top and returns the first rule that matches both addresses, the protocol and the port.
2. The stranger can reach the web server on port 443 (rule 1) but not on port 22: that packet matches no allow rule and falls into the **default deny** at the end (rule 6).
3. Staff may use SSH to the servers (rule 2) and guests may not, although both are inside the building: the rules express **least privilege** between zones.
4. Telnet is not mentioned in any allow rule, so it is denied by the default rule. Because anything not explicitly allowed is blocked, a forgotten service stays closed.

### Example 2: A threat model with risk scores

```python
# threat, STRIDE category, likelihood 1-5, impact 1-5
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
print(f"\n{len(high)} high risk(s) to treat first")
```

```output
risk = likelihood x impact
risk  level   likelihood  impact  threat (STRIDE)
  16  HIGH             4       4  phishing e-mail steals a staff password (Spoofing)
  12  MEDIUM           3       4  denial of service against the web server (Denial of service)
  10  MEDIUM           2       5  stolen password database (Information disclosure)
  10  MEDIUM           2       5  someone changes grades without permission (Tampering)
   9  MEDIUM           3       3  guest Wi-Fi used to reach the servers (Elevation of privilege)
   2  LOW              1       2  an admin denies running a command (Repudiation)

1 high risk(s) to treat first
```

1. The model lists six threats, one for each letter of STRIDE, each with a likelihood and an impact between 1 and 5. The risk score is their product (1 to 25), and `level` turns it into HIGH (15 or more), MEDIUM (8 to 14) or LOW.
2. Sorting by score puts the phishing threat first (4 × 4 = 16): it is both likely and harmful. A stolen database is unlikely but very harmful (10), and the admin who denies a command is neither (2).
3. The point of the table is **priority**: with limited time and money you treat the high risks first, then the medium ones, and you accept the low ones knowingly.
4. Scores are judgements, not facts. Different people may rate a threat differently, which is why a model is discussed and reviewed, not just calculated.

### Example 3: Finding attacks in logs

```python
from collections import Counter, defaultdict

LOG = """\
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
print("\ndistinct ports touched per address")
for address, touched in ports.items():
    verdict = "PORT SCAN: block it" if len(touched) >= 5 else "normal"
    print(f"  {address:<15} {len(touched)} ports  {verdict}")
```

```output
failed logins per address
  203.0.113.9     6 failures  BRUTE-FORCE SUSPECT: block it
  192.168.10.45   1 failures  probably a typing mistake

distinct ports touched per address
  198.51.100.7    7 ports  PORT SCAN: block it
```

1. Every log line is split into its fields. A `Counter` counts the failed logins per source address, and a dictionary of sets collects the *distinct* ports that each address probed.
2. The address 203.0.113.9 failed six times in eight seconds with different user names (`ana`, `admin`, `root`, `cara`): that is a **brute-force** pattern. The internal address with one failure is most likely a person who mistyped.
3. The address 198.51.100.7 touched seven different ports within two seconds, which no normal client does: a **port scan**.
4. Defenders turn rules like these into alarms and automatic blocking (a firewall rule that denies the address). Simple counting over a log is the heart of many real detection tools.

## Common Mistakes and Misconceptions

- **Putting a broad allow rule above a specific deny rule.** The first match wins, so an early broad rule makes later rules useless.
- **Forgetting the default deny.** Without it, anything not mentioned may be allowed by the device's default.
- **Believing that a firewall alone makes a network safe.** It is one layer; passwords, updates, encryption, logging and training matter too.
- **Thinking that attackers only come from outside.** Mistakes and misuse inside the network are as common, which is why zones and least privilege exist.
- **Ranking risks by fear instead of by numbers.** Multiply likelihood and impact, and treat the biggest scores first.
- **Troubleshooting at random.** Changing many things at once hides the cause; test one hypothesis at a time and start at the bottom of the ladder.
- **Blaming the internet for a local problem.** Pinging the gateway and then an outside address shows in seconds where the break is.
- **Testing security on systems that you do not own.** Scanning or guessing passwords on other people's systems is illegal and harmful; use your own lab and simulations.

## Guided Hands-On Activity

**Defend and diagnose (in the simulation).** Work with your teacher.

1. In Example 1 add a packet from a guest PC to a staff PC on port 445 (file sharing). Predict the rule and the decision, then run it.
2. In Example 1 move the rule `("allow", "tcp", STAFF, ANY, 443)` below the default deny. What happens to staff browsing, and why does the order matter?
3. In Example 2 add a threat "an unpatched server is taken over" with likelihood 3 and impact 5. Where does it rank, and what control would you choose?
4. In Example 3 add six failed logins from a new address `203.0.113.77` and check that it is flagged. Then change the threshold from 5 to 7 and see which addresses are still flagged. What is the cost of a threshold that is too low or too high?
5. On your own computer, use the ladder: find your IP address and gateway, `ping` the gateway, `ping 8.8.8.8` and `ping` a website's name. At which step would a broken DNS show up?
6. Draw the troubleshooting flowchart for "the web page does not load" on paper, with a question at every step and the action for each "no".

## Lesson Project: Network Explorer Final Report

### Objective

Complete the **Computer Network Explorer** dossier with a final report generator in Python: the firewall rules of the router R1 tested on eight packets, a ranked threat model with controls, a log analysis that finds the addresses to block, a troubleshooting ladder tested on seven scenarios, and a one-page summary of the whole dossier.

### Requirements

- **Firewall.** Using the addressing plan of Lesson 5 (Staff 192.168.10.0/25, Guests 192.168.10.128/26, Servers 192.168.10.192/27, Management 192.168.10.224/28), write the rules: anybody may use the servers on tcp 443; the management network may use tcp 22 to the servers; staff and guests may use udp 53 and tcp 443 to anywhere; everything else is denied. Test these eight packets and print the rule number and the decision for each: a stranger to the servers on 443, the same stranger on 22, an admin (192.168.10.230) to a server on 22, a staff PC (192.168.10.45) to a server on 22, a guest (192.168.10.150) to a staff PC on 445, the guest to the web on 443, the staff PC to DNS (udp 53) and the staff PC to the internet on 23.
- **Threat model.** Six threats with a STRIDE category, likelihood, impact and a control: phishing steals a staff password (4, 4), denial of service on the web server (3, 4), stolen user database (2, 5), grades changed without permission (2, 5), guest Wi-Fi reaches the servers (3, 3) and an open management port on the internet (4, 5). Print them ranked by risk with HIGH (15 or more), MEDIUM (8 to 14) or LOW.
- **Log analysis.** Analyse the sample log given below (fields: time, result, user, `from`, address, `port`, port) with a threshold of 5 failed logins or 5 distinct ports, and print the failure counts, the ports probed and the addresses to block.
- **Troubleshooting.** Write `diagnose(state)` for the ladder link, IP address, gateway, internet, DNS and service, and run it on the scenarios: cable unplugged, a 169.254.x.x address, router switched off, provider outage, wrong DNS server, web server stopped and a normal day.
- **Final report.** Print a seven-line summary of the dossier (host profile, scheduling, memory, network map, addressing, web request, security) using the findings of your earlier pages and the numbers of this lesson.
- In the dossier, write a closing paragraph with your three most important recommendations for the network.

The sample log:

```text
09:00:01 FAIL ana from 203.0.113.55 port 22
09:00:02 FAIL ana from 203.0.113.55 port 22
09:00:03 FAIL root from 203.0.113.55 port 22
09:00:04 FAIL admin from 203.0.113.55 port 22
09:00:05 FAIL ben from 203.0.113.55 port 22
09:00:06 FAIL cara from 203.0.113.55 port 22
09:00:07 FAIL cara from 203.0.113.55 port 22
09:05:00 FAIL ben from 192.168.10.45 port 22
09:10:00 PROBE - from 198.51.100.23 port 21
09:10:00 PROBE - from 198.51.100.23 port 22
09:10:01 PROBE - from 198.51.100.23 port 23
09:10:01 PROBE - from 198.51.100.23 port 25
09:10:01 PROBE - from 198.51.100.23 port 80
09:10:02 PROBE - from 198.51.100.23 port 3389
```

### Instructions

1. Write the networks and the rule list, then `decide`, and test the eight packets.
2. Write the threat list, sort it by risk and print it with levels and controls.
3. Parse the log with `Counter` and a dictionary of sets; compute the addresses to block.
4. Write the checks of the ladder and `diagnose`; run the seven scenarios.
5. Write the findings list and print the summary with the security line computed from your results.
6. Compare with the expected output.
7. Assemble the dossier (host profile, scheduling, memory, map, addressing, request trace, security, threat model, firewall, troubleshooting flowchart) and write your recommendations.

### Expected Output

```text
Firewall rules of R1 (default deny)
  rule 1  ALLOW tcp 198.51.100.7 -> 192.168.10.200:443       a stranger opens the secure web server
  rule 7  DENY  tcp 198.51.100.7 -> 192.168.10.200:22        a stranger tries SSH to a server
  rule 2  ALLOW tcp 192.168.10.230 -> 192.168.10.200:22      an admin administers a server
  rule 7  DENY  tcp 192.168.10.45 -> 192.168.10.200:22       a staff PC tries SSH to a server
  rule 7  DENY  tcp 192.168.10.150 -> 192.168.10.45:445      a guest tries file sharing on a staff PC
  rule 6  ALLOW tcp 192.168.10.150 -> 93.184.216.34:443      a guest browses the web
  rule 3  ALLOW udp 192.168.10.45 -> 8.8.8.8:53              a staff PC asks DNS
  rule 7  DENY  tcp 192.168.10.45 -> 93.184.216.34:23        a staff PC uses telnet
  4 of 8 test packets allowed, 4 denied

Threat model, highest risk first
  20 HIGH   open management port 22 on the internet    -> allow SSH only from the management subnet
  16 HIGH   phishing steals a staff password           -> MFA and user training
  12 MEDIUM denial of service on the web server        -> rate limiting and a CDN
  10 MEDIUM stolen user database                       -> salted slow password hashes
  10 MEDIUM grades changed without permission          -> RBAC and an audit log
   9 MEDIUM guest Wi-Fi reaches the servers            -> firewall rules and segmentation

Log analysis
  failed logins: {'203.0.113.55': 7, '192.168.10.45': 1}
  ports probed: {'198.51.100.23': 6}
  addresses to block: 198.51.100.23, 203.0.113.55

Troubleshooting ladder (bottom to top)
  cable unplugged      -> no network link; check the cable or the Wi-Fi connection
  169.254.x.x address  -> no valid IP address; the DHCP server is not answering, so check DHCP and the cable
  router switched off  -> cannot reach the router; check the router, the switch and the default gateway setting
  provider outage      -> cannot reach the internet; the router works, so contact the provider
  DNS server wrong     -> names do not resolve; pinging an IP address works, so check the DNS server setting
  web server stopped   -> the service does not answer; check that the server program runs and that the firewall allows its port
  normal day           -> everything works; no action needed

Final report: Computer Network Explorer
  1. Host profile  9 processes; the browser uses most memory
  2. Scheduling    SJF has the best average waiting time, round robin the best response
  3. Memory        LRU needs 5 frames to stay at 8 faults or fewer
  4. Network map   10 devices; R1 is a single point of failure
  5. Addressing    6 subnets from 192.168.10.0/24, 8 addresses spare
  6. Web request   333 ms in total; the download is the slowest step
  7. Security      4 of 8 test packets allowed; top risk: open management port 22 on the internet; block 2 addresses
```

### Hints

1. **Hint 1 (the first match).** Loop over the rules with `enumerate`; return the rule number and the action of the first rule whose protocol, source, destination and port all match.
2. **Hint 2 (the order).** Put the specific allow rules first and the default deny last, and test the packets that must be denied as carefully as the ones that must be allowed.
3. **Hint 3 (the risk).** `sorted(THREATS, key=lambda t: t[2] * t[3], reverse=True)` ranks by likelihood × impact.
4. **Hint 4 (the log).** `Counter()` for the failures and `defaultdict(set)` for the ports; the threshold is 5 for both.
5. **Hint 5 (the ladder).** Check the problems in order and return at the first one that fails; if none fails, "everything works".
6. **Hint 6 (the summary).** Use an f-string for the security line, so that the numbers come from your results, not from typing.

### Success Criteria

- [ ] The firewall allows exactly four of the eight test packets and uses the default deny (rule 7) for four of them.
- [ ] The admin can reach the servers by SSH, but the staff PC and the stranger cannot.
- [ ] The threat model ranks the open management port first (risk 20) and shows two HIGH risks.
- [ ] The log analysis flags both 203.0.113.55 (7 failed logins) and 198.51.100.23 (6 ports) and does not flag the internal address.
- [ ] The troubleshooting ladder gives the right diagnosis for all seven scenarios.
- [ ] The final report has seven lines and its security line is computed, not typed.
- [ ] The dossier is complete and has three recommendations.

### Extension Challenge

Add a **stateful** feature to the firewall: remember the connections that were allowed out (source, destination, port) and allow the matching replies back in, then show that an unsolicited packet from the same address is still denied. Next, add a **rate limit** to the log analysis (more than 5 failures within 10 seconds) using the time stamps. Finally, draw the final network map of the dossier with the zones, the firewall rules on the arrows and the risk numbers next to the assets, and present it to the class in two minutes.

## Lesson Recap

- Network threats include eavesdropping, spoofing, man-in-the-middle, denial of service, scanning, brute force, phishing and misconfiguration; each has a matching defence.
- A **firewall** checks rules from the top, the first match wins, and the last rule is **default deny**; **segmentation**, a **DMZ**, an **IDS**, a **VPN**, WPA3, updates and backups add layers.
- A **threat model** lists assets and threats (**STRIDE**), rates **risk = likelihood × impact** and chooses controls for the biggest risks first.
- **Logs** reveal brute-force attacks and port scans by counting; the **troubleshooting ladder** (link, IP, gateway, internet, DNS, service) finds the failing step with one tool for each.

## Homework / Extension Mission

Write the one-page "security rules for my home network": which devices exist, which Wi-Fi security you use, who has the router password, how updates happen and what you would do if the internet stopped working (use the ladder). Then pick one real security incident from the news (a data leak or an outage) and describe, in five lines, which STRIDE categories it involved and which control would have reduced the risk. Finally, finish your Computer Network Explorer dossier and prepare a two-minute presentation of the network map, the biggest risk and your top recommendation.

## Course Project Connection

This lesson **completes the Computer Network Explorer**, the course project. The dossier now contains the host profile (Lesson 1), the scheduling results (Lesson 2), the memory results (Lesson 3), the network map (Lesson 4), the addressing plan and routing table (Lesson 5), the web-request trace (Lesson 6), the security design (Lesson 7), and in this lesson the threat model, the firewall rules, the troubleshooting flowchart and the final report. Presenting it shows that you can explain how software runs, how computers communicate and how information is protected. The course assessment checks what you have learned in this course.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: threats and defences as a table (ask students to match them); 15 minutes: firewall rules by hand on the board, with the first-match rule; 10 minutes: threat modelling with a school example and STRIDE; 5 minutes: the troubleshooting ladder; 20 minutes: the final report. Reserve time at the end for short presentations.

**Live demonstrations.** Run the firewall engine with a changed rule order. Show a real log (the school's, if permitted) and count failures with a spreadsheet filter. Walk through the ladder with `ping` and `nslookup` on the teacher's machine. Emphasise that everything in the lesson is *defensive* and that scanning or guessing passwords on networks you do not own is illegal.

**Misconceptions.** "A firewall makes us safe." "Attackers always come from the internet." "Risk can be reduced to zero." "Troubleshooting is guessing until it works."

**Assessment of the project.** Mark the final report: the firewall result and its explanation (20), the threat model and the controls (20), the log analysis and the block list (15), the troubleshooting ladder (15), the quality of the dossier and its coherence (20) and the three recommendations (10). Ask each student to explain why the order of the firewall rules matters and which risk they would treat first.

**Reference solution `network_explorer_report.py`** (run with `python3 network_explorer_report.py`):

```python
"""Network Explorer Final Report: firewall rules, a threat model, log analysis and a troubleshooting ladder."""
import ipaddress
from collections import Counter, defaultdict

ANY = ipaddress.ip_network("0.0.0.0/0")
STAFF, GUESTS = ipaddress.ip_network("192.168.10.0/25"), ipaddress.ip_network("192.168.10.128/26")
SERVERS, MGMT = ipaddress.ip_network("192.168.10.192/27"), ipaddress.ip_network("192.168.10.224/28")

RULES = [                                                    # checked from the top, the first match wins
    ("allow", "tcp", ANY, SERVERS, 443),
    ("allow", "tcp", MGMT, SERVERS, 22),
    ("allow", "udp", STAFF, ANY, 53),
    ("allow", "udp", GUESTS, ANY, 53),
    ("allow", "tcp", STAFF, ANY, 443),
    ("allow", "tcp", GUESTS, ANY, 443),
    ("deny", "any", ANY, ANY, None),
]


def decide(protocol, source, destination, port):
    for number, (action, proto, src, dst, rule_port) in enumerate(RULES, start=1):
        if (proto in ("any", protocol) and ipaddress.ip_address(source) in src
                and ipaddress.ip_address(destination) in dst and rule_port in (None, port)):
            return number, action
    return len(RULES), "deny"


PACKETS = [
    ("tcp", "198.51.100.7", "192.168.10.200", 443, "a stranger opens the secure web server"),
    ("tcp", "198.51.100.7", "192.168.10.200", 22, "a stranger tries SSH to a server"),
    ("tcp", "192.168.10.230", "192.168.10.200", 22, "an admin administers a server"),
    ("tcp", "192.168.10.45", "192.168.10.200", 22, "a staff PC tries SSH to a server"),
    ("tcp", "192.168.10.150", "192.168.10.45", 445, "a guest tries file sharing on a staff PC"),
    ("tcp", "192.168.10.150", "93.184.216.34", 443, "a guest browses the web"),
    ("udp", "192.168.10.45", "8.8.8.8", 53, "a staff PC asks DNS"),
    ("tcp", "192.168.10.45", "93.184.216.34", 23, "a staff PC uses telnet"),
]
print("Firewall rules of R1 (default deny)")
allowed = 0
for protocol, source, destination, port, why in PACKETS:
    number, action = decide(protocol, source, destination, port)
    allowed += action == "allow"
    packet = f"{protocol} {source} -> {destination}:{port}"
    print(f"  rule {number}  {action.upper():<5} {packet:<44} {why}")
print(f"  {allowed} of {len(PACKETS)} test packets allowed, {len(PACKETS) - allowed} denied")

# threat, STRIDE category, likelihood, impact, control
THREATS = [
    ("phishing steals a staff password", "Spoofing", 4, 4, "MFA and user training"),
    ("denial of service on the web server", "Denial of service", 3, 4, "rate limiting and a CDN"),
    ("stolen user database", "Information disclosure", 2, 5, "salted slow password hashes"),
    ("grades changed without permission", "Tampering", 2, 5, "RBAC and an audit log"),
    ("guest Wi-Fi reaches the servers", "Elevation of privilege", 3, 3, "firewall rules and segmentation"),
    ("open management port 22 on the internet", "Elevation of privilege", 4, 5, "allow SSH only from the management subnet"),
]
print("\nThreat model, highest risk first")
ranked = sorted(THREATS, key=lambda t: t[2] * t[3], reverse=True)
for name, stride, likelihood, impact, control in ranked:
    score = likelihood * impact
    print(f"  {score:>2} {'HIGH' if score >= 15 else 'MEDIUM' if score >= 8 else 'LOW':<6} {name:<42} -> {control}")

LOG = """\
09:00:01 FAIL ana from 203.0.113.55 port 22
09:00:02 FAIL ana from 203.0.113.55 port 22
09:00:03 FAIL root from 203.0.113.55 port 22
09:00:04 FAIL admin from 203.0.113.55 port 22
09:00:05 FAIL ben from 203.0.113.55 port 22
09:00:06 FAIL cara from 203.0.113.55 port 22
09:00:07 FAIL cara from 203.0.113.55 port 22
09:05:00 FAIL ben from 192.168.10.45 port 22
09:10:00 PROBE - from 198.51.100.23 port 21
09:10:00 PROBE - from 198.51.100.23 port 22
09:10:01 PROBE - from 198.51.100.23 port 23
09:10:01 PROBE - from 198.51.100.23 port 25
09:10:01 PROBE - from 198.51.100.23 port 80
09:10:02 PROBE - from 198.51.100.23 port 3389"""
failures, ports = Counter(), defaultdict(set)
for line in LOG.splitlines():
    _, kind, _, _, address, _, port = line.split()
    if kind == "FAIL":
        failures[address] += 1
    else:
        ports[address].add(int(port))
blocked = sorted([a for a, n in failures.items() if n >= 5] + [a for a, p in ports.items() if len(p) >= 5])
print("\nLog analysis")
print("  failed logins:", dict(failures))
print("  ports probed:", {address: len(touched) for address, touched in ports.items()})
print("  addresses to block:", ", ".join(blocked))

CHECKS = [("link", "no network link", "check the cable or the Wi-Fi connection"),
          ("ip", "no valid IP address", "the DHCP server is not answering, so check DHCP and the cable"),
          ("gateway", "cannot reach the router", "check the router, the switch and the default gateway setting"),
          ("internet", "cannot reach the internet", "the router works, so contact the provider"),
          ("dns", "names do not resolve", "pinging an IP address works, so check the DNS server setting"),
          ("service", "the service does not answer", "check that the server program runs and that the firewall allows its port")]


def diagnose(state):
    for key, problem, advice in CHECKS:
        if not state[key]:
            return problem, advice
    return "everything works", "no action needed"


GOOD = dict(link=True, ip=True, gateway=True, internet=True, dns=True, service=True)
SCENARIOS = [("cable unplugged", {**GOOD, "link": False}), ("169.254.x.x address", {**GOOD, "ip": False}),
             ("router switched off", {**GOOD, "gateway": False}), ("provider outage", {**GOOD, "internet": False}),
             ("DNS server wrong", {**GOOD, "dns": False}), ("web server stopped", {**GOOD, "service": False}), ("normal day", GOOD)]
print("\nTroubleshooting ladder (bottom to top)")
for name, state in SCENARIOS:
    problem, advice = diagnose(state)
    print(f"  {name:<20} -> {problem}; {advice}")

print("\nFinal report: Computer Network Explorer")
FINDINGS = [
    ("Host profile", "9 processes; the browser uses most memory"),
    ("Scheduling", "SJF has the best average waiting time, round robin the best response"),
    ("Memory", "LRU needs 5 frames to stay at 8 faults or fewer"),
    ("Network map", "10 devices; R1 is a single point of failure"),
    ("Addressing", "6 subnets from 192.168.10.0/24, 8 addresses spare"),
    ("Web request", "333 ms in total; the download is the slowest step"),
    ("Security", f"{allowed} of {len(PACKETS)} test packets allowed; top risk: {ranked[0][0]}; block {len(blocked)} addresses"),
]
for number, (page, finding) in enumerate(FINDINGS, start=1):
    print(f"  {number}. {page:<13} {finding}")
```

```output
Firewall rules of R1 (default deny)
  rule 1  ALLOW tcp 198.51.100.7 -> 192.168.10.200:443       a stranger opens the secure web server
  rule 7  DENY  tcp 198.51.100.7 -> 192.168.10.200:22        a stranger tries SSH to a server
  rule 2  ALLOW tcp 192.168.10.230 -> 192.168.10.200:22      an admin administers a server
  rule 7  DENY  tcp 192.168.10.45 -> 192.168.10.200:22       a staff PC tries SSH to a server
  rule 7  DENY  tcp 192.168.10.150 -> 192.168.10.45:445      a guest tries file sharing on a staff PC
  rule 6  ALLOW tcp 192.168.10.150 -> 93.184.216.34:443      a guest browses the web
  rule 3  ALLOW udp 192.168.10.45 -> 8.8.8.8:53              a staff PC asks DNS
  rule 7  DENY  tcp 192.168.10.45 -> 93.184.216.34:23        a staff PC uses telnet
  4 of 8 test packets allowed, 4 denied

Threat model, highest risk first
  20 HIGH   open management port 22 on the internet    -> allow SSH only from the management subnet
  16 HIGH   phishing steals a staff password           -> MFA and user training
  12 MEDIUM denial of service on the web server        -> rate limiting and a CDN
  10 MEDIUM stolen user database                       -> salted slow password hashes
  10 MEDIUM grades changed without permission          -> RBAC and an audit log
   9 MEDIUM guest Wi-Fi reaches the servers            -> firewall rules and segmentation

Log analysis
  failed logins: {'203.0.113.55': 7, '192.168.10.45': 1}
  ports probed: {'198.51.100.23': 6}
  addresses to block: 198.51.100.23, 203.0.113.55

Troubleshooting ladder (bottom to top)
  cable unplugged      -> no network link; check the cable or the Wi-Fi connection
  169.254.x.x address  -> no valid IP address; the DHCP server is not answering, so check DHCP and the cable
  router switched off  -> cannot reach the router; check the router, the switch and the default gateway setting
  provider outage      -> cannot reach the internet; the router works, so contact the provider
  DNS server wrong     -> names do not resolve; pinging an IP address works, so check the DNS server setting
  web server stopped   -> the service does not answer; check that the server program runs and that the firewall allows its port
  normal day           -> everything works; no action needed

Final report: Computer Network Explorer
  1. Host profile  9 processes; the browser uses most memory
  2. Scheduling    SJF has the best average waiting time, round robin the best response
  3. Memory        LRU needs 5 frames to stay at 8 faults or fewer
  4. Network map   10 devices; R1 is a single point of failure
  5. Addressing    6 subnets from 192.168.10.0/24, 8 addresses spare
  6. Web request   333 ms in total; the download is the slowest step
  7. Security      4 of 8 test packets allowed; top risk: open management port 22 on the internet; block 2 addresses
```

**Differentiation.** Support: provide the rule engine and the `diagnose` skeleton with the `CHECKS` list; students write the rules, the threat list and the summary. Stretch: the stateful firewall, the time-window rate limit and the annotated final network map.

**Discussion questions (not for the student quiz).** Why is "deny everything, then allow what is needed" safer than "allow everything, then block what is bad"? How would you decide that a risk is acceptable? What could go wrong if a detection tool blocks an address automatically?
