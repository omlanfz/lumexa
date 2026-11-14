# Lumexa Mission Log: Operating Systems, Networking & Cybersecurity

**Course/Path:** Operating Systems, Networking & Cybersecurity
**Lesson:** 06 of 08
**Title:** DNS, HTTP, HTTPS and Client-Server Communication
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** Browser developer tools · Python

---

## Mission Brief

You type `www.example.com` into a browser and press Enter. Within a fraction of a second a page appears. Behind that moment, your computer asked a chain of servers for the *address* of the name, opened a connection, agreed on secret keys with a computer it has never met, sent a short text request and received a long text answer. Every step uses a protocol that you can read, test and simulate.

In this lesson you follow one web request from the first keystroke to the last byte: the **URL**, the **DNS** lookup, the **TCP** connection, the **TLS** handshake of **HTTPS**, the **HTTP** request and response, and the **status codes** that tell you what happened. You write a small DNS resolver and a small web server in Python and then trace a full request with its timing for your **Computer Network Explorer** dossier.

## Learning Objectives

1. Describe the client-server model and take a URL apart.
2. Explain how DNS turns a name into an IP address: the hierarchy, caching and TTL.
3. Read and write HTTP requests and responses: methods, headers, bodies and status codes.
4. Explain what HTTPS adds to HTTP (TLS: encryption, integrity and server authentication with certificates), and what it does not hide.
5. Read a request in the Network tab of the browser developer tools: its parts and its timing.
6. Build a traced request that combines URL, DNS, TCP, TLS and HTTP with a timing breakdown.

## Prerequisites

- Lessons 4 and 5: layers, IP addresses, ports, TCP and UDP.
- Python: functions, dictionaries, strings and f-strings.

## Concept Explanation

### Clients, servers and URLs

The web is a client-server system. A **server** is a program that waits for requests on a port (usually 80 for HTTP and 443 for HTTPS); a **client**, such as your browser, opens a connection and asks for a **resource**. A resource is named by a **URL** (uniform resource locator) with these parts:

`https://www.example.com:443/search?q=network&page=2#results`

- the **scheme** (`https`): which protocol to use;
- the **host** (`www.example.com`): which computer;
- the **port** (`443`): which program on it (omitted when it is the default of the scheme);
- the **path** (`/search`): which resource on the server;
- the **query** (`q=network&page=2`): extra parameters as `name=value` pairs joined by `&`;
- the **fragment** (`#results`): a position inside the page, which the browser keeps to itself and never sends.

### DNS: the phone book of the internet

Computers route by IP address, but people remember names. The **Domain Name System (DNS)** translates a name such as `www.example.com` into an address. It is a **hierarchy**: the **root servers** know who runs each top-level domain (`.com`, `.org`, `.bd`); the **TLD servers** know the name server of each domain below them (`example.com`); and the domain's own **authoritative name server** holds the real records. Your computer does not walk the hierarchy itself. It asks a **resolver** (run by your provider or office) that does it, step by step, and **caches** the answer for the time given in the record, its **TTL** (time to live), so the next request for the same name is answered at once. Records have types: **A** (name to IPv4 address), **AAAA** (IPv6 address), **CNAME** (an alias for another name), **MX** (the mail server of a domain), **NS** (its name servers) and **TXT** (free text, used for example to prove ownership). The commands `nslookup` and `dig` show DNS answers.

### HTTP: requests and responses

**HTTP** (hypertext transfer protocol) is a plain-text request-response protocol that runs over a TCP connection. A **request** has a **request line** (the **method**, the path and the version, such as `GET /about HTTP/1.1`), **headers** (`Host: www.example.com`, `Accept: text/html`), an empty line and an optional **body**. The main methods are **GET** (read a resource), **POST** (send data, for example a form), **PUT** (replace a resource) and **DELETE** (remove it). A **response** has a **status line** (`HTTP/1.1 200 OK`), headers (`Content-Type: text/html`, `Content-Length: 17`, `Set-Cookie: ...`), an empty line and the body, such as an HTML page or JSON data.

The **status code** tells the client what happened, and its first digit gives the class: **1xx** information; **2xx** success (`200 OK`); **3xx** redirection (`301 Moved Permanently` with a `Location` header); **4xx** a client error (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`); **5xx** a server error (`500 Internal Server Error`, `503 Service Unavailable`). HTTP is **stateless**: the server treats each request on its own. To remember a user between requests, the server gives the browser a **cookie** (a small piece of data in `Set-Cookie`) that the browser sends back with each later request. Today many applications use HTTP for **APIs** that exchange **JSON** instead of pages.

### HTTPS and TLS

Plain HTTP can be read and changed by anybody on the path. **HTTPS** is HTTP inside **TLS** (transport layer security), and gives three things: **confidentiality** (the content is encrypted), **integrity** (changes are detected) and **authentication** (the server proves that it is really `www.example.com`). The proof is a **certificate**: the server's public key and name, signed by a **certificate authority (CA)** that the browser trusts. After the TCP handshake, the TLS **handshake** works in three steps: the client sends a **ClientHello** with the ciphers it supports and a key share; the server answers with a **ServerHello**, its certificate and its key share; both sides then compute the same **session key** and every later byte, the HTTP request and the response, is encrypted with it (Lesson 7 explains how). The padlock in the browser means that the connection is encrypted and the certificate matches the name. It does *not* mean that the site is honest, and it does not hide *which* server you connect to or how much data you transfer.

### Developer tools and the cost of a request

Every browser has **developer tools** (press F12): the **Network** tab lists every request of a page with its method, status, size and a **timing** breakdown: the DNS lookup, the TCP connection, the TLS handshake, the *waiting* time until the first byte of the answer arrives and the download. Reading this breakdown shows why web pages are slow: each new connection costs round trips (TCP and TLS), and one round trip across the world takes about a tenth of a second. Browsers therefore **reuse connections** and caches, and newer versions of HTTP (HTTP/2 and HTTP/3) send many requests at once over one connection.

## Key Vocabulary

| Term | Definition |
|---|---|
| **URL** | The address of a resource: scheme, host, port, path, query and fragment. |
| **DNS / resolver** | The system that turns names into IP addresses / the server that does the lookup for you. |
| **TTL** | How long a DNS answer may be cached. |
| **A record / CNAME** | A DNS record that gives an IPv4 address / one that makes a name an alias of another. |
| **HTTP method** | The action of a request: GET, POST, PUT, DELETE. |
| **Header** | A `Name: value` line that carries information about a request or response. |
| **Status code** | A three-digit number that tells whether the request worked: 2xx, 3xx, 4xx or 5xx. |
| **Cookie** | A small piece of data that the server stores in the browser to recognise it later. |
| **TLS / HTTPS** | The protocol that encrypts and authenticates a connection / HTTP carried over TLS. |
| **Certificate / CA** | A signed statement that a public key belongs to a name / the organisation that signs it. |
| **API / JSON** | A way for programs to ask other programs for data / a text format for such data. |

## Worked Examples

### Example 1: Taking a URL apart

```python
from urllib.parse import parse_qs, urlparse

URLS = [
    "https://www.example.com/index.html",
    "http://localhost:8080/search?q=network&page=2#results",
    "https://shop.example.co.uk:8443/cart/items?id=7&id=9&lang=en",
]
for url in URLS:
    parts = urlparse(url)
    port = parts.port or {"http": 80, "https": 443}[parts.scheme]     # the default port of the scheme
    print(url)
    print(f"  scheme {parts.scheme} | host {parts.hostname} | port {port} | path {parts.path}")
    print(f"  query {parse_qs(parts.query)} | fragment {parts.fragment or '-'}")
```

```output
https://www.example.com/index.html
  scheme https | host www.example.com | port 443 | path /index.html
  query {} | fragment -
http://localhost:8080/search?q=network&page=2#results
  scheme http | host localhost | port 8080 | path /search
  query {'q': ['network'], 'page': ['2']} | fragment results
https://shop.example.co.uk:8443/cart/items?id=7&id=9&lang=en
  scheme https | host shop.example.co.uk | port 8443 | path /cart/items
  query {'id': ['7', '9'], 'lang': ['en']} | fragment -
```

1. `urlparse` splits a URL into its parts. The first URL has no port, so the default of `https` (443) is used; the second names port 8080 explicitly.
2. `parse_qs` turns the query string into a dictionary of lists, because the same name may appear more than once: `id=7&id=9` gives `['7', '9']`.
3. The fragment `results` is only for the browser (it scrolls to that place); it is never sent to the server.
4. The host `shop.example.co.uk` is what DNS has to resolve before anything else can happen.

### Example 2: A DNS resolver with a cache

```python
ROOT = {"com": "tld-com"}                                  # the root servers know who runs each top-level domain
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
        print(f"           {step}")
```

```output
t=  0 s  www.example.com   -> 93.184.216.34
           root server: .com is run by tld-com
           tld-com: example.com is run by ns.example.com
           ns.example.com: www.example.com is 93.184.216.34 (cache it for 300 s)
t= 10 s  www.example.com   -> 93.184.216.34
           answered from the cache
t= 10 s  mail.example.com  -> 93.184.216.40
           root server: .com is run by tld-com
           tld-com: example.com is run by ns.example.com
           ns.example.com: mail.example.com is 93.184.216.40 (cache it for 600 s)
t=400 s  www.example.com   -> 93.184.216.34
           root server: .com is run by tld-com
           tld-com: example.com is run by ns.example.com
           ns.example.com: www.example.com is 93.184.216.34 (cache it for 300 s)
t=401 s  www.example.com   -> 93.184.216.34
           answered from the cache
```

1. The first lookup of `www.example.com` walks the whole hierarchy: the root server points to the `.com` servers, they point to the name server of `example.com`, and that server finally knows the address and the TTL (300 s).
2. Ten seconds later the answer is in the **cache** and no server is asked, which is why most lookups take only a millisecond or two.
3. The name `mail.example.com` is a different name, so it is looked up in full (but note that a real resolver would also cache the `.com` and `example.com` steps).
4. At t = 400 s the entry for `www.example.com` has expired (300 s after t = 0), so it is looked up again; one second later it is cached again. A short TTL lets a site change its address quickly, a long TTL saves lookups.

### Example 3: A tiny web server

```python
PAGES = {"/": "<h1>Home</h1>", "/about": "<h1>About us</h1>"}
REDIRECTS = {"/old-about": "/about"}
USERS = {"ana": "s3cret"}


def handle(raw_request):
    """A tiny web server: parse a raw HTTP request and build a raw HTTP response."""
    head, _, body = raw_request.partition("\r\n\r\n")
    request_line, *header_lines = head.split("\r\n")
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
    return "\r\n".join(lines) + "\r\n\r\n" + text


def get(path):
    return f"GET {path} HTTP/1.1\r\nHost: www.example.com\r\nAccept: text/html"


request = get("/about")
print("--- request ---")
print(request.replace("\r\n", "\n"))
print("--- response ---")
print(handle(request).replace("\r\n", "\n"))

print("\n--- more requests ---")
login = "POST /login HTTP/1.1\r\nHost: www.example.com\r\nContent-Type: application/x-www-form-urlencoded\r\n\r\n"
for raw in (get("/"), get("/old-about"), get("/missing"), login + "user=ana&password=s3cret", login + "user=ana&password=wrong"):
    head, _, body = raw.partition("\r\n\r\n")
    label = head.split("\r\n")[0] + (f"  [{body}]" if body else "")
    print(f"{label:<60} -> {handle(raw).split(chr(13) + chr(10))[0]}")
```

```output
--- request ---
GET /about HTTP/1.1
Host: www.example.com
Accept: text/html
--- response ---
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 17

<h1>About us</h1>

--- more requests ---
GET / HTTP/1.1                                               -> HTTP/1.1 200 OK
GET /old-about HTTP/1.1                                      -> HTTP/1.1 301 Moved Permanently
GET /missing HTTP/1.1                                        -> HTTP/1.1 404 Not Found
POST /login HTTP/1.1  [user=ana&password=s3cret]             -> HTTP/1.1 200 OK
POST /login HTTP/1.1  [user=ana&password=wrong]              -> HTTP/1.1 401 Unauthorized
```

1. A raw HTTP request is just text: a request line, headers, an empty line (`\r\n\r\n`) and an optional body. `handle` splits it at the empty line, then splits the head into the request line and the headers.
2. The server picks the response from the method and the path: a page gives `200 OK`, an old address gives `301 Moved Permanently` with a `Location` header, an unknown path gives `404 Not Found`.
3. The `POST` to `/login` carries the form data in the **body**; the server compares the password and answers `200 OK` or `401 Unauthorized`.
4. The response always has `Content-Length`, so the client knows where the body ends. A real server does the same, only with many more headers, cookies and, over HTTPS, encryption.

## Common Mistakes and Misconceptions

- **Thinking the internet and the web are the same.** The web is HTTP and HTML on top of the internet; DNS, email and video calls are other applications.
- **Believing that DNS gives a page.** DNS only turns a name into an IP address; the HTTP request that follows fetches the page.
- **Forgetting that DNS answers are cached.** A changed address can take as long as the TTL to reach everybody.
- **Reading the status code by its text.** The class (the first digit) matters: 4xx means the request was wrong, 5xx means the server failed.
- **Sending secrets in a URL.** The query string is stored in logs, history and links; send secrets in a POST body over HTTPS.
- **Believing that the padlock means the site is safe.** It means that the connection is encrypted and that the certificate matches the name, not that the owner is trustworthy.
- **Thinking that HTTPS hides everything.** The IP address, the server name and the amount of data can still be seen by the network.
- **Treating HTTP as stateful.** The server has no memory of earlier requests unless a cookie or a token reminds it.

## Guided Hands-On Activity

**Look inside a request.** Work with your teacher.

1. In Example 1 add the URL `https://www.example.com:8443/a/b/c?x=1&y=2#top` and predict every part before you run it.
2. In Example 2 add a lookup of `www.example.com` at t = 299 and at t = 301 (after the first one at t = 0). Which one is answered from the cache, and why?
3. In Example 3 add a request for `/about` with the method `DELETE`. What does the server answer, and what would be a better status code than 404 (hint: look for `405`)?
4. In Example 3 add a new page `/contact` and a redirect from `/old-contact`. Test both.
5. Open the developer tools of your browser (F12), click the Network tab, load any web page and click the first request. Find the method, the status code, the request headers and the response headers. Which timing step is the longest?
6. On a computer with a terminal, run `nslookup www.example.com` (or `dig`) and find the address in the answer.

## Lesson Project: Follow the Request

### Objective

Write a **request tracer** in Python that follows one HTTPS request for `https://www.shop.example.com/products?id=7&lang=en` through the network of your dossier, step by step: URL, DNS lookup, TCP handshake, TLS handshake, HTTP request, server work and download, and prints a timing breakdown with a text waterfall. This adds the web-request page to your **Computer Network Explorer** dossier.

### Requirements

- Use these numbers: the resolver is 2 ms from the laptop; a cold DNS lookup also asks the root server (20 ms), the `.com` servers (25 ms) and the shop's name server (30 ms); the round trip to the web server is 40 ms; the TLS handshake takes one round trip plus 5 ms of computing; the server needs 35 ms to build the page; the page is 120,000 bytes and the bandwidth is 10 Mbit/s.
- Take the URL apart with `urlparse` and `parse_qs` and print the scheme, host, port, path and query.
- Print the seven steps of the trace (URL, DNS, TCP, TLS, request, wait, response) with their times.
- Print a table with the five timed steps (DNS lookup, TCP handshake, TLS handshake, request and wait, download), each with its time, its share of the total and a waterfall bar of one `#` for every 5 ms.
- Print the total, the slowest step and the time of a second request on the open connection with the DNS answer cached, and how much faster it is.
- In the dossier, write one paragraph: which step would you try to reduce first, and how (cache, CDN, connection reuse, smaller page)?

### Instructions

1. Store the numbers in named constants at the top of the program.
2. Parse the URL and print step 1.
3. Compute the DNS time and the other step times and print the trace.
4. Put the five timed steps in a list of (name, milliseconds).
5. Print the table with the shares and the `#` bars.
6. Find the slowest step with `max` and compute the repeat-request time.
7. Compare with the expected output and write the paragraph.

### Expected Output

```text
Follow the request: https://www.shop.example.com/products?id=7&lang=en

1. URL      scheme https, host www.shop.example.com, port 443, path /products, query {'id': ['7'], 'lang': ['en']}
2. DNS      cache miss: ask the resolver, then root server, then the .com servers, then the shop's name server
            answer 203.0.113.50 after 77 ms (a cached answer would take 2 ms)
3. TCP      SYN, SYN-ACK, ACK: one round trip, 40 ms
4. TLS      ClientHello, ServerHello with the certificate, Finished: 45 ms; from now on everything is encrypted
5. Request  GET /products?id=7&lang=en HTTP/1.1 with Host: www.shop.example.com
6. Wait     the request travels, the server works 35 ms, the first byte returns: 75 ms
7. Response 200 OK, 120,000 bytes at 10 Mbit/s: 96 ms to download

step               ms   share  waterfall
DNS lookup          77    23%  ###############
TCP handshake       40    12%  ########
TLS handshake       45    14%  #########
Request and wait    75    23%  ###############
Download            96    29%  ###################
total              333

slowest step: Download
a second request on the open connection, with DNS cached: 171 ms (49% faster)
```

### Hints

1. **Hint 1 (the port).** `parts.port or {"http": 80, "https": 443}[parts.scheme]` uses the default when the URL has no port.
2. **Hint 2 (DNS).** The cold lookup is the resolver time plus the sum of the three server times: 2 + 20 + 25 + 30 = 77 ms.
3. **Hint 3 (the download).** `120_000 * 8` bits divided by `10 * 1000` bits per millisecond is 96 ms.
4. **Hint 4 (the waiting).** One round trip (40 ms) plus the server time (35 ms) is 75 ms.
5. **Hint 5 (the table).** `f"{name:<17} {ms:>4.0f}  {ms / total:>5.0%}  {'#' * round(ms / 5)}"`.
6. **Hint 6 (the repeat).** With the DNS answer cached and the TCP and TLS connection already open, only the wait and the download are needed again.

### Success Criteria

- [ ] The URL step shows the scheme `https`, the port 443 and the query as a dictionary.
- [ ] The five step times are 77, 40, 45, 75 and 96 ms and the total is 333 ms.
- [ ] The table shows the shares and a waterfall, and the download is named as the slowest step.
- [ ] The repeat request takes 171 ms, which is 49% faster.
- [ ] The program has named constants and no repeated numbers.
- [ ] The dossier contains a paragraph that names a step to reduce and a method.

### Extension Challenge

Add **HTTP/2-style reuse** to the model: a page with three more resources (an image of 300,000 bytes, a script of 80,000 bytes and a style sheet of 20,000 bytes) is loaded first with a new connection for each resource and then over a single connection, and the times are compared. Next, add a **CDN**: a server near the user with a 10 ms round trip, and show how the total changes. Finally, extend `handle` of Example 3 so that it returns `405 Method Not Allowed` for a wrong method on an existing page.

## Lesson Recap

- A **URL** names a resource by scheme, host, port, path, query and fragment; **DNS** turns the host name into an IP address through a hierarchy of servers and caches answers for their **TTL**.
- **HTTP** is a text request-response protocol: method, path and headers go out; a status code, headers and a body come back. 2xx is success, 3xx redirection, 4xx a client error, 5xx a server error. It is stateless; cookies carry state.
- **HTTPS** is HTTP inside **TLS**: encryption, integrity and authentication through certificates; the padlock does not mean the site is trustworthy.
- The Network tab of the developer tools shows where the time of a request goes: DNS, TCP, TLS, waiting and download.

## Homework / Extension Mission

Open the developer tools on a website of your choice and record, for the first request of the page, the status, the method, the protocol (HTTP/1.1, h2 or h3), the size and the five timings. Write a short report that says which step was slowest and why. Then look at the certificate of the site (click the padlock) and note who issued it and until when it is valid. Finally, write the raw HTTP request that your browser sends when you open `https://www.example.com/about`, using the format of Example 3.

## Course Project Connection

This lesson adds the **web-request trace** to the **Computer Network Explorer**, the course project: the laptop of the office map asks the resolver for the address of the shop, crosses the router to the internet, builds an encrypted connection and fetches a page, and the dossier records each step and its cost. In Lesson 7 you learn how the encryption, the hashing and the passwords of such a service work, and in Lesson 8 you analyse the threats against it and write the firewall rules that protect it.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the phone-book analogy for DNS and the URL anatomy; 10 minutes: HTTP by hand (write a request on the board, students write the response); 10 minutes: HTTPS and the certificate idea (show the padlock details of a school site); 10 minutes: the Network tab, live; 20 minutes: the project.

**Live demonstrations.** Open the Network tab and load a simple page, then click through the Headers and Timing tabs. Run `nslookup` or `dig` for a name and relate the answer to the hierarchy. Show a `404` page and a `301` redirect with the browser's address bar.

**Misconceptions.** "DNS fetches the page." "The padlock means the site is honest." "HTTP remembers who I am." "A 404 means the server is down."

**Assessment of the project.** Check the five step times, the total, the shares and the slowest step, the repeat-request time and the dossier paragraph. Ask students why the repeat request is faster and which parts of it can never be removed.

**Reference solution `follow_the_request.py`** (run with `python3 follow_the_request.py`):

```python
"""Follow the Request: a simulated trace of one HTTPS request, step by step, with its timing."""
from urllib.parse import parse_qs, urlparse

URL = "https://www.shop.example.com/products?id=7&lang=en"
RESOLVER_RTT_MS = 2                                        # the laptop to the resolver in the office
DNS_MS = {"root server": 20, "the .com servers": 25, "the shop's name server": 30}
RTT_MS = 40                                                # the laptop to the web server
SERVER_MS = 35                                             # time the server needs to build the page
PAGE_BYTES = 120_000
BANDWIDTH_MBPS = 10

parts = urlparse(URL)
port = parts.port or {"http": 80, "https": 443}[parts.scheme]
print(f"Follow the request: {URL}\n")
print(f"1. URL      scheme {parts.scheme}, host {parts.hostname}, port {port}, path {parts.path}, query {parse_qs(parts.query)}")

dns_ms = RESOLVER_RTT_MS + sum(DNS_MS.values())
print(f"2. DNS      cache miss: ask the resolver, then {', then '.join(DNS_MS)}")
print(f"            answer 203.0.113.50 after {dns_ms} ms (a cached answer would take {RESOLVER_RTT_MS} ms)")
print(f"3. TCP      SYN, SYN-ACK, ACK: one round trip, {RTT_MS} ms")
tls_ms = RTT_MS + 5
print(f"4. TLS      ClientHello, ServerHello with the certificate, Finished: {tls_ms} ms; from now on everything is encrypted")
print(f"5. Request  GET {parts.path}?{parts.query} HTTP/1.1 with Host: {parts.hostname}")
wait_ms = RTT_MS + SERVER_MS
print(f"6. Wait     the request travels, the server works {SERVER_MS} ms, the first byte returns: {wait_ms} ms")
download_ms = PAGE_BYTES * 8 / (BANDWIDTH_MBPS * 1000)
print(f"7. Response 200 OK, {PAGE_BYTES:,} bytes at {BANDWIDTH_MBPS} Mbit/s: {download_ms:.0f} ms to download\n")

STEPS = [("DNS lookup", dns_ms), ("TCP handshake", RTT_MS), ("TLS handshake", tls_ms), ("Request and wait", wait_ms), ("Download", download_ms)]
total = sum(ms for _, ms in STEPS)
print("step               ms   share  waterfall")
for name, ms in STEPS:
    print(f"{name:<17} {ms:>4.0f}  {ms / total:>5.0%}  {'#' * round(ms / 5)}")
print(f"{'total':<17} {total:>4.0f}")
slowest = max(STEPS, key=lambda step: step[1])
print(f"\nslowest step: {slowest[0]}")
reuse = wait_ms + download_ms
print(f"a second request on the open connection, with DNS cached: {reuse:.0f} ms ({1 - reuse / total:.0%} faster)")
```

```output
Follow the request: https://www.shop.example.com/products?id=7&lang=en

1. URL      scheme https, host www.shop.example.com, port 443, path /products, query {'id': ['7'], 'lang': ['en']}
2. DNS      cache miss: ask the resolver, then root server, then the .com servers, then the shop's name server
            answer 203.0.113.50 after 77 ms (a cached answer would take 2 ms)
3. TCP      SYN, SYN-ACK, ACK: one round trip, 40 ms
4. TLS      ClientHello, ServerHello with the certificate, Finished: 45 ms; from now on everything is encrypted
5. Request  GET /products?id=7&lang=en HTTP/1.1 with Host: www.shop.example.com
6. Wait     the request travels, the server works 35 ms, the first byte returns: 75 ms
7. Response 200 OK, 120,000 bytes at 10 Mbit/s: 96 ms to download

step               ms   share  waterfall
DNS lookup          77    23%  ###############
TCP handshake       40    12%  ########
TLS handshake       45    14%  #########
Request and wait    75    23%  ###############
Download            96    29%  ###################
total              333

slowest step: Download
a second request on the open connection, with DNS cached: 171 ms (49% faster)
```

**Differentiation.** Support: provide the constants and the step list, so that students only write the printing and the table. Stretch: the multi-resource page with and without connection reuse, the CDN and the `405` response.

**Discussion questions (not for the student quiz).** Why is a round trip across the world so much more expensive than the time to send a few bytes? What would break if the browser did not check the certificate against a list of trusted authorities? Why do servers not simply remember each user, instead of using cookies?
