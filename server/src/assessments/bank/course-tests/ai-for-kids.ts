// FILE PATH: server/src/assessments/bank/course-tests/ai-for-kids.ts
//
// Little Coders Path → "AI for Kids: Smart Projects" (8 lessons, 3 projects: AI
// Rock-Paper-Scissors, Voice-Activated Story, Emotion Pet).
// Topics: 1 what AI is · 2 training an image model · 3 connecting a model to
// Scratch · 4 Rock-Paper-Scissors & "stand-ins" · 5 sound recognition ·
// 6 a branching voice story · 7 expression recognition & the virtual pet ·
// 8 showcase and the AI pipeline.
//
// Learners are young: keep the wording simple. Questions are about the ideas
// (examples, training, models, honesty about stand-ins), never about which
// website to open or which buttons to click.

import { ModuleExtras, bank, mcq, snippet, tf } from '../bank.helpers';

export const aiForKids = bank({
  id: 'course-test/ai-for-kids',
  title: 'AI for Kids: Smart Projects — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · What is AI? ──────────────────────────────────────────────
    mcq(
      1,
      'How is AI different from the exact-rules coding you did in Scratch and Python?',
      'AI teaches the computer with lots of examples instead of exact rules',
      [
        'AI does not use computers at all',
        'AI only works when you type very fast',
        'AI uses the same exact rules, but with more colours',
      ],
      'In coding you wrote rules like "if you touch the edge, bounce". With AI, the computer finds the pattern for itself by studying examples.',
    ),
    mcq(
      1,
      'Which list shows the five steps of AI in the right order?',
      'Examples → Training → Model → Prediction → Action',
      [
        'Training → Examples → Prediction → Model → Action',
        'Model → Examples → Action → Training → Prediction',
        'Action → Prediction → Model → Training → Examples',
      ],
      'First the AI gets examples, then it trains, then it has a model, then it makes a prediction, and finally something happens (the action).',
    ),
    mcq(
      1,
      'In AI, what is a "model"?',
      'The "pattern brain" the computer builds after training',
      ['A toy robot', 'A picture card in the sorting game', 'A Scratch sprite'],
      'Training builds the model, and the model is what makes predictions about new things.',
    ),
    mcq(
      1,
      'In AI, what is a "prediction"?',
      "The computer's smart guess about something new",
      [
        'A rule written by the coder',
        'A copy of the training pictures',
        'A sound effect',
      ],
      'Guessing a brand-new card with the pattern you found is just like a computer making a prediction.',
    ),

    // ── Lesson 2 · Training an image model ──────────────────────────────────
    mcq(
      2,
      'What does "confidence" tell you about an AI model?',
      'How sure the model is about its guess, shown as a percentage',
      [
        'How fast the computer is',
        'How many pictures it has seen in total',
        'How loud the sound is',
      ],
      'A high confidence means the model is very sure — but it can still be wrong.',
    ),
    mcq(
      2,
      'In an image model, what is a "class"?',
      'One of the categories the model is learning to tell apart, like Thumbs Up',
      ['A group of students', 'A kind of Scratch block', 'The webcam'],
      'You name each class and give it lots of examples.',
    ),
    mcq(
      2,
      'Your model keeps getting confused. What is a good way to help it?',
      'Give it more examples from different angles and distances',
      [
        'Show it only one picture, over and over',
        'Turn the lights off',
        'Rename the classes without changing the pictures',
      ],
      'More varied examples help the model spot the pattern in different situations.',
    ),
    mcq(
      2,
      'Your model always guesses wrong. The two classes look very similar, and one set of pictures was taken in different lighting. What is a good fix?',
      'Record both classes in the same lighting, and choose two gestures that look clearly different',
      [
        'Use fewer pictures',
        'Add rules for the model to follow',
        'Train it only on the better class',
      ],
      'If the lighting differs between the classes, the model may learn the lighting instead of the gesture.',
    ),

    // ── Lesson 3 · Connecting AI to Scratch ─────────────────────────────────
    mcq(
      3,
      'What is a "custom block" in the Scratch editor that you open from your ML4Kids project?',
      'A special block made just for your trained model',
      [
        'A block that deletes your project',
        'A block that only plays music',
        'A block for drawing the Stage',
      ],
      'It lets your Scratch code ask your trained model what it sees.',
    ),
    mcq(
      3,
      'In ML4Kids, what is a "bucket" or "label"?',
      'One category of examples, like Happy',
      [
        'A place to save your Scratch project',
        'A kind of sprite',
        'A Scratch loop',
      ],
      'Each label holds the examples for one thing the model should recognise.',
    ),
    mcq(
      3,
      `Look at this script:\n\n${snippet(
        'text',
        `when green flag clicked
forever
  if <(recognise image) = [Happy]> then
    say [You look happy!]
  else
    say [Show me a happy face!]`,
      )}\n\nThe model is shown a sad face. What does the sprite say?`,
      'Show me a happy face!',
      ['You look happy!', 'Nothing at all', 'Both messages at the same time'],
      'The model does not say "Happy", so the condition is false and the "else" branch runs.',
    ),
    mcq(
      3,
      'The special AI block does not appear in your Scratch project. What is the most likely reason?',
      'Scratch was not opened through the "Make" button of the ML4Kids project',
      [
        'The Stage is too small',
        'The green flag has not been clicked',
        'The sprite has the wrong costume',
      ],
      'The AI block only appears in the special Scratch editor that opens from your ML4Kids project, not in an ordinary Scratch project.',
    ),

    // ── Lesson 4 · Rock-Paper-Scissors ──────────────────────────────────────
    mcq(
      4,
      'How does the computer choose its move in the Rock-Paper-Scissors game?',
      'It picks at random',
      [
        'It always copies the player',
        'It always picks Rock',
        "It reads the player's mind",
      ],
      'A random pick keeps the game fair and unpredictable.',
    ),
    mcq(
      4,
      'What does the referee sprite do in the game?',
      'It decides who wins and updates the Score',
      [
        'It draws the Stage',
        'It plays the background music',
        "It chooses the computer's move",
      ],
      'The referee compares the two moves with an if/else chain.',
    ),
    mcq(
      4,
      'In this course, what is a "stand-in"?',
      'Something simple used for now, instead of the real, final thing',
      [
        'A sprite that stands still',
        'A very strong AI model',
        'A mistake in the code',
      ],
      'A key press can stand in for a real hand gesture until a trained AI block replaces it.',
    ),
    mcq(
      4,
      'In the Rock-Paper-Scissors game, pressing the keys 1, 2 and 3 stands in for what?',
      'A real hand gesture that a trained AI could recognise',
      ["The computer's random choice", 'The Score', 'A sound the AI hears'],
      'The honest truth: this game does not use your webcam yet. Later you can train a real model and swap it in.',
    ),

    // ── Lesson 5 · Sound recognition ────────────────────────────────────────
    mcq(
      5,
      'What does a sound AI study when it learns to tell words apart?',
      'The sound wave — the up-and-down pattern of a sound over time',
      [
        'The colour of your voice',
        'The letters you type',
        'The brightness of the room',
      ],
      'Different words make different sound-wave patterns, and the AI looks for them.',
    ),
    mcq(
      5,
      'Why add a "background noise" label when training a sound model?',
      'So the AI can tell the difference between nothing being said and a word',
      [
        'To make the model louder',
        'To delete the other labels',
        'To make the examples shorter',
      ],
      'Without background examples, the model might guess "go" or "stop" even when nobody is talking.',
    ),
    mcq(
      5,
      'The sound AI keeps mixing up your two words. What should you check?',
      'Whether there is background noise or too few examples',
      [
        'Whether your screen is bright enough',
        'Whether the Stage is the right size',
        'Whether the sprite has a name',
      ],
      'Noise and too few examples are the two most common causes.',
    ),
    mcq(
      5,
      'How should you speak when you record examples for a sound AI?',
      'Clearly, at a normal volume',
      [
        'Very quietly, in a whisper',
        'As fast as you can',
        'While other people talk',
      ],
      'Mumbling or whispering confuses the model.',
    ),

    // ── Lesson 6 · A voice-activated story ──────────────────────────────────
    mcq(
      6,
      'What is a "branching story"?',
      "A story where the reader's choices lead to different paths and endings",
      [
        'A story with only one ending',
        'A story about trees',
        'A story with no sprites',
      ],
      'At a choice point, the story can go one way or another.',
    ),
    mcq(
      6,
      'In a story project, what is a "scene"?',
      'One part of the story, often with its own backdrop and dialogue',
      ['A kind of sound block', 'The red stop sign', 'The Score variable'],
      'A story is made of scenes, such as the beginning, the middle and the end.',
    ),
    mcq(
      6,
      'What moves the story from one scene to the next in this project?',
      'Broadcasts',
      [
        'The Score going up',
        'The Stage changing colour',
        'A loop that never stops',
      ],
      'A broadcast like "scene 2" tells the whole project to turn the page.',
    ),
    mcq(
      6,
      'In the voice story project, what stands in for spoken voice commands?',
      'Number keys or clicks',
      ['A real trained voice model', 'The webcam', 'The background music'],
      'Later, you can follow the AI training guide to swap in a real voice model.',
    ),

    // ── Lesson 7 · Expression recognition and the virtual pet ───────────────
    mcq(
      7,
      'In the virtual pet lesson, what is a "mood class"?',
      'One category of facial expression the model could learn, like happy, sad or surprised',
      ['A group of pets', 'A kind of costume', 'The name of a sprite'],
      'A real expression model could learn one class for each mood.',
    ),
    mcq(
      7,
      "What does the pet's Happiness meter do?",
      "It is a number (variable) that goes up or down to keep track of the pet's mood",
      [
        "It draws the pet's face",
        "It chooses the pet's name",
        "It plays the pet's sounds",
      ],
      'A meter or variable is a number that tracks something, like Happiness.',
    ),
    mcq(
      7,
      'In the virtual pet project, the keys H, S and W are…',
      'Stand-ins for real facial expressions that a trained model could recognise',
      [
        'The only way a pet can be happy',
        'Part of a trained AI model',
        'Passwords for the project',
      ],
      'Right now keys stand in for real faces. A trained model could one day send the same signal.',
    ),
    mcq(
      7,
      "The pet's Happiness starts at 50. Pressing H adds 10 and pressing S subtracts 10. You press H, H, S. What is Happiness now?",
      '60',
      ['50', '70', '40'],
      '50 + 10 + 10 − 10 = 60.',
    ),

    // ── Lesson 8 · Showcase day ─────────────────────────────────────────────
    mcq(
      8,
      'In a 3-point presentation plan, what do you explain for "what stands in for AI right now"?',
      'Which key press or click is used instead of the real AI',
      [
        'Which computer you used',
        'Who your teacher is',
        'How long you practised',
      ],
      'Being honest about stand-ins is an important part of explaining AI projects.',
    ),
    mcq(
      8,
      'Why should you practise your 1-minute presentation with a partner first?',
      'To make it clear, and to check that it fits in about a minute',
      [
        'To make the AI model train faster',
        'So you can skip the demo',
        'Because partners write the code for you',
      ],
      'Practising helps you explain your idea clearly and confidently.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'A computer learns to tell cats from dogs by being given a rule book.',
      false,
      'AI learns from lots of examples, the way you learned to know a cat from a dog by seeing many of them.',
    ),
    tf(
      2,
      'When you train the image model, you type the rules that tell it what a thumbs up looks like.',
      false,
      'You show it examples. The model finds the pattern itself.',
    ),
    tf(
      3,
      "The AI's guess can send a broadcast, just like a Scratch sprite can.",
      true,
      'That is how a model can make other sprites react.',
    ),
    tf(
      4,
      'The Rock-Paper-Scissors game in this lesson already uses your webcam to recognise hand gestures.',
      false,
      'It uses number keys as a stand-in for now.',
    ),
    tf(
      5,
      'Whispering or mumbling makes it easier for a sound AI to learn your words.',
      false,
      'Clear speech at a normal volume gives the model clean examples.',
    ),
    tf(
      6,
      'Broadcast names must be spelled exactly the same everywhere they are used.',
      true,
      'A message with a different spelling is a different message, so nothing would react.',
    ),
    tf(
      7,
      'A real trained model could one day send the same signal that the key presses send in the pet project.',
      true,
      "Only the source of the signal changes; the pet's code can stay almost the same.",
    ),
    tf(
      8,
      'The order of steps AI follows is Examples → Training → Model → Prediction → Action.',
      true,
      'This order is called the AI pipeline.',
    ),
    tf(
      8,
      'It is honest to tell your audience that a key press is a stand-in for the real AI.',
      true,
      'Explaining what is real and what is a stand-in shows that you understand your project.',
    ),
    tf(
      8,
      'In a showcase, you should hide which parts of your project are stand-ins.',
      false,
      'Being honest about stand-ins is part of a great presentation.',
    ),
  ],
});

// Position 3 of the Little Coders Final Test (AI for Kids is not part of the
// Odyssey, so it has no stage or Odyssey share).
export const aiForKidsExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'Which of these is an example of a computer learning from examples, not from exact rules?',
        'A program that learns to sort cat and dog pictures after seeing many of them',
        [
          'A sprite that bounces whenever it touches the edge',
          'A program that always says "Hello" when the green flag is clicked',
          'A sprite that moves 10 steps when the space key is pressed',
        ],
        'The other three follow exact rules the coder wrote.',
      ),
      mcq(
        2,
        'You train an image model using pictures taken from only one angle. What may happen?',
        'It may get confused by pictures taken from other angles',
        [
          'It will recognise everything perfectly',
          'It will stop using the webcam',
          'It will write its own rules',
        ],
        'Examples from different angles and distances teach the model to cope with real life.',
      ),
      mcq(
        3,
        'Which block in the special Scratch editor asks your trained model what it sees?',
        'The custom "recognise image" block',
        [
          'The "next costume" block',
          'The "turn right" block',
          'The "play sound" block',
        ],
        'That block is made just for your trained model.',
      ),
      mcq(
        4,
        "The referee sprite compares the computer's move with the player's choice. Which Scratch idea does it use?",
        'An if/else chain',
        ['A forever loop with no conditions', 'A backdrop', 'A costume'],
        'The chain decides Rock vs Paper vs Scissors, and then who wins.',
      ),
      mcq(
        5,
        'Why does mumbling confuse a sound AI?',
        'The sound waves become unclear, so the examples do not show a clean pattern',
        [
          'Mumbling makes the computer slower',
          'Mumbling turns off the microphone',
          'Mumbling changes the label names',
        ],
        'The AI studies the pattern of the sound wave, so a clear sound gives a clear pattern.',
      ),
      mcq(
        6,
        'What is a "choice point" in the voice story?',
        'A moment where the reader presses a number key or clicks to decide what happens next',
        [
          'The first scene of the story',
          'The place where the Score is shown',
          'A sound the sprite makes',
        ],
        'Choices are what make a story branch into different paths.',
      ),
      mcq(
        7,
        "Why could a real trained model replace the keys in the pet project without changing much of the pet's code?",
        'It could send the same signal that the key presses send',
        [
          'It would rewrite the code itself',
          'It would delete the Happiness meter',
          'It would make the keys louder',
        ],
        'The pet only needs to know which mood was detected, not how it was detected.',
      ),
      mcq(
        8,
        'What are the three points of the presentation plan?',
        'What it does, what stands in for AI right now, and the AI idea',
        [
          'Who made it, how long it took, and how many sprites it has',
          'The Score, the sound and the backdrop',
          'The rules, the prizes and the winners',
        ],
        'Demo the project, be honest about what is a stand-in, and explain Examples → Training → Model → Prediction → Action using your own project.',
      ),
    ],
    trueFalse: [
      tf(
        1,
        'Training means showing the computer lots of examples so it can find patterns.',
        true,
        'Training is how the model is built from the examples.',
      ),
    ],
  },
};
