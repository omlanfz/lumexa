// FILE PATH: server/src/curriculum/lesson-content/catalog/mcq/game-creator.ts
//
// Four-option multiple-choice versions of the Game Creator pathway's descriptive quiz
// questions (keyed by lineage key). See ai-builder.ts for how a rewrite is found and what
// happens to the questions that are not rewritten.

import { registerMcqRewrites } from '../../quiz-mcq';
import { rw } from '../helpers';

registerMcqRewrites({
  'python-arcade-games/2': [
    rw('In your own words, what are the four steps of a game loop', ['Handle events, update the state, draw everything, then tick the clock', 'Draw everything, load the assets, save the score, then close the window', 'Start the game, pause the game, restart the game, then quit the program', 'Update the state, compile the code, upload the game, then start over'], 'Every frame does the same four jobs in the same order: handle events → update state → draw → tick the clock.', { prompt: 'What are the four steps of a game loop, in order?' }),
    rw('What\'s the difference between `pygame.event.get()` and `pygame.key.get_pressed()`', ['`event.get()` reads one-off events; `get_pressed()` reports which keys are held right now', '`event.get()` draws the events on the screen; `get_pressed()` saves the keys to a file', '`event.get()` is for the keyboard only, while `get_pressed()` is for the mouse only', '`event.get()` runs once at start-up, while `get_pressed()` runs once at shutdown'], 'Use the event queue for things that happen once (quit, a key going down). Use `get_pressed()` for "is this key being held right now?", which is what continuous movement needs.', { prompt: 'What is the difference between `pygame.event.get()` and `pygame.key.get_pressed()`?' }),
    rw('Why do we multiply movement by `dt`', ['It keeps the speed the same whatever the frame rate is', 'It makes the ship speed up a little more on every frame', 'It stops the ship from moving off the edge of the screen', 'It changes the ship\'s colour as the frame rate changes'], 'Speed is then measured in pixels per second instead of pixels per frame, so a slow computer and a fast computer move the ship the same distance in one second.'),
    rw('Predict: if `FPS = 60` and `clock.tick(FPS)` returns roughly `16`', ['0.016', '16', '1.6', '0.16'], '`dt = clock.tick(FPS) / 1000.0`, so 16 milliseconds becomes 16 / 1000 = 0.016 seconds.'),
    rw('What would happen if you removed `screen.fill(BLACK)`', ['Old frames would smear: the ship would leave a trail behind it', 'The screen would stay black and nothing would be drawn at all', 'The game would run noticeably faster because less work is done', 'The game would crash on the very first frame with an error'], 'Each frame is drawn on top of the last one. `screen.fill(...)` wipes the screen first, so without it every old position of the ship stays visible.'),
  ],
});
