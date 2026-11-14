# Lumexa Mission Log: Python, Artificial Intelligence & Modern Computing

**Course/Path:** Python, Artificial Intelligence & Modern Computing
**Lesson:** 06 of 08
**Title:** Natural Language Processing, Computer Vision and Generative AI
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Python

---

## Mission Brief

Language and pictures are the most human kinds of data, and they are where artificial intelligence has made its most visible advances: search engines that understand a question, translators, voice assistants, face unlock, medical scans read by software, and chatbots that write essays. These systems look magical, and they come with magical claims. This lesson takes the magic apart. You will build tiny but real versions of the main ideas, so that the big systems become understandable machines that you can judge, not mysteries that you must believe.

You learn how text is turned into numbers (**natural language processing**), how an image is just a grid of numbers that can be filtered (**computer vision**), and how a **language model** generates text by predicting the next word, which explains both its power and its habit of making things up (**generative AI**). You then learn the rules for using these tools **responsibly**, and you finish the lesson by adding a **text analyser**, an **image-filter experiment** and a **responsible-use note** to the course project.

## Learning Objectives

1. Describe the steps of a basic NLP pipeline (tokenising, normalising, removing stop words, counting, vectors, similarity) and implement them in Python.
2. Build a text analyser with word frequencies, TF-IDF keywords, cosine similarity and a lexicon-based sentiment score, and state its limits.
3. Explain how an image is stored as a grid of pixel values, and implement threshold, blur and edge-detection filters with a 3 x 3 kernel.
4. Explain at a high level how neural networks learn features for vision (convolutional networks) and for text (transformers).
5. Build a toy bigram language model that generates text, and explain how large language models extend the same idea and why they hallucinate.
6. Apply rules of responsible use to generative AI: verify, disclose, protect privacy, respect academic integrity, and watch for bias.

## Prerequisites

- Lessons 1 to 5: Python collections, functions, data handling and the basics of machine learning.
- Regular expressions from the lessons on programming languages, and the idea of a vector from the mathematics courses.
- Nothing is installed: all programs use only the Python standard library.

## Concept Explanation

### Natural language processing: from text to numbers

**Natural language processing (NLP)** is the field that lets computers work with human language: search, translation, spam filtering, summaries, chatbots. A computer cannot use text directly, so every NLP system first turns text into numbers. The basic pipeline has five steps. **Tokenising** splits the text into **tokens**, here the words, found with a regular expression such as `[a-z]+` after lower-casing (this is also **normalising**, so that "Robot" and "robot" count as one word). Next come the **stop words**, very common words such as *the*, *and* and *is* that carry little meaning and are often removed. Then the tokens are **counted**: the **bag of words** of a text is its table of word counts, which throws away the word order. Then the counts are turned into **vectors**, one number per word, so that texts can be compared with mathematics. Finally you **analyse**: find the keywords, measure the similarity, judge the sentiment.

A word that occurs often in one text is a good keyword for it only if it is *rare* in the other texts. **TF-IDF** captures this: the score of a word in a document is its count (the term frequency) times log(N / df), where N is the number of documents and df is the number of documents that contain the word (the inverse document frequency); a word that is in every document scores zero. Two texts can be compared with the **cosine similarity** of their count vectors: 1 means the same proportions of words, 0 means no word in common. **Sentiment analysis** guesses whether a text is positive or negative; the simplest method counts the words of a small **lexicon** of positive and negative words and flips the sign after *not*. These methods are cheap and surprisingly useful, and their limits are important: a bag of words has no idea of meaning, **negation** and **sarcasm** fool a lexicon ("I love waiting two hours for lunch"), a word can have several meanings, and most tools work best for English. Languages such as Bangla need their own tokenisers, lexicons and data, which are scarcer, so the same tool can be much weaker for them.

### Computer vision: images as numbers

A digital image is a **grid of pixels**. In a **grayscale** image every pixel is one number, its brightness, usually from 0 (black) to 255 (white); in a **colour** image every pixel has three numbers, the intensities of red, green and blue (**RGB**). So an image is a list of lists of numbers, and every image operation is a calculation on those numbers. A **threshold** filter makes every pixel white if it is brighter than a level and black otherwise; it can remove faint noise and separate an object from its background. A **convolution** slides a small grid of numbers, the **kernel**, over the image: at each position it multiplies the nine pixels under a 3 x 3 kernel by the nine kernel numbers and adds the results. A kernel of nine times 1/9 **blurs** the image (every pixel becomes the average of its neighbourhood); the kernel with 4 in the middle and -1 on the four neighbours detects **edges**, because it gives 0 where the brightness is flat and a large number where it changes.

Modern **computer vision** does not use kernels written by hand. A **convolutional neural network (CNN)** has many kernels whose numbers are **learned** from labelled images: the first layers learn to detect edges, the next layers combine edges into corners and textures, and deeper layers combine those into parts and objects. The usual tasks are **classification** (what is in the picture?), **detection** (where are the objects?) and **segmentation** (which pixels belong to which object?). Vision systems share the problems of all machine learning: they can be wrong in lighting or camera conditions that the training data did not contain, they can be fooled by small, deliberate changes, and they work worse for groups that are missing from the data.

### Generative AI and large language models

Most of the AI in Lesson 5 *recognises* things. **Generative AI** *creates* new text, images, audio or code. A **language model** is a model of the probability of the next **token** (a word or a piece of a word) given the tokens before it. A **bigram** model looks at only the previous word and is made by counting which word follows which, as you will do in Example 3. A **large language model (LLM)** does the same job with a neural network of billions of parameters, called a **transformer**, whose **attention** mechanism lets every token look at all the other tokens in a long text to decide what it means in context. It is first trained on huge collections of text to predict the next token, and then **fine-tuned**, partly with feedback from people, to follow instructions and to be helpful. To generate, the model gets a **prompt**, computes the probabilities of the next token, picks one (a setting called **temperature** controls how adventurous the choice is), appends it and repeats. Image generators work differently (many start from random noise and remove it step by step, guided by the text), but they too learn the patterns of their training data.

This explains what they do well, fluent drafts, explanations, translations and help with code, and why they can **hallucinate**: an LLM predicts text that is *likely*, not text that is *true*. It has no built-in way to check a fact, to know what it does not know, or to name a real source: a reference that looks perfect can be invented. Models can repeat the **biases** of their training data, their knowledge ends at the date of their training, they can be tricked by instructions hidden in the text they read (**prompt injection**), and training and running them costs a great deal of energy.

### Using generative AI responsibly

Treat the output of a generative model as a **draft from an enthusiastic stranger**: useful, and never to be trusted without a check. **Verify** every fact that matters against a reliable source, and never rely on a citation that you have not found yourself. Follow the rules of your school and **disclose** AI help when they require it: handing in AI text as your own work breaks **academic integrity**, and it also cheats you of the learning, because the point of an assignment is the thinking. A good use is to ask for an explanation, then close the chat and try the problem yourself. Protect **privacy**: never paste passwords, personal data or other people's private messages into a chatbot, because you may not control where the text goes. Be aware of **copyright** and of the licence of what you reuse, watch for **bias** and harmful content, and remember **deepfakes**: an image, a voice or a video can be generated, so check the source before you believe or share it. Above all, the **human stays accountable**: you, not the model, are responsible for what you submit, publish or decide.

## Key Vocabulary

| Term | Definition |
|---|---|
| **NLP / token** | Natural language processing: computers working with language / the unit of text that a model works with, such as a word. |
| **Stop word** | A very common word, such as *the* or *and*, that is often removed before counting. |
| **Bag of words** | A text represented only by its word counts, without the word order. |
| **TF-IDF** | A keyword score: the count of a word in a document times log(N / number of documents with the word). |
| **Cosine similarity** | A number from 0 to 1 that compares two count vectors; 1 means the same proportions. |
| **Sentiment analysis** | Judging whether a text is positive or negative, here with a lexicon of words. |
| **Pixel / RGB** | One point of an image, a number from 0 to 255 for gray / the three intensities of red, green and blue. |
| **Kernel / convolution** | A small grid of numbers / sliding it over an image, multiplying and adding at each position. |
| **Threshold** | A filter that makes a pixel white above a brightness level and black below it. |
| **CNN** | Convolutional neural network: a network whose kernels are learned from labelled images. |
| **Language model / LLM** | A model of the next token given the previous ones / one with billions of parameters, called a transformer. |
| **Hallucination** | A fluent output that is false or invented, because the model predicts likely text, not true text. |
| **Prompt / temperature** | The input text given to a model / the setting that controls how adventurous the choice of the next token is. |
| **Prompt injection** | Instructions hidden in the text that a model reads, which try to make it misbehave. |

## Worked Examples

### Example 1: A text analyser

```python
import math
import re
from collections import Counter

DOCS = {
    "football": "The school football team won the match. The team played well and the fans cheered the team.",
    "science": "The science club built a robot. The robot can follow a line and the club won a prize.",
    "canteen": "The canteen has a new menu. The menu has rice, fish and fruit, and the food is fresh.",
    "exams": "The exams start on Monday. Students should revise the science notes and sleep well before the exams.",
}
STOP = {"the", "a", "an", "and", "is", "are", "has", "can", "on", "in", "of", "to", "should", "before", "new"}


def tokens(text):
    """Lower-case words made of letters, without the stop words."""
    return [word for word in re.findall(r"[a-z]+", text.lower()) if word not in STOP]


counts = {name: Counter(tokens(text)) for name, text in DOCS.items()}
n = len(DOCS)
document_frequency = Counter(word for c in counts.values() for word in c)
for name, c in counts.items():
    scores = {word: c[word] * math.log(n / document_frequency[word]) for word in c}
    best = sorted(scores.items(), key=lambda item: (-item[1], item[0]))[:3]
    print(f"{name:<9}", ", ".join(f"{word} {score:.2f}" for word, score in best))


def cosine(a, b):
    dot = sum(a[w] * b[w] for w in a if w in b)
    return dot / (math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values())))


pairs = sorted(((cosine(counts[a], counts[b]), a, b) for a in counts for b in counts if a < b), reverse=True)
for similarity, a, b in pairs:
    print(f"similarity {a}/{b}: {similarity:.2f}")
print("a document with itself:", round(cosine(counts["exams"], counts["exams"]), 2))

POSITIVE = {"good", "great", "love", "fresh", "excellent", "happy"}
NEGATIVE = {"bad", "boring", "terrible", "late", "hate", "sad"}


def sentiment(text):
    score, flip = 0, False
    for word in re.findall(r"[a-z]+", text.lower()):
        if word in {"not", "never", "no"}:
            flip = True
            continue
        value = (word in POSITIVE) - (word in NEGATIVE)
        if value:
            score += -value if flip else value
        flip = False
    return score


for review in ["The food was good.", "The food was not good.", "I love waiting two hours for lunch."]:
    print(f"{sentiment(review):+d}  {review}")
```

```output
football  team 4.16, cheered 1.39, fans 1.39
science   club 2.77, robot 2.77, built 1.39
canteen   menu 2.77, canteen 1.39, fish 1.39
exams     exams 2.77, monday 1.39, notes 1.39
similarity exams/science: 0.08
similarity exams/football: 0.07
similarity football/science: 0.06
similarity canteen/science: 0.00
similarity canteen/football: 0.00
similarity canteen/exams: 0.00
a document with itself: 1.0
+1  The food was good.
-1  The food was not good.
+1  I love waiting two hours for lunch.
```

1. `tokens` lower-cases the text, finds the words with the regular expression `[a-z]+` and drops the stop words. Counting the tokens of each document gives its **bag of words**.
2. The **TF-IDF** score is the count times `log(n / document_frequency)`. "team" is the top keyword of the football text (4.16) because it occurs three times and in only one of the four documents: 3 x log(4 / 1). "club" and "robot" top the science text, "menu" the canteen text and "exams" the exams text. The word "science" occurs in two documents, so its score is lower and it is not a top keyword of either.
3. The **cosine similarity** is 0.00 for the canteen text, which shares no word with the others, and about 0.06 to 0.08 for the other pairs, which share one word each: "science" for exams and science, "won" for football and science, and just "well" for exams and football. A document compared with itself gives 1.0. The last pair shows the weakness of a **bag of words**: it counts shared words and has no idea of meaning.
4. The lexicon **sentiment** score is +1 for "good" and -1 after the negation "not" flips it, but the third review, a sarcastic complaint, scores **+1** because it contains "love". The method counts words; it cannot see irony, context or tone, so never use such a score for an important decision about a person.

### Example 2: Images as numbers

```python
RAMP = " .:-=+*#%@"

IMAGE = [[30] * 8 for _ in range(8)]
for row in range(2, 6):
    for col in range(2, 6):
        IMAGE[row][col] = 200
IMAGE[0][7] = 90


def show(image):
    for row in image:
        print("".join(RAMP[min(9, int(max(0, v) * 10 // 256))] * 2 for v in row))


def convolve(image, kernel):
    """Slide a 3 x 3 kernel over the image; the result is two pixels smaller in each direction."""
    size = len(image)
    return [[sum(kernel[i][j] * image[r + i][c + j] for i in range(3) for j in range(3)) for c in range(size - 2)] for r in range(size - 2)]


BLUR = [[1 / 9] * 3 for _ in range(3)]
EDGE = [[0, -1, 0], [-1, 4, -1], [0, -1, 0]]

print("original (noise pixel at the top right)")
show(IMAGE)
print("\nthreshold at 128")
show([[255 if v >= 128 else 0 for v in row] for row in IMAGE])
print("\nblur")
blurred = convolve(IMAGE, BLUR)
show(blurred)
print("\nedges")
show([[abs(v) for v in row] for row in convolve(IMAGE, EDGE)])
print("\nsample numbers, row 2 of the edge map:", [round(v) for v in convolve(IMAGE, EDGE)[2]])
print("brightest blurred pixel:", round(max(max(row) for row in blurred)))
```

```output
original (noise pixel at the top right)
..............--
................
....########....
....########....
....########....
....########....
................
................

threshold at 128


    @@@@@@@@
    @@@@@@@@
    @@@@@@@@
    @@@@@@@@



blur
..::----::::
::==++++==::
--++####++--
--++####++--
::==++++==::
..::----::..

edges
  ********
**@@****@@**
****    ****
****    ****
**@@****@@**
  ********

sample numbers, row 2 of the edge map: [-170, 170, 0, 0, 170, -170]
brightest blurred pixel: 200
```

1. The picture is a **list of lists of numbers**: an 8 x 8 grayscale image with a dark background (30), a bright 4 x 4 square (200) and one noisy pixel (90) in the top right corner. `show` turns each brightness into a character of the ramp, from a space (dark) to `@` (bright), and prints every character twice because characters are taller than they are wide.
2. The **threshold** at 128 makes every pixel that is at least 128 white (255) and every other pixel black (0). The square stays and the faint noise pixel vanishes.
3. `convolve` is the heart of vision code: for each position it multiplies the nine pixels under the **kernel** by the nine kernel numbers and adds them. With nine values of 1/9 each, every output pixel is the **average** of its neighbourhood: the square becomes soft at its borders, and the brightest blurred pixel is still 200, in the middle of the square where all nine neighbours are bright. The result is 6 x 6, two pixels smaller in each direction.
4. The **edge kernel** has 4 in the centre and -1 on the four neighbours. Where the neighbourhood is flat (inside the square, in the background) the sum is 0; where the brightness changes it is large. The printed edge map shows the **outline of the square**, and the row of numbers (-170, 170, 0, 0, 170, -170) shows both the size and the direction of the change. A convolutional network learns thousands of such kernels by itself.

### Example 3: A toy language model that makes things up

```python
from collections import Counter, defaultdict

CORPUS = ("the football team won the match . the science club won a prize . the robot can follow a line . "
          "the team played well . the club built a robot . the robot won a prize .")
words = CORPUS.split()
following = defaultdict(Counter)
for first, second in zip(words, words[1:]):
    following[first][second] += 1

for word in ("the", "won", "robot"):
    total = sum(following[word].values())
    print(f"after '{word}':", ", ".join(f"{w} {c}/{total}" for w, c in following[word].most_common()))


def generate(start, length, seed):
    """Pick each next word at random, weighted by how often it followed the word in the corpus."""
    state, sentence = seed, [start]
    for _ in range(length):
        options = sorted(following[sentence[-1]].items())
        state = (state * 1103515245 + 12345) % 2 ** 31
        pick = state % sum(count for _, count in options)
        for word, count in options:
            if pick < count:
                break
            pick -= count
        sentence.append(word)
        if word == ".":
            break
    return " ".join(sentence)


for seed in (1, 2, 3, 4, 5, 6):
    print(f"seed {seed}: {generate('the', 9, seed)}")
```

```output
after 'the': robot 2/7, football 1/7, match 1/7, science 1/7, team 1/7, club 1/7
after 'won': a 2/3, the 1/3
after 'robot': can 1/3, . 1/3, won 1/3
seed 1: the robot .
seed 2: the match .
seed 3: the match .
seed 4: the club built a line .
seed 5: the club won a prize .
seed 6: the science club won a robot .
```

1. The corpus is only 38 tokens long (the words and the full stops). The loop counts, for every word, which words follow it: this table is a **bigram language model**. After "the" the word "robot" came 2 times out of 7, and each of "football", "match", "science", "team" and "club" once; after "won" come "a" (2 of 3) and "the" (1 of 3).
2. `generate` writes a sentence one word at a time: it looks at the **last word**, gets the words that followed it in the corpus, and picks one at random with probability proportional to its count, using a repeatable pseudo-random generator, until a full stop. This is **next-token prediction**, the same loop that an LLM runs.
3. The sentences are made of correct pieces, but some are new combinations. Seed 5 gives "the club won a prize .", which the corpus supports. Seed 6 gives "**the science club won a robot .**" and seed 4 "**the club built a line .**": they are fluent in form but false or senseless, because the model counted word pairs and has no idea what is true. Some sentences simply stop early ("the match ."), because the model sees only one word of context.
4. A **large language model** is the same idea made enormous: instead of one previous word it reads thousands of tokens through the attention of a transformer, with billions of parameters trained on a vast amount of text, so its sentences are far better. But it still predicts *likely* text, so it can still produce a smooth, confident falsehood, a **hallucination**.

## Common Mistakes and Misconceptions

- **Thinking that a bag of words understands text.** It counts words; it has no idea of meaning, order, negation or sarcasm.
- **Skipping normalisation.** Without lower-casing and removing punctuation, "Robot", "robot" and "robot." are three different words, and stop words dominate every count.
- **Trusting a lexicon score for a decision about a person.** Sentiment from word lists is crude and fails on irony and on languages that it was not built for.
- **Forgetting the range of pixel values.** A filter can produce numbers below 0 or above 255; clip or take the absolute value before you display them, and divide by 9 for an average of nine pixels.
- **Believing that a model "knows".** A language model predicts likely text, not true text; invented facts and references look just as polished as real ones.
- **Using a chatbot's answer or citation without checking it.** Find the source yourself, and verify the facts that matter.
- **Pasting private data into a chatbot.** Passwords, personal details and other people's messages must not be shared with a tool whose storage you do not control.
- **Submitting AI output as your own work,** or using it so that you skip the thinking that the exercise was meant to teach.

## Guided Hands-On Activity

**Analyse, filter, generate, doubt.** Work with your teacher and the code editors.

1. In Example 1 add the reviews "The food was not bad." and "The food was never great but I love it." Predict the scores first. Which one does the lexicon get right, and which wrong?
2. In Example 1 set `STOP` to an empty set and look at the keywords again. Which words take over, and why?
3. In Example 1 add a fifth document about the school library. Which existing document is it most similar to, and is that sensible?
4. In Example 2 change the threshold from 128 to 20 and then to 250. Explain what happens to the noise pixel and to the square.
5. In Example 2 apply the sharpening kernel `[[0, -1, 0], [-1, 5, -1], [0, -1, 0]]` and describe the effect. (It is the edge kernel added to the original pixel.)
6. In Example 3 add three sentences to the corpus and run the generator again. Why do larger corpora give better sentences, and why do they still give false ones?
7. Write five rules for using a chatbot for your homework, and say which of them you would check in a teacher's rules.

## Lesson Project: Text and Image Analysers

### Objective

Add the **Text and Image Analysers** to the course project: a text analyser for a school newsletter, an image-filter experiment on a small picture, and a **responsible-use note** about generative AI that a short program checks for the main topics.

### Requirements

- **The text analyser.** For the newsletter paragraph below, print the number of sentences, the number of words and the number of words left after removing the stop words, the five most frequent words after removing them (by count, then alphabetically), the lexicon sentiment of each sentence with the overall total (a negation word flips the next sentiment word), and the pair of sentences with the highest cosine similarity.
- **The image experiment.** Turn the picture below (digits 0 to 9, each digit times 28) into a 10 x 10 grid of brightness values and print it as characters, then the thresholded image at 128 and the edge map (absolute values). Print the brightest pixel before and after blurring.
- **The responsible-use note.** Write a note of your own of at least five sentences on how you will use generative AI. A function `covered(note)` must report which of six topics the note mentions, using the keywords **verify**, **tell my teacher**, **personal data**, **bias**, **academic integrity** and **hallucinate**; print how many topics are covered and which are missing.

```text
Our school science club built a robot this term. The robot can follow a line, and the club won a prize at the district fair. The canteen has a new menu, and the food is fresh and good. However, the long queue at lunch is not good. Parents love the new library hours. The exams start soon, so students should revise the science notes.
```

```text
0000000000
0000770000
0000770000
0000770000
0777777770
0777777770
0000770000
0000770000
0000770000
0000000300
```

Use the stop words the, a, an, and, is, are, has, can, on, in, of, to, should, at, so, this, our, new and however; the positive words good, great, love, fresh, excellent and happy; and the negative words bad, boring, terrible, late, hate and sad.

### Instructions

1. Write `words(text)`, `content_words(text)` (without stop words) and `sentiment(sentence)` with the negation rule.
2. Split the newsletter into sentences with `re.split(r"(?<=[.!?])\s+", text)` and print the counts, the top words and the sentiment of each sentence.
3. Write `cosine` and find the most similar pair of sentences from their content-word counts.
4. Build the image from the digit strings, and write `show`, `convolve` and `threshold`.
5. Print the original, the thresholded image and the edge map, and the brightest pixel before and after the blur.
6. Write your own responsible-use note, and `covered(note)` with the six keywords.
7. Compare your output with the expected output (your note may be worded differently, but it must cover the six topics).

### Expected Output

```text
Text analyser
6 sentences, 64 words, 35 after removing stop words
top words: club 2, good 2, robot 2, science 2, built 1
sentiment by sentence: 0 0 +2 -1 +1 0 (overall +2)
most similar sentences: 1 and 2 (cosine 0.29)

Image experiment: original

        ####
        ####
        ####
  ################
  ################
        ####
        ####
        ####
              --

threshold at 128 (removes the noise pixel)

        @@@@
        @@@@
        @@@@
  @@@@@@@@@@@@@@@@
  @@@@@@@@@@@@@@@@
        @@@@
        @@@@
        @@@@


edges
    ##@@@@##
    ########
####@@####@@####
@@####    ####@@
@@####    ####@@
####@@####@@####
    ########
    ##@@@@##--

brightest pixel before and after blurring: 196 174

Responsible-use note covers 6 of 6 topics
missing: nothing
```

### Hints

1. **Hint 1 (the sentences).** `re.split(r"(?<=[.!?])\s+", text)` splits after a full stop, question mark or exclamation mark.
2. **Hint 2 (the top words).** `sorted(Counter(words).items(), key=lambda item: (-item[1], item[0]))[:5]` sorts by count and then by word.
3. **Hint 3 (the sentiment format).** `f"{s:+d}" if s else "0"` prints +2, -1 and 0.
4. **Hint 4 (the best pair).** `max((cosine(a, b), i, j) for i ... for j in range(i + 1, n))` finds the largest similarity.
5. **Hint 5 (the image).** `[[int(ch) * 28 for ch in row] for row in PICTURE]` turns the strings into numbers.
6. **Hint 6 (the note).** `keyword in note.lower()` checks one topic; list the topics that are not found.

### Success Criteria

- [ ] The analyser reports 6 sentences, 64 words and 35 words after removing the stop words.
- [ ] The top words are club, good, robot, science and built, and the sentence sentiments are 0, 0, +2, -1, +1 and 0 with an overall +2.
- [ ] The threshold removes the noise pixel, and the edge map shows the outline of the plus sign.
- [ ] The brightest pixel is 196 before and 174 after blurring.
- [ ] The note checker reports that all six topics are covered and nothing is missing.

### Extension Challenge

Add TF-IDF keywords for each sentence of the newsletter, and a sentiment rule for "very" that doubles the next sentiment word. For the image, implement a median filter (each pixel becomes the median of its 3 x 3 neighbourhood) and show that it removes the noise pixel without blurring the edges. Finally, extend the bigram model to a **trigram** model (two previous words) and compare its sentences with those of the bigram model on a corpus of your own.

## Lesson Recap

- **NLP** turns text into numbers: tokenise, normalise, remove stop words, count (**bag of words**), then find keywords (**TF-IDF**), similarity (**cosine**) and sentiment (**lexicon**), and know that negation, sarcasm and other languages break the simple methods.
- An **image** is a grid of numbers; **threshold**, **blur** and **edge** filters are calculations with a **kernel**, and a **CNN** learns its kernels from labelled images.
- A **language model** predicts the next token; an **LLM** does it with a transformer and billions of parameters, which gives fluent text and also **hallucinations**.
- Use generative AI **responsibly**: verify facts, disclose its use, protect personal data, keep your own thinking, watch for bias, and stay accountable.

## Homework / Extension Mission

Pick a paragraph of about 100 words from a text that you know well and run your text analyser on it: write down the top words and the sentiment of each sentence, and mark the sentences where the score is wrong and say why. Then ask a chatbot (if your school allows it) a question to which you know the answer, such as a fact about your town, and check every claim of its answer against a reliable source. Write one paragraph on what it got right, what it got wrong or invented, and what you would never trust it with.

## Course Project Connection

This lesson adds the **Text and Image Analysers** and the responsible-use note to the **course project**, the small Python-based computational application or data exploration project. The text analyser and the filters work on data of a new kind, text and pixels, with the same discipline as the Exam Results Explorer: clean it, summarise it and state the limits. The note is part of the report that you hand in with the project. In Lesson 7 the project gets a sensor pipeline, and in Lesson 8 you finish it with tests, a report and a plan for what to build next.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the pipeline from text to numbers on the board, with a sentence turned into a count table by the class; 10 minutes: Example 1, with the negation and sarcasm cases predicted by the students; 10 minutes: Example 2, with an 8 x 8 grid on paper and the edge kernel applied by hand to one pixel; 10 minutes: Example 3 and the discussion of hallucination; 20 minutes: the project, ending with the responsible-use discussion.

**Live demonstrations.** Apply the edge kernel by hand at two positions on the board, one in a flat area (the sum is 0) and one on the border of the square. Ask a chatbot (if the school allows it) for the references of a topic and look up whether they exist. Let students try to fool the sentiment function with irony and with a negation that it does not handle ("not at all bad").

**Misconceptions.** "The AI understands what it writes." "If it sounds confident, it is right." "A sentiment score is a fact about the writer." "An image is something different from numbers." "Using AI for homework is either always fine or always cheating" (it depends on the rules and the way it is used).

**Assessment of the project.** Run the program and compare the output. Check the counts of sentences and words, the sentiment list and the most similar pair, the thresholded image and the edge map, and the brightest pixels (196 and 174). Check that the note really is the student's own and that the checker finds its six topics. Ask: where would this text analyser fail on a real school newsletter, and what would you tell the head teacher about trusting it?

**Reference solution `analysers.py`** (run with `python3 analysers.py`):

```python
"""Course project, step 6: a text analyser and an image-filter experiment, with a responsible-use note."""
import math
import re
from collections import Counter

NEWSLETTER = (
    "Our school science club built a robot this term. The robot can follow a line, and the club won a prize at "
    "the district fair. The canteen has a new menu, and the food is fresh and good. However, the long queue at "
    "lunch is not good. Parents love the new library hours. The exams start soon, so students should revise the "
    "science notes."
)
STOP = {"the", "a", "an", "and", "is", "are", "has", "can", "on", "in", "of", "to", "should", "at", "so", "this", "our", "new", "however"}
POSITIVE = {"good", "great", "love", "fresh", "excellent", "happy"}
NEGATIVE = {"bad", "boring", "terrible", "late", "hate", "sad"}


def words(text):
    return re.findall(r"[a-z]+", text.lower())


def content_words(text):
    return [w for w in words(text) if w not in STOP]


def sentiment(sentence):
    """Positive words count +1, negative words -1; 'not', 'never' and 'no' flip the next sentiment word."""
    score, flip = 0, False
    for word in words(sentence):
        if word in {"not", "never", "no"}:
            flip = True
            continue
        value = (word in POSITIVE) - (word in NEGATIVE)
        if value:
            score += -value if flip else value
        flip = False
    return score


def cosine(a, b):
    dot = sum(a[w] * b[w] for w in a if w in b)
    return dot / (math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values())))


RAMP = " .:-=+*#%@"
PICTURE = [
    "0000000000", "0000770000", "0000770000", "0000770000", "0777777770",
    "0777777770", "0000770000", "0000770000", "0000770000", "0000000300",
]
IMAGE = [[int(ch) * 28 for ch in row] for row in PICTURE]
BLUR = [[1 / 9] * 3 for _ in range(3)]
EDGE = [[0, -1, 0], [-1, 4, -1], [0, -1, 0]]


def show(image):
    for row in image:
        print("".join(RAMP[min(9, int(max(0, v) * 10 // 256))] * 2 for v in row))


def convolve(image, kernel):
    size = len(image)
    return [[sum(kernel[i][j] * image[r + i][c + j] for i in range(3) for j in range(3)) for c in range(size - 2)] for r in range(size - 2)]


def threshold(image, level):
    return [[255 if v >= level else 0 for v in row] for row in image]


NOTE = (
    "I use generative AI to explain ideas and to check my work, but I verify every fact in a reliable source. "
    "I tell my teacher when AI helped me and I follow the school rules, because handing in AI text as my own "
    "would break academic integrity. I never paste personal data or passwords into a chatbot. I know that AI "
    "can be biased and can hallucinate, so I cite my real sources and keep my own thinking."
)
TOPICS = {
    "check the facts": "verify", "say when AI helped": "tell my teacher", "protect personal data": "personal data",
    "watch for bias": "bias", "keep the work your own": "academic integrity", "expect mistakes": "hallucinate",
}


def covered(note):
    return [topic for topic, keyword in TOPICS.items() if keyword in note.lower()]


if __name__ == "__main__":
    sentences = re.split(r"(?<=[.!?])\s+", NEWSLETTER)
    useful = content_words(NEWSLETTER)
    print("Text analyser")
    print(f"{len(sentences)} sentences, {len(words(NEWSLETTER))} words, {len(useful)} after removing stop words")
    top = sorted(Counter(useful).items(), key=lambda item: (-item[1], item[0]))[:5]
    print("top words:", ", ".join(f"{w} {c}" for w, c in top))
    scores = [sentiment(s) for s in sentences]
    print("sentiment by sentence:", " ".join(f"{s:+d}" if s else "0" for s in scores), f"(overall {sum(scores):+d})")
    vectors = [Counter(content_words(s)) for s in sentences]
    best = max(((cosine(vectors[i], vectors[j]), i, j) for i in range(len(vectors)) for j in range(i + 1, len(vectors))))
    print(f"most similar sentences: {best[1] + 1} and {best[2] + 1} (cosine {best[0]:.2f})")

    print("\nImage experiment: original")
    show(IMAGE)
    print("\nthreshold at 128 (removes the noise pixel)")
    show(threshold(IMAGE, 128))
    print("\nedges")
    show([[abs(v) for v in row] for row in convolve(IMAGE, EDGE)])
    blurred = convolve(IMAGE, BLUR)
    print("\nbrightest pixel before and after blurring:", max(map(max, IMAGE)), round(max(map(max, blurred))))

    found = covered(NOTE)
    print(f"\nResponsible-use note covers {len(found)} of {len(TOPICS)} topics")
    missing = [t for t in TOPICS if t not in found]
    print("missing:", ", ".join(missing) if missing else "nothing")
```

```output
Text analyser
6 sentences, 64 words, 35 after removing stop words
top words: club 2, good 2, robot 2, science 2, built 1
sentiment by sentence: 0 0 +2 -1 +1 0 (overall +2)
most similar sentences: 1 and 2 (cosine 0.29)

Image experiment: original

        ####
        ####
        ####
  ################
  ################
        ####
        ####
        ####
              --

threshold at 128 (removes the noise pixel)

        @@@@
        @@@@
        @@@@
  @@@@@@@@@@@@@@@@
  @@@@@@@@@@@@@@@@
        @@@@
        @@@@
        @@@@


edges
    ##@@@@##
    ########
####@@####@@####
@@####    ####@@
@@####    ####@@
####@@####@@####
    ########
    ##@@@@##--

brightest pixel before and after blurring: 196 174

Responsible-use note covers 6 of 6 topics
missing: nothing
```

**Differentiation.** Support: give `words`, `sentiment` and `show`, and let students write the counting, the similarity and the filters. Stretch: TF-IDF keywords per sentence, the "very" rule, the median filter and the trigram model.

**Discussion questions (not for the student quiz).** Who is responsible if a student submits a chatbot's invented reference? Why might a text analyser work worse for Bangla than for English? What would you want to know about the training data of a face recognition system before it is used at the school gate?
