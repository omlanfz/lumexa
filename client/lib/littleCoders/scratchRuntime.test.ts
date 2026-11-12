// The stage runtime, run on the very scripts the lessons show (copied from the authored demos).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FRAME_MS, ScratchStage, normalizeKey, type StageDefinition } from './scratchRuntime';

const sprite = (id: string, label: string, x = 0, y = 0, costumes?: string[]) => ({ id, label, emoji: '🙂', x, y, ...(costumes ? { costumes } : {}) });
const frames = (stage: ScratchStage, n: number) => {
  for (let i = 0; i < n; i++) stage.tick();
};
const seconds = (stage: ScratchStage, s: number) => frames(stage, Math.round((s * 1000) / FRAME_MS));
const spriteOf = (stage: ScratchStage, id: string) => stage.view().sprites.find((s) => s.id === id && !s.isClone)!;

describe('1.1 Rocket Launch — a green-flag script with say and repeat', () => {
  const def: StageDefinition = {
    sprites: [sprite('rocket', 'Rocketship', 0, -120)],
    scripts: [
      {
        sprite: 'rocket',
        lines: ['events| when green flag clicked', 'motion| go to x: (0) y: (-120)', 'looks| say [Ready for launch!] for (2) seconds', 'control| repeat (10)', '  motion| change y by (20)', 'looks| say [Blast off!] for (2) seconds'],
      },
    ],
  };

  it('does nothing until the green flag is pressed', () => {
    const s = new ScratchStage(def);
    seconds(s, 3);
    assert.equal(spriteOf(s, 'rocket').y, -120);
    assert.equal(s.running, false);
  });

  it('says it, climbs ten steps of 20, says the last line, then stops by itself', () => {
    const s = new ScratchStage(def);
    s.greenFlag();
    frames(s, 2);
    assert.deepEqual(spriteOf(s, 'rocket').say, { text: 'Ready for launch!', think: false });
    seconds(s, 2.2);
    assert.ok(spriteOf(s, 'rocket').y > -120, 'it starts climbing after the first speech');
    seconds(s, 1);
    assert.equal(spriteOf(s, 'rocket').y, 80);
    assert.equal(spriteOf(s, 'rocket').say?.text, 'Blast off!');
    seconds(s, 2.5);
    assert.equal(spriteOf(s, 'rocket').say, null);
    assert.equal(s.running, false);
  });

  it('pressing the green flag again starts over', () => {
    const s = new ScratchStage(def);
    s.greenFlag();
    seconds(s, 4);
    s.greenFlag();
    assert.equal(spriteOf(s, 'rocket').y, -120);
  });

  it('stop halts every script and keeps the sprite where it is', () => {
    const s = new ScratchStage(def);
    s.greenFlag();
    seconds(s, 3);
    const y = spriteOf(s, 'rocket').y;
    s.stop();
    seconds(s, 3);
    assert.equal(spriteOf(s, 'rocket').y, y);
    assert.equal(s.running, false);
  });
});

describe('1.2 gliding and turning', () => {
  const def: StageDefinition = {
    sprites: [sprite('giga', 'Giga')],
    scripts: [{ sprite: 'giga', lines: ['events| when green flag clicked', 'motion| go to x: (0) y: (0)', 'motion| glide (1) secs to x: (-120) y: (60)', 'motion| turn ↻ (90) degrees'] }],
  };
  it('glides smoothly over the time asked and ends exactly on the spot', () => {
    const s = new ScratchStage(def);
    s.greenFlag();
    seconds(s, 0.5);
    const mid = spriteOf(s, 'giga');
    assert.ok(mid.x < -40 && mid.x > -100, `halfway, got ${mid.x}`);
    seconds(s, 0.7);
    const end = spriteOf(s, 'giga');
    assert.equal(end.x, -120);
    assert.equal(end.y, 60);
    assert.equal(end.direction, 180);
  });
});

describe('1.4 Control Your Rocket — keys', () => {
  const def: StageDefinition = {
    sprites: [sprite('rocket', 'Rocketship', 0, -60, ['🚀', '🔥'])],
    scripts: [
      { sprite: 'rocket', lines: ['events| when [right arrow] key pressed', 'motion| change x by (20)'] },
      { sprite: 'rocket', lines: ['events| when [left arrow] key pressed', 'motion| change x by (-20)'] },
      { sprite: 'rocket', lines: ['events| when [space] key pressed', 'looks| next costume'] },
    ],
  };
  it('moves while the key is held, and stops when it is let go', () => {
    const s = new ScratchStage(def);
    s.pressKey('right arrow');
    frames(s, 5);
    s.releaseKey('right arrow');
    const x = spriteOf(s, 'rocket').x;
    assert.ok(x >= 80, `moved right, got ${x}`);
    frames(s, 5);
    assert.equal(spriteOf(s, 'rocket').x, x);
  });
  it('left moves the other way; space changes the costume', () => {
    const s = new ScratchStage(def);
    s.pressKey('left arrow');
    frames(s, 2);
    s.releaseKey('left arrow');
    assert.ok(spriteOf(s, 'rocket').x < 0);
    s.pressKey(' ');
    frames(s, 1);
    s.releaseKey(' ');
    assert.equal(spriteOf(s, 'rocket').costume, 1);
  });
  it('knows the browser’s names for keys', () => {
    assert.equal(normalizeKey('ArrowRight'), 'right arrow');
    assert.equal(normalizeKey(' '), 'space');
    assert.equal(normalizeKey('A'), 'a');
  });
});

describe('1.7 broadcasts and costumes', () => {
  const def: StageDefinition = {
    sprites: [sprite('giga', 'Giga', 0, 0, ['A', 'B', 'C', 'D']), sprite('nano', 'Nano', 0, 0, ['A', 'B', 'C', 'D'])],
    scripts: [
      { sprite: 'giga', lines: ['events| when green flag clicked', 'events| broadcast [dance]'] },
      { sprite: 'giga', lines: ['events| when I receive [dance]', 'control| repeat (8)', '  looks| next costume', '  control| wait (0.2) seconds'] },
      { sprite: 'nano', lines: ['events| when I receive [dance]', 'control| repeat (8)', '  looks| next costume', '  control| wait (0.2) seconds'] },
    ],
  };
  it('everyone who hears the message dances', () => {
    const s = new ScratchStage(def);
    s.greenFlag();
    seconds(s, 0.5);
    assert.ok(spriteOf(s, 'giga').costume > 0);
    assert.ok(spriteOf(s, 'nano').costume > 0);
    seconds(s, 3);
    // 8 costume changes on a 4-costume sprite come back to the start.
    assert.equal(spriteOf(s, 'giga').costume, 0);
    assert.equal(spriteOf(s, 'nano').costume, 0);
    assert.equal(s.running, false);
  });
});

describe('1.8 hide, show and a message', () => {
  const def: StageDefinition = {
    sprites: [sprite('giga', 'Giga'), sprite('puppy', 'Puppy')],
    scripts: [
      { sprite: 'giga', lines: ['events| when green flag clicked', 'looks| say [Oh no!] for (1) seconds', 'events| broadcast [found]'] },
      { sprite: 'puppy', lines: ['events| when green flag clicked', 'looks| hide', 'events| when I receive [found]', 'looks| show', 'looks| say [Woof!] for (1) seconds'] },
    ],
  };
  it('the puppy is hidden until it is found', () => {
    const s = new ScratchStage(def);
    s.greenFlag();
    seconds(s, 0.3);
    assert.equal(spriteOf(s, 'puppy').visible, false);
    seconds(s, 1.5);
    assert.equal(spriteOf(s, 'puppy').visible, true);
    assert.equal(spriteOf(s, 'puppy').say?.text, 'Woof!');
  });
});

describe('2.3 Star Collector — touching, variables and random', () => {
  const def: StageDefinition = {
    sprites: [sprite('bowl', 'Bowl', 0, -140), sprite('star', 'Star', 0, 170)],
    scripts: [
      { sprite: 'bowl', lines: ['events| when green flag clicked', 'motion| go to x: (0) y: (-140)', 'control| forever', '  control| if {key [left arrow] pressed?} then', '    motion| change x by (-8)', '  control| if {key [right arrow] pressed?} then', '    motion| change x by (8)'] },
      {
        sprite: 'star',
        lines: [
          'events| when green flag clicked',
          'variables| set [score] to (0)',
          'control| forever',
          '  motion| change y by (-6)',
          '  control| if {touching [Bowl]?} then',
          '    variables| change [score] by (1)',
          '    sound| start sound [collect]',
          '    motion| go to x: (pick random (-200) to (200)) y: (170)',
          '  control| if {(y position) < (-170)} then',
          '    motion| go to x: (pick random (-200) to (200)) y: (170)',
        ],
      },
    ],
  };
  it('the star falls, the score starts at 0, and a catch scores one point and restarts the star', () => {
    // pick random (-200)…(200) → 0 puts the star right above the bowl again.
    const s = new ScratchStage(def, { rand: () => 0.5 });
    s.greenFlag();
    seconds(s, 0.2);
    assert.deepEqual(s.view().variables, [['score', '0']]);
    seconds(s, 4);
    const score = Number(s.view().variables.find(([k]) => k === 'score')![1]);
    assert.ok(score >= 1, `caught at least once, score ${score}`);
    assert.ok(spriteOf(s, 'star').y <= 170);
  });
  it('a miss sends the star back to the top without scoring', () => {
    const s = new ScratchStage(def, { rand: () => 0 }); // x = -200: far from the bowl at x = 0
    s.greenFlag();
    seconds(s, 0.2);
    // Put the bowl far away by holding left, then let the star fall.
    s.pressKey('left arrow');
    seconds(s, 4);
    s.releaseKey('left arrow');
    assert.equal(s.view().variables[0][1], '0');
  });
  it('shows a ♪ chip for a sound — the demo itself stays silent', () => {
    const s = new ScratchStage(def, { rand: () => 0.5 });
    s.greenFlag();
    let seen = false;
    for (let i = 0; i < 200 && !seen; i++) {
      s.tick();
      if (spriteOf(s, 'star').sound === 'collect') seen = true;
    }
    assert.equal(seen, true);
  });
});

describe('2.4 Keycard Escape — if / else', () => {
  const def: StageDefinition = {
    sprites: [sprite('giga', 'Giga', 0, 0), sprite('key', 'Key', 0, 0), sprite('ship', 'Rocketship', 0, 0)],
    scripts: [
      { sprite: 'giga', lines: ['events| when green flag clicked', 'variables| set [hasKey] to (0)', 'control| forever', '  control| if {touching [Key]?} then', '    variables| set [hasKey] to (1)'] },
      {
        sprite: 'ship',
        lines: ['events| when green flag clicked', 'control| forever', '  control| if {touching [Giga]?} then', '    control| if {(hasKey) = (1)} then', '      looks| say [Escaped!] for (2) seconds', '      control| stop [all]', '    control| else', '      looks| say [Locked! Find the keycard.] for (1) seconds'],
      },
    ],
  };
  it('with the key: escape, and everything stops once the speech is over', () => {
    const s = new ScratchStage(def);
    s.greenFlag();
    seconds(s, 0.3);
    assert.equal(spriteOf(s, 'ship').say?.text, 'Escaped!');
    assert.equal(s.running, true);
    seconds(s, 2.2);
    assert.equal(s.running, false);
  });
  it('without the key: locked', () => {
    const away: StageDefinition = { ...def, sprites: [sprite('giga', 'Giga', 0, 0), sprite('key', 'Key', 200, 100), sprite('ship', 'Rocketship', 0, 0)] };
    const s = new ScratchStage(away);
    s.greenFlag();
    seconds(s, 0.3);
    assert.equal(spriteOf(s, 'ship').say?.text, 'Locked! Find the keycard.');
    assert.equal(s.running, true);
  });
});

describe('2.5 Mystery Prize Machine — nested if / else with random', () => {
  const def: StageDefinition = {
    sprites: [sprite('gift', 'Gift')],
    scripts: [
      {
        sprite: 'gift',
        lines: [
          'events| when this sprite clicked',
          'variables| set [prize] to (pick random (1) to (3))',
          'control| if {(prize) = (1)} then',
          '  looks| say [A shiny crystal!] for (2) seconds',
          'control| else',
          '  control| if {(prize) = (2)} then',
          '    looks| say [A space puppy!] for (2) seconds',
          '  control| else',
          '    looks| say [A golden star!] for (2) seconds',
        ],
      },
    ],
  };
  for (const [r, text] of [
    [0, 'A shiny crystal!'],
    [0.5, 'A space puppy!'],
    [0.99, 'A golden star!'],
  ] as const) {
    it(`a roll of ${r} says “${text}”`, () => {
      const s = new ScratchStage(def, { rand: () => r });
      s.clickSprite(s.view().sprites[0].uid);
      frames(s, 2);
      assert.equal(s.view().sprites[0].say?.text, text);
    });
  }
});

describe('2.6 lives, timer and stop', () => {
  const def: StageDefinition = {
    sprites: [sprite('ship', 'Rocketship', 0, -130), sprite('rock', 'Rocks', 0, 170)],
    scripts: [
      { sprite: 'ship', lines: ['events| when green flag clicked', 'variables| set [lives] to (3)', 'sensing| reset timer', 'control| forever', '  control| if {key [left arrow] pressed?} then', '    motion| change x by (-8)'] },
      { sprite: 'rock', lines: ['events| when green flag clicked', 'control| forever', '  motion| change y by (-6)', '  control| if {touching [Rocketship]?} then', '    variables| change [lives] by (-1)', '    motion| go to x: (0) y: (170)', '  control| if {(lives) < (1)} then', '    looks| say [Game over!] for (2) seconds', '    control| stop [all]'] },
    ],
  };
  it('loses a life per hit until the game is over, then everything stops', () => {
    const s = new ScratchStage(def);
    s.greenFlag();
    let over = false;
    for (let i = 0; i < 30 * 40 && !over; i++) {
      s.tick();
      if (spriteOf(s, 'rock').say?.text === 'Game over!') over = true;
    }
    assert.equal(over, true, 'the game ends');
    assert.equal(s.view().variables.find(([k]) => k === 'lives')![1], '0');
    seconds(s, 2.5);
    assert.equal(s.running, false);
  });
});

describe('2.7 levels: wait until and broadcast', () => {
  it('moves to the next level when the score reaches 3', () => {
    const def: StageDefinition = {
      sprites: [sprite('star', 'Star')],
      scripts: [
        { sprite: 'star', lines: ['events| when green flag clicked', 'variables| set [score] to (0)', 'variables| set [speed] to (4)', 'control| wait (0.3) seconds', 'variables| set [score] to (3)'] },
        { sprite: 'star', lines: ['events| when green flag clicked', 'control| wait until {(score) = (3)}', 'events| broadcast [level 2]'] },
        { sprite: 'star', lines: ['events| when I receive [level 2]', 'looks| switch backdrop to [Galaxy]', 'variables| set [speed] to (7)'] },
      ],
    };
    const s = new ScratchStage(def, { backdrop: undefined } as never);
    s.greenFlag();
    seconds(s, 0.1);
    assert.notEqual(s.view().backdrop, 'Galaxy');
    seconds(s, 0.5);
    assert.equal(s.view().backdrop, 'Galaxy');
    assert.equal(s.view().variables.find(([k]) => k === 'speed')![1], '7');
  });
});

describe('2.8 clones', () => {
  const def: StageDefinition = {
    sprites: [sprite('ship', 'Rocketship', 0, -140), sprite('laser', 'Lightning', 0, -140)],
    scripts: [
      { sprite: 'ship', lines: ['events| when [space] key pressed', 'control| create clone of [Lightning]'] },
      { sprite: 'laser', lines: ['events| when green flag clicked', 'looks| hide', 'control| when I start as a clone', 'motion| go to x: (0) y: (-120)', 'looks| show', 'control| repeat (30)', '  motion| change y by (10)', 'control| delete this clone'] },
    ],
  };
  it('each shot is a clone that flies up and then disappears', () => {
    const s = new ScratchStage(def);
    s.greenFlag();
    frames(s, 2);
    assert.equal(spriteOf(s, 'laser').visible, false);
    s.pressKey('space');
    frames(s, 3);
    s.releaseKey('space');
    const clones = s.view().sprites.filter((x) => x.isClone);
    assert.ok(clones.length >= 1);
    assert.equal(clones[0].visible, true);
    assert.ok(clones[0].y > -120);
    seconds(s, 3);
    assert.equal(s.view().sprites.filter((x) => x.isClone).length, 0);
  });
});

describe('safety', () => {
  it('a block it does not know is reported, not guessed at', () => {
    const s = new ScratchStage({ sprites: [sprite('a', 'A')], scripts: [{ sprite: 'a', lines: ['events| when green flag clicked', 'motion| teleport to the moon'] }] });
    s.greenFlag();
    frames(s, 2);
    assert.deepEqual([...s.unknownBlocks], ['teleport to the moon']);
  });
  it('a script for a sprite that does not exist is ignored', () => {
    assert.doesNotThrow(() => new ScratchStage({ sprites: [sprite('a', 'A')], scripts: [{ sprite: 'ghost', lines: ['events| when green flag clicked'] }] }));
  });
  it('clones are capped so a runaway script cannot freeze the page', () => {
    const s = new ScratchStage({ sprites: [sprite('a', 'A')], scripts: [{ sprite: 'a', lines: ['events| when green flag clicked', 'control| forever', '  control| create clone of [myself]'] }] });
    s.greenFlag();
    frames(s, 400);
    assert.ok(s.view().sprites.length <= 70);
  });
});
