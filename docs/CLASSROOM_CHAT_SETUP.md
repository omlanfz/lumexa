# Classroom chat history: Cloudflare R2 setup

How the classroom chat is saved, the one-time setup (a **separate** private R2 bucket,
its own API token, four Render variables), and how to test it. Nothing here touches the
class-recordings bucket (`lumexa-recordings`) or the homework bucket (`lumexa-homework`)
or their settings — see [CLASS_RECORDING_SETUP.md](CLASS_RECORDING_SETUP.md) and
[HOMEWORK_SUBMISSIONS_SETUP.md](HOMEWORK_SUBMISSIONS_SETUP.md).

## 1. How it works

Live delivery is unchanged: people in the class still send each other chat as Daily app
messages. In addition, every message is sent to **this server**, which keeps it in R2.
When someone opens the chat, the server returns what they are allowed to see, and the
chat opens at the latest message (older ones load with "Load earlier messages").

```
Browser ──live──► everyone in the room (Daily)
   └── POST /classroom/:room/chat ──► server checks who you are, the lock, the text
                                      ── PUT ──► chat/<conversation>/<YYYY-MM>/<author>.json
Open the chat: GET /classroom/:room/chat ──► server lists + reads the conversation,
                                              returns only what THIS person may see
Teacher: DELETE …/chat/messages/:author/:id   (one message)   DELETE …/chat   (clear all)
         the server deletes first; only then is the class told, so a failed delete is
         never shown as done
```

### Whose chat is it? (the rules)

| Class                    | The conversation is…                | Who sees it                                                                                           |
| ------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **1:1** (or a booking)   | this **teacher + this student**     | that teacher and student. A new curriculum with the same teacher keeps it; **a new teacher = empty**  |
| **Batch**                | this **batch + this teacher**       | the teacher, and the batch's **current** members. A new teacher for the batch = empty                 |
| Free trial               | not saved (the guest has no account)| live only, as before                                                                                  |

Batch details (decided on the server from `BatchMember`, never by the browser):

- A student who **leaves** the batch can no longer read or write its chat; everyone else still can.
- A student who **joins late** sees only what was said **after they joined**
  (`BatchMember.joinedAt`). The teacher and the original members see everything.
- Changing the batch's **curriculum** does not change the conversation (the batch and the
  teacher are the same). Changing the batch's **teacher** starts a new, empty one; the old
  one stays in R2, unreachable unless that teacher returns to the same batch.

Only the room's teacher can delete: one message (anyone's) or **Clear all chats**, which
removes the whole conversation for everyone in it. While the teacher has **locked the
chat**, a student's message is refused by the server too (not only hidden by browsers).

### What is stored

One small JSON file per **author per month**:

```
chat/one/<teacherUserId>/<studentUserId>/2026-11/<authorUserId>.json
chat/batch/<batchId>/<teacherUserId>/2026-11/<authorUserId>.json
```

Each person only ever writes their **own** file, so two people typing at the same moment
can never overwrite each other (R2 has no "append"). Reading a conversation lists its
folder and merges the files by time. Each message holds the id the browser chose, the text
(max 500 characters, line breaks kept), the server's time, and the sender's id, name and
role **as the server knows them** — the browser only supplies the text and an id.

If the bucket is not set up, or R2 is down, chat keeps working **live** exactly as before;
nothing is saved, and opening the chat shows an empty history (or "Couldn't load earlier
messages — Try again" when R2 errored).

## 2. One-time setup

1. **Create the bucket** — Cloudflare dashboard → **R2 Object Storage** → **Create bucket**.
   Name it `lumexa-chat` (any name except the recordings/homework buckets). Leave it
   **private** (no public access, no custom domain). No CORS policy is needed: browsers
   never talk to R2.
2. **Create an API token for that bucket only** — R2 → **Manage API tokens** → **Create API
   token** → permission **Object Read & Write** → **Specify bucket(s)** → `lumexa-chat`.
   Copy the **Access Key ID** and **Secret Access Key** (shown once).
3. **Set the variables** on the server (Render → the API service → Environment):

   | Variable                    | Value                                                                       |
   | --------------------------- | --------------------------------------------------------------------------- |
   | `CHAT_R2_BUCKET`            | `lumexa-chat`                                                               |
   | `CHAT_R2_ACCESS_KEY_ID`     | the token's Access Key ID                                                   |
   | `CHAT_R2_SECRET_ACCESS_KEY` | the token's Secret Access Key                                               |
   | `CHAT_R2_ACCOUNT_ID`        | your Cloudflare account id (optional if it equals `R2_ACCOUNT_ID`)          |
   | `CHAT_R2_ENDPOINT`          | optional: only for an EU-jurisdiction bucket or a local S3-compatible server |

4. **Redeploy** and check the log at start-up. You should see
   `Chat storage is ready: bucket "lumexa-chat" …`. If something is wrong it says what:
   `Classroom chat history (Cloudflare R2) is not available — missing CHAT_R2_BUCKET`, or
   `… is the recordings or homework bucket — chat needs a bucket of its own`, or
   `Chat storage check failed … HTTP 403` (wrong token or bucket).

No database migration is needed: nothing about chat is stored in Postgres.

> **Chat lock.** To enforce the lock on the server the API reads the room's shared state
> from Daily (`GET /rooms/:name/get-session-data`). If Daily cannot be asked, the message
> is accepted (a class is never blocked because Daily was slow), exactly as the join flow
> treats Daily. Browsers still drop a student's message while the chat is locked.

## 3. Testing it

- **Unit / HTTP specs** (no R2 or database needed — R2 is an in-memory bucket):

  ```bash
  cd server && npx jest src/classroom/chat src/classroom/daily-rooms
  cd client && npm test
  ```

- **By hand** (two browsers): as the teacher and the student of a 1:1 class, send a few
  messages, leave, and join the next class — the history is there and the chat opens at the
  bottom. Paste `https://example.com` — it is a link that opens in a new tab. Press
  **Shift+Enter** for a new line, **Enter** to send. As the teacher: hover a message → trash →
  **Delete?**; the eraser in the header → **Clear all chats**. In the bucket you will see
  `chat/one/…/<month>/<user>.json`.
- **Batch**: add a student to a running batch → their chat is empty while the others'
  history is intact; remove a student → they are refused; change the batch's teacher → empty.

## 4. Limits worth knowing

- One author's file holds up to 2,000 messages a month (a normal month is a few dozen);
  beyond that a message is shown live but not saved (and the log says so).
- History is fetched 100 messages at a time; a conversation can be any length.
- Nothing deletes old chats automatically. To remove a conversation for good, delete its
  folder in the bucket (or use **Clear all chats** as the teacher).
- Two servers writing the same author's file in the same instant could lose one of the two
  messages (R2 has no conditional "append"); within one server writes are serialised, and
  each file has a single author, so in practice this only concerns one person's own two
  devices sending at the very same moment.
