// FILE PATH: server/src/curriculum/lesson-content/catalog/ai-builder.ts
//
// Visuals for the AI Builder pathway. Keys are lineage keys: "<module-slug>/<position>".
// Everything drawn here is data validated by normalizeVisuals and drawn by the
// client from that data. Illustrative numbers are always captioned as illustrative.

import { registerVisualCatalog, type CatalogSource } from '../visual-catalog';
import { V, cards, checklist, flow, sequence, table, trace, walkthrough } from './helpers';

// An 8 × 8 grayscale picture of a smile (220 = light, 30 = dark).
const L = 220;
const D = 30;
const SMILE = [
  [L, L, L, L, L, L, L, L],
  [L, L, L, L, L, L, L, L],
  [L, L, D, L, L, D, L, L],
  [L, L, L, L, L, L, L, L],
  [L, D, L, L, L, L, D, L],
  [L, L, D, D, D, D, L, L],
  [L, L, L, L, L, L, L, L],
  [L, L, L, L, L, L, L, L],
];
const RAINBOW = [
  [[255, 0, 0], [255, 128, 0], [255, 255, 0], [128, 255, 0]],
  [[0, 255, 0], [0, 255, 128], [0, 255, 255], [0, 128, 255]],
  [[0, 0, 255], [128, 0, 255], [255, 0, 255], [255, 0, 128]],
  [[0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255]],
];

const source: CatalogSource = {
  // ── Python and AI Foundations ────────────────────────────────────────────
  'python-ai-foundations/1': [
    flow('how-python-runs', 'Interpreters, scripts', 'Your code in a file is read by the Python interpreter, which asks the computer to run it and shows the output in the terminal.', 'From a file you write to output on the screen.', ['You write code|hello.py|accent', 'Python interpreter|reads it line by line|accent2', 'Computer runs it|follows each instruction', 'Output|appears in the terminal|good']),
    walkthrough('first-run', 'Your first program', 'Four steps to check Python and run your first program from the terminal.', 'Follow along in your own terminal.', [
      { title: 'Open a terminal', text: 'On Windows open **Command Prompt** or **PowerShell**; on Mac open **Terminal**.' },
      { title: 'Check Python is installed', text: 'Type the command below and press Enter. You should see a version number.', code: 'python --version' },
      { title: 'Write the program', text: 'In your editor create a file called `hello.py` containing one line.', code: 'print("Hello, mission control!")' },
      { title: 'Run it', text: 'In the terminal, go to the folder with `hello.py` and run it.', code: 'python hello.py' },
    ], { at: 'end' }),
  ],
  'python-ai-foundations/2': [
    table('data-types', 'Data types', 'A table of four Python data types with an example value and what each is used for.', 'The four basic data types you will use all the time.', ['Type', 'Example', 'Used for'], [['int', '42', 'counting things'], ['float', '3.14', 'measurements with decimals'], ['str', '"rover"', 'text and labels'], ['bool', 'True', 'yes / no decisions']]),
    V('tree', 'decision-tree-temp', 'Conditional logic', 'A decision tree: if the temperature is above 30 print hot, otherwise check if it is above 15 for warm, otherwise cold.', 'if / elif / else is a decision tree.', {
      root: { label: 'temp > 30 ?', children: [{ label: 'Yes → "hot"', tone: 'bad' }, { label: 'No → temp > 15 ?', children: [{ label: 'Yes → "warm"', tone: 'warn' }, { label: 'No → "cold"', tone: 'info' }] }] },
    }, { at: 'end' }),
  ],
  'python-ai-foundations/3': [
    trace('for-loop-trace', 'Loops: doing things repeatedly', 'Step through a for loop that adds 1, 2 and 3, watching the variables total and n change.', 'Watch `total` grow one loop pass at a time.', ['total = 0', 'for n in [1, 2, 3]:', '    total = total + n', 'print(total)'], [
      { line: 1, vars: { total: 0 }, note: 'total starts at 0.' },
      { line: 2, vars: { total: 0, n: 1 }, note: 'The loop picks the first item: n is 1.' },
      { line: 3, vars: { total: 1, n: 1 }, note: '0 + 1 = 1.' },
      { line: 2, vars: { total: 1, n: 2 }, note: 'Next item: n is 2.' },
      { line: 3, vars: { total: 3, n: 2 }, note: '1 + 2 = 3.' },
      { line: 2, vars: { total: 3, n: 3 }, note: 'Last item: n is 3.' },
      { line: 3, vars: { total: 6, n: 3 }, note: '3 + 3 = 6.' },
      { line: 4, vars: { total: 6, n: 3 }, output: '6', note: 'The loop is finished, so print shows 6.' },
    ]),
  ],
  'python-ai-foundations/4': [
    table('list-of-dicts', 'Lists of dictionaries', 'A list of dictionaries drawn as a table: each dictionary is a row and each key is a column.', 'A list of dictionaries is a table in disguise.', ['index', 'name', 'status', 'score'], [[0, '"Apollo"', '"complete"', 88], [1, '"Voyager"', '"in progress"', 72], [2, '"Rover"', '"complete"', 95]], { highlights: [{ row: 1, col: 3, tone: 'info', note: 'missions[1]["score"] is 72' }] }),
  ],
  'python-ai-foundations/5': [
    table('features-labels', 'The vocabulary of machine learning', 'A small table of houses: size and bedrooms are the features, price is the label the model learns to predict.', 'Features go in; the label is what we want out.', ['size (m²)', 'bedrooms', 'price (label)'], [[50, 1, '120,000'], [80, 2, '185,000'], [120, 3, '270,000'], [95, 2, '?']], { highlights: [{ row: 3, col: 2, tone: 'warn', note: 'The model predicts this one' }] }),
    flow('ml-cycle', 'How does a model actually "learn"', 'A cycle: make a prediction, measure how wrong it is, adjust, and repeat.', 'Learning is guess → measure the error → adjust → repeat.', ['Predict|use the current settings', 'Measure the error|compare with the real answer', 'Adjust|nudge the settings to be less wrong'], { layout: 'cycle' }),
    V('train-test', 'split-demo', 'Why we split data into training and test sets', 'An interactive split of 100 examples into training and test sets with a slider for the share used for training.', 'The test set stays hidden until the end.', { total: 100 }),
  ],
  'python-ai-foundations/6': [
    V('chart', 'regression-line', 'Linear regression: the simplest real model', 'A scatter plot of hours studied against exam score with a straight best-fit line through the points.', 'Linear regression finds the straight line that fits the points best.', {
      kind: 'scatter', xLabel: 'Hours studied', yLabel: 'Exam score', fitLine: true,
      series: [{ name: 'Students', points: [{ x: 1, y: 52 }, { x: 2, y: 58 }, { x: 3, y: 63 }, { x: 4, y: 71 }, { x: 5, y: 74 }, { x: 6, y: 82 }, { x: 7, y: 85 }, { x: 8, y: 91 }] }],
    }),
  ],
  'python-ai-foundations/7': [
    V('train-test', 'split-demo', 'The train/test split', 'An interactive split of 100 examples into training and test sets with a slider for the share used for training.', 'Keep some data back to test the model honestly.', { total: 100 }),
    V('chart', 'overfitting-curve', 'Overfitting and underfitting', 'A line chart: as a model gets more complex, training error keeps falling but test error falls then rises again, which is overfitting.', 'Illustrative numbers: the test error turns upward when the model starts memorising.', {
      kind: 'line', xLabel: 'Model complexity', yLabel: 'Error', categories: ['1', '2', '3', '4', '5', '6', '7', '8'],
      series: [{ name: 'Training error', values: [9, 6.5, 4.5, 3, 2, 1.2, 0.7, 0.3] }, { name: 'Test error', values: [9.5, 7, 5.2, 4.4, 4.6, 5.6, 7.2, 9.4] }],
    }, { at: 'end' }),
  ],
  'python-ai-foundations/8': [
    cards('metric-translation', 'Translating metrics into plain language', 'Two cards comparing how a result is written for engineers and how it is worded for a non-technical audience.', 'Same result, different audiences.', [
      { title: 'For engineers', badge: 'Technical', tone: 'info', bullets: ['R² = 0.82', 'MSE = 14.3'] },
      { title: 'For everyone else', badge: 'Plain language', tone: 'good', bullets: ['"The model explains about 82% of why scores differ."', '"On average it is off by about 4 points."'] },
    ]),
  ],

  // ── Computer Vision Projects ────────────────────────────────────────────
  'computer-vision/1': [
    V('pixel-grid', 'smile-grid', 'Grayscale images: one number per pixel', 'An 8 by 8 grayscale picture of a smile shown as a grid of numbers from 0 (black) to 255 (white), with controls to show or hide the numbers.', 'A picture is just a grid of numbers.', { rows: 8, cols: 8, values: SMILE, mode: 'gray', highlight: [2, 2] }),
    V('pixel-grid', 'rainbow-grid', 'Color images: three numbers per pixel', 'A 4 by 4 colour picture where every pixel has red, green and blue numbers, with buttons to look at each channel.', 'Every colour pixel is three numbers: red, green and blue.', { rows: 4, cols: 4, values: RAINBOW, mode: 'rgb', highlight: [0, 1] }),
    table('index-vs-xy', 'Coordinate systems', 'A table comparing array indexing, which is row then column, with OpenCV points, which are x then y.', 'Rows and columns versus x and y — a classic mix-up.', ['Where', 'Order', 'Example'], [['NumPy array index', 'img[row, col]', 'img[2, 5] → row 2, column 5'], ['OpenCV point / drawing', '(x, y)', '(5, 2) → x = 5 (column), y = 2 (row)']], { highlights: [{ row: 0, col: 1, tone: 'info' }, { row: 1, col: 1, tone: 'warn' }] }),
  ],
  'computer-vision/2': [
    V('colorspace', 'color-vs-gray', 'Color space conversions', 'The same drawn picture in colour, as separate red, green and blue channels, and in grayscale, with the grayscale arithmetic for any chosen part.', 'Converting colour to grayscale is arithmetic on the three numbers.', {}),
    table('kernel-blur', 'Kernels and convolution', 'A 3 by 3 Gaussian blur kernel with weights 1 2 1, 2 4 2, 1 2 1 that are divided by 16.', 'A kernel slides over the image; each output pixel is a weighted average of its neighbours.', ['', 'col −1', 'col 0', 'col +1'], [['row −1', '1/16', '2/16', '1/16'], ['row 0', '2/16', '4/16', '2/16'], ['row +1', '1/16', '2/16', '1/16']], { highlights: [{ row: 1, col: 2, tone: 'accent', note: 'The centre pixel counts the most' }] }),
    flow('filter-pipeline', 'Canny edge detection', 'A pipeline: read the image, convert to grayscale, blur, find edges with Canny, save the result.', 'Each step feeds the next.', ['cv2.imread|load the image', 'cvtColor|to grayscale', 'GaussianBlur|remove noise', 'Canny|find the edges', 'cv2.imwrite|save the result'], { perRow: 5, at: 'end' }),
  ],
  'computer-vision/3': [
    V('haar', 'haar-features', 'How Haar Cascade face detection works', 'Haar-like features placed over a drawn grayscale face: an edge feature on the eyes and cheeks and a line feature across the nose bridge, with the feature value computed from the drawn pixels.', 'Haar-like features compare light and dark rectangles. The face is a drawing.', {}),
    V('cascade', 'cascade-funnel', 'How Haar Cascade face detection works', 'A funnel showing a cascade of tests: most of 10,000 candidate windows are thrown away by the first cheap stages and only a few reach the end.', 'Cheap tests first, careful tests only for what is left. Illustrative numbers.', {
      windows: 10000,
      stages: [
        { name: 'Stage 1 — very quick check', passRate: 0.4, detail: 'A couple of features reject plain backgrounds such as walls and sky.' },
        { name: 'Stage 2', passRate: 0.25, detail: 'More features remove most remaining non-faces.' },
        { name: 'Stage 3', passRate: 0.15, detail: 'Stricter again.' },
        { name: 'Final stages', passRate: 0.1, detail: 'Only face-like windows survive the full set of tests.' },
      ],
    }, { at: 'end' }),
    V('bbox', 'face-box', 'Running detection', 'A drawn face with a green rectangle around it, labelled with its x and y position from the top-left corner and its width and height, with sliders to move and resize the box.', 'Each detected face is reported as one (x, y, w, h) rectangle.', { imageWidth: 480, imageHeight: 320, box: { x: 150, y: 50, width: 150, height: 190 }, label: 'face' }, { at: 'end' }),
    V('detection-lab', 'detect-lab', 'Running detection', 'An experiment with scaleFactor and minNeighbors on a drawn scene with two faces and a wall clock, showing which are found, missed or wrongly accepted.', 'Tune scaleFactor and minNeighbors and watch the trade-offs. Prepared results on a drawing — not live OpenCV.', {}, { at: 'end' }),
    V('colorspace', 'gray-first', 'Why detection must run on grayscale', 'The same drawn picture in colour and grayscale, with the grayscale arithmetic for any chosen part of the picture.', 'Haar features only compare light and dark, so grayscale is enough.', {}, { at: 'end' }),
  ],
  'computer-vision/4': [
    flow('cnn-layers', 'How a CNN processes an image, layer by layer', 'A convolutional neural network pipeline: the image goes through convolution layers that find edges then shapes, pooling layers that shrink it, dense layers that combine evidence, and an output layer of probabilities.', 'Early layers find edges; later layers find shapes and parts.', ['Input image|pixels', 'Convolution|finds edges and textures', 'Pooling|shrinks, keeps the strongest', 'More convolution|finds shapes and parts', 'Dense layers|combine the evidence', 'Output|a probability per class'], { perRow: 3 }),
    V('chart', 'softmax-example', 'Reading the output correctly', 'A bar chart of example output probabilities for five emotion labels where the top label is only a little ahead of the others.', 'Example numbers only: the output is a set of probabilities, not a certainty.', {
      kind: 'bar', yLabel: 'Probability', categories: ['happy', 'neutral', 'sad', 'surprised', 'angry'], series: [{ name: 'Probability', values: [0.46, 0.27, 0.12, 0.09, 0.06] }],
    }),
  ],
  'computer-vision/5': [
    cards('haar-vs-yolo', 'From cascades to single-pass detection', 'Two cards comparing a Haar cascade, which scans many windows at many sizes, with YOLO, which looks at the whole image once and predicts boxes and classes together.', 'Two very different ways to find things.', [
      { title: 'Haar cascade', badge: 'Older', tone: 'info', bullets: ['Slides a window over the image at many sizes', 'Very fast, but one object type per cascade', 'Brightness patterns only'] },
      { title: 'YOLO', badge: 'Single pass', tone: 'good', bullets: ['Looks at the whole image once', 'Many classes at the same time (80 in COCO)', 'Learned features, runs best with a GPU'] },
    ]),
    table('confidence-filter', 'Confidence thresholds and filtering', 'A table of example detections with confidence scores; rows below the 0.5 threshold are highlighted as filtered out.', 'Example detections: keep only the ones above the confidence threshold.', ['class', 'confidence', 'kept at threshold 0.5?'], [['person', 0.91, 'yes'], ['cup', 0.73, 'yes'], ['chair', 0.48, 'no'], ['dog', 0.31, 'no']], { highlights: [{ row: 2, col: 1, tone: 'bad' }, { row: 3, col: 1, tone: 'bad' }] }),
  ],
  'computer-vision/6': [
    flow('webcam-loop', 'The real-time processing loop', 'A loop that repeats for every video frame: capture a frame, process it, draw the results, show it, check whether to quit.', 'Video is the same steps repeated for every frame.', ['Capture a frame|cap.read()', 'Process it|detect / classify', 'Draw the results|boxes and labels', 'Show the window|cv2.imshow', 'Quit key pressed?|if not, go again'], { layout: 'cycle' }),
    table('fps-table', 'Frames per second', 'A table showing how the time taken per frame turns into frames per second.', 'FPS = 1 ÷ time per frame.', ['Time per frame', 'Frames per second', 'Feels like'], [['33 ms', '30 FPS', 'smooth video'], ['100 ms', '10 FPS', 'choppy'], ['200 ms', '5 FPS', 'a slideshow']], { highlights: [{ row: 0, col: 1, tone: 'good' }] }),
  ],
  'computer-vision/7': [
    flow('cv-app-pipeline', 'Integrating multiple subsystems', 'A pipeline for a full computer vision app: configuration and logging at the edges, and capture, detection, classification and display in the middle.', 'Small parts with one job each are easier to test and fix.', ['Config|settings in one place', 'Capture|frames from the camera', 'Detect|find faces', 'Classify|label each face', 'Display & log|show it and record events'], { perRow: 5 }),
  ],
  'computer-vision/8': [
    flow('packaging-flow', 'Why packaging matters', 'The packaging path: a virtual environment, a requirements file, a README, then a demo that someone else can run.', 'If it only runs on your laptop, it is not finished.', ['Virtual environment|isolated packages', 'requirements.txt|exact versions', 'README|how to install and run', 'Demo|runs on another machine'], { perRow: 4 }),
    checklist('demo-checklist', 'Preparing a live demo', 'A checklist to tick off before a live demo.', 'Tick these off before you present. Saved on this device.', ['Laptop charged and plugged in', 'Camera permission allowed and tested', 'Good, even lighting on the face', 'Backup screenshots or a short recording ready', 'Practised the demo once, start to finish', 'Know what to say when something breaks'], { at: 'end', title: 'Before you demo' }),
  ],

  // ── Language Models and Chatbots ────────────────────────────────────────
  'language-models/1': [
    table('tokens-table', 'Tokens: The Building Blocks', 'A table showing example sentences split into tokens, which can be whole words or pieces of words.', 'Models read tokens, not letters or words. Splits shown are illustrative.', ['Text', 'Tokens (illustrative)', 'Count'], [['Hello world', '"Hello" · " world"', 2], ['unbelievable', '"un" · "believ" · "able"', 3], ['ChatGPT is fun', '"Chat" · "G" · "PT" · " is" · " fun"', 5]]),
    V('attention', 'attention-it', 'The Transformer: How Prediction Actually Happens', 'An attention map for the sentence The cat sat because it was tired: choose a word to see which other words it pays most attention to; for the word it, most attention goes to cat.', 'Illustrative attention weights: "it" looks mostly at "cat".', {
      tokens: ['The', 'cat', 'sat', 'because', 'it', 'was', 'tired'],
      weights: [
        [0.5, 0.3, 0.1, 0.03, 0.03, 0.02, 0.02],
        [0.2, 0.45, 0.2, 0.05, 0.04, 0.03, 0.03],
        [0.05, 0.4, 0.3, 0.1, 0.05, 0.05, 0.05],
        [0.05, 0.15, 0.3, 0.3, 0.1, 0.05, 0.05],
        [0.03, 0.6, 0.07, 0.1, 0.1, 0.05, 0.05],
        [0.03, 0.2, 0.05, 0.05, 0.35, 0.22, 0.1],
        [0.03, 0.35, 0.05, 0.05, 0.25, 0.12, 0.15],
      ],
    }, { at: 'end' }),
  ],
  'language-models/2': [
    cards('message-roles', 'Understanding the `messages` List and Roles', 'Three cards for the three message roles: system sets the rules, user is the person asking, assistant is the model answering.', 'Every message in the list has a role.', [
      { title: 'system', badge: 'Rules', tone: 'accent', bullets: ['Sets behaviour and tone', 'Written by you, the developer'] },
      { title: 'user', badge: 'Question', tone: 'info', bullets: ['What the person typed'] },
      { title: 'assistant', badge: 'Answer', tone: 'good', bullets: ['What the model replied', 'Sent back in later turns as history'] },
    ]),
    sequence('api-call', 'Making Your First API Call', 'A sequence diagram: your Python program sends a request with an API key and messages to the OpenAI API, which sends back a reply.', 'One request, one response.', [['app', 'Your Python app'], ['api', 'OpenAI API']], [
      { from: 'app', to: 'api', label: 'POST chat completion', note: 'API key + messages' },
      { from: 'api', to: 'app', label: 'Response', note: 'the assistant’s reply + token usage', dashed: true },
    ], { at: 'end' }),
  ],
  'language-models/3': [
    cards('weak-vs-strong-prompt', 'Technique 1: Be Specific and Explicit', 'Two cards comparing a vague prompt with a specific prompt for the same task.', 'Specific prompts get focused answers.', [
      { title: 'Vague', badge: 'Weak', tone: 'bad', bullets: ['"Write about dogs."', 'Generic, unpredictable length and style'] },
      { title: 'Specific', badge: 'Strong', tone: 'good', bullets: ['"Write 3 sentences for 8-year-olds on why dogs wag their tails. Friendly tone."', 'Focused and ready to use'] },
    ]),
  ],
  'language-models/4': [
    sequence('chat-history', 'Building the Message History', 'A sequence diagram: on the second turn the app sends the system message, the first question, the first answer and the new question, because the model keeps no memory of its own.', 'The model forgets everything; your app re-sends the history each time.', [['app', 'Your app'], ['model', 'Language model']], [
      { from: 'app', to: 'model', label: 'Turn 1', note: 'system + user 1' },
      { from: 'model', to: 'app', label: 'Answer 1', dashed: true },
      { from: 'app', to: 'model', label: 'Turn 2', note: 'system + user 1 + answer 1 + user 2' },
      { from: 'model', to: 'app', label: 'Answer 2', dashed: true },
    ]),
    V('chart', 'context-growth', 'The Context Window Problem', 'A line chart where the number of tokens sent grows with every turn of a conversation because the whole history is re-sent.', 'Illustrative numbers: the prompt (and the cost) grows every turn.', {
      kind: 'line', xLabel: 'Turn', yLabel: 'Tokens sent', categories: ['1', '2', '3', '4', '5', '6', '7', '8'], series: [{ name: 'Tokens in the prompt', values: [150, 340, 560, 820, 1100, 1450, 1850, 2300] }],
    }),
  ],
  'language-models/5': [
    cards('persona-vs-purpose', 'Persona vs. Purpose', 'Two cards: persona is how the bot sounds, purpose is what job the bot is there to do.', 'A bot needs both.', [
      { title: 'Persona', badge: 'How it sounds', tone: 'accent', bullets: ['Voice, vocabulary, humour', 'e.g. a friendly space guide'] },
      { title: 'Purpose', badge: 'What it is for', tone: 'info', bullets: ['The job and its limits', 'e.g. help with homework questions, nothing else'] },
    ]),
    flow('system-prompt-anatomy', 'Anatomy of a Strong Persona/Purpose System Prompt', 'The parts of a strong system prompt in order: who the bot is, what it is for, how it speaks, what rules it follows, and what it must refuse.', 'A strong system prompt has clear parts.', ['Who it is|role and name', 'What it is for|the job', 'How it speaks|tone and length', 'Rules|always / never', 'Boundaries|what to refuse'], { perRow: 5, at: 'end' }),
  ],
  'language-models/6': [
    flow('rag-flow', 'What Is Retrieval-Augmented Generation (RAG)?', 'Retrieval-augmented generation: take the question, find the most relevant pieces of your own documents, add them to the prompt, and let the model answer using them.', 'Look things up first, then answer.', ['Question|from the user', 'Retrieve|find relevant chunks of your data', 'Augment|add them to the prompt', 'Generate|the model answers from them'], { perRow: 4 }),
  ],
  'language-models/7': [
    flow('streamlit-rerun', 'The Rerun Model', 'The Streamlit rerun cycle: the user does something, Streamlit runs the whole script again from the top, session state keeps what must be remembered, and the page is redrawn.', 'Every click reruns the script from the top.', ['User types or clicks', 'Whole script reruns|top to bottom', 'session_state|remembers values between runs', 'Page redraws'], { layout: 'cycle' }),
  ],
  'language-models/8': [
    flow('deploy-path', "Why Deployment Is a Different Beast Than Local Development", 'The deployment path: local project, push to GitHub without any secrets, deploy to Streamlit Community Cloud, add secrets in its settings, then share the public link.', 'Secrets never go in GitHub; they go in the host’s settings.', ['Local project|works on your machine', 'GitHub|code only — no keys!', 'Streamlit Cloud|builds and runs it', 'Secrets setting|API key added here', 'Public URL|share it'], { perRow: 5 }),
    checklist('push-checklist', 'Step 2: Push to GitHub Safely', 'A checklist to complete before pushing a project to GitHub.', 'Tick these off before every push. Saved on this device.', ['`.env` is listed in `.gitignore`', 'No API key appears anywhere in the code', '`requirements.txt` lists every package', 'A `.env.example` shows the variable names only', 'The app runs from a fresh clone'], { at: 'end', title: 'Safe to push?' }),
  ],
};

registerVisualCatalog(source);
