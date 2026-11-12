import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addExample, best, isTrainable, missingExamples, newModel, percent, predict, totalExamples } from './aiSim';

const names = ['Apple', 'Banana', 'Bread'];
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('the practice model', () => {
  it('knows nothing at first: every class is equally likely', () => {
    const p = predict(newModel(names), 0, 'close');
    for (const x of p) assert.ok(Math.abs(x - 1 / 3) < 1e-9);
  });

  it('probabilities always add up to 1', () => {
    let m = newModel(names);
    for (let i = 0; i < 12; i++) {
      m = addExample(m, i % 3, ['close', 'far', 'dim'][i % 3]);
      for (let c = 0; c < 3; c++) assert.ok(Math.abs(sum(predict(m, c, 'bright')) - 1) < 1e-9);
    }
  });

  it('more examples make it more confident', () => {
    let m = newModel(names);
    let last = predict(m, 0, 'close')[0];
    for (let i = 0; i < 10; i++) {
      m = addExample(m, 0, 'close');
      const now = predict(m, 0, 'close')[0];
      assert.ok(now > last);
      last = now;
    }
    assert.ok(last > 0.8);
    assert.ok(last <= 0.98, 'never certain');
  });

  it('a condition it never saw is harder; varied examples fix that', () => {
    let narrow = newModel(names);
    narrow = addExample(narrow, 0, 'close', 10);
    const seen = predict(narrow, 0, 'close')[0];
    const unseen = predict(narrow, 0, 'dim')[0];
    assert.ok(unseen < seen - 0.2, `unseen ${unseen} should be clearly lower than ${seen}`);

    let varied = newModel(names);
    for (const c of ['close', 'far', 'bright', 'dim', 'tilted']) varied = addExample(varied, 0, c, 2);
    const variedDim = predict(varied, 0, 'dim')[0];
    assert.ok(variedDim > unseen + 0.2);
  });

  it('knows who is the best guess', () => {
    assert.equal(best([0.1, 0.7, 0.2]), 1);
    let m = newModel(names);
    m = addExample(m, 1, 'close', 8);
    assert.equal(best(predict(m, 1, 'close')), 1);
  });

  it('is immutable and counts examples', () => {
    const m = newModel(names);
    const m2 = addExample(m, 0, 'close', 3);
    assert.equal(totalExamples(m), 0);
    assert.equal(totalExamples(m2), 3);
    assert.equal(addExample(m, 9, 'close'), m);
  });

  it('says what is still missing before training', () => {
    let m = newModel(names);
    m = addExample(m, 0, 'close', 5);
    m = addExample(m, 1, 'close', 2);
    assert.deepEqual(missingExamples(m, 5), [
      { name: 'Banana', need: 3 },
      { name: 'Bread', need: 5 },
    ]);
    assert.equal(isTrainable(m, 5), false);
    m = addExample(addExample(m, 1, 'far', 3), 2, 'far', 5);
    assert.equal(isTrainable(m, 5), true);
    assert.equal(percent(0.456), '46%');
  });
});
