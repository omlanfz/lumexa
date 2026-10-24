import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PEOPLE_PER_CLASSROOM, newDeviceId, personKey, samePerson } from './identity.ts';

test('a classroom holds ten people', () => {
  assert.equal(MAX_PEOPLE_PER_CLASSROOM, 10);
});

test('personKey is the user id in <userId>~<deviceId>', () => {
  assert.equal(personKey('3f2b8a7e-5c1d~a1b2c3d4e5f60718'), '3f2b8a7e-5c1d');
  assert.equal(personKey('plain-user-id'), 'plain-user-id');
  assert.equal(personKey('admin-observer-170000'), 'admin-observer-170000');
});

test('two devices of one person are the same person; two people are not', () => {
  assert.equal(samePerson('u1~aaaa', 'u1~bbbb'), true);
  assert.equal(samePerson('u1~aaaa', 'u1'), true);
  assert.equal(samePerson('u1~aaaa', 'u2~aaaa'), false);
});

test('a device id is 16 hex characters the server accepts, and differs every time', () => {
  const ids = new Set(Array.from({ length: 50 }, () => newDeviceId()));
  assert.equal(ids.size, 50);
  for (const id of ids) {
    assert.match(id, /^[0-9a-f]{16}$/);
    assert.match(id, /^[A-Za-z0-9]{4,24}$/); // the server's rule
  }
});
