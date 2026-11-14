# Lumexa Mission Log: Python, Artificial Intelligence & Modern Computing

**Course/Path:** Python, Artificial Intelligence & Modern Computing
**Lesson:** 07 of 08
**Title:** Exploring Cloud Computing, Mobile Development, Robotics, IoT and Distributed Systems
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Python

---

## Mission Brief

Modern computing is no longer one computer on a desk. It is a phone in every pocket, sensors in fields and factories, robots on production lines, and data centres that you will never see, all connected by networks and all cooperating on tasks that no single machine could do. For a student at the start of a computer science degree this landscape can look like a jungle of buzzwords: cloud, apps, robots, IoT, microservices. In fact every one of these fields is built from the fundamentals that you have already learned.

In this lesson you take a guided tour of **cloud computing**, **mobile development**, **robotics**, the **Internet of Things** and **distributed systems**, and you connect each of them back to networks, operating systems, databases, algorithms and security. This is a tour, not a specialist course: the aim is that you can describe each field honestly and choose what to explore next. Then you experience the central difficulty of all of them, an unreliable network, by building a **simulated sensor pipeline** that survives lost, duplicated and shuffled messages, and you draw a map of the technology landscape.

## Learning Objectives

1. Explain cloud computing (IaaS, PaaS, SaaS, elasticity, regions, shared responsibility) and its trade-offs.
2. Describe the choices and constraints of mobile development (native, cross-platform, web apps, battery, connectivity, permissions) and the client and backend pattern.
3. Explain the sense-think-act loop of a robot, simple feedback control, and the architecture of an IoT system (devices, gateway, MQTT, cloud, edge).
4. Explain why distributed systems are hard (no shared clock, lost, delayed and duplicated messages, partial failure) and the ideas of retries, idempotency, replication, consistency and the CAP theorem.
5. Simulate a sensor pipeline in Python that validates, smooths and delivers readings through an unreliable network and produces correct results despite duplicates.
6. Map each field to the fundamentals that it builds on, and discuss its security, privacy and sustainability issues.

## Prerequisites

- Lessons 1 to 6: Python data handling, algorithms and the idea of a pipeline of data processing.
- Networks and security basics from the courses on operating systems and networking, and on cybersecurity: packets, protocols, HTTP and the idea of an attack surface.
- Databases and the client and server pattern from the lessons on web technologies.

## Concept Explanation

### Cloud computing

**Cloud computing** means renting computing power, storage and software over the internet instead of owning the machines. A provider runs huge data centres, and you pay for what you use. Three service models are usual. With **IaaS** (infrastructure as a service) you rent virtual machines, storage and networks and manage the operating system and everything above it yourself. With **PaaS** (platform as a service) you hand over your code, and the provider runs it, manages the servers and scales them. With **SaaS** (software as a service) you simply use a finished application, such as e-mail or a document editor, in a browser. **Serverless** functions run a small piece of code only when an event arrives and are billed for each run.

The key properties are **on-demand** self-service, **elasticity** (add machines when the load rises and remove them when it falls), **pay-per-use** pricing and **regions**: data centres in several parts of the world, each with several separate **availability zones**, so that a fault in one building does not stop the service. Underneath lie **virtualisation**, one physical computer shared among many virtual machines (an idea from the operating systems course), and **containers**, light packages of a program with everything that it needs. The trade-offs are real. The bill can grow without limit if you forget to switch things off, moving away from a provider can be hard (**vendor lock-in**), the law may limit where personal data may be stored, and even the largest providers have outages. Security is a **shared responsibility**: the provider secures the data centre, and you secure your accounts, your settings and your data.

### Mobile development

Most people meet computing on a phone. A **mobile app** runs on **Android** or **iOS**. A **native** app is written for one platform with its own tools and languages (Kotlin or Java for Android, Swift for iOS) and has the best speed and the best access to the device. A **cross-platform** framework, such as Flutter or React Native, lets one code base run on both platforms. A **web app** or **progressive web app (PWA)** is a website that behaves like an app and needs no store. The choice is a trade-off between development cost, performance and access to the device.

Phones impose constraints that desktop programs ignore. The **battery** is small, so background work is limited. The **connection is unreliable**, so good apps work **offline first** and synchronise later. The screens are small and very different. And **permissions** matter: the user must agree before an app may use the camera, the microphone or the location. Behind most apps there is a **backend**: the app is a client that talks to a web **API** over HTTPS with JSON, the very pattern of the web lessons, while the data on the phone itself may be kept in a small database such as SQLite. One rule of mobile security is absolute: never put a secret key in the app, because anybody can unpack an app and read it. Keep secrets on the server and let the server decide what each user may do.

### Robotics and the Internet of Things

A **robot** is a machine that senses, decides and acts. Its **sensors** (distance sensors, cameras, motion sensors) measure the world, a **controller** (a microcontroller or a small computer) decides what to do, and its **actuators** (motors, valves) change the world. This **sense-think-act loop** runs many times a second. The simplest control method is **feedback**: measure the **error** between the target and the actual value and act in proportion to it, as a thermostat or a line-following robot does. Feedback has pitfalls, which you will see in Example 3: if the sensor reports old data, or the reaction is too strong, the robot oscillates. Robots also need **real-time** behaviour (a late answer can be a crash) and **safety**: a robot must never trust one sensor reading blindly.

The **Internet of Things (IoT)** connects everyday objects, such as a soil sensor, an air-quality monitor or a smart meter, to the internet. A typical system has small, cheap **devices** with a microcontroller, little memory and a battery; a **connection** (Wi-Fi, Bluetooth, LoRa or the mobile network); often a **gateway** that collects the data of many devices; and **cloud services** that store the data, apply rules, send alerts and feed dashboards and phone apps. Devices often use **MQTT**, a light **publish and subscribe** protocol: a device **publishes** a message on a **topic** such as `farm/greenhouse1/temperature`, a central **broker** forwards it to every program that **subscribed** to that topic, and sender and receivers need not know each other. **Edge computing** does part of the work near the sensor (filtering, averaging, a quick alarm) to save bandwidth, to react faster and to keep working when the connection is poor. IoT brings serious duties: devices with default passwords or no updates have been turned into botnets, and data from a home or a body is personal data.

### Distributed systems

A **distributed system** is a group of computers that cooperate by sending messages to deliver one service: a search engine, a bank, a messaging app, an IoT platform. We build them for **scale** (one computer is not enough), **availability** (one failure must not stop the service) and **nearness** (data close to the users). They are hard because a network is not a wire inside one computer. There is **no shared memory** and **no single clock**. Messages can be **lost, delayed, duplicated or reordered**. Computers fail independently, so a part of the system can be down while the rest runs (**partial failure**), and from the outside a slow reply and a dead machine look the same.

The standard tools follow from these problems. **Timeouts and retries**: if no acknowledgement arrives, send again. But a retry can create a **duplicate**, because the first message may have arrived and only its acknowledgement was lost. So there are three **delivery guarantees**: **at-most-once** (send once; a message may be lost), **at-least-once** (retry until acknowledged; a message may arrive twice) and, in practice, **effectively-once**: at-least-once delivery plus an **idempotent** receiver, one for which applying the same message twice has the same effect as applying it once, usually because every message carries a **sequence number** and the receiver ignores numbers that it has already seen. **Replication** keeps copies of data on several machines for availability, which raises the question of **consistency**: with **strong consistency** every reader sees the latest write, with **eventual consistency** the copies agree after a while. The **CAP theorem** says that when the network **partitions** (some machines cannot reach others) a system must choose between staying **consistent** (refusing some requests) and staying **available** (answering, perhaps with stale data). **Consensus** algorithms such as Raft let machines agree on one value despite failures, **load balancers** spread the requests, and **queues** decouple the sender from the receiver.

### The technology landscape: connecting back to the fundamentals

None of these fields is a separate world. The **cloud** is operating systems (virtualisation, scheduling), networks, databases and security at a very large scale. **Mobile apps** are programming and interface design on top of an API, a network and a local database, on a small processor with a battery. **Robotics** and **IoT** rest on computer organisation (microcontrollers, sensors and interfaces), algorithms (control and filtering), networks and security. **Distributed systems** are networks, operating systems, algorithms and discrete mathematics (logic, graphs and the proofs behind consensus). **AI** is algorithms, discrete mathematics, data and a great deal of computing power. The project of this lesson ends with a small map that counts how often each fundamental appears. The practical lesson of the map is that a student who knows the fundamentals well can learn any of these fields in months, while a student who knows only one framework must start again when the framework changes.

## Key Vocabulary

| Term | Definition |
|---|---|
| **IaaS / PaaS / SaaS** | Rented infrastructure (virtual machines) / a rented platform that runs your code / a finished application that you use. |
| **Elasticity** | Adding computing power when the load rises and removing it when it falls. |
| **Region / availability zone** | A part of the world with data centres / a separate data centre building within a region. |
| **Shared responsibility** | The provider secures the cloud; you secure what you put in it. |
| **Native / cross-platform app** | An app written for one platform / one code base for several platforms. |
| **Sense-think-act loop** | The repeated cycle of a robot: measure, decide, move. |
| **Feedback control** | Acting in proportion to the error between the target and the measured value. |
| **IoT / gateway** | Everyday objects connected to the internet / a device that collects the data of many small devices. |
| **MQTT / topic / broker** | A light publish and subscribe protocol / the name that messages are published on / the server that forwards them to subscribers. |
| **Edge computing** | Processing data near the sensor instead of in a distant data centre. |
| **Partial failure** | Some parts of a distributed system are down while the rest still works. |
| **At-least-once / idempotent** | A message is retried until it is acknowledged, so it can arrive twice / applying it twice has the same effect as applying it once. |
| **Consistency / CAP theorem** | Whether all readers see the latest write / during a partition a system must give up consistency or availability. |

## Worked Examples

### Example 1: A sensor pipeline at the gateway

```python
READINGS = [24.1, 23.8, 23.5, None, 22.9, 22.7, 23.4, 25.0, 27.2, 29.5, 31.8, 33.4,
            34.9, -999, 35.6, 34.2, 32.0, 30.1, 28.4, 85.0, 26.3, 25.1, 24.6, 24.0]   # one per hour


def validate(readings, low=-10, high=50):
    """Keep (hour, value) pairs that make sense; explain every reading that is rejected."""
    good, rejected = [], []
    for hour, value in enumerate(readings):
        if value is None:
            rejected.append(f"hour {hour}: no reading")
        elif not low <= value <= high:
            rejected.append(f"hour {hour}: {value} is outside {low} to {high}")
        else:
            good.append((hour, value))
    return good, rejected


def smooth(pairs, window=3):
    """Moving average of the last `window` valid readings."""
    out = []
    for i, (hour, _) in enumerate(pairs):
        recent = [v for _, v in pairs[max(0, i - window + 1):i + 1]]
        out.append((hour, sum(recent) / len(recent)))
    return out


def alerts(pairs, limit, run=2):
    """Hours at which the value has been above the limit for `run` valid readings in a row."""
    found, streak = [], 0
    for hour, value in pairs:
        streak = streak + 1 if value > limit else 0
        if streak == run:
            found.append(hour)
    return found


good, rejected = validate(READINGS)
print(len(READINGS), "readings,", len(good), "valid")
print("\n".join("rejected - " + r for r in rejected))
smoothed = smooth(good)
print("raw peak:", max(v for _, v in good), "| smoothed peak:", round(max(v for _, v in smoothed), 1))
print("alert hours (raw > 32 twice in a row):     ", alerts(good, 32))
print("alert hours (smoothed > 32 twice in a row):", alerts(smoothed, 32))
for hour, value in smoothed[9:17]:
    print(f"  hour {hour:>2}: smoothed {value:.1f}")
```

```output
24 readings, 21 valid
rejected - hour 3: no reading
rejected - hour 13: -999 is outside -10 to 50
rejected - hour 19: 85.0 is outside -10 to 50
raw peak: 35.6 | smoothed peak: 34.9
alert hours (raw > 32 twice in a row):      [12]
alert hours (smoothed > 32 twice in a row): [14]
  hour 10: smoothed 29.5
  hour 11: smoothed 31.6
  hour 12: smoothed 33.4
  hour 14: smoothed 34.6
  hour 15: smoothed 34.9
  hour 16: smoothed 33.9
  hour 17: smoothed 32.1
  hour 18: smoothed 30.2
```

1. A greenhouse sensor reports once an hour, and three of the 24 readings are bad: `validate` keeps the 21 sensible ones and says why it rejected the others: hour 3 sent nothing, hour 13 sent the error code -999, and hour 19 shows 85.0 degrees, which is impossible here. This is the same cleaning discipline as in Lesson 4, now running in a **gateway**.
2. `smooth` replaces every value by the average of the last three valid readings, so a single wrong value moves the result by only a third. The smoothed peak is 34.9 where the raw peak is 35.6: the spikes are flattened.
3. `alerts` fires when the value has been above 32 for two valid readings in a row. On the raw data the alert comes at **hour 12**; on the smoothed data it comes at **hour 14**. Smoothing removes false alarms caused by single spikes, but it also **delays real alarms**, because a moving average lags behind the data. The window size is an engineering decision.
4. The last lines show the smoothed values around the peak: they rise to 34.9 at hour 15 and fall away again, and hour 13 is missing because it was rejected. Doing this work in the gateway, at the **edge**, means that the cloud receives 21 clean values instead of 24 raw ones.

### Example 2: Lost messages, duplicates and idempotency

```python
def chance(state, percent):
    """A repeatable coin: returns (event happens?, next state)."""
    state = (state * 1103515245 + 12345) % 2 ** 31
    return (state >> 8) % 100 < percent, state


def run(strategy, seed=11, loss=30, readings=range(1, 21)):
    """A sensor sends the numbers 1..20 over a network that loses messages and acknowledgements."""
    state, total, applied, sent, seen = seed, 0, 0, 0, set()
    for sequence in readings:
        for attempt in range(8):
            sent += 1
            lost, state = chance(state, loss)
            if not lost:                                   # the message arrives
                if strategy != "dedupe" or sequence not in seen:
                    total += sequence
                    applied += 1
                seen.add(sequence)
                ack_lost, state = chance(state, loss)
                if not ack_lost:
                    break                                  # the sensor got the acknowledgement
            if strategy == "once":
                break                                      # no retry
    return sent, applied, total


print(f"{'strategy':<26}{'sent':>5}{'applied':>9}{'total':>7}   (correct total: {sum(range(1, 21))})")
for label, strategy in (("send once, no retry", "once"), ("retry, count everything", "retry"), ("retry + sequence numbers", "dedupe")):
    sent, applied, total = run(strategy)
    print(f"{label:<26}{sent:>5}{applied:>9}{total:>7}   {'correct' if total == 210 else 'wrong'}")
```

```output
strategy                   sent  applied  total   (correct total: 210)
send once, no retry          20       12    133   wrong
retry, count everything      42       25    283   wrong
retry + sequence numbers     42       20    210   correct
```

1. The simulation sends the readings 1 to 20 to a cloud server that adds up what it receives, so the correct total is 210. The network loses 30 per cent of the messages **and** 30 per cent of the acknowledgements, decided by a repeatable pseudo-random generator, so that every run gives the same story.
2. **Send once, no retry (at-most-once):** 20 messages are sent and only 12 arrive. The total is 133, **wrong**, because eight readings were lost for ever.
3. **Retry until acknowledged, add everything (at-least-once):** 42 messages are sent and 25 are applied. The total is 283, **wrong again**, but now too high: when only the acknowledgement was lost, the sensor sent the reading again and the server added it a second time. Five readings were counted twice.
4. **Retry with sequence numbers (effectively-once):** the same 42 messages are sent, but the server remembers the sequence numbers that it has applied and ignores a repeat. Exactly 20 are applied and the total is **210**. The cure for an unreliable network is not a better network but an **idempotent receiver**, which makes a repeated message harmless.

### Example 3: A feedback loop that overshoots

```python
def run(gain, delay, steps=14, start=100.0, target=20.0, top_speed=15.0):
    """A robot drives toward a wall; its distance sensor reports the value from `delay` steps ago."""
    distance, history, trace = start, [start], []
    for _ in range(steps):
        sensed = history[max(0, len(history) - 1 - delay)]
        speed = max(-top_speed, min(top_speed, gain * (sensed - target)))
        distance -= speed
        history.append(distance)
        trace.append(round(distance))
    return trace


for gain, delay in ((0.3, 0), (0.3, 2), (0.9, 2)):
    print(f"gain {gain}, sensor delay {delay}:", run(gain, delay))
```

```output
gain 0.3, sensor delay 0: [85, 70, 55, 44, 37, 32, 28, 26, 24, 23, 22, 21, 21, 21]
gain 0.3, sensor delay 2: [85, 70, 55, 40, 25, 14, 8, 7, 9, 12, 16, 19, 22, 23]
gain 0.9, sensor delay 2: [85, 70, 55, 40, 25, 10, -5, -10, 0, 14, 30, 44, 49, 41]
```

1. The robot measures its distance to a wall and should stop at 20 cm; it starts 100 cm away. At every step it reads the distance, computes the **error** (the sensed distance minus the target) and drives at a speed **proportional** to the error (the **gain** times the error), limited to 15 cm per step. This is **feedback control** in its simplest form, a proportional controller.
2. With a gain of 0.3 and a fresh sensor reading the distance falls 85, 70, 55, 44, 37, ... and **settles smoothly** close to the target of 20 as the error shrinks and the robot slows down.
3. With the same gain but a sensor that is **two steps late**, the robot acts on old information. It still reaches the target, but it **overshoots** to 7 cm and has to back away again, and at the end it is still wobbling around the target.
4. With a gain of 0.9 and the same delay, the reaction is too strong for the late information: the swings are **much larger**: the distance falls to -10 cm, which means that the robot would have hit the wall and gone on, and then climbs to 49 cm. More gain is not better when the feedback is late. Real controllers are tuned and have **safety limits** that do not depend on a single sensor.

## Common Mistakes and Misconceptions

- **Assuming that the network is reliable.** Messages are lost, delayed, duplicated and reordered; design every message handler for that.
- **Retrying without making the receiver idempotent.** The retry that fixes a lost message creates a duplicate when only the acknowledgement was lost.
- **Using the clock of each device to order events.** Clocks differ; use sequence numbers or a design that does not depend on a shared clock.
- **Putting secrets in an app or in firmware.** Anybody can unpack the app or read the device; keep keys on the server, and never ship default passwords.
- **Ignoring updates and security of devices.** An unpatched IoT device is a standing invitation to attackers.
- **Believing that "the cloud is someone else's computer, so security is their job".** Security is shared: your accounts, settings and data are your responsibility.
- **Forgetting the cost.** Elastic resources that nobody switches off, and data that is moved between regions, produce surprising bills.
- **Letting a robot trust one sensor,** or tuning a controller only in a perfect simulation. Real sensors are late, noisy and wrong sometimes.

## Guided Hands-On Activity

**Simulate, tune, map.** Work with your teacher and the code editors.

1. In Example 1 change the alert limit to 30 and the run to 3 readings in a row, and predict the alert hours before you run it.
2. In Example 1 change the smoothing window to 5. What happens to the smoothed peak and to the alert hour, and what does that tell you about the choice of the window?
3. In Example 2 change `loss` to 10 and then to 60. Which strategy is still correct each time, and how many messages are sent?
4. In Example 2 explain why the "retry, count everything" strategy applied 25 messages but sent 42.
5. In Example 3 try the gain 0.5 with a delay of 1. Does the robot overshoot? What would you do if it did?
6. Draw the architecture of a bus tracker for your school: the devices, the connection, the gateway, the cloud and the phone app. Name two security risks and one privacy risk.
7. Choose one field of this lesson and list three fundamentals from the earlier courses that it uses, with a sentence for each.

## Lesson Project: IoT Sensor Pipeline Simulation

### Objective

Build the **IoT Sensor Pipeline Simulation** for the course project: three greenhouse sensors, a gateway that validates and smooths the readings, a network that delivers every message at least once, in a shuffled order and sometimes twice, and a cloud that stores each reading exactly once and raises alerts. Finish with a **technology landscape map** that counts how often each fundamental is used.

### Requirements

- **The sensors.** The three lists of twelve hourly readings below (degrees Celsius), each with one bad reading (a missing value, an error code and an impossible value).
- **The gateway.** `gateway(name, readings)` rejects a reading that is `None` or outside -10 to 50 with a reason, and returns one **message** for each valid reading: a dictionary with the keys `sensor`, `seq` (the hour) and `value` (the average of the last three valid readings, rounded to one decimal).
- **The network.** `network(messages)` delivers every message at least once: each message is delivered twice with a probability of 35 per cent, and the deliveries arrive in a shuffled order. Use a repeatable pseudo-random generator, `x = (x * 1103515245 + 12345) mod 2^31`, as in the code of the lesson.
- **The cloud.** A class `Cloud` with `receive(message)` that is **idempotent** (a repeated `(sensor, seq)` is counted as a duplicate and changes nothing) and stores the readings by sensor and hour, and `alert_hours(sensor)` that returns the hours at which the stored value has been above 32 for two readings in a row, in the order of the hours.
- **The report.** The result of the gateway for each sensor, the number of messages sent and delivered, the number of duplicates ignored and readings stored, the peak and the alert of each sensor, and a check that there was no loss and no double counting.
- **The map.** The dictionary of technologies and fundamentals below, and a printed table of how many technologies use each fundamental, with the most used first (then alphabetically).

```text
Sensor A: 22.0, 22.4, None, 23.8, 25.9, 28.7, 31.5, 33.2, 34.0, 33.1, 30.2, 27.5
Sensor B: 20.5, 20.1, 19.8, 19.6, 21.0, 23.4, -999, 27.9, 29.4, 30.8, 29.6, 26.2
Sensor C: 24.0, 25.2, 27.9, 31.1, 33.7, 35.2, 36.4, 35.8, 34.1, 90.0, 31.0, 28.3

Cloud computing: Operating systems, Networks, Databases, Security, Algorithms
Mobile development: Programming, Networks, Databases, Security, Computer architecture
Robotics: Computer architecture, Algorithms, Programming, Discrete mathematics
Internet of Things: Computer architecture, Networks, Security, Programming
Distributed systems: Networks, Operating systems, Algorithms, Discrete mathematics, Databases
Artificial intelligence: Algorithms, Discrete mathematics, Programming, Databases
```

### Instructions

1. Write the sensor data and the map as Python dictionaries.
2. Write `gateway` with validation, the reasons for rejection and the moving average over the last three valid readings.
3. Write the random generator and `network`: for each message decide on one or two copies, give every delivery a random key, and sort the deliveries by that key.
4. Write the class `Cloud` with a set of the `(sensor, seq)` pairs that were already applied.
5. Print the gateway report, the network and cloud lines, and the peak and the alert of each sensor.
6. Count the technologies for each fundamental and print the table.
7. Compare your output with the expected output, and then change the duplicate probability to 80 per cent and check that the stored readings are still 33.

### Expected Output

```text
Gateway
  A: 12 readings, 11 valid (hour 2: no reading)
  B: 12 readings, 11 valid (hour 6: -999 is outside -10 to 50)
  C: 12 readings, 11 valid (hour 9: 90.0 is outside -10 to 50)

Network: 33 messages sent, 43 delivered, in a shuffled order
Cloud: 10 duplicates ignored, 33 readings stored
  A: peak 33.4 at hour 9; alert at hour 9
  B: peak 29.9 at hour 10; no alert
  C: peak 35.8 at hour 7; alert at hour 6
No loss and no double counting: yes

Technology landscape: how many technologies use each fundamental
  Algorithms            #### 4 of 6
  Databases             #### 4 of 6
  Networks              #### 4 of 6
  Programming           #### 4 of 6
  Computer architecture ### 3 of 6
  Discrete mathematics  ### 3 of 6
  Security              ### 3 of 6
  Operating systems     ## 2 of 6
```

### Hints

1. **Hint 1 (the average).** `good[max(0, i - 2):i + 1]` gives the current and the two previous valid readings.
2. **Hint 2 (the generator).** `state = (state * 1103515245 + 12345) % 2 ** 31`; use `(state >> 8) % 100 < 35` for a 35 per cent chance.
3. **Hint 3 (the shuffle).** Store `(random_key, message)` pairs and `sorted(..., key=lambda pair: pair[0])`.
4. **Hint 4 (idempotent).** `if key in self.seen: self.duplicates += 1; return` before you store anything.
5. **Hint 5 (the alert).** Walk through `sorted(self.store[sensor])` and count the readings above 32 in a row.
6. **Hint 6 (the map).** A dictionary `counts` with `counts[f] = counts.get(f, 0) + 1`, sorted by `(-count, name)`.

### Success Criteria

- [ ] The gateway report shows 11 valid readings for each sensor, with the three reasons for rejection.
- [ ] 33 messages are sent, 43 are delivered and 10 duplicates are ignored, and 33 readings are stored.
- [ ] The alert hours are 9 for sensor A, none for sensor B and 6 for sensor C.
- [ ] The check "No loss and no double counting" says yes, and still says yes when the duplicate probability is 80 per cent.
- [ ] The map shows Algorithms, Databases, Networks and Programming used by 4 of 6 technologies, and Operating systems by 2.

### Extension Challenge

Add **message loss** to the network, with an acknowledgement and a retry loop as in Example 2, and show that the cloud still stores each reading once. Then add a second cloud region that receives every message too, and write a check that both regions agree. Finally, write a short note, with the map as evidence, that explains which two fundamentals you would study first if you wanted to work on distributed systems, and why.

## Lesson Recap

- **Cloud computing** rents infrastructure (IaaS), platforms (PaaS) or applications (SaaS) with elasticity, pay-per-use and regions; security is a **shared responsibility**.
- **Mobile apps** are native, cross-platform or web apps under constraints of battery, connectivity and permissions, and talk to a backend API; never put secrets in the app.
- A **robot** runs a sense-think-act loop with **feedback**; **IoT** systems chain devices, a gateway, MQTT and the cloud, with **edge** processing; both need security and safety.
- A **distributed system** faces lost, delayed, duplicated and reordered messages and partial failure; **retries** need **idempotent** receivers with sequence numbers; **replication** brings the consistency and CAP trade-offs.
- Every field is built from the **fundamentals**: networks, operating systems, databases, algorithms, architecture, discrete mathematics and security.

## Homework / Extension Mission

Choose one real service that you use (a messaging app, a ride-sharing app, a smart meter) and draw its architecture on one page: the devices, the connections, the servers and the data stores. Mark where a message could be lost or duplicated, and say how the service probably prevents the harm. List which fundamentals from this programme each part uses, and write one paragraph on the security and privacy risks that the service creates and how you would reduce them.

## Course Project Connection

This lesson adds the **IoT Sensor Pipeline Simulation** and the technology landscape map to the **course project**, the small Python-based computational application or data exploration project. The pipeline uses the cleaning discipline of Lesson 4, the data structures of Lessons 2 and 3 and the tests that you will write in Lesson 8, and it shows how a computational project meets the real world: late, duplicated and wrong data. In Lesson 8 you finish the project with tests, a report and a plan for what to build next.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 15 minutes: a tour of the five fields with one real example of each and the question "which fundamental does it need?" on the board; 10 minutes: Example 2, with the three strategies predicted by the students before the totals are shown; 10 minutes: Examples 1 and 3, the trade-off of smoothing and the oscillating robot; 25 minutes: the project, ending with the map and its discussion.

**Live demonstrations.** Play the "lost acknowledgement" game: one student sends a note, a second passes it on and sometimes "loses" the confirmation, and the class sees the duplicate appear. Show the MQTT idea with a classroom topic board. Run Example 3 with several gains and plot the traces on the board. If a free MQTT test broker or a microcontroller kit is available, show a real sensor value arriving.

**Misconceptions.** "The network is basically reliable." "Retrying always fixes a failure." "The cloud is automatically secure." "Smoothing makes data more correct." "A robot that is programmed correctly cannot go wrong in the real world."

**Assessment of the project.** Run the simulation and compare the output. Check the gateway reasons, the counts (33 sent, 43 delivered, 10 duplicates), the alert hours and the map. Change the duplicate probability to 80 per cent and check that 33 readings are still stored. Ask: what would break if `receive` were not idempotent, and why does the order of arrival not matter to the cloud?

**Reference solution `pipeline.py`** (run with `python3 pipeline.py`):

```python
"""Course project, step 7: an IoT sensor pipeline simulation and a map of the technology landscape."""
SENSORS = {  # one reading per hour, in degrees Celsius
    "A": [22.0, 22.4, None, 23.8, 25.9, 28.7, 31.5, 33.2, 34.0, 33.1, 30.2, 27.5],
    "B": [20.5, 20.1, 19.8, 19.6, 21.0, 23.4, -999, 27.9, 29.4, 30.8, 29.6, 26.2],
    "C": [24.0, 25.2, 27.9, 31.1, 33.7, 35.2, 36.4, 35.8, 34.1, 90.0, 31.0, 28.3],
}
LIMIT, LOW, HIGH = 32, -10, 50


def lcg(state):
    return (state * 1103515245 + 12345) % 2 ** 31


def gateway(name, readings):
    """Validate and smooth one sensor; return the messages for the cloud and the reasons for rejections."""
    good, rejected = [], []
    for hour, value in enumerate(readings):
        if value is None:
            rejected.append(f"hour {hour}: no reading")
        elif not LOW <= value <= HIGH:
            rejected.append(f"hour {hour}: {value} is outside {LOW} to {HIGH}")
        else:
            good.append((hour, value))
    messages = []
    for i, (hour, _) in enumerate(good):
        recent = [v for _, v in good[max(0, i - 2):i + 1]]
        messages.append({"sensor": name, "seq": hour, "value": round(sum(recent) / len(recent), 1)})
    return messages, rejected


def network(messages, seed=5, duplicate_percent=35):
    """At-least-once delivery: every message arrives, some twice, in a shuffled order."""
    delivered, state = [], seed
    for message in messages:
        copies = 1
        state = lcg(state)
        if (state >> 8) % 100 < duplicate_percent:
            copies = 2
        for _ in range(copies):
            state = lcg(state)
            delivered.append((state, message))
    return [message for _, message in sorted(delivered, key=lambda pair: pair[0])]


class Cloud:
    def __init__(self):
        self.seen, self.store, self.duplicates = set(), {}, 0

    def receive(self, message):
        key = (message["sensor"], message["seq"])
        if key in self.seen:                      # idempotent: a second copy changes nothing
            self.duplicates += 1
            return
        self.seen.add(key)
        self.store.setdefault(message["sensor"], {})[message["seq"]] = message["value"]

    def alert_hours(self, sensor, run=2):
        found, streak = [], 0
        for hour in sorted(self.store[sensor]):
            streak = streak + 1 if self.store[sensor][hour] > LIMIT else 0
            if streak == run:
                found.append(hour)
        return found


LANDSCAPE = {
    "Cloud computing": ["Operating systems", "Networks", "Databases", "Security", "Algorithms"],
    "Mobile development": ["Programming", "Networks", "Databases", "Security", "Computer architecture"],
    "Robotics": ["Computer architecture", "Algorithms", "Programming", "Discrete mathematics"],
    "Internet of Things": ["Computer architecture", "Networks", "Security", "Programming"],
    "Distributed systems": ["Networks", "Operating systems", "Algorithms", "Discrete mathematics", "Databases"],
    "Artificial intelligence": ["Algorithms", "Discrete mathematics", "Programming", "Databases"],
}

if __name__ == "__main__":
    all_messages = []
    print("Gateway")
    for name, readings in SENSORS.items():
        messages, rejected = gateway(name, readings)
        all_messages += messages
        print(f"  {name}: {len(readings)} readings, {len(messages)} valid" + (f" ({'; '.join(rejected)})" if rejected else ""))
    arrivals = network(all_messages)
    cloud = Cloud()
    for message in arrivals:
        cloud.receive(message)
    stored = sum(len(v) for v in cloud.store.values())
    print(f"\nNetwork: {len(all_messages)} messages sent, {len(arrivals)} delivered, in a shuffled order")
    print(f"Cloud: {cloud.duplicates} duplicates ignored, {stored} readings stored")
    for name in SENSORS:
        series = cloud.store[name]
        peak_hour = max(series, key=series.get)
        hours = cloud.alert_hours(name)
        alert = "alert at hour " + ", ".join(map(str, hours)) if hours else "no alert"
        print(f"  {name}: peak {series[peak_hour]} at hour {peak_hour}; {alert}")
    print("No loss and no double counting:", "yes" if stored == len(all_messages) else "NO")

    print("\nTechnology landscape: how many technologies use each fundamental")
    counts = {}
    for fundamentals in LANDSCAPE.values():
        for fundamental in fundamentals:
            counts[fundamental] = counts.get(fundamental, 0) + 1
    for fundamental, count in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        print(f"  {fundamental:<22}{'#' * count} {count} of {len(LANDSCAPE)}")
```

```output
Gateway
  A: 12 readings, 11 valid (hour 2: no reading)
  B: 12 readings, 11 valid (hour 6: -999 is outside -10 to 50)
  C: 12 readings, 11 valid (hour 9: 90.0 is outside -10 to 50)

Network: 33 messages sent, 43 delivered, in a shuffled order
Cloud: 10 duplicates ignored, 33 readings stored
  A: peak 33.4 at hour 9; alert at hour 9
  B: peak 29.9 at hour 10; no alert
  C: peak 35.8 at hour 7; alert at hour 6
No loss and no double counting: yes

Technology landscape: how many technologies use each fundamental
  Algorithms            #### 4 of 6
  Databases             #### 4 of 6
  Networks              #### 4 of 6
  Programming           #### 4 of 6
  Computer architecture ### 3 of 6
  Discrete mathematics  ### 3 of 6
  Security              ### 3 of 6
  Operating systems     ## 2 of 6
```

**Differentiation.** Support: give `gateway` and `Cloud`, and let students write `network` and the report. Stretch: message loss with retries, a second cloud region with an agreement check, and the study-plan note based on the map.

**Discussion questions (not for the student quiz).** Why is an idempotent receiver a better answer to duplicates than an attempt to build a perfect network? What does an IoT device with a default password put at risk? Which of the five fields would you explore first, and which fundamental would you strengthen to do it?
