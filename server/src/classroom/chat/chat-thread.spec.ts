import {
  MAX_CHAT_CHARS,
  batchPrefix,
  monthOf,
  normalizeChatText,
  objectKeyFor,
  oneToOnePrefix,
  parseChatObject,
  parseObjectKey,
  serializeChatObject,
} from './chat-thread';

describe('chat thread keys', () => {
  it('a 1:1 conversation is the teacher and the student — not the course', () => {
    expect(oneToOnePrefix('t1', 's1')).toBe('chat/one/t1/s1/');
    expect(oneToOnePrefix('t2', 's1')).not.toBe(oneToOnePrefix('t1', 's1'));
  });

  it('a prefix never matches a longer id that merely starts the same', () => {
    expect(oneToOnePrefix('t1', 's1')).toBe('chat/one/t1/s1/');
    expect(
      'chat/one/t1/s10/2026-11/x.json'.startsWith(oneToOnePrefix('t1', 's1')),
    ).toBe(false);
  });

  it('a batch conversation is the batch and the teacher', () => {
    expect(batchPrefix('b1', 't1')).toBe('chat/batch/b1/t1/');
    expect(batchPrefix('b1', 't2')).not.toBe(batchPrefix('b1', 't1'));
  });

  it('unsafe characters cannot climb out of a thread folder', () => {
    expect(oneToOnePrefix('../x', 'a/b')).toBe('chat/one/.._x/a_b/');
  });

  it('object keys round trip, and strays are ignored', () => {
    const prefix = oneToOnePrefix('t1', 's1');
    const key = objectKeyFor(prefix, '2026-11', 'u-1');
    expect(key).toBe('chat/one/t1/s1/2026-11/u-1.json');
    expect(parseObjectKey(prefix, key)).toEqual({
      month: '2026-11',
      author: 'u-1',
    });
    expect(parseObjectKey(prefix, `${prefix}notes.txt`)).toBeNull();
    expect(parseObjectKey(prefix, `${prefix}2026-11/a/b.json`)).toBeNull();
    expect(parseObjectKey(prefix, 'chat/one/other/2026-11/u.json')).toBeNull();
  });

  it('months are UTC', () => {
    expect(monthOf(Date.UTC(2026, 10, 30, 23, 59))).toBe('2026-11');
    expect(monthOf(Date.UTC(2026, 11, 1, 0, 0))).toBe('2026-12');
  });
});

describe('normalizeChatText', () => {
  it('keeps line breaks, trims the edges and squeezes long runs of blank lines', () => {
    expect(normalizeChatText('  a\r\nb  \n\n\n\nc \n')).toBe('a\nb\n\nc');
  });
  it('refuses empty, non-text and too-long messages', () => {
    expect(normalizeChatText('  \n ')).toBeNull();
    expect(normalizeChatText(5)).toBeNull();
    expect(normalizeChatText('x'.repeat(MAX_CHAT_CHARS + 1))).toBeNull();
    expect(normalizeChatText('x'.repeat(MAX_CHAT_CHARS))).not.toBeNull();
  });
});

describe('parseChatObject', () => {
  const good = {
    id: 'm1',
    text: 'hi',
    sentAt: 5,
    fromUserId: 'u',
    fromName: 'U',
    fromRole: 'STUDENT',
  };
  it('reads what was written and skips malformed entries without losing the rest', () => {
    const json = JSON.stringify({
      v: 1,
      messages: [
        good,
        { id: 'bad' },
        null,
        { ...good, id: 'm2', fromRole: 'ADMIN' },
        { ...good, id: 'm3' },
      ],
    });
    expect(parseChatObject(json).map((m) => m.id)).toEqual(['m1', 'm3']);
    expect(parseChatObject(serializeChatObject([good as never]))).toHaveLength(
      1,
    );
  });
  it('treats missing or corrupt objects as empty', () => {
    expect(parseChatObject(null)).toEqual([]);
    expect(parseChatObject('not json')).toEqual([]);
    expect(parseChatObject('{"messages":5}')).toEqual([]);
  });
});
