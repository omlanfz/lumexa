import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CHAT_CHARS,
  acceptChat,
  authorizeControl,
  authorizePointer,
  pointerPayload,
  chatClearPayload,
  chatKey,
  chatPayload,
  chatRemovePayload,
  controlPayload,
  mayRemoveChat,
  normalizeChatText,
  parseAppPayload,
  type Sender,
} from './protocol.ts';

const teacher: Sender = { sessionId: 's-t', userId: 'u-t', name: 'Ms Karim (Teacher)', role: 'TEACHER', isOwner: true };
const student: Sender = { sessionId: 's-a', userId: 'u-a', name: 'Ada (Student)', role: 'STUDENT', isOwner: false };

test('what is sent is what is read: chat and each classroom signal', () => {
  const sent = [
    chatPayload('m1', 'hello class'),
    chatPayload('m2', 'two\nlines'),
    chatRemovePayload('u-a', 'm1'),
    chatClearPayload(),
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

test('chat is attributed to the real sender and keyed by the person and the message', () => {
  const payload = chatPayload('m1', 'hello');
  assert.equal(payload.kind, 'chat');
  const entry = acceptChat(payload as Extract<typeof payload, { kind: 'chat' }>, student, {}, 12345);
  assert.deepEqual(entry, {
    key: 'u-a:m1',
    id: 'm1',
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

test('a message keeps its line breaks, and a long run of blank lines is shortened', () => {
  assert.equal(normalizeChatText('  one\r\ntwo  \n\n\n\nthree\n'), 'one\ntwo\n\nthree');
  const read = parseAppPayload({ app: 'lumexa', kind: 'chat', id: 'm', text: 'a\nb' });
  assert.equal(read?.kind === 'chat' && read.text, 'a\nb');
  assert.equal(normalizeChatText(' \n  '), null);
  assert.equal(normalizeChatText('x'.repeat(MAX_CHAT_CHARS + 1)), null);
});

test('a message has the same key live and when it is loaded again, on any device', () => {
  assert.equal(chatKey('u-a', 'm1'), 'u-a:m1');
  const first = acceptChat(chatPayload('m1', 'hi') as Extract<ReturnType<typeof chatPayload>, { kind: 'chat' }>, student, {}, 1);
  const otherDevice = acceptChat(
    chatPayload('m1', 'hi') as Extract<ReturnType<typeof chatPayload>, { kind: 'chat' }>,
    { ...student, sessionId: 's-a-phone' },
    {},
    2,
  );
  assert.equal(first?.key, otherDevice?.key);
});

test('deleting a message or clearing the chat is read from the wire, and only the teacher may do it', () => {
  assert.deepEqual(parseAppPayload({ app: 'lumexa', kind: 'chat-remove', userId: 'u-a', id: 'm1' }), chatRemovePayload('u-a', 'm1'));
  assert.deepEqual(parseAppPayload({ app: 'lumexa', kind: 'chat-clear' }), chatClearPayload());
  for (const bad of [
    { app: 'lumexa', kind: 'chat-remove', userId: '', id: 'm1' },
    { app: 'lumexa', kind: 'chat-remove', userId: 'u-a', id: '' },
    { app: 'lumexa', kind: 'chat-remove', userId: 'u-a' },
    { app: 'lumexa', kind: 'chat-remove', userId: 'x'.repeat(65), id: 'm1' },
    { app: 'lumexa', kind: 'chat-remove', userId: 5, id: 'm1' },
  ]) {
    assert.equal(parseAppPayload(bad), null, JSON.stringify(bad));
  }
  assert.equal(mayRemoveChat(teacher), true);
  assert.equal(mayRemoveChat(student), false);
});

// ─── The teacher's Pointer ──────────────────────────────────────────────────

test('what is sent for the Pointer is what is read', () => {
  const sent = [
    pointerPayload({ type: 'move', sid: 's-sharer', x: 0.25, y: 0.75 }),
    pointerPayload({ type: 'click', sid: 's-sharer', x: 0, y: 1 }),
    pointerPayload({ type: 'hide', sid: 's-sharer' }),
    pointerPayload({ type: 'off' }),
  ];
  for (const payload of sent) {
    assert.deepEqual(parseAppPayload(JSON.parse(JSON.stringify(payload))), payload);
  }
});

test('a position is kept inside the picture and rounded to four decimals', () => {
  assert.deepEqual(pointerPayload({ type: 'move', sid: 's', x: 0.123456789, y: -0.2 }), {
    app: 'lumexa',
    kind: 'pointer',
    pointer: { type: 'move', sid: 's', x: 0.1235, y: 0 },
  });
  const read = parseAppPayload({ app: 'lumexa', kind: 'pointer', pointer: { type: 'click', sid: 's', x: 7, y: 0.5 } });
  assert.deepEqual(read, { app: 'lumexa', kind: 'pointer', pointer: { type: 'click', sid: 's', x: 1, y: 0.5 } });
});

test('a malformed Pointer message is ignored', () => {
  const junk: unknown[] = [
    { app: 'lumexa', kind: 'pointer' },
    { app: 'lumexa', kind: 'pointer', pointer: 'move' },
    { app: 'lumexa', kind: 'pointer', pointer: { type: 'move', x: 0.1, y: 0.1 } },
    { app: 'lumexa', kind: 'pointer', pointer: { type: 'move', sid: '', x: 0.1, y: 0.1 } },
    { app: 'lumexa', kind: 'pointer', pointer: { type: 'move', sid: 's'.repeat(65), x: 0.1, y: 0.1 } },
    { app: 'lumexa', kind: 'pointer', pointer: { type: 'move', sid: 's', x: '0.1', y: 0.1 } },
    { app: 'lumexa', kind: 'pointer', pointer: { type: 'move', sid: 's', x: 0.1 } },
    { app: 'lumexa', kind: 'pointer', pointer: { type: 'move', sid: 's', x: Number.NaN, y: 0.1 } },
    { app: 'lumexa', kind: 'pointer', pointer: { type: 'click', sid: 's', x: Infinity, y: 0.1 } },
    { app: 'lumexa', kind: 'pointer', pointer: { type: 'hide' } },
    { app: 'lumexa', kind: 'pointer', pointer: { type: 'draw', sid: 's', x: 0.1, y: 0.1 } },
  ];
  for (const data of junk) assert.equal(parseAppPayload(data), null, `should reject ${JSON.stringify(data)}`);
});

test('only the teacher’s word moves the Pointer, and it is attributed to the connection that sent it', () => {
  const wire = { type: 'move', sid: 's-sharer', x: 0.5, y: 0.5 } as const;
  assert.deepEqual(authorizePointer(wire, teacher), { ...wire, fromSessionId: 's-t' });
  assert.deepEqual(authorizePointer({ type: 'off' }, teacher), { type: 'off', fromSessionId: 's-t' });
  // a student cannot point, hide the teacher's dot or switch it off
  assert.equal(authorizePointer(wire, student), null);
  assert.equal(authorizePointer({ type: 'click', sid: 's-sharer', x: 0.1, y: 0.1 }, student), null);
  assert.equal(authorizePointer({ type: 'hide', sid: 's-sharer' }, student), null);
  assert.equal(authorizePointer({ type: 'off' }, student), null);
});
