# Lumexa Mission Log: Python Tools & Data Foundations

**Course/Path:** Python Tools & Data Foundations
**Lesson:** 07 of 08
**Title:** Working with APIs & JSON Data
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3, requests, JSON

---

## Mission Brief

Right now, hundreds of kilometres above your head, the International Space Station is travelling at about 27,000 kilometres per hour. Its position is calculated every second, and anybody in the world can ask a computer for it. How? Through an **API**: a way for one program to ask another program for information. Weather apps, map apps, games and social media all use APIs behind the scenes. Today you will learn how programs talk to each other over the internet, how to send a request from Python with the `requests` library, how to read the answer, which arrives as JSON, and how to pull out just the facts you need. You will then build a **Live Data Explorer** that works with real, live data.

## Learning Objectives

1. Explain what an API is and why applications use them.
2. Describe how an HTTP request and response work.
3. Make a GET request with the `requests` library.
4. Read response status codes.
5. Work with JSON responses and extract the information you need.
6. Keep API keys and other credentials private.

## Prerequisites

- Lesson 2: you can install a library with `pip` and use it (or you are using Google Colab, where `requests` is already installed).
- From Course 2: you can handle errors and work with JSON.

## Concept Explanation

### What are APIs?

An **API** (Application Programming Interface) is a doorway that a program offers so other programs can use its data or services. Think of a restaurant: you (the *client*) do not walk into the kitchen. You give your order to a waiter, and the waiter brings back the meal. The API is the waiter. You ask for exactly what you want, in a format the kitchen (the *server*) understands, and you get an answer back.

APIs are useful because the owner of the data keeps control, the data is always fresh, and you never need to know how the other system works inside.

### How applications communicate: HTTP requests and responses

The web works through a simple conversation called **HTTP**:

1. The **client** (your program) sends a **request** to a web address, or **URL**.
2. The **server** sends back a **response**.

A request has a **method** that says what you want. The most common is **GET**, which means "please give me this information". (Other methods, such as POST, are for sending data, and you will meet them later.) A URL tells the server what you are asking for, and it can carry extra details after a question mark, called **parameters**:

```text
https://api.example.com/v1/weather?city=Dhaka&units=metric
 \___/  \_____________/ \_______/  \________________________/
 scheme      host         path         parameters
```

### Making a GET request with `requests`

The `requests` library makes this a one-line job. Always set a **timeout** so that your program does not wait forever if the server is slow:

```python
import requests

response = requests.get("https://api.wheretheiss.at/v1/satellites/25544", timeout=10)
print(response.status_code)
data = response.json()          # turn the JSON text into a Python dictionary
print(data["latitude"])
```

You can also let `requests` build the parameters for you:

```python
response = requests.get("https://api.example.com/v1/weather", params={"city": "Dhaka", "units": "metric"}, timeout=10)
```

### Understanding response status codes

Every response begins with a **status code**, a three-digit number that tells you what happened. The first digit tells you the story:

| Code | Meaning | What to do |
|---|---|---|
| **200** | OK: here is your data | Use it |
| **400** | Bad request: the request did not make sense | Check your URL and parameters |
| **401 / 403** | Not allowed: a key is missing or wrong | Check your API key |
| **404** | Not found | Check the address |
| **429** | Too many requests | Wait, and slow down |
| **500** and above | The server had a problem | Try again later |

Always check the status code before you use the data. `response.ok` is `True` for codes below 400.

### Working with JSON responses

Most APIs reply with **JSON**, the same format you used to store data in Course 2. After `response.json()` you have ordinary Python dictionaries and lists, which you already know how to use:

```python
data = {"name": "iss", "latitude": 47.46, "tags": ["station", "orbit"]}
print(data["name"])
print(data["tags"][0])
```

Real responses can be **nested**: a dictionary that contains lists of dictionaries. Print the whole response first, read it layer by layer, and then pick out the part you need.

### Extracting and processing information from API data

Once the response is in a dictionary, treat it like any other data: pick fields with keys, format them in f-strings, loop over lists, store results in a list and, if you like, turn a list of dictionaries into a **Pandas DataFrame** with `pd.DataFrame(list_of_dicts)`. Use `.get("key", default)` for fields that might be missing.

### Using external data sources

Many organisations publish free, open data through APIs: space agencies, weather services, public libraries and governments. Before you use one, read the page that explains how it works. Look for: whether you need a **key**, how many requests per minute are allowed (the **rate limit**), and what the terms of use say. Be a polite visitor: do not send hundreds of requests in a loop, and use `time.sleep()` to pause between calls.

### Awareness of API keys and keeping credentials private

Some APIs ask you to sign up for an **API key**, a secret password for your program. Treat it like a toothbrush: never share it. Rules to remember:

- **Never type a key into your code** if the code will be shared or put on GitHub. Anyone who sees it can use your account.
- Keep keys in an **environment variable** or a separate file (such as `.env`) that is listed in `.gitignore`.
- In Google Colab, use the **Secrets** panel instead of pasting a key into a cell.
- If a key is ever shown by accident, delete it on the service's website and make a new one.
- Never send personal information, such as your name, address or school, to an API.

## Key Vocabulary

| Term | Definition |
|---|---|
| **API** | A way for one program to ask another program for data or services. |
| **Client** | The program that sends a request. |
| **Server** | The computer that receives requests and sends back responses. |
| **HTTP** | The set of rules that web clients and servers use to communicate. |
| **Request / response** | The message a client sends and the message the server sends back. |
| **GET** | The request method that asks for information. |
| **Status code** | A number in the response that says whether the request worked. |
| **JSON** | A text format for structured data, easy for programs to read. |
| **Rate limit** | The number of requests an API allows in a period of time. |
| **API key** | A secret code that identifies you to an API. |

## Code Example: ISS Position Reader

```python
# iss_reader.py
# Reading an API response: status codes, JSON and extracting fields

import json
import requests

ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544"
USE_LIVE_API = False       # change to True to call the real API

# A saved copy of a real response, so this program also works without a network
SAMPLE_RESPONSE = """
{"name": "iss", "id": 25544, "latitude": 47.46, "longitude": -137.59,
 "altitude": 423.67, "velocity": 27587.33, "visibility": "eclipsed",
 "timestamp": 1794558703, "units": "kilometers"}
"""

def fetch_json(url):
    """Ask an API for JSON. Return a dictionary, or None if anything goes wrong."""
    try:
        response = requests.get(url, timeout=10)
    except requests.exceptions.RequestException as error:
        print("Could not reach the API:", error)
        return None
    print("Status code:", response.status_code)
    if response.status_code != 200:
        print("The API did not give us any data.")
        return None
    return response.json()

if USE_LIVE_API:
    data = fetch_json(ISS_URL)
else:
    data = json.loads(SAMPLE_RESPONSE)
    print("Using the saved sample response (no network needed).")

if data is not None:
    print(f"Satellite: {data['name'].upper()} (id {data['id']})")
    print(f"Position: latitude {data['latitude']:.2f}, longitude {data['longitude']:.2f}")
    print(f"Altitude: {data['altitude']:.1f} {data['units']}")
    print(f"Speed: {data['velocity']:,.0f} km/h")
    print("Visibility:", data["visibility"])
    print("Fields in the response:", len(data))
```

Expected output:

```text
Using the saved sample response (no network needed).
Satellite: ISS (id 25544)
Position: latitude 47.46, longitude -137.59
Altitude: 423.7 kilometers
Speed: 27,587 km/h
Visibility: eclipsed
Fields in the response: 9
```

With `USE_LIVE_API = True` the numbers will be different each time you run it, because the station keeps moving, and you will also see `Status code: 200` printed first. The program prints a friendly message instead of crashing when the network is down, because the request is wrapped in `try` and `except`.

## Instructor-Guided Coding Walkthrough

1. Use the restaurant analogy to introduce clients, servers and APIs. Ask students which apps on their phones must be using APIs.
2. Open the ISS URL in a web browser and show the raw JSON. Ask students to find the latitude, then show the same thing from Python with `requests.get()` and `.json()`.
3. Print `response.status_code`. Change one letter of the URL and look at the `404`. Match each code on the board with its meaning.
4. Switch off the network (or use a nonsense host name) and show the exception from `requests`. Wrap the call in `try` and `except` as in the example.
5. Print the whole response dictionary, then read the structure out loud as a class. Extract three fields and format them.
6. Show a `.gitignore` containing `.env` and explain why an API key never belongs in code that is shared.

Discussion questions:

- Why is it important to check the status code before using the data?
- What could go wrong if hundreds of students all send requests in a loop?
- What would you do if you saw a classmate's API key in a notebook they were sharing?

## Student Mission / Guided Challenge

**Explorer Challenge: Live Data Explorer**

Build a notebook or script that retrieves information from a public API and displays selected results. This is Part 2 of your third portfolio project of Course 3 (you started it in Lesson 6), and a ready-to-run Google Colab version of the whole project is linked in the Project section below this lesson.

1. Write a Markdown introduction that says what the API is, who provides it and that it needs **no key**. Use `https://api.wheretheiss.at/v1/satellites/25544` (the ISS), or another free, key-free API that your teacher approves.
2. Write `fetch_json(url)` that uses a timeout, handles network errors with `try` and `except`, checks the status code and returns a dictionary or `None`.
3. Print the whole response once, then write a function `show_report(data)` that prints a tidy report of at least five selected fields, with units and formatting.
4. Fetch the data **three times**, two seconds apart (use `time.sleep(2)`), store each reading in a list of dictionaries, and print how much the latitude and longitude changed.
5. Turn the list of readings into a Pandas DataFrame and display it.
6. Add one extra feature: a map link built from the position (`https://www.google.com/maps?q=LATITUDE,LONGITUDE`), a unit conversion or a short message about whether the station is over the sea or the land (your best guess).
7. Include at least one example of an error being handled: a wrong URL, and a message for each status code you meet.
8. Document in Markdown what you learned, and note the rate limit and terms of use of the API.

**Bonus objective:** Save the readings to a JSON file with `json.dump()` and load them again in a second notebook cell.

## Common Mistakes

- Forgetting a `timeout`, so the program can wait forever.
- Using the data without checking the status code.
- Treating a JSON response as a string instead of calling `.json()`.
- Misspelling a key (`"Latitude"` instead of `"latitude"`), which causes a `KeyError`.
- Sending requests in a fast loop without pausing, and getting blocked by the rate limit.
- Pasting an API key into code or a notebook that will be shared.

## Lesson Recap

An API lets your program ask another program for data. You learned that a client sends an HTTP request and a server sends a response, made a GET request with `requests`, checked the status code and turned the JSON reply into a Python dictionary. You extracted and formatted the facts you needed, handled network errors with `try` and `except`, and learned the rules for keeping API keys private. With APIs, your programs can work with live information from anywhere in the world.

## Homework / Extension Mission

**Solo Mission: Open Data Dashboard**

Choose a second free, key-free public API (ask your teacher to approve it, for example a country-facts, jokes, space-news or weather API that allows free use) and build a small notebook around it. Your notebook must:

1. Explain in Markdown what the API offers, its URL, any rate limit and how you checked that it needs no key.
2. Contain a `fetch_json()` function with a timeout, error handling and status-code checks, and a table that lists the status codes you met.
3. Print the whole response once, and describe its structure in a Markdown cell.
4. Extract at least six fields from the response and show them as a neat report.
5. Call the API for at least three different inputs (for example three countries or three cities), collect the results in a list of dictionaries and display them in a DataFrame.
6. Add a short section titled **Safety and privacy** that lists what you did to be a polite and safe user of the API.
7. Pass *Restart and run all*.

## Portfolio Connection

Today you finish the **Live Data Explorer** (Part 2), the third portfolio project of Course 3. It shows employers and teachers that your programs can work with live information, a skill used by every modern app. It also pulls together everything in this course: functions, error handling, JSON, notebooks and DataFrames. In Lesson 8 you recap all three projects of the course and learn how to document and share them.
