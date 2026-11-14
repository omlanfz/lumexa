# Lumexa Mission Log: Operating Systems, Networking & Cybersecurity

**Course/Path:** Operating Systems, Networking & Cybersecurity
**Lesson:** 07 of 08
**Title:** Cybersecurity, Authentication, Authorisation and Cryptography
**Duration:** 60 minutes
**Difficulty:** Intermediate to Advanced
**Technology:** Python · JavaScript

---

## Mission Brief

Every service you have met in this course, from the web server of Lesson 6 to the database of the next course, holds something worth protecting: passwords, grades, messages, money. Security is not a feature that you add at the end. It is a way of designing: deciding who may do what, storing secrets so that a stolen database is useless, and making sure that nobody can read or change a message on its way.

This lesson teaches **defensive** cybersecurity at the level of a first-year student: the goals of security, **authentication** and the safe storage of passwords with **hashing and salting**, **authorisation** and the principle of least privilege, and the three families of **cryptography**: hashes, symmetric encryption and public-key encryption. You build working models of each in Python (and one in JavaScript), and design the security of the services of your **Computer Network Explorer**. The ciphers in this lesson are for learning; real systems always use well-tested libraries, never homemade cryptography.

## Learning Objectives

1. Explain the goals of security (confidentiality, integrity and availability) and the ideas of threat, vulnerability and risk.
2. Explain authentication, multi-factor authentication and why passwords must be stored as salted, slow hashes.
3. Estimate the strength of a password and explain why length matters more than clever substitutions.
4. Distinguish authentication from authorisation and apply least privilege with roles.
5. Distinguish hashing, symmetric encryption and public-key encryption and say what each is used for.
6. Build a password checker, a salted password store, a role check, a cipher and a message-integrity check.

## Prerequisites

- Lesson 6: HTTPS, TLS and certificates (this lesson explains the cryptography inside them).
- Python: functions, dictionaries, sets and string handling; JavaScript basics from Course 4.
- Binary numbers and hexadecimal (Course 5); modular arithmetic (Course 4).

## Concept Explanation

### Cybersecurity basics

Security protects **assets** (data, accounts, services) against **threats** (events or people that could cause harm) that exploit **vulnerabilities** (weaknesses: an unpatched program, a weak password, a careless user). The **risk** is the chance of harm multiplied by its impact. The classic goals are the **CIA triad**: **confidentiality** (only the right people can read the data), **integrity** (the data cannot be changed without being noticed) and **availability** (the service works when it is needed). Typical threats are **malware** (software that harms), **phishing** (messages that trick people into giving away secrets), **weak or reused passwords**, **unpatched software** and **denial-of-service** attacks that overload a service. A large share of real incidents involve people, not clever code, so training users matters as much as technology.

Defenders follow a few principles. **Defence in depth** uses several layers, so that one failure is not fatal (a firewall, then authentication, then encryption, then backups). **Least privilege** gives every user and program only the rights it needs. **Keep it simple and patched**: updates close known vulnerabilities. And **assume that something will fail**: log what happens, make backups and have a plan. It is illegal in most countries, including Bangladesh, to access other people's computers or accounts without permission, so practise only on systems that you own or that your teacher provides.

### Authentication and passwords

**Authentication** answers "who are you?" with something you **know** (a password), something you **have** (a phone, a security key) or something you **are** (a fingerprint). **Multi-factor authentication (MFA)** combines two kinds, so a stolen password alone is not enough.

A service must never store passwords themselves. If it did, anybody who steals the database would own every account, and people reuse passwords. Instead it stores a **hash**: a fixed-length fingerprint computed by a one-way function that cannot be reversed. To log in, the service hashes what you typed and compares it with the stored hash. Two refinements are essential. A **salt**, a random value stored beside the hash and added to the password before hashing, makes the hashes of two identical passwords different and defeats precomputed tables. A **slow hash** (PBKDF2, bcrypt, scrypt, Argon2) is deliberately expensive to compute, so an attacker who steals the database can only guess a few thousand passwords per second per computer, not billions. A fast hash such as plain SHA-256 is wrong for passwords.

**Password strength** is measured in **bits of entropy**: for a password made of random characters it is `length × log2(size of the character pool)`. Eight lowercase letters give 8 × log2(26) = 37.6 bits; adding digits and capitals helps a little (47.6 bits for 8 characters from a pool of 62), but adding length helps much more (12 characters from a pool of 94 give 78.7 bits). A **passphrase** of random words is easy to remember and strong: each word from a list of 7,776 adds 12.9 bits. Strength estimates only hold for *random* choices: `P@ssw0rd` is a famous password with clever substitutions and is among the first that an attacker tries, and every word of a well-known phrase is in a dictionary. The practical advice is to use a **password manager**, a different long password for every service, and MFA.

### Authorisation and access control

**Authorisation** answers "what may you do?", after authentication has answered "who are you?". Services decide this with an **access control** policy. An **access control list (ACL)** lists, for each resource, who may do what: Unix file permissions (`rwxr-xr-x`) are a simple ACL with read, write and execute for the owner, the group and everybody else. **Role-based access control (RBAC)** gives permissions to **roles** (student, teacher, admin) and puts users into roles, which is easier to manage than permissions for each person. The guiding rule is **least privilege**: a student account can read courses but not change grades; the web server runs as an ordinary user, not as the administrator, so that a flaw in it cannot take over the whole machine.

### Cryptography

**Cryptography** is the science of keeping information secret and authentic. An **algorithm** turns **plaintext** into **ciphertext** using a **key**; **Kerckhoffs's principle** says that the security must lie in the key alone, not in keeping the algorithm secret. Three families do three different jobs.

- **Hash functions** (SHA-256) have no key. They turn any input into a fixed-length output; the same input always gives the same hash; a tiny change gives a completely different hash (the **avalanche effect**); and it is practically impossible to find the input from the hash. Uses: checking that a file is unchanged, storing passwords, and as part of digital signatures. A hash is *not* encryption, because it cannot be decrypted. An **HMAC** is a hash that also needs a secret key, so only someone who knows the key can create or verify the tag: it proves both integrity and origin.
- **Symmetric encryption** (AES) uses the *same* key to encrypt and decrypt. It is very fast and encrypts the bulk of the data on the internet, but the two sides must first share the key safely.
- **Public-key (asymmetric) cryptography** (RSA, elliptic curves) uses a **key pair**: a **public key** that everybody may know and a **private key** that stays secret. What the public key encrypts only the private key can decrypt, so a stranger can send you a secret without meeting you first. Reversed, what the private key signs can be verified by anybody with the public key: a **digital signature**, which proves who wrote a message and that it was not changed. Its security rests on a hard mathematical problem: multiplying two big primes is easy, but finding them again from the product is infeasible.

HTTPS combines them (Lesson 6): public-key cryptography and certificates authenticate the server and agree on a key, then fast symmetric encryption protects the data. Old **classical ciphers** such as the Caesar cipher (shift every letter) and the Vigenère cipher (a different shift for each letter of a repeated key word) are easy to break, with a computer in milliseconds, but they show the vocabulary and the ideas.

## Key Vocabulary

| Term | Definition |
|---|---|
| **CIA triad** | Confidentiality, integrity and availability: the three goals of security. |
| **Threat / vulnerability / risk** | What could cause harm / a weakness that allows it / the chance and the impact of harm. |
| **Authentication / authorisation** | Proving who you are / deciding what you may do. |
| **MFA** | Multi-factor authentication: combining two or more kinds of proof. |
| **Hash** | A fixed-length, one-way fingerprint of data. |
| **Salt** | A random value added to a password before hashing so equal passwords give different hashes. |
| **Entropy** | A measure of unpredictability in bits; each bit doubles the number of guesses. |
| **Least privilege / RBAC** | Giving only the rights needed / giving rights to roles instead of to individuals. |
| **Symmetric / public-key encryption** | One shared key for both directions / a public key to encrypt and a private key to decrypt. |
| **Digital signature** | A value made with a private key that anyone can check with the public key. |
| **HMAC** | A hash with a secret key that proves integrity and origin. |
| **Plaintext / ciphertext** | The readable message / the encrypted message. |

## Worked Examples

### Example 1: Hashing and salted passwords

```python
import hashlib


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


print("A hash has a fixed length and no way back")
for text in ("hello", "hello!", "Hello", "a" * 1000):
    print(f"  {text[:10]:<12} ({len(text):>4} chars) -> {sha(text)[:20]}...")

a, b = sha("pay Ana 100 taka"), sha("pay Ana 900 taka")
different_bits = bin(int(a, 16) ^ int(b, 16)).count("1")
print(f"\nchanging one character flips {different_bits} of the 256 bits (the avalanche effect)")

print("\nStoring passwords: the salt makes equal passwords look different")
for user, salt in (("ana", b"s9a7"), ("ben", b"k2d5")):
    stored = hashlib.pbkdf2_hmac("sha256", b"Lumexa2025", salt, 10_000).hex()
    print(f"  {user}: salt {salt.decode()}  hash {stored[:24]}...")


def check(password, salt, stored):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 10_000).hex() == stored


stored = hashlib.pbkdf2_hmac("sha256", b"Lumexa2025", b"s9a7", 10_000).hex()
print("\nlogin with the right password:", check("Lumexa2025", b"s9a7", stored))
print("login with a wrong password:  ", check("lumexa2025", b"s9a7", stored))
```

```output
A hash has a fixed length and no way back
  hello        (   5 chars) -> 2cf24dba5fb0a30e26e8...
  hello!       (   6 chars) -> ce06092fb948d9ffac7d...
  Hello        (   5 chars) -> 185f8db32271fe25f561...
  aaaaaaaaaa   (1000 chars) -> 41edece42d63e8d9bf51...

changing one character flips 124 of the 256 bits (the avalanche effect)

Storing passwords: the salt makes equal passwords look different
  ana: salt s9a7  hash 456d3b8cccc9f819b98b8ce2...
  ben: salt k2d5  hash add5370a8a7abc0cc83961db...

login with the right password: True
login with a wrong password:   False
```

1. SHA-256 turns any input, from 5 characters to 1,000, into 64 hexadecimal digits (256 bits). The first 20 are shown. `hello`, `hello!` and `Hello` give completely unrelated hashes.
2. Changing one digit of an amount (100 to 900) flips about half of the 256 bits: the **avalanche effect**. This is why a hash detects any tampering with a message or a file.
3. Ana and Ben chose the same password, but different salts give completely different stored values, so an attacker cannot see that they match and cannot use one precomputed table for all users. `pbkdf2_hmac` repeats the hash 10,000 times to be slow on purpose (real systems use far more iterations).
4. To log in, the service repeats the calculation with the stored salt and compares the results. The password itself is never stored and cannot be recovered; an upper-case change in the wrong attempt gives a totally different hash.

### Example 2: A classical cipher, and how to break it

```python
import string

LETTERS = string.ascii_uppercase


def caesar(text, shift):
    """Move every letter `shift` places along the alphabet; leave everything else alone."""
    out = []
    for ch in text.upper():
        out.append(LETTERS[(LETTERS.index(ch) + shift) % 26] if ch in LETTERS else ch)
    return "".join(out)


secret = caesar("WE MEET AT THE LIBRARY BEFORE THE EXAM TO REVISE THE SECURE NETWORK NOTES", 3)
print("encrypted:", secret)
print("decrypted:", caesar(secret, -3))

print("\nan attacker simply tries all 25 keys:")
for shift in (1, 2, 3, 4):
    print(f"  shift {shift}: {caesar(secret, -shift)[:40]}...")
print("  ...")

counts = {letter: secret.count(letter) for letter in LETTERS}
commonest = max(counts, key=counts.get)
print(f"\nfrequency analysis: the commonest letter is {commonest}; if it stands for E, the shift is {(LETTERS.index(commonest) - LETTERS.index('E')) % 26}")
```

```output
encrypted: ZH PHHW DW WKH OLEUDUB EHIRUH WKH HADP WR UHYLVH WKH VHFXUH QHWZRUN QRWHV
decrypted: WE MEET AT THE LIBRARY BEFORE THE EXAM TO REVISE THE SECURE NETWORK NOTES

an attacker simply tries all 25 keys:
  shift 1: YG OGGV CV VJG NKDTCTA DGHQTG VJG GZCO V...
  shift 2: XF NFFU BU UIF MJCSBSZ CFGPSF UIF FYBN U...
  shift 3: WE MEET AT THE LIBRARY BEFORE THE EXAM T...
  shift 4: VD LDDS ZS SGD KHAQZQX ADENQD SGD DWZL S...
  ...

frequency analysis: the commonest letter is H; if it stands for E, the shift is 3
```

1. The Caesar cipher adds the shift to every letter (modulo 26). Decrypting subtracts it. Spaces and punctuation are left unchanged, which already leaks the word lengths.
2. With only 25 possible keys, an attacker tries them all in a fraction of a second and recognises the right one by reading it: the key space is far too small.
3. Even without trying keys, **frequency analysis** breaks it: in English the commonest letter is E. Here the commonest letter of the ciphertext is H, so the shift must be 3. Longer texts make this more reliable.
4. A good cipher must have a huge key space (AES-256 has 2²⁵⁶ keys) and must hide the statistics of the language. That is why you use a tested library, never a cipher of your own.

The same cipher in JavaScript, which runs in every browser and in Node:

```javascript
function caesar(text, shift) {
  const A = 65;
  return [...text.toUpperCase()]
    .map((ch) => (ch >= "A" && ch <= "Z" ? String.fromCharCode(((ch.charCodeAt(0) - A + shift + 26) % 26) + A) : ch))
    .join("");
}

const secret = caesar("MEET ME AT THE LIBRARY AT NOON", 3);
console.log("encrypted:", secret);
console.log("decrypted:", caesar(secret, -3));
```

```output
encrypted: PHHW PH DW WKH OLEUDUB DW QRRQ
decrypted: MEET ME AT THE LIBRARY AT NOON
```

The algorithm is identical: characters become numbers (`charCodeAt`), the shift is added modulo 26 and the numbers become characters again (`fromCharCode`). Only the syntax differs.

### Example 3: Public-key cryptography with tiny numbers

```python
p, q = 61, 53                                  # two secret primes (real keys use primes with hundreds of digits)
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
print(f"\nsignature of {message!r}: {signature}; anyone can verify it:", pow(signature, e, n) == digest)
tampered = sum(ord(ch) for ch in "HI?") % n
print("signature of a changed message is accepted:", pow(signature, e, n) == tampered)

print("\nbreaking the key means factoring n:")
for guess in range(2, n):
    if n % guess == 0:
        print(f"  {n} = {guess} x {n // guess} found after {guess - 1} tries; for a 2048-bit n this is impossible in practice")
        break
```

```output
public key (n=3233, e=17); private key d=2753
message 'HI!' -> numbers [72, 73, 33] -> encrypted [3000, 1486, 1853]
decrypted with the private key: 'HI!'

signature of 'HI!': 2055; anyone can verify it: True
signature of a changed message is accepted: False

breaking the key means factoring n:
  3233 = 53 x 61 found after 52 tries; for a 2048-bit n this is impossible in practice
```

1. The **public key** is the pair (n, e) = (3233, 17); the **private key** is d = 2753, computed from the secret primes 61 and 53. Each character is turned into a number and encrypted with `pow(m, e, n)` (modular exponentiation), which anybody can do.
2. Only the owner of d can decrypt: `pow(c, d, n)` returns the original numbers and the text `HI!`. The two keys undo each other: (m^e)^d = m (mod n).
3. A **signature** works in reverse: the owner raises the digest to the power d, and anybody can check it with the public exponent e. The signature of a changed message is rejected. (The digest here is a toy; a real signature signs a SHA-256 hash.)
4. The only secret is the factorisation of n. With n = 3233 it is found in 52 tries. A real key has a 2048-bit n, and no known method can factor it in a practical time: that difficulty is the whole security.

## Common Mistakes and Misconceptions

- **Storing passwords in plain text, or with a fast unsalted hash.** Use a salted, slow password hash from a trusted library.
- **Confusing hashing with encryption.** Encryption can be reversed with the key; a hash cannot be reversed at all.
- **Believing that clever substitutions make a password strong.** Length and randomness matter; `P@ssw0rd` is on every attacker's list.
- **Confusing authentication with authorisation.** Logging in proves who you are; it does not mean that you may do everything.
- **Hiding the algorithm as the secret.** Security must rest on the key (Kerckhoffs's principle); published algorithms are tested by thousands of experts.
- **Writing your own cryptography.** Homemade ciphers, such as the ones in this lesson, are broken quickly; use a standard library.
- **Thinking that encryption alone gives integrity.** A message can be encrypted and still be altered; you also need a signature or an HMAC.
- **Reusing one password everywhere.** One leak then opens every account; use a different password for each service and MFA.

## Guided Hands-On Activity

**Protect and break (your own data only).** Work with your teacher.

1. In Example 1 compute the SHA-256 hash of your own name, then of your name with one letter changed. How many of the first 20 hexadecimal digits are different?
2. In Example 1 change the number of PBKDF2 iterations from 10,000 to 1,000,000 and time the program with `time.time()`. What does the slowdown cost an attacker?
3. In Example 2 encrypt your own sentence with the shift 7 and give it to a classmate. They break it with the shift loop. How many tries did they need?
4. Run the JavaScript version in the lab and change the shift to 13. Encrypt the result again with 13. What do you get, and why? (This cipher is called ROT13.)
5. In Example 3 change the primes to 101 and 103 and the public exponent to 7 (check that `gcd(7, 100 * 102)` is 1). Does decryption still work? How long does the factoring loop take now?
6. Open an account page of a service you use and write down which authentication factors it offers. Is MFA available, and have you switched it on?

## Lesson Project: Secure It: Passwords, Hashes and Ciphers

### Objective

Write a **security toolkit** for the services of your dossier network: a password checker, a salted password database with login, a role-based access check, a Vigenère cipher and an HMAC integrity check, and write the security design for the network's services. This adds the security page to your **Computer Network Explorer** dossier.

### Requirements

- **Password strength.** Write `entropy_bits(password)` (random characters: length × log2 of the pool of lowercase 26, uppercase 26, digits 10 and symbols 32; for a passphrase with spaces: number of words × log2(7776)) and `rate(password)` that returns `COMMON` for the passwords `password`, `12345678`, `qwerty`, `letmein`, `admin` and `welcome`, and otherwise `weak` (below 40 bits), `ok` (below 60) or `strong`. Rate: `password`, `12345678`, `Lumexa2025`, `blue tiger jumps high` and `T7#kq!9Lp@x2`.
- **Password database.** For the users ana, ben and cara with the salts `s9a7`, `k2d5` and `p0z8` and the passwords `Lumexa2025`, `Lumexa2025` and `T7#kq!9Lp@x2`, store PBKDF2-SHA256 hashes (10,000 iterations) and print the first 16 hexadecimal digits of each. Show that ana and ben have different hashes although they chose the same password. Write `login(user, password)` that compares the hashes with `hmac.compare_digest` and test four attempts, including a wrong password and an unknown user.
- **Access control.** Define the roles student (read courses), teacher (also write grades) and admin (also configure the server), assign ana, ben and cara to them and print a table of the three permissions for each user.
- **Vigenère cipher.** Write `vigenere(text, key, direction)` and show that `ATTACKATDAWN` with the key `LEMON` becomes `LXFOPVEFRNHR` and decrypts back.
- **HMAC.** Compute an HMAC-SHA256 tag for the message `set firewall=on` with a shared key and show that the original is authentic and the changed message `set firewall=off` is detected as tampered.
- In the dossier, write the security design in five lines: how each service of the network stores passwords, who gets which role and how admin commands are protected.

### Instructions

1. Write `entropy_bits` and `rate`, and print the five ratings.
2. Write `hash_password` with `hashlib.pbkdf2_hmac` and build the database with a dictionary comprehension.
3. Print the database and the comparison of ana's and ben's hashes, then write and test `login`.
4. Write the roles and `allowed`, and print the permission table.
5. Write `vigenere` and test it on the classic example.
6. Compute and verify the HMAC tags.
7. Compare with the expected output and write the five-line design.

### Expected Output

```text
1. Password strength
   password                37.6 bits  COMMON: it is in every attacker's list
   12345678                26.6 bits  COMMON: it is in every attacker's list
   Lumexa2025              59.5 bits  ok
   blue tiger jumps high   51.7 bits  ok
   T7#kq!9Lp@x2            78.7 bits  strong

2. The user database stores salts and hashes, never passwords
   ana   salt s9a7  hash 456d3b8cccc9f819...
   ben   salt k2d5  hash add5370a8a7abc0c...
   cara  salt p0z8  hash e42837e6be9e92f6...
   ana and ben chose the same password, and their hashes are different
   login ana   right password        -> granted
   login ana   wrong capital letter  -> denied
   login cara  right password        -> granted
   login dev   no such user          -> denied

3. Access control (least privilege)
   user  role     courses.read  grades.write  server.configure
   ana   student  yes           no            no
   ben   teacher  yes           yes           no
   cara  admin    yes           yes           yes

4. Vigenere cipher with the key LEMON
   encrypted: LXFOPVEFRNHR | decrypted: ATTACKATDAWN

5. Integrity with an HMAC
   message 'set firewall=on' has the tag a9608f322a785d3d...
   received 'set firewall=on': authentic
   received 'set firewall=off': TAMPERED
```

### Hints

1. **Hint 1 (the pool).** Add 26 if the password contains a lowercase letter, 26 for an uppercase letter, 10 for a digit and 32 for a symbol (`string.punctuation`).
2. **Hint 2 (the entropy).** `len(password) * math.log2(pool)`; for a passphrase, `len(password.split()) * math.log2(7776)`.
3. **Hint 3 (the hash).** `hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 10_000).hex()`; the salt is a `bytes` value such as `b"s9a7"`.
4. **Hint 4 (the login).** An unknown user must be denied without an error: test `user in DATABASE` first.
5. **Hint 5 (Vigenère).** The shift of each letter is the alphabet position of the next key letter; advance the key position only on letters.
6. **Hint 6 (the HMAC).** `hmac.new(KEY, message, hashlib.sha256).hexdigest()`; compare tags with `hmac.compare_digest`.

### Success Criteria

- [ ] `password` and `12345678` are rated COMMON, `Lumexa2025` and the passphrase `ok`, and `T7#kq!9Lp@x2` `strong`.
- [ ] The database stores only salts and hashes, and ana's and ben's hashes are different.
- [ ] The logins give granted, denied, granted and denied as expected.
- [ ] The permission table shows that only the admin can configure the server.
- [ ] The Vigenère cipher gives `LXFOPVEFRNHR` and decrypts to `ATTACKATDAWN`.
- [ ] The HMAC accepts the original message and detects the tampered one.
- [ ] The dossier has a five-line security design.

### Extension Challenge

Write a function `crack(stored_hash, salt, wordlist)` that tries every word of a small list of common passwords against a salted hash, and show how many tries it needs for `ana`; then repeat with 100,000 PBKDF2 iterations and compare the time. Next, add a rate limiter to `login` that locks an account for 3 attempts, and explain what attack it stops. Finally, add `MFA` to the login: a six-digit code that is computed from the user name and the current minute with an HMAC (the idea behind authenticator apps).

## Lesson Recap

- Security protects **confidentiality, integrity and availability**, using **defence in depth** and **least privilege**.
- **Authentication** proves who you are; services store **salted, slow hashes** of passwords, never the passwords; length and randomness give a password its **entropy**.
- **Authorisation** decides what you may do; **RBAC** assigns permissions to roles.
- **Hashes** fingerprint data, **symmetric encryption** (one key) protects bulk data, **public-key cryptography** (key pair) shares secrets and signs; an **HMAC** proves integrity and origin; never invent your own cryptography.

## Homework / Extension Mission

Make a list of your five most important online accounts and note, for each, whether you use a unique password and whether MFA is switched on. Write down a plan to fix the weakest one (a password manager, a passphrase, MFA). Then explain in a short paragraph, for a classmate, why a website should store a hash of your password instead of the password, and why it needs a salt. Finally, use Example 3 to encrypt the word `OK` with the primes 61 and 53 and decrypt it again, writing down each number.

## Course Project Connection

This lesson adds the **security page** to the **Computer Network Explorer**, the course project: every service on the dossier network now has a way to authenticate its users, a safe way to store their passwords, roles for access control, and cryptography to protect and verify its messages. In Lesson 8 you finish the dossier with a threat model, firewall rules and a troubleshooting flowchart, and the final report.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: what we protect and from whom (the CIA triad with school examples); 10 minutes: passwords, hashing and salting (show two equal passwords with different salts); 10 minutes: authorisation and roles; 10 minutes: the three families of cryptography, with the Caesar break on the board; 20 minutes: the project.

**Live demonstrations.** Compute a SHA-256 hash of a sentence, then of the same sentence with one changed letter. Break a student's Caesar message by trying the shifts and by frequency. Show the certificate of a website. Emphasise legal and ethical limits: only practise on your own data and systems.

**Misconceptions.** "Hashing is encryption." "A clever password with symbols is strong." "Logging in means you may do anything." "A secret algorithm is more secure." "HTTPS means the site is honest."

**Assessment of the project.** Check the five ratings, the different hashes for equal passwords, the four login results, the permission table, the Vigenère result and the HMAC verification. Ask students why `compare_digest` is used and why a slow hash is chosen.

**Reference solution `secure_it.py`** (run with `python3 secure_it.py`):

```python
"""Secure It: password strength, salted hashes, access control, a Vigenere cipher and an HMAC."""
import hashlib
import hmac
import math
import string

COMMON = {"password", "12345678", "qwerty", "letmein", "admin", "welcome"}


def entropy_bits(password):
    """Strength estimate: a passphrase counts random words from a 7,776-word list; otherwise length x log2(pool)."""
    if " " in password:
        return len(password.split()) * math.log2(7776)
    pool = 0
    pool += 26 if any(c in string.ascii_lowercase for c in password) else 0
    pool += 26 if any(c in string.ascii_uppercase for c in password) else 0
    pool += 10 if any(c in string.digits for c in password) else 0
    pool += 32 if any(c in string.punctuation for c in password) else 0
    return len(password) * math.log2(pool)


def rate(password):
    bits = entropy_bits(password)
    if password.lower() in COMMON:
        return bits, "COMMON: it is in every attacker's list"
    return bits, "weak" if bits < 40 else "ok" if bits < 60 else "strong"


print("1. Password strength")
for password in ("password", "12345678", "Lumexa2025", "blue tiger jumps high", "T7#kq!9Lp@x2"):
    bits, label = rate(password)
    print(f"   {password:<22} {bits:>5.1f} bits  {label}")

SALTS = {"ana": b"s9a7", "ben": b"k2d5", "cara": b"p0z8"}
PASSWORDS = {"ana": "Lumexa2025", "ben": "Lumexa2025", "cara": "T7#kq!9Lp@x2"}


def hash_password(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 10_000).hex()


DATABASE = {user: hash_password(PASSWORDS[user], SALTS[user]) for user in SALTS}
print("\n2. The user database stores salts and hashes, never passwords")
for user, stored in DATABASE.items():
    print(f"   {user:<5} salt {SALTS[user].decode()}  hash {stored[:16]}...")
print("   ana and ben chose the same password, and their hashes are", "the same" if DATABASE["ana"] == DATABASE["ben"] else "different")


def login(user, password):
    return user in DATABASE and hmac.compare_digest(hash_password(password, SALTS[user]), DATABASE[user])


for user, password, note in (("ana", "Lumexa2025", "right password"), ("ana", "lumexa2025", "wrong capital letter"),
                             ("cara", "T7#kq!9Lp@x2", "right password"), ("dev", "anything", "no such user")):
    print(f"   login {user:<5} {note:<21} -> {'granted' if login(user, password) else 'denied'}")

ROLES = {
    "student": {"courses.read"},
    "teacher": {"courses.read", "grades.write"},
    "admin": {"courses.read", "grades.write", "server.configure"},
}
USER_ROLE = {"ana": "student", "ben": "teacher", "cara": "admin"}


def allowed(user, permission):
    return permission in ROLES[USER_ROLE[user]]


print("\n3. Access control (least privilege)")
print("   user  role     courses.read  grades.write  server.configure")
for user in USER_ROLE:
    cells = ["yes" if allowed(user, p) else "no" for p in ("courses.read", "grades.write", "server.configure")]
    print(f"   {user:<5} {USER_ROLE[user]:<8} {cells[0]:<14}{cells[1]:<14}{cells[2]}")


def vigenere(text, key, direction=1):
    out, k = [], 0
    for ch in text.upper():
        if ch in string.ascii_uppercase:
            shift = string.ascii_uppercase.index(key[k % len(key)])
            out.append(string.ascii_uppercase[(string.ascii_uppercase.index(ch) + direction * shift) % 26])
            k += 1
        else:
            out.append(ch)
    return "".join(out)


secret = vigenere("ATTACKATDAWN", "LEMON")
print("\n4. Vigenere cipher with the key LEMON")
print("   encrypted:", secret, "| decrypted:", vigenere(secret, "LEMON", -1))

KEY = b"shared-secret-key"
message = b"set firewall=on"
tag = hmac.new(KEY, message, hashlib.sha256).hexdigest()
print("\n5. Integrity with an HMAC")
print(f"   message {message.decode()!r} has the tag {tag[:16]}...")
for received in (b"set firewall=on", b"set firewall=off"):
    ok = hmac.compare_digest(hmac.new(KEY, received, hashlib.sha256).hexdigest(), tag)
    print(f"   received {received.decode()!r}: {'authentic' if ok else 'TAMPERED'}")
```

```output
1. Password strength
   password                37.6 bits  COMMON: it is in every attacker's list
   12345678                26.6 bits  COMMON: it is in every attacker's list
   Lumexa2025              59.5 bits  ok
   blue tiger jumps high   51.7 bits  ok
   T7#kq!9Lp@x2            78.7 bits  strong

2. The user database stores salts and hashes, never passwords
   ana   salt s9a7  hash 456d3b8cccc9f819...
   ben   salt k2d5  hash add5370a8a7abc0c...
   cara  salt p0z8  hash e42837e6be9e92f6...
   ana and ben chose the same password, and their hashes are different
   login ana   right password        -> granted
   login ana   wrong capital letter  -> denied
   login cara  right password        -> granted
   login dev   no such user          -> denied

3. Access control (least privilege)
   user  role     courses.read  grades.write  server.configure
   ana   student  yes           no            no
   ben   teacher  yes           yes           no
   cara  admin    yes           yes           yes

4. Vigenere cipher with the key LEMON
   encrypted: LXFOPVEFRNHR | decrypted: ATTACKATDAWN

5. Integrity with an HMAC
   message 'set firewall=on' has the tag a9608f322a785d3d...
   received 'set firewall=on': authentic
   received 'set firewall=off': TAMPERED
```

**Differentiation.** Support: provide `hash_password`, the roles dictionary and the Vigenère function and ask students to write the strength checker, the login and the tests. Stretch: the dictionary attack with a timing comparison, the rate limiter and the one-time-code MFA.

**Discussion questions (not for the student quiz).** Why is it a bad idea for a website to be able to *e-mail you your old password*? What does a password manager change about the strength of the passwords you can use? Why does the security of RSA depend on a mathematical problem that nobody has proved to be hard?
