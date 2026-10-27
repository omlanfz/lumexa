import test from 'node:test';
import assert from 'node:assert/strict';
import { newSegmentId } from './ids.ts';

// The exact rule the server applies (class-validator's @IsUUID('4')).
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('a recording id is a UUID v4, which is what the server accepts', () => {
  for (let i = 0; i < 50; i++) assert.match(newSegmentId(), UUID_V4);
});

test('a new id every time', () => {
  assert.equal(new Set(Array.from({ length: 200 }, () => newSegmentId())).size, 200);
});

test('a browser without randomUUID still makes a valid v4 UUID', () => {
  const fake = { getRandomValues: <T extends ArrayBufferView>(a: T) => { new Uint8Array(a.buffer).fill(0xff); return a; } };
  const id = newSegmentId(fake);
  assert.match(id, UUID_V4);
  assert.equal(id, 'ffffffff-ffff-4fff-bfff-ffffffffffff');
});
