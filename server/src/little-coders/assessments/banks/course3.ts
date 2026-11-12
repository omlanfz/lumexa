// FILE PATH: server/src/little-coders/assessments/banks/course3.ts
//
// COURSE 3 ASSESSMENT — AI for Kids: Smart Projects. Topics: 1 AI and examples · 2 model URL
// and image-label events · 3 if / else and messages · 4 improving a model · 5 counters ·
// 6 sound classification · 7 sound events and effects · 8 scoring and debugging.
//
// The practical needs NO training: it uses a prepared model that an admin supplies (the link is
// configurable and is never invented here), so the 20 minutes go on Stretch3 programming and
// handling AI-label events.

import { bank, mcq, practical, scratchCode, tf } from '../lc-bank.helpers';

export const course3Bank = bank({
  id: 'lc/course-test/ai-for-kids',
  title: 'AI for Kids: Smart Projects — Course Assessment',
  kind: 'COURSE',
  moduleSlug: 'ai-for-kids',
  courseNumber: 3,
  mcq: [
    mcq('concept', 'EASY', 1, 'How does a machine learning model learn to recognise a banana?', 'From many example pictures that are labelled Banana', ['From a list of rules typed by a programmer', 'By guessing without seeing any examples', 'From the sound of the word banana'], 'A model learns from examples. You show it lots of pictures in a class called Banana, and it finds the pattern.'),
    mcq('concept', 'EASY', 4, 'Why should you show an object from different angles when you train a model?', 'So the model learns what the object looks like from many views', ['So the webcam works faster', 'So the model needs fewer examples', 'So the object stays still'], 'Varied examples help the model recognise the object however it is held. Examples that are all the same make a weak model.'),
    mcq('identify', 'EASY', 2, 'Which TM2Scratch block runs when your model sees an object called Key?', '`when received image label [Key]`', ['`image classification model URL [Key]`', '`confidence of image [Key]`', '`turn video [on]`'], 'The “when received image label” block is the event. It runs when the model sees the class you type in the box.'),
    mcq('identify', 'MEDIUM', 7, 'You trained a model that listens for spoken words. Which block runs when it hears the word Go?', '`when received sound label [Go]`', ['`when received image label [Go]`', '`sound classification model URL [Go]`', '`when [g] key pressed`'], 'Sound models use the “when received sound label” block. The image label block is for pictures.'),
    mcq('predict', 'MEDIUM', 5, 'The camera sees the Shirt 3 times in a row. hasShirt is 0 and packed is 0 at the start. What is packed afterwards?', '1', ['3', '0', '2'], 'The first time, hasShirt is 0, so packed goes up to 1 and hasShirt becomes 1. After that, “hasShirt = 0” is false, so packed stays at 1.', {
      code: scratchCode('tm2scratch| when received image label [Shirt]', 'control| if {(hasShirt) = (0)} then', '  variables| set [hasShirt] to (1)', '  variables| change [packed] by (1)'),
    }),
    mcq('predict', 'MEDIUM', 3, 'The model sees Paper but is only 0.6 sure. What happens?', 'The sprite says Not sure!', ['The message paper is broadcast', 'Both things happen', 'Nothing happens'], 'The check asks if the confidence is bigger than 0.8. 0.6 is not, so the else part runs.', {
      code: scratchCode('tm2scratch| when received image label [Paper]', 'control| if {(confidence of image [Paper]) > (0.8)} then', '  events| broadcast [paper]', 'control| else', '  looks| say [Not sure!] for (2) seconds'),
    }),
    mcq('sequence', 'MEDIUM', 2, 'Which order is right for using your own model in Stretch3?', 'Train the model, export the share link, add TM2Scratch, paste the link into the model URL block', ['Paste the link into Stretch3, train the model, then export the share link', 'Add TM2Scratch, then train the model, then paste the link before exporting it', 'Export the share link, then record the examples, then train the model'], 'A link only exists after you train and export. Then Stretch3 needs the TM2Scratch extension before you can paste the link.'),
    mcq('predict', 'HARD', 8, 'The quiz is on question 2 and the player says Help. What does the host say?', 'No hint for this one', ['Think about the Sun!', 'Both messages', 'Nothing'], 'question is 2, so “question = 1” is false and the else part runs.', {
      code: scratchCode('tm2scratch| when received sound label [Help]', 'control| if {(question) = (1)} then', '  looks| say [Think about the Sun!] for (2) seconds', 'control| else', '  looks| say [No hint for this one] for (2) seconds'),
    }),
    mcq('sequence', 'HARD', 4, 'A model keeps mixing up the Spoon and the Flashlight. What is the best order of steps to fix it?', 'Test it, record more varied examples of the confused classes, train again, then test again', ['Train again, delete the Spoon class, then export the link', 'Record more Book examples, export the link, then test', 'Test it, rename the classes, then export the link without training'], 'Find the mistakes, add examples that match them, train again so the model learns, and test again to check it improved.'),
    mcq('mistake', 'HARD', 3, 'The class in Teachable Machine is named Metal can, but nothing happens in Stretch3. What is the mistake?', 'The label must match the class name exactly, so it should be Metal can', ['The class needs a number in its name', 'The camera must be turned off first', 'The message block must come before the event block'], 'The label in the event block has to match the class name from Teachable Machine. “Can” is not the same as “Metal can”.', {
      code: scratchCode('tm2scratch| when received image label [Can]', 'looks| say [Recycled!] for (2) seconds'),
    }),
  ],
  trueFalse: [
    tf('EASY', 1, 'An image classification model gives a prediction and also shows how sure it is.', true, 'A prediction comes with a confidence, from 0 to 1 (or 0 to 100 percent).'),
    tf('EASY', 6, 'You do not need to record any examples to train a sound model.', false, 'A sound model learns from recordings of each word, plus Background Noise.'),
    tf('MEDIUM', 2, 'You paste your model’s share link into the model URL block so Stretch3 can use your model.', true, 'The link tells Stretch3 where your trained model lives.'),
    tf('MEDIUM', 4, 'Adding more varied examples can make a model more accurate.', true, 'More varied examples help the model learn the whole range of what an object looks like.'),
    tf('HARD', 2, 'After you have exported a model, you must train it again every time you open Stretch3.', false, 'The exported link keeps your trained model. You can use the same link again in any project.'),
  ],
  practicals: [
    practical(null, 'Alien Pet Café Counter', 'Stretch3 (TM2Scratch)', {
      platform: 'STRETCH3',
      brief: [
        'Your teacher gives you a prepared model link. It already knows three snacks: Apple, Banana and Bread. You do not need to train anything.',
        'Build a counter for the Alien Pet Café in Stretch3. Giga should react when a snack is shown to the webcam and keep count of the snacks served.',
        'Use the built-in Giga sprite (and any other sprite from the Scratch library).',
      ],
      blocks: [
        { category: 'TM2Scratch (extension)', blocks: ['image classification model URL [ ]', 'when received image label [ ]', 'confidence of image [ ]'] },
        { category: 'Events', blocks: ['when green flag clicked'] },
        { category: 'Variables', blocks: ['set [ ] to ( )', 'change [ ] by ( )'] },
        { category: 'Control', blocks: ['if < > then … else'] },
        { category: 'Operators', blocks: ['( ) > ( )', '( ) = ( )'] },
        { category: 'Looks', blocks: ['say [ ] for ( ) seconds', 'switch costume to [ ]'] },
      ],
      requirements: [
        'When the green flag is clicked, the project loads the prepared model and sets a variable called served to 0.',
        'Each of the three labels (Apple, Banana and Bread) has its own “when received image label” block.',
        'Each label makes Giga react in a different way (a different message or costume).',
        'The variable served goes up by 1 when a snack is recognised.',
        'An if / else check with a confidence threshold that you choose stops a weak guess from counting: Giga asks the visitor to try again instead.',
        'When served reaches 3, Giga says that the café is open for business.',
      ],
      starter: {
        required: true,
        kind: 'MODEL_URL',
        label: 'Prepared model link (Apple, Banana, Bread)',
        url: '',
        note: 'Admin: paste the shareable link of a verified image model with exactly these three classes. Until it is added, students are told their teacher will share the link.',
        modelLabels: ['Apple', 'Banana', 'Bread'],
      },
      bonus: ['Make the matching food sprite (Apple, Bananas or Bread) appear for a moment when it is recognised.'],
      handIn: 'Save your project from Stretch3 (File → Save to your computer) and upload the .sb3 file, and/or paste your shareable project link.',
    }),
  ],
});
