// FILE PATH: server/src/little-coders/curriculum/course3.ts
//
// COURSE 3 — AI FOR KIDS: SMART PROJECTS (Generation AI Teachable Machine + Stretch3).
// Five image-classification lessons, then three spoken-word sound lessons. The classes,
// projects and Scratch sprites are the finalized ones from the curriculum brief:
//
//   1 Giga's AI Snack Buddy        Apple · Banana · Bread
//   2 Pico's AI Space Rescue Scanner  Key · Pencil · Ball
//   3 AI Recycling Rangers         Paper · Plastic bottle · Metal can
//   4 AI Superhero Power-Up Lab    Book · Spoon · Flashlight
//   5 AI Space Explorer Packing Mission  Shirt · Shoes · Glass of water
//   6 AI Voice-Controlled Rocket Mission  Go · Stop · Home (+ Background Noise)
//   7 The Wizard's Magic Spellbook  Fire · Ice · Zap (+ Background Noise)
//   8 The AI Quiz Show Challenge    Yes · No · Help (+ Background Noise)
//
// Everyday objects only; the webcam is used to train AND to test live in Stretch3; sound
// models listen to children speaking simple words; no pose, gesture, hand or body tracking;
// only built-in Scratch sprite-library assets; the trained model is reused for homework.
// The only AI blocks used are the documented TM2Scratch blocks (see block-catalog.ts).

import type { LcAiPlan, LcLessonSpec } from '../lc.types';
import { aiClass, concept, mistake, sc, tip, vid } from './helpers';

const MODEL = 'paste your model link here';
const SOUND_MODEL = 'paste your sound model link here';

/** The Teachable Machine → Stretch3 hand-over, shared by the image lessons. */
function imagePlan(classes: LcAiPlan['classes'], extraTips: string[] = []): LcAiPlan {
  return {
    kind: 'image',
    classes,
    background: false,
    collectTips: [
      'Hold the object so the whole thing is in the picture.',
      'Move it closer, then farther away.',
      'Turn it to show different sides.',
      ...extraTips,
    ].slice(0, 5),
    testSteps: [
      'In the Preview panel, show each object to the webcam.',
      'Watch the bars. The right class should have the longest bar.',
      'If a class gets confused, add more varied examples to it and train again.',
    ],
    exportSteps: [
      'Click Export Model.',
      'Choose Upload (shareable link) and press the upload button.',
      'Copy the link when it appears. Keep it safe — you will paste it into Stretch3.',
    ],
    connectSteps: [
      'Open Stretch3 in Chrome.',
      'Click Add Extension at the bottom left and choose TM2Scratch.',
      'Paste your link into the “image classification model URL” block and click the block once to load the model.',
      'Allow the camera when your browser asks.',
      'Build your project with “when received image label” blocks. Use the exact class names.',
    ],
  };
}

/** The same for the spoken-word lessons. */
function soundPlan(classes: LcAiPlan['classes']): LcAiPlan {
  return {
    kind: 'sound',
    classes,
    background: true,
    collectTips: [
      'First record Background Noise: stay quiet so the model hears the room.',
      'Say each word clearly, in your normal voice, about 15 times.',
      'Leave a short pause between words.',
      'Say it the same way you will say it when you play.',
    ],
    testSteps: [
      'In the Preview panel, say each word into the microphone.',
      'Watch the bars. The right word should have the longest bar.',
      'If a word is confused, record more examples of it and train again.',
    ],
    exportSteps: [
      'Click Export Model.',
      'Choose Upload (shareable link) and press the upload button.',
      'Copy the link when it appears. Keep it safe.',
    ],
    connectSteps: [
      'Open Stretch3 in Chrome.',
      'Click Add Extension at the bottom left and choose TM2Scratch.',
      'Paste your link into the “sound classification model URL” block and click the block once to load the model.',
      'Allow the microphone when your browser asks.',
      'Build your project with “when received sound label” blocks. Use the exact word names.',
    ],
  };
}

export const COURSE_3: LcLessonSpec[] = [
  // ───────────────────────────── 1 · Giga's AI Snack Buddy ─────────────────────────────
  {
    course: 3,
    lesson: 1,
    title: "Giga's AI Snack Buddy",
    emoji: '🍎',
    platform: 'STRETCH3',
    mission: {
      hook: 'What if a computer could learn to recognise your snack?',
      objective: 'Train an AI to tell apples, bananas and bread apart, then let Giga react to each one.',
      badge: 'AI Trainer',
    },
    concepts: [
      concept('🤖', 'What is AI?', 'AI is a computer program that can learn from examples.', 'Nobody writes a rule for every apple. We show the computer lots of examples and it learns the pattern.'),
      concept('🧠', 'Machine learning', 'Machine learning means the computer learns from data, not from rules.', 'The more good examples you give it, the better it gets at the job.'),
      concept('🏷️', 'Classes and examples', 'A class is a group, like Apple. Examples are pictures that belong to it.', 'In this lesson there are three classes: Apple, Banana and Bread. You will record about 20 examples of each.'),
      concept('🔮', 'Predictions', 'A prediction is the model’s best guess about a new picture.', 'It shows how sure it is, from 0 to 100 percent. This is image classification.'),
    ],
    demo: {
      kind: 'ai-image',
      title: 'Teach and test a practice model',
      intro: 'Press Train, then pick a snack to show the practice camera. Your real model will use your webcam.',
      classes: [{ name: 'Apple', emoji: '🍎' }, { name: 'Banana', emoji: '🍌' }, { name: 'Bread', emoji: '🍞' }],
      mode: 'basic',
      hint: 'Which class has the longest bar?',
    },
    examples: [
      sc(
        'snack',
        'Giga reacts to an apple',
        ['events| when green flag clicked', `tm2scratch| image classification model URL [${MODEL}]`, 'tm2scratch| when received image label [Apple]', 'looks| switch costume to [giga-b]', 'looks| say [Yum! A crunchy apple!] for (2) seconds'],
        { intro: 'Tap a block to see what it does.', sprite: 'Giga', notes: { '2': 'Loads your trained model. Paste your own link here.', '3': 'Runs when the camera sees an Apple.', '4': 'Giga changes costume.', '5': 'Giga reacts to the snack.' } },
      ),
    ],
    tips: [
      tip('Use the exact class names', 'The label in Stretch3 must match the class name you typed in Teachable Machine, letter for letter.'),
      mistake('The model guesses wrong', 'You gave it only a few pictures, all from one angle.', 'Record about 20 examples of each snack and move it around.'),
      tip('Keep the picture clear', 'Show one snack at a time, with a plain background.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'You show a banana to the camera and the model says “Apple”. What is the best way to fix it?',
      options: ['Add more banana examples from different angles and train again', 'Delete the Apple class', 'Say the word banana louder', 'Turn off the camera'],
      answer: 0,
      hint: 'The model learns from examples.',
      explain: 'More varied examples help the model learn what a banana looks like. Then you train again.',
    },
    ai: imagePlan(
      [aiClass('Apple', '🍎', 'Hold up a real apple, or a picture of one.'), aiClass('Banana', '🍌', 'Hold up a banana, or a picture of one.'), aiClass('Bread', '🍞', 'Hold up bread or toast, or a picture of it.')],
      ['Use the same light for training and testing.'],
    ),
    project: {
      name: 'Alien Pet Café',
      goal: 'Show an apple, a banana or bread to the webcam and Giga reacts to each one differently.',
      assets: [
        { name: 'Giga', costumes: ['Giga-a', 'Giga-b', 'Giga-c', 'Giga-d'] },
        { name: 'Apple', costumes: ['Apple'] },
        { name: 'Bananas', costumes: ['Bananas'] },
        { name: 'Bread', costumes: ['Bread'] },
      ],
      steps: [
        { text: 'Open Teachable Machine. Start an Image Project (Standard image model). Make three classes: Apple, Banana, Bread.' },
        { text: 'Record about 20 examples of each snack with your webcam. Press Train Model, then test it in the Preview.' },
        { text: 'Export Model → Upload (shareable link). Copy the link.' },
        { text: 'Open Stretch3. Add the TM2Scratch extension. Add the Giga, Apple, Bananas and Bread sprites.' },
        { text: 'On Giga, add “image classification model URL” and paste your link. Click it once.', stack: 'setup' },
        { text: 'Add a “when received image label” block for each snack. Give Giga a different costume and message for each.', stack: 'apple' },
        { text: 'Show each snack to the webcam. Make the matching food sprite appear too!', stack: 'food' },
      ],
      stacks: [
        sc('setup', 'Load the model', ['events| when green flag clicked', `tm2scratch| image classification model URL [${MODEL}]`, 'looks| say [Show me a snack!] for (2) seconds'], { sprite: 'Giga' }),
        sc('apple', 'Giga reacts', ['tm2scratch| when received image label [Apple]', 'looks| switch costume to [giga-b]', 'looks| say [Yum! A crunchy apple!] for (2) seconds', 'tm2scratch| when received image label [Banana]', 'looks| switch costume to [giga-c]', 'looks| say [Banana! Going bananas!] for (2) seconds', 'tm2scratch| when received image label [Bread]', 'looks| switch costume to [giga-d]', 'looks| say [Toasty! My favourite!] for (2) seconds'], { sprite: 'Giga' }),
        sc('food', 'The food appears', ['looks| hide', 'tm2scratch| when received image label [Apple]', 'looks| show', 'control| wait (2) seconds', 'looks| hide'], { sprite: 'Apple', intro: 'Do the same on Bananas and Bread with their own labels.' }),
      ],
      checklist: ['My model has three classes', 'Giga loads the model when I click the flag', 'Each snack makes Giga react differently', 'The matching food sprite appears'],
      stretch: 'Make Giga say what the model sees using “confidence of image”.',
    },
    homework: {
      name: 'Banana Surprise',
      instructions: 'Open your Stretch3 project and use the same model link. Add a new message and a new reaction for Banana.',
      deliverable: 'Your Stretch3 project file (.sb3) or a shareable project link.',
      hint: 'You do not need to train the model again. Add blocks under “when received image label Banana”.',
    },
    teacherNotes: `## Before class
- Each learner needs a laptop with a **webcam**. Use Chrome and allow camera access.
- Have an apple, a banana and bread (real or in pictures) for every pair.
- Open Generation AI Teachable Machine and Stretch3 in two tabs. The button names for sharing a model (“Export Model” → “Upload (shareable link)”) follow Google’s Teachable Machine — confirm them on your site before class.

## Class flow (about 55 min)
1. **Hook (4 min)** – “How do you know that is an apple?” Collect answers.
2. **Train (18 min)** – Walk through the steps; learners record ~20 examples per class.
3. **Share & connect (10 min)** – Copy the link; add TM2Scratch in Stretch3.
4. **Build (18 min)** – Reactions for each snack.
5. **Wrap-up (5 min)** – Which snack was hardest for the model, and why?

## Discussion prompts
- What did the model learn from?
- What happens if you only show one angle?

## Watch for
- Labels typed differently in Teachable Machine and Stretch3.
- Poor lighting. Tell learners to face a window.`,
    video: vid("Giga's AI Snack Buddy", 'How can a computer know what snack you are holding?', 'Train a snack model and build the Alien Pet Café', {
      hook: ['Giga the alien stares at a mystery snack on a plate and tilts its head.', 'Giga is hungry! But is that an apple, a banana or bread? How can a computer know?', 'What is this snack?'],
      concept: ['A webcam flashes and apple pictures stack up in a box labelled Apple, as a brain icon glows.', 'AI learns from examples. Show it many pictures of each snack, and it learns what makes an apple an apple.', 'AI learns from examples'],
      explain: ['Three boxes fill with snack photos. A training bar fills. A prediction bar shows ninety percent apple.', 'Each group of pictures is a class. Train the model, then show it a new snack. It gives a guess, and how sure it is.', 'Classes · training · prediction'],
      demo: ['A hand holds a banana to the webcam. The Banana bar leaps up and Giga cheers in a new costume.', 'Show a banana and Giga reacts differently from an apple. Different class, different reaction!', 'Banana → new reaction'],
      tip: ['A model sees only a blurry corner of a banana and guesses wrong; arrows show more angles.', 'Tip: record examples from different angles and distances, so the model learns the whole snack.', 'Show many angles'],
      challenge: ['Giga holds three snacks and asks which is its favourite.', 'Which snacks will you teach your model? Then train it and build the Alien Pet Café.', 'Mission: Alien Pet Café'],
    }),
  },

  // ───────────────────────────── 2 · Pico's AI Space Rescue Scanner ─────────────────────────────
  {
    course: 3,
    lesson: 2,
    title: "Pico's AI Space Rescue Scanner",
    emoji: '🛰️',
    platform: 'STRETCH3',
    mission: {
      hook: 'A rescue mission starts when your scanner recognises the right object.',
      objective: 'Connect a model to Stretch3 with its link and use image-label events to run a rescue mission.',
      badge: 'Rescue Scanner',
    },
    concepts: [
      concept('🔗', 'Model URL', 'A model URL is the link to your trained model.', 'You paste it into the “image classification model URL” block. Then Stretch3 can use your model.'),
      concept('📷', 'Live recognition', 'With the camera on, the model guesses again and again.', 'Each guess is a new prediction about what the webcam sees right now.'),
      concept('⚡', 'Image-label events', '“when received image label” runs when the model sees that class.', 'It is an event, just like a key press. The blocks under it run.'),
      concept('🎛️', 'Many classes, many events', 'Each class can have its own event and its own action.', 'Key, Pencil and Ball can each make something different happen.'),
    ],
    demo: {
      kind: 'ai-image',
      title: 'Scan an object',
      intro: 'Pick an object to scan. See which “when received image label” block wakes up.',
      classes: [{ name: 'Key', emoji: '🔑' }, { name: 'Pencil', emoji: '✏️' }, { name: 'Ball', emoji: '⚽' }],
      mode: 'events',
      hint: 'Which block runs when the scanner sees a Ball?',
    },
    examples: [
      sc(
        'scanner',
        'Three scanner events',
        [`tm2scratch| image classification model URL [${MODEL}]`, 'tm2scratch| when received image label [Key]', 'looks| say [Spaceship unlocked!] for (2) seconds', 'tm2scratch| when received image label [Pencil]', 'looks| say [Mission map revealed!] for (2) seconds'],
        { intro: 'Tap a block to see what it does.', sprite: 'Pico', notes: { '1': 'Loads your model.', '2': 'Runs when the scanner sees a Key.', '4': 'A different event for a Pencil.' } },
      ),
    ],
    tips: [
      tip('Test your model first', 'Test in Teachable Machine before you use it in Stretch3. If it is wrong there, it will be wrong here.'),
      mistake('Nothing happens in Stretch3', 'The model link was not loaded, or the label name is different.', 'Click the model URL block once, and check the label spelling.'),
      tip('Keep the objects different', 'Choose objects that look very different, like a key, a pencil and a ball.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'Which block runs when the model sees a Ball?',
      options: ['when received image label [Ball]', 'image classification model URL [ ]', 'when green flag clicked', 'switch costume to [ball-b]'],
      answer: 0,
      hint: 'It is an event with the class name.',
      explain: '“when received image label Ball” is the event block. It wakes up when the model sees a Ball.',
    },
    ai: imagePlan([aiClass('Key', '🔑', 'Hold up a real key.'), aiClass('Pencil', '✏️', 'Hold up a pencil.'), aiClass('Ball', '⚽', 'Hold up a small ball.')], ['Show each object on its own.']),
    project: {
      name: "Pico's Rescue Mission",
      goal: 'Key unlocks the spaceship, Pencil reveals the mission map and Ball charges the energy supply.',
      assets: [
        { name: 'Pico', costumes: ['Pico-a', 'Pico-b', 'Pico-c', 'Pico-d'] },
        { name: 'Key', costumes: ['Key'] },
        { name: 'Pencil', costumes: ['Pencil-a', 'Pencil-b'] },
        { name: 'Ball', costumes: ['Ball-a', 'Ball-b', 'Ball-c', 'Ball-d', 'Ball-e'] },
        { name: 'Rocketship', costumes: ['Rocketship-a', 'Rocketship-b', 'Rocketship-c', 'Rocketship-d', 'Rocketship-e'] },
      ],
      steps: [
        { text: 'In Teachable Machine, make three classes: Key, Pencil, Ball. Record, train and test.' },
        { text: 'Export Model → Upload (shareable link). Copy the link.' },
        { text: 'In Stretch3, add TM2Scratch. Add Pico, Key, Pencil, Ball and Rocketship.' },
        { text: 'Pico: load the model with “image classification model URL”.', stack: 'load' },
        { text: 'Key event: the Rocketship switches to its next costume (unlocked!) and Pico cheers.', stack: 'key' },
        { text: 'Pencil event: the Pencil sprite shows and Pico says the map is revealed.' },
        { text: 'Ball event: the Ball changes costume as the energy charges, and the Rocketship glows.', stack: 'ball' },
      ],
      stacks: [
        sc('load', 'Load the model', ['events| when green flag clicked', `tm2scratch| image classification model URL [${MODEL}]`, 'looks| say [Scanner ready! Show me an object.] for (2) seconds'], { sprite: 'Pico' }),
        sc('key', 'Key unlocks the ship', ['tm2scratch| when received image label [Key]', 'looks| switch costume to [pico-b]', 'looks| say [Spaceship unlocked!] for (2) seconds', 'events| broadcast [unlock]'], { sprite: 'Pico' }),
        sc('ball', 'Ball charges the energy', ['tm2scratch| when received image label [Ball]', 'looks| next costume', 'looks| change [color] effect by (25)', 'looks| say [Energy charging!] for (2) seconds'], { sprite: 'Ball' }),
      ],
      checklist: ['My model has Key, Pencil and Ball', 'Each object makes something different happen', 'Pico says a message for each object', 'I tested with the real objects'],
      stretch: 'Make the Rocketship fly up when all three have been scanned.',
    },
    homework: {
      name: 'Key Cheer',
      instructions: 'Use the same model link in Stretch3. Add a new reaction when the Key is recognised, such as a new message and a costume change.',
      deliverable: 'Your Stretch3 project file (.sb3) or a shareable project link.',
      hint: 'Add blocks under “when received image label Key”. No new training needed.',
    },
    teacherNotes: `## Before class
- Webcam laptops; Chrome; a key, a pencil and a small ball per pair.
- Remind learners to bring their snack-model skills from lesson 1.

## Class flow (about 55 min)
1. **Hook (4 min)** – “What would a rescue scanner need to recognise?”
2. **Train & test (15 min)** – Three new classes.
3. **Connect (8 min)** – Paste the link; load the model.
4. **Build (22 min)** – One event per object.
5. **Mission test (6 min)** – Swap objects with a partner.

## Discussion prompts
- What is an event, and what else is an event in Scratch?
- Why must the label match exactly?

## Watch for
- Forgetting to click the model URL block after pasting.
- Objects that look alike (e.g. two dark pens).`,
    video: vid("Pico's AI Space Rescue Scanner", 'How can a scanner know which object to use?', "Build Pico's Rescue Mission", {
      hook: ['Pico floats in a dark spaceship as a red alarm blinks. A locked door waits.', 'The ship is locked, the map is missing and the engines are empty! Pico needs a scanner that recognises the right object.', 'Rescue mission!'],
      concept: ['A glowing link flows from a model box into a Stretch3 block labelled model URL.', 'Your model has an address, called a URL. Paste it into Stretch3 and your project can use the model.', 'Model URL'],
      explain: ['A webcam sees a key. A purple event block called when received image label lights up, and a door unlocks.', 'When the model sees a class, it sends an event. Each class can have its own block and its own action.', 'when received image label'],
      demo: ['A hand shows a key, then a pencil, then a ball. Door, map and battery each light up.', 'Show the key and the ship unlocks. Show the pencil and a map appears. Show the ball and the energy charges.', 'Key · Pencil · Ball'],
      tip: ['A model link is pasted but the block is grey; a hand clicks it and it turns green.', 'Tip: after you paste the link, click the model block once so Stretch3 loads it.', 'Click to load'],
      challenge: ['Pico holds up a ball and asks which event block will wake up.', 'Which block runs when the model sees a ball? Then train your model and build the rescue mission.', 'Mission: Rescue Scanner'],
    }),
  },

  // ───────────────────────────── 3 · AI Recycling Rangers ─────────────────────────────
  {
    course: 3,
    lesson: 3,
    title: 'AI Recycling Rangers',
    emoji: '♻️',
    platform: 'STRETCH3',
    mission: {
      hook: 'Sorting rubbish is a job an AI can learn.',
      objective: 'Use if / else and broadcasts to turn each prediction into the right action.',
      badge: 'Recycling Ranger',
    },
    concepts: [
      concept('🗂️', 'Classification for a job', 'The model sorts items into groups: Paper, Plastic bottle and Metal can.', 'Real recycling machines use cameras and AI to help sort items quickly.'),
      concept('🔀', 'If and else', 'Use if / else to decide what to do with a prediction.', 'If the model is sure, send the item to a tray. Else, ask the player to try again.'),
      concept('📣', 'Broadcasts', 'A broadcast sends a message to other sprites.', 'The controller broadcasts “paper”. The paper tray hears it and reacts.'),
      concept('🗺️', 'Predictions become actions', 'Every class is mapped to an action.', 'Paper → blue tray. Plastic bottle → green tray. Metal can → red tray.'),
    ],
    demo: {
      kind: 'ai-image',
      title: 'Sort the items',
      intro: 'Pick an item for the practice camera. Watch the event, the decision and the tray.',
      classes: [{ name: 'Paper', emoji: '📄' }, { name: 'Plastic bottle', emoji: '🧴' }, { name: 'Metal can', emoji: '🥫' }],
      mode: 'events',
      hint: 'Which tray does the Metal can go to?',
    },
    examples: [
      sc(
        'sort',
        'Is the model sure?',
        ['tm2scratch| when received image label [Paper]', 'control| if {(confidence of image [Paper]) > (0.8)} then', '  events| broadcast [paper]', 'control| else', '  looks| say [I am not sure. Try again!] for (2) seconds'],
        { intro: 'Tap a block to see what it does.', sprite: 'Robot', notes: { '1': 'Runs when the model sees Paper.', '2': 'Checks how sure the model is.', '3': 'If it is sure, tell the paper tray.', '5': 'Otherwise, ask for another try.' } },
      ),
    ],
    tips: [
      tip('Clean items work best', 'Use a clean, empty bottle and can. Crumpled paper is fine, as long as you show it clearly.'),
      mistake('The wrong tray reacts', 'Two broadcasts have the same message name, or the label is spelled differently.', 'Give each tray its own message: paper, plastic, metal.'),
      tip('Check the confidence', 'Use “confidence of image” to tell the player when the model is unsure.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'The model sees a Metal can. Which message should the controller broadcast?',
      options: ['metal', 'paper', 'plastic', 'launch'],
      answer: 0,
      hint: 'Match the class to its tray.',
      explain: 'Each class has its own message. Metal can → metal, so the red tray reacts.',
    },
    ai: imagePlan([aiClass('Paper', '📄', 'Hold up a sheet of paper.'), aiClass('Plastic bottle', '🧴', 'Hold up an empty, clean plastic bottle.'), aiClass('Metal can', '🥫', 'Hold up an empty, clean metal can.')], ['Use clean, empty items only.']),
    project: {
      name: 'Recycling Station',
      goal: 'Show an item to the webcam. The star flies to the correct tray and the robot celebrates.',
      assets: [
        { name: 'Robot', costumes: ['Robot-a', 'Robot-b', 'Robot-c', 'Robot-d'] },
        { name: 'Bowl', costumes: ['Bowl-a'], note: 'Make three copies. Give each a different colour effect.' },
        { name: 'Star', costumes: ['Star'], note: 'The item flying to the tray' },
      ],
      steps: [
        { text: 'In Teachable Machine, make the classes Paper, Plastic bottle and Metal can. Record, train and test.' },
        { text: 'Export Model → Upload (shareable link). Copy the link.' },
        { text: 'In Stretch3, add TM2Scratch. Add Robot, Bowl (three copies) and Star.' },
        { text: 'Colour the bowls: use “set color effect to” with a different number on each.' },
        { text: 'Robot: load the model. For each label, use if / else with “confidence of image”, then broadcast.', stack: 'brain' },
        { text: 'Star: when you hear a message, fly to that bowl, then broadcast “sorted”.', stack: 'fly' },
        { text: 'Robot: when you hear “sorted”, switch costume and celebrate.', stack: 'cheer' },
      ],
      stacks: [
        sc('brain', 'Robot decides', ['events| when green flag clicked', `tm2scratch| image classification model URL [${MODEL}]`, 'tm2scratch| when received image label [Paper]', 'control| if {(confidence of image [Paper]) > (0.8)} then', '  events| broadcast [paper]', 'control| else', '  looks| say [I am not sure. Try again!] for (2) seconds'], { sprite: 'Robot', intro: 'Do the same for Plastic bottle and Metal can.' }),
        sc('fly', 'The star flies', ['events| when I receive [paper]', 'motion| go to x: (0) y: (120)', 'looks| show', 'motion| glide (1) secs to x: (-150) y: (-60)', 'looks| hide', 'events| broadcast [sorted]'], { sprite: 'Star' }),
        sc('cheer', 'Robot celebrates', ['events| when I receive [sorted]', 'looks| switch costume to [robot-b]', 'looks| say [Great sorting, Ranger!] for (2) seconds'], { sprite: 'Robot' }),
      ],
      checklist: ['My model has three classes', 'Each item goes to its own tray', 'The robot celebrates after sorting', 'The model says when it is unsure'],
      stretch: 'Add a score that goes up by 1 for each item sorted.',
    },
    homework: {
      name: 'Paper Party',
      instructions: 'Use the same model link. Add a celebration message and a sound when Paper is recognised.',
      deliverable: 'Your Stretch3 project file (.sb3) or a shareable project link.',
      hint: 'Try “start sound collect” from the Star or Robot sound list. No retraining needed.',
    },
    teacherNotes: `## Before class
- Webcam laptops; Chrome. Collect clean paper, a plastic bottle and a can for each pair.
- Safety: only clean, empty items; no sharp edges on cans.

## Class flow (about 55 min)
1. **Hook (4 min)** – Sort real items into three boxes; “how does a machine do it?”.
2. **Train & test (15 min)** – Three classes.
3. **Connect (6 min)** – Link and extension.
4. **Build (24 min)** – Events → if/else → broadcast → trays → robot.
5. **Reflect (6 min)** – Where could mistakes in sorting be a problem?

## Discussion prompts
- Why is it better to ask the model “how sure are you?”.
- What happens if two classes look similar?

## Watch for
- Broadcast names that do not match.
- Items with labels or colours that confuse the model.`,
    video: vid('AI Recycling Rangers', 'Can an AI help sort the rubbish?', 'Build the AI Recycling Station', {
      hook: ['A mountain of mixed rubbish lands in front of a worried robot.', 'Paper, bottles and cans all mixed up! Can a robot sort them without any help?', 'Sort it out!'],
      concept: ['Three coloured trays glow. A camera scans an item and a label pops up above it.', 'A model can sort items into classes. Each class belongs to one tray: paper, plastic or metal.', 'Class → tray'],
      explain: ['A prediction arrow splits at an if-else gate. A bubble says eighty percent. A message flies to a tray.', 'If the model is sure, broadcast a message to the right tray. If not, ask the player to try again.', 'if / else + broadcast'],
      demo: ['A can is held to the camera. A star zips to the red tray and the robot cheers.', 'Show a can. The model says metal. A message goes out, the star flies to the red tray, and the robot celebrates.', 'Metal can → red tray'],
      tip: ['Two trays flash together; a message name tag shows both are called the same.', 'Tip: give every tray its own message name, so only the right tray reacts.', 'One message each'],
      challenge: ['The robot holds a can and asks which message to send.', 'Which message goes with a metal can? Then train your model and build the Recycling Station.', 'Mission: Recycling Station'],
    }),
  },

  // ───────────────────────────── 4 · AI Superhero Power-Up Lab ─────────────────────────────
  {
    course: 3,
    lesson: 4,
    title: 'AI Superhero Power-Up Lab',
    emoji: '🦸',
    platform: 'STRETCH3',
    mission: {
      hook: 'A better model gives your hero better powers.',
      objective: 'Improve a model with varied examples and test it until it recognises objects reliably.',
      badge: 'Power-Up Scientist',
    },
    concepts: [
      concept('🎨', 'Varied examples', 'Good training data has many different examples.', 'Show the object at different angles, distances and in different light.'),
      concept('📐', 'Angles and distance', 'The model should know an object from the front, the side and far away.', 'If you only show it close up, it may not see it from farther back.'),
      concept('💡', 'Lighting', 'Bright, dim and shadowed light all change how an object looks.', 'Record examples in the same kind of light you will test in.'),
      concept('🎯', 'Accuracy', 'Accuracy tells us how often the model is right.', 'Test each class several times. If it makes mistakes, add more examples and train again.'),
    ],
    demo: {
      kind: 'ai-image',
      title: 'Make the model better',
      intro: 'Add varied examples to the weak class and watch the accuracy climb.',
      classes: [{ name: 'Book', emoji: '📖' }, { name: 'Spoon', emoji: '🥄' }, { name: 'Flashlight', emoji: '🔦' }],
      mode: 'improve',
      hint: 'Which kind of example helps most?',
    },
    examples: [
      sc(
        'powers',
        'Three powers',
        ['tm2scratch| when received image label [Book]', 'looks| say [Super Brain!] for (2) seconds', 'tm2scratch| when received image label [Spoon]', 'looks| change size by (30)', 'tm2scratch| when received image label [Flashlight]', 'looks| set [brightness] effect to (60)'],
        { intro: 'Tap a block to see what it does.', sprite: 'Pico', notes: { '1': 'Book → Super Brain.', '3': 'Spoon → Super Strength: Pico grows.', '5': 'Flashlight → Night Vision: a bright glow.' } },
      ),
    ],
    tips: [
      tip('Test from far away', 'Test your model with the objects farther from the camera, not just close up.'),
      mistake('The model is confused in dim light', 'You recorded all the examples in bright light.', 'Record some examples in dim light too, then train again.'),
      tip('Add, then re-train', 'After you add examples, press Train Model again. Old training does not update by itself.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'The model often mixes up the Spoon and the Flashlight when they are far away. What is the best fix?',
      options: ['Record more Spoon and Flashlight examples from far away, then train again', 'Record 100 more Book examples', 'Change the class names', 'Turn the brightness up in Scratch'],
      answer: 0,
      hint: 'Fix the examples that are weak.',
      explain: 'The model learns from the examples you give it. Add examples that match the mistakes, then train again.',
    },
    ai: imagePlan([aiClass('Book', '📖', 'Hold up a book, front cover and side.', 25), aiClass('Spoon', '🥄', 'Hold up a spoon at different angles.', 25), aiClass('Flashlight', '🔦', 'Hold up a flashlight (switched off).', 25)], ['Try bright light and dim light.', 'Test the model before you build.']),
    project: {
      name: 'Superhero Power-Up Lab',
      goal: 'Book gives Super Brain, Spoon gives Super Strength and Flashlight gives Night Vision.',
      assets: [
        { name: 'Pico', costumes: ['Pico-a', 'Pico-b', 'Pico-c', 'Pico-d'] },
        { name: 'Lightning', costumes: ['Lightning'] },
        { name: 'Star', costumes: ['Star'] },
      ],
      steps: [
        { text: 'In Teachable Machine, make classes Book, Spoon and Flashlight. Record at least 25 varied examples each.' },
        { text: 'Train, then test every class at two distances and in two kinds of light. Improve until it is reliable.' },
        { text: 'Export Model → Upload (shareable link). Copy the link.' },
        { text: 'In Stretch3, add TM2Scratch. Add Pico, Lightning and Star. Load the model on Pico.' },
        { text: 'Book → Super Brain: a Star appears above Pico.', stack: 'brain' },
        { text: 'Spoon → Super Strength: Pico grows larger with a power-up effect.', stack: 'strength' },
        { text: 'Flashlight → Night Vision: Pico reveals a hidden Star with a bright glow.', stack: 'night' },
      ],
      stacks: [
        sc('brain', 'Super Brain', ['tm2scratch| when received image label [Book]', 'looks| say [Super Brain!] for (2) seconds', 'events| broadcast [brain]'], { sprite: 'Pico' }),
        sc('strength', 'Super Strength', ['tm2scratch| when received image label [Spoon]', 'looks| change size by (30)', 'looks| change [color] effect by (25)', 'looks| say [Super Strength!] for (2) seconds'], { sprite: 'Pico' }),
        sc('night', 'Night Vision', ['tm2scratch| when received image label [Flashlight]', 'looks| set [brightness] effect to (60)', 'events| broadcast [night]', 'looks| say [Night Vision!] for (2) seconds'], { sprite: 'Pico' }),
      ],
      checklist: ['My model works at two distances', 'Each object gives a different power', 'Pico grows with a power-up effect', 'The hidden star appears with Night Vision'],
      stretch: 'Add “clear graphic effects” so Pico returns to normal after each power.',
    },
    homework: {
      name: 'Brain Boost',
      instructions: 'Use the same model link. Add another power-up reaction to Book, such as Lightning flashing next to Pico.',
      deliverable: 'Your Stretch3 project file (.sb3) or a shareable project link.',
      hint: 'Use a broadcast so the Lightning sprite can react when Book is recognised.',
    },
    teacherNotes: `## Before class
- Webcam laptops; Chrome. A book, a spoon and a flashlight (off) per pair.
- Prepare to demo a model that confuses two classes, then fix it live.

## Class flow (about 55 min)
1. **Hook (4 min)** – Show a weak model failing; ask for ideas.
2. **Improve (20 min)** – Varied examples; test at different distances and light.
3. **Connect (6 min)** – Export, link, load.
4. **Build (20 min)** – Three powers.
5. **Reflect (5 min)** – What made the model better?

## Discussion prompts
- What does “accuracy” mean to you?
- How did adding varied examples change the bars?

## Watch for
- Learners recording 100 near-identical frames.
- Flashlights switched on — keep them off for training.`,
    video: vid('AI Superhero Power-Up Lab', 'Why does a model sometimes get it wrong?', 'Train and improve a model for the Power-Up Lab', {
      hook: ['A hero tries to power up with a book, but the machine shouts the wrong power.', 'The hero held up a book, but the machine gave super strength! Why does a model get things wrong?', 'Why wrong?'],
      concept: ['A model brain shows only front views of a book. Arrows add side views, far views and dim views.', 'A model learns only from what it has seen. If the examples are all the same, it gets confused by anything new.', 'Varied examples'],
      explain: ['Example cards fan out: close, far, bright, dim. The accuracy meter climbs from fifty to ninety-five percent.', 'Show the object at different angles, distances and lighting. Test, find mistakes and add examples that fix them. Then train again.', 'Vary · test · retrain'],
      demo: ['A hand tests the spoon far away. Wrong. More far spoon examples are added and the meter jumps.', 'The spoon was confused when far away. We add far examples and train again. Now it works!', 'Add examples → retrain'],
      tip: ['Examples added, but the old bars stay; a Train Model button lights up.', 'Tip: after adding examples, always press Train Model again.', 'Train again'],
      challenge: ['The hero holds three objects and asks which power each will unlock.', 'How will you make your model strong enough to power up a hero? Train it, test it and build the lab.', 'Mission: Power-Up Lab'],
    }),
  },

  // ───────────────────────────── 5 · AI Space Explorer Packing Mission ─────────────────────────────
  {
    course: 3,
    lesson: 5,
    title: 'AI Space Explorer Packing Mission',
    emoji: '🎒',
    platform: 'STRETCH3',
    mission: {
      hook: 'Pack for space by showing each item to the camera.',
      objective: 'Combine three image classes, variables and conditionals into one complete AI project.',
      badge: 'Space Packer',
    },
    concepts: [
      concept('🧮', 'Counters', 'A counter is a variable that counts things.', 'Add 1 to “packed” each time a new item goes into the spaceship.'),
      concept('✅', 'Checklists', 'A checklist remembers which items are packed.', 'Use a variable for each item: 0 means not packed, 1 means packed.'),
      concept('🔒', 'Packed only once', 'An if block can stop the same item being counted twice.', '“if hasShirt = 0” only runs the first time. Then you set it to 1.'),
      concept('🧩', 'Putting it together', 'A big project joins many small ideas.', 'Model events, variables, conditionals and broadcasts all work together.'),
    ],
    demo: {
      kind: 'ai-image',
      title: 'Pack the bag',
      intro: 'Pick each item for the practice camera. Watch the checklist and counter update.',
      classes: [{ name: 'Shirt', emoji: '👕' }, { name: 'Shoes', emoji: '👟' }, { name: 'Glass of water', emoji: '🥛' }],
      mode: 'events',
      hint: 'What happens when you show the same item twice?',
    },
    examples: [
      sc(
        'pack',
        'Pack the shirt once',
        ['tm2scratch| when received image label [Shirt]', 'control| if {(hasShirt) = (0)} then', '  variables| set [hasShirt] to (1)', '  variables| change [packed] by (1)', '  events| broadcast [pack shirt]'],
        { intro: 'Tap a block to see what it does.', sprite: 'Tera', notes: { '1': 'Runs when the model sees a Shirt.', '2': 'Only if the shirt is not packed yet.', '3': 'Remember it is packed.', '4': 'Count one more item.', '5': 'Tell the Shirt sprite to move.' } },
      ),
    ],
    tips: [
      tip('Reset at the start', 'Set all your variables to 0 when the green flag is clicked. Then every game starts fresh.'),
      mistake('The counter goes above 3', 'The same item was counted every time the camera saw it.', 'Check “if hasShirt = 0” first, then set it to 1.'),
      tip('Show the checklist', 'Tick the variable boxes so players can see what is packed.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'The camera sees the Shirt three times in a row. How many times should “packed” go up?',
      code: { language: 'scratch', lines: ['tm2scratch| when received image label [Shirt]', 'control| if {(hasShirt) = (0)} then', '  variables| set [hasShirt] to (1)', '  variables| change [packed] by (1)'] },
      options: ['Once', 'Three times', 'Zero times', 'Four times'],
      answer: 0,
      hint: 'What does hasShirt become after the first time?',
      explain: 'After the first sighting, hasShirt is 1. The condition “hasShirt = 0” is false afterwards, so the counter only goes up once.',
    },
    ai: imagePlan([aiClass('Shirt', '👕', 'Hold up a folded shirt.'), aiClass('Shoes', '👟', 'Hold up one shoe or a pair.'), aiClass('Glass of water', '🥛', 'Hold up a glass of water (keep it steady!).')], ['Hold the glass steady and do not spill.']),
    project: {
      name: 'Space Explorer Packing Mission',
      goal: 'Show a shirt, shoes and a glass of water. Each one flies into the spaceship. When all three are packed, the rocket launches!',
      assets: [
        { name: 'Tera', costumes: ['Tera-a', 'Tera-b', 'Tera-c', 'Tera-d'] },
        { name: 'Shirt', costumes: ['Shirt-a'] },
        { name: 'Shoes', costumes: ['Shoes-a', 'Shoes-b', 'Shoes-c', 'Shoes-d'] },
        { name: 'Glass Water', costumes: ['Glass Water-a', 'Glass Water-b'] },
        { name: 'Rocketship', costumes: ['Rocketship-a', 'Rocketship-b', 'Rocketship-c', 'Rocketship-d', 'Rocketship-e'] },
      ],
      steps: [
        { text: 'In Teachable Machine, make classes Shirt, Shoes and Glass of water. Record, train and test.' },
        { text: 'Export Model → Upload (shareable link). Copy the link.' },
        { text: 'In Stretch3, add TM2Scratch. Add Tera, Shirt, Shoes, Glass Water and Rocketship. Make variables packed, hasShirt, hasShoes and hasWater.' },
        { text: 'Tera: set every variable to 0 and load the model.', stack: 'setup' },
        { text: 'Tera: for each label, add the “only once” if block, count the item and broadcast a message.', stack: 'shirt' },
        { text: 'Each item sprite: glide into the spaceship when it hears its message.' },
        { text: 'Tera: wait until packed = 3, celebrate and broadcast “launch”. The Rocketship flies up!', stack: 'launch' },
      ],
      stacks: [
        sc('setup', 'Start fresh', ['events| when green flag clicked', 'variables| set [packed] to (0)', 'variables| set [hasShirt] to (0)', 'variables| set [hasShoes] to (0)', 'variables| set [hasWater] to (0)', `tm2scratch| image classification model URL [${MODEL}]`], { sprite: 'Tera' }),
        sc('shirt', 'Pack the shirt', ['tm2scratch| when received image label [Shirt]', 'control| if {(hasShirt) = (0)} then', '  variables| set [hasShirt] to (1)', '  variables| change [packed] by (1)', '  events| broadcast [pack shirt]'], { sprite: 'Tera', intro: 'Do the same for Shoes and Glass of water.' }),
        sc('launch', 'Launch time', ['events| when green flag clicked', 'control| wait until {(packed) = (3)}', 'looks| say [All packed! Launch time!] for (2) seconds', 'events| broadcast [launch]'], { sprite: 'Tera' }),
      ],
      checklist: ['My model has three classes', 'Each item is counted once', 'The checklist and counter update', 'The rocket launches when everything is packed'],
      stretch: 'Make Tera change costume each time an item is packed.',
    },
    homework: {
      name: 'Countdown to Launch',
      instructions: 'Use the same model link. Add a 3-2-1 launch countdown before the Rocketship takes off.',
      deliverable: 'Your Stretch3 project file (.sb3) or a shareable project link.',
      hint: 'Use say blocks with a short wait between 3, 2 and 1 inside “when I receive launch”.',
    },
    teacherNotes: `## Before class
- Webcam laptops; Chrome. A shirt, shoes and a (plastic) glass of water per pair — be careful with water near laptops.

## Class flow (about 55 min)
1. **Hook (4 min)** – “What do you need to pack for space?”
2. **Train & test (15 min)** – Three classes.
3. **Connect (6 min)** – Link and extension.
4. **Build (24 min)** – Variables, once-only checks, launch.
5. **Showcase (6 min)** – Pack, count and launch.

## Discussion prompts
- Why do we need a variable for each item?
- What if the camera sees the same item many times?

## Watch for
- Variables not reset at the start.
- Water spills — use a plastic cup, or a picture.`,
    video: vid('AI Space Explorer Packing Mission', 'How can an AI help you pack for a space trip?', 'Build the Space Explorer Packing Mission', {
      hook: ['A cheerful explorer stands beside an empty spaceship and an empty suitcase.', 'Tera is leaving for space, but forgot to pack! Can a camera help check the list?', 'Pack for space!'],
      concept: ['A checklist floats beside the ship with three empty boxes and a number counter at zero.', 'A counter is a variable that counts. A checklist uses a variable for each item, with zero for not packed and one for packed.', 'Counter + checklist'],
      explain: ['A shirt is recognised. The counter ticks to one and a tick fills in. The same shirt again changes nothing.', 'When the model sees an item, check if it is packed. If not, set it to one and add one to the counter. Then it counts only once.', 'if hasShirt = 0'],
      demo: ['Shirt, shoes and water fly into the ship one by one. The counter reaches three and the rocket launches.', 'Show each item and watch it fly into the ship. At three items, Tera cheers and the rocket launches!', 'packed = 3 → launch'],
      tip: ['The counter jumps past three; a once-only gate fixes it.', 'Tip: set each item to one after packing it, so it cannot be counted again.', 'Count once'],
      challenge: ['Tera holds a shirt up three times and asks how many times it counts.', 'The shirt is shown three times. How many times should it count? Then build your own packing mission.', 'Mission: Packing Mission'],
    }),
  },

  // ───────────────────────────── 6 · AI Voice-Controlled Rocket Mission ─────────────────────────────
  {
    course: 3,
    lesson: 6,
    title: 'AI Voice-Controlled Rocket Mission',
    emoji: '🎤',
    platform: 'STRETCH3',
    mission: {
      hook: 'Your voice can be a controller.',
      objective: 'Train a model to hear Go, Stop and Home, then steer a rocket with your voice.',
      badge: 'Voice Commander',
    },
    concepts: [
      concept('🎙️', 'Sound classification', 'A sound model listens and decides which word it heard.', 'It works like the image model, but it learns from short recordings of sound.'),
      concept('🗣️', 'Spoken-word classes', 'Each word is a class: Go, Stop and Home.', 'You record yourself saying each word many times. Add a Background Noise class for the quiet room.'),
      concept('🎧', 'Microphone input', 'The model listens through the microphone.', 'Your browser asks to use the microphone. Click Allow.'),
      concept('⚡', 'Sound-label events', '“when received sound label” runs when the model hears that word.', 'It works just like image-label events, but for voices.'),
    ],
    demo: {
      kind: 'ai-voice',
      title: 'Say a command',
      intro: 'Pick a word for the practice microphone. Watch the rocket obey.',
      words: [{ word: 'Go', emoji: '🟢' }, { word: 'Stop', emoji: '🛑' }, { word: 'Home', emoji: '🏠' }],
      mode: 'events',
      hint: 'What does the rocket do when it hears Home?',
    },
    examples: [
      sc(
        'voice',
        'Voice commands',
        [`tm2scratch| sound classification model URL [${SOUND_MODEL}]`, 'tm2scratch| when received sound label [Go]', 'variables| set [moving] to (1)', 'tm2scratch| when received sound label [Stop]', 'variables| set [moving] to (0)'],
        { intro: 'Tap a block to see what it does.', sprite: 'Rocketship', notes: { '1': 'Loads your sound model.', '2': 'Runs when it hears the word Go.', '3': 'Tells the rocket to keep moving.', '5': 'Stop freezes the rocket.' } },
      ),
    ],
    tips: [
      tip('Record a quiet room', 'Record Background Noise when nobody is talking, so the model knows the difference.'),
      mistake('The wrong word wins', 'Two words sound similar, or you said them differently when you trained.', 'Say each word clearly and add more examples to the confused words.'),
      tip('Speak like you will play', 'Use the same voice and distance when you train and when you play.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'Which block runs when the model hears you say “Stop”?',
      options: ['when received sound label [Stop]', 'when received image label [Stop]', 'sound classification model URL [ ]', 'change x by (10)'],
      answer: 0,
      hint: 'It is a sound event, not an image event.',
      explain: '“when received sound label” is the event for words. Put the class name in the box.',
    },
    ai: soundPlan([aiClass('Go', '🟢', 'Say “Go” clearly about 15 times.', 15), aiClass('Stop', '🛑', 'Say “Stop” clearly about 15 times.', 15), aiClass('Home', '🏠', 'Say “Home” clearly about 15 times.', 15)]),
    project: {
      name: 'Voice-Controlled Rocket',
      goal: 'Say Go to fly, Stop to freeze and Home to return. The Robot is mission control.',
      assets: [
        { name: 'Rocketship', costumes: ['Rocketship-a', 'Rocketship-b', 'Rocketship-c', 'Rocketship-d', 'Rocketship-e'] },
        { name: 'Robot', costumes: ['Robot-a', 'Robot-b', 'Robot-c', 'Robot-d'] },
      ],
      steps: [
        { text: 'In Teachable Machine, start an Audio Project. Record Background Noise first, then Go, Stop and Home.' },
        { text: 'Train, then test by saying each word into the microphone.' },
        { text: 'Export Model → Upload (shareable link). Copy the link.' },
        { text: 'In Stretch3, add TM2Scratch. Add Rocketship and Robot. Make a variable called moving.' },
        { text: 'Rocketship: load the sound model. Use a forever loop that moves when moving = 1.', stack: 'fly' },
        { text: 'Add one sound event for each word: Go, Stop and Home.', stack: 'words' },
        { text: 'Robot: say what mission control hears. Test with your voice!', stack: 'control' },
      ],
      stacks: [
        sc('fly', 'Fly when Go', ['events| when green flag clicked', `tm2scratch| sound classification model URL [${SOUND_MODEL}]`, 'motion| go to x: (-180) y: (0)', 'variables| set [moving] to (0)', 'control| forever', '  control| if {(moving) = (1)} then', '    motion| move (5) steps'], { sprite: 'Rocketship' }),
        sc('words', 'Three words', ['tm2scratch| when received sound label [Go]', 'variables| set [moving] to (1)', 'tm2scratch| when received sound label [Stop]', 'variables| set [moving] to (0)', 'tm2scratch| when received sound label [Home]', 'variables| set [moving] to (0)', 'motion| go to x: (-180) y: (0)'], { sprite: 'Rocketship' }),
        sc('control', 'Mission control', ['tm2scratch| when received sound label [Go]', 'looks| say [Launching!] for (1) seconds', 'tm2scratch| when received sound label [Home]', 'looks| say [Coming home!] for (1) seconds'], { sprite: 'Robot' }),
      ],
      checklist: ['My model has Go, Stop and Home', 'It also has Background Noise', 'The rocket moves on Go and freezes on Stop', 'Home sends it back to the start'],
      stretch: 'Add a fourth word, such as Fast, and make the rocket speed up.',
    },
    homework: {
      name: 'Go and Stop',
      instructions: 'Use the same sound model link. Make a simpler rocket that only listens for Go and Stop.',
      deliverable: 'Your Stretch3 project file (.sb3) or a shareable project link.',
      hint: 'Keep the “moving” variable. You do not need the Home event this time.',
    },
    teacherNotes: `## Before class
- Laptops with a **microphone**; Chrome; a quiet-ish room. Allow microphone access.
- In Teachable Machine, choose an **Audio Project**. Confirm on your site where the Background Noise class appears.

## Class flow (about 55 min)
1. **Hook (4 min)** – Say “Go!” and “Stop!” — “can a computer hear the difference?”.
2. **Train & test (18 min)** – Background Noise first, then the words.
3. **Connect (6 min)** – Link, sound model block.
4. **Build (22 min)** – Movement and events.
5. **Mission test (5 min)** – Voice-control demo.

## Discussion prompts
- How is sound classification like image classification?
- Why is Background Noise important?

## Watch for
- Noisy rooms: take turns recording.
- Learners shouting — use a normal voice.`,
    video: vid('AI Voice-Controlled Rocket Mission', 'Can you fly a rocket with just your voice?', 'Build the Voice-Controlled Rocket', {
      hook: ['A rocket waits on the launch pad. A cartoon mouth says one word, and the rocket jumps.', 'No keyboard, no mouse. Just your voice. Can a rocket really listen?', 'Say Go!'],
      concept: ['A microphone catches a wiggly sound wave and a label pops up: Go.', 'A sound model listens and decides which word it heard. It learns from recordings, just like the image model.', 'Sound model'],
      explain: ['Three word cards fill with sound waves, plus a flat grey Background Noise card. A purple event block lights up.', 'Record each word many times, and the quiet room too. When the model hears a word, the sound event block runs.', 'when received sound label'],
      demo: ['The child says Go, Stop, Home. The rocket flies, freezes, and zooms back to the pad.', 'Say Go and the rocket flies. Say Stop and it freezes. Say Home and it zooms back to the start.', 'Go · Stop · Home'],
      tip: ['A loud room confuses the model; a quiet bubble shows Background Noise recorded.', 'Tip: record the quiet room as Background Noise, and speak in your normal voice.', 'Quiet room'],
      challenge: ['Mission control Robot waves and asks which event listens for words.', 'Which block runs when the model hears a word? Then train your model and fly the rocket with your voice.', 'Mission: Voice Rocket'],
    }),
  },

  // ───────────────────────────── 7 · The Wizard's Magic Spellbook ─────────────────────────────
  {
    course: 3,
    lesson: 7,
    title: "The Wizard's Magic Spellbook",
    emoji: '🧙',
    platform: 'STRETCH3',
    mission: {
      hook: 'Say the magic word and the spell comes to life.',
      objective: 'Use spoken-word events, costumes and visual effects to cast Fire, Ice and Zap spells.',
      badge: 'Spell Caster',
    },
    concepts: [
      concept('🪄', 'Voice recognition', 'The model recognises the words Fire, Ice and Zap.', 'Each word is a class. When the model hears it, the matching spell is cast.'),
      concept('🎭', 'Costume switching', 'The wizard changes costume for each spell.', 'Switching costumes shows what the wizard is doing, such as raising the wand.'),
      concept('✨', 'Visual effects', 'Effects like colour, ghost and brightness make spells look magical.', 'Try “change color effect by” for fire and “set ghost effect” for icy mist.'),
      concept('🔀', 'Conditions and events', 'Only the spell you speak should run.', 'Each sound event handles one word, so the right spell runs at the right time.'),
    ],
    demo: {
      kind: 'ai-voice',
      title: 'Cast a spell',
      intro: 'Pick a spell word for the practice microphone and watch the wizard react.',
      words: [{ word: 'Fire', emoji: '🔥' }, { word: 'Ice', emoji: '❄️' }, { word: 'Zap', emoji: '⚡' }],
      mode: 'events',
      hint: 'Which spell uses the Snowflake?',
    },
    examples: [
      sc(
        'spell',
        'The Fire spell',
        ['tm2scratch| when received sound label [Fire]', 'looks| switch costume to [wizard-b]', 'events| broadcast [fire]', 'events| when I receive [fire]', 'looks| change [color] effect by (25)', 'looks| show'],
        { intro: 'Tap a block to see what it does.', sprite: 'Wizard', notes: { '1': 'Runs when it hears “Fire”.', '2': 'The wizard raises a hand.', '3': 'Tells the Potion sprite to react.', '5': 'The fireball changes colour.' } },
      ),
    ],
    tips: [
      tip('Choose different-sounding words', 'Fire, Ice and Zap sound different, so the model can tell them apart.'),
      mistake('The spell does not stop', 'A sprite was shown but never hidden again.', 'Add “hide” after a short wait so the spell ends.'),
      tip('Reset the effects', 'Use “clear graphic effects” at the end, so the next spell starts clean.'),
    ],
    challenge: {
      kind: 'order',
      prompt: 'Put the blocks in order so the Snowflake appears when you say “Ice”.',
      language: 'scratch',
      lines: ['tm2scratch| when received sound label [Ice]', 'looks| show', 'control| wait (2) seconds'],
      hint: 'The event goes first, then the spell happens.',
      explain: 'The sound event goes first. Then the snowflake shows and waits two seconds. A hide block after the wait would end the spell.',
    },
    ai: soundPlan([aiClass('Fire', '🔥', 'Say “Fire” clearly about 15 times.', 15), aiClass('Ice', '❄️', 'Say “Ice” clearly about 15 times.', 15), aiClass('Zap', '⚡', 'Say “Zap” clearly about 15 times.', 15)]),
    project: {
      name: "The Wizard's Magic Spellbook",
      goal: 'Say Fire, Ice or Zap and the wizard casts a different spell with its own effect.',
      assets: [
        { name: 'Wizard', costumes: ['Wizard-a', 'Wizard-b', 'Wizard-c'] },
        { name: 'Magic Wand', costumes: ['Magicwand'] },
        { name: 'Potion', costumes: ['Potion-a', 'Potion-b', 'Potion-c'], note: 'The fireball' },
        { name: 'Snowflake', costumes: ['Snowflake'] },
        { name: 'Lightning', costumes: ['Lightning'] },
      ],
      steps: [
        { text: 'In Teachable Machine, start an Audio Project. Record Background Noise, then Fire, Ice and Zap.' },
        { text: 'Train, test, then Export Model → Upload (shareable link). Copy the link.' },
        { text: 'In Stretch3, add TM2Scratch. Add Wizard, Magic Wand, Potion, Snowflake and Lightning. Hide the spells at the start.' },
        { text: 'Wizard: load the sound model.', stack: 'load' },
        { text: 'Fire: switch the wizard’s costume and broadcast “fire”. The Potion shows with a colour effect.', stack: 'fire' },
        { text: 'Ice: broadcast “ice”. The Snowflake shows with a ghost effect.', stack: 'ice' },
        { text: 'Zap: broadcast “zap”. The Lightning flashes and the Magic Wand glows.', stack: 'zap' },
      ],
      stacks: [
        sc('load', 'Load the model', ['events| when green flag clicked', `tm2scratch| sound classification model URL [${SOUND_MODEL}]`, 'looks| say [Say a spell word!] for (2) seconds'], { sprite: 'Wizard' }),
        sc('fire', 'Fire spell', ['tm2scratch| when received sound label [Fire]', 'looks| switch costume to [wizard-b]', 'events| broadcast [fire]', 'events| when I receive [fire]', 'looks| show', 'looks| change [color] effect by (25)', 'control| wait (2) seconds', 'looks| hide'], { sprite: 'Wizard' }),
        sc('ice', 'Ice spell', ['events| when I receive [ice]', 'looks| set [ghost] effect to (40)', 'looks| show', 'control| wait (2) seconds', 'looks| hide'], { sprite: 'Snowflake' }),
        sc('zap', 'Zap spell', ['events| when I receive [zap]', 'looks| set [brightness] effect to (50)', 'looks| show', 'control| wait (1) seconds', 'looks| hide'], { sprite: 'Lightning' }),
      ],
      checklist: ['My model has Fire, Ice and Zap', 'Each word casts a different spell', 'The spells hide again', 'The wizard changes costume'],
      stretch: 'Make the Magic Wand follow the wizard when a spell is cast.',
    },
    homework: {
      name: 'Icy Message',
      instructions: 'Use the same sound model link. Add a message and a visual effect to the Ice spell.',
      deliverable: 'Your Stretch3 project file (.sb3) or a shareable project link.',
      hint: 'Use say for the message and “set ghost effect to” or “change color effect by” for the look.',
    },
    teacherNotes: `## Before class
- Laptops with a microphone; Chrome; a quiet room where learners can take turns.

## Class flow (about 55 min)
1. **Hook (4 min)** – Cast a spell in a silly voice: “can a computer hear magic words?”.
2. **Train & test (18 min)** – Three spoken classes plus Background Noise.
3. **Connect (6 min)** – Link and sound model block.
4. **Build (22 min)** – One spell at a time; test after each.
5. **Show (5 min)** – Learners cast their favourite spell.

## Discussion prompts
- Why do different effects make spells feel different?
- How did you pick words the model can tell apart?

## Watch for
- Spells that never hide.
- Background chatter in the classroom.`,
    video: vid("The Wizard's Magic Spellbook", 'What if magic words really worked?', "Build the Wizard's Magic Spellbook", {
      hook: ['An old spellbook opens and sparkles swirl. A wizard looks around for the right words.', 'The wizard has forgotten how to cast spells! But a computer that listens might help.', 'Say the word!'],
      concept: ['Three glowing word cards float above the book: Fire, Ice and Zap, each with a tiny sound wave.', 'Your model can learn magic words. Each word is a class, and when it hears one, it sends an event.', 'Words are classes'],
      explain: ['The wizard changes costume. A potion flares orange, a snowflake fades in blue, a lightning bolt flashes.', 'Each word runs its own blocks: switch the costume, show a sprite and add a visual effect, like colour, ghost or brightness.', 'costume + effect'],
      demo: ['A child says Fire, Ice, Zap. Each spell bursts out, then fades away.', 'Say Fire and a fireball glows. Say Ice and a snowflake appears. Say Zap and lightning flashes!', 'Fire · Ice · Zap'],
      tip: ['A snowflake never fades; a hide block makes it vanish.', 'Tip: after each spell, wait a moment and hide the sprite so the spell ends.', 'Hide at the end'],
      challenge: ['The wizard holds a wand and asks which word calls the snowflake.', 'Which word makes the snowflake appear? Then train your model and write your own spellbook.', 'Mission: Magic Spellbook'],
    }),
  },

  // ───────────────────────────── 8 · The AI Quiz Show Challenge ─────────────────────────────
  {
    course: 3,
    lesson: 8,
    title: 'The AI Quiz Show Challenge',
    emoji: '🏅',
    platform: 'STRETCH3',
    mission: {
      hook: 'Answer out loud and let the AI host judge your answer.',
      objective: 'Build a three-question quiz that listens for Yes, No and Help, scores answers and gives hints.',
      badge: 'Quiz Show Host',
    },
    concepts: [
      concept('❓', 'Question and answer', 'The host asks a question and waits for a spoken answer.', 'Sound events listen for Yes, No or Help. Only then does the quiz move on.'),
      concept('🏁', 'Scoring', 'A score variable counts right answers.', 'Add 1 for each correct answer. Show the final score at the end.'),
      concept('🔀', 'Conditional logic', 'Compare the answer with what is correct.', 'If the answer matches, say Correct! and score. Else, say Not this time.'),
      concept('🐞', 'Testing and debugging', 'Test every path: right, wrong and Help.', 'If something is off, check the variables first. Most bugs hide in a number or a name.'),
    ],
    demo: {
      kind: 'ai-voice',
      title: 'Play the quiz',
      intro: 'Answer by choosing Yes, No or Help for the practice microphone.',
      words: [{ word: 'Yes', emoji: '✅' }, { word: 'No', emoji: '❌' }, { word: 'Help', emoji: '💡' }],
      mode: 'quiz',
      hint: 'What does Help do?',
    },
    examples: [
      sc(
        'answer',
        'Check the answer',
        ['tm2scratch| when received sound label [Yes]', 'control| if {(answer) = [yes]} then', '  variables| change [score] by (1)', '  looks| say [Correct!] for (1) seconds', 'control| else', '  looks| say [Not this time!] for (1) seconds', 'events| broadcast [next question]'],
        { intro: 'Tap a block to see what it does.', sprite: 'Giga', notes: { '2': 'Compares what was said with the right answer.', '3': 'A correct answer adds a point.', '5': 'Otherwise, a friendly message.', '7': 'Moves on to the next question.' } },
      ),
    ],
    tips: [
      tip('Keep answers short', 'Yes and No are short and easy for the model to tell apart.'),
      mistake('The score is wrong', 'The score was not set to 0 at the start, or a question was counted twice.', 'Set score and question when the flag is clicked, and move on after each answer.'),
      tip('Test all three questions', 'Play the whole quiz once with all right answers, then once with all wrong answers.'),
    ],
    challenge: {
      kind: 'choose',
      prompt: 'The right answer is “yes” and the player says No. Which path runs?',
      code: { language: 'scratch', lines: ['tm2scratch| when received sound label [No]', 'control| if {(answer) = [no]} then', '  variables| change [score] by (1)', 'control| else', '  looks| say [Not this time!] for (1) seconds'] },
      options: ['The else path: “Not this time!”', 'The first path: the score goes up', 'Both paths', 'Neither path'],
      answer: 0,
      hint: 'What is answer set to for this question?',
      explain: 'Here answer is “yes”, so “answer = no” is false. The else path runs and the score stays the same.',
    },
    ai: soundPlan([aiClass('Yes', '✅', 'Say “Yes” clearly about 15 times.', 15), aiClass('No', '❌', 'Say “No” clearly about 15 times.', 15), aiClass('Help', '💡', 'Say “Help” clearly about 15 times.', 15)]),
    project: {
      name: 'The AI Quiz Show',
      goal: 'Giga hosts a three-question quiz. Answer out loud. Giga checks your answer, gives a hint on Help and shows your final score.',
      assets: [
        { name: 'Giga', costumes: ['Giga-a', 'Giga-b', 'Giga-c', 'Giga-d'] },
        { name: 'Star', costumes: ['Star'] },
      ],
      steps: [
        { text: 'In Teachable Machine, start an Audio Project. Record Background Noise, then Yes, No and Help.' },
        { text: 'Train, test, then Export Model → Upload (shareable link). Copy the link.' },
        { text: 'In Stretch3, add TM2Scratch. Add Giga and Star. Make variables score, question and answer.' },
        { text: 'Giga: set score to 0 and question to 1, load the model and ask question 1.', stack: 'host' },
        { text: 'For Yes and No: compare with the answer variable, score or say Not this time!, then broadcast “next question”.', stack: 'check' },
        { text: 'For Help: give a hint for the current question using an if / else.' },
        { text: 'After question 3, show the final score with a join block and let the Star celebrate.', stack: 'finish' },
      ],
      stacks: [
        sc('host', 'Host asks', ['events| when green flag clicked', 'variables| set [score] to (0)', 'variables| set [question] to (1)', 'variables| set [answer] to [yes]', `tm2scratch| sound classification model URL [${SOUND_MODEL}]`, 'looks| say [Question 1: Is the Sun a star? Say Yes or No.] for (4) seconds'], { sprite: 'Giga' }),
        sc('check', 'Check Yes', ['tm2scratch| when received sound label [Yes]', 'control| if {(answer) = [yes]} then', '  variables| change [score] by (1)', '  looks| say [Correct!] for (1) seconds', 'control| else', '  looks| say [Not this time!] for (1) seconds', 'events| broadcast [next question]'], { sprite: 'Giga', intro: 'Copy it for No and change the word.' }),
        sc('finish', 'Final score', ['events| when I receive [next question]', 'variables| change [question] by (1)', 'control| if {(question) = (4)} then', '  looks| say (join [Your score: ] (score)) for (3) seconds', '  events| broadcast [celebrate]'], { sprite: 'Giga' }),
      ],
      checklist: ['The quiz has three questions', 'Yes and No are scored correctly', 'Help gives a hint', 'The final score is shown'],
      stretch: 'Make Giga change costume for right and wrong answers.',
    },
    homework: {
      name: 'One-Question Quiz',
      instructions: 'Use the same sound model link. Build a one-question quiz that listens for Yes and No only.',
      deliverable: 'Your Stretch3 project file (.sb3) or a shareable project link.',
      hint: 'Keep a score variable and use one if / else for the answer.',
    },
    teacherNotes: `## Before class
- Laptops with a microphone; Chrome. Prepare three Yes/No questions (e.g. “Is the Sun a star?”) so learners can change them.

## Class flow (about 55 min)
1. **Hook (4 min)** – Play a quick spoken quiz with the class.
2. **Train & test (15 min)** – Yes, No and Help.
3. **Connect (6 min)** – Link and sound model block.
4. **Build (24 min)** – Host, check, score, final.
5. **Debug day (6 min)** – Swap laptops; find one bug each.

## Discussion prompts
- How do you test a quiz so every path is checked?
- What could go wrong if the model mishears?

## Watch for
- Variables not reset at the start.
- Learners making the quiz too long.`,
    video: vid('The AI Quiz Show Challenge', 'Can a quiz show listen to your answers?', 'Build the AI Quiz Show', {
      hook: ['A game-show stage lights up. A friendly alien host holds a golden microphone.', 'Welcome to the quiz show! But there is no keyboard. You answer out loud, and the host listens!', 'Answer out loud!'],
      concept: ['A question card floats up. Three answer bubbles glow: Yes, No and Help.', 'The host asks a question, then waits. When the model hears Yes, No or Help, a sound event runs the matching blocks.', 'Question → answer'],
      explain: ['A score counter sits beside the host. A right answer adds one with a ding. A wrong answer says not this time.', 'Compare the answer with the right one. If it matches, change score by one. Otherwise, say try again. Then ask the next question.', 'if / else + score'],
      demo: ['The host asks three questions. A child answers, asks for help once, and the final score pops up.', 'Answer all three questions, ask for Help once, and the host shows your final score at the end.', 'Final score'],
      tip: ['A bug icon crawls over a wrong score; a magnifier finds a missing reset.', 'Tip: test every path, right answers, wrong answers and Help. Most bugs hide in a variable.', 'Test every path'],
      challenge: ['The host holds a Yes and a No card and asks which path runs.', 'If the answer is yes and the player says No, which path runs? Then build your own quiz show.', 'Mission: Quiz Show'],
    }),
  },
];
