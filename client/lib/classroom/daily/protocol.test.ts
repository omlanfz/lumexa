import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CHAT_CHARS,
  acceptChat,
  authorizeControl,
  chatPayload,
  controlPayload,
  parseAppPayload,
  type Sender,
} from './protocol.ts';

const teacher: Sender = { sessionId: 's-t', userId: 'u-t', name: 'Ms Karim (Teacher)', role: 'TEACHER', isOwner: true };
const student: Sender = { sessionId: 's-a', userId: 'u-a', name: 'Ada (Student)', role: 'STUDENT', isOwner: false };

test('what is sent is what is read: chat and each classroom signal', () => {
  const sent = [
    chatPayload('m1', 'hello class'),
    controlPayload({ type: 'raise-hand', raised: true }),
    controlPayload({ type: 'lower-hand', userId: 'u-a' }),
    controlPayload({ type: 'reaction', emoji: '👍' }),
    controlPayload({ type: 'spotlight', userId: 'u-a' }),
    controlPayload({ type: 'spotlight', userId: null }),
  ];
  for (const payload of sent) {
    // through JSON, as Daily carries it
    assert.deepEqual(parseAppPayload(JSON.parse(JSON.stringify(payload))), payload);
  }
});

test('anything that is not a Lumexa classroom message is ignored', () => {
  const junk: unknown[] = [
    null,
    undefined,
    'hello',
    42,
    [],
    {},
    { kind: 'chat', id: 'm', text: 'no marker' },
    { app: 'other', kind: 'chat', id: 'm', text: 'x' },
    { app: 'lumexa' },
    { app: 'lumexa', kind: 'weather' },
    { app: 'lumexa', kind: 'chat', id: '', text: 'x' },
    { app: 'lumexa', kind: 'chat', id: 'm', text: '   ' },
    { app: 'lumexa', kind: 'chat', id: 'm', text: 5 },
    { app: 'lumexa', kind: 'chat', id: 'm', text: 'x'.repeat(MAX_CHAT_CHARS + 1) },
    { app: 'lumexa', kind: 'chat', id: 'm'.repeat(65), text: 'x' },
    { app: 'lumexa', kind: 'control' },
    { app: 'lumexa', kind: 'control', control: 'raise-hand' },
    { app: 'lumexa', kind: 'control', control: { type: 'raise-hand' } },
    { app: 'lumexa', kind: 'control', control: { type: 'raise-hand', raised: 'yes' } },
    { app: 'lumexa', kind: 'control', control: { type: 'lower-hand' } },
    { app: 'lumexa', kind: 'control', control: { type: 'lower-hand', userId: '' } },
    { app: 'lumexa', kind: 'control', control: { type: 'lower-hand', userId: 'u'.repeat(65) } },
    { app: 'lumexa', kind: 'control', control: { type: 'reaction', emoji: '' } },
    { app: 'lumexa', kind: 'control', control: { type: 'reaction', emoji: 'x'.repeat(17) } },
    { app: 'lumexa', kind: 'control', control: { type: 'spotlight' } },
    { app: 'lumexa', kind: 'control', control: { type: 'spotlight', userId: 7 } },
    { app: 'lumexa', kind: 'control', control: { type: 'stop-screen-share', userId: 'u' } },
  ];
  for (const data of junk) assert.equal(parseAppPayload(data), null, `should reject ${JSON.stringify(data)}`);
});

test('chat is trimmed, and keeps its longest legal length', () => {
  const read = parseAppPayload({ app: 'lumexa', kind: 'chat', id: 'm', text: '  hi  ' });
  assert.equal(read?.kind === 'chat' && read.text, 'hi');
  assert.ok(parseAppPayload({ app: 'lumexa', kind: 'chat', id: 'm', text: 'x'.repeat(MAX_CHAT_CHARS) }));
});

test('a raised hand and a reaction are always the sender’s, whoever the message says', () => {
  assert.deepEqual(authorizeControl({ type: 'raise-hand', raised: true }, student), {
    type: 'raise-hand',
    raised: true,
    userId: 'u-a',
  });
  assert.deepEqual(authorizeControl({ type: 'reaction', emoji: '🎉' }, student), {
    type: 'reaction',
    emoji: '🎉',
    userId: 'u-a',
  });
  assert.deepEqual(authorizeControl({ type: 'raise-hand', raised: false }, teacher), {
    type: 'raise-hand',
    raised: false,
    userId: 'u-t',
  });
});

test('lowering a hand and the spotlight are the teacher’s alone', () => {
  assert.deepEqual(authorizeControl({ type: 'lower-hand', userId: 'u-a' }, teacher), { type: 'lower-hand', userId: 'u-a' });
  assert.deepEqual(authorizeControl({ type: 'spotlight', userId: 'u-a' }, teacher), { type: 'spotlight', userId: 'u-a' });
  assert.deepEqual(authorizeControl({ type: 'spotlight', userId: null }, teacher), { type: 'spotlight', userId: null });
  // a student cannot lower a classmate's hand or put themselves in the spotlight
  assert.equal(authorizeControl({ type: 'lower-hand', userId: 'u-b' }, student), null);
  assert.equal(authorizeControl({ type: 'spotlight', userId: 'u-a' }, student), null);
  assert.equal(authorizeControl({ type: 'spotlight', userId: null }, student), null);
});

test('chat is attributed to the real sender and keyed by their connection and the message', () => {
  const payload = chatPayload('m1', 'hello');
  assert.equal(payload.kind, 'chat');
  const entry = acceptChat(payload as Extract<typeof payload, { kind: 'chat' }>, student, {}, 12345);
  assert.deepEqual(entry, {
    key: 's-a:m1',
    text: 'hello',
    sentAt: 12345,
    fromUserId: 'u-a',
    fromName: 'Ada (Student)',
    fromRole: 'STUDENT',
  });
});

test('while the chat is locked a student’s message is dropped, the teacher’s is not', () => {
  const payload = chatPayload('m1', 'hello') as Extract<ReturnType<typeof chatPayload>, { kind: 'chat' }>;
  assert.equal(acceptChat(payload, student, { chatLocked: true }, 1), null);
  assert.ok(acceptChat(payload, teacher, { chatLocked: true }, 1));
  assert.ok(acceptChat(payload, student, { chatLocked: false }, 1));
});
