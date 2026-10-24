// FILE PATH: server/src/assessments/bank/course-tests/language-models.ts
//
// AI Builder Path → "Language Models and Chatbots" (8 lessons, 3 projects:
// Recipe Chatbot, Study Assistant, Creative Story Generator).
// Topics: 1 how LLMs work · 2 chat API calls & key safety · 3 prompt
// engineering · 4 conversational memory · 5 persona, purpose & guardrails ·
// 6 grounding & RAG · 7 Streamlit chat UI · 8 sharing a deployed app safely.

import { ModuleExtras, bank, codeOut, mcq, snippet, tf } from '../bank.helpers';

export const languageModels = bank({
  id: 'course-test/language-models',
  title: 'Language Models and Chatbots — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · How language models work ─────────────────────────────────
    mcq(
      1,
      'What is the core job a Large Language Model is trained to do?',
      'Predict the next token, given everything that came before it',
      [
        'Search the internet for the best matching web page',
        'Check each sentence it reads against a list of true facts',
        'Memorize and replay the documents in its training set',
      ],
      'Everything an LLM does — answering, summarizing, writing code — comes from predicting the next token over and over, like a very powerful autocomplete.',
    ),
    mcq(
      1,
      'Using the rule of thumb that 1 token is about ¾ of an English word, roughly how many tokens is a 300-word passage?',
      'About 400',
      ['About 225', 'About 300', 'About 1,200'],
      '300 words ÷ 0.75 ≈ 400 tokens. (Multiplying by ¾ instead, to get 225, is the common slip: a token is smaller than a word, so there are more tokens than words.)',
    ),
    mcq(
      1,
      'What is a model\'s "context window"?',
      'The maximum number of tokens it can consider at one time, input and output combined',
      [
        'The list of websites it was trained on',
        'The date after which it has no information',
        'The part of an app where the user types',
      ],
      'If a conversation grows longer than the context window, the oldest tokens fall out of view. (The date after which a model knows nothing is its knowledge cutoff.)',
    ),
    mcq(
      1,
      'A user asks a base model for the final score of a match played after its training data ended. What is the most likely problem?',
      'A hallucination: a fluent but made-up score, because of the knowledge cutoff',
      [
        'Overfitting: the model has memorized the score of an older match',
        'A tokenizer error: the score is split into too many tokens',
        'The context window is full of earlier answers',
      ],
      'A model can only generate from patterns in its training data. When it lacks the facts it may still produce a confident, plausible-sounding answer.',
    ),

    // ── Lesson 2 · The chat API ─────────────────────────────────────────────
    mcq(
      2,
      "Which message role holds the instructions that set the assistant's persona and rules for the whole conversation?",
      'The system role',
      [
        'The user role',
        'The assistant role',
        'None — a persona can only be set with the temperature',
      ],
      "The system message defines persistent behaviour. The user role is the human's input and the assistant role is the model's own earlier replies.",
    ),
    mcq(
      2,
      'What happens when you raise `temperature` from 0.2 to 1.0?',
      'The output becomes more random and creative',
      [
        'The model responds faster',
        'The model remembers more of the conversation',
        'Each token costs less',
      ],
      'Temperature controls randomness. Low values keep answers focused and repeatable; high values give more varied and creative text.',
    ),
    mcq(
      2,
      'A student prints the whole `response` object and gets a long, messy result. Which expression gives just the reply text?',
      '`response.choices[0].message.content`',
      ['`response.text`', '`response.message`', '`response.choices.content`'],
      'The reply sits inside the first choice: response.choices[0], then .message, then .content.',
    ),
    mcq(
      2,
      'Why must an API key never be written directly into your source code?',
      'Anyone who sees the code can use your account and spend your credits',
      [
        'Python refuses to run code that contains a string beginning with "sk-"',
        'A key written in code stops working after its first request',
        'It makes every request slower',
      ],
      'A key is like a password. Code gets committed, shared and screen-shared, so secrets belong outside it — in a .env file that stays out of version control.',
    ),

    // ── Lesson 3 · Prompt engineering ───────────────────────────────────────
    mcq(
      3,
      'Which prompt is likely to give the best answer?',
      "Explain three surprising facts about Mars's atmosphere to a 13-year-old, in under 150 words, in an excited tone.",
      [
        'Tell me about Mars.',
        'Mars facts please, make it good.',
        'Write everything you know about space.',
      ],
      'The strong prompt names the audience, the content, the length and the tone, which removes ambiguity and steers the model.',
    ),
    mcq(
      3,
      'What is few-shot prompting?',
      'Putting worked examples in the prompt to show the desired format or behaviour',
      [
        'Asking the same question several times and keeping the best answer',
        'Training the model on a few new examples before every chat',
        'Giving the model no examples at all',
      ],
      "Showing is often clearer than telling. Giving no examples is zero-shot prompting, and the model's parameters never change in either case.",
    ),
    mcq(
      3,
      'Where should persistent persona instructions go, and why?',
      'In the system message, so they hold across every user message',
      [
        'In every user message, because the system message is ignored',
        'In the assistant message, because the assistant writes its own rules',
        'Nowhere — the model works out the persona by itself',
      ],
      'Cramming persona rules into each user message wastes tokens and makes behaviour inconsistent. The system prompt is for behaviour that should persist.',
    ),
    mcq(
      3,
      'A prompt tells the model to "be brief" and also to "explain in exhaustive detail". What is the problem?',
      'The instructions contradict each other, so the output is unpredictable',
      [
        'A prompt may only contain a single instruction',
        'The model cannot understand adjectives',
        'Nothing — contradictions make answers longer and better',
      ],
      'Contradictory instructions leave the model guessing which one wins. State one clear requirement for each aspect.',
    ),

    // ── Lesson 4 · Conversational memory ────────────────────────────────────
    mcq(
      4,
      'Why does a chatbot built on a chat API send the whole message history with every request?',
      'The API is stateless: it does not remember earlier requests by itself',
      [
        "The model's parameters are retrained on each request",
        'A longer history makes the replies faster',
        'The API refuses conversations shorter than three turns',
      ],
      'Memory is an illusion created by your app resending the growing list of messages. If you do not resend earlier messages, the model has genuinely forgotten them.',
    ),
    codeOut(
      4,
      'python',
      `history = [{"role": "system", "content": "You are Nova."}]
history.append({"role": "user", "content": "Hi"})
history.append({"role": "assistant", "content": "Hello!"})
history.append({"role": "user", "content": "What is my name?"})
print(len(history), history[-1]["role"])`,
      '4 user',
      ['3 user', '4 assistant', '4 system'],
      "The list holds the system message plus three turns, so len is 4, and the last message is the user's question.",
    ),
    mcq(
      4,
      "What goes wrong if the code forgets to append the assistant's own reply to the history?",
      'The model cannot see its previous answers, so multi-turn conversations stop making sense',
      [
        'The replies become shorter',
        "The user's messages are deleted",
        'The temperature resets to zero',
      ],
      "The history must include both sides of the conversation, otherwise the model only sees the user's side.",
    ),
    codeOut(
      4,
      'python',
      `history = [{"role": "system", "content": "Be brief."}]
for i in range(1, 6):
    history.append({"role": "user", "content": f"msg {i}"})
history = [history[0]] + history[-3:]
print(len(history), history[-1]["content"])`,
      '4 msg 5',
      ['6 msg 5', '3 msg 5', '4 msg 3'],
      'The loop builds the system message plus msg 1–5. The trim keeps the system message and the last three messages (msg 3, msg 4, msg 5): four items, ending with msg 5.',
      'This sliding-window trim keeps the system message and the most recent messages. What does it print?',
    ),

    // ── Lesson 5 · Persona, purpose and guardrails ──────────────────────────
    mcq(
      5,
      'Which pair correctly describes persona and purpose?',
      'Persona is how the assistant communicates; purpose is the job it is for',
      [
        'Persona is the job it is for; purpose is how it communicates',
        "Persona is the model's size; purpose is its temperature",
        'They mean the same thing',
      ],
      'A great assistant needs both: a consistent voice (persona) and a clearly defined job and domain (purpose).',
    ),
    mcq(
      5,
      'Which guardrail is written most effectively for a study-helper bot?',
      'Never write a full graded essay for a student; offer an outline and ask guiding questions instead.',
      [
        'Try not to write too many essays, if possible.',
        'Be nice and helpful.',
        'Do whatever the user asks first, then think about the rules.',
      ],
      'Guardrails should be explicit and firm, and say what to do instead. Soft wording such as "try not to" is easily talked around.',
    ),
    mcq(
      5,
      'A bot with a fun persona answers every unrelated question it is asked. Which part of its system prompt is missing?',
      'A clear purpose with boundaries that redirect off-topic questions',
      [
        'A higher temperature',
        'A longer conversation history',
        'A second persona',
      ],
      'Persona only controls the voice. The purpose and boundaries define what the bot should and should not help with.',
    ),

    // ── Lesson 6 · Grounding and RAG ────────────────────────────────────────
    mcq(
      6,
      'What does it mean to "ground" an LLM\'s answer?',
      'Give it the relevant reference information inside the prompt so the answer is based on those facts',
      [
        'Retrain the model on the new facts',
        'Lower its temperature to zero',
        'Switch off the system prompt',
      ],
      'Grounding supplies the facts with every request, which avoids expensive retraining and reduces hallucination.',
    ),
    mcq(
      6,
      'What are the three conceptual steps of Retrieval-Augmented Generation (RAG), in order?',
      'Retrieve → Augment → Generate',
      [
        'Generate → Retrieve → Augment',
        'Augment → Generate → Retrieve',
        'Retrieve → Generate → Augment',
      ],
      'First retrieve the relevant information, then augment the prompt with it, and only then generate the answer.',
    ),
    mcq(
      6,
      'For a factual, grounded Q&A bot, which temperature is the best choice?',
      'A low one, such as 0.2, to stay close to the source data',
      [
        'A high one, such as 1.5, so the answers are more creative',
        'Temperature has no effect on factual accuracy',
        'Exactly 0.7, which is required for grounding to work',
      ],
      'A high temperature increases the chance of creative deviation from the source data, which is the opposite of what a grounded bot needs.',
    ),
    mcq(
      6,
      'The grounded bot is asked about something its reference text does not cover. What should a well-designed prompt tell it to do?',
      'Say clearly that the information is not in the provided data',
      [
        'Fill the gap with its general knowledge',
        'Guess the most likely answer',
        'Repeat the question back to the user',
      ],
      'Testing unanswerable questions shows whether the bot handles gaps honestly instead of inventing something.',
    ),

    // ── Lesson 7 · Streamlit chat interface ─────────────────────────────────
    mcq(
      7,
      'What does Streamlit do when a user clicks a button or types into the chat box?',
      'It re-runs the whole script from top to bottom',
      [
        'It runs only the line connected to that button',
        'It restarts the web server and clears the session',
        'It does nothing until the page is refreshed',
      ],
      'The rerun model is the most important Streamlit idea: there is no event loop; the whole file reruns and the page is redrawn from the current state.',
    ),
    mcq(
      7,
      'Why is the conversation history stored in `st.session_state` instead of an ordinary variable?',
      "Ordinary variables are reset on every rerun, while session_state persists for the user's session",
      [
        'session_state is faster than a list',
        'Ordinary variables cannot hold dictionaries',
        'session_state sends the history to the model automatically',
      ],
      'Because the script reruns on every interaction, anything that must survive has to live in st.session_state.',
    ),
    mcq(
      7,
      `What is the purpose of the \`if\` guard in this code?\n\n${snippet(
        'python',
        `if "messages" not in st.session_state:
    st.session_state.messages = [{"role": "system", "content": "Be helpful."}]`,
      )}`,
      "It creates the history only on the first run, so later reruns don't wipe it",
      [
        'It stops the script when the history is missing',
        'It makes the history read-only',
        'It deletes old messages on every run',
      ],
      'Without the guard, the history would be reset to just the system prompt on every single rerun.',
    ),
    mcq(
      7,
      'Which Streamlit element shows a chat-style text box pinned to the bottom of the page?',
      '`st.chat_input`',
      ['`st.chat_message`', '`st.session_state`', '`st.rerun`'],
      'st.chat_input is the input box; st.chat_message draws a chat bubble for a role; st.session_state stores data; st.rerun forces a rerun.',
    ),

    // ── Lesson 8 · Deploying and sharing safely ─────────────────────────────
    mcq(
      8,
      'A deployed app needs an API key, but the `.env` file stays out of the repository. Where should the key be stored?',
      "In the hosting platform's secrets settings",
      [
        'Pasted into app.py',
        'In the public README',
        'In the shared .env.example file',
      ],
      'Platform secrets management stores sensitive values separately from your code, so the key is available to the app without being published.',
    ),
    mcq(
      8,
      'An API key was accidentally pushed to a public repository. What is the right first response?',
      'Revoke (rotate) the key at once and create a new one',
      [
        'Delete the file in a new commit, which removes the key from the history',
        'Wait to see whether anyone uses it',
        'Rename the repository',
      ],
      'A deleted file usually remains in the repository history. After any public exposure the safe assumption is that the key is compromised, so rotate it immediately.',
    ),
    mcq(
      8,
      'Why must `requirements.txt` list every package the app imports?',
      'The hosting platform reads it to know which packages the app needs; a missing one causes a ModuleNotFoundError',
      [
        'It makes the code run faster',
        'Python refuses to import any package that is not listed',
        "It stores the app's API key",
      ],
      'The app may work locally because a package happens to be present, then crash on deployment because the platform was never told about it.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'By default, a language model looks up current answers on the internet each time you chat with it.',
      false,
      'Base LLMs generate from patterns learned during training. They only search the web if they are explicitly given a search tool.',
    ),
    tf(
      2,
      'The `.env` file that holds your real API key should be committed to the repository so teammates can run the project.',
      false,
      'Only the template .env.example, with placeholder values, is shared. The real .env stays on your own machine and goes in .gitignore.',
    ),
    tf(
      3,
      'Because model output has some randomness, a prompt should be tested more than once before you trust it.',
      true,
      'One good or bad result is not proof, especially at a higher temperature.',
    ),
    tf(
      4,
      'With a chat API, conversational memory lives in the application code that resends the history, not inside the model.',
      true,
      'The model itself keeps nothing between requests; your app maintains the message list.',
    ),
    tf(
      5,
      'A firm guardrail such as "Never write a full graded essay" is more reliable than a soft one such as "try not to write essays".',
      true,
      'Explicit, firm rules survive longer conversations and boundary-pushing questions better than vague requests.',
    ),
    tf(
      6,
      'In a grounded Q&A script, the model opens your local data file itself when it needs the information.',
      false,
      'The model never touches your file. Your own Python code reads it and pastes the text into the prompt.',
    ),
    tf(
      7,
      'Streamlit re-runs the whole script from top to bottom whenever the user interacts with the page.',
      true,
      'That is why state has to be kept in st.session_state.',
    ),
    tf(
      7,
      'A plain Python list created at the top of a Streamlit script is a reliable place to keep chat history between interactions.',
      false,
      'The list is recreated on every rerun, so the history would silently reset after each exchange.',
    ),
    tf(
      8,
      'If a file containing a leaked key is deleted in a later commit, the key is gone from the repository history and no further action is needed.',
      false,
      'Earlier commits still contain the file. After any exposure, rotate the key.',
    ),
    tf(
      8,
      "A deployed app should read its API key from the hosting platform's secrets settings rather than from a file in the repository.",
      true,
      'Platform secrets management keeps credentials out of the code and out of version control.',
    ),
  ],
});

// Position 3 of the AI Builder Final Test (Language Models is not part of the
// Odyssey, so it has no stage or Odyssey share).
export const languageModelsExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'When you chat with a model through an API, which statement is correct?',
        "It is inference only — the model's parameters do not change because of your conversation",
        [
          'Every message you send retrains the model a little',
          'Inference is the step in which the model updates its parameters',
          'Training happens each time you press send',
        ],
        'Training adjusts the parameters using large datasets, once. Normal API use only runs the finished model (inference) on new input.',
      ),
      mcq(
        1,
        'What does the attention mechanism let a transformer do?',
        'Weigh how relevant every other token is when interpreting or generating a given token',
        [
          'Charge less for common tokens',
          'Remember previous chats permanently',
          'Skip tokens it does not understand',
        ],
        'Attention lets the model relate every part of a passage to every other part, instead of reading strictly word by word.',
      ),
      mcq(
        2,
        'What is the `.env.example` file for?',
        'A shared template showing which values the project needs, with placeholders instead of real secrets',
        [
          'It stores the real API key so the whole team can use it',
          'It lists the packages the app depends on',
          'It records the conversation history',
        ],
        'The real .env stays private. The .env.example is committed so other developers know exactly which settings to provide.',
      ),
      mcq(
        3,
        'What is chain-of-thought prompting?',
        'Asking the model to reason step by step before it gives its final answer',
        [
          'Linking several API keys together',
          'Sending the same prompt to many models at once',
          'Giving the model worked examples of the desired format',
        ],
        'Step-by-step reasoning often improves answers to multi-step problems. (Worked examples are few-shot prompting.)',
      ),
      mcq(
        4,
        'A sliding-window memory keeps only the most recent messages. What is its main risk?',
        'It can drop an important early fact, such as a stated allergy',
        [
          'It makes the conversation history grow without limit',
          'It resets the temperature on every turn',
          'It sends the system prompt twice',
        ],
        'Production systems often pin critical facts or summarize older turns instead of blindly dropping them.',
      ),
      mcq(
        5,
        'Why should a persona be tested with off-topic and boundary-pushing questions?',
        'A persona that only ever sees on-topic questions may break under pressure, and edge cases reveal weak guardrails',
        [
          'Off-topic questions make the model more accurate',
          'Boundary-pushing questions lower the cost per token',
          'It is the only way to set the temperature',
        ],
        'Testing only the easy path can leave you thinking the persona is solid when it is not.',
      ),
      mcq(
        6,
        'Why is it not enough to simply paste a huge document into every prompt?',
        'It may exceed the context window — large-scale systems need a retrieval step to pick only the relevant parts',
        [
          'Models refuse to read any document longer than a paragraph',
          "It permanently changes the model's parameters",
          'The document is automatically summarized for free',
        ],
        'This is the practical reason real RAG systems retrieve just the relevant passages before generating.',
      ),
      mcq(
        8,
        'Why should you test the live deployed app after deploying it?',
        'Problems that depend on the hosting setup, such as a missing secret, may not show up locally',
        [
          'Deployed apps always behave identically to local ones',
          'Testing the live app rotates the API key for you',
          'The platform tests the app on your behalf',
        ],
        'A working local run does not prove the deployment is configured correctly.',
      ),
    ],
    trueFalse: [
      tf(
        5,
        'Persona consistency means the assistant keeps its defined tone and behaviour across a long conversation.',
        true,
        'A persona that slips back to a generic voice after a few turns has not been defined firmly enough.',
      ),
    ],
  },
};
