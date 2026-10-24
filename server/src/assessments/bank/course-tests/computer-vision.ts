// FILE PATH: server/src/assessments/bank/course-tests/computer-vision.ts
//
// AI Builder Path → "Computer Vision Projects" (8 lessons, 3 projects: Real-Time
// Emotion Detector, Object Recognition, Motion-Activated Security Cam).
// Topics: 1 pixels & arrays · 2 OpenCV image processing · 3 face detection ·
// 4 expression classification (CNN) · 5 object detection (YOLO) · 6 real-time
// webcam loops · 7 structuring a full app · 8 packaging, demos & honest
// presentation.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

export const computerVision = bank({
  id: 'course-test/computer-vision',
  title: 'Computer Vision Projects — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Pixels and arrays ────────────────────────────────────────
    mcq(
      1,
      'In an 8-bit grayscale image, what does a pixel value of 255 represent?',
      'Pure white',
      ['Pure black', 'A medium gray', 'A missing pixel'],
      'In 8-bit grayscale 0 is pure black, 255 is pure white, and the values in between are shades of gray.',
    ),
    mcq(
      1,
      'A colour image is 1280 pixels wide and 720 pixels tall. Which array shape does NumPy report for it?',
      '(720, 1280, 3)',
      ['(1280, 720, 3)', '(3, 720, 1280)', '(720, 1280)'],
      'Image arrays are (height, width, channels): 720 rows, 1280 columns and 3 colour channels.',
    ),
    mcq(
      1,
      'OpenCV reports one pixel of an image as `[255, 0, 0]`. What colour is that pixel?',
      'Blue',
      ['Red', 'Green', 'White'],
      'OpenCV stores channels in BGR order, so the first number is blue: [255, 0, 0] is pure blue. (In RGB order the same numbers would mean red.)',
    ),
    codeOut(
      1,
      'python',
      `import numpy as np

pixels = np.array([250], dtype=np.uint8)
print(pixels + 10)`,
      '[4]',
      ['[260]', '[255]', '[0]'],
      'A uint8 value can only hold 0–255, so 250 + 10 wraps around (260 − 256 = 4) instead of clipping. Convert to a larger type such as int16 before doing maths that might exceed 255.',
      'What is printed when this code runs?',
      { requires: ['numpy'] },
    ),

    // ── Lesson 2 · OpenCV image processing ──────────────────────────────────
    mcq(
      2,
      'What does `cv2.imread("photo.jpg")` return?',
      'A NumPy array of pixel values, in BGR channel order',
      [
        'A window that displays the photo',
        "A list of the photo's file properties",
        'A text description of what the photo shows',
      ],
      'imread loads the file into memory as a NumPy array. Because OpenCV uses BGR order, the channels must be converted before showing the image with libraries that expect RGB.',
    ),
    codeOut(
      2,
      'python',
      `import cv2
import numpy as np

img = np.zeros((300, 300, 3), dtype=np.uint8)
small = cv2.resize(img, (100, 200))
print(small.shape)`,
      '(200, 100, 3)',
      ['(100, 200, 3)', '(100, 200)', '(300, 300, 3)'],
      'cv2.resize takes (width, height), so the new image is 100 pixels wide and 200 tall. NumPy then reports (height, width, channels) = (200, 100, 3).',
      'What is printed when this code runs?',
      { requires: ['cv2', 'numpy'] },
    ),
    codeOut(
      2,
      'python',
      `import numpy as np

image = np.zeros((480, 640, 3), dtype=np.uint8)
crop = image[100:200, 50:350]
print(crop.shape)`,
      '(100, 300, 3)',
      ['(300, 100, 3)', '(200, 350, 3)', '(100, 300)'],
      'Cropping is just NumPy slicing in the order image[y1:y2, x1:x2]: 100 rows (y 100–199), 300 columns (x 50–349), and all 3 colour channels are kept.',
      'What is printed when this code runs?',
      { requires: ['numpy'] },
    ),
    mcq(
      2,
      'Which of these calls fails because of the size of its kernel?',
      '`cv2.GaussianBlur(img, (4, 4), 0)`',
      [
        '`cv2.GaussianBlur(img, (3, 3), 0)`',
        '`cv2.GaussianBlur(img, (5, 5), 0)`',
        '`cv2.GaussianBlur(img, (7, 7), 0)`',
      ],
      'A blur kernel needs a well-defined centre pixel, so its size must be odd (3, 5, 7…). An even size such as (4, 4) raises an error.',
    ),

    // ── Lesson 3 · Face detection ───────────────────────────────────────────
    mcq(
      3,
      'Why do we usually use a pre-trained face detector instead of training one from scratch?',
      'Training one from scratch needs thousands of labelled photos and a lot of computing power',
      [
        'Only a pre-trained model is able to detect faces in grayscale images',
        'A pre-trained model can also recognise exactly who each person is',
        'Training a face detector is not possible in Python',
      ],
      'Researchers have already trained and shared models for common tasks such as face detection, so we can use them for free without collecting a large dataset.',
    ),
    codeOut(
      3,
      'python',
      `x, y, w, h = (120, 80, 60, 40)
print(x + w, y + h)`,
      '180 120',
      ['60 40', '120 80', '180 140'],
      'A detection is (x, y, width, height): the top-left corner plus the size. The opposite corner is (x + w, y + h) = (180, 120) — the two points cv2.rectangle needs to draw the box.',
      'A detector returns one face as a box (x, y, width, height). What does this code print?',
    ),
    mcq(
      3,
      'You set `minNeighbors` very low in `detectMultiScale`. What is the most likely result?',
      'Many overlapping false-positive boxes, especially on textured backgrounds',
      [
        'The detector refuses to run',
        'Every real face is missed',
        'The image is converted back to colour',
      ],
      'minNeighbors is how many overlapping candidate detections must agree before a face is confirmed. Set too low, weak and spurious candidates get through.',
    ),
    mcq(
      3,
      'A face detector draws a bounding box around a face. What information does that box carry?',
      'Where a face-like region is — nothing about who the person is or how they feel',
      [
        'The name of the person',
        'The emotion the person is feeling',
        'Whether the person is telling the truth',
      ],
      'Detection only finds face-shaped regions. Recognition (who) and expression classification (what the face shows) are separate steps.',
    ),

    // ── Lesson 4 · Expression classification ────────────────────────────────
    mcq(
      4,
      'What is the key difference between a Haar Cascade and a CNN?',
      'A CNN learns the patterns to look for from labelled examples; Haar-like features were designed by people',
      [
        'A CNN needs no training data, while a Haar Cascade needs thousands of labelled images',
        'A CNN is faster because it ignores the pixels of the image',
        'A Haar Cascade learns millions of weights; a CNN uses a few fixed rectangles',
      ],
      'A CNN adjusts millions of internal weights during training to discover useful patterns by itself, instead of relying on rectangles a researcher chose by hand.',
    ),
    mcq(
      4,
      'What does the softmax output layer of an expression classifier produce?',
      'One probability per expression class, all adding up to 1',
      [
        'The single best expression as a word',
        'A cropped copy of the face',
        'The pixel values of the strongest edge',
      ],
      "Softmax turns the final scores into probabilities between 0 and 1 that sum to 1. The highest one is the model's top guess.",
    ),
    mcq(
      4,
      'A classifier outputs "happy" with a confidence of 0.62. What does that number mean?',
      "The model's estimated probability, based on how closely the face matches patterns it learned — not a guarantee",
      [
        'The person is exactly 62% happy',
        'The prediction is certainly correct, because it is above 0.5',
        'The face fills 62% of the image',
      ],
      'A confidence score reflects similarity to the training patterns. It is not proof of what the person really feels, so always report it next to the label.',
    ),
    mcq(
      4,
      'In which order should a face be prepared before the expression model sees it?',
      'Detect the face, crop it, convert to grayscale, resize it, then divide the pixel values by 255',
      [
        'Resize the whole photo, divide the pixel values by 255, then detect and crop the face',
        'Divide the pixel values by 255, convert to grayscale, then detect the face and resize it',
        'Crop the face, then detect it, then resize it and convert it to grayscale',
      ],
      "The crop needs the detection result, and the image must match what the network was trained on: grayscale, the model's input size (such as 48×48) and pixel values scaled to 0–1.",
    ),

    // ── Lesson 5 · Object detection with YOLO ───────────────────────────────
    mcq(
      5,
      'What does the name "You Only Look Once" (YOLO) describe?',
      'One pass of the image through a single network predicts the boxes and classes together',
      [
        'The model may only be run one time per image',
        'Each object has to be photographed once before it can be detected',
        'A person checks every detection once by hand',
      ],
      'Unlike a sliding-window cascade, YOLO divides the image into a grid and predicts boxes and classes for many regions at once in a single network pass — which is why it can run in real time.',
    ),
    mcq(
      5,
      'A YOLO model trained on COCO is pointed at a rare plant that is not one of its 80 classes. What is the likely result?',
      'It misses the plant, or mislabels it as the closest class it does know',
      [
        "It learns the plant's name automatically",
        'It reports the plant as "unknown" with 100% confidence',
        'It refuses to process the image',
      ],
      'COCO is a closed vocabulary: the model can only output labels from its fixed list, sometimes with a confident-looking score.',
    ),
    mcq(
      5,
      'What is the trade-off of choosing a larger YOLOv8 model such as `m` or `l` instead of the nano model?',
      'It is usually more accurate, but slower',
      [
        'It is faster, but less accurate',
        'It can detect objects outside the COCO classes',
        'It uses less computing power',
      ],
      'Smaller models run faster with somewhat lower accuracy; larger models are more accurate but slower. Nano is the usual starting point for real-time laptop work.',
    ),
    mcq(
      5,
      'You set the confidence threshold to a very low value such as 0.05. What is the most likely effect?',
      'Many low-quality, probably spurious detections appear in the output',
      [
        'Real objects are silently lost',
        'Only the largest object in each frame is reported',
        'The model switches to a different set of classes',
      ],
      'A low threshold lets almost every guess through. A threshold that is too high does the opposite and hides real objects.',
    ),

    // ── Lesson 6 · Real-time webcam processing ──────────────────────────────
    mcq(
      6,
      'In `ret, frame = cap.read()`, what does `ret` tell you?',
      'Whether a frame was read successfully',
      [
        'How many frames per second the camera produces',
        'Which camera is being used',
        'How bright the frame is',
      ],
      'ret is False when the camera disconnects or a video file ends. Always check it, otherwise the next line tries to process a None frame and crashes.',
    ),
    mcq(
      6,
      'What happens if a real-time video loop never calls `cv2.waitKey()`?',
      'The display window never updates or responds',
      [
        'The camera turns off after one frame',
        'The window opens in full-screen mode',
        'The frames are saved to disk automatically',
      ],
      'waitKey pauses for a moment and lets OpenCV process window events and keyboard input. Without it, imshow windows look frozen or never render.',
    ),
    mcq(
      6,
      'Where should a detection model be loaded in a real-time video program?',
      'Once, before the loop starts',
      [
        'At the start of every pass through the loop',
        'Only after the user presses a key',
        'Twice per second, to keep it fresh',
      ],
      'Reloading a model inside the per-frame loop would be catastrophically slow. Load it once and reuse it for every frame.',
    ),
    codeOut(
      6,
      'python',
      `elapsed = 0.04
fps = 1.0 / elapsed
print(fps)`,
      '25.0',
      ['0.04', '4.0', '250.0'],
      'If processing one frame takes 0.04 seconds, the program can handle 1 / 0.04 = 25 frames every second.',
      'Processing one frame takes 0.04 seconds. What does this code print?',
    ),

    // ── Lesson 7 · A full computer vision app ───────────────────────────────
    mcq(
      7,
      'Which layer of a well-structured vision app takes a frame in and returns structured detection results, without knowing how they will be displayed?',
      'The processing / inference layer',
      [
        'The rendering / display layer',
        'The capture layer',
        'The orchestration layer (main)',
      ],
      'Processing turns frames into results (boxes, labels, scores). Rendering draws them, capture supplies frames, and main() wires the pieces together.',
    ),
    mcq(
      7,
      'Why collect values such as `scaleFactor` and the confidence threshold in one configuration object?',
      'The behaviour can be tuned in one place instead of hunting for numbers scattered through the code',
      [
        'The program then runs faster',
        'Python only lets a value be defined once',
        'It removes the need for a detection model',
      ],
      'A config object avoids "magic numbers" repeated inline, and the rest of the code then reads like a description of what happens.',
    ),
    mcq(
      7,
      'A video frame contains no detections. How should the app log that?',
      'As a normal INFO message, because "nothing found" is an expected result',
      [
        'As an ERROR, because something has gone wrong',
        'As a CRITICAL alert, and then stop the program',
        'Only with a print() statement, because logging is for errors',
      ],
      '"No detections" is a normal outcome. Logging it as an error creates alarming, misleading logs and hides the real problems.',
    ),

    // ── Lesson 8 · Demos and honest presentation ────────────────────────────
    mcq(
      8,
      'Which sentence describes an expression-classifying demo most honestly?',
      'It classifies facial expression patterns, and its guesses can be wrong or biased',
      [
        'It reads exactly how people feel',
        'It can tell when a person is lying',
        'It works equally well for everyone in every lighting condition',
      ],
      'Honest vocabulary matters: the system only sees pixels of a face, not feelings, and its accuracy depends on its training data and conditions.',
    ),
    mcq(
      8,
      'The webcam fails in the middle of your live demo. What should you have prepared?',
      'A fallback plan, such as a recorded video of the project working',
      [
        'A longer introduction to fill the time',
        'A promise to run the demo again next week',
        'Nothing — a project that was tested cannot fail on the day',
      ],
      'Live demos depend on hardware and connections. A backup, such as a recording, lets you recover gracefully instead of ending in silence.',
    ),
    mcq(
      8,
      'What does "reproducibility" mean for a shared project?',
      'Another person following your instructions gets the same working result',
      [
        'The project runs faster every time it is repeated',
        'The project can be copied without crediting you',
        'The project uses only one library',
      ],
      'A reproducible project works for other people, not just on your own machine — which is why accurate instructions and a complete list of dependencies matter.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'Writing `modified = tiny_grayscale` (without `.copy()`) creates a separate copy of the image array.',
      false,
      'Both names point to the same array in memory, so changing `modified` silently changes `tiny_grayscale` too. Use `.copy()` for an independent copy.',
    ),
    tf(
      2,
      'Convolution slides a small grid of numbers (a kernel) across an image, multiplying and adding up the pixel values underneath it at each position.',
      true,
      'Blurring, sharpening and edge detection all use this sliding multiply-and-sum idea with different kernels.',
    ),
    tf(
      3,
      'A Haar Cascade face detector expects a single-channel (grayscale) image as its input.',
      true,
      'Passing a colour image either raises an error or gives poor results, so convert it to grayscale first.',
    ),
    tf(
      4,
      'It is more accurate to call an expression classifier a "facial expression pattern classifier" than an "emotion detector".',
      true,
      'The model classifies visible patterns in a face. It has no access to what a person actually feels.',
    ),
    tf(
      4,
      'A model trained mostly on faces from one group of people can be assumed to be just as accurate for every other group.',
      false,
      'Models inherit the gaps in their training data. They should be tested on diverse data before being trusted.',
    ),
    tf(
      5,
      '`box.xyxy` returns floating-point coordinates, so they should be converted with `int()` before being passed to `cv2.rectangle`.',
      true,
      'Passing floats straight to cv2.rectangle raises an error, so convert the coordinates to integers first.',
    ),
    tf(
      6,
      'Calling `cap.release()` when the loop ends frees the camera so other programs, or your next run, can use it.',
      true,
      'Forgetting to release the camera can lock other programs out of the device.',
    ),
    tf(
      7,
      'Using `except: pass` to silence every error is good practice, because it keeps the program running smoothly.',
      false,
      'Swallowing exceptions silently hides real bugs. Handle the failures you expect and log the rest.',
    ),
    tf(
      7,
      "A responsible-AI checklist should be revisited whenever the application's capabilities change, not just once at the end.",
      true,
      'A new feature can change what the system does and how it could be misused, so the checklist is a continuing habit.',
    ),
    tf(
      8,
      'If your live demo worked once at home, you do not need a backup plan for the day of the presentation.',
      false,
      'Cameras, files and connections can fail on the day, so a fallback plan is always part of preparing a live demo.',
    ),
  ],
});

// Position 2 of the AI Builder Final Test (Computer Vision is not part of the
// Odyssey, so it has no stage or Odyssey share).
export const computerVisionExtras: ModuleExtras = {
  final: {
    mcq: [
      codeOut(
        1,
        'python',
        `import numpy as np

gray = np.zeros((480, 640), dtype=np.uint8)
color = np.zeros((480, 640, 3), dtype=np.uint8)
print(gray.ndim, color.ndim)`,
        '2 3',
        ['2 2', '3 3', '1 2'],
        'A grayscale image has two dimensions (rows and columns). A colour image adds a third dimension for the channels.',
        'What is printed when this code runs?',
        { requires: ['numpy'] },
      ),
      mcq(
        2,
        'Why is the HSV colour space often easier than BGR for finding everything that is red?',
        'Hue stores the colour itself separately from how bright it is',
        [
          'HSV images use fewer pixels than BGR images',
          'HSV stores each pixel as one number from 0 to 255',
          'HSV is the only colour space OpenCV can display',
        ],
        'Because hue isolates colour identity from brightness, "red" can be selected with one hue range even in light and shadow.',
      ),
      mcq(
        2,
        'Why is an image usually blurred before running Canny edge detection?',
        'Blurring smooths out sensor noise that would otherwise be reported as false edges',
        [
          'Canny only accepts images that have been blurred',
          'Blurring makes the image larger so edges are easier to see',
          'Blurring converts the image to grayscale',
        ],
        'Edge detectors look for sudden brightness jumps, and noise creates lots of them. A light blur leaves the real object boundaries.',
      ),
      mcq(
        3,
        'Compared with a `scaleFactor` of 1.3, what does a `scaleFactor` of 1.05 do?',
        'It checks many more image sizes, so it can find more faces but runs slower',
        [
          'It makes the detector run faster but find fewer faces',
          'It increases the number of neighbours required',
          'It converts the image back to colour',
        ],
        'scaleFactor is how much the image shrinks between passes. Values closer to 1.0 scan more scales: better coverage, slower speed.',
      ),
      mcq(
        4,
        'What is the purpose of a pooling layer in a CNN?',
        'To shrink the feature maps, cutting computation and making the network less sensitive to exact pixel positions',
        [
          'To sharpen the image before it is classified',
          'To turn the final scores into probabilities',
          'To attach labels to the training images',
        ],
        'Pooling (for example, taking the maximum of each small block) keeps the key information while making the data smaller.',
      ),
      mcq(
        5,
        'In a YOLO result, what is a "class index"?',
        'An integer that says which of the trained categories the detection belongs to',
        [
          'The position of the box inside the image',
          'The confidence of the detection',
          'The number of objects found in the frame',
        ],
        'The class index maps to a name in the model\'s list of classes, for example index 0 might be "person".',
      ),
      mcq(
        6,
        'A laptop shows laggy video because YOLO runs on every single frame. Which change helps most with the least loss of responsiveness?',
        'Run the heavy detection on every 3rd frame while still displaying every frame',
        [
          'Reload the model on each frame so it stays fresh',
          'Run the detection at a higher resolution',
          'Remove the call to cv2.waitKey',
        ],
        'Scenes rarely change much within a few frames, so frame skipping keeps the display smooth. Reloading the model or raising the resolution would make things slower.',
      ),
      mcq(
        7,
        'An app prints "HAPPY" for every face, even when the model\'s top score is only 0.31. Which responsible-AI checklist idea does this break?',
        'Uncertainty handling: low-confidence output should degrade gracefully, for example to "Uncertain"',
        [
          'Accurate labelling: the label text must match what the model does',
          'Known limitations documented: the README must list the limits',
          'Transparency to those observed: people should know they are being watched',
        ],
        'Forcing a confident-looking label out of a weak prediction misleads viewers. Low-confidence results should be shown as uncertain.',
      ),
    ],
    trueFalse: [
      tf(
        6,
        'Running heavy inference at full resolution on every single frame can leave a real-time app with an unusably low frame rate on modest hardware.',
        true,
        'Processing time per frame limits the FPS. Smaller models, frame skipping and downscaling are the practical fixes.',
      ),
      tf(
        5,
        "A confidence score of 0.95 means the detector's prediction is certainly correct.",
        false,
        'A high score means the image closely matches patterns in the training data. It is not a guarantee, and models can be confidently wrong.',
      ),
    ],
  },
};
