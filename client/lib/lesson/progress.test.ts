import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptyProgress, lessonCompletion, mergeProgress, parseStored } from './progress';

const base = { sectionIds: ['a', 'b', 'c', 'd'], activityIds: [] as string[], progress: emptyProgress(), quiz: null, hasQuiz: false, hasHomework: false, homeworkSubmitted: false };

describe('lessonCompletion', () => {
  it('opening a lesson counts for nothing', () => {
    const c = lessonCompletion({ ...base, hasQuiz: true, hasHomework: true });
    assert.equal(c.percent, 0);
    assert.equal(c.complete, false);
  });

  it('reading alone never completes a lesson that has a quiz or homework', () => {
    const c = lessonCompletion({ ...base, hasQuiz: true, hasHomework: true, progress: { sectionsRead: ['a', 'b', 'c', 'd'], activitiesDone: [] } });
    assert.equal(c.read.done, 4);
    assert.equal(c.complete, false);
    assert.ok(c.percent < 100);
  });

  it('keeps read, activity, quiz and homework separate', () => {
    const c = lessonCompletion({
      sectionIds: ['a', 'b'],
      activityIds: ['viz1', 'viz2'],
      progress: { sectionsRead: ['a'], activitiesDone: ['viz1'] },
      quiz: { total: 4, answered: 4, gradedTotal: 3, score: 3, completed: true, results: {} },
      hasQuiz: true,
      hasHomework: true,
      homeworkSubmitted: false,
    });
    assert.deepEqual(c.read, { done: 1, total: 2 });
    assert.deepEqual(c.activities, { done: 1, total: 2 });
    assert.equal(c.quiz?.done, true);
    assert.equal(c.homework?.submitted, false);
    assert.equal(c.complete, false);
  });

  it('is complete only when every applicable part is done', () => {
    const all = lessonCompletion({
      sectionIds: ['a', 'b'],
      activityIds: ['viz1'],
      progress: { sectionsRead: ['a', 'b'], activitiesDone: ['viz1'] },
      quiz: { total: 2, answered: 2, gradedTotal: 2, score: 1, completed: true, results: {} },
      hasQuiz: true,
      hasHomework: true,
      homeworkSubmitted: true,
    });
    assert.equal(all.percent, 100);
    assert.equal(all.complete, true);
  });

  it('parts that do not apply never block completion', () => {
    const c = lessonCompletion({ ...base, progress: { sectionsRead: ['a', 'b', 'c', 'd'], activitiesDone: [] } });
    assert.equal(c.complete, true);
    assert.equal(c.activities, null);
    assert.equal(c.quiz, null);
    assert.equal(c.homework, null);
  });

  it('a half-answered quiz earns less than a finished one', () => {
    const half = lessonCompletion({ ...base, sectionIds: [], hasQuiz: true, quiz: { total: 4, answered: 2, gradedTotal: 4, score: 2, completed: false, results: {} } });
    const done = lessonCompletion({ ...base, sectionIds: [], hasQuiz: true, quiz: { total: 4, answered: 4, gradedTotal: 4, score: 2, completed: true, results: {} } });
    assert.ok(half.percent < done.percent);
    assert.equal(half.complete, false);
  });

  it('a lesson with nothing to do is not "complete"', () => {
    assert.equal(lessonCompletion({ ...base, sectionIds: [] }).complete, false);
  });
});

describe('progress storage', () => {
  it('merges as a union', () => {
    assert.deepEqual(mergeProgress({ sectionsRead: ['a'], activitiesDone: ['x'] }, { sectionsRead: ['b', 'a'] }), { sectionsRead: ['a', 'b'], activitiesDone: ['x'] });
  });

  it('survives garbage in storage', () => {
    assert.deepEqual(parseStored('not json'), emptyProgress());
    assert.deepEqual(parseStored(null), emptyProgress());
    assert.deepEqual(parseStored('{"sectionsRead":[1,"ok",null]}'), { sectionsRead: ['ok'], activitiesDone: [] });
  });
});
