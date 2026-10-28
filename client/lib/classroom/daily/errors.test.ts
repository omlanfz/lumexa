import test from 'node:test';
import assert from 'node:assert/strict';
import { describeCameraError, describeJoinError } from './errors.ts';

test('every way Daily can refuse a join has an answer a person can act on', () => {
  const said = (type: string) => describeJoinError({ errorMsg: 'x', error: { type, msg: 'y' } });
  assert.match(said('nbf-room'), /not opened yet/);
  assert.match(said('nbf-token'), /not opened yet/);
  assert.match(said('exp-room'), /expired/);
  assert.match(said('exp-token'), /expired/);
  assert.match(said('no-room'), /no longer open/);
  assert.match(said('end-of-life'), /no longer open/);
  assert.match(said('meeting-full'), /full/);
  assert.match(said('not-allowed'), /not allowed/);
  assert.match(said('ejected'), /removed/);
});

test('anything else — including a plain Error or nothing — is the generic try-again message', () => {
  for (const err of [new Error('boom'), { error: { type: 'connection-error' } }, { errorMsg: 'x' }, null, undefined, 'text']) {
    assert.match(describeJoinError(err), /check your internet connection/i);
  }
});

test('the camera check names what is wrong and what to do', () => {
  assert.match(describeCameraError({ type: 'permissions' }, ['video']), /^Camera blocked/);
  assert.match(describeCameraError({ type: 'permissions' }, ['audio']), /^Microphone blocked/);
  assert.match(describeCameraError({ type: 'permissions' }, ['video', 'audio']), /^Camera or microphone blocked/);
  assert.match(describeCameraError({ type: 'not-found' }, ['video']), /Camera not found/);
  assert.match(describeCameraError({ type: 'cam-in-use' }), /another app/);
  assert.match(describeCameraError({ type: 'mic-in-use' }), /microphone is being used/);
  assert.match(describeCameraError({ type: 'cam-mic-in-use' }), /camera and microphone/);
  assert.match(describeCameraError({ type: 'undefined-mediadevices' }), /secure/);
  assert.match(describeCameraError({ type: 'unknown' }), /unavailable/);
  assert.match(describeCameraError(undefined), /unavailable/);
});
