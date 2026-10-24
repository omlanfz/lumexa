import test from 'node:test';
import assert from 'node:assert/strict';
import { countPeople, groupByPerson, listStudents, pickPersonTiles } from './people.ts';

const P = (identity: string, name = identity) => ({ identity, name });

test('connections are grouped by person, in the order people first appeared', () => {
  const groups = groupByPerson([P('a~1'), P('b~1'), P('a~2'), P('c~1'), P('b~2')]);
  assert.deepEqual([...groups.keys()], ['a', 'b', 'c']);
  assert.deepEqual(groups.get('a')!.map((p) => p.identity), ['a~1', 'a~2']);
});

test('two devices are one person in the count', () => {
  assert.equal(countPeople([P('a~1'), P('a~2'), P('b~1')]), 2);
  assert.equal(countPeople([]), 0);
});

const tile = (identity: string, publication?: { isMuted: boolean }) => ({
  participant: { identity },
  publication,
});

test('one tile per person: nobody is shown twice, order is kept', () => {
  const tiles = [tile('a~1'), tile('b~1'), tile('a~2')];
  assert.deepEqual(pickPersonTiles(tiles).map((t) => t.participant.identity), ['a~1', 'b~1']);
});

test('a person with the camera on one device and only a microphone on another shows the camera', () => {
  const mic = tile('a~laptop'); // placeholder: no camera on this device
  const cam = tile('a~phone', { isMuted: false });
  const picked = pickPersonTiles([mic, tile('b~1'), cam]);
  assert.equal(picked.length, 2);
  assert.equal(picked[0], cam);
  assert.equal(picked[1].participant.identity, 'b~1');
});

test('live video beats a camera that is switched off, which beats no camera', () => {
  const none = tile('a~1');
  const off = tile('a~2', { isMuted: true });
  const live = tile('a~3', { isMuted: false });
  assert.equal(pickPersonTiles([none, off, live])[0], live);
  assert.equal(pickPersonTiles([none, off])[0], off);
  assert.equal(pickPersonTiles([live, off, none])[0], live);
});

test('on a tie the first connection keeps the tile (it does not flicker between devices)', () => {
  const a = tile('a~1', { isMuted: false });
  const b = tile('a~2', { isMuted: false });
  assert.equal(pickPersonTiles([a, b])[0], a);
  assert.equal(pickPersonTiles([b, a])[0], b);
});

test('the students in the room are people, not connections, and never the teacher', () => {
  const students = listStudents([
    P('t~1', 'Ms Karim (Teacher)'),
    P('s1~aaaa', 'Ada Lovelace (Student)'),
    P('s1~bbbb', 'Ada Lovelace (Student)'),
    P('s2~aaaa', 'Ben Carson (Student)'),
  ]);
  assert.deepEqual(students, [
    { userId: 's1', name: 'Ada Lovelace' },
    { userId: 's2', name: 'Ben Carson' },
  ]);
  assert.deepEqual(listStudents([]), []);
});
