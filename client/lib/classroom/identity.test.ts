import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_OBSERVER_PREFIX, MAX_PEOPLE_PER_CLASSROOM, isAdminObserver } from './identity.ts';

test('a classroom holds ten people', () => {
  assert.equal(MAX_PEOPLE_PER_CLASSROOM, 10);
});

test('an admin observer is told apart from a person by its user id', () => {
  assert.equal(ADMIN_OBSERVER_PREFIX, 'admin-observer-');
  assert.equal(isAdminObserver('admin-observer-1700000000000'), true);
  assert.equal(isAdminObserver('0f8fad5b-d9cb-469f-a165-70867728950e'), false);
  assert.equal(isAdminObserver('tg-5d1c7e924a3b4f609e1d2b8c6a0f3d71'), false);
});
